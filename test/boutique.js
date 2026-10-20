// The shop that stays open (after the 0.28.1), end to end, in Chromium against the built hype.html with the mocked
// Claude runtime:
// - it opens at 1 000 subscribers with small things; each tier opens its products (the book at 100 000, the own line at
//   500 000, the pop-up store at 1 000 000);
// - a product: on demand, in stock or in pre-order; where it is made (France, Portugal, Turkey, China: the cost, the
//   quality, the days), the fabric, the printing; the margin and the quality shown before deciding;
// - launched with a post (the AI judges how much people want it), sold for days then a long tail, paid each week;
//   another one launched while the first sells; the price changed, paused, resumed, taken off, restocked at any time;
// - a numbered limited edition; pre-orders (late: complaints); poor quality: the reviews say why; a bad batch;
// - a launch post that claims « fabriqué en France » on a product made elsewhere: a buyer reads the label;
// - counterfeits (the lawyer, reported, let go); a share given to a charity; a duo with a character (who says yes or no
//   in their messages); a design contest with the community; the high seasons; the book and its signing; the own line;
//   the pop-up store; what the AI knows; the drops of before; the window on a phone.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/boutique.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-boutique');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(process.env.PAGE || path.join(ROOT, 'hype.html'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const UMD = fs.readFileSync(process.env.UMD, 'utf8');
const SKELETON = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0}</style></head><body>${body}</body></html>`;

const errors = [];
const checks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let shotN = 0;
const check = (name, ok, info) => { checks.push([ok ? 'PASS' : 'FAIL', name]); console.log(ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)); };
async function shot(page, name) { shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
const G = (page, fn, arg) => page.evaluate(fn, arg);
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.devis); })) await sleep(250); };
async function dismiss(page) { for (let k = 0; k < 8 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }
const txt = (page, sel) => G(page, (s) => { const el = document.querySelector(s); if (!el) return ''; const c = el.cloneNode(true); for (const i of c.querySelectorAll('img.emo')) i.replaceWith(i.alt); return c.textContent.replace(/\s+/g, ' ').trim(); }, sel);

async function newPage(browser, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 700, colorScheme: 'light' });
  await ctx.addInitScript(MOCK);
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith('https://hype.test')) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: SKELETON(PAGE) });
    if (url.includes('cdn.jsdelivr.net/npm/htm@3.1.1/preact/standalone.umd.js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: UMD });
    if (url.includes('fonts.googleapis.com')) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    return route.abort();
  });
  await page.goto('https://hype.test/');
  await page.waitForSelector('text=Nouvelle partie');
  return { ctx, page };
}
async function newGame(page) {
  await page.locator('button', { hasText: 'Nouvelle partie' }).first().click();
  await page.locator('button.world', { hasText: 'Académie Lumen' }).first().click();
  await page.waitForSelector('#pn');
  await page.fill('#pn', 'Mila Flux');
  await page.locator('.seg button', { hasText: /^Elle$/ }).first().click();
  await page.fill('#pi', 'Une créatrice qui teste des potions');
  await page.locator('.tier', { hasText: 'Sans limite' }).first().click();
  await page.check('#p18');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=Qui sera ton premier abonné', { timeout: 20000 });
  await page.locator('.cast-card.pick', { hasText: 'Théo' }).click();
  await page.click('.cast-cta button');
  await page.waitForSelector('.post');
  await sleep(1500);
  await dismiss(page);
}
const shop = async (page, tab) => {
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.S.modals.length = 0; H.update(); });
  await page.waitForFunction(() => !document.querySelector('.layer'), null, { timeout: 5000 }).catch(() => {}); // (the windows of before gone first: their cards are not these)
  await G(page, () => window.__hype.openLayer({ t: 'merch' }));
  await page.waitForSelector('.layer .shop-head');
  if (tab) { await page.locator('.layer .shop-head .seg button', { hasText: tab }).click(); await sleep(250); }
};
async function publishLaunch(page, text, merch) {
  await G(page, (m) => { window.__mockMerch = m; }, merch);
  await page.waitForSelector('#compose', { timeout: 8000 });
  await page.fill('#compose', text);
  await page.locator('.layer', { has: page.locator('#compose') }).locator('.btn-hot', { hasText: /^(Lancer|Publier)/ }).first().click(); // (the composer's own button, not a card's « Lancer avec un post »)
  await page.waitForSelector('.post', { timeout: 15000 });
  await idle(page);
  await sleep(800);
  await dismiss(page);
}

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);
  await G(page, () => { window.__hypeNoGearEvents = true; const H = window.__hype, g = H.S.game; for (const c of H.mains(g, false)) c.unlocked = true; g.career.warmth = 60; });

  // ---------- the tiers ----------
  const tiers = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    g.stats.followers = 500; out.closed = !H.merchOK(g);
    g.stats.followers = 1500; out.open = H.merchOK(g);
    out.small = ['stickers', 'badge', 'porteCles'].every((k) => H.MERCH[k].tier === 1000);
    out.tee = H.prepItem(g, { k: 'tshirt', design: 'logo', price: 25, mode: 'pod' });
    out.ladder = H.MERCH_TIERS.map(([n]) => n);
    out.book = H.MERCH.livre.tier; out.line = ['parfum', 'makeup', 'boisson'].every((k) => H.MERCH[k].tier === 500000);
    return out;
  });
  await G(page, () => { const H = window.__hype; H.goTab('studio'); H.update(); });
  await sleep(300);
  const studio1 = await txt(page, '.boutique');
  check('the shop opens at 1 000 subscribers with small things (stickers, badges, key rings); a t-shirt waits for 10 000; then the hoodies, the book at 100 000, the own line at 500 000, the pop-up store at 1 000 000',
    tiers.closed && tiers.open && tiers.small && !tiers.tee.ok && /10\s000 abonnés/.test(tiers.tee.why) && JSON.stringify(tiers.ladder) === JSON.stringify([1000, 10000, 50000, 100000, 500000, 1000000]) && tiers.book === 100000 && tiers.line
      && /Gérer ta boutique/.test(studio1) && /À 10\s000 abonnés : le textile et les mugs/.test(studio1), { tiers, studio1 });

  // ---------- a first product, on demand, through the window ----------
  await shop(page, 'Nouveau produit');
  await page.locator('.shop-new .chip-btn', { hasText: 'Stickers' }).click();
  await page.fill('#sn-design', 'une fiole qui fait un clin d’œil');
  await page.locator('.shop-new .seg button', { hasText: 'À la demande' }).click();
  await sleep(200);
  const formPod = await txt(page, '.shop-new .sn-sum');
  await shot(page, 'new-stickers');
  await page.locator('.shop-new > .btn-hot').click();
  await sleep(400);
  const made = await G(page, () => { const H = window.__hype, g = H.S.game, p = H.shopItems(g)[0]; return p ? { k: p.k, mode: p.mode, state: p.state, price: p.price, q: p.q, cash: g.career.cash } : null; });
  const cardTxt = await txt(page, '.layer .mp-card');
  const launchTxt = await txt(page, '.layer .shop-launch');
  await shot(page, 'items-ready');
  check('a product on demand: its cost per piece printed, its margin, its quality before deciding; nothing to advance; ready at once, to launch with a post',
    /par pièce imprimée/.test(formPod) && /Marge/.test(formPod) && /Qualité/.test(formPod) && !/À avancer/.test(formPod)
      && made && made.k === 'stickers' && made.mode === 'pod' && made.state === 'ready' && made.price === 6 && /Prêt à lancer/.test(cardTxt) && /1 produit prêt/.test(launchTxt) && /Le lancer avec un post/.test(launchTxt), { formPod, made, cardTxt, launchTxt });

  await page.locator('.layer .shop-launch .btn-hot').click();
  await page.waitForSelector('.merch-hint', { timeout: 8000 });
  const hint = await txt(page, '.merch-hint');
  await publishLaunch(page, 'Mes stickers sont là ! la fiole qui fait un clin d’œil 😉', 4);
  const live = await G(page, () => { const H = window.__hype, g = H.S.game, p = H.shopItems(g)[0]; return { state: p.state, desir: p.desir, launchAt: !!p.launchAt, notif: (g.notifs.find((x) => /En vente dans ta boutique/.test(x.text)) || {}).text || '', prompt: window.__prompts.some((x) => /LANCE DU MERCH/.test(x) && /pack de stickers à 6/.test(x) && /imprimé à la demande/.test(x)) }; });
  check('launched with a post: the composer says what it launches; the AI is told what it is, the price, how it is made, and judges how much people want it (here 4 out of 5)',
    /Ton post lance tes stickers/.test(hint) && /stickers à 6/.test(hint) && live.state === 'live' && live.desir === 4 && live.launchAt && /En vente dans ta boutique/.test(live.notif) && live.prompt, { hint, live });

  // ---------- selling: the spotlight, then a long tail; paid each week ----------
  const sales = await G(page, () => {
    const H = window.__hype, g = H.S.game, p = H.shopItems(g)[0], S = H.shopOf(g), day = 86400000, out = {};
    g.stats.followers = 8000;
    const t0 = p.launchAt, cash0 = g.career.cash, perDay = [];
    for (let k = 1; k <= 60; k++) { const s0 = p.sold; H.tickMerch(g, t0 + k * day + 3600000); perDay.push(p.sold - s0); }
    out.first = perDay.slice(0, 7).reduce((a, b) => a + b, 0); out.month2 = perDay.slice(30, 60).reduce((a, b) => a + b, 0) / 30 * 7;
    out.sold = p.sold; out.paid = Math.round((g.career.cash - cash0) * 100) / 100; out.revenue = p.revenue;
    out.notif = (g.notifs.find((x) => /Ta boutique : .* cette semaine/.test(x.text)) || {}).text || '';
    out.tail = p.state === 'live'; out.rev = p.rev;
    out.ctx = H.merchCtx(g);
    return out;
  });
  check('the orders: many the first week, then a long, slow tail (still on sale two months later); paid each week (less the printing on demand and 3 % of fees); reviews once ten are sold; the AI knows what is on sale',
    sales.first > 0 && sales.month2 > 0 && sales.month2 < sales.first && sales.tail && sales.paid > 0 && sales.paid < sales.revenue && /pièces? vendues? cette semaine/.test(sales.notif) && sales.rev >= 1 && /Sa boutique de merch : stickers à 6/.test(sales.ctx), sales);

  // ---------- in stock: where, the fabric, the printing ----------
  await G(page, () => { const H = window.__hype, g = H.S.game; g.stats.followers = 60000; g.career.cash = 20000; H.update(); });
  await shop(page, 'Nouveau produit');
  await page.locator('.shop-new .chip-btn', { hasText: 'T-shirt' }).click();
  await page.fill('#sn-design', 'Potion Club, en lettres néon');
  await page.locator('.shop-new .seg button', { hasText: 'En stock' }).click();
  const picks = {};
  for (const [o, m, pr] of [['France', '100 % coton bio', 'Sérigraphie'], ['Chine', '100 % polyester', 'Transfert']]) {
    await page.locator('.shop-new .seg button', { hasText: o }).click();
    await page.locator('.shop-new .seg button', { hasText: m }).click();
    await page.locator('.shop-new .seg button', { hasText: pr }).click();
    await sleep(150);
    picks[o] = await txt(page, '.shop-new .sn-sum');
  }
  await shot(page, 'new-tshirt-china');
  await page.locator('.shop-new .seg button', { hasText: '250' }).first().click();
  await sleep(150);
  const sum250 = await txt(page, '.shop-new .sn-sum');
  await page.locator('.shop-new > .btn-hot').click();
  await sleep(400);
  const tee = await G(page, () => { const H = window.__hype, g = H.S.game, p = H.shopItems(g).find((x) => x.k === 'tshirt'); return p ? { state: p.state, origin: p.origin, mat: p.mat, print: p.print, unit: H.unitCost(p), q: p.q, days: Math.round((p.readyAt - p.at) / 86400000), stock: p.stock, cash: g.career.cash, ledger: (g.career.ledger || []).slice(-1)[0] } : null; });
  const costs = await G(page, () => { const H = window.__hype; const o = (origin, mat, print) => ({ k: 'tshirt', mode: 'stock', origin, mat, print }); return { fr: H.unitCost(o('fr', 'bio', 'seri')), frq: H.qualityOf(o('fr', 'bio', 'seri')), pt: H.unitCost(o('pt', 'coton', 'seri')), tr: H.unitCost(o('tr', 'coton', 'seri')), cn: H.unitCost(o('cn', 'poly', 'transfert')), cnq: H.qualityOf(o('cn', 'poly', 'transfert')), pod: H.unitCost({ k: 'tshirt', mode: 'pod', mat: 'coton' }) }; });
  check('in stock: France the dearest and the best (21,25 € a t-shirt in organic cotton, screen-printed: ★★★★★), China the cheapest and the worst (2,10 € in polyester, transfer: ★); paid now (250 × 2,10 €), made in 18 to 28 days',
    costs.fr === 21.25 && costs.frq === 1 && costs.pt === 9 && costs.tr === 6 && costs.cn === 2.1 && costs.cnq < 0.3 && costs.pod === 12
      && /21,25/.test(picks.France) && /★★★★★/.test(picks.France) && /2,10/.test(picks.Chine) && /★☆☆☆☆/.test(picks.Chine) && /À avancer : 525/.test(sum250)
      && tee && tee.state === 'making' && tee.origin === 'cn' && tee.mat === 'poly' && tee.print === 'transfert' && tee.stock === 250 && tee.days >= 18 && tee.days <= 28 && tee.cash === 20000 - 525, { costs, picks, sum250, tee });

  // made, ready (told); launched with a post that claims « fabriqué en France »
  const ready = await G(page, () => { const H = window.__hype, g = H.S.game, p = H.shopItems(g).find((x) => x.k === 'tshirt'); H.tickMerch(g, p.readyAt + 1000); return { state: p.state, notif: (g.notifs.find((x) => /pièces fabriquées en Chine/.test(x.text)) || {}).text || '' }; });
  check('made in its country\'s days, then ready: the player is told', ready.state === 'ready' && /250 pièces fabriquées en Chine, livrées/.test(ready.notif), ready);
  await shop(page);
  await page.locator('.layer .shop-launch .btn-hot').click();
  await publishLaunch(page, 'Le t-shirt Potion Club est là, fabriqué en France avec amour 🔥', 3);
  const claim = await G(page, () => { const H = window.__hype, g = H.S.game, p = H.shopItems(g).find((x) => x.k === 'tshirt'); return { state: p.state, claim: p.claim, ctx: H.merchCtx(g), stickers: H.shopItems(g)[0].state }; });
  check('the shop stays open: a second product launched while the first still sells; the post claims « fabriqué en France » on a t-shirt made in China: kept (the AI knows the claim, not the truth)',
    claim.state === 'live' && claim.stickers === 'live' && claim.claim === 'fr' && /annoncé « fabriqué en France »/.test(claim.ctx) && !/fabriqué en Chine/.test(claim.ctx), claim);

  // ---------- the price, a pause, a restock, at any time ----------
  await shop(page);
  const teeCard = page.locator('.layer .mp-card', { hasText: 'Potion Club' });
  await teeCard.locator('.mp-price input').fill('29,90');
  await sleep(200);
  await shot(page, 'price-typed');
  await teeCard.locator('.mp-price .btn').click({ timeout: 8000 });
  await sleep(300);
  await teeCard.locator('.btn', { hasText: 'Mettre en pause' }).click();
  await sleep(200);
  const paused = await G(page, () => { const H = window.__hype, g = H.S.game, p = H.shopItems(g).find((x) => x.k === 'tshirt'); const s0 = p.sold; H.tickMerch(g, Date.now() + 2 * 86400000); return { price: p.price, state: p.state, sold: p.sold - s0 }; });
  await teeCard.locator('.btn', { hasText: 'Remettre en vente' }).click();
  await sleep(200);
  const resumed = await G(page, () => { const H = window.__hype, g = H.S.game, p = H.shopItems(g).find((x) => x.k === 'tshirt'); return p.state; });
  check('at any time, without stopping anything: the price changed (29,90 €), paused (no orders while paused), back on sale', paused.price === 29.9 && paused.state === 'paused' && paused.sold === 0 && resumed === 'live', { paused, resumed });

  // ---------- what the post claimed: a buyer reads the label ----------
  const exposed = await G(page, () => {
    const H = window.__hype, g = H.S.game, p = H.shopItems(g).find((x) => x.k === 'tshirt'), out = {};
    const f0 = g.stats.followers, cred0 = g.stats.rep4.cred, w0 = g.career.warmth, r = Math.random;
    p.sold = Math.max(p.sold, 40);
    Math.random = () => 0; // (the label read today)
    try { H.tickMerch(g, Date.now() + 3 * 86400000); } finally { Math.random = r; }
    out.at = !!p.exposedAt; out.bb = H.playerBadBuzz(g); out.lost = f0 - g.stats.followers; out.cred = g.stats.rep4.cred < cred0; out.warm = g.career.warmth < w0;
    out.notif = (g.notifs.find((x) => /lu l’étiquette/.test(x.text)) || {}).text || '';
    out.post = g.posts.some((x) => /annoncé « fabriqué en France »/.test(x.text || ''));
    out.ctx = H.merchCtx(g);
    return out;
  });
  check('sooner or later, a buyer reads the label: « Made in China »; a bad buzz (followers, credibility, the community), the network talks about it, and the AI knows now',
    exposed.at && exposed.bb && exposed.lost > 0 && exposed.cred && exposed.warm && /pas fabriqué en France/.test(exposed.notif) && exposed.post && /faux « fabriqué en France » a été découvert/.test(exposed.ctx), exposed);

  // ---------- a numbered limited edition; made again, the buyers feel cheated ----------
  const limited = await G(page, () => {
    const H = window.__hype, g = H.S.game, day = 86400000, out = {};
    H.shopOf(g).day = H.gameDay(Date.now()); g.career.cash = 50000; g.career.warmth = 60;
    const r = H.prepItem(g, { k: 'cap', design: 'la casquette numérotée de l’académie', price: 30, mode: 'stock', origin: 'pt', limited: 100 });
    out.ok = r.ok; const p = r.p; out.stock = p.stock; out.limited = p.limited;
    H.tickMerch(g, p.readyAt + 1000);
    H.shopOf(g).day = H.gameDay(Date.now());
    H.launchDrop(g, { items: [p] }, 4, null, Date.now());
    for (let k = 1; k <= 40 && p.stock > 0; k++) H.tickMerch(g, p.launchAt + k * day + 3600000);
    out.out = p.stock === 0; out.notif = (g.notifs.find((x) => /Ton édition limitée est épuisée/.test(x.text)) || {}).text || '';
    const w0 = g.career.warmth, c0 = g.stats.rep4.cred;
    out.restock = H.restock(g, p, 100); out.betrayed = p.betrayed; out.warm = g.career.warmth < w0; out.cred = g.stats.rep4.cred < c0;
    out.notif2 = (g.notifs.find((x) => /revient en stock/.test(x.text)) || {}).text || '';
    out.trig = (g.triggers || []).some((x) => /édition limitée numérotée/.test(x.text));
    out.arrives = !!p.restockAt; H.tickMerch(g, p.restockAt + 1000); out.back = p.made === 200 && (g.notifs.some((x) => /Réassort livré : ta casquette est de nouveau en stock/.test(x.text)));
    return out;
  });
  check('a numbered limited edition: as many as numbered (100), sold out (told); made again, those who bought it feel cheated (the community, credibility, the network talks); the restock arrives in its country\'s days',
    limited.ok && limited.stock === 100 && limited.limited === 100 && limited.out && /édition limitée est épuisée/.test(limited.notif) && limited.restock && limited.betrayed && limited.warm && limited.cred && /revient en stock/.test(limited.notif2) && limited.trig && limited.arrives && limited.back, limited);

  // ---------- pre-orders: nothing ahead; ten days of orders; made (paid then); late: complaints ----------
  const preco = await G(page, () => {
    const H = window.__hype, g = H.S.game, day = 86400000, out = {};
    H.shopOf(g).day = H.gameDay(Date.now());
    const c0 = g.career.cash;
    const r = H.prepItem(g, { k: 'sweat', design: 'le sweat de l’internat', price: 49, mode: 'preco', origin: 'cn', mat: 'coton', print: 'seri' });
    out.ok = r.ok; out.ahead = c0 - g.career.cash; out.state = r.p.state;
    const p = r.p; H.launchDrop(g, { items: [p] }, 4, null, Date.now());
    for (let k = 1; k <= 9; k++) H.tickMerch(g, p.launchAt + k * day + 3600000);
    out.orders = p.preco.qty; out.open = !p.preco.closed;
    const c1 = g.career.cash, rnd = Math.random; Math.random = () => 0; // (late, this time)
    try { H.tickMerch(g, p.preco.until + 1000); } finally { Math.random = rnd; }
    out.closed = p.preco.closed; out.paid = Math.round(c1 - g.career.cash); out.cost = Math.round(out.orders * H.unitCost(p)); out.late = !!p.preco.lateAt;
    const w0 = g.career.warmth;
    H.tickMerch(g, p.preco.lateAt + 1000);
    out.lateNotif = (g.notifs.find((x) => /précommandes .* sont en retard/.test(x.text)) || {}).text || ''; out.warm = g.career.warmth < w0;
    H.tickMerch(g, p.preco.shipAt + 1000);
    out.shipped = p.preco.shipped; out.done = (g.notifs.find((x) => /précommandes sont livrées/.test(x.text)) || {}).text || '';
    return out;
  });
  check('pre-orders: nothing to advance, ready at once; ten days of orders; closed, what was ordered is made (paid then); late this time: the buyers grow impatient, some are refunded; then delivered',
    preco.ok && preco.ahead === 0 && preco.state === 'ready' && preco.orders > 0 && preco.open && preco.closed && preco.paid >= preco.cost && preco.late && /sont en retard/.test(preco.lateNotif) && preco.warm && preco.shipped && /livrées/.test(preco.done), preco);

  // ---------- quality: the reviews say why; a bad batch ----------
  const quality = await G(page, () => {
    const H = window.__hype, g = H.S.game, day = 86400000, out = {};
    H.shopOf(g).day = H.gameDay(Date.now());
    const r = H.prepItem(g, { k: 'tote', design: 'tote bag pas cher', price: 12, mode: 'stock', origin: 'cn', mat: 'poly', print: 'transfert', qty: 500 });
    const p = r.p; p.bad = false; H.tickMerch(g, p.readyAt + 1000);
    H.shopOf(g).day = H.gameDay(Date.now());
    H.launchDrop(g, { items: [p] }, 4, null, Date.now());
    for (let k = 1; k <= 12; k++) H.tickMerch(g, p.launchAt + k * day + 3600000);
    out.sold = p.sold; out.complained = p.complained; out.notif = (g.notifs.find((x) => /Les avis sur ton tote bag/.test(x.text)) || {}).text || '';
    out.refunds = p.refunds > 0; out.rev = p.rev;
    H.shopOf(g).day = H.gameDay(Date.now()); // (the days played above were in the future)
    const r2 = H.prepItem(g, { k: 'mug', design: 'mug fêlé', price: 15, mode: 'pod' });
    const m = r2.p; m.bad = true; H.launchDrop(g, { items: [m] }, 4, null, Date.now());
    for (let k = 1; k <= 7; k++) H.tickMerch(g, m.launchAt + k * day + 3600000);
    out.badAt = !!m.badAt; out.badNotif = (g.notifs.find((x) => /se plaignent de ton mug/.test(x.text)) || {}).text || '';
    return out;
  });
  check('a poor product (China, polyester, transfer): after its first week, the reviews say why (« ça gratte », the printing cracks), some pieces come back; a bad batch: complaints and refunds',
    quality.sold >= 30 && quality.complained && /ça gratte/.test(quality.notif) && /craquelle/.test(quality.notif) && quality.refunds && quality.rev <= 2.5 && quality.badAt && /se plaignent de ton mug/.test(quality.badNotif), quality);

  // ---------- counterfeits ----------
  const law = await G(page, () => { const H = window.__hype, g = H.S.game; g.career.cash = 80000; const c = H.addCandidate(g, 'avocat', { tier: 1, name: 'Agnès Morel', g: 'f' }); if (c) H.hireStaff(g, c); const p = H.shopItems(g).find((x) => x.k === 'stickers'); H.counterfeit(g, p, Date.now()); H.update(); return { fake: p.fake && p.fake.state, staff: !!H.hasStaff(g, 'avocat') }; });
  await shop(page);
  const fakeCard = page.locator('.layer .mp-card', { hasText: 'clin d’œil' });
  const fakeTxt = (await fakeCard.locator('.mp-alert').textContent()).replace(/\s+/g, ' ');
  await fakeCard.locator('.btn', { hasText: 'Ton avocat' }).click();
  await sleep(200);
  const won = await G(page, () => { const H = window.__hype, g = H.S.game, p = H.shopItems(g).find((x) => x.k === 'stickers'); const st = p.fake.state, c0 = g.career.cash; H.tickMerch(g, p.fake.until + 1000); return { st, gone: p.fake.state === 'gone', damages: Math.round(g.career.cash - c0), notif: (g.notifs.slice().reverse().find((x) => /contrefaçons de tes stickers ont disparu/.test(x.text)) || {}).text || '' }; });
  check('a product that sells gets copied (told, the card says so): your lawyer gets them taken down in days, with damages', law.fake === 'on' && law.staff && /Des contrefaçons circulent/.test(fakeTxt) && /Les signaler/.test(fakeTxt) && won.st === 'lawyer' && won.gone && won.damages > 0 && /dommages et intérêts/.test(won.notif), { law, fakeTxt, won });

  // ---------- a share given to a charity ----------
  const give = await G(page, () => {
    const H = window.__hype, g = H.S.game, day = 86400000, out = {};
    H.shopOf(g).day = H.gameDay(Date.now()); H.shopOf(g).payAt = Date.now() + 7 * day; // (the weeks played above were in the future)
    const w0 = g.career.warmth, k0 = g.stats.rep4.kind;
    const r = H.prepItem(g, { k: 'badge', design: 'badge solidaire', price: 8, mode: 'pod', charity: 25, asso: 'un refuge pour chats' });
    out.margin = H.marginOf(r.p); out.plain = H.marginOf(Object.assign({}, r.p, { charity: 0 }));
    H.launchDrop(g, { items: [r.p] }, 3, null, Date.now());
    out.warm = g.career.warmth > w0; out.kind = g.stats.rep4.kind > k0;
    out.prompt = H.merchLine(g, { items: [r.p] }).includes('25 % reversés à un refuge pour chats');
    for (let k = 1; k <= 8; k++) H.tickMerch(g, r.p.launchAt + k * day + 3600000);
    out.notif = (g.notifs.slice().reverse().find((x) => /reversés/.test(x.text)) || {}).text || '';
    return out;
  });
  check('a share given to a charity: a smaller margin, the community warms at the launch (and the kindness), the AI is told, the weekly payout says what was given',
    give.margin < give.plain && give.warm && give.kind && give.prompt && /reversés/.test(give.notif), give);

  // ---------- a duo with a character: they say yes or no in their messages ----------
  await G(page, () => { const H = window.__hype, g = H.S.game, t = H.charByHandle(g, 'theo.marlin'); t.rel = 45; g.stats.followers = 60000; H.update(); });
  await shop(page, 'Nouveau produit');
  await page.locator('.shop-new .chip-btn', { hasText: 'Mug' }).click();
  await page.fill('#sn-design', 'le mug des deux fêlés');
  await page.locator('.shop-new .seg button', { hasText: 'À la demande' }).click();
  await page.locator('.shop-new .chip-btn', { hasText: /^Théo$/ }).click();
  await sleep(150);
  const duoForm = await txt(page, '.shop-new');
  await page.locator('.shop-new > .btn-hot').click();
  await sleep(300);
  const duoCard = page.locator('.layer .mp-card', { hasText: 'deux fêlés' });
  const waitTxt = (await duoCard.textContent()).replace(/\s+/g, ' ');
  await duoCard.locator('.btn', { hasText: 'Lui proposer en message' }).click();
  await page.waitForSelector('.layer textarea', { timeout: 8000 });
  await sleep(300);
  const pre = await G(page, () => { const t = [...document.querySelectorAll('.layer textarea')].pop(); return t ? t.value : ''; });
  await page.locator('.layer .dm-send, .layer button[aria-label="Envoyer"]').last().click().catch(async () => { await page.keyboard.press('Enter'); });
  await idle(page);
  await sleep(1500);
  const duo = await G(page, () => { const H = window.__hype, g = H.S.game, p = H.shopItems(g).find((x) => x.design === 'le mug des deux fêlés'); return { ok: p.collab && p.collab.ok, launchable: H.launchable(g).includes(p), notif: (g.notifs.find((x) => /partant.? pour votre merch en duo/.test(x.text)) || {}).text || '', prompt: window.__prompts.some((x) => /MERCH EN DUO/.test(x)), margin: H.marginOf(p), solo: H.marginOf(Object.assign({}, p, { collab: null })) }; });
  check('a duo with a character the player gets along with: their half of the margin shown; they must agree first, in their messages (the message is written for the player); the AI is told and answers yes here: the mug can be launched',
    /ta moitié/.test(duoForm) && /doit être d’accord/.test(waitTxt) && /merch ensemble/.test(pre) && duo.prompt && duo.ok === true && duo.launchable && /partant/.test(duo.notif) && Math.abs(duo.margin * 2 - duo.solo) < 0.02, { duoForm: duoForm.slice(-200), waitTxt: waitTxt.slice(0, 160), pre, duo });
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.update(); });

  // ---------- a design contest with the community ----------
  await shop(page, 'Événements');
  await page.locator('.layer .sx .btn', { hasText: 'Lancer un concours' }).click();
  await page.waitForSelector('.merch-hint', { timeout: 8000 });
  const cHint = await txt(page, '.merch-hint');
  await publishLaunch(page, 'Concours ! proposez-moi le design de mon prochain merch 🎨', 3);
  const contest = await G(page, () => { const H = window.__hype, g = H.S.game, C = H.shopOf(g).contest; return C ? { state: C.state, by: C.entries.map((e) => e.by), prompt: window.__prompts.some((x) => /CONCOURS DE DESIGN/.test(x)) } : null; });
  await shop(page, 'Événements');
  await shot(page, 'contest-entries');
  await page.locator('.layer .sx-entry', { hasText: 'lilou_dessine' }).locator('.btn').click();
  await sleep(250);
  const pickedForm = await G(page, () => ({ design: (document.getElementById('sn-design') || {}).value, note: (document.querySelector('.shop-new .field small') || {}).textContent || '' }));
  await page.locator('.shop-new .chip-btn', { hasText: 'Stickers' }).click();
  await page.locator('.shop-new .seg button', { hasText: 'À la demande' }).click();
  await page.locator('.shop-new > .btn-hot').click();
  await sleep(300);
  const won2 = await G(page, () => { const H = window.__hype, g = H.S.game, C = H.shopOf(g).contest, p = H.shopItems(g).find((x) => x.credit === 'lilou_dessine'); return { state: C.state, winner: C.winner, p: !!p, notif: (g.notifs.find((x) => /gagne ton concours/.test(x.text)) || {}).text || '', regular: !!(g.npcs.lilou_dessine && g.npcs.lilou_dessine.regular) }; });
  check('a design contest: a post asks the community; three fans answer with a design (never a main character); one is picked: the form takes it, the product credits the fan, the community loves it, the fan becomes a regular',
    /concours de design/.test(cHint) && contest && contest.state === 'open' && contest.prompt && contest.by.length === 3 && !contest.by.includes('theo.marlin') && contest.by.includes('lilou_dessine')
      && /luciole en néon violet/.test(pickedForm.design) && /@lilou_dessine/.test(pickedForm.note) && won2.state === 'picked' && won2.winner === 'lilou_dessine' && won2.p && /gagne ton concours/.test(won2.notif) && won2.regular, { cHint, contest, pickedForm, won2 });

  // ---------- the high seasons ----------
  const seasons = await G(page, () => {
    const H = window.__hype, off = H.clockOff(), at = (y, m, d) => new Date(y, m, d, 12).getTime() - off;
    const y = new Date(Date.now() + off).getFullYear();
    const w = (t) => { const s = H.shopSeason(t); return s ? s.k + ':' + s.mult : 'none'; };
    return { bf: w(at(y, 10, 27)), noel: w(at(y, 11, 10)), after: w(at(y, 11, 26)), hall: w(at(y, 9, 30)), july: w(at(y, 6, 1)) };
  });
  check('the high seasons: Halloween (×1,15), Black Friday (×1,8), Christmas until the 24th (×1,7); none in July', seasons.hall === 'halloween:1.15' && seasons.bf === 'bf:1.8' && seasons.noel === 'noel:1.7' && seasons.after === 'none' && seasons.july === 'none', seasons);

  // ---------- the book (100 000) and its signing ----------
  const book = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    g.stats.followers = 120000; g.career.cash = 60000; H.shopOf(g).day = H.gameDay(Date.now());
    out.noTitle = H.prepItem(g, { k: 'livre', price: 20, mode: 'stock', origin: 'pt' }).why;
    out.noWriter = H.prepItem(g, { k: 'livre', name: 'Tout le monde me regarde', pitch: 'mes débuts, ce que personne n’a vu', by: 'scenariste', price: 20, mode: 'stock', origin: 'pt' }).why;
    const c0 = g.career.cash;
    const r = H.prepItem(g, { k: 'livre', name: 'Tout le monde me regarde', pitch: 'mes débuts, ce que personne n’a vu derrière les vidéos', by: 'plume', price: 20, mode: 'stock', origin: 'pt', qty: 1000 });
    out.ok = r.ok; out.paid = Math.round(c0 - g.career.cash); out.expect = 6000 + Math.round(1000 * H.unitCost(r.p)); out.days = Math.round((r.p.readyAt - Date.now()) / 86400000);
    H.tickMerch(g, r.p.readyAt + 1000); out.ready = r.p.state; out.notif = (g.notifs.find((x) => /Ton livre « Tout le monde me regarde » est écrit et imprimé/.test(x.text)) || {}).text || '';
    out.line = H.merchLine(g, { items: [r.p] });
    return out;
  });
  check('the book: a title and what it is about; written by the player, the scriptwriter of the team (needed) or a ghost writer (6 000 €); written then printed (in stock: the printing paid now), then ready; the AI judges the book (« LANCE SON LIVRE », its title, what it is about)',
    /titre/.test(book.noTitle) && /scénariste/.test(book.noWriter) && book.ok && book.paid === book.expect && book.days >= 17 && book.days <= 21 && book.ready === 'ready' && /écrit et imprimé/.test(book.notif) && /LANCE SON LIVRE/.test(book.line) && /mes débuts/.test(book.line), book);
  await shop(page);
  await page.locator('.layer .mp-card', { hasText: 'Tout le monde me regarde' }).locator('.btn', { hasText: 'Lancer avec un post' }).click();
  await page.waitForSelector('.merch-hint', { timeout: 8000 });
  const bookTitle = await G(page, () => { const h = [...document.querySelectorAll('.layer h2')].pop(); return h ? h.textContent : ''; });
  await publishLaunch(page, 'Mon livre sort aujourd’hui 📖', 5);
  await shop(page, 'Événements');
  await page.locator('.layer .sx', { hasText: 'Séance de dédicaces' }).locator('.chip-btn').first().click();
  await page.locator('.layer .sx', { hasText: 'Séance de dédicaces' }).locator('input').fill('la grande librairie du centre');
  await page.locator('.layer .sx', { hasText: 'Séance de dédicaces' }).locator('.btn').click();
  await sleep(250);
  const signing = await G(page, () => {
    const H = window.__hype, g = H.S.game, S = H.shopOf(g), p = H.shopItems(g).find((x) => x.k === 'livre'), out = { live: p.state, desir: p.desir, planned: S.signing && S.signing.state };
    const w0 = g.career.warmth; H.tickMerch(g, S.signing.at + 1000); out.on = S.signing.state; out.warm = g.career.warmth > w0;
    out.notif = (g.notifs.find((x) => /Ta séance de dédicaces commence/.test(x.text)) || {}).text || '';
    H.tickMerch(g, S.signing.end + 1000); out.over = S.signing.state;
    return out;
  });
  check('the book launched with a post (« Lancer ton livre »); a signing planned (a day, a place, 400 €): its day, the fans come (the community warms), then it is over',
    /Lancer ton livre/.test(bookTitle) && signing.live === 'live' && signing.desir === 5 && signing.planned === 'planned' && signing.on === 'on' && signing.warm && /la grande librairie du centre/.test(signing.notif) && signing.over === 'over', { bookTitle, signing });

  // ---------- the own line (500 000) and the pop-up store (1 000 000) ----------
  const line = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    g.stats.followers = 600000; g.career.cash = 100000;
    const c0 = g.career.cash;
    const r = H.prepItem(g, { k: 'parfum', name: 'Minuit Néon', price: 45, mode: 'pod', origin: 'fr', qty: 500 });
    out.ok = r.ok; out.mode = r.p.mode; out.paid = Math.round(c0 - g.career.cash); out.expect = 15000 + Math.round(500 * H.unitCost(r.p));
    out.days = Math.round((r.p.readyAt - Date.now()) / 86400000);
    const d = H.prepItem(g, { k: 'boisson', name: 'Hype Up', price: 3, mode: 'stock', origin: 'fr', qty: 1000 }); out.drink = d.ok ? 'made' : d.why;
    return out;
  });
  check('the own line: developed first (a perfume: 15 000 € and 21 days), never on demand (made in stock), then made in its country; a drink only by the thousands',
    line.ok && line.mode === 'stock' && line.paid === line.expect && line.days >= 25 && line.days <= 28 && /5\s000 pièces au moins/.test(line.drink), line);
  await G(page, () => { const H = window.__hype, g = H.S.game; g.stats.followers = 1200000; g.career.cash = 100000; H.update(); });
  await shop(page, 'Événements');
  await page.locator('.layer .sx', { hasText: 'Pop-up store' }).locator('input').fill('Lyon');
  await page.locator('.layer .sx', { hasText: 'Pop-up store' }).locator('.chip-btn').first().click();
  await page.locator('.layer .sx', { hasText: 'Pop-up store' }).locator('.btn').click();
  await sleep(250);
  await shot(page, 'popup-planned');
  const popup = await G(page, () => {
    const H = window.__hype, g = H.S.game, S = H.shopOf(g), day = 86400000, out = { planned: S.popup && S.popup.state, city: S.popup && S.popup.city };
    S.day = H.gameDay(S.popup.at) - 1;
    const p = H.shopItems(g).find((x) => x.k === 'stickers'), k0 = H.sellProd ? 0 : 0;
    const w0 = g.career.warmth; H.tickMerch(g, S.popup.at + 1000); out.on = S.popup.state; out.warm = g.career.warmth > w0;
    for (let k = 1; k <= 3; k++) H.tickMerch(g, S.popup.at + k * day + 1000);
    out.over = S.popup.state; out.notif = (g.notifs.find((x) => /pop-up store à Lyon ferme/.test(x.text)) || {}).text || '';
    out.again = H.planPopup(g, 'Paris', Date.now() + 5 * day);
    return out;
  });
  check('the pop-up store: a city, three days, 25 000 €; open: the fans come; closed: what it sold; not another one right away',
    popup.planned === 'planned' && popup.city === 'Lyon' && popup.on === 'on' && popup.warm && popup.over === 'over' && /pièces? vendues?/.test(popup.notif) && popup.again === false, popup);

  // ---------- the drops of before ----------
  const old = await G(page, () => {
    const H = window.__hype, g = H.S.game, keep = g.career.shop, t = Date.now();
    delete g.career.shop;
    g.career.merch = { drops: [{ state: 'done', sold: 40, revenue: 900, items: [] }, { id: 'md1', state: 'live', at: t, design: 'logo luciole', maker: 'atelier', cost: 500, revenue: 300, sold: 12, pend: 120, weekSold: 12, launchAt: t - 86400000, desir: 4, payAt: t + 86400000, items: [{ k: 'tshirt', price: 25, stock: 40, made: 50, sold: 10 }, { k: 'mug', price: 15, stock: 8, made: 10, sold: 2 }] }] };
    const S = H.shopOf(g), out = { n: S.items.length, states: S.items.map((p) => p.state + ':' + p.k + ':' + p.mode + ':' + p.origin + ':' + p.stock), sold: S.sold, pend: S.pend, old: g.career.merch === undefined };
    g.career.shop = keep;
    return out;
  });
  check('a game from before: its drop on sale becomes products of the shop (made in France for the workshop, their stock, their sales), nothing lost',
    old.n === 2 && old.states.join() === 'live:tshirt:stock:fr:40,live:mug:stock:fr:8' && old.sold === 52 && old.pend === 120 && old.old, old);

  // ---------- the window on a phone ----------
  await page.setViewportSize({ width: 390, height: 844 });
  const over = [];
  for (const tab of ['Tes produits', 'Nouveau produit', 'Événements']) {
    await shop(page, tab);
    await sleep(250);
    over.push(await G(page, (t) => { const w = window.innerWidth, bad = [...document.querySelectorAll('.layer .shop-body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > w + 1 || r.left < -1); }).slice(0, 3).map((e) => e.className || e.tagName); return t + ':' + (bad.join('|') || 'ok'); }, tab));
    await shot(page, 'phone-' + tab.replace(/\s/g, '-'));
  }
  check('on a phone (390 pixels), the three views of the shop stay inside the screen', over.every((x) => /:ok$/.test(x)), over);

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  console.log(`\n${checks.filter((c) => c[0] === 'PASS').length}/${checks.length} PASS`);
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
