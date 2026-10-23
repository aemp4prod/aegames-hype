// 0.32 (2), in Chromium against the built hype.html with the mocked Claude runtime: who they are, beyond their heart.
// - the draw before the AI writes them (a new world: the ten in order, imposed in its prompt; a newcomer): every heart
//   comes (the five new ones too), a challenge among the first five, about one in five extreme, open never for those
//   who cannot share;
// - a human pace: three times as long a step (a serene one a week to a couple, a cautious one two), the fast hearts
//   unchanged, the volage and the free ones fast up to a flirt and dodging a couple (« esquive »); the time between them
//   in every private prompt; the hot-and-cold's spells; the night workers' hours;
// - the way of fighting: in the roster and in private, its numbers (a quick temper, a peaceful one, a grudge), how a
//   « no » ignored gets worse; the worrier's rush (a burst of messages, a visit);
// - open: told, a second love is fine; not told, it hurts without ending it; a throuple needs both yeses;
// - the ones who follow the player, from 10 000 followers: written as newcomers with their secret, their signs in the
//   file, the hater soured (a stolen photo from an anonymous account, a word to a brand, which asks and may walk away),
//   called out with the right signs (banned / ashamed), never defamation, never the psychopath nor a traitor, nothing
//   on screen gives them away;
// - without window.__t32 (the suites written before), none of it.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v32b.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v32b');
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
async function shot(page, name) { await sleep(150); shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
const G = (page, fn, arg) => page.evaluate(fn, arg);
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.dms || b.story || b.groups || b.newchar); })) await sleep(150); await sleep(300); };
const until = async (page, fn, arg, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await G(page, fn, arg)) return true; await sleep(200); } return false; };
async function dismiss(page) { for (let k = 0; k < 8 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }

async function newPage(browser, viewport, t32 = true) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 700, colorScheme: 'light' });
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript((on) => { window.__hypeEasyGear = true; if (on) { window.__t32 = true; window.__drawTraits = true; } }, t32);
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
  await G(page, () => { window.__psyPick = 'zara.vey'; });
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
  await idle(page);
  await G(page, () => { const H = window.__hype, g = H.S.game; for (const h of ['leandre.aube', 'ada.quill']) Object.assign(H.charByHandle(g, h), { unlocked: true, asleep: undefined, rel: 30 }); H.update(); });
}
const clear = (page) => G(page, () => { const H = window.__hype; H.S.stack = []; H.S.modals.length = 0; H.S.toasts.length = 0; H.update(); });

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);

  // ---------- 1. the draw ----------
  const draw = await G(page, () => {
    const H = window.__hype;
    let def = 0, ext = 0, open = 0, bad = 0, n = 0, same = 0;
    const hearts = {}, clashes = {};
    for (let i = 0; i < 400; i++) {
      const T = H.drawTraits(10), cnt = {};
      if (T.slice(0, 5).some((x) => x.coeur === 'forteresse' || x.coeur === 'inaccessible')) def++;
      for (const x of T) {
        n++;
        hearts[x.coeur] = (hearts[x.coeur] || 0) + 1; clashes[x.clash] = (clashes[x.clash] || 0) + 1; cnt[x.coeur] = (cnt[x.coeur] || 0) + 1;
        if (x.extreme) ext++;
        if (x.ouvert) open++;
        if ((x.ouvert && H.NOT_OPEN.includes(x.coeur)) || (x.extreme === 'coeur' && !H.COEUR_EXT[x.coeur]) || (x.extreme === 'clash' && !H.CLASHES[x.clash].ext)) bad++;
      }
      if (Math.max(...Object.values(cnt)) >= 4) same++;
    }
    return { def, ext: Math.round(ext / n * 100), open: Math.round(open / n * 100), bad, same, hearts: Object.keys(hearts).sort().join(), clashes: Object.keys(clashes).sort().join() };
  });
  check('the draw: every heart comes (the five new ones too), every way of fighting, a challenge among the first five always, about one in five extreme, open now and then (never the jealous, the possessive, the fusional), the same heart four times in ten rarely',
    draw.hearts === 'anxieux,chaudfroid,forteresse,fusionnel,impulsif,inaccessible,jaloux,libre,possessif,prudent,serein,volage' && draw.clashes === 'boudeur,colerique,culpabilisant,dramatique,paisible,rancunier'
      && draw.def === 400 && draw.ext >= 14 && draw.ext <= 22 && draw.open >= 8 && draw.open <= 25 && draw.bad === 0 && draw.same <= 8, draw);

  // ---------- 2. a new world: the ten drawn before the AI writes them, imposed in its prompt ----------
  const world = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const wp = (window.__prompts || []).find((p) => p.includes('CRÉER L’UNIVERS')) || '';
    const m = /sont imposés, dans l’ordre des dix lignes : (.+?)\. Écris-les tels quels/.exec(wp);
    const items = m ? m[1].split(' ; ').map((x) => /^\d+\) cœur ([a-z-]+)( à l’extrême)?, en conflit (.+?)( à l’extrême)?(, ouvert·e au polyamour)?$/.exec(x)) : [];
    const ms = g.order.map((id) => g.chars[id]).filter((c) => c && c.kind === 'main' && !c.fixed).slice(0, 10);
    const word = (k) => (k === 'chaudfroid' ? 'chaud-froid' : k);
    const same = ms.filter((c, k) => items[k] && word(c.coeur) === items[k][1] && H.CLASHES[c.clash] && H.CLASHES[c.clash].label === items[k][3]).length;
    return { n: items.length, parsed: items.filter(Boolean).length, same, legend: /Les cœurs : .+ En conflit : /.test(wp), ami: /"ami" = le handle de son ou sa confident·e/.test(wp), conflit: wp.includes('"conflit":"…"'),
      all: H.mains(g, false).every((c) => H.CLASHES[c.clash]), ext: ms.filter((c) => c.extreme).length, open: ms.filter((c) => c.ouvert).length };
  });
  check('a new world: the ten drawn before the AI writes them (heart and way of fighting imposed, in the order of its lines, with what they mean), each character carries the one drawn for them; every character has a way of fighting',
    world.n === 10 && world.parsed === 10 && world.same === 10 && world.legend && world.ami && world.conflit && world.all, world);

  // a newcomer: the same, in its own prompt
  const nc = await G(page, () => {
    const H = window.__hype, g = H.S.game, plan = H.newcomerAge(g), p = H.promptNewChar(g, plan);
    return { has: !!(plan.coeur && plan.clash), line: p.includes('Son cœur et son caractère sont imposés : cœur'), json: p.includes(`"coeur":"${plan.coeur}","conflit":"${plan.clash}"`), temper: p.includes('trouble, inquiet') };
  });
  check('a newcomer too: their heart and way of fighting drawn and imposed in the prompt (in the line to write), the worrier among the temperaments', nc.has && nc.line && nc.json && nc.temper, nc);

  // ---------- 3. a human pace ----------
  const pace = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'ada.quill'), keep = { coeur: c.coeur, pace: c.pace, vibe: c.vibe }, t = Date.now(), HR = 3600000;
    const at = (coeur, v, h) => { c.coeur = coeur; c.pace = { at: t - h * HR, v: v === 'couple' ? 'flirt' : null }; return H.tooFast(c, v, t); };
    const out = {
      serein: [at('serein', 'flirt', 50), at('serein', 'flirt', 56), at('serein', 'couple', 100), at('serein', 'couple', 110)],
      prudent: [at('prudent', 'couple', 210), at('prudent', 'couple', 220)],
      fast: ['impulsif', 'jaloux', 'fusionnel', 'possessif'].map((k) => at(k, 'couple', 1)),
      volage: [at('volage', 'flirt', 1), at('volage', 'couple', 400), at('volage', 'couple', 440)],
      libre: [at('libre', 'flirt', 1), at('libre', 'couple', 1000), at('libre', 'couple', 1090)],
      cools: ['volage', 'libre', 'chaudfroid'].map((k) => { c.coeur = k; return H.coolOf(c); }),
      esquive: !!(H.COOLS.esquive && H.COOLS.esquive.ai('Ada', 'elle').includes('ne veut pas de couple')),
    };
    Object.assign(c, keep);
    return out;
  });
  check('a human pace: three times as long a step (a serene one: a flirt after 54 h, a couple 108 h later, about a week in all; a cautious one 216 h, about two weeks), the fast hearts as fast as ever (the impulsive, the jealous, the fusional, the possessive)',
    pace.serein.join() === 'true,false,true,false' && pace.prudent.join() === 'true,false' && pace.fast.every((x) => x === false), pace);
  check('the volage and the free ones: a flirt at once, a couple much later (18 days, 45 for the free one); asked too soon, they dodge (« esquive »); the hot-and-cold steps away',
    pace.volage.join() === 'false,true,false' && pace.libre.join() === 'false,true,false' && pace.cools.join() === 'esquive,esquive,ghost' && pace.esquive, pace);

  // the time between them, in private; their way of fighting there and in the roster
  const pr = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin'), keep = { clash: c.clash, extreme: c.extreme, firstTalk: c.firstTalk, dates: c.dates };
    c.clash = 'colerique'; c.extreme = 'clash'; c.firstTalk = Date.now() - 4 * 86400000; c.dates = 2;
    // what the player did with him these last days: three evenings, five messages today, one a week ago and more
    const t = Date.now(), cv = g.dms[c.id] || (g.dms[c.id] = { msgs: [], readAt: 0 }), n0 = cv.msgs.length, e0 = g.events.length;
    for (const d of [1, 2, 3]) g.events.push({ id: 'evcad' + d, c: c.id, player: true, state: 'done', what: 'un verre', due: t - d * 86400000, played: { at: t - d * 86400000, score: 0.7 } });
    g.events.push({ id: 'evcad9', c: c.id, player: true, state: 'done', what: 'un verre', due: t - 9 * 86400000, played: { at: t - 9 * 86400000, score: 0.7 } });
    for (let k = 0; k < 5; k++) cv.msgs.push({ id: 'mcad' + k, me: true, text: 'coucou ' + k, ts: t - (k + 1) * 600000, at: t - (k + 1) * 600000 });
    cv.msgs.push({ id: 'mcadold', me: true, text: 'vieux', ts: t - 8 * 86400000, at: t - 8 * 86400000 });
    const p = H.promptDM(g, c, [], 'salut toi');
    g.events.splice(e0); cv.msgs.splice(n0);
    const pub = H.ctxText(g, { kind: 'public', focus: new Set([c.id]) });
    const out = { known: /Le temps entre eux : ils se parlent depuis 4 jours \(2 rendez-vous(, [^)]*)?\)/.test(p), slow: p.includes('pas en quelques heures') && p.includes('pas la quantité'),
      rhythm: p.includes('Leur rythme ces 7 derniers jours : 3 rendez-vous, 5 messages du joueur (dont 5 aujourd’hui)'), normal: p.includes('La normale à ce stade : un ou deux rendez-vous par semaine (un seul au tout début) et un ou quelques messages par jour') && p.includes('Bien plus que la normale, au début, ça peut paraître intense, voire bizarre (avec le temps, on s’y habitue) ; bien moins, ou d’un coup moins qu’à leur habitude, ça peut ressembler à du désintérêt'),
      clash: p.includes('En conflit, Théo est colérique à l’extrême'), roster: /@theo\.marlin — [^\n]* · en conflit : colérique \(à l’extrême\)/.test(pub), legend: /En conflit \(sur chaque fiche\) : .*colérique : s’emporte vite/.test(pub) };
    Object.assign(c, keep);
    return out;
  });
  // their habit: a high rhythm that lasts becomes theirs; a sudden drop is noticed
  const hab = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin'), keep = { firstTalk: c.firstTalk }, t = Date.now(), D = 86400000, e0 = g.events.length;
    const ev = (d) => g.events.push({ id: 'evh' + d + '_' + Math.random(), c: c.id, player: true, state: 'done', what: 'un verre', due: t - d * D, played: { at: t - d * D, score: 0.7 } });
    c.firstTalk = t - 30 * D;
    for (const d of [8, 9, 10, 12, 15, 16, 18, 19, 22, 23, 25, 27, 1, 2, 3, 5]) ev(d); // four a week for four weeks
    const high = H.rhythmLine(g, c, t);
    g.events.splice(e0);
    for (const d of [8, 10, 13, 15, 17, 20, 22, 24, 27]) ev(d); // three a week, then none this week
    const drop = H.rhythmLine(g, c, t);
    g.events.splice(e0);
    c.firstTalk = t - 3 * D;
    const fresh = H.rhythmLine(g, c, t);
    Object.assign(c, keep);
    return { used: high.includes('Leur habitude, les 3 semaines d’avant : environ 4 rendez-vous') && high.includes('s’y est habitué·e, ce n’est plus intense ni bizarre'),
      drop: drop.includes('environ 3 rendez-vous') && drop.includes('Cette semaine, le joueur le voit nettement moins que d’habitude : Théo le remarque et commence à trouver ça bizarre'),
      fresh: !fresh.includes('Leur habitude') && fresh.includes('un seul au tout début') };
  });
  check('their habit: a rhythm above the norm that lasts weeks becomes theirs (no longer intense nor odd); a sudden drop from it is noticed (« commence à trouver ça bizarre »); a new acquaintance has no habit yet', hab.used && hab.drop && hab.fresh, hab);
  check('in private, the time between them (four days, two dates), their rhythm these seven days (three evenings, five messages today) against what is normal there (one or two dates a week, a message or a few a day: far more seems intense, far less cold, their heart decides); their way of fighting there (to the extreme), and in the public roster',
    Object.values(pr).every(Boolean), pr);

  // the hot-and-cold's spells; the night workers
  const misc = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'ada.quill'), keep = { coeur: c.coeur, role: c.role, personality: c.personality, bio: c.bio };
    c.coeur = 'chaudfroid';
    const t = Date.now(), spells = [];
    for (let h = 0; h < 72; h += 6) spells.push(H.cfHot(c, t + h * 3600000) ? 'h' : 'c');
    const lines = H.heartLines(g, c).join(' ');
    c.coeur = keep.coeur;
    c.role = 'DJ résidente du Club Nova'; c.personality = 'mixe tous les week-ends'; c.bio = 'platines et néons';
    const dj = H.rythmeOf(g, c);
    Object.assign(c, keep);
    return { spells: spells.join(''), both: spells.includes('h') && spells.includes('c'), phase: /phase (chaude|froide)/.test(lines), djBed: dj.bed, djWake: dj.wake };
  });
  check('the hot-and-cold: warm spells and cold ones over three days, said to their AI; a DJ who mixes goes to bed at dawn (4 h – 5 h 30) and gets up at noon',
    misc.both && misc.phase && misc.djBed >= 4 && misc.djBed <= 6 && misc.djWake >= 11.5 && misc.djWake <= 13.5, misc);

  // ---------- 4. the way of fighting: its numbers, a « no » ignored ----------
  const cl = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'leandre.aube'), keep = { clash: c.clash, extreme: c.extreme, grudge: c.grudge };
    const sc = (k, d, ext) => { c.clash = k; c.extreme = ext ? 'clash' : undefined; delete c.grudge; return H.traitScale(c, d, 'test'); };
    const out = { col: sc('colerique', -8), colX: sc('colerique', -8, true), calm: sc('paisible', -10), calmUp: sc('paisible', 10) };
    c.clash = 'rancunier'; delete c.extreme; delete c.grudge;
    H.traitScale(c, -6, 'tu l’as ridiculisé·e en live');
    out.grudge = c.grudge && c.grudge.why;
    out.after = H.traitScale(c, 10, 'un geste');
    out.line = H.traitLines(g, c).some((x) => x.includes('n’a pas oublié : « tu l’as ridiculisé·e en live »'));
    Object.assign(c, keep);
    if (!keep.grudge) delete c.grudge;
    return out;
  });
  check('the numbers of a way of fighting: a quick temper takes a blow harder (−8 → −10, −11 to the extreme), a peaceful one softer (−10 → −7) and warms up quicker; a grudge kept for a week (said to their AI), the next good moves smaller (+10 → +6)',
    cl.col === -10 && cl.colX === -11 && cl.calm === -7 && cl.calmUp === 11 && cl.grudge === 'tu l’as ridiculisé·e en live' && cl.after === 6 && cl.line, cl);
  const esc = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'leandre.aube'), keep = { clash: c.clash, cool: c.cool, rel: c.rel, temper: c.temper, coeur: c.coeur };
    const go = (k) => { c.clash = k; c.temper = 'detache'; c.coeur = 'serein'; c.cool = { k: 'frein', at: Date.now(), until: Date.now() + 3600000, insist: 0, ok: 0 }; const n = window.__hype.activeTriggers(g).length; H.escalate(g, c); return { k: c.cool && c.cool.k, shown: H.activeTriggers(g).slice(n).some((x) => /l’affiche en public/.test(x.text)) }; };
    const out = { drama: go('dramatique'), sulk: go('boudeur'), calm: go('paisible'), angry: go('colerique') };
    Object.assign(c, keep);
    return out;
  });
  check('a « no » ignored gets worse their way: the dramatic call the player out in public (then block), the sulker and the peaceful go quiet, the quick-tempered get angry',
    esc.drama.k === 'bloque' && esc.drama.shown && esc.sulk.k === 'ghost' && esc.calm.k === 'ghost' && esc.angry.k === 'colere', esc);

  // ---------- 5. the worrier ----------
  const wo = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'ada.quill'), keep = c.temper;
    c.temper = 'inquiet';
    const n = H.activeTriggers(g).length;
    window.__standRolls = Array(400).fill(0.5); // (nobody skips the wave)
    H.ripple(g, 'down', -2, 1);
    window.__standRolls = null;
    const trig = H.activeTriggers(g).slice(n).map((x) => x.text).join(' | ');
    const dms = [1, 2, 3, 4].map(() => H.worryDM(g, c.handle));
    window.__visitOffer = true;
    const vl = H.visitLine(g) || '';
    window.__visitOffer = false;
    const label = H.TEMPERS.inquiet.label.join('/');
    c.temper = keep;
    return { why: g.worry && g.worry.why, rush: /plusieurs messages d’affilée/.test(trig), beat: /s’inquiète énormément pour lui/.test(trig), dms: dms.join(), visit: vl.includes('qui s’inquiète pour tout, peut passer voir si le joueur va bien'), label };
  });
  check('the worrier: a scandal (or a stolen photo, a betrayal, a break-up) and they rush: a burst of private messages (three past the usual limit), a visit offered to their AI first',
    wo.why === 'il est en plein scandale' && wo.rush && wo.dms === 'true,true,true,false' && wo.visit && wo.label === 'Inquiet/Inquiète/Inquiet·ète', wo);

  // ---------- 6. open, a throuple ----------
  const op = await G(page, () => {
    const H = window.__hype, g = H.S.game, A = H.charByHandle(g, 'theo.marlin'), B = H.charByHandle(g, 'leandre.aube'), C = H.charByHandle(g, 'ada.quill');
    const keep = [A, B, C].map((x) => ({ x, vibe: x.vibe, coeur: x.coeur, ouvert: x.ouvert, okWith: x.okWith, rel: x.rel, mem: (x.mem || []).slice(), clash: x.clash, extreme: x.extreme }));
    A.clash = 'boudeur'; delete A.extreme; // (a blow as it is)
    A.coeur = B.coeur = 'serein'; A.ouvert = B.ouvert = true; A.vibe = 'couple'; B.vibe = 'flirt'; C.vibe = null; C.ouvert = false; C.coeur = 'jaloux';
    const lines = H.openOutLines(g, A).join(' ');
    H.applyOpenLine(g, A, { t: 'ouvert', with: B.handle });
    const ok = H.okWith(g, A, B);
    H.officialize(g, B, 'couple');
    const told = { vibe: A.vibe, mem: (A.mem || []).some((m) => /je le savais, ça me va/.test(m.t)) };
    // open, not told
    delete A.okWith; A.vibe = 'couple'; const r0 = A.rel;
    H.officialize(g, B, 'couple');
    const untold = { vibe: A.vibe, d: A.rel - r0 };
    // not open: as before
    C.vibe = 'couple';
    H.officialize(g, B, 'couple');
    const closed = C.vibe;
    // the throuple: both yeses
    A.vibe = 'couple'; B.vibe = 'couple';
    H.applyOpenLine(g, A, { t: 'trouple', with: B.handle });
    const half = !!H.troupleOf(g, A, B);
    H.applyOpenLine(g, B, { t: 'trouple', with: A.handle });
    const both = !!H.troupleOf(g, A, B), notif = g.notifs.slice(-6).some((n) => /vous formez un trouple/.test(n.text));
    const line = H.openLine(g, A);
    for (const k of keep) Object.assign(k.x, { vibe: k.vibe, coeur: k.coeur, ouvert: k.ouvert, okWith: k.okWith, rel: k.rel, mem: k.mem, clash: k.clash, extreme: k.extreme });
    g.trouples = [];
    return { lines: lines.includes('{"t":"ouvert","with":"handle"}') && lines.includes('{"t":"trouple","with":"handle"}'), ok, told, untold, closed, half, both, notif, line: /en trouple avec le joueur et @leandre\.aube/.test(line) };
  });
  check('open: the lines their AI may add; told (« ouvert »), the player seen with someone else is fine (no betrayal); not told, it hurts (−10) without ending it; someone not open takes it as before (betrayed)',
    op.lines && op.ok && op.told.vibe === 'couple' && op.told.mem && op.untold.vibe === 'couple' && op.untold.d <= -9 && op.untold.d >= -11 && ['ex', 'complique'].includes(op.closed), op);
  check('a throuple: one yes is not enough, both make it (« vous formez un trouple »), and their AI knows', !op.half && op.both && op.notif && op.line, op);

  // ---------- 7. the ones who follow the player ----------
  await clear(page);
  await G(page, () => {
    window.__stalkPlan = { doux: 0, hater: 0 };
    window.__mockOnce = (window.__mockOnce || []).concat(
      { has: 'Pas méchant·e : maladroit·e', lines: [{ t: 'char', name: 'Noé Lazare', handle: 'noe.lazare', emoji: '🌻', g: 'm', role: 'Apprenti herboriste', bio: 'des plantes, du thé, et beaucoup trop de playlists', personality: 'doux, attentionné, un peu timide', voice: 'phrases douces, beaucoup de « haha »', followers: 800, rel: 12, coeur: 'fusionnel', conflit: 'paisible' }, { t: 'post', by: 'noe.lazare', text: 'première infusion de la saison 🍵' }] },
      { has: 'l’admiration peut tourner à la rancœur', lines: [{ t: 'char', name: 'Inès Morel', handle: 'ines.morel', emoji: '📷', g: 'f', role: 'Photographe de l’académie', bio: 'je capture ce que vous ne voyez pas', personality: 'intense, passionnée, rancunière', voice: 'sèche, précise', followers: 2400, rel: 5, coeur: 'possessif', conflit: 'rancunier' }, { t: 'post', by: 'ines.morel', text: 'lumière parfaite ce matin sur la cour.' }] });
    const H = window.__hype; H.S.game.stats.followers = 12500; H.update();
  });
  const came = await until(page, () => { const g = window.__hype.S.game; return !!(g.stalk && g.stalk.list && g.stalk.list.length >= 2 && !window.__hype.S.busy.newchar); }, null, 40000);
  const st = await G(page, () => {
    const H = window.__hype, g = H.S.game, L = (g.stalk && g.stalk.list) || [];
    const by = (k) => { const X = L.find((x) => x.kind === k); const c = X && g.chars[X.c]; return c ? { h: c.handle, coeur: c.coeur, clash: c.clash, follows: c.followsYou } : null; };
    const born = (window.__prompts || []).filter((p) => p.includes('suit le joueur depuis ses débuts'));
    return { n: L.length, doux: by('doux'), hater: by('hater'), born: born.length, normal: born.every((p) => p.includes('rien dans sa bio ni dans son premier post ne le trahit')) };
  });
  check('past 10 000 followers, the ones who follow the player come, as newcomers the AI writes with their secret (their public face as anyone’s): the admirer (a fusional or anxious heart), the hater (possessive, jealous or fusional); they follow the player already',
    came && st.n === 2 && st.doux && st.doux.h === 'noe.lazare' && ['fusionnel', 'anxieux'].includes(st.doux.coeur) && st.hater && st.hater.h === 'ines.morel' && ['possessif', 'jaloux', 'fusionnel'].includes(st.hater.coeur) && st.doux.follows && st.hater.follows && st.born >= 2 && st.normal, st);

  // their part, in private; a sign from a message goes to the file
  await G(page, () => { window.__mockOnce = (window.__mockOnce || []).concat({ has: 'SUIT LE JOUEUR DE TROP PRÈS', add: true, lines: [{ t: 'suivi', text: 'savait que tu étais au café ce matin' }] }); });
  const priv = await G(page, async () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'noe.lazare');
    const p = H.promptDM(g, c, [], 'coucou');
    H.addIncomingDM(g, c, 'salut ! j’adore ce que tu fais', Date.now() - 60000); // (a conversation going on: their answer comes at once)
    await H.sendDM(c.id, 'coucou toi');
    return { secret: p.includes('## SECRET DU JEU : NOÉ SUIT LE JOUEUR DE TROP PRÈS') && p.includes('Pas méchant·e'), line: p.includes('{"t":"suivi","text":'), notPsy: !p.includes('PSYCHOPATHE DE CETTE PARTIE') };
  });
  await idle(page);
  const file = await G(page, () => { const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'noe.lazare'); const k = (g.clues || []).filter((x) => x.c === c.id && x.stalk); return { n: k.length, text: k[0] && k[0].text, notif: g.notifs.some((n) => n.text === 'Indice noté sur Noé Lazare : savait que tu étais au café ce matin') }; });
  check('in private, their part (their secret, never the psychopath’s); a sign their AI slips (« suivi ») goes to the player’s file on them, told like any clue', priv.secret && priv.line && priv.notPsy && file.n === 1 && file.text === 'savait que tu étais au café ce matin' && file.notif, { priv, file });

  // the hater sours: their means in the refreshes, a stolen photo, a word to a brand
  const sour = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'ines.morel'), X = H.stalkerOf(g, c), t = Date.now();
    X.at = t - 4 * 86400000; X.signs = 2;
    const stage = H.stalkStage(g, X, t);
    const d = H.makeOffer(g, {});
    const L = H.stalkPublicLines(g).join(' ');
    return { stage, photo: L.includes('{"t":"vole","by":"ines.morel"'), sabo: !!d && L.includes('{"t":"sabote","by":"ines.morel"'), brand: d && d.brand, never: L.includes('jamais intime ni dénudée'), doux: /@noe\.lazare suit le joueur de trop près \(un·e admirateur·rice obsessionnel·le, inoffensif·ve\)/.test(L) };
  });
  check('the hater sours (days, signs, the player not giving back): their AI may now post a stolen photo (never intimate) or write to a brand; the admirer stays harmless',
    sour.stage === 2 && sour.photo && sour.sabo && sour.never && sour.doux, sour);
  const harm = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'ines.morel'), X = H.stalkerOf(g, c), fx = [];
    H.applyStalkLine(g, { t: 'vole', by: 'ines.morel', compte: 'yeux.partout', text: 'devinez qui fait ses courses en pyjama 👀', photo: 'Mila au supermarché, capuche sur la tête, un panier à la main' }, fx);
    H.applyStalkLine(g, { t: 'vole', by: 'ines.morel', compte: 'yeux.partout', text: 'encore elle', photo: 'Mila devant chez elle' }, fx); // (the same day: one only)
    H.applyStalkLine(g, { t: 'sabote', by: 'ines.morel', brand: sourBrand(), text: 'elle se moque de vos produits en privé' }, fx);
    function sourBrand() { const d = g.deals.find((x) => x.state === 'offer'); return d ? d.brand : ''; }
    for (const f of fx) f();
    const posts = g.posts.filter((p) => p.stolen);
    const d = g.deals.find((x) => x.doubt);
    const bc = d && g.chars[d.contact];
    const conv = bc ? ((g.dms[bc.id] || {}).msgs || []) : [];
    const brandLines = bc ? H.dmCareerLines(g, bc).join(' ') : '';
    return { posts: posts.length, by: posts[0] && H.author(g, posts[0].a).handle, photo: posts[0] && posts[0].photo && posts[0].photo.desc, burner: X.burner, notif: g.notifs.some((n) => /Un compte anonyme \(@yeux\.partout\) a posté une photo de toi/.test(n.text)),
      doubt: !!d, asked: conv.some((m) => /On a reçu un message anonyme à votre sujet/.test(m.text)), told: brandLines.includes('a reçu un message anonyme sur le joueur : « elle se moque de vos produits en privé »') && brandLines.includes('{"t":"deal","walk":true}'), id: d && d.id, contact: bc && bc.id };
  });
  check('a stolen photo, from an anonymous account (one a day at most): in the feed with what it shows, the player told; a word to a brand: they ask the player in private, and their AI knows what it was told and may walk away',
    harm.posts === 1 && harm.by === 'yeux.partout' && /supermarché/.test(harm.photo || '') && harm.burner === 'yeux.partout' && harm.notif && harm.doubt && harm.asked && harm.told, harm);
  const walk = await G(page, ({ id, contact }) => { const H = window.__hype, g = H.S.game, d = g.deals.find((x) => x.id === id); H.applyDealLine(g, g.chars[contact], { walk: true }); return { state: d.state, walked: !!(d.doubt && d.doubt.walked) }; }, harm);
  check('not reassured, the brand walks away (an offer withdrawn)', walk.state === 'withdrawn' && walk.walked, walk);

  // never the psychopath, never a traitor; they come by; nothing on screen gives them away
  const apart = await G(page, () => {
    const H = window.__hype, g = H.S.game, keep = g.psy, doux = H.charByHandle(g, 'noe.lazare'), hater = H.charByHandle(g, 'ines.morel');
    let psyHit = 0;
    const pk = window.__psyPick;
    window.__psyPick = null;
    for (let i = 0; i < 60; i++) { g.psy = null; H.drawPsy(g); if (g.psy && [doux.id, hater.id].includes(g.psy.c)) psyHit++; }
    window.__psyPick = pk;
    g.psy = keep;
    const trait = H.maybeTraitor(g, doux, Date.now(), { p: 1 });
    const r0 = hater.rel; hater.rel = 3; hater.visitAt = 0;
    const cand = H.visitCands(g).some((c) => c === hater);
    hater.rel = r0;
    return { psyHit, trait: trait === null, cand };
  });
  await G(page, () => { const H = window.__hype; H.openChar(H.charByHandle(H.S.game, 'noe.lazare').id); });
  await sleep(700);
  const screen = await G(page, () => { const L = document.querySelectorAll('.layer'), t = L.length ? L[L.length - 1].innerText : ''; const m = /.{0,50}(SECRET DU JEU|[Ss]uit le joueur|[Ss]uis le joueur|[Ss]talk|[Oo]bsess).{0,50}/.exec(t); return { secret: !!m, what: m ? m[0] : '', name: t.includes('Noé Lazare') }; });
  await shot(page, 'admirer-profile');
  await clear(page);
  check('never the psychopath nor a traitor; they may come by even at a low relation; their profile shows nothing of it', apart.psyHit === 0 && apart.trait && apart.cand && !screen.secret && screen.name, { apart, screen });

  // called out in public
  const acc = await G(page, () => {
    const H = window.__hype, g = H.S.game, hater = H.charByHandle(g, 'ines.morel'), doux = H.charByHandle(g, 'noe.lazare'), theo = H.charByHandle(g, 'theo.marlin');
    const truth = H.psyAccuseLines(g, hater, 'Inès me harcèle et poste mes photos', []).join(' ');
    const truthDoux = H.psyAccuseLines(g, doux, 'Noé me suit partout', []).join(' ');
    const n0 = g.notifs.length;
    const ctx = (c, cred, said, cited = []) => ({ g, accuse: c, post: { text: said, res: { cred } }, citedIds: cited });
    const weak = H.psyAccusation(ctx(hater, 3, 'Inès me harcèle'));
    const weakX = !!H.stalkerOf(g, hater), weakLaw = g.notifs.slice(n0).some((n) => /diffamation/.test(n.text));
    const hk = (g.clues || []).find((k) => k.c === doux.id && k.stalk);
    const strong = H.psyAccusation(ctx(hater, 9, 'Inès me harcèle depuis des semaines, c’est elle derrière @yeux.partout'));
    const out = { truth: truth.includes('suit réellement le joueur de trop près') && truth.includes('les photos volées du compte @yeux.partout'), truthDoux: truthDoux.includes('n’a jamais voulu lui nuire'),
      weak, weakX, weakLaw, strong, banned: !!(hater.cut && hater.banned), gone: !H.stalkerOf(g, hater), media: g.posts.some((p) => /c’était @ines\.morel, derrière le compte @yeux\.partout/.test(p.text)),
      told: g.notifs.some((n) => /Tu as démasqué Inès Morel/.test(n.text)) };
    out.doux = H.psyAccusation(ctx(doux, 7, 'Noé me suit partout, il en sait beaucoup trop', hk ? [hk.id] : []));
    out.ashamed = !!(doux.cool && doux.cool.k === 'ghost') && g.notifs.some((n) => /Noé Lazare te suivait vraiment partout/.test(n.text));
    const n1 = g.notifs.length;
    H.psyAccusation(ctx(theo, 1, 'Théo me harcèle, c’est un stalker'));
    out.defam = g.notifs.slice(n1).some((n) => /porte plainte pour diffamation/.test(n.text));
    return out;
  });
  check('called out: the truth is told to the AI that judges (the hater: their photos; the admirer: harmless); a weak call-out is no defamation (it is true) and unmasks nobody',
    acc.truth && acc.truthDoux && acc.weak === false && acc.weakX && !acc.weakLaw, acc);
  check('with the right signs, the hater falls (banned, charged, the press, the player told); the admirer is ashamed and steps back; calling someone else a stalker stays defamation',
    acc.strong === true && acc.banned && acc.gone && acc.media && acc.told && acc.doux === true && acc.ashamed && acc.defam, acc);

  // ---------- 8. without window.__t32: as before ----------
  const { page: od } = await newPage(browser, { width: 1280, height: 900 }, false);
  await newGame(od);
  const old = await G(od, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin'), plan = H.newcomerAge(g);
    c.clash = 'colerique';
    const sc = H.traitScale(c, -8);
    const keep = { coeur: c.coeur, pace: c.pace };
    c.coeur = 'serein'; c.pace = { at: Date.now() - 40 * 3600000, v: 'flirt' };
    const fast = H.tooFast(c, 'couple');
    Object.assign(c, keep);
    g.stats.followers = 20000;
    H.tickStalkers(g);
    const p = H.promptDM(g, c, [], 'salut');
    return { plan: !plan.coeur, sc, fast, stalk: !(g.stalk && g.stalk.plan && Object.keys(g.stalk.plan).length), prompt: !p.includes('Le temps entre eux') && !p.includes('En conflit,') };
  });
  check('the suites written before: no traits drawn, the old numbers and pace, nobody who follows the player, the old prompts', old.plan && old.sc === -8 && old.fast === false && old.stalk && old.prompt, old);

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
