'use strict';
/* ---------- calculations ----------
 * Pure functions over the app's data (no screen code), shared by every analytics screen and unit-tested.
 * Warm-up sets (t === 'w') never count toward volume, sets, records or comparisons.
 */
const DAY = 864e5, WEEK = 7 * DAY;
const isWork = s => s && s.t !== 'w';
const workSets = e => (e.sets || []).filter(isWork);
const epley = (w, r) => r <= 0 ? 0 : r === 1 ? w : w * (1 + r / 30);
const brzycki = (w, r) => r <= 0 || r >= 37 ? 0 : r === 1 ? w : w * 36 / (37 - r);
const round1 = n => Math.round(n * 10) / 10;
const startOfDay = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const startOfWeek = t => { const d = new Date(startOfDay(t)); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); };
const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const fromKey = k => new Date(k + 'T12:00').getTime();

/* --- sets, volume, records --- */
const setVolume = s => (+s.w || 0) * (+s.r || 0);
const exerciseVolume = e => workSets(e).reduce((a, s) => a + setVolume(s), 0);
const exerciseReps = e => workSets(e).reduce((a, s) => a + (+s.r || 0), 0);
const workoutVolume = w => (w.exercises || []).reduce((a, e) => a + exerciseVolume(e), 0);
const workoutSets = w => (w.exercises || []).reduce((a, e) => a + workSets(e).length, 0);
const workoutReps = w => (w.exercises || []).reduce((a, e) => a + exerciseReps(e), 0);
const bestSetE1 = e => Math.max(0, ...workSets(e).map(s => epley(+s.w || 0, +s.r || 0)));

// All-time records per exercise: best estimated 1RM, heaviest weight, most reps in a set
function personalRecords(workouts) {
  const rec = {};
  for (const w of [...workouts].sort((a, b) => a.start - b.start)) for (const e of w.exercises || []) for (const s of workSets(e)) {
    const r = rec[e.exId] || (rec[e.exId] = { exId: e.exId, name: e.name, e1: 0, e1At: 0, e1Set: null, heavy: 0, heavyAt: 0, heavyReps: 0, reps: 0, repsAt: 0 });
    const v = epley(+s.w || 0, +s.r || 0);
    if (v > rec[e.exId].e1) Object.assign(r, { e1: v, e1At: w.start, e1Set: { w: +s.w, r: +s.r } });
    if ((+s.w || 0) > r.heavy) Object.assign(r, { heavy: +s.w, heavyAt: w.start, heavyReps: +s.r });
    if ((+s.r || 0) > r.reps) Object.assign(r, { reps: +s.r, repsAt: w.start });
  }
  return rec;
}
// Records set in one workout compared with everything before it
function workoutPRs(w, workouts) {
  const before = personalRecords(workouts.filter(x => x.id !== w.id && x.start < w.start)), out = [];
  for (const e of w.exercises || []) {
    const b = before[e.exId], ws = workSets(e); if (!ws.length || !b) continue;
    const e1 = bestSetE1(e), heavy = Math.max(...ws.map(s => +s.w || 0));
    if (e1 > b.e1 + 0.01) out.push({ exId: e.exId, name: e.name, kind: 'e1', value: round1(e1), was: round1(b.e1) });
    else if (heavy > b.heavy) out.push({ exId: e.exId, name: e.name, kind: 'heavy', value: heavy, was: b.heavy });
  }
  return out;
}

/* --- plate calculator --- */
// Plates for one side of the bar, largest first. Returns { perSide: [..], remainder } (remainder > 0 means it can't be made exactly)
function platesFor(target, bar, plateList) {
  const plates = String(plateList).split(',').map(Number).filter(n => n > 0).sort((a, b) => b - a);
  let side = round2((target - bar) / 2); const perSide = [];
  if (side < 0) return { perSide: [], remainder: round2(target - bar), under: true };
  for (const p of plates) while (side >= p - 1e-9) { perSide.push(p); side = round2(side - p); }
  return { perSide, remainder: round2(side * 2) };
}
const round2 = n => Math.round(n * 100) / 100;
// Percentages of a 1RM for planning
const percentTable = one => [100, 95, 90, 85, 80, 75, 70, 65, 60].map(p => ({ p, w: round1(one * p / 100) }));

/* --- muscles --- */
// Working sets per muscle: 1 for each primary muscle, 0.5 for each secondary
function muscleSets(workouts, libFn, from, to) {
  const out = {};
  for (const w of workouts) if (w.start >= from && w.start < to) for (const e of w.exercises || []) {
    const n = workSets(e).length; if (!n) continue;
    const m = musclesOf(libFn(e.exId));
    m.primary.forEach(k => { out[k] = (out[k] || 0) + n; });
    m.secondary.forEach(k => { out[k] = (out[k] || 0) + n * 0.5; });
  }
  return out;
}
// When each muscle was last trained with at least 2 working sets as a primary muscle
function lastTrained(workouts, libFn) {
  const out = {};
  for (const w of workouts) for (const e of w.exercises || []) {
    if (workSets(e).length < 2) continue;
    for (const k of musclesOf(libFn(e.exId)).primary) out[k] = Math.max(out[k] || 0, w.end || w.start);
  }
  return out;
}
// Rough guide from time since training only. Not a measurement: sleep, food, effort and age all change it.
function recoveryEstimate(lastAt, now) {
  if (!lastAt) return { label: 'No recent training', level: 0, hours: null };
  const h = (now - lastAt) / 36e5;
  if (h < 48) return { label: 'Likely still recovering', level: 1, hours: h };
  if (h < 72) return { label: 'Probably ready', level: 2, hours: h };
  return { label: 'Likely recovered', level: 3, hours: h };
}
// Days per week each muscle was trained, averaged over the last `weeks` full weeks
function muscleFrequency(workouts, libFn, now, weeks = 4) {
  const end = startOfWeek(now), from = end - weeks * WEEK, days = {};
  for (const w of workouts) if (w.start >= from && w.start < end) for (const e of w.exercises || []) {
    if (!workSets(e).length) continue;
    for (const k of musclesOf(libFn(e.exId)).primary) (days[k] = days[k] || new Set()).add(dayKey(w.start));
  }
  return Object.fromEntries(Object.entries(days).map(([k, s]) => [k, round1(s.size / weeks)]));
}

/* --- body --- */
const RANGES = { '7D': 7, '30D': 30, '3M': 91, '6M': 182, '1Y': 365, All: 0 };
const rangeFrom = (range, now) => RANGES[range] ? startOfDay(now) - (RANGES[range] - 1) * DAY : 0;
// Points for one measurement, oldest first. Entries without that measurement are skipped (never filled in).
function bodySeries(body, key, from = 0) {
  return body.filter(b => b[key] !== '' && b[key] != null && !isNaN(+b[key]) && fromKey(b.date) >= from)
    .sort((a, b) => a.date.localeCompare(b.date)).map(b => ({ x: fromKey(b.date), y: +b[key], date: b.date }));
}
const bmiOf = (weight, height, unit) => !weight || !height ? 0 : unit === 'kg' ? weight / ((height / 100) ** 2) : 703 * weight / (height ** 2);
const pct = (now, was) => was ? (now - was) / was * 100 : 0;
function seriesSummary(pts) {
  if (!pts.length) return null;
  const first = pts[0], last = pts[pts.length - 1];
  return { start: first.y, current: last.y, change: round1(last.y - first.y), pct: round1(pct(last.y, first.y)), from: first.date, to: last.date, min: Math.min(...pts.map(p => p.y)), max: Math.max(...pts.map(p => p.y)), n: pts.length };
}

/* --- consistency, streaks, reports --- */
// Average over the last `weeks` finished weeks of (workouts that week / weekly goal), capped at 100%
function consistencyScore(workouts, goal, now, weeks = 8) {
  goal = Math.max(1, +goal || 1);
  const end = startOfWeek(now); let sum = 0;
  for (let i = 1; i <= weeks; i++) { const from = end - i * WEEK; sum += Math.min(1, workouts.filter(w => w.start >= from && w.start < from + WEEK).length / goal); }
  return Math.round(sum / weeks * 100);
}
function weekStreak(workouts, now) {
  const has = t => workouts.some(w => w.start >= t && w.start < t + WEEK);
  let t = startOfWeek(now), n = 0;
  if (!has(t)) t -= WEEK; // this week still counts if you haven't trained yet
  while (has(t)) { n++; t -= WEEK; }
  return n;
}
function periodBounds(kind, offset, now) {
  const d = new Date(startOfDay(now));
  if (kind === 'week') { const s = startOfWeek(now) + offset * WEEK; return { from: s, to: s + WEEK }; }
  if (kind === 'month') { const s = new Date(d.getFullYear(), d.getMonth() + offset, 1).getTime(); const e = new Date(d.getFullYear(), d.getMonth() + offset + 1, 1).getTime(); return { from: s, to: e }; }
  const s = new Date(d.getFullYear() + offset, 0, 1).getTime(); return { from: s, to: new Date(d.getFullYear() + offset + 1, 0, 1).getTime() };
}

/* --- nutrition --- */
// Food values are per 100 g (or per serving when the food has no grams); amount is grams or servings
function foodAmount(food, qty, unitKind) {
  const g = unitKind === 'serving' ? (+food.serving || 100) * qty : qty;
  const f = g / 100;
  return { kcal: Math.round((+food.kcal || 0) * f), p: round1((+food.p || 0) * f), c: round1((+food.c || 0) * f), f: round1((+food.f || 0) * f), grams: round1(g) };
}
function dayTotals(entries) {
  return entries.reduce((a, e) => ({ kcal: a.kcal + (+e.kcal || 0), p: round1(a.p + (+e.p || 0)), c: round1(a.c + (+e.c || 0)), f: round1(a.f + (+e.f || 0)) }), { kcal: 0, p: 0, c: 0, f: 0 });
}

/* --- coach --- */
const topOfRange = reps => { const m = String(reps || '').match(/(\d+)\s*[-–]\s*(\d+)/); return m ? +m[2] : (/^\d+$/.test(String(reps).trim()) ? +reps : 0); };
const bottomOfRange = reps => { const m = String(reps || '').match(/(\d+)\s*[-–]\s*(\d+)/); return m ? +m[1] : (/^\d+$/.test(String(reps).trim()) ? +reps : 0); };
// Next-time suggestion for one exercise from its last session and the plan's rep range
function overloadSuggestion(lastEx, reps, step) {
  const ws = workSets(lastEx || {}); if (!ws.length) return null;
  const top = topOfRange(reps), bottom = bottomOfRange(reps);
  const w = Math.max(...ws.map(s => +s.w || 0)), heavySets = ws.filter(s => (+s.w || 0) === w);
  if (!top) return null;
  if (w > 0 && heavySets.every(s => (+s.r || 0) >= top)) return { kind: 'weight', weight: round2(w + step), reps: bottom || top, because: `All ${heavySets.length} sets at ${w} reached ${top} reps` };
  if (heavySets.some(s => (+s.r || 0) < (bottom || top))) return { kind: 'hold', weight: w, reps: bottom || top, because: `Some sets at ${w} fell below ${bottom || top} reps` };
  return { kind: 'reps', weight: w, reps: Math.min(top, Math.max(...heavySets.map(s => +s.r || 0)) + 1), because: `Sets at ${w} are inside the ${reps} range` };
}
// Best estimated 1RM per session for one exercise, oldest first
function exerciseHistory(workouts, exId) {
  return workouts.filter(w => (w.exercises || []).some(e => e.exId === exId && workSets(e).length)).sort((a, b) => a.start - b.start)
    .map(w => { const e = w.exercises.find(x => x.exId === exId); return { t: w.start, e1: round1(bestSetE1(e)), vol: exerciseVolume(e), sets: workSets(e) }; });
}
// No new best in the last 3 sessions, over at least 3 weeks
function isStagnant(hist, now) {
  if (hist.length < 4) return false;
  const last3 = hist.slice(-3), before = hist.slice(0, -3);
  const best = Math.max(...before.map(h => h.e1)), recent = Math.max(...last3.map(h => h.e1));
  return recent <= best && now - last3[0].t >= 14 * DAY;
}
function trend(hist, now, days = 28) {
  const recent = hist.filter(h => h.t >= now - days * DAY), older = hist.filter(h => h.t < now - days * DAY && h.t >= now - 2 * days * DAY);
  if (!recent.length || !older.length) return null;
  const a = Math.max(...older.map(h => h.e1)), b = Math.max(...recent.map(h => h.e1));
  return { was: a, now: b, pct: round1(pct(b, a)) };
}

if (typeof module !== 'undefined') module.exports = { DAY, WEEK, isWork, workSets, epley, brzycki, startOfWeek, dayKey, exerciseVolume, workoutVolume, workoutSets, workoutReps, bestSetE1, personalRecords, workoutPRs, platesFor, percentTable, muscleSets, lastTrained, recoveryEstimate, muscleFrequency, rangeFrom, bodySeries, bmiOf, seriesSummary, consistencyScore, weekStreak, periodBounds, foodAmount, dayTotals, topOfRange, overloadSuggestion, exerciseHistory, isStagnant, trend };
