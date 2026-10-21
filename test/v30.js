// 0.30, in Chromium against the built hype.html with the mocked Claude runtime.
// Part 1, the fixes from the games played:
// - « à undefined jours » (gear that never ships), « à aujourd’hui 16 h », « demain » in the middle of the night;
// - « Décliner » by the button: their own answer (never a canned line contradicted by the reply already on its way);
// - a fan who writes again is the same contact; the family names of the contacts are told;
// - back from an absence: a release whose time passed gets its grace from the return (and a free postponement); a date
//   missed meanwhile waits for the player's word; an excuse believed (or not) by their trust, their heart, the times before;
// - a reminder an hour before a date, and its time in the bell;
// - « Maintenant »: a release shot right away, never announced (no « livré en avance » for nobody);
// - the brands' prices in mythique (hits counted, capped), likes and new subscribers capped by the views of every format;
// - the gestures' point of view, the strangers in big crowds, the time played.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v30.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v30');
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
const CANNED = ['ok, une autre fois alors', 'dommage… tant pis', 'pas de souci, je retiens 😉'];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const { page } = await newPage(browser, { width: 1280, height: 860 });
  await newGame(page);

  /* ---------- the little texts ---------- */
  const t1 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const d = { id: 'dl_t1', scam: 'impaye', gift: { kind: 'cam', t: 1, value: 900 }, brand: 'Lumière Max', state: 'signed', product: '📷 « Lumière X »', emoji: '📷', contact: null, sector: 'tech', fee: 0, upfront: 0 };
    g.deals.push(d);
    H.criticExposes(g, d);
    const ctx = H.scamCtx(g, d, g.chars[g.order[0]]);
    const d2 = { id: 'dl_t2', scam: 'impaye', gift: { kind: 'cam', t: 1, value: 900 }, brand: 'Ombre Optique', state: 'signed', product: '📷 « Ombre Z »', emoji: '📷', contact: null, sector: 'tech', fee: 0, upfront: 0, value: 900 };
    g.deals.push(d2);
    H.deliverDeal(g, d2, null, true, null);
    const all = JSON.stringify(g);
    return { undef: /undefined jours/.test(all) || /undefined/.test(JSON.stringify(ctx)), critic: /le colis part cette semaine/.test(all), deliv: g.notifs.slice(-6).some((n) => /tu attends encore le matos/.test(n.text)) };
  });
  check('un impayé en matos ne dit plus jamais « undefined jours »', !t1.undef && t1.critic && t1.deliv, t1);

  await setHour(page, 10);
  const t2 = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = Object.values(g.chars).find((x) => x.handle === 'theo.marlin');
    const at16 = (() => { const d = new Date(Date.now() + g.clockOff); d.setHours(16, 0, 0, 0); return d.getTime() - g.clockOff; })();
    const a = H.aWhen(at16);
    const iv = H.addInvite(g, c, { what: 'un verre au Café des Astres', day: 0, at: '16:00' });
    const ev = H.acceptInvite(g, iv);
    const msgs = g.dms[c.id].msgs, last = msgs[msgs.length - 1];
    return { a, said: last.text, ev: !!ev, soon: H.aWhen(Date.now() + 2 * 3600000) };
  });
  check('« à 16 h », jamais « à aujourd’hui 16 h »', t2.a === 'à 16 h' && t2.ev && !/aujourd/.test(t2.said) && /à 16 h/.test(t2.said) && /tout à l’heure/.test(t2.soon), t2);

  await setHour(page, 2);
  const t3 = await G(page, () => {
    const H = window.__hype, g = H.S.game, now = Date.now();
    const d = new Date(now + g.clockOff), at15 = new Date(d); at15.setHours(15, 0, 0, 0);
    const wd = d.toLocaleDateString('fr-FR', { weekday: 'long' });
    const w = H.fmtWhen(at15.getTime() - g.clockOff, now);
    const mins = H.parseWhen(' on se voit demain à 15h ? ', new Date(now + g.clockOff));
    return { w, wd, mins, moment: H.momentLine() };
  });
  check('la nuit : le jour est dit, et « demain » est la journée qui commence', t3.w.startsWith(t3.wd) && !/demain|aujourd/.test(t3.w) && t3.mins > 12 * 60 && t3.mins < 14 * 60 && /En pleine nuit/.test(t3.moment), t3);
  await setHour(page, 14);

  /* ---------- « Décliner » ---------- */
  const t4 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, c = Object.values(g.chars).find((x) => x.handle === 'leandre.aube');
    const iv = H.addInvite(g, c, { what: 'un dîner à la tour Aube', day: 1, at: '20:00' });
    const convo = g.dms[c.id] || (g.dms[c.id] = { msgs: [], readAt: 0 });
    const t = Date.now();
    convo.msgs.push({ id: 'm_pend', me: false, r: 1, text: 'attends, je te réponds…', ts: t + 60000, at: t + 60000 });
    const n0 = convo.msgs.length;
    await H.declineByButton(g, iv);
    const added = convo.msgs.slice(n0);
    return { state: iv.state, mine: added.filter((m) => m.me).length, canned: added.filter((m) => !m.me).length };
  });
  check('décliner pendant que sa réponse arrive : pas de phrase toute faite par-dessus', t4.state === 'declined' && t4.mine === 1 && t4.canned === 0, t4);
  await sleep(2600); // (Théo’s « parfait, à 16 h alors » is still on its way just after the invitation was accepted)
  const t5 = await G(page, async (CANNED) => {
    const H = window.__hype, g = H.S.game, c = Object.values(g.chars).find((x) => x.handle === 'theo.marlin');
    const iv = H.addInvite(g, c, { what: 'une balade au lac', day: 2, at: '17:00' });
    await H.declineByButton(g, iv);
    const msgs = g.dms[c.id].msgs, k = msgs.map((m) => m.me).lastIndexOf(true);
    return { state: iv.state, mine: msgs[k].text, k };
  }, CANNED);
  await idle(page);
  const t5b = await G(page, (a) => { const g = window.__hype.S.game, c = Object.values(g.chars).find((x) => x.handle === 'theo.marlin'); const after = g.dms[c.id].msgs.slice(a.k + 1).filter((m) => !m.me && !m.sys); return { n: after.length, canned: after.some((m) => a.CANNED.includes(m.text)), first: after[0] && after[0].text }; }, { k: t5.k, CANNED });
  check('décliner : c’est son IA qui répond', t5.state === 'declined' && t5b.n >= 1 && !t5b.canned && /pas|cette fois|dispo/.test(t5.mine), { t5, t5b });

  /* ---------- the same fan ---------- */
  const t6 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    g.stats.followers = Math.max(g.stats.followers, 5000);
    g.career.fanAt = 0;
    const a = H.fanMessage(g, { name: 'Tévan Traverse', handle: 'tevan.traverse', g: 'm', bio: 'étudiant', text: 'salut, j’adore tes vidéos !', q: false });
    g.career.fanAt = 0;
    const b = H.fanMessage(g, { name: 'Tévan Traverse', handle: 'tevan.traverse', g: 'm', bio: 'étudiant', text: 'tu m’as pas répondu 🥲', q: true });
    g.career.fanAt = 0;
    const c = H.fanMessage(g, { name: 'Tévan Traverse', handle: 'tevan_t', g: 'm', bio: 'étudiant', text: 'c’est encore moi', q: false });
    const n = Object.values(g.chars).filter((x) => /Tévan/.test(x.name)).length;
    return { same: !!a && a === b && b === c, n, msgs: (g.dms[a.id].msgs || []).length, q: a.fan.q, line: H.fansLine(g), lasts: H.lastsLine(g) };
  });
  check('le même fan qui réécrit reste le même contact', t6.same && t6.n === 1 && t6.msgs >= 3 && /tevan\.traverse/.test(t6.line || '') && /Traverse/.test(t6.lasts || ''), t6);

  /* ---------- back from an absence ---------- */
  const t7 = await G(page, () => {
    const H = window.__hype, g = H.S.game, now = Date.now();
    g.releases = [];
    const r = H.scheduleRelease(g, { what: 'vidéo', topic: 'Absence test', due: now + 3600000 });
    r.due = now - 2 * 3600000; // its time came while the game was closed
    const out = H.absenceGrace(g, now - 3 * 3600000, now);
    const lim = H.relLimit(r) - now, dropped = H.checkReleases(g, now);
    const rep0 = g.stats.reputation, fol0 = g.stats.followers, free = H.awayMove(r, now);
    const ok = H.postponeRelease(g, r);
    return { found: out.rel.includes(r), lim, dropped, state: r.state, free, ok, delays: r.delays, dRep: g.stats.reputation - rep0, dFol: g.stats.followers - fol0, note: g.notifs.slice(-4).some((n) => /pendant ton absence/i.test(n.text)) };
  });
  check('une sortie dont l’heure est passée pendant l’absence : délai depuis le retour, décalage gratuit', t7.found && t7.lim > 50 * 60000 && !t7.dropped && t7.state === 'scheduled' && t7.free && t7.ok && t7.delays === 0 && t7.dRep === 0 && t7.dFol === 0 && t7.note, t7);

  const t8 = await G(page, () => {
    const H = window.__hype, g = H.S.game, now = Date.now(), c = Object.values(g.chars).find((x) => x.handle === 'theo.marlin');
    for (const e of g.events) if (e.c === c.id) e.state = 'done';
    const ev = H.addEvent(g, { by: c.handle, kind: 'rdv', what: 'un café au Chaudron', in: 120 }, { dm: c.id });
    ev.due = now - 2 * 3600000; ev.at = now - 30 * 3600000;
    const rel0 = c.rel;
    const out = H.absenceGrace(g, now - 3 * 3600000, now);
    H.checkEvents(g, now);
    return { found: out.ev.includes(ev), until: ev.awayUntil - now, state: ev.state, rel: c.rel - rel0, line: H.lapinLine(g, c) || '', chip: !!ev.awayUntil };
  });
  check('un rendez-vous raté pendant l’absence attend un mot : pas de lapin tout de suite', t8.found && t8.until > 5 * 3600000 && t8.state === 'scheduled' && t8.rel === 0 && /n’est pas venu/.test(t8.line) && /"t":"excuse"/.test(t8.line) && /confiance/.test(t8.line), t8);
  await G(page, () => { window.__hype.S.tab = 'feed'; window.__hype.update(); });
  await sleep(500);
  const chip = await page.locator('.evt-chip.away').count();
  check('l’agenda le montre : « Raté pendant ton absence », « Lui écrire »', chip >= 1 && await page.locator('.evt-chip.away button', { hasText: 'Lui écrire' }).count() >= 1, { chip });
  await shot(page, 'rdv-rate-absence');

  await G(page, () => { window.__mockExcuse = true; });
  const t9 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, c = Object.values(g.chars).find((x) => x.handle === 'theo.marlin');
    const ev = g.events.find((e) => e.c === c.id && e.awayUntil);
    const rel0 = c.rel;
    await H.sendDM(c.id, 'je suis désolée, mon téléphone était mort, j’ai rien vu passer 😭');
    return { state: ev.state, excused: ev.excused, judged: c.lapin && c.lapin.judged, rel: c.rel - rel0, until: ev.awayUntil };
  });
  await idle(page);
  check('son excuse est crue : le rendez-vous est raté sans lapin', t9.state === 'missed' && t9.excused === 1 && t9.judged === 'ok' && t9.rel > -8 && !t9.until, t9);

  const t10 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, now = Date.now(), c = Object.values(g.chars).find((x) => x.handle === 'zara.vey');
    const ev = H.addEvent(g, { by: c.handle, kind: 'rdv', what: 'un duel amical', in: 180 }, { dm: c.id });
    const rel0 = c.rel;
    H.standUp(g, ev, now);
    const after = c.rel, wh = (g.whispers || []).find((w) => w.seed === 'lapin' && w.src === c.id);
    await H.sendDM(c.id, 'pardon pour hier, j’ai reçu aucune notif, sûrement un bug !');
    return { down: after - rel0, up: c.rel - after, judged: c.lapin.judged, wh: wh ? wh.state : null, mem: c.mem.map((m) => m.t).join(' | ') };
  });
  await idle(page);
  check('après un vrai lapin, une excuse crue rend l’essentiel et arrête la rumeur', t10.down < -8 && t10.up >= 6 && t10.judged === 'ok' && t10.wh === 'off' && /je l’ai cru/.test(t10.mem), t10);

  await G(page, () => { window.__mockExcuse = false; });
  const t11 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, now = Date.now(), c = Object.values(g.chars).find((x) => x.handle === 'nox.ombre');
    const ev = H.addEvent(g, { by: c.handle, kind: 'rdv', what: 'une ronde à la bibliothèque', in: 200 }, { dm: c.id });
    H.standUp(g, ev, now);
    const before = c.rel;
    await H.sendDM(c.id, 'désolé, j’ai reçu aucune notif');
    return { judged: c.lapin.judged, rel: c.rel - before, mem: c.mem.map((m) => m.t).join(' | '), n: c.lapins };
  });
  await idle(page);
  await G(page, () => { delete window.__mockExcuse; });
  check('une excuse qui ne passe pas : rien de rendu, et ça se retient', t11.judged === 'no' && t11.rel <= 1 && /n’y crois pas/.test(t11.mem) && t11.n === 1, t11);

  const t12 = await G(page, () => {
    const H = window.__hype, g = H.S.game, now = Date.now(), c = Object.values(g.chars).find((x) => x.handle === 'leandre.aube');
    const ev = H.addEvent(g, { by: c.handle, kind: 'rdv', what: 'un thé chez Aube', in: 300 }, { dm: c.id });
    ev.due = now + 50 * 60000; ev.at = now - 20 * 60000;
    const ev2 = H.addEvent(g, { by: c.handle, kind: 'rdv', what: 'un défi d’échecs', in: 900 }, { dm: c.id });
    if (ev2) { ev2.due = now + 30 * 60000; ev2.at = now - 60000; }
    return { ok: !!ev, ok2: !!ev2, id: ev.id, id2: ev2 && ev2.id };
  });
  await sleep(2600);
  const t13 = await G(page, (ids) => {
    const g = window.__hype.S.game, ev = g.events.find((e) => e.id === ids.id), ev2 = g.events.find((e) => e.id === ids.id2);
    const soon = g.notifs.filter((n) => n.k === 'event' && /Dans .* : ton rendez-vous avec Léandre/.test(n.text));
    ev.due = Date.now() - 1000;
    return { soon: soon.length, said: ev.soonSaid, fresh: ev2 ? !ev2.soonSaid : true };
  }, t12);
  await sleep(2600);
  const t14 = await G(page, () => window.__hype.S.game.notifs.filter((n) => n.k === 'eventdue' && /Léandre/.test(n.text)).length);
  check('un rappel une heure avant (pas pour un rendez-vous pris à l’instant), et l’heure reste dans la cloche', t12.ok && t13.soon === 1 && t13.said && t13.fresh && t14 === 1, { t12, t13, t14 });
  await clear(page);

  /* ---------- « Maintenant » ---------- */
  const t15 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    g.releases = g.releases.filter((r) => r.state !== 'scheduled');
    const r = H.scheduleRelease(g, { what: 'vidéo', topic: 'Tout de suite', now: true, due: Date.now() });
    const prog = g.notifs.some((n) => /Tout de suite/.test(n.text) && /programm/.test(n.text));
    const trig = (g.triggers || []).some((x) => /Tout de suite/.test(x.text));
    const ctx = H.ctxText(g, {});
    const f0 = g.stats.followers, rep0 = g.stats.reputation;
    H.dropRelease(g, r, true);
    const r2 = H.scheduleRelease(g, { what: 'vidéo', topic: 'Avance rapide', due: Date.now() + 5 * 3600000 });
    H.advanceRelease(g, r2, Date.now());
    const r3 = H.scheduleRelease(g, { what: 'vidéo', topic: 'Avance attendue', due: Date.now() + 5 * 3600000 });
    r3.at = Date.now() - 2 * 3600000;
    H.advanceRelease(g, r3, Date.now());
    g.releases = g.releases.filter((r) => r.state !== 'scheduled');
    return { now: r.now, prog, trig, said: /sans l’avoir annoncé/.test(ctx), state: r.state, dF: g.stats.followers - f0, dRep: g.stats.reputation - rep0, fast: (g.triggers || []).some((x) => /Avance rapide/.test(x.text) && /Bonne surprise/.test(x.text)), slow: (g.triggers || []).some((x) => /Avance attendue/.test(x.text) && /Bonne surprise/.test(x.text)), r2now: r2.now };
  });
  check('« Maintenant » : jamais annoncé, jamais regretté', t15.now === 1 && !t15.prog && !t15.trig && t15.said && t15.state === 'dropped' && t15.dF === 0 && t15.dRep === 0, t15);
  check('avancée dans la foulée : pas de « bonne surprise » pour personne', !t15.fast && t15.slow && t15.r2now === 1, t15);
  await G(page, () => { window.__hype.openLayer({ t: 'series', id: 'single' }); window.__hype.update(); });
  await page.waitForSelector('text=⚡ Maintenant');
  await page.locator('.chip-btn', { hasText: '⚡ Maintenant' }).first().click();
  await page.fill('#se-theme', 'je goûte la potion verte');
  await sleep(300);
  const hourShown = await page.locator('text=Heure de sortie').count();
  await shot(page, 'maintenant');
  await page.locator('button.btn-hot', { hasText: /Tourner maintenant/ }).first().click();
  await sleep(800);
  const t16 = await G(page, () => { const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.topic === 'je goûte la potion verte'); return { r: !!r, now: r && r.now, shoot: H.S.stack.some((l) => l.t === 'minigame' && r && l.id === r.id) }; });
  check('dans le Studio : « ⚡ Maintenant », puis droit au tournage', hourShown === 0 && t16.r && t16.now === 1 && t16.shoot, { hourShown, t16 });
  await clear(page);
  await G(page, () => { const g = window.__hype.S.game; g.releases = g.releases.filter((r) => r.state !== 'scheduled'); });

  /* ---------- brands and likes ---------- */
  const t17 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    g.stats.followers = 107000;
    const keep = g.career.log;
    g.career.log = [8000, 8500].map((v, k) => ({ at: t - (20 - k) * 86400000, what: 'short', views: v })).concat([150000, 210000, 120000, 300000, 180000].map((v, k) => ({ at: t - (10 - k) * 86400000, what: 'short', views: v, viral: true })));
    const ev = H.expectedViews(g, 'short'), fee = H.dealFee(g, 'short');
    g.career.log = keep;
    return { ev, fee };
  });
  check('les marques paient sur ce que tu fais aujourd’hui (les cartons comptent, plafonnés)', t17.ev > 50000 && t17.ev < 70000 && t17.fee > 150, t17);
  const t18 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const out = [];
    for (const what of ['short', 'vidéo', 'live']) {
      const r = { id: 'rl_cap_' + what, what, topic: 'cap', state: 'scheduled', due: Date.now(), crew: [] };
      const ctx = { g, video: { r, tier: 'top', score: 0.95, diff: 'cauchemar', form: {} }, boosts: {} };
      const o = { likes: 900000, reposts: 40000, fol: 300000, viral: false };
      H.releaseEarly(ctx, o);
      out.push({ what, views: ctx.vearly, likes: o.likes, fol: o.fol });
    }
    return out;
  });
  check('pour tous les formats, jamais plus de likes ni d’abonnés que les vues le permettent', t18.every((x) => x.views > 0 && x.likes <= Math.ceil(x.views * 0.38) + 1 && x.fol <= Math.ceil(x.views * 0.06) + 1), t18);

  /* ---------- texts for the AI, the crowd, the time played ---------- */
  const t19 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    g.stats.followers = 107000;
    const pub = H.ctxText(g, { kind: 'public' });
    return { priv: /Le joueur y est toujours « tu »/.test(H.RULES_PRIVATE), adult: /pas de « un client adulte »/.test(H.RULES_PRIVATE), crowd: /au moins 4 nouveaux figurants/.test(pub) };
  });
  check('les gestes : la 3e personne pour eux, « tu » pour le joueur ; plus d’inconnus dans une grosse foule', t19.priv && t19.adult && t19.crowd, t19);
  await G(page, () => { window.__hype.S.lastInputAt = Date.now(); window.__hype.S.game.stats.playMs = 0; });
  await sleep(3200);
  const t20 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const played = g.stats.playMs;
    const old = JSON.parse(JSON.stringify(g));
    delete old.stats.playMs; delete old.stats.playEst;
    H.migrate(old);
    return { played, est: old.stats.playEst, estMs: old.stats.playMs, fmt: H.fmtPlay(2 * 3600000 + 5 * 60000) };
  });
  check('le temps de jeu se compte (et s’estime pour une partie d’avant)', t20.played >= 2000 && t20.est === 1 && t20.estMs > 0 && t20.fmt === '2 h 05 min', t20);
  await G(page, () => { const H = window.__hype; H.S.tab = 'profile'; H.update(); });
  await sleep(500);
  const pt = await page.locator('.play-time').count();
  check('le profil montre le temps de jeu', pt === 1, { pt });
  await shot(page, 'profil-temps');

  /* ---------- part 2: clashes and the toxic reputation ---------- */
  await clear(page);
  await G(page, () => { const H = window.__hype, g = H.S.game; g.stats.followers = 12000; g.stats.tox = 0; g.stats.toxShare = 0; g.stats.toxLog = []; H.update(); });
  const zpost = await G(page, () => { const g = window.__hype.S.game, z = Object.values(g.chars).find((c) => c.handle === 'zara.vey'); const p = g.posts.find((x) => x.a === 'c:' + z.id); return p && p.id; });
  await G(page, () => { window.__mockTox = { tox: 2, riposte: true, reception: 6, controversy: 8 }; window.__mockKindness = -4; });
  const c1 = await G(page, async (pid) => { const H = window.__hype, g = H.S.game, rep0 = g.stats.reputation, p = g.posts.find((x) => x.id === pid); await H.runAct('reply', 'ta tenue de duel ressemble à un rideau de douche, Zara', p); return { rep0, pid }; }, zpost);
  await idle(page);
  const c1b = await G(page, (a) => { const g = window.__hype.S.game; return { dRep: Math.round((g.stats.reputation - a.rep0) * 10), tox: g.stats.tox, log: (g.stats.toxLog || []).map((x) => x.why).join(' | ') }; }, c1);
  check('une riposte réussie, même violente : pas de perte de réputation, la toxique monte un peu', c1b.dRep >= 0 && c1b.tox > 0 && c1b.tox <= 2.5 && /clash/.test(c1b.log), c1b);

  await G(page, () => { window.__mockTox = { tox: 2, riposte: false, reception: 3, controversy: 8 }; window.__mockKindness = -4; });
  const c2 = await G(page, async () => { const H = window.__hype, g = H.S.game, a = { rep0: g.stats.reputation, tox0: g.stats.tox, f0: g.stats.followers }; await H.runAct('post', 'franchement les gens de Marée sont tous des losers, désolé pas désolé'); return a; });
  await idle(page);
  const c2b = await G(page, (a) => { const g = window.__hype.S.game; return { dRep: Math.round((g.stats.reputation - a.rep0) * 10), dTox: g.stats.tox - a.tox0, share: g.stats.toxShare }; }, c2);
  check('une attaque gratuite : la réputation baisse, la toxique monte plus', c2b.dRep < 0 && c2b.dTox >= 2, c2b);

  await G(page, () => { window.__mockTox = { tox: 3, riposte: false, cible: 'zara.vey', reception: 7, controversy: 9 }; window.__mockKindness = -5; });
  const c3 = await G(page, async () => { const H = window.__hype, g = H.S.game, z = Object.values(g.chars).find((c) => c.handle === 'zara.vey'); const a = { rep0: g.stats.reputation, tox0: g.stats.tox, cash0: g.career.cash, rel0: z.rel, n0: g.posts.length }; await H.runAct('post', 'top 10 des fois où @zara.vey a été la pire de toute l’académie'); return a; });
  await idle(page);
  const c3b = await G(page, (a) => {
    const g = window.__hype.S.game, z = Object.values(g.chars).find((c) => c.handle === 'zara.vey'), mine = g.posts.filter((p) => p.a === 'p').sort((x, y) => y.ts - x.ts)[0];
    return { dRep: Math.round((g.stats.reputation - a.rep0) * 10), dTox: g.stats.tox - a.tox0, removed: !!mine.removed, strikes: (g.mod && g.mod.net || []).length, dRel: z.rel - a.rel0, mem: z.mem.map((m) => m.t).join(' | '), cash: g.career.cash - a.cash0, notes: g.notifs.slice(-30).map((n) => n.text).join(' | ') };
  }, c3);
  check('du harcèlement : jamais récompensé, retiré, la personne visée porte plainte', c3b.dRep < 0 && c3b.dTox >= 6 && c3b.removed && c3b.strikes === 1 && c3b.dRel < 0 && /me harcèle/.test(c3b.mem) && c3b.cash < 0 && /retire ton post/.test(c3b.notes) && /porte plainte pour harcèlement/.test(c3b.notes), c3b);
  await clear(page);
  await G(page, () => { const H = window.__hype; H.S.tab = 'feed'; H.update(); });
  for (let k = 0; k < 20 && !(await page.locator('.chip.bad', { hasText: 'Retiré pour harcèlement' }).count()); k++) { await sleep(400); await G(page, () => window.__hype.update()); } // (the result shows a moment after the replies)
  const dbgp = await G(page, () => { const H = window.__hype, g = H.S.game, now = Date.now(); return g.posts.filter((p) => p.a === 'p').slice(0, 3).map((p) => ({ pending: p.pending, res: !!p.res, dt: p.res ? p.res.revealAt - now : null, removed: !!p.removed, Snow: H.S.now - now })); });
  check('le post retiré le dit', await page.locator('.chip.bad', { hasText: 'Retiré pour harcèlement' }).count() >= 1, dbgp);
  await shot(page, 'retire-harcelement');
  await G(page, () => { delete window.__mockTox; delete window.__mockKindness; });

  const c4 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    H.modStrike(g, false, 'ton post', t); const cut = H.modCut(g, false, t);
    H.modStrike(g, true, 'ta vidéo « a »', t); H.modStrike(g, true, 'ta vidéo « b »', t); H.modStrike(g, true, 'ta vidéo « c »', t);
    const susp = H.suspended(g, t);
    const r = H.scheduleRelease(g, { what: 'vidéo', topic: 'Pendant la suspension', due: t + 3600000 });
    return { cut, susp, r: !!r, until: g.mod.susp.until - t };
  });
  check('la modération : visibilité réduite, puis chaîne suspendue quelques jours (jamais supprimée)', c4.cut === 0.5 && c4.susp && !c4.r && c4.until > 2 * 86400000 && c4.until <= 3 * 86400000 + 1000, c4);
  const c5 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    g.mod.susp.until = t - 1000; // over (the release planned before waits)
    g.mod.susp.from = t - 3 * 86400000;
    const ok = H.tickToxic(g, t);
    return { ok, done: g.mod.susp.done, back: g.notifs.slice(-3).some((n) => /de retour/.test(n.text)) };
  });
  check('la suspension se termine toute seule', c5.ok && c5.done === 1 && c5.back, c5);

  const c6 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    g.stats.tox = 70; g.stats.followers = 40000; g.career.offerAt = 0;
    for (const d of g.deals) if (d.state === 'offer') d.state = 'expired';
    const L = H.refreshCareerLines(g).lines.join('\n');
    const normal = H.dealFee(g, 'vidéo');
    const d = H.makeOffer(g, { brand: 'MoonCoin', sector: 'crypto', product: 'son jeton « x100 garanti »', what: 'vidéo', contact: 'Rayan Kaci', g: 'm', text: 'yo, on a un deal pour toi' });
    return { lines: /seules|marques sérieuses ne le contactent plus/.test(L), banned: !!(d && d.banned), fee: d && d.fee, normal, k: H.toxFeeK(g), p: H.toxBannedP(g) };
  });
  check('infréquentable : seules les marques louches viennent, et elles paient bien plus', c6.lines && c6.banned && c6.fee >= c6.normal * 1.3 && c6.k > 2 && c6.p >= 0.9, c6);

  await G(page, () => { window.__mockSincerity = 9; });
  const c7 = await G(page, async () => { const H = window.__hype, g = H.S.game; g.stats.toxShare = 0.4; const a = { tox0: g.stats.tox, f0: g.stats.followers }; await H.runAct('post', 'Je vous dois des excuses. J’ai été odieuse, surtout avec Zara. Je vais changer.', null, null, { apology: true }); return a; });
  await idle(page);
  await G(page, () => { delete window.__mockSincerity; });
  const c7b = await G(page, (a) => { const g = window.__hype.S.game; return { dTox: g.stats.tox - a.tox0, share: g.stats.toxShare, notes: g.notifs.slice(-25).map((n) => n.text).join(' | ') }; }, c7);
  check('des excuses sincères : la toxique redescend, les fans toxiques te lâchent', c7b.dTox <= -8 && c7b.share < 0.4 && /fans toxiques/.test(c7b.notes), c7b);

  const c8 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    g.stats.tox = 40; g.stats.toxAt = t - 3 * 86400000; g.stats.toxDecayAt = 0;
    H.tickToxic(g, t);
    return { tox: g.stats.tox };
  });
  check('elle redescend doucement quand on se calme', c8.tox < 39 && c8.tox > 37, c8);

  const c9 = await G(page, () => {
    const H = window.__hype, g = H.S.game, z = Object.values(g.chars).find((c) => c.handle === 'zara.vey');
    z.vibe = 'nemesis';
    const p = g.posts.find((x) => x.a === 'c:' + z.id);
    const P = H.promptAct(g, 'reply', 'tu vas voir', p, {}, null, {});
    return { tox: /tox 0-3/.test(P), feud: /compte comme une riposte/.test(P), ctx: H.toxCtx(g, 'public') || '' };
  });
  check('l’IA lit la toxicité, la riposte, la guerre ouverte (et ses trolls restent jamais haineux)', c9.tox && c9.feud && /jamais d’insulte discriminatoire/.test(c9.ctx), c9);
  await G(page, () => { const H = window.__hype; H.S.tab = 'profile'; H.update(); });
  await sleep(600);
  const c10 = await page.locator('.tox-sec').count();
  await shot(page, 'reputation-toxique');
  check('le profil montre la réputation toxique et ses effets', c10 === 1 && await page.locator('.tox-kv').count() === 1, { c10 });

  /* ---------- part 3: the traitors, the cast without a limit ---------- */
  await clear(page);
  await G(page, () => { const g = window.__hype.S.game; g.stats.tox = 40; window.__traitPick = { handle: 'cassio.rhune', kind: 'seduction' }; window.__psy2 = false; });
  await G(page, () => window.__hype.genNewChar(null, 'une transférée de l’école rivale qui veut une collab'));
  await idle(page);
  const r1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = Object.values(g.chars).find((x) => x.handle === 'cassio.rhune');
    const T = c && H.traitOf(g, c), pr = window.__prompts.filter((x) => x.includes('nouveau personnage débarque')).slice(-1)[0] || '';
    return { c: !!c, kind: T && T.kind, why: /une transférée de l’école rivale/.test(pr), toxic: /réputation toxique : le nouveau venu y est attiré/.test(pr), dm: c ? /JOUE LA COMÉDIE/.test(H.promptDM(g, c, [], 'salut toi')) && /"t":"traitre"/.test(H.promptDM(g, c, [], 'salut toi')) : false };
  });
  check('un nouveau venu amené par l’histoire (attiré par la réputation toxique) peut jouer la comédie', r1.c && r1.kind === 'seduction' && r1.why && r1.toxic && r1.dm, r1);
  await G(page, () => { window.__traitPick = null; });

  const r2 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now(), c = Object.values(g.chars).find((x) => x.handle === 'cassio.rhune'), T = H.traitOf(g, c);
    const s0 = H.traitStage(g, T, t);
    c.vibe = 'couple';
    const s1 = H.traitStage(g, T, t);
    T.hookAt = t - 3 * 86400000; T.at = t - 5 * 86400000;
    const s2 = H.traitStage(g, T, t);
    const f0 = g.stats.followers;
    const how = H.traitBetray(g, T, t);
    return { s0, s1, s2, how, done: T.done, vibe: c.vibe, loss: f0 - g.stats.followers, note: g.notifs.slice(-6).some((n) => /t’a trahi/.test(n.text)), trig: (g.triggers || []).some((x) => /cassio\.rhune/.test(x.text)) };
  });
  check('la séduction intéressée : l’approche, l’accroche (en couple), puis le coup de couteau', r2.s0 === 0 && r2.s1 === 1 && r2.s2 === 2 && ['vend', 'trompe'].includes(r2.how) && r2.done === 'betrayed' && r2.vibe === 'ex' && r2.loss > 0 && r2.note && r2.trig, r2);

  const r3 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now(), c = Object.values(g.chars).find((x) => x.handle === 'leandre.aube');
    const T = H.maybeTraitor(g, c, t, { p: 1, kind: 'faux' });
    const s = H.addSecret(g, 'j’ai acheté mes premiers abonnés', 2);
    H.learnSecret(g, s, c, 'confie');
    c.rel = 60; T.hookAt = t - 4 * 86400000; T.at = t - 6 * 86400000;
    const how = H.traitBetray(g, T, t);
    return { kind: T.kind, how, out: !!s.out, vibe: c.vibe, note: g.notifs.slice(-8).some((n) => /couteau dans le dos/.test(n.text)) };
  });
  check('le faux pote : il récolte les confidences, puis les balance', r3.kind === 'faux' && r3.how === 'secret' && r3.out && r3.vibe === 'nemesis' && r3.note, r3);

  const r4 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now(), c = Object.values(g.chars).find((x) => x.handle === 'oskar.brume') || Object.values(g.chars).find((x) => x.handle === 'theo.marlin');
    const T = H.maybeTraitor(g, c, t, { p: 1, kind: 'seduction' });
    c.vibe = 'flirt'; T.hookAt = 0;
    c.vibe = 'couple'; H.traitStage(g, T, t);
    c.vibe = null; // the player walked away in time
    H.tickTraitors(g, t + 1000);
    return { done: T.done };
  });
  check('rompre avant le coup de couteau le déjoue', r4.done === 'foiled', r4);

  await G(page, () => { window.__mockOnce = [{ has: 'JOUE LA COMÉDIE', lines: [{ t: 'msg', text: 'quoi ? mais… ok. ok, j’avoue.' }, { t: 'traitre', text: 'a supprimé une story où on la voyait avec ton ennemi' }, { t: 'demasque' }, { t: 'rel', d: -5, why: 'démasqué·e' }] }]; });
  const r5 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, t = Date.now(), c = Object.values(g.chars).find((x) => x.handle === 'ada.quill') || Object.values(g.chars).find((x) => x.handle === 'remi.sol');
    c.unlocked = true;
    H.maybeTraitor(g, c, t, { p: 1, kind: 'faux' });
    await H.sendDM(c.id, 'je sais que tu racontes tout à Zara, j’ai vu tes messages');
    return { id: c.id };
  });
  await idle(page);
  const r5b = await G(page, (a) => { const H = window.__hype, g = H.S.game, c = g.chars[a.id], T = (g.traitors || []).find((x) => x.c === c.id); return { done: T && T.done, clue: (g.clues || []).some((k) => k.c === c.id && k.trait), note: g.notifs.slice(-6).some((n) => /vu clair dans le jeu/.test(n.text)) }; }, r5);
  check('le démasquer avec des faits : ses petits signes notés, et son plan tombe', r5b.done === 'unmasked' && r5b.clue && r5b.note, r5b);
  await G(page, () => { delete window.__mockOnce; });

  const r6 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    g.stats.tox = 70;
    const old = g.psy && g.psy.c;
    g.psy.out = 'unmasked';
    window.__psy2 = true; window.__traitNone = true;
    const c = Object.values(g.chars).find((x) => x.handle === 'lou.cendre') || Object.values(g.chars).find((x) => x.handle === 'remi.sol');
    const r = H.newcomerRoll(g, c);
    const out = { r, second: g.psy.second, newOne: g.psy.c === c.id, past: (g.psyPast || []).some((p) => p.c === old) };
    window.__psy2 = false; window.__traitNone = false;
    return out;
  });
  check('infréquentable, le psychopathe démasqué : un nouveau venu peut en être un autre', r6.r === 'psy' && r6.second === 1 && r6.newOne && r6.past, r6);

  const k1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    g.stats.tox = 0;
    for (const c of H.mains(g, false)) { c.unlocked = true; c.unlockedAt = c.unlockedAt || t; } // (all of the cast there: more than ten)
    const all = H.mains(g, true, true);
    for (const c of all) { if (H.isPsy(g, c) || c.fixed) continue; c.lastTouch = t - 10 * 86400000; c.unlockedAt = t - 10 * 86400000; delete c.wokeAt; if (!['couple', 'ex', 'nemesis'].includes(c.vibe)) { c.rel = Math.min(c.rel, 20); c.vibe = null; } }
    for (const e of g.events) if (e.state === 'scheduled') e.state = 'done';
    for (const iv of g.invites || []) iv.state = 'expired';
    const n0 = H.mains(g).length;
    g.castAt = 0; H.tickCast(g, t); g.castAt = 0; H.tickCast(g, t); g.castAt = 0; H.tickCast(g, t);
    const asleep = H.mains(g, true, true).filter((c) => c.asleep);
    const ctx = H.ctxText(g, { kind: 'public' }), cast = ctx.split('## PERSONNAGES PRINCIPAUX')[1].split('## LE JOUEUR')[0];
    return { n0, n1: H.mains(g).length, asleep: asleep.map((c) => c.handle), inCtx: asleep.some((c) => cast.includes('@' + c.handle + ' ')) };
  });
  check('ceux à qui tu ne parles plus passent « en retrait » : hors des appels de l’IA (jamais moins de 10 éveillés)', k1.asleep.length >= 1 && k1.n1 >= 10 && k1.n1 < k1.n0 && !k1.inCtx, k1);
  const k2 = await G(page, async (hs) => {
    const H = window.__hype, g = H.S.game, a = H.charByHandle(g, hs[0]), b = hs[1] && H.charByHandle(g, hs[1]);
    await H.sendDM(a.id, 'hey, ça fait longtemps !');
    const byDm = !a.asleep;
    let byAi = null;
    if (b) { H.resolveAuthor(g, b.handle, b.name, ''); byAi = !b.asleep; }
    return { byDm, byAi };
  }, k1.asleep);
  await idle(page);
  check('ils reviennent dès que tu leur écris (ou que l’IA les fait parler)', k2.byDm && k2.byAi !== false, k2);
  await G(page, () => { const H = window.__hype; H.S.tab = 'profile'; H.update(); });
  await sleep(500);
  const k3 = await page.locator('.rel-row', { hasText: 'en retrait' }).count();
  check('le profil les montre « en retrait »', k3 >= 1 || k1.asleep.length <= 2, { k3 });

  const k4 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    g.stats.level = Math.max(2, g.stats.level); g.lastArrival = t - 2 * 86400000; delete g.arrival; g.pendingCast = null;
    const L = H.refreshCareerLines(g).lines.join('\n');
    const eff = [];
    H.applyCareerLine(g, { t: 'arrivee', why: 'un streameur qui veut sa revanche' }, eff);
    for (const f of eff) f();
    return { line: /"t":"arrivee"/.test(L), queued: !!g.arrival, n0: Object.keys(g.chars).length };
  });
  await sleep(2500);
  await idle(page);
  const k5 = await G(page, (a) => { const H = window.__hype, g = H.S.game, pr = window.__prompts.filter((x) => x.includes('nouveau personnage débarque')).slice(-1)[0] || ''; return { n1: Object.keys(g.chars).length, why: /un streameur qui veut sa revanche/.test(pr), left: !!g.arrival }; }, k4);
  check('l’histoire fait arriver quelqu’un de nouveau, sans limite de persos', k4.line && k4.queued && k5.why && !k5.left, { k4, k5 });

  /* ---------- part 4: the romance (sensual by default, modest as an option) ---------- */
  await clear(page);
  const m1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin'), t = Date.now();
    c.asleep = undefined; c.vibe = 'flirt'; c.coeur = 'impulsif'; c.pace = { at: t - 3600000, v: 'flirt' };
    const imp = H.intimacyLv(g, c, t);
    c.coeur = 'prudent'; const pru1h = H.intimacyLv(g, c, t);
    c.vibe = 'couple'; c.pace = { at: t - 5 * 86400000, v: 'couple' }; const pru5d = H.intimacyLv(g, c, t);
    c.coeur = 'forteresse'; c.pace = { at: t - 2 * 86400000, v: 'couple' }; const for2d = H.intimacyLv(g, c, t);
    c.coeur = 'serein'; c.vibe = 'couple'; c.pace = { at: t - 4 * 86400000, v: 'couple' };
    const P = H.promptDM(g, c, [], 'tu me manques');
    return { imp, pru1h, pru5d, for2d, rules: !/Romance pudique seulement/.test(H.RULES), block: /## INTIMITÉ \(mode sensuel/.test(P) && /Intimité avec Théo/.test(P) && /jamais un mur/.test(P), sens: H.sensual(g) };
  });
  check('la romance sensuelle par défaut : le rythme suit le cœur (l’impulsif tout de suite, le prudent plus tard, la forteresse très tard)', m1.sens && m1.imp === 2 && m1.pru1h === 0 && m1.pru5d === 2 && m1.for2d < 2 && m1.rules && m1.block, m1);

  const ev1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin');
    c.dates = Math.max(2, c.dates || 0); c.cool = null; c.vibe = 'couple';
    g.events = (g.events || []).filter((e) => !(e.player && e.state === 'scheduled'));
    const ev = H.addEvent(g, { by: 'theo.marlin', what: 'une soirée chez lui, un film et un plaid', kind: 'rdv', in: 2 });
    ev.due = Date.now() - 60000;
    return ev.id;
  });
  await G(page, (id) => window.__hype.openTalk(window.__hype.S.game.events.find((e) => e.id === id)), ev1);
  await idle(page);
  await G(page, () => { window.__mockOnce = [{ has: 'LE RENDEZ-VOUS, EN VRAI', lines: [{ t: 'judge', react: 'charme' }, { t: 'say', text: 'Viens là… J’attendais que tu le proposes.', seen: 'il te prend la main et t’attire vers lui' }, { t: 'fade' }] }]; });
  const m2 = await G(page, async (id) => {
    const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === id), n0 = window.__prompts.length;
    await H.talkTurn(ev, '/me l’embrasse et le guide vers la chambre… on fait l’amour ?');
    const c = H.charByHandle(g, 'theo.marlin'), T = ev.talk, pr = window.__prompts.slice(n0).find((x) => x.includes('LE RENDEZ-VOUS, EN VRAI')) || '';
    return { asked: window.__prompts.length > n0, cutLine: /si ça va jusqu’au sexe/.test(pr), ell: T.ell || 0, faded: !!T.faded, lines: T.lines.filter((x) => x.who === 'n').map((x) => x.text), intimate: c.intimate && c.intimate.n, mem: c.mem.some((m) => /moment intime/.test(m.t)) };
  }, ev1);
  check('en couple, plus de coupure automatique : le perso répond d’abord, puis « Ce moment ne regarde pas les voyeurs. »', m2.asked && m2.cutLine && (m2.ell === 1 || m2.faded) && m2.lines.some((x) => /voyeurs|leur intimité/.test(x)) && m2.intimate >= 1 && m2.mem, m2);
  await G(page, () => { delete window.__mockOnce; });
  await shot(page, 'soiree-coupure');
  await clear(page);

  const m3 = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'leandre.aube');
    c.vibe = 'flirt';
    const ev = { c: c.id, what: 'un dîner aux chandelles', player: true };
    return { flirt: H.fadeOK(g, c, ev) };
  });
  check('en flirt aussi, ça peut aller jusqu’à la coupure si le perso le veut', m3.flirt, m3);

  const m4 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin'), t = Date.now();
    g.stay = { c: c.id, ev: 'x', where: 'c', at: t - 1000, until: t + 3600000 };
    const P = H.promptDM(g, c, [], 'reste encore un peu…');
    window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'je reste… viens là.' }, { t: 'fade' }, { t: 'rel', d: 2, why: 'un matin à deux' }] }];
    await H.sendDM(c.id, '/me t’attire sous la couette');
    const fades = g.dms[c.id].msgs.filter((m) => m.sys === 'fade').length;
    g.stay = null;
    return { line: /si ça va jusqu’au sexe/.test(P), fades };
  });
  await idle(page);
  await G(page, (h) => { const H = window.__hype; H.openDM(H.charByHandle(H.S.game, h).id); H.update(); }, 'theo.marlin');
  for (let k = 0; k < 25 && !(await page.locator('.dm-fade').count()); k++) await sleep(400); // (the answer comes at the pace of typing)
  const m4b = await page.locator('.dm-fade').count();
  check('ensemble en vrai (le matin), la scène peut couper aussi dans les messages', m4.line && m4.fades === 1 && m4b >= 1, { m4, m4b });
  await shot(page, 'messages-coupure');
  await clear(page);

  const m5 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin');
    g.opts.romance = 'pudique';
    const P = H.promptDM(g, c, [], 'tu me manques');
    g.events = (g.events || []).filter((e) => !(e.player && e.state === 'scheduled'));
    const ev = H.addEvent(g, { by: 'theo.marlin', what: 'une soirée tranquille chez lui', kind: 'rdv', in: 2 });
    ev.due = Date.now() - 60000;
    await H.openTalk(ev);
    return { pudique: /Romance pudique \(le choix du joueur\)/.test(P) && !/## INTIMITÉ/.test(P), id: ev.id };
  });
  await idle(page);
  const m5b = await G(page, async (id) => { const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === id), n0 = window.__prompts.length; await H.talkTurn(ev, 'on couche ensemble ce soir ?'); const r = { noCall: window.__prompts.length === n0, ell: ev.talk.ell || 0, faded: !!ev.talk.faded }; g.opts.romance = 'sensuel'; return r; }, m5.id);
  check('décochée, la romance redevient pudique (et la coupure automatique revient)', m5.pudique && m5b.noCall && (m5b.ell === 1 || m5b.faded), { m5, m5b });
  await clear(page);
  await G(page, () => { window.__hype.openLayer({ t: 'settings' }); window.__hype.update(); });
  await sleep(500);
  check('le réglage est dans les paramètres de la partie', await page.locator('.check-card', { hasText: 'Romance sensuelle' }).count() === 1);
  await clear(page);

  await browser.close();
  const fails = checks.filter((c) => c[0] === 'FAIL');
  const errs = errors.filter((e) => !/favicon|Failed to load resource/.test(e));
  if (errs.length) console.log('ERRORS\n' + errs.join('\n'));
  console.log(`${checks.length - fails.length}/${checks.length} PASS${errs.length ? ` · ${errs.length} erreurs` : ''}`);
  process.exit(fails.length || errs.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
