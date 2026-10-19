// 0.27.4 end to end, in Chromium against the built hype.html with the mocked Claude runtime.
// - the down payment is negotiated: a brand that agrees to one in the DM writes it into the contract (paid at the
//   signature), a bigger one on a signed contract pays the difference at once; a brand that never pays never pays one;
// - several releases can be planned at once (the soonest is the one on the clock), and one can come out sooner, at no cost;
// - the hidden menu (the Konami code, or 7 taps on the money): money, counters, reputation, the clock, skills, ties;
//   a clock set back never pays or bills a month twice.
// - the mini-games: the colour grading is gone (far too hard), and every answer gets two more seconds, at every
//   difficulty (each item, each question or series, each image to find, each chat message, each take of the cut).
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v274.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v274');
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
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit); })) await sleep(250); };
async function dismiss(page) { for (let k = 0; k < 6 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }

async function newPage(browser, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true, colorScheme: 'light' });
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
// An offer of this brand at this price, nothing hidden in it (no scam unless asked), its DM open.
const offer = (page, o) => G(page, (o) => {
  const H = window.__hype, g = H.S.game;
  g.deals = g.deals.filter((x) => x.state !== 'offer');
  const d = H.makeOffer(g, { brand: o.brand, sector: o.sector, product: o.product, shady: false, scam: o.scam || '', gift: false });
  if (!o.scam || o.scam !== 'impaye') Object.assign(d, { fee: o.fee, fee0: o.fee, base: o.fee, max: Math.round(o.fee * 1.3), maxBase: Math.round(o.fee * 1.3), value: 0 }); // (a money contract: no products with it)
  Object.assign(d, { exclusive: false, hard: '', days: 7 });
  delete d.upPct;
  d.upfront = H.upfrontOf(d);
  H.S.stack = []; H.openDM(d.contact); H.update();
  return { id: d.id, c: d.contact, fee: d.fee, upfront: d.upfront };
}, o);
const lastLedger = (page) => G(page, () => { const L = window.__hype.S.game.career.ledger; return L.slice(-3).map((x) => `${x.label} ${x.amount}`); });

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);
  await newGame(page, 'Une créatrice qui touche à tout');
  await G(page, () => { window.__hypeNoGearEvent = true; const g = window.__hype.S.game; g.career.cash = 1000; g.deals = []; g.stats.followers = 5000; }); // (brands write from 800 followers)

  // ---------- the down payment, negotiated ----------
  const a = await offer(page, { brand: 'Thé des Brumes', sector: 'boisson', product: 'son thé fumé', fee: 300 });
  await page.waitForFunction(() => [...document.querySelectorAll('.layer .deal-card')].some((e) => /Thé des Brumes/.test(e.textContent)), null, { timeout: 10000 });
  const a0 = await G(page, (a) => { const H = window.__hype, g = H.S.game, d = H.dealOf(g, a.id); return { summary: H.dealSummary(g, d), terms: H.payTerms(g, d), prompt: H.promptDM(g, g.chars[d.contact], [], 'et pour l’acompte ?'), card: document.querySelector('.layer .deal-card').textContent }; }, a);
  check('a small contract has no down payment by default: the card says it is all paid on delivery, the brand knows it, and knows how to write one into the contract (the "upfront" field, in % of the price, with an example)',
    a.upfront === 0 && a0.terms === 'à la livraison' && /sans acompte \(tout est payé à la livraison\)/.test(a0.summary) && !/Acompte/.test(a0.card)
    && /"upfront":30 \(l’acompte, en\s% du prix, versé à la signature : 0 = tout à la livraison\)/.test(a0.prompt) && /Elle accepte un acompte de 40\s% → \{"t":"deal","upfront":40\}/.test(a0.prompt) && /l’acompte \(la part versée à la signature/.test(a0.prompt), { summary: a0.summary, terms: a0.terms });
  const n0 = await G(page, () => window.__prompts.length);
  await G(page, (a) => window.__hype.sendDM(a.c, 'Ok pour 300 €, mais je voudrais un acompte de 40 % à la signature.'), a);
  await idle(page);
  await sleep(3500);
  const a1 = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, d = H.dealOf(g, a.id);
    const cards = g.dms[d.contact].msgs.filter((m) => m.sys === 'deal');
    return { upPct: d.upPct, upfront: d.upfront, fee: d.fee, cards: cards.length, upd: cards.some((m) => m.upd), terms: H.payTerms(g, d),
      notif: (g.notifs.filter((x) => x.c === d.contact && x.k === 'money').slice(-1)[0] || {}).text || '' };
  }, a);
  await page.waitForSelector('.layer .deal-card');
  const cardA = await page.$$eval('.layer .deal-card', (els) => els.map((e) => e.textContent).pop());
  await shot(page, 'deposit-agreed');
  check('the player asks for a 40 % down payment and the brand agrees in the DM: the contract follows (40 %, 120 € at the signature, a new card, a notice)',
    a1.upPct === 40 && a1.upfront === 120 && a1.fee === 300 && a1.cards >= 2 && a1.upd && /acompte de 40\s% à la signature \(120\s€\)/.test(a1.notif)
    && /Acompte\s*120\s€\s*à la signature/.test(cardA) && a1.terms === '40\u00a0% à la signature, le reste à la livraison', Object.assign({ card: cardA.slice(0, 260) }, a1));
  const a2 = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, d = H.dealOf(g, a.id), c0 = g.career.cash;
    const ok = H.signDeal(g, d);
    const c1 = g.career.cash, led = g.career.ledger.slice(-1)[0];
    H.deliverDeal(g, d, null, true, { tier: 'mid' });
    return { ok, paidAtSign: Math.round((c1 - c0) * 100) / 100, led: led && led.label, rest: Math.round((g.career.cash - c1) * 100) / 100, state: d.state };
  }, a);
  check('signed: the agreed down payment is paid at once (120 €, « Acompte … (40 %) »), the rest at delivery (180 €)',
    a2.ok && a2.paidAtSign === 120 && a2.led === 'Acompte Thé des Brumes (40\u00a0%)' && a2.rest === 180 && a2.state === 'done', a2);

  // a signed contract: a bigger down payment is paid now
  const b = await offer(page, { brand: 'Capes & Co', sector: 'mode', product: 'sa cape d’hiver', fee: 1000 });
  const b0 = await G(page, (b) => { const H = window.__hype, g = H.S.game, d = H.dealOf(g, b.id), c0 = g.career.cash; H.signDeal(g, d); return { upfront: d.upfront, paid: g.career.cash - c0, terms: H.payTerms(g, d), summary: H.dealSummary(g, d) }; }, b);
  await G(page, (b) => window.__hype.sendDM(b.c, 'Le contrat est signé, mais est-ce qu’on peut passer l’acompte à 50 % ? J’ai du matos à avancer.'), b);
  await idle(page);
  await sleep(3500);
  const b1 = await G(page, (b) => {
    const H = window.__hype, g = H.S.game, d = H.dealOf(g, b.id), c0 = g.career.cash, led = g.career.ledger.slice(-1)[0];
    const notif = (g.notifs.filter((x) => x.c === d.contact && x.k === 'money').slice(-1)[0] || {}).text || '';
    const before = c0;
    H.deliverDeal(g, d, null, true, { tier: 'mid' });
    return { upfront: d.upfront, upPct: d.upPct, led: led && `${led.label} ${led.amount}`, notif, rest: Math.round((g.career.cash - before) * 100) / 100 };
  }, b);
  check('a 1 000 € contract: 30 % at the signature by default (300 €); once signed, the brand agrees to 50 %: the 200 € difference comes at once, and 500 € at delivery',
    b0.upfront === 300 && b0.paid === 300 && b0.terms === '30\u00a0% à la signature, le reste à la livraison' && /acompte de 300\s€ \(30\s%\) déjà versé/.test(b0.summary)
    && b1.upfront === 500 && b1.upPct === 50 && b1.led === 'Acompte Capes & Co (complément) 200' && /modifie votre contrat : acompte porté à 50\s% \(\+200\s€ versés tout de suite\)/.test(b1.notif) && b1.rest === 500, { b0, b1 });

  // what the model may write, and the brands that never pay
  const p = await G(page, () => {
    const H = window.__hype, g = H.S.game, d = { fee: 1000 };
    const r = (v) => H.readUpfront(v, d);
    const out = { pct: r('40 %'), num: r(35), money: r('200 €'), big: r(250), no: r(false), non: r('non'), yes: r(true), junk: r('beaucoup'), over: r(140) === 14, none: r(undefined), share: r(0.4) };
    g.deals = g.deals.filter((x) => x.state !== 'offer'); // (a brand may have written meanwhile: two open offers at most)
    const im = H.makeOffer(g, { brand: 'Nébuleuse Prod', sector: 'tech', product: 'son casque', shady: false, scam: 'impaye', gift: false });
    const c = g.chars[im.contact];
    H.applyDealLine(g, c, { upfront: 40 });
    out.imp = { upfront: im.upfront, upPct: im.upPct === undefined, terms: H.payTerms(g, im), prompt: !/"upfront"/.test(H.promptDM(g, c, [], 'un acompte ?')), refuse: /refuse tout acompte/.test(H.promptDM(g, c, [], 'un acompte ?')) };
    const sm = H.makeOffer(g, { brand: 'Grimoires Express', sector: 'tech', product: 'sa liseuse', shady: false, scam: '', gift: false });
    Object.assign(sm, { fee: 800, fee0: 800, base: 800, max: 1000, maxBase: 1000, hard: '', exclusive: false, value: 0 }); sm.upfront = H.upfrontOf(sm);
    const sc = g.chars[sm.contact];
    H.applyDealLine(g, sc, { upfront: '250 €' });
    out.money2 = { pct: sm.upPct, upfront: sm.upfront };
    H.applyDealLine(g, sc, { upfront: 0 });
    out.zero = { pct: sm.upPct, upfront: sm.upfront, terms: H.payTerms(g, sm), notif: (g.notifs.filter((x) => x.c === sm.contact).slice(-1)[0] || {}).text || '' };
    return out;
  });
  check('the model writes the down payment as a percentage (« 40 % », 35), or as an amount (« 200 € », 250 on 1 000 €), or none (false, « non »); nonsense changes nothing',
    p.pct === 40 && p.num === 35 && p.money === 20 && p.big === 25 && p.no === 0 && p.non === 0 && p.yes === null && p.junk === null && p.over && p.none === null && p.share === 40, p);
  check('a brand that never pays: no down payment, even if its contact says yes (the field is not even offered to it, and it refuses with an excuse); before the signature, a deposit can also go down to none',
    p.imp.upfront === 0 && p.imp.upPct && /^en une fois/.test(p.imp.terms) && p.imp.prompt && p.imp.refuse
    && p.money2.pct === 31.25 && p.money2.upfront === 250 && p.zero.pct === 0 && p.zero.upfront === 0 && p.zero.terms === 'à la livraison' && /sans acompte, tout à la livraison/.test(p.zero.notif), { imp: p.imp, money2: p.money2, zero: p.zero });

  // ---------- several releases planned, one sooner at no cost ----------
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.update(); });
  const r0 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now(), HR = 3600000;
    for (const x of g.releases) if (x.state === 'scheduled') x.state = 'dropped';
    window.__hypeEasyGear = true;
    const a = H.scheduleRelease(g, { what: 'vidéo', topic: 'la grande dictée de Lumen', due: t + 26 * HR });
    const b = H.scheduleRelease(g, { what: 'vidéo', topic: 'mes potions ratées', due: t + 2 * HR });
    const c = H.scheduleRelease(g, { what: 'short', topic: 'un sort en 30 secondes', due: t + 5 * HR });
    window.__hypeEasyGear = false;
    H.update();
    return { ok: !!(a && b && c), order: H.plannedReleases(g).map((r) => r.topic), first: H.activeRelease(g).topic, ctx: H.ctxText(g), ann: H.announceLine(g) };
  });
  check('three releases planned at once, in any order: the soonest is the one on the clock; the AI knows all three (and an announcement about one of them is no new one)',
    r0.ok && r0.order.join('|') === 'mes potions ratées|un sort en 30 secondes|la grande dictée de Lumen' && r0.first === 'mes potions ratées'
    && /annoncé une vidéo : « mes potions ratées »/.test(r0.ctx) && /aussi annoncé un short : « un sort en 30 secondes »/.test(r0.ctx) && /aussi annoncé une vidéo : « la grande dictée de Lumen »/.test(r0.ctx)
    && /Déjà prévu : une vidéo « mes potions ratées »/.test(r0.ann) && /pas de ligne "announce"/.test(r0.ann), { order: r0.order, ann: r0.ann.slice(-300) });
  await page.waitForSelector('.release-card .rl-more');
  const more = await page.$eval('.release-card', (e) => e.textContent);
  await shot(page, 'release-card-next');
  await G(page, () => window.__hype.goTab('studio'));
  await page.waitForSelector('.plan-row');
  await page.locator('.plan-row').nth(2).scrollIntoViewIfNeeded();
  const rows = await page.$$eval('.plan-row', (els) => els.map((e) => e.textContent));
  const btn = await G(page, () => { const b = [...document.querySelectorAll('.btn')].find((x) => /Programmer une autre sortie/.test(x.textContent)); return b ? !b.disabled : null; });
  await shot(page, 'programme-three');
  check('the feed shows the next release and what comes after it; the Studio lists the three, each with « Plus tôt » and « Repousser », and another one can still be planned',
    /Ensuite : 📱 « un sort en 30 secondes »/.test(more) && /« la grande dictée de Lumen »/.test(more) && rows.length === 3 && rows.every((t) => /Sortir plus tôt/.test(t) && /Repousser/.test(t))
    && /mes potions ratées/.test(rows[0]) && /la grande dictée/.test(rows[2]) && btn === true, { more, rows });
  const st0 = await G(page, () => { const s = window.__hype.S.game.stats; return { rep: s.reputation, fol: s.followers, log: (s.repLog || []).length }; });
  await page.locator('.plan-row').nth(2).locator('button', { hasText: 'Plus tôt' }).click();
  await page.waitForSelector('.layer .move-opts');
  const opts = await page.$$eval('.layer .move-opts .chip-btn', (els) => els.map((e) => e.textContent));
  await shot(page, 'move-sooner');
  await page.locator('.layer .move-opts .chip-btn', { hasText: /^Dans 1 h$/ }).click();
  await sleep(600);
  const r1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, s = g.stats, r = H.activeRelease(g);
    return { first: r.topic, left: Math.round((r.due - Date.now()) / 60000), rep: s.reputation, fol: s.followers, log: (s.repLog || []).length, layer: H.S.stack.length,
      notif: (g.notifs.filter((x) => x.k === 'release').slice(-1)[0] || {}).text || '', trig: (g.triggers || []).slice(-1)[0] ? g.triggers.slice(-1)[0].text : '' };
  });
  check('« Plus tôt » on the release of tomorrow: the times before it (now, soon, the hours of the planner); « Dans 1 h » brings it to the front, with no cost at all (reputation, followers), and the public is told',
    opts[0] === 'Maintenant' && opts.includes('Dans 1 h') && opts.length >= 6 && r1.first === 'la grande dictée de Lumen' && r1.left >= 58 && r1.left <= 60
    && r1.rep === st0.rep && r1.fol === st0.fol && r1.log === st0.log && r1.layer === 0 && /⏩ Ta vidéo « la grande dictée de Lumen » sort plus tôt/.test(r1.notif) && /avance la sortie/.test(r1.trig), { opts, r1, st0 });
  const r2 = await G(page, () => {
    const H = window.__hype, g = H.S.game, r = H.activeRelease(g), t = Date.now();
    const later = H.advanceRelease(g, r, r.due + 3600000), same = H.advanceRelease(g, r, r.due);
    const now = H.advanceRelease(g, r, t);
    H.update();
    return { later, same, now, due: r.due <= Date.now() + 1000, delays: r.delays };
  });
  await page.waitForSelector('.plan-row.due');
  const due = await page.$eval('.plan-row.due', (e) => e.textContent);
  check('« Plus tôt » only goes earlier (a later or the same time is refused); « Maintenant » makes it due at once (its row offers the shoot), and it is no postponement',
    !r2.later && !r2.same && r2.now && r2.due && r2.delays === 0 && /Tourner/.test(due), { r2, due });
  const r3 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    window.__hypeEasyGear = true;
    const made = [];
    for (let k = 0; k < 6; k++) made.push(!!H.scheduleRelease(g, { what: 'short', topic: `petit format ${k}`, due: t + (30 + k) * 3600000 }));
    window.__hypeEasyGear = false;
    H.update();
    return { made, n: H.plannedReleases(g).length, room: H.planRoom(g) };
  });
  await sleep(300);
  const full = await G(page, () => { const b = [...document.querySelectorAll('.btn')].find((x) => /Programmer une autre sortie/.test(x.textContent)); return { disabled: b ? b.disabled : null, msg: /6 sorties prévues, c’est le maximum/.test(document.body.textContent) }; });
  check('up to six planned at once: then the button waits (« publie-en une d’abord »)', r3.made.join() === 'true,true,true,false,false,false' && r3.n === 6 && !r3.room && full.disabled === true && full.msg, Object.assign({}, r3, full));
  const r4 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    for (const x of g.releases) if (x.state === 'scheduled') x.state = 'dropped';
    window.__hypeEasyGear = true;
    const planned = H.scheduleRelease(g, { what: 'vidéo', topic: 'le bal des maisons', due: t + 50 * 60000 });
    window.__hypeEasyGear = false;
    const dup = H.addRelease(g, { what: 'vidéo', in: 60, topic: 'le bal, enfin' }, { id: 'p_annonce' }, 'ma vidéo sort dans 1h !');
    const other = H.addRelease(g, { what: 'short', in: 1400, topic: 'les coulisses du bal' }, { id: 'p_autre' }, 'demain un short sur les coulisses');
    return { dup: dup === null, post: planned.post, said: planned.said, other: !!other, n: H.plannedReleases(g).length };
  });
  check('a post about a release already planned does not plan a second one (the planned one gets the announcement); a new content announced does',
    r4.dup && r4.post === 'p_annonce' && /sort dans 1h/.test(r4.said) && r4.other && r4.n === 2, r4);
  const r5 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    for (const x of g.releases) if (x.state === 'scheduled') x.state = 'dropped';
    window.__hypeEasyGear = true;
    const one = H.scheduleRelease(g, { what: 'vidéo', topic: 'avant le défi', due: t + 3 * 3600000 });
    const ok = H.startSeries(g, { what: 'short', days: 7, hour: 18, theme: 'un sort par jour', diff: 'moyen' });
    window.__hypeEasyGear = false;
    const ep = H.plannedReleases(g).find((r) => r.series);
    H.endSeries(g, g.series, true);
    return { ok, n: H.plannedReleases(g).length, ep: !!ep, left: H.plannedReleases(g).map((r) => r.topic).join('|'), one: one.state };
  });
  check('a daily upload can start with other releases planned; giving it up drops its episode only', r5.ok && r5.ep && r5.n === 1 && r5.left === 'avant le défi' && r5.one === 'scheduled', r5);
  const r6 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    for (const x of g.releases) if (x.state === 'scheduled') x.state = 'dropped';
    window.__hypeEasyGear = true;
    const a = H.scheduleRelease(g, { what: 'vidéo', topic: 'oubliée', due: t + 60000 });
    const b = H.scheduleRelease(g, { what: 'short', topic: 'la suivante', due: t + 2 * 3600000 });
    window.__hypeEasyGear = false;
    a.due = t - 2 * 3600000;
    H.checkReleases(g, t);
    return { a: a.state, b: b.state, next: H.activeRelease(g) && H.activeRelease(g).topic };
  });
  check('a release forgotten long after its time is given up as before, and the next one takes its place', r6.a === 'dropped' && r6.b === 'scheduled' && r6.next === 'la suivante', r6);
  await G(page, () => { const H = window.__hype, g = H.S.game; for (const x of g.releases) if (x.state === 'scheduled') x.state = 'dropped'; H.goTab('feed'); });

  // ---------- the mini-games: no more grading, two more seconds for each answer ----------
  const mg = await G(page, () => {
    const H = window.__hype, S = H.S, g = S.game, D = (id) => H.DIFFS.find((d) => d.id === id), f = S.mgForce;
    S.mgForce = null;
    const seen = {};
    for (const w of ['vidéo', 'clip', 'short', 'live', 'podcast']) for (let i = 0; i < 700; i++) { g.mgRecent = []; const k = H.pickShootKind(g, { what: w, diff: 'mythique', crew: [] }); seen[w + ':' + k] = 1; }
    const edits = new Set();
    for (const w of ['vidéo', 'clip']) for (let i = 0; i < 40; i++) edits.add(H.makeEdit({ what: w, topic: 'test', diff: 'moyen', played: { kind: 'quiz', diff: 'moyen', score: 0.6, tier: 'mid' } }, g).kind);
    S.mgForce = f;
    const t = (k, n, d) => H.mgTime(k, n, D(d)) + H.mgExtra(k, n);
    return { grading: Object.keys(seen).some((k) => /etalonnage/.test(k)), videoKinds: Object.keys(seen).filter((k) => k.startsWith('vidéo:')).length, edits: [...edits].sort().join(),
      vf: t('vf', 10, 'mythique'), quiz: t('quiz', 4, 'mythique'), tri: t('tri', 9, 'mythique'), ordre: t('ordre', 8, 'mythique'), intrus: t('intrus', 4, 'mythique'), facileQuiz: t('quiz', 3, 'facile'), extra: H.MG_EXTRA };
  });
  check('the colour grading never comes any more (shoot or edit); a video draws among 7 mini-games; every answer has two more seconds, even in Mythique (0.27.9, a notch harder: a true-or-false statement 1,32 → 3,32 s, a quiz question 4,95 → 6,95 s)',
    !mg.grading && mg.videoKinds === 7 && mg.edits === 'montage,tri' && mg.extra === 2000 && mg.vf === 13200 + 20000 && mg.quiz === 4950 + 2000 && mg.tri === 14850 + 18000 && mg.ordre === 23760 + 16000 && mg.intrus === 3960 + 2000 && mg.facileQuiz === 21000 + 2000, mg);
  await G(page, () => { const H = window.__hype, g = H.S.game; for (const x of g.releases) if (x.state === 'scheduled') x.state = 'dropped'; H.update(); });
  const vfId = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    window.__hypeEasyGear = true;
    const r = H.scheduleRelease(g, { what: 'vidéo', topic: 'les potions de Lumen', due: Date.now() + 60000 });
    window.__hypeEasyGear = false;
    r.due = Date.now() - 1000; r.diff = 'mythique'; r.devis = { total: 0, items: [], topic: r.topic, at: Date.now() };
    H.S.mgForce = 'vf';
    H.genShoot(r);
    H.S.stack = []; H.openLayer({ t: 'minigame', id: r.id }); H.update();
    return r.id;
  });
  await page.waitForSelector('.layer .mg-intro', { timeout: 10000 });
  const vfIntro = await G(page, (id) => { const H = window.__hype, r = H.S.game.releases.find((x) => x.id === id); const k = !H.easyGear() && H.hasBonus(H.S.game, 'prompteur') ? 1.15 : 1; return { text: document.querySelector('.layer .mg-intro').textContent, n: r.game.items.length, k, clock: H.mgClock('vf', r.game.items, H.DIFFS.find((d) => d.id === 'mythique'), k), old: Math.round(H.mgTime('vf', r.game.items.length, H.DIFFS.find((d) => d.id === 'mythique')) * k) + H.mgExtra('vf', r.game.items.length) }; }, vfId);
  const vfSec = Math.round(vfIntro.clock / 1000); // (0.27.5: by what there is to read, never less than the 0.27.4 clock; a prompter gives more)
  check('on screen: the rule of the shoot says the new time (true or false in Mythique: two more seconds per statement at least)', new RegExp(`Tranche vite : ${vfSec} secondes pour tout`).test(vfIntro.text) && vfIntro.clock >= vfIntro.old, { n: vfIntro.n, want: vfSec, clock: vfIntro.clock, old: vfIntro.old, text: vfIntro.text.slice(0, 260) });
  await G(page, () => { const H = window.__hype, g = H.S.game; H.S.mgForce = null; for (const x of g.releases) if (x.state === 'scheduled') x.state = 'dropped'; H.S.stack = []; H.update(); });

  // ---------- the hidden menu ----------
  const press = async (keys) => { for (const k of keys) { await page.keyboard.press(k); await sleep(40); } };
  const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  await G(page, () => { const i = document.createElement('input'); i.id = 'tmp-in'; document.body.appendChild(i); i.focus(); });
  await press(CODE);
  const inField = await G(page, () => ({ open: window.__hype.S.stack.some((l) => l.t === 'cheat'), on: window.__hype.menuOn() }));
  await G(page, () => { const i = document.getElementById('tmp-in'); i.blur(); i.remove(); });
  await press(['ArrowUp', 'ArrowDown', 'b', 'a']);
  const wrong = await G(page, () => window.__hype.S.stack.some((l) => l.t === 'cheat'));
  await press(CODE);
  await page.waitForSelector('.layer .trainer', { timeout: 5000 });
  const m0 = await G(page, () => ({ on: window.__hype.menuOn(), ls: localStorage.getItem('hype:menu'), title: document.querySelector('.layer .layer-head h2').textContent, text: document.querySelector('.layer').textContent }));
  await shot(page, 'menu-open');
  check('the Konami code opens the hidden menu (typed in a text field, or wrong, nothing); it stays unlocked',
    !inField.open && !inField.on && !wrong && m0.on && m0.ls === '1' && m0.title === '🛠️ Mode menu' && /Argent/.test(m0.text) && /Réputation/.test(m0.text) && /Temps/.test(m0.text) && /Compétences/.test(m0.text) && /Relations/.test(m0.text) && /abonnés/.test(m0.text), { inField, wrong, title: m0.title });
  await G(page, () => { window.__hype.S.modals = []; window.__hype.update(); }); // (what the game had to say meanwhile)
  await dismiss(page);
  // (0.27.9: the trainer menu: « Argent et abonnés », then each line typed: Entrée opens its field, Entrée sets it)
  const typeIn = async (text) => { await page.keyboard.press('Enter'); await page.waitForSelector('.layer .tr-edit'); await page.fill('.layer .tr-edit', text); await page.keyboard.press('Enter'); await sleep(150); };
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => /Argent et abonnés/.test((document.querySelector('.layer .tr-sub') || {}).textContent || ''));
  await typeIn('50 000');
  await page.keyboard.press('ArrowDown'); await typeIn('123456');
  await page.keyboard.press('ArrowDown'); await typeIn('999');
  const lv0 = await G(page, () => { const H = window.__hype, g = H.S.game; return { level: g.stats.level, unlocked: H.mains(g).length, locked: H.mains(g, false).length - H.mains(g).length }; });
  await page.keyboard.press('ArrowDown'); await typeIn(String(lv0.level + 2));
  await sleep(300);
  const m1 = await G(page, () => { const H = window.__hype, g = H.S.game; return { cash: g.career.cash, fol: g.stats.followers, gems: g.stats.gems, level: g.stats.level, xp: g.stats.xp, unlocked: H.mains(g).length }; });
  check('money, followers, gems and level set from the menu (« 50 000 » is 50 000); a higher level brings the characters it unlocks',
    m1.cash === 50000 && m1.fol === 123456 && m1.gems === 999 && m1.level === lv0.level + 2 && m1.xp === 0 && m1.unlocked === lv0.unlocked + Math.min(2, lv0.locked), { m1, lv0 });
  const m2 = await G(page, () => {
    const H = window.__hype, g = H.S.game, s = g.stats;
    s.cancelled = true;
    H.menuApply(g, { rep: { image: '900', cred: '900', pro: '900', kind: '900' } });
    const rep = { r: s.reputation, cancelled: s.cancelled, p: Object.values(s.rep4) };
    H.menuApply(g, { skills: { charisme: '20', humour: '50', audace: '99', creativite: '0' } });
    const sk = { ch: H.skillLevel(g, 'charisme'), hu: H.skillLevel(g, 'humour'), au: H.skillLevel(g, 'audace'), cr: H.skillLevel(g, 'creativite') };
    const c = H.mains(g)[0];
    H.menuApply(g, { rel: { [c.id]: '75' } });
    return { rep, sk, rel: c.rel };
  });
  check('the reputation pillars on 1000 (900 everywhere: 900/1000, and out of a cancel by the usual rule), the skills on 50 (capped), a tie from −100 to +100',
    m2.rep.r === 90 && !m2.rep.cancelled && m2.rep.p.every((x) => x === 90) && m2.sk.ch === 20 && m2.sk.hu === 50 && m2.sk.au === 50 && m2.sk.cr === 0 && m2.rel === 75, m2);
  const m3 = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = g.career, t = Date.now(), DAY = 86400000;
    const key = (x) => H.gameDate(x).getFullYear() + '-' + String(H.gameDate(x).getMonth() + 1).padStart(2, '0');
    const target = new Date(H.gameDate(t).getTime()); target.setHours(21, 30, 0, 0);
    H.menuApply(g, { at: target.getTime() });
    const shown = H.gameDate(Date.now());
    const clock = { h: shown.getHours(), m: shown.getMinutes() };
    // the month: a clock set back pays and bills nothing; the next month comes once
    c.estMonth = key(Date.now()); c.est = 100; c.owed = 0;
    if (g.gear) g.gear.bill = key(Date.now());
    const cash0 = c.cash;
    H.menuApply(g, { at: H.gameDate(Date.now()).getTime() - 40 * DAY });
    const back = { pay: H.checkPayout(g, Date.now()), est: c.est, cash: c.cash === cash0, bill: g.gear ? g.gear.bill : null, billed: H.billGear(g, Date.now()) };
    H.menuApply(g, { at: H.gameDate(Date.now()).getTime() + 80 * DAY });
    const fwd = { pay: H.checkPayout(g, Date.now()), est: c.est, paid: Math.round((c.cash - cash0) * 100) / 100, again: H.checkPayout(g, Date.now()), month: c.estMonth === key(Date.now()) };
    return { clock, back, fwd };
  });
  check('the clock set from the menu shows the time asked; set back a month, nothing is paid or billed twice; the next month pays once (no double payout)',
    m3.clock.h === 21 && m3.clock.m === 30 && m3.back.pay === false && m3.back.est === 100 && m3.back.cash && m3.back.billed === false && m3.fwd.pay === true && m3.fwd.paid === 100 && m3.fwd.again === false && m3.fwd.month, m3);
  await G(page, () => { const H = window.__hype; H.menuApply(H.S.game, { at: Date.now() }); H.S.stack = []; H.update(); });
  await sleep(300);
  await G(page, () => window.__hype.openLayer({ t: 'settings' }));
  await page.waitForSelector('.layer .section');
  const inSettings = await G(page, () => /🛠️ Mode menu/.test(document.querySelector('.layer').textContent));
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.update(); });
  await G(page, () => { window.__hype.S.modals = []; window.__hype.update(); });
  await dismiss(page);
  for (let k = 0; k < 7; k++) { await page.click('.cash-chip'); await sleep(60); }
  await sleep(300);
  const taps = await G(page, () => window.__hype.S.stack.some((l) => l.t === 'cheat'));
  await page.locator('.layer .tr-line', { hasText: 'Masquer le mode menu' }).click();
  await sleep(300);
  const hidden = await G(page, () => ({ on: window.__hype.menuOn(), open: window.__hype.S.stack.some((l) => l.t === 'cheat') }));
  check('once unlocked, the menu is in the settings; 7 quick taps on the money open it too (on a phone); « Masquer » hides it again',
    inSettings && taps && !hidden.on && !hidden.open, { inSettings, taps, hidden });

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  console.log(`\n${checks.filter((c) => c[0] === 'PASS').length}/${checks.length} PASS`);
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
