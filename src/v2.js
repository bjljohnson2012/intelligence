/** LIVE MI V2 surfaces. Layout follows the marks. Copy follows the pack, not example drafts. */

export const ADMIN_EMAIL = 'bjljohnson2012@gmail.com';

export const V2_NAV = [
  { id: 'start', label: 'Overview' },
  { id: 'bets', label: 'Plan' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'comp', label: 'Competitors' },
  { id: 'buyers', label: 'Buyers' },
  { id: 'icp', label: 'ICP' },
  { id: 'implement', label: 'Implementation' },
];

const EXTRA_SECTIONS = ['evidence', 'implement'];

export function isAdminEmail(email) {
  return String(email || '').toLowerCase() === ADMIN_EMAIL;
}

export function hideNamedChrome(value) {
  const text = String(value ?? '');
  if (/stolz|andrewcstolz|share\.andrewcstolz/i.test(text)) return 'Named in the source plan. Not shown here.';
  return text;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function chip(text, kind) {
  return `<span class="chip ${kind || ''}">${esc(text)}</span>`;
}

export function buyersHtml(social) {
  const head = ['Platform', 'Ministry Brands', 'Planning Center', 'Pushpay', 'Tithely', 'Subsplash', 'ACS', 'Breeze'];
  const body = social.reach.map((row) => {
    if (!row.counts) {
      return `<tr><td>${esc(row.platform)} ${chip(row.id)}</td><td colspan="7">${chip('Explicit Unknown', 'unk')} ${esc(row.note)}</td></tr>`;
    }
    const cells = head.slice(1).map((name) => {
      const value = row.counts[name];
      return `<td>${value == null ? chip('Explicit Unknown', 'unk') : esc(value.toLocaleString('en-US'))}</td>`;
    }).join('');
    return `<tr><td>${esc(row.platform)} ${chip(row.id)}</td>${cells}</tr>`;
  }).join('');
  const quotes = social.quotes.map((quote) => `<blockquote class="q"><p>${esc(quote.text)}</p><p class="note">${esc(quote.id)} · ${esc(quote.where)}</p></blockquote>`).join('');
  const shots = social.also.filter((row) => row.file).map((row) => `<figure class="shot"><img src="/evidence/comp-2026-11-04/${esc(row.file)}" alt="${esc(row.decision)}"><figcaption><b>${esc(row.decision)}</b><span class="note">${esc(row.id)} · marketing page</span></figcaption></figure>`).join('');
  const views = social.posts.views.map((view) => `<div class="mini"><b>${esc(view)}</b><span class="note">views</span></div>`).join('');
  return `<h2>${esc(social.heading)}</h2><p class="lead">${esc(social.note)}</p><p class="note">Read ${esc(social.read)}. Confidence on X is High. LinkedIn is Medium. ${esc(social.source)}</p><div class="panel"><h3>Reach</h3><div class="tw"><table><thead><tr>${head.map((cell) => `<th>${esc(cell)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div></div><div class="panel"><h3>AI posts</h3><p class="note">${esc(social.posts.id)} · ${esc(social.posts.date)} · ${esc(social.posts.method)}</p><div class="minis">${views}</div><p>${esc(social.posts.decision)}</p></div><div class="panel"><h3>What buyers said</h3><div class="quotegrid">${quotes}</div><p class="note">Also on the read: SP05 peer migration tool (Low). SP09 Church-IT Amplify price read (Low).</p></div><div class="panel"><h3>What the screens decide</h3><div class="shots">${shots}</div></div>`;
}

export function comparesHtml(compares) {
  const cards = compares.modules.map((mod) => {
    const shots = [...mod.amplify, ...mod.rivals].map((file) => `<figure class="shot"><img src="/evidence/comp-2026-11-04/${esc(file)}" alt="${esc(mod.decision)}"><figcaption class="note">${esc(file)} · marketing page</figcaption></figure>`).join('');
    const badge = mod.unknown ? chip('Explicit Unknown', 'unk') : chip(mod.move);
    return `<article class="panel comparecard"><h3>${esc(mod.name)} ${badge}</h3><p>${esc(mod.decision)}</p>${shots ? `<div class="shots">${shots}</div>` : '<p class="note">No COMP5 product shot. Do not imply parity.</p>'}</article>`;
  }).join('');
  return `<div class="panel"><h2>Amplify module compares</h2><p>${esc(compares.proof)}</p><p class="note">${esc(compares.source)}</p></div>${cards}`;
}

export function icpHtml(icp, path) {
  const mapKey = path === 'enterprise' ? 'enterprise' : 'core';
  const map = icp.maps[mapKey];
  const jobs = icp.jobs.map((job) => `<tr><td>${esc(job.id)}</td><td>${esc(job.words)}</td><td>${esc(job.of71)}</td><td>${esc(job.use)}</td></tr>`).join('');
  const seats = map.seats.map((seat) => `<tr><td>${esc(seat.seat)}</td><td>${esc(seat.who)}</td><td>${esc(seat.demo)}</td></tr>`).join('');
  const refused = icp.refused.map((line) => `<li>${esc(line)}</li>`).join('');
  const roles = icp.roles.map((role) => `<li><b>${esc(role.role)}</b> — ${esc(role.job)} <span class="note">${esc(role.confidence)}</span></li>`).join('');
  return `<h2>Who buys, and the job</h2><p class="lead">${esc(icp.coldOpen)}</p><p class="note">Order: ${esc(icp.order.join(' → '))}. ${esc(icp.fees)} ${esc(icp.source)}</p><div class="panel"><h3>Jobs</h3><div class="tw"><table><thead><tr><th>Job</th><th>Buyer words</th><th>Of 71</th><th>Use</th></tr></thead><tbody>${jobs}</tbody></table></div></div><div class="panel"><h3>${esc(map.label)}</h3><p class="note">${esc(map.confidence)}</p><div class="tw"><table><thead><tr><th>Seat</th><th>Who</th><th>In the demo</th></tr></thead><tbody>${seats}</tbody></table></div></div><div class="grid2"><div class="panel"><h3>Day</h3><p>${chip(icp.day.badge, 'unk')} ${esc(icp.day.text)}</p></div><div class="panel"><h3>Roles</h3><ul>${roles}</ul></div></div><div class="panel"><h3>Do not say</h3><ul>${refused}</ul></div>`;
}

export function evidenceHtml(catalog) {
  const shots = catalog.items.map((item) => `<figure class="gitem" data-rival="${esc(item.rival)}" data-kind="${esc(item.kind)}" data-caption="${esc(item.title)}. ${esc(item.decision)}" data-meta="Captured ${esc(item.captured)} · ${esc(item.file)}"><img src="${esc(item.src)}" alt="${esc(item.decision)}" loading="lazy"><figcaption><b>${esc(item.title)}</b><span class="note">${esc(item.decision)}</span></figcaption></figure>`).join('');
  return `<h2>Evidence</h2><p class="lead">Each capture names the decision. These are marketing pages, not a logged-in church admin.</p><div class="tfil" id="evRival"><button type="button" data-ev="all" aria-pressed="true">All</button><button type="button" data-ev="pco">Planning Center</button><button type="button" data-ev="pushpay">Pushpay</button><button type="button" data-ev="tithely">Tithely / Breeze</button><button type="button" data-ev="subsplash">Subsplash</button><button type="button" data-ev="acs">ACS / Realm</button><button type="button" data-ev="mb">Ministry Brands</button></div><div class="tfil" id="evKind"><button type="button" data-evkind="all" aria-pressed="true">All kinds</button><button type="button" data-evkind="home">Home</button><button type="button" data-evkind="pricing">Pricing</button><button type="button" data-evkind="marketing">Marketing page</button><button type="button" data-evkind="channel">Channel, not proof</button><button type="button" data-evkind="cta">Call to action</button></div><div class="ggrid" id="evGrid">${shots}</div><p class="note"><button type="button" class="go2" id="openReceipts">Raw receipts</button></p><div id="receipts" hidden></div>`;
}

export function receiptsHtml(items) {
  const rows = items.filter((item) => item && !item.adminOnly && item.kind !== 'panel' && item.kind !== 'section').slice(0, 80).map((item) => {
    const source = (item.sources && item.sources[0]) || 'Explicit Unknown';
    return `<tr><td>${esc(item.title)}</td><td>${esc(item.value || '')}</td><td>${esc(item.confidence || 'Explicit Unknown')}</td><td>${esc(item.claimDate || 'Explicit Unknown')}</td><td>${esc(source)}</td></tr>`;
  }).join('');
  return `<h3>Raw receipts</h3><p class="note">First 80 claims. A row that still cites the pack has no primary URL.</p><div class="tw"><table><thead><tr><th>Claim</th><th>Value</th><th>Confidence</th><th>Date</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function planUtilityHtml(residuals) {
  const open = residuals.items.map((item) => `<li><b>${esc(item.id)}</b> ${esc(item.plain)} ${chip(item.status, item.state === 'fail' ? 'bad' : 'unk')}</li>`).join('');
  return `<h2>Plan</h2><p class="lead">One job: the next move. Live Core stays HOLD.</p><div class="grid3"><div class="panel"><h3>Outcomes</h3><ul><li>Safe Switch cockpit (R1, not built)</li><li>Gift-to-books demo (R2, not confirmed)</li><li>One customer count, still a conflict</li></ul></div><div class="panel"><h3>Plays</h3><ul><li>Discover ease, then a real person</li><li>Then one place</li><li>Then books, after R2</li><li>Fees last</li></ul></div><div class="panel"><h3>Still open</h3><ul>${open}</ul></div></div>`;
}

export function holdHtml(residuals) {
  const blocking = residuals.items.filter((item) => item.state !== 'pass');
  const lines = blocking.map((item) => `<li><b>${esc(item.id)} · ${esc(item.status)}</b> — ${esc(item.plain)} Clears when: ${esc(item.clears)} Owner: ${esc(item.owner)}</li>`).join('');
  return `<div class="panel holdgate"><h3>Use in market</h3><p>${chip('HOLD', 'bad')} Live Core stays HOLD. ${blocking.length} open items block a green light.</p><ul>${lines}</ul><button type="button" class="go2" disabled>Export talk track</button></div>`;
}

export function implementationHtml(residuals) {
  const blocked = residuals.items.filter((item) => item.state === 'fail' || item.state === 'unknown' || item.state === 'open' || item.state === 'partial');
  const rows = blocked.map((item) => `<tr><td>HOLD</td><td>${esc(item.id)}</td><td>${esc(item.plain)}</td><td>${esc(item.owner)}</td></tr>`).join('');
  return `<h2>Implementation</h2><p class="lead">What we execute. Not another research dump.</p><div class="panel"><h3>This week</h3><ul><li>Say J1 and J2 as discovery. Do not say Amplify ease while public reviews are n=0.</li><li>Show the buyers table. Followers are not reach. Facebook and Instagram stay unread.</li><li>Use the COMP5 compares. Check-in and standalone events stay Explicit Unknown.</li><li>Keep the customer-count conflict. Do not pick a number.</li></ul></div><div class="panel"><h3>HOLD until cleared</h3><div class="tw"><table><thead><tr><th></th><th>Item</th><th>Gap</th><th>Owner</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

export function attackHtml(rivals) {
  const options = rivals.map((rival) => `<option value="${esc(rival.name)}">${esc(rival.name)}</option>`).join('');
  return `<div class="panel" id="attack"><h3>Attack planner</h3><form id="attackForm" class="stack"><label>Incumbent <select name="incumbent">${options}</select></label><label>Band <select name="band"><option value="core">Core · 250–999</option><option value="enterprise">Enterprise · 1,000+</option></select></label><label>Contract end <input name="contractEnd" type="text" placeholder="Date or Explicit Unknown"></label><label>Who owns the books <input name="booksOwner" type="text" placeholder="Role, or Explicit Unknown"></label><label>Recurring givers <input name="recurring" type="text" placeholder="Count, or Explicit Unknown"></label><button type="submit">Build the one-page brief</button></form><div id="attackOut"></div></div>`;
}

export function attackBrief(input, rivals) {
  const rival = rivals.find((item) => item.name === input.incumbent) || rivals[0];
  const band = input.band === 'enterprise' ? 'Enterprise · 1,000+' : 'Core · 250–999';
  return [
    `AE brief · ${rival.name} · ${band}`,
    `Contract end: ${input.contractEnd || 'Explicit Unknown'}`,
    `Who owns the books: ${input.booksOwner || 'Explicit Unknown'}`,
    `Recurring givers: ${input.recurring || 'Explicit Unknown'}`,
    `Their posture: ${rival.pricing}. Headline: ${rival.headlineCount}.`,
    `Do not: ${rival.dont}`,
    `Our counter: ${rival.whyUs}`,
    'Open on ease and a real person as discovery (not Amplify proof). Then one place. Then gift-to-books after R2. Fees last.',
    'HOLD: Safe Switch is not built (R1). Do not say weeks not months. Do not say a single customer count.',
  ].join('\n');
}

export function rivalCardsHtml(rivals) {
  return `<div class="cgrid">${rivals.map((rival) => `<button type="button" class="ccard drill" data-drill="rival" data-rival-name="${esc(rival.name)}"><b>${esc(rival.name)}</b><span>${esc(rival.promise)}</span><em>${esc(rival.headlineCount)}</em><span class="note">${esc(rival.headlineNote || '')}</span></button>`).join('')}</div>`;
}

export function plan2027Html(plan) {
  const data = plan.data;
  const lines = plan.lines.map((line) => `<li>${esc(hideNamedChrome(line))}</li>`).join('');
  const terr = data.terr.map((row) => `<tr><td>${esc(row.t)}</td><td>${esc(hideNamedChrome(row.states))}</td><td>${esc(row.grade)}</td><td>${esc(hideNamedChrome(row.person))}</td><td>${esc(hideNamedChrome(row.sd))}</td><td>${esc(row.quota)}</td><td>${esc(row.mql)}</td></tr>`).join('');
  const plus = data.plus.map((row) => `<tr><td>${esc(hideNamedChrome(row.name))}</td><td>${esc(row.clients)}</td><td>${esc(row.arr)}</td><td>${esc(row.amp)}</td><td>${esc(row.leg)}</td></tr>`).join('');
  const seats = data.roster.map((row) => `<tr><td>${esc(row.SeatID)}</td><td>${esc(row.Team)}</td><td>${esc(hideNamedChrome(row.Person))}</td><td>${esc(hideNamedChrome(row.SD))}</td><td>${esc(row.Status)}</td><td>${esc(row.Quota)}</td></tr>`).join('');
  return `<div class="y2" data-pane="overview"><h2>${esc(plan.label)}</h2><p class="lead">${esc(plan.title)}</p><p class="note">${esc(plan.asOf)}. ${esc(plan.sourceLabel)}.</p><ul>${lines}</ul><div class="kpis"><div class="kpi"><div class="l">Core accounts</div><div class="v">${esc(data.counts.coreAccts.toLocaleString('en-US'))}</div></div><div class="kpi"><div class="l">Plus accounts</div><div class="v">${esc(data.counts.plusAccts.toLocaleString('en-US'))}</div></div><div class="kpi"><div class="l">Enterprise accounts</div><div class="v">${esc(data.counts.entAccts.toLocaleString('en-US'))}</div></div></div></div><div class="y2" data-pane="territories"><h3>Territories</h3><div class="tw"><table><thead><tr><th>#</th><th>States</th><th>Grade</th><th>Seat</th><th>Sales director</th><th>Quota</th><th>MQL</th></tr></thead><tbody>${terr}</tbody></table></div></div><div class="y2" data-pane="plus"><h3>Commercial Plus</h3><div class="tw"><table><thead><tr><th>Territory</th><th>Clients</th><th>ARR</th><th>Amplify</th><th>Legacy</th></tr></thead><tbody>${plus}</tbody></table></div></div><div class="y2" data-pane="seats"><h3>Seats</h3><div class="tw"><table><thead><tr><th>Seat</th><th>Team</th><th>Person</th><th>Reports to</th><th>Status</th><th>Quota</th></tr></thead><tbody>${seats}</tbody></table></div></div>`;
}

let ctx = null;

function fill(id, html) {
  const node = document.getElementById(id);
  if (node) node.innerHTML = html;
}

function ensureSection(id) {
  if (document.getElementById(`t-${id}`)) return;
  const section = document.createElement('section');
  section.className = 'tab';
  section.id = `t-${id}`;
  section.dataset.screen = id;
  section.hidden = true;
  section.innerHTML = `<div id="${id}Mount"></div>`;
  document.getElementById('sections').append(section);
}

export function installV2(next) {
  ctx = next;
  EXTRA_SECTIONS.forEach(ensureSection);
  let mount = document.getElementById('v2plan');
  const bets = document.getElementById('t-bets');
  if (bets && !mount) {
    mount = document.createElement('div');
    mount.id = 'v2plan';
    bets.prepend(mount);
  }
  let compMount = document.getElementById('v2comp');
  const comp = document.getElementById('t-comp');
  if (comp && !compMount) {
    compMount = document.createElement('div');
    compMount.id = 'v2comp';
    comp.prepend(compMount);
  }
  let icpMount = document.getElementById('v2icp');
  const icp = document.getElementById('t-icp');
  if (icp && !icpMount) {
    icpMount = document.createElement('div');
    icpMount.id = 'v2icp';
    icp.prepend(icpMount);
  }
  if (!document.getElementById('councilLock')) {
    const lock = document.createElement('section');
    lock.id = 'councilLock';
    lock.className = 'tab';
    lock.hidden = true;
    document.getElementById('sections').append(lock);
  }
  if (!document.getElementById('y2027')) {
    const view = document.createElement('div');
    view.id = 'y2027';
    view.hidden = true;
    document.getElementById('stage').append(view);
  }
  if (!document.getElementById('askFab')) {
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.id = 'askFab';
    fab.className = 'askfab';
    fab.textContent = 'Ask';
    const sheet = document.createElement('div');
    sheet.id = 'askSheet';
    sheet.hidden = true;
    sheet.innerHTML = `<div class="asksheet"><div class="railhead"><h2>Ask the plan</h2><button type="button" class="x" id="askSheetClose">Close</button></div><p class="note">Path and plan aware. Explicit Unknown when the pack does not say. This does not clear an open item.</p><form id="sayForm" class="stack"><label>Can I say this? <input id="sayIn" type="text" placeholder="A line you might say to a church"></label><button type="submit">Check</button></form><div id="sayOut"></div><form id="askSheetForm" class="stack"><label>Ask <textarea id="askSheetIn" rows="3" placeholder="Ask about this plan"></textarea></label><button type="submit">Ask</button></form><div id="askSheetOut"></div></div>`;
    document.body.append(fab, sheet);
    fab.addEventListener('click', () => { sheet.hidden = !sheet.hidden; });
    sheet.querySelector('#askSheetClose').addEventListener('click', () => { sheet.hidden = true; });
    sheet.querySelector('#sayForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const verdict = next.sayCheck(sheet.querySelector('#sayIn').value);
      const out = sheet.querySelector('#sayOut');
      out.innerHTML = verdict.matched ? `<p>${chip(verdict.status)} ${esc(verdict.answer)}</p>` : '<p class="note">Type a line to check.</p>';
    });
    sheet.querySelector('#askSheetForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const input = sheet.querySelector('#askSheetIn');
      const question = input.value.trim();
      if (!question) return;
      input.value = '';
      next.ask(question, sheet.querySelector('#askSheetOut'));
    });
  }
  if (!document.getElementById('adminCouncil')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'adminCouncil';
    button.className = 'signout';
    button.textContent = 'Admin';
    button.hidden = true;
    document.querySelector('.htools').append(button);
    button.addEventListener('click', () => next.go({ section: 'council', item: '' }));
  }
  const y2027 = document.getElementById('y2027');
  if (y2027 && !y2027.dataset.filled) {
    y2027.innerHTML = `<div class="tfil" id="yNav"><button type="button" data-pane="overview" aria-pressed="true">Overview</button><button type="button" data-pane="territories">Territories</button><button type="button" data-pane="plus">Plus</button><button type="button" data-pane="seats">Seats</button></div>${plan2027Html(next.plan2027)}`;
    y2027.dataset.filled = '1';
    y2027.addEventListener('click', (event) => {
      const button = event.target.closest('[data-pane]');
      if (!button) return;
      y2027.querySelectorAll('[data-pane]').forEach((node) => {
        if (node.tagName === 'BUTTON') node.setAttribute('aria-pressed', node === button ? 'true' : 'false');
      });
      y2027.querySelectorAll('.y2').forEach((pane) => { pane.hidden = pane.dataset.pane !== button.dataset.pane; });
    });
  }
  document.getElementById('stage').addEventListener('click', onStageClick);
  document.getElementById('stage').addEventListener('submit', onStageSubmit);
  document.getElementById('nav').addEventListener('click', (event) => {
    const button = event.target.closest('#nav [data-pane]');
    if (!button) return;
    document.querySelector(`#yNav [data-pane="${button.dataset.pane}"]`)?.click();
  });
  refreshV2();
}

function onStageClick(event) {
  const rival = event.target.closest('[data-ev]');
  const kind = event.target.closest('[data-evkind]');
  if (rival) {
    document.querySelectorAll('#evRival button').forEach((button) => button.setAttribute('aria-pressed', button === rival ? 'true' : 'false'));
    filterEvidence();
  }
  if (kind) {
    document.querySelectorAll('#evKind button').forEach((button) => button.setAttribute('aria-pressed', button === kind ? 'true' : 'false'));
    filterEvidence();
  }
  if (event.target.id === 'openReceipts') {
    const host = document.getElementById('receipts');
    host.hidden = !host.hidden;
    if (!host.hidden) host.innerHTML = receiptsHtml(ctx.pack.items);
  }
  const card = event.target.closest('[data-rival-name]');
  if (card) {
    const name = card.dataset.rivalName;
    const rivalRow = ctx.rivals.find((item) => item.name === name);
    const body = document.getElementById('rail-body');
    if (rivalRow && body) {
      document.getElementById('rail-title').textContent = rivalRow.name;
      document.getElementById('rail-type').textContent = 'Steal, counter, or refuse';
      body.innerHTML = `<p>${esc(rivalRow.promise)}</p><p><b>Headline.</b> ${esc(rivalRow.headlineCount)}</p><p>${esc(rivalRow.headlineNote || '')}</p><p><b>Do not.</b> ${esc(rivalRow.dont)}</p><p><b>Counter.</b> ${esc(rivalRow.whyUs)}</p><p class="note">Marketing pages, not logged-in product proof. Check-in and standalone events on Amplify are Explicit Unknown.</p>`;
      document.getElementById('rail').hidden = false;
      document.body.classList.add('rail-open');
    }
  }
}

function onStageSubmit(event) {
  if (event.target.id !== 'attackForm') return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target).entries());
  const brief = attackBrief(data, ctx.rivals);
  const out = document.getElementById('attackOut');
  out.innerHTML = `<pre class="brief">${esc(brief)}</pre><button type="button" class="go2" id="saveBrief">Download brief</button>`;
  out.querySelector('#saveBrief').addEventListener('click', () => {
    const blob = new Blob([brief], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ae-brief.txt';
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

function filterEvidence() {
  const rival = document.querySelector('#evRival button[aria-pressed="true"]')?.dataset.ev || 'all';
  const kind = document.querySelector('#evKind button[aria-pressed="true"]')?.dataset.evkind || 'all';
  document.querySelectorAll('#evGrid .gitem').forEach((item) => {
    const okRival = rival === 'all' || item.dataset.rival === rival;
    const okKind = kind === 'all' || item.dataset.kind === kind;
    item.hidden = !(okRival && okKind);
  });
}

let paintedKey = '';

export function refreshV2() {
  if (!ctx) return;
  const { social, compares, icp, residuals, rivals, admin, plan, path } = ctx;
  const key = `${plan}|${path}|${admin ? 1 : 0}`;
  if (paintedKey !== key) {
    fill('buyersMount', buyersHtml(social));
    fill('evidenceMount', evidenceHtml(ctx.evidence));
    fill('implementMount', `${implementationHtml(residuals)}${attackHtml(rivals)}`);
    fill('v2plan', `${planUtilityHtml(residuals)}${holdHtml(residuals)}`);
    fill('v2comp', `${rivalCardsHtml(rivals)}${comparesHtml(compares)}`);
    fill('v2icp', icpHtml(icp, path));
    paintedKey = key;
  }
  document.body.dataset.plan = plan;
  document.body.dataset.admin = admin ? '1' : '0';
  const commercial = plan !== '2027';
  document.getElementById('y2027').hidden = commercial;
  document.getElementById('hero').hidden = !commercial;
  document.getElementById('sections').hidden = !commercial;
  document.querySelectorAll('.pathswitch').forEach((node) => { node.hidden = !commercial; });
  document.querySelectorAll('.planswitch button').forEach((button) => {
    button.setAttribute('aria-pressed', button.dataset.plan === plan ? 'true' : 'false');
  });
  const nav = document.getElementById('nav');
  if (commercial) {
    nav.innerHTML = V2_NAV.map((item) => `<button type="button" role="tab" data-section="${esc(item.id)}" data-anchor="" aria-selected="false">${esc(item.label)}</button>`).join('');
  } else {
    nav.innerHTML = ['overview', 'territories', 'plus', 'seats'].map((pane) => `<button type="button" role="tab" data-pane="${pane}">${esc(pane[0].toUpperCase() + pane.slice(1))}</button>`).join('');
  }
  const adminButton = document.getElementById('adminCouncil');
  if (adminButton) adminButton.hidden = !admin;
  document.querySelectorAll('#nav [data-section]').forEach((button) => {
    button.setAttribute('aria-selected', button.dataset.section === ctx.section ? 'true' : 'false');
  });
}

export function councilLockedHtml() {
  return '<h2>Council</h2><p class="lead">Admin only.</p>';
}
