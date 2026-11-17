'use strict';
/* ---------- Phase 4: muscle analytics ---------- */
// Simple front/back figure. Each shape is tagged with a muscle id so it can be coloured and tapped.
const BODY_FRONT = [
  ['neck', 'M88 52h24v14H88z'], ['traps', 'M78 64l22-4 22 4-4 8H82z'],
  ['front-delts', 'M62 70c-10 2-16 12-16 24l14 2 8-18zM138 70c10 2 16 12 16 24l-14 2-8-18z'],
  ['side-delts', 'M46 94c-2-14 4-24 14-26l-2 8-6 20zM154 94c2-14-4-24-14-26l2 8 6 20z'],
  ['chest', 'M70 76h28v30c-12 4-24 2-30-6zM102 76h28l2 24c-6 8-18 10-30 6z'],
  ['biceps', 'M46 98l14-2 2 34-14 2zM154 98l-14-2-2 34 14 2z'],
  ['forearms', 'M48 134l14-2 0 40-12 0zM152 134l-14-2 0 40 12 0z'],
  ['abs', 'M86 110h28v54H86z'], ['obliques', 'M72 110l12 2v50l-10-6zM128 110l-12 2v50l10-6z'],
  ['quads', 'M74 172h24l-2 70H78zM102 172h24l-4 70h-18z'], ['calves', 'M78 252h16l-2 56H82zM106 252h16l-4 56h-10z'],
];
const BODY_BACK = [
  ['neck', 'M88 52h24v12H88z'], ['traps', 'M74 64l26-6 26 6-10 24H84z'],
  ['rear-delts', 'M60 70c-10 4-14 14-14 24l14 0 8-20zM140 70c10 4 14 14 14 24l-14 0-8-20z'],
  ['side-delts', 'M46 94c-2-14 2-22 12-26l-2 8-4 18zM154 94c2-14-2-22-12-26l2 8 4 18z'],
  ['upper-back', 'M70 78l14 10h32l14-10 2 22H68z'], ['lats', 'M68 102h64l-6 34-26 10-26-10z'],
  ['lower-back', 'M84 146h32l-2 22H86z'],
  ['triceps', 'M46 98l14 0 2 34-14 2zM154 98l-14 0-2 34 14 2z'],
  ['forearms', 'M48 134l14-2 0 40-12 0zM152 134l-14-2 0 40 12 0z'],
  ['glutes', 'M76 170h48l2 30c-12 6-40 6-52 0z'], ['hamstrings', 'M76 204h22l-2 46H80zM102 204h22l-4 46h-18z'],
  ['calves', 'M80 256h16l-2 52h-10zM104 256h16l-4 52h-10z'],
];
const MAJOR = ['chest', 'lats', 'upper-back', 'front-delts', 'side-delts', 'rear-delts', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'];
const heat = n => !n ? 'var(--track)' : n < WEEKLY_SETS.low / 2 ? '#7a5a1e' : n < WEEKLY_SETS.low ? '#c08a1e' : n <= WEEKLY_SETS.high ? '#ffd60a' : '#ff9f43';

function bodyMap(sets, sel) {
  const fig = (shapes, label) => `<svg viewBox="40 18 120 296" class="bmap" role="img" aria-label="${label} muscle map">
    <ellipse cx="100" cy="36" rx="13" ry="15" fill="var(--track)"/><text x="100" y="${18 + 292}" text-anchor="middle" fill="var(--muted)" font-size="9" font-family="Inter,system-ui">${label}</text>
    ${shapes.map(([m, d]) => `<path d="${d}" fill="${heat(sets[m])}" class="${m === sel ? 'sel' : ''}" data-a="muscle" data-v="${m}"><title>${MUSCLE_INFO[m].name}: ${round1(sets[m] || 0)} sets</title></path>`).join('')}</svg>`;
  return `<div class="bmaps">${fig(BODY_FRONT, 'Front')}${fig(BODY_BACK, 'Back')}</div>
    <div class="legend"><span><i style="background:var(--track)"></i>0</span><span><i style="background:#7a5a1e"></i>&lt;5</span><span><i style="background:#c08a1e"></i>5–9</span><span><i style="background:#ffd60a"></i>10–20</span><span><i style="background:#ff9f43"></i>20+</span></div>`;
}

function viewMuscles() {
  const now = Date.now(), W = S.workouts;
  if (!W.length) return emptyCard('No workouts yet', 'Finish a workout to see which muscles you trained, how often, and what needs more work.');
  const wk = startOfWeek(now);
  const range = ui.mRange === 'week' ? [wk, now + 1] : [startOfDay(now) - 29 * DAY, now + 1];
  const sets = muscleSets(W, lib, range[0], range[1]);
  const weeksBack = 8, labels = [], perGroup = {};
  for (let i = weeksBack - 1; i >= 0; i--) {
    const f = wk - i * WEEK, ms = muscleSets(W, lib, f, f + WEEK); labels.push(shortDate(f));
    const g = {}; for (const [m, n] of Object.entries(ms)) { const G = MUSCLE_INFO[m]?.group || 'Other'; g[G] = (g[G] || 0) + n; }
    for (const G of ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Glutes', 'Core']) (perGroup[G] = perGroup[G] || []).push(round1(g[G] || 0));
  }
  // Alerts use the average of the last two full weeks, and only once there are two weeks of history
  const twoWk = muscleSets(W, lib, wk - 2 * WEEK, wk), oldest = Math.min(...W.map(w => w.start));
  const alerts = oldest <= wk - 2 * WEEK ? MAJOR.map(m => [m, round1((twoWk[m] || 0) / 2)]).filter(([, n]) => n < WEEKLY_SETS.low).sort((a, b) => a[1] - b[1]) : [];
  const last = lastTrained(W, lib), freq = muscleFrequency(W, lib, now);
  const groups = Object.entries(perGroup).map(([G, arr]) => [G, arr[arr.length - 1] + (ui.mRange === 'month' ? 0 : 0)]);
  const dist = {}; for (const [m, n] of Object.entries(sets)) { const G = MUSCLE_INFO[m]?.group || 'Other'; if (G !== 'Cardio' && G !== 'Other') dist[G] = (dist[G] || 0) + n; }
  const sel = ui.muscle;
  return `${segBar([['week', 'This week'], ['month', 'Last 30 days']], ui.mRange, 'mrange')}
    <section class="card">${bodyMap(sets, sel)}<div class="muted xs" style="text-align:center;margin-top:6px">Working sets per muscle${ui.mRange === 'week' ? ' this week' : ' in the last 30 days'} · tap a muscle for its history</div></section>
    ${sel ? muscleDetail(sel, last, freq, now) : ''}
    ${alerts.length ? `<h2>Needs more work</h2><div class="card">${alerts.slice(0, 6).map(([m, n]) => `<button class="li pick" data-a="muscle" data-v="${m}"><span class="dotc" style="background:${heat(n)}"></span><span class="grow"><span class="t">${MUSCLE_INFO[m].name}</span><br><span class="muted xs">${n} sets/week lately · common guideline ${WEEKLY_SETS.low}–${WEEKLY_SETS.high}</span></span>${IC.chev}</button>`).join('')}
      <div class="muted xs" style="margin-top:8px">Guideline for muscle growth from research averages; your needs may differ.</div></div>` : ''}
    <h2>Sets per muscle</h2><div class="card">${MAJOR.concat(['traps', 'forearms', 'obliques', 'lower-back', 'neck']).filter(m => sets[m]).sort((a, b) => sets[b] - sets[a]).map(m => `
      <button class="mrow" data-a="muscle" data-v="${m}"><span class="t">${MUSCLE_INFO[m].name}</span><span class="mbar2"><i style="width:${Math.min(100, sets[m] / (WEEKLY_SETS.high * (ui.mRange === 'week' ? 1 : 4.3)) * 100)}%;background:${heat(ui.mRange === 'week' ? sets[m] : sets[m] / 4.3)}"></i></span><b>${round1(sets[m])}</b></button>`).join('') || '<div class="empty">No sets in this period.</div>'}</div>
    ${Object.keys(dist).length ? `<h2>Distribution</h2><div class="card">${doughnut2(Object.keys(dist), Object.values(dist).map(round1), Object.keys(dist).map(G => PALETTE[G]), { fmt: v => v + ' sets' })}</div>` : ''}
    <h2>Weekly sets by muscle group</h2><div class="card">${barChart2(labels, Object.entries(perGroup).map(([G, data]) => ({ label: G, data, backgroundColor: PALETTE[G] })), { stacked: true, legend: true, h: 230 })}</div>
    <h2>Recovery estimate</h2><div class="card">${MAJOR.filter(m => last[m]).sort((a, b) => last[b] - last[a]).map(m => { const r = recoveryEstimate(last[m], now); return `
      <div class="li"><span class="dotc lv${r.level}"></span><span class="grow"><span class="t">${MUSCLE_INFO[m].name}</span><br><span class="muted xs">${r.label} · trained ${ago(last[m])}</span></span><span class="muted xs">${freq[m] ? freq[m] + '×/wk' : ''}</span></div>`; }).join('') || '<div class="empty">Train a few sessions to see this.</div>'}
      <div class="muted xs" style="margin-top:8px">Estimated only from hours since you trained it (under 48 h, 48–72 h, over 72 h). It is not a measurement — sleep, food, effort and soreness all matter. Log soreness in Recovery.</div></div>`;
}
function muscleDetail(m, last, freq, now) {
  const wk = startOfWeek(now), labels = [], data = [];
  for (let i = 7; i >= 0; i--) { const f = wk - i * WEEK; labels.push(shortDate(f)); data.push(round1(muscleSets(S.workouts, lib, f, f + WEEK)[m] || 0)); }
  const hist = sorted().flatMap(w => w.exercises.filter(e => workSets(e).length && (musclesOf(lib(e.exId)).primary.includes(m) || musclesOf(lib(e.exId)).secondary.includes(m))).map(e => ({ w, e }))).slice(0, 12);
  const r = recoveryEstimate(last[m], now);
  return `<section class="card" style="border-color:var(--acc)">
    <div class="row between"><h3 style="margin:0">${MUSCLE_INFO[m].name}</h3><button class="icon sm" data-a="muscle" data-v="" aria-label="Close">${IC.x}</button></div>
    <div class="tiles" style="margin-top:10px"><div class="tile"><div class="v">${data[7]}</div><div class="l">Sets this week</div></div><div class="tile"><div class="v">${freq[m] || 0}×</div><div class="l">Days / week</div></div><div class="tile"><div class="v sm2">${last[m] ? ago(last[m]) : '—'}</div><div class="l">${r.label}</div></div></div>
    ${barChart2(labels, [{ data, backgroundColor: labels.map((_, k) => k === 7 ? ACC() : cssVar('--track')) }], { h: 150, fmt: v => v })}
    <h2 style="margin:12px 2px 6px">History</h2>${hist.map(({ w, e }) => `<div class="li"><span class="grow"><span class="t">${esc(e.name)}</span><br><span class="muted xs">${nice(w.start)} · ${workSets(e).map(setTxt).join(', ')}</span></span></div>`).join('') || '<div class="empty">Not trained yet.</div>'}
  </section>`;
}
ACT['mrange'] = b => { ui.mRange = b.dataset.v; render(); };
ACT['muscle'] = b => { ui.muscle = b.dataset.v === ui.muscle ? '' : b.dataset.v; render(); };
