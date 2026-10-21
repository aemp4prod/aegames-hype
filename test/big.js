// 0.30.1, the big productions, in Chromium against the built hype.html with the mocked Claude runtime.
// - From 100 000 subscribers: planned over two or three days (the preparation, the shoot, the post-production, a
//   mini-game each, the clock moving on by their time), a quote at another scale, one at a time.
// - Out: views ×3 (×4,5), shown a part at once and the rest over days (with their money and subscribers).
// - The cast, asked in their messages (their AI says yes or no); the hitches, launched by the characters' AI, decided by
//   the player; several sponsors (a clause that clashes costs half); a day more, given up, a flop, a nomination.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/big.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-big');
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
async function shot(page, name) { shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
const G = (page, fn, arg) => page.evaluate(fn, arg);
const idle = async (page, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.dms || b.story || b.groups || b.devis); })) await sleep(150); await sleep(400); };
const clear = (page) => G(page, () => { const H = window.__hype; H.S.stack = []; H.S.modals.length = 0; H.S.toasts.length = 0; H.S.storyView = null; H.update(); });

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
  await clear(page);
}
// The game's clock set to h o'clock (today), whatever the computer's.
const setHour = (page, h) => G(page, (h) => { const g = window.__hype.S.game; const d = new Date(Date.now() + (g.clockOff || 0)); const x = new Date(d); x.setHours(h, 0, 0, 0); g.clockOff = (g.clockOff || 0) + (x - d) + 60000; }, h);

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const { page } = await newPage(browser, { width: 1280, height: 860 });
  await newGame(page);

  /* ---------- 1. from 100 000 subscribers; two or three days, planned ---------- */
  await setHour(page, 8);
  const u1 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    g.career.platform = 'youtube';
    g.gear.items.pc = H.mkItem(1);
    g.staff = [];
    g.stats.followers = 60000;
    const low = H.bigWhy(g);
    g.stats.followers = 150000;
    g.career.cash = 60000;
    const ok = H.bigWhy(g);
    const hr = (t) => new Date(t + g.clockOff).getHours(), day0 = new Date(new Date(Date.now() + g.clockOff).toDateString());
    const dd = (t) => Math.round((new Date(new Date(t + g.clockOff).toDateString()) - day0) / 86400000);
    const sum = (p) => ({ slots: p.slots.map((t) => [dd(t), hr(t)]), works: p.works, out: [dd(p.out), hr(p.out)], ok: p.ok });
    return { low, ok, p2: sum(H.bigPlan(g, { what: 'vidéo', size: 2, day: 0, hour: 20 })), p3: sum(H.bigPlan(g, { what: 'vidéo', size: 3, day: 1, hour: 20 })), ps: sum(H.bigPlan(g, { what: 'short', size: 2, day: 1, hour: 12 })) };
  });
  check('les grosses productions s’ouvrent à 100 000 abonnés ; sur 2 jours : préparation 9 h (4 h), tournage 14 h (6 h), post-production le lendemain 9 h (5 h), sortie le soir ; sur 3 jours : une étape par jour (6 h, 9 h, 7 h) ; un short, deux fois moins',
    /100\s000 abonnés/.test(u1.low) && u1.ok === '' && JSON.stringify(u1.p2.slots) === '[[0,9],[0,14],[1,9]]' && u1.p2.works.join() === '4,6,5' && u1.p2.out.join() === '1,20' && u1.p2.ok
      && JSON.stringify(u1.p3.slots) === '[[1,9],[2,9],[3,9]]' && u1.p3.works.join() === '6,9,7' && u1.p3.out.join() === '3,20' && u1.ps.works.join() === '2,3,2.5' && u1.ps.ok, u1);

  // the Studio: the button; the planner (its schedule), the quote, launched
  await G(page, () => { const H = window.__hype; H.goTab('studio'); H.update(); });
  await sleep(500);
  const st0 = await G(page, () => { const b = [...document.querySelectorAll('.big-btn')][0]; if (b) b.scrollIntoView({ block: 'center' }); return b ? { text: b.textContent, off: b.disabled } : null; });
  await G(page, () => { const H = window.__hype; window.__hypeEasyGear = false; H.openLayer({ t: 'big' }); H.update(); }); // (the quote, for real)
  await page.waitForSelector('.layer .big-plan');
  await page.fill('#bg-theme', '24 h dans une fête foraine abandonnée');
  await sleep(200);
  const pl0 = await G(page, () => { const L = document.querySelector('.layer .big-plan'); return { list: [...L.querySelectorAll('.big-plan-list li')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()), sizes: L.querySelectorAll('.big-sizes .diff-opt').length }; });
  await page.locator('.layer .big-plan button', { hasText: 'Demander le devis' }).click();
  await page.waitForSelector('.layer .big-plan .devis-card', { timeout: 15000 });
  await shot(page, 'planner');
  const devisP = await G(page, () => (window.__prompts || []).filter((p) => p.includes('## TÂCHE : LE DEVIS')).slice(-1)[0] || '');
  await page.locator('.layer .big-plan > .btn-hot').click();
  await sleep(600);
  if (await page.locator('.modal .modal-card button', { hasText: 'Payer et lancer la production' }).count()) await page.locator('.modal .modal-card button', { hasText: 'Payer et lancer la production' }).click();
  await sleep(600);
  const r1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, r = H.bigOn(g);
    return r ? { id: r.id, size: r.big.size, stage: r.big.stage, due: r.due - Date.now(), devis: r.devis && r.devis.total, notif: g.notifs.slice(-6).map((n) => n.text).find((x) => /Grosse production lancée/.test(x)) || '', second: H.bigWhy(g) } : null;
  });
  await G(page, () => { window.__hypeEasyGear = true; });
  check('le Studio propose la grosse production ; le planificateur montre les étapes (préparation, tournage, post-production, sortie) ; le devis est à l’échelle d’une production ; lancée, payée, une seule à la fois',
    st0 && /Grosse production/.test(st0.text) && !st0.off && pl0.sizes === 2 && pl0.list.length === 4 && /Préparation\s*aujourd’hui 9 h · 4 h/.test(pl0.list[0]) && /Sortie/.test(pl0.list[3]) && /GROSSE PRODUCTION/.test(devisP) && /des milliers d’euros/.test(devisP)
      && r1 && r1.size === 2 && r1.stage === 0 && r1.devis > 0 && /Préparation aujourd’hui 9 h, tournage aujourd’hui 14 h, post-production demain 9 h ; sortie demain 20 h/.test(r1.notif) && /une seule à la fois/.test(r1.second), { st0, pl0, r1, devisP: devisP.slice(0, 200) });
  await clear(page);
  await G(page, () => window.__hype.goTab('feed'));

  /* ---------- 2. the stages: a mini-game each, the clock moves on by their time ---------- */
  const s1 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, r = H.bigOn(g), hr = () => new Date(Date.now() + g.clockOff).getHours();
    H.jumpClock(g, r.due - Date.now() + 60000); // 9 h
    const h0 = hr();
    H.S.mgForce = 'ordre';
    await H.genBigStage(r);
    const kind0 = r.game && r.game.kind, prompt0 = (window.__prompts || []).filter((p) => p.includes('LE MINI-JEU DE LA PRÉPARATION')).slice(-1)[0] || '';
    let off = g.clockOff;
    H.finishShoot(r, 0.9);
    const prep = { jumped: Math.round((g.clockOff - off) / 60000), hour: hr(), stage: r.big.stage, next: new Date(r.due + g.clockOff).getHours(), bonus: r.big.last && r.big.last.bonus };
    H.jumpClock(g, r.due - Date.now() + 60000); // 14 h
    H.S.mgForce = 'tri';
    await H.genBigStage(r);
    const kind1 = r.game && r.game.kind, prompt1 = (window.__prompts || []).filter((p) => p.includes('LE MINI-JEU DU TOURNAGE')).slice(-1)[0] || '';
    off = g.clockOff;
    H.finishShoot(r, 0.7);
    const shoot = { jumped: Math.round((g.clockOff - off) / 60000), hour: hr(), stage: r.big.stage, score: r.played && r.played.score, tier: r.played && r.played.tier, nextDay: Math.round((r.due - Date.now()) / 3600000) };
    H.S.mgForce = null;
    return { h0, kind0, kind1, prep, shoot, p0: /C’est une GROSSE PRODUCTION/.test(prompt0) && /PRÉPARATION de cette production/.test(prompt0), p1: /TOURNAGE de cette production/.test(prompt1) };
  });
  check('la préparation : un mini-jeu sur le sujet (écrit par l’IA), 4 h de travail (l’horloge va à 13 h) ; réussie à 90 %, +8 points au tournage',
    s1.h0 === 9 && s1.kind0 === 'ordre' && s1.p0 && s1.prep.jumped >= 236 && s1.prep.jumped <= 241 && s1.prep.hour === 13 && s1.prep.stage === 1 && s1.prep.next === 14 && Math.abs(s1.prep.bonus - 0.08) < 0.001, s1);
  check('le tournage à 14 h : le mini-jeu principal (son prompt sait que c’est une production), 6 h (20 h) ; 70 % + 8 points de préparation = 78 % ; la post-production le lendemain matin',
    s1.kind1 === 'tri' && s1.p1 && s1.shoot.jumped >= 356 && s1.shoot.jumped <= 361 && s1.shoot.hour === 20 && s1.shoot.stage === 2 && Math.abs(s1.shoot.score - 0.78) < 0.001 && s1.shoot.tier === 'top' && s1.shoot.nextDay >= 12 && s1.shoot.nextDay <= 14, s1);

  // the window between the stages: the result, then the next stage to come
  await G(page, () => { const H = window.__hype, g = H.S.game, r = H.bigOn(g); H.S.stack = []; H.startShoot(r); H.update(); });
  await page.waitForSelector('.layer .big-stage .mg-result');
  const last = await page.textContent('.layer .big-stage .mg-result');
  await shot(page, 'stage-result');
  await page.locator('.layer .big-stage .mg-result button', { hasText: 'Continuer' }).click();
  await page.waitForSelector('.layer .big-setup');
  const setup2 = await page.textContent('.layer .big-setup');
  await shot(page, 'stage-post-setup');
  check('entre deux étapes : le résultat (78 % avant la post-production), puis l’étape suivante, à son heure (« Avancer jusqu’à la post-production »)',
    /Tournage correct70/.test(last) && /70\s?%, \+8 points de préparation : 78\s?% avant la post-production/.test(last) && /Post-production/.test(setup2) && /Avancer jusqu’à la post-production/.test(setup2) && /5 h de travail/.test(setup2), { last, setup2 });
  await clear(page);

  // the post-production: the edit (±20 points), 5 h; then ready, at its time
  const s2 = await G(page, () => {
    const H = window.__hype, g = H.S.game, r = H.bigOn(g), hr = () => new Date(Date.now() + g.clockOff).getHours();
    H.jumpClock(g, r.due - Date.now() + 60000); // 9 h
    const h0 = hr(), started = H.bigPostStart(g, r);
    const off = g.clockOff;
    H.applyEdit(g, r, 1, 'me');
    return { h0, started, jumped: Math.round((g.clockOff - off) / 60000), hour: hr(), stage: r.big.stage, score: r.played.score, toOut: Math.round((r.due - Date.now()) / 60000), out: new Date(r.outAt + g.clockOff).getHours() };
  });
  check('la post-production : un montage parfait donne +20 points (98 %), 5 h de travail (14 h) ; prête, elle sort à l’heure prévue (20 h)',
    s2.h0 === 9 && s2.started && s2.jumped >= 296 && s2.jumped <= 301 && s2.hour === 14 && s2.stage === 3 && Math.abs(s2.score - 0.98) < 0.001 && s2.out === 20 && s2.toOut >= 355 && s2.toOut <= 362, s2);

  // its views: ×3 (2 days), ×4,5 (3 days); a flop far less
  const k1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    const base = { id: 'rl_k', what: 'vidéo', topic: 'Une vidéo', diff: 'moyen', state: 'scheduled', due: t, crew: [] };
    const top = { tier: 'top', score: 0.9, diff: 'moyen' }, flop = { tier: 'flop', score: 0.2, diff: 'moyen' };
    const v = (r, p) => { const x = H.viewsParts(g, r, p, t, {}); return x.a + x.b; };
    const big = (n) => Object.assign({}, base, { big: { size: n, k: H.BIG_K[n], cast: [], stage: 3 } });
    return { k2: Math.round(v(big(2), top) / v(base, top) * 100) / 100, k3: Math.round(v(big(3), top) / v(base, top) * 100) / 100, kf: Math.round(v(big(2), flop) / v(base, flop) * 100) / 100 };
  });
  check('ses vues : ×3 sur 2 jours, ×4,5 sur 3 jours ; un flop, bien moins (×1,6)', k1.k2 === 3 && k1.k3 === 4.5 && k1.kf === 1.6, k1);

  // out: a part of its views at once, the rest over the next days (and their money, their subscribers)
  const o1 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, r = H.bigOn(g);
    H.jumpClock(g, r.due - Date.now() + 60000); // 20 h
    H.S.stack = []; H.S.modals = [];
    g.career.prog.state = 'on'; // (in the partner program: the ads pay, as its views come)
    const n0 = window.__prompts.length;
    await H.publishRelease(r, '🎥 Ma production est en ligne !', { title: r.topic, deals: [] });
    const pr = window.__prompts.slice(n0).find((p) => p.includes('## ACTION DU JOUEUR')) || '';
    const p = g.posts.find((x) => x.id === r.out);
    return { id: r.id, state: r.state, tier: r.tier, shown: p && p.video.views, total: r.big.tail && r.big.tail.total, pr: /C’est une GROSSE PRODUCTION : \d+ h de travail sur 2 jours/.test(pr) && /Les attentes étaient énormes/.test(pr), notif: g.notifs.slice(-10).map((n) => n.text).find((x) => /Ta production .* est en ligne/.test(x)) || '' };
  });
  await idle(page);
  await clear(page);
  const o2 = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === id), p = g.posts.find((x) => x.id === r.out);
    const v0 = p.video.views, est0 = g.career.est, f0 = g.stats.followers;
    H.jumpClock(g, 86400000);
    const v1 = p.video.views, est1 = g.career.est, f1 = g.stats.followers;
    H.jumpClock(g, 5 * 86400000);
    const said = g.notifs.filter((n) => /continue de grimper/.test(n.text)).length;
    return { v0, v1, v2: p.video.views, total: r.big.tail.total, done: !!r.big.tail.done, est: est1 > est0, fol: f1 > f0, said, log: (g.career.log.find((x) => x.p === p.id) || {}).views };
  }, o1.id);
  check('publiée : les réactions savent que c’est une grosse production ; 40 % des vues tout de suite, le reste les jours suivants (l’argent et les abonnés avec), tout au bout de 5 jours, dit chaque jour',
    o1.state === 'released' && o1.pr && /est en ligne : elle cartonne/.test(o1.notif) && Math.abs(o1.shown / o1.total - 0.4) < 0.01 && o2.v1 > o2.v0 && o2.v1 < o2.total && o2.v2 === o2.total && o2.done && o2.est && o2.fol && o2.said >= 2 && o2.log === o2.total, { o1, o2 });

  // a nomination: offered to the AI for a hit of the last days, the AI decides; an article too
  const nm = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === id);
    r.releasedAt = Date.now() - 2 * 86400000; // (two days ago)
    const L = H.bigRefreshLines(g).join('\n');
    const f0 = g.stats.followers, ok = H.applyNomination(g, { prix: 'Les Trophées du Web · meilleure production' }), again = H.applyNomination(g, { prix: 'Un autre prix' });
    const L2 = H.bigRefreshLines(g).join('\n');
    return { line: /\{"t":"nomination"/.test(L), article: /consacre un article/.test(L), ok, again, nom: r.big.nom && r.big.nom.prix, fol: g.stats.followers > f0, notif: g.notifs.slice(-5).map((n) => n.text).find((x) => /est nommée/.test(x)) || '', after: /\{"t":"nomination"/.test(L2) };
  }, o1.id);
  check('une production qui cartonne peut être nommée (l’IA le décide, une fois) : abonnés, réputation, une notif ; un média peut lui consacrer un article',
    nm.line && nm.article && nm.ok && !nm.again && /Trophées du Web/.test(nm.nom) && nm.fol && /est nommée : Les Trophées du Web/.test(nm.notif) && !nm.after, nm);

  /* ---------- 3. the cast: asked in their messages, their AI decides ---------- */
  await setHour(page, 10);
  const c1 = await G(page, async () => {
    const H = window.__hype, g = H.S.game;
    const ps = H.featPartners(g), a = ps[0], b = ps[1];
    const r = H.scheduleBig(g, { what: 'vidéo', topic: 'Le grand bal masqué', size: 3, day: 1, hour: 21, cast: [a.id, b.id], diff: 'moyen' });
    const asked = H.castAsked(g, a) === r && H.castAsked(g, b) === r;
    const dmP = H.promptDM(g, a, [], 'tu veux jouer dans ma production ?');
    window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', add: true, lines: [{ t: 'casting', ok: true, why: 'trop hâte' }] }];
    await H.sendDM(a.id, H.castText(g, r, a));
    window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', add: true, lines: [{ t: 'casting', ok: false, why: 'pas dispo ce week-end' }] }];
    await H.sendDM(b.id, H.castText(g, r, b));
    const xa = r.big.cast.find((x) => x.c === a.id), xb = r.big.cast.find((x) => x.c === b.id);
    const t = Date.now(), played = { tier: 'top', score: 0.9, diff: 'moyen' };
    const with_ = H.viewsParts(g, r, played, t, {}), without = H.viewsParts(g, Object.assign({}, r, { big: Object.assign({}, r.big, { cast: [] }) }), played, t, {});
    return { id: r.id, a: a.id, b: b.id, ah: a.handle, asked, dm: /JOUER DANS sa GROSSE PRODUCTION/.test(dmP) && /\{"t":"casting"/.test(dmP), oka: xa.ok, okb: xb.ok, notif: g.notifs.slice(-8).map((n) => n.text).filter((x) => /partant|ne sera pas dans ta production/.test(x)), more: with_.a > without.a };
  });
  check('le casting : proposé en message (le texte est prêt), son IA accepte ou refuse ; ceux qui disent oui amènent leur public',
    c1.asked && c1.dm && c1.oka === true && c1.okb === false && c1.notif.length >= 2 && c1.more, c1);
  await idle(page);
  await clear(page);

  /* ---------- 4. the hitches: launched by the characters' AI, decided by the player ---------- */
  const h1 = await G(page, async (a) => {
    const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === a.id);
    let offered = false;
    for (let k = 0; k < 40 && !offered; k++) offered = H.bigRefreshLines(g).some((x) => x.includes('{"t":"imprevu"'));
    window.__mockOnce = [{ has: 'Le joueur actualise son fil', add: true, lines: [{ t: 'imprevu', kind: 'lieu', by: a.ah, text: 'Le château du bal annule la location à la dernière minute.' }] }];
    g.lastRefreshAt = 0;
    await H.refreshFeed(0);
    return { offered, hitch: r.big.hitch && r.big.hitch.kind, notif: g.notifs.slice(-12).map((n) => n.text).find((x) => /Imprévu sur ta production/.test(x)) || '' };
  }, c1);
  await idle(page);
  await clear(page);
  await G(page, (id) => { const H = window.__hype, g = H.S.game; H.S.stack = []; H.startShoot(g.releases.find((x) => x.id === id)); H.update(); }, c1.id);
  await page.waitForSelector('.layer .hitch-card');
  const hc = await page.textContent('.layer .hitch-card');
  await shot(page, 'hitch');
  await page.locator('.layer .hitch-card .hc-opt', { hasText: 'Tourner ailleurs' }).click();
  await sleep(400);
  const h2 = await G(page, async (a) => {
    const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === a.id);
    const after = { pen: r.big.pen, hitch: r.big.hitch, n: r.big.hitches.length, said: r.big.hitches[0] && r.big.hitches[0].said, trig: (g.triggers || []).some((x) => /il a choisi « Tourner ailleurs/.test(x.text)) };
    // someone of the cast falls ill (their AI says so, in their messages)
    const dmP = H.promptDM(g, g.chars[a.a], [], 'prêt·e pour le tournage ?');
    window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', add: true, lines: [{ t: 'msg', text: 'je suis au fond du lit, grosse grippe…' }, { t: 'imprevu', kind: 'malade', text: 'Grosse grippe : je ne pourrai pas tourner.' }] }];
    await H.sendDM(a.a, 'prêt·e pour le tournage ?');
    const ill = r.big.hitch && { kind: r.big.hitch.kind, who: r.big.hitch.who === a.a, opts: H.hitchOpts(g, r).map((o) => o.id) };
    const ok = H.pickHitch(g, r, 'sans');
    const third = H.applyHitch(g, { kind: 'budget', text: 'Le loueur de costumes double ses prix.' });
    return { after, line: /ne peut finalement plus tourner/.test(dmP), ill, ok, out: r.big.cast.find((x) => x.c === a.a).out, pen: r.big.pen, third };
  }, c1);
  check('un imprévu : c’est l’IA qui le lance (ligne proposée de temps en temps à l’actualisation, ou dans les messages d’un perso du casting) ; le joueur choisit (tourner ailleurs : −8 points ; sans la personne malade : −6) ; deux au plus',
    h1.offered && h1.hitch === 'lieu' && /Imprévu sur ta production/.test(h1.notif) && /Le château du bal annule/.test(hc) && /Louer un autre lieu/.test(hc)
      && h2.after.pen === 0.08 && h2.after.hitch === null && h2.after.n === 1 && h2.after.trig && h2.line && h2.ill && h2.ill.kind === 'malade' && h2.ill.who && h2.ill.opts.join() === 'remplace,sans,decale' && h2.ok && h2.out === 'malade' && h2.pen === 0.14 && h2.third === null, { h1, hc, h2 });
  await idle(page);
  await clear(page);

  /* ---------- 5. the sponsors: several, a brand that wants in, a clause that clashes ---------- */
  const d1 = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === id);
    g.deals = g.deals.filter((d) => !['offer', 'signed'].includes(d.state));
    const big = H.makeOffer(g, { big: r.id, brand: 'Masques & Co', sector: 'mode', product: 'ses masques vénitiens', gift: false, solo: true });
    const plain = H.makeOffer(g, { what: 'vidéo', brand: 'Lumen Tech', sector: 'tech', product: 'son casque', gift: false, care: false });
    big.exclusive = false; plain.exclusive = false; plain.days = 14; // (delivered with the production: not before)
    const sum = H.dealSummary(g, big);
    H.signDeal(g, big); H.signDeal(g, plain);
    return { big: big && big.big === r.id, solo: big.solo, k: Math.round(big.fee / plain.fee * 10) / 10, sum, attached: r.big.deals.includes(big.id), clash: H.bigClash(g, [big.id, plain.id]).map((x) => x.why), ids: [big.id, plain.id], fees: [big.fee, plain.fee] };
  }, c1.id);
  check('une marque qui veut être dans la production (payée à son échelle), seule marque ou non : dans le contrat ; signée, elle est dedans ; deux marques dont une qui veut être seule : ça se contredit',
    d1.big && d1.solo === 1 && d1.k >= 2 && /être dans ta grosse production « Le grand bal masqué »/.test(d1.sum) && /seule marque de la production/.test(d1.sum) && d1.attached && d1.clash.length === 1 && /veut être la seule marque/.test(d1.clash[0]), d1);

  // through its stages, then out with both brands: the one that wanted to be alone pays half
  await setHour(page, 8);
  const d2 = await G(page, async (a) => {
    const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === a.id);
    for (const k of [0, 1]) {
      H.jumpClock(g, Math.max(0, r.due - Date.now()) + 60000);
      H.S.mgForce = k ? 'quiz' : 'vf';
      await H.genBigStage(r);
      H.finishShoot(r, 0.95);
    }
    H.S.mgForce = null;
    H.jumpClock(g, Math.max(0, r.due - Date.now()) + 60000);
    H.bigPostStart(g, r);
    H.applyEdit(g, r, 0.9, 'me');
    H.jumpClock(g, Math.max(0, r.due - Date.now()) + 60000);
    return { stage: r.big.stage, tier: r.played.tier, toutShown: r.big.last && r.big.last.k };
  }, c1);
  await G(page, (id) => { const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === id); r.big.last.seen = 1; H.S.stack = []; H.startShoot(r); H.update(); }, c1.id);
  await page.waitForSelector('.layer .thumb-step', { timeout: 10000 });
  await page.locator('.layer .thumb-step button', { hasText: 'Valider la miniature' }).click();
  await page.waitForSelector('.layer .upload', { timeout: 10000 }).catch(() => {});
  await page.locator('.layer .upload .up-sponsor .chip-btn', { hasText: 'Lumen Tech' }).click(); // (the other brand, put in too)
  await sleep(300);
  const up = await G(page, () => { const L = document.querySelector('.layer .upload'); if (!L) return { none: (document.querySelector('.layer') || {}).textContent || '' }; return { chips: [...L.querySelectorAll('.up-sponsor .chip-btn.on')].map((b) => b.textContent), warn: [...L.querySelectorAll('.up-sponsor .care-warn')].map((x) => x.textContent), prem: !!L.querySelector('.big-prem') }; });
  await shot(page, 'publish-sponsors');
  const d3 = await G(page, async (a) => {
    const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === a.id), c0 = g.career.cash;
    H.S.stack = []; H.S.modals = [];
    const off = g.clockOff, w0 = H.warmOf ? H.warmOf(g) : 0;
    await H.publishRelease(r, 'Le grand bal masqué est en ligne !', { title: r.topic, deals: a.ids, mention: true, premiere: true });
    for (let k = 0; k < 50 && g.timeDebt; k++) await new Promise((res) => setTimeout(res, 100));
    const p = g.posts.find((x) => x.id === r.out), ns = g.notifs.slice(-25).map((n) => n.text);
    return { state: r.state, sponsors: p && p.video.sponsors && p.video.sponsors.map((x) => x.brand), half: ns.find((x) => /Masques & Co voulait/.test(x)) || '', full: ns.find((x) => /Partenariat Lumen Tech livré/.test(x)) || '', cash: g.career.cash - c0, premiere: Math.round((g.clockOff - off) / 60000), cast: p && p.video.big && p.video.big.cast };
  }, { id: c1.id, ids: d1.ids });
  await idle(page);
  await clear(page);
  check('à la sortie, plusieurs marques : chacune livrée ; celle qui voulait être seule retient la moitié (et le dit) ; l’avant-première en live prend 1 h 30',
    d2.stage === 3 && up.chips && up.chips.length === 2 && up.warn.length === 1 && up.prem && d3.state === 'released' && d3.sponsors && d3.sponsors.length === 2 && /Masques & Co voulait être la seule marque de ta production : la marque retient/.test(d3.half) && /\+/.test(d3.full) && d3.premiere >= 88 && d3.premiere <= 92 && d3.cast && d3.cast.length === 0, { d2, up, d3 });

  /* ---------- 6. a day more, given up, a flop ---------- */
  await setHour(page, 10);
  const m1 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const r = H.scheduleBig(g, { what: 'vidéo', topic: 'Les coulisses du marché noir', size: 2, day: 2, hour: 20, diff: 'moyen' });
    const s0 = r.big.slots.slice(), o0 = r.outAt, free = H.bigShiftFree(r);
    H.bigShift(g, r);
    const moved = r.big.slots.every((t, k) => t - s0[k] === 86400000) && r.outAt - o0 === 86400000;
    // its time came: a day more costs now
    H.jumpClock(g, r.due - Date.now() + 60000);
    const late = !H.bigShiftFree(r), d0 = r.delays;
    H.bigShift(g, r);
    const out = { free, moved, movedN: r.moved, late, delays: r.delays - d0, notif: g.notifs.slice(-4).map((n) => n.text).find((x) => /Tu repousses ta production/.test(x)) || '' };
    const pro0 = g.stats.rep ? g.stats.rep.pro : null;
    H.dropRelease(g, r);
    out.dropped = r.state === 'dropped' && !H.bigOn(g);
    return out;
  });
  check('décaler d’un jour : bien à l’avance, gratuit (tout glisse d’un jour) ; à l’heure de l’étape, c’est un vrai report ; abandonnée, elle disparaît',
    m1.free && m1.moved && m1.movedN === 1 && m1.late && m1.delays === 1 && /Tu repousses ta production d’un jour/.test(m1.notif) && m1.dropped, m1);

  const f1 = await G(page, async () => {
    const H = window.__hype, g = H.S.game;
    const r = H.scheduleBig(g, { what: 'vidéo', topic: 'Le défi des potions ratées', size: 2, day: 1, hour: 21, diff: 'moyen' });
    for (const k of [0, 1]) { H.jumpClock(g, Math.max(0, r.due - Date.now()) + 60000); H.S.mgForce = 'ordre'; await H.genBigStage(r); H.finishShoot(r, 0.1); }
    H.S.mgForce = null;
    H.jumpClock(g, Math.max(0, r.due - Date.now()) + 60000);
    H.bigPostStart(g, r); H.applyEdit(g, r, 0.2, 'me');
    H.jumpClock(g, Math.max(0, r.due - Date.now()) + 60000);
    H.S.stack = []; H.S.modals = [];
    const f0 = g.stats.followers;
    await H.publishRelease(r, 'bon…', { title: r.topic, deals: [] });
    return { tier: r.tier, notif: g.notifs.slice(-20).map((n) => n.text).find((x) => /fait un flop/.test(x)) || '', lost: g.stats.followers < f0, trig: (g.triggers || []).some((x) => /est un FLOP/.test(x.text)) };
  });
  await idle(page);
  await clear(page);
  check('une production ratée coûte cher : un flop, des abonnés perdus, la réputation, les moqueries', f1.tier === 'flop' && /fait un flop/.test(f1.notif) && f1.trig, f1);

  /* ---------- 7. the screens: the feed card, the Studio row ---------- */
  await setHour(page, 10);
  await G(page, () => {
    const H = window.__hype, g = H.S.game, ps = H.featPartners(g);
    const r = H.scheduleBig(g, { what: 'vidéo', topic: 'Une nuit au musée des potions', size: 3, day: 1, hour: 20, cast: ps.slice(0, 2).map((c) => c.id), diff: 'difficile' });
    r.big.cast[0].ok = true;
    H.goTab('feed'); H.update();
  });
  await sleep(600);
  const card = await G(page, () => { const el = document.querySelector('.release-card.big-card'); if (el) el.scrollIntoView({ block: 'center' }); return el ? el.textContent.replace(/\s+/g, ' ') : ''; });
  await shot(page, 'feed-card');
  await G(page, () => { const H = window.__hype; H.goTab('studio'); H.update(); });
  await sleep(600);
  const row = await G(page, () => { const el = document.querySelector('.plan-row.big-row'); if (el) el.scrollIntoView({ block: 'center' }); return el ? el.textContent.replace(/\s+/g, ' ') : ''; });
  await shot(page, 'studio-row');
  check('le fil montre la production (ses étapes, sa sortie) ; le Studio aussi, avec son casting',
    /Préparation de ta production dans/.test(card) && /3 jours/.test(card) && /Sortie/.test(card) && /Production « Une nuit au musée des potions »/.test(row) && /partant/.test(row) && /en attente/.test(row), { card, row });
  await G(page, () => window.__hype.goTab('feed'));

  await browser.close();
  const fails = checks.filter((c) => c[0] === 'FAIL');
  const errs = errors.filter((e) => !/favicon|Failed to load resource/.test(e));
  if (errs.length) console.log('ERRORS\n' + errs.join('\n'));
  console.log(`${checks.length - fails.length}/${checks.length} PASS${errs.length ? ` · ${errs.length} erreurs` : ''}`);
  process.exit(fails.length || errs.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
