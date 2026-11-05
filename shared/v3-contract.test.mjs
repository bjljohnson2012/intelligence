import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { LIMITS as APP_LIMITS } from '../server/app.js';
import {
  LIMITS,
  ASK_MIN_SCORE,
  cookieHeader,
  isCouncilAdmin,
  readSessionToken,
  signSession,
} from './intel-session.mjs';
import { createFileStore, requestCode } from './auth-flow.mjs';
import { answerFromChunks } from './similarity.mjs';
import {
  ASK_PACK_SOURCE,
  NOTION_DASHBOARD_HREF,
  NOTION_DASHBOARD_LABEL,
  OVERVIEW_PACK_SOURCE,
} from './notion-bridge.mjs';

const SECRET = 'test-secret-must-be-at-least-32-characters';

test('request limits stay at 20 per email and 20 per IP', () => {
  assert.equal(LIMITS.requestPerEmail, 20);
  assert.equal(LIMITS.requestPerIp, 20);
  assert.equal(APP_LIMITS.requestPerEmail, 20);
  assert.equal(APP_LIMITS.requestPerIp, 20);
  assert.equal(LIMITS.requestWindowMs, 60 * 60 * 1000);
  assert.equal(ASK_MIN_SCORE, 0.72);
});

test('intel_session cookie contract is the signed email, exp, and ip', () => {
  const exp = 1_900_000_000;
  const token = signSession('bjljohnson2012@gmail.com', exp, '203.0.113.8', SECRET);
  const header = cookieHeader(token, LIMITS.sessionTtlSec);
  assert.match(header, /^intel_session=[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+; HttpOnly; Secure; SameSite=Lax; Path=\/; Max-Age=604800$/);
  const session = readSessionToken({
    cookieHeader: `intel_session=${token}`,
    secret: SECRET,
    allowlist: new Set(['bjljohnson2012@gmail.com', 'alexander.varden@gmail.com']),
    nowMs: (exp - 10) * 1000,
    ip: '203.0.113.8',
  });
  assert.deepEqual(session, { email: 'bjljohnson2012@gmail.com' });
  assert.equal(readSessionToken({
    cookieHeader: `intel_session=${token}`,
    secret: SECRET,
    allowlist: new Set(['bjljohnson2012@gmail.com']),
    nowMs: (exp - 10) * 1000,
    ip: '198.51.100.4',
  }), null);
  assert.equal(isCouncilAdmin('bjljohnson2012@gmail.com'), true);
  assert.equal(isCouncilAdmin('alexander.varden@gmail.com'), false);
});

test('a durable file store stops the 21st code request per email and per IP', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'intel-rate-'));
  const file = path.join(dir, 'rates.json');
  const allowlist = new Set(['rate-proof@example.com']);
  let t = 1_700_000_000_000;
  const now = () => t;
  const sendEmail = async () => ({ ok: true });
  try {
    const first = createFileStore(file);
    for (let i = 0; i < LIMITS.requestPerEmail; i += 1) {
      const result = await requestCode(first, {
        email: 'rate-proof@example.com',
        ip: '203.0.113.9',
        now,
        allowlist,
        sendEmail,
      });
      assert.equal(result.status, 200);
      t += LIMITS.cooldownMs;
    }
    const second = createFileStore(file);
    const blockedEmail = await requestCode(second, {
      email: 'rate-proof@example.com',
      ip: '203.0.113.10',
      now,
      allowlist,
      sendEmail,
    });
    assert.equal(blockedEmail.status, 429);
    assert.equal(blockedEmail.body.limit, 'window');

    const other = createFileStore(file);
    for (let i = 0; i < LIMITS.requestPerIp; i += 1) {
      const result = await requestCode(other, {
        email: `ip-${i}@example.com`,
        ip: '203.0.113.50',
        now,
        allowlist,
        sendEmail,
      });
      assert.equal(result.status, 200);
      t += LIMITS.cooldownMs;
    }
    const blockedIp = await requestCode(createFileStore(file), {
      email: 'fresh-ip@example.com',
      ip: '203.0.113.50',
      now,
      allowlist,
      sendEmail,
    });
    assert.equal(blockedIp.status, 429);
    assert.equal(blockedIp.body.limit, 'window');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('notion dashboard CTAs stay on the locked href and ask is visit-only', () => {
  assert.equal(NOTION_DASHBOARD_HREF, 'https://app.notion.com/p/40efe86f6dee81b5b4bbe57d383ce88c');
  assert.equal(NOTION_DASHBOARD_LABEL, 'Open Notion dashboard');
  assert.match(OVERVIEW_PACK_SOURCE, /Supabase is not connected\. Durable plan lives in Notion\./);
  assert.match(ASK_PACK_SOURCE, /Supabase is not connected\. Durable plan lives in Notion\./);
  const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
  const cta = read('../web/components/notion-cta.tsx');
  assert.match(cta, /target="_blank"/);
  assert.match(cta, /rel="noopener"/);
  assert.match(cta, /NOTION_DASHBOARD_HREF/);
  assert.match(cta, /NOTION_DASHBOARD_LABEL/);
  const pack = read('../web/lib/pack.ts');
  assert.match(pack, /OVERVIEW_PACK_SOURCE/);
  assert.match(pack, /ASK_PACK_SOURCE/);
  const ask = read('../web/components/ask-panel.tsx');
  assert.equal(ask.includes('localStorage'), false);
  assert.equal(ask.includes('sessionStorage'), false);
  assert.match(ask, /This chat is not saved/);
  assert.match(read('../web/components/shell.tsx'), /NotionRailLink/);
  assert.match(read('../web/app/(workspace)/page.tsx'), /PackSourceFooter/);
  assert.match(read('../web/app/(workspace)/layout.tsx'), /askSource/);
});

test('ask cites a close chunk and says not found below 0.72', () => {
  const chunks = [{
    id: 'r4',
    title: 'How often we win or lose against Planning Center and Pushpay',
    content: 'How often we win or lose against Planning Center and Pushpay is unknown. Only 2 known cases.',
    source: 'Residuals R4',
    paths: ['core', 'enterprise'],
  }];
  const hit = answerFromChunks(chunks[0].content, chunks, 'core');
  assert.equal(hit.status, 'answered');
  assert.equal(hit.citations[0].id, 'r4');
  assert.ok(hit.score >= 0.72);
  const miss = answerFromChunks('What is the weather in Lisbon tomorrow?', chunks, 'core');
  assert.equal(miss.status, 'not_found');
  assert.equal(miss.answer, '');
  assert.deepEqual(miss.citations, []);
  assert.ok(miss.score < 0.72);
});
