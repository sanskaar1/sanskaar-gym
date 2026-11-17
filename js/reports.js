'use strict';
/* ---------- Phase 8: reports, calendar, records, awards, goals ---------- */
function reportData(kind, offset, now = Date.now()) {
  const { from, to } = periodBounds(kind, offset, now), W = S.workouts.filter(w => w.start >= from && w.start < to);
  const prs = W.flatMap(w => workoutPRs(w, S.workouts).map(p => ({ ...p, t: w.start })));
  const ms = muscleSets(S.workouts, lib, from, to), groups = {};
  for (const [m, n] of Object.entries(ms)) { const G = MUSCLE_INFO[m]?.group || 'Other'; if (G !== 'Other') groups[G] = round1((groups[G] || 0) + n); }
  const exCount = {}; W.forEach(w => w.exercises.forEach(e => { if (workSets(e).length) exCount[e.name] = (exCount[e.name] || 0) + workSets(e).length; }));
  const bodyIn = k => { const pts = bodySeries(S.body, k, from).filter(p => p.x < to); return pts.length ? seriesSummary(pts) : null; };
  const foodDays = [...new Set(S.food.filter(e => fromKey(e.date) >= from && fromKey(e.date) < to).map(e => e.date))];
  const fTot = foodDays.map(d => dayTotals(S.food.filter(e => e.date === d)));
  const days = S.days.filter(r => fromKey(r.id) >= from && fromKey(r.id) < to);
  const avg = (a, k) => { const v = a.map(x => x[k]).filter(x => x !== '' && x != null && !isNaN(+x)).map(Number); return v.length ? round1(v.reduce((s, x) => s + x, 0) / v.length) : null; };
  const weeks = Math.max(1, Math.round((Math.min(to, now) - from) / WEEK));
  return { kind, from, to, label: kind === 'week' ? `Week of ${shortDate(from)}` : kind === 'month' ? monthName(from) : String(new Date(from).getFullYear()),
    n: W.length, mins: Math.round(W.reduce((a, w) => a + (w.end - w.start), 0) / 6e4), sets: W.reduce((a, w) => a + workoutSets(w), 0), reps: W.reduce((a, w) => a + workoutReps(w), 0),
    vol: W.reduce((a, w) => a + workoutVolume(w), 0), prs, groups, top: Object.entries(exCount).sort((a, b) => b[1] - a[1]).slice(0, 5),
    weight: bodyIn('weight'), bf: bodyIn('bf'), waist: bodyIn('waist'),
    kcal: fTot.length ? Math.round(fTot.reduce((a, t) => a + t.kcal, 0) / fTot.length) : null, protein: fTot.length ? Math.round(fTot.reduce((a, t) => a + t.p, 0) / fTot.length) : null, foodDays: foodDays.length,
    sleep: avg(days, 'sleep'), fatigue: avg(days, 'fatigue'), perWeek: round1(W.length / weeks) };
}

function viewReports() {
  const now = Date.now(), r = reportData(ui.rPeriod, ui.rOffset, now);
  const score = consistencyScore(S.workouts, S.settings.weeklyGoal, now), streak = weekStreak(S.workouts, now);
  return `${segBar([['week', 'Week'], ['month', 'Month'], ['year', 'Year']], ui.rPeriod, 'rperiod')}
    <div class="daynav"><button class="icon" data-a="roff" data-d="-1" aria-label="Earlier">${IC.back}</button><div class="grow" style="text-align:center"><b>${r.label}</b></div>
      <button class="icon" data-a="roff" data-d="1" aria-label="Later" ${ui.rOffset >= 0 ? 'disabled style="opacity:.3"' : ''}><span style="display:inline-block;transform:rotate(180deg)">${IC.back}</span></button></div>
    <section class="card report" id="reportCard">
      <div class="tiles" style="margin-top:0"><div class="tile"><div class="v">${r.n}</div><div class="l">Workouts</div></div><div class="tile"><div class="v">${Math.round(r.mins / 60 * 10) / 10}<small> h</small></div><div class="l">Training time</div></div><div class="tile"><div class="v">${fmtN(r.vol)}</div><div class="l">${unit()} volume</div></div></div>
      <div class="tiles"><div class="tile"><div class="v">${r.sets}</div><div class="l">Working sets</div></div><div class="tile"><div class="v">${r.prs.length}</div><div class="l">Records</div></div><div class="tile"><div class="v">${r.perWeek}</div><div class="l">Per week</div></div></div>
      ${Object.keys(r.groups).length ? `<h2 style="margin:14px 2px 6px">Sets by muscle group</h2>${Object.entries(r.groups).sort((a, b) => b[1] - a[1]).map(([G, n]) => `<div class="mrow"><span class="t">${G}</span><span class="mbar2"><i style="width:${n / Math.max(...Object.values(r.groups)) * 100}%;background:${PALETTE[G]}"></i></span><b>${n}</b></div>`).join('')}` : ''}
      ${r.top.length ? `<h2 style="margin:14px 2px 6px">Most trained</h2><div class="chips">${r.top.map(([n, c]) => `<span class="chip">${esc(n)} · ${c} sets</span>`).join('')}</div>` : ''}
      ${r.prs.length ? `<h2 style="margin:14px 2px 6px">Records</h2>${r.prs.slice(0, 8).map(p => `<div class="pr">${IC.trophy}<span>${esc(p.name)} — ${p.kind === 'e1' ? 'est. 1RM' : 'heaviest'} ${p.value} ${unit()} <small class="muted">(was ${p.was}) · ${shortDate(p.t)}</small></span></div>`).join('')}` : ''}
      ${r.weight || r.bf || r.waist ? `<h2 style="margin:14px 2px 6px">Body</h2><div class="chips">${[['weight', 'Weight', unit()], ['bf', 'Body fat', '%'], ['waist', 'Waist', lenUnit()]].filter(([k]) => r[k]).map(([k, l, u]) => `<span class="chip">${l} ${r[k].start}→${r[k].current}${u === '%' ? '%' : ' ' + u} (${signedN(r[k].change)})</span>`).join('')}</div>` : ''}
      ${r.kcal != null || r.sleep != null ? `<h2 style="margin:14px 2px 6px">Food & recovery</h2><div class="chips">${r.kcal != null ? `<span class="chip">${r.kcal.toLocaleString()} kcal/day</span><span class="chip">${r.protein} g protein/day</span><span class="chip">${r.foodDays} days logged</span>` : ''}${r.sleep != null ? `<span class="chip">${r.sleep} h sleep</span>` : ''}${r.fatigue != null ? `<span class="chip">Energy: ${FATIGUE[Math.round(r.fatigue)]}</span>` : ''}</div>` : ''}
    </section>
    <div class="row gap"><button class="btn" style="flex:1" data-a="share-img">Share as image</button><button class="btn" style="flex:1" data-a="share-pdf">Save PDF</button></div>
    <h2>Consistency</h2><section class="card"><div class="row" style="gap:16px;align-items:center">${ring(score, 100, score >= 80 ? '#69db7c' : score >= 50 ? '#ffd60a' : '#ff8787', score + '%', 'score', 92)}
      <div class="grow sm">How often you hit your goal of <b>${S.settings.weeklyGoal}</b> workouts a week over the last 8 finished weeks (a week with ${Math.ceil(S.settings.weeklyGoal / 2)} of ${S.settings.weeklyGoal} counts as half).<div class="muted xs" style="margin-top:6px">Current streak: <b>${streak}</b> week${streak === 1 ? '' : 's'} in a row with a workout.</div></div></div></section>
    <h2>Training calendar</h2>${calendar(ui.rPeriod === 'month' ? ui.rOffset : 0, now)}
    <h2>Personal records</h2>${recordsList()}`;
}
ACT['rperiod'] = b => { ui.rPeriod = b.dataset.v; ui.rOffset = 0; render(); };
ACT['roff'] = b => { ui.rOffset = Math.min(0, ui.rOffset + +b.dataset.d); render(); };

function calendar(offset, now) {
  const { from, to } = periodBounds('month', offset, now), first = new Date(from), lead = (first.getDay() + 6) % 7;
  const days = Math.round((to - from) / DAY), wDays = new Set(S.workouts.map(w => ymd(w.start))), rest = new Set(S.days.filter(d => d.rest).map(d => d.id));
  let cells = Array.from({ length: lead }, () => '<span></span>');
  for (let i = 0; i < days; i++) { const k = ymd(from + i * DAY + 12 * 36e5); cells.push(`<span class="cd ${wDays.has(k) ? 'w' : rest.has(k) ? 'r' : ''} ${k === ymd(now) ? 'today' : ''}">${i + 1}</span>`); }
  return `<section class="card"><div class="row between sm"><b>${monthName(from)}</b><span class="muted xs">${S.workouts.filter(w => w.start >= from && w.start < to).length} workouts</span></div>
    <div class="cal">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<i>${d}</i>`).join('')}${cells.join('')}</div>
    <div class="legend" style="justify-content:flex-start"><span><i style="background:#ffd60a"></i>Workout</span><span><i style="background:#3b4a5e"></i>Rest day</span></div></section>`;
}
function recordsList() {
  const rec = Object.values(personalRecords(S.workouts)).filter(r => r.e1 > 0).sort((a, b) => b.e1 - a.e1);
  if (!rec.length) return emptyCard('No records yet', 'Your best lifts appear here as you train.');
  return `<div class="card" style="padding:4px 14px">${rec.map(r => `<button class="li pick" data-a="ex-info" data-id="${r.exId}"><span class="grow" style="min-width:0"><span class="t ellip">${esc(r.name)}</span><br><span class="muted xs">Best set ${r.e1Set.w}×${r.e1Set.r} on ${shortDate(r.e1At)} · heaviest ${r.heavy} ${unit()}</span></span><b>${round1(r.e1)}</b></button>`).join('')}
    <div class="muted xs" style="margin:6px 0 8px">Number on the right: estimated 1-rep max (${unit()}), from your best set.</div></div>`;
}

/* ---------- export: image and PDF ---------- */
function drawReport(r) {
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#0b0d10'; g.fillRect(0, 0, W, H);
  const grad = g.createLinearGradient(0, 0, W, 0); grad.addColorStop(0, '#2a2510'); grad.addColorStop(1, '#0b0d10'); g.fillStyle = grad; g.fillRect(0, 0, W, 300);
  const txt = (t, x, y, size, color = '#e9ecef', weight = 700, align = 'left') => { g.font = `${weight} ${size}px Inter, system-ui, sans-serif`; g.fillStyle = color; g.textAlign = align; g.fillText(t, x, y); };
  txt('Sanskaar ', 70, 110, 52); g.font = '800 52px Inter, system-ui'; const sw = g.measureText('Sanskaar ').width; txt('GYM', 70 + sw, 110, 52, '#ffd60a', 800);
  txt(r.label, 70, 190, 44, '#e9ecef', 600); txt(`${r.kind[0].toUpperCase() + r.kind.slice(1)} report`, 70, 245, 30, '#8b929c', 500);
  const tiles = [[r.n, 'workouts'], [Math.round(r.mins / 6) / 10 + ' h', 'training'], [fmtN(r.vol), unit() + ' volume'], [r.sets, 'working sets'], [r.prs.length, 'records'], [r.perWeek, 'per week']];
  tiles.forEach(([v, l], i) => { const x = 70 + (i % 3) * 320, y = 340 + Math.floor(i / 3) * 190; g.fillStyle = '#14171c'; g.beginPath(); g.roundRect(x, y, 290, 160, 24); g.fill(); txt(String(v), x + 30, y + 90, 64, '#ffd60a', 800); txt(l, x + 30, y + 132, 26, '#8b929c', 500); });
  let y = 760; txt('Sets by muscle group', 70, y, 32, '#e9ecef', 700); y += 30;
  const gs = Object.entries(r.groups).sort((a, b) => b[1] - a[1]).slice(0, 6), mx = Math.max(1, ...gs.map(x => x[1]));
  gs.forEach(([G, n]) => { y += 52; txt(G, 70, y, 26, '#c4c9cf', 500); g.fillStyle = '#232831'; g.beginPath(); g.roundRect(300, y - 22, 620, 22, 11); g.fill(); g.fillStyle = PALETTE[G] || '#ffd60a'; g.beginPath(); g.roundRect(300, y - 22, Math.max(22, 620 * n / mx), 22, 11); g.fill(); txt(String(n), 1010, y, 26, '#e9ecef', 700, 'right'); });
  y += 80; if (r.prs.length) { txt('Records', 70, y, 32); r.prs.slice(0, 3).forEach(p => { y += 46; txt(`🏆 ${p.name} — ${p.value} ${unit()}`, 70, y, 26, '#c4c9cf', 500); }); }
  if (r.weight) { y += 60; txt(`Weight ${r.weight.start} → ${r.weight.current} ${unit()} (${signedN(r.weight.change)})`, 70, y, 28, '#c4c9cf', 500); }
  txt('Made with Sanskaar GYM', W / 2, H - 50, 24, '#5c636c', 500, 'center');
  return c;
}
async function shareFile(blob, name) {
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  download(name, blob, blob.type);
}
ACT['share-img'] = () => { const r = reportData(ui.rPeriod, ui.rOffset); drawReport(r).toBlob(b => shareFile(b, `sanskaar-gym-${r.kind}-${ymd(r.from)}.png`), 'image/png'); };
let jspdfLoading;
ACT['share-pdf'] = async () => {
  toast('Making PDF…');
  if (!window.jspdf) await (jspdfLoading = jspdfLoading || new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'vendor/jspdf.umd.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); })).catch(() => {});
  if (!window.jspdf) return toast("Couldn't load the PDF maker — try Share as image");
  const r = reportData(ui.rPeriod, ui.rOffset), c = drawReport(r), pdf = new jspdf.jsPDF({ unit: 'px', format: [1080, 1350] });
  pdf.addImage(c.toDataURL('image/jpeg', .92), 'JPEG', 0, 0, 1080, 1350);
  shareFile(pdf.output('blob'), `sanskaar-gym-${r.kind}-${ymd(r.from)}.pdf`);
};

/* ---------- achievements ---------- */
const AWARDS = [
  ['first', '🎉', 'First workout', () => S.workouts.length >= 1],
  ['w10', '💪', '10 workouts', () => S.workouts.length >= 10], ['w50', '🔥', '50 workouts', () => S.workouts.length >= 50], ['w100', '🏅', '100 workouts', () => S.workouts.length >= 100], ['w250', '👑', '250 workouts', () => S.workouts.length >= 250],
  ['s4', '📆', '4-week streak', () => weekStreak(S.workouts, Date.now()) >= 4], ['s12', '⚡', '12-week streak', () => weekStreak(S.workouts, Date.now()) >= 12], ['s26', '🌟', '26-week streak', () => weekStreak(S.workouts, Date.now()) >= 26],
  ['v10k', '🏋️', '10,000 total volume', () => S.workouts.reduce((a, w) => a + workoutVolume(w), 0) >= 10000], ['v100k', '🚀', '100,000 total volume', () => S.workouts.reduce((a, w) => a + workoutVolume(w), 0) >= 100000],
  ['pr1', '🏆', 'First record broken', () => S.workouts.some(w => workoutPRs(w, S.workouts).length)],
  ['body5', '📏', '5 body check-ins', () => S.body.length >= 5], ['photo1', '📸', 'First progress photo', () => S.photos.length >= 1],
  ['food7', '🥗', 'Food logged 7 days', () => new Set(S.food.map(e => e.date)).size >= 7], ['goal1', '🎯', 'First goal reached', () => S.goals.some(g => g.doneAt)],
];
function checkAwards() {
  S.settings.awards = S.settings.awards || {};
  let got = null;
  for (const [id, icon, name, test] of AWARDS) if (!S.settings.awards[id]) { try { if (test()) { S.settings.awards[id] = Date.now(); got = `${icon} ${name}`; } } catch (e) {} }
  if (got) { save(); setTimeout(() => { haptic('success'); toast('Achievement unlocked: ' + got); }, 600); }
}

/* ---------- goals ---------- */
const GOAL_METRICS = () => BODY_F().map(([k, l, u]) => [k, l, u]);
function goalProgress(g) {
  if (g.type === 'body') {
    const pts = bodySeries(S.body, g.metric); if (!pts.length) return { pct: 0, now: null, txt: 'No entries yet' };
    const start = g.start ?? pts.find(p => p.x >= g.at - DAY)?.y ?? pts[0].y, now = pts[pts.length - 1].y, total = g.target - start;
    const pctDone = total ? Math.max(0, Math.min(1, (now - start) / total)) : 1;
    return { pct: pctDone, now, txt: `${now} now · started at ${start}` };
  }
  if (g.type === 'strength') {
    const rec = personalRecords(S.workouts)[g.exId], best = rec ? rec.e1 : 0, target = epley(g.weight, g.reps);
    const hit = S.workouts.some(w => w.start >= g.at && w.exercises.some(e => e.exId === g.exId && workSets(e).some(s => +s.w >= g.weight && +s.r >= g.reps)));
    return { pct: hit ? 1 : Math.min(.99, best / target), now: round1(best), txt: hit ? 'Done!' : `Best est. 1RM ${round1(best)} · target ≈ ${round1(target)}` };
  }
  const wk = startOfWeek(Date.now()), n = S.workouts.filter(w => w.start >= wk).length;
  return { pct: Math.min(1, n / g.perWeek), now: n, txt: `${n} of ${g.perWeek} this week` };
}
function viewGoals() {
  S.goals.forEach(g => { if (!g.doneAt && g.type !== 'weekly' && goalProgress(g).pct >= 1) { g.doneAt = Date.now(); save(); checkAwards(); } });
  const earned = AWARDS.filter(([id]) => S.settings.awards?.[id]);
  return `<div class="page-h"><button class="icon" data-a="profile-back" aria-label="Back">${IC.back}</button><h3>Goals & achievements</h3></div>
    <button class="btn acc block" data-a="goal-add" style="margin-top:0">+ New goal</button>
    ${S.goals.length ? S.goals.map(g => { const p = goalProgress(g), m = GOAL_METRICS().find(x => x[0] === g.metric);
      const title = g.type === 'body' ? `${m?.[1]} → ${g.target}${m?.[2] === '%' ? '%' : ' ' + m?.[2]}` : g.type === 'strength' ? `${lib(g.exId).name}: ${g.weight} ${unit()} × ${g.reps}` : `${g.perWeek} workouts every week`;
      return `<section class="card goal ${g.doneAt ? 'done' : ''}"><div class="row between"><div class="t">${g.doneAt ? '✅ ' : ''}${esc(title)}</div><button class="icon sm" data-a="goal-del" data-id="${g.id}" aria-label="Delete goal">${IC.x}</button></div>
        ${bar(p.pct * 100, 100, g.doneAt ? '#69db7c' : '#ffd60a')}<div class="row between xs muted" style="margin-top:6px"><span>${esc(p.txt)}</span><span>${Math.round(p.pct * 100)}%${g.by ? ' · by ' + shortDate(fromKey(g.by)) : ''}</span></div></section>`; }).join('')
      : emptyCard('No goals yet', 'Set a body goal (weight, waist…), a strength goal (e.g. bench 100 kg × 5) or a weekly workout goal.')}
    <h2>Achievements · ${earned.length}/${AWARDS.length}</h2><div class="awards">${AWARDS.map(([id, icon, name]) => { const at = S.settings.awards?.[id]; return `<div class="aw ${at ? 'on' : ''}"><span>${at ? icon : '🔒'}</span><b>${name}</b><small>${at ? shortDate(at) : 'Locked'}</small></div>`; }).join('')}</div>`;
}
ACT['goal-add'] = () => {
  ui.goalType = ui.goalType || 'body';
  const lifts = [...new Set(S.workouts.flatMap(w => w.exercises.map(e => e.exId)))].map(id => lib(id)).concat(S.library).filter((e, i, a) => a.findIndex(x => x.id === e.id) === i);
  openSheet(`<div class="sheet-h"><h3>New goal</h3><button class="icon" data-a="close">${IC.x}</button></div>
    ${segBar([['body', 'Body'], ['strength', 'Strength'], ['weekly', 'Weekly']], ui.goalType, 'goal-type')}
    <div style="margin-top:12px">${ui.goalType === 'body' ? `<div class="grid2"><label class="f">Measurement<select class="in" id="g_m">${GOAL_METRICS().map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label><label class="f">Target<input class="in" inputmode="decimal" id="g_t"></label></div><label class="f">By (optional)<input class="in" type="date" id="g_by"></label>`
      : ui.goalType === 'strength' ? `<label class="f">Exercise<select class="in" id="g_ex">${lifts.map(e => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></label><div class="grid2"><label class="f">Weight (${unit()})<input class="in" inputmode="decimal" id="g_w"></label><label class="f">Reps<input class="in" inputmode="numeric" id="g_r" value="1"></label></div><label class="f">By (optional)<input class="in" type="date" id="g_by"></label>`
      : `<label class="f">Workouts per week<input class="in" inputmode="numeric" id="g_n" value="${S.settings.weeklyGoal}"></label>`}</div>
    <button class="btn acc block" data-a="goal-save">Save goal</button>`);
};
ACT['goal-type'] = b => { ui.goalType = b.dataset.v; ACT['goal-add'](); };
ACT['goal-save'] = () => {
  const g = { id: uid(), type: ui.goalType, at: Date.now(), by: $('#g_by')?.value || '' };
  if (g.type === 'body') { g.metric = $('#g_m').value; g.target = num($('#g_t').value); if (!g.target) return toast('Enter a target'); const pts = bodySeries(S.body, g.metric); g.start = pts.length ? pts[pts.length - 1].y : null; }
  else if (g.type === 'strength') { g.exId = $('#g_ex').value; g.weight = num($('#g_w').value); g.reps = Math.max(1, Math.round(num($('#g_r').value))); if (!g.weight) return toast('Enter a weight'); }
  else { g.perWeek = Math.max(1, Math.round(num($('#g_n').value))); S.settings.weeklyGoal = g.perWeek; }
  S.goals.push(g); save(); closeSheet(); render(); haptic('success');
};
ACT['goal-del'] = b => ask('Delete this goal?', 'Delete', () => { S.goals = S.goals.filter(g => g.id !== b.dataset.id); save(); render(); });
