/* =========================================================
   0.22: the merch. 0.29: a shop that stays open.
   - The creator adds products when they want, changes a price, pauses one, makes more of it, takes it off: nothing
     waits for the others to end. A new product goes on sale with a post (the AI judges how much people want it: merch
     1-5), the ones already on sale go on selling, less and less, for months.
   - Tiers (the followers): small things first (stickers, badges, key rings), then the clothes and the mugs, the
     hoodies, posters and phone cases, the creator's book, their own line (a perfume, make-up, a drink), a pop-up store.
   - Making it is a choice between the profit and the community: where (France, Portugal, Turkey, China: what it costs,
     how good it is, how long it takes), what it is made of (organic cotton… polyester), how it is printed; on demand,
     in stock or in pre-order. The quality shows in the reviews, the returns, the complaints, what the characters say.
   - And: a numbered limited edition, a share given to a charity, a duo with a character (who says yes or no in their
     messages), a design contest with the community, the high seasons (Halloween, Black Friday, Christmas),
     counterfeits, a book signing, a pop-up store; and what a launch post claims (« fabriqué en France »…) is checked by
     the buyers, sooner or later.
   Nothing here calls the AI on its own: the posts and the messages of the player do.
   ========================================================= */
const MERCH_MIN = 1000; // followers: the shop opens (0.29: small things first)
// The tiers, from what the shop sells first to what comes last.
const MERCH_TIERS = [[1000, 'Les petits objets'], [10000, 'Le textile et les mugs'], [50000, 'Les grosses pièces'], [100000, 'Ton livre'], [500000, 'Ta propre ligne'], [1000000, 'Ton pop-up store']];
// The products: the tier that opens them, the price fans find fair, how often one is bought (w), what one costs to make
// by country (cost) and on demand (pod, each piece printed when ordered), the lowest price (min); textile: the fabric
// is chosen; print: the printing is chosen; book / line: made in their own way (written; developed: dev € over devDays).
const MERCH = {
  stickers: { your: 'tes stickers', pl: true, emoji: '✨', label: 'Stickers', one: 'un pack de stickers', tier: 1000, fair: 6, min: 2, w: 1.6, cost: { fr: 1.2, pt: 0.9, tr: 0.6, cn: 0.25 }, pod: 2.4 },
  badge: { your: 'ton badge', emoji: '⭐', label: 'Badge', one: 'un badge', tier: 1000, fair: 8, min: 2, w: 1.1, cost: { fr: 2.5, pt: 1.8, tr: 1.2, cn: 0.5 }, pod: 3.5 },
  porteCles: { your: 'ton porte-clés', emoji: '🔑', label: 'Porte-clés', one: 'un porte-clés', tier: 1000, fair: 10, min: 3, w: 1, cost: { fr: 3, pt: 2.2, tr: 1.4, cn: 0.6 }, pod: 4.5 },
  tshirt: { your: 'ton t-shirt', emoji: '👕', label: 'T-shirt', one: 'un t-shirt', tier: 10000, fair: 25, min: 5, w: 1, textile: true, print: true, cost: { fr: 15, pt: 8, tr: 5, cn: 3 }, pod: 12 },
  mug: { your: 'ton mug', emoji: '☕', label: 'Mug', one: 'un mug', tier: 10000, fair: 15, min: 5, w: 0.5, print: true, cost: { fr: 7, pt: 4.5, tr: 3, cn: 1.8 }, pod: 8 },
  cap: { your: 'ta casquette', f: true, emoji: '🧢', label: 'Casquette', one: 'une casquette', tier: 10000, fair: 25, min: 5, w: 0.5, textile: true, print: true, cost: { fr: 14, pt: 8, tr: 5, cn: 3 }, pod: 11 },
  tote: { your: 'ton tote bag', emoji: '🛍️', label: 'Tote bag', one: 'un tote bag', tier: 10000, fair: 18, min: 5, w: 0.4, textile: true, print: true, cost: { fr: 8, pt: 4.5, tr: 3, cn: 1.5 }, pod: 9 },
  sweat: { your: 'ton sweat', emoji: '🧥', label: 'Sweat', one: 'un sweat', tier: 50000, fair: 49, min: 5, w: 0.6, textile: true, print: true, cost: { fr: 32, pt: 18, tr: 12, cn: 8 }, pod: 26 },
  poster: { your: 'ton poster dédicacé', emoji: '🖼️', label: 'Poster dédicacé', one: 'un poster dédicacé', tier: 50000, fair: 20, min: 5, w: 0.5, cost: { fr: 5, pt: 4, tr: 3, cn: 2 }, pod: 8 },
  coque: { your: 'ta coque de téléphone', f: true, emoji: '📱', label: 'Coque de téléphone', one: 'une coque de téléphone', tier: 50000, fair: 20, min: 5, w: 0.5, print: true, cost: { fr: 9, pt: 6, tr: 4, cn: 1.5 }, pod: 9 },
  livre: { your: 'ton livre', emoji: '📖', label: 'Ton livre', one: 'ton livre', tier: 100000, fair: 20, min: 5, w: 1.2, book: true, cost: { fr: 4.5, pt: 3.8, tr: 3.2, cn: 2.5 }, pod: 7 },
  parfum: { your: 'ton parfum', emoji: '🌸', label: 'Ton parfum', one: 'ton parfum', tier: 500000, fair: 45, min: 10, w: 0.8, line: true, dev: 15000, devDays: 21, cost: { fr: 14, pt: 12, tr: 9, cn: 5 } },
  makeup: { your: 'ta ligne de maquillage', f: true, emoji: '💅', label: 'Ta ligne de maquillage', one: 'ton maquillage', tier: 500000, fair: 25, min: 5, w: 0.9, line: true, dev: 8000, devDays: 14, cost: { fr: 8, pt: 6, tr: 4, cn: 2 } },
  boisson: { your: 'ta boisson', f: true, emoji: '🥤', label: 'Ta boisson', one: 'ta boisson', tier: 500000, fair: 3, min: 1, w: 4, line: true, dev: 20000, devDays: 28, minQty: 5000, cost: { fr: 0.9, pt: 0.7, tr: 0.5, cn: 0.4 } },
};
const MERCH_KEYS = Object.keys(MERCH);
// Where it is made: how good it is (q), the risk of a bad batch, the days to make it, the risk of being late.
const ORIGINS = {
  fr: { label: 'France', in: 'en France', q: 0.92, bad: 0.02, days: [4, 7], late: 0.05 },
  pt: { label: 'Portugal', in: 'au Portugal', q: 0.82, bad: 0.05, days: [7, 11], late: 0.08 },
  tr: { label: 'Turquie', in: 'en Turquie', q: 0.68, bad: 0.12, days: [9, 14], late: 0.15 },
  cn: { label: 'Chine', in: 'en Chine', q: 0.5, bad: 0.3, days: [18, 28], late: 0.35 },
};
const POD_Q = 0.72, POD_BAD = 0.04; // on demand (printed in Europe, each piece when it is ordered)
const MATERIALS = { // the fabric of a textile: its cost (k), its quality, what the community thinks of it (eco)
  bio: { label: '100 % coton bio', k: 1.35, q: 0.06, eco: 1 },
  coton: { label: '100 % coton', k: 1, q: 0, eco: 0 },
  recy: { label: 'Polyester recyclé', k: 0.9, q: -0.05, eco: 0.5 },
  poly: { label: '100 % polyester', k: 0.7, q: -0.15, eco: -1 },
};
const PRINTS = { // the printing: what it adds to each piece, its quality
  seri: { label: 'Sérigraphie', add: 1, q: 0.04, note: 'tient au lavage' },
  transfert: { label: 'Transfert', add: 0, q: -0.12, note: 'le moins cher' },
};
const MODES = {
  pod: { label: 'À la demande', note: 'imprimé à chaque commande : rien à avancer, chaque pièce coûte plus cher' },
  stock: { label: 'En stock', note: 'tu paies la fabrication maintenant, la marge est meilleure' },
  preco: { label: 'Précommandes', note: 'tes fans commandent d’abord, tu fais fabriquer ce qui est commandé' },
};
const BOOK_BY = { // who writes the book
  toi: { label: 'Toi', days: 21, fee: 0, q: 0 },
  scenariste: { label: 'Avec ton scénariste', days: 12, fee: 0, q: 0.06, staff: 'scenariste' },
  plume: { label: 'Un prête-plume', days: 10, fee: 6000, q: 0.04 },
};
const MERCH_QTY = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000];
// The quantities offered for a product: small runs for the small things, thousands for a drink.
const qtysOf = (k) => { const M = MERCH[k]; return M.minQty ? [5000, 10000, 25000] : M.tier >= 50000 ? [100, 250, 500, 1000, 2500] : [50, 100, 250, 500, 1000]; };
const MERCH_LIMITED = [100, 250, 500, 1000];
const MERCH_CHARITY = [0, 5, 10, 25, 50, 100];
const MERCH_MAX = 12; // products in the shop at once (taken off ones aside)
const MERCH_FLOOR = 1; // 0.28.1: no ceiling; each product has its own lowest price (min)
const PRECO_DAYS = 10;
const DESIR_K = [0, 0.3, 0.6, 1, 1.6, 2.4]; // the AI's verdict on the launch: how much people want it
const POPUP = { cost: 25000, days: 3, cool: 60 };
const SIGNING_COST = 400;
const FAN_DESIGNS = 3; // a contest: the designs the community sends

/* ---------- the shop ---------- */
// 0.29: the drops of before (one at a time) become products of a shop that stays open.
function shopOf(g) {
  const c = g.career;
  if (c.shop && Array.isArray(c.shop.items)) return c.shop;
  const S = c.shop = { items: [], pend: 0, weekSold: 0, payAt: 0, sold: 0, revenue: 0, day: null, launch: null, contest: null, popup: null, signing: null, notes: {} };
  const old = c.merch && Array.isArray(c.merch.drops) ? c.merch.drops : [];
  for (const d of old) {
    if (!d || typeof d !== 'object') continue; // (a save edited by hand, a drop half written)
    S.sold += num(d.sold, 0); S.revenue += num(d.revenue, 0);
    if (d.state !== 'live' && d.state !== 'ready') continue;
    for (const x of Array.isArray(d.items) ? d.items : []) {
      if (!x || !MERCH[x.k]) continue;
      const pod = d.maker === 'pod', origin = d.maker === 'atelier' ? 'fr' : 'cn', M = MERCH[x.k];
      const p = newItem({ k: x.k, design: str(d.design, 90), price: Math.max(M.min, num(x.price, M.fair)), mode: pod ? 'pod' : 'stock', origin: pod ? null : origin, mat: M.textile ? 'coton' : null, print: M.print ? 'transfert' : null });
      const at = num(d.launchAt, 0) > 0 ? num(d.launchAt) : null;
      Object.assign(p, { state: d.state === 'live' && !at ? 'ready' : d.state, made: Math.max(0, Math.round(num(x.made, 0))), stock: pod ? null : Math.max(0, Math.round(num(x.stock, 0))), sold: Math.max(0, Math.round(num(x.sold, 0))), launchAt: at,
        desir: [1, 2, 3, 4, 5].includes(d.desir) ? d.desir : null, bad: !!d.bad, badAt: num(d.badAt, 0) > 0 ? num(d.badAt) : null, revenue: 0 });
      p.q = qualityOf(p); p.unit = unitCost(p); p.complained = true; // (made before the reviews said why: no complaint now)
      S.items.push(p);
    }
    if (d.state === 'live') { S.pend += num(d.pend, 0); S.payAt = num(d.payAt, 0); }
  }
  delete c.merch;
  return S;
}
const shopItems = (g) => shopOf(g).items;
const shopLive = (g) => shopItems(g).filter((p) => p.state === 'live');
const shopShown = (g) => shopItems(g).filter((p) => p.state !== 'gone');
const merchOK = (g) => g.stats.followers >= MERCH_MIN || shopShown(g).length > 0;
const tierOpen = (g, k) => g.stats.followers >= MERCH[k].tier;
const shopNextTier = (g) => MERCH_TIERS.find(([n]) => g.stats.followers < n) || null;
const shopTierKeys = (n) => MERCH_KEYS.filter((k) => MERCH[k].tier === n);
const prodName = (p) => (p.name ? `${MERCH[p.k].label.replace(/^(Ton|Ta) /, '').toLowerCase()} « ${p.name} »` : MERCH[p.k].label.toLowerCase());
const itemTitle = (p) => (p.name ? `« ${p.name} »` : MERCH[p.k].label);
// « ton t-shirt », « ta casquette », « tes stickers » (« ton livre « … » »); his: the same for the AI (« son t-shirt »).
const prodYour = (p) => MERCH[p.k].your + (p.name ? ` « ${p.name} »` : '');
const prodHis = (p) => prodYour(p).replace(/^ton /, 'son ').replace(/^ta /, 'sa ').replace(/^tes /, 'ses ');
const agr = (p, m, f, pl) => (MERCH[p.k].pl ? pl : MERCH[p.k].f ? f : m);
const stars = (q) => clamp(Math.round(q * 5), 1, 5);

/* ---------- what it costs, what it is worth ---------- */
// o: { k, mode, origin, mat, print }. One piece, made (in stock, in pre-order) or printed when ordered (on demand).
function unitCost(o) {
  const M = MERCH[o.k];
  if (!M) return 0;
  const base = o.mode === 'pod' ? M.pod || M.cost.fr * 1.6 : M.cost[ORIGINS[o.origin] ? o.origin : 'cn'];
  const mat = M.textile && MATERIALS[o.mat] ? MATERIALS[o.mat].k : 1;
  const pr = M.print && PRINTS[o.print] && o.mode !== 'pod' ? PRINTS[o.print].add : 0;
  return Math.round((base * mat + pr) * 100) / 100;
}
// How good it is, 0 to 1: where, the fabric, the printing (and who wrote the book).
function qualityOf(o) {
  const M = MERCH[o.k];
  if (!M) return 0.5;
  let q = o.mode === 'pod' ? POD_Q : (ORIGINS[o.origin] || ORIGINS.cn).q;
  if (M.textile && MATERIALS[o.mat]) q += MATERIALS[o.mat].q;
  if (M.print && PRINTS[o.print] && o.mode !== 'pod') q += PRINTS[o.print].q;
  if (M.book && BOOK_BY[o.by]) q += BOOK_BY[o.by].q;
  return clamp(Math.round(q * 100) / 100, 0.15, 1);
}
// The price fans find fair: what it is worth to them (made well, made in France, a share given away: they pay more).
function prodFair(o) {
  const M = MERCH[o.k], q = qualityOf(o);
  return M.fair * (1 + 0.5 * (q - 0.7) + (o.origin === 'fr' && o.mode !== 'pod' ? 0.08 : 0) + num(o.charity, 0) / 250);
}
// What one piece brings: the price, less the making (on demand), the card fees, the share given away, the partner's half.
function marginOf(o) {
  const price = num(o.price, 0), fees = price * 0.03, give = price * num(o.charity, 0) / 100;
  const net = price - fees - give - unitCost(o);
  return Math.round((o.collab && net > 0 ? net / 2 : net) * 100) / 100;
}
// What it costs before anything sells (in stock: every piece now; a book by a ghost writer, a line to develop).
function prodUpfront(o) {
  const M = MERCH[o.k];
  let n = o.mode === 'stock' ? Math.round((o.limited || o.qty || 0) * unitCost(o)) : 0;
  if (M && M.line) n += M.dev;
  if (M && M.book && BOOK_BY[o.by]) n += BOOK_BY[o.by].fee;
  return n;
}

/* ---------- a new product ---------- */
function newItem(o) {
  const M = MERCH[o.k];
  return { id: uid('mp'), k: o.k, name: o.name || '', pitch: o.pitch || '', design: o.design || '', price: Math.round(num(o.price, M.fair) * 100) / 100,
    mode: o.mode, origin: o.mode === 'pod' ? null : o.origin, mat: M.textile ? o.mat || 'coton' : null, print: M.print && o.mode !== 'pod' ? o.print || 'transfert' : null, by: M.book ? o.by || 'toi' : null,
    q: 0, unit: 0, state: 'ready', at: Date.now(), readyAt: 0, launchAt: null, desir: null, stock: null, made: 0, sold: 0, revenue: 0, refunds: 0,
    limited: 0, charity: 0, asso: '', collab: null, preco: null, claim: null, exposedAt: null, bad: false, badAt: null, complained: false, betrayed: false, fake: null, credit: null, rev: null };
}
// o: { k, design, price, mode, origin, mat, print, qty, limited, charity, asso, collab (a character's id), name, pitch,
// by (the book), credit (a fan's design) }. Made now: ready to launch (on demand, in pre-order), or made first (in
// stock: the days of its country; a book: written first; a line: developed first).
function prepItem(g, o, t = Date.now()) {
  const M = MERCH[o && o.k];
  if (!M) return { ok: false, why: 'Choisis un produit.' };
  if (!tierOpen(g, o.k)) return { ok: false, why: `${M.label} : à ${nfFull.format(M.tier)} abonnés.` };
  if (shopShown(g).length >= MERCH_MAX) return { ok: false, why: `Ta boutique a déjà ${MERCH_MAX} produits : retires-en un d’abord.` };
  const mode = MODES[o.mode] && !(M.line && o.mode === 'pod') ? o.mode : M.line ? 'stock' : 'pod';
  const origin = ORIGINS[o.origin] ? o.origin : 'fr';
  const price = Math.min(MONEY_MAX, Math.round(num(o.price) * 100) / 100);
  if (!(price >= M.min)) return { ok: false, why: `${M.label} : ${fmtMoney(g, M.min)} au moins.` };
  const design = str(o.design, 90), name = str(o.name, 60), pitch = str(o.pitch, 160);
  if ((M.book || M.line) && name.length < 2) return { ok: false, why: M.book ? 'Donne un titre à ton livre.' : 'Donne un nom à ton produit.' };
  if (M.book && pitch.length < 10) return { ok: false, why: 'Dis de quoi parle ton livre.' };
  if (!M.book && !M.line && design.length < 3) return { ok: false, why: 'Décris ton design.' };
  if (M.book && BOOK_BY[o.by] && BOOK_BY[o.by].staff && !hasStaff(g, BOOK_BY[o.by].staff)) return { ok: false, why: 'Il te faut un scénariste dans ton équipe.' };
  const limited = mode === 'stock' && MERCH_LIMITED.includes(o.limited) ? o.limited : 0;
  const qty = mode === 'stock' ? (limited || (MERCH_QTY.includes(o.qty) ? o.qty : qtysOf(o.k)[1])) : 0;
  if (M.minQty && mode === 'stock' && qty < M.minQty) return { ok: false, why: `${M.label} : ${nfFull.format(M.minQty)} pièces au moins.` };
  const collab = o.collab && g.chars[o.collab] && collabOK(g, g.chars[o.collab]) ? o.collab : null;
  const C = shopOf(g).contest, credit = o.credit && !M.book && !M.line && C && C.state === 'open' && (C.entries || []).some((e) => e.by === o.credit) ? o.credit : null; // (a design of the contest under way)
  const p = newItem(Object.assign({}, o, { mode, origin, price, design, name, pitch }));
  Object.assign(p, { limited, charity: MERCH_CHARITY.includes(o.charity) ? o.charity : 0, asso: str(o.asso, 50), credit });
  if (collab) p.collab = { c: collab, ok: null, at: t };
  p.q = qualityOf(p);
  p.unit = unitCost(p);
  const cost = prodUpfront(Object.assign({}, p, { qty }));
  if (cost && !pay(g, cost, `Boutique : ${prodName(p)}${mode === 'stock' ? ` (${nfFull.format(qty)} pièces ${ORIGINS[origin].in})` : M.line ? ' (développement)' : ''}`, 'merch')) return { ok: false, why: `Pas assez d’argent (${fmtMoney(g, cost)} à avancer).` };
  // made first: the days of its country (in stock); written (a book), developed (a line)
  let days = 0;
  if (M.book) days += BOOK_BY[p.by].days;
  if (M.line) days += M.devDays;
  if (mode === 'stock') { days += randi(...ORIGINS[origin].days); p.stock = qty; p.made = qty; }
  p.bad = Math.random() < (mode === 'pod' ? POD_BAD : ORIGINS[origin].bad); // (a pre-order is made in its country too: it shows when it is delivered)
  if (days) { p.state = 'making'; p.readyAt = t + days * DAY_MS; }
  const S = shopOf(g);
  S.items.push(p);
  if (S.items.length > 30) S.items = S.items.filter((x) => x.state !== 'gone' || S.items.indexOf(x) >= S.items.length - 30);
  if (p.credit && S.contest && S.contest.state === 'open') contestPicked(g, p, t);
  return { ok: true, p };
}
// The price, at any time (the next orders pay it).
function setPrice(g, p, v) {
  const M = p && MERCH[p.k], price = Math.min(MONEY_MAX, Math.round(num(v) * 100) / 100);
  if (!M || p.state === 'gone' || !(price >= M.min)) return false;
  p.price = price;
  return true;
}
// (a pre-order runs its ten days, then it is made: neither paused nor put back on sale)
function pauseItem(g, p) { if (!p || p.state !== 'live' || p.preco) return false; p.state = 'paused'; return true; }
function resumeItem(g, p) { if (!p || p.state !== 'paused' || p.preco) return false; p.state = 'live'; return true; }
// Taken off (what is left in stock stays on the creator's hands); one not launched yet and made on demand: just gone.
function retireItem(g, p) {
  if (!p || p.state === 'gone' || p.preco) return false;
  p.state = 'gone';
  p.goneAt = Date.now();
  const S = shopOf(g);
  if (S.launch) S.launch.items = S.launch.items.filter((id) => id !== p.id);
  return true;
}
// More of it (in stock: paid now, made in its country's days). A numbered limited edition made again: the fans who
// bought « limited » feel cheated. restockWhy: why not ('' when it can).
function restockWhy(g, p, qty = 100) {
  if (!p || p.mode !== 'stock' || p.state === 'gone' || p.state === 'making' || !MERCH_QTY.includes(qty)) return 'Pas de réassort pour ce produit.';
  if (p.restockAt && p.restockAt > Date.now()) return 'Un réassort est déjà en route.';
  if (p.limited && !p.launchAt) return `Ton édition limitée compte ${nfFull.format(p.limited)} exemplaires : pas un de plus avant son lancement.`;
  const cost = Math.round(qty * unitCost(p));
  return g.career.cash < cost ? `Pas assez d’argent pour ce réassort (${fmtMoney(g, cost)}).` : '';
}
function restock(g, p, qty = 100) {
  if (restockWhy(g, p, qty)) return false;
  const cost = Math.round(qty * unitCost(p));
  if (!pay(g, cost, `Boutique : réassort (${nfFull.format(qty)} × ${prodName(p)})`, 'merch')) return false;
  const t = Date.now();
  p.restockAt = t + randi(...ORIGINS[p.origin].days) * DAY_MS;
  p.restockQty = (p.restockQty || 0) + qty;
  p.made += qty;
  if (p.limited && !p.betrayed && p.launchAt) {
    p.betrayed = true;
    warmMove(g, -6, 'ton édition « limitée » refaite', t);
    const dr = repMove(g, { cred: -8 }, `ton édition limitée (${prodName(p)}) refaite`);
    addNotif(g, { k: 'reldown', text: `😬 Ton édition limitée (${prodName(p)}) revient en stock : ceux qui l’avaient achetée « numérotée » le prennent mal${repBit(dr, ', ')}.` });
    addTrigger(g, `Le joueur avait vendu ${prodHis(p)} en « édition limitée numérotée »… et il en refait. Ceux qui l’ont achetée se sentent floués, d’autres s’en moquent.`);
  }
  return true;
}

/* ---------- the duo with a character ---------- */
// Someone of the cast the player gets along with (or is with): they decide in their messages.
const collabOK = (g, c) => !!c && isMain(c) && c.unlocked && !c.cut && (c.rel >= 30 || PARTNER.includes(c.vibe));
function collabText(g, p) {
  const c = p.collab && g.chars[p.collab.c];
  return c ? `On fait un merch ensemble ? ${cap1(MERCH[p.k].one)}${p.design ? ` avec « ${p.design} »` : ''}, à ${fmtMoney(g, p.price)}, et on partage la marge moitié-moitié.` : '';
}
// In their conversation: what the player proposes, waiting for their answer.
function merchDMCtx(g, c) {
  const p = shopItems(g).find((x) => x.collab && x.collab.c === c.id && x.collab.ok == null && x.state !== 'gone');
  if (!p) return [];
  return [`Le joueur te propose un MERCH EN DUO : ${MERCH[p.k].one}${p.design ? `, design « ${p.design} »` : ''}${p.name ? ` (« ${p.name} »)` : ''}, à ${fmtMoney(g, p.price)}, fabriqué ${p.mode === 'pod' ? 'à la demande' : ORIGINS[p.origin].in}, la marge partagée moitié-moitié. Réponds selon ce que tu penses vraiment du joueur et du projet. Quand tu décides : {"t":"collab","ok":true} si tu acceptes, {"t":"collab","ok":false,"why":"≤ 60 caractères"} si tu refuses (rien tant que tu n’as pas décidé).`];
}
function applyCollabLine(g, c, o) {
  const p = shopItems(g).find((x) => x.collab && x.collab.c === c.id && x.collab.ok == null && x.state !== 'gone');
  if (!p) return false;
  const ok = o.ok === true || o.ok === 'true';
  p.collab.ok = ok;
  const first = c.name.split(' ')[0];
  if (ok) addNotif(g, { k: 'relup', c: c.id, text: `🤝 ${first} est partant${gx(c.g, '', 'e', '·e')} pour votre merch en duo (${prodName(p)}) : ${p.state === 'ready' ? 'tu peux le lancer avec un post' : 'tu pourras le lancer dès qu’il sera prêt'}.` });
  else { addNotif(g, { k: 'reldown', c: c.id, text: `${first} ne veut pas faire de merch avec toi${o.why ? ` : « ${str(o.why, 60)} »` : ''}. Ton produit reste à toi seul${px(g, '', 'e', '·e')}.` }); p.collab = null; }
  return true;
}
const collabWaits = (p) => !!(p.collab && p.collab.ok !== true);
// The player gives up waiting: the product is theirs alone (nothing said to the character).
function collabSolo(g, p) {
  if (!p || !p.collab || p.collab.ok === true || p.state === 'gone') return false;
  p.collab = null;
  return true;
}

/* ---------- the launch ---------- */
// What is ready to go on sale (with a post): the products ready, their duo agreed.
const launchable = (g) => shopItems(g).filter((p) => p.state === 'ready' && !collabWaits(p));
// The launch the composer works with: { id, state: 'ready', items: [products] }. ids: the products the player launches
// (one, or all those ready): a new launch; without: the one under way (null when there is none, or nothing left in it).
function openDrop(g, ids) {
  const ready = launchable(g), S = shopOf(g);
  if (ids) S.launch = { id: uid('ml'), at: Date.now(), items: ready.filter((p) => ids.includes(p.id)).map((p) => p.id) };
  const items = S.launch ? ready.filter((p) => S.launch.items.includes(p.id)) : [];
  return items.length ? { id: S.launch.id, state: 'ready', items } : null;
}
const launchAll = (g) => openDrop(g, launchable(g).map((p) => p.id));
const launchList = (g, L) => L.items.map((p) => `${prodName(p)} à ${fmtMoney(g, p.price)}`).join(', ');
const dropList = launchList; // (0.22)
const madeIn = (p) => (p.mode === 'pod' ? 'imprimé à la demande' : `fabriqué ${ORIGINS[p.origin].in}`);
const madeOf = (p) => [madeIn(p), MERCH[p.k].textile && MATERIALS[p.mat] ? MATERIALS[p.mat].label.toLowerCase() : '', MERCH[p.k].print && PRINTS[p.print] ? PRINTS[p.print].label.toLowerCase() : ''].filter(Boolean).join(', ');
// The launch post, as the AI should judge it.
function merchLine(g, L) {
  const parts = L.items.map((p) => {
    const M = MERCH[p.k], bits = [madeOf(p)];
    if (p.design) bits.push(`design « ${p.design} »`);
    if (M.book) bits.push(`titre « ${p.name} » : ${p.pitch}${p.by === 'plume' ? ' (écrit par un prête-plume, le public ne le sait pas)' : ''}`);
    if (M.line) bits.push(`nom « ${p.name} »`);
    if (p.limited) bits.push(`édition limitée numérotée de ${p.limited} exemplaires`);
    if (p.mode === 'preco') bits.push(`en précommande pendant ${PRECO_DAYS} jours`);
    if (p.charity) bits.push(`${p.charity} % reversés à ${p.asso || 'une association'}`);
    if (p.collab && g.chars[p.collab.c]) bits.push(`en duo avec @${g.chars[p.collab.c].handle}`);
    if (p.credit) bits.push(`le design de @${p.credit}, gagnant de son concours`);
    return `${M.one} à ${fmtMoney(g, p.price)} (${bits.join(' ; ')})`;
  });
  return `Avec ce post, le joueur LANCE ${L.items.some((p) => MERCH[p.k].book) && L.items.length === 1 ? 'SON LIVRE' : 'DU MERCH'} dans sa boutique : ${parts.join(' ; ')}. Juge à quel point ça donne envie à son public, d’après ce que c’est, les prix, la façon de le faire et ce que ça représente pour ses abonnés : merch 1-5 (1 : personne n’en veut, 3 : ses fans en achètent, 5 : tout le monde en veut). Les réactions en parlent (des fans qui commandent, d’autres qui trouvent ça cher si c’est cher, un design raté se fait chambrer ; « fabriqué en Chine » ou en polyester peut faire tiquer, « fabriqué en France » ou un don à une asso peut plaire : chacun selon son caractère).`;
}
// The post claims it is made in France: the buyers read the labels. (« pas fabriqué en France », said honestly, is
// no claim; a flag alone says nothing.)
const FR_CLAIM = /(?:fabriqu[ée]e?s?|produite?s?|confectionn[ée]e?s?|imprim[ée]e?s?)\s+en\s+france|made\s+in\s+france|100\s*%\s*fran[çc]ais(?:e|es)?/gi;
const NOT_BEFORE = /\b(?:pas|non|jamais|ni|plus|not|sans)\s+(?:[a-zà-ÿ'’]+\s+){0,2}$/i;
function claimsFrance(text) {
  const s = String(text || '');
  FR_CLAIM.lastIndex = 0;
  let m;
  while ((m = FR_CLAIM.exec(s))) if (!NOT_BEFORE.test(s.slice(Math.max(0, m.index - 40), m.index))) { FR_CLAIM.lastIndex = 0; return true; }
  FR_CLAIM.lastIndex = 0;
  return false;
}
// The post that launches them: the AI's verdict on how much people want it; the community's take on the prices, the
// making, a share given away; what the post claims.
function launchDrop(g, L, desir, post, t = Date.now()) {
  const S = shopOf(g);
  const items = (L && L.items ? L.items : []).map((x) => (typeof x === 'string' ? shopItems(g).find((p) => p.id === x) : x)).filter((p) => p && p.state === 'ready' && !collabWaits(p));
  if (!items.length) return false;
  // the claim: a lie when nothing of this launch is made in France (with one that is, the post may speak of that one)
  const v = clamp(Math.round(num(desir) || 3), 1, 5), claim = !!post && claimsFrance(post.text) && !items.some((p) => p.mode !== 'pod' && p.origin === 'fr');
  for (const p of items) {
    Object.assign(p, { state: 'live', launchAt: t, desir: v, post: post ? post.id : null });
    if (p.mode === 'preco') p.preco = { until: t + PRECO_DAYS * DAY_MS, qty: 0 };
    if (claim) p.claim = 'fr'; // (a lie the buyers may find out)
    const c = p.collab && g.chars[p.collab.c];
    if (c) applyRel(g, c, 3, 'votre merch en duo', t + 2000, 3);
  }
  if (S.launch && items.some((p) => S.launch.items.includes(p.id))) S.launch = null;
  if (!S.payAt) S.payAt = t + 7 * DAY_MS;
  const r = items.reduce((n, p) => n + p.price / prodFair(p), 0) / items.length;
  const eco = items.reduce((n, p) => n + (MERCH[p.k].textile && MATERIALS[p.mat] ? MATERIALS[p.mat].eco : 0) + (p.mode !== 'pod' && p.origin === 'fr' ? 0.5 : 0) + (p.mode !== 'pod' && p.origin === 'cn' ? -0.5 : 0), 0) / items.length;
  const give = Math.max(...items.map((p) => p.charity));
  if (r >= 1.6) warmMove(g, -4, 'ton merch hors de prix', t);
  else if (r <= 1.1) warmMove(g, 2, 'un merch à prix honnête', t);
  if (eco >= 0.75) warmMove(g, 1, 'un merch bien fabriqué', t);
  else if (eco <= -0.75) warmMove(g, -1, 'un merch fabriqué au moins cher', t);
  if (give) { warmMove(g, Math.min(4, 1 + give / 25), 'ton merch qui donne à une asso', t); repMove(g, { kind: Math.min(6, 1 + Math.round(give / 20)) }, 'un merch qui donne à une asso'); }
  addNotif(g, { k: 'money', p: post ? post.id : undefined, text: `🛍️ En vente dans ta boutique : ${launchList(g, { items })}${items.some((p) => p.mode === 'preco') ? ` (précommandes pendant ${PRECO_DAYS} jours)` : ''}. Les commandes arrivent dans les jours qui viennent, payées chaque semaine.` });
  addTrigger(g, `Le joueur vient de lancer ${items.length > 1 ? 'du merch' : prodHis(items[0])} (${launchList(g, { items })} ; ${items.map(madeOf).join(' / ')})${r >= 1.6 ? ', à des prix que beaucoup trouvent abusés' : ''}. Dans les jours qui suivent, des fans postent des photos avec, d’autres en parlent.`);
  return true;
}

/* ---------- the seasons ---------- */
// Halloween, Black Friday, Christmas: the shop's high seasons (the game's calendar).
function shopSeason(t = Date.now()) {
  const d = gameDate(t), y = d.getFullYear(), day = Math.floor((d - new Date(y, 0, 1)) / DAY_MS);
  const doy = (x) => Math.floor((x - new Date(y, 0, 1)) / DAY_MS);
  const bf = doy(blackFriday(y));
  if (day >= bf - 2 && day <= bf + 3) return { k: 'bf', label: 'le Black Friday', mult: 1.8 };
  if (d.getMonth() === 11 && d.getDate() <= 24) return { k: 'noel', label: 'Noël', mult: 1.7 };
  if (d.getMonth() === 9 && d.getDate() >= 25) return { k: 'halloween', label: 'Halloween', mult: 1.15 };
  return null;
}

/* ---------- selling ---------- */
// How many can buy it on a day: the shop's audience (a small account has its few faithful, a big one its crowd).
const audienceOf = (g) => 0.004 * Math.pow(Math.max(0, g.stats.followers), 0.75);
// Days since its launch: the spotlight of the first days, then a long, slow tail.
const curveAt = (n) => (0.1 + 0.9 * Math.exp(-Math.max(0, n - 1) / 6)) * Math.exp(-Math.max(0, n) / 240);
// One day of orders for one product.
function sellProd(g, p, day, t) {
  const M = MERCH[p.k];
  if (!M || p.state !== 'live' || !(p.price > 0) || (p.mode === 'stock' && !(p.stock > 0))) return 0;
  const n = day - gameDay(p.launchAt);
  if (!(n >= 0)) return 0;
  const S = shopOf(g), sea = shopSeason(t), c = p.collab && p.collab.ok && g.chars[p.collab.c];
  const reviewsK = 1 + (0.55 + 0.9 * num(p.q, 0.5) - 1) * Math.min(1, p.sold / 200); // (the first buyers come for the hype, the next ones read the reviews)
  let k = audienceOf(g) * (DESIR_K[p.desir] || DESIR_K[3]) * Math.max(0.15, warmOf(g) / WARM0) * curveAt(n) * M.w * Math.pow(prodFair(p) / p.price, 1.5) * reviewsK * (1 + skillFx(g, 'merch'));
  if (sea) k *= sea.mult;
  if (p.limited && !p.betrayed) k *= 1.5;
  if (c) k *= 1 + Math.min(1, (c.followers || 0) / Math.max(1, g.stats.followers)) * 0.5;
  if (p.fake && p.fake.state !== 'gone') k *= p.fake.state === 'on' ? 0.7 : 0.85;
  if (p.exposedAt) k *= 0.6;
  if (p.badAt) k *= 0.5;
  if (S.popup && S.popup.state === 'on') k *= 3; // (t: the end of the day sold, its events already open or closed)
  if (S.signing && S.signing.state === 'on' && S.signing.p === p.id) k *= 2.5;
  let q = Math.round(k * rand(0.7, 1.3));
  if (p.mode === 'stock') q = Math.min(q, p.stock);
  if (!(q > 0) || !Number.isFinite(q)) return 0;
  if (p.mode === 'stock') {
    p.stock -= q;
    if (!p.stock && !p.outTold) { p.outTold = true; addNotif(g, { k: 'money', text: `🛍️ Rupture de stock pour ${prodYour(p)}. ${p.limited && !p.betrayed ? 'Ton édition limitée est épuisée.' : 'Tu peux en refaire depuis ta boutique.'}` }); }
  }
  if (p.preco) p.preco.qty += q;
  // 0.29: what one piece brings in: the price less the card fees, less the making when it is paid at the sale (on
  // demand; in stock and in pre-order it is paid apart, before), less the partner's half of the profit; the share for
  // the charity is paid out with the week.
  const gross = q * p.price, unit = unitCost(p), give = p.price * num(p.charity, 0) / 100;
  const profit = p.price * 0.97 - give - unit, half = c && profit > 0 ? profit / 2 : 0;
  const net = q * (p.price * 0.97 - (p.mode === 'pod' ? unit : 0) - half);
  const ret = p.mode === 'preco' ? 0 : Math.round(q * (1 - p.q) * 0.12 * (p.badAt ? 2 : 1) * rand(0.6, 1.4)); // (returns: what disappoints comes back)
  p.sold += q; p.revenue += gross; p.refunds += ret * p.price;
  S.sold += q; S.revenue += gross; S.weekSold += q;
  S.pend += net - ret * p.price;
  if (half) S.partner = Object.assign(S.partner || {}, { [c.id]: ((S.partner || {})[c.id] || 0) + q * half });
  if (give) { S.given = (S.given || 0) + q * give; const a = p.asso || 'une asso'; S.asso = !S.asso || S.asso === a ? a : 'plusieurs assos'; }
  if (p.sold >= 10 && !p.rev) p.rev = Math.round(clamp(1 + 4 * p.q + rand(-0.3, 0.3), 1, 5) * 10) / 10; // (the reviews)
  return q;
}
// Each week: the sales paid (the share for a charity paid out, the partner's half paid to them). After a long skip,
// the weeks gone by in one go.
function payShop(g, t) {
  const S = shopOf(g), v = Math.round(S.pend * 100) / 100, given = Math.round((S.given || 0) * 100) / 100, net = Math.round((v - given) * 100) / 100;
  const weeks = S.payAt ? Math.max(1, Math.round((t - S.payAt) / (7 * DAY_MS)) + 1) : 1;
  if (v > 0) earn(g, v, `Boutique : ${fmtN(S.weekSold)} ${plural(S.weekSold, 'vente', 'ventes')}`, 'merch');
  else if (v < 0) charge(g, -v, 'Boutique : remboursements', 'merch');
  if (given > 0) charge(g, given, `Boutique : reversés à ${S.asso || 'une asso'}`, 'merch');
  if (S.weekSold || v) {
    const parts = Object.entries(S.partner || {}).filter(([id, n]) => g.chars[id] && n > 0).map(([id, n]) => `${g.chars[id].name.split(' ')[0]} a touché sa moitié (${fmtMoney(g, Math.round(n))})`);
    addNotif(g, { k: 'money', text: `🛍️ Ta boutique : ${fmtN(S.weekSold)} ${plural(S.weekSold, 'pièce vendue', 'pièces vendues')} ${weeks > 1 ? `ces ${weeks} dernières semaines` : 'cette semaine'}, ${net >= 0 ? '+' : '−'}${fmtMoney(g, Math.abs(net))} pour toi${given > 0 ? ` (et ${fmtMoney(g, Math.round(given))} reversés à ${S.asso || 'une asso'})` : ''}${parts.length ? ' · ' + parts.join(', ') : ''}.` });
  }
  S.pend = 0; S.weekSold = 0; S.given = 0; S.partner = null; S.asso = '';
  S.payAt = t + 7 * DAY_MS;
}

/* ---------- what happens to a product ---------- */
// Made: ready to launch; a book written; a line developed; a restock arrived.
function madeNow(g, p, t) {
  if (p.state === 'making' && t >= p.readyAt) {
    p.state = 'ready';
    const M = MERCH[p.k];
    addNotif(g, { k: 'money', text: `🛍️ ${M.book ? `Ton livre « ${p.name} » est écrit${p.mode === 'pod' ? '' : ' et imprimé'}` : M.line ? `${cap1(prodYour(p))} est ${agr(p, 'prêt', 'prête', 'prêts')}` : `${cap1(prodYour(p))} : ${nfFull.format(p.made)} pièces fabriquées ${ORIGINS[p.origin].in}, livrées`}. Tu peux ${agr(p, 'le', 'la', 'les')} lancer ${collabWaits(p) ? 'dès que ton duo est d’accord' : 'avec un post'} (ta boutique).` });
    return true;
  }
  if (p.restockAt && t >= p.restockAt) { p.stock = (p.stock || 0) + (p.restockQty || 0); p.restockAt = 0; p.restockQty = 0; p.outTold = false; addNotif(g, { k: 'money', text: `🛍️ Réassort livré : ${prodYour(p)} ${agr(p, 'est', 'est', 'sont')} de nouveau en stock.` }); return true; }
  return false;
}
// The pre-orders: closed after their days, made (paid now), shipped in its country's days, sometimes late.
function precoStep(g, p, t) {
  const P = p.preco;
  if (!P) return false;
  if (!P.closed && t >= P.until) {
    P.closed = true;
    if (!P.qty) { // (nobody ordered: nothing to make)
      P.shipped = true; p.state = 'gone'; p.goneAt = t;
      addNotif(g, { k: 'money', text: `🛍️ Précommandes closes : personne n’a commandé ${prodYour(p)}. Rien à fabriquer.` });
      return true;
    }
    const cost = Math.round(P.qty * unitCost(p));
    if (cost) charge(g, cost, `Boutique : fabrication des précommandes (${nfFull.format(P.qty)} × ${prodName(p)})`, 'merch');
    const late = Math.random() < ORIGINS[p.origin].late;
    P.shipAt = t + randi(...ORIGINS[p.origin].days) * DAY_MS;
    if (late) { P.lateAt = P.shipAt; P.shipAt += randi(7, 14) * DAY_MS; }
    p.state = 'paused';
    addNotif(g, { k: 'money', text: `🛍️ Précommandes closes : ${nfFull.format(P.qty)} ${plural(P.qty, 'commande', 'commandes')} pour ${prodYour(p)}. Fabrication ${ORIGINS[p.origin].in} : ${fmtMoney(g, cost)}.` });
    return true;
  }
  if (P.closed && P.lateAt && t >= P.lateAt && !P.lateTold) {
    P.lateTold = true;
    warmMove(g, -4, 'des précommandes en retard', t);
    const ret = Math.round(P.qty * 0.05);
    if (ret) charge(g, ret * p.price, `Boutique : précommandes remboursées (${ret})`, 'merch');
    addNotif(g, { k: 'reldown', text: `😬 Tes précommandes (${prodName(p)}) sont en retard : ceux qui ont commandé s’impatientent${ret ? `, ${ret} se font rembourser` : ''}.` });
    addTrigger(g, `Les précommandes du merch du joueur (${prodName(p)}) sont en retard : les acheteurs s’impatientent, certains réclament, d’autres se moquent.`);
    return true;
  }
  if (P.closed && !P.shipped && t >= P.shipAt) {
    P.shipped = true;
    p.state = 'gone'; p.goneAt = t; // (a pre-order is one batch: launched again, it is a new one)
    if (!p.rev && P.qty >= 10) p.rev = Math.round(clamp(1 + 4 * p.q + rand(-0.3, 0.3), 1, 5) * 10) / 10;
    addNotif(g, { k: 'money', text: `🛍️ Tes précommandes sont livrées : ${nfFull.format(P.qty)} × ${prodName(p)}.` });
    return true;
  }
  return false;
}
// A bad batch shows with the first deliveries: complaints, refunds, fewer orders.
function badBatch(g, p, t) {
  p.badAt = t;
  const refund = Math.round(p.sold * 0.1 * p.price);
  if (refund) charge(g, refund, `Boutique : remboursements (${prodName(p)} défectueux)`, 'merch');
  warmMove(g, -5, 'la qualité de ton merch', t);
  const dr = repMove(g, { pro: -6 }, 'un merch de mauvaise qualité');
  const what = MERCH[p.k].textile ? 'coutures qui lâchent, tissu qui déteint' : MERCH[p.k].line ? 'des réactions, un produit qui tourne' : 'des pièces cassées, mal finies';
  addNotif(g, { k: 'reldown', text: `😬 Des acheteurs se plaignent de ${prodYour(p)} : ${what}. ${refund ? `Tu rembourses les pires cas (−${fmtMoney(g, refund)})` : 'Tu t’excuses'}${repBit(dr, ', ')}.` });
  addTrigger(g, `Des acheteurs du merch du joueur (${prodName(p)}) se plaignent de sa qualité (${what}), photos à l’appui : certains se moquent, d’autres le défendent.`);
  const c = p.collab && p.collab.ok && g.chars[p.collab.c];
  if (c) applyRel(g, c, -4, 'votre merch en duo déçoit', t + 3000, 6);
}
// A product that is not good enough: after the first weeks, the reviews say why (the fabric, the printing).
function qualityComplaint(g, p, t) {
  p.complained = true;
  const lack = 0.6 - p.q, why = [];
  if (MATERIALS[p.mat] && p.mat === 'poly') why.push('« ça gratte », le tissu transpire');
  if (PRINTS[p.print] && p.print === 'transfert') why.push('l’impression craquelle au lavage');
  if (!why.length) why.push(p.mode !== 'pod' && p.origin === 'cn' ? 'une finition bas de gamme' : 'pas à la hauteur du prix');
  warmMove(g, -Math.round(2 + 10 * lack), 'les avis sur ton merch', t);
  const dr = repMove(g, { pro: -Math.round(3 + 10 * lack) }, 'des avis mitigés sur ton merch');
  addNotif(g, { k: 'reldown', text: `⭐ Les avis sur ${prodYour(p)} : ${why.join(', ')}${repBit(dr, ' (', ')')}.` });
  addTrigger(g, `Les avis sur le merch du joueur (${prodName(p)}) ne sont pas bons : ${why.join(', ')}. Des acheteurs le disent en public.`);
}
// What a launch post claimed (« fabriqué en France ») and was not: a buyer reads the label.
function exposeClaim(g, p, t) {
  p.exposedAt = t;
  const loss = Math.round(g.stats.followers * 0.01);
  g.stats.followers = Math.max(0, g.stats.followers - loss);
  const dr = repMove(g, { cred: -15, image: -6 }, `ton merch « fabriqué en France » ne l’était pas (${prodName(p)})`, { noCheck: true });
  warmMove(g, -10, 'ton faux « fabriqué en France »', t);
  g.pbb = { at: t, until: t + Math.round(PLAYER_BB_MS * staffMult(g, 'bb')), c: null, kind: 'merch' };
  const where = p.mode === 'pod' ? 'imprimé à la demande, à l’étranger' : `« Made in ${p.origin === 'cn' ? 'China' : p.origin === 'tr' ? 'Turkey' : 'Portugal'} »`;
  let at = t + randi(2000, 5000);
  addAmbientPost(g, { by: 'etiquette.verite', name: 'L’étiquette ne ment pas', bio: 'on lit les étiquettes pour vous', text: `On a reçu ${MERCH[p.k].one} de la boutique de @${g.player.handle}, annoncé « fabriqué en France ». L’étiquette dit ${where}. 🧐` }, at, at);
  at += randi(4000, 8000);
  addAmbientPost(g, { by: pick(CANCEL_NPCS)[0], text: `donc le merch « fabriqué en France » de @${g.player.handle}… ne l’est pas. on nous prend pour qui ? #MerchGate` }, at, at);
  addNotif(g, { k: 'cancel', text: `⚠️ Un acheteur a lu l’étiquette de ${prodYour(p)} : ce n’est pas fabriqué en France, comme ton post le disait. Bad buzz (${repBit(dr, '', ', ')}−${nAbonnes(loss)}).` });
  addChronicle(g, `${g.player.name} a vendu un merch annoncé « fabriqué en France »… qui ne l’était pas.`);
  addTrigger(g, `On vient de découvrir que le merch du joueur (${prodName(p)}), annoncé « fabriqué en France », est en fait ${p.mode === 'pod' ? 'imprimé à l’étranger' : 'fabriqué ' + ORIGINS[p.origin].in}. Indignation, moqueries, « il nous ment depuis le début ? ».`);
}
// A product that sells a lot gets copied.
function counterfeit(g, p, t) {
  p.fake = { at: t, state: 'on', until: t + 30 * DAY_MS };
  addNotif(g, { k: 'reldown', text: `🧐 Des contrefaçons de ${prodYour(p)} circulent, moins chères et ratées : tes ventes en prennent un coup. Agis depuis ta boutique.` });
  addTrigger(g, `Des contrefaçons du merch du joueur (${prodName(p)}) circulent en ligne : des fans postent des copies ratées, d’autres se sont fait avoir.`);
}
// Against a counterfeit: report it (free, slow), the lawyer (fast, damages), or let it go.
function fakeAction(g, p, how, t = Date.now()) {
  if (!p || !p.fake || p.fake.state === 'gone') return false;
  if (how === 'lawyer') {
    const law = hasStaff(g, 'avocat');
    if (!law) return false;
    Object.assign(p.fake, { state: 'lawyer', until: t + randi(2, 4) * DAY_MS, law: 1 });
  } else if (how === 'report') Object.assign(p.fake, { state: 'reported', until: t + randi(10, 20) * DAY_MS });
  else Object.assign(p.fake, { state: 'let', until: Math.max(p.fake.until, t + 20 * DAY_MS) });
  return true;
}
function fakeEnds(g, p, t) {
  const F = p.fake, won = F.law ? Math.round(p.revenue * 0.05) : 0;
  F.state = 'gone';
  if (won) earn(g, won, `Contrefaçon de ${prodName(p)} : dommages et intérêts`, 'merch');
  addNotif(g, { k: 'money', text: `🛍️ Les contrefaçons de ${prodYour(p)} ont disparu${won ? ` : ton avocat obtient ${fmtMoney(g, won)} de dommages et intérêts` : ''}.` });
}
// The last moment of a game day, on the clock the stored moments use.
const dayEndAt = (d) => (d + 1) * DAY_MS - clockOff() - 1;
// What falls at a moment: made, a restock delivered, pre-orders closed or delivered, a pop-up or a signing that opens or
// ends (each step once: called again, nothing happens twice).
function shopSteps(g, S, t) {
  let ch = false;
  for (const p of S.items) if (madeNow(g, p, t) || precoStep(g, p, t)) ch = true;
  if (S.popup && popupStep(g, S.popup, t)) ch = true;
  if (S.signing && signingStep(g, S.signing, t)) ch = true;
  return ch;
}
// Each game day: the orders; each week: paid; and what happens to each product. 0.29: the days of a skip one after
// the other, each with what fell that day (a pop-up open those days, pre-orders closed that day, a high season).
function tickMerch(g, t = Date.now()) {
  if (!g.career || (!g.career.shop && !g.career.merch)) return false;
  const S = shopOf(g);
  let ch = false;
  const day = gameDay(t);
  if (S.day == null) S.day = day;
  for (let k = 0; S.day < day && k < 60; k++) {
    S.day++;
    const td = Math.min(t, dayEndAt(S.day));
    if (shopSteps(g, S, td)) ch = true;
    for (const p of S.items) if (sellProd(g, p, S.day, td)) ch = true;
  }
  if (S.day < day) S.day = day; // (beyond sixty days, the shop slept)
  if (shopSteps(g, S, t)) ch = true;
  for (const p of S.items) {
    const P = p.preco, inHands = !P || !!P.shipped; // (a pre-order is in the buyers' hands once delivered)
    if (p.state === 'gone' && !(P && P.shipped && P.qty && t - (p.goneAt || 0) < 60 * DAY_MS)) continue; // (delivered, it is still worn, read, judged)
    const from = P ? P.shipAt : p.launchAt, age = from && t > from ? (t - from) / DAY_MS : 0; // (days in the buyers' hands)
    if (inHands) {
      if (p.bad && !p.badAt && p.sold > 0 && age > 4) { badBatch(g, p, t); ch = true; }
      if (!p.complained && !p.badAt && p.q < 0.6 && p.sold >= 30 && age > 7) { qualityComplaint(g, p, t); ch = true; }
      if (p.claim && !p.exposedAt && p.sold > 0 && rollDaily(p, 'claimDay', t, Math.min(0.06, 0.006 + p.sold / 15000))) { exposeClaim(g, p, t); ch = true; }
    }
    if (p.state === 'gone') continue;
    if (!p.fake && p.state === 'live' && p.sold >= 250 && (p.desir || 3) >= 3 && rollDaily(p, 'fakeDay', t, 0.01 + Math.min(0.02, p.sold / 50000))) { counterfeit(g, p, t); ch = true; }
    if (p.fake && p.fake.state !== 'gone' && t >= p.fake.until) { fakeEnds(g, p, t); ch = true; }
  }
  if (S.contest && S.contest.state === 'open' && t - S.contest.at > 14 * DAY_MS) { S.contest.state = 'over'; ch = true; }
  if (S.payAt && t >= S.payAt) { payShop(g, t); ch = true; }
  return ch;
}
// Once a game day at most, a chance.
function rollDaily(p, key, t, chance) {
  const d = gameDay(t);
  if (p[key] === d) return false;
  p[key] = d;
  return Math.random() < chance;
}
// The player stops a product (0.22: the whole drop).
function stopDrop(g, p) { return retireItem(g, p); }

/* ---------- the design contest ---------- */
// The post that asks the community for designs: the replies bring them (three fans of this world).
function contestLine() {
  return `Avec ce post, le joueur LANCE UN CONCOURS DE DESIGN pour son prochain merch : sa commu propose des idées. Parmi les réponses, ${FAN_DESIGNS} abonnés différents proposent chacun un design (des gens du public, jamais un personnage principal), une ligne chacun : {"t":"design","by":"pseudo","name":"nom affiché","text":"le design, ≤ 90 caractères"}. Des designs variés, dans le ton de ce monde et de ce que les abonnés aiment chez le joueur.`;
}
function addDesign(g, ctx, o) {
  const text = str(o.text, 90), by = normHandle(o.by);
  if (!ctx.designs) ctx.designs = [];
  if (text.length < 3 || !by || by === g.player.handle || charByHandle(g, by) || ctx.designs.length >= FAN_DESIGNS || ctx.designs.some((x) => x.by === by)) return false;
  resolveAuthor(g, by, o.name, 'a proposé un design pour le merch du joueur');
  ctx.designs.push({ by, text, name: str(o.name, 40) });
  return true;
}
function contestStarted(g, post, designs, t = Date.now()) {
  const S = shopOf(g), entries = (designs || []).slice(0, FAN_DESIGNS);
  S.contest = { id: uid('mc'), state: entries.length ? 'open' : 'over', at: t, post: post ? post.id : null, entries };
  if (!entries.length) { // (nobody sent one under the post: another post can ask again)
    addNotif(g, { k: 'money', p: post ? post.id : undefined, text: '🎨 Ton concours de design n’a reçu aucune proposition sous ton post. Tu peux en lancer un autre depuis ta boutique.' });
    return;
  }
  warmMove(g, 2, 'ton concours de design', t);
  addNotif(g, { k: 'money', p: post ? post.id : undefined, text: `🎨 Ton concours de design : ${entries.length} ${plural(entries.length, 'proposition', 'propositions')} de ta commu. Choisis la gagnante dans ta boutique.` });
}
// The player closes the contest without a winner (the community notices a little).
function contestClose(g, t = Date.now()) {
  const C = shopOf(g).contest;
  if (!C || C.state !== 'open') return false;
  C.state = 'over';
  if (C.entries.length) warmMove(g, -1, 'ton concours sans gagnant', t);
  return true;
}
// The winner's design, made into a product: the community loves being heard.
function contestPicked(g, p, t) {
  const S = shopOf(g), C = S.contest;
  C.state = 'picked';
  C.winner = p.credit;
  warmMove(g, 3, 'le design gagnant de ton concours', t);
  if (!g.npcs[p.credit]) resolveAuthor(g, p.credit, ((C.entries || []).find((e) => e.by === p.credit) || {}).name, 'a gagné le concours de design du joueur'); // (gone from the network meanwhile: back)
  const n = g.npcs[p.credit];
  if (n && !n.regular) n.regular = true;
  addNotif(g, { k: 'relup', text: `🎨 Le design de @${p.credit} gagne ton concours : il sera ${MERCH[p.k].one}. Ta commu adore.` });
  addTrigger(g, `Le joueur a choisi le design de @${p.credit} (gagnant de son concours) pour son prochain merch : @${p.credit} n’en revient pas, la commu applaudit.`);
}

/* ---------- the book signing, the pop-up store ---------- */
// A book signing, a day at a time chosen (the book on sale): its day, it sells more, the fans come.
function planSigning(g, p, at, place) {
  const S = shopOf(g), t = Date.now();
  if (!p || !MERCH[p.k].book || p.state !== 'live' || (S.signing && S.signing.state !== 'over') || !(at > t)) return false;
  if (!pay(g, SIGNING_COST, 'Séance de dédicaces (salle, déplacement)', 'merch')) return false;
  S.signing = { p: p.id, at, end: at + DAY_MS, place: str(place, 40) || 'une librairie de ta ville', state: 'planned' };
  addNotif(g, { k: 'money', text: `📖 Séance de dédicaces de « ${p.name} » ${fmtWhen(at)}, ${S.signing.place}.` });
  addTrigger(g, `Le joueur annonce une séance de dédicaces de son livre « ${p.name} » ${fmtWhen(at)}, ${S.signing.place}. Les fans s’organisent pour venir.`);
  return true;
}
function signingStep(g, s, t) {
  const p = shopItems(g).find((x) => x.id === s.p);
  if (s.state === 'planned' && t >= s.at) {
    s.state = 'on';
    const S = shopOf(g), again = S.signedAt && s.at - S.signedAt < 21 * DAY_MS; // (one after the other: the fans come, the magic less)
    S.signedAt = s.at;
    warmMove(g, again ? 1 : 4, 'ta séance de dédicaces', t);
    addNotif(g, { k: 'money', text: `📖 Ta séance de dédicaces commence (${s.place}) : la file d’attente s’allonge.` });
    addChronicle(g, `${g.player.name} a dédicacé son livre « ${p ? p.name : ''} » (${s.place}).`);
    addTrigger(g, `C’est la séance de dédicaces du livre du joueur (${s.place}) : des fans postent leurs photos avec lui, la file d’attente, le livre dédicacé.`);
    return true;
  }
  if (s.state === 'on' && t >= s.end) { s.state = 'over'; return true; }
  return false;
}
// A pop-up store (a city, three days): everything in the shop sells far more, the fans meet the creator.
function planPopup(g, city, at) {
  const S = shopOf(g), t = Date.now();
  if (g.stats.followers < MERCH_TIERS[5][0] || !shopLive(g).length || (S.popup && S.popup.state !== 'over') || (S.popupAt && t - S.popupAt < POPUP.cool * DAY_MS) || !(at > t)) return false;
  const place = str(city, 40);
  if (place.length < 2) return false;
  if (!pay(g, POPUP.cost, `Pop-up store à ${place} (${POPUP.days} jours)`, 'merch')) return false;
  S.popup = { city: place, at, end: at + POPUP.days * DAY_MS, state: 'planned', sold0: 0 };
  S.popupAt = t;
  addNotif(g, { k: 'money', text: `🛍️ Ton pop-up store ouvre ${fmtWhen(at)} à ${place}, pour ${POPUP.days} jours.` });
  addTrigger(g, `Le joueur annonce un pop-up store de sa marque à ${place} ${fmtWhen(at)}, pour ${POPUP.days} jours : les fans prévoient d’y aller, certains font la queue dès l’ouverture.`);
  return true;
}
function popupStep(g, P, t) {
  const S = shopOf(g);
  if (P.state === 'planned' && t >= P.at) {
    P.state = 'on'; P.sold0 = S.sold;
    warmMove(g, 6, 'ton pop-up store', t);
    addNotif(g, { k: 'money', text: `🛍️ Ton pop-up store est ouvert à ${P.city} : la queue fait le tour du pâté de maisons.` });
    addChronicle(g, `${g.player.name} a ouvert un pop-up store à ${P.city}.`);
    addTrigger(g, `Le pop-up store du joueur est ouvert à ${P.city} : photos de la queue, des fans qui le rencontrent, des stories depuis la boutique.`);
    return true;
  }
  if (P.state === 'on' && t >= P.end) {
    P.state = 'over';
    addNotif(g, { k: 'money', text: `🛍️ Ton pop-up store à ${P.city} ferme : ${fmtN(S.sold - P.sold0)} ${plural(S.sold - P.sold0, 'pièce vendue', 'pièces vendues')} pendant ces jours-là.` });
    return true;
  }
  return false;
}

/* ---------- what the prompts know ---------- */
// The shop as the public sees it (a claim stays a claim until a buyer reads the label).
function merchCtx(g) {
  if (!g.career || (!g.career.shop && !g.career.merch)) return '';
  const S = shopOf(g), live = S.items.filter((p) => p.state === 'live' || (p.preco && !p.preco.shipped));
  if (!live.length && !(S.popup && S.popup.state !== 'over')) return '';
  const bits = live.slice(0, 6).map((p) => {
    const x = [`${prodName(p)} à ${fmtMoney(g, p.price)}`, p.claim && !p.exposedAt ? 'annoncé « fabriqué en France »' : madeOf(p)];
    if (p.limited) x.push(p.betrayed ? 'édition « limitée » refaite' : 'édition limitée');
    if (p.preco && !p.preco.shipped) x.push(!p.preco.closed ? 'en précommande' : p.preco.lateTold ? 'précommandes en retard' : 'précommandes closes, en fabrication');
    if (p.charity) x.push(`${p.charity} % reversés`);
    if (p.collab && p.collab.ok && g.chars[p.collab.c]) x.push(`avec @${g.chars[p.collab.c].handle}`);
    if (p.badAt || p.complained) x.push('des acheteurs se plaignent de la qualité');
    if (p.exposedAt) x.push('son faux « fabriqué en France » a été découvert');
    if (p.fake && p.fake.state !== 'gone') x.push('des contrefaçons circulent');
    return x.join(', ');
  });
  return `Sa boutique de merch : ${bits.join(' ; ')}${S.popup && S.popup.state !== 'over' ? ` ; un pop-up store à ${S.popup.city} ${S.popup.state === 'on' ? 'en ce moment' : fmtWhen(S.popup.at)}` : ''} (${fmtN(S.sold)} pièces vendues en tout).`;
}

/* ---------- the Studio: « Ta boutique » ---------- */
function BoutiqueSection({ g, now }) {
  const nt = shopNextTier(g);
  if (!merchOK(g)) return html`<section class="section boutique"><div class="section-h"><h3>Ta boutique</h3></div><p class="muted">Ta boutique ouvre à ${nfFull.format(MERCH_MIN)} abonnés : stickers, badges, porte-clés, puis le reste à mesure que ta commu grandit.</p></section>`;
  const S = shopOf(g), live = shopLive(g), ready = launchable(g), making = S.items.filter((p) => p.state === 'making').length;
  const sea = shopSeason(now);
  return html`<section class="section boutique">
    <div class="section-h"><h3>Ta boutique</h3><span>${fmtN(S.sold)} ${plural(S.sold, 'pièce vendue', 'pièces vendues')}</span></div>
    <p class="muted">${live.length ? `${live.length} ${plural(live.length, 'produit', 'produits')} en vente` : 'Rien en vente pour l’instant'}${making ? ` · ${making} en fabrication` : ''}${ready.length ? ` · ${ready.length} ${plural(ready.length, 'prêt', 'prêts')} à lancer` : ''}${sea ? ` · ${sea.label} : tes ventes s’envolent` : ''}.</p>
    ${nt ? html`<small class="muted">À ${nfFull.format(nt[0])} abonnés : ${nt[1].toLowerCase()}.</small>` : null}
    <div class="row"><button class="btn btn-hot btn-sm" onClick=${() => openLayer({ t: 'merch' })}><${Icon} n="cart" s=${15} /> Gérer ta boutique</button>
      ${ready.length ? html`<button class="btn btn-ghost btn-sm" onClick=${() => { const L = launchAll(g); if (L) openCompose({ merch: L.id }); }}><${Icon} n="pen" s=${14} /> Lancer avec un post</button>` : null}</div>
  </section>`;
}

/* ---------- « Ta boutique »: the window ---------- */
// The next days at an hour of the game's clock: [the moment, « Demain 14 h »…].
function shopDays(now, h, from = 1, n = 7) {
  const off = clockOff(), d0 = gameDate(now), out = [];
  for (let dd = from; dd < from + n; dd++) {
    const x = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + dd, h, 0, 0, 0);
    out.push([x.getTime() - off, slotLabel(x, dd, h)]);
  }
  return out;
}
// « jusqu’à demain 14 h », « jusqu’au 17 novembre », « encore 2 h 05 »; « à partir de mercredi 14 h », « à partir du 17 novembre ».
function untilWhen(ts, now = Date.now()) { const w = fmtWhen(ts, now); return w.startsWith('dans ') ? 'encore ' + w.slice(5) : w.startsWith('le ') ? 'jusqu’au ' + w.slice(3) : 'jusqu’à ' + w; }
function fromWhen(ts, now = Date.now()) { const w = fmtWhen(ts, now); return w.startsWith('dans ') ? w : w.startsWith('le ') ? 'à partir du ' + w.slice(3) : 'à partir ' + (/^[aeiouyhàâéè]/i.test(w) ? 'd’' : 'de ') + w; }
const starsTxt = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
const STATE_WORD = { making: 'En fabrication', ready: 'Prêt à lancer', live: 'En vente', paused: 'En pause', gone: 'Retiré' };
function itemState(p, now) {
  if (p.state === 'making') return `En fabrication · ${agr(p, 'prêt', 'prête', 'prêts')} ${fmtWhen(p.readyAt, now)}`;
  if (p.preco && !p.preco.closed) return `Précommandes · ${untilWhen(p.preco.until, now)}`;
  if (p.preco && !p.preco.shipped) return `Commandes en fabrication · livraison ${fmtWhen(p.preco.shipAt, now)}`;
  if (p.state === 'ready' && collabWaits(p)) return 'Attend l’accord de ton duo';
  if (p.state === 'live' && p.mode === 'stock' && !p.stock) return p.restockAt ? `Épuisé · réassort ${fmtWhen(p.restockAt, now)}` : 'Épuisé';
  return STATE_WORD[p.state] || '';
}
function MerchLayer({ g, now, i, l }) {
  const [view, setView] = useState((l && l.view) || 'items');
  const [pre, setPre] = useState(null); // a contest's design, carried to the form
  const S = shopOf(g), shown = shopShown(g).slice().sort((a, b) => (a.state === 'live' ? 0 : 1) - (b.state === 'live' ? 0 : 1) || b.at - a.at);
  const ready = launchable(g), sea = shopSeason(now), nt = shopNextTier(g);
  const revs = shown.filter((p) => p.rev), avg = revs.length ? revs.reduce((n, p) => n + p.rev, 0) / revs.length : 0;
  const go = (v) => { setView(v); const el = document.querySelector('.shop-body'); if (el) el.scrollTop = 0; };
  return html`<${LayerShell} i=${i} title="Ta boutique">
    <div class="shop-head">
      <div class="shop-stats"><span><b>${shopLive(g).length}</b> en vente</span><span><b>${fmtN(S.sold)}</b> ${plural(S.sold, 'vendu', 'vendus')}</span><span><b>${fmtN(S.weekSold)}</b> cette semaine</span>${avg ? html`<span><b>${avg.toFixed(1).replace('.', ',')} ★</b> avis</span>` : null}</div>
      ${sea ? html`<p class="shop-sea">C’est ${sea.label} : tes ventes ×${String(sea.mult).replace('.', ',')}.</p>` : null}
      <${Seg} items=${[['items', 'Tes produits'], ['new', 'Nouveau produit'], ['extras', 'Événements']]} value=${view} onPick=${go} label="Ta boutique" />
    </div>
    <div class="lpad shop-body">
      ${view === 'items' ? html`
        ${ready.length ? html`<div class="shop-launch"><span>🛍️ ${ready.length} ${plural(ready.length, 'produit prêt', 'produits prêts')} : ${ready.map((p) => itemTitle(p)).join(', ')}</span><button class="btn btn-hot btn-sm" onClick=${() => { const L = launchAll(g); if (L) openCompose({ merch: L.id }); }}><${Icon} n="pen" s=${14} /> ${ready.length > 1 ? 'Les lancer ensemble' : 'Le lancer'} avec un post</button></div>` : null}
        ${shown.length ? shown.map((p) => html`<${ShopCard} key=${p.id} g=${g} p=${p} now=${now} />`) : html`<div class="empty"><b>Ta boutique est vide</b><span>Crée ton premier produit.</span><button class="btn btn-hot btn-sm" onClick=${() => go('new')}>Nouveau produit</button></div>`}
        ${nt ? html`<p class="muted shop-next">À ${nfFull.format(nt[0])} abonnés : ${nt[1].toLowerCase()}${shopTierKeys(nt[0]).length > 1 ? ` (${shopTierKeys(nt[0]).map((k) => MERCH[k].label.toLowerCase()).join(', ')})` : ''}.</p>` : null}`
      : view === 'new' ? html`<${NewItemForm} g=${g} now=${now} pre=${pre} done=${() => { setPre(null); go('items'); }} />`
      : html`<${ShopExtras} g=${g} now=${now} pick=${(e) => { setPre(e); go('new'); }} />`}
    </div>
  <//>`;
}
// What taking it off means (what is left on the creator's hands, what was spent for nothing).
function retireText(p) {
  if (p.mode === 'stock' && p.stock && p.launchAt) return `Il te reste ${nfFull.format(p.stock)} ${plural(p.stock, 'pièce : elle reste', 'pièces : elles restent')} sur tes bras.`;
  if (p.launchAt) return agr(p, 'Il ne sera plus en vente.', 'Elle ne sera plus en vente.', 'Ils ne seront plus en vente.');
  const lost = p.mode === 'stock' || MERCH[p.k].line || (MERCH[p.k].book && p.by === 'plume');
  return agr(p, 'Il ne sera jamais mis en vente', 'Elle ne sera jamais mise en vente', 'Ils ne seront jamais mis en vente') + (lost ? ' : ce que tu as avancé est perdu.' : '.');
}
function ShopCard({ g, p, now }) {
  const M = MERCH[p.k], [price, setP] = useState(String(p.price).replace('.', ','));
  const [qty, setQty] = useState(qtysOf(p.k)[1] || qtysOf(p.k)[0]);
  const c = p.collab && g.chars[p.collab.c], law = hasStaff(g, 'avocat');
  const v = Math.round(num(String(price).replace(',', '.')) * 100) / 100, changed = v !== p.price;
  const save = () => { if (setPrice(g, p, v)) { toast(`${itemTitle(p)} : ${fmtMoney(g, v)}.`, 'good'); update(); } else toast(`${M.label} : ${fmtMoney(g, M.min)} au moins.`, 'bad'); };
  return html`<div class=${'mp-card st-' + p.state}>
    <div class="mp-top"><span class="mp-emo" aria-hidden="true">${M.emoji}</span>
      <div class="mp-mid"><b>${itemTitle(p)}${p.limited ? html` <span class="chip">Édition limitée · ${nfFull.format(p.limited)}</span>` : null}</b>
        <small>${[p.name ? M.label : '', p.design ? `« ${p.design} »` : '', madeOf(p)].filter(Boolean).join(' · ')}</small>
        <small>Qualité ${starsTxt(stars(p.q))}${p.rev ? ` · avis ${String(p.rev).replace('.', ',')} ★` : ''}${p.charity ? ` · ${p.charity} % pour ${p.asso || 'une asso'}` : ''}${c ? ` · en duo avec ${c.name.split(' ')[0]}` : ''}${p.credit ? ` · design de @${p.credit}` : ''}</small></div>
      <span class=${'chip' + (p.state === 'live' ? ' good' : '')}>${itemState(p, now)}</span></div>
    <div class="mp-nums"><span>${fmtN(p.sold)} ${plural(p.sold, 'vendu', 'vendus')}${p.mode === 'stock' ? (p.state === 'making' ? ` · ${fmtN(p.made)} en fabrication` : ` · ${fmtN(p.stock || 0)} en stock`) : p.preco ? ` · ${fmtN(p.preco.qty)} ${plural(p.preco.qty, 'commande', 'commandes')}` : ''}</span><span>marge ${fmtMoney(g, marginOf(p))} la pièce</span></div>
    ${p.state !== 'gone' && !(p.preco && p.preco.closed) ? html`<div class="mp-price"><label>Prix <input class="input" inputmode="decimal" value=${price} onInput=${(e) => setP(e.target.value.replace(/[^\d,.]/g, '').slice(0, 12))} onKeyDown=${(e) => { if (e.key === 'Enter' && changed) save(); }} aria-label=${'Prix de ' + itemTitle(p)} /> €</label>${changed ? html`<button class="btn btn-ghost btn-sm" onClick=${save}>Changer le prix</button>` : null}</div>` : null}
    ${p.collab && p.collab.ok !== true && p.state !== 'gone' ? html`<div class="mp-alert"><span>${c && collabOK(g, c) ? `${c.name.split(' ')[0]} doit être d’accord avant le lancement.` : `Le duo avec ${c ? c.name.split(' ')[0] : 'ce perso'} n’est plus possible.`}</span>
      <span class="row">${c && collabOK(g, c) ? html`<button class="btn btn-ghost btn-sm" onClick=${() => { S.drafts.dm[c.id] = collabText(g, p); openDM(c.id); }}>Lui proposer en message</button>` : null}<button class="btn btn-ghost btn-sm" onClick=${() => { if (collabSolo(g, p)) { toast(`${itemTitle(p)} : sans duo, ${agr(p, 'il est', 'elle est', 'ils sont')} à toi seul${px(g, '', 'e', '·e')}.`, 'good'); update(); } }}>Le faire seul${px(g, '', 'e', '·e')}</button></span></div>` : null}
    ${p.fake && p.fake.state !== 'gone' ? html`<div class="mp-alert bad"><span>${p.fake.state === 'on' ? 'Des contrefaçons circulent.' : p.fake.state === 'lawyer' ? 'Ton avocat s’occupe des contrefaçons.' : p.fake.state === 'reported' ? 'Contrefaçons signalées : ça prend du temps.' : 'Tu laisses courir les contrefaçons.'}</span>
      ${p.fake.state === 'on' ? html`<span class="row">${law ? html`<button class="btn btn-ghost btn-sm" onClick=${() => { fakeAction(g, p, 'lawyer'); update(); }}>Ton avocat</button>` : null}<button class="btn btn-ghost btn-sm" onClick=${() => { fakeAction(g, p, 'report'); update(); }}>Les signaler</button><button class="btn btn-ghost btn-sm" onClick=${() => { fakeAction(g, p, 'let'); update(); }}>Laisser faire</button></span>` : null}</div>` : null}
    ${p.state !== 'gone' ? html`<div class="mp-acts">
      ${p.state === 'ready' && !collabWaits(p) ? html`<button class="btn btn-hot btn-sm" onClick=${() => { const L = openDrop(g, [p.id]); if (L) openCompose({ merch: L.id }); }}><${Icon} n="pen" s=${14} /> Lancer avec un post</button>` : null}
      ${p.state === 'live' && !p.preco ? html`<button class="btn btn-ghost btn-sm" onClick=${() => { pauseItem(g, p); update(); }}>Mettre en pause</button>` : null}
      ${p.state === 'paused' && !p.preco ? html`<button class="btn btn-ghost btn-sm" onClick=${() => { resumeItem(g, p); update(); }}>Remettre en vente</button>` : null}
      ${p.mode === 'stock' && p.state !== 'making' && !p.restockAt && !(p.limited && !p.launchAt) ? html`<span class="mp-restock"><select class="input" value=${qty} onChange=${(e) => setQty(+e.target.value)} aria-label=${'Quantité du réassort de ' + itemTitle(p)}>${qtysOf(p.k).map((q) => html`<option key=${q} value=${q}>${nfFull.format(q)} pièces</option>`)}</select>
        <button class="btn btn-ghost btn-sm" onClick=${() => { const why = restockWhy(g, p, qty); if (why) { toast(why, 'bad'); return; } if (restock(g, p, qty)) { toast(`Réassort commandé : ${nfFull.format(qty)} × ${itemTitle(p)}.`, 'good'); update(); } }}>Réassort · ${fmtMoney(g, Math.round(qty * unitCost(p)))}</button></span>` : null}
      ${!p.preco ? html`<button class="linkbtn quiet" onClick=${() => askConfirm({ title: `Retirer ${itemTitle(p)} ?`, text: retireText(p), ok: 'Retirer', danger: true, run: () => { retireItem(g, p); update(); } })}>Retirer</button>` : null}
    </div>` : null}
  </div>`;
}
// A new product: what, made how and where, for how much; what it costs and brings, before deciding.
function NewItemForm({ g, now, pre, done }) {
  const [F, setF] = useState(() => ({ k: tierOpen(g, 'tshirt') ? 'tshirt' : 'stickers', design: pre ? pre.text : '', credit: pre ? pre.by : null, name: '', pitch: '', by: 'toi', mode: 'stock', origin: 'fr', mat: 'coton', print: 'seri', qty: 100, limited: 0, charity: 0, asso: '', collab: null, price: '' }));
  const set = (o) => setF(Object.assign({}, F, o));
  const M = MERCH[F.k], mode = M.line && F.mode === 'pod' ? 'stock' : F.mode;
  const qty = qtysOf(F.k).includes(F.qty) ? F.qty : qtysOf(F.k)[1] || qtysOf(F.k)[0];
  const lim = mode === 'stock' && !M.minQty ? F.limited : 0; // (a drink is made by thousands: no numbered edition)
  const o = Object.assign({}, F, { mode, qty, limited: lim, price: F.price === '' ? Math.round(prodFair(Object.assign({}, F, { mode }))) : num(String(F.price).replace(',', '.')), collab: F.collab });
  const cost = unitCost(o), q = qualityOf(o), up = prodUpfront(o), mg = marginOf(o);
  const days = (M.book ? BOOK_BY[F.by].days : 0) + (M.line ? M.devDays : 0) + (mode === 'stock' ? ORIGINS[F.origin].days[0] : 0);
  const pals = mains(g).filter((c) => collabOK(g, c));
  const pick = (k) => set({ k, price: '', mode: MERCH[k].line && F.mode === 'pod' ? 'stock' : F.mode, qty: qtysOf(k).includes(F.qty) ? F.qty : qtysOf(k)[1] || qtysOf(k)[0] });
  const make = () => { const r = prepItem(g, Object.assign({}, o, { name: F.name, pitch: F.pitch, by: F.by, asso: F.asso, credit: F.credit })); if (!r.ok) { toast(r.why, 'bad'); return; } toast(r.p.state === 'making' ? `${itemTitle(r.p)} : en fabrication, ${agr(r.p, 'prêt', 'prête', 'prêts')} ${fmtWhen(r.p.readyAt)}.` : `${itemTitle(r.p)} ${agr(r.p, 'est prêt : lance-le', 'est prête : lance-la', 'sont prêts : lance-les')} avec un post.`, 'good'); done(); update(); };
  return html`<div class="shop-new">
    ${MERCH_TIERS.slice(0, 5).map(([n, label]) => html`<div class="sn-tier" key=${n}><span class="lbl">${label}${g.stats.followers < n ? html` <span class="muted">· à ${nfFull.format(n)} abonnés</span>` : ''}</span>
      <div class="tr-chips">${shopTierKeys(n).map((k) => html`<button type="button" key=${k} class=${'chip-btn' + (F.k === k ? ' on' : '')} disabled=${!tierOpen(g, k)} onClick=${() => pick(k)}>${MERCH[k].emoji} ${MERCH[k].label}</button>`)}</div></div>`)}
    ${M.book ? html`<div class="field"><label class="lbl" for="sn-name">Titre</label><input id="sn-name" class="input" maxlength="60" value=${F.name} placeholder="ex : Tout le monde me regarde" onInput=${(e) => set({ name: e.target.value })} /></div>
      <div class="field"><label class="lbl" for="sn-pitch">De quoi ça parle</label><textarea id="sn-pitch" class="input" rows="2" maxlength="160" value=${F.pitch} placeholder="ex : mes débuts, ce que personne n’a vu derrière les vidéos" onInput=${(e) => set({ pitch: e.target.value })}></textarea></div>
      <div class="field"><span class="lbl">Qui l’écrit</span><${Seg} items=${Object.keys(BOOK_BY).map((k) => [k, BOOK_BY[k].label + (BOOK_BY[k].fee ? ` · ${fmtMoney(g, BOOK_BY[k].fee)}` : ''), BOOK_BY[k].staff && !hasStaff(g, BOOK_BY[k].staff)])} value=${F.by} onPick=${(v) => set({ by: v })} label="Qui l’écrit" /><small class="muted">${BOOK_BY[F.by].days} jours d’écriture${BOOK_BY.scenariste.staff && !hasStaff(g, 'scenariste') ? ' · un scénariste s’embauche dans ton équipe' : ''}.</small></div>`
    : M.line ? html`<div class="field"><label class="lbl" for="sn-name">Son nom</label><input id="sn-name" class="input" maxlength="60" value=${F.name} placeholder=${F.k === 'parfum' ? 'ex : Minuit Néon' : F.k === 'makeup' ? 'ex : Éclat' : 'ex : Hype Up'} onInput=${(e) => set({ name: e.target.value })} /><small class="muted">Développement : ${M.devDays} jours, ${fmtMoney(g, M.dev)}.</small></div>`
    : html`<div class="field"><label class="lbl" for="sn-design">Ton design</label><input id="sn-design" class="input" maxlength="90" value=${F.design} placeholder="ex : ta phrase culte « on lâche rien » en lettres néon" onInput=${(e) => set({ design: e.target.value, credit: null })} />${F.credit ? html`<small class="muted">Le design de @${F.credit}, gagnant de ton concours.</small>` : null}</div>`}
    <div class="field"><span class="lbl">Fabrication</span><${Seg} items=${Object.keys(MODES).map((k) => [k, MODES[k].label, M.line && k === 'pod'])} value=${mode} onPick=${(v) => set({ mode: v })} label="Fabrication" /><small class="muted">${MODES[mode].note}.</small></div>
    ${mode !== 'pod' ? html`<div class="field"><span class="lbl">Où</span><${Seg} items=${Object.keys(ORIGINS).map((k) => [k, ORIGINS[k].label])} value=${F.origin} onPick=${(v) => set({ origin: v, price: '' })} label="Où le fabriquer" /><small class="muted">${fmtMoney(g, unitCost(Object.assign({}, o, { origin: F.origin })))} la pièce ${ORIGINS[F.origin].in} · ${ORIGINS[F.origin].days[0]} à ${ORIGINS[F.origin].days[1]} jours de fabrication.</small></div>` : null}
    ${M.textile ? html`<div class="field"><span class="lbl">La matière</span><${Seg} items=${Object.keys(MATERIALS).map((k) => [k, MATERIALS[k].label])} value=${F.mat} onPick=${(v) => set({ mat: v, price: '' })} label="La matière" /></div>` : null}
    ${M.print && mode !== 'pod' ? html`<div class="field"><span class="lbl">L’impression</span><${Seg} items=${Object.keys(PRINTS).map((k) => [k, PRINTS[k].label])} value=${F.print} onPick=${(v) => set({ print: v, price: '' })} label="L’impression" /><small class="muted">${PRINTS[F.print].note}.</small></div>` : null}
    ${mode === 'stock' ? html`<div class="field"><span class="lbl">Quantité</span>${lim ? html`<small class="muted">${nfFull.format(lim)} exemplaires numérotés.</small>` : html`<${Seg} items=${qtysOf(F.k).map((n) => [n, nfFull.format(n)])} value=${qty} onPick=${(v) => set({ qty: v })} label="Quantité" />`}
      ${M.minQty ? null : html`<label class="check-card sn-limited"><input type="checkbox" checked=${!!lim} onChange=${(e) => set({ limited: e.target.checked ? 250 : 0 })} /><span><b>Édition limitée numérotée</b><small>Ça part plus vite.</small></span></label>`}
      ${lim ? html`<${Seg} items=${MERCH_LIMITED.map((n) => [n, nfFull.format(n)])} value=${lim} onPick=${(v) => set({ limited: v })} label="Exemplaires" />` : null}</div>` : null}
    <div class="field"><span class="lbl">Pour une asso</span><${Seg} items=${MERCH_CHARITY.map((n) => [n, n ? n + ' %' : 'Non'])} value=${F.charity} onPick=${(v) => set({ charity: v })} label="Part reversée" />
      ${F.charity ? html`<input class="input" maxlength="50" value=${F.asso} placeholder="Laquelle ? ex : un refuge pour animaux" onInput=${(e) => set({ asso: e.target.value })} aria-label="L’asso" />` : null}</div>
    ${pals.length ? html`<div class="field"><span class="lbl">En duo <span class="muted">(facultatif)</span></span><div class="tr-chips"><button type="button" class=${'chip-btn' + (!F.collab ? ' on' : '')} onClick=${() => set({ collab: null })}>Seul${px(g, '', 'e', '·e')}</button>${pals.map((c) => html`<button type="button" key=${c.id} class=${'chip-btn' + (F.collab === c.id ? ' on' : '')} onClick=${() => set({ collab: c.id })}>${c.name.split(' ')[0]}</button>`)}</div>${F.collab ? html`<small class="muted">Vous partagez la marge, ses abonnés le voient passer ; ${g.chars[F.collab].name.split(' ')[0]} doit être d’accord (en message).</small>` : null}</div>` : null}
    <div class="field"><label class="lbl" for="sn-price">Ton prix</label><span class="sn-price"><input id="sn-price" class="input" inputmode="decimal" value=${F.price === '' ? String(o.price) : F.price} onInput=${(e) => set({ price: e.target.value.replace(/[^\d,.]/g, '').slice(0, 12) })} /> €</span>
      <small class="muted">Prix que ta commu trouve juste : ≈ ${fmtMoney(g, Math.round(prodFair(o)))}${o.price < M.min ? ` · ${fmtMoney(g, M.min)} au moins` : ''}.</small></div>
    <div class="sn-sum"><span>${mode === 'pod' ? `${fmtMoney(g, cost)} par pièce imprimée` : `Fabrication : ${fmtMoney(g, cost)} la pièce`}</span><span>Marge : <b class=${mg > 0 ? 'good' : 'bad'}>${fmtMoney(g, mg)}</b> la pièce${F.collab ? ' (ta moitié)' : ''}</span><span>Qualité ${starsTxt(stars(q))}</span>${up ? html`<span>À avancer : <b>${fmtMoney(g, up)}</b></span>` : null}${days ? html`<span>Prêt dans ${days} jours environ</span>` : null}</div>
    <button class="btn btn-hot" disabled=${!(o.price >= M.min) || (up && g.career.cash < up)} onClick=${make}><${Icon} n="cart" s=${16} /> ${days ? 'Lancer la fabrication' : 'Préparer'}${up ? ` · ${fmtMoney(g, up)}` : ''}</button>
    ${up && g.career.cash < up ? html`<small class="muted why-off">Il te manque ${fmtMoney(g, up - g.career.cash)}.</small>` : null}
  </div>`;
}
// The contest, the book signing, the pop-up store, the high seasons.
function ShopExtras({ g, now, pick }) {
  const S = shopOf(g), C = S.contest, book = shopLive(g).find((p) => MERCH[p.k].book), sb = S.signing && shopItems(g).find((x) => x.id === S.signing.p);
  const [sd, setSd] = useState(null), [place, setPlace] = useState(''), [pd, setPd] = useState(null), [city, setCity] = useState('');
  const sdays = shopDays(now, 14), pdays = shopDays(now, 10, 2);
  const big = g.stats.followers >= MERCH_TIERS[5][0], cool = S.popupAt && now - S.popupAt < POPUP.cool * DAY_MS;
  const y = gameDate(now).getFullYear(), bf = blackFriday(y);
  return html`<div class="shop-extras">
    <section class="sx"><h4>🎨 Concours de design</h4>
      ${C && C.state === 'open' ? html`<p class="muted">Les propositions de ta commu : choisis-en une pour ton prochain produit (${untilWhen(C.at + 14 * DAY_MS, now)}).</p>${C.entries.map((e) => html`<div class="sx-entry" key=${e.by}><span><b>@${e.by}</b> « ${e.text} »</span><button class="btn btn-ghost btn-sm" onClick=${() => pick(e)}>Choisir</button></div>`)}
          <button class="linkbtn quiet" onClick=${() => askConfirm({ title: 'Clore le concours sans gagnant ?', text: 'Ceux qui ont proposé un design seront un peu déçus.', ok: 'Clore', run: () => { contestClose(g); update(); } })}>Clore sans choisir</button>`
        : html`<p class="muted">${C && C.state === 'picked' ? `Dernier gagnant : @${C.winner}. ` : ''}Demande des idées de design à ta commu avec un post ; tu choisis la gagnante.</p><button class="btn btn-ghost btn-sm" onClick=${() => openCompose({ contest: true })}><${Icon} n="pen" s=${14} /> Lancer un concours</button>`}
    </section>
    <section class="sx"><h4>📖 Séance de dédicaces</h4>
      ${S.signing && S.signing.state !== 'over' ? html`<p>${S.signing.state === 'on' ? 'En ce moment' : fmtWhen(S.signing.at, now)}, ${S.signing.place}.</p>${sb && sb.state !== 'live' ? html`<small class="muted">${sb.state === 'paused' ? 'Ton livre est en pause : remets-le en vente pour que la séance en vende.' : 'Ton livre n’est plus en vente : la séance n’en vendra pas.'}</small>` : null}`
        : book ? html`<p class="muted">Ton livre « ${book.name} » se vend beaucoup plus le jour de la séance, et tes fans viennent te voir.</p>
          <div class="tr-chips">${sdays.map(([t, lb]) => html`<button type="button" key=${t} class=${'chip-btn' + (sd === t ? ' on' : '')} onClick=${() => setSd(t)}>${lb}</button>`)}</div>
          <input class="input" maxlength="40" value=${place} placeholder="Où ? ex : la grande librairie du centre" onInput=${(e) => setPlace(e.target.value)} aria-label="Où" />
          <button class="btn btn-ghost btn-sm" disabled=${!sd} onClick=${() => { if (planSigning(g, book, sd, place)) { setSd(null); update(); } else toast(`Il faut ${fmtMoney(g, SIGNING_COST)} pour la salle et le déplacement.`, 'bad'); }}>Organiser · ${fmtMoney(g, SIGNING_COST)}</button>`
        : html`<p class="muted">${g.stats.followers < MERCH.livre.tier ? `À ${nfFull.format(MERCH.livre.tier)} abonnés, ton livre.` : 'Une fois ton livre en vente.'}</p>`}
    </section>
    <section class="sx"><h4>🛍️ Pop-up store</h4>
      ${S.popup && S.popup.state !== 'over' ? html`<p>À ${S.popup.city}, ${S.popup.state === 'on' ? 'ouvert en ce moment' : fmtWhen(S.popup.at, now)} (${POPUP.days} jours).</p>`
        : !big ? html`<p class="muted">À ${nfFull.format(MERCH_TIERS[5][0])} abonnés : ta boutique éphémère, ${POPUP.days} jours dans une ville, tes fans en vrai.</p>`
        : cool ? html`<p class="muted">Ton dernier pop-up est encore frais : tu pourras en ouvrir un autre ${fromWhen(S.popupAt + POPUP.cool * DAY_MS, now)}.</p>`
        : !shopLive(g).length ? html`<p class="muted">Il faut des produits en vente.</p>`
        : html`<p class="muted">${POPUP.days} jours : tout ce qui est en vente part bien plus, tes fans te rencontrent.</p>
          <input class="input" maxlength="40" value=${city} placeholder="Quelle ville ?" onInput=${(e) => setCity(e.target.value)} aria-label="Ville" />
          <div class="tr-chips">${pdays.map(([t, lb]) => html`<button type="button" key=${t} class=${'chip-btn' + (pd === t ? ' on' : '')} onClick=${() => setPd(t)}>${lb}</button>`)}</div>
          <button class="btn btn-ghost btn-sm" disabled=${!pd || str(city, 40).length < 2} onClick=${() => { if (planPopup(g, city, pd)) { setPd(null); update(); } else toast(`Il faut ${fmtMoney(g, POPUP.cost)} pour le pop-up.`, 'bad'); }}>Ouvrir · ${fmtMoney(g, POPUP.cost)}</button>`}
    </section>
    <section class="sx"><h4>📅 Les grandes saisons</h4><p class="muted">Halloween (fin octobre), le Black Friday (${bf.getDate()} novembre) et Noël (tout décembre jusqu’au 24) : tes ventes grimpent.</p></section>
  </div>`;
}
