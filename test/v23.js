// 0.23 end to end, in Chromium against the built hype.html with the mocked Claude runtime:
// - the services: an order agreed in private (the AI notes it), the files the character sends (names only, role-play,
//   now or later), the work (the edit's rhythm game, the thumbnail tool), the delivery: their reaction, the money agreed,
//   the video on THEIR channel mentioning the player (followers by their fame and how it does), a botched one that flops
//   and stings; late, then given up; the AI told what the player does for others.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v23.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v23');
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
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.devis); })) await sleep(250); };
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
// A release shot and edited, its upload screen open.
async function readyRelease(page, what, topic) {
  return G(page, ([w, tp]) => {
    const H = window.__hype, g = H.S.game;
    const r = H.scheduleRelease(g, { what: w, topic: tp, due: Date.now() + 60000 });
    r.due = Date.now() - 1000;
    r.played = { tier: 'mid', score: 0.7, diff: 'normal' };
    r.edit = { m: 0.6, by: 'me', s0: 0.7 };
    r.render = { done: true };
    r.thumb = { kind: 'preset', preset: 'propre', ctr: 0.1 };
    H.openLayer({ t: 'minigame', id: r.id }); H.update();
    return r.id;
  }, [what, topic]);
}
const studio = async (page, sel) => { await G(page, () => { const H = window.__hype; H.S.stack = []; H.goTab('studio'); H.update(); }); await sleep(500); if (sel) await page.locator(sel).first().scrollIntoViewIfNeeded(); await sleep(200); };

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);
  await newGame(page, 'Une monteuse qui fait des edits de jeux vidéo');
  await G(page, () => { const H = window.__hype, g = H.S.game; g.career.platform = 'youtube'; g.stats.followers = 2400; window.__hypeNoGearEvent = true; });

  // ---------- an order agreed in private: the card, the files later (« after lunch ») ----------
  const ord = await G(page, async () => {
    const H = window.__hype, g = H.S.game, out = {};
    const t = H.charByHandle(g, 'theo.marlin');
    Object.assign(t, { rel: 40, followers: 50000, unlocked: true, age: 24 });
    window.__mockJob = { what: 'un edit Valorant fun mais très joli', files: ['rush_valorant_01.mp4', 'rush_valorant_02.mp4', 'clutch_1v3.mp4'], in: 60 };
    const n0 = window.__prompts.length;
    await H.sendDM(t.id, 'Salut ! ça te dit que je te fasse un edit valorant ? vu qu’on s’entend bien 👀');
    const p = window.__prompts.slice(n0).find((x) => x.includes('CONVERSATION PRIVÉE')) || '';
    out.lines = p.includes('{"t":"job","kind":"montage ou miniature"') && p.includes('{"t":"file","name":"nom_du_fichier.mp4","in":0}');
    const j = H.openJob(g, t.id);
    out.job = j && { kind: j.kind, what: j.what, pay: j.pay, state: j.state, files: j.files.length, days: Math.round((j.due - Date.now()) / 86400000) };
    out.now = j ? j.files.filter((f) => f.at <= Date.now()).length : -1;
    const convo = g.dms[t.id];
    out.card = convo.msgs.some((m) => m.sys === 'job' && m.job === (j && j.id));
    out.notif = g.notifs.some((x) => /Commande de Théo : un edit Valorant/.test(x.text));
    // an hour later, the files are there
    const hr = 61 * 60000; H.shiftTime(g, hr); g.clockOff = (g.clockOff || 0) + hr;
    out.later = j ? j.files.filter((f) => f.at <= Date.now()).length : -1;
    out.ctx = H.jobDMCtx(g, t).join(' ');
    H.S.stack = []; H.openDM(t.id); H.update();
    return out; });
  await sleep(600);
  await shot(page, 'order-in-dm');
  const dmView = await G(page, () => ({ cards: document.querySelectorAll('.layer .job-card').length, files: [...document.querySelectorAll('.layer .file-card b')].map((b) => b.textContent), btn: (document.querySelector('.layer .job-card .btn') || {}).textContent || '' }));
  check('an order agreed in private: the AI notes it (what, the money, the time to do it), a card in the conversation; the files they send come when they said (an hour later: names only, role-play), and the AI knows where it stands',
    ord.lines && ord.job && ord.job.kind === 'montage' && /edit Valorant/.test(ord.job.what) && ord.job.pay === 0 && ord.job.state === 'open' && ord.job.files === 3 && ord.now === 0 && ord.later === 3 && ord.card && ord.notif
      && /Commande en cours : le joueur fait le montage de Théo/.test(ord.ctx) && /rush_valorant_01\.mp4/.test(ord.ctx) && dmView.cards === 1 && dmView.files.includes('clutch_1v3.mp4') && /Faire le montage/.test(dmView.btn), { ord, dmView });

  // ---------- the work, then the delivery: on THEIR channel, the player mentioned ----------
  await page.click('.layer .job-card .btn');
  await page.waitForSelector('.layer .edit-step', { timeout: 5000 });
  await sleep(500); // (the layer slides in)
  await shot(page, 'order-work');
  const work = await G(page, () => { const L = [...document.querySelectorAll('.layer')].pop(); return { files: L.querySelectorAll('.job-files .file-card').length, title: (L.querySelector('.edit-step h3') || {}).textContent || '', diff: (L.querySelector('.edit-step .eyebrow') || {}).textContent || '' }; });
  const del = await G(page, async () => {
    const H = window.__hype, g = H.S.game, out = {};
    const t = H.charByHandle(g, 'theo.marlin'), j = H.openJob(g, t.id);
    const f0 = g.stats.followers, c0 = g.stats.skillXp.creativite, x0 = g.stats.xp + g.stats.level * 100000;
    H.jobWorked(g, j, 0.9, { diff: 'difficile' }); // (0.25.2: at the level picked: « excellent »)
    out.ready = j.state === 'ready';
    await H.sendJob(j.id);
    out.state = j.state;
    const p = g.posts.find((x) => x.id === j.post);
    out.post = p && { by: p.a === 'c:' + t.id, mention: p.text.includes('@' + g.player.handle), video: p.video && p.video.by === g.player.handle, views: p.video && p.video.views };
    out.fol = g.stats.followers - f0;
    out.crea = g.stats.skillXp.creativite - c0; // 0.24: the skill's XP (3 + 6 × the quality)
    out.xp = g.stats.xp + g.stats.level * 100000 - x0 > 0;
    out.sent = g.dms[t.id].msgs.some((m) => m.sys === 'file' && m.me && /edit_valorant_montage_final\.mp4|_montage_final\.mp4/.test(m.name));
    out.notif = (g.notifs.filter((x) => /publie la vidéo et te mentionne/.test(x.text)).slice(-1)[0] || {}).text || '';
    out.ctx = H.jobsCtx(g);
    out.mine = g.posts.some((x) => x.a === 'p' && x.video && /Valorant/.test(x.video.topic || ''));
    return out; });
  check('the work (the edit’s rhythm game, as demanding as their audience, the files at hand), then the delivery: the file sent, their reaction, the video on THEIR channel (not the player’s) mentioning the player, followers by their fame and how it does; creativity and XP; the AI told what the player does for others',
    work.files === 3 && /Le montage pour Théo/.test(work.title) && del.ready && del.state === 'done' && del.post && del.post.by && del.post.mention && del.post.video && del.post.views > 1000
      && del.fol > 0 && del.crea === 8 && del.xp && del.sent && /publie la vidéo et te mentionne/.test(del.notif) && /services aux autres créateurs/.test(del.ctx) && !del.mine, { work, del });

  // ---------- botched: it flops, and it stings; paid: the money agreed; late, then given up ----------
  const more = await G(page, async () => {
    const H = window.__hype, g = H.S.game, out = {};
    const z = H.mains(g).find((c) => c.handle !== 'theo.marlin');
    Object.assign(z, { rel: 40, followers: 80000, unlocked: true, age: 23 });
    const j1 = H.addJob(g, z, { kind: 'montage', what: 'un vlog de rentrée', pay: 60, days: 2 });
    H.addJobFile(g, z, { name: 'vlog_rush_A' });
    out.ext = j1.files[0].name;
    out.payCap = H.payCap(z);
    H.jobWorked(g, j1, 0.2);
    const r0 = z.rel, cash0 = g.career.cash;
    await H.sendJob(j1.id);
    out.flop = { state: j1.state, paid: g.career.cash - cash0, half: j1.paid, trig: g.triggers.some((x) => x.c === z.id && /fait un flop/.test(x.text)), notif: g.notifs.some((x) => /fait un flop/.test(x.text)), drop: z.rel < r0 };
    // late, then given up
    const j2 = H.addJob(g, z, { kind: 'miniature', what: 'la miniature de sa vidéo de cuisine', pay: 0, days: 1 });
    j2.due = Date.now() - 1000; const r1 = z.rel;
    H.tickJobs(g, Date.now());
    out.late = { said: !!j2.lateSaid, trig: g.triggers.some((x) => x.c === z.id && /attend toujours la miniature/.test(x.text)), drop: z.rel < r1 };
    j2.due = Date.now() - 4 * 86400000;
    H.tickJobs(g, Date.now());
    out.dropped = j2.state === 'dropped';
    // a thumbnail order: the thumbnail tool, its quality from its click rate
    const j3 = H.addJob(g, z, { kind: 'miniature', what: 'une miniature pour son vlog', pay: 0 });
    out.thumbQ = [H.thumbQual({ ctr: 0.08 }), H.thumbQual({ ctr: 0.3 })].map((x) => Math.round(x * 100));
    H.S.stack = []; H.openLayer({ t: 'job', id: j3.id }); H.update();
    out.j3 = j3.id;
    return out; });
  await page.waitForSelector('.layer .thumb-step', { timeout: 5000 });
  await page.click('.layer .thumb-step .th-ok');
  await sleep(300);
  const th = await G(page, (id) => { const j = window.__hype.jobOf(window.__hype.S.game, id); return { state: j.state, m: Math.round(j.m * 100), btn: (([...document.querySelectorAll('.layer')].pop() || document).querySelector('.job-ready .btn-hot') || {}).textContent || '' }; }, more.j3);
  await shot(page, 'order-thumbnail-ready');
  check('botched, the video flops and they hold it against the player (half the money agreed); the payment is capped by their fame; late, they say so, then give up; a thumbnail order goes through the thumbnail tool, its quality from what it would draw',
    more.ext === 'vlog_rush_A.mp4' && more.payCap >= 60 && more.flop.state === 'done' && more.flop.paid === 30 && more.flop.half === 30 && more.flop.trig && more.flop.notif && more.flop.drop
      && more.late.said && more.late.trig && more.late.drop && more.dropped && more.thumbQ[0] === 53 && more.thumbQ[1] === 100 && th.state === 'ready' && th.m > 0 && /Envoyer à/.test(th.btn), { more, th });

  console.log('\nERRORS', errors.filter((e) => !/favicon|ERR_FAILED|net::/.test(e)).join('\n') || 'none');
  console.log('CHECKS', `${checks.filter((c) => c[0] === 'PASS').length}/${checks.length}`);
  await browser.close();
  process.exit(checks.every((c) => c[0] === 'PASS') ? 0 : 1);
})().catch((e) => { console.error('FAILED', e); console.log('ERRORS', errors.join('\n')); console.log('CHECKS', checks.map((c) => c[0] + ' ' + c[1]).join('\n')); process.exit(1); });
