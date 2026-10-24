// 0.33.5, in Chromium against the built hype.html with the mocked Claude runtime: découverte, elle entre chez toi.
// - once got away from, the psychopath is « 🔪 Psychopathe » in red wherever the relation shows (the side list, the
//   relations, the profile, the conversation), no more « pote » nor their vibe; the AI's roster says it too;
// - the player out (a night at someone's): a refresh may offer « cambrioler » with what is at the player's; she goes in:
//   nothing seen until the player is back; then the door ajar, what is missing (the gear insured: replaced for the
//   franchise; not insured: gone; a gift taken), noted as a proof, the police to call (the file knows);
// - after an evening out, their AI is asked once what they did meanwhile (a break-in found at once, back home);
// - someone close, where she knows: they find it on their return and tell the player, not knowing who;
// - a life saved together: +20 trust whatever the heart (+10 each time after); she saw them leave: the witness's home;
// - furious, those in the know (seen, or told in private); no complaint: something at least every twelve hours (her
//   AI's choice); the second week she comes in (at night at the player's, by day at the place of the one they stay
//   with: a fight, two of them); past two weeks she may silence someone who knows; a complaint filed: she holds back;
// - an evening being played away from home: out: nobody at the door, no attack at home, a note waits for the return;
// - together in sync: the one who is there has it all in mind; the time told passes; leaving leaves the player there;
// - without __t334, none of it.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v335.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v335');
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
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.dms || b.newchar || b.groups || b.police || b.care || b.hunt || b.night || b.mission); })) await sleep(150); await sleep(300); };
const until = async (page, fn, arg, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await G(page, fn, arg)) return true; await sleep(150); } return false; };
const clear = (page) => G(page, () => { const H = window.__hype; H.S.stack = []; H.S.modals.length = 0; H.S.toasts.length = 0; H.update(); });
async function dismiss(page) { for (let k = 0; k < 8 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }
async function overflowCheck(page, label) {
  const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth }));
  if (w.sw > w.cw + 1 || w.bw > w.cw + 1) errors.push(`[overflow] ${label}: ${JSON.stringify(w)}`);
}
async function newPage(browser, viewport, on = true) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 700, colorScheme: 'light' });
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript((x) => { window.__hypeEasyGear = true; window.__t32 = true; window.__t33 = true; if (x) window.__t334 = true; window.__atkMs = 2500; }, on);
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
const hourNow = (page) => G(page, () => { const d = window.__hype.gameDate(Date.now()); return d.getHours() + d.getMinutes() / 60; });
// An attack at her place, fought off with someone who came along (every beat right, the friend helping).
const fightOff = (page, who) => G(page, (who) => {
  const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), f = who ? H.charByHandle(g, who) : null;
  const ev = H.addEvent(g, { by: 'zara.vey', kind: 'rdv', what: 'Soirée chez Zara, rien que nous', in: 5 });
  if (f) ev.plus = { c: f.id, ok: true, at: Date.now() };
  ev.talk = { scene: 'Les bougies, la musique trop forte.', lines: [], turn: 3, max: 6, reacts: [], used: [], at: Date.now() };
  ev.psy = 'deadly';
  window.__atkQ = [];
  H.startAttack(g, ev.talk, zara, 'Zara ferme la porte à clé.', { ev, f, where: 'date' });
  const A = ev.talk.attack;
  for (const B of A.steps) if (B.k === 'c') Object.assign(B, { pick: B.opts[0].id, v: 1, help: !!f });
  H.attackEnd(g, ev.talk);
  window.__evA = ev.id;
  return { ok: A.ok, done: A.done, fled: !!ev.fled };
}, who);

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);
  await goTo(page, 14, 0);
  const r0 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), theo = H.charByHandle(g, 'theo.marlin');
    Object.assign(g.psy, { at: Date.now() - 8 * 86400000, signs: 5 });
    Object.assign(zara, { dates: 3, rel: 60 });
    Object.assign(theo, { rel: 75, trust: 70, coeur: 'inaccessible' }); // (0.33.5: a heart slow to trust: +20 all the same)
    const it = (t) => ({ t, at: Date.now(), sp: '', broken: 0, fixAt: 0, crack: 0, hot: 0, virus: 0 });
    Object.assign(g.gear.items, { pc: it(2), cam: it(1), light: it(1) });
    const gift = H.invAdd(g, { kind: 'gift', name: 'Sweat brodé', emoji: '🎁', value: 60, from: { how: 'cadeau', c: theo.id } });
    window.__gift = gift.id;
    H.update();
    return { stage: H.psyStage(g), shown: H.psyShown(zara), rel: H.relShown(zara) };
  });
  await sleep(400);
  const side0 = await G(page, () => [...document.querySelectorAll('.mini-char')].map((b) => b.textContent).find((t) => /Zara/.test(t)) || '');
  check('before: Zara as the relation says it (no tag)', r0.stage === 3 && !r0.shown && !/Psychopathe/.test(r0.rel) && !/Psychopathe/.test(side0), Object.assign({ side0 }, r0));

  // ---------- discovered ----------
  await fightOff(page, 'theo.marlin');
  await sleep(500);
  await dismiss(page);
  await clear(page);
  const k1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), ada = H.charByHandle(g, 'ada.quill');
    const p = H.promptDM(g, ada, [], 'salut');
    const theo = H.charByHandle(g, 'theo.marlin');
    return { known: !!zara.psyKnown, rel: H.relShown(zara), roster: /@zara\.vey[ :(]+le psychopathe de cette partie, démasqué par le joueur/.test(p), trust: theo.trust, home: H.homeOfHow(g, zara, theo) };
  });
  await sleep(300);
  const side1 = await G(page, () => { const b = [...document.querySelectorAll('.mini-char')].find((x) => /Zara/.test(x.textContent)); return { text: b ? b.textContent : '', red: !!(b && b.querySelector('.psy-tag')) }; });
  await G(page, () => { const H = window.__hype, g = H.S.game; H.openChar(H.charByHandle(g, 'zara.vey').id); });
  await page.waitForSelector('.prof-stats', { timeout: 10000 });
  await shot(page, 'profile-psychopath');
  const prof = await G(page, () => { const L = [...document.querySelectorAll('.layer')].pop(); const t = L.textContent; return { chip: [...L.querySelectorAll('.chip.bad')].some((x) => /Psychopathe/.test(x.textContent)), rel: /Relation : 🔪 Psychopathe/.test(t), meter: !!L.querySelector('.prof .rel-meter, .prof .relmeter'), ex: /💔 Ex/.test(t), pote: /Pote/.test(L.querySelector('.prof-stats').textContent) }; });
  await clear(page);
  await G(page, () => { const H = window.__hype, g = H.S.game; H.openDM(H.charByHandle(g, 'zara.vey').id); });
  await sleep(600);
  const dmh = await G(page, () => { const L = [...document.querySelectorAll('.layer')].pop(); const w = L && L.querySelector('.who'); return { red: !!(w && w.querySelector('.psy-tag')), text: w ? w.textContent : '' }; });
  await clear(page);
  check('a life saved together: Théo’s trust +20, whatever his heart (slow to trust); she saw them leave: she knows where he lives', k1.trust === 90 && /vus repartir ensemble/.test(k1.home || ''), { trust: k1.trust, home: k1.home });
  check('discovered: « 🔪 Psychopathe » in red in the side list, the profile (chip, relation, no meter, no « Ex »), the conversation; the AI roster says it', k1.known && /Psychopathe/.test(k1.rel) && k1.roster && side1.red && !/Pote|Ex/.test(side1.text) && prof.chip && prof.rel && !prof.ex && !prof.pote && dmh.red && !/confiance/.test(dmh.text), Object.assign({ side: side1.text, dm: dmh.text }, k1, prof));

  // ---------- out: a break-in waits for the player ----------
  const b0 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), theo = H.charByHandle(g, 'theo.marlin');
    H.psySign(g, zara, 'une photo de toi prise de nuit, à travers ta fenêtre', Date.now(), true);
    const home = H.playerOut(g);
    g.stay = { c: theo.id, ev: null, where: 'c', at: Date.now(), until: Date.now() + 5 * 3600000 };
    window.__huntOffer = true;
    g.psy.hunt.act = 0;
    const line = H.rodeLine(g, zara) || '';
    g.gear.subs.assur = { on: true, since: Date.now(), cut: 0, installAt: 0 };
    const cash0 = g.career.cash;
    const B = H.rodeDo(g, zara, { quoi: 'cambrioler', prend: ['pc', window.__gift], text: 'Ta porte est entrouverte. Les tiroirs vidés par terre, ton lit défait, et sur ton oreiller, une photo de vous deux.' });
    window.__cash0 = cash0;
    return { home, out: H.playerOut(g), offer: /"cambrioler"/.test(line) && /"pc"/.test(line) && line.includes(window.__gift) && /Sweat brodé \(offert par Théo\)/.test(line), wait: !!(B && B.wait), take: B && B.take, modal: H.S.modals.some((m) => m.t === 'cambriole'), pc: !!g.gear.items.pc, gift: !!H.invItem(g, window.__gift) };
  });
  check('the player out (a night at Théo’s): « cambrioler » offered with what is at the player’s; she goes in: nothing seen yet, nothing gone yet', !b0.home && b0.out && b0.offer && b0.wait && b0.take.length === 2 && !b0.modal && b0.pc && b0.gift, b0);
  await G(page, () => { const H = window.__hype, g = H.S.game; g.stay.end = Date.now(); H.update(); });
  await page.waitForSelector('.break-card', { timeout: 10000 }).catch(() => {});
  await shot(page, 'back-home-break-in');
  const b1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), card = document.querySelector('.break-card');
    return { card: !!card, text: card ? card.textContent : '', pc: !!g.gear.items.pc, paid: window.__cash0 - g.career.cash, gift: !!H.invItem(g, window.__gift), clue: (g.clues || []).some((k) => k.c === zara.id && /quelqu’un est entré chez toi/.test(k.text)) };
  });
  check('back home: the door ajar, what is missing (the computer insured: replaced for the franchise; the gift taken), noted as a proof', b1.card && /oreiller/.test(b1.text) && /Il manque/.test(b1.text) && /Sweat brodé/.test(b1.text) && /franchise/.test(b1.text) && b1.pc && b1.paid > 0 && !b1.gift && b1.clue, Object.assign({}, b1, { text: b1.text.slice(0, 160) }));
  await page.locator('.break-card .btn-ink', { hasText: 'Appeler la police' }).click();
  await sleep(300);
  const b2 = await G(page, () => { const H = window.__hype, g = H.S.game, K = H.caseOf(g, H.charByHandle(g, 'zara.vey')); return { night: K.night, log: K.log.some((x) => /cambriolé en ton absence/.test(x.text)), card: (document.querySelector('.break-card') || {}).textContent || '' }; });
  check('« Appeler la police »: they come and note it (the file knows)', b2.night >= 1 && b2.log && /La police est passée constater/.test(b2.card), b2);
  await dismiss(page);
  await clear(page);

  // ---------- not insured ----------
  const n1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey');
    g.gear.subs.assur.on = false;
    const B = H.huntBreak(g, zara, { prend: ['caméra'] }, 'Tout est à sa place. Sauf ta caméra.');
    return { found: !!(B && B.found), take: B && B.take, cam: g.gear.items.cam, lost: B && B.lost };
  });
  check('home already (the outing just ended): found at once; not insured, the camera is gone (named in her words)', n1.found && n1.take.join() === 'cam' && n1.cam === null && n1.lost.length === 1, n1);
  await dismiss(page);
  await clear(page);

  // ---------- after an evening out, her AI is asked ----------
  const a0 = await G(page, () => {
    const H = window.__hype, g = H.S.game, ada = H.charByHandle(g, 'ada.quill');
    const ev = { id: 'evAway1', c: ada.id, what: 'Un verre au Café des Lumières', due: Date.now() - 3 * 3600000, startAt: Date.now() - 3 * 3600000 }; // (the evening that just ended)
    window.__mockOnce = [{ has: 'TÂCHE : PENDANT QUE LE JOUEUR N’EST PAS CHEZ LUI', lines: [{ t: 'rode', quoi: 'cambrioler', prend: ['lumière'], text: 'Tes rideaux sont tirés. Sur le miroir de la salle de bain, écrit au rouge à lèvres : « tu rentres tard ».' }] }];
    window.__evA2 = ev.id;
    H.awayAfter(g, ev, 'il est sorti (« Un verre au Café des Lumières », avec @ada.quill)');
    return { home: H.datePlayerHome(g, ev), homes: [H.datePlayerHome(g, { what: 'Soirée chez Mila' }), H.datePlayerHome(g, { what: 'Film chez toi, plaid et pizza' }), H.datePlayerHome(g, { what: 'Dîner chez Zara' })] };
  });
  await page.waitForSelector('.break-card', { timeout: 15000 }).catch(() => {});
  const a1 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const p = window.__prompts.filter((x) => x.includes('TÂCHE : PENDANT QUE LE JOUEUR N’EST PAS CHEZ LUI')).pop() || '';
    const again = H.huntNow(g) && g.psy.hunt.away === 'ev:' + window.__evA2; // (asked once: the next time, refused at once)
    return { modals: H.S.modals.map((m) => m.t + ':' + Math.round((m.at - Date.now()) / 1000)), breaks: (g.psy.hunt.breaks || []).map((b) => [!!b.wait, !!b.found]), card: (document.querySelector('.break-card') || {}).textContent || '', light: g.gear.items.light, prompt: /Café des Lumières/.test(p) && /"light"/.test(p) && /sa mentalité/.test(p), asked: window.__prompts.filter((x) => x.includes('TÂCHE : PENDANT QUE LE JOUEUR N’EST PAS CHEZ LUI')).length, again: !!again };
  });
  check('after an evening out (not at the player’s), her AI is asked once what she did: a break-in found right away, back home', !a0.home && a0.homes.join() === 'true,true,false' && /rouge à lèvres/.test(a1.card) && a1.light === null && a1.prompt && a1.asked === 1 && a1.again, Object.assign({}, a0, a1, { card: a1.card.slice(0, 120) }));
  await dismiss(page);
  await clear(page);

  // ---------- someone close ----------
  const f0 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), ada = H.charByHandle(g, 'ada.quill'), theo = H.charByHandle(g, 'theo.marlin');
    const no = H.rodeDo(g, zara, { quoi: 'cambrioler', who: 'ada.quill', text: 'tout retourné' });
    H.learnHome(g, zara, theo, 'a suivi Théo jusqu’à chez lui');
    window.__mockOnce = [{ has: 'THÉO ÉCRIT AU JOUEUR', lines: [{ t: 'dm', text: 'Quelqu’un est entré chez moi cette nuit. Rien de volé. Juste tout retourné.' }] }];
    const r = H.rodeDo(g, zara, { quoi: 'cambrioler', who: 'theo.marlin', text: 'ses tiroirs vidés, une photo du joueur scotchée sur son miroir' });
    const Y = (g.psy.hunt.tell || []).find((y) => y.x === theo.id && !y.done);
    if (Y) Y.due = Date.now() - 1;
    return { no: !!no, r: !!r, how: Y && Y.how, mem: (theo.mem || []).some((m) => m.keep && /appart retourné/.test(m.t)) };
  });
  await until(page, () => { const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin'); return ((g.dms[theo.id] || {}).msgs || []).some((m) => /entré chez moi/.test(m.text || '')); }, null, 15000);
  const f1 = await G(page, () => { const p = window.__prompts.filter((x) => x.includes('THÉO ÉCRIT AU JOUEUR')).pop() || ''; return { found: /en rentrant chez lui, il a trouvé son appartement retourné/.test(p), unsure: /ne le sait pas forcément/.test(p) }; });
  check('someone close, only where she knows: Théo finds his place turned over on his return and tells the player (his AI, not sure who); Ada’s, unknown: nothing', !f0.no && f0.r && f0.how === 'break' && f0.mem && f1.found && f1.unsure, Object.assign({}, f0, f1));

  // ---------- furious, the pressure, week after week ----------
  await dismiss(page);
  await clear(page);
  const p0 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), ada = H.charByHandle(g, 'ada.quill');
    const told = H.toldAbout(g, ada, 'Zara a essayé de me tuer avec un couteau, je te jure');
    const dm = H.promptDM(g, zara, [], 'arrête');
    const Hh = g.psy.hunt;
    Hh.at = Date.now() - 3 * 86400000; const lv1 = H.huntLevel(g, zara), kl1 = H.killLines(g, zara).length;
    Hh.at = Date.now() - 8 * 86400000; const lv2 = H.huntLevel(g, zara), dm2 = H.promptDM(g, zara, [], 'arrête');
    Hh.at = Date.now() - 15 * 86400000; const lv3 = H.huntLevel(g, zara), kl = H.killLines(g, zara).join(' ');
    Hh.at = Date.now() - 3 * 86400000;
    return { told, know: H.inKnow(g, zara).map((x) => x.handle).sort().join(), fury: /FURIEUX·SE/.test(dm) && /chaque jour sans police/.test(dm), bold: /s’enhardit, et peut s’en prendre à eux pour de vrai/.test(dm2), lv1, lv2, lv3, kl1, kill: /"tuer"/.test(kl) && /@ada\.quill/.test(kl) && /@theo\.marlin/.test(kl) };
  });
  check('furious, and those in the know: what Ada was told counts; week after week (1, 2, 3), past two weeks she may silence one of them', p0.told && p0.know === 'ada.quill,theo.marlin' && p0.fury && p0.bold && p0.lv1 === 1 && p0.lv2 === 2 && p0.lv3 === 3 && p0.kl1 === 0 && p0.kill, p0);
  await G(page, () => { const H = window.__hype, g = H.S.game; Object.assign(g.psy.hunt, { act: 0, pressAt: 0 }); window.__mockOnce = [{ has: 'TÂCHE : CE QUE FAIT @zara.vey MAINTENANT', lines: [{ t: 'rode', quoi: 'mot', text: 'Je vois ta lumière. Éteins-la.' }] }]; });
  await until(page, () => !!document.querySelector('.mot-card'), null, 15000);
  const p1 = await G(page, () => { const p = window.__prompts.filter((x) => x.includes('TÂCHE : CE QUE FAIT @zara.vey MAINTENANT')).pop() || ''; return { asked: !!p, noRien: !p.includes('"quoi":"rien"'), act: /cette fois, elle agit/.test(p), note: /Éteins-la/.test((document.querySelector('.mot-card') || {}).textContent || '') }; });
  check('no complaint, nothing for twelve hours: her AI is asked what she does now (something, this time): a note', p1.asked && p1.noRien && p1.act && p1.note, p1);
  await dismiss(page);
  await clear(page);
  // the second week: she comes in at night (her AI's choice), the player defends themselves
  await goTo(page, 23, 30);
  await G(page, () => { const H = window.__hype, g = H.S.game; Object.assign(g.psy.hunt, { at: Date.now() - 8 * 86400000, act: Date.now(), pressAt: Date.now() }); window.__atkQ = []; window.__mockOnce = [{ has: 'TÂCHE : LA NUIT DE @zara.vey', lines: [{ t: 'rode', quoi: 'attaquer', h: '3:40', text: 'Zara est assise au bord de ton lit.' }] }]; });
  await G(page, () => window.__hype.goSleep());
  await idle(page);
  await page.waitForSelector('.visit-card .atk', { timeout: 15000 }).catch(() => {});
  await shot(page, 'night-attack-at-home');
  const n2 = await G(page, () => {
    const H = window.__hype, g = H.S.game, v = H.liveVisit(g), d = H.gameDate(Date.now()), K = H.caseOf(g, H.charByHandle(g, 'zara.vey'));
    const card = (document.querySelector('.visit-card') || {}).textContent || '', n0 = K.night;
    if (v && v.attack) { for (const B of v.attack.steps) if (B.k === 'c') Object.assign(B, { pick: B.opts[0].id, v: 1.3, help: false }); H.attackEnd(g, v); }
    const fled = !!(v && v.fled), ok = !!(v && v.attack && v.attack.ok);
    if (v) H.endVisit(g, v);
    H.S.modals.length = 0; H.update();
    return { inside: v && v.inside, where: v && v.attack && v.attack.where, h: d.getHours() + d.getMinutes() / 60, entered: /est entrée/.test(card), bed: /au bord du lit/.test(card), ok, fled, night: K.night - n0, over: !!g.over };
  });
  check('the second week, no complaint: she comes in while the player sleeps (3 h 40), the fight plays at home; fought off, she is put out, the police note it', n2.inside && n2.where === 'home' && Math.abs(n2.h - (3 + 40 / 60)) < 0.05 && n2.entered && n2.ok && n2.fled && n2.night === 1 && !n2.over, n2);
  await clear(page);
  // at Théo's, with him: she forces the door in the day; together, stronger, closer
  await goTo(page, 10, 0);
  const i0 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), theo = H.charByHandle(g, 'theo.marlin');
    g.stay = { c: theo.id, ev: null, where: 'c', at: Date.now(), until: Date.now() + 5 * 3600000 };
    Object.assign(theo, { trust: 60, rel: 70 });
    window.__atkQ = [];
    const v = H.rodeDo(g, zara, { quoi: 'attaquer', text: 'La porte d’entrée cède d’un coup.' });
    if (!v) return { v: false };
    const A = v.attack;
    for (const B of A.steps) if (B.k === 'c') Object.assign(B, { pick: B.opts[0].id, v: 1, help: true });
    H.attackEnd(g, v);
    const out = { v: true, place: v.place === theo.id, f: A.f === theo.id, where: A.where, ok: A.ok, trust: theo.trust, rel: theo.rel, n: theo.saw.n, line: v.lines.map((x) => x.text).join(' | ') };
    H.endVisit(g, v);
    g.stay.end = Date.now();
    H.S.modals.length = 0; H.update();
    return out;
  });
  check('at Théo’s, with him: she forces the door in the day; they fight her off together (his trust +10, closer), «  Chez Théo »', i0.v && i0.place && i0.f && i0.where === 'inside' && i0.ok && i0.trust === 70 && i0.rel > 70 && i0.n === 2 && /Théo et toi la repoussez dehors/.test(i0.line), i0);
  // past two weeks: someone who knew, silenced; found out hours later
  const k0 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), ada = H.charByHandle(g, 'ada.quill');
    g.psy.hunt.at = Date.now() - 15 * 86400000;
    Object.assign(g.psy.hunt, { act: Date.now(), pressAt: Date.now() });
    const r = H.rodeDo(g, zara, { quoi: 'tuer', who: 'ada.quill', text: 'Ada n’est jamais rentrée de sa répétition.' });
    return { r: !!r, gone: !!ada.gone, jailed: !!ada.jailed, more0: H.caseOf(g, zara).more };
  });
  await G(page, () => { const H = window.__hype, g = H.S.game; Object.assign(g.psy.hunt, { act: Date.now() + 9 * 3600000, pressAt: Date.now() + 9 * 3600000 }); H.jumpClock(g, 7 * 3600000, 'skip'); H.update(); });
  await until(page, () => window.__hype.S.game.notifs.some((n) => /🕯️ Ada ne répond plus/.test(n.text)), null, 10000);
  const k1b = await G(page, () => { const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'); return { notif: g.notifs.some((n) => /🕯️ Ada ne répond plus/.test(n.text)), clue: (g.clues || []).some((k) => k.c === zara.id && /Ada savait/.test(k.text)), more: H.caseOf(g, zara).more }; });
  check('past two weeks without a complaint: she silences Ada, who knew (gone); hours later, nobody has seen her (noted, the file knows)', k0.r && k0.gone && k0.jailed && k1b.notif && k1b.clue && k1b.more === k0.more0 + 2, Object.assign({}, k0, k1b));
  // an evening being played, at a café: the player is out: nobody at the door, no attack at home, a note waits for the
  // return; back home, no break-in « now » (only while out)
  const e0 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), theo = H.charByHandle(g, 'theo.marlin');
    H.S.modals.length = 0;
    const ev = { id: 'evLive', kind: 'rdv', c: theo.id, what: 'Un verre au Café des Lumières', at: Date.now() - 30 * 60000, due: Date.now() - 30 * 60000, state: 'scheduled', player: true, talk: { scene: 'Le café.', lines: [], turn: 1, max: 6, reacts: [], used: [] } };
    g.events.push(ev);
    const out = H.playerOut(g), live = H.dateLive(g), knock = H.huntKnock(g, zara, 'Ouvre.'), atk = H.huntAttack(g, zara, 'La porte cède.');
    const n = H.huntNote(g, zara, 'Je sais où tu es ce soir.');
    ev.state = 'done'; // (the evening is over: back home)
    const brk = H.rodeDo(g, zara, { quoi: 'cambrioler', text: 'tout retourné' });
    return { out, live, knock: !!knock, atk: !!atk, wait: !!(n && n.wait), modal: H.S.modals.some((m) => m.t === 'mot' || m.t === 'visit'), brk: !!brk, back: !H.playerOut(g) };
  });
  await until(page, () => !!document.querySelector('.mot-card'), null, 10000);
  const e1 = await G(page, () => /Je sais où tu es ce soir/.test((document.querySelector('.mot-card') || {}).textContent || ''));
  check('an evening being played at a café: out: no knock, no attack at home, the note waits; back home, found; no break-in « now » with the player home', e0.out && e0.live && !e0.knock && !e0.atk && e0.wait && !e0.modal && !e0.brk && e0.back && e1, Object.assign({ e1 }, e0));
  await dismiss(page);
  await clear(page);
  // a complaint filed: watched, she holds back
  const w0 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), K = H.caseOf(g, zara);
    K.state = 'enquete'; K.due = Date.now() + 86400000;
    Object.assign(g.psy.hunt, { act: 0, pressAt: 0 });
    const n0 = window.__prompts.filter((x) => x.includes('TÂCHE : CE QUE FAIT @zara.vey MAINTENANT')).length;
    const a = H.rodeDo(g, zara, { quoi: 'attaquer', text: 'x' });
    const dm = H.promptDM(g, zara, [], 'arrête');
    return { lv: H.huntLevel(g, zara), a: !!a, kill: H.killLines(g, zara).length, watched: /la police a l’œil sur elle : elle se retient/.test(dm), n0 };
  });
  await sleep(4500);
  const w1 = await G(page, () => window.__prompts.filter((x) => x.includes('TÂCHE : CE QUE FAIT @zara.vey MAINTENANT')).length);
  check('a complaint filed: the police watch her: no attack, no killing, no pressure call; she holds back', w0.lv === 1 && !w0.a && w0.kill === 0 && w0.watched && w1 === w0.n0, Object.assign({ w1 }, w0));
  // a game of 0.33.4: the witness's home known, and the trust a life saved takes
  const m0 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), theo = H.charByHandle(g, 'theo.marlin');
    delete zara.addr[theo.id]; delete theo.saw.raw; theo.trust = 40;
    H.psyKnownFix(g);
    return { home: H.homeOfHow(g, zara, theo), trust: theo.trust, raw: theo.saw.raw };
  });
  check('a game of 0.33.4: she knows where the witness lives (she saw them leave), and the trust it takes (+10 more, whatever the heart)', /vus repartir ensemble/.test(m0.home || '') && m0.trust === 50 && m0.raw === 1, m0);

  // ---------- together, in sync ----------
  const { page: sy } = await newPage(browser, { width: 1280, height: 900 }, false);
  await newGame(sy);
  await goTo(sy, 9, 0);
  const s0 = await G(sy, () => {
    const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin');
    const ev = { id: 'evNight', kind: 'rdv', c: theo.id, what: 'Concert puis soirée chez Théo', at: Date.now() - 12 * 3600000, due: Date.now() - 12 * 3600000, state: 'done', player: true, played: { score: 0.8, tier: 'top' }, talk: { scene: 'La salle bondée.', lines: [{ who: 'c', text: 'Tu chantes faux, mais avec conviction.' }, { who: 'p', text: 'Je chante avec mon cœur.' }], turn: 2, max: 6, reacts: [], used: [] }, morning: { where: 'c', text: 'Théo apporte deux cafés.' } };
    g.events.push(ev);
    g.stay = { c: theo.id, ev: ev.id, where: 'c', at: Date.now(), until: Date.now() + 5 * 3600000 };
    window.__theo = theo.id;
    const p = H.promptDM(g, theo, [], 'on reste ici toute la journée ?'), pub = H.ctxText(g, { kind: 'public' });
    return { with: H.stayWith(g, theo), ctx: /VOUS ÊTES ENSEMBLE, EN CE MOMENT/.test(p) && /Tu chantes faux/.test(p) && /Théo apporte deux cafés/.test(p), lines: /"t":"temps"/.test(p) && /"t":"part"/.test(p), pub: /si @theo\.marlin poste, c’est sur ce moment, jamais ailleurs/.test(pub) };
  });
  check('together in the morning: the one who is there has the evening in full, the night, the hour; the others know he is with the player (no post from elsewhere)', s0.with && s0.ctx && s0.lines && s0.pub, s0);
  const h0 = await hourNow(sy);
  await G(sy, () => { window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'On reste là. Musique, restes réchauffés, sieste.' }, { t: 'temps', h: 6, why: 'la journée ensemble' }, { t: 'rel', d: 1, why: '' }] }]; return window.__hype.sendDM(window.__theo, 'on reste ici toute la journée ?'); });
  await idle(sy);
  await until(sy, () => !(window.__hype.S.game.timeDebt > 0), null, 15000);
  await sleep(500);
  const s1 = await G(sy, () => { const H = window.__hype, g = H.S.game; return { with: H.stayWith(g, H.charByHandle(g, 'theo.marlin')) }; });
  const h1 = await hourNow(sy);
  check('« la journée ensemble »: the clock follows (six hours), and they are still together', Math.abs(h1 - h0 - 6) < 0.6 && s1.with, Object.assign({ h0, h1 }, s1));
  await G(sy, () => { window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'Je file au studio, fais comme chez toi.' }, { t: 'part', qui: 'théo', h: 2, why: 'au studio' }, { t: 'rel', d: 0, why: '' }] }]; return window.__hype.sendDM(window.__theo, 'tu vas où ?'); });
  await idle(sy);
  await sleep(600);
  const s2 = await G(sy, () => { const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin'); return { gone: H.stayGone(g), away: H.awayHome(g), with: H.stayWith(g, theo), dispo: H.dispoOf(g, theo).now, line: (document.querySelector('.stay-line') || {}).textContent || '', ctx: H.stayCtx(g, theo) || '' }; });
  check('he leaves without the player (« au studio »): the player stays at his place, alone; not together any more (his phone, his time), said so', s2.gone && s2.away && !s2.with && s2.dispo === false && /il est sorti \(au studio\)/.test(s2.line) && /en laissant le joueur chez lui/.test(s2.ctx), Object.assign({}, s2, { ctx: s2.ctx.slice(0, 100) }));
  await G(sy, () => { const H = window.__hype, g = H.S.game; H.jumpClock(g, 150 * 60000, 'skip'); H.update(); });
  await until(sy, () => { const H = window.__hype, g = H.S.game; return H.stayWith(g, H.charByHandle(g, 'theo.marlin')) && g.notifs.some((n) => /🔑 Théo est rentré/.test(n.text)); }, null, 10000);
  const s3 = await G(sy, () => { const H = window.__hype, g = H.S.game; return { with: H.stayWith(g, H.charByHandle(g, 'theo.marlin')), notif: g.notifs.some((n) => /🔑 Théo est rentré/.test(n.text)) }; });
  check('back home: together again (said so)', s3.with && s3.notif, s3);
  await G(sy, () => { window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'Allez, file, je te raccompagne.' }, { t: 'part', qui: 'joueur', why: 'rentre chez lui' }, { t: 'rel', d: 0, why: '' }] }]; return window.__hype.sendDM(window.__theo, 'bon, je vais rentrer'); });
  await idle(sy);
  await sleep(500);
  const s4 = await G(sy, () => window.__hype.stayOn(window.__hype.S.game));
  check('the player leaves: the stay is over', s4 === false, { stay: s4 });

  // ---------- without __t334: as before ----------
  const { page: od } = await newPage(browser, { width: 1280, height: 900 }, false);
  await newGame(od);
  await fightOff(od, 'theo.marlin');
  await sleep(400);
  const o1 = await G(od, () => { const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'); return { known: !!zara.psyKnown, shown: H.psyShown(zara), rel: H.relShown(zara), out: H.playerOut(g) }; });
  check('the suites written before: no tag, the relation as it was', !o1.known && !o1.shown && !/Psychopathe/.test(o1.rel), o1);

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
