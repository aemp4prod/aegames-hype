// 0.27.8 end to end, in Chromium against the built hype.html with the mocked Claude runtime: the rules, said on screen.
// - a mini-game says what makes « réussi » (75 % and more), « moyen » (40 to 74 %) and « raté »; a score next to its tier
//   is rounded down (74,6 % reads « 74 % », under « moyen »); the clock goes on when the window is put aside, said;
// - the cut on the beat says how it scores (1 point in the zone, ½ just beside, 0 when missed), never that one miss
//   ruins it; the chat's counter counts what its score counts; the reframing shows the round's score;
// - the difficulty: what its number multiplies, honest descriptions; a failed shoot the edit can still save, said with
//   its numbers; « Passer le montage (−6 points) »;
// - an answer's explanation stays long enough to be read, and the answers at the end keep it;
// - the challenge: what it takes to win, what hardcore gives; « bonus de défi », « d’affilée »; the release card says
//   what happens after its delay, the same buttons as the programme; « Au plus tôt » and the date of the release;
// - a client order: from what score it is « bon », under which it is « raté »; the jobs section before the first one;
// - a sponsor with a deposit: « reste … à la sortie »; sectors in words; the pitch greyed under 800 followers;
// - the inventory: the resale price, « Voir l’annonce », « Revendre sur Occaz »; repairs that say how long;
// - one question before refusing an offer, closing the memberships, a big purchase; the proposal takes two taps;
// - the reasons of greyed buttons on screen; no-break spaces before € and %; a name for the team's message button.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v279.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v279');
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
async function dismiss(page) { for (let k = 0; k < 6 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }
const NB = ' ';
const txt = (page, sel) => G(page, (s) => { const el = document.querySelector(s); return el ? el.textContent : ''; }, sel);

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
  const { page } = await newPage(browser, { width: 390, height: 844 });
  await newGame(page, 'Une créatrice qui teste des potions');
  await G(page, () => { window.__hypeNoGearEvent = true; window.__hypeEasyGear = true; const g = window.__hype.S.game; g.career.platform = 'youtube'; g.releases = []; g.series = null; });

  // ---------- 1. the tiers said, the score rounded down, the cut's rule, the clock ----------
  const t1 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    H.S.stack = [];
    g.career.platform = 'tiktok';
    const r = H.scheduleRelease(g, { what: 'short', topic: 'mon sort préféré', due: Date.now() + 60000 });
    g.career.platform = 'youtube';
    r.due = Date.now() - 1000;
    r.game = H.makeMontage(r, H.DIFFS[2]);
    H.openLayer({ t: 'minigame', id: r.id });
    return { id: r.id, noun: r.noun, p: [H.pctOf(0.746), H.pctOf(0.75), H.pctOf(0.29), H.pctOf(0.4), H.pctOf(0.399), H.pctOf(1)] };
  });
  await page.waitForSelector('.layer .mg-intro');
  const intro = await txt(page, '.layer .mg-intro');
  const head = await G(page, () => ({ title: (document.querySelector('.layer .layer-head h2') || {}).textContent, min: (document.querySelector('.layer .win-min') || { title: '' }).title }));
  await shot(page, 'intro-cut');
  check('a score next to its tier is rounded down (74,6 % reads 74, never 75 under « moyen »)', t1.p.join(',') === '74,75,29,40,39,100', t1.p);
  check('the cut on the beat says how it scores (6 cuts at Difficile since 0.27.9; 1 point in the zone, ½ just beside, 0 when missed; Espace works), what « réussi », « moyen » and « raté » take, that the clock never stops; its name, its window on TikTok, its « Réduire »',
    /Coupe au rythme/.test(intro) && /La coupe parfaite/.test(intro) && /plus tes coupes tombent pile/.test(intro) && !/Une seule de travers/.test(intro)
      && /6 coupes\. Le curseur va et vient : touche « Couper » \(ou Espace\)/.test(intro) && /Dedans : 1 point ; juste à côté : ½ point ; rien après deux allers-retours : 0 point\./.test(intro)
      && /Réussi \(75\s% et plus\) : le tiktok cartonne\. Moyen \(40 à 74\s%\) : il marche moyen\. Raté \(moins de 40\s%\) : flop\./.test(intro)
      && /le chrono ne s’arrête plus, même si tu fermes ou réduis la fenêtre/.test(intro) && /Difficile · bonus ×1,6/.test(intro) && !/gains/.test(intro)
      && t1.noun === 'tiktok' && head.title === 'Tournage · tiktok' && head.min === 'Réduire (le chrono continue)', { intro: intro.slice(0, 600), head });
  await G(page, (id) => { const H = window.__hype, g = H.S.game; H.finishShoot(g.releases.find((x) => x.id === id), 0.746); }, t1.id);
  await page.waitForSelector('.layer .mg-result');
  const res1 = await G(page, () => ({ score: document.querySelector('.layer .mg-score').textContent, tier: document.querySelector('.layer .mg-result .eyebrow').textContent, chip: document.querySelector('.layer .mg-result .chip').textContent }));
  check('the result: « Tournage moyen » over « 74 % » (not 75), its bonus named', res1.score === '74' + NB + '%' && res1.tier === 'Tournage moyen' && /bonus ×1,6/.test(res1.chip), res1);

  // ---------- 2. a failed shoot the edit can still save; « Passer le montage (−6 points) » ----------
  const t2 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    H.S.stack = [];
    g.releases = [];
    const mk = (what, sc, k) => { const r = H.scheduleRelease(g, { what, topic: `essai ${k}`, due: Date.now() + (k + 1) * 3600000 }); r.game = { kind: 'quiz', items: [], diff: 'moyen' }; H.finishShoot(r, sc); return r; };
    const a = mk('vidéo', 0.3, 1), b = mk('vidéo', 0.1, 2), c = mk('live', 0.3, 3);
    H.openLayer({ t: 'minigame', id: a.id });
    return { id: a.id, b: H.flopWord(b), c: H.flopWord(c) };
  });
  await page.waitForFunction(() => { const e = document.querySelector('.layer .mg-result .eyebrow'); return e && e.textContent === 'Tournage raté' && document.querySelector('.layer .mg-result .edit-step'); }, null, { timeout: 8000 });
  const flopA = await txt(page, '.layer .mg-result > p');
  const edit = await txt(page, '.layer .edit-step');
  await shot(page, 'flop-edit');
  await page.locator('.layer .edit-step button', { hasText: 'Passer le montage' }).click();
  await sleep(300);
  const after = await G(page, (id) => { const r = window.__hype.S.game.releases.find((x) => x.id === id); return { by: r.edit && r.edit.by, score: r.played.score, p: (document.querySelector('.layer .mg-result > p') || {}).textContent }; }, t2.id);
  check('a failed shoot the edit can still save says so with its numbers (not « flop assuré »); below 25 %, it says even a perfect edit will not do; a live keeps « flop assuré »',
    /^Raté pour l’instant : un bon montage peut encore le rattraper \(jusqu’à \+15 points\)\./.test(flopA) && /même un montage parfait \(\+15 points\) ne suffira pas/.test(t2.b) && /flop assuré/.test(t2.c), { flopA, b: t2.b, c: t2.c });
  check('the edit: its game named, how its score moves the shoot (50 % changes nothing, 100 % +15, 0 % −15), « Passer le montage (−6 points) » costs 6 points; once the edit is done, a flop is said as one',
    /Montage · /.test(edit) && /50\s% ne change rien, 100\s% donne \+15 points, 0\s% en retire 15/.test(edit) && /Passer le montage \(−6 points\)/.test(edit) && !/Monter vite/.test(edit)
      && after.by === 'vite' && Math.abs(after.score - 0.24) < 0.001 && /flop assuré/.test(after.p), { edit: edit.slice(0, 400), after });

  // ---------- 3. the chat's counter counts what the score counts ----------
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.S.game.releases = []; H.startPractice(H.S.game, 'chat', 'moyen'); });
  await page.waitForFunction(() => /Modération du chat/.test((document.querySelector('.layer .mg-intro') || {}).textContent || ''), null, { timeout: 8000 });
  const chatIntro = await txt(page, '.layer .mg-intro');
  await page.locator('.layer .mg-intro button', { hasText: 'parti' }).click();
  await page.waitForSelector('.layer .chat-msg[data-bad="1"] .chat-del', { timeout: 20000 });
  await page.click('.layer .chat-msg[data-bad="1"] .chat-del');
  await sleep(200);
  const c1 = await txt(page, '.layer .chat-play .mt-fb');
  await page.waitForSelector('.layer .chat-msg[data-bad="0"] .chat-del', { timeout: 20000 });
  await page.click('.layer .chat-msg[data-bad="0"] .chat-del');
  await sleep(200);
  const c2 = await txt(page, '.layer .chat-play .mt-fb');
  await shot(page, 'chat-counter');
  check('the chat: its name, a rule that says doing nothing fails; the counter shows the toxic messages removed and the fans hit (not « bien gérés »)',
    /Modération du chat/.test(chatIntro) && /ne rien supprimer, c’est raté/.test(chatIntro) && /🚫 1 supprimé à raison · aucun fan touché/.test(c1) && /🚫 1 supprimé à raison · 1 fan supprimé/.test(c2), { c1, c2, chatIntro: chatIntro.slice(0, 300) });

  // ---------- 4. the reframing shows the round's score ----------
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.S.practice = null; H.startPractice(H.S.game, 'cadrage', 'moyen'); });
  await page.waitForFunction(() => /Recadrage vertical/.test((document.querySelector('.layer .mg-intro') || {}).textContent || ''), null, { timeout: 8000 });
  const frIntro = await txt(page, '.layer .mg-intro');
  await page.locator('.layer .mg-intro button', { hasText: 'parti' }).click();
  await page.waitForFunction(() => { const el = document.querySelector('.layer .frame-play .mt-fb'); return el && /Plan noté/.test(el.textContent); }, null, { timeout: 15000 });
  const fr = await G(page, () => ({ fb: document.querySelector('.layer .frame-play .mt-fb').textContent, got: window.__hype.S.practice.game.run.got }));
  check('the reframing: its name, « 6 secondes et demie », a frame left alone scores almost nothing; after a round, « Plan noté X % » is the round’s score',
    /Recadrage vertical/.test(frIntro) && /Un cadre qui ne bouge pas ne marque presque rien/.test(frIntro) && /6 secondes et demie/.test(frIntro) && fr.fb === `Plan noté ${Math.round(fr.got[0] * 100)}${NB}%`, { fr, frIntro: frIntro.slice(0, 300) });
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.S.practice = null; H.update(); });

  // ---------- 5. the difficulty list: what the number multiplies, honest words; why « Lancer » waits ----------
  const t5 = await G(page, () => { const H = window.__hype, g = H.S.game; H.S.stack = []; const r = H.scheduleRelease(g, { what: 'vidéo', topic: 'les potions de minuit', due: Date.now() + 3600000 }); H.openLayer({ t: 'minigame', id: r.id }); return r.id; });
  await page.waitForSelector('.layer .mg-setup .diff-list');
  const setup = await G(page, () => ({ note: (document.querySelector('.layer .mg-setup .diff-note') || {}).textContent, mults: [...document.querySelectorAll('.layer .diff-list .d-mult')].map((e) => e.textContent), descs: [...document.querySelectorAll('.layer .diff-list .d-mid small')].map((e) => e.textContent) }));
  await page.fill('.layer #rl-topic', 'ab');
  await sleep(200);
  const why5 = await G(page, () => ({ off: document.querySelector('.layer .mg-setup > .btn-hot').disabled, why: (document.querySelector('.layer .mg-setup .why-off') || {}).textContent }));
  await shot(page, 'setup');
  check('the difficulty: what its number multiplies (likes, followers and XP, not on a flop), « ×1,6 » alone; Facile « le rythme tranquille » (0.27.9: a notch harder), Légendaire « extrêmement dur », Mythique « le plus rapide »; a topic too short says why « Lancer » waits',
    /multiplie les j’aime, les abonnés et l’XP de ta sortie, sauf si le tournage est raté/.test(setup.note) && setup.mults.join(' ') === '×0,6 ×1 ×1,6 ×2,3 ×3,2 ×4,4 ×6'
      && setup.descs[0] === 'Le rythme tranquille, des pièges plausibles' && /^Extrêmement dur\. Réussi, c’est viral à coup sûr/.test(setup.descs[4]) && /^Le plus rapide\. Réussi, c’est viral à coup sûr/.test(setup.descs[5])
      && why5.off && why5.why === 'Écris d’abord le sujet.', { setup, why5 });

  // ---------- 6. an answer's explanation stays long enough to be read, and the answers keep it ----------
  const why6 = 'Une potion de sommeil dans une vidéo sur le réveil : ça casse le fil, et on décroche.';
  const why6b = 'Le réveil en musique, c’est pile le sujet : on le garde, et il ouvre très bien la vidéo.';
  const t6 = await G(page, (why) => {
    const H = window.__hype, g = H.S.game;
    H.S.stack = [];
    g.releases = [];
    const r = H.scheduleRelease(g, { what: 'vidéo', topic: 'le tri des potions', due: Date.now() + 3600000 });
    r.due = Date.now() - 1000;
    r.game = { kind: 'tri', title: 'Le tri', intro: 'Garde ce qui sert ta vidéo.', diff: 'moyen', items: [{ text: 'Une potion de sommeil', good: false, why: why[0] }, { text: 'Le réveil en musique', good: true, why: why[1] }] };
    H.openLayer({ t: 'minigame', id: r.id });
    return { id: r.id, ms: H.fbMs(why[0], 1200), ms2: H.fbMs(why[1], 1200), short: H.fbMs('', 1200) };
  }, [why6, why6b]);
  await page.waitForFunction(() => /Le tri/.test((document.querySelector('.layer .mg-intro h3') || {}).textContent || ''), null, { timeout: 8000 });
  await page.locator('.layer .mg-intro button', { hasText: 'parti' }).click();
  await page.waitForSelector('.layer .mg-card');
  const first6 = await txt(page, '.layer .mg-card p');
  await page.locator('.layer .mg-actions button', { hasText: /potion/.test(first6) ? 'Garder' : 'Jeter' }).click();
  await sleep(2700);
  const still = await G(page, () => { const c = document.querySelector('.layer .mg-card'); return { fb: !!(c && (c.classList.contains('ko') || c.classList.contains('ok'))), small: (document.querySelector('.layer .mg-card small') || {}).textContent || '' }; });
  await page.waitForFunction(() => { const c = document.querySelector('.layer .mg-card'); return !c || (!c.classList.contains('ko') && !c.classList.contains('ok')); }, null, { timeout: 8000 });
  if (await page.$('.layer .mg-card')) {
    const second = await txt(page, '.layer .mg-card p');
    await page.locator('.layer .mg-actions button', { hasText: /potion/.test(second) ? 'Garder' : 'Jeter' }).click();
  }
  await page.waitForSelector('.layer .mg-result', { timeout: 10000 });
  await page.click('.layer details.mg-fix summary');
  const answers = await txt(page, '.layer details.mg-fix');
  const whyFirst = /potion/.test(first6) ? why6 : why6b;
  check('a wrong answer’s explanation stays on screen long enough to be read (about 30 characters a second, 4 s at most: still there after 2,7 s), and the answers at the end keep each explanation',
    t6.ms === 4000 && t6.ms2 === 4000 && t6.short === 1200 && still.fb && still.small.includes(whyFirst.slice(0, 30)) && answers.includes(why6) && answers.includes(why6b), { t6, first6, still, answers: answers.slice(0, 300) });

  // ---------- 7. the memory game: one wrong image ends the round ----------
  const mem = await G(page, () => window.__hype.MG_RULE.memoire(10, { items: [1, 2, 3] }));
  check('the memory game says it: the images one by one, touched in the same order, one mistake ends the round', mem === 'Des images défilent une par une : retiens-les, puis touche-les dans le même ordre. Une erreur arrête la manche. 3 manches, de plus en plus longues.', mem);

  // ---------- 8. the challenge: what it takes; hardcore; the date of a release ----------
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.S.game.releases = []; H.openLayer({ t: 'series' }); });
  await page.waitForSelector('.layer .se-stakes');
  const lede = await txt(page, '.layer .lede-sm');
  await page.locator('.layer button', { hasText: /^3 jours$/ }).click();
  await sleep(100);
  const s3 = await txt(page, '.layer .se-stakes');
  await page.locator('.layer button', { hasText: /^7 jours$/ }).click();
  await sleep(100);
  const s7 = await txt(page, '.layer .se-stakes');
  await page.click('.layer .hard-toggle input');
  await sleep(100);
  const sh = await txt(page, '.layer .se-stakes');
  const hardTxt = await txt(page, '.layer .hard-toggle');
  const firstEp = await txt(page, '.layer .se-when');
  const why8 = await txt(page, '.layer .why-off');
  await shot(page, 'defi');
  check('the challenge: even a « moyen » episode grows the « bonus de défi »; what winning takes, by its length (3 days: no failed or missed episode; 7: one failed at most); hardcore: no « Pas tenu », twice the gems and +50 % followers and XP; its first episode dated; why its button waits',
    /Chaque épisode qui n’est pas raté \(même moyen\) fait grimper ton bonus de défi/.test(lede) && /Réussi \(aucun épisode raté ni manqué\)/.test(s3) && /Pas tenu \(un épisode manqué, ou un raté\)/.test(s3)
      && /Réussi \(aucun épisode manqué, au plus un raté\)/.test(s7) && /Pas tenu \(un épisode manqué, ou plus d’un raté\)/.test(s7) && /la moitié des épisodes ratés ou manqués, ou le défi abandonné/.test(s7)
      && !/Pas tenu/.test(sh) && /un seul épisode raté ou manqué, ou le défi abandonné/.test(sh) && /deux fois plus de gemmes et \+50\s% d’abonnés et d’XP/.test(hardTxt) && !/les récompenses doublent/.test(hardTxt)
      && /^Premier épisode : /.test(firstEp.trim()) && why8 === 'Écris d’abord le thème du défi.', { lede, s3, s7, sh, hardTxt, firstEp, why8 });
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.openLayer({ t: 'series', id: 'single' }); });
  await page.waitForFunction(() => /Sortie : /.test((document.querySelector('.layer .se-when') || {}).textContent || ''), null, { timeout: 8000 });
  const w0 = await txt(page, '.layer .se-when');
  const soon = await page.locator('.layer button', { hasText: 'Demain' }).count(); // (0.28.1: the days, counted from today)
  await page.locator('.layer button', { hasText: 'Après-demain' }).click();
  await sleep(100);
  const w1 = await txt(page, '.layer .se-when');
  check('« Programmer une sortie »: the days counted from today (« Demain », « Après-demain »…), and the date it will come out, changed by the day picked', soon >= 1 && /Sortie : /.test(w0) && /Sortie : /.test(w1) && w0 !== w1, { soon, w0, w1 });

  // ---------- 9. the release card and the programme: the same buttons, what happens after the delay; the challenge's words ----------
  await G(page, () => {
    const H = window.__hype, g = H.S.game;
    H.S.stack = [];
    g.releases = [];
    H.scheduleRelease(g, { what: 'vidéo', topic: 'la potion du lundi', due: Date.now() + 3 * 3600000 });
    H.scheduleRelease(g, { what: 'short', topic: 'un sort express', due: Date.now() + 6 * 3600000 });
    H.goTab('feed'); H.update();
  });
  await page.waitForSelector('.release-card');
  const card = await txt(page, '.release-card');
  await G(page, () => { const H = window.__hype, g = H.S.game; H.plannedReleases(g)[0].due = Date.now() - 60000; H.update(); });
  await sleep(400);
  const dueCard = await txt(page, '.release-card');
  await G(page, () => { const H = window.__hype; H.goTab('studio'); H.update(); });
  await page.waitForSelector('.plan-row');
  const rows = await G(page, () => [...document.querySelectorAll('.plan-row')].map((e) => [...e.querySelectorAll('.acts .btn')].map((b) => b.textContent.trim())));
  check('the release card: « Sortir plus tôt »; when due, how long is left and what happens then (« pour la tourner, sinon elle est abandonnée »); the programme’s rows: the same buttons',
    /Sortir plus tôt/.test(card) && /pour la tourner, sinon elle est abandonnée/.test(dueCard) && rows.length === 2 && rows[0].includes('Tourner') && rows[0].includes('Repousser') && rows[1].includes('Sortir plus tôt') && rows[1].includes('Repousser'), { card, dueCard, rows });
  const t9 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    g.releases = [];
    H.startSeries(g, { what: 'vidéo', days: 3, hour: 18, theme: 'une potion par jour', diff: 'moyen' });
    const r = H.plannedReleases(g).find((x) => x.series);
    H.seriesEpisode(g, r, 'mid');
    r.state = 'released';
    H.goTab('feed'); H.update();
    return { n: g.notifs.slice(-3).map((x) => x.text).join(' | '), mult: H.seriesMult(g), at: H.seriesMultAt(g.series, 2) };
  });
  await page.waitForSelector('.release-card');
  const seCard = await txt(page, '.release-card');
  await G(page, () => { const H = window.__hype; H.goTab('studio'); H.update(); });
  await page.waitForSelector('.series-card');
  const seStudio = await txt(page, '.series-card');
  check('the challenge’s words: « publié : 1 d’affilée (bonus ×1,2 sur le prochain) », « bonus ×1,2 » on the card, « D’affilée : 1 · bonus ×1,2 » in the Studio (no « série » for the streak)',
    /Épisode 1\/3 publié : 1 d’affilée \(bonus ×1,2 sur le prochain\)/.test(t9.n) && /défi : épisode 2\/3 · bonus ×1,2/.test(seCard) && /D’affilée : 1 · bonus ×1,2/.test(seStudio) && Math.abs(t9.at - 1.4) < 1e-9, { t9, seCard, seStudio });
  await G(page, () => { const H = window.__hype, g = H.S.game; g.series = null; g.releases = []; H.update(); });

  // ---------- 10. a client order: its thresholds; the section before the first one ----------
  await G(page, () => { const H = window.__hype, g = H.S.game; g.jobs = []; H.S.stack = []; H.goTab('studio'); H.update(); });
  await page.waitForSelector('.jobs-sec');
  const jobsEmpty = await txt(page, '.jobs-sec');
  const t10 = await G(page, () => {
    const H = window.__hype, g = H.S.game, z = H.mains(g).find((c) => c.handle !== 'theo.marlin');
    const j = H.addJob(g, z, { kind: 'montage', what: 'le vlog de sa rentrée', pay: 60, days: 2 });
    H.addJobFile(g, z, { name: 'vlog_rush_A.mp4' }, Date.now() - 1000);
    g.jobDiff = 'facile';
    H.openLayer({ t: 'job', id: j.id });
    return { first: z.name.split(' ')[0], j: !!j };
  });
  await page.waitForSelector('.layer .job-setup');
  const jobRows = await G(page, () => [...document.querySelectorAll('.layer .job-setup .diff-opt')].map((e) => e.textContent));
  const jobNote = await txt(page, '.layer .job-setup > p.muted');
  await page.locator('.layer .job-setup .diff-opt').nth(4).click();
  await sleep(100);
  const jobNote2 = await txt(page, '.layer .job-setup > p.muted');
  await shot(page, 'job');
  check('a client order: each difficulty says from what score it is « bon » and under which it is « raté » (Facile: 81 and 57); the rule of the cut; what a « raté » costs; « Dès 84 %, le montage est légendaire »; before any order, the Studio says how one comes',
    t10.j && /bon dès 81\s%, raté sous 57\s%/.test(jobRows[0]) && /bon dès 66\s%, raté sous 47\s%/.test(jobRows[1]) && /légendaire dès 84\s%/.test(jobRows[4])
      && /^5 coupes\. Le curseur va et vient/.test(jobNote) && new RegExp(`Raté : sa vidéo fait un flop et ${t10.first} ne paie que la moitié\\.`).test(jobNote) && /Dès 84\s%, le montage est légendaire\./.test(jobNote2)
      && /Propose en message à un créateur de monter sa vidéo ou de faire sa miniature/.test(jobsEmpty), { jobRows, jobNote, jobNote2, jobsEmpty });
  await G(page, () => { const H = window.__hype, g = H.S.game; g.jobs = []; H.S.stack = []; H.update(); });

  // ---------- 11. a sponsor with a deposit; sectors in words; refusing an offer asks first ----------
  const t11 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    H.S.stack = [];
    g.deals = [];
    g.stats.followers = 5000; // (the brands write from 800 followers on)
    const d = H.makeOffer(g, { brand: 'Volta', sector: 'boisson', what: 'vidéo', gift: false, scam: '', shady: false });
    Object.assign(d, { exclusive: false, fee: 500, fee0: 500, upfront: 150, value: 0, costs: 0, payLate: 0, clause: null });
    const signed = H.signDeal(g, d);
    const o2 = H.makeOffer(g, { brand: 'Lueur', sector: 'beaute', what: 'vidéo', gift: false, scam: '', shady: false });
    Object.assign(o2, { exclusive: false, costs: 0, clause: null });
    g.stats.followers = 500; // (under 800: the pitch is greyed)
    return { signed, state: d.state, left: H.dealLeft(g, d), word: H.sectorWord('beaute'), id2: o2 && o2.id, terms: H.payTerms(g, d) };
  });
  await G(page, () => { const H = window.__hype; H.goTab('studio'); H.update(); });
  await page.waitForSelector('.deal-card.st-offer');
  const offerTxt = await txt(page, '.deal-card.st-offer');
  await page.locator('.deal-card.st-offer button', { hasText: 'Refuser' }).click();
  await page.waitForSelector('.modal .modal-title', { timeout: 4000 }).catch(() => {});
  const ask11 = await G(page, (id) => ({ modal: (document.querySelector('.modal .modal-title') || {}).textContent || '', text: (document.querySelector('.modal .modal-card p') || {}).textContent || '', state: window.__hype.S.game.deals.find((x) => x.id === id).state }), t11.id2);
  await shot(page, 'refuse-ask');
  await sleep(600);
  await page.click('.modal .modal-card .btn >> nth=0');
  await sleep(300);
  const refused = await G(page, (id) => window.__hype.S.game.deals.find((x) => x.id === id).state, t11.id2);
  check('refusing an offer asks first (« Refuser l’offre de Lueur ? », the proposal is lost), then refuses; « Négocier en message »; the terms after « Paiement : » start in lower case',
    /^Refuser l’offre de Lueur \?$/.test(ask11.modal) && /sera perdue/.test(ask11.text) && ask11.state === 'offer' && refused === 'declined' && /Négocier en message/.test(offerTxt)
      && /^\d+\s% à la signature, le reste à la livraison$/.test(t11.terms), { ask11, refused, terms: t11.terms });
  // the quote of a release: the sponsor's chip, the sectors, « tu le gardes »
  await G(page, () => {
    const H = window.__hype, g = H.S.game;
    window.__hypeEasyGear = false;
    H.S.stack = [];
    H.keepDevis({ key: 'vidéo|mes potions|0', what: 'vidéo', topic: 'mes potions', days: 0, once: 30, each: 0, items: [{ item: 'Un trépied', price: 30, kind: 'achat', keep: true }], have: [], ai: true, sponsor: { sector: 'beaute', why: 'Une marque de beauté pourrait financer ça.' } });
    H.openLayer({ t: 'series', id: 'single' });
  });
  await page.waitForSelector('.layer #se-theme');
  await page.fill('.layer #se-theme', 'mes potions');
  await page.waitForSelector('.layer .devis-card');
  const dv = await G(page, () => { const c = document.querySelector('.layer .devis-card'), b = c.querySelector('.dv-pitch button'); return { t: c.textContent, pitch: b ? b.textContent : '', off: !!(b && b.disabled) }; });
  await shot(page, 'devis');
  check('a sponsor with a deposit reads « Volta · reste 350 € à la sortie » (the quote, the upload); the sector in words (« 💄 beauté »), the pitch greyed under 800 followers with why; « tu le gardes »',
    t11.signed !== false && t11.left === ` · reste 350${NB}€ à la sortie` && dv.t.includes(`Volta · reste 350${NB}€ à la sortie`) && t11.word === '💄 beauté'
      && dv.pitch === 'Démarcher une marque (💄 beauté) · dès 800 abonnés' && dv.off && /tu le gardes/.test(dv.t) && !/à garder/.test(dv.t), { t11, dv });
  await G(page, () => { const H = window.__hype; window.__hypeEasyGear = true; H.S.stack = []; H.S.game.deals = []; H.update(); });

  // ---------- 12. the inventory; repairs that say how long; a big purchase asks first ----------
  const t12 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    H.S.stack = [];
    g.inv = [];
    H.invAdd(g, { kind: 'gift', name: 'Casque sans fil', emoji: '🎧', value: 300, cond: 'bon', from: { how: 'achat' } });
    const y = H.invAdd(g, { kind: 'gift', name: 'Lampe', emoji: '💡', value: 100, cond: 'neuf', from: { how: 'achat' } });
    H.listItem(g, (y || g.inv[g.inv.length - 1]).id, 70);
    const k = ['pc', 'cam', 'light', 'mic'].find((x) => g.gear.items[x]) || 'cam';
    if (!g.gear.items[k]) g.gear.items[k] = { t: 1 };
    const it = g.gear.items[k], was = Object.assign({}, it);
    it.broken = 1; it.fixAt = 0;
    const iss = H.gearIssues(g, Date.now()).find((x) => x.id === 'broken-' + k);
    g.gear.items[k] = was;
    H.goTab('studio'); H.update();
    return { labels: iss ? iss.acts.map((a) => a.label) : [], money: H.fmtMoney(g, 150), big: H.fmtMoney(g, 2500) };
  });
  await page.waitForFunction(() => /Casque sans fil/.test((document.querySelector('.inv-sec') || {}).textContent || ''), null, { timeout: 8000 }).catch(() => {});
  const inv = await txt(page, '.inv-sec');
  check('the inventory shows what a thing resells for (« revente ≈ 150 € », not its new price), « Voir l’annonce », « Revendre sur Occaz »; a repair says how long, the express one says « tout de suite »; money keeps its € on the same line',
    inv.includes(`revente ≈${NB}150${NB}€`) && !/valeur 300/.test(inv) && /Voir l’annonce/.test(inv) && /Revendre sur Occaz/.test(inv)
      && /^Réparer \(1 à 3 jours\) · /.test(t12.labels[0] || '') && /^Réparer tout de suite · /.test(t12.labels[1] || '') && t12.money === `150${NB}€` && /^2\s500 €$/.test(t12.big), { inv, t12 });
  await G(page, () => { const H = window.__hype, g = H.S.game; g.career.cash = 200000; H.S.stack = []; H.openLayer({ t: 'gear' }); });
  await page.waitForSelector('.layer .shop-card');
  const idx = await G(page, () => [...document.querySelectorAll('.layer .shop-card')].findIndex((c) => { const p = parseInt(((c.querySelector('.sc-price') || {}).textContent || '').replace(/\D/g, ''), 10); const b = c.querySelector('button.btn-hot'); return p > 1000 && b && !b.disabled; }));
  let ask12 = { modal: '' };
  if (idx >= 0) {
    await page.locator('.layer .shop-card').nth(idx).locator('button.btn-hot').click();
    await page.waitForSelector('.modal .modal-title', { timeout: 4000 }).catch(() => {});
    ask12 = await G(page, () => ({ modal: (document.querySelector('.modal .modal-title') || {}).textContent || '', text: (document.querySelector('.modal .modal-card p') || {}).textContent || '', cash: window.__hype.S.game.career.cash }));
    await shot(page, 'buy-ask');
    await page.click('.modal .modal-card .btn-ghost');
    await sleep(300);
  }
  const cash12 = await G(page, () => window.__hype.S.game.career.cash);
  check('a purchase over 1 000 € asks first (« Acheter … ? », the price and what is left); « Annuler » buys nothing',
    idx >= 0 && /^Acheter .+ \?$/.test(ask12.modal) && /Il te restera/.test(ask12.text) && ask12.cash === 200000 && cash12 === 200000, { idx, ask12, cash12 });
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.update(); });

  // ---------- 13. the community: under 300 followers; closing the memberships asks; a price rise warns ----------
  await G(page, () => { const H = window.__hype, g = H.S.game; g.stats.followers = 120; H.goTab('studio'); H.update(); });
  await page.waitForFunction(() => /300 abonnés/.test((document.querySelector('.commu-sec') || {}).textContent || ''), null, { timeout: 8000 }).catch(() => {});
  const commuLow = await txt(page, '.commu-sec');
  await G(page, () => {
    const H = window.__hype, g = H.S.game;
    g.career.platform = 'youtube'; g.stats.followers = 5000; g.career.prog = { state: 'on', at: Date.now() };
    H.openMemb(g, 4.99, ['avant']); H.membOf(g).members = 12; H.update();
  });
  await page.waitForSelector('.memb.on');
  await page.locator('.memb.on button', { hasText: 'Fermer les' }).click();
  await page.waitForSelector('.modal .modal-title', { timeout: 4000 }).catch(() => {});
  const ask13 = await G(page, () => ({ modal: (document.querySelector('.modal .modal-title') || {}).textContent || '', text: (document.querySelector('.modal .modal-card p') || {}).textContent || '', on: window.__hype.membOf(window.__hype.S.game).on }));
  await page.click('.modal .modal-card .btn-ghost');
  await sleep(300);
  await page.locator('.memb.on button', { hasText: 'Modifier' }).click();
  await page.locator('.memb .chip-btn', { hasText: '9,99' }).click();
  await sleep(150);
  const memb = await G(page, () => ({ warn: (document.querySelector('.memb .memb-warn') || {}).textContent || '', badge: [...document.querySelectorAll('.memb .chip-btn')].map((b) => b.textContent).find((t) => /Badge/.test(t)) || '', on: window.__hype.membOf(window.__hype.S.game).on }));
  await shot(page, 'memb');
  check('« Ta commu »: under 300 followers, nobody writes yet (said); closing the memberships asks first (« Tes 12 membres arrêtent de payer »), « Annuler » keeps them; a price rise warns; the badge « toujours inclus »',
    /Tes abonnés t’écriront à partir de 300 abonnés\./.test(commuLow) && /^Fermer les adhésions \?$/.test(ask13.modal) && /Tes 12 membres arrêtent de payer, et ta commu le prendra mal\./.test(ask13.text) && ask13.on && memb.on
      && memb.warn === 'Une hausse fait partir environ un membre sur cinq.' && memb.badge === 'Badge et emojis (toujours inclus)', { commuLow: commuLow.slice(0, 200), ask13, memb });

  // ---------- 14. the proposal takes two taps ----------
  const t14 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    H.S.stack = [];
    g.releases = [];
    const c = H.charByHandle(g, 'theo.marlin');
    c.vibe = 'couple';
    const ev = { id: 'evRing', kind: 'rdv', c: c.id, player: true, what: 'un dîner aux chandelles', due: Date.now(), state: 'scheduled', diff: 'moyen', at: Date.now() };
    ev.talk = { scene: 'Un dîner aux chandelles.', lines: [{ who: 'c', text: 'je suis content d’être là.' }], turn: 1, max: 5, reacts: [], used: [], at: Date.now() };
    g.events.push(ev);
    H.openLayer({ t: 'minigame', id: 'evRing' });
    return { n0: window.__prompts.length };
  });
  await page.waitForSelector('.layer .talk-gestes');
  const ring = () => G(page, () => { const b = [...document.querySelectorAll('.layer .talk-gestes .chip-btn')].find((x) => /demande|Vraiment/.test(x.textContent)); const ev = window.__hype.eventOf(window.__hype.S.game, 'evRing'); return { label: b ? b.textContent : '', armed: !!(b && b.classList.contains('armed')), sent: ev.talk.lines.some((x) => x.geste === 'demande'), n: window.__prompts.length }; });
  await page.locator('.layer .talk-gestes .chip-btn', { hasText: 'Faire ta demande' }).click();
  await sleep(200);
  const r1 = await ring();
  await shot(page, 'ring-armed');
  await sleep(3300);
  const r2 = await ring();
  await page.locator('.layer .talk-gestes .chip-btn', { hasText: 'Faire ta demande' }).click();
  await sleep(200);
  await page.locator('.layer .talk-gestes .chip-btn', { hasText: 'Vraiment' }).click();
  await page.waitForFunction(() => window.__hype.eventOf(window.__hype.S.game, 'evRing').talk.lines.some((x) => x.geste === 'demande'), null, { timeout: 15000 }).catch(() => {});
  const r3 = await ring();
  check('the proposal takes two taps: the first says « Vraiment ? Touche encore » and sends nothing, it goes back after 3 s; a second tap makes it',
    r1.armed && /Vraiment \? Touche encore/.test(r1.label) && !r1.sent && r1.n === t14.n0 && !r2.armed && /Faire ta demande/.test(r2.label) && r3.sent, { r1, r2, r3 });
  await G(page, () => { const H = window.__hype, g = H.S.game; H.S.stack = []; g.events = g.events.filter((e) => e.id !== 'evRing'); H.charByHandle(g, 'theo.marlin').vibe = 'ami'; H.update(); });

  // ---------- 15. why time cannot move on, on screen ----------
  await G(page, () => {
    const H = window.__hype, g = H.S.game;
    H.S.stack = [];
    g.releases = [];
    const r = H.scheduleRelease(g, { what: 'vidéo', topic: 'la potion urgente', due: Date.now() + 60000 });
    r.due = Date.now() - 60000;
    const c = H.charByHandle(g, 'theo.marlin');
    g.events.push({ id: 'evLater', kind: 'rdv', c: c.id, player: true, what: 'un café au parc', due: Date.now() + 5 * 3600000, state: 'scheduled', diff: 'moyen', at: Date.now() });
    H.goTab('feed'); H.update();
  });
  await page.waitForSelector('.evt-chip .evt-held', { timeout: 8000 }).catch(() => {});
  const held = await txt(page, '.evt-chip .evt-held');
  await G(page, () => { const H = window.__hype; H.openLayer({ t: 'minigame', id: 'evLater' }); });
  await page.waitForSelector('.layer .mg-setup');
  const dateWhy = await G(page, () => { const b = [...document.querySelectorAll('.layer .mg-setup .btn-hot')].find((x) => /Avancer/.test(x.textContent)); return { off: !!(b && b.disabled), why: (document.querySelector('.layer .mg-setup .why-off') || {}).textContent || '', note: (document.querySelector('.layer .mg-setup .diff-note') || {}).textContent || '' }; });
  check('a release to shoot first: « Avancer » says why on screen (« Ta vidéo doit sortir d’abord : tourne-la ou repousse-la. »), on the event and at the date; the date says what its number multiplies',
    held === 'Ta vidéo doit sortir d’abord : tourne-la ou repousse-la.' && dateWhy.off && dateWhy.why === held && /multiplie ce que le rendez-vous rapporte \(relation, XP\)/.test(dateWhy.note), { held, dateWhy });
  await G(page, () => { const H = window.__hype, g = H.S.game; H.S.stack = []; g.events = g.events.filter((e) => e.id !== 'evLater'); g.releases = []; H.update(); });

  // ---------- 16. labels, names and little things ----------
  const t16 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const c = H.addCandidate(g, 'cm', { tier: 1, name: 'Yanis Morel', g: 'm' });
    g.career.cash = 5000;
    H.hireStaff(g, c);
    H.goTab('studio'); H.update();
    const css = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    return { ads: [H.adWord(1.1), H.adWord(0.8), H.adWord(1)], ink: (css.match(/--ink-3: #94828C/g) || []).length, old: /#8C7A84/.test(css), games: H.MENU_GAMES.map((x) => x[1]).join('|'), label: Object.values(H.MG_LABEL).join('|') };
  });
  await page.waitForSelector('.staff-row');
  const team = await G(page, () => { const b = document.querySelector('.staff-row .acts .btn'); return { aria: b && b.getAttribute('aria-label'), plat: [...document.querySelectorAll('.studio-head button')].map((x) => x.textContent.trim()).join('|') }; });
  await page.locator('.studio-head button', { hasText: 'Changer de plateforme' }).click();
  await page.waitForSelector('.layer .pf-pick');
  await sleep(300);
  const scrolled = await G(page, () => { const body = document.querySelector('.layer .layer-body'), pick = document.querySelector('.layer .pf-pick'); const a = body.getBoundingClientRect(), b = pick.getBoundingClientRect(); return { top: Math.round(b.top - a.top), h: Math.round(a.height), scroll: Math.round(body.scrollTop) }; });
  await shot(page, 'settings-platform');
  check('names and labels: « Pubs +10 % » (not « ×1,1 »), one name per game everywhere (the menu, the eyebrows), « Changer de plateforme » lands on the platforms, the team’s message button has a name, the dark theme’s small text reads better',
    t16.ads.join('|') === `Pubs +10${NB}%|Pubs −20${NB}%|Pubs normales` && t16.games === 'Tri|Remise en ordre|Quiz|Vrai ou faux|Trouve l’intrus|Coupe au rythme|Mémoire|Modération du chat|Mixage|Recadrage vertical'
      && t16.label === 'Tri|Remise en ordre|Quiz|Vrai ou faux|Trouve l’intrus|Coupe au rythme|Mémoire|Modération du chat|Mixage|Recadrage vertical'
      && team.aria === 'Écrire à Yanis' && /Changer de plateforme/.test(team.plat) && scrolled.scroll > 0 && scrolled.top >= 0 && scrolled.top < scrolled.h && t16.ink === 2 && !t16.old, { t16, team, scrolled });

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  console.log(`\n${checks.filter((c) => c[0] === 'PASS').length}/${checks.length} PASS`);
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
