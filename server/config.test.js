import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

test('env examples name the session secret, Resend key, From address, and allowlist', () => {
  const rootExample = read('.env.example');
  const deployExample = read('deploy/.env.example');
  assert.equal(rootExample, deployExample);
  assert.match(rootExample, /^SESSION_SECRET=$/m);
  assert.match(rootExample, /^RESEND_API_KEY=$/m);
  assert.match(rootExample, /^AUTH_FROM_EMAIL=ben@benjohnson\.ai$/m);
  assert.match(rootExample, /^ALLOWLIST_EMAILS=bjljohnson2012@gmail\.com,alexander\.varden@gmail\.com$/m);
  assert.equal(rootExample.includes('AUTH_FROM_EMAIL=noreply@fieldschool.ai'), false);
  assert.equal(rootExample.includes('SESSION_SECRET=' + 're_'), false);
});

test('Caddy proxies to the Node server and has no placeholder response', () => {
  const caddy = read('deploy/Caddyfile.intelligence');
  assert.match(caddy, /reverse_proxy 127\.0\.0\.1:8787/);
  assert.equal(caddy.includes('403'), false);
  assert.equal(/\brespond\b/.test(caddy), false);
  assert.equal(/file_server/.test(caddy), false);
});

test('docs describe VPS one-time-code login and a host that is not open yet', () => {
  const readme = read('README.md');
  const status = read('docs/STATUS.md');
  for (const text of [readme, status]) {
    assert.match(text, /ben@benjohnson\.ai/);
    assert.match(text, /bjljohnson2012@gmail\.com/);
    assert.match(text, /alexander\.varden@gmail\.com/);
    assert.equal(text.includes('Until Cloudflare Access'), false);
    assert.equal(text.includes('being verified'), false);
    assert.match(text, /250–999/);
    assert.match(text, /1,000\+/);
  }
  assert.match(readme, /no Cloudflare Access, Tunnel, or Cloudflare DNS/);
  assert.match(status, /Live host is not open/);
  assert.match(status, /Live mid-size selling is on hold/);
  assert.equal(read('server/mail.js').includes('fieldschool'), false);
  assert.equal(read('server/index.js').includes('fieldschool'), false);
});
