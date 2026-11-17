'use strict';

render(); // straight away from the copy in localStorage
if (S.active) keepAwake(true);
initStore().then(async () => {
  // Exercise details and demo videos for the library (never overwrites your own choices)
  if (enrichLibrary(S.library)) save();
  render();
  if (connected()) {
    await sync(false);
    if (enrichLibrary(S.library)) save(); // a phone that just downloaded an older library
    mediaCheck().then(() => { if (mediaReady()) mediaBackfill(); if (tab === 'settings') render(); });
  }
  checkAwards();
}, () => {});
// Keep the app working offline
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
// Store pending changes before iOS suspends the app
addEventListener('pagehide', () => flush());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
