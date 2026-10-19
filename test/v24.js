// 0.24 end to end, in Chromium against the built hype.html with the mocked Claude runtime:
// - the skills, practised: 50 levels, a tier every five; posts, messages, dates, videos and services train them; the
//   games from before converted; what each level and tier brings (relations, trust, likes, prices…), never the mini-games;
// - the profile: each skill, its level, what it brings in numbers; its tree (the tiers);
// - what the player buys in the exchanges (roses in a message, the bill at a date): the AI says what and how much, the
//   game charges it, charisma makes gifts cheaper or free, a card that cannot pay is refused.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v24.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v24');
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
async function shot(page, name) { shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
const G = (page, fn, arg) => page.evaluate(fn, arg);
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.devis); })) await sleep(250); };
async function dismiss(page) { for (let k = 0; k < 6 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }

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
async function newGame(page, identity) {
  await page.locator('button', { hasText: 'Nouvelle partie' }).first().click();
  await page.locator('button.world', { hasText: 'Académie Lumen' }).first().click();
  await page.waitForSelector('#pn');
  await page.fill('#pn', 'Mila Flux');
  await page.locator('.seg button', { hasText: /^Elle$/ }).first().click();
  await page.fill('#pi', identity);
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

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);
  await newGame(page, 'Une créatrice qui sort beaucoup et qui adore faire plaisir');
  await G(page, () => { window.__hypeNoGearEvent = true; });

  // ---------- the model: levels from practice, 50 of them; a game from before converted ----------
  const model = await G(page, () => {
    const H = window.__hype, g = H.S.game, s = g.stats, out = {};
    out.start = { lv: H.SKILL_IDS.map((id) => s.skills[id]), xp: H.SKILL_IDS.map((id) => s.skillXp[id]), pts: s.skillPoints };
    out.cum = [H.SKILL_CUM[1], H.SKILL_CUM[5], H.SKILL_CUM[10], H.SKILL_CUM[20], H.SKILL_CUM[30], H.SKILL_CUM[50]];
    out.up = H.SKILL_CUM.every((x, k, a) => !k || x > a[k - 1]) && H.SKILL_CUM.length === 51;
    out.tiers = H.SKILL_IDS.map((id) => H.SKILL_TREE[id].tiers.map((t) => t[0]).join(','));
    // a game from before 0.24: the old scale (0-100, from 5, plus points)
    const old = { stats: { skills: { charisme: 23, humour: 10, audace: 11, creativite: 9 }, skillPoints: 2 } };
    H.ensureSkills(old);
    out.old = { lv: H.SKILL_IDS.map((id) => old.stats.skills[id]), xp: old.stats.skillXp.charisme === H.SKILL_CUM[7], pts: old.stats.skillPoints };
    return out;
  });
  check('the skills: a new game starts at level 0 everywhere, no points to place; 50 levels, slower and slower (52 XP for level 5, 140 for 10, over 3 000 for 50), a tier every five; a game from before keeps its progress (charisma 23 → level 7)',
    model.start.lv.join() === '0,0,0,0' && model.start.xp.join() === '0,0,0,0' && model.start.pts === 0 && model.up && model.cum[1] === 52 && model.cum[2] === 140 && model.cum[5] > 3000 && model.cum[5] < 3600
      && model.tiers.every((t) => t === '5,10,15,20,25,30,35,40,45,50') && model.old.lv.join() === '7,2,2,2' && model.old.xp && model.old.pts === 2, model);

  // ---------- practice: a post, a video, a private message, a date; a level that reaches a tier says so ----------
  const prac = await G(page, () => {
    const H = window.__hype, g = H.S.game, s = g.stats, out = {}, xp = () => Object.assign({}, s.skillXp);
    let x0 = xp();
    H.practiseAct(g, { skills: ['humour', 'audace'], humor: 7, bold: 9, quality: 5 }, { kind: 'post' });
    out.post = { humour: s.skillXp.humour - x0.humour, audace: s.skillXp.audace - x0.audace };
    x0 = xp();
    H.practiseAct(g, { skills: ['humour'], humor: 7, quality: 6 }, { kind: 'reply' });
    out.reply = s.skillXp.humour - x0.humour;
    x0 = xp();
    H.practiseAct(g, { skills: ['charisme'], quality: 9 }, { kind: 'post', video: { score: 0.75 } });
    out.video = { charisme: s.skillXp.charisme - x0.charisme, creativite: s.skillXp.creativite - x0.creativite };
    x0 = xp();
    H.practiseDM(g, 4, 'humour', null); H.practiseDM(g, 7, '', null); H.practiseDM(g, -3, 'audace', null);
    out.dm = { humour: s.skillXp.humour - x0.humour, charisme: s.skillXp.charisme - x0.charisme, audace: s.skillXp.audace - x0.audace };
    x0 = xp();
    H.practiseTalk(g, 'charme', null); H.practiseTalk(g, 'amuse', 'main'); H.practiseTalk(g, 'gene', 'bisou');
    out.talk = { charisme: s.skillXp.charisme - x0.charisme, humour: s.skillXp.humour - x0.humour, audace: s.skillXp.audace - x0.audace };
    // charisma to level 10: a tier
    const n0 = g.notifs.length;
    H.trainSkill(g, 'charisme', H.SKILL_CUM[10] - s.skillXp.charisme);
    out.lv = s.skills.charisme;
    out.notif = (g.notifs.slice(n0).find((n) => n.k === 'skill') || {}).text || '';
    out.sk = (g.notifs.slice(n0).find((n) => n.k === 'skill') || {}).sk;
    return out;
  });
  check('practice: a post (3 to 5 XP for each skill it showed), a comment (1 or 2), a video (6 to 10, and creativity for the craft), a private message that landed (2 or 3, the skill it showed, charisma by default; nothing when it cooled), a date (a charm, a laugh, a gesture that worked); a tier reached says what it brings',
    prac.post.humour === 4 && prac.post.audace === 5 && prac.reply === 2 && prac.video.charisme === 10 && prac.video.creativite === 6
      && prac.dm.humour === 2 && prac.dm.charisme === 3 && prac.dm.audace === 0 && prac.talk.charisme === 2 && prac.talk.humour === 2 && prac.talk.audace === 3
      && prac.lv === 10 && /💬 Charisme niveau 10 · Petites attentions : Cadeaux et sorties −10\s%/.test(prac.notif) && prac.sk === 'charisme', prac);

  // ---------- what the levels bring, in numbers (and nothing for the mini-games) ----------
  const fx = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    out.c10 = { gift: H.skillFx(g, 'giftOff'), rel: H.skillFx(g, 'relGain'), trust: H.skillFx(g, 'trustGain'), free: H.skillFx(g, 'giftFree') };
    out.h50 = H.skillFxAt('humour', 50);
    out.a50 = H.skillFxAt('audace', 50);
    out.cr50 = H.skillFxAt('creativite', 50);
    out.now = H.skillNow('charisme', 10);
    // relations: +1 % a level, fairly rounded (on average); losses, softer at the top
    const c = H.charByHandle(g, 'nox.ombre'), keep = { rel: c.rel, unlocked: c.unlocked, cool: c.cool, coeur: c.coeur };
    Object.assign(c, { unlocked: true, coeur: 'serein' });
    const others = H.mains(g).filter((o) => o !== c).map((o) => [o, o.rel, o.vibe]);
    for (const [o] of others) { o.rel = 0; if (['couple', 'fiancailles', 'mariage'].includes(o.vibe)) o.vibe = null; } // (no one close who cannot stand Nox: that would slow it down)
    const sv = Object.assign({}, g.stats.skillXp);
    g.stats.skillXp.charisme = H.SKILL_CUM[50]; H.ensureSkills(g);
    let up = 0, down = 0;
    for (let k = 0; k < 400; k++) { c.rel = 0; H.applyRel(g, c, 4, '', Date.now(), 10); up += c.rel; c.rel = 0; H.applyRel(g, c, -10, '', Date.now(), 10); down += c.rel; }
    out.relUp = up / 400; out.relDown = down / 400;
    // the mini-games do not move: the same edit asked with every skill at 50
    g.stats.skillXp = { charisme: H.SKILL_CUM[50], humour: H.SKILL_CUM[50], audace: H.SKILL_CUM[50], creativite: H.SKILL_CUM[50] }; H.ensureSkills(g);
    const j = { c: c.id, kind: 'montage', what: 'test', pay: 0 };
    const m50 = H.jobGame(g, j);
    g.stats.skillXp = { charisme: 0, humour: 0, audace: 0, creativite: 0 }; H.ensureSkills(g);
    const m0 = H.jobGame(g, j);
    out.mg = { same: m50.diff === m0.diff && m50.items.length === m0.items.length, d: m0.diff };
    g.stats.skillXp = sv; H.ensureSkills(g);
    Object.assign(c, keep);
    for (const [o, rel, vibe] of others) { o.rel = rel; o.vibe = vibe; }
    return out;
  });
  check('what they bring: charisma 10 = relations +10 %, trust +10 %, gifts and outings −10 %; at 50 humour gives likes +15 %, +8 points of viral on a very funny post…; relations rise 50 % faster (on average, fairly rounded) and fall 15 % softer at the top; the mini-games stay as they are',
    Math.abs(fx.c10.gift - 0.1) < 1e-9 && Math.abs(fx.c10.rel - 0.1) < 1e-9 && Math.abs(fx.c10.trust - 0.1) < 1e-9 && fx.c10.free === 0
      && Math.abs(fx.h50.likeAll - 0.15) < 1e-9 && Math.abs(fx.h50.viralFun - 0.08) < 1e-9 && fx.h50.amuseRel === 2 && Math.abs(fx.h50.folLoss - 0.2) < 1e-9 && Math.abs(fx.h50.likeFun - 0.5) < 1e-9
      && Math.abs(fx.a50.haggle - 0.2) < 1e-9 && Math.abs(fx.a50.viral - 0.15) < 1e-9 && Math.abs(fx.cr50.views - 0.2) < 1e-9 && Math.abs(fx.cr50.jobFol - 0.3) < 1e-9
      && fx.now.length === 3 && /relations montent 10\s%/.test(fx.now[0]) && fx.relUp > 5.6 && fx.relUp < 6.4 && fx.relDown < -8.2 && fx.relDown > -8.8 && fx.mg.same, fx);

  // ---------- the profile: each skill, its level, what it brings; its tree ----------
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.goTab('profile'); H.update(); });
  await page.waitForSelector('.skills-sec .skill-row');
  await page.locator('.skills-sec').scrollIntoViewIfNeeded();
  await sleep(300);
  await shot(page, 'profile-skills');
  const prof = await G(page, () => [...document.querySelectorAll('.skills-sec .skill-row')].map((r) => ({ b: r.querySelector('b').textContent, lv: r.querySelector('.mono').textContent, small: r.querySelector('small').textContent })));
  await page.locator('.skills-sec .skill-row', { hasText: 'Charisme' }).click();
  await page.waitForSelector('.layer .skill-tree');
  await sleep(500);
  await shot(page, 'skill-tree');
  const tree = await G(page, () => { const L = [...document.querySelectorAll('.layer')].pop(); return { head: (L.querySelector('.st-head') || {}).textContent || '', nodes: L.querySelectorAll('.st-path li').length, on: L.querySelectorAll('.st-path li.on').length, next: ((L.querySelector('.st-path li.next') || {}).textContent || ''), now: [...L.querySelectorAll('.st-now li')].map((x) => x.textContent), mg: /ne touche jamais aux mini-jeux/.test(L.textContent) }; });
  check('the profile: the four skills with their level and what they bring, in numbers; the tree of a skill: its ten tiers, the ones reached, the next with the XP it takes, what it gives now, and that it never touches the mini-games',
    prof.length === 4 && prof[0].b === 'Charisme' && /Niv\. 10/.test(prof[0].lv) && /relations montent 10\s% plus vite/.test(prof[0].small) && /niveau 15 : le geste offert/.test(prof[0].small)
      && /Charisme · niveau 10/.test(tree.head) && tree.nodes === 10 && tree.on === 2 && /Niveau 15 · Le geste offert/.test(tree.next) && /Encore \d+ XP/.test(tree.next) && tree.now.length === 3 && tree.mg, { prof, tree });
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.update(); });

  // ---------- a purchase in a private message: roses sent ----------
  const dm = await G(page, async () => {
    const H = window.__hype, g = H.S.game, out = {};
    const t = H.charByHandle(g, 'theo.marlin');
    Object.assign(t, { rel: 40, unlocked: true, age: 24 });
    g.career.cash = 500;
    window.__mockBuy = { what: 'un bouquet de roses rouges', kind: 'cadeau', price: 40 };
    window.__trustRolls = [0.99]; // (not offered)
    const n0 = window.__prompts.length;
    await H.sendDM(t.id, '/me t’envoie un bouquet de roses 🌹');
    const p = window.__prompts.slice(n0).find((x) => x.includes('CONVERSATION PRIVÉE')) || '';
    out.line = p.includes('{"t":"buy","what":"≤ 60 caractères : ce qu’il paie","kind":"cadeau","price":40}') && p.includes('Le joueur a 500 euros') && p.includes('"refused":true');
    out.cash = g.career.cash;
    const msgs = g.dms[t.id].msgs, k = msgs.findIndex((m) => m.sys === 'buy');
    out.card = k > 0 && msgs[k - 1].me && /bouquet de roses/.test(msgs[k - 1].text) && msgs[k].buy.paid === 36 && msgs[k].buy.off === 0.1;
    out.ledger = (g.career.ledger.slice(-3).find((x) => x.kind === 'buy') || {}).amount;
    out.mem = (t.mem || []).some((m) => /m’a offert un bouquet de roses rouges/.test(m.t));
    // the next message: the AI reads it with the conversation
    const n1 = window.__prompts.length;
    await H.sendDM(t.id, 'tu les as reçues ?');
    const p2 = window.__prompts.slice(n1).find((x) => x.includes('CONVERSATION PRIVÉE')) || '';
    out.read = /\[Le joueur paie un bouquet de roses rouges \(36\s€\)\]/.test(p2);
    out.noLine = !p2.includes('{"t":"buy"'); // nothing bought in this one: not a word of it
    H.S.stack = []; H.openDM(t.id); H.update();
    return out;
  });
  await sleep(700);
  await shot(page, 'dm-roses');
  const dmCard = await G(page, () => (document.querySelector('.layer .buy-card') || {}).textContent || '');
  check('roses sent in private: the AI is asked whether something is bought and what it really costs (the player’s money said), the game charges it (40 € → 36 € with charisma 10), the receipt follows the message, they remember the gift, and the AI reads it next time; a message that buys nothing asks nothing',
    dm.line && dm.cash === 464 && dm.card && dm.ledger === -36 && dm.mem && dm.read && dm.noLine && /Un bouquet de roses rouges : 36\s€ au lieu de 40\s€ \(charisme −10\s%\)/.test(dmCard), { dm, dmCard });

  // ---------- offered by the house (charisma 15), a card refused, boldness when buying for oneself ----------
  const more = await G(page, async () => {
    const H = window.__hype, g = H.S.game, out = {};
    const t = H.charByHandle(g, 'theo.marlin');
    g.stats.skillXp.charisme = H.SKILL_CUM[15]; H.ensureSkills(g);
    const cash0 = g.career.cash;
    window.__trustRolls = [0.01];
    const r1 = H.applyBuy(g, t, { what: 'une boîte de chocolats', kind: 'cadeau', price: 25 }, 'dm');
    out.free = r1.free && r1.paid === 0 && g.career.cash === cash0;
    g.career.cash = 10;
    window.__trustRolls = [0.99];
    const r2 = H.applyBuy(g, t, { what: 'un collier', kind: 'cadeau', price: 120 }, 'dm');
    out.refused = r2.refused && g.career.cash === 10 && /Carte refusée : un collier/.test(H.buyLabel(g, r2));
    const r3 = H.applyBuy(g, t, { what: 'une tournée', kind: 'sortie', price: 30, refused: true }, 'dm');
    out.asked = r3.refused && g.career.cash === 10;
    g.career.cash = 1000;
    g.stats.skillXp.audace = H.SKILL_CUM[10]; H.ensureSkills(g);
    const r4 = H.applyBuy(g, t, { what: 'un trépied', kind: 'pro', price: '80 €' }, 'dm');
    out.haggle = r4.paid === 72 && /audace −10\s%/.test(H.buyLabel(g, r4));
    out.none = H.applyBuy(g, t, { what: 'rien', kind: 'cadeau', price: 0 }, 'dm') === null;
    out.re = ['je t’offre un verre', 'je paie l’addition', '/me lui offre des fleure', 'je t’invite au resto', 'on se voit demain ?', 'je pense à toi'].map(H.buyTalk);
    return out;
  });
  check('charisma 15: a gift may be offered (5 %); a card that cannot pay is refused (the AI may say so too), nothing charged; boldness 10 haggles what is bought for oneself or one’s work (−10 %); only messages that may buy something ask the AI',
    more.free && more.refused && more.asked && more.haggle && more.none && more.re.join() === 'true,true,true,true,false,false', more);

  // ---------- the bill at a date: the gesture, its real price; roses in the player's own words ----------
  const date = await G(page, async () => {
    const H = window.__hype, g = H.S.game, out = {};
    const a = H.charByHandle(g, 'theo.marlin');
    Object.assign(a, { vibe: 'flirt', rel: 60, cool: null, dates: 2, dare: null, age: 24, coeur: 'serein' });
    g.stats.skillXp.charisme = H.SKILL_CUM[10]; H.ensureSkills(g);
    g.career.cash = 400;
    const ev = { id: 'evBuy', kind: 'rdv', c: a.id, player: true, what: 'Un dîner aux chandelles', diff: 'facile', due: Date.now() - 60000, state: 'scheduled' };
    ev.talk = { scene: 'Une petite table au fond.', lines: [{ who: 'c', text: 'salut' }], turn: 1, max: 5, reacts: [{ r: 'charme', w: 1 }], used: [], at: Date.now() };
    g.events.push(ev);
    window.__mockBuy = { what: 'l’addition du dîner', kind: 'sortie', price: 90 };
    window.__mockReacts = ['charme'];
    window.__trustRolls = [0.99];
    const n0 = window.__prompts.length;
    await H.talkTurn(ev, '', 'payer');
    const p = window.__prompts.slice(n0).find((x) => x.includes('TÂCHE : LE RENDEZ-VOUS, EN VRAI')) || '';
    out.line = p.includes('Le joueur paie : ajoute une ligne {"t":"buy"');
    out.cash1 = g.career.cash;
    const b = ev.talk.lines.find((x) => x.who === 'b');
    out.line1 = b && b.b.paid === 81 && b.b.what === 'l’addition du dîner';
    out.order = ev.talk.lines.map((x) => x.who).join('');
    // roses, in the player's own words
    window.__mockBuy = { what: 'un bouquet de roses', kind: 'cadeau', price: 35 };
    window.__mockReacts = ['charme'];
    await H.talkTurn(ev, '/me lui offre un bouquet de roses');
    out.cash2 = g.career.cash;
    out.transcript = H.talkTranscript(g, ev).filter((x) => /paie/.test(x));
    // the gesture without a price from the AI: what such an evening usually costs
    const ev2 = { id: 'evBuy2', kind: 'rdv', c: a.id, player: true, what: 'Un verre en terrasse', diff: 'facile', due: Date.now() - 60000, state: 'scheduled' };
    ev2.talk = { scene: 'Une terrasse.', lines: [{ who: 'c', text: 'yo' }], turn: 1, max: 5, reacts: [{ r: 'amuse', w: 1 }], used: [], at: Date.now() };
    g.events.push(ev2);
    window.__mockReacts = ['amuse'];
    await H.talkTurn(ev2, '', 'payer');
    out.fallback = (ev2.talk.lines.find((x) => x.who === 'b') || {}).b;
    out.cash3 = g.career.cash;
    g.events = g.events.filter((e) => e.id !== 'evBuy2');
    H.S.stack = []; H.openLayer({ t: 'minigame', id: ev.id }); H.update();
    return out;
  });
  await sleep(800);
  await shot(page, 'date-bill');
  const talkUi = await G(page, () => [...document.querySelectorAll('.layer .talk-buy')].map((x) => x.textContent));
  check('at a date, « Payer l’addition » costs its real price (90 € → 81 € with charisma 10), roses offered in the player’s own words too; the receipt sits after the gesture, the AI reads what was paid; without a price from the AI, the usual bill (60 € → 54 €)',
    date.line && date.cash1 === 319 && date.line1 && /^cpbc/.test(date.order) && date.cash2 === 287.5 && date.transcript.length === 2 && date.fallback && date.fallback.price === 60 && date.fallback.paid === 54 && date.cash3 === 233.5
      && talkUi.length === 2 && /L’addition du dîner : 81\s€/.test(talkUi[0]), { date, talkUi });

  // ---------- the date's log keeps it; humour and boldness in private ----------
  const tail = await G(page, async () => {
    const H = window.__hype, g = H.S.game, out = {};
    const ev = g.events.find((e) => e.id === 'evBuy');
    ev.played = { score: 0.8, tier: 'top', at: Date.now(), kind: 'talk', diff: 'facile' };
    const e = H.logDate(g, ev, g.chars[ev.c], 'Une belle soirée.');
    out.log = e && e.lines.some((x) => x.who === 'b' && /L’addition du dîner/.test(x.text)) && /L’addition du dîner : 81\s€/.test(H.dateLogText(g, e));
    g.events = g.events.filter((x) => x.id !== 'evBuy');
    // a funny message that lands (humour 5: +1 of relation on top), the skill it showed practised
    const t = H.charByHandle(g, 'leandre.aube');
    Object.assign(t, { unlocked: true, rel: 20, coeur: 'serein', cool: null, dare: null });
    g.stats.skillXp.humour = H.SKILL_CUM[5]; H.ensureSkills(g);
    window.__mockSk = 'humour';
    const h0 = g.stats.skillXp.humour, r0 = t.rel;
    await H.sendDM(t.id, 'tu sais pourquoi les squelettes ne se battent jamais ? ils n’ont pas le cran 😏');
    window.__mockSk = null;
    out.humour = g.stats.skillXp.humour - h0;
    out.rel = t.rel - r0;
    out.relNotif = g.notifs.some((n) => /tu l’as fait rire/.test(n.text));
    return out;
  });
  check('the log of the evening keeps what was paid; a message that made them laugh trains humour, and at level 5 it brings one more point of relation',
    tail.log && tail.humour === 2 && tail.relNotif && tail.rel >= 5, tail);

  await shot(page, 'end');
  console.log('\nERRORS', errors.length ? errors.slice(0, 10) : 'none');
  console.log(`CHECKS ${checks.filter((c) => c[0] === 'PASS').length}/${checks.length}`);
  await browser.close();
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
