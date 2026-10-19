// 0.27.9 end to end, in Chromium against the built hype.html with the mocked Claude runtime: windows that behave like
// windows.
// - a floating window wears Hype's own bar (its logo, reduce, back to the middle, close), not a copy of the system's;
// - it goes anywhere: down to its bar at the bottom of the screen (before, a tall window could hardly move), partly off
//   the sides; it resizes by its edges (right, left, bottom, the corners), not only its corner;
// - a name or an avatar in the bar moves it too, and the click a drag ends with opens nothing;
// - windows float from 720 pixels of width (a small laptop, an app zoomed in), not only from 900.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v2709.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v2709');
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
async function dismiss(page) { for (let k = 0; k < 6 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }
const NB = ' ';
const txt = (page, sel) => G(page, (s) => { const el = document.querySelector(s); return el ? el.textContent : ''; }, sel);

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

const rectOf = (page, sel) => G(page, (s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; }, sel);
async function dragFrom(page, x, y, dx, dy) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let k = 1; k <= 8; k++) await page.mouse.move(x + (dx * k) / 8, y + (dy * k) / 8);
  await page.mouse.up();
  await sleep(300);
}

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 800 });
  await newGame(page, 'Une créatrice qui teste des potions');
  await G(page, () => { window.__hypeNoGearEvent = true; window.__hypeEasyGear = true; });

  // ---------- a conversation, moved by its name: it floats, wears Hype's bar; the drag opened no profile ----------
  const cid = await G(page, () => { const H = window.__hype, c = H.charByHandle(H.S.game, 'theo.marlin'); H.S.stack = []; H.openDM(c.id); return c.id; });
  await page.waitForSelector('.layer .layer-head .who');
  await sleep(400);
  const who = await rectOf(page, '.layer .layer-head .who');
  await dragFrom(page, who.x + 30, who.y + who.h / 2, 260, 20);
  const f1 = await G(page, () => { const L = document.querySelector('.layer.float'), H = window.__hype; return { float: !!L, bar: !!(L && L.querySelector('.layer-head.hypebar .hb-logo')), btns: L ? [...L.querySelectorAll('.layer-head .win-btn')].map((b) => b.getAttribute('aria-label')) : [], stack: H.S.stack.map((l) => l.t) }; });
  await shot(page, 'float-bar');
  check('a conversation dragged by its name floats, without opening the profile; its bar is Hype’s (the logo; reduce, back to the middle, close)',
    f1.float && f1.bar && f1.btns.includes('Réduire la fenêtre') && f1.btns.includes('Remettre la fenêtre au centre') && f1.btns.includes('Fermer la fenêtre') && f1.stack.join(',') === 'dm', f1);

  // ---------- anywhere: down to its bar at the bottom ----------
  const r1 = await rectOf(page, '.layer.float .layer-panel');
  const bar = await rectOf(page, '.layer.float .layer-head h2, .layer.float .layer-head .hb-logo');
  await dragFrom(page, bar.x + 10, bar.y + bar.h / 2, 0, 800);
  const r2 = await rectOf(page, '.layer.float .layer-panel');
  check('a tall window goes anywhere: down until only its bar shows (before, it could hardly move)', r2.y > r1.y + 500 && r2.y <= 800 - 44 && r2.y >= 800 - 44 - 2, { r1, r2 });
  const b2 = await rectOf(page, '.layer.float .layer-head .win-btns'); // (grabbed beside its buttons: a toast may sit in the middle of the bottom)
  await dragFrom(page, b2.x - 30, b2.y + b2.h / 2, 0, -640);

  // ---------- resized by its edges ----------
  const r3 = await rectOf(page, '.layer.float .layer-panel');
  await dragFrom(page, r3.x + 3, r3.y + r3.h / 2, -120, 0);
  const r4 = await rectOf(page, '.layer.float .layer-panel');
  await dragFrom(page, r4.x + r4.w / 2, r4.y + r4.h - 3, 0, -100);
  const r5 = await rectOf(page, '.layer.float .layer-panel');
  await dragFrom(page, r5.x + r5.w - 3, r5.y + r5.h / 2, -60, 0);
  const r6 = await rectOf(page, '.layer.float .layer-panel');
  await shot(page, 'float-resized');
  check('it resizes by its edges: the left one (wider, its right side still), the bottom one, the right one',
    Math.abs(r4.w - (r3.w + 120)) <= 4 && Math.abs(r4.x - (r3.x - 120)) <= 4 && Math.abs((r4.x + r4.w) - (r3.x + r3.w)) <= 4 && Math.abs(r5.h - (r4.h - 100)) <= 4 && Math.abs(r6.w - (r5.w - 60)) <= 4, { r3, r4, r5, r6 });

  // ---------- its ✕ closes it ----------
  await page.click('.layer.float .win-close');
  await sleep(300);
  const shut = await G(page, (id) => ({ open: window.__hype.S.stack.some((l) => l.t === 'dm' && l.id === id), read: window.__hype.S.game.dms[id].readAt > 0 }), cid);
  check('its ✕ closes it (the conversation read)', !shut.open && shut.read, shut);

  // ---------- floating from 720 pixels; on a phone, still « Réduire » only ----------
  await page.setViewportSize({ width: 760, height: 800 });
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.openLayer({ t: 'series', id: 'single' }); });
  await page.waitForSelector('.layer .layer-head');
  await sleep(300);
  const narrow = await G(page, () => ({ float: !!document.querySelector('.layer .win-float'), movable: !!document.querySelector('.layer .layer-head.movable') }));
  await page.setViewportSize({ width: 390, height: 800 });
  await sleep(300);
  const phone = await G(page, () => ({ float: !!document.querySelector('.layer .win-float'), min: !!document.querySelector('.layer .win-min') }));
  check('windows float from 720 pixels of width (a small laptop, an app zoomed in); on a phone, « Réduire » only', narrow.float && narrow.movable && !phone.float && phone.min, { narrow, phone });

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  console.log(`\n${checks.filter((c) => c[0] === 'PASS').length}/${checks.length} PASS`);
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
