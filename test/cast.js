// 0.16 end to end, in Chromium against the built hype.html with the mocked Claude runtime: anyone can join the cast.
// - a brand contact, someone of the team, a candidate: once it gets personal (the AI says so in their private messages,
//   or they simply grow close), they become a main character, and keep their job;
// - from then on, everything works with them: the AI may flirt, set plans and invitations, their heart and trust count,
//   a crush, a date, ties with the others; their deals and their job go on;
// - a candidate who joined the cast and is not hired stays in the player's life; one who joined is never slimmed away;
// - on their profile: the trust, the dynamic, their memories (but not the badge of the original cast).
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/cast.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-cast');
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
async function dm(page, id, text) {
  const n0 = await G(page, () => window.__prompts.length);
  await G(page, (a) => window.__hype.sendDM(a.id, a.text), { id, text });
  await idle(page);
  return G(page, (n) => window.__prompts.slice(n), n0);
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

  // ---------- a brand contact: pro at first ----------
  const b0 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    g.stats.followers = 6000;
    const d = H.makeOffer(g, { brand: 'Potions Pétillantes', contact: 'Inès Garnier', g: 'f', sector: 'boisson', product: 'sa potion énergisante au citron', what: 'vidéo' });
    const c = d && g.chars[d.contact];
    return c ? { id: c.id, kind: c.kind, main: H.isMain(c), inMains: H.mains(g).includes(c), deal: d.id } : null;
  });
  const p1 = await dm(page, b0 && b0.id, 'merci pour l’offre ! je regarde ça ce soir');
  const c1 = await G(page, (id) => { const H = window.__hype, g = H.S.game, c = g.chars[id]; return { main: H.isMain(c), joined: !!c.joined }; }, b0.id);
  const ask = p1.find((p) => p.includes('CONVERSATION PRIVÉE')) || '';
  check('a brand contact starts as a contact (not in the cast): the AI may say it gets personal (a line it can add), and nothing changes until it does',
    !!b0 && b0.kind === 'brand' && !b0.main && !b0.inMains && ask.includes('{"t":"perso"') && !ask.includes('"t":"vibe"') && /reste une personne : si le joueur l’amène sur le terrain perso/.test(ask) && !c1.main && !c1.joined, { b0, c1, perso: ask.includes('{"t":"perso"') });

  // ---------- it gets personal: she joins the cast, and keeps her job ----------
  await G(page, () => { window.__mockPerso = 'on a parlé de tout sauf de boulot'; });
  await dm(page, b0.id, 'au fait, tu fais quoi ce week-end, toi ?');
  await G(page, () => { window.__mockPerso = null; });
  const j1 = await G(page, (I) => {
    const H = window.__hype, g = H.S.game, c = g.chars[I.id];
    const others = H.mains(g).filter((o) => o !== c);
    return {
      main: H.isMain(c), joined: !!c.joined, kind: c.kind, inMains: H.mains(g).includes(c), trust: typeof c.trust, temper: !!c.temper, coeur: !!c.coeur,
      ties: others.every((o) => typeof g.ties[[c.id, o.id].sort().join('|')] === 'number'),
      mem: (c.mem || []).some((m) => /c’est devenu perso : on a parlé de tout sauf de boulot/.test(m.t)),
      notif: g.notifs.some((n) => n.c === c.id && /Avec Inès, ce n’est plus seulement le travail/.test(n.text)),
      deal: (g.deals.find((d) => d.id === I.deal) || {}).contact === c.id,
    };
  }, b0);
  const ask2 = await G(page, (id) => { const H = window.__hype, g = H.S.game; return H.promptDM(g, g.chars[id], [], 'ça te dirait un verre un de ces soirs ?'); }, b0.id);
  check('when the AI says it got personal, she joins the cast: a heart, trust, a temperament, ties with everyone, she remembers it, the player is told (in the world’s words); her job and her deal stay',
    j1.main && j1.joined && j1.kind === 'brand' && j1.inMains && j1.trust === 'number' && j1.temper && j1.coeur && j1.ties && j1.mem && j1.notif && j1.deal, j1);
  check('from then on, her private messages work like the cast’s: a dynamic, plans and invitations, her heart, and the AI knows she is still the brand’s contact (and that it is personal now)',
    ask2.includes('"t":"vibe"') && ask2.includes('"t":"invite"') && /Côté cœur/.test(ask2) && /contact pro du joueur \(Partenariats · Potions Pétillantes\), et c’est devenu personnel entre eux/.test(ask2) && /chargé·e des partenariats chez Potions Pétillantes/.test(ask2) && /c’est devenu personnel/.test(ask2) && !ask2.includes('{"t":"perso"'),
    { vibe: ask2.includes('"t":"vibe"'), invite: ask2.includes('"t":"invite"'), job: /contact pro du joueur/.test(ask2) });

  // ---------- romance works: a crush, an invitation, a date ----------
  const r1 = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, c = g.chars[id];
    c.rel = 30; c.cool = null; c.pace = null; if (c.age > 34) c.age = 29; // (a contact drawn older has no romance: the point here is a peer)
    const crush = H.applyVibe(g, c, 'crush', 'un verre qui a duré trois heures');
    const iv = H.addInvite(g, c, { what: 'un verre au Café des Astres', day: 2, at: '20:30' });
    const ev = iv ? H.acceptInvite(g, iv) : null;
    return { crush, vibe: c.vibe, iv: !!iv, ev: !!ev, onAgenda: H.activeEvents(g).some((e) => e.player && e.c === c.id) };
  }, b0.id);
  check('with her, romance works like with anyone in the cast: a crush, an invitation, a date on the agenda', r1.crush && r1.vibe === 'crush' && r1.iv && r1.ev && r1.onAgenda, r1);

  // ---------- growing close does it too; a candidate who joined stays when someone else is hired ----------
  const k1 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    g.career.cash = 100000;
    const a = H.addCandidate(g, 'monteur', { name: 'Bastien Roche', g: 'm', tier: 1 });
    const b = H.addCandidate(g, 'monteur', { name: 'Iris Vasquez', g: 'f', tier: 2 });
    const c = H.addCandidate(g, 'monteur', { name: 'Noé Dumas', g: 'm', tier: 0 });
    a.rel = 30;
    H.applyRel(g, a, 8, 'un bon échange', Date.now(), 10);
    const before = { main: H.isMain(a), rel: a.rel };
    a.rel = 45;
    H.applyRel(g, a, 8, 'un fou rire', Date.now(), 10);
    const after = { main: H.isMain(a), mem: (a.mem || []).some((m) => /vous êtes devenus proches/.test(m.t)) };
    const hired = H.hireStaff(g, b);
    return { before, after, hired, a: { kind: a.kind, main: H.isMain(a), inDMs: ['main', 'brand', 'staff', 'cand', 'ex'].includes(a.kind) }, b: b.kind, c: c.kind };
  });
  check('growing close is personal too (a candidate at 50 joins the cast, not before); when someone else gets the job, the one who joined stays in the player’s life (the others are let go)',
    !k1.before.main && k1.after.main && k1.after.mem && k1.hired && k1.a.kind === 'main' && k1.a.main && k1.a.inDMs && k1.b === 'staff' && k1.c === 'gone', k1);

  // ---------- one who joined is never slimmed away ----------
  const s1 = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, c = g.chars[id];
    for (const d of g.deals) if (d.contact === id) d.state = 'done';
    const d2 = H.makeOffer(g, { brand: 'Chaudrons Durand', contact: 'Paul Durand', g: 'm', sector: 'maison', product: 'un chaudron anti-adhésif', what: 'vidéo' });
    const o = d2 && g.chars[d2.contact];
    if (d2) d2.state = 'done';
    for (const x of [c, o]) { if (!x) continue; x.unlockedAt = 1; const cv = g.dms[x.id]; if (cv) for (const m of cv.msgs) { m.ts = 1; m.at = 1; } }
    H.compactCore(g, 0, () => 1e9);
    return { joined: { slim: !!c.slim, personality: c.personality, mem: (c.mem || []).length }, other: o ? { slim: !!o.slim, mem: (o.mem || []).length } : null };
  }, b0.id);
  check('a contact who joined the cast is never slimmed away to save space (an idle one who did not is)', !s1.joined.slim && !!s1.joined.personality && s1.joined.mem > 0 && s1.other && s1.other.slim, s1);

  // ---------- her profile ----------
  await G(page, (id) => { window.__hype.S.stack = []; window.__hype.openChar(id); }, b0.id);
  await page.waitForSelector('.layer .prof', { timeout: 5000 });
  await sleep(500);
  await dismiss(page);
  const pf = await page.$eval('.layer', (e) => { const v = e.querySelector('.prof h2 .vf'); return { text: e.textContent, badge: !!v, where: v ? v.parentElement.outerHTML.slice(0, 200) : '' }; });
  await shot(page, 'joined-profile');
  await G(page, (id) => { window.__hype.S.stack = []; window.__hype.openDM(id); }, b0.id);
  await page.waitForSelector('.layer .layer-head .who', { timeout: 5000 });
  await sleep(400);
  const head = await page.$eval('.layer .layer-head .who div span', (e) => e.textContent);
  await shot(page, 'joined-dm');
  await G(page, () => { window.__hype.S.stack = []; window.__hype.update(); });
  check('her profile shows what the cast’s do (the relation, her trust, your dynamic, her memories), not the original cast’s badge; the conversation shows where you stand',
    /Relation :/.test(pf.text) && /Sa confiance en toi/.test(pf.text) && /Votre dynamique/.test(pf.text) && /Ce qu’Inès retient de toi|Ce que Inès retient de toi/.test(pf.text) && !pf.badge && /confiance \d+/.test(head) && /Crush|💘/.test(head + pf.text), { badge: pf.badge, head });

  // ---------- 0.16: from the second date on, the exigence is what they live, not their followers ----------
  const ex = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = H.charByHandle(g, 'theo.marlin'), z = H.charByHandle(g, 'zara.vey');
    for (const c of H.mains(g)) if (c !== z && ['crush', 'flirt', 'couple', 'fiancailles', 'mariage'].includes(c.vibe)) c.vibe = null;
    for (const c of [t, z]) { c.cool = null; c.badBuzz = null; c.dates = 2; c.unlocked = true; }
    g.rumors = []; g.stats.followers = 1000; g.events = (g.events || []).filter((e) => !e.player);
    t.vibe = 'amitie'; t.rel = 70; t.trust = 70; t.coeur = 'serein'; t.followers = 5000;
    z.vibe = 'flirt'; z.rel = 25; z.coeur = 'serein'; z.followers = 480000;
    const mk = (c, what, inMin) => H.addEvent(g, { by: c.handle, what, kind: 'rdv', in: inMin });
    const e1 = mk(t, 'un verre chez moi, jeux de société', 300);
    const e2 = mk(z, 'un dîner aux chandelles au restaurant du lac', 600);
    const x1 = H.dateExigence(g, e1), x2a = H.dateExigence(g, e2);
    const now0 = Date.now();
    g.rumors = [{ id: 'r-test', by: t.id, text: 'paie ses abonnés', sev: 2, at: now0, until: now0 + 3 * 3600000, drain: now0, state: 'live', defended: [], post: null }];
    const x2b = H.dateExigence(g, e2);
    const e3 = mk(z, 'une soirée film chez elle, plaid et pizza', 900);
    const x3 = H.dateExigence(g, e3);
    g.events = g.events.filter((e) => e !== e3);
    return { e2: e2.id, talk: H.isTalk(g, e2), x1: { ix: x1.ix, why: x1.why }, x2a: { ix: x2a.ix, why: x2a.why, pub: x2a.pub }, x2b: { ix: x2b.ix, why: x2b.why }, x3: { ix: x3.ix, why: x3.why, pub: x3.pub } };
  });
  check('from the second date, the exigence is what they live: close friends at home, easy; a dinner for two in public with someone famous (recognized everywhere), harder, and a rumor about the player weighs too; at home, peace',
    ex.talk && ex.x1.ix === 0 && ex.x1.why.includes('💞 Vous êtes proches') && ex.x1.why.includes('🍻 Entre potes')
    && ex.x2a.ix === 3 && ex.x2a.pub && ex.x2a.why.includes('🕯️ Un dîner en tête-à-tête') && ex.x2a.why.includes('👀 On vous reconnaît en public')
    && ex.x2b.ix === 4 && ex.x2b.why.includes('🗣️ Une rumeur court sur toi') && ex.x3.ix === 2 && !ex.x3.pub && ex.x3.why.includes('🏠 Chez vous, tranquilles'), ex);
  // 0.32.1: at someone's place (« Chez Zara », « chez @handle », « chez le joueur »), somewhere closed, or each at home: nobody
  // recognizes them (no « On vous reconnaît en public », no stolen photo, no leak, no fans « vus ensemble »)
  const pl = await G(page, () => {
    const H = window.__hype, g = H.S.game, z = H.charByHandle(g, 'zara.vey'), P = (what) => H.meetPlace(g, { what });
    const mk = (what) => { const e = H.addEvent(g, { by: z.handle, what, kind: 'rdv', in: 1200 }); const x = H.dateExigence(g, e); const end = (() => { e.played = { tier: 'top', score: 0.9, diff: e.diff || 'moyen' }; e.talk = null; return H.promptDateEnd(g, e); })(); g.events = g.events.filter((y) => y !== e); return { pub: x.pub, why: x.why, seen: end.includes('des gens les ont reconnus'), leak: end.includes('la photo floue qui fuite'), quiet: end.includes('personne ne les a vus ensemble') }; };
    return {
      home: ['Chez Zara : cuisiner et soirée à deux', 'Soirée chez @zara.vey, elle apporte un dessert', 'Chez le joueur : dîner et film', `Un goûter chez @${g.player.handle}, tous les deux`, 'Dîner chez Zara et soirée à deux', 'Une soirée chez ses parents'].map(P),
      shut: ['Au local : démo sur les platines avant l’ouverture', 'Au bar : filmer la balance dans la salle vide', 'Soirée privée au rooftop', 'Une séance au studio photo'].map(P),
      apart: ['Vocal et quelques parties de Valorant', 'Appel pour inventer un concept', 'Visio du soir', 'Appel au calme, chacun chez soi avec une boisson'].map(P),
      out: ['Dîner à volonté chez Luigi, chacun paie son repas', 'Un verre au café du Port', 'Balade au bord du canal'].map(P),
      xHome: mk('Chez Zara : cuisiner et soirée à deux'), xShut: mk('Au local : démo sur les platines'), xApart: mk('Visio du soir'), xOut: mk('Un verre au café du Port'),
    };
  });
  check('0.32.1: at someone’s place, somewhere closed or each at home, nobody recognizes them (never « On vous reconnaît en public », no leak at the end); in a café or a restaurant « chez Luigi », yes',
    pl.home.every((x) => x === 'home') && pl.shut.every((x) => x === 'shut') && pl.apart.every((x) => x === 'apart') && pl.out.every((x) => x === 'public')
    && !pl.xHome.pub && pl.xHome.why.includes('🏠 Chez vous, tranquilles') && !pl.xHome.seen && !pl.xHome.leak && pl.xHome.quiet
    && !pl.xShut.pub && pl.xShut.why.includes('🔒 À l’abri des regards') && !pl.xShut.leak && pl.xShut.quiet
    && !pl.xApart.pub && pl.xApart.why.includes('📱 À distance, tranquilles') && !pl.xApart.leak
    && pl.xOut.pub && pl.xOut.why.includes('👀 On vous reconnaît en public') && pl.xOut.seen && pl.xOut.leak, pl);
  await G(page, (id) => { window.__hype.S.stack = []; window.__hype.openLayer({ t: 'minigame', id }); window.__hype.update(); }, ex.e2);
  await page.waitForSelector('.layer .ex-why .chip', { timeout: 5000 });
  const setup = await page.$eval('.layer', (e) => ({ head: (e.querySelector('.diff-opt b') || {}).textContent || '', small: (e.querySelector('.diff-opt small') || {}).textContent || '', chips: [...e.querySelectorAll('.ex-why .chip')].map((x) => { const c = x.cloneNode(true); for (const i of c.querySelectorAll('img.emo')) i.replaceWith(i.alt); return c.textContent; }) })); // (our stickers read as their emoji)
  await shot(page, 'date-exigence');
  await G(page, () => { window.__hype.S.stack = []; window.__hype.update(); });
  // the evening: what they hope for (from their messages, never said), met or not; and recognized in public
  await G(page, (id) => {
    const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === id);
    ev.due = Date.now() - 60000;
    window.__mockExpect = 'qu’on reparle enfin de la tour nord';
    window.__mockReacts = ['amuse', 'amuse', 'amuse', 'amuse', 'amuse'];
    return H.openTalk(ev);
  }, ex.e2);
  await idle(page);
  const say = async (text) => { await G(page, (a) => window.__hype.talkTurn(window.__hype.S.game.events.find((e) => e.id === a.id), a.text), { id: ex.e2, text }); await idle(page); };
  await say('tu sais quoi, j’ai repensé à la tour nord. tu voulais me montrer quoi, là-haut ?');
  const tp = await G(page, () => window.__prompts.filter((x) => x.includes('LE RENDEZ-VOUS, EN VRAI')).slice(-1)[0] || '');
  await say('ce resto est trop bien choisi, franchement');
  await say('et toi, ta semaine ?');
  await say('j’ai passé une super soirée');
  await say('on remet ça bientôt ?');
  await G(page, (id) => window.__hype.lastWord(window.__hype.S.game.events.find((e) => e.id === id), ''), ex.e2); // 0.22.3: a goodbye, no last word
  const ev2 = await G(page, (id) => { const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === id); return { expect: ev.talk.expect, met: !!ev.talk.met, ix: ev.talk.ex.ix, diff: ev.diff, played: ev.played, open0: (window.__prompts.find((x) => x.includes('LE DÉBUT DE LA SOIRÉE') && x.includes('dîner aux chandelles')) || '').includes('{"t":"expect"') }; }, ex.e2);
  await G(page, () => { window.__mockExpect = null; });
  const want = Math.min(1, Math.max(0, 0.75 - 0.03 * (ev2.ix + 1) + 0.08)); // (0.27.9: each level a notch harder)
  check('the evening: they come with an expectation born from their messages (the AI writes it, the player never sees it); meeting it counts (a bonus on the evening), and being recognized in public is part of it (the AI is told); the gains follow the exigence',
    ev2.open0 && ev2.expect === 'qu’on reparle enfin de la tour nord' && ev2.met && ev2.diff === ['facile', 'moyen', 'difficile', 'expert', 'legende'][ev2.ix] && ev2.played && Math.abs(ev2.played.score - want) < 0.01
    && /Ce que Zara attend de cette soirée/.test(tp) && /on les reconnaît/.test(tp) && /Exigence de la soirée : légendaire \(une rumeur court sur le joueur, un dîner en tête-à-tête, on les reconnaît en public\)/.test(tp) && /^Exigence (Légendaire|Expert)$/.test(setup.head) && /pas des abonnés/.test(setup.small) && setup.chips.includes('👀 On vous reconnaît en public'),
    { ev2, want, setup });
  const ph = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, ev = g.events.find((e) => e.id === id), z = g.chars[ev.c];
    z.vibe = 'couple'; z.officiel = 'secret'; ev.played = Object.assign({}, ev.played, { tier: 'mid', score: 0.5 }); ev.photoOk = false; g.triggers = [];
    window.__trustRolls = [0.1];
    H.afterDate(g, ev, z);
    return { officiel: z.officiel, trig: (g.triggers || []).some((x) => /photo volée/.test(x.text)), notif: g.notifs.some((n) => /photo volée de votre soirée/.test(n.text)) };
  }, ex.e2);
  check('recognized in public: a stolen photo of the two of them may go around afterwards… and a secret couple is a secret no more',
    ph.officiel === 'leaked' && ph.trig && ph.notif, ph);
  // 0.32.1: an evening at home with someone famous: no fans « vus ensemble », no stolen photo; in a café, yes
  const seen = await G(page, () => {
    const H = window.__hype, g = H.S.game, z = H.charByHandle(g, 'zara.vey');
    const one = (what) => {
      const e = H.addEvent(g, { by: z.handle, what, kind: 'rdv', in: 1500 });
      e.played = { tier: 'top', score: 0.95, at: Date.now(), kind: 'game', diff: 'moyen' };
      window.__trustRolls = [0.1];
      H.dateOutcome(g, e, z);
      const r = { fol: e.result.fol, stolen: !!e.stolen, notif: g.notifs.some((n) => n.c === z.id && /vous avez été vus ensemble/.test(n.text) && n.at >= e.played.at - 5000) };
      g.events = g.events.filter((y) => y !== e);
      return r;
    };
    const home = one('Chez Zara : sablés et soirée à deux');
    g.notifs = g.notifs.filter((n) => !/vous avez été vus ensemble/.test(n.text));
    const out = one('Un verre au café du Port');
    return { home, out };
  });
  check('0.32.1: a good evening at Zara’s place: nobody sees them (no followers « vus ensemble », no stolen photo); the same in a café: seen together',
    seen.home.fol === 0 && !seen.home.stolen && !seen.home.notif && seen.out.fol > 0 && seen.out.notif, seen);

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
