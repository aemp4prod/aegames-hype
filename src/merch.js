/* =========================================================
   0.22: the merch. The creator designs a collection (up to three pieces, their prices, an idea for the design), makes it
   on demand (nothing paid ahead, a small margin) or in stock (paid ahead, a big margin, but what does not sell stays),
   then launches it with a post: the AI judges how much people want it (merch 1-5) and the game sells for a few weeks,
   paid each week. Prices far above what fans expect cool the community; a cheap factory may deliver a bad batch.
   One collection at a time. Nothing here calls the AI on its own.
   ========================================================= */
const MERCH_MIN = 10000; // followers
// The pieces: what one costs on demand (pod) and in stock (bulk, before the maker's own price), the price fans find
// fair, how often it is chosen (w).
const MERCH = {
  tshirt: { emoji: '👕', label: 'T-shirt', pod: 12, bulk: 5, fair: 25, w: 1 },
  sweat: { emoji: '🧥', label: 'Sweat', pod: 26, bulk: 14, fair: 49, w: 0.6 },
  cap: { emoji: '🧢', label: 'Casquette', pod: 11, bulk: 5, fair: 25, w: 0.5 },
  mug: { emoji: '☕', label: 'Mug', pod: 8, bulk: 3, fair: 15, w: 0.5 },
  tote: { emoji: '👜', label: 'Tote bag', pod: 9, bulk: 3, fair: 18, w: 0.4 },
};
const MAKERS = {
  pod: { label: 'À la demande', note: 'imprimé à chaque commande : rien à avancer, chaque pièce coûte plus cher' },
  atelier: { label: 'Atelier en France', k: 1.7, note: 'en stock, fabriqué près de chez toi' },
  usine: { label: 'Usine en ligne', k: 1, note: 'en stock, le moins cher' },
};
const MERCH_QTY = [50, 100, 250, 500, 1000];
const DESIR_K = [0, 0.3, 0.6, 1, 1.6, 2.4]; // the AI's verdict on the launch: how much people want it
const merchOf = (g) => { const c = g.career; if (!c.merch || !Array.isArray(c.merch.drops)) c.merch = { drops: [] }; return c.merch; };
const openDrop = (g) => merchOf(g).drops.find((d) => d.state === 'ready' || d.state === 'live') || null;
const lastDrop = (g) => merchOf(g).drops.slice().reverse().find((d) => d.state === 'done') || null;
const merchOK = (g) => g.stats.followers >= MERCH_MIN;
const unitCost = (maker, k) => (maker === 'pod' ? MERCH[k].pod : Math.round(MERCH[k].bulk * MAKERS[maker].k * 100) / 100);
const priceRatio = (d) => d.items.reduce((n, x) => n + x.price / MERCH[x.k].fair, 0) / Math.max(1, d.items.length);
const dropList = (g, d) => d.items.map((x) => `${MERCH[x.k].label.toLowerCase()} à ${fmtMoney(g, x.price)}`).join(', ');
const stockLeft = (d) => d.items.reduce((n, x) => n + (x.stock || 0), 0);
// What it costs to make, before anything sells (in stock: every piece, now).
const stockCost = (o) => (o.maker === 'pod' ? 0 : Math.round(o.items.reduce((n, x) => n + (x.qty || 0) * unitCost(o.maker, x.k), 0)));
// The collection is set (in stock, its pieces are paid now): { items: [{ k, price, qty }], design, maker }.
function prepDrop(g, o, t = Date.now()) {
  if (!merchOK(g)) return { ok: false, why: `Ta boutique s’ouvre à ${nfFull.format(MERCH_MIN)} abonnés.` };
  if (openDrop(g)) return { ok: false, why: 'Un drop à la fois.' };
  const maker = MAKERS[o && o.maker] ? o.maker : 'pod';
  const items = (o && Array.isArray(o.items) ? o.items : []).filter((x, i, all) => MERCH[x.k] && all.findIndex((y) => y.k === x.k) === i).slice(0, 3)
    .map((x) => ({ k: x.k, price: clamp(Math.round(num(x.price) || MERCH[x.k].fair), 5, 300), qty: maker === 'pod' ? 0 : (MERCH_QTY.includes(x.qty) ? x.qty : 100) }));
  const design = str(o && o.design, 90);
  if (!items.length) return { ok: false, why: 'Choisis au moins une pièce.' };
  if (design.length < 3) return { ok: false, why: 'Décris ton design.' };
  const cost = stockCost({ maker, items });
  if (cost && !pay(g, cost, `Merch : fabrication en stock (${items.map((x) => `${x.qty} ${MERCH[x.k].label.toLowerCase()}`).join(', ')})`, 'merch')) return { ok: false, why: `Pas assez d’argent pour fabriquer ce stock (${fmtMoney(g, cost)}).` };
  const d = { id: uid('md'), state: 'ready', at: t, design, maker, cost, revenue: 0, sold: 0, pend: 0, weekSold: 0,
    items: items.map((x) => ({ k: x.k, price: x.price, stock: maker === 'pod' ? null : x.qty, made: x.qty, sold: 0 })),
    bad: maker === 'usine' && Math.random() < 0.3 }; // (a bad batch: nothing tells it before the first orders arrive)
  const M = merchOf(g);
  M.drops.push(d);
  if (M.drops.length > 8) M.drops.splice(0, M.drops.length - 8);
  return { ok: true, d };
}
// A collection made on demand and not launched yet can be dropped (nothing was paid).
function cancelDrop(g, d) {
  if (!d || d.state !== 'ready' || d.maker !== 'pod') return false;
  const M = merchOf(g);
  M.drops = M.drops.filter((x) => x !== d);
  return true;
}
// The post that launches it: the AI's verdict on how much people want it; the community's take on the prices.
function launchDrop(g, d, desir, post, t = Date.now()) {
  if (!d || d.state !== 'ready') return false;
  Object.assign(d, { state: 'live', launchAt: t, desir: clamp(Math.round(num(desir) || 3), 1, 5), day: gameDay(t), payAt: t + 7 * DAY_MS, post: post ? post.id : null });
  const r = priceRatio(d);
  if (r >= 1.6) warmMove(g, -4, 'ton merch hors de prix', t);
  else if (r <= 1.1) warmMove(g, 2, 'un merch à prix honnête', t);
  addNotif(g, { k: 'money', p: post ? post.id : undefined, text: `🛍️ Ton merch est en vente (${dropList(g, d)}) : les commandes arrivent dans les jours qui viennent, payées chaque semaine.` });
  addTrigger(g, `Le joueur vient de lancer son merch (${dropList(g, d)} ; design : « ${d.design} »)${r >= 1.6 ? ', à des prix que beaucoup trouvent abusés' : ''}. Dans les jours qui suivent, des fans postent des photos avec, d’autres en parlent.`);
  return true;
}
// One day of orders: the AI's verdict, the community's warmth, the prices, interest that fades over a few weeks.
function sellDay(g, d, day) {
  const n = day - gameDay(d.launchAt); // days since the launch
  const base = g.stats.followers * 0.0003 * DESIR_K[d.desir || 3] * Math.max(0.15, warmOf(g) / WARM0) * Math.exp(-Math.max(0, n - 1) / 6) * (d.badAt ? 0.5 : 1) * (1 + skillFx(g, 'merch')); // 0.24: creativity
  let sold = 0;
  for (const it of d.items) {
    const M = MERCH[it.k];
    let q = Math.round(base * M.w * Math.pow(M.fair / it.price, 1.5) * rand(0.7, 1.3));
    if (it.stock != null) q = Math.min(q, it.stock);
    if (q <= 0) continue;
    if (it.stock != null) {
      it.stock -= q;
      if (!it.stock && !it.out) { it.out = true; addNotif(g, { k: 'money', text: `🛍️ Rupture de stock : ${M.label.toLowerCase()} de ton merch. Tu peux en refaire depuis le Studio.` }); }
    }
    it.sold += q;
    sold += q;
    const gross = q * it.price;
    d.revenue += gross;
    d.pend += gross * 0.97 - (d.maker === 'pod' ? q * M.pod : 0); // (card fees; on demand, each piece made)
  }
  d.sold += sold;
  d.weekSold += sold;
  return sold;
}
function payDrop(g, d, t) {
  if (d.pend > 0) {
    const v = Math.round(d.pend * 100) / 100;
    earn(g, v, `Boutique : ${fmtN(d.weekSold)} ${plural(d.weekSold, 'vente', 'ventes')} de merch`, 'merch');
    addNotif(g, { k: 'money', text: `🛍️ Ta boutique : ${fmtN(d.weekSold)} ${plural(d.weekSold, 'pièce vendue', 'pièces vendues')} cette semaine, +${fmtMoney(g, v)}.` });
  }
  d.pend = 0;
  d.weekSold = 0;
  d.payAt = t + 7 * DAY_MS;
}
// A cheap factory's bad batch shows with the first deliveries: complaints, refunds, fewer orders.
function badBatch(g, d, t) {
  d.badAt = t;
  const avg = d.items.reduce((n, x) => n + x.price, 0) / d.items.length;
  const refund = Math.round(d.sold * 0.1 * avg);
  if (refund) charge(g, refund, 'Boutique : remboursements (merch défectueux)', 'merch');
  warmMove(g, -5, 'la qualité de ton merch', t);
  const dr = repMove(g, { pro: -6 }, 'un merch de mauvaise qualité');
  addNotif(g, { k: 'reldown', text: `😬 Des acheteurs se plaignent de ton merch : impressions qui craquellent, tissu qui déteint. Tu rembourses les pires cas (−${fmtMoney(g, refund)}), ${repWord(dr)}.` });
  addTrigger(g, 'Des acheteurs du merch du joueur se plaignent de sa qualité (impressions qui craquellent, tissu qui déteint), photos à l’appui : certains se moquent, d’autres le défendent.');
}
function endDrop(g, d, t) {
  if (d.pend > 0 || d.weekSold) payDrop(g, d, t);
  d.state = 'done';
  d.endAt = t;
  const left = stockLeft(d);
  addNotif(g, { k: 'money', text: `🛍️ Fin de ton drop : ${fmtN(d.sold)} ${plural(d.sold, 'pièce vendue', 'pièces vendues')}, ${fmtMoney(g, d.revenue)} de ventes${left ? ` ; ${fmtN(left)} ${plural(left, 'pièce invendue reste', 'pièces invendues restent')} sur les bras` : ''}.` });
  return true;
}
// More of a piece that sold out (in stock: paid now).
function restock(g, d, k, qty = 100) {
  const it = d && d.state === 'live' && d.maker !== 'pod' ? d.items.find((x) => x.k === k) : null;
  if (!it || !MERCH_QTY.includes(qty)) return false;
  const cost = Math.round(qty * unitCost(d.maker, k));
  if (!pay(g, cost, `Merch : réassort (${qty} ${MERCH[k].label.toLowerCase()})`, 'merch')) return false;
  it.stock = (it.stock || 0) + qty;
  it.made = (it.made || 0) + qty;
  it.out = false;
  d.cost += cost;
  return true;
}
// Each game day: the orders (none while a piece is out of stock); each week: paid; after five weeks: over.
function tickMerch(g, t = Date.now()) {
  const M = g.career && g.career.merch;
  if (!M || !Array.isArray(M.drops)) return false;
  let ch = false;
  for (const d of M.drops) {
    if (d.state !== 'live') continue;
    const day = gameDay(t);
    for (let k = 0; d.day < day && k < 60; k++) { d.day++; sellDay(g, d, d.day); ch = true; }
    if (d.bad && !d.badAt && d.sold > 0 && t - d.launchAt > 4 * DAY_MS) { badBatch(g, d, t); ch = true; }
    if (t >= d.payAt) { payDrop(g, d, t); ch = true; }
    if (t - d.launchAt > 35 * DAY_MS) { endDrop(g, d, t); ch = true; }
  }
  return ch;
}
function stopDrop(g, d) { return d && d.state === 'live' ? endDrop(g, d, Date.now()) : false; }
// What the prompts know of it: the collection on sale.
function merchCtx(g) {
  const d = openDrop(g);
  if (!d || d.state !== 'live') return '';
  const days = Math.max(0, Math.floor((Date.now() - d.launchAt) / DAY_MS));
  return `Son merch est en vente depuis ${days ? days + ' ' + plural(days, 'jour', 'jours') : 'aujourd’hui'} (${dropList(g, d)} ; design : « ${d.design} ») : ${fmtN(d.sold)} pièces vendues${d.badAt ? ' ; des acheteurs se plaignent de la qualité' : ''}.`;
}
// The launch post, as the AI should judge it.
function merchLine(g, d) {
  return `Avec ce post, le joueur LANCE SON MERCH : ${dropList(g, d)}. Design : « ${d.design} ». ${d.maker === 'pod' ? 'Imprimé à la commande.' : 'Fabriqué en stock.'} Juge à quel point ça donne envie à son public, d’après le design, les prix et ce qu’il représente pour ses abonnés : merch 1-5 (1 : personne n’en veut, 3 : ses fans en achètent, 5 : tout le monde en veut). Les réactions en parlent (des fans qui commandent, d’autres qui trouvent ça cher si c’est cher, un design raté se fait chambrer).`;
}

/* ---------- the Studio: « Ta boutique » ---------- */
function BoutiqueSection({ g, now }) {
  const [F, setF] = useState(() => ({ items: { tshirt: { on: true, price: MERCH.tshirt.fair, qty: 100 } }, design: '', maker: 'pod' }));
  const d = openDrop(g), last = lastDrop(g);
  if (!merchOK(g)) return html`<section class="section boutique"><div class="section-h"><h3>Ta boutique</h3></div><p class="muted">Ton merch (t-shirts, sweats, mugs…) s’ouvre à ${nfFull.format(MERCH_MIN)} abonnés.</p></section>`;
  const head = html`<div class="section-h"><h3>Ta boutique</h3>${last && !d ? html`<span>Dernier drop : ${fmtN(last.sold)} vendus</span>` : null}</div>`;
  if (d && d.state === 'ready') {
    return html`<section class="section boutique">${head}
      <div class="drop-card"><b>🛍️ Ton drop est prêt</b><span>${d.items.map((x) => `${MERCH[x.k].emoji} ${MERCH[x.k].label} · ${fmtMoney(g, x.price)}${x.stock != null ? ` · ${fmtN(x.stock)} en stock` : ''}`).join('  ')}</span><span class="muted">Design : « ${d.design} » · ${MAKERS[d.maker].label}</span>
        <div class="row"><button class="btn btn-hot btn-sm" onClick=${() => openCompose({ merch: d.id })}><${Icon} n="pen" s=${14} /> Le lancer avec un post</button>${d.maker === 'pod' ? html`<button class="btn btn-ghost btn-sm" onClick=${() => { if (cancelDrop(g, d)) update(); }}>Annuler</button>` : null}</div>
        <small class="muted">Ton post annonce le drop : ce que le public en pense décide des ventes.</small></div>
    </section>`;
  }
  if (d && d.state === 'live') {
    const days = Math.max(0, Math.floor((now - d.launchAt) / DAY_MS));
    return html`<section class="section boutique">${head}
      <div class="drop-card live"><b>🛍️ En vente depuis ${days ? days + ' ' + plural(days, 'jour', 'jours') : 'aujourd’hui'}</b><span>${fmtN(d.sold)} ${plural(d.sold, 'pièce vendue', 'pièces vendues')} · ${fmtMoney(g, d.revenue)} de ventes${d.pend > 0 ? ` · ${fmtMoney(g, d.pend)} versés ${fmtWhen(d.payAt, now)}` : ''}</span>
        <ul class="drop-items">${d.items.map((x) => html`<li key=${x.k}><span>${MERCH[x.k].emoji} ${MERCH[x.k].label} · ${fmtMoney(g, x.price)}</span><span>${fmtN(x.sold)} ${plural(x.sold, 'vendu', 'vendus')}${x.stock != null ? ` · ${x.stock ? fmtN(x.stock) + ' en stock' : 'rupture'}` : ''}</span>${x.stock === 0 ? html`<button class="btn btn-ghost btn-sm" onClick=${() => { if (restock(g, d, x.k, 100)) update(); else toast('Pas assez d’argent pour ce réassort.', 'bad'); }}>Réassort : 100 pour ${fmtMoney(g, Math.round(100 * unitCost(d.maker, x.k)))}</button>` : null}</li>`)}</ul>
        <button class="linkbtn" onClick=${() => { if (stopDrop(g, d)) update(); }}>Arrêter les ventes</button></div>
    </section>`;
  }
  const on = Object.keys(F.items).filter((k) => F.items[k].on);
  const setItem = (k, patch) => setF(Object.assign({}, F, { items: Object.assign({}, F.items, { [k]: Object.assign({ on: false, price: MERCH[k].fair, qty: 100 }, F.items[k], patch) }) }));
  const o = { maker: F.maker, design: F.design, items: on.map((k) => ({ k, price: F.items[k].price, qty: F.items[k].qty })) };
  const cost = stockCost(o), can = on.length > 0 && F.design.trim().length >= 3 && (!cost || g.career.cash >= cost);
  return html`<section class="section boutique">${head}
    <p class="muted">Jusqu’à trois pièces, ton design, tes prix. Tu le lances avec un post, et les ventes durent quelques semaines.</p>
    <div class="tr-chips">${Object.keys(MERCH).map((k) => html`<button type="button" key=${k} class=${'chip-btn' + (on.includes(k) ? ' on' : '')} disabled=${!on.includes(k) && on.length >= 3} onClick=${() => setItem(k, { on: !on.includes(k) })}>${MERCH[k].emoji} ${MERCH[k].label}</button>`)}</div>
    ${on.map((k) => html`<div class="mi-line" key=${k}><span>${MERCH[k].emoji} ${MERCH[k].label}</span>
      <label class="mi-price">Prix <input class="input" type="number" min="5" max="300" step="1" value=${F.items[k].price} onInput=${(ev) => setItem(k, { price: Math.round(num(ev.target.value)) || 0 })} /> €</label>
      <small class="muted">fabrication : ${fmtMoney(g, unitCost(F.maker, k))} la pièce</small>
      ${F.maker !== 'pod' ? html`<${Seg} items=${MERCH_QTY.map((q) => [q, String(q)])} value=${F.items[k].qty} onPick=${(q) => setItem(k, { qty: q })} label=${'Quantité de ' + MERCH[k].label} />` : null}</div>`)}
    <div class="field"><label class="lbl" for="mi-design">Ton design</label><input id="mi-design" class="input" maxlength="90" value=${F.design} placeholder="ex : ta phrase culte « on lâche rien » en lettres néon" onInput=${(ev) => setF(Object.assign({}, F, { design: ev.target.value }))} /></div>
    <div class="field"><span class="lbl">Fabrication</span><${Seg} items=${Object.keys(MAKERS).map((k) => [k, MAKERS[k].label])} value=${F.maker} onPick=${(k) => setF(Object.assign({}, F, { maker: k }))} label="Fabrication" /><small class="muted">${MAKERS[F.maker].note}</small></div>
    <div class="row"><button class="btn btn-hot btn-sm" disabled=${!can} onClick=${() => { const x = prepDrop(g, o); if (!x.ok) toast(x.why, 'bad'); update(); }}>Préparer le drop${cost ? ` · ${fmtMoney(g, cost)} à avancer` : ''}</button></div>
    ${last ? html`<small class="muted">Dernier drop : ${fmtN(last.sold)} ${plural(last.sold, 'pièce vendue', 'pièces vendues')}, ${fmtMoney(g, last.revenue)} de ventes${stockLeft(last) ? `, ${fmtN(stockLeft(last))} invendues` : ''}.</small>` : null}
  </section>`;
}
