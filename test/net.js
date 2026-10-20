// The everyday of a network (0.29), in Chromium against the built hype.html with the mocked Claude runtime:
// - a dig without a name (« ça pourrait bien te viser »), a soft launch (« c’est toi qu’on devine »), a poll in someone’s
//   post (vote, the results), a poll in the player’s post (the composer, the results from the AI), a ratio (on the
//   player; by the player), a pinned comment (first, « Épinglé par toi », they like it), the top fan badge;
// - birthdays (theirs: the notice, the AI told, wished in private; a close one forgotten; the player’s own, set in the
//   settings), a memory (a month ago: « Repartager », « Masquer »);
// - the main character of the day, an outage (nothing goes out, then it comes back), a new algorithm (its format carried),
//   a drama channel, someone met « en vrai » (asked), the world in the comments of a viral post (« Traduire »);
// - on a phone.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/net.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-net');
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
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.dms || b.story || b.groups); })) await sleep(150); await sleep(300); };
async function dismiss(page) { for (let k = 0; k < 8 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }
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
  await G(page, () => { window.__psyPick = 'nox.ombre'; });
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
}
async function refresh(page, lines) {
  await G(page, (lines) => { const g = window.__hype.S.game; g.lastRefreshAt = 0; for (const p of g.posts) delete p.cd; window.__mockOnce = [{ has: 'Le joueur actualise son fil', add: true, lines }]; }, lines);
  await G(page, () => window.__hype.refreshFeed(0));
  await idle(page);
}
const ahead = (page, ms) => G(page, (ms) => { const H = window.__hype; H.jumpClock(H.S.game, ms); H.update(); }, ms);
// A post of the player, through the game (the mock answers; lines added when given).
async function post(page, text, lines, extra) {
  await G(page, (a) => { const g = window.__hype.S.game; g.lastPostAt = 0; window.__mockOnce = a.lines ? [{ has: 'Le joueur publie ce post', add: true, lines: a.lines }] : []; return window.__hype.runAct('post', a.text, null, null, a.extra || {}); }, { text, lines, extra });
  await idle(page, 40000);
  return G(page, () => window.__hype.S.game.posts.filter((p) => p.a === 'p').sort((a, b) => b.ts - a.ts)[0].id);
}

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);
  const me = await G(page, () => window.__hype.S.game.player.handle);
  await G(page, () => { window.__hype.S.game.stats.followers = 20000; });

  // ---------- a dig without a name, a soft launch, someone's poll ----------
  await refresh(page, [
    { t: 'post', by: 'zara.vey', text: 'y en a qui se croient tout permis depuis qu’ils ont trois abonnés de plus…', sub: me },
    { t: 'post', by: 'theo.marlin', text: 'deux cafés ce matin ☕☕ (je dis rien)', photo: 'deux tasses sur une table de bibliothèque, une main qui dépasse', soft: me },
    { t: 'post', by: 'leandre.aube', text: 'le bal d’Aube : vous venez en quoi ?', poll: { a: ['costume', 'robe', 'pyjama'], res: [55, 35, 10] } },
  ]);
  await ahead(page, 60000);
  await sleep(600);
  const d1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, ps = g.posts;
    const sub = ps.find((p) => /tout permis/.test(p.text)), soft = ps.find((p) => /deux cafés/.test(p.text)), poll = ps.find((p) => /bal d’Aube/.test(p.text));
    const pr = H.promptRefresh(g, 0);
    return { sub: sub && sub.sub, soft: soft && soft.soft, poll: poll && poll.poll, n1: g.notifs.some((n) => /a posté un truc… qui pourrait bien te viser/.test(n.text)), n2: g.notifs.some((n) => /soft launch… et c’est toi qu’on devine/.test(n.text)),
      ctx: /sous-entendu qui vise le joueur/.test(pr) && /soft launch : on devine quelqu’un sans le voir \(en vrai : le joueur\)/.test(pr) && /sondage : costume 55 %/.test(pr), offered: /"sub":"handle visé"/.test(pr) && /"soft":"handle"/.test(pr) && /je viens de croiser @/.test(pr), id: poll && poll.id };
  });
  check('a dig at the player without a name (« ça pourrait bien te viser »), a soft launch of the two of them (« c’est toi qu’on devine »), a poll in someone’s post; the AI reads them, and may write them (and « on t’a croisé·e »)',
    d1.sub === 'p' && d1.soft === 'p' && d1.poll && d1.poll.opts.length === 3 && d1.poll.res.join() === '55,35,10' && d1.n1 && d1.n2 && d1.ctx && d1.offered, d1);
  await page.locator(`.post[data-p="${d1.id}"] .poll-opt`).nth(1).click();
  await sleep(300);
  const v1 = await G(page, (id) => { const p = window.__hype.S.game.posts.find((x) => x.id === id); return { mine: p.poll.mine, pct: [...document.querySelectorAll(`.post[data-p="${id}"] .poll-opt em`)].map((x) => x.textContent) }; }, d1.id);
  await page.locator(`.post[data-p="${d1.id}"]`).scrollIntoViewIfNeeded();
  await shot(page, 'poll-voted');
  check('voting in someone’s poll shows the results', v1.mine === 1 && v1.pct.join() === '55 %,35 %,10 %', v1);

  // ---------- the player's poll ----------
  await G(page, () => window.__hype.openCompose());
  await page.waitForSelector('#compose');
  await page.fill('#compose', 'ma prochaine potion : vous voulez quoi ?');
  await page.locator('.ideas button', { hasText: 'Sondage' }).click();
  await page.fill('.poll-edit .input >> nth=0', 'invisibilité');
  await page.fill('.poll-edit .input >> nth=1', 'charme');
  await page.locator('.poll-edit .linkbtn', { hasText: '+ Un choix' }).click();
  await page.fill('.poll-edit .input >> nth=2', 'chance');
  await shot(page, 'poll-compose');
  await G(page, () => { const g = window.__hype.S.game; g.lastPostAt = 0; window.__mockOnce = [{ has: 'Ce post est un SONDAGE', add: true, lines: [{ t: 'pollres', res: [50, 30, 20] }] }]; });
  await page.locator('.layer-head .btn-hot').click();
  await idle(page, 40000);
  await sleep(1500);
  const pp = await G(page, () => {
    const g = window.__hype.S.game, p = g.posts.filter((x) => x.a === 'p').sort((a, b) => b.ts - a.ts)[0], pr = window.__prompts.filter((x) => x.includes('Ce post est un SONDAGE')).pop() || '';
    return { poll: p.poll, prompt: /choix : « invisibilité », « charme », « chance »/.test(pr), id: p.id, draft: window.__hype.S.drafts.poll };
  });
  const ppUi = await G(page, (id) => [...document.querySelectorAll(`.post[data-p="${id}"] .poll-opt em`)].map((x) => x.textContent), pp.id);
  check('a poll in the player’s post (the composer: 2 to 4 choices): the AI gives the results, shown in the post',
    pp.poll && pp.poll.opts.join() === 'invisibilité,charme,chance' && pp.poll.res.join() === '50,30,20' && pp.prompt && !pp.draft && ppUi.join() === '50 %,30 %,20 %', { pp, ppUi });

  // ---------- a ratio ----------
  await clear(page);
  const pid = await post(page, 'je suis la meilleure potionniste de Lumen, et de loin', [{ t: 'reply', by: 'gargouille_ronchon', text: 'la meilleure ? ta dernière potion a fait pousser des cornes au prof 💀', ratio: true }]);
  await sleep(1500);
  const ra = await G(page, (id) => {
    const g = window.__hype.S.game, p = g.posts.find((x) => x.id === id), r = p.replies.find((x) => x.id === p.ratio);
    return { ratio: !!r, more: r && r.likeT > p.likeT, notif: g.notifs.some((n) => /Ratio : la réponse de Le Vieux Gargouille fait plus de likes que ton post/.test(n.text)), ask: /"ratio":true/.test(window.__prompts.filter((x) => x.includes('Le joueur publie ce post')).pop() || '') };
  }, pid);
  await G(page, (id) => window.__hype.openPost(id), pid);
  await page.waitForSelector('.ratio-tag');
  check('a ratio on the player’s post (the AI says which reply): it gets more likes than the post, the notice, « 💀 Ratio » under it', ra.ratio && ra.more && ra.notif && ra.ask, ra);
  await clear(page);
  const tid = await G(page, () => { const H = window.__hype, g = H.S.game, t = Date.now(); const p = H.addAmbientPost(g, { by: 'leandre.aube', text: 'Aube a gagné la coupe. évidemment.' }, t - 60000, t - 60000); p.likeT = 3; g.ratioAt = 0; return p.id; });
  await G(page, (id) => { const H = window.__hype, g = H.S.game, p = g.posts.find((x) => x.id === id); window.__mockOnce = [{ has: 'Le joueur répond au post', lines: [{ t: 'eval', quality: 8, humor: 9, bold: 6, controversy: 2, reception: 9, virality: 9, skills: ['humour'], verdict: 'Énorme', memo: '' }, { t: 'reply', by: 'tess.astrale', text: 'MDRRR' }] }]; return H.runAct('reply', 'gagné ? vous étiez trois dans la compétition 😭', p, null, {}); }, tid);
  await idle(page, 40000);
  await sleep(1500);
  const rb = await G(page, (id) => { const g = window.__hype.S.game, p = g.posts.find((x) => x.id === id), mine = p.replies.find((r) => r.a === 'p'); return { by: !!p.ratioBy, likes: mine && mine.likeT, notif: g.notifs.some((n) => /Ratio : ta réponse fait plus de likes que le post de Léandre Aube/.test(n.text)) }; }, tid);
  check('the player ratios someone (a reply well received, more likes than their post): the notice', rb.by && rb.notif && rb.likes >= 20, rb);

  // ---------- a pinned comment, the top fan ----------
  await clear(page);
  const pin = await G(page, (id) => { const H = window.__hype, g = H.S.game, p = g.posts.find((x) => x.id === id), t = Date.now(); const r = H.addReplyTo(g, p, { by: 'theo.marlin', text: 'je valide, meilleure potionniste 🧪' }, t - 1000); return { r: r.id, rel: H.charByHandle(g, 'theo.marlin').rel }; }, pid);
  await G(page, (id) => window.__hype.openPost(id), pid);
  await page.waitForSelector('.act-pin');
  await page.locator(`#r-${pin.r} .act-pin`).click();
  await sleep(500);
  const pn = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, p = g.posts.find((x) => x.id === a.id), t = H.charByHandle(g, 'theo.marlin'), rows = [...document.querySelectorAll('.layer .reply-row')];
    return { pin: p.pin === a.r, first: rows[0] && rows[0].id === 'r-' + a.r, tag: !!document.querySelector(`#r-${a.r} .pin-tag`), rel: t.rel - a.rel, mem: t.mem.some((m) => /épinglé mon commentaire/.test(m.t)), ctx: /commentaire épinglé par le joueur : @theo\.marlin/.test(H.promptRefresh(g, 0)) };
  }, { id: pid, r: pin.r, rel: pin.rel });
  await shot(page, 'pinned');
  check('a comment pinned by the player: first in the thread, « Épinglé par toi », they like it (and remember), the AI reads it', pn.pin && pn.first && pn.tag && pn.rel >= 1 && pn.mem && pn.ctx, pn);
  await clear(page);
  const tf = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now(), mine = g.posts.filter((p) => p.a === 'p');
    for (const p of mine) for (let k = 0; k < 4; k++) H.addReplyTo(g, p, { by: 'tess.astrale', text: 'reine 👑' }, t - 2000); // (more than anyone)
    g.topFan = null;
    return { a: H.topFanOf(g), ctx: /@tess\.astrale a le badge « top fan » du joueur/.test(H.promptRefresh(g, 0)) };
  });
  await G(page, (id) => window.__hype.openPost(id), pid);
  await page.waitForSelector('.layer .topfan');
  check('the top fan (the most comments on the player’s posts this week): the badge by their name, the AI knows', tf.a === 'n:tess.astrale' && tf.ctx, tf);
  await clear(page);

  // ---------- birthdays ----------
  const bd = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now(), th = H.charByHandle(g, 'theo.marlin'), z = H.charByHandle(g, 'zara.vey');
    th.bday = H.mdOf(t); z.bday = H.mdOf(t - 86400000); z.rel = 50; g.bdays = {};
    g.bdayDay = 'hier'; // (the day changes)
    const age0 = th.age, rz = z.rel;
    H.tickSocial(g, t);
    return { notif: g.notifs.some((n) => new RegExp(`C’est l’anniversaire de Théo Marlin aujourd’hui \\(${th.age} ans\\)`).test(n.text)), forgot: g.notifs.some((n) => /C’était l’anniversaire de Zara hier… et tu as oublié/.test(n.text)), zd: z.rel - rz, zm: z.mem.some((m) => /oublié mon anniversaire/.test(m.t)), age: th.age === age0, ctx: /aujourd’hui, c’est l’anniversaire de @theo\.marlin/i.test(H.promptRefresh(g, 0)) };
  });
  await G(page, () => window.__hype.sendDM(window.__hype.charByHandle(window.__hype.S.game, 'theo.marlin').id, 'joyeux anniversaire Théo !! 🎂'));
  await idle(page);
  const bw = await G(page, () => { const H = window.__hype, g = H.S.game, th = H.charByHandle(g, 'theo.marlin'); return { wished: g.bdays[th.id] === H.dayKey(), mem: th.mem.some((m) => /souhaité mon anniversaire/.test(m.t)), ctx: /le joueur le lui a souhaité/.test(H.promptRefresh(g, 0)) }; });
  check('birthdays: theirs (the notice with their age, the AI told), wished in private (they are touched, they remember, once); a close one forgotten yesterday takes it badly',
    bd.notif && bd.forgot && bd.zd < 0 && bd.zm && bd.ctx && bw.wished && bw.mem && bw.ctx, { bd, bw });
  await G(page, () => window.__hype.openLayer({ t: 'settings' }));
  await page.waitForSelector('.bday-field');
  const today = await G(page, () => { const d = window.__hype.gameDate(Date.now()); return { d: d.getDate(), m: d.getMonth() + 1 }; });
  await page.selectOption('.bday-field select >> nth=0', String(today.d));
  await page.selectOption('.bday-field select >> nth=1', String(today.m));
  await sleep(300);
  await shot(page, 'bday-settings');
  const pb = await G(page, () => { const H = window.__hype, g = H.S.game; const set = g.player.bday; g.bdayDay = 'hier'; H.tickSocial(g); return { set, today: H.mdOf(), notif: g.notifs.some((n) => /Joyeux anniversaire ! Ton réseau le sait/.test(n.text)), trig: g.triggers.some((x) => /C’est l’anniversaire du joueur aujourd’hui/.test(x.text)) }; });
  check('the player’s birthday, set in the settings: the day comes, the notice, and the network is told', pb.set === pb.today && pb.notif && pb.trig, pb);
  await clear(page);

  // ---------- a memory ----------
  const mid = await G(page, () => { const H = window.__hype, g = H.S.game, t = Date.now() - 30 * 86400000; const p = { id: 'pmem', a: 'p', text: 'mon tout premier chaudron, il fume encore 🧪', ts: t, at: t, likes0: 0, likeT: 40, rpT: 2, rT: 1, ls: t, animMs: 1, replies: [], liked: false, reposted: false, res: { fol: 3, xp: 5, rep: 0, verdict: 'Ça passe', viral: false } }; g.posts.push(p); g.memDay = null; H.goTab('feed'); return p.id; });
  await sleep(600);
  const mc = await G(page, () => (document.querySelector('.mem-card') || {}).textContent || '');
  await shot(page, 'memory');
  await page.locator('.mem-card .btn-hot').click();
  await sleep(400);
  const mr = await G(page, () => ({ quote: window.__hype.S.drafts.quote, text: window.__hype.S.drafts.post, card: !!document.querySelector('.mem-card') }));
  check('a memory (a month ago): « Souvenir · il y a un mois, tu postais », « Repartager » (quoted), then gone for the day', /Souvenir · il y a un mois, tu postais/.test(mc) && /premier chaudron/.test(mc) && mr.quote === mid && /^Il y a un mois…/.test(mr.text) && !mr.card, { mc, mr });
  await G(page, () => { const H = window.__hype; H.S.drafts.post = ''; H.S.drafts.quote = null; });
  await clear(page);

  // ---------- the main character of the day, an outage, a new algorithm, a drama channel ----------
  const f0 = await G(page, () => window.__hype.S.game.stats.followers);
  await refresh(page, [{ t: 'maindujour', who: me, why: 'sa potion ratée en direct' }, { t: 'media', drama: true, name: 'Le Thé Brûlant', handle: 'the.brulant', emoji: '☕', role: 'chaîne de drama', bio: 'tous les clashs de Lumen', followers: 90000 }, { t: 'post', by: 'the.brulant', text: 'THREAD : tout ce qu’on sait sur la potion ratée de @' + me + ' 🧵' }]);
  await ahead(page, 60000);
  await sleep(600);
  await G(page, () => window.__hype.goTab('feed'));
  await sleep(300);
  const mdj = await G(page, () => {
    const H = window.__hype, g = H.S.game, dc = H.charByHandle(g, 'the.brulant');
    return { main: g.mainDay && g.mainDay.a, ban: (document.querySelector('.net-ban.main') || {}).textContent || '', fol: g.stats.followers, notif: g.notifs.some((n) => /Tu es le personnage principal du jour/.test(n.text)), dc: !!(dc && dc.drama && dc.kind === 'media'), dn: g.notifs.some((n) => /Une chaîne de drama vient d’ouvrir : Le Thé Brûlant/.test(n.text)), dp: g.posts.some((p) => dc && p.a === 'c:' + dc.id && /THREAD/.test(p.text)), ctx: /@the\.brulant est une chaîne de drama/.test(H.promptRefresh(g, 0)) && /Personnage principal du jour sur le réseau : le joueur/.test(H.promptRefresh(g, 0)) };
  });
  await refresh(page, [{ t: 'maindujour', who: 'zara.vey', why: 'deuxième de la journée' }]);
  const mdj2 = await G(page, () => window.__hype.S.game.mainDay.a);
  check('the main character of the day (a refresh line): the player, the banner, the notice, followers; once a day; a drama channel opens (a media of its own, its thread), the AI knows both',
    mdj.main === 'p' && /Personnage principal du jour : toi · sa potion ratée en direct/.test(mdj.ban) && mdj.fol > f0 && mdj.notif && mdj.dc && mdj.dn && mdj.dp && mdj.ctx && mdj2 === 'p', mdj);
  await refresh(page, [{ t: 'panne', min: 20, why: 'serveurs en feu' }, { t: 'algo', favors: 'photo', days: 3, why: 'la plateforme veut concurrencer les applis photo' }]);
  await ahead(page, 30000);
  await sleep(500);
  const out = await G(page, async () => {
    const H = window.__hype, g = H.S.game;
    g.lastPostAt = 0;
    const r = await H.runAct('post', 'ça marche ?', null, null, {});
    return { on: !!H.outageOn(g), post: r, ban: [...document.querySelectorAll('.net-ban')].map((x) => x.textContent), algo: g.algo && g.algo.favors, mult: [H.algoMult(g, 'photo'), H.algoMult(g, 'texte')], toast: H.S.toasts.map((x) => x.text).join(' | '), ctx: /LE RÉSEAU EST EN PANNE/.test(H.promptRefresh(g, 0)) && /Algorithme du moment : les photos sont mises en avant/.test(H.promptRefresh(g, 0)) };
  });
  await shot(page, 'outage');
  await ahead(page, 25 * 60000);
  await sleep(300);
  const back = await G(page, () => { const H = window.__hype, g = H.S.game; H.tickSocial(g); return { on: !!H.outageOn(g), notif: g.notifs.some((n) => /Le réseau est revenu/.test(n.text)), trig: g.triggers.some((x) => /revient d’une panne/.test(x.text)) }; });
  check('an outage (a refresh line): the banner, nothing goes out (« impossible de publier »), the AI knows; then it comes back (the notice, the network talks about it); a new algorithm: its format carried (×1.3), the others a little less',
    out.on && out.post === false && out.ban.some((x) => /Le réseau est en panne · serveurs en feu/.test(x)) && out.ban.some((x) => /Nouvel algorithme : les photos sont mises en avant/.test(x)) && /impossible de publier/.test(out.toast) && out.algo === 'photo' && out.mult.join() === '1.3,0.88' && out.ctx && !back.on && back.notif && back.trig, { out, back });
  await clear(page);

  // ---------- the world in the comments ----------
  const wl = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, p = g.posts.find((x) => x.id === id);
    p.res = Object.assign({}, p.res, { viral: true });
    const pw = H.promptWave(g, p, 4, 1), t = Date.now();
    const r = H.addReplyTo(g, p, { by: 'jane.from.ohio', name: 'Jane', text: 'who is this witch and why is she iconic 😭', lang: 'en', fr: 'c’est qui cette sorcière et pourquoi elle est iconique 😭' }, t - 500);
    const same = H.addReplyTo(g, p, { by: 'paulo.br', name: 'Paulo', text: 'oi', lang: 'fr', fr: 'oi' }, t - 400);
    return { ask: pw.includes('Le post a fait le tour du monde') && pw.includes('"fr":"sa traduction en français"'), r: r.id, lang: r.lang, fr: r.fr, same: !same.lang };
  }, pid);
  await G(page, (id) => window.__hype.openPost(id), pid);
  await page.waitForSelector(`#r-${wl.r} .tr-btn`);
  const t0 = await G(page, (r) => ({ text: document.querySelector(`#r-${r} .post-text`).textContent, btn: document.querySelector(`#r-${r} .tr-btn`).textContent }), wl.r);
  await page.locator(`#r-${wl.r} .tr-btn`).click();
  await sleep(300);
  const t1 = await G(page, (r) => ({ text: document.querySelector(`#r-${r} .post-text`).textContent, btn: document.querySelector(`#r-${r} .tr-btn`).textContent }), wl.r);
  await shot(page, 'translate');
  check('a viral post goes around the world: the AI is asked for answers from abroad (their language, a translation); « Traduire » shows it in French (« Traduit de l’anglais · Voir l’original »)',
    wl.ask && wl.lang === 'en' && wl.same && /who is this witch/.test(t0.text) && t0.btn === 'Traduire' && /c’est qui cette sorcière/.test(t1.text) && /Traduit de l’anglais · Voir l’original/.test(t1.btn), { wl, t0, t1 });
  await clear(page);

  // ---------- on a phone ----------
  await page.setViewportSize({ width: 390, height: 844 });
  await G(page, () => { const H = window.__hype, g = H.S.game; g.algo = { favors: 'short', at: Date.now(), until: Date.now() + 86400000, why: '' }; g.memDay = null; H.goTab('feed'); });
  await sleep(600);
  const ph = await G(page, () => {
    const out = [];
    if (document.documentElement.scrollWidth > 391) out.push('page ' + document.documentElement.scrollWidth);
    for (const el of document.querySelectorAll('.net-ban, .mem-card, .poll-card, .poll-opt')) { const r = el.getBoundingClientRect(); if (r.width && (r.right > 391 || r.left < -1)) out.push(el.className + ' ' + Math.round(r.left) + '..' + Math.round(r.right)); }
    return out;
  });
  await shot(page, 'phone');
  check('on a phone (390): the banners, a memory and the polls stay within the screen', ph.length === 0, ph);

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
