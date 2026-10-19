// 0.18 end to end, in Chromium against the built hype.html with the mocked Claude runtime:
// - the player's secrets: up to three at the start (or later, from the profile), each with a weight; nobody knows them
//   (they are in no prompt); confided in private (the button, or in the player's own words), they are known; an enemy
//   digs (the AI decides, the game rolls), a confidant lets one slip, a friend's inquiry finds one; whoever holds it and
//   resents the player throws it out; the player answers (deny, own it, apologize, keep quiet) and the AI judges; a denial
//   that worked can be proved a lie; a confession costs less than being unmasked; a hidden ad becomes a secret;
// - dilemmas: two close friends ask for the one spot on a contract (30 %, one every three game days at most), the one
//   left aside may take it badly, and the answer leaves a trace; a friend's dossier on someone; a brand's offer to hide
//   the ad; a collab someone close cannot stand;
// - surprise visits: decided by the AI, they open over the game (no way out but « pas maintenant »), a few exchanges
//   judged like a date, and the price of « pas maintenant » by who they are and why they came.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v18.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v18');
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
async function dismiss(page) { for (let k = 0; k < 6 && (await page.$('.modal:not(.sticky)')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(700); } }
async function clickText(page, sel, text) {
  const el = page.locator(sel, { hasText: text }).first();
  if (!sel.startsWith('.modal')) await dismiss(page);
  await el.waitFor({ state: 'visible', timeout: 15000 });
  await el.click();
}
const G = (page, fn, arg) => page.evaluate(fn, arg);
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit); })) await sleep(250); };
const clean = (page) => G(page, () => { const H = window.__hype; H.S.stack = []; H.S.modals = []; H.S.modalGapUntil = 0; H.update(); });

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

const S1 = 'J’ai acheté 5 000 abonnés à mes débuts';
const S2 = 'Un vieux post dont j’ai honte';
const S3 = 'J’ai copié le concept de ma première vidéo virale';

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);
  await clickText(page, 'button', 'Nouvelle partie');
  await clickText(page, 'button.world', 'Académie Lumen');
  await page.waitForSelector('#pn');
  await page.fill('#pn', 'Mila Flux');
  await clickText(page, '.seg button', 'Elle');
  await page.fill('#pi', 'Une influenceuse qui enquête sur les secrets de l’académie');
  // ---------- the secrets, at the start ----------
  await page.locator('.secrets-field .btn', { hasText: 'Ajouter un secret' }).click();
  await page.locator('.secrets-field .secret-edit input').nth(0).fill(S1);
  await page.locator('.secrets-field .secret-edit').nth(0).locator('.seg button', { hasText: 'Grave' }).click();
  await page.locator('.secrets-field .sec-ex .chip-btn', { hasText: 'Un vieux post' }).click();
  await page.locator('.secrets-field').scrollIntoViewIfNeeded();
  await shot(page, 'persona-secrets');
  const form = await page.$eval('.secrets-field', (e) => ({ rows: e.querySelectorAll('.secret-edit').length, on: [...e.querySelectorAll('.seg button.on')].map((b) => b.textContent) }));
  await clickText(page, '.tier', 'Sans limite');
  await page.check('#p18');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=Qui sera ton premier abonné', { timeout: 20000 });
  await page.locator('.cast-card.pick', { hasText: 'Théo' }).click();
  await page.click('.cast-cta button');
  await page.waitForSelector('.post');
  await sleep(1200);
  await dismiss(page);
  const c1 = await G(page, ({ S1, S2 }) => {
    const H = window.__hype, g = H.S.game, list = H.mySecrets(g);
    return { n: list.length, sev: list.map((s) => s.sev), texts: list.map((s) => s.t), ids: list.every((s) => /^sc/.test(s.id) && Array.isArray(s.known) && !s.known.length && !s.out),
      nowhere: !window.__prompts.some((p) => p.includes(S1) || p.includes(S2)), ctx: !H.ctxText(g).includes(S1) && !H.promptRefresh(g, 0).includes(S2) };
  }, { S1, S2 });
  check('at the start, up to three secrets with their weight (written, or picked among examples); nobody knows them: no prompt ever has them',
    form.rows === 2 && form.on.includes('😰 Grave') && c1.n === 2 && c1.sev.join() === '2,1' && c1.texts[0] === S1 && c1.texts[1] === S2 && c1.ids && c1.nowhere && c1.ctx, { form, c1 });

  // ---------- the profile: add one more ----------
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.goTab('profile'); });
  await page.waitForSelector('.section.secrets');
  await page.locator('.section.secrets .btn', { hasText: 'Ajouter un secret' }).click();
  await page.fill('.section.secrets .secret-edit input', S3);
  await page.locator('.section.secrets .secret-edit .seg button', { hasText: 'Explosif' }).click();
  await page.locator('.section.secrets .secret-edit .btn', { hasText: 'Ajouter' }).click();
  await sleep(400);
  await page.locator('.section.secrets').scrollIntoViewIfNeeded();
  await shot(page, 'profile-secrets');
  const p1 = await page.$eval('.section.secrets', (e) => ({ cards: e.querySelectorAll('.secret-card').length, add: [...e.querySelectorAll('.btn')].some((b) => /Ajouter un secret/.test(b.textContent)), none: [...e.querySelectorAll('.secret-card small')].every((x) => /Personne ne le sait, à ta connaissance/.test(x.textContent)), chips: [...e.querySelectorAll('.secret-card .chip')].map((x) => x.textContent), confess: e.querySelectorAll('.secret-card .btn').length }));
  const p1b = await G(page, () => { const H = window.__hype, g = H.S.game; return { n: H.mySecrets(g).length, four: !!H.addSecret(g, 'Un quatrième secret de trop', 1) }; });
  check('on the profile: the secrets, their weight, who knows them as far as the player knows; one more can be added, three at most; each one can be confessed in a post',
    p1.cards === 3 && !p1.add && p1.none && p1.chips.join('|') === '😰 Grave|😬 Gênant|💣 Explosif' && p1.confess === 3 && p1b.n === 3 && !p1b.four, Object.assign({ p1b }, p1));

  // ---------- confiding one in private (the button) ----------
  await G(page, () => { const H = window.__hype, g = H.S.game, T = H.charByHandle(g, 'theo.marlin'); Object.assign(T, { unlocked: true, cut: null, cool: null, dare: null }); H.S.stack = []; H.openDM(T.id); });
  await page.waitForSelector('.layer .confide-btn');
  await page.click('.layer .confide-btn');
  await page.waitForSelector('.layer .confide-pop');
  const opts = await page.$$eval('.layer .confide-opt', (els) => els.map((e) => e.textContent));
  await page.locator('.layer .confide-opt', { hasText: 'acheté' }).click();
  await sleep(200);
  const pre = await page.$eval('.layer textarea', (e) => e.value);
  const hint = await page.$eval('.layer .conf-hint', (e) => e.textContent);
  await shot(page, 'confide');
  const n1 = await G(page, () => window.__prompts.length);
  await page.click('.layer .reply-box .send');
  await idle(page);
  await sleep(600);
  const d1 = await G(page, ({ n, S1 }) => {
    const H = window.__hype, g = H.S.game, T = H.charByHandle(g, 'theo.marlin'), s = H.mySecrets(g).find((x) => x.t === S1);
    const p = window.__prompts.slice(n).find((x) => x.includes('CONVERSATION PRIVÉE')) || '';
    const mine = g.dms[T.id].msgs.filter((m) => m.me).pop() || {};
    const liens = H.ctxText(g, { focus: new Set([T.id]) });
    return { told: /Le joueur vient de confier à Théo Marlin un secret sur lui \(grave\) : « J’ai acheté 5 000 abonnés à mes débuts »/.test(p), known: s.known.map((k) => [k.c === T.id, k.how]),
      mem: T.mem.some((m) => /le joueur m’a confié un secret : « J’ai acheté/.test(m.t)), sec: mine.sec === s.id, liens: liens.includes(`[${s.id}] « ${S1} » (grave, le joueur le lui a confié)`) };
  }, { n: n1, S1 });
  const bubble = await page.$$eval('.layer .bubble.me.conf', (els) => els.map((e) => e.textContent));
  await shot(page, 'confided');
  check('confided in private with the button: the message is prefilled (the player may rewrite it), the AI is told, and from then on that person knows (their memory, the AI context, a « Confidence » in the conversation)',
    opts.length === 3 && pre === `Je te confie un truc, ça reste entre nous : ${S1}` && /Tu confies à Théo/.test(hint) && d1.told && d1.known.length === 1 && d1.known[0][0] && d1.known[0][1] === 'confie' && d1.mem && d1.sec && d1.liens && bubble.some((t) => /Confidence/.test(t)),
    Object.assign({ opts, pre, hint, bubble }, d1));
  // in the player's own words
  const d2 = await G(page, async ({ S2 }) => {
    const H = window.__hype, g = H.S.game, M = H.charByHandle(g, 'maelle.fen');
    Object.assign(M, { unlocked: true, cut: null, cool: null, dare: null });
    const ok = await H.sendDM(M.id, 'tu sais quoi, un vieux post dont j’ai honte traîne encore quelque part. personne ne doit le voir');
    const s = H.mySecrets(g).find((x) => x.t === S2);
    const other = H.confidedIn(g, M, 'il fait beau aujourd’hui à Lumen, on va au lac ?');
    return { ok, how: (s.known.find((k) => k.c === M.id) || {}).how, other };
  }, { S2 });
  check('confided in the player’s own words: the game recognizes the secret (most of its words), and an ordinary message is no confession', d2.ok && d2.how === 'confie' && !d2.other, d2);
  await clean(page);

  // ---------- an enemy digs ----------
  const n2 = await G(page, () => window.__prompts.length);
  await G(page, () => {
    const H = window.__hype, g = H.S.game, Z = H.charByHandle(g, 'zara.vey');
    Object.assign(Z, { unlocked: true, rel: -60, vibe: 'nemesis', cut: null, mem: [] });
    g.digAt = 0; g.triggers = []; g.lastRefreshAt = 0;
    window.__digOffer = true; window.__mockDig = 'zara.vey';
    window.__rolls18 = [0, 0, 0.99]; // which secret (the first, by weight), found, no friend to warn
    return H.refreshFeed(0);
  });
  await idle(page);
  const g1 = await G(page, ({ n, S1 }) => {
    const H = window.__hype, g = H.S.game, Z = H.charByHandle(g, 'zara.vey'), s = H.mySecrets(g).find((x) => x.t === S1);
    window.__digOffer = false; window.__mockDig = null;
    const p = window.__prompts.slice(n).find((x) => x.includes('## TA MISSION')) || '';
    const m = Z.mem.find((x) => /j’ai découvert un secret du joueur/.test(x.t)) || {};
    return { line: /un ennemi du joueur \(@zara\.vey\) fouille dans son passé/.test(p) && p.includes('n’invente pas de révélation'), how: (s.known.find((k) => k.c === Z.id) || {}).how, shown: m.s, dig: Date.now() - g.digAt < 600000,
      trig: g.triggers.some((x) => x.c === Z.id && /a déterré un secret du joueur : « J’ai acheté/.test(x.text)), again: H.digOK(g), chance: Math.round(H.digChance(g, s) * 100) };
  }, { n: n2, S1 });
  check('an enemy digs into the player’s past when the AI decides (the game offers it, rolls what they find): they know it now, the player only sees they « take a close interest in your past »; not again for a day and a half',
    g1.line && g1.how === 'enquete' && g1.shown === 's’intéresse de près à ton passé' && g1.dig && g1.trig && !g1.again && g1.chance >= 15 && g1.chance <= 75, g1);

  // ---------- thrown out in public ----------
  const r0 = await G(page, () => { const g = window.__hype.S.game; return { rep: g.stats.reputation, fol: g.stats.followers }; });
  await G(page, () => { const H = window.__hype, g = H.S.game; g.lastRefreshAt = 0; window.__mockExpose = 'zara.vey'; return H.refreshFeed(0); });
  await idle(page);
  const e1 = await G(page, ({ S1, r0 }) => {
    const H = window.__hype, g = H.S.game, Z = H.charByHandle(g, 'zara.vey'), s = H.mySecrets(g).find((x) => x.t === S1);
    window.__mockExpose = null;
    const o = s.out || {}, post = g.posts.find((p) => p.id === o.post) || {};
    return { by: o.by === Z.id, how: o.how, state: o.state, post: post.a === 'c:' + Z.id && post.secret === s.id, rep: g.stats.reputation < r0.rep, fol: g.stats.followers < r0.fol, d: o.rep,
      modal: H.S.modals.some((m) => m.t === 'secret' && m.sid === s.id), notif: g.notifs.some((n) => /Zara Vey balance ton secret : « J’ai acheté/.test(n.text)), ctx: H.secretsOutCtx(g).some((x) => /sorti au grand jour \(grave\).*révélé par @zara\.vey ; il n’a pas encore répondu/.test(x)) };
  }, { S1, r0 });
  await page.waitForSelector('.modal .secret-modal', { timeout: 15000 });
  await sleep(500);
  const em = await page.$eval('.modal', (e) => ({ text: e.textContent, paths: [...e.querySelectorAll('.path b')].map((x) => x.textContent) }));
  await shot(page, 'secret-out');
  check('someone who holds it and resents the player throws it out (when the AI decides, after their post): the reputation and followers drop, the network knows it is true, and the player is asked how to answer',
    e1.by && e1.how === 'revele' && e1.state === 'live' && e1.post && e1.rep && e1.fol && e1.d < 0 && e1.modal && e1.notif && e1.ctx && /RÉVÉLÉ/.test(em.text) && em.paths.join('|') === 'Démentir|Assumer|M’excuser' && /Me taire/.test(em.text), Object.assign({ em: em.paths }, e1));

  // ---------- the answer: a denial (a lie), believed… then proved ----------
  await page.locator('.modal .path', { hasText: 'Démentir' }).click();
  await page.waitForSelector('.layer #compose');
  const ch = await page.$eval('.layer', (e) => ({ title: (e.querySelector('h2') || {}).textContent, hint: (e.querySelector('.secret-hint') || {}).textContent || '' }));
  await page.fill('.layer #compose', 'N’importe quoi. Je n’ai jamais acheté un seul abonné, et @zara.vey le sait très bien.');
  await shot(page, 'deny-compose');
  const r1 = await G(page, () => { window.__mockSecCred = 8; return window.__hype.S.game.stats.reputation; });
  const n3 = await G(page, () => window.__prompts.length);
  await page.locator('.layer .btn-sm.btn-hot', { hasText: 'Démentir' }).click();
  await idle(page);
  await sleep(4500);
  const a1 = await G(page, ({ n, S1, r1 }) => {
    const H = window.__hype, g = H.S.game, Z = H.charByHandle(g, 'zara.vey'), s = H.mySecrets(g).find((x) => x.t === S1);
    const p = window.__prompts.slice(n).find((x) => x.includes('## ACTION DU JOUEUR')) || '';
    const post = g.posts.filter((x) => x.a === 'p').pop() || {};
    return { p: /RÉPOND à la révélation de son secret par @zara\.vey/.test(p) && /Il DÉMENT \(c’est un mensonge/.test(p) && p.includes('"credibility":5') && /Ce secret est VRAI/.test(p),
      answer: s.out.answer, cred: s.out.cred, lie: s.out.lie, state: s.out.state, up: g.stats.reputation > r1, post: !!post.secAns && post.secAns.stance === 'dement',
      trig: g.triggers.some((x) => x.c === Z.id && /c’est un mensonge, et @zara\.vey le sait/.test(x.text)), banner: !H.liveSecret(g) };
  }, { n: n3, S1, r1 });
  check('the player denies (a lie): the AI judges how it lands (here: believed), part of the damage comes back, the post says what it answers; whoever knows the truth knows it is a lie',
    ch.title === 'Démentir' && /mensonge/.test(ch.hint) && a1.p && a1.answer === 'dement' && a1.cred === 8 && a1.lie === true && a1.state === 'done' && a1.up && a1.post && a1.trig && a1.banner, Object.assign({ ch }, a1));
  await clean(page);
  const r2 = await G(page, () => { const H = window.__hype, g = H.S.game; g.lastRefreshAt = 0; window.__mockProof = 'zara.vey'; return { rep: g.stats.reputation, line: H.proofLines(g).length }; });
  await G(page, () => window.__hype.refreshFeed(0));
  await idle(page);
  const pr = await G(page, ({ S1, r2 }) => {
    const H = window.__hype, g = H.S.game, s = H.mySecrets(g).find((x) => x.t === S1);
    window.__mockProof = null;
    return { lie: s.out.lie, down: g.stats.reputation < r2.rep, pbb: !!(g.pbb && g.pbb.kind === 'mensonge'), modal: H.S.modals.some((m) => m.t === 'secretlie'), line: r2.line, again: H.proofLines(g).length,
      ctx: H.secretsOutCtx(g).some((x) => /il a démenti, mais son mensonge a été démasqué/.test(x)), ev: g.posts.some((p) => p.ev && p.ev.real && /la preuve/.test(p.ev.desc)) };
  }, { S1, r2 });
  await page.waitForSelector('.modal .busted', { timeout: 15000 });
  const lm = await page.$eval('.modal', (e) => e.textContent);
  await shot(page, 'lie-proved');
  await dismiss(page);
  check('whoever knows the truth can prove the lie (the AI decides when): the player sinks further (a bad buzz), the network and the next prompts know',
    pr.line === 1 && pr.lie === 'caught' && pr.down && pr.pbb && pr.modal && !pr.again && pr.ctx && pr.ev && /MENSONGE/.test(lm), pr);

  // ---------- a confession costs less ----------
  await clean(page);
  await G(page, () => { window.__hype.goTab('profile'); });
  await page.waitForSelector('.section.secrets');
  const full = await G(page, ({ S3 }) => { const H = window.__hype, g = H.S.game, s = H.mySecrets(g).find((x) => x.t === S3); return H.repTry(g, H.SEVS[s.sev].hit); }, { S3 });
  await page.locator('.secret-card', { hasText: 'copié le concept' }).locator('.btn', { hasText: 'Avouer' }).click();
  await page.waitForSelector('.layer #compose');
  const cc = await page.$eval('.layer', (e) => ({ title: (e.querySelector('h2') || {}).textContent, hint: (e.querySelector('.secret-hint') || {}).textContent || '' }));
  await page.fill('.layer #compose', 'Je vous dois la vérité : ma première vidéo virale, j’en ai copié le concept. Je ne le referai plus.');
  await shot(page, 'confess-compose');
  const n4 = await G(page, () => { window.__mockSincerity = 8; return window.__prompts.length; });
  await page.locator('.layer .btn-sm.btn-hot', { hasText: 'Avouer' }).click();
  await idle(page);
  await sleep(4500);
  const cf = await G(page, ({ n, S3, full }) => {
    const H = window.__hype, g = H.S.game, s = H.mySecrets(g).find((x) => x.t === S3);
    const p = window.__prompts.slice(n).find((x) => x.includes('## ACTION DU JOUEUR')) || '';
    return { p: /AVOUE PUBLIQUEMENT un secret sur lui-même/.test(p) && p.includes('"sincerity":5'), how: s.out && s.out.how, state: s.out && s.out.state, d: s.out && s.out.rep, full, less: s.out && Math.abs(s.out.rep) < Math.abs(full) * 0.5,
      notif: g.notifs.some((x) => /Tu as avoué : « J’ai copié le concept/.test(x.text) && /Ton honnêteté est saluée/.test(x.text)), modal: H.S.modals.some((m) => m.t === 'secret' && m.sid === s.id) };
  }, { n: n4, S3, full });
  check('confessing it first, in a post: the AI judges the sincerity, and it costs far less than being unmasked (here a third of it, honesty saluted); nothing to answer after',
    cc.title === 'Avouer un secret' && /Tu avoues/.test(cc.hint) && cf.p && cf.how === 'aveu' && cf.state === 'done' && cf.d < 0 && cf.less && cf.notif && !cf.modal, Object.assign({ cc }, cf));

  // ---------- a confidant lets it slip ----------
  await clean(page);
  await G(page, () => {
    const H = window.__hype, g = H.S.game, M = H.charByHandle(g, 'maelle.fen'), L = H.charByHandle(g, 'leandre.aube');
    Object.assign(M, { rel: 30, vibe: null, cut: null }); Object.assign(L, { unlocked: true, rel: 10, vibe: null, cut: null, mem: [] });
    g.slipAt = 0; g.lastRefreshAt = 0;
    window.__slipOffer = true; window.__mockSlip = { by: 'maelle.fen', to: 'leandre.aube' };
    return H.refreshFeed(0);
  });
  await idle(page);
  const sl = await G(page, ({ S2 }) => {
    const H = window.__hype, g = H.S.game, M = H.charByHandle(g, 'maelle.fen'), L = H.charByHandle(g, 'leandre.aube'), s = H.mySecrets(g).find((x) => x.t === S2);
    window.__slipOffer = false; window.__mockSlip = null;
    const k = s.known.find((x) => x.c === L.id) || {};
    const m = L.mem.find((x) => /m’a appris un secret du joueur/.test(x.t)) || {};
    return { how: k.how, from: k.from === M.id, t: m.t, s: m.s, ctx: H.secretKnowCtx(g, L).includes('appris par @maelle.fen') };
  }, { S2 });
  check('a confidant may let it slip to someone else (the AI decides): that person knows it now, and from whom; the player is not told who',
    sl.how === 'fuite' && sl.from && /^Maëlle m’a appris un secret du joueur/.test(sl.t || '') && sl.s === 'a entendu des choses sur toi' && sl.ctx, sl);

  // ---------- a surprise visit ----------
  await clean(page);
  await G(page, () => {
    const H = window.__hype, g = H.S.game, T = H.charByHandle(g, 'theo.marlin');
    Object.assign(T, { rel: 55, visitAt: 0, cut: null, cool: null, coeur: 'serein' });
    g.visitAt = 0; g.visits = [];
    window.__visitOffer = true;
    window.__mockVisit = { by: 'theo.marlin', urge: 'urgent', why: 'il t’a vu draguer Zara en public', first: 'on peut parler ? je t’ai vu avec Zara hier soir.' };
    H.goTab('feed');
  });
  const n5 = await G(page, () => window.__prompts.length);
  await G(page, () => window.__hype.runAct('post', 'belle journée à Lumen, le lac brille ☀️'));
  await page.waitForSelector('.modal .visit-card', { timeout: 20000 });
  await sleep(600);
  const v0 = await G(page, (n) => {
    const H = window.__hype, g = H.S.game, v = H.liveVisit(g);
    window.__visitOffer = false;
    const p = window.__prompts.slice(n).find((x) => x.includes('## ACTION DU JOUEUR')) || '';
    return { line: p.includes('{"t":"visit","by":"handle"') && /débarque chez le joueur SANS PRÉVENIR/.test(p), state: v && v.state, urge: v && v.urge, first: v && v.lines[0].text, gap: !H.visitOK(g) && !H.visitLine(g) };
  }, n5);
  await page.mouse.click(8, 8); // outside the card
  await page.keyboard.press('Escape');
  await sleep(500);
  const still = !!(await page.$('.modal .visit-card'));
  const vt = await page.$eval('.modal .visit-card', (e) => ({ head: (e.querySelector('.visit-head') || {}).textContent, no: !!e.querySelector('.visit-no'), lines: e.querySelectorAll('.talk-line').length }));
  await shot(page, 'visit-door');
  check('a surprise visit: the AI decides it while the network reacts (the game offers it now and then); it opens over the game and stays there (no click outside, no Escape): talk, or « pas maintenant »',
    v0.line && v0.state === 'knock' && v0.urge === 'urgent' && /je t’ai vu avec Zara/.test(v0.first) && v0.gap && still && /Théo Marlin débarque chez toi/.test(vt.head) && vt.no && vt.lines === 1, Object.assign({ still, vt }, v0));
  const rel0 = await G(page, () => { window.__mockReacts = ['charme']; const H = window.__hype; return H.charByHandle(H.S.game, 'theo.marlin').rel; });
  const n6 = await G(page, () => window.__prompts.length);
  await page.fill('.modal .visit-card textarea', 'je comprends que ça t’ait fait mal. avec Zara on parlait juste du duel, je te le promets.');
  await page.click('.modal .visit-card .send');
  await G(page, async () => { const end = Date.now() + 15000; while (window.__hype.S.busy.visit && Date.now() < end) await new Promise((r) => setTimeout(r, 200)); });
  await sleep(400);
  const v1 = await G(page, (n) => {
    const H = window.__hype, g = H.S.game, v = H.liveVisit(g);
    const p = window.__prompts.slice(n).find((x) => x.includes('TÂCHE : UNE VISITE SURPRISE')) || '';
    return { p: p.includes('« il t’a vu draguer Zara en public »') && /URGENT pour lui ou elle/.test(p) && p.includes('avec Zara on parlait juste du duel') && p.includes('{"t":"judge","react":"charme"}') && p.includes('"t":"leave"'),
      turn: v && v.turn, lines: v && v.lines.length, state: v && v.state, noOut: !document.querySelector('.modal .visit-no') };
  }, n6);
  await shot(page, 'visit-talk');
  await G(page, () => { window.__mockReacts = ['charme']; window.__mockLeaveNow = true; });
  await page.fill('.modal .visit-card textarea', 'viens, on va se faire un chocolat chaud et on en parle tranquillement.');
  await page.click('.modal .visit-card .send');
  await G(page, async () => { const end = Date.now() + 15000; while (window.__hype.S.busy.visit && Date.now() < end) await new Promise((r) => setTimeout(r, 200)); });
  await sleep(400);
  const over = await page.$eval('.modal .visit-card', (e) => e.textContent);
  await shot(page, 'visit-end');
  await page.locator('.modal .visit-card .btn', { hasText: 'Raccompagner' }).click();
  await sleep(600);
  const v2 = await G(page, (rel0) => {
    const H = window.__hype, g = H.S.game, T = H.charByHandle(g, 'theo.marlin'), v = g.visits[g.visits.length - 1];
    window.__mockLeaveNow = false;
    const card = g.dms[T.id].msgs.filter((m) => m.sys === 'visit').pop() || {};
    return { state: v.state, mood: v.mood, up: T.rel > rel0, mem: T.mem.some((m) => /pour « il t’a vu draguer Zara en public » : je suis reparti apaisé/.test(m.t)), card: card.mood === 'apaise' && card.title === 'il t’a vu draguer Zara en public',
      notif: g.notifs.some((n) => /🚪 Théo est reparti apaisé/.test(n.text)), ctx: /est passé voir le joueur .* : reparti apaisé/.test(H.visitCtx(g, T)), gone: !document.querySelector('.modal .visit-card') };
  }, rel0);
  check('the visit is played in the player’s own words (judged like a date: what they came for, sincerity, their heart), until they leave; the last words stay on screen and the player sees them out; it leaves a memory, a card in your conversation, and the AI knows',
    v1.p && v1.turn === 1 && v1.lines === 3 && v1.state === 'talk' && v1.noOut && /Théo s’en va, apaisé/.test(over) && v2.state === 'done' && v2.mood === 'apaise' && v2.up && v2.mem && v2.card && v2.notif && v2.ctx && v2.gone, Object.assign({ over: over.slice(-120) }, v1, v2));
  // « pas maintenant »: urgent, badly taken
  const pm = await G(page, () => {
    const H = window.__hype, g = H.S.game, L = H.charByHandle(g, 'leandre.aube'), M = H.charByHandle(g, 'maelle.fen');
    Object.assign(L, { rel: 30, visitAt: 0, cut: null, cool: null, matu: 'immature', coeur: 'jaloux', vibe: 'crush' });
    Object.assign(M, { rel: 75, visitAt: 0, cut: null, cool: null, matu: 'tres_mature', temper: 'detache', coeur: 'serein' });
    g.visitAt = 0;
    const pU = H.visitBadChance(g, L, 'urgent'), pT = H.visitBadChance(g, M, 'tranquille'), pI = H.visitBadChance(g, M, 'important');
    H.addVisit(g, { by: 'leandre.aube', urge: 'urgent', why: 'la rumeur qui court sur toi et moi', first: 'il faut qu’on parle. maintenant.' }, Date.now());
    return { pU, pT, pI };
  });
  await page.waitForSelector('.modal .visit-card', { timeout: 8000 });
  const rL = await G(page, () => { const H = window.__hype; window.__rolls18 = [0.5]; return [H.charByHandle(H.S.game, 'leandre.aube').rel, H.trustOf(H.charByHandle(H.S.game, 'leandre.aube'))]; });
  await page.click('.modal .visit-card .visit-no');
  await sleep(500);
  const pm1 = await G(page, (rL) => {
    const H = window.__hype, g = H.S.game, L = H.charByHandle(g, 'leandre.aube'), v = g.visits[g.visits.length - 1];
    const card = g.dms[L.id].msgs.filter((m) => m.sys === 'visit').pop() || {};
    return { state: v.state, bad: v.bad, rel: L.rel - rL[0], trust: H.trustOf(L) - rL[1], trig: g.triggers.some((x) => x.c === L.id && /est furieux : le joueur lui a fermé la porte/.test(x.text)), card: /tu as dit « pas maintenant » : il est reparti furieux/.test(card.text) && !card.title, gone: !document.querySelector('.modal .visit-card') };
  }, rL);
  // « pas maintenant »: a quiet visit, taken well
  const pm2 = await G(page, () => {
    const H = window.__hype, g = H.S.game, M = H.charByHandle(g, 'maelle.fen');
    g.visitAt = 0; M.visitAt = 0;
    const v = H.addVisit(g, { by: 'maelle.fen', urge: 'tranquille', why: 'une tisane à te faire goûter', first: 'coucou ! je passais avec une tisane 🌿' }, Date.now());
    const rel = M.rel;
    window.__rolls18 = [0.9];
    H.refuseVisit(g, v);
    return { state: v.state, bad: v.bad, rel: M.rel - rel, mem: M.mem.some((m) => /le joueur n’était pas dispo : on se verra une autre fois/.test(m.t)), notif: g.notifs.some((n) => /Maëlle repassera une autre fois/.test(n.text)) };
  });
  await clean(page);
  check('« pas maintenant » has a price by who they are and above all why they came: something urgent is almost always taken badly (relation, trust, they let it show), a quiet visit usually passes (some still take it badly)',
    pm.pU >= 0.8 && pm.pT <= 0.45 && pm.pT >= 0.05 && pm.pI >= 0.3 && pm.pI <= 0.75 && pm1.state === 'refused' && pm1.bad && pm1.rel <= -10 && pm1.trust < 0 && pm1.trig && pm1.card && pm1.gone
    && pm2.state === 'refused' && !pm2.bad && pm2.rel === 0 && pm2.mem && pm2.notif, { pm, pm1, pm2 });

  // ---------- a dilemma: two friends, one spot on a contract ----------
  const x0 = await G(page, () => {
    const H = window.__hype, g = H.S.game, T = H.charByHandle(g, 'theo.marlin'), M = H.charByHandle(g, 'maelle.fen');
    for (const c of H.mains(g)) if (c !== T && c !== M && c.rel >= 35) c.rel = 20;
    Object.assign(T, { rel: 60, vibe: null, cut: null, cool: null, unlocked: true });
    Object.assign(M, { rel: 50, vibe: null, cut: null, cool: null, unlocked: true, passedOver: 0 });
    g.dilemmaAt = 0; g.dilemmas = []; g.triggers = []; g.lastRefreshAt = 0;
    g.stats.followers = Math.max(g.stats.followers, 6000);
    window.__dilForce = true;
    const d = H.makeOffer(g, { brand: 'Potions Pétillantes', sector: 'boisson', product: 'sa potion au citron', what: 'vidéo', contact: 'Inès Garnier', g: 'f' });
    const signed = H.signDeal(g, d);
    window.__dilForce = false;
    const x = g.dilemmas[0] || {};
    const pd = H.dilemmaOnDeal(g, d);
    return { signed, k: x.k, state: x.state, two: [x.a, x.b].sort().join() === [T.id, M.id].sort().join(), again: pd, p: H.DIL_P };
  });
  const n7 = await G(page, () => window.__prompts.length);
  await G(page, () => window.__hype.refreshFeed(0));
  await idle(page);
  await sleep(500);
  const x1 = await G(page, (n) => {
    const H = window.__hype, g = H.S.game, x = g.dilemmas[0], T = H.charByHandle(g, 'theo.marlin'), M = H.charByHandle(g, 'maelle.fen');
    const p = window.__prompts.slice(n).find((y) => y.includes('## TA MISSION')) || '';
    return { line: /OBLIGATOIRE cette fois : @(theo\.marlin|maelle\.fen) et @(theo\.marlin|maelle\.fen) ont appris que le joueur vient de signer un partenariat avec Potions Pétillantes/.test(p), state: x.state, asked: x.asked.length,
      dms: [T, M].every((c) => g.dms[c.id].msgs.some((m) => !m.me && /tu me prends/.test(m.text || ''))), notif: g.notifs.some((y) => /Théo et Maëlle veulent tous les deux la place|Maëlle et Théo veulent tous les deux la place/.test(y.text)),
      dmLine: /\{"t":"choice","to":"handle choisi, ou vide si personne"\}/.test(H.promptDM(g, T, [], 'salut')) && /Théo Marlin veut être placé sur le partenariat du joueur avec Potions Pétillantes/.test(H.promptDM(g, T, [], 'salut')) };
  }, n7);
  check('a contract signed while two close friends are around: 30 % of the time (one every three game days at most) they both want the one spot, and the AI makes them ask in private (both messages get through); the player hears it',
    x0.signed && x0.k === 'place' && x0.state === 'asking' && x0.two && !x0.again && x0.p === 0.3 && x1.line && x1.state === 'open' && x1.asked === 2 && x1.dms && x1.notif && x1.dmLine, { x0, x1 });
  const x2 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, T = H.charByHandle(g, 'theo.marlin'), M = H.charByHandle(g, 'maelle.fen');
    const rT = T.rel, rM = M.rel, tie = H.tieOf(g, T.id, M.id), n0 = (g.intel || []).length;
    window.__mockChoice = 'theo.marlin';
    window.__rolls18 = [0.05]; // Maëlle takes it badly
    const ok = await H.sendDM(T.id, 'c’est toi que je prends pour Potions Pétillantes, promis. Maëlle comprendra.');
    window.__mockChoice = null;
    const x = g.dilemmas[0], d = g.deals.find((y) => y.brand === 'Potions Pétillantes');
    const it = (g.intel || []).slice(n0);
    return { ok, state: x.state, chosen: x.chosen === T.id, guest: d.guest === T.id, tUp: T.rel > rT, mDown: M.rel < rM, over: M.passedOver, tie: H.tieOf(g, T.id, M.id) - tie, trace: it.some((y) => y.by === T.id && /Maëlle comprendra/.test(y.quote)),
      trig: g.triggers.some((y) => y.c === M.id && /a appris que le joueur a choisi @theo\.marlin pour son partenariat avec Potions Pétillantes : elle le prend mal/.test(y.text)), notif: g.notifs.some((y) => /Contrat Potions Pétillantes : tu as choisi Théo/.test(y.text)), chance: H.passedOverChance(Object.assign({}, M, { passedOver: 3 })) };
  });
  check('the player answers in their own words (the AI says who got the spot): the chosen one is glad, the other may take it badly (temperament, maturity, how often it happened to them), they cool toward each other, and what the player wrote is kept in a screenshot',
    x2.ok && x2.state === 'done' && x2.chosen && x2.guest && x2.tUp && x2.mDown && x2.over === 1 && x2.tie === -8 && x2.trace && x2.trig && x2.notif && x2.chance > 0.14, x2);
  const x3 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const free0 = H.dilemmaFree(g);
    H.shiftTime(g, 3 * 24 * 3600000 + 60000);
    return { free0, free1: H.dilemmaFree(g) };
  });
  check('one dilemma every three game days at most', !x3.free0 && x3.free1, x3);

  // ---------- the hidden ad: the brand offers more, and it becomes a secret ----------
  const ha = await G(page, async () => {
    const H = window.__hype, g = H.S.game;
    const d = H.makeOffer(g, { brand: 'Glow Tonic', sector: 'beaute', product: 'son sérum lumière', what: 'vidéo', contact: 'Nora Faure', g: 'f' });
    Object.assign(d, { shady: false, banned: '', shadyAsk: null, fee: 800, fee0: 800, max: 1000, value: 0, upfront: 240 }); // a paid offer
    const fee0 = d.fee, c = g.chars[d.contact];
    window.__shadyOffer = true; window.__mockShady = true;
    const ok = await H.sendDM(c.id, 'ok, dis-moi tout sur le contrat');
    window.__shadyOffer = false; window.__mockShady = false;
    const p = window.__prompts.filter((x) => x.includes('CONVERSATION PRIVÉE')).pop() || '';
    const shady = d.shady, fee1 = d.fee;
    H.signDeal(g, d);
    H.deliverDeal(g, d, null, false);
    const s = H.mySecrets(g).find((x) => x.deal === d.id) || {};
    const known = (s.known || []).map((k) => k.how);
    H.S.modals = [];
    H.sanction(g, d);
    return { ok, line: /\{"t":"shady"\}/.test(p), shady, up: fee1 >= Math.round(fee0 * 1.5), auto: s.auto, sev: s.sev, known, out: s.out && s.out.state, quiet: !H.S.modals.some((m) => m.t === 'secret'), fine: H.S.modals.some((m) => m.t === 'money' && m.what === 'fine'), dil: g.dilemmas.some((x) => x.k === 'pub' && x.deal === d.id) };
  });
  check('the hidden ad: a brand’s contact may offer far more to drop the mention (the AI decides, once per offer); delivered that way it is one of the player’s secrets, which the contact knows; spotted by the law, it is out (the fine says it all)',
    ha.ok && ha.line && ha.shady && ha.up && ha.auto === 'pub' && ha.sev === 2 && ha.known.join() === 'marque' && ha.out === 'done' && ha.quiet && ha.fine && ha.dil, ha);

  // ---------- a dossier on someone ----------
  await clean(page);
  await G(page, () => {
    const H = window.__hype, g = H.S.game, T = H.charByHandle(g, 'theo.marlin'), L = H.charByHandle(g, 'leandre.aube');
    Object.assign(T, { rel: 60, vibe: null, cut: null });
    Object.assign(L, { unlocked: true, badBuzz: null, secretOut: null, cut: null, vibe: null, rel: 0 });
    H.setTie(g, T.id, L.id, -60);
    g.dilemmaAt = 0; g.lastRefreshAt = 0;
    window.__dossierOffer = true; window.__mockDossier = { by: 'theo.marlin', about: 'leandre.aube', text: 'les votes truqués du conseil des maisons, captures à l’appui' };
    return H.refreshFeed(0);
  });
  await idle(page);
  const ds = await G(page, async () => {
    const H = window.__hype, g = H.S.game, T = H.charByHandle(g, 'theo.marlin'), L = H.charByHandle(g, 'leandre.aube');
    window.__dossierOffer = false; window.__mockDossier = null;
    const x = g.dilemmas.find((y) => y.k === 'dossier') || {};
    const k = (g.clues || []).find((y) => y.id === x.clue) || {};
    const rT = T.rel, tie = H.tieOf(g, T.id, L.id);
    window.__rolls18 = [0.2]; // Léandre suspects Théo
    await H.runAct('post', '@leandre.aube les votes du conseil étaient truqués. j’ai les captures.', null, null, { accuse: { c: L.id, clues: [k.id], fake: null } });
    return { state0: 'open', clue: /^Dossier de Théo : les votes truqués/.test(k.text || '') && k.dossier === T.id, used: x.state, tUp: T.rel > rT, tie: H.tieOf(g, T.id, L.id) - tie, trig: g.triggers.some((y) => y.c === L.id && /soupçonne @theo\.marlin/.test(y.text)) };
  });
  await idle(page);
  check('a friend offers a dossier on someone they cannot stand (the AI decides): it goes into the player’s file; used in a call-out, the friend is glad, and the target may guess where it came from',
    ds.clue && ds.used === 'used' && ds.tUp && ds.tie === -10 && ds.trig, ds);
  await clean(page);

  // ---------- a collab someone close cannot stand ----------
  const cb = await G(page, () => {
    const H = window.__hype, g = H.S.game, N = H.charByHandle(g, 'nox.ombre'), Z = H.charByHandle(g, 'zara.vey');
    Object.assign(N, { unlocked: true, vibe: 'couple', rel: 70, cut: null });
    Object.assign(Z, { unlocked: true, vibe: null, rel: 20, cut: null });
    H.setTie(g, N.id, Z.id, -70);
    const iv = H.addInvite(g, Z, { what: 'tourner une vidéo ensemble au stade', day: 1, at: '18:00', collab: true });
    H.S.stack = []; H.openDM(Z.id);
    return { foe: (H.collabFoe(g, Z) || {}).handle, iv: !!iv };
  });
  await page.waitForSelector('.layer .collab-foe', { timeout: 5000 });
  const cbt = await page.$eval('.layer .collab-foe', (e) => e.textContent);
  await shot(page, 'collab-foe');
  check('a collab proposed by someone a partner (or a close friend) cannot stand: the invitation says it, so the player chooses knowing it', cb.iv && cb.foe === 'nox.ombre' && /Nox ne supporte pas Zara : ça risque de mal passer/.test(cbt), Object.assign({ cbt }, cb));
  await clean(page);

  // ---------- a friend's inquiry finds a secret; an old game ----------
  const iq = await G(page, () => {
    const H = window.__hype, g = H.S.game, N = H.charByHandle(g, 'nox.ombre'), A = H.charByHandle(g, 'ada.quill');
    for (const c of H.mains(g)) c.vibe = null;
    A.unlocked = true;
    g.events = []; g.fakes = []; g.shady = null;
    const s = H.addSecret(g, 'J’ai menti sur mon âge au début du réseau', 1) || H.hiddenSecrets(g).find((x) => !x.auto);
    if (!s) return { none: true };
    const dirt = H.dirtOn(g, N);
    const q = { id: 'iq-test', c: N.id, by: A.id, at: Date.now(), due: Date.now(), state: 'open' };
    H.resolveInquiry(g, q);
    return { dirt: dirt.some((d) => d.secret === s.id), found: /ton secret : « /.test(q.found || ''), ada: (s.known.find((k) => k.c === A.id) || {}).how, nox: (s.known.find((k) => k.c === N.id) || {}).how };
  });
  check('a friend who investigates the player for someone may find one of their secrets: they both know it then', iq.dirt && iq.found && iq.ada === 'enquete' && iq.nox === 'fuite', iq);
  const mg = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const old = JSON.parse(JSON.stringify(g));
    delete old.player.secrets; delete old.visits; delete old.dilemmas;
    H.migrate(old);
    return { secrets: Array.isArray(old.player.secrets) && old.player.secrets.length === 0, visits: Array.isArray(old.visits), dilemmas: Array.isArray(old.dilemmas), version: document.body.textContent.includes('0.18.0') || true };
  });
  check('a game from before 0.18 opens with no secret, no visit, no dilemma (secrets can be added from the profile)', mg.secrets && mg.visits && mg.dilemmas, mg);

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
