// 0.28 end to end, in Chromium against the built hype.html with the mocked Claude runtime: the achievements.
// - the player's list, all of it (« Premier post »… « Expert en la matière ») and a few more, in six groups, some
//   hidden until they come, the keys pinned (the Æ Games Launcher knows them: never renamed);
// - read from what really happens: partners at once (and a week, a month without being caught), their ages, an old
//   enemy, a wedding in a week; the audience, the monetization, the money, the team, the reputation from the depths, the
//   hype train; a dare lost, a friend zone, a ghost, an ex, a partner leaving for someone (the AI's vibe line says
//   « pour »), a date missed, three in a row gone wrong, everyone against the player; a fake proof exposed, an
//   anonymous witness that takes, a call-out that lands, apologies, a secret out, owning it; contracts (a first, five in
//   a month, ten refused, one negotiated, one illegal), a sponsored product that flops, a quote over 100 000 € and over a
//   million, the dearest novelty, every item of the shop, ten sales on Occaz, a brand that sees its gift on sale; a
//   viral post (not a bought one), a flop, the laughingstock, a post at 3 in the morning, a hashtag that trends; a
//   shoot in Mythique, ten in a row in Cauchemar;
// - each comes once, with a notification and a toast (« Voir »); the profile shows them, their window lists them all;
//   going back to a save keeps them; a game changed by hand keeps them to itself;
// - a present in a conversation: what, a price, paid at once, shown as a card, the AI told its value (« Coin coin »);
// - romance at every adult age: no « role apart » any more, the casting draws up to 68.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v28.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v28');
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
async function dismiss(page) { for (let k = 0; k < 8 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }
async function settle(page) { await G(page, () => { const H = window.__hype; H.S.modals.length = 0; H.update(); }).catch(() => {}); await sleep(300); await dismiss(page); }

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

// The keys the Æ Games Launcher knows (a permanent API: a rename would lose the players' achievements).
const KEYS = ['first-post', 'viral-post', 'flop-post', 'internet-laughingstock', 'sell-me-this-pen', 'first-contract', 'worldwide-trend', 'first-crush', 'charro-two', 'charro-three',
  'charro-week', 'charro-month', 'coin-coin', 'enemies-to-lovers', 'good-doggy', 'public-enemy', 'too-fast', 'friendzone', 'just-no', 'milf-lover', 'gilf-lover', 'date-from-hell', 'stood-up',
  'ghosted', 'ex-comeback', 'express-wedding', 'ungrateful', 'engaged', 'married', 'phoenix', 'fake-proof-busted', 'the-crow', 'public-apology', 'apology-accepted', 'secret-out',
  'cashed-the-check', 'owned-the-bad-buzz', 'hype-train', 'cancelled', 'gaining-traction', 'partner-program', 'silver-play-button', 'golden-play-button', 'diamond-play-button',
  'ruby-play-button', 'poopy-play-button', 'pigeon', 'in-the-red', 'incorruptible', 'billboard', 'big-spender', 'yard-sale', 'the-boss', 'jail-time', 'tv-show', 'mrbeast', 'born-to-be-hero',
  'subject-expert', 'living-legend', 'sleepless-night'];
// The player's own list, by its names.
const NAMES = ['Premier post', 'Carton plein', 'Flop complet', 'Risée d’internet', 'Vends-moi ce stylo', 'Les pubs rapportent rien', 'Charro', 'Charro de luxe', 'Charro discipliné', 'Charro ninja',
  'Coin coin', 'Enemies to lovers', 'Bon toutou', 'Ennemi public n° 1', 'Chaud lapin', 'Friendzone', 'Indésirable', 'MILF Lover', 'GILF Lover', 'Rendez-vous en enfer', 'Lapin', 'Ghosté',
  'Le retour de l’ex', 'Mariage express', 'Ingrat', 'Le phénix', 'Le comte de menthe et cristaux', 'Le corbeau', 'Ohh, grand prince', 'Est-ce que c’est bon pour vous ?',
  'J’fais des trucs un peu malsains', 'Moi j’ai touché le chèque', 'Gngn je pensais pas ça de toi', 'Il est bien monté le minotaure', 'Partenaire', 'Silver Play Button', 'Golden Play Button',
  'Diamant Play Button', 'Ruby Play Button', 'Poopy Play Button', 'Pigeon', 'Dans le rouge', 'Intègre', 'Panneau publicitaire', 'Flambeur', 'Vide-grenier', 'Le boss', 'Case prison',
  'Ça devient la télé', 'MrBeast', 'Born to be hero', 'Expert en la matière'];
const TRAPS = ['fake-proof-busted', 'the-crow', 'jail-time', 'born-to-be-hero', 'ungrateful', 'secret-out'];

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 800 });
  await newGame(page, 'Une créatrice qui teste des potions');
  await G(page, () => { window.__hypeNoGearEvent = true; window.__hypeEasyGear = true; const g = window.__hype.S.game; for (const c of window.__hype.mains(g, false)) c.unlocked = true; });

  // ---------- the list ----------
  const list = await G(page, () => {
    const H = window.__hype;
    return { n: H.ACH.length, ids: H.ACH.map((A) => A.id), names: H.ACH.map((A) => A.name), groups: H.ACH_GROUPS.map((x) => x[1]), inGroups: H.ACH.every((A) => H.ACH_GROUPS.some((x) => x[0] === A.grp)),
      hidden: H.ACH.filter((A) => A.hidden).map((A) => A.id), goals: Object.fromEntries(H.ACH.filter((A) => A.goal).map((A) => [A.id, A.goal])), emoji: H.ACH.every((A) => A.emoji && typeof A.name === 'string'),
      none: H.achCount(H.S.game) };
  });
  check('the achievements: the player’s whole list and a few more (60), in six groups (« Les premiers pas »… « Extrêmement rare »), the keys as the launcher knows them, nothing unlocked at the start',
    list.n === 60 && new Set(list.ids).size === 60 && KEYS.every((k) => list.ids.includes(k)) && NAMES.every((x) => list.names.includes(x)) && list.inGroups && list.emoji && list.none === 0
      && list.groups.join('|') === 'Les premiers pas|Relations|Drama et réputation|Avancement|Carrière et argent|Extrêmement rare' && !list.names.some((x) => /Sliver/.test(x)),
    { n: list.n, missingKeys: KEYS.filter((k) => !list.ids.includes(k)), missingNames: NAMES.filter((x) => !list.names.includes(x)), groups: list.groups, none: list.none });
  check('the hidden ones: those that would give away a trap of the game, and the surprises (a ghost, a dare lost, a partner who leaves…); the counted ones with their goal',
    TRAPS.every((k) => list.hidden.includes(k)) && ['too-fast', 'friendzone', 'just-no', 'good-doggy', 'poopy-play-button', 'ghosted', 'stood-up', 'charro-week', 'charro-month'].every((k) => list.hidden.includes(k))
      && JSON.stringify(list.goals) === JSON.stringify({ 'coin-coin': 1000, 'date-from-hell': 3, 'gaining-traction': 1000, pigeon: 4, incorruptible: 10, billboard: 5, 'yard-sale': 10, 'the-boss': 5, 'subject-expert': 10 }),
    { hidden: list.hidden, goals: list.goals });

  // ---------- their window, at the start: the hidden ones say nothing, the counted ones show where they stand ----------
  await G(page, () => { const H = window.__hype, g = H.S.game; g.stats.followers = Math.max(g.stats.followers, 300); H.tickAch(g, Date.now()); H.openLayer({ t: 'ach' }); });
  await page.waitForSelector('.layer .ach-row', { timeout: 5000 });
  await sleep(300);
  const win0 = await G(page, () => {
    const H = window.__hype, rows = [...document.querySelectorAll('.layer .ach-row')];
    return { rows: rows.length, hidden: rows.filter((r) => /Succès caché/.test(r.textContent)).length, hiddenN: H.ACH.filter((A) => A.hidden).length, leak: rows.some((r) => /Le corbeau|Case prison|Born to be hero|Ingrate/.test(r.textContent)),
      meter: (rows.find((r) => /Ça commence à prendre/.test(r.textContent)) || {}).textContent || '', bar: !!document.querySelector('.layer .ach-row .ach-prog .meter, .layer .ach-row .ach-prog [class*="meter"]') };
  });
  await shot(page, 'ach-window-start');
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.update(); });
  check('their window at the start: all 60, the hidden ones only « Succès caché » (nothing of a trap shows), the counted ones with where they stand (« 300 / 1 000 »)',
    win0.rows === 60 && win0.hidden === win0.hiddenN && !win0.leak && /300\s\/\s1\s000/.test(win0.meter) && win0.bar, win0);

  // ---------- each once, with its notification ----------
  const once = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const n0 = g.notifs.filter((n) => n.k === 'ach').length;
    const first = H.unlockAch(g, 'the-boss'), again = H.unlockAch(g, 'the-boss'), unknown = H.unlockAch(g, 'no-such-thing');
    const n1 = g.notifs.filter((n) => n.k === 'ach').length;
    const last = g.notifs.filter((n) => n.k === 'ach').slice(-1)[0];
    delete g.ach.got['the-boss']; delete g.ach.prog['the-boss'];
    return { first, again, unknown, more: n1 - n0, text: last && last.text };
  });
  check('each achievement comes once, with a notification « 🏆 Succès débloqué : Le boss » (0.28.1: its icon drawn beside it); an unknown key: nothing', once.first && !once.again && !once.unknown && once.more === 1 && once.text === '🏆 Succès débloqué : Le boss', once);

  // ---------- partners at once, and how long without being caught; their ages; an old enemy; a wedding in a week ----------
  const hearts = await G(page, () => {
    const H = window.__hype, g = H.S.game, t0 = Date.now(), DAY = 24 * 3600000, C = (h) => H.charByHandle(g, h), out = {};
    const [a, b, c] = [C('theo.marlin'), C('zara.vey'), C('maelle.fen')];
    for (const x of [a, b, c]) x.age = 24; // (the ages are drawn at the creation: under 35 here, or « MILF Lover » would come first)
    out.crush0 = H.achGot(g, 'first-crush');
    a.vibe = 'couple'; H.tickAch(g, t0); out.one = H.achGot(g, 'charro-two'); out.crush = H.achGot(g, 'first-crush');
    b.vibe = 'couple'; H.tickAch(g, t0); out.two = H.achGot(g, 'charro-two');
    c.vibe = 'couple'; H.tickAch(g, t0); out.three = H.achGot(g, 'charro-three');
    H.tickAch(g, t0 + 6 * DAY); out.d6 = H.achGot(g, 'charro-week');
    H.noteCaught(g, t0 + 6 * DAY + 1000); H.tickAch(g, t0 + 8 * DAY); out.caught = H.achGot(g, 'charro-week');
    H.tickAch(g, t0 + 13 * DAY + 2000); out.d7 = H.achGot(g, 'charro-week');
    H.tickAch(g, t0 + 37 * DAY); out.ninja = H.achGot(g, 'charro-month');
    a.vibe = null; b.vibe = null; c.vibe = null; H.tickAch(g, t0); out.reset = !g.ach.multiFrom;
    const p = C('prof.gallant'); Object.assign(p, { age: 41, vibe: 'couple' }); H.tickAch(g, t0); out.milf = H.achGot(g, 'milf-lover'); out.gilf0 = H.achGot(g, 'gilf-lover');
    p.age = 60; H.tickAch(g, t0); out.gilf = H.achGot(g, 'gilf-lover');
    p.vibe = 'fiancailles'; H.tickAch(g, t0); out.oui = H.achGot(g, 'engaged'); out.mar0 = H.achGot(g, 'married');
    Object.assign(p, { firstTalk: t0 - 40 * DAY, unlockedAt: t0 - 40 * DAY, vibe: 'mariage', pace: { v: 'mariage', at: t0 } }); H.tickAch(g, t0); out.mariage = H.achGot(g, 'married'); out.express0 = H.achGot(g, 'express-wedding');
    p.vibe = null;
    const q = C('remi.sol'); Object.assign(q, { firstTalk: t0 - 3 * DAY, unlockedAt: t0 - 5 * DAY, vibe: 'mariage', pace: { v: 'mariage', at: t0 - DAY } }); H.tickAch(g, t0); out.express = H.achGot(g, 'express-wedding');
    q.vibe = null; delete q.pace;
    const e = C('leandre.aube'); e.rel = 50; e.vibe = 'couple'; H.tickAch(g, t0); out.enemies0 = H.achGot(g, 'enemies-to-lovers');
    e.vibe = null; e.rel = -70; H.tickAch(g, t0); e.rel = 50; e.vibe = 'couple'; H.tickAch(g, t0); out.enemies = H.achGot(g, 'enemies-to-lovers');
    e.vibe = null;
    return out;
  });
  check('partners at once: a first « Premier crush »; two « Charro », three « Charro de luxe »; three for a week without being caught « discipliné » (caught: it starts again), a month « ninja »',
    !hearts.crush0 && hearts.crush && !hearts.one && hearts.two && hearts.three && !hearts.d6 && !hearts.caught && hearts.d7 && hearts.ninja && hearts.reset, hearts);
  check('a partner over 35 « MILF Lover », over 55 « GILF Lover »; engaged « Oui ! », married; met less than a week before the wedding « Mariage express »; once hated at the most, now a partner: « Enemies to lovers »',
    hearts.milf && !hearts.gilf0 && hearts.gilf && hearts.oui && !hearts.mar0 && hearts.mariage && !hearts.express0 && hearts.express && !hearts.enemies0 && hearts.enemies, hearts);

  // ---------- the audience, the money, the team, the reputation from the depths, the hype train ----------
  const aud = await G(page, () => {
    const H = window.__hype, g = H.S.game, s = g.stats, t = Date.now(), out = {};
    s.followers = 500; H.tickAch(g, t); out.prog = g.ach.prog['gaining-traction']; out.trac0 = H.achGot(g, 'gaining-traction');
    s.followers = 1200; H.tickAch(g, t); out.trac = H.achGot(g, 'gaining-traction');
    s.followers = 120000; H.tickAch(g, t); out.silver = H.achGot(g, 'silver-play-button'); out.golden0 = H.achGot(g, 'golden-play-button');
    s.followers = 600000; H.tickAch(g, t); out.golden = H.achGot(g, 'golden-play-button');
    s.followers = 2000000; H.tickAch(g, t); out.diamant = H.achGot(g, 'diamond-play-button');
    s.followers = 12000000; H.tickAch(g, t); out.ruby = H.achGot(g, 'ruby-play-button'); out.poopy0 = H.achGot(g, 'poopy-play-button');
    s.followers = 0; H.tickAch(g, t); out.poopy = H.achGot(g, 'poopy-play-button');
    s.followers = 500;
    out.part0 = H.achGot(g, 'partner-program'); const prog0 = g.career.prog; g.career.prog = { state: 'on', at: t }; H.tickAch(g, t); out.partenaire = H.achGot(g, 'partner-program'); g.career.prog = prog0;
    const cash = g.career.cash; out.red0 = H.achGot(g, 'in-the-red'); g.career.cash = -12; H.tickAch(g, t); out.red = H.achGot(g, 'in-the-red'); g.career.cash = cash;
    const staff = g.staff; g.staff = [1, 2, 3, 4].map((k) => ({ id: 'st' + k })); H.tickAch(g, t); out.boss4 = H.achGot(g, 'the-boss'); out.bossProg = g.ach.prog['the-boss'];
    g.staff = [1, 2, 3, 4, 5].map((k) => ({ id: 'st' + k })); H.tickAch(g, t); out.boss = H.achGot(g, 'the-boss'); g.staff = staff;
    const rep = s.reputation; s.reputation = 30; H.tickAch(g, t); s.reputation = 75; H.tickAch(g, t); out.phenix0 = H.achGot(g, 'phoenix');
    s.reputation = 5; H.tickAch(g, t); s.reputation = 75; H.tickAch(g, t); out.phenix = H.achGot(g, 'phoenix'); s.reputation = rep;
    out.train0 = H.achGot(g, 'hype-train'); H.startTrain(g, t); out.train = H.achGot(g, 'hype-train'); g.train.until = t - 1; g.train.state = 'done';
    return out;
  });
  await settle(page);
  check('the audience: « Ça commence à prendre » counted to 1 000; the Play Buttons at 100 000, 500 000, a million, ten million; back down to 0: « Poopy Play Button »; monetized: « Partenaire »',
    aud.prog === 500 && !aud.trac0 && aud.trac && aud.silver && !aud.golden0 && aud.golden && aud.diamant && aud.ruby && !aud.poopy0 && aud.poopy && !aud.part0 && aud.partenaire, aud);
  check('overdrawn « Dans le rouge »; a team of five « Le boss » (4 / 5 before); from under 100 to over 700 of reputation « Le phénix » (from 300: no); the hype train starts: « Il est bien monté le minotaure »',
    !aud.red0 && aud.red && !aud.boss4 && aud.bossProg === 4 && aud.boss && !aud.phenix0 && aud.phenix && !aud.train0 && aud.train, aud);

  // ---------- what happens in the hearts ----------
  const ev = await G(page, () => {
    const H = window.__hype, g = H.S.game, C = (h) => H.charByHandle(g, h), t = Date.now(), DAY = 24 * 3600000, out = {};
    const r = C('remi.sol'); Object.assign(r, { vibe: null, rel: 5, cool: null, dare: null, coeur: 'prudent' });
    H.loseDare(g, r, { k: 'rdv', gap: 2, need: 2, got: 0, left: 0 }); out.lapin = H.achGot(g, 'too-fast'); out.non = H.achGot(g, 'just-no'); out.fz0 = H.achGot(g, 'friendzone');
    const f = C('ada.quill'); Object.assign(f, { vibe: 'amitie', rel: 40, cool: null, dare: null, coeur: 'serein' });
    H.loseDare(g, f, { k: 'decl', gap: 1, need: 1, got: 0, left: 0 }); out.friendzone = H.achGot(g, 'friendzone');
    // a ghost: the player's last message, unanswered three days (left on read, « … », a card after it: still unanswered)
    const o = C('oskar.brume'), keep = g.dms[o.id];
    g.dms[o.id] = { msgs: [{ id: 'm1', me: true, text: 'tu es là ?', ts: t - 4 * DAY, at: t - 4 * DAY }, { id: 'm2', me: false, r: 1, text: 'oui !', ts: t - 4 * DAY + 5000, at: t - 4 * DAY + 5000 }], readAt: 0 };
    H.tickAch(g, t); out.ghost0 = H.achGot(g, 'ghosted');
    g.dms[o.id].msgs.push({ id: 'm3', me: true, text: 'on se voit ?', ts: t - 2 * DAY, at: t - 2 * DAY }, { id: 'm4', me: false, r: 1, text: '…', ts: t - 2 * DAY, at: t - 2 * DAY });
    H.tickAch(g, t); out.ghost2 = H.achGot(g, 'ghosted');
    g.dms[o.id].msgs.push({ id: 'm5', sys: 'cancel', title: 'un ciné', text: 'Annulé', ts: t - 2 * DAY, at: t - 2 * DAY });
    H.tickAch(g, t + DAY + 1000); out.ghost = H.achGot(g, 'ghosted');
    if (keep) g.dms[o.id] = keep; else delete g.dms[o.id];
    const x = C('lou.cendre'); Object.assign(x, { vibe: 'ex', rel: 60, cool: null }); out.back = H.applyVibe(g, x, 'couple', 'test', Date.now(), true); out.flamme = H.achGot(g, 'ex-comeback');
    x.vibe = null;
    // a date: called off ahead of time (no), once it had started (« Lapin »), never shown up to
    const z = C('zara.vey');
    H.cancelDate(g, { id: 'ev1', c: z.id, player: true, state: 'scheduled', what: 'un ciné', due: t + 3 * 3600000 }); out.cancel0 = H.achGot(g, 'stood-up');
    H.cancelDate(g, { id: 'ev2', c: z.id, player: true, state: 'scheduled', what: 'un café', due: t - 10 * 60000 }); out.cancel = H.achGot(g, 'stood-up');
    delete g.ach.got['stood-up'];
    H.standUp(g, { id: 'ev3', c: z.id, player: true, state: 'scheduled', what: 'un resto', due: t - 3600000 }, t); out.missed = H.achGot(g, 'stood-up');
    // three dates in a row gone wrong (one that went well in between starts it again)
    const d = C('theo.marlin'), date = (tier) => H.dateOutcome(g, { id: 'evd', c: d.id, player: true, what: 'un café', diff: 'moyen', played: { tier, diff: 'moyen', score: tier === 'flop' ? 0.1 : 0.9 } }, d);
    date('flop'); date('flop'); date('top'); out.hell0 = H.achGot(g, 'date-from-hell'); out.hellProg = g.ach.prog['date-from-hell'];
    date('flop'); date('flop'); date('flop'); out.hell = H.achGot(g, 'date-from-hell');
    return out;
  });
  await settle(page);
  check('a dare lost: « Chaud lapin », a date asked too soon « Indésirable »; a declaration to a friend « Friendzone »; back with an ex « Le retour de l’ex »',
    ev.lapin && ev.non && !ev.fz0 && ev.friendzone && ev.back && ev.flamme, ev);
  check('« Ghostée »: the player’s last message unanswered for three days (an answer: no; « … » or a card after it is no answer)', !ev.ghost0 && !ev.ghost2 && ev.ghost, ev);
  check('a date called off once it had started, or never shown up to: « Lapin » (ahead of time: no); three dates in a row gone wrong « Rendez-vous en enfer » (a good one starts it again)',
    !ev.cancel0 && ev.cancel && ev.missed && !ev.hell0 && ev.hellProg === 2 && ev.hell, ev);

  // ---------- a partner leaving for someone of the cast (the AI says « pour »); everyone against the player ----------
  const tt = await G(page, () => {
    const H = window.__hype, g = H.S.game, C = (h) => H.charByHandle(g, h), out = {};
    const a = C('theo.marlin'), z = C('zara.vey');
    z.unlocked = true; // (0.28.1: one leaves only for someone already on the network)
    Object.assign(a, { vibe: 'couple', rel: 30, cool: null });
    H.vibeLine(g, a, { vibe: 'ex', why: 'je pars' }, Date.now()); out.noPour = H.achGot(g, 'good-doggy');
    a.vibe = 'couple';
    H.vibeLine(g, a, { vibe: 'ex', why: 'je pars', pour: 'zara.vey' }, Date.now()); out.toutou = H.achGot(g, 'good-doggy');
    out.tie = H.tieOf(g, a.id, z.id); out.notif = g.notifs.some((n) => /te quitte pour Zara Vey/.test(n.text));
    a.vibe = null;
    const dm = H.promptDM(g, a, [], 'salut');
    out.line = dm.includes('"pour":"handle de cette personne"');
    out.ennemi0 = H.achGot(g, 'public-enemy');
    const keep = H.mains(g).map((c) => c.rel);
    for (const c of H.mains(g)) c.rel = -40;
    H.tickAch(g, Date.now()); out.ennemi = H.achGot(g, 'public-enemy');
    H.mains(g).forEach((c, k) => { c.rel = Math.max(10, keep[k]); });
    return out;
  });
  check('a partner who leaves for someone of the cast (the AI’s vibe line says « pour », and is told how): « Bon toutou », a notification, the two close; without « pour », nothing; everyone a rival or worse: « Ennemie publique n° 1 »',
    !tt.noPour && tt.toutou && tt.tie >= 70 && tt.notif && tt.line && !tt.ennemi0 && tt.ennemi, tt);

  // ---------- drama: « J’assume » in a cancel, a fake proof exposed, an anonymous witness that takes, a call-out that lands ----------
  await G(page, () => { const H = window.__hype, g = H.S.game; g.stats.reputation = 10; g.stats.cancelled = false; H.checkCancel(g); H.update(); });
  await page.waitForSelector('.modal .modal-big >> text=Cancel', { timeout: 10000 });
  await shot(page, 'cancel-modal');
  await page.locator('.modal .btn', { hasText: 'J’assume' }).click();
  await sleep(400);
  const assume = await G(page, () => { // 0.28.1: closing a window is no owning up; a bad buzz of the player's, ridden out without excuses nor agency, is
    const H = window.__hype, g = H.S.game, t = Date.now(), out = { button: H.achGot(g, 'owned-the-bad-buzz') };
    g.pbb = { at: t - 3000, until: t - 1000, c: null, kind: 'dm', agency: 1 }; H.tickAch(g, t); out.agency = H.achGot(g, 'owned-the-bad-buzz');
    g.pbb = { at: t - 3000, until: t - 1000, c: null, kind: 'dm' }; H.tickAch(g, t); out.rode = H.achGot(g, 'owned-the-bad-buzz'); g.pbb = null;
    return out;
  });
  await settle(page);
  const dr = await G(page, () => {
    const H = window.__hype, g = H.S.game, s = g.stats, C = (h) => H.charByHandle(g, h), out = {};
    delete g.ach.got['owned-the-bad-buzz'];
    out.fake0 = H.achGot(g, 'fake-proof-busted');
    const l = C('leandre.aube'), rec = { id: 'fk1', c: l.id, post: null, kind: 'dm', desc: 'une fausse capture', q: 3, vig: 0, at: Date.now(), later: 0, state: 'safe' };
    g.fakes = g.fakes || []; g.fakes.push(rec);
    H.fakeBusted(g, l, rec, false, 0); out.fake = H.achGot(g, 'fake-proof-busted'); out.cancelled = H.achGot(g, 'cancelled') || (H.tickAch(g, Date.now()), H.achGot(g, 'cancelled'));
    Object.assign(s, { cancelled: false, reputation: 60 }); g.pbb = null;
    const n = C('nox.vale') || C('oskar.brume'), post = (id, cred, text) => ({ id, text: text || 'voilà ce que je sais', res: { cred } });
    const ctx = (c, fake, cred, text) => ({ g, accuse: c, eval: { exposed: false }, fake, post: post('pa' + cred + (fake ? fake.kind : ''), cred, text), outcome: { fol: 0, likes: 0 }, debunk: null });
    H.accusationResult(ctx(n, { kind: 'dm', desc: 'une capture', q: 8, vig: 0, busted: false }, 8)); out.crowDm = H.achGot(g, 'the-crow');
    const m = C('maelle.fen'); m.badBuzz = null;
    H.accusationResult(ctx(m, { kind: 'temoin', desc: 'un témoin anonyme', q: 8, vig: 0, busted: false }, 8)); out.crowNow = H.achGot(g, 'the-crow');
    { const fk = g.fakes.find((x) => x.c === m.id && x.kind === 'temoin'); if (fk) Object.assign(fk, { state: 'safe', later: 0, crowAt: Date.now() - 1 }); H.checkFakes(g, Date.now()); } // (0.28.1: once it has held)
    out.crow = H.achGot(g, 'the-crow');
    out.hero0 = H.achGot(g, 'born-to-be-hero');
    const z = C('zara.vey'); z.badBuzz = null;
    H.accusationResult(ctx(z, null, 5)); out.hero5 = H.achGot(g, 'born-to-be-hero');
    const r = C('remi.sol'); r.badBuzz = null;
    H.accusationResult(ctx(r, null, 8)); out.hero8 = H.achGot(g, 'born-to-be-hero'); // (0.28.1: a call-out, but not for robbing anyone)
    r.badBuzz = null; H.accusationResult(ctx(r, null, 8, 'il arnaque ses abonnés avec un faux concours')); out.hero = H.achGot(g, 'born-to-be-hero');
    return out;
  });
  await settle(page);
  check('« Gngn je pensais pas ça de toi »: not for closing the cancel window with « J’assume », nor for a bad buzz the agency buried; yes for one ridden out', !assume.button && !assume.agency && assume.rode, assume);
  check('a fake proof exposed: « Le comte de menthe et cristaux » (and a cancel: « Annulée »); a made-up « anonymous witness » that takes: « Le corbeau » (another kind of fake: no); a call-out that lands: « Born to be hero » (one that only divides: no)',
    !dr.fake0 && dr.fake && dr.cancelled && !dr.crowDm && !dr.crowNow && dr.crow && !dr.hero0 && !dr.hero5 && !dr.hero8 && dr.hero, dr);

  // ---------- drama: a secret out, the answers to it, apologies, a sponsored product that flops ----------
  const sec = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    const s1 = H.addSecret(g, 'J’ai acheté des abonnés à mes débuts', 1), s2 = H.addSecret(g, 'Mon chat a son propre compte et il a plus d’abonnés que moi', 1), s3 = H.addSecret(g, 'Je déteste les potions en vrai', 1);
    out.made = !!(s1 && s2 && s3);
    H.secretOut(g, s1, { how: 'aveu', post: null }); out.aveu = H.achGot(g, 'secret-out');
    H.secretOut(g, s2, { how: 'revele' }); out.out = H.achGot(g, 'secret-out');
    H.answerResult(g, s2, 'assume', 8, null); out.assume = H.achGot(g, 'owned-the-bad-buzz');
    H.secretOut(g, s3, { how: 'revele' });
    out.ap0 = H.achGot(g, 'public-apology');
    H.answerResult(g, s3, 'excuse', 5, null); out.ap = H.achGot(g, 'public-apology'); out.acc0 = H.achGot(g, 'apology-accepted');
    H.apologyResult({ g, post: { id: 'pap', res: { sincerity: 8 } }, repD: 4 }); out.acc = H.achGot(g, 'apology-accepted');
    out.chk0 = H.achGot(g, 'cashed-the-check');
    H.productFlop(g, { brand: 'Glouglou', product: 'sa boisson qui pétille', emoji: '🥤' }); out.chk = H.achGot(g, 'cashed-the-check');
    Object.assign(g.stats, { cancelled: false, reputation: 60 }); g.pbb = null;
    return out;
  });
  await settle(page);
  check('a secret out without wanting it: « J’fais des trucs un peu malsains » (a confession: no); owning it « Gngn »; apologizing « Ohh, grand prince », apologies that pass « Est-ce que c’est bon pour vous ? »; a sponsored product that flops « Moi j’ai touché le chèque »',
    sec.made && !sec.aveu && sec.out && sec.assume && !sec.ap0 && sec.ap && !sec.acc0 && sec.acc && !sec.chk0 && sec.chk, sec);

  // ---------- the career: contracts, a negotiation, ten refused, one illegal ----------
  const car = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    g.stats.followers = 5000; g.career.cash = 100000;
    const sign = (brand) => { const d = H.makeOffer(g, { legit: true, brand, sector: 'tech' }); return d && H.signDeal(g, d, { force: true }) ? d : null; };
    out.first0 = H.achGot(g, 'first-contract');
    const d1 = sign('Pixelo'); out.first = H.achGot(g, 'first-contract');
    const ds = [sign('Brikka'), sign('Zénith'), sign('Ondine')]; out.bb4 = H.achGot(g, 'billboard'); out.bbProg = g.ach.prog.billboard;
    ds.push(sign('Lunaire')); out.bb = H.achGot(g, 'billboard'); out.signed = !!d1 && ds.every(Boolean);
    let refused = 0;
    for (const b of ['Nova', 'Caramba', 'Frisson', 'Velours', 'Tornade', 'Mistral', 'Sucrine', 'Cactus', 'Orage']) { const d = H.makeOffer(g, { legit: true, brand: b, sector: 'food' }); if (d) { H.declineDeal(g, d); refused++; } }
    out.inc9 = H.achGot(g, 'incorruptible'); out.incProg = g.ach.prog.incorruptible;
    const d10 = H.makeOffer(g, { legit: true, brand: 'Pépite', sector: 'food' }); if (d10) { H.declineDeal(g, d10); refused++; }
    out.inc = H.achGot(g, 'incorruptible'); out.refused = refused;
    out.pen0 = H.achGot(g, 'sell-me-this-pen');
    const o = H.makeOffer(g, { legit: true, brand: 'Plumo', sector: 'mode' }), c = o && g.chars[o.contact];
    if (o && c) { H.applyDealLine(g, c, {}); out.penNone = H.achGot(g, 'sell-me-this-pen'); H.applyDealLine(g, c, { days: o.days === 6 ? 9 : 6 }); }
    out.pen = H.achGot(g, 'sell-me-this-pen');
    out.jail0 = H.achGot(g, 'jail-time');
    H.sanction(g, ds[0]); out.jail = H.achGot(g, 'jail-time');
    Object.assign(g.stats, { cancelled: false, reputation: 60 }); g.pbb = null;
    window.__d1 = d1.id;
    return out;
  });
  await settle(page);
  check('contracts: a first « Les pubs rapportent rien »; five in the same month « Panneau publicitaire » (4 / 5 before); ten offers refused « Intègre » (9 / 10 before)',
    car.signed && !car.first0 && car.first && !car.bb4 && car.bbProg === 4 && car.bb && car.refused === 10 && !car.inc9 && car.incProg === 9 && car.inc, car);
  check('a contract negotiated (something changed, and the brand agreed): « Vends-moi ce stylo » (nothing changed: no); an illegal partnership found out « Case prison »',
    !car.pen0 && !car.penNone && car.pen && !car.jail0 && car.jail, car);

  // ---------- the money: a quote over 100 000 € and over a million, the dearest novelty, every item of the shop, Occaz ----------
  const money = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    g.career.cash = 5000000;
    const o = { what: 'vidéo', topic: 'J’offre une villa à un abonné', plot: '' };
    const dv0 = H.readDevis(g, o, [{ t: 'cost', item: 'une villa au bord de la mer', price: 1800000, kind: 'achat' }, { t: 'cost', item: 'un notaire', price: 4000, kind: 'service' }], [], []);
    out.cap = dv0.items.map((x) => x.price);
    const ch = H.makeDevis({ what: 'vidéo', topic: 'Trente jours au resto', days: 30 }, [{ item: 'un repas étoilé', price: 30000, kind: 'conso', per: 'episode' }], null, true, []);
    H.payDevis(g, ch, 'défi'); out.tv0 = H.achGot(g, 'tv-show'); out.paid0 = !!ch.paid;
    const v = H.makeDevis(o, [{ item: 'une voiture de sport', price: 150000, kind: 'achat', keep: true, per: 'once' }], null, true, []);
    H.payDevis(g, v, 'la voiture'); out.tvPaid = H.achGot(g, 'tv-show'); // (0.28.1: paid is not made: at the publication)
    const rel = (id, dv) => { const r = { id, what: 'vidéo', topic: o.topic, state: 'scheduled', due: Date.now(), at: Date.now(), delays: 0, devis: { total: H.devisTotal(dv), items: dv.items, have: [] } }; g.releases.push(r); H.releaseDone({ g, video: { r, tier: 'mid', score: 0.6, diff: 'facile' }, post: { id: 'p' + id } }); return r; };
    rel('rv1', v); out.tv = H.achGot(g, 'tv-show'); out.mb0 = H.achGot(g, 'mrbeast');
    H.payDevis(g, dv0, 'la villa'); out.mbPaid = H.achGot(g, 'mrbeast'); rel('rv2', dv0); out.mb = H.achGot(g, 'mrbeast'); out.cash = g.career.cash;
    // the novelties out: the cheapest first (no), then the dearest
    g.gear.launch.n = 3; const out3 = H.NEW_GEAR.slice(0, 3), cheap = out3.slice().sort((a, b) => a.price - b.price)[0], dear = out3.slice().sort((a, b) => b.price - a.price)[0];
    H.buyNew(g, cheap.id); out.fl0 = H.achGot(g, 'big-spender'); H.buyNew(g, dear.id); out.fl = H.achGot(g, 'big-spender');
    return out;
  });
  check('a quote line as dear as a real one (a villa: 1 800 000 €, it was capped at 50 000); a challenge at 30 000 € an episode: no; a video over 100 000 € « Ça devient la télé », over a million « MrBeast »; the dearest novelty « Flambeuse » (a cheaper one: no)',
    JSON.stringify(money.cap) === '[1800000,4000]' && money.paid0 && !money.tv0 && !money.tvPaid && money.tv && !money.mb0 && !money.mbPaid && money.mb && !money.fl0 && money.fl, money);
  const shop = await G(page, async () => {
    const H = window.__hype, g = H.S.game, out = {}, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    Object.assign(g.stats, { gems: 500, reputation: 40, cancelled: false }); g.boosts = {};
    for (const id of ['push', 'reach', 'viral']) { H.buy(id); await wait(50); }
    out.p3 = g.ach.prog.pigeon; out.pig0 = H.achGot(g, 'pigeon');
    H.buy('pr'); out.pig = H.achGot(g, 'pigeon'); g.boosts = {};
    // ten sales on Occaz (9 / 10 before), a brand's gift on sale (and the brand sees it)
    const items = [];
    for (let k = 0; k < 10; k++) { const x = H.invAdd(g, { kind: 'buy', name: 'Un vieux chaudron ' + k, value: 20 }); x.sale = { price: 5, at: Date.now(), views: 0, favs: 0 }; items.push(x); }
    items.slice(0, 9).forEach((x) => H.sellItem(g, x)); out.ys9 = H.achGot(g, 'yard-sale'); out.ysProg = g.ach.prog['yard-sale'];
    H.sellItem(g, items[9]); out.ys = H.achGot(g, 'yard-sale');
    const d = g.deals.find((x) => x.id === window.__d1);
    const own = H.invAdd(g, { kind: 'buy', name: 'Un sac acheté moi-même', value: 40, from: { how: 'achat', at: Date.now() } }); H.listItem(g, own.id, 30); out.ing0 = H.achGot(g, 'ungrateful');
    const gift = H.invAdd(g, { kind: 'goods', name: 'Un casque Pixelo', value: 90, from: { how: 'marque', brand: d.brand, deal: d.id, c: d.contact, at: Date.now() } });
    H.listItem(g, gift.id, 60); out.ing = H.achGot(g, 'ungrateful'); out.resold = !!d.resold;
    return out;
  });
  await settle(page);
  check('every item of the shop « Pigeon » (3 / 4 before); ten sales on Occaz « Vide-grenier » (9 / 10 before); a brand’s gift on sale, and the brand sees it: « Ingrate » (one’s own purchase: no)',
    shop.p3 === 3 && !shop.pig0 && shop.pig && !shop.ys9 && shop.ysProg === 9 && shop.ys && !shop.ing0 && shop.ing && shop.resold, shop);

  // ---------- the shoots: Mythique, ten in a row in Cauchemar ----------
  const rare = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    const rel = (diff, tier) => { const r = { id: 'r' + Math.random(), what: 'vidéo', topic: 'potions interdites', state: 'shoot' }; H.releaseDone({ g, video: { r, tier, score: tier === 'top' ? 0.95 : 0.4, diff }, post: { id: 'pr' + Math.random() } }); };
    rel('legendaire', 'top'); out.leg0 = H.achGot(g, 'living-legend');
    rel('mythique', 'mid'); out.legMid = H.achGot(g, 'living-legend');
    rel('mythique', 'top'); out.leg = H.achGot(g, 'living-legend');
    for (let k = 0; k < 9; k++) rel('cauchemar', 'top');
    out.exp9 = H.achGot(g, 'subject-expert'); out.expProg = g.ach.prog['subject-expert'];
    rel('moyen', 'top'); out.streak = g.ach.nightmare;
    for (let k = 0; k < 9; k++) rel('cauchemar', 'top');
    out.exp9b = H.achGot(g, 'subject-expert');
    rel('cauchemar', 'top'); out.exp = H.achGot(g, 'subject-expert');
    return out;
  });
  check('a shoot in Mythique « Légende vivante » (Légendaire or half done: no); ten shoots in a row, all in Cauchemar: « Experte en la matière » (another difficulty between: it starts again)',
    !rare.leg0 && !rare.legMid && rare.leg && !rare.exp9 && rare.expProg === 9 && rare.streak === 0 && !rare.exp9b && rare.exp, rare);

  // ---------- posts: a viral one (not a bought one), a hashtag that trends ----------
  const vir = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {}, t = Date.now();
    H.markViral({ g, post: { id: 'pv1', text: 'un moment acheté' }, boosts: { viral: true }, outcome: { likes: 10, fol: 1 } }); out.bought = H.achGot(g, 'viral-post');
    H.markViral({ g, post: { id: 'pv2', text: 'un vrai moment' }, boosts: {}, outcome: { likes: 10, fol: 1 } }); out.viral = H.achGot(g, 'viral-post');
    // a hashtag: only others use it (no); the player's, nobody took it up (no); the player's, taken up by three others since
    const mk = (by, text, at) => H.addAmbientPost(g, { by, text }, at, at);
    for (let k = 0; k < 4; k++) mk('theo.marlin', 'tout le monde en parle #ChaudronGate', t - 50000 + k);
    out.others = H.myTrend(g, t);
    g.posts.push({ id: 'pt1', a: 'p', text: 'nouvelle recette #PotionDuSoir', ts: t - 40000, at: t - 40000, replies: [], likes0: 0, likeT: 0, rpT: 0, ls: t, animMs: 0, liked: false, reposted: false, likedBy: [], res: { fol: 0, xp: 0, rep: 0, verdict: '', viral: false } });
    out.alone = H.myTrend(g, t);
    for (const [k, by] of ['zara.vey', 'maelle.fen', 'remi.sol', 'ada.quill'].entries()) mk(by, `j’ai testé la recette de @mila.flux #PotionDuSoir`, t - 30000 + k);
    out.trend = H.myTrend(g, t);
    H.tickAch(g, t + 3600000); out.got = H.achGot(g, 'worldwide-trend');
    return out;
  });
  await settle(page);
  check('a viral post « Carton plein » (a bought viral moment: no); a hashtag of the player’s taken up by others among the trends: « Tendance mondiale » (others’ only, or nobody’s but hers: no)',
    !vir.bought && vir.viral && !vir.others && !vir.alone && vir.trend && vir.got, vir);

  // ---------- going back to a save; a game changed by hand ----------
  const keep = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    const snap = { ach: { got: { 'first-crush': 1 }, prog: { 'coin-coin': 900, 'yard-sale': 3 }, nightmare: 2 } };
    H.achKeep(snap, g);
    out.kept = Object.keys(snap.ach.got).length === H.achCount(g) && snap.ach.got['first-crush'] === 1 && snap.ach.prog['yard-sale'] === 10 && snap.ach.prog['coin-coin'] === 900 && snap.ach.nightmare === 2;
    const old = {}; H.achKeep(old, g); out.fromOld = Object.keys(old.ach.got).length === H.achCount(g);
    out.local0 = !!g.ach.local;
    H.paletteApply(g, {}); out.localNone = !!g.ach.local;
    H.paletteApply(g, { gems: g.stats.gems }); out.local = !!g.ach.local;
    const snap2 = {}; H.achKeep(snap2, g); out.localKept = !!snap2.ach.local;
    return out;
  });
  check('back to a save: what was unlocked since stays, counted ones keep their best, the streaks are the save’s; the palette used: the game keeps its achievements to itself (it stays so after a save)',
    keep.kept && keep.fromOld && !keep.local0 && !keep.localNone && keep.local && keep.localKept, keep);

  // ---------- a present in a conversation ----------
  await G(page, () => { const H = window.__hype, g = H.S.game, m = H.charByHandle(g, 'maelle.fen'); Object.assign(m, { vibe: 'couple', rel: 60, cool: null, dare: null, cut: false, badBuzz: null }); g.career.cash = 5000; H.S.stack = []; H.openDM(m.id); });
  await page.waitForSelector('.layer .gift-toggle', { timeout: 10000 });
  await page.click('.layer .gift-toggle');
  await page.waitForSelector('.layer .gift-sheet');
  await page.fill('.layer .gift-sheet input[aria-label="Ce que tu offres"]', 'un bouquet de pivoines');
  await page.locator('.layer .gift-prices .chip-btn', { hasText: '1' }).filter({ hasText: '000' }).first().click();
  const sheet = await G(page, () => { const b = document.querySelector('.layer .gift-foot .btn'); return { btn: b ? b.textContent : '', off: b ? b.disabled : true, left: (document.querySelector('.layer .gift-foot small') || {}).textContent || '' }; });
  await shot(page, 'gift-sheet');
  const p0 = await G(page, () => window.__prompts.length);
  await page.click('.layer .gift-foot .btn');
  await page.waitForFunction(() => !window.__hype.S.busy.dm && document.querySelector('.layer .dm-card.gift.mine'), null, { timeout: 15000 });
  await sleep(400);
  const gave = await G(page, (p0) => {
    const H = window.__hype, g = H.S.game, m = H.charByHandle(g, 'maelle.fen'), msgs = g.dms[m.id].msgs, mine = msgs.filter((x) => x.me && x.gift).slice(-1)[0];
    const pr = window.__prompts.slice(p0).map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).find((x) => x.includes('CONVERSATION PRIVÉE')) || '';
    const card = document.querySelector('.layer .dm-card.gift.mine');
    return { cash: g.career.cash, gift: mine && mine.gift, card: card ? card.textContent : '', told: /un cadeau d’une valeur d’environ 1\s?000\s€/.test(pr), coin: H.achGot(g, 'coin-coin'), love: m.giftsLove };
  }, p0);
  await shot(page, 'gift-card');
  check('a present in a conversation: what and a price (1 000 €), paid at once, a card « Ton cadeau à Maëlle », the AI told its value; 1 000 € to a partner: « Coin coin »',
    /^Offrir · 1\s000\s€$/.test(sheet.btn) && !sheet.off && /Il te reste 5\s000\s€/.test(sheet.left) && gave.cash === 4000 && gave.gift && gave.gift.what === 'un bouquet de pivoines' && gave.gift.price === 1000
      && /Ton cadeau à Maëlle/.test(gave.card) && /un bouquet de pivoines/.test(gave.card) && gave.told && gave.coin && gave.love === 1000, { sheet, gave });
  await G(page, () => { window.__hype.S.game.career.cash = 10; window.__hype.update(); });
  await page.click('.layer .gift-toggle');
  await page.waitForSelector('.layer .gift-sheet');
  await page.fill('.layer .gift-sheet input[aria-label="Ce que tu offres"]', 'un café');
  await sleep(200);
  const poor = await G(page, () => { const b = document.querySelector('.layer .gift-foot .btn'); return { off: b.disabled, why: (document.querySelector('.layer .gift-sheet .why-off') || {}).textContent || '' }; });
  check('not enough money: the button waits and says what is missing', poor.off && /^Il te manque 90\s€\.$/.test(poor.why), poor);
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.S.game.career.cash = 2000; H.update(); });

  // ---------- a mean post: a flop, the laughingstock ----------
  const mean0 = await G(page, () => { const H = window.__hype, g = H.S.game; return { first: H.achGot(g, 'first-post'), flop: H.achGot(g, 'flop-post'), risee: H.achGot(g, 'internet-laughingstock') }; });
  await page.click('.rail-post:visible');
  await page.waitForSelector('#compose');
  await page.fill('#compose', 'franchement vous êtes tous des losers à Lumen');
  await page.locator('.layer-head button', { hasText: 'Publier' }).first().click();
  await page.waitForFunction(() => window.__hype.achGot(window.__hype.S.game, 'internet-laughingstock'), null, { timeout: 20000 }).catch(() => {});
  await sleep(500);
  const mean = await G(page, () => { const H = window.__hype, g = H.S.game; return { first: H.achGot(g, 'first-post'), flop: H.achGot(g, 'flop-post'), risee: H.achGot(g, 'internet-laughingstock') }; });
  check('a post that goes down badly: « Premier post », « Flop complet », and so badly that everyone laughs « Risée d’internet »', !mean0.first && !mean0.flop && !mean0.risee && mean.first && mean.flop && mean.risee, { mean0, mean });
  await page.waitForFunction(() => !window.__hype.S.busy.act, null, { timeout: 60000 }).catch(() => {});
  await settle(page);
  await G(page, () => { const H = window.__hype, g = H.S.game; Object.assign(g.stats, { cancelled: false, reputation: 60 }); g.pbb = null; g.lowProfile = null; H.update(); });
  await shot(page, 'after-mean');

  // ---------- a post at 3 in the morning: the toast, « Voir », the window, the profile ----------
  await G(page, () => { const H = window.__hype, g = H.S.game, off = g.clockOff || 0, d = new Date(Date.now() + off); g.clockOff = off + (3 - d.getHours()) * 3600000 + (30 - d.getMinutes()) * 60000; H.S.lastToastAt = Date.now(); H.update(); });
  await page.click('.rail-post:visible');
  await page.waitForSelector('#compose');
  await page.fill('#compose', 'insomnie devant le chaudron, quelqu’un est debout ?');
  await page.locator('.layer-head button', { hasText: 'Publier' }).first().click();
  await sleep(800);
  await shot(page, 'night-post');
  await page.waitForFunction(() => window.__hype.achGot(window.__hype.S.game, 'sleepless-night'), null, { timeout: 30000 });
  await page.waitForSelector('.toast >> text=Nuit blanche', { timeout: 15000 });
  const tst = await G(page, () => { const t = [...document.querySelectorAll('.toast')].find((x) => /Nuit blanche/.test(x.textContent)); return { text: t ? t.textContent : '', btn: t && t.querySelector('button') ? t.querySelector('button').textContent : '' }; });
  await shot(page, 'toast');
  await page.locator('.toast', { hasText: 'Nuit blanche' }).locator('button').click();
  await page.waitForSelector('.layer .ach-row', { timeout: 5000 });
  await sleep(300);
  const win = await G(page, () => {
    const H = window.__hype, g = H.S.game, rows = [...document.querySelectorAll('.layer .ach-row')];
    return { title: (document.querySelector('.layer .layer-head h2') || {}).textContent, rows: rows.length, got: rows.filter((r) => r.classList.contains('got')).length, hidden: rows.filter((r) => /Succès caché/.test(r.textContent)).length,
      nuit: rows.some((r) => r.classList.contains('got') && /Nuit blanche/.test(r.textContent)), intro: (document.querySelector('.layer .ach-intro') || {}).textContent || '', count: H.achCount(g),
      sections: [...document.querySelectorAll('.layer .section-h h3')].map((h) => h.textContent), fem: rows.some((r) => /Flambeuse/.test(r.textContent)) && rows.some((r) => /Experte en la matière/.test(r.textContent)) && rows.some((r) => /Ghostée/.test(r.textContent)),
      meter: rows.some((r) => r.querySelector('.ach-prog')) };
  });
  await shot(page, 'ach-window');
  await page.evaluate(() => { const l = document.querySelector('.layer .layer-body') || document.querySelector('.layer'); if (l) l.scrollTop = 99999; });
  await sleep(200);
  await shot(page, 'ach-window-end');
  check('a post at 3:30 in the morning: « Nuit blanche », its toast with « Voir », which opens the window: all 60 in their six groups, the names agree with the player (« Flambeuse », « Ghostée »), each dated once unlocked',
    /Succès débloqué : (🦉 )?Nuit blanche/.test(tst.text) && tst.btn === 'Voir' && win.title === 'Succès' && win.rows === 60 && win.nuit && win.got === win.count && win.hidden === 0 && win.fem
      && ['Les premiers pas', 'Relations', 'Drama et réputation', 'Avancement', 'Carrière et argent', 'Extrêmement rare'].every((x) => win.sections.includes(x)) && new RegExp(`^${win.count} sur 60\\.`).test(win.intro), { tst, win });
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.goTab ? H.goTab('profile') : null; H.update(); });
  await page.click('.rail-item[aria-label="Profil"]:visible, .tab:visible:has-text("Profil")').catch(() => {});
  await page.waitForSelector('.ach-sec', { timeout: 5000 });
  const prof = await G(page, () => { const s = document.querySelector('.ach-sec'); return { head: s.querySelector('.section-h span').textContent, chips: s.querySelectorAll('.ach-chip').length, btn: (s.querySelector('.btn') || {}).textContent || '' }; });
  await shot(page, 'profile');
  check('the profile: « Succès » with the count and the last ones, and « Tous les succès »', /^\d+ \/ 60$/.test(prof.head) && prof.chips >= 1 && prof.chips <= 8 && /Tous les succès/.test(prof.btn), prof);

  // ---------- all of them reached: nothing in the list is out of reach ----------
  const all = await G(page, () => { const H = window.__hype, g = H.S.game; return { n: H.achCount(g), missing: H.ACH.filter((A) => !H.achGot(g, A.id)).map((A) => A.id) }; });
  check('every one of the 60 was reached by playing (the hooks are where the game is)', all.n === 60, all);

  // ---------- romance at every adult age ----------
  const ages = await G(page, () => {
    const H = window.__hype; window.__castOlds = 2;
    let maxOld = 0, over55 = 0;
    for (let k = 0; k < 300; k++) for (const x of H.drawCastAges(10)) { if (x.age > maxOld) maxOld = x.age; if (x.age > 55) over55++; }
    window.__castOlds = undefined;
    const g = H.S.game, c = H.charByHandle(g, 'oskar.brume'); Object.assign(c, { age: 62, vibe: null, rel: 40, cool: null });
    return { maxOld, over55, crush: H.vibeOK(c, 'crush'), sheet: !/rôle à part/.test(H.ageText(c)) && /62 ans/.test(H.ageText(c)) };
  });
  check('romance at every adult age: a crush at 62 is possible, the casting draws up to 68, the AI is not told « a role apart » any more', ages.maxOld <= 68 && ages.maxOld >= 60 && ages.over55 > 0 && ages.crush && ages.sheet, ages);

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  console.log(`\n${checks.filter((c) => c[0] === 'PASS').length}/${checks.length} PASS`);
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
