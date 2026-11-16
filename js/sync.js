'use strict';
/* ---------- sync with Google Sheets ----------
 * Each record goes to the Sheet on its own, matched by ID, so nothing duplicates and two phones
 * editing different things never overwrite each other. If both edited the same record, the newer edit wins.
 * Everything is saved on the phone first, so no internet just means "waiting to sync".
 */
// Your data lives in your Google Sheet; every request carries the private key saved on this device.
// On a development machine (localhost only) a test Sheet can be used instead.
const SHEET_API = (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && localStorage.getItem('sgym.api'))
  || 'https://script.google.com/macros/s/AKfycbx5Bg43CHGv6oGRzVm3Qb6eR_vfLK_vWWcOp8-spWW1noc9fUHnOwgXj3CHujAr-dP6_Q/exec';
const KEY_STORE = 'sgym.key';
let apiKey = ''; try { apiKey = localStorage.getItem(KEY_STORE) || ''; } catch (e) {}
const connected = () => !!apiKey;
// Google sometimes answers "busy" or drops a request; those are tried again. Every request is safe to repeat.
const FINAL = /wrong key|unknown action|bad request/;
async function api(action, data, key = apiKey, tries = 2) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(SHEET_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key, action, data }) });
      let j; try { j = JSON.parse(await res.text()); } catch (e) { throw new Error('Google is busy'); }
      if (!j.ok) { const err = new Error(j.error || 'failed'); err.final = FINAL.test(err.message); throw err; }
      return j;
    } catch (e) {
      if (e.final || i >= tries) throw e;
      await new Promise(r => setTimeout(r, 1500 * (i + 1)));
    }
  }
}

function workoutRows(w) {
  const dur = Math.round((w.end - w.start) / 6e4), time = new Date(w.start).toTimeString().slice(0, 5);
  return w.exercises.flatMap(e => e.sets.map((s, k) => [w.id, ymd(w.start), time, w.name, dur, e.name, e.muscle, k + 1, s.w, unit(), s.r, r1(s.w * s.r), r1(e1rm(s.w, s.r))]));
}
const bodyRow = b => [b.id, b.date, b.weight, unit(), b.bf, b.waist, b.chest, b.arms, b.thighs, lenUnit(), b.notes || ''];

let syncing = false, again = false, syncT, lastSnapshot = 0;
function scheduleSync() { if (!connected() || !S.settings.autoSync) return; clearTimeout(syncT); syncT = setTimeout(() => sync(false), 2500); }

// Outgoing record: the current version, or a deletion if it no longer exists here
function outgoing(k, recs) {
  const [c, id] = splitKey(k), r = recs.get(k), u = meta.ts[k] || Date.now();
  if (!r) return { c, id, u, d: true };
  const rows = c === 'workouts' ? workoutRows(r.v) : c === 'body' ? [bodyRow(r.v)] : null;
  return { c, id, u, v: r.v, rows };
}
async function pushOutbox() {
  let sentData = false;
  for (let guard = 0; meta.outbox.length && guard < 50; guard++) {
    const keys = meta.outbox.slice(0, 100), recs = recordsOf(S);
    const batch = keys.map(k => outgoing(k, recs));
    const res = await api('push', { records: batch });
    // Only clear what was sent unchanged; an edit made during the upload goes in the next round
    const sentU = new Map(batch.map(r => [recKey(r.c, r.id), r.u]));
    meta.outbox = meta.outbox.filter(k => !(sentU.has(k) && sentU.get(k) === meta.ts[k]));
    batch.forEach(r => { if (!r.d && (r.c === 'workouts' || r.c === 'body')) { const x = S[r.c].find(e => String(e.id) === r.id); if (x) x.synced = true; sentData = true; } else if (r.d) sentData = true; });
    // Records the Sheet rejected (another phone saved a newer edit) come down with the pull that follows
    if (!res.accepted && !res.rejected?.length) break;
  }
  return sentData;
}

// A phone that already used the Sheet before version 8: merge with whatever the Sheet has
async function firstSync() {
  const r = await api('pull', { since: 0 });
  if (r.empty) {
    // The first device on version 8 fills the Sheet's records. Start from the newer of this phone and the Sheet's full copy, as before.
    const { result } = await api('load');
    const d = result ? JSON.parse(result) : null;
    if (d && d.library && (d.savedAt || 0) > (S.savedAt || 0)) { await backupNow('Before loading the newer copy from your Sheet'); await replaceState(d); }
    const all = [...recordsOf(S).keys()];
    meta.outbox = [...new Set(meta.outbox.concat(all))];
    meta.cursor = 0;
  } else {
    await applyRemote(r.records);
    const known = new Set(r.records.map(x => recKey(x.c, x.id)));
    meta.outbox = [...new Set(meta.outbox.concat([...recordsOf(S).keys()].filter(k => !known.has(k))))];
    meta.cursor = r.seq;
  }
}

async function sync(manual) {
  if (!connected()) { if (manual) toast('Connect your Google Sheet in Settings first'); return; }
  if (!storeReady) { if (manual) toast('Still starting up — try again in a moment'); return; }
  if (syncing) { again = true; return; }
  syncing = true; again = false;
  let sent = false, got = false;
  try {
    await flush();
    if (meta.cursor == null) await firstSync();
    sent = await pushOutbox();
    const r = await api('pull', { since: meta.cursor || 0 });
    got = await applyRemote(r.records);
    meta.cursor = Math.max(meta.cursor || 0, r.seq);
    S.settings.lastSync = Date.now(); mirror();
    if (dbOk) await DB.write({ meta: metaOut() }).catch(() => {});
    // Keep the Sheet's full copy current: older app versions read it, and it is one more backup
    if ((sent || got) && Date.now() - lastSnapshot > 60000) { lastSnapshot = Date.now(); api('snapshot', JSON.stringify(S)).catch(() => { lastSnapshot = 0; }); }
    if (manual) toast(sent || got ? 'Synced with Google Sheets ✓' : 'Everything is already synced ✓');
    else if (sent) toast('Synced to Google Sheets ✓');
  } catch (e) {
    if (manual) toast(e.message === 'wrong key' ? 'Your Sheet key was not accepted. Reconnect in Settings.' : 'Sync failed — check your internet connection');
    else if (meta.outbox.length) toast('Saved on this phone — will sync later');
  }
  syncing = false; render();
  if (again) scheduleSync();
}
window.addEventListener('online', () => sync(false));

// A phone being connected: the Sheet's copy wins, as before. This phone's data is backed up first.
async function connectDevice(k) {
  await api('ping', null, k);
  apiKey = k; try { localStorage.setItem(KEY_STORE, k); } catch (e) {}
  await backupNow('Before connecting to your Sheet');
  const r = await api('pull', { since: 0 });
  if (!r.empty) {
    const fresh = stateFromRecords(r.records.filter(x => !x.d), { settings: S.settings, active: S.active });
    await replaceState(fresh, { queue: false });
    meta.ts = {}; r.records.forEach(x => { meta.ts[recKey(x.c, x.id)] = x.u; });
    meta.outbox = []; meta.cursor = r.seq;
  } else {
    const { result } = await api('load');
    const d = result ? JSON.parse(result) : null;
    if (d && d.library) await replaceState(d);
    meta.cursor = null; // first sync fills the Sheet's records from this phone
  }
  if (dbOk) await DB.write({ meta: metaOut() }).catch(() => {});
  await sync(false);
}

/* ---------- export / import ---------- */
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
const csv = rows => rows.map(r => r.map(c => /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(',')).join('\n');
