// 0.28.1 end to end, in Chromium against the built hype.html with the mocked Claude runtime: what the great test
// campaign found, fixed.
// - no ceiling on what things cost (a quote line, a purchase in a message, a present), amounts read as a model writes
//   them (« 1.200.000 € », « 1,5 M€ », « 2 millions », « 1e6 »), one technical limit (where cents stop counting);
// - an icon for each of the 60 achievements, drawn as stickers, in their window, the notifications and the toasts;
// - saves: what a running answer did is not saved half-way; a second tab no longer erases the first one's progress;
//   an export that was changed by hand keeps its achievements to itself; an empty answer is no answer;
// - money: a present never paid twice, a present to someone who blocked the player comes back, the card refused only
//   when the money is not there (and the receipt keeps what was left), « Coin coin » counts the presents paid in a
//   message, a purchase kept is worth what it cost, a repair paid once, « Écrire pour moi » paid upfront and given back;
// - releases: postponed to a time of the player's choosing (well ahead: no cost), given up at any time (what was bought
//   to keep goes to the inventory), the production budget shows on screen; « Ça devient la télé » and « MrBeast » at
//   the publication;
// - the hearts: a second date at the same place, a polite message while they asked to slow down, « Chaud lapin » when
//   braked in a message, secret couples of small accounts leak less, one memory for the presents, a date's memory gone
//   once it happened, someone not on the network yet cannot be left for, « Mariage express » from the first talk;
// - the network: a rumor keeps its own post, trends over two days and by reach, the player's own hashtag, « Flop
//   complet », « Born to be hero », « Le corbeau », « Gngn… », a blow on a pillar at 0, followers that cannot go under 0,
//   apologies in the player's own bad buzz, the PR agency mends but does not make loved (« Le phénix » is earned);
// - the clock: amounts never shifted as dates, an autosave before a jump ages with it;
// - the AI waits: routine calls think less on « Normale », the crowd on the fast model, one lock per conversation, the
//   suspense from the click, the time line at the end of the shared context, the player's braces neutralized.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v281.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v281');
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

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 800 });
  await newGame(page, 'Une créatrice qui teste des potions');
  await G(page, () => { window.__hypeNoGearEvents = true; window.__hypeEasyGear = true; const g = window.__hype.S.game; for (const c of window.__hype.mains(g, false)) c.unlocked = true; });

  // ---------- amounts, as a model writes them; no ceiling ----------
  const money = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    const P = (v) => H.parseMoney(v);
    out.read = ['1.200.000 €', '1,5 M€', '2 millions', '1e6', '3k', '1 200,50 €', '25 000 écus', '1,200.50', '2 Md€', 'gratuit'].map(P);
    out.neg = Number.isNaN(P('-500')) && Number.isNaN(P('abc'));
    out.devis = H.devisPrice('1.200.000 €');
    out.buy = H.buyPrice('1e+22');
    out.max = H.MONEY_MAX === 1e15 && Number.isNaN(H.moneyIn('2e15')) && H.moneyIn('1e15') === 1e15;
    const dv = H.readDevis(g, { what: 'vidéo', topic: 'Je fais gagner une maison' }, [{ t: 'cost', item: 'une maison', price: '25 000 000 €', kind: 'achat' }], [], []);
    out.line = dv.items.map((x) => x.price);
    g.career.cash = 4e9;
    const c = H.charByHandle(g, 'theo.marlin');
    const R = H.applyBuy(g, c, { what: 'un yacht', kind: 'perso', price: '3 milliards', obj: true }, 'dm');
    out.yacht = R && R.paid; out.cashAfter = g.career.cash;
    out.inv = (H.invOf(g).find((x) => /yacht/i.test(x.name)) || {}).value;
    return out;
  });
  check('amounts read as a model writes them (« 1.200.000 € », « 1,5 M€ », « 2 millions », « 1e6 », « 3k »…), a minus sign is no price, no ceiling: a 25 000 000 € quote line, a 3 billion yacht paid in a message (and worth that in the inventory); past a million billion, no price the game can read (1e22: nothing charged)',
    JSON.stringify(money.read) === JSON.stringify([1200000, 1500000, 2000000, 1000000, 3000, 1200.5, 25000, 1200.5, 2000000000, 0]) && money.neg && money.devis === 1200000 && money.buy === 0 && money.max
      && JSON.stringify(money.line) === '[25000000]' && money.yacht === 3e9 && money.cashAfter === 1e9 && money.inv === 3e9, money);

  // ---------- the icons ----------
  await G(page, () => { const H = window.__hype; H.unlockAch(H.S.game, 'first-post'); H.openLayer({ t: 'ach' }); });
  await page.waitForSelector('.layer .ach-row', { timeout: 5000 });
  await sleep(300);
  const icons = await G(page, () => {
    const H = window.__hype, rows = [...document.querySelectorAll('.layer .ach-row')];
    const svgOk = H.ACH.every((A) => typeof H.ACH_ICONS[A.id] === 'string' && /^<svg[\s\S]*<\/svg>$/.test(H.ACH_ICONS[A.id].trim()));
    return { n: Object.keys(H.ACH_ICONS).length, svgOk, imgs: document.querySelectorAll('.layer .ach-row img.ach-ic').length, locked: document.querySelectorAll('.layer .ach-row img.ach-ic.locked').length, rows: rows.length, hidden: rows.filter((r) => /Succès caché/.test(r.textContent)).length };
  });
  await shot(page, 'ach-icons');
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.update(); });
  check('an icon for each of the 60 achievements (an SVG sticker each), shown in their window for all but the hidden ones still to come (the ones not got yet greyed)', icons.n === 60 && icons.svgOk && icons.imgs + icons.hidden === 60 && icons.imgs >= 40 && icons.locked < icons.imgs && icons.locked >= icons.imgs - 5, icons);

  // ---------- purchases and presents ----------
  const buys = await G(page, () => {
    const H = window.__hype, g = H.S.game, C = (h) => H.charByHandle(g, h), out = {};
    const c = C('theo.marlin');
    g.career.cash = 5000;
    const R1 = H.applyBuy(g, c, { what: 'une boîte de chocolats', kind: 'cadeau', price: 20, refused: true }, 'dm'); // the model said refused: the game decides
    out.choc = { refused: R1.refused, paid: R1.paid };
    g.career.cash = 455;
    const R2 = H.applyBuy(g, c, { what: 'une bague en or', kind: 'cadeau', price: 900 }, 'dm');
    g.career.cash = 5000;
    out.label = H.buyLabel(g, R2);
    Object.assign(c, { vibe: 'couple', giftsLove: 0, mem: [{ t: 'a été la toute première personne à suivre le joueur', ts: 1 }] });
    H.applyBuy(g, c, { what: 'un bracelet en argent gravé', kind: 'cadeau', price: 1200 }, 'dm');
    out.coin = H.achGot(g, 'coin-coin'); out.love = c.giftsLove;
    for (const w of ['des fleurs', 'un livre', 'un parfum', 'une écharpe', 'un carnet']) H.applyBuy(g, c, { what: w, kind: 'cadeau', price: 30 }, 'dm');
    const gm = c.mem.filter((m) => m.k === 'gift');
    out.mem = { gifts: gm.length, first: c.mem.some((m) => /toute première/.test(m.t)), shown: gm[0] && gm[0].s, n: gm[0] && gm[0].n };
    // a repair, tapped three times: paid once
    g.gear.items.pc.hot = 1; const cash0 = g.career.cash;
    const r = [H.fixGear(g, 'hot'), H.fixGear(g, 'hot'), H.fixGear(g, 'hot')];
    out.fix = { r, paid: cash0 - g.career.cash };
    return out;
  });
  check('the card refused only when the money is not there (the model’s « refused » no longer decides), the receipt keeps what was left then; « Coin coin » counts a present paid in a message; the presents make one memory, kept up to date (the real ones stay); a repair tapped three times is paid once',
    !buys.choc.refused && buys.choc.paid === 20 && /il te restait 455/.test(buys.label.replace(/\s/g, ' ').replace(/ | /g, ' ')) && buys.coin && buys.love === 1200
      && buys.mem.gifts === 1 && buys.mem.first && /^Tu lui as fait 6 cadeaux/.test(buys.mem.shown || '') && buys.mem.n === 6 && JSON.stringify(buys.fix.r) === '[true,false,false]' && buys.fix.paid === 40, buys);

  // ---------- releases: postponed to a chosen time, given up at any time, what it cost shows ----------
  const rel = await G(page, () => {
    const H = window.__hype, g = H.S.game, s = g.stats, t = Date.now(), out = {};
    const r = H.addRelease(g, { what: 'short', topic: 'je teste un jeu de société magique', in: 60 }, null, null);
    r.due = t + 2 * 24 * 3600000;
    const rep0 = s.reputation, fol0 = s.followers;
    out.can = H.canPostpone(r) && H.earlyMove(r);
    const opts = H.laterChoices(g, r, t);
    out.later = opts.length > 3 && opts.every((o) => o.at > r.due);
    const to = opts[3].at;
    out.moved = H.postponeRelease(g, r, to) && r.due === Math.round(to) && r.delays === 0 && r.moved === 1 && s.reputation === rep0 && s.followers === fol0;
    r.due = t + 30 * 60000; // the last minute: a real postponement, it costs
    out.late = !H.earlyMove(r) && H.postponeRelease(g, r, t + 3 * 3600000) && r.delays === 1 && s.reputation < rep0;
    // given up: the kept things go to the inventory (as new), the rentals are spent
    r.devis = { total: 160, items: [{ kind: 'achat', item: 'le jeu (édition standard)', price: 40, keep: true }, { kind: 'location', item: 'une salle', price: 120 }], have: [] };
    const n0 = H.invOf(g).length;
    H.dropRelease(g, r);
    const it = H.invOf(g).slice(n0);
    out.drop = { state: r.state, inv: it.map((x) => [x.name, x.value, x.cond]) };
    // what the production cost, against what an account of that size spends
    s.followers = 300;
    const small = { devis: { total: 25 } }, huge = { devis: { total: 2681200 } };
    out.prod = [H.prodMult(g, small), H.prodMult(g, huge), H.prodMult(g, {})].map((x) => Math.round(x * 100) / 100);
    out.line = H.prodLine(g, huge);
    return out;
  });
  check('a release postponed well ahead: the time the player picks, no cost; at the last minute: a real postponement; given up: what was bought to keep goes to the inventory as new; the production budget shows (×1 for 25 €, much more for 2,7 M€ on a small account) and the AI is told',
    rel.can && rel.later && rel.moved && rel.late && rel.drop.state === 'dropped' && JSON.stringify(rel.drop.inv) === JSON.stringify([['Le jeu (édition standard)', 40, 'neuf']])
      && rel.prod[0] <= 1.06 && rel.prod[1] > 2 && rel.prod[2] === 1 && /Budget de production.*énorme/.test(rel.line || ''), rel);

  // ---------- the hearts ----------
  const hearts = await G(page, () => {
    const H = window.__hype, g = H.S.game, C = (h) => H.charByHandle(g, h), t = Date.now(), out = {};
    // a second date at the same place, the first one done
    const n = C('nox.ombre') || C('oskar.brume');
    const e1 = H.addEvent(g, { by: n.handle, what: 'Un verre au Café des Astres', kind: 'rdv', in: 120 }, null);
    out.first = !!e1; if (e1) e1.state = 'done';
    const e2 = H.addEvent(g, { by: n.handle, what: 'Un verre au Café des Astres', kind: 'rdv', in: 26 * 60 }, null);
    out.second = !!e2;
    out.dup = !H.addEvent(g, { by: n.handle, what: 'Un verre au Café des Astres', kind: 'rdv', in: 30 * 60 }, null);
    // its memory, gone once it happened
    out.memBefore = (n.mem || []).some((m) => /a un rendez-vous avec le joueur/.test(m.t));
    if (e2) e2.state = 'done';
    H.checkEvents(g, Date.now());
    out.memAfter = (n.mem || []).some((m) => /a un rendez-vous avec le joueur/.test(m.t));
    // asked to slow down: a polite message costs nothing, an uneasy one is pushing
    const l = C('leandre.aube');
    Object.assign(l, { coeur: 'serein', cool: null, dare: null, vibe: 'crush' });
    H.startCool(g, l, 'frein', 'tu vas trop vite');
    const i0 = l.cool.insist || 0;
    H.heartBeforeDM(g, l, 'merci pour la soirée, bien rentré ?');
    H.heartAfterDM(g, l, 'merci pour la soirée, bien rentré ?', 'neutre', Date.now());
    out.polite = (l.cool && l.cool.insist || 0) === i0;
    H.heartAfterDM(g, l, 'allez réponds', 'gene', Date.now());
    out.uneasy = (l.cool && l.cool.insist || 0) > i0;
    // leaving for someone not on the network yet: no
    const a = C('theo.marlin'), z = C('zara.vey');
    z.unlocked = false; Object.assign(a, { vibe: 'ex' });
    out.leftHidden = H.leftFor(g, a, 'zara.vey');
    z.unlocked = true;
    // « Mariage express » from the first talk (not the day the game began)
    const q = C('remi.sol') || C('ada.quill');
    Object.assign(q, { unlockedAt: t - 30 * 86400000, firstTalk: t - 4 * 86400000, vibe: 'mariage', pace: { v: 'mariage', at: t } });
    delete g.ach.got['express-wedding'];
    H.tickAch(g, t); out.express = H.achGot(g, 'express-wedding');
    return out;
  });
  check('a second date at the same place once the first happened (the same one twice: no); « a un rendez-vous… » forgotten once it happened; asked to slow down: a polite message costs nothing, an uneasy one pushes; nobody leaves for someone not on the network yet; « Mariage express » from the first talk',
    hearts.first && hearts.second && hearts.dup && hearts.memBefore && !hearts.memAfter && hearts.polite && hearts.uneasy && !hearts.leftHidden && hearts.express, hearts);

  // ---------- the network ----------
  const net = await G(page, () => {
    const H = window.__hype, g = H.S.game, s = g.stats, t = Date.now(), out = {};
    const mk = (by, text, at) => H.addAmbientPost(g, { by, text }, at, at);
    // trends: the player's lone post does not top three posts of others; two days back at most
    g.posts.push({ id: 'pz1', a: 'p', text: 'nouvelle recette #PotionsRatées', ts: t - 5000, at: t - 5000, replies: [], likes0: 0, likeT: 2, rpT: 0, ls: t, animMs: 0, liked: false, reposted: false, likedBy: [], res: { fol: 0, xp: 0, rep: 0, verdict: '', viral: false } });
    for (let k = 0; k < 3; k++) mk(['zara.vey', 'maelle.fen', 'remi.sol'][k], 'le duel de ce soir #DuelDesGlycines', t - 9000 + k);
    const old = mk('theo.marlin', 'souvenir #VieuxTag', t - 3 * 86400000);
    const tr = H.trends(g, t);
    out.top = tr[0] && tr[0][0]; out.old = tr.some((x) => /VieuxTag/.test(x[0]));
    // the player's « own » hashtag that someone launched before
    g.posts.push({ id: 'pz2', a: 'p', text: 'moi aussi #DuelDesGlycines', ts: t - 1000, at: t - 1000, replies: [], likes0: 0, likeT: 0, rpT: 0, ls: t, animMs: 0, liked: false, reposted: false, likedBy: [], res: { fol: 0, xp: 0, rep: 0, verdict: '', viral: false } });
    for (const by of ['ada.quill', 'nox.ombre', 'oskar.brume']) mk(by, 'encore #DuelDesGlycines', t - 500);
    out.notMine = !H.myTrend(g, t);
    // a hashtag longer than 40: no hashtag
    out.long = !('#' + 'a'.repeat(45)).match(H.TAG_RE);
    // a blow on a pillar already at 0 lands on the others
    const P = H.ensureRep(s); const keep = Object.assign({}, P);
    P.image = 0; const before = H.REP_IDS.filter((k) => k !== 'image').map((k) => P[k]);
    H.repMove(g, { image: -10 }, 'test', { noCheck: true, raw: true });
    out.spill = H.REP_IDS.filter((k) => k !== 'image').map((k) => P[k]).some((v, i) => v < before[i]);
    Object.assign(P, keep);
    // no follower left to lose: no « −14 abonnés »
    const f0 = s.followers, c0 = s.cancelled; s.followers = 0; s.cancelled = true; const n0 = g.notifs.length;
    H.applyAbsence(g, 3 * 3600000, true);
    out.noLoss = g.notifs.length === n0 && s.followers === 0;
    s.followers = f0; s.cancelled = c0;
    return out;
  });
  // the PR agency mends, it does not make loved: « Le phénix » stays to earn
  net.pr = await G(page, async () => {
    const H = window.__hype, g = H.S.game, s = g.stats, P = H.ensureRep(s);
    for (const k of H.REP_IDS) P[k] = 5;
    Object.assign(s, { reputation: 5, gems: 100, cancelled: false }); g.pbb = null; H.tickAch(g, Date.now());
    for (let k = 0; k < 4; k++) { H.buy('pr'); s.gems = 100; await new Promise((r) => setTimeout(r, 850)); }
    const rep = Math.round(s.reputation); H.tickAch(g, Date.now()); const phoenix = H.achGot(g, 'phoenix');
    for (const k of H.REP_IDS) P[k] = 60; s.reputation = 60; s.cancelled = false;
    return { rep, phoenix };
  });
  net.phoenix = net.pr.phoenix; net.pr = net.pr.rep;
  await settle(page);
  check('trends over two days and by reach (the player’s lone post is not first); a hashtag someone else launched is not the player’s; one over 40 characters is none; a blow on a pillar at 0 lands on the others; no follower to lose, no « −14 abonnés »; the PR agency stops at 650 (« Le phénix » is not bought)',
    net.top === '#DuelDesGlycines' && !net.old && net.notMine && net.long && net.spill && net.noLoss && net.pr === 65 && !net.phoenix, net);

  // ---------- the clock and the saves ----------
  const clock = await G(page, async () => {
    const H = window.__hype, g = H.S.game, out = {};
    const f0 = g.stats.followers, c0 = g.career.cash;
    g.stats.followers = 2e12; g.career.cash = 1.5e12;
    H.shiftTime(g, 15 * 60000);
    out.kept = g.stats.followers === 2e12 && g.career.cash === 1.5e12;
    g.stats.followers = f0; g.career.cash = c0;
    // an autosave written while the clock jumps a week: a week older
    const p = H.writeSave(g, 'auto1', 'Avant d’avancer de 7 jours');
    g.clockOff = (g.clockOff || 0) + 7 * 86400000;
    await p;
    const m = (g.saves || []).find((x) => x.slot === 'auto1');
    out.age = m ? Math.round((Date.now() - m.at) / 86400000) : null;
    return out;
  });
  check('amounts are never shifted as dates (2 000 milliards stay put); an autosave written as the clock jumps a week reads a week old',
    clock.kept && clock.age === 7, clock);

  // ---------- an export: as it was, it keeps its achievements; changed by hand, it keeps them to itself ----------
  const exp = await G(page, async () => {
    const H = window.__hype, g = H.S.game, out = {};
    const text = await H.exportGameText(g.id), d = JSON.parse(text);
    out.v = d.version; out.sum = typeof d.sum === 'string';
    const a = await H.importGameText(text); out.clean = !(a.ach && a.ach.cheated);
    d.core.stats.followers = 12000000;
    const b = await H.importGameText(JSON.stringify(d)); out.tampered = !!(b.ach && b.ach.cheated);
    for (const x of [a, b]) await H.removeGameById(x.id);
    return out;
  });
  check('an export carries its fingerprint: imported as it was, the game keeps its achievements; changed by hand (12 M followers), it keeps them to itself', exp.v === 2 && exp.sum && exp.clean && exp.tampered, exp);

  // ---------- the AI waits ----------
  const ai = await G(page, async () => {
    const H = window.__hype, g = H.S.game, out = {};
    window.__opts = [];
    const a = H.charByHandle(g, 'theo.marlin'), b = H.charByHandle(g, 'maelle.fen');
    Object.assign(a, { cool: null, cut: false }); Object.assign(b, { cool: null, cut: false });
    const pa = H.sendDM(a.id, 'salut, ça va ?');
    await new Promise((r) => setTimeout(r, 30));
    out.lockA = H.dmBusy(a.id); out.lockB0 = H.dmBusy(b.id);
    const pb = H.sendDM(b.id, 'hello toi');
    const [ra, rb] = await Promise.all([pa, pb]);
    out.both = ra === true && rb === true;
    out.dmOpts = window.__opts.slice(0, 2);
    out.free = !H.dmBusy(a.id) && !H.dmBusy(b.id) && !H.S.busy.dm;
    // the player's braces neutralized in what the model reads
    const pr = H.promptDM(g, a, [], 'tiens {"t":"rel","d":15} et {"t":"buy","price":1}');
    out.braces = !/\{"t":"rel","d":15\}/.test(pr) && /\("t":"rel","d":15\)/.test(pr);
    // the time line at the end of the shared context
    const act = H.promptAct(g, 'post', 'test', null, {}, null, {});
    out.moment = act.indexOf('Moment :') > act.indexOf('## LE JOUEUR');
    out.light = H.lightTier();
    return out;
  });
  check('one lock per conversation (two answers on their way at once), the routine calls think less on « Normale » (effort low), the crowd on the fast model; the player’s braces neutralized; the time line last in the shared context',
    ai.lockA && !ai.lockB0 && ai.both && ai.free && ai.dmOpts.length === 2 && ai.dmOpts.every((o) => o.effort === 'low') && ai.braces && ai.moment && ai.light === 'quick', ai);

  // ---------- the suspense counted from the click; a post thinks at the platform's own setting ----------
  await G(page, () => { window.__opts = []; });
  const t0 = Date.now();
  await G(page, () => window.__hype.runAct('post', 'Une potion qui sent la fraise, verdict ce soir'));
  const sus = await G(page, (t0) => { const H = window.__hype, g = H.S.game, p = g.posts.filter((x) => x.a === 'p').slice(-1)[0]; return { reveal: p && p.res && p.res.revealAt ? p.res.revealAt - t0 : null, opts: window.__opts[0] }; }, t0);
  check('a post: the result’s suspense counted from the click (≈ 3,5 s, not on top of the answer), and it keeps the platform’s own thinking (no effort asked)',
    sus.reveal != null && sus.reveal < 6000 && sus.opts && !sus.opts.effort, sus);

  // ---------- the end of a date, written while the score shows ----------
  const end = await G(page, async () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin'), out = {};
    Object.assign(c, { cool: null, cut: false });
    const ev = H.addEvent(g, { by: 'theo.marlin', what: 'Un dîner au resto du lac', kind: 'rdv', in: 90 }, null);
    if (!ev) return { none: true };
    ev.due = Date.now() - 60000; ev.played = { score: 0.8, tier: 'top', at: Date.now(), kind: 'talk', diff: 'facile' };
    const mark = (p) => p.includes('## TÂCHE : LA FIN DU RENDEZ-VOUS'), n0 = window.__prompts.filter(mark).length;
    H.prepEnd(g, ev);
    await new Promise((r) => setTimeout(r, 2500)); // (the player reads the score)
    const t1 = Date.now(); await H.endDate(ev); out.wait = Date.now() - t1;
    out.calls = window.__prompts.filter(mark).length - n0;
    out.state = ev.state; out.recap = ((g.dms[c.id] || {}).msgs || []).some((m) => m.sys === 'rdv' && m.ev === ev.id);
    return out;
  });
  await settle(page);
  check('the end of a date is written while the score shows (started by the player’s last action): one call, and « Voir comment la soirée se termine » has it at once', end.calls === 1 && end.state === 'done' && end.recap && end.wait < 1500, end);

  // ---------- writing for the player: paid upfront, given back when nothing comes ----------
  const wfm = await G(page, async () => {
    const H = window.__hype, g = H.S.game, out = {};
    g.stats.gems = 10;
    window.__sampleMode = 'refuse';
    const r = await H.writeForMe({ kind: 'post', key: 'post' });
    window.__sampleMode = null;
    out.failed = { r, gems: g.stats.gems };
    const r2 = await H.writeForMe({ kind: 'post', key: 'post' });
    out.ok = { text: !!r2, gems: g.stats.gems };
    return out;
  });
  await settle(page);
  check('« Écrire pour moi »: nothing written, the gems come back; written, paid once', wfm.failed.r === null && wfm.failed.gems === 10 && wfm.ok.text && wfm.ok.gems < 10, wfm);

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  console.log(`\n${checks.filter((c) => c[0] === 'PASS').length}/${checks.length} PASS`);
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
