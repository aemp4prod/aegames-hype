// 0.30.1, in Chromium against the built hype.html with the mocked Claude runtime.
// - Their photos: the AI picks one of their real photos by its code (an album of a few that fit the moment, each in a
//   few words), the text written for it; words alone make an illustrated card, never a real photo guessed from them.
// - Time: a release takes time to make (a short 2 h, a video 4 h, twice as much « soignée »); the clock moves on after the
//   shoot and the edit, and it comes out at the end; a date in the way is said before (made anyway: missed).
// - A brand's contract may ask for a « soignée » video (paid more): delivered otherwise, a penalty.
// - A date takes its evening; a live lasts its time.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v301.js
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v30.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v301');
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
// The game's clock set to h o'clock (today), whatever the computer's.
const setHour = (page, h) => G(page, (h) => { const g = window.__hype.S.game; const d = new Date(Date.now() + (g.clockOff || 0)); const x = new Date(d); x.setHours(h, 0, 0, 0); g.clockOff = (g.clockOff || 0) + (x - d) + 60000; }, h);

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const { page } = await newPage(browser, { width: 1280, height: 860 });
  await newGame(page);

  /* ---------- 1. their photos: chosen by the AI from their album ---------- */
  await setHour(page, 14);
  const a1 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const faced = H.mains(g).map((c) => [c, H.faceOf(g, c)]).filter(([, p]) => p && p.photos.length >= 6).sort((a, b) => b[1].photos.length - a[1].photos.length);
    const c = faced[0][0], other = H.mains(g).find((x) => x !== c && H.faceOf(g, x) && H.faceOf(g, x).id !== H.faceOf(g, c).id);
    const lines = H.albumLines(g, new Set([c.id]));
    const alb = H.albumOf(g, c), vis = H.visibleShots(g);
    const mine = lines.find((l) => l.startsWith('- @' + c.handle + ' :')) || '';
    const listed = [...mine.matchAll(/([fmx]\d{2}-\d+) = /g)].map((m) => m[1]), face = H.faceOf(g, c).id;
    const listedOK = listed.length === 3 && listed.every((id) => H.PACK.photos[id] && H.PACK.photos[id].p.id === face && !vis.has(H.PACK.photos[id].ph.sk || id))
      && new Set(listed.map((id) => H.PACK.photos[id].ph.sk || id)).size === 3;
    const t = Date.now();
    // the AI picks one by its code: their real photo, the text written for it
    const p1 = H.addAmbientPost(g, { by: c.handle, text: 'ce soir je joue, venez tôt', photo: alb[0].id }, t, t);
    // words alone: an illustrated card (even words its tags would have matched)
    const p2 = H.addAmbientPost(g, { by: c.handle, text: 'test lumière terminé, cabine vide', photo: 'la cabine DJ encore vide, éclairée en violet' }, t + 1, t + 1);
    // the code of someone else's photo: no photo at all
    const oth = other ? H.faceOf(g, other).photos[0].id : 'm99-1';
    const p3 = H.addAmbientPost(g, { by: c.handle, text: 'regardez ça', photo: oth }, t + 2, t + 2);
    // a photo still on screen (the one just posted): never twice
    const p4 = H.addAmbientPost(g, { by: c.handle, text: 'encore elle', photo: alb[0].id }, t + 3, t + 3);
    // a story by its code
    const s1 = H.addStory(g, { by: c.handle, text: 'avant la soirée', photo: alb[1] ? alb[1].id : alb[0].id }, t + 4);
    return {
      handle: c.handle, nAlb: alb.length, codes: alb.map((ph) => ph.id), seenFree: alb.every((ph) => !vis.has(ph.sk || ph.id)), oneShoot: new Set(alb.map((ph) => ph.sk || ph.id)).size === alb.length,
      line: mine.slice(0, 400), listed, listedOK, longest: Math.max(...mine.split(' ; ').map((x) => x.length)), head: lines.includes('## LEURS VRAIES PHOTOS'),
      p1: p1 && p1.photo && p1.photo.img, p1desc: p1 && p1.photo && p1.photo.desc === (H.PACK.photos[alb[0].id].ph.desc), ig: (c.ig || []).some((e) => e.ph === alb[0].id),
      p2: p2 && p2.photo ? { img: p2.photo.img || null, desc: p2.photo.desc } : null, p3: p3 ? (p3.photo || null) : 'none', p4: p4 ? (p4.photo || null) : 'none',
      s1: s1 && s1.photo ? s1.photo.img || null : null,
    };
  });
  check('l’album d’un perso : trois de ses vraies photos qui collent au moment (une par shooting, aucune encore à l’écran), chacune en quelques mots avec son code',
    a1.head && a1.nAlb === 3 && a1.seenFree && a1.oneShoot && a1.listedOK && a1.longest <= 260, a1);
  check('l’IA donne un code : c’est sa vraie photo (et sur son Insta) ; des mots seuls : une carte illustrée, jamais une photo devinée ; le code d’un autre ou une photo encore à l’écran : pas de photo ; une story aussi',
    a1.p1 === a1.codes[0] && a1.p1desc && a1.ig && a1.p2 && a1.p2.img === null && /cabine DJ/.test(a1.p2.desc) && a1.p3 === null && a1.p4 === null && !!a1.s1, a1);

  // the prompts: a refresh and the reactions to a post carry the album; the captions never contradict their photo
  const a2 = await G(page, async (h) => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, h);
    c.rel = 70; // (in focus)
    const n0 = window.__prompts.length;
    await H.refreshFeed(0);
    const pr = window.__prompts.slice(n0).find((p) => p.includes('## TA MISSION')) || '';
    const ac = H.promptAct(g, 'post', 'nouvelle vidéo ce soir !', null, [], null, {});
    const caps = H.capLines(g, [{ id: 'q1', k: 'ph', c: c.id, ph: H.albumOf(g, c)[0].id, more: [], at: Date.now() }]).join('\n');
    return { refresh: /## LEURS VRAIES PHOTOS/.test(pr) && pr.includes('- @' + h + ' : '), postLine: /"photo":"son code" pour une vraie photo/.test(pr), act: /## LEURS VRAIES PHOTOS/.test(ac) && /"son code" pour une vraie photo/.test(ac), caps: /jamais le contraire de ce qu’elle montre/.test(caps) };
  }, a1.handle);
  check('les prompts : l’actualisation et les réactions à un post ont l’album ; les légendes ne contredisent jamais leur photo', a2.refresh && a2.postLine && a2.act && a2.caps, a2);
  await idle(page);
  await clear(page);

  /* ---------- 2. the time it takes: a short 2 h, a video 4 h (twice « soignée »), a live its 2 h ---------- */
  await setHour(page, 10);
  const b1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    g.career.platform = 'youtube';
    g.releases = g.releases.filter((x) => x.state !== 'scheduled');
    const at = (h) => { const d = new Date(t + g.clockOff); d.setHours(h, 0, 0, 0); return d.getTime() - g.clockOff; };
    const v = H.scheduleRelease(g, { what: 'vidéo', topic: 'Je teste cinq potions interdites', due: at(18) });
    const n1 = g.notifs.slice(-1)[0].text;
    const sh = H.scheduleRelease(g, { what: 'short', topic: 'Le défi du chaudron', due: at(18), care: true });
    const lv = H.scheduleRelease(g, { what: 'live', topic: 'Questions-réponses', due: at(20) });
    const nw = H.scheduleRelease(g, { what: 'short', topic: 'Un essai, tout de suite', now: true });
    const an = H.addRelease(g, { what: 'vidéo', in: 60, topic: 'Ma vidéo annoncée trop tôt' }, null, 'nouvelle vidéo dans 1 h !');
    const n2 = g.notifs.slice(-1)[0].text;
    const H4 = 4 * 3600000, H2 = 2 * 3600000;
    const out = {
      video: v && v.outAt === at(18) && v.due === at(18) - H4 && H.prodMs(v) === H4,
      short: sh && sh.care === 1 && sh.due === at(18) - H4 && H.prodMs(sh) === H4,
      live: lv && lv.due === at(20) && lv.outAt === at(20) + H2 && H.relAnn(lv) === at(20),
      now: nw && nw.now === 1 && Math.abs(nw.due - t) < 5000 && Math.abs(nw.outAt - t - H2) < 5000,
      ann: an && an.ann && Math.abs(an.ann - t - 3600000) < 5000 && Math.abs(an.due - t) < 5000 && Math.abs(an.outAt - t - H4) < 5000,
      n1: /Tournage aujourd’hui 14 h \(4 h de travail\)/.test(n1), n2: /en retard sur ton annonce/.test(n2), n1t: n1, n2t: n2,
    };
    for (const x of [sh, lv, nw]) if (x) x.state = 'dropped';
    return { out, v: v.id, an: an.id };
  });
  check('programmée à 18 h, une vidéo se tourne à 14 h (4 h de travail), un short soigné aussi (2 h × 2) ; un live commence à son heure et dure 2 h ; « Maintenant » sort 2 h plus tard ; annoncée dans 1 h, elle sortira en retard (dit tout de suite)',
    Object.entries(b1.out).every(([k, x]) => k.endsWith('t') || x === true), b1.out);

  // the planner: the hours too soon for what it takes are off; « soignée » doubles it
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.openLayer({ t: 'series', id: 'single', what: 'vidéo' }); H.update(); });
  await page.waitForSelector('.layer .hour-pick');
  const hp = async () => G(page, () => {
    const L = document.querySelector('.layer');
    const hrs = [...L.querySelectorAll('.hour-pick button')].map((b) => [parseInt(b.textContent, 10), b.disabled]);
    return { off: hrs.filter((x) => x[1]).map((x) => x[0]), note: (L.querySelector('.prod-note') || {}).textContent || '', care: !!L.querySelector('.care-card') };
  });
  const pl1 = await hp();
  await page.locator('.layer .care-card input').check();
  await sleep(200);
  const pl2 = await hp();
  await shot(page, 'planner-care');
  check('le planificateur : à 10 h, une vidéo ne peut pas sortir avant 14 h (12 h grisé), soignée pas avant 18 h (l’heure choisie passe à 19 h) ; il dit quand commencer',
    pl1.care && pl1.off.includes(12) && !pl1.off.includes(17) && pl2.off.includes(17) && pl2.off.includes(18) && !pl2.off.includes(19) && /4 h de travail/.test(pl1.note) && /8 h de travail.*tu commences (dans 59 min|aujourd’hui 11 h) pour une sortie ce soir 19 h/.test(pl2.note), { pl1, pl2 });
  await clear(page);

  // at its slot: the shoot setup says it; a date in the way is said before (made anyway: missed)
  await setHour(page, 14);
  const d1 = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === id);
    const ev = H.addEvent(g, { by: 'zara.vey', what: 'Un verre au Café des Astres', kind: 'rdv', in: 120 });
    H.S.modals = []; H.S.stack = [];
    H.startShoot(r);
    H.update();
    return { ev: ev && ev.id };
  }, b1.v);
  await page.waitForSelector('.layer .mg-setup .prod-note');
  const note = await page.textContent('.layer .mg-setup .prod-note');
  await page.locator('.layer .mg-setup button', { hasText: 'Lancer le tournage' }).click();
  await page.waitForSelector('.modal .modal-card', { timeout: 5000 });
  const modal = await page.textContent('.modal .modal-card');
  await shot(page, 'shoot-date-warning');
  await sleep(600);
  await page.locator('.modal .modal-card button', { hasText: 'Tourner quand même' }).click();
  await sleep(800);
  const h0 = await G(page, () => new Date(Date.now() + window.__hype.S.game.clockOff).getHours());
  const j1 = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === a.v);
    const off0 = g.clockOff, started = !!r.prodAt;
    H.finishShoot(r, 0.9);
    return { started, jumped: Math.round((g.clockOff - off0) / 60000), hour: new Date(Date.now() + g.clockOff).getHours(), done: !!r.prodDone, alive: r.state === 'scheduled' && H.relLimit(r) > Date.now() };
  }, b1);
  await sleep(2500); // (the clock's tick: the date that passed meanwhile)
  const j2 = await G(page, (id) => { const g = window.__hype.S.game, ev = g.events.find((e) => e.id === id); return { state: ev && ev.state, lapin: g.notifs.slice(-12).some((n) => /lapin|t’attendait|sans même/.test(n.text)) }; }, d1.ev);
  check('à l’heure du tournage, l’écran dit le temps (4 h, sortie vers 18 h) ; un rendez-vous à 16 h est signalé avant (« tu rates ton rendez-vous »)',
    /4 h de tournage et de montage/.test(note) && /sortira vers 18 h/.test(note) && /Tu as rendez-vous avec Zara à 16 h/.test(modal) && /tu rates ton rendez-vous avec Zara/.test(modal), { note, modal });
  check('le tournage fait, l’horloge avance de 4 h (18 h) ; le rendez-vous passé pendant ce temps est un lapin ; la vidéo reste à publier',
    h0 === 14 && j1.started && j1.jumped >= 235 && j1.jumped <= 241 && j1.hour === 18 && j1.done && j1.alive && j2.state === 'missed', { h0, j1, j2 });

  // published: the reactions know the time it took; on time, no « retard »
  const p1 = await G(page, async (id) => {
    const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === id), n0 = window.__prompts.length;
    H.S.stack = []; H.S.modals = [];
    await H.publishRelease(r, 'nouvelle vidéo !', { title: r.topic });
    const pr = window.__prompts.slice(n0).find((p) => p.includes('## ACTION DU JOUEUR')) || '';
    return { time: /Le joueur y a passé 4 h, tournage et montage compris\./.test(pr), late: /de retard sur l’heure annoncée/.test(pr), state: r.state };
  }, b1.v);
  await idle(page);
  await clear(page);
  // announced too soon: late, and the reactions say so (no « promesse tenue »)
  const p2 = await G(page, async (id) => {
    const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === id), n0 = window.__prompts.length;
    const before = { state: r.state, played: !!r.played, done: !!r.prodDone, ann: r.ann, out: r.outAt, due: r.due, now: Date.now(), hour: new Date(Date.now() + g.clockOff).getHours() };
    const off0 = g.clockOff;
    H.finishShoot(r, 0.9);
    const jumped = Math.round((g.clockOff - off0) / 60000);
    H.S.stack = []; H.S.modals = [];
    await H.publishRelease(r, 'enfin !', { title: r.topic });
    const pr = window.__prompts.slice(n0).find((p) => p.includes('## ACTION DU JOUEUR')) || '';
    return { late: /Il sort avec \d+ h( \d+)? de retard sur l’heure annoncée/.test(pr), kept: g.notifs.slice(-15).some((n) => /promesse tenue/.test(n.text)), lateMs: r.late, before, jumped, line: (pr.match(/Il sort avec[^.]*\./) || [''])[0] };
  }, b1.an);
  await idle(page);
  await clear(page);
  check('publiée : les réactions savent qu’elle a pris 4 h ; annoncée trop tôt et sortie des heures après, elles le disent (pas de « promesse tenue »)',
    p1.time && !p1.late && p1.state === 'released' && p2.late && !p2.kept && p2.lateMs > 2.9 * 3600000, { p1, p2 });

  // « soignée »: +15 % of views, the reactions see it; an old planned release takes no time
  const c1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    const base = { id: 'rl_k', what: 'vidéo', topic: 'Les potions du marché noir', diff: 'moyen', state: 'scheduled', due: t, crew: [] };
    const played = { tier: 'top', score: 0.9, diff: 'moyen' };
    const a = H.viewsParts(g, Object.assign({}, base), played, t, {}), b = H.viewsParts(g, Object.assign({}, base, { care: 1 }), played, t, {});
    const tl = H.timeLine(g, Object.assign({}, base, { care: 1, outAt: t + 60000 }));
    const old = { id: 'rl_old', what: 'vidéo', topic: 'Une vieille vidéo', state: 'scheduled', due: t + 3600000, delays: 0, tries: 0, diff: 'moyen' };
    g.releases.push(old);
    H.migrate(g);
    const off0 = g.clockOff;
    H.finishShoot(old, 0.8);
    const jumped = g.clockOff - off0;
    old.state = 'dropped';
    return { k: Math.round((b.a + b.b) / (a.a + a.b) * 1000) / 1000, tl: /un contenu SOIGNÉ/.test(tl) && /8 h/.test(tl), old: old.prod === 0 && H.prodMs(old) === 0 && jumped === 0 };
  });
  check('soignée : +15 % de vues et les réactions le voient (8 h de travail) ; une sortie programmée avant la mise à jour ne prend pas de temps', c1.k === 1.15 && c1.tl && c1.old, c1);

  /* ---------- 3. a brand's contract may ask for it « soignée » ---------- */
  const k1 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    g.stats.followers = Math.max(g.stats.followers, 20000);
    g.deals = g.deals.filter((d) => !['offer', 'signed'].includes(d.state));
    const a = H.makeOffer(g, { what: 'vidéo', sector: 'tech', brand: 'Lumen Tech', care: true, gift: false, bonus: 40 });
    const b = H.makeOffer(g, { what: 'vidéo', sector: 'beaute', brand: 'Éclat Pur', care: false, gift: false, bonus: 40 });
    const sum = a ? H.dealSummary(g, a) : '';
    return { a: a && { id: a.id, care: a.care, fee: a.fee, base: a.base }, b: b && { care: !!b.care, fee: b.fee, base: b.base }, sum };
  });
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.goTab('studio'); H.update(); });
  await sleep(600);
  const card = await G(page, () => { const el = document.querySelector('.deal-card .dl-care'); if (el) el.scrollIntoView({ block: 'center' }); return el ? el.textContent : ''; });
  await sleep(200);
  await shot(page, 'deal-care');
  check('une marque peut exiger une vidéo soignée : c’est dans le contrat (et sur la carte), payé plus cher',
    k1.a && k1.a.care === 1 && /vidéo soignée exigée/.test(k1.sum) && !k1.b.care && k1.a.fee > k1.b.fee * 1.15 && /Vidéo soignée exigée/.test(card) && /retient 40\s%/.test(card), { k1, card });
  await G(page, () => window.__hype.goTab('feed'));
  await clear(page);
  const k2 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const mk = (care) => { const d = { id: 'dl_c' + (care ? 1 : 0), brand: care ? 'Lumen Tech' : 'Lumen Bis', emoji: '💻', sector: 'tech', product: 'un casque', what: 'vidéo', fee: 1000, fee0: 1000, value: 0, upfront: 0, gift: null, at: Date.now(), until: 0, days: 5, due: Date.now() + 86400000, state: 'signed', care: 1, contact: null, max: 0, shady: false, banned: '' }; g.deals.push(d); return d; };
    const d1 = mk(false), d2 = mk(true);
    const c0 = g.career.cash;
    H.deliverDeal(g, d1, null, true, { tier: 'top', viral: false, fit: 0, care: false });
    const c1 = g.career.cash, n1 = g.notifs.slice(-6).map((n) => n.text).join(' | ');
    H.deliverDeal(g, d2, null, true, { tier: 'top', viral: false, fit: 0, care: true });
    const c2 = g.career.cash;
    return { sloppyPaid: c1 - c0, carePaid: c2 - c1, said: /retient 400/.test(n1) && /devait être soignée|demandait une vidéo soignée/.test(n1), n1 };
  });
  check('livrée pas soignée : la marque retient 40 % (et le dit) ; soignée comme demandé : payée en entier', Math.abs(k2.sloppyPaid - 600) < 80 && Math.abs(k2.carePaid - 1000) < 120 && k2.said, k2);

  /* ---------- 4. a date takes its evening ---------- */
  await setHour(page, 20);
  const e1 = await G(page, async () => {
    const H = window.__hype, g = H.S.game;
    g.releases.filter((x) => x.state === 'scheduled').forEach((x) => { x.state = 'dropped'; });
    g.events.filter((e) => e.state === 'scheduled').forEach((e) => { e.state = 'cancelled'; });
    const ev = H.addEvent(g, { by: 'theo.marlin', what: 'Un dîner au Café des Astres', kind: 'rdv', in: 5 });
    ev.due = Date.now() - 60000;
    H.arriveDate(g, ev);
    ev.played = { score: 0.8, tier: 'top', at: Date.now(), kind: 'talk', diff: 'moyen' };
    const off0 = g.clockOff;
    await H.endDate(ev);
    return { jumped: Math.round((g.clockOff - off0) / 60000), hour: new Date(Date.now() + g.clockOff).getHours(), state: ev.state };
  });
  await idle(page);
  await clear(page);
  check('un rendez-vous prend sa soirée (≈ 3 h depuis son début)', e1.jumped >= 170 && e1.jumped <= 181 && e1.hour === 23 && e1.state === 'done', e1);

  // what falls in the evening is said as it starts (a notice, a banner in the scene); the player may cut it short
  await setHour(page, 19);
  const e2 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    const at = (h) => { const d = new Date(t + g.clockOff); d.setHours(h, 0, 0, 0); return d.getTime() - g.clockOff; };
    const r = H.scheduleRelease(g, { what: 'short', topic: 'Un short à 22 h', due: at(22) }); // (its shoot at 20 h)
    const ev = H.addEvent(g, { by: 'theo.marlin', what: 'Un verre au Café des Astres', kind: 'rdv', in: 5 });
    ev.due = Date.now() - 60000;
    H.S.stack = []; H.S.modals = [];
    await H.openTalk(ev);
    H.openLayer({ t: 'minigame', id: ev.id });
    H.update();
    return { ev: ev.id, r: r.id, clash: (ev.clash || []).map((x) => x.text), notif: g.notifs.slice(-4).map((n) => n.text).find((x) => /Pendant ta soirée avec Théo/.test(x)) || '' };
  });
  await page.waitForSelector('.layer .talk-clash', { timeout: 8000 });
  const banner = await page.textContent('.layer .talk-clash');
  await shot(page, 'date-clash');
  const n0 = await G(page, () => window.__prompts.length);
  await page.locator('.layer .talk-clash button', { hasText: 'Écourter la soirée' }).click();
  await sleep(1500);
  const e3 = await G(page, async (a) => {
    const H = window.__hype, g = H.S.game, ev = g.events.find((x) => x.id === a.ev), r = g.releases.find((x) => x.id === a.r);
    for (let k = 0; k < 40 && H.S.busy.ev; k++) await new Promise((res) => setTimeout(res, 100));
    const end = window.__prompts.slice(a.n0).find((p) => p.includes('## TÂCHE : LA FIN DU RENDEZ-VOUS')) || '';
    const off0 = g.clockOff;
    await H.endDate(ev);
    const out = { cut: !!ev.cut, closed: !!(ev.talk && ev.talk.closed), played: !!ev.played, said: /Le joueur a ÉCOURTÉ la soirée/.test(end), jumped: Math.round((g.clockOff - off0) / 60000), slot: Math.round((r.due - Date.now()) / 60000), state: ev.state };
    r.state = 'dropped';
    return out;
  }, { ev: e2.ev, r: e2.r, n0 });
  await idle(page);
  await clear(page);
  check('un tournage pendant la soirée est dit dès qu’elle commence (notif et bandeau dans la scène) ; « Écourter la soirée » la finit là, son IA le sait, et l’horloge ne va que jusqu’au tournage',
    e2.clash.length === 1 && /short « Un short à 22 h » est à tourner à 20 h/.test(e2.clash[0]) && /Écourte la soirée pour y être/.test(e2.notif) && /est à tourner à 20 h/.test(banner)
      && e3.cut && e3.played && e3.said && e3.state === 'done' && e3.jumped >= 50 && e3.jumped <= 60 && e3.slot >= 0 && e3.slot <= 6, { e2, banner, e3 });
  // not cut short: the evening keeps its 3 h (what was in it comes late)
  await setHour(page, 19);
  const e4 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    const at = (h) => { const d = new Date(t + g.clockOff); d.setHours(h, 0, 0, 0); return d.getTime() - g.clockOff; };
    const r = H.scheduleRelease(g, { what: 'short', topic: 'Un autre short', due: at(22) });
    const ev = H.addEvent(g, { by: 'theo.marlin', what: 'Un ciné', kind: 'rdv', in: 5 });
    ev.due = Date.now() - 60000;
    H.arriveDate(g, ev);
    ev.played = { score: 0.6, tier: 'mid', at: Date.now(), kind: 'talk', diff: 'moyen' };
    const off0 = g.clockOff;
    await H.endDate(ev);
    const out = { jumped: Math.round((g.clockOff - off0) / 60000), late: r.due < Date.now() && r.state === 'scheduled' };
    r.state = 'dropped';
    return out;
  });
  await idle(page);
  await clear(page);
  check('pas écourtée, la soirée garde ses 3 h (le tournage passé pendant ce temps est en retard, rien ne s’arrête tout seul)', e4.jumped >= 170 && e4.jumped <= 181 && e4.late, e4);

  // the morning at their place: a short on the phone, anywhere; the rest needs the gear (brought, said; or lent)
  await setHour(page, 9);
  const s1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now(), c = H.charByHandle(g, 'zara.vey');
    g.stay = { c: c.id, ev: 'ev_x', where: 'c', at: t, until: t + 5 * 3600000 };
    const v = H.scheduleRelease(g, { what: 'vidéo', topic: 'Une vidéo chez elle', now: true });
    const sh = H.scheduleRelease(g, { what: 'short', topic: 'Un short chez elle', now: true });
    const a = H.canMakeR(g, v), b = H.canMakeR(g, sh);
    H.S.stack = []; H.startShoot(v); H.update();
    sh.state = 'dropped';
    return { v: v.id, a, b: b.ok, dm: H.promptDM(g, c, [], 'salut toi') };
  });
  await page.waitForSelector('.layer .gear-block');
  const block = await page.textContent('.layer .gear-block');
  await shot(page, 'stay-no-gear');
  await clear(page);
  const s2 = await G(page, async (id) => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'zara.vey'), v = g.releases.find((x) => x.id === id);
    window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', add: true, lines: [{ t: 'preter' }] }];
    await H.sendDM(c.id, 'dis, tu pourrais me prêter ton ordi pour tourner ma vidéo ?');
    for (let k = 0; k < 60 && !g.stay.lent; k++) await new Promise((res) => setTimeout(res, 100));
    const dbg = { left: (window.__mockOnce || []).length, lendLine: /prêter son matos/.test(window.__prompts.filter((p) => p.includes('CONVERSATION PRIVÉE')).slice(-1)[0] || ''), stay: JSON.stringify(g.stay) };
    const lent = !!g.stay.lent, ok1 = H.canMakeR(g, v).ok;
    delete g.stay.lent;
    const ok0 = H.canMakeR(g, v).ok;
    await H.sendDM(c.id, 'au fait j’ai ramené mon ordi avec moi, je peux tourner ici');
    const ok2 = H.canMakeR(g, v).ok;
    v.state = 'dropped';
    g.stay.end = Date.now();
    return { lent, ok1, ok0, gear: !!g.stay.gear, ok2, notif: g.notifs.slice(-8).some((n) => /te prête son matos/.test(n.text)), dbg };
  }, s1.v);
  await idle(page);
  await clear(page);
  check('chez elle le matin : un short se tourne au téléphone, une vidéo non (son IA peut te prêter son matos ; dire que tu as ramené le tien suffit) ; l’écran propose de rentrer ou de lui demander',
    !s1.a.ok && s1.a.fix === 'away' && /ton matos est resté chez toi/.test(s1.a.why) && s1.b && /prêter son matos/.test(s1.dm) && /Rentrer chez toi/.test(block) && /Demander son matos à Zara/.test(block)
      && s2.lent && s2.ok1 && !s2.ok0 && s2.gear && s2.ok2 && s2.notif, { s1: { a: s1.a, b: s1.b }, block, s2 });

  // a live lasts its 2 h
  await setHour(page, 15);
  const l1 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const r = H.scheduleRelease(g, { what: 'live', topic: 'Un live potions', now: true });
    const off0 = g.clockOff;
    H.finishShoot(r, 0.8);
    const out = { jumped: Math.round((g.clockOff - off0) / 60000), care: H.careOK('live') };
    r.state = 'dropped';
    return out;
  });
  check('un live dure ses 2 h (jamais « soigné »)', l1.jumped >= 118 && l1.jumped <= 121 && l1.care === false, l1);
  await idle(page);
  await clear(page);

  /* ---------- 6. the team saves time, by level; the other things that take time ---------- */
  await setHour(page, 10);
  const t6 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    g.releases.filter((x) => x.state === 'scheduled').forEach((x) => { x.state = 'dropped'; });
    const staff0 = g.staff;
    const who = H.mains(g)[1].id;
    const none = H.prodWord('vidéo', false, H.teamOf(g, 'vidéo'));
    g.staff = [{ role: 'monteur', tier: 0, c: who, rate: 50, at: t }];
    const ed0 = H.prodWord('vidéo', false, H.teamOf(g, 'vidéo'));
    g.staff = [{ role: 'monteur', tier: 3, c: who, rate: 50, at: t }, { role: 'miniature', tier: 3, c: who, rate: 20, at: t }];
    const both = H.prodWord('vidéo', false, H.teamOf(g, 'vidéo')), live = H.prodWord('live', false, H.teamOf(g, 'live'));
    const at = (h) => { const d = new Date(t + g.clockOff); d.setHours(h, 0, 0, 0); return d.getTime() - g.clockOff; };
    const r = H.scheduleRelease(g, { what: 'vidéo', topic: 'une vidéo avec toute l’équipe', due: at(18) });
    const slot = Math.round((at(18) - r.due) / 60000);
    const cash = g.career.cash;
    g.career.cash = 0; // (nothing to pay them with at the shoot: they do not work on it)
    H.payCrew(g, r);
    const unpaid = !r.team && H.prodWord(r.what, r.care, r.team) === '4 h';
    g.career.cash = cash;
    r.state = 'dropped';
    // a job done for someone: 2 h (an edit), 1 h (a thumbnail)
    const c = H.mains(g)[0];
    const job = H.addJob(g, c, { kind: 'montage', what: 'le montage de son vlog', pay: 0 });
    let off0 = g.clockOff;
    H.jobWorked(g, job, 0.8, { diff: 'moyen' });
    const jobMin = Math.round((g.clockOff - off0) / 60000);
    // a visit: about 2 h from when it started
    const v = { id: 'vi_t', c: c.id, why: 'parler', urge: 'tranquille', at: t, state: 'talk', lines: [], turn: 2, max: 4, reacts: ['charme', 'amuse'], mood: null, startAt: Date.now() - 30 * 60000 };
    g.visits = (g.visits || []).concat(v);
    off0 = g.clockOff;
    H.endVisit(g, v);
    const visitMin = Math.round((g.clockOff - off0) / 60000);
    g.staff = staff0;
    return { none, ed0, both, live, slot, unpaid, jobMin, visitMin };
  });
  await idle(page);
  await clear(page);
  check('l’équipe fait gagner du temps selon son niveau : une vidéo de 4 h prend 3 h 24 avec un monteur débutant, 2 h 18 avec une star du montage et un graphiste star (pas un live) ; compté dès la programmation, pas si on ne peut pas les payer au tournage',
    t6.none === '4 h' && t6.ed0 === '3 h 24' && t6.both === '2 h 18' && t6.live === '2 h' && t6.slot === 138 && t6.unpaid, t6);
  check('un montage fait pour un perso prend 2 h, une visite environ 2 h depuis son début', t6.jobMin >= 119 && t6.jobMin <= 121 && t6.visitMin >= 88 && t6.visitMin <= 91, t6);

  await browser.close();
  const fails = checks.filter((c) => c[0] === 'FAIL');
  const errs = errors.filter((e) => !/favicon|Failed to load resource/.test(e));
  if (errs.length) console.log('ERRORS\n' + errs.join('\n'));
  console.log(`${checks.length - fails.length}/${checks.length} PASS${errs.length ? ` · ${errs.length} erreurs` : ''}`);
  process.exit(fails.length || errs.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
