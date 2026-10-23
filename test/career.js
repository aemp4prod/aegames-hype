// The 0.7 features end to end, in Chromium against the built hype.html with the mocked Claude runtime (test/mock.js):
// the café budget, the clock and the watch, the settings, the Studio (money, partner program, payout), the upload
// screens per platform, sponsors (negotiation, « écrire pour moi », a hidden ad that gets caught), recruiting and
// salaries, the daily upload, a false rumor and its denial, leaked DMs, an enemy at work, portraits.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/career.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-career');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(process.env.PAGE || path.join(ROOT, 'hype.html'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const UMD = fs.readFileSync(process.env.UMD, 'utf8');
const SKELETON = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;
// a tiny PNG to import as a portrait (a 2×2 pixel image)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGP8z8DwnwEJMDEwMDIwAABEZgMFSo0qDgAAAABJRU5ErkJggg==', 'base64');

const errors = [];
const checks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 0.15: the pen steps aside while the feed scrolls down; a player scrolls back up, a test brings it back
const clickFab = async (page, opts) => { await page.evaluate(() => { const H = window.__hype; if (H && H.S.fabAway) { H.S.fabAway = false; H.update(false); } }); await page.click('.fab', opts); };
let shotN = 0;
const check = (name, ok, info) => { checks.push([ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)]); console.log(ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)); };
async function shot(page, name) { shotN++; const file = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: file }); console.log('shot', path.basename(file)); }
async function clickText(page, sel, text) {
  const el = page.locator(sel, { hasText: text }).first();
  // a modal can pop up at any moment (a level up, a payday…): close it and try again
  for (let attempt = 0; ; attempt++) {
    try {
      if (!sel.startsWith('.modal')) for (let k = 0; k < 4 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(700); }
      await el.waitFor({ state: 'visible', timeout: 15000 });
      await el.click({ timeout: attempt < 2 ? 5000 : 15000 });
      return;
    } catch (e) {
      if (attempt < 2 && !sel.startsWith('.modal') && (await page.$('.modal'))) continue;
      // a toast over the button (a DM, a mention…): put the toasts away and try again
      // (0.28.1: the toasts wait their turn now: one may have just gone, another may come; clear them all, and the queue)
      if (attempt < 2) { await page.evaluate(() => { const H = window.__hype; if (H) { H.S.toasts.forEach((t) => { t.until = 0; }); if (H.TOAST_Q) H.TOAST_Q.length = 0; H.update(false); } }); await sleep(200); continue; }
      await page.screenshot({ path: path.join(OUT, 'fail.png') }).catch(() => {});
      throw new Error(`clickText(${sel}, ${text}): ${e.message.split('\n')[0]}`);
    }
  }
}
async function dismiss(page) { for (let k = 0; k < 6 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(700); } }
async function back(page) { await dismiss(page); await page.click('.layer-head .iconbtn >> nth=-1'); await sleep(300); }
async function overflowCheck(page, label) {
  const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth }));
  if (w.sw > w.cw + 1 || w.bw > w.cw + 1) errors.push(`[overflow] ${label}: ${JSON.stringify(w)}`);
}
const G = (page, fn, arg) => page.evaluate(fn, arg);
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.cand || b.write); })) await sleep(300); };
let lastPage = null;

// 0.14: after the shoot, the edit (done quickly here) and the thumbnail (a model, or the one already chosen)
async function studioSteps(page, thumb) {
  for (let k = 0; k < 4; k++) {
    await page.waitForSelector('.layer .upload, .layer .edit-step, .layer .thumb-step', { timeout: 10000 });
    if (await page.$('.layer .upload')) return;
    if (await page.$('.layer .edit-step')) { await page.click('.layer .edit-step button:has-text("Passer le montage")'); await new Promise((r) => setTimeout(r, 300)); continue; }
    if (thumb) await page.click(`.layer .thumb-opt:has-text("${thumb}")`);
    await page.click('.layer .th-ok');
    await new Promise((r) => setTimeout(r, 300));
  }
}

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
  const ver = await page.textContent('.app-version');
  check('home: the version and the alpha stage in a corner', /0\.\d+\.\d/.test(ver) && /alpha/i.test(ver), ver);

  // ---------- onboarding: the platform and the AI budget are chosen up front ----------
  await clickText(page, 'button', 'Nouvelle partie');
  await clickText(page, 'button.world', 'Académie Lumen');
  await page.waitForSelector('#pn');
  await page.fill('#pn', 'Mila Flux');
  await clickText(page, '.seg button', 'Elle');
  await page.fill('#pi', 'Une youtubeuse qui enquête sur les secrets de l’académie');
  const guess = await page.textContent('.pf-pick + small');
  await clickText(page, '.tier', 'Léger');
  await shot(page, 'persona-platform-budget');
  await page.check('#p18');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=Qui sera ton premier abonné', { timeout: 20000 });
  await page.locator('.cast-card.pick', { hasText: 'Théo' }).click();
  await page.click('.cast-cta button');
  await page.waitForSelector('.post');
  await sleep(1500);
  await dismiss(page);
  const g0 = await G(page, () => { const H = window.__hype, g = H.S.game; return { daily: g.budget.daily, used: g.budget.used, pf: g.career.platform, cash: g.career.cash, strip: !!document.querySelector('.status-strip .clock-btn'), cashChip: (document.querySelector('.cash-chip') || {}).textContent || '', tabs: [...document.querySelectorAll('.tab span')].map((x) => x.textContent).join(',') }; });
  check('new game: a light budget (25 cafés), YouTube guessed from the role, 0 € to start (0.14), the clock strip and the Studio tab', /YouTube/.test(guess) && g0.daily === 25 && g0.used > 0 && g0.pf === 'youtube' && g0.cash === 0 && g0.strip && /\b0\s€/.test(g0.cashChip) && /Studio/.test(g0.tabs), { guess, g0 });
  await shot(page, 'feed-with-strip');
  await overflowCheck(page, 'feed strip');

  // ---------- the café budget: the guard stops the AI, the player decides ----------
  await G(page, () => { const b = window.__hype.budgetOf(window.__hype.S.game); b.used = b.daily; window.__hype.update(); });
  await dismiss(page);
  await clickFab(page);
  await page.fill('#compose', 'premier jour, première enquête');
  const blockedBtn = await page.isDisabled('.layer-head .btn-hot');
  await clickText(page, '.composer-meta .linkbtn', 'Options'); // in the composer: the budget is out, the options are one tap away
  await page.waitForSelector('.modal .budget-card');
  await sleep(300);
  await shot(page, 'budget-modal');
  const bm = await page.textContent('.modal .budget-card');
  await clickText(page, '.modal .btn-hot', '+10 cafés');
  await sleep(400);
  const after10 = await G(page, () => ({ left: window.__hype.cafesLeft(window.__hype.S.game), can: window.__hype.canAfford(window.__hype.S.game, 'post') }));
  check('budget used up: publishing is paused, the chip opens the budget, « +10 cafés juste pour aujourd’hui » unlocks it', blockedBtn && /épuisé/.test(bm) && /tokens/.test(bm) && after10.left >= 9.9 && after10.can, { blockedBtn, after10 });
  await G(page, () => { window.__hype.budgetOf(window.__hype.S.game).daily = 0; }); // the rest runs without a limit
  await page.click('.layer-head .btn-hot');
  await idle(page);
  await sleep(1500);
  const charged = await G(page, () => { const b = window.__hype.budgetOf(window.__hype.S.game); return { used: b.used, post: b.avg.post, tokens: b.chars / 4 }; });
  check('each call is paid for what it really used (measured, per kind)', charged.post > 0.2 && charged.tokens > 1000, charged);
  await back(page).catch(() => {});

  // ---------- « Avancer jusqu’à la sortie » while the characters are still writing ----------
  await dismiss(page);
  await clickFab(page);
  await page.fill('#compose', 'ma vidéo sur les secrets de la bibliothèque sort dans 1h. préparez-vous');
  await page.check('.layer .ann-card input'); // 0.31.2: the player ticks « Faire une vidéo à partir de ce post »
  await clickText(page, '.layer .ann-box .chip-btn', 'Au plus vite');
  await clickText(page, '.layer-head button', 'Publier');
  await page.waitForSelector('.release-card', { timeout: 20000 });
  await idle(page);
  await G(page, () => { const H = window.__hype, r = H.activeRelease(H.S.game); r.due = Date.now() + 40000; H.S.busy.act = 'fake'; H.update(); });
  await sleep(300);
  await clickText(page, '.release-card button', 'Avancer jusqu');
  await sleep(500);
  const waiting = await G(page, () => ({ wait: window.__hype.S.skipWait, toast: [...document.querySelectorAll('.toast')].map((x) => x.textContent).join(' | '), btn: (document.querySelector('.release-card .btn-hot') || {}).textContent || '' }));
  await G(page, () => { window.__hype.S.busy.act = null; });
  await page.waitForSelector('.release-card.due', { timeout: 10000 });
  check('« Avancer jusqu’à la sortie » while the characters still write: it waits for them, then jumps', waiting.wait && /réagit encore/.test(waiting.toast) && /dès que/.test(waiting.btn), waiting);
  await shot(page, 'release-due-after-wait');

  // ---------- the upload screen of the platform, a partner program, views and money ----------
  await G(page, () => { const H = window.__hype, g = H.S.game; g.stats.followers = 1500; g.career.log.push({ at: Date.now() - 86400000, what: 'vidéo', views: 60000, hours: 4200 }); H.S.mgForce = 'ai'; H.update(); });
  await clickText(page, '.tab', 'Studio');
  await page.waitForSelector('.studio-head');
  await sleep(300);
  await shot(page, 'studio');
  await overflowCheck(page, 'studio');
  await clickText(page, '.section button', 'Postuler');
  await sleep(300);
  const rev = await G(page, () => window.__hype.S.game.career.prog.state);
  await G(page, () => { const H = window.__hype, g = H.S.game; g.career.prog.until = Date.now() - 1; H.tickCareer(g); H.update(); });
  await page.waitForSelector('.modal-card.viral', { timeout: 8000 });
  await shot(page, 'program-accepted');
  await dismiss(page);
  check('the partner program: apply when the real thresholds are met (1 000 subs, 4 000 h), reviewed, then monetized', rev === 'review' && await G(page, () => window.__hype.S.game.career.prog.state === 'on'), rev);
  // 0.32.1: a bad buzz already over no longer blocks it; one still going does, and why is said (the notice, the Studio);
  // a refusal of before (no reason kept) is looked at again
  const pr = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = g.career, t = Date.now(), keep = { prog: c.prog, pbb: g.pbb || null, rep: g.stats.reputation };
    const decide = (pbb) => { g.pbb = pbb; c.prog = { state: 'review', at: t - 3 * 864e5, until: t - 1 }; H.tickCareer(g); return Object.assign({}, c.prog); };
    const over = decide({ at: t - 2 * 864e5, until: t - 2 * 864e5 + 420000, c: null, kind: 'pub', sorry: 1, over: 1 });
    const live = decide({ at: t - 600000, until: t + 3000000, c: null, kind: 'pub' });
    const notif = g.notifs.slice(-4).some((n) => /^Refusé.* : tu étais en plein bad buzz au moment de l’examen\. Retente dans 7 jours\.$/.test(n.text));
    g.stats.reputation = 20;
    const low = decide(null);
    g.stats.reputation = keep.rep;
    c.prog = { state: 'refused', at: t - 864e5, retry: t + 6 * 864e5 };
    const again = H.reviewProgram321(g, t), after = Object.assign({}, c.prog), told = g.notifs.slice(-2).some((n) => /a réexaminé ta candidature : accepté/.test(n.text));
    c.prog = { state: 'refused', at: t, retry: t + 6 * 864e5, why: 'tu étais en plein bad buzz au moment de l’examen' };
    H.update();
    return { over: over.state, live: [live.state, live.why], notif, low: [low.state, low.why], again, after: after.state, told, keep };
  });
  await sleep(300);
  const prTxt = await G(page, () => [...document.querySelectorAll('.section')].map((x) => x.textContent).find((x) => /Programme Partenaire/.test(x)) || '');
  await G(page, (k) => { const g = window.__hype.S.game; g.career.prog = k.prog; g.pbb = k.pbb; window.__hype.update(); }, pr.keep);
  check('0.32.1: a bad buzz already over no longer blocks the partner program; one still going, or a reputation under 250/1000, does, and the notice and the Studio say why; a refusal of before is looked at again (yes, now)',
    pr.over === 'on' && pr.live[0] === 'refused' && /plein bad buzz/.test(pr.live[1]) && pr.notif && pr.low[0] === 'refused' && /réputation est trop basse \(200\/1000, il faut au moins 250\)/.test(pr.low[1])
      && pr.again === true && pr.after === 'on' && pr.told && /Refusé(e|·e)? parce que tu étais en plein bad buzz au moment de l’examen\./.test(prTxt), Object.assign({ prTxt: prTxt.slice(0, 200) }, pr, { keep: undefined }));
  await clickText(page, '.tab', 'Fil');
  await clickText(page, '.release-card button', 'Tourner');
  await page.waitForSelector('.mg-setup');
  await clickText(page, '.mg-setup > .btn', 'Lancer le tournage');
  await page.waitForSelector('.mg-intro', { timeout: 20000 });
  await clickText(page, '.mg-intro button', 'parti');
  for (let k = 0; k < 6; k++) { await page.waitForSelector('.mg-actions .btn-hot:not([disabled])', { timeout: 8000 }); await page.click('.mg-actions .btn-hot'); await sleep(1300); }
  await studioSteps(page, 'Visage choqué');
  await page.waitForSelector('.upload.up-wide', { timeout: 10000 });
  await page.fill('#up-title', 'J’AI OUVERT LA SALLE INTERDITE (on m’a vu)');
  await sleep(200);
  await G(page, () => { document.querySelector('.upload').scrollIntoView({ block: 'start' }); });
  await shot(page, 'upload-youtube');
  const est = await page.textContent('.up-est');
  const est0 = await G(page, () => window.__hype.S.game.career.est);
  await clickText(page, '.upload .btn-hot', 'Publier');
  await page.waitForSelector('.video-card', { timeout: 20000 });
  await idle(page);
  await sleep(2500);
  const vid = await G(page, (e0) => { const g = window.__hype.S.game; const p = g.posts.find((x) => x.video && x.video.views); return p && { views: p.video.views, money: p.video.money, title: p.video.title, thumb: p.video.thumb, est: g.career.est - e0, log: g.career.log.length, card: (document.querySelector('.video-card .vc-views') || {}).textContent || '' }; }, est0);
  check('a release published from the YouTube-like screen: title, shocking thumbnail, views counted, ad money booked for the month', /vues/.test(est) && vid && vid.views > 50 && vid.money > 0 && vid.est > 0 && vid.thumb === 'choc' && /SALLE INTERDITE/.test(vid.title) && /vues/.test(vid.card), { est, vid });
  await shot(page, 'video-in-feed');

  // ---------- the clock, the watch, the seasons ----------
  const cal = await G(page, () => { const H = window.__hype; const m = H.calMoment(new Date(2026, 9, 25)); return { halloween: m && m.E.id + ':' + m.days, dec: H.adSeason(new Date(2026, 11, 10)), jan: H.adSeason(new Date(2027, 0, 10)), jul: H.adSeason(new Date(2026, 6, 10)), prime: H.audienceAt(new Date(2026, 9, 14, 20)), night: H.audienceAt(new Date(2026, 9, 14, 3)), bf: H.calMoment(new Date(2026, 10, 27)).E.id }; });
  check('the calendar: Halloween 6 days ahead, ads pay most in December, least in January, less in summer; evenings beat nights', cal.halloween === 'halloween:6' && cal.dec > 1.4 && cal.jan < 0.85 && cal.jul < 1 && cal.prime > 1.2 && cal.night < 0.4 && cal.bf === 'blackfriday', cal);
  await dismiss(page); // (a level gained with the release may show first)
  await page.click('.clock-btn');
  await page.waitForSelector('.modal svg.watch');
  await page.focus('.modal svg.watch');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowRight');
  await sleep(200);
  await shot(page, 'watch');
  const read = await page.textContent('.watch-read b');
  const off0 = await G(page, () => window.__hype.S.game.clockOff);
  await clickText(page, '.modal .btn-hot', 'Avancer de');
  await idle(page);
  const off1 = await G(page, () => window.__hype.S.game.clockOff);
  check('the watch: arrows turn the hand (+1 h, +5 min), « Avancer » moves the game clock that far', /2 h 05/.test(read) && Math.round((off1 - off0) / 60000) === 125, { read, moved: Math.round((off1 - off0) / 60000) });

  // ---------- payday: the month changes on the game clock ----------
  await G(page, () => { const H = window.__hype, g = H.S.game; g.career.est = 123.45; g.career.estMonth = '2000-01'; H.tickCareer(g); H.update(); });
  await page.waitForSelector('.modal-card.viral', { timeout: 8000 });
  const paid = await G(page, () => ({ cash: window.__hype.S.game.career.cash, est: window.__hype.S.game.career.est, modal: document.querySelector('.modal-card').textContent }));
  check('a new month: the platform pays last month’s revenue (over 70 €) into the cash', paid.cash >= 123 && paid.est === 0 && /123/.test(paid.modal), paid);
  await dismiss(page);

  // ---------- a brand: an offer in DMs, a negotiation, « écrire pour moi », a signature ----------
  await G(page, () => { const H = window.__hype, g = H.S.game; g.stats.followers = 9000; g.career.offerAt = Date.now() + 1800000; window.__mockSponsor = true; window.__mockSponsorShady = false; /* a contract with the mention (the hidden one has its own suite) */ g.lastRefreshAt = 0; g.stats.gems = 20; g.career.log.push({ at: Date.now() - 3600000, what: 'vidéo', views: 40000, hours: 3000 }); });
  await clickText(page, '.feed-tools button', 'Actualiser');
  await idle(page);
  await sleep(2500);
  const offer = await G(page, () => { const g = window.__hype.S.game; const d = g.deals.find((x) => x.brand === 'Potions Pétillantes'); return d && { fee: d.fee, contact: d.contact, max: d.max, state: d.state }; });
  check('a brand of the world contacts the player (written by the model during a refresh), with a fair price', !!offer && offer.fee > 50 && offer.state === 'offer', offer);
  await G(page, (id) => window.__hype.openDM(id), offer.contact);
  await page.waitForSelector('.layer .deal-card');
  await sleep(400);
  await shot(page, 'deal-in-dm');
  await clickText(page, '.layer .deal-card button', 'Négocier');
  await sleep(300);
  const draft = await page.inputValue('.layer .reply-box textarea');
  await page.click('.layer .send');
  await idle(page);
  await sleep(3000);
  const nego = await G(page, (o) => { const d = window.__hype.S.game.deals.find((x) => x.contact === o.contact); return { fee: d.fee, fee0: d.fee0, max: d.max }; }, offer);
  check('« Négocier » drafts a counter-offer from the real numbers; the brand comes up to its maximum, never above', /vues/.test(draft) && nego.fee > nego.fee0 && nego.fee <= nego.max, { draft, nego });
  const gems0 = await G(page, () => window.__hype.S.game.stats.gems);
  await clickText(page, '.layer .write-btn', 'Écrire pour moi');
  await page.waitForFunction(() => /devis détaillé/.test((document.querySelector('.layer .reply-box textarea') || {}).value || ''), null, { timeout: 15000 });
  const wrote = await G(page, (g0) => ({ text: document.querySelector('.layer .reply-box textarea').value, gems: window.__hype.S.game.stats.gems, spent: g0 - window.__hype.S.game.stats.gems }), gems0);
  check('« Écrire pour moi » (2 gems): the detailed quote the brand asked for, written in the player’s voice, left to send', /Total/.test(wrote.text) && wrote.spent === 2, wrote);
  await shot(page, 'write-for-me');
  await page.fill('.layer .reply-box textarea', '');
  await clickText(page, '.layer .deal-card button', 'Signer');
  await sleep(500);
  const signed = await G(page, (o) => { const g = window.__hype.S.game, d = g.deals.find((x) => x.contact === o.contact); return { state: d.state, upfront: d.upfront, due: Math.round((d.due - Date.now()) / 86400000) }; }, offer);
  check('signed: a contract with a deadline (and 30 % up front from 500 €)', signed.state === 'signed' && signed.due >= 2, signed);
  await back(page);

  // ---------- recruiting an editor: candidates by the model, a negotiated rate, the editor at work ----------
  await clickText(page, '.tab', 'Studio');
  await clickText(page, '.section .btn-hot', 'Recruter');
  await page.waitForSelector('.role-grid');
  await clickText(page, '.section .btn-hot', 'Voir des candidats');
  await page.waitForSelector('.cand-card', { timeout: 15000 });
  await idle(page);
  await sleep(500);
  await shot(page, 'candidates');
  await overflowCheck(page, 'candidates');
  const cands = await G(page, () => window.__hype.S.game && Object.values(window.__hype.S.game.chars).filter((c) => c.kind === 'cand').map((c) => ({ id: c.id, name: c.name, tier: c.cand.tier, rate: c.cand.rate })));
  check('three candidates of different levels, the more experienced the pricier', cands.length === 3 && cands[0].rate < cands[1].rate && cands[1].rate < cands[2].rate, cands);
  const bastien = cands.find((c) => /Bastien/.test(c.name));
  await G(page, (id) => window.__hype.openDM(id), bastien.id);
  await page.waitForSelector('.layer .reply-box textarea');
  await page.fill('.layer .reply-box textarea', 'ton tarif est un peu haut pour moi, tu peux faire un geste ?');
  await page.click('.layer .send');
  await idle(page);
  await sleep(2500);
  const rate1 = await G(page, (id) => window.__hype.S.game.chars[id].cand.rate, bastien.id);
  await back(page);
  await page.locator('.cand-card', { hasText: 'Bastien' }).locator('.btn-hot').click();
  await sleep(500);
  const hired = await G(page, () => { const g = window.__hype.S.game; return { staff: g.staff.map((m) => m.role + ':' + m.rate), others: Object.values(g.chars).filter((c) => c.kind === 'cand').length }; });
  check('a candidate lowers the rate in DMs, gets hired; the other candidates are let go', rate1 < bastien.rate && hired.staff.length === 1 && hired.staff[0].startsWith('monteur:') && hired.others === 0, { before: bastien.rate, rate1, hired });

  // ---------- a sponsored release, without the legal mention: the editor works, the law catches it ----------
  await clickText(page, '.tab', 'Fil');
  const dealWhat = await G(page, () => { const H = window.__hype, g = H.S.game; g.career.cash = Math.max(g.career.cash, 2000); /* the editor is paid at the shoot: money there, whatever the timers on a busy machine */ const d = g.deals.find((x) => x.state === 'signed'); d.what = 'vidéo'; H.scheduleRelease(g, { what: d.what, topic: 'je teste la potion au citron', due: Date.now() + 9 * 3600000 }); H.update(); return d.what; }); // a video: the editor works on it (0.32: less than 8 h with them, its shoot in two or three hours)
  await clickText(page, '.release-card button', 'Avancer jusqu');
  await page.waitForSelector('.release-card.due', { timeout: 10000 });
  const cash0 = await G(page, () => window.__hype.S.game.career.cash);
  await clickText(page, '.release-card button', 'Tourner');
  await page.waitForSelector('.mg-setup');
  await clickText(page, '.mg-setup > .btn', 'Lancer le tournage');
  await page.waitForSelector('.mg-intro', { timeout: 20000 });
  const crewLine = await page.textContent('.mg-intro .mg-crew').catch(() => '');
  await clickText(page, '.mg-intro button', 'parti');
  for (let k = 0; k < 6; k++) { await page.waitForSelector('.mg-actions .btn-hot:not([disabled])', { timeout: 8000 }); await page.click('.mg-actions .btn-hot'); await sleep(1300); }
  await studioSteps(page);
  await page.waitForSelector('.upload .up-sponsor', { timeout: 10000 });
  await page.click('.mention-toggle input');
  await sleep(200);
  await G(page, () => { document.querySelector('.up-sponsor').scrollIntoView({ block: 'center' }); });
  await shot(page, 'upload-sponsor-no-mention');
  await clickText(page, '.upload .btn-hot', 'Publier');
  await page.waitForSelector('.sp-tag', { timeout: 20000 });
  await idle(page);
  await sleep(2500);
  const spon = await G(page, (c0) => { const g = window.__hype.S.game; const d = g.deals.find((x) => x.state === 'done'); const p = g.posts.find((x) => x.video && x.video.sponsor); return { done: !!d, mention: d && d.mention, cashDelta: g.career.cash - c0, extra: p && p.video.extra && p.video.extra.views, editorPaid: g.career.ledger.some((x) => /Monteur/.test(x.label) && x.amount < 0) }; }, cash0);
  check('the editor gets to work (paid at the shoot, more time, a short cut from the video); the sponsor pays on delivery', /équipe/.test(crewLine) && spon.done && spon.mention === false && spon.extra > 0 && spon.editorPaid, { crewLine, spon });
  await G(page, () => { const H = window.__hype, g = H.S.game, d = g.deals.find((x) => x.state === 'done'); d.check = Date.now() - 1; H.tickCareer(g); H.update(); });
  await page.waitForSelector('.modal-card.busted', { timeout: 8000 });
  await shot(page, 'fine-hidden-ad');
  const fine = await G(page, () => { const g = window.__hype.S.game; return { pbb: !!(g.pbb && g.pbb.kind === 'pub'), fined: g.career.ledger.some((x) => x.kind === 'fine'), post: g.posts.some((p) => /PubCachée/.test(p.text)) }; });
  check('a hidden ad, spotted later: a fine, a bad buzz, #PubCachée', fine.pbb && fine.fined && fine.post, fine);
  await dismiss(page);
  await G(page, () => { const g = window.__hype.S.game; g.pbb = null; window.__hype.repSet(g, 60); g.stats.cancelled = false; window.__hype.update(); });

  // ---------- salaries: a community manager paid weekly; unpaid twice, gone (and talking) ----------
  const cm = await G(page, () => { const H = window.__hype, g = H.S.game; const c = H.addCandidate(g, 'cm', { tier: 1, name: 'Yanis Morel', g: 'm' }); g.career.cash = 5000; H.hireStaff(g, c); const m = g.staff.find((x) => x.role === 'cm'); m.next = Date.now() - 1; H.payroll(g, Date.now()); const paid = m.unpaid === 0; g.career.cash = 0; m.next = Date.now() - 1; H.payroll(g, Date.now()); const once = m.unpaid; m.next = Date.now() - 1; H.payroll(g, Date.now()); H.update(); return { paid, once, left: !g.staff.includes(m), kind: c.kind, rep: g.stats.reputation }; });
  await sleep(500);
  check('salaries every week; unpaid twice, the community manager quits and tells everyone (−6 of reputation)', cm.paid && cm.once === 1 && cm.left && cm.kind === 'ex' && cm.rep <= 54, cm);

  // ---------- the daily upload: an episode that works raises the multiplier, a missed one breaks the series ----------
  await G(page, () => { const H = window.__hype, g = H.S.game; const r = H.activeRelease(g); if (r) r.state = 'dropped'; H.update(); });
  await clickText(page, '.tab', 'Studio');
  await clickText(page, '.section .btn-hot', 'Défi Daily Upload');
  await page.waitForSelector('#se-theme');
  await page.fill('#se-theme', 'une potion ratée par jour');
  await clickText(page, '.seg button', '3 jours');
  await shot(page, 'series-sheet');
  await overflowCheck(page, 'series sheet');
  await clickText(page, '.mg-setup > .btn', 'Lancer le défi');
  await sleep(500);
  const s0 = await G(page, () => { const H = window.__hype, g = H.S.game, r = H.activeRelease(g); return { on: g.series && g.series.state, ep: r && r.ep, series: !!(r && r.series), hour: r && H.gameDate(H.relAnn(r)).getHours() }; }); // (0.30.1: its hour is when it comes out)
  check('the daily upload starts: episode 1 programmed at the chosen hour (18 h), no postponing', s0.on === 'on' && s0.ep === 1 && s0.series && s0.hour === 18, s0);
  // (0.32: its 8 h of work start at 10 h: played in the afternoon, the shoot is already due, nothing to skip to)
  if (!(await page.$('.release-card.due'))) await clickText(page, '.release-card button', 'Avancer jusqu');
  await page.waitForSelector('.release-card.due', { timeout: 10000 });
  const noPostpone = await G(page, () => !/Repousser/.test((document.querySelector('.release-card') || {}).textContent || ''));
  await clickText(page, '.release-card button', 'Tourner');
  await page.waitForSelector('.mg-setup');
  await clickText(page, '.mg-setup > .btn', 'Lancer le tournage');
  await page.waitForSelector('.mg-intro', { timeout: 20000 });
  await clickText(page, '.mg-intro button', 'parti');
  for (let k = 0; k < 6; k++) {
    await page.waitForSelector('.mg-actions .btn-hot:not([disabled])', { timeout: 8000 });
    const txt = await page.textContent('.mg-card p');
    await page.click(/procès-verbal|vote truqué|messages de Léandre/.test(txt) ? '.mg-actions .btn-hot' : '.mg-actions .btn-ghost');
    await sleep(1300);
  }
  await studioSteps(page);
  await page.waitForSelector('.upload', { timeout: 10000 });
  await clickText(page, '.upload .btn-hot', 'Publier');
  await page.waitForSelector('.release-card', { timeout: 25000 });
  await idle(page);
  await sleep(1500);
  const s1 = await G(page, () => { const H = window.__hype, g = H.S.game, r = H.activeRelease(g); return { streak: g.series.streak, mult: H.seriesMult(g), next: r && r.ep, inDays: r && Math.round((H.relAnn(r) - Date.now()) / 3600000) }; }); // (0.32: its release tomorrow 18 h; its shoot starts 8 h before)
  check('episode 1 aced: the streak grows (×1,2 on the next one), episode 2 tomorrow at the same time', noPostpone && s1.streak === 1 && Math.abs(s1.mult - 1.2) < 1e-9 && s1.next === 2 && s1.inDays >= 18 && s1.inDays <= 30, { noPostpone, s1 });
  await G(page, () => { const H = window.__hype, g = H.S.game, r = H.activeRelease(g); const back = H.relAnn(r) - (Date.now() - 2 * 3600000); r.due -= back; if (r.outAt != null) r.outAt -= back; H.update(); }); // (0.30.1: its shoot and its hour, both long past)
  await sleep(2500); // the clock gives the missed episode up
  const s2 = await G(page, () => { const H = window.__hype, g = H.S.game, r = H.activeRelease(g); return { missed: g.series.missed, streak: g.series.streak, next: r && r.ep, state: g.series.state }; });
  check('a missed episode: the series breaks (back to ×1), the next one is programmed', s2.missed === 1 && s2.streak === 0 && s2.next === 3 && s2.state === 'on', s2);
  await G(page, () => { const H = window.__hype, g = H.S.game, r = H.activeRelease(g); const back = H.relAnn(r) - (Date.now() - 2 * 3600000); r.due -= back; if (r.outAt != null) r.outAt -= back; H.update(); });
  await page.waitForSelector('.modal .se-dots', { timeout: 8000 });
  await shot(page, 'series-verdict');
  const s3 = await G(page, () => ({ state: window.__hype.S.game.series.state, pbb: window.__hype.S.game.pbb && window.__hype.S.game.pbb.kind }));
  check('two of three episodes missed: the challenge ends in a bad buzz', s3.state === 'badbuzz' && s3.pbb === 'series', s3);
  await dismiss(page);
  await G(page, () => { const g = window.__hype.S.game; g.pbb = null; window.__hype.repSet(g, 60); g.stats.cancelled = false; window.__hype.update(); });

  // ---------- an enemy: a false rumor, an ally who defends, a denial with real DM captures ----------
  await G(page, () => { const H = window.__hype, g = H.S.game; const z = H.charByHandle(g, 'zara.vey'), t = H.charByHandle(g, 'theo.marlin'); z.rel = -70; z.vibe = 'nemesis'; t.rel = 75; g.rumorAt = 0; g.lastRefreshAt = 0; window.__mockRumor = true; window.__mockSponsor = false;
    const convo = g.dms[z.id] || (g.dms[z.id] = { msgs: [], readAt: 0 }); convo.msgs.push({ id: 'mz1', me: false, text: 'avoue que tu n’as jamais acheté un seul abonné. moi je vais quand même le raconter.', ts: Date.now() - 60000, at: Date.now() - 60000 }); H.update(); });
  await G(page, () => { const r0 = Math.random; Math.random = () => 0.1; const pr = window.__hype.refreshFeed(0); Math.random = r0; return pr; }); // the enemy decides to strike now
  await idle(page);
  await sleep(2500);
  await dismiss(page);
  const ru = await G(page, () => { const H = window.__hype, g = H.S.game, r = H.liveRumor(g); return r && { by: g.chars[r.by].handle, sev: r.sev, defended: r.defended.length, post: !!r.post, banner: !!document.querySelector('.rumor-banner') }; });
  check('a sworn enemy launches a false rumor (on a post); the ally defends; the banner offers the denial', !!ru && ru.by === 'zara.vey' && ru.post && ru.banner, ru);
  await shot(page, 'rumor-banner');
  await clickText(page, '.rumor-banner button', 'Démentir');
  await page.waitForSelector('.cite-list.caps');
  await dismiss(page);
  await page.locator('.cite-list.caps .cite', { hasText: 'jamais acheté' }).locator('input').check();
  await page.fill('#compose', 'aucun faux abonné, jamais. et la preuve que Zara le sait très bien 👇');
  await shot(page, 'debunk-compose');
  await clickText(page, '.layer-head button', 'Démentir');
  await idle(page);
  await sleep(3500);
  const deb = await G(page, () => { const H = window.__hype, g = H.S.game, r = g.rumors.slice(-1)[0], p = g.posts.find((x) => x.deny); return { state: r.state, cred: p && p.res && p.res.cred, caps: p && p.caps && p.caps.length, real: !!document.querySelector('.evidence.real') }; });
  check('the denial, with a real capture of Zara’s own DM: credible, the rumor dies', deb.state === 'debunked' && deb.cred >= 7 && deb.caps === 1 && deb.real, deb);
  await dismiss(page);

  // ---------- leaked DMs: what the player wrote in private comes back ----------
  await G(page, () => { const H = window.__hype, g = H.S.game; const n = H.charByHandle(g, 'nox.ombre'); n.unlocked = true; n.rel = 10; H.update(); });
  const nox = await G(page, () => window.__hype.charByHandle(window.__hype.S.game, 'nox.ombre').id);
  await G(page, (id) => window.__hype.openDM(id), nox);
  await page.waitForSelector('.layer .reply-box textarea');
  await page.fill('.layer .reply-box textarea', 'entre nous, zara je la déteste, c’est une tricheuse');
  await page.click('.layer .send');
  await idle(page);
  await sleep(2500);
  const intel = await G(page, (id) => window.__hype.S.game.intel.filter((x) => x.by === id).map((x) => x.w), nox);
  await back(page);
  await G(page, (id) => { const H = window.__hype, g = H.S.game; g.chars[id].rel = -40; g.chars[id].vibe = 'froid'; g.lastRefreshAt = 0; window.__mockRumor = false; window.__mockLeak = true; H.update(); }, nox);
  await clickText(page, '.feed-tools button', 'Actualiser');
  await idle(page);
  await page.waitForSelector('.modal-card .burst', { timeout: 12000 });
  await shot(page, 'leak-modal');
  const leak = await G(page, (id) => { const g = window.__hype.S.game; const it = g.intel.find((x) => x.by === id); const p = g.posts.find((x) => x.ev && x.ev.real); return { leaked: it && it.leaked, post: !!p, zaraRel: window.__hype.charByHandle(g, 'zara.vey').rel }; }, nox);
  check('a mean word in a DM is kept as a capture; a hostile holder later posts it for real', intel.length === 1 && intel[0] === 2 && leak.leaked && leak.post, { intel, leak });
  await dismiss(page);

  // ---------- an enemy turns someone against the player; the allies grow the reach ----------
  const turn = await G(page, () => { const H = window.__hype, g = H.S.game; const t = H.charByHandle(g, 'leandre.aube'); const before = t.rel; const ok = H.turnAgainst(g, 'zara.vey', 'leandre.aube', 6, 'Mila se sert de toi'); return { ok, d: t.rel - before, boost: H.allyBoost(g) }; });
  check('a sworn enemy works on the others (relation down); allies add reach', turn.ok && turn.d < 0 && turn.boost >= 0.05, turn);

  // ---------- settings behind the gear; a portrait imported for a character ----------
  await page.click('.gear-btn');
  await page.waitForSelector('.layer .pf-pick');
  await sleep(300);
  await shot(page, 'settings');
  await overflowCheck(page, 'settings');
  const settings = await page.textContent('.layer');
  check('the gear opens every setting: saves, AI budget, characters’ intelligence, platform, theme, photos, the version', /Sauvegardes/.test(settings) && /Budget IA/.test(settings) && /Intelligence des personnages/.test(settings) && /plateforme/.test(settings) && /Thème/.test(settings) && /Photos des persos/.test(settings) && /0\.\d+\.\d/.test(settings));
  await clickText(page, '.layer .seg button', 'Sombre');
  await sleep(300);
  const dark = await G(page, () => document.documentElement.getAttribute('data-theme'));
  await clickText(page, '.layer .seg button', 'Auto');
  await back(page);
  await G(page, () => { const H = window.__hype; H.S.tab = 'feed'; H.update(); });
  const theo = await G(page, () => window.__hype.charByHandle(window.__hype.S.game, 'theo.marlin').id);
  await G(page, (id) => { window.__hype.S.stack = []; window.__hype.update(); }, theo);
  await page.locator('.post .av-btn').first().click().catch(() => {});
  await G(page, (id) => { const H = window.__hype; H.S.stack = [{ t: 'char', id, key: 'k1' }]; H.update(); }, theo);
  await page.waitForSelector('.photo-tools');
  await page.setInputFiles('.photo-tools input[type=file]', { name: 'theo.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForSelector('.layer .prof .av-photo img', { timeout: 8000 });
  await shot(page, 'portrait-imported');
  const photo = await G(page, (id) => { const g = window.__hype.S.game; return { flag: g.chars[id].photo, keys: g.photoKeys, prompt: document.querySelector('.prompt-box').value }; }, theo);
  check('dark theme from the gear; a portrait imported (kept apart from the save) and a ready prompt for ChatGPT', dark === 'dark' && photo.flag === 'own' && photo.keys.includes(theo) && /FICTIVE/.test(photo.prompt) && /adulte/.test(photo.prompt), { dark, photo });
  await back(page);

  // ---------- a wide screen ----------
  await page.setViewportSize({ width: 1280, height: 860 });
  await clickText(page, '.rail-item', 'Studio');
  await sleep(500);
  await shot(page, 'wide-studio');
  await overflowCheck(page, 'wide studio');

  console.log('\nCHECKS', checks.filter((c) => c[0] === 'PASS').length + '/' + checks.length);
  for (const c of checks.filter((x) => x[0] === 'FAIL')) console.log('  FAIL', c[1], c[2]);
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  await browser.close();
})().catch(async (e) => { console.error('FAILED', e); if (lastPage) await lastPage.screenshot({ path: path.join(OUT, 'fail.png') }).catch(() => {}); console.log('ERRORS', errors.join('\n')); console.log('CHECKS', checks.map((c) => c[0] + ' ' + c[1]).join('\n')); process.exit(1); });
