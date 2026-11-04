import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pack = JSON.parse(readFileSync(path.join(root, 'public', 'data', 'pack.json'), 'utf8'));
const blob = JSON.stringify(pack);

test('the pack keeps sourced figures and drops draft filler', () => {
  for (const snippet of ['~10k–25k', '~25–30%', '~1–3%', '~15–20%', '~1,750', '$5.3M', '8% / 16% / 56%', 'Explicit Unknown', 'HOLD']) {
    assert.ok(blob.includes(snippet), snippet);
  }
  for (const banned of ['Microsoft', 'Azure', '12,480', '$4.2B', '$42k']) {
    assert.equal(blob.includes(banned), false, banned);
  }
  for (const id of ['open-r1', 'open-r2', 'open-r3', 'open-r4', 'open-r5', 'open-r6', 'open-r7', 'open-r8', 'open-r9']) {
    assert.ok(pack.items.some((item) => item.id === id), id);
  }
  assert.deepEqual(pack.compare.rows[1], ['Count', '~10k–25k', 'Explicit Unknown', '~1,750']);
  assert.ok(pack.items.some((item) => item.kind === 'evidence'));
  assert.ok(pack.items.some((item) => item.kind === 'competitor' && item.rival === 'pushpay'));
  assert.equal(pack.hero.core.lede.includes('does not prove enough to take Core live'), true);
});
