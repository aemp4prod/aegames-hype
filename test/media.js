// The player's own photos (0.9.1) end to end, in Chromium against the built hype.html with the mocked Claude runtime:
// one real photo in a post, a carousel (ten photos at most), a TikTok-like slideshow; what the AI reads (what the player
// says the photos show, never the images); where they live (this browser's own storage, never the shared documents);
// the player's own Insta-like and TikTok-like pages; a photo gone from this device (its description instead); a game
// exported and imported (photos inside the file, copies of their own), a deleted game (its photos with it); the photos
// of a composer closed without publishing (cleared at a later start, after half a day).
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/media.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-media');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(path.join(ROOT, 'hype.html'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const UMD = fs.readFileSync(process.env.UMD, 'utf8');
const SKELETON = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;

/* ---------- small striped PNGs, as photos ---------- */
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
const file = (name, w, h, hue) => ({ name, mimeType: 'image/png', buffer: png(w, h, hue) });

const errors = [];
const checks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 0.15: the pen steps aside while the feed scrolls down; a player scrolls back up, a test brings it back
const clickFab = async (page, opts) => { await page.evaluate(() => { const H = window.__hype; if (H && H.S.fabAway) { H.S.fabAway = false; H.update(false); } }); await page.click('.fab', opts); };
let shotN = 0, lastPage = null;
const check = (name, ok, info) => { checks.push([ok ? 'PASS' : 'FAIL', name]); console.log(ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)); };
async function shot(page, name) { await dismiss(page); shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
const clearToasts = (page) => page.evaluate(() => { const H = window.__hype; if (H) { H.S.toasts.forEach((t) => { t.until = 0; }); H.update(false); } });
async function clickText(page, sel, text) {
  const el = page.locator(sel, { hasText: text }).first();
  for (let attempt = 0; ; attempt++) {
    try {
      if (!sel.startsWith('.modal')) for (let k = 0; k < 4 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(700); }
      await el.waitFor({ state: 'visible', timeout: 15000 });
      await el.click({ timeout: attempt < 2 ? 5000 : 15000 });
      return;
    } catch (e) {
      if (attempt < 2 && !sel.startsWith('.modal') && (await page.$('.modal'))) continue;
      if (attempt < 2 && (await page.$('.toast'))) { await clearToasts(page); await sleep(200); continue; }
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

async function newPage(browser, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true, colorScheme: 'light' });
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
const closeAll = (page) => G(page, () => { const H = window.__hype; H.S.stack = []; H.update(); });
async function openComposer(page) {
  for (let k = 0; ; k++) { // a level-up or a newcomer can pop up at any moment: put it away and try again
    await dismiss(page);
    await closeAll(page);
    await G(page, () => { const H = window.__hype; H.S.tab = 'feed'; H.update(); });
    try { await clickFab(page, { timeout: 4000 }); break; } catch (e) { if (k >= 3) throw e; }
  }
  await page.waitForSelector('#compose');
  await clickText(page, '.layer .ideas button', 'Photo');
  await page.waitForSelector('.layer .pics-box input[type=file]', { state: 'attached' });
}
async function addFiles(page, files, n) {
  await page.setInputFiles('.layer .pics-box input[type=file]', files);
  await page.waitForFunction((k) => !window.__hype.S.picBusy && document.querySelectorAll('.layer .pics .pic img').length === k, n, { timeout: 30000 });
}
async function publish(page) {
  await clickText(page, '.layer-head button', 'Publier');
  await sleep(800);
  await idle(page, 30000);
  await sleep(1500);
  await dismiss(page);
}
const lastMine = (page) => G(page, () => {
  const g = window.__hype.S.game, p = g.posts.filter((x) => x.a === 'p').sort((a, b) => b.ts - a.ts)[0];
  return p ? { id: p.id, own: (p.photo && p.photo.own) || [], diapo: !!(p.photo && p.photo.diapo), desc: p.photo ? p.photo.desc : '', text: p.text, replies: p.replies.length, pending: !!p.pending } : null;
});
const actPrompt = (page, n0) => G(page, (n) => window.__prompts.slice(n).filter((x) => x.includes('Le joueur publie ce post')).pop() || '', n0);
const stored = (page, ids) => G(page, async (list) => { const H = window.__hype; return Promise.all(list.map(async (id) => { delete H.MEDIA[id]; const d = await H.mediaGet(id); return d ? d.slice(0, 15) : null; })); }, ids);

(async () => {
  const browser = await chromium.launch();
  let { page } = await newPage(browser);
  await newGame(page);
  await page.locator('.cast-card.pick', { hasText: 'Théo' }).click();
  await page.click('.cast-cta button');
  await page.waitForSelector('.post');
  await sleep(1200);
  await dismiss(page);

  // ---------- one real photo ----------
  await openComposer(page);
  const empty = await G(page, () => ({ btn: document.querySelector('.layer .pics-box .btn').textContent, note: document.querySelector('.layer .pics-box > small').textContent, label: document.querySelector('.layer .photo-input label').textContent }));
  await addFiles(page, [file('terrasse.png', 1200, 900, 30)], 1);
  await page.fill('#photo-desc', 'moi en terrasse avec mes potes, lunettes de soleil');
  await page.fill('#compose', 'premier soleil de l’année ☀️');
  await sleep(300);
  const c1 = await G(page, () => ({ label: document.querySelector('.layer .photo-input label').textContent, card: !!document.querySelector('.layer .composer-main > .photo'), seg: !!document.querySelector('.layer .pics-box .seg'), btn: document.querySelector('.layer .pics-box .btn').textContent, note: document.querySelector('.layer .pics-box > small').textContent }));
  await shot(page, 'compose-one-photo');
  await overflowCheck(page, 'composer with a photo');
  check('the composer: « Photo », then « Ajouter tes vraies photos »; with one, the description is what the characters read (no drawn card, no carousel choice)',
    /Ajouter tes vraies photos/.test(empty.btn) && /restent sur cet appareil/.test(empty.note) && /Décris ta photo/.test(empty.label)
    && /Ce qu’on voit \(c’est ce que lisent les persos\)/.test(c1.label) && !c1.card && !c1.seg && /Ajouter des photos/.test(c1.btn) && /les persos ne lisent que ta description/.test(c1.note), { empty, c1 });
  const n0 = await G(page, () => window.__prompts.length);
  await publish(page);
  const p1 = await lastMine(page);
  const pr1 = await actPrompt(page, n0);
  const f1 = await G(page, async (a) => {
    const H = window.__hype, id = a.own[0];
    const el = document.querySelector(`.post[data-p="${a.id}"] .photo.real img`);
    delete H.MEDIA[id]; // read back from this browser's own storage
    const data = await H.mediaGet(id);
    const im = new Image(); im.src = data; await im.decode();
    H.update();
    const docs = Object.keys(localStorage).filter((k) => (localStorage.getItem(k) || '').includes('data:image'));
    return { src: el ? el.getAttribute('src').slice(0, 15) : '', type: (data || '').slice(0, 15), w: im.naturalWidth, h: im.naturalHeight, docs,
      leak: window.__prompts.some((x) => x.includes('data:image') || x.includes(';base64,')), media: (H.S.game.media || []).includes(id) };
  }, p1);
  await sleep(500);
  await page.locator(`.post[data-p="${p1.id}"]`).scrollIntoViewIfNeeded();
  await shot(page, 'feed-own-photo');
  check('published: the real photo in the feed; the AI reads « Avec une PHOTO » and the description, never the image; the characters react',
    p1.own.length === 1 && !p1.diapo && f1.src === 'data:image/webp' && pr1.includes('Avec une PHOTO. Ce qu’on voit : « moi en terrasse avec mes potes, lunettes de soleil »') && !f1.leak && p1.replies >= 1, { p1, f1: { src: f1.src, leak: f1.leak }, prompt: /Avec une PHOTO[^\n]*/.exec(pr1) });
  check('kept in this browser’s own storage (shrunk to the feed’s 4:5, 720 × 900 at most), never in the game’s shared documents; listed with the game',
    f1.type === 'data:image/webp' && f1.w === 720 && f1.h === 900 && f1.docs.length === 0 && f1.media, { type: f1.type, w: f1.w, h: f1.h, docs: f1.docs, media: f1.media });

  // ---------- a carousel; ten photos at most ----------
  await openComposer(page);
  await page.setInputFiles('.layer .pics-box input[type=file]', Array.from({ length: 11 }, (_, k) => file(`concert-${k + 1}.png`, 400, 500, (k * 33) % 360)));
  await page.waitForFunction(() => !window.__hype.S.picBusy && document.querySelectorAll('.layer .pics .pic img').length === 10, null, { timeout: 30000 });
  const lim = await G(page, () => ({ n: window.__hype.S.drafts.pics.length, toasts: window.__hype.S.toasts.map((t) => t.text).join(' | '), add: document.querySelector('.layer .pics-box .btn').disabled }));
  const dropped = await G(page, () => window.__hype.S.drafts.pics.slice(3));
  await dismiss(page); // (a post that went viral meanwhile shows its card on top)
  for (let k = 0; k < 7; k++) { await dismiss(page); await page.locator('.layer .pics .pic-x').last().click(); await sleep(150); } // (a card that pops meanwhile — a level, a new bond — is closed first)
  await sleep(500);
  const kept = await G(page, () => ({ n: window.__hype.S.drafts.pics.length, seg: [...document.querySelectorAll('.layer .pics-box .seg button')].map((b) => b.textContent + (b.classList.contains('on') ? '*' : '')).join(',') }));
  const droppedNow = await stored(page, dropped);
  check('ten photos at most in a post (the rest left aside, said so); a photo taken out of the post is gone from this device',
    lim.n === 10 && /10 photos au plus dans un post/.test(lim.toasts) && lim.add && kept.n === 3 && droppedNow.every((x) => x === null), { lim, kept: kept.n, droppedNow });
  await page.fill('#photo-desc', 'trois photos du concert de ce soir, moi au premier rang');
  await page.fill('#compose', 'quelle soirée 🎶');
  await sleep(300);
  await shot(page, 'compose-carousel');
  await overflowCheck(page, 'composer with three photos');
  const n1 = await G(page, () => window.__prompts.length);
  await publish(page);
  const p2 = await lastMine(page);
  const pr2 = await actPrompt(page, n1);
  await G(page, (id) => { const H = window.__hype; H.S.feedAtTop = true; window.scrollTo(0, 0); H.update(); }, p2.id);
  await page.locator(`.post[data-p="${p2.id}"] .carousel`).scrollIntoViewIfNeeded();
  await sleep(600);
  const car = await G(page, (id) => { const el = document.querySelector(`.post[data-p="${id}"] .photo.real.is-car .carousel`); return el ? { slides: el.querySelectorAll('.car-slide img[src^="data:image/"]').length, count: el.querySelector('.car-count').textContent, dots: el.querySelectorAll('.car-dots i').length } : null; }, p2.id);
  await shot(page, 'feed-own-carousel');
  await overflowCheck(page, 'feed with a carousel');
  check('several photos: « Carrousel » or « Diapo TikTok » (carousel by default); published as a carousel to swipe; the AI reads « un CARROUSEL de 3 photos »',
    kept.seg === 'Carrousel*,Diapo TikTok' && p2.own.length === 3 && !p2.diapo && !!car && car.slides === 3 && car.count === '1/3' && car.dots === 3 && pr2.includes('Avec un CARROUSEL de 3 photos. Ce qu’on voit : « trois photos du concert de ce soir'), { seg: kept.seg, p2, car });

  // ---------- a TikTok-like slideshow ----------
  await openComposer(page);
  await addFiles(page, [file('look-1.png', 500, 700, 200), file('look-2.png', 500, 700, 240), file('look-3.png', 500, 700, 280), file('look-4.png', 500, 700, 320)], 4);
  await clickText(page, '.layer .pics-box .seg button', 'Diapo TikTok');
  await sleep(200);
  const dz = await G(page, () => ({ ph: document.getElementById('compose').getAttribute('placeholder'), note: document.querySelector('.layer .pics-box > small').textContent }));
  await page.fill('#photo-desc', 'mes 4 looks de la semaine devant le miroir');
  await page.fill('#compose', 'mes looks de la semaine, lequel vous préférez ?');
  await sleep(300);
  await shot(page, 'compose-diapo');
  const n2 = await G(page, () => window.__prompts.length);
  await publish(page);
  const p3 = await lastMine(page);
  const pr3 = await actPrompt(page, n2);
  await G(page, () => { const H = window.__hype; H.S.feedAtTop = true; window.scrollTo(0, 0); H.update(); });
  await page.locator(`.post[data-p="${p3.id}"] .slides-card`).scrollIntoViewIfNeeded();
  await sleep(400);
  const card = await G(page, (id) => { const el = document.querySelector(`.post[data-p="${id}"] .slides-card`); return el ? { imgs: el.querySelectorAll('img[src^="data:image/"]').length, play: el.querySelector('.slides-play').textContent } : null; }, p3.id);
  await shot(page, 'feed-own-diapo');
  await page.click(`.post[data-p="${p3.id}"] .slides-card`);
  await page.waitForSelector('.layer .tt .ss-fg');
  await sleep(3200);
  const tt = await G(page, () => ({ title: (document.querySelector('.layer .tt-title') || {}).textContent || '', bars: document.querySelectorAll('.layer .ss-bars i').length, done: document.querySelectorAll('.layer .ss-bars i.done').length, dark: !!document.querySelector('.layer-panel.dark'), foot: (document.querySelector('.layer .tt-foot') || {}).textContent || '', head: (document.querySelector('.layer .ig-title') || {}).textContent || '' }));
  await shot(page, 'own-tiktok');
  check('« Diapo TikTok »: the text is its title; in the feed, a slideshow card; it opens on the player’s TikTok-like page, photos going by; the AI reads « un DIAPORAMA de 4 photos »',
    /Le titre de ton diapo/.test(dz.ph) && /Un diapo façon TikTok/.test(dz.note) && p3.own.length === 4 && p3.diapo && !!card && card.imgs === 3 && /4 photos/.test(card.play)
    && tt.title === 'mes looks de la semaine, lequel vous préférez ?' && tt.bars === 4 && tt.done >= 1 && tt.dark && /@mila\.flux/.test(tt.foot) && /son original · Mila Flux/.test(tt.foot) && /1 sur 1/.test(tt.head)
    && pr3.includes('Avec un DIAPORAMA de 4 photos façon TikTok (le texte du post en est le titre). Ce qu’on voit : « mes 4 looks de la semaine'), { dz, p3, card, tt });

  // ---------- the player's own pages ----------
  await closeAll(page);
  await G(page, () => { const H = window.__hype; H.S.tab = 'profile'; H.update(); window.scrollTo(0, 0); });
  await page.waitForSelector('.prof .soc-links');
  const soc = await page.textContent('.prof .soc-links');
  await shot(page, 'profile-own-socials');
  await page.click('.prof .soc-btn.is-ig');
  await page.waitForSelector('.layer .ig-grid .ig-cell img');
  await sleep(400);
  const ig = await G(page, () => ({ cells: document.querySelectorAll('.layer .ig-grid .ig-cell').length, firstMulti: !!document.querySelector('.layer .ig-grid .ig-cell:first-child .ig-multi'), multi: document.querySelectorAll('.layer .ig-multi').length, title: document.querySelector('.layer .ig-title').textContent, counts: document.querySelector('.layer .ig-counts').textContent, hl: document.querySelectorAll('.layer .ig-hl-it').length, follow: !!document.querySelector('.layer .ig-actions') }));
  await shot(page, 'own-insta');
  await overflowCheck(page, 'own insta');
  await page.click('.layer .ig-grid .ig-cell >> nth=0');
  await page.waitForSelector('.layer .ig-media .carousel');
  await sleep(300);
  const igp = await G(page, () => ({ slides: document.querySelectorAll('.layer .ig-media .car-slide img').length, cap: (document.querySelector('.layer .ig-txt p') || {}).textContent || '', cm: document.querySelectorAll('.layer .ig-cm').length, likeOff: document.querySelector('.layer .ig-acts .iconbtn').disabled, link: !!document.querySelector('.layer .ig-txt .linkbtn') }));
  await shot(page, 'own-insta-carousel');
  check('the profile links to the player’s own pages once they have photos; the Insta-like page: their photos and carousels (not the slideshow), no highlights, no follow button',
    /Ton Instagram/.test(soc) && /2 publications/.test(soc) && /Ton TikTok/.test(soc) && /1 diaporama/.test(soc) && ig.cells === 2 && ig.firstMulti && ig.multi === 1 && /mila\.flux/.test(ig.title) && /2publications/.test(ig.counts) && ig.hl === 0 && !ig.follow, { soc, ig });
  check('a carousel opens there with its caption and the characters’ comments; no like on one’s own post; a link to the reactions',
    igp.slides === 3 && /mila\.flux quelle soirée/.test(igp.cap) && igp.cm >= 1 && igp.likeOff && igp.link, igp);
  await closeAll(page);

  // ---------- what the AI reads later about these posts ----------
  const ctxText = await G(page, () => { const H = window.__hype; return H.promptRefresh(H.S.game, 0, [], false, null, []); });
  const lines = ['[photo : moi en terrasse avec mes potes, lunettes de soleil]', '[carrousel de 3 photos : trois photos du concert de ce soir, moi au premier rang]', '[diaporama de 4 photos : mes 4 looks de la semaine devant le miroir]'];
  check('in the next prompts, the player’s posts carry what the photos show (photo, carousel, slideshow), and still no image', lines.every((l) => ctxText.includes(l)) && !/data:image|;base64,/.test(ctxText), lines.map((l) => ctxText.includes(l)));

  // ---------- a photo gone from this device: the description instead ----------
  const miss = await G(page, async (a) => {
    const H = window.__hype;
    await H.mediaDel(a.own[0]); // a cleared browser, another computer
    H.S.tab = 'feed'; H.S.feedAtTop = true; H.update();
    await new Promise((r) => setTimeout(r, 900));
    const el = document.querySelector(`.post[data-p="${a.id}"]`);
    return { real: !!(el && el.querySelector('.photo.real')), desc: el ? ((el.querySelector('.photo .photo-desc') || {}).textContent || '') : null, mine: H.ownPosts(H.S.game, Date.now(), false).length };
  }, p1);
  await page.locator(`.post[data-p="${p1.id}"]`).scrollIntoViewIfNeeded();
  await shot(page, 'feed-photo-gone');
  check('a photo no longer on this device: the post shows the drawn card with its description (and leaves the Insta-like page)', !miss.real && /moi en terrasse avec mes potes/.test(miss.desc) && miss.mine === 1, miss);

  // ---------- export and import: the photos travel with the game, as copies of their own; a deleted game takes them ----------
  const ex = await G(page, async () => {
    const H = window.__hype, g = H.S.game;
    const text = await H.exportGameText(g.id);
    const d = JSON.parse(text);
    const mine = g.posts.filter((p) => p.a === 'p' && p.photo && p.photo.own).flatMap((p) => p.photo.own);
    const keys = Object.keys(d.media || {});
    const rest = JSON.stringify(d.core) + JSON.stringify(d.feed) + JSON.stringify(d.dms);
    const imp = await H.importGameText(text);
    const got = await Promise.all((imp.media || []).map((id) => H.mediaGet(id)));
    const own = imp.posts.filter((p) => p.a === 'p' && p.photo && p.photo.own).flatMap((p) => p.photo.own);
    return { keys: keys.length, mine: mine.length, data: keys.every((k) => /^data:image\/webp;base64,/.test(d.media[k])), rest: !rest.includes('data:image'), impId: imp.id, same: imp.id === g.id,
      media: imp.media || [], fresh: (imp.media || []).every((id) => !mine.includes(id)), got: got.every((x) => !!x && x.startsWith('data:image/')), used: (imp.media || []).every((id) => own.includes(id)), keep: mine.filter((id) => keys.includes(id)) };
  });
  check('export: the game file holds the player’s photos (the ones still on this device); import: a new game with copies of its own',
    ex.mine === 8 && ex.keys === 7 && ex.data && ex.rest && !ex.same && ex.media.length === 7 && ex.fresh && ex.got && ex.used, ex);
  const del = await G(page, async (a) => {
    const H = window.__hype;
    const ok = await H.deleteGame(a.impId);
    const left = await Promise.all(a.media.map((id) => { delete H.MEDIA[id]; return H.mediaGet(id); }));
    const orig = await Promise.all(a.keep.map((id) => { delete H.MEDIA[id]; return H.mediaGet(id); }));
    return { ok, gone: left.every((x) => x === null), kept: orig.every((x) => !!x && x.startsWith('data:image/')), games: H.S.games.length };
  }, ex);
  check('a deleted game takes its photos with it; the other game keeps its own', del.ok && del.gone && del.kept && del.games === 1, del);

  // ---------- photos of a composer closed without publishing ----------
  await openComposer(page);
  await addFiles(page, [file('a.png', 300, 300, 10), file('b.png', 300, 300, 50)], 2);
  const x1 = await G(page, () => window.__hype.S.drafts.pics.slice());
  await page.click('.layer .photo-input button[aria-label="Retirer la photo"]');
  await sleep(400);
  const x1Now = await stored(page, x1);
  const x1Listed = await G(page, (ids) => window.__hype.picDrafts().filter((x) => ids.includes(x.id)).length, x1);
  check('the × of the photo box takes its photos back (gone from this device too)', x1Now.every((x) => x === null) && x1Listed === 0, { x1Now, x1Listed });
  await clickText(page, '.layer .ideas button', 'Photo');
  await addFiles(page, [file('c.png', 300, 300, 90), file('d.png', 300, 300, 130)], 2);
  const d1 = await G(page, () => window.__hype.S.drafts.pics.slice());
  await closeAll(page); // the composer is closed, the draft kept for this visit
  const soon = await G(page, async (ids) => {
    const H = window.__hype, listed = H.picDrafts().map((x) => x.id);
    const pics = H.S.drafts.pics;
    H.S.drafts.pics = [];
    H.sweepDrafts(); // within half a day: kept (another window may still be on it)
    H.S.drafts.pics = pics;
    await new Promise((r) => setTimeout(r, 300));
    const still = await Promise.all(ids.map((id) => { delete H.MEDIA[id]; return H.mediaGet(id); }));
    return { listed, still: still.every(Boolean) };
  }, d1);
  // a later visit: the page opens again, more than half a day after
  await G(page, () => { const H = window.__hype; localStorage.setItem('hype:picDrafts', JSON.stringify(H.picDrafts().map((x) => Object.assign({}, x, { at: x.at - 13 * 3600000 })))); });
  await page.reload();
  await page.waitForSelector('text=Nouvelle partie');
  await sleep(1200);
  const later = await stored(page, d1);
  const left = await G(page, () => window.__hype.picDrafts().length);
  const pubStill = await stored(page, p2.own);
  check('photos of a composer closed without publishing: listed on this device (never the published ones), cleared at a later start after half a day',
    soon.listed.slice().sort().join() === d1.slice().sort().join() && soon.still && later.every((x) => x === null) && left === 0 && pubStill.every((x) => x === 'data:image/webp'), { soon, later, left, pubStill });

  // ---------- 0.9.2: the characters see the images (AI images only, the player's choice post by post) ----------
  await page.locator('.save-wrap').first().locator('.save').click();
  await page.waitForSelector('.post', { timeout: 15000 });
  await sleep(800);
  await dismiss(page);
  await openComposer(page);
  await addFiles(page, [file('perso-1.png', 600, 750, 15), file('perso-2.png', 600, 750, 75)], 2);
  await page.waitForSelector('.layer .see-box');
  const box0 = await G(page, () => { const b = document.querySelector('.layer .see-box'); return { text: b.textContent, on: b.querySelector('input').checked, label: document.querySelector('.layer .photo-input label').textContent, can: !document.querySelector('.layer .layer-head .btn-hot').disabled }; });
  await dismiss(page);
  await page.check('.layer .see-box input');
  await page.fill('#compose', 'nouveau look pour la soirée 🔥');
  await sleep(300);
  const box1 = await G(page, () => ({ label: document.querySelector('.layer .photo-input label').textContent, ph: document.getElementById('photo-desc').getAttribute('placeholder'), note: document.querySelector('.layer .pics-box > small').textContent, can: !document.querySelector('.layer .layer-head .btn-hot').disabled, on: document.querySelector('.layer .see-box').classList.contains('on') }));
  await shot(page, 'compose-see-images');
  await overflowCheck(page, 'composer, images seen');
  check('with real images: « Les persos voient ces images », unticked, and it says so: AI images only, never real people, sent to Claude; ticked, the description becomes optional',
    !box0.on && /Les persos voient ces images/.test(box0.text) && /Images générées par IA uniquement/.test(box0.text) && /jamais de photos de vraies personnes/.test(box0.text) && /envoyées à Claude/.test(box0.text) && /c’est ce que lisent les persos/.test(box0.label) && !box0.can
    && box1.on && /facultatif/.test(box1.label) && /ta description devient facultative/.test(box1.note) && /≈ \+0,2 café/.test(box1.note) && box1.can, { box0, box1 });
  const v0 = await G(page, () => ({ n: window.__prompts.length, imgs: (window.__imgs || []).length, used: window.__hype.S.game.budget.chars }));
  await publish(page);
  const v1 = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, p = g.posts.filter((x) => x.a === 'p').sort((x, y) => y.ts - x.ts)[0];
    const pr = window.__prompts.slice(a.n).filter((x) => x.includes('Le joueur publie ce post')).pop() || '';
    const sent = (window.__imgs || [])[a.imgs] || null;
    const ctx = H.promptRefresh(g, 0, [], false, null, []);
    return { see: p.photo.see, desc: p.photo.desc, ai: p.photo.ai, own: p.photo.own.length, replies: p.replies.length, sent, imgChars: H.S.lastImgChars, cost: H.SEE_CHARS,
      prompt: pr.includes('Avec un CARROUSEL de 2 photos. Les 2 images jointes sont celles de ce post : des images générées par IA du perso du joueur') && pr.includes('le physique si ça colle au caractère de chacun') && pr.includes('Le perso du joueur est un adulte : personne ne commente son âge apparent') && pr.includes('si une image montre clairement un enfant ou un ado, aucune drague et aucun commentaire sur son corps') && pr.includes('{"t":"photo","desc"'),
      noData: !/data:image|;base64,/.test(pr), ctx: ctx.includes('[carrousel de 2 photos : Mila en veste rouge sous les néons d’une rue de Tokyo, grand sourire]'), next: !H.S.drafts.see };
  }, v0);
  check('published: the two images go with the call (JPEG, small), the AI is told what they are and may talk about looks (the player’s persona is an adult: never about apparent age; only an image clearly showing a child is off-limits); it says what it saw, kept for later prompts',
    v1.see === 2 && v1.own === 2 && !!v1.sent && v1.sent.n === 2 && v1.sent.blobs && v1.sent.types.every((t) => t === 'image/jpeg') && v1.sent.sizes.every((x) => x > 0 && x < 200000)
    && v1.prompt && v1.noData && v1.desc === 'Mila en veste rouge sous les néons d’une rue de Tokyo, grand sourire' && v1.ai === v1.desc && v1.ctx && v1.replies >= 1 && v1.next, v1);
  check('the images count in the cafés (apart from what a post usually costs)', v1.imgChars === 2 * v1.cost, { imgChars: v1.imgChars, per: v1.cost });

  // more than four: the first four go
  await openComposer(page);
  await addFiles(page, Array.from({ length: 6 }, (_, k) => file(`look-${k}.png`, 500, 625, (k * 50) % 360)), 6);
  const box2 = await G(page, () => ({ text: document.querySelector('.layer .see-box').textContent, on: document.querySelector('.layer .see-box input').checked }));
  await dismiss(page);
  await page.check('.layer .see-box input');
  await page.fill('#photo-desc', 'mon perso, six tenues pour la semaine');
  await page.fill('#compose', 'ma semaine en 6 looks');
  const v2n = await G(page, () => ({ n: window.__prompts.length, imgs: (window.__imgs || []).length }));
  await publish(page);
  const v2 = await G(page, (a) => { const pr = window.__prompts.slice(a.n).filter((x) => x.includes('Le joueur publie ce post')).pop() || ''; const p = window.__hype.S.game.posts.filter((x) => x.a === 'p').sort((x, y) => y.ts - x.ts)[0]; return { sent: ((window.__imgs || [])[a.imgs] || {}).n, see: p.photo.see, desc: p.photo.desc, said: pr.includes('Les 4 images jointes sont les 4 premières de ce post') && pr.includes('Le joueur précise : « mon perso, six tenues pour la semaine »') }; }, v2n);
  check('never ticked in advance; past four images, the first four go (the box says so), and the player’s own words go with them',
    !box2.on && /\(les 4 premières\)/.test(box2.text) && v2.sent === 4 && v2.see === 4 && v2.said && v2.desc === 'mon perso, six tenues pour la semaine', { box2, v2 });

  // the images refused: the same post from its description
  await openComposer(page);
  await addFiles(page, [file('perso-3.png', 600, 750, 200)], 1);
  await dismiss(page);
  await page.check('.layer .see-box input');
  await page.fill('#photo-desc', 'mon perso en terrasse au soleil');
  await page.fill('#compose', 'pause café ☕');
  // (every toast shown is noted: the game's own news of the hour can push this one out of the four kept)
  const v3n = await G(page, () => { window.__mockImgFail = 'image_rejected'; window.__toastLog = []; window.__toastTimer = setInterval(() => { for (const t of window.__hype.S.toasts) if (!window.__toastLog.includes(t.text)) window.__toastLog.push(t.text); }, 40); return { n: window.__prompts.length, imgs: (window.__imgs || []).length }; });
  await publish(page);
  const v3 = await G(page, (a) => {
    const H = window.__hype, p = H.S.game.posts.filter((x) => x.a === 'p').sort((x, y) => y.ts - x.ts)[0];
    const acts = window.__prompts.slice(a.n).filter((x) => x.includes('Le joueur publie ce post'));
    return { calls: acts.length, first: acts[0] ? acts[0].includes('L’image jointe est celle de ce post') : false, second: acts[1] ? !acts[1].includes('image jointe') && acts[1].includes('Avec une PHOTO. Ce qu’on voit : « mon perso en terrasse au soleil »') : false,
      see: p.photo.see || 0, replies: p.replies.length, text: p.text, toast: (clearInterval(window.__toastTimer), window.__toastLog.join(' | ')), vision: H.S.vision, miss: H.S.visionMiss };
  }, v3n);
  check('images refused: the post goes on from its description (one more call), said so; the box stays for the next post',
    v3.calls === 2 && v3.first && v3.second && v3.see === 0 && v3.replies >= 1 && v3.text === 'pause café ☕' && /n’a pas pu voir tes images/.test(v3.toast) && v3.vision > 0 && v3.miss === 1, v3);

  // this view cannot send images: the box goes away
  await openComposer(page);
  await addFiles(page, [file('perso-4.png', 600, 750, 280)], 1);
  await dismiss(page);
  await page.check('.layer .see-box input');
  await page.fill('#photo-desc', 'mon perso devant la mer');
  await G(page, () => { window.__mockImgFail = 'images_unavailable'; });
  await publish(page);
  await openComposer(page);
  await addFiles(page, [file('perso-5.png', 600, 750, 320)], 1);
  const gone = await G(page, () => ({ box: !!document.querySelector('.layer .see-box'), vision: window.__hype.S.vision, label: document.querySelector('.layer .photo-input label').textContent }));
  check('when this view cannot send images at all, the box goes away for the visit (the description is needed again)', !gone.box && gone.vision === 0 && /c’est ce que lisent les persos/.test(gone.label), gone);
  await closeAll(page);

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
