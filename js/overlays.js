'use strict';
function openSheet(html) { $('#sheet').innerHTML = html; $('#sheet').classList.add('open'); $('#scrim').classList.add('open'); }
function closeSheet() { $('#sheet').classList.remove('open'); $('#scrim').classList.remove('open'); picker = null; }
let askFn = null;
function ask(text, label, fn) {
  askFn = fn;
  openSheet(`<h3 style="font-size:18px;text-wrap:balance">${esc(text)}</h3>
    <div class="row gap" style="margin-top:18px"><button class="btn" style="flex:1" data-a="close">Cancel</button><button class="btn acc" style="flex:1" data-a="ask-ok">${esc(label)}</button></div>`);
}
let toastT; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }

function openPicker(mode) {
  picker = { mode, q: '', m: 'All' };
  openSheet(`<div class="sheet-h"><h3>Add exercise</h3><button class="icon" data-a="close">${IC.x}</button></div>
    <input class="in" id="pq" placeholder="Search exercises" autocomplete="off">
    <div class="chips scroll" id="pm"></div><div id="plist"></div>
    <button class="btn block" data-a="ex-new">+ Create custom exercise</button>`);
  renderPick();
}
function renderPick() {
  if (!picker) return;
  $('#pm').innerHTML = ['All', ...MUSCLES].map(m => `<button class="chip btnchip ${m === picker.m ? 'on' : ''}" data-a="pm" data-m="${m}">${m}</button>`).join('');
  const q = picker.q.toLowerCase();
  let list = S.library.filter(e => (picker.m === 'All' || e.muscle === picker.m) && e.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
  if (picker.mode === 'swap' && S.active && S.active.exercises[picker.swapI]) { // suggested alternatives first
    const cur = lib(S.active.exercises[picker.swapI].exId), alts = (EXDB[cur.name]?.alts || []);
    list = list.filter(e => e.id !== cur.id).sort((a, b) => (alts.includes(b.name) ? 1 : 0) - (alts.includes(a.name) ? 1 : 0));
  }
  $('#plist').innerHTML = list.map(e => `<button class="li pick" data-a="pick-ex" data-id="${e.id}"><span class="vdot ${ytId(e.video) ? 'on' : ''}"></span><span class="grow"><span class="t">${esc(e.name)}</span><br><span class="muted xs">${e.muscle}</span></span><span class="chip">Add</span></button>`).join('') || '<div class="empty">No match — create it below.</div>';
}
function addToTarget(exId) {
  if (!picker) return;
  if (picker.mode === 'swap' && S.active) return swapTo(exId);
  if (picker.mode === 'workout' && S.active) {
    const prev = prevSets(exId);
    S.active.exercises.push({ exId, target: '', showVid: false, sets: Array.from({ length: Math.max(3, prev.length) }, () => ({ w: '', r: '', done: false })) });
  } else if (picker.mode === 'plan') {
    const p = S.plans.find(x => x.id === editPlanId); if (p) p.items.push({ exId, sets: 3, reps: '8-12' });
  }
  save(); closeSheet(); render();
  toast(lib(exId).name + ' added');
}
function openExEdit(id) {
  const ex = id ? lib(id) : { id: '', name: picker ? picker.q : '', muscle: picker && picker.m !== 'All' ? picker.m : 'Chest', video: '' };
  const keep = picker; // keep picker context so a new exercise lands in the workout/plan
  openSheet(`<div class="sheet-h"><h3>${id ? 'Edit exercise' : 'New exercise'}</h3><button class="icon" data-a="close">${IC.x}</button></div>
    <label class="f">Name<input class="in" id="exn" value="${esc(ex.name)}" placeholder="e.g. Cable Lateral Raise"></label>
    <label class="f">Muscle group<select class="in" id="exm">${MUSCLES.map(m => `<option ${m === ex.muscle ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
    <label class="f">YouTube reference video<input class="in" id="exv" value="${esc(ex.video)}" placeholder="https://youtube.com/watch?v=…"></label>
    <a class="sm" style="display:inline-block;margin-top:8px;color:var(--acc)" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent((ex.name || 'gym exercise') + ' proper form tutorial')}">Find a video on YouTube ↗</a>
    ${ytId(ex.video) ? `<div class="frame" style="margin-top:12px"><iframe src="https://www.youtube-nocookie.com/embed/${ytId(ex.video)}?rel=0&playsinline=1" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>` : ''}
    <button class="btn acc block" data-a="ex-save" data-id="${ex.id}">Save</button>
    ${id ? `<button class="btn danger block" data-a="ex-del" data-id="${ex.id}">Delete from library</button>` : ''}`);
  picker = keep;
}

/* ---------- workout actions ---------- */
async function keepAwake(on) {
  try { if (on && 'wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => wakeLock = null); }
        if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; } } catch (e) {}
}
function startWorkout(planId) {
  if (S.active) { tab = 'workout'; render(); return toast('Finish your current workout first'); }
  const p = S.plans.find(x => x.id === planId);
  S.active = { id: uid(), name: p ? p.name : 'Workout', planId: p ? p.id : '', start: Date.now(),
    exercises: p ? p.items.map(it => ({ exId: it.exId, target: it.reps, hintW: it.weight || '', showVid: false, sets: Array.from({ length: Math.max(1, +it.sets || 1) }, () => ({ w: '', r: '', done: false })) })) : [] };
  editPlanId = null; tab = 'workout'; save(); render(); keepAwake(true); scrollTo(0, 0);
}
function finishWorkout() {
  const A = S.active;
  // Set type, RPE and RIR are kept only when used, so older workouts and new ones look the same in the Sheet
  const exercises = A.exercises.map(e => ({ exId: e.exId, name: lib(e.exId).name, muscle: lib(e.exId).muscle,
    ...(e.group && groupInfo(A.exercises, A.exercises.indexOf(e)) ? { group: e.group } : {}), ...(e.note ? { note: e.note } : {}), ...(e.subOf ? { subOf: e.subOf } : {}),
    sets: e.sets.filter(s => s.done).map(s => ({ w: num(s.w), r: Math.round(num(s.r)), ...(s.t && s.t !== 'n' ? { t: s.t } : {}), ...(s.rpe ? { rpe: +s.rpe } : {}), ...(s.rir !== undefined && s.rir !== '' ? { rir: +s.rir } : {}) })) })).filter(e => e.sets.length);
  if (!exercises.length) return ask('No sets were completed. Discard this workout?', 'Discard', () => { S.active = null; stopRest(); keepAwake(false); save(); render(); });
  const w = { id: A.id, name: A.name || 'Workout', planId: A.planId, start: A.start, end: Date.now(), exercises, notes: '', synced: false };
  const prs = workoutPRs(w, S.workouts.concat([w])).map(p => ({ name: p.name, v: p.value, kind: p.kind }));
  const worked = Object.entries(muscleSets([w], lib, 0, Infinity)).filter(([m]) => MUSCLE_INFO[m]?.group !== 'Cardio').sort((a, b) => b[1] - a[1]).slice(0, 6);
  S.workouts.push(w); S.active = null; stopRest(); keepAwake(false); save(); render();
  openSheet(`<div style="text-align:center;padding:6px 0 4px"><div style="font-size:44px">💪</div><h3 style="font-size:24px;margin-top:4px">Workout complete</h3><div class="muted sm" style="margin-top:4px">${esc(w.name)} · ${nice(w.start)} · ${Math.round((w.end - w.start) / 6e4)} min</div></div>
    ${compareHTML(w)}
    ${prs.length ? `<h2 style="margin:18px 2px 4px">New records</h2>` : ''}${prs.map(p => `<div class="pr">${IC.trophy}<span>${esc(p.name)} — ${p.kind === 'e1' ? 'est. 1RM' : 'heaviest'} ${p.v} ${unit()}</span></div>`).join('')}
    ${worked.length ? `<h2 style="margin:18px 2px 6px">Muscles worked</h2><div class="chips">${worked.map(([m, n]) => `<span class="chip">${MUSCLE_INFO[m].name} · ${round1(n)} sets</span>`).join('')}</div>` : ''}
    <label class="f" style="margin-top:14px">How did it feel?<textarea class="in" id="wnotes" rows="2" placeholder="Energy, pain, what to change next time…"></textarea></label>
    <button class="btn acc block" data-a="notes-save" data-id="${w.id}">Done</button>`);
  if (prs.length) haptic('success');
  checkAwards();
  if (S.settings.autoSync && connected()) sync(false);
}

/* rest timer */
let audioCtx;
function beep() { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); [0, .25, .5].forEach(t => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination); g.gain.setValueAtTime(.2, audioCtx.currentTime + t); g.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + t + .18); o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + .2); }); } catch (e) {} }
function startRest(sec) { rest = { end: Date.now() + sec * 1000, total: sec }; $('#restbar').classList.remove('hidden'); tick(); }
function stopRest() { rest = null; $('#restbar').classList.add('hidden'); }
function tick() {
  const el = $('#elapsed'); if (el && S.active) el.textContent = fmtDur(Date.now() - S.active.start);
  if (rest) {
    const left = rest.end - Date.now();
    if (left <= 0) { stopRest(); beep(); navigator.vibrate && navigator.vibrate([200, 100, 200]); toast('Rest over — next set!'); return; }
    $('#rbTime').textContent = fmtDur(left + 999);
    $('#rbFill').style.width = (100 - left / (rest.total * 1000) * 100) + '%';
  }
}
setInterval(tick, 1000);

/* backups kept on this phone */
async function openBackups() {
  const list = dbOk ? await DB.backups().catch(() => []) : [];
  const info = b => { try { const d = JSON.parse(b.data); return `${(d.workouts || []).length} workouts · ${(d.body || []).length} body entries · ${(d.plans || []).length} plans`; } catch (e) { return ''; } };
  openSheet(`<div class="sheet-h"><h3>Backups on this phone</h3><button class="icon" data-a="close">${IC.x}</button></div>
    <p class="muted sm" style="margin:0 0 12px">A full copy is saved every day you open the app and before any big change. Restoring keeps what is here now as one more backup.</p>
    ${list.length ? `<div class="group">${list.map(b => srow('dl', esc(b.reason), `${nice(b.at)} ${new Date(b.at).toTimeString().slice(0, 5)} · ${info(b)}`, `<button class="btn sm" data-a="restore-b" data-id="${esc(b.id)}">Restore</button>`)).join('')}</div>`
      : `<div class="empty">${dbOk ? 'No backups yet.' : 'This browser does not allow backups to be stored.'}</div>`}`);
}
async function restoreBackup(id) {
  const b = (await DB.backups().catch(() => [])).find(x => x.id === id); if (!b) return;
  ask(`Restore the backup from ${nice(b.at)}? What is here now is kept as a backup first.`, 'Restore', async () => {
    let d; try { d = JSON.parse(b.data); if (!d.library) throw 0; } catch (e) { return toast('That backup could not be read'); }
    await backupNow('Before restoring a backup'); d.active = S.active; await replaceState(d);
    render(); toast('Backup restored'); sync(false);
  });
}
