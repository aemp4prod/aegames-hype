// 0.33.1, in Chromium against the built hype.html with the mocked Claude runtime: venir avec quelqu’un.
// - on a date's screen, « 👥 Venir avec quelqu’un »: the proposal waits in their messages, their AI knows the date and
//   says yes (the game notes it, the screen says so); asked in their own words, the same (the date found);
// - tonight they are there: they speak (« say2 »), the one who receives them knows it, the end of the evening says it,
//   and it counts for the three of them;
// - the psychopath, with a witness: still deadly, they try to part them, then strike; the attack, three beats under a
//   countdown (too slow: too late) and, between them, moments to react (dodge, push together on « three », break free
//   tapping), the friend helping by how close they are: a strong bond gets them out (fled together, a witness noted as a
//   proof, closer), a weak one alone leaves them caught (the end, for both);
// - alone at her place: the scene plays too (harder); a moment missed: « Trop tard. », back just before, made with the
//   key; « Ne bouge plus. »; three misses, let go (hurt); out of it by a hair; the night after a public place (one wakes
//   up); a night visit, the door opened (at the player's);
// - on a phone, the target and the moves fit; without window.__t33 (the suites written before), none of it.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v331.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v331');
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
  await ctx.addInitScript((on) => { window.__hypeEasyGear = true; window.__t32 = true; if (on) window.__t33 = true; window.__atkMs = 2500; }, t33);
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
  check('the psychopath ready (stage 3), a date at her place tomorrow', r0.ev && r0.stage === 3 && r0.psy, r0);

  // ---------- asked from the date's screen ----------
  await G(page, () => { const H = window.__hype; H.openLayer({ t: 'minigame', id: window.__ev }); });
  await page.waitForSelector('.plus-btn');
  await shot(page, 'date-setup');
  await page.click('.plus-btn');
  await page.waitForSelector('.feat-pick');
  await page.locator('.feat-pick', { hasText: 'Théo' }).first().click();
  await sleep(400);
  const a1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin'), ev = g.events.find((e) => e.id === window.__ev);
    const p = H.promptDM(g, theo, [], H.S.drafts.dm[theo.id] || '');
    return { plus: ev.plus, draft: H.S.drafts.dm[theo.id] || '', ctx: /Le joueur demande à Théo de l’accompagner/.test(p) && p.includes(window.__ev), line: p.includes('"t":"accompagne"'), dm: H.S.stack.some((l) => l.t === 'dm' && l.id === theo.id), theo: theo.id };
  });
  check('« 👥 Venir avec quelqu’un »: someone of the cast picked, the proposal waits in their messages, their AI knows the date and may answer', a1.plus && a1.plus.c === a1.theo && a1.plus.ok == null && /Tu viendrais avec moi/.test(a1.draft) && /@zara\.vey/.test(a1.draft) && a1.ctx && a1.line && a1.dm, a1);
  await G(page, async () => {
    const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin');
    window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'Oui, je viens avec toi. Pas envie de te laisser y aller seule.' }, { t: 'accompagne', rdv: window.__ev, ok: true, why: 'je la sens pas' }, { t: 'rel', d: 0, why: '' }] }];
    await H.sendDM(theo.id, H.S.drafts.dm[theo.id], { now: true });
  });
  await idle(page);
  await clear(page);
  await G(page, () => { const H = window.__hype; H.openLayer({ t: 'minigame', id: window.__ev }); });
  await page.waitForSelector('.plus-on');
  const a2 = await G(page, () => { const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === window.__ev); return { ok: ev.plus && ev.plus.ok, on: (document.querySelector('.plus-on') || {}).textContent || '', notif: g.notifs.some((n) => /👥 Théo vient avec toi/.test(n.text)), mem: (H.charByHandle(g, 'theo.marlin').mem || []).some((m) => /accompagner le joueur/.test(m.t)) }; });
  check('their AI says yes: the game notes it, the date’s screen says so, they remember it', a2.ok === true && /Théo vient avec toi/.test(a2.on) && a2.notif && a2.mem, a2);
  await clear(page);
  // in their own words
  const a3 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, ada = H.charByHandle(g, 'ada.quill');
    const ev2 = H.addEvent(g, { by: 'leandre.aube', kind: 'rdv', what: 'Dîner au réfectoire avec Léandre', day: 2, at: '20:00' });
    window.__ev2 = ev2 && ev2.id;
    const plain = H.promptDM(g, ada, [], 'salut, ça va ?');
    const p = H.promptDM(g, ada, [], 'tu peux venir avec moi ? j’ai pas envie d’y aller seule');
    window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'D’accord. Je viendrai.' }, { t: 'accompagne', ok: true }] }];
    await H.sendDM(ada.id, 'tu peux venir avec moi ? j’ai pas envie d’y aller seule', { now: true });
    return { plain: !plain.includes('"t":"accompagne"'), line: p.includes('"t":"accompagne"') && p.includes(window.__ev2) && !p.includes(window.__ev), ada: ada.id };
  });
  await idle(page);
  const a3b = await G(page, () => { const H = window.__hype, g = H.S.game, ev2 = g.events.find((e) => e.id === window.__ev2); return { plus: ev2 && ev2.plus }; });
  check('asked in their own words: the line comes only then, with the dates they can come to (not one someone else comes to), and the yes finds the date', a3.plain && a3.line && a3b.plus && a3b.plus.ok === true && a3b.plus.c === a3.ada, Object.assign({}, a3, a3b));

  // ---------- tonight, with Théo ----------
  await goTo(page, 21, 0);
  await G(page, () => { const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin'); Object.assign(theo, { rel: 90, trust: 80 }); });
  await G(page, async () => {
    const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === window.__ev);
    window.__mockOnce = [{ has: 'LE DÉBUT DE LA SOIRÉE', lines: [{ t: 'scene', text: 'L’appartement de Zara, des bougies partout. Elle ouvre, son sourire se fige en voyant Théo.' }, { t: 'say', text: 'Oh. Tu es venue… accompagnée.' }, { t: 'say2', text: 'Salut Zara ! Mila m’a dit que tu faisais des cookies de folie.' }] }];
    H.S.stack = [];
    H.openLayer({ t: 'minigame', id: ev.id });
    await H.openTalk(ev);
  });
  await idle(page);
  const b1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === window.__ev), T = ev.talk, P = window.__prompts.filter((p) => p.includes('LE RENDEZ-VOUS, EN VRAI')).slice(-1)[0] || '';
    const who = document.querySelector('.talk-line.is-plus .talk-who'), bub = document.querySelector('.bubble.them.is-plus');
    return { deadly: ev.psy, x: T && T.lines.filter((l) => l.who === 'x').length, ctx: /LE JOUEUR N’EST PAS VENU SEUL : @theo\.marlin/.test(P) && /THÉO EST LÀ AUSSI/.test(P), say2: P.includes('"t":"say2"'), atk: P.includes('"t":"attaque"'), who: who ? who.textContent : '', bw: bub ? Math.round(bub.getBoundingClientRect().width) : 0, bt: bub ? bub.textContent : '' };
  });
  check('tonight Théo is there: he speaks (his name over his whole words), she knows it; with a witness it is still deadly, and she may strike (the game plays it)', b1.deadly === 'deadly' && b1.x === 1 && b1.ctx && b1.say2 && b1.atk && b1.who === 'Théo' && b1.bw > 150 && /cookies de folie/.test(b1.bt), b1);
  await G(page, async () => {
    const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === window.__ev);
    window.__mockOnce = [{ has: 'LA RÉPLIQUE DU JOUEUR', lines: [{ t: 'judge', react: 'neutre' }, { t: 'say', text: 'Théo, tu veux bien aller chercher du vin à la cave ?' }, { t: 'say2', text: 'Euh… je préfère rester avec Mila.' }] }];
    await H.talkTurn(ev, 'Il est super ton appart !');
  });
  await idle(page);
  await G(page, async () => {
    const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === window.__ev);
    window.__mockOnce = [{ has: 'LA RÉPLIQUE DU JOUEUR', lines: [{ t: 'judge', react: 'refroidi' }, { t: 'say', text: 'Vous n’allez nulle part.' }, { t: 'attaque', text: 'Zara verrouille la porte, sans cesser de sourire.' }] }];
    Object.assign(window, { __atkRolls: [0.1, 0.1, 0.1], __atkQ: ['dodge', 'sync', 'mash'], __qtePre: 250, __qteK: 2 });
    await H.talkTurn(ev, 'Bon, on va peut-être y aller, il est tard.');
  });
  await idle(page);
  await page.waitForSelector('.atk');
  const c1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === window.__ev), A = ev.talk.attack;
    return { on: !!A, n: A && A.steps.length, kinds: A && A.steps.map((x) => x.k + (x.q ? ':' + x.q : '')).join(','), p: A && A.p, bond: A && A.bond, reveal: (document.querySelector('.atk-text.reveal') || {}).textContent || '', line: ev.talk.lines.some((l) => l.atk && /verrouille la porte/.test(l.text)), over: !!g.over, reply: !document.querySelector('.talk-foot .reply-box'), dark: !!document.querySelector('.talk.atk-on') };
  });
  check('she strikes: a scene in six moments (three moves to choose, three moments to react, by surprise), the screen closes in; the friend’s help by how close they are', c1.on && c1.n === 6 && c1.kinds === 'q:dodge,c,q:sync,c,q:mash,c' && c1.p >= 0.8 && c1.bond > 0.5 && /Un grand sourire, immobile/.test(c1.reveal) && c1.line && !c1.over && c1.reply && c1.dark, c1);
  await page.waitForSelector('.qte-target');
  await shot(page, 'qte-dodge');
  await page.locator('.qte-target').click();
  await sleep(300);
  const worst = async (sel = '') => { const lbl = await G(page, () => { const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === window.__ev), A = ev.talk.attack, B = A.steps[A.i]; return B && B.k === 'c' ? B.opts.filter((o) => o.v < 0.2)[0].label : ''; }); await page.locator(sel + '.atk-opt', { hasText: lbl }).first().click(); await sleep(300); return lbl; };
  await page.waitForSelector('.atk-opt');
  await shot(page, 'attack');
  await worst();
  await page.waitForSelector('.qte-push');
  await until(page, () => { const g = window.__hype.S.game, ev = g.events.find((e) => e.id === window.__ev), A = ev.talk.attack, Q = A.steps[A.i]; return Q && Q.q === 'sync' && Q.hitAt && Date.now() >= Q.hitAt - 60; }, null, 8000);
  await shot(page, 'qte-sync');
  await page.locator('.qte-push').click();
  await sleep(300);
  await worst();
  await page.waitForSelector('.qte-mash');
  for (let k = 0; k < 14; k++) { await page.keyboard.press(' '); await sleep(35); }
  await sleep(300);
  await worst();
  await idle(page);
  const c2 = await G(page, () => {
    const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === window.__ev), A = ev.talk.attack, theo = H.charByHandle(g, 'theo.marlin'), zara = H.charByHandle(g, 'zara.vey');
    const qs = A.steps.filter((x) => x.k === 'q'), cs = A.steps.filter((x) => x.k === 'c');
    return { done: A.done, ok: A.ok, score: A.score, fled: !!ev.fled, over: !!g.over, qte: qs.map((q) => q.ok && q.clean).join(','), helps: cs.filter((b) => b.help).length, witness: (g.clues || []).some((k) => k.c === zara.id && k.psy && /Théo a tout vu/.test(k.text)), mem: (theo.mem || []).some((m) => /on s’en est sortis ensemble/.test(m.t)), lines: ev.talk.lines.filter((l) => l.atk).length, wins: ['à un souffle de ton visage', 'Ensemble !', 'sa main lâche'].every((w) => ev.talk.lines.some((l) => l.atk && l.text.includes(w))), out: !!document.querySelector('.talk-over') };
  });
  check('dodged, pushed together on « three », broke free tapping, the worst moves chosen: a strong bond gets them out; they flee, Théo saw it all (a proof), closer for it', c2.done && c2.ok && c2.score >= 2 && c2.fled && !c2.over && c2.qte === 'true,true,true' && c2.helps === 3 && c2.witness && c2.mem && c2.lines >= 10 && c2.wins && c2.out, c2);
  await shot(page, 'attack-escaped');
  const c3 = await G(page, () => { const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === window.__ev); const p = H.promptDateEnd(g, ev); return { end: /les a attaqués, le joueur et @theo\.marlin/.test(p) && /était là aussi/.test(p) }; });
  check('the end of the evening says it (attacked, defended together, fled)', c3.end, c3);
  await clear(page);
  // a plain evening with someone along: it counts for the three of them
  const d1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, ev2 = g.events.find((e) => e.id === window.__ev2), ada = H.charByHandle(g, 'ada.quill'), lea = H.charByHandle(g, 'leandre.aube'), rel0 = ada.rel;
    ev2.played = { score: 0.7, tier: 'mid', at: Date.now(), kind: 'talk' };
    H.afterDate(g, ev2, lea);
    return { rel: ada.rel - rel0, memA: (ada.mem || []).some((m) => /j’ai accompagné le joueur/.test(m.t)), memL: (lea.mem || []).some((m) => /est venu avec @ada\.quill/.test(m.t)) };
  });
  check('an evening with someone along counts for the three of them (the friend +, both remember)', d1.rel > 0 && d1.memA && d1.memL, d1);

  // ---------- alone at her place: the last word, and she strikes; a moment missed is not the end ----------
  const st = (page) => G(page, () => { const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === window.__ev4), A = ev && ev.talk && ev.talk.attack, Q = A && !A.done ? A.steps[A.i] : null; return { i: A ? A.i : -1, k: Q && Q.k, q: Q && Q.q, dead: Q ? Q.dead || null : null, tries: Q ? Q.tries || 0 : 0, misses: Q ? Q.misses || 0 : 0, lines: ev.talk.lines.length, over: !!g.over }; });
  const best = async (sel = '', id = '__ev4') => { const lbl = await G(page, (id) => { const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === window[id]), A = ev.talk.attack, B = A.steps[A.i]; return B && B.k === 'c' ? B.opts.filter((o) => o.v >= 0.8)[0].label : ''; }, id); await page.locator(sel + '.atk-opt', { hasText: lbl }).first().click(); await sleep(300); return lbl; };
  await G(page, async () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey');
    const ev = H.addEvent(g, { by: 'zara.vey', kind: 'rdv', what: 'Un verre chez Zara', in: 5 });
    window.__ev4 = ev.id;
    ev.psy = 'deadly';
    ev.talk = { scene: 'Chez Zara, les volets fermés.', lines: [{ who: 'c', text: 'Reste encore un peu…' }], turn: 6, max: 6, reacts: [], used: [], at: Date.now() };
    Object.assign(window, { __atkQ: ['dodge', 'still', 'mash'], __qtePre: 250, __qteK: 1, __qteStill: 1300 });
    window.__mockOnce = [{ has: 'LE RENDEZ-VOUS, EN VRAI', lines: [{ t: 'judge', react: 'neutre' }, { t: 'say', text: 'Tu ne vas nulle part, voyons.' }] }];
    H.S.stack = [];
    H.openLayer({ t: 'minigame', id: ev.id });
    await H.lastWord(ev, 'Bon… je vais y aller.');
  });
  await idle(page);
  await page.waitForSelector('.qte-target');
  const s0 = await G(page, () => { const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === window.__ev4), A = ev.talk.attack; return { solo: A && A.f === null, where: A && A.where, over: !!g.over }; });
  await shot(page, 'solo-dodge');
  await until(page, () => { const g = window.__hype.S.game, ev = g.events.find((e) => e.id === window.__ev4), Q = ev.talk.attack.steps[ev.talk.attack.i]; return !!(Q && Q.dead); }, null, 6000);
  await sleep(300);
  const s1 = await st(page);
  const dead = await G(page, () => (document.querySelector('.atk-dead') || {}).textContent || '');
  await shot(page, 'qte-missed');
  check('alone at her place, the last word: she strikes all the same, and the scene plays (no end at once); a dodge missed: « Trop tard. », and one goes back just before (nothing told, not the end)', s0.solo && s0.where === 'date' && !s0.over && s1.dead === 'late' && s1.q === 'dodge' && !s1.over && /Trop tard\./.test(dead) && /Revenir juste avant/.test(dead) && !/Passer ce moment/.test(dead), Object.assign({}, s0, s1, { dead }));
  const n0 = s1.lines;
  await G(page, () => { window.__qteK = 4; });
  await page.locator('.atk-dead .btn-hot').click();
  await page.waitForSelector('.qte-target b');
  const key = await G(page, () => document.querySelector('.qte-target b').textContent);
  await page.keyboard.press(key.toLowerCase());
  await sleep(300);
  const s2 = await st(page);
  check('back just before: the same moment again (a little easier), made with the key shown on the keyboard', s2.k === 'c' && s2.i === 1 && s2.lines === n0 + 1, Object.assign({ key }, s2));
  await best();
  await page.waitForSelector('.qte-still');
  await sleep(900);
  await shot(page, 'qte-still');
  await until(page, () => { const g = window.__hype.S.game, ev = g.events.find((e) => e.id === window.__ev4), A = ev.talk.attack; return A.i >= 3; }, null, 6000);
  const s3 = await G(page, () => { const g = window.__hype.S.game, ev = g.events.find((e) => e.id === window.__ev4), A = ev.talk.attack, Q = A.steps[2]; return { ok: Q.ok, clean: Q.clean, i: A.i }; });
  check('« Ne bouge plus. » in the dark: touching nothing, one makes it', s3.ok === true && s3.clean === true && s3.i === 3, s3);
  await best();
  await G(page, () => { window.__qteK = 0.3; });
  for (let k = 0; k < 3; k++) {
    await until(page, () => { const g = window.__hype.S.game, ev = g.events.find((e) => e.id === window.__ev4), Q = ev.talk.attack.steps[ev.talk.attack.i]; return !!(Q && Q.dead); }, null, 8000);
    await sleep(200);
    if (k < 2) await page.locator('.atk-dead .btn-hot').click();
  }
  await page.waitForSelector('.atk-dead .btn-ghost');
  await shot(page, 'qte-skip');
  const s4 = await st(page);
  await page.locator('.atk-dead .btn-ghost').click();
  await sleep(300);
  await best();
  await idle(page);
  const s5 = await G(page, () => {
    const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === window.__ev4), A = ev.talk.attack, zara = H.charByHandle(g, 'zara.vey');
    return { done: A.done, ok: A.ok, score: A.score, fled: !!ev.fled, over: !!g.over, skip: !!A.steps[4].skip, hurt: ev.talk.lines.some((l) => /Ton bras te lance/.test(l.text)), sign: (g.clues || []).some((k) => k.c === zara.id && k.psy && /t’a attaquée avec un couteau, chez elle/.test(k.text)), last: ev.talk.lines.filter((l) => l.who === 'n').slice(-1)[0].text, p: H.promptDateEnd(g, ev) };
  });
  check('three misses: one may let the moment go (hurt, it costs); alone, the best moves, fast: out of it, by a hair (a proof noted, the end of the evening says it)', s4.misses === 3 && s5.done && s5.ok && s5.score >= 2.4 && s5.fled && !s5.over && s5.skip && s5.hurt && s5.sign && /Dehors, tu appelles la police/.test(s5.last) && /seul, il s’est défendu/.test(s5.p), Object.assign({ misses: s4.misses }, s5, { p: undefined }));
  await clear(page);

  // ---------- the night after: one wakes up ----------
  await G(page, async () => {
    const H = window.__hype, g = H.S.game;
    const ev = H.addEvent(g, { by: 'zara.vey', kind: 'rdv', what: 'Dîner aux chandelles sur le port', in: 240 });
    window.__ev5 = ev.id;
    ev.talk = { scene: 'Le port, les lampions.', lines: [{ who: 'c', text: 'Je ne veux pas que la soirée finisse.' }], turn: 6, max: 6, reacts: [], used: [], at: Date.now() };
    Object.assign(window, { __atkQ: ['dodge'], __qtePre: 300, __qteK: 6 });
    window.__mockOnce = [{ has: 'LE RENDEZ-VOUS, EN VRAI', lines: [{ t: 'judge', react: 'charme' }, { t: 'say', text: 'Avec plaisir…' }, { t: 'stay' }] }];
    H.S.stack = [];
    H.openLayer({ t: 'minigame', id: ev.id });
    await H.lastWord(ev, 'Tu veux rentrer avec moi ?');
  });
  await idle(page);
  await page.waitForSelector('.qte-target');
  await shot(page, 'night-dodge');
  const n1 = await G(page, () => { const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === window.__ev5), A = ev.talk.attack; return { deadly: ev.psy || null, where: A && A.where, cut: ev.talk.lines.some((l) => l.text === 'La suite appartient à leur intimité.'), reveal: (document.querySelector('.atk-text.reveal') || {}).textContent || '', go: (document.querySelector('.qte-go') || {}).textContent || '' }; });
  check('a public place, then the night with her: the scene cuts, then one wakes up (« Roule hors du lit ! »)', !n1.deadly && n1.where === 'night' && n1.cut && /Un bruit te réveille/.test(n1.reveal) && /Roule hors du lit/.test(n1.go), n1);
  await page.locator('.qte-target').click();
  await sleep(300);
  for (let k = 0; k < 3; k++) await best('', '__ev5');
  await idle(page);
  const n2 = await G(page, () => { const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === window.__ev5), A = ev.talk.attack, zara = H.charByHandle(g, 'zara.vey'); return { ok: A.ok, fled: !!ev.fled, over: !!g.over, last: ev.talk.lines.filter((l) => l.who === 'n').slice(-1)[0].text, sign: (g.clues || []).some((k) => k.c === zara.id && /en pleine nuit : tu t’en es sortie/.test(k.text)) }; });
  check('the night: out of it alone (pieds nus, the police), noted', n2.ok && n2.fled && !n2.over && /pieds nus/.test(n2.last) && n2.sign, n2);
  await clear(page);

  // ---------- she knocks at night, the door opened: at the player's ----------
  await G(page, () => { const H = window.__hype, g = H.S.game, d = H.gameDate(Date.now()), day = 86400000; g.clockOff += ((23 - d.getHours()) * 3600000 - d.getMinutes() * 60000 + day) % day; });
  const vid = await G(page, () => {
    const H = window.__hype, g = H.S.game, z = H.charByHandle(g, 'zara.vey');
    g.visitAt = 0; z.visitAt = 0; g.visits = (g.visits || []).filter((x) => !H.isLiveVisit || !H.isLiveVisit(x));
    for (const e of g.events) if (e.player && e.state === 'scheduled') e.state = 'done'; // (the evenings above, over)
    Object.assign(window, { __atkQ: [] });
    const v = H.addVisit(g, { by: 'zara.vey', why: 'te voir, juste te voir', urge: 'important', first: 'c’est moi… tu m’ouvres ?', seen: 'un sourire immense' }, Date.now());
    return v && v.id;
  });
  await sleep(900);
  for (let k = 0; k < 5; k++) {
    if (await G(page, (id) => { const g = window.__hype.S.game, v = g.visits.find((x) => x.id === id); return !!(g.over || (v && v.attack)); }, vid)) break;
    await G(page, (id) => window.__hype.visitTurn(window.__hype.S.game.visits.find((x) => x.id === id), 'entre… tu veux un thé ?'), vid);
    await idle(page);
  }
  await page.waitForSelector('.visit-card .atk');
  await shot(page, 'visit-attack');
  const v1 = await G(page, (id) => { const g = window.__hype.S.game, v = g.visits.find((x) => x.id === id); return { psy: v.psy, where: v.attack && v.attack.where, over: !!g.over, foot: !document.querySelector('.visit-card .visit-foot') }; }, vid);
  check('a night visit, the door opened: she strikes at the player’s, and the scene plays there (no way to type)', v1.psy === 'deadly' && v1.where === 'visit' && !v1.over && v1.foot, v1);
  for (let k = 0; k < 3; k++) {
    const lbl = await G(page, (id) => { const v = window.__hype.S.game.visits.find((x) => x.id === id), A = v.attack, B = A.steps[A.i]; return B && B.k === 'c' ? B.opts.filter((o) => o.v >= 0.8)[0].label : ''; }, vid);
    await page.locator('.visit-card .atk-opt', { hasText: lbl }).first().click();
    await sleep(300);
  }
  await sleep(400);
  const v2 = await G(page, (id) => { const g = window.__hype.S.game, v = g.visits.find((x) => x.id === id); return { ok: v.attack.ok, fled: !!v.fled, over: !!g.over, foot: (document.querySelector('.visit-card') || {}).textContent || '' }; }, vid);
  await page.locator('.visit-card .btn-hot').click().catch(() => {});
  await sleep(500);
  const v3 = await G(page, () => { const H = window.__hype, g = H.S.game, z = H.charByHandle(g, 'zara.vey'), m = ((g.dms[z.id] || {}).msgs || []).filter((x) => x.sys === 'visit').slice(-1)[0]; return { card: m ? m.text : '' }; });
  check('out of it at home: she is put out, the door locked twice, the police called; the visit says it', v2.ok && v2.fled && !v2.over && /Deux tours de clé/.test(v2.foot) && /Fermer à double tour/.test(v2.foot) && /t’a attaquée avec un couteau, chez toi, en pleine nuit/.test(v3.card), Object.assign({}, v2, v3, { foot: undefined }));
  await G(page, () => { const H = window.__hype, g = H.S.game, d = H.gameDate(Date.now()), day = 86400000; g.clockOff += ((14 - d.getHours()) * 3600000 + day) % day; });
  await clear(page);

  // ---------- caught: a weak bond, too slow ----------
  const e1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), ada = H.charByHandle(g, 'ada.quill');
    delete zara.jailed; zara.cut = false;
    const ev = H.addEvent(g, { by: 'zara.vey', kind: 'rdv', what: 'Dîner chez Zara', in: 600 });
    ev.plus = { c: ada.id, ok: true, at: Date.now() };
    Object.assign(ada, { rel: -10, trust: 0 });
    ev.talk = { scene: 'x', lines: [], turn: 3, max: 6, reacts: [], used: [], at: Date.now() };
    ev.psy = 'deadly';
    window.__ev3 = ev.id;
    const B = H.plusBond(ada);
    window.__atkQ = [];
    H.startAttack(g, ev.talk, zara, 'Zara éteint la lumière.', { ev, f: ada, where: 'date' });
    window.__atkRolls = [0.9, 0.9, 0.9];
    H.S.stack = [];
    H.openLayer({ t: 'minigame', id: ev.id });
    return { p: B.p, bond: B.bond };
  });
  await page.waitForSelector('.atk');
  await until(page, () => { const g = window.__hype.S.game; return !!g.over; }, null, 15000);
  await sleep(400);
  const e2 = await G(page, () => { const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === window.__ev3), A = ev.talk.attack; return { over: g.over && g.over.k, text: g.over && g.over.text, late: A.steps.every((b) => b.k === 'c' && b.pick === null), ok: A.ok, screen: !!document.querySelector('.over-screen') }; });
  check('a weak bond, frozen, the seconds run out at each beat on their own: caught, the end for both (the end screen)', e1.p <= 0.25 && e1.bond === 0 && e2.over === 'psy' && /Personne ne vous a revus, Ada et toi/.test(e2.text || '') && e2.late && e2.ok === false && e2.screen, Object.assign({}, e1, e2));
  await shot(page, 'attack-caught');

  // ---------- on a phone ----------
  const { page: ph } = await newPage(browser, { width: 390, height: 844 });
  await newGame(ph);
  await G(ph, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), theo = H.charByHandle(g, 'theo.marlin');
    Object.assign(window, { __atkMs: 60000, __atkQ: ['dodge'], __qtePre: 200, __qteK: 30 });
    const ev = H.addEvent(g, { by: 'zara.vey', kind: 'rdv', what: 'Dîner chez Zara', in: 10 });
    ev.plus = { c: theo.id, ok: true, at: Date.now() };
    ev.talk = { scene: 'Les bougies, la musique trop forte.', lines: [{ who: 'c', text: 'Vous restez dîner ?' }, { who: 'x', c: theo.id, text: 'Avec plaisir, ça sent trop bon ici !' }], turn: 3, max: 6, reacts: [], used: [], at: Date.now() };
    ev.psy = 'deadly';
    H.startAttack(g, ev.talk, zara, 'Zara verrouille la porte.', { ev, f: theo, where: 'date' });
    H.S.stack = [];
    H.openLayer({ t: 'minigame', id: ev.id });
  });
  await ph.waitForSelector('.qte-target');
  await sleep(300);
  await shot(ph, 'phone-qte');
  const pq = await G(ph, () => { const r = document.querySelector('.qte-target').getBoundingClientRect(), a = document.querySelector('.atk').getBoundingClientRect(), b = document.querySelector('.bubble.them.is-plus').getBoundingClientRect(); return { inside: r.left >= a.left && r.right <= a.right && r.top >= 0 && r.bottom <= window.innerHeight, w: Math.round(r.width), hint: /Touche la cible/.test(document.querySelector('.atk').textContent), bub: Math.round(b.width) }; });
  await ph.locator('.qte-target').tap();
  await ph.waitForSelector('.atk-opt');
  await sleep(300);
  await shot(ph, 'phone-attack');
  await overflowCheck(ph, 'attack (390 px)');
  const phw = await G(ph, () => { const r = document.querySelector('.atk').getBoundingClientRect(); return { right: Math.round(r.right), w: window.innerWidth, opts: [...document.querySelectorAll('.atk-opt')].map((b) => Math.round(b.getBoundingClientRect().width)) }; });
  check('on a phone: the target to touch within reach, then the moves one under the other (the one who came along, his whole words)', pq.inside && pq.w >= 70 && pq.hint && pq.bub > 150 && phw.right <= phw.w && phw.opts.length === 4 && phw.opts.every((w) => w > 300), Object.assign({}, pq, phw));

  // ---------- without __t33: as before ----------
  const { page: od } = await newPage(browser, { width: 1280, height: 900 }, false);
  await newGame(od);
  const before = await G(od, () => {
    const H = window.__hype, g = H.S.game, ada = H.charByHandle(g, 'ada.quill');
    const ev = H.addEvent(g, { by: 'leandre.aube', kind: 'rdv', what: 'Dîner au réfectoire', day: 1, at: '20:00' });
    window.__evo = ev.id;
    const p = H.promptDM(g, ada, [], 'tu peux venir avec moi ?');
    H.openLayer({ t: 'minigame', id: ev.id });
    return { line: p.includes('"t":"accompagne"'), duel: H.duelOn() };
  });
  await sleep(600);
  const noBtn = await G(od, () => !document.querySelector('.plus-btn'));
  check('the suites written before: no « Venir avec quelqu’un », no line, no fight (the end at once, as before)', !before.line && noBtn && before.duel === false, Object.assign({ noBtn }, before));
  const solo = await G(od, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey');
    const ev = H.addEvent(g, { by: 'zara.vey', kind: 'rdv', what: 'Dîner chez Zara', in: 10 });
    ev.talk = { scene: 'x', lines: [], turn: 3, max: 6, reacts: [], used: [], at: Date.now() };
    window.__atkQ = [];
    H.startAttack(g, ev.talk, zara, 'x', { ev, where: 'date' });
    H.attackTimeout(g, ev.talk);
    return { over: g.over && g.over.k, text: g.over && g.over.text };
  });
  check('alone and caught: the end, said for one (« Personne ne t’a revue »)', solo.over === 'psy' && /Personne ne t’a revue\./.test(solo.text || ''), solo);

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
