/** Ranked plan search. Token, stem, and light fuzzy match. Not literal substring. */

const GROUPS = ['Sections', 'Still open', 'Competitors', 'Evidence', 'Plan'];

const NAV = [
  ['Start here', 'start', '', ['what you are looking at', 'verdict', 'start here']],
  ['In plain terms', 'plain', '', ['plain english', 'bottom line']],
  ['Where we win / lose', 'win', '', ['win', 'lose', 'win lose']],
  ['Market', 'tam', '', ['tam', 'attendance mix', 'market size']],
  ['ICP', 'icp', '', ['ideal customer', 'band c']],
  ['Competitors', 'comp', '', ['rivals', 'competitor']],
  ['Evidence', 'comp', 'evidence', ['screenshots', 'gallery', 'comp5']],
  ['MB self', 'self', '', ['ministry brands self']],
  ['Value', 'value', 'ex17', ['buyer values', 'what churches value']],
  ['Still open', 'resid', '', ['residuals', 'residual', 'residual register', 'open items', 'clarification', 'unproven', 'still open', 'items that still need clarification']],
  ['Council', 'council', '', ['scores', 'review']],
  ['Plan', 'bets', '', ['plan bets']],
  ['Ask the plan', 'ask', '', ['ask', 'question']],
];

const PATHS = [
  ['Mid-size Core', 'start', ['core plan', 'core', '250-999', '250', 'live hold', 'band c hold']],
  ['Commercial Plus / Enterprise', 'start', ['enterprise plan', 'enterprise', '1000', 'commercial plus']],
];

export const STILL_OPEN = [
  { id: 'R1', label: 'Safe Switch AE migration cockpit', aliases: ['safe switch', 'switch', 'switching', 'migration', 'migration cockpit', 'cockpit', 'ae migration'] },
  { id: 'R2', label: 'Gift-to-books + dual-run demos', aliases: ['gift-to-books', 'gift to books', 'dual-run', 'dual run', 'rgtp', 'recurring gift', 'recurring-gift transition'] },
  { id: 'R3', label: 'Current Amplify ease + support', aliases: ['ease and support', 'amplify reviews', 'explicit unknown'] },
  { id: 'R4', label: 'Win/loss vs PC / Pushpay', aliases: ['win/loss', 'win loss', 'win rate', 'in-seat', 'in seat', 'explicit unknown'] },
  { id: 'R5', label: 'Spoken starter ASP floor', aliases: ['asp', 'starter price', 'spoken price', 'price floor'] },
  { id: 'R6', label: 'Attendance / band quality', aliases: ['attendance', 'band quality', 'default 200', 'sfdc', 'in-seat', 'in seat'] },
  { id: 'R7', label: 'B6 go/no-go owners + dates', aliases: ['owners and dates', 'go/no-go', 'go no go'] },
  { id: 'R8', label: 'Fees / ACH rate card', aliases: ['fees', 'ach', 'rate card', 'processing fees'] },
  { id: 'R9', label: 'PCO 78,000 hard-fail bump', aliases: ['78000', '78000 churches', 'pco claim', 'hard-fail'] },
];

const COMPETITORS = [
  { name: 'Planning Center', rival: 'pco', aliases: ['pco', 'planning center online', 'planningcenter'] },
  { name: 'Pushpay', rival: 'pushpay', aliases: ['push pay', 'ccb', 'church community builder'] },
  { name: 'Subsplash', rival: 'subsplash', aliases: ['sub splash'] },
  { name: 'ACS / Realm', rival: 'acs', aliases: ['acs', 'realm', 'acs technologies'] },
  { name: 'Tithely / Breeze', rival: 'tithely', aliases: ['tithely', 'breeze', 'tithe.ly', 'breezechms'] },
  { name: 'Ministry Brands (us)', rival: 'mb', aliases: ['amplify', 'ministry brands', 'mb'] },
];

const BETS = [
  ['V1 Safe migration', 'safe migration switch'],
  ['V2 Trust during the switch', 'trust switch'],
  ['V3 One money truth', 'money truth fund accounting'],
  ['V4 No death-march rip', 'rip replace'],
  ['V5 Fund accounting', 'fund accounting payroll'],
  ['V6 Honest total cost', 'total cost price'],
];

const PLAN_NOTES = [
  ['Thing to plan for', 'plan for bets'],
  ['Thing to think about', 'strategic questions think about'],
];

const GO = new Set(['start', 'plain', 'win', 'tam', 'icp', 'comp', 'self', 'value', 'resid', 'council', 'bets', 'ask']);

const WEIGHT = {
  badge: { exact: 48, stem: 18, fuzzy: 8 },
  title: { exact: 16, stem: 10, fuzzy: 6 },
  alias: { exact: 14, stem: 9, fuzzy: 6 },
  body: { exact: 5, stem: 3, fuzzy: 2 },
};

export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/&amp;/g, ' ')
    .replace(/[’']/g, '')
    .replace(/,/g, '')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

export function stem(word) {
  let value = String(word || '');
  if (value.length <= 3) return value;
  if (value.endsWith('ing') && value.length > 6) value = value.slice(0, -3);
  else if (value.endsWith('ied') && value.length > 5) value = `${value.slice(0, -3)}y`;
  else if (value.endsWith('ed') && value.length > 5) value = value.slice(0, -2);
  else if (value.endsWith('es') && value.length > 4) value = value.slice(0, -2);
  else if (value.endsWith('s') && !value.endsWith('ss') && value.length > 4) value = value.slice(0, -1);
  return value;
}

function analyze(text) {
  const raw = tokenize(text);
  return { raw, stems: raw.map(stem), norm: raw.join(' ') };
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = current;
    }
  }
  return row[b.length];
}

function fieldScore(field, query) {
  if (!field.raw.length) return 0;
  const weights = WEIGHT[field.kind];
  const stemmed = stem(query);
  let best = 0;
  for (let i = 0; i < field.raw.length; i += 1) {
    const raw = field.raw[i];
    if (raw === query) best = Math.max(best, weights.exact);
    else if (field.stems[i] === stemmed && stemmed.length > 2) best = Math.max(best, weights.stem);
    else if (query.length >= 5 && raw.length >= 5) {
      const maxDistance = Math.max(query.length, raw.length) >= 8 ? 2 : 1;
      if (Math.abs(query.length - raw.length) <= maxDistance && levenshtein(query, raw) <= maxDistance) {
        best = Math.max(best, weights.fuzzy);
      }
    }
  }
  return best;
}

function prepare(item) {
  return {
    ...item,
    aliases: item.aliases || [],
    badge: item.badge || '',
    anchor: item.anchor || '',
    text: item.text || '',
    fields: {
      badge: { ...analyze(item.badge || ''), kind: 'badge' },
      title: { ...analyze(item.label), kind: 'title' },
      alias: { ...analyze((item.aliases || []).join(' ')), kind: 'alias' },
      body: { ...analyze(item.text || ''), kind: 'body' },
    },
  };
}

function scoreItem(item, tokens) {
  let score = 0;
  let matched = 0;
  for (const token of tokens) {
    const best = Math.max(
      fieldScore(item.fields.badge, token),
      fieldScore(item.fields.title, token),
      fieldScore(item.fields.alias, token),
      fieldScore(item.fields.body, token),
    );
    if (best > 0) {
      score += best;
      matched += 1;
    }
  }
  if (!matched) return 0;
  const phrase = tokens.join(' ');
  if (tokens.length >= 2 && (item.fields.title.norm.includes(phrase) || item.fields.alias.norm.includes(phrase))) {
    score += 24;
  }
  if (item.fields.title.norm === phrase) score += 36;
  if (tokens.length === 1 && item.group === 'Competitors' && item.fields.alias.raw.includes(tokens[0])) {
    score += 30;
  }
  return score * (0.5 + 0.5 * (matched / tokens.length));
}

function record(partial) {
  const go = partial.go;
  if (!GO.has(go)) throw new Error(`Unknown plan page: ${go}`);
  if (!GROUPS.includes(partial.group)) throw new Error(`Unknown search group: ${partial.group}`);
  return prepare(partial);
}

function addUnique(items, seen, partial) {
  const key = `${partial.group}|${partial.label.trim().toLowerCase()}`;
  if (!partial.label || seen.has(key)) return;
  seen.add(key);
  items.push(record(partial));
}

export function buildPlanIndex({ headings = [], evidence = [], residuals = [], rivals = [] } = {}) {
  const items = [];
  const seen = new Set();

  NAV.forEach(([label, go, anchor, aliases]) => {
    addUnique(items, seen, {
      group: 'Sections', label, go, anchor, aliases, browse: true, text: `${label} ${aliases.join(' ')}`,
    });
  });

  PATHS.forEach(([label, go, aliases]) => {
    addUnique(items, seen, {
      group: 'Sections', label, go, anchor: '', aliases, browse: false, text: aliases.join(' '),
    });
  });

  STILL_OPEN.forEach((item) => {
    const extra = residuals.find((row) => row.id === item.id) || {};
    addUnique(items, seen, {
      group: 'Still open',
      label: item.label,
      badge: item.id,
      go: 'resid',
      anchor: '',
      aliases: item.aliases,
      browse: false,
      text: [item.label, extra.plain, extra.status, extra.clears, extra.owner, item.aliases.join(' ')].filter(Boolean).join(' '),
    });
  });

  COMPETITORS.forEach((comp) => {
    const extra = rivals.find((row) => row.name === comp.name) || {};
    addUnique(items, seen, {
      group: 'Competitors',
      label: comp.name,
      go: 'comp',
      anchor: '',
      rival: comp.rival,
      aliases: comp.aliases,
      browse: false,
      text: [comp.name, extra.promise, extra.strength, extra.whyUs, extra.dont, comp.aliases.join(' ')].filter(Boolean).join(' '),
    });
  });

  BETS.forEach(([label, aliases]) => {
    addUnique(items, seen, {
      group: 'Plan', label, go: 'bets', anchor: '', aliases: [aliases], browse: false, text: `${label} ${aliases}`,
    });
  });

  PLAN_NOTES.forEach(([label, aliases]) => {
    addUnique(items, seen, {
      group: 'Plan', label, go: 'bets', anchor: '', aliases: [aliases], browse: false, text: `${label} ${aliases}`,
    });
  });

  headings.forEach((heading) => {
    if (!heading?.label || !GO.has(heading.go)) return;
    addUnique(items, seen, {
      group: 'Sections',
      label: heading.label,
      go: heading.go,
      anchor: heading.anchor || '',
      aliases: [],
      browse: false,
      text: heading.text || heading.label,
    });
  });

  evidence.forEach((shot) => {
    const label = String(shot?.label || '').replace(/\s+/g, ' ').trim();
    if (!label) return;
    addUnique(items, seen, {
      group: 'Evidence',
      label,
      go: 'comp',
      anchor: 'evidence',
      rival: shot.rival || '',
      aliases: [],
      browse: false,
      text: shot.text || label,
    });
  });

  return items;
}

export function searchPlan(index, query, limit = 20) {
  const tokens = tokenize(query);
  if (!tokens.length) {
    return index.filter((item) => item.browse).slice(0, limit);
  }
  return index
    .map((item) => ({ ...item, score: scoreItem(item, tokens) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function presentHits(index, query, limit = 20) {
  const hits = searchPlan(index, query, limit);
  const trimmed = String(query || '').trim();
  if (!trimmed) return hits;
  const rank = new Map(hits.map((hit, index) => [hit, index]));
  const best = new Map();
  hits.forEach((hit) => best.set(hit.group, Math.max(best.get(hit.group) || 0, hit.score || 0)));
  const names = [...best.keys()].sort((a, b) => {
    const diff = best.get(b) - best.get(a);
    if (diff) return diff;
    const aRank = Math.min(...hits.filter((hit) => hit.group === a).map((hit) => rank.get(hit)));
    const bRank = Math.min(...hits.filter((hit) => hit.group === b).map((hit) => rank.get(hit)));
    return aRank - bRank;
  });
  const ordered = [];
  names.forEach((name) => ordered.push(...hits.filter((hit) => hit.group === name)));
  return ordered;
}
