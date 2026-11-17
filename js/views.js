'use strict';
/* ---------- rendering ---------- */
const TABS = [['workout','Workout'],['plans','Plans'],['analytics','Analytics'],['nutrition','Nutrition'],['profile','Profile']]; // Settings opens from the gear at the top
let backTab = 'workout';
function render() {
  applyTheme();
  $('#nav').innerHTML = TABS.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-a="tab" data-t="${k}">${IC[k]}${l}</button>`).join('');
  // The yellow lens slides to the chosen tab (it is not redrawn, so the move can animate)
  const lens = $('#lens'), ti = TABS.findIndex(([k]) => k === tab);
  lens.classList.toggle('off', ti < 0);
  if (ti >= 0) { const tx = `translateX(${ti * 100}%)`; if (lens.style.transform !== tx) { lens.style.transform = tx; lens.classList.remove('move'); void lens.offsetWidth; lens.classList.add('move'); } }
  const pending = pendingCount();
  $('#syncPill').innerHTML = connected() && pending ? `<span class="dot warn"></span>${pending} to sync` : ''; // nothing to show when everything is saved
  updateResume();
  const views = { workout: viewWorkout, plans: viewPlans, analytics: viewAnalytics, nutrition: viewNutrition, profile: viewProfile, settings: viewSettings };
  const v = $('#view'), key = tab + '/' + ui.seg + '/' + ui.profile;
  v.innerHTML = (views[tab] || viewWorkout)();
  if (v.dataset.k !== key) { v.dataset.k = key; v.classList.remove('fade-in'); void v.offsetWidth; v.classList.add('fade-in'); }
  mountCharts();
  const on = v.querySelector('.segbar.scroll .on'); // keep the chosen tab visible in a scrolling tab bar
  if (on) on.parentNode.scrollLeft = on.offsetLeft - (on.parentNode.clientWidth - on.offsetWidth) / 2;
}

// "Workout in progress" strip on the other tabs (the rest timer takes its place while resting)
function updateResume() {
  const el = $('#resume'), show = !!S.active && tab !== 'workout' && !rest;
  el.classList.toggle('hidden', !show);
  if (show) { $('#rsName').textContent = S.active.name || 'Workout'; $('#rsTime').textContent = 'Workout in progress · ' + fmtDur(Date.now() - S.active.start); }
}

/* ---- Workout tab ---- */
// A short code for a plan ("A1 · Chest, Back" → "A1"; "Push" → "P") and its name without that code
const planBadge = p => { const h = String(p.name).split(/\s*[·:|–-]\s*/)[0].trim(); return esc(h && h.length <= 3 ? h : String(p.name).split(/\s+/).filter(x => /[A-Za-z0-9]/.test(x[0] || '')).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '•'); };
const planTitle = p => { const parts = String(p.name).split(/\s*·\s*/); return parts.length > 1 && parts[0].length <= 3 ? parts.slice(1).join(' · ') : p.name; };
// The plan after the one you trained last, in the order of your plan list
function nextPlan() {
  if (!S.plans.length) return null;
  const last = sorted().find(w => w.planId && S.plans.some(p => p.id === w.planId));
  return last ? S.plans[(S.plans.findIndex(p => p.id === last.planId) + 1) % S.plans.length] : S.plans[0];
}
// This week as seven tiles on an arc: trained days filled, today outlined
function weekArc(ws, now, goal) {
  const wk = weekStart(now), DAYMS = 864e5, today = Math.floor((now - wk) / DAYMS), n = ws.filter(w => w.start >= wk).length;
  const tiles = [...'MTWTFSS'].map((d, i) => {
    const on = ws.some(w => w.start >= wk + i * DAYMS && w.start < wk + (i + 1) * DAYMS), a = -93 + i * 31, r = a * Math.PI / 180;
    const x = (150 + 118 * Math.sin(r)).toFixed(1), y = (165 - 118 * Math.cos(r)).toFixed(1);
    return `<rect x="129" y="24" width="42" height="46" rx="14" transform="rotate(${a} 150 165)" fill="${on ? 'var(--acc)' : i === today ? 'var(--card)' : 'var(--track)'}"${!on && i === today ? ' stroke="var(--text)" stroke-width="2"' : ''}/>
      <text x="${x}" y="${y}" fill="${on ? 'var(--accInk)' : i === today ? 'var(--text)' : 'var(--mut2)'}">${d}</text>`; }).join('');
  return `<div class="arc"><svg viewBox="0 0 300 204" role="img" aria-label="${n} of ${goal} workouts this week">${tiles}</svg>
    <div class="arc-in"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 2L5 13.5h5.5L9.5 22 19 10.5h-6z"/></svg><div class="muted xs">This week</div>
      <div class="n">${n} of ${goal}</div><div class="s">${n >= goal ? 'Weekly goal reached' : `workouts · ${goal - n} to go`}</div></div></div>`;
}
function viewWorkout() {
  if (S.active) return viewActive();
  const ws = sorted(), now = Date.now(), goal = +S.settings.weeklyGoal || 4, streak = weekStreak(S.workouts, now);
  const hr = new Date().getHours(), greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const np = nextPlan(), last = ws[0], tip = ws.length ? coachInsights(now)[0] : null;
  return `
  <div class="home-h"><div class="muted sm">${greet} · ${nice(now)}</div><div class="big">Ready to train?</div></div>
  ${weekArc(ws, now, goal)}
  ${np ? `<section class="upnext">
    <div class="row" style="gap:12px"><span class="badge acc">${planBadge(np)}</span>
      <div class="grow"><div class="k">Up next</div><div class="nm ellip">${esc(planTitle(np))}</div>
        <div class="m ellip">${np.items.length} exercises · ${np.items.reduce((a, i) => a + (+i.sets || 0), 0)} sets${last ? ` · last: ${esc(last.name)}, ${short(last.start)}` : ''}</div></div></div>
    <button class="btn yellow lg block" data-a="start" data-id="${np.id}">Start ${planBadge(np)}</button>
  </section>` : ''}
  <button class="btn outline lg block" data-a="start" data-id="" style="margin:0 0 12px">Start empty workout</button>
  <div class="tiles two" style="margin-top:0">
    <div class="tile"><div class="v">${streak} week${streak === 1 ? '' : 's'}</div><div class="l">Week streak</div></div>
    <div class="tile"><div class="v">${ws.length}</div><div class="l">All workouts</div></div>
  </div>
  ${tip ? `<button class="card linkrow" data-a="go-coach" style="align-items:flex-start"><span class="ic">${IC.spark}</span>
    <span class="grow"><span class="t" style="display:block;font-weight:600">Coach · ${esc(tip.title)}</span><span class="muted sm" style="display:block;margin-top:2px">${esc(tip.text)}</span></span></button>` : ''}
  <button class="card linkrow" data-a="tab" data-t="plans"><span class="ic" style="background:var(--well);color:var(--text)">${IC.plans}</span>
    <span class="grow"><span class="t" style="display:block;font-weight:600">All plans</span><span class="muted sm" style="display:block">${S.plans.length ? `${S.plans.length} plan${S.plans.length === 1 ? '' : 's'} · pick a different one` : 'Create your first plan'}</span></span>${IC.chev}</button>`;
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

  <div class="gh">Appearance</div>
  <div class="group">
    ${srow('moon', 'Theme', 'Light or dark', `<div class="seg"><button class="${st.theme === 'dark' ? '' : 'on'}" data-a="theme" data-v="light">Light</button><button class="${st.theme === 'dark' ? 'on' : ''}" data-a="theme" data-v="dark">Dark</button></div>`)}
  </div>

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

  <div class="gh">Your data</div>
  <div class="group">
    ${srow('table', 'Download workouts', 'CSV for Excel or Sheets', IC.chev, 'export-csv')}
    ${srow('dl', 'Save a backup', 'Everything, in one file', IC.chev, 'export-json')}
    ${srow('reset', 'Backups on this phone', 'Saved automatically every day', IC.chev, 'backups')}
    ${srow('ul', 'Restore a backup file', 'From a file you saved', IC.chev, 'import-json')}
  </div>

  <details class="adv"><summary>${IC.chev}Advanced</summary>
    ${mediaCard()}
    <div class="gh">This device</div>
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
  const W = 320, H = 150, P = { l: 10, r: 10, t: 22, b: 22 }, C = ACC();
  const ys = pts.map(p => p.y), mn = Math.min(...ys), mx = Math.max(...ys), rg = (mx - mn) || 1;
  const X = i => P.l + i * (W - P.l - P.r) / (pts.length - 1), Y = v => P.t + (1 - (v - mn) / rg) * (H - P.t - P.b);
  const d = pts.map((q, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(q.y).toFixed(1)}`).join('');
  const gid = 'g' + uid(), hi = ys.indexOf(mx), lastI = pts.length - 1;
  const hx = Math.min(Math.max(X(hi), 30), W - 30);
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C}" stop-opacity=".3"/><stop offset="1" stop-color="${C}" stop-opacity="0"/></linearGradient></defs>
    <path d="${d}L${X(lastI)},${H - P.b}L${X(0)},${H - P.b}Z" fill="url(#${gid})"/>
    <path d="${d}" fill="none" stroke="${C}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map((q, i) => `<circle cx="${X(i)}" cy="${Y(q.y)}" r="${i === lastI ? 4.5 : 2.5}" fill="${i === lastI ? C : 'var(--card)'}" stroke="${C}" stroke-width="2"/>`).join('')}
    <text x="${P.l}" y="${H - 5}" class="ax">${esc(pts[0].x)}</text><text x="${W - P.r}" y="${H - 5}" text-anchor="end" class="ax">${esc(pts[lastI].x)}</text>
    <text x="${hx}" y="${Y(mx) - 9}" text-anchor="middle" class="ax hi">${esc(fmt(mx))}</text>
  </svg>`;
}
function barChart(pts) {
  const W = 320, H = 140, P = { t: 18, b: 22 }, max = Math.max(1, ...pts.map(p => p.y)), bw = W / pts.length;
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">${pts.map((p, i) => {
    const h = (H - P.t - P.b) * p.y / max, x = i * bw + bw * .18, last = i === pts.length - 1;
    return `<rect x="${x}" y="${H - P.b - Math.max(h, 2)}" width="${bw * .64}" height="${Math.max(h, 2)}" rx="5" fill="${last ? 'var(--acc)' : 'var(--track)'}"/>
      ${p.y ? `<text x="${x + bw * .32}" y="${H - P.b - h - 5}" text-anchor="middle" class="ax ${last ? 'hi' : ''}">${fmtN(p.y)}</text>` : ''}
      <text x="${x + bw * .32}" y="${H - 6}" text-anchor="middle" class="ax">${esc(p.x)}</text>`; }).join('')}</svg>`;
}

/* ---------- sheet / toast ---------- */
