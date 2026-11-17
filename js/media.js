'use strict';
/* ---------- Media add-on (Drive photos, YouTube search, AI coach) ----------
 * A separate Google script, so approving it (or not) never affects syncing.
 * Uses the same private key as your Sheet.
 */
const MEDIA_API = 'https://script.google.com/macros/s/AKfycbxY1tDOFmky75Ia7RtWqUcTZ8XwY29w7D5ZAsBazT0Nd6JkkGZKztIi6nBgGs9VPS95/exec';
const MEDIA_EDIT = 'https://script.google.com/d/1mWjNk_xdrM2JedLvEpCMX2KeLfY0i2HJrc1IdWAoo34_tSAWvWumP3ai/edit';
const mediaState = { status: 'unknown', ai: false, checked: 0 }; // unknown | needs-approval | ready | offline | no-key
const mediaReady = () => mediaState.status === 'ready';

async function media(action, data) {
  if (!connected()) throw new Error('Connect your Sheet first');
  const res = await fetch(MEDIA_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key: apiKey, action, data }) });
  let j; try { j = JSON.parse(await res.text()); } catch (e) { mediaState.status = 'needs-approval'; throw new Error('The Media add-on needs your one-time approval (Settings)'); }
  if (!j.ok) throw new Error(j.error || 'failed');
  return j;
}
async function mediaCheck(force) {
  if (!connected()) { mediaState.status = 'no-key'; return mediaState; }
  if (!force && Date.now() - mediaState.checked < 60000) return mediaState;
  mediaState.checked = Date.now();
  try { const j = await media('ping'); mediaState.status = 'ready'; mediaState.ai = !!j.ai; }
  catch (e) { if (mediaState.status !== 'needs-approval') mediaState.status = navigator.onLine === false ? 'offline' : 'needs-approval'; }
  return mediaState;
}
const blobToB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
async function mediaPhotoPut(p, blob) { const { fileId } = await media('photoPut', { id: p.id, date: p.date, pose: p.pose, mime: blob.type, b64: await blobToB64(blob) }); return fileId; }
async function mediaPhotoGet(p) { const { b64, mime } = await media('photoGet', { fileId: p.drive }); const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime }); }
// Photos added before the add-on was approved are copied to Drive once it is
async function mediaBackfill() {
  if (!mediaReady() || !dbOk) return;
  for (const p of S.photos.filter(x => !x.drive)) {
    const blob = await DB.getBlob(p.id).catch(() => null); if (!blob) continue;
    try { p.drive = await mediaPhotoPut(p, blob); save(); } catch (e) { break; }
  }
}

function mediaCard() {
  const st = mediaState.status;
  const status = st === 'ready' ? `Approved · AI coach ${mediaState.ai ? 'on' : 'needs your Anthropic key'}` : st === 'needs-approval' ? 'Needs a one-time Google approval' : st === 'no-key' ? 'Connect your Sheet first' : st === 'offline' ? 'Offline' : 'Checking…';
  return `<div class="gh">Media add-on</div><div class="group">
    ${srow('cloud', 'Drive photos, YouTube search, AI', status, st === 'ready' ? `<span class="pill2 good">On</span>` : `<button class="btn sm" data-a="media-check">Check</button>`)}
    ${st === 'needs-approval' ? `<div class="srow" style="display:block"><div class="s" style="line-height:1.5">Approve once on a computer or phone signed in to your Google account:<br>1. Open the <a target="_blank" rel="noopener" style="color:var(--accText)" href="${MEDIA_EDIT}">Media script ↗</a><br>2. Choose <b>doGet</b> at the top and press <b>Run</b><br>3. <b>Review permissions</b> → your account → <b>Advanced</b> → <b>Go to Sanskaar GYM — Media</b> → <b>Allow</b><br>4. Come back and tap <b>Check</b>.</div></div>` : ''}
    ${st === 'ready' ? `<div class="srow" style="flex-wrap:wrap"><span class="ic">${IC.spark}</span><div class="grow"><div class="t">AI coach key</div><div class="s">Your own Anthropic API key, stored only in your private Google script</div></div>
      <div class="row gap" style="width:100%"><input class="in" id="aikey" type="password" autocomplete="off" placeholder="${mediaState.ai ? 'Saved — paste a new one to replace' : 'sk-ant-…'}"><button class="btn acc" data-a="ai-key">Save</button></div></div>` : ''}
  </div>`;
}
ACT['media-check'] = async () => { toast('Checking…'); await mediaCheck(true); render(); toast(mediaReady() ? 'Media add-on is on ✓' : 'Not approved yet'); if (mediaReady()) mediaBackfill(); };
ACT['ai-key'] = async () => {
  const k = $('#aikey').value.trim(); if (!k) return toast('Paste your Anthropic API key');
  try { const j = await media('setAiKey', { aiKey: k }); mediaState.ai = j.ai; toast('AI key saved ✓'); render(); } catch (e) { toast(e.message); }
};
