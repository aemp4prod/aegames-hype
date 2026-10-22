// The stats of the shop (0.30.2), in Chromium against the built hype.html with the mocked Claude runtime:
// - each game day is kept (pieces sold, money, returns) for the shop and each product, and adds up to the totals;
// - the reviews come a few days after the orders, their stars from how it was made and what happened to it, with what
//   they praise or blame; the verdict (very positive → negative) and its trend over the week;
// - what the network says: a post or a comment about the shop, tagged + or − by the AI that writes it (only while
//   something is on sale), counted and quoted; what the AI knows of the reviews;
// - a shop from before: its reviews written from its sales, its days from now on;
// - « Les stats » in the shop: the verdict, three numbers, the sales and the reviews of 14 days, the stars, the network,
//   a product picked, the tooltip, the tables; on a phone, in dark mode; a save too big keeps less;
// - 0.30.2 too: the quote buys what the video changes for good and rents what it gives back intact.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/shopstats.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-shopstats');
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
async function shot(page, name) { await page.evaluate(() => { const H = window.__hype; if (H && H.S) { H.S.toasts.length = 0; H.update(); } }); await new Promise((r) => setTimeout(r, 120)); shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
const G = (page, fn, arg) => page.evaluate(fn, arg);
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.devis); })) await sleep(150); await sleep(300); };
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
  await page.waitForFunction(() => !document.querySelector('.layer'), null, { timeout: 5000 }).catch(() => {});
  await G(page, () => window.__hype.openLayer({ t: 'merch' }));
  await page.waitForSelector('.layer .shop-head');
  if (tab) { await page.locator('.layer .shop-head .seg button', { hasText: tab }).click(); await sleep(300); }
};
async function refresh(page, lines) {
  await G(page, (lines) => { const g = window.__hype.S.game; g.lastRefreshAt = 0; for (const p of g.posts) delete p.cd; window.__mockOnce = [{ has: 'Le joueur actualise son fil', add: true, lines }]; }, lines);
  await G(page, () => window.__hype.refreshFeed(0));
  await idle(page);
}

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);
  await G(page, () => { window.__hypeNoGearEvents = true; const H = window.__hype, g = H.S.game; for (const c of H.mains(g, false)) c.unlocked = true; g.career.warmth = 60; g.stats.followers = 200000; g.career.cash = 200000; });

  // ---------- nothing on sale: no tag asked of the AI ----------
  const before = await G(page, () => { const H = window.__hype, g = H.S.game; return { line: H.merchTagLine(g), refresh: /parle de la boutique du joueur/.test(H.promptRefresh(g, 0)) }; });

  // ---------- a product launched, 14 days of sales ----------
  const run = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const r = H.prepItem(g, { k: 'tshirt', design: 'une fiole qui fait des bulles', price: 25, mode: 'stock', origin: 'fr', mat: 'coton', print: 'seri', qty: 2500 });
    if (!r.ok) return { why: r.why };
    const p = r.p; p.state = 'ready'; p.stock = 2500; p.made = 2500;
    H.launchDrop(g, { items: [p] }, 4, null, Date.now());
    H.tickMerch(g, Date.now()); // (the game's tick, every second: the shop's day is today)
    const d0 = H.gameDay(Date.now()), S = H.shopOf(g), firstRev = [];
    for (let k = 1; k <= 14; k++) { H.jumpClock(g, 86400000); const D = (S.days || []).find((x) => x.d === d0 + k); firstRev.push(D ? D.rp + D.rm + D.rb : -1); }
    const sumN = S.days.reduce((n, x) => n + x.n, 0), sumCa = Math.round(S.days.reduce((n, x) => n + x.ca, 0) * 100) / 100;
    const pN = p.days.reduce((n, x) => n + x.n, 0), revs = S.days.reduce((n, x) => n + x.rp + x.rm + x.rb, 0), pos = S.days.reduce((n, x) => n + x.rp, 0);
    return { id: p.id, sold: p.sold, sumN, pN, revenue: Math.round(p.revenue * 100) / 100, sumCa, days: S.days.length, stars: H.starsN(p), revs, pos, firstRev, rev: p.rev, avg: H.avgStars(p), q: p.q, likes: p.likes || {} };
  });
  check('each game day of the shop is kept (pieces, money) for the shop and the product, and adds up to the totals; the reviews come a few days after the orders (none the first day), about 8 % of the buyers; the average shown is theirs',
    run.sold > 100 && run.sumN === run.sold && run.pN === run.sold && Math.abs(run.sumCa - run.revenue) < 0.05 && run.days >= 14 && run.firstRev[0] === 0 && run.stars === run.revs && run.stars >= run.sold * 0.04 && run.stars <= run.sold * 0.1 && run.rev === run.avg && run.pos / run.revs >= 0.7, run);

  // ---------- the stars: from how it was made and what happened to it, with the reasons ----------
  const dist = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    const mk = (o) => Object.assign({ id: 'x' + Math.random(), k: 'tshirt', price: 25, mode: 'stock', origin: 'fr', mat: 'coton', print: 'seri', state: 'live' }, o);
    const roll = (p, n = 600) => { for (let i = 0; i < n; i++) H.writeReview(p, t); const s = p.stars, N = s.reduce((a, b) => a + b, 0); return { good: (s[3] + s[4]) / N, bad: (s[0] + s[1]) / N, why: Object.entries(p.why || {}).sort((a, b) => b[1] - a[1]).map((x) => x[0]), likes: Object.entries(p.likes || {}).sort((a, b) => b[1] - a[1]).map((x) => x[0]) }; };
    const good = mk({}); good.q = H.qualityOf(good); good.price = Math.round(H.prodFair(good));
    const bad = mk({ k: 'sweat', origin: 'cn', mat: 'poly', print: 'transfert', badAt: t - 86400000 }); bad.q = H.qualityOf(bad); bad.price = Math.round(H.prodFair(bad));
    const dear = mk({ mode: 'pod', origin: null, print: null }); dear.q = H.qualityOf(dear); dear.price = Math.round(H.prodFair(dear) * 2.2);
    const out = { good: roll(good), bad: roll(bad), dear: roll(dear), qGood: good.q, qBad: bad.q };
    out.badTop = (H.revTop(g, bad, 'why') || {}).label;
    out.book = H.revLabel('livre', 'qualite', false) + ' / ' + H.revLabel('parfum', 'finition', true);
    return out;
  });
  check('the stars follow how it was made and what happened: made in France with care, mostly 4-5 ★ (praised for its quality, its design…); made cheap with a bad batch, mostly 1-2 ★ (blamed for the defects, the fabric, the printing); twice the fair price: « trop cher » comes up; a book or a perfume is judged in its own words',
    dist.good.good >= 0.85 && dist.bad.bad >= 0.75 && ['lot', 'tissu', 'impression', 'finition'].includes(dist.bad.why[0]) && ['qualite', 'design', 'france', 'tient', 'soutien'].includes(dist.good.likes[0]) && dist.dear.why.slice(0, 2).includes('prix')
      && /défectueuses|tissu|impression|finition/.test(dist.badTop) && dist.book === 'l’histoire / l’odeur qui ne tient pas', dist);

  // ---------- the verdict and its trend ----------
  const verdict = await G(page, () => {
    const H = window.__hype, g = H.S.game, S = H.shopOf(g), keep = S.days, d0 = H.gameDay(Date.now()), out = {};
    const day = (d, rp, rb, o = {}) => Object.assign({ d, n: 0, ca: 0, ret: 0, rp, rm: 0, rb, np: 0, nb: 0 }, o);
    S.days = []; for (let k = 13; k >= 0; k--) S.days.push(k >= 7 ? day(d0 - k, 5, 0) : day(d0 - k, 1, 4));
    out.turn = H.shopVerdict(g); // 42 good, 28 bad: mixed, going down
    S.days = []; for (let k = 13; k >= 0; k--) S.days.push(day(d0 - k, 4, 0, { np: k === 0 ? 2 : 0 }));
    out.great = H.shopVerdict(g);
    S.days = []; for (let k = 13; k >= 0; k--) S.days.push(day(d0 - k, 0, 2));
    out.awful = H.shopVerdict(g);
    S.days = keep;
    return { turn: [out.turn.label, out.turn.trend, out.turn.pct], great: [out.great.label, out.great.trend, out.great.pct], awful: [out.awful.label, out.awful.tone] };
  });
  check('the verdict: « Très positifs », « Globalement positifs », « Mitigés » or « Globalement négatifs » over the last 14 days (good mentions of the network count too), and a trend when this week differs from the one before',
    verdict.turn[0] === 'Mitigés' && verdict.turn[1] === -1 && verdict.turn[2] === 60 && verdict.great[0] === 'Très positifs' && verdict.great[1] === 0 && verdict.great[2] === 100 && verdict.awful[0] === 'Globalement négatifs' && verdict.awful[1] === 'bad', verdict);

  // ---------- what the network says, tagged by the AI ----------
  const tagged0 = await G(page, () => { const H = window.__hype, g = H.S.game; return { line: H.merchTagLine(g), n: (H.shopOf(g).said || []).length, d: (H.shopOf(g).days.find((x) => x.d === H.gameDay(Date.now())) || {}) }; });
  const n0 = await G(page, () => window.__prompts.length);
  await refresh(page, [
    { t: 'post', by: 'theo.marlin', text: 'le t-shirt fiole de @mila.flux est trop doux, je le porte tout le temps', merch: '+' },
    { t: 'reply', to: 0, by: 'leandre.aube', text: 'reçu le mien, l’impression est déjà en train de partir…', merch: '-' },
    { t: 'post', by: 'leandre.aube', text: 'grosse journée de cours aujourd’hui' },
  ]);
  const tagged = await G(page, (n0) => {
    const H = window.__hype, g = H.S.game, S = H.shopOf(g), D = S.days.find((x) => x.d === H.gameDay(Date.now())) || {};
    const pr = window.__prompts.slice(n0).find((p) => p.includes('Le joueur actualise son fil')) || '';
    const post = g.posts.find((p) => /t-shirt fiole/.test(p.text)), plain = g.posts.find((p) => /grosse journée de cours/.test(p.text));
    return { asked: /parle de la boutique du joueur \(t-shirt/.test(pr) && /"merch":"\+"/.test(pr), said: (S.said || []).map((x) => x.s + ' @' + x.h), np: D.np, nb: D.nb, mx: post && post.mx, plain: plain ? plain.mx === undefined : 'missing', ctx: H.merchCtx(g) };
  }, n0);
  check('while something is on sale, the AI that writes posts and comments tags what is said about the shop (+ or −): counted on the day, the last ones quoted; nothing asked when nothing is on sale; the AI knows what the buyers say',
    before.line === null && !before.refresh && tagged0.line && tagged.asked && tagged.said.slice(-2).join() === '1 @theo.marlin,-1 @leandre.aube' && tagged.np === (tagged0.d.np || 0) + 1 && tagged.nb === (tagged0.d.nb || 0) + 1 && tagged.mx === 1 && tagged.plain === true
      && /Les retours de ses clients : (très positifs|globalement positifs) \(\d+ % de bons avis/.test(tagged.ctx), { before, tagged0, tagged });

  // ---------- « Les stats » ----------
  await G(page, () => { const H = window.__hype, g = H.S.game; const r = H.prepItem(g, { k: 'mug', design: 'potion du matin', price: 15, mode: 'pod' }); H.launchDrop(g, { items: [r.p] }, 3, null, Date.now() - 2 * 86400000); H.jumpClock(g, 3600000); });
  await shop(page, 'Les stats');
  await page.waitForSelector('.layer .shop-stats-view');
  const ui = await G(page, () => {
    const q = (s) => document.querySelector('.layer ' + s), qa = (s) => [...document.querySelectorAll('.layer ' + s)];
    const bars = qa('.st-sales .st-col .st-bar').map((b) => parseFloat(b.style.height) || 0);
    return { verdict: (q('.st-verdict') || {}).textContent || '', kpis: qa('.st-kpis > div').map((x) => x.textContent.replace(/\s+/g, ' ').trim()), cols: qa('.st-sales .st-col').length, max: Math.max(...bars), label: !!q('.st-sales .st-val'),
      revCols: qa('.st-revs .st-col').length, goodBars: qa('.st-revs .st-bar.good').filter((b) => parseFloat(b.style.height) > 0).length, rows: qa('.st-stars .st-row').length, net: (q('.st-net') || {}).textContent || '', quotes: qa('.st-said li').length, chips: qa('.st-pick .chip-btn').map((x) => x.textContent.trim()),
      xs: qa('.st-sales + .st-x span, .st-sales .st-x span').length, today: (q('.st-sales .st-x .today') || {}).textContent || '', sub: (q('.st-sales figcaption span') || {}).textContent || '' };
  });
  await shot(page, 'stats');
  check('« Les stats »: the verdict (with the trend, what they blame and praise), three numbers, the sales of the last 14 days (the best day labelled, today marked), the reviews of those days, the stars, what the network said; a filter row: the whole shop or one product',
    /Retours (très positifs|globalement positifs)/i.test(ui.verdict) && /% de bons avis/.test(ui.verdict) && /Ce qu’ils adorent/.test(ui.verdict) && ui.kpis.length === 3 && /^Vendus/.test(ui.kpis[0]) && /Chiffre d’affaires/.test(ui.kpis[1]) && /★/.test(ui.kpis[2])
      && ui.cols === 14 && ui.max === 100 && ui.label && ui.revCols === 14 && ui.goodBars >= 5 && ui.rows === 5 && /du bien/.test(ui.net) && /du mal/.test(ui.net) && ui.quotes === 2 && /@theo\.marlin/.test(ui.net)
      && ui.chips.length === 3 && ui.chips[0] === 'Toute la boutique' && ui.today === 'auj.', ui);

  // the tooltip (pointer and keyboard), the table, one product
  const col = page.locator('.layer .st-sales .st-col').nth(10);
  await col.hover();
  await sleep(200);
  const tip = await txt(page, '.layer .st-sales .st-tip');
  await shot(page, 'stats-tooltip');
  await page.locator('.layer .st-sales .st-table summary').click();
  await sleep(200);
  const rows = await G(page, () => document.querySelectorAll('.layer .st-sales .st-table tbody tr').length);
  await page.locator('.layer .st-pick .chip-btn', { hasText: 'Mug' }).click();
  await sleep(300);
  const one = await G(page, () => ({ net: !!document.querySelector('.layer .st-net'), sub: (document.querySelector('.layer .st-sales figcaption span') || {}).textContent || '', on: (document.querySelector('.layer .st-pick .chip-btn.on') || {}).textContent || '' }));
  await shot(page, 'stats-mug');
  check('the day under the pointer says its sales, its money and its date; each chart has its table (14 days); a product picked: every chart is its own (the network, which speaks of the whole shop, is set aside)',
    /\d+ vendus?/.test(tip) && /(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) \d+/.test(tip) && rows === 14 && !one.net && /Mug/.test(one.on) && one.sub !== ui.sub, { tip, rows, one, sub: ui.sub });

  // ---------- the Studio and the weekly notice say it too ----------
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.S.modals.length = 0; H.goTab('studio'); H.update(); });
  await sleep(400);
  const studio = await txt(page, '.boutique');
  await page.locator('.boutique button', { hasText: 'Les stats' }).click();
  await page.waitForSelector('.layer .shop-stats-view', { timeout: 5000 }).catch(() => {});
  const opened = await G(page, () => ({ view: !!document.querySelector('.layer .shop-stats-view'), on: (document.querySelector('.layer .shop-head .seg button.on') || {}).textContent || '' }));
  const weekly = await G(page, () => { const g = window.__hype.S.game; return (g.notifs.filter((x) => /Ta boutique : .* cette semaine/.test(x.text)).slice(-1)[0] || {}).text || ''; });
  check('the Studio says what the buyers say (with a button to the stats), and so does the weekly notice of the shop',
    /Retours (très positifs|globalement positifs) · \d+ % de bons avis/.test(studio) && opened.view && /Les stats/.test(opened.on) && /\. Retours (très positifs|globalement positifs) \(\d+ % de bons avis\)\.$/.test(weekly), { studio, opened, weekly });

  // ---------- a shop from before: its reviews from its sales, its days from now on ----------
  const legacy = await G(page, () => {
    const H = window.__hype, g = H.S.game, S = H.shopOf(g), p = H.shopItems(g).find((x) => x.k === 'mug');
    delete p.stars; delete p.why; delete p.likes; p.sold = 300; delete S.statsAt; S.days = S.days.filter((x) => x.d === H.gameDay(Date.now()));
    H.tickMerch(g, Date.now());
    return { stars: H.starsN(p), since: S.since === H.gameDay(Date.now()), rev: p.rev === H.avgStars(p) };
  });
  await shop(page, 'Les stats');
  const legacyUI = await txt(page, '.layer .st-since');
  check('a shop from before the stats: the reviews of its past sales are written (8 %), its days are kept from now on, and the stats say so',
    legacy.stars === 24 && legacy.since && legacy.rev && /Jour par jour depuis le \d+ \p{L}+ : avant, le jeu ne gardait que les totaux/u.test(legacyUI), { legacy, legacyUI });

  // ---------- a product going wrong in a shop that does well ----------
  const sour = await G(page, () => {
    const H = window.__hype, g = H.S.game, m = H.shopItems(g).find((x) => x.k === 'mug'), t = H.shopItems(g).find((x) => x.k === 'tshirt'), d0 = H.gameDay(Date.now());
    m.stars = [9, 4, 1, 0, 0]; m.why = { prix: 6, finition: 3 }; m.days = [{ d: d0, n: 3, ca: 45, rp: 0, rm: 1, rb: 13 }];
    const S = H.shopOf(g); S.weekSold = 10; S.pend = 100;
    let D = S.days.find((x) => x.d === d0); if (!D) { D = { d: d0, n: 0, ca: 0, ret: 0, rp: 0, rm: 0, rb: 0, np: 0, nb: 0 }; S.days.push(D); }
    D.rp = Math.max(D.rp, 20); // (0.31.1: recent reviews of the shop, whatever the hour: just after midnight, today had too few)
    H.payShop(g, Date.now());
    return { tca: Math.round(t.days.reduce((a, x) => a + (x.ca || 0), 0)), trev: Math.round(t.revenue), weekly: (g.notifs.filter((x) => /Ta boutique : .* cette semaine/.test(x.text)).slice(-1)[0] || {}).text || '' };
  });
  await shop(page, 'Les stats');
  const sourHead = await G(page, () => ({ alert: (document.querySelector('.layer .st-alert') || {}).textContent || '', head: (document.querySelector('.layer .shop-head .shop-stats') || {}).textContent || '', note: ([...document.querySelectorAll('.layer .st-kpis > div')][2] || {}).textContent || '' }));
  await page.locator('.layer .st-alert').first().click();
  await sleep(300);
  const sourMug = await G(page, () => ({ on: (document.querySelector('.layer .st-pick .chip-btn.on') || {}).textContent || '', ca: ([...document.querySelectorAll('.layer .st-kpis > div')][1] || {}).textContent || '', verdict: (document.querySelector('.layer .st-verdict') || {}).textContent || '' }));
  await shot(page, 'stats-sour');
  const headAvg = (sourHead.head.match(/(\d,\d) ★ avis/) || [])[1], noteAvg = (sourHead.note.match(/(\d,\d) ★/) || [])[1];
  check('a product going wrong in a shop that does well is said at the top (a button to its own stats: its money, its verdict, what they blame) and in the weekly notice; the shop\'s average is the same everywhere; a product\'s money adds up',
    /Mug : retours globalement négatifs \(trop cher pour ce que c’est\)/.test(sourHead.alert) && /Mug/.test(sourMug.on) && /45\s€/.test(sourMug.ca) && /Retours globalement négatifs/.test(sourMug.verdict) && /reproche le plus : trop cher pour ce que c’est/.test(sourMug.verdict)
      && /, sauf pour ton mug\.$/.test(sour.weekly) && headAvg && headAvg === noteAvg && sour.tca === sour.trev, { sour, sourHead, sourMug, headAvg, noteAvg });

  // ---------- on a phone, in dark mode ----------
  await page.setViewportSize({ width: 390, height: 844 });
  await shop(page, 'Les stats');
  await sleep(300);
  const over = await G(page, () => { const w = window.innerWidth; return [...document.querySelectorAll('.layer .shop-body *, .layer .shop-head *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > w + 1 || r.left < -1); }).slice(0, 4).map((e) => e.className || e.tagName); });
  await shot(page, 'phone-stats');
  await page.locator('.layer .st-revs .st-col').nth(13).tap().catch(() => page.locator('.layer .st-revs .st-col').nth(13).click());
  await sleep(200);
  const tipBox = await G(page, () => { const t = document.querySelector('.layer .st-revs .st-tip'); if (!t) return null; const r = t.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), w: window.innerWidth, text: t.textContent }; });
  await shot(page, 'phone-tip');
  await G(page, () => { document.documentElement.dataset.theme = 'dark'; });
  await sleep(250);
  const dark = await G(page, () => ({ bar: getComputedStyle(document.querySelector('.layer .st-sales .st-bar')).backgroundColor, good: getComputedStyle(document.querySelector('.layer .st-revs .st-bar.good')).backgroundColor }));
  await shot(page, 'phone-stats-dark');
  await G(page, () => { delete document.documentElement.dataset.theme; });
  check('on a phone (390), the stats stay inside the screen (the tooltip too, on the last day); in dark mode the marks take their own steps',
    over.length === 0 && tipBox && tipBox.l >= 0 && tipBox.r <= tipBox.w && /bons? · \d+ mauvais/.test(tipBox.text) && dark.bar === 'rgb(232, 65, 142)' && dark.good === 'rgb(31, 158, 102)', { over, tipBox, dark });

  // ---------- a save too big keeps less; the quote ----------
  const misc = await G(page, () => {
    const H = window.__hype, g = H.S.game, S = { days: Array.from({ length: 60 }, (_, k) => ({ d: k })), items: [{ days: Array.from({ length: 30 }, (_, k) => ({ d: k })) }], said: [1, 2, 3, 4, 5, 6] };
    H.shopSlim(S);
    const o = { what: 'vidéo', topic: 'je fais aller une voiture sans permis à 200 km/h' };
    const small = H.promptDevis(g, o), big = H.promptDevis(g, Object.assign({ big: 3 }, o));
    const rules = (p) => /on ne loue que ce qu’on rend intact/.test(p) && /s’achète \("kind":"achat"/.test(p) && /se loue ou s’emprunte/.test(p) && /sans la remplacer par des effets spéciaux/.test(p);
    return { slim: [S.days.length, S.items[0].days.length, S.said.length].join(), small: rules(small), big: rules(big) };
  });
  check('a save too big: the stats keep 30 days for the shop, 14 per product, 3 quotes; the quote (big production or not) buys what the video changes for good, rents what it gives back intact, and quotes what the video really does',
    misc.slim === '30,14,3' && misc.small && misc.big, misc);

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
