/* =========================================================
   0.20: the quote (« le devis ») of a content, when it is programmed. What it takes to make THIS content: what to buy,
   rent or pay (a game, a costume, a trip, ingredients…), never the gear the player already has, never what was bought
   for an earlier video. It is paid to program: no quote paid, no release (a content filmed at home can cost nothing).
   That is also where a sponsor comes in: a brand already signed rides on it, or the player pitches one.
   One small call to the AI (light, quick), on the player's own action. Without the AI: nothing special to buy.
   ========================================================= */
const DEVIS_KINDS = { achat: '🛒', location: '🔑', transport: '🚗', service: '🧾', conso: '🧺' };
const DEVIS_MAX = 6;
const DEVIS_LINE_MAX = 2000000; // 0.28: a line as dear as a real one can be (a supercar, a house to give away): it was 50 000
const normItem = (s) => foldAcc(s).replace(/[^a-z0-9 ]+/g, ' ').replace(/\b(le|la|les|un|une|des|du|de|d|l)\b/g, ' ').replace(/\s+/g, ' ').trim();
// Whether the player already owns something like this item (bought for an earlier video, or in the inventory: 0.27).
const likeItem = (n, name) => { const m = normItem(name); return m.length >= 3 && (m === n || (m.length >= 6 && n.includes(m)) || (n.length >= 6 && m.includes(n))); };
function ownsItem(g, item) {
  const n = normItem(item);
  if (n.length < 3) return false;
  return boughtBefore(g, item) || devisStock(g).some((s) => likeItem(n, s.x.name));
}
const boughtBefore = (g, item) => { const n = normItem(item); return n.length >= 3 && ((g.gear && g.gear.owned) || []).some((o) => likeItem(n, o.name)); };
const stockLike = (stock, item) => { const n = normItem(item); return n.length >= 3 ? stock.find((s) => likeItem(n, s.x.name)) || null : null; };
// 0.27.6: a price the model wrote as text (« 4 € », « 12,50 », « 1 200 € ») is still a price (it was dropped: free).
const devisPrice = (v) => (typeof v === 'number' ? v : num(String(v == null ? '' : v).replace(/[\s\u00a0\u202f]/g, '').replace(',', '.').replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, ''), 0));
// 0.27.6: an inventory item counted as « already there » that was sold or put on sale since: the quote no longer holds.
function devisStale(g, dv) {
  for (const h of (dv && dv.have) || []) {
    if (!h.inv) continue;
    const x = invItem(g, h.inv);
    if (!x || x.sold || x.sale) return { name: h.name, gone: !x || !!x.sold };
  }
  return null;
}
// 0.27.6: the quotes asked and not settled yet, one per content: a second release's quote no longer wipes the first's
// (asked again, and paid again). S.devis stays the last one received.
function devisFor(o) {
  if (S.devisG !== S.game) { S.devisBy = {}; S.devisG = S.game; S.devis = null; }
  const k = devisKey(o);
  return (S.devisBy && S.devisBy[k]) || (S.devis && S.devis.key === k ? S.devis : null);
}
function keepDevis(dv) {
  if (S.devisG !== S.game) { S.devisBy = {}; S.devisG = S.game; }
  S.devisBy = Object.assign({}, S.devisBy, { [dv.key]: dv });
  const ks = Object.keys(S.devisBy);
  if (ks.length > 8) delete S.devisBy[ks[0]];
  S.devis = dv;
}
function dropDevis(dv) {
  if (!dv) return;
  if (S.devisBy) delete S.devisBy[dv.key];
  if (S.devis && S.devis.key === dv.key) S.devis = null;
}
// Says why, and forgets a quote that can't be paid any more (asked again: what's at hand now).
function staleSay(st, dv) {
  if (st.gone) dropDevis(dv);
  toast(st.gone ? `« ${st.name} » n’est plus dans ton inventaire : le devis comptait dessus, redemande-le.` : `« ${st.name} » est en vente : retire-le de la vente, ou redemande le devis.`, 'bad');
}
/* 0.27: what the player has at hand for a content: the inventory (what brands sent, the gifts, what they bought for
   themselves), never what is on sale, nor spare gear (gear is never in a quote). The AI is told about it, and about the
   brands signed for this kind of content: what covers a need is not paid for, it shows as « already there »; what the
   shoot uses up (food, drinks, consumables) leaves the inventory when the quote is settled. */
const DEVIS_STOCK = 20, DEVIS_HAVE = 5;
const devisStock = (g) => invLive(g).filter((x) => !x.sale && x.kind !== 'gear').sort((a, b) => b.at - a.at).slice(0, DEVIS_STOCK).map((x, k) => ({ key: 'i' + (k + 1), x }));
function stockFrom(g, x) {
  const F = x.from || {}, c = F.c ? g.chars[F.c] : null;
  if (x.kind === 'goods' || F.how === 'marque') return `envoyé par ${F.brand || (c && c.brand) || 'une marque'}`;
  if (x.kind === 'gift' || F.how === 'cadeau') return c ? `offert par ${c.name.split(' ')[0]}` : 'un cadeau';
  return 'à toi';
}
const devisDeals = (g, o) => signedDeals(g).filter((d) => d.what === o.what);
// 0.27.5: a partner brand provides its own product, nothing else: a game's beta once « paid » for the books of a video
// about law. A line it provides must name that product (a word in common with it, or with the brand).
const DEVIS_STOPW = new Set(['pour', 'avec', 'dans', 'sans', 'plus', 'tres', 'leur', 'leurs', 'cette', 'votre', 'notre', 'tout', 'tous', 'toute', 'toutes', 'offert', 'offerte', 'offerts', 'gratuit', 'gratuite', 'marque', 'produit', 'produits', 'fourni', 'fournie', 'partenaire']);
const bigWords = (s) => normItem(s).split(' ').filter((w) => w.length >= 4 && !DEVIS_STOPW.has(w));
function sameThing(a, b) {
  const B = bigWords(b);
  return bigWords(a).some((w) => B.some((x) => x === w || (x.length >= 5 && w.length >= 5 && x.slice(0, 5) === w.slice(0, 5))));
}
const devisKey = (o) => [o.what, str(o.topic, 120).toLowerCase(), o.days || 0].join('|');
function promptDevis(g, o, stock = devisStock(g), deals = devisDeals(g, o)) {
  const money = WORLD_MONEY[g.world.preset] ? WORLD_MONEY[g.world.preset].sym : 'euros';
  const owned = ((g.gear && g.gear.owned) || []).slice(-25).map((x) => x.name);
  const one = o.what === 'live' ? 'un live' : o.what === 'vidéo' ? 'une vidéo longue' : o.what === 'short' ? `un format court vertical (${PF(g).shortName})` : `un ${o.what}`;
  return [`Tu es le régisseur d’un créateur de contenu ${g.world.inName || 'dans le monde de ' + g.world.name}${g.world.tagline ? ` (${g.world.tagline})` : ''}.`,
    `Il prépare ${one} sur ${pfName(g, platformOf(g))} : « ${str(o.topic, 120)} »${o.plot ? ` (ce qu’on y verra : ${str(o.plot, 200)})` : ''}.`,
    o.days ? `C’est un défi de ${o.days} jours : un épisode par jour sur ce thème. Sépare ce qui s’achète une seule fois ("per":"once") de ce qui se rachète à chaque épisode ("per":"episode", le prix d’UN épisode).` : null,
    `Son matériel de tournage, déjà à lui (ne le compte jamais) : ${gearBrief(g)}.`,
    `Ce qu’il a déjà acheté pour d’anciennes vidéos (ne le rachète jamais) : ${owned.length ? owned.join(' ; ') : 'rien'}.`,
    stock.length ? `Ce qu’il a sous la main, dans son inventaire : ${stock.map((s) => `[${s.key}] ${s.x.name} (${stockFrom(g, s.x)})`).join(' ; ')}.` : null,
    deals.length ? `Ses partenariats signés pour ce type de contenu : ${deals.map((d) => `${d.brand} (${str(d.product, 60)})`).join(' ; ')}.` : null,
    '', '## TÂCHE : LE DEVIS',
    `Ce qu’il faut acheter, louer ou payer pour faire CE contenu, avec des prix réalistes (en ${money}, comme en vrai). Rien d’inutile : un contenu tourné chez soi, sans accessoire, peut ne rien coûter du tout. Jamais de matériel de tournage (le sien suffit), jamais de salaire (son équipe est déjà payée). Des noms génériques, sans marque.`,
    stock.length || deals.length ? `Ne lui fais jamais payer ce qu’il a déjà, mais seulement pour un vrai besoin de CE contenu : un objet de son inventaire (les produits qu’une marque lui a envoyés, un cadeau, un achat) ne compte que s’il sert vraiment à ce qu’on y verra (un jeu vidéo ne remplace pas des livres de droit, une box repas ne sert pas un tuto maquillage). Alors, aucune ligne à payer pour ce besoin-là, et signale-le ; tout le reste se paie normalement.` : null,
    deals.length ? `Un partenariat ne fournit que son propre produit, rien d’autre, et seulement si ce contenu s’en sert vraiment : un partenariat sans rapport avec le sujet ne change rien au devis.` : null,
    '', FORMAT,
    `Au plus ${DEVIS_MAX} lignes : {"t":"cost","item":"≤ 60 caractères","price":40,"kind":"achat","keep":true,"per":"once"} (kind : achat, location, transport, service ou conso ; keep : true seulement pour un objet qu’il gardera et pourra réutiliser).`,
    stock.length ? `- Chaque objet de son inventaire qui sert ce contenu (au plus ${DEVIS_HAVE}) : {"t":"have","id":"i1","use":"conso"} (use : "conso" si le tournage le consomme — on le mange, on le boit, on l’use —, "garde" s’il le récupère après).` : null,
    deals.length ? `- Seulement si le produit d’une marque partenaire sert vraiment ce contenu : {"t":"have","brand":"${deals[0].brand}","item":"ce produit, ≤ 60 caractères"}.` : null,
    `Si rien n’est à payer, une seule ligne : {"t":"free"}${stock.length || deals.length ? ' (plus les lignes "have", s’il y en a)' : ''}.`,
    '- Facultatif, si un type de marque pourrait financer ce contenu : {"t":"sponsor","sector":"boisson, tech, mode, beaute, jeu, food, appli ou voyage","why":"≤ 80 caractères"}.'].filter((x) => x !== null).join('\n');
}
// The lines of the AI, cleaned: owned things dropped, prices bounded, at most DEVIS_MAX.
function readDevis(g, o, objs, stock = devisStock(g), deals = devisDeals(g, o)) {
  const items = [], have = [];
  let sponsor = null;
  for (const x of objs) {
    if (x.t === 'cost' && items.length < DEVIS_MAX) {
      const item = str(x.item, 60), price = Math.round(clamp(devisPrice(x.price), 0, DEVIS_LINE_MAX));
      if (!item || !(price > 0) || boughtBefore(g, item) || items.some((y) => normItem(y.item) === normItem(item))) continue;
      const s = stockLike(stock, item), keep = x.keep === true || x.keep === 'true';
      if (s) { if (!have.some((h) => h.inv === s.x.id)) have.push({ inv: s.x.id, name: s.x.name, emoji: s.x.emoji, from: stockFrom(g, s.x), use: x.kind === 'conso' || (x.kind === 'achat' && !keep) ? 'conso' : 'garde' }); continue; } // (0.27.6: what the inventory covers is used like any « already there »: it was free on every quote, never used up)
      items.push({ item, price, kind: DEVIS_KINDS[x.kind] ? x.kind : 'achat', keep: x.keep === true || x.keep === 'true', per: o.days && x.per === 'episode' ? 'episode' : 'once' });
    } else if (x.t === 'have' && have.length < DEVIS_HAVE) { // 0.27: already there, nothing to pay
      const s = stock.find((y) => y.key === String(x.id || '').trim().toLowerCase());
      if (s) { if (!have.some((h) => h.inv === s.x.id)) have.push({ inv: s.x.id, name: s.x.name, emoji: s.x.emoji, from: stockFrom(g, s.x), use: x.use === 'garde' ? 'garde' : 'conso' }); continue; }
      const d = deals.find((y) => y.brand.toLowerCase() === str(x.brand, 40).toLowerCase()), item = str(x.item, 60);
      if (d && item && sameThing(item, `${d.product} ${d.brand}`) && !have.some((h) => normItem(h.name) === normItem(item))) have.push({ name: item, emoji: d.emoji, from: `fourni par ${d.brand}`, brand: d.brand }); // (0.27.5: its own product only)
    } else if (x.t === 'sponsor' && !sponsor && SECTORS.some((s) => s.id === x.sector)) sponsor = { sector: x.sector, why: str(x.why, 80) };
  }
  return makeDevis(o, items, sponsor, true, have);
}
function makeDevis(o, items, sponsor, ai = true, have = []) {
  const once = items.filter((x) => x.per !== 'episode').reduce((n, x) => n + x.price, 0);
  const each = items.filter((x) => x.per === 'episode').reduce((n, x) => n + x.price, 0);
  return { key: devisKey(o), what: o.what, topic: str(o.topic, 120), plot: str(o.plot || '', 300), days: o.days || 0, items, once, each, sponsor, ai, have, at: Date.now() };
}
const devisTotal = (dv) => (dv ? dv.once + dv.each * (dv.days || 1) : 0);
// Asks the AI for the quote (the player's own action). key: where the screen waits for it (S.devis).
async function genDevis(o) {
  const g = S.game;
  if (!g || S.busy.devis) return null;
  S.busy.devis = devisKey(o);
  update(false);
  const f = startFlow(g);
  const objs = [];
  let dv = null;
  const stock = devisStock(g), deals = devisDeals(g, o); // (the same list for the prompt and its reading)
  try {
    await aiStream(promptDevis(g, o, stock, deals), (x) => { if (x && (x.t === 'cost' || x.t === 'sponsor' || x.t === 'free' || x.t === 'have')) objs.push(x); }, { signal: f.ctl.signal, src: f.id, kind: 'devis', tier: 'quick' });
    dv = readDevis(g, o, objs, stock, deals);
  } catch (e) {
    if (e && e.code === 'budget') reportAiError(e);
    else if (!e || e.code !== 'cancelled') console.warn('devis', e && (e.code || e.message));
    if (!e || e.code !== 'cancelled') dv = makeDevis(o, [], null, false); // without the AI: nothing special to buy
  }
  S.busy.devis = null;
  endFlow(f);
  if (dv && S.game === g) keepDevis(dv);
  update(false);
  return dv;
}
// Paying the quote: the money goes, what is kept joins what the player owns (never bought again), and what the shoot uses
// up from the inventory leaves it (0.27).
function payDevis(g, dv, label) {
  if (devisStale(g, dv)) return false; // (the screens say why first)
  const total = devisTotal(dv);
  if (total > 0 && !pay(g, total, `Devis : ${label || str(dv.topic, 40)}`, 'devis')) return false;
  const G = g.gear;
  for (const x of dv.items) if (x.keep && G && !ownsItem(g, x.item)) G.owned.push({ name: x.item, price: x.price, at: Date.now() });
  if (G && G.owned.length > 60) G.owned.splice(0, G.owned.length - 60);
  const used = [];
  for (const h of dv.have || []) {
    const x = h.inv && h.use === 'conso' ? invItem(g, h.inv) : null;
    if (x && !x.sold && !x.sale) { invOf(g).splice(invOf(g).indexOf(x), 1); used.push(x.name); }
  }
  if (used.length) addNotif(g, { k: 'gear', text: `📦 Pour ton tournage, tu utilises ce que tu avais : ${used.join(', ')}.` });
  dv.paid = Date.now();
  const per = dv.days ? total / dv.days : total; // (a challenge: what each episode cost)
  if (per > 100000) unlockAch(g, 'tv-show'); // 0.28
  if (per > 1000000) unlockAch(g, 'mrbeast');
  return true;
}
const devisNeeded = (g, r) => !!(g && r && !easyGear() && !r.legacy && !r.series && !r.devis);
// The player pitches a brand for this content (from the quote): an offer may come back… or not, or not an honest one.
function pitchBrand(g, dv) {
  if (!dv || dv.pitched) return false;
  if (g.stats.followers < 800) { toast('Les marques ne répondent pas encore : il te faut au moins 800 abonnés.', 'bad'); return false; }
  dv.pitched = Date.now();
  const sector = dv.sponsor ? dv.sponsor.sector : pick(SECTORS).id;
  const S0 = SECTORS.find((x) => x.id === sector) || SECTORS[0];
  if (Math.random() < 0.45) { toast(`Tu as écrit à des marques (${S0.emoji} ${S0.label}). Pas de réponse pour l’instant… ça arrive.`); return true; }
  const d = makeOffer(g, { sector, what: dv.what, pitched: true });
  toast(d ? `Une marque te répond en message privé : ${d.brand}.` : 'Les marques contactées n’ont rien à te proposer pour le moment.', d ? 'good' : '');
  return true;
}
/* ---------- the screens ---------- */
function DevisCard({ g, dv, attach, onAttach, rid }) {
  if (!dv) return null;
  const total = devisTotal(dv), cash = g.career.cash;
  const deals = signedDeals(g).filter((d) => d.what === dv.what && !plannedReleases(g).some((x) => x.id !== rid && x.deal === d.id)); // (0.27.6: not one another planned release carries)
  return html`<div class="devis-card">
    <div class="dv-head"><${Icon} n="receipt" s=${18} /><b>Le devis</b><span>${dv.ai ? '' : 'estimé sans l’IA'}</span></div>
    ${dv.items.length ? html`<ul class="dv-lines">${dv.items.map((x, k) => html`<li key=${k}><span aria-hidden="true">${DEVIS_KINDS[x.kind]}</span><span>${x.item}${x.keep ? html` <em>tu le gardes</em>` : null}${x.per === 'episode' ? html` <em>par épisode</em>` : null}</span><b>${fmtMoney(g, x.price)}</b></li>`)}</ul>`
      : html`<p class="muted">Rien à acheter : ton matos et ce que tu as déjà suffisent.</p>`}
    ${dv.have && dv.have.length ? html`<div class="dv-have"><span class="lbl">Déjà là, rien à payer</span><ul class="dv-lines">${dv.have.map((h, k) => html`<li key=${k}><span aria-hidden="true">${emoParts(h.emoji || '📦', 'dh' + k)}</span><span>${h.name} <em>${h.from}${h.inv ? (h.use === 'conso' ? ', utilisé pour le tournage' : ', tu le gardes') : ''}</em></span><b>${fmtMoney(g, 0)}</b></li>`)}</ul></div>` : null}
    ${dv.days && dv.each ? html`<p class="muted dv-sum">${fmtMoney(g, dv.once)} une fois + ${fmtMoney(g, dv.each)} × ${dv.days} épisodes</p>` : null}
    <div class="dv-total"><span>Total</span><b class=${total > 0 && total > cash ? 'neg' : ''}>${fmtMoney(g, total)}</b></div>
    ${total > 0 && total > cash ? html`<p class="dv-miss">Il te manque ${fmtMoney(g, total - Math.max(0, cash))} : choisis un sujet moins cher, ou trouve un sponsor.</p>` : null}
    ${deals.length && onAttach ? html`<div class="field"><span class="lbl">Un sponsor déjà signé pour ce contenu ?</span><div class="tr-chips"><button type="button" class=${'chip-btn' + (!attach ? ' on' : '')} onClick=${() => onAttach('')}>Aucun</button>${deals.map((d) => html`<button type="button" key=${d.id} class=${'chip-btn' + (attach === d.id ? ' on' : '')} onClick=${() => onAttach(d.id)}>${d.emoji} ${d.brand}${dealLeft(g, d)}</button>`)}</div></div>` : null}
    ${dv.sponsor || g.stats.followers >= 800 ? html`<div class="dv-pitch">${dv.sponsor ? html`<small>💡 ${dv.sponsor.why || 'Une marque pourrait financer ça.'}</small>` : null}
      <button type="button" class="btn btn-ghost btn-sm" disabled=${!!dv.pitched || g.stats.followers < 800} onClick=${() => { if (pitchBrand(g, dv)) update(); }}>${dv.pitched ? 'Marques démarchées' : `Démarcher une marque${dv.sponsor ? ` (${sectorWord(dv.sponsor.sector)})` : ''}${g.stats.followers < 800 ? ' · dès 800 abonnés' : ''}`}</button></div>` : null}
  </div>`;
}
// The quote step of a content announced on the network (its shoot screen): ask, then pay.
function DevisStep({ g, r, topic, plot }) {
  const o = { what: r.what, topic, plot: plot != null ? str(plot, 300) : r.plot || '' }; // (0.27.6: the plan being typed, not the one saved at launch)
  const dv = devisFor(o);
  const busy = S.busy.devis === devisKey(o);
  const moved = dv && dv.ai && normItem(dv.plot || '') !== normItem(o.plot || ''); // the plan changed since the quote
  const paid = () => {
    if (!dv) return;
    const st = devisStale(g, dv);
    if (st) { staleSay(st, dv); update(false); return; }
    if (!payDevis(g, dv, topic)) { toast(`Il te faut ${fmtMoney(g, devisTotal(dv))}.`, 'bad'); return; }
    r.devis = { total: devisTotal(dv), items: dv.items, have: dv.have || [], topic: dv.topic, plot: dv.plot || '', at: Date.now() }; if (dv.attach) r.deal = dv.attach; dropDevis(dv); update();
  };
  return html`<div class="devis-step">
    ${dv ? html`<${DevisCard} g=${g} dv=${dv} rid=${r.id} attach=${dv.attach || ''} onAttach=${(id) => { dv.attach = id; update(false); }} />
      ${moved ? html`<p class="muted dv-moved">Tu as changé ce qui se passe depuis ce devis. <button type="button" class="linkbtn" disabled=${busy} onClick=${() => genDevis(o)}>Refaire le devis · ≈ ${costLabel(g, 'devis')} ☕</button></p>` : null}
      <button class="btn btn-hot" onClick=${paid} disabled=${devisTotal(dv) > 0 && devisTotal(dv) > g.career.cash}><${Icon} n="cash" s=${16} /> ${devisTotal(dv) ? `Payer ${fmtMoney(g, devisTotal(dv))}` : 'Valider le devis (rien à payer)'}</button>`
      : html`<p class="muted">Avant de tourner : ce qu’il faut acheter, louer ou payer pour ${laW(r)}. Rien n’est racheté si tu l’as déjà.</p>
      <button class="btn btn-hot" disabled=${busy || topic.trim().length < 3} onClick=${() => genDevis(o)}>${busy ? html`<${Typing} /> Le devis arrive…` : html`<${Icon} n="receipt" s=${16} /> Demander le devis · ≈ ${costLabel(g, 'devis')} ☕`}</button>${!busy && topic.trim().length < 3 ? html`<small class="muted why-off">Écris d’abord le sujet.</small>` : null}`}
  </div>`;
}
