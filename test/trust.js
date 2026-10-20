// Trust (0.9) end to end, in Chromium against the built hype.html with the mocked Claude runtime: each main character's
// nature (from the AI) and starting trust, the profile and the DM screens, trust moved by a conversation (with its daily
// cap) or a public post, advice refused, followed and landing well, as a flop, as a bad buzz where the character catches
// the player (shady name for a while), said yes and dropped, an answer under someone's post, a secret confided, kept,
// then betrayed, the hooks (a date stood up, a fake proof exposed), and old games given trust.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/trust.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-trust');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(process.env.PAGE || path.join(ROOT, 'hype.html'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const UMD = fs.readFileSync(process.env.UMD, 'utf8');
const SKELETON = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;

const errors = [];
const checks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let shotN = 0;
const check = (name, ok, info) => { checks.push([ok ? 'PASS' : 'FAIL', name]); console.log(ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)); };
async function shot(page, name) { await dismiss(page); shotN++; const file = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: file }); console.log('shot', path.basename(file)); }
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
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.cand || b.write || b.create); })) await sleep(300); };
// Messages arrive one after the other: wait until the last one is out.
const settle = async (page) => { await idle(page); await page.waitForFunction(() => { const g = window.__hype.S.game; return Object.values(g.dms).every((c) => c.msgs.every((m) => m.at <= Date.now())); }, null, { timeout: 15000 }).catch(() => {}); };

async function newPage(browser, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true, colorScheme: 'light' });
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
}
const lastBox = (page) => page.locator('.layer').last().locator('textarea:not([readonly])').first();
const openProfile = (page, id) => G(page, (x) => { const H = window.__hype; H.S.stack = [{ t: 'char', id: x, key: 'k' + Date.now() }]; H.update(); }, id);
const closeAll = (page) => G(page, () => { const H = window.__hype; H.S.stack = []; H.update(); });
const setTrust = (page, id, v) => G(page, (a) => { const c = window.__hype.S.game.chars[a.id]; c.trust = a.v; c.trustDay = null; }, { id, v });

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);

  // ---------- a new world: everyone's nature, a little trust to start ----------
  await newGame(page);
  const w0 = await G(page, () => {
    const H = window.__hype, g = H.S.ob.game;
    const out = H.mains(g, false).map((c) => ({ h: c.handle, t: c.trust, garde: c.garde, why: c.gardeWhy || '' }));
    const pr = window.__prompts.find((x) => /CRÉER L’UNIVERS/.test(x)) || '';
    return { out, ask: pr.includes('"garde":2,"mefiance"') && pr.includes('"garde" = à quel point') };
  });
  const by = Object.fromEntries(w0.out.map((x) => [x.h, x]));
  check('a new world: every main character gets a nature (1-3) and 0 to 35 of trust; the AI is asked for it and its reason is kept',
    w0.ask && w0.out.length === 12 && w0.out.every((x) => [1, 2, 3].includes(x.garde) && x.t >= 0 && x.t <= 35)
    && by['zara.vey'].garde === 3 && /trahie/.test(by['zara.vey'].why) && by['theo.marlin'].garde === 1, w0);
  await page.locator('.cast-card.pick', { hasText: 'Théo' }).click();
  await page.click('.cast-cta button');
  await page.waitForSelector('.post');
  await sleep(1200);
  await dismiss(page);
  const ids = await G(page, () => { const H = window.__hype, g = H.S.game; const id = (h) => H.charByHandle(g, h).id; return { zara: id('zara.vey'), theo: id('theo.marlin'), iris: id('prof.gallant'), nox: id('nox.ombre'), leandre: id('leandre.aube') }; });

  // ---------- the profile: where trust stands ----------
  await setTrust(page, ids.theo, 46);
  await openProfile(page, ids.theo);
  await page.waitForSelector('.layer .trust-sec');
  await sleep(400);
  await page.locator('.layer .trust-sec').scrollIntoViewIfNeeded();
  await shot(page, 'profile-trust');
  await overflowCheck(page, 'profile trust');
  const pf = await G(page, () => {
    const s = document.querySelector('.layer .trust-sec');
    return { text: s.textContent, ticks: s.querySelectorAll('.trustmeter b').length, on: s.querySelectorAll('.trustmeter b.on').length, steps: s.querySelectorAll('.trust-steps span.on').length, btn: (s.querySelector('.row .btn') || {}).textContent || '', dmHead: '' };
  });
  check('the profile shows trust: its level, the meter with its steps, the nature and its reason, what comes next, a button to give advice',
    /Sa confiance en toi/.test(pf.text) && /46\/100/.test(pf.text) && /À l’écoute/.test(pf.text) && /Fait vite confiance/.test(pf.text) && /croit en tout le monde/.test(pf.text)
    && /Encore 24 pour qu’il suive tes gros conseils/.test(pf.text) && pf.ticks === 3 && pf.on === 1 && pf.steps === 1 && /Donner un conseil à Théo/.test(pf.btn), pf);

  // ---------- what the AI is told ----------
  const pr0 = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, t = g.chars[a.theo];
    const dm = H.promptDM(g, t, [], 'salut !', []), adv = H.promptDM(g, t, [], 'fais une vidéo sur tes potions', [], true);
    const act = H.promptAct(g, 'post', 'bonjour Lumen', null, {}, null, {});
    return { dmTrust: /confiance 46\/100 \(à l’écoute\) ; fait vite confiance : croit en tout le monde/.test(dm), dmLine: dm.includes('{"t":"trust","d":2'), noAdv: !dm.includes('CE MESSAGE EST UN CONSEIL'),
      adv: adv.includes('## CE MESSAGE EST UN CONSEIL') && adv.includes('Confiance de Théo Marlin envers le joueur : 46/100') && adv.includes('{"t":"advice"') && adv.includes('à partir de 70') && adv.indexOf('{"t":"advice"') < adv.indexOf('{"t":"msg"'),
      ctx: /## LIENS AVEC LE JOUEUR \(relation de -100 à 100 ; confiance de 0 à 100/.test(act) && /@theo\.marlin [^\n]* · confiance 46/.test(act) && dm.includes('## LE JOUEUR ET LES AUTRES'), act: act.includes('{"t":"trust","by"') }; // (0.19: a conversation has the others in a word, its own trust in its line)
  }, ids);
  check('the AI knows each one’s trust (context, DM), may move it (DM and public lines), and gets the rule of the game with advice', Object.values(pr0).every(Boolean), pr0);

  // ---------- a conversation moves trust, within a daily cap ----------
  await G(page, () => { window.__mockTrust = 6; });
  await closeAll(page);
  await G(page, (id) => window.__hype.openDM(id), ids.theo);
  await lastBox(page).waitFor();
  await lastBox(page).fill('je t’ai gardé une place pour le tournoi, comme promis');
  await clickText(page, '.layer .send', 'Envoyer');
  await settle(page);
  const t1 = await G(page, (id) => { const g = window.__hype.S.game; return { t: g.chars[id].trust, notif: g.notifs.filter((n) => n.k === 'trust' && n.c === id).map((n) => n.text).slice(-1)[0] || '' }; }, ids.theo);
  for (let k = 0; k < 2; k++) { await G(page, (id) => window.__hype.sendDM(id, 'encore merci pour hier'), ids.theo); await settle(page); }
  const t2 = await G(page, (id) => window.__hype.S.game.chars[id].trust, ids.theo);
  await G(page, () => { window.__mockTrust = 0; });
  check('a word kept in a DM: +6 asked, +8 for Théo who trusts easily (×1.25); what talking brings stops at +12 a day', t1.t === 54 && /Théo Marlin : confiance \+8 · tu as tenu parole/.test(t1.notif) && t2 === 58, { t1, t2 });

  // ---------- advice refused: not enough trust ----------
  await setTrust(page, ids.zara, 20);
  await closeAll(page);
  await openProfile(page, ids.zara);
  await page.waitForSelector('.layer .trust-sec');
  await clickText(page, '.layer .trust-sec .btn', 'Donner un conseil');
  await page.waitForSelector('.layer .adv-toggle.on');
  await sleep(300);
  const hint = await G(page, () => ({ hint: (document.querySelector('.layer .adv-hint') || {}).textContent || '', ph: [...document.querySelectorAll('.layer')].pop().querySelector('.reply-box textarea').getAttribute('placeholder') }));
  await lastBox(page).fill('fais une vidéo sur tes entraînements, tout le monde veut voir');
  await shot(page, 'dm-advice-mode');
  await overflowCheck(page, 'dm advice mode');
  await clickText(page, '.layer .send', 'Envoyer');
  await settle(page);
  await sleep(400);
  const r0 = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, c = g.chars[id];
    const pr = window.__prompts.slice(-1)[0];
    const mine = g.dms[id].msgs.filter((m) => m.me).slice(-1)[0];
    return { planned: !!H.plannedAdvice(g, c), adv: mine.adv === 1, tag: !!document.querySelector('.layer .bubble.me.adv .adv-tag'), off: !document.querySelector('.layer .adv-toggle.on'), prompt: pr.includes('## CE MESSAGE EST UN CONSEIL') && pr.includes('Confiance de Zara Vey envers le joueur : 20/100'), reply: g.dms[id].msgs.slice(-1)[0].text };
  }, ids.zara);
  check('advice mode from the profile: the box says what this trust allows; Zara (20) refuses, the message is marked as advice, the mode switches off',
    /ne t’écoute pas encore \(confiance 20\/100, il en faut 40\)/.test(hint.hint) && /Ton conseil à Zara/.test(hint.ph) && !r0.planned && r0.adv && r0.tag && r0.off && r0.prompt && /pourquoi je t’écouterais/.test(r0.reply), { hint, r0 });

  // ---------- advice followed, and it works ----------
  await setTrust(page, ids.theo, 75);
  await G(page, () => { window.__mockAdvice = { risk: 1, q: 2, kind: 'video', what: 'une vidéo sur ses potions préférées', text: 'nouvelle vidéo : mes 5 potions préférées, la 3e va vous choquer 🧪', in: 60 }; });
  await closeAll(page);
  await G(page, (id) => window.__hype.openAdvice(id), ids.theo);
  await page.waitForSelector('.layer .adv-toggle.on');
  await lastBox(page).fill('fais une vidéo sur tes potions préférées, ça va cartonner');
  await clickText(page, '.layer .send', 'Envoyer');
  await settle(page);
  await sleep(1800);
  const a1 = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, a = H.plannedAdvice(g, g.chars[id]);
    return a && { kind: a.kind, risk: a.risk, q: a.q, inMin: Math.round((a.due - Date.now()) / 60000), bail: !!a.bail, chip: (document.querySelector('.layer .adv-chip') || {}).textContent || '', notif: g.notifs.filter((n) => n.k === 'advice').map((n) => n.text).slice(-1)[0] || '' };
  }, ids.theo);
  await shot(page, 'dm-advice-planned');
  check('Théo (75) follows a video advice: planned in an hour, shown in the conversation with a way to jump there',
    !!a1 && a1.kind === 'video' && a1.risk === 1 && a1.q === 2 && a1.inMin >= 58 && a1.inMin <= 60 && !a1.bail && /Théo suit ton conseil/.test(a1.chip) && /potions préférées/.test(a1.chip) && /Théo Marlin va suivre ton conseil/.test(a1.notif), a1);
  const b1 = await G(page, (id) => { const g = window.__hype.S.game; return { t: g.chars[id].trust, f: g.chars[id].followers, n: window.__prompts.length }; }, ids.theo);
  await G(page, () => { window.__trustRolls = [0.01]; });
  await clickText(page, '.layer .adv-chip .btn', 'Avancer');
  await idle(page, 30000);
  await settle(page);
  await sleep(1500);
  const w1 = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, c = g.chars[a.id], rec = g.advice.slice(-1)[0];
    const post = g.posts.find((p) => p.id === rec.p);
    const narr = window.__prompts.slice(a.n).find((x) => x.includes('Le temps passe en accéléré')) || '';
    return { state: rec.state, video: post && post.video && post.video.topic, by: post && post.a === 'c:' + a.id, up: c.trust - a.t, fol: c.followers - a.f, notif: g.notifs.filter((n) => n.k === 'advice').map((n) => n.text).slice(-1)[0] || '',
      card: [...document.querySelectorAll('.layer .dm-card.adv')].map((x) => x.textContent).slice(-1)[0] || '', told: narr.includes('a suivi un conseil du joueur') && narr.includes('ça cartonne') };
  }, { id: ids.theo, t: b1.t, f: b1.f, n: b1.n });
  await shot(page, 'dm-advice-win');
  check('when it is due Théo posts the video; good advice works: followers for him, trust up (+6 to +10, ×1.25), the card in the DM, the network told',
    w1.state === 'win' && w1.video === 'une vidéo sur ses potions préférées' && w1.by && w1.up >= 8 && w1.up <= 13 && w1.fol > 0 && /Ton conseil a marché : Théo cartonne/.test(w1.notif) && /ça a cartonné/.test(w1.card) && w1.told, w1);

  // ---------- said yes without enough trust: dropped when it is due ----------
  await setTrust(page, ids.leandre, 45);
  await G(page, () => { window.__mockAdvice = { risk: 1, q: 1, follow: true, kind: 'post', what: 'un post pour féliciter Brasier', text: 'bravo Brasier, respect.' }; });
  await G(page, (id) => window.__hype.sendDM(id, 'félicite Brasier en public, ça te rendra sympathique', { advice: true }), ids.leandre);
  await settle(page);
  const bail = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, c = g.chars[id], a = H.plannedAdvice(g, c);
    const bailed = a && a.bail;
    a.due = Date.now() - 1000; H.tickAdvice(g, Date.now());
    return { bailed, state: a.state, posted: g.posts.some((p) => p.text === 'bravo Brasier, respect.'), notif: g.notifs.filter((n) => n.k === 'advice').map((n) => n.text).slice(-1)[0] || '' };
  }, ids.leandre);
  check('Léandre (45) says yes to a notable advice (70 needed): when it is due, he drops it, nothing posted', bail.bailed && bail.state === 'bailed' && !bail.posted && /Léandre a finalement laissé tomber ton conseil/.test(bail.notif), bail);

  // ---------- an answer under someone's post ----------
  await G(page, () => { const H = window.__hype; H.addAmbientPost(H.S.game, { by: 'gazette_lumen', text: 'SONDAGE : qui gagnera la Coupe des Astres ? #Lumen' }, Date.now() - 60000, Date.now() - 60000); });
  await setTrust(page, ids.theo, 80);
  await G(page, () => { window.__mockAdvice = { risk: 0, q: 1, kind: 'reply', to: 'gazette_lumen', what: 'répondre au sondage de la Gazette', text: 'Marée, évidemment. et on ramène les cookies 🍪', in: 15 }; });
  await G(page, (id) => window.__hype.sendDM(id, 'réponds au sondage de la Gazette, fais-toi remarquer', { advice: true }), ids.theo);
  await settle(page);
  const rp = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, a = H.plannedAdvice(g, g.chars[id]);
    window.__trustRolls = [0.01];
    a.due = Date.now() - 1000; H.tickAdvice(g, Date.now());
    const post = g.posts.find((p) => p.id === a.p);
    return { state: a.state, under: post && post.a !== 'c:' + id && /SONDAGE/.test(post.text), reply: !!(post && post.replies.find((r) => r.id === a.r && r.a === 'c:' + id && /cookies/.test(r.text))) };
  }, ids.theo);
  check('an advice to answer someone: the answer goes under their latest post', rp.state === 'win' && rp.under && rp.reply, rp);

  // ---------- a flop ----------
  const fl = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, c = g.chars[id];
    c.trust = 60; c.trustDay = null;
    const a = H.addAdvice(g, c, { follow: true, risk: 0, q: 0, kind: 'post', what: 'un post sur la météo des étoiles', text: 'Ce soir, Vénus est visible à l’œil nu.', in: 10 });
    window.__trustRolls = [0.9];
    a.due = Date.now() - 1000; H.tickAdvice(g, Date.now());
    return { state: a.state, t: c.trust, notif: g.notifs.filter((n) => n.k === 'advice').map((n) => n.text).slice(-1)[0] || '' };
  }, ids.iris);
  check('a harmless advice that falls flat: a flop, a little trust lost (−3), the player told', fl.state === 'flop' && fl.t === 57 && /Ton conseil a fait un flop/.test(fl.notif) && /déçue/.test(fl.notif), fl);

  // ---------- a bad advice: bad buzz, and Zara understands ----------
  const z0 = await G(page, (id) => { const g = window.__hype.S.game, c = g.chars[id]; c.trust = 80; c.trustDay = null; c.coeur = 'serein'; /* (a fortress, drawn at random, would take −32) */ return { rel: c.rel, f: c.followers, rep: g.stats.reputation }; }, ids.zara);
  await G(page, () => { window.__mockAdvice = { risk: 1, q: -3, follow: true, kind: 'post', what: 'un post qui clashe toute la maison Aube', text: 'la maison Aube ? des clowns. tous. 🤡', in: 30 }; });
  await G(page, (id) => window.__hype.sendDM(id, 'clashe la maison Aube, ça va te faire de la pub', { advice: true }), ids.zara);
  await settle(page);
  const zb = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, c = g.chars[a.id], ad = H.plannedAdvice(g, c);
    window.__trustRolls = [0.5, 0.2, 0.1]; // not a success; caught; in public
    ad.due = Date.now() - 1000; H.tickAdvice(g, Date.now());
    const ctx = H.promptDM(g, g.chars[a.theo], [], 'salut', []);
    return { state: ad.state, caught: ad.caught, bb: H.inBadBuzz(c) && c.badBuzz.advice === ad.id, lost: a.f - c.followers, t: c.trust, rel: a.rel - c.rel, shady: H.isShady(g), rep: Math.round((a.rep - g.stats.reputation) * 10) / 10,
      gate: g.posts.some((p) => /ZaraVeyGate/.test(p.text)), notif: g.notifs.filter((n) => n.k === 'screen').map((n) => n.text).slice(-1)[0] || '',
      ctx: ctx.includes('réputation de manipuler') && ctx.includes('EN PLEIN BAD BUZZ après « un post qui clashe toute la maison Aube »'), mult: H.trustMult(g, g.chars[a.theo]) };
  }, { id: ids.zara, theo: ids.theo, f: z0.f, rel: z0.rel, rep: z0.rep });
  check('a terrible advice: Zara posts it, bad buzz (followers lost), she understands (−45 trust, −20 relation) and says it in public: −8 reputation, the player is known as a manipulator',
    zb.state === 'buzz' && zb.caught === 'public' && zb.bb && zb.lost > 0 && zb.t === 35 && zb.rel === 20 && zb.shady && zb.rep === 8 && zb.gate && /Zara a compris que tu l’as piégée et te balance en public/.test(zb.notif) && zb.ctx && Math.abs(zb.mult - 0.625) < 1e-9, zb);
  await closeAll(page);
  await G(page, () => { const H = window.__hype; H.S.tab = 'profile'; H.update(); });
  await page.waitForSelector('.prof-stats .chip.bad');
  const shadyChip = await G(page, () => [...document.querySelectorAll('.prof-stats .chip')].map((x) => x.textContent).join(' | '));
  await shot(page, 'profile-shady');
  check('the player’s profile says it: « Manipulatrice », for a while; the relations list shows each trust', /Manipulatrice · encore/.test(shadyChip) && /confiance \d+/.test(await page.textContent('.rel-row')), shadyChip);

  // ---------- a secret confided, kept, then betrayed ----------
  await G(page, () => { const H = window.__hype; H.S.tab = 'feed'; H.update(); });
  await setTrust(page, ids.nox, 75);
  await G(page, () => { window.__mockConfide = true; });
  const canPr = await G(page, (id) => { const H = window.__hype, g = H.S.game; return H.promptDM(g, g.chars[id], [], 'tu peux tout me dire', []).includes('{"t":"confide"}'); }, ids.nox);
  await G(page, (id) => window.__hype.sendDM(id, 'tu peux tout me dire, tu sais'), ids.nox);
  await settle(page);
  await G(page, () => { window.__mockConfide = false; });
  await openProfile(page, ids.nox);
  await page.waitForSelector('.layer .secret-told');
  await page.locator('.layer .secret-told').scrollIntoViewIfNeeded();
  await shot(page, 'profile-secret-told');
  const sc = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, c = g.chars[id];
    const after = H.promptDM(g, c, [], 'ça va ?', []);
    return { told: !!c.secretTold, sec: (document.querySelector('.layer .secret-told') || {}).textContent || '', notif: g.notifs.some((n) => n.k === 'secret' && n.c === id), prompt: after.includes('Son secret, qu’iel a confié au joueur') && !after.includes('{"t":"confide"}') };
  }, ids.nox);
  check('Nox (75) confides the secret: noted, shown on the profile to the player alone, and the AI knows the player knows', canPr && sc.told && /Ce qu’iel t’a confié/.test(sc.sec) && /fille de la directrice/.test(sc.sec) && sc.notif && sc.prompt, sc);
  const kept = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, c = g.chars[id], t0 = c.trust;
    H.shiftTime(g, 3 * 86400000 + 60000); H.tickAdvice(g, Date.now());
    return { up: c.trust - t0, kept: !!c.secretKept, shady: H.isShady(g) };
  }, ids.nox);
  check('three days later, the secret kept: Nox trusts more (+6 asked, ×0.9), and the manipulator name has worn off', kept.kept && kept.up === 5 && !kept.shady, kept);
  const bt = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, c = g.chars[id], r0 = c.rel;
    H.startBadBuzz(g, c, 'Nox est la fille de la directrice', 9, true, 0.9);
    return { out: !!c.secretOut, t: c.trust, rel: r0 - c.rel, shady: H.isShady(g), mem: c.mem.some((m) => /révélé le secret/.test(m.t)) };
  }, ids.nox);
  check('the secret comes out through the player: betrayal, trust at 0, −30 relation, and the manipulator name again', bt.out && bt.t === 0 && bt.rel === 30 && bt.shady && bt.mem, bt);
  await closeAll(page);

  // ---------- a public post moves trust; a date stood up ----------
  await G(page, (id) => { const g = window.__hype.S.game; g.shady = null; const c = g.chars[id]; c.trust = 50; c.trustDay = null; window.__mockActTrust = 'theo.marlin'; }, ids.theo);
  await clickText(page, 'button', 'Publier mon premier post');
  await lastBox(page).waitFor();
  await lastBox(page).fill('Théo est le délégué le plus honnête de Lumen, et je le défendrai toujours');
  await clickText(page, '.layer-head button', 'Publier');
  await idle(page, 30000);
  await sleep(11000);
  const ac = await G(page, (id) => { window.__mockActTrust = null; return window.__hype.S.game.chars[id].trust; }, ids.theo);
  const su = await G(page, (id) => { const H = window.__hype, g = H.S.game, c = g.chars[id], t0 = c.trust; H.standUp(g, { c: id, what: 'un café au réfectoire', state: 'scheduled' }); return t0 - c.trust; }, ids.theo);
  check('defended in public: +6 asked, +8 for Théo; a date stood up costs 8 of trust', ac === 58 && su === 8, { ac, su });

  // ---------- a fake proof exposed: everybody trusts the player less ----------
  const fk = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, c = g.chars[a.l];
    const before = Object.fromEntries(H.mains(g).map((x) => [x.id, x.trust]));
    H.fakeBusted(g, c, { kind: 'photo', desc: 'Léandre qui triche au conseil', post: null, state: 'safe' }, false);
    const others = H.mains(g).filter((x) => x !== c);
    return { all: others.every((x) => x.trust === Math.max(0, before[x.id] - 8)), target: before[a.l] - c.trust, want: Math.min(60, before[a.l]), shady: H.isShady(g) };
  }, { l: ids.leandre });
  await dismiss(page);
  check('a fake proof exposed: −8 of trust with everyone, −60 with its target, and the manipulator name', fk.all && fk.target === fk.want && fk.target > 0 && fk.shady, fk);

  // ---------- games from before 0.9 ----------
  const mg = await G(page, () => {
    const H = window.__hype;
    const old = { order: ['c1', 'c2', 'c3'], chars: { c1: { kind: 'main', handle: 'alpha', rel: 70, vibe: 'bff' }, c2: { kind: 'main', handle: 'beta', rel: -40 }, c3: { kind: 'media', handle: 'news', rel: 0 } } };
    const twin = JSON.parse(JSON.stringify(old));
    H.migrateTrust(old); H.migrateTrust(twin);
    const g = H.S.game, snap = JSON.parse(JSON.stringify(g));
    for (const id in snap.chars) { delete snap.chars[id].trust; delete snap.chars[id].garde; }
    delete snap.advice;
    H.migrate(snap);
    return { a: old.chars.c1, b: old.chars.c2, media: 'trust' in old.chars.c3, same: old.chars.c1.garde === twin.chars.c1.garde && old.chars.c2.garde === twin.chars.c2.garde, adv: Array.isArray(old.advice),
      loaded: H.mains(snap, false).every((c) => typeof c.trust === 'number' && [1, 2, 3].includes(c.garde)) && Array.isArray(snap.advice) };
  });
  check('games from before 0.9: a nature for each main character (always the same), trust from the relation and the bond, nothing for the media',
    mg.a.trust >= 45 && mg.a.trust <= 70 && mg.b.trust >= 0 && mg.b.trust <= 21 && !mg.media && mg.same && mg.adv && mg.loaded, mg);

  // ---------- « Écrire pour moi » knows it is advice ----------
  const wr = await G(page, (id) => { const H = window.__hype, g = H.S.game; return H.promptWrite(g, { kind: 'dm', c: g.chars[id], advice: true, draft: '' }).includes('C’est un CONSEIL que le joueur donne'); }, ids.theo);
  check('« Écrire pour moi » in advice mode writes advice', wr, wr);

  // ---------- dark mode: the trust section and the advice box ----------
  await page.emulateMedia({ colorScheme: 'dark' });
  await openProfile(page, ids.theo);
  await page.waitForSelector('.layer .trust-sec');
  await page.locator('.layer .trust-sec').scrollIntoViewIfNeeded();
  await shot(page, 'profile-trust-dark');
  await closeAll(page);
  await G(page, (id) => window.__hype.openAdvice(id), ids.theo);
  await page.waitForSelector('.layer .adv-toggle.on');
  await sleep(500);
  await shot(page, 'dm-advice-dark');
  await page.emulateMedia({ colorScheme: 'light' });

  console.log('\nCHECKS', checks.filter((c) => c[0] === 'PASS').length + '/' + checks.length);
  const errs = errors.filter((e) => !/favicon|net::ERR_FAILED|Failed to load resource/.test(e));
  console.log('ERRORS', errs.length ? '\n' + errs.join('\n') : 'none');
  await browser.close();
  process.exit(checks.every((c) => c[0] === 'PASS') && !errs.length ? 0 : 1);
})().catch(async (e) => { console.error(e); process.exit(2); });
