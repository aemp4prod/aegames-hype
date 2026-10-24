// 0.33.4, in Chromium against the built hype.html with the mocked Claude runtime: elle rôde, la police, des nouvelles.
// - an attack fought off with someone: the hunt starts (they know that the player knows), the police came (a case, the
//   complaint the player's to file), the couple with them is over; the one who was there saw it;
// - who knows where: a key with the player's address in their file, an address given in private; nobody else's;
// - their prompts know it all (the mask fell, where they can go, the police); a refresh may bring a move of theirs, the
//   night only offering a knock: a note under the door (shown, noted, a proof), someone close gone after (who tells the
//   player, their AI), an address searched;
// - a knock in the night: through the door it holds (no attack line), the police called (gone when they come, the file
//   knows), no answer (they stay behind it); the door opened: two exchanges, then the worst may come (fought off);
// - « Dormir »: their AI decides the night: a knock wakes the player up at its hour; a note found in the morning; one
//   question a night;
// - the police: the complaint in the player's words (four questions, the statement), the investigation (the witness
//   heard, what the player adds to the file), released for want of proof (they know), relaunched with more, arrested
//   (the end of the hunt, the modal, the news without the player's name);
// - the one who lived it writes on their own the days after, once a day, three days; not when already talking;
// - a game of before: the hunt and the case opened from the escape; on a phone, it fits; without __t334, none of it.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v334.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v334');
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
    Object.assign(zara, { dates: 3, rel: 60, vibe: 'couple' });
    Object.assign(theo, { rel: 75, trust: 70 });
    return { stage: H.psyStage(g), hunt: !!g.psy.hunt, home: H.homeHow(g, zara) };
  });
  check('the psychopath ready (stage 3), no hunt yet, and she does not know where the player lives', r0.stage === 3 && !r0.hunt && r0.home === null, r0);

  // ---------- fought off, together ----------
  const f0 = await fightOff(page, 'theo.marlin');
  await sleep(600);
  const a1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), theo = H.charByHandle(g, 'theo.marlin'), K = H.caseOf(g, zara);
    return { hunt: g.psy.hunt && g.psy.hunt.why, now: H.huntNow(g) === zara, K: K && K.state, f: K && K.f === theo.id, log: K && K.log[0] && K.log[0].text, vibe: zara.vibe, saw: !!(theo.saw && theo.saw.psy === zara.id), mem: (zara.mem || []).some((m) => m.keep && /échappé/.test(m.t)), notif: g.notifs.some((n) => n.k === 'police' && /porter plainte/.test(n.text)), ex: g.notifs.some((n) => n.k === 'vibe' && /c’est fini/.test(n.text)) };
  });
  check('fought off with Théo: the hunt starts (she knows that the player knows), the police came (a case, the complaint to file), the couple is over, Théo saw it', f0.ok && f0.fled && a1.hunt === 'attack' && a1.now && a1.K === 'called' && a1.f && /Théo a appelé la police/.test(a1.log || '') && a1.vibe === 'ex' && a1.saw && a1.mem && a1.notif && a1.ex, Object.assign({}, f0, a1));
  await dismiss(page);
  await clear(page);

  // ---------- who knows where ----------
  const k1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), ada = H.charByHandle(g, 'ada.quill'), theo = H.charByHandle(g, 'theo.marlin');
    zara.knows = Object.assign({}, zara.knows, { [theo.id]: Date.now() }); // (who was told of a private love: no address)
    const before = H.homeHow(g, zara);
    H.psySign(g, zara, 'sur son bureau, un double de tes clés avec ton adresse', Date.now(), true);
    const after = H.homeHow(g, zara);
    const said = H.homeSaid(g, ada, 'passe quand tu veux, j’habite au 12 rue des Lilas, 3e étage');
    const other = H.homeSaid(g, ada, 'Théo habite au 4 rue du Puits, juste à côté');
    return { before, after, said, ada: H.homeHow(g, ada), adaTheo: H.homeOfHow(g, ada, theo), zaraTheo: H.homeOfHow(g, zara, theo), plain: H.homeSaid(g, ada, 'on se voit demain ?') };
  });
  check('who knows where: nothing at first; a key with the player’s address in her file, she knows; an address given in private (the player’s, someone’s); nobody else’s', k1.before === null && /repéré/.test(k1.after || '') && k1.said && /adresse/.test(k1.ada || '') && /Théo/.test(k1.adaTheo || '') && k1.zaraTheo === null && k1.plain === false, k1);

  // ---------- what her prompts know ----------
  const p1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey');
    const dm = H.promptDM(g, zara, [], 'pourquoi tu m’écris encore ?');
    window.__huntOffer = true;
    const day = H.huntPublicLines(g).join('\n'), dm2 = H.promptDM(g, zara, [], 'laisse-moi tranquille');
    return { dm: /DEPUIS QUE LE JOUEUR LUI A ÉCHAPPÉ/.test(dm) && /Où Zara sait aller/.test(dm) && /chez le joueur \(a repéré/.test(dm) && /aucune plainte encore/.test(dm), rode: /"t":"rode"/.test(day) && /"t":"rode"/.test(dm2), mot: /"mot"/.test(day), knock: /"toquer"/.test(day), theo: /@theo\.marlin/.test(day) };
  });
  await goTo(page, 2, 0);
  const p2 = await G(page, () => { const H = window.__hype, g = H.S.game; return { knock: /"toquer"/.test(H.huntPublicLines(g).join('\n')) }; });
  check('her prompts: the mask fell, where she can go, the police; a refresh (or her own messages) may bring a move of hers (a knock offered only at night)', p1.dm && p1.rode && p1.mot && !p1.knock && p1.theo && p2.knock, Object.assign({}, p1, { night: p2.knock }));

  // ---------- a note, from a refresh ----------
  await goTo(page, 15, 0);
  await G(page, () => { window.__mockOnce = [{ has: 'Facultatif, et pas à chaque fois', add: true, lines: [{ t: 'rode', by: 'zara.vey', quoi: 'mot', who: 'joueur', text: 'Tu dormais si bien hier. Je n’ai pas voulu te réveiller.' }] }]; });
  await G(page, () => { window.__hype.S.game.lastRefreshAt = 0; return window.__hype.refreshFeed(0, { auto: false }); });
  await idle(page);
  await page.waitForSelector('.mot-card', { timeout: 15000 }).catch(() => {});
  await shot(page, 'note-under-the-door');
  const n1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), Hn = g.psy.hunt;
    const el = document.querySelector('.mot-paper');
    return { modal: !!el && /Tu dormais si bien/.test(el.textContent), clue: (g.clues || []).some((k) => k.c === zara.id && /glissé sous ta porte/.test(k.text)), log: (Hn.log || []).some((x) => x.q === 'mot'), btn: /Porter plainte/.test((document.querySelector('.mot-card .btn-ink') || {}).textContent || '') && /comptera si tu portes plainte/.test(document.querySelector('.mot-card').textContent) };
  });
  check('a move of hers in a refresh: a note under the door (shown on paper, noted as a proof, her log; it will count with a complaint)', n1.modal && n1.clue && n1.log && n1.btn, n1);
  await dismiss(page);
  await clear(page);

  // ---------- someone close ----------
  const c1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), theo = H.charByHandle(g, 'theo.marlin');
    window.__mockOnce = [{ has: 'THÉO ÉCRIT AU JOUEUR', lines: [{ t: 'dm', text: 'Zara m’attendait en bas de chez moi ce soir.' }, { t: 'dm', text: 'Elle a juste souri. J’ai pas dormi.' }] }];
    const r = H.rodeDo(g, zara, { quoi: 'proche', who: 'theo.marlin', text: 'l’a attendu en bas de chez lui, sans un mot' });
    const Y = (g.psy.hunt.tell || [])[0];
    if (Y) Y.due = Date.now() - 1;
    return { r: !!r, learned: /suivi/.test(H.homeOfHow(g, zara, theo) || ''), mem: (theo.mem || []).some((m) => m.keep && /^@zara\.vey l’a attendu/.test(m.t)) };
  });
  await until(page, () => { const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin'); return ((g.dms[theo.id] || {}).msgs || []).some((m) => /en bas de chez moi/.test(m.text || '')); }, null, 15000);
  await idle(page);
  const c2 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), theo = H.charByHandle(g, 'theo.marlin'), K = H.caseOf(g, zara);
    const p = window.__prompts.filter((x) => x.includes('THÉO ÉCRIT AU JOUEUR')).pop() || '';
    return { dm: ((g.dms[theo.id] || {}).msgs || []).filter((m) => m.text === 'Zara m’attendait en bas de chez moi ce soir.' || m.text === 'Elle a juste souri. J’ai pas dormi.').length, clue: (g.clues || []).some((k) => k.c === zara.id && /Théo raconte/.test(k.text)), more: K.more, knows: /sait ce que Zara a fait/.test(p) };
  });
  check('someone close gone after (Théo, who saw it): she followed him home first; he writes to the player (his AI, knowing), noted as a proof, the file knows', c1.r && c1.learned && c1.mem && c2.dm === 2 && c2.clue && c2.more === 1 && c2.knows, Object.assign({}, c1, c2));

  // ---------- a knock in the night: through the door, then the police ----------
  await goTo(page, 2, 30);
  const d0 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey');
    g.psy.hunt.act = 0;
    const v = H.rodeDo(g, zara, { quoi: 'toquer', text: 'Mila… c’est moi. Ouvre, s’il te plaît. Je veux juste parler.' });
    window.__vk = v && v.id;
    return { v: !!v, hunt: v && v.hunt, door: v && v.door, deadly: v && v.psy };
  });
  await page.waitForSelector('.visit-card .door-police', { timeout: 10000 });
  await shot(page, 'knock-at-night');
  const d1 = await G(page, () => { const t = document.querySelector('.visit-card').textContent; return { head: /On frappe à ta porte/.test(t) && /derrière ta porte/.test(t), open: !!document.querySelector('.visit-card .door-open'), no: /Ne pas répondre/.test(t), ph: (document.querySelector('.visit-card textarea') || {}).placeholder || '' }; });
  check('a knock in the night: the door shut (not deadly), « Appeler la police », « Ouvrir la porte », « Ne pas répondre », an answer through the door', d0.v && d0.hunt && d0.door === 'shut' && !d0.deadly && d1.head && d1.open && d1.no && /à travers la porte/.test(d1.ph), Object.assign({}, d0, d1));
  await page.fill('.visit-card textarea', 'Va-t’en. Je sais ce que tu as fait.');
  await page.click('.visit-card .send');
  await idle(page);
  const d2 = await G(page, () => {
    const H = window.__hype, g = H.S.game, v = g.visits.find((x) => x.id === window.__vk);
    const p = window.__prompts.filter((x) => x.includes('TÂCHE : UNE VISITE SURPRISE')).pop() || '';
    return { through: /DERRIÈRE LA PORTE DU JOUEUR/.test(p), atk: p.includes('"t":"attaque"'), esc: p.includes('"t":"escape"'), turn: v.turn, attack: !!v.attack };
  });
  check('through the door it holds: she talks (her AI knows the door is shut), no attack line, no fight', d2.through && !d2.atk && !d2.esc && d2.turn === 1 && !d2.attack, d2);
  await page.click('.visit-card .door-police');
  await sleep(500);
  await shot(page, 'knock-police');
  const d3 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), v = g.visits.find((x) => x.id === window.__vk), K = H.caseOf(g, zara);
    return { police: !!v.police, ending: v.ending, night: K.night, log: K.log.some((x) => /frapper chez toi en pleine nuit/.test(x.text)), foot: (document.querySelector('.visit-over') || {}).textContent || '' };
  });
  await page.click('.visit-over .btn');
  await sleep(400);
  const d4 = await G(page, () => { const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), m = ((g.dms[zara.id] || {}).msgs || []).filter((x) => x.sys === 'visit').pop(); return { card: m ? m.text : '', state: g.visits.find((x) => x.id === window.__vk).state }; });
  check('the police called through the door: she is gone when they come, the file knows (a night more), the visit says it', d3.police && d3.ending && d3.night === 1 && d3.log && /La police est repartie/.test(d3.foot) && /Fermer à double tour/.test(d3.foot) && /Tu as appelé la police/.test(d4.card) && d4.state === 'done', Object.assign({}, d3, d4, { foot: undefined }));
  await clear(page);

  // ---------- no answer ----------
  const e0 = await G(page, () => { const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'); g.visitAt = 0; const v = H.huntKnock(g, zara, 'Je sais que tu es là.'); window.__vk2 = v && v.id; return !!v; });
  await page.waitForSelector('.visit-card .visit-no', { timeout: 10000 });
  await page.click('.visit-card .visit-no');
  await sleep(400);
  const e1 = await G(page, () => { const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), v = g.visits.find((x) => x.id === window.__vk2); return { state: v.state, clue: (g.clues || []).some((k) => k.c === zara.id && /derrière ta porte/.test(k.text)), mem: (zara.mem || []).some((m) => /respirer/.test(m.t)) }; });
  check('« Ne pas répondre »: she stays a long time behind the door (noted), and remembers it', e0 && e1.state === 'refused' && e1.clue && e1.mem, e1);
  await clear(page);

  // ---------- the door opened ----------
  const o0 = await G(page, () => { const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'); g.visitAt = 0; const v = H.huntKnock(g, zara, 'C’est moi. J’ai apporté tes affaires.'); window.__vk3 = v && v.id; window.__atkQ = []; return !!v; });
  await page.waitForSelector('.visit-card .door-open', { timeout: 10000 });
  await page.click('.visit-card .door-open');
  await sleep(300);
  const o1 = await G(page, () => { const H = window.__hype, g = H.S.game, v = g.visits.find((x) => x.id === window.__vk3); return { door: v.door, deadly: v.psy, max: v.max, turn: v.turn, acts: !!document.querySelector('.visit-card .door-acts') }; });
  for (const say of ['Qu’est-ce que tu veux ?', 'Pose ça et va-t’en.']) {
    await page.fill('.visit-card textarea', say);
    await page.click('.visit-card .send');
    await idle(page);
  }
  await page.waitForSelector('.visit-card .atk', { timeout: 10000 }).catch(() => {});
  const o2 = await G(page, () => {
    const H = window.__hype, g = H.S.game, v = g.visits.find((x) => x.id === window.__vk3);
    const p = window.__prompts.filter((x) => x.includes('TÂCHE : UNE VISITE SURPRISE')).pop() || '';
    if (!v.attack) return { attack: false };
    for (const B of v.attack.steps) if (B.k === 'c') Object.assign(B, { pick: B.opts[0].id, v: 1.3, help: false });
    for (const B of v.attack.steps) if (B.k === 'q') Object.assign(B, { ok: true, clean: true });
    H.attackEnd(g, v);
    H.update();
    return { attack: true, opened: /LE JOUEUR A OUVERT LA PORTE/.test(p), ok: v.attack.ok, fled: v.fled, over: !!g.over, hunt: !!H.huntNow(g) };
  });
  check('the door opened to her: two exchanges (her AI knows it was opened), then she strikes; fought off alone, the hunt goes on', o1.door === 'open' && o1.deadly === 'deadly' && o1.max === o1.turn + 2 && !o1.acts && o2.attack && o2.opened && o2.ok && o2.fled && !o2.over && o2.hunt, Object.assign({}, o1, o2));
  await page.click('.visit-over .btn').catch(() => {});
  await clear(page);

  // ---------- the night: her AI decides ----------
  await goTo(page, 23, 30);
  await G(page, () => { window.__mockOnce = [{ has: 'TÂCHE : LA NUIT DE @zara.vey', lines: [{ t: 'rode', quoi: 'toquer', h: '3:10', text: 'Tu dors ? Moi non plus. Ouvre-moi.' }] }]; });
  await G(page, () => window.__hype.goSleep());
  await idle(page);
  await page.waitForSelector('.visit-card', { timeout: 15000 }).catch(() => {});
  const s1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, v = H.liveVisit(g), d = H.gameDate(Date.now());
    return { v: !!(v && v.hunt), h: d.getHours() + d.getMinutes() / 60, first: v ? v.lines.map((x) => x.text).join(' | ') : '', asked: window.__prompts.filter((x) => x.includes('TÂCHE : LA NUIT DE @zara.vey')).length, toast: H.S.toasts.some((t) => /On frappe à ta porte/.test(t.text)) };
  });
  check('« Dormir », hunted: her AI decides the night; a knock wakes the player up at its hour (3 h 10), at the door', s1.v && Math.abs(s1.h - (3 + 10 / 60)) < 0.05 && /Ouvre-moi/.test(s1.first) && /On frappe à ta porte/.test(s1.first) && s1.asked === 1, s1);
  await shot(page, 'woken-up');
  await G(page, () => { const H = window.__hype, g = H.S.game; H.huntShut(g, H.liveVisit(g)); H.S.modals.length = 0; H.update(); });
  await G(page, () => window.__hype.goSleep());
  await idle(page);
  const s2 = await G(page, () => { const H = window.__hype, d = H.gameDate(Date.now()); return { asked: window.__prompts.filter((x) => x.includes('TÂCHE : LA NUIT DE @zara.vey')).length, h: d.getHours() }; });
  check('back to sleep: one question a night (the morning comes)', s2.asked === 1 && s2.h >= 7 && s2.h <= 9, s2);
  await clear(page);
  await goTo(page, 23, 40);
  await G(page, () => { window.__mockOnce = [{ has: 'TÂCHE : LA NUIT DE @zara.vey', lines: [{ t: 'rode', quoi: 'mot', text: 'J’ai gardé ta brosse à dents. Elle t’attend.' }] }]; });
  await G(page, () => window.__hype.goSleep());
  await idle(page);
  await page.waitForSelector('.mot-card', { timeout: 15000 }).catch(() => {});
  const s3 = await G(page, () => { const H = window.__hype, d = H.gameDate(Date.now()), el = document.querySelector('.mot-paper'); return { h: d.getHours(), modal: !!el && /brosse à dents/.test(el.textContent), visit: !!H.liveVisit(H.S.game) }; });
  check('another night: a note slipped under the door, found in the morning (no knock)', s3.modal && !s3.visit && s3.h >= 7 && s3.h <= 9, s3);
  await dismiss(page);
  await clear(page);

  // ---------- the police: the complaint ----------
  await goTo(page, 10, 0);
  await G(page, () => { const H = window.__hype, g = H.S.game; H.openChar(H.charByHandle(g, 'zara.vey').id); });
  await page.waitForSelector('.prof-police', { timeout: 10000 });
  const q0 = await G(page, () => document.querySelector('.prof-police').textContent);
  await page.click('.prof-police');
  await page.waitForSelector('.police-head', { timeout: 10000 });
  await shot(page, 'police-before');
  await page.locator('.layer .btn-hot', { hasText: 'Porter plainte' }).click();
  await page.waitForSelector('.police-depo textarea', { timeout: 10000 });
  const q1 = await G(page, () => { const H = window.__hype, g = H.S.game, K = H.caseOf(g, H.charByHandle(g, 'zara.vey')); return { state: K.state, first: K.dep.lines[0].text, cop: H.copName(H.copOf(g)) }; });
  const answers = ['Hier soir, chez Zara. Elle a sorti un couteau et nous a attaqués, Théo et moi.', 'Vers minuit. Elle avait fermé la porte à clé. On s’est défendus et on s’est enfuis par l’escalier.', 'Théo était là, il a tout vu. Depuis, elle a frappé chez moi en pleine nuit et laissé des mots sous ma porte.', 'J’ai gardé les mots et ses messages. J’ai peur qu’elle revienne.'];
  for (let k = 0; k < answers.length; k++) {
    const last = k === answers.length - 1;
    await G(page, (last) => { window.__mockOnce = [{ has: 'TÂCHE : LA DÉPOSITION', lines: [{ t: 'judge', precis: 3 }, { t: 'say', text: last ? 'Votre plainte est enregistrée. Une enquête est ouverte : votre ami sera entendu comme témoin.' : 'D’accord. Continuez : que s’est-il passé ensuite ?' }].concat(last ? [{ t: 'pv', solide: 8, resume: 'Tentative de meurtre au couteau, devant témoin ; harcèlement depuis.' }] : []) }]; }, last);
    await page.fill('.police-depo textarea', answers[k]);
    await page.click('.police-depo .send');
    await idle(page);
  }
  await sleep(400);
  const q2 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), K = H.caseOf(g, zara);
    const p = window.__prompts.filter((x) => x.includes('TÂCHE : LA DÉPOSITION')).pop() || '';
    const top = [...document.querySelectorAll('.layer')].pop();
    return { state: K.state, solide: K.dep.solide, judge: K.dep.judge, due: K.due > Date.now(), truth: /couteau/.test(p) && /theo\.marlin/.test(p) && /vouvoiement/.test(p), pv: /pv/.test(p), notif: g.notifs.some((n) => n.k === 'police' && /enregistrée/.test(n.text)), body: (top && top.querySelector('.section p') || {}).textContent || '' };
  });
  check('« Porter plainte » from her profile: the officer listens (four questions, the truth known to judge), the statement holds (8/10), an investigation opens', /Porter plainte/.test(q0) && q1.state === 'depo' && /prends votre plainte/.test(q1.first) && q2.state === 'enquete' && q2.solide === 8 && q2.judge.length === 4 && q2.due && q2.truth && q2.pv && q2.notif && /enquête/.test(q2.body), Object.assign({ q0 }, q1, q2, { body: q2.body.slice(0, 90), first: undefined }));
  await shot(page, 'police-investigation');
  // what the player adds to the file
  const q3 = await G(page, async () => {
    const H = window.__hype, n = document.querySelectorAll('.police-item:not(.on)').length;
    document.querySelector('.police-item:not(.on)').click();
    await new Promise((r) => setTimeout(r, 300));
    const g = H.S.game, K = H.caseOf(g, H.charByHandle(g, 'zara.vey'));
    return { n, items: K.items.length, on: document.querySelectorAll('.police-item.on').length };
  });
  check('the file: what she was noted doing (the notes, the knocks, what Théo told) can be joined to it', q3.n >= 3 && q3.items === 1 && q3.on === 1, q3);
  // the witness heard, then released for want of proof
  const q4 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), theo = H.charByHandle(g, 'theo.marlin'), K = H.caseOf(g, zara);
    window.__policeRolls = [0.99];
    H.jumpClock(g, K.due - Date.now() + 60000, 'skip');
    H.update();
    return { heard: !!K.heard, tmem: (theo.mem || []).some((m) => /témoin/.test(m.t)), log: K.log.some((x) => /témoin/.test(x.text)), state: K.state, p: K.p, zmem: (zara.mem || []).some((m) => m.keep && /relâchée/.test(m.t)), notif: g.notifs.some((n) => n.k === 'police' && /relâchée/.test(n.text)), hunt: !!H.huntNow(g), psyLine: H.policeForPsy(g, zara).join(' ') };
  });
  check('the investigation: Théo heard as a witness; not enough this time (the roll): questioned, released, she knows who; the file stays open, the hunt goes on', q4.heard && q4.tmem && q4.log && q4.state === 'libre' && q4.p >= 0.8 && q4.zmem && q4.notif && q4.hunt && /sait que c’est lui/.test(q4.psyLine), q4);
  await G(page, () => window.__hype.update());
  await sleep(300);
  const q5 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), K = H.caseOf(g, zara);
    const btn = [...document.querySelectorAll('.layer .btn-ink')].find((b) => /relancer/.test(b.textContent));
    const dis = btn ? btn.disabled : null;
    H.psySign(g, zara, 'un message à 4 h du matin : « tu ne peux pas me fuir »', Date.now(), true);
    H.update();
    await new Promise((r) => setTimeout(r, 300));
    const it = [...document.querySelectorAll('.police-item:not(.on)')].find((b) => /4 h du matin/.test(b.textContent));
    if (it) it.click();
    await new Promise((r) => setTimeout(r, 300));
    const btn2 = [...document.querySelectorAll('.layer .btn-ink')].find((b) => /relancer/.test(b.textContent));
    const dis2 = btn2 ? btn2.disabled : null;
    if (btn2) btn2.click();
    await new Promise((r) => setTimeout(r, 300));
    return { dis, dis2, state: K.state, items: K.items.length };
  });
  check('released: « relancer » needs something new; a new proof joined, the investigation starts again', q5.dis === true && q5.dis2 === false && q5.state === 'enquete' && q5.items === 2, q5);
  const q6 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), K = H.caseOf(g, zara);
    window.__policeRolls = [0.01];
    H.jumpClock(g, K.due - Date.now() + 60000, 'skip');
    H.update();
    const m = H.S.modals.find((x) => x.t === 'psyout');
    return { state: K.state, out: K.out, P: g.psy.out, jailed: !!zara.jailed, hunt: !!H.huntNow(g), modal: m && m.how, post: !H.medias(g).length || g.posts.some((p) => /détention provisoire/.test(p.text || '') && !/mila/i.test(p.text || '')) };
  });
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.update(); }); // (a level, someone new: behind it)
  await until(page, () => /Ta plainte a tenu/.test((document.querySelector('.modal-card') || {}).textContent || ''), null, 8000); // (its moment comes, before a level-up)
  await shot(page, 'arrested');
  const q7 = await G(page, () => { const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin'); return { text: (document.querySelector('.modal-card') || {}).textContent || '', saw: H.sawLines(g, theo).join(' ') }; });
  check('relaunched with more: arrested (the hunt is over), the modal says the complaint held, the news without the player’s name; Théo knows (relief)', q6.state === 'clos' && q6.out === 'arrest' && q6.P === 'arrested' && q6.jailed && !q6.hunt && q6.modal === 'arrest' && q6.post && /Ta plainte a tenu/.test(q7.text) && /tentative de meurtre/.test(q7.text) && /arrêtée/.test(q7.saw), Object.assign({}, q6, { text: q7.text.slice(0, 120) }));
  await dismiss(page);
  await clear(page);

  // ---------- the days after: they write ----------
  const w0 = await G(page, () => {
    const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin');
    theo.saw.at = Date.now() - 20 * 3600000; // (the day after it)
    delete theo.saw.care;
    g.dms[theo.id] = { msgs: [], readAt: 0 };
    window.__mockOnce = [{ has: 'TÂCHE : DES NOUVELLES', lines: [{ t: 'dm', text: 'Hey. T’as réussi à dormir ?' }, { t: 'dm', text: 'Moi je sursaute au moindre bruit.' }] }];
    const C0 = H.tickCare(g, Date.now());
    return { first: C0, next: theo.saw.care && theo.saw.care.next > Date.now() };
  });
  await goTo(page, 14, 0);
  await G(page, () => { const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin'); theo.saw.care.next = Math.min(theo.saw.care.next, Date.now()); H.tickCare(g, Date.now()); });
  await until(page, () => { const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin'); return ((g.dms[theo.id] || {}).msgs || []).some((m) => /dormir/.test(m.text || '')); }, null, 15000);
  await idle(page);
  const w1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin');
    const p = window.__prompts.filter((x) => x.includes('TÂCHE : DES NOUVELLES')).pop() || '';
    const n = theo.saw.care.n, again = H.tickCare(g, Date.now());
    return { msgs: ((g.dms[theo.id] || {}).msgs || []).length, n, again, saw: /CE QUE THÉO A VÉCU/.test(p), next: theo.saw.care.next > Date.now() + 6 * 3600000 };
  });
  check('the day after, Théo writes on his own (his AI, what they lived through), once a day', w1.msgs === 2 && w1.n === 1 && w1.again === false && w1.saw && w1.next, Object.assign({}, w0, w1));
  const w2 = await G(page, () => {
    const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin'), C = theo.saw.care;
    g.dms[theo.id].msgs.push({ id: 'mx', me: true, text: 'ça va mieux, et toi ?', ts: Date.now() - 600000, at: Date.now() - 600000 });
    C.next = Date.now() - 1;
    const a = H.tickCare(g, Date.now()), n1 = C.n;
    C.next = Date.now() - 1; C.n = 3;
    const b = H.tickCare(g, Date.now());
    return { a, n1, b, msgs: g.dms[theo.id].msgs.length };
  });
  check('already talking that day: that was the news (no message); after three days, nothing more', w2.a === false && w2.n1 === 2 && w2.b === false && w2.msgs === 3, w2);

  // ---------- a game of before ----------
  const m0 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey');
    delete zara.jailed; zara.cut = false; zara.vibe = 'couple';
    g.psy = { c: zara.id, at: Date.now() - 9 * 86400000, stage: 3, signs: 9, escaped: 1 };
    g.police = { cases: [] };
    const r = H.migrateHunt(g), K = H.caseOf(g, zara);
    return { r, hunt: g.psy.hunt && g.psy.hunt.why, old: g.psy.hunt && g.psy.hunt.old, K: K && K.state, f: K && !!K.f, vibe: zara.vibe, again: H.migrateHunt(g) };
  });
  check('a game of before (already got away): the hunt starts from the escape, the case opened from that night (the complaint to file), the couple over; once', m0.r && m0.hunt === 'attack' && m0.old && m0.K === 'called' && m0.f && m0.vibe === 'ex' && m0.again === false, m0);

  // ---------- on a phone ----------
  const { page: ph } = await newPage(browser, { width: 390, height: 844 });
  await newGame(ph);
  await fightOff(ph, null);
  await sleep(500);
  await dismiss(ph);
  await clear(ph);
  await G(ph, () => { const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'); H.psySign(g, zara, 'une photo de toi prise de nuit, à travers ta fenêtre', Date.now(), true); H.huntNote(g, zara, 'Tu es encore plus jolie quand tu as peur. On se revoit bientôt, promis.'); H.update(); });
  await ph.waitForSelector('.mot-card', { timeout: 10000 });
  await sleep(300);
  await shot(ph, 'phone-note');
  await overflowCheck(ph, 'note (390 px)');
  await dismiss(ph);
  await clear(ph);
  await G(ph, () => { const H = window.__hype, g = H.S.game; H.openLayer({ t: 'police', id: H.charByHandle(g, 'zara.vey').id }); });
  await ph.waitForSelector('.police-head', { timeout: 10000 });
  await ph.locator('.layer .btn-hot', { hasText: 'Porter plainte' }).click();
  await ph.waitForSelector('.police-depo textarea', { timeout: 10000 });
  await sleep(300);
  await shot(ph, 'phone-police');
  await overflowCheck(ph, 'police (390 px)');
  const ph1 = await G(ph, () => { const r = document.querySelector('.police-depo textarea').getBoundingClientRect(); return { w: Math.round(r.width), right: Math.round(r.right), vw: window.innerWidth, solo: /seul/.test(window.__hype.policeTruth(window.__hype.S.game, window.__hype.caseOf(window.__hype.S.game, window.__hype.charByHandle(window.__hype.S.game, 'zara.vey')), window.__hype.charByHandle(window.__hype.S.game, 'zara.vey'))) }; });
  check('on a phone: the note and the station fit (alone that night: the truth says so)', ph1.w > 200 && ph1.right <= ph1.vw && ph1.solo, ph1);

  // ---------- without __t334: as before ----------
  const { page: od } = await newPage(browser, { width: 1280, height: 900 }, false);
  await newGame(od);
  const f9 = await fightOff(od, 'theo.marlin');
  await sleep(400);
  const b9 = await G(od, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey');
    const dm = H.promptDM(g, zara, [], 'salut');
    return { hunt: !!g.psy.hunt, K: !!H.caseOf(g, zara), btn: H.policeTarget(g, zara), dm: /DEPUIS QUE LE JOUEUR LUI A ÉCHAPPÉ/.test(dm), on: H.huntOn() };
  });
  check('the suites written before: no hunt, no case, no button, the prompts as they were', f9.ok && !b9.hunt && !b9.K && !b9.btn && !b9.dm && b9.on === false, Object.assign({}, f9, b9));

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
