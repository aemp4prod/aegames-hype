// 0.27.7 end to end, in Chromium against the built hype.html with the mocked Claude runtime: the windows, and names.
// - on a computer: a window floats once its title bar is dragged (it moves, its corner resizes it), the game stays
//   usable behind it (a tab changes, the window stays), its kind keeps its place, « Remettre au centre » brings it back;
// - any window is put aside in the dock with what was typed in it, and comes back as it was (a DM read meanwhile);
// - a date being played is never put aside, and floating it still holds the rest of the game;
// - on a phone: put aside only;
// - what was typed in a shoot's setup comes back when its window is closed and reopened; an upload draft too;
// - a quick save gets a name (kept when it is loaded back), a game too (on the home screen, after a reload).
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v278.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v278');
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
async function dragBy(page, sel, dx, dy) {
  const r = await rectOf(page, sel);
  const x = r.x + Math.min(r.w / 2, 160), y = r.y + r.h / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let k = 1; k <= 8; k++) await page.mouse.move(x + (dx * k) / 8, y + (dy * k) / 8);
  await page.mouse.up();
  await sleep(250);
}

(async () => {
  const browser = await chromium.launch();
  // ================= on a computer =================
  const { page } = await newPage(browser, { width: 1440, height: 900 });
  await newGame(page, 'Une créatrice qui filme tout ce qui bouge');
  await G(page, () => { window.__hypeNoGearEvent = true; window.__hypeEasyGear = true; });

  // put aside with what was typed, a DM read meanwhile, back as it was
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.openLayer({ t: 'series', id: 'single' }); });
  await page.waitForSelector('.layer #se-theme');
  await page.fill('.layer #se-theme', 'je teste les potions interdites');
  await page.click('.layer .win-min');
  await sleep(200);
  const docked = await G(page, () => { const H = window.__hype; return { dock: H.S.dock.length, stack: H.S.stack.length, chip: (document.querySelector('.win-dock .win-chip') || {}).textContent || '', hidden: !!document.querySelector('.layer.min'), visible: [...document.querySelectorAll('.layer')].filter((x) => getComputedStyle(x).display !== 'none').length }; });
  await shot(page, 'dock');
  await G(page, () => { const H = window.__hype, c = H.charByHandle(H.S.game, 'theo.marlin'); H.openDM(c.id); });
  await page.waitForSelector('.layer:not(.min) .layer-head');
  await G(page, () => window.__hype.closeLayer());
  await page.click('.win-dock .wc-open');
  await page.waitForSelector('.layer:not(.min) #se-theme');
  const back = await G(page, () => ({ theme: document.querySelector('.layer:not(.min) #se-theme').value, dock: window.__hype.S.dock.length }));
  check('« Réduire »: the window goes to the dock (its name on a chip), a DM is read meanwhile, and it comes back with what was typed in it',
    docked.dock === 1 && docked.stack === 0 && /Programmer une sortie/.test(docked.chip) && docked.hidden && docked.visible === 0 && back.theme === 'je teste les potions interdites' && back.dock === 0, { docked, back });

  // dragged by its title bar: it floats, moves; its corner resizes it; the game behind stays usable
  await sleep(400);
  const r0 = await rectOf(page, '.layer:not(.min) .layer-panel');
  await dragBy(page, '.layer:not(.min) .layer-head h2', 300, 40);
  const r1 = await rectOf(page, '.layer:not(.min) .layer-panel');
  const fl = await G(page, () => ({ float: !!document.querySelector('.layer.float'), store: window.__hype.winStore().series }));
  await dragBy(page, '.layer.float .win-grip', 140, 90);
  const r2 = await rectOf(page, '.layer.float .layer-panel');
  await shot(page, 'floating');
  await page.click('.rail .rail-item[aria-label="Studio"]');
  await sleep(400);
  const behind = await G(page, () => ({ tab: window.__hype.S.tab, open: window.__hype.S.stack.some((l) => l.t === 'series'), theme: (document.querySelector('.layer #se-theme') || {}).value }));
  check('dragged by its title bar, the window floats where it is put; its corner resizes it; a click on the game behind it works (the Studio opens) and the window stays, as it was',
    fl.float && fl.store && fl.store.float === true && Math.abs(r1.x - (r0.x + 300)) <= 6 && Math.abs(r1.y - (r0.y + 40)) <= 6 && Math.abs(r2.w - (r1.w + 140)) <= 6 && Math.abs(r2.h - (r1.h + 90)) <= 6
      && behind.tab === 'studio' && behind.open && behind.theme === 'je teste les potions interdites', { r0, r1, r2, fl, behind });
  // its kind keeps its place; « Remettre au centre »
  await G(page, () => { const H = window.__hype; H.dropLayers((l) => l.t === 'series'); H.update(); H.openLayer({ t: 'series', id: 'single' }); });
  await page.waitForSelector('.layer.float .layer-panel');
  const r3 = await rectOf(page, '.layer.float .layer-panel');
  await page.click('.layer.float .win-float');
  await sleep(250);
  const centered = await G(page, () => ({ float: !!document.querySelector('.layer.float'), store: window.__hype.winStore().series.float }));
  check('closed and opened again, a window of that kind comes back where it was left, at its size; « Remettre au centre » docks it back in the middle',
    Math.abs(r3.x - r2.x) <= 6 && Math.abs(r3.y - r2.y) <= 6 && Math.abs(r3.w - r2.w) <= 6 && Math.abs(r3.h - r2.h) <= 6 && !centered.float && centered.store === false, { r2, r3, centered });

  // a date being played: never put aside; floating, it still holds the rest
  const date = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin'), t = Date.now();
    H.S.stack = [];
    g.events.push({ id: 'evW', kind: 'rdv', c: c.id, what: 'un dîner au bord du lac', at: t, due: t - 60000, state: 'scheduled', player: true, game: null, played: null, diff: 'moyen' });
    H.openLayer({ t: 'minigame', id: 'evW' });
    return true;
  });
  await page.waitForSelector('.layer .layer-head');
  const dmin = await G(page, () => ({ min: !!document.querySelector('.layer .win-min'), float: !!document.querySelector('.layer .win-float') }));
  await page.click('.layer .win-float');
  await sleep(250);
  const held = await G(page, () => { const L = document.querySelector('.layer.float'); return { held: !!(L && L.classList.contains('held')), blocks: L ? getComputedStyle(L).pointerEvents : '' }; });
  await shot(page, 'date-held');
  await G(page, () => { const H = window.__hype, g = H.S.game; H.winSet('minigame', { float: false }); H.S.stack = []; g.events = g.events.filter((e) => e.id !== 'evW'); H.update(); });
  check('a date being played has no « Réduire »; detached, it moves but still holds the rest of the game (the dimmed screen blocks it)',
    date && !dmin.min && dmin.float && held.held && held.blocks === 'auto', { dmin, held });

  // what was typed in a shoot's setup survives its window; an upload draft too (without a contract that is over)
  await G(page, () => { const H = window.__hype, g = H.S.game; window.__r = H.scheduleRelease(g, { what: 'vidéo', topic: 'mon week-end', due: Date.now() + 3600000 }); window.__r.due = Date.now() - 1000; window.__r.devis = { total: 0, items: [], have: [], topic: 'mon week-end', at: Date.now() }; H.startShoot(window.__r); });
  await page.waitForSelector('.layer #rl-plot');
  await page.fill('.layer #rl-plot', 'on part à Tokyo, la valise se perd');
  await G(page, () => window.__hype.closeLayer());
  await G(page, () => window.__hype.startShoot(window.__r));
  await page.waitForSelector('.layer #rl-plot');
  const kept = await G(page, () => {
    const H = window.__hype, r = window.__r;
    H.keepPubDraft(r, { title: 'Mon week-end à Tokyo', caption: 'regardez ça', hook: '', deal: 'dl_over', mention: true, decl: [] });
    const d = H.pubDraft(r, []);
    return { plot: document.querySelector('.layer #rl-plot').value, title: d.title, caption: d.caption, deal: 'deal' in d };
  });
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.dropRelease(H.S.game, window.__r); H.update(); });
  check('what was typed in a shoot\'s setup comes back when its window is closed and opened again; an upload form keeps its draft (not a contract that is over)',
    kept.plot === 'on part à Tokyo, la valise se perd' && kept.title === 'Mon week-end à Tokyo' && kept.caption === 'regardez ça' && !kept.deal, kept);

  // a quick save gets a name, kept when it is loaded back
  await G(page, () => window.__hype.saveToSlot());
  await page.waitForFunction(() => (window.__hype.S.game.saves || []).some((x) => !x.auto), null, { timeout: 15000 });
  await G(page, () => { const H = window.__hype; H.S.modals = []; H.queueModal({ t: 'saves' }); H.update(); });
  await page.waitForSelector('.modal .save-row');
  const row = page.locator('.modal .save-row', { hasText: 'Sauvegarde' }).first();
  await row.locator('.save-ren').click();
  await page.fill('.modal .save-row.editing .input', 'Avant le bal');
  await page.keyboard.press('Enter');
  await sleep(300);
  const named = await G(page, () => ({ rows: [...document.querySelectorAll('.modal .save-row b')].map((b) => b.textContent), meta: (window.__hype.S.game.saves || []).filter((x) => x.name).map((x) => x.name) }));
  await shot(page, 'save-named');
  await G(page, () => { window.__g0 = window.__hype.S.game; });
  await page.locator('.modal .save-row', { hasText: 'Avant le bal' }).locator('.btn', { hasText: 'Charger' }).click();
  await page.locator('.modal .btn', { hasText: 'Revenir en arrière' }).waitFor({ timeout: 10000 });
  await sleep(700); // (a confirmation answers only after a moment: a double tap cannot confirm it)
  await page.locator('.modal .btn', { hasText: 'Revenir en arrière' }).click();
  await page.waitForFunction(() => window.__hype.S.game && window.__hype.S.game !== window.__g0, null, { timeout: 30000 }); // (the game it comes back to)
  await page.waitForFunction(() => window.__hype.S.toasts.some((t) => /Retour en arrière/.test(t.text)), null, { timeout: 5000 }).catch(() => {});
  const loaded = await G(page, () => ({ toast: (window.__hype.S.toasts.find((t) => /Retour en arrière/.test(t.text)) || {}).text, names: (window.__hype.S.game.saves || []).filter((x) => x.name).map((x) => x.name) }));
  check('a quick save gets a name (✏️ in the saves window); loading it back says its name, and the name stays',
    named.rows.includes('Avant le bal') && named.meta.join() === 'Avant le bal' && /Avant le bal/.test(loaded.toast || '') && loaded.names.join() === 'Avant le bal', { named, loaded });

  // a game gets a name on the home screen, still there after a reload
  await G(page, () => window.__hype.leaveGame());
  await page.waitForSelector('.save-wrap .save-edit');
  await page.click('.save-wrap .save-edit');
  await page.fill('.save-renaming .input', 'Ma partie de Lumen');
  await page.keyboard.press('Enter');
  await sleep(1200);
  const home1 = await G(page, () => ({ card: (document.querySelector('.save-wrap .save-main') || {}).textContent || '', title: window.__hype.S.games[0].title }));
  await page.reload();
  await page.waitForSelector('.save-wrap .save-main');
  await sleep(500);
  const home2 = await G(page, () => (document.querySelector('.save-wrap .save-main') || {}).textContent || '');
  await shot(page, 'game-named');
  check('a game gets a name of its own on the home screen (its world under it), still there after a reload',
    /^Ma partie de Lumen/.test(home1.card) && /Académie Lumen/.test(home1.card) && home1.title === 'Ma partie de Lumen' && /^Ma partie de Lumen/.test(home2), { home1, home2 });

  // ================= on a phone =================
  const ph = await newPage(browser, { width: 390, height: 844 });
  await newGame(ph.page, 'Une créatrice en vadrouille');
  await G(ph.page, () => { const H = window.__hype; H.S.stack = []; H.openLayer({ t: 'series', id: 'single' }); });
  await ph.page.waitForSelector('.layer .layer-head');
  const btns = await G(ph.page, () => ({ min: !!document.querySelector('.layer .win-min'), float: !!document.querySelector('.layer .win-float') }));
  await dragBy(ph.page, '.layer .layer-head h2', -100, 60);
  const still = await G(ph.page, () => !document.querySelector('.layer.float'));
  await ph.page.click('.layer .win-min');
  await sleep(250);
  const phDock = await G(ph.page, () => ({ chip: !!document.querySelector('.win-dock .win-chip'), dock: window.__hype.S.dock.length }));
  await shot(ph.page, 'phone-dock');
  check('on a phone: « Réduire » only (no floating window, a drag on the title moves nothing), and the dock works',
    btns.min && !btns.float && still && phDock.chip && phDock.dock === 1, { btns, still, phDock });

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  console.log(`\n${checks.filter((c) => c[0] === 'PASS').length}/${checks.length} PASS`);
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
