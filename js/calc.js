'use strict';
function prevSets(exId) {
  for (const w of sorted()) { const e = w.exercises.find(x => x.exId === exId); if (e) return e.sets; }
  return [];
}
function bestE1(exId, skipId) {
  let b = 0;
  for (const w of S.workouts) if (w.id !== skipId) for (const e of w.exercises) if (e.exId === exId) for (const s of e.sets) b = Math.max(b, e1rm(s.w, s.r));
  return b;
}
const wVolume = w => w.exercises.reduce((a, e) => a + e.sets.reduce((b, s) => b + s.w * s.r, 0), 0);

/* ---------- this session vs last time ---------- */
const exVol = e => e.sets.reduce((a, s) => a + s.w * s.r, 0);
const exReps = e => e.sets.reduce((a, s) => a + s.r, 0);
const wSets = w => w.exercises.reduce((a, e) => a + e.sets.length, 0);
const wReps = w => w.exercises.reduce((a, e) => a + exReps(e), 0);
const before = w => sorted().filter(x => x.id !== w.id && x.start < w.start);
// The last time this same plan was done (or a workout with the same name, for ones started empty)
const lastSession = w => before(w).find(x => w.planId ? x.planId === w.planId : x.name.trim().toLowerCase() === w.name.trim().toLowerCase());
// Each exercise is compared with the last time you did that exercise, whichever day it was on
const lastEx = (exId, w) => { for (const x of before(w)) { const e = x.exercises.find(e => e.exId === exId); if (e) return e; } return null; };
const signed = (d, dp) => (d > 0 ? '+' : d < 0 ? '−' : '') + Math.abs(dp ? r1(d) : Math.round(d)).toLocaleString();
function dTxt(now, was, u, sep = ' · ') {
  if (!was) return '';
  const d = now - was, p = d / was * 100;
  if (Math.abs(p) < 0.05) return `<span class="lower">same as last time</span>`;
  return `<span class="${d > 0 ? 'better' : 'lower'}">${d > 0 ? '▲' : '▼'} ${signed(d)}${u ? ' ' + u : ''}${sep}${signed(p, 1)}%</span>`;
}
function compareHTML(w) {
  const prev = lastSession(w);
  const rows = w.exercises.map(e => {
    const p = lastEx(e.exId, w); if (!p) return { e, p };
    const reps = !exVol(e) && !exVol(p); // bodyweight work: compare reps instead of volume
    return { e, p, now: reps ? exReps(e) : exVol(e), was: reps ? exReps(p) : exVol(p), u: reps ? 'reps' : unit() };
  });
  let head = !prev && !rows.some(r => r.p) ? `<div class="cmp-head flat"><div class="big">First time 🎯</div><div class="muted sm" style="margin-top:4px">This session is the baseline. Next time you'll see exactly how much you beat it.</div></div>` : '';
  if (prev) {
    const v = wVolume(w), pv = wVolume(prev), pct = pv ? (v - pv) / pv * 100 : 0;
    const up = pct >= 0.05, down = pct <= -0.05;
    head = `<div class="cmp-head ${up ? '' : 'flat'}">
      <div class="muted xs">vs last ${esc(prev.name)} · ${nice(prev.start)}</div>
      <div class="big" style="margin-top:4px">${up ? `🔥 ${signed(v - pv)} ${unit()} more · ${signed(pct, 1)}%` : down ? `${Math.abs(r1(pct))}% under last time` : 'Matched last time'}</div>
      <div class="muted sm" style="margin-top:2px">${up ? 'Total weight moved went up. Keep stacking it.' : down ? 'Lighter day — fine as long as the trend goes up.' : 'Same total weight moved. Add a rep next time.'}</div>
    </div>
    <div class="tiles">
      <div class="tile"><div class="v">${Math.round(v).toLocaleString()}</div><div class="l">${unit()} volume</div><div class="d">${dTxt(v, pv, '', '<br>')}</div></div>
      <div class="tile"><div class="v">${wSets(w)}</div><div class="l">Sets</div><div class="d">${dTxt(wSets(w), wSets(prev), '', '<br>')}</div></div>
      <div class="tile"><div class="v">${wReps(w)}</div><div class="l">Reps</div><div class="d">${dTxt(wReps(w), wReps(prev), '', '<br>')}</div></div>
    </div>`;
  }
  const list = rows.map(({ e, p, now, was, u }) => `<div class="cmp-ex"><div style="min-width:0"><div class="n ellip">${esc(e.name)}</div>
      <div class="x ellip">${p ? `${p.sets.map(s => `${s.w}×${s.r}`).join(', ')} → <b style="color:var(--text)">${e.sets.map(s => `${s.w}×${s.r}`).join(', ')}</b>` : e.sets.map(s => `${s.w}×${s.r}`).join(', ')}</div></div>
      <div class="r">${p ? `${signed(now - was)} ${u}<small>${was ? `<span class="${now > was ? 'better' : 'lower'}">${signed((now - was) / was * 100, 1)}%</span>` : ''}</small>` : '<span class="better">New</span>'}</div></div>`).join('');
  return head + `<h2 style="margin:18px 2px 4px">Exercise by exercise</h2><div>${list}</div>`;
}
