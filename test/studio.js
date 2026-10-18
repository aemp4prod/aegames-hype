// 0.14 end to end, in Chromium against the built hype.html with the mocked Claude runtime: the player's ideas.
// - an unknown starts with 0 € in the bank;
// - after the shoot, the edit (a rhythm game, or the rushes to sort) moves the video's score, and the thumbnail is made
//   (put together, or drawn by hand); an editor on the team does the edit; the upload screen shows the thumbnail made;
// - a character close to the player proposes a video together: accepted, it becomes the next release, with them in it;
// - a couple made public makes both grow, and the player's videos draw more views for a week;
// - those close to the player take the initiative (the AI is asked to);
// - a couple's evening that becomes too intimate stops there: « La suite appartient à leur intimité ».
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/studio.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-studio');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(path.join(ROOT, 'hype.html'), 'utf8');
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
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create); })) await sleep(250); };

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

  // ---------- 0 € to start with ----------
  const cash = await G(page, () => { const g = window.__hype.S.game; return { cash: g.career.cash, start: g.player.start || 'anon' }; });
  check('an unknown starts with 0 € in the bank', cash.cash === 0, cash);

  // a video, shot: the studio steps
  const shootDone = (score, kind) => G(page, (a) => {
    const H = window.__hype, g = H.S.game;
    g.career.platform = 'youtube';
    g.releases = g.releases.filter((x) => x.state !== 'scheduled');
    const r = H.scheduleRelease(g, { what: 'vidéo', topic: a.topic, due: Date.now() + 3600000 });
    if (a.kind) r.game = { kind: a.kind, items: [] };
    H.S.editForce = a.kind === 'montage' ? 'tri' : null; // (0.25: the edit rotates; after a rhythm shoot, the rushes here)
    H.finishShoot(r, a.score);
    H.S.modals = []; H.S.stack = [];
    H.openLayer({ t: 'minigame', id: r.id });
    H.update();
    return { id: r.id, score: r.played.score };
  }, { score, kind, topic: kind ? 'La nuit où j’ai visité la tour nord' : 'Je teste la potion interdite' });

  // ---------- the edit, quickly; the thumbnail, put together ----------
  const r1 = await shootDone(0.6);
  await page.waitForSelector('.layer .edit-step', { timeout: 5000 });
  await shot(page, 'edit-step');
  await clickText(page, '.layer .edit-step button', 'Passer le montage');
  await page.waitForSelector('.layer .thumb-step', { timeout: 5000 });
  const e1 = await G(page, (id) => { const r = window.__hype.S.game.releases.find((x) => x.id === id); return { edit: r.edit, score: r.played.score, line: (document.querySelector('.layer .ss-edit') || {}).textContent || '' }; }, r1.id);
  await page.click('.layer .th-sw[aria-label="Rouge"]');
  await clickText(page, '.layer .th-face', '😱');
  await page.fill('.layer #th-text', 'JE TESTE');
  await clickText(page, '.layer .thumb-step .chip-btn', 'Une flèche');
  await sleep(200);
  const est = await page.textContent('.layer .th-est');
  await shot(page, 'thumb-compose');
  await clickText(page, '.layer .th-ok', 'Valider la miniature');
  await page.waitForSelector('.layer .upload.up-wide .th-chosen', { timeout: 5000 });
  await G(page, () => { document.querySelector('.layer .upload').scrollIntoView({ block: 'start' }); });
  await shot(page, 'upload-with-thumb');
  await clickText(page, '.layer .upload .btn-hot', 'Publier');
  await page.waitForSelector('.video-card .vc-screen.custom .th-art', { timeout: 20000 });
  await idle(page);
  const v1 = await G(page, () => { const p = window.__hype.S.game.posts.find((x) => x.video && x.video.thumbLook); return p && { thumb: p.video.thumb, look: p.video.thumbLook, text: (document.querySelector('.video-card .th-art .th-text') || {}).textContent || '' }; });
  await shot(page, 'video-custom-thumb');
  check('after the shoot, a quick edit costs a few points (0.6 → 0.54) and says so; the thumbnail is put together (a red background, a shocked face, three words, an arrow: clickbait, said); the upload screen shows it; the video goes out with it',
    e1.edit && e1.edit.by === 'vite' && Math.abs(e1.score - 0.54) < 0.001 && /bâclé.*−6 points/.test(e1.line) && /\+30\s% de vues/.test(est) && /putaclic/.test(est) && v1 && v1.look.bg === 'rouge' && v1.look.emo === '😱' && /JE TESTE/.test(v1.text), { e1, est, v1 });

  // ---------- the rushes to sort (the shoot was the rhythm game); a thumbnail drawn by hand ----------
  const r2 = await shootDone(0.5, 'montage');
  await page.waitForSelector('.layer .edit-step', { timeout: 5000 });
  const kind2 = await G(page, (id) => window.__hype.S.game.releases.find((x) => x.id === id).editGame.kind, r2.id);
  await clickText(page, '.layer .edit-step button', 'Monter');
  for (let k = 0; k < 9; k++) {
    // (0.27.8: an answer's explanation stays up to 4 s: the last one may still show when the loop comes back)
    await page.waitForFunction((id) => !!window.__hype.S.game.releases.find((x) => x.id === id).edit || !!document.querySelector('.layer .mg-actions .btn-hot:not([disabled])'), r2.id, { timeout: 8000 });
    if (await G(page, (id) => !!window.__hype.S.game.releases.find((x) => x.id === id).edit, r2.id)) break;
    const good = await G(page, (id) => { const r = window.__hype.S.game.releases.find((x) => x.id === id), t = (document.querySelector('.layer .mg-card p') || {}).textContent || ''; return !!(r.editGame.items.find((x) => x.text === t) || {}).good; }, r2.id); // the take on screen
    await page.click(good ? '.layer .mg-actions .btn-hot' : '.layer .mg-actions .btn-ghost');
    await sleep(1350);
  }
  await page.waitForSelector('.layer .thumb-step', { timeout: 8000 });
  const e2 = await G(page, (id) => { const r = window.__hype.S.game.releases.find((x) => x.id === id); return { edit: r.edit, score: r.played.score, tier: r.played.tier }; }, r2.id);
  await clickText(page, '.layer .thumb-step [role=tab]', 'Dessiner');
  await page.waitForSelector('.layer .sketch-cv');
  const box = await page.locator('.layer .sketch-cv').boundingBox();
  await page.click('.layer .sk-color[aria-label="Couleur #E53935"]');
  await page.click('.layer .sketch-tools .chip-btn:has-text("Épais")');
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) await page.mouse.move(box.x + box.width * (0.2 + k * 0.05), box.y + box.height * (0.3 + (k % 2) * 0.3), { steps: 3 });
  await page.mouse.up();
  await page.click('.layer .sk-color[aria-label="Couleur #1E88E5"]');
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.2);
  await page.mouse.down();
  for (let k = 1; k <= 8; k++) await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * (0.2 + k * 0.08), { steps: 3 });
  await page.mouse.up();
  await sleep(300);
  const est2 = await page.textContent('.layer .th-est');
  const aiBtn = await page.$('.layer .th-ai');
  await shot(page, 'thumb-drawn');
  await clickText(page, '.layer .th-ok', 'Utiliser mon dessin');
  await page.waitForSelector('.layer .upload.up-wide .th-chosen img', { timeout: 5000 });
  await clickText(page, '.layer .upload .btn-hot', 'Publier');
  await page.waitForSelector('.video-card .vc-screen.custom .th-art img', { timeout: 20000 });
  await idle(page);
  const v2 = await G(page, (id) => { const g = window.__hype.S.game, r = g.releases.find((x) => x.id === id), p = g.posts.find((x) => x.video && x.video.thumbImg); return { thumb: r.thumb, img: p && p.video.thumbImg, kept: (g.media || []).includes(r.thumb.img), src: (document.querySelector('.video-card .th-art img') || {}).src || '' }; }, r2.id);
  check('the shoot was the rhythm game: the edit is the rushes to sort; all sorted right lifts the video by 15 points (0.5 → 0.65); a thumbnail drawn by hand is kept on the device and goes out with the video (no AI button without the ChatGPT app)',
    kind2 === 'tri' && e2.edit && e2.edit.m === 1 && Math.abs(e2.score - 0.65) < 0.001 && /fait main/.test(est2) && !aiBtn && v2.thumb.kind === 'drawn' && v2.thumb.ctr > 0.06 && v2.img === v2.thumb.img && v2.kept && /^data:image\/jpeg/.test(v2.src), { kind2, e2, est2, v2: Object.assign({}, v2, { src: v2.src.slice(0, 30) }) });

  // ---------- an editor and a designer on the team: they do it ----------
  const r3 = await G(page, () => {
    const H = window.__hype, g = H.S.game, z = H.charByHandle(g, 'nox.ombre');
    g.staff = [{ role: 'monteur', c: z.id, tier: 2, rate: 350, since: Date.now() }, { role: 'miniature', c: H.charByHandle(g, 'prof.gallant').id, tier: 1, rate: 60, since: Date.now() }];
    g.releases = g.releases.filter((x) => x.state !== 'scheduled');
    const r = H.scheduleRelease(g, { what: 'vidéo', topic: 'Mon carnet de duels', due: Date.now() + 3600000 });
    r.crew = ['monteur', 'miniature'];
    H.finishShoot(r, 0.5);
    H.S.modals = []; H.S.stack = [];
    H.openLayer({ t: 'minigame', id: r.id });
    H.update();
    return { edit: r.edit, thumb: r.thumb, score: r.played.score };
  });
  await page.waitForSelector('.layer .upload.up-wide', { timeout: 5000 });
  const ui3 = await G(page, () => ({ edit: (document.querySelector('.layer .ss-edit') || {}).textContent || '', thumb: (document.querySelector('.layer .th-chosen > div > b') || {}).textContent || '', steps: !!document.querySelector('.layer .edit-step, .layer .thumb-step') }));
  check('an editor and a designer on the team: the edit and the thumbnail are done (said, no game), straight to the upload screen',
    r3.edit && r3.edit.by === 'staff' && r3.score > 0.5 && r3.thumb && r3.thumb.kind === 'staff' && /Montage par Nox/.test(ui3.edit) && /Faite par Iris/.test(ui3.thumb) && !ui3.steps, { r3, ui3 });
  await G(page, () => { const H = window.__hype, g = H.S.game; g.staff = []; g.releases = g.releases.filter((x) => x.state !== 'scheduled'); H.S.stack = []; H.update(); });

  // ---------- a video together: proposed by a friend, accepted, it is the next release, with them ----------
  const co = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = H.charByHandle(g, 'theo.marlin');
    t.rel = 45;
    const iv = H.addInvite(g, t, { what: 'Tourner une vidéo ensemble au labo de potions', day: 1, at: '18:00' });
    const r = iv && H.acceptInvite(g, iv);
    const rl = H.activeRelease(g);
    return { collab: iv && iv.collab, rl: rl && { collab: rl.collab === t.id, what: rl.what, topic: rl.topic }, state: iv && iv.state, msg: ((g.dms[t.id] || { msgs: [] }).msgs.slice(-1)[0] || {}).text, plain: H.COLLAB_RE.test('Regarder une vidéo ensemble') };
  });
  const coUI = await G(page, () => {
    const H = window.__hype, g = H.S.game, r = H.activeRelease(g);
    H.finishShoot(r, 0.7);
    H.applyEdit(g, r, 0.5, 'vite');
    r.thumb = { kind: 'compose', preset: 'propre', look: H.presetLook('propre', r), ctr: 0.08, choc: false };
    H.S.modals = []; H.S.stack = [];
    H.openLayer({ t: 'minigame', id: r.id });
    H.update();
    return r.id;
  });
  await page.waitForSelector('.layer .upload', { timeout: 5000 });
  await page.waitForFunction(() => [...document.querySelectorAll('.layer .upload .chip-btn.on')].some((b) => /Théo/.test(b.textContent)), null, { timeout: 8000 }).catch(() => {}); // (the previous upload screen may still be closing)
  const chip = await G(page, () => [...document.querySelectorAll('.layer .upload .chip-btn.on')].map((b) => b.textContent.trim()));
  check('a friend proposes a video together (not just watching one): accepted, it is the next release, with them already in it on the upload screen',
    co.collab === true && co.rl && co.rl.collab && co.state === 'accepted' && /tourne|idées|énorme/.test(co.msg || '') && co.plain === false && chip.some((x) => /Théo/.test(x)), { co, chip });
  await G(page, () => { const H = window.__hype, g = H.S.game; g.releases = g.releases.filter((x) => x.state !== 'scheduled'); H.S.stack = []; H.update(); });

  // ---------- a couple made public: both grow, and the videos draw more for a week ----------
  const cp = await G(page, () => {
    const H = window.__hype, g = H.S.game, z = H.charByHandle(g, 'zara.vey');
    g.stats.followers = 300;
    z.followers = 480000; z.vibe = 'couple'; z.officiel = 'pending'; z.rel = 70;
    const f0 = g.stats.followers, z0 = z.followers, b0 = H.coupleBoost(g);
    H.announceCouple(g, z);
    return { gain: g.stats.followers - f0, back: z.followers - z0, b0, b1: H.coupleBoost(g), later: H.coupleBoost(g, Date.now() + 8 * 864e5), notif: g.notifs.some((n) => /fait jaser.*prochaines vidéos/.test(n.text)) };
  });
  check('a couple made public: the smaller account gains the most (here up to 2 000), the star gains a little, and for a week the player\'s videos draw ×1.25',
    cp.gain > 500 && cp.gain <= 2000 && cp.back > 0 && cp.b0 === 1 && cp.b1 === 1.25 && cp.later === 1 && cp.notif, cp);

  // ---------- those close to the player take the initiative ----------
  const ini = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = H.charByHandle(g, 'theo.marlin'), z = H.charByHandle(g, 'zara.vey');
    t.rel = 45; const near = H.promptDM(g, t, [], 'salut !');
    t.rel = 10; const far = H.promptDM(g, t, [], 'salut !');
    const couple = H.promptDM(g, z, [], 'coucou toi');
    return { near: /prend l’initiative/.test(near) && /"collab":true/.test(near), far: /prend l’initiative/.test(far), cosy: /soirée chez l’un ou l’autre/.test(couple) && /jamais explicite/.test(couple) };
  });
  check('someone close (relation 30 or more) is told to take the initiative now and then (an outing, a video together); a couple, a cosy evening, never explicit; a stranger, not',
    ini.near && !ini.far && ini.cosy, ini);

  // ---------- a couple's evening: too intimate, it stops there; staying the night, welcomed, ends it tenderly ----------
  const play = async (text, geste, reacts) => {
    const ev = await G(page, () => {
      const H = window.__hype, g = H.S.game, z = H.charByHandle(g, 'zara.vey');
      z.dates = 3; z.cool = null;
      g.events = (g.events || []).filter((e) => !(e.player && e.state === 'scheduled'));
      const ev = H.addEvent(g, { by: 'zara.vey', what: 'Une soirée chez elle, film et plaid', kind: 'rdv', in: 2 });
      ev.due = Date.now() - 60000;
      return ev.id;
    });
    await G(page, (id) => window.__hype.openTalk(window.__hype.S.game.events.find((e) => e.id === id)), ev);
    await idle(page);
    const n0 = await G(page, () => window.__prompts.length);
    await G(page, (a) => { if (a.reacts) window.__mockReacts = a.reacts.slice(); return window.__hype.talkTurn(window.__hype.S.game.events.find((e) => e.id === a.ev), a.text, a.geste); }, { ev, text, geste, reacts });
    await idle(page);
    return G(page, (a) => { const e = window.__hype.S.game.events.find((x) => x.id === a.ev); if (!e) return { gone: true }; const T = e.talk || { lines: [] }; return { calls: window.__prompts.length - a.n0, last: T.lines.slice(-1)[0], faded: !!T.faded, played: e.played, gestes: window.__hype.gestesFor ? window.__hype.gestesFor(window.__hype.S.game, e).map((x) => x.id) : [] }; }, { ev, n0 });
  };
  const f1 = await play('et si on faisait l’amour ce soir ?', null);
  console.log('f1', JSON.stringify(f1));
  await shot(page, 'evening-fade');
  const f2 = await play('', 'rester', ['charme']);
  check('a couple\'s evening: too intimate words stop the scene at once (no AI call), « La suite appartient à leur intimité », the evening counted as gone well; proposing to stay the night, welcomed, ends it the same way, tenderly (a success)',
    f1.calls === 0 && f1.faded && f1.last.who === 'n' && /La suite appartient à leur intimité/.test(f1.last.text) && f1.played && f1.played.tier !== 'flop'
      && f2.faded && f2.played && f2.played.tier === 'top' && f2.calls === 1, { f1, f2 });

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
