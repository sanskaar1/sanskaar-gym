'use strict';
/* ---------- state ----------
 * S holds everything in memory. Every change calls save(), which
 *  1. writes all of S to localStorage at once (the same copy versions 7 and below use, so a rollback still works), and
 *  2. a moment later stores each changed record in IndexedDB and queues it for the Google Sheet.
 * IndexedDB is the main copy. Nothing is ever deleted from it without a backup first.
 */
const APP_VERSION = 10;
const KEY = 'forge.v1';
function seed() {
  const lib = [
    ['Barbell Bench Press','Chest'],['Incline Dumbbell Press','Chest'],['Cable Fly','Chest'],['Push-Up','Chest'],['Dips','Chest'],
    ['Deadlift','Back'],['Pull-Up','Back'],['Lat Pulldown','Back'],['Barbell Row','Back'],['Seated Cable Row','Back'],['Face Pull','Back'],
    ['Back Squat','Legs'],['Leg Press','Legs'],['Bulgarian Split Squat','Legs'],['Leg Curl','Legs'],['Leg Extension','Legs'],['Standing Calf Raise','Legs'],
    ['Romanian Deadlift','Glutes'],['Hip Thrust','Glutes'],
    ['Overhead Press','Shoulders'],['Dumbbell Lateral Raise','Shoulders'],['Rear Delt Fly','Shoulders'],
    ['Barbell Curl','Arms'],['Hammer Curl','Arms'],['Tricep Pushdown','Arms'],['Skull Crusher','Arms'],
    ['Plank','Core'],['Hanging Leg Raise','Core'],['Cable Crunch','Core'],
    ['Treadmill','Cardio'],['Rowing Machine','Cardio'],
  ].map(([name, muscle]) => ({ id: uid(), name, muscle, video: '' }));
  const by = n => lib.find(e => e.name === n).id;
  const P = (name, list) => ({ id: uid(), name, items: list.map(([n, s, r]) => ({ exId: by(n), sets: s, reps: r })) });
  return {
    settings: { theme: 'light', unit: 'kg', rest: 90, height: '', sheetUrl: '', autoSync: true, lastSync: 0,
      bar: 20, plates: '25,20,15,10,5,2.5,1.25', weeklyGoal: 4, equipment: EQUIPMENT.slice(),
      targets: { kcal: '', p: '', c: '', f: '', water: 2500 } },
    library: lib,
    plans: [
      P('Push', [['Barbell Bench Press',4,'6-8'],['Incline Dumbbell Press',3,'8-10'],['Overhead Press',3,'6-8'],['Dumbbell Lateral Raise',3,'12-15'],['Tricep Pushdown',3,'10-12']]),
      P('Pull', [['Deadlift',3,'5'],['Pull-Up',3,'6-10'],['Barbell Row',3,'8-10'],['Face Pull',3,'15'],['Barbell Curl',3,'10-12']]),
      P('Legs', [['Back Squat',4,'5-8'],['Romanian Deadlift',3,'8-10'],['Leg Press',3,'10-12'],['Leg Curl',3,'12'],['Standing Calf Raise',4,'12-15']]),
    ],
    workouts: [], body: [], deleted: [], active: null,
    photos: [], food: [], foods: [], meals: [], days: [], goals: [], suggestions: [],
  };
}
// Empty app for a phone that is about to download everything from the Sheet (no sample plans to duplicate)
const blank = () => Object.assign(seed(), { library: [], plans: [] });
function load() { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.library) return normalizeState(d, seed); } catch (e) {} return seed(); }
let S = load();

// Sync bookkeeping, stored in IndexedDB "meta"
const meta = { ts: {}, outbox: [], cursor: null, savedAt: 0, deviceId: '', lastAutoBackup: '' };
let snap = null, dbOk = false, storeReady = false, flushT;
const mirror = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const metaOut = () => ({ ts: meta.ts, outbox: meta.outbox, cursor: meta.cursor, savedAt: meta.savedAt, deviceId: meta.deviceId, lastAutoBackup: meta.lastAutoBackup, active: S.active || null, schema: 2 });

function save() {
  S.savedAt = Date.now();
  mirror();
  clearTimeout(flushT); flushT = setTimeout(flush, 300);
}
// Works out which records changed since the last call and queues them for the Sheet. Synchronous on purpose.
function queueChanges() {
  if (!snap) return { put: [], del: [], any: false };
  const next = snapshotOf(S), { changed, removed } = diffSnapshots(snap, next), now = Date.now(), recs = recordsOf(S);
  const ob = new Set(meta.outbox), put = [], del = [];
  changed.forEach(k => { meta.ts[k] = now; ob.add(k); put.push([k, recs.get(k)]); });
  removed.forEach(k => { meta.ts[k] = now; ob.add(k); del.push(k); });
  meta.outbox = [...ob]; meta.savedAt = S.savedAt || now; snap = next;
  return { put, del, any: !!(put.length || del.length) };
}
async function flush() {
  clearTimeout(flushT);
  if (!storeReady) return;
  const q = queueChanges();
  if (dbOk) await DB.write({ put: q.put, del: q.del, meta: metaOut() }).catch(() => {});
  if (q.any) scheduleSync();
}
// Records that arrived from the Sheet: store them without queueing them to be sent back
async function applyRemote(records) {
  const q = queueChanges(); // local edits made while waiting for the network still go out
  const pending = new Set(meta.outbox);
  let changed = false;
  for (const rec of records) {
    const k = recKey(rec.c, rec.id);
    if (!remoteWins(rec, meta.ts[k] || 0, pending.has(k))) continue;
    if (applyRecord(S, rec)) changed = true;
    meta.ts[k] = rec.u; pending.delete(k);
  }
  meta.outbox = [...pending];
  const next = snapshotOf(S), d = diffSnapshots(snap, next), recs = recordsOf(S);
  snap = next;
  if (changed) { S.savedAt = Date.now(); meta.savedAt = S.savedAt; mirror(); }
  if (dbOk) await DB.write({ put: q.put.concat(d.changed.map(k => [k, recs.get(k)])), del: q.del.concat(d.removed), meta: metaOut() }).catch(() => {});
  return changed;
}
// Replaces everything on this device (restore, reset, a newly connected phone). Back up first.
async function replaceState(d, { queue = true } = {}) {
  S = normalizeState(d, seed);
  S.savedAt = Date.now(); mirror();
  if (!storeReady) return;
  if (queue) return flush(); // differences from before become changes for the Sheet
  snap = snapshotOf(S);
  if (dbOk) await DB.write({ put: [...recordsOf(S)], meta: metaOut(), clear: true }).catch(() => {});
}
const pendingCount = () => meta.outbox.length;
const isPending = (c, id) => meta.outbox.includes(recKey(c, String(id)));

async function initStore() {
  let stored = null;
  try { stored = await DB.readAll(); dbOk = true; } catch (e) { dbOk = false; } // no IndexedDB (e.g. a locked-down browser): keep working from localStorage
  if (!dbOk) { snap = snapshotOf(S); storeReady = true; return; }
  const m = stored.meta;
  if (!m.schema) {
    // First start of version 8: keep a copy of everything exactly as it was, then move it into IndexedDB
    await DB.putBackup({ id: 'upgrade-v8-' + Date.now(), at: Date.now(), reason: 'Before upgrading to version 8', data: localStorage.getItem(KEY) || JSON.stringify(S) }).catch(() => {});
    const t = S.savedAt || Date.now(), recs = recordsOf(S);
    recs.forEach((r, k) => { meta.ts[k] = t; });
    meta.deviceId = uid(); meta.cursor = null; meta.savedAt = S.savedAt || 0;
    // Work version 7 had not sent yet still goes to the Sheet
    meta.outbox = [
      ...S.workouts.filter(w => !w.synced).map(w => recKey('workouts', w.id)),
      ...S.body.filter(b => !b.synced).map(b => recKey('body', b.id)),
      ...(S.deleted || []).flatMap(id => [recKey('workouts', id), recKey('body', id)]),
    ];
    (S.deleted || []).forEach(id => { meta.ts[recKey('workouts', id)] = Date.now(); meta.ts[recKey('body', id)] = Date.now(); });
    S.deleted = []; mirror();
    snap = snapshotOf(S);
    await DB.write({ put: [...recs], meta: metaOut(), clear: true }).catch(() => { dbOk = false; });
  } else {
    Object.assign(meta, { ts: m.ts || {}, outbox: m.outbox || [], cursor: m.cursor ?? null, savedAt: m.savedAt || 0, deviceId: m.deviceId || uid(), lastAutoBackup: m.lastAutoBackup || '' });
    const fromDb = stateFromRecords(stored.records, { settings: S.settings, active: m.active || null, savedAt: m.savedAt || 0 });
    fromDb.settings = Object.assign({}, seed().settings, fromDb.settings, { lastSync: S.settings.lastSync || 0 });
    snap = snapshotOf(fromDb);
    // localStorage is newer only if an older version of the app was used in between; its edits then count as changes
    if ((S.savedAt || 0) <= (m.savedAt || 0)) { S = normalizeState(fromDb, seed); mirror(); }
  }
  storeReady = true;
  await flush();
  dailyBackup();
}

/* ---------- backups on this device ---------- */
async function backupNow(reason) {
  if (!dbOk) return;
  await DB.putBackup({ id: 'b-' + Date.now(), at: Date.now(), reason, data: JSON.stringify(S) }).catch(() => {});
  pruneBackups();
}
async function dailyBackup() {
  const today = ymd(Date.now());
  if (!dbOk || meta.lastAutoBackup === today) return;
  await DB.putBackup({ id: 'auto-' + today, at: Date.now(), reason: 'Daily automatic backup', data: JSON.stringify(S) }).catch(() => {});
  meta.lastAutoBackup = today; DB.write({ meta: metaOut() }).catch(() => {});
  pruneBackups();
}
// Keeps the 7 newest daily backups and the 10 newest others. The upgrade backup is never removed.
async function pruneBackups() {
  const all = await DB.backups().catch(() => []);
  const drop = [...all.filter(b => b.id.startsWith('auto-')).slice(7), ...all.filter(b => b.id.startsWith('b-')).slice(10)];
  if (drop.length) DB.delBackups(drop.map(b => b.id)).catch(() => {});
}

// Screen state (not saved)
const ui = { seg: 'progress', range: '3M', muscle: '', mRange: 'week', rPeriod: 'week', rOffset: 0, day: '', recDay: '', planOpen: {}, libQ: '', libM: 'All', libE: 'All', profile: '' };
let tab = 'workout';
let editPlanId = null, picker = null, progEx = '', bodyMetric = 'weight', rest = null, wakeLock = null;

const lib = id => S.library.find(e => e.id === id) || { id, name: 'Deleted exercise', muscle: 'Other', video: '' };
const unit = () => S.settings.unit;
const lenUnit = () => unit() === 'kg' ? 'cm' : 'in';
const sorted = () => [...S.workouts].sort((a, b) => b.start - a.start);
