'use strict';
/* ---------- Phase 6: nutrition ----------
 * Sources are always labelled:
 *   label    — from a product's nutrition label (Open Food Facts database)
 *   typical  — typical values for a generic food (an estimate: brands and recipes vary)
 *   estimate — AI estimate from your description (check and correct it)
 *   custom   — your own entry
 * Values are per 100 g unless the food has a serving size.
 */
const SOURCE = { label: ['Label', 'good'], typical: ['Typical', ''], estimate: ['Estimate', 'warn'], custom: ['Yours', ''] };
// Typical values per 100 g (rounded; generic foods vary). serving = grams in one usual portion.
const TYPICAL_FOODS = [
  ['Egg (whole)', 155, 13, 1.1, 11, 50, 'egg'], ['Egg white', 52, 11, 0.7, 0.2, 33, 'egg white'], ['Chicken breast, cooked', 165, 31, 0, 3.6, 120, 'piece'],
  ['Rice, white, cooked', 130, 2.7, 28, 0.3, 160, 'cup'], ['Rice, brown, cooked', 112, 2.3, 23.5, 0.8, 160, 'cup'], ['Roti / chapati', 297, 9.6, 46, 7.5, 40, 'roti'],
  ['Dal (lentils), cooked', 116, 9, 20, 0.4, 150, 'katori'], ['Rajma (kidney beans), cooked', 127, 8.7, 22.8, 0.5, 150, 'katori'], ['Chickpeas (chana), cooked', 164, 8.9, 27, 2.6, 150, 'katori'],
  ['Paneer', 265, 18, 3, 20, 50, 'portion'], ['Tofu, firm', 144, 17, 3, 9, 100, 'portion'], ['Curd / plain yogurt', 61, 3.5, 4.7, 3.3, 150, 'katori'],
  ['Greek yogurt, non-fat', 59, 10, 3.6, 0.4, 170, 'cup'], ['Milk, whole', 61, 3.2, 4.8, 3.3, 240, 'glass'], ['Milk, toned (3%)', 58, 3.1, 4.7, 3, 240, 'glass'],
  ['Whey protein powder', 400, 78, 8, 6, 30, 'scoop'], ['Oats, dry', 389, 16.9, 66, 6.9, 40, 'portion'], ['Bread, white', 265, 9, 49, 3.2, 30, 'slice'],
  ['Bread, whole wheat', 247, 13, 41, 3.4, 30, 'slice'], ['Pasta, cooked', 158, 5.8, 31, 0.9, 180, 'cup'], ['Potato, boiled', 87, 1.9, 20, 0.1, 150, 'potato'],
  ['Sweet potato, baked', 90, 2, 21, 0.2, 150, 'potato'], ['Banana', 89, 1.1, 23, 0.3, 120, 'banana'], ['Apple', 52, 0.3, 14, 0.2, 180, 'apple'],
  ['Orange', 47, 0.9, 12, 0.1, 140, 'orange'], ['Mango', 60, 0.8, 15, 0.4, 200, 'cup'], ['Peanut butter', 588, 25, 20, 50, 16, 'tbsp'],
  ['Almonds', 579, 21, 22, 50, 28, 'handful'], ['Peanuts', 567, 26, 16, 49, 28, 'handful'], ['Salmon, cooked', 206, 22, 0, 12, 120, 'fillet'],
  ['Tuna, canned in water', 116, 26, 0, 0.8, 100, 'can'], ['Lean beef, cooked', 217, 26, 0, 11.8, 120, 'portion'], ['Fish, white, cooked', 105, 23, 0, 0.9, 120, 'fillet'],
  ['Cheese, cheddar', 403, 25, 1.3, 33, 30, 'slice'], ['Butter', 717, 0.9, 0.1, 81, 10, 'tsp'], ['Ghee', 900, 0, 0, 100, 5, 'tsp'],
  ['Olive / cooking oil', 884, 0, 0, 100, 14, 'tbsp'], ['Sugar', 387, 0, 100, 0, 5, 'tsp'], ['Honey', 304, 0.3, 82, 0, 21, 'tbsp'],
  ['Broccoli', 34, 2.8, 7, 0.4, 90, 'cup'], ['Spinach', 23, 2.9, 3.6, 0.4, 30, 'cup'], ['Mixed vegetable sabzi', 90, 2.5, 9, 5, 150, 'katori'],
].map(([name, kcal, p, c, f, serving, sname]) => ({ id: 't-' + name.toLowerCase().replace(/[^a-z]+/g, '-'), name, kcal, p, c, f, serving, sname, src: 'typical' }));
const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
const dayRec = (key, make) => { let d = S.days.find(x => x.id === key); if (!d && make) { d = { id: key }; S.days.push(d); } return d; };
const todayKey = () => ymd(Date.now());

function viewNutrition() {
  const key = ui.day || todayKey(), entries = S.food.filter(e => e.date === key), tot = dayTotals(entries), t = S.settings.targets || {}, d = dayRec(key) || {};
  const water = +d.water || 0, wt = +t.water || 2500;
  return `<div class="daynav"><button class="icon" data-a="day-step" data-d="-1" aria-label="Previous day">${IC.back}</button>
      <div class="grow" style="text-align:center"><b>${key === todayKey() ? 'Today' : nice(fromKey(key))}</b><div class="muted xs">${entries.length} item${entries.length === 1 ? '' : 's'} logged</div></div>
      <button class="icon" data-a="day-step" data-d="1" aria-label="Next day" ${key >= todayKey() ? 'disabled style="opacity:.3"' : ''}><span style="display:inline-block;transform:rotate(180deg)">${IC.back}</span></button></div>
    <section class="card macros">
      <div class="row" style="gap:16px;align-items:center">${ring(tot.kcal, +t.kcal, PALETTE.kcal, tot.kcal.toLocaleString(), t.kcal ? `of ${(+t.kcal).toLocaleString()} kcal` : 'kcal', 108)}
        <div class="grow">${[['p', 'Protein'], ['c', 'Carbs'], ['f', 'Fat']].map(([k, l]) => `<div class="mrow2"><div class="row between xs"><span>${l}</span><span><b>${tot[k]}</b>${t[k] ? ` / ${t[k]}` : ''} g</span></div>${bar(tot[k], +t[k], PALETTE[k])}</div>`).join('')}</div></div>
      ${!t.kcal ? `<button class="btn sm ghost" data-a="targets" style="margin-top:10px">Set daily targets</button>` : `<div class="row between xs muted" style="margin-top:8px"><span>${t.kcal - tot.kcal >= 0 ? `${(t.kcal - tot.kcal).toLocaleString()} kcal left` : `${(tot.kcal - t.kcal).toLocaleString()} kcal over`}</span><button class="linkbtn" data-a="targets">Targets</button></div>`}
    </section>
    <section class="card water"><div class="row between"><div><div class="t">💧 Water</div><div class="muted xs">${(water / 1000).toFixed(2)} of ${(wt / 1000).toFixed(1)} L</div></div>
      <div class="row gap"><button class="btn sm" data-a="water" data-v="-250">−</button><button class="btn sm" data-a="water" data-v="250">+250</button><button class="btn sm acc" data-a="water" data-v="500">+500</button></div></div>${bar(water, wt, PALETTE.water)}</section>
    ${MEALS.map(m => { const list = entries.filter(e => e.meal === m), mt = dayTotals(list); return `<section class="card meal">
      <div class="row between"><div><div class="t">${m}</div><div class="muted xs">${list.length ? `${mt.kcal} kcal · P ${mt.p} · C ${mt.c} · F ${mt.f}` : 'Nothing yet'}</div></div>
        <div class="row gap">${list.length ? `<button class="icon sm" data-a="meal-save" data-v="${m}" aria-label="Save as meal">${IC.star}</button>` : ''}<button class="btn sm acc" data-a="food-add" data-v="${m}">+ Add</button></div></div>
      ${list.map(e => `<div class="fe"><div class="grow" style="min-width:0"><div class="ellip sm">${esc(e.name)}</div><div class="muted xs">${esc(e.amount || '')} · P ${e.p} · C ${e.c} · F ${e.f} ${pill(SOURCE[e.src]?.[0] || '', SOURCE[e.src]?.[1] || '')}</div></div><b class="sm">${e.kcal}</b><button class="icon sm" data-a="food-del" data-id="${e.id}" aria-label="Remove">${IC.x}</button></div>`).join('')}
    </section>`; }).join('')}
    ${weekNutrition(key)}`;
}
function weekNutrition(key) {
  const end = fromKey(key), labels = [], kcal = [], prot = [];
  for (let i = 6; i >= 0; i--) { const k = ymd(end - i * DAY); labels.push(new Date(fromKey(k)).toLocaleDateString(undefined, { weekday: 'short' })); const tt = dayTotals(S.food.filter(e => e.date === k)); kcal.push(tt.kcal); prot.push(tt.p); }
  const logged = kcal.filter(Boolean).length, t = S.settings.targets || {};
  if (!logged) return '';
  const avg = a => Math.round(a.reduce((x, y) => x + y, 0) / Math.max(1, logged));
  return `<h2>Last 7 days</h2><section class="card">
    <div class="tiles" style="margin-top:0"><div class="tile"><div class="v">${avg(kcal).toLocaleString()}</div><div class="l">Avg kcal</div></div><div class="tile"><div class="v">${avg(prot)} g</div><div class="l">Avg protein</div></div><div class="tile"><div class="v">${logged}/7</div><div class="l">Days logged</div></div></div>
    ${barChart2(labels, [{ label: 'kcal', data: kcal, backgroundColor: kcal.map(v => t.kcal && v > t.kcal * 1.1 ? '#ff8787' : '#ffd60a') }], { h: 160, fmt: v => v.toLocaleString() })}
    <div class="muted xs">Averages count only days with food logged.</div></section>`;
}
ACT['day-step'] = b => { const k = ui.day || todayKey(), n = ymd(fromKey(k) + +b.dataset.d * DAY); if (n <= todayKey()) { ui.day = n === todayKey() ? '' : n; render(); } };
ACT['water'] = b => { const d = dayRec(ui.day || todayKey(), true); d.water = Math.max(0, (+d.water || 0) + +b.dataset.v); save(); haptic(); render(); };
ACT['food-del'] = b => { S.food = S.food.filter(e => e.id !== b.dataset.id); save(); render(); };

/* targets */
ACT['targets'] = () => {
  const t = S.settings.targets || {}, w = latestWeight();
  const pg = w ? `${Math.round(w * (unit() === 'kg' ? 1.6 : 0.73))}–${Math.round(w * (unit() === 'kg' ? 2.2 : 1))} g` : '';
  openSheet(`<div class="sheet-h"><h3>Daily targets</h3><button class="icon" data-a="close">${IC.x}</button></div>
    <div class="grid2">${[['kcal', 'Calories (kcal)'], ['p', 'Protein (g)'], ['c', 'Carbs (g)'], ['f', 'Fat (g)'], ['water', 'Water (ml)']].map(([k, l]) => `<label class="f">${l}<input class="in" inputmode="numeric" id="tg_${k}" value="${esc(t[k] ?? '')}"></label>`).join('')}</div>
    ${pg ? `<div class="muted xs" style="margin-top:10px">Common guideline for people who lift: about ${pg} protein a day at your ${w} ${unit()} (1.6–2.2 g per kg). Calorie needs vary — adjust from your weight trend.</div>` : ''}
    <button class="btn acc block" data-a="targets-save">Save</button>`);
};
ACT['targets-save'] = () => { const t = {}; ['kcal', 'p', 'c', 'f', 'water'].forEach(k => { const v = $('#tg_' + k).value.trim(); t[k] = v === '' ? '' : +num(v); }); S.settings.targets = t; save(); closeSheet(); render(); toast('Targets saved'); };
const latestWeight = () => { const s = bodySeries(S.body, 'weight'); return s.length ? s[s.length - 1].y : 0; };

/* adding food */
let foodCtx = null;
ACT['food-add'] = b => {
  foodCtx = { meal: b.dataset.v, q: '', off: null };
  openSheet(`<div class="sheet-h"><h3>Add to ${esc(foodCtx.meal)}</h3><button class="icon" data-a="close">${IC.x}</button></div>
    <input class="in" id="fq" placeholder="Search foods (e.g. paneer, oats, eggs)" data-c="fq" data-live="1" autocomplete="off">
    <div class="row gap" style="margin-top:8px;flex-wrap:wrap"><button class="btn sm" data-a="off-search">Search packaged foods</button><button class="btn sm" data-a="barcode">Barcode number</button><button class="btn sm" data-a="food-custom">+ My food</button>${mediaReady() && mediaState.ai ? `<button class="btn sm" data-a="food-ai">✨ Describe a meal</button>` : ''}</div>
    <div id="fres" style="margin-top:10px">${foodResults()}</div>`);
};
function foodResults() {
  const q = (foodCtx.q || '').toLowerCase().trim();
  const recent = []; const seen = new Set();
  for (const e of [...S.food].sort((a, b) => b.at - a.at)) { if (seen.has(e.name)) continue; seen.add(e.name); if (e.per) recent.push({ ...e.per, name: e.name, src: e.src, recent: true }); if (recent.length >= 8) break; }
  const mine = S.foods.map(f => ({ ...f, src: f.src || 'custom' }));
  const match = f => !q || f.name.toLowerCase().includes(q);
  const meals = S.meals.filter(m => match(m));
  const groups = [['Saved meals', meals.map(m => ({ ...m, isMeal: true }))], ['Recent', q ? [] : recent], ['My foods', mine.filter(match)], ['Common foods', TYPICAL_FOODS.filter(match)], ['Packaged foods', foodCtx.off || []]];
  const html = groups.filter(([, l]) => l.length).map(([t, l]) => `<div class="xs muted gh2">${t}</div>${l.slice(0, 25).map((f, i) => f.isMeal
    ? `<button class="li pick" data-a="meal-use" data-id="${f.id}"><span class="grow"><span class="t">${esc(f.name)}</span><br><span class="muted xs">${f.items.length} items · ${dayTotals(f.items).kcal} kcal</span></span><span class="chip">Add</span></button>`
    : `<button class="li pick" data-a="food-pick" data-g="${t}" data-i="${i}"><span class="grow" style="min-width:0"><span class="t ellip">${esc(f.name)}</span><br><span class="muted xs">${f.kcal} kcal · P ${f.p} · C ${f.c} · F ${f.f} per 100 g ${pill(SOURCE[f.src]?.[0] || '', SOURCE[f.src]?.[1] || '')}</span></span>${IC.chev}</button>`).join('')}`).join('');
  foodCtx.groups = Object.fromEntries(groups.map(([t, l]) => [t, l]));
  return html || `<div class="empty">No match. Try "Search packaged foods", or add it as your own food.</div>`;
}
CHG['fq'] = t => { foodCtx.q = t.value; $('#fres').innerHTML = foodResults(); };
ACT['food-pick'] = b => openPortion(foodCtx.groups[b.dataset.g][+b.dataset.i]);
function openPortion(f) {
  foodCtx.food = f; const hasServ = +f.serving > 0;
  openSheet(`<div class="sheet-h"><h3 class="ellip">${esc(f.name)}</h3><button class="icon" data-a="close">${IC.x}</button></div>
    <div class="muted xs">${f.kcal} kcal · P ${f.p} g · C ${f.c} g · F ${f.f} g per 100 g ${pill(SOURCE[f.src]?.[0] || '', SOURCE[f.src]?.[1] || '')}${f.src === 'typical' ? ' — typical values; brands and recipes vary' : ''}</div>
    <div class="grid2" style="margin-top:12px"><label class="f">Amount<input class="in" inputmode="decimal" id="fp_q" value="${hasServ ? 1 : 100}" data-c="fpq" data-live="1"></label>
      <label class="f">Unit<select class="in" id="fp_u" data-c="fpq">${hasServ ? `<option value="serving">${esc(f.sname || 'serving')} (${f.serving} g)</option>` : ''}<option value="g">grams</option></select></label></div>
    <div id="fpOut" class="macro-out"></div>
    <button class="btn acc block" data-a="food-log">Add to ${esc(foodCtx.meal)}</button>`);
  CHG['fpq']();
}
CHG['fpq'] = () => { const f = foodCtx.food, a = foodAmount(f, num($('#fp_q').value), $('#fp_u').value); $('#fpOut').innerHTML = `<b>${a.kcal}</b> kcal · P ${a.p} · C ${a.c} · F ${a.f} <span class="muted">(${a.grams} g)</span>`; };
ACT['food-log'] = () => {
  const f = foodCtx.food, q = num($('#fp_q').value), u = $('#fp_u').value; if (!q) return toast('Enter an amount');
  const a = foodAmount(f, q, u);
  S.food.push({ id: uid(), date: ui.day || todayKey(), meal: foodCtx.meal, name: f.name, amount: u === 'serving' ? `${q} ${f.sname || 'serving'}` : `${q} g`, qty: q, unit: u, kcal: a.kcal, p: a.p, c: a.c, f: a.f, src: f.src, at: Date.now(),
    per: { kcal: f.kcal, p: f.p, c: f.c, f: f.f, serving: f.serving || '', sname: f.sname || '' } });
  save(); closeSheet(); render(); haptic(); toast(`${f.name} added`);
};

/* Open Food Facts: product label data. Online only. */
ACT['off-search'] = async () => {
  const q = (foodCtx.q || '').trim(); if (q.length < 2) return toast('Type a food name first');
  $('#fres').innerHTML = skeleton(4);
  // Open Food Facts sometimes refuses search requests from browsers; then the Media add-on asks from Google's servers
  const F = 'code,product_name,brands,nutriments,serving_quantity', e = encodeURIComponent(q);
  let hits = null;
  for (const u of [`https://search.openfoodfacts.org/search?q=${e}&page_size=20&fields=${F}`, `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${e}&search_simple=1&action=process&json=1&page_size=20&fields=${F}`]) {
    try { const r = await fetch(u); if (!r.ok) continue; const j = await r.json(); hits = j.hits || j.products || []; break; } catch (err) {}
  }
  if (!hits && mediaReady()) try { hits = (await media('offSearch', { q })).hits; } catch (err) {}
  if (!hits) { $('#fres').innerHTML = `<div class="empty">The packaged-food database didn't answer${mediaReady() ? '' : ' (approving the Media add-on in Settings makes this more reliable)'}. Barcode lookup and "My food" still work.</div>`; return; }
  foodCtx.off = hits.map(offFood).filter(Boolean);
  $('#fres').innerHTML = foodCtx.off.length ? foodResults() : `<div class="empty">No packaged foods found for "${esc(q)}".</div>`;
};
function offFood(p) {
  const n = p.nutriments || {}, kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : null);
  if (kcal == null || !p.product_name) return null;
  const brand = Array.isArray(p.brands) ? p.brands[0] : p.brands && String(p.brands).split(',')[0];
  return { id: 'off-' + p.code, name: [p.product_name, brand].filter(Boolean).join(' · '), kcal: Math.round(kcal), p: round1(+n.proteins_100g || 0), c: round1(+n.carbohydrates_100g || 0), f: round1(+n.fat_100g || 0), serving: +p.serving_quantity || '', sname: 'serving', src: 'label' };
}
ACT['barcode'] = () => {
  $('#fres').innerHTML = `<div class="row gap"><input class="in" id="bc" inputmode="numeric" placeholder="Barcode digits (on the pack)"><button class="btn acc" data-a="barcode-go">Look up</button></div>`;
};
ACT['barcode-go'] = async () => {
  const code = ($('#bc').value || '').replace(/\D/g, ''); if (code.length < 6) return toast('Enter the barcode digits');
  try { const j = await (await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=code,product_name,brands,nutriments,serving_quantity`)).json(); const f = j.product && offFood({ ...j.product, code }); if (!f) return toast('Not found in the food database'); openPortion(f); }
  catch (e) { toast("Couldn't reach the food database"); }
};

/* your own foods */
ACT['food-custom'] = () => {
  openSheet(`<div class="sheet-h"><h3>My food</h3><button class="icon" data-a="close">${IC.x}</button></div>
    <label class="f">Name<input class="in" id="cf_n" value="${esc(foodCtx?.q || '')}"></label>
    <div class="muted xs" style="margin-top:8px">Copy the numbers from the label, per 100 g.</div>
    <div class="grid2">${[['kcal', 'Calories'], ['p', 'Protein g'], ['c', 'Carbs g'], ['f', 'Fat g'], ['serving', 'Serving size g (optional)']].map(([k, l]) => `<label class="f">${l}<input class="in" inputmode="decimal" id="cf_${k}"></label>`).join('')}</div>
    <button class="btn acc block" data-a="food-custom-save">Save and add</button>`);
};
ACT['food-custom-save'] = () => {
  const name = $('#cf_n').value.trim(); if (!name) return toast('Give it a name');
  const f = { id: uid(), name, src: 'custom' }; ['kcal', 'p', 'c', 'f', 'serving'].forEach(k => f[k] = num($('#cf_' + k).value)); if (!f.serving) f.serving = '';
  S.foods.push(f); save(); openPortion(f);
};

/* saved meals */
ACT['meal-save'] = b => {
  const key = ui.day || todayKey(), items = S.food.filter(e => e.date === key && e.meal === b.dataset.v);
  const name = prompt('Name this meal', `${b.dataset.v} · ${items.map(i => i.name).slice(0, 2).join(', ')}`); if (!name) return;
  S.meals.push({ id: uid(), name: name.trim(), items: items.map(({ name, amount, qty, unit, kcal, p, c, f, src, per }) => ({ name, amount, qty, unit, kcal, p, c, f, src, per })) });
  save(); toast('Meal saved — find it under "Saved meals" when adding food');
};
ACT['meal-use'] = b => {
  const m = S.meals.find(x => x.id === b.dataset.id); if (!m) return;
  m.items.forEach(i => S.food.push({ ...i, id: uid(), date: ui.day || todayKey(), meal: foodCtx.meal, at: Date.now() }));
  save(); closeSheet(); render(); toast(`${m.name} added`);
};

/* AI estimate: always marked "Estimate" and editable before saving */
ACT['food-ai'] = () => {
  $('#fres').innerHTML = `<label class="f">Describe what you ate<textarea class="in" id="fai" rows="2" placeholder="e.g. 2 rotis, a katori of dal and a glass of milk"></textarea></label><button class="btn acc block" data-a="food-ai-go">Estimate</button>`;
};
ACT['food-ai-go'] = async () => {
  const d = $('#fai').value.trim(); if (!d) return;
  $('#fres').innerHTML = skeleton(3);
  try {
    const { text } = await media('ai', { system: 'You estimate nutrition. Reply with ONLY a JSON array, no prose: [{"name": string, "grams": number, "kcal": number, "p": number, "c": number, "f": number}] — one item per food, totals for the portion described (not per 100 g). Use typical portion sizes when amounts are vague. Indian foods use common home recipes.', messages: [{ role: 'user', content: d }] });
    const items = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
    foodCtx.ai = items.map(x => ({ name: String(x.name), grams: Math.round(+x.grams || 0), kcal: Math.round(+x.kcal || 0), p: round1(+x.p || 0), c: round1(+x.c || 0), f: round1(+x.f || 0) }));
    $('#fres').innerHTML = `<div class="muted xs" style="margin-bottom:6px">AI estimate — check and correct before adding.</div>${foodCtx.ai.map((x, i) => `<div class="card" style="padding:10px;margin:6px 0"><input class="in" value="${esc(x.name)}" data-c="aif" data-live="1" data-i="${i}" data-k="name"><div class="grid4" style="margin-top:6px">${[['grams', 'g'], ['kcal', 'kcal'], ['p', 'P'], ['c', 'C'], ['f', 'F']].map(([k, l]) => `<label class="f xs">${l}<input class="in" inputmode="decimal" value="${x[k]}" data-c="aif" data-live="1" data-i="${i}" data-k="${k}"></label>`).join('')}</div></div>`).join('')}<button class="btn acc block" data-a="food-ai-add">Add ${foodCtx.ai.length} items as estimates</button>`;
  } catch (e) { $('#fres').innerHTML = `<div class="empty">Couldn't estimate (${esc(e.message)}).</div>`; }
};
CHG['aif'] = t => { const x = foodCtx.ai[+t.dataset.i]; x[t.dataset.k] = t.dataset.k === 'name' ? t.value : num(t.value); };
ACT['food-ai-add'] = () => {
  foodCtx.ai.forEach(x => S.food.push({ id: uid(), date: ui.day || todayKey(), meal: foodCtx.meal, name: x.name, amount: `${x.grams} g`, qty: x.grams, unit: 'g', kcal: Math.round(x.kcal), p: x.p, c: x.c, f: x.f, src: 'estimate', at: Date.now(),
    per: x.grams ? { kcal: Math.round(x.kcal / x.grams * 100), p: round1(x.p / x.grams * 100), c: round1(x.c / x.grams * 100), f: round1(x.f / x.grams * 100) } : null }));
  save(); closeSheet(); render(); toast('Added as estimates');
};
