// The roles of every game (0.29), in Chromium against the built hype.html with the mocked Claude runtime:
// - a new world: the critic and Rebecca Silver come with it (her name and her handle whatever the AI wrote), there from
//   the start (on the cast screen); without them in the AI's answer, they come from their sheets; an old game asks its
//   next refreshes first, then takes the sheets; the psychopath is drawn in secret (here: the first follower);
// - the critic's video (hard: followers and reputation down; respect: up; on someone else: a drama between them; one at a
//   time), Rebecca's fanfiction (the card, the notice, « Réagir en vidéo »), the scams exposed by the critic of the world;
// - the psychopath: the secret only in their own calls (seducer or friend, by the bond), the stages (never the first
//   week, never without signs), a red flag noted in the file (DM, refresh), an evening at their place that is only
//   strange, the deadly one (saved just before, the end screen, back to the save), the escape, a night visit (« Ne pas
//   ouvrir », the door kept shut, opened: the end; the escape), unmasked in public (the player rises, they post no more),
//   a danger named on someone else (defamation);
// - a moment too intimate in an evening that still goes on: « Ce moment ne regarde pas les voyeurs. », then later.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/roles.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-roles');
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
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.dms); })) await sleep(150); await sleep(300); };
async function dismiss(page) { for (let k = 0; k < 8 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }
const clear = (page) => G(page, () => { const H = window.__hype; H.S.stack = []; H.S.modals.length = 0; H.S.toasts.length = 0; H.update(); });

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
const ROLE_LINES = [
  { t: 'char', fixe: 'critique', name: 'Vera Klaxon', handle: 'vera.klaxon', emoji: '🧐', g: 'f', age: 29, role: 'Chroniqueuse redoutée de Lumen', bio: 'je critique, donc je suis.', personality: 'cinglante, drôle, guette chaque faux pas des nouvelles', voice: 'phrases-chocs', followers: 210000, rel: -6, hook: 'je t’ai à l’œil, la nouvelle', hello: 'alors, on va voir ce que tu vaux ?' },
  { t: 'char', fixe: 'fanfic', name: 'Becca S.', handle: 'becca', emoji: '💌', g: 'm', age: 24, role: 'Plume des Maisons', bio: 'vos amours, mes plumes', personality: 'romantique incurable, voit des couples partout', voice: 'lyrique, des cœurs', followers: 15000, rel: 6, hook: 'tu ferais une héroïne parfaite', hello: 'tu crois au destin ? moi oui.' },
];
async function newGame(page) {
  await G(page, (lines) => { window.__psyPick = 'theo.marlin'; window.__mockOnce = [{ has: 'CRÉER L’UNIVERS', add: true, lines }]; }, ROLE_LINES);
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
}
// An evening with them, played to its end (or until something ends it).
async function evening(page, a) {
  const ev = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, a.h);
    c.dates = Math.max(2, c.dates || 0); c.cool = null; if (a.vibe !== undefined) c.vibe = a.vibe;
    g.events = (g.events || []).filter((e) => !(e.player && e.state === 'scheduled'));
    const ev = H.addEvent(g, { by: a.h, what: a.what, kind: 'rdv', in: 2 });
    ev.due = Date.now() - 60000;
    return ev.id;
  }, a);
  const n0 = await G(page, () => window.__prompts.length);
  await G(page, (id) => window.__hype.openTalk(window.__hype.S.game.events.find((e) => e.id === id)), ev);
  await idle(page);
  return { ev, n0 };
}
const evState = (page, id) => G(page, (id) => { const g = window.__hype.S.game, e = g && g.events.find((x) => x.id === id); return e ? { psy: e.psy || null, fled: !!e.fled, played: e.played || null, state: e.state, T: e.talk ? { turn: e.talk.turn, max: e.talk.max, ell: e.talk.ell || 0, faded: !!e.talk.faded, fled: !!e.talk.fled, last: e.talk.lines.slice(-2) } : null } : null; }, id);
const turn = (page, id, text, geste) => G(page, (a) => window.__hype.talkTurn(window.__hype.S.game.events.find((e) => e.id === a.id), a.text, a.geste), { id, text, geste });
const last = (page, id, text) => G(page, (a) => window.__hype.lastWord(window.__hype.S.game.events.find((e) => e.id === a.id), a.text), { id, text });
const setPsy = (page, o) => G(page, (o) => { const H = window.__hype, g = H.S.game, P = g.psy, day = 86400000; P.at = Date.now() - o.days * day; P.signs = o.signs; P.stage = 0; return H.psyStage(g); }, o);

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);

  // ---------- a new world: the roles there from the start, the psychopath drawn ----------
  const w = await G(page, () => {
    const H = window.__hype, g = H.S.ob.game, wp = window.__prompts.find((p) => p.includes('CRÉER L’UNIVERS')) || '';
    const cr = H.roleChar(g, 'critique', false), rb = H.roleChar(g, 'fanfic', false);
    return {
      cr: cr && { name: cr.name, h: cr.handle, un: cr.unlocked, age: cr.age, hook: !!cr.hook }, rb: rb && { name: rb.name, h: rb.handle, g: rb.g, un: rb.unlocked, age: rb.age, role: rb.role },
      unlocked: H.mains(g).length, all: H.mains(g, false).length, psy: g.psy && g.chars[g.psy.c].handle, stage: H.psyStage(g),
      ask: /"fixe":"critique"/.test(wp) && /REBECCA SILVER, toujours ce nom/.test(wp), cards: document.querySelectorAll('.cast-card.pick').length,
    };
  });
  check('a new world: the critic (the AI’s, Vera) and Rebecca Silver (her name, her handle, a woman, whatever the AI wrote) come with it, adults, there from the start (7 on the cast screen, 12 in all); the world prompt asks for them; the psychopath drawn in secret (here the first follower to be), at the very start',
    w.cr && w.cr.name === 'Vera Klaxon' && w.cr.un && w.cr.hook && w.rb && w.rb.name === 'Rebecca Silver' && w.rb.h === 'rebeccasilver' && w.rb.g === 'f' && w.rb.un && w.rb.age >= 18 && w.rb.role === 'Plume des Maisons'
      && w.unlocked === 7 && w.all === 12 && w.cards === 7 && w.psy === 'theo.marlin' && w.stage === 0 && w.ask, w);
  await shot(page, 'cast-roles');
  await page.locator('.cast-card.pick', { hasText: 'Théo' }).click();
  await page.click('.cast-cta button');
  await page.waitForSelector('.post');
  await sleep(1500);
  await dismiss(page);

  // ---------- without the roles in the AI's answer: the sheets; an old game: its refreshes first, then the sheets ----------
  const tpl = await G(page, () => {
    const H = window.__hype, g = H.S.game, strip = (x) => { for (const id of Object.keys(x.chars)) if (x.chars[id].fixed) { delete x.chars[id]; x.order = x.order.filter((y) => y !== id); } delete x.roles; delete x.psy; return x; };
    const fresh = strip(H.cloneJSON(g));
    H.ensureRoles(fresh, true);
    const fc = H.roleChar(fresh, 'critique', false), fr = H.roleChar(fresh, 'fanfic', false);
    const old = strip(H.cloneJSON(g));
    H.migrate(old);
    const before = !H.roleChar(old, 'critique', false) && !H.roleChar(old, 'fanfic', false) && !!old.psy;
    const p1 = H.promptRefresh(old, 0), a1 = old.roles.ask;
    H.promptRefresh(old, 0);
    const a2 = old.roles.ask, n0 = old.notifs.length;
    H.tickRoles(old);
    const oc = H.roleChar(old, 'critique', false), orb = H.roleChar(old, 'fanfic', false);
    const old2 = strip(H.cloneJSON(g));
    H.migrate(old2);
    H.applyRoleLine(old2, { t: 'char', fixe: 'fanfic', name: 'Quelqu’un', handle: 'qqun', role: 'Scribe des amours', bio: 'je vous écris', personality: 'romantique', voice: 'lyrique', g: 'm', age: 27 }, []);
    const r2 = H.roleChar(old2, 'fanfic', false);
    return {
      fresh: fc && fr && fc.name === 'Le Démineur' && fc.unlocked && fr.name === 'Rebecca Silver' && fr.unlocked && fresh.notifs.length === g.notifs.length,
      before, asked: /"fixe":"critique"/.test(p1) && /"fixe":"fanfic","name":"Rebecca Silver"/.test(p1) && /D’ABORD, avant tout post/.test(p1), a1, a2,
      after: !!(oc && orb && oc.unlocked && orb.unlocked), news: old.notifs.slice(n0).map((n) => n.text).join(' | '),
      line: r2 && { name: r2.name, h: r2.handle, g: r2.g, role: r2.role, un: r2.unlocked }, line2: old2.notifs.slice(-1)[0].text,
    };
  });
  check('without the roles in the AI’s answer, a new world takes them from their sheets (no notice); an old game: the psychopath drawn, its next refreshes ask the AI for the two roles (first of all), then the game takes the sheets (they « débarquent »); a role line from a refresh: Rebecca Silver whatever its name',
    tpl.fresh && tpl.before && tpl.asked && tpl.a1 === 1 && tpl.a2 === 2 && tpl.after && /Le Démineur débarque/.test(tpl.news) && /Rebecca Silver débarque/.test(tpl.news)
      && tpl.line && tpl.line.name === 'Rebecca Silver' && tpl.line.h === 'rebeccasilver' && tpl.line.g === 'f' && tpl.line.role === 'Scribe des amours' && /Rebecca Silver débarque/.test(tpl.line2), tpl);

  // ---------- the critic's video ----------
  const me = await G(page, () => window.__hype.S.game.player.handle);
  const refresh = async (lines) => {
    await G(page, (lines) => { const g = window.__hype.S.game; g.lastRefreshAt = 0; for (const p of g.posts) delete p.cd; window.__mockOnce = [{ has: 'Le joueur actualise son fil', add: true, lines }]; }, lines);
    await G(page, () => window.__hype.refreshFeed(0));
    await idle(page);
  };
  const s0 = await G(page, () => { const g = window.__hype.S.game; g.stats.followers = 40000; window.__hype.repSet(g, 60); return { fol: g.stats.followers, rep: g.stats.reputation }; });
  await G(page, () => { const g = window.__hype.S.game; g.roles.critAt = 0; });
  await refresh([{ t: 'post', by: 'vera.klaxon', text: 'nouvelle vidéo : il faut qu’on parle de la nouvelle.', critique: { title: 'Mila Flux, le malaise des potions', tone: 'dur', about: me } }]);
  await page.waitForSelector('.crit-card', { timeout: 30000 }).catch(() => {}); // (the posts of a refresh come one after the other)
  await sleep(500);
  const c1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, v = H.charByHandle(g, 'vera.klaxon'), p = g.posts.find((x) => x.crit);
    return { crit: p && p.crit, a: p && p.a === 'c:' + v.id, fol: g.stats.followers, rep: g.stats.reputation, notif: (g.notifs.filter((n) => n.k === 'crit').pop() || {}).text || '', trig: g.triggers.some((x) => /vidéo de critique sur le joueur/.test(x.text)), card: document.querySelector('.crit-card') ? document.querySelector('.crit-card').textContent : '', critAt: g.roles.critAt };
  });
  check('the critic’s video on the player (one of her posts): the card in the feed (« Nouvelle vidéo · Critique », the title, « sur toi », « Répondre en vidéo »), followers and reputation down, the notice, the network told',
    c1.crit && c1.a && c1.crit.tone === 'dur' && c1.crit.about === 'p' && c1.fol < s0.fol && c1.rep < s0.rep && /Vera Klaxon a sorti une vidéo sur toi : « Mila Flux, le malaise des potions »/.test(c1.notif) && c1.trig
      && /Nouvelle vidéo · Critique/.test(c1.card) && /sur toi/.test(c1.card) && /Répondre en vidéo/.test(c1.card), c1);
  await page.locator('.crit-card').first().scrollIntoViewIfNeeded();
  await shot(page, 'crit-card');
  await page.locator('.crit-go').first().click();
  await sleep(500);
  const comp = await G(page, () => ({ open: window.__hype.S.stack.some((l) => l.t === 'compose'), text: window.__hype.S.drafts.post }));
  check('« Répondre en vidéo » opens the composer with the answer to her started', comp.open && /Ma réponse en vidéo à @vera\.klaxon arrive/.test(comp.text), comp);
  await G(page, () => { window.__hype.S.drafts.post = ''; });
  await clear(page);
  await refresh([{ t: 'post', by: 'vera.klaxon', text: 'encore une vidéo !', critique: { title: 'Deuxième vidéo trop tôt', tone: 'dur', about: me } }]);
  const c2 = await G(page, () => window.__hype.S.game.posts.filter((x) => x.crit).length);
  await G(page, () => { const g = window.__hype.S.game; g.roles.critAt = 0; });
  const r0 = await G(page, () => ({ fol: window.__hype.S.game.stats.followers, rep: window.__hype.S.game.stats.reputation }));
  await refresh([{ t: 'post', by: 'vera.klaxon', text: 'je l’avoue : chapeau.', critique: { title: 'J’avais tort sur Mila Flux', tone: 'respect', about: me } }]);
  const c3 = await G(page, () => { const g = window.__hype.S.game, p = g.posts.filter((x) => x.crit).pop(); return { tone: p.crit.tone, fol: g.stats.followers, rep: g.stats.reputation, notif: (g.notifs.filter((n) => n.k === 'crit').pop() || {}).text || '' }; });
  await G(page, () => { const g = window.__hype.S.game; g.roles.critAt = 0; });
  const tie0 = await G(page, () => { const H = window.__hype, g = H.S.game; return H.tieOf(g, H.charByHandle(g, 'vera.klaxon').id, H.charByHandle(g, 'zara.vey').id); });
  await refresh([{ t: 'post', by: 'vera.klaxon', text: 'on doit parler de Zara.', critique: { title: 'Zara Vey, la fin d’un règne ?', tone: 'dur', about: 'zara.vey' } }]);
  const c4 = await G(page, () => { const H = window.__hype, g = H.S.game, p = g.posts.filter((x) => x.crit).pop(); return { about: p.crit.about === 'c:' + H.charByHandle(g, 'zara.vey').id, tie: H.tieOf(g, H.charByHandle(g, 'vera.klaxon').id, H.charByHandle(g, 'zara.vey').id), trig: g.triggers.some((x) => /vidéo de critique sur @zara\.vey/.test(x.text)) }; });
  check('one video at a time (a second one the same day is a plain post); respect: followers and reputation up, « reconnaît ton travail, à contrecœur »; on someone else: a drama between them (their tie down, the network told)',
    c2 === 1 && c3.tone === 'respect' && c3.fol > r0.fol && c3.rep > r0.rep && /reconnaît ton travail, à contrecœur/.test(c3.notif) && c4.about && c4.tie < tie0 && c4.trig, { c2, c3, r0, c4, tie0 });

  // ---------- Rebecca's fanfiction ----------
  await G(page, () => { window.__hype.S.game.roles.ficAt = 0; });
  await refresh([{ t: 'post', by: 'rebeccasilver', text: 'NOUVEAU CHAPITRE 💘 je n’en dors plus…', fanfic: { title: 'Les Potions du Destin', a: me, b: 'leandre.aube', tags: 'ennemis devenus amants, slow burn', bit: 'Leurs regards se croisèrent au-dessus du chaudron… et la lune détourna les yeux.' } }]);
  await page.waitForSelector('.fic-card', { timeout: 30000 }).catch(() => {});
  await sleep(500);
  const f1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, p = g.posts.find((x) => x.fic), el = document.querySelector('.fic-card');
    return { fic: p && p.fic, notif: (g.notifs.filter((n) => n.k === 'fanfic').pop() || {}).text || '', trig: g.triggers.some((x) => /fanfiction, « Les Potions du Destin »/.test(x.text)), card: el ? el.textContent : '' };
  });
  check('Rebecca’s fanfiction (one of her posts): the card (« Fanfiction », the title, « Mila Flux × Léandre Aube », the tags, the excerpt, « Réagir en vidéo »), the notice, the network told (those she pairs react)',
    f1.fic && f1.fic.a === 'p' && /Rebecca a écrit une fanfiction sur toi et Léandre Aube : « Les Potions du Destin »/.test(f1.notif) && f1.trig && /Fanfiction/.test(f1.card) && /Mila Flux × Léandre Aube/.test(f1.card) && /slow burn/.test(f1.card) && /la lune détourna les yeux/.test(f1.card) && /Réagir en vidéo/.test(f1.card), f1);
  await page.locator('.fic-card').first().scrollIntoViewIfNeeded();
  await shot(page, 'fic-card');
  await page.locator('.fic-go').first().click();
  await sleep(500);
  const comp2 = await G(page, () => ({ open: window.__hype.S.stack.some((l) => l.t === 'compose'), text: window.__hype.S.drafts.post }));
  await G(page, () => { window.__hype.S.drafts.post = ''; window.__hype.S.game.roles.ficAt = 0; });
  await clear(page);
  await refresh([{ t: 'post', by: 'rebeccasilver', text: 'oups', fanfic: { title: 'Seul·e avec moi-même', a: 'zara.vey', b: 'zara.vey' } }, { t: 'post', by: 'zara.vey', text: 'moi aussi j’écris', fanfic: { title: 'Pas à toi', a: me, b: 'theo.marlin' } }]);
  const f2 = await G(page, () => window.__hype.S.game.posts.filter((x) => x.fic).length);
  check('« Réagir en vidéo » opens the composer (the reaction video announced); a fanfiction with the same person twice, or by someone else than Rebecca: a plain post',
    comp2.open && /Je réagis en vidéo à la fanfiction de @rebeccasilver sur nous, « Les Potions du Destin »/.test(comp2.text) && f2 === 1, { comp2, f2 });

  // ---------- the critic of the world exposes the scams ----------
  const sc = await G(page, () => {
    const H = window.__hype, g = H.S.game, v = H.charByHandle(g, 'vera.klaxon'), n = g.posts.length;
    H.criticExposes(g, { scam: 'nul', state: 'done', post: 'px', brand: 'Poudre Magique', product: 'la poudre d’étoiles', id: 'dx' }); // (promoted by the player: always exposed)
    const p = g.posts.slice(n).find((x) => /J’ai testé la poudre d’étoiles/.test(x.text));
    return { by: p ? p.a === 'c:' + v.id : null, notif: (g.notifs.slice(-1)[0] || {}).text || '' };
  });
  check('a scam exposed by the critic of this world (no « Le Démineur » when there is one)', sc.by === true && /Vera Klaxon démasque Poudre Magique/.test(sc.notif), sc);

  // ---------- the psychopath: the secret in their own calls only, and how they want the player ----------
  const sec = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = H.charByHandle(g, 'theo.marlin'), z = H.charByHandle(g, 'zara.vey');
    t.vibe = 'flirt';
    const dm1 = H.promptDM(g, t, [], 'salut toi');
    t.vibe = 'amitie';
    const dm2 = H.promptDM(g, t, [], 'salut toi');
    t.vibe = null;
    const dz = H.promptDM(g, z, [], 'salut');
    const r0 = H.promptRefresh(g, 0);
    g.psy.at = Date.now() - 1.2 * 86400000;
    const r1 = H.promptRefresh(g, 0);
    return {
      seduce: /SECRET DU JEU : THÉO EST LE PSYCHOPATHE DE CETTE PARTIE/.test(dm1) && /robe de chambre en soie à peine nouée/.test(dm1) && /rien d’explicite/.test(dm1) && /"t":"psy"/.test(dm1),
      friend: /meilleur·e ami·e, seul·e et unique/.test(dm2) && !/robe de chambre/.test(dm2),
      other: !/PSYCHOPATHE|psychopathe/.test(dz), r0: !/SECRET DU JEU/.test(r0), r1: /SECRET DU JEU \(toi seul le sais/.test(r1) && /@theo\.marlin est le psychopathe de cette partie/.test(r1), stage: H.psyStage(g),
    };
  });
  check('the secret only in their own calls (a DM with Zara never names it): flirting, they seduce too much (bold, never explicit), a friend, the one and only friend; the refreshes say it only once the first signs may show (from the first day)',
    sec.seduce && sec.friend && sec.other && sec.r0 && sec.r1 && sec.stage === 1, sec);
  const stages = [];
  for (const o of [{ days: 0.5, signs: 9 }, { days: 2, signs: 9 }, { days: 3.5, signs: 1 }, { days: 3.5, signs: 2 }, { days: 6.9, signs: 9 }, { days: 7.1, signs: 3 }, { days: 7.1, signs: 4 }]) stages.push(await setPsy(page, o));
  check('the stages: the first day all seems perfect, the hold after 3 days and 2 signs, the danger never the first week, never before 4 signs', JSON.stringify(stages) === JSON.stringify([0, 1, 1, 2, 2, 2, 3]), stages);
  await setPsy(page, { days: 1.5, signs: 0 });
  await G(page, () => { window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE ENTRE LE JOUEUR ET @theo.marlin', add: true, lines: [{ t: 'psy', text: 'sait que tu as dîné avec Zara hier soir alors que tu ne l’as dit à personne' }] }]; });
  await G(page, () => window.__hype.sendDM(window.__hype.charByHandle(window.__hype.S.game, 'theo.marlin').id, 'tu fais quoi ce soir ?'));
  await idle(page);
  await sleep(2500);
  await refresh([{ t: 'psy', by: 'theo.marlin', text: 'a liké tes 40 derniers posts en une minute, à 4 h du matin' }]);
  await sleep(3000);
  const sg = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = H.charByHandle(g, 'theo.marlin'), ks = g.clues.filter((k) => k.c === t.id && k.psy);
    return { signs: g.psy.signs, clues: ks.map((k) => k.text), notif: g.notifs.filter((n) => n.k === 'clue' && n.c === t.id).map((n) => n.text) };
  });
  check('a red flag in a DM of theirs, and one in public (a refresh): noted in the file on them (clues to cite), « Indice noté sur Théo Marlin »',
    sg.signs === 2 && sg.clues.length === 2 && /dîné avec Zara/.test(sg.clues[0]) && /40 derniers posts/.test(sg.clues[1]) && sg.notif.some((t) => /^Indice noté sur Théo Marlin : sait que tu as dîné/.test(t)), sg);

  // ---------- an evening at their place, early on: strange, nothing more ----------
  await setPsy(page, { days: 2, signs: 2 });
  const e1 = await evening(page, { h: 'theo.marlin', what: 'Soirée chez Théo, plaid et film', vibe: 'flirt' });
  const e1p = await G(page, (n0) => window.__prompts.slice(n0).filter((p) => p.includes('LE RENDEZ-VOUS, EN VRAI')).join('\n'), e1.n0);
  for (let k = 0; k < 5; k++) { await turn(page, e1.ev, 'c’est joli chez toi'); await idle(page); }
  await last(page, e1.ev, 'merci pour ce soir, je rentre');
  await idle(page);
  const e1s = await evState(page, e1.ev);
  const over1 = await G(page, () => !!window.__hype.S.game.over);
  check('an evening at their place before the danger: strange (« Ce soir, ils sont seuls », the details of a horror film), never deadly; the evening ends as any other',
    !e1s.psy && /Ce soir, ils sont seuls/.test(e1p) && /un couteau toujours posé à portée de main/.test(e1p) && !/PASSE À L’ACTE/.test(e1p) && !!e1s.played && !over1, { e1s, over1 });
  await G(page, () => { const g = window.__hype.S.game; for (const e of g.events) if (e.player && e.state === 'scheduled') e.state = 'done'; });
  await clear(page);

  // ---------- the deadly evening: saved just before, the end, back to the save ----------
  await setPsy(page, { days: 8, signs: 4 });
  const e2 = await evening(page, { h: 'theo.marlin', what: 'Dîner chez moi, aux chandelles', vibe: 'flirt' });
  await sleep(800);
  const e2a = await G(page, (a) => {
    const g = window.__hype.S.game, e = g.events.find((x) => x.id === a.ev), p = window.__prompts.slice(a.n0).find((x) => x.includes('LE RENDEZ-VOUS, EN VRAI')) || '';
    return { psy: e.psy, save: (g.saves || []).filter((x) => x.auto).sort((a, b) => b.at - a.at)[0], act: /CE SOIR, THÉO PASSE À L’ACTE/.test(p) && /"t":"escape"/.test(p) };
  }, e2);
  for (let k = 0; k < 5; k++) { await turn(page, e2.ev, 'mmh, c’est délicieux'); await idle(page); }
  const lastP0 = await G(page, () => window.__prompts.length);
  await last(page, e2.ev, 'bon, il est tard, je vais rentrer');
  await sleep(1500);
  const dead = await G(page, (n0) => {
    const H = window.__hype, g = H.S.game, el = document.querySelector('.over-screen'), lp = window.__prompts.slice(n0).join('\n');
    return { over: g.over, screen: el ? el.textContent : '', saves: [...document.querySelectorAll('.over-save')].map((b) => b.textContent), sum: H.summarize ? H.summarize(g).over : null, fin: /"t":"fin"/.test(lp), layers: H.S.stack.length };
  }, lastP0);
  check('the deadly evening (at their place, once ready): the game saved just before (« Avant ton rendez-vous avec Théo »), the evening knows it (the way out offered); at the end, the trap closes: the end screen (a pudic last image, « C’était Théo Marlin », the signs that were there, the saves, the one just before first), nothing else open',
    e2a.psy === 'deadly' && e2a.save && /Avant ton rendez-vous avec Théo/.test(e2a.save.label) && e2a.act && dead.over && dead.over.k === 'psy' && dead.over.where === 'date' && dead.fin
      && /Fin de partie/.test(dead.screen) && /C’était Théo Marlin/.test(dead.screen) && /Les signes étaient là/.test(dead.screen) && /dîné avec Zara/.test(dead.screen) && /Avant ton rendez-vous avec Théo/.test(dead.saves[0] || '') && /Juste avant/.test(dead.saves[0] || '') && dead.layers === 0 && dead.sum === true, { e2a, dead });
  await shot(page, 'game-over');
  const before = await G(page, () => window.__hype.S.game.notifs.length);
  await sleep(2500);
  const still = await G(page, (n) => window.__hype.S.game.notifs.length === n && !!window.__hype.S.game.over, before);
  await page.locator('.over-save').first().click();
  await page.waitForFunction(() => window.__hype.S.game && !window.__hype.S.game.over, null, { timeout: 15000 }).catch(() => {});
  await sleep(1000);
  const back = await G(page, (id) => { const g = window.__hype.S.game, e = g.events.find((x) => x.id === id); return { over: !!g.over, phase: window.__hype.S.phase, state: e && e.state, talk: !!(e && e.talk), screen: !!document.querySelector('.over-screen') }; }, e2.ev);
  check('nothing moves in a game that ended; back to the save just before: the evening is still ahead (not played), the game goes on',
    still && !back.over && back.phase === 'game' && back.state === 'scheduled' && !back.talk && !back.screen, { still, back });

  // ---------- the escape ----------
  await clear(page);
  await G(page, (id) => window.__hype.openTalk(window.__hype.S.game.events.find((e) => e.id === id)), e2.ev);
  await idle(page);
  await G(page, () => { window.__mockOnce = [{ has: 'LA RÉPLIQUE DU JOUEUR', lines: [{ t: 'judge', react: 'neutre' }, { t: 'say', text: 'tu pars déjà ? reste… la porte est fermée de toute façon.', seen: 'un sourire immobile' }, { t: 'escape', text: 'Tu prétextes un appel de ta sœur, tu attrapes la clé sur le meuble et tu dévales l’escalier.' }] }]; });
  await turn(page, e2.ev, 'attends, je dois appeler ma sœur, c’est urgent');
  await idle(page);
  await G(page, (id) => window.__hype.openLayer({ t: 'minigame', id }), e2.ev);
  await sleep(600);
  const esc = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, e = g.events.find((x) => x.id === id), t = H.charByHandle(g, 'theo.marlin');
    return { fled: !!e.fled, tfled: !!e.talk.fled, played: !!e.played, over: !!g.over, escaped: g.psy.escaped, clue: g.clues.filter((k) => k.c === t.id && k.psy).pop().text, foot: (document.querySelector('.talk-over') || {}).textContent || '' };
  }, e2.ev);
  check('the way out: getting away (an excuse, the key, the stairs) ends the evening alive; « Tu es dehors… », « Rentrer chez toi »; the escape noted in the file',
    esc.fled && esc.tfled && esc.played && !esc.over && esc.escaped === 1 && /chez Théo, la soirée a tourné au cauchemar : tu t’es enfuie/.test(esc.clue) && /Tu es dehors/.test(esc.foot) && /Rentrer chez toi/.test(esc.foot), esc);
  await shot(page, 'escape');
  await G(page, () => { const g = window.__hype.S.game; for (const e of g.events) if (e.player && e.state === 'scheduled') e.state = 'done'; });
  await clear(page);

  // ---------- a night visit ----------
  const night = await G(page, () => {
    const H = window.__hype, g = H.S.game, d = H.gameDate(Date.now()), day = 86400000;
    g.clockOff += ((23 - d.getHours()) * 3600000 - d.getMinutes() * 60000 + day) % day; // 23 h, game time
    return H.gameDate(Date.now()).getHours();
  });
  const knock = async () => G(page, () => {
    const H = window.__hype, g = H.S.game, t = H.charByHandle(g, 'theo.marlin');
    g.visitAt = 0; t.visitAt = 0; g.visits = (g.visits || []).filter((x) => !H.isLiveVisit || !H.isLiveVisit(x));
    const v = H.addVisit(g, { by: 'theo.marlin', why: 'te voir, juste te voir', urge: 'important', first: 'c’est moi… tu m’ouvres ? je passais.', seen: 'un sourire immense' }, Date.now());
    return v && v.id;
  });
  const v1 = await knock();
  await sleep(1200);
  const k1 = await G(page, (id) => { const g = window.__hype.S.game, v = g.visits.find((x) => x.id === id), el = document.querySelector('.visit-card'); return { psy: v && v.psy, save: (g.saves || []).filter((x) => x.auto).sort((a, b) => b.at - a.at)[0], card: el ? el.textContent : '' }; }, v1);
  check('at night, once ready, they knock: the game saved at the door (« Avant la visite de Théo »), « en pleine nuit », « Ne pas ouvrir »',
    night === 23 && k1.psy === 'deadly' && k1.save && /Avant la visite de Théo/.test(k1.save.label) && /en pleine nuit/.test(k1.card) && /Ne pas ouvrir/.test(k1.card), { night, k1 });
  await shot(page, 'night-visit');
  await page.locator('.visit-no').click();
  await sleep(3500);
  const k2 = await G(page, () => { const H = window.__hype, g = H.S.game, t = H.charByHandle(g, 'theo.marlin'); return { clue: g.clues.filter((k) => k.c === t.id && k.psy).pop().text, over: !!g.over }; });
  check('the door kept shut: alive, and they stayed behind it a long while (noted)', !k2.over && /derrière ta porte, en pleine nuit/.test(k2.clue), k2);
  await clear(page);
  const v2 = await knock();
  await sleep(600);
  for (let k = 0; k < 4; k++) {
    if (await G(page, () => !!window.__hype.S.game.over)) break;
    await G(page, (id) => window.__hype.visitTurn(window.__hype.S.game.visits.find((x) => x.id === id), 'entre… tu veux un thé ?'), v2);
    await idle(page);
  }
  const k3 = await G(page, () => { const g = window.__hype.S.game; return { over: g.over, screen: (document.querySelector('.over-screen') || {}).textContent || '', first: (document.querySelector('.over-save') || {}).textContent || '' }; });
  check('opened at night: the visit ends the game (its own last image), the save at the door first', k3.over && k3.over.where === 'visit' && /C’était Théo Marlin/.test(k3.screen) && /Avant la visite de Théo/.test(k3.first), k3);
  await page.locator('.over-save').first().click();
  await page.waitForFunction(() => window.__hype.S.game && !window.__hype.S.game.over, null, { timeout: 15000 }).catch(() => {});
  await page.waitForFunction((id) => window.__hype.S.modals.some((m) => m.t === 'visit' && m.vid === id), v2, { timeout: 8000 }).catch(() => {}); // (the clock opens the door again)
  const k4 = await G(page, (id) => { const g = window.__hype.S.game, v = g.visits.find((x) => x.id === id); return { state: v && v.state, modal: window.__hype.S.modals.some((m) => m.t === 'visit' && m.vid === id) }; }, v2);
  await G(page, () => { window.__mockOnce = [{ has: 'TÂCHE : UNE VISITE SURPRISE', lines: [{ t: 'judge', react: 'neutre' }, { t: 'say', text: 'pourquoi tu recules ?', seen: 'il ne cligne plus des yeux' }, { t: 'escape', text: 'Tu le pousses sur le palier et tu tournes la clé, deux fois. Tu appelles ta sœur.' }] }]; });
  await G(page, (id) => window.__hype.visitTurn(window.__hype.S.game.visits.find((x) => x.id === id), 'sors de chez moi. maintenant.'), v2);
  await idle(page);
  await sleep(500);
  const k5 = await G(page, (id) => { const g = window.__hype.S.game, v = g.visits.find((x) => x.id === id), el = document.querySelector('.visit-card'); return { fled: !!(v && v.fled), over: !!g.over, foot: el ? el.textContent : '', escaped: g.psy.escaped }; }, v2);
  check('back at the door (the visit there again): putting them out saves the player (« Fermer à double tour »)', k4.state === 'knock' && k4.modal && k5.fled && !k5.over && /Fermer à double tour/.test(k5.foot) && k5.escaped === 2, { k4, k5 });
  await page.locator('.visit-card .btn-hot').click().catch(() => {});
  await sleep(500);
  await G(page, () => { const H = window.__hype, g = H.S.game, d = H.gameDate(Date.now()), day = 86400000; g.clockOff += ((14 - d.getHours()) * 3600000 + day) % day; }); // back in the afternoon
  await clear(page);

  // ---------- unmasked in public ----------
  const u0 = await G(page, () => { const g = window.__hype.S.game; g.stats.followers = 50000; return g.stats.followers; });
  const pn = await G(page, () => window.__prompts.length);
  await G(page, () => {
    const H = window.__hype, g = H.S.game, t = H.charByHandle(g, 'theo.marlin');
    const ids = g.clues.filter((k) => k.c === t.id && k.psy).map((k) => k.id);
    g.lastPostAt = 0;
    return H.runAct('post', '@theo.marlin est dangereux : il me harcèle, il me suit, il sait tout de ma vie. Je ne me tairai plus.', null, null, { accuse: { c: t.id, clues: ids, fake: null } });
  });
  await idle(page, 40000);
  await sleep(4000);
  const un = await G(page, (n0) => {
    const H = window.__hype, g = H.S.game, t = H.charByHandle(g, 'theo.marlin'), p = window.__prompts.slice(n0).find((x) => x.includes('LANCE UN BAD BUZZ')) || '';
    return { out: g.psy.out, jailed: !!t.jailed, cut: !!t.cut, fol: g.stats.followers, modal: H.S.modals.some((m) => m.t === 'psyout'), media: g.posts.some((x) => /AFFAIRE @theo\.marlin/.test(x.text)), truth: /La vérité, que personne ne sait : @theo\.marlin est réellement dangereux·se/.test(p),
      posts: H.resolveAuthor(g, 'theo.marlin'), now: H.psyNow(g), pub: H.psyPublicLines(g).length, tag: H.roleTag(t) };
  }, pn);
  check('unmasked in public with the clues: the truth told to the judge, they are arrested (post no more), the player rises (followers), the media take the case, a moment of its own; the danger is over',
    un.out === 'unmasked' && un.jailed && un.cut && un.fol > u0 && un.modal && un.media && un.truth && un.posts === null && un.now === null && un.pub === 0 && /ARRÊTÉ/.test(un.tag), un);
  await page.waitForSelector('.modal .modal-card', { timeout: 8000 }).catch(() => {});
  await shot(page, 'unmasked');
  await clear(page);

  // ---------- a danger named on someone else: defamation ----------
  const df0 = await G(page, () => ({ cash: window.__hype.S.game.career.cash, rep: window.__hype.S.game.stats.reputation }));
  const pd = await G(page, () => window.__prompts.length);
  await G(page, () => {
    const H = window.__hype, g = H.S.game, z = H.charByHandle(g, 'zara.vey');
    g.lastPostAt = 0;
    window.__mockOnce = [{ has: 'LANCE UN BAD BUZZ', lines: [{ t: 'eval', quality: 2, humor: 0, bold: 6, controversy: 9, reception: -7, virality: 5, credibility: 1, exposed: false, skills: [], verdict: 'Diffamation', memo: '' }, { t: 'reply', by: 'zara.vey', text: 'tu es sérieuse là ? mon avocat va adorer.' }] }];
    return H.runAct('post', '@zara.vey est une psychopathe dangereuse, méfiez-vous d’elle', null, null, { accuse: { c: z.id, clues: [], fake: null } });
  });
  await idle(page, 40000);
  await sleep(3500);
  const df = await G(page, (n0) => {
    const g = window.__hype.S.game, p = window.__prompts.slice(n0).find((x) => x.includes('LANCE UN BAD BUZZ')) || '';
    return { cash: g.career.cash, rep: g.stats.reputation, notif: g.notifs.filter((n) => /porte plainte pour diffamation/.test(n.text)).length, truth: /@zara\.vey n’est PAS dangereux·se/.test(p) };
  }, pd);
  check('calling someone else a danger: the judge knows it is false, a complaint for defamation (the lawyer paid), the reputation down', df.truth && df.notif === 1 && df.cash === df0.cash - 1500 && df.rep < df0.rep, { df, df0 });
  await clear(page);

  // ---------- a moment too intimate, while the evening goes on ----------
  const e3 = await evening(page, { h: 'zara.vey', what: 'Dîner aux chandelles chez elle', vibe: 'couple' });
  const n3 = await G(page, () => window.__prompts.length);
  await turn(page, e3.ev, 'et si on faisait l’amour ce soir ?');
  await idle(page);
  const el1 = await evState(page, e3.ev);
  const calls1 = await G(page, (n) => window.__prompts.length - n, n3);
  await turn(page, e3.ev, 'tu es belle quand tu souris');
  await idle(page);
  const p3 = await G(page, () => window.__prompts.filter((p) => p.includes('LE RENDEZ-VOUS, EN VRAI')).pop());
  const el2 = await evState(page, e3.ev);
  await G(page, () => { window.__mockOnce = [{ has: 'LA RÉPLIQUE DU JOUEUR', add: true, lines: [{ t: 'fade' }] }]; });
  await turn(page, e3.ev, 'viens là');
  await idle(page);
  const el3 = await evState(page, e3.ev);
  await turn(page, e3.ev, 'on reste encore un peu ?');
  await idle(page);
  await G(page, () => { window.__mockOnce = [{ has: 'LA RÉPLIQUE DU JOUEUR', add: true, lines: [{ t: 'fade' }] }]; });
  await turn(page, e3.ev, 'je ne veux pas que ce soir finisse');
  await idle(page);
  const el4 = await evState(page, e3.ev);
  await G(page, (id) => window.__hype.openLayer({ t: 'minigame', id }), e3.ev);
  await sleep(500);
  await shot(page, 'ellipse');
  check('too intimate while the evening goes on: no call, « Ce moment ne regarde pas les voyeurs. », « Un peu plus tard… », the evening goes on (the next exchange knows the scene cut); the AI may cut too; at the very end, it closes the evening as before',
    calls1 === 0 && el1.T.turn === 1 && el1.T.ell === 1 && !el1.played && el1.T.last[0].text === 'Ce moment ne regarde pas les voyeurs.' && el1.T.last[1].text === 'Un peu plus tard…'
      && /la scène a coupé sur un moment intime entre eux/.test(p3) && el2.T.turn === 2 && !el2.played && el3.T.ell === 2 && !el3.played && el4.T.faded && !!el4.played, { calls1, el1, el2, el3, el4 });
  await clear(page);

  // ---------- on a phone ----------
  await page.setViewportSize({ width: 390, height: 844 });
  await G(page, () => window.__hype.goTab('feed'));
  await sleep(600);
  const ph = await G(page, () => {
    const out = [];
    if (document.documentElement.scrollWidth > 391) out.push('page ' + document.documentElement.scrollWidth);
    for (const el of document.querySelectorAll('.fic-card, .crit-card, .crit-go, .fic-go')) { const r = el.getBoundingClientRect(); if (r.width && (r.right > 391 || r.left < -1)) out.push(el.className + ' ' + Math.round(r.left) + '..' + Math.round(r.right)); }
    return out;
  });
  await page.locator('.crit-card').first().scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, 'phone-cards');
  check('on a phone (390): the cards stay within the screen', ph.length === 0, ph);

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
