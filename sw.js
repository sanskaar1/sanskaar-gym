/* Sanskaar GYM service worker: lets the app open with no internet.
 * Online, every file is fetched fresh (so updates arrive straight away) and the copy here is refreshed.
 * Offline, or when the network takes more than 4 seconds, the stored copy is used.
 * Requests to Google (the Sheet) are never touched. */
const CACHE = 'sgym-shell';
const SHELL = ['./', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png',
  'js/util.js', 'js/records.js', 'js/db.js', 'js/store.js', 'js/calc.js', 'js/views.js', 'js/overlays.js', 'js/sync.js', 'js/actions.js', 'js/viewport.js', 'js/main.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  const same = url.origin === self.location.origin, font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!same && !font) return;
  e.respondWith(fresh(req, same));
});

async function fresh(req, same) {
  const cache = await caches.open(CACHE);
  const key = same && req.mode === 'navigate' ? 'index.html' : req;
  // A page navigation can't be re-fetched with options, so fetch its address instead
  const net = (same ? fetch(req.mode === 'navigate' ? req.url : req, { cache: 'no-cache' }) : fetch(req)).then(res => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(key, res.clone());
    return res;
  });
  const timeout = new Promise(r => setTimeout(r, 4000));
  try {
    const res = await Promise.race([net, timeout]);
    if (res) return res;
  } catch (err) { /* offline */ }
  const hit = await cache.match(key, { ignoreSearch: true });
  return hit || net;
}
