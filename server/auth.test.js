import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createApp, LIMITS } from './app.js';

const SECRET = 'test-secret-must-be-at-least-32-characters';
const ALLOW = 'bjljohnson2012@gmail.com, alexander.varden@gmail.com';

async function fixture() {
  const dir = await mkdtemp(path.join(tmpdir(), 'intel-'));
  await mkdir(path.join(dir, 'data'), { recursive: true });
  await mkdir(path.join(dir, 'assets'), { recursive: true });
  await writeFile(path.join(dir, 'index.html'), '<!doctype html><title>Plan</title>PLAN_MARKER weekly attendance 250');
  await writeFile(path.join(dir, 'data', 'secret.json'), '{"secret":"PLAN_DATA"}');
  await writeFile(path.join(dir, 'assets', 'app.js'), 'PLAN_JS');
  return dir;
}

async function start(opts = {}) {
  const sent = [];
  const clock = { t: Date.now() };
  const app = createApp({
    env: {
      SESSION_SECRET: SECRET,
      ALLOWLIST_EMAILS: ALLOW,
      AUTH_FROM_EMAIL: 'Intelligence <noreply@fieldschool.ai>',
    },
    sendEmail: async (msg) => {
      if (opts.failSend) throw new Error('mail down');
      sent.push(msg);
      return { ok: opts.sendOk === false ? false : true };
    },
    distDir: opts.distDir,
    now: () => clock.t,
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  return {
    server,
    sent,
    clock,
    base: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve())),
  };
}

function cookie(res) {
  const lines = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : [res.headers.get('set-cookie') || ''];
  return lines.find((line) => line.startsWith('intel_session=')) || '';
}

async function post(base, pathname, body) {
  const res = await fetch(base + pathname, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    redirect: 'manual',
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  return { res, text, json };
}

test('unsigned visitors get the login page and not the plan', async () => {
  const distDir = await fixture();
  const app = await start({ distDir });
  try {
    const home = await fetch(app.base + '/', { redirect: 'manual' });
    assert.equal(home.status, 302);
    assert.equal(home.headers.get('location'), '/login');
    assert.equal((await home.text()).includes('PLAN_MARKER'), false);

    const asset = await fetch(app.base + '/assets/app.js', { redirect: 'manual' });
    assert.equal(asset.status, 302);
    assert.equal((await asset.text()).includes('PLAN_JS'), false);

    const data = await fetch(app.base + '/data/secret.json', { redirect: 'manual' });
    assert.equal(data.status, 302);
    assert.equal((await data.text()).includes('PLAN_DATA'), false);

    const login = await fetch(app.base + '/login');
    const html = await login.text();
    assert.equal(login.status, 200);
    assert.match(html, /Email me a code/);
    assert.equal(html.includes('PLAN_MARKER'), false);
    assert.equal(html.includes('weekly attendance'), false);

    const me = await fetch(app.base + '/api/auth/me');
    assert.equal(me.status, 401);
    assert.deepEqual(await me.json(), { status: 'refused', unknownReason: 'Sign-in required' });

    const ask = await post(app.base, '/api/ask', { question: 'Why mid-size?' });
    assert.equal(ask.res.status, 401);
    assert.deepEqual(ask.json, { status: 'refused', unknownReason: 'Sign-in required' });
  } finally {
    await app.close();
    await rm(distDir, { recursive: true, force: true });
  }
});

test('request-code looks the same for people on and off the list', async () => {
  const distDir = await fixture();
  const app = await start({ distDir });
  try {
    const outsider = await post(app.base, '/api/auth/request-code', { email: 'nobody@example.com' });
    const insider = await post(app.base, '/api/auth/request-code', { email: 'Bjljohnson2012@gmail.com' });
    assert.equal(outsider.res.status, 200);
    assert.equal(insider.res.status, 200);
    assert.deepEqual(outsider.json, { ok: true });
    assert.deepEqual(insider.json, { ok: true });
    assert.equal(app.sent.length, 1);
    assert.equal(app.sent[0].to, 'bjljohnson2012@gmail.com');
    assert.match(app.sent[0].code, /^\d{6}$/);
    assert.match(app.sent[0].idempotencyKey, /^sign-in-code\//);
    assert.equal(insider.text.includes(app.sent[0].code), false);
  } finally {
    await app.close();
    await rm(distDir, { recursive: true, force: true });
  }
});

test('a valid code sets a session cookie and opens the plan', async () => {
  const distDir = await fixture();
  const app = await start({ distDir });
  try {
    await post(app.base, '/api/auth/request-code', { email: 'alexander.varden@gmail.com' });
    const code = app.sent[0].code;
    const verified = await post(app.base, '/api/auth/verify', { email: 'alexander.varden@gmail.com', code });
    assert.equal(verified.res.status, 200);
    assert.deepEqual(verified.json, { ok: true, email: 'alexander.varden@gmail.com' });
    const set = cookie(verified.res);
    assert.match(set, /HttpOnly/i);
    assert.match(set, /Secure/i);
    assert.match(set, /SameSite=Lax/i);
    assert.match(set, /Max-Age=604800/);
    const jar = set.split(';')[0];

    const home = await fetch(app.base + '/', { headers: { cookie: jar }, redirect: 'manual' });
    assert.equal(home.status, 200);
    assert.match(await home.text(), /PLAN_MARKER/);

    const data = await fetch(app.base + '/data/secret.json', { headers: { cookie: jar } });
    assert.match(await data.text(), /PLAN_DATA/);

    const js = await fetch(app.base + '/assets/app.js', { headers: { cookie: jar } });
    assert.equal(await js.text(), 'PLAN_JS');

    const me = await fetch(app.base + '/api/auth/me', { headers: { cookie: jar } });
    assert.deepEqual(await me.json(), { email: 'alexander.varden@gmail.com' });

    const ask = await post(app.base, '/api/ask', { question: 'hello' });
    const authedAsk = await fetch(app.base + '/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: jar },
      body: JSON.stringify({ question: 'hello' }),
    });
    assert.equal(ask.res.status, 401);
    assert.equal(authedAsk.status, 401);
    assert.deepEqual(await authedAsk.json(), { status: 'refused', unknownReason: 'Sign-in required' });

    const back = await fetch(app.base + '/login', { headers: { cookie: jar }, redirect: 'manual' });
    assert.equal(back.status, 302);
    assert.equal(back.headers.get('location'), '/');
  } finally {
    await app.close();
    await rm(distDir, { recursive: true, force: true });
  }
});

test('wrong, expired, replaced, and overused codes are refused', async () => {
  const distDir = await fixture();
  const app = await start({ distDir });
  try {
    await post(app.base, '/api/auth/request-code', { email: 'bjljohnson2012@gmail.com' });
    const first = app.sent[0].code;
    const wrong = await post(app.base, '/api/auth/verify', { email: 'bjljohnson2012@gmail.com', code: '000000' });
    assert.equal(wrong.res.status, 401);
    assert.equal(cookie(wrong.res), '');

    app.clock.t += LIMITS.codeTtlMs + 1000;
    const expired = await post(app.base, '/api/auth/verify', { email: 'bjljohnson2012@gmail.com', code: first });
    assert.equal(expired.res.status, 401);

    app.clock.t += LIMITS.cooldownMs;
    await post(app.base, '/api/auth/request-code', { email: 'bjljohnson2012@gmail.com' });
    const second = app.sent[1].code;
    app.clock.t += LIMITS.cooldownMs;
    await post(app.base, '/api/auth/request-code', { email: 'bjljohnson2012@gmail.com' });
    const third = app.sent[2].code;
    const replaced = await post(app.base, '/api/auth/verify', { email: 'bjljohnson2012@gmail.com', code: second });
    assert.equal(replaced.res.status, 401);
    const current = await post(app.base, '/api/auth/verify', { email: 'bjljohnson2012@gmail.com', code: third });
    assert.equal(current.res.status, 200);

    app.clock.t += LIMITS.requestWindowMs;
    await post(app.base, '/api/auth/request-code', { email: 'bjljohnson2012@gmail.com' });
    const latest = app.sent.at(-1).code;
    const bad = latest === '000000' ? '111111' : '000000';
    for (let i = 0; i < LIMITS.maxAttempts; i++) {
      const fail = await post(app.base, '/api/auth/verify', { email: 'bjljohnson2012@gmail.com', code: bad });
      assert.equal(fail.res.status, 401);
    }
    const locked = await post(app.base, '/api/auth/verify', { email: 'bjljohnson2012@gmail.com', code: latest });
    assert.equal(locked.res.status, 401);
  } finally {
    await app.close();
    await rm(distDir, { recursive: true, force: true });
  }
});

test('code requests are rate limited without saying who is on the list', async () => {
  const distDir = await fixture();
  const app = await start({ distDir });
  try {
    for (let i = 0; i < LIMITS.requestPerEmail; i++) {
      const res = await post(app.base, '/api/auth/request-code', { email: 'nobody@example.com' });
      assert.equal(res.res.status, 200);
      app.clock.t += LIMITS.cooldownMs;
    }
    const blocked = await post(app.base, '/api/auth/request-code', { email: 'nobody@example.com' });
    assert.equal(blocked.res.status, 429);
    assert.equal(app.sent.length, 0);
  } finally {
    await app.close();
    await rm(distDir, { recursive: true, force: true });
  }
});

test('logout clears the cookie', async () => {
  const distDir = await fixture();
  const app = await start({ distDir });
  try {
    await post(app.base, '/api/auth/request-code', { email: 'bjljohnson2012@gmail.com' });
    const verified = await post(app.base, '/api/auth/verify', {
      email: 'bjljohnson2012@gmail.com',
      code: app.sent[0].code,
    });
    const jar = cookie(verified.res).split(';')[0];
    const out = await fetch(app.base + '/api/auth/logout', { method: 'POST', headers: { cookie: jar } });
    assert.match(cookie(out), /Max-Age=0/);
    const home = await fetch(app.base + '/', { headers: { cookie: 'intel_session=' }, redirect: 'manual' });
    assert.equal(home.status, 302);
  } finally {
    await app.close();
    await rm(distDir, { recursive: true, force: true });
  }
});

test('a session older than 7 days is refused', async () => {
  const distDir = await fixture();
  const app = await start({ distDir });
  try {
    await post(app.base, '/api/auth/request-code', { email: 'bjljohnson2012@gmail.com' });
    const verified = await post(app.base, '/api/auth/verify', {
      email: 'bjljohnson2012@gmail.com',
      code: app.sent[0].code,
    });
    const jar = cookie(verified.res).split(';')[0];
    app.clock.t += (LIMITS.sessionTtlSec + 60) * 1000;
    const me = await fetch(app.base + '/api/auth/me', { headers: { cookie: jar } });
    assert.equal(me.status, 401);
    const home = await fetch(app.base + '/', { headers: { cookie: jar }, redirect: 'manual' });
    assert.equal(home.status, 302);
  } finally {
    await app.close();
    await rm(distDir, { recursive: true, force: true });
  }
});

test('mail failure still returns the generic response', async () => {
  const distDir = await fixture();
  const app = await start({ distDir, failSend: true });
  try {
    const res = await post(app.base, '/api/auth/request-code', { email: 'bjljohnson2012@gmail.com' });
    assert.equal(res.res.status, 200);
    assert.deepEqual(res.json, { ok: true });
  } finally {
    await app.close();
    await rm(distDir, { recursive: true, force: true });
  }
});

test('a tampered cookie cannot see the plan', async () => {
  const distDir = await fixture();
  const app = await start({ distDir });
  try {
    const home = await fetch(app.base + '/', {
      headers: { cookie: 'intel_session=aaaa.bbbb' },
      redirect: 'manual',
    });
    assert.equal(home.status, 302);
    assert.equal((await home.text()).includes('PLAN_MARKER'), false);
  } finally {
    await app.close();
    await rm(distDir, { recursive: true, force: true });
  }
});
