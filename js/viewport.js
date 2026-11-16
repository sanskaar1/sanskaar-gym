'use strict';

// iOS home-screen apps keep the shrunken keyboard-open height after the keyboard closes,
// leaving the tab bar floating with a dark strip below. A forced relayout makes it re-measure.
let fullH = window.innerHeight;
function fixViewport() {
  fullH = Math.max(fullH, window.innerHeight);
  if (fullH - window.innerHeight <= 4 || document.activeElement?.matches('input,textarea,select')) return;
  const y = window.scrollY, b = document.body;
  b.style.display = 'none'; void b.offsetHeight; b.style.display = '';
  window.scrollTo(0, y);
}
// iOS home-screen apps have two bugs that leave a gap under the tab bar: "bottom: 0" landing a
// status-bar's height above the real screen bottom, or the bottom safe-area inset coming back with
// the status bar added on. Measure both and correct them.
const mk = css => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;width:1px;visibility:hidden;pointer-events:none;' + css; document.body.appendChild(d); return d; };
const probe = mk('bottom:0;height:1px'), insets = mk('top:0;height:0;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)');
function fitBottom() {
  const root = document.documentElement.style, cs = getComputedStyle(insets);
  const st = parseFloat(cs.paddingTop) || 0, sb = parseFloat(cs.paddingBottom) || 0;
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const portrait = innerHeight > innerWidth, sw = screen.width, sh = screen.height;
  const full = portrait ? Math.max(sw, sh) : Math.min(sw, sh), pb = Math.round(probe.getBoundingClientRect().bottom);
  let gap = 0, sab = sb;
  if (standalone && !document.activeElement?.matches('input,textarea,select')) {
    gap = Math.round(full - pb); if (gap < 2 || gap > 90) gap = 0; // anything bigger is the keyboard
    if (sb > 44 && st > 0) sab = Math.max(0, sb - st);           // a real bottom inset is at most 34
  }
  const set = (k, v) => { if (root.getPropertyValue(k) !== v) root.setProperty(k, v); };
  set('--fullh', standalone ? full + 'px' : '100%');
  set('--gap', gap + 'px'); set('--sab', sab + 'px');
}
const refit = () => { fixViewport(); fitBottom(); };
window.addEventListener('resize', () => { fullH = Math.max(fullH, window.innerHeight); setTimeout(fitBottom, 50); });
window.addEventListener('orientationchange', () => setTimeout(fitBottom, 300));
document.addEventListener('focusout', () => setTimeout(refit, 150));
document.addEventListener('visibilitychange', () => setTimeout(fitBottom, 100));
window.visualViewport && visualViewport.addEventListener('resize', () => setTimeout(refit, 150));
