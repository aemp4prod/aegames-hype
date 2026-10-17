// 0.20 end to end, in Chromium against the built hype.html with the mocked Claude runtime, the gear for real
// (window.__hypeEasyGear = false: the suites before 0.20 run without it):
// - the random start (phone, connection, savings, a perk or a handicap) and its card; a game from before gets nothing;
// - what the gear allows (no computer, no long video; no connection, no live; an announcement becomes what can be made),
//   what it adds (views), the shop (four tiers, resale), the subscriptions (pro rata, installation, monthly bills,
//   suspended when unpaid), outages, breakdowns, repairs, theft and insurance, the edit and its render (a crash loses it,
//   the pro software saves it), what comes out every six months;
// - the quote at programming (paid to program, nothing owned bought again), and at the shoot of an announced content;
// - the scams (nothing says it), what they do, the critic who exposes them; the agents (a warning, a gamble above their
//   level), a big brand without an agent; a brand that loves you back; friends who know things about a brand;
// - the audience grows slower as it grows.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v20.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v20');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(path.join(ROOT, 'hype.html'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const UMD = fs.readFileSync(process.env.UMD, 'utf8');
const SKELETON = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;

const errors = [];
const checks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let shotN = 0, lastPage = null;
const check = (name, ok, info) => { checks.push([ok ? 'PASS' : 'FAIL', name]); console.log(ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)); };
async function shot(page, name) { shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
const G = (page, fn, arg) => page.evaluate(fn, arg);
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.devis); })) await sleep(250); };

async function newPage(browser, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true, colorScheme: 'light' });
  await ctx.addInitScript('window.__hypeEasyGear = false;'); // 0.20 for real
  await ctx.addInitScript(MOCK);
  const page = await ctx.newPage();
  lastPage = page;
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
}

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);
  await newGame(page, 'Une youtubeuse qui enquête sur les secrets de l’académie');

  // ---------- the start: drawn, told on a card, the savings in the bank ----------
  await page.waitForSelector('.start-card', { timeout: 8000 });
  await shot(page, 'start-card');
  const st = await G(page, () => { const H = window.__hype, g = H.S.game, G0 = g.gear; return { card: document.querySelector('.start-card').textContent, start: G0.start, phone: G0.items.phone.t, pc: !!G0.items.pc, base: G0.net.base, cash: g.career.cash, phoneName: H.GEAR.phone.names[G0.items.phone.t], net: H.NETS[G0.net.base].label }; });
  check('a new game starts its own way: a phone (old or recent), a connection, savings in the bank (anon), sometimes a perk or a handicap, told on « Ton point de départ »',
    /Ton point de départ/.test(st.card) && st.card.includes(st.phoneName) && st.card.includes(st.net) && st.card.includes('d’économies') && st.cash === st.start.savings && st.start.savings >= 0 && st.start.savings <= 1300
    && [0, 1, 2].includes(st.phone) && ['adsl', 'box4g', 'fibre'].includes(st.base) && (!st.start.perk || /Atout/.test(st.card)) && (!st.start.flaw || /Handicap/.test(st.card)), st);
  await page.click('.start-card .btn-hot');
  const draws = await G(page, () => { const H = window.__hype, out = { phones: new Set(), nets: new Set(), perks: 0, flaws: 0, saves: [], twitchAdsl: 0, star: null };
    for (let k = 0; k < 200; k++) { const x = H.newGear({ start: 'anon' }, k % 10 === 0 ? 'twitch' : 'youtube'); out.phones.add(x.items.phone.t); out.nets.add(x.net.base); if (x.start.perk) out.perks++; if (x.start.flaw) out.flaws++; out.saves.push(x.start.savings); if (k % 10 === 0 && x.net.base === 'adsl') out.twitchAdsl++; }
    const s = H.newGear({ start: 'star' }, 'youtube'); out.star = { pc: s.items.pc.t, cam: s.items.cam.t, base: s.net.base };
    return { phones: [...out.phones].sort(), nets: [...out.nets].sort(), perks: out.perks, flaws: out.flaws, min: Math.min(...out.saves), max: Math.max(...out.saves), twitchAdsl: out.twitchAdsl, star: out.star }; });
  check('…the draw varies (phones, connections, perks and handicaps, 0 to 1 000 € plus a bonus perhaps); a streamer never starts on ADSL; a star starts equipped',
    draws.phones.length === 3 && draws.nets.length === 3 && draws.perks > 40 && draws.flaws > 25 && draws.min >= 0 && draws.max <= 1300 && draws.twitchAdsl === 0 && draws.star.pc === 2 && draws.star.cam === 2 && draws.star.base === 'fibre', draws);

  // ---------- a game from before: nothing given ----------
  const old = await G(page, () => {
    const H = window.__hype, g = JSON.parse(JSON.stringify(H.S.game));
    delete g.gear; g.career.cash = 12345;
    g.releases = [{ id: 'rlold', what: 'vidéo', topic: 'une vieille vidéo', state: 'scheduled', due: Date.now() + 3600000, at: Date.now(), delays: 0, tries: 0 }];
    H.migrate(g);
    return { phone: g.gear.items.phone.t, pc: g.gear.items.pc, cam: g.gear.items.cam, base: g.gear.net.base, cash: g.career.cash, legacy: g.releases[0].legacy, flag: g.gear.start.legacy, can: H.canMakeR(g, g.releases[0]).ok };
  });
  check('a game started before 0.20 gets nothing (a phone, a 4G box), keeps its money; what it had scheduled still comes out', old.phone === 1 && old.pc === null && old.cam === null && old.base === 'box4g' && old.cash === 12345 && old.legacy === true && old.flag === true && old.can === true, old);

  // ---------- the random events (an outage, a storm…), then none for what follows (the suite skips days) ----------
  const ev = await G(page, () => { const H = window.__hype, g = H.S.game, G0 = g.gear, t = Date.now(), out = {};
    G0.net.base = 'box4g'; G0.net.out = 0;
    window.__rnd = Math.random; Math.random = () => 0.001; out.r = H.rollGearHour(g, t, t, false); Math.random = window.__rnd;
    out.out = G0.net.out > t; out.why = G0.net.outWhy; out.notif = (g.notifs.filter((x) => x.k === 'gear').pop() || {}).text;
    G0.net.out = 0; window.__hypeNoGearEvents = true; return out; });
  check('the connection cuts out now and then (rolled each game hour, more on a poor connection): told, with the time it comes back',
    ev.r === true && ev.out && /Coupure|Panne|travaux|courant/.test(ev.why) && /retour estimé/.test(ev.notif || ''), ev);

  // ---------- a known kit for what follows: an old phone, ADSL, no computer ----------
  await G(page, () => { const H = window.__hype, g = H.S.game; Object.assign(g.gear.items, { phone: H.mkItem(0), pc: null, cam: null, mic: null, light: null }); g.gear.net = Object.assign(g.gear.net, { base: 'adsl', fibreOk: true, out: 0, hack: 0 }); g.gear.subs = {}; g.gear.noisy = 0; g.gear.debt = null; g.stats.followers = 3000; g.career.cash = 300; g.career.platform = 'youtube'; H.goTab('studio'); H.update(); });
  await sleep(500);
  await page.locator('.gear-sec').scrollIntoViewIfNeeded();
  await shot(page, 'studio-gear');
  const sec = await G(page, () => ({ rows: [...document.querySelectorAll('.gear-sec .gear-row')].map((r) => r.textContent), cant: (document.querySelector('.gear-cant') || {}).textContent || '' }));
  check('the Studio shows « Ton matos »: each piece (or its absence), the connection, and what cannot be made yet, and why',
    sec.rows.length === 6 && /Vieux téléphone/.test(sec.rows[0]) && /Pas d’ordinateur/.test(sec.rows[1]) && /ADSL/.test(sec.rows[5]) && /Vidéos longues/.test(sec.cant) && /Lives/.test(sec.cant), sec);

  // ---------- what can be made ----------
  await G(page, () => window.__hype.openLayer({ t: 'series', id: 'single' }));
  await sleep(400);
  await shot(page, 'program-no-pc');
  const fm = await G(page, () => { const H = window.__hype, g = H.S.game;
    const seg = [...document.querySelectorAll('.layer .seg button')].slice(0, 3).map((b) => [b.textContent, b.disabled]);
    const r = H.scheduleRelease(g, { what: 'vidéo', topic: 'une vidéo sans ordi', due: Date.now() + 3600000 });
    return { seg, refused: r === null, why: [...document.querySelectorAll('.gear-why')].map((x) => x.textContent) }; });
  await G(page, () => window.__hype.closeLayer());
  const ann = await G(page, () => { const H = window.__hype, g = H.S.game; const r = H.addRelease(g, { what: 'vidéo', in: 30, topic: 'ma grande enquête' }, null, 'ma vidéo sort dans 30 min'); const n = g.notifs.filter((x) => x.k === 'release').slice(-1)[0]; const out = { what: r && r.what, notif: n && n.text }; if (r) r.state = 'dropped'; return out; });
  check('no computer, no long video; no connection that holds, no live (greyed out, with the reason); an announced video becomes a short',
    fm.seg[0][1] === true && fm.seg[1][1] === false && fm.seg[2][1] === true && fm.refused && fm.why.length === 2 && ann.what === 'short' && /ce sera un short/.test(ann.notif), { fm, ann });

  // ---------- the shop: four tiers, resale, too expensive ----------
  await G(page, () => window.__hype.openLayer({ t: 'gear' }));
  await sleep(400);
  await shot(page, 'shop');
  const shop = await G(page, () => { const H = window.__hype, g = H.S.game, out = {};
    out.cards = document.querySelectorAll('.layer .shop-card').length;
    out.poor = H.buyGear(g, 'pc', 1); // more than the 300 in the bank
    g.career.cash = 3000; out.p0 = H.GEAR.pc.prices[0]; out.p1 = H.GEAR.pc.prices[1];
    out.buy = H.buyGear(g, 'pc', 0); out.cash1 = g.career.cash;
    out.up = H.buyGear(g, 'pc', 1); out.cash2 = g.career.cash; out.tier = g.gear.items.pc.t;
    out.ledger = g.career.ledger.slice(-3).map((x) => x.label + ' ' + x.amount);
    out.inv = H.invLive(g).some((x) => x.kind === 'gear' && x.gear.k === 'pc' && x.gear.it.t === 0 && x.cond === 'bon'); // 0.26: the old one, kept
    out.same = H.buyGear(g, 'pc', 1); out.lower = H.buyGear(g, 'pc', 0);
    out.video = H.canMake(g, 'vidéo').ok;
    return out; });
  check('the shop: every piece at four tiers; too expensive is refused; a better one replaces the old (0.26: the old one waits in the inventory, never sold in the player’s place); the same or worse is refused; a computer opens long videos',
    shop.cards >= 19 && shop.poor === false && shop.buy && shop.cash1 === 3000 - shop.p0 && shop.up && shop.cash2 === shop.cash1 - shop.p1 && shop.tier === 1 && !shop.ledger.some((x) => /Revente/.test(x)) && shop.inv && shop.same === false && shop.lower === false && shop.video, shop);
  await G(page, () => window.__hype.closeLayer());

  // ---------- what the gear adds ----------
  const vm = await G(page, () => { const H = window.__hype, g = H.S.game, G0 = g.gear, out = {};
    out.old = H.gearViewsMult(g, 'short');
    G0.items.phone.crack = 1; out.crack = H.gearViewsMult(g, 'short'); G0.items.phone.crack = 0;
    Object.assign(G0.items, { cam: H.mkItem(3), mic: H.mkItem(3), light: H.mkItem(3), pc: H.mkItem(3) });
    out.top = H.gearViewsMult(g, 'vidéo');
    G0.items.cam.broken = 1; out.camDown = H.gearViewsMult(g, 'vidéo'); G0.items.cam.broken = 0;
    Object.assign(G0.items, { cam: null, mic: null, light: null, pc: H.mkItem(1) });
    return out; });
  check('the gear adds views: an old phone films worse (−8 %), a scratched lens costs 6 % more, top gear adds about 30 %; a broken camera adds nothing',
    Math.abs(vm.old - 0.92) < 0.001 && vm.crack < vm.old && vm.top > 1.25 && vm.top < 1.35 && vm.camDown < vm.top, vm);

  // ---------- subscriptions: pro rata, installation, the bill, unpaid, suspended ----------
  const sub = await G(page, () => { const H = window.__hype, g = H.S.game, G0 = g.gear, day = 86400000, out = {};
    g.career.cash = 2000;
    const o = H.subOffer(g, 'fibre'); out.offer = o;
    const c0 = g.career.cash; out.ok = H.subscribe(g, 'fibre'); out.paid = c0 - g.career.cash; out.install = Math.round((G0.subs.fibre.installAt - Date.now()) / day);
    out.netBefore = H.netNow(g);
    const skip = (n) => { for (let k = 0; k < n; k++) { H.shiftTime(g, day); g.clockOff = (g.clockOff || 0) + day; H.tickCareer(g, Date.now()); } };
    skip(9); out.netAfter = H.netNow(g); out.live = H.canMake(g, 'live').ok;
    // the next game month: billed; then too poor: suspended, then paid again
    const month = () => g.gear.bill;
    const m0 = month(); let k = 0; while (month() === m0 && k++ < 40) skip(1);
    out.billed = g.notifs.filter((x) => /Prélèvements/.test(x.text)).length;
    g.career.cash = 10;
    const m1 = month(); k = 0; while (month() === m1 && k++ < 40) skip(1);
    out.cut = !!G0.subs.fibre.cut; out.netCut = H.netNow(g);
    g.career.cash = 500; out.payCut = H.payCut(g, 'fibre'); out.netBack = H.netNow(g);
    out.unsub = H.unsubscribe(g, 'fibre'); out.netEnd = H.netNow(g);
    return out; });
  check('the fibre: the first month pro rata plus the installation, installed in a few days; billed each game month; unpaid, suspended (back to ADSL) until the bill is paid; cancelled at will',
    sub.ok && sub.offer.install === 150 && sub.paid === sub.offer.first + 150 && sub.install >= 3 && sub.install <= 8 && sub.netBefore === 'adsl' && sub.netAfter === 'fibre' && sub.live && sub.billed >= 1 && sub.cut && sub.netCut === 'adsl' && sub.payCut && sub.netBack === 'fibre' && sub.unsub && sub.netEnd === 'adsl', sub);

  // ---------- an outage before a live: told, moved without the usual cost ----------
  const out1 = await G(page, () => { const H = window.__hype, g = H.S.game, G0 = g.gear;
    G0.net.base = 'box4g'; G0.net.out = Date.now() + 3 * 3600000; G0.net.outWhy = 'Coupure internet';
    const can = H.canMake(g, 'live');
    G0.net.out = 0;
    const r = H.scheduleRelease(g, { what: 'live', topic: 'mon premier live', due: Date.now() + 60000 });
    r.due = Date.now() - 1000;
    G0.net.out = Date.now() + 3 * 3600000;
    H.openLayer({ t: 'minigame', id: r.id }); H.update();
    return { can, id: r.id, rep: g.stats.reputation }; });
  await sleep(500);
  await shot(page, 'outage-blocker');
  const out2 = await G(page, (id) => { const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === id);
    const blk = (document.querySelector('.gear-block') || {}).textContent || '', launch = [...document.querySelectorAll('.layer .btn-hot')].find((b) => /Lancer le tournage|devis/.test(b.textContent));
    const moved = H.outagePostpone(g, r);
    const out = { blk, launchOff: !launch || launch.disabled, moved, after: r.due > g.gear.net.out, delays: r.delays, rep: g.stats.reputation };
    r.state = 'dropped'; g.gear.net.out = 0; H.closeLayer(); return out; }, out1.id);
  check('an outage: no live (the reason, the time it comes back); at the shoot, the live waits and can be moved after the outage, without a postponement against the player',
    !out1.can.ok && /Coupure internet/.test(out1.can.why) && /Coupure internet/.test(out2.blk) && out2.launchOff && out2.moved && out2.after && out2.delays === 0 && out2.rep === out1.rep, { out1, out2 });

  // ---------- breakdowns, repairs, insurance, theft ----------
  const br = await G(page, () => { const H = window.__hype, g = H.S.game, G0 = g.gear, day = 86400000, out = {};
    const skip = (n) => { for (let k = 0; k < n; k++) { H.shiftTime(g, day); g.clockOff = (g.clockOff || 0) + day; H.tickCareer(g, Date.now()); } };
    g.career.cash = 5000;
    H.breakItem(g, 'pc', 'use'); out.blocked = !H.canMake(g, 'vidéo').ok; out.p30 = H.niceRound(H.GEAR.pc.prices[G0.items.pc.t] * 0.3);
    out.cost = H.repairCost(g, 'pc'); out.express = H.repairCost(g, 'pc', true);
    H.repairGear(g, 'pc'); out.away = !!G0.items.pc.fixAt; skip(4); out.back = H.canMake(g, 'vidéo').ok;
    H.breakItem(g, 'pc', 'use'); H.repairGear(g, 'pc', true); out.now = H.canMake(g, 'vidéo').ok;
    H.subscribe(g, 'assur'); H.breakItem(g, 'pc', 'use'); out.insured = H.repairCost(g, 'pc'); out.pcFr = H.franchiseOf(H.GEAR.pc.prices[G0.items.pc.t]);
    H.repairGear(g, 'pc', true);
    out.ins1 = H.subPrice(g, 'assur');
    G0.items.cam = H.mkItem(3); out.ins3 = H.subPrice(g, 'assur'); // the insurance follows what it covers
    G0.items.cam = H.mkItem(2); out.camPrice = H.GEAR.cam.prices[2]; out.camFr = H.franchiseOf(out.camPrice);
    const c0 = g.career.cash; H.theft(g, Date.now()); out.theftCost = c0 - g.career.cash; out.keptPc = !!G0.items.pc; out.keptCam = !!G0.items.cam;
    H.unsubscribe(g, 'assur');
    H.theft(g, Date.now()); out.gone = !G0.items.cam || !G0.items.pc;
    out.modal = H.S.modals.some((m) => m.t === 'gear' && m.what === 'theft');
    H.S.modals = []; H.update();
    return out; });
  check('a breakdown stops a computer (no long video); repaired in one to three days, or now at twice the price; insured: the franchise (5 % of the price, 50 € at least), the insurance priced on what it covers; a burglary, insured: replaced; not insured: gone',
    br.blocked && br.cost === br.p30 && br.express === 2 * br.p30 && br.away && br.back && br.now && br.insured === br.pcFr && br.pcFr >= 50 && br.ins1 >= 19 && br.ins3 > br.ins1 + 100
      && br.theftCost === br.camFr && br.camFr > 50 && br.keptPc && br.keptCam && br.gone && br.modal, br);

  // ---------- the edit, the render, the crash ----------
  const ed = await G(page, () => { const H = window.__hype, g = H.S.game, G0 = g.gear;
    G0.items.pc = H.mkItem(0);
    const r = H.scheduleRelease(g, { what: 'vidéo', topic: 'le classement des potions', due: Date.now() + 60000 });
    r.devis = { total: 0, items: [], topic: r.topic, at: Date.now() };
    r.due = Date.now() - 1000;
    H.S.mgForce = 'memoire';
    H.openLayer({ t: 'minigame', id: r.id }); H.update();
    return { id: r.id, E: H.gearEdit(g, r), E3: (() => { const s = G0.items.pc; G0.items.pc = H.mkItem(3); const e = H.gearEdit(g, r); G0.items.pc = s; return e; })() }; });
  await sleep(400);
  await page.locator('.layer button', { hasText: 'Lancer le tournage' }).click();
  await sleep(500);
  await G(page, (id) => { const H = window.__hype, g = H.S.game; H.finishShoot(g.releases.find((x) => x.id === id), 0.7); window.__rnd = Math.random; Math.random = () => 0.01; }, ed.id);
  await page.locator('.layer button', { hasText: 'Monter vite' }).click();
  await sleep(1200);
  await shot(page, 'render');
  const rd1 = await G(page, () => ({ render: !!document.querySelector('.render-step'), text: (document.querySelector('.render-step') || {}).textContent || '' }));
  await sleep(5500);
  await G(page, () => { Math.random = window.__rnd; });
  const rd2 = await G(page, (id) => { const r = window.__hype.S.game.releases.find((x) => x.id === id); return { edit: r.edit, crashes: r.crashes, score: r.played.score, back: !!document.querySelector('.edit-step'), note: ((document.querySelector('.edit-step .date-late') || {}).textContent || '') }; }, ed.id);
  await shot(page, 'crash');
  // the pro software: the auto-save keeps it
  await G(page, () => { const H = window.__hype, g = H.S.game; g.career.cash += 100; H.subscribe(g, 'montage'); window.__rnd = Math.random; Math.random = () => 0.01; H.update(); });
  await page.locator('.layer button', { hasText: 'Monter vite' }).click();
  await sleep(6500);
  await G(page, () => { Math.random = window.__rnd; });
  const rd3 = await G(page, (id) => { const r = window.__hype.S.game.releases.find((x) => x.id === id); return { edit: !!r.edit, render: r.render, step: !!document.querySelector('.upload, .thumb-step') }; }, ed.id);
  check('the edit on a cheap computer: narrower zones; after it, the render (longer, a crash may lose the edit and bring back the shoot’s own score); with the pro software, the auto-save keeps it',
    ed.E.w < 1 && ed.E3.w > 1 && ed.E.crash > ed.E3.crash && ed.E.ms > ed.E3.ms && rd1.render && /Ton ordinateur calcule/.test(rd1.text) && rd2.edit === null && rd2.crashes === 1 && rd2.score === 0.7 && rd2.back && /perdu dans un plantage/.test(rd2.note)
    && rd3.edit && rd3.render && rd3.render.saved && rd3.step, { E: ed.E, E3: ed.E3, rd1, rd2, rd3 });
  await G(page, (id) => { const H = window.__hype, g = H.S.game; g.releases.find((x) => x.id === id).state = 'dropped'; H.S.mgForce = null; H.closeLayer(); }, ed.id);

  // ---------- every six months: something new ----------
  const ln = await G(page, () => { const H = window.__hype, g = H.S.game, G0 = g.gear, out = {};
    out.n0 = G0.launch.n; out.first = H.NEW_GEAR[0].name;
    const next = H.nextLaunchAt(Date.now()), d = H.gameDate(next); out.when = [d.getMonth(), d.getDate()];
    G0.launch.next = Date.now() - 1000; H.tickGear(g, Date.now());
    out.n1 = G0.launch.n; out.post = g.posts.some((p) => /est sortie? \. Notre avis|Notre avis/.test(p.text)); out.modal = H.S.modals.some((m) => m.t === 'gear' && m.what === 'launch');
    g.career.cash = 400000;
    out.buy = H.buyNew(g, 'vitrine'); out.fee = H.hasBonus(g, 'produits');
    out.buy0 = H.buyNew(g, 'sourire'); out.sym = H.gearPostMult(g); out.cam = G0.items.cam && G0.items.cam.sp; out.feeAfter = H.hasBonus(g, 'produits');
    H.S.modals = [];
    return out; });
  check('every six months (1 March, 1 September) something new comes out, with a bonus never seen (the Labo Matos reviews it); it replaces the camera, its bonus works',
    ln.n0 === 1 && [2, 8].includes(ln.when[0]) && ln.when[1] === 1 && ln.n1 === 2 && ln.post && ln.modal && ln.buy && ln.fee && ln.buy0 && ln.cam === 'sourire' && ln.sym === 1.1 && !ln.feeAfter, ln);

  // ---------- the quote at programming ----------
  await G(page, () => { const H = window.__hype, g = H.S.game; g.career.cash = 1000; g.gear.owned = []; window.__mockDevis = [{ t: 'cost', item: 'le jeu de cartes magiques', price: 60, kind: 'achat', keep: true, per: 'once' }, { t: 'cost', item: 'snacks pour le tournage', price: 15, kind: 'conso', keep: false, per: 'once' }, { t: 'sponsor', sector: 'jeu', why: 'un éditeur de jeux pourrait payer' }]; H.openLayer({ t: 'series', id: 'single' }); });
  await sleep(300);
  await page.locator('.layer .seg button', { hasText: 'Vidéo' }).first().click();
  await page.fill('#se-theme', 'je teste un jeu de cartes magiques');
  const ask = await G(page, () => [...document.querySelectorAll('.layer .btn-hot')].map((b) => b.textContent.trim()).pop());
  await page.locator('.layer .btn-hot', { hasText: 'Demander le devis' }).click();
  await page.waitForSelector('.devis-card', { timeout: 10000 });
  await shot(page, 'devis');
  const dv1 = await G(page, () => ({ card: document.querySelector('.devis-card').textContent, btn: [...document.querySelectorAll('.layer .btn-hot')].map((b) => b.textContent.trim()).pop(), prompt: window.__prompts.filter((p) => p.includes('## TÂCHE : LE DEVIS')).pop() || '' }));
  await page.locator('.layer .btn-hot', { hasText: 'Payer' }).click();
  await sleep(400);
  const dv2 = await G(page, () => { const H = window.__hype, g = H.S.game, r = H.activeRelease(g); const out = { cash: g.career.cash, owned: g.gear.owned.map((x) => x.name), r: r && { what: r.what, total: r.devis && r.devis.total } }; if (r) r.state = 'dropped'; return out; });
  check('programming asks for the quote first (what this content takes, never the gear); paid, it programs; what is kept joins what the player owns',
    /Demander le devis/.test(ask) && /jeu de cartes magiques/.test(dv1.card) && /75 €/.test(dv1.card) && /Payer 75 € et programmer/.test(dv1.btn) && dv1.prompt.includes('Son matériel de tournage') && dv1.prompt.includes('ne le rachète jamais')
    && dv2.cash === 925 && dv2.owned.includes('le jeu de cartes magiques') && dv2.r && dv2.r.total === 75, { ask, card: dv1.card.slice(0, 160), btn: dv1.btn, dv2 });
  const own = await G(page, async () => { const H = window.__hype, g = H.S.game; H.S.devis = null; const dv = await H.genDevis({ what: 'vidéo', topic: 'je refais une partie du jeu de cartes' }); const p = window.__prompts.filter((x) => x.includes('## TÂCHE : LE DEVIS')).pop(); return { items: dv.items.map((x) => x.item), total: H.devisTotal(dv), inPrompt: p.includes('le jeu de cartes magiques') }; });
  check('…a second quote never buys again what the player owns (dropped even if the AI forgets)', own.items.length === 1 && own.items[0] === 'snacks pour le tournage' && own.total === 15 && own.inPrompt, own);
  await G(page, () => { window.__mockDevis = null; window.__hype.S.devis = null; window.__hype.closeLayer(); });

  // ---------- the quote of an announced content, at its shoot ----------
  const an = await G(page, () => { const H = window.__hype, g = H.S.game; g.career.cash = 100; window.__mockDevis = [{ t: 'cost', item: 'location d’une voiturette (1 jour)', price: 90, kind: 'location', per: 'once' }, { t: 'cost', item: 'circuit privé (une heure)', price: 250, kind: 'service', per: 'once' }];
    const r = H.addRelease(g, { what: 'vidéo', in: 1, topic: 'la voiturette à fond sur circuit' }, null, 'ma vidéo sort dans 1 min'); r.due = Date.now() - 1000; H.openLayer({ t: 'minigame', id: r.id }); H.update(); return r.id; });
  await sleep(400);
  const an1 = await G(page, () => ({ step: (document.querySelector('.devis-step') || {}).textContent || '', launch: [...document.querySelectorAll('.layer .btn-hot')].some((b) => /Lancer le tournage/.test(b.textContent)) }));
  await page.locator('.devis-step .btn-hot').click();
  await page.waitForSelector('.devis-card', { timeout: 10000 });
  const an2 = await G(page, () => ({ miss: (document.querySelector('.dv-miss') || {}).textContent || '', off: document.querySelector('.devis-step > .btn-hot').disabled }));
  await G(page, () => { window.__hype.S.game.career.cash = 1000; window.__hype.update(); });
  await sleep(200);
  await page.locator('.devis-step > .btn-hot').click();
  await sleep(300);
  await shot(page, 'devis-paid-shoot');
  const an3 = await G(page, (id) => { const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === id); const out = { total: r.devis && r.devis.total, cash: g.career.cash, launch: [...document.querySelectorAll('.layer .btn-hot')].some((b) => /Lancer le tournage/.test(b.textContent) && !b.disabled), ro: document.querySelector('#rl-topic').readOnly }; r.state = 'dropped'; H.closeLayer(); window.__mockDevis = null; return out; }, an);
  check('a content announced on the network: the quote comes at its shoot; too expensive, nothing to shoot (no make-do version); paid, the shoot opens and the topic is the one paid for',
    /Avant de tourner/.test(an1.step) && !an1.launch && /Il te manque 240 €/.test(an2.miss) && an2.off && an3.total === 340 && an3.cash === 660 && an3.launch && an3.ro, { an1, an2, an3 });

  // ---------- the scams: nothing says it ----------
  const sc = await G(page, () => {
    const H = window.__hype, g = H.S.game, day = 86400000, out = {};
    g.stats.followers = 20000; g.career.cash = 5000; g.staff = []; g.deals = [];
    const skip = (n) => { for (let k = 0; k < n; k++) { H.shiftTime(g, day / 4); g.clockOff = (g.clockOff || 0) + day / 4; H.tickCareer(g, Date.now()); } };
    let n = 0;
    const off = (scam) => { g.deals.filter((d) => d.state === 'offer').forEach((d) => { d.state = 'declined'; }); n++; const d = H.makeOffer(g, { scam, what: 'short', brand: 'Maison ' + ['Ambre', 'Boréal', 'Céleste', 'Dune', 'Éole', 'Flore', 'Givre', 'Hêtre'][n % 8] + n, sector: 'food' }); d.exclusive = false; return d; }; // (no exclusivity between them: each one is signed)
    const words = /arnaque|piège|attention|méfi|louche|suspect|danger|illégal/i;
    // frais
    let d = off('frais'); out.fraisCard = H.dealSummary(g, d); const c0 = g.career.cash; H.signDeal(g, d); out.fraisPaid = c0 - g.career.cash; out.fraisState = d.state;
    skip(24); out.fraisLost = g.notifs.some((x) => /n’est jamais arrivé/.test(x.text));
    // brief
    g.gear.items.pc = H.mkItem(1);
    d = off('brief'); out.briefCard = H.dealSummary(g, d); const f0 = g.stats.followers; H.signDeal(g, d); out.virus = g.gear.items.pc.virus === 1; out.hacked = g.stats.followers < f0; g.gear.items.pc.virus = 0;
    // impayé
    d = off('impaye'); out.impTerms = H.payTerms(g, d); out.impSheet = H.sheetLine(g, d); H.signDeal(g, d); const c1 = g.career.cash; H.deliverDeal(g, d, null, true, { tier: 'mid' }); out.impNow = g.career.cash - c1;
    skip(4 * 61); out.impUnpaid = !!d.unpaid;
    // dangereux
    d = off('dangereux'); out.dangProduct = d.product; H.signDeal(g, d); const f1 = g.stats.followers; H.deliverDeal(g, d, null, true, { tier: 'mid' }); skip(4 * 5); out.recall = g.notifs.some((x) => /est rappelé/.test(x.text)); out.dangLost = f1 > g.stats.followers;
    // nul
    d = off('nul'); out.nulSheet = H.sheetLine(g, d); H.signDeal(g, d); H.deliverDeal(g, d, null, true, { tier: 'mid' }); skip(4 * 4); out.flop = g.notifs.some((x) => /camelote/.test(x.text));
    // clause (the penalty one)
    d = off('clause'); d.exclusive = false; d.clause = { kind: 'penal', amount: 3000, text: 'Exclusivité totale de 6 mois : 3 000 € de pénalité pour tout autre partenariat, tous secteurs confondus.' }; out.clauseCard = H.dealSummary(g, d); H.signDeal(g, d);
    const d2 = off(''); const c2 = g.career.cash; H.signDeal(g, d2); out.penalty = c2 - g.career.cash + (d2.upfront || 0);
    out.noWords = ![out.fraisCard, out.briefCard, out.impTerms, out.impSheet, out.clauseCard, out.nulSheet].some((t) => words.test(t));
    skip(4 * 8);
    out.critic = g.posts.filter((p) => /🧨/.test(p.text)).length; out.named = g.posts.some((p) => /🧨/.test(p.text) && p.text.includes('@' + g.player.handle));
    return out;
  });
  check('scams, like for real, and nothing says it: an « ambassador » fee (the kit never comes), a « brief » (a virus, the account hacked), no down payment and « 60 days » (never paid), a recalled product (bad buzz), junk (complaints), a trap clause (the penalty on the next contract)',
    sc.fraisPaid > 0 && sc.fraisState === 'waiting' && sc.fraisLost && sc.virus && sc.hacked && /60 jours/.test(sc.impTerms) && sc.impNow === 0 && sc.impUnpaid && sc.recall && sc.dangLost && sc.flop && sc.penalty === 3000 && sc.noWords, sc);
  check('…a critic on the platform exposes them a few days later, and names the player among those who promoted (or fell for) them', sc.critic >= 3 && sc.named, { critic: sc.critic, named: sc.named });
  await G(page, () => { window.__hype.goTab('studio'); window.__hype.update(); });
  await sleep(300);

  // ---------- the agent: a warning; a gamble above their level; a big brand alone ----------
  const ag = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    g.deals = []; g.stats.followers = 30000;
    const c = H.addCandidate(g, 'agent', { tier: 2, name: 'Lou Ferrand' }); H.hireStaff(g, c);
    const d = H.makeOffer(g, { scam: 'nul', what: 'short', brand: 'Camelote & Fils' });
    if (!d.flagged) { window.__rnd = Math.random; Math.random = () => 0.05; H.agentReview(g, d); Math.random = window.__rnd; } // (the agent sees it: an expert, most of the time)
    out.flagged = d.flagged; out.warn = (g.dms[c.id].msgs.filter((m) => !m.me).pop() || {}).text || '';
    const pr = H.dmCareerCtx(g, c).join(' '); out.agentCtx = pr.includes('Camelote & Fils');
    // a contract above the level of a beginner agent
    H.quitStaff(g, g.staff[0], 'fired');
    const b = H.addCandidate(g, 'agent', { tier: 0, name: 'Noé Garnier' }); H.hireStaff(g, b);
    g.stats.followers = 900000; g.deals.filter((x) => x.state === 'offer').forEach((x) => { x.state = 'declined'; });
    const big = H.makeOffer(g, { scam: '', what: 'short', brand: 'Géant Mondial', bonus: 2 });
    const huge = (d) => { Object.assign(d, { fee: 50000, fee0: 50000, base: 50000, max: 62500, maxBase: 62500, hard: '', luck: 0 }); H.dealHard(g, d); }; // a very big contract
    huge(big);
    out.big = { fee: big.fee, hard: big.hard, luck: big.luck };
    window.__rnd = Math.random; Math.random = () => 0.001; out.won = H.agentGamble(g, big); Math.random = window.__rnd; out.wonFee = big.fee;
    g.deals.filter((x) => x.state === 'offer').forEach((x) => { x.state = 'declined'; });
    const big2 = H.makeOffer(g, { scam: '', what: 'short', brand: 'Géant Bis', bonus: 2 }); huge(big2);
    window.__rnd = Math.random; Math.random = () => 0.99; out.lost = H.agentGamble(g, big2); Math.random = window.__rnd; out.lostState = big2.state;
    // alone: a big brand negotiates hard
    H.quitStaff(g, g.staff[0], 'fired');
    g.deals.filter((x) => x.state === 'offer').forEach((x) => { x.state = 'declined'; });
    const big3 = H.makeOffer(g, { scam: '', what: 'short', brand: 'Géant Ter', bonus: 2 }); huge(big3);
    out.alone = big3.hard; out.cap = H.dealBounds(big3).cap / big3.fee0;
    out.hardCtx = H.dmCareerCtx(g, g.chars[big3.contact]).join(' ').includes('négociatrice redoutable');
    return out;
  });
  await shot(page, 'agent');
  check('an agent reads the offers: a scam seen is told in private (the agent’s own words); asked, the agent says what they saw',
    ag.flagged && /avis clients|catastrophe/.test(ag.warn) && ag.agentCtx, { flagged: ag.flagged, warn: ag.warn, ctx: ag.agentCtx });
  check('a contract above the agent’s level: a gamble (a few % for a beginner): won, a better fee; lost, the brand walks away; without an agent, a big brand gives almost nothing',
    ag.big.hard === 'agent' && ag.big.luck <= 0.05 && ag.won === 'won' && ag.wonFee > ag.big.fee && ag.lost === 'lost' && ag.lostState === 'withdrawn' && ag.alone === 'alone' && ag.cap <= 1.051 && ag.hardCtx, ag);

  // ---------- a brand that loves you back ----------
  const lv = await G(page, () => {
    const H = window.__hype, g = H.S.game, day = 86400000, out = {};
    g.stats.followers = 30000; g.deals = [];
    const d = H.makeOffer(g, { scam: '', what: 'short', brand: 'Bulle Fidèle', legit: true });
    d.hard = ''; H.signDeal(g, d);
    window.__rnd = Math.random; Math.random = () => 0.1;
    const c0 = g.career.cash; H.deliverDeal(g, d, null, true, { tier: 'top' }); out.gain = g.career.cash - c0; out.rest = Math.max(0, d.fee - d.upfront);
    Math.random = window.__rnd;
    out.gift = g.notifs.some((x) => /prime/.test(x.text)); out.loves = (g.career.loves || []).length;
    const contact = d.contact;
    for (let k = 0; k < 12; k++) { H.shiftTime(g, day); g.clockOff = (g.clockOff || 0) + day; H.tickCareer(g, Date.now()); }
    const back = g.deals.filter((x) => x.brand === 'Bulle Fidèle' && x !== d);
    out.back = back.length; out.same = back.length && back[0].contact === contact; out.loyal = back.length && back[0].loyal;
    return out;
  });
  check('a sponsored release that did very well: a bonus nobody asked for, and the brand comes back sooner (same contact, a better offer)',
    lv.gift && lv.gain > lv.rest && lv.loves === 1 && lv.back === 1 && lv.same && lv.loyal, lv);

  // ---------- friends know things about brands; the brand never admits ----------
  const rm = await G(page, () => {
    const H = window.__hype, g = H.S.game, T = H.charByHandle(g, 'theo.marlin'); g.deals.filter((x) => x.state === 'offer').forEach((x) => { x.state = 'declined'; });
    const d = H.makeOffer(g, { scam: 'impaye', what: 'short', brand: 'Lune Rapide' });
    const p = H.promptDM(g, T, [], 'tu connais Lune Rapide ? ils me proposent un partenariat');
    const p0 = H.promptDM(g, T, [], 'salut ça va ?');
    const b = H.promptDM(g, g.chars[d.contact], [], 'vous payez quand exactement ?');
    return { rumor: p.includes('Le joueur parle de la marque Lune Rapide') && p.includes('jamais été payés'), none: !p0.includes('Le joueur parle de la marque'), secret: b.includes('n’a aucune intention de payer') && b.includes('ne l’avoue JAMAIS') };
  });
  check('a friend asked about a brand may know what the milieu says (the AI decides); the brand itself never admits its scam', rm.rumor && rm.none && rm.secret, rm);

  // ---------- the audience grows slower as it grows ----------
  const gr = await G(page, () => { const H = window.__hype; return { k1: H.growthK(800), k10: H.growthK(10000), k100: H.growthK(100000), k2m: H.growthK(2e6) }; });
  check('the audience grows slower as it grows: untouched up to 1 000, about ×0,4 at 10 000, ×0,16 at 100 000, ×0,05 past 2 millions',
    gr.k1 === 1 && gr.k10 > 0.35 && gr.k10 < 0.45 && gr.k100 > 0.13 && gr.k100 < 0.2 && gr.k2m < 0.06, gr);

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  console.log(`\n${checks.filter((c) => c[0] === 'PASS').length}/${checks.length} PASS`);
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch(async (e) => {
  console.error('FAILED', e);
  if (lastPage) await lastPage.screenshot({ path: path.join(OUT, 'fail.png') }).catch(() => {});
  console.log('ERRORS', errors.join('\n'));
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  process.exit(1);
});
