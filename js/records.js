'use strict';
/* ---------- records ----------
 * The app's data split into records the Google Sheet can store one by one:
 * every workout, body entry, plan and exercise is a record ("workouts/<id>", "plans/<id>"…),
 * and the settings are one more record ("settings/settings").
 * Pure functions only, so they can be tested without a browser (see tests/).
 */
// photos = photo details only (the images themselves stay on the phone / your Drive)
const SYNCED = ['workouts', 'body', 'plans', 'library', 'photos', 'food', 'foods', 'meals', 'days', 'goals', 'suggestions'];
const recKey = (c, id) => c + '/' + id;
const splitKey = k => { const i = k.indexOf('/'); return [k.slice(0, i), k.slice(i + 1)]; };

// What gets stored and sent: no device-only fields
function recordValue(c, v) {
  const o = Object.assign({}, v);
  delete o.synced;
  if (c === 'settings') { delete o.lastSync; o.id = 'settings'; }
  return o;
}

// Map of key -> { c, id, v, i } in the order the app shows them
function recordsOf(S) {
  const m = new Map();
  for (const c of SYNCED) (S[c] || []).forEach((v, i) => { if (v && v.id) m.set(recKey(c, String(v.id)), { c, id: String(v.id), v: recordValue(c, v), i }); });
  m.set('settings/settings', { c: 'settings', id: 'settings', v: recordValue('settings', S.settings || {}), i: 0 });
  return m;
}

function snapshotOf(S) {
  const snap = new Map();
  for (const [k, r] of recordsOf(S)) snap.set(k, JSON.stringify(r.v));
  return snap;
}

function diffSnapshots(prev, next) {
  const changed = [], removed = [];
  for (const [k, j] of next) if (prev.get(k) !== j) changed.push(k);
  for (const k of prev.keys()) if (!next.has(k)) removed.push(k);
  return { changed, removed };
}

// A record from the Sheet replaces this device's copy unless this device has a newer edit still waiting to be sent
function remoteWins(rec, localU, pending) { return !pending || !(localU > rec.u); }

// Puts one record from the Sheet into S. Returns true when S changed.
function applyRecord(S, rec) {
  if (rec.c === 'settings') {
    if (rec.d || !rec.v) return false;
    const lastSync = S.settings && S.settings.lastSync;
    S.settings = Object.assign({}, rec.v); delete S.settings.id;
    if (lastSync) S.settings.lastSync = lastSync;
    return true;
  }
  if (!SYNCED.includes(rec.c)) return false;
  const list = S[rec.c] || (S[rec.c] = []);
  const i = list.findIndex(x => String(x.id) === String(rec.id));
  if (rec.d) { if (i < 0) return false; list.splice(i, 1); return true; }
  const v = Object.assign({}, rec.v);
  if (rec.c === 'workouts' || rec.c === 'body') v.synced = true;
  if (i < 0) list.push(v); else list[i] = v;
  return true;
}

// Rebuilds the app's data from stored records (IndexedDB rows or a full download from the Sheet)
function stateFromRecords(recs, base) {
  const S = Object.assign({}, base, { deleted: [] });
  for (const c of SYNCED) S[c] = [];
  const sorted = [...recs].sort((a, b) => (a.i ?? 0) - (b.i ?? 0));
  for (const r of sorted) applyRecord(S, { c: r.c, id: r.id, v: r.v });
  return S;
}

// Older backups and Sheet copies may lack newer fields; fill them in without touching the data
function normalizeState(d, seedFn) {
  const S = Object.assign(seedFn(), d);
  for (const c of SYNCED) if (!Array.isArray(S[c])) S[c] = [];
  if (!Array.isArray(S.deleted)) S.deleted = [];
  S.settings = Object.assign({}, seedFn().settings, S.settings || {});
  return S;
}

if (typeof module !== 'undefined') module.exports = { SYNCED, recKey, splitKey, recordValue, recordsOf, snapshotOf, diffSnapshots, remoteWins, applyRecord, stateFromRecords, normalizeState };
