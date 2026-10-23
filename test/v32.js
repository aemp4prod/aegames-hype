// 0.32, in Chromium against the built hype.html with the mocked Claude runtime: le temps qui passe.
// - the energy: full at the start, 5 an hour awake (more at work), the night slept in a skip, « Dormir » (until 8 h, the
//   alarm before a date), a nap, a long absence rests; tired, a shoot loses (said before, shown after), the prompts know;
//   a bed offered from 1 h (once a night) and when exhausted (once a waking);
// - what an action takes: a message 5 min (10 when long), a post 15 (20 with a photo), a comment 5, a story 10; a like,
//   nothing; the clock shows « +5 min »;
// - productions at a human pace (a video 8 h, a clip 6, a podcast 4; big productions as they were); a release planned
//   before keeps its hour out;
// - the network tells the hours gone by untold (2 h of work: a refresh « pendant que le joueur travaillait »);
// - the characters' lives: asleep at night (the message waits, « Envoyé », a tip once, then all of it answered at their
//   waking, with the late prompt), a conversation going on stays instant, their AI may step away (« dispo »), the impulsive
//   and the psychopath at hand, brands at hand at any hour (0.32.1; an answer they had put off comes at once; a candidate
//   keeps office hours), a date soon at hand; the online dot; a group waits for someone;
// - on a phone, the strip keeps its room; without window.__t32 (the suites written before), none of it.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v32.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v32');
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
const clear = (page) => G(page, () => { const H = window.__hype; H.S.stack = []; H.S.modals.length = 0; H.S.toasts.length = 0; H.update(); });
async function dismiss(page) { for (let k = 0; k < 8 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }
async function overflowCheck(page, label) {
  const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth }));
  if (w.sw > w.cw + 1 || w.bw > w.cw + 1) errors.push(`[overflow] ${label}: ${JSON.stringify(w)}`);
}
async function newPage(browser, viewport, t32 = true) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 700, colorScheme: 'light' });
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript((on) => { window.__hypeEasyGear = true; if (on) window.__t32 = true; }, t32);
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
  // the game's days clear of a change of hour (the checks count the hours of a night: 22 h + 11 h = 9 h), a week later
  // as many times as needed (the clock alone, as setClock: nothing else moves)
  await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now() + (g.clockOff || 0), off = (x) => new Date(x).getTimezoneOffset();
    let k = 0;
    while (k < 8 && Array.from({ length: 10 }, (_, i) => off(t + k * 7 * 86400000 + i * 86400000)).some((o) => o !== off(t + k * 7 * 86400000))) k++;
    if (k) { g.clockOff = (g.clockOff || 0) + k * 7 * 86400000; H.update(); }
  });
}
// The game's clock: set to h:m today (labels only), or carried forward to the next h:m (the time really passes).
const setClock = (page, h, m = 0) => G(page, ([h, m]) => { const H = window.__hype, g = H.S.game; const d = new Date(Date.now() + (g.clockOff || 0)); const x = new Date(d.getTime()); x.setHours(h, m, 0, 0); g.clockOff = (g.clockOff || 0) + (x - d); H.update(); }, [h, m]);
const goTo = (page, h, m = 0) => G(page, ([h, m]) => { const H = window.__hype, g = H.S.game; const d = new Date(Date.now() + (g.clockOff || 0)); const x = new Date(d.getTime()); x.setHours(h, m, 0, 0); if (x <= d) x.setDate(x.getDate() + 1); H.jumpClock(g, x - d, 'skip'); H.update(); }, [h, m]);
const setNrg = (page, e, upH) => G(page, ([e, upH]) => { const H = window.__hype, g = H.S.game, t = Date.now(); g.nrg = { e, at: t, wake: t - (upH == null ? (100 - e) / 5 : upH) * 3600000, night: 'x', low: 'x' }; H.update(); }, [e, upH]);
const hourNow = (page) => G(page, () => { const d = window.__hype.gameDate(Date.now()); return [d.getHours(), d.getMinutes()]; });
const toastHas = (page, re) => G(page, (src) => window.__hype.S.toasts.some((x) => new RegExp(src).test(x.text)), re.source);

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);

  // ---------- the energy ----------
  const e0 = await G(page, () => { const H = window.__hype, g = H.S.game, s = H.nrgState(g), b = document.querySelector('.status-strip .fit-chip'); return { pct: s.pct, id: s.id, chip: b ? b.textContent : '', cls: b ? b.className : '' }; });
  check('a new game: energy 100 %, the battery beside the clock says it', e0.pct === 100 && e0.id === 'forme' && /100/.test(e0.chip) && /forme/.test(e0.cls), e0);
  await setClock(page, 8, 0);
  await setNrg(page, 100, 0);
  const e15 = await G(page, () => { const H = window.__hype, g = H.S.game; H.jumpClock(g, 15 * 3600000, 'awake'); H.update(); const s = H.nrgState(g); return { pct: s.pct, id: s.id, label: s.label, malus: s.malus, ctx: H.nrgCtx(g) }; });
  await sleep(300);
  const chip15 = await G(page, () => { const b = document.querySelector('.status-strip .fit-chip'); return b ? { cls: b.className, label: b.getAttribute('aria-label') } : null; });
  await page.locator('.status-strip').screenshot({ path: path.join(OUT, 'strip-tired.png') });
  check('15 h up: 25 %, tired (a shoot loses 10 %), said in her own gender; the battery turns orange', e15.pct === 25 && e15.id === 'fatigue' && e15.label === 'Fatiguée' && e15.malus === 0.1 && /fatigue/.test(chip15.cls) && /Fatiguée/.test(chip15.label), { e15, chip15 });
  check('the prompts know: tired, up for 15 h, it may show (their AI decides)', /^Le joueur est fatigué \(debout depuis 15 h\) : ça peut se sentir/.test(e15.ctx || ''), e15.ctx);
  await setNrg(page, 100, 0);
  const work = await G(page, () => { const H = window.__hype, g = H.S.game; H.jumpClock(g, 8 * 3600000, 'work'); return H.nrgState(g).pct; });
  check('8 h of work tire more than 8 h awake: 48 %', work === 48, work);
  await setClock(page, 22, 0);
  await setNrg(page, 100, 14);
  const night = await G(page, () => { const H = window.__hype, g = H.S.game; H.jumpClock(g, 11 * 3600000, 'skip'); const s = H.nrgState(g), d = H.gameDate(Date.now()); return { pct: s.pct, up: Math.round(s.up / 60000), h: d.getHours() }; });
  check('the watch through the night (22 h → 9 h): the night slept, 95 % at 9 h, up since 8 h', night.pct === 95 && night.h === 9 && Math.abs(night.up - 60) <= 2, night);

  // « Dormir », from the time sheet
  await setClock(page, 23, 30);
  await setNrg(page, 30);
  await G(page, () => window.__hype.openWatch());
  await page.waitForSelector('.modal .fit-block');
  const wb = await G(page, () => { const b = document.querySelector('.modal .fit-block'); return { head: b.querySelector('.fit-head').textContent, btn: [...b.querySelectorAll('.fit-acts button')].map((x) => x.textContent) }; });
  await shot(page, 'watch-night');
  check('in the time sheet: the energy, how long up, and « Dormir jusqu’à 8 h » at night', /Énergie 30/.test(wb.head) && /debout depuis 14 h/.test(wb.head) && wb.btn.length === 1 && /Dormir jusqu’à 8 h/.test(wb.btn[0]), wb);
  const n0 = await G(page, () => window.__prompts.length);
  await page.locator('.modal .fit-acts button').first().click();
  await idle(page);
  const slept = await G(page, (n0) => { const H = window.__hype, g = H.S.game, d = H.gameDate(Date.now()), s = H.nrgState(g); return { h: d.getHours(), m: d.getMinutes(), pct: s.pct, up: Math.round(s.up / 60000), told: window.__prompts.slice(n0).some((p) => p.includes('pendant que le joueur dormait')), toast: H.S.toasts.some((x) => /^☀️ Debout ! Il est 8 h · énergie 100/.test(x.text)) }; }, n0);
  check('slept: 8 h on the clock, 100 %, « Debout ! », and the network tells the night (« pendant que le joueur dormait »)', slept.h === 8 && slept.m === 0 && slept.pct === 100 && slept.up <= 1 && slept.told && slept.toast, slept);
  await clear(page);
  // a nap in the day
  await goTo(page, 15, 0);
  await setNrg(page, 40);
  const nap = await G(page, () => { const H = window.__hype, g = H.S.game, P = H.sleepPlan(g); return { nap: P.nap, ms: P.ms }; });
  await G(page, () => window.__hype.goSleep());
  await idle(page);
  const napped = await G(page, () => { const H = window.__hype, g = H.S.game, d = H.gameDate(Date.now()); return { pct: H.nrgState(g).pct, h: d.getHours(), m: d.getMinutes(), toast: H.S.toasts.some((x) => /^😴 Une petite sieste/.test(x.text)) }; });
  check('in the day, a nap: an hour and a half, a quarter of the bar back (40 → 65 %)', nap.nap && nap.ms === 90 * 60000 && napped.pct === 65 && napped.h === 16 && napped.m === 30 && napped.toast, { nap, napped });
  await clear(page);
  // the alarm before a date
  await goTo(page, 23, 0);
  const alarm = await G(page, () => {
    const H = window.__hype, g = H.S.game, d = H.gameDate(Date.now()), x = new Date(d.getTime());
    x.setDate(x.getDate() + 1); x.setHours(6, 30, 0, 0);
    const ev = H.addEvent(g, { by: 'theo.marlin', kind: 'rdv', what: 'petit-déj au lac', in: Math.round((x - d) / 60000) });
    const P = H.sleepPlan(g);
    return { ev: !!ev, until: H.hourOf(P.until), alarm: !!P.alarm && P.alarm === ev, word: H.alarmWord(g, P.alarm), id: ev && ev.id };
  });
  await G(page, () => window.__hype.goSleep());
  // (the toast is read as soon as it shows: the night told afterwards brings other toasts that may push it out)
  const rang = await page.waitForFunction(() => window.__hype.S.toasts.map((x) => x.text).find((x) => /réveil a sonné/.test(x)) || null, null, { timeout: 20000 }).then((h) => h.jsonValue()).catch(() => '');
  await idle(page);
  const woke = await G(page, (rang) => { const H = window.__hype, d = H.gameDate(Date.now()); return { h: d.getHours(), m: d.getMinutes(), toast: rang || H.S.toasts.map((x) => x.text).find((x) => /réveil a sonné/.test(x)) || '' }; }, rang);
  check('a date at 6 h 30: the alarm rings 45 min before, and says why', alarm.ev && alarm.alarm && alarm.until === '5 h 45' && woke.h === 5 && woke.m === 45 && /ton rendez-vous avec Théo à 6 h 30/.test(woke.toast), { alarm, woke });
  await G(page, (id) => { const g = window.__hype.S.game; g.events = g.events.filter((e) => e.id !== id); }, alarm.id);
  await clear(page);
  // a long absence rests, a short one is lived
  const back = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    g.nrg = { e: 20, at: t - 7 * 3600000, wake: t - 20 * 3600000 }; H.nrgBack(g, t - 7 * 3600000, t); const long = H.nrgState(g).pct;
    g.nrg = { e: 60, at: t - 3600000, wake: t - 8 * 3600000 }; H.nrgBack(g, t - 3600000, t); const short = Math.round(H.nrgNow(g));
    return { long, short };
  });
  check('the game closed 7 h: rested (100 %); closed 1 h in the day: an hour lived (60 → 55 %)', back.long === 100 && back.short === 55, back);
  // a bed offered in the night, once; and when exhausted, once
  await goTo(page, 1, 30);
  const offer = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    g.nrg = { e: 50, at: t, wake: t - 10 * 3600000 }; H.S.toasts.length = 0; H.S.lastInputAt = t;
    const a = H.tickNrg(g), x = H.S.toasts.find((y) => /^🌙 Il est 1 h 30/.test(y.text)), b = H.tickNrg(g);
    g.nrg.e = 10; H.S.toasts.length = 0;
    const c = H.tickNrg(g), y = H.S.toasts.find((z) => /^😵 Tu es épuisée/.test(z.text)), d = H.tickNrg(g);
    return { a, b, c, d, night: x ? x.action && x.action.label : '', low: y ? y.action && y.action.label : '' };
  });
  check('from 1 h, a bed offered once a night (« Dormir »); exhausted, once a waking — never forced', offer.a && !offer.b && offer.c && !offer.d && offer.night === 'Dormir' && offer.low === 'Dormir', offer);
  await clear(page);

  // ---------- a shoot made tired ----------
  await idle(page);
  await goTo(page, 14, 0);
  await setNrg(page, 20);
  const rid = await G(page, () => { const H = window.__hype, g = H.S.game; const r = H.scheduleRelease(g, { what: 'short', topic: 'Les potions à éviter', due: Date.now(), now: true }); return r && r.id; });
  await G(page, (id) => window.__hype.openLayer({ t: 'minigame', id }), rid);
  await page.waitForSelector('.layer .fit-note');
  const note = await page.$eval('.layer .fit-note', (e) => ({ text: e.textContent.replace(/\u00a0/g, ' '), cls: e.className }));
  await shot(page, 'shoot-tired');
  check('before the shoot: the energy it starts and ends with, and what it will lose', /tired/.test(note.cls) && note.text === '⚡ Énergie 20 % → 7 % à la fin : tu es déjà fatiguée, ton tournage perdra 18 %.', note);
  await G(page, (id) => { const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === id); H.finishShoot(r, 1); H.update(); }, rid);
  await until(page, (id) => { const r = window.__hype.S.game.releases.find((x) => x.id === id); return !!(r && r.prodDone); }, rid); // (its hours of work pass once nobody is writing)
  const shotTired = await G(page, (id) => { const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === id); return { score: r.played.score, raw: r.played.raw, tired: r.played.tired, pct: H.nrgState(g).pct, id: H.nrgState(g).id, line: H.timeLine(g, r), ctx: H.nrgCtx(g) }; }, rid);
  await page.waitForSelector('.layer .fit-lost');
  const lost = await page.$eval('.layer .fit-lost', (e) => e.textContent.replace(/\u00a0/g, ' '));
  await shot(page, 'shoot-result-tired');
  check('shot tired: 100 % played, 82 % kept, said on the result; 2 h of work later, exhausted', shotTired.score === 0.82 && shotTired.raw === 1 && shotTired.tired === 0.18 && lost === '😴 La fatigue t’a coûté 18 points (100 % sans elle).' && shotTired.id === 'epuise', { shotTired, lost });
  check('the reactions know it was made tired; the prompts know she is exhausted', /Le joueur l’a fait fatigué : ça se sent un peu/.test(shotTired.line) && /^Le joueur est épuisé/.test(shotTired.ctx || ''), { line: shotTired.line, ctx: shotTired.ctx });
  await G(page, (id) => { const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === id); if (r) r.state = 'dropped'; H.S.stack = []; H.update(); }, rid);
  await idle(page);
  await clear(page);

  // ---------- what an action takes ----------
  await goTo(page, 14, 0);
  await setNrg(page, 100, 6);
  const off = () => G(page, () => window.__hype.S.game.clockOff);
  const settle = () => until(page, () => !window.__hype.S.game.actDebt && !window.__hype.S.busy.dm && !window.__hype.S.busy.act);
  await G(page, () => { const H = window.__hype, g = H.S.game; H.addIncomingDM(g, 'theo.marlin', 'alors, ce tournage ?', Date.now() - 60000); g.quietMs = 0; });
  let o0 = await off();
  await G(page, () => { const H = window.__hype; return H.sendDM(H.charByHandle(H.S.game, 'theo.marlin').id, 'fini, je suis contente !'); });
  await idle(page); await settle();
  let o1 = await off();
  const bump = await G(page, () => { const b = document.querySelector('.clock-btn .clock-bump'); return { text: b ? b.textContent : '', ms: window.__hype.S.clockBump && window.__hype.S.clockBump.ms }; });
  await page.locator('.status-strip').screenshot({ path: path.join(OUT, 'strip-bump.png') });
  check('a message: 5 min on the clock once they answered, and the clock says « +5 min »', o1 - o0 === 300000 && bump.ms === 300000 && bump.text === '+5 min', { d: o1 - o0, bump });
  o0 = o1;
  await G(page, () => { const H = window.__hype; return H.sendDM(H.charByHandle(H.S.game, 'theo.marlin').id, 'Alors voilà, je te raconte tout : on a tourné toute la matinée dans la serre aux mandragores, il a fallu recommencer trois fois la scène du rempotage parce que la plus grosse hurlait à chaque prise, et à la fin Zara est passée nous narguer.'); });
  await idle(page); await settle();
  o1 = await off();
  check('a long message (more than 200 characters): 10 min', o1 - o0 === 600000, o1 - o0);
  o0 = o1;
  const pid = await G(page, async () => { const H = window.__hype; await H.runAct('post', 'Nouveau short demain, préparez vos oreilles 🌱'); const p = H.S.game.posts.filter((x) => x.a === 'p').pop(); return p.id; });
  await idle(page); await settle();
  o1 = await off();
  check('a post: a quarter of an hour', o1 - o0 === 15 * 60000, (o1 - o0) / 60000);
  o0 = o1;
  await G(page, () => window.__hype.runAct('post', 'La serre ce matin', null, null, { photo: { desc: 'une serre pleine de mandragores en pot, lumière du matin' } }));
  await idle(page); await settle();
  o1 = await off();
  check('a post with a photo: 20 min', o1 - o0 === 20 * 60000, (o1 - o0) / 60000);
  o0 = o1;
  await G(page, (pid) => { const H = window.__hype, p = H.S.game.posts.find((x) => x.id === pid); return H.runAct('reply', 'merci à tous 💚', p); }, pid);
  await idle(page); await settle();
  o1 = await off();
  check('a comment: 5 min', o1 - o0 === 5 * 60000, (o1 - o0) / 60000);
  o0 = o1;
  await G(page, (pid) => { const H = window.__hype, p = H.S.game.posts.find((x) => x.a !== 'p'); if (p) H.toggleLike(p); }, pid);
  await sleep(1500);
  o1 = await off();
  check('a like costs nothing', o1 === o0, o1 - o0);
  await G(page, () => window.__hype.postStory({ text: 'jour de tournage 🎬' }));
  await idle(page); await settle();
  o1 = await off();
  check('a story: 10 min', o1 - o0 === 10 * 60000, (o1 - o0) / 60000);

  // ---------- productions at a human pace ----------
  const prod = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const P = H.BIG_PLAN[2], plan = H.bigPlan(g, { size: 2, what: 'vidéo', day: 2, hour: 18 });
    return { H: H.PROD_H, care: H.prodWord('vidéo', true), clip: H.prodWord('clip'), big: plan.works.map((x) => Math.round(x * 10) / 10), want: P.map((s) => Math.max(1, s.w)) };
  });
  check('a video 8 h (16 h « soignée »), a clip 6 h, a podcast 4 h, a short and a live 2 h; a big production keeps its stages', prod.H.vidéo === 8 && prod.H.clip === 6 && prod.H.podcast === 4 && prod.H.short === 2 && prod.H.live === 2 && prod.care === '16 h' && prod.clip === '6 h' && prod.big.join() === prod.want.join(), prod);
  const old = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    const a = H.scheduleRelease(g, { what: 'vidéo', topic: 'Ancienne vidéo du soir', due: t + 10 * 3600000 });
    const b = H.scheduleRelease(g, { what: 'vidéo', topic: 'Ancienne vidéo bientôt', due: t + 9 * 3600000 });
    a.due = a.outAt - 4 * 3600000; // (planned with the hours of before)
    b.outAt = t + 5 * 3600000; b.due = t + 3600000; delete b.ann; // (out in 5 h, its shoot of 4 h in 1 h)
    const outA = a.outAt, outB = b.outAt;
    H.prod32(g, t);
    const r = { a: [(a.outAt - a.due) / 3600000, a.outAt === outA], b: [Math.round((b.due - t) / 60000), b.ann === outB, Math.round((b.outAt - t) / 3600000)] };
    a.state = 'dropped'; b.state = 'dropped';
    return r;
  });
  check('a release planned before: same hour out, its shoot 8 h before; too close, shot now and late on its announce', old.a[0] === 8 && old.a[1] && old.b[0] === 0 && old.b[1] && old.b[2] === 8, old);

  // ---------- the network tells the hours gone by ----------
  const n1 = await G(page, () => { const H = window.__hype, g = H.S.game; g.quietMs = 0; H.jumpClock(g, 30 * 60000, 'skip'); const q0 = g.quietMs || 0; H.jumpClock(g, 150 * 60000, 'work'); return { q0, q1: g.quietMs, n: window.__prompts.length }; });
  const told = await until(page, (n) => window.__prompts.slice(n).some((p) => p.includes('pendant que le joueur travaillait sur ses contenus')), n1.n);
  await idle(page);
  const q2 = await G(page, () => window.__hype.S.game.quietMs || 0);
  check('2 h 30 of work untold: the network tells them (« pendant que le joueur travaillait sur ses contenus »); a skip tells itself', n1.q0 === 0 && n1.q1 === 150 * 60000 && told && q2 === 0, Object.assign({ told, q2 }, n1));
  await clear(page);

  // ---------- the characters' lives ----------
  // asleep: the message waits for them
  const R = await G(page, () => { const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin'); return H.rythmeOf(g, c); });
  const bedH = Math.floor((R.bed + 1.5) % 24), bedM = Math.round((((R.bed + 1.5) % 24) % 1) * 60);
  await goTo(page, bedH, bedM);
  await G(page, () => { const g = window.__hype.S.game; delete g.tipDispo; window.__hype.S.toasts.length = 0; });
  const nA = await G(page, () => window.__prompts.length);
  const def = await G(page, async () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin');
    const ok1 = await H.sendDM(c.id, 'tu dors ?'), D1 = Object.assign({}, g.dms[c.id].due), wake = H.asleepUntil(H.rythmeOf(g, c), Date.now());
    const ok2 = await H.sendDM(c.id, 'bon, bonne nuit alors 🌙'), D2 = g.dms[c.id].due;
    return { ok1, ok2, why: D1.why, sameDue: D2.at <= D1.at && D2.from === D1.from, after: Math.round((D1.at - wake) / 60000), tip: H.S.toasts.some((x) => /Théo n’a pas encore lu ton message : chacun sa vie/.test(x.text)) };
  });
  const nB = await G(page, (n) => window.__prompts.slice(n).filter((p) => p.includes('CONVERSATION PRIVÉE')).length, nA);
  await G(page, () => { const H = window.__hype; H.openDM(H.charByHandle(H.S.game, 'theo.marlin').id); });
  await page.waitForSelector('.layer .seen-tag.sent');
  await shot(page, 'dm-sent-asleep');
  check('at night, asleep: no answer now (no call), « Envoyé », a tip once; they will read it at their waking', def.ok1 && def.ok2 && nB === 0 && def.why === 'dormait' && def.sameDue && def.after >= 5 && def.after <= 50 && def.tip, Object.assign({ nB }, def));
  // their waking: everything answered at once
  await G(page, () => { window.__mockOnce = [{ has: 'n’avait pas encore lus', lines: [{ t: 'msg', text: 'désolé je dormais 😴' }, { t: 'msg', text: 'tout va bien, et toi ?' }, { t: 'rel', d: 1, why: 'touché' }] }]; });
  await until(page, () => !window.__hype.S.game.actDebt); // (the minutes of writing passed first)
  await G(page, () => { const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin'); H.jumpClock(g, g.dms[c.id].due.at - Date.now() + 120000, 'skip'); H.update(); });
  await until(page, () => { const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin'); return g.dms[c.id].msgs.some((m) => m.text === 'tout va bien, et toi ?'); }, null, 20000);
  await idle(page);
  const late = await G(page, (nA) => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin'), cv = g.dms[c.id];
    const P = window.__prompts.slice(nA).find((p) => p.includes('n’avait pas encore lus')) || '';
    const r = cv.msgs.find((m) => m.text === 'désolé je dormais 😴');
    return { both: P.includes('« tu dors ? »') && P.includes('« bon, bonne nuit alors 🌙 »'), slept: P.includes('(il dormait)'), once: P.includes('répond à tout d’un coup'), due: !cv.due, r: r && r.r === 1, now: r ? Math.round((Date.now() - r.at) / 1000) : null };
  }, nA);
  await shot(page, 'dm-answer-late');
  check('at their waking, one answer to all of it: both messages, « il dormait », answered at once, typed as they wake (just now)', late.both && late.slept && late.once && late.due && late.r && late.now >= -40 && late.now <= 60, late);
  // a conversation going on: at once
  const nC = await G(page, () => window.__prompts.length);
  await G(page, () => { const H = window.__hype; return H.sendDM(H.charByHandle(H.S.game, 'theo.marlin').id, 'super bien ! café ce matin ?'); });
  await idle(page);
  const hot = await G(page, (n) => ({ calls: window.__prompts.slice(n).filter((p) => p.includes('CONVERSATION PRIVÉE')).length, dot: !!document.querySelector('.layer-head .on-dot') }), nC);
  check('then the conversation is going on: answered at once, and they show « en ligne »', hot.calls === 1 && hot.dot, hot);
  // their AI steps away
  await G(page, () => { window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'je file au taf, je te réponds ce soir' }, { t: 'dispo', h: 3, why: 'au boulot' }] }]; });
  await G(page, () => { const H = window.__hype; return H.sendDM(H.charByHandle(H.S.game, 'theo.marlin').id, 'tu fais quoi aujourd’hui ?'); });
  await idle(page); await settle();
  const away = await G(page, async () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin'), A = Object.assign({}, c.away);
    const n = window.__prompts.length;
    await H.sendDM(c.id, 'ok, bon courage !');
    const D = g.dms[c.id].due;
    return { h: Math.round((A.until - A.at) / 60000), why: A.why, calls: window.__prompts.slice(n).filter((p) => p.includes('CONVERSATION PRIVÉE')).length, dueWhy: D && D.why, after: D ? Math.round((D.at - A.until) / 60000) : -1, line: H.promptDM(g, c, [], 'x').includes('{"t":"dispo","h":2') };
  });
  check('their AI may step away (« dispo », 3 h « au boulot »): even mid-conversation, the next message waits for them', away.h === 180 && away.why === 'au boulot' && away.calls === 0 && away.dueWhy === 'au boulot' && away.after >= 0 && away.after <= 20 && away.line, away);
  await G(page, () => { const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin'); delete c.away; delete g.dms[c.id].due; });
  await clear(page);
  // who is at hand, by their nature; brands at office hours; a date soon
  await goTo(page, 14, 0);
  const nature = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    const lea = H.charByHandle(g, 'leandre.aube'), ada = H.charByHandle(g, 'ada.quill'), zara = H.charByHandle(g, 'zara.vey');
    const keep = [lea.coeur, ada.coeur];
    lea.coeur = 'impulsif'; ada.coeur = 'prudent';
    window.__dispoRolls = [0.5, 0.25]; const a = H.dispoOf(g, lea, t, { msgs: [] });
    window.__dispoRolls = [0.5, 0.25]; const b = H.dispoOf(g, ada, t, { msgs: [] });
    window.__dispoRolls = [];
    const Z = H.rythmeOf(g, zara), L = H.rythmeOf(g, lea), A = H.rythmeOf(g, ada);
    lea.coeur = keep[0]; ada.coeur = keep[1];
    return { imp: a.now, pru: b.now ? 0 : Math.round((b.at - t) / 60000), psy: H.isPsy(g, zara) && Z.glued && Z.speed === 1, glued: L.glued && !A.glued };
  });
  check('by nature: the impulsive answers at once, the cautious one after a while; the psychopath and the impulsive are glued to their phone', nature.imp === true && nature.pru === 20 && nature.psy && nature.glued, nature);
  await goTo(page, 22, 0);
  // 0.32.1: a brand answers right away, at any hour, and never steps away; a candidate keeps office hours
  const NOW_LINE = 'répond tout de suite, à toute heure';
  const brand = await G(page, async (NOW_LINE) => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    g.chars.brandtest = { id: 'brandtest', kind: 'brand', name: 'Clémence Vidal', handle: 'clemence.partenariats', emoji: '💼', g: 'f', role: 'Chargée de partenariats, Marque Test', bio: 'Les partenariats de la Marque Test.', personality: 'pro et chaleureuse', voice: 'tutoie vite, phrases courtes', followers: 900, rel: 10, unlocked: true, unlockedAt: t - 864e5, mem: [], dmSent: 0 };
    g.order.push('brandtest');
    const c = g.chars.brandtest, av = H.dispoOf(g, c, t, { msgs: [] });
    const cand = H.dispoOf(g, { id: 'zz', kind: 'cand', handle: 'cand.test', name: 'Candidat Test' }, t, { msgs: [] }), d = H.gameDate(cand.at);
    const p = H.promptDM(g, c, [], 'x');
    window.__mockOnce = [{ has: NOW_LINE, lines: [{ t: 'msg', text: 'Bonsoir ! Oui, on peut en parler tout de suite.' }, { t: 'dispo', h: 3, why: 'fin de journée' }] }];
    const n = window.__prompts.length;
    const ok = await H.sendDM(c.id, 'Bonsoir ! On pourrait parler d’un partenariat ?');
    return { now: av.now, cand: cand.why === 'hors des heures de bureau' && d.getHours() >= 9 && d.getHours() < 11, line: p.includes(NOW_LINE) && !p.includes('{"t":"dispo","h":2'), ok, n };
  }, NOW_LINE);
  await idle(page); await settle();
  const brand2 = await G(page, ([n, NOW_LINE]) => {
    const H = window.__hype, g = H.S.game, c = g.chars.brandtest, cv = g.dms[c.id];
    return { calls: window.__prompts.slice(n).filter((p) => p.includes(NOW_LINE)).length, answered: cv.msgs.some((m) => m.text === 'Bonsoir ! Oui, on peut en parler tout de suite.'), away: !c.away, due: !cv.due };
  }, [brand.n, NOW_LINE]);
  check('a brand at 22 h (0.32.1): at hand, its AI told to deal with it now (never to step away), it answers right away and a « dispo » of its AI is ignored; a candidate keeps office hours',
    brand.now === true && brand.line && brand.ok && brand.cand && brand2.calls === 1 && brand2.answered && brand2.away && brand2.due, Object.assign({}, brand, brand2));
  // an answer a brand had put off with 0.32.0 (office hours): it comes now
  const nLate = await G(page, (NOW_LINE) => {
    const H = window.__hype, g = H.S.game, cv = g.dms.brandtest, t = Date.now();
    cv.msgs.push({ id: 'mx1', me: true, text: 'Et pour la date de tournage ?', ts: t - 60000, at: t - 60000 });
    cv.due = { at: t + 11 * 3600000, why: 'hors des heures de bureau', from: t - 60000 };
    window.__mockOnce = [{ has: NOW_LINE, lines: [{ t: 'msg', text: 'Le tournage peut se faire jeudi.' }] }];
    return window.__prompts.length;
  }, NOW_LINE);
  await until(page, () => window.__hype.S.game.dms.brandtest.msgs.some((m) => m.text === 'Le tournage peut se faire jeudi.'), null, 20000);
  await idle(page);
  const putOff = await G(page, (n) => {
    const H = window.__hype, g = H.S.game, P = window.__prompts.slice(n).find((p) => p.includes('Et pour la date de tournage')) || '';
    const r = { answered: g.dms.brandtest.msgs.some((m) => m.text === 'Le tournage peut se faire jeudi.'), asked: !!P, bureau: P.includes('hors des heures de bureau'), due: !g.dms.brandtest.due };
    delete g.chars.brandtest; delete g.dms.brandtest; g.order = g.order.filter((x) => x !== 'brandtest');
    return r;
  }, nLate);
  check('an answer a brand had put off before (office hours, with 0.32.0) comes at once, without « hors des heures de bureau »', putOff.answered && putOff.asked && !putOff.bureau && putOff.due, putOff);
  await goTo(page, 23, 30);
  const soon = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'leandre.aube');
    const ev = H.addEvent(g, { by: 'leandre.aube', kind: 'rdv', what: 'verre au bar des Glycines', in: 60 });
    const a = H.dispoOf(g, c, Date.now(), { msgs: [] });
    g.events = g.events.filter((e) => e !== ev);
    return { ev: !!ev, now: a.now };
  });
  check('a date in an hour: they are at hand, whatever the hour', soon.ev && soon.now, soon);
  // a group waits for someone
  await goTo(page, 14, 0);
  const grp = await G(page, async () => {
    const H = window.__hype, g = H.S.game, ids = ['theo.marlin', 'leandre.aube'].map((h) => H.charByHandle(g, h).id);
    const r = H.createGroup(g, ids, 'Les lève-tard', '🌙');
    if (!r.ok) return { ok: false, why: r.why };
    const n = window.__prompts.length;
    await H.sendGroup(r.gr.id, 'bienvenue dans le groupe !');
    return { ok: true, id: r.gr.id, first: window.__prompts.slice(n).filter((p) => p.includes('LE GROUPE DE DISCUSSION')).length };
  });
  await idle(page);
  await goTo(page, 4, 0);
  const gw = await G(page, async (id) => {
    const H = window.__hype, g = H.S.game, gr = H.groupOf(g, id), n = window.__prompts.length;
    const av = H.groupDispo(g, gr);
    await H.sendGroup(id, 'qui est réveillé ?');
    return { nobody: av.now.length === 0, calls: window.__prompts.slice(n).filter((p) => p.includes('LE GROUPE DE DISCUSSION')).length, due: !!gr.due, at: gr.due ? gr.due.at : 0 };
  }, grp.id);
  await G(page, () => { window.__mockOnce = [{ has: 'personne n’avait encore lus', lines: [{ t: 'msg', by: 'theo.marlin', text: 'moi maintenant 😅' }] }]; });
  if (gw.at) await G(page, (at) => { const H = window.__hype; H.jumpClock(H.S.game, at - Date.now() + 60000, 'skip'); H.update(); }, gw.at);
  const gAns = await until(page, (id) => window.__hype.groupOf(window.__hype.S.game, id).msgs.some((m) => m.text === 'moi maintenant 😅'), grp.id, 20000);
  await idle(page);
  check('a group: answered at once in the day; at 4 h nobody is there, it waits, and they answer when the first one wakes up', grp.ok && grp.first === 1 && gw.nobody && gw.calls === 0 && gw.due && gAns, Object.assign({ gAns }, grp, gw));
  await clear(page);
  // an answer from while the time went by: dated when they woke up, and a notification says so
  const RA = await G(page, () => { const H = window.__hype, g = H.S.game; return H.rythmeOf(g, H.charByHandle(g, 'ada.quill')); });
  await goTo(page, Math.floor((RA.bed + 1) % 24), Math.round((((RA.bed + 1) % 24) % 1) * 60));
  const adaDue = await G(page, async () => { const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'ada.quill'); await H.sendDM(c.id, 'tu as le livre des ombres ?'); return g.dms[c.id].due && g.dms[c.id].due.at; });
  await G(page, () => { window.__mockOnce = [{ has: 'n’avait pas encore lus', lines: [{ t: 'msg', text: 'Il est réservé. Passez à la bibliothèque.' }] }]; });
  await until(page, () => !window.__hype.S.game.actDebt); // (the minutes of writing passed first)
  if (adaDue) await G(page, () => { const H = window.__hype, g = H.S.game, D = g.dms[H.charByHandle(g, 'ada.quill').id].due; H.jumpClock(g, D.at - Date.now() + 45 * 60000, 'skip'); H.update(); }); // (its due read now: the minutes of writing may have passed meanwhile)
  await until(page, () => { const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'ada.quill'); return (g.dms[c.id] || { msgs: [] }).msgs.some((m) => m.text === 'Il est réservé. Passez à la bibliothèque.'); }, null, 20000);
  await idle(page);
  const past = await G(page, () => { const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'ada.quill'), m = g.dms[c.id].msgs.find((x) => x.text === 'Il est réservé. Passez à la bibliothèque.'); return { ago: m ? Math.round((Date.now() - m.at) / 60000) : null, notif: g.notifs.some((n) => n.k === 'dm' && n.c === c.id && /^💬 Ada Quill t’a répondu\.$/.test(n.text)) }; });
  check('an answer that came while the time was skipped: dated when they read it (45 min ago), and a notification says so', !!adaDue && past.ago >= 44 && past.ago <= 47 && past.notif, Object.assign({ adaDue: !!adaDue }, past));
  await clear(page);

  // ---------- the agent asks a brand for a talent: its AI may make the offer ----------
  await goTo(page, 14, 0);
  const ag = await G(page, async () => {
    const H = window.__hype, g = H.S.game, t = Date.now(), theo = H.charByHandle(g, 'theo.marlin');
    theo.followers = 40000;
    const A = H.agencyOf(g);
    A.talents.push({ c: theo.id, state: 'on', cut: 15, at: t, since: t });
    const b = H.addContact(g, { name: 'Lina Brun', brand: 'Potions & Co', role: 'Partenariats · Potions & Co' });
    const line = H.dmCareerLines(g, b).find((x) => x.includes('"t":"offre_talent"')) || '';
    window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'Avec plaisir, on adore Théo chez Potions & Co !' }, { t: 'offre_talent', for: 'theo.marlin', product: 'notre élixir de concentration' }] }];
    const n = A.deals.length;
    await H.sendDM(b.id, 'Tu aurais un partenariat pour Théo ? Il cartonne en ce moment.', { now: true });
    return { b: b.id, n, line };
  });
  await idle(page);
  await sleep(1800);
  const agOut = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, A = g.agency, d = A.deals.slice(-1)[0], cv = g.dms[a.b];
    const card = cv.msgs.filter((m) => m.sys === 'tdeal' && m.tdeal === (d && d.id)).length, pitches = cv.msgs.filter((m) => !m.me && !m.sys && /Je gère les partenariats/.test(m.text || '')).length;
    const asked = d ? H.askTalentDeal(g, d) : false;
    return { added: A.deals.length - a.n, brand: d && d.brand, contact: d && d.contact === a.b, product: d && d.product, fee: d && d.fee, state: d && d.state, card, pitches, asked, line: /agent de @theo\.marlin/.test(a.line) && /Potions & Co colle-t-elle à ce talent/.test(a.line) };
  }, ag);
  check('the agent asks a brand they know for a talent: its AI says yes, and the offer comes in its messages (the price from the talent’s audience), ready to pass on', agOut.added === 1 && agOut.brand === 'Potions & Co' && agOut.contact && agOut.product === 'notre élixir de concentration' && agOut.fee > 0 && agOut.card === 1 && agOut.pitches === 0 && agOut.asked && agOut.line, agOut);
  await clear(page);

  // ---------- on a phone ----------
  const { page: ph } = await newPage(browser, { width: 390, height: 844 });
  await newGame(ph);
  const strip = await G(ph, () => { const b = document.querySelector('.status-strip .fit-chip'), s = document.querySelector('.status-strip'); return { chip: !!b, w: b ? Math.round(b.getBoundingClientRect().width) : 0, over: s.scrollWidth > s.clientWidth + 1 }; });
  await ph.locator('.status-strip').screenshot({ path: path.join(OUT, 'strip-phone.png') });
  await overflowCheck(ph, 'strip (390 px)');
  await G(ph, () => window.__hype.openWatch());
  await ph.waitForSelector('.modal .fit-block');
  await shot(ph, 'phone-watch');
  await overflowCheck(ph, 'watch (390 px)');
  check('on a phone: the battery fits in the strip, the time sheet shows the energy', strip.chip && strip.w <= 80 && !strip.over, strip);

  // ---------- without __t32: as before ----------
  const { page: od } = await newPage(browser, { width: 1280, height: 900 }, false);
  await newGame(od);
  await setClock(od, 3, 0);
  const before = await G(od, async () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin'), n = window.__prompts.length, o = g.clockOff;
    await H.sendDM(c.id, 'tu dors ?');
    return { on: H.t32On(), chip: !!document.querySelector('.fit-chip'), calls: window.__prompts.slice(n).filter((p) => p.includes('CONVERSATION PRIVÉE')).length, debt: g.actDebt || 0, off: g.clockOff - o, dispo: !P_has(H.promptDM(g, c, [], 'x')) };
    function P_has(p) { return p.includes('{"t":"dispo"'); }
  });
  await idle(od);
  check('the suites written before: no battery, no time taken, an answer at once even at 3 h, no « dispo » line', !before.on && !before.chip && before.calls === 1 && before.debt === 0 && before.off === 0 && before.dispo, before);

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
