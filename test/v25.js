// 0.25 end to end, in Chromium against the built hype.html with the mocked Claude runtime: four new skill rounds, played
// without the AI (no call at all):
// - moderating a live's chat (remove the insults, scams and spam, keep the fans; traps from « Difficile » on);
// - mixing a podcast (keep each track in the green band);
// - reframing a horizontal video for a phone (keep the subject in the vertical frame);
// - grading a video's colors (match the reference shot);
// in the shoot's rotation by format, and at the edit step (never the shoot's own game); harder with the difficulty.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v25.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v25');
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
// A release of this format, its shoot forced to this skill round, opened on its intro.
async function shootRound(page, what, kind, diff) {
  const id = await G(page, ([w, k, d]) => {
    const H = window.__hype, g = H.S.game;
    for (const x of g.releases) if (x.state === 'scheduled') x.state = 'dropped';
    g.career.platform = { live: 'twitch', short: 'tiktok', podcast: 'spotify', 'vidéo': 'youtube' }[w] || 'youtube'; // (the format exists there)
    window.__hypeEasyGear = true;
    const r = H.scheduleRelease(g, { what: w, topic: 'les potions de Lumen', due: Date.now() + 60000 });
    window.__hypeEasyGear = false;
    r.due = Date.now() - 1000; r.diff = d; r.devis = { total: 0, items: [], topic: r.topic, at: Date.now() };
    H.S.mgForce = k;
    H.genShoot(r);
    H.S.stack = []; H.openLayer({ t: 'minigame', id: r.id }); H.update();
    return r.id;
  }, [what, kind, diff]);
  await page.waitForSelector('.layer .mg-intro', { timeout: 8000 });
  return id;
}
const played = (page, id) => G(page, (x) => { const r = window.__hype.S.game.releases.find((y) => y.id === x); return r && r.played ? { what: r.what, kind: r.played.kind, score: r.played.score, tier: r.played.tier, got: r.game && r.game.run ? r.game.run.got : null } : null; }, id);

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);
  await newGame(page, 'Une streameuse qui touche à tout');
  await G(page, () => { window.__hypeNoGearEvent = true; window.__hype.S.game.career.cash = 5000; });

  // ---------- the rounds, harder with the difficulty ----------
  const gen = await G(page, () => {
    const H = window.__hype, r = { what: 'live', topic: 'les potions de Lumen' }, D = (id) => H.DIFFS.find((d) => d.id === id);
    const c1 = H.makeChat(r, D('facile')), c4 = H.makeChat(r, D('expert'));
    const m1 = H.makeMix(r, D('facile')), m4 = H.makeMix(r, D('expert'));
    const f1 = H.makeFrame(r, D('facile')), f4 = H.makeFrame(r, D('expert'));
    const e1 = H.makeGrade(r, D('facile')), e4 = H.makeGrade(r, D('expert'));
    const bad = (c) => c.items.filter((x) => x.bad).length;
    return {
      chat: [c1.items.length, c1.per, c4.items.length, c4.per, bad(c1), bad(c4), c4.items.some((x) => /je t’adore|ATTENTION|merch|😱|pleurer|cœurs/.test(x.text) && !x.bad), c1.items.every((x) => x.who && x.text)],
      mix: [m1.tracks.length, m4.tracks.length, m1.band > m4.band, m1.drift < m4.drift], frame: [f1.w > f4.w, f1.speed < f4.speed],
      grade: [e1.keys.length, e4.keys.length, e1.d1 > e4.d1 && e1.d0 > e4.d0, e1.per > e4.per, e1.items.every((it) => e1.keys.every((k) => Math.abs(it.start[k] - it.target[k]) >= 0.29))],
      perfect: H.gradeScore(e1, e1.items[0], e1.items[0].target), start: Math.max(...e4.items.map((it) => H.gradeScore(e4, it, it.start))), // (0.27: judged on the picture)
    };
  });
  check('the new rounds get harder: the chat (14 messages every 1,5 s → 20 every 0,95 s at Expert, traps that look rude but are fans), the mix (2 tracks → 3, a narrower band, faster drift), the frame (narrower, faster), the grading (3 settings → 4, tighter, less time; a perfect match scores 1, the start far less)',
    gen.chat[0] === 14 && gen.chat[1] === 1500 && gen.chat[2] === 20 && gen.chat[3] === 950 && gen.chat[4] === 6 && gen.chat[5] === 8 && gen.chat[6] && gen.chat[7]
      && gen.mix[0] === 2 && gen.mix[1] === 3 && gen.mix[2] && gen.mix[3] && gen.frame[0] && gen.frame[1] && gen.grade[0] === 3 && gen.grade[1] === 4 && gen.grade[2] && gen.grade[3] && gen.grade[4] && gen.perfect === 1 && gen.start < 0.5, gen);

  // ---------- in the rotation by format, and at the edit (never the shoot's own game) ----------
  const rot = await G(page, () => {
    const H = window.__hype, S = H.S, g = S.game, f = S.mgForce; S.mgForce = null;
    const seen = {};
    for (const w of ['live', 'short', 'podcast', 'vidéo']) {
      const r = { what: w, diff: 'moyen', crew: [] };
      for (let i = 0; i < 400; i++) { g.mgRecent = []; const k = H.pickShootKind(g, r); seen[w + ':' + k] = (seen[w + ':' + k] || 0) + 1; } // (0.27.3: every game of the format alike)
    }
    const edits = {};
    for (const [w, shotK] of [['vidéo', 'quiz'], ['vidéo', 'etalonnage'], ['short', 'cadrage'], ['podcast', 'quiz'], ['clip', 'montage']]) {
      const ks = new Set();
      for (let i = 0; i < 60; i++) { const r = { what: w, topic: 'test', diff: 'moyen', played: { kind: shotK, diff: 'moyen', score: 0.6, tier: 'mid' } }; ks.add(H.makeEdit(r, g).kind); }
      edits[w + '<' + shotK] = [...ks].sort().join(',');
    }
    S.mgForce = f;
    return { seen, edits };
  });
  check('the shoot’s rotation by format: the chat for a live, the reframing for a short, the mix for a podcast, the grading for a video (with the cut and the memory); the edit rotates too, never the shoot’s own game',
    rot.seen['live:chat'] > 20 && !rot.seen['live:cadrage'] && rot.seen['short:cadrage'] > 20 && rot.seen['podcast:mixage'] > 20 && rot.seen['vidéo:etalonnage'] > 20 && !rot.seen['vidéo:chat']
      && rot.edits['vidéo<quiz'] === 'etalonnage,montage,tri' && rot.edits['vidéo<etalonnage'] === 'montage,tri' && rot.edits['short<cadrage'] === 'montage,tri' && rot.edits['podcast<quiz'] === 'mixage,montage,tri' && rot.edits['clip<montage'] === 'etalonnage', rot);

  // ---------- the chat of a live: the bad ones removed, the fans kept ----------
  const chatId = await shootRound(page, 'live', 'chat', 'facile');
  const chatIntro = await page.textContent('.layer .mg-intro');
  await page.locator('.layer .mg-intro button', { hasText: 'parti' }).click();
  await page.waitForSelector('.layer .chat-box .chat-msg', { timeout: 5000 });
  await G(page, () => { window.__chatBot = setInterval(() => { for (const b of document.querySelectorAll('.layer .chat-msg[data-bad="1"] .chat-del')) b.click(); }, 120); });
  await sleep(6000);
  await shot(page, 'chat-play');
  await page.waitForSelector('.layer .mg-result', { timeout: 40000 });
  await G(page, () => clearInterval(window.__chatBot));
  const chat = await played(page, chatId);
  await shot(page, 'chat-result');
  const chatFix = await G(page, () => !!document.querySelector('.layer .mg-result .mg-fix'));
  check('a live’s chat: the bad messages removed as they come, the fans kept: a perfect round (no AI call)', /Modère le chat/.test(chatIntro) && chat && chat.what === 'live' && chat.kind === 'chat' && chat.score === 1 && chat.tier === 'top', { chatIntro: chatIntro.slice(0, 160), chat, chatFix });

  // ---------- the mix of a podcast: a bot that keeps every track in the green ----------
  const mixId = await shootRound(page, 'podcast', 'mixage', 'moyen');
  await page.locator('.layer .mg-intro button', { hasText: 'parti' }).click();
  await page.waitForSelector('.layer .mix-row', { timeout: 5000 });
  await G(page, () => {
    window.__mixBot = setInterval(() => {
      for (const row of document.querySelectorAll('.layer .mix-row')) {
        const dot = parseFloat(row.querySelector('.mix-dot').style.left), band = row.querySelector('.mix-band'), b0 = parseFloat(band.style.left), bw = parseFloat(band.style.width), c = b0 + bw / 2;
        const [minus, plus] = row.querySelectorAll('.mix-btn');
        if (dot < c - bw / 5) plus.click(); else if (dot > c + bw / 5) minus.click();
      }
    }, 90);
  });
  await sleep(4000);
  await shot(page, 'mix-play');
  await page.waitForSelector('.layer .mg-result', { timeout: 40000 });
  await G(page, () => clearInterval(window.__mixBot));
  const mix = await played(page, mixId);
  check('a podcast’s mix: the tracks drift on their own; kept in the green band with + and −, three passes: a good score', mix && mix.what === 'podcast' && mix.kind === 'mixage' && mix.score >= 0.7, mix);

  // ---------- the reframing of a short: the frame follows the subject ----------
  const frId = await shootRound(page, 'short', 'cadrage', 'moyen');
  await page.locator('.layer .mg-intro button', { hasText: 'parti' }).click();
  await page.waitForSelector('.layer .frame-stage', { timeout: 5000 });
  await G(page, () => {
    window.__frBot = setInterval(() => {
      const st = document.querySelector('.layer .frame-stage'), su = document.querySelector('.layer .frame-subj');
      if (!st || !su) return;
      const b = st.getBoundingClientRect(), r = su.getBoundingClientRect(), x = r.left + r.width / 2; // (0.27.2: placed by transform)
      st.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: b.top + 10, bubbles: true, pointerId: 7, buttons: 1 }));
    }, 40);
  });
  await sleep(3000);
  await shot(page, 'frame-play');
  await page.waitForSelector('.layer .mg-result', { timeout: 40000 });
  await G(page, () => clearInterval(window.__frBot));
  const fr = await played(page, frId);
  // left alone, the subject soon leaves the frame
  const frId2 = await shootRound(page, 'short', 'cadrage', 'expert');
  await page.locator('.layer .mg-intro button', { hasText: 'parti' }).click();
  await page.waitForSelector('.layer .mg-result', { timeout: 40000 });
  const fr2 = await played(page, frId2);
  check('a short reframed for the phone: the frame dragged onto the subject keeps it in; left alone at Expert, it gets out of the frame',
    fr && fr.what === 'short' && fr.kind === 'cadrage' && fr.score >= 0.85 && fr2 && fr2.score < fr.score, { fr, fr2 });

  // ---------- the grading of a video: the settings matched to the reference ----------
  const grId = await shootRound(page, 'vidéo', 'etalonnage', 'moyen');
  await page.locator('.layer .mg-intro button', { hasText: 'parti' }).click();
  for (let k = 0; k < 3; k++) {
    await page.waitForFunction((j) => { const el = document.querySelector('.layer .grade-play .mg-top .mono'); return el && el.textContent.startsWith((j + 1) + '/') && !document.querySelector('.layer .grade-play .btn-hot').disabled; }, k, { timeout: 8000 });
    if (k === 1) await shot(page, 'grade-start');
    await G(page, ([id, j]) => {
      const r = window.__hype.S.game.releases.find((x) => x.id === id), t = r.game.items[j].target;
      for (const inp of document.querySelectorAll('.layer .grade-sl input')) { inp.value = String(Math.round(t[inp.dataset.k] * 100)); inp.dispatchEvent(new Event('input', { bubbles: true })); }
    }, [grId, k]);
    await sleep(150);
    if (k === 1) await shot(page, 'grade-matched');
    await page.click('.layer .grade-play .btn-hot');
  }
  await page.waitForSelector('.layer .mg-result', { timeout: 10000 });
  const gr = await played(page, grId);
  check('a video graded: each of the three shots matched to the reference (temperature, light, saturation), validated: a perfect round', gr && gr.what === 'vidéo' && gr.kind === 'etalonnage' && gr.score === 1, gr);

  // ---------- at the edit step: the grading after a quiz shoot; leaving mid-way loses the shot under way ----------
  const ed = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    for (const x of g.releases) if (x.state === 'scheduled') x.state = 'dropped';
    g.career.platform = 'youtube'; window.__hypeEasyGear = true;
    const r = H.scheduleRelease(g, { what: 'vidéo', topic: 'le grand classement des potions', due: Date.now() + 60000 });
    window.__hypeEasyGear = false;
    r.due = Date.now() - 1000; r.devis = { total: 0, items: [], topic: r.topic, at: Date.now() };
    r.played = { tier: 'mid', score: 0.6, diff: 'moyen', kind: 'quiz', at: Date.now() };
    H.S.editForce = 'etalonnage';
    H.S.stack = []; H.openLayer({ t: 'minigame', id: r.id }); H.update();
    return r.id;
  });
  await page.waitForSelector('.layer .edit-step h3:has-text("L’étalonnage")', { timeout: 8000 }); // (not the edit step of the release before, still on screen for an instant)
  const edIntro = await page.textContent('.layer .edit-step');
  await page.locator('.layer .edit-step button', { hasText: /^ *Monter$/ }).click();
  await page.waitForSelector('.layer .grade-play', { timeout: 5000 });
  // leave during the first shot, come back: that shot is lost, the game goes on with the second
  await page.click('.layer-head .iconbtn');
  await sleep(300);
  await G(page, (id) => { const H = window.__hype; H.openLayer({ t: 'minigame', id }); H.update(); }, ed);
  await page.waitForSelector('.layer .grade-play', { timeout: 5000 });
  const resumed = await page.textContent('.layer .grade-play .mg-top .mono');
  for (let k = 1; k < 3; k++) {
    await page.waitForFunction((j) => { const el = document.querySelector('.layer .grade-play .mg-top .mono'); return el && el.textContent.startsWith((j + 1) + '/') && !document.querySelector('.layer .grade-play .btn-hot').disabled; }, k, { timeout: 8000 });
    await G(page, ([id, j]) => {
      const r = window.__hype.S.game.releases.find((x) => x.id === id), t = r.editGame.items[j].target;
      for (const inp of document.querySelectorAll('.layer .grade-sl input')) { inp.value = String(Math.round(t[inp.dataset.k] * 100)); inp.dispatchEvent(new Event('input', { bubbles: true })); }
    }, [ed, k]);
    await sleep(120);
    await page.click('.layer .grade-play .btn-hot');
  }
  await page.waitForFunction((id) => !!window.__hype.S.game.releases.find((x) => x.id === id).edit, ed, { timeout: 10000 });
  const edr = await G(page, (id) => { const r = window.__hype.S.game.releases.find((x) => x.id === id); return { m: r.edit.m, score: r.played.score }; }, ed);
  await G(page, () => { window.__hype.S.editForce = null; window.__hype.S.mgForce = null; });
  check('at the edit step, the grading (after a quiz shoot): leaving mid-shot loses that shot (2 of 3 left), the rest played perfectly: the edit at 67 %, the video’s score moved by it (0,6 → 0,65)',
    /L’étalonnage/.test(edIntro) && /15 points/.test(edIntro) && /^2\/3/.test(resumed) && Math.abs(edr.m - 2 / 3) < 0.01 && Math.abs(edr.score - 0.65) < 0.01, { edIntro: edIntro.slice(0, 120), resumed, edr });

  const calls = await G(page, () => window.__prompts.filter((p) => /mixage|recadrage|étalonnage|Modère le chat/.test(p)).length);
  check('none of these rounds asks the AI anything', calls === 0, calls);

  await shot(page, 'end');
  console.log('\nERRORS', errors.length ? errors.slice(0, 10) : 'none');
  console.log(`CHECKS ${checks.filter((c) => c[0] === 'PASS').length}/${checks.length}`);
  await browser.close();
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
