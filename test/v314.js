// 0.31.4, in Chromium against the built hype.html with the mocked Claude runtime: the day of the game.
// - the clock of the strip says it (on a computer), the time sheet and the profile too (on a phone as well);
// - it follows the game's clock: the time skipped counts, the first day is day 1;
// - a game without its date of birth (very old) is on day 1, never day 0 or a wrong number.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v314.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v314');
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
async function dismiss(page) { for (let k = 0; k < 8 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }
async function overflowCheck(page, label) {
  const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth }));
  if (w.sw > w.cw + 1 || w.bw > w.cw + 1) errors.push(`[overflow] ${label}: ${JSON.stringify(w)}`);
}

async function newPage(browser, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 700, colorScheme: 'light' });
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
}
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);
  const born = await G(page, () => { const d = new Date(window.__hype.S.game.createdAt); return [d.getDate(), d.getMonth()]; });
  const startWord = `${born[0] === 1 ? '1er' : born[0]} ${MONTHS[born[1]]}`;

  // ---------- day 1 ----------
  const d1 = await G(page, () => { const b = document.querySelector('.clock-btn'); return { tag: (b.querySelector('.day-n') || {}).textContent || '', label: b.getAttribute('aria-label'), day: window.__hype.playDay(window.__hype.S.game) }; });
  check('a new game: day 1, said by the clock of the strip (and its label)', d1.day === 1 && d1.tag === '· jour 1' && /jour 1 de ta partie/.test(d1.label), d1);
  await G(page, () => window.__hype.goTab('profile'));
  await page.waitForSelector('.play-day');
  const p1 = await page.$eval('.play-day', (e) => e.textContent);
  check('the profile says it, with the day the game began', p1 === `📅 Jour 1 de ta partie, commencée le ${startWord}`, { p1, startWord });

  // ---------- three days later (time skipped) ----------
  await G(page, () => { const H = window.__hype; H.jumpClock(H.S.game, 3 * 86400000); H.update(); });
  await sleep(400);
  const d4 = await G(page, () => ({ tag: (document.querySelector('.clock-btn .day-n') || {}).textContent || '', prof: (document.querySelector('.play-day') || {}).textContent || '', day: window.__hype.playDay(window.__hype.S.game) }));
  check('three days skipped: day 4, in the strip and the profile', d4.day === 4 && d4.tag === '· jour 4' && d4.prof === `📅 Jour 4 de ta partie, commencée le ${startWord}`, d4);
  const strip = await G(page, () => { const b = document.querySelector('.clock-btn'), d = b.querySelectorAll('span'); return { w: Math.round(b.getBoundingClientRect().width), date: d[0].scrollWidth <= d[0].clientWidth + 1, text: b.textContent }; });
  await page.locator('.status-strip').screenshot({ path: path.join(OUT, 'strip.png') });
  check('on a computer the strip has room for the date and the day (nothing cut)', strip.date && /jour 4/.test(strip.text), strip);
  await page.click('.clock-btn');
  await page.waitForSelector('.modal .watch-day');
  const w4 = await page.$eval('.modal .watch-day', (e) => e.textContent);
  await shot(page, 'watch-day');
  check('the time sheet says it too', /^📅 Jour 4 de ta partie · /.test(w4), w4);
  await dismiss(page);

  // ---------- the edge cases ----------
  const edge = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const old = { clockOff: 0 }; // (a game from before its birth date was kept)
    const late = { createdAt: new Date(2026, 9, 20, 23, 50).getTime(), clockOff: 0 }; // 23:50 the first night
    const t = new Date(2026, 9, 21, 0, 10).getTime(); // twenty minutes later: the next calendar day
    const dst = { createdAt: new Date(2026, 9, 24, 12, 0).getTime(), clockOff: 0 }; // across the change of time (25 October)
    return { old: H.playDay(old), late: H.playDay(late, t), dst: H.playDay(dst, new Date(2026, 9, 26, 12, 0).getTime()), none: H.playDay(null), now: H.playDay(g) };
  });
  check('a game without its birth date: day 1; past midnight: day 2; across the change of time: the right day', edge.old === 1 && edge.late === 2 && edge.dst === 3 && edge.none === 1 && edge.now === 4, edge);

  // ---------- on a phone ----------
  const { page: ph } = await newPage(browser, { width: 390, height: 844 });
  await newGame(ph);
  const hid = await G(ph, () => { const e = document.querySelector('.clock-btn .day-n'); return e ? getComputedStyle(e).display : 'absent'; });
  await ph.click('.clock-btn');
  await ph.waitForSelector('.modal .watch-day');
  const wp = await ph.$eval('.modal .watch-day', (e) => e.textContent);
  await shot(ph, 'phone-watch');
  await overflowCheck(ph, 'watch (390 px)');
  await dismiss(ph);
  await G(ph, () => window.__hype.goTab('profile'));
  await ph.waitForSelector('.play-day');
  const pp = await ph.$eval('.play-day', (e) => e.textContent);
  await shot(ph, 'phone-profile');
  check('on a phone: the strip keeps its room (the day is in the time sheet and the profile)', hid === 'none' && /^📅 Jour 1 de ta partie · /.test(wp) && /^📅 Jour 1 de ta partie, commencée le /.test(pp), { hid, wp, pp });

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
