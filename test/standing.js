// 0.9.4 end to end, in Chromium against the built hype.html with the mocked Claude runtime:
// - dates a character proposes: an invitation card in the DM (accept, decline, a « oui » in the player's own words, an
//   invitation read in their words when the model forgot its line, one that expires without blame, one from a refresh);
//   a date fixed four days away stays four days away (it was squeezed into 48 hours, then counted as missed);
// - the player's standing (scandal, rough patch, good run, the top) and each character's temperament, written by the AI
//   at creation (or asked later for a game from before): who steps back, who stays, who comes closer; a date called off;
//   the team, the brands, the recruits; no wave felt twice; butterfly effects; the screens; the Daily Upload notice.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/standing.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-standing');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(path.join(ROOT, 'hype.html'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const UMD = fs.readFileSync(process.env.UMD, 'utf8');
const SKELETON = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;

const errors = [];
const checks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let shotN = 0, lastPage = null;
const check = (name, ok, info) => { checks.push([ok ? 'PASS' : 'FAIL', name]); console.log(ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)); };
async function shot(page, name, keep) { if (!keep) await dismiss(page); shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
const clearToasts = (page) => page.evaluate(() => { const H = window.__hype; if (H) { H.S.toasts.forEach((t) => { t.until = 0; }); H.update(false); } });
async function clickText(page, sel, text) {
  const el = page.locator(sel, { hasText: text }).first();
  for (let attempt = 0; ; attempt++) {
    try {
      if (!sel.startsWith('.modal')) for (let k = 0; k < 4 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(700); }
      await el.waitFor({ state: 'visible', timeout: 15000 });
      await el.click({ timeout: attempt < 2 ? 5000 : 15000 });
      return;
    } catch (e) {
      if (attempt < 2 && !sel.startsWith('.modal') && (await page.$('.modal'))) continue;
      if (attempt < 2 && (await page.$('.toast'))) { await clearToasts(page); await sleep(200); continue; }
      await page.screenshot({ path: path.join(OUT, 'fail.png') }).catch(() => {});
      throw new Error(`clickText(${sel}, ${text}): ${e.message.split('\n')[0]}`);
    }
  }
}
async function dismiss(page) { for (let k = 0; k < 6 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(700); } }
async function overflowCheck(page, label) {
  const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  if (w.sw > w.cw + 1) errors.push(`[overflow] ${label}: ${JSON.stringify(w)}`);
}
const G = (page, fn, arg) => page.evaluate(fn, arg);
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.cand || b.write || b.create || b.prep); })) await sleep(300); };
const settle = async (page) => { await idle(page); await page.waitForFunction(() => { const g = window.__hype.S.game; return Object.values(g.dms).every((c) => c.msgs.every((m) => m.at <= Date.now())); }, null, { timeout: 15000 }).catch(() => {}); };
const closeAll = (page) => G(page, () => { const H = window.__hype; H.S.stack = []; H.update(); });
const lastBox = (page) => page.locator('.layer').last().locator('textarea:not([readonly])').first();
async function dm(page, id, text) {
  await dismiss(page);
  await closeAll(page);
  await G(page, (x) => window.__hype.openDM(x), id);
  await sleep(300);
  for (let k = 0; k < 3; k++) { // the conversation may render again as it opens: fill until it holds
    await lastBox(page).waitFor();
    await lastBox(page).fill(text);
    await sleep(200);
    if ((await lastBox(page).inputValue()) === text) break;
  }
  await page.waitForSelector('.layer .send:not([disabled])', { timeout: 5000 });
  await clickText(page, '.layer .send', 'Envoyer');
  await settle(page);
  await sleep(600);
}
async function refresh(page) {
  await closeAll(page);
  await G(page, () => { window.__hype.S.game.lastRefreshAt = 0; });
  await G(page, () => window.__hype.refreshFeed());
  await settle(page);
  await sleep(500);
}

async function newPage(browser, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true, colorScheme: 'light' });
  await ctx.addInitScript(MOCK);
  const page = await ctx.newPage();
  lastPage = page;
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

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);

  // ---------- a new game ----------
  await clickText(page, 'button', 'Nouvelle partie');
  await clickText(page, 'button.world', 'Académie Lumen');
  await page.waitForSelector('#pn');
  await page.fill('#pn', 'Mila Flux');
  await clickText(page, '.seg button', 'Elle');
  await page.fill('#pi', 'Une influenceuse qui enquête sur les secrets de l’académie');
  await clickText(page, '.tier', 'Sans limite');
  await page.check('#p18');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=Qui sera ton premier abonné', { timeout: 20000 });
  await page.locator('.cast-card.pick', { hasText: 'Théo' }).click();
  await page.click('.cast-cta button');
  await page.waitForSelector('.post');
  await sleep(1200);
  await dismiss(page);
  const ids = await G(page, () => { const H = window.__hype, g = H.S.game; const id = (h) => H.charByHandle(g, h).id; return { nox: id('nox.ombre'), theo: id('theo.marlin'), iris: id('prof.gallant'), zara: id('zara.vey'), leandre: id('leandre.aube'), oskar: id('oskar.brume'), maelle: id('maelle.fen') }; });

  // ---------- temperaments, written by the AI at creation ----------
  const tp = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, c = (id) => g.chars[id];
    const world = window.__prompts.find((x) => x.includes('CRÉER L’UNIVERS')) || '';
    return { zara: c(I.zara).temper, theo: c(I.theo).temper, iris: c(I.iris).temper, nox: c(I.nox).temper, leandre: c(I.leandre).temper, maelle: c(I.maelle).temper,
      why: c(I.theo).temperWhy, hidden: typeof c(I.nox).hidden, auto: !!c(I.oskar).temperAuto && !!H.TEMPERS[c(I.oskar).temper],
      ask: world.includes('"temper" = comment il ou elle réagit quand la réputation du joueur bouge') && world.includes('"temperWhy":"…"'), lv: g.standing ? g.standing.lv : null };
  }, ids);
  check('each character’s temperament comes from the AI that wrote them (a kind and how it shows); the troubled one may hide something (rolled once); the others get a guess, to be asked',
    tp.zara === 'envieux' && tp.theo === 'fidele' && tp.iris === 'integre' && tp.nox === 'trouble' && tp.leandre === 'opportuniste' && tp.maelle === 'detache'
    && /ne lâche jamais les siens/.test(tp.why) && tp.hidden === 'boolean' && tp.auto && tp.ask && tp.lv === 0, tp);

  // ---------- times a few days away ----------
  const when = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    const at = (days, h, m) => { const d = H.gameDate(t); d.setHours(h, m, 0, 0); d.setDate(d.getDate() + days); return d.getTime() - (g.clockOff || 0); };
    const now = new Date(2026, 9, 13, 14, 0); // a Tuesday
    const P = (x) => H.parseWhen(' ' + x + ' ', now);
    return {
      day3: H.planDue({ day: 3, at: '20:30' }, t) === at(3, 20, 30), day0: H.planDue({ day: 0, at: '23:59' }, t) === at(0, 23, 59),
      in4d: H.planDue({ in: 5760 }, t) - t === 5760 * 60000, // no longer squeezed into 48 hours
      parse: [P('samedi soir'), P('samedi à 20h'), P('après-demain'), P('dans 3 jours'), P('samedi 20h'), P('jeudi dernier'), P('un live de 3h ce soir'), P('ce soir à minuit')],
      invites: [H.inviteIn('ça te dit un verre samedi soir ?', now), H.inviteIn('désolé, pas dispo samedi', now), H.inviteIn('on se voit demain à 19h au Café ?', now), H.inviteIn('j’ai vu un super resto hier', now)].map((x) => (x ? x.in : null)),
      yes: [H.saysYes('oui avec plaisir !'), H.saysYes('Carrément, j’y serai'), H.saysYes('oui mais plutôt dimanche'), H.saysYes('non désolé')],
    };
  });
  check('a moment days away: « day »+« at » (game time) or minutes, never clamped to 48 h; « samedi soir », « après-demain », « dans 3 jours », « samedi 20h » read in the words; « jeudi dernier » is not a plan; « un live de 3h ce soir » is still tonight',
    when.day3 && when.day0 && when.in4d && when.parse.join() === [4 * 1440 + 420, 4 * 1440 + 360, 2 * 1440 + 240, 3 * 1440 + 240, 4 * 1440 + 360, '', 420, 600].join()
    && when.invites.join() === [4 * 1440 + 420, '', 1440 + 300, ''].join() && when.yes.join() === 'true,true,false,false', when);

  // ---------- an invitation in the DM: accepted in one tap ----------
  await G(page, () => { window.__mockInvite = 'line'; window.__mockInviteDay = 3; });
  await dm(page, ids.iris, 'vous faites quoi ce week-end, professeure ?');
  await page.waitForSelector('.layer .dm-card.invite', { timeout: 8000 }).catch(() => {});
  const inv1 = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, iv = H.openInvite(g, g.chars[id]);
    const pr = window.__prompts.filter((x) => x.includes('CONVERSATION PRIVÉE')).slice(-1)[0] || '';
    const d = H.gameDate(Date.now()); d.setHours(20, 30, 0, 0); d.setDate(d.getDate() + 3);
    return { iv: iv && { what: iv.what, ok: iv.due === d.getTime() - (g.clockOff || 0) }, card: !!document.querySelector('.layer .dm-card.invite'), btns: [...document.querySelectorAll('.layer .dm-card.invite .btn')].map((b) => b.textContent.trim()),
      events: H.activeEvents(g).filter((e) => e.c === id).length, ask: pr.includes('{"t":"invite","what":"≤ 80 caractères : où et quoi","day":2,"at":"20:30"}') && pr.includes('"day" (jours à partir d’aujourd’hui') };
  }, ids.iris);
  await page.locator('.layer .dm-card.invite').scrollIntoViewIfNeeded();
  await shot(page, 'invite-card');
  await overflowCheck(page, 'invite card');
  check('a character proposes a date in a DM: an invitation card (accept / decline), at the moment said (3 days later, 20 h 30), not yet on the agenda',
    inv1.iv && inv1.iv.what === 'Un verre au Café des Astres' && inv1.iv.ok && inv1.card && inv1.btns.join('|') === 'Accepter|Décliner' && inv1.events === 0 && inv1.ask, inv1);
  await clickText(page, '.layer .dm-card.invite .btn', 'Accepter');
  await sleep(2800);
  const acc = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, ev = H.activeEvents(g).find((e) => e.c === id && e.player), iv = (g.invites || []).find((x) => x.c === id);
    const msgs = g.dms[id].msgs;
    return { ev: ev && { what: ev.what, days: Math.round((ev.due - Date.now()) / 86400000 * 10) / 10 }, state: iv.state, linked: iv.ev === (ev && ev.id), mine: msgs.filter((m) => m.me).slice(-1)[0].text, card: (document.querySelector('.layer .dm-card.top .evt-kind') || {}).textContent || '', chip: !!document.querySelector('.layer .bubbles .evt-chip') };
  }, ids.iris);
  await shot(page, 'invite-accepted');
  check('« Accepter »: the date goes on the agenda at that moment (days away), the card says so, the player’s answer is in the conversation',
    acc.ev && acc.ev.what === 'Un verre au Café des Astres' && acc.ev.days > 2 && acc.ev.days < 4 && acc.state === 'accepted' && acc.linked && /j’y serai|plaisir|ça marche/i.test(acc.mine) && /Invitation acceptée/.test(acc.card) && acc.chip, acc);

  // ---------- a date fixed four days away stays four days away ----------
  await G(page, () => { window.__mockInvite = 'plan'; });
  await dm(page, ids.nox, 'dîner ensemble un de ces soirs ?');
  const far = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, ev = H.activeEvents(g).find((e) => e.c === id && e.player);
    const d = H.gameDate(Date.now()); d.setHours(20, 0, 0, 0); d.setDate(d.getDate() + 4);
    return ev && { what: ev.what, ok: ev.due === d.getTime() - (g.clockOff || 0), when: H.S.game && document.querySelector('.layer .bubbles .evt-chip small') ? document.querySelector('.layer .bubbles .evt-chip small').textContent : '' };
  }, ids.nox);
  check('a date fixed four days away is on the agenda four days away at 20 h (it was squeezed into 48 h, then counted as missed)', far && far.what === 'dîner au Lac' && far.ok, far);
  const stay = await G(page, (id) => { const H = window.__hype, g = H.S.game; H.checkEvents(g, Date.now() + 49 * 3600000); return H.activeEvents(g).some((e) => e.c === id && e.player); }, ids.nox);
  check('two days later it is still to come (no lapin)', stay, stay);

  // ---------- read in their words when the model forgets the line ----------
  await G(page, () => { window.__mockInvite = 'text'; });
  await dm(page, ids.theo, 'ça va toi ?');
  const txt = await G(page, (id) => { const H = window.__hype, g = H.S.game, iv = H.openInvite(g, g.chars[id]); return iv && { what: iv.what, h: Math.round((iv.due - Date.now()) / 3600000) }; }, ids.theo);
  check('an invitation only in the character’s words (« on se voit demain à 19h ? ») still makes the card', txt && /on se voit demain à 19h au Café des Astres/.test(txt.what) && txt.h >= 4 && txt.h <= 44, txt);

  // ---------- a « oui » in the player's own words ----------
  await G(page, () => { window.__mockInvite = 'line'; window.__mockInviteDay = 2; });
  await dm(page, ids.leandre, 'on pourrait se voir pour parler de la maison Aube');
  await G(page, () => { window.__mockInvite = 'yes-noplan'; });
  await dm(page, ids.leandre, 'oui avec plaisir !');
  const yes = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, iv = (g.invites || []).filter((x) => x.c === id).slice(-1)[0], ev = H.activeEvents(g).find((e) => e.c === id && e.player);
    const pr = window.__prompts.filter((x) => x.includes('CONVERSATION PRIVÉE')).slice(-1)[0] || '';
    return { state: iv && iv.state, ev: !!ev, told: /Invitation de Léandre Aube en attente de réponse : « Un verre au Café des Astres »/.test(pr) && pr.includes('{"t":"noinvite"}'), hist: pr.includes('[invitation de Léandre Aube : « Un verre au Café des Astres »') };
  }, ids.leandre);
  check('the player says yes in their own words: the model is told an invitation waits, and the date is on the agenda even when it forgets the plan line', yes.state === 'accepted' && yes.ev && yes.told && yes.hist, yes);

  // ---------- declined, taken back, expired ----------
  await G(page, () => { window.__mockInvite = 'line'; window.__mockInviteDay = 1; });
  await dm(page, ids.zara, 'salut la championne');
  await clickText(page, '.layer .dm-card.invite .btn', 'Décliner');
  await sleep(2800);
  const dec = await G(page, (id) => { const H = window.__hype, g = H.S.game, iv = (g.invites || []).filter((x) => x.c === id).slice(-1)[0], msgs = g.dms[id].msgs; return { state: iv.state, ev: H.activeEvents(g).some((e) => e.c === id && e.player), mine: msgs.filter((m) => m.me).slice(-1)[0].text, past: !!document.querySelector('.layer .dm-card.past') }; }, ids.zara);
  check('« Décliner »: a polite answer, nothing on the agenda', dec.state === 'declined' && !dec.ev && /pas pouvoir|pas dispo|pas le faire/i.test(dec.mine) && dec.past, dec);
  await G(page, () => { window.__mockInvite = 'line'; window.__mockInviteDay = 2; });
  await dm(page, ids.zara, 'et la semaine prochaine ?');
  await G(page, () => { window.__mockInvite = 'no'; });
  await dm(page, ids.zara, 'non finalement, je préfère pas');
  const off = await G(page, (id) => { const g = window.__hype.S.game; return (g.invites || []).filter((x) => x.c === id).slice(-1)[0].state; }, ids.zara);
  check('turned down in words: the model takes the invitation back ({"t":"noinvite"})', off === 'off', off);
  await G(page, () => { window.__mockInvite = null; });
  const exp = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, c = g.chars[id];
    const iv = H.addInvite(g, c, { what: 'un café au réfectoire', in: 90 });
    const rel = c.rel, trust = c.trust;
    iv.due = Date.now() - 60000;
    H.checkEvents(g);
    return { state: iv.state, rel: c.rel - rel, trust: c.trust - trust, lapin: g.notifs.some((n) => n.c === id && /raté ton rendez-vous/.test(n.text)) };
  }, ids.zara);
  check('an invitation left unanswered just expires: no lapin, no blame', exp.state === 'expired' && exp.rel === 0 && exp.trust === 0 && !exp.lapin, exp);

  // ---------- from a refresh: a DM that asks the player out ----------
  await G(page, () => { window.__mockRefreshInvite = 'prof.gallant'; window.__mockRefreshInviteLine = false; window.__standRolls = [0.9]; });
  await refresh(page);
  const r1 = await G(page, (id) => { const H = window.__hype, g = H.S.game, iv = H.openInvite(g, g.chars[id]); const pr = window.__prompts.filter((x) => x.includes('Le joueur actualise son fil')).slice(-1)[0] || ''; return { iv: iv && iv.what, h: iv && Math.round((iv.due - Date.now()) / 3600000), ask: pr.includes('{"t":"invite","by":"handle"') }; }, ids.iris);
  await G(page, (id) => { const H = window.__hype, g = H.S.game; H.declineInvite(g, H.openInvite(g, g.chars[id])); }, ids.iris);
  await G(page, () => { window.__mockRefreshInviteLine = true; window.__standRolls = [0.9]; });
  await refresh(page);
  const r2 = await G(page, (id) => { const H = window.__hype, g = H.S.game, iv = H.openInvite(g, g.chars[id]); return iv && iv.what; }, ids.iris);
  await G(page, () => { window.__mockRefreshInvite = null; window.__standRolls = null; });
  check('a refresh DM that asks the player out makes an invitation, with the model’s line or read in the words', r1.iv && /balade au lac après-demain/.test(r1.iv) && r1.h > 24 && r1.h < 72 && r1.ask && r2 === 'Balade au lac', { r1, r2 });

  // ---------- the prompts: what the DM knows of the agenda ----------
  const pr = await G(page, (I) => {
    const H = window.__hype, g = H.S.game;
    const zara = H.promptDM(g, g.chars[I.zara], [{ me: true, text: 'on s’était dit samedi au resto, non ?' }], 'alors, toujours partante ?');
    const iris = H.promptDM(g, g.chars[I.iris], [], 'bonsoir');
    return { catchup: zara.includes('Aucun rendez-vous entre eux n’est inscrit dans l’agenda du jeu') && zara.includes('ne reproche aucun lapin au joueur'), date: /Rendez-vous prévu entre eux : « Un verre au Café des Astres », \S+ \d+ \S+ à 20 h 30 \([^)]*\) : pas encore passé/.test(iris), plan: zara.includes('"day":2,"at":"20:30"') };
  }, ids);
  check('the DM knows the agenda: a date on it (with its day), or none (then a date fixed earlier in the talk is added now, and nobody blames a lapin that was never on it)', pr.catchup && pr.date && pr.plan, pr);

  // ---------- an old game: the AI is asked for the temperaments it never wrote ----------
  await G(page, (id) => { const g = window.__hype.S.game, c = g.chars[id]; c.unlocked = true; c.unlockedAt = Date.now(); window.__mockTemper = 'opportuniste'; window.__standRolls = [0.9]; }, ids.oskar);
  await refresh(page);
  const ask = await G(page, (id) => { const g = window.__hype.S.game, c = g.chars[id]; const p = window.__prompts.filter((x) => x.includes('Le joueur actualise son fil')).slice(-1)[0] || ''; return { asked: /tempérament face à la réputation du joueur : choisis-en un[^\n]*@oskar\.brume/.test(p), temper: c.temper, auto: !!c.temperAuto, why: c.temperWhy }; }, ids.oskar);
  await G(page, () => { window.__mockTemper = null; window.__standRolls = null; });
  check('a character without a temperament from the AI (a game from before): the next refresh asks for it, from their personality', ask.asked && ask.temper === 'opportuniste' && !ask.auto && ask.why === 'a toujours suivi le vent', ask);

  // ---------- a scandal: each one reacts by their temperament ----------
  const pre = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    H.tickStanding(g, t);
    // a date with Léandre tomorrow, a team member, a signed contract, an old fake proof
    H.addEvent(g, { by: 'leandre.aube', kind: 'rdv', what: 'balade en forêt', in: 900 });
    g.career.cash = 5000;
    const cand = H.addCandidate(g, 'cm', { tier: 0 });
    H.hireStaff(g, cand);
    g.stats.followers = 200000;
    const d = H.makeOffer(g, { brand: 'Potions Pétillantes', sector: 'boisson', what: 'vidéo', shady: false });
    if (d) { H.signDeal(g, d); d.moral = true; } // (the moral clause has its own tests)
    const fee0 = H.dealFee(g, 'vidéo');
    const rel = {}; for (const k in I) rel[k] = g.chars[I[k]].rel;
    return { rel, fee0, staffRate: g.staff[0] && g.staff[0].rate, deal: d && d.id, dealFee: d && d.fee, offerAt: g.career.offerAt || 0 };
  }, ids);
  await G(page, () => { const H = window.__hype, g = H.S.game, t = Date.now(); window.__standRolls = Array(400).fill(0.3); g.pbb = { at: t, until: t + 3600000, c: null, kind: 'pub' }; H.tickStanding(g, t); H.update(); });
  await sleep(1500);
  const sc = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, I = a.ids, rel = {}; for (const k in I) rel[k] = g.chars[I[k]].rel - a.pre.rel[k];
    const ev = g.events.filter((e) => e.c === I.leandre && e.player).slice(-1)[0];
    const n = g.notifs.filter((x) => x.k === 'standdown').slice(-1)[0];
    const m = g.staff[0];
    const ctx = H.ctxText(g, { focus: new Set(Object.values(I)) });
    return { lv: g.standing.lv, rel, cancelled: ev && ev.state === 'cancelled' && ev.by === 'them', notif: n ? n.text : '', trig: g.triggers.map((x) => x.text).join(' | '),
      seen: [I.iris, I.leandre, I.zara, I.nox].every((id) => g.chars[id].temperSeen), staff: m ? { rate: m.rate, msg: g.notifs.some((x) => /prime|\+25\s%/.test(x.text)) } : null,
      offer: H.maybeOffer(g, Date.now()) === false && g.career.offerAt >= Date.now() + 5 * 3600000, feeRatio: Math.round(H.dealFee(g, 'vidéo') / a.pre.fee0 * 100) / 100, candMult: H.standMult(g, 'cand'),
      ctx: ctx.includes('SA COTE EN CE MOMENT : en plein scandale') && /tempérament : intègre/.test(ctx) && ctx.includes('Tempéraments face à la réputation du joueur :') && ctx.includes('intègre : un scandale le ou la refroidit vraiment') && ctx.includes('[secret du jeu :') && ctx.includes('« ne fréquente que ceux qui montent »'), // (0.19: each in a word, what each means once)
      chip: (document.querySelector('.stand-chip.bad') || {}).textContent || '' };
  }, { ids, pre });
  check('a scandal: the principled and the opportunists step back, the envious gloat, the troubled one comes closer, the loyal one does not drop; one notification says who did what, and a beat for the AI',
    sc.lv === -2 && sc.rel.iris < 0 && sc.rel.leandre < 0 && sc.rel.zara < 0 && sc.rel.nox > 0 && sc.rel.theo >= 0 && /Ton scandale fait le tri/.test(sc.notif) && /prend ses distances|prennent leurs distances/.test(sc.notif)
    && /savoure ta chute/.test(sc.notif) && /se rapproche de toi, étrangement/.test(sc.notif) && /chacun réagit selon son caractère/.test(sc.trig) && sc.seen, sc);
  check('…and it reaches the rest: an opportunist calls off tomorrow’s date, the team asks for a bonus, no brand comes near, fees fall to 60 %, recruits ask 40 % more; the AI is told',
    sc.cancelled && sc.staff && sc.staff.rate > pre.staffRate && sc.staff.msg && sc.offer && sc.feeRatio === 0.6 && sc.candMult === 1.4 && sc.ctx && /Scandale/.test(sc.chip), { sc, pre });
  await closeAll(page);
  await G(page, () => { const H = window.__hype; H.S.tab = 'feed'; H.update(); });
  await sleep(300);
  await clickText(page, '.stand-chip', 'Scandale');
  await page.waitForSelector('.modal .stand-card');
  const card = await G(page, () => document.querySelector('.modal .stand-card').textContent);
  await sleep(800); // the card fades in
  await shot(page, 'standing-card', true);
  await overflowCheck(page, 'standing card');
  check('the strip shows the standing; a tap tells what it changes (people, brands, recruits) and what is known of each one', /Scandale/.test(card) && /clause de moralité/.test(card) && /\+40\s%/.test(card) && /Iris ⚖️ intègre/.test(card) && /Nox 🎭 difficile à cerner/.test(card), card.slice(0, 400));
  await dismiss(page);
  await G(page, (id) => window.__hype.openChar(id), ids.iris);
  await page.waitForSelector('.layer .temper-sec');
  await page.locator('.layer .temper-sec').scrollIntoViewIfNeeded();
  const prof = await G(page, (id) => ({ iris: document.querySelector('.layer .temper-sec').textContent }), ids.iris);
  await shot(page, 'profile-temper');
  await G(page, (id) => window.__hype.openChar(id), ids.nox);
  await sleep(300);
  const profN = await G(page, () => [...document.querySelectorAll('.layer .temper-sec')].slice(-1)[0].textContent);
  check('a profile tells how they react once they have shown it (« Intègre », with the AI’s words); the troubled one stays a question', /Intègre/.test(prof.iris) && /refroidit vraiment/.test(prof.iris) && /N’a jamais toléré la moindre triche/.test(prof.iris) && /Difficile à cerner/.test(profN) && /Sincère, ou pas/.test(profN), { prof, profN });
  await closeAll(page);

  // ---------- the same wave is not felt twice ----------
  const twice = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, before = g.chars[I.leandre].rel, n0 = g.notifs.filter((x) => x.k === 'standdown').length;
    g.pbb.until = Date.now() - 1000; H.tickStanding(g);
    const mid = g.standing.lv;
    g.pbb = { at: Date.now(), until: Date.now() + 3600000, c: null, kind: 'pub' }; H.tickStanding(g);
    return { mid, lv: g.standing.lv, d: g.chars[I.leandre].rel - before, n: g.notifs.filter((x) => x.k === 'standdown').length - n0 };
  }, ids);
  check('a scandal that comes back within the same half-day is not felt twice', twice.mid >= -1 && twice.lv === -2 && twice.d === 0 && twice.n === 0, twice);

  // ---------- the top: some rejoice, some want a piece of it, some seethe; and old stories come back ----------
  const top = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, I = a.ids, t = Date.now();
    g.pbb = null; g.stats.cancelled = false;
    H.tickStanding(g, t);
    H.addEcho(g, 'fake', { c: I.zara, text: 'un faux message de Zara' });
    g.echoes[g.echoes.length - 1].at = t - 26 * 3600000;
    const rel = {}; for (const k in I) rel[k] = g.chars[I[k]].rel;
    const rep0 = 82, fee0 = (g.deals.find((d) => d.id === a.deal) || {}).fee || 0;
    g.stats.followers = 150000; H.repSet(g, rep0);
    window.__standRolls = Array(400).fill(0.3);
    H.tickStanding(g, t + 1000);
    const d = {}; for (const k in I) d[k] = g.chars[I[k]].rel - rel[k];
    const deal = g.deals.find((x) => x.id === a.deal) || {};
    return { lv: g.standing.lv, d, notif: (g.notifs.filter((x) => x.k === 'standup').slice(-1)[0] || {}).text || '', bonus: deal.bonus === true && deal.fee > fee0, echo: (g.notifs.filter((x) => x.k === 'echo').slice(-1)[0] || {}).text || '', rep: g.stats.reputation - rep0,
      fee: H.standMult(g, 'fee'), cand: H.standMult(g, 'cand') };
  }, { ids, deal: pre.deal });
  check('at the top: the opportunists come closer, the envious seethe, the loyal rejoice; a brand adds a bonus; fees +25 %, recruits −15 %',
    top.lv === 2 && top.d.leandre > 0 && top.d.zara < 0 && top.d.theo >= 0 && /Te voilà au sommet/.test(top.notif) && /se rapproche(nt)? de toi/.test(top.notif) && /te jalouse/.test(top.notif) && top.bonus && top.fee === 1.25 && top.cand === 0.85, top);
  check('…and at the top, people dig: an old fake proof comes back (butterfly effect)', /🦋 On ressort ta vieille fausse preuve contre Zara Vey : −\d+ de réputation/.test(top.echo) && top.rep < -3 && top.rep > -6, top);

  // ---------- butterfly effects, a few days later ----------
  const echo = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    for (const e of g.echoes) e.used = true;
    H.addEcho(g, 'viral', { text: 'mon duel contre la gargouille' });
    g.echoes[g.echoes.length - 1].at = t - 2 * 86400000;
    g.echoAt = 0;
    const f0 = g.stats.followers;
    window.__standRolls = [0.1, 0];
    const text = H.surfaceEcho(g, t);
    return { text, gain: g.stats.followers - f0, trig: g.triggers.some((x) => /Le vieux post viral du joueur/.test(x.text)) };
  });
  check('a viral post from two days ago comes back: new followers, and the network talks about it again', /🦋 Ton post viral « mon duel contre la gargouille » refait surface/.test(echo.text) && echo.gain >= 20 && echo.trig, echo);
  const echo2 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    H.addEcho(g, 'advice', { c: H.charByHandle(g, 'theo.marlin').id, text: 'une vidéo sur ses potions' });
    g.echoes[g.echoes.length - 1].at = Date.now() - 3 * 86400000;
    g.echoAt = 0;
    window.__standRolls = [0.1, 0, 0.5, 0.5, 0.5, 0.5];
    return true;
  });
  await refresh(page);
  const e2 = await G(page, () => { const p = window.__prompts.filter((x) => x.includes('Le joueur actualise son fil')).slice(-1)[0] || ''; const g = window.__hype.S.game; return { said: /raconte partout que le conseil du joueur/.test(p), notif: g.notifs.some((n) => n.k === 'echo' && /ton conseil l’a sauvé/.test(n.text)) }; });
  await G(page, () => { window.__standRolls = null; });
  check('a refresh may bring an old moment back (here: advice that saved Théo, told everywhere) and plays it', echo2 && e2.said && e2.notif, e2);

  // ---------- the Daily Upload: no postponing, said where the button would be ----------
  await closeAll(page);
  const se = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    for (const r of g.releases || []) if (r.state === 'scheduled') r.state = 'dropped';
    H.startSeries(g, { what: 'vidéo', days: 3, hour: 18, min: 0, theme: 'un tour de magie par jour', diff: 'moyen' });
    const r = H.activeRelease(g);
    r.played = { tier: 'flop', score: 0.2, diff: 'moyen' };
    H.S.stack = [{ t: 'minigame', id: r.id, key: 'se' }];
    H.update();
    return r.id;
  });
  await page.waitForSelector('.layer .mg-result');
  await sleep(800); // the layer slides in
  const note = await G(page, () => ({ note: (document.querySelector('.layer .series-note') || {}).textContent || '', postpone: [...document.querySelectorAll('.layer .mg-result button')].some((b) => /Repousser/.test(b.textContent)) }));
  await shot(page, 'series-no-postpone');
  check('Daily Upload: a failed episode says clearly, up top, why there is no « Repousser » and what to do', !!se && /Défi Daily Upload : pas de report possible/.test(note.note) && /repart de zéro/.test(note.note) && !note.postpone, note);

  await browser.close();
  console.log('ERRORS', errors.join('\n'));
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  console.log(`\n${checks.filter((c) => c[0] === 'PASS').length}/${checks.length} PASS`);
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch(async (e) => {
  console.error('FAILED', e);
  if (lastPage) await lastPage.screenshot({ path: path.join(OUT, 'fail.png') }).catch(() => {});
  console.log('ERRORS', errors.join('\n'));
  process.exit(1);
});
