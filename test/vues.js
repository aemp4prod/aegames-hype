// 0.29.1: two publics in the same subscribers (YouTube), in Chromium against the built hype.html with the mocked
// Claude runtime:
// - where the long-form public starts (from what the channel has published), and an old save that gets it;
// - a channel of shorts: its first long video gets a fraction of a short's views; its likes and new subscribers follow
//   them; the reactions know who watches; the player is told why, and the Studio shows the long-form public;
// - the short-form fans a long video wins over: more when it is good, far more with a warm community;
// - a short that announces a long video (from the programme): its viewers come at the video's release; a short that
//   sends to one already out (« vidéo associée »): views, watch hours, money and fans added;
// - lives follow the long-form public too (a little softer); TikTok does not change;
// - the push bought with gems doubles the release's views (it never applied before);
// - on a phone.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/vues.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-vues');
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
const idle = async (page, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.dms || b.story || b.groups); })) await sleep(150); await sleep(400); };
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
// A release shot and published (score: the shoot; diff: its difficulty), as the player does it.
async function publish(page, a) {
  const id = await G(page, (a) => {
    const H = window.__hype, g = H.S.game;
    let r = a.id ? g.releases.find((x) => x.id === a.id) : H.scheduleRelease(g, { what: a.what, topic: a.topic, due: Date.now() + 3600000, promo: a.promo || '' });
    if (!r) return null;
    r.due = Math.min(r.due, Date.now() - 1000);
    if (a.diff) r.diff = a.diff;
    if (a.push) g.boosts.push = true;
    H.finishShoot(r, a.score);
    if (!r.edit) H.applyEdit(g, r, 0.5, 'me');
    H.S.modals.length = 0; H.S.stack = [];
    window.__base = H.viewsCore(g, r, r.played, Date.now(), { crew: r.crew || [], push: false }); // (what it would get, without the push)
    window.__n0 = window.__prompts.length;
    H.publishRelease(r, '', { title: r.topic });
    return r.id;
  }, a);
  await sleep(500);
  await idle(page, 40000);
  await sleep(1500);
  return G(page, (id) => {
    const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === id), p = r && g.posts.find((x) => x.id === r.out);
    const pr = window.__prompts.slice(window.__n0).find((x) => x.includes('Le joueur publie enfin')) || '';
    return p ? { id, out: r.out, tier: r.tier, views: p.video.views, likes: p.likeT, fol: p.res.fol, viral: !!p.res.viral, teased: p.video.teased || 0, conv: p.video.conv || 0, base: Math.round(window.__base), prompt: pr, push: g.boosts.push } : { id, none: true, state: r && r.state };
  }, id);
}

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);
  const txt = (sel) => G(page, (s) => [...document.querySelectorAll(s)].map((e) => e.textContent).join(' | '), sel);
  await G(page, () => { window.__hypeEasyGear = true; }); // (a computer to edit long videos: no quote to ask for)

  // ---------- where the long-form public starts ----------
  const start = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now(), log = (n, what) => Array.from({ length: n }, (_, k) => ({ at: t - k * 3600000, what, views: 200000, hours: 0 }));
    g.stats.followers = 88000;
    const with_ = (l) => { g.career.log = l; return H.audStart(g); };
    const shorts = with_(log(30, 'short')), mixed = with_(log(30, 'short').concat(log(5, 'vidéo'))), videos = with_(log(10, 'vidéo')), none = with_([]);
    // an old save, without it: it gets it from what it has published
    g.career.log = log(30, 'short');
    delete g.career.aud;
    H.migrate(g);
    const mig = Object.assign({}, g.career.aud);
    return { shorts: shorts.fans / 88000, mixed: mixed.fans / 88000, videos: videos.fans / 88000, none: none.fans / 88000, trust: videos.trust, mig, split: H.audSplit(g), fans: H.vidFans(g) };
  });
  check('where the long-form public starts: a channel of shorts, 3 % of its subscribers; of long videos, nearly all; both, in between; nothing yet, half (an old save gets it from what it has published)',
    start.split && Math.abs(start.shorts - 0.03) < 0.002 && start.mixed > 0.15 && start.mixed < 0.3 && start.videos > 0.9 && start.none === 0.5 && start.trust > 3
      && Math.abs(start.mig.fans - 2640) <= 1 && start.mig.f0 === 88000 && start.fans === 2640, start);

  // ---------- a channel of shorts: its first long video ----------
  const cmp = await G(page, () => {
    const H = window.__hype, g = H.S.game, at = Date.now(), pl = { tier: 'top', score: 0.95, diff: 'mythique' };
    const sh = H.viewsCore(g, { what: 'short', topic: 'x' }, pl, at, { crew: [] }), vd = H.viewsCore(g, { what: 'vidéo', topic: 'x' }, pl, at, { crew: [] });
    return { sh: Math.round(sh), vd: Math.round(vd), ratio: vd / sh };
  });
  const v1 = await publish(page, { what: 'vidéo', topic: 'Je teste la potion interdite', score: 0.95, diff: 'mythique' });
  const told = await G(page, () => { const g = window.__hype.S.game; return { notif: g.notifs.some((n) => /La plupart de tes abonnés te suivent pour tes shorts : ≈ [\d\s]+ sur [\d\s,]+(k|M)? regardent tes vidéos longues et tes lives\. Chaque bonne vidéo en convertit d’autres/.test(n.text)), fans: Math.round(g.career.aud.fans), trust: g.career.aud.trust }; });
  await clear(page);
  await G(page, () => window.__hype.goTab('studio'));
  await sleep(500);
  const head = await txt('.studio-head .aud-line');
  await shot(page, 'studio-head');
  check('a channel of shorts (88 000 subscribers): its first long video in mythique gets a fraction of a short\'s views; its likes and new subscribers follow them; the reactions know who watches; the player is told why; the Studio shows the long-form public, grown by the short-form fans it won over',
    cmp.ratio < 0.12 && !v1.none && v1.views < 0.25 * cmp.sh && v1.views > 2000 && v1.likes <= Math.ceil(0.38 * v1.views) && v1.fol <= Math.ceil(0.06 * v1.views)
      && /surtout connu pour ses shorts/.test(v1.prompt) && told.notif && v1.conv > 0 && told.fans > 2640 + v1.conv * 0.9 && told.trust === 1 && /≈ [\d\s]+ regardent tes vidéos longues \(\d+ %\)/.test(head),
    { cmp, v1: Object.assign({}, v1, { prompt: undefined }), told, head });

  // ---------- the short-form fans it wins over: a good video, a warm community ----------
  const conv = await G(page, () => {
    const H = window.__hype, g = H.S.game, A0 = JSON.stringify(g.career.aud), w0 = g.career.warmth;
    const run = (w, tier) => { g.career.aud = JSON.parse(A0); g.career.warmth = w; return H.audAfter(g, { what: 'vidéo' }, tier, 0, { b: 10000 }); };
    const cold = run(10, 'top'), warm = run(90, 'top'), flop = run(40, 'flop'), mid = run(40, 'mid');
    g.career.aud = JSON.parse(A0); g.career.warmth = w0;
    return { cold, warm, flop, mid };
  });
  check('the short-form fans a long video wins over: far more with a warm community (« soudée ») than a cold one, more when it is good than when it flops',
    conv.warm >= 2 * conv.cold && conv.mid > conv.flop * 4 && conv.cold > conv.mid * 0.5, conv);

  // ---------- a short that announces a long video, from the programme ----------
  await clear(page);
  await G(page, () => { const H = window.__hype, g = H.S.game, h = new Date(Date.now() + (g.clockOff || 0)).getHours(); if (h < 7) H.jumpClock(g, (10 - h) * 3600000); }); // (in the night the days are named, « Demain » is not offered: the day first)
  const vid = await G(page, () => { const H = window.__hype, g = H.S.game; const r = H.scheduleRelease(g, { what: 'vidéo', topic: 'Je teste 10 potions interdites', due: Date.now() + 2 * 86400000 + 3600000 }); H.goTab('studio'); H.update(); return r.id; });
  await sleep(500);
  await page.locator('.plan-row', { hasText: '10 potions interdites' }).locator('button', { hasText: 'Short d’annonce' }).click();
  await page.waitForSelector('.layer #se-theme');
  await page.locator('.layer .tr-chips button', { hasText: 'Demain' }).first().click();
  await sleep(300);
  const form = await G(page, () => ({ theme: document.querySelector('.layer #se-theme').value, on: [...document.querySelectorAll('.layer .tr-chips .chip-btn.on, .layer .seg button.on, .layer .seg .on')].map((e) => e.textContent.trim()), hint: [...document.querySelectorAll('.layer .field small')].map((e) => e.textContent).join(' | ') }));
  await shot(page, 'teaser-form');
  await page.locator('.layer .mg-setup > button.btn-hot').click();
  await sleep(600);
  const planned = await G(page, (vid) => { const H = window.__hype, g = H.S.game, x = g.releases.find((r) => r.promo === vid && r.state === 'scheduled'); H.S.stack = []; H.goTab('studio'); H.update(); return x ? { id: x.id, what: x.what } : null; }, vid);
  await sleep(400);
  const row = await G(page, () => { const el = [...document.querySelectorAll('.plan-row')].find((x) => /^🎬/.test(x.textContent) && /10 potions interdites/.test(x.textContent)); return el ? el.textContent : ''; });
  check('from the programme (« 📣 Short d’annonce »): the form opens on a short, linked to the video, its topic ready; programmed before it, it says what it will do; the programme shows it',
    form.theme === 'Teaser de ma vidéo : Je teste 10 potions interdites' && form.on.some((x) => /🎬 Je teste 10 potions/.test(x)) && /Il sortira avant ta vidéo/.test(form.hint)
      && planned && planned.what === 'short' && /short d’annonce prévu/.test(row), { form, planned, row });

  // (the long video's upload screen, before anything is out: who will watch it)
  const up = await G(page, (vid) => { const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === vid); r.played = { score: 0.6, tier: 'mid', at: Date.now(), kind: '', diff: 'moyen' }; H.applyEdit(g, r, 0.5, 'me'); r.render = { at: Date.now() }; r.thumb = 'propre'; H.S.stack = []; H.openLayer({ t: 'minigame', id: vid }); H.update(); return true; }, vid);
  await sleep(700);
  const upTxt = await txt('.layer .up-aud');
  await G(page, (vid) => { const H = window.__hype, r = H.S.game.releases.find((x) => x.id === vid); r.played = null; H.S.stack = []; H.update(); }, vid);
  const sh1 = await publish(page, { id: planned.id, score: 0.8 });
  const shNote = await G(page, () => window.__hype.S.game.notifs.some((n) => /^📣 Ton short annonce ta vidéo « Je teste 10 potions interdites »/.test(n.text)));
  const tz = await G(page, (vid) => { const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === vid); return Math.round(H.promoViews(g, r)); }, vid);
  const v2 = await publish(page, { id: vid, score: 0.6 });
  check('the short goes out first (the reactions know what it announces); at the video\'s release some of its viewers come (« vues venues de ton short »), and the reactions say so',
    up && /📺 Ton public vidéo : ≈ [\d\s]+ ; le reste de tes abonnés te suit pour tes shorts\./.test(upTxt) && !sh1.none && /Ce short annonce sa vidéo « Je teste 10 potions interdites »/.test(sh1.prompt) && shNote && tz > 0 && !v2.none && v2.teased > 0 && /Un short du joueur l’avait annoncée/.test(v2.prompt),
    { upTxt, sh1: { views: sh1.views, tier: sh1.tier }, shNote, tz, v2: { views: v2.views, teased: v2.teased, conv: v2.conv } });

  // ---------- a short that sends to a video already out (« vidéo associée ») ----------
  await clear(page);
  await G(page, (out) => window.__hype.openPost(out), v2.out);
  await sleep(700);
  const link = await txt('.layer .aud-link, .aud-link');
  await shot(page, 'video-post');
  const before = await G(page, (vid) => { const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === vid), p = g.posts.find((x) => x.id === r.out), e = g.career.log.slice().reverse().find((x) => x.p === p.id); return { views: p.video.views, money: p.video.money || 0, hours: e ? e.hours : -1, fans: g.career.aud.fans }; }, vid);
  const sh2 = await publish(page, { what: 'short', topic: 'Extrait de ma vidéo sur les potions', score: 0.8, promo: vid });
  const after = await G(page, (vid) => { const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === vid), p = g.posts.find((x) => x.id === r.out), e = g.career.log.slice().reverse().find((x) => x.p === p.id); return { views: p.video.views, promo: p.video.promo || 0, money: p.video.money || 0, hours: e ? e.hours : -1, fans: g.career.aud.fans, notif: g.notifs.some((n) => /^📣 Ton short a envoyé [\d\s]+ personnes? voir ta vidéo « Je teste 10 potions interdites »/.test(n.text)) }; }, vid);
  check('on the video, « 📣 Un short qui renvoie ici »; such a short, once out: views added to the video (its watch hours, its money), short-form fans won over, the player told; the reactions know where it sends',
    /Un short qui renvoie ici/.test(link) && !sh2.none && /renvoie vers sa vidéo « Je teste 10 potions interdites »/.test(sh2.prompt) && after.promo > 0 && after.views === before.views + after.promo
      && after.hours > before.hours && after.money >= before.money && after.fans >= before.fans && after.notif, { link, before, after });

  // ---------- lives; TikTok; the push ----------
  const lv = await G(page, () => {
    const H = window.__hype, g = H.S.game, at = Date.now(), pl = { tier: 'mid', score: 0.6, diff: 'moyen' };
    const yt = H.viewsParts(g, { what: 'live', topic: 'x' }, pl, at, { crew: [] });
    const pf0 = g.career.platform;
    g.career.platform = 'twitch'; // (no shorts there: one public, as before)
    const tw = H.viewsParts(g, { what: 'live', topic: 'x' }, pl, at, { crew: [] });
    g.career.platform = 'tiktok';
    const tk = { split: H.audSplit(g), fans: H.vidFans(g), followers: g.stats.followers, b: H.viewsParts(g, { what: 'short', topic: 'x' }, pl, at, { crew: [] }).b };
    g.career.platform = pf0;
    return { yt: Math.round(yt.a + yt.b), ytB: Math.round(yt.b), tw: Math.round(tw.a + tw.b), twB: tw.b, tk };
  });
  check('a live on YouTube follows the long-form public too, a little softer (the short-form fans are notified: some come); where there are no shorts (Twitch) or only those (TikTok), nothing changes',
    lv.yt < 0.6 * lv.tw && lv.ytB > 0 && lv.ytB > (lv.yt - lv.ytB) * 0.5 && lv.twB === 0 && !lv.tk.split && lv.tk.fans === lv.tk.followers && lv.tk.b === 0, lv);

  const pu = await publish(page, { what: 'short', topic: 'Ma potion du matin', score: 0.6, push: true });
  check('the push bought with gems doubles the release\'s views (it was reset before they were counted), and it is spent',
    !pu.none && !pu.viral && pu.views >= 1.6 * pu.base && pu.views <= 2.8 * pu.base && pu.push === false, { views: pu.views, base: pu.base, viral: pu.viral, push: pu.push });

  // ---------- on a phone ----------
  await clear(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const vid3 = await G(page, () => { const H = window.__hype, g = H.S.game; const r = H.scheduleRelease(g, { what: 'vidéo', topic: 'Une vidéo pour le téléphone, avec un titre assez long', due: Date.now() + 3 * 86400000 }); return r ? r.id : null; });
  await G(page, (id) => window.__hype.openLayer({ t: 'series', id: 'single', what: 'short', promo: id }), vid3);
  await page.waitForSelector('.layer #se-theme');
  await sleep(300);
  const ph = await G(page, () => { const out = []; if (document.documentElement.scrollWidth > 391) out.push('page ' + document.documentElement.scrollWidth); for (const el of document.querySelectorAll('.layer .tr-chips .chip-btn, .layer .field small')) { const r = el.getBoundingClientRect(); if (r.right > 391) out.push(el.textContent.slice(0, 30) + ' ' + Math.round(r.right)); } return out; });
  await shot(page, 'phone-teaser');
  await clear(page);
  await G(page, () => window.__hype.goTab('studio'));
  await sleep(500);
  const ph2 = await G(page, () => { const out = []; if (document.documentElement.scrollWidth > 391) out.push('page ' + document.documentElement.scrollWidth); for (const el of document.querySelectorAll('.studio-head .aud-line, .plan-row .acts button')) { const r = el.getBoundingClientRect(); if (r.right > 391) out.push(el.textContent.slice(0, 30) + ' ' + Math.round(r.right)); } return out; });
  await shot(page, 'phone-studio');
  check('on a phone (390): the short\'s form with its videos to announce, the Studio\'s line and the programme stay within the screen', ph.length === 0 && ph2.length === 0, { ph, ph2 });

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
