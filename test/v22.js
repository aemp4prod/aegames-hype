// 0.22 end to end, in Chromium against the built hype.html with the mocked Claude runtime:
// - the memberships: where and when they open, what they cost and promise, how many join (audience, warmth, price,
//   promises), paid each month less the platform's share, a broken promise, early access and members-only lives;
// - the merch: a collection (pieces, prices, design, made on demand or in stock), launched with a post the AI judges,
//   sold for a few weeks and paid each week; stock, sold out and restock; a bad batch; prices too high.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v22.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v22');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(path.join(ROOT, 'hype.html'), 'utf8');
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
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.devis); })) await sleep(250); };
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
// A release shot and edited, its upload screen open.
async function readyRelease(page, what, topic) {
  return G(page, ([w, tp]) => {
    const H = window.__hype, g = H.S.game;
    const r = H.scheduleRelease(g, { what: w, topic: tp, due: Date.now() + 60000 });
    r.due = Date.now() - 1000;
    r.played = { tier: 'mid', score: 0.7, diff: 'normal' };
    r.edit = { m: 0.6, by: 'me', s0: 0.7 };
    r.render = { done: true };
    r.thumb = { kind: 'preset', preset: 'propre', ctr: 0.1 };
    H.openLayer({ t: 'minigame', id: r.id }); H.update();
    return r.id;
  }, [what, topic]);
}
const studio = async (page, sel) => { await G(page, () => { const H = window.__hype; H.S.stack = []; H.goTab('studio'); H.update(); }); await sleep(500); if (sel) await page.locator(sel).first().scrollIntoViewIfNeeded(); await sleep(200); };

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);
  await newGame(page, 'Une youtubeuse qui fait des reportages sur la nature de l’académie');
  await G(page, () => { const H = window.__hype, g = H.S.game; g.career.platform = 'youtube'; g.stats.followers = 600; g.career.prog = { state: 'none' }; g.career.warmth = 60; window.__hypeNoGearEvents = true; H.update(); });

  // ---------- the memberships ----------
  const gate = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    out.small = H.membCan(g).why;
    g.stats.followers = 40000; out.noProg = H.membCan(g).why;
    g.career.platform = 'twitch'; out.twitch = H.membCan(g).why;
    g.career.platform = 'instagram'; out.insta = H.membCan(g).ok;
    g.career.platform = 'youtube'; g.career.prog = { state: 'on', at: Date.now() }; out.yt = H.membCan(g).ok;
    return out; });
  await studio(page, '.memb');
  await shot(page, 'memb-setup');
  const setupTxt = await G(page, () => (document.querySelector('.memb') || {}).textContent || '');
  await page.locator('.memb .chip-btn', { hasText: '4,99 € par mois' }).click();
  await page.locator('.memb .btn-hot', { hasText: 'Ouvrir les adhésions' }).click();
  await sleep(400);
  const opened = await G(page, () => { const H = window.__hype, g = H.S.game, m = H.membOf(g); return { on: m.on, price: m.price, perks: m.perks, members: m.members, target: H.membTarget(g), trig: (g.triggers || []).some((x) => /adhésions payantes/.test(x.text)) }; });
  check('the memberships open on YouTube with the partner program and 1 000 subscribers (Instagram: 10 000; on Twitch, the paying subs are in the lives already); 1,99, 4,99 or 9,99 € a month, a badge and promises; the community hears of it',
    /1\s000 abonnés/.test(gate.small) && /Programme Partenaire/.test(gate.noProg) && /Twitch/.test(gate.twitch) && gate.insta === true && gate.yt === true && /1,99 € par mois/.test(setupTxt) && /9,99 € par mois/.test(setupTxt) && /avant-première/.test(setupTxt) && /garde 30 %/.test(setupTxt)
      && opened.on && opened.price === 4.99 && opened.perks.join() === 'badge,avant' && opened.target > 100 && opened.trig, { gate, opened, setupTxt: setupTxt.slice(0, 200) });

  const grow = await G(page, () => {
    const H = window.__hype, g = H.S.game, m = H.membOf(g), day = 86400000, t0 = Date.now(), out = {};
    for (let k = 1; k <= 20; k++) H.tickMemb(g, t0 + k * day);
    out.after20 = m.members; out.target = H.membTarget(g);
    // what moves the target: warmth, price, promises
    const w0 = g.career.warmth; g.career.warmth = 90; out.warm = H.membTarget(g); g.career.warmth = w0;
    m.price = 9.99; out.dear = H.membTarget(g); m.price = 1.99; out.cheap = H.membTarget(g); m.price = 4.99;
    out.net = H.membNet(g);
    // a month paid: the promise kept (an early video this month)
    const t = t0 + 21 * day, est0 = g.career.est;
    m.paidKey = '2000-01'; m.monthAt = t - 30 * day; m.done = { avant: t - 2 * day }; m.day = H.gameDay(t) - 1;
    H.tickMemb(g, t);
    out.paid = Math.round((g.career.est - est0) * 100) / 100; out.expect = Math.round(m.members * 4.99 * 0.7 * 100) / 100;
    out.ledger = (g.career.ledger.slice(-1)[0] || {}).label || ''; out.notif = (g.notifs.find((x) => /^👑 Adhésions/.test(x.text)) || {}).text || ''; out.unmet = m.unmet;
    // the next month: no early video, a promise broken
    const t2 = t + 31 * day, n0 = m.members, w1 = g.career.warmth;
    m.paidKey = '2000-02'; m.monthAt = t2 - 30 * day; m.day = H.gameDay(t2) - 1;
    H.tickMemb(g, t2);
    out.broken = { before: n0, after: m.members, unmet: m.unmet, warm: Math.round((g.career.warmth - w1) * 10) / 10, notif: (g.notifs.find((x) => /n’ont pas eu leur vidéo en avant-première/.test(x.text)) || {}).text || '' };
    out.ctx = H.commuCtx(g);
    // back to the present (the ticks above ran weeks ahead): this month starts now (0.27.4: a month key ahead of the
    // clock no longer passes for a new month)
    const dn = H.gameDate(Date.now());
    m.paidKey = dn.getFullYear() + '-' + String(dn.getMonth() + 1).padStart(2, '0'); m.monthAt = Date.now(); m.day = H.gameDay(Date.now());
    return out; });
  check('members come little by little toward what the audience gives (about 0,2 % at lukewarm, more when warm or cheaper, fewer at 9,99 €); each month paid with the month’s revenue, less the platform’s 30 %',
    grow.after20 > 100 && grow.after20 <= grow.target * 1.15 && grow.warm > grow.target && grow.cheap > grow.target && grow.dear < grow.target && Math.abs(grow.paid - grow.expect) < 0.05 && grow.paid > 0 && /Adhésions de janvier/.test(grow.ledger) && /membres/.test(grow.notif) && grow.unmet === false, grow);
  check('a month without the promised early video: some members leave (−15 %), the community cools, they complain; the AI knows how many pay and what they were promised',
    grow.broken.after < grow.broken.before && grow.broken.after / grow.broken.before > 0.75 && grow.broken.after / grow.broken.before < 0.95 && grow.broken.unmet && grow.broken.warm < 0 && /certains s’en vont/.test(grow.broken.notif)
      && /membres payants \(adhésions à 4,99 € par mois, promis : vidéos en avant-première\)/.test(grow.ctx), { broken: grow.broken, ctx: grow.ctx });

  // the promises kept by the releases: a video in early access, a members-only live
  await readyRelease(page, 'vidéo', 'les lucioles de la forêt, la nuit');
  await page.waitForSelector('.upload .up-memb', { timeout: 8000 });
  await page.locator('.upload .up-memb input').check();
  await sleep(200);
  const avNote = await page.textContent('.upload .up-memb');
  await shot(page, 'upload-early-access');
  await page.locator('.upload .btn-hot', { hasText: 'Publier' }).click();
  await page.waitForSelector('.video-card', { timeout: 20000 });
  await idle(page);
  await sleep(1200);
  const av = await G(page, () => { const H = window.__hype, g = H.S.game, m = H.membOf(g); const p = g.posts.filter((x) => x.a === 'p' && x.video && x.video.views).sort((a, b) => b.ts - a.ts)[0]; return { memb: p.video.memb, done: Date.now() - (m.done.avant || 0) < 600000, chip: !!document.querySelector('.memb-chip'), prompt: window.__prompts.some((x) => /l’ont vue 48 h avant tout le monde/.test(x)) }; });
  await G(page, () => { const H = window.__hype; H.openMemb(H.S.game, 4.99, ['avant', 'live']); });
  await readyRelease(page, 'live', 'balade de nuit en direct avec vous');
  await page.waitForSelector('.upload .up-memb', { timeout: 8000 });
  const liveNote = await page.textContent('.upload .up-memb');
  await page.locator('.upload .up-memb input').check();
  await page.locator('.upload .btn-hot', { hasText: 'Lancer le live' }).click();
  await page.waitForSelector('.video-card', { timeout: 20000 });
  await idle(page);
  await sleep(1200);
  const lv = await G(page, () => { const H = window.__hype, g = H.S.game, m = H.membOf(g); const p = g.posts.filter((x) => x.a === 'p' && x.video && x.video.what === 'live').sort((a, b) => b.ts - a.ts)[0]; return { memb: p && p.video.memb, done: Date.now() - (m.done.live || 0) < 600000, prompt: window.__prompts.some((x) => /RÉSERVÉ À SES MEMBRES/.test(x)) }; });
  check('the upload screen offers the promises: a video in early access for the members, a live for the members only (far fewer viewers); published, the promise of the month is kept, the video says so, the AI knows',
    /En avant-première pour tes membres/.test(avNote) && /48 h avant tout le monde/.test(avNote) && av.memb === 'avant' && av.done && av.chip && av.prompt && /Réservé à tes membres/.test(liveNote) && lv.memb === 'live' && lv.done && lv.prompt, { avNote, av, liveNote, lv });
  await studio(page, '.memb');
  await shot(page, 'memb-on');
  const onTxt = await G(page, () => (document.querySelector('.memb.on') || {}).textContent || '');
  const close = await G(page, () => { const H = window.__hype, g = H.S.game, w = g.career.warmth; const ok = H.closeMemb(g); return { ok, members: H.membOf(g).members, warm: Math.round((g.career.warmth - w) * 10) / 10 }; });
  check('« Ta commu » follows them: members, the price, what each brings, the promises kept this month; closing them cools the community',
    /membres/.test(onTxt) && /4,99 € par mois/.test(onTxt) && /fait ce mois-ci/.test(onTxt) && /Fermer les adhésions/.test(onTxt) && close.ok && close.members === 0 && close.warm < 0, { onTxt: onTxt.slice(0, 220), close });

  // ---------- the merch ----------
  await G(page, () => { const H = window.__hype, g = H.S.game; g.stats.followers = 4000; H.update(); });
  await studio(page, '.boutique');
  const shut = await G(page, () => (document.querySelector('.boutique') || {}).textContent || '');
  await G(page, () => { const H = window.__hype, g = H.S.game; g.stats.followers = 40000; g.career.warmth = 60; g.career.cash = 5000; H.update(); });
  await sleep(300);
  await page.locator('.boutique .chip-btn', { hasText: 'Sweat' }).click();
  await page.fill('#mi-design', 'une luciole néon et « la nuit est à nous »');
  await sleep(200);
  await page.locator('.boutique').scrollIntoViewIfNeeded();
  await shot(page, 'merch-form');
  const formTxt = await G(page, () => document.querySelector('.boutique').textContent);
  await page.locator('.boutique .btn-hot', { hasText: 'Préparer le drop' }).click();
  await sleep(400);
  const ready = await G(page, () => { const H = window.__hype, g = H.S.game, d = H.openDrop(g); return d ? { state: d.state, maker: d.maker, items: d.items.map((x) => x.k + ':' + x.price), cash: g.career.cash } : null; });
  const readyTxt = await G(page, () => (document.querySelector('.boutique .drop-card') || {}).textContent || '');
  check('« Ta boutique » opens at 10 000 subscribers: up to three pieces, their prices (fair ones suggested), the design, made on demand (nothing ahead) or in stock; set, it waits for the post that launches it',
    /10\s000 abonnés/.test(shut) && /T-shirt/.test(formTxt) && /fabrication : 12/.test(formTxt) && /À la demande/.test(formTxt) && /Usine en ligne/.test(formTxt)
      && ready && ready.state === 'ready' && ready.maker === 'pod' && ready.items.join() === 'tshirt:25,sweat:49' && ready.cash === 5000 && /Ton drop est prêt/.test(readyTxt) && /Le lancer avec un post/.test(readyTxt), { shut: shut.slice(0, 80), formTxt: formTxt.slice(0, 200), ready, readyTxt });
  await page.locator('.boutique .btn-hot', { hasText: 'Le lancer avec un post' }).click();
  await page.waitForSelector('.merch-hint', { timeout: 8000 });
  const comp = await G(page, () => ({ title: (document.querySelector('.layer h2') || {}).textContent || '', hint: document.querySelector('.merch-hint').textContent, text: document.getElementById('compose').value }));
  await shot(page, 'merch-compose');
  await G(page, () => { window.__mockMerch = 4; });
  await page.fill('#compose', 'Mon merch est là : la luciole néon, pour les noctambules 🌙');
  await page.locator('.layer .btn-hot', { hasText: 'Lancer' }).click();
  await page.waitForSelector('.post', { timeout: 15000 });
  await idle(page);
  await sleep(1500);
  const live = await G(page, () => { const H = window.__hype, g = H.S.game, d = H.openDrop(g); return { state: d && d.state, desir: d && d.desir, notif: (g.notifs.find((x) => /Ton merch est en vente/.test(x.text)) || {}).text || '', prompt: window.__prompts.some((x) => /LANCE SON MERCH/.test(x) && /"merch":3/.test(x)), warm: (g.career.warmLog || []).some((x) => /prix honnête/.test(x.why)), trig: (g.triggers || []).some((x) => /vient de lancer son merch/.test(x.text)) }; });
  check('the post launches it: the composer says what it launches; the AI judges how much people want it (here 4 out of 5); fair prices warm the community; the characters will talk about it',
    /Lancer ton merch/.test(comp.title) && /Ton post lance ton merch/.test(comp.hint) && /t-shirt à 25/.test(comp.hint) && /Mon merch est enfin là/.test(comp.text) && live.state === 'live' && live.desir === 4 && /en vente/.test(live.notif) && live.prompt && live.warm && live.trig, { comp, live });

  const sales = await G(page, () => {
    const H = window.__hype, g = H.S.game, d = H.openDrop(g), day = 86400000, out = {};
    const t0 = d.launchAt, cash0 = g.career.cash;
    for (let k = 1; k <= 8; k++) H.tickMerch(g, t0 + k * day);
    out.sold = d.sold; out.byItem = d.items.map((x) => x.k + ':' + x.sold); out.paid = Math.round((g.career.cash - cash0) * 100) / 100; out.revenue = d.revenue;
    out.notif = (g.notifs.find((x) => /Ta boutique : /.test(x.text)) || {}).text || '';
    out.ctx = H.merchCtx(g);
    const s8 = d.sold; for (let k = 9; k <= 20; k++) H.tickMerch(g, t0 + k * day); out.later = d.sold - s8; // it fades
    H.tickMerch(g, t0 + 36 * day); out.state = d.state; out.end = (g.notifs.find((x) => /Fin de ton drop/.test(x.text)) || {}).text || '';
    return out; });
  check('orders come for a few weeks (fewer and fewer), paid each week (on demand: the making of each piece and 3 % of fees taken off); the AI knows what is on sale; after five weeks, the drop is over',
    sales.sold > 100 && sales.byItem.every((x) => +x.split(':')[1] > 0) && sales.paid > 0 && sales.paid < sales.revenue * 0.6 && /pièces vendues cette semaine/.test(sales.notif) && /Son merch est en vente/.test(sales.ctx) && sales.later < sales.sold && sales.state === 'done' && /Fin de ton drop/.test(sales.end), sales);

  const stock = await G(page, () => {
    const H = window.__hype, g = H.S.game, day = 86400000, out = {};
    g.career.cash = 2000; g.career.warmth = 60;
    const x = H.prepDrop(g, { maker: 'usine', design: 'logo luciole', items: [{ k: 'tshirt', price: 25, qty: 50 }] });
    out.ok = x.ok; out.paidAhead = 2000 - g.career.cash;
    const d = x.d; d.bad = true; // (this factory's batch is bad: nothing says so before the orders)
    H.launchDrop(g, d, 3, null, Date.now());
    const w0 = g.career.warmth, c0 = g.career.cash;
    for (let k = 1; k <= 6; k++) H.tickMerch(g, d.launchAt + k * day);
    out.stock = d.items[0].stock; out.sold = d.sold; out.out = (g.notifs.find((n) => /Rupture de stock/.test(n.text)) || {}).text || '';
    out.bad = !!d.badAt; out.complain = (g.notifs.find((n) => /se plaignent de ton merch/.test(n.text)) || {}).text || ''; out.warm = Math.round((g.career.warmth - w0) * 10) / 10;
    const c1 = g.career.cash; out.restock = H.restock(g, d, 'tshirt', 100); out.restockCost = Math.round(c1 - g.career.cash); out.stock2 = d.items[0].stock;
    H.stopDrop(g, d);
    // prices far above what fans expect: the community cools
    const y = H.prepDrop(g, { maker: 'pod', design: 'logo luciole doré', items: [{ k: 'tshirt', price: 60 }] });
    const w2 = g.career.warmth; H.launchDrop(g, y.d, 3, null, Date.now()); out.dear = Math.round((g.career.warmth - w2) * 10) / 10;
    out.dearLog = (g.career.warmLog || []).slice(-1)[0].why;
    return out; });
  check('in stock: paid ahead (50 t-shirts from the online factory: 250 €), sold until sold out (told), restocked; a bad batch shows with the first deliveries (complaints, refunds, the community cools); prices far too high cool it too',
    stock.ok && stock.paidAhead === 250 && stock.stock === 0 && stock.sold === 50 && /Rupture de stock/.test(stock.out) && stock.bad && /se plaignent de ton merch/.test(stock.complain) && stock.warm < -3
      && stock.restock === true && stock.restockCost === 500 && stock.stock2 === 100 && stock.dear < 0 && /hors de prix/.test(stock.dearLog), stock);
  // a friend proposes to film a video together while the player has only a phone: it becomes a vertical video, never a refusal
  const col = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {}, easy = window.__hypeEasyGear;
    window.__hypeEasyGear = false;
    const pc0 = g.gear.items.pc; g.gear.items.pc = null; g.releases = g.releases.filter((x) => x.state !== 'scheduled');
    const t = H.charByHandle(g, 'theo.marlin'); t.rel = 45;
    const iv = H.addInvite(g, t, { what: 'Tourner une vidéo ensemble au local, une démo sur les platines', day: 1, at: '19:00' });
    const r = iv && H.acceptInvite(g, iv);
    out.state = iv && iv.state; out.what = r && r.what; out.collab = !!(r && r.collab === t.id);
    out.notif = (g.notifs.find((x) => /Sans ordinateur pour monter une vidéo longue/.test(x.text)) || {}).text || '';
    out.toast = H.S.toasts.map((x) => x.text).filter((x) => /Il te faut un ordinateur/.test(x)).length;
    g.releases = g.releases.filter((x) => x.state !== 'scheduled'); g.gear.items.pc = pc0; window.__hypeEasyGear = easy;
    return out; });
  check('a friend proposes to film a video together and the player has only a phone: accepted, it becomes a vertical video they shoot on the phone (told), never a refusal',
    col.state === 'accepted' && col.what === 'short' && col.collab && /au téléphone/.test(col.notif) && col.toast === 0, col);

  // a release programmed for an hour a few minutes away comes out today, not tomorrow (« 21 h » at 20:52: in 8 minutes)
  const nx = await G(page, () => { const H = window.__hype, now = Date.now(), d = H.gameDate(now); const h = (d.getHours() + 1) % 24; const want = (60 - d.getMinutes()) * 60000 - d.getSeconds() * 1000 - d.getMilliseconds(); return { left: H.nextAt(h, 0, now), want: now + want, gap: want }; });
  check('a release programmed for an hour a few minutes away comes out today, not tomorrow', nx.gap < 60000 || Math.abs(nx.left - nx.want) < 2000, { left: nx.left - nx.want, gap: nx.gap });

  // 0.22.1: two dates the same day; the watch goes to the first: for the AI, the second is still to come (its day, its hour,
  // the time left), the story stops at now; now and then (forced here) the person mixes up the hour, said a mistake in the DM
  await idle(page);
  const ag = await G(page, async () => {
    const H = window.__hype, g = H.S.game, out = {};
    g.releases = g.releases.filter((x) => x.state !== 'scheduled');
    g.events = (g.events || []).filter((e) => !e.player);
    const ms = H.mains(g);
    const a = H.charByHandle(g, 'theo.marlin'), b = ms.find((c) => c !== a);
    a.rel = 45; b.rel = 45; b.unlocked = true;
    const e1 = H.addEvent(g, { by: a.handle, kind: 'rdv', what: 'Un café au Lumen pour parler de la collab', in: 120 }, { dm: a.id });
    const e2 = H.addEvent(g, { by: b.handle, kind: 'rdv', what: 'Au local : démo vidéo sur les platines avant l’ouverture', in: 360 }, { dm: b.id });
    if (!e1 || !e2) return { made: false };
    e1.mixRoll = false; e2.mixRoll = true;
    const n0 = window.__prompts.length;
    await H.skipTime(e1.due - Date.now() + 1000, () => e1.due);
    for (let k = 0; k < 80 && H.S.busy.refresh; k++) await new Promise((r) => setTimeout(r, 250));
    const p = window.__prompts.slice(n0).find((x) => x.includes('Le temps passe en accéléré')) || '';
    const line = p.split('\n').find((x) => x.includes('@' + b.handle) && x.includes('Rendez-vous prévu')) || '';
    out.made = true; out.line = line;
    out.window = (p.match(/viennent de s’écouler \(([^)]*)\)/) || [])[1] || '';
    out.rule = p.includes('Ces rendez-vous n’ont pas encore eu lieu') && p.includes('Les rendez-vous de l’agenda encore à venir n’ont pas eu lieu pendant ce temps');
    out.mix = p.split('\n').some((x) => x.includes('s’emmêler les pinceaux') && x.includes('@' + b.handle));
    out.asked = !!e2.mixAsked; out.again = H.mixPick(g) === null; out.still = e2.state === 'scheduled';
    // the DM: the day of each message, and a « passé » of theirs said a mistake
    const t = Date.now();
    const hist = [{ me: false, text: 'parfait, à demain 19 h alors', ts: t - 20 * 3600000 }, { me: false, text: 'Le créneau de 19 h est passé sans notre démo. J’ai rangé pour l’ouverture.', ts: t - 60000 }];
    const dm = H.promptDM(g, b, hist, 'Le rendez-vous est pour aujourd’hui ? il n’est pas encore 19 h ?');
    out.dmDate = (dm.split('\n').find((x) => x.startsWith('Rendez-vous prévu entre eux')) || '');
    out.dmDays = dm.split('\n').filter((x) => /^\[(aujourd’hui|hier)/.test(x) || /^\[[a-z]+ \d+ [a-zéû]+\]$/.test(x));
    out.cancel = dm.includes('une confusion sur l’heure ou le jour');
    out.due = H.dueText(e2.due);
    return out; });
  check('two dates the same day, the watch goes to the first: for the AI the second is still to come (its day, its hour, the time left), the skipped stretch is named; a mix-up of the hour (forced) is offered once and said a mistake in the DM',
    ag.made && / à \d+ h[^(]*\((aujourd’hui|demain), dans [^)]*\) : pas encore passé/.test(ag.line) && /^(ce |du )/.test(ag.window) && ag.rule && ag.mix && ag.asked && ag.again && ag.still
      && /pas encore passé/.test(ag.dmDate) && /c’était une erreur de sa part/.test(ag.dmDate) && ag.dmDays.length >= 1 && ag.cancel, ag);
  await idle(page);
  await dismiss(page);

  // 0.22.2: a kiss on a date nobody saw stays between the two of them: the best friend does not know an hour later
  // (no jealousy at once, nothing in what the AI reads for her, no weight on her own date); word of mouth may carry it
  // hours later (then she knows, and it stings); a date seen in public, everyone may know at once
  const kn = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    const a = H.charByHandle(g, 'theo.marlin'), b = H.mains(g).find((c) => c !== a);
    b.unlocked = true;
    Object.assign(a, { vibe: 'flirt', rel: 60, followers: 3000, temper: 'trouble', knows: {}, cool: null, age: 24 });
    Object.assign(b, { vibe: 'crush', rel: 50, followers: 3000, coeur: 'serein', knows: {}, cool: null, age: 23 });
    H.setTie(g, a.id, b.id, 70);
    g.whispers = []; g.triggers = []; g.events = (g.events || []).filter((e) => !e.player);
    const f0 = g.stats.followers; g.stats.followers = 3000;
    window.__trustRolls = [0.1]; // Théo tells it (the talkative kind)
    const ev = { id: 'evKiss', kind: 'rdv', c: a.id, player: true, what: 'Un dîner aux chandelles', diff: 'facile', due: Date.now(), state: 'scheduled', played: { tier: 'top', score: 0.9, diff: 'facile' }, talk: { reacts: [{ r: 'charme', g: 'bisou', w: 1.5 }], lines: [], ex: { pub: false } } };
    const r0 = b.rel;
    H.dateOutcome(g, ev, a);
    const chron = g.chronicle[g.chronicle.length - 1];
    out.priv = !!(chron && chron.who && chron.who[0] === a.id && /ont eu un rendez-vous/.test(chron.text));
    out.noTrig = !g.triggers.some((x) => x.c === b.id);
    out.relSame = b.rel === r0;
    out.unknown = !(b.knows && b.knows[a.id]);
    const dm = H.promptDM(g, b, [], 'tu fais quoi ce soir ?');
    const lab = (p) => { const i = p.indexOf(`@${a.handle} +`); return i < 0 ? '' : p.slice(i, p.indexOf(')', i) + 1); }; // his line among the others
    out.dmLab = lab(dm);
    out.dmClean = !dm.includes('ont eu un rendez-vous (« Un dîner aux chandelles »') && /\(ami/i.test(out.dmLab);
    const ex = H.dateExigence(g, { id: 'evB', c: b.id, player: true, what: 'Un dîner en tête-à-tête', due: Date.now() + 3600000 });
    out.exClean = !ex.ai.some((x) => /dans la vie du joueur/.test(x));
    const rf = H.promptRefresh(g, 0);
    out.refreshMarked = rf.includes(`[privé : seuls le joueur et @${a.handle} le savent]`) && rf.includes(H.KNOW_RULE) && rf.includes('entre eux, c’est privé : personne d’autre ne le sait');
    const w = g.whispers.find((x) => x.love === a.id);
    out.whisper = w && { seed: w.seed, text: w.text, inH: Math.round((w.next - Date.now()) / 360000) / 10 };
    // hours later, Théo tells his best friend
    if (w) { w.next = 0; window.__trustRolls = [0.1, 0.0]; H.tickWhispers(g, Date.now()); }
    out.knowsNow = !!(b.knows && b.knows[a.id]);
    out.stung = r0 - b.rel;
    out.trig = g.triggers.some((x) => x.c === b.id && x.text.includes(`a appris par @${a.handle} que le joueur a embrassé @${a.handle}`));
    const dm2 = H.promptDM(g, b, [], 'tu fais quoi ce soir ?');
    out.dmLab2 = lab(dm2);
    out.dmKnows = dm2.includes('ont eu un rendez-vous (« Un dîner aux chandelles »') && /\(coup de/i.test(out.dmLab2);
    // a date seen in public (a well-known date: their fans saw them): the others may know at once
    Object.assign(b, { knows: {}, rel: 50 }); g.triggers = [];
    a.followers = 60000;
    const ev2 = Object.assign({}, ev, { id: 'evSeen', talk: { reacts: [], lines: [], ex: { pub: false } } });
    window.__trustRolls = [0.9];
    H.dateOutcome(g, ev2, a);
    out.seenKnows = !!(b.knows && b.knows[a.id]);
    out.seenTrig = g.triggers.some((x) => x.c === b.id && /a appris le rendez-vous du joueur/.test(x.text));
    g.stats.followers = Math.max(f0, g.stats.followers);
    window.__trustRolls = [];
    return out; });
  check('a kiss on a date nobody saw stays between the two of them (no jealousy at once, kept out of what the AI reads for the best friend, no weight on her own date, said private elsewhere); word of mouth carries it hours later, then she knows and it stings; seen in public, the others may know at once',
    kn.priv && kn.noTrig && kn.relSame && kn.unknown && kn.dmClean && kn.exClean && kn.refreshMarked && kn.whisper && kn.whisper.seed === 'kiss' && kn.whisper.inH >= 1 && kn.whisper.inH <= 6
      && kn.knowsNow && kn.stung === 5 && kn.trig && kn.dmKnows && kn.seenKnows && kn.seenTrig, kn);
  await idle(page);
  await dismiss(page);

  // 0.22.3: a last word as they part (« Tu veux rentrer avec moi ? »): welcomed, the evening ends at the door, tenderly;
  // turned down, a goodbye (a night asked counts like a gesture); « Se dire au revoir » costs nothing. And a deal paid in
  // products says so, from the offer to the delivery.
  const lw = await G(page, async () => {
    const H = window.__hype, g = H.S.game, out = {};
    const a = H.charByHandle(g, 'theo.marlin');
    Object.assign(a, { vibe: 'flirt', rel: 60, cool: null, dates: 2, dare: null, age: 24 }); // (an adult of an age for romance: some are drawn older, a role apart)
    const mk = (id) => {
      const ev = { id, kind: 'rdv', c: a.id, player: true, what: 'Un dîner aux chandelles', diff: 'facile', due: Date.now() - 60000, state: 'scheduled' };
      ev.talk = { scene: 'Une petite table au fond.', lines: [{ who: 'c', text: 'salut' }, { who: 'p', text: 'hey', r: 'charme' }, { who: 'c', text: 'quelle soirée…' }], turn: 5, max: 5,
        reacts: [{ r: 'charme', w: 1 }, { r: 'amuse', w: 1 }, { r: 'charme', w: 1 }, { r: 'charme', w: 1 }, { r: 'amuse', w: 1 }], used: [], at: Date.now() };
      g.events.push(ev);
      return ev;
    };
    const e1 = mk('evLast1');
    const n0 = window.__prompts.length;
    window.__mockReacts = ['charme'];
    await H.lastWord(e1, 'Tu veux rentrer avec moi ?');
    const p1 = window.__prompts.slice(n0).find((x) => x.includes('## LE DERNIER MOT DU JOUEUR')) || '';
    out.prompt = p1.includes('« Tu veux rentrer avec moi ? »') && p1.includes('{"t":"stay"}') && p1.includes('pudiquement');
    const l1 = e1.talk.lines.slice(-1)[0] || {};
    out.faded = !!e1.talk.faded && /La suite appartient à leur intimité/.test(l1.text || '') && !!e1.played && e1.played.score >= 0.78;
    const e2 = mk('evLast2');
    window.__mockReacts = ['gene'];
    await H.lastWord(e2, 'Tu veux rentrer avec moi ?');
    out.down = !e2.talk.faded && !!e2.played && (e2.talk.reacts.slice(-1)[0] || {}).g === 'rester' && /il est tard/.test((e2.talk.lines.slice(-1)[0] || {}).text || '');
    const e3 = mk('evLast3');
    const n3 = window.__prompts.length;
    await H.lastWord(e3, '');
    out.bye = !!e3.played && e3.talk.closed === true && window.__prompts.length === n3;
    out.ideas = H.lastWordsFor(g, e3);
    g.events = g.events.filter((e) => !/^evLast/.test(e.id));
    // a deal paid in products
    const f0 = g.stats.followers; g.stats.followers = Math.max(f0, 2000);
    const d = { id: 'dlGoods', brand: 'Maison Test', emoji: '👟', product: 'ses baskets', sector: 'mode', what: 'short', fee: 0, fee0: 0, upfront: 0, value: 100, state: 'signed', signedAt: Date.now(), due: Date.now() + 86400000 * 3, days: 4, contact: a.id };
    g.deals.push(d);
    const cash0 = g.career.cash;
    H.deliverDeal(g, d, null, true, {});
    out.notif = (g.notifs.filter((x) => x.k === 'money').slice(-1)[0] || {}).text || '';
    out.cash = g.career.cash - cash0;
    g.deals = g.deals.filter((x) => x.id !== 'dlGoods'); g.stats.followers = f0;
    return out; });
  check('a last word as they part: « Tu veux rentrer avec moi ? » welcomed ends the evening at the door, tenderly (a success); turned down, a goodbye (counted like a gesture); « Se dire au revoir » costs nothing; a deal paid in products says so (no money)',
    lw.prompt && lw.faded && lw.down && lw.bye && lw.ideas.includes('Tu veux rentrer avec moi ?') && /payé en produits \(≈ 100\s€\), pas en argent/.test(lw.notif) && lw.cash === 0, lw);
  await idle(page);
  await dismiss(page);

  // 0.22.4: every evening is kept to read again and copy (what the player saw: the place, the words, the gestures, the last
  // word, the end, the recap; never what the AI judged); a game from before gets the evenings still in its agenda
  const dl = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    const a = H.charByHandle(g, 'theo.marlin');
    g.dateLog = [];
    const ev = { id: 'evLog1', kind: 'rdv', c: a.id, player: true, what: 'Un dîner aux chandelles', diff: 'facile', due: Date.now() - 3600000, state: 'scheduled',
      played: { tier: 'top', score: 0.86, diff: 'facile', at: Date.now() - 600000, kind: 'talk' },
      talk: { scene: 'Une petite table au fond, des bougies partout.', turn: 5, max: 5, reacts: [], used: ['bisou'], faded: true,
        lines: [{ who: 'c', text: 'tu es venu·e !', seen: 'un grand sourire' }, { who: 'p', text: 'évidemment', r: 'charme' }, { who: 'p', geste: 'bisou', r: 'charme' }, { who: 'c', text: 'oh… ok, là tu m’as eu·e.' },
          { who: 'p', text: 'Tu veux rentrer avec moi ?', last: true, r: 'charme' }, { who: 'n', text: 'La suite appartient à leur intimité.' }] } };
    g.events.push(ev);
    const convo = g.dms[a.id] || (g.dms[a.id] = { msgs: [], readAt: 0 });
    convo.msgs.push({ id: 'mLog1', sys: 'rdv', ev: ev.id, mk: 'love', tier: 'top', title: ev.what, text: 'Une soirée parfaite, jusqu’à la porte.', ts: Date.now(), at: Date.now() });
    window.__trustRolls = [0.9, 0.9, 0.9];
    H.dateOutcome(g, ev, a);
    window.__trustRolls = [];
    ev.state = 'done';
    const e = g.dateLog.find((x) => x.id === 'evLog1');
    out.logged = !!e && e.kind === 'talk' && e.lines.length === 6 && e.lines[2].who === 'g' && /embrasser/.test(e.lines[2].text) && e.lines[4].last === 1
      && e.recap === 'Une soirée parfaite, jusqu’à la porte.' && e.score === 86 && !JSON.stringify(e).includes('"r":');
    const txt = H.dateLogText(g, e);
    out.text = txt.includes('Rendez-vous avec') && txt.includes('(un dernier mot) : « Tu veux rentrer avec moi ? »') && txt.includes('Le récit : Une soirée parfaite');
    const copy = JSON.parse(JSON.stringify(g)); delete copy.dateLog;
    H.backfillDates(copy);
    out.backfill = copy.dateLog.some((x) => x.id === 'evLog1');
    H.S.stack = []; H.openLayer({ t: 'datelog' }); H.update();
    return out; });
  await page.waitForSelector('.layer .dlog-row', { timeout: 5000 });
  const dlList = await G(page, () => ({ rows: document.querySelectorAll('.layer .dlog-row').length, title: (document.querySelector('.layer .layer-head h2') || {}).textContent || '' }));
  await page.click('.layer .dlog-row');
  await page.waitForSelector('.layer .dlog-head', { timeout: 5000 });
  const dlOne = await G(page, () => { const L = [...document.querySelectorAll('.layer')].pop(); return { scene: !!L.querySelector('.talk-scene'), bubbles: L.querySelectorAll('.bubble').length, geste: (L.querySelector('.talk-geste') || {}).textContent || '', last: !!L.querySelector('.dlog-last'), recap: /Le récit de la soirée/.test(L.textContent), copy: /Copier le récit/.test((L.querySelector('.layer-foot') || {}).textContent || '') }; });
  await sleep(500); // (the layer slides in)
  await shot(page, 'date-log');
  check('every evening is kept to read again and copy (what the player saw, never what the AI judged); a game from before gets the evenings still in its agenda; the profile lists them, each opens whole',
    dl.logged && dl.text && dl.backfill && dlList.rows >= 1 && /Tes rendez-vous/.test(dlList.title) && dlOne.scene && dlOne.bubbles >= 4 && /embrasser/.test(dlOne.geste) && dlOne.last && dlOne.recap && dlOne.copy, { dl, dlList, dlOne });
  await G(page, () => { window.__hype.S.stack = []; window.__hype.update(); });
  await idle(page);
  await dismiss(page);

  // the watch moves the game's clock, not the computer's: members still come, the merch still sells, day after day
  const watch = await G(page, () => {
    const H = window.__hype, g = H.S.game, day = 86400000, out = {};
    H.openMemb(g, 4.99, ['avant']); const m = H.membOf(g); m.members = 0;
    const d = H.openDrop(g); const s0 = d.sold;
    for (let k = 0; k < 6; k++) { H.shiftTime(g, day); g.clockOff = (g.clockOff || 0) + day; H.tickCareer(g, Date.now()); }
    out.members = m.members; out.sold = d.sold - s0;
    return out; });
  check('with the watch (the game’s days, not the computer’s), members come and the merch sells day after day', watch.members > 20 && watch.sold > 0, watch);
  await studio(page, '.boutique');
  await shot(page, 'merch-live');

  console.log('\nERRORS', errors.filter((e) => !/favicon|ERR_FAILED|net::/.test(e)).join('\n') || 'none');
  console.log('CHECKS', `${checks.filter((c) => c[0] === 'PASS').length}/${checks.length}`);
  await browser.close();
  process.exit(checks.every((c) => c[0] === 'PASS') ? 0 : 1);
})().catch((e) => { console.error('FAILED', e); console.log('ERRORS', errors.join('\n')); console.log('CHECKS', checks.map((c) => c[0] + ' ' + c[1]).join('\n')); process.exit(1); });
