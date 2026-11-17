'use strict';
/* ---------- Analytics and Profile tabs ---------- */
const ANALYTICS = [['progress', 'Progress'], ['body', 'Body'], ['muscles', 'Muscles'], ['recovery', 'Recovery'], ['reports', 'Reports'], ['coach', 'Coach']];
function viewAnalytics() {
  const views = { progress: viewProgress, body: viewBody, muscles: viewMuscles, recovery: viewRecovery, reports: viewReports, coach: viewCoach };
  return `${segBar(ANALYTICS, ui.seg, 'seg', 'scroll top-seg')}<div class="fade-in">${(views[ui.seg] || viewProgress)()}</div>`;
}
ACT['seg'] = b => { ui.seg = b.dataset.v; ui.muscle = ''; render(); scrollTo(0, 0); };

function viewProgress() {
  const ws = sorted();
  if (!ws.length) return emptyCard('No workouts yet', 'Finish your first workout and your progress charts appear here.');
  const now = Date.now(), wk = startOfWeek(now);
  const total = ws.reduce((a, w) => a + wVolume(w), 0), avgMin = ws.reduce((a, w) => a + (w.end - w.start), 0) / ws.length / 6e4;
  const labels = [], vols = [];
  for (let k = 11; k >= 0; k--) { const t = wk - k * WEEK; labels.push(shortDate(t)); vols.push(Math.round(ws.filter(w => w.start >= t && w.start < t + WEEK).reduce((a, w) => a + wVolume(w), 0))); }
  const used = [...new Set(ws.flatMap(w => w.exercises.map(e => e.exId)))];
  if (!used.includes(progEx)) progEx = used[0];
  const hist = exerciseHistory(S.workouts, progEx), rec = personalRecords(S.workouts)[progEx];
  return `<div class="tiles" style="margin-top:0">
      <div class="tile"><div class="v">${ws.length}</div><div class="l">Workouts</div></div>
      <div class="tile"><div class="v">${fmtN(total)}</div><div class="l">Total ${unit()} lifted</div></div>
      <div class="tile"><div class="v">${Math.round(avgMin)}<span class="sm muted">m</span></div><div class="l">Avg duration</div></div></div>
    <h2>Weekly volume</h2><div class="card">${barChart2(labels, [{ data: vols, backgroundColor: vols.map((_, i) => i === vols.length - 1 ? '#ffd60a' : '#3a404a') }], { fmt: v => fmtN(v) + ' ' + unit() })}<div class="muted xs">Weight × reps of working sets (warm-ups excluded).</div></div>
    <h2>Strength — estimated 1-rep max</h2><div class="card">
      <select class="in" data-prog-ex>${used.map(id => `<option value="${id}" ${id === progEx ? 'selected' : ''}>${esc(lib(id).name)}</option>`).join('')}</select>
      ${rec ? `<div class="row between sm" style="margin-top:12px"><span class="muted">Best set</span><b>${rec.e1Set.w} ${unit()} × ${rec.e1Set.r} <span class="muted" style="font-weight:400">· ${short(rec.e1At)}</span></b></div>` : ''}
      ${hist.length > 1 ? lineChart2(hist.map(h => ({ x: h.t, y: h.e1 })), '#ffd60a', v => round1(v) + ' ' + unit()) : '<div class="empty sm">Do this exercise twice to see a trend.</div>'}</div>
    <h2>History</h2><div class="card" style="padding:2px 14px">${ws.map(w => `
      <details class="w"><summary><div><div class="t" style="font-weight:600">${esc(w.name)}</div><div class="muted xs">${nice(w.start)} · ${Math.round((w.end - w.start) / 6e4)} min · ${fmtN(wVolume(w))} ${unit()}</div></div><span class="muted xs">${connected() && !isPending('workouts', w.id) ? '✓ sheet' : ''}</span></summary>
        <div class="wd">${compareHTML(w)}
        ${w.notes ? `<p class="muted">${esc(w.notes)}</p>` : ''}
        <button class="btn sm danger" style="margin-top:8px" data-a="w-del" data-id="${w.id}">Delete workout</button></div>
      </details>`).join('')}</div>`;
}

function viewProfile() {
  if (ui.profile === 'photos') return viewPhotos();
  if (ui.profile === 'goals') return viewGoals();
  const awards = Object.keys(S.settings.awards || {}).length, streak = weekStreak(S.workouts, Date.now());
  const lastW = bodySeries(S.body, 'weight'), w = lastW.length ? lastW[lastW.length - 1].y : null;
  return `<section class="card hero profile-hero"><div class="big">Your profile</div>
      <div class="tiles" style="margin-top:12px"><div class="tile"><div class="v">${S.workouts.length}</div><div class="l">Workouts</div></div><div class="tile"><div class="v">${streak}</div><div class="l">Week streak</div></div><div class="tile"><div class="v">${w != null ? w : '—'}<small> ${w != null ? unit() : ''}</small></div><div class="l">Weight</div></div></div></section>
    <div class="group">
      ${srow('camera', 'Transformation photos', `${S.photos.length} photo${S.photos.length === 1 ? '' : 's'} · before/after`, IC.chev, 'go-photos')}
      ${srow('target', 'Goals & achievements', `${S.goals.filter(g => !g.doneAt).length} active goals · ${awards} awards`, IC.chev, 'go-goals')}
      ${srow('heart', 'Recovery check-in', 'Sleep, energy, soreness', IC.chev, 'go-recovery')}
      ${srow('table', 'Reports', 'Weekly, monthly, yearly · share or PDF', IC.chev, 'go-reports')}
    </div>
    <div class="group">${srow('settings', 'Settings', 'Units, rest timer, equipment, Sheet, backups', IC.chev, 'go-settings')}</div>`;
}
ACT['go-goals'] = () => { tab = 'profile'; ui.profile = 'goals'; render(); scrollTo(0, 0); };
ACT['go-recovery'] = () => { tab = 'analytics'; ui.seg = 'recovery'; render(); scrollTo(0, 0); };
ACT['go-reports'] = () => { tab = 'analytics'; ui.seg = 'reports'; render(); scrollTo(0, 0); };
ACT['profile-back'] = () => { ui.profile = ''; render(); scrollTo(0, 0); };

/* settings additions */
function trainingSettings() {
  const st = S.settings, eq = new Set(st.equipment || []);
  return `${srow('bar', 'Barbell weight', 'For the plate calculator', `<input class="mini-in" inputmode="decimal" data-set="bar" value="${esc(st.bar)}"><span class="muted sm">${unit()}</span>`)}
    ${srow('target', 'Weekly goal', 'Workouts per week', `<div class="stepper"><button data-a="wg-step" data-d="-1" aria-label="Fewer">−</button><span>${st.weeklyGoal}</span><button data-a="wg-step" data-d="1" aria-label="More">+</button></div>`)}
    <div class="srow" style="display:block"><div class="t">Equipment you can use</div><div class="s">The coach only recommends exercises you can do</div>
      <div class="chips" style="margin-top:8px">${EQUIPMENT.map(e => `<button class="chip btnchip ${eq.has(e) ? 'on' : ''}" data-a="eq-tog" data-v="${e}">${e}</button>`).join('')}</div></div>`;
}
ACT['wg-step'] = b => { S.settings.weeklyGoal = Math.max(1, Math.min(14, (+S.settings.weeklyGoal || 4) + +b.dataset.d)); save(); render(); };
ACT['eq-tog'] = b => { const s = new Set(S.settings.equipment || []), v = b.dataset.v; s.has(v) ? s.delete(v) : s.add(v); S.settings.equipment = EQUIPMENT.filter(e => s.has(e)); save(); render(); };
