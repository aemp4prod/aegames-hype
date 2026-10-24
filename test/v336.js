// 0.33.6, in Chromium against the built hype.html with the mocked Claude runtime.
// - several nights at someone's: their AI says it (« sejour »), the game keeps the player there; sleeping there keeps
//   them there (the second night, said on waking, known by the one there); the stay that ends on its own, said;
// - a night away: the hunter's AI is asked what they do of it (the player's place empty: a break-in found back home;
//   the second week, at the place of the one they stay with, while asleep: the fight, two of them);
// - out with someone (« s'il nous retrouve dehors »): only where they can know; their AI decides once: come up to them
//   (seen, in the other's prompt, the police a gesture away), nothing too violent the first week, and the second week
//   they wait outside: the fight in the street, two of them; then the evening with the other one, after;
// - the fights: read first, then the moves; the wheel; a practice fight from the palette (nothing in the game);
// - partnerships settled in a conversation: a contract under way is no reason, another creator in it with their share,
//   signed, their yes in the group; and the reason said when a brand cannot;
// - without __t334, no outing.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v336.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v336');
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

// The wheel, pressed when the needle is at a point of its zone (0: its start, 1: its end; outside 0..1: outside it).
async function wheelPress(page, frac, oldGo = 0) {
  const w = await G(page, async (old) => { const A = window.__hype.S.duel.attack, Q = A.steps[A.i]; for (let k = 0; k < 120 && (!Q.wz || !Q.goAt || Q.goAt === old); k++) await new Promise((r) => setTimeout(r, 25)); return { wz: Q.wz, go: Q.goAt }; }, oldGo);
  if (!w.wz) return w;
  const deg = (((w.wz.z0 + w.wz.zone * frac) % 360) + 360) % 360;
  let t = w.go + (deg / 360) * w.wz.turn;
  const now = await G(page, () => Date.now());
  while (t < now + 150) t += w.wz.turn;
  await G(page, async (t) => { const d = t - Date.now(); if (d > 0) await new Promise((r) => setTimeout(r, d)); }, t - 15);
  await page.keyboard.press('Space');
  return w;
}
async function page_wait(page, sel, ms = 10000) { await page.waitForSelector(sel, { timeout: ms }).catch(() => {}); }

// An evening with them (at a place, the time now), opened: the id, and the prompts before it.
async function evening(page, h, what) {
  const id = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, a.h);
    c.cool = null;
    g.events = (g.events || []).filter((e) => !(e.player && e.state === 'scheduled'));
    const ev = H.addEvent(g, { by: a.h, what: a.what, kind: 'rdv', in: 2 });
    ev.due = Date.now() - 60000;
    return ev.id;
  }, { h, what });
  const n0 = await G(page, () => window.__prompts.length);
  await G(page, (id) => window.__hype.openTalk(window.__hype.S.game.events.find((e) => e.id === id)), id);
  await idle(page);
  await until(page, () => !window.__hype.S.busy.outing, null, 15000);
  await sleep(300);
  return { id, n0 };
}
const say = (page, id, text, geste) => G(page, (a) => window.__hype.talkTurn(window.__hype.S.game.events.find((e) => e.id === a.id), a.text, a.geste), { id, text, geste });
const outingPrompts = (page, n0) => G(page, (n0) => window.__prompts.slice(n0).filter((p) => p.includes('TÂCHE : CE SOIR, LE JOUEUR SORT')), n0);
const zaraHunt = (page, o) => G(page, (o) => { const H = window.__hype, g = H.S.game; Object.assign(g.psy.hunt, { at: Date.now() - o.days * 86400000, act: Date.now(), pressAt: Date.now() }); return H.huntLevel(g, H.charByHandle(g, 'zara.vey')); }, o);

(async () => {
  const browser = await chromium.launch();

  // ======================= several nights at someone's =======================
  const { page: st } = await newPage(browser, { width: 1280, height: 900 }, false);
  await newGame(st);
  await goTo(st, 9, 0);
  const s0 = await G(st, () => {
    const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin');
    const ev = { id: 'evNight', kind: 'rdv', c: theo.id, what: 'Concert puis soirée chez Théo', at: Date.now() - 12 * 3600000, due: Date.now() - 12 * 3600000, startAt: Date.now() - 12 * 3600000, state: 'done', player: true, played: { score: 0.8, tier: 'top' }, talk: { scene: 'La salle bondée.', lines: [{ who: 'c', text: 'Tu chantes faux, mais avec conviction.' }], turn: 2, max: 5, reacts: [], used: [] }, morning: { where: 'c', text: 'Théo apporte deux cafés.' } };
    g.events.push(ev);
    g.stay = { c: theo.id, ev: ev.id, where: 'c', at: Date.now(), until: Date.now() + H.STAY_MS };
    window.__theo = theo.id;
    const p = H.promptDM(g, theo, [], 'je peux rester quelques jours ?');
    return { line: /"t":"sejour","nuits"/.test(p) && /le jeu le garde chez Théo jusque-là/.test(p) };
  });
  await G(st, () => { window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'Reste. Autant que tu veux.' }, { t: 'sejour', nuits: 2, why: 'quelques jours ensemble' }, { t: 'rel', d: 1, why: '' }] }]; return window.__hype.sendDM(window.__theo, 'je peux rester quelques jours ?'); });
  await idle(st);
  await sleep(700);
  const s1 = await G(st, () => { const H = window.__hype, g = H.S.game; return { plan: g.stay.plan && g.stay.plan.n, left: (g.stay.until - Date.now()) / 86400000, notif: g.notifs.some((n) => /🧳 Tu restes chez Théo : encore 2 nuits \(quelques jours ensemble\)/.test(n.text)) }; });
  check('several nights: the « sejour » line is offered together; their AI says two more nights: the game keeps the player there (said)', s0.line && s1.plan === 2 && s1.left > 1 && s1.notif, Object.assign({}, s0, s1));
  await goTo(st, 23, 30);
  const s2a = await G(st, () => window.__hype.stayOn(window.__hype.S.game));
  await G(st, () => window.__hype.goSleep());
  await idle(st);
  await sleep(500);
  await G(st, () => { const H = window.__hype; H.S.stack = []; H.goTab('feed'); H.update(); });
  await sleep(400);
  const s2 = await G(st, () => {
    const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin'), d = H.gameDate(Date.now());
    return { on: H.stayOn(g), where: g.stay.where, nights: g.stay.nights, h: d.getHours(), notif: g.notifs.some((n) => /🌅 Réveil chez Théo \(2e nuit\)/.test(n.text)), line: (document.querySelector('.stay-line') || {}).textContent || '', p: /c’est leur 2e nuit chez Théo/.test(H.promptDM(g, theo, [], 'bien dormi ?')) };
  });
  await shot(st, 'second-night');
  check('asleep there: the morning after, still at Théo’s (the second night, said; the banner; his prompt knows it)', s2a && s2.on && s2.where === 'c' && s2.nights === 2 && s2.h >= 6 && s2.h <= 10 && s2.notif && /depuis 2 nuits/.test(s2.line) && s2.p, s2);
  await G(st, () => { const H = window.__hype, g = H.S.game; H.jumpClock(g, Math.max(0, g.stay.until - Date.now()) + 2 * 3600000, 'skip'); H.update(); });
  await until(st, () => window.__hype.S.game.notifs.some((n) => /🏠 Tu es rentrée chez toi, après 2 nuits chez Théo/.test(n.text)), null, 10000);
  const s3 = await G(st, () => { const H = window.__hype, g = H.S.game; return { on: H.stayOn(g), end: !!g.stay.end, notif: g.notifs.some((n) => /🏠 Tu es rentrée chez toi, après 2 nuits chez Théo/.test(n.text)) }; });
  check('the stay that ends on its own (nobody slept there again): said, « rentrée chez toi, après 2 nuits »', !s3.on && s3.end && s3.notif, s3);
  await st.context().close();

  // ======================= the hunt: out with someone, the nights away =======================
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);
  await goTo(page, 14, 0);
  await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), theo = H.charByHandle(g, 'theo.marlin');
    Object.assign(g.psy, { at: Date.now() - 8 * 86400000, signs: 5 });
    Object.assign(zara, { dates: 3, rel: 60 });
    Object.assign(theo, { rel: 75, trust: 60 });
    const it = (t) => ({ t, at: Date.now(), sp: '', broken: 0, fixAt: 0, crack: 0, hot: 0, virus: 0 });
    Object.assign(g.gear.items, { pc: it(2), cam: it(1) });
  });
  await fightOff(page, 'theo.marlin');
  await sleep(500);
  await dismiss(page);
  await clear(page);
  await G(page, () => { const H = window.__hype, g = H.S.game; Object.assign(g.psy.hunt, { act: Date.now(), pressAt: Date.now() }); window.__trust0 = H.charByHandle(g, 'theo.marlin').trust; window.__rel0 = H.charByHandle(g, 'theo.marlin').rel; });

  // ---------- out: only where they can know ----------
  const o0 = await evening(page, 'ada.quill', 'Un verre au Café des Lumières');
  const o0p = await outingPrompts(page, o0.n0);
  await G(page, (id) => { window.__hype.S.game.events.find((e) => e.id === id).state = 'cancelled'; }, o0.id);
  const o1 = await evening(page, 'theo.marlin', 'Film chez toi, plaid et pizza');
  const o1p = await outingPrompts(page, o1.n0);
  await G(page, (id) => { window.__hype.S.game.events.find((e) => e.id === id).state = 'cancelled'; }, o1.id);
  check('out with someone: never asked where she cannot know (Ada’s café: she knows neither home), nor at the player’s', o0p.length === 0 && o1p.length === 0, { ada: o0p.length, home: o1p.length });

  // ---------- she comes up to them (the first week: no worse) ----------
  await G(page, () => { window.__mockOnce = [{ has: 'TÂCHE : CE SOIR, LE JOUEUR SORT', lines: [{ t: 'rode', quoi: 'aborder', quand: 'milieu', text: 'Zara traverse la salle et s’arrête devant votre table.', dit: 'Vous êtes mignons, tous les deux. Profitez bien.' }] }]; });
  const a0 = await evening(page, 'theo.marlin', 'Un verre au Café des Lumières');
  const a0p = await outingPrompts(page, a0.n0);
  const a0s = await G(page, (id) => { const ev = window.__hype.S.game.events.find((e) => e.id === id); return ev.amb && { q: ev.amb.q, turn: ev.amb.turn }; }, a0.id);
  await say(page, a0.id, 'Tu as vu ce groupe la semaine dernière ?');
  await idle(page);
  const a1x = await G(page, (id) => window.__hype.S.game.events.find((e) => e.id === id).talk.lines.some((x) => x.amb), a0.id);
  await say(page, a0.id, 'Et sinon, ta journée ?');
  await idle(page);
  await G(page, (id) => { const H = window.__hype; H.S.stack = []; H.openLayer({ t: 'minigame', id }); H.update(); }, a0.id);
  await sleep(500);
  await shot(page, 'she-comes-up-to-them');
  const a1 = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === id), zara = H.charByHandle(g, 'zara.vey'), theo = H.charByHandle(g, 'theo.marlin');
    const L = [...document.querySelectorAll('.layer')].pop();
    return { psy: !!(L && L.querySelector('.talk-line.is-psy')), amb: !!(L && L.querySelector('.amb-line')), said: /Profitez bien/.test(L ? L.textContent : ''), police: !!(L && [...L.querySelectorAll('.talk-gestes button')].some((b) => /Appeler la police/.test(b.textContent))),
      clue: (g.clues || []).some((k) => k.c === zara.id && /est venue vous parler/.test(k.text)), log: (g.psy.hunt.log || []).slice(-1)[0].q, trust: theo.trust - window.__trust0, rel: theo.rel - window.__rel0 };
  }, a0.id);
  check('her AI, asked once as the evening starts (how she knows: she followed Théo; nothing worse offered the first week): she comes up to them mid-evening; on screen, in the clues, Théo closer for facing it', a0p.length === 1 && /a suivi @theo\.marlin depuis chez lui/.test(a0p[0]) && !/"quoi":"attendre"/.test(a0p[0]) && a0s && a0s.q === 'aborder' && a0s.turn === 2 && !a1x && a1.psy && a1.amb && a1.said && a1.police && a1.clue && a1.log === 'aborder' && a1.trust >= 5 && a1.rel >= 2, Object.assign({ asked: a0p.length, a1x }, a0s, a1));
  const n2 = await G(page, () => window.__prompts.length);
  await say(page, a0.id, '', 'police');
  await idle(page);
  const a2 = await G(page, (n) => {
    const H = window.__hype, g = H.S.game, K = H.caseOf(g, H.charByHandle(g, 'zara.vey'));
    const p = window.__prompts.slice(n).find((x) => x.includes('TÂCHE : LE RENDEZ-VOUS, EN VRAI')) || '';
    return { told: /## CE SOIR, @zara\.vey EST LÀ/.test(p) && /Théo sait ce que Zara a fait/.test(p), log: !!(K && K.log.some((x) => /Pendant ta soirée avec Théo, Zara est venue vous parler/.test(x.text))) };
  }, n2);
  check('Théo’s next words know she came (and what she did); « Appeler la police »: noted in the file', a2.told && a2.log, a2);
  await G(page, (id) => { const ev = window.__hype.S.game.events.find((e) => e.id === id); ev.talk.turn = ev.talk.max; }, a0.id);
  const n3 = await G(page, () => window.__prompts.length);
  await G(page, (id) => window.__hype.lastWord(window.__hype.S.game.events.find((e) => e.id === id), ''), a0.id);
  await G(page, (id) => window.__hype.endDate(window.__hype.S.game.events.find((e) => e.id === id)), a0.id);
  await idle(page);
  await sleep(500);
  const a3 = await G(page, (n) => { const P = window.__prompts.slice(n); const end = P.find((x) => x.includes('TÂCHE : LA FIN DU RENDEZ-VOUS')) || ''; return { end: /est venue jusqu’à eux/.test(end), away: P.some((x) => x.includes('TÂCHE : PENDANT QUE LE JOUEUR N’EST PAS CHEZ LUI')) }; }, n3);
  check('the end of that evening tells it; her AI is not asked what she did meanwhile (she was there)', a3.end && !a3.away, a3);
  await dismiss(page);
  await clear(page);

  // ---------- the first week, « attendre » is not hers to take ----------
  await G(page, () => { window.__mockOnce = [{ has: 'TÂCHE : CE SOIR, LE JOUEUR SORT', lines: [{ t: 'rode', quoi: 'attendre', text: 'Elle est là, sous le porche.' }] }]; });
  const w0 = await evening(page, 'theo.marlin', 'Un verre au Café des Lumières');
  const w0s = await G(page, (id) => { const ev = window.__hype.S.game.events.find((e) => e.id === id); const r = ev.amb; ev.state = 'cancelled'; return r === undefined ? 'undef' : r; }, w0.id);
  check('the first week, waiting outside to strike is neither offered nor taken', w0s === null, { amb: w0s });

  // ---------- the second week: she waits outside; the fight in the street, two of them ----------
  const lv2 = await zaraHunt(page, { days: 8 });
  await G(page, () => { window.__mockOnce = [{ has: 'TÂCHE : CE SOIR, LE JOUEUR SORT', lines: [{ t: 'rode', quoi: 'attendre', text: 'Zara surgit d’une porte cochère, le couteau à la main.' }] }]; window.__atkQ = []; });
  const x0 = await evening(page, 'theo.marlin', 'Un dernier verre au Bar des Docks');
  const x0p = await outingPrompts(page, x0.n0);
  await G(page, (id) => { const ev = window.__hype.S.game.events.find((e) => e.id === id); ev.talk.turn = ev.talk.max; window.__trust1 = window.__hype.charByHandle(window.__hype.S.game, 'theo.marlin').trust; window.__rel1 = window.__hype.charByHandle(window.__hype.S.game, 'theo.marlin').rel; }, x0.id);
  await G(page, (id) => window.__hype.lastWord(window.__hype.S.game.events.find((e) => e.id === id), 'On remet ça bientôt ?'), x0.id);
  await idle(page);
  const x1 = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === id), A = ev.talk.attack;
    return A ? { where: A.where, f: A.f === H.charByHandle(g, 'theo.marlin').id, beats: A.steps.filter((s) => s.k === 'c').map((s) => s.text).join(' | '), first: (ev.talk.lines.filter((x) => x.atk)[0] || {}).text || '' } : null;
  }, x0.id);
  await G(page, (id) => { const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === id); H.S.stack = []; H.openLayer({ t: 'minigame', id }); H.update(); }, x0.id);
  await sleep(500);
  await shot(page, 'the-street-fight');
  await G(page, (id) => { const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === id), A = ev.talk.attack; for (const B of A.steps) if (B.k === 'c') Object.assign(B, { pick: B.opts[0].id, v: 1, help: true }); H.attackEnd(g, ev.talk); H.update(); }, x0.id);
  await sleep(600);
  const x2 = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === id), theo = H.charByHandle(g, 'theo.marlin'), K = H.caseOf(g, H.charByHandle(g, 'zara.vey'));
    const L = [...document.querySelectorAll('.layer')].pop();
    return { ok: ev.talk.attack.ok, fled: !!ev.talk.fled, played: !!ev.played, line: ev.talk.lines.map((x) => x.text).join(' | '), stayBtn: !!(L && [...L.querySelectorAll('button')].some((b) => /Rester avec Théo/.test(b.textContent))), trust: theo.trust - window.__trust1, rel: theo.rel - window.__rel1, log: !!(K && K.log.some((x) => /dans la rue, en sortant de « Un dernier verre au Bar des Docks »/.test(x.text))), last: (g.psy.hunt.log || []).slice(-1)[0].q, over: !!g.over };
  }, x0.id);
  check('the second week she may wait outside (offered now): as they leave, the fight in the street (its own beats), two of them', lv2 === 2 && x0p.length === 1 && /"quoi":"attendre"/.test(x0p[0]) && x1 && x1.where === 'dehors' && x1.f && /Zara surgit d’une porte cochère/.test(x1.first) && /fonce sur|trottoir|vitrine|avenue|phares|revient à la charge/.test(x1.beats) && !/chaise|canapé|lampe/.test(x1.beats), Object.assign({ lv2, asked: x0p.length }, x1));
  check('fought off: they run to the avenue, Théo calls the police (the file knows where), closer again (+10 trust), « Rester avec Théo »', x2.ok && x2.fled && x2.played && /courez jusqu’à l’avenue/.test(x2.line) && x2.stayBtn && x2.trust === 10 && x2.rel >= 4 && x2.log && x2.last === 'attendre' && !x2.over, Object.assign({}, x2, { line: x2.line.slice(-160) }));
  const n4 = await G(page, () => window.__prompts.length);
  const m4 = await G(page, () => { const H = window.__hype, g = H.S.game; return ((g.dms[H.charByHandle(g, 'theo.marlin').id] || {}).msgs || []).filter((m) => !m.me && !m.sys).length; });
  await page.locator('.layer button', { hasText: 'Rester avec Théo' }).last().click();
  await idle(page);
  await sleep(800);
  const x3 = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin');
    const e2 = g.events.find((e) => e.after && e.after.from === a.id);
    const p = window.__prompts.slice(a.n).find((x) => x.includes('JUSTE AVANT : ILS ONT FUI ENSEMBLE')) || '';
    return { e2: !!e2, out: !!(e2 && e2.after.out), what: e2 ? e2.what : '', prompt: /en sortant de « Un dernier verre au Bar des Docks », @zara\.vey \(Zara Vey\) les attendait dehors/.test(p), msgs: ((g.dms[theo.id] || {}).msgs || []).filter((m) => !m.me && !m.sys).length - a.m };
  }, { id: x0.id, n: n4, m: m4 });
  check('« Rester avec Théo »: the evening goes on with him, just after (his AI knows it was in the street); the evening ended quietly (no message from him: he is there)', x3.e2 && x3.out && /Dehors, avec Théo, après l’attaque/.test(x3.what) && x3.prompt && x3.msgs === 0, x3);
  await G(page, () => { const H = window.__hype, g = H.S.game; for (const e of g.events) if (e.player && e.state === 'scheduled') e.state = 'cancelled'; H.S.stack = []; H.S.modals.length = 0; H.update(); });

  // ---------- a night away: her AI asked; the player's place empty ----------
  await goTo(page, 23, 0);
  await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), theo = H.charByHandle(g, 'theo.marlin');
    H.learnHome(g, zara, 'p', 'a repéré l’adresse du joueur');
    Object.assign(g.psy.hunt, { at: Date.now() - 3 * 86400000, act: Date.now(), pressAt: Date.now() });
    g.stay = { c: theo.id, ev: null, where: 'c', at: Date.now(), until: Date.now() + 5 * 3600000 };
    window.__mockOnce = [{ has: 'TÂCHE : LA NUIT DE @zara.vey', lines: [{ t: 'rode', quoi: 'cambrioler', prend: ['pc'], text: 'Ton appart est sens dessus dessous. Sur ton bureau, une bougie encore tiède.' }] }];
  });
  const n5 = await G(page, () => window.__prompts.length);
  await G(page, () => window.__hype.goSleep());
  await idle(page);
  await sleep(500);
  const y0 = await G(page, (n) => {
    const H = window.__hype, g = H.S.game, p = window.__prompts.slice(n).find((x) => x.includes('TÂCHE : LA NUIT DE @zara.vey')) || '';
    const B = (g.psy.hunt.breaks || []).slice(-1)[0];
    return { prompt: /Cette nuit, le joueur dort chez @theo\.marlin, avec lui/.test(p) && /son appartement à lui est vide/.test(p), cam: /"quoi":"cambrioler","prend"/.test(p), knock: /"quoi":"toquer"/.test(p), wait: !!(B && B.wait), on: H.stayOn(g), card: !!document.querySelector('.break-card') };
  }, n5);
  check('asleep at Théo’s: her AI asked about the night (the player’s place empty; never a knock there): she goes in; nothing found while away', y0.prompt && y0.cam && !y0.knock && y0.wait && y0.on && !y0.card, y0);
  await G(page, () => { const H = window.__hype; H.endStay(H.S.game); H.S.stack = []; H.update(); });
  await page.waitForSelector('.break-card', { timeout: 10000 }).catch(() => {});
  const y1 = await G(page, () => (document.querySelector('.break-card') || {}).textContent || '');
  check('back home: the place turned over (the candle), what is missing', /bougie encore tiède/.test(y1) && /Il manque/.test(y1), { card: y1.slice(0, 160) });
  await dismiss(page);
  await clear(page);
  // the second week: in there, at Théo’s, while they sleep
  await goTo(page, 23, 30);
  await zaraHunt(page, { days: 8 });
  await G(page, () => {
    const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin');
    g.stay = { c: theo.id, ev: null, where: 'c', at: Date.now(), until: Date.now() + 5 * 3600000 };
    window.__atkQ = [];
    window.__mockOnce = [{ has: 'TÂCHE : LA NUIT DE @zara.vey', lines: [{ t: 'rode', quoi: 'attaquer', h: '3:40', text: 'Zara est dans le couloir de Théo.' }] }];
  });
  await G(page, () => window.__hype.goSleep());
  await idle(page);
  await page.waitForSelector('.visit-card .atk', { timeout: 15000 }).catch(() => {});
  const z0 = await G(page, () => {
    const H = window.__hype, g = H.S.game, v = H.liveVisit(g), theo = H.charByHandle(g, 'theo.marlin'), d = H.gameDate(Date.now());
    const out = { place: v && v.place === theo.id, inside: v && v.inside, where: v && v.attack && v.attack.where, f: v && v.attack && v.attack.f === theo.id, h: d.getHours() + d.getMinutes() / 60, on: H.stayOn(g), head: (document.querySelector('.visit-card .visit-head') || {}).textContent || '' };
    if (v && v.attack) { for (const B of v.attack.steps) if (B.k === 'c') Object.assign(B, { pick: B.opts[0].id, v: 1, help: true }); H.attackEnd(g, v); H.endVisit(g, v); }
    H.S.modals.length = 0; H.update();
    return out;
  });
  check('the second week, a night at Théo’s: she comes in there while they sleep (3 h 40), the fight with him; still at his place', z0.place && z0.inside && z0.where === 'home' && z0.f && Math.abs(z0.h - (3 + 40 / 60)) < 0.05 && z0.on && /Chez Théo/.test(z0.head), z0);
  await page.context().close();

  // ======================= the fights: read first, the wheel, the practice =======================
  const { page: fp } = await newPage(browser, { width: 1280, height: 900 }, false);
  await newGame(fp);
  const pl = await G(fp, () => { const H = window.__hype, g = H.S.game; const top = H.paletteLines(g, [], Date.now()).map((x) => x.id || x.label); const L = H.paletteLines(g, ['combat'], Date.now()); return { top: top.includes('combat'), lines: L.map((x) => x.label) }; });
  check('the palette: « Combat » (where, with whom, which reflexes, start)', pl.top && pl.lines.join() === 'Où,Avec,Réflexes,Lancer le combat', pl);
  // read first
  await G(fp, () => { Object.assign(window, { __atkRead: 1600, __qtePre: 200 }); const H = window.__hype, g = H.S.game; window.__trustF = H.charByHandle(g, 'theo.marlin').trust; H.startDuel(g, 'dehors', H.charByHandle(g, 'theo.marlin').id, 'none'); });
  await page_wait(fp, '.layer .atk');
  const r0 = await G(fp, () => { const L = [...document.querySelectorAll('.layer')].pop(); return { read: !!L.querySelector('.atk-ready'), opts: L.querySelectorAll('.atk-opt').length, text: (L.querySelector('.atk-text') || {}).textContent || '' }; });
  await shot(fp, 'read-first');
  await sleep(1900);
  const r1 = await G(fp, () => { const L = [...document.querySelectorAll('.layer')].pop(); return { read: !!L.querySelector('.atk-ready'), opts: L.querySelectorAll('.atk-opt').length }; });
  check('a choice: read first (no moves yet, a bar), then the moves come, with their time', r0.read && r0.opts === 0 && r0.text.length > 10 && !r1.read && r1.opts === 4, Object.assign({ r1 }, r0));
  await fp.keyboard.press('1');
  await sleep(300);
  const r2 = await G(fp, () => { const L = [...document.querySelectorAll('.layer')].pop(); return { read: !!L.querySelector('.atk-ready'), prev: (L.querySelector('.atk-prev') || {}).textContent || '' }; });
  await fp.keyboard.press('Space');
  await sleep(250);
  const r3 = await G(fp, () => { const L = [...document.querySelectorAll('.layer')].pop(); return L.querySelectorAll('.atk-opt').length; });
  check('the next one: what just happened, in a line, while reading; Espace goes on sooner', r2.read && r2.prev.length > 5 && r3 === 4, { r2, r3 });
  await G(fp, () => { window.__atkRead = 0; });
  for (let k = 0; k < 4; k++) { await fp.keyboard.press('1').catch(() => {}); await sleep(250); }
  await page_wait(fp, '.duel-end');
  const r4 = await G(fp, () => { const H = window.__hype, g = H.S.game, L = [...document.querySelectorAll('.layer')].pop(); return { end: (L.querySelector('.duel-end') || {}).textContent || '', over: !!g.over, trust: H.charByHandle(g, 'theo.marlin').trust - window.__trustF, police: !!H.caseOf(g, H.charByHandle(g, 'zara.vey')), saw: !!H.charByHandle(g, 'theo.marlin').saw }; });
  await shot(fp, 'practice-end');
  check('a practice fight: its end (the score, the choices, the reflexes), and nothing in the game (no end, no trust, no police, no witness)', /Tu t’en sors|Tu n’aurais pas survécu/.test(r4.end) && /Rien ne compte dans ta partie/.test(r4.end) && !r4.over && r4.trust === 0 && !r4.police && !r4.saw, Object.assign({}, r4, { end: r4.end.slice(0, 120) }));
  // the wheel: missed (pressed before the zone), then made in the zone
  await G(fp, () => { Object.assign(window, { __qtePre: 300, __qteK: 1 }); const H = window.__hype, g = H.S.game; H.startDuel(g, 'date', '', 'wheel'); });
  await page_wait(fp, '.qte-wheel');
  await shot(fp, 'the-wheel');
  const wp0 = await wheelPress(fp, -0.7);
  await page_wait(fp, '.atk-dead');
  const q0 = await G(fp, () => ({ text: (document.querySelector('.atk-dead') || {}).textContent || '', pa: window.__hype.S.duel.attack.steps[0].pa }));
  await shot(fp, 'wheel-missed');
  await fp.locator('.atk-dead button', { hasText: 'Revenir juste avant' }).click();
  await page_wait(fp, '.qte-wheel');
  const wp1 = await wheelPress(fp, 0.5, wp0.go);
  await sleep(400);
  const q1 = await G(fp, () => { const H = window.__hype, A = H.S.duel.attack, Q = A.steps[0]; return { ok: Q.ok, tries: Q.tries, i: A.i, pa: Q.pa }; });
  check('the wheel: pressed before the needle reaches the zone: too late (back just before); pressed in the zone: parried', /Trop tard/.test(q0.text) && wp0.wz && wp0.wz.zone >= 58 && q1.ok === true && q1.tries === 1 && q1.i >= 1, Object.assign({ wz: wp1.wz, pa0: q0.pa }, q1));
  await G(fp, () => { const H = window.__hype; H.S.duel = null; H.S.stack = []; H.update(); });
  await fp.context().close();

  // ======================= partnerships, settled in a conversation =======================
  const { page: pp } = await newPage(browser, { width: 1280, height: 900 }, false);
  await newGame(pp);
  const k0 = await G(pp, () => {
    const H = window.__hype, g = H.S.game;
    g.stats.followers = 60000;
    const d = H.makeOffer(g, { brand: 'Rythmo', sector: 'appli', product: 'son appli de sport', what: 'short', scam: '', gift: false, shady: false, care: false });
    H.signDeal(g, d);
    const b = g.chars[d.contact];
    window.__b = b.id;
    const why = H.ownAskWhy(g, b);
    const ada = H.charByHandle(g, 'ada.quill');
    const gr = H.createGroup(g, [b.id, ada.id], 'Partenariat', '💬');
    window.__gr = gr.ok ? gr.gr.id : null;
    return { signed: d.state === 'signed', why, gr: !!gr.ok, handle: b.handle };
  });
  await G(pp, (h) => { window.__mockOnce = [{ has: 'LE GROUPE DE DISCUSSION', lines: [{ t: 'msg', by: h, text: 'Validé de notre côté : je vous envoie la proposition.' }, { t: 'offre', by: h, what: 'short', product: 'son appli de sport, avec Ada', fee: 1200, avec: 'ada.quill', part: 300 }, { t: 'msg', by: 'ada.quill', text: 'Trop bien, je suis partante.' }] }]; return window.__hype.sendGroup(window.__gr, 'Bon, on signe ce partenariat à trois ?'); }, k0.handle);
  await idle(pp);
  await sleep(600);
  const k1 = await G(pp, () => {
    const H = window.__hype, g = H.S.game, ada = H.charByHandle(g, 'ada.quill');
    const p = window.__prompts.filter((x) => x.includes('LE GROUPE DE DISCUSSION')).pop() || '';
    const d = g.deals.filter((x) => x.contact === window.__b && x.state === 'offer').pop();
    return { line: /"t":"offre"/.test(p) && /Un contrat déjà en cours avec Rythmo n’empêche rien/.test(p) && /c’est "avec" dans la ligne offre ou deal/.test(p), offer: !!d, plan: d && d.guestPlan && d.guestPlan.c === ada.id && d.guestPlan.fee === 300, sum: d ? H.dealSummary(g, d) : '', card: ((g.dms[window.__b] || {}).msgs || []).some((m) => m.sys === 'deal' && d && m.deal === d.id), id: d && d.id };
  });
  check('a contract with Rythmo under way is no reason: asked in the group, Rythmo makes the offer now, Ada in it with her share (the contract says so)', k0.signed && k0.why === '' && k0.gr && k1.line && k1.offer && k1.plan && /avec Ada Quill \(sa part, payée par toi : 300/.test(k1.sum) && k1.card, Object.assign({ why: k0.why }, k1, { sum: k1.sum.slice(-120) }));
  const k2 = await G(pp, (id) => { const H = window.__hype, g = H.S.game, d = g.deals.find((x) => x.id === id), ada = H.charByHandle(g, 'ada.quill'); H.signDeal(g, d); return { guest: d.guest && d.guest.c === ada.id && d.guest.brand === true && d.guest.fee === 300, asking: !!H.guestAsking(g, ada), draft: /C’est signé avec Rythmo/.test(H.S.drafts.dm[ada.id] || ''), notif: g.notifs.some((n) => /Ada est dans le contrat \(sa part : 300/.test(n.text)) }; }, k1.id);
  check('signed: Ada is in it (the brand agreed already), her share set; it is hers to say yes (a message ready for her)', k2.guest && k2.asking && k2.draft && k2.notif, k2);
  await G(pp, () => { window.__mockOnce = [{ has: 'LE GROUPE DE DISCUSSION', lines: [{ t: 'msg', by: 'ada.quill', text: 'Je suis dedans, on tourne demain ?' }, { t: 'feat_pub', by: 'ada.quill', ok: true, fee: 300, day: 1, at: '18:00', why: 'avec plaisir' }] }]; return window.__hype.sendGroup(window.__gr, 'C’est signé ! Tu es partante, Ada ?'); });
  await idle(pp);
  await sleep(600);
  const k3 = await G(pp, (id) => { const H = window.__hype, g = H.S.game, d = g.deals.find((x) => x.id === id); const p = window.__prompts.filter((x) => x.includes('LE GROUPE DE DISCUSSION')).pop() || ''; return { line: /"t":"feat_pub"/.test(p) && /"by":"ada\.quill"/.test(p), ok: d.guest.ok === true, r: !!d.guest.r }; }, k1.id);
  check('her yes, said in the group: she is in the shoot (planned)', k3.line && k3.ok && k3.r, k3);
  const k4 = await G(pp, () => {
    const H = window.__hype, g = H.S.game;
    for (const br of ['Volta', 'Nébula', 'Kiwi Mobile', 'Orbe']) H.makeOffer(g, { brand: br, sector: 'tech', what: 'short', scam: '', gift: false, shady: false, care: false, asked: true });
    const b = g.chars[window.__b];
    const p = H.promptDM(g, b, [], 'Et un autre partenariat, encore ?');
    return { offers: g.deals.filter((d) => d.state === 'offer').length, why: H.ownAskWhy(g, b), said: /plusieurs propositions de marques en attente/.test(p) && !/"t":"offre"/.test(p) };
  });
  check('when a brand cannot (too many offers waiting): the reason is said, not « on attend le feu vert »', k4.why === 'full' && k4.said, k4);
  await pp.context().close();

  // ======================= without __t334: no outing =======================
  const { page: od } = await newPage(browser, { width: 1280, height: 900 }, false);
  await newGame(od);
  await fightOff(od, 'theo.marlin');
  await sleep(400);
  const q = await evening(od, 'theo.marlin', 'Un verre au Café des Lumières');
  const qp = await outingPrompts(od, q.n0);
  check('the suites written before: no outing asked', qp.length === 0, { n: qp.length });

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
