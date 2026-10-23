// 0.33, in Chromium against the built hype.html with the mocked Claude runtime: les partenariats qui aboutissent, une
// équipe qui vit, des personnages qu’on fait travailler, le contenu sponsorisé partagé, toujours quelqu’un au-dessus.
// - brands decide in the message (a promise kept now), the player's own partnership asked for in its messages (a real
//   offer), a talent who wants to try first comes back with the answer by themselves;
// - a job for someone of the cast (the profile's button or their messages): once or for good, paid, they stay who they
//   are; a bad buzz makes the help count;
// - the team gets better (a release or a day at a time, 6/12/20 steps, at most two releases a day), a Star kept on grows
//   up to +10 points (a graphic designer: +28 % → +38 %), a raise asked at each level (accepted, refused, unanswered),
//   gear to give (what their level asks), a mood with its reasons (late pay, gear, too much work, a raise refused), the
//   end of a rope said, poached by a bigger creator (matched, or gone), a bonus;
// - a guest in a sponsored content (the brand says yes, the player sets the share, the guest says yes, paid at the
//   release; owed if the money is not there), a bigger creator's operation (the invitation says so, the host pays);
// - têtes d’affiche come above the player (the next step missing, one at a time), everyone's audience grows by the day;
// - on a phone, the team and the job sheet fit; without window.__t33 (the suites written before), the team of before.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v33.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v33');
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
const until = async (page, fn, arg, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await G(page, fn, arg)) return true; await sleep(200); } return false; };
const clear = (page) => G(page, () => { const H = window.__hype; H.S.stack = []; H.S.modals.length = 0; H.S.toasts.length = 0; H.update(); });
async function dismiss(page) { for (let k = 0; k < 8 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }
async function overflowCheck(page, label) {
  const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth }));
  if (w.sw > w.cw + 1 || w.bw > w.cw + 1) errors.push(`[overflow] ${label}: ${JSON.stringify(w)}`);
}
async function newPage(browser, viewport, t33 = true) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 700, colorScheme: 'light' });
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript((on) => { window.__hypeEasyGear = true; window.__t32 = true; if (on) window.__t33 = true; }, t33);
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
    g.stats.followers = 5000;
    g.career.cash = 50000;
    H.update();
  });
}
// The game's clock, carried forward to the next h:m (the time really passes).
const goTo = (page, h, m = 0) => G(page, ([h, m]) => { const H = window.__hype, g = H.S.game; const d = new Date(Date.now() + (g.clockOff || 0)); const x = new Date(d.getTime()); x.setHours(h, m, 0, 0); if (x <= d) x.setDate(x.getDate() + 1); H.jumpClock(g, x - d, 'skip'); H.update(); }, [h, m]);

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);
  await goTo(page, 14, 0);

  // ---------- A. the partnerships that stalled ----------
  const a1 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const b = H.addContact(g, { name: 'Lina Brun', brand: 'Potions & Co', role: 'Partenariats · Potions & Co', g: 'f' });
    g.dms[b.id] = { msgs: [{ id: 'mb0', me: false, text: 'Bonjour ! Je gère les partenariats de Potions & Co.', ts: Date.now() - 3600000, at: Date.now() - 3600000 }], readAt: Date.now() };
    const p = H.promptDM(g, b, [], 'x');
    const own = H.dmCareerLines(g, b).find((x) => x.includes('"t":"offre"')) || '';
    window.__brand = b.id;
    return { now: /répond tout de suite, à toute heure/.test(p), promise: /avait promis de revenir vers le joueur.*c’est maintenant/.test(p), own: !!own, noLater: /jamais « je reviens vers vous »/.test(own) };
  });
  check('a brand: told to answer now, and to keep now a promise made before; asked for a partnership of the player’s own, it may make one (never « je reviens vers vous »)', a1.now && a1.promise && a1.own && a1.noLater, a1);
  const a2 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, b = g.chars[window.__brand], n = g.deals.length;
    g.stats.followers = 60000; // (an audience brands pay in money)
    window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'Avec plaisir ! Voilà ce qu’on te propose.' }, { t: 'offre', what: 'vidéo', product: 'notre élixir de concentration', fee: 250 }] }];
    await H.sendDM(b.id, 'Bonjour ! Vous auriez un partenariat pour moi ?', { now: true });
    return n;
  });
  await idle(page);
  const a2b = await G(page, (n) => {
    const H = window.__hype, g = H.S.game, b = g.chars[window.__brand], d = g.deals.slice(-1)[0], cv = g.dms[b.id];
    const card = cv.msgs.filter((m) => m.sys === 'deal' && m.deal === (d && d.id)).length, pitch = cv.msgs.filter((m) => !m.me && !m.sys && /Je gère les partenariats/.test(m.text || '')).length;
    const why = H.ownAskWhy(g, b); g.stats.followers = 500; const small = H.ownAskWhy(g, b); g.stats.followers = 5000;
    return { added: g.deals.length - n, contact: d && d.contact === b.id, state: d && d.state, product: d && d.product, fee: d && d.fee, card, pitch, why, small };
  }, a2);
  check('the player asks a brand for a partnership of their own: its AI makes a real offer (in its messages, a card, no second pitch); one open, no other; under 800 subscribers, none', a2b.added === 1 && a2b.contact && a2b.state === 'offer' && a2b.product === 'notre élixir de concentration' && a2b.fee > 0 && a2b.card === 1 && a2b.pitch === 1 && a2b.why === 'open' && a2b.small === 'small', a2b);
  const a3 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, b = g.chars[window.__brand], theo = H.charByHandle(g, 'theo.marlin');
    const r = H.createGroup(g, [b.id, theo.id], 'Partenariat', '💬');
    if (!r.ok) return { ok: false, why: r.why };
    const n = window.__prompts.length;
    await H.sendGroup(r.gr.id, 'Alors, on le fait ce partenariat ?');
    const P = window.__prompts.slice(n).find((p) => p.includes('LE GROUPE DE DISCUSSION')) || '';
    return { ok: true, now: /@clemence|répond tout de suite|répondent tout de suite/.test(P) && /décide dans ce message/.test(P) && /jamais « je reviens vers vous »/.test(P) };
  });
  await idle(page);
  check('in a group too, the brand decides in the message (never « on attend le feu vert »)', a3.ok && a3.now, a3);
  // a talent who wants to try it first
  const a4 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, t = Date.now(), theo = H.charByHandle(g, 'theo.marlin'), A = H.agencyOf(g), b = g.chars[window.__brand];
    theo.followers = 40000;
    A.talents.push({ c: theo.id, state: 'on', cut: 15, at: t, since: t });
    const d = H.makeTalentOffer(g, theo, { brand: 'Studio Lanterne', product: 'leur nouveau jeu de plateau' });
    if (!d) return { ok: false };
    H.askTalentDeal(g, d);
    const p = H.promptDM(g, theo, [], 'x');
    window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'je veux d’abord tester le jeu, je te dis ça vite' }, { t: 'plus_tard', h: 2, why: 'tester le jeu' }] }];
    await H.sendDM(theo.id, 'Studio Lanterne te propose un partenariat, ça te dit ?', { now: true });
    window.__td = d.id;
    return { ok: true, line: p.includes('"t":"plus_tard"'), state: d.state };
  });
  await idle(page);
  const a4b = await G(page, () => { const H = window.__hype, g = H.S.game, d = g.agency.deals.find((x) => x.id === window.__td); return { follow: d && d.followAt ? Math.round((d.followAt - Date.now()) / 60000) : null, why: d && d.followWhy, state: d && d.state }; });
  await G(page, () => {
    const H = window.__hype, g = H.S.game, d = g.agency.deals.find((x) => x.id === window.__td);
    window.__mockOnce = [{ has: 'revient vers le joueur, son agent, avec sa décision', lines: [{ t: 'dm', by: 'theo.marlin', text: 'J’ai testé le jeu : c’est oui !' }, { t: 'partenariat', by: 'theo.marlin', ok: true, why: 'le jeu est génial' }] }];
    H.jumpClock(g, d.followAt - Date.now() + 60000, 'skip'); H.update();
  });
  const a4c = await until(page, () => { const H = window.__hype, g = H.S.game, d = g.agency.deals.find((x) => x.id === window.__td); return d && d.state !== 'ask'; }, null, 25000);
  await idle(page);
  const a4d = await G(page, () => { const H = window.__hype, g = H.S.game, d = g.agency.deals.find((x) => x.id === window.__td), theo = H.charByHandle(g, 'theo.marlin'); return { state: d.state, followed: !!d.followed, dm: (g.dms[theo.id] || { msgs: [] }).msgs.some((m) => m.text === 'J’ai testé le jeu : c’est oui !'), asked: window.__prompts.some((p) => p.includes('OBLIGATOIRE : @theo.marlin revient vers le joueur')) }; });
  check('a talent who wants to try it first says for when (2 h), and comes back by themselves with the answer (a refresh, its line due): signed', a4.ok && a4.line && a4b.follow >= 115 && a4b.follow <= 121 && a4b.why === 'tester le jeu' && a4c && a4d.state === 'signed' && a4d.followed && a4d.dm && a4d.asked, Object.assign({}, a4, a4b, a4d));
  await clear(page);

  // ---------- B. a job for someone of the cast ----------
  await G(page, () => { const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin'); theo.badBuzz = { until: Date.now() + 2 * 86400000, reason: 'une vieille vidéo ressortie', loss: 200 }; H.openLayer({ t: 'char', id: theo.id }); });
  await page.waitForSelector('.prof-job');
  await page.click('.prof-job');
  await page.waitForSelector('.hire-pay input');
  await shot(page, 'hire-sheet');
  const b1 = await G(page, () => { const L = document.querySelectorAll('.layer-panel'), top = L[L.length - 1]; return { on: (top.querySelector('.role-opt.on') || {}).textContent || '', seg: [...top.querySelectorAll('.seg button')].map((x) => x.textContent) }; });
  await page.fill('.hire-pay input', '60');
  await page.locator('.layer-panel button', { hasText: /Écrire à Théo/ }).last().click();
  await sleep(500);
  const b2 = await G(page, () => { const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin'); const p = H.promptDM(g, theo, [], H.S.drafts.dm[theo.id] || ''); return { draft: H.S.drafts.dm[theo.id] || '', ask: theo.hireAsk, dm: H.S.stack.some((l) => l.t === 'dm' && l.id === theo.id), ctx: /Le joueur propose à Théo un boulot : graphiste pour sa prochaine sortie, 60/.test(p), line: p.includes('"t":"boulot"'), bb: /un boulot peut tomber à pic/.test(p) }; });
  check('the profile’s button: what (a graphic designer, free), once or for good, how much; the proposal waits in their messages, their AI knows it (and their bad buzz)', /Graphiste/.test(b1.on) && b1.seg.length === 2 && /miniature de ma prochaine vidéo/.test(b2.draft) && /60/.test(b2.draft) && b2.ask && b2.ask.role === 'miniature' && b2.ask.once === true && b2.ask.rate === 60 && b2.dm && b2.ctx && b2.line && b2.bb, Object.assign({}, b1, b2));
  const b3 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin'), rel0 = theo.rel;
    window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'grave, je te fais ça, merci de penser à moi 🥹' }, { t: 'boulot', ok: true, role: 'miniature', rate: 60, once: true, niveau: 1, why: 'ça tombe à pic' }, { t: 'rel', d: 0, why: '' }] }];
    await H.sendDM(theo.id, H.S.drafts.dm[theo.id], { now: true });
    return rel0;
  });
  await idle(page);
  const b3b = await G(page, (rel0) => { const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin'), m = H.memberOf(g, theo); return { m: m && { main: m.main, once: m.once, tier: m.tier, rate: m.rate, role: m.role, gear: m.gear, own: m.ownGear }, kind: theo.kind, role: theo.role, rel: theo.rel - rel0, mem: (theo.mem || []).some((x) => /bad buzz/.test(x.t)), notif: g.notifs.some((n) => /Théo travaille pour toi : graphiste pour ta prochaine sortie, 60/.test(n.text)), bbRel: g.notifs.some((n) => n.k === 'relup' && /du boulot en plein bad buzz/.test(n.text)), ask: theo.hireAsk }; }, b3);
  check('their AI says yes: they work for the player (once, confirmed, 60 € a release), they stay who they are; given work in their bad buzz, it counts (more than a plain job)', b3b.m && b3b.m.main && b3b.m.once && b3b.m.tier === 1 && b3b.m.rate === 60 && b3b.m.role === 'miniature' && b3b.m.own && b3b.kind === 'main' && b3b.role === 'Délégué de Marée' && b3b.rel > 2 && b3b.bbRel && b3b.mem && b3b.notif && !b3b.ask, b3b);
  await G(page, () => { const H = window.__hype, g = H.S.game; H.S.stack = []; H.openLayer({ t: 'char', id: H.charByHandle(g, 'theo.marlin').id }); });
  await page.waitForSelector('.staff-row.in-prof');
  await sleep(400);
  await G(page, () => { const r = document.querySelector('.staff-row.in-prof'); if (r) r.scrollIntoView({ block: 'center' }); });
  await shot(page, 'profile-job');
  const b3c = await G(page, () => { const r = document.querySelector('.staff-row.in-prof'), h = r && r.closest('.section'); return { text: r ? r.textContent : '', head: h ? h.querySelector('h3').textContent : '', btn: !!document.querySelector('.prof-job') }; });
  check('their profile shows the job they do for the player (and no second offer)', /Graphiste · confirmé · 60/.test(b3c.text) && /une fois/.test(b3c.text) && b3c.head === 'Son boulot pour toi' && !b3c.btn, b3c);
  await clear(page);
  const b4 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey');
    const p = H.promptDM(g, zara, [], 'tu voudrais bosser pour moi comme monteuse ? je te paie bien');
    const q = H.promptDM(g, zara, [], 'on se voit ce soir ?');
    return { free: p.includes('"t":"boulot"') && !p.includes('"miniature" :'), plain: !q.includes('"t":"boulot"'), re: H.HIRE_RE.test('tu veux faire ma miniature ? je te paie') };
  });
  check('in their own words too: a job talked of brings the line (the roles still free), not otherwise', b4.free && b4.plain && b4.re, b4);
  const b5 = await G(page, () => {
    const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin'), m = H.memberOf(g, theo), cash = g.career.cash;
    const r = H.scheduleRelease(g, { what: 'vidéo', topic: 'Je teste dix potions du marché', due: Date.now() + 2 * 3600000 });
    const crew = H.payCrew(g, r).slice(), paid = cash - g.career.cash, done = m.doneR === r.id, xp = m.xp;
    const r2 = H.scheduleRelease(g, { what: 'vidéo', topic: 'La potion de la semaine', due: Date.now() + 26 * 3600000 });
    const crew2 = H.payCrew(g, r2).slice();
    H.quitStaff(g, m, 'done');
    g.releases = g.releases.filter((x) => x !== r && x !== r2);
    return { crew, paid, done, xp, crew2, gone: !H.memberOf(g, theo), kind: theo.kind, notif: g.notifs.some((n) => /Théo a fini son boulot \(graphiste\)/.test(n.text)) };
  });
  check('once: they work on the next release (paid, a step learnt), not on the one after; done, they stay in the player’s life', b5.crew.includes('miniature') && b5.paid === 60 && b5.done && b5.xp === 1 && !b5.crew2.includes('miniature') && b5.gone && b5.kind === 'main' && b5.notif, b5);
  await clear(page);

  // ---------- C. the team gets better ----------
  const c1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, cash = g.career.cash;
    const c = H.addCandidate(g, 'monteur', { tier: 0, name: 'Noé Laroche', g: 'm' });
    c.cand.rate = 50;
    H.hireStaff(g, c);
    const m = H.memberOf(g, c);
    window.__mon = c.id;
    const p0 = H.memberPower(g, m), why = H.moodParts(g, m).map((x) => x.why);
    const ok = H.buyStaffGear(g, m, 1);
    return { gear0: why.includes('pas de matériel fourni'), p0, ok, gear: m.gear, price: cash - g.career.cash, p1: H.memberPower(g, m), notif: g.notifs.some((n) => /Pense à l’équiper : il lui faut du matériel basique/.test(n.text)) };
  });
  check('a new hire comes without gear (it shows: 0.85 of a beginner, and it weighs on their mood); equipped (600 €), they work fully', c1.gear0 && c1.p0 === 0.85 && c1.ok && c1.gear === 1 && c1.price === 600 && c1.p1 === 1 && c1.notif, c1);
  const c2 = await G(page, () => {
    const H = window.__hype, g = H.S.game, m = H.memberOf(g, g.chars[window.__mon]), t = Date.now();
    for (let k = 0; k < 3; k++) H.staffWorked(g, m, t + k * 60000);
    const day1 = m.xp;
    for (let d = 1; d <= 2; d++) for (let k = 0; k < 2; k++) H.staffWorked(g, m, t + d * 86400000 + k * 60000);
    return { day1, tier: m.tier, xp: m.xp, raise: m.raise && { state: m.raise.state, want: m.raise.want, from: m.raise.from }, notif: g.notifs.some((n) => /📈 Noé passe confirmé \(monteur vidéo\)/.test(n.text) && /augmentation/.test(n.text)), gap: H.gearGap(m), work: H.workLoad(m, t + 2 * 86400000 + 120000) };
  });
  check('a release worked on is a step (two a day at most): 6 steps, a beginner is confirmed, asks for a raise, and wants better gear', c2.day1 === 2 && c2.tier === 1 && c2.xp === 0 && c2.raise && c2.raise.state === 'ask' && c2.raise.want > 50 && c2.raise.from === 50 && c2.notif && c2.gap === 1 && c2.work === 7, c2);
  const c3 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, c = g.chars[window.__mon], m = H.memberOf(g, c), t = Date.now();
    m.raise.tell = t - 1000;
    H.tickTeam(g, t);
    const trig = (g.triggers || []).some((x) => x.c === c.id && /lui demande une augmentation/.test(x.text));
    g.dms[c.id] = g.dms[c.id] || { msgs: [], readAt: 0 };
    const p = H.promptDM(g, c, [], 'ok pour ton augmentation');
    window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'Merci, tu gères !' }, { t: 'salaire', rate: m.raise.want }, { t: 'rel', d: 2, why: 'augmenté' }] }];
    const want = m.raise.want;
    await H.sendDM(c.id, 'Ok pour ton augmentation, tu la mérites', { now: true });
    return { trig, line: p.includes('OBLIGATOIRE dès que Noé et le joueur tombent d’accord') && p.includes('"t":"salaire"'), ctx: /a demandé une augmentation/.test(p), want };
  });
  await idle(page);
  const c3b = await G(page, (want) => { const H = window.__hype, g = H.S.game, m = H.memberOf(g, g.chars[window.__mon]); return { rate: m.rate, state: m.raise.state, want }; }, c3.want);
  check('the raise: asked in their messages (their AI, at the next refresh), the game tells it what to write once agreed; agreed in the message, it is theirs', c3.trig && c3.line && c3.ctx && c3b.rate === c3.want && c3b.state === 'ok', Object.assign({}, c3, c3b));
  const c4 = await G(page, () => {
    const H = window.__hype, g = H.S.game, m = H.memberOf(g, g.chars[window.__mon]), t = Date.now();
    m.raise = { at: t - 6 * 86400000, from: m.rate, want: m.rate * 2, state: 'ask', tell: t - 6 * 86400000, told: t - 6 * 86400000 };
    H.tickTeam(g, t);
    const silent = m.raise.state === 'refused' && m.raise.silent === 1;
    const parts = H.moodParts(g, m, t).map((x) => x.why);
    return { silent, refused: parts.includes('augmentation refusée'), need: parts.includes('son matériel ne suit plus son niveau') };
  });
  check('a raise left unanswered five days is a no, taken as such; their mood says why (the raise refused, the gear behind their level)', c4.silent && c4.refused && c4.need, c4);
  const c5 = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = g.chars[window.__mon], m = H.memberOf(g, c), t = Date.now();
    m.work = Array.from({ length: 12 }, (_, k) => t - k * 3600000);
    m.unpaid = 0; m.mood = 50; m.said = 0;
    const T = H.moodTarget(g, m, t), parts = H.moodParts(g, m, t).map((x) => x.why);
    for (let k = 0; k < 3; k++) H.teamDay(g, m, t);
    const mood = m.mood;
    H.tickTeam(g, t);
    const talk = g.notifs.some((n) => n.c === c.id && /😠 Noé n’est pas content/.test(n.text)), trig = (g.triggers || []).some((x) => x.c === c.id && /n’est pas content/.test(x.text));
    const p = H.memberPower(g, m);
    return { T, over: parts.includes('trop de boulot cette semaine'), mood, talk, trig, p, tell: !!g.teamTell };
  });
  check('too much work, the raise refused, the gear behind: the mood falls by the day (7 at most), unhappy they say so (their AI, in private), and work less well', c5.over && c5.T < 40 && c5.mood <= 36 && c5.mood >= 29 && c5.talk && c5.trig && c5.p === Math.round(2 * 0.85 * 0.85 * 100) / 100 && c5.tell, c5);
  // a Star kept on: +28 % → +38 %
  const c6 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const c = H.addCandidate(g, 'miniature', { tier: 3, name: 'Inès Morel', g: 'f' });
    H.hireStaff(g, c);
    const m = H.memberOf(g, c);
    window.__gfx = c.id;
    m.gear = 3; m.mood = 75;
    const v0 = Math.round((H.staffMult(g, 'views', 'vidéo', ['miniature']) - 1) * 100);
    for (let k = 0; k < 19; k++) H.staffGrow(g, m, 1);
    const n19 = g.notifs.some((n) => /⭐ Inès est à fond avec toi/.test(n.text));
    H.staffGrow(g, m, 1);
    H.staffGrow(g, m, 1);
    const v1 = Math.round((H.staffMult(g, 'views', 'vidéo', ['miniature']) - 1) * 100);
    return { v0, v1, loy: m.loy, n19, n20: g.notifs.some((n) => /⭐ Inès est à fond avec toi : sa fidélité lui donne \+10 points/.test(n.text)), fx: H.STAFF_ROLES.miniature.fx(H.memberPower(g, m)) };
  });
  check('a Star kept on grows still: a graphic designer at +28 % of views goes up to +38 % (+10 points at most, said when it is reached)', c6.v0 === 28 && c6.v1 === 38 && c6.loy === 10 && !c6.n19 && c6.n20 && /^\+38/.test(c6.fx), c6);
  // poached
  const c7 = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = g.chars[window.__gfx], m = H.memberOf(g, c), t = Date.now(), fx = [];
    m.since = t - 10 * 86400000;
    const orig = Math.random; Math.random = () => 0.01;
    const L = H.teamRefreshLines(g, t);
    Math.random = orig;
    H.applyTeamLine(g, { t: 'debauche', by: c.handle, from: '@zara.vey', rate: 700 }, fx);
    fx.forEach((f) => f());
    return { line: L.some((x) => x.includes('{"t":"debauche","by":"' + c.handle + '"')), poach: m.poach && { from: m.poach.from, rate: m.poach.rate, state: m.poach.state }, notif: g.notifs.some((n) => /🎣 @zara\.vey veut débaucher Inès : 700/.test(n.text)) };
  });
  check('poached: a refresh may bring a bigger creator who wants them (their AI writes it), the offer is shown, with its deadline', c7.line && c7.poach && c7.poach.from === '@zara.vey' && c7.poach.rate === 700 && c7.poach.state === 'open' && c7.notif, c7);
  await G(page, () => window.__hype.goTab('studio'));
  await page.waitForSelector('.st-ask.poach');
  await sleep(400);
  await G(page, () => { const r = document.querySelector('.st-ask.poach'); if (r) r.scrollIntoView({ block: 'center' }); });
  await shot(page, 'studio-team');
  const c8 = await G(page, () => {
    const rows = [...document.querySelectorAll('.staff-row')].map((r) => r.textContent);
    return { rows: rows.length, mood: rows.some((x) => /Mécontent|Bof|Content|À bout/.test(x)), prog: rows.some((x) => /Vers expert : \d+\/12 sorties/.test(x)), loy: rows.some((x) => /Fidélité : \+10 points \(au maximum\)/.test(x)), gear: rows.some((x) => /il lui faut du bon matériel/.test(x)) };
  });
  await page.locator('.st-ask.poach button', { hasText: /^S’aligner/ }).click();
  await sleep(300);
  const c8b = await G(page, () => { const H = window.__hype, g = H.S.game, m = H.memberOf(g, g.chars[window.__gfx]); return { rate: m.rate, state: m.poach.state, trig: (g.triggers || []).some((x) => /reste dans l’équipe du joueur, qui s’est aligné/.test(x.text)) }; });
  check('the Studio shows each one’s level and progress, their mood and why, their gear; « S’aligner » keeps them (their new rate, their AI told)', c8.rows >= 2 && c8.mood && c8.prog && c8.loy && c8.gear && c8b.rate === 700 && c8b.state === 'matched' && c8b.trig, Object.assign({}, c8, c8b));
  // the gear sheet
  await G(page, () => { const H = window.__hype, g = H.S.game, m = H.memberOf(g, g.chars[window.__mon]); H.openLayer({ t: 'stgear', id: m.id }); });
  await page.waitForSelector('.sg-list');
  await shot(page, 'staff-gear');
  const c9 = await G(page, () => { const opts = [...document.querySelectorAll('.sg-opt')].map((x) => ({ t: x.textContent, need: x.classList.contains('is-need'), have: x.classList.contains('have') })); return { n: opts.length, need: opts.findIndex((x) => x.need), have: opts.filter((x) => x.have).length, price: (opts[1] || {}).t || '' }; });
  check('the gear sheet: three levels, what their level asks marked, what they have, the old gear sold on (2 000 € − 30 % of 600 €)', c9.n === 3 && c9.need === 1 && c9.have === 1 && /1\s?820/.test(c9.price), c9);
  await clear(page);
  const c10 = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = g.chars[window.__mon], m = H.memberOf(g, c), cash = g.career.cash, mood0 = m.mood;
    const ok = H.giveBonus(g, m);
    const bonus = { ok, paid: cash - g.career.cash, up: m.mood - mood0 };
    // poached for good: they go (and say where)
    const x = H.addCandidate(g, 'cm', { tier: 2, name: 'Sacha Roux', g: 'x' });
    H.hireStaff(g, x);
    const mx = H.memberOf(g, x);
    mx.poach = { from: 'la chaîne Méga Potions', rate: 900, at: Date.now(), until: Date.now() + 86400000, state: 'open' };
    const fx = [];
    H.applyDMCareerLine(g, x, { t: 'debauche_fin', part: true, why: 'une offre trop belle' }, '', fx);
    fx.forEach((f) => f());
    // at the end of their rope: their AI may make them leave
    const y = H.addCandidate(g, 'rp', { tier: 1, name: 'Yanis Petit', g: 'm' });
    H.hireStaff(g, y);
    const my = H.memberOf(g, y);
    my.mood = 15;
    const L = H.teamRefreshLines(g, Date.now());
    const fy = [];
    H.applyTeamLine(g, { t: 'demission', by: y.handle, why: 'plus possible' }, fy);
    fy.forEach((f) => f());
    return { bonus, xKind: x.kind, xRole: x.role, gone: !H.memberOf(g, x), demLine: L.some((s) => s.includes('{"t":"demission","by":"' + y.handle + '"')), yGone: !H.memberOf(g, y), yKind: y.kind };
  });
  check('a bonus lifts the mood (+14, twice its rate); one who takes the offer leaves for it (« chez … »); one at the end of their rope may resign (their AI)', c10.bonus.ok && c10.bonus.paid > 0 && c10.bonus.up === 14 && c10.xKind === 'ex' && /chez la chaîne Méga Potions/.test(c10.xRole) && c10.gone && c10.demLine && c10.yGone && c10.yKind === 'ex', c10);
  const c11 = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.addCandidate(g, 'avocat', { tier: 0, name: 'Paule Garnier', g: 'f' });
    H.hireStaff(g, c);
    const m = H.memberOf(g, c); m.gear = 1;
    for (let k = 0; k < 6; k++) H.teamDay(g, m, Date.now());
    return { tier: m.tier, raise: !!m.raise };
  });
  check('those not paid by release learn by the day: six days, a lawyer is confirmed (and asks for more)', c11.tier === 1 && c11.raise, c11);

  // ---------- E. a sponsored content, shared ----------
  const e1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, b = g.chars[window.__brand];
    for (const d of g.deals) if (d.state === 'offer') d.state = 'declined';
    const d = H.makeOffer(g, { brand: 'Potions & Co', contactId: b.id, what: 'vidéo', product: 'notre élixir de concentration', fee: 400, asked: true, pitched: true, legit: true, shady: false, gift: false, care: false });
    if (!d) return { ok: false };
    d.scam = null; d.upfront = 0;
    H.signDeal(g, d, { force: true });
    window.__deal = d.id;
    return { ok: true, state: d.state };
  });
  await G(page, () => window.__hype.goTab('studio'));
  await page.waitForSelector('.dl-guest button');
  await page.locator('.dl-guest button', { hasText: 'Inviter quelqu’un' }).first().click();
  await page.waitForSelector('.feat-pick');
  await shot(page, 'deal-guest-pick');
  await page.locator('.feat-pick', { hasText: 'Zara' }).first().click();
  await sleep(400);
  const e2 = await G(page, () => {
    const H = window.__hype, g = H.S.game, d = H.dealOf(g, window.__deal), b = g.chars[window.__brand];
    const p = H.promptDM(g, b, [], H.S.drafts.dm[b.id] || '');
    return { guest: d.guest && { brand: d.guest.brand, c: d.guest.c === H.charByHandle(g, 'zara.vey').id }, draft: H.S.drafts.dm[b.id] || '', ctx: /Le joueur demande s’il peut inviter @zara\.vey/.test(p), line: p.includes('"t":"invite_marque"'), dm: H.S.stack.some((l) => l.t === 'dm' && l.id === b.id) };
  });
  check('a signed contract: « Inviter quelqu’un », someone of the cast; the brand is asked first (the question ready in its messages, its AI told to decide)', e1.ok && e1.state === 'signed' && e2.guest && e2.guest.brand == null && e2.guest.c && /@zara\.vey/.test(e2.draft) && e2.ctx && e2.line && e2.dm, Object.assign({}, e1, e2));
  await G(page, async () => {
    const H = window.__hype, g = H.S.game, b = g.chars[window.__brand];
    window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'Zara ? Avec plaisir, notre public l’adore !' }, { t: 'invite_marque', ok: true, why: 'bonne image' }] }];
    await H.sendDM(b.id, H.S.drafts.dm[b.id], { now: true });
  });
  await idle(page);
  await clear(page);
  await G(page, () => window.__hype.goTab('studio'));
  await page.waitForSelector('.dl-guest .hire-pay input');
  await sleep(400);
  await G(page, () => { const r = document.querySelector('.dl-guest'); if (r) r.scrollIntoView({ block: 'center' }); });
  await shot(page, 'deal-guest-share');
  await page.fill('.dl-guest .hire-pay input', '120');
  await page.locator('.dl-guest button', { hasText: /^Proposer à Zara/ }).click();
  await sleep(400);
  const e3 = await G(page, () => {
    const H = window.__hype, g = H.S.game, d = H.dealOf(g, window.__deal), zara = H.charByHandle(g, 'zara.vey');
    const p = H.promptDM(g, zara, [], H.S.drafts.dm[zara.id] || '');
    return { brand: d.guest.brand, fee: d.guest.fee, draft: H.S.drafts.dm[zara.id] || '', ctx: /de faire avec lui son contenu sponsorisé pour Potions & Co/.test(p) && /120/.test(p), line: p.includes('"t":"feat_pub"'), notif: g.notifs.some((n) => /Potions & Co est d’accord pour que tu invites Zara/.test(n.text)) };
  });
  check('the brand says yes; the player sets the share (120 €) and asks the guest, whose AI knows it all', e3.brand === true && e3.fee === 120 && /Potions & Co/.test(e3.draft) && /120/.test(e3.draft) && e3.ctx && e3.line && e3.notif, e3);
  await G(page, async () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey');
    window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'ok je viens, mais à 150 ;)' }, { t: 'feat_pub', ok: true, fee: 150, day: 1, at: '18:00', why: 'la marque est cool' }] }];
    await H.sendDM(zara.id, H.S.drafts.dm[zara.id], { now: true });
  });
  await idle(page);
  const e4 = await G(page, () => {
    const H = window.__hype, g = H.S.game, d = H.dealOf(g, window.__deal), zara = H.charByHandle(g, 'zara.vey'), r = (g.releases || []).find((x) => x.id === d.guest.r);
    const out = { ok: d.guest.ok, fee: d.guest.fee, r: !!r, collab: r && r.collab === zara.id, dg: r && r.dealGuest === d.id, what: r && r.what, before: r && r.due < d.due };
    const cash = g.career.cash;
    H.payGuest(g, r); H.payGuest(g, r);
    out.paid = cash - g.career.cash; out.mark = !!d.guest.paid;
    // the money not there: it is owed all the same (the account goes into the red)
    d.guest.paid = 0; const keep = g.career.cash; g.career.cash = 0;
    H.payGuest(g, r);
    out.red = g.career.cash === -150 && !!d.guest.paid && g.notifs.some((n) => /Ton compte passe dans le rouge/.test(n.text));
    g.career.cash = keep;
    g.releases = g.releases.filter((x) => x !== r);
    return out;
  });
  check('the guest says yes (and gets 150): planned with them before the deadline; the share paid at the release, once; owed all the same without the money (the account in the red)', e4.ok === true && e4.fee === 150 && e4.r && e4.collab && e4.dg && e4.what === 'vidéo' && e4.before && e4.paid === 150 && e4.mark && e4.red, e4);
  // a bigger creator's operation
  const e5 = await G(page, () => {
    const H = window.__hype, g = H.S.game, zara = H.charByHandle(g, 'zara.vey'), t = Date.now();
    zara.followers = 200000; zara.rel = 40; g.hostAt = 0;
    const orig = Math.random; Math.random = () => 0.01;
    const L = H.afficheRefreshLines(g, t);
    Math.random = orig;
    const iv = H.addInvite(g, zara, { what: 'Tourner mon opé Lumi Cola ensemble', collab: true, pub: { brand: 'Lumi Cola', fee: 300 }, day: 1, at: '15:00' });
    return { line: L.some((x) => x.includes('"pub":{"brand"') && x.includes('@zara.vey')), iv: iv && iv.pub, collab: iv && iv.collab, notif: g.notifs.some((n) => /💰 Zara Vey t’invite dans son opé Lumi Cola \(300/.test(n.text)), id: iv && iv.id };
  });
  await G(page, () => { const H = window.__hype, g = H.S.game; H.openDM(H.charByHandle(g, 'zara.vey').id); });
  await page.waitForSelector('.inv-pub');
  await shot(page, 'host-invite');
  const e6 = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, iv = H.inviteOf(g, id), cash = g.career.cash;
    const r = H.acceptInvite(g, iv, true);
    const out = { r: !!r, host: r && r.hostOp && r.hostOp.brand === 'Lumi Cola' && r.hostOp.fee === 300, collab: r && r.collab === iv.c };
    H.payHost(g, r); H.payHost(g, r);
    out.got = g.career.cash - cash;
    g.releases = g.releases.filter((x) => x !== r);
    return out;
  }, e5.id);
  check('a bigger creator may invite the player into an operation of theirs (a refresh may bring it): the invitation says it and how much, accepted it is a feat, and the host pays at the release, once', e5.line && e5.iv && e5.iv.brand === 'Lumi Cola' && e5.iv.fee === 300 && e5.collab && e5.notif && e6.r && e6.host && e6.collab && e6.got === 300, Object.assign({}, e5, e6));
  await clear(page);

  // ---------- F. always someone above ----------
  const f1 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    g.stats.followers = 435000;
    for (const c of Object.values(g.chars)) if (c.followers > 100000) c.followers = 90000;
    return { gap: H.ladderGap(g) };
  });
  await G(page, () => {
    const H = window.__hype, g = H.S.game;
    window.__mockOnce = [{ has: 'TÊTE D’AFFICHE', lines: [{ t: 'char', name: 'Ondine Vasseur', handle: 'ondine.vasseur', emoji: '🌊', g: 'f', age: 29, role: 'Créatrice star de vlogs', bio: 'dix ans de vlogs, deux livres, zéro filtre', personality: 'charismatique, exigeante, garde ses distances', voice: 'posée, ironique', followers: 700000, rel: 0, garde: 3 }, { t: 'post', by: 'ondine.vasseur', text: 'merci pour les 700k. on continue.' }] }];
    g.ladAt = 0; g.ladTry = 0;
    H.tickLadder(g, Date.now());
  });
  await until(page, () => !!window.__hype.charByHandle(window.__hype.S.game, 'ondine.vasseur'), null, 20000);
  await idle(page);
  const f2 = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'ondine.vasseur');
    const next = H.ladderGap(g), again = H.tickLadder(g, Date.now());
    const p = H.promptDM(g, c, [], 'salut !');
    g.stats.followers = 100000;
    const q = H.promptDM(g, c, [], 'salut !');
    g.stats.followers = 435000;
    return { star: c && c.star, fol: c && c.followers, notif: g.notifs.some((n) => /⭐ Ondine Vasseur, .* abonnés : une tête d’affiche du réseau/.test(n.text)), next, want: H.niceRound(g.stats.followers * 3.5), again, peer: /presque autant/.test(p), far: /répond peu aux petits comptes/.test(q) };
  });
  check('far above everyone (435 000, the biggest at 90 000): the next step is missing (700 000); the AI writes a tête d’affiche, at that audience; the next step then (1,5 M), not before a few hours', f1.gap === 700000 && f2.star === 1 && f2.fol >= 630000 && f2.fol <= 770000 && f2.notif && f2.next === f2.want && f2.next >= 1500000 && f2.again === false && f2.peer && f2.far, Object.assign({}, f1, f2));
  const f3 = await G(page, () => {
    const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin'), ada = H.charByHandle(g, 'ada.quill'), d = H.gameDay(Date.now());
    theo.badBuzz = { until: Date.now() + 5 * 86400000, reason: 'une vieille vidéo', loss: 0 };
    ada.badBuzz = null;
    const a0 = ada.followers, t0 = theo.followers;
    g.growDay = d - 3;
    const ch = H.tickGrowth(g, Date.now());
    return { ch, ada: ada.followers - a0, theo: theo.followers - t0, day: g.growDay === d, top: H.LADDER_TOP };
  });
  check('everyone’s audience grows by the day (three days at once after a while), a bad buzz makes it fall', f3.ch && f3.ada > 0 && f3.theo < 0 && f3.day && f3.top === 1e7, f3);

  // ---------- on a phone ----------
  const { page: ph } = await newPage(browser, { width: 390, height: 844 });
  await newGame(ph);
  await G(ph, () => {
    const H = window.__hype, g = H.S.game;
    const c = H.addCandidate(g, 'monteur', { tier: 1, name: 'Noé Laroche', g: 'm' });
    H.hireStaff(g, c);
    const m = H.memberOf(g, c);
    m.raise = { at: Date.now(), from: m.rate, want: m.rate * 2, state: 'ask', tell: Date.now(), told: Date.now() };
    m.poach = { from: '@zara.vey', rate: m.rate * 2, at: Date.now(), until: Date.now() + 86400000, state: 'open' };
    m.mood = 35;
    H.goTab('studio');
  });
  await ph.waitForSelector('.st-ask');
  await sleep(400);
  await G(ph, () => { const r = document.querySelector('.staff-row'); if (r) r.scrollIntoView({ block: 'start' }); });
  await shot(ph, 'phone-team');
  await overflowCheck(ph, 'team (390 px)');
  await G(ph, () => { const H = window.__hype, g = H.S.game; H.openLayer({ t: 'hire', id: H.charByHandle(g, 'leandre.aube').id }); });
  await ph.waitForSelector('.hire-pay input');
  await shot(ph, 'phone-hire');
  await overflowCheck(ph, 'hire sheet (390 px)');
  const phw = await G(ph, () => { const r = document.querySelector('.hire-pay').getBoundingClientRect(); return { right: Math.round(r.right), w: window.innerWidth }; });
  check('on a phone: the team rows and the job sheet fit', phw.right <= phw.w, phw);

  // ---------- without __t33: the team of before ----------
  const { page: od } = await newPage(browser, { width: 1280, height: 900 }, false);
  await newGame(od);
  const before = await G(od, () => {
    const H = window.__hype, g = H.S.game, c = H.addCandidate(g, 'monteur', { tier: 1, name: 'Noé Laroche', g: 'm' });
    H.hireStaff(g, c);
    const m = H.memberOf(g, c);
    for (let k = 0; k < 8; k++) H.staffWorked(g, m, Date.now() + k * 86400000);
    H.openLayer({ t: 'char', id: H.charByHandle(g, 'theo.marlin').id });
    return { on: H.t33On(), p: H.memberPower(g, m), tier: m.tier, gap: H.gearGap(m), tick: H.tickTeam(g, Date.now() + 3 * 86400000), gap2: H.ladderGap(Object.assign({}, g, { stats: Object.assign({}, g.stats, { followers: 435000 }) })) != null, grow: H.tickGrowth(g, Date.now()) };
  });
  await sleep(500);
  const noBtn = await G(od, () => !document.querySelector('.prof-job'));
  check('the suites written before: the team as it was (no gear asked, no progress, no mood, no job button, no tête d’affiche, no growth)', !before.on && before.p === 2 && before.tier === 1 && before.gap === 0 && before.tick === false && before.grow === false && noBtn, Object.assign({ noBtn }, before));

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`CHECKS ${pass}/${checks.length}`);
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
