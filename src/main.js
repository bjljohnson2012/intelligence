import Chart from 'chart.js/auto';
import { SEARCH_DEBOUNCE_MS, debounce, indexFromPack, searchPack } from './search.js';

const TYPE = {
  kpi: 'KPI',
  chart: 'Chart',
  claim: 'Claim',
  'table-row': 'Table',
  open: 'Still open',
  competitor: 'Competitor',
  evidence: 'Evidence',
  play: 'Play',
  note: 'Note',
  panel: 'Section',
  section: 'Section',
};

const STATUS = {
  fail: 'Not built',
  partial: 'Partly there',
  unknown: 'Explicit Unknown',
  open: 'Still open',
  hold: 'HOLD',
  pass: 'Pass, still open',
};

const state = { path: 'core', section: 'start', item: '' };
let pack = null;
let byId = new Map();
let searchIndex = [];
let palIndex = 0;
let built = false;
const charts = {};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function token(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function readUrl() {
  const params = new URLSearchParams(location.search);
  const path = ['core', 'enterprise', 'all'].includes(params.get('path')) ? params.get('path') : 'core';
  const section = params.get('section') || 'start';
  const item = params.get('item') || '';
  return { path, section, item };
}

function urlFor(next) {
  const params = new URLSearchParams();
  params.set('path', next.path);
  if (next.section && next.section !== 'start') params.set('section', next.section);
  if (next.item) params.set('item', next.item);
  return `/?${params.toString()}`;
}

function writeUrl(mode) {
  const url = urlFor(state);
  const current = `${location.pathname}${location.search}`;
  if (current === url) {
    history.replaceState(state, '', url);
    return;
  }
  if (mode === 'push') history.pushState({ ...state }, '', url);
  else history.replaceState({ ...state }, '', url);
}

function pathName(paths) {
  const set = new Set(paths || []);
  if (set.has('core') && set.has('enterprise')) return 'Both paths';
  if (set.has('enterprise')) return 'Enterprise';
  if (set.has('core')) return 'Core';
  return 'Both paths';
}

function onPath(item) {
  if (!item) return false;
  return state.path === 'all' || (item.paths || []).includes(state.path);
}

function applyPath() {
  document.body.dataset.path = state.path;
  document.querySelectorAll('[data-paths]').forEach((el) => {
    if (el.closest('[data-legacy]')) return;
    const paths = el.dataset.paths.split(/\s+/).filter(Boolean);
    const show = state.path === 'all' || paths.includes(state.path);
    el.hidden = !show;
    const host = el.tagName === 'TR' ? el.cells[0] : el;
    if (!host) return;
    let tag = host.querySelector(':scope > .pathtag');
    if (state.path === 'all' && show && el.dataset.kind !== 'panel') {
      if (!tag) {
        tag = document.createElement('span');
        tag.className = 'pathtag';
        host.prepend(tag);
      }
      tag.textContent = pathName(paths);
    } else if (tag) tag.remove();
  });
  document.querySelectorAll('.panel').forEach((panel) => {
    if (panel.closest('[data-legacy]') || panel.hidden) return;
    const kids = [...panel.querySelectorAll('[data-paths]')].filter((el) => el !== panel && el.dataset.kind !== 'panel' && !el.closest('[data-legacy]'));
    if (!kids.length) return;
    panel.hidden = !kids.some((el) => !el.hidden);
  });
  document.querySelectorAll('.cgrid, .ggrid, .wlgrid').forEach((grid) => {
    const cards = [...grid.children].filter((el) => el.matches('[data-paths]'));
    let empty = grid.nextElementSibling?.classList?.contains('empty-path') ? grid.nextElementSibling : null;
    if (!empty) {
      empty = document.createElement('p');
      empty.className = 'empty-path note';
      empty.textContent = 'Nothing in this set is on the path you are viewing.';
      grid.after(empty);
    }
    empty.hidden = !cards.length || cards.some((el) => !el.hidden);
  });
}

function renderHero() {
  const hero = pack.hero[state.path];
  const root = document.getElementById('hero');
  const kpis = hero.kpiIds.map((id) => byId.get(id)).filter(Boolean);
  const compare = state.path === 'all' ? renderCompare() : '';
  root.innerHTML = `<section class="pathbanner" aria-live="polite"><div><p class="eyebrow">${esc(pathName(state.path === 'all' ? ['core', 'enterprise'] : [state.path]))}</p><h2>${esc(hero.title)}</h2><p>${esc(hero.lede)}</p><p class="note">Live Core stays HOLD. This site is planning only.</p></div><code class="urlchip">?path=${esc(state.path)}</code></section><div class="kpis">${kpis.map(kpiButton).join('')}</div>${compare}`;
}

function kpiButton(item) {
  const value = item.status === 'unknown' || /explicit unknown/i.test(item.value)
    ? `<span class="badge b-unk">Explicit Unknown</span>`
    : item.status === 'hold' || item.value === 'HOLD'
      ? `<span class="badge b-hold">HOLD</span>`
      : esc(item.value);
  return `<button type="button" class="kpi" data-item="${esc(item.id)}" data-kind="kpi" data-paths="${esc(item.paths.join(' '))}"><span class="pathtag">${esc(pathName(item.paths))}</span><div class="l">${esc(item.title)}</div><div class="v">${value}</div><div class="s">${esc(item.note)}</div></button>`;
}

function renderCompare() {
  const columns = pack.compare.columns;
  const bands = ['C 250', 'B 1,000', 'A 2,000'];
  const body = pack.compare.rows.map((row) => {
    const cells = row.slice(1).map((cell, index) => {
      const source = pack.items.find((item) => item.kind === 'table-row' && item.text.includes(bands[index]));
      const id = source ? source.id : '';
      return `<td><button type="button" class="cellbtn" data-item="${esc(id)}">${esc(cell)}</button></td>`;
    }).join('');
    return `<tr><th>${esc(row[0])}</th>${cells}</tr>`;
  }).join('');
  const head = columns.map((col) => `<th>${esc(col)}</th>`).join('');
  return `<div class="panel compare"><div class="exhibit">Side by side</div><h3>${esc(pack.compare.title)}</h3><p class="note">${esc(pack.compare.source)}</p><div class="tw"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></div>`;
}

function renderNav() {
  const nav = document.getElementById('nav');
  const buttons = [];
  pack.sections.forEach((section) => {
    buttons.push({ id: section.id, label: section.label, anchor: '' });
    if (section.id === 'comp') buttons.push({ id: 'comp', label: 'Evidence', anchor: 'evidence' });
    if (section.id === 'self') buttons.push({ id: 'self', label: 'Value', anchor: 'ex17' });
  });
  nav.innerHTML = buttons.map((button) => `<button type="button" role="tab" data-section="${esc(button.id)}" data-anchor="${esc(button.anchor)}" aria-selected="false">${esc(button.label)}</button>`).join('');
}

function renderSections() {
  const root = document.getElementById('sections');
  root.innerHTML = pack.sections.map((section) => `<section class="tab" id="t-${esc(section.id)}" data-screen="${esc(section.id)}" hidden>${section.html}</section>`).join('');
  const ask = document.querySelector('[data-screen="ask"]');
  if (ask) {
    const lead = ask.querySelector('.lead')?.textContent || 'Answers come only from this plan.';
    ask.innerHTML = `<h2>Ask the plan</h2><p class="lead">${esc(lead)}</p><div class="panel askpanel"><p class="railtype">Asking about: <b id="askPathLabel"></b></p><div class="chips" id="askChips"></div><form id="askForm"><textarea id="askIn" rows="3" placeholder="Ask a question about this plan" aria-label="Ask a question about this plan"></textarea><button type="submit">Ask</button></form><div id="askState" class="askstate" hidden></div><div id="askOut" class="askout"></div></div>`;
  }
  document.getElementById('mixChart')?.closest('.chartbox')?.setAttribute('data-item', 'chart-attendance');
  document.getElementById('valChart')?.closest('.chartbox')?.setAttribute('data-item', 'chart-values');
  document.getElementById('resChart')?.closest('.chartbox')?.setAttribute('data-item', 'chart-open');
}

function showSection() {
  const known = new Set(pack.sections.map((section) => section.id));
  if (!known.has(state.section)) state.section = 'start';
  document.querySelectorAll('section.tab').forEach((section) => {
    section.hidden = section.dataset.screen !== state.section;
  });
  document.querySelectorAll('#nav [data-section]').forEach((button) => {
    const same = button.dataset.section === state.section && !button.dataset.anchor;
    button.setAttribute('aria-selected', same ? 'true' : 'false');
  });
  document.querySelectorAll('.pathswitch button').forEach((button) => {
    button.setAttribute('aria-pressed', button.dataset.path === state.path ? 'true' : 'false');
  });
  const label = document.getElementById('askPathLabel');
  if (label) label.textContent = pack.paths[state.path].label;
  const chips = document.getElementById('askChips');
  if (chips) {
    chips.innerHTML = (pack.askPrompts[state.path] || []).map((prompt) => `<button type="button" data-ask="${esc(prompt)}">${esc(prompt)}</button>`).join('');
  }
  requestAnimationFrame(() => Object.values(charts).forEach((chart) => chart.resize()));
}

function fillRail(id) {
  const item = byId.get(id);
  const rail = document.getElementById('rail');
  if (!item) {
    rail.hidden = true;
    document.body.classList.remove('rail-open');
    return;
  }
  const section = pack.sections.find((entry) => entry.id === item.section);
  document.getElementById('rail-crumb').textContent = section ? section.label : 'Plan';
  document.getElementById('rail-type').textContent = `${TYPE[item.kind] || 'Detail'} · ${pathName(item.paths)}`;
  document.getElementById('rail-title').textContent = item.title;
  const status = STATUS[item.status] || '';
  const blocked = ['fail', 'partial', 'unknown', 'open', 'hold'].includes(item.status);
  const shot = document.querySelector(`[data-item="${CSS.escape(id)}"] img`);
  const sources = chartSources(item);
  document.getElementById('rail-body').innerHTML = `
    ${item.value ? `<p class="railvalue">${esc(item.value)}</p>` : ''}
    ${item.note ? `<p>${esc(item.note)}</p>` : ''}
    <p>${esc(item.text)}</p>
    ${shot ? `<img class="railshot" src="${esc(shot.getAttribute('src'))}" alt="${esc(shot.alt)}">` : ''}
    <h3>Status</h3>
    <p>${status ? esc(status) : 'Shown as the pack states it.'}${blocked ? ' Not proven.' : ''}</p>
    ${item.confidence ? `<h3>Confidence</h3><p>${esc(item.confidence)}</p>` : ''}
    <h3>Sources</h3>
    <ul class="raillist">${(item.sources.length ? item.sources : sources).map((source) => `<li>${sourceLink(source)}</li>`).join('') || '<li>2026 Market Intelligence pack</li>'}</ul>
    <h3>Related</h3>
    <div class="raillinks">${item.related.map((related) => byId.get(related)).filter(Boolean).map((related) => `<button type="button" data-item="${esc(related.id)}">${esc(related.badge || TYPE[related.kind])} · ${esc(related.title)}</button>`).join('') || '<p class="note">No related item is named in this text.</p>'}</div>`;
  rail.hidden = false;
  document.body.classList.add('rail-open');
}

function chartSources(item) {
  if (item.id === 'chart-attendance') return pack.charts.attendance.sources || [];
  if (item.id === 'chart-values') return [pack.charts.values.source];
  return [];
}

function sourceLink(source) {
  const text = String(source);
  if (/^https?:\/\//.test(text)) return `<a href="${esc(text)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`;
  return esc(text);
}

function closeRail() {
  document.getElementById('rail').hidden = true;
  document.body.classList.remove('rail-open');
}

function paletteHits() {
  const query = document.getElementById('q')?.value.trim() || '';
  return searchPack(searchIndex, query, state.path, 20);
}

function renderPalette() {
  const hits = paletteHits();
  const list = document.getElementById('palList');
  if (!hits.length) {
    list.innerHTML = '<p class="palempty">No matches in the plan.</p>';
    palIndex = 0;
    return;
  }
  palIndex = Math.min(palIndex, hits.length - 1);
  let group = '';
  list.innerHTML = hits.map((hit, index) => {
    const head = hit.group !== group ? `<div class="palgroup">${esc(hit.group)}</div>` : '';
    group = hit.group;
    const badge = hit.badge ? `<span class="badge b-unk">${esc(hit.badge)}</span>` : '';
    return `${head}<button type="button" class="palhit${index === palIndex ? ' on' : ''}" data-i="${index}"><span class="palmain"><b>${esc(hit.label)}</b><small>${esc(hit.snippet || '')}</small></span><span class="pathtag">${esc(hit.pathLabel)}</span>${badge}</button>`;
  }).join('');
}

function openPalette() {
  const palette = document.getElementById('palette');
  if (!palette.open) palette.showModal();
  const input = document.getElementById('q');
  input.focus();
  input.select();
  palIndex = 0;
  renderPalette();
}

function closePalette() {
  const palette = document.getElementById('palette');
  document.getElementById('palList').replaceChildren();
  document.getElementById('q').value = '';
  if (palette.open) palette.close();
}

function go(next, mode) {
  if (next.path) state.path = next.path;
  if (next.section) state.section = next.section;
  if ('item' in next) state.item = next.item;
  if (state.item && state.path !== 'all') {
    const item = byId.get(state.item);
    if (item && !item.paths.includes(state.path)) state.item = '';
  }
  applyPath();
  filterGallery();
  renderHero();
  showSection();
  updateCharts();
  if (state.item) fillRail(state.item);
  else closeRail();
  writeUrl(mode);
  if (next.anchor) document.getElementById(next.anchor)?.scrollIntoView({ block: 'start' });
}

function openHit(hit) {
  closePalette();
  if (!hit.itemId || hit.kind === 'section' || !byId.has(hit.itemId)) {
    go({ section: hit.go, item: '', anchor: hit.anchor }, 'push');
    return;
  }
  const item = byId.get(hit.itemId);
  const path = state.path !== 'all' && !item.paths.includes(state.path) ? item.paths[0] : state.path;
  go({ path, section: item.section || hit.go, item: item.id, anchor: hit.anchor }, 'push');
}

function bandData(pathName) {
  const labels = pack.charts.attendance.paths[pathName];
  return pack.charts.attendance.bands.filter((band) => labels.includes(band.label));
}

function updateCharts() {
  Chart.defaults.font.family = token('--f-body', 'Red Hat Text, Helvetica Neue, Arial, sans-serif');
  Chart.defaults.color = token('--ink', '#504A43');
  const head = token('--head', '#0F3E80');
  const accent = token('--accent', '#0A5BCC');
  const lb = token('--lb', '#B2E1F6');
  const orange = token('--orange', '#FF6200');
  const bands = bandData(state.path);
  const mix = document.getElementById('mixChart');
  const mixNote = document.getElementById('mixnote');
  if (mixNote) mixNote.textContent = pack.charts.attendance.note;
  if (mix) {
    const data = {
      labels: bands.map((band) => band.label),
      datasets: [
        { label: 'Congregations %', data: bands.map((band) => band.congregationsPct), backgroundColor: accent, borderRadius: 4 },
        { label: 'Attendees %', data: bands.map((band) => band.attendeesPct), backgroundColor: lb, borderRadius: 4 },
      ],
    };
    if (!charts.mix) {
      charts.mix = new Chart(mix, {
        type: 'bar',
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { tooltip: { callbacks: { label: (ctx) => tip(ctx, bands) } } },
          scales: { x: { ticks: { callback: (value) => `${value}%` } } },
        },
      });
    } else {
      charts.mix.data = data;
      charts.mix.update();
    }
  }
  const values = document.getElementById('valChart');
  const box = values?.closest('.chartbox');
  let unknown = document.getElementById('valUnknown');
  if (box && !unknown) {
    unknown = document.createElement('p');
    unknown.id = 'valUnknown';
    unknown.className = 'note';
    box.after(unknown);
  }
  const hideValues = state.path === 'enterprise';
  if (values) values.closest('.chartbox').hidden = hideValues;
  if (unknown) {
    unknown.hidden = !hideValues;
    unknown.textContent = pack.charts.values.enterpriseUnknown;
  }
  if (values && !hideValues) {
    const rows = pack.charts.values.items;
    const data = {
      labels: rows.map((row) => row[0]),
      datasets: [{ data: rows.map((row) => row[1]), backgroundColor: rows.map((row) => (row[1] ? accent : orange)), borderRadius: 4 }],
    };
    if (!charts.values) {
      charts.values = new Chart(values, {
        type: 'bar',
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: { x: { max: 100, ticks: { callback: (value) => `${value}%` } } },
        },
      });
    } else {
      charts.values.data = data;
      charts.values.update();
    }
  }
  const opens = pack.items.filter((item) => item.kind === 'open' && (state.path === 'all' || item.paths.includes(state.path)));
  const counts = {};
  opens.forEach((item) => { counts[item.status || 'open'] = (counts[item.status || 'open'] || 0) + 1; });
  const res = document.getElementById('resChart');
  if (res) {
    const keys = Object.keys(counts);
    const data = {
      labels: keys.map((key) => STATUS[key] || key),
      datasets: [{ data: keys.map((key) => counts[key]), backgroundColor: keys.map((key) => ({ fail: '#000', partial: lb, unknown: '#706B65', open: orange, hold: orange, pass: head }[key] || head)) }],
    };
    if (!charts.open) {
      charts.open = new Chart(res, { type: 'doughnut', data, options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom' } } } });
    } else {
      charts.open.data = data;
      charts.open.update();
    }
  }
}

function tip(ctx, bands) {
  const band = bands[ctx.dataIndex];
  if (!band) return '';
  if (ctx.datasetIndex === 1 && (band.attendeesPct === null || band.attendeesPct === undefined)) {
    return `${band.label}: attendees ${band.attendeesRange || 'Explicit Unknown'}`;
  }
  const range = ctx.datasetIndex === 0 ? band.congregationsRange : band.attendeesRange;
  const suffix = range ? ` (published range ${range})` : '';
  return `${ctx.dataset.label}: ${ctx.parsed.x}%${suffix}`;
}

function askNode(className, text) {
  const node = document.createElement('div');
  node.className = className;
  node.textContent = text;
  return node;
}

async function ask(question) {
  const out = document.getElementById('askOut');
  const form = document.getElementById('askState');
  out.prepend(askNode('q', question));
  form.hidden = false;
  form.className = 'askstate loading';
  form.textContent = 'Reading the plan…';
  try {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, pathHint: state.path === 'all' ? 'either' : state.path }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      form.className = 'askstate error';
      form.innerHTML = `<p>Couldn't answer — try again.</p><button type="button" id="askRetry">Retry</button>`;
      document.getElementById('askRetry').onclick = () => ask(question);
      return;
    }
    form.hidden = true;
    const block = document.createElement('div');
    block.className = data.status === 'answered' ? 'a' : 'a unknown';
    const cites = (data.citations || []).map((cite, index) => `<button type="button" data-item="${esc(cite.itemId || '')}" data-section="${esc((cite.href || '').split('section=')[1]?.split('&')[0] || '')}">${index + 1}. ${esc(cite.label || cite.id)}</button>`).join(' ');
    block.innerHTML = `<p>${esc(data.answer || data.unknownReason || 'The plan does not say.')}</p><p class="note">${esc(data.status === 'explicit_unknown' ? 'Explicit Unknown' : data.status === 'refused' ? 'Not a launch clearance' : 'From the plan')}</p><div class="raillinks">${cites}</div>`;
    out.insertBefore(block, out.children[1] || null);
  } catch {
    form.className = 'askstate error';
    form.innerHTML = `<p>Couldn't answer — try again.</p><button type="button" id="askRetry">Retry</button>`;
    document.getElementById('askRetry').onclick = () => ask(question);
  }
}

function bootError() {
  const boot = document.getElementById('boot');
  boot.hidden = false;
  boot.innerHTML = 'The plan could not be loaded. <button type="button" id="bootRetry">Retry</button>';
  document.getElementById('bootRetry').onclick = () => { boot.textContent = 'Reading the plan…'; start(); };
}

async function start() {
  const boot = document.getElementById('boot');
  try {
    const response = await fetch('/data/pack.json');
    if (!response.ok) throw new Error('pack');
    pack = await response.json();
  } catch {
    bootError();
    return;
  }
  byId = new Map(pack.items.map((item) => [item.id, item]));
  searchIndex = indexFromPack(pack);
  boot.hidden = true;
  renderNav();
  renderSections();
  built = true;
  const initial = readUrl();
  state.path = initial.path;
  state.section = initial.section;
  state.item = initial.item;
  go({}, 'replace');
}

const queueSearch = debounce(() => { palIndex = 0; renderPalette(); }, SEARCH_DEBOUNCE_MS);

document.getElementById('openSearch').addEventListener('click', openPalette);
document.getElementById('q').addEventListener('input', queueSearch);
document.getElementById('q').addEventListener('keydown', (event) => {
  const hits = paletteHits();
  if (event.key === 'ArrowDown') { event.preventDefault(); palIndex = Math.min(palIndex + 1, Math.max(hits.length - 1, 0)); renderPalette(); }
  if (event.key === 'ArrowUp') { event.preventDefault(); palIndex = Math.max(palIndex - 1, 0); renderPalette(); }
  if (event.key === 'Enter') { event.preventDefault(); if (hits[palIndex]) openHit(hits[palIndex]); }
});
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openPalette(); }
  if (event.key === 'Escape') {
    if (document.getElementById('palette').open) closePalette();
    else if (state.item) go({ item: '' }, 'push');
  }
});
document.getElementById('palette').addEventListener('click', (event) => {
  const hit = event.target.closest('.palhit');
  if (hit) openHit(paletteHits()[Number(hit.dataset.i)]);
  else if (event.target.id === 'palette') closePalette();
});
document.getElementById('signout').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  location.href = '/login';
});
document.getElementById('rail-close').addEventListener('click', () => go({ item: '' }, 'push'));
document.getElementById('rail-crumb').addEventListener('click', () => {
  const item = byId.get(state.item);
  go({ section: item?.section || state.section, item: '' }, 'push');
});
document.addEventListener('click', (event) => {
  const path = event.target.closest('.pathswitch [data-path]');
  const section = event.target.closest('#nav [data-section]');
  const item = event.target.closest('[data-item]');
  const askPrompt = event.target.closest('[data-ask]');
  const rival = event.target.closest('#rivalFil button');
  const kind = event.target.closest('#kindFil button');
  const shot = event.target.closest('#evidence .gitem');
  const jump = event.target.closest('[data-go]');
  if (path) { go({ path: path.dataset.path, item: '' }, 'push'); return; }
  if (section) { go({ section: section.dataset.section, item: '', anchor: section.dataset.anchor }, 'push'); return; }
  if (jump?.dataset.go) {
    go({ section: jump.dataset.go, item: '' }, 'push');
    document.getElementById(`t-${jump.dataset.go}`)?.scrollIntoView({ block: 'start' });
    return;
  }
  if (rival) {
    document.querySelectorAll('#rivalFil button').forEach((button) => button.setAttribute('aria-pressed', button === rival ? 'true' : 'false'));
    filterGallery();
    return;
  }
  if (kind) {
    document.querySelectorAll('#kindFil button').forEach((button) => button.setAttribute('aria-pressed', button === kind ? 'true' : 'false'));
    filterGallery();
    return;
  }
  if (askPrompt) { ask(askPrompt.dataset.ask); return; }
  if (item?.dataset.item && !event.target.closest('#palette')) {
    if (shot && event.target.closest('img')) openShot(shot);
    go({ item: item.dataset.item, section: byId.get(item.dataset.item)?.section || state.section }, 'push');
  }
});
document.getElementById('stage').addEventListener('submit', (event) => {
  if (event.target.id !== 'askForm') return;
  event.preventDefault();
  const input = document.getElementById('askIn');
  const question = input.value.trim();
  if (!question) return;
  input.value = '';
  ask(question);
});
window.addEventListener('popstate', () => {
  const next = readUrl();
  state.path = next.path;
  state.section = next.section;
  state.item = next.item;
  if (!built) return;
  applyPath();
  filterGallery();
  renderHero();
  showSection();
  updateCharts();
  if (state.item) fillRail(state.item);
  else closeRail();
});

function filterGallery() {
  const rival = document.querySelector('#rivalFil button[aria-pressed="true"]')?.dataset.rival || 'all';
  const kind = document.querySelector('#kindFil button[aria-pressed="true"]')?.dataset.kind || 'all';
  document.querySelectorAll('#evidence .gitem').forEach((item) => {
    const paths = (item.dataset.paths || '').split(/\s+/);
    const pathOk = state.path === 'all' || paths.includes(state.path);
    const match = (rival === 'all' || item.dataset.rival === rival) && (kind === 'all' || item.dataset.kind === kind);
    item.hidden = !(pathOk && match);
  });
}

function openShot(item) {
  const img = item.querySelector('img');
  if (!img) return;
  document.getElementById('lbImg').src = img.src;
  document.getElementById('lbImg').alt = img.alt;
  document.getElementById('lbCap').textContent = item.dataset.caption || img.alt;
  document.getElementById('lbMeta').textContent = item.dataset.meta || '';
  document.getElementById('lightbox').showModal();
}

document.body.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  if (target.tagName === 'DIALOG') target.close();
  if (target.closest('[data-close], dialog .x')) target.closest('dialog')?.close();
});

const kbd = document.getElementById('kbd');
if (kbd && !/Mac|iPhone|iPad/.test(navigator.platform || '')) kbd.textContent = 'Ctrl K';

start();
