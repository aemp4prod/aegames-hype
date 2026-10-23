// 0.32: « Comment ça marche ? », in Chromium against the built hype.html: the box on the home screen (no game yet, and
// with games), its eight steps (each one whole on a computer and on a phone, nothing sticking out, in light and dark),
// what they say (the characters arrive little by little, nice ones and less nice ones, 18 and over) and what they never
// say (nothing that is meant to surprise), the keys, the dots, a swipe, « Créer ma partie » (and when it cannot be).
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/tuto.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-tuto');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(process.env.PAGE || path.join(ROOT, 'hype.html'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const UMD = fs.readFileSync(process.env.UMD, 'utf8');
const SKELETON = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}</style></head><body>${body}</body></html>`;

const errors = [];
const checks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let shotN = 0;
const check = (name, ok, info) => { checks.push([ok ? 'PASS' : 'FAIL', name]); console.log(ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)); };
async function shot(page, name) { await sleep(650); shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
const G = (page, fn, arg) => page.evaluate(fn, arg);

async function newPage(browser, viewport, scheme = 'light') {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 700, colorScheme: scheme });
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
// The step on screen: its number, its words, and whether it fits (nothing sticking out of the card or of its scene).
const stepNow = (page) => G(page, () => {
  const card = document.querySelector('.modal-card.tuto');
  if (!card) return null;
  const scene = card.querySelector('.tuto-scene'), sr = scene.getBoundingClientRect(), cr = card.getBoundingClientRect();
  const out = [];
  for (const el of scene.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    if (r.left < sr.left - 1 || r.right > sr.right + 1 || r.top < sr.top - 1 || r.bottom > sr.bottom + 1) out.push(el.className && el.className.baseVal === undefined ? String(el.className) : el.tagName);
  }
  const xr = card.querySelector('.tuto-x').getBoundingClientRect();
  const underX = [...scene.querySelectorAll('.av, img, .ts-tile, .ts-tag, .chip, .ts-step, .ts-side, .clock-btn, .fit-chip, .ts-etc, .ts-new i, .ts-h b, .ts-bar')].filter((el) => { const r = el.getBoundingClientRect(); return r.width && r.left < xr.right && r.right > xr.left && r.top < xr.bottom && r.bottom > xr.top; }).map((el) => String(el.className));
  const wide = [...card.querySelectorAll('.tuto-body *')].filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible').length
    + [...card.querySelectorAll('.tuto-nav .btn')].filter((el) => el.scrollWidth > el.clientWidth + 1).length;
  const body = card.querySelector('.tuto-body.on'), m = (body.querySelector('.eyebrow') || {}).textContent || '';
  return {
    n: Number((m.match(/(\d+) sur (\d+)/) || [])[1] || 0), of: Number((m.match(/(\d+) sur (\d+)/) || [])[2] || 0),
    title: (body.querySelector('.tuto-title') || {}).textContent || '', text: body.innerText, top: Math.round(card.getBoundingClientRect().top), navY: Math.round(card.querySelector('.tuto-nav').getBoundingClientRect().top),
    hidden: [...card.querySelectorAll('.tuto-body:not(.on)')].every((b) => getComputedStyle(b).visibility === 'hidden' && b.getAttribute('aria-hidden') === 'true'), ids: document.querySelectorAll('#tuto-t').length === 1 && document.querySelector('#tuto-t').closest('.tuto-body.on') !== null,
    out, underX, wide, inView: cr.top >= -1 && cr.bottom <= window.innerHeight + 1 && cr.left >= -1 && cr.right <= window.innerWidth + 1,
    scroll: card.scrollHeight > card.clientHeight + 1, hscroll: document.documentElement.scrollWidth > window.innerWidth + 1,
    main: (card.querySelector('.tuto-nav .btn-hot') || {}).textContent || '', focus: document.activeElement && document.activeElement.textContent,
    emo: scene.querySelectorAll('img.emo').length, dots: card.querySelectorAll('.tuto-dots button').length,
  };
});

(async () => {
  const browser = await chromium.launch();

  // ---------- 1. a computer, no game yet ----------
  const { page } = await newPage(browser, { width: 1280, height: 860 });
  const box = await G(page, () => { const b = document.querySelector('.hero .tuto-open'); return b ? { text: b.innerText, after: !!b.previousElementSibling && b.previousElementSibling.classList.contains('row') } : null; });
  check('no game yet: the box « Comment ça marche ? » is on the home screen, under the buttons', !!box && /Comment ça marche/.test(box.text) && box.after, box);
  await shot(page, 'home-box');
  await page.click('.tuto-open');
  await page.waitForSelector('.modal-card.tuto');
  await sleep(600); // (the card's own pop)
  const all = [];
  for (let k = 0; k < 12; k++) {
    const s = await stepNow(page);
    all.push(s);
    await shot(page, `pc-step${s.n}`);
    if (s.n >= s.of) break;
    await page.click('.tuto-nav .btn-hot');
    await sleep(120);
  }
  const N = all[0] && all[0].of;
  check('eight steps, one after the other, eight dots', N === 8 && all.length === 8 && all.every((s, k) => s.n === k + 1 && s.dots === 8), all.map((s) => [s.n, s.of, s.dots]));
  check('on a computer, every step whole on screen, nothing sticking out of its scene nor under the cross, no scrolling', all.every((s) => s.inView && !s.out.length && !s.underX.length && !s.wide && !s.scroll && !s.hscroll), all.filter((s) => !s.inView || s.out.length || s.underX.length || s.wide || s.scroll || s.hscroll));
  check('the card keeps its place from step to step (its buttons never move); only the step on screen is seen and named', new Set(all.map((s) => s.top)).size === 1 && new Set(all.map((s) => s.navY)).size === 1 && all.every((s) => s.hidden && s.ids), all.map((s) => [s.top, s.navY, s.hidden, s.ids]));
  const words = all.map((s) => s.title + '\n' + s.text).join('\n');
  check('it says what the player needs: everyone an AI but them, the characters little by little (one more at each level), nice ones and less nice ones of both kinds all along, 18 and over',
    /sauf toi/.test(words) && /petit à petit/.test(words) && /à chaque niveau/.test(words) && /moins gentils/.test(words) && /deux sortes, tout au long/.test(words) && /18 ans et plus/.test(words) && /une à deux semaines/.test(words), null);
  const bad = words.match(/psycho|stalk|traîtr|traitr|arnaq|pi[èe]ge|manipul|menteu|mensong|faux profil|méfi|danger|tueu|meurt|police|secret|au bout d.une semaine|après une semaine|harc[eè]l|espionn|suivent|te suit/gi);
  check('and never a word of what is meant to surprise (no psychopath, no stalker, no traitor, no trap, nothing after a week)', !bad, bad);
  check('the scenes are made of the game’s own stickers (no new drawing)', all.filter((s) => s.emo > 0).length >= 5, all.map((s) => s.emo));
  check('the last step: « Créer ma partie », focused', all[7] && all[7].main === 'Créer ma partie' && all[7].focus === 'Créer ma partie', all[7] && [all[7].main, all[7].focus]);
  // the keys, the dots, a swipe
  await page.keyboard.press('ArrowLeft');
  await sleep(100);
  const left = await stepNow(page);
  await page.click('.tuto-dots button >> nth=2');
  await sleep(100);
  const dot = await stepNow(page);
  await page.keyboard.press('ArrowRight');
  await sleep(100);
  const right = await stepNow(page);
  const sc = await G(page, () => { const r = document.querySelector('.tuto-scene').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(sc.x + 90, sc.y);
  await page.mouse.down();
  await page.mouse.move(sc.x - 20, sc.y + 6, { steps: 4 });
  await page.mouse.move(sc.x - 90, sc.y + 8, { steps: 4 });
  await page.mouse.up();
  await sleep(100);
  const swiped = await stepNow(page);
  check('the arrows, a dot and a swipe move from step to step', left.n === 7 && dot.n === 3 && right.n === 4 && swiped.n === 5, [left.n, dot.n, right.n, swiped.n]);
  await page.keyboard.press('Escape');
  await sleep(150);
  const closed = await G(page, () => ({ open: !!document.querySelector('.modal-card.tuto'), focus: document.activeElement && document.activeElement.classList.contains('tuto-open') }));
  check('Escape closes it, and the focus goes back to the box', !closed.open && closed.focus, closed);
  // a click outside, « Plus tard »
  await page.click('.tuto-open');
  await page.waitForSelector('.modal-card.tuto');
  await page.mouse.click(20, 20);
  await sleep(150);
  const outside = !(await page.$('.modal-card.tuto'));
  await page.click('.tuto-open');
  await page.click('.tuto-nav .btn-ghost');
  await sleep(150);
  check('a click outside, or « Plus tard », closes it too', outside && !(await page.$('.modal-card.tuto')), null);
  // « Créer ma partie »: the creation starts
  await page.click('.tuto-open');
  await page.click('.tuto-dots button >> nth=7');
  await page.click('.tuto-nav .btn-hot');
  await sleep(300);
  const ob = await G(page, () => ({ phase: window.__hype.S.phase, step: window.__hype.S.ob && window.__hype.S.ob.step, h: (document.querySelector('h1') || {}).textContent }));
  check('« Créer ma partie » starts a game: the choice of a world', ob.phase === 'onboard' && ob.step === 'world' && /Choisis ton monde/.test(ob.h), ob);
  await page.context().close();

  // ---------- 2. with games ----------
  const { page: pg } = await newPage(browser, { width: 1280, height: 860 });
  const fake = (k) => ({ id: 'tuto' + k, world: 'Académie Lumen', emoji: '🔮', hue: 265, avatar: '🙂', name: 'Mila Flux', handle: 'mila.flux', followers: 120 + k, level: 2, updatedAt: Date.now() - k * 60000 });
  await G(pg, (list) => { const H = window.__hype; H.S.games = list; H.update(); }, [fake(1), fake(2)]);
  await sleep(200);
  const inList = await G(pg, () => !!document.querySelector('.saves') && !!document.querySelector('section .tuto-open'));
  check('with games: the box is there too, under the list', inList, null);
  await shot(pg, 'home-list');
  await pg.click('.tuto-open');
  await pg.click('.tuto-dots button >> nth=7');
  await sleep(100);
  const okNew = await stepNow(pg);
  await pg.click('.tuto-x');
  // six games: none more can be created
  await G(pg, (list) => { const H = window.__hype; H.S.games = list; H.update(); }, [1, 2, 3, 4, 5, 6].map(fake));
  await sleep(200);
  await pg.click('.tuto-open');
  await pg.click('.tuto-dots button >> nth=7');
  await sleep(100);
  const full = await stepNow(pg);
  await shot(pg, 'full');
  await pg.click('.tuto-nav .btn-hot');
  await sleep(150);
  const fullClosed = await G(pg, () => ({ open: !!document.querySelector('.modal-card.tuto'), phase: window.__hype.S.phase }));
  check('a game can be created: « Créer ma partie »; six games already: « Compris ! », why, and it only closes', okNew.main === 'Créer ma partie' && full.main === 'Compris !' && /déjà 6 parties/.test(full.text) && !fullClosed.open && fullClosed.phase === 'home', { okNew: okNew.main, full: [full.main, full.text.slice(-90)], fullClosed });
  await pg.context().close();

  // ---------- 3. phones (light and dark) ----------
  for (const [vp, scheme] of [[{ width: 390, height: 844 }, 'light'], [{ width: 360, height: 640 }, 'dark'], [{ width: 390, height: 844 }, 'dark']]) {
    const { page: ph } = await newPage(browser, vp, scheme);
    const tag = `${vp.width}-${scheme}`;
    const boxR = await G(ph, () => { const r = document.querySelector('.tuto-open').getBoundingClientRect(); return { l: r.left, r: r.right, w: window.innerWidth }; });
    await ph.locator('.tuto-open').scrollIntoViewIfNeeded();
    if (tag === '390-light') await shot(ph, `home-${tag}`);
    await ph.click('.tuto-open');
    await ph.waitForSelector('.modal-card.tuto');
    await sleep(600);
    const steps = [];
    for (let k = 0; k < 12; k++) {
      const s = await stepNow(ph);
      steps.push(s);
      await shot(ph, `${tag}-step${s.n}`);
      if (s.n >= s.of) break;
      await ph.click('.tuto-nav .btn-hot');
      await sleep(120);
    }
    const bad2 = steps.filter((s) => !s.inView || s.out.length || s.underX.length || s.wide || s.hscroll);
    check(`a phone ${vp.width}×${vp.height} (${scheme}): the box within the screen, all eight steps whole, nothing sticking out, the buttons in the same place`, steps.length === 8 && !bad2.length && boxR.l >= 15 && boxR.r <= boxR.w - 15 && new Set(steps.map((s) => s.navY)).size === 1, { bad2, boxR, scroll: steps.filter((s) => s.scroll).map((s) => s.n), navY: steps.map((s) => s.navY) });
    await ph.context().close();
  }

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
