// The photo pack (0.8) end to end, in Chromium against the built hype.html with the mocked Claude runtime:
// faces for the main characters (chosen by the AI from the creator's profiles, never twice), the Insta-like page (grid,
// a post, a like, highlights), the TikTok-like slideshows, photos the game chooses by itself and their characters caption,
// photos matched to what the AI writes, free tags, the choice by season, occasion and mood (no AI), the photos setting,
// then the hidden atelier (creator mode: 7 taps on the version), its export and import, and tools/pack.py + build.py.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/photos.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-photos');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(process.env.PAGE || path.join(ROOT, 'hype.html'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const UMD = fs.readFileSync(process.env.UMD, 'utf8');
const SKELETON = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;

/* ---------- little PNG images (a colour and a stripe), made here ---------- */
function crc32(buf) { let crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { let c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function hsl(h, s, l) { const a = s * Math.min(l, 1 - l); const f = (n) => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; }
function png(w, h, hue) {
  const [r, g, b] = hsl(hue, 0.65, 0.55), [r2, g2, b2] = hsl((hue + 40) % 360, 0.7, 0.3);
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3, s = (x + y) % 14 < 5; raw[o] = s ? r2 : r; raw[o + 1] = s ? g2 : g; raw[o + 2] = s ? b2 : b; }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
/* ---------- the shipped pack of the test: 7 women, 6 men, 2 androgynous, 9 photos each ---------- */
const SET = [
  { season: 'all', moment: 'jour', tags: ['café', 'calme'], desc: 'En terrasse avec un café, pull beige, sourire tranquille.' },
  { season: 'ete', moment: 'jour', tags: ['plage', 'joyeux'], desc: 'Au bord de la mer au coucher du soleil, chemise ouverte, éclat de rire.' },
  { season: 'hiver', moment: 'jour', tags: ['nature', 'neige'], desc: 'Sous la neige, bonnet rouge, joues rosies.' },
  { season: 'mi', moment: 'all', tags: ['ville', 'balade'], desc: 'Balade sous les feuilles orange, trench beige.' },
  { season: 'all', moment: 'soir', tags: ['soirée', 'amis', 'marrant'], desc: 'Soirée entre amis, verre levé, fou rire.' },
  { season: 'all', moment: 'all', tags: ['gaming', 'manette', 'marrant'], desc: 'Manette en main, éclate de rire devant l’écran, chambre éclairée de néons.' },
  { season: 'all', moment: 'all', tags: ['selfie', 'sérieux'], desc: 'Selfie au miroir, regard sérieux, veste noire.' },
  { season: 'mi', moment: 'soir', tags: ['halloween', 'soirée'], desc: 'Déguisé·e en vampire pour Halloween, cape et faux crocs.' },
  { season: 'hiver', moment: 'all', tags: ['noël', 'maison'], desc: 'Devant le sapin décoré, pull de Noël.' },
];
const PROFILES = ['Passion jeux vidéo et streaming, drôle, un peu geek, toujours une manette pas loin.', 'Sportive, matinale, compétitive, déteste perdre.', ''];
const FILES = {};
const people = [];
[['f', 7], ['m', 6], ['x', 2]].forEach(([g, n], gi) => {
  for (let k = 1; k <= n; k++) {
    const id = g + String(k).padStart(2, '0'), hue = (gi * 120 + k * 23) % 360;
    FILES[id + '-p.png'] = png(32, 32, hue);
    const photos = SET.map((x, j) => { const file = `${id}-${j + 1}.png`; FILES[file] = png(40, 50, (hue + j * 31) % 360); return Object.assign({ id: `${id}-${j + 1}`, file }, x, j === 0 || j === 6 ? { set: 's1' } : {}); });
    people.push({ id, g, style: 'moderne', label: `${g.toUpperCase()}${k}`, look: k === 1 ? 'cheveux bouclés bruns, lunettes rondes' : '', profile: PROFILES[k % 3], portrait: id + '-p.png', photos });
  }
});
const TEST_PACK = { v: 2, people };

const errors = [];
const checks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let shotN = 0;
const check = (name, ok, info) => { checks.push([ok ? 'PASS' : 'FAIL', name]); console.log(ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)); };
async function shot(page, name) { shotN++; const file = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: file }); console.log('shot', path.basename(file)); }
async function clickText(page, sel, text) {
  const el = page.locator(sel, { hasText: text }).first();
  for (let attempt = 0; ; attempt++) {
    try {
      if (!sel.startsWith('.modal')) for (let k = 0; k < 4 && (await page.$('.modal:not(.at-preview)')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(700); }
      await el.waitFor({ state: 'visible', timeout: 15000 });
      await el.click({ timeout: attempt < 2 ? 5000 : 15000 });
      return;
    } catch (e) {
      if (attempt < 2 && !sel.startsWith('.modal') && (await page.$('.modal'))) continue;
      // a toast over the button (a DM, a mention…): put the toasts away and try again
      if (attempt < 2 && (await page.$('.toast'))) { await page.evaluate(() => { const H = window.__hype; if (H) { H.S.toasts.forEach((t) => { t.until = 0; }); H.update(false); } }); await sleep(200); continue; }
      await page.screenshot({ path: path.join(OUT, 'fail.png') }).catch(() => {});
      throw new Error(`clickText(${sel}, ${text}): ${e.message.split('\n')[0]}`);
    }
  }
}
async function dismiss(page) { for (let k = 0; k < 6 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(700); } }
async function overflowCheck(page, label) {
  const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  if (w.sw > w.cw + 1) errors.push(`[overflow] ${label}: ${JSON.stringify(w)}`);
}
const G = (page, fn, arg) => page.evaluate(fn, arg);
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.cand || b.write || b.create); })) await sleep(300); };
let lastPage = null;

async function newPage(browser, pack, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true, colorScheme: 'light', acceptDownloads: true });
  await ctx.addInitScript(MOCK);
  if (pack) await ctx.addInitScript((p) => { window.__HYPE_TEST_PACK__ = p; }, pack);
  const page = await ctx.newPage();
  lastPage = page;
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const m = /^https:\/\/hype\.test\/pack\/([\w.-]+)$/.exec(url);
    if (m) return FILES[m[1]] ? route.fulfill({ status: 200, contentType: 'image/png', body: FILES[m[1]] }) : route.fulfill({ status: 404, body: '' });
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
}

(async () => {
  const browser = await chromium.launch();
  let { ctx, page } = await newPage(browser, TEST_PACK);
  const p0 = await G(page, () => ({ n: window.__hype.PACK.people.length, photos: Object.keys(window.__hype.PACK.photos).length }));
  check('the shipped pack is read: 15 people, 135 photos', p0.n === 15 && p0.photos === 135, p0);

  // ---------- a new game: a face for each main character, by gender, never twice ----------
  await newGame(page);
  await sleep(600);
  await shot(page, 'cast-with-faces');
  const cast = await G(page, () => {
    const H = window.__hype, g = H.S.ob.game, out = [];
    for (const id of g.order) { const c = g.chars[id]; if (c.kind !== 'main') continue; const p = H.faceOf(g, c); out.push({ h: c.handle, g: c.g, face: p && p.id, fg: p && p.g, ig: (c.ig || []).length }); }
    const prompt = window.__prompts.find((x) => /CRÉER L’UNIVERS/.test(x)) || '';
    return { out, imgs: [...document.querySelectorAll('.cast-card .av-photo img')].map((x) => x.getAttribute('src')), faces: (prompt.split('LES VISAGES DU JEU')[1] || '').split('\n').filter((l) => /^- [fmx]\d\d/.test(l)).length,
      profile: /- f01 \(femme\) : Passion jeux vidéo/.test(prompt) || /- f0\d \(femme\) : Passion jeux vidéo/.test(prompt), ask: /"face":"identifiant"/.test(prompt), mix: /Les dix :/.test(prompt) };
  });
  const faces = cast.out.map((x) => x.face);
  check('every main character has a face of their gender, all different, with an Insta past (0.29: the critic and Rebecca Silver too, twelve)', cast.out.length === 12 && faces.every(Boolean) && new Set(faces).size === faces.length
    && cast.out.every((x) => x.fg === x.g) && cast.out.every((x) => x.ig >= 2 && x.ig <= 4) && cast.imgs.length >= 5 && cast.imgs.every((s) => /^pack\/[fmx]\d\d-p\.png$/.test(s)), cast.out);
  const byHandle = Object.fromEntries(cast.out.map((x) => [x.h, x.face]));
  check('the world is written around the faces: the AI gets the 15 faces with their profiles and picks one per character (honoured by the game)',
    cast.faces === 15 && cast.profile && cast.ask && !cast.mix && byHandle['zara.vey'] === 'f07' && byHandle['theo.marlin'] === 'm06' && byHandle['nox.ombre'] === 'x02', { faces: cast.faces, profile: cast.profile, picked: byHandle });
  await page.locator('.cast-card.pick', { hasText: 'Théo' }).click();
  await page.click('.cast-cta button');
  await page.waitForSelector('.post');
  await sleep(1200);
  await dismiss(page);

  // ---------- Zara's Insta: the grid, a post, a double tap, back to the grid, a highlight ----------
  const zara = await G(page, () => window.__hype.charByHandle(window.__hype.S.game, 'zara.vey').id);
  await G(page, (id) => { window.__hype.S.stack = []; window.__hype.S.stack.push({ t: 'char', id, key: 'kz' }); window.__hype.update(); }, zara);
  await page.waitForSelector('.layer .soc-btn.is-ig');
  const soc = await page.textContent('.layer .soc-links');
  await shot(page, 'profile-with-socials');
  await page.click('.layer .soc-btn.is-ig');
  await page.waitForSelector('.layer .ig-grid .ig-cell img');
  await sleep(500);
  await shot(page, 'insta-grid');
  await overflowCheck(page, 'insta grid');
  const grid = await G(page, () => ({ cells: document.querySelectorAll('.layer .ig-grid .ig-cell').length, counts: document.querySelector('.layer .ig-counts').textContent, hl: document.querySelectorAll('.layer .ig-hl-it').length, title: document.querySelector('.layer .ig-title').textContent }));
  check('the profile links to an Insta-like page: header with counts, a grid of real photos, no highlights (they would show photos never posted)', /Instagram/.test(soc) && grid.cells >= 2 && /publications/.test(grid.counts) && /abonnés/.test(grid.counts) && grid.hl === 0 && /zara\.vey/.test(grid.title), { soc, grid });
  await page.click('.layer .ig-grid .ig-cell >> nth=0');
  await page.waitForSelector('.layer .ig-post .ig-media img');
  const likes0 = await page.textContent('.layer .ig-likes');
  await page.click('.layer .ig-media');
  await sleep(120);
  await page.click('.layer .ig-media');
  await sleep(400);
  await shot(page, 'insta-post-liked');
  const post = await G(page, (id) => { const c = window.__hype.S.game.chars[id]; return { likes: document.querySelector('.layer .ig-likes').textContent, cap: (document.querySelector('.layer .ig-txt p') || {}).textContent || '', liked: c.ig.some((e) => e.liked), burst: !!document.querySelector('.layer .ig-burst') }; }, zara);
  const n0 = parseInt(likes0.replace(/\D/g, ''), 10), n1 = parseInt(post.likes.replace(/\D/g, ''), 10);
  check('a post opens with its caption (an emoji for the past, never the description meant for the AI); a double tap likes it, with the heart', n1 === n0 + 1 && post.liked && post.burst && /zara\.vey/.test(post.cap) && !SET.some((x) => post.cap.includes(x.desc.slice(0, 20))), { likes0, post });
  await page.locator('.layer').last().locator('.layer-head .iconbtn').first().click();
  await sleep(300);
  const backToGrid = await G(page, () => !!document.querySelector('.layer .ig-grid') && document.querySelectorAll('.layer').length === 2);
  check('back goes from the post to the grid (not out of the page)', backToGrid, { backToGrid });

  // ---------- a TikTok-like slideshow ----------
  const tt = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const other = (x) => x.handle !== 'zara.vey'; // Zara's photos are kept for the feed below
    let c = H.mains(g).find((x) => other(x) && H.ttList(g, x, Date.now()).length);
    if (!c) { // no first slideshow at the start (not enough photos left): one now
      c = H.mains(g).find((x) => other(x) && H.faceOf(g, x) && Array.isArray(x.tt)) || H.mains(g).find((x) => other(x) && H.faceOf(g, x));
      if (!Array.isArray(c.tt)) c.tt = [];
      c.ig = []; g.posts = g.posts.filter((x) => !(x.a === 'c:' + c.id && x.photo && x.photo.img)); // its photos free again
      const phs = H.pickSlides(g, H.faceOf(g, c), H.gameDate(Date.now()));
      if (phs.length >= 3) H.makeSlides(g, c, phs, Date.now() - 3600000, 'mon week-end en photos', false);
    }
    return H.ttList(g, c, Date.now()).length ? c.id : null;
  });
  await G(page, (id) => { window.__hype.S.stack = [{ t: 'char', id, key: 'kt' }]; window.__hype.update(); }, tt);
  await page.waitForSelector('.layer .soc-btn.is-tt');
  await page.click('.layer .soc-btn.is-tt');
  await page.waitForSelector('.layer .tt .ss-fg');
  await sleep(3200);
  await shot(page, 'tiktok-slideshow');
  const slide = await G(page, () => ({ title: (document.querySelector('.layer .tt-title') || {}).textContent || '', done: document.querySelectorAll('.layer .ss-bars i.done').length, bars: document.querySelectorAll('.layer .ss-bars i').length, dark: !!document.querySelector('.layer-panel.dark'), music: (document.querySelector('.layer .tt-foot') || {}).textContent || '' }));
  check('some characters have TikTok-like slideshows: dark page, a title over the photos, the photos go by on their own', !!tt && slide.dark && slide.title.length > 5 && slide.bars >= 3 && slide.done >= 1 && /son original/.test(slide.music), slide);
  await G(page, () => { window.__hype.S.stack = []; window.__hype.update(); });

  // ---------- the choice by season and occasion, without any AI ----------
  const pick = await G(page, () => {
    const H = window.__hype, g = H.S.game, p = H.PACK.byId.f01;
    const run = (d, n = 30) => Array.from({ length: n }, () => H.pickPhoto(g, p, d, { vis: new Set() })).map((ph) => ph.id.split('-')[1]); // (0.29: whoever has f01 may have it on screen; the season is what is checked here)
    return { july: run(new Date(2026, 6, 10, 14)), halloween: run(new Date(2026, 9, 29, 21)), xmas: run(new Date(2026, 11, 20, 15)), april: run(new Date(2027, 3, 10, 21)), occ: H.occasionsAt(new Date(2026, 9, 29)), season: H.seasonOf(new Date(2026, 6, 1)) };
  });
  const only = (list, ok) => list.every((k) => ok.includes(k));
  const count = (list, k) => list.filter((x) => x === k).length;
  check('July: summer and all-year photos only (never the snow, the costume or the tree)', only(pick.july, ['1', '2', '5', '6', '7']) && pick.season === 'ete', pick.july.join(''));
  check('around Halloween the costume comes out; before Christmas the tree; never out of season', count(pick.halloween, '8') >= 24 && count(pick.xmas, '9') >= 24 && only(pick.xmas, ['1', '3', '5', '6', '7', '9']) && only(pick.april, ['1', '4', '5', '6', '7']) && pick.occ.includes('halloween'),
    { halloween: pick.halloween.join(''), xmas: pick.xmas.join(''), april: pick.april.join('') });

  // ---------- photos in the feed: chosen by the game, captioned by their character at the next update ----------
  const before = await G(page, (id) => { // nothing of hers on screen: every photo of hers can come out
    const H = window.__hype, g = H.S.game, z = g.chars[id];
    z.ig = []; if (Array.isArray(z.tt)) z.tt = []; g.posts = g.posts.filter((x) => !(x.a === 'c:' + id && x.photo && x.photo.img)); g.phQ = [];
    return z.ig.length;
  }, zara);
  const queued = await G(page, (id) => {
    const H = window.__hype, g = H.S.game;
    g.chars[id].phAt = Date.now() - 1000; H.tickPhotos(g, Date.now()); H.S.tab = 'feed'; H.update();
    const q = (g.phQ || []).find((x) => x.c === id && x.k === 'ph');
    return { q: q ? q.id : null, ph: q ? q.ph : null, posted: g.posts.some((x) => x.a === 'c:' + id && x.prog) };
  }, zara);
  await G(page, () => { const H = window.__hype; H.S.game.lastRefreshAt = 0; H.S.toasts.forEach((t) => { t.until = 0; }); H.update(); }); // no toast over the button
  const n0p = await G(page, () => window.__prompts.length);
  await clickText(page, '.feed-tools button', 'Actualiser');
  await idle(page);
  await sleep(1500);
  const fed = await G(page, ({ id, n0 }) => {
    const H = window.__hype, g = H.S.game, c = g.chars[id], p = g.posts.filter((x) => x.a === 'c:' + id && x.prog).pop();
    const el = p && document.querySelector(`.post[data-p="${p.id}"] .photo.real img`);
    const prompt = window.__prompts.slice(n0).find((x) => /PHOTOS QUI SORTENT/.test(x)) || '';
    const ph = p && H.PACK.photos[p.photo.img].ph;
    return { post: !!p, text: p ? p.text : '', img: el ? el.getAttribute('src') : '', ig: c.ig.length, cap: (c.ig.find((e) => e.p === (p && p.id)) || {}).cap || '', left: (g.phQ || []).length,
      asked: !!ph && prompt.includes(ph.desc) && prompt.includes(ph.tags[0]), next: c.phAt > Date.now() };
  }, { id: zara, n0: n0p });
  check('the game chooses a character’s photo by itself, and their character writes the caption at the next update (the description of that photo only)',
    !!queued.q && !queued.posted && fed.post && /GTA 7/.test(fed.text) && /^pack\/f\d\d-\d\.png$/.test(fed.img) && fed.ig === before + 1 && /GTA 7/.test(fed.cap) && fed.asked && fed.left === 0 && fed.next, { queued, fed });
  const ctxLine = await G(page, () => { const H = window.__hype; return (H.promptRefresh(H.S.game, 0, [], false, null, []).split('\n').find((l) => /\[(photo|carrousel de \d+ photos du même shooting) : /.test(l) && / — /.test(l)) || ''); });
  check('in the next prompts, a photo of the pack is its tags (and its description, for the two latest only)', /\[(?:photo|carrousel de \d+ photos du même shooting) : [^\]]+ — [^\]]+\]/.test(ctxLine), ctxLine.slice(0, 160));
  const fallback = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, p = H.faceOf(g, g.chars[id]);
    const ph = p.photos.find((x) => x.season === 'all');
    g.phQ = [{ id: 'qold', k: 'ph', c: id, ph: ph.id, at: Date.now() - 3600000, queuedAt: Date.now() - 50 * 60000 }];
    H.tickPhotos(g, Date.now());
    const post = g.posts.filter((x) => x.a === 'c:' + id && x.prog && x.photo.img === ph.id).pop();
    return { text: post ? post.text : null, left: g.phQ.length, emoji: H.emojiCaption(ph) };
  }, zara);
  check('no update for 45 minutes (or no cafés): the photo goes out with an emoji, no AI', fallback.text === fallback.emoji && fallback.left === 0, fallback);
  await page.locator('.post .photo.real').first().scrollIntoViewIfNeeded();
  await shot(page, 'feed-real-photo');
  await page.click('.post .photo.real >> nth=0');
  await page.waitForSelector('.layer .ig-post');
  const opened = await G(page, () => !!document.querySelector('.layer .ig-post .ig-media img'));
  await G(page, () => { window.__hype.S.stack = []; window.__hype.update(); });
  const ai = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    const z = H.charByHandle(g, 'zara.vey'); // nothing of hers on screen: every photo can come out
    z.ig = []; z.tt = z.tt ? [] : z.tt; g.posts = g.posts.filter((p) => !(p.a === 'c:' + z.id && p.photo && p.photo.img));
    const a = H.addAmbientPost(g, { by: 'zara.vey', text: 'meilleure soirée depuis longtemps', photo: 'la soirée d’hier avec la bande' }, t, t);
    const b = H.addAmbientPost(g, { by: 'zara.vey', text: 'regardez ce truc', photo: 'le chaudron qui fume en salle 3' }, t + 1, t + 1);
    const m = H.addAmbientPost(g, { by: 'gazette_lumen', text: 'exclu', photo: 'la soirée d’hier au réfectoire' }, t + 2, t + 2);
    const ph = a && a.photo.img && H.PACK.photos[a.photo.img].ph;
    return { a: a && a.photo.img, keys: ph ? ph.keys : [], b: b && (b.photo.img || null), media: m ? (m.photo.img || null) : 'none' };
  });
  check('a post the AI writes « with a photo »: the character’s real photo when its tags show what is said, the illustrated card otherwise', opened && !!ai.a && ai.keys.includes('soiree') && ai.b === null && (ai.media === null || ai.media === 'none'), ai);
  const tags = await G(page, () => {
    const H = window.__hype, ph = H.cleanPhoto({ id: 't1', file: 't1.png', tags: ['Jeu Vidéo', '#Marrant', 'halloween'] }, false);
    const old = H.cleanPhoto({ id: 't2', file: 't2.png', places: ['soiree', 'plage'], occ: ['noel'] }, false);
    return { keys: ph.keys, mood: ph.mood, occ: ph.occ, tags: ph.tags, old: old.tags, hint: H.hintTags('en pleine partie sur la console, mort de rire').keys };
  });
  check('free tags are understood through families of words (jeu vidéo → gaming, marrant → a mood, halloween → its date); old labels become tags',
    tags.keys.includes('gaming') && tags.mood.includes('joyeux') && tags.occ.includes('halloween') && tags.tags.join() === 'jeu vidéo,marrant,halloween' && tags.old.join() === 'soirée,plage,noël' && tags.hint.includes('gaming'), tags);
  const mood = await G(page, () => {
    const H = window.__hype, g = H.S.game, p = H.PACK.byId.f01, d = new Date(2026, 3, 10, 21); // an evening of April
    for (const c of H.mains(g, false)) if (c.fixed) { c.ig = []; c.tt = []; } // (0.29: the roles' Insta past takes nothing of f01 on screen here)
    const run = (m) => Array.from({ length: 30 }, () => H.pickPhoto(g, p, d, { mood: m }).id.split('-')[1]);
    return { down: run('down'), none: run(null) };
  });
  check('a character in a bad buzz posts a serious photo rather than a laughing one (on a normal evening: the party)', !mood.down.some((k) => k === '5' || k === '6') && mood.down.filter((k) => k === '7').length >= 20 && mood.none.filter((k) => k === '5').length >= 20, { down: mood.down.join(''), none: mood.none.join('') });

  // ---------- series, the week of their pages, nothing seen twice, carousels ----------
  const shots = await G(page, () => {
    const H = window.__hype, g = H.S.game, p = H.PACK.byId.f01, d = new Date(2027, 3, 10, 14);
    const p7 = H.PACK.photos['f01-7'].ph;
    const free = H.pickPhoto(g, p, d, { among: [p7] });
    const t = Date.now();
    const post = H.addAmbientPost(g, { by: 'gazette_lumen', text: 'une photo du café de f01', photo: 'un café' }, t, t);
    post.photo.img = 'f01-1'; // on screen now: the café (its shoot: the café and the selfie)
    const vis = [...H.visibleShots(g)].filter((k) => k.startsWith('f01'));
    const seen = H.pickPhoto(g, p, d, { among: [p7] });
    g.posts = g.posts.filter((x) => x !== post);
    return { free: free && free.id, seen: seen && seen.id, vis, mates: H.carouselOf(H.PACK.photos['f01-1'].ph, d), sk: p7.sk };
  });
  check('a series is one shoot: while one of its photos is on screen, none of the others comes out; a carousel takes the rest of the shoot',
    shots.free === 'f01-7' && shots.seen === null && shots.vis.join() === 'f01:s1' && shots.mates.join() === 'f01-7' && shots.sk === 'f01:s1', shots);
  const win = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin'), p = H.faceOf(g, c), t = Date.now();
    c.ig = [];
    const busy = H.visibleShots(g, t); // on screen elsewhere (a slideshow of his, the feed): left aside
    const [old, recent] = p.photos.filter((x) => !x.sk && !busy.has(x.id));
    c.ig = [{ id: 'iold', ph: old.id, at: t - 8 * 86400000, lk: 10, cm: [] }, { id: 'inew', ph: recent.id, at: t - 2 * 86400000, lk: 10, cm: [] }];
    const vis = H.visibleShots(g);
    return { grid: H.igList(g, c, t).map((e) => e.id), oldSeen: vis.has(old.sk || old.id), newSeen: vis.has(recent.sk || recent.id) };
  });
  check('their Insta keeps about a week of game time: older posts are gone from the page, and only then can their photos come back',
    win.grid.join() === 'inew' && !win.oldSeen && win.newSeen, win);
  const car = await G(page, () => {
    const H = window.__hype, g = H.S.game, z = H.charByHandle(g, 'zara.vey'), p = H.faceOf(g, z);
    const a = p.photos[0], b = p.photos[6]; // her series: the café and the selfie
    z.ig = []; g.posts = g.posts.filter((x) => !(x.a === 'c:' + z.id && x.photo && x.photo.img)); g.phQ = [];
    const post = H.publishQueued(g, { id: 'qcar', k: 'ph', c: z.id, ph: a.id, more: [b.id], at: Date.now() - 60000, queuedAt: Date.now() }, 'shooting du dimanche 📸');
    H.S.stack = []; H.S.tab = 'feed'; window.scrollTo(0, 0); H.S.feedAtTop = true; H.S.feedSeenAt = Date.now() + 60000; H.update();
    return { more: post && post.photo.more, ig: (z.ig.slice(-1)[0] || {}).more, id: post && post.id, b: b.id };
  });
  await sleep(1300);
  await page.locator(`.post[data-p="${car.id}"]`).scrollIntoViewIfNeeded();
  const carUI = await G(page, (id) => { const el = document.querySelector(`.post[data-p="${id}"] .carousel`); return el ? { slides: el.querySelectorAll('.car-slide img').length, count: el.querySelector('.car-count').textContent, dots: el.querySelectorAll('.car-dots i').length } : null; }, car.id);
  await shot(page, 'feed-carousel');
  await G(page, (id) => { const tr = document.querySelector(`.post[data-p="${id}"] .car-track`); tr.scrollTo({ left: tr.clientWidth }); }, car.id);
  await sleep(600);
  const swiped = await G(page, (id) => document.querySelector(`.post[data-p="${id}"] .car-count`).textContent, car.id);
  await G(page, (id) => { window.__hype.S.stack = [{ t: 'insta', id, key: 'kc' }]; window.__hype.update(); }, zara);
  await page.waitForSelector('.layer .ig-cell .ig-multi');
  await page.click('.layer .ig-cell >> nth=0');
  await page.waitForSelector('.layer .ig-media .carousel');
  await sleep(300);
  await shot(page, 'insta-carousel');
  const igCar = await G(page, () => document.querySelectorAll('.layer .ig-media .car-slide img').length);
  check('a series as a carousel: swiped in the feed (1/2, then 2/2), marked in the Insta grid, opened as a carousel',
    car.more && car.more.join() === car.b && car.ig && car.ig.join() === car.b && carUI && carUI.slides === 2 && /1\/2/.test(carUI.count) && carUI.dots === 2 && /2\/2/.test(swiped) && igCar === 2, { car, carUI, swiped, igCar });
  await G(page, () => { window.__hype.S.stack = []; window.__hype.update(); });

  // ---------- a newcomer: the free faces with their profiles, the face the AI picks ----------
  const later = await G(page, async () => {
    const H = window.__hype, g = H.S.game;
    const used = new Set(Object.values(g.faces || {})); // (0.29: the critic and Rebecca take faces of their own, drawn per game)
    const free = H.packPool(H.STYLE_OF(g)).filter((x) => !used.has(x.id)).map((x) => x.id);
    const pn = H.promptNewChar(g);
    await H.genNewChar(null);
    const c = H.charByHandle(g, 'cassio.rhune');
    return { free, list: (pn.split('LES VISAGES DU JEU')[1] || '').split('\n').filter((l) => /^- [fmx]\d\d/.test(l)).map((l) => l.slice(2, 5)), face: c && g.faces[c.id], g: c && c.g, lastF: free.filter((id) => id[0] === 'f').pop() };
  });
  check('a newcomer: the AI sees only the faces still free (with their profiles) and the game gives the one it picks', later.list.length >= 2 && later.list.join() === later.free.join() && later.face === later.lastF && later.g === 'f', later);
  const gender = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const mk = (id, gd) => { const c = { id, kind: 'main', g: gd, handle: id, name: id, unlocked: true, rel: 0 }; g.chars[id] = c; return c; };
    const taken = new Set(Object.values(g.faces || {}));
    const f = H.PACK.people.find((p) => p.g === 'f' && !taken.has(p.id));
    const man = mk('cman', 'm'), woman = mk('cwoman', 'f');
    const a = H.assignFace(g, man, f && f.id), b = H.assignFace(g, woman, f && f.id);
    const ask = H.facesAsk('moderne');
    const out = { f: f && f.id, man: a ? a.id : null, manFace: a ? a.g : null, manG: man.g, woman: b ? b.id : null, ask: /un visage de femme est une femme \("g":"f"/.test(ask) && /une créatrice, pas un créateur/.test(ask) };
    delete g.faces.cman; delete g.faces.cwoman; delete g.chars.cman; delete g.chars.cwoman;
    return out;
  });
  check('a face is never given to a character of the other gender (told to the AI, and checked): a man written for a woman’s face gets a face of his own, that face goes to a woman',
    !!gender.f && gender.man !== gender.f && gender.manFace !== 'f' && gender.manG === 'm' && gender.woman === gender.f && gender.ask, gender);

  // ---------- the photos setting: emojis instead ----------
  await page.click('.gear-btn:visible');
  await page.waitForSelector('.layer .section');
  const setText = await page.textContent('.layer');
  await clickText(page, '.layer .seg button', 'Emojis');
  await sleep(300);
  const off = await G(page, (id) => ({ face: !!window.__hype.faceOf(window.__hype.S.game, window.__hype.S.game.chars[id]), imgs: document.querySelectorAll('.post .av-photo img').length }), zara);
  await clickText(page, '.layer .seg button', 'Photos');
  await sleep(300);
  const on = await G(page, (id) => !!window.__hype.faceOf(window.__hype.S.game, window.__hype.S.game.chars[id]), zara);
  check('settings: « Photos des persos » counts the pack; « Emojis » puts the photos away, « Photos » brings them back', /15 personnes et 135 photos/.test(setText) && !off.face && off.imgs === 0 && on, { off, on });
  await page.click('.layer-head .iconbtn >> nth=-1');

  // ---------- wide screen: the Insta page in the middle column ----------
  await page.setViewportSize({ width: 1280, height: 860 });
  await G(page, (id) => { window.__hype.S.stack = [{ t: 'insta', id, key: 'kw' }]; window.__hype.update(); }, zara);
  await page.waitForSelector('.layer .ig-grid img');
  await sleep(400);
  await shot(page, 'insta-wide');
  await G(page, (id) => { window.__hype.S.stack = [{ t: 'tiktok', id, key: 'kw2' }]; window.__hype.update(); }, tt);
  await page.waitForSelector('.layer .tt .ss-fg');
  await sleep(500);
  await shot(page, 'tiktok-wide');
  await ctx.close();

  // ---------- the hidden atelier: creator mode, a person, photos, labels, preview, export, import ----------
  ({ ctx, page } = await newPage(browser, TEST_PACK, { width: 1100, height: 900 }));
  const shown0 = await G(page, () => !![...document.querySelectorAll('button')].find((b) => /Atelier photos/.test(b.textContent)));
  for (let k = 0; k < 7; k++) { await page.click('.app-version'); await sleep(90); }
  await page.waitForSelector('text=Atelier photos');
  const toastTxt = await G(page, () => [...document.querySelectorAll('.toast')].map((x) => x.textContent).join(' | '));
  check('creator mode: hidden at first; 7 taps on the version number show the « Atelier photos »', !shown0 && /Mode créateur activé/.test(toastTxt), toastTxt);
  await clickText(page, 'button', 'Atelier photos');
  await page.waitForSelector('.atelier');
  await clickText(page, '.at-add button', 'Femme');
  await page.waitForSelector('.at-person');
  await page.setInputFiles('.at-person .at-ph-head input[type=file]', { name: 'portrait.png', mimeType: 'image/png', buffer: png(300, 300, 12) });
  await page.waitForSelector('.at-portrait img');
  await page.setInputFiles('.at-drop input[type=file]', [
    { name: 'plage-ete.png', mimeType: 'image/png', buffer: png(400, 500, 200) },
    { name: 'gaming-marrant-soir.png', mimeType: 'image/png', buffer: png(600, 500, 300) },
    { name: 'cafe.png', mimeType: 'image/png', buffer: png(500, 800, 40) },
  ]);
  await page.waitForFunction(() => document.querySelectorAll('.at-photo img').length === 3, null, { timeout: 15000 });
  await page.waitForSelector('.at-ask');
  const askTxt = await page.textContent('.at-ask');
  await page.locator('.at-ask').scrollIntoViewIfNeeded();
  await shot(page, 'atelier-ask-series');
  await clickText(page, '.at-ask button', 'Non, des photos séparées');
  await sleep(300);
  const askGone = await G(page, () => !document.querySelector('.at-ask') && window.__hype.S.atelier.meta.people[0].photos.every((x) => !x.set));
  check('several photos at once: the atelier asks whether they are one shoot; « Non » keeps them apart', /Ces 3 photos vont ensemble/.test(askTxt) && askGone, { askTxt, askGone });
  const third = page.locator('.at-photo').nth(2);
  await third.locator('.at-desc textarea').fill('Brunch en terrasse, croissant à la main, pull crème, grand sourire.');
  await third.locator('.tag-in').fill('dimanche'); // typed, not validated: the click on a suggestion keeps it too
  await third.locator('.tag-sug .chip-btn', { hasText: 'joyeux' }).click();
  await third.locator('.tag-in').fill('copains, ');
  await page.locator('.at-photo').nth(0).locator('.tag .iconbtn, .tag button').first().click(); // the guessed « plage » removed…
  await page.locator('.at-photo').nth(0).locator('.tag-sug .chip-btn', { hasText: 'plage' }).click(); // …and put back with one click
  await page.fill('.at-person .at-fields input >> nth=1', 'cheveux courts roux, taches de rousseur');
  await page.fill('.at-profile textarea', 'Fan de brunchs et de jeux vidéo, toujours de bonne humeur, déteste le sport.');
  await sleep(1200);
  await shot(page, 'atelier');
  await overflowCheck(page, 'atelier');
  const meta = await G(page, async () => { const m = await window.__hype.Store.read('pk_meta'); return m; });
  const P = meta && meta.people[0];
  const ph = P ? P.photos : [];
  check('the atelier: a new person (an id the shipped pack does not use), a profile, a profile photo, three photos with tags guessed from the file names, the creator’s own tags and a description for the AI, saved',
    P && P.id === 'f08' && P.g === 'f' && !!P.portrait && /brunchs/.test(P.profile) && ph.length === 3 && ph[0].season === 'ete' && ph[0].tags.join() === 'plage'
    && ph[1].moment === 'soir' && ph[1].tags.join() === 'gaming,marrant' && ph[2].tags.join() === 'café,dimanche,joyeux,copains' && /croissant/.test(ph[2].desc) && P.look === 'cheveux courts roux, taches de rousseur', P);
  const img = await G(page, async (id) => { const b = await window.__hype.Store.read('pk_img_' + id); const im = new Image(); im.src = b.data; await im.decode(); return { type: b.data.slice(0, 16), w: im.naturalWidth, h: im.naturalHeight }; }, ph[0] && ph[0].id);
  check('the photos are cropped to the portrait format of the feed (4:5), at most 720 × 900, never blown up', img.w * 5 === img.h * 4 || Math.abs(img.w / img.h - 0.8) < 0.01, img);
  await clickText(page, '.at-tools button', 'Aperçu');
  await page.waitForSelector('.at-preview .ig-grid .ig-cell img');
  await sleep(300);
  await shot(page, 'atelier-preview');
  await page.click('.at-preview .ig-cell >> nth=1');
  await page.waitForSelector('.at-preview .ig-post');
  const prev = await G(page, () => ({ cells: 3, caps: (document.querySelector('.at-preview .ig-txt p') || {}).textContent || '' }));
  await page.click('.at-preview .at-prev-h .iconbtn >> nth=-1');
  const local = await G(page, () => ({ n: window.__hype.PACK.people.length, local: window.__hype.PACK.local, f08: !!window.__hype.PACK.byId.f08 }));
  check('the preview shows the person as in the game (tags in place of the caption her character will write); she already plays in the creator’s own games', prev.cells === 3 && /#gaming #marrant/.test(prev.caps) && local.n === 16 && local.local === 1 && local.f08, { prev, local });
  // in the browser the export button only says where to export (the desktop app's file dialog is tested in desktop/test/e2e.mjs)
  await clickText(page, '.at-pack button', 'Exporter le pack');
  await sleep(300);
  const where = await G(page, () => [...document.querySelectorAll('.toast')].map((x) => x.textContent).join(' | '));
  const exportFile = path.join(OUT, 'export-pack.json');
  fs.writeFileSync(exportFile, await G(page, () => window.__hype.packExportText()));
  const exp = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
  check('the pack as one file (format hype-pack v2) with the person, her profile, the tags, the descriptions and the images inside', exp.format === 'hype-pack' && exp.v === 2 && exp.people.length === 1 && /brunchs/.test(exp.people[0].profile) && exp.people[0].photos.length === 3 && exp.people[0].photos[2].tags.length === 4 && /croissant/.test(exp.people[0].photos[2].desc) && /^data:image\//.test(exp.people[0].portrait) && exp.people[0].photos.every((x) => /^data:image\//.test(x.img)) && /appli PC/.test(where),
    { format: exp.format, people: exp.people.length, photos: exp.people[0] && exp.people[0].photos.length, where });
  await clickText(page, '.at-pack button', 'Tout effacer');
  await clickText(page, '.at-pack button', 'Oui, tout effacer');
  await sleep(600);
  const wiped = await G(page, async () => ({ meta: (await window.__hype.Store.read('pk_meta')).people.length, n: window.__hype.PACK.people.length }));
  await page.setInputFiles('.at-pack input[type=file]', exportFile);
  await page.waitForFunction(() => window.__hype.S.atelier.meta.people.length === 1, null, { timeout: 15000 });
  await sleep(500);
  const back = await G(page, async () => { const m = window.__hype.S.atelier.meta.people[0]; const b = await window.__hype.Store.read('pk_img_' + m.photos[0].id); return { photos: m.photos.length, desc: m.photos[2].desc, tags: m.photos[2].tags, profile: m.profile, img: !!(b && b.data), n: window.__hype.PACK.people.length }; });
  check('« Tout effacer » empties the atelier; « Importer un pack » brings everything back', wiped.meta === 0 && wiped.n === 15 && back.photos === 3 && /croissant/.test(back.desc) && back.tags.length === 4 && /brunchs/.test(back.profile) && back.img && back.n === 16, { wiped, back });
  // grouping photos already in the atelier into a series
  await clickText(page, '.at-tools button', 'Grouper en série');
  await page.locator('.at-photo').nth(0).locator('.at-tick input').check();
  await page.locator('.at-photo').nth(1).locator('.at-tick input').check();
  await clickText(page, '.at-pickbar button', 'Faire une série');
  await sleep(700);
  await page.locator('.at-series').scrollIntoViewIfNeeded();
  await shot(page, 'atelier-series');
  const ser = await G(page, () => { const m = window.__hype.S.atelier.meta.people[0]; return { sets: m.photos.map((x) => x.set || '-').join(), same: m.photos[0].season === m.photos[1].season && m.photos[0].moment === m.photos[1].moment, block: (document.querySelector('.at-series-h') || {}).textContent || '', inPack: window.__hype.PACK.sets[m.id + ':s1'] }; });
  check('« Grouper en série »: two photos ticked become a series (one season and one moment for both), shown together, and the game knows it',
    ser.sets === 's1,s1,-' && ser.same && /Série · 2 photos/.test(ser.block) && !!ser.inPack && ser.inPack.length === 2, ser);
  await clickText(page, '.at-tools button', 'Aperçu');
  await page.waitForSelector('.at-preview .ig-grid .ig-cell img');
  await sleep(300);
  const pv = await G(page, () => ({ cells: document.querySelectorAll('.at-preview .ig-cell').length, multi: document.querySelectorAll('.at-preview .ig-multi').length }));
  await page.click('.at-preview .at-prev-h .iconbtn >> nth=-1');
  const exp2 = JSON.parse(await G(page, () => window.__hype.packExportText()));
  const exportFile2 = path.join(OUT, 'export-series.json');
  fs.writeFileSync(exportFile2, JSON.stringify(exp2));
  check('the preview shows the series as one carousel; the export keeps it', pv.cells === 2 && pv.multi === 1 && exp2.people[0].photos.map((x) => x.set).join() === 's1,s1,', { pv, sets: exp2.people[0].photos.map((x) => x.set) });
  await clickText(page, '.at-series-h button', 'Défaire la série');
  await sleep(300);
  const undone = await G(page, () => window.__hype.S.atelier.meta.people[0].photos.every((x) => !x.set) && !document.querySelector('.at-series'));
  check('« Défaire la série » puts the photos apart again', undone, undone);
  // a pack made with the 0.8.0 atelier (fixed labels): its labels become tags
  const v1 = { format: 'hype-pack', v: 1, people: [{ id: 'm09', g: 'm', style: 'moderne', label: 'Ancien', portrait: exp.people[0].portrait, photos: [{ id: 'm09-1', season: 'all', moment: 'all', places: ['soiree', 'sport'], occ: ['noel'], desc: 'ancienne légende', img: exp.people[0].photos[0].img }] }] };
  const v1File = path.join(OUT, 'export-v1.json');
  fs.writeFileSync(v1File, JSON.stringify(v1));
  await page.setInputFiles('.at-pack input[type=file]', v1File);
  await page.waitForFunction(() => window.__hype.S.atelier.meta.people[0].id === 'm09', null, { timeout: 15000 });
  const oldTags = await G(page, () => window.__hype.S.atelier.meta.people[0].photos[0].tags.join());
  check('a pack from the first atelier (fixed labels) is read: its labels become tags', oldTags === 'soirée,sport,noël', oldTags);
  await ctx.close();

  // ---------- tools/pack.py and build.py on that export ----------
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hype-pack-'));
  const outPack = path.join(tmp, 'pack'), outPage = path.join(tmp, 'hype.html');
  const log = execFileSync('python3', [path.join(ROOT, 'tools', 'pack.py'), exportFile, '--out', outPack], { encoding: 'utf8' });
  const man = JSON.parse(fs.readFileSync(path.join(outPack, 'manifest.json'), 'utf8'));
  const files = fs.readdirSync(outPack);
  execFileSync('python3', [path.join(ROOT, 'build.py')], { env: Object.assign({}, process.env, { HYPE_PACK_DIR: outPack, HYPE_OUT: outPage }), encoding: 'utf8' });
  const built = fs.readFileSync(outPage, 'utf8');
  const out1 = path.join(tmp, 'pack1');
  execFileSync('python3', [path.join(ROOT, 'tools', 'pack.py'), v1File, '--out', out1], { encoding: 'utf8' });
  const man1 = JSON.parse(fs.readFileSync(path.join(out1, 'manifest.json'), 'utf8'));
  const out2 = path.join(tmp, 'pack2');
  execFileSync('python3', [path.join(ROOT, 'tools', 'pack.py'), path.join(OUT, 'export-series.json'), '--out', out2], { encoding: 'utf8' });
  const man2 = JSON.parse(fs.readFileSync(path.join(out2, 'manifest.json'), 'utf8'));
  check('tools/pack.py turns the export into image files and a manifest (profile, tags, descriptions; old labels as tags); build.py writes that list into the game',
    man.people.length === 1 && /brunchs/.test(man.people[0].profile) && man.people[0].photos.length === 3 && man.people[0].photos[2].tags.length === 4 && /croissant/.test(man.people[0].photos[2].desc) && files.length === 5
    && man1.people[0].photos[0].tags.join() === 'soirée,sport,noël' && man2.people[0].photos.map((x) => x.set).join() === 's1,s1,' && /"id": ?"f08"/.test(built) && !/people: \[\] \/\*@pack\*\//.test(built) && /Pack : 1 personne \(1 femme/.test(log), { log: log.split('\n')[0], files, v1: man1.people[0].photos[0].tags });

  // ---------- the pack shipped with this build (assets/pack/, when there is one): its people play, its images are served ----------
  const shippedFile = path.join(ROOT, 'assets', 'pack', 'manifest.json');
  if (fs.existsSync(shippedFile)) {
    const shipped = JSON.parse(fs.readFileSync(shippedFile, 'utf8'));
    ({ ctx, page } = await newPage(browser, null));
    const sh = await G(page, () => { const P = window.__hype.PACK; return { n: P.bundled, local: P.local, photos: Object.keys(P.photos).length, ids: P.people.map((p) => p.id).join(), src: window.__hype.portraitSrc(P.people[0]) }; });
    const want = shipped.people.reduce((n, p) => n + p.photos.length, 0);
    const onDisk = shipped.people.every((p) => fs.existsSync(path.join(ROOT, 'assets', 'pack', p.portrait)) && p.photos.every((x) => fs.existsSync(path.join(ROOT, 'assets', 'pack', x.file))));
    check(`the pack shipped with this build is in the page: ${shipped.people.length} people, ${want} photos, every image next to it`,
      sh.n === shipped.people.length && sh.local === 0 && sh.photos === want && sh.ids === shipped.people.map((p) => p.id).join() && sh.src === 'pack/' + shipped.people[0].portrait && onDisk, sh);
    await ctx.close();
  }

  // ---------- no pack at all (the game before its first pack): emojis, no Insta, nothing breaks ----------
  ({ ctx, page } = await newPage(browser, { v: 1, people: [] }));
  await newGame(page);
  await page.locator('.cast-card.pick', { hasText: 'Théo' }).click();
  await page.click('.cast-cta button');
  await page.waitForSelector('.post');
  await sleep(800);
  await dismiss(page);
  const none = await G(page, () => { const H = window.__hype, g = H.S.game, z = H.charByHandle(g, 'zara.vey'); H.tickPhotos(g, Date.now() + 9e7); return { face: H.faceOf(g, z), imgs: document.querySelectorAll('.av-photo img').length, mix: /Les dix/.test(window.__prompts.join('\n')) }; });
  check('without a pack: emojis as before, no gender imposed, no photo posts', none.face === null && none.imgs === 0 && !none.mix, none);
  await ctx.close();

  await browser.close();
  console.log('ERRORS', errors.join('\n'));
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  console.log(`\n${checks.filter((c) => c[0] === 'PASS').length}/${checks.length} PASS`);
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch(async (e) => {
  console.error('FAILED', e);
  if (lastPage) await lastPage.screenshot({ path: path.join(OUT, 'fail.png') }).catch(() => {});
  console.log('ERRORS', errors.join('\n'));
  process.exit(1);
});
