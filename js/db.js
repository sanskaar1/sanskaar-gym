'use strict';
/* ---------- IndexedDB ----------
 * records: key "c/id" -> { c, id, v, i }
 * meta:    key -> value (sync bookkeeping, the workout in progress)
 * backups: { id, at, reason, data }  full copies of the app kept on this device
 * blobs:   photo id -> image Blob (progress photos stay on this phone; a copy goes to your Drive if connected)
 */
const DB = (() => {
  let opening;
  const open = () => opening || (opening = new Promise((res, rej) => {
    const r = indexedDB.open('sanskaar-gym', 2);
    r.onupgradeneeded = e => {
      const d = r.result, old = e.oldVersion;
      if (old < 1) { d.createObjectStore('records'); d.createObjectStore('meta'); d.createObjectStore('backups', { keyPath: 'id' }); }
      if (old < 2) d.createObjectStore('blobs');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => { opening = null; rej(r.error); };
    r.onblocked = () => { opening = null; rej(new Error('blocked')); };
  }));
  const done = t => new Promise((res, rej) => { t.oncomplete = () => res(); t.onerror = t.onabort = () => rej(t.error || new Error('aborted')); });
  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  async function entries(store) {
    const d = await open(), t = d.transaction(store, 'readonly'), s = t.objectStore(store);
    const [keys, vals] = await Promise.all([req(s.getAllKeys()), req(s.getAll())]);
    return keys.map((k, i) => [k, vals[i]]);
  }
  return {
    open,
    async readAll() {
      const [records, meta] = await Promise.all([entries('records'), entries('meta')]);
      return { records: records.map(e => e[1]), meta: Object.fromEntries(meta) };
    },
    // One transaction, so a change is either fully stored or not at all
    async write({ put = [], del = [], meta = {}, clear = false }) {
      const d = await open(), t = d.transaction(['records', 'meta'], 'readwrite');
      const rs = t.objectStore('records'), ms = t.objectStore('meta');
      if (clear) { rs.clear(); ms.clear(); }
      put.forEach(([k, v]) => rs.put(v, k));
      del.forEach(k => rs.delete(k));
      Object.entries(meta).forEach(([k, v]) => ms.put(v, k));
      return done(t);
    },
    async backups() { return (await entries('backups')).map(e => e[1]).sort((a, b) => b.at - a.at); },
    async putBackup(b) { const d = await open(), t = d.transaction('backups', 'readwrite'); t.objectStore('backups').put(b); return done(t); },
    async putBlob(k, blob) { const d = await open(), t = d.transaction('blobs', 'readwrite'); t.objectStore('blobs').put(blob, k); return done(t); },
    async getBlob(k) { const d = await open(), t = d.transaction('blobs', 'readonly'); return req(t.objectStore('blobs').get(k)); },
    async delBlob(k) { const d = await open(), t = d.transaction('blobs', 'readwrite'); t.objectStore('blobs').delete(k); return done(t); },
    async delBackups(ids) { const d = await open(), t = d.transaction('backups', 'readwrite'); ids.forEach(id => t.objectStore('backups').delete(id)); return done(t); },
  };
})();
