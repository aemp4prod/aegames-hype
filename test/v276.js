// 0.27.6 end to end, in Chromium against the built hype.html with the mocked Claude runtime: the hidden menu, in tabs.
// - six tabs (money, reputation, time, mini-games, skills, ties), one panel at a time, the last one remembered;
// - the mini-games: any of the ten at any level, played now for practice (nothing counts in the game), or imposed on the
//   next shoot (once); Cauchemar is the real quiz only.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v276.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v276');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(path.join(ROOT, 'hype.html'), 'utf8');
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
  await newGame(page, 'Une créatrice qui touche à tout');
  await G(page, () => { window.__hypeNoGearEvent = true; window.__hypeEasyGear = true; const g = window.__hype.S.game; g.career.cash = 1234; });

  // ---------- the tabs ----------
  await G(page, () => window.__hype.openMenu());
  await page.waitForSelector('.layer .menu-tabs');
  const tabs = await page.$$eval('.layer .menu-tab', (els) => els.map((e) => e.textContent.trim()));
  const first = await page.textContent('.layer .layer-panel');
  await page.locator('.layer .menu-tab', { hasText: 'Mini-jeux' }).click();
  await page.waitForSelector('.layer .tr-chips');
  const games = await page.$$eval('.layer section.section .field:first-child .chip-btn', (els) => els.map((e) => e.textContent.trim()));
  const diffs = await page.$$eval('.layer section.section .field:nth-child(2) .chip-btn', (els) => els.map((e) => ({ t: e.textContent.trim(), off: e.disabled })));
  await shot(page, 'menu-minigames');
  check('the menu in six tabs, one panel at a time (money first); the mini-games tab: the ten games, the seven levels, Cauchemar for the quiz only',
    tabs.join('|') === '💰Argent|⭐Réputation|🕐Temps|🎮Mini-jeux|💪Compétences|💞Relations' && /Argent \(/.test(first) && !/Le mini-jeu/.test(first)
      && games.length === 10 && games.includes('Coupe au rythme') && games.includes('Recadrage') && diffs.length === 7 && diffs[6].off === false && /Cauchemar/.test(diffs[6].t), { tabs, games, diffs });
  await page.locator('.layer .chip-btn', { hasText: 'Mémoire' }).click();
  const offC = await page.$$eval('.layer section.section .field:nth-child(2) .chip-btn', (els) => els[6].disabled);
  // ---------- a practice round: the chat of a live, in Mythique, played by a bot ----------
  await page.locator('.layer .chip-btn', { hasText: 'Chat d’un live' }).click();
  await page.locator('.layer .chip-btn', { hasText: 'Mythique' }).click();
  const before = await G(page, () => { const g = window.__hype.S.game; return { cash: g.career.cash, fol: g.stats.followers, rel: g.releases.length, rep: g.stats.reputation }; });
  await page.locator('.layer button', { hasText: 'Jouer maintenant' }).click();
  await page.waitForSelector('.layer .mg-intro', { timeout: 8000 });
  const intro = await page.textContent('.layer .mg-intro');
  await page.locator('.layer .mg-intro button', { hasText: 'parti' }).click();
  await page.waitForSelector('.layer .chat-box', { timeout: 5000 });
  await G(page, () => { window.__chatBot = setInterval(() => { for (const b of document.querySelectorAll('.layer .chat-msg[data-bad="1"] .chat-del')) b.click(); }, 120); });
  await page.waitForSelector('.layer .practice-end', { timeout: 60000 });
  await G(page, () => clearInterval(window.__chatBot));
  const end = await page.textContent('.layer .practice-end');
  await shot(page, 'practice-end');
  const after = await G(page, () => { const H = window.__hype, g = H.S.game; return { cash: g.career.cash, fol: g.stats.followers, rel: g.releases.length, rep: g.stats.reputation, score: H.S.practice && H.S.practice.score }; });
  check('« Jouer maintenant »: a practice round of the chosen game at the chosen level (the chat of a live, Mythique); its score at the end, and nothing changes in the game (money, followers, releases, reputation)',
    offC === true && /Modère le chat/.test(intro) && /Mythique/.test(intro) && /Entraînement/.test(intro) && after.score >= 0.9 && /\d+ % · réussi/.test(end) && /Rejouer/.test(end)
      && after.cash === before.cash && after.fol === before.fol && after.rel === before.rel && after.rep === before.rep, { intro: intro.slice(0, 160), end, before, after });
  // an AI-written one: the quiz, written then played
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.startPractice(H.S.game, 'quiz', 'expert'); });
  await page.waitForSelector('.layer .mg-intro', { timeout: 15000 });
  await page.locator('.layer .mg-intro button', { hasText: 'parti' }).click();
  for (let k = 0; k < 8; k++) {
    if (await page.$('.layer .practice-end')) break;
    await page.waitForSelector('.layer .mg-opts .mg-opt:not([disabled]), .layer .practice-end', { timeout: 20000 });
    if (await page.$('.layer .practice-end')) break;
    await page.locator('.layer .mg-opts .mg-opt').first().click().catch(() => {});
    await sleep(1600);
  }
  await page.waitForSelector('.layer .practice-end', { timeout: 30000 });
  const q = await G(page, () => { const H = window.__hype, r = H.S.practice; return { kind: r.game.kind, diff: r.game.diff, score: r.score, prompt: (window.__prompts.filter((p) => /LE MINI-JEU DU TOURNAGE/.test(p)).slice(-1)[0] || '').includes('"t":"game","kind":"quiz"') }; });
  check('an AI-written game for practice (the quiz, Expert): written on the subject, imposed format, played to the end, a score', q.kind === 'quiz' && q.diff === 'expert' && q.score >= 0 && q.score <= 1 && q.prompt, q);

  // ---------- imposed on the next shoot, once ----------
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.openMenu(); });
  await page.waitForSelector('.layer .menu-tabs');
  const remembered = await page.$eval('.layer .menu-tab.on', (e) => e.textContent.trim());
  await page.locator('.layer .chip-btn', { hasText: 'Mémoire' }).click();
  await page.locator('.layer button', { hasText: 'Imposer au prochain tournage' }).click();
  const imp = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = { set: g.mgNext };
    for (const x of g.releases) if (x.state === 'scheduled') x.state = 'dropped';
    const r = H.scheduleRelease(g, { what: 'vidéo', topic: 'les potions de Lumen', due: Date.now() + 60000 });
    r.due = Date.now() - 1000; r.diff = 'difficile'; r.devis = { total: 0, items: [], topic: r.topic, at: Date.now() };
    H.genShoot(r);
    out.kind = r.game && r.game.kind; out.after = g.mgNext || null;
    const r2 = H.scheduleRelease(g, { what: 'vidéo', topic: 'la suite', due: Date.now() + 60000 });
    out.next = H.pickShootKind(g, r2) !== undefined && !g.mgNext;
    return out;
  });
  check('« Imposer au prochain tournage »: the menu remembers its tab; the next shoot gets that game (the memory), once, then the draw again', remembered === '🎮Mini-jeux' && imp.set === 'memoire' && imp.kind === 'memoire' && imp.after === null && imp.next, Object.assign({ remembered }, imp));

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  console.log(`\n${checks.filter((c) => c[0] === 'PASS').length}/${checks.length} PASS`);
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
