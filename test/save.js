// 0.14 end to end, in Chromium against the built hype.html with the mocked Claude runtime: a long game still saves.
// - the core document (the game without feed and messages) grows with contacts and candidates: past the 256 KiB a
//   document may hold, it is compacted before writing (old notifications, contacts the game is done with, candidates who
//   were told no), the characters that matter untouched, and the save lands;
// - a save that cannot land is said (a toast with « Exporter »), and a quick save that failed is not listed.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/save.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-save');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(process.env.PAGE || path.join(ROOT, 'hype.html'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const UMD = fs.readFileSync(process.env.UMD, 'utf8');
const SKELETON = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;

const errors = [];
const checks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let shotN = 0, lastPage = null;
const check = (name, ok, info) => { checks.push([ok ? 'PASS' : 'FAIL', name]); console.log(ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)); };
async function shot(page, name) { shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
async function dismiss(page) { for (let k = 0; k < 6 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(700); } }
async function clickText(page, sel, text) {
  const el = page.locator(sel, { hasText: text }).first();
  if (!sel.startsWith('.modal')) await dismiss(page);
  await el.waitFor({ state: 'visible', timeout: 15000 });
  await el.click();
}
const G = (page, fn, arg) => page.evaluate(fn, arg);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, colorScheme: 'light' });
  await ctx.addInitScript(MOCK);
  const page = await ctx.newPage();
  lastPage = page;
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
  await clickText(page, 'button', 'Nouvelle partie');
  await clickText(page, 'button.world', 'Académie Lumen');
  await page.waitForSelector('#pn');
  await page.fill('#pn', 'Mila Flux');
  await clickText(page, '.seg button', 'Elle');
  await page.fill('#pi', 'Une influenceuse qui enquête sur les secrets de l’académie');
  await clickText(page, '.tier', 'Sans limite');
  await page.check('#p18');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=Qui sera ton premier abonné', { timeout: 20000 });
  await page.locator('.cast-card.pick', { hasText: 'Théo' }).click();
  await page.click('.cast-cta button');
  await page.waitForSelector('.post');
  await sleep(1200);
  await dismiss(page);

  // ---------- a long game: hundreds of contacts and candidates, the core document past 256 KiB ----------
  const big = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now(), long = (k) => ('Une phrase de fiche assez longue pour peser, numéro ' + k + '. ').repeat(6);
    for (let k = 0; k < 220; k++) { const id = 'cx' + k; g.chars[id] = { id, kind: 'gone', name: 'Candidat ' + k, handle: 'cand' + k, emoji: '🎬', g: 'f', role: 'Monteuse', bio: long(k), personality: long(k), voice: long(k), followers: 900, rel: 0, unlocked: true, unlockedAt: t - 50 * 864e5, mem: [], cand: { role: 'monteur', rate: 900, pitch: long(k) } }; g.order.push(id); }
    for (let k = 0; k < 70; k++) { const id = 'bx' + k; g.chars[id] = { id, kind: 'brand', name: 'Contact ' + k, handle: 'brand' + k, emoji: '💼', g: 'm', role: 'Chargé de partenariats, Marque ' + k, bio: long(k), personality: long(k), voice: long(k), followers: 900, rel: 10, unlocked: true, unlockedAt: t - 45 * 864e5, mem: [], dmSent: 0 }; g.order.push(id); }
    const zara = H.charByHandle(g, 'zara.vey');
    return { core: H.coreSize(g), mains: H.mains(g, false).length, zara: zara.personality };
  });
  const e0 = errors.length;
  await G(page, () => window.__hype.saveNow());
  await sleep(800);
  const after = await G(page, (z) => {
    const H = window.__hype, g = H.S.game;
    const key = Object.keys(localStorage).find((k) => k.endsWith('/g_' + g.id));
    const doc = key ? localStorage.getItem(key) : '';
    const stored = doc ? JSON.parse(doc) : null;
    const vals = Object.values(g.chars);
    return {
      stored: doc.length, core: H.coreSize(g), gone: vals.filter((c) => c.kind === 'gone').length, slimGone: vals.filter((c) => c.kind === 'gone' && c.slim).length, slimBrands: vals.filter((c) => c.kind === 'brand' && c.slim).length,
      brands: vals.filter((c) => c.id.startsWith('bx')).length, mains: H.mains(g, false).length, zara: H.charByHandle(g, 'zara.vey').personality === z,
      storedChars: stored ? Object.keys(stored.chars).length : 0, toast: H.S.toasts.some((x) => /pas pu être sauvegardée/.test(x.text)),
    };
  }, big.zara);
  const warned = errors.slice(e0).filter((x) => /save failed/.test(x));
  check('a long game whose core document is past 256 KiB is compacted before writing (candidates told no, contacts the game is done with), the characters that matter untouched, and the save lands',
    big.core > 262144 && after.stored > 0 && after.stored < 262144 && after.core < 262144 && after.mains === big.mains && after.zara && after.slimGone === 220 && after.slimBrands === 0 && after.brands === 70 && !warned.length && !after.toast, { big: big.core, after, warned });
  // more contacts still: the brands the game is done with lose their details too (not one it works with now)
  const more = await G(page, async () => {
    const H = window.__hype, g = H.S.game, t = Date.now(), long = (k) => ('Une autre phrase de fiche assez longue pour peser, numéro ' + k + '. ').repeat(7);
    for (let k = 0; k < 260; k++) { const id = 'by' + k; g.chars[id] = { id, kind: 'brand', name: 'Contact bis ' + k, handle: 'brandbis' + k, emoji: '💼', g: 'f', role: 'Chargée de partenariats, Marque bis ' + k, bio: long(k), personality: long(k), voice: long(k), followers: 900, rel: 10, unlocked: true, unlockedAt: t - 45 * 864e5, mem: [], dmSent: 0 }; g.order.push(id); }
    g.chars.bact = { id: 'bact', kind: 'brand', name: 'Contact actif', handle: 'brandactif', emoji: '💼', g: 'f', role: 'Chargée de partenariats', bio: long(1), personality: long(1), voice: long(1), followers: 900, rel: 10, unlocked: true, unlockedAt: t, mem: [], dmSent: 0 };
    g.order.push('bact');
    const before = H.coreSize(g);
    await H.saveNow();
    const key = Object.keys(localStorage).find((k) => k.endsWith('/g_' + g.id));
    const vals = Object.values(g.chars);
    return { before, stored: localStorage.getItem(key).length, slim: vals.filter((c) => c.kind === 'brand' && c.slim).length, active: !g.chars.bact.slim, gone: vals.filter((c) => c.kind === 'gone').length };
  });
  check('more contacts still: the brands the game is done with lose their details too, not the one it works with now; the save lands',
    more.before > 262144 && more.stored < 262144 && more.slim > 0 && more.active && !errors.slice(e0).some((x) => /save failed/.test(x)), more);

  // ---------- a save that cannot land is said; a failed quick save is not listed ----------
  const fail = await G(page, async () => {
    const H = window.__hype, g = H.S.game, z = H.charByHandle(g, 'zara.vey'), keep = z.bio;
    z.bio = 'x'.repeat(300000); // nothing the game may drop
    await H.saveNow();
    const toast = H.S.toasts.find((x) => /pas pu être sauvegardée/.test(x.text));
    const saves0 = (g.saves || []).length;
    let quick = 'ok';
    try { await H.writeSave(g, '2'); } catch (e) { quick = 'failed'; }
    const listed = (g.saves || []).some((x) => x.slot === '2');
    z.bio = keep;
    await H.saveNow();
    return { toast: toast ? toast.text : null, action: toast && toast.action ? toast.action.label : null, quick, listed, saves0, saves1: (g.saves || []).length };
  });
  await shot(page, 'save-failed-toast');
  check('a save that cannot land is said, with « Exporter » at hand; a quick save that failed is not listed',
    /pas pu être sauvegardée/.test(fail.toast || '') && fail.action === 'Exporter' && fail.quick === 'failed' && !fail.listed && fail.saves1 === fail.saves0, fail);
  // the warnings of that deliberate failure are expected
  for (let k = errors.length - 1; k >= 0; k--) if (/save failed|invalid_argument|too big/.test(errors[k])) errors.splice(k, 1);

  // ---------- and the next saves land again ----------
  const back = await G(page, async () => {
    const H = window.__hype, g = H.S.game;
    H.addMem(g, H.charByHandle(g, 'theo.marlin'), 'on a reparlé du tournoi');
    await H.saveNow();
    let quick = 'ok';
    try { await H.writeSave(g, '1'); } catch (e) { quick = 'failed'; }
    return { quick, listed: (g.saves || []).some((x) => x.slot === '1') };
  });
  check('once it fits again, saves land and a quick save is listed', back.quick === 'ok' && back.listed, back);

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  console.log(`\n${checks.filter((c) => c[0] === 'PASS').length}/${checks.length} PASS`);
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch(async (e) => {
  console.error('FAILED', e);
  if (lastPage) await lastPage.screenshot({ path: path.join(OUT, 'fail.png') }).catch(() => {});
  console.log('ERRORS', errors.join('\n'));
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  process.exit(1);
});
