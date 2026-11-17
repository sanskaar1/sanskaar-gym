'use strict';
/* ---------- Phase 7: recovery ----------
 * One record per day ("days"): sleep, sleep quality, fatigue, soreness, rest day, resting heart rate, HRV, water, notes.
 * Values imported from Apple Health (through an iPhone Shortcut) are marked "Health"; nothing is ever made up.
 */
const FATIGUE = ['', 'Fresh', 'Good', 'OK', 'Tired', 'Exhausted'];
const QUALITY = ['', 'Poor', 'Fair', 'OK', 'Good', 'Great'];
const SORE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Glutes', 'Core'];
const SORE = ['None', 'Mild', 'Sore', 'Very'];

function viewRecovery() {
  const key = ui.recDay || todayKey(), d = dayRec(key) || {}, now = Date.now();
  const trained = S.workouts.some(w => ymd(w.start) === key);
  const step = (k, v, s, max) => `<div class="stepper"><button data-a="rc-step" data-k="${k}" data-d="-${s}" aria-label="Less">−</button><span>${v === '' || v == null ? '—' : v}</span><button data-a="rc-step" data-k="${k}" data-d="${s}" data-max="${max}" aria-label="More">+</button></div>`;
  return `<div class="daynav"><button class="icon" data-a="rc-day" data-d="-1" aria-label="Previous day">${IC.back}</button>
      <div class="grow" style="text-align:center"><b>${key === todayKey() ? 'Today' : nice(fromKey(key))}</b><div class="muted xs">${trained ? 'Training day' : d.rest ? 'Rest day' : 'No workout logged'}${d.src === 'health' ? ' · includes Apple Health data' : ''}</div></div>
      <button class="icon" data-a="rc-day" data-d="1" aria-label="Next day" ${key >= todayKey() ? 'disabled style="opacity:.3"' : ''}><span style="display:inline-block;transform:rotate(180deg)">${IC.back}</span></button></div>
    <div class="group">
      ${srow('moon', 'Sleep', 'Hours last night', step('sleep', d.sleep, 0.5, 14))}
      <div class="srow" style="display:block"><div class="t">Sleep quality</div><div class="chips" style="margin-top:6px">${QUALITY.slice(1).map((l, i) => `<button class="chip btnchip ${+d.sleepQ === i + 1 ? 'on' : ''}" data-a="rc-set" data-k="sleepQ" data-v="${i + 1}">${l}</button>`).join('')}</div></div>
      <div class="srow" style="display:block"><div class="t">Energy / fatigue</div><div class="chips" style="margin-top:6px">${FATIGUE.slice(1).map((l, i) => `<button class="chip btnchip ${+d.fatigue === i + 1 ? 'on' : ''}" data-a="rc-set" data-k="fatigue" data-v="${i + 1}">${l}</button>`).join('')}</div></div>
      <div class="srow" style="display:block"><div class="t">Soreness</div>${SORE_GROUPS.map(g => { const cur = d.sore?.[g] || 0; return `<div class="row between" style="margin-top:2px"><span class="sm">${g}</span><div class="row" style="gap:10px"><div class="sore">${SORE.map((l, i) => `<button class="${i <= cur ? 'on lv' + cur : ''}" data-a="rc-sore" data-g="${g}" data-v="${i}" aria-label="${g} soreness: ${l}" aria-pressed="${i === cur}"><i></i></button>`).join('')}</div><span class="sm" style="width:38px;text-align:right;font-weight:600">${SORE[cur]}</span></div></div>`; }).join('')}</div>
      ${srow('heart', 'Resting heart rate', d.rhrSrc === 'health' ? 'From Apple Health' : 'bpm, optional', `<input class="mini-in" inputmode="numeric" value="${esc(d.rhr ?? '')}" data-c="rc" data-k="rhr" placeholder="—">`)}
      ${srow('wave', 'HRV', d.hrvSrc === 'health' ? 'From Apple Health' : 'ms, optional', `<input class="mini-in" inputmode="numeric" value="${esc(d.hrv ?? '')}" data-c="rc" data-k="hrv" placeholder="—">`)}
      ${srow('rest', 'Rest day', 'Planned day off', `<button class="seg-t ${d.rest ? 'on' : ''}" data-a="rc-rest">${d.rest ? 'Yes' : 'No'}</button>`)}
      <div class="srow" style="display:block"><textarea class="in" rows="2" placeholder="Notes (stress, illness, travel…)" data-c="rc" data-k="notes">${esc(d.notes || '')}</textarea></div>
    </div>
    ${recoveryWeek(now)}
    <h2>Apple Health</h2><div class="card"><div class="sm">Web apps can't read Apple Health directly. A one-time iPhone Shortcut can send sleep, resting heart rate, HRV and weight here each morning.</div>
      <button class="btn block" data-a="health-help" style="margin-top:10px">Set up the Shortcut</button></div>`;
}
function recoveryWeek(now) {
  const days = []; for (let i = 6; i >= 0; i--) days.push(ymd(now - i * DAY));
  const recs = days.map(k => dayRec(k) || {}), labels = days.map(k => new Date(fromKey(k)).toLocaleDateString(undefined, { weekday: 'short' }));
  const vals = k => recs.map(r => r[k] === '' || r[k] == null ? null : +r[k]), avg = a => { const x = a.filter(v => v != null); return x.length ? round1(x.reduce((s, v) => s + v, 0) / x.length) : null; };
  const sleep = vals('sleep'), fat = vals('fatigue');
  const restDays = days.filter((k, i) => recs[i].rest || !S.workouts.some(w => ymd(w.start) === k)).length;
  const soreTop = {}; recs.forEach(r => Object.entries(r.sore || {}).forEach(([g, v]) => { if (v) soreTop[g] = (soreTop[g] || 0) + v; }));
  const series = k => S.days.filter(r => r[k] !== '' && r[k] != null && fromKey(r.id) >= now - 30 * DAY).sort((a, b) => a.id.localeCompare(b.id)).map(r => ({ x: fromKey(r.id), y: +r[k] }));
  const rhr = series('rhr'), hrv = series('hrv');
  if (!sleep.some(v => v != null) && !fat.some(v => v != null) && !rhr.length) return '';
  return `<h2>This week</h2><section class="card">
    <div class="tiles" style="margin-top:0"><div class="tile"><div class="v">${avg(sleep) ?? '—'}<small> h</small></div><div class="l">Avg sleep</div></div><div class="tile"><div class="v">${avg(fat) ? FATIGUE[Math.round(avg(fat))] : '—'}</div><div class="l">Avg energy</div></div><div class="tile"><div class="v">${restDays}</div><div class="l">Days without training</div></div></div>
    ${sleep.some(v => v != null) ? barChart2(labels, [{ label: 'Sleep', data: sleep, backgroundColor: sleep.map(v => v != null && v < 7 ? '#8c6bd6' : '#b197fc') }], { h: 150, fmt: v => v + ' h' }) : ''}
    ${Object.keys(soreTop).length ? `<div class="muted xs" style="margin-top:6px">Most sore: ${Object.entries(soreTop).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g).join(', ')}</div>` : ''}
    ${avg(sleep) != null && avg(sleep) < 7 ? `<div class="sm" style="margin-top:8px;color:#ffa94d">Under 7 h average sleep this week — recovery and strength gains usually suffer with short sleep.</div>` : ''}
  </section>
  ${rhr.length > 1 ? `<h2>Resting heart rate · 30 days</h2><section class="card">${lineChart2(rhr, PALETTE.rhr, v => Math.round(v) + ' bpm', { h: 140 })}</section>` : ''}
  ${hrv.length > 1 ? `<h2>HRV · 30 days</h2><section class="card">${lineChart2(hrv, PALETTE.hrv, v => Math.round(v) + ' ms', { h: 140 })}<div class="muted xs">Compare HRV with your own normal, not other people's.</div></section>` : ''}`;
}
const recDay = () => dayRec(ui.recDay || todayKey(), true);
ACT['rc-day'] = b => { const k = ui.recDay || todayKey(), n = ymd(fromKey(k) + +b.dataset.d * DAY); if (n <= todayKey()) { ui.recDay = n === todayKey() ? '' : n; render(); } };
ACT['rc-step'] = b => { const d = recDay(), k = b.dataset.k, cur = d[k] === '' || d[k] == null ? (k === 'sleep' ? 7 : 0) - +b.dataset.d : +d[k]; d[k] = Math.max(0, Math.min(+b.dataset.max || 99, round1(cur + +b.dataset.d))); save(); render(); };
ACT['rc-set'] = b => { const d = recDay(); d[b.dataset.k] = +d[b.dataset.k] === +b.dataset.v ? '' : +b.dataset.v; save(); haptic(); render(); };
ACT['rc-sore'] = b => { const d = recDay(); d.sore = { ...(d.sore || {}), [b.dataset.g]: +b.dataset.v }; save(); render(); };
ACT['rc-rest'] = () => { const d = recDay(); d.rest = !d.rest; save(); render(); };
CHG['rc'] = t => { const d = recDay(), k = t.dataset.k; d[k] = k === 'notes' ? t.value : t.value === '' ? '' : num(t.value); if (k === 'rhr') d.rhrSrc = 'manual'; if (k === 'hrv') d.hrvSrc = 'manual'; save(); };

ACT['health-help'] = () => {
  const url = SHEET_API;
  openSheet(`<div class="sheet-h"><h3>Apple Health → Sanskaar GYM</h3><button class="icon" data-a="close">${IC.x}</button></div>
    <div class="sm" style="line-height:1.55">In the iPhone <b>Shortcuts</b> app, create a shortcut with these actions:
    <ol class="steps" style="margin-top:8px">
      <li><b>Find Health Samples</b> where Type is <i>Resting Heart Rate</i>, sorted by Start Date (newest first), limit 1. Then <b>Get Details of Health Sample</b> → Value.</li>
      <li>Repeat for <i>Heart Rate Variability</i>, <i>Sleep</i> (sum of "Asleep" hours for last night) and <i>Weight</i> if you want.</li>
      <li><b>Text</b> action with:<pre class="code">{"key":"YOUR-KEY","action":"health","data":{"date":"<i>Current Date, yyyy-MM-dd</i>","rhr":<i>RHR</i>,"hrv":<i>HRV</i>,"sleep":<i>hours</i>,"weight":<i>kg</i>}}</pre>Replace YOUR-KEY with your private key (the one you connected with).</li>
      <li><b>Get Contents of URL</b>: method <b>POST</b>, request body <b>File</b> = the Text above, URL:<pre class="code">${esc(url)}</pre></li>
      <li>In <b>Automation</b>, run it every morning (e.g. when your alarm stops).</li></ol>
    Leave out any value you don't track. Data arrives on your next sync, marked "Health".</div>`);
};
