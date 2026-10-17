// 0.15 end to end, in Chromium against the built hype.html with the mocked Claude runtime: frictions for nice players,
// and a phone that reads better.
// - getting close to someone annoys whoever cannot stand them (colder, a dig or a jealous word; wary afterwards), and the
//   ties stay hidden;
// - the AI may make one of them fall into a bad buzz on their own (offered by a refresh, one at a time): standing by them
//   or piling on counts, and so does staying silent with a close one;
// - blocked a second time, they cut ties: messages no longer reach them (no AI call) until a public gesture;
// - a cancel names its way out (the notice, a friend told to advise it, the compose box);
// - on a phone: the level written out (not a pink round), one watch button, the pen steps aside while scrolling down, the
//   toasts at the bottom, « @ » suggests names (in a post and in a reply), and once per game a tip about meeting up.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/frictions.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-frictions');
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
async function dismiss(page) { for (let k = 0; k < 6 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(700); } }
async function clickText(page, sel, text) {
  const el = page.locator(sel, { hasText: text }).first();
  if (!sel.startsWith('.modal')) await dismiss(page);
  await el.waitFor({ state: 'visible', timeout: 15000 });
  await el.click();
}
const G = (page, fn, arg) => page.evaluate(fn, arg);
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create); })) await sleep(250); };
async function dm(page, id, text) {
  const n0 = await G(page, () => window.__prompts.length);
  await G(page, (a) => window.__hype.sendDM(a.id, a.text), { id, text });
  await idle(page);
  return G(page, (n) => window.__prompts.length - n, n0);
}
async function post(page, text, kindness) {
  await G(page, (k) => { window.__mockKindness = k; }, kindness);
  await G(page, (t) => window.__hype.runAct('post', t), text);
  await idle(page);
  await G(page, () => { window.__mockKindness = null; });
  await sleep(300);
}
const clearLayers = (page) => G(page, () => { window.__hype.S.stack = []; window.__hype.S.modals = []; window.__hype.update(); });

async function newPage(browser, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true, colorScheme: 'light' });
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript(() => {
    window.__mockCoeurs = { 'theo.marlin': 'serein', 'nox.ombre': 'serein', 'zara.vey': 'serein', 'leandre.aube': 'serein', 'lou.cendre': 'serein' };
  });
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

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);
  await clickText(page, 'button', 'Nouvelle partie');
  await clickText(page, 'button.world', 'Académie Lumen');
  await page.waitForSelector('#pn');
  await page.fill('#pn', 'Mila Flux');
  await clickText(page, '.seg button', 'Elle');
  await page.fill('#pi', 'Une influenceuse qui enquête sur les secrets de l’académie');
  await clickText(page, '.tier', 'Sans limite');
  await page.check('#p18');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=Qui sera ton premier abonné', { timeout: 20000 });
  await page.locator('.cast-card.pick', { hasText: 'Théo' }).click();
  await page.click('.cast-cta button');
  await page.waitForSelector('.post');
  await sleep(1200);
  await dismiss(page);
  const ids = await G(page, () => {
    const H = window.__hype, g = H.S.game, id = (h) => H.charByHandle(g, h).id;
    for (const c of H.mains(g, false)) { c.unlocked = true; c.cool = null; c.badBuzz = null; }
    return { theo: id('theo.marlin'), nox: id('nox.ombre'), zara: id('zara.vey'), leandre: id('leandre.aube'), lou: id('lou.cendre') };
  });

  // ---------- getting close to someone annoys whoever cannot stand them ----------
  const f1 = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, A = g.chars[I.leandre], E = g.chars[I.zara], C = g.chars[I.theo];
    for (const o of H.mains(g, false)) for (const p of H.mains(g, false)) if (o !== p) H.setTie(g, o.id, p.id, 0);
    H.setTie(g, I.leandre, I.zara, -50);
    A.rel = 50; E.rel = 10; C.rel = 10; E.foeSeen = {}; g.triggers = [];
    const e0 = E.rel;
    H.applyRel(g, A, 10, 'test', Date.now(), 15); // Léandre: « ami proche » now
    const drop = e0 - E.rel;
    const trig = (g.triggers || []).some((x) => x.text.includes('@zara.vey ne supporte pas @leandre.aube'));
    const mem = (E.mem || []).slice(-1)[0];
    const notif = g.notifs.some((n) => n.c === I.zara && /n’apprécie pas tes nouvelles fréquentations/.test(n.text));
    const e1 = E.rel;
    A.rel = 50; H.applyRel(g, A, 10, 'test', Date.now(), 15); // again, within two days: nothing more
    const again = e1 - E.rel;
    E.rel = 0; C.rel = 0;
    H.applyRel(g, E, 10, 'un gain', Date.now(), 15); H.applyRel(g, C, 10, 'un gain', Date.now(), 15);
    return { drop, trig, mem: mem && mem.t, notif, again, gainE: E.rel, gainC: C.rel };
  }, ids);
  check('getting close to someone (a new close friend) annoys whoever cannot stand them: colder, a dig on the way (the AI is told), once in two days; and wary afterwards (smaller gains while the player is close to their enemy)',
    f1.drop >= 4 && f1.trig && /le joueur s’affiche avec Léandre/.test(f1.mem || '') && f1.notif && f1.again === 0 && f1.gainE > 0 && f1.gainE < f1.gainC, f1);
  const f2 = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, A = g.chars[I.leandre], E = g.chars[I.zara];
    E.foeSeen = {}; E.rel = 40; g.triggers = [];
    A.vibe = 'couple'; A.rel = 60; A.officiel = 'public';
    const e0 = E.rel;
    H.officialize(g, A, 'couple', Date.now());
    const trig = (g.triggers || []).find((x) => x.text.includes('@zara.vey, proche du joueur, ne supporte pas @leandre.aube'));
    return { drop: e0 - E.rel, trig: !!trig && /en privé/.test(trig.text) };
  }, ids);
  await G(page, (id) => { window.__hype.S.stack = []; window.__hype.openChar(id); }, ids.zara);
  await page.waitForSelector('.layer', { timeout: 5000 });
  await sleep(400);
  const prof = await page.$eval('.layer', (e) => e.textContent);
  await shot(page, 'zara-profile');
  await clearLayers(page);
  check('in public (a couple announced) it hits harder, and a friend of the player says it in private; the ties themselves are never shown',
    f2.drop >= 6 && f2.trig && !/Ne supporte pas|ne supporte pas @|ennemie? jurée? de/i.test(prof), { f2 });

  // ---------- the AI may make one of them fall into a bad buzz on their own ----------
  await G(page, (I) => {
    const H = window.__hype, g = H.S.game;
    for (const c of H.mains(g, false)) c.badBuzz = null;
    g.selfBuzzAt = 0; g.lastRefreshAt = 0; g.trials = [];
    H.setTie(g, I.nox, I.lou, -50);
    window.__sbOffer = 'free'; window.__mockSelfBuzz = 'nox.ombre';
  }, ids);
  const nf0 = await G(page, (I) => window.__hype.S.game.chars[I.nox].followers, ids);
  await G(page, () => window.__hype.refreshFeed());
  await idle(page);
  const s1 = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, n = g.chars[I.nox];
    const p = window.__prompts.filter((x) => x.includes('Le joueur actualise son fil')).slice(-1)[0] || '';
    return { offered: p.includes('{"t":"badbuzz"'), self: !!(n.badBuzz && n.badBuzz.self), reason: n.badBuzz && n.badBuzz.reason, followers: n.followers,
      notif: g.notifs.some((x) => x.c === I.nox && /🔥 Nox[^:]* est en plein bad buzz : un vieux post gênant qui refait surface/.test(x.text)),
      ctx: /EN PLEIN BAD BUZZ après « un vieux post gênant qui refait surface » \(le joueur n’y est pour rien\)/.test(H.ctxText(g, { focus: new Set([I.nox]) })),
      dm: /le joueur n’y est pour rien ; ce qu’il en dit compte/.test(H.promptDM(g, n, [], 'salut')) };
  }, ids);
  await G(page, () => { window.__hype.S.game.lastRefreshAt = 0; return window.__hype.refreshFeed(); });
  await idle(page);
  const s2 = await G(page, () => { const p = window.__prompts.filter((x) => x.includes('Le joueur actualise son fil')).slice(-1)[0] || ''; return { offered: p.includes('{"t":"badbuzz"') }; });
  await G(page, () => { window.__sbOffer = null; window.__mockSelfBuzz = null; });
  check('a refresh may offer the AI to make one of them fall into a bad buzz on their own: it does (a reason of its own), they lose followers, everybody is told the player has nothing to do with it; one at a time (the next refresh offers nothing)',
    s1.offered && s1.self && s1.reason === 'un vieux post gênant qui refait surface' && s1.followers < nf0 && s1.notif && s1.ctx && s1.dm && !s2.offered, { s1, s2, nf0 });

  const d0 = await G(page, (I) => { const g = window.__hype.S.game, n = g.chars[I.nox], l = g.chars[I.lou]; n.rel = 20; l.rel = 10; l.foeSeen = {}; return { n: n.rel, t: window.__hype.trustOf(n), l: l.rel }; }, ids);
  await post(page, '@nox.ombre courage, on a tous posté des bêtises un jour. je suis avec toi', 3);
  const d1 = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, n = g.chars[I.nox], l = g.chars[I.lou];
    return { sided: n.badBuzz && n.badBuzz.sided, n: n.rel, t: H.trustOf(n), l: l.rel, mem: (n.mem || []).some((m) => /m’a défendu\S* quand j’étais en plein bad buzz/.test(m.t)), whisper: (g.whispers || []).some((w) => /a défendu @nox\.ombre/.test(w.text)) };
  }, ids);
  // piling on someone else
  const p0 = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, n = g.chars[I.nox], z = g.chars[I.zara], a = g.chars[I.leandre];
    n.badBuzz.until = Date.now() - 1; n.badBuzz.over = true; g.selfBuzzAt = 0;
    z.rel = 10; a.rel = 30; a.foeSeen = {};
    const ok = !!H.startSelfBuzz(g, z, 'une promesse pas tenue à ses fans');
    return { ok, z: z.rel, a: a.rel };
  }, ids);
  await post(page, '@zara.vey ça t’apprendra à promettre n’importe quoi à tes fans', -3);
  const p1 = await G(page, (I) => { const g = window.__hype.S.game, z = g.chars[I.zara], a = g.chars[I.leandre]; return { sided: z.badBuzz && z.badBuzz.sided, z: z.rel, a: a.rel, mem: (z.mem || []).some((m) => /en a rajouté/.test(m.t)) }; }, ids);
  // staying silent with a close one
  const q1 = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, z = g.chars[I.zara], t = g.chars[I.theo];
    z.badBuzz.until = Date.now() - 1; z.badBuzz.over = true; g.selfBuzzAt = 0;
    t.rel = 50;
    H.startSelfBuzz(g, t, 'un clash qui a dérapé en live');
    const r0 = t.rel, f0 = t.followers;
    t.badBuzz.until = Date.now() - 1;
    H.tickHearts(g, Date.now());
    return { drop: r0 - t.rel, back: t.followers - f0, over: t.badBuzz.over, mem: (t.mem || []).some((m) => /n’a rien dit/.test(m.t)) };
  }, ids);
  check('standing by them in public counts (closer, more trust, they remember, it gets around; their enemy notices); piling on too (colder; their enemy likes it); a close one left alone through it remembers',
    d1.sided === 'defend' && d1.n > d0.n && d1.t > d0.t && d1.mem && d1.whisper && d1.l < d0.l
    && p0.ok && p1.sided === 'pile' && p1.z <= p0.z - 8 && p1.a > p0.a && p1.mem && q1.drop >= 4 && q1.back > 0 && q1.over && q1.mem, { d0, d1, p0, p1, q1 });

  // ---------- blocked twice: they cut ties, until a public gesture ----------
  const c1 = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, c = g.chars[I.theo];
    c.cool = null; c.blocks = 0; c.cut = null; c.rel = 20; c.badBuzz = null;
    H.startCool(g, c, 'bloque', 'tu as insisté');
    const b1 = { blocks: c.blocks, cut: !!c.cut };
    H.endCool(g, c, 'time');
    H.startCool(g, c, 'bloque', 'tu as insisté lourdement');
    return { b1, blocks: c.blocks, cut: !!c.cut, notif: g.notifs.some((x) => x.c === I.theo && /a coupé les ponts : tes messages ne lui parviennent plus/.test(x.text)), ctx: /A COUPÉ LES PONTS avec le joueur/.test(H.ctxText(g, { focus: new Set([I.theo]) })) };
  }, ids);
  const seen0 = await G(page, (I) => window.__hype.S.game.notifs.filter((x) => x.c === I.theo && x.k === 'seen').length, ids);
  const calls0 = await dm(page, ids.theo, 'allez, réponds-moi, juste une fois');
  const seen1 = await G(page, (I) => window.__hype.S.game.notifs.filter((x) => x.c === I.theo && x.k === 'seen').length, ids);
  await G(page, (id) => { window.__hype.S.stack = []; window.__hype.openDM(id); }, ids.theo);
  await page.waitForSelector('.layer .cut-hint', { timeout: 5000 });
  const cutUi = await page.$eval('.layer', (e) => ({ hint: !!e.querySelector('.cut-hint'), lost: !!e.querySelector('.seen-tag.lost'), tip: !!e.querySelector('.date-tip') }));
  await shot(page, 'cut-dm');
  await clearLayers(page);
  check('blocked a second time, they cut ties (the first time, not yet): told once, the AI knows; the player’s messages no longer reach them (no AI call, no « vu »), and the conversation says so',
    !c1.b1.cut && c1.b1.blocks === 1 && c1.blocks === 2 && c1.cut && c1.notif && c1.ctx && calls0 === 0 && seen1 === seen0 && cutUi.hint && cutUi.lost && !cutUi.tip, { c1, calls0, seen0, seen1, cutUi });
  const r0 = await G(page, (I) => window.__hype.S.game.chars[I.theo].rel, ids);
  await post(page, '@theo.marlin je te dois des excuses : j’ai été lourde, tu avais raison. respect, vraiment.', 3);
  const r1 = await G(page, (I) => { const g = window.__hype.S.game, c = g.chars[I.theo]; return { cut: !!c.cut, blocks: c.blocks, rel: c.rel, notif: g.notifs.some((x) => x.c === I.theo && /a vu ton geste en public/.test(x.text)), trig: (g.triggers || []).some((x) => x.text.includes('qui avait coupé les ponts')) }; }, ids);
  const calls1 = await dm(page, ids.theo, 'merci de me reparler');
  check('a public gesture (a kind post that names them) brings them back: they talk again (an AI call), warmer, and the next block cuts again at once',
    !r1.cut && r1.blocks === 1 && r1.rel > r0 && r1.notif && r1.trig && calls1 === 1, { r0, r1, calls1 });

  // ---------- a cancel names its way out ----------
  const k1 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    g.stats.cancelled = false; g.stats.reputation = 10; g.apologyAt = 0; g.triggers = [];
    H.checkCancel(g);
    const n = g.notifs.filter((x) => x.k === 'cancel').slice(-1)[0];
    return { cancelled: g.stats.cancelled, notif: n && n.text, trig: (g.triggers || []).some((x) => /lui conseiller de s’excuser en public/.test(x.text)) };
  });
  await dismiss(page);
  await clearLayers(page);
  await G(page, () => window.__hype.openCompose());
  await page.waitForSelector('.layer .cancel-nudge', { timeout: 5000 });
  await shot(page, 'cancel-nudge');
  await page.click('.layer .cancel-nudge button');
  await sleep(300);
  const k2 = await G(page, () => ({ title: (document.querySelector('.layer .layer-head h2') || {}).textContent, nudge: !!document.querySelector('.layer .cancel-nudge'), apology: !!document.querySelector('.layer .apology-hint:not(.cancel-nudge)') }));
  await clearLayers(page);
  await G(page, () => { const H = window.__hype, g = H.S.game; H.S.modals = []; H.openNotif(g.notifs.filter((x) => x.k === 'cancel').slice(-1)[0]); });
  const k3 = await G(page, () => window.__hype.S.modals.some((m) => m.t === 'cancel'));
  await G(page, () => { const H = window.__hype, g = H.S.game; H.S.modals = []; g.stats.cancelled = false; g.stats.reputation = 60; H.update(); });
  check('a cancel names its way out: the notice says « excuses publiques », a friend is asked to advise it, writing a post offers to apologise instead (one tap), and the notice opens the ways out again',
    k1.cancelled && /excuses publiques sincères/.test(k1.notif || '') && !/350/.test(k1.notif || '') && k1.trig && k2.title === 'Excuses publiques' && !k2.nudge && k2.apology && k3, { k1, k2, k3 });

  // ---------- the phone: the header, the pen, the toasts ----------
  await clearLayers(page);
  await G(page, () => window.__hype.goTab('feed'));
  await sleep(500);
  const hd = await G(page, () => {
    const dot = document.querySelector('.topbar .lvl-dot'), ff = document.querySelector('.feed-tools .ffwd-btn'), ck = document.querySelector('.status-strip .clock-btn'), xp = document.querySelector('.topbar .xpline');
    const badge = getComputedStyle(document.documentElement).getPropertyValue('--hot').trim();
    return { dot: dot && dot.textContent, dotShown: !!dot && getComputedStyle(dot).display !== 'none', dotBg: dot && getComputedStyle(dot).backgroundColor, hot: badge, ffwd: ff && getComputedStyle(ff).display, clock: !!ck && getComputedStyle(ck).display !== 'none', xp: xp && xp.getBoundingClientRect().height };
  });
  await shot(page, 'header');
  check('on a phone, the level is written out (« Niv. n ») in ink, not a pink round like the notifications; the XP bar is thicker; one button for the watch (the clock), the feed’s one is gone',
    /^Niv\. \d+$/.test(hd.dot || '') && hd.dotShown && hd.dotBg !== 'rgb(216, 19, 111)' && hd.ffwd === 'none' && hd.clock && hd.xp >= 3, hd);
  // enough to scroll
  for (let k = 0; k < 3; k++) { await G(page, () => { window.__hype.S.game.lastRefreshAt = 0; return window.__hype.refreshFeed(); }); await idle(page); }
  await G(page, () => window.__hype.goTab('feed'));
  await sleep(4000);
  const sc = await G(page, async () => {
    const v = document.querySelector('.view'), wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const tall = v.scrollHeight - v.clientHeight;
    v.scrollTop = 0; await wait(150);
    const until = async (f) => { for (let k = 0; k < 20 && !f(); k++) await wait(100); return f(); }; // (a busy machine renders late)
    v.scrollTop = 120; await wait(150); v.scrollTop = 420;
    const down = await until(() => !!document.querySelector('.fab.away') && window.__hype.S.scrollY >= 400); // (the scroll to 420 seen, not only the one to 120)
    v.scrollTop = 200;
    const up = await until(() => !document.querySelector('.fab.away') && !!document.querySelector('.fab'));
    return { tall, down, up };
  });
  check('the pen steps aside while scrolling down (it hid likes and texts) and comes back on the way up', sc.tall > 450 && sc.down && sc.up, sc);
  await G(page, () => { const v = document.querySelector('.view'); v.scrollTop = 0; window.__hype.S.fabAway = false; window.__hype.update(); });
  await sleep(300);
  await G(page, () => window.__hype.toast('Un petit mot pour tester'));
  await page.waitForSelector('.toasts .toast', { timeout: 3000 });
  await sleep(500);
  const ts = await G(page, () => {
    const t = document.querySelector('.toasts').getBoundingClientRect(), f = document.querySelector('.fab'), b = document.querySelector('.tabbar').getBoundingClientRect(), top = document.querySelector('.topbar').getBoundingClientRect(), clock = document.querySelector('.status-strip').getBoundingClientRect();
    return { top: t.top, bottom: t.bottom, fabTop: f ? f.getBoundingClientRect().top : null, bar: b.top, header: Math.max(top.bottom, clock.bottom), h: innerHeight };
  });
  await shot(page, 'toast-bottom');
  await G(page, () => { window.__hype.S.toasts = []; window.__hype.S.game.tipDate = { done: true }; window.__hype.openDM(window.__hype.charByHandle(window.__hype.S.game, 'nox.ombre').id); });
  await page.waitForSelector('.layer .layer-foot', { timeout: 5000 });
  await sleep(400);
  await G(page, () => window.__hype.toast('Un autre mot, en conversation'));
  await page.waitForSelector('.toasts .toast', { timeout: 3000 });
  await sleep(500);
  const tl = await G(page, () => {
    const t = document.querySelector('.toasts').getBoundingClientRect(), L = [...document.querySelectorAll('.layer')].pop();
    return { top: t.top, bottom: t.bottom, foot: L.querySelector('.layer-foot').getBoundingClientRect().top, head: L.querySelector('.layer-head').getBoundingClientRect().bottom };
  });
  await shot(page, 'toast-dm');
  await G(page, () => { window.__hype.S.toasts = []; });
  await clearLayers(page);
  check('the toasts sit at the bottom: above the pen and the tab bar, never on the clock; in a conversation, just above the box being typed in, below its header',
    ts.top > ts.header && ts.bottom <= (ts.fabTop || ts.bar) + 1 && ts.top > ts.h / 2 && tl.bottom <= tl.foot + 1 && tl.top > tl.head, { ts, tl });

  // ---------- « @ » suggests names ----------
  await G(page, () => window.__hype.openCompose());
  await page.waitForSelector('#compose');
  await page.click('#compose');
  await page.keyboard.type('salut @za', { delay: 30 });
  await page.waitForSelector('.mention-list .mention-opt', { timeout: 3000 });
  const m1 = await page.$$eval('.mention-list .mention-opt', (els) => els.map((e) => e.textContent));
  await shot(page, 'mention-list');
  await page.locator('.mention-list .mention-opt', { hasText: 'Zara' }).first().click();
  await sleep(200);
  const v1 = await page.$eval('#compose', (e) => ({ v: e.value, caret: e.selectionStart, list: !!document.querySelector('.mention-list') }));
  await page.keyboard.type('et @th', { delay: 30 });
  await page.waitForSelector('.mention-list .mention-opt', { timeout: 3000 });
  await page.keyboard.press('Enter');
  await sleep(200);
  const v2 = await page.$eval('#compose', (e) => e.value);
  await page.keyboard.type('@', { delay: 30 });
  await page.waitForSelector('.mention-list', { timeout: 3000 });
  await page.keyboard.press('Escape');
  await sleep(200);
  const v3 = await G(page, () => ({ list: !!document.querySelector('.mention-list'), compose: window.__hype.S.stack.some((l) => l.t === 'compose') }));
  await G(page, () => { window.__hype.S.drafts.post = ''; });
  await clearLayers(page);
  const pid = await G(page, () => window.__hype.S.game.posts.find((p) => p.a !== 'p' && p.at <= Date.now()).id);
  await G(page, (id) => window.__hype.openPost(id), pid);
  await page.waitForSelector('#reply-' + pid);
  await page.click('#reply-' + pid);
  await page.keyboard.type('@no', { delay: 30 });
  await page.waitForSelector('.mention-list .mention-opt', { timeout: 3000 });
  const m4 = await page.$$eval('.mention-list .mention-opt', (els) => els.map((e) => e.textContent));
  await page.keyboard.press('Tab');
  await sleep(200);
  const v4 = await page.$eval('#reply-' + pid, (e) => e.value);
  await G(page, (id) => { window.__hype.S.drafts.reply[id] = ''; }, pid);
  await clearLayers(page);
  check('« @ » suggests the people of the world as the player types (a post and a reply): a tap, Enter or Tab writes the handle; Escape closes the list, not the screen',
    m1.length >= 1 && /Zara Vey/.test(m1[0]) && v1.v === 'salut @zara.vey ' && v1.caret === v1.v.length && !v1.list && v2 === 'salut @zara.vey et @theo.marlin ' && !v3.list && v3.compose && /Nox/.test(m4[0] || '') && v4 === '@nox.ombre ', { m1, v1, v2, v3, m4, v4 });

  // ---------- once per game: proposing to meet exists ----------
  await G(page, () => { const H = window.__hype, g = H.S.game; g.tipDate = null; H.S.tipLayer = null; g.events = (g.events || []).filter((e) => !e.player); });
  await G(page, (id) => window.__hype.openDM(id), ids.theo);
  await page.waitForSelector('.layer .bubble.them', { timeout: 5000 });
  await sleep(300);
  const t1 = await page.$eval('.layer', (e) => ({ tip: e.querySelector('.date-tip') ? e.querySelector('.date-tip').textContent : null }));
  await shot(page, 'date-tip');
  await clearLayers(page);
  await G(page, (id) => window.__hype.openDM(id), ids.theo);
  await page.waitForSelector('.layer .bubble.them', { timeout: 5000 });
  await sleep(300);
  const t2 = await G(page, () => ({ tip: !!document.querySelector('.layer .date-tip'), saved: !!window.__hype.S.game.tipDate }));
  await clearLayers(page);
  check('once per game, in the first conversation where someone answers, a tip says proposing to meet exists (no button); never again after',
    /proposer de vous voir/.test(t1.tip || '') && !t2.tip && t2.saved, { t1, t2 });

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
