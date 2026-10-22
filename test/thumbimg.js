// 0.31.1, in Chromium against the built hype.html with the mocked Claude runtime: a thumbnail made of the player's own
// images, and a short's cover.
// - the thumbnail step: a third tab, « Tes images »: up to six images of the device; the layouts (a trio for three, side
//   by side, a grid), the canvas drawing each one in its cell; « Libre »: dragged where the player wants; an image zoomed
//   and reframed; a big word; what it is worth (+20 % for three images and two words); kept on the device, shown on the
//   upload screen and on the video once out;
// - a short: « Faire une couverture avec tes images » on the upload screen, upright; the preview, the short once out
//   (its card), a little more views than without;
// - on a phone.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/thumbimg.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-thumbimg');
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
const txt = (page, sel) => G(page, (s) => { const el = document.querySelector(s); if (!el) return ''; const c = el.cloneNode(true); for (const i of c.querySelectorAll('img.emo')) i.replaceWith(i.alt); return c.textContent.replace(/\s+/g, ' ').trim(); }, sel);
// The colour of the thumbnail at (fx, fy) (fractions of its canvas): which image is there.
const at = (page, sel, fx, fy) => G(page, (a) => { const c = document.querySelector(a.sel); const x = c.getContext('2d', { willReadFrequently: true }); const d = x.getImageData(Math.round(a.fx * (c.width - 1)), Math.round(a.fy * (c.height - 1)), 1, 1).data; return [d[0], d[1], d[2]]; }, { sel, fx, fy });
const near = (c, rgb, tol = 40) => Math.abs(c[0] - rgb[0]) + Math.abs(c[1] - rgb[1]) + Math.abs(c[2] - rgb[2]) <= tol;
const RED = [229, 57, 53], BLUE = [30, 136, 229], GREEN = [18, 185, 143], YELLOW = [255, 194, 26];

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
// Test images made in the page (PNG): plain colours, or two halves (to see a zoom and a reframing).
async function pngs(page, specs) {
  const out = await G(page, (specs) => specs.map((sp) => {
    const c = document.createElement('canvas'); c.width = sp.w; c.height = sp.h;
    const x = c.getContext('2d');
    x.fillStyle = sp.a; x.fillRect(0, 0, sp.w, sp.h);
    if (sp.b) { x.fillStyle = sp.b; x.fillRect(sp.w / 2, 0, sp.w / 2, sp.h); }
    return c.toDataURL('image/png').split(',')[1];
  }), specs);
  return out.map((b64, k) => ({ name: `image${k + 1}.png`, mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') }));
}
const setRange = (page, sel, v) => G(page, (a) => { const el = document.querySelector(a.sel); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, String(a.v)); el.dispatchEvent(new Event('input', { bubbles: true })); }, { sel, v });

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);
  const shot0 = (what, topic) => G(page, (a) => {
    const H = window.__hype, g = H.S.game;
    g.career.platform = 'youtube';
    g.releases = g.releases.filter((x) => x.state !== 'scheduled');
    const r = H.scheduleRelease(g, { what: a.what, topic: a.topic, due: Date.now() + 3600000 });
    H.finishShoot(r, 0.7);
    H.S.modals = []; H.S.stack = [];
    H.openLayer({ t: 'minigame', id: r.id });
    H.update();
    return r.id;
  }, { what, topic });

  // ---------- a video: the thumbnail of three images ----------
  const rid = await shot0('vidéo', 'Je teste trois potions interdites');
  await page.waitForSelector('.layer .edit-step', { timeout: 8000 });
  await page.locator('.layer .edit-step button', { hasText: 'Passer le montage' }).click();
  await page.waitForSelector('.layer .thumb-step', { timeout: 8000 });
  await page.locator('.layer .thumb-step [role=tab]', { hasText: 'Tes images' }).click();
  await page.waitForSelector('.layer .ph-cv');
  const files = await pngs(page, [{ w: 800, h: 600, a: '#E53935', b: '#1E88E5' }, { w: 600, h: 600, a: '#12B98F' }, { w: 600, h: 800, a: '#FFC21A' }]);
  await page.setInputFiles('.layer .ph-thumb input[type=file]', files);
  await page.waitForFunction(() => /3\/6/.test((document.querySelector('.layer .ph-tools') || {}).textContent || ''), null, { timeout: 8000 });
  await sleep(300);
  const C = '.layer .ph-cv';
  const trio = { big: await at(page, C, 0.12, 0.5), top: await at(page, C, 0.8, 0.25), bottom: await at(page, C, 0.8, 0.75) };
  const chips = await G(page, () => [...document.querySelectorAll('.layer .ph-thumb .field .tr-chips')][0].textContent);
  await shot(page, 'trio');
  check('the thumbnail step has a third tab, « Tes images »: three images imported, laid out as a trio (the first one big, the two others beside it); the layouts offered',
    near(trio.big, RED) && near(trio.top, GREEN) && near(trio.bottom, YELLOW) && /Plein cadre/.test(chips) && /Côte à côte/.test(chips) && /Grille/.test(chips) && /Libre/.test(chips), { trio, chips });

  await page.locator('.layer .ph-thumb .chip-btn', { hasText: 'Côte à côte' }).click();
  await sleep(150);
  const duo = [await at(page, C, 0.1, 0.5), await at(page, C, 0.5, 0.5), await at(page, C, 0.9, 0.5)];
  await page.locator('.layer .ph-thumb .chip-btn', { hasText: 'Grille' }).click();
  await sleep(150);
  const grid = [await at(page, C, 0.1, 0.25), await at(page, C, 0.9, 0.25), await at(page, C, 0.1, 0.75), await at(page, C, 0.9, 0.75)];
  check('side by side: three columns, in their order; a grid: two by two (the fourth cell empty, its background)',
    near(duo[0], RED) && near(duo[1], GREEN) && near(duo[2], YELLOW) && near(grid[0], RED) && near(grid[1], GREEN) && near(grid[2], YELLOW) && near(grid[3], [29, 33, 66]), { duo, grid });

  // « Libre » (from the grid): the yellow one (bottom left) dragged to the top right, over the green one
  await page.locator('.layer .ph-thumb .chip-btn', { hasText: 'Libre' }).click();
  await sleep(150);
  const box = await page.locator(C).boundingBox();
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.75);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 6 });
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.3, { steps: 6 });
  await page.mouse.up();
  await sleep(150);
  const free = { moved: await at(page, C, 0.7, 0.3), left: await at(page, C, 0.25, 0.75) };
  await page.locator('.layer .ph-thumb .chip-btn', { hasText: 'Plein cadre' }).click();
  await sleep(150);
  // full frame: the first one (red | blue) fills it; picked and zoomed ×2, then dragged right: more of its left (red) shows
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5);
  await sleep(100);
  const before = await at(page, C, 0.55, 0.5);
  await setRange(page, '.layer .ph-range input[aria-label="Zoom de l’image"]', 200);
  await sleep(150);
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5, { steps: 8 });
  await page.mouse.up();
  await sleep(150);
  const after = await at(page, C, 0.55, 0.5);
  check('« Libre »: an image dragged where the player wants, over the others; an image zoomed and reframed by dragging it',
    near(free.moved, YELLOW) && near(free.left, [29, 33, 66]) && near(before, BLUE) && near(after, RED), { free, before, after });

  // the big word, what it is worth; kept, on the upload screen, on the video once out
  await page.locator('.layer .ph-thumb .chip-btn', { hasText: 'Côte à côte' }).click();
  await page.fill('.layer #ph-text', 'trois potions');
  await page.locator('.layer .ph-thumb .chip-btn', { hasText: 'Jaune' }).click();
  await sleep(200);
  const est = await txt(page, '.layer .th-photos .th-est');
  const word = { ink: await at(page, C, 0.5, 0.86) };
  await shot(page, 'with-text');
  await page.locator('.layer .th-photos .th-ok').click();
  await page.waitForSelector('.layer .upload.up-wide .th-chosen', { timeout: 8000 });
  const up = await txt(page, '.layer .upload .th-chosen');
  const kept = await G(page, (id) => { const H = window.__hype, r = H.S.game.releases.find((x) => x.id === id); return { kind: r.thumb && r.thumb.kind, ctr: r.thumb && r.thumb.ctr, img: !!(r.thumb && r.thumb.img), media: H.S.game.media.includes(r.thumb && r.thumb.img) }; }, rid);
  await shot(page, 'upload');
  await page.locator('.layer .upload .btn-hot', { hasText: /Mettre en ligne|Publier/ }).first().click();
  await page.waitForSelector('.video-card .vc-screen.custom .th-art img', { timeout: 20000 });
  await idle(page);
  const out = await G(page, () => { const p = window.__hype.S.game.posts.find((x) => x.video && x.video.thumbImg); return p && { img: !!p.video.thumbImg, src: ((document.querySelector('.video-card .vc-screen.custom .th-art img') || {}).src || '').slice(0, 22) }; });
  check('a big word (yellow, at the bottom), what it is worth (three images and two words: +20 %); kept on the device, on the upload screen (« Tes images »), and on the video once out',
    /\+20\s% de vues/.test(est) && near(word.ink, [255, 212, 0], 60) && /Tes images/.test(up) && /\+20\s% de vues/.test(up) && kept.kind === 'photos' && kept.ctr === 0.2 && kept.img && kept.media && out && out.img && out.src === 'data:image/jpeg;base64', { est, word, up, kept, out });

  // ---------- a short: its cover ----------
  await page.evaluate(() => { const H = window.__hype; H.S.stack = []; H.update(); });
  const sid = await shot0('short', 'Ma potion du matin en 30 secondes');
  await page.waitForSelector('.layer .edit-step', { timeout: 8000 });
  await page.locator('.layer .edit-step button', { hasText: 'Passer le montage' }).click();
  await page.waitForSelector('.layer .upload.up-vert', { timeout: 8000 });
  const est0 = await G(page, (id) => { const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === id); return H.estimateViews(g, r, { hook: '', thumb: 'propre' })[1]; }, sid);
  await page.locator('.layer .cover-field button', { hasText: 'Faire une couverture' }).click();
  await page.waitForSelector('.layer .ph-thumb.vert .ph-cv');
  await page.setInputFiles('.layer .ph-thumb.vert input[type=file]', (await pngs(page, [{ w: 600, h: 900, a: '#12B98F' }])));
  await page.waitForFunction(() => /1\/6/.test((document.querySelector('.layer .ph-thumb.vert .ph-tools') || {}).textContent || ''), null, { timeout: 8000 });
  await page.fill('.layer #ph-text-v', 'le matin');
  await sleep(150);
  const vcol = await at(page, '.layer .ph-thumb.vert .ph-cv', 0.5, 0.3);
  const vshape = await G(page, () => { const c = document.querySelector('.layer .ph-thumb.vert .ph-cv'); return [c.width, c.height]; });
  await shot(page, 'cover-editor');
  await page.locator('.layer .cover-field .btn-hot', { hasText: 'Utiliser cette couverture' }).click();
  await page.waitForSelector('.layer .vert-prev.has-cover .vp-cover', { timeout: 8000 });
  const chosen = await txt(page, '.layer .cover-field');
  await shot(page, 'cover-upload');
  await page.locator('.layer .upload .btn-hot', { hasText: /Publier/ }).first().click();
  await page.waitForSelector('.pv-vert .pv-screen .pv-cover', { timeout: 20000 });
  await idle(page);
  const sp = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, p = g.posts.find((x) => x.video && x.video.what === 'short' && x.video.thumbImg);
    return p && { img: !!p.video.thumbImg, media: g.media.includes(p.video.thumbImg) };
  }, { sid });
  const est1 = await G(page, (id) => { const H = window.__hype, g = H.S.game, r = g.releases.find((x) => x.id === id) || { what: 'short', topic: 'Ma potion du matin en 30 secondes' }; return H.estimateViews(g, r, { hook: '', thumb: 'propre', thumbCtr: H.photoCtr(1, 'le matin', true) })[1]; }, sid);
  await G(page, () => document.querySelector('.pv-vert').scrollIntoView({ block: 'center' }));
  await shot(page, 'short-out');
  check('a short: « Faire une couverture avec tes images » on the upload screen, upright (720 × 1280); used: the preview shows it, the short goes out with it (its card); a little more views than without (+6 %)',
    near(vcol, GREEN) && vshape[0] === 720 && vshape[1] === 1280 && /Tes images/.test(chosen) && /\+6\s% de vues de plus/.test(chosen) && sp && sp.img && sp.media && est1 > est0 && H6(est0, est1), { vcol, vshape, chosen, sp, est0, est1 });

  // ---------- on a phone ----------
  await page.evaluate(() => { const H = window.__hype; H.S.stack = []; H.update(); });
  await page.setViewportSize({ width: 390, height: 844 });
  await shot0('vidéo', 'Une potion sur téléphone');
  await page.waitForSelector('.layer .edit-step', { timeout: 8000 });
  await page.locator('.layer .edit-step button', { hasText: 'Passer le montage' }).click();
  await page.waitForSelector('.layer .thumb-step', { timeout: 8000 });
  await page.locator('.layer .thumb-step [role=tab]', { hasText: 'Tes images' }).click();
  await page.setInputFiles('.layer .ph-thumb input[type=file]', (await pngs(page, [{ w: 800, h: 600, a: '#E53935' }, { w: 600, h: 600, a: '#12B98F' }])));
  await page.waitForFunction(() => /2\/6/.test((document.querySelector('.layer .ph-tools') || {}).textContent || ''), null, { timeout: 8000 });
  await sleep(700);
  const ph = await G(page, () => { const w = window.innerWidth, out = []; for (const el of document.querySelectorAll('.layer .thumb-step *')) { const r = el.getBoundingClientRect(); if (r.width && (r.right > w + 1 || r.left < -1)) out.push(el.className || el.tagName); } return out.slice(0, 4); });
  await shot(page, 'phone');
  check('on a phone (390): the images tab stays inside the screen', ph.length === 0, ph);

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
// (the cover's own bonus: +6 % of views, on top of the plain short's)
function H6(a, b) { return Math.abs(b / a - (1 + 0.14) / (1 + 0.08)) < 0.02; }
