import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createApp, LIMITS } from './app.js';

const SECRET = 'test-secret-must-be-at-least-32-characters';

function sessionCookie(email, ip) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const payload = Buffer.from(JSON.stringify({ email, exp, ip })).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `intel_session=${payload}.${sig}`;
}

async function start() {
  const distDir = await mkdtemp(path.join(tmpdir(), 'intel-ask-'));
  await mkdir(path.join(distDir, 'data'), { recursive: true });
  await writeFile(path.join(distDir, 'index.html'), '<!doctype html><title>Plan</title>');
  const sent = [];
  const app = createApp({
    env: {
      SESSION_SECRET: SECRET,
      ALLOWLIST_EMAILS: 'bjljohnson2012@gmail.com,alexander.varden@gmail.com',
      AUTH_FROM_EMAIL: 'ben@benjohnson.ai',
    },
    sendEmail: async (msg) => { sent.push(msg); return { ok: true }; },
    distDir,
    complete: async () => ({ answer: 'Invented 14.2 months and Azure.', status: 'answered', citations: [{ itemId: 'open-r1' }], confidence: 'high' }),
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    sent,
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
    distDir,
  };
}

test('ask limits stay at or above 20 and a minted session gets a grounded answer', async () => {
  assert.ok(LIMITS.requestPerEmail >= 20);
  assert.ok(LIMITS.requestPerIp >= 20);
  const app = await start();
  try {
    const unsigned = await fetch(app.base + '/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Why is live Core on hold?', pathHint: 'core' }),
    });
    assert.equal(unsigned.status, 401);
    const cookie = sessionCookie('bjljohnson2012@gmail.com', '127.0.0.1');
    const authed = await fetch(app.base + '/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ question: 'Why is live Core on hold?', pathHint: 'core' }),
    });
    assert.equal(authed.status, 200);
    const body = await authed.json();
    assert.equal(body.status, 'answered');
    assert.match(body.answer, /HOLD|hold|Live Core/i);
    assert.equal(/azure/i.test(body.answer), false);
    assert.equal(body.answer.includes('14.2'), false);
    assert.ok(body.citations.length > 0);
    assert.ok(body.citations.every((cite) => cite.itemId && cite.href.includes('item=')));
    assert.equal(app.sent.length, 0);
  } finally {
    await app.close();
    await rm(app.distDir, { recursive: true, force: true });
  }
});

test('a question the pack does not answer stays Explicit Unknown', async () => {
  const app = await start();
  try {
    const cookie = sessionCookie('alexander.varden@gmail.com', '127.0.0.1');
    const response = await fetch(app.base + '/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ question: 'zzzzqqqq azure pipeline', pathHint: 'enterprise' }),
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.status, 'explicit_unknown');
    assert.equal(/azure/i.test(body.answer), false);
    assert.equal(app.sent.length, 0);
  } finally {
    await app.close();
    await rm(app.distDir, { recursive: true, force: true });
  }
});
