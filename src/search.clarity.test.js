import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEARCH_DEBOUNCE_MS, debounce, indexFromPack, searchPack } from './search.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pack = JSON.parse(readFileSync(path.join(root, 'public', 'data', 'pack.json'), 'utf8'));
const index = indexFromPack(pack);

function top(query, pathName = 'all') {
  return searchPack(index, query, pathName, 5)[0];
}

test('search debounce stays at or under 150ms and collapses bursts', async () => {
  assert.ok(SEARCH_DEBOUNCE_MS <= 150);
  let calls = 0;
  const run = debounce(() => { calls += 1; }, SEARCH_DEBOUNCE_MS);
  run();
  run();
  run();
  await new Promise((resolve) => setTimeout(resolve, SEARCH_DEBOUNCE_MS + 40));
  assert.equal(calls, 1);
});

test('clarity queries land on the pack item they name', () => {
  const cases = [
    ['switch', (hit) => hit.badge === 'R1'],
    ['Safe Switch', (hit) => hit.badge === 'R1'],
    ['switching', (hit) => hit.badge === 'R1'],
    ['rgtp', (hit) => hit.badge === 'R2'],
    ['gift to books', (hit) => hit.badge === 'R2'],
    ['pco', (hit) => hit.group === 'Competitors' && /planning center/i.test(hit.label)],
    ['planning center', (hit) => hit.group === 'Competitors'],
    ['puspay', (hit) => hit.group === 'Competitors' && /pushpay/i.test(hit.label)],
    ['residuals', (hit) => hit.label === 'Still open'],
    ['explicit unknown', (hit) => /unknown/i.test(`${hit.label} ${hit.snippet}`)],
    ['band c', (hit) => /band c|250/i.test(`${hit.label} ${hit.text}`)],
    ['megachurch', (hit) => /megachurch|2,000/i.test(`${hit.label} ${hit.text}`)],
    ['hold', (hit) => /hold/i.test(hit.label)],
    ['giving growth', (hit) => /giving/i.test(hit.label)],
    ['fees', (hit) => hit.badge === 'R8'],
    ['screenshot', (hit) => hit.group === 'Evidence'],
    ['altogether', (hit) => hit.label === 'Altogether'],
    ['council', (hit) => /council/i.test(hit.label)],
    ['breeze', (hit) => /tithely|breeze/i.test(hit.label)],
    ['in-seat', (hit) => hit.badge === 'R4' || hit.badge === 'R6'],
    ['1,000', (hit) => hit.pathLabel === 'Enterprise' || /1,000/.test(hit.label)],
  ];
  assert.ok(cases.length >= 15);
  for (const [query, check] of cases) {
    const hit = top(query);
    assert.ok(hit, query);
    assert.ok(hit.snippet || hit.snippet === '', query);
    assert.ok(hit.pathLabel, query);
    assert.ok(check(hit), `${query} -> ${hit.group} ${hit.badge} ${hit.label}`);
  }
});

test('search keeps the other path reachable and ranks the current path first', () => {
  const onCore = searchPack(index, 'Pushpay', 'core', 5);
  assert.ok(onCore.some((hit) => /pushpay/i.test(hit.label)));
  const onEnterprise = top('Band B count', 'enterprise');
  assert.equal(onEnterprise.onPath, true);
  assert.match(onEnterprise.label, /Band B/);
});
