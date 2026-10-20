// 0.12 end to end, in Chromium against the built hype.html with the mocked Claude runtime: the big steps and couples.
// - before becoming a couple, a trial (their bad buzz, the player's rumor, a stolen photo, a rival, their best friend, a
//   trip, their secret): won, together; lost or too late, not now; a crush at first sight skips it;
// - before the wedding: a doubt to soothe, or the guest list (whoever is forgotten takes it badly);
// - a couple announced or kept secret (until it leaks); a partner's bad buzz splashes the player; no news, it drifts
//   (a pause); a flirt elsewhere caught on a screenshot.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/couples.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-couples');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(process.env.PAGE || path.join(ROOT, 'hype.html'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const UMD = fs.readFileSync(process.env.UMD, 'utf8');
const SKELETON = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;

const errors = [];
const checks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let shotN = 0, lastPage = null;
const check = (name, ok, info) => { checks.push([ok ? 'PASS' : 'FAIL', name]); console.log(ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)); };
async function shot(page, name) { shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
async function dismiss(page) { for (let k = 0; k < 6 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(700); } }
async function clickText(page, sel, text) {
  const el = page.locator(sel, { hasText: text }).first();
  if (!sel.startsWith('.modal')) await dismiss(page);
  await el.waitFor({ state: 'visible', timeout: 15000 });
  await el.click();
}
const G = (page, fn, arg) => page.evaluate(fn, arg);
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create); })) await sleep(250); };
// a private message, as the player sends it (the game's own function), and how many AI calls it made
async function dm(page, id, text, rolls) {
  const n0 = await G(page, () => window.__prompts.length);
  await G(page, (a) => { if (a.rolls) window.__trustRolls = a.rolls.slice(); }, { rolls });
  await G(page, (a) => window.__hype.sendDM(a.id, a.text), { id, text });
  await idle(page);
  return G(page, (n) => window.__prompts.length - n, n0);
}
const lastPrompt = (page, needle) => G(page, (x) => window.__prompts.filter((p) => p.includes(x)).slice(-1)[0] || '', needle);

async function newPage(browser, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true, colorScheme: 'light' });
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript(() => {
    window.__mockCoeurs = { 'theo.marlin': 'serein', 'nox.ombre': 'serein', 'zara.vey': 'serein', 'leandre.aube': 'serein' };
    window.__mockAmis = { 'zara.vey': 'nox.ombre', 'nox.ombre': 'theo.marlin' };
  });
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
  const ids = await G(page, () => { const H = window.__hype, g = H.S.game, id = (h) => H.charByHandle(g, h).id; return { theo: id('theo.marlin'), nox: id('nox.ombre'), zara: id('zara.vey'), iris: id('prof.gallant'), leandre: id('leandre.aube') }; });
  // (a main drawn older has a role apart, never a romance: these are all young adults here)
  await G(page, () => { const H = window.__hype; for (const c of H.mains(H.S.game, false)) if (c.age > 30) c.age = 24; });
  // Nox, flirting with the player for a while: ready for the next step (and no trial under way)
  const flirt = (o) => G(page, (a) => { const H = window.__hype, g = H.S.game, c = g.chars[a.id]; g.trials = []; H.S.modals = []; Object.assign(c, { vibe: 'flirt', rel: 50, cool: null, dare: null, dareWon: 0, trialsWon: [], officiel: undefined, pace: { at: Date.now() - 400 * 3600000 }, lastTouch: Date.now() }, a.o || {}); delete c.badBuzz; H.update(); }, { id: ids.nox, o });
  const trialOf = (id) => G(page, (x) => { const g = window.__hype.S.game; const tr = (g.trials || []).filter((t) => t.c === x).slice(-1)[0]; return tr ? JSON.parse(JSON.stringify(tr)) : null; }, id);
  const vibeOf = (id) => G(page, (x) => window.__hype.S.game.chars[x].vibe, id);

  // ---------- the step to a couple starts a trial; a crush at first sight skips it ----------
  await flirt();
  const t0 = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, c = g.chars[id];
    window.__trustRolls = [0.3];
    const ok = H.applyVibe(g, c, 'couple', 'ensemble');
    const tr = (g.trials || []).find((x) => x.c === id && x.state === 'open');
    const pr = H.promptDM(g, c, [], 'coucou');
    return { ok, vibe: c.vibe, k: tr && tr.k, step: tr && tr.step, prompt: H.TRIALS[tr.k].judge ? /"t":"judge"/.test(pr) : true, line: pr.includes('Pas de couple tant') || /attend|hésite|veut tout dire|regarde si le joueur garde le lien|tente sa chance/.test(pr) };
  }, ids.nox);
  await flirt({ dareWon: Date.now() });
  const t1 = await G(page, (id) => { const H = window.__hype, g = H.S.game, c = g.chars[id]; return { ok: H.applyVibe(g, c, 'couple', 'coup de foudre'), trials: (g.trials || []).length }; }, ids.nox);
  check('becoming a couple starts a trial first (no couple yet; the AI is told; asked for a reaction when an answer decides); a crush at first sight skips it',
    t0.ok === false && t0.vibe === 'flirt' && t0.step === 'couple' && !!t0.k && t0.prompt && t0.line && t1.ok === true && t1.trials === 0, { t0, t1 });

  // ---------- 0.29.1: asked in the player's own words, the trial starts before the answer, and the player is told ----------
  // (a secret to tell first: a trial their very answer could judge, and must not, the player has not heard of it yet)
  await flirt({ secret: 'a déjà menti sur son âge pour un casting', secretOut: null, secretTold: null });
  const n0a = await G(page, () => { window.__trustRolls = [0.99]; return window.__prompts.length; });
  await G(page, (id) => window.__hype.sendDM(id, 'bon du coup, on peut dire qu’on est officiellement en couple ?'), ids.nox);
  await idle(page);
  await sleep(4500); // (the notification comes a few seconds after the answer)
  const asked = await G(page, ({ id, n0 }) => {
    const H = window.__hype, g = H.S.game, c = g.chars[id], tr = (g.trials || []).find((x) => x.c === id && x.state === 'open');
    const pr = window.__prompts.slice(n0).find((p) => p.includes('CONVERSATION PRIVÉE')) || '';
    return { vibe: c.vibe, step: tr && tr.step, k: tr && tr.k, told: /ils ne sont PAS encore en couple/.test(pr), notif: g.notifs.some((n) => n.c === id && /ce n’est pas encore officiel/.test(n.text)), note: H.stepNote(g, c) || '' };
  }, { id: ids.nox, n0: n0a });
  check('asked in the player’s own words (« on est officiellement en couple ? »): the trial starts before the answer, which knows it (« oui, mais… ») and does not judge it yet; the player is told (a notification, a line on their sheet)',
    asked.vibe === 'flirt' && asked.step === 'couple' && asked.k === 'secret' && asked.told && asked.notif && /^💞 Pas encore en couple : /.test(asked.note), asked);

  // ---------- their bad buzz: stand by them in public, and you are together (then: announce it or keep it secret) ----------
  await flirt();
  await G(page, (id) => { const H = window.__hype, g = H.S.game; H.startTrial(g, g.chars[id], 'couple', 'badbuzz'); }, ids.nox);
  const bb0 = await G(page, (id) => { const H = window.__hype, c = H.S.game.chars[id]; return { bb: H.inBadBuzz(c), notif: H.S.game.notifs.some((n) => n.k === 'badbuzz' && n.c === id) }; }, ids.nox);
  await G(page, () => { window.__mockKindness = 3; });
  await G(page, () => window.__hype.runAct('post', '@nox.ombre je suis avec toi, ne lâche rien. ceux qui crachent dessus ne te connaissent pas'));
  await idle(page);
  await G(page, () => { window.__mockKindness = null; });
  const bb1 = await G(page, (id) => { const H = window.__hype, g = H.S.game, c = g.chars[id]; return { vibe: c.vibe, bb: H.inBadBuzz(c), off: c.officiel, modal: H.S.modals.some((m) => m.t === 'vibe' && m.vibe === 'couple') }; }, ids.nox);
  // other modals may come first (a viral post, a level…): they are closed until the couple's question shows
  const before = [];
  for (let k = 0; k < 30 && !(await page.$('.modal .couple-ask')); k++) {
    const m = await page.$('.modal');
    if (m) { before.push(await G(page, () => (window.__hype.S.modals.find((x) => document.querySelector('.modal')) || {}).t || '?')); await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); }
    await sleep(700);
  }
  if (before.length) console.log('modals before the couple question:', before.join(', '), JSON.stringify(bb1));
  await page.waitForSelector('.modal .couple-ask', { timeout: 20000 });
  const askTxt = await page.$eval('.modal', (e) => e.textContent);
  await shot(page, 'couple-choice');
  await clickText(page, '.modal .btn', 'L’annoncer');
  await sleep(500);
  const ann = await G(page, (id) => { const g = window.__hype.S.game, c = g.chars[id]; return { off: c.officiel, trig: (g.triggers || []).some((x) => /sont maintenant en couple : le réseau en parle/.test(x.text)) }; }, ids.nox);
  check('their bad buzz just before: standing by them in public (a kind post that names them) gets them out of it, and you are together; the player chooses to announce it or keep it for the two of you',
    bb0.bb && bb0.notif && bb1.vibe === 'couple' && !bb1.bb && bb1.off === 'pending' && bb1.modal && /Tu l’annonces sur le réseau/.test(askTxt) && /Garder ça pour nous deux/.test(askTxt) && ann.off === 'public' && ann.trig, { bb0, bb1, ann });

  // ---------- a stolen photo: explain yourself (two convincing answers); their secret: a bad reaction ends it ----------
  await flirt();
  await G(page, (id) => { const H = window.__hype, g = H.S.game; H.startTrial(g, g.chars[id], 'couple', 'photo'); window.__mockReacts = ['amuse', 'charme']; }, ids.nox);
  await dm(page, ids.nox, 'c’était ma cousine, je te jure, on fêtait son diplôme');
  const ph1 = await trialOf(ids.nox);
  await dm(page, ids.nox, 'tu veux que je te la présente ? elle te trouve trop drôle haha');
  const ph2 = await trialOf(ids.nox);
  const phv = await vibeOf(ids.nox);
  await dismiss(page);
  await flirt({ secretTold: false, trust: 50 });
  await G(page, (id) => { const H = window.__hype, g = H.S.game; H.startTrial(g, g.chars[id], 'couple', 'secret'); window.__mockReacts = ['refroidi']; }, ids.nox);
  const tr0 = await G(page, (id) => window.__hype.S.game.chars[id].trust, ids.nox);
  await dm(page, ids.nox, 'sérieux ? la fille de la directrice ? tu m’as menti depuis le début');
  const sc = await G(page, (id) => { const g = window.__hype.S.game, c = g.chars[id]; const tr = g.trials.slice(-1)[0]; return { state: tr.state, vibe: c.vibe, trust: c.trust, pace: Date.now() - c.pace.at < 60000 }; }, ids.nox);
  check('a stolen photo: two convincing explanations and you are together; their secret: a bad reaction ends the trial (trust lost, it will take longer)',
    ph1.got === 1 && ph1.state === 'open' && ph2.state === 'won' && phv === 'couple' && sc.state === 'lost' && sc.vibe === 'flirt' && sc.trust <= tr0 - 9 && sc.pace, { ph1, ph2, phv, sc });

  // ---------- a rival: a good date wins it; their best friend: win them over; a trip: keep in touch every day ----------
  await dismiss(page);
  await flirt();
  const rv = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, c = g.chars[id];
    const tr = H.startTrial(g, c, 'couple', 'rival');
    const r = g.chars[tr.rival];
    H.dateOutcome(g, { what: 'Un verre au lac', diff: 'facile', played: { tier: 'mid', score: 0.6, diff: 'facile' }, c: id }, c);
    return { rival: r && r.handle, state: tr.state, vibe: c.vibe };
  }, ids.nox);
  await dismiss(page);
  await flirt();
  const am = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, c = g.chars[I.nox], f = g.chars[I.theo];
    f.rel = 20;
    const tr = H.startTrial(g, c, 'couple', 'ami');
    const s0 = tr.state;
    f.rel = 40;
    H.tickCouples(g, Date.now());
    return { ami: g.chars[tr.ami].handle, s0, state: tr.state, vibe: c.vibe };
  }, ids);
  await dismiss(page);
  await flirt();
  await G(page, (id) => { const H = window.__hype, g = H.S.game; H.startTrial(g, g.chars[id], 'couple', 'depart'); }, ids.nox);
  for (let d = 0; d < 3; d++) {
    await dm(page, ids.nox, ['bon voyage ! raconte-moi tout', 'alors, cette journée ?', 'tu me manques, reviens vite'][d]);
    await G(page, (id) => { const tr = window.__hype.S.game.trials.filter((t) => t.c === id).slice(-1)[0]; tr.at -= 24 * 3600000; }, ids.nox);
  }
  const dp = await trialOf(ids.nox);
  check('a rival: a good date with them wins it; their best friend: win them over (the trial ends on its own); a trip: a message every day for three days',
    rv.rival && rv.state === 'won' && rv.vibe === 'couple' && am.ami === 'theo.marlin' && am.s0 === 'open' && am.state === 'won' && am.vibe === 'couple' && dp.state === 'won' && dp.days.length === 3, { rv, am, dp });

  // ---------- the player's own rumor: debunk it; too late: lost, not now ----------
  await dismiss(page);
  await flirt();
  const tb = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, c = g.chars[I.nox];
    g.chars[I.zara].rel = -60; g.rumorAt = 0; g.rumors = (g.rumors || []).filter((r) => r.state !== 'live');
    const tr = H.startTrial(g, c, 'couple', 'tonbuzz');
    const r = H.liveRumor(g);
    H.rumorResult(g, r, 8, null);
    return { rumor: !!r, by: r && g.chars[r.by].handle, state: tr.state, vibe: c.vibe };
  }, ids);
  await dismiss(page);
  await flirt();
  const ex = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, c = g.chars[id];
    const tr = H.startTrial(g, c, 'couple', 'photo');
    const r0 = c.rel;
    tr.until = Date.now() - 1000;
    H.tickCouples(g, Date.now());
    return { state: tr.state, drop: r0 - c.rel, vibe: c.vibe, mem: c.mem.slice(-1)[0].t };
  }, ids.nox);
  check('the player’s own rumor just before: debunked, they stay and you are together; a trial left too long: lost, a step back, not now',
    tb.rumor && tb.by === 'zara.vey' && tb.state === 'won' && tb.vibe === 'couple' && ex.state === 'lost' && ex.drop >= 5 && ex.vibe === 'flirt' && /pas maintenant/.test(ex.mem), { tb, ex });

  // ---------- a couple kept secret: some like it, some do not; it leaks one day ----------
  await dismiss(page);
  const sec = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, c = g.chars[I.nox], z = g.chars[I.zara];
    Object.assign(c, { vibe: 'couple', officiel: 'pending', coeur: 'prudent', rel: 50 });
    const r0 = c.rel;
    H.keepCoupleSecret(g, c);
    const up = c.rel - r0;
    Object.assign(z, { vibe: 'couple', officiel: 'pending', temper: 'opportuniste', rel: 50 });
    H.keepCoupleSecret(g, z);
    const down = 50 - z.rel;
    z.vibe = null; z.officiel = undefined; z.rel = -60;
    c.secretAt = Date.now() - 2.5 * 24 * 3600000; c.leakDay = 0;
    window.__trustRolls = [0.05];
    H.tickCouples(g, Date.now());
    return { up, down, off: c.officiel, notif: g.notifs.some((n) => /a fuité/.test(n.text) && n.c === I.nox), trig: (g.triggers || []).some((x) => /sont maintenant en couple/.test(x.text)) };
  }, ids);
  check('a couple kept for the two of you: a cautious heart is grateful, an opportunist feels hidden; one day it leaks, and the network talks',
    sec.up >= 2 && sec.down >= 2 && sec.off === 'leaked' && sec.notif && sec.trig, sec);

  // ---------- a partner's bad buzz splashes the player; no news for days: it drifts, a pause ----------
  const sp = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, c = g.chars[id];
    Object.assign(c, { vibe: 'couple', officiel: 'public', rel: 60, lastTouch: Date.now() });
    c.badBuzz = { at: Date.now(), until: Date.now() + 20 * 3600000, reason: 'test', loss: 0, strength: 0.5 };
    const r0 = g.stats.reputation;
    H.tickCouples(g, Date.now());
    const r1 = g.stats.reputation;
    H.tickCouples(g, Date.now());
    const r2 = g.stats.reputation;
    delete c.badBuzz;
    Object.assign(c, { rel: 26, lastTouch: Date.now() - 4.5 * 24 * 3600000, drift: 0 });
    H.tickCouples(g, Date.now());
    return { hit: r0 - r1, again: r1 - r2, rel: c.rel, vibe: c.vibe, notif: g.notifs.some((n) => n.c === id && /tu ne donnes plus de nouvelles/.test(n.text)) };
  }, ids.nox);
  check('a public partner in a bad buzz splashes the player (once per 6 hours at most); no news for days: it drifts, and below the line, a pause',
    sp.hit > 0 && sp.again === 0 && sp.vibe === 'complique' && sp.notif, sp);

  // ---------- a flirt elsewhere, caught on a screenshot ----------
  await dismiss(page);
  const cap = await G(page, (I) => { const H = window.__hype, g = H.S.game, c = g.chars[I.nox]; Object.assign(c, { vibe: 'couple', officiel: 'public', rel: 60, cool: null, caughtAt: 0, coeur: 'jaloux' }); return c.rel; }, ids);
  await dm(page, ids.leandre, 'je craque pour toi, faut que je te le dise', [0.05, 0.99, 0.99]);
  const cp = await G(page, (id) => { const g = window.__hype.S.game, c = g.chars[id]; return { rel: c.rel, cool: c.cool && c.cool.k, notif: g.notifs.some((n) => n.c === id && /Une capture de tes messages à Léandre/.test(n.text)) }; }, ids.nox);
  check('flirting with someone else while in a couple: a screenshot reaches the partner (a jealous heart is likelier to see it): a crisis',
    cp.rel <= cap - 12 && cp.cool === 'colere' && cp.notif, { cap, cp });

  // ---------- before the wedding: the guest list (whoever is forgotten takes it badly), or a doubt to soothe ----------
  await dismiss(page);
  const wd = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, c = g.chars[I.nox], t = g.chars[I.theo];
    Object.assign(c, { vibe: 'fiancailles', rel: 75, cool: null, dare: null, followers: 50000 }); // a « moyen » date: the trial won makes it « facile »
    g.trials = [];
    t.rel = 70;
    window.__trustRolls = [0.9]; // the guest list
    g.events = (g.events || []).filter((e) => !(e.player && e.state === 'scheduled'));
    const ev = H.addEvent(g, { by: 'nox.ombre', what: 'Notre mariage au bord du lac', kind: 'rdv', in: 600 });
    const tr = (g.trials || []).find((x) => x.c === I.nox && x.state === 'open');
    return { ev: ev && ev.id, k: tr && tr.k, close: tr && tr.close, diff: ev && ev.diff };
  }, ids);
  await G(page, () => { window.__mockKindness = 2; });
  await G(page, () => window.__hype.runAct('post', 'le grand jour approche avec @nox.ombre 💍 la liste des invités arrive bientôt'));
  await idle(page);
  await G(page, () => { window.__mockKindness = null; });
  const wd2 = await G(page, (a) => { const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === a.ev), t = g.chars[a.theo]; const tr = g.trials.find((x) => x.k === 'invites'); return { state: tr && tr.state, diff: ev.diff, theoMem: t.mem.slice(-1)[0].t, theoNotif: g.notifs.some((n) => n.c === a.theo && /pas invité/.test(n.text)) }; }, { ev: wd.ev, theo: ids.theo });
  check('a wedding date set: before it, the guest list; a post that names the partner announces it, and a close friend left out takes it badly; the trial won makes the day easier',
    wd.ev && wd.k === 'invites' && wd.close.includes(ids.theo) && wd2.state === 'won' && /pas invité/.test(wd2.theoMem) && wd2.theoNotif && wd2.diff !== wd.diff, { wd, wd2 });

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  console.log(`\n${checks.filter((c) => c[0] === 'PASS').length}/${checks.length} PASS`);
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch(async (e) => {
  console.error('FAILED', e);
  if (lastPage) await lastPage.screenshot({ path: path.join(OUT, 'fail.png') }).catch(() => {});
  console.log('ERRORS', errors.join('\n'));
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  process.exit(1);
});
