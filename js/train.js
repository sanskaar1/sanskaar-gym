'use strict';
/* ---------- Phase 3: advanced workout logging ---------- */
const SET_TYPES = [['w', 'Warm-up', 'W'], ['n', 'Working', ''], ['d', 'Drop set', 'D'], ['f', 'To failure', 'F']];
const RPES = ['', '6', '7', '7.5', '8', '8.5', '9', '9.5', '10'], RIRS = ['', '0', '1', '2', '3', '4'];

// Exercises next to each other with the same group letter form a superset (2) or giant set (3+)
function groupInfo(list, i) {
  const g = list[i].group; if (!g) return null;
  let a = i, b = i;
  while (a > 0 && list[a - 1].group === g) a--;
  while (b < list.length - 1 && list[b + 1].group === g) b++;
  if (a === b) return null;
  return { first: a, last: b, size: b - a + 1, label: b - a + 1 >= 3 ? 'Giant set' : 'Superset', pos: i - a + 1 };
}

// One exercise is open for logging; the others wait in a short queue. Tapping one opens it.
function openIndex() {
  const A = S.active, L = A.exercises;
  if (ui.openFor !== A.id) { ui.openFor = A.id; ui.openEx = null; }
  if (ui.openEx != null && ui.openEx < L.length) return ui.openEx;
  const todo = L.findIndex(e => !e.sets.length || e.sets.some(s => !s.done));
  return todo < 0 ? 0 : todo;
}
function viewActive() {
  const A = S.active, L = A.exercises, cur = openIndex(), cg = L.length ? groupInfo(L, cur) : null;
  const isOpen = i => i === cur || (cg && i >= cg.first && i <= cg.last); // a superset opens together
  const complete = e => e.sets.length && e.sets.every(s => s.done);
  return `
  <div class="row between gap" style="margin:2px 0 8px">
    <button class="icon" data-a="wk-home" aria-label="Back to home (the workout keeps running)">${IC.back}</button>
    <div class="live" style="margin:0"><i></i><span id="elapsed">${fmtDur(Date.now() - A.start)}</span> · <span id="wsum">${summaryText()}</span></div>
    <button class="icon" data-a="wk-menu" aria-label="Workout options">${IC.more}</button>
  </div>
  <input class="title-in" data-act-name value="${esc(A.name)}" aria-label="Workout name" style="margin-bottom:12px">
  ${L.length > 1 ? `<div class="exprog" style="grid-template-columns:repeat(${L.length},1fr)" aria-hidden="true">${L.map((e, i) => `<i class="${complete(e) ? 'on' : isOpen(i) ? 'cur' : ''}"></i>`).join('')}</div>` : ''}
  ${L.length ? L.map((e, i) => isOpen(i) ? exCard(e, i) : exMini(e, i)).join('') : emptyCard('No exercises yet', 'Add your first one below.')}
  <button class="btn block" data-a="pick" data-mode="workout">+ Add exercise</button>
  <button class="btn acc lg block" data-a="finish">Finish workout</button>`;
}
function exMini(e, i) {
  const ex = lib(e.exId), done = e.sets.filter(s => s.done).length, all = e.sets.length && done === e.sets.length;
  return `<button class="card ex-mini" data-a="ex-open" data-i="${i}"><span class="n ${all ? 'ok' : ''}">${all ? IC.check : i + 1}</span>
    <span class="grow"><span class="ellip" style="display:block;font-weight:600">${esc(ex.name)}</span>
      <span class="muted xs ellip" style="display:block">${esc(musclesOf(ex).primary.map(m => MUSCLE_INFO[m]?.name).join(', ') || ex.muscle)} · ${done}/${e.sets.length} sets${e.target ? ` · target ${esc(e.target)}` : ''}</span></span>${IC.chev}</button>`;
}
ACT['wk-home'] = () => { ui.wkHome = true; render(); scrollTo(0, 0); };
ACT['ex-open'] = b => { ui.openEx = +b.dataset.i; render(); };
ACT['wk-menu'] = () => openSheet(`<div class="sheet-h"><h3>${esc(S.active.name || 'Workout')}</h3><button class="icon" data-a="close">${IC.x}</button></div>
  <div class="group"><button class="srow" data-a="discard"><div class="grow"><div class="t" style="color:var(--red)">Discard workout</div><div class="s">Nothing from this session is saved</div></div>${IC.chev}</button></div>`);
function summaryText() {
  const A = S.active; let n = 0, v = 0;
  A.exercises.forEach(e => e.sets.forEach(s => { if (s.done && s.t !== 'w') { n++; v += num(s.w) * num(s.r); } }));
  return `${n} sets · ${fmtN(v)} ${unit()}`;
}
function exCard(e, i) {
  const A = S.active, ex = lib(e.exId), prev = prevSets(e.exId), g = groupInfo(A.exercises, i);
  const complete = e.sets.length && e.sets.every(s => s.done);
  return `
  <section class="card ex ${complete ? 'complete' : ''} ${g ? 'grouped g' + (g.pos === 1 ? 'first' : g.pos === g.size ? 'last' : 'mid') : ''}">
    ${g && g.pos === 1 ? `<div class="gtag">${g.label} · rest after the last exercise</div>` : ''}
    <div class="ex-head">
      <button class="exn-btn" data-a="ex-info" data-id="${ex.id}" style="min-width:0;text-align:left">
        <div class="ex-name">${esc(ex.name)}</div>
        <div class="chips"><span class="chip">${esc(musclesOf(ex).primary.map(m => MUSCLE_INFO[m]?.name).join(', ') || ex.muscle)}</span>${e.target ? `<span class="chip ghost">Target ${esc(e.target)}</span>` : ''}${e.subOf ? `<span class="chip ghost">Swapped</span>` : ''}</div>
      </button>
      <div class="ex-tools">
        <button class="icon ${e.showVid ? 'on' : ''}" data-a="vid" data-i="${i}" aria-label="Demo video">${IC.play}</button>
        <button class="icon" data-a="ex-menu" data-i="${i}" aria-label="Exercise options">${IC.more}</button>
      </div>
    </div>
    ${e.showVid ? videoPanel(ex) : ''}
    ${e.note || e.showNote ? `<textarea class="in note-in" rows="2" placeholder="Notes for this exercise (seat height, grip, how it felt…)" data-c="exnote" data-live="1" data-i="${i}">${esc(e.note || '')}</textarea>` : ''}
    <div class="sets">
      <div class="set-row hd"><span>Set</span><span>Previous</span><span>${unit()}</span><span>Reps</span><span></span></div>
      ${e.sets.map((s, j) => { const p = prev[j], ty = SET_TYPES.find(t => t[0] === (s.t || 'n')); let wn = 0; for (let k = 0; k <= j; k++) if ((e.sets[k].t || 'n') !== 'w') wn++; return `
      <div class="set-row ${s.done ? 'done' : ''}">
        <button class="sn st-${s.t || 'n'}" data-a="set-menu" data-i="${i}" data-j="${j}" aria-label="Set options">${ty[2] || wn}${s.rpe ? `<small>@${s.rpe}</small>` : s.rir !== undefined && s.rir !== '' ? `<small>${s.rir}RIR</small>` : ''}</button>
        <span class="prev">${p ? `${p.w} × ${p.r}` : '—'}</span>
        <input inputmode="decimal" data-i="${i}" data-j="${j}" data-f="w" value="${esc(s.w)}" placeholder="${p ? p.w : e.hintW || unit()}">
        <input inputmode="numeric" data-i="${i}" data-j="${j}" data-f="r" value="${esc(s.r)}" placeholder="${p ? p.r : esc(String(e.target || '').split(/[-–]/).pop() || '0')}">
        <button class="chk" data-a="done" data-i="${i}" data-j="${j}" aria-label="Complete set">${IC.check}</button>
      </div>`; }).join('')}
    </div>
    <div class="ex-foot">
      <button class="btn sm" data-a="set-add" data-i="${i}">+ Add set</button>
      ${e.sets.length ? `<button class="btn sm ghost" data-a="set-dup" data-i="${i}">Duplicate last</button><button class="btn sm ghost" data-a="set-rm" data-i="${i}">− Remove</button>` : ''}
    </div>
  </section>`;
}

/* completing a set: fill blanks, rest timer (after the last exercise of a superset), live records */
ACT['done'] = b => {
  const A = S.active, i = +b.dataset.i, j = +b.dataset.j, e = A.exercises[i], s = e.sets[j], p = prevSets(e.exId)[j], above = e.sets[j - 1];
  s.done = !s.done;
  if (s.done) {
    if (s.w === '') s.w = p ? String(p.w) : e.hintW ? String(e.hintW) : above && above.w !== '' ? above.w : '0';
    if (s.r === '') s.r = p ? String(p.r) : above && above.r !== '' ? above.r : (String(e.target || '').split(/[-–]/).pop() || '0');
    haptic();
    const g = groupInfo(A.exercises, i);
    if (!g || i === g.last) startRest(s.t === 'w' ? Math.min(60, +S.settings.rest || 90) : +S.settings.rest || 90);
    livePR(e, s);
    // When an exercise is finished, open the next one that still has sets to do
    if (e.sets.every(x => x.done)) { const n = A.exercises.findIndex((x, k) => k !== i && (!x.sets.length || x.sets.some(y => !y.done))); ui.openEx = n < 0 ? i : n; }
  }
  save(); render();
};
function livePR(e, s) {
  if (s.t === 'w') return;
  const w = num(s.w), r = Math.round(num(s.r)); if (!w || !r) return;
  const rec = personalRecords(S.workouts)[e.exId]; if (!rec) return; // first time doing it: no record to beat yet
  const A = S.active; A.prs = A.prs || {};
  const v = epley(w, r);
  if (v > rec.e1 + 0.01 && (A.prs[e.exId] || 0) < v) { A.prs[e.exId] = v; haptic('success'); toast(`🏆 New record: ${lib(e.exId).name} · est. 1RM ${round1(v)} ${unit()}`); }
}
ACT['set-dup'] = b => { const e = S.active.exercises[+b.dataset.i], last = e.sets[e.sets.length - 1]; e.sets.push({ w: last.w, r: last.r, t: last.t, done: false }); save(); render(); };

/* set menu: type, RPE / RIR, duplicate, delete, plates */
ACT['set-menu'] = b => {
  const i = +b.dataset.i, j = +b.dataset.j, s = S.active.exercises[i].sets[j];
  openSheet(`<div class="sheet-h"><h3>Set ${j + 1} · ${esc(lib(S.active.exercises[i].exId).name)}</h3><button class="icon" data-a="close">${IC.x}</button></div>
    <label class="f">Type</label><div class="segbar">${SET_TYPES.map(([k, l]) => `<button class="${(s.t || 'n') === k ? 'on' : ''}" data-a="set-type" data-i="${i}" data-j="${j}" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="muted xs" style="margin:6px 2px 0">Warm-up sets don't count toward volume or records.</div>
    <label class="f" style="margin-top:14px">RPE <small class="muted">— how hard (10 = nothing left)</small></label>
    <div class="chips">${RPES.map(v => `<button class="chip btnchip ${(s.rpe || '') === v ? 'on' : ''}" data-a="set-rpe" data-i="${i}" data-j="${j}" data-v="${v}">${v || '—'}</button>`).join('')}</div>
    <label class="f" style="margin-top:12px">RIR <small class="muted">— reps you had left</small></label>
    <div class="chips">${RIRS.map(v => `<button class="chip btnchip ${String(s.rir ?? '') === v ? 'on' : ''}" data-a="set-rir" data-i="${i}" data-j="${j}" data-v="${v}">${v === '4' ? '4+' : v || '—'}</button>`).join('')}</div>
    <div class="row gap" style="margin-top:16px"><button class="btn" style="flex:1" data-a="set-copy" data-i="${i}" data-j="${j}">Duplicate</button><button class="btn" style="flex:1" data-a="plates" data-w="${esc(s.w)}">Plates</button><button class="btn danger" style="flex:1" data-a="set-del" data-i="${i}" data-j="${j}">Delete</button></div>`);
};
const setAt = b => S.active.exercises[+b.dataset.i].sets[+b.dataset.j];
ACT['set-type'] = b => { setAt(b).t = b.dataset.v; save(); render(); ACT['set-menu'](b); };
ACT['set-rpe'] = b => { const s = setAt(b); s.rpe = b.dataset.v; if (s.rpe) s.rir = String(Math.max(0, Math.round(10 - +s.rpe))); save(); render(); ACT['set-menu'](b); };
ACT['set-rir'] = b => { setAt(b).rir = b.dataset.v; save(); render(); ACT['set-menu'](b); };
ACT['set-copy'] = b => { const e = S.active.exercises[+b.dataset.i], s = setAt(b); e.sets.splice(+b.dataset.j + 1, 0, { w: s.w, r: s.r, t: s.t, rpe: s.rpe, rir: s.rir, done: false }); save(); closeSheet(); render(); };
ACT['set-del'] = b => { S.active.exercises[+b.dataset.i].sets.splice(+b.dataset.j, 1); save(); closeSheet(); render(); };

/* exercise menu */
ACT['ex-menu'] = b => {
  const A = S.active, i = +b.dataset.i, e = A.exercises[i], g = groupInfo(A.exercises, i), last = i === A.exercises.length - 1;
  const row = (a, t, extra = '') => `<button class="srow" data-a="${a}" data-i="${i}" ${extra}><div class="grow"><div class="t">${t}</div></div>${IC.chev}</button>`;
  openSheet(`<div class="sheet-h"><h3>${esc(lib(e.exId).name)}</h3><button class="icon" data-a="close">${IC.x}</button></div><div class="group">
    ${row('ex-info2', 'How to do it & video')}
    ${row('ex-note', e.note || e.showNote ? 'Hide notes' : 'Add notes')}
    ${g ? row('ex-ungroup', `Remove from ${g.label.toLowerCase()}`) : !last ? row('ex-group', 'Superset with the next exercise') : ''}
    ${row('ex-swap', 'Swap for another exercise')}
    ${row('plates', 'Plate calculator', `data-w="${esc((e.sets.find(s => s.w !== '') || {}).w || '')}"`)}
    ${row('orm', '1-rep max calculator')}
    ${i ? row('ex-up', 'Move up') : ''}
    ${row('ex-rm', 'Remove from workout')}</div>`);
};
ACT['ex-info2'] = b => openExInfo(S.active.exercises[+b.dataset.i].exId);
ACT['ex-note'] = b => { const e = S.active.exercises[+b.dataset.i]; e.showNote = !(e.note || e.showNote); if (!e.showNote) e.note = ''; save(); closeSheet(); render(); };
ACT['ex-group'] = b => {
  const L = S.active.exercises, i = +b.dataset.i, g = L[i].group || L[i + 1].group || 'g' + uid().slice(0, 4);
  L[i].group = g; L[i + 1].group = g; save(); closeSheet(); render(); toast('Superset: do one set of each, then rest');
};
ACT['ex-ungroup'] = b => { const L = S.active.exercises, i = +b.dataset.i; delete L[i].group; L.forEach((e, k) => { if (e.group && !groupInfo(L, k)) delete e.group; }); save(); closeSheet(); render(); };
CHG['exnote'] = t => { S.active.exercises[+t.dataset.i].note = t.value; save(); };
ACT['ex-swap'] = b => { closeSheet(); openPicker('swap'); picker.swapI = +b.dataset.i; renderPick(); };
function swapTo(exId) {
  const e = S.active.exercises[picker.swapI]; if (!e) return;
  if (!e.subOf) e.subOf = e.exId; e.exId = exId; e.showVid = false;
  save(); closeSheet(); render(); toast('Swapped to ' + lib(exId).name);
}

/* calculators */
ACT['plates'] = b => {
  ui.plateW = b.dataset.w || ui.plateW || '';
  openSheet(`<div class="sheet-h"><h3>Plate calculator</h3><button class="icon" data-a="close">${IC.x}</button></div>
    <div class="grid2"><label class="f">Total weight (${unit()})<input class="in" inputmode="decimal" id="pl_w" value="${esc(ui.plateW)}" data-c="platew" data-live="1"></label>
      <label class="f">Bar (${unit()})<input class="in" inputmode="decimal" value="${esc(S.settings.bar)}" data-c="bar" data-live="1"></label></div>
    <label class="f" style="margin-top:8px">Plates you have (${unit()}, comma separated)<input class="in" value="${esc(S.settings.plates)}" data-c="platelist" data-live="1"></label>
    <div id="plOut" style="margin-top:14px">${plateOut()}</div>`);
};
function plateOut() {
  const t = num(ui.plateW); if (!t) return '<div class="muted sm">Enter a total weight.</div>';
  const r = platesFor(t, num(S.settings.bar), S.settings.plates);
  if (r.under) return `<div class="muted sm">That's less than the bar (${S.settings.bar} ${unit()}).</div>`;
  const colors = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#e9ecef', '#b197fc', '#ffa94d'];
  const ps = String(S.settings.plates).split(',').map(Number).filter(Boolean).sort((a, b) => b - a);
  return `<div class="barviz"><span class="bar-end"></span>${r.perSide.slice().reverse().map(p => `<i style="height:${30 + Math.min(70, p * 2.4)}px;background:${colors[ps.indexOf(p) % colors.length]}" title="${p}"></i>`).join('')}<span class="bar-shaft"></span></div>
    <div class="sm" style="margin-top:10px"><b>Each side:</b> ${r.perSide.length ? r.perSide.join(' + ') + ' ' + unit() : 'nothing — just the bar'}</div>
    ${r.remainder ? `<div class="sm" style="color:#ffa94d;margin-top:6px">Can't make it exactly: ${r.remainder} ${unit()} short with these plates.</div>` : ''}`;
}
CHG['platew'] = t => { ui.plateW = t.value; $('#plOut').innerHTML = plateOut(); };
CHG['bar'] = t => { S.settings.bar = t.value; save(); $('#plOut').innerHTML = plateOut(); };
CHG['platelist'] = t => { S.settings.plates = t.value; save(); $('#plOut').innerHTML = plateOut(); };
ACT['orm'] = () => {
  openSheet(`<div class="sheet-h"><h3>1-rep max calculator</h3><button class="icon" data-a="close">${IC.x}</button></div>
    <div class="grid2"><label class="f">Weight (${unit()})<input class="in" inputmode="decimal" id="orm_w" data-c="orm" data-live="1"></label><label class="f">Reps<input class="in" inputmode="numeric" id="orm_r" data-c="orm" data-live="1"></label></div>
    <div id="ormOut" style="margin-top:12px" class="muted sm">Enter a set you did (best with 1–10 reps).</div>`);
};
CHG['orm'] = () => {
  const w = num($('#orm_w').value), r = Math.round(num($('#orm_r').value)), o = $('#ormOut');
  if (!w || !r) { o.innerHTML = 'Enter a set you did (best with 1–10 reps).'; return; }
  const a = epley(w, r), b2 = brzycki(w, r), avg = b2 ? (a + b2) / 2 : a;
  o.className = '';
  o.innerHTML = `<div class="tiles" style="margin-top:0"><div class="tile"><div class="v">${round1(avg)}</div><div class="l">Estimated 1RM</div></div><div class="tile"><div class="v">${round1(a)}</div><div class="l">Epley</div></div><div class="tile"><div class="v">${b2 ? round1(b2) : '—'}</div><div class="l">Brzycki</div></div></div>
    <table class="tbl" style="margin-top:10px"><tbody>${percentTable(avg).map(x => `<tr><td>${x.p}%</td><td><b>${x.w}</b> ${unit()}</td></tr>`).join('')}</tbody></table>
    <div class="muted xs" style="margin-top:8px">Formulas give an estimate; accuracy drops above about 10 reps.</div>`;
};
