// Full scenario in Chromium against the built hype.html with the mocked Claude runtime (test/mock.js).
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/run.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(process.env.PAGE || path.join(ROOT, 'hype.html'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const UMD = fs.readFileSync(process.env.UMD, 'utf8');
const SKELETON = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;

const errors = [];
const checks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 0.15: the pen steps aside while the feed scrolls down; a player scrolls back up, a test brings it back
const clickFab = async (page, opts) => {
  await page.evaluate(() => { const H = window.__hype; if (H && H.S.fabAway) { H.S.fabAway = false; H.update(false); } });
  for (let k = 0; ; k++) { // (a result revealed late on a busy machine may open its window just before: closed, then again)
    try { return await page.click('.fab', Object.assign({ timeout: 10000 }, opts)); } catch (e) { if (k >= 2) throw e; await dismiss(page); await noToasts(page); }
  }
};
let shotN = 0;
const check = (name, ok, info) => { checks.push([ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)]); console.log(ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)); };

async function setup(page) {
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith('https://hype.test')) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: SKELETON(PAGE) });
    if (url.includes('cdn.jsdelivr.net/npm/htm@3.1.1/preact/standalone.umd.js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: UMD });
    if (url.includes('fonts.googleapis.com')) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    return route.abort();
  });
}
async function shot(page, name) {
  shotN++;
  const file = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file });
  console.log('shot', path.basename(file));
}
async function clickText(page, sel, text) {
  const el = page.locator(sel, { hasText: text }).first();
  try {
    // a modal that showed up meanwhile (a level-up after a random XP gain…) is closed first, unless it is the target
    if (!sel.startsWith('.modal')) for (let k = 0; k < 4 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(700); }
    await el.waitFor({ state: 'visible', timeout: 15000 });
    await el.click({ timeout: 15000 });
  } catch (e) {
    await page.screenshot({ path: path.join(OUT, 'fail.png') }).catch(() => {});
    throw new Error(`clickText(${sel}, ${text}): ${e.message.split('\n')[0]}`);
  }
}
// Closes any modal (its last button is always the neutral one).
async function dismiss(page) {
  for (let k = 0; k < 5 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(800); }
}
// Toasts sit over the top of the feed: they go away by themselves, or on a tap.
async function noToasts(page) { for (let k = 0; k < 8 && (await page.$('.toast')); k++) { await page.click('.toast >> nth=0').catch(() => {}); await sleep(300); } }
async function back(page) { await dismiss(page); await page.click('.layer-head .iconbtn >> nth=-1'); await sleep(300); }
// Waits a few seconds and closes every modal that shows up meanwhile (results reveal their modals with a delay).
// Waits until every queued modal (even one due a few seconds later) has shown and been closed.
async function calm(page, ms = 12000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await page.$('.modal')) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(700); continue; }
    if (!(await page.evaluate(() => window.__hype.S.modals.filter((m) => m.t !== 'confirm').length))) return;
    await sleep(400);
  }
}
async function settle(page, ms = 5000) { const end = Date.now() + ms; while (Date.now() < end) { await sleep(600); if (await page.$('.modal')) await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); } }
async function overflowCheck(page, label) {
  const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth }));
  if (w.sw > w.cw + 1 || w.bw > w.cw + 1) errors.push(`[overflow] ${label}: ${JSON.stringify(w)}`);
}
const G = (page, fn, arg) => page.evaluate(fn, arg);
let lastPage = null;

// 0.14: after the shoot, the edit (done quickly here) and the thumbnail (a model, or the one already chosen)
async function studioSteps(page, thumb) {
  for (let k = 0; k < 4; k++) {
    await page.waitForSelector('.layer .upload, .layer .edit-step, .layer .thumb-step', { timeout: 10000 });
    if (await page.$('.layer .upload')) return;
    if (await page.$('.layer .edit-step')) { await page.click('.layer .edit-step button:has-text("Passer le montage")'); await new Promise((r) => setTimeout(r, 300)); continue; }
    if (thumb) await page.click(`.layer .thumb-opt:has-text("${thumb}")`);
    await page.click('.layer .th-ok');
    await new Promise((r) => setTimeout(r, 300));
  }
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, colorScheme: 'light' });
  await ctx.addInitScript(MOCK);
  const page = await ctx.newPage();
  lastPage = page;
  await setup(page);
  await page.goto('https://hype.test/');
  await page.waitForSelector('text=Nouvelle partie');
  await sleep(300);

  // ---------- pure functions ----------
  const unit = await G(page, () => {
    const H = window.__hype;
    const got = [];
    const scan = H.makeScanner((o) => got.push(o));
    const txt = 'Voici :\n```json\n{"t":"a","x":"brace } in string"}\n{"t":"b","n":1}{"t":"c"}\n{"t":"broken","text":"oops\n{"t":"d","list":["x","y"]}\n{"t":"e", "trail": 1,}\n{"t":"rel","by":"zara.vey","d":+4,"why":"ok"}\n{"t":"eval","quality":8,"humor":7,"bold":3,"controversy":0,"reception":6,"virality":5,"verdict":"Le "boss" est là"}\n```';
    for (let i = 1; i <= txt.length; i += 7) scan(txt.slice(0, i));
    scan(txt);
    const g = { world: { chaos: 1 }, stats: { followers: 40, level: 1, cancelled: false, skills: { charisme: 5, humour: 5, audace: 5, creativite: 5 } } };
    const avg = H.cleanEval({ quality: 4, humor: 3, bold: 2, controversy: 0, reception: 2, virality: 2, skills: ['humour', 'nope', 'Créativité'] });
    const great = H.cleanEval({ quality: 8, humor: 7, bold: 7, controversy: 1, reception: 7, virality: 7 });
    const bad = H.cleanEval({ quality: 3, humor: 0, bold: 6, controversy: 9, reception: -7, virality: 5 });
    const sample = (e, kind, mods) => { const r = []; for (let i = 0; i < 200; i++) r.push(H.computeOutcome(g, e, kind, {}, mods)); const avgOf = (k) => Math.round(r.reduce((a, x) => a + x[k], 0) / r.length * 10) / 10; return { likes: avgOf('likes'), fol: avgOf('fol'), rep: avgOf('rep'), xp: avgOf('xp'), viral: r.filter((x) => x.viral).length }; };
    const eval8 = got.find((o) => o.t === 'eval');
    return {
      scanned: got.map((o) => o.t).join(','),
      relPlus: (got.find((o) => o.t === 'rel') || {}).d,
      evalSalvaged: eval8 ? eval8.quality + '/' + eval8.reception : null,
      skills: avg.skills,
      handles: ['@Zara.Vey.', 'Théo Marlin', '@@nox_ombre__', 'é'].map(H.normHandle),
      nice: [7, 137, 2537, 98765].map(H.niceRound),
      outcomes: { avg: sample(avg, 'post'), great: sample(great, 'post'), bad: sample(bad, 'post'), reply: sample(avg, 'reply'), photo: sample(avg, 'post', { photo: true }) },
      xp: [1, 2, 5, 10].map(H.xpNeed),
    };
  });
  console.log('UNIT', JSON.stringify(unit));
  check('scanner keeps +4 and salvages an eval with raw quotes', unit.relPlus === 4 && unit.evalSalvaged === '8/6', unit);
  const plans = await G(page, () => {
    const H = window.__hype, at = new Date(2026, 9, 13, 14, 0);
    const P = (t) => { const x = H.parsePlan(t, at); return x ? x.kind + ':' + x.in : null; };
    return [
      P('Une vidéo de 9 min pour un contrat et deux captures. Bravo le régulateur. Je réponds en live ce soir, sur ce que je peux dire. Le reste, c’est pas à toi de le décider.'),
      P('Ce soir : gros match, gros live, et ma boisson partenaire favorite.'),
      P('Le dossier sort ce soir, et il sera très clair.'),
      P('je vous réponds demain à 18h, promis'),
      P('je regarde le live de Zara ce soir'),
      P('j’étais en live hier soir, c’était fou'),
      P('Je tranche ce soir, je vous dis lequel.'),
      P('Une reine ? Tu tentes le compliment public là. Je te réponds ce soir, le temps de choisir mon fond de teint 😏'),
      P('Pas question de me faire griller pour les beaux yeux d’un live ce soir.'),
      P('je regarde le live de ce soir avec mes potes'),
    ];
  });
  check('a character’s own promise is read in their words (« je réponds en live ce soir »…), not a refusal or a private « je te réponds »', plans.join() === 'live:420,live:420,annonce:420,annonce:1680,,,,,,', plans);

  // ---------- onboarding ----------
  await shot(page, 'home-empty');
  await overflowCheck(page, 'home');
  await clickText(page, 'button', 'Nouvelle partie');
  await page.waitForSelector('.world');
  await sleep(300);
  await shot(page, 'worlds');
  await clickText(page, 'button.world', 'Académie Lumen');
  await page.waitForSelector('#pn');
  await page.click('button[type=submit]');
  await sleep(400);
  check('persona errors: first invalid field focused', await G(page, () => document.activeElement && document.activeElement.id) === 'pn');
  await page.fill('#pn', 'Mila Flux');
  check('handle filled from the name', (await page.inputValue('#ph')) === 'mila.flux');
  await clickText(page, '.seg button', 'Elle');
  await page.fill('#pi', 'Une nouvelle élève qui cache un pouvoir interdit');
  await page.fill('#pb', 'pas là pour me faire des amis (mais je veux bien des abonnés)');
  await shot(page, 'persona');
  await overflowCheck(page, 'persona');
  await page.click('button[type=submit]');
  await sleep(400);
  const age = await G(page, () => ({ focus: document.activeElement && document.activeElement.id, err: [...document.querySelectorAll('.err')].map((e) => e.textContent).join(' | '), card: !!document.querySelector('.check-card.age-ok.bad'), creating: !!window.__hype.S.busy.create }));
  check('18 or older: a box to tick before the world is created (it says why)', age.focus === 'p18' && /réservé aux 18 ans et plus/.test(age.err) && age.card && !age.creating, age);
  await page.check('#p18');
  await page.click('button[type=submit]');
  await sleep(700);
  await shot(page, 'creating');
  await page.waitForSelector('text=Qui sera ton premier abonné', { timeout: 20000 });
  await sleep(500);
  await shot(page, 'cast');
  await overflowCheck(page, 'cast');
  // B19: a reload on the cast screen keeps the world
  await sleep(1500);
  await page.reload();
  await page.waitForSelector('.save');
  check('reload on the cast screen keeps the world (« À finir »)', !!(await page.$('.save .chip')));
  await page.click('.save');
  await page.waitForSelector('text=Qui sera ton premier abonné');
  await page.locator('.cast-card.pick', { hasText: 'Théo' }).click();
  await shot(page, 'cast-picked');
  await page.click('.cast-cta button');
  await page.waitForSelector('.post');
  const wb = await G(page, () => { const b = window.__hype.budgetOf(window.__hype.S.game); const r = { daily: b.daily, used: Math.round(b.used * 100) / 100, world: Math.round((b.avg.world || 0) * 100) / 100 }; b.daily = 0; return r; }); // the long scenario below runs without a limit
  check('the new game paid for its own creation out of a 60-café day', wb.daily === 60 && wb.used > 0.3 && wb.world > 0.3, wb);
  await sleep(5500);
  await shot(page, 'feed-start');
  await overflowCheck(page, 'feed');
  const st0 = await G(page, () => { const g = window.__hype.S.game; const theo = g.chars.c2; return { posts: g.posts.length, photoPosts: g.posts.filter((p) => p.photo).length, unlocked: g.order.filter((id) => g.chars[id].unlocked).length, quests: g.quests.map((q) => q.kind + ':' + q.title), theo: { rel: theo.rel, follows: theo.followsYou, mem: theo.mem.map((m) => m.t) }, dms: Object.keys(g.dms).map((id) => id + ':' + g.dms[id].msgs.length), triggers: g.triggers.map((t) => t.text.slice(0, 60)), welcome: g.notifs.find((n) => n.k === 'info').text, pron: g.player.pron, chaos: g.world.chaos }; });
  console.log('STATE0', JSON.stringify(st0, null, 1));
  check('first follower: Théo follows, hello DM, quest, snub trigger', st0.theo.follows && st0.theo.rel >= 30 && st0.dms.some((x) => x.startsWith('c2:')) && st0.quests.some((q) => q.startsWith('rel:Garde Théo')) && st0.triggers.length >= 1, st0);
  check('welcome uses the world preposition', st0.welcome.startsWith('Bienvenue à l’Académie Lumen'), st0.welcome);
  const pub0 = await G(page, () => { const g = window.__hype.S.game; return { regulars: window.__hype.regulars(g).map((n) => n.handle), secrets: Object.values(g.chars).filter((c) => c.secret).length }; });
  check('the public: regulars from the world, secrets kept hidden', pub0.regulars.length === 3 && pub0.secrets >= 2 && !(await page.textContent('body')).includes('potion de force interdite'), pub0);

  // ---------- compose with ideas, then a post with a mention and a hashtag ----------
  await clickFab(page);
  await page.waitForSelector('#compose');
  await clickText(page, 'button', 'Des idées');
  await page.waitForFunction(() => document.querySelectorAll('.idea').length === 3, null, { timeout: 10000 });
  await shot(page, 'compose-ideas');
  await page.click('.idea >> nth=1');
  await page.fill('#compose', '@zara.vey demain 8h, cour des Glycines. ramène tes lunettes de soleil #DuelDesGlycines');
  await clickText(page, '.layer-head button', 'Publier');
  await sleep(1300);
  const pend = await G(page, () => { const p = window.__hype.S.game.posts.find((x) => x.a === 'p'); return { pending: !!document.querySelector('.post .chip.pending'), res: !!p.res, layers: window.__hype.S.stack.length }; });
  check('suspense: the result waits before showing', pend.pending && pend.layers === 0, pend);
  await shot(page, 'after-post');
  await sleep(4000);
  await shot(page, 'post-revealed');
  for (let k = 0; k < 3; k++) { await sleep(2500); if (await page.$('.modal')) { await shot(page, 'modal-' + k); await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); } }
  await sleep(9000);
  await dismiss(page);
  await shot(page, 'feed-reactions');
  const st1 = await G(page, () => { const g = window.__hype.S.game; const p = g.posts.find((x) => x.a === 'p'); const zara = g.chars.c1; return { res: p.res, likeT: p.likeT, replies: p.replies.length, followers: g.stats.followers, rep: g.stats.reputation, lvl: g.stats.level, energy: g.stats.energy, gems: g.stats.gems, zara: { rel: zara.rel, vibe: zara.vibe, mem: zara.mem.map((m) => m.t) }, quests: g.quests.map((q) => q.kind + ':' + q.status + (q.pct ? ':' + q.pct + '%' : '') + (q.pendingDone ? ':pendingDone' : '')), later: g.posts.filter((x) => x.at > Date.now()).length, chron: g.chronicle.length, modals: window.__hype.S.modals.map((m) => m.t) }; });
  console.log('STATE1', JSON.stringify(st1, null, 1));
  const pub1 = await G(page, () => { const g = window.__hype.S.game; const p = g.posts.find((x) => x.a === 'p'); const cur = p.replies.find((r) => r.a === 'n:curieux_du_hall'); const tess = p.replies.find((r) => r.a === 'n:tess.astrale'); return { clues: (g.clues || []).map((k) => k.text), nested: !!(cur && tess && cur.to === tess.id), quote: g.posts.some((x) => x.q && x.q.a === 'p'), npcBio: (g.npcs.curieux_du_hall || {}).bio, replyNotif: (g.notifs.find((n) => n.k === 'reply' && n.p === p.id) || {}).text }; });
  console.log('PUBLIC', JSON.stringify(pub1));
  check('public replies answer each other, clue noted, post quoted, grouped notification', pub1.clues.length === 1 && pub1.nested && pub1.quote && !!pub1.npcBio && / ont répondu/.test(pub1.replyNotif || ''), pub1);
  check('post committed: zara rival + memory, mention quest done, story progress', st1.zara.vibe === 'rival' && st1.zara.mem.length >= 1 && st1.quests.some((q) => q.startsWith('mention:done')) && st1.quests.some((q) => q.includes(':pendingDone') || q.includes('%')), st1);

  // ---------- thread, reply, reply to a reply ----------
  await page.locator('.post', { hasText: 'lunettes de soleil' }).first().click();
  await page.waitForSelector('.layer .post-big');
  await sleep(400);
  await shot(page, 'thread');
  await page.locator('.layer .reply-row', { hasText: 'Tess Astrale' }).first().locator('.av-btn').click();
  await page.waitForSelector('.layer .prof .chip >> text=Habitué');
  await sleep(300);
  await shot(page, 'npc-profile');
  check('a regular of the public has a profile', (await page.$$('.layer:last-child .npc-reply')).length >= 1);
  await back(page);
  await page.fill('.layer .reply-box textarea', 'on verra bien qui porte les lunettes demain');
  await page.click('.layer .send');
  await sleep(5500);
  await dismiss(page);
  await page.locator('.layer .reply-row', { hasText: '8h c’est tôt' }).locator('button', { hasText: 'Répondre' }).click();
  await page.waitForSelector('.layer .reply-target');
  await page.fill('.layer .reply-box textarea', 'on en reparle à 8h01');
  await shot(page, 'reply-target');
  await page.click('.layer .send');
  await sleep(6000);
  await dismiss(page);
  await shot(page, 'thread-nested');
  const nest = await G(page, () => {
    const g = window.__hype.S.game;
    const p = g.posts.find((x) => x.text.includes('lunettes de soleil'));
    const mine = p.replies.filter((r) => r.a === 'p');
    const last = mine[mine.length - 1];
    return { lastTo: !!last.to, answers: p.replies.filter((r) => r.to === last.id).length, nestedRows: document.querySelectorAll('.reply-row.nested').length, replyc: g.stats.replyc };
  });
  check('reply to a comment is nested and counted', nest.lastTo && nest.answers >= 1 && nest.nestedRows >= 1 && nest.replyc === 1, nest);
  await back(page);

  // ---------- hashtag, quote, photo ----------
  await page.locator('.post .tag', { hasText: '#DuelDesGlycines' }).first().click();
  await page.waitForSelector('.tag-head');
  await sleep(300);
  await shot(page, 'tag-layer');
  check('hashtag opens its posts', (await page.$$('.layer .post')).length >= 1);
  await back(page);
  const quoteOf = page.locator('.post', { hasText: 'bibliothèque interdite' }).first();
  await quoteOf.locator('.act-q').click();
  await page.waitForSelector('.quote-wrap');
  await page.fill('#compose', 'moi aussi je l’ai vue clignoter. on enquête ?');
  await shot(page, 'compose-quote');
  await clickText(page, '.layer-head button', 'Publier');
  await sleep(9000);
  await dismiss(page);
  await clickFab(page);
  await page.waitForSelector('#compose');
  await clickText(page, '.ideas button', 'Photo');
  await page.fill('#photo-desc', 'mon café renversé sur le grimoire de potions, en pleine bibliothèque');
  await page.fill('#compose', 'premier jour, premier dégât');
  await sleep(300);
  await shot(page, 'compose-photo');
  await clickText(page, '.layer-head button', 'Publier');
  await sleep(9000);
  await dismiss(page);
  await shot(page, 'feed-photo-quote');
  const pq = await G(page, () => { const g = window.__hype.S.game; const mine = g.posts.filter((p) => p.a === 'p'); return { quote: mine.some((p) => p.q && p.q.text.includes('bibliothèque')), photo: (mine.find((p) => p.photo) || {}).photo || null, cards: document.querySelectorAll('.photo').length, quoteCards: document.querySelectorAll('.quote-card').length }; });
  check('quote and photo posts', pq.quote && pq.photo && pq.cards >= 1 && pq.quoteCards >= 1, pq);

  // ---------- DM with voice mode ----------
  await dismiss(page); await clickText(page, '.tab', 'Messages');
  await sleep(500);
  await shot(page, 'dms-list');
  await page.locator('.convo', { hasText: 'Nox' }).first().click();
  await page.waitForSelector('.bubbles');
  await page.fill('.layer .reply-box textarea', 'c’est qui toi au juste ?');
  await page.press('.layer .reply-box textarea', 'Enter');
  await sleep(6500);
  await shot(page, 'dm-convo');
  await page.click('.layer .voice-chip');
  await sleep(200);
  const vBefore = await G(page, () => window.__hype.S.game.dms.c4.msgs.length);
  await page.fill('.layer .reply-box textarea', 'ok je viendrai à minuit');
  await sleep(1300);
  await shot(page, 'voice-countdown');
  await sleep(2300);
  const vAfter = await G(page, () => ({ n: window.__hype.S.game.dms.c4.msgs.length, last: window.__hype.S.game.dms.c4.msgs.filter((m) => m.me).slice(-1)[0].text, mem: window.__hype.S.game.chars.c4.mem.length }));
  check('voice mode sends dictated text by itself', vAfter.n > vBefore && vAfter.last === 'ok je viendrai à minuit', { vBefore, vAfter });
  await sleep(5000);
  await page.click('.layer .voice-chip');
  await back(page);

  // ---------- character profile: dynamic goal ----------
  await G(page, () => { const t = window.__hype.charByHandle(window.__hype.S.game, 'theo.marlin'); if (t) t.age = 24; }); // (some are drawn older: a role apart, no romance)
  await clickText(page, '.tab', 'Profil');
  await sleep(300);
  await page.locator('.rel-row', { hasText: 'Théo' }).click();
  await page.waitForSelector('.vibe-goals');
  await clickText(page, '.vibe-opt', 'Crush');
  await sleep(400);
  await shot(page, 'char-vibe-goal');
  check('dynamic goal adds a relation quest', await G(page, () => window.__hype.S.game.quests.some((q) => q.kind === 'vibe' && q.status === 'active')));
  await back(page);

  // ---------- quests: action buttons ----------
  await clickText(page, '.tab', 'Quêtes');
  await sleep(400);
  await shot(page, 'quests');
  await overflowCheck(page, 'quests');
  const nActs = await page.$$eval('.quest-acts .btn', (b) => b.length);
  await page.locator('.quest-acts .btn', { hasText: 'Écrire à' }).first().click();
  await sleep(300);
  check('quest buttons open the right place', nActs >= 3 && (await G(page, () => (window.__hype.S.stack.slice(-1)[0] || {}).t)) === 'dm', nActs);
  await back(page);
  const gemsBefore = await G(page, () => window.__hype.S.game.stats.gems);
  await page.locator('.shop-item', { hasText: 'Mise en avant' }).locator('button').dblclick();
  await sleep(300);
  const push = await G(page, () => ({ gems: window.__hype.S.game.stats.gems, push: window.__hype.S.game.boosts.push, refill: window.__hype.SHOP.some((x) => x.id === 'refill') }));
  check('the shop sells a release push (bought once on a double tap), no more cafés for gems', push.push === true && push.gems === gemsBefore - 15 && !push.refill, { gemsBefore, push });

  // ---------- bad buzz: the file on Zara, then a call-out ----------
  await G(page, () => { const g = window.__hype.S.game; g.stats.energy = g.stats.maxEnergy; window.__hype.update(); });
  await clickText(page, '.tab', 'Profil');
  await sleep(300);
  await page.locator('.rel-row', { hasText: 'Zara' }).first().click();
  await page.waitForSelector('.accuse-row');
  await G(page, () => { const el = document.querySelector('.accuse-row'); el.scrollIntoView({ block: 'center' }); });
  await sleep(300);
  await shot(page, 'char-file');
  await clickText(page, '.accuse-row button', 'Lancer un bad buzz');
  await page.waitForSelector('.accuse-hint');
  const cites = await page.$$eval('.cite-list:not(.caps) .cite input', (x) => x.map((i) => i.checked));
  await page.fill('#compose', '@zara.vey a gagné son duel avec une potion de force interdite. la fiole violette dans sa manche, tout le monde l’a vue.');
  await shot(page, 'compose-accuse');
  await clickText(page, '.layer-head button', 'Accuser');
  await page.waitForSelector('.modal-card.badbuzz', { timeout: 20000 });
  await sleep(400);
  await shot(page, 'badbuzz-modal');
  await settle(page, 6000);
  const bb = await G(page, () => { const g = window.__hype.S.game; const z = g.chars.c1; return { bb: window.__hype.inBadBuzz(z), out: z.secretOut || '', rel: z.rel, post: (g.posts.find((p) => p.acc === 'c1') || {}).res, gate: g.posts.some((p) => /ZaraVeyGate/.test(p.text)) }; });
  check('call-out with evidence: Zara in bad buzz, secret out, #ZaraVeyGate', cites.length >= 1 && cites.every(Boolean) && bb.bb && /potion/.test(bb.out) && bb.post && bb.post.cred === 9 && bb.gate, { cites, bb });
  await back(page);

  // ---------- cancel: three paths ----------
  await G(page, () => { const g = window.__hype.S.game; window.__hype.repSet(g, 18); g.stats.energy = g.stats.maxEnergy; window.__hype.update(); });
  await clickText(page, '.tab', 'Fil');
  await clickFab(page);
  await page.fill('#compose', 'franchement la maison Marée c’est que des losers');
  await clickText(page, '.layer-head button', 'Publier');
  for (let k = 0; k < 40 && !(await page.$('.modal .paths')); k++) { await sleep(500); if ((await page.$('.modal')) && !(await page.$('.modal .paths'))) await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); }
  await page.waitForSelector('.modal .paths', { timeout: 5000 });
  await sleep(500);
  await shot(page, 'cancel-modal');
  await clickText(page, '.modal .path', 'profil bas');
  await sleep(600);
  await dismiss(page);
  await shot(page, 'low-profile');
  const low = await G(page, () => { const g = window.__hype.S.game; return { low: !!g.low, cancelled: g.stats.cancelled, rep: g.stats.reputation, hashtag: g.posts.some((p) => /EstFinie/.test(p.text)) }; });
  check('cancel: low profile active, cancel hashtag trends', low.low && low.cancelled && low.hashtag, low);
  await clickFab(page);
  await sleep(300);
  check('low profile blocks posting', await G(page, () => document.querySelector('.layer-head .btn-hot').disabled));
  await clickText(page, '.layer .low-banner button', 'Arrêter');
  await back(page);
  await G(page, () => { window.__hype.S.game.apologyAt = 0; });
  await clickText(page, '.cancel-banner button', 'M’excuser');
  await page.waitForSelector('.apology-hint');
  await page.fill('#compose', 'je vous dois des excuses, Marée. c’était nul et méchant, je retire tout.');
  await shot(page, 'compose-apology');
  const repBefore = await G(page, () => window.__hype.S.game.stats.reputation);
  await clickText(page, '.layer-head button', 'Publier');
  await sleep(9000);
  await dismiss(page);
  const repAfter = await G(page, () => ({ rep: window.__hype.S.game.stats.reputation, cancelled: window.__hype.S.game.stats.cancelled }));
  check('sincere apology raises reputation', repAfter.rep >= repBefore + 15, { repBefore, repAfter });
  await shot(page, 'after-apology');

  // ---------- delete a post (confirmation) ----------
  await page.locator('.post', { hasText: 'premier dégât' }).first().click();
  await page.waitForSelector('.layer .post-big');
  await clickText(page, '.post-time-full button', 'Supprimer');
  await page.waitForSelector('.modal-title');
  await shot(page, 'confirm-delete-post');
  await sleep(500);
  await page.click('.modal .btn-danger-solid');
  await sleep(600);
  check('post deleted after confirmation', !(await G(page, () => window.__hype.S.game.posts.some((p) => p.text === 'premier dégât'))));
  await dismiss(page);

  // ---------- refresh ----------
  await G(page, () => { window.__hype.S.game.lastRefreshAt = 0; });
  await clickText(page, '.feed-tools button', 'Actualiser');
  await sleep(6000);
  await shot(page, 'feed-refreshed');
  check('refresh schedules a later post', await G(page, () => window.__hype.S.game.posts.some((p) => p.at > Date.now() + 30000)));
  const arc1 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const pr = window.__prompts.filter((x) => x.includes('Le joueur actualise son fil')).slice(-1)[0] || '';
    const next = H.promptRefresh(g, 0, []);
    const real = { world: { preset: 'reel' }, refreshes: 9, arcRefresh: 0, lastArcAt: 0, usedNews: [] };
    const r0 = Math.random;
    Math.random = () => 0.1;
    let news; try { news = H.pickArc(real); } finally { Math.random = r0; }
    const trolls = ['troll, répond à tout par un mème', 'Lectrice de contrats amateur, pose des questions'].map((b) => H.isTroll({ bio: b }));
    return { arcs: (g.arcs || []).map((a) => a.kind + ':' + a.title + ' ' + a.tag), asked: /## NOUVEAU SUJET À LANCER/.test(pr), notif: g.notifs.some((n) => n.k === 'trend' && n.tg === '#ChaudronGate'), inCtx: next.includes('## SUJETS DU MOMENT') && next.includes('#ChaudronGate'), again: !H.pickArc(g), news: !!news && news.kind === 'drama', trolls: trolls.join() };
  });
  check('the world starts its own storylines (a drama, a trend, now and then a troll one; never a troll in the real world)', arc1.arcs.length === 1 && /Qui a volé le chaudron/.test(arc1.arcs[0]) && arc1.asked && arc1.notif && arc1.inCtx && arc1.again && arc1.news && arc1.trolls === 'true,false', arc1);

  // ---------- refused -> rollback ----------
  const before = await G(page, () => ({ e: window.__hype.budgetOf(window.__hype.S.game).used, n: window.__hype.S.game.posts.length }));
  await G(page, () => { window.__sampleMode = 'refuse'; });
  await clickFab(page);
  await page.fill('#compose', 'test refus');
  await clickText(page, '.layer-head button', 'Publier');
  await sleep(1500);
  const after = await G(page, () => ({ e: window.__hype.budgetOf(window.__hype.S.game).used, n: window.__hype.S.game.posts.length, draft: window.__hype.S.drafts.post, top: (window.__hype.S.stack.slice(-1)[0] || {}).t }));
  check('refused post rolled back, draft restored, no café charged', after.n === before.n && after.draft === 'test refus' && after.top === 'compose' && after.e === before.e, { before, after });
  await shot(page, 'refused');
  await G(page, () => { window.__sampleMode = 'ok'; });
  await back(page);

  // ---------- fake proof that passes, then a counter-investigation takes it apart ----------
  const fresh = (rep) => G(page, (r) => { const H = window.__hype, g = H.S.game, P = H.ensureRep(g.stats); for (const k of Object.keys(P)) P[k] = r; Object.assign(g.stats, { reputation: r, cancelled: false, energy: g.stats.maxEnergy }); g.pbb = null; g.low = null; H.update(); }, rep); // (the four pillars too: the next move of reputation is computed from them)
  await fresh(60);
  await clickText(page, '.tab', 'Profil');
  await sleep(300);
  await page.locator('.rel-row', { hasText: 'Nox' }).first().click();
  await page.waitForSelector('.accuse-row');
  await clickText(page, '.accuse-row button', 'Lancer un bad buzz');
  await page.waitForSelector('.accuse-hint');
  await page.fill('#compose', '@nox.ombre fait chanter des élèves avec leurs secrets. regardez ce qu’il écrit.');
  await clickText(page, '.fake-add', 'Fabriquer une fausse preuve');
  await page.waitForSelector('#fake-desc');
  const emptyBlocked = await G(page, () => document.querySelector('.layer-head .btn-danger-solid').disabled);
  await clickText(page, '.fake-kinds button', 'Capture');
  await page.fill('#fake-desc', '@nox.ombre à un élève : « paie ou tout Lumen saura ce que t’as fait »');
  await sleep(200);
  await shot(page, 'compose-fake');
  await clickText(page, '.layer-head button', 'Accuser');
  await page.waitForSelector('.modal-card.badbuzz', { timeout: 20000 });
  const passModal = await page.textContent('.modal-card.badbuzz');
  await shot(page, 'fake-pass-modal');
  await settle(page, 6000);
  const pass = await G(page, () => {
    const H = window.__hype, g = H.S.game, n = H.charByHandle(g, 'nox.ombre');
    const p = g.posts.find((x) => x.acc === n.id && x.ev);
    const fk = g.fakes.slice(-1)[0];
    const prompt = H.S && window.__prompts.filter((x) => x.includes('LANCE UN BAD BUZZ')).slice(-1)[0] || '';
    return { bb: H.inBadBuzz(n), framed: !!n.framed, ev: p && p.ev, res: p && p.res && p.res.fake, fk: fk && { state: fk.state, q: fk.q, debunk: !!(fk.debunk && fk.debunk.text) }, prompt: /FAUSSE/.test(prompt) && /Vigilance du public/.test(prompt), cancelled: g.stats.cancelled, followers: g.stats.followers };
  });
  check('fake proof that passes: Nox in bad buzz, proof on the post, counter-post kept hidden', emptyBlocked && pass.bb && pass.framed && pass.ev && pass.ev.fake && !pass.ev.busted && pass.res && pass.res.q === 8 && !pass.res.busted && pass.fk.debunk && pass.prompt && !pass.cancelled && /mordu/.test(passModal), { emptyBlocked, pass });
  await back(page);
  await clickText(page, '.tab', 'Fil');
  await sleep(300);
  await page.locator('.post', { hasText: 'fait chanter des élèves' }).first().click();
  await page.waitForSelector('.layer .post-big .evidence');
  await sleep(300);
  await shot(page, 'post-fake-evidence');
  await back(page);
  await G(page, () => { const fk = window.__hype.S.game.fakes.slice(-1)[0]; fk.state = 'live'; fk.later = Date.now() - 1000; }); // the counter-investigation is due
  await page.waitForSelector('.modal-card.busted', { timeout: 8000 });
  await sleep(400);
  await shot(page, 'busted-late-modal');
  const late = await G(page, () => {
    const H = window.__hype, g = H.S.game, n = H.charByHandle(g, 'nox.ombre');
    const p = g.posts.find((x) => x.acc === n.id && x.ev);
    return { state: g.fakes.slice(-1)[0].state, evBusted: !!(p && p.ev.busted), cancelled: g.stats.cancelled, pbb: H.playerBadBuzz(g), noxBB: H.inBadBuzz(n), debunk: g.posts.some((x) => /25h12/.test(x.text)), tag: g.posts.some((x) => /MilaFluxFake/.test(x.text)), followers: g.stats.followers, rel: n.rel, cancelModal: H.S.modals.some((m) => m.t === 'cancel') };
  });
  check('counter-investigation: fake exposed later, player cancelled and in bad buzz, Nox cleared', late.state === 'busted' && late.evBusted && late.cancelled && late.pbb && !late.noxBB && late.debunk && late.tag && late.followers < pass.followers && !late.cancelModal, late);
  await dismiss(page);
  await page.locator('.post', { hasText: 'fait chanter des élèves' }).first().click();
  await page.waitForSelector('.layer .post-big .ev-stamp');
  await sleep(300);
  await shot(page, 'post-fake-stamp');
  await back(page);

  // ---------- fake proof spotted on the spot ----------
  await fresh(70);
  await clickText(page, '.tab', 'Profil');
  await sleep(300);
  await page.locator('.rel-row', { hasText: 'Léandre' }).first().click();
  await page.waitForSelector('.accuse-row');
  await clickText(page, '.accuse-row button', 'Lancer un bad buzz');
  await page.waitForSelector('.accuse-hint');
  await page.fill('#compose', '@leandre.aube vole les copies des examens. la preuve en photo.');
  await clickText(page, '.fake-add', 'Fabriquer une fausse preuve');
  await clickText(page, '.fake-kinds button', 'Photo');
  await page.fill('#fake-desc', 'Léandre qui sort du bureau de la directrice avec une pile de copies, le soir du bal');
  const fol1 = await G(page, () => window.__hype.S.game.stats.followers);
  await clickText(page, '.layer-head button', 'Accuser');
  await page.waitForSelector('.modal-card.busted', { timeout: 20000 });
  await sleep(400);
  await shot(page, 'busted-now-modal');
  const nowBust = await G(page, () => {
    const H = window.__hype, g = H.S.game, l = H.charByHandle(g, 'leandre.aube');
    const p = g.posts.find((x) => x.acc === l.id && x.ev);
    return { res: p && p.res && p.res.fake, evBusted: !!(p && p.ev.busted), cancelled: g.stats.cancelled, rep: g.stats.reputation, pbb: H.playerBadBuzz(g), leBB: H.inBadBuzz(l), followers: g.stats.followers, busts: g.stats.busts, cancelModal: H.S.modals.some((m) => m.t === 'cancel'), banner: !!document.querySelector('.cancel-banner') };
  });
  check('fake spotted on the spot: huge bad buzz for the player, Léandre spared', nowBust.res && nowBust.res.busted && nowBust.evBusted && nowBust.cancelled && nowBust.rep <= 12 && nowBust.pbb && !nowBust.leBB && nowBust.followers < fol1 * 0.9 && nowBust.busts === 2 && !nowBust.cancelModal, { fol1, nowBust });
  await dismiss(page);
  await shot(page, 'char-after-bust');
  await back(page);
  await settle(page, 2500);

  // ---------- announced video: countdown, time accelerator, shoot, postpone, release ----------
  const idle = async (ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm); })) await sleep(300); };
  await G(page, () => { window.__hype.S.mgForce = 'ai'; }); // the shoots below are written by (mocked) Claude, never a random skill round
  await fresh(60);
  await clickText(page, '.tab', 'Fil');
  await sleep(300);
  await clickFab(page);
  await page.fill('#compose', 'ma vidéo sur les magouilles de @leandre.aube sort dans 1h. je vais tout prouver.');
  await clickText(page, '.layer-head button', 'Publier');
  await page.waitForSelector('.release-card', { timeout: 20000 });
  await idle();
  await settle(page, 3000);
  const rel0 = await G(page, () => { const g = window.__hype.S.game; const r = g.releases.slice(-1)[0]; return r && { state: r.state, left: Math.round((r.due - Date.now()) / 60000), c: r.c, topic: r.topic }; });
  check('announced video: a countdown starts', !!rel0 && rel0.state === 'scheduled' && rel0.left >= 58 && rel0.left <= 60 && !!rel0.c, rel0);
  await shot(page, 'release-countdown');
  const t0 = await G(page, () => { const g = window.__hype.S.game; const p = g.posts.find((x) => /sort dans 1h/.test(x.text)); return { ts: p.ts, energyAt: g.stats.energyAt, n: g.posts.length }; });
  await noToasts(page);
  await page.click('.status-strip .clock-btn'); // 0.15: on a phone, the clock is the watch's only button
  await page.waitForSelector('.modal svg.watch');
  await sleep(300);
  await shot(page, 'skip-sheet');
  await clickText(page, '.modal .chip-btn', '+15 min');
  await clickText(page, '.modal .btn-hot', 'Avancer de 15 min');
  await sleep(800);
  await idle();
  const t1 = await G(page, (a) => { const g = window.__hype.S.game; const p = g.posts.find((x) => /sort dans 1h/.test(x.text)); const r = g.releases.slice(-1)[0]; return { moved: Math.round((a.ts - p.ts) / 60000), energyAt: g.stats.energyAt === a.energyAt, n: g.posts.length - a.n, left: Math.round((r.due - Date.now()) / 60000), narrated: window.__prompts.slice(-1)[0].includes('Le temps passe en accéléré') }; }, t0);
  check('time accelerator: 15 min later, the network moved on, coffees untouched', t1.moved === 15 && t1.energyAt && t1.n >= 3 && t1.left >= 43 && t1.left <= 45 && t1.narrated, t1);
  await clickText(page, '.release-card button', 'Avancer jusqu');
  await page.waitForSelector('.release-card.due', { timeout: 15000 });
  await idle();
  await settle(page, 1500);
  await shot(page, 'release-due');
  await clickText(page, '.release-card button', 'Tourner');
  await page.waitForSelector('.mg-setup', { timeout: 10000 });
  await sleep(300);
  await shot(page, 'shoot-setup');
  await clickText(page, '.mg-setup > .btn', 'Lancer le tournage');
  await page.waitForSelector('.mg-intro', { timeout: 20000 });
  await sleep(300);
  await shot(page, 'shoot-intro');
  await clickText(page, '.mg-intro button', 'parti');
  for (let k = 0; k < 6; k++) { await page.waitForSelector('.mg-actions .btn-hot:not([disabled])', { timeout: 8000 }); if (k === 1) await shot(page, 'shoot-play'); await page.click('.mg-actions .btn-hot'); await sleep(1350); }
  await page.waitForSelector('.mg-result', { timeout: 10000 });
  await sleep(300);
  await shot(page, 'shoot-result-mid');
  const mid = await G(page, () => window.__hype.S.game.releases.slice(-1)[0].played);
  // the result is disappointing: back to the automatic save taken just before the shoot, and play it again, without postponing
  await back(page);
  await page.click('.save-btn');
  await page.waitForSelector('.modal .saves-card');
  await sleep(300);
  await shot(page, 'saves-before-shoot');
  await page.locator('.modal .save-row', { hasText: 'Avant le tournage' }).first().locator('button', { hasText: 'Charger' }).click();
  await page.waitForSelector('.modal-title');
  await sleep(600);
  await page.click('.modal .btn-danger-solid');
  await page.waitForFunction(() => { const r = window.__hype.S.game.releases.slice(-1)[0]; return r && !r.played; }, null, { timeout: 10000 });
  await sleep(800);
  const redo = await G(page, () => { const r = window.__hype.S.game.releases.slice(-1)[0]; return { state: r.state, played: r.played, delays: r.delays, tries: r.tries || 0, game: !!r.game, card: (document.querySelector('.release-card') || {}).textContent || '' }; });
  check('a shoot you did not like: the automatic save from just before brings it back, to play again without postponing', redo.state === 'scheduled' && !redo.played && redo.delays === 0 && redo.tries === 0 && !redo.game && /Tourner/.test(redo.card), redo);
  await clickText(page, '.release-card button', 'Tourner');
  await page.waitForSelector('.mg-setup', { timeout: 10000 });
  await clickText(page, '.mg-setup > .btn', 'Lancer le tournage');
  await page.waitForSelector('.mg-intro', { timeout: 20000 });
  await clickText(page, '.mg-intro button', 'parti');
  for (let k = 0; k < 6; k++) { await page.waitForSelector('.mg-actions .btn-hot:not([disabled])', { timeout: 8000 }); await page.click('.mg-actions .btn-hot'); await sleep(1350); }
  await page.waitForSelector('.mg-result', { timeout: 10000 });
  await sleep(300);
  const rep1 = await G(page, () => window.__hype.S.game.stats.reputation);
  await clickText(page, '.mg-result button', 'Repousser');
  await page.waitForSelector('.layer .move-opts .chip-btn'); // (0.28.1: the player picks the new time; at its time, it costs)
  await sleep(500);
  await clickText(page, '.layer .move-opts .chip-btn', '30 min plus tard');
  await sleep(900);
  const post1 = await G(page, () => { const g = window.__hype.S.game; const r = g.releases.slice(-1)[0]; return { delays: r.delays, left: Math.round((r.due - Date.now()) / 60000), rep: g.stats.reputation, played: r.played, game: r.game, layer: window.__hype.S.stack.some((l) => l.t === 'minigame') }; });
  await sleep(7000);
  const tag1 = await G(page, () => window.__hype.S.game.posts.some((p) => /OùEstLaVidéo/.test(p.text)));
  check('half-done shoot then postpone: reputation down (credibility first), 30 more minutes, the public mocks', mid && mid.tier === 'mid' && post1.delays === 1 && post1.left >= 29 && post1.left <= 30 && post1.rep < rep1 && !post1.played && !post1.game && !post1.layer && tag1, { mid, post1, rep1, tag1 });
  await clickText(page, '.release-card button', 'Avancer jusqu');
  await page.waitForSelector('.release-card.due', { timeout: 15000 });
  await idle();
  await settle(page, 1500);
  await clickText(page, '.release-card button', 'Tourner');
  await page.waitForSelector('.mg-setup', { timeout: 10000 });
  await page.fill('#rl-topic', 'Les votes achetés par Léandre au conseil des maisons');
  const plotField = await G(page, () => { const el = document.getElementById('rl-plot'); return el ? { label: document.querySelector('label[for="rl-plot"]').textContent, ph: el.getAttribute('placeholder'), max: el.getAttribute('maxlength') } : null; });
  await page.fill('#rl-plot', 'je montre le procès-verbal du conseil, puis les messages de Léandre qui achète trois voix, et je finis devant la salle du vote');
  await clickText(page, '.diff-opt', 'Expert');
  await sleep(200);
  await shot(page, 'shoot-setup-expert');
  await clickText(page, '.mg-setup > .btn', 'Lancer le tournage');
  await page.waitForSelector('.mg-intro', { timeout: 20000 });
  const setup2 = await G(page, () => { const r = window.__hype.S.game.releases.slice(-1)[0]; const pr = window.__prompts.filter((x) => x.includes('LE MINI-JEU DU TOURNAGE')).slice(-1)[0] || ''; return { topic: r.topic, diff: r.diff, gameDiff: r.game && r.game.diff, inPrompt: pr.includes('« Les votes achetés par Léandre au conseil des maisons »') && pr.includes('Difficulté choisie : Expert') && +((/"tri" : (\d+) éléments/.exec(pr) || [])[1] || 0) >= 7, intro: document.querySelector('.mg-intro .chip').textContent,
    plot: r.plot, plotPrompt: pr.includes('Ce qui se passe dedans, raconté par le joueur : « je montre le procès-verbal du conseil, puis les messages de Léandre qui achète trois voix, et je finis devant la salle du vote ». Le mini-jeu porte sur CE contenu-là.') }; });
  check('shoot setup: the player fixes the topic and picks Expert', setup2.topic === 'Les votes achetés par Léandre au conseil des maisons' && setup2.diff === 'expert' && setup2.gameDiff === 'expert' && setup2.inPrompt && /Expert/.test(setup2.intro), setup2);
  check('shoot setup: « Ce qui se passe dans la vidéo » (optional, 300 characters): the mini-game is written from it', !!plotField && /Ce qui se passe dans la vidéo/.test(plotField.label) && /facultatif/.test(plotField.label) && /^ex : /.test(plotField.ph) && plotField.max === '300' && setup2.plot === 'je montre le procès-verbal du conseil, puis les messages de Léandre qui achète trois voix, et je finis devant la salle du vote' && setup2.plotPrompt, { plotField, plot: setup2.plot, plotPrompt: setup2.plotPrompt });
  await clickText(page, '.mg-intro button', 'parti');
  for (let k = 0; k < 6; k++) {
    await page.waitForSelector('.mg-actions .btn-hot:not([disabled])', { timeout: 8000 });
    const txt = await page.textContent('.mg-card p');
    await page.click(/procès-verbal|vote truqué|messages de Léandre/.test(txt) ? '.mg-actions .btn-hot' : '.mg-actions .btn-ghost');
    await sleep(1350);
  }
  await page.waitForSelector('.mg-result.top', { timeout: 10000 });
  await sleep(300);
  await shot(page, 'shoot-result-top');
  await studioSteps(page);
  await clickText(page, '.mg-result button', 'Publier');
  await page.waitForSelector('.video-card', { timeout: 20000 });
  await idle();
  await settle(page, 7000);
  const out = await G(page, () => {
    const H = window.__hype, g = H.S.game, r = g.releases.slice(-1)[0], l = H.charByHandle(g, 'leandre.aube');
    const p = g.posts.find((x) => x.video);
    const pub = window.__prompts.filter((x) => x.includes('Le joueur publie enfin')).slice(-1)[0] || '';
    return { state: r.state, tier: r.tier, post: !!p, res: p && p.res && { fol: p.res.fol, verdict: p.res.verdict, cred: p.res.cred, diff: p.res.video && p.res.video.diff }, likes: p && p.likeT, comments: p && { written: p.replies.length, crowd: p.rT }, leBB: H.inBadBuzz(l), card: !!document.querySelector('.release-card'),
      plot: p && p.video && p.video.plot, pubPlot: pub.includes('Ce qui se passe dedans (le joueur le raconte, c’est ce qu’on voit vraiment) : « je montre le procès-verbal du conseil, puis les messages de Léandre qui achète trois voix, et je finis devant la salle du vote »'), ctxPlot: H.promptRefresh(g, 0, [], false, null, []).includes(' — je montre le procès-verbal du conseil, puis les messages de Léandre qui achète trois voix, et je finis devant la salle du vote]') };
  });
  check('aced shoot: the video is out and does great, Léandre in bad buzz', out.state === 'released' && out.tier === 'top' && out.post && out.res && out.res.fol > 0 && out.res.cred === 8 && out.res.diff === 'expert' && out.leBB && !out.card && out.comments.crowd >= 1, out);
  check('at its release the AI knows what happens in the video, and later prompts still do', out.plot === 'je montre le procès-verbal du conseil, puis les messages de Léandre qui achète trois voix, et je finis devant la salle du vote' && out.pubPlot && out.ctxPlot, { plot: out.plot, pubPlot: out.pubPlot, ctxPlot: out.ctxPlot });
  await shot(page, 'video-post');

  // ---------- v6: Léandre promises an answer « ce soir en live » in a comment: a ⏩ right under it ----------
  await G(page, () => { const g = window.__hype.S.game; g.stats.energy = g.stats.maxEnergy; window.__hype.update(); });
  await calm(page);
  await page.locator('.post', { hasText: 'la vidéo est en ligne' }).first().click();
  await page.waitForSelector('.layer .post-big');
  await page.fill('.layer .reply-box textarea', '@leandre.aube alors, tu réponds quand ? tout le monde attend');
  await calm(page);
  await page.click('.layer .send');
  await page.waitForSelector('.layer .reply-row .evt-chip', { timeout: 25000 });
  await idle();
  await settle(page, 2000);
  const ev0 = await G(page, () => {
    const H = window.__hype, g = H.S.game, l = H.charByHandle(g, 'leandre.aube');
    const ev = H.activeEvents(g).find((e) => e.c === l.id);
    if (!ev) return null;
    const p = g.posts.find((x) => x.id === (ev.src && ev.src.p));
    const r = p && p.replies.find((x) => x.id === ev.src.r);
    return { kind: ev.kind, player: ev.player, left: Math.round((ev.due - Date.now()) / 60000), under: r ? r.text : '', bb: !!ev.bb, waits: l.badBuzz.until > ev.due, chip: (document.querySelector('.layer .reply-row .evt-chip') || {}).textContent || '' };
  });
  check('Léandre promises a live tonight: an event, a ⏩ under his comment, his bad buzz waits for it', !!ev0 && ev0.kind === 'live' && !ev0.player && ev0.left >= 298 && ev0.left <= 300 && /En live/.test(ev0.under) && ev0.bb && ev0.waits && /Avancer/.test(ev0.chip), ev0);
  await G(page, () => { document.querySelector('.layer .reply-row .evt-chip').scrollIntoView({ block: 'center' }); });
  await sleep(300);
  await shot(page, 'event-under-reply');
  await back(page);

  // ---------- a second video while he is down: aced (≥ 80 %), Léandre is buried ----------
  await G(page, () => { const g = window.__hype.S.game; g.stats.energy = g.stats.maxEnergy; window.__hype.update(); });
  await clickFab(page);
  await page.fill('#compose', 'ma deuxième vidéo sur @leandre.aube sort dans 1h. cette fois j’ai les comptes du trésorier.');
  await clickText(page, '.layer-head button', 'Publier');
  await page.waitForSelector('.release-card', { timeout: 20000 });
  await idle();
  await settle(page, 3000);
  // only 40 s left on the countdown: « Avancer jusqu’à la sortie » still jumps there (quietly, no AI call)
  const short0 = await G(page, () => { const H = window.__hype, g = H.S.game, r = H.activeRelease(g); r.due = Date.now() + 40000; H.update(); return { n: window.__prompts.length, due: r.due }; });
  await sleep(300);
  await clickText(page, '.release-card button', 'Avancer jusqu');
  await page.waitForSelector('.release-card.due', { timeout: 15000 });
  await sleep(600);
  const short1 = await G(page, (a) => { const H = window.__hype, g = H.S.game, r = H.activeRelease(g); return { due: r && r.due <= Date.now(), moved: Math.round((a.due - r.due) / 1000), calls: window.__prompts.length - a.n, toast: [...document.querySelectorAll('.toast')].map((x) => x.textContent).join(' | ') }; }, short0);
  check('« Avancer jusqu’à la sortie » with under a minute left: the clock jumps there, no narration call', short1.due && short1.moved >= 39 && short1.moved <= 42 && short1.calls === 0 && /Quelques secondes plus tard/.test(short1.toast), short1);
  await idle();
  await settle(page, 1500);
  await clickText(page, '.release-card button', 'Tourner');
  await page.waitForSelector('.mg-setup', { timeout: 10000 });
  await clickText(page, '.mg-setup > .btn', 'Lancer le tournage');
  await page.waitForSelector('.mg-intro', { timeout: 20000 });
  await clickText(page, '.mg-intro button', 'parti');
  for (let k = 0; k < 6; k++) {
    await page.waitForSelector('.mg-actions .btn-hot:not([disabled])', { timeout: 8000 });
    const txt = await page.textContent('.mg-card p');
    await page.click(/procès-verbal|vote truqué|messages de Léandre/.test(txt) ? '.mg-actions .btn-hot' : '.mg-actions .btn-ghost');
    await sleep(1350);
  }
  await page.waitForSelector('.mg-result.top', { timeout: 10000 });
  await studioSteps(page);
  await clickText(page, '.mg-result button', 'Publier');
  await page.waitForFunction(() => { const r = window.__hype.S.game.releases.slice(-1)[0]; return r && r.state === 'released'; }, null, { timeout: 25000 });
  await idle();
  await settle(page, 5000);
  const bury = await G(page, () => { const H = window.__hype, g = H.S.game, l = H.charByHandle(g, 'leandre.aube'); return { buried: !!l.buried, bb: H.inBadBuzz(l), esc: H.escapeChance(l), notif: g.notifs.some((n) => n.k === 'badbuzz' && n.c === l.id && /enterré/.test(n.text)), tags: [...document.querySelectorAll('.bb-tag')].map((x) => x.textContent).join(',') }; });
  check('a second aced video while he is down: Léandre is buried, no way out any more', bury.buried && bury.bb && bury.esc === 0 && bury.notif && /enterré/.test(bury.tags), bury);
  await shot(page, 'buried');

  // ---------- tonight: ⏩ to Léandre's live; buried, whatever he says it gets worse ----------
  await noToasts(page);
  await G(page, () => { document.querySelector('.view').scrollTop = 0; });
  await page.waitForSelector('.events-strip .evt-chip');
  await sleep(300);
  await shot(page, 'events-strip');
  const fol2 = await G(page, () => window.__hype.charByHandle(window.__hype.S.game, 'leandre.aube').followers);
  await clickText(page, '.events-strip .evt-chip button', 'Avancer');
  const liveToast = page.locator('.toast', { hasText: 'Le live de Léandre commence' });
  await liveToast.waitFor({ timeout: 15000 });
  await shot(page, 'event-due-toast');
  await liveToast.locator('button').click();
  await page.waitForSelector('.layer .post-big .evt-card', { timeout: 25000 });
  await idle();
  await settle(page, 2500);
  await shot(page, 'live-recap');
  const live = await G(page, (f0) => {
    const H = window.__hype, g = H.S.game, l = H.charByHandle(g, 'leandre.aube');
    const ev = g.events.find((e) => e.c === l.id && e.kind === 'live');
    const p = ev && g.posts.find((x) => x.id === ev.out);
    const pr = window.__prompts.filter((x) => x.includes('L’ÉVÉNEMENT A LIEU')).slice(-1)[0] || '';
    return { state: ev && ev.state, line: p && p.evt && p.evt.outcome ? p.evt.outcome.line : '', recap: !!(p && p.evt && p.evt.recap), bb: H.inBadBuzz(l), fol: l.followers < f0, prompt: /enterré/.test(pr) && /Issue décidée par le jeu/.test(pr), card: (document.querySelector('.layer .evt-card') || {}).textContent || '' };
  }, fol2);
  check('the live happens: a recap, and the game decides it gets worse for him', live.state === 'done' && /enfonce/.test(live.line) && live.recap && live.bb && live.fol && live.prompt && /Live terminé/.test(live.card), live);
  await back(page);

  // ---------- dates: one set in DMs with Nox, then a second at the same time with Théo → the player chooses ----------
  await clickText(page, '.tab', 'Messages');
  await sleep(400);
  await page.locator('.convo', { hasText: 'Nox' }).first().click();
  await page.waitForSelector('.bubbles');
  await page.fill('.layer .reply-box textarea', 'et si on allait au resto du lac ce soir ? c’est moi qui invite');
  await page.press('.layer .reply-box textarea', 'Enter');
  await page.waitForSelector('.layer .bubbles .evt-chip', { timeout: 25000 });
  await idle();
  await sleep(1500);
  const d1 = await G(page, () => { const H = window.__hype, g = H.S.game, n = H.charByHandle(g, 'nox.ombre'); const ev = H.activeEvents(g).find((e) => e.c === n.id); return ev && { kind: ev.kind, player: ev.player, diff: ev.diff, left: Math.round((ev.due - Date.now()) / 60000), dm: !!(ev.src && ev.src.dm === n.id), mem: n.mem.some((m) => /rendez-vous/.test(m.t)) }; });
  check('a date set in DMs: an event with Nox (not that famous: easy), a chip in the conversation', !!d1 && d1.kind === 'rdv' && d1.player && d1.diff === 'facile' && d1.left >= 118 && d1.left <= 120 && d1.dm && d1.mem, d1);
  await shot(page, 'dm-date');
  await back(page);
  await page.locator('.convo', { hasText: 'Théo' }).first().click();
  await page.waitForSelector('.bubbles');
  await page.fill('.layer .reply-box textarea', 'resto ce soir, toi et moi ? j’ai plein de trucs à te raconter');
  await page.press('.layer .reply-box textarea', 'Enter');
  await page.waitForSelector('.modal .paths', { timeout: 25000 });
  await sleep(600);
  await shot(page, 'date-clash');
  const clashTxt = await page.textContent('.modal-card');
  const theoRel1 = await G(page, () => window.__hype.S.game.chars.c2.rel);
  await clickText(page, '.modal .path', 'Garder Nox');
  await sleep(4500);
  const cl = await G(page, (r1) => { const H = window.__hype, g = H.S.game, t = g.chars.c2; const ev = g.events.filter((e) => e.c === 'c2').slice(-1)[0]; const msgs = g.dms.c2.msgs; return { state: ev && ev.state, drop: r1 - t.rel, card: msgs.some((m) => m.sys === 'cancel'), reply: (msgs.filter((m) => !m.me && !m.sys).slice(-1)[0] || {}).text, mem: t.mem.some((m) => /annulé/.test(m.t)), left: H.activeEvents(g).filter((e) => e.player).length }; }, theoRel1);
  check('two dates at the same time: the game asks; Théo, cancelled 2 h before, takes it badly', /Deux rendez-vous/.test(clashTxt) && cl.state === 'cancelled' && cl.drop === 6 && cl.card && !!cl.reply && cl.mem && cl.left === 1, { clashTxt, cl });
  await shot(page, 'dm-cancel-card');
  await back(page);

  // ---------- the date: ⏩ to tonight, a quiz about Nox, the evening ends in DMs ----------
  await page.locator('.convo', { hasText: 'Nox' }).first().click();
  await page.waitForSelector('.layer .bubbles .evt-chip');
  const noxRel0 = await G(page, () => window.__hype.charByHandle(window.__hype.S.game, 'nox.ombre').rel);
  await clickText(page, '.layer .bubbles .evt-chip button', 'Avancer');
  await page.waitForSelector('.layer .bubbles .evt-chip.due', { timeout: 15000 });
  await idle();
  await settle(page, 1500);
  await clickText(page, '.layer .bubbles .evt-chip.due button', 'Y aller');
  await page.waitForSelector('.layer .date-head', { timeout: 10000 });
  await sleep(300);
  await shot(page, 'date-setup');
  await clickText(page, '.layer .mg-setup .btn', 'C’est parti');
  await page.waitForSelector('.mg-intro', { timeout: 20000 });
  await sleep(300);
  await shot(page, 'date-intro');
  const dIntro = await page.textContent('.mg-intro');
  await clickText(page, '.mg-intro button', 'parti');
  const RIGHT = ['pas du tout, j’admirais le lac', 'évidemment, je suis une tombe', 'lui tendre ta serviette'];
  for (let k = 0; k < 3; k++) {
    await page.waitForSelector('.mg-opt:not([disabled])', { timeout: 8000 });
    if (k === 1) await shot(page, 'date-quiz');
    const opts = await page.$$eval('.mg-opt', (b) => b.map((x) => x.textContent.trim()));
    const j = Math.max(0, opts.findIndex((t) => RIGHT.includes(t)));
    await page.click(`.mg-opt >> nth=${j}`);
    await sleep(1650);
  }
  await page.waitForSelector('.mg-result.top', { timeout: 10000 });
  await sleep(300);
  await shot(page, 'date-result');
  await clickText(page, '.mg-result button', 'Voir comment la soirée se termine');
  await page.waitForSelector('.layer .dm-card.top', { timeout: 25000 });
  await settle(page, 5000);
  await shot(page, 'date-end-dm');
  const dt = await G(page, (r0) => {
    const H = window.__hype, g = H.S.game, n = H.charByHandle(g, 'nox.ombre');
    const ev = g.events.filter((e) => e.c === n.id && e.player).slice(-1)[0];
    const msgs = g.dms[n.id].msgs;
    const pr = window.__prompts.filter((x) => x.includes('LE MINI-JEU DU RENDEZ-VOUS')).slice(-1)[0] || '';
    return { state: ev.state, res: ev.result, up: n.rel - r0, card: msgs.some((m) => m.sys === 'rdv' && m.tier === 'top'), msg: msgs.some((m) => /merci pour ce soir/.test(m.text || '')), top: (H.S.stack.slice(-1)[0] || {}).t, prompt: /Difficulté : Facile/.test(pr) && /Fiche :/.test(pr) && pr.includes('- "vf" : ') && pr.includes('{"t":"vf"') };
  }, noxRel0);
  check('the date: an easy quiz about Nox, aced; the evening ends in DMs and brings you closer', /Facile/.test(dIntro) && dt.state === 'done' && dt.res && dt.res.tier === 'top' && dt.res.xp === 24 && dt.up >= 7 && dt.card && dt.msg && dt.top === 'dm' && dt.prompt, { dIntro, dt });
  await back(page);

  // ---------- stood up, an event nobody watched, a friend left without news (no AI: the game decides) ----------
  const miss = await G(page, () => {
    const H = window.__hype, g = H.S.game, z = H.charByHandle(g, 'zara.vey');
    const hurt = [13, 5, 2, 0.5, -0.1].map((h) => H.cancelHurt(h * 3600000));
    const fd = [5000, 50000, 500000, 2e6, 9e6].map((f) => H.fameDiff({ followers: f }));
    const r0 = z.rel;
    const d = H.addEvent(g, { by: 'zara.vey', kind: 'rdv', what: 'café au réfectoire', in: 30 }, { dm: z.id });
    d.due = Date.now() - 3 * 3600000;
    H.checkEvents(g);
    const stood = { state: d.state, drop: r0 - z.rel, notif: g.notifs.some((n) => n.c === z.id && /t’a attendu/.test(n.text)) };
    z.badBuzz = { at: Date.now(), until: Date.now() + 600000, reason: 'test', loss: 500, strength: 0.9 };
    z.buried = true;
    const lv = H.addEvent(g, { by: 'zara.vey', kind: 'live', what: 'Zara s’explique en live', in: 60 }, { p: g.posts[0].id });
    const waits = !!lv.bb && z.badBuzz.until > lv.due;
    lv.due = Date.now() - 3 * 3600000;
    H.checkEvents(g);
    const missed = { state: lv.state, bb: H.inBadBuzz(z), notif: g.notifs.some((n) => n.c === z.id && /sans toi/.test(n.text)) };
    z.badBuzz.until = Date.now() - 1000;
    z.buried = false;
    const t = g.chars.c2;
    t.rel = 50; t.lastTouch = Date.now() - 26 * 3600000; t.unlockedAt = Date.now() - 30 * 3600000; t.neglectAt = 0;
    const neglect = { changed: H.checkNeglect(g), drop: 50 - t.rel, trig: g.triggers.some((x) => /plus de nouvelles/.test(x.text)) };
    const l = H.charByHandle(g, 'leandre.aube'), host = g.posts.find((p) => p.a === 'p');
    host.replies.push({ id: 'r_scan', a: 'c:' + l.id, text: 'Bravo le régulateur. Je réponds en live dans 3h, sur ce que je peux dire.', ts: Date.now() - 3600000, at: Date.now() - 3600000, likeT: 3 });
    g.planScan = 0;
    const scanned = H.scanPlans(g);
    const sev = H.activeEvents(g).find((e) => e.src && e.src.r === 'r_scan');
    const scan = { scanned, kind: sev && sev.kind, left: sev && Math.round((sev.due - Date.now()) / 60000), flag: g.planScan };
    H.update();
    return { hurt, fd, stood, waits, missed, neglect, scan };
  });
  check('cancelling hurts more the later it is; a date gets harder the more famous the person', miss.hurt.join() === '0,-3,-6,-10,-14' && miss.fd.join() === 'facile,moyen,difficile,expert,legende', miss);
  check('a forgotten date: stood up (−15); a live nobody watched: the game decides (buried, stays down); a friend left a day without news feels it', miss.stood.state === 'missed' && miss.stood.drop === 15 && miss.stood.notif && miss.waits && miss.missed.state === 'missed' && miss.missed.bb && miss.missed.notif && miss.neglect.changed && miss.neglect.drop === 3 && miss.neglect.trig, miss);
  check('a promise made before events existed gets its ⏩ under the comment (scan at load)', miss.scan.scanned >= 1 && miss.scan.kind === 'live' && miss.scan.left >= 117 && miss.scan.left <= 123 && miss.scan.flag === 1, miss.scan);

  // ---------- quick saves: save, change things, load back; a save from an hour ago resumes where it was ----------
  await dismiss(page);
  await clickText(page, '.tab', 'Fil');
  await page.click('.save-btn');
  await page.waitForSelector('.modal .saves-card');
  await sleep(300);
  const autoRows = await page.$$eval('.modal .save-row.auto', (x) => x.length);
  await clickText(page, '.modal .btn', 'Sauvegarder maintenant');
  await page.waitForFunction(() => (window.__hype.S.game.saves || []).some((x) => x.slot === '1'), null, { timeout: 10000 });
  await sleep(700);
  await shot(page, 'saves-modal');
  const sv = await G(page, () => { const g = window.__hype.S.game; const keys = Object.keys(localStorage); return { fol: g.stats.followers, gems: g.stats.gems, saves: g.saves.map((x) => x.slot), doc: keys.some((k) => k.endsWith('g_' + g.id + '_save_1')), autoDoc: keys.some((k) => /_save_auto\d?$/.test(k)), autoLabels: g.saves.filter((x) => x.auto).map((x) => x.label) }; });
  check('quick save: a slot is written, and the automatic saves taken before risky actions (a shoot, a skip, a date) are there', autoRows >= 2 && autoRows <= 3 && sv.saves.includes('1') && sv.saves.some((x) => x.startsWith('auto')) && sv.doc && sv.autoDoc, { autoRows, sv });
  await dismiss(page);
  await G(page, () => { const g = window.__hype.S.game; g.stats.followers += 5000; g.stats.gems += 77; window.__hype.update(); });
  await page.click('.save-btn');
  await page.waitForSelector('.modal .saves-card');
  await page.locator('.modal .save-row', { hasText: 'Sauvegarde 1' }).locator('button', { hasText: 'Charger' }).click();
  await page.waitForSelector('.modal-title');
  await sleep(600);
  await shot(page, 'load-confirm');
  await page.click('.modal .btn-danger-solid');
  await page.waitForFunction((f) => window.__hype.S.game.stats.followers < f + 2500, sv.fol, { timeout: 10000 });
  await sleep(600);
  const ld = await G(page, () => { const g = window.__hype.S.game; return { fol: g.stats.followers, gems: g.stats.gems, saves: g.saves.map((x) => x.slot) }; });
  check('loading a save brings the game back as it was', Math.abs(ld.fol - sv.fol) < 50 && ld.gems === sv.gems && ld.saves.includes('1') && ld.saves.some((x) => x.startsWith('auto')), { sv, ld });
  const age0 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, hour = 3600000, now = Date.now();
    const snap = H.cloneJSON(Object.assign({}, g, { saves: [] }));
    H.shiftTime(snap, hour, true); // the same moment, as if it had been saved an hour ago
    const meta = { slot: '2', at: now - hour, label: 'Niv. test', lvl: g.stats.level, fol: g.stats.followers, auto: false };
    await H.Store.write('g_' + g.id + '_save_2', { v: 1, meta, game: snap });
    g.saves = g.saves.filter((x) => x.slot !== '2').concat(meta);
    H.update();
    return now - Math.max(...g.posts.filter((p) => p.ts <= now).map((p) => p.ts));
  });
  await page.click('.save-btn');
  await page.waitForSelector('.modal .saves-card');
  const row2 = await page.textContent('.modal .save-row:has-text("Sauvegarde 2")');
  await page.locator('.modal .save-row', { hasText: 'Sauvegarde 2' }).locator('button', { hasText: 'Charger' }).click();
  await page.waitForSelector('.modal-title');
  await sleep(600);
  await page.click('.modal .btn-danger-solid');
  await sleep(1500);
  const age1 = await G(page, () => { const now = Date.now(); return now - Math.max(...window.__hype.S.game.posts.filter((p) => p.ts <= now).map((p) => p.ts)); });
  check('a save from an hour ago picks up where it was (its timers do not jump)', /il y a 1 h/.test(row2) && age1 - age0 >= 0 && age1 - age0 < 30000, { row2, age0, age1 });

  // ---------- a repost is public: the author notices and reacts ----------
  await dismiss(page);
  await sleep(400);
  const rpt = await G(page, () => {
    const g = window.__hype.S.game, now = Date.now();
    const waiting = (c) => { const m = (g.dms[c.id] || { msgs: [] }).msgs; let w = 0; for (let k = m.length - 1; k >= 0 && !m[k].me; k--) if (!m[k].sys) w++; return w; };
    const p = g.posts.filter((x) => x.ts <= now && x.a.startsWith('c:') && !x.reposted).sort((a, b) => b.ts - a.ts).find((x) => { const c = g.chars[x.a.slice(2)]; return c && c.kind === 'main' && c.unlocked && waiting(c) < 2; });
    return p && { id: p.id, c: p.a.slice(2), rel: g.chars[p.a.slice(2)].rel };
  });
  const rpPost = page.locator(`.post[data-p="${rpt.id}"]`).first();
  await rpPost.scrollIntoViewIfNeeded();
  await rpPost.locator('.act-rp').click();
  await sleep(500);
  await shot(page, 'repost-toast');
  await page.waitForFunction(() => window.__prompts.some((x) => x.includes('TÂCHE : LE JOUEUR REPOSTE')), null, { timeout: 8000 });
  await page.waitForFunction(() => !window.__hype.S.busy.rp, null, { timeout: 15000 });
  await sleep(500);
  const rp = await G(page, (t) => { const g = window.__hype.S.game, c = g.chars[t.c]; const p = g.posts.find((x) => x.id === t.id); const pr = window.__prompts.filter((x) => x.includes('LE JOUEUR REPOSTE')).slice(-1)[0] || ''; return { want: window.__hype.heartScale(c, 4), up: c.rel - t.rel, dm: (g.dms[c.id] || { msgs: [] }).msgs.some((m) => /merci pour le repost/.test(m.text || '')), prompt: pr.includes(p.text.slice(0, 40)), reposted: !!p.reposted }; }, rpt);
  check('a repost is seen: its author reacts (relation as their heart takes it, a private thank-you)', rp.reposted && rp.up >= rp.want && rp.up >= 1 && rp.dm && rp.prompt, { rpt, rp });

  // ---------- events worth attending only; meetings told as what they are ----------
  const evq = await G(page, () => {
    const H = window.__hype, g = H.S.game, z = H.charByHandle(g, 'zara.vey');
    const n0 = g.events.length;
    const junk = [
      H.addEvent(g, { by: 'zara.vey', kind: 'autre', what: 'Zara vérifie son contrat ce soir', in: 120 }, null),
      H.addEvent(g, { by: 'zara.vey', kind: 'rdv', what: 'Échéance : le joueur doit lui remettre ses pièces', in: 120 }, null),
    ];
    const ok = H.addEvent(g, { by: 'zara.vey', kind: 'live', what: 'Zara répond à tout en live', in: 180 }, null);
    if (ok) ok.state = 'done';
    const again = H.addEvent(g, { by: 'zara.vey', kind: 'live', what: 'Zara répond à tout en direct en live', in: 600 }, null);
    const kinds = [H.meetKind({ vibe: null }, { what: 'Appel rapide avec Hugo sur la transparence des collabs' }), H.meetKind({ vibe: 'crush' }, { what: 'café en terrasse' }), H.meetKind({ vibe: 'bff' }, { what: 'resto entre potes' }), H.meetKind({ vibe: null }, { what: 'dîner au bord du lac' })];
    g.events = g.events.slice(0, n0);
    return { junk: junk.every((x) => !x), ok: !!ok, again: !!again, kinds: kinds.join() };
  });
  check('only real events (no intention, no deadline as a date, no repeat), and a work call is not a romantic evening', evq.junk && evq.ok && !evq.again && evq.kinds === 'pro,love,friends,love', evq);

  // ---------- every kind of bond: stages from a crush to a wedding, a proposal on a date, cheating, a breakup ----------
  await dismiss(page);
  const bond0 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = g.chars.c2;
    const paths = { none: H.vibePath({ vibe: null }, 'mariage').join('>'), couple: H.vibePath({ vibe: 'couple' }, 'mariage').join('>'), famille: H.vibePath({ vibe: null }, 'famille').join('>'), back: H.vibePath({ vibe: 'ex' }, 'couple').join('>') };
    const skip = H.vibeOK({ vibe: 'flirt', rel: 95 }, 'fiancailles') || H.vibeOK({ vibe: null, rel: 95 }, 'mariage');
    const alias = ['fiançailles', 'Mariés', 'ensemble', 'en froid', 'Fan n°1'].map(H.normVibe).join(',');
    const adult = window.__prompts.some((p) => p.includes('Aucun mineur dans le jeu')) && (H.WORLDS.find((w) => w.id === 'brumeval') || {}).name === 'Campus de Brumeval';
    t.rel = 60; t.vibe = 'couple'; t.vibeGoal = null;
    H.update();
    return { paths, skip, alias, adult, n: Object.keys(H.VIBES).length };
  });
  check('bonds come in stages (married needs engaged, engaged needs a couple), every character is an adult', bond0.paths.none === 'flirt>couple>fiancailles>mariage' && bond0.paths.couple === 'fiancailles>mariage' && bond0.paths.famille === 'bff>famille' && bond0.paths.back === 'couple' && !bond0.skip && bond0.alias === 'fiancailles,mariage,couple,froid,fan' && bond0.adult && bond0.n >= 20, bond0);
  await clickText(page, '.tab', 'Profil');
  await sleep(300);
  await page.locator('.rel-row', { hasText: 'Théo' }).first().click();
  await page.waitForSelector('.vibe-grp');
  await clickText(page, '.vibe-opt', 'Mariage');
  await page.waitForSelector('.vibe-path');
  await G(page, () => document.querySelector('.vibe-path').scrollIntoView({ block: 'start' }));
  await sleep(400);
  await shot(page, 'bond-goal-wedding');
  const goal = await G(page, () => { const H = window.__hype, g = H.S.game, t = g.chars.c2; const q = g.quests.find((x) => x.kind === 'vibe' && x.charId === 'c2' && x.status === 'active'); return { goal: t.vibeGoal, n0: q && q.n0, prog: q && H.questProgress(g, q).text, path: document.querySelector('.vibe-path').textContent, label: document.querySelector('.layer .prof-stats').textContent, groups: document.querySelectorAll('.vibe-grp').length, prompt: H.promptDM(g, t, [], 'tu fais quoi ce soir ?', []).includes('prochaine étape possible : fiancés') }; });
  check('a wedding as a goal: the stages still to go, a quest that follows them, the model told the next step', goal.goal === 'mariage' && goal.n0 === 2 && /Étape 1\/2 : 💍 Fiançailles/.test(goal.prog || '') && /Fiançailles/.test(goal.path) && /Ton copain/.test(goal.label) && goal.groups === 4 && goal.prompt, goal);
  const prop = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = g.chars.c2, n = H.charByHandle(g, 'nox.ombre');
    const r0 = Math.random;
    Math.random = () => 0.1;
    try {
      H.dateOutcome(g, { what: 'dîner au bord du lac pour ma demande, avec la bague', diff: 'facile', played: { tier: 'top', score: 1, diff: 'facile' } }, t);
      const engaged = t.vibe, relT = t.rel;
      n.vibe = 'flirt'; n.followers = Math.max(n.followers || 0, 50000); // 0.22.2: seen together (Nox's fans): it is known at once
      H.dateOutcome(g, { what: 'dîner aux chandelles', diff: 'facile', played: { tier: 'top', score: 1, diff: 'facile' } }, n);
      return { engaged, cheat: relT - t.rel, still: t.vibe, mem: t.mem.some((m) => /dans mon dos/.test(m.t)), modal: H.S.modals.some((m) => m.t === 'vibe' && m.vibe === 'fiancailles') };
    } finally { Math.random = r0; H.update(); }
  });
  check('a proposal on a perfect date: engaged; a candlelit dinner with someone else, seen together: the fiancé finds out', prop.engaged === 'fiancailles' && prop.cheat === 16 && prop.still === 'fiancailles' && prop.mem && prop.modal, prop);
  await page.waitForSelector('.modal .vibe-big', { timeout: 8000 });
  await sleep(400);
  await shot(page, 'bond-engaged-modal');
  await dismiss(page);
  await page.waitForSelector('.vibe-end');
  const endLabel = (await page.textContent('.vibe-end')).trim();
  await page.click('.vibe-end');
  await page.waitForSelector('.modal-title');
  await sleep(600);
  await page.click('.modal .btn-danger-solid');
  await sleep(1500);
  const br = await G(page, () => { const g = window.__hype.S.game, t = g.chars.c2; return { vibe: t.vibe, msg: g.dms.c2.msgs.some((m) => /bague|marier/.test(m.text || '')), trig: g.triggers.some((x) => /rompre avec @theo\.marlin/.test(x.text)), modal: window.__hype.S.modals.some((m) => m.t === 'vibe' && m.vibe === 'ex') }; });
  check('breaking off the engagement: an ex, a message from him, the network hears about it', endLabel === 'Rompre les fiançailles' && br.vibe === 'ex' && br.msg && br.trig && br.modal, { endLabel, br });
  await page.waitForSelector('.modal .vibe-big', { timeout: 8000 });
  await sleep(400);
  await shot(page, 'bond-breakup-modal');
  await settle(page, 2500);
  await back(page);
  await clickText(page, '.tab', 'Fil');
  await sleep(400);

  // ---------- a live announced in passing, in a reply (no announce line from the model: the player's words are enough) ----------
  await G(page, () => { const g = window.__hype.S.game; g.stats.energy = g.stats.maxEnergy; window.__hype.update(); });
  await page.locator('.post', { hasText: 'la vidéo est en ligne' }).first().click();
  await page.waitForSelector('.layer .post-big');
  await page.fill('.layer .reply-box textarea', 'et mon live de réponse sort dans 5mn, préparez le popcorn');
  await page.click('.layer .send');
  await sleep(6000);
  await dismiss(page);
  const rl2 = await G(page, () => { const r = window.__hype.activeRelease(window.__hype.S.game); return r && { what: r.what, left: Math.round((r.due - Date.now()) / 60000), post: !!r.post }; });
  check('a live announced in a reply starts a countdown', !!rl2 && rl2.what === 'live' && rl2.left >= 4 && rl2.left <= 5 && rl2.post, rl2);
  await back(page);
  await G(page, () => { const r = window.__hype.activeRelease(window.__hype.S.game); r.due = Date.now() - 1000; });
  const relToast = page.locator('.toast', { hasText: 'doit sortir' });
  await relToast.waitFor({ timeout: 6000 });
  await shot(page, 'release-due-toast');
  await relToast.locator('button').click();
  await page.waitForSelector('.layer .mg-setup', { timeout: 15000 });
  check('at release time a toast opens the shoot', await G(page, () => window.__hype.S.stack.some((l) => l.t === 'minigame')));

  // ---------- v6.4: more mini-games and harder levels, on this live (each attempt taken back as a save would) ----------
  const relNow = (fn, arg) => G(page, fn, arg);
  const resetShoot = async () => { await relNow(() => { const r = window.__hype.activeRelease(window.__hype.S.game); r.game = null; r.played = null; window.__hype.update(); }); await page.waitForSelector('.layer .mg-setup', { timeout: 8000 }); };
  // cut on the beat: no Claude, each cut is timed on the cursor
  await G(page, () => { window.__hype.S.mgForce = 'montage'; });
  const nP0 = await G(page, () => window.__prompts.length);
  await clickText(page, '.mg-setup > .btn', 'Lancer le tournage');
  await page.waitForSelector('.mg-intro', { timeout: 10000 });
  await sleep(300);
  await shot(page, 'montage-intro');
  const mtIntro = await page.textContent('.mg-intro');
  await clickText(page, '.mg-intro button', 'parti');
  await page.waitForSelector('.mt-track');
  const nCuts = await G(page, () => document.querySelectorAll('.mt-hit').length);
  for (let k = 0; k < nCuts; k++) {
    await page.waitForFunction((j) => { const t = document.querySelector('.mt-track'), b = document.querySelector('.mt-cut'); return t && b && !b.disabled && document.querySelectorAll('.mt-hit.v1, .mt-hit.v05, .mt-hit.v0').length === j && +t.dataset.t0 > 0; }, k, { timeout: 8000 });
    if (k === 2) await shot(page, 'montage-play');
    await G(page, () => new Promise((res) => {
      const t = document.querySelector('.mt-track'), b = document.querySelector('.mt-cut');
      const z0 = +t.dataset.z0, z1 = +t.dataset.z1, t0 = +t.dataset.t0, sp = +t.dataset.speed;
      const pos = (n) => { const x = (Math.max(0, n - t0) / sp) % 2; return x < 1 ? x : 2 - x; };
      const loop = () => { if (Math.abs(pos(performance.now()) - (z0 + z1) / 2) < (z1 - z0) / 5) { b.click(); res(); } else requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }));
  }
  await page.waitForSelector('.mg-result', { timeout: 10000 });
  await sleep(300);
  const mt = await G(page, (n0) => { const g = window.__hype.S.game, r = window.__hype.activeRelease(g); return { kind: r.played && r.played.kind, score: r.played && r.played.score, prompts: window.__prompts.length - n0, last: g.mgLast, cuts: r.game.items.length }; }, nP0);
  check('cut on the beat: a skill round without Claude, every cut timed on the cursor (5 at Moyen)', /Coupe au rythme/.test(mtIntro) && /Le direct sans blanc/.test(mtIntro) && /« Relancer »/.test(mtIntro) && mt.kind === 'montage' && mt.score === 1 && mt.prompts === 0 && mt.last === 'montage' && mt.cuts === 5, { mtIntro, mt });
  await shot(page, 'montage-result');
  // remember the script, at Expert: longer sequences
  await resetShoot();
  await G(page, () => { window.__hype.S.mgForce = 'memoire'; });
  await clickText(page, '.diff-opt', 'Expert');
  await clickText(page, '.mg-setup > .btn', 'Lancer le tournage');
  await page.waitForSelector('.mg-intro', { timeout: 10000 });
  const mmIntro = await page.textContent('.mg-intro');
  await clickText(page, '.mg-intro button', 'parti');
  for (let k = 0; k < 3; k++) {
    await page.waitForSelector(`.mm-play[data-k="${k}"][data-phase="show"] .mm-big`, { timeout: 8000 });
    if (k === 0) await shot(page, 'memory-show');
    await page.waitForSelector(`.mm-play[data-k="${k}"][data-phase="pick"]`, { timeout: 15000 });
    const seq = await G(page, (j) => window.__hype.activeRelease(window.__hype.S.game).game.items[j].seq, k);
    for (let j = 0; j < seq.length; j++) {
      await G(page, (sym) => { [...document.querySelectorAll('.mm-pool button')].find((x) => x.textContent === sym).click(); }, seq[j]);
      if (k === 0 && j === 1) { await sleep(100); await shot(page, 'memory-pick'); }
      await sleep(90);
    }
  }
  await page.waitForSelector('.mg-result', { timeout: 10000 });
  const mm = await G(page, () => { const r = window.__hype.activeRelease(window.__hype.S.game); return { kind: r.played.kind, score: r.played.score, diff: r.played.diff, lens: r.game.items.map((x) => x.seq.length).join(), dup: r.game.items.some((x) => x.seq.some((y, j) => j && y === x.seq[j - 1])), last: window.__hype.S.game.mgLast }; });
  check('memory: the script goes by one image at a time, tapped back in order (Expert: 4, 5, 6 images)', /Mémoire/.test(mmIntro) && mm.kind === 'memoire' && mm.score === 1 && mm.diff === 'expert' && mm.lens === '4,5,6' && !mm.dup && mm.last === 'memoire', { mmIntro, mm });
  // true or false, written by Claude on the topic; the prompt asks for another format than the last one
  await resetShoot();
  await G(page, () => { window.__hype.S.mgForce = 'ai'; });
  await page.fill('#rl-topic', 'Les idées reçues sur les potions de Lumen');
  await clickText(page, '.diff-opt', 'Moyen');
  await clickText(page, '.mg-setup > .btn', 'Lancer le tournage');
  await page.waitForSelector('.mg-intro', { timeout: 20000 });
  const vfIntro = await page.textContent('.mg-intro');
  await clickText(page, '.mg-intro button', 'parti');
  const vfN = await G(page, () => window.__hype.activeRelease(window.__hype.S.game).game.items.length);
  let vfBtns = '';
  for (let k = 0; k < vfN; k++) {
    await page.waitForSelector('.mg-actions .btn-hot:not([disabled])', { timeout: 8000 });
    if (!k) vfBtns = await page.textContent('.mg-actions');
    const txt = await page.textContent('.mg-card p');
    const truth = await G(page, (t) => window.__hype.activeRelease(window.__hype.S.game).game.items.find((x) => x.text === t).good, txt);
    await page.click(truth ? '.mg-actions .btn-hot' : '.mg-actions .btn-ghost');
    if (k === 1) { await sleep(250); await shot(page, 'vf-answer'); }
    await sleep(1300);
  }
  await page.waitForSelector('.mg-result.top', { timeout: 10000 });
  const vf = await G(page, () => { const r = window.__hype.activeRelease(window.__hype.S.game); const pr = window.__prompts.filter((x) => x.includes('LE MINI-JEU DU TOURNAGE')).slice(-1)[0] || ''; return { kind: r.game.kind, n: r.game.items.length, rot: pr.includes('le dernier mini-jeu de ce joueur était « mémoire »'), formats: ['- "tri" :', '- "ordre" :', '- "quiz" :', '- "vf" :', '- "intrus" :'].every((f) => pr.includes(f)) }; });
  check('true or false: Claude writes statements on the topic, Vrai / Faux buttons; the prompt offers 5 formats and asks for a change', /Vrai ou faux/.test(vfIntro) && vf.kind === 'vf' && vf.n === 6 && /Faux/.test(vfBtns) && /Vrai/.test(vfBtns) && vf.rot && vf.formats, { vfIntro, vf, vfBtns });
  // find the odd one out
  await resetShoot();
  await page.fill('#rl-topic', 'Trouve l’intrus dans ma playlist de duel');
  await clickText(page, '.mg-setup > .btn', 'Lancer le tournage');
  await page.waitForSelector('.mg-intro', { timeout: 20000 });
  const oddIntro = await page.textContent('.mg-intro');
  await clickText(page, '.mg-intro button', 'parti');
  const oddN = await G(page, () => window.__hype.activeRelease(window.__hype.S.game).game.items.length);
  for (let k = 0; k < oddN; k++) {
    await page.waitForSelector('.mg-opt:not([disabled])', { timeout: 8000 });
    if (k === 1) await shot(page, 'odd-play');
    const txt = await page.textContent('.mg-card p');
    const odd = await G(page, (t) => { const q = window.__hype.activeRelease(window.__hype.S.game).game.items.find((x) => x.text === t); return q.a[q.ok]; }, txt);
    await page.locator('.mg-opt', { hasText: odd }).first().click();
    await sleep(1600);
  }
  await page.waitForSelector('.mg-result.top', { timeout: 10000 });
  const oddKind = await G(page, () => window.__hype.activeRelease(window.__hype.S.game).game.kind);
  check('find the odd one out: series written by Claude, one does not belong', /Trouve l’intrus/.test(oddIntro) && oddKind === 'intrus', { oddIntro, oddKind });
  // Cauchemar, the very last level: real expert questions on the real subject
  await resetShoot();
  await page.fill('#rl-topic', 'Mon live sur les échecs');
  await clickText(page, '.diff-opt', 'Cauchemar');
  await sleep(250);
  const nmSetup = await G(page, () => ({ levels: [...document.querySelectorAll('.diff-opt')].map((x) => x.querySelector('b').textContent).join(','), hint: !!document.querySelector('.mg-setup .nm-hint'), last: (document.querySelector('.diff-opt:last-child') || { className: '' }).className }));
  await G(page, () => { document.querySelector('.mg-setup > .btn').scrollIntoView({ block: 'end' }); });
  await shot(page, 'shoot-setup-nightmare');
  await clickText(page, '.mg-setup > .btn', 'Lancer le tournage');
  await page.waitForSelector('.mg-intro', { timeout: 20000 });
  await sleep(300);
  await shot(page, 'nightmare-intro');
  const nmIntro = await page.textContent('.mg-intro');
  await clickText(page, '.mg-intro button', 'parti');
  const nmN = await G(page, () => window.__hype.activeRelease(window.__hype.S.game).game.items.length);
  for (let k = 0; k < nmN; k++) {
    await page.waitForSelector('.mg-opt:not([disabled])', { timeout: 8000 });
    const txt = await page.textContent('.mg-card p');
    const good = await G(page, (t) => { const q = window.__hype.activeRelease(window.__hype.S.game).game.items.find((x) => x.text === t); return q.a[q.ok]; }, txt);
    const opts = await page.$$eval('.mg-opt', (b) => b.map((x) => x.textContent.trim()));
    await page.click(`.mg-opt >> nth=${opts.indexOf(good)}`);
    if (k === 2) { await sleep(250); await shot(page, 'nightmare-answer'); }
    await sleep(1600);
  }
  await page.waitForSelector('.mg-result.top', { timeout: 10000 });
  await sleep(300);
  await shot(page, 'nightmare-result');
  const nm = await G(page, () => { const r = window.__hype.activeRelease(window.__hype.S.game); const pr = window.__prompts.filter((x) => x.includes('LE MINI-JEU DU TOURNAGE')).slice(-1)[0] || ''; return { kind: r.game.kind, diff: r.played.diff, prompt: pr.includes('NIVEAU CAUCHEMAR, LE PLUS DUR DU JEU : un "quiz" de 6 questions de connaisseur à 4 choix sur ce dont parle le live') && pr.includes('pose de VRAIES questions dessus') && pr.includes('Uniquement des faits dont tu es certain') && !pr.includes('- "intrus" :') && pr.includes('"kind":"quiz"'), chip: document.querySelector('.mg-result .chip').textContent, answers: !!document.querySelector('.mg-result .mg-fix') }; });
  check('Cauchemar, the very last level: real expert questions on the real subject (×6, viral for sure), the answers shown after', nmSetup.levels === 'Facile,Moyen,Difficile,Expert,Légendaire,Mythique,Cauchemar' && nmSetup.hint && /nightmare/.test(nmSetup.last) && /vraies questions de connaisseur/.test(nmIntro) && nm.kind === 'quiz' && nm.diff === 'cauchemar' && nm.prompt && /×6/.test(nm.chip) && /viral assuré/.test(nm.chip) && nm.answers, { nmSetup, nmIntro, nm });
  const kinds = await G(page, () => { const H = window.__hype, S = H.S, g = S.game, r = H.activeRelease(g), seen = {}; const f = S.mgForce; S.mgForce = null; r.diff = 'moyen'; for (let i = 0; i < 400; i++) { g.mgRecent = [i % 2 ? 'montage' : 'memoire']; const k = H.pickShootKind(g, r); const key = k + (k === g.mgRecent[0] ? '!' : ''); seen[key] = (seen[key] || 0) + 1; } r.diff = 'cauchemar'; const real = Array.from({ length: 50 }, () => H.pickShootKind(g, r)).every((k) => k === 'quiz'); S.mgForce = f; return { seen, real, what: r.what }; });
  check('shoots vary: every game of the format alike, the AI’s five and the skill rounds (0.27.3; never the same twice in a row; the chat of a live too), the real quiz at Cauchemar', kinds.real && ['tri', 'ordre', 'quiz', 'vf', 'intrus', 'chat'].every((k) => kinds.seen[k] > 30) && kinds.seen.montage > 12 && kinds.seen.memoire > 12 && !kinds.seen.ai && !Object.keys(kinds.seen).some((k) => k.endsWith('!')), kinds);
  await idle();
  await back(page);

  // ---------- profile ----------
  await clickText(page, '.tab', 'Profil');
  await sleep(400);
  await shot(page, 'profile');
  if (await page.$('.plus')) await page.click('.plus');
  await G(page, () => { document.querySelector('.view').scrollTop = 900; });
  await sleep(300);
  await shot(page, 'profile-2');
  await page.click('.gear-btn'); // the game's settings live behind the gear now
  await page.waitForSelector('.layer .danger-zone');
  await G(page, () => { document.querySelector('.layer .danger-zone').scrollIntoView(); });
  await sleep(300);
  await clickText(page, '.layer .danger-zone button', 'Supprimer cette partie');
  await sleep(300);
  await shot(page, 'confirm-delete-game');
  await clickText(page, '.modal .btn', 'Annuler');
  await sleep(300);
  check('game not deleted after Annuler', await G(page, () => !!window.__hype.S.game));
  await back(page);
  await clickText(page, '.tab', 'Notifs');
  await sleep(400);
  await shot(page, 'notifs');

  // ---------- persistence ----------
  await sleep(3500);
  const keys = await G(page, () => Object.keys(localStorage).filter((k) => k.startsWith('__mockdb:')).map((k) => k.split('/').pop() + ' ' + localStorage.getItem(k).length));
  console.log('DB', keys, 'writes', await G(page, () => window.__writes));
  fs.writeFileSync(path.join(OUT, 'prompts.txt'), (await G(page, () => window.__prompts.join('\n\n=====================\n\n'))));

  // ---------- desktop dark reload, layer alignment (and the real world, without a news digest since the 0.29) ----------
  await page.setViewportSize({ width: 1360, height: 860 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload();
  await page.waitForSelector('.save');
  await sleep(600);
  const news = await G(page, () => { const H = window.__hype; const w = H.WORLDS.find((x) => x.id === 'reel'); const pr = H.promptWorld(w, { name: 'Test', handle: 'test', start: 'anon', identity: 'une créatrice', pron: 'elle', chaos: 1 }); return { vague: pr.includes('Pas de nouvelles fraîches disponibles'), rule: pr.includes('Jamais de vraie personne comme compte'), noChip: !document.querySelector('.world-news') }; });
  check('real world: no news digest (it came from the Claude version): the AI stays vague about the latest news, and never a real person as an account', news.vague && news.rule && news.noChip, news);
  await shot(page, 'home-saves-dark');
  await page.click('.save');
  await page.waitForSelector('.post');
  await sleep(800);
  await dismiss(page);
  await shot(page, 'desktop-dark-feed');
  await overflowCheck(page, 'desktop feed');
  for (let k = 0; k < 6 && !(await page.locator('.post', { hasText: 'lunettes de soleil' }).count()); k++) { await page.click('.feed-more button'); await sleep(300); } // (0.28.1: the feed shows 30 posts, then « Voir plus »)
  await page.locator('.post', { hasText: 'lunettes de soleil' }).first().click();
  await sleep(600);
  const align = await G(page, () => { const a = document.querySelector('.col').getBoundingClientRect(); const b = document.querySelector('.layer-panel').getBoundingClientRect(); return { col: Math.round(a.left), panel: Math.round(b.left) }; });
  check('desktop: panels open over the feed column', Math.abs(align.col - align.panel) <= 2, align);
  await shot(page, 'desktop-dark-thread');
  await page.keyboard.press('Escape');
  await page.emulateMedia({ colorScheme: 'light' });
  await sleep(300);
  await shot(page, 'desktop-light-feed');
  await page.setViewportSize({ width: 900, height: 800 });
  await sleep(300);
  await shot(page, 'tablet-feed');
  await page.setViewportSize({ width: 360, height: 740 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await sleep(300);
  await shot(page, 'small-dark-feed');
  await overflowCheck(page, 'small feed');
  check('level visible on small phones', await G(page, () => getComputedStyle(document.querySelector('.lvl-dot')).display !== 'none'));
  await clickText(page, '.tab', 'Profil');
  await sleep(300);
  await shot(page, 'small-dark-profile');
  await overflowCheck(page, 'small profile');

  // ---------- delete a game from the home screen (trash, confirmation): out of the list and out of storage ----------
  await page.reload();
  await page.waitForSelector('.save-del');
  await sleep(600);
  const gIds = await G(page, () => window.__hype.S.games.map((x) => x.id));
  // the connection drops during the deletion: nothing is lost from the list, the game says to try again
  await G(page, () => { window.__failDeletes = 1000; });
  await page.click('.save-del >> nth=0');
  await page.waitForSelector('.modal .btn-danger-solid');
  await sleep(600);
  await page.click('.modal .btn-danger-solid');
  await page.locator('.toast', { hasText: 'réessaie' }).waitFor({ timeout: 15000 });
  const kept = await G(page, (id) => ({ listed: window.__hype.S.games.some((x) => x.id === id), doc: localStorage.getItem('__mockdb:data/users/u_test123/g_' + id) != null, index: JSON.parse(localStorage.getItem('__mockdb:data/users/u_test123/index') || '{"games":[]}').games.some((x) => x.id === id) }), gIds[0]);
  check('deleting while the connection drops: the game stays listed, nothing half-erased is hidden, « réessaie »', kept.listed && kept.doc && kept.index, kept);
  await shot(page, 'home-delete-failed');
  await noToasts(page);
  // a short hiccup (3 refused deletions): retried, checked, and erased for good
  await G(page, () => { window.__failDeletes = 3; });
  await page.click('.save-del >> nth=0');
  await page.waitForSelector('.modal .btn-danger-solid');
  await sleep(600);
  await shot(page, 'home-delete-confirm');
  await page.click('.modal .btn-danger-solid');
  await page.waitForFunction((n) => window.__hype.S.games.length === n - 1, gIds.length, { timeout: 10000 });
  await sleep(1200);
  const gone = await G(page, (ids) => { const id = ids[0]; const idx = JSON.parse(localStorage.getItem('__mockdb:data/users/u_test123/index') || '{"games":[]}'); return { left: window.__hype.S.games.map((x) => x.id), docs: Object.keys(localStorage).filter((k) => k.includes('g_' + id)), inIndex: idx.games.some((x) => x.id === id), modal: !!document.querySelector('.modal'), toast: (document.querySelector('.toast') || {}).textContent || '' }; }, gIds);
  check('a game deleted from the home screen (trash + confirmation): out of the list, every document erased (saves too)', !gone.left.includes(gIds[0]) && gone.left.length === gIds.length - 1 && !gone.docs.length && !gone.inIndex && !gone.modal && /supprimée/.test(gone.toast), { gIds, gone });
  await shot(page, 'home-after-delete');
  await overflowCheck(page, 'home after delete');

  console.log('\nCHECKS', checks.filter((c) => c[0] === 'PASS').length + '/' + checks.length);
  for (const c of checks.filter((x) => x[0] === 'FAIL')) console.log('  FAIL', c[1], c[2]);
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  await browser.close();
})().catch(async (e) => { console.error('FAILED', e); if (lastPage) await lastPage.screenshot({ path: path.join(OUT, 'fail.png') }).catch(() => {}); console.log('ERRORS', errors.join('\n')); console.log('CHECKS', checks.map((c) => c[0] + ' ' + c[1]).join('\n')); process.exit(1); });
