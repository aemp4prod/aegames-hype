// 0.10 end to end, in Chromium against the built hype.html with the mocked Claude runtime:
// - the reputation on 1000: four pillars (image, credibility, reliability, behaviour), slower gains near the top and a
//   daily cap, harder falls from high up, the « why it moves » journal, kindness from the eval, old saves, the AI context;
// - the game's intensity (Calme, Normal, Vivant, Ultime): the counts asked of the AI, waves of reactions after a post,
//   « Voir plus de commentaires » (automatic in Ultime), comments that answer each other;
// - the budget tiers (Découverte… Sans limite) with what they are worth, and the plan advice.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/ultime.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-ultime');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(path.join(ROOT, 'hype.html'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const UMD = fs.readFileSync(process.env.UMD, 'utf8');
const SKELETON = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;

const errors = [];
const checks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 0.15: the pen steps aside while the feed scrolls down; a player scrolls back up, a test brings it back
const clickFab = async (page, opts) => { await page.evaluate(() => { const H = window.__hype; if (H && H.S.fabAway) { H.S.fabAway = false; H.update(false); } }); await page.click('.fab', opts); };
let shotN = 0, lastPage = null;
const check = (name, ok, info) => { checks.push([ok ? 'PASS' : 'FAIL', name]); console.log(ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)); };
async function shot(page, name, keep) { if (!keep) await dismiss(page); shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
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
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.cand || b.write || b.create || b.prep); })) await sleep(300); };
const settle = async (page) => { await idle(page); await page.waitForFunction(() => { const g = window.__hype.S.game; return Object.values(g.dms).every((c) => c.msgs.every((m) => m.at <= Date.now())); }, null, { timeout: 15000 }).catch(() => {}); };
const closeAll = (page) => G(page, () => { const H = window.__hype; H.S.stack = []; H.update(); });
const lastBox = (page) => page.locator('.layer').last().locator('textarea:not([readonly])').first();
async function dm(page, id, text) {
  await dismiss(page);
  await closeAll(page);
  await G(page, (x) => window.__hype.openDM(x), id);
  await sleep(300);
  for (let k = 0; k < 3; k++) { // the conversation may render again as it opens: fill until it holds
    await lastBox(page).waitFor();
    await lastBox(page).fill(text);
    await sleep(200);
    if ((await lastBox(page).inputValue()) === text) break;
  }
  await page.waitForSelector('.layer .send:not([disabled])', { timeout: 5000 });
  await clickText(page, '.layer .send', 'Envoyer');
  await settle(page);
  await sleep(600);
}
async function refresh(page) {
  await closeAll(page);
  await G(page, () => { window.__hype.S.game.lastRefreshAt = 0; });
  await G(page, () => window.__hype.refreshFeed());
  await settle(page);
  await sleep(500);
}

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

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);

  // ---------- a new game: the intensity and the budget tiers ----------
  await clickText(page, 'button', 'Nouvelle partie');
  await clickText(page, 'button.world', 'Académie Lumen');
  await page.waitForSelector('#pn');
  await page.fill('#pn', 'Mila Flux');
  await clickText(page, '.seg button', 'Elle');
  await page.fill('#pi', 'Une influenceuse qui enquête sur les secrets de l’académie');
  const form = await G(page, () => ({
    ints: [...document.querySelectorAll('form .int-grid .tier')].map((b) => b.textContent.trim()),
    tiers: [...document.querySelectorAll('form .tier-grid:not(.int-grid) .tier')].map((b) => b.textContent.trim()),
    advice: (document.querySelector('form .plan-advice') || {}).textContent || '',
    switches: [...document.querySelectorAll('form .int-settings .int-set .lbl')].map((b) => b.textContent.trim()), // 0.23.1: the settings in four steps
  }));
  const perHour = form.ints.map((t) => +((/≈ (\d+) ☕ \/ heure/.exec(t) || [])[1] || 0));
  await clickText(page, '.int-grid .tier', 'Ultime');
  await clickText(page, '.tier', 'Marathon');
  await page.locator('form .int-grid').scrollIntoViewIfNeeded();
  await shot(page, 'new-game-tiers');
  await overflowCheck(page, 'new game tiers');
  const hint = await G(page, () => ({ desc: [...document.querySelectorAll('form .field small')].map((x) => x.textContent).find((t) => /Le maximum/.test(t)) || '', marathon: (([...document.querySelectorAll('form .tier-grid:not(.int-grid) .tier')].find((b) => /Marathon/.test(b.textContent)) || {}).textContent || '') }));
  check('a new game: four intensities, each with what an hour of play costs (0.19: measured, from the cheapest to the dearest), the comments in four steps, six budget tiers worth so many posts or messages, and which one for which plan',
    form.ints.length === 4 && /Calme/.test(form.ints[0]) && /Ultime/.test(form.ints[3]) && perHour.every((n, k) => n > 0 && (!k || n > perHour[k - 1]))
    && form.switches.some((x) => /Les commentaires/.test(x)) && !form.switches.some((x) => /vit tout seul/.test(x))
    && form.tiers.length === 6 && /Découverte/.test(form.tiers[0]) && /Marathon/.test(form.tiers[4]) && /Sans limite/.test(form.tiers[5]) && /≈ \d+ posts? ou \d+ messages?/.test(form.tiers[1])
    && /ChatGPT Go ou Plus : Intensif ou Marathon/.test(form.advice) && /Le maximum/.test(hint.desc) && /≈ \d+ posts/.test(hint.marathon), { form, hint, perHour });
  await page.check('#p18');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=Qui sera ton premier abonné', { timeout: 20000 });
  await page.locator('.cast-card.pick', { hasText: 'Théo' }).click();
  await page.click('.cast-cta button');
  await page.waitForSelector('.post');
  await sleep(1200);
  await dismiss(page);
  const g0 = await G(page, () => { const H = window.__hype, g = H.S.game; return { int: g.opts.intensity, budget: g.budget.daily, rep: g.stats.reputation, rep4: g.stats.rep4, shown: H.rep1000(g.stats.reputation), label: H.repLabel(g.stats.reputation), saved: localStorage.getItem('hype:intensity') }; });
  check('the choices are kept with the game; an unknown starts at 500/1000 (« Correcte »), all four pillars alike',
    g0.int === 'ultime' && g0.budget === 400 && g0.shown === 500 && g0.label === 'Correcte' && Object.values(g0.rep4).every((x) => x === 50) && g0.saved === 'ultime', g0);

  // ---------- the reputation: harder to earn near the top, a daily cap, harder falls from high up ----------
  const curve = await G(page, () => {
    const H = window.__hype, g = H.S.game, keep = JSON.parse(JSON.stringify({ rep4: g.stats.rep4, r: g.stats.reputation, day: g.stats.repDay || null, log: g.stats.repLog }));
    const at = (r, plan) => { H.repSet(g, r); g.stats.repDay = null; return H.repTry(g, plan); };
    const gain50 = at(50, { image: 10 }), gain90 = at(90, { image: 10 }), fall30 = at(30, { image: -10 }), fall90 = at(90, { image: -10 });
    H.repSet(g, 50); g.stats.repDay = null;
    const steps = [1, 2, 3, 4].map(() => H.repMove(g, { image: 6 }, 'test', { noCheck: true }));
    Object.assign(g.stats, { rep4: keep.rep4, reputation: keep.r, repDay: keep.day, repLog: keep.log });
    return { gain50, gain90, fall30, fall90, steps };
  });
  check('a gain is worth half as much at 500 and a tenth at 900; the same blow hurts more from high up; past the day’s cap, gains slow down',
    Math.abs(curve.gain50 - 1.75) < 0.05 && Math.abs(curve.gain90 - 0.35) < 0.05 && curve.fall90 < curve.fall30 - 0.4 && curve.steps[2] < curve.steps[1] && curve.steps[3] < curve.steps[0] / 3, curve);

  // ---------- a kind post: the reputation moves, pillar by pillar, and says why ----------
  await G(page, () => { window.__mockKindness = 3; });
  await clickFab(page);
  await page.fill('#compose', '@zara.vey demain 8h, cour des Glycines. et bravo pour ta saison, sincèrement');
  const n0 = await G(page, () => window.__prompts.length);
  await clickText(page, '.layer-head button', 'Publier');
  await idle(page, 30000);
  await sleep(2500);
  await dismiss(page);
  const post = await G(page, (n) => {
    const H = window.__hype, g = H.S.game, p = g.posts.find((x) => x.a === 'p'), last = g.stats.repLog.slice(-3);
    const act = window.__prompts.slice(n).find((x) => x.includes('Le joueur publie ce post')) || '';
    return { repD: p.res.repD, kind: g.stats.rep4.kind, image: g.stats.rep4.image, log: last.map((x) => x.why + ' ' + Math.round(x.d * 10)), chip: [...document.querySelectorAll('.post .res .chip')].map((c) => c.textContent).find((t) => /Réputation/.test(t)) || '',
      ask: act.includes('kindness -5 à 5') && act.includes('"kindness":0') && act.includes('réputation 500/1000 (correcte) : image 500, crédibilité 500, fiabilité pro 500, comportement 500') && act.includes('10 à 14 (jusqu’à 18') };
  }, n0);
  check('a post moves the image (its reception) and the behaviour (its kindness), shown with the result, written in the journal; the AI knows the pillars and asks for 10 to 14 answers at Ultime',
    post.repD > 0 && post.kind > 50 && post.image > 50 && post.log.some((x) => /^ton post « @zara\.vey demain 8h/.test(x)) && post.ask, post);
  await G(page, () => { window.__mockKindness = null; });
  const chip = await (async () => { await G(page, () => { const H = window.__hype; H.openPost(H.S.game.posts.find((x) => x.a === 'p').id); }); await page.waitForFunction(() => { const H = window.__hype, p = H.S.game.posts.find((x) => x.a === 'p'); return p.res && Date.now() >= p.res.revealAt + 600; }, null, { timeout: 30000 }); await page.waitForSelector('.layer .res .chip.hot'); await sleep(400); return G(page, () => [...document.querySelectorAll('.layer .res .chip')].map((c) => c.textContent).find((t) => /Réputation/.test(t)) || ''); })();
  await shot(page, 'post-reputation-chip');
  check('…and the post’s result says what it did to the reputation', /Réputation \+\d+/.test(chip), chip);
  await closeAll(page);

  // ---------- Ultime: two waves of reactions after a post, minutes later (0.19: written in the post's own answer) ----------
  await sleep(1500);
  const wave = await G(page, () => {
    const H = window.__hype, g = H.S.game, p = g.posts.find((x) => x.a === 'p'), t = Date.now();
    const later = p.replies.filter((r) => r.at > t), threaded = p.replies.filter((r) => r.to).length;
    const act = window.__prompts.find((x) => x.includes('Le joueur publie ce post')) || '';
    const lates = p.replies.filter((r) => r.at > p.res.revealAt + 50000);
    return { later: later.length, afterReveal: Math.round((Math.min(...lates.map((r) => r.at)) - p.res.revealAt) / 1000), threaded, rT: p.rT, n: p.replies.length, notif: g.notifs.filter((x) => /vague de réactions sous ton post/.test(x.text)).length, quote: g.posts.some((x) => x.q && x.q.id === p.id && x.a !== 'p'), ask: act.includes('9 à 14 réponses qui arriveront PLUS TARD'), calls: window.__prompts.filter((x) => x.includes('TÂCHE : UNE NOUVELLE VAGUE DE RÉACTIONS')).length };
  });
  check('Ultime: the post’s own answer brings two waves of reactions that arrive minutes later (new people, answers to the comments, a quote), with a notification each, and no call of their own',
    wave.later >= 8 && wave.afterReveal >= 100 && wave.threaded >= 2 && wave.notif === 2 && wave.quote && wave.ask && wave.calls === 0 && wave.rT >= wave.n, wave);

  // ---------- « Voir plus de commentaires » (automatic at Ultime) ----------
  const pid = await G(page, () => {
    const H = window.__hype, g = H.S.game, p = g.posts.find((x) => x.a !== 'p' && !x.q && x.replies.length <= 2);
    p.rT = 40; p.ls = Date.now() - 600000; return p.id;
  });
  const m0 = await G(page, () => window.__prompts.length);
  await G(page, (id) => window.__hype.openPost(id), pid);
  await page.waitForFunction((id) => { const p = window.__hype.S.game.posts.find((x) => x.id === id); return p.more === 1 && !window.__hype.S.busy.more; }, pid, { timeout: 30000 });
  await page.waitForSelector('.layer .more-btn', { timeout: 20000 }).catch(() => {});
  await sleep(300);
  const more = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, p = g.posts.find((x) => x.id === a.id);
    const pr = window.__prompts.slice(a.m0).find((x) => x.includes('TÂCHE : D’AUTRES COMMENTAIRES SOUS UN POST')) || '';
    return { n: p.replies.length, threaded: p.replies.filter((r) => r.to).length, rT: p.rT, btn: (document.querySelector('.layer .more-btn') || {}).textContent || '', ask: /Écris 12 à 14 autres commentaires/.test(pr) };
  }, { id: pid, m0 });
  await shot(page, 'thread-more');
  check('Ultime: opening a thread whose counter promises comments writes them (12 to 14 asked), threaded; the button stays for more', more.n >= 8 && more.threaded >= 3 && more.ask && /Voir plus de commentaires/.test(more.btn), more);
  await clickText(page, '.layer .more-btn', 'Voir plus de commentaires');
  await page.waitForFunction((id) => window.__hype.S.game.posts.find((x) => x.id === id).more === 2 && !window.__hype.S.busy.more, pid, { timeout: 30000 });
  const more2 = await G(page, (id) => window.__hype.S.game.posts.find((x) => x.id === id).replies.length, pid);
  check('« Voir plus de commentaires » loads another batch', more2 >= more.n + 6, { more2, n: more.n });
  await closeAll(page);

  // ---------- the counts asked of the AI follow the intensity ----------
  const counts = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'nox.ombre');
    const out = {};
    for (const k of ['calme', 'normal', 'vivant', 'ultime']) {
      g.opts.intensity = k;
      const rf = H.promptRefresh(g, 0, [], false, null, []), dm = H.promptDM(g, c, [], 'salut');
      out[k] = { posts: (/- (\d+ à \d+) lignes : \{"t":"post"/.exec(rf) || [])[1], replies: (/- ([^\n]*?) réponses sous ces nouveaux posts/.exec(rf) || [])[1], dm: (/- (\d+ à \d+) lignes : \{"t":"msg"/.exec(dm) || [])[1], re: rf.includes('"re":"handle"') };
    }
    g.opts.intensity = 'ultime';
    return out;
  });
  check('Calme → Ultime: from 3–4 to 8–10 posts per update, from 1–2 to 10–16 comments under them (answering each other), from 1–2 to 2–4 messages in a DM',
    counts.calme.posts === '3 à 4' && counts.normal.posts === '4 à 6' && counts.vivant.posts === '6 à 8' && counts.ultime.posts === '8 à 10'
    && counts.calme.replies === '1 à 2' && /^10 à 16/.test(counts.ultime.replies) && counts.calme.dm === '1 à 2' && counts.ultime.dm === '2 à 4' && counts.ultime.re, counts);
  await G(page, () => { window.__standRolls = [0.9]; });
  await refresh(page);
  await G(page, () => { window.__standRolls = null; });
  const thr = await G(page, () => { const g = window.__hype.S.game; const p = g.posts.find((x) => x.replies.some((r) => /biscottes/.test(r.text))); const r = p && p.replies.find((x) => /biscottes/.test(x.text)); const to = r && p.replies.find((x) => x.id === r.to); return { linked: !!to, toWho: to ? to.a : null, after: !!(to && r.at > to.at) }; });
  check('in an update, a comment can answer another one (« re »): it is threaded under it, after it', thr.linked && /^c:/.test(thr.toWho) && thr.after, thr);
  const live = await G(page, () => window.__hype.autoLiveDue(window.__hype.S.game, Date.now()));
  check('here (Claude), the network never moves on its own: only the ChatGPT app refreshes by itself at Ultime', live === false, live);

  // ---------- harder falls, the cancel, and the journal ----------
  const fall = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    H.repSet(g, 22);
    const d = H.repMove(g, { cred: -40, kind: -20 }, 'un test qui tourne mal');
    return { d, shown: H.rep1000(g.stats.reputation), cancelled: g.stats.cancelled, label: H.repLabel(g.stats.reputation) };
  });
  check('a big blow at 220 sends the reputation into the cancel zone (under 150): cancelled', fall.d < -7 && fall.shown < 150 && fall.cancelled && /Sulfureuse|Infréquentable/.test(fall.label), fall);
  await G(page, () => { const H = window.__hype, g = H.S.game; H.repSet(g, 62); g.stats.cancelled = false; H.update(); });
  await dismiss(page);
  await closeAll(page);
  await G(page, () => { const H = window.__hype; H.S.tab = 'profile'; H.update(); });
  await page.waitForSelector('.rep-sec');
  await page.locator('.rep-sec').scrollIntoViewIfNeeded();
  const sec = await G(page, () => { const el = document.querySelector('.rep-sec'); return { text: el.textContent, pillars: el.querySelectorAll('.rep-pillar').length, rows: el.querySelectorAll('.rl-row').length }; });
  await shot(page, 'profile-reputation');
  await overflowCheck(page, 'profile reputation');
  check('the profile: the reputation on 1000, its four pillars, and « Pourquoi elle bouge »', /620\s*\/ 1000 · Bonne/.test(sec.text) && sec.pillars === 4 && /Crédibilité/.test(sec.text) && /Fiabilité pro/.test(sec.text) && /Comportement/.test(sec.text) && /Pourquoi elle bouge/.test(sec.text) && sec.rows >= 2, { sec: sec.text.slice(0, 300), pillars: sec.pillars, rows: sec.rows });

  // ---------- an old save: the pillars start at its reputation ----------
  const old = await G(page, () => {
    const H = window.__hype, g = JSON.parse(JSON.stringify(H.S.game));
    delete g.stats.rep4; delete g.stats.repLog; g.stats.reputation = 72; delete g.opts.intensity;
    H.migrate(g);
    return { rep4: g.stats.rep4, r: g.stats.reputation, int: g.opts.intensity };
  });
  check('a save from before: all four pillars at its reputation (720), the intensity Normal', Object.values(old.rep4).every((x) => x === 72) && old.r === 72 && old.int === 'normal', old);

  // ---------- the settings: intensity and budget tiers ----------
  await closeAll(page);
  await page.click('.gear-btn:visible');
  await page.waitForSelector('.layer .int-grid');
  await page.locator('.layer .int-grid').scrollIntoViewIfNeeded();
  await clickText(page, '.layer .int-grid .tier', 'Vivant');
  await sleep(200);
  const st = await G(page, () => ({ int: window.__hype.S.game.opts.intensity, saved: localStorage.getItem('hype:intensity'), tiers: document.querySelectorAll('.layer .tier-grid:not(.int-grid) .tier').length }));
  await shot(page, 'settings-intensity');
  check('the settings: the intensity changes for this game (and the next), the six budget tiers are there', st.int === 'vivant' && st.saved === 'vivant' && st.tiers === 6, st);

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
