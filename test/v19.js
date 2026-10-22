// 0.19 end to end, in Chromium against the built hype.html with the mocked Claude runtime:
// - fewer tokens, no feature lost: the rules of tone are the 0.18 words (a private version without what is only about the
//   crowd); each kind of call gets the context that concerns it (a conversation, a scene, more comments, the light
//   tasks); the maturities and temperaments are explained once; the optional lines come when the action calls for them;
//   the story quests of a conversation are the ones about that character;
// - the levels: what each sends (memory) and brings back (volume), measured and shown per hour of play; the life of the
//   world goes with the level (visits, dramas, digging…);
// - the two switches: « Beaucoup de commentaires » (the volume, the waves, the comments that load by themselves) and
//   « Le réseau vit tout seul » (the ChatGPT app only);
// - the waves of reactions after a post (Vivant, Ultime) are written in the post's own answer, minutes after the
//   result; a wave of its own only if the model forgot them.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v19.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v19');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(process.env.PAGE || path.join(ROOT, 'hype.html'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const UMD = fs.readFileSync(process.env.UMD, 'utf8');
const RULES_018 = fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-018.txt'), 'utf8').replace(/\n$/, '');
const SKELETON = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;

const errors = [];
const checks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let shotN = 0, lastPage = null;
const check = (name, ok, info) => { checks.push([ok ? 'PASS' : 'FAIL', name]); console.log(ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)); };
async function shot(page, name) { shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
async function dismiss(page) { for (let k = 0; k < 6 && (await page.$('.modal:not(.sticky)')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(700); } }
async function clickText(page, sel, text) {
  const el = page.locator(sel, { hasText: text }).first();
  if (!sel.startsWith('.modal')) await dismiss(page);
  await el.waitFor({ state: 'visible', timeout: 15000 });
  await el.click();
}
const G = (page, fn, arg) => page.evaluate(fn, arg);
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit); })) await sleep(250); };

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
  // ---------- the new game: the levels, per hour, and the comments in four steps (0.23.1) ----------
  await G(page, () => { window.__sets = (root) => [...document.querySelectorAll(root + ' .int-settings .int-set')].map((c) => ({ lbl: c.querySelector('.lbl').textContent, on: (c.querySelector('.seg button.on') || {}).textContent || '', opts: [...c.querySelectorAll('.seg button')].map((b) => b.textContent), small: c.querySelector('small').textContent })); });
  const form0 = await G(page, () => ({
    tiers: [...document.querySelectorAll('form .int-grid .tier')].map((b) => b.textContent.trim()),
    sw: window.__sets('form'),
  }));
  await clickText(page, '.int-grid .tier', 'Ultime');
  await sleep(200);
  const form1 = await G(page, () => ({ sw: window.__sets('form'), ultime: ([...document.querySelectorAll('form .int-grid .tier')].find((b) => /Ultime/.test(b.textContent)) || {}).textContent }));
  await page.locator('form .int-settings .int-set .seg button', { hasText: /^Normal$/ }).first().click();
  await sleep(200);
  const form2 = await G(page, () => ({ sw: window.__sets('form'), ultime: ([...document.querySelectorAll('form .int-grid .tier')].find((b) => /Ultime/.test(b.textContent)) || {}).textContent }));
  await page.locator('form .int-settings').scrollIntoViewIfNeeded();
  await shot(page, 'new-game-switch');
  const n = (t) => +((/≈\s(\d+) ☕ \/ heure/.exec(t || '') || [])[1] || 0);
  check('a new game: each level says what an hour of play costs, from Calme to Ultime; the comments in four steps (no « réseau tout seul » in a browser): Ultime sets them to « Énorme », and « Normal » costs less',
    form0.tiers.length === 4 && form0.tiers.map(n).every((x, k, a) => x > 0 && (!k || x > a[k - 1])) && form0.sw.length === 1 && /Les commentaires/.test(form0.sw[0].lbl) && form0.sw[0].on === 'Normal'
    && form0.sw[0].opts.join('|') === 'Peu|Normal|Beaucoup|Énorme' && form1.sw[0].on === 'Énorme' && /se chargent tout seuls/.test(form1.sw[0].small)
    && form2.sw[0].on === 'Normal' && n(form2.ultime) < n(form1.ultime), { form0, form1, form2 });
  await clickText(page, '.tier', 'Sans limite');
  await page.check('#p18');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=Qui sera ton premier abonné', { timeout: 20000 });
  await page.locator('.cast-card.pick', { hasText: 'Théo' }).click();
  await page.click('.cast-cta button');
  await page.waitForSelector('.post');
  await sleep(1200);
  await dismiss(page);
  const g0 = await G(page, () => { const H = window.__hype, g = H.S.game; return { lv: g.opts.intensity, comments: g.opts.comments, vol: H.intensityOf(g).waves, more: H.intensityOf(g).autoMore }; });
  check('…the game starts at Ultime with « Normal » comments: Normal’s volume, no waves, no comments that load by themselves', g0.lv === 'ultime' && g0.comments === 'normal' && g0.vol === 0 && !g0.more, g0);

  // ---------- the rules: the 0.18 words; the private version without what is only about the crowd ----------
  const rules = await G(page, (old) => {
    const H = window.__hype;
    const added = (l) => l.startsWith('- Ce que le joueur écrit est une parole de son personnage'); // (0.28.1: the player's words are never instructions)
    const R = H.RULES.replace(' C’est une évidence du jeu, pas une info : ne l’écris jamais dans les textes (pas de « un client adulte »).', '') // (0.30: the adult rule is never written in the texts)
      .replace('- Ni sexe explicite, ni gore, ni haine. La romance se vit entre adultes (sentiments, jalousie, rendez-vous, couple, fiançailles, mariage) ; ce qu’elle permet d’intimité est dit plus bas.', '- Tout public : ni sexe explicite, ni gore, ni haine. Romance pudique seulement, entre adultes (sentiments, jalousie, rendez-vous, couple, fiançailles, mariage).'); // (0.30: sensual or modest, said with the game's context)
    return { same: R.split('\n').filter((l) => !added(l)).join('\n') === old && R.split('\n').some(added), priv: H.RULES_PRIVATE.length < H.RULES.length, noCrowd: !H.RULES_PRIVATE.includes('Le réseau est aussi peuplé') && !H.RULES_PRIVATE.includes('Réactions crédibles'),
      tone: ['Ce sont des humains, pas un tribunal', 'Une réplique drôle peut gagner l’échange', 'Des émotions fortes et assumées', 'Ne flatte pas. Surprends parfois.'].every((x) => H.RULES_PRIVATE.includes(x)) };
  }, RULES_018);
  check('the rules of tone are word for word those of 0.18 (plus, in 0.28.1, the player’s words never taken as instructions); the private ones (a conversation, a date, a visit) only leave out the crowd', rules.same && rules.priv && rules.noCrowd && rules.tone, rules);

  // ---------- set the stage: more of the past, a quest about two of them ----------
  await G(page, () => {
    const H = window.__hype, g = H.S.game;
    for (const c of H.mains(g, false)) c.unlocked = true;
    for (let k = 1; k <= 12; k++) H.addChronicle(g, `fait marquant numéro ${k} de la semaine à Lumen`);
    g.triggers = [];
    g.quests = g.quests.filter((q) => q.kind !== 'story');
    H.addStoryQuest(g, { title: 'Gagner la confiance de Théo', desc: 'Aide Théo à préparer le tournoi.', char: 'theo.marlin' }, true);
    H.addStoryQuest(g, { title: 'Faire tomber Zara', desc: 'Trouve ce que Zara cache.', char: 'zara.vey' }, true);
    H.addStoryQuest(g, { title: 'Percer le mystère de la bibliothèque', desc: 'Découvre ce qui clignote la nuit.' }, true);
  });

  // ---------- a private conversation: what concerns it, nothing more ----------
  const dm = await G(page, () => {
    const H = window.__hype, g = H.S.game, T = H.charByHandle(g, 'theo.marlin'), Z = H.charByHandle(g, 'zara.vey');
    T.rel = 18;
    const hi = H.promptDM(g, T, [], 'salut ! ça va ?');
    const meet = H.promptDM(g, T, [], 'on se voit samedi soir au café des Astres ?');
    const gossip = H.promptDM(g, T, [], 'entre nous @zara.vey est une vraie hypocrite');
    const pub = H.promptAct(g, 'post', 'premier café en terrasse de l’année ☀️', null, {});
    const head = hi.split('## CONVERSATION PRIVÉE')[0];
    const quests = (hi.split('## QUÊTES HISTOIRE DU JOUEUR (id : objectif)')[1] || '').split('\n\n')[0];
    const zq = g.quests.find((q) => q.kind === 'story' && q.charId === Z.id), tq = g.quests.find((q) => q.kind === 'story' && q.charId === T.id);
    return {
      privRules: hi.startsWith(H.RULES_PRIVATE), noCrowd: !head.includes('## LE PUBLIC') && !head.includes('## SECRETS') && !head.includes('Compétences /100') && !head.includes('Comptes médias'),
      brief: head.includes('## LE JOUEUR ET LES AUTRES') && head.includes('@zara.vey '), ownSheet: !head.includes('@theo.marlin — ') && hi.includes('Fiche de Théo Marlin : '),
      quests: quests.includes(tq.id) && !quests.includes(zq.id) && quests.includes('Percer le mystère'), storyIds: (/id parmi ([^)]*)\)/.exec(hi) || [])[1] || '',
      tq: tq.id, zq: zq.id,
      lines: { hi: [hi.includes('"t":"plan","kind":"rdv"'), hi.includes('{"t":"invite","what"'), hi.includes('{"t":"intel"')], meet: [meet.includes('"t":"plan","kind":"rdv"'), meet.includes('{"t":"invite","what"')], gossip: gossip.includes('{"t":"intel"') },
      sizes: { dm: hi.length, post: pub.length },
    };
  });
  check('a private conversation: the private rules, the others in a word (no crowd, no secrets of others, no skills, no media), their own sheet once, and only the quests about them (or about no one)',
    dm.privRules && dm.noCrowd && dm.brief && dm.ownSheet && dm.quests && dm.storyIds.includes(dm.tq) && !dm.storyIds.includes(dm.zq), dm);
  check('…and the lines for a meeting, an invitation or a capture only when the talk calls for them',
    dm.lines.hi.every((x) => !x) && dm.lines.meet.every(Boolean) && dm.lines.gossip, dm.lines);

  // ---------- a scene: a date, a visit ----------
  const sc = await G(page, () => {
    const H = window.__hype, g = H.S.game, N = H.charByHandle(g, 'nox.ombre'), T = H.charByHandle(g, 'theo.marlin');
    const ev = { id: 'evx', c: N.id, player: true, what: 'un verre au Café des Astres', due: Date.now(), state: 'scheduled', kind: 'rdv', diff: 'moyen' };
    N.dates = 1;
    ev.talk = { scene: 'Le Café des Astres.', lines: [{ who: 'c', text: 'alors. je t’écoute.', seen: 'un demi-sourire' }], turn: 1, max: 5, reacts: [], used: [], at: Date.now() };
    ev.talk.ex = H.dateExigence(g, ev);
    const talk = H.promptTalk(g, ev, { text: 'je voulais surtout te voir, en vrai.' });
    const v = { id: 'vix', c: T.id, why: 'il t’a vu draguer Zara en public', urge: 'urgent', at: Date.now(), state: 'talk', lines: [{ who: 'c', text: 'on peut parler ?', seen: 'la mâchoire serrée' }], turn: 0, max: 4, reacts: [] };
    const visit = H.promptVisit(g, v, 'je comprends, on parlait juste du duel.');
    const one = (p, h) => p.split('## TÂCHE')[0].includes('@' + h + ' — ');
    return { talkRules: talk.startsWith(H.RULES_PRIVATE), visitRules: visit.startsWith(H.RULES_PRIVATE), sheets: [one(talk, 'nox.ombre'), one(visit, 'theo.marlin')],
      fiche: /Fiche de Nox : .* · voix : /.test(talk), others: !/^@zara\.vey — /m.test(talk) && talk.includes('Les autres : '), noCrowd: !talk.includes('## LE PUBLIC') && !visit.includes('## LE PUBLIC'),
      sizes: { talk: talk.length, visit: visit.length } };
  });
  check('a date, a visit: the private rules, their sheet once (in the scene, with what they look like), the others on the roster, no crowd',
    sc.talkRules && sc.visitRules && sc.sheets.every((x) => !x) && sc.fiche && sc.others && sc.noCrowd, sc);

  // ---------- the maturities and temperaments, explained once ----------
  const legend = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const p = H.promptAct(g, 'post', 'premier café en terrasse de l’année ☀️', null, {});
    const sheets = p.split('\n').filter((l) => /^@[\w.]+ — /.test(l));
    const used = [...new Set(H.mains(g).filter((c) => sheets.some((l) => l.startsWith('@' + c.handle + ' — '))).map((c) => (H.MATU[c.matu] ? c.matu : 'pose')))];
    return { n: sheets.length, short: sheets.every((l) => !/ans, (très immature|immature|posé·e|très mature) :/.test(l)),
      once: used.every((m) => p.split(H.MATU[m].ai).length === 2), legend: p.split('Maturité (selon l’âge, sur chaque fiche) :').length === 2 };
  });
  check('the maturity of each sheet in a word, what each word means said once', legend.n >= 3 && legend.short && legend.once && legend.legend, legend);

  // ---------- the optional lines of a post, when the action calls for them ----------
  const opt = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    g.triggers = [];
    const has = (p) => ({ vibe: p.includes('{"t":"vibe","by"'), plan: p.includes('{"t":"plan","by"'), announce: p.includes('{"t":"announce"') });
    return { plain: has(H.promptAct(g, 'post', 'premier café en terrasse de l’année ☀️', null, {})),
      duel: has(H.promptAct(g, 'post', 'qui vient voir le duel demain à 8h ? @zara.vey', null, {})),
      video: has(H.promptAct(g, 'post', 'grosse vidéo qui sort bientôt sur la bibliothèque interdite', null, {})),
      // 0.31.2: a video comes only from the player's box (« Faire une vidéo à partir de ce post »): the reactions are told
      boxed: (() => { const p = H.promptAct(g, 'post', 'grosse vidéo qui sort bientôt sur la bibliothèque interdite', null, {}, null, { announce: { what: 'vidéo', topic: 'La bibliothèque interdite', at: Date.now() + 3 * 3600000, about: '' } }); return Object.assign(has(p), { told: /Avec ce post, le joueur annonce une vidéo : « La bibliothèque interdite », qui sort /.test(p) }); })() };
  });
  check('a post: a change of relationship, an event with a time are offered when the post calls for them (a banal post goes without); a video is never looked for in the words (0.31.2), the box tells the reactions',
    !opt.plain.vibe && !opt.plain.plan && !opt.plain.announce && opt.duel.vibe && opt.duel.plan && !opt.video.announce && !opt.boxed.announce && opt.boxed.told, opt);

  // ---------- the memory of each level ----------
  const mem = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const count = (p, head) => { const b = p.split(head)[1]; return b ? b.split('\n\n')[0].split('\n').filter((l) => l.trim()).length : 0; };
    const at = (lv) => {
      g.opts.intensity = lv;
      const p = H.promptAct(g, 'post', 'premier café en terrasse de l’année ☀️', null, {});
      const r = H.promptAct(g, 'reply', 'carrément', g.posts.find((x) => x.a !== 'p'), {});
      return { feed: count(p, '## DERNIERS POSTS DU FIL (du plus ancien au plus récent)\n'), chron: count(p, '## CE QUI S’EST PASSÉ RÉCEMMENT (du plus ancien au plus récent)\n'), sheets: p.split('\n').filter((l) => /^@[\w.]+ — /.test(l)).length, replyFeed: count(r, '## DERNIERS POSTS DU FIL (du plus ancien au plus récent)\n'), size: p.length };
    };
    const out = { calme: at('calme'), normal: at('normal'), ultime: at('ultime') };
    g.opts.intensity = 'ultime';
    return out;
  });
  check('the memory of each level: Calme sends less of the past, Ultime more (a reply, a shorter feed: the thread is quoted)',
    mem.calme.chron === 4 && mem.normal.chron === 6 && mem.ultime.chron === 8 && mem.calme.feed <= 5 && mem.calme.feed < mem.normal.feed && mem.calme.sheets <= 4 && mem.calme.sheets < mem.ultime.sheets
    && mem.normal.sheets < mem.ultime.sheets && mem.normal.replyFeed < mem.normal.feed, mem); // (sizes: a random offer of a visit or a dig may come or not)

  // ---------- the life of the world goes with the level ----------
  const life = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    g.visits = []; g.events = [];
    for (const c of H.mains(g)) c.badBuzz = null;
    g.visitAt = t - 5 * 3600000; g.selfBuzzAt = t - 30 * 3600000;
    const at = (lv) => { g.opts.intensity = lv; return { k: H.lifeK(g), visit: H.visitOK(g, t), buzz: H.selfBuzzOK(g, t) }; };
    const out = { calme: at('calme'), normal: at('normal'), ultime: at('ultime') };
    g.opts.intensity = 'ultime';
    return out;
  });
  check('the life of the world goes with the level: five hours after a visit, someone may come over again at Ultime, not at Calme; a drama of their own sooner too',
    life.calme.k < life.normal.k && life.normal.k < life.ultime.k && !life.calme.visit && life.ultime.visit && !life.calme.buzz && !life.normal.buzz && life.ultime.buzz, life);

  // ---------- costs: measured, per level, per switch ----------
  const cost = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const hour = ['calme', 'normal', 'vivant', 'ultime'].map((lv) => H.hourCafes(lv, H.COMMENTS[H.INTENSITY[lv].comments].vol, 'off'));
    const steps = ['calme', 'normal', 'vivant', 'ultime'].map((v) => H.hourCafes('ultime', v, 'off')), live = ['off', 'doux', 'normal', 'fort'].map((x) => H.hourCafes('normal', 'normal', x));
    return { hour, steps, live, hint: [H.budgetHint(60, 'calme'), H.budgetHint(60, 'ultime', 'ultime')], dm: H.costAt('normal', 'normal', 'dm') < H.costAt('normal', 'normal', 'post') };
  });
  const up = (a) => a.every((x, k) => !k || x > a[k - 1]);
  check('what an hour costs, measured: Calme < Normal < Vivant < Ultime; each step of the comments and of the network that lives on its own costs more; a budget is worth fewer posts at Ultime',
    up(cost.hour) && up(cost.steps) && up(cost.live) && cost.dm && cost.hint[0] !== cost.hint[1], cost);

  // ---------- the settings: the comments in four steps, kept apart from the level (0.23.1) ----------
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.openLayer({ t: 'settings' }); });
  await page.waitForSelector('.layer .int-settings');
  const st0 = await G(page, () => ({ on: (document.querySelector('.layer .int-settings .seg button.on') || {}).textContent, live: [...document.querySelectorAll('.layer .int-settings .lbl')].some((b) => /vit tout seul/.test(b.textContent)) }));
  await page.locator('.layer .int-settings .seg button', { hasText: 'Énorme' }).click();
  await sleep(250);
  const st1 = await G(page, () => { const H = window.__hype, g = H.S.game; return { on: (document.querySelector('.layer .int-settings .seg button.on') || {}).textContent, comments: g.opts.comments, waves: H.intensityOf(g).waves, auto: H.intensityOf(g).autoMore }; });
  await page.locator('.layer .int-settings').scrollIntoViewIfNeeded();
  await shot(page, 'settings-switch');
  await page.locator('.layer .int-grid .tier', { hasText: 'Vivant' }).click();
  await sleep(250);
  const st2 = await G(page, () => { const H = window.__hype, g = H.S.game; return { lv: g.opts.intensity, comments: g.opts.comments, of: H.commentsOf(g), on: H.chattyOn(g), waves: H.intensityOf(g).waves }; });
  check('in the settings: the comments (no « réseau qui vit tout seul » in a browser); « Énorme » brings two waves and the comments that load by themselves; a level picked again comes with its own',
    st0.on === 'Normal' && !st0.live && st1.on === 'Énorme' && st1.comments === 'enorme' && st1.waves === 2 && st1.auto && st2.lv === 'vivant' && st2.comments === undefined && st2.of === 'beaucoup' && st2.on && st2.waves === 1, { st0, st1, st2 });
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.update(); });

  // ---------- Vivant: the later reactions, in the post's own answer ----------
  const n1 = await G(page, () => window.__prompts.length);
  await G(page, () => window.__hype.runAct('post', 'test du soir : qui est chaud pour un duel de potions ?'));
  await idle(page);
  await sleep(800);
  const wv = await G(page, (n) => {
    const H = window.__hype, g = H.S.game, p = g.posts.filter((x) => x.a === 'p').pop();
    const prs = window.__prompts.slice(n);
    const lates = p.replies.filter((r) => r.at >= p.res.revealAt + 55000);
    return { ask: prs.some((x) => x.includes('Le joueur publie ce post') && x.includes('5 à 8 réponses qui arriveront PLUS TARD') && x.includes('"late":3')), n: lates.length,
      after: Math.round((Math.min(...lates.map((r) => r.at)) - p.res.revealAt) / 1000), ordered: lates.every((r, k) => !k || r.at >= lates[k - 1].at), threaded: lates.filter((r) => r.to).length,
      notif: g.notifs.filter((x) => x.p === p.id && /Une nouvelle vague de réactions sous ton post \(5 réponses\)/.test(x.text)).length, wave: prs.filter((x) => x.includes('TÂCHE : UNE NOUVELLE VAGUE DE RÉACTIONS')).length, rT: p.rT >= p.replies.length };
  }, n1);
  check('Vivant: the reactions that keep coming are written with the post (no call of their own), and arrive minutes after the result, in order, answering each other, with one notice',
    wv.ask && wv.n === 5 && wv.after >= 100 && wv.ordered && wv.threaded >= 1 && wv.notif === 1 && wv.wave === 0 && wv.rT, wv);
  const n2 = await G(page, () => { window.__mockNoLate = true; return window.__prompts.length; });
  await G(page, () => window.__hype.runAct('post', 'deuxième test : la tour nord clignote encore'));
  await idle(page);
  await page.waitForFunction((n) => window.__prompts.slice(n).some((x) => x.includes('TÂCHE : UNE NOUVELLE VAGUE DE RÉACTIONS')), n2, { timeout: 20000 }).catch(() => {});
  const fb = await G(page, (n) => ({ wave: window.__prompts.slice(n).filter((x) => x.includes('TÂCHE : UNE NOUVELLE VAGUE DE RÉACTIONS')).length }), n2);
  await G(page, () => { window.__mockNoLate = false; });
  check('…and if the model forgot them, a wave of its own comes after the post, as before', fb.wave === 1, fb);

  // ---------- the light tasks and the threads: their own context ----------
  const light = await G(page, () => {
    const H = window.__hype, g = H.S.game, p = g.posts.find((x) => x.a !== 'p' && x.replies.length) || g.posts.find((x) => x.a !== 'p');
    const more = H.promptMore(g, p, '6 à 8'), ideas = H.promptIdeas(g, null);
    return { more: !more.includes('## SECRETS') && !more.includes('Compétences /100') && !more.includes('## QUÊTES HISTOIRE') && more.includes('## LE PUBLIC') && more.startsWith(H.RULES),
      ideas: !ideas.includes('## LE PUBLIC') && !ideas.includes('Comptes médias') && ideas.includes('## QUÊTES HISTOIRE') };
  });
  check('more comments under a post: the crowd, no secrets, no skills, no quests; ideas for a post: the quests, no crowd', light.more && light.ideas, light);

  // ---------- 0.19.1: contracts ----------
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.S.modals = []; H.update(); });
  const ex = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    g.stats.followers = Math.max(g.stats.followers, 20000); g.deals = [];
    const d1 = H.makeOffer(g, { brand: 'Volta', sector: 'boisson', product: 'sa boisson énergisante', shady: false });
    d1.exclusive = true;
    const s1 = H.signDeal(g, d1);
    d1.state = 'done'; // delivered a few days ago: the exclusivity still runs
    const d2 = H.makeOffer(g, { brand: 'Volta', sector: 'boisson', product: 'son thé glacé', shady: false });
    const same = H.signDeal(g, d2);
    const d3 = H.makeOffer(g, { brand: 'Bulle Givrée', sector: 'boisson', product: 'son eau pétillante aromatisée', shady: false });
    const other = H.signDeal(g, d3);
    return { s1, same, other, d2: d2 && d2.state, d3: d3 && d3.state };
  });
  check('an exclusive contract with a brand: the same brand may come back with a new partnership; another brand of the sector still may not',
    ex.s1 && ex.same && ex.d2 === 'signed' && !ex.other && ex.d3 === 'offer', ex);
  await G(page, () => {
    const H = window.__hype, g = H.S.game;
    g.deals = g.deals.filter((d) => d.state !== 'offer');
    const d4 = H.makeOffer(g, { brand: 'MoonCoin', sector: 'crypto', product: 'son jeton « x100 garanti »', shady: false });
    const d5 = H.makeOffer(g, { brand: 'Zest & Cie', sector: 'boisson', product: 'son thé glacé', shady: true });
    window.__dl = { d4: d4.id, c4: d4.contact, d5: d5.id, c5: d5.contact, fee5: d5.fee };
    H.S.stack = []; H.openDM(d4.contact);
  });
  await page.waitForFunction(() => [...document.querySelectorAll('.layer .deal-card')].some((e) => /MoonCoin/.test(e.textContent)), null, { timeout: 10000 });
  const card4 = await page.$eval('.layer .deal-card', (e) => ({ text: e.textContent, banned: e.classList.contains('banned'), warn: e.querySelectorAll('.warn').length }));
  await shot(page, 'deal-crypto-no-warning');
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.openDM(window.__dl.c5); });
  await page.waitForFunction(() => [...document.querySelectorAll('.layer .deal-card')].some((e) => /Zest/.test(e.textContent)), null, { timeout: 10000 });
  const card5 = await page.$eval('.layer .deal-card', (e) => ({ text: e.textContent, warn: e.querySelectorAll('.warn').length }));
  const nohint = (t) => !/illégal|interdit|amende|loi|⚠️|⛔|bad buzz/i.test(t);
  const d4 = await G(page, () => { const H = window.__hype, g = H.S.game, d = H.dealOf(g, window.__dl.d4); return { banned: !!d.banned, summary: H.dealSummary(g, d), prompt: H.promptDM(g, g.chars[d.contact], [], 'c’est quoi exactement votre jeton ?') }; });
  check('a brand selling something the law forbids (crypto), or asking for no mention: the card gives the terms, and no hint about a trap (it is up to the player); the AI knows and never brings it up itself',
    d4.banned && nohint(card4.text) && !card4.banned && !card4.warn && nohint(card5.text) && !card5.warn && /Sans la mention « Collaboration commerciale »/.test(card5.text) && nohint(d4.summary)
    && /n’en parle jamais d’elle-même et minimise/.test(d4.prompt), { card4, card5, summary: d4.summary });
  const n5 = await G(page, () => window.__prompts.length);
  await G(page, () => window.__hype.sendDM(window.__dl.c5, 'ok pour le partenariat, mais je mets la mention. vous me payez un peu moins, ça me va'));
  await idle(page);
  await sleep(3500);
  const rn = await G(page, (n) => {
    const H = window.__hype, g = H.S.game, d = H.dealOf(g, window.__dl.d5), B = H.dealBounds(d);
    const pr = window.__prompts.slice(n).find((x) => x.includes('CONVERSATION PRIVÉE')) || '';
    const cards = g.dms[d.contact].msgs.filter((m) => m.sys === 'deal');
    return { shady: d.shady, fee: d.fee, was: window.__dl.fee5, lo: B.lo, cap: B.cap, cards: cards.length, upd: cards.some((m) => m.upd), line: pr.includes('OBLIGATOIRE dès que') && pr.includes('"mention":true ou false'),
      notif: (g.notifs.filter((x) => x.c === d.contact && x.k === 'money').slice(-1)[0] || {}).text || '' };
  }, n5);
  await page.waitForSelector('.layer .deal-card');
  await shot(page, 'deal-renegotiated');
  const card6 = await page.$$eval('.layer .deal-card', (els) => els.map((e) => e.textContent).pop());
  check('a brand that wanted no mention agrees to the mention for a lower price: the contract follows (mention back, the new price, a new card, a notice)',
    rn.line && rn.shady === false && rn.fee < rn.was && rn.fee >= rn.lo && rn.fee <= rn.cap && rn.cards >= 2 && rn.upd && /avec la mention « Collaboration commerciale »/.test(rn.notif) && /Avec la mention « Collaboration commerciale »/.test(card6), Object.assign({ card6: card6.slice(0, 200) }, rn));

  console.log('SIZES', JSON.stringify({ dm: dm.sizes, scene: sc.sizes, mem }));
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
