import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sayCheck } from './say.js';
import { LIMITS } from '../server/app.js';
import { V2_NAV, attackBrief, buyersHtml, comparesHtml, evidenceHtml, hideNamedChrome, implementationHtml, isAdminEmail, plan2027Html, showHero, visibleSection } from './v2.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => JSON.parse(readFileSync(path.join(root, file), 'utf8'));

test('sign-in limits stay at 20', () => {
  assert.ok(LIMITS.requestPerEmail >= 20);
  assert.ok(LIMITS.requestPerIp >= 20);
});

test('PCO headline has no figure and Facebook is not social proof', () => {
  const rivals = read('public/data/competitors.json');
  const pco = rivals.rivals.find((rival) => /planning center/i.test(rival.name));
  assert.equal(pco.headlineCount, 'Held · R9');
  assert.equal(/78/.test(pco.headlineCount), false);
  const pack = readFileSync(path.join(root, 'public/data/pack.json'), 'utf8');
  assert.equal(pack.includes('78,000'), false);
  assert.equal(pack.includes('mb_social_facebook.png'), true);
  assert.match(pack, /MB channel page, not proof/);
  assert.equal(pack.includes('Ministry Brands · Social proof'), false);
});

test('SP01 through SP12 are wired and SP13 is absent', () => {
  const social = read('public/social/buyers-see-say.json');
  const ids = [
    ...social.reach.map((row) => row.id),
    social.posts.id,
    ...social.quotes.map((row) => row.id),
    ...social.also.map((row) => row.id),
  ];
  for (const id of ['SP01', 'SP02', 'SP03', 'SP04', 'SP05', 'SP06', 'SP07', 'SP08', 'SP09', 'SP10', 'SP11', 'SP12']) {
    assert.ok(ids.includes(id), id);
  }
  assert.ok(ids.includes('SP14+SP15'));
  assert.equal(ids.includes('SP13'), false);
  assert.equal(social.reach.find((row) => row.id === 'SP14+SP15').counts, null);
  const pack = read('public/data/pack.json');
  assert.ok(pack.items.some((item) => item.id === 'sp01'));
  assert.equal(pack.items.some((item) => item.id === 'sp13'), false);
  const html = buyersHtml(social);
  assert.match(html, /What buyers see and say/);
  assert.match(html, /Followers are not reach/);
  assert.equal(/social proof/i.test(html), false);
  for (const id of ['SP01', 'SP02', 'SP03', 'SP04', 'SP05', 'SP06', 'SP07', 'SP08', 'SP09', 'SP10', 'SP11', 'SP12']) {
    assert.match(html, new RegExp(`${id} KEEP`));
  }
  assert.match(html, /SP13<\/b> Dropped/);
});

test('theater figures are not facts and buyer values are counts of 71', () => {
  const pack = read('public/data/pack.json');
  const outcome = pack.items.find((item) => item.id === 'row-outcome-stats-52-2x-61');
  assert.match(outcome.text, /Not a claim/);
  assert.equal(outcome.text.includes('2X'), false);
  const conversion = pack.items.find((item) => item.id === 'claim-andrew-nb-38-1-eb-45-4-conversion');
  assert.match(conversion.text, /Explicit Unknown/);
  assert.equal(conversion.text.includes('38.1'), false);
  const values = read('public/data/buyer-values.json');
  assert.equal(values.unit, 'of 71');
  assert.equal(values.items[0].of71, 50);
  assert.equal(values.items[0].cm2Percent, 70);
  const content = readFileSync(path.join(root, 'src/content.js'), 'utf8');
  assert.match(content, /Not an Amplify win while R3 public n=0/);
  assert.match(content, /not proven \(R2 partial, R1 Safe Switch FAIL\)/);
  assert.match(content, /Pushpay claims only/);
});

test('Amplify compares use COMP5 and badge the unknown modules', () => {
  const compares = read('public/data/amplify-compares.json');
  const files = compares.modules.flatMap((mod) => [...mod.amplify, ...mod.rivals]);
  assert.ok(files.length > 0);
  for (const file of files) assert.match(file, /\.png$/);
  assert.equal(compares.modules.find((mod) => mod.id === 'check-in').unknown, true);
  assert.equal(compares.modules.find((mod) => mod.id === 'events').unknown, true);
  const html = comparesHtml(compares, read('public/data/evidence-decisions.json'));
  assert.match(html, /Explicit Unknown/);
  assert.match(html, /comp-2026-11-04\/mb_amplify\.png/);
  assert.match(html, /class="sxs"/);
  assert.match(html, /Steal|Counter|Refuse/);
  const captions = [...html.matchAll(/<figcaption>([\s\S]*?)<\/figcaption>/g)].map((match) => match[1]);
  assert.ok(captions.length > 0);
  assert.ok(captions.every((caption) => !caption.includes('.png')));
  assert.equal(html.includes('/amplify-modules/'), false);
});

test('read order stays on the V2 nav and council is not a front-end step', () => {
  const start = read('public/data/pack.json').sections.find((section) => section.id === 'start').html;
  assert.equal(start.includes('data-go="council"'), false);
  assert.equal(start.includes('data-go="plain"'), false);
  assert.equal(start.includes('data-go="win"'), false);
  assert.equal(start.includes('data-go="resid"'), false);
  assert.match(start, /data-go="implement"/);
  assert.match(start, /Review scores are not in this workspace/);
  assert.equal(visibleSection('council', false), 'start');
  assert.equal(visibleSection('council', true), 'council');
  assert.equal(visibleSection('plain', false), 'bets');
  assert.equal(visibleSection('evidence', false), 'evidence');
  assert.equal(showHero('commercial', 'start'), true);
  assert.equal(showHero('commercial', 'buyers'), false);
  assert.equal(showHero('2027', 'start'), false);
  const main = readFileSync(path.join(root, 'src/main.js'), 'utf8');
  assert.equal(/getElementById\('rail-back'\)[\s\S]{0,120}history\.back/.test(main), false);
  assert.equal(main.includes("if (state.plan === '2027') state.section = 'start'"), false);
});

test('implementation composes this week from live data and evidence thumbs can open', () => {
  const html = implementationHtml(
    read('public/data/residuals.json'),
    read('public/social/buyers-see-say.json'),
    read('public/data/amplify-compares.json'),
  );
  assert.match(html, /Back to Overview/);
  assert.match(html, /data-go="start"/);
  assert.match(html, /Independent proof that today/);
  assert.match(html, /Followers are not reach/);
  assert.match(html, /Check-in/);
  assert.equal(html.includes('Say J1 and J2'), false);
  const shots = evidenceHtml(read('public/data/evidence-decisions.json'));
  assert.match(shots, /data-item="ev-/);
  assert.equal((shots.match(/class="gitem"/g) || []).length, 35);
});

test('council is admin-only and off the front-end nav', () => {
  assert.equal(isAdminEmail('bjljohnson2012@gmail.com'), true);
  assert.equal(isAdminEmail('alexander.varden@gmail.com'), false);
  assert.equal(V2_NAV.some((item) => item.id === 'council'), false);
  const app = readFileSync(path.join(root, 'server/app.js'), 'utf8');
  assert.match(app, /\/api\/admin\/council/);
  assert.match(app, /bjljohnson2012@gmail.com/);
  const pack = readFileSync(path.join(root, 'public/data/pack.json'), 'utf8');
  assert.equal(pack.includes('Clarity 9'), false);
  assert.equal(pack.includes('data-go=council'), false);
});

test('2027 plan remount hides the source name and does not invent the account counts', () => {
  const plan = read('public/data/plan-2027.json');
  assert.equal(plan.data.counts.plusAccts, 4633);
  const html = plan2027Html(plan);
  assert.equal(/stolz/i.test(html), false);
  assert.equal(html.includes('andrewcstolz'), false);
  assert.match(html, /2027 plan/);
  assert.match(html, /4,633/);
  assert.equal(hideNamedChrome('Andrew Stolz'), 'Named in the source plan. Not shown here.');
});

test('say-checker refuses theater and allows a dated follower count', () => {
  assert.equal(sayCheck('Can I say 78,000 churches?').status, 'refused');
  assert.equal(sayCheck('We serve 90,000 churches').status, 'refused');
  assert.equal(sayCheck('Amplify is easy for the office').status, 'explicit_unknown');
  const easier = sayCheck('Easier than PCO?');
  assert.equal(easier.status, 'explicit_unknown');
  assert.match(easier.answer, /not an Amplify win/);
  assert.equal(sayCheck('Can I say a real person answers?').status, 'answered');
  assert.match(sayCheck('LinkedIn followers were 15,298').answer, /15,298/);
  assert.match(sayCheck('Stevie award').answer, /Pushpay claim/);
  const brief = attackBrief({ incumbent: 'Planning Center', band: 'core', contractEnd: '', booksOwner: '', recurring: '' }, read('public/data/competitors.json').rivals);
  assert.match(brief, /Held · R9/);
  assert.equal(brief.includes('78,000'), false);
});
