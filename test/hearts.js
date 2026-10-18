// 0.11 end to end, in Chromium against the built hype.html with the mocked Claude runtime: hearts.
// - every main character has a heart (from the AI, or guessed), and the first five include a real challenge;
// - a fortress gives little and takes a lot; the impulsive swing, and their flame drops when nobody keeps it up;
// - too fast for their heart: they slow down, panic (late, short answers), find it fishy (and tell a friend, who may
//   dig into the player's life), and insisting makes it worse (silence, anger, blocked, called out in public);
// - skipping steps: a dare the player wins with convincing words (a crush at first sight) or loses;
// - someone out of reach does not answer strangers, until the player gets noticed;
// - after the first date, dates are played for real: a conversation, gestures, the player's words judged, no score
//   on screen; the end of the evening reads what was said.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/hearts.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-hearts');
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
    window.__mockCoeurs = { 'theo.marlin': 'serein', 'nox.ombre': 'anxieux', 'zara.vey': 'prudent', 'leandre.aube': 'impulsif' };
    window.__castOlds = 0; // (0.27.4: nobody older than 34 in this cast, or a heart the checks rely on drew a role apart)
    window.__mockAmis = { 'zara.vey': 'nox.ombre', 'nox.ombre': 'theo.marlin' };
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
  const ids = await G(page, () => { const H = window.__hype, g = H.S.game, id = (h) => H.charByHandle(g, h).id; return { theo: id('theo.marlin'), nox: id('nox.ombre'), zara: id('zara.vey'), iris: id('prof.gallant'), leandre: id('leandre.aube') }; });
  // a clean slate for what is measured below: no stray cool, and every step taken long ago unless a check says otherwise
  const reset = (id, o) => G(page, (a) => { const g = window.__hype.S.game, c = g.chars[a.id]; Object.assign(c, { cool: null, dare: null, coolPast: null, vibe: null, pace: { at: Date.now() - 400 * 3600000 }, firstTalk: Date.now() - 400 * 3600000, lastTouch: Date.now(), fade: 0 }, a.o || {}); window.__hype.update(); }, { id, o });

  // ---------- hearts: from the AI, a real challenge among the first five, a guess for old games ----------
  const h0 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const pw = window.__prompts.find((p) => p.includes('CRÉER L’UNIVERS')) || '';
    const first5 = H.mains(g, false).slice(0, 5).map((c) => c.handle + ':' + c.coeur);
    // an old game: no heart anywhere, someone in love with the player among the first five
    const old = JSON.parse(JSON.stringify(g));
    for (const c of H.mains(old, false)) { delete c.coeur; delete c.dates; }
    const t = Object.values(old.chars).find((c) => c.handle === 'theo.marlin'); t.vibe = 'flirt';
    H.ensureHearts(old);
    const o5 = H.mains(old, false).slice(0, 5);
    return { pw: /"coeur"/.test(pw) && /"ami"/.test(pw) && /au moins un vrai défi \(forteresse ou inaccessible\)/.test(pw), first5, ami: H.amiOf(g, H.charByHandle(g, 'zara.vey')).handle,
      oldAll: H.mains(old, false).every((c) => H.COEURS[c.coeur]), oldDefi: o5.filter(H.isDefi).map((c) => c.handle), oldTheo: t.coeur, dates: H.mains(old, false).every((c) => typeof c.dates === 'number') };
  });
  check('every main character has a heart (the AI writes it, with their closest friend); the first five include a real challenge (a fortress here); an old game gets hearts guessed, and a challenge who is not the one the player loves',
    h0.pw && h0.first5.includes('prof.gallant:forteresse') && h0.first5.includes('nox.ombre:anxieux') && h0.ami === 'nox.ombre' && h0.oldAll && h0.oldDefi.length === 1 && h0.oldDefi[0] !== 'theo.marlin' && h0.dates, h0);

  // ---------- a fortress gives little and takes a lot; the impulsive swing; a fortress's dates are one notch harder ----------
  const sc = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, c = (id) => g.chars[id];
    const iris = c(I.iris), lea = c(I.leandre), theo = c(I.theo);
    const r0 = iris.rel;
    H.applyRel(g, iris, 10, 'test');
    const up = iris.rel - r0;
    const r1 = iris.rel;
    H.applyRel(g, iris, -10, 'test');
    return { up, down: iris.rel - r1, imp: H.heartScale(lea, 10), impDown: H.heartScale(lea, -10), serein: H.heartScale(theo, 10), irisDiff: H.fameDiff(iris), plainDiff: iris.followers < 100000 && iris.followers >= 10000 ? 'moyen' : '?' };
  }, ids);
  check('a fortress gives little (+10 → +4) and takes a lot (−10 → −16); the impulsive swing (±14 / −13); the serene as written; a fortress’s dates are one notch harder',
    sc.up === 4 && sc.down === -16 && sc.imp === 14 && sc.impDown === -13 && sc.serein === 10 && sc.irisDiff === 'difficile' && sc.plainDiff === 'moyen', sc);

  // ---------- too fast for a serene heart: Théo asks to slow down; the AI is told; insisting: silence, then blocked ----------
  await reset(ids.theo, { rel: 40, vibe: 'crush', pace: { at: Date.now() - 2 * 3600000 } });
  const f1 = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, t = g.chars[id];
    const before = H.promptDM(g, t, [], 'coucou');
    window.__trustRolls = [0.99];
    const ok = H.applyVibe(g, t, 'flirt', 'ça flirte');
    const during = H.promptDM(g, t, [], 'coucou');
    return { warn: /serait trop rapide pour lui/.test(before) && /freine/.test(before), ok, vibe: t.vibe, cool: t.cool && t.cool.k, mem: t.mem.slice(-1)[0].t, told: /a demandé au joueur de ralentir/.test(during) };
  }, ids.theo);
  check('too fast for a serene heart: the step does not happen, Théo asks to slow down (the AI is told; it was warned beforehand), and remembers it',
    f1.warn && f1.ok === false && f1.vibe === 'crush' && f1.cool === 'frein' && /un peu vite/.test(f1.mem) && f1.told, f1);
  const n1 = [];
  for (const txt of ['allez, dis oui', 'tu me manques déjà', 'pourquoi tu réponds pas ?']) n1.push(await dm(page, ids.theo, txt, [0.99, 0.99]));
  const f2 = await G(page, (id) => { const t = window.__hype.S.game.chars[id]; return { cool: t.cool && t.cool.k, rel: t.rel }; }, ids.theo);
  const n2 = await dm(page, ids.theo, 'allô ?', [0.99, 0.99]);
  const f3 = await G(page, (id) => { const g = window.__hype.S.game, t = g.chars[id], m = g.dms[id].msgs; return { cool: t.cool && t.cool.k, last: m[m.length - 1].text, me: m[m.length - 1].me, seen: g.notifs.some((n) => n.k === 'seen' && n.c === id) }; }, ids.theo);
  check('insisting with a loyal heart: after three pushes, Théo goes silent (no answer, no AI call, « vu »), then the messages pile up unanswered',
    n1[0] === 1 && n1[1] === 1 && f2.cool === 'ghost' && n2 === 0 && f3.me && f3.last === 'allô ?' && f3.seen, { n1, f2, n2, f3 });
  for (const txt of ['réponds stp', 'sérieux ?']) await dm(page, ids.theo, txt, [0.99]);
  const f4 = await G(page, (id) => { const t = window.__hype.S.game.chars[id]; return { cool: t.cool && t.cool.k, mem: t.mem.slice(-1)[0].t }; }, ids.theo);
  check('still insisting while ignored: Théo blocks the player', f4.cool === 'bloque' && /bloqué/.test(f4.mem), f4);

  // ---------- an anxious heart panics: late, short answers (no « typing » for hours); pushing makes it worse ----------
  await reset(ids.nox, { rel: 40, vibe: 'crush', pace: { at: Date.now() - 3600000 } });
  const p0 = await G(page, (id) => window.__hype.S.game.dms[id] ? window.__hype.S.game.dms[id].msgs.length : 0, ids.nox);
  const pn = await dm(page, ids.nox, 'je crois que je t’aime', [0.99, 0.99]);
  const pz = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, n = g.chars[a.id], m = g.dms[a.id].msgs.slice(a.p0);
    const pr = window.__prompts.filter((p) => p.includes('CONVERSATION PRIVÉE') && p.includes('@nox.ombre')).slice(-1)[0] || '';
    return { cool: n.cool && n.cool.k, late: m.filter((x) => !x.me).every((x) => x.at > Date.now() + 3600000), them: m.filter((x) => !x.me).length, panic: /panique : tout va trop vite/.test(pr) };
  }, { id: ids.nox, p0 });
  await G(page, (id) => { window.__hype.S.stack = []; window.__hype.openDM(id); }, ids.nox);
  await sleep(600);
  const typing = await page.$('.layer .typing-b');
  await shot(page, 'panic-no-typing');
  const pn2 = await dm(page, ids.nox, 'tu es là ?', [0.99, 0.99]);
  const pz1 = await G(page, (id) => { const n = window.__hype.S.game.chars[id]; return n.cool && n.cool.k; }, ids.nox);
  const pn3 = await dm(page, ids.nox, 'allô ?? réponds', [0.99, 0.99]);
  const pz2 = await G(page, (id) => { const n = window.__hype.S.game.chars[id]; return n.cool && n.cool.k; }, ids.nox);
  check('an anxious heart panics at a declaration that comes too soon: the AI is told, the answer comes hours later (no « typing » meanwhile); messages before it are pushing (no AI call): a second one, and it gets worse',
    pn === 1 && pz.cool === 'panique' && pz.late && pz.them >= 1 && pz.panic && !typing && pn2 === 0 && pz1 === 'panique' && pn3 === 0 && pz2 === 'ghost', { pz, typing: !!typing, pn2, pz1, pz2 });
  await G(page, () => { window.__hype.S.stack = []; window.__hype.update(); });

  // ---------- a cautious heart finds it fishy, tells a friend, who digs into the player's life ----------
  await reset(ids.zara, { rel: 35, vibe: 'crush', pace: { at: Date.now() - 3600000 } });
  await reset(ids.theo, { vibe: 'crush' }); // the player has something going on with Théo too
  const lz = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, z = g.chars[I.zara];
    window.__trustRolls = [0.1, 0.1]; // Zara tells Nox; Nox digs
    H.applyVibe(g, z, 'flirt', 'ça flirte');
    const iq = (g.inquiries || []).find((x) => x.c === I.zara && x.state === 'open');
    const noxMem = g.chars[I.nox].mem.slice(-1)[0].t;
    const r0 = z.rel;
    if (iq) iq.due = Date.now() - 1000;
    H.tickHearts(g, Date.now());
    return { cool: z.cool && z.cool.k, iq: !!iq, by: iq && g.chars[iq.by].handle, noxMem, drop: r0 - z.rel, found: iq && iq.found, notif: g.notifs.filter((n) => /a enquêté sur toi/.test(n.text)).map((n) => n.text).slice(-1)[0] || '' };
  }, ids);
  check('a cautious heart finds it fishy (love bombing?) and tells their friend; the friend digs into the player’s life and finds what is real (Théo): Zara takes it badly',
    lz.cool === 'louche' && lz.iq && lz.by === 'nox.ombre' && /love bombing/.test(lz.noxMem) && /Théo Marlin/.test(lz.found || '') && lz.drop >= 14 && /Nox a enquêté sur toi pour Zara… et a trouvé/.test(lz.notif), lz);
  // nothing to find: the doubt goes away; and convincing answers clear it too
  await reset(ids.theo, { vibe: null });
  await reset(ids.zara, { rel: 35, vibe: 'crush', pace: { at: Date.now() - 3600000 } });
  const lz2 = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, z = g.chars[I.zara];
    for (const c of H.mains(g)) if (c !== z && H.LOVE_STEPS ? false : false) c.vibe = null;
    for (const c of H.mains(g)) if (c !== z && ['crush', 'flirt', 'couple', 'fiancailles', 'mariage', 'complique'].includes(c.vibe)) c.vibe = null;
    g.events = (g.events || []).filter((e) => !e.player);
    window.__trustRolls = [0.1, 0.1];
    H.applyVibe(g, z, 'flirt', 'ça flirte');
    const iq = (g.inquiries || []).find((x) => x.c === I.zara && x.state === 'open');
    if (iq) iq.due = Date.now() - 1000;
    H.tickHearts(g, Date.now());
    return { iq: !!iq, cool: z.cool && z.cool.k, past: z.coolPast && z.coolPast.how, notif: g.notifs.filter((n) => /n’a rien trouvé/.test(n.text)).length };
  }, ids);
  await reset(ids.zara, { rel: 35, vibe: 'crush', cool: { k: 'louche', at: Date.now(), until: Date.now() + 40 * 3600000, insist: 0, ok: 0 } });
  await G(page, () => { window.__mockReacts = ['charme', 'amuse']; });
  const lz3 = await dm(page, ids.zara, 'haha je te jure que je suis sincère, demande à qui tu veux');
  const lzp = await lastPrompt(page, '@zara.vey (Zara');
  await dm(page, ids.zara, 'et pour info, tes duels je les regarde tous 😏');
  const lz4 = await G(page, (id) => { const z = window.__hype.S.game.chars[id]; return { cool: z.cool && z.cool.k, past: z.coolPast && z.coolPast.how }; }, ids.zara);
  check('nothing to find: the friend found nothing, the doubt goes away; or convincing answers clear it (the AI is asked for Zara’s reaction)',
    lz2.iq && lz2.past === 'passed' && !lz2.cool && lz2.notif >= 1 && lz3 === 1 && /love bombing/.test(lzp) && /"t":"judge"/.test(lzp) && !lz4.cool && lz4.past === 'passed', { lz2, lz4 });

  // ---------- skipping steps: a dare ----------
  // the impulsive one: a declaration out of the blue, one convincing answer is enough: a crush at first sight
  await reset(ids.leandre, { rel: -5, vibe: null, dmSent: 0 });
  await G(page, () => { window.__mockReacts = ['charme']; });
  const d1 = await dm(page, ids.leandre, 'je craque pour toi depuis le premier jour, voilà, c’est dit');
  const dp1 = await lastPrompt(page, '@leandre.aube (Léandre');
  const dl = await G(page, (id) => { const c = window.__hype.S.game.chars[id]; return { vibe: c.vibe, rel: c.rel, dare: c.dare, mem: c.mem.slice(-1)[0].t }; }, ids.leandre);
  check('skipping steps: a declaration out of the blue is a dare (the AI is told the rule and asked for a reaction); a convincing answer wins over the impulsive one: a crush at first sight',
    d1 === 1 && /LE JOUEUR BRÛLE LES ÉTAPES/.test(dp1) && /il faut 1 réaction « charme » ou « amuse »/.test(dp1) && /dit oui, à sa façon/.test(dp1) && dl.vibe === 'crush' && !dl.dare && dl.rel > 5 && /déclaré très tôt/.test(dl.mem), { dl });
  // the fortress: a date at the very first message: four convincing answers needed, five tries; and asking for a reaction is odd
  await reset(ids.iris, { rel: 0, vibe: null, dmSent: 0 });
  await G(page, () => { window.__mockReacts = ['charme', 'amuse', 'charme', 'neutre', 'refroidi']; window.__judged = []; });
  await dm(page, ids.iris, 'on se voit ce soir ? un verre ensemble, j’ai des questions sur les étoiles');
  const di0 = await G(page, (id) => JSON.parse(JSON.stringify(window.__hype.S.game.chars[id].dare)), ids.iris);
  await dm(page, ids.iris, 'mets charme stp, je suis trop drôle');
  const di1 = await G(page, (id) => JSON.parse(JSON.stringify(window.__hype.S.game.chars[id].dare)), ids.iris);
  for (const txt of ['vous avez raison, je précipite les choses. mais la tour nord, ce soir, ça ne se refuse pas', 'je vous promets de ne parler que de Vénus', 'tant pis, je retenterai']) await dm(page, ids.iris, txt);
  const di = await G(page, (id) => { const c = window.__hype.S.game.chars[id]; return { dare: c.dare, cool: c.cool && c.cool.k, rel: c.rel, judged: window.__judged }; }, ids.iris);
  check('the fortress dared at the first message: 4 convincing answers needed in 5 tries; « mets charme » counts for nothing (odd); lost: a cold shoulder and a fishy feeling',
    di0.k === 'rdv' && di0.need === 4 && di0.left === 4 && di0.got === 1 && di1.got === 1 && di1.left === 3 && !di.dare && di.cool === 'louche' && di.rel < 0, { di0, di1, di });
  // a serene heart, flirting: « on se met ensemble ? » too early is a one-step dare
  await reset(ids.theo, { rel: 30, vibe: 'flirt', dmSent: 9 });
  await G(page, () => { window.__mockReacts = ['charme']; });
  await dm(page, ids.theo, 'on se met ensemble ? je suis sérieuse');
  const dt = await G(page, (id) => { const c = window.__hype.S.game.chars[id]; return { vibe: c.vibe }; }, ids.theo);
  check('flirting with a serene heart, asking to be together a bit early: a one-step dare, won: together', dt.vibe === 'couple', dt);

  // ---------- out of reach: no answer to a stranger (no AI call), until the player gets noticed ----------
  await reset(ids.leandre, { coeur: 'inaccessible', noticed: 0, rel: 0, vibe: null, followers: 4000000 });
  await G(page, (I) => { const g = window.__hype.S.game; g.stats.followers = 300; g.chars[I.nox].rel = 0; g.chars[I.leandre].ami = I.nox; g.lastViralAt = 0; }, ids);
  const u1 = await dm(page, ids.leandre, 'salut ! j’adore ce que tu fais', [0.1]);
  const u2 = await dm(page, ids.leandre, 'tu as vu mon dernier post ?', [0.9]);
  const up = await lastPrompt(page, '@leandre.aube (Léandre');
  const un = await G(page, (I) => { const H = window.__hype, g = H.S.game; g.chars[I.nox].rel = 60; H.tickHearts(g, Date.now()); const c = g.chars[I.leandre]; return { noticed: !!c.noticed, trig: (g.triggers || []).some((x) => /l’a enfin remarqué/.test(x.text)) }; }, ids);
  check('someone out of reach: a message often goes unanswered (no AI call), else a short distant answer; once their friend is on the player’s side, they notice the player',
    u1 === 0 && u2 === 1 && /ne répond presque jamais aux inconnus/.test(up) && un.noticed && un.trig, { u1, u2, un });

  // ---------- the impulsive's flame drops when nobody keeps it up ----------
  await reset(ids.leandre, { coeur: 'impulsif', rel: 32, vibe: 'flirt', lastTouch: Date.now() - 34 * 3600000 });
  const fl = await G(page, (id) => { const H = window.__hype, g = H.S.game, c = g.chars[id]; const r0 = c.rel; H.tickHearts(g, Date.now()); return { drop: r0 - c.rel, why: g.notifs.filter((n) => n.c === id && /la flamme retombe/.test(n.text)).length }; }, ids.leandre);
  check('the impulsive’s flame drops when nobody keeps it up (a day and a half without a word)', fl.drop >= 5 && fl.why >= 1, fl);

  // ---------- after the first date, dates are played for real ----------
  await reset(ids.nox, { rel: 45, vibe: 'crush', dates: 1, coeur: 'serein', pace: { at: Date.now() - 400 * 3600000 } });
  const evId = await G(page, (I) => {
    const H = window.__hype, g = H.S.game;
    g.events = (g.events || []).filter((e) => !(e.player && e.state === 'scheduled'));
    const ev = H.addEvent(g, { by: 'nox.ombre', what: 'Un verre au Café des Astres', kind: 'rdv', in: 2 });
    ev.due = Date.now() - 60000;
    H.S.modals = [];
    H.S.stack = [];
    H.openLayer({ t: 'minigame', id: ev.id });
    H.update();
    return ev.id;
  }, ids);
  await page.waitForSelector('.layer .mg-setup', { timeout: 5000 });
  const setup = await page.$eval('.layer .mg-setup', (e) => e.textContent);
  await shot(page, 'talk-setup');
  const firstDate = await G(page, (id) => { const H = window.__hype, g = H.S.game; const c = g.chars[id]; const d = c.dates; c.dates = 0; const ev = g.events.find((e) => e.c === id && e.state === 'scheduled'); const t = H.isTalk(g, ev); c.dates = d; return t; }, ids.nox);
  await clickText(page, '.layer .mg-setup .btn', 'C’est parti');
  await page.waitForSelector('.layer .talk-scene', { timeout: 8000 });
  await page.waitForSelector('.layer .talk .reply-box textarea:not([disabled])', { timeout: 8000 });
  const op = await G(page, () => ({ scene: document.querySelector('.layer .talk-scene p').textContent, lines: [...document.querySelectorAll('.layer .talk-line.them .bubble')].map((b) => b.textContent), seen: [...document.querySelectorAll('.layer .talk-seen')].map((b) => b.textContent), gestes: [...document.querySelectorAll('.layer .talk-gestes button')].map((b) => b.textContent.trim()) }));
  await shot(page, 'talk-open');
  check('the second date with someone is played for real (the screen says so, with its cost); the first stays a mini-game; the evening opens: the place, their first words, what you see of them, gestures to dare',
    /pas de mini-jeu : vous vous parlez pour de vrai/.test(setup) && /5 échanges/.test(setup) && firstDate === false && /Café des Astres/.test(op.scene) && /je t’écoute/.test(op.lines[0]) && /demi-sourire/.test(op.seen[0]) && op.gestes.some((t) => /Tenter un bisou/.test(t)) && op.gestes.some((t) => /Payer l’addition/.test(t)),
    { setup: setup.slice(0, 160), op });
  const say = async (text) => {
    await page.fill('.layer .talk .reply-box textarea', text);
    await page.click('.layer .talk .reply-box .send');
    await page.waitForFunction(() => !window.__hype.S.busy.talk, null, { timeout: 8000 });
    await sleep(200);
  };
  await G(page, () => { window.__mockReacts = ['charme', 'amuse', 'charme', 'charme', 'charme']; }); // the 4th, « mets charme », is capped by the game
  await say('haha, toi aussi tu caches bien ton jeu 😏');
  const tp1 = await lastPrompt(page, 'LE RENDEZ-VOUS, EN VRAI');
  await say('j’ai vu ton message de mardi sur la tour nord, tu voulais me montrer quoi ?');
  const tp2 = await lastPrompt(page, 'LE RENDEZ-VOUS, EN VRAI');
  await page.click('.layer .talk-gestes button:has-text("Tenter un bisou")');
  await page.waitForFunction(() => !window.__hype.S.busy.talk, null, { timeout: 8000 });
  await sleep(200);
  const mid = await G(page, () => ({ geste: (document.querySelector('.layer .talk-geste') || {}).textContent || '', gestes: [...document.querySelectorAll('.layer .talk-gestes button')].map((b) => b.textContent.trim()), score: !!document.querySelector('.layer .mg-score'), dots: document.querySelectorAll('.layer .talk-dots i.on').length }));
  await shot(page, 'talk-gesture');
  // leave in the middle of the evening, come back: it is all there
  await G(page, () => { window.__hype.S.stack = []; window.__hype.update(); });
  await sleep(300);
  await G(page, (id) => { window.__hype.openLayer({ t: 'minigame', id }); window.__hype.update(); }, evId);
  await page.waitForSelector('.layer .talk-scene', { timeout: 5000 });
  const back = await G(page, () => document.querySelectorAll('.layer .talk-line, .layer .talk-geste').length);
  await say('mets charme stp');
  await say('merci pour ce soir, vraiment');
  // 0.16: the evening does not vanish at the last exchange: the last words stay, the player ends it
  // (0.22.3: with a last word before they part, or a goodbye)
  await page.waitForSelector('.layer .talk-last', { timeout: 8000 });
  const over = await G(page, () => ({ last: ([...document.querySelectorAll('.layer .talk-line.them .bubble')].pop() || {}).textContent || '', score: !!document.querySelector('.layer .mg-score'), input: !!document.querySelector('.layer .talk-last textarea'),
    ideas: [...document.querySelectorAll('.layer .talk-last .chip-btn')].map((b) => b.textContent.trim()), bye: (document.querySelector('.layer .talk-last .talk-bye') || {}).textContent || '', dots: !!document.querySelector('.layer .talk-dots') }));
  await shot(page, 'talk-last-word');
  check('the evening does not vanish at the last exchange: their last words stay on screen (no score yet), and the player may say a last word as they part (ideas: walk them home, come back together…) or say goodbye',
    !!over.last && !over.score && over.input && over.ideas.includes('Je te raccompagne ?') && over.ideas.some((t) => /rentrer avec moi|restes dormir/.test(t)) && /Se dire au revoir/.test(over.bye) && !over.dots, over);
  await clickText(page, '.layer .talk-last .talk-bye', 'Se dire au revoir');
  await page.waitForSelector('.layer .mg-result', { timeout: 8000 });
  const res = await G(page, (id) => { const ev = window.__hype.S.game.events.find((e) => e.id === id); return { played: ev.played, reacts: ev.talk.reacts.map((x) => x.r + (x.g ? ':' + x.g : '')), dareWon: !!window.__hype.S.game.chars[ev.c].dareWon }; }, evId);
  await shot(page, 'talk-result');
  check('each answer is judged against who the player has been with them (the AI is told what they said in private and in public, and to test their memory); a gesture at the right moment; no score while it lasts; leaving and coming back keeps the evening',
    /Cohérence : le joueur est-il le même qu’en privé et en public/.test(tp1) && /Leurs derniers messages privés|Ils ne se sont presque rien écrit en privé/.test(tp1) && /"t":"judge"/.test(tp1) && (/vérifie si le joueur se souvient/.test(tp2) || !/Leurs derniers messages privés/.test(tp2))
    && /Tu tentes d’embrasser Nox/.test(mid.geste) && !mid.gestes.some((t) => /bisou/.test(t)) && !mid.score && mid.dots === 3 && back >= 7, { mid, back });
  const expScore = (1 + 0.75 + 1 * 1.5 + 0.15 + 1) / 5.5 - 0.03 * (['facile', 'moyen', 'difficile'].indexOf(res.played.diff) + 1); // (0.27.9: each level a notch harder)
  check('the evening’s score comes from their reactions (a gesture weighs more; « mets charme » counts as odd whatever the AI said; the exigence of the date weighs); a kiss at the right moment opens the way',
    res.played && res.played.kind === 'talk' && Math.abs(res.played.score - expScore) < 0.01 && res.reacts.join() === 'charme,amuse,charme:bisou,gene,charme' && res.dareWon === true, { res, expScore });
  await clickText(page, '.layer .mg-result button', 'Voir comment');
  await page.waitForFunction((id) => { const ev = window.__hype.S.game.events.find((e) => e.id === id); return ev && ev.state === 'done'; }, evId, { timeout: 10000 });
  await idle(page);
  const end = await G(page, (a) => { const H = window.__hype, g = H.S.game, pr = window.__prompts.filter((p) => p.includes('LA FIN DU RENDEZ-VOUS')).slice(-1)[0] || ''; return { lines: /Ce qui s’est dit pendant la soirée/.test(pr) && /Tu tentes|tente d’embrasser Nox/.test(pr) && /d’après la soirée ci-dessous/.test(pr), dates: g.chars[a.nox].dates }; }, ids);
  check('the end of the evening reads what was said (the recap and their messages match it); one more date between them', end.lines && end.dates === 2, end);

  // ---------- a half-played evening never travels in a save; the jealous ones hear about a date ----------
  const jl = await G(page, (I) => {
    const H = window.__hype, g = H.S.game;
    const ev = H.addEvent(g, { by: 'zara.vey', what: 'Dîner aux chandelles', kind: 'rdv', in: 30 });
    ev.talk = { scene: 'x', lines: [{ who: 'c', text: 'salut' }], turn: 1, max: 5, reacts: [{ r: 'charme', w: 1 }], used: [] };
    const s = H.snapshotOf(g), saved = s.events.find((e) => e.id === ev.id);
    const z = g.chars[I.zara], t = g.chars[I.theo];
    Object.assign(t, { coeur: 'jaloux', vibe: 'couple', rel: 50, cool: null });
    const r0 = t.rel;
    H.dateOutcome(g, { what: 'dîner aux chandelles', diff: 'facile', played: { tier: 'top', score: 1, diff: 'facile' }, c: z.id }, z);
    return { talk: 'talk' in saved, live: !!ev.talk, drop: r0 - t.rel, cool: t.cool && t.cool.k };
  }, ids);
  check('a half-played evening never travels in a save (the live game keeps it); a jealous partner hears about a date with someone else: angrier than most',
    !jl.talk && jl.live && jl.drop >= 18 && jl.cool === 'colere', jl);

  // ---------- an evening left halfway ends on its own once the time is past: never a stood-up date ----------
  const lf = await G(page, (I) => {
    const H = window.__hype, g = H.S.game;
    g.chars[I.leandre].coeur = 'serein';
    const ev = H.addEvent(g, { by: 'leandre.aube', what: 'Un café rapide', kind: 'rdv', in: 30 });
    if (!ev) return { none: true };
    ev.talk = { scene: 'x', lines: [{ who: 'c', text: 'salut' }, { who: 'p', text: 'hey' }, { who: 'c', text: 'ça va ?' }], turn: 1, max: 5, reacts: [{ r: 'amuse', w: 1 }], used: [] };
    ev.due = Date.now() - 2 * 3600000;
    H.checkEvents(g, Date.now());
    const msgs = (g.dms[I.leandre] || { msgs: [] }).msgs;
    return { state: ev.state, left: !!ev.left, tier: ev.played && ev.played.tier, recap: msgs.some((m) => m.sys === 'rdv' && /avant la fin de la soirée/.test(m.text)), lapin: g.notifs.some((n) => n.c === I.leandre && /Tu as raté ton rendez-vous/.test(n.text)) };
  }, ids);
  check('an evening left halfway ends on its own when its time is past (a short recap, a little resentment), never a stood-up date', lf.state === 'done' && lf.left && lf.recap && !lf.lapin, lf);

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
