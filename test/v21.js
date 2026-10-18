// 0.21 end to end, in Chromium against the built hype.html with the mocked Claude runtime:
// - the ads of each release: what the advertisers make of it (the AI judges it: green, yellow, red; what its topic is
//   worth), the self-declaration before publishing, a warning for hidden content (three: no ads for 30 days), the review;
// - the brands: what they offer follows the creator's content, a constant price per view, gear offered instead of money;
// - the community's warmth: fans who write, questions answered, videos on their questions, regulars;
// - the donations in lives.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v21.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v21');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(path.join(ROOT, 'hype.html'), 'utf8');
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
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.devis); })) await sleep(250); };
async function dismiss(page) { for (let k = 0; k < 6 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }

async function newPage(browser, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true, colorScheme: 'light' });
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
// A release shot and edited, its upload screen open (the steps before it are the 0.14 and 0.20 suites' business).
async function readyRelease(page, what, topic) {
  return G(page, ([w, tp]) => {
    const H = window.__hype, g = H.S.game;
    const r = H.scheduleRelease(g, { what: w, topic: tp, due: Date.now() + 60000 });
    r.due = Date.now() - 1000;
    r.played = { tier: 'mid', score: 0.7, diff: 'normal' };
    r.edit = { m: 0.6, by: 'me', s0: 0.7 };
    r.render = { done: true };
    r.thumb = { kind: 'preset', preset: 'propre', ctr: 0.1 };
    H.openLayer({ t: 'minigame', id: r.id }); H.update();
    return r.id;
  }, [what, topic]);
}
const lastVideo = (page) => G(page, () => { const g = window.__hype.S.game; const p = g.posts.filter((x) => x.a === 'p' && x.video && x.video.views).sort((a, b) => b.ts - a.ts)[0]; return p ? { id: p.id, views: p.video.views, money: p.video.money, ads: p.video.ads } : null; });

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);
  await newGame(page, 'Une youtubeuse qui fait des reportages sur la nature de l’académie');
  await G(page, () => { const H = window.__hype, g = H.S.game; g.career.platform = 'youtube'; g.stats.followers = 40000; g.career.prog = { state: 'on', at: Date.now() }; window.__hypeNoGearEvents = true; H.update(); });

  // ---------- the ads of each release: the AI's verdict, the self-declaration, a warning, the review ----------
  // 1) declared: limited ads at best, no warning
  await readyRelease(page, 'vidéo', 'la forêt des lucioles, la nuit');
  await page.waitForSelector('.upload .up-decl', { timeout: 8000 });
  const decl0 = await G(page, () => ({ chips: [...document.querySelectorAll('.up-decl .chip-btn')].map((b) => b.textContent), note: document.querySelector('.up-decl small').textContent }));
  await page.locator('.up-decl .chip-btn', { hasText: 'Violence' }).click();
  await sleep(200);
  const declNote = await page.textContent('.up-decl small');
  await shot(page, 'upload-declaration');
  await G(page, () => { window.__mockAds = { ads: 'vert', adv: 4, adsWhy: '' }; });
  await page.locator('.upload .btn-hot', { hasText: 'Publier' }).click();
  await page.waitForSelector('.video-card', { timeout: 20000 });
  await idle(page);
  await sleep(1500);
  const v1 = await lastVideo(page);
  const exp1 = await G(page, (v) => { const H = window.__hype; return Math.round(v.views * H.ADV_RPM[4] * 0.3 * v.ads.season / 10) / 100; }, v1);
  check('the upload screen asks what the video contains (violence, language, sensitive, shocking); declared: limited ads at best, never a warning; its money from what its topic is worth (adv 4) × 0,3',
    decl0.chips.length === 4 && /Violence/.test(decl0.chips[0]) && /Rien de coché/.test(decl0.note) && /Déclaré/.test(declNote) && v1 && v1.ads.s === 'jaune' && !v1.ads.caught && v1.ads.adv === 4 && Math.abs(v1.money - exp1) < 0.02 && v1.money > 0, { decl0, declNote, v1, exp1 });

  // 2) hidden and spotted: the AI's verdict, a warning
  await readyRelease(page, 'vidéo', 'le combat des boucs sauvages');
  await page.waitForSelector('.upload .up-decl', { timeout: 8000 });
  await G(page, () => { window.__mockAds = { ads: 'rouge', adv: 2, adsWhy: 'violence crue' }; });
  await page.locator('.upload .btn-hot', { hasText: 'Publier' }).click();
  await page.waitForSelector('.video-card', { timeout: 20000 });
  await idle(page);
  await sleep(1500);
  const v2 = await lastVideo(page);
  const s2 = await G(page, () => { const H = window.__hype, g = H.S.game; return { strikes: H.liveStrikes(g).length, notif: (g.notifs.find((x) => /non déclaré/.test(x.text)) || {}).text || '' }; });
  check('nothing declared, the AI sees violence: demonetized (0 €), a warning (1/3), told why',
    v2.ads.s === 'rouge' && v2.ads.caught && v2.money === 0 && s2.strikes === 1 && /violence crue/.test(s2.notif) && /1\/3/.test(s2.notif), { v2, s2 });
  await G(page, (id) => window.__hype.openPost(id), v2.id);
  await sleep(600);
  await shot(page, 'video-demonetized');
  const row = await G(page, () => { const el = document.querySelector('.layer .ads-row'); return el ? el.textContent : ''; });
  check('on the video, its author sees the verdict: « Démonétisée · violence crue », the warning, « Demander un réexamen »',
    /Démonétisée/.test(row) && /violence crue/.test(row) && /Avertissement/.test(row) && /réexamen/.test(row), row);

  // 3) the review: asked once, answered a day or two later; won, it goes back up (and the warning goes)
  const ap = await G(page, ([id1, id2]) => {
    const H = window.__hype, g = H.S.game, out = {};
    const p1 = g.posts.find((x) => x.id === id1), p2 = g.posts.find((x) => x.id === id2);
    out.ask = H.appealAds(g, p2); out.again = H.appealAds(g, p2); out.state = p2.video.ads.appeal;
    const est0 = g.career.est;
    H.appealAds(g, p1);
    const t = Date.now() + 2 * 86400000;
    window.__rnd = Math.random; Math.random = () => 0.01; H.checkAppeals(g, t); Math.random = window.__rnd;
    out.p2 = { s: p2.video.ads.s, appeal: p2.video.ads.appeal, caught: p2.video.ads.caught }; out.strikes = H.liveStrikes(g).length;
    out.p1 = { s: p1.video.ads.s, money: p1.video.money }; out.gain = Math.round((g.career.est - est0) * 100) / 100;
    return out; }, [v1.id, v2.id]);
  check('a review, once per video: won, red goes yellow and the warning goes; yellow goes green and the money of its views comes back (booked for the month)',
    ap.ask === true && ap.again === false && ap.state === 'pending' && ap.p2.s === 'jaune' && ap.p2.appeal === 'won' && ap.p2.caught === false && ap.strikes === 0 && ap.p1.s === 'vert' && ap.gain > 0 && ap.p1.money > v1.money, ap);

  // 4) three warnings in 90 days: no ads for 30 days
  const st = await G(page, () => {
    const H = window.__hype, g = H.S.game, p = g.posts.find((x) => x.a === 'p' && x.video), out = {};
    H.adsStrike(g, p); H.adsStrike(g, p); out.two = H.monetized(g); H.adsStrike(g, p);
    out.cut = !H.monetized(g); out.until = Math.round((g.career.demonet.until - Date.now()) / 86400000);
    out.rpm = H.rpmOf(g, 'vidéo'); H.goTab('studio'); H.update(); return out; });
  await sleep(500);
  const progTxt = await G(page, () => [...document.querySelectorAll('.section')].map((x) => x.textContent).find((t) => /Programme Partenaire/.test(t)) || '');
  await shot(page, 'studio-ads-cut');
  check('three warnings in 90 days: no ads at all for 30 days (the Studio says so, and when they come back)',
    st.two === true && st.cut && st.until === 30 && st.rpm === 0 && /Pubs coupées/.test(progTxt) && /Plus aucune pub/.test(progTxt), { st, progTxt: progTxt.slice(0, 300) });
  await G(page, () => { const g = window.__hype.S.game; g.career.demonet = null; g.career.strikes = []; });

  // 5) what a topic is worth: from well under 1 € to 11 € the 1 000 views, ×1,5 at the end of the year; the default from the niche
  const rp = await G(page, () => { const H = window.__hype, g = H.S.game; return { r1: H.rpmOf(g, 'vidéo', { s: 'vert', adv: 1 }), r5: H.rpmOf(g, 'vidéo', { s: 'vert', adv: 5 }), y5: H.rpmOf(g, 'vidéo', { s: 'jaune', adv: 5 }), red: H.rpmOf(g, 'vidéo', { s: 'rouge', adv: 5 }), short: H.rpmOf(g, 'short', { s: 'vert', adv: 5 }), dec: H.adSeason(new Date(2026, 11, 10)), niche: H.nicheAdv(g) }; });
  check('what a topic is worth to advertisers: 0,60 € (adv 1) to 11 € (adv 5) the 1 000 views, ×0,3 when limited, 0 demonetized; Shorts a few cents; December ×1,5',
    rp.r1 === 0.6 && rp.r5 === 11 && Math.abs(rp.y5 - 3.3) < 0.001 && rp.red === 0 && rp.short < 0.05 && rp.dec === 1.5 && rp.niche >= 2 && rp.niche <= 5, rp);
  const dots = await G(page, () => { window.__hype.goTab('studio'); window.__hype.update(); return [...document.querySelectorAll('.chan-cell .ads-dot')].map((x) => x.className); });
  check('the channel in the Studio: a dot on each release (green, yellow, red)', dots.length >= 2 && dots.some((c) => /vert/.test(c)) && dots.some((c) => /jaune/.test(c)), dots);

  // ---------- the brands: a constant price per view, sectors that follow the content, gear offered ----------
  const cp = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    g.career.log = [{ at: Date.now() - 86400000, what: 'vidéo', views: 20000 }, { at: Date.now() - 2 * 86400000, what: 'vidéo', views: 22000 }, { at: Date.now() - 3 * 86400000, what: 'vidéo', views: 21000 }];
    g.stats.followers = 12000; out.small = Math.round(H.dealFee(g, 'vidéo'));
    g.stats.followers = 1200000; out.big = Math.round(H.dealFee(g, 'vidéo'));
    g.stats.followers = 40000;
    return out; });
  check('a view is worth as much to a big creator as to a small one: the same expected views, the same price', cp.small > 0 && cp.small === cp.big, cp);
  const sec = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    const id0 = g.player.identity; g.player.identity = 'Un streamer gaming qui teste des jeux d’horreur';
    const w = H.sectorWeights(g); out.top = Object.keys(w).sort((a, b) => w[b] - w[a])[0];
    const n = {}; for (let k = 0; k < 400; k++) { const x = H.pickSector(g); n[x] = (n[x] || 0) + 1; } out.jeu = n.jeu || 0; out.beaute = n.beaute || 0;
    out.hint = H.sectorHint(g);
    g.player.identity = 'Une créatrice cuisine qui teste des recettes'; const w2 = H.sectorWeights(g); out.food = Object.keys(w2).sort((a, b) => w2[b] - w2[a])[0];
    // after a demonetized release, the brands that mind keep away
    out.shy0 = H.adsShy(g);
    const p = g.posts.find((x) => x.a === 'p' && x.video && x.video.ads); const s0 = p.video.ads.s; p.video.ads.s = 'rouge'; p.ts = Date.now();
    out.shy = H.adsShy(g); const w3 = H.sectorWeights(g); out.tol = Math.round((w3.jeu + w3.boisson) / Object.values(w3).reduce((a, b) => a + b, 0) * 100);
    p.video.ads.s = s0; g.player.identity = id0;
    return out; });
  check('the brands follow what the creator makes: a gaming streamer draws game studios first, a cook food brands; after a red release, mostly the tolerant ones (games, energy drinks)',
    sec.top === 'jeu' && sec.jeu > sec.beaute * 3 && /jeu/.test(sec.hint) && sec.food === 'food' && sec.shy === true && sec.tol >= 70, sec);
  const gf = await G(page, () => {
    const H = window.__hype, g = H.S.game, G0 = g.gear, out = {};
    g.deals.filter((d) => d.state === 'offer').forEach((d) => { d.state = 'declined'; });
    G0.items.cam = H.mkItem(1);
    const d = H.makeOffer(g, { brand: 'Pixelforge', sector: 'tech', what: 'vidéo', gift: { kind: 'cam', t: 2 } }); d.exclusive = false; // (no exclusivity between the deals of this check)
    out.d = { fee: d.fee, gift: d.gift, sum: H.dealSummary(g, d), terms: H.payTerms(g, d) };
    out.notif = (g.notifs.slice().reverse().find((x) => /Pixelforge te propose/.test(x.text)) || {}).text || ''; // (the latest: an earlier draw may have picked the same studio)
    const c0 = g.career.cash; out.sign = H.signDeal(g, d); out.cam = G0.items.cam && G0.items.cam.t; out.resale = g.career.cash - c0; out.state = d.state;
    // not better than what the player has: sold second hand
    g.deals.filter((x) => x.state === 'offer').forEach((x) => { x.state = 'declined'; });
    const d2 = H.makeOffer(g, { brand: 'Sonar', sector: 'tech', what: 'vidéo', gift: { kind: 'cam', t: 1 } }); d2.exclusive = false;
    const c1 = g.career.cash; H.signDeal(g, d2); out.camAfter = G0.items.cam.t; out.sold = g.career.cash - c1;
    out.inv = H.invLive(g).filter((x) => x.kind === 'gear' && x.gear.k === 'cam').map((x) => x.gear.it.t + ':' + x.cond).sort(); // 0.26: the old one (used), the gift (new)
    // not delivered: the brand bills the gear
    d2.due = Date.now() - 1000; const c2 = g.career.cash; H.tickCareer(g, Date.now()); out.billed = Math.round(c2 - g.career.cash); out.d2 = d2.state;
    return out; });
  await G(page, () => { const H = window.__hype; H.goTab('studio'); H.update(); });
  await sleep(400);
  const card = await G(page, () => { const el = [...document.querySelectorAll('.deal-card')].find((x) => /Pixelforge/.test(x.textContent)); return el ? el.textContent : ''; });
  check('a brand may offer its gear instead of money: told in the offer and the contract (the model, its tier, its value), sent at the signature; better than what the player has, it replaces it (0.26: the old one to the inventory); otherwise it waits in the inventory, new; not delivered, the brand bills it',
    gf.d.fee === 0 && gf.d.gift.kind === 'cam' && /matos offert : Hybride plein format \(milieu de gamme, valeur 6/.test(gf.d.sum) && /le matos, envoyé à la signature/.test(gf.d.terms) && /Hybride plein format offert/.test(gf.notif)
      && gf.sign && gf.state === 'signed' && gf.cam === 2 && gf.resale === 0 && gf.camAfter === 2 && gf.sold === 0 && gf.inv.join() === '1:bon,1:neuf' && gf.d2 === 'broken' && gf.billed >= 1200 && /Hybride plein format/.test(card) && /matos offert · milieu de gamme/.test(card), { gf, card: card.slice(0, 200) });
  const sc = await G(page, () => {
    const H = window.__hype, g = H.S.game, G0 = g.gear, out = {}, day = 86400000;
    g.deals.filter((x) => x.state === 'offer').forEach((x) => { x.state = 'declined'; });
    const d = H.makeOffer(g, { brand: 'Lune Express', sector: 'tech', what: 'vidéo', gift: { kind: 'pc', t: 1 }, scam: 'impaye' }); d.exclusive = false;
    out.promised = d.gift.t; out.sum = H.dealSummary(g, d);
    H.signDeal(g, d); out.wait = d.state; out.pc = G0.items.pc ? G0.items.pc.t : null;
    H.tickScams(g, Date.now() + 7 * day); out.after = d.state; out.lost = (g.notifs.find((x) => /Le colis de Lune Express/.test(x.text)) || {}).text || '';
    g.deals.filter((x) => x.state === 'offer').forEach((x) => { x.state = 'declined'; });
    G0.items.mic = H.mkItem(0);
    const f = H.makeOffer(g, { brand: 'Écho Studio', sector: 'tech', what: 'vidéo', gift: { kind: 'mic', t: 2 }, scam: 'nul' }); f.exclusive = false;
    H.signDeal(g, f); out.mic = G0.items.mic && G0.items.mic.t; out.fake = !!(G0.items.mic && G0.items.mic.fake);
    H.tickGear(g, Date.now() + 6 * day); out.micAfter = G0.items.mic; out.fakeNote = (g.notifs.find((x) => /contrefaçon/.test(x.text)) || {}).text || '';
    return out; });
  check('scams with gear: a too-good gift that never ships (0.27.6: the contract looks signed like any other, then nothing, the contact gone); a fake that works a few days, then dies beyond repair',
    sc.promised === 2 && /matos offert/.test(sc.sum) && sc.wait === 'signed' && sc.after === 'scammed' && /n’est jamais arrivé/.test(sc.lost) && sc.mic === 2 && sc.fake && sc.micAfter === null && /contrefaçon/.test(sc.fakeNote), sc);

  // the placement: logical with the video's topic, a small boost; nothing to do with it, a small malus (the AI judges it)
  const fx = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    out.h = [H.fitOf({ topic: 'ma recette de gâteau au chocolat' }, { sector: 'food' }, null), H.fitOf({ topic: 'je teste un jeu d’horreur' }, { sector: 'beaute' }, null),
      H.fitOf({ topic: 'je teste un jeu d’horreur' }, { sector: 'tech' }, null), H.fitOf({ topic: 'une balade en forêt' }, { sector: 'beaute' }, null), H.fitOf({ topic: 'une balade en forêt' }, { sector: 'beaute' }, { fit: -1 })];
    out.k = [H.FIT_VIEWS[1], H.FIT_VIEWS[0], H.FIT_VIEWS[-1]];
    // the brand is happier with a placement that fits: its bonus comes more often
    const easy = window.__hypeEasyGear; window.__hypeEasyGear = false;
    const rnd = Math.random; Math.random = () => 0.4;
    const d0 = { brand: 'Volta', sector: 'boisson', fee: 1000, contact: '', what: 'vidéo' };
    out.love = [!!H.brandLove(g, Object.assign({}, d0), { tier: 'top', fit: 1 }), !!H.brandLove(g, Object.assign({}, d0, { brand: 'Volta Zéro' }), { tier: 'top', fit: 0 })];
    out.prime = g.notifs.filter((x) => /prime/.test(x.text) && /Volta/.test(x.text)).map((x) => x.text);
    Math.random = rnd; window.__hypeEasyGear = easy;
    g.deals.filter((x) => x.state === 'offer').forEach((x) => { x.state = 'declined'; });
    const d = H.makeOffer(g, { brand: 'Lueur', sector: 'beaute', what: 'vidéo', product: 'sa crème anti-rides', shady: false, gift: false });
    Object.assign(d, { exclusive: false, scam: '', gift: null, banned: false, fee: 500, upfront: 0 });
    H.signDeal(g, d); out.state = d.state;
    return out; });
  await readyRelease(page, 'vidéo', 'je teste un jeu d’horreur, la nuit');
  await page.waitForSelector('.upload .up-sponsor', { timeout: 8000 });
  await page.locator('.up-sponsor .chip-btn', { hasText: 'Lueur' }).click();
  await sleep(200);
  const spNote = await G(page, () => [...document.querySelectorAll('.up-sponsor small')].map((x) => x.textContent).join(' | '));
  const prevAds = await G(page, () => { const p = window.__mockAds; window.__mockAds = { ads: 'vert', adv: 2, adsWhy: '', fit: -1 }; return p || null; });
  await page.locator('.upload .btn-hot', { hasText: 'Publier' }).click();
  await page.waitForSelector('.video-card', { timeout: 20000 });
  await idle(page);
  await sleep(1500);
  const fv = await G(page, () => { const g = window.__hype.S.game; const p = g.posts.filter((x) => x.a === 'p' && x.video && x.video.sponsor && x.video.sponsor.brand === 'Lueur')[0]; return p ? { id: p.id, sponsor: p.video.sponsor, notif: (g.notifs.find((x) => /Partenariat Lueur livré/.test(x.text)) || {}).text || '' } : null; });
  await G(page, (p) => { window.__mockAds = p; }, prevAds);
  if (fv) await G(page, (id) => window.__hype.openPost(id), fv.id);
  await sleep(600);
  await shot(page, 'video-placement-off');
  const fitRow = await G(page, () => { const el = document.querySelector('.layer .fit-chip'); return el ? el.textContent : ''; });
  check('the placement: a brand logical with the topic (a cake recipe and a food brand) gives the video +6 % views, one with nothing to do with it (an anti-wrinkle cream in a horror game, judged by the AI) −6 %; the upload screen says so, the video and the delivery too; the brand gives its bonus more often when it fits',
    fx.h.join() === '1,-1,0,0,-1' && fx.k.join() === '1.06,1,0.94' && fx.love.join() === 'true,true' && fx.prime.length === 1 && fx.state === 'signed'
      && /logique avec ton sujet : \+6\s% de vues\. Hors sujet : −6\s%/.test(spNote) && fv && fv.sponsor.fit === -1 && /Placement hors sujet : −6\s% de vues/.test(fv.notif) && /Placement hors sujet · −6\s% de vues/.test(fitRow), { fx, spNote, fv, fitRow });

  // ---------- the community: fans who write, answered; a video on a question; regulars; what cools it ----------
  await G(page, () => { const H = window.__hype, g = H.S.game; g.career.warmth = 40; g.career.warmLog = []; g.career.fanAt = 0; g.lastRefreshAt = 0; window.__mockFan = true; return H.refreshFeed(0); });
  await idle(page);
  await sleep(1500);
  const fan = await G(page, () => { const H = window.__hype, g = H.S.game; const f = H.fanList(g)[0]; return f ? { id: f.id, name: f.name, kind: f.kind, q: f.fan.q, open: f.fan.open, age: f.age, dm: (g.dms[f.id] || { msgs: [] }).msgs.length, notif: (g.notifs.find((x) => x.c === f.id && /t’a écrit/.test(x.text)) || {}).text || '' } : null; });
  await G(page, () => { window.__mockFan = false; const H = window.__hype; H.goTab('studio'); H.update(); });
  await sleep(500);
  await page.locator('.commu-sec').scrollIntoViewIfNeeded();
  await shot(page, 'studio-commu');
  const sec1 = await G(page, () => (document.querySelector('.commu-sec') || {}).textContent || '');
  check('a fan writes during a refresh (the AI decides who and what): a contact of their own (an adult), their message in private, told; « Ta commu » in the Studio: how warm it is, the message waiting, their question with « Répondre » and « En faire une vidéo »',
    fan && fan.kind === 'fan' && fan.q && fan.open && fan.age >= 18 && fan.dm >= 1 && /t’a écrit/.test(fan.notif) && /Ta commu/.test(sec1) && /Tiède/.test(sec1) && /attend ta réponse/.test(sec1) && /Répondre/.test(sec1) && /En faire une vidéo/.test(sec1), { fan, sec1: sec1.slice(0, 300) });
  await G(page, (id) => window.__hype.sendDM(id, 'merci beaucoup ! je choisis mes sujets selon ce qui me passionne, et vos idées comptent'), fan.id);
  await idle(page);
  const ans = await G(page, (id) => { const H = window.__hype, g = H.S.game, c = g.chars[id]; return { open: c.fan.open, warm: H.warmOf(g), rel: c.rel, want: Math.round((40 + H.warmGain(40, 3)) * 10) / 10 }; }, fan.id);
  check('answering a fan warms the community (+3, less the warmer it is) and brings them closer', ans.open === false && ans.warm === ans.want && ans.warm === 42 && ans.rel >= 20, ans);
  // a video on their question: programmed from the Studio, the fan becomes a regular
  await dismiss(page); // (a card that popped meanwhile — a level, a new bond — is closed first)
  const mdl = await G(page, () => [...document.querySelectorAll('.modal')].map((m) => m.textContent.slice(0, 160)));
  if (mdl.length) { console.log('MODAL', JSON.stringify(mdl)); await shot(page, 'modal-left'); }
  for (let k = 0; k < 4; k++) { // (a card may still pop up meanwhile: closed, and the click tried again)
    await dismiss(page);
    try { await page.locator('.commu-sec .btn-hot', { hasText: 'En faire une vidéo' }).first().click({ timeout: 6000 }); break; } catch (e) { if (k === 3) throw e; }
  }
  await sleep(500);
  await shot(page, 'program-fan-question');
  const lay = await G(page, () => ({ theme: (document.querySelector('#se-theme') || {}).value || '', chip: [...document.querySelectorAll('.layer .chip-btn.on')].map((b) => b.textContent).join('|') }));
  const qa = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, c = g.chars[id];
    H.closeLayer();
    const r = H.scheduleRelease(g, { what: 'vidéo', topic: H.qaTopic(c), due: Date.now() + 60000, fanQ: id });
    r.due = Date.now() - 1000; r.played = { tier: 'mid', score: 0.7, diff: 'normal' }; r.edit = { m: 0.6, by: 'me', s0: 0.7 }; r.render = { done: true }; r.thumb = { kind: 'preset', preset: 'propre', ctr: 0.1 };
    H.openLayer({ t: 'minigame', id: r.id }); H.update();
    return { fanQ: r.fanQ }; }, fan.id);
  await page.waitForSelector('.upload', { timeout: 8000 });
  await G(page, () => { window.__mockAds = { ads: 'vert', adv: 3 }; });
  await page.locator('.upload .btn-hot', { hasText: 'Publier' }).click();
  await page.waitForSelector('.video-card', { timeout: 20000 });
  await idle(page);
  await sleep(1500);
  const reg = await G(page, (id) => { const H = window.__hype, g = H.S.game, c = g.chars[id]; return { regular: !!c.regular, warm: H.warmOf(g), want: Math.round((42 + H.warmGain(42, 8)) * 10) / 10, video: !!c.fan.video, thanks: (g.dms[id].msgs.filter((m) => !m.me).pop() || {}).text || '', ctx: H.commuCtx(g) }; }, fan.id);
  check('« En faire une vidéo »: the topic and the question are set; published, the fan becomes a regular (+8, a thank-you in private), and the AI knows the regulars',
    /Je réponds à/.test(lay.theme) && lay.chip.length > 0 && qa.fanQ === fan.id && reg.regular && reg.video && reg.warm === reg.want && /question|vidéo/i.test(reg.thanks) && reg.ctx.includes('habitués') && reg.ctx.includes('@'), { lay, qa, reg });
  // what cools it: a fan left without an answer, a bad buzz, begging for donations
  const cool = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now(), out = {};
    g.career.fanAt = 0; window.__mockFan = { name: 'Lou Garnier', handle: 'lou.grn', q: false, text: 'coucou ! tu reviens quand en live ?' };
    H.fanMessage(g, window.__mockFan); window.__mockFan = false;
    g.career.warmDay = H.gameDay(t + 4 * 86400000); // (no drift back to lukewarm in this check)
    const w0 = H.warmOf(g); H.tickCommu(g, t + 4 * 86400000); out.ignored = Math.round((H.warmOf(g) - w0) * 10) / 10;
    const w1 = H.warmOf(g); g.pbb = { at: t, until: t + 3600000, c: null, kind: 'test' }; H.tickCommu(g, t + 4 * 86400000 + 1000); out.bb = Math.round((H.warmOf(g) - w1) * 10) / 10; g.pbb = null;
    const w2 = H.warmOf(g); H.postCommu(g, 'soutenez-moi sur tipeee, chaque don compte !'); out.beg = Math.round((H.warmOf(g) - w2) * 10) / 10;
    return out; });
  check('what cools the community: a fan left 3 days without an answer (−1,5), a bad buzz (−8), begging for donations (−3)', cool.ignored === -1.5 && cool.bb === -8 && cool.beg === -3, cool);

  // ---------- the donations in lives ----------
  const dk = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    const r0 = Math.random; Math.random = () => 0.5;
    g.career.warmth = 40; out.w40 = H.donTotal(g, 4000); g.career.warmth = 80; out.w80 = H.donTotal(g, 4000);
    g.stats.followers = 300; out.small = H.donTotal(g, 4000); g.stats.followers = 40000;
    Math.random = r0;
    g.career.warmth = 60; g.career.warmLog = []; g.career.warmDay = H.gameDay(Date.now()); // (no drift in what follows)
    out.wLive = Math.round((60 + H.warmGain(60, 1.5)) * 10) / 10; out.wThanks = Math.round((out.wLive + H.warmGain(out.wLive, 2)) * 10) / 10;
    return out; });
  check('the warmer the community, the more it gives in lives (about 100 € per 1 000 viewers lukewarm, more than twice warm); not before 500 followers',
    dk.w40 > 0 && dk.w80 > dk.w40 * 2.5 && dk.small === 0, dk);
  await readyRelease(page, 'live', 'je réponds à vos questions en direct');
  await page.waitForSelector('.upload', { timeout: 8000 });
  await G(page, () => { window.__mockAds = { ads: 'vert', adv: 3 }; window.__mockDons = true; });
  const est0 = await G(page, () => window.__hype.S.game.career.est);
  await page.locator('.upload .btn-hot', { hasText: 'Lancer le live' }).click();
  await page.waitForSelector('.video-card', { timeout: 20000 });
  await idle(page);
  await sleep(1500);
  const lv = await G(page, (e0) => { const H = window.__hype, g = H.S.game; const p = g.posts.filter((x) => x.a === 'p' && x.video && x.video.what === 'live').sort((a, b) => b.ts - a.ts)[0]; return p ? { id: p.id, total: p.video.donTotal, net: p.video.donNet, dons: p.video.dons, rest: p.video.donRest, est: Math.round((g.career.est - e0) * 100) / 100, money: p.video.money, warm: H.warmOf(g), notif: (g.notifs.find((x) => /de dons/.test(x.text)) || {}).text || '' } : null; }, est0);
  await G(page, (id) => { window.__mockDons = false; window.__hype.openPost(id); }, lv.id);
  await sleep(700);
  await shot(page, 'live-donations');
  const blk = await G(page, () => (document.querySelector('.layer .dons') || {}).textContent || '');
  await page.locator('.layer .dons button', { hasText: 'Remercier' }).dispatchEvent('click'); // (a toast may sit on top)
  await sleep(300);
  const th = await G(page, (id) => { const H = window.__hype, g = H.S.game, p = g.posts.find((x) => x.id === id); const w = H.warmOf(g); const again = H.thankDonors(g, p); return { thanked: p.video.thanked, warm: w, again }; }, lv.id);
  check('a live: donors and their messages (written by the AI, amounts set by the game), the rest as « others », the creator’s share booked for the month; a moment with the community (+1,5); « Remercier tout le monde »: +2, once',
    lv && lv.total > 0 && lv.dons.length === 2 && lv.dons.every((d) => d.amount >= 2 && d.text.length > 5) && lv.net === Math.round(lv.total * 0.7 * 100) / 100 && lv.est >= lv.net && /de dons/.test(lv.notif) && lv.warm === dk.wLive
      && /de dons/.test(blk) && /tess\.astrale/.test(blk) && /Remercier/.test(blk) && th.thanked && th.warm === dk.wThanks && th.again === false, { lv, blk: blk.slice(0, 200), th });

  console.log('');
  console.log(`CHECKS ${checks.filter((c) => c[0] === 'PASS').length}/${checks.length}`);
  console.log('ERRORS', errors.length ? errors.slice(0, 8).join(' | ') : 'none');
  await browser.close();
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch(async (e) => { console.error('CRASH', e); process.exit(2); });
