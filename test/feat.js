// A feat (0.29.1), in Chromium against the built hype.html with the mocked Claude runtime:
// - « Feat » ticked when programming a release: the release waits for their answer, their conversation opens with the
//   proposal ready (the topic, the day); their AI says yes ({"t":"feat"}): they are in it (the programme says so, the
//   upload screen has them, the shoot knows); or no: the release stays the player's, another can be asked later;
// - a feat agreed in their messages (« on fait un feat samedi ? »): a video in the Studio, not a date;
// - on a phone.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/feat.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-feat');
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
// A refresh whose answer carries the lines of the test (after the usual ones).
async function refresh(page, lines) {
  await G(page, (lines) => { const g = window.__hype.S.game; g.lastRefreshAt = 0; for (const p of g.posts) delete p.cd; window.__mockOnce = [{ has: 'Le joueur actualise son fil', add: true, lines }]; }, lines);
  await G(page, () => window.__hype.refreshFeed(0));
  await idle(page);
}
// Game time moves on (the timestamps go back, as the accelerator does).
const ahead = (page, ms) => G(page, (ms) => { const H = window.__hype; H.jumpClock(H.S.game, ms); H.update(); }, ms);

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);
  const txt = (sel) => G(page, (s) => [...document.querySelectorAll(s)].map((e) => e.textContent).join(' | '), sel);
  await G(page, () => {
    const H = window.__hype, g = H.S.game;
    window.__hypeEasyGear = true; // (no quote to ask for: the content is made with what the player has)
    for (const h of ['theo.marlin', 'leandre.aube']) { const c = H.charByHandle(g, h); c.unlocked = true; c.rel = 40; }
  });
  const ids = await G(page, () => { const H = window.__hype, g = H.S.game; return { theo: H.charByHandle(g, 'theo.marlin').id, leandre: H.charByHandle(g, 'leandre.aube').id }; });

  // ---------- « Feat » ticked when programming: the proposal, ready in their conversation ----------
  await clear(page);
  await G(page, () => window.__hype.openLayer({ t: 'series', id: 'single' }));
  await page.waitForSelector('.layer #se-theme');
  await page.fill('.layer #se-theme', 'je teste les potions du marché noir');
  await page.locator('.layer .tr-chips button', { hasText: 'Demain' }).first().click();
  await page.locator('.layer .field', { hasText: 'Feat (facultatif)' }).locator('button', { hasText: 'Théo' }).click();
  await sleep(300);
  const hint = await txt('.layer .field small');
  await shot(page, 'feat-form');
  await page.locator('.layer .mg-setup > button.btn-hot').click();
  await sleep(800);
  const asked = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, r = g.releases.filter((x) => x.state === 'scheduled').slice(-1)[0];
    return { rid: r && r.id, feat: r && r.feat, collab: r && r.collab, draft: H.S.drafts.dm[id] || '', dmOpen: H.S.stack.some((l) => l.t === 'dm' && l.id === id) };
  }, ids.theo);
  check('« Feat » ticked when programming: the release waits for their answer; their conversation opens with the proposal ready (the topic, the day)',
    /accepte ou refuse/.test(hint) && asked.feat && asked.feat.c === ids.theo && asked.feat.ok === null && !asked.collab && /feat/.test(asked.draft) && /marché noir/.test(asked.draft) && /demain/.test(asked.draft) && asked.dmOpen, { hint, asked });

  // ---------- their AI says yes: they are in it ----------
  await page.waitForSelector('.layer .reply-box textarea');
  const shown = await G(page, () => document.querySelector('.layer .reply-box textarea').value);
  await G(page, () => { window.__mockOnce = [{ has: 'te propose un FEAT', add: true, lines: [{ t: 'feat', ok: true, why: 'trop bonne idée' }] }]; });
  const n0 = await G(page, () => window.__prompts.length);
  await page.click('.layer .send');
  await idle(page);
  await sleep(2500);
  const yes = await G(page, ({ rid, id, n0 }) => {
    const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === rid);
    const pr = window.__prompts.slice(n0).find((p) => p.includes('te propose un FEAT')) || '';
    return { collab: r.collab === id, ok: r.feat && r.feat.ok, notif: g.notifs.some((n) => /est partant pour le feat/.test(n.text)), told: /\{"t":"feat"/.test(pr) && /je teste les potions du marché noir/.test(pr), mem: (g.chars[id].mem || []).some((m) => /ensemble/.test(m.t || m)), shoot: /Tourné en feat avec @theo\.marlin/.test(H.promptMiniGame(g, r)) };
  }, { rid: asked.rid, id: ids.theo, n0 });
  await clear(page);
  await G(page, () => window.__hype.goTab('studio'));
  await sleep(500);
  const row = await txt('.plan-row');
  await shot(page, 'feat-yes');
  check('the proposal sent as written; their AI says yes ({"t":"feat"}): they are in it (the programme says « en feat avec Théo », the shoot knows), the player is told',
    /marché noir/.test(shown) && yes.collab && yes.ok === true && yes.notif && yes.told && yes.mem && yes.shoot && /en feat avec Théo/.test(row), { yes, row });

  // ---------- later, from the programme: another release, asked to someone who says no ----------
  const r2 = await G(page, () => { const H = window.__hype, g = H.S.game; const r = H.scheduleRelease(g, { what: H.PLATFORMS[H.platformOf(g)].main, topic: 'mon top 5 des sorts ratés', due: Date.now() + 3 * 86400000 }); H.update(); return r.id; });
  await sleep(400);
  await page.locator('.plan-row', { hasText: 'sorts ratés' }).locator('button', { hasText: 'Feat' }).click();
  await page.waitForSelector('.layer .feat-list');
  const list = await txt('.layer .feat-pick b');
  await shot(page, 'feat-layer');
  await page.locator('.layer .feat-pick', { hasText: 'Léandre' }).click();
  await page.waitForSelector('.layer .reply-box textarea');
  await G(page, () => { window.__mockOnce = [{ has: 'te propose un FEAT', add: true, lines: [{ t: 'feat', ok: false, why: 'pas le temps cette semaine' }] }]; });
  await page.click('.layer .send');
  await idle(page);
  await sleep(2500);
  const no = await G(page, (rid) => { const g = window.__hype.S.game, r = g.releases.find((x) => x.id === rid); return { feat: r.feat, collab: r.collab, notif: g.notifs.some((n) => /ne fera pas le feat : « pas le temps cette semaine »/.test(n.text)) }; }, r2);
  await clear(page);
  await G(page, () => window.__hype.goTab('studio'));
  await sleep(400);
  const row2 = await G(page, () => { const el = [...document.querySelectorAll('.plan-row')].find((x) => /sorts ratés/.test(x.textContent)); return el ? el.textContent : ''; });
  check('later, from the programme (« 🤝 Feat »: who to ask, the closest first): a no keeps the release the player\'s, said with their reason; another can be asked',
    /Léandre/.test(list) && /Théo/.test(list) && !no.feat && !no.collab && no.notif && /🤝 Feat/.test(row2), { list, no, row2 });

  // ---------- a feat agreed in their messages: a video in the Studio, not a date ----------
  const before = await G(page, () => { const g = window.__hype.S.game; return { rel: g.releases.filter((x) => x.state === 'scheduled').length, ev: (g.events || []).length }; });
  await G(page, () => { window.__mockOnce = [{ has: 'on fait un feat samedi', lines: [{ t: 'msg', text: 'grave ! samedi 18h, on tourne ça chez moi' }, { t: 'rel', d: 2, why: 'un feat' }, { t: 'plan', kind: 'rdv', what: 'feat : nos potions préférées', day: 2, at: '18:00', collab: true }] }]; });
  const n1 = await G(page, () => window.__prompts.length);
  await G(page, (id) => window.__hype.sendDM(id, 'on fait un feat samedi à 18h ? une vidéo sur nos potions préférées'), ids.theo);
  await idle(page);
  await sleep(2000);
  const words = await G(page, ({ id, n1, before }) => {
    const H = window.__hype, g = H.S.game, sch = g.releases.filter((x) => x.state === 'scheduled');
    const r = sch.find((x) => x.collab === id && /potions préférées/.test(x.topic));
    const pr = window.__prompts.slice(n1).find((p) => p.includes('on fait un feat samedi')) || '';
    return { release: !!r, more: sch.length - before.rel, dates: (g.events || []).length - before.ev, offered: /"collab":true/.test(pr), notif: g.notifs.some((n) => /^🎬 Feat avec Théo/.test(n.text)) };
  }, { id: ids.theo, n1, before });
  check('a feat agreed in their messages (« on fait un feat samedi ? » « grave ! »): a video with them in the Studio, not a date',
    words.release && words.more === 1 && words.dates === 0 && words.offered && words.notif, words);

  // ---------- on a phone ----------
  await clear(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const r3 = await G(page, () => { const H = window.__hype, g = H.S.game; const r = H.scheduleRelease(g, { what: H.PLATFORMS[H.platformOf(g)].main, topic: 'un feat pour le téléphone', due: Date.now() + 4 * 86400000 }); return r ? r.id : null; });
  await G(page, (id) => window.__hype.openLayer({ t: 'feat', id }), r3);
  await page.waitForSelector('.layer .feat-list');
  await sleep(300);
  const ph = await G(page, () => { const out = []; if (document.documentElement.scrollWidth > 391) out.push('page ' + document.documentElement.scrollWidth); for (const el of document.querySelectorAll('.layer .feat-pick')) { const r = el.getBoundingClientRect(); if (r.right > 391) out.push('pick ' + Math.round(r.right)); } return out; });
  await shot(page, 'phone-feat');
  check('on a phone (390): the list of who to ask stays within the screen', ph.length === 0, ph);

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
