'use strict';
/* ---------- rendering ---------- */
const TABS = [['workout','Workout'],['plans','Plans'],['analytics','Analytics'],['nutrition','Nutrition'],['profile','Profile']]; // Settings opens from the gear at the top
let backTab = 'workout';
function render() {
  $('#nav').innerHTML = TABS.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-a="tab" data-t="${k}">${IC[k]}${l}</button>`).join('');
  const pending = pendingCount();
  $('#syncPill').innerHTML = !connected() ? '<span class="dot"></span>Local only'
    : pending ? `<span class="dot warn"></span>${pending} to sync` : '<span class="dot ok"></span>Synced';
  const views = { workout: viewWorkout, plans: viewPlans, analytics: viewAnalytics, nutrition: viewNutrition, profile: viewProfile, settings: viewSettings };
  const v = $('#view'), key = tab + '/' + ui.seg + '/' + ui.profile;
  v.innerHTML = (views[tab] || viewWorkout)();
  if (v.dataset.k !== key) { v.dataset.k = key; v.classList.remove('fade-in'); void v.offsetWidth; v.classList.add('fade-in'); }
  mountCharts();
  const on = v.querySelector('.segbar.scroll .on'); // keep the chosen tab visible in a scrolling tab bar
  if (on) on.parentNode.scrollLeft = on.offsetLeft - (on.parentNode.clientWidth - on.offsetWidth) / 2;
}

/* ---- Workout tab ---- */
function viewWorkout() {
  if (S.active) return viewActive();
  const ws = sorted(), now = Date.now(), wk = weekStart(now);
  const thisWeek = ws.filter(w => w.start >= wk).length;
  const WK = 7 * 864e5, has = t => ws.some(w => w.start >= t && w.start < t + WK);
  let streak = 0, t = has(wk) ? wk : wk - WK; // this week still counts if you haven't trained yet
  while (has(t)) { streak++; t -= WK; }
  const last = ws[0];
  const hr = new Date().getHours(), greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  return `
  <section class="card hero">
    <div class="muted sm">${greet} · ${nice(now)}</div>
    <div class="big" style="margin-top:6px">Ready to train?</div>
    <div class="muted sm" style="margin-top:6px">${last ? `Last session: <b style="color:var(--text)">${esc(last.name)}</b>, ${short(last.start)}` : 'Pick a plan below or start empty.'}</div>
    <button class="btn acc block" data-a="start" data-id="" style="margin-top:16px">Start empty workout</button>
  </section>
  <div class="tiles">
    <div class="tile"><div class="v">${thisWeek}</div><div class="l">This week</div></div>
    <div class="tile"><div class="v">${streak}</div><div class="l">Week streak</div></div>
    <div class="tile"><div class="v">${ws.length}</div><div class="l">All workouts</div></div>
  </div>
  <h2>Start from a plan</h2>
  ${S.plans.length ? S.plans.map(p => `
    <div class="card plan-card">
      <div class="grow">
        <div class="nm">${esc(p.name)}</div>
        <div class="muted sm ellip">${p.items.length} exercises · ${p.items.map(i => esc(lib(i.exId).name)).join(', ') || 'empty'}</div>
      </div>
      <button class="btn acc sm" data-a="start" data-id="${p.id}">Start</button>
    </div>`).join('') : `<div class="card empty">No plans yet. Create one in <b>Plans</b>.</div>`}`;
}

function videoPanel(ex) {
  const id = ytId(ex.video), q = encodeURIComponent(ex.name + ' proper form tutorial');
  return `<div class="vid">
    ${id ? `<div class="frame"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1" title="${esc(ex.name)} form video" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>`
         : `<p class="muted sm" style="margin:0 0 8px">No reference video yet. Tap <b>Find</b>, copy a video link, paste it here — it's saved for this exercise from now on.</p>`}
    <div class="row gap"><input class="in" placeholder="Paste YouTube link" data-vid="${ex.id}" value="${esc(ex.video || '')}"><a class="btn sm" style="height:44px" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${q}">Find</a></div>
  </div>`;
}

function viewPlanEdit() {
  const p = S.plans.find(x => x.id === editPlanId);
  if (!p) { editPlanId = null; return viewPlans(); }
  return `
  <div class="row gap" style="margin:4px 0 14px"><button class="icon" data-a="plan-back">${IC.back}</button><input class="title-in" data-plan-name value="${esc(p.name)}" placeholder="Plan name"></div>
  <div class="card">
    <div class="plan-item xs muted" style="padding-top:0;font-weight:600;text-transform:uppercase;letter-spacing:.06em"><span>Exercise</span><span style="text-align:center">Sets</span><span style="text-align:center">Reps</span><span></span><span></span></div>
    ${p.items.map((it, k) => `
      <div class="plan-item">
        <span class="t ellip">${esc(lib(it.exId).name)}</span>
        <input inputmode="numeric" data-pi="${k}" data-pf="sets" value="${it.sets}">
        <input data-pi="${k}" data-pf="reps" value="${esc(it.reps)}">
        <button class="icon" data-a="pi-up" data-k="${k}" ${k ? '' : 'style="visibility:hidden"'}>${IC.up}</button>
        <button class="icon" data-a="pi-rm" data-k="${k}">${IC.x}</button>
      </div>`).join('') || '<div class="empty">Add exercises to this plan.</div>'}
  </div>
  <button class="btn block" data-a="pick" data-mode="plan">+ Add exercise</button>
  <button class="btn acc block" data-a="start" data-id="${p.id}">Start this plan</button>
  <button class="btn danger block" data-a="plan-del">Delete plan</button>`;
}

/* ---- Settings (opens from the gear; not a main tab) ---- */
const ago = t => { const m = Math.round((Date.now() - t) / 6e4); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : short(t); };
const srow = (ic, t, sub, right, a, neutral) => `<${a ? `button data-a="${a}"` : 'div'} class="srow"><span class="ic ${neutral ? 'n' : ''}">${IC[ic]}</span><div class="grow"><div class="t">${t}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>${right}</${a ? 'button' : 'div'}>`;
function viewSettings() {
  const st = S.settings, rs = +st.rest || 90;
  const pending = pendingCount();
  const status = pending ? `${pending} waiting to sync` : st.lastSync ? `Up to date · ${ago(st.lastSync)}` : 'Up to date';
  return `
  <div class="page-h"><button class="icon" data-a="back" aria-label="Back">${IC.back}</button><h3>Settings</h3></div>

  <div class="gh">Training</div>
  <div class="group">
    ${srow('scale', 'Units', 'Weight &amp; size', `<div class="seg"><button class="${st.unit === 'kg' ? 'on' : ''}" data-a="unit" data-v="kg">kg</button><button class="${st.unit === 'lb' ? 'on' : ''}" data-a="unit" data-v="lb">lb</button></div>`)}
    ${srow('timer', 'Rest timer', 'After each set', `<div class="stepper"><button data-a="rest-step" data-d="-15" aria-label="Less rest">−</button><span>${fmtDur(rs * 1000)}</span><button data-a="rest-step" data-d="15" aria-label="More rest">+</button></div>`)}
    ${srow('ruler', 'Height', 'For BMI', `<input class="mini-in" inputmode="decimal" data-set="height" value="${esc(st.height)}" placeholder="—"><span class="muted sm">${lenUnit()}</span>`)}
    ${trainingSettings()}
  </div>

  <div class="gh">Google Sheet</div>
  <div class="group">
    ${connected() ? srow('cloud', 'Sync', status, `<button class="btn sm acc" data-a="sync">Sync now</button>`)
    : `<div class="srow" style="flex-wrap:wrap"><span class="ic">${IC.cloud}</span><div class="grow"><div class="t">Connect your Sheet</div><div class="s">Enter your private key once on this device</div></div>
       <div class="row gap" style="width:100%"><input class="in" id="apikey" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="xxxx-xxxx-xxxx-xxxx"><button class="btn acc" data-a="connect">Connect</button></div></div>`}
  </div>

  ${mediaCard()}

  <div class="gh">Your data</div>
  <div class="group">
    ${srow('table', 'Download workouts', 'CSV for Excel or Sheets', IC.chev, 'export-csv')}
    ${srow('dl', 'Save a backup', 'Everything, in one file', IC.chev, 'export-json')}
    ${srow('reset', 'Backups on this phone', 'Saved automatically every day', IC.chev, 'backups')}
    ${srow('ul', 'Restore a backup file', 'From a file you saved', IC.chev, 'import-json')}
  </div>

  <details class="adv"><summary>${IC.chev}More options</summary>
    <div class="group">
      ${connected() ? srow('unlink', 'Disconnect this device', 'Your Sheet keeps everything', IC.chev, 'disconnect', true) : ''}
      ${srow('reset', 'Reset this phone', connected() ? 'Download everything again from your Sheet' : 'Start fresh on this phone', IC.chev, 'reset', true)}
    </div>
  </details>
  <div class="foot">Sanskaar GYM · version ${APP_VERSION}</div>`;
}

/* ---------- charts ---------- */
function lineChart(pts, fmt) {
  if (pts.length < 2) return `<div class="empty sm">Log at least two entries to see a trend.</div>`;
  const W = 320, H = 150, P = { l: 10, r: 10, t: 22, b: 22 }, C = '#ffd60a';
  const ys = pts.map(p => p.y), mn = Math.min(...ys), mx = Math.max(...ys), rg = (mx - mn) || 1;
  const X = i => P.l + i * (W - P.l - P.r) / (pts.length - 1), Y = v => P.t + (1 - (v - mn) / rg) * (H - P.t - P.b);
  const d = pts.map((q, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(q.y).toFixed(1)}`).join('');
  const gid = 'g' + uid(), hi = ys.indexOf(mx), lastI = pts.length - 1;
  const hx = Math.min(Math.max(X(hi), 30), W - 30);
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C}" stop-opacity=".3"/><stop offset="1" stop-color="${C}" stop-opacity="0"/></linearGradient></defs>
    <path d="${d}L${X(lastI)},${H - P.b}L${X(0)},${H - P.b}Z" fill="url(#${gid})"/>
    <path d="${d}" fill="none" stroke="${C}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map((q, i) => `<circle cx="${X(i)}" cy="${Y(q.y)}" r="${i === lastI ? 4.5 : 2.5}" fill="${i === lastI ? C : '#14171c'}" stroke="${C}" stroke-width="2"/>`).join('')}
    <text x="${P.l}" y="${H - 5}" class="ax">${esc(pts[0].x)}</text><text x="${W - P.r}" y="${H - 5}" text-anchor="end" class="ax">${esc(pts[lastI].x)}</text>
    <text x="${hx}" y="${Y(mx) - 9}" text-anchor="middle" class="ax hi">${esc(fmt(mx))}</text>
  </svg>`;
}
function barChart(pts) {
  const W = 320, H = 140, P = { t: 18, b: 22 }, max = Math.max(1, ...pts.map(p => p.y)), bw = W / pts.length;
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">${pts.map((p, i) => {
    const h = (H - P.t - P.b) * p.y / max, x = i * bw + bw * .18, last = i === pts.length - 1;
    return `<rect x="${x}" y="${H - P.b - Math.max(h, 2)}" width="${bw * .64}" height="${Math.max(h, 2)}" rx="5" fill="${last ? '#ffd60a' : '#2e343d'}"/>
      ${p.y ? `<text x="${x + bw * .32}" y="${H - P.b - h - 5}" text-anchor="middle" class="ax ${last ? 'hi' : ''}">${fmtN(p.y)}</text>` : ''}
      <text x="${x + bw * .32}" y="${H - 6}" text-anchor="middle" class="ax">${esc(p.x)}</text>`; }).join('')}</svg>`;
}

/* ---------- sheet / toast ---------- */
