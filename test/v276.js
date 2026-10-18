// 0.27.6 end to end, in Chromium against the built hype.html with the mocked Claude runtime: the hidden menu.
// 0.27.9: the way a game trainer shows it: a banner, one column, submenus (money, reputation, time, mini-games, skills,
//   ties), driven by the keyboard (↑ ↓ ← → Entrée Retour) or by taps, every change applied at once;
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
  const key = async (k, n = 1) => { for (let j = 0; j < n; j++) { await page.keyboard.press(k); await sleep(60); } await sleep(120); };
  const menu = () => G(page, () => { const on = document.querySelector('.layer .tr-line.on'); return { sub: (document.querySelector('.layer .tr-sub') || {}).textContent || '', lines: [...document.querySelectorAll('.layer .tr-line')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()), on: on ? on.textContent.replace(/\s+/g, ' ').trim() : '', desc: (document.querySelector('.layer .tr-desc') || {}).textContent || '' }; });

  // ---------- the menu: a banner, one column, submenus, the keyboard ----------
  await G(page, () => window.__hype.openMenu());
  await page.waitForSelector('.layer .trainer');
  await G(page, () => { window.__hype.S.modals = []; window.__hype.update(); });
  await dismiss(page);
  const root = await menu();
  const banner = await G(page, () => (document.querySelector('.layer .tr-banner') || {}).textContent || '');
  await shot(page, 'menu-root');
  await key('ArrowDown', 3);
  const atGames = await menu();
  await key('Enter');
  const games = await menu();
  const opts = await G(page, () => { const H = window.__hype, g = H.S.game, L = H.menuLines(g, ['jeux']); return { kinds: L[0].opts.map((o) => o[1]), quiz: L[1].opts.length }; });
  await shot(page, 'menu-minigames');
  check('the menu as a game trainer draws it: a banner, « Menu principal » and the line number, six submenus and « Masquer »; ↓ moves the highlighted line, Entrée opens « Mini-jeux »: the game, the level, play now, impose',
    /hype/i.test(banner) && /mode menu/i.test(banner) && /Menu principal\s*1\/7/.test(root.sub) && root.lines.length === 7 && /^💰 ?Argent et abonnés/.test(root.lines[0]) && /Masquer le mode menu/.test(root.lines[6])
      && /Mini-jeux/.test(atGames.on) && /Mini-jeux\s*1\/4/.test(games.sub) && /^Mini-jeu/.test(games.lines[0]) && /^Difficulté/.test(games.lines[1]) && /^Jouer maintenant/.test(games.lines[2]) && /^Imposer au tournage/.test(games.lines[3])
      && opts.kinds.length === 10 && opts.kinds.includes('Coupe au rythme') && opts.kinds.includes('Recadrage vertical') && opts.quiz === 7, { root, atGames, games, opts });

  // ---------- a practice round: the chat of a live, in Mythique, played by a bot ----------
  for (let k = 0; k < 12 && !/Modération du chat/.test((await menu()).on); k++) await key('ArrowRight');
  const offC = await G(page, () => { const H = window.__hype; return H.menuLines(H.S.game, ['jeux'])[1].opts.length; });
  await key('ArrowDown');
  for (let k = 0; k < 8 && !/Mythique/.test((await menu()).on); k++) await key('ArrowRight');
  const before = await G(page, () => { const g = window.__hype.S.game; return { cash: g.career.cash, fol: g.stats.followers, rel: g.releases.length, rep: g.stats.reputation }; });
  await key('ArrowDown');
  await key('Enter');
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
  check('« Jouer maintenant »: a practice round of the chosen game at the chosen level (the chat of a live, Mythique; no Cauchemar for it); its score at the end, and nothing changes in the game (money, followers, releases, reputation)',
    offC === 6 && /Modère le chat/.test(intro) && /Mythique/.test(intro) && /Entraînement/.test(intro) && after.score >= 0.9 && /\d+\s% · réussi/.test(end) && /Rejouer/.test(end)
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
  await page.waitForSelector('.layer .trainer');
  const remembered = (await menu()).on;
  await key('Enter');
  for (let k = 0; k < 12 && !/Mémoire/.test((await menu()).on); k++) await key('ArrowRight');
  await key('ArrowDown', 3);
  await key('Enter');
  const tog = (await menu()).on;
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
  check('« Imposer au tournage »: the menu opens where it was left (the line « Mini-jeux »); « Oui » on the line, and the next shoot gets that game (the memory), once, then the draw again', /Mini-jeux/.test(remembered) && /Imposer au tournage.*Oui/.test(tog) && imp.set === 'memoire' && imp.kind === 'memoire' && imp.after === null && imp.next, Object.assign({ remembered }, imp));

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  console.log(`\n${checks.filter((c) => c[0] === 'PASS').length}/${checks.length} PASS`);
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
