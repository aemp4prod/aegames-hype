// 0.27.6 end to end, in Chromium against the built hype.html with the mocked Claude runtime: the bugs found in the
// review of the recent additions, fixed.
// - the inventory: a price far above the worth never sells, favourites add up, broken gear waits there (its repair goes
//   on, it can be used again), a counterfeit dies there too, the cap never removes what is on sale;
// - the contracts: the fake « brief » pays nothing, the agent gives back its cut on a refunded deposit, products and money
//   together, the amounts as agreed, the deposit never above the price, the scams look like the others, the critic names
//   only promoters who published, the exclusivity warns instead of forbidding, a walk-out over a resale bills the gift;
// - the quote: the plan being typed reaches it, an item sold or on sale since blocks the payment, an inventory item that
//   covers a line is used up, a price written as text counts;
// - the planned releases: a challenge episode keeps its hour, two contents the same day on two topics are two releases,
//   one waiting behind another gets its grace when its turn comes, a fan question pays once, the AI hears of all six;
// - the palette: only what was changed is applied (no XP lost), the clock skip plays no skipped day, the ties follow
//   the usual follow rule;
// - the mini-games: never pulled from under the player, without the AI a skill round (Cauchemar says so), doing nothing
//   scores nothing (chat, mix, order), the keys go to the game on top, nothing pops up over a game.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v277.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v277');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(process.env.PAGE || path.join(ROOT, 'hype.html'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const UMD = fs.readFileSync(process.env.UMD, 'utf8');
const SKELETON = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;

const errors = [];
const checks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let shotN = 0;
const check = (name, ok, info) => { checks.push([ok ? 'PASS' : 'FAIL', name]); console.log(ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)); };
async function shot(page, name) { shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
const G = (page, fn, arg) => page.evaluate(fn, arg);
async function dismiss(page) { for (let k = 0; k < 6 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }

async function newPage(browser, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true, colorScheme: 'light' });
  await ctx.addInitScript(MOCK);
  const page = await ctx.newPage();
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/mini-game refused/.test(m.text())) errors.push(`[${m.type()}] ${m.text()}`); }); // (the AI refused on purpose: that warning is expected)
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
async function newGame(page, identity) {
  await page.locator('button', { hasText: 'Nouvelle partie' }).first().click();
  await page.locator('button.world', { hasText: 'Académie Lumen' }).first().click();
  await page.waitForSelector('#pn');
  await page.fill('#pn', 'Mila Flux');
  await page.locator('.seg button', { hasText: /^Elle$/ }).first().click();
  await page.fill('#pi', identity);
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

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);
  await newGame(page, 'Une créatrice qui teste tout ce qui se mange');
  await G(page, () => { window.__hypeNoGearEvent = true; window.__hypeEasyGear = false; /* (the gear, the quotes and the scams for real) */ const g = window.__hype.S.game; g.stats.followers = 40000; g.career.cash = 20000; });

  // ---------- the inventory ----------
  const inv = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {}, R = Math.random;
    const lamp = H.invAdd(g, { kind: 'buy', name: 'Une lampe', value: 100, cond: 'neuf' });
    out.never = H.saleSpeed(g, lamp, 1000000);
    H.listItem(g, lamp.id, 9999999);
    Math.random = () => 0.0001; // the luckiest of buyers, for a month
    lamp.sale.last = Date.now() - 30 * 86400000; H.tickResale(g, Date.now());
    out.unsold = !lamp.sold;
    Math.random = () => 0.999; // nobody buys: the favourites, in quarter hours
    const mug = H.invAdd(g, { kind: 'buy', name: 'Un mug', value: 30, cond: 'neuf' });
    H.listItem(g, mug.id, 30);
    for (let k = 0; k < 6; k++) { mug.sale.last = Date.now() - 0.3 * 3600000; H.tickResale(g, Date.now()); }
    out.favs = Math.round(mug.sale.favs * 100) / 100;
    Math.random = R;
    // the workstation at the repairer, a lesser gift from a brand: it waits in the inventory, its repair goes on
    g.gear.items.pc = Object.assign(H.mkItem(3), { broken: 1, fixAt: Date.now() + 1000 });
    out.gift = H.receiveGear(g, 'pc', H.mkItem(1), { how: 'marque', brand: 'Kubo', deal: 'dlX', c: '' }, 'Kubo t’a envoyé un PC');
    const st = H.invOf(g).find((x) => x.kind === 'gear' && x.gear.k === 'pc' && x.gear.it.t === 3);
    out.stCond = st && st.cond;
    H.tickInvGear(g, Date.now() + 5000);
    out.stFixed = !!st && st.cond !== 'casse' && !st.gear.it.broken;
    out.back = !!st && H.equipInv(g, st.id) && g.gear.items.pc.t === 3;
    const gift = H.invOf(g).find((x) => x.kind === 'gear' && x.gear.k === 'pc' && x.gear.it.t === 1);
    out.giftFrom = !!(gift && gift.from && gift.from.how === 'marque' && gift.from.deal === 'dlX');
    // a counterfeit dies in the inventory too
    const fk = H.invAdd(g, { kind: 'gear', name: 'Faux micro', value: 200, cond: 'neuf', gear: { k: 'mic', it: Object.assign(H.mkItem(2), { fake: Date.now() - 1 }) } });
    H.tickInvGear(g);
    out.fake = fk.value === 0 && fk.cond === 'casse';
    // the old phone worth nothing is not « in the inventory »
    g.gear.items.phone = H.mkItem(0);
    const ph = H.invAdd(g, { kind: 'gear', name: 'Téléphone récent', value: 700, cond: 'bon', gear: { k: 'phone', it: H.mkItem(2) } });
    H.equipInv(g, ph.id);
    out.phoneMsg = (g.notifs.filter((n) => /Tu utilises maintenant/.test(n.text)).slice(-1)[0] || {}).text || '';
    // the cap: what is on sale stays, the least valuable goes
    const keep = H.invAdd(g, { kind: 'buy', name: 'Bricole en vente', value: 1 }); H.listItem(g, keep.id, 5);
    for (let k = 0; H.invOf(g).length < 80; k++) H.invAdd(g, { kind: 'buy', name: 'Objet ' + k, value: 50 + k });
    const cheap = H.invAdd(g, { kind: 'buy', name: 'Le moins cher', value: 2 });
    H.invAdd(g, { kind: 'buy', name: 'Le dernier', value: 500 });
    out.cap = H.invOf(g).length === 80 && H.invOf(g).includes(keep) && !H.invOf(g).includes(cheap);
    g.inv = []; // (room for what follows, and gear that works)
    for (const k of Object.keys(H.GEAR)) g.gear.items[k] = H.mkItem(2);
    return out;
  });
  check('the inventory: ten million for a lamp never sells (and says so); favourites add up in quarter hours; broken gear waits in the inventory, its repair goes on, it can be used again, a brand gift keeps its origin; a counterfeit dies there too; « l’ancien est dans ton inventaire » only when it is; the cap keeps what is on sale',
    /ne partira pas/.test(inv.never) && inv.unsold && inv.favs > 0.05 && inv.gift === 'used' && inv.stCond === 'casse' && inv.stFixed && inv.back && inv.giftFrom && inv.fake
      && /Téléphone récent/.test(inv.phoneMsg) && !/inventaire/.test(inv.phoneMsg) && inv.cap, inv);

  // ---------- the contracts ----------
  const dl = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {}, R = Math.random;
    const fresh = () => { g.deals = g.deals.filter((x) => x.state !== 'offer'); };
    const ok = (x, o) => { for (const y of g.deals) if (y !== x && y.brand !== 'Maison Lune') y.exclusive = false; return H.signDeal(g, x, o); };
    const ups = () => g.career.ledger.filter((x) => /^Acompte/.test(x.label) && x.amount > 0).length;
    g.deals = [];
    // the fake « brief »: a contract that pays nothing, not even a deposit (it could be pushed to 100 %)
    const b = H.makeOffer(g, { scam: 'brief', what: 'vidéo', brand: 'Marque Test 1' });
    Object.assign(b, { fee: 2000, fee0: 2000, base: 2000, upPct: 100 }); b.upfront = H.upfrontOf(b);
    const u0 = ups(); ok(b);
    out.brief = { ups: ups() - u0, state: b.state };
    // the agent gives back its cut when the deposit goes back
    fresh();
    const ag = H.addCandidate(g, 'agent', { tier: 3, name: 'Lou Ferrand' }); H.hireStaff(g, ag);
    const d = H.makeOffer(g, { legit: true, what: 'vidéo', gift: false, brand: 'Marque Test 2' });
    Object.assign(d, { fee: 1000, fee0: 1000, base: 1000, max: 1500, maxBase: 1500, hard: '', exclusive: false, shady: false, upPct: null }); d.upfront = H.upfrontOf(d);
    let c0 = g.career.cash; ok(d); const sign = g.career.cash - c0;
    d.due = Date.now() - 1000; c0 = g.career.cash; H.checkDeals(g, Date.now()); const brk = g.career.cash - c0;
    out.agent = { sign, brk, net: Math.round((sign + brk) * 100) / 100, state: d.state };
    // products and money: both, and both billed when it breaks
    fresh();
    const p = H.makeOffer(g, { legit: true, what: 'vidéo', gift: false, brand: 'Marque Test 3' });
    Object.assign(p, { fee: 0, fee0: 0, base: null, maxBase: null, value: 120, max: 96, upfront: 0, exclusive: false, product: 'ses box repas', gift: null, hard: '' });
    H.applyDealLine(g, g.chars[p.contact], { t: 'deal', fee: 60 });
    out.pTerms = H.payTerms(g, p); out.pSum = H.dealSummary(g, p);
    const n0 = H.invOf(g).length; ok(p);
    out.goods = { sent: !!p.goodsSent, inv: H.invOf(g).length - n0, fee: p.fee };
    p.due = Date.now() - 1000; c0 = g.career.cash; H.checkDeals(g, Date.now()); out.goods.billed = Math.round((c0 - g.career.cash) * 100) / 100;
    // the amounts as written, and the deposit never above the price
    fresh();
    const r = H.makeOffer(g, { legit: true, what: 'vidéo', gift: false, brand: 'Marque Test 4' });
    Object.assign(r, { fee: 1000, fee0: 1000, base: 1000, max: 1400, maxBase: 1400, hard: '', exclusive: false, shady: false, upPct: null }); r.upfront = H.upfrontOf(r);
    H.applyDealLine(g, g.chars[r.contact], { t: 'deal', fee: 1050, upfront: '300 €' });
    out.round = { fee: r.fee, up: r.upfront };
    r.upPct = 100; r.upfront = H.upfrontOf(r); ok(r);
    H.applyDealLine(g, g.chars[r.contact], { t: 'deal', fee: 700 });
    out.amend = { fee: r.fee, up: r.upfront };
    // a scam is as hard to negotiate as any other big contract (no agent: the brand gives nothing)
    const staff = g.staff; g.staff = [];
    const L = { fee: 2000 }, Sc = { fee: 2000, scam: 'nul' }; H.dealHard(g, L); H.dealHard(g, Sc);
    g.staff = staff;
    out.hard = [L.hard || '', Sc.hard || ''];
    // a gift that will never come: a signed contract like the others
    fresh();
    const ig = H.makeOffer(g, { scam: 'impaye', what: 'vidéo', gift: { kind: 'mic', t: 1 } });
    ok(ig);
    out.impaye = { state: ig.state, lost: !!ig.lostAt, sent: !!ig.giftSent, dm: ((g.dms[ig.contact] || {}).msgs || []).some((m) => /part cette semaine/.test(m.text)) };
    // the critic: a contract never delivered promoted nothing
    fresh();
    const nul = H.makeOffer(g, { scam: 'nul', what: 'vidéo', brand: 'Marque Test 5' }); ok(nul);
    Math.random = () => 0.9;
    let rep0 = g.stats.reputation; H.criticExposes(g, nul); const quiet = g.stats.reputation === rep0;
    Math.random = R; // (a constant draw would give every new contact the same name)
    fresh();
    const nul2 = H.makeOffer(g, { scam: 'nul', what: 'vidéo', brand: 'Bidule Snacks' }); ok(nul2); nul2.post = 'p_x';
    Math.random = () => 0.9;
    rep0 = g.stats.reputation; H.criticExposes(g, nul2); const named = g.stats.reputation < rep0;
    Math.random = R;
    out.critic = { quiet, named, state: nul.state };
    // the agent's view once the trap is out of the contract
    fresh();
    const cl = H.makeOffer(g, { legit: true, shady: false, what: 'vidéo', gift: false, brand: 'Marque Test 6' }); cl.flagged = true; // (0.28.1: never shady by chance: 12 % of runs failed)
    const agc = g.chars[g.staff.find((m) => m.role === 'agent').c];
    out.warn = H.dmCareerCtx(g, agc).join(' ').includes('a sauté du contrat');
    // the exclusivity: asked first, then signed anyway, at a price
    fresh();
    const ex = H.makeOffer(g, { legit: true, what: 'vidéo', gift: false, brand: 'Maison Lune' });
    Object.assign(ex, { exclusive: true, fee: 800, fee0: 800, base: 800, max: 1000, maxBase: 1000, hard: '', shady: false, upPct: null }); ex.upfront = H.upfrontOf(ex); H.signDeal(g, ex);
    const ot = H.makeOffer(g, { legit: true, what: 'vidéo', gift: false, sector: ex.sector, brand: 'Marque Rivale' }); Object.assign(ot, { exclusive: false, hard: '' });
    out.blocked = H.signDeal(g, ot) === false && ot.state === 'offer';
    H.S.modals = []; H.trySign(g, ot);
    out.ask = (H.S.modals.find((m) => m.t === 'confirm') || {}).title || '';
    H.S.modals = [];
    H.ensureRep(g.stats).pro = 50; const pro0 = H.ensureRep(g.stats).pro;
    out.forced = H.signDeal(g, ot, { force: true });
    out.ex = { state: ex.state, pen: g.career.ledger.some((x) => /Pénalité d’exclusivité Maison Lune/.test(x.label)), pro: H.ensureRep(g.stats).pro < pro0 };
    // their gift on sale, they walk away: it is billed
    fresh();
    const gw = H.makeOffer(g, { legit: true, what: 'vidéo', gift: { kind: 'light', t: 1 }, brand: 'Lumio' }); ok(gw);
    gw.resold = { at: Date.now(), what: 'x', price: 100, after: 1000 };
    c0 = g.career.cash; H.applyDealLine(g, g.chars[gw.contact], { t: 'deal', walk: true });
    out.walk = { state: gw.state, billed: Math.round((c0 - g.career.cash) * 100) / 100, value: gw.gift.value };
    return out;
  });
  check('the contracts: the fake « brief » pays no deposit; the agent gives back its cut with the deposit (the break costs the penalty only); products and money together (both said, both sent, both billed); the amounts as written; the deposit never above the price; a scam as hard to negotiate as the others; a gift that never comes is a signed contract; the critic names only who published; the agent no longer warns of a trap taken out; the exclusivity asks, then costs; a walk-out over a resale bills the gift',
    dl.brief.ups === 0 && dl.agent.state === 'broken' && dl.agent.net === -200 && dl.agent.sign < 300
      && /produits, envoyés à la signature ; l’argent à la livraison/.test(dl.pTerms) && /\+ produits offerts/.test(dl.pSum) && dl.goods.sent && dl.goods.inv === 1 && dl.goods.fee === 60 && dl.goods.billed === 132
      && dl.round.fee === 1050 && dl.round.up === 300 && dl.amend.fee >= dl.amend.up
      && dl.hard[0] === 'alone' && dl.hard[1] === 'alone'
      && dl.impaye.state === 'signed' && dl.impaye.lost && !dl.impaye.sent && dl.impaye.dm
      && dl.critic.quiet && dl.critic.named && dl.critic.state === 'scammed' && dl.warn
      && dl.blocked && /exclusivité Maison Lune/.test(dl.ask) && dl.forced === true && dl.ex.state === 'broken' && dl.ex.pen && dl.ex.pro
      && dl.walk.state === 'broken' && dl.walk.billed === dl.walk.value, dl);

  // ---------- the quote ----------
  const dv = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    const box = H.invAdd(g, { kind: 'goods', name: 'Box repas', value: 40, cond: 'neuf', from: { how: 'marque', brand: 'Kubo' } });
    const stock = H.devisStock(g);
    const o = { what: 'vidéo', topic: 'je cuisine pour mes potes', plot: '' };
    const q = H.readDevis(g, o, [{ t: 'cost', item: 'Box repas pour 4 personnes', price: 60, kind: 'conso' }, { t: 'cost', item: 'Épices du marché', price: '4,50 €', kind: 'conso' }], stock, []);
    out.lines = q.items.map((x) => [x.item, x.price]); out.have = q.have.map((h) => [h.name, h.use]);
    H.listItem(g, box.id, 30);
    out.stale = !!H.devisStale(g, q) && H.payDevis(g, q, 'test') === false;
    H.unlist(g, box.id);
    out.paid = H.payDevis(g, q, 'test') === true && !H.invOf(g).includes(box);
    return out;
  });
  // the plan typed in the shoot setup reaches the quote
  await G(page, () => {
    const H = window.__hype, g = H.S.game;
    H.S.stack = []; H.S.devis = null; H.S.devisBy = {};
    for (const x of g.releases) if (x.state === 'scheduled') x.state = 'dropped';
    const r = H.addRelease(g, { what: 'vidéo', topic: 'mon week-end', in: 30 }, null, 'ma vidéo sur mon week-end dans 30 min');
    r.due = Date.now() - 1000; H.startShoot(r);
  });
  await page.waitForSelector('.layer #rl-plot');
  await page.fill('.layer #rl-plot', 'on part à Tokyo, on mange des ramen au marché');
  await page.locator('.layer .devis-step .btn-hot').click();
  await page.waitForSelector('.layer .devis-card', { timeout: 10000 });
  const dvPrompt = await G(page, () => (window.__prompts.filter((p) => p.includes('## TÂCHE : LE DEVIS')).pop() || ''));
  await shot(page, 'quote-with-plan');
  check('the quote: the plan being typed reaches it; an inventory item that covers a line is used up instead of being free forever; a price written « 4,50 € » counts; an item put on sale since blocks the payment',
    /on part à Tokyo/.test(dvPrompt) && dv.lines.length === 1 && dv.lines[0][0] === 'Épices du marché' && dv.lines[0][1] === 5 && dv.have.length === 1 && dv.have[0][0] === 'Box repas' && dv.have[0][1] === 'conso' && dv.stale && dv.paid,
    Object.assign({ plan: /on part à Tokyo/.test(dvPrompt) }, dv));

  // ---------- the planned releases ----------
  const rl = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    H.S.stack = [];
    const clear = () => { for (const x of g.releases) if (x.state === 'scheduled') x.state = 'dropped'; g.relFirst = null; };
    for (const k of Object.keys(H.GEAR)) g.gear.items[k] = H.mkItem(2); // (the fake brief left a virus on the computer)
    clear();
    // two due at once: the second waits, its grace from when the first is done; on screen, never dropped
    const A = H.scheduleRelease(g, { what: 'vidéo', topic: 'le premier', due: Date.now() + 60000 });
    const B = H.scheduleRelease(g, { what: 'vidéo', topic: 'le second', due: Date.now() + 60000 });
    H.checkReleases(g, Date.now());
    const T1 = Date.now() + 62 * 60000;
    A.state = 'released';
    out.kept = H.checkReleases(g, T1) === false && B.state === 'scheduled';
    out.waited = B.waited === T1;
    const lim = H.relLimit(B) + 60000; // (0.30.1: its grace runs from the time announced, or from its turn if later)
    out.screen = lim > T1 && H.checkReleases(g, lim, (id) => id === B.id) === false && B.state === 'scheduled';
    out.later = H.checkReleases(g, lim) === true && B.state === 'dropped';
    clear();
    // a challenge episode keeps its hour; another topic later the same day is a second release, a reminder is not
    const hr = (new Date(Date.now() + H.clockOff()).getHours() + 2) % 24; // (two hours from now on the game's clock: at 18:00 in the evening, tomorrow's episode was too far for a second release)
    H.startSeries(g, { what: 'vidéo', days: 7, hour: hr, min: 0, theme: 'une recette par jour', diff: 'moyen', hard: false, devis: { total: 0, items: [], topic: 'x', at: Date.now() } });
    const ep = H.plannedReleases(g).find((x) => x.series);
    out.adv = H.advanceRelease(g, ep, Date.now()) === false;
    const m0 = Math.round((H.relAnn(ep) - Date.now()) / 60000); // (0.30.1: its time out, not its shoot)
    const r2 = H.addRelease(g, { what: 'vidéo', topic: 'ma routine skincare', in: m0 + 240 }, null, 'nouvelle vidéo ce soir à 22h sur ma routine skincare');
    const r3 = H.addRelease(g, { what: 'vidéo', topic: 'plus que 30 min avant ma vidéo !', in: m0 + 210, loose: true }, null, 'plus que 30 min avant ma vidéo !');
    out.dedupe = { second: !!r2 && r2.topic === 'ma routine skincare', reminder: r3 === null, n: H.plannedReleases(g).length };
    H.endSeries(g, g.series, false);
    clear();
    // a fan's question: one video that counts
    g.career.fanAt = 0;
    const fan = H.fanMessage(g, { name: 'Lina Sow', handle: 'lina.sow', g: 'f', q: true, text: 'tu peux faire une vidéo sur ta routine du matin ?' });
    const q1 = H.scheduleRelease(g, { what: 'vidéo', topic: 'ma routine du matin', due: Date.now() + 3600000, fanQ: fan.id });
    out.fanPlanned = H.fanPlanned(g, fan);
    const w0 = H.warmOf(g); const first = H.fanVideoDone(g, q1, null); const w1 = H.warmOf(g); const again = H.fanVideoDone(g, q1, null);
    out.fan = { first, again, warm: w1 > w0, warmAgain: H.warmOf(g) === w1 };
    clear();
    // six planned: the AI hears of the six
    for (let k = 0; k < 6; k++) H.scheduleRelease(g, { what: 'vidéo', topic: 'sujet numéro ' + (k + 1), due: Date.now() + (k + 1) * 3600000 });
    const ctx = H.ctxText(g);
    out.ctx6 = [1, 2, 3, 4, 5, 6].every((k) => ctx.includes('sujet numéro ' + k));
    clear();
    return out;
  });
  check('the planned releases: one waiting behind another gets its grace when its turn comes (and is never dropped while on screen); a challenge episode keeps its hour; another topic later the same day is a second release, a reminder is not; a fan question pays once; the AI hears of all six',
    rl.kept && rl.waited && rl.screen && rl.later && rl.adv && rl.dedupe.second && rl.dedupe.reminder && rl.fanPlanned && rl.fan.first && rl.fan.again === false && rl.fan.warm && rl.fan.warmAgain && rl.ctx6, rl);

  // ---------- the palette: only what changed ----------
  await G(page, () => {
    const H = window.__hype, g = H.S.game;
    H.S.stack = []; H.S.modals = [];
    g.stats.xp = 90;
    const id = H.SKILL_IDS[1]; g.stats.skillXp[id] = H.SKILL_CUM[H.skillLevel(g, id)] + 3; window.__skillUntouched = [id, g.stats.skillXp[id]];
    H.S.palSel = {}; H.openPalette();
  });
  await page.waitForSelector('.layer .palette-win');
  await sleep(400); // (its keys are listened to once it has been drawn: on a busy machine, a key pressed at once was lost)
  // (0.27.9: each line applies on its own)
  const typeIn = async (text) => { await page.keyboard.press('Enter'); await page.waitForSelector('.layer .pw-edit'); await page.fill('.layer .pw-edit', text); await page.keyboard.press('Enter'); await sleep(150); };
  await page.keyboard.press('Enter');
  await typeIn('4321');
  await page.keyboard.press('Backspace');
  for (let k = 0; k < 4; k++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => /Compétences/.test((document.querySelector('.layer .pw-sub') || {}).textContent || ''));
  await typeIn('7');
  const mn = await G(page, () => {
    const H = window.__hype, g = H.S.game, [id, xp] = window.__skillUntouched, out = { cash: g.career.cash, xp: g.stats.xp, skill0: H.skillLevel(g, H.SKILL_IDS[0]), untouched: g.stats.skillXp[id] === xp };
    // the clock: the day counters follow (a month of merch orders in a second, before)
    H.shopOf(g).day = H.gameDay(Date.now()); // (0.29: the shop's days)
    H.paletteApply(g, { at: Date.now() + 30 * 86400000 });
    out.day = H.shopOf(g).day === H.gameDay(Date.now()) && g.career.warmDay === H.gameDay(Date.now());
    H.paletteApply(g, { at: Date.now() });
    // the ties: the follow rule, in silence
    const c = Object.values(g.chars).find((x) => x.unlocked && x.followsYou);
    H.paletteApply(g, { rel: { [c.id]: -100 } });
    out.unfollow = c.followsYou === false;
    H.S.stack = [];
    return out;
  });
  check('the palette: a line sets only itself (money changed, XP kept; one skill changed, the others keep their progress); a clock skip plays no skipped day; a tie set to −100 unfollows',
    mn.cash === 4321 && mn.xp === 90 && mn.skill0 === 7 && mn.untouched && mn.day && mn.unfollow, mn);

  // ---------- the mini-games ----------
  const mg = await G(page, async () => {
    const H = window.__hype, g = H.S.game, out = {};
    H.S.stack = [];
    // a date being played is no stood-up date
    const c = H.charByHandle(g, 'theo.marlin');
    const ev = { id: 'evT', kind: 'rdv', c: c.id, what: 'un dîner', at: Date.now(), due: Date.now() - 4 * 3600000, state: 'scheduled', player: true, game: null, played: null, diff: 'moyen' };
    g.events.push(ev);
    H.checkEvents(g, Date.now(), (id) => id === 'evT');
    out.date = ev.state;
    g.events = g.events.filter((x) => x !== ev);
    // without the AI: a skill round at Mythique, nothing at Cauchemar (said)
    window.__sampleMode = 'refuse';
    const r = H.scheduleRelease(g, { what: 'vidéo', topic: 'mes potions', due: Date.now() + 60000 });
    r.due = Date.now() - 1000; r.diff = 'mythique'; r.devis = { total: 0, items: [], topic: r.topic, at: Date.now() };
    H.S.mgForce = 'quiz';
    await H.genShoot(r);
    out.fb = { kind: r.game && r.game.kind, fallback: !!(r.game && r.game.fallback) };
    const r2 = H.scheduleRelease(g, { what: 'vidéo', topic: 'les vraies potions', due: Date.now() + 3600000 });
    r2.diff = 'cauchemar'; r2.devis = { total: 0, items: [], topic: r2.topic, at: Date.now() };
    await H.genShoot(r2);
    out.nm = { game: !!r2.game, fail: !!r2.aiFail };
    H.S.mgForce = null; window.__sampleMode = 'ok';
    for (const x of g.releases) if (x.state === 'scheduled') x.state = 'dropped';
    // doing nothing scores nothing: the chat (and removing everything neither), the order game
    const ch = H.makeChat({ what: 'live', topic: 'les potions' }, H.DIFFS[0]);
    const idle = ch.items.map((x) => (x.bad ? 0 : 1)), all = ch.items.map((x) => (x.bad ? 1 : 0)), best = ch.items.map(() => 1);
    out.chat = [H.chatScore(ch.items, idle), H.chatScore(ch.items, all), H.chatScore(ch.items, best)];
    out.order = H.orderScore([].concat(H.leftWorst([2, 0, 3, 1, 4])));
    // the AI's lines: a late « game » line does not turn sorted items into a quiz; three questions are not a quiz
    const rd = H.gameReader();
    for (let k = 0; k < 4; k++) rd.read({ t: 'item', text: 'idée ' + k, good: k % 2 === 0 });
    rd.read({ t: 'game', kind: 'quiz', title: 'Le quiz' });
    out.reader = [rd.sp.kind, rd.sp.items.length, H.validGame(rd.sp)];
    out.q3 = H.validGame({ kind: 'quiz', items: [1, 2].map((k) => ({ text: 'q' + k, a: ['a', 'b'], ok: 0 })) });
    // nothing pops up over a game but what the player asked
    H.openLayer({ t: 'practice' });
    H.S.modals = []; H.queueModal({ t: 'level', n: 5 });
    out.modal1 = H.dueModal(Date.now() + 5000);
    H.queueModal({ t: 'confirm', title: 'Sûr ?', run: () => {} });
    out.modal2 = (H.dueModal(Date.now() + 5000) || {}).t || null;
    H.S.modals = []; H.S.stack = [];
    return out;
  });
  check('the mini-games: a date being played is never stood up; without the AI a skill round (said), Cauchemar left unwritten and said; doing nothing scores nothing at the chat (removing everything neither) and the order game; a late « game » line keeps the sorted items; two questions are not a quiz; only a confirmation pops up over a game',
    mg.date === 'scheduled' && ['montage', 'memoire'].includes(mg.fb.kind) && mg.fb.fallback && !mg.nm.game && mg.nm.fail
      && mg.chat[0] < 0.4 && mg.chat[1] === 0 && mg.chat[2] === 1 && mg.order === 0 && mg.reader[0] === 'tri' && mg.reader[1] === 4 && mg.reader[2] === true && mg.q3 === false
      && mg.modal1 === null && mg.modal2 === 'confirm', mg);

  // the mix starts out of the green band
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.startPractice(H.S.game, 'mixage', 'facile'); });
  await page.waitForSelector('.layer .mg-intro');
  await G(page, () => { window.__rnd0 = Math.random; Math.random = () => 0.99; }); // (no sudden jump of a track in the first frames)
  await page.locator('.layer .mg-intro button', { hasText: 'parti' }).click();
  await page.waitForSelector('.layer .mix-row');
  // (where each track starts, read at once from the screen: the dot against its band; a few frames later a track may
  // already have drifted in by itself, which is the game)
  const mixIn = await G(page, () => { Math.random = window.__rnd0; const rows = [...document.querySelectorAll('.layer .mix-row')]; return { rows: rows.length, inBand: rows.filter((r) => { const d = parseFloat(r.querySelector('.mix-dot').style.left), b = r.querySelector('.mix-band').style, l = parseFloat(b.left), w = parseFloat(b.width); return d >= l && d <= l + w; }).length }; });
  await shot(page, 'mix-start');
  // the keys go to the game on top: a message typed above a rhythm cut cuts nothing
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.startPractice(H.S.game, 'montage', 'facile'); });
  await page.waitForSelector('.layer .mg-intro');
  await page.locator('.layer .mg-intro button', { hasText: 'parti' }).click();
  await page.waitForSelector('.layer .mt-track');
  await sleep(400);
  const k0 = await G(page, () => { const H = window.__hype, run = H.S.practice.game.run || {}; return (run.got || []).length; });
  const theo = await G(page, () => { const H = window.__hype, c = H.charByHandle(H.S.game, 'theo.marlin'); H.openDM(c.id); return c.id; });
  await page.waitForSelector(`#dm-${theo}`);
  await page.focus(`#dm-${theo}`);
  await page.keyboard.type('salut ça va');
  await page.keyboard.press('Enter');
  await sleep(300);
  const typed = await G(page, (id) => { const H = window.__hype, run = H.S.practice.game.run || {}, msgs = (H.S.game.dms[id] || {}).msgs || []; return { got: (run.got || []).length, sent: msgs.some((m) => !m.r && m.text === 'salut ça va') }; }, theo);
  await G(page, () => { const H = window.__hype; H.S.stack = H.S.stack.filter((l) => l.t !== 'dm'); H.update(); });
  await sleep(300);
  await page.keyboard.press('Space');
  await sleep(300);
  const k2 = await G(page, () => { const H = window.__hype, run = H.S.practice.game.run || {}; return (run.got || []).length; });
  check('the mix starts out of the green band (left alone, it scored « moyen »); a message typed above a rhythm cut cuts nothing (the spaces stay in the message), and the game on top gets its key again',
    mixIn.rows >= 2 && mixIn.inBand === 0 && typed.got === k0 && typed.sent && k2 === k0 + 1, { mixIn, k0, typed, k2 });

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  console.log(`\n${checks.filter((c) => c[0] === 'PASS').length}/${checks.length} PASS`);
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
