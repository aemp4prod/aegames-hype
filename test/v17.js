// 0.17 end to end, in Chromium against the built hype.html with the mocked Claude runtime:
// - ages and maturity: decided before the AI writes the cast (mostly 18-25, one or two older in one game out of two,
//   never under 18), written on every sheet; the older ones have a role apart (no romance at all);
// - the characters see what the player does in public: a flirt, always in someone's comments, a clash with a friend, a
//   friend's post left alone; it shows more when repeated, they have it in mind, and once it is blatant the AI is asked
//   to have them react in their own way;
// - rumors: who passed it on stays hidden from the player (the character knows);
// - the train of the hyyype: two viral releases in a row (a bought one never counts), levels 1 to 5 with more Y, the
//   posts carry further on the way, the bill at the end (XP, brands), a rest before the next one;
// - the game's own emojis (stickers) in posts, messages and notifications, big when alone, and their keyboard.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v17.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v17');
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

async function newPage(browser, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true, colorScheme: 'light' });
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
  const castAges = await page.$$eval('.cast-card.pick', (els) => els.map((e) => [...e.querySelectorAll('.chip')].map((c) => c.textContent).find((t) => / ans$/.test(t)) || ''));
  await shot(page, 'cast-ages');
  await page.locator('.cast-card.pick', { hasText: 'Théo' }).click();
  await page.click('.cast-cta button');
  await page.waitForSelector('.post');
  await sleep(1200);
  await dismiss(page);

  // ---------- ages and maturity ----------
  const a1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, ms = H.mains(g, false);
    const wp = window.__prompts.find((p) => p.includes('CRÉER L’UNIVERS')) || '';
    const plan = (/"age" est imposé, dans l’ordre des dix lignes : (.*?)\. Rôle, bio/.exec(wp) || [])[1] || '';
    const mine = ms.slice(0, 10).map((c, k) => `${k + 1}) ${c.age} ans, ${H.MATU[c.matu].label}`).join(' ; ');
    const z = H.charByHandle(g, 'zara.vey');
    const ctx = H.ctxText(g, { focus: new Set([z.id]) });
    return { all: ms.every((c) => c.age >= 18 && !!H.MATU[c.matu]), plan, mine, same: plan === mine, no16: !/16-30 ans/.test(wp), rule: /surtout des 18-30 ans/.test(wp) && /écrit selon son âge et sa maturité/.test(wp),
      sheet: ctx.includes(`@zara.vey — Zara Vey · Duelliste star de Brasier`) && ctx.includes(`${z.age} ans, ${H.MATU[z.matu].label}`) && ctx.includes(H.MATU[z.matu].ai) /* 0.19: the maturity in a word on the sheet, what it means once */, olds: ms.filter((c) => c.age >= 35).length, json: wp.includes('"age":21') };
  });
  check('ages and maturities are decided before the AI writes the cast (imposed in order, in the prompt), every character has them, the « 16-30 ans » rule is gone (each writes by age and maturity), and they are on every sheet; the cast cards show the age',
    a1.all && a1.same && a1.no16 && a1.rule && a1.sheet && a1.json && a1.olds <= 2 && castAges.length >= 3 && castAges.every((t) => / ans$/.test(t)), Object.assign({ castAges }, a1));
  const d1 = await G(page, () => {
    const H = window.__hype;
    let any = 0, minAge = 99, young = 0, tm = 0, oldTm = 0, over2 = 0;
    for (let k = 0; k < 3000; k++) {
      const a = H.drawCastAges(10);
      const o = a.filter((x) => x.age >= 35).length;
      if (o) any++;
      if (o > 2) over2++;
      for (const x of a) { minAge = Math.min(minAge, x.age); if (x.age <= 21) { young++; if (x.matu === 'tres_immature') tm++; } if (x.age >= 35 && x.matu === 'tres_immature') oldTm++; }
    }
    return { anyRate: any / 3000, over2, minAge, tmRate: tm / young, oldTm };
  });
  check('the draw: one game out of two has older people (never more than two), nobody under 18, a quarter of the 18-21 very immature, never a very immature 35+',
    d1.anyRate > 0.45 && d1.anyRate < 0.55 && !d1.over2 && d1.minAge >= 18 && d1.tmRate > 0.21 && d1.tmRate < 0.29 && !d1.oldTm, d1);

  // ---------- an older character: a role apart ----------
  const r1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'prof.gallant');
    Object.assign(c, { age: 47, matu: 'tres_mature', vibe: null, rel: 60, cool: null, unlocked: true });
    const v1 = H.vibeOK(c, 'crush'), a = H.applyVibe(g, c, 'crush', 'test'), f = H.forceLove(g, c, 'couple', 'test', Date.now());
    H.setVibeGoal(c, 'flirt');
    const goal = c.vibeGoal;
    const mentor = H.applyVibe(g, c, 'mentor', 'te prend sous son aile');
    const dm = H.promptDM(g, c, [], 'bonsoir professeure');
    return { v1, a, f, goal, mentor, vibe: c.vibe, dm: /47 ans, très mature/.test(dm) && /rôle à part : jamais de romance avec le joueur/.test(dm) };
  });
  check('someone older has a role apart: no crush, no forced love, no romance goal; a mentor is fine; the AI knows (their sheet says it)', !r1.v1 && !r1.a && !r1.f && r1.goal !== 'flirt' && r1.mentor && r1.vibe === 'mentor' && r1.dm, r1);
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.S.modals = []; H.openChar(H.charByHandle(H.S.game, 'prof.gallant').id); });
  await page.waitForSelector('.layer .prof', { timeout: 5000 });
  await sleep(400);
  const pf = await page.$eval('.layer', (e) => ({ chips: [...e.querySelectorAll('.prof .chip')].map((x) => x.textContent), none: (e.querySelector('.vibe-none') || {}).textContent || '', love: [...e.querySelectorAll('.vibe-grp')].filter((x) => /Amour/.test(x.textContent)).map((x) => x.querySelectorAll('.vibe-opt').length) }));
  await shot(page, 'older-profile');
  await G(page, () => { window.__hype.S.stack = []; window.__hype.update(); });
  check('on their profile: their age, and « a role apart » instead of the love goals', pf.chips.includes('47 ans') && /rôle à part dans ta vie : pas de romance/.test(pf.none) && pf.love.length === 1 && pf.love[0] === 0, pf);
  const m1 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const cand = H.addCandidate(g, 'monteur', { name: 'Hugo Vasseur', g: 'm', tier: 3, years: 14 });
    const np = H.promptNewChar(g, { age: 41, matu: 'pose' });
    let olds = 0;
    for (let k = 0; k < 400; k++) if (H.newcomerAge(g).age >= 35) olds++;
    const old = JSON.parse(JSON.stringify(g));
    for (const id in old.chars) { delete old.chars[id].age; delete old.chars[id].matu; }
    H.migrate(old);
    const ms = Object.values(old.chars).filter((c) => c.kind !== 'media');
    return { candAge: cand && cand.age, years: cand && cand.cand.years, np: /Il ou elle a 41 ans/.test(np) && /rôle à part/.test(np) && np.includes('"age":41'), oldRate: olds / 400, migr: ms.every((c) => c.age >= 18 && c.age <= 34 && c.matu) };
  });
  check('a job candidate is old enough for their experience; a newcomer gets an age too (rarely an older one); a game from before gets ages for everyone, never an older one (a love story may be under way)',
    m1.candAge >= 19 + m1.years && m1.np && m1.oldRate < 0.16 && m1.migr, m1);

  // ---------- the characters see what the player does in public ----------
  const w1 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const A = H.charByHandle(g, 'theo.marlin'), C = H.charByHandle(g, 'nox.ombre'), B = H.charByHandle(g, 'zara.vey');
    for (const x of [A, C, B]) { x.unlocked = true; x.seen = []; x.mem = []; x.cool = null; x.cut = null; }
    Object.assign(A, { vibe: 'flirt', coeur: 'serein', rel: 40, age: 22 });
    Object.assign(C, { vibe: 'couple', coeur: 'jaloux', rel: 60, age: 24 });
    for (const c of H.mains(g)) if (c !== A && c !== C && ['crush', 'flirt', 'couple', 'fiancailles', 'mariage'].includes(c.vibe)) c.vibe = null;
    g.triggers = [];
    const pB = g.posts.find((p) => p.a === 'c:' + B.id);
    const ctx = { g, kind: 'reply', target: pB, targetReply: null, men: [], eval: { flirt: 3, flirtWith: B.handle, kindness: 1 } };
    const tA = () => g.triggers.filter((x) => x.c === A.id && /l’a vu draguer @zara\.vey en public/.test(x.text)).length;
    const tC = () => g.triggers.filter((x) => x.c === C.id && /l’a vu draguer @zara\.vey en public/.test(x.text)).length;
    H.witnessAct(ctx);
    const one = { A: tA(), C: tC(), ctxA: H.seenCtx(g, A), cText: (g.triggers.find((x) => x.c === C.id) || {}).text || '' };
    H.witnessAct(ctx);
    const two = { A: tA(), memA: A.mem.some((m) => /j’ai vu le joueur draguer @zara\.vey en public/.test(m.t)) };
    H.witnessAct(ctx); H.witnessAct(ctx);
    const dm = H.promptDM(g, A, [], 'coucou');
    return { one, two, four: { A: tA(), C: tC() }, dmSeen: /Théo Marlin a vu passer : le joueur drague @zara\.vey en public|Théo Marlin a vu passer/.test(dm) || dm.includes('l’a vu draguer') || dm.includes('draguer @zara.vey') };
  });
  check('a flirt in public is seen by the ones the player is seeing: a jealous partner reacts at once, a serene crush after the second time (it shows more when repeated); they have it in mind meanwhile; then not again for two days; the AI chooses how (it says: their choice, not necessarily a crisis)',
    w1.one.C === 1 && w1.one.A === 0 && /a vu passer : le joueur drague @zara\.vey en public/.test(w1.one.ctxA) && /\(en couple avec le joueur\) l’a vu draguer @zara\.vey en public : ça compte/.test(w1.one.cText) && /C’est son choix, pas forcément une crise/.test(w1.one.cText)
    && w1.two.A === 1 && w1.two.memA && w1.four.A === 1 && w1.four.C === 1, w1);
  const w2 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const D = H.charByHandle(g, 'leandre.aube'), B = H.charByHandle(g, 'zara.vey'), E = H.charByHandle(g, 'maelle.fen'), F = H.charByHandle(g, 'oskar.brume');
    for (const x of [D, E, F]) { x.unlocked = true; x.seen = []; x.mem = []; x.cut = null; }
    Object.assign(D, { vibe: 'crush', coeur: 'jaloux', rel: 30, age: 23 });
    g.triggers = [];
    const pB = g.posts.find((p) => p.a === 'c:' + B.id);
    const plain = { g, kind: 'reply', target: pB, targetReply: null, men: [], eval: { flirt: 0, flirtWith: '', kindness: 1 } };
    const tD = () => g.triggers.filter((x) => x.c === D.id && /tout le temps dans les commentaires de @zara\.vey/.test(x.text)).length;
    for (let k = 0; k < 3; k++) H.witnessAct(plain);
    const at3 = tD();
    H.witnessAct(plain);
    const at4 = tD();
    // a clash with someone's close friend
    H.setTie(g, E.id, B.id, 60);
    H.witnessAct({ g, kind: 'reply', target: pB, targetReply: null, men: [], eval: { flirt: 0, flirtWith: '', kindness: -4 } });
    const clash = g.triggers.find((x) => x.c === E.id && /proche de @zara\.vey, a vu le joueur s’en prendre à elle en public/.test(x.text));
    // a close friend's post left alone while the player comments everywhere else
    Object.assign(F, { rel: 70 });
    const t0 = Date.now();
    g.posts.push({ id: 'p-oskar', a: 'c:' + F.id, text: 'premier jour comme gardien en chef. la forêt est à moi.', ts: t0 - 3600000, at: t0 - 3600000, likes0: 0, likeT: 10, rpT: 0, ls: t0, animMs: 1000, replies: [], liked: false, reposted: false, likedBy: [] });
    for (let k = 0; k < 4; k++) pB.replies.push({ id: 'r-mila-' + k, a: 'p', text: 'trop bien', ts: t0 - 1000 * (4 - k), at: t0 - 1000 * (4 - k), likeT: 0, ls: t0, animMs: 1000 });
    H.ignoredFriends(g, pB, t0);
    const ign = g.triggers.find((x) => x.c === F.id && /commente partout sauf sous son dernier post/.test(x.text));
    return { at3, at4, clash: !!clash, ign: !!ign, memF: F.mem.some((m) => /commente chez tout le monde sauf chez moi/.test(m.t)) };
  });
  check('always in the same person’s comments shows too (a jealous crush notices at the fourth time, not the third); a public clash with a friend is seen by that friend’s close ones; a close friend notices their post left alone while the player comments everywhere else',
    w2.at3 === 0 && w2.at4 === 1 && w2.clash && w2.ign && w2.memF, w2);
  // through a real reply: the AI says it is a flirt (the eval), and the game takes it from there
  await G(page, () => {
    const H = window.__hype, g = H.S.game, C = H.charByHandle(g, 'nox.ombre');
    C.seen = []; C.mem = []; g.triggers = [];
    window.__mockFlirt = { flirt: 3, with: 'zara.vey' };
  });
  const n0 = await G(page, () => window.__prompts.length);
  await G(page, () => { const H = window.__hype, g = H.S.game, B = H.charByHandle(g, 'zara.vey'); return H.runAct('reply', 't’es vraiment trop belle sur cette photo, zara', g.posts.find((p) => p.a === 'c:' + B.id)); });
  await idle(page);
  const w3 = await G(page, (n) => {
    const H = window.__hype, g = H.S.game, C = H.charByHandle(g, 'nox.ombre');
    window.__mockFlirt = null;
    const p = window.__prompts.slice(n).find((x) => x.includes('## ACTION DU JOUEUR')) || '';
    return { ask: p.includes('flirt 0-3') && p.includes('"flirt":0,"flirtWith":""'), trig: g.triggers.some((x) => x.c === C.id && /l’a vu draguer @zara\.vey/.test(x.text)) || C.mem.some((m) => /draguer @zara\.vey/.test(m.t)) };
  }, n0);
  check('a real reply: the AI tells whether the player flirts (and with whom), and the partner who saw it is told', w3.ask && w3.trig, w3);

  // ---------- rumors: who passed it on stays hidden ----------
  const rm = await G(page, () => {
    const H = window.__hype, g = H.S.game, X = H.charByHandle(g, 'nox.ombre'), Y = H.charByHandle(g, 'theo.marlin');
    Y.mem = []; g.triggers = [];
    const n0 = g.notifs.length;
    const w = H.addWhisper(g, X, 'a écrit en privé que Théo est « trop collant »', { tone: 'bad', about: Y.id, seed: 'intel' });
    const r = H.hear(g, w, X, Y);
    const mem = Y.mem[Y.mem.length - 1] || {};
    const notifs = g.notifs.slice(n0).map((n) => n.text);
    const trig = (g.triggers.find((x) => x.c === Y.id) || {}).text || '';
    return { r, t: mem.t, s: mem.s, notifs, noName: notifs.every((t) => !/Nox/.test(t)), anon: notifs.some((t) => /on lui a répété/.test(t)), trig };
  });
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.S.modals = []; H.openChar(H.charByHandle(H.S.game, 'theo.marlin').id); });
  await page.waitForSelector('.layer .mem-list', { timeout: 5000 });
  const memShown = await page.$eval('.layer .mem-list', (e) => e.textContent);
  await G(page, () => { window.__hype.S.stack = []; window.__hype.update(); });
  check('a rumor that reaches the one it is about: they know who told them (the AI too), the player does not (their memories, the notifications); the AI may tell, or not',
    rm.r === 'subject' && /^Nox m’a dit que le joueur/.test(rm.t) && /^on m’a dit que le joueur/.test(rm.s) && rm.noName && rm.anon && /sans forcément dire qui le lui a dit/.test(rm.trig) && /on m’a dit que le joueur/.test(memShown) && !/Nox m’a dit/.test(memShown), Object.assign({ memShown }, rm));

  // ---------- the train of the hyyype ----------
  const t1 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    g.train = null; g.trainRest = 0; g.vidStreak = 0; H.S.modals = []; g.triggers = [];
    const vid = { r: { what: 'vidéo' }, tier: 'top' };
    const mk = (viral, bought) => ({ g, kind: 'post', video: vid, boosts: { viral: !!bought }, outcome: { viral, likes: 500, fol: 50, reposts: 10, xp: 30 } });
    H.trainAfterAct(mk(true)); const s1 = g.vidStreak;
    H.trainAfterAct(mk(false)); const s2 = g.vidStreak;
    H.trainAfterAct(mk(true)); H.trainAfterAct(mk(true, true)); const s3 = g.vidStreak, on3 = H.trainOn(g);
    H.trainAfterAct(mk(true));
    return { s1, s2, s3, on3, on4: H.trainOn(g), lvl: g.train && g.train.lvl, modal: H.S.modals.some((m) => m.t === 'train'), notif: g.notifs.some((n) => n.k === 'trainstart' && /Deux vidéos virales d’affilée : le train de la hyype est lancé/.test(n.text)), trig: (g.triggers || []).some((x) => /train de la hyype/.test(x.text)), streak: g.vidStreak };
  });
  check('two viral releases in a row start the train (a non-viral one breaks the run, a bought viral moment counts for nothing): the Minotaur announces it, the network is told',
    t1.s1 === 1 && t1.s2 === 0 && t1.s3 === 1 && !t1.on3 && t1.on4 && t1.lvl === 1 && t1.modal && t1.notif && t1.trig && t1.streak === 0, t1);
  await page.waitForSelector('.modal .train-card', { timeout: 5000 });
  await sleep(400);
  const tm = await page.$eval('.modal', (e) => ({ mino: !!e.querySelector('img.mino'), text: e.textContent }));
  await shot(page, 'train-start');
  await dismiss(page);
  const t2 = await G(page, () => {
    const H = window.__hype, g = H.S.game, e = H.estLikes(g), now = Date.now();
    const post = (k, viral) => ({ g, kind: 'post', boosts: {}, outcome: { viral: !!viral, likes: Math.round(e * k), fol: 10 } });
    H.fuelTrain(g, post(3), now); const l1 = g.train.lvl, p1 = g.train.pts;
    H.fuelTrain(g, post(2), now); const l2 = g.train.lvl;
    H.fuelTrain(g, { g, kind: 'reply', boosts: {}, outcome: { likes: 3, fol: 0 } }, now); const pr = g.train.pts;
    H.fuelTrain(g, post(6, true), now); const l3 = g.train.lvl;
    return { l1, p1, l2, pr, l3, mult: H.trainMult(g), ups: g.notifs.filter((n) => n.k === 'train').map((n) => n.text), hy: [1, 4, 5].map(H.hyWord), until: g.train.until > now + 5.9 * 3600000 };
  });
  check('posts that do well feed it (a viral one even more, a reply a little): level by level, more Y each time, and the window stays open while it is fed; the player’s posts carry further at each level',
    t2.l1 === 1 && Math.abs(t2.p1 - 3) < 0.11 && t2.l2 === 2 && Math.abs(t2.pr - 5.3) < 0.11 && t2.l3 === 4 && Math.abs(t2.mult - 1.32) < 1e-9 && t2.ups.some((x) => /Niveau 4 : le train de la hyyyyype accélère/.test(x)) && t2.hy.join(',') === 'hyype,hyyyyype,hyyyyyype' && t2.until, t2);
  const t3 = await G(page, () => {
    const H = window.__hype, g = H.S.game, r = Math.random;
    Math.random = () => 0.5;
    const e = { quality: 6, humor: 4, bold: 3, controversy: 1, reception: 5, virality: 4, kindness: 0 };
    const a = H.computeOutcome(g, e, 'post', {}, {}), b = H.computeOutcome(g, e, 'post', {}, { train: 1.32 });
    Math.random = r;
    return { a: a.likes, b: b.likes, fa: a.fol, fb: b.fol };
  });
  check('on the way, a post gets more likes and followers (×1.32 at level 4)', Math.abs(t3.b - Math.round(t3.a * 1.32)) <= 1 && Math.abs(t3.fb - Math.round(t3.fa * 1.32)) <= 1, t3);
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.goTab('feed'); H.update(); });
  await sleep(500);
  const bar = await page.$eval('.train-bar', (e) => ({ text: e.textContent, mino: !!e.querySelector('img.mino') })).catch(() => null);
  await shot(page, 'train-bar');
  const t4 = await G(page, () => {
    const H = window.__hype, g = H.S.game, lvl = g.train.lvl;
    H.S.modals = [];
    g.career.offerAt = Date.now() + 99 * 3600000;
    g.train.until = Date.now() - 1;
    const ended = H.tickTrain(g, Date.now());
    return { lvl, ended, state: g.train.state, xp: g.train.xp, rest: g.trainRest > Date.now() + 70 * 3600000, offerSoon: g.career.offerAt <= Date.now() + 2 * 3600000 + 5000, bonus: g.career.hypeBonus, modal: H.S.modals.some((m) => m.t === 'trainend'), notif: g.notifs.some((n) => /Terminus : ton train de la hyyyyype s’arrête au niveau 4/.test(n.text)), off: !H.trainOn(g) };
  });
  check('without fuel it stops: the bill (XP by level, the followers of the trip), and from level 3 the brands come sooner and pay more', t4.ended && t4.state === 'done' && t4.xp === 480 && t4.rest && t4.offerSoon && Math.abs(t4.bonus - 1.2) < 1e-9 && t4.modal && t4.notif && t4.off, t4);
  await page.waitForSelector('.modal .train-card', { timeout: 5000 });
  await sleep(300);
  const te = await page.$eval('.modal', (e) => e.textContent);
  await shot(page, 'train-end');
  await dismiss(page);
  const t5 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const vid = { r: { what: 'vidéo' }, tier: 'top' };
    for (let k = 0; k < 2; k++) H.trainAfterAct({ g, kind: 'post', video: vid, boosts: {}, outcome: { viral: true, likes: 500, fol: 50 } });
    const again = H.trainOn(g);
    g.stats.followers = Math.max(g.stats.followers, 2000);
    g.career.offerAt = Date.now() - 1;
    const offered = H.maybeOffer(g, Date.now());
    return { again, offered, bonusLeft: g.career.hypeBonus == null };
  });
  check('a rest of a few days before the next train; the brands’ offer comes with the bonus (then it is spent)', !t5.again && t5.offered && t5.bonusLeft, t5);
  check('on screen: the Minotaur announces it, a bar under the header shows the level and the time left, and he gives the bill at the end',
    tm.mino && /Tout le monde à bord/.test(tm.text) && /Le train de la hyype/.test(tm.text) && !!bar && bar.mino && /Train de la hyyyyype/.test(bar.text) && /Niv\. 4\/5/.test(bar.text) && /Terminus/.test(te) && /Descendre du train/.test(te) && /\+480 XP/.test(te), { tm: tm.text.slice(0, 160), bar, te: te.slice(0, 200) });

  // ---------- the game's emojis ----------
  await G(page, () => {
    const H = window.__hype, g = H.S.game, T = H.charByHandle(g, 'theo.marlin'), t = Date.now();
    g.posts.push({ id: 'p-emo', a: 'c:' + T.id, text: 'trop drôle 😂🔥 et ❤️ mais 🦄, 👍🏽 et ❤️‍🔥 restent', ts: t, at: t, likes0: 0, likeT: 3, rpT: 0, ls: t, animMs: 1000, replies: [], liked: false, reposted: false, likedBy: [] });
    H.addNotif(g, { k: 'info', at: t, text: 'Un test 🔥 en notification' });
    H.S.stack = []; H.S.modals = []; H.goTab('feed'); H.update();
  });
  await sleep(600);
  const e1 = await page.evaluate(() => {
    const art = [...document.querySelectorAll('.post')].find((x) => x.textContent.includes('trop drôle'));
    if (!art) return null;
    const pt = art.querySelector('.post-text');
    return { alts: [...pt.querySelectorAll('img.emo')].map((i) => i.alt), text: pt.textContent, ok: [...pt.querySelectorAll('img.emo')].every((i) => i.complete && i.naturalWidth > 0) };
  });
  await shot(page, 'emoji-post');
  await G(page, () => { window.__hype.goTab('notifs'); });
  await sleep(400);
  const e2 = await page.evaluate(() => { const n = [...document.querySelectorAll('.notif')].find((x) => x.textContent.includes('Un test')); return n ? n.querySelectorAll('img.emo').length : -1; });
  check('our stickers in posts and notifications, the phone’s for the others (one we did not draw, a skin tone, a combined emoji)',
    !!e1 && e1.alts.join(' ') === '😂 🔥 ❤️' && e1.ok && /🦄/.test(e1.text) && /👍🏽/.test(e1.text) && /❤️‍🔥/.test(e1.text) && e2 === 1, { e1, e2 });
  await G(page, () => { const H = window.__hype, g = H.S.game, T = H.charByHandle(g, 'theo.marlin'); H.addIncomingDM(g, T, '😂', Date.now() - 1000); H.addIncomingDM(g, T, 'pas mal 🔥', Date.now() - 500); H.openDM(T.id); });
  await page.waitForSelector('.layer .bubbles', { timeout: 5000 });
  await sleep(500);
  const e3 = await page.evaluate(() => { const b = [...document.querySelectorAll('.layer .bubble.them')]; return { jumbo: b.some((x) => x.classList.contains('jumbo') && x.querySelector('img.emo')), inline: b.some((x) => !x.classList.contains('jumbo') && /pas mal/.test(x.textContent) && x.querySelector('img.emo')) }; });
  await shot(page, 'emoji-dm');
  // the keyboard, in a private message
  await page.click('.layer .emo-btn');
  await page.waitForSelector('.layer .emo-panel', { timeout: 3000 });
  const k1 = await page.$eval('.layer .emo-panel', (e) => ({ cats: [...e.querySelectorAll('.emo-cat')].map((x) => x.textContent), cells: e.querySelectorAll('.emo-cell').length }));
  await page.locator('.layer .emo-panel .emo-cell').nth(1).click();
  await page.locator('.layer .emo-panel .emo-cell').nth(0).click();
  const v1 = await page.$eval('.layer textarea', (e) => e.value);
  await page.fill('.layer .emo-search', 'drague');
  await sleep(200);
  const k2 = await page.$eval('.layer .emo-panel', (e) => [...e.querySelectorAll('.emo-cell')].map((x) => x.title));
  const want = await G(page, () => window.__hype.emoSearch('drague').map((e) => e.n));
  await page.fill('.layer .emo-search', '');
  await sleep(200);
  const k3 = await page.$eval('.layer .emo-panel', (e) => [...e.querySelectorAll('.emo-cat')].map((x) => x.textContent));
  await shot(page, 'emoji-keyboard');
  check('private messages: an emoji alone is big, our stickers inside the text; the keyboard opens like a phone’s (categories), puts the emoji where the caret is, finds them by word, and the recent ones come first',
    e3.jumbo && e3.inline && k1.cats.join(',') === 'Visages,Mains,Cœurs,Symboles' && k1.cells === 37 && v1 === '🤣😂' && k2.length >= 2 && k2.join('|') === want.join('|') && k3[0] === 'Récents', { e3, k1, v1, k2, k3 });
  await G(page, () => { window.__hype.S.stack = []; window.__hype.S.emoOpen = null; window.__hype.update(); });

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
