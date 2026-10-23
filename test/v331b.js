// 0.33.1, in Chromium against the built hype.html with the mocked Claude runtime: envoyer quelqu’un.
// - from a profile, « 🕵️ Envoyer quelqu’un lui parler »: the request waits in their messages, their AI says yes (what,
//   how far, when); they go off screen and tell it in their messages (someone ordinary: as they are, no clue);
// - in their own words, naming who: the psychopath; a risk by how far it goes and how far along she is; back with what
//   frightens (a clue in their name, she understood); sent again, further, at night: gone (out of the world, their
//   plans off), told hours later, a clue, the network worries; their profile and their conversation say it;
// - a no; on a phone, the choice fits; without window.__t33 (the suites written before), none of it.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v331b.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v331b');
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
async function shot(page, name) { await sleep(200); shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
const G = (page, fn, arg) => page.evaluate(fn, arg);
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.dms || b.newchar || b.groups); })) await sleep(150); await sleep(300); };
const until = async (page, fn, arg, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await G(page, fn, arg)) return true; await sleep(150); } return false; };
const clear = (page) => G(page, () => { const H = window.__hype; H.S.stack = []; H.S.modals.length = 0; H.S.toasts.length = 0; H.update(); });
async function dismiss(page) { for (let k = 0; k < 8 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }
async function overflowCheck(page, label) {
  const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth }));
  if (w.sw > w.cw + 1 || w.bw > w.cw + 1) errors.push(`[overflow] ${label}: ${JSON.stringify(w)}`);
}
async function newPage(browser, viewport, t33 = true) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 700, colorScheme: 'light' });
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript((on) => { window.__hypeEasyGear = true; window.__t32 = true; if (on) window.__t33 = true; window.__atkMs = 2500; window.__qtePre = 200; }, t33);
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
  await G(page, () => {
    const H = window.__hype, g = H.S.game;
    for (const h of ['leandre.aube', 'ada.quill', 'zara.vey', 'maelle.fen']) Object.assign(H.charByHandle(g, h), { unlocked: true, asleep: undefined, rel: 30 });
    H.update();
  });
}
// The game's clock, carried forward to the next h:m (the time really passes).
const goTo = (page, h, m = 0) => G(page, ([h, m]) => { const H = window.__hype, g = H.S.game; const d = new Date(Date.now() + (g.clockOff || 0)); const x = new Date(d.getTime()); x.setHours(h, m, 0, 0); if (x <= d) x.setDate(x.getDate() + 1); H.jumpClock(g, x - d, 'skip'); H.update(); }, [h, m]);
// The psychopath (Zara, in the suites), ready: past the first week, enough signs; and a date at her place tomorrow.
const ready = (page) => G(page, () => {
  const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey');
  Object.assign(g.psy, { at: Date.now() - 8 * 86400000, signs: 5 });
  zara.dates = 1; zara.rel = 45;
  const ev = H.addEvent(g, { by: 'zara.vey', kind: 'rdv', what: 'Soirée chez Zara, rien que nous', day: 1, at: '21:00' });
  window.__ev = ev && ev.id;
  return { ev: !!ev, stage: H.psyStage(g), psy: H.isPsy(g, zara) };
});

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);
  await goTo(page, 14, 0);
  const r0 = await ready(page);
  check('the psychopath ready (stage 3)', r0.stage === 3 && r0.psy, r0);
  await G(page, () => { const H = window.__hype, g = H.S.game; for (const e of g.events) if (e.player && e.state === 'scheduled') e.state = 'done'; Object.assign(H.charByHandle(g, 'theo.marlin'), { rel: 70, trust: 60 }); Object.assign(H.charByHandle(g, 'ada.quill'), { rel: 60, trust: 55 }); });
  const mi = (page, f) => G(page, (f) => { const H = window.__hype, g = H.S.game, c = H.charByHandle(g, f); return (g.missions || []).filter((m) => m.f === c.id).slice(-1)[0] || null; }, f);

  // ---------- from a profile: someone ordinary ----------
  await G(page, () => { const H = window.__hype, g = H.S.game; H.openLayer({ t: 'char', id: H.charByHandle(g, 'leandre.aube').id }); });
  await page.waitForSelector('text=Envoyer quelqu’un lui parler');
  await shot(page, 'profile');
  await page.locator('button', { hasText: 'Envoyer quelqu’un lui parler' }).first().click();
  await page.waitForSelector('.feat-pick');
  await shot(page, 'layer');
  await page.locator('.feat-pick', { hasText: 'Théo' }).first().click();
  await sleep(400);
  const a1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin');
    const p = H.promptDM(g, theo, [], H.S.drafts.dm[theo.id] || '');
    return { draft: H.S.drafts.dm[theo.id] || '', ask: !!theo.missionAsk, ctx: /Le joueur demande à Théo d’aller voir @leandre\.aube/.test(p), line: p.includes('"t":"mission"') && p.includes('"who":"leandre.aube"'), dm: H.S.stack.some((l) => l.t === 'dm' && l.id === theo.id), truth: /psychopathe/i.test(p.split('Le joueur demande à Théo')[1] || '') };
  });
  check('« 🕵️ Envoyer quelqu’un lui parler »: someone picked, the request waits in their messages (what to find out, in the player’s words), their AI may answer', /Tu pourrais aller parler à @leandre\.aube pour moi \? J’aimerais savoir/.test(a1.draft) && a1.ask && a1.ctx && a1.line && a1.dm && !a1.truth, a1);
  await G(page, async () => {
    const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin');
    window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'Ok, je l’invite à boire un café ce soir, je te dis.' }, { t: 'mission', who: 'leandre.aube', ok: true, plan: 'boire un café avec lui et le faire parler', risk: 1, when: 'ce soir' }] }];
    await H.sendDM(theo.id, H.S.drafts.dm[theo.id] + 'ce qu’il pense de moi', { now: true });
  });
  await idle(page);
  const a2 = await mi(page, 'theo.marlin');
  const a2n = await G(page, () => window.__hype.S.game.notifs.some((n) => /🕵️ Théo va voir Léandre pour toi/.test(n.text)));
  check('their AI says yes: the game notes it (what, how far, when), the player is told', a2 && a2.state === 'planned' && a2.risk === 1 && a2.due > Date.now() && /café/.test(a2.plan) && a2n, Object.assign({ n: a2n }, a2));
  await clear(page);
  await G(page, (due) => { const H = window.__hype, g = H.S.game; H.jumpClock(g, due - Date.now() + 60000, 'skip'); H.update(); }, a2.due);
  const a3 = await mi(page, 'theo.marlin');
  await G(page, () => { const H = window.__hype, g = H.S.game; window.__mockOnce = [{ has: 'CE QUE LE JOUEUR AVAIT DEMANDÉ', lines: [{ t: 'dm', text: 'Café avec Léandre : franchement il t’aime bien, il te trouve juste un peu speed.' }, { t: 'dm', text: 'Il m’a parlé de son concours, il stresse à mort.' }] }]; H.jumpClock(g, 30 * 60000, 'skip'); H.update(); });
  await until(page, () => { const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin'); return (g.missions || []).some((m) => m.f === theo.id && m.told); }, null, 15000);
  await sleep(9000);
  const a4 = await G(page, () => {
    const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin'), lea = H.charByHandle(g, 'leandre.aube'), m = g.missions.find((x) => x.f === theo.id), P = window.__prompts.filter((p) => p.includes('CE QUE LE JOUEUR AVAIT DEMANDÉ')).slice(-1)[0] || '';
    return { state: m.state, p: m.p, detail: m.detail, dm: ((g.dms[theo.id] || {}).msgs || []).filter((x) => !x.me && /Léandre|concours/.test(x.text)).length, ordinary: /n’a rien de dangereux/.test(P) && !/psychopathe/.test(P), memL: (lea.mem || []).some((x) => /m’a posé pas mal de questions sur le joueur/.test(x.t)), memT: (theo.mem || []).some((x) => /je suis allé voir @leandre\.aube pour le joueur/.test(x.t)), clue: (g.clues || []).some((k) => k.c === lea.id) };
  });
  check('they went (off screen), came back, and tell it in their messages, as the one they saw is (nothing dangerous, no clue); both remember', a3.state === 'back' && a4.p === 0 && !a4.detail && a4.dm === 2 && a4.ordinary && a4.memL && a4.memT && !a4.clue, Object.assign({ st3: a3.state }, a4));
  await clear(page);

  // ---------- in their own words: the psychopath ----------
  const b1 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, ada = H.charByHandle(g, 'ada.quill');
    const plain = H.promptDM(g, ada, [], 'tu fais quoi ce soir ?');
    const p = H.promptDM(g, ada, [], 'tu pourrais aller voir Zara et fouiller un peu chez elle ? elle me fait flipper');
    window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'Ok… je passe chez elle ce soir, je jette un œil.' }, { t: 'mission', who: 'zara.vey', ok: true, plan: 'passer chez elle et jeter un œil', risk: 2, when: 'ce soir' }] }];
    await H.sendDM(ada.id, 'tu pourrais aller voir Zara et fouiller un peu chez elle ? elle me fait flipper', { now: true });
    return { plain: !plain.includes('"t":"mission"'), line: p.includes('"t":"mission"') && p.includes('"who":"zara.vey"'), secret: /SECRET DU JEU/.test(p.split('Le joueur demande à Ada')[1] || '') };
  });
  await idle(page);
  const b2 = await mi(page, 'ada.quill');
  check('asked in their own words, naming who: the line comes only then (not for any message), and never the secret', b1.plain && b1.line && !b1.secret && b2 && b2.state === 'planned' && b2.risk === 2, Object.assign({}, b1, b2));
  await G(page, (due) => { const H = window.__hype, g = H.S.game; window.__missionRolls = [0.99]; H.jumpClock(g, due - Date.now() + 60000, 'skip'); H.update(); }, b2.due);
  await G(page, () => { const H = window.__hype, g = H.S.game; window.__mockOnce = [{ has: 'CE QUE LE JOUEUR AVAIT DEMANDÉ', lines: [{ t: 'dm', text: 'J’ai vu un truc chez Zara. Je sais pas quoi en penser.' }, { t: 'dm', text: 'Il faut qu’on parle. Sérieux.' }] }]; H.jumpClock(g, 30 * 60000, 'skip'); H.update(); });
  await until(page, () => { const H = window.__hype, g = H.S.game, ada = H.charByHandle(g, 'ada.quill'); return (g.missions || []).some((m) => m.f === ada.id && m.told); }, null, 15000);
  await sleep(9000);
  const b3 = await G(page, () => {
    const H = window.__hype, g = H.S.game, ada = H.charByHandle(g, 'ada.quill'), zara = H.charByHandle(g, 'zara.vey'), m = g.missions.filter((x) => x.f === ada.id).slice(-1)[0], P = window.__prompts.filter((p) => p.includes('CE QUE LE JOUEUR AVAIT DEMANDÉ')).slice(-1)[0] || '';
    return { state: m.state, p: m.p, detail: m.detail, secret: /SECRET DU JEU \(Ada ne le sait pas/.test(P) && P.includes(m.detail), clue: ((g.clues || []).filter((k) => k.c === zara.id && k.psy && /^Ada a remarqué chez Zara : /.test(k.text)).slice(-1)[0] || {}).text || '', memZ: (zara.mem || []).some((x) => /je l’ai compris/.test(x.t)), memA: (ada.mem || []).some((x) => /^chez @zara\.vey, j’ai vu .+ : ça m’a glacée$/.test(x.t)) };
  });
  check('the psychopath: a risk (by how far it goes, how far along she is); back, with what frightens (the AI tells it, never the word), a clue in their name; she understood', b3.state === 'back' && b3.p > 0.2 && b3.detail && b3.secret && b3.clue.length > 20 && b3.memZ && b3.memA, b3);
  await clear(page);

  // ---------- sent again, too far: gone ----------
  const c1 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, ada = H.charByHandle(g, 'ada.quill');
    ada.dates = 1;
    const ev = H.addEvent(g, { by: 'ada.quill', kind: 'rdv', what: 'Ciné avec Ada', day: 3, at: '20:00' });
    window.__evA = ev && ev.id;
    window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'Ok. J’y retourne cette nuit, je vais fouiller son appart.' }, { t: 'mission', who: 'zara.vey', ok: true, plan: 'entrer chez elle cette nuit et fouiller', risk: 3, when: 'ce soir' }] }];
    await H.sendDM(ada.id, 'tu peux y retourner et fouiller son appart à fond ?', { now: true });
    return { ev: !!ev };
  });
  await idle(page);
  const c2 = await mi(page, 'ada.quill');
  await G(page, (due) => { const H = window.__hype, g = H.S.game; window.__missionRolls = [0.0]; H.jumpClock(g, due - Date.now() + 60000, 'skip'); H.update(); }, c2.due);
  const c3 = await G(page, () => { const H = window.__hype, g = H.S.game, ada = H.charByHandle(g, 'ada.quill'), m = g.missions.filter((x) => x.f === ada.id).slice(-1)[0], ev = g.events.find((e) => e.id === window.__evA); return { state: m.state, p: m.p, gone: !!ada.gone, jailed: !!ada.jailed, told: !!m.told, ev: ev && ev.state, notif: g.notifs.some((n) => /🕯️ Ada ne répond plus/.test(n.text)) }; });
  check('sent again, further, at night: far more dangerous; she never comes back (out of the world: her plans with the player off), not told at once', c2 && c2.risk === 3 && c3.state === 'gone' && c3.p >= 0.6 && c3.gone && c3.jailed && !c3.told && c3.ev === 'cancelled' && !c3.notif, Object.assign({}, c2, c3));
  await G(page, () => { const H = window.__hype, g = H.S.game; H.jumpClock(g, 7 * 3600000, 'skip'); H.update(); });
  await sleep(600);
  const c4 = await G(page, () => {
    const H = window.__hype, g = H.S.game, ada = H.charByHandle(g, 'ada.quill'), zara = H.charByHandle(g, 'zara.vey');
    const p = H.promptDM(g, H.charByHandle(g, 'theo.marlin'), [], 'salut');
    return { notif: (g.notifs.find((n) => /🕯️ Ada ne répond plus depuis sa visite chez Zara/.test(n.text)) || {}).text || '', clue: (g.clues || []).some((k) => k.c === zara.id && /Ada devait aller voir Zara pour toi : depuis, plus personne n’a de nouvelles/.test(k.text)), trig: (g.triggers || []).some((x) => /@ada\.quill a disparu/.test(x.text)), roster: /@ada\.quill \(Ada Quill[^)]*porté·e disparu·e/.test(p) || /PORTÉ·E DISPARU·E/.test(p), memZ: (zara.mem || []).some((x) => /Personne ne la reverra/.test(x.t)) };
  });
  check('hours later: she no longer answers (« depuis sa visite chez Zara »), noted as a clue, the network worries, everyone’s prompts know her gone, Zara never speaks of it', /Personne ne l’a revue/.test(c4.notif) && c4.clue && c4.trig && c4.roster && c4.memZ, c4);
  await G(page, () => { const H = window.__hype, g = H.S.game; H.S.stack = []; H.openLayer({ t: 'char', id: H.charByHandle(g, 'ada.quill').id }); });
  await page.waitForSelector('.prof');
  const c5 = await G(page, () => ({ chip: /🕯️ Portée disparue/.test(document.querySelector('.prof').textContent), send: !/Envoyer quelqu’un lui parler/.test(document.querySelector('.prof').textContent) }));
  await shot(page, 'gone-profile');
  const n0 = await G(page, () => window.__prompts.length);
  await G(page, async () => { const H = window.__hype, g = H.S.game, ada = H.charByHandle(g, 'ada.quill'); H.S.stack = []; H.openDM(ada.id); await H.sendDM(ada.id, 'Ada ?? réponds-moi stp', { now: true }); });
  await sleep(1500);
  const c6 = await G(page, (n0) => { const H = window.__hype, g = H.S.game, ada = H.charByHandle(g, 'ada.quill'), msgs = (g.dms[ada.id] || {}).msgs || []; return { mine: msgs.slice(-1)[0].me === true && /réponds-moi/.test(msgs.slice(-1)[0].text), calls: window.__prompts.length - n0, hint: /Ada ne répond plus\. Personne ne l’a revue depuis sa visite chez Zara/.test(document.body.textContent) }; }, n0);
  await shot(page, 'gone-dm');
  check('her profile says it (« Portée disparue », no one to send); written to, no one answers (no call), the conversation says why', c5.chip && c5.send && c6.mine && c6.calls === 0 && c6.hint, Object.assign({}, c5, c6));
  await clear(page);

  // ---------- a no ----------
  await G(page, async () => {
    const H = window.__hype, g = H.S.game, lea = H.charByHandle(g, 'leandre.aube');
    window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'Espionner Théo ? Non, désolé, c’est mon pote.' }, { t: 'mission', who: 'theo.marlin', ok: false }] }];
    await H.sendDM(lea.id, 'tu pourrais espionner Théo pour moi ?', { now: true });
  });
  await idle(page);
  const d1 = await G(page, () => { const H = window.__hype, g = H.S.game, lea = H.charByHandle(g, 'leandre.aube'); return { none: !(g.missions || []).some((m) => m.f === lea.id), notif: g.notifs.some((n) => /Léandre n’ira pas voir Théo pour toi/.test(n.text)) }; });
  check('their AI may say no: nothing planned, the player is told', d1.none && d1.notif, d1);

  // ---------- on a phone: the layer fits ----------
  const { page: ph } = await newPage(browser, { width: 390, height: 844 });
  await newGame(ph);
  await G(ph, () => { const H = window.__hype, g = H.S.game; H.openLayer({ t: 'mission', id: H.charByHandle(g, 'zara.vey').id }); });
  await ph.waitForSelector('.feat-pick');
  await shot(ph, 'phone-layer');
  await overflowCheck(ph, 'mission layer (390 px)');
  const pw = await G(ph, () => [...document.querySelectorAll('.feat-pick')].map((b) => Math.round(b.getBoundingClientRect().right)).every((r) => r <= window.innerWidth));
  check('on a phone, the choice fits', pw, pw);

  // ---------- without __t33: as before ----------
  const { page: od } = await newPage(browser, { width: 1280, height: 900 }, false);
  await newGame(od);
  const before = await G(od, () => {
    const H = window.__hype, g = H.S.game, ada = H.charByHandle(g, 'ada.quill');
    const p = H.promptDM(g, ada, [], 'tu pourrais aller voir Zara pour moi ?');
    H.openLayer({ t: 'char', id: H.charByHandle(g, 'zara.vey').id });
    return { line: p.includes('"t":"mission"') };
  });
  await sleep(600);
  const noBtn = await G(od, () => !!document.querySelector('.prof') && ![...document.querySelectorAll('button')].some((b) => /Envoyer quelqu’un lui parler/.test(b.textContent)));
  check('the suites written before: no « Envoyer quelqu’un », no line', !before.line && noBtn, Object.assign({ noBtn }, before));

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
