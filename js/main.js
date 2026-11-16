'use strict';

render(); // straight away from the copy in localStorage
if (S.active) keepAwake(true);
initStore().then(() => { render(); if (connected()) sync(false); }, () => {});
// Keep the app working offline
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
// Store pending changes before iOS suspends the app
addEventListener('pagehide', () => flush());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
