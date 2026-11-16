'use strict';
/* ---------- rendering ---------- */
const TABS = [['workout','Workout'],['plans','Plans'],['progress','Progress'],['body','Body']]; // Settings opens from the gear at the top
let backTab = 'workout';
function render() {
  $('#nav').innerHTML = TABS.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-a="tab" data-t="${k}">${IC[k]}${l}</button>`).join('');
  const pending = pendingCount();
  $('#syncPill').innerHTML = !connected() ? '<span class="dot"></span>Local only'
    : pending ? `<span class="dot warn"></span>${pending} to sync` : '<span class="dot ok"></span>Synced';
  $('#view').innerHTML = ({ workout: viewWorkout, plans: viewPlans, progress: viewProgress, body: viewBody, settings: viewSettings })[tab]();
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

function viewActive() {
  const A = S.active;
  return `
  <div class="row between gap" style="margin:6px 0 14px">
    <div style="flex:1;min-width:0">
      <input class="title-in" data-act-name value="${esc(A.name)}" aria-label="Workout name">
      <div class="live"><i></i><span id="elapsed">${fmtDur(Date.now() - A.start)}</span> · <span id="wsum">${summaryText()}</span></div>
    </div>
    <button class="btn acc" data-a="finish">Finish</button>
  </div>
  ${A.exercises.length ? A.exercises.map(exCard).join('') : `<div class="card empty">No exercises yet. Add your first one.</div>`}
  <button class="btn block" data-a="pick" data-mode="workout">+ Add exercise</button>
  <button class="btn danger block" data-a="discard">Discard workout</button>`;
}
function summaryText() {
  const A = S.active; let n = 0, v = 0;
  A.exercises.forEach(e => e.sets.forEach(s => { if (s.done) { n++; v += num(s.w) * num(s.r); } }));
  return `${n} sets · ${fmtN(v)} ${unit()}`;
}
function exCard(e, i) {
  const ex = lib(e.exId), prev = prevSets(e.exId);
  const complete = e.sets.length && e.sets.every(s => s.done);
  return `
  <section class="card ex ${complete ? 'complete' : ''}">
    <div class="ex-head">
      <div style="min-width:0">
        <div class="ex-name">${esc(ex.name)}</div>
        <div class="chips"><span class="chip">${esc(ex.muscle)}</span>${e.target ? `<span class="chip ghost">Target ${esc(e.target)} reps</span>` : ''}</div>
      </div>
      <div class="ex-tools">
        <button class="icon ${e.showVid ? 'on' : ''}" data-a="vid" data-i="${i}" aria-label="Reference video">${IC.play}</button>
        ${i ? `<button class="icon" data-a="ex-up" data-i="${i}" aria-label="Move up">${IC.up}</button>` : ''}
        <button class="icon" data-a="ex-rm" data-i="${i}" aria-label="Remove exercise">${IC.x}</button>
      </div>
    </div>
    ${e.showVid ? videoPanel(ex) : ''}
    <div class="sets">
      <div class="set-row hd"><span>Set</span><span>Previous</span><span>${unit()}</span><span>Reps</span><span></span></div>
      ${e.sets.map((s, j) => { const p = prev[j]; return `
      <div class="set-row ${s.done ? 'done' : ''}">
        <span class="sn">${j + 1}</span>
        <span class="prev">${p ? `${p.w} × ${p.r}` : '—'}</span>
        <input inputmode="decimal" data-i="${i}" data-j="${j}" data-f="w" value="${esc(s.w)}" placeholder="${p ? p.w : unit()}">
        <input inputmode="numeric" data-i="${i}" data-j="${j}" data-f="r" value="${esc(s.r)}" placeholder="${p ? p.r : esc(String(e.target || '').split('-').pop() || '0')}">
        <button class="chk" data-a="done" data-i="${i}" data-j="${j}" aria-label="Complete set">${IC.check}</button>
      </div>`; }).join('')}
    </div>
    <div class="ex-foot">
      <button class="btn sm" data-a="set-add" data-i="${i}">+ Add set</button>
      ${e.sets.length ? `<button class="btn sm ghost" data-a="set-rm" data-i="${i}">− Remove set</button>` : ''}
    </div>
  </section>`;
}
function videoPanel(ex) {
  const id = ytId(ex.video), q = encodeURIComponent(ex.name + ' proper form tutorial');
  return `<div class="vid">
    ${id ? `<div class="frame"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1" title="${esc(ex.name)} form video" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>`
         : `<p class="muted sm" style="margin:0 0 8px">No reference video yet. Tap <b>Find</b>, copy a video link, paste it here — it's saved for this exercise from now on.</p>`}
    <div class="row gap"><input class="in" placeholder="Paste YouTube link" data-vid="${ex.id}" value="${esc(ex.video || '')}"><a class="btn sm" style="height:44px" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${q}">Find</a></div>
  </div>`;
}

/* ---- Plans tab ---- */
function viewPlans() {
  if (editPlanId) return viewPlanEdit();
  const groups = MUSCLES.map(m => [m, S.library.filter(e => e.muscle === m).sort((a, b) => a.name.localeCompare(b.name))]).filter(g => g[1].length);
  return `
  <h2 style="margin-top:6px">Your plans</h2>
  ${S.plans.map(p => `
    <div class="card plan-card">
      <div class="grow"><div class="nm">${esc(p.name)}</div>
        <div class="muted sm ellip">${p.items.map(i => `${esc(lib(i.exId).name)} ${i.sets}×${esc(i.reps)}`).join(' · ') || 'No exercises'}</div></div>
      <button class="btn sm" data-a="plan-edit" data-id="${p.id}">Edit</button>
      <button class="btn sm acc" data-a="start" data-id="${p.id}">Start</button>
    </div>`).join('')}
  <button class="btn block" data-a="plan-new">+ New plan</button>
  <div class="row between"><h2>Exercise library</h2><button class="btn sm ghost" data-a="ex-new" style="margin-top:14px">+ Custom</button></div>
  <div class="card" style="padding:4px 14px">
    ${groups.map(([m, list]) => `<div class="xs muted" style="padding:12px 2px 2px;font-weight:600;letter-spacing:.06em;text-transform:uppercase">${m}</div>` +
      list.map(e => `<button class="li pick" data-a="ex-edit" data-id="${e.id}"><span class="vdot ${ytId(e.video) ? 'on' : ''}"></span><span class="grow t">${esc(e.name)}</span><span class="muted xs">${ytId(e.video) ? 'video' : 'add video'}</span></button>`).join('')).join('')}
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

/* ---- Progress tab ---- */
function viewProgress() {
  const ws = sorted();
  if (!ws.length) return `<h2 style="margin-top:6px">Progress</h2><div class="card empty">Finish your first workout and your charts will show up here.</div>`;
  const total = ws.reduce((a, w) => a + wVolume(w), 0);
  const avgMin = ws.reduce((a, w) => a + (w.end - w.start), 0) / ws.length / 6e4;
  const wk = weekStart(Date.now());
  const weeks = Array.from({ length: 8 }, (_, k) => { const t = wk - (7 - k) * 7 * 864e5; return { x: short(t), y: ws.filter(w => w.start >= t && w.start < t + 7 * 864e5).reduce((a, w) => a + wVolume(w), 0) }; });
  const used = [...new Set(ws.flatMap(w => w.exercises.map(e => e.exId)))];
  if (!used.includes(progEx)) progEx = used[0];
  const pts = [...ws].reverse().map(w => { const e = w.exercises.find(x => x.exId === progEx); return e && { x: short(w.start), y: r1(Math.max(...e.sets.map(s => e1rm(s.w, s.r)))) }; }).filter(Boolean);
  let best = null; ws.forEach(w => w.exercises.forEach(e => { if (e.exId === progEx) e.sets.forEach(s => { if (!best || s.w > best.w || (s.w === best.w && s.r > best.r)) best = { ...s, t: w.start }; }); }));
  const muscle = {}; ws.filter(w => w.start >= wk - 21 * 864e5).forEach(w => w.exercises.forEach(e => muscle[lib(e.exId).muscle] = (muscle[lib(e.exId).muscle] || 0) + e.sets.length));
  const mMax = Math.max(1, ...Object.values(muscle));
  return `
  <h2 style="margin-top:6px">Overview</h2>
  <div class="tiles" style="margin-top:0">
    <div class="tile"><div class="v">${ws.length}</div><div class="l">Workouts</div></div>
    <div class="tile"><div class="v">${fmtN(total)}</div><div class="l">Total ${unit()} lifted</div></div>
    <div class="tile"><div class="v">${Math.round(avgMin)}<span class="sm muted">m</span></div><div class="l">Avg duration</div></div>
  </div>
  <h2>Weekly volume</h2>
  <div class="card">${barChart(weeks)}</div>
  <h2>Strength — estimated 1-rep max</h2>
  <div class="card">
    <select class="in" data-prog-ex>${used.map(id => `<option value="${id}" ${id === progEx ? 'selected' : ''}>${esc(lib(id).name)}</option>`).join('')}</select>
    ${best ? `<div class="row between sm" style="margin-top:12px"><span class="muted">Best set</span><b>${best.w} ${unit()} × ${best.r} <span class="muted" style="font-weight:400">· ${short(best.t)}</span></b></div>` : ''}
    ${lineChart(pts, v => v + ' ' + unit())}
  </div>
  <h2>Sets per muscle · last 4 weeks</h2>
  <div class="card">${Object.entries(muscle).sort((a, b) => b[1] - a[1]).map(([m, n]) => `
    <div style="margin:6px 0"><div class="row between sm"><span>${m}</span><b>${n}</b></div>
    <div style="height:8px;border-radius:9px;background:var(--card2);margin-top:5px"><div style="height:100%;width:${n / mMax * 100}%;background:var(--acc);border-radius:9px"></div></div></div>`).join('') || '<div class="empty">No sets in the last 4 weeks.</div>'}</div>
  <h2>History</h2>
  <div class="card" style="padding:2px 14px">${ws.map(w => `
    <details class="w"><summary><div><div class="t" style="font-weight:600">${esc(w.name)}</div><div class="muted xs">${nice(w.start)} · ${Math.round((w.end - w.start) / 6e4)} min · ${fmtN(wVolume(w))} ${unit()}</div></div><span class="muted xs">${w.synced ? '✓ sheet' : ''}</span></summary>
      <div class="wd">${compareHTML(w)}
      ${w.notes ? `<p class="muted">${esc(w.notes)}</p>` : ''}
      <button class="btn sm danger" style="margin-top:8px" data-a="w-del" data-id="${w.id}">Delete workout</button></div>
    </details>`).join('')}</div>`;
}

/* ---- Body tab ---- */
const BODY_F = () => [['weight','Weight',unit()],['bf','Body fat','%'],['waist','Waist',lenUnit()],['chest','Chest',lenUnit()],['arms','Arms',lenUnit()],['thighs','Thighs',lenUnit()]];
function viewBody() {
  const list = [...S.body].sort((a, b) => b.date.localeCompare(a.date));
  const latest = list[0], prevE = list[1];
  const h = num(S.settings.height);
  const bmi = latest && latest.weight && h ? (unit() === 'kg' ? latest.weight / ((h / 100) ** 2) : 703 * latest.weight / (h ** 2)) : 0;
  const series = [...list].reverse().filter(b => b[bodyMetric] !== '' && b[bodyMetric] != null).map(b => ({ x: short(b.date + 'T12:00'), y: num(b[bodyMetric]) }));
  const F = BODY_F(), fm = F.find(f => f[0] === bodyMetric);
  return `
  <h2 style="margin-top:6px">Log body stats</h2>
  <div class="card">
    <label class="f">Date<div class="in datef"><span id="b_date_txt">${nice(Date.now())}</span>${IC.cal}<input type="date" id="b_date" value="${ymd(Date.now())}" aria-label="Date"></div></label>
    <div class="grid2" style="margin-top:10px">${F.map(([k, l, u]) => `<label class="f">${l} (${u})<input class="in" inputmode="decimal" id="b_${k}" placeholder="${latest && latest[k] !== '' ? latest[k] : ''}"></label>`).join('')}</div>
    <label class="f" style="margin-top:10px">Notes<input class="in" id="b_notes" placeholder="Sleep, diet, how you feel…"></label>
    <button class="btn acc block" data-a="body-save">Save entry</button>
  </div>
  ${latest ? `
  <h2>Latest · ${short(latest.date + 'T12:00')}</h2>
  <div class="tiles" style="margin-top:0">
    ${F.filter(([k]) => latest[k] !== '' && latest[k] != null).map(([k, l, u]) => { const d = prevE && prevE[k] !== '' ? r1(num(latest[k]) - num(prevE[k])) : null;
      return `<div class="tile"><div class="v">${latest[k]}<span class="sm muted"> ${u}</span></div><div class="l">${l} ${d ? `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d)}</span>` : ''}</div></div>`; }).join('')}
    ${bmi ? `<div class="tile"><div class="v">${r1(bmi)}</div><div class="l">BMI</div></div>` : ''}
  </div>
  <h2>Trend</h2>
  <div class="card">
    <div class="chips scroll" style="margin-top:0">${F.map(([k, l]) => `<button class="chip btnchip ${k === bodyMetric ? 'on' : ''}" data-a="bm" data-k="${k}">${l}</button>`).join('')}</div>
    ${lineChart(series, v => v + ' ' + fm[2])}
  </div>
  <h2>Entries</h2>
  <div class="card" style="padding:2px 14px">${list.map(b => `
    <div class="li"><div class="grow"><div class="t">${nice(b.date + 'T12:00')}</div>
      <div class="muted xs">${F.filter(([k]) => b[k] !== '' && b[k] != null).map(([k, l, u]) => `${l} ${b[k]}${u === '%' ? '%' : ' ' + u}`).join(' · ')}${b.notes ? ' · ' + esc(b.notes) : ''}</div></div>
      <button class="icon" data-a="b-del" data-id="${b.id}">${IC.x}</button></div>`).join('')}</div>` : ''}`;
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
