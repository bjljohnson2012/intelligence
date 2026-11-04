import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { supabaseAdmin } from '@/lib/supabase';

export type Kpi = { id: string; label: string; value: string; note: string };
export type Band = {
  label: string;
  congregationsPct: number;
  attendeesPct: number | null;
  confidence: string;
  count: string;
};
export type OrderCard = { n: string; title: string; body: string; href: string };
export type Milestone = {
  id: string;
  title: string;
  detail: string;
  quarter: string | null;
  owner: string;
  status: string;
  source: string;
};
export type Territory = {
  id: number;
  states: string;
  region: string;
  grade: string;
  profile: string;
  quota: number;
  mql: number;
  seat: string;
  person: string;
  director: string;
};
export type StateAssignment = { abbr: string; terrs: number[]; primary: number };
export type Rival = {
  name: string;
  initials: string;
  promise: string;
  pricing: string;
  strength: string;
  ready: string;
  dont: string;
  headline: string;
  note: string;
  sizes: string;
};
export type ClaimCard = { id: string; title: string; text: string; status: string };
export type ModuleCompare = {
  id: string;
  name: string;
  move: string;
  decision: string;
  amplify: string[];
  rivals: string[];
  unknown: boolean;
};
export type EvidenceRow = {
  id: string;
  title: string;
  decision: string;
  rival: string;
  kind: string;
  captured: string;
  src: string;
  url: string;
};
export type SeatRow = {
  id: string;
  team: string;
  person: string;
  director: string;
  status: string;
  territory: string;
  grade: string;
  quota: number | null;
  region: string;
};
export type PlusRow = {
  name: string;
  states: string;
  clients: number;
  amplify: number;
  legacy: number;
  other: number;
};
export type JobRow = { id: string; words: string; of71: string; use: string };
export type BuyerSeat = { seat: string; who: string; demo: string };
export type AskChunk = { id: string; title: string; content: string; source: string; paths: string[] };

type PackItem = {
  id?: string;
  kind?: string;
  title?: string;
  value?: string;
  note?: string;
  text?: string;
  status?: string;
  paths?: string[];
  sources?: string[];
};

function repoRoot() {
  const candidates = [path.resolve(process.cwd(), '..'), process.cwd()];
  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, 'public/data/pack.json'))) return candidate;
  }
  throw new Error('Pack JSON is not in this checkout.');
}

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(path.join(repoRoot(), rel), 'utf8')) as T;
}

export function hideNamed(value: string) {
  if (/stolz|andrewcstolz|share\.andrewcstolz/i.test(value)) return 'Named in the source plan. Not shown here.';
  return value;
}

function text(value: unknown) {
  return hideNamed(String(value ?? ''));
}

export function letterTile(name: string) {
  const words = name.replace(/\(.*?\)/g, '').split(/[^A-Za-z0-9]+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() || '').join('') || '?';
}

function packItems() {
  return readJson<{ items: PackItem[]; hero: { core: { lede: string } }; compare: { columns: string[]; rows: string[][]; source: string } }>('public/data/pack.json');
}

function kpi(items: PackItem[], id: string): Kpi {
  const found = items.find((item) => item.id === id);
  return {
    id,
    label: found?.title || id,
    value: found?.value || 'Explicit Unknown',
    note: found?.note || 'Explicit Unknown',
  };
}

export function loadOverview(admin: boolean) {
  const pack = packItems();
  const mix = readJson<{ note: string; bands: { label: string; congregationsPct: number; attendeesPct: number | null; confidence: string; count: string }[]; sources: string[] }>('public/data/attendance-mix.json');
  const cards: OrderCard[] = [
    { n: '1', title: 'In plain terms', body: 'Live Core stays HOLD. The pack is for planning, not a launch approval.', href: '/' },
    { n: '2', title: 'Where we win and lose', body: 'Edge, parity, and gaps. Each row still names what is open.', href: '/intel/competitors' },
    { n: '3', title: 'Competitors', body: 'Six vendors. Logos stay Explicit Unknown until rights are cleared.', href: '/intel/competitors' },
    { n: '4', title: 'Still open', body: 'Nine items. None of them is a green light for live selling.', href: '/execution/implementation' },
    { n: '5', title: 'Council', body: admin ? 'The review record is open to this admin seat.' : 'Admin only. Scores are not on this screen.', href: admin ? '/council' : '/execution/implementation' },
  ];
  return {
    lede: pack.hero.core.lede,
    kpis: [
      kpi(pack.items, 'kpi-verdict-for-live-selling'),
      kpi(pack.items, 'kpi-verdict-for-planning'),
      kpi(pack.items, 'kpi-band-c-churches'),
      kpi(pack.items, 'kpi-buyers-citing-ease'),
    ],
    bands: mix.bands.map((band) => ({
      label: band.label,
      congregationsPct: band.congregationsPct,
      attendeesPct: band.attendeesPct,
      confidence: band.confidence,
      count: band.count,
    })),
    chartNote: mix.note,
    chartSource: mix.sources[0] || 'Pack',
    compare: pack.compare,
    cards,
    source: 'Pack JSON. TAM, SAM, and SOM are Explicit Unknown. Supabase is not connected.',
  };
}

export function loadPlan() {
  const plan = readJson<{
    title: string;
    asOf: string;
    summary: string;
    lines: string[];
    sourceLabel: string;
    data: { counts: { coreAccts: number; plusAccts: number; entAccts: number } };
  }>('public/data/plan-2027.json');
  const residuals = readJson<{ source: string; items: { id: string; plain: string; status: string; owner: string; clears: string }[] }>('public/data/residuals.json');
  const milestones: Milestone[] = [
    ...plan.lines.map((line, index) => ({
      id: `plan-${index + 1}`,
      title: text(line),
      detail: 'Stated in the 2027 plan. Quarter and owner are Explicit Unknown.',
      quarter: null,
      owner: 'Explicit Unknown',
      status: 'In the plan',
      source: plan.sourceLabel,
    })),
    ...residuals.items.map((item) => ({
      id: item.id,
      title: text(item.plain),
      detail: `Clears when: ${text(item.clears)}`,
      quarter: null,
      owner: text(item.owner),
      status: text(item.status),
      source: residuals.source,
    })),
  ];
  return {
    title: plan.title,
    asOf: plan.asOf,
    summary: text(plan.summary),
    counts: plan.data.counts,
    milestones,
    source: `${plan.sourceLabel}. Commercial Plus is on Execution, not on this timeline. Quarters are Explicit Unknown.`,
  };
}

type TerrRaw = {
  t: number;
  states: string;
  region: string;
  grade: string;
  profile: string;
  quota: number;
  mql: number;
  seat: string;
  person: string;
  sd: string;
};

export function loadTerritories() {
  const plan = readJson<{ sourceLabel: string; data: { terr: TerrRaw[]; stTerr: Record<string, { terrs: number[]; primary: number }> } }>('public/data/plan-2027.json');
  const territories: Territory[] = plan.data.terr.map((row) => ({
    id: row.t,
    states: text(row.states),
    region: text(row.region),
    grade: text(row.grade),
    profile: text(row.profile),
    quota: row.quota,
    mql: row.mql,
    seat: text(row.seat),
    person: text(row.person),
    director: text(row.sd),
  }));
  const assignments: Record<string, StateAssignment> = {};
  for (const [abbr, value] of Object.entries(plan.data.stTerr)) {
    assignments[abbr] = { abbr, terrs: value.terrs, primary: value.primary };
  }
  return {
    territories,
    assignments,
    source: `${plan.sourceLabel}. State shapes are US Census boundaries. A split inside a state is Explicit Unknown.`,
  };
}

export function loadCompetitors() {
  const file = readJson<{ source: string; rivals: { name: string; promise: string; pricing: string; strength: string; whyUs: string; dont: string; headlineCount: string; headlineNote: string; sizes: string }[] }>('public/data/competitors.json');
  const pack = packItems();
  const rivals: Rival[] = file.rivals.map((rival) => ({
    name: rival.name,
    initials: letterTile(rival.name),
    promise: text(rival.promise),
    pricing: text(rival.pricing),
    strength: text(rival.strength),
    ready: rival.whyUs && rival.whyUs !== '—' ? text(rival.whyUs) : 'Explicit Unknown',
    dont: text(rival.dont),
    headline: text(rival.headlineCount),
    note: text(rival.headlineNote),
    sizes: text(rival.sizes),
  }));
  const claims: ClaimCard[] = pack.items.filter((item) => item.kind === 'claim' && item.title && item.text).map((item) => ({
    id: item.id || item.title || 'claim',
    title: text(item.title),
    text: text(item.text),
    status: text(item.status || 'Explicit Unknown'),
  }));
  return { rivals, claims, source: `${file.source} Logos are Explicit Unknown letter tiles. No logo file is licensed in this build.` };
}

export function loadSuite() {
  const file = readJson<{ source: string; proof: string; modules: ModuleCompare[] }>('public/data/amplify-compares.json');
  return {
    proof: file.proof,
    source: file.source,
    modules: file.modules.map((mod) => ({
      ...mod,
      decision: text(mod.decision),
      name: text(mod.name),
    })),
  };
}

export function loadEvidence() {
  const file = readJson<{ source: string; items: { file: string; src: string; title: string; decision: string; kind: string; rival: string; captured: string; url: string }[] }>('public/data/evidence-decisions.json');
  const rows: EvidenceRow[] = file.items.map((item) => ({
    id: item.file,
    title: text(item.title),
    decision: text(item.decision),
    rival: item.rival,
    kind: item.kind,
    captured: item.captured,
    src: item.src,
    url: item.url,
  }));
  return { rows, source: file.source };
}

export function loadSeats() {
  const plan = readJson<{ sourceLabel: string; data: { roster: { SeatID: string; Team: string; SD: string; Person: string; Status: string; Territory: string; Grade: string; Quota: number | null; Region: string }[] } }>('public/data/plan-2027.json');
  const rows: SeatRow[] = plan.data.roster.map((row) => ({
    id: text(row.SeatID),
    team: text(row.Team),
    person: text(row.Person),
    director: text(row.SD),
    status: text(row.Status),
    territory: text(row.Territory),
    grade: text(row.Grade),
    quota: typeof row.Quota === 'number' ? row.Quota : null,
    region: text(row.Region),
  }));
  const byStatus = new Map<string, number>();
  const byTeam = new Map<string, number>();
  for (const row of rows) {
    byStatus.set(row.status, (byStatus.get(row.status) || 0) + 1);
    byTeam.set(row.team, (byTeam.get(row.team) || 0) + 1);
  }
  const gaps = rows.filter((row) => row.status === 'Open' || row.status === 'Planned').length;
  return {
    rows,
    total: rows.length,
    gaps,
    byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
    byTeam: [...byTeam.entries()].map(([team, count]) => ({ team, count })),
    source: `${plan.sourceLabel}. Quota is the number in the plan, not a currency we added.`,
  };
}

export function loadPlus() {
  const plan = readJson<{ sourceLabel: string; data: { plus: { name: string; states: string[]; clients: number; amp: number; leg: number; oth: number }[] } }>('public/data/plan-2027.json');
  const rows: PlusRow[] = plan.data.plus.map((row) => ({
    name: text(row.name),
    states: row.states.join(', '),
    clients: row.clients,
    amplify: row.amp,
    legacy: row.leg,
    other: row.oth,
  }));
  const clients = rows.reduce((sum, row) => sum + row.clients, 0);
  return { rows, clients, source: `${plan.sourceLabel}. Moved off the 2027 plan. The source name is Commercial Plus.` };
}

export function loadImplementation() {
  const residuals = readJson<{ source: string; items: { id: string; plain: string; status: string; state: string; owner: string; clears: string }[] }>('public/data/residuals.json');
  const social = readJson<{ note: string; reach: { id: string }[]; posts: { id: string }; quotes: { id: string }[]; also: { id: string }[] }>('public/social/buyers-see-say.json');
  const compares = readJson<{ modules: { name: string; unknown: boolean }[] }>('public/data/amplify-compares.json');
  const keep = [
    ...social.reach.map((row) => row.id),
    social.posts.id,
    ...social.quotes.map((row) => row.id),
    ...social.also.map((row) => row.id),
  ];
  const unknown = compares.modules.filter((mod) => mod.unknown).map((mod) => mod.name);
  const week = [
    text(social.note),
    `KEEP ${keep.join(', ')}. SP13 is dropped.`,
    unknown.length ? `COMP5 Explicit Unknown: ${unknown.join(', ')}.` : '',
  ].filter(Boolean);
  return {
    week,
    rows: residuals.items.filter((item) => item.state !== 'pass').map((item) => ({
      id: item.id,
      plain: text(item.plain),
      status: text(item.status),
      owner: text(item.owner),
      clears: text(item.clears),
    })),
    source: residuals.source,
  };
}

export function loadBuyers() {
  const icp = readJson<{
    source: string;
    coldOpen: string;
    order: string[];
    fees: string;
    jobs: JobRow[];
    refused: string[];
    roles: { role: string; job: string; confidence: string }[];
    maps: { core: { label: string; confidence: string; seats: BuyerSeat[] }; enterprise: { label: string; confidence: string; seats: BuyerSeat[] } };
  }>('public/data/icp-jtbd.json');
  return {
    coldOpen: icp.coldOpen,
    order: icp.order,
    fees: icp.fees,
    jobs: icp.jobs,
    refused: icp.refused,
    roles: icp.roles,
    core: icp.maps.core,
    enterprise: icp.maps.enterprise,
    source: icp.source,
  };
}

function packChunks(): AskChunk[] {
  const pack = packItems();
  const chunks: AskChunk[] = [];
  for (const item of pack.items) {
    if (!item.id || !item.text) continue;
    if (item.kind !== 'claim' && item.kind !== 'kpi' && item.kind !== 'open' && item.kind !== 'competitor') continue;
    chunks.push({
      id: item.id,
      title: text(item.title || item.id),
      content: text(item.text).slice(0, 500),
      source: text(item.sources?.[0] || 'Pack'),
      paths: item.paths?.length ? item.paths : ['core', 'enterprise'],
    });
  }
  return chunks;
}

export async function loadAskChunks() {
  const db = supabaseAdmin();
  if (db) {
    const { data, error } = await db.from('document_chunks').select('id,document_name,content,source_url').limit(500);
    if (!error && Array.isArray(data) && data.length > 0) {
      const chunks: AskChunk[] = [];
      for (const row of data) {
        if (!row || typeof row !== 'object') continue;
        const record = row as Record<string, unknown>;
        if (typeof record.id !== 'string' || typeof record.content !== 'string') continue;
        chunks.push({
          id: record.id,
          title: typeof record.document_name === 'string' ? record.document_name : record.id,
          content: record.content.slice(0, 500),
          source: typeof record.source_url === 'string' ? record.source_url : 'Supabase document_chunks',
          paths: ['core', 'enterprise'],
        });
      }
      if (chunks.length) return { chunks, source: 'Supabase document_chunks. Cosine is on the text.' };
    }
  }
  return {
    chunks: packChunks(),
    source: 'Pack text. Cosine similarity. Not found below 0.72. Supabase is not connected.',
  };
}

export function loadCouncilHtml() {
  return readJson<{ html: string }>('server/council-admin.json').html;
}
