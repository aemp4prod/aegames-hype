// 0.27.2 end to end, in Chromium against the built hype.html with the mocked Claude runtime: the reframing's controls
// answer at once.
// - a press moves the frame right away (before the next frame), then it glides while held (1,1 widths a second);
// - two arrows held: the last one pressed wins, and letting go of the other never stops it; the window left, nothing
//   stays pressed;
// - a button held with the mouse keeps going even if the pointer slips off it, and stops when let go; the button lights up
//   while the frame moves that way (the keyboard too);
// - the frame and the subject move by transform.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v272.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v272');
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
// A release of this format, its shoot forced to this skill round, opened on its intro.
async function shootRound(page, what, kind, diff) {
  const id = await G(page, ([w, k, d]) => {
    const H = window.__hype, g = H.S.game;
    for (const x of g.releases) if (x.state === 'scheduled') x.state = 'dropped';
    g.career.platform = { live: 'twitch', short: 'tiktok', podcast: 'spotify', 'vidéo': 'youtube' }[w] || 'youtube'; // (the format exists there)
    window.__hypeEasyGear = true;
    const r = H.scheduleRelease(g, { what: w, topic: 'les potions de Lumen', due: Date.now() + 60000 });
    window.__hypeEasyGear = false;
    r.due = Date.now() - 1000; r.diff = d; r.devis = { total: 0, items: [], topic: r.topic, at: Date.now() };
    H.S.mgForce = k;
    H.genShoot(r);
    H.S.stack = []; H.openLayer({ t: 'minigame', id: r.id }); H.update();
    return r.id;
  }, [what, kind, diff]);
  await page.waitForSelector('.layer .mg-intro', { timeout: 8000 });
  return id;
}
const played = (page, id) => G(page, (x) => { const r = window.__hype.S.game.releases.find((y) => y.id === x); return r && r.played ? { what: r.what, kind: r.played.kind, score: r.played.score, tier: r.played.tier, got: r.game && r.game.run ? r.game.run.got : null } : null; }, id);

// In the page: the frame's left edge, in widths of the picture.
const POS = `(() => { const s = document.querySelector('.layer .frame-stage').getBoundingClientRect(), f = document.querySelector('.layer .frame-win').getBoundingClientRect(); return (f.left - s.left) / s.width; })`;
const key = (page, type, k) => G(page, ([t, kk]) => window.dispatchEvent(new KeyboardEvent(t, { key: kk, bubbles: true, cancelable: true })), [type, k]);
const pos = (page) => G(page, (P) => eval(P)(), POS);
// puts the frame's center at this share of the picture (a tap on the picture)
const place = (page, at) => G(page, (a) => { const s = document.querySelector('.layer .frame-stage'), b = s.getBoundingClientRect(); s.dispatchEvent(new PointerEvent('pointerdown', { clientX: b.left + a * b.width, clientY: b.top + 10, bubbles: true, pointerId: 9, buttons: 1 })); s.dispatchEvent(new PointerEvent('pointerup', { clientX: b.left + a * b.width, clientY: b.top + 10, bubbles: true, pointerId: 9 })); }, at);

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 860 });
  await newGame(page, 'Une streameuse qui touche à tout');
  await G(page, () => { window.__hypeNoGearEvent = true; window.__hype.S.game.career.cash = 5000; });
  const id = await shootRound(page, 'short', 'cadrage', 'moyen');
  const w = await G(page, (rid) => { const r = window.__hype.S.game.releases.find((y) => y.id === rid); r.game.roundMs = 60000; r.game.speed = 0.0001; r.game.turns = 0; return r.game.w; }, id); // (a long, still shot: only the frame moves)
  await page.locator('.layer .mg-intro button', { hasText: 'parti' }).click();
  await page.waitForSelector('.layer .frame-stage', { timeout: 5000 });
  await sleep(300);

  // ---------- drawn by transform; a press answers at once ----------
  const tf = await G(page, () => { const f = document.querySelector('.layer .frame-win'), s = document.querySelector('.layer .frame-subj'); return { f: f.style.transform, fl: f.style.left, s: s.style.transform, sl: s.style.left, rule: document.querySelector('.layer .mg-top') ? 1 : 0 }; });
  check('the frame and the subject are placed by transform (no layout at every frame)', /translate3d\(/.test(tf.f) && !tf.fl && /translate3d\(.*translateX\(-50%\)/.test(tf.s) && !tf.sl, tf);
  await place(page, 0.5);
  const now = await G(page, (P) => { const p = eval(P); const a = p(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })); const b = p(); window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true, cancelable: true })); return { a, b, step: b - a }; }, POS);
  check('a press moves the frame right away, before the next frame is drawn (a small step, 1,5 % of the picture)', now.step > 0.01 && now.step < 0.03, now);

  // ---------- held: it glides; the button lights up ----------
  await place(page, 0.5);
  const g0 = await pos(page);
  await key(page, 'keydown', 'ArrowLeft');
  await sleep(250);
  const lit = await G(page, () => [...document.querySelectorAll('.layer .frame-btns .btn')].map((b) => b.classList.contains('on')));
  await key(page, 'keyup', 'ArrowLeft');
  const g1 = await pos(page);
  await sleep(200);
  const g2 = await pos(page);
  const unlit = await G(page, () => [...document.querySelectorAll('.layer .frame-btns .btn')].some((b) => b.classList.contains('on')));
  check('held, the frame glides fast (1,1 widths a second), lights its button up, and stops as soon as the key is let go', g0 - g1 > 0.18 && g0 - g1 < 0.45 && Math.abs(g2 - g1) < 0.005 && lit[0] && !lit[1] && !unlit, { g0, g1, g2, lit, unlit });

  // ---------- two arrows: the last one pressed wins; letting go of the other never stops it ----------
  await place(page, 0.4);
  await key(page, 'keydown', 'ArrowLeft');
  await sleep(120);
  await key(page, 'keydown', 'ArrowRight');
  await sleep(60);
  await key(page, 'keyup', 'ArrowLeft');
  const r0 = await pos(page);
  await sleep(220);
  const r1 = await pos(page);
  await key(page, 'keyup', 'ArrowRight');
  check('left held, then right pressed, then left let go: the frame keeps going right (it stopped dead before)', r1 - r0 > 0.12, { r0, r1 });

  // ---------- the window left: nothing stays pressed ----------
  await place(page, 0.3);
  await key(page, 'keydown', 'ArrowRight');
  await sleep(80);
  await G(page, () => window.dispatchEvent(new Event('blur')));
  const b0 = await pos(page);
  await sleep(200);
  const b1 = await pos(page);
  check('the window left with an arrow held: the frame stops (no key stuck when coming back)', Math.abs(b1 - b0) < 0.005, { b0, b1 });

  // ---------- a button held with the mouse: it keeps going if the pointer slips off, stops when let go ----------
  await place(page, 0);
  const br = await page.locator('.layer .frame-btns .btn').nth(1).boundingBox();
  const m0 = await pos(page);
  await page.mouse.move(br.x + br.width / 2, br.y + br.height / 2);
  await page.mouse.down();
  await sleep(150);
  await page.mouse.move(br.x + br.width / 2, br.y - 160); // (off the button, still pressed)
  const m1 = await pos(page);
  await sleep(200);
  const m2 = await pos(page);
  const litM = await G(page, () => document.querySelectorAll('.layer .frame-btns .btn')[1].classList.contains('on'));
  await page.mouse.up();
  const m3 = await pos(page);
  await sleep(200);
  const m4 = await pos(page);
  await place(page, 0.3); // (the picture, ▶ held)
  await page.mouse.move(br.x + br.width / 2, br.y + br.height / 2);
  await page.mouse.down();
  await sleep(120);
  await shot(page, 'frame-held');
  await page.mouse.up();
  check('▶ held with the mouse: the frame goes at once, keeps going when the pointer slips off the button (lit), and stops when let go', m1 - m0 > 0.1 && m2 - m1 > 0.15 && litM && m3 < 0.6 && Math.abs(m4 - m3) < 0.005, { m0, m1, m2, m3, m4, litM, w });

  await browser.close();
  console.log('\nERRORS', errors.length ? errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`\n${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
