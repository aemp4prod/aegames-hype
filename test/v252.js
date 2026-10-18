// 0.25.2 end to end, in Chromium against the built hype.html with the mocked Claude runtime: a montage for a client, at
// the difficulty the player picks (as for their own videos):
// - six levels (Facile to Mythique, no « Cauchemar »), each with the best it allows (bon, très bon, excellent,
//   légendaire from a given score) and what the client expects (their audience, whether they pay);
// - the score × the difficulty = the quality the client sees; a legendary montage takes off on their channel;
// - the level picked last is offered first; « Refaire » goes back to the choice; an order from before (a game set up
//   but never started) gets the choice too;
// - a brand's offer still open reads as open in its DMs: it can be negotiated (since 0.20, every one was told « fini »).
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v252.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v252');
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


// The rhythm game played without a miss: each cut in the middle of its zone.
async function cutAll(page) {
  await page.waitForSelector('.layer .mt-track', { timeout: 8000 });
  const n = await G(page, () => document.querySelectorAll('.layer .mt-hit').length);
  for (let k = 0; k < n; k++) {
    await page.waitForFunction((j) => { const t = document.querySelector('.layer .mt-track'), b = document.querySelector('.layer .mt-cut'); return t && b && !b.disabled && document.querySelectorAll('.layer .mt-hit.v1, .layer .mt-hit.v05, .layer .mt-hit.v0').length === j && +t.dataset.t0 > 0; }, k, { timeout: 8000 });
    await G(page, () => new Promise((res) => {
      const t = document.querySelector('.layer .mt-track'), b = document.querySelector('.layer .mt-cut');
      const z0 = +t.dataset.z0, z1 = +t.dataset.z1, t0 = +t.dataset.t0, sp = +t.dataset.speed;
      const pos = (x) => { const v = (Math.max(0, x - t0) / sp) % 2; return v < 1 ? v : 2 - v; };
      const loop = () => { if (Math.abs(pos(performance.now()) - (z0 + z1) / 2) < (z1 - z0) / 5) { b.click(); res(); } else requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }));
  }
  return n;
}
const setupView = (page) => G(page, () => {
  const L = [...document.querySelectorAll('.layer')].pop(), on = L.querySelector('.job-setup .diff-opt[aria-checked="true"] b');
  return { opts: [...L.querySelectorAll('.job-setup .diff-opt')].map((b) => [b.querySelector('b').textContent, b.querySelector('small').textContent, b.querySelector('.d-mult').textContent]), on: on ? on.textContent : null,
    expect: (L.querySelector('.job-setup .job-expect') || {}).textContent || '', note: [...L.querySelectorAll('.job-setup > p.muted')].map((p) => p.textContent).join(' '), eyebrow: (L.querySelector('.job-setup .eyebrow') || {}).textContent || '' };
});
async function openOrder(page, id) {
  await idle(page);
  await dismiss(page);
  await G(page, (x) => { const H = window.__hype; H.S.stack = []; H.openLayer({ t: 'job', id: x }); H.update(); }, id);
  await page.waitForSelector('.layer .job-setup', { timeout: 8000 });
  await sleep(400);
}
async function pickDiff(page, label) { await dismiss(page); await page.locator('.layer .job-setup .diff-opt', { hasText: label }).first().click(); await sleep(150); }
async function monter(page) { await dismiss(page); await page.locator('.layer .job-setup .btn-hot').click(); }

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);
  await newGame(page, 'Monteuse vidéo freelance, fan de jeux de tir');

  // ---------- the numbers: score × difficulty = quality ----------
  const nums = await G(page, () => {
    const H = window.__hype, q = (m, d) => H.jobQual(H.jobQ(m, d));
    return { ids: H.JOB_DIFFS.map((d) => d.id), facile: q(1, 'facile'), moyen: q(0.9, 'moyen'), difficile: q(1, 'difficile'), exp11: q(11 / 12, 'expert'), exp10: q(10 / 12, 'expert'), leg6: q(6 / 7, 'legende'), myth: q(6.5 / 8, 'mythique'), myth6: q(6 / 8, 'mythique'), rate: q(0.5, 'facile'),
      from: ['facile', 'expert', 'legende', 'mythique'].map((id) => H.legendFrom(H.JOB_DIFFS.find((d) => d.id === id))), legacy: H.qOf({ m: 0.9 }) };
  });
  check('the quality is the score × what the difficulty allows: a perfect « Facile » is « bon », « Moyen » goes up to « très bon », « Difficile » to « excellent »; « légendaire » from 90 % in Expert, 84 % in Légendaire, 78 % in Mythique; « Cauchemar » is not offered; an order from before keeps its score as its quality',
    nums.ids.join() === 'facile,moyen,difficile,expert,legende,mythique' && nums.facile === 'bon' && nums.moyen === 'très bon' && nums.difficile === 'excellent' && nums.exp11 === 'légendaire' && nums.exp10 === 'excellent'
      && nums.leg6 === 'légendaire' && nums.myth === 'légendaire' && nums.myth6 === 'excellent' && nums.rate === 'raté' && nums.from.join() === ',90,84,78' && nums.legacy === 0.9, nums);

  // ---------- an order from a small creator: the choice, then a legendary montage at Expert ----------
  const o1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = H.charByHandle(g, 'theo.marlin');
    Object.assign(t, { followers: 3000, unlocked: true });
    const j = H.addJob(g, t, { kind: 'montage', what: 'un edit Valorant fun', pay: 0, days: 3 });
    H.addJobFile(g, t, { name: 'rush_valorant_01.mp4' });
    return j.id;
  });
  await openOrder(page, o1);
  const s1 = await setupView(page);
  await shot(page, 'job-setup');
  check('the order: six levels, each with what it takes and the best it allows; what the client expects (a small creator, a favour: « bon »), the level that gets there offered first',
    s1.opts.length === 6 && s1.opts[0][0] === 'Facile' && s1.opts[5][0] === 'Mythique' && s1.opts[0][2] === 'au mieux bon' && s1.opts[1][2] === 'au mieux très bon' && s1.opts[2][2] === 'au mieux excellent'
      && s1.opts[3][2] === 'légendaire' && /7 coupes, zone minuscule, très rapide · bon dès 50\s%, raté sous 35\s% · légendaire dès 90\s%/.test(s1.opts[3][1]) && /attend un montage au moins bon/.test(s1.expect) && s1.on === 'Facile' && /au mieux « bon »/.test(s1.note), s1);
  await pickDiff(page, 'Expert');
  const s1b = await setupView(page);
  await monter(page);
  const n1 = await cutAll(page);
  await page.waitForSelector('.layer .job-ready', { timeout: 8000 });
  await sleep(300);
  const r1 = await G(page, (id) => { const H = window.__hype, g = H.S.game, j = H.jobOf(g, id), L = [...document.querySelectorAll('.layer')].pop(); return { m: j.m, q: j.q, diff: j.diff, last: g.jobDiff, cls: L.querySelector('.job-ready').className, text: L.querySelector('.job-ready').textContent }; }, o1);
  await shot(page, 'job-legendary');
  check('picked « Expert » (7 cuts since 0.27.9, a legendary montage possible), played without a miss: « Montage : légendaire », better than they expected; the level is remembered',
    s1b.on === 'Expert' && /Dès 90\s%, le montage est légendaire/.test(s1b.note) && n1 === 7 && r1.m === 1 && r1.diff === 'expert' && r1.q === 1 && r1.last === 'expert' && /tier-legende/.test(r1.cls)
      && /Montage : légendaire · 100\s% en 🔥 Expert/.test(r1.text) && /Mieux que ce que Théo attendait \(bon\)/.test(r1.text), Object.assign({ n1, on: s1b.on }, r1));
  const p0 = await G(page, () => window.__prompts.length);
  await dismiss(page);
  await page.locator('.layer .job-ready .btn-hot').click();
  await sleep(800);
  await idle(page);
  const d1 = await G(page, ([id, n]) => {
    const H = window.__hype, g = H.S.game, j = H.jobOf(g, id);
    const p = window.__prompts.slice(n).find((x) => x.includes('TÂCHE : LE TRAVAIL LIVRÉ')) || '';
    return { state: j.state, said: /Le résultat, tel que Théo le découvre : légendaire : exceptionnel, de ceux qui font parler/.test(p), expect: /Ce que Théo attendait, vu son audience : un montage au moins bon\./.test(p), notif: (g.notifs.filter((x) => /cartonne/.test(x.text)).pop() || {}).text || '', views: j.views, chron: g.chronicle.some((e) => /un montage légendaire/.test(e.text)) };
  }, [o1, p0]);
  check('sent: the client is told it is legendary and what they expected; their video takes off (« cartonne »), and the story keeps it',
    d1.state === 'done' && d1.said && d1.expect && /La vidéo de Théo que tu as montée cartonne/.test(d1.notif) && d1.views > 0 && d1.chron, d1);

  // ---------- a paid order from a bigger creator: the level picked last comes first; easy can't please them ----------
  const o2 = await G(page, () => {
    const H = window.__hype, g = H.S.game, z = H.mains(g).find((c) => c.handle !== 'theo.marlin');
    Object.assign(z, { followers: 80000, unlocked: true, rel: 30 });
    const j = H.addJob(g, z, { kind: 'montage', what: 'le vlog de sa rentrée', pay: 60, days: 2 });
    H.addJobFile(g, z, { name: 'vlog_rush_A.mp4' });
    return j.id;
  });
  await openOrder(page, o2);
  const s2 = await setupView(page);
  await pickDiff(page, 'Facile');
  await monter(page);
  await cutAll(page);
  await page.waitForSelector('.layer .job-ready', { timeout: 8000 });
  await sleep(300);
  const r2 = await G(page, (id) => { const H = window.__hype, g = H.S.game, j = H.jobOf(g, id), z = g.chars[j.c], L = [...document.querySelectorAll('.layer')].pop(); return { first: z.name.split(' ')[0], q: Math.round(j.q * 100), qual: H.jobQual(j.q), text: L.querySelector('.job-ready').textContent }; }, o2);
  await shot(page, 'job-easy');
  await dismiss(page);
  await page.locator('.layer .job-ready .btn-ghost', { hasText: 'Refaire' }).click();
  await page.waitForSelector('.layer .job-setup', { timeout: 5000 });
  const again = await G(page, (id) => { const j = window.__hype.jobOf(window.__hype.S.game, id); return { state: j.state, q: j.q, diff: j.diff, game: !!j.game }; }, o2);
  check('a paid order from a bigger creator: they expect « excellent »; the level picked last (Expert) comes first; at « Facile », even perfect, it is only « bon » and below what they expected; « Refaire » goes back to the choice',
    /attend un montage au moins excellent/.test(s2.expect) && s2.on === 'Expert' && r2.q === 62 && r2.qual === 'bon' && /Montage : bon · 100\s% en 😌 Facile/.test(r2.text) && new RegExp(`${r2.first} attendait au moins « excellent »`).test(r2.text)
      && again.state === 'open' && again.q == null && !again.diff && !again.game, { s2: { expect: s2.expect, on: s2.on }, r2, again });

  // ---------- an order from before: its game was set up but never started: the choice comes first ----------
  const o3 = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const j = H.jobOf(g, H.S.stack.length ? H.S.stack[H.S.stack.length - 1].id : '') ;
    j.game = H.jobGame(g, j); // (as 0.25.1 left it: the client's level, not started)
    return j.id;
  });
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.update(); });
  await openOrder(page, o3);
  const s3 = await setupView(page);
  check('an order from before, its game set up but never started: the choice of level comes first', s3.opts.length === 6 && !!s3.on, { on: s3.on });

  // ---------- brands: an offer still open reads as open (since 0.20, every offer was told « fini » too) ----------
  const br = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    g.stats.followers = Math.max(g.stats.followers, 5000);
    for (const x of g.deals) if (x.state === 'offer') x.state = 'expired';
    const d = H.makeOffer(g, { brand: 'Croc’Midi', product: 'ses box repas' });
    if (!d) return null;
    const c = g.chars[d.contact], over = /Leur partenariat est (fini|terminé)/;
    const p1 = H.promptDM(g, c, [], 'Merci ! Plutôt qu’en produits, vous auriez un budget pour ce partenariat ?');
    const out = { offer: { open: /Son offre actuelle : /.test(p1), over: over.test(p1), line: /OBLIGATOIRE dès que/.test(p1) } };
    Object.assign(d, { state: 'signed', signedAt: Date.now(), due: Date.now() + 5 * 86400000 });
    const p2 = H.promptDM(g, c, [], 'on peut décaler la date ?');
    out.signed = { on: /Le contrat est signé : /.test(p2), over: over.test(p2) };
    d.state = 'declined';
    const p3 = H.promptDM(g, c, [], 'finalement ça me tente');
    out.declined = /Le joueur a refusé leur dernière offre\./.test(p3) && !/Son offre actuelle/.test(p3);
    d.state = 'done';
    out.done = /Leur partenariat est terminé : le contenu a été livré\./.test(H.promptDM(g, c, [], 'merci pour tout'));
    return out;
  });
  check('a brand’s offer still open is open in its DMs (it can be negotiated), a signed contract too; only one that is over says so (refused, delivered)',
    !!br && br.offer.open && !br.offer.over && br.offer.line && br.signed.on && !br.signed.over && br.declined && br.done, br);

  console.log('\nERRORS', errors.length ? errors.slice(0, 10) : 'none');
  const ok = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`CHECKS ${ok}/${checks.length}`);
  console.log(`${ok}/${checks.length} PASS`);
  await browser.close();
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
