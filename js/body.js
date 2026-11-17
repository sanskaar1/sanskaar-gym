'use strict';
/* ---------- Phase 1: body analytics ---------- */
const BODY_F = () => [['weight', 'Weight', unit()], ['bf', 'Body fat', '%'], ['waist', 'Waist', lenUnit()], ['chest', 'Chest', lenUnit()],
  ['shoulders', 'Shoulders', lenUnit()], ['arms', 'Biceps', lenUnit()], ['forearms', 'Forearms', lenUnit()], ['thighs', 'Thighs', lenUnit()],
  ['calves', 'Calves', lenUnit()], ['neck', 'Neck', lenUnit()]];
// For these, going down is usually the goal, so a drop shows in the "good" colour
const DOWN_IS_GOOD = { bf: 1, waist: 1 };
const fmtU = (v, u) => `${round1(v)}${u === '%' ? '%' : ' ' + u}`;

function bmiSeries(from) {
  const h = num(S.settings.height); if (!h) return [];
  return bodySeries(S.body, 'weight', from).map(p => ({ ...p, y: round1(bmiOf(p.y, h, unit())) }));
}

function viewBody() {
  const now = Date.now(), from = rangeFrom(ui.range, now), F = BODY_F();
  const list = [...S.body].sort((a, b) => b.date.localeCompare(a.date));
  if (!list.length) return `${bodyHead()}${emptyCard('No measurements yet', 'Log your weight and sizes to see charts, changes and comparisons here.', `<button class="btn acc" data-a="body-log" style="margin-top:14px">Log measurements</button>`)}`;
  const metrics = F.map(([k, l, u]) => ({ k, l, u, pts: bodySeries(S.body, k, from) })).concat([{ k: 'bmi', l: 'BMI', u: '', pts: bmiSeries(from) }]).filter(m => m.pts.length);
  const cards = metrics.map(m => {
    const s = seriesSummary(m.pts), good = DOWN_IS_GOOD[m.k] ? s.change < 0 : null, col = PALETTE[m.k];
    const delta = s.n > 1 ? `<span class="delta2 ${good === null ? '' : good ? 'good' : 'bad'}">${signedN(s.change)}${m.u === '%' ? ' pts' : m.u ? ' ' + m.u : ''} · ${signedN(s.pct)}%</span>` : '<span class="muted xs">1 entry</span>';
    return `<section class="card metric" style="--mc:${col}">
      <div class="row between"><div><div class="mt">${m.l}</div><div class="mv">${round1(s.current)}<small> ${m.u}</small></div></div><div style="text-align:right">${delta}<div class="muted xs" style="margin-top:4px">${s.n > 1 ? `from ${round1(s.start)} on ${shortDate(fromKey(s.from))}` : shortDate(fromKey(s.to))}</div></div></div>
      ${s.n > 1 ? lineChart2(m.pts, col, v => round1(v) + (m.u === '%' ? '%' : m.u ? ' ' + m.u : ''), { h: 140 }) : '<div class="muted xs" style="padding:14px 0 4px">Log one more entry to see the trend.</div>'}
    </section>`;
  }).join('');
  return `${bodyHead()}
    ${segBar(Object.keys(RANGES).map(k => [k, k]), ui.range, 'range', 'scroll')}
    ${metrics.length ? `<div class="muted xs" style="margin:2px 2px 10px">Start vs latest within ${ui.range === 'All' ? 'all time' : 'the last ' + ui.range}. Missing entries are left out, never estimated.</div>${cards}`
      : emptyCard('Nothing in this period', 'Pick a longer range to see older entries.')}
    ${compareDates(list)}
    <h2>History</h2>${historyTable(list)}`;
}
function bodyHead() {
  return `<div class="row between" style="margin:2px 0 12px"><h2 style="margin:0">Body</h2><div class="row gap"><button class="btn sm" data-a="go-photos">Photos</button><button class="btn sm acc" data-a="body-log">+ Log</button></div></div>`;
}
function compareDates(list) {
  if (list.length < 2) return '';
  const dates = list.map(b => b.date);
  if (!dates.includes(ui.cmpA)) ui.cmpA = dates[dates.length - 1];
  if (!dates.includes(ui.cmpB)) ui.cmpB = dates[0];
  const A = list.find(b => b.date === ui.cmpA), B = list.find(b => b.date === ui.cmpB), h = num(S.settings.height);
  const opt = cur => dates.map(d => `<option value="${d}" ${d === cur ? 'selected' : ''}>${nice(d + 'T12:00')}</option>`).join('');
  const rows = BODY_F().concat([['bmi', 'BMI', '']]).map(([k, l, u]) => {
    const a = k === 'bmi' ? (A.weight && h ? round1(bmiOf(+A.weight, h, unit())) : '') : A[k], b = k === 'bmi' ? (B.weight && h ? round1(bmiOf(+B.weight, h, unit())) : '') : B[k];
    if ((a === '' || a == null) && (b === '' || b == null)) return '';
    const both = a !== '' && a != null && b !== '' && b != null, d = both ? +b - +a : 0;
    return `<tr><td>${l}</td><td>${a !== '' && a != null ? a : '—'}</td><td>${b !== '' && b != null ? b : '—'}</td><td class="${both && d ? (DOWN_IS_GOOD[k] ? (d < 0 ? 'good' : 'bad') : '') : ''}">${both ? signedN(d) + (+a ? ` <small>(${signedN(pct(+b, +a))}%)</small>` : '') : '—'}</td></tr>`;
  }).join('');
  return `<h2>Compare two dates</h2><div class="card">
    <div class="grid2"><label class="f">From<select class="in" data-c="cmpA">${opt(ui.cmpA)}</select></label><label class="f">To<select class="in" data-c="cmpB">${opt(ui.cmpB)}</select></label></div>
    <div class="tscroll"><table class="tbl"><thead><tr><th></th><th>${short(fromKey(ui.cmpA))}</th><th>${short(fromKey(ui.cmpB))}</th><th>Change</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
function historyTable(list) {
  const F = BODY_F().filter(([k]) => list.some(b => b[k] !== '' && b[k] != null));
  return `<div class="card" style="padding:6px 0"><div class="tscroll"><table class="tbl sticky1"><thead><tr><th>Date</th>${F.map(([, l, u]) => `<th>${l}<small> ${u}</small></th>`).join('')}<th></th></tr></thead><tbody>
    ${list.map(b => `<tr><td>${short(fromKey(b.date))}${b.notes ? `<div class="muted xs ellip" style="max-width:110px">${esc(b.notes)}</div>` : ''}</td>${F.map(([k]) => `<td>${b[k] !== '' && b[k] != null ? b[k] : '<span class="muted">—</span>'}</td>`).join('')}<td><button class="icon sm" data-a="b-del" data-id="${b.id}" aria-label="Delete entry">${IC.x}</button></td></tr>`).join('')}
  </tbody></table></div></div>`;
}
function openBodyLog() {
  const latest = [...S.body].sort((a, b) => b.date.localeCompare(a.date))[0] || {};
  openSheet(`<div class="sheet-h"><h3>Log measurements</h3><button class="icon" data-a="close">${IC.x}</button></div>
    <label class="f">Date<div class="in datef"><span id="b_date_txt">${nice(Date.now())}</span>${IC.cal}<input type="date" id="b_date" value="${ymd(Date.now())}" aria-label="Date"></div></label>
    <div class="muted xs" style="margin-top:8px">Fill in only what you measured. Grey numbers are your last entry.</div>
    <div class="grid2" style="margin-top:6px">${BODY_F().map(([k, l, u]) => `<label class="f">${l} <small class="muted">${u}</small><input class="in" inputmode="decimal" id="b_${k}" placeholder="${latest[k] !== '' && latest[k] != null ? latest[k] : ''}"></label>`).join('')}</div>
    <label class="f" style="margin-top:10px">Notes<input class="in" id="b_notes" placeholder="Sleep, diet, how you feel…"></label>
    <button class="btn acc block" data-a="body-save">Save entry</button>`);
}
ACT['body-log'] = () => openBodyLog();
ACT['range'] = b => { ui.range = b.dataset.v; render(); };
ACT['body-save'] = () => {
  const e = { id: uid(), date: $('#b_date').value || ymd(Date.now()), notes: $('#b_notes').value.trim(), synced: false };
  let any = false;
  BODY_F().forEach(([k]) => { const v = $('#b_' + k).value.trim(); e[k] = v === '' ? '' : num(v); if (v !== '') any = true; });
  if (!any) return toast('Enter at least one measurement');
  S.body.push(e); save(); closeSheet(); render(); haptic('success'); toast('Body stats saved'); checkAwards();
};
CHG['cmpA'] = t => { ui.cmpA = t.value; render(); };
CHG['cmpB'] = t => { ui.cmpB = t.value; render(); };

/* ---------- Phase 1: transformation photos ----------
 * Each photo: full image on this phone (IndexedDB) + a small preview in the photo's record (synced to your private Sheet).
 * With the Media add-on approved, the full image is also copied to a private folder in your Google Drive.
 */
const POSES = [['front', 'Front'], ['side', 'Side'], ['back', 'Back']];
const photoURLs = {};
async function photoURL(p) {
  if (photoURLs[p.id]) return photoURLs[p.id];
  let blob = dbOk ? await DB.getBlob(p.id).catch(() => null) : null;
  if (!blob && p.drive && mediaReady()) { blob = await mediaPhotoGet(p).catch(() => null); if (blob && dbOk) DB.putBlob(p.id, blob).catch(() => {}); }
  return (photoURLs[p.id] = blob ? URL.createObjectURL(blob) : p.thumb);
}
function viewPhotos() {
  const ps = [...S.photos].sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at);
  const byMonth = {};
  ps.forEach(p => (byMonth[p.date.slice(0, 7)] = byMonth[p.date.slice(0, 7)] || []).push(p));
  return `<div class="page-h"><button class="icon" data-a="profile-back" aria-label="Back">${IC.back}</button><h3>Transformation</h3></div>
    <div class="row gap" style="margin-bottom:12px"><button class="btn acc" style="flex:1" data-a="photo-add">+ Add photo</button><button class="btn" style="flex:1" data-a="photo-compare" ${ps.length < 2 ? 'disabled' : ''}>Compare</button></div>
    <div class="muted xs" style="margin:0 2px 14px">${mediaReady() ? 'Photos are kept on this phone and backed up to a private folder in your Google Drive.' : 'Photos are kept privately on this phone. Approve the Media add-on in Settings to back them up to your own Google Drive.'}</div>
    ${ps.length ? Object.entries(byMonth).map(([m, list]) => `<h2>${monthName(fromKey(m + '-15'))}</h2><div class="pgrid">${list.map(p => `
      <button class="ph" data-a="photo-open" data-id="${p.id}"><img src="${p.thumb}" alt="${p.pose} photo ${p.date}" loading="lazy"><span>${POSES.find(x => x[0] === p.pose)?.[1] || p.pose} · ${short(fromKey(p.date))}</span></button>`).join('')}</div>`).join('')
      : emptyCard('No photos yet', 'Take front, side and back photos in the same spot and light every few weeks. Comparing them shows changes the scale misses.')}`;
}
ACT['go-photos'] = () => { tab = 'profile'; ui.profile = 'photos'; render(); scrollTo(0, 0); };
ACT['photo-add'] = () => {
  openSheet(`<div class="sheet-h"><h3>Add progress photo</h3><button class="icon" data-a="close">${IC.x}</button></div>
    <label class="f">Pose</label>${segBar(POSES, ui.pose || 'front', 'pose-pick')}
    <label class="f" style="margin-top:12px">Date<div class="in datef"><span id="p_date_txt">${nice(Date.now())}</span>${IC.cal}<input type="date" id="p_date" value="${ymd(Date.now())}" data-c="pdate"></div></label>
    <label class="btn acc block" style="margin-top:16px">Choose or take photo<input type="file" accept="image/*" id="p_file" data-c="pfile" hidden></label>
    <div class="muted xs" style="margin-top:10px">Tip: same place, same light, same distance each time.</div>`);
};
ACT['pose-pick'] = b => { ui.pose = b.dataset.v; document.querySelectorAll('[data-a="pose-pick"]').forEach(x => x.classList.toggle('on', x === b)); };
CHG['pdate'] = t => { $('#p_date_txt').textContent = nice(t.value + 'T12:00'); };
CHG['pfile'] = async t => {
  const f = t.files[0]; if (!f) return;
  toast('Saving photo…');
  try {
    const full = await shrinkImage(f, 1600, .85), thumb = await shrinkImage(f, 320, .7, true);
    const p = { id: uid(), date: $('#p_date').value || ymd(Date.now()), pose: ui.pose || 'front', thumb, at: Date.now(), drive: '' };
    if (dbOk) await DB.putBlob(p.id, full.blob);
    S.photos.push(p); save(); closeSheet(); render(); haptic('success'); toast('Photo saved');
    if (mediaReady()) mediaPhotoPut(p, full.blob).then(id => { const x = S.photos.find(q => q.id === p.id); if (x) { x.drive = id; save(); } }).catch(() => {});
  } catch (e) { toast('That photo could not be read'); }
};
// Resize in the browser so photos stay small; returns a Blob (or a data URL for previews)
function shrinkImage(file, max, quality, asDataURL) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      if (asDataURL) return res(c.toDataURL('image/jpeg', quality));
      c.toBlob(b => b ? res({ blob: b, w: c.width, h: c.height }) : rej(new Error('encode')), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('read')); };
    img.src = url;
  });
}
ACT['photo-open'] = async b => {
  const p = S.photos.find(x => x.id === b.dataset.id); if (!p) return;
  const m = nearestBody(p.date);
  openSheet(`<div class="sheet-h"><h3>${POSES.find(x => x[0] === p.pose)?.[1]} · ${nice(fromKey(p.date))}</h3><button class="icon" data-a="close">${IC.x}</button></div>
    <div class="photo-full"><img id="pfull" src="${p.thumb}" alt="Progress photo">${overlay(m)}</div>
    <button class="btn danger block" data-a="photo-del" data-id="${p.id}">Delete photo</button>`);
  const u = await photoURL(p); const el = $('#pfull'); if (el) el.src = u;
};
ACT['photo-del'] = b => ask('Delete this photo from this phone and your Sheet? (A Drive copy, if any, is moved to your Drive bin.)', 'Delete', async () => {
  const p = S.photos.find(x => x.id === b.dataset.id); if (!p) return;
  S.photos = S.photos.filter(x => x.id !== p.id); save(); if (dbOk) DB.delBlob(p.id).catch(() => {});
  if (p.drive && mediaReady()) media('photoDel', { fileId: p.drive }).catch(() => {});
  render();
});
// Measurements logged within a week of a photo, shown on top of it
function nearestBody(date) {
  const t = fromKey(date); let best = null;
  for (const b of S.body) { const d = Math.abs(fromKey(b.date) - t); if (d <= 7 * DAY && (!best || d < best.d)) best = { d, b }; }
  return best && best.b;
}
const overlay = m => m ? `<div class="povl">${[['weight', unit()], ['bf', '%'], ['waist', lenUnit()]].filter(([k]) => m[k] !== '' && m[k] != null).map(([k, u]) => `<span>${fmtU(+m[k], u)}</span>`).join('')}</div>` : '';
ACT['photo-compare'] = () => { ui.cmpPose = ui.cmpPose || 'front'; ui.cmpMode = ui.cmpMode || 'slider'; openCompare(); };
function openCompare() {
  const ps = S.photos.filter(p => p.pose === ui.cmpPose).sort((a, b) => a.date.localeCompare(b.date));
  if (!ps.find(p => p.id === ui.cmp1)) ui.cmp1 = ps[0]?.id;
  if (!ps.find(p => p.id === ui.cmp2)) ui.cmp2 = ps[ps.length - 1]?.id;
  const opt = cur => ps.map(p => `<option value="${p.id}" ${p.id === cur ? 'selected' : ''}>${nice(fromKey(p.date))}</option>`).join('');
  const A = ps.find(p => p.id === ui.cmp1), B = ps.find(p => p.id === ui.cmp2);
  openSheet(`<div class="sheet-h"><h3>Before / after</h3><button class="icon" data-a="close">${IC.x}</button></div>
    ${segBar(POSES, ui.cmpPose, 'cmp-pose')}
    ${ps.length < 2 ? `<div class="empty">Add at least two ${ui.cmpPose} photos to compare.</div>` : `
    <div class="grid2" style="margin-top:10px"><select class="in" data-c="cmp1">${opt(ui.cmp1)}</select><select class="in" data-c="cmp2">${opt(ui.cmp2)}</select></div>
    ${segBar([['slider', 'Slider'], ['side', 'Side by side']], ui.cmpMode, 'cmp-mode')}
    ${ui.cmpMode === 'slider' ? `<div class="bas" id="bas"><img id="cmpB" src="${B.thumb}" alt="After"><div class="bas-top" id="basTop"><img id="cmpA" src="${A.thumb}" alt="Before"></div><div class="bas-line" id="basLine"></div>
        <span class="bas-tag l">${short(fromKey(A.date))}</span><span class="bas-tag r">${short(fromKey(B.date))}</span></div>
        <input type="range" min="0" max="100" value="50" class="bas-range" data-c="bas" aria-label="Before/after slider">`
      : `<div class="sbs"><div><img id="cmpA" src="${A.thumb}" alt="Before">${overlay(nearestBody(A.date))}<span class="bas-tag l">${short(fromKey(A.date))}</span></div><div><img id="cmpB" src="${B.thumb}" alt="After">${overlay(nearestBody(B.date))}<span class="bas-tag l">${short(fromKey(B.date))}</span></div></div>`}
    ${measureDiff(nearestBody(A.date), nearestBody(B.date))}`}`);
  if (A) photoURL(A).then(u => { const e = $('#cmpA'); if (e) e.src = u; });
  if (B) photoURL(B).then(u => { const e = $('#cmpB'); if (e) e.src = u; });
}
function measureDiff(a, b) {
  if (!a || !b) return '<div class="muted xs" style="margin-top:10px">Log measurements within a week of each photo to see the changes here.</div>';
  const rows = BODY_F().filter(([k]) => a[k] !== '' && a[k] != null && b[k] !== '' && b[k] != null).map(([k, l, u]) => `<span class="chip">${l} ${signedN(+b[k] - +a[k])}${u === '%' ? ' pts' : ' ' + u}</span>`).join('');
  return rows ? `<div class="chips" style="margin-top:10px">${rows}</div>` : '';
}
ACT['cmp-pose'] = b => { ui.cmpPose = b.dataset.v; openCompare(); };
ACT['cmp-mode'] = b => { ui.cmpMode = b.dataset.v; openCompare(); };
CHG['cmp1'] = t => { ui.cmp1 = t.value; openCompare(); };
CHG['cmp2'] = t => { ui.cmp2 = t.value; openCompare(); };
CHG['bas'] = t => { const top = $('#basTop'), line = $('#basLine'); if (top) top.style.clipPath = `inset(0 ${100 - t.value}% 0 0)`; if (line) line.style.left = t.value + '%'; };
