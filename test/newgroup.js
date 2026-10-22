// 0.31.1, in Chromium against the built hype.html with the mocked Claude runtime: the player starts a group chat.
// - Messages: « Nouveau groupe » beside the groups (from two characters to write to);
// - the form: a name, an emoji, 2 to 5 of the cast (no more), the first message; someone who blocked the player is not there;
// - created: the group (« Tu as créé le groupe »), the first message, their AIs answer it (told the player just made it,
//   who is in it, and that someone who does not want to be in it may leave at once); one leaves: said;
// - everybody leaves: the group ends; four groups at most; on a phone.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/newgroup.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-newgroup');
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
async function shot(page, name) { await page.evaluate(() => { const H = window.__hype; if (H && H.S) { H.S.toasts.length = 0; H.update(); } }); await sleep(150); shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
const G = (page, fn, arg) => page.evaluate(fn, arg);
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.dms || b.story || b.groups); })) await sleep(150); await sleep(300); };
async function dismiss(page) { for (let k = 0; k < 8 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }
const clear = (page) => G(page, () => { const H = window.__hype; H.S.stack = []; H.S.modals.length = 0; H.S.toasts.length = 0; H.S.storyView = null; H.update(); });
const txt = (page, sel) => G(page, (s) => { const el = document.querySelector(s); if (!el) return ''; const c = el.cloneNode(true); for (const i of c.querySelectorAll('img.emo')) i.replaceWith(i.alt); return c.textContent.replace(/\s+/g, ' ').trim(); }, sel);
const overflow = (page, sel) => G(page, (s) => { const w = window.innerWidth, out = []; for (const el of document.querySelectorAll(s + ' *')) { const r = el.getBoundingClientRect(); if (r.width && (r.right > w + 1 || r.left < -1)) out.push(el.className || el.tagName); } return out.slice(0, 4); }, sel);

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
}

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);
  const ids = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    const set = (h, rel) => { const c = H.charByHandle(g, h); Object.assign(c, { unlocked: true, asleep: undefined, rel, cool: null }); return c.id; };
    const out = { theo: set('theo.marlin', 50), leandre: set('leandre.aube', 30), nox: set('nox.ombre', 20), zara: set('zara.vey', -10), iris: set('prof.gallant', 10) };
    const z = g.chars[out.zara]; z.cool = { k: 'bloque', at: t, until: t + 3 * 86400000, insist: 0, ok: 0, why: 'tu as insisté' }; // (blocked: not offered)
    g.groups = [];
    return out;
  });

  // ---------- Messages: « Nouveau groupe »; the form ----------
  await clear(page);
  await G(page, () => window.__hype.goTab('dms'));
  await page.waitForSelector('.ng-open');
  const head = await txt(page, '.list-h');
  await shot(page, 'messages');
  await page.click('.ng-open');
  await page.waitForSelector('.layer .ng-form');
  const rows = await G(page, () => [...document.querySelectorAll('.layer .ng-row b')].map((b) => b.textContent));
  const off0 = await G(page, () => document.querySelector('.layer .ng-form .btn-hot').disabled);
  await page.fill('.layer .ng-form input.input', 'Les Potions du Jeudi');
  await page.locator('.layer .ng-form .chip-btn', { hasText: '🎉' }).click();
  await page.locator('.layer .ng-row', { hasText: 'Théo' }).locator('input').check();
  await page.fill('.layer .ng-form textarea', 'je vous ai réunis : soirée potions jeudi chez moi ?');
  const off1 = await G(page, () => document.querySelector('.layer .ng-form .btn-hot').disabled);
  await page.locator('.layer .ng-row', { hasText: 'Léandre' }).locator('input').check();
  const on2 = await G(page, () => !document.querySelector('.layer .ng-form .btn-hot').disabled);
  await shot(page, 'form');
  check('Messages: « Nouveau groupe » beside the groups; the form offers the cast one can write to (not someone who blocked the player); 2 at least, a name and a first message, before « Créer le groupe »',
    /Groupes/.test(head) && /Nouveau groupe/.test(head) && rows.some((x) => /Théo/.test(x)) && rows.some((x) => /Nox/.test(x)) && !rows.some((x) => /Zara/.test(x)) && off0 && off1 && on2, { head, rows, off0, off1, on2 });

  // ---------- created: their AIs answer the first message; one leaves at once ----------
  await G(page, () => { window.__mockOnce = [{ has: '## LE GROUPE DE DISCUSSION', lines: [
    { t: 'msg', by: 'theo.marlin', text: 'JEUDI ?? je ramène les fioles 🧪' }, { t: 'msg', by: 'leandre.aube', text: 'Un groupe avec Théo. Charmant.' },
    { t: 'quit', by: 'leandre.aube', why: 'pas mon genre de soirée' }] }]; });
  const n0 = await G(page, () => window.__prompts.length);
  await page.locator('.layer .ng-form .btn-hot').click();
  await idle(page);
  await page.waitForSelector('.layer .gr-bubbles');
  for (let k = 0; k < 30 && !(await page.locator('.layer .gr-sys', { hasText: 'a quitté le groupe' }).count()); k++) await sleep(400); // (at the pace of typing)
  const made = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, gr = g.groups.find((x) => x.name === 'Les Potions du Jeudi');
    const pr = window.__prompts.slice(a.n0).find((x) => x.includes('## LE GROUPE DE DISCUSSION')) || '';
    return { gr: gr && { emoji: gr.emoji, mine: gr.mine, members: gr.members.map((id) => g.chars[id].handle), msgs: gr.msgs.map((m) => m.sys ? 'sys:' + m.sys : (m.a === 'p' ? 'p:' : 'c:') + m.text) }, told: /Le joueur vient de créer ce groupe et d’y ajouter @theo\.marlin, @leandre\.aube/.test(pr) && /peut le quitter tout de suite/.test(pr) && /\(le joueur a créé le groupe\)/.test(pr) };
  }, { n0 });
  const view = await txt(page, '.layer .gr-bubbles');
  await shot(page, 'group');
  check('created: the group (🎉, the player\'s), « Tu as créé le groupe », the first message; their AIs answer (told the player just made it, who is in it, that one may leave at once); Léandre leaves: said',
    made.gr && made.gr.emoji === '🎉' && made.gr.mine === 1 && made.gr.members.join() === 'theo.marlin' && made.gr.msgs[0] === 'sys:made' && made.gr.msgs[1] === 'p:je vous ai réunis : soirée potions jeudi chez moi ?' && made.told
      && /Tu as créé le groupe « Les Potions du Jeudi »/.test(view) && /JEUDI \?\? je ramène les fioles/.test(view) && /Léandre a quitté le groupe \(pas mon genre de soirée\)/.test(view), { made, view: view.slice(0, 300) });

  // ---------- everybody leaves: it ends; at most five picked; four groups at most ----------
  const lim = await G(page, async () => {
    const H = window.__hype, g = H.S.game, out = {};
    const gr = g.groups.find((x) => x.name === 'Les Potions du Jeudi');
    window.__mockOnce = [{ has: '## LE GROUPE DE DISCUSSION', lines: [{ t: 'msg', by: 'theo.marlin', text: 'bon. sans moi finalement' }, { t: 'quit', by: 'theo.marlin', why: 'trop de drama' }] }];
    await H.sendGroup(gr.id, 'bon, et toi Théo ?');
    out.ended = !!gr.left && gr.empty === 1 && !H.liveGroups(g).includes(gr);
    const all = H.groupCands(g).map((c) => c.id);
    out.n = all.length;
    out.six = H.createGroup(g, all.slice(0, 6), 'Trop de monde', '💬');
    out.one = H.createGroup(g, all.slice(0, 1), 'Tout seul', '💬');
    out.noName = H.createGroup(g, [H.charByHandle(g, 'theo.marlin').id, H.charByHandle(g, 'nox.ombre').id], 'x', '💬');
    for (let k = 0; k < 4; k++) H.createGroup(g, [H.charByHandle(g, 'theo.marlin').id, H.charByHandle(g, 'nox.ombre').id], 'Groupe ' + k, '💬');
    out.why = H.newGroupWhy(g);
    out.five = H.createGroup(g, [H.charByHandle(g, 'theo.marlin').id, H.charByHandle(g, 'nox.ombre').id], 'Groupe 5', '💬');
    return { ended: out.ended, n: out.n, six: out.six.ok, one: out.one.ok, oneWhy: out.one.why, noName: out.noName.why, why: out.why, five: out.five.ok, live: H.liveGroups(g).length };
  });
  check('everybody left: the group ends; 2 to 5 picked, a name; four groups at most (said why)',
    lim.ended && lim.n >= 6 && !lim.six && !lim.one && /de 2 à 5 persos/.test(lim.oneWhy) && /Donne un nom/.test(lim.noName) && /déjà dans 4 groupes/.test(lim.why) && !lim.five && lim.live === 4, lim);

  // ---------- 0.31.2: the contacts too: a brand writing for a talent, the talent and the player, negotiated together ----------
  const pro = await G(page, () => {
    const H = window.__hype, g = H.S.game, theo = H.charByHandle(g, 'theo.marlin');
    g.groups = [];
    theo.followers = 50000;
    H.askAgent(g, theo, { cut: 15 }); H.applyAgentLine(g, theo, { ok: true });
    const d = H.makeTalentOffer(g, theo, { brand: 'Philtre & Co', sector: 'boisson', product: 'ses potions énergisantes' });
    H.askTalentDeal(g, d);
    const b = g.chars[d.contact];
    return { id: d.id, b: b.id, bh: b.handle, bn: b.name, max: d.max, cands: H.groupCands(g).map((c) => c.handle) };
  });
  await clear(page);
  await G(page, () => window.__hype.goTab('dms'));
  await page.waitForSelector('.ng-open');
  await page.click('.ng-open');
  await page.waitForSelector('.layer .ng-form');
  const brandRow = await G(page, (bn) => { const r = [...document.querySelectorAll('.layer .ng-row')].find((x) => x.textContent.includes(bn)); return r ? r.textContent : ''; }, pro.bn);
  await page.fill('.layer .ng-form input.input', 'Deal Philtre');
  await page.locator('.layer .ng-row', { hasText: 'Théo' }).locator('input').check();
  await page.locator('.layer .ng-row', { hasText: pro.bn }).locator('input').check();
  await page.fill('.layer .ng-form textarea', 'On boucle le contrat de Théo ici, tous les trois ?');
  await G(page, (a) => { window.__mockOnce = [{ has: '## LE GROUPE DE DISCUSSION', lines: [
    { t: 'msg', by: a.bh, text: 'Avec plaisir ! On peut monter un peu pour Théo.' }, { t: 'tdeal', by: a.bh, fee: 99999 },
    { t: 'msg', by: 'theo.marlin', text: 'ça me va, on signe !' }, { t: 'partenariat', by: 'theo.marlin', ok: true, why: 'les potions, c’est moi' }] }]; }, pro);
  const n1 = await G(page, () => window.__prompts.length);
  await page.locator('.layer .ng-form .btn-hot').click();
  await idle(page);
  await sleep(2500);
  const deal = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, d = H.tdealOf(g, a.id), pr = window.__prompts.slice(a.n1).find((x) => x.includes('## LE GROUPE DE DISCUSSION')) || '';
    return { fee: d.fee, max: a.max, state: d.state, ctx: pr.includes('## LES CONTACTS DU GROUPE') && pr.includes('@' + a.bh) && /en tant qu’AGENT de @theo\.marlin/.test(pr), by: pr.includes(`"by":"${a.bh}"`), ans: /"t":"partenariat","by":"theo\.marlin"/.test(pr), talent: /Le joueur, son agent, lui transmet une proposition/.test(pr) };
  }, Object.assign({ n1 }, pro));
  await shot(page, 'group-brand');
  check('0.31.2: the contacts too (a brand the player talks with, its role under its name): the brand, the talent and the player in one group; the brand\'s offer and the talent\'s answer are told to the AI, its lines apply: the price raised (never above its maximum), signed',
    pro.cands.includes(pro.bh) && /Partenariats · Philtre & Co/.test(brandRow) && deal.ctx && deal.by && deal.ans && deal.talent && deal.fee === deal.max && deal.state === 'signed', { pro, brandRow, deal });

  // ---------- on a phone ----------
  await G(page, () => { const g = window.__hype.S.game; g.groups = g.groups.slice(0, 1); });
  await clear(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await G(page, () => window.__hype.goTab('dms'));
  await sleep(300);
  await G(page, () => window.__hype.openLayer({ t: 'newgroup' }));
  await page.waitForSelector('.layer .ng-form');
  await sleep(700);
  await page.locator('.layer .ng-row', { hasText: 'Théo' }).locator('input').check();
  const ph = await overflow(page, '.layer .ng-form');
  await shot(page, 'phone-form');
  check('on a phone (390): the form stays inside the screen', ph.length === 0, ph);

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
