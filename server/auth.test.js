import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
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
      AUTH_FROM_EMAIL: 'ben@benjohnson.ai',
    },
    sendEmail: async (msg) => {
      sent.push(msg);
      if (opts.failSend) throw new Error('mail down');
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

function sessionPayload(setCookie) {
  const token = setCookie.split(';')[0].slice('intel_session='.length);
  const payload = token.split('.')[0];
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

function legacyCookie(email, exp) {
  const payload = Buffer.from(JSON.stringify({ email, exp })).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `intel_session=${payload}.${sig}`;
}

async function post(base, pathname, body, headers = {}) {
  const res = await fetch(base + pathname, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
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
    assert.match(html, /Codes expire in 5 minutes/);
    assert.equal(html.includes('10 minutes'), false);
    assert.match(html, /Only the newest code works; each new email replaces the last\./);
    assert.equal(html.includes('PLAN_MARKER'), false);
    assert.equal(html.includes('weekly attendance'), false);
    assert.equal(app.sent.length, 0);

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

test('mail failure still returns the generic response and leaves no usable code', async () => {
  const distDir = await fixture();
  const thrown = await start({ distDir, failSend: true });
  try {
    const res = await post(thrown.base, '/api/auth/request-code', { email: 'bjljohnson2012@gmail.com' });
    assert.equal(res.res.status, 200);
    assert.deepEqual(res.json, { ok: true });
    assert.equal(res.text.includes(thrown.sent[0].code), false);
    const verified = await post(thrown.base, '/api/auth/verify', {
      email: 'bjljohnson2012@gmail.com',
      code: thrown.sent[0].code,
    });
    assert.equal(verified.res.status, 401);
    assert.equal(cookie(verified.res), '');
  } finally {
    await thrown.close();
    await rm(distDir, { recursive: true, force: true });
  }
});

test('a Resend rejection does not leave a code that can be verified', async () => {
  const distDir = await fixture();
  const app = await start({ distDir, sendOk: false });
  try {
    const res = await post(app.base, '/api/auth/request-code', { email: 'alexander.varden@gmail.com' });
    assert.equal(res.res.status, 200);
    assert.deepEqual(res.json, { ok: true });
    const verified = await post(app.base, '/api/auth/verify', {
      email: 'alexander.varden@gmail.com',
      code: app.sent[0].code,
    });
    assert.equal(verified.res.status, 401);
  } finally {
    await app.close();
    await rm(distDir, { recursive: true, force: true });
  }
});

test('the allowlist cannot be widened or narrowed', () => {
  assert.throws(() => createApp({
    env: { SESSION_SECRET: SECRET, ALLOWLIST_EMAILS: `${ALLOW},extra@example.com` },
    sendEmail: async () => ({ ok: true }),
    distDir: '/tmp',
  }), /exactly/);
  assert.throws(() => createApp({
    env: { SESSION_SECRET: SECRET, ALLOWLIST_EMAILS: 'bjljohnson2012@gmail.com' },
    sendEmail: async () => ({ ok: true }),
    distDir: '/tmp',
  }), /exactly/);
});

test('the same browser and IP stay signed in and do not get another code', async () => {
  const distDir = await fixture();
  const app = await start({ distDir });
  const ip = { 'x-forwarded-for': '203.0.113.10' };
  try {
    await post(app.base, '/api/auth/request-code', { email: 'bjljohnson2012@gmail.com' }, ip);
    const verified = await post(app.base, '/api/auth/verify', {
      email: 'bjljohnson2012@gmail.com',
      code: app.sent[0].code,
    }, ip);
    assert.equal(verified.res.status, 200);
    const set = cookie(verified.res);
    assert.match(set, /HttpOnly/i);
    assert.match(set, /Secure/i);
    assert.match(set, /Max-Age=604800/);
    assert.equal(sessionPayload(set).ip, '203.0.113.10');
    const jar = set.split(';')[0];
    const mailed = app.sent.length;

    const home = await fetch(app.base + '/', {
      headers: { cookie: jar, 'x-forwarded-for': '203.0.113.10' },
      redirect: 'manual',
    });
    assert.equal(home.status, 200);
    assert.match(await home.text(), /PLAN_MARKER/);

    const mapped = await fetch(app.base + '/', {
      headers: { cookie: jar, 'x-forwarded-for': '::ffff:203.0.113.10' },
      redirect: 'manual',
    });
    assert.equal(mapped.status, 200);

    const mappedHex = await fetch(app.base + '/', {
      headers: { cookie: jar, 'x-forwarded-for': '::ffff:cb00:710a' },
      redirect: 'manual',
    });
    assert.equal(mappedHex.status, 200);

    const forwarded = await fetch(app.base + '/', {
      headers: { cookie: jar, 'x-forwarded-for': '198.51.100.9, 203.0.113.10' },
      redirect: 'manual',
    });
    assert.equal(forwarded.status, 200);

    const login = await fetch(app.base + '/login', {
      headers: { cookie: jar, 'x-forwarded-for': '203.0.113.10' },
      redirect: 'manual',
    });
    assert.equal(login.status, 302);
    assert.equal(login.headers.get('location'), '/');
    assert.equal(app.sent.length, mailed);

    const other = await fetch(app.base + '/', {
      headers: { cookie: jar, 'x-forwarded-for': '203.0.113.11' },
      redirect: 'manual',
    });
    assert.equal(other.status, 302);
    assert.equal(other.headers.get('location'), '/login');
    const me = await fetch(app.base + '/api/auth/me', {
      headers: { cookie: jar, 'x-forwarded-for': '203.0.113.11' },
    });
    assert.equal(me.status, 401);
    assert.equal(app.sent.length, mailed);
  } finally {
    await app.close();
    await rm(distDir, { recursive: true, force: true });
  }
});

test('the same IPv6 address matches when the notation differs', async () => {
  const distDir = await fixture();
  const app = await start({ distDir });
  try {
    await post(app.base, '/api/auth/request-code', { email: 'alexander.varden@gmail.com' }, {
      'x-forwarded-for': '2001:db8::1',
    });
    const verified = await post(app.base, '/api/auth/verify', {
      email: 'alexander.varden@gmail.com',
      code: app.sent[0].code,
    }, { 'x-forwarded-for': '2001:db8::1' });
    const jar = cookie(verified.res).split(';')[0];
    assert.equal(sessionPayload(cookie(verified.res)).ip, '2001:0db8:0000:0000:0000:0000:0000:0001');
    const mailed = app.sent.length;
    const home = await fetch(app.base + '/', {
      headers: { cookie: jar, 'x-forwarded-for': '2001:0db8:0000:0000:0000:0000:0000:0001' },
      redirect: 'manual',
    });
    assert.equal(home.status, 200);
    const other = await fetch(app.base + '/', {
      headers: { cookie: jar, 'x-forwarded-for': '2001:db8::2' },
      redirect: 'manual',
    });
    assert.equal(other.status, 302);
    assert.equal(app.sent.length, mailed);
  } finally {
    await app.close();
    await rm(distDir, { recursive: true, force: true });
  }
});

test('a code dies at 5 minutes and a session without an IP is refused', async () => {
  const distDir = await fixture();
  const app = await start({ distDir });
  try {
    assert.equal(LIMITS.codeTtlMs, 5 * 60 * 1000);
    assert.equal(LIMITS.sessionTtlSec, 7 * 24 * 60 * 60);
    assert.equal(LIMITS.cooldownMs, 60 * 1000);
    await post(app.base, '/api/auth/request-code', { email: 'bjljohnson2012@gmail.com' });
    app.clock.t += LIMITS.codeTtlMs - 1;
    const fresh = await post(app.base, '/api/auth/verify', {
      email: 'bjljohnson2012@gmail.com',
      code: app.sent[0].code,
    });
    assert.equal(fresh.res.status, 200);

    app.clock.t += LIMITS.cooldownMs;
    await post(app.base, '/api/auth/request-code', { email: 'bjljohnson2012@gmail.com' });
    app.clock.t += LIMITS.codeTtlMs;
    const stale = await post(app.base, '/api/auth/verify', {
      email: 'bjljohnson2012@gmail.com',
      code: app.sent[1].code,
    });
    assert.equal(stale.res.status, 401);

    const exp = Math.floor(app.clock.t / 1000) + LIMITS.sessionTtlSec;
    const home = await fetch(app.base + '/', {
      headers: { cookie: legacyCookie('bjljohnson2012@gmail.com', exp) },
      redirect: 'manual',
    });
    assert.equal(home.status, 302);
    assert.equal(app.sent.length, 2);
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
