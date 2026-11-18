'use strict';
/* ---------- Phase 5: coach ----------
 * Every insight is worked out from your own logged workouts, and says what it is based on.
 * Suggestions are kept apart from your records ("suggestions" list) until you accept one.
 */
const plateStep = () => unit() === 'kg' ? 2.5 : 5;

function coachInsights(now = Date.now()) {
  const W = S.workouts, out = [];
  if (!W.length) return out;
  const usedIds = [...new Set(W.flatMap(w => w.exercises.map(e => e.exId)))];
  // strength going up / stalled
  for (const id of usedIds) {
    const h = exerciseHistory(W, id), name = lib(id).name;
    const tr = trend(h, now);
    if (tr && tr.pct >= 2) out.push({ kind: 'up', icon: '📈', title: `${name}: est. 1RM up ${tr.pct}%`, text: `${round1(tr.was)} → ${round1(tr.now)} ${unit()} comparing the last 4 weeks with the 4 before.`, basis: `${h.length} sessions` });
    if (isStagnant(h, now)) out.push({ kind: 'stall', icon: '⏸', title: `${name} has stalled`, text: `No new best in your last 3 sessions (best est. 1RM ${round1(Math.max(...h.map(x => x.e1)))} ${unit()}). Try a lighter week, a different rep range, or an alternative: ${(EXDB[name]?.alts || []).slice(0, 2).join(', ') || 'a similar movement'}.`, basis: `${h.length} sessions since ${shortDate(h[0].t)}` });
  }
  // consistency
  const goal = +S.settings.weeklyGoal || 4, wk = startOfWeek(now);
  const last4 = [1, 2, 3, 4].map(i => W.filter(w => w.start >= wk - i * WEEK && w.start < wk - (i - 1) * WEEK).length);
  const avg = round1(last4.reduce((a, b) => a + b, 0) / 4), lastAt = Math.max(...W.map(w => w.start));
  if (now - lastAt > 7 * DAY) out.push({ kind: 'warn', icon: '📅', title: `${Math.floor((now - lastAt) / DAY)} days since your last workout`, text: 'Even a short session keeps the habit going.', basis: `last workout ${nice(lastAt)}` });
  else if (avg < goal && W.length >= 4) out.push({ kind: 'warn', icon: '📅', title: `${avg} workouts a week (goal ${goal})`, text: `Last 4 weeks: ${last4.slice().reverse().join(', ')}. Change the goal in Settings if it's not realistic.`, basis: 'last 4 full weeks' });
  // volume per muscle
  const oldest = Math.min(...W.map(w => w.start));
  if (oldest <= wk - 2 * WEEK) {
    const ms = muscleSets(W, lib, wk - 2 * WEEK, wk);
    const low = MAJOR.filter(m => (ms[m] || 0) / 2 < WEEKLY_SETS.low).map(m => `${MUSCLE_INFO[m].name} (${round1((ms[m] || 0) / 2)})`);
    const high = MAJOR.filter(m => (ms[m] || 0) / 2 > 25).map(m => `${MUSCLE_INFO[m].name} (${round1(ms[m] / 2)})`);
    if (low.length) out.push({ kind: 'warn', icon: '🎯', title: 'Muscles under the usual weekly volume', text: `${low.slice(0, 5).join(', ')} sets/week. A common guideline for growth is ${WEEKLY_SETS.low}–${WEEKLY_SETS.high}.`, basis: 'average of the last 2 full weeks' });
    if (high.length) out.push({ kind: 'info', icon: '⚠️', title: 'Very high volume', text: `${high.join(', ')} sets/week. If recovery suffers, trim a few sets.`, basis: 'average of the last 2 full weeks' });
  }
  // skipped plan exercises
  for (const p of S.plans) {
    const sessions = sorted().filter(w => w.planId === p.id).slice(0, 3); if (sessions.length < 3) continue;
    const skipped = p.items.filter(it => sessions.every(w => !w.exercises.some(e => e.exId === it.exId || e.subOf === it.exId)));
    if (skipped.length) out.push({ kind: 'info', icon: '🔁', title: `Skipped in ${p.name}`, text: `${skipped.map(it => lib(it.exId).name).join(', ')} — not done in your last 3 sessions of this plan. Swap or remove it so the plan matches what you do.`, basis: 'last 3 sessions of this plan' });
  }
  return out;
}

// Next-session targets for every plan exercise you've done before
function overloadForPlan(p) {
  return p.items.map((it, k) => {
    const last = lastEx(it.exId, { id: '', start: Date.now() + 1 }); if (!last) return null;
    const s = overloadSuggestion(last, it.reps, plateStep()); if (!s) return null;
    return { k, exId: it.exId, ...s };
  }).filter(Boolean);
}
// Only real weight increases become suggestions; "add a rep" is what the rep range already says
function refreshSuggestions() {
  let added = 0;
  const before = S.suggestions.length;
  S.suggestions = S.suggestions.filter(s => !(s.status === 'pending' && s.type === 'target' && s.kind !== 'weight'));
  if (S.suggestions.length !== before) added++;
  for (const p of S.plans) for (const s of overloadForPlan(p)) {
    if (s.kind !== 'weight') continue;
    const id = `ov-${p.id}-${s.exId}-${s.weight}-${s.reps}`;
    if (S.suggestions.some(x => x.id === id)) continue;
    const cur = p.items[s.k];
    if (num(cur.weight) === s.weight) continue;
    S.suggestions.push({ id, at: Date.now(), status: 'pending', type: 'target', kind: s.kind, planId: p.id, exId: s.exId, weight: s.weight, reps: s.reps,
      title: `${lib(s.exId).name}: go up to ${s.weight} ${unit()} for ${s.reps}+ reps`, why: s.because, plan: p.name });
    added++;
  }
  if (added) save();
  return added;
}

function viewCoach() {
  const now = Date.now();
  if (!S.workouts.length) return emptyCard('Your coach needs data', 'Log a few workouts and the coach will spot progress, stalls and gaps — all from your own numbers.');
  refreshSuggestions();
  const ins = coachInsights(now), pending = S.suggestions.filter(s => s.status === 'pending');
  const wk = startOfWeek(now), thisW = S.workouts.filter(w => w.start >= wk), lastW = S.workouts.filter(w => w.start >= wk - WEEK && w.start < wk);
  const sum = ws => ({ n: ws.length, sets: ws.reduce((a, w) => a + workoutSets(w), 0), vol: ws.reduce((a, w) => a + workoutVolume(w), 0), prs: ws.reduce((a, w) => a + workoutPRs(w, S.workouts).length, 0) });
  const a = sum(thisW), b = sum(lastW);
  const cmp = (x, y) => y ? `<small class="${x >= y ? 'good' : 'bad'}">${signedN(x - y, 0)}</small>` : '';
  return `<section class="card coach-week"><div class="muted xs">Weekly report · ${shortDate(wk)} – today</div>
      <div class="tiles" style="margin-top:8px"><div class="tile"><div class="v">${a.n} ${cmp(a.n, b.n)}</div><div class="l">Workouts</div></div><div class="tile"><div class="v">${a.sets} ${cmp(a.sets, b.sets)}</div><div class="l">Working sets</div></div><div class="tile"><div class="v">${fmtN(a.vol)}</div><div class="l">${unit()} volume</div></div></div>
      <div class="muted xs" style="margin-top:8px">vs last week: ${b.n} workouts, ${b.sets} sets, ${fmtN(b.vol)} ${unit()}${a.prs ? ` · ${a.prs} new record${a.prs > 1 ? 's' : ''} this week 🏆` : ''}</div></section>
    ${pending.length ? `<h2>Suggestions for your plans</h2><div class="muted xs" style="margin:-4px 2px 8px">Nothing changes until you accept. Accepting sets the target weight shown in the plan and pre-fills it in your next workout.</div>
      ${pending.map(s => `<div class="card sugg"><div class="t">${esc(s.title)}</div><div class="muted xs">${esc(s.plan)} · because ${esc(s.why)}</div>
        <div class="row gap" style="margin-top:10px"><button class="btn sm acc" data-a="sugg-ok" data-id="${s.id}">Accept</button><button class="btn sm" data-a="sugg-no" data-id="${s.id}">Dismiss</button></div></div>`).join('')}` : ''}
    <h2>Insights</h2>${ins.length ? ins.map(i => `<div class="card ins ${i.kind}"><div class="row gap" style="align-items:flex-start"><span class="ins-ic">${i.icon}</span><div class="grow"><div class="t">${esc(i.title)}</div><div class="sm" style="margin-top:3px;color:var(--mut2)">${esc(i.text)}</div><div class="muted xs" style="margin-top:6px">Based on: ${esc(i.basis)}</div></div></div></div>`).join('')
      : emptyCard('Nothing to flag', 'Keep logging — insights appear as patterns show up.')}
    ${equipmentRecs()}
    ${aiBox()}`;
}
ACT['sugg-ok'] = b => {
  const s = S.suggestions.find(x => x.id === b.dataset.id); if (!s) return;
  if (s.type === 'target') { const p = S.plans.find(x => x.id === s.planId), it = p && p.items.find(i => i.exId === s.exId); if (it) it.weight = s.weight; }
  if (s.type === 'plan' && s.planDraft) S.plans.push({ id: uid(), name: s.planDraft.name, items: s.planDraft.items });
  s.status = 'accepted'; s.doneAt = Date.now(); save(); render(); haptic('success'); toast('Accepted');
};
ACT['sugg-no'] = b => { const s = S.suggestions.find(x => x.id === b.dataset.id); if (s) { s.status = 'dismissed'; s.doneAt = Date.now(); save(); render(); } };

// Exercises for under-trained muscles that fit the equipment you have
function equipmentRecs() {
  const now = Date.now(), wk = startOfWeek(now), ms = muscleSets(S.workouts, lib, wk - 2 * WEEK, wk);
  if (Math.min(...S.workouts.map(w => w.start)) > wk - 2 * WEEK) return '';
  const have = new Set(S.settings.equipment || []), inPlans = new Set(S.plans.flatMap(p => p.items.map(i => lib(i.exId).name)));
  const low = MAJOR.filter(m => (ms[m] || 0) / 2 < WEEKLY_SETS.low).slice(0, 3);
  const recs = low.map(m => [m, Object.entries(EXDB).filter(([n, d]) => d.primary.includes(m) && have.has(d.equipment) && !inPlans.has(n)).slice(0, 3)]).filter(([, l]) => l.length);
  if (!recs.length) return '';
  return `<h2>Try these</h2><div class="muted xs" style="margin:-4px 2px 8px">For your lower-volume muscles, using equipment you have (Settings → Equipment).</div><div class="card">
    ${recs.map(([m, l]) => `<div class="xs muted" style="font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin:8px 2px 2px">${MUSCLE_INFO[m].name}</div>${l.map(([n]) => { const ex = S.library.find(e => e.name === n); return ex ? `<button class="li pick" data-a="ex-info" data-id="${ex.id}"><span class="grow t">${esc(n)}</span><span class="muted xs">${EXDB[n].equipment}</span></button>` : `<div class="li"><span class="grow t">${esc(n)}</span></div>`; }).join('')}`).join('')}
    <button class="btn block" data-a="gen-plan" style="margin-top:10px">Build a session from these</button></div>`;
}
ACT['gen-plan'] = () => {
  const now = Date.now(), wk = startOfWeek(now), ms = muscleSets(S.workouts, lib, wk - 2 * WEEK, wk), have = new Set(S.settings.equipment || []);
  const low = MAJOR.filter(m => (ms[m] || 0) / 2 < WEEKLY_SETS.low).slice(0, 4), items = [];
  for (const m of low) {
    const pick = Object.entries(EXDB).find(([n, d]) => d.primary.includes(m) && have.has(d.equipment) && S.library.some(e => e.name === n) && !items.some(i => lib(i.exId).name === n));
    if (pick) { const ex = S.library.find(e => e.name === pick[0]); items.push({ exId: ex.id, sets: 3, reps: (pick[1].rec.match(/(\d+[–-]\d+)/) || ['', '8-12'])[1].replace('–', '-') }); }
  }
  if (!items.length) return toast('Nothing to suggest right now');
  const id = 'plan-' + ymd(now) + '-' + items.map(i => i.exId).join('').slice(0, 12);
  if (!S.suggestions.some(s => s.id === id)) S.suggestions.push({ id, at: now, status: 'pending', type: 'plan', title: `New plan: Catch-up (${low.map(m => MUSCLE_INFO[m].name).join(', ')})`, why: 'these muscles were under the weekly guideline for 2 weeks', plan: 'New plan', planDraft: { name: 'Catch-up · ' + low.map(m => MUSCLE_INFO[m].name).join(', '), items } });
  save(); render(); toast('Suggested — accept it above to add the plan');
};

/* AI chat (Media add-on + a Gemini, Groq or Anthropic key). Answers use a summary of your own data. */
const aiChat = [];
function aiBox() {
  const st = mediaState.status;
  return `<h2>Ask your coach</h2><div class="card">
    ${st !== 'ready' || !mediaState.ai ? `<div class="muted sm">AI answers need the Media add-on and an AI key — a free Gemini key works (Profile → Settings → Media add-on). Everything above works without it.</div>`
      : `${aiChat.map(m => `<div class="bubble ${m.role}">${m.role === 'assistant' ? md(m.content) : esc(m.content)}</div>`).join('')}
        <div id="aiWait"></div>
        <div class="row gap" style="margin-top:8px"><input class="in" id="aiq" placeholder="e.g. Why has my bench stalled?" autocomplete="off"><button class="btn acc" data-a="ai-ask">Ask</button></div>
        <div class="muted xs" style="margin-top:8px">AI suggestions are advice only — they never change your plans or records.</div>`}</div>`;
}
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^[-•] (.*)$/gm, '• $1').replace(/\n/g, '<br>');
function dataSummary() {
  const now = Date.now(), rec = personalRecords(S.workouts), recent = sorted().slice(0, 12);
  const body = [...S.body].sort((a, b) => a.date.localeCompare(b.date)).slice(-8).map(b => `${b.date}: ${BODY_F().filter(([k]) => b[k] !== '' && b[k] != null).map(([k, l]) => `${l} ${b[k]}`).join(', ')}`);
  return [`Units: ${unit()} / ${lenUnit()}. Weekly workout goal: ${S.settings.weeklyGoal}. Today: ${ymd(now)}.`,
    `Plans: ${S.plans.map(p => `${p.name} = ${p.items.map(i => `${lib(i.exId).name} ${i.sets}x${i.reps}${i.weight ? ' @' + i.weight : ''}`).join('; ')}`).join(' | ')}`,
    `Recent workouts (newest first):\n${recent.map(w => `${ymd(w.start)} ${w.name} (${Math.round((w.end - w.start) / 6e4)} min): ${w.exercises.map(e => `${e.name} ${workSets(e).map(s => `${s.w}x${s.r}${s.rpe ? '@' + s.rpe : ''}`).join(',')}`).join('; ')}`).join('\n')}`,
    `Records (best est. 1RM): ${Object.values(rec).sort((a, b) => b.e1 - a.e1).slice(0, 15).map(r => `${r.name} ${round1(r.e1)}`).join(', ')}`,
    `Sets per muscle last 14 days: ${Object.entries(muscleSets(S.workouts, lib, now - 14 * DAY, now + 1)).map(([m, n]) => `${MUSCLE_INFO[m]?.name} ${round1(n)}`).join(', ')}`,
    body.length ? `Body measurements:\n${body.join('\n')}` : 'No body measurements logged.',
    `Coach rule insights: ${coachInsights(now).map(i => i.title).join('; ') || 'none'}`].join('\n\n');
}
ACT['ai-ask'] = async () => {
  const q = $('#aiq').value.trim(); if (!q) return;
  aiChat.push({ role: 'user', content: q }); render(); $('#aiWait').innerHTML = skeleton(2);
  const system = `You are the coach inside the Sanskaar GYM app. Answer using ONLY the user's data below; when the data doesn't cover something, say so plainly instead of guessing. Never invent numbers. Don't claim certainty about recovery or injury; suggest seeing a professional for pain. Keep answers short and practical (under 180 words), plain text with short lists. Your suggestions are advice; the user decides what to change.\n\nUSER DATA\n${dataSummary()}`;
  try { const { text } = await media('ai', { system, messages: aiChat.map(m => ({ role: m.role, content: m.content })) }); aiChat.push({ role: 'assistant', content: text }); }
  catch (e) { aiChat.push({ role: 'assistant', content: 'Sorry — ' + e.message }); }
  render();
};
