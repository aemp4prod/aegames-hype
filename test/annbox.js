// 0.31.2, in Chromium against the built hype.html with the mocked Claude runtime: « Faire une vidéo à partir de ce post ».
// The player ticks it, never the game:
// - a post that only talks of a video (« un jour, une vidéo sortira… ») shows the box, unticked, and launches nothing, even
//   if the model writes an announce line anyway (it is no longer asked to);
// - ticked: the format from its words, the moment it says (or in 1 h / as soon as it can be made, tonight, tomorrow), the
//   topic from its words (without « ce soir à 21h » nor « ma vidéo… sort »), someone it is about when one is mentioned;
//   the post is the announcement: the reactions know it, the release points to it;
// - what the player changes stays (format, moment, topic, who); a moment too soon for the work is said; the same video
//   already planned is announced, never made twice; a programme full, a channel suspended: the box waits;
// - the post refused: the box comes back as it was;
// - a game from before: the release read into vague words leaves, free (never one the player ticked).
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/annbox.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-annbox');
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
async function shot(page, name) { await page.evaluate(() => { const H = window.__hype; if (H && H.S) { H.S.toasts.length = 0; H.update(); } }); await sleep(150); shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
const G = (page, fn, arg) => page.evaluate(fn, arg);
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.dms || b.story || b.groups); })) await sleep(150); await sleep(300); };
async function dismiss(page) { for (let k = 0; k < 8 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }
const clear = (page) => G(page, () => { const H = window.__hype; H.S.stack = []; H.S.modals.length = 0; H.S.toasts.length = 0; H.S.storyView = null; H.update(); });
const setHour = (page, h) => G(page, (h) => { const g = window.__hype.S.game; const d = new Date(Date.now() + (g.clockOff || 0)); const x = new Date(d); x.setHours(h, 0, 0, 0); g.clockOff = (g.clockOff || 0) + (x - d) + 60000; }, h);
async function overflowCheck(page, label) {
  const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth }));
  if (w.sw > w.cw + 1 || w.bw > w.cw + 1) errors.push(`[overflow] ${label}: ${JSON.stringify(w)}`);
}

async function newPage(browser, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 700, colorScheme: 'light' });
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript(() => { window.__hypeEasyGear = true; });
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
}
// The composer, open on the feed (whatever was on screen).
async function compose(page, text) {
  await clear(page);
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.goTab('feed'); H.openCompose(); H.update(); });
  await page.waitForSelector('#compose');
  await page.fill('#compose', text);
  await sleep(200);
}
const boxState = (page) => G(page, () => {
  const c = document.querySelector('.layer .ann-card'), box = document.querySelector('.layer .ann-box');
  const on = (sel) => { const e = box && box.querySelector(sel); return e ? e.textContent.trim() : ''; };
  const pub = [...document.querySelectorAll('.layer-head button')].find((b) => /Publier/.test(b.textContent));
  return {
    has: !!c, hint: !!(c && c.classList.contains('hint')), off: !!(c && c.classList.contains('off')), checked: !!(c && c.querySelector('input').checked), disabled: !!(c && c.querySelector('input').disabled),
    small: c ? c.querySelector('small').textContent : '', box: !!box, fmt: on('.seg button.on'), when: on('.tr-chips[aria-label="Quand"] .chip-btn.on'),
    chips: box ? [...box.querySelectorAll('.tr-chips[aria-label="Quand"] .chip-btn')].map((b) => b.textContent.trim()) : [],
    topic: (document.querySelector('#ann-topic') || {}).value, about: on('.tr-chips[aria-label="Au sujet de"] .chip-btn.on'), aboutN: box ? box.querySelectorAll('.tr-chips[aria-label="Au sujet de"] .chip-btn').length : 0,
    note: on('.ann-note'), warn: !!(box && box.querySelector('.ann-note.warn')), pub: pub ? !pub.disabled : null,
  };
});
const publish = async (page) => { await page.locator('.layer-head button', { hasText: 'Publier' }).first().click(); await sleep(400); await idle(page); await sleep(600); await dismiss(page); };
const lastPostPrompt = (page, n0) => G(page, (n0) => window.__prompts.slice(n0).filter((x) => x.includes('## ACTION DU JOUEUR') && x.includes('Le joueur publie ce post')).pop() || '', n0);

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);
  await setHour(page, 13);
  await G(page, () => { const H = window.__hype, g = H.S.game; for (const h of ['leandre.aube', 'ada.quill']) { const c = H.charByHandle(g, h); if (c) Object.assign(c, { unlocked: true, asleep: undefined }); } g.stats.energy = g.stats.maxEnergy; H.update(); });

  // ---------- the player's case: a post that only talks of a video ----------
  const n1 = await G(page, () => ({ rel: window.__hype.plannedReleases(window.__hype.S.game).length, pr: window.__prompts.length }));
  await compose(page, 'Un jour, une vidéo sortira sur vous et vous serez pas prévenu…');
  const b1 = await boxState(page);
  await shot(page, 'box-hint');
  check('a post that talks of a video: the box is there, highlighted, never ticked by the game', b1.has && b1.hint && !b1.checked && !b1.box && /Ton post en parle \? Coche si tu veux la faire/.test(b1.small) && b1.pub, b1);
  await G(page, () => { window.__mockOnce = [{ has: 'Le joueur publie ce post', add: true, lines: [{ t: 'announce', what: 'vidéo', topic: 'Ce que vous cachez tous', in: 60 }] }]; });
  await publish(page);
  const a1 = await G(page, (n) => { const H = window.__hype, g = H.S.game; return { rel: H.plannedReleases(g).length, posted: g.posts.some((p) => p.a === 'p' && /Un jour, une vidéo sortira/.test(p.text)), notif: g.notifs.some((x) => /Compte à rebours/.test(x.text || '')) }; }, n1);
  const pr1 = await lastPostPrompt(page, n1.pr);
  check('unticked, it launches nothing (even an announce line written by the model is ignored); the model is no longer asked to look for one',
    a1.posted && a1.rel === n1.rel && !a1.notif && pr1.length > 0 && !/"t":"announce"/.test(pr1) && !/Avec ce post, le joueur annonce/.test(pr1), { a1, asks: /"t":"announce"/.test(pr1) });

  // ---------- ticked: the format, the moment and the topic from the post ----------
  const n2 = await G(page, () => ({ pr: window.__prompts.length, posts: window.__hype.S.game.posts.length }));
  await compose(page, 'ma vidéo sur les potions du marché noir sort ce soir à 21h !!');
  await page.check('.layer .ann-card input');
  await sleep(250);
  const b2 = await boxState(page);
  await shot(page, 'box-ticked');
  check('ticked: the format its words say (Vidéo), the moment they say (tonight 21 h), or as soon as it can be made, tomorrow; the topic is the post without « ce soir à 21h » nor « ma vidéo… sort »; the time it takes, said',
    b2.checked && b2.box && b2.fmt === 'Vidéo' && b2.when === 'Comme ton post : ce soir 21 h' && b2.chips.length === 3 && /^Au plus vite \(17 h [0-5]\d\)$/.test(b2.chips[1]) && b2.chips[2] === 'Demain 18 h'
      && b2.topic === 'Les potions du marché noir !!' && /^⏱️ 4 h de travail : tu tournes aujourd’hui 17 h pour une sortie ce soir 21 h\.$/.test(b2.note) && !b2.warn && b2.aboutN === 0 && /Ce post l’annonce/.test(b2.small) && b2.pub, b2);
  await publish(page);
  const a2 = await G(page, () => {
    const H = window.__hype, g = H.S.game, p = g.posts.find((x) => x.a === 'p' && /potions du marché noir/.test(x.text)), r = g.releases.slice(-1)[0];
    const at = new Date(H.relAnn(r) + g.clockOff);
    return { what: r.what, topic: r.topic, hour: at.getHours(), min: at.getMinutes(), post: !!p && r.post === p.id, said: r.said, pick: r.pick, state: r.state, notif: (g.notifs.filter((x) => x.k === 'release').slice(-1)[0] || {}).text || '', drafts: !!H.S.drafts.plan };
  });
  const pr2 = await lastPostPrompt(page, n2.pr);
  check('published: a video « Les potions du marché noir !! » out at 21 h, its post the announcement (the reactions are told), the countdown said; the box is gone from the drafts',
    a2.what === 'vidéo' && a2.topic === 'Les potions du marché noir !!' && a2.hour === 21 && a2.min === 0 && a2.post && /sort ce soir à 21h/.test(a2.said) && a2.pick === 1 && a2.state === 'scheduled'
      && /^Compte à rebours lancé : ta vidéo « Les potions du marché noir !! » sort ce soir 21 h\. Le tournage commence aujourd’hui 17 h/.test(a2.notif) && !a2.drafts
      && /Avec ce post, le joueur annonce une vidéo : « Les potions du marché noir !! », qui sort [^.]*à 21 h \(aujourd’hui, dans \d h\)/.test(pr2) && /certains font monter la hype, d’autres doutent/.test(pr2), { a2, line: (pr2.match(/Avec ce post[^\n]*/) || [''])[0] });

  // ---------- what the player changes stays: a short, tomorrow, their own topic, the one it is about ----------
  await compose(page, 'ce que @leandre.aube cache au conseil des maisons, bientôt en short 👀');
  await page.check('.layer .ann-card input');
  await sleep(250);
  const b3 = await boxState(page);
  const short = await G(page, () => { const H = window.__hype; return H.PF(H.S.game).shortName; });
  check('a short from its words, about the one it mentions (the only one): « @leandre.aube » picked, « Personne » offered',
    b3.fmt.toLowerCase() === short.toLowerCase() && b3.about === '@leandre.aube' && b3.aboutN === 2 && /^Au plus vite \(15 h [0-5]\d\)$/.test(b3.when) && b3.chips[0] === b3.when && b3.topic === 'Ce que @leandre.aube cache au conseil des maisons, en short 👀', b3);
  await page.fill('#ann-topic', 'Les secrets du conseil des maisons');
  await page.locator('.layer .ann-box .tr-chips[aria-label="Quand"] .chip-btn', { hasText: 'Demain 18 h' }).click();
  await page.fill('#compose', 'ce que @leandre.aube cache au conseil des maisons… demain en short 👀 abonnez-vous');
  await sleep(250);
  const b3b = await boxState(page);
  await shot(page, 'box-changed');
  check('the topic and the moment the player picked stay while the post changes (now saying « demain » too: the same moment)', b3b.topic === 'Les secrets du conseil des maisons' && /^(Comme ton post : demain|Demain) 18 h$/.test(b3b.when) && b3b.chips.filter((x) => /emain 18 h$/.test(x)).length === 1 && b3b.about === '@leandre.aube', b3b);
  await publish(page);
  const a3 = await G(page, () => {
    const H = window.__hype, g = H.S.game, r = g.releases.slice(-1)[0], at = new Date(H.relAnn(r) + g.clockOff), now = new Date(Date.now() + g.clockOff);
    return { what: r.what, topic: r.topic, hour: at.getHours(), days: Math.round((new Date(at.toDateString()) - new Date(now.toDateString())) / 86400000), c: r.c && g.chars[r.c].handle, n: H.plannedReleases(g).length };
  });
  check('published: a short « Les secrets du conseil des maisons », tomorrow at 18 h, about Léandre (a proof video on him)', a3.what === 'short' && a3.topic === 'Les secrets du conseil des maisons' && a3.hour === 18 && a3.days === 1 && a3.c === 'leandre.aube' && a3.n === 2, a3);

  // ---------- a moment too soon for the work, said; « Au plus vite » fits ----------
  await compose(page, 'nouvelle vidéo dans 1h sur mes potions ratées');
  await page.check('.layer .ann-card input');
  await sleep(250);
  const b4 = await boxState(page);
  await page.locator('.layer .ann-box .tr-chips[aria-label="Quand"] .chip-btn', { hasText: 'Au plus vite' }).click();
  await sleep(200);
  const b4b = await boxState(page);
  await page.locator('.layer .ann-box .seg button', { hasText: /^Live$/ }).click();
  await sleep(200);
  const b4c = await boxState(page);
  check('the moment the post says, too soon for 4 h of work: it is said (it would come out late); « Au plus vite » fits; a live starts when it is said',
    b4.when === 'Comme ton post : dans 1 h 00' && b4.warn && /^⚠️ Il te faut 4 h de travail : annoncée dans 1 h 00, elle sortira en retard, vers 17 h( \d\d)?\.$/.test(b4.note)
      && /^Au plus vite/.test(b4b.when) && !b4b.warn && /tu tournes/.test(b4b.note) && b4c.fmt === 'Live' && b4c.note === '🔴 Le live commence dans 1 h 00 (il dure 2 h).' && b4c.when === 'Comme ton post : dans 1 h 00' && b4c.chips.length === 3, { b4, b4b, b4c });
  await page.uncheck('.layer .ann-card input');
  await sleep(200);
  const b4d = await boxState(page);
  check('unticked again: the box folds, nothing will be made', !b4d.box && !b4d.checked, b4d);

  // ---------- the same video already planned: this post announces it, never a second ----------
  await compose(page, 'rdv ce soir 21h pour la vidéo, ça va être fou');
  await page.check('.layer .ann-card input');
  await sleep(250);
  const b5 = await boxState(page);
  check('the same video already planned tonight at 21 h: the post will announce it, no second one', /^📣 Tu as déjà ta vidéo « Les potions du marché noir !! » ce soir 21 h : ce post l’annoncera, sans en faire une deuxième\.$/.test(b5.note), b5);
  const n5 = await G(page, () => window.__hype.plannedReleases(window.__hype.S.game).length);
  await publish(page);
  const a5 = await G(page, () => { const H = window.__hype, g = H.S.game; return { n: H.plannedReleases(g).length, notif: (g.notifs.filter((x) => x.k === 'release').slice(-1)[0] || {}).text || '' }; });
  check('published: still two planned, and the player is told which one it announces', a5.n === n5 && /^📣 Ton post annonce ta vidéo « Les potions du marché noir !! », déjà prévue ce soir 21 h\.$/.test(a5.notif), a5);

  // ---------- the post refused: the box comes back as it was ----------
  await compose(page, 'live ce soir pour répondre à vos questions');
  await page.check('.layer .ann-card input');
  await page.fill('#ann-topic', 'Vos questions sur les potions');
  await sleep(200);
  await G(page, () => { window.__sampleMode = 'refuse'; });
  await page.locator('.layer-head button', { hasText: 'Publier' }).first().click();
  await sleep(1500);
  await idle(page);
  await G(page, () => { window.__sampleMode = null; });
  await sleep(500);
  const b6 = await boxState(page);
  const d6 = await G(page, () => { const H = window.__hype; return { plan: H.S.drafts.plan, n: H.plannedReleases(H.S.game).length, post: H.S.drafts.post }; });
  check('the post refused: nothing planned, and the composer comes back with the box as the player left it', d6.n === 2 && d6.post === 'live ce soir pour répondre à vos questions' && b6.checked && b6.topic === 'Vos questions sur les potions' && b6.fmt === 'Live', { b6, d6 });
  await clear(page);
  await G(page, () => { const H = window.__hype; H.S.drafts.plan = null; H.S.drafts.post = ''; });

  // ---------- where the box is not, and when it waits ----------
  await compose(page, 'désolée pour hier, j’ai été nulle');
  const inPoll = await G(page, async () => { const b = [...document.querySelectorAll('.layer .ideas button')].find((x) => /Sondage/.test(x.textContent)); if (b) b.click(); await new Promise((r) => setTimeout(r, 200)); return { poll: !!document.querySelector('.layer .poll-edit'), box: !!document.querySelector('.layer .ann-card') }; });
  const apo = await G(page, async () => { const H = window.__hype; H.S.drafts.poll = null; H.S.drafts.apology = true; H.S.game.stats.cancelled = true; H.update(); await new Promise((r) => setTimeout(r, 200)); const box = !!document.querySelector('.layer .ann-card'); H.S.drafts.apology = false; H.S.game.stats.cancelled = false; H.update(); return box; });
  const full = await G(page, async () => {
    const H = window.__hype, g = H.S.game, t = Date.now(), made = [];
    for (let k = 0; H.planRoom(g) && k < 8; k++) made.push(!!H.scheduleRelease(g, { what: 'short', topic: `petit format ${k}`, due: t + (30 + k) * 3600000 }));
    H.update();
    await new Promise((r) => setTimeout(r, 200));
    const c = document.querySelector('.layer .ann-card');
    return { n: H.plannedReleases(g).length, off: !!(c && c.classList.contains('off')), disabled: !!(c && c.querySelector('input').disabled), small: c ? c.querySelector('small').textContent : '' };
  });
  const susp = await G(page, async () => {
    const H = window.__hype, g = H.S.game;
    for (const r of g.releases) if (r.state === 'scheduled' && /^petit format/.test(r.topic)) r.state = 'dropped';
    g.mod = Object.assign(g.mod || {}, { susp: { until: Date.now() + 3600000 } });
    H.update();
    await new Promise((r) => setTimeout(r, 200));
    const c = document.querySelector('.layer .ann-card');
    const out = { disabled: !!(c && c.querySelector('input').disabled), small: c ? c.querySelector('small').textContent : '' };
    g.mod.susp = null;
    H.update();
    return out;
  });
  check('no box with a poll or for an apology; six planned: it waits (« publie-en une d’abord »); a suspended channel: it waits too',
    inPoll.poll && !inPoll.box && !apo && full.n === 6 && full.off && full.disabled && /6 sorties prévues, c’est le maximum/.test(full.small) && susp.disabled && /Ta chaîne est suspendue/.test(susp.small), { inPoll, apo, full, susp });
  await clear(page);
  await G(page, () => { const H = window.__hype; H.S.drafts.post = ''; H.S.drafts.poll = null; });

  // ---------- on a phone ----------
  await page.setViewportSize({ width: 390, height: 844 });
  await sleep(300);
  await compose(page, 'mon live de ce soir 21h : je teste les potions de @ada.quill 🧪');
  await page.check('.layer .ann-card input');
  await sleep(300);
  await G(page, () => { const el = document.querySelector('.layer .ann-box'); if (el) el.scrollIntoView({ block: 'center' }); });
  await sleep(200);
  const b7 = await boxState(page);
  await shot(page, 'box-phone');
  await overflowCheck(page, 'composer box (390 px)');
  const fit = await G(page, () => { const box = document.querySelector('.layer .ann-box'), lay = document.querySelector('.layer'); if (!box || !lay) return null; const a = box.getBoundingClientRect(), b = lay.getBoundingClientRect(); return { inside: a.left >= b.left - 1 && a.right <= b.right + 1, w: Math.round(a.width) }; });
  check('on a phone: the box fits (a live tonight at 21 h, about Ada, the topic from the post)', fit && fit.inside && b7.fmt === 'Live' && b7.when === 'Comme ton post : ce soir 21 h' && b7.about === '@ada.quill' && b7.topic === 'Je teste les potions de @ada.quill 🧪', { fit, b7 });
  await clear(page);
  await G(page, () => { const H = window.__hype; H.S.drafts.post = ''; H.S.drafts.plan = null; });
  await page.setViewportSize({ width: 1280, height: 900 });

  // ---------- the helpers: the words of a post, its moment ----------
  const helpers = await G(page, () => {
    const H = window.__hype;
    return {
      t1: H.annTopic('Live ce soir 21h, je réponds à vos questions'), t2: H.annTopic('Un jour, une vidéo sortira sur vous et vous serez pas prévenu…'), t3: H.annTopic('demain'),
      t4: H.annTopic('mon prochain short arrive dans 2h !'), t5: H.annTopic('j’arrive pas à croire que ma vidéo marche autant'),
      w1: H.postWhen('rdv samedi 20h'), w2: H.postWhen('un jour peut-être'), w3: H.postWhen('dans 30 min'),
      talk: [H.VID_TALK_RE.test('un live ce soir'), H.VID_TALK_RE.test('je vis ma meilleure vie'), H.VID_TALK_RE.test('Épisode 2 bientôt'), H.VID_TALK_RE.test('olive')],
    };
  });
  check('the topic from the words (never a time, never « ma vidéo… sort »; a sentence that only has those stays whole), the moment a post says, a video talked about',
    helpers.t1 === 'Je réponds à vos questions' && helpers.t2 === 'Une vidéo sortira sur vous et vous serez pas prévenu…' && helpers.t3 === 'Demain' && helpers.t4 === 'Mon prochain short arrive dans 2h !' && helpers.t5 === 'J’arrive pas à croire que ma vidéo marche autant'
      && helpers.w1 > 0 && helpers.w1 <= 7 * 1440 && helpers.w2 === null && helpers.w3 === 30 && helpers.talk.join() === 'true,false,true,false', helpers);

  // ---------- a game from before: the release read into vague words leaves, free ----------
  const fix = await G(page, () => {
    const H = window.__hype, g = H.S.game, s = g.stats, t = Date.now();
    for (const r of g.releases) if (r.state === 'scheduled') r.state = 'dropped';
    const old = H.addRelease(g, { what: 'vidéo', in: 600, topic: 'Ce que vous cachez' }, null, 'Un jour, une vidéo sortira sur vous et vous serez pas prévenu…');
    const mine = H.addRelease(g, { what: 'short', at: t + 5 * 3600000, topic: 'Un jour peut-être' }, null, 'Un jour, peut-être, un short sur vous…');
    const near = H.addRelease(g, { what: 'live', in: 120, topic: 'live questions' }, null, 'live dans 2h, venez !');
    const prog = H.scheduleRelease(g, { what: 'vidéo', topic: 'programmée au Studio', due: t + 30 * 3600000 });
    prog.said = 'ma vidéo sort demain'; // (programmed, then announced in a post: the player chose it)
    const before = { rep: s.reputation, fol: s.followers };
    const n0 = g.notifs.length;
    g.fix312 = 0;
    H.migrate(g);
    const notifs = g.notifs.slice(n0).filter((x) => x.k === 'release').map((x) => x.text);
    return { old: old && old.state, vague: old && old.vague, mine: mine && mine.state, minePick: !mine.auto, near: near && near.state, nearAuto: near.auto, prog: prog.state === 'scheduled' && !prog.auto, once: g.fix312,
      same: s.reputation === before.rep && s.followers === before.fol, notifs, id: near.id };
  });
  check('a game from before: the release read into « un jour… » leaves the programme at no cost, told; one the game read into clear words stays, marked as never chosen; one ticked or programmed stays as it is; once',
    fix.old === 'dropped' && fix.vague === 1 && fix.mine === 'scheduled' && fix.minePick && fix.near === 'scheduled' && fix.nearAuto === 1 && fix.prog && fix.once === 1 && fix.same
      && fix.notifs.includes('📅 Ta vidéo « Ce que vous cachez » n’avait pas vraiment été annoncée (« un jour… ») : elle quitte ton programme, sans rien te coûter.')
      && fix.notifs.includes('📅 Désormais, une vidéo ne se lance que si tu coches « Faire une vidéo à partir de ce post ». La sortie que le jeu avait lancée à partir de ton post reste prévue : tu peux la retirer sans malus.'), fix);
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.goTab('studio'); H.update(); });
  await page.waitForSelector('.plan-row');
  const row = await G(page, (id) => { const rows = [...document.querySelectorAll('.plan-row')]; const r = rows.find((x) => /live questions/.test(x.textContent)); return r ? [...r.querySelectorAll('button')].map((b) => b.textContent.trim()) : null; }, fix.id);
  await page.locator('.plan-row', { hasText: 'live questions' }).locator('button', { hasText: 'Retirer sans malus' }).click();
  await page.waitForSelector('.modal');
  const conf = await G(page, () => ({ text: (document.querySelector('.modal') || {}).textContent || '' }));
  await shot(page, 'drop-auto');
  await sleep(800); // (a confirmation is armed a moment after it shows: no tap by mistake)
  await page.locator('.modal button', { hasText: /^Retirer$/ }).click();
  await sleep(400);
  const gone = await G(page, (id) => { const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === id); return { state: r.state, rep: g.stats.reputation, fol: g.stats.followers, notif: (g.notifs.filter((x) => x.k === 'release').slice(-1)[0] || {}).text || '', delay: g.notifs.some((x) => x.k === 'delay' && /live questions/.test(x.text)) }; }, fix.id);
  check('the one the game had launched: « Retirer sans malus », said again in the question, and it goes at no cost',
    !!row && row.includes('Retirer sans malus') && /C’est le jeu qui l’avait lancé à partir de ton post : tu peux le retirer sans rien perdre\./.test(conf.text) && gone.state === 'dropped' && !gone.delay
      && /^Ton live « live questions » quitte ton programme : c’est le jeu qui l’avait lancé à partir de ton post, rien de perdu\.$/.test(gone.notif), { row, conf: conf.text.slice(0, 200), gone });

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
