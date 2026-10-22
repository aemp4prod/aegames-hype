// 0.31.3, in Chromium against the built hype.html with the mocked Claude runtime:
// - a reaction on a message received, in private and in a group: a button on hover (a computer), a long press or a
//   double tap for ❤️ (a phone); a badge; tapped again, it goes. The AI reads it in the conversation; left without a word
//   since, it reads it on the network too (in private: what is private stays so);
// - the player's likes (a comment, a post) and pins reach the one liked: in their private conversation, on the network,
//   under the post;
// - a level-up once every planned character is there: someone new comes by themselves (no question, no button).
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/reacts.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-reacts');
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
async function shot(page, name) { await page.evaluate(() => { const H = window.__hype; if (H && H.S) { H.S.toasts.length = 0; H.update(false); } }); await sleep(150); shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
const G = (page, fn, arg) => page.evaluate(fn, arg);
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.dms || b.story || b.groups || b.newchar); })) await sleep(150); await sleep(300); };
async function dismiss(page) { for (let k = 0; k < 8 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }
const clear = (page) => G(page, () => { const H = window.__hype; H.S.stack = []; H.S.modals.length = 0; H.S.toasts.length = 0; H.S.storyView = null; H.update(); });
async function overflowCheck(page, label) {
  const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth }));
  if (w.sw > w.cw + 1 || w.bw > w.cw + 1) errors.push(`[overflow] ${label}: ${JSON.stringify(w)}`);
}

async function newPage(browser, viewport, touch) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: !!touch, isMobile: !!touch, colorScheme: 'light' });
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript(() => { window.__hypeEasyGear = true; });
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
  await G(page, () => { const H = window.__hype, g = H.S.game; for (const h of ['leandre.aube', 'ada.quill']) Object.assign(H.charByHandle(g, h), { unlocked: true, asleep: undefined, rel: 30 }); g.stats.energy = g.stats.maxEnergy; H.update(); });
}
// A message of theirs, received a moment ago.
const incoming = (page, h, text, ago) => G(page, (a) => { const H = window.__hype, g = H.S.game; H.addIncomingDM(g, a.h, a.text, Date.now() - a.ago); const M = g.dms[H.charByHandle(g, a.h).id].msgs; return M[M.length - 1].id; }, { h, text, ago });
const msgOf = (page, h, id) => G(page, (a) => { const H = window.__hype, g = H.S.game, m = g.dms[H.charByHandle(g, a.h).id].msgs.find((x) => x.id === a.id); return { r: m.rx || null, rAt: m.rxAt || null }; }, { h, id });
const touchAt = (page, sel, n, type) => G(page, (a) => {
  const el = document.querySelectorAll(a.sel)[a.n], b = el.getBoundingClientRect();
  el.dispatchEvent(new PointerEvent(a.type, { pointerType: 'touch', pointerId: 7, isPrimary: true, bubbles: true, cancelable: true, clientX: b.left + 12, clientY: b.top + 10 }));
}, { sel, n, type });

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);

  // ---------- reacting to a private message, on a computer ----------
  const m1 = await incoming(page, 'leandre.aube', 'Tu as vu le conseil hier ? J’ai tout gagné 😏', 120000);
  const m2 = await incoming(page, 'leandre.aube', 'Je t’attends au bal ce soir.', 60000);
  await G(page, () => { const H = window.__hype; H.openDM(H.charByHandle(H.S.game, 'leandre.aube').id); });
  await page.waitForSelector('.layer .react-wrap');
  const wraps = page.locator('.layer .react-wrap');
  const before = await G(page, () => getComputedStyle(document.querySelector('.layer .react-wrap .react-btn')).opacity);
  await wraps.nth(0).hover();
  await sleep(350);
  const hovered = await G(page, () => getComputedStyle(document.querySelector('.layer .react-wrap .react-btn')).opacity);
  await wraps.nth(0).locator('.react-btn').click();
  await page.waitForSelector('.layer .react-pick');
  const pick = await G(page, () => [...document.querySelectorAll('.layer .react-pick button')].map((b) => b.getAttribute('aria-label')));
  await shot(page, 'dm-picker');
  check('a message received: the reaction button shows on hover, and opens seven reactions', before === '0' && hovered === '1' && pick.join('|') === 'J’adore|Haha|Wouah|Triste|Grrr|Ok|Le feu', { before, hovered, pick });
  await page.locator('.layer .react-pick button[aria-label="Haha"]').click();
  await sleep(250);
  const r1 = await msgOf(page, 'leandre.aube', m1);
  const badge1 = await G(page, () => { const b = document.querySelector('.layer .react-wrap .react-badge'); return b ? { alt: (b.querySelector('img') || {}).alt || b.textContent, label: b.getAttribute('aria-label') } : null; });
  check('😂 picked: kept on the message, shown in a badge, the picker closes', r1.r === '😂' && r1.rAt > 0 && !!badge1 && badge1.alt === '😂' && /Ta réaction : Haha/.test(badge1.label) && !(await page.$('.layer .react-pick')), { r1, badge1 });
  await page.locator('.layer .react-wrap').nth(0).locator('.react-badge').click();
  await page.waitForSelector('.layer .react-pick');
  const on = await G(page, () => { const b = document.querySelector('.layer .react-pick button.on'); return b ? b.getAttribute('aria-label') : null; });
  await page.locator('.layer .react-pick button.on').click();
  await sleep(250);
  const r1b = await msgOf(page, 'leandre.aube', m1);
  check('tapped again (from its badge), the reaction goes', on === 'Haha (retirer)' && r1b.r === null && !(await page.$('.layer .react-wrap .react-badge')), { on, r1b });
  await wraps.nth(1).hover();
  await wraps.nth(1).locator('.react-btn').click();
  await page.locator('.layer .react-pick button[aria-label="J’adore"]').click();
  await sleep(250);
  const r2 = await msgOf(page, 'leandre.aube', m2);
  await page.mouse.move(5, 5);
  await sleep(300);
  await shot(page, 'dm-badge');

  // the AI reads it: in the conversation, and on the network while nothing was written since
  const ai = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'leandre.aube');
    const history = g.dms[c.id].msgs.filter((m) => m.text);
    const P = H.promptDM(g, c, history, 'coucou'), C = H.ctxText(g);
    return { dm: P.includes('Je t’attends au bal ce soir. [le joueur a réagi : ❤️]') && !P.includes('J’ai tout gagné 😏 [le joueur'), head: P.includes('[le joueur a réagi : ❤️] = un emoji que le joueur a posé sur ce message, sans rien écrire'),
      net: (C.match(/en privé, le joueur a réagi ❤️ à son message « Je t’attends au bal ce soir\. », sans rien écrire depuis \(il y a [^)]+\)/) || [''])[0], rule: C.includes('Ce qui est privé, seuls ceux qui y sont nommés le savent') };
  });
  check('the AI reads the reaction: in their conversation (marked, explained once), and on the network as a private thing while nothing was written since',
    r2.r === '❤️' && ai.dm && ai.head && !!ai.net && ai.rule, Object.assign({ r2 }, ai));
  const n0 = await G(page, () => window.__prompts.length);
  await G(page, () => { window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'Ce cœur… tu viens donc ? 😌' }] }]; });
  await G(page, () => { const H = window.__hype; return H.sendDM(H.charByHandle(H.S.game, 'leandre.aube').id, 'peut-être…'); });
  await idle(page);
  const sent = await G(page, (n0) => { const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'leandre.aube'); const P = window.__prompts.slice(n0).find((x) => x.includes('CONVERSATION PRIVÉE')) || ''; return { told: P.includes('Je t’attends au bal ce soir. [le joueur a réagi : ❤️]'), pending: H.pendingReacts(g, c).length, net: /a réagi ❤️ à son message/.test(H.ctxText(g)) }; }, n0);
  check('a message sent: their AI had the reaction in front of it; once they wrote to each other, it is no longer « unanswered » on the network', sent.told && sent.pending === 0 && !sent.net, sent);
  const reply = await G(page, () => { const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'leandre.aube'), M = g.dms[c.id].msgs, m = M.filter((x) => !x.me && x.text).pop(); return { text: m.text, r: m.r, rx: m.rx || null, tag: H.reactTag(m), prompt: H.promptDM(g, c, M.filter((x) => x.text), 'ok').includes('a réagi : 1'), badges: document.querySelectorAll('.layer .react-badge').length }; });
  check('their answer (marked r: 1, as every answer) carries no reaction: no badge, nothing said to the AI', reply.r === 1 && reply.rx === null && reply.tag === '' && !reply.prompt && reply.badges === 1, reply);
  await clear(page);

  // ---------- in a group ----------
  const gr = await G(page, () => {
    const H = window.__hype, g = H.S.game, L = H.charByHandle(g, 'leandre.aube'), A = H.charByHandle(g, 'ada.quill');
    const r = H.createGroup(g, [L.id, A.id], 'Le bal', '🎉');
    H.addGroupMsg(g, r.gr, A, 'Qui ramène les boissons ? 🍹', Date.now() - 30000);
    H.openLayer({ t: 'group', id: r.gr.id });
    return r.gr.id;
  });
  await page.waitForSelector('.layer .gr-line .react-wrap');
  await page.locator('.layer .gr-line .react-wrap').first().hover();
  await page.locator('.layer .gr-line .react-wrap .react-btn').first().click();
  await page.locator('.layer .react-pick button[aria-label="Le feu"]').click();
  await sleep(250);
  await shot(page, 'group-badge');
  const ng = await G(page, () => window.__prompts.length);
  await G(page, () => { window.__mockOnce = [{ has: 'LE GROUPE DE DISCUSSION', lines: [{ t: 'msg', by: 'ada.quill', text: 'Parfait, merci ! 🔥' }] }]; });
  await G(page, (id) => window.__hype.sendGroup(id, 'moi !'), gr);
  await idle(page);
  const grp = await G(page, (a) => { const H = window.__hype, g = H.S.game, gr = H.groupOf(g, a.id), m = gr.msgs.find((x) => x.a && x.a !== 'p' && !x.sys); const P = window.__prompts.slice(a.ng).find((x) => x.includes('LE GROUPE DE DISCUSSION')) || ''; return { r: m.rx, told: P.includes('Qui ramène les boissons ? 🍹 [le joueur a réagi : 🔥]'), head: P.includes('= un emoji que le joueur a posé sur ce message') }; }, { id: gr, ng });
  check('in a group too: 🔥 on Ada’s message, and the group’s AI reads it', grp.r === '🔥' && grp.told && grp.head, grp);
  await clear(page);

  // ---------- likes: a comment, a post ----------
  const lp = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    const p = H.addAmbientPost(g, { by: 'leandre.aube', text: 'Le conseil a voté. Je suis président.' }, t - 120000);
    const r = H.addReplyTo(g, p, { by: 'ada.quill', text: 'Félicitations, président.' }, t - 60000);
    H.openPost(p.id);
    return { p: p.id, r: r.id };
  });
  await page.waitForSelector('#r-' + lp.r);
  await page.click(`#r-${lp.r} .act-like`);
  await sleep(250);
  const lk = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, p = g.posts.find((x) => x.id === a.p), r = p.replies.find((x) => x.id === a.r), A = H.charByHandle(g, 'ada.quill');
    return { liked: r.liked, at: r.likedAt > 0, mine: (A.likes || []).map((l) => [l.k, l.on, l.text]), thread: H.threadLines(g, p).find((x) => x.includes('Félicitations')) || '',
      net: (H.ctxText(g).match(/le joueur a aimé son commentaire « Félicitations, président\. » sous le post de @leandre\.aube/) || [''])[0],
      dm: (H.promptDM(g, A, [], 'salut').match(/Depuis leur dernier échange, le joueur a aimé son commentaire « Félicitations, président\. » sous le post de @leandre\.aube : Ada Quill l’a vu\./) || [''])[0] };
  }, lp);
  check('a comment liked: Ada knows (in private: since they last wrote; on the network), and under the post it shows',
    lk.liked && lk.at && JSON.stringify(lk.mine) === JSON.stringify([['reply', 'leandre.aube', 'Félicitations, président.']]) && /Félicitations, président\. \[aimé par le joueur\]$/.test(lk.thread) && !!lk.net && !!lk.dm, lk);
  await page.click(`#r-${lp.r} .act-like`);
  await sleep(250);
  const unl = await G(page, (a) => { const H = window.__hype, g = H.S.game, p = g.posts.find((x) => x.id === a.p), r = p.replies.find((x) => x.id === a.r), A = H.charByHandle(g, 'ada.quill'); return { liked: !!r.liked, mine: (A.likes || []).length, thread: H.threadLines(g, p).find((x) => x.includes('Félicitations')) }; }, lp);
  check('unliked: it is gone (for her, and under the post)', !unl.liked && unl.mine === 0 && !/aimé par le joueur/.test(unl.thread), unl);
  const pl = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, p = g.posts.find((x) => x.id === a.p), L = H.charByHandle(g, 'leandre.aube');
    H.toggleLike(p);
    return { at: p.likedAt > 0, mine: (L.likes || []).map((l) => [l.k, l.text]), feed: /@leandre\.aube : Le conseil a voté\. Je suis président\.[^\n]*\[aimé par le joueur\]/.test(H.ctxText(g)), dm: /le joueur a aimé son post « Le conseil a voté\. Je suis président\. »/.test(H.promptDM(g, L, [], 'bravo')) };
  }, lp);
  check('a post liked: Léandre knows, and the feed shows it', pl.at && JSON.stringify(pl.mine) === JSON.stringify([['post', 'Le conseil a voté. Je suis président.']]) && pl.feed && pl.dm, pl);
  await clear(page);

  // ---------- a comment pinned under the player's post ----------
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.goTab('feed'); H.openCompose(); H.update(); });
  await page.waitForSelector('#compose');
  await page.fill('#compose', 'Mon premier tuto de potion est en ligne !');
  await page.locator('.layer-head button', { hasText: 'Publier' }).first().click();
  await idle(page);
  await sleep(800);
  await dismiss(page);
  const pp = await G(page, () => {
    const H = window.__hype, g = H.S.game, p = g.posts.find((x) => x.a === 'p' && /premier tuto/.test(x.text));
    const r1 = H.addReplyTo(g, p, { by: 'ada.quill', text: 'Très clair, merci pour le tuto.' }, Date.now() - 20000);
    const r2 = H.addReplyTo(g, p, { by: 'leandre.aube', text: 'Pas mal, pour une débutante.' }, Date.now() - 10000);
    H.S.stack = []; H.openPost(p.id);
    return { p: p.id, r1: r1.id, r2: r2.id };
  });
  await page.waitForSelector(`#r-${pp.r1} .act-pin`);
  await page.click(`#r-${pp.r1} .act-pin`);
  await sleep(300);
  const pin = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, p = g.posts.find((x) => x.id === a.p), A = H.charByHandle(g, 'ada.quill');
    return { pin: p.pin === a.r1, mine: (A.likes || []).filter((l) => l.k === 'pin').map((l) => l.text), mem: A.mem.some((m) => m.t === 'le joueur a épinglé mon commentaire « Très clair, merci pour le tuto. » en haut de son post'),
      thread: H.threadLines(g, p).find((x) => x.includes('Très clair')) || '', feed: H.ctxText(g).includes('[le joueur a épinglé le commentaire de @ada.quill : « Très clair, merci pour le tuto. »]'),
      net: H.ctxText(g).includes('le joueur a épinglé son commentaire « Très clair, merci pour le tuto. » en haut de son post'),
      dm: H.promptDM(g, A, [], 'merci !').includes('le joueur a épinglé son commentaire « Très clair, merci pour le tuto. » en haut de son post') };
  }, pp);
  check('a comment pinned: Ada knows which one (her memory, in private, on the network), the thread and the feed show it',
    pin.pin && JSON.stringify(pin.mine) === JSON.stringify(['Très clair, merci pour le tuto.']) && pin.mem && /\[épinglé en haut par le joueur\]/.test(pin.thread) && pin.feed && pin.net && pin.dm, pin);
  await page.click(`#r-${pp.r2} .act-pin`);
  await sleep(300);
  const pin2 = await G(page, (a) => { const H = window.__hype, g = H.S.game, p = g.posts.find((x) => x.id === a.p); return { pin: p.pin === a.r2, ada: (H.charByHandle(g, 'ada.quill').likes || []).filter((l) => l.k === 'pin').length, leandre: (H.charByHandle(g, 'leandre.aube').likes || []).filter((l) => l.k === 'pin').length }; }, pp);
  check('another comment pinned in its place: Léandre’s now, Ada’s pin is no longer said', pin2.pin && pin2.ada === 0 && pin2.leandre === 1, pin2);
  await clear(page);

  // ---------- a level-up once every planned character is there: someone new, by themselves ----------
  const lv = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    for (const c of H.mains(g, false)) c.unlocked = true;
    H.S.modals.length = 0;
    const n = H.mains(g, false).length;
    g.stats.level++;
    H.levelUp(g);
    H.update();
    return { n, owed: g.castOwed, modal: H.S.modals.some((m) => m.t === 'level' && m.auto && !m.charId) };
  });
  await page.waitForSelector('.modal .lv-coming', { timeout: 6000 });
  const coming = await G(page, () => ({ text: document.querySelector('.modal .lv-coming').textContent, btn: [...document.querySelectorAll('.modal button')].map((b) => b.textContent) }));
  await page.waitForSelector('.modal .modal-char', { timeout: 25000 });
  await idle(page);
  const came = await G(page, (n) => { const H = window.__hype, g = H.S.game; return { n: H.mains(g, false).length - n, owed: g.castOwed, card: (document.querySelector('.modal .modal-char') || {}).textContent || '' }; }, lv.n);
  await shot(page, 'level-newcomer');
  check('a level-up with every planned character there: no question, someone new comes by themselves (the AI), shown in the level card',
    lv.owed === 1 && lv.modal && /Quelqu’un de nouveau/.test(coming.text) && !coming.btn.some((b) => /Faire venir/.test(b)) && came.n === 1 && came.owed === 0 && came.card.length > 3, { lv, coming, came });
  await dismiss(page);

  // ---------- more than three dates: no limit; every one in the AI's context ----------
  const dt = await G(page, () => {
    const H = window.__hype, g = H.S.game, hs = H.mains(g, false).filter((c) => c.unlocked && !c.cut).map((c) => c.handle);
    g.events = [];
    const pub = [];
    for (let k = 0; k < 7; k++) pub.push(!!H.addEvent(g, { by: hs[k % hs.length], kind: 'live', what: `grand live numéro ${k + 1} sur les potions`, in: 600 + k * 300 }));
    const made = [];
    for (let k = 0; k < 7; k++) made.push(!!H.addEvent(g, { by: hs[k % hs.length], kind: 'rdv', what: `un verre numéro ${k + 1} au café des maisons`, in: 90 + k * 240 }));
    const C = H.ctxText(g);
    return { pub: pub.filter(Boolean).length, made: made.filter(Boolean).length, dates: H.activeEvents(g).filter((e) => e.player).length, told: [1, 2, 3, 4, 5, 6, 7].every((k) => C.includes(`un verre numéro ${k} au café des maisons`)) };
  });
  check('seven dates with the player, on top of six events of others: none refused, and the AI knows all seven', dt.pub === 6 && dt.made === 7 && dt.dates === 7 && dt.told, dt);
  const two = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'leandre.aube');
    g.events = g.events.filter((e) => e.c !== c.id);
    H.addEvent(g, { by: 'leandre.aube', kind: 'rdv', what: 'une balade dans les jardins', in: 300 });
    H.addEvent(g, { by: 'leandre.aube', kind: 'rdv', what: 'un dîner au restaurant du lac', in: 2880 }); // (a second one with him, another day)
    const P = H.promptDM(g, c, [], 'on se voit quand ?');
    return { first: /Rendez-vous prévu entre eux : « une balade dans les jardins »/.test(P), others: /Autres rendez-vous déjà prévus entre eux : « un dîner au restaurant du lac »/.test(P) };
  });
  check('two dates with the same person: their AI knows both', two.first && two.others, two);
  // a feat behind another release: its time is called out, and it can be shot
  const ft = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now(), c = H.charByHandle(g, 'ada.quill');
    for (const r of g.releases) if (r.state === 'scheduled') r.state = 'dropped';
    g.events = [];
    const solo = H.scheduleRelease(g, { what: 'short', topic: 'ma potion du matin', due: t + 3 * 3600000 });
    const feat = H.scheduleRelease(g, { what: 'short', topic: 'notre duo de potions', due: t + 4 * 3600000, start: true });
    feat.collab = c.id;
    solo.due = t - 60000; solo.dueSaid = true; // (overdue, on the clock first)
    feat.due = t - 1000; // (its time has come, while the other waits)
    H.update();
    return { solo: solo.id, feat: feat.id, first: H.activeRelease(g).id === solo.id };
  });
  await sleep(2500);
  const fc = await G(page, (a) => { const H = window.__hype, g = H.S.game; return { notif: g.notifs.some((n) => n.k === 'releasedue' && /C’est l’heure de retrouver Ada Quill pour tourner ton short « notre duo de potions »/.test(n.text)), toast: H.S.toasts.some((x) => /Ada t’attend pour tourner/.test(x.text) && x.action && /Tourner/.test(x.action.label)) }; }, ft);
  await G(page, () => { const H = window.__hype; H.S.toasts.length = 0; H.S.stack = []; H.S.modals.length = 0; H.goTab('studio'); H.update(); });
  await page.waitForSelector('.plan-row');
  const rows = await G(page, () => [...document.querySelectorAll('.plan-row')].map((r) => ({ t: r.querySelector('.mid b').textContent, can: [...r.querySelectorAll('button')].some((b) => /Tourner/.test(b.textContent)), wait: /après la précédente/.test(r.textContent) })));
  check('a feat whose time has come, behind another release: the player is told (Ada waits) and can shoot it right away',
    ft.first && fc.notif && fc.toast && rows.some((x) => /notre duo de potions/.test(x.t) && x.can && !x.wait), { fc, rows });
  await shot(page, 'feat-due');
  await clear(page);

  // ---------- on a phone: a long press, a double tap ----------
  const { page: ph } = await newPage(browser, { width: 390, height: 844 }, true);
  await newGame(ph);
  const p1 = await incoming(ph, 'leandre.aube', 'Tu dors ?', 90000);
  const p2 = await incoming(ph, 'leandre.aube', 'Moi non plus 🌙', 30000);
  await G(ph, () => { const H = window.__hype; H.openDM(H.charByHandle(H.S.game, 'leandre.aube').id); });
  await ph.waitForSelector('.layer .react-wrap');
  const hidden = await G(ph, () => getComputedStyle(document.querySelector('.layer .react-wrap .react-btn')).display);
  await touchAt(ph, '.layer .react-wrap .bubble', 0, 'pointerdown');
  await sleep(650);
  await touchAt(ph, '.layer .react-wrap .bubble', 0, 'pointerup');
  await sleep(200);
  const lp1 = await G(ph, () => { const p = document.querySelector('.layer .react-pick'); if (!p) return null; const b = p.getBoundingClientRect(); return { left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), vw: innerWidth }; });
  await shot(ph, 'phone-picker');
  await overflowCheck(ph, 'reaction picker (390 px)');
  check('on a phone: no hover button; a long press opens the reactions, inside the screen', hidden === 'none' && !!lp1 && lp1.left >= 0 && lp1.right <= lp1.vw && lp1.top >= 0, { hidden, lp1 });
  await ph.locator('.layer .react-pick button[aria-label="Wouah"]').tap();
  await sleep(250);
  for (let k = 0; k < 2; k++) { await touchAt(ph, '.layer .react-wrap .bubble', 1, 'pointerdown'); await sleep(40); await touchAt(ph, '.layer .react-wrap .bubble', 1, 'pointerup'); await sleep(110); }
  await sleep(250);
  const t1 = await msgOf(ph, 'leandre.aube', p1), t2 = await msgOf(ph, 'leandre.aube', p2);
  await shot(ph, 'phone-badges');
  check('picked on the phone (😮), and a double tap puts a ❤️', t1.r === '😮' && t2.r === '❤️', { t1, t2 });

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
