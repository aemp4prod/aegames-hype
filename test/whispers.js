// 0.13 end to end, in Chromium against the built hype.html with the mocked Claude runtime: word of mouth.
// - the characters have ties to each other (from the AI, their confidant, a little something for the rest), told to the
//   AI but never shown to the player, and changing with the story (a refresh line);
// - what is said about the player travels by friendship and temperament: to the one it is about (who takes it badly),
//   to an enemy (a rumor), to a loyal friend (who warns the player), good things open doors, funny ones get shared;
// - a stood-up date, a nasty word in private, a date gone wrong: told around.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/whispers.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-whispers');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(process.env.PAGE || path.join(ROOT, 'hype.html'), 'utf8');
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
// a private message, as the player sends it (the game's own function), and how many AI calls it made
async function dm(page, id, text, rolls) {
  const n0 = await G(page, () => window.__prompts.length);
  await G(page, (a) => { if (a.rolls) window.__trustRolls = a.rolls.slice(); }, { rolls });
  await G(page, (a) => window.__hype.sendDM(a.id, a.text), { id, text });
  await idle(page);
  return G(page, (n) => window.__prompts.length - n, n0);
}
const lastPrompt = (page, needle) => G(page, (x) => window.__prompts.filter((p) => p.includes(x)).slice(-1)[0] || '', needle);

async function newPage(browser, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true, colorScheme: 'light' });
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript(() => {
    window.__mockCoeurs = { 'theo.marlin': 'serein', 'nox.ombre': 'serein', 'zara.vey': 'serein', 'leandre.aube': 'serein' };
    window.__mockAmis = { 'zara.vey': 'nox.ombre', 'nox.ombre': 'theo.marlin' };
    window.__mockTies = { 'zara.vey': { ennemis: ['lou.cendre'] }, 'theo.marlin': { proches: ['maelle.fen'] }, 'nox.ombre': { proches: ['leandre.aube'] } };
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
  const ids = await G(page, () => { const H = window.__hype, g = H.S.game, id = (h) => H.charByHandle(g, h).id; return { theo: id('theo.marlin'), nox: id('nox.ombre'), zara: id('zara.vey'), iris: id('prof.gallant'), leandre: id('leandre.aube'), maelle: id('maelle.fen'), lou: id('lou.cendre') }; });

  // ---------- ties among them: from the AI, their confidant, a little something for the rest ----------
  const t0 = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, T = (a, b) => H.tieOf(g, I[a], I[b]);
    const pw = window.__prompts.find((p) => p.includes('CRÉER L’UNIVERS')) || '';
    const all = H.mains(g, false), vals = [];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) vals.push(H.tieOf(g, all[i].id, all[j].id));
    const nox = g.chars[I.nox];
    const ctx = H.ctxText(g, { focus: new Set([I.nox]) });
    // an old game: no ties at all
    const old = JSON.parse(JSON.stringify(g)); delete old.ties; delete old.whispers;
    H.initTies(old);
    return { pw: /"proches"/.test(pw) && /"ennemis"/.test(pw), theoMaelle: T('theo', 'maelle'), zaraLou: T('zara', 'lou'), noxTheo: T('nox', 'theo'), noxLea: T('nox', 'leandre'), pairs: vals.length, ctx: /entre persos : [^\n]*proche de @leandre\.aube|entre persos : [^\n]*inséparable de @theo\.marlin/.test(ctx), old: Object.keys(old.ties).length, oldW: Array.isArray(old.whispers) };
  }, ids);
  check('the characters have ties to each other: those the AI wrote (close, cannot stand each other), their confidant, a little something for every other pair; the AI is told; an old game gets them too',
    t0.pw && t0.theoMaelle >= 45 && t0.zaraLou <= -45 && t0.noxTheo >= 55 && t0.noxLea >= 45 && t0.pairs === 45 && t0.ctx && t0.old === 45 && t0.oldW, t0);
  await G(page, (id) => { window.__hype.S.stack = []; window.__hype.openChar(id); }, ids.nox);
  await page.waitForSelector('.layer .mem-list, .layer .section', { timeout: 5000 });
  await sleep(400);
  const prof = await page.$eval('.layer', (e) => ({ ties: !!e.querySelector('.ties-sec, .ties, .tie'), text: e.textContent }));
  await shot(page, 'profile-no-ties');
  await G(page, () => { window.__hype.S.stack = []; window.__hype.update(); });
  // a refresh: two of them fall out
  await G(page, () => { window.__mockTieLine = { t: 'tie', a: 'zara.vey', b: 'nox.ombre', d: -10, why: 'un clash sur le duel' }; });
  const z0 = await G(page, (I) => window.__hype.tieOf(window.__hype.S.game, I.zara, I.nox), ids);
  await G(page, () => { window.__hype.S.game.lastRefreshAt = 0; return window.__hype.refreshFeed(); });
  await idle(page);
  const z1 = await G(page, (I) => window.__hype.tieOf(window.__hype.S.game, I.zara, I.nox), ids);
  await G(page, () => { window.__mockTieLine = null; });
  check('the ties are never shown to the player (nothing on a profile says who they are close to); the story changes them (a refresh says two of them fall out)',
    !prof.ties && !/Ses liens|Proche de (Zara|Théo|Léandre)|Inséparable de|Ne supporte pas/.test(prof.text) && z1 === z0 - 10, { ties: prof.ties, z0, z1 });

  // ---------- a nasty word in private travels, all the way to the one it is about ----------
  await G(page, (I) => { const H = window.__hype, g = H.S.game; H.setTie(g, I.nox, I.zara, 80); g.whispers = []; window.__trustRolls = [0.1]; }, ids);
  await dm(page, ids.nox, 'entre nous, @zara.vey est une tricheuse, je la déteste');
  const w0 = await G(page, () => { const g = window.__hype.S.game; const w = (g.whispers || []).slice(-1)[0]; return w ? JSON.parse(JSON.stringify(w)) : null; });
  const w1 = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, z = g.chars[I.zara], w = g.whispers.slice(-1)[0];
    const r0 = z.rel;
    w.next = 0;
    window.__trustRolls = [0.1, 0.0]; // Nox talks; to the closest (Zara)
    H.tickWhispers(g, Date.now());
    const ctx = H.ctxText(g, { focus: new Set([I.zara]) });
    return { heard: w.heard.map((id) => g.chars[id].handle), state: w.state, drop: r0 - z.rel, mem: z.mem.slice(-1)[0].t, trig: (g.triggers || []).some((x) => x.text.includes('@zara.vey a appris par @nox.ombre')), ctx: /a entendu dire que le joueur a écrit en privé/.test(ctx) };
  }, ids);
  check('a nasty word written in private and kept (a screenshot) travels: the chatty one passes it to their closest friend… who is the one it is about: hurt, and it shows (the AI knows what they heard)',
    w0 && w0.about === ids.zara && w0.tone === 'bad' && w1.heard.includes('zara.vey') && w1.state === 'done' && w1.drop >= 12 && /Nox m’a dit que le joueur a écrit en privé/.test(w1.mem) && w1.trig && w1.ctx, { w0, w1 });

  // ---------- a stood-up date is told around; it reaches an enemy: a rumor ----------
  const lp = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, t = g.chars[I.theo], l = g.chars[I.leandre];
    t.rel = 30; l.rel = -60; l.vibe = null;
    g.whispers = []; g.rumors = []; g.rumorAt = 0;
    H.setTie(g, I.theo, I.leandre, 90);
    g.events = (g.events || []).filter((e) => !(e.player && e.state === 'scheduled'));
    const ev = H.addEvent(g, { by: 'theo.marlin', what: 'Un café au réfectoire', kind: 'rdv', in: 30 });
    ev.due = Date.now() - 3 * 3600000;
    H.checkEvents(g, Date.now());
    const w = g.whispers.slice(-1)[0];
    w.next = 0;
    window.__trustRolls = [0.1, 0.0, 0.1]; // Théo talks (rarely, but this time); to Léandre; who uses it
    H.tickWhispers(g, Date.now());
    const r = H.liveRumor(g);
    return { seed: w.seed, text: w.text, heard: w.heard.map((id) => g.chars[id].handle), rumor: r && { by: g.chars[r.by].handle, text: r.text } };
  }, ids);
  check('a stood-up date is told around (« pose des lapins »); when it reaches an enemy of the player, it becomes a rumor',
    lp.seed === 'lapin' && /pose des lapins/.test(lp.text) && lp.heard.includes('leandre.aube') && lp.rumor && lp.rumor.by === 'leandre.aube' && /pose des lapins/.test(lp.rumor.text), lp);

  // ---------- a loyal friend keeps it, and warns the player; good things open doors; a fiasco gets shared ----------
  await dismiss(page);
  const lf = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, t = g.chars[I.theo], n = g.chars[I.nox];
    t.rel = 70; t.temper = 'fidele';
    n.rel = 20; n.temper = 'trouble';
    H.setTie(g, I.nox, I.theo, 99);
    g.whispers = [];
    // what a loyal friend says themselves stays with them (no gossip, no warning about their own words)
    const own = H.addWhisper(g, t, 'oublie ses amis quand ça marche pour lui', { tone: 'bad', now: true });
    const n0 = (g.dms[I.theo] || { msgs: [] }).msgs.length;
    H.tickWhispers(g, Date.now());
    const n1 = (g.dms[I.theo] || { msgs: [] }).msgs.length;
    // what they hear from someone else: kept, and the player is warned
    const w = H.addWhisper(g, n, 'raconte n’importe quoi sur ses amis', { tone: 'bad', now: true });
    window.__trustRolls = [0.1, 0.0]; // Nox talks; to the closest (Théo)
    H.tickWhispers(g, Date.now());
    const dm = (g.dms[I.theo] || { msgs: [] }).msgs.filter((m) => !m.me).slice(-1)[0];
    return { own: { state: own.state, heard: own.heard.length, dms: n1 - n0 }, state: w.state, heard: w.heard.map((id) => g.chars[id].handle), dm: dm && dm.text };
  }, ids);
  const gd = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, n = g.chars[I.nox], m = g.chars[I.maelle];
    m.unlocked = true;
    H.setTie(g, I.nox, I.maelle, 100); H.setTie(g, I.nox, I.theo, 60);
    g.whispers = [];
    const w = H.addWhisper(g, n, 'a défendu @zara.vey quand tout le monde lui tombait dessus', { tone: 'good', now: true });
    const r0 = m.rel;
    window.__trustRolls = [0.1, 0.0];
    H.tickWhispers(g, Date.now());
    return { heard: w.heard.map((id) => g.chars[id].handle), up: m.rel - r0, notif: g.notifs.some((x) => x.c === I.maelle && /on lui a dit du bien de toi/.test(x.text)) };
  }, ids);
  const fn = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, n = g.chars[I.nox];
    g.whispers = [];
    window.__trustRolls = [0.1]; // told (a fiasco)
    const w = H.whisperFromDate(g, { what: 'Un verre', played: { tier: 'flop', score: 0.1 }, c: I.nox }, n);
    if (!w) return { none: true };
    w.next = 0;
    window.__trustRolls = [0.1, 0.0];
    H.tickWhispers(g, Date.now());
    return { tone: w.tone, text: w.text, trig: (g.triggers || []).some((x) => /en rit et le partage/.test(x.text)) };
  }, ids);
  check('a loyal friend who hears something bad keeps it and warns the player in private (what they say themselves stays with them); good things said about the player open doors (+3); a date fiasco is shared for laughs',
    lf.own.state === 'done' && lf.own.heard === 1 && lf.own.dms === 0 && lf.state === 'done' && lf.heard.includes('theo.marlin') && /il paraît que @mila\.flux raconte n’importe quoi/.test(lf.dm || '') && gd.heard.includes('maelle.fen') && gd.up >= 3 && gd.notif && fn.tone === 'funny' && /raté son rendez-vous/.test(fn.text) && fn.trig, { lf, gd, fn });

  // ---------- in a couple, a date with someone else gets around… all the way to the partner ----------
  const ch = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, z = g.chars[I.zara], n = g.chars[I.nox];
    z.vibe = 'couple'; z.officiel = 'public'; z.rel = 60; z.cool = null;
    n.rel = 20; n.temper = 'trouble';
    H.setTie(g, I.nox, I.zara, 100); H.setTie(g, I.nox, I.theo, 60);
    g.whispers = [];
    window.__trustRolls = [0.1]; // told (Nox is not the discreet kind)
    const w = H.whisperFromDate(g, { what: 'Un dîner aux chandelles', played: { tier: 'mid', score: 0.5 }, c: I.nox }, n);
    if (!w) return { none: true };
    w.next = 0;
    const r0 = z.rel;
    window.__trustRolls = [0.1, 0.0]; // Nox talks; to the closest (Zara)
    H.tickWhispers(g, Date.now());
    return { seed: w.seed, about: w.about === I.zara, text: w.text, drop: r0 - z.rel, cool: z.cool && z.cool.k, trig: (g.triggers || []).some((x) => x.text.includes('@zara.vey a appris par @nox.ombre que le joueur est avec @zara.vey')) };
  }, ids);
  check('in a couple, a date with someone else is told around; when it reaches the partner: a big drop, and anger',
    ch.seed === 'cheat' && ch.about && ch.drop >= 18 && ch.cool === 'colere' && ch.trig, ch);

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
