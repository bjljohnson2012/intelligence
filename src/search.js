/** Ranked plan search. Token, stem, and light fuzzy match. Not literal substring. */

const GROUPS = ['Sections', 'KPIs', 'Claims', 'Tables', 'Still open', 'Competitors', 'Evidence', 'Plan'];

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
  ['Plan', 'bets', '', ['plan bets', 'thing to plan', 'thing to plan for', 'thing to think about', 'plan for']],
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
  { id: 'R9', label: 'PCO headline count · Held · R9', aliases: ['78000', '78000 churches', 'pco claim', 'hard-fail', 'held r9'] },
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

const GO = new Set(['start', 'plain', 'win', 'tam', 'icp', 'comp', 'self', 'value', 'resid', 'council', 'bets', 'ask', 'buyers']);

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
    .filter((token) => token.length > 1 || (token.length === 1 && token !== 'a' && token !== 'i'));
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
  if (item.group === 'Competitors') {
    const name = item.fields.title.raw[0] || '';
    const query = tokens[0];
    if (tokens.length === 1 && item.fields.alias.raw.includes(query)) score += 50;
    else if (tokens.length === 1 && name && query.length >= 5 && Math.abs(name.length - query.length) <= 1 && levenshtein(name, query) <= 1) score += 50;
    else if (tokens.length > 1 && item.fields.alias.norm.includes(tokens.join(' '))) score += 46;
  }
  if (item.pathFact && tokens.length === 1 && (item.aliases || []).some((alias) => tokenize(alias).join(' ') === tokens[0])) {
    score += 40;
  }
  if (item.group === 'Still open' && Array.isArray(item.aliases)) {
    const covered = item.aliases.some((alias) => {
      const phrase = tokenize(alias);
      return phrase.length === tokens.length && phrase.every((token, index) => token === tokens[index]);
    }) || (tokens.length === 1 && item.fields.badge.raw.includes(tokens[0]));
    if (covered) score += 40;
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

const KIND_GROUP = {
  kpi: 'KPIs',
  chart: 'KPIs',
  claim: 'Claims',
  'table-row': 'Tables',
  open: 'Still open',
  competitor: 'Competitors',
  evidence: 'Evidence',
  play: 'Plan',
  note: 'Sections',
  panel: 'Sections',
  narrative: 'Sections',
};

export const SEARCH_DEBOUNCE_MS = 120;

export function debounce(fn, ms = SEARCH_DEBOUNCE_MS) {
  if (ms > 150) throw new Error('Search debounce cannot exceed 150ms');
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function snippet(text, query) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const tokens = tokenize(query);
  const lower = clean.toLowerCase();
  let at = -1;
  for (const token of tokens) {
    at = lower.indexOf(token);
    if (at >= 0) break;
  }
  if (at < 0) return clean.slice(0, 140);
  const start = Math.max(0, at - 36);
  const slice = clean.slice(start, start + 150);
  return `${start ? '…' : ''}${slice}${start + 150 < clean.length ? '…' : ''}`;
}

export function pathLabel(paths = []) {
  const set = new Set(paths);
  const core = set.has('core');
  const enterprise = set.has('enterprise');
  if (core && enterprise) return 'Both paths';
  if (enterprise) return 'Enterprise';
  if (core) return 'Core';
  return 'Both paths';
}

export function indexFromPack(pack) {
  const items = [];
  const seen = new Set();
  (pack.sections || []).forEach((section) => {
    addUnique(items, seen, {
      group: 'Sections',
      label: section.label,
      go: section.id,
      anchor: '',
      aliases: section.id === 'resid'
        ? ['residuals', 'residual', 'still open', 'open items']
        : section.id === 'bets'
          ? ['plan', 'plan bets', 'thing to plan', 'thing to plan for', 'thing to think about', 'plan for']
          : [section.label],
      browse: true,
      paths: ['core', 'enterprise'],
      kind: 'section',
      itemId: `section-${section.id}`,
      text: `${section.label} ${section.id}`,
      plain: section.id === 'bets' ? 'Thing to plan for. The Plan section.' : section.label,
    });
    if (section.id === 'comp') {
      addUnique(items, seen, {
        group: 'Evidence',
        label: 'Evidence',
        go: 'comp',
        anchor: 'evidence',
        aliases: ['screenshots', 'screenshot', 'gallery', 'comp5'],
        browse: true,
        paths: ['core', 'enterprise'],
        kind: 'section',
        itemId: 'section-evidence',
        text: 'Screenshot gallery COMP5 evidence',
        plain: 'Screenshot gallery. What a church sees on the public marketing pages.',
      });
    }
  });
  addUnique(items, seen, {
    group: 'Sections',
    label: 'Altogether',
    go: 'start',
    anchor: '',
    aliases: ['altogether', 'both paths', 'side by side', 'compare paths'],
    browse: true,
    paths: ['core', 'enterprise'],
    kind: 'section',
    itemId: 'section-all',
    text: 'Altogether compares Core 250–999 and Enterprise 1,000+',
    plain: 'Altogether compares Core 250–999 and Enterprise 1,000+.',
  });
  PATHS.forEach(([label, go, aliases]) => {
    const enterprise = aliases.includes('enterprise');
    addUnique(items, seen, {
      group: 'Sections',
      label,
      go,
      anchor: '',
      aliases,
      browse: false,
      paths: enterprise ? ['enterprise'] : ['core'],
      kind: 'section',
      itemId: enterprise ? 'section-enterprise-path' : 'section-core-path',
      pathFact: true,
      text: enterprise ? 'Commercial Plus / Enterprise. Weekly attendance 1,000+.' : 'Mid-size Core. Weekly attendance 250–999.',
      plain: enterprise ? 'Commercial Plus / Enterprise. Weekly attendance 1,000+.' : 'Mid-size Core. Weekly attendance 250–999.',
    });
  });
  (pack.items || []).forEach((item) => {
    const group = KIND_GROUP[item.kind];
    if (!group || !item.title) return;
    addUnique(items, seen, {
      group,
      label: item.title,
      go: item.section || 'start',
      anchor: item.kind === 'evidence' ? 'evidence' : '',
      aliases: item.aliases || [],
      browse: false,
      paths: item.paths || ['core', 'enterprise'],
      kind: item.kind,
      itemId: item.id,
      badge: item.badge || '',
      rival: item.rival || '',
      plain: [item.title, item.value, item.note, item.text].filter(Boolean).join(' '),
      text: [item.title, item.value, item.note, item.text, ...(item.aliases || [])].filter(Boolean).join(' '),
    });
  });
  return items;
}

export function searchPack(index, query, path = 'all', limit = 20) {
  const wide = searchPlan(index, query, 80).map((hit) => {
    const paths = hit.paths || ['core', 'enterprise'];
    const onPath = path === 'all' || paths.includes(path);
    const baseScore = hit.score || 0;
    return {
      ...hit,
      paths,
      onPath,
      pathLabel: pathLabel(paths),
      snippet: snippet(hit.plain || hit.label, query),
      baseScore,
      score: baseScore + (onPath ? 15 : 0),
    };
  });
  wide.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  const hits = wide.slice(0, limit);
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
