import Chart from 'chart.js/auto';
import { paths } from './content.js';

const screens = {
  plain: ['t-start', 't-plain'],
  win: ['t-win'],
  tam: ['t-tam'],
  icp: ['t-icp'],
  comp: ['t-comp'],
  self: ['t-self'],
  value: ['t-self'],
  resid: ['t-resid'],
  council: ['t-council'],
  bets: ['t-bets'],
  ask: ['t-ask'],
};

const css = getComputedStyle(document.documentElement);
const token = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
const HEAD = token('--head', '#0F3E80');
const ACCENT = token('--accent', token('--teal', '#0A5BCC'));
const LB = token('--lb', '#B2E1F6');
const ORANGE = token('--orange', '#FF6200');
const INK = token('--ink', '#504A43');
const MUTED = token('--muted', '#706B65');
const FONT = token('--f-body', 'Red Hat Text, Helvetica Neue, Arial, sans-serif');

let askPath = 'core';
let palItems = [];
let palIndex = 0;
let glossary = {};

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function show(name, anchor) {
  const key = screens[name] ? name : 'plain';
  const ids = new Set(screens[key]);
  document.querySelectorAll('section.tab').forEach((section) => {
    section.hidden = !ids.has(section.id);
  });
  const want = anchor || '';
  document.querySelectorAll('nav [data-t]').forEach((button) => {
    const same = button.dataset.t === key && (button.dataset.anchor || '') === want;
    button.setAttribute('aria-selected', same ? 'true' : 'false');
  });
  const target = anchor ? document.getElementById(anchor) : null;
  if (target) target.scrollIntoView({ block: 'start' });
  else window.scrollTo(0, 0);
  history.replaceState(null, '', `#${key}${anchor ? `-${anchor}` : ''}`);
}

function list(items) {
  return `<ul class="steps">${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

function paintPath() {
  const key = document.body.dataset.path === 'enterprise' ? 'large' : 'mid';
  const plan = paths[key];
  const tabs = plan.tabs;
  const win = tabs['Win / lose'];
  const who = document.getElementById('path-icp');
  const lose = document.getElementById('path-win');
  const home = document.getElementById('path-plain');
  const moves = document.getElementById('path-plan');
  if (home) {
    home.innerHTML = `<div class="panel exec"><div class="exhibit">${esc(plan.tag)}</div><h3>${esc(plan.title)}</h3><p>${esc(plan.answer)}</p><div class="kpis">${plan.facts.map(([n, l]) => `<div class="kpi"><div class="l">${esc(l)}</div><div class="v">${esc(n)}</div></div>`).join('')}</div></div>`;
  }
  if (lose && win) {
    lose.innerHTML = `<div class="grid2"><div class="panel"><h3>Where we win</h3>${list(win.win)}</div><div class="panel"><h3>Where we lose today</h3>${list(win.lose)}</div></div>`;
  }
  if (who) who.innerHTML = `<div class="panel"><div class="exhibit">This path</div><h3>Who we sell</h3>${list(tabs['Who we sell'])}</div>`;
  if (moves) {
    moves.innerHTML = ['How we attack', 'Proof', 'Open items', 'Next moves'].map((name) => `<div class="panel"><h3>${esc(name)}</h3>${list(tabs[name])}</div>`).join('');
  }
  document.querySelectorAll('.pathcard').forEach((card) => {
    card.classList.toggle('on', card.dataset.setpath === document.body.dataset.path);
  });
  document.querySelectorAll('.pathswitch button').forEach((button) => {
    button.setAttribute('aria-pressed', button.dataset.path === document.body.dataset.path ? 'true' : 'false');
  });
}

function setPath(path) {
  document.body.dataset.path = path === 'enterprise' ? 'enterprise' : 'core';
  askPath = document.body.dataset.path === 'enterprise' ? 'enterprise' : 'core';
  document.querySelectorAll('#askPath button').forEach((button) => {
    button.classList.toggle('on', button.dataset.askpath === askPath);
  });
  paintPath();
}

function sectionItems() {
  return [
    ['In plain terms', 'plain'],
    ['Where we win', 'win'],
    ['Market', 'tam'],
    ['ICP', 'icp'],
    ['Competitors', 'comp'],
    ['Screenshot gallery', 'comp', 'evidence'],
    ['MB self', 'self'],
    ['Value', 'value', 'ex17'],
    ['Residuals', 'resid'],
    ['Council', 'council'],
    ['Plan', 'bets'],
    ['Thing to plan for', 'bets'],
    ['Thing to think about', 'bets'],
    ['Ask the plan', 'ask'],
  ].map(([label, go, anchor]) => ({ group: 'Sections', label, go, anchor: anchor || '', text: label }));
}

function planItems() {
  return ['V1 Safe migration', 'V2 Trust during the switch', 'V3 One money truth', 'V4 No death-march rip', 'V5 Fund accounting', 'V6 Honest total cost'].map((label) => ({
    group: 'Plan bets', label, go: 'bets', anchor: '', text: label,
  }));
}

async function loadSearch() {
  palItems = [...sectionItems(), ...planItems()];
  try {
    const [residuals, rivals] = await Promise.all([
      fetch('/data/residuals.json').then((r) => r.json()),
      fetch('/data/competitors.json').then((r) => r.json()),
    ]);
    palItems.push(...residuals.items.map((item) => ({
      group: 'Residuals', label: item.plain, badge: item.id, go: 'resid', anchor: '', text: `${item.id} ${item.plain} ${item.status}`,
    })));
    palItems.push(...rivals.rivals.map((rival) => ({
      group: 'Competitors', label: rival.name, go: 'comp', anchor: 'evidence', text: `${rival.name} ${rival.promise}`,
    })));
  } catch { /* sections still search */ }
  try { glossary = await fetch('/data/glossary.json').then((r) => r.json()); } catch { glossary = {}; }
}

function filteredPalette(query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return palItems.slice(0, 12);
  return palItems.filter((item) => words.every((word) => (`${item.label} ${item.text} ${item.badge || ''}`).toLowerCase().includes(word))).slice(0, 20);
}

function renderPalette() {
  const hits = filteredPalette(document.getElementById('q').value.trim());
  const listEl = document.getElementById('palList');
  if (!hits.length) {
    listEl.innerHTML = '<p class="palempty">No matches in the plan.</p>';
    palIndex = 0;
    return;
  }
  palIndex = Math.min(palIndex, hits.length - 1);
  let group = '';
  listEl.innerHTML = hits.map((hit, index) => {
    const head = hit.group !== group ? `<div class="palgroup">${esc(hit.group)}</div>` : '';
    group = hit.group;
    const badge = hit.badge ? `<span class="badge b-unk">${esc(hit.badge)}</span>` : '';
    return `${head}<button type="button" class="palhit${index === palIndex ? ' on' : ''}" data-i="${index}"><span>${esc(hit.label)}</span>${badge}<span class="pg">${esc(hit.group)}</span></button>`;
  }).join('');
  listEl.querySelectorAll('.palhit').forEach((button) => {
    button.onclick = () => openHit(hits[Number(button.dataset.i)]);
  });
}

function openHit(hit) {
  document.getElementById('palette').close();
  show(hit.go, hit.anchor);
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

function applyGallery() {
  const rival = document.querySelector('#rivalFil button[aria-pressed="true"]')?.dataset.rival || 'all';
  const kind = document.querySelector('#kindFil button[aria-pressed="true"]')?.dataset.kind || 'all';
  let shown = 0;
  document.querySelectorAll('#evidence .gitem').forEach((item) => {
    const ok = (rival === 'all' || item.dataset.rival === rival) && (kind === 'all' || item.dataset.kind === kind);
    item.hidden = !ok;
    if (ok) shown += 1;
  });
  const count = document.getElementById('gcount');
  if (count) count.textContent = `${shown} screenshots`;
}

function openLightbox(item) {
  const img = item.querySelector('img');
  document.getElementById('lbImg').src = img.src;
  document.getElementById('lbImg').alt = img.alt;
  document.getElementById('lbCap').textContent = item.dataset.caption || img.alt;
  document.getElementById('lbMeta').textContent = item.dataset.meta || '';
  document.getElementById('lightbox').showModal();
}

function bootCharts() {
  Chart.defaults.font.family = FONT;
  Chart.defaults.color = INK;
  const common = { responsive: true, maintainAspectRatio: false };
  fetch('/data/attendance-mix.json').then((r) => r.json()).then((data) => {
    const note = document.getElementById('mixnote');
    const refresh = document.getElementById('mixrefresh');
    if (note) note.textContent = data.note;
    if (refresh) refresh.textContent = `Data refresh: ${data.refresh}`;
    const canvas = document.getElementById('mixChart');
    if (!canvas) return;
    const mk = (field) => ({
      labels: data.bands.map((band) => band.label),
      datasets: [{ data: data.bands.map((band) => band[field]), backgroundColor: [LB, ACCENT, HEAD, ORANGE], borderRadius: 4 }],
    });
    const chart = new Chart(canvas, {
      type: 'bar',
      data: mk('congregationsPct'),
      options: {
        ...common,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { callback: (value) => `${value}%` } } },
      },
    });
    document.querySelectorAll('#mixToggle button').forEach((button) => {
      button.onclick = () => {
        chart.data = mk(button.dataset.mix);
        chart.update();
        document.querySelectorAll('#mixToggle button').forEach((other) => other.classList.toggle('on', other === button));
      };
    });
  });
  fetch('/data/buyer-values.json').then((r) => r.json()).then((data) => {
    const refresh = document.getElementById('valrefresh');
    if (refresh) refresh.textContent = `Data refresh: ${data.refresh} Source: ${data.source}`;
    const canvas = document.getElementById('valChart');
    if (!canvas) return;
    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.items.map((item) => item[0]),
        datasets: [{ data: data.items.map((item) => item[1]), backgroundColor: data.items.map((item) => (item[1] ? ACCENT : ORANGE)), borderRadius: 4 }],
      },
      options: { ...common, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { max: 100, ticks: { callback: (value) => `${value}%` } } } },
    });
  });
  fetch('/data/residuals.json').then((r) => r.json()).then((data) => {
    const refresh = document.getElementById('resrefresh');
    if (refresh) refresh.textContent = `Data refresh: ${data.refresh}`;
    const chips = document.getElementById('resChips');
    if (chips) {
      chips.innerHTML = data.items.map((item) => `<button type="button" data-go="resid">${esc(item.id)}</button>`).join('');
    }
    const canvas = document.getElementById('resChart');
    if (!canvas) return;
    const labels = { fail: 'Not built', partial: 'Partly there', unknown: 'Unknown', open: 'Waiting on a decision' };
    const colors = { fail: '#000000', partial: LB, unknown: MUTED, open: ORANGE };
    const counts = {};
    data.items.forEach((item) => { counts[item.state] = (counts[item.state] || 0) + 1; });
    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: Object.keys(counts).map((key) => labels[key] || key),
        datasets: [{ data: Object.values(counts), backgroundColor: Object.keys(counts).map((key) => colors[key] || HEAD) }],
      },
      options: { ...common, cutout: '62%', plugins: { legend: { position: 'bottom' } } },
    });
  });
}

async function ask(question) {
  const out = document.getElementById('askOut');
  out.prepend(Object.assign(document.createElement('div'), { className: 'q', textContent: question }));
  const answer = document.createElement('div');
  answer.className = 'a';
  answer.textContent = 'Thinking…';
  out.insertBefore(answer, out.children[1] || null);
  const hint = document.body.dataset.path === 'enterprise' ? 'enterprise' : 'core';
  try {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, pathHint: askPath === 'either' ? 'either' : hint, sessionId: 'plan' }),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.answer) {
        answer.textContent = data.answer;
        return;
      }
    }
  } catch { /* stub */ }
  const words = question.toLowerCase().split(/\W+/).filter((word) => word.length > 3);
  const hits = palItems.map((item) => ({
    item,
    score: words.filter((word) => (`${item.label} ${item.text}`).toLowerCase().includes(word)).length,
  })).filter((hit) => hit.score).sort((a, b) => b.score - a.score).slice(0, 3);
  answer.innerHTML = hits.length
    ? `Answers from the plan are not switched on yet. Closest sections: ${hits.map((hit) => `<button type="button" data-go="${hit.item.go}">${esc(hit.item.label)}</button>`).join(' ')}`
    : 'Unknown. The research does not cover that yet.';
}

document.getElementById('signout')?.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  location.href = '/login';
});

document.querySelectorAll('nav [data-t]').forEach((button) => {
  button.onclick = () => show(button.dataset.t, button.dataset.anchor || (button.dataset.t === 'value' ? 'ex17' : ''));
});
document.querySelectorAll('.pathswitch button').forEach((button) => {
  button.onclick = () => setPath(button.dataset.path);
});
document.getElementById('openSearch')?.addEventListener('click', openPalette);
document.getElementById('q')?.addEventListener('input', () => { palIndex = 0; renderPalette(); });
document.getElementById('q')?.addEventListener('keydown', (event) => {
  const hits = filteredPalette(event.target.value.trim());
  if (event.key === 'ArrowDown') { event.preventDefault(); palIndex = Math.min(palIndex + 1, Math.max(hits.length - 1, 0)); renderPalette(); }
  if (event.key === 'ArrowUp') { event.preventDefault(); palIndex = Math.max(palIndex - 1, 0); renderPalette(); }
  if (event.key === 'Enter') { event.preventDefault(); if (hits[palIndex]) openHit(hits[palIndex]); }
});
document.addEventListener('keydown', (event) => {
  const meta = event.metaKey || event.ctrlKey;
  if (meta && event.key.toLowerCase() === 'k') { event.preventDefault(); openPalette(); }
  if (event.key === 'Escape' && document.getElementById('palette')?.open) document.getElementById('palette').close();
});

document.addEventListener('click', (event) => {
  const path = event.target.closest('[data-setpath]');
  const go = event.target.closest('[data-go]');
  const dialog = event.target.closest('[data-dlg]');
  const close = event.target.closest('.x, [data-close]');
  const term = event.target.closest('.term');
  const item = event.target.closest('#evidence .gitem, .shot');
  const rival = event.target.closest('#rivalFil button');
  const kind = event.target.closest('#kindFil button');
  const askPathButton = event.target.closest('#askPath button');
  if (close) { close.closest('dialog')?.close(); return; }
  if (path) { setPath(path.dataset.setpath); show(path.dataset.setpath === 'enterprise' ? 'bets' : 'icp'); return; }
  if (rival) {
    document.querySelectorAll('#rivalFil button').forEach((button) => button.setAttribute('aria-pressed', button === rival ? 'true' : 'false'));
    applyGallery();
    return;
  }
  if (kind) {
    document.querySelectorAll('#kindFil button').forEach((button) => button.setAttribute('aria-pressed', button === kind ? 'true' : 'false'));
    applyGallery();
    return;
  }
  if (askPathButton) {
    askPath = askPathButton.dataset.askpath;
    document.querySelectorAll('#askPath button').forEach((button) => button.classList.toggle('on', button === askPathButton));
    return;
  }
  if (dialog) {
    document.querySelectorAll('dialog[open]').forEach((node) => node.close());
    document.getElementById(dialog.dataset.dlg)?.showModal();
    return;
  }
  if (term) {
    const key = term.dataset.g;
    document.getElementById('gt').textContent = key;
    document.getElementById('gd').textContent = glossary[key] || '';
    document.getElementById('gdlg')?.showModal();
    return;
  }
  if (item && event.target.closest('img, figcaption, .gitem')) {
    if (item.classList.contains('gitem')) openLightbox(item);
    else item.classList.toggle('big');
    return;
  }
  if (go && !event.target.closest('dialog')) show(go.dataset.go === 'start' ? 'plain' : go.dataset.go);
  if (event.target.tagName === 'DIALOG') event.target.close();
});

document.getElementById('askForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.getElementById('askIn');
  if (input.value.trim()) ask(input.value.trim());
  input.value = '';
});
document.querySelectorAll('#askChips button').forEach((button) => {
  button.onclick = () => ask(button.textContent);
});

const kbd = document.getElementById('kbd');
if (kbd && !/Mac|iPhone|iPad/.test(navigator.platform)) kbd.textContent = 'Ctrl K';

setPath('core');
loadSearch();
bootCharts();
applyGallery();
const hash = location.hash.replace('#', '');
if (hash) {
  const [name, anchor] = hash.split('-');
  show(name, anchor || (name === 'value' ? 'ex17' : ''));
} else show('plain');
