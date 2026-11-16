'use strict';
/* ---------- events ---------- */
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a, i = +b.dataset.i, j = +b.dataset.j, id = b.dataset.id, A = S.active;
  switch (a) {
    case 'tab': tab = b.dataset.t; editPlanId = null; render(); scrollTo(0, 0); break;
    case 'go-settings': if (tab !== 'settings') backTab = tab; tab = 'settings'; render(); scrollTo(0, 0); break;
    case 'back': tab = backTab; render(); scrollTo(0, 0); break;
    case 'unit': S.settings.unit = b.dataset.v; save(); render(); break;
    case 'rest-step': S.settings.rest = Math.min(600, Math.max(15, (+S.settings.rest || 90) + +b.dataset.d)); save(); render(); break;
    case 'close': closeSheet(); break;
    case 'ask-ok': { const f = askFn; askFn = null; closeSheet(); f && f(); break; }
    case 'start': startWorkout(id); break;
    case 'finish': finishWorkout(); break;
    case 'discard': ask('Discard this workout? Nothing will be saved.', 'Discard', () => { S.active = null; stopRest(); keepAwake(false); save(); render(); }); break;
    case 'done': {
      const e = A.exercises[i], s = e.sets[j], p = prevSets(e.exId)[j], above = e.sets[j - 1];
      s.done = !s.done;
      if (s.done) { // empty fields take last session's numbers, else the set above
        if (s.w === '') s.w = p ? String(p.w) : above && above.w !== '' ? above.w : '0';
        if (s.r === '') s.r = p ? String(p.r) : above && above.r !== '' ? above.r : (String(e.target || '').split('-').pop() || '0');
        navigator.vibrate && navigator.vibrate(25);
        startRest(+S.settings.rest || 90);
      }
      save(); render(); break;
    }
    case 'set-add': { const e = A.exercises[i], last = e.sets[e.sets.length - 1]; e.sets.push({ w: last ? last.w : '', r: last ? last.r : '', done: false }); save(); render(); break; }
    case 'set-rm': A.exercises[i].sets.pop(); save(); render(); break;
    case 'ex-rm': ask(`Remove ${lib(A.exercises[i].exId).name} from this workout?`, 'Remove', () => { A.exercises.splice(i, 1); save(); render(); }); break;
    case 'ex-up': [A.exercises[i - 1], A.exercises[i]] = [A.exercises[i], A.exercises[i - 1]]; save(); render(); break;
    case 'vid': A.exercises[i].showVid = !A.exercises[i].showVid; save(); render(); break;
    case 'rest-add': if (rest) { rest.end += 15000; rest.total += 15; tick(); } break;
    case 'rest-sub': if (rest) { rest.end -= 15000; tick(); } break;
    case 'rest-skip': stopRest(); break;
    case 'pick': openPicker(b.dataset.mode); break;
    case 'pm': picker.m = b.dataset.m; renderPick(); break;
    case 'pick-ex': addToTarget(id); break;
    case 'ex-new': openExEdit(''); break;
    case 'ex-edit': openExEdit(id); break;
    case 'ex-save': {
      const name = $('#exn').value.trim(); if (!name) return toast('Give it a name');
      let ex = id && S.library.find(e => e.id === id);
      if (!ex) { ex = { id: uid() }; S.library.push(ex); }
      Object.assign(ex, { name, muscle: $('#exm').value, video: $('#exv').value.trim() });
      save();
      if (!id && picker) addToTarget(ex.id); else { closeSheet(); render(); toast('Saved'); }
      break;
    }
    case 'ex-del':
      if (A && A.exercises.some(e => e.exId === id)) return toast('It is in your current workout');
      ask('Delete this exercise from your library and plans? Past workouts keep their history.', 'Delete', () => {
        S.library = S.library.filter(e => e.id !== id); S.plans.forEach(p => p.items = p.items.filter(it => it.exId !== id)); save(); render();
      }); break;
    case 'plan-new': { const p = { id: uid(), name: 'New plan', items: [] }; S.plans.push(p); editPlanId = p.id; save(); render(); setTimeout(() => { const t = $('[data-plan-name]'); t && t.select(); }, 50); break; }
    case 'plan-edit': editPlanId = id; tab = 'plans'; render(); scrollTo(0, 0); break;
    case 'plan-back': editPlanId = null; render(); break;
    case 'plan-del': ask('Delete this plan?', 'Delete', () => { S.plans = S.plans.filter(p => p.id !== editPlanId); editPlanId = null; save(); render(); }); break;
    case 'pi-up': { const it = S.plans.find(p => p.id === editPlanId).items, k = +b.dataset.k; [it[k - 1], it[k]] = [it[k], it[k - 1]]; save(); render(); break; }
    case 'pi-rm': S.plans.find(p => p.id === editPlanId).items.splice(+b.dataset.k, 1); save(); render(); break;
    case 'notes-save': { const w = S.workouts.find(x => x.id === id), n = $('#wnotes').value.trim(); if (w && n) { w.notes = n; w.synced = false; save(); if (S.settings.autoSync) sync(false); } closeSheet(); tab = 'progress'; render(); break; }
    case 'w-del': ask('Delete this workout permanently?', 'Delete', () => { S.workouts = S.workouts.filter(w => w.id !== id); save(); render(); sync(false); }); break;
    case 'bm': bodyMetric = b.dataset.k; render(); break;
    case 'body-save': {
      const e = { id: uid(), date: $('#b_date').value || ymd(Date.now()), notes: $('#b_notes').value.trim(), synced: false };
      let any = false; BODY_F().forEach(([k]) => { const v = $('#b_' + k).value.trim(); e[k] = v === '' ? '' : num(v); if (v !== '') any = true; });
      if (!any) return toast('Enter at least one measurement');
      S.body.push(e); save(); render(); toast('Body stats saved'); if (S.settings.autoSync) sync(false); break;
    }
    case 'b-del': ask('Delete this body-stats entry?', 'Delete', () => { S.body = S.body.filter(x => x.id !== id); save(); render(); sync(false); }); break;
    case 'sync': sync(true); break;
    case 'connect': {
      const k = $('#apikey').value.trim().toLowerCase(); if (!k) return toast('Enter your private key');
      b.disabled = true; b.textContent = 'Connecting…';
      connectDevice(k).then(() => { // the Sheet's copy wins on a newly connected device; this phone's data is backed up first
        render(); toast('Connected to your Google Sheet ✓');
      }).catch(e => { b.disabled = false; b.textContent = 'Connect'; toast(e.message === 'wrong key' ? 'That key is not right. Check it and try again.' : 'Could not reach Google. Check your internet.'); });
      break;
    }
    case 'disconnect': ask('Disconnect this device from your Google Sheet? Everything already in the Sheet stays there.', 'Disconnect', () => {
      apiKey = ''; try { localStorage.removeItem(KEY_STORE); } catch (e) {} render();
    }); break;
    case 'export-json': download(`sanskaar-gym-backup-${ymd(Date.now())}.json`, JSON.stringify(S, null, 2), 'application/json'); break;
    case 'import-json': $('#importFile').click(); break;
    case 'export-csv': download(`sanskaar-gym-workouts-${ymd(Date.now())}.csv`, csv([['Workout ID','Date','Start','Workout','Duration (min)','Exercise','Muscle','Set','Weight','Unit','Reps','Volume','Est. 1RM'], ...sorted().reverse().flatMap(workoutRows)]), 'text/csv'); break;
    case 'reset': ask(connected() ? 'Reset this phone? Everything here is cleared and downloaded again from your Google Sheet. Your Sheet is not changed, and a backup of this phone is kept.'
      : 'Reset this phone? Your plans, workouts and body stats here are cleared. A backup is kept in Settings → Backups on this phone.', 'Reset', async () => {
        await backupNow('Before resetting this phone');
        if (connected()) { // the Sheet's copy replaces this phone's; nothing changes if the Sheet can't be reached
          try { await connectDevice(apiKey); toast('Downloaded again from your Sheet ✓'); } catch (e) { toast('Could not reach your Sheet. Nothing was changed.'); }
        } else await replaceState(seed(), { queue: false });
        tab = 'workout'; render();
      }); break;
    case 'backups': openBackups(); break;
    case 'restore-b': restoreBackup(id); break;
  }
});
document.addEventListener('input', ev => {
  const t = ev.target, d = t.dataset;
  if (d.f && S.active) { S.active.exercises[+d.i].sets[+d.j][d.f] = t.value; save(); const ws = $('#wsum'); if (ws) ws.textContent = summaryText(); }
  else if ('actName' in d && S.active) { S.active.name = t.value; save(); }
  else if ('planName' in d) { S.plans.find(p => p.id === editPlanId).name = t.value; save(); }
  else if (d.pf) { const it = S.plans.find(p => p.id === editPlanId).items[+d.pi]; it[d.pf] = d.pf === 'sets' ? Math.max(1, parseInt(t.value) || 1) : t.value; save(); }
  else if (t.id === 'pq' && picker) { picker.q = t.value; renderPick(); }
});
document.addEventListener('change', ev => {
  const t = ev.target, d = t.dataset;
  if (d.vid) { const ex = S.library.find(e => e.id === d.vid); if (ex) { ex.video = t.value.trim(); save(); render(); if (t.value && !ytId(t.value)) toast("That doesn't look like a YouTube link"); } }
  else if (d.set) { S.settings[d.set] = t.type === 'checkbox' ? t.checked : t.value.trim(); save(); render(); }
  else if ('progEx' in d) { progEx = t.value; render(); }
  else if (t.id === 'b_date') { const x = $('#b_date_txt'); if (x) x.textContent = t.value ? nice(t.value + 'T12:00') : nice(Date.now()); }
});
$('#importFile').addEventListener('change', async ev => {
  const f = ev.target.files[0]; if (!f) return;
  try { const d = JSON.parse(await f.text()); if (!d.library || !d.workouts) throw 0; ask('Replace your current data with this backup? What is here now is kept as a backup first.', 'Restore', async () => { await backupNow('Before restoring a backup file'); d.active = S.active; await replaceState(d); render(); toast('Backup restored'); sync(false); }); }
  catch (e) { toast('That file is not a Sanskaar GYM backup'); }
  ev.target.value = '';
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (S.active) keepAwake(true);
  if (connected()) sync(false); // send anything waiting and pick up changes made on another device
});
