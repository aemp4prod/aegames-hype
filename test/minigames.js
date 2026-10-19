// 0.10.2 end to end, in Chromium against the built hype.html with the mocked Claude runtime: a mini-game (a shoot or a
// date) keeps its progress with it. Leaving it and opening it again goes on where it stood (no more starting over at
// question 1 with the answers known); the clock does not wait; a game left finished, or whose clock ran out meanwhile,
// is over on its own; saves and exports never carry a mini-game half played.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/minigames.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-minigames');
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
// the mini-game on screen: open it (like the release card or the date would), close it (« Retour »)
const open = async (page, id) => { await dismiss(page); await G(page, (x) => { const H = window.__hype; H.S.stack = []; H.openLayer({ t: 'minigame', id: x }); H.update(false); }, id); await sleep(400); };
const back = async (page) => { await page.click('.layer-head .iconbtn'); await sleep(300); };
const runOf = (page, id) => G(page, (x) => { const g = window.__hype.S.game, r = (g.releases || []).find((y) => y.id === x) || (g.events || []).find((y) => y.id === x); return r ? { run: r.game && r.game.run ? JSON.parse(JSON.stringify(r.game.run)) : null, played: r.played || null, game: !!r.game } : null; }, id);
const top = (page) => page.$eval('.layer .mg-top .mono', (e) => e.textContent).catch(() => '');

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
  await page.locator('.cast-card.pick', { hasText: 'Théo' }).click();
  await page.click('.cast-cta button');
  await page.waitForSelector('.post');
  await sleep(1200);
  await dismiss(page);

  // ---------- a shoot (keep or throw): an answer, another, leave in the middle, come back ----------
  const rid = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const r = H.addRelease(g, { topic: 'Les coulisses du conseil', in: 60, what: 'vidéo' });
    r.game = { kind: 'tri', title: 'Le tri du tournage', intro: 'Garde ce qui sert ta vidéo.', diff: 'moyen', items: ['garder 1', 'jeter 2', 'garder 3', 'jeter 4', 'garder 5', 'jeter 6'].map((t) => ({ text: 'Élément à ' + t, good: /garder/.test(t), why: 'parce que' })) };
    H.update();
    return r.id;
  });
  await open(page, rid);
  await page.waitForSelector('.layer .mg-intro');
  await clickText(page, '.layer .mg-intro button', 'parti');
  const answerTri = async (right) => {
    await page.waitForSelector('.layer .mg-actions .btn-hot:not([disabled])', { timeout: 8000 });
    const t = await page.$eval('.layer .mg-card p', (e) => e.textContent);
    const keepIt = /garder/.test(t) === right; // the right answer, or the wrong one on purpose
    await page.click(keepIt ? '.layer .mg-actions .btn-hot' : '.layer .mg-actions .btn-ghost');
    return t;
  };
  const a1 = await answerTri(false); // wrong on purpose: the answer shows… and could be learnt
  await sleep(1350);
  const a2 = await answerTri(true);
  await sleep(1350);
  await page.waitForSelector('.layer .mg-actions .btn-hot:not([disabled])', { timeout: 8000 });
  const third = await page.$eval('.layer .mg-card p', (e) => e.textContent);
  await shot(page, 'tri-third-item');
  await back(page); // leaves in the middle of the third one
  const left1 = await runOf(page, rid);
  await open(page, rid);
  await page.waitForSelector('.layer .mg-play', { timeout: 5000 });
  // something happens on the network meanwhile: no toast over the game being played (it hid the question), the notification stays
  await G(page, () => { const H = window.__hype, g = H.S.game; H.S.toasts = []; g.notifs.push({ id: 'n-test', k: 'follow', at: Date.now() + 300, text: 'Toast pendant le jeu' }); H.update(false); });
  await sleep(1500);
  const back1 = await G(page, () => ({ intro: !!document.querySelector('.layer .mg-intro'), card: (document.querySelector('.layer .mg-card p') || {}).textContent || '', toast: [...document.querySelectorAll('.toast')].map((x) => x.textContent).join(' | '), notif: window.__hype.S.game.notifs.some((n) => n.id === 'n-test') }));
  const n1 = await top(page);
  await shot(page, 'tri-resumed');
  check('a shoot left in the middle and opened again: no intro, the same item, 3/6, the first two answers kept (one right, one wrong); no toast over it',
    !back1.intro && back1.card === third && n1 === '3/6' && left1.run && left1.run.on && left1.run.k === 2 && left1.run.right === 1 && left1.run.order.length === 6 && !left1.played && !/Toast pendant le jeu/.test(back1.toast) && back1.notif,
    { back1, n1, left1: left1 && left1.run, a1, a2 });
  // away again, and the clock ran out meanwhile: it is over, with what had been answered
  await back(page);
  await G(page, (x) => { const r = window.__hype.S.game.releases.find((y) => y.id === x); r.game.run.end = Date.now() - 5000; }, rid);
  await sleep(1800);
  const over1 = await runOf(page, rid);
  check('the clock does not wait: time up while away, the shoot is over with what was answered (1 out of 6), without opening it again',
    over1.played && Math.abs(over1.played.score - 1 / 6) < 1e-6 && over1.played.tier === 'flop', over1.played);

  // ---------- a date (quiz): leave while the answer shows, then while a question is on screen ----------
  const people = await G(page, () => window.__hype.mains(window.__hype.S.game).filter((c) => c.unlocked).map((c) => c.handle));
  const mkEvent = (handle, game, mins) => G(page, (a) => {
    const H = window.__hype, g = H.S.game;
    const ev = H.addEvent(g, { by: a.handle, what: 'Un verre pour le test ' + a.mins, kind: 'rdv', in: a.mins });
    if (!ev) return null;
    ev.game = a.game;
    H.S.modals = [];
    H.update();
    return ev.id;
  }, { handle, game, mins });
  const quiz = { kind: 'quiz', title: 'Le rendez-vous', intro: 'Montre que tu l’écoutes.', diff: 'facile', items: [1, 2, 3, 4].map((k) => ({ text: `Question ${k} ?`, a: [`Bonne ${k}`, `Mauvaise ${k}a`, `Mauvaise ${k}b`], ok: 0, why: 'ça colle' })) };
  const qid = await mkEvent(people[0], quiz, 40);
  await open(page, qid);
  await page.waitForSelector('.layer .mg-intro');
  await clickText(page, '.layer .mg-intro button', 'parti');
  await page.waitForSelector('.layer .mg-opt:not([disabled])', { timeout: 8000 });
  await clickText(page, '.layer .mg-opt', 'Bonne 1');
  await sleep(200);
  await back(page); // leaves while the right answer shows
  await sleep(2200); // its timer goes off meanwhile: the next question must not start without the player
  const q1 = await runOf(page, qid);
  await open(page, qid);
  await page.waitForSelector('.layer .mg-opt:not([disabled])', { timeout: 8000 });
  const q2 = await G(page, () => ({ card: document.querySelector('.layer .mg-card p').textContent, opts: [...document.querySelectorAll('.layer .mg-opt')].map((b) => b.textContent) }));
  const q2run = await runOf(page, qid);
  const n2 = await top(page);
  check('a date left while the answer showed: back on the next question (2/4), its clock started when it showed, not while away; the answer given is kept',
    q1.run.k === 1 && q1.run.right === 1 && q1.run.end === 0 && q1.run.o.length === 3 && q2.card === 'Question 2 ?' && n2 === '2/4' && q2run.run.end > Date.now() + 2000 && q2.opts.every((t) => /2/.test(t)), { q1: q1.run, q2, n2, end: q2run.run.end - Date.now() });
  // leaves while question 2 is on screen, and stays away longer than its time: it is lost, the right answer shown
  await back(page);
  await G(page, (x) => { const ev = window.__hype.S.game.events.find((y) => y.id === x); ev.game.run.end = Date.now() - 1000; }, qid);
  await open(page, qid);
  await page.waitForSelector('.layer .mg-card small', { timeout: 5000 });
  const late = await G(page, () => ({ fb: document.querySelector('.layer .mg-card small').textContent, ok: (document.querySelector('.layer .mg-opt.ok') || {}).textContent || '' }));
  await shot(page, 'quiz-late');
  await page.waitForFunction(() => (document.querySelector('.layer .mg-top .mono') || {}).textContent === '3/4', null, { timeout: 5000 });
  const q3 = await runOf(page, qid);
  check('a question left on screen longer than its time: « Trop tard », counted as missed (the right answer shown), then question 3',
    /Trop tard/.test(late.fb) && late.ok === 'Bonne 2' && q3.run.k === 2 && q3.run.right === 1, { late, run: q3.run });
  // the last two, and the evening goes on as before
  await clickText(page, '.layer .mg-opt', 'Bonne 3');
  await sleep(1550);
  await clickText(page, '.layer .mg-opt', 'Bonne 4');
  await page.waitForSelector('.layer .mg-result', { timeout: 5000 });
  const q4 = await runOf(page, qid);
  check('the date ends as usual once played: 3 out of 4', q4.played && Math.abs(q4.played.score - 0.75) < 1e-6, q4.played);

  // ---------- the montage: the take that was rolling when the player left counts as missed ----------
  const montage = { kind: 'montage', title: 'Coupe au rythme', verb: 'Couper', what: 'vidéo', intro: 'Coupe pile au bon moment.', diff: 'moyen', speed: 1500, items: [0, 1, 2, 3].map(() => ({ z0: 0.4, z1: 0.6 })) };
  const mid = await mkEvent(people[1], montage, 200);
  await open(page, mid);
  await page.waitForSelector('.layer .mg-intro');
  await clickText(page, '.layer .mg-intro button', 'parti');
  await page.waitForFunction(() => { const t = document.querySelector('.layer .mt-track'), b = document.querySelector('.layer .mt-cut'); return t && b && !b.disabled && +t.dataset.t0 > 0; }, null, { timeout: 8000 });
  await page.click('.layer .mt-cut');
  await page.waitForFunction(() => document.querySelector('.layer .mg-top .mono').textContent === '2/4' && !document.querySelector('.layer .mt-cut').disabled, null, { timeout: 5000 });
  await back(page); // the second take is rolling
  const m1 = await runOf(page, mid);
  await open(page, mid);
  await page.waitForSelector('.layer .mt-track', { timeout: 5000 });
  const m2 = await runOf(page, mid);
  const nm = await top(page);
  check('the montage: the take rolling when the player left is missed (✗), the next one starts (3/4)',
    m1.run.k === 1 && m1.run.live === 1 && m1.run.got.length === 1 && m2.run.got.length === 2 && m2.run.got[1] === 0 && m2.run.live === 2 && nm === '3/4', { m1: m1.run, m2: m2.run, nm });
  await back(page);

  // ---------- the memory game: a round under way when the player left counts as it stood ----------
  const memo = { kind: 'memoire', title: 'Retiens ton script', what: 'vidéo', intro: 'Retiens la suite.', diff: 'moyen', per: 250, pool: ['🎬', '🎥', '💡', '🎤', '📱', '✂️', '🔥', '⭐'], items: [{ seq: ['🎬', '🎥', '💡'] }, { seq: ['🎤', '📱', '✂️', '🔥'] }, { seq: ['⭐', '🎬', '🎥', '💡', '🎤'] }] };
  const meid = await mkEvent(people[2] || people[0], memo, 400);
  await open(page, meid);
  await page.waitForSelector('.layer .mg-intro');
  await clickText(page, '.layer .mg-intro button', 'parti');
  await page.waitForSelector('.layer .mm-play[data-phase="pick"]', { timeout: 8000 });
  for (const sym of memo.items[0].seq) await G(page, (s) => { [...document.querySelectorAll('.layer .mm-pool button')].find((x) => x.textContent === s).click(); }, sym);
  await page.waitForSelector('.layer .mm-play[data-k="1"] .mm-big', { timeout: 8000 }); // round 2 shows its first image
  await back(page);
  const me1 = await runOf(page, meid);
  await open(page, meid);
  await page.waitForSelector('.layer .mm-play[data-k="2"]', { timeout: 5000 });
  const me2 = await runOf(page, meid);
  check('the memory game: a round left while it showed counts as it stood (0), the next round starts; the first one is kept (1)',
    me1.run.k === 1 && me1.run.live === 1 && me1.run.phase === 'show' && me2.run.scores.length === 2 && me2.run.scores[0] === 1 && me2.run.scores[1] === 0 && me2.run.k === 2, { me1: me1.run, me2: me2.run });
  await back(page);

  // ---------- a game left with its last answer given: over by itself ----------
  const lastId = await mkEvent(people[3] || people[1], quiz, 600);
  await G(page, (x) => { const ev = window.__hype.S.game.events.find((y) => y.id === x); ev.game.run = { on: Date.now(), k: 4, right: 2, end: 0, o: [], score: 0.5 }; }, lastId);
  await sleep(1600);
  const lastRun = await runOf(page, lastId);
  check('a game whose last answer was given (the window closed before the result): over by itself, with its score', lastRun.played && lastRun.played.score === 0.5, lastRun.played);

  // ---------- saves and exports: a mini-game half played never travels ----------
  const snap = await G(page, async (ids) => {
    const H = window.__hype, g = H.S.game;
    const prepped = g.events.find((y) => y.id === ids.me);
    prepped.prep = { at: Date.now(), game: prepped.game }; // a prepared evening (« Rendez-vous soignés ») too
    const s = H.snapshotOf(g);
    const ex = JSON.parse(await H.exportGameText(g.id));
    const pick = (o, id) => (o.events || []).find((y) => y.id === id) || (o.releases || []).find((y) => y.id === id) || {};
    return {
      live: { m: !!pick(g, ids.m).game, me: !!pick(g, ids.me).game },
      save: { m: pick(s, ids.m).game, me: pick(s, ids.me).game, prep: 'prep' in pick(s, ids.me), playedRelease: !!pick(s, ids.r).game, playedDate: !!pick(s, ids.q).game },
      exp: { m: pick(ex.core, ids.m).game, me: pick(ex.core, ids.me).game, playedRelease: !!pick(ex.core, ids.r).game },
    };
  }, { m: mid, me: meid, r: rid, q: qid });
  check('saves and exports never carry a mini-game half played (loading writes a new one), the live game keeps it; played ones stay (their answers)',
    snap.live.m && snap.live.me && snap.save.m === null && snap.save.me === null && !snap.save.prep && snap.save.playedRelease && snap.save.playedDate && snap.exp.m === null && snap.exp.me === null && snap.exp.playedRelease, snap);
  // a save loaded: the half-played date comes back without its game, to be written again
  await G(page, () => window.__hype.writeSave(window.__hype.S.game, '1', 'test'));
  await sleep(500);
  await G(page, () => window.__hype.loadSave('1'));
  await page.waitForFunction((id) => { const g = window.__hype.S.game; const ev = g && g.events.find((y) => y.id === id); return ev && !ev.game; }, mid, { timeout: 8000 });
  const loaded = await G(page, (id) => { const ev = window.__hype.S.game.events.find((y) => y.id === id); return { game: ev.game, state: ev.state }; }, mid);
  check('a save loaded: the date that was half played is there, without its questions (they will be new)', loaded.game === null && loaded.state === 'scheduled', loaded);

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
