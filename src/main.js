import Chart from 'chart.js/auto';
import { paths, searchIndex } from './content.js';
const NAVY='#0B2545', TEAL='#13A89E', SKY='#B2E1F6';
const j = u => fetch(u).then(r=>r.json());
const el = (h)=>{const d=document.createElement('div');d.innerHTML=h.trim();return d.firstChild;};

function renderPath(key){
 const p=paths[key], s=document.getElementById(key);
 s.classList.add(key);
 const tabs=Object.keys(p.tabs);
 s.innerHTML=`<p class="kicker">${p.tag}</p><h2>${p.title} <span class="muted">· ${p.range}</span></h2><p class="lede">${p.answer}</p>
 <div class="facts">${p.facts.map(([n,l])=>`<div class="fact"><b data-count="${n}">${n}</b><span>${l}</span></div>`).join('')}</div>
 <div class="tabs" role="tablist">${tabs.map((t,i)=>`<button role="tab" class="${i?'':'on'}" data-t="${t}">${t}</button>`).join('')}</div><div class="tabbody"></div>`;
 const body=s.querySelector('.tabbody');
 const show=t=>{const v=p.tabs[t];
  body.innerHTML = Array.isArray(v) ? `<ol class="steps">${v.map(x=>`<li>${x}</li>`).join('')}</ol>`
   : `<div class="wl"><div class="win"><h3>Where we win</h3><ul>${v.win.map(x=>`<li>${x}</li>`).join('')}</ul></div><div class="lose"><h3>Where we lose today</h3><ul>${v.lose.map(x=>`<li>${x}</li>`).join('')}</ul></div></div>`;
  body.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:260});
  s.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));};
 s.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>show(b.dataset.t)); show(tabs[0]);
}
renderPath('mid'); renderPath('large');

Chart.defaults.font.family='Inter,system-ui,sans-serif'; Chart.defaults.color=NAVY;
j('/data/attendance-mix.json').then(d=>{
 document.getElementById('mixnote').textContent=d.note; document.getElementById('mixrefresh').textContent='Data refresh: '+d.refresh;
 const mk=f=>({labels:d.bands.map(b=>b.label),datasets:[{data:d.bands.map(b=>b[f]),backgroundColor:[SKY,TEAL,NAVY,'#4C6A92'],borderRadius:8}]});
 const c=new Chart(mixChart,{type:'bar',data:mk('congregationsPct'),options:{indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:x=>{const b=d.bands[x.dataIndex];const f=c.$f||'congregationsPct';const r=f==='congregationsPct'?b.congregationsRange:b.attendeesRange;return `${x.raw==null?'Unknown':(r||x.raw+'%')} · confidence ${b.confidence} · count ${b.count}`}}}},scales:{x:{ticks:{callback:v=>v+'%'}}}}});
 document.querySelectorAll('[data-mix]').forEach(b=>b.onclick=()=>{c.$f=b.dataset.mix;c.data=mk(b.dataset.mix);c.update();document.querySelectorAll('[data-mix]').forEach(x=>x.classList.toggle('on',x===b));});
});
j('/data/buyer-values.json').then(d=>{valrefresh.textContent='Data refresh: '+d.refresh+' Source: '+d.source;
 new Chart(valChart,{type:'bar',data:{labels:d.items.map(i=>i[0]),datasets:[{data:d.items.map(i=>i[1]),backgroundColor:d.items.map(i=>i[1]?TEAL:'#E25C5C'),borderRadius:8}]},options:{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{max:100,ticks:{callback:v=>v+'%'}}}}});});
j('/data/competitors.json').then(d=>{rivrefresh.textContent='Data refresh: '+d.refresh;
 const draw=f=>{rivalGrid.innerHTML=d.rivals.filter(r=>f==='all'||r.sizes===f||r.sizes==='Both').map(r=>`<details class="card"><summary><b>${r.name}</b><span>${r.pricing}</span></summary><p><i>“${r.promise}”</i></p><p><b>Their strength:</b> ${r.strength}</p><p><b>Why a church picks us:</b> ${r.whyUs}</p><p><b>Don't:</b> ${r.dont}</p><p class="muted">Headline count: ${r.headlineCount}</p></details>`).join('');};
 draw('all'); rivalFilter.querySelectorAll('button').forEach(b=>b.onclick=()=>{draw(b.dataset.f);rivalFilter.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));});});
j('/data/residuals.json').then(d=>{resrefresh.textContent='Data refresh: '+d.refresh;
 const lab={fail:'Not built',partial:'Partly there',unknown:'Unknown',open:'Waiting on a decision'},col={fail:'#E25C5C',partial:'#F2B84B',unknown:'#8A9BB0',open:NAVY};
 const cnt={};d.items.forEach(i=>cnt[i.state]=(cnt[i.state]||0)+1);
 new Chart(resChart,{type:'doughnut',data:{labels:Object.keys(cnt).map(k=>lab[k]),datasets:[{data:Object.values(cnt),backgroundColor:Object.keys(cnt).map(k=>col[k])}]},options:{cutout:'62%',plugins:{legend:{position:'bottom'}}}});
 resList.innerHTML=d.items.map(i=>`<details class="res ${i.state}"><summary><span class="badge">${i.id}</span>${i.plain}<em>${i.status}</em></summary><p><b>What clears it:</b> ${i.clears}</p><p><b>Owner:</b> ${i.owner}</p></details>`).join('');});
j('/data/council.json').then(d=>{council.innerHTML=d.rounds.map(r=>`<div class="score"><b>${r.clarity}</b><span>Clarity</span></div><div class="score"><b>${r.flow}</b><span>Flow</span></div><div class="score gate"><b>✓</b><span>${r.gate}</span></div><p class="muted wide">${r.round}: ${r.note} Bar: ${d.bar}/10.</p>`).join('');});

// Search
const si=document.getElementById('search'), res=document.getElementById('results');
si.oninput=()=>{const q=si.value.toLowerCase().trim(); if(!q){res.hidden=true;return;}
 const hits=searchIndex.filter(x=>(x.label+' '+x.text).toLowerCase().includes(q)).slice(0,8);
 res.hidden=false; res.innerHTML=hits.length?hits.map(h=>`<a href="#${h.id}">${h.label}</a>`).join(''):'<span>No match</span>';};
res.onclick=()=>{res.hidden=true;si.value='';};

const sid=crypto.randomUUID?crypto.randomUUID():String(Date.now());
// Ask the plan: contract in 2026-11-04-ask-the-plan-product.md. tries /api/ask (secure backend, TODO Product); falls back to source-only lookup.
async function ask(q){
 askOut.prepend(el(`<div class="q">${q.replace(/</g,'&lt;')}</div>`));
 const a=el('<div class="a">Thinking…</div>'); askOut.insertBefore(a,askOut.children[1]||null);
 try{const r=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,pathHint:location.hash==='#large'?'enterprise':location.hash==='#mid'?'core':'either',sessionId:sid})});
  if(r.status===401||r.status===403){a.innerHTML='Answers from the plan are not switched on yet. Closest sections:';}
  else if(r.ok){const d=await r.json(); if(d.answer){a.innerHTML=`${d.answer}<br><span class="muted">${(d.residualsNamed||[]).join(' · ')} ${d.status==='explicit_unknown'?'· Unknown in the research':''}</span>`;return;}}}catch(e){}
 const words=q.toLowerCase().split(/\W+/).filter(w=>w.length>3);
 const hits=searchIndex.map(x=>({x,s:words.filter(w=>(x.label+x.text).toLowerCase().includes(w)).length})).filter(h=>h.s).sort((a,b)=>b.s-a.s).slice(0,3);
 a.innerHTML=(a.innerHTML.includes('Closest sections')?a.innerHTML+' ':'')+(hits.length?`The closest plan sections are: ${hits.map(h=>`<a href="#${h.x.id}">${h.x.label}</a>`).join(', ')}.`:'Unknown — the research does not cover that yet.');
}
document.getElementById('signout')?.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  location.href = '/login';
});
askForm.onsubmit=e=>{e.preventDefault(); if(askIn.value.trim()) ask(askIn.value.trim()); askIn.value='';};
document.querySelectorAll('.chips button').forEach(b=>b.onclick=()=>ask(b.textContent));

// Reveal animations
const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('in')),{threshold:.12});
document.querySelectorAll('.reveal').forEach(s=>io.observe(s));
