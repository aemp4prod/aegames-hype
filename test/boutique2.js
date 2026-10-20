// The shop, hunted for bugs (after the 0.28.1), in Chromium against the built hype.html with the mocked Claude runtime:
// - nothing ready: nothing to launch, no pop-up without products on sale; odd prices (0, negative, letters, huge); the
//   twelve products at most;
// - the money: the making paid once (in stock and in pre-order before, on demand at each sale), the share for a charity
//   paid out with the week (and shown so), the partner's half of the profit;
// - pre-orders: neither paused nor put back on sale; nobody orders: nothing made; a bad batch and a false « fabriqué en
//   France » only once delivered;
// - what a post claims (« pas fabriqué en France » is no claim, a flag alone neither, a launch with a product made in
//   France neither);
// - a contest with no design, another one while one is open, closed without a winner; a duo that is no longer possible
//   (« Le faire seule »); a limited edition not restocked before its launch; what taking a product off says; a signing
//   for a book in pause;
// - days skipped in one go (a pop-up open those days, pre-orders closed on their day with their orders, the weeks paid);
//   a game exported and imported back; drops of before with odd data; the window on a phone (360 and 390), in the dark.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/boutique2.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-boutique2');
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
const toasts = (page) => G(page, () => window.__hype.S.toasts.map((t) => String(t.text)).join(' | ')); // (the queue: two on screen at a time, the others wait their turn)
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
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.S.modals.length = 0; H.S.toasts.length = 0; H.update(); }); // (the toasts of before gone too: what is read after is new)
  await page.waitForFunction(() => !document.querySelector('.layer'), null, { timeout: 5000 }).catch(() => {});
  await G(page, () => window.__hype.openLayer({ t: 'merch' }));
  await page.waitForSelector('.layer .shop-head');
  if (tab) { await page.locator('.layer .shop-head .seg button', { hasText: tab }).click(); await sleep(250); }
};
// Nothing sticks out sideways (the page, the shop's window, each card).
const overflow = (page, w) => G(page, (W) => {
  const out = [];
  if (document.documentElement.scrollWidth > W + 1) out.push('page ' + document.documentElement.scrollWidth);
  const b = document.querySelector('.layer .shop-body');
  if (b && b.scrollWidth > b.clientWidth + 1) out.push('body ' + b.scrollWidth + '>' + b.clientWidth);
  for (const el of document.querySelectorAll('.layer .mp-card, .layer .shop-new .field, .layer .sx, .layer .sn-sum, .layer .shop-launch, .layer .mp-acts')) {
    const r = el.getBoundingClientRect();
    if (r.right > W + 1 || r.left < -1) out.push((el.className || el.tagName) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
  }
  for (const el of document.querySelectorAll('.layer .seg button, .layer .chip-btn, .layer .btn, .layer .chip')) if (el.offsetParent && el.scrollWidth > el.clientWidth + 1) out.push('clipped « ' + el.textContent.trim().slice(0, 30) + ' » ' + el.scrollWidth + '>' + el.clientWidth); // (a word cut by its own button)
  return out;
}, w);

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);
  await G(page, () => {
    window.__hypeNoGearEvents = true;
    const H = window.__hype, g = H.S.game, day = 86400000;
    for (const c of H.mains(g, false)) c.unlocked = true;
    g.career.warmth = 60; g.stats.followers = 1200000; g.career.cash = 500000;
    H.shopOf(g).day = H.gameDay(Date.now());
    // between two parts: everything taken off, the shop's clock back to now (the parts above played days ahead)
    window.__clearShop = () => {
      const S = H.shopOf(g);
      for (const p of S.items) if (p.state !== 'gone') { p.state = 'gone'; p.goneAt = Date.now(); if (p.preco) Object.assign(p.preco, { closed: true, shipped: true }); }
      Object.assign(S, { launch: null, day: H.gameDay(Date.now()), payAt: Date.now() + 7 * day, pend: 0, given: 0, partner: null, weekSold: 0, popup: null, popupAt: 0, signing: null, contest: null });
    };
    window.__r2 = (x) => Math.round(x * 100) / 100;
  });

  // ---------- nothing ready ----------
  const empty = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    return { none: H.openDrop(g, []) === null, all: H.launchAll(g) === null, launch: H.launchDrop(g, { items: [] }, 4, null) === false, popup: H.planPopup(g, 'Lyon', Date.now() + 2 * 86400000) === false, cash: g.career.cash };
  });
  await G(page, () => { const H = window.__hype; H.goTab('studio'); H.update(); });
  await sleep(300);
  const studio0 = await txt(page, '.boutique');
  check('nothing ready: nothing to launch (nor from the studio), no pop-up store without products on sale, nothing paid',
    empty.none && empty.all && empty.launch && empty.popup && empty.cash === 500000 && /Gérer ta boutique/.test(studio0) && !/Lancer avec un post/.test(studio0), { empty, studio0 });

  // ---------- odd prices ----------
  const odd = await G(page, () => {
    const H = window.__hype, g = H.S.game, base = { k: 'stickers', design: 'une fiole', mode: 'pod' }, out = {};
    for (const [k, v] of [['zero', 0], ['neg', -5], ['letters', 'abc'], ['nan', NaN], ['inf', Infinity], ['comma', '6,5'], ['empty', '']]) { const r = H.prepItem(g, Object.assign({}, base, { price: v })); out[k] = r.ok ? 'ok ' + r.p.price : r.why; }
    const big = H.prepItem(g, Object.assign({}, base, { price: 1e20 }));
    out.big = big.ok ? big.p.price : big.why;
    if (big.ok) { H.launchDrop(g, { items: [big.p] }, 5, null, Date.now()); const S = H.shopOf(g); out.bigSold = H.sellProd(g, big.p, H.gameDay(Date.now()) + 1, Date.now() + 86400000); out.pendOK = Number.isFinite(S.pend); }
    const ok = H.prepItem(g, Object.assign({}, base, { price: 6 })).p;
    out.set = [H.setPrice(g, ok, 1), ok.price, H.setPrice(g, ok, 'x'), ok.price, H.setPrice(g, ok, 3.456), ok.price, H.setPrice(g, ok, -2), ok.price];
    return out;
  });
  await shop(page);
  const card = page.locator('.layer .mp-card', { hasText: 'une fiole' }).filter({ hasText: 'Prêt à lancer' }).first();
  await card.locator('.mp-price input').fill('1');
  await card.locator('.mp-price button').click();
  await sleep(300);
  const toast1 = await toasts(page);
  await card.locator('.mp-price input').fill('abc');
  const typed = await card.locator('.mp-price input').inputValue();
  check('odd prices: 0, negative, letters, not a number, infinite, a comma (read by the form, not here), empty: refused, with the lowest price; a huge one is held to the game\'s ceiling and sells nothing (no broken number); changed later: the same rules, rounded to the cent; the field takes digits only',
    ['zero', 'neg', 'letters', 'nan', 'inf', 'comma', 'empty'].every((k) => /au moins/.test(odd[k])) && odd.big === 1e15 && odd.bigSold === 0 && odd.pendOK
      && JSON.stringify(odd.set) === JSON.stringify([false, 6, false, 6, true, 3.46, false, 3.46])
      && /Stickers : 2\s€ au moins/.test(toast1) && typed === '', { odd, toast1, typed });

  // ---------- twelve products at most ----------
  const max = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    window.__clearShop();
    const made = [];
    for (let k = 0; k < H.MERCH_MAX; k++) made.push(H.prepItem(g, { k: 'badge', design: 'badge n° ' + (k + 1), price: 8, mode: 'pod' }).ok);
    out.made = made.every(Boolean); out.shown = H.shopShown(g).length;
    const r13 = H.prepItem(g, { k: 'badge', design: 'badge de trop', price: 8, mode: 'pod' });
    out.r13 = r13.ok; out.why = r13.why;
    H.launchDrop(g, H.launchAll(g), 3, null, Date.now());
    out.live = H.shopLive(g).length; out.ctx = H.merchCtx(g); out.ctxLen = out.ctx.length;
    out.retired = H.retireItem(g, H.shopLive(g)[0]);
    out.after = H.prepItem(g, { k: 'badge', design: 'badge de trop', price: 8, mode: 'pod' }).ok;
    return out;
  });
  await shop(page);
  await shot(page, 'twelve');
  await page.locator('.layer .shop-head .seg button', { hasText: 'Nouveau produit' }).click();
  await sleep(250);
  await page.locator('.shop-new .chip-btn', { hasText: 'Badge' }).click();
  await page.fill('#sn-design', 'encore un badge');
  await page.locator('.shop-new .seg button', { hasText: 'À la demande' }).click();
  await page.locator('.shop-new > .btn-hot').click();
  await sleep(300);
  const toast13 = await toasts(page);
  check('twelve products at most: the thirteenth is refused (the form says why), one taken off makes room; what the AI is told stays short (six products named)',
    max.made && max.shown === 12 && !max.r13 && /déjà 12 produits/.test(max.why) && max.live === 12 && max.ctxLen < 1300 && (max.ctx.match(/badge/g) || []).length === 6 && max.retired && max.after && /déjà 12 produits/.test(toast13), { max: Object.assign({}, max, { ctx: max.ctx.slice(0, 200) }), toast13 });

  // ---------- the money: the making paid once ----------
  const money = await G(page, () => {
    const H = window.__hype, g = H.S.game, S = H.shopOf(g), day = 86400000, r2 = window.__r2, out = {};
    window.__clearShop();
    const T = H.charByHandle(g, 'theo.marlin'); Object.assign(T, { rel: 60, cut: null, unlocked: true });
    const sell = (p, days) => {
      const p0 = S.pend, s0 = p.sold, f0 = p.refunds, g0 = S.given || 0, pa0 = (S.partner || {})[T.id] || 0, d0 = H.gameDay(p.launchAt);
      for (let d = 1; d <= days; d++) H.sellProd(g, p, d0 + d, p.launchAt + d * day);
      return { pend: S.pend - p0, q: p.sold - s0, ref: p.refunds - f0, given: (S.given || 0) - g0, partner: ((S.partner || {})[T.id] || 0) - pa0 };
    };
    const ready = (o) => { const r = H.prepItem(g, o); if (!r.ok) return r.why; Object.assign(r.p, { state: 'ready', readyAt: 0, bad: false }); return r.p; };
    // in stock: every piece paid when made
    const st = ready({ k: 'tshirt', design: 'test stock', price: 30, mode: 'stock', origin: 'pt', mat: 'coton', print: 'seri', qty: 2500 });
    out.stockAhead = st.made === 2500;
    H.launchDrop(g, { items: [st] }, 5, null, Date.now());
    let a = sell(st, 6);
    out.stock = { q: a.q, got: r2(a.pend), want: r2(a.q * 30 * 0.97 - a.ref), old: r2(a.q * (30 * 0.97 - H.unitCost(st)) - a.ref) };
    // on demand: each piece printed (paid) when ordered
    const pd = ready({ k: 'mug', design: 'test pod', price: 15, mode: 'pod' });
    H.launchDrop(g, { items: [pd] }, 5, null, Date.now());
    a = sell(pd, 6);
    out.pod = { q: a.q, got: r2(a.pend), want: r2(a.q * (15 * 0.97 - H.unitCost(pd)) - a.ref) };
    // in pre-order: made (paid) when the orders close
    const pc = ready({ k: 'cap', design: 'test preco', price: 25, mode: 'preco', origin: 'fr', mat: 'coton', print: 'seri' });
    H.launchDrop(g, { items: [pc] }, 5, null, Date.now());
    a = sell(pc, 6);
    out.preco = { q: a.q, got: r2(a.pend), want: r2(a.q * 25 * 0.97), qty: pc.preco.qty };
    // a share for a charity
    const ch = ready({ k: 'tote', design: 'test asso', price: 20, mode: 'stock', origin: 'fr', mat: 'bio', print: 'seri', qty: 500, charity: 10, asso: 'un refuge pour animaux' });
    H.launchDrop(g, { items: [ch] }, 5, null, Date.now());
    a = sell(ch, 6);
    out.charity = { q: a.q, got: r2(a.pend), want: r2(a.q * 20 * 0.97 - a.ref), given: r2(a.given), wantGiven: r2(a.q * 2) };
    // a duo: half the profit to the partner
    const du = ready({ k: 'mug', design: 'test duo', price: 15, mode: 'pod', collab: T.id });
    out.duoWaits = !H.launchable(g).includes(du);
    H.applyCollabLine(g, T, { t: 'collab', ok: true });
    H.launchDrop(g, { items: [du] }, 5, null, Date.now());
    a = sell(du, 6);
    const half = (15 * 0.97 - H.unitCost(du)) / 2;
    out.duo = { q: a.q, got: r2(a.pend), want: r2(a.q * (15 * 0.97 - H.unitCost(du) - half) - a.ref), partner: r2(a.partner), wantPartner: r2(a.q * half), margin: H.marginOf(du), wantMargin: r2(half) };
    // the week paid: the sales in, the share for the charity out, both in the history
    const cash0 = g.career.cash, pend = S.pend, given = S.given, n0 = g.career.ledger.length;
    H.payShop(g, Date.now());
    out.paid = r2(g.career.cash - cash0); out.wantPaid = r2(pend - given);
    out.ledger = g.career.ledger.slice(n0).map((x) => x.label + ' ' + x.amount);
    out.notif = (g.notifs.slice().reverse().find((x) => /Ta boutique :/.test(x.text)) || {}).text || '';
    return out;
  });
  const near = (a, b) => Math.abs(a - b) <= 0.05;
  check('the money: in stock the pieces were paid when made, a sale brings the price less 3 % of fees (no second making); on demand, the printing comes off each sale; in pre-order, the making is paid when the orders close',
    money.stockAhead && money.stock.q > 0 && near(money.stock.got, money.stock.want) && money.stock.got > money.stock.old && money.pod.q > 0 && near(money.pod.got, money.pod.want) && money.preco.q > 0 && near(money.preco.got, money.preco.want) && money.preco.qty === money.preco.q, money);
  check('a share for a charity: counted in the week\'s money, then paid out to the charity (both lines in the history, the notice says what is yours and what was given); a duo: the partner gets half the profit, the margin shown is the player\'s half',
    money.charity.q > 0 && near(money.charity.got, money.charity.want) && near(money.charity.given, money.charity.wantGiven) && money.duoWaits && money.duo.q > 0 && near(money.duo.got, money.duo.want) && near(money.duo.partner, money.duo.wantPartner) && near(money.duo.margin, money.duo.wantMargin)
      && near(money.paid, money.wantPaid) && money.ledger.some((x) => /^Boutique : .+ ventes? \d/.test(x)) && money.ledger.some((x) => /^Boutique : reversés à un refuge pour animaux -\d/.test(x))
      && /pour toi \(et .* reversés à un refuge pour animaux\)/.test(money.notif) && /Théo a touché sa moitié/.test(money.notif), money);

  // ---------- pre-orders ----------
  const pre = await G(page, () => {
    const H = window.__hype, g = H.S.game, S = H.shopOf(g), day = 86400000, out = {};
    window.__clearShop();
    const fol = g.stats.followers;
    const r = H.prepItem(g, { k: 'sweat', design: 'le sweat que personne ne veut', price: 49, mode: 'preco', origin: 'pt', mat: 'coton', print: 'seri' });
    const p = r.p; p.bad = false;
    H.launchDrop(g, { items: [p] }, 1, null, Date.now());
    out.pause = H.pauseItem(g, p); out.resume = H.resumeItem(g, p); out.retire = H.retireItem(g, p);
    g.stats.followers = 0; // (nobody to buy)
    const c0 = g.career.cash;
    for (let k = 1; k <= 9; k++) H.tickMerch(g, p.launchAt + k * day + 3600000);
    H.tickMerch(g, p.preco.until + 1000);
    g.stats.followers = fol;
    out.zero = { state: p.state, qty: p.preco.qty, paid: c0 - g.career.cash, notif: (g.notifs.slice().reverse().find((x) => /Précommandes closes/.test(x.text)) || {}).text || '' };
    // a bad batch, a false « fabriqué en France »: only once in the buyers' hands
    window.__clearShop();
    const q = H.prepItem(g, { k: 'sweat', design: 'le sweat de l’internat', price: 49, mode: 'preco', origin: 'cn', mat: 'coton', print: 'seri' }).p;
    q.bad = true;
    H.launchDrop(g, { items: [q] }, 4, { id: 'pz', text: 'Mon sweat de l’internat, fabriqué en France 🇫🇷' }, Date.now());
    out.claim = q.claim;
    const rnd = Math.random; Math.random = () => 0; // (every roll goes the worst way)
    try {
      for (let k = 1; k <= 9; k++) H.tickMerch(g, q.launchAt + k * day + 3600000);
      out.before = { sold: q.sold, badAt: !!q.badAt, exposed: !!q.exposedAt };
      H.tickMerch(g, q.preco.until + 1000);
      out.closed = { state: q.state, closed: q.preco.closed, badAt: !!q.badAt, exposed: !!q.exposedAt };
      H.tickMerch(g, q.preco.shipAt + 1000);
      out.shipped = { state: q.state, shipped: q.preco.shipped, badAt: !!q.badAt, exposed: !!q.exposedAt };
      H.tickMerch(g, q.preco.shipAt + 5 * day + 1000);
      out.after = { badAt: !!q.badAt, notif: (g.notifs.slice().reverse().find((x) => /se plaignent de ton sweat/.test(x.text)) || {}).text || '', exposed: !!q.exposedAt };
    } finally { Math.random = rnd; }
    return out;
  });
  check('pre-orders: neither paused, nor put back on sale, nor taken off while they run; nobody ordered: nothing made, nothing paid, it goes (told)',
    !pre.pause && !pre.resume && !pre.retire && pre.zero.state === 'gone' && pre.zero.qty === 0 && pre.zero.paid === 0 && /personne n’a commandé ton sweat/.test(pre.zero.notif), pre);
  check('pre-orders: a bad batch and a false « fabriqué en France » show only once the buyers have it (not while they wait, even with every roll against the player)',
    pre.claim === 'fr' && pre.before.sold > 0 && !pre.before.badAt && !pre.before.exposed && !pre.closed.badAt && !pre.closed.exposed && pre.shipped.shipped && pre.shipped.state === 'gone' && pre.after.badAt && /se plaignent de ton sweat/.test(pre.after.notif) && pre.after.exposed, pre);

  // ---------- what a post claims ----------
  const claim = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    const said = ['Fabriqué en France 🇫🇷', 'pas fabriqué en France', 'ce n’est pas du made in France', '🇫🇷 allez les bleus', 'Made in France !', 'en plus, fabriqué en France', 'Nos t-shirts sont 100 % français', 'jamais fabriqué en France, on assume', 'Imprimées en France, à la main'];
    out.said = said.map((s) => H.claimsFrance(s));
    window.__clearShop();
    const fr = H.prepItem(g, { k: 'mug', design: 'mug de Lyon', price: 18, mode: 'stock', origin: 'fr', print: 'seri', qty: 100 }).p;
    const cn = H.prepItem(g, { k: 'stickers', design: 'stickers de Lyon', price: 6, mode: 'stock', origin: 'cn', qty: 100 }).p;
    for (const p of [fr, cn]) Object.assign(p, { state: 'ready', readyAt: 0 });
    H.launchDrop(g, { items: [fr, cn] }, 4, { id: 'pc1', text: 'Mon mug est fabriqué en France ! Et des stickers en bonus.' }, Date.now());
    out.mixed = [fr.claim, cn.claim];
    const cn2 = H.prepItem(g, { k: 'stickers', design: 'stickers de Paris', price: 6, mode: 'pod' }).p;
    H.launchDrop(g, { items: [cn2] }, 4, { id: 'pc2', text: 'Nouveaux stickers, pas fabriqués en France mais imprimés à la demande' }, Date.now());
    out.honest = cn2.claim;
    return out;
  });
  check('what a post claims: « pas fabriqué en France », « jamais », a flag alone are no claim; « fabriqué / imprimées en France », « made in France », « 100 % français » are; a launch with a product really made in France is not a lie; an honest post neither',
    JSON.stringify(claim.said) === JSON.stringify([true, false, false, false, true, true, true, false, true]) && claim.mixed.every((x) => !x) && !claim.honest, claim);

  // ---------- the contest ----------
  const ct = await G(page, () => {
    const H = window.__hype, g = H.S.game, S = H.shopOf(g), out = {};
    window.__clearShop();
    H.contestStarted(g, null, []);
    out.empty = { state: S.contest.state, notif: /aucune proposition/.test(g.notifs[g.notifs.length - 1].text) };
    H.contestStarted(g, null, [{ by: 'fan.lune', text: 'une luciole qui lit' }, { by: 'fan.soleil', text: 'un chaudron qui rit' }]);
    out.open = S.contest.state;
    H.S.stack = []; H.update();
    H.openCompose({ contest: true });
    return out;
  });
  await page.waitForSelector('#compose', { timeout: 8000 });
  await sleep(300);
  const cmp2 = await txt(page, '.layer:has(#compose)');
  await G(page, () => { const H = window.__hype; H.dropLayers((l) => l.t === 'compose'); H.update(); });
  await shop(page, 'Événements');
  const sx1 = await txt(page, '.layer .sx');
  await shot(page, 'contest-open');
  await page.locator('.layer .sx .linkbtn', { hasText: 'Clore sans choisir' }).click();
  await sleep(700); // (a confirm button arms after a moment)
  await page.locator('.modal .btn', { hasText: 'Clore' }).click();
  await sleep(400);
  const sx2 = await txt(page, '.layer .sx');
  const ct2 = await G(page, () => {
    const H = window.__hype, g = H.S.game, S = H.shopOf(g);
    const r = H.prepItem(g, { k: 'mug', design: 'une luciole qui lit', credit: 'fan.lune', price: 15, mode: 'pod' });
    return { state: S.contest.state, credit: r.ok ? r.p.credit : 'refused', warm: (g.career.warmLog || []).slice(-6).map((x) => x.why) };
  });
  check('a contest nobody answered closes at once (told: another can be launched); another contest while one is open: the composer makes it a plain post; closed without a winner (asked first): the button to launch one is back, a design of it is no longer credited',
    ct.empty.state === 'over' && ct.empty.notif && ct.open === 'open' && !/concours de design/.test(cmp2) && /fan\.lune/.test(sx1) && /Clore sans choisir/.test(sx1) && /Lancer un concours/.test(sx2) && ct2.state === 'over' && ct2.credit === null && ct2.warm.some((x) => /sans gagnant/.test(x)), { ct, cmp2: cmp2.slice(0, 160), sx1, sx2, ct2 });

  // ---------- a duo no longer possible ----------
  const duo0 = await G(page, () => {
    const H = window.__hype, g = H.S.game, T = H.charByHandle(g, 'theo.marlin');
    window.__clearShop();
    Object.assign(T, { rel: 60, cut: null });
    const p = H.prepItem(g, { k: 'mug', design: 'le mug des deux', price: 15, mode: 'pod', collab: T.id }).p;
    return { waits: !!(p.collab && p.collab.ok == null), launchable: H.launchable(g).includes(p) };
  });
  await shop(page);
  const duoA = await txt(page, '.layer .mp-card');
  await G(page, () => { const H = window.__hype, g = H.S.game; H.charByHandle(g, 'theo.marlin').cut = { at: Date.now(), why: 'test' }; H.update(); });
  await shop(page);
  const duoB = await txt(page, '.layer .mp-card');
  await shot(page, 'duo-gone');
  await page.locator('.layer .mp-card .mp-alert .btn', { hasText: 'Le faire seule' }).click();
  await sleep(300);
  const duoToast = await toasts(page);
  const duo1 = await G(page, () => { const H = window.__hype, g = H.S.game, p = H.shopItems(g).find((x) => x.design === 'le mug des deux'); H.charByHandle(g, 'theo.marlin').cut = null; return { collab: p.collab, launchable: H.launchable(g).includes(p) }; });
  const duoC = await txt(page, '.layer .mp-card');
  check('a duo: while the friend may still say yes, « Lui proposer en message » and « Le faire seule »; the friend no longer possible (cut off): the card says so, and the product can go on alone (then launched like any other)',
    duo0.waits && !duo0.launchable && /Théo doit être d’accord/.test(duoA) && /Lui proposer en message/.test(duoA) && /Le faire seule/.test(duoA)
      && /Le duo avec Théo n’est plus possible/.test(duoB) && !/Lui proposer en message/.test(duoB) && /sans duo, il est à toi seule/.test(duoToast) && duo1.collab === null && duo1.launchable && /Lancer avec un post/.test(duoC), { duo0, duoA, duoB, duoToast, duo1, duoC });

  // ---------- a limited edition, taking a product off ----------
  const lim = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    window.__clearShop();
    const cap = H.prepItem(g, { k: 'cap', design: 'la casquette numérotée', price: 30, mode: 'stock', origin: 'fr', mat: 'coton', print: 'seri', limited: 100 }).p;
    out.making = [cap.state, H.restockWhy(g, cap, 100), H.retireText(cap)];
    Object.assign(cap, { state: 'ready', readyAt: 0 });
    out.ready = [H.restockWhy(g, cap, 100), H.restock(g, cap, 100), cap.made];
    const st = H.prepItem(g, { k: 'stickers', design: 'stickers à la demande', price: 6, mode: 'pod' }).p;
    out.pod = H.retireText(st);
    const tee = H.prepItem(g, { k: 'tshirt', design: 'le t-shirt en stock', price: 25, mode: 'stock', origin: 'tr', mat: 'coton', print: 'seri', qty: 100 }).p;
    Object.assign(tee, { state: 'ready', readyAt: 0 });
    H.launchDrop(g, { items: [tee] }, 3, null, Date.now());
    tee.stock = 1;
    out.tee = H.retireText(tee);
    tee.stock = 37;
    out.tee37 = H.retireText(tee);
    const pc = H.prepItem(g, { k: 'cap', design: 'la casquette à la demande', price: 25, mode: 'pod' }).p;
    H.launchDrop(g, { items: [pc] }, 3, null, Date.now());
    out.podLive = H.retireText(pc);
    out.restockTee = H.restockWhy(g, tee, 100);
    g.career.cash = 10; out.poor = H.restockWhy(g, tee, 100); g.career.cash = 500000;
    return out;
  });
  await shop(page);
  const limCard = await G(page, () => { const el = [...document.querySelectorAll('.layer .mp-card')].find((x) => /la casquette numérotée/.test(x.textContent)); return el ? { restock: !!el.querySelector('.mp-restock'), text: el.textContent } : null; });
  await page.locator('.layer .mp-card', { hasText: 'le t-shirt en stock' }).locator('.linkbtn', { hasText: 'Retirer' }).click();
  await sleep(300);
  const confirmTxt = await txt(page, '.modal');
  await page.locator('.modal .btn', { hasText: 'Annuler' }).click().catch(() => dismiss(page));
  check('a numbered limited edition: no restock before its launch (as many as numbered), nor while it is made; taking a product off says what it means (made for nothing, the pieces left on your hands, agreed in gender and number); a restock without the money says what it costs',
    out1(lim) && limCard && !limCard.restock && /Il te reste 37 pièces : elles restent sur tes bras/.test(confirmTxt), { lim, limCard: limCard && { restock: limCard.restock }, confirmTxt });
  function out1(l) {
    return l.making[0] === 'making' && /Pas de réassort/.test(l.making[1]) && /Elle ne sera jamais mise en vente : ce que tu as avancé est perdu/.test(l.making[2])
      && /pas un de plus avant son lancement/.test(l.ready[0]) && l.ready[1] === false && l.ready[2] === 100
      && l.pod === 'Ils ne seront jamais mis en vente.' && l.tee === 'Il te reste 1 pièce : elle reste sur tes bras.' && l.tee37 === 'Il te reste 37 pièces : elles restent sur tes bras.' && l.podLive === 'Elle ne sera plus en vente.' && l.restockTee === '' && /Pas assez d’argent pour ce réassort \(/.test(l.poor);
  }

  // ---------- a signing for a book in pause ----------
  await G(page, () => {
    const H = window.__hype, g = H.S.game;
    window.__clearShop();
    const b = H.prepItem(g, { k: 'livre', name: 'Tout le monde me regarde', pitch: 'mes débuts, ce que personne n’a vu', by: 'toi', mode: 'pod', price: 20 }).p;
    Object.assign(b, { state: 'ready', readyAt: 0 });
    H.launchDrop(g, { items: [b] }, 4, null, Date.now());
    window.__sign = H.planSigning(g, b, Date.now() + 2 * 86400000, 'la librairie du centre');
    H.pauseItem(g, b);
  });
  await shop(page, 'Événements');
  const sign = await txt(page, '.layer .shop-extras');
  check('a signing planned, then the book paused: the shop says the signing will sell none until it is back on sale',
    await G(page, () => window.__sign) && /la librairie du centre/.test(sign) && /Ton livre est en pause : remets-le en vente/.test(sign), { sign: sign.slice(0, 400) });

  // ---------- days skipped in one go ----------
  const skip = await G(page, () => {
    const H = window.__hype, g = H.S.game, S = H.shopOf(g), day = 86400000, out = {};
    window.__clearShop();
    const st = H.prepItem(g, { k: 'stickers', design: 'les stickers du saut', price: 6, mode: 'pod' }).p; st.bad = false;
    const sw = H.prepItem(g, { k: 'sweat', design: 'le sweat du saut', price: 49, mode: 'preco', origin: 'fr', mat: 'coton', print: 'seri' }).p; sw.bad = false;
    H.launchDrop(g, { items: [st, sw] }, 4, null, Date.now());
    out.popup = H.planPopup(g, 'Lyon', Date.now() + 2 * day);
    const ids0 = new Set(g.notifs.map((x) => x.id));
    H.jumpClock(g, 15 * day);
    out.preco = { closed: sw.preco.closed, qty: sw.preco.qty, sold: sw.sold };
    out.popupState = S.popup.state;
    const fresh = g.notifs.filter((x) => !ids0.has(x.id)).map((x) => x.text);
    out.popNotif = fresh.find((x) => /pop-up store à Lyon ferme/.test(x)) || '';
    out.popOpen = fresh.some((x) => /pop-up store est ouvert à Lyon/.test(x));
    out.pay = fresh.find((x) => /Ta boutique :/.test(x)) || '';
    out.closeNotif = fresh.find((x) => /Précommandes closes/.test(x)) || '';
    out.day = S.day === H.gameDay(Date.now());
    out.stSold = st.sold;
    return out;
  });
  const popN = +((skip.popNotif.match(/ferme : ([\d\s  ]+) pièce/) || [])[1] || '0').replace(/\D/g, '');
  check('fifteen days skipped in one go: each day in turn with what fell that day: the pop-up opens and closes on its days (its sales told), the pre-orders close on their tenth day with the orders of those ten days (not none), the weeks gone by are paid together',
    skip.popup && skip.popupState === 'over' && skip.popOpen && popN > 0 && skip.preco.closed && skip.preco.qty > 0 && skip.preco.qty === skip.preco.sold && /Précommandes closes : [\d\s  ]+ commandes? pour ton sweat/.test(skip.closeNotif) && /ces 2 dernières semaines/.test(skip.pay) && skip.day && skip.stSold > 0, Object.assign({}, skip, { popN }));

  // ---------- exported, imported back ----------
  const rt = await G(page, async () => {
    const H = window.__hype, g = H.S.game;
    await H.saveNow();
    const text = await H.exportGameText(g.id);
    const g2 = await H.importGameText(text);
    const sig = (S) => S.items.map((p) => [p.k, p.state, p.price, p.stock, p.sold, p.mode, p.preco ? p.preco.qty : '-', p.collab ? p.collab.ok : '-'].join(':')).join('|');
    const a = H.shopOf(g), b = g2.career.shop;
    const bad = [];
    const walk = (o, k0) => { for (const [k, v] of Object.entries(o || {})) { if (typeof v === 'number' && !Number.isFinite(v)) bad.push(k0 + '.' + k); else if (v && typeof v === 'object') walk(v, k0 + '.' + k); } };
    walk(b, 'shop');
    const out = { same: sig(a) === sig(b), n: b.items.length, sold: a.sold === b.sold, revenue: a.revenue === b.revenue, bad, popup: !!b.popup === !!a.popup };
    await H.deleteGame(g2.id);
    return out;
  });
  check('a game exported and imported back: its shop as it was (products, states, prices, stock, orders, duos, totals), no broken number',
    rt.same && rt.n > 0 && rt.sold && rt.revenue && !rt.bad.length && rt.popup, rt);

  // ---------- drops of before, with odd data ----------
  const mig = await G(page, () => {
    const H = window.__hype, g = H.S.game, kept = g.career.shop, out = {};
    delete g.career.shop;
    g.career.merch = { drops: [null, 5, 'x', { state: 'live', maker: 'usine', items: 'oops' },
      { state: 'live', maker: 'pod', launchAt: 'hier', desir: 9, pend: '12', items: [null, { k: 'inconnu' }, { k: 'tshirt', price: -4, stock: 'beaucoup', sold: '3' }] },
      { state: 'ready', maker: 'atelier', items: [{ k: 'mug', price: 'abc', stock: 40 }] },
      { state: 'live', maker: 'usine', launchAt: Date.now() - 3 * 86400000, desir: 4, design: 'logo', sold: 20, items: [{ k: 'cap', price: 22, stock: 60, made: 80, sold: 20 }] }] };
    try {
      const S = H.shopOf(g);
      out.items = S.items.map((p) => [p.k, p.state, p.price, p.stock, p.sold, p.launchAt ? 'at' : '-', p.desir, p.q > 0, p.complained].join(':'));
      out.pend = S.pend; out.sold = S.sold;
      S.day = H.gameDay(Date.now());
      for (let k = 1; k <= 10; k++) H.tickMerch(g, Date.now() + k * 86400000);
      const bad = [];
      const walk = (o, k0) => { for (const [k, v] of Object.entries(o || {})) { if (typeof v === 'number' && !Number.isFinite(v)) bad.push(k0 + '.' + k); else if (v && typeof v === 'object') walk(v, k0 + '.' + k); } };
      walk(S, 'shop');
      out.bad = bad; out.capSold = (S.items.find((p) => p.k === 'cap') || {}).sold;
      out.complaints = g.notifs.filter((x) => /Les avis sur ta casquette/.test(x.text)).length;
    } catch (e) { out.err = e.message; }
    g.career.shop = kept; delete g.career.merch;
    return out;
  });
  check('drops of before with odd data (nothing, a number, items that are not a list, an unknown product, a price below zero or in letters, a stock in words, a launch date in words, a verdict of 9): the shop opens anyway, what can be read is kept, the rest made sane; it sells without a broken number, and no complaint for a product made under the old rules',
    checkMig(mig), mig);
  function checkMig(m) {
    if (m.err || !m.items || m.items.length !== 3) return false;
    const [a, b, c] = m.items.map((x) => x.split(':'));
    return a[0] === 'tshirt' && a[1] === 'ready' && a[2] === '5' && a[4] === '3' && a[5] === '-' && a[6] === '' && a[7] === 'true'
      && b[0] === 'mug' && b[1] === 'ready' && b[2] === '15' && b[3] === '40' && b[7] === 'true'
      && c[0] === 'cap' && c[1] === 'live' && c[2] === '22' && c[3] === '60' && c[5] === 'at' && c[6] === '4' && c[8] === 'true'
      && m.pend === 12 && m.sold === 20 && !m.bad.length && m.capSold > 20 && m.complaints === 0;
  }

  // ---------- on a phone, in the dark ----------
  await G(page, () => {
    const H = window.__hype, g = H.S.game, day = 86400000, T = H.charByHandle(g, 'theo.marlin');
    window.__clearShop();
    Object.assign(T, { rel: 60, cut: null });
    const mk = (o, live) => { const r = H.prepItem(g, o); if (!r.ok) return null; Object.assign(r.p, { state: 'ready', readyAt: 0, bad: false }); if (live) H.launchDrop(g, { items: [r.p] }, 4, null, Date.now()); return r.p; };
    const a = mk({ k: 'tshirt', design: 'Potion Club, en lettres néon sur fond violet très long pour voir', price: 29.9, mode: 'stock', origin: 'fr', mat: 'bio', print: 'seri', qty: 250, charity: 10, asso: 'un refuge pour animaux' }, true);
    a.sold = 1234; a.rev = 4.6; a.fake = { at: Date.now(), state: 'on', until: Date.now() + 20 * day };
    mk({ k: 'sweat', design: 'le sweat de l’internat', price: 49, mode: 'preco', origin: 'pt', mat: 'coton', print: 'seri' }, true);
    const m = H.prepItem(g, { k: 'cap', design: 'la casquette numérotée', price: 30, mode: 'stock', origin: 'cn', mat: 'poly', print: 'transfert', limited: 250 });
    void m;
    mk({ k: 'mug', design: 'le mug des deux', price: 15, mode: 'pod', collab: T.id }, false);
    mk({ k: 'livre', name: 'Tout le monde me regarde, le livre au titre interminable', pitch: 'mes débuts, ce que personne n’a vu', by: 'toi', mode: 'pod', price: 20 }, true);
    H.contestStarted(g, null, [{ by: 'fan.lune', text: 'une luciole qui lit un grimoire sous la lune' }, { by: 'fan.soleil', text: 'un chaudron qui rit' }]);
  });
  const phone = {};
  for (const [w, dark] of [[360, true], [390, false]]) {
    await page.setViewportSize({ width: w, height: 780 });
    await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' });
    await shop(page);
    await sleep(300);
    phone[w + 'items'] = await overflow(page, w);
    await shot(page, `phone-${w}-items${dark ? '-dark' : ''}`);
    await page.evaluate(() => { const H = window.__hype; H.S.toasts.length = 0; H.update(); const c = [...document.querySelectorAll('.layer .mp-card')].pop(); if (c) c.scrollIntoView({ block: 'end' }); });
    await sleep(200);
    await shot(page, `phone-${w}-items-end${dark ? '-dark' : ''}`);
    await page.locator('.layer .shop-head .seg button', { hasText: 'Nouveau produit' }).click();
    await sleep(300);
    await page.locator('.shop-new .chip-btn', { hasText: 'T-shirt' }).click();
    await page.locator('.shop-new .seg button', { hasText: 'En stock' }).click();
    await sleep(200);
    phone[w + 'new'] = await overflow(page, w);
    await page.evaluate(() => { const H = window.__hype; H.S.toasts.length = 0; H.update(); const f = [...document.querySelectorAll('.shop-new .field')].find((x) => /Fabrication/.test(x.textContent)); if (f) f.scrollIntoView({ block: 'start' }); });
    await sleep(200);
    await shot(page, `phone-${w}-new${dark ? '-dark' : ''}`);
    await page.evaluate(() => { const x = document.querySelector('.shop-new .sn-sum'); if (x) x.scrollIntoView({ block: 'end' }); });
    await sleep(200);
    await shot(page, `phone-${w}-new-end${dark ? '-dark' : ''}`);
    await page.locator('.shop-new .chip-btn', { hasText: 'Ton livre' }).click();
    await sleep(200);
    phone[w + 'book'] = await overflow(page, w);
    await page.evaluate(() => { const f = [...document.querySelectorAll('.shop-new .field')].find((x) => /Qui l’écrit/.test(x.textContent)); if (f) f.scrollIntoView({ block: 'center' }); });
    await sleep(200);
    await shot(page, `phone-${w}-book${dark ? '-dark' : ''}`);
    await page.locator('.layer .shop-head .seg button', { hasText: 'Événements' }).click();
    await sleep(300);
    phone[w + 'extras'] = await overflow(page, w);
    await shot(page, `phone-${w}-extras${dark ? '-dark' : ''}`);
  }
  const darkBg = await G(page, () => getComputedStyle(document.body).backgroundColor);
  check('on a phone (360 in the dark, 390 in the light): the shop\'s three tabs fit the width (nothing sticks out sideways: long designs, long titles, chips, prices)',
    Object.values(phone).every((x) => !x.length), { phone, darkBg });

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`\n${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
