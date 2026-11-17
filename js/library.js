'use strict';
/* ---------- Phase 2: plans with videos + exercise library ---------- */
const vidOf = ex => { const id = ytId(ex.video); if (!id) return null; const known = (ex.videos || []).find(v => v.id === id); return known || { id, title: 'Your video', channel: '' }; };

function viewPlans() {
  if (editPlanId) return viewPlanEdit();
  return `<h2 style="margin-top:6px">Your plans</h2>
  <div class="muted xs" style="margin:-4px 2px 10px">Tap a plan to see every exercise with its demo video.</div>
  ${S.plans.map(p => {
    const open = !!ui.planOpen[p.id];
    return `<section class="card plan2 ${open ? 'open' : ''}">
      <div class="plan-top"><button class="grow plan-tog" data-a="plan-toggle" data-id="${p.id}" aria-expanded="${open}">
          <div class="nm">${esc(p.name)}</div><div class="muted sm">${p.items.length} exercises · ${p.items.reduce((a, i) => a + (+i.sets || 0), 0)} sets</div></button>
        <button class="btn sm" data-a="plan-edit" data-id="${p.id}">Edit</button><button class="btn sm acc" data-a="start" data-id="${p.id}">Start</button></div>
      ${open ? `<div class="pex">${p.items.map((it, k) => { const ex = lib(it.exId), v = vidOf(ex); return `
        <button class="pex-row" data-a="ex-info" data-id="${ex.id}">
          ${v ? `<span class="thumb"><img src="${ytThumb(v.id)}" alt="" loading="lazy">${IC.play}</span>` : `<span class="thumb none">${IC.play}</span>`}
          <span class="grow" style="min-width:0"><span class="t ellip">${k + 1}. ${esc(ex.name)}</span>
            <span class="muted xs ellip">${it.sets} × ${esc(it.reps)}${it.weight ? ` · next ${it.weight} ${unit()}` : ''}${v ? ' · ' + esc(v.channel || 'video') : ' · no video'}</span></span></button>`; }).join('') || '<div class="empty">No exercises yet.</div>'}</div>` : ''}
    </section>`; }).join('') || emptyCard('No plans yet', 'Create your first plan.')}
  <button class="btn block" data-a="plan-new">+ New plan</button>
  ${viewLibrary()}`;
}
ACT['plan-toggle'] = b => { ui.planOpen[b.dataset.id] = !ui.planOpen[b.dataset.id]; render(); };

function viewLibrary() {
  const q = ui.libQ.toLowerCase().trim();
  const list = S.library.filter(e => (ui.libM === 'All' || (musclesOf(e).primary.some(m => MUSCLE_INFO[m]?.group === ui.libM) || e.muscle === ui.libM))
    && (ui.libE === 'All' || (e.equipment || '') === ui.libE) && (!q || e.name.toLowerCase().includes(q))).sort((a, b) => a.name.localeCompare(b.name));
  const groups = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Glutes', 'Core', 'Cardio'];
  const eqs = ['All', ...new Set(S.library.map(e => e.equipment).filter(Boolean))];
  return `<div class="row between"><h2>Exercise library</h2><button class="btn sm ghost" data-a="ex-new" style="margin-top:14px">+ Custom</button></div>
  <input class="in" placeholder="Search ${S.library.length} exercises" value="${esc(ui.libQ)}" data-c="libq" data-live="1" autocomplete="off">
  <div class="chips scroll">${groups.map(m => `<button class="chip btnchip ${m === ui.libM ? 'on' : ''}" data-a="lib-m" data-v="${m}">${m}</button>`).join('')}</div>
  <div class="chips scroll" style="margin-top:6px">${eqs.map(m => `<button class="chip btnchip ${m === ui.libE ? 'on' : ''}" data-a="lib-e" data-v="${m}">${m === 'All' ? 'Any equipment' : m}</button>`).join('')}</div>
  <div class="card" style="padding:4px 12px;margin-top:10px" id="libList">${libRows(list)}</div>`;
}
const libRows = list => list.map(e => { const v = vidOf(e); return `<button class="li pick" data-a="ex-info" data-id="${e.id}">
    ${v ? `<span class="thumb sm"><img src="${ytThumb(v.id)}" alt="" loading="lazy"></span>` : `<span class="thumb sm none">${IC.play}</span>`}
    <span class="grow" style="min-width:0"><span class="t ellip">${esc(e.name)}</span><br><span class="muted xs">${esc(musclesOf(e).primary.map(m => MUSCLE_INFO[m]?.name).join(', ') || e.muscle)}${e.equipment ? ' · ' + e.equipment : ''}${e.level ? ' · ' + e.level : ''}</span></span></button>`; }).join('') || '<div class="empty">No exercise matches.</div>';
ACT['lib-m'] = b => { ui.libM = b.dataset.v; render(); };
ACT['lib-e'] = b => { ui.libE = b.dataset.v; render(); };
CHG['libq'] = t => { ui.libQ = t.value; const q = t.value.toLowerCase(); const el = $('#libList'); if (el) el.innerHTML = libRows(S.library.filter(e => e.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name))); };

/* exercise detail */
function openExInfo(id) {
  const ex = lib(id), d = EXDB[ex.name] || {}, v = vidOf(ex), m = musclesOf(ex);
  const backup = (ex.videos || []).filter(x => x.id !== (v && v.id));
  const prs = personalRecords(S.workouts)[id];
  openSheet(`<div class="sheet-h"><h3>${esc(ex.name)}</h3><button class="icon" data-a="close">${IC.x}</button></div>
    ${v ? `<div class="frame" id="ytbox"><div id="ytp" data-vid="${v.id}"></div></div>
      <div class="vmeta"><div class="grow" style="min-width:0"><div class="sm ellip">${esc(v.title)}</div><div class="muted xs">${esc(v.channel)}${ex.videoStatus === 'unavailable' ? ' · <span style="color:#ff6b6b">unavailable</span>' : ''}</div></div>
        <a class="btn sm" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=${v.id}">YouTube ↗</a></div>`
      : `<div class="empty sm">No video yet.</div>`}
    <div class="row gap" style="margin-top:8px;flex-wrap:wrap">
      ${backup.length ? `<button class="btn sm" data-a="vid-next" data-id="${ex.id}">Try another video</button>` : ''}
      <button class="btn sm" data-a="vid-find" data-id="${ex.id}">Find a video</button>
      <button class="btn sm ghost" data-a="vid-own" data-id="${ex.id}">Use my own link</button></div>
    <div id="vidFind"></div>
    <div class="chips" style="margin-top:14px">${m.primary.map(k => `<span class="chip on">${MUSCLE_INFO[k]?.name || k}</span>`).join('')}${m.secondary.map(k => `<span class="chip">${MUSCLE_INFO[k]?.name || k}</span>`).join('')}
      ${ex.equipment ? `<span class="chip ghost">${ex.equipment}</span>` : ''}${ex.level ? `<span class="chip ghost">${ex.level}</span>` : ''}</div>
    ${prs ? `<div class="tiles" style="margin-top:12px"><div class="tile"><div class="v">${round1(prs.e1)}</div><div class="l">Best est. 1RM</div></div><div class="tile"><div class="v">${prs.heavy}</div><div class="l">Heaviest ${unit()}</div></div><div class="tile"><div class="v">${prs.reps}</div><div class="l">Most reps</div></div></div>` : ''}
    ${d.steps ? `<h2 style="margin:16px 2px 6px">How to do it</h2><ol class="steps">${d.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      <h2 style="margin:14px 2px 6px">Common mistakes</h2><ul class="steps warn">${d.mistakes.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      <div class="row between sm" style="margin-top:12px"><span class="muted">Suggested</span><b>${esc(d.rec)}</b></div>
      ${d.alts.length ? `<h2 style="margin:14px 2px 6px">Alternatives</h2><div class="chips">${d.alts.map(n => { const a = S.library.find(e => e.name === n); return a ? `<button class="chip btnchip" data-a="ex-info" data-id="${a.id}">${esc(n)}</button>` : `<span class="chip">${esc(n)}</span>`; }).join('')}</div>` : ''}
      <div class="muted xs" style="margin-top:12px">General coaching guidance. Stop if something hurts and ask a qualified coach or physio.</div>`
      : `<div class="muted sm" style="margin-top:12px">Custom exercise. Add your own notes and video.</div>`}
    <button class="btn block" data-a="ex-edit" data-id="${ex.id}" style="margin-top:14px">Edit exercise</button>`);
  if (v) mountPlayer(ex, v.id);
}
ACT['ex-info'] = b => openExInfo(b.dataset.id);

/* YouTube player: the official IFrame API tells us when a video is unavailable, so we can switch to the backup */
let ytReady;
function loadYT() {
  return ytReady || (ytReady = new Promise(res => {
    if (window.YT && YT.Player) return res();
    window.onYouTubeIframeAPIReady = () => res();
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = () => { ytReady = null; res(); }; document.head.appendChild(s);
  }));
}
async function mountPlayer(ex, id) {
  await loadYT();
  const el = document.getElementById('ytp'); if (!el || el.dataset.vid !== id) return;
  if (!(window.YT && YT.Player)) { el.outerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="${esc(ex.name)}"></iframe>`; return; }
  new YT.Player('ytp', { videoId: id, host: 'https://www.youtube-nocookie.com', playerVars: { rel: 0, playsinline: 1, modestbranding: 1 },
    events: { onError: e => { if ([100, 101, 150, 5].includes(e.data)) videoUnavailable(ex, id); } } });
}
function videoUnavailable(ex, id) {
  const next = (ex.videos || []).find(v => v.id !== id && v.status !== 'unavailable');
  (ex.videos || []).forEach(v => { if (v.id === id) v.status = 'unavailable'; });
  if (next && !ex.videoCustom) { ex.video = 'https://www.youtube.com/watch?v=' + next.id; save(); toast('That video is no longer available — switched to the backup'); openExInfo(ex.id); }
  else { ex.videoStatus = 'unavailable'; save(); toast('This video is unavailable. Pick another one below.'); }
}
ACT['vid-next'] = b => {
  const ex = lib(b.dataset.id), cur = ytId(ex.video), list = (ex.videos || []).filter(v => v.status !== 'unavailable');
  const i = list.findIndex(v => v.id === cur), next = list[(i + 1) % list.length];
  if (next) { ex.video = 'https://www.youtube.com/watch?v=' + next.id; ex.videoCustom = false; ex.videoStatus = ''; save(); openExInfo(ex.id); render(); }
};
ACT['vid-own'] = b => {
  const ex = lib(b.dataset.id);
  $('#vidFind').innerHTML = `<div class="row gap" style="margin-top:10px"><input class="in" id="ownLink" placeholder="Paste a YouTube link" value="${esc(ex.videoCustom ? ex.video : '')}"><button class="btn acc" data-a="vid-own-save" data-id="${ex.id}">Save</button></div>`;
};
ACT['vid-own-save'] = b => {
  const ex = lib(b.dataset.id), link = $('#ownLink').value.trim(), id = ytId(link);
  if (!id) return toast("That doesn't look like a YouTube link");
  ex.video = 'https://www.youtube.com/watch?v=' + id; ex.videoCustom = true; ex.videoStatus = '';
  ex.videos = ex.videos || []; if (!ex.videos.some(v => v.id === id)) ex.videos.push({ id, title: 'Your video', channel: 'Added by you' });
  save(); toast('Video saved for this exercise'); openExInfo(ex.id); render();
};
// Search: in the app through your Google account (Media add-on), otherwise on YouTube itself
ACT['vid-find'] = async b => {
  const ex = lib(b.dataset.id), q = ex.name + ' proper form tutorial', box = $('#vidFind');
  if (!mediaReady()) { box.innerHTML = `<div class="muted xs" style="margin-top:10px">In-app search needs the Media add-on (Settings). Meanwhile: <a style="color:var(--acc)" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(q)}">search on YouTube ↗</a>, copy a link, then tap "Use my own link".</div>`; return; }
  box.innerHTML = `<div style="margin-top:10px">${skeleton(3)}</div>`;
  try {
    const { items } = await media('ytSearch', { q });
    box.innerHTML = items.length ? `<div class="group" style="margin-top:10px">${items.map(v => `<button class="li pick" data-a="vid-pick" data-id="${ex.id}" data-v="${v.id}" data-t="${esc(v.title)}" data-ch="${esc(v.channel)}"><span class="thumb sm"><img src="${ytThumb(v.id)}" alt=""></span><span class="grow" style="min-width:0"><span class="t ellip">${esc(v.title)}</span><br><span class="muted xs">${esc(v.channel)}</span></span><span class="chip">Use</span></button>`).join('')}</div>` : '<div class="empty">No results.</div>';
  } catch (e) { box.innerHTML = `<div class="empty">Search didn't work (${esc(e.message)}).</div>`; }
};
ACT['vid-pick'] = b => {
  const ex = lib(b.dataset.id), id = b.dataset.v;
  ex.videos = ex.videos || []; if (!ex.videos.some(v => v.id === id)) ex.videos.unshift({ id, title: b.dataset.t, channel: b.dataset.ch });
  ex.video = 'https://www.youtube.com/watch?v=' + id; ex.videoCustom = true; ex.videoStatus = '';
  save(); toast('Video saved'); openExInfo(ex.id); render();
};
