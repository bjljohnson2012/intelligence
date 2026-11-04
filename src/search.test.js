import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlanIndex, presentHits, searchPlan, stem } from './search.js';

const index = buildPlanIndex({
  evidence: [
    { label: 'Pushpay pricing', rival: 'pushpay', text: 'quote only' },
    { label: 'Planning Center home', rival: 'pco', text: 'home page' },
  ],
  residuals: [
    { id: 'R1', plain: 'A screen that shows a switching church how many givers have moved', status: 'Not built', clears: 'Ship the progress view', owner: 'Product' },
  ],
  rivals: [
    { name: 'Pushpay', promise: 'grows generosity', strength: 'Large-church proof' },
    { name: 'Planning Center', promise: 'Every part of your church', strength: 'Loved by staff' },
  ],
});

function top(query) {
  return presentHits(index, query, 8);
}

test('stems switching down to switch', () => {
  assert.equal(stem('switching'), 'switch');
  assert.equal(stem('churches'), 'church');
});

test('switch and Safe Switch land on R1 before other rows', () => {
  for (const query of ['switch', 'Safe Switch', 'switching', 'migration']) {
    const hits = top(query);
    assert.equal(hits[0].badge, 'R1', query);
    assert.match(hits[0].label, /Safe Switch/);
  }
});

test('RGTP lands on the gift-to-books item', () => {
  const hits = top('rgtp');
  assert.equal(hits[0].badge, 'R2');
});

test('rival names and short names land on the competitor', () => {
  assert.equal(top('Pushpay')[0].label, 'Pushpay');
  assert.equal(top('pco')[0].label, 'Planning Center');
  assert.equal(top('planning center')[0].label, 'Planning Center');
  assert.equal(top('puspay')[0].label, 'Pushpay');
});

test('residual jargon lands on Still open, with R badges on the nine items', () => {
  const hits = top('residuals');
  assert.equal(hits[0].label, 'Still open');
  assert.equal(hits[0].group, 'Sections');
  const items = top('safe switch');
  assert.equal(items[0].group, 'Still open');
  assert.equal(items[0].badge, 'R1');
});

test('evidence captions and plan bets are real rows', () => {
  assert.equal(top('Pushpay pricing')[0].group, 'Evidence');
  assert.equal(top('Thing to plan for')[0].label, 'Thing to plan for');
  assert.equal(top('Thing to think about')[0].group, 'Plan');
});

test('empty search lists the tabs, including Ask the plan, and nonsense matches nothing', () => {
  const browse = searchPlan(index, '', 20);
  assert.ok(browse.some((hit) => hit.label === 'Ask the plan'));
  assert.ok(browse.some((hit) => hit.label === 'Still open'));
  assert.equal(searchPlan(index, 'zzzzqqqq', 5).length, 0);
});

test('groups stay inside the five plan groups and pages are real', () => {
  const allowed = new Set(['Sections', 'Still open', 'Competitors', 'Evidence', 'Plan']);
  const pages = new Set(['start', 'plain', 'win', 'tam', 'icp', 'comp', 'self', 'value', 'resid', 'council', 'bets', 'ask']);
  for (const hit of index) {
    assert.ok(allowed.has(hit.group), hit.label);
    assert.ok(pages.has(hit.go), hit.label);
  }
});
