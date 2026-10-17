// 0.25.1 end to end, in Chromium against the built hype.html with the mocked Claude runtime: the player's new profile
// photo, from the camera on the avatar or the « Photo de profil » section:
// - a card shows it, with what it shows (optional) and two ways: announce it in a post, or just change it;
// - just changing it costs no call: the next call may have someone notice it (a trigger), and what it shows is in
//   every prompt from now on (the characters can bring it up any time);
// - announcing it opens the composer with the photo (720 px, not the 192 px avatar), the text and the description:
//   the post's prompt asks everyone to have a say (compliments, vannes, piques), the post shows it round;
// - the characters can see it (their description becomes the photo's), a normal post again with one tap;
// - its description edited in the profile, gone with the photo.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v251.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v251');
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
let shotN = 0;
const check = (name, ok, info) => { checks.push([ok ? 'PASS' : 'FAIL', name]); console.log(ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)); };
async function shot(page, name) { shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
const G = (page, fn, arg) => page.evaluate(fn, arg);
// (never a profile photo's card: the tests answer it themselves)
async function dismiss(page) { for (let k = 0; k < 6 && (await page.$('.modal:not(:has(.pfp-card))')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.devis); })) await sleep(250); };
const clearToasts = (page) => G(page, () => { const H = window.__hype; H.S.toasts.forEach((t) => { t.until = 0; }); H.update(false); });

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
const toProfile = (page) => G(page, () => { const H = window.__hype; H.S.stack = []; H.goTab('profile'); H.update(); });
// A photo picked (from the avatar's camera or the section), its card up.
async function pick(page, sel, f) {
  await dismiss(page);
  await toProfile(page);
  await page.waitForSelector(sel, { state: 'attached' });
  await page.setInputFiles(sel, f);
  await page.waitForSelector('.modal .pfp-card .pfp-big img', { timeout: 10000 });
}
async function cardBtn(page, text) { await page.locator('.modal .pfp-card .btn', { hasText: text }).click(); await sleep(400); }
// The composer's own controls, a stray modal (a level-up, a newcomer) put away first.
async function tap(page, sel, how = 'click') { await dismiss(page); if (how === 'check') await page.check(sel); else await page.click(sel); }
const lastMine = (page) => G(page, () => {
  const g = window.__hype.S.game, p = g.posts.filter((x) => x.a === 'p').sort((a, b) => b.ts - a.ts)[0];
  return p ? { id: p.id, text: p.text, own: (p.photo && p.photo.own) || [], desc: p.photo ? p.photo.desc : '', pfp: p.pfp || null, pending: !!p.pending, replies: p.replies.length } : null;
});
const actPrompt = (page, n0) => G(page, (n) => window.__prompts.slice(n).filter((x) => x.includes('Le joueur publie ce post')).pop() || '', n0);
async function publish(page) {
  await dismiss(page);
  await clearToasts(page);
  await page.locator('.layer-head button', { hasText: 'Publier' }).click();
  await sleep(800);
  await idle(page, 30000);
  await sleep(1200);
  await dismiss(page);
}

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);
  await newGame(page, 'Étudiante en deuxième année, fan de potions et de photos');

  // ---------- the camera on the avatar: the card ----------
  await toProfile(page);
  await page.waitForSelector('.prof-av .prof-cam');
  await sleep(300);
  await shot(page, 'profile-camera');
  const cam = await G(page, () => { const b = document.querySelector('.prof-av .prof-cam'); return b ? b.getAttribute('aria-label') : null; });
  const n0 = await G(page, () => window.__prompts.length);
  await pick(page, '.prof-av input[type=file]', file('pp-veste.png', 900, 1200, 10));
  await sleep(700); // (its pop)
  const m1 = await G(page, () => ({ eyebrow: document.querySelector('.pfp-card .eyebrow').textContent, btns: [...document.querySelectorAll('.pfp-card .btn')].map((b) => b.textContent.trim()), desc: !!document.querySelector('#pfp-desc'), photo: window.__hype.S.game.player.photo, calls: window.__prompts.length }));
  await shot(page, 'pfp-card');
  await page.keyboard.press('Escape');
  await page.mouse.click(8, 8); // (the backdrop)
  await sleep(400);
  const still = !!(await page.$('.modal .pfp-card'));
  check('the camera on the profile’s avatar takes a photo: a card shows it, what it shows (optional), and two ways: announce it in a post, or just change it; no call; it stays until answered',
    cam === 'Changer ta photo de profil' && m1.photo === 'own' && m1.desc && m1.btns.length === 2 && /annoncer en post/i.test(m1.btns[0]) && m1.btns[1] === 'Juste la changer' && m1.calls === n0 && still, Object.assign({ cam, still }, m1));

  // ---------- just changed: someone may notice it later; what it shows is in every prompt ----------
  await page.fill('#pfp-desc', 'moi en veste rouge, lunettes de soleil, sourire en coin');
  await cardBtn(page, 'Juste la changer');
  const q = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.mains(g)[0];
    return { desc: g.player.photoDesc, trig: H.activeTriggers(g).map((x) => x.text).filter((t) => /photo de profil/.test(t)), pub: /Sa photo de profil : « moi en veste rouge, lunettes de soleil, sourire en coin »/.test(H.ctxText(g)), dm: /Sa photo de profil : « moi en veste rouge/.test(H.ctxText(g, { kind: 'private', about: c, focus: new Set() })), calls: window.__prompts.length, card: !!document.querySelector('.modal .pfp-card') };
  });
  const n1 = q.calls;
  await G(page, () => window.__hype.runAct('post', 'Quelqu’un vient au club de potions ce soir ?', null, null, {}));
  await idle(page);
  const p1 = await actPrompt(page, n1);
  const left = await G(page, () => window.__hype.activeTriggers(window.__hype.S.game).filter((x) => /photo de profil/.test(x.text)).length);
  check('just changed: no call; what it shows is the photo’s description, in the public prompts and in the DMs’; the next call (a post) has someone free to notice it, once',
    q.desc === 'moi en veste rouge, lunettes de soleil, sourire en coin' && q.trig.length === 1 && /vient de changer de photo de profil \(on y voit : « moi en veste rouge/.test(q.trig[0]) && q.pub && q.dm && n1 === n0 && !q.card
      && /À JOUER CETTE FOIS[\s\S]*vient de changer de photo de profil/.test(p1) && /Sa photo de profil : « moi en veste rouge/.test(p1) && !/NOUVELLE PHOTO DE PROFIL/.test(p1) && left === 0, Object.assign({ left, p1: (/[^\n]*changer de photo de profil[^\n]*/.exec(p1) || [''])[0] }, q));

  // ---------- announced: the composer, the prompt, the post ----------
  await pick(page, '.photo-tools input[type=file]', file('pp-mer.png', 1200, 900, 190));
  await page.fill('#pfp-desc', 'moi au bord de la mer, cheveux au vent');
  await cardBtn(page, 'L’annoncer en post');
  await page.waitForSelector('#compose');
  await page.waitForFunction(() => { const im = document.querySelector('.layer .pics .pic img'); return im && im.naturalWidth > 0; }, null, { timeout: 10000 });
  const c1 = await G(page, () => {
    const d = window.__hype.S.drafts, im = document.querySelector('.layer .pics .pic img');
    return { title: document.querySelector('.layer-head h2').textContent, hint: (document.querySelector('.layer .pfp-hint') || {}).textContent || '', text: document.querySelector('#compose').value, desc: document.querySelector('#photo-desc').value, pics: document.querySelectorAll('.layer .pics .pic img').length, w: im.naturalWidth, h: im.naturalHeight, pfp: d.pfp, first: (d.pics || [])[0], can: !document.querySelector('.layer-head button.btn-hot').disabled };
  });
  await shot(page, 'pfp-compose');
  check('announced: the composer opens on « Nouvelle photo de profil », the photo in (720 px square, not the avatar’s 192), its description, the text ready, ready to publish',
    c1.title === 'Nouvelle photo de profil' && /nouvelle photo de profil/.test(c1.hint) && /^📸 Nouvelle photo de profil ! /.test(c1.text) && c1.desc === 'moi au bord de la mer, cheveux au vent' && c1.pics === 1 && c1.w === 720 && c1.h === 720 && c1.pfp === c1.first && c1.can, c1);
  const n2 = await G(page, () => window.__prompts.length);
  await publish(page);
  const p2 = await actPrompt(page, n2);
  const post = await lastMine(page);
  const after = await G(page, () => { const H = window.__hype, g = H.S.game; H.S.stack = []; H.goTab('feed'); H.update(); return { desc: g.player.photoDesc, draft: H.S.drafts.pfp || null }; });
  await sleep(600);
  const round = await G(page, (id) => { const el = document.querySelector(`[data-id="${id}"] .photo.real.is-pfp img`) || document.querySelector('.post .photo.real.is-pfp img'); return el ? getComputedStyle(el).borderRadius : null; }, post.id);
  await shot(page, 'pfp-post');
  check('its post: everyone has a say (compliments, vannes, piques), what the photo shows; the post carries it, shown round in the feed; the draft is clean',
    /C’est SA NOUVELLE PHOTO DE PROFIL : tout le monde a un avis/.test(p2) && /vannes entre potes, piques des rivaux/.test(p2) && /Ce qu’on voit : « moi au bord de la mer, cheveux au vent »/.test(p2)
      && post.own.length === 1 && post.pfp === post.own[0] && !post.pending && post.replies > 0 && round === '50%' && after.desc === 'moi au bord de la mer, cheveux au vent' && !after.draft,
    { line: (/[^\n]*NOUVELLE PHOTO DE PROFIL[^\n]*/.exec(p2) || [''])[0].slice(0, 200), post, round, after });

  // ---------- the characters see it: what they saw is its description ----------
  await pick(page, '.prof-av input[type=file]', file('pp-neons.png', 800, 800, 300));
  await cardBtn(page, 'L’annoncer en post');
  await page.waitForSelector('.layer .see-box input', { timeout: 10000 });
  const before = await G(page, () => ({ desc: document.querySelector('#photo-desc').value, can: !document.querySelector('.layer-head button.btn-hot').disabled, kept: window.__hype.S.game.player.photoDesc || null }));
  await tap(page, '.layer .see-box input', 'check');
  await sleep(200);
  const n3 = await G(page, () => window.__prompts.length);
  await publish(page);
  const p3 = await actPrompt(page, n3);
  const seen = await G(page, () => window.__hype.S.game.player.photoDesc);
  check('the characters can see it (an empty description is fine then): the post’s prompt has the image and the profile photo’s line; what they saw becomes its description',
    before.desc === '' && !before.can && !before.kept && /générées par IA du perso du joueur/.test(p3) && /SA NOUVELLE PHOTO DE PROFIL/.test(p3) && seen === 'Mila en veste rouge sous les néons d’une rue de Tokyo, grand sourire', { before, seen });

  // ---------- a normal post again, with one tap; the avatar's copy when the file is gone ----------
  await idle(page);
  await dismiss(page);
  await G(page, () => { const H = window.__hype; H.pfpAnnounce(H.S.game, 'moi encore', null); });
  await page.waitForSelector('.layer .pfp-hint', { timeout: 8000 });
  const small = await G(page, async () => { const H = window.__hype, d = await H.mediaGet(H.S.drafts.pics[0]); return d ? d.slice(0, 23) : null; });
  await dismiss(page); // (a level-up, a newcomer: they can pop up any time)
  await page.click('.layer .pfp-hint .iconbtn');
  await sleep(300);
  const back = await G(page, () => ({ title: document.querySelector('.layer-head h2').textContent, hint: !!document.querySelector('.layer .pfp-hint'), pics: (window.__hype.S.drafts.pics || []).length, pfp: window.__hype.S.drafts.pfp }));
  await dismiss(page);
  await page.click('.layer .photo-input .iconbtn'); // (the photo out of this draft)
  check('one tap on the banner’s cross: a normal post with the same photo; without the picked file, the post takes the avatar’s own copy',
    back.title === 'Nouveau post' && !back.hint && back.pics === 1 && !back.pfp && /^data:image\/jpeg/.test(small || ''), Object.assign({ small }, back));

  // ---------- its description edited in the profile; gone with the photo ----------
  await idle(page);
  await dismiss(page);
  await toProfile(page);
  await page.waitForSelector('.photo-tools .pfp-desc input');
  const shown = await page.inputValue('.photo-tools .pfp-desc input');
  await page.fill('.photo-tools .pfp-desc input', 'moi en noir et blanc, air mystérieux');
  await page.press('.photo-tools .pfp-desc input', 'Enter');
  await sleep(300);
  const ed = await G(page, () => window.__hype.S.game.player.photoDesc);
  await dismiss(page);
  await page.locator('.photo-tools').scrollIntoViewIfNeeded();
  await sleep(300);
  await shot(page, 'pfp-section');
  await page.locator('.photo-tools .linkbtn', { hasText: 'Retirer' }).click();
  await sleep(300);
  const gone = await G(page, () => { const H = window.__hype, g = H.S.game; return { photo: g.player.photo || null, desc: g.player.photoDesc || null, ctx: /Sa photo de profil/.test(H.ctxText(g)), field: !!document.querySelector('.photo-tools .pfp-desc') }; });
  await shot(page, 'pfp-profile');
  check('in the profile, its description is shown and edited; removing the photo removes it from the prompts',
    shown === 'moi encore' && ed === 'moi en noir et blanc, air mystérieux' && !gone.photo && !gone.desc && !gone.ctx && !gone.field, { shown, ed, gone });

  console.log('\nERRORS', errors.length ? errors.slice(0, 10) : 'none');
  const ok = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`CHECKS ${ok}/${checks.length}`);
  console.log(`${ok}/${checks.length} PASS`);
  await browser.close();
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
