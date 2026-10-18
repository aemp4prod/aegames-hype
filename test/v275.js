// 0.27.5 end to end, in Chromium against the built hype.html with the mocked Claude runtime: the mini-games recalibrated.
// - the AI-written games give the time to read what is on screen (the characters of each item and of its answers), at a
//   pace that rises with the difficulty, plus the time to decide; never less than the 0.27.4 clock; Cauchemar as before;
// - the quiz and the odd one out: each question its own clock (a long one more, a short one less), shown on the bar;
// - the mix of a podcast: from Expert on, a wider band and a calmer drift.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v275.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v275');
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

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);
  await newGame(page, 'Une créatrice qui touche à tout');
  await G(page, () => { window.__hypeNoGearEvent = true; window.__hypeEasyGear = true; });

  // ---------- the clocks, by what there is to read ----------
  const ck = await G(page, () => {
    const H = window.__hype, D = (id) => H.DIFFS.find((d) => d.id === id);
    const txt = (n) => 'x'.repeat(n);
    const item = (n, opts) => (opts ? { text: txt(n), a: Array.from({ length: opts }, () => txt(30)), ok: 0 } : { text: txt(n), good: true });
    const old = (kind, n, d) => H.mgTime(kind, n, D(d)) + H.mgExtra(kind, n);
    const out = { floor: true, grows: true, cauchemar: null, long: null, short: null, vfLong: null, vfShort: null };
    for (const kind of ['tri', 'vf', 'ordre', 'quiz', 'intrus']) for (const d of H.DIFFS) {
      if (d.real && kind !== 'quiz') continue;
      const four = kind === 'quiz' || kind === 'intrus', n = 6;
      for (const len of [20, 80, 160]) {
        const items = Array.from({ length: n }, () => item(len, four ? d.opts : 0));
        const c = H.mgClock(kind, items, d), o = old(kind, n, d.id);
        if ((four ? Math.min(...c) : c) < o) out.floor = false;
      }
    }
    // a question of 3 lines gets more than one of 3 words; the same for true or false
    out.long = H.mgClock('quiz', [item(110, 4)], D('mythique'))[0];
    out.short = H.mgClock('quiz', [item(20, 4)], D('mythique'))[0];
    out.vfLong = H.mgClock('vf', Array.from({ length: 10 }, () => item(90)), D('mythique'));
    out.vfShort = H.mgClock('vf', Array.from({ length: 10 }, () => item(25)), D('mythique'));
    out.old = { quiz: old('quiz', 4, 'mythique'), vf: old('vf', 10, 'mythique') };
    out.cauchemar = H.mgClock('quiz', [item(110, 4), item(20, 4)], D('cauchemar'));
    out.cauchemarOld = old('quiz', 4, 'cauchemar');
    out.helped = H.mgClock('quiz', [item(110, 4)], D('mythique'), 1.3)[0];
    // the ladder: each level a little more time than the next one, for the same text
    const lad = H.DIFFS.filter((d) => !d.real).map((d) => H.mgClock('quiz', [item(100, 4)], d)[0]);
    out.ladder = lad;
    out.down = lad.every((v, k) => k === 0 || v < lad[k - 1]);
    return out;
  });
  check('every AI-written game: never less time than in 0.27.4, whatever the length and the level',
    ck.floor, ck);
  check('Mythique: a long question (110 characters and four answers of 30) gets about 12,6 s (14 before 0.27.9, a notch harder), a short one less; ten long statements more than ten short; Cauchemar keeps its clock (14 s); help (a scriptwriter, a prompter) adds to all of it; the ladder goes down level after level',
    ck.long >= 12000 && ck.long <= 13200 && ck.short < ck.long && ck.short >= ck.old.quiz && ck.vfLong > ck.vfShort && ck.vfShort >= ck.old.vf && ck.cauchemar.every((v) => v === ck.cauchemarOld) && ck.cauchemarOld === 14000
      && ck.helped > ck.long && ck.down, ck);

  // ---------- on screen: a quiz in Mythique, each question its clock ----------
  const qid = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    for (const x of g.releases) if (x.state === 'scheduled') x.state = 'dropped';
    const r = H.scheduleRelease(g, { what: 'vidéo', topic: 'les potions de Lumen', due: Date.now() + 60000 });
    r.due = Date.now() - 1000; r.diff = 'mythique'; r.devis = { total: 0, items: [], topic: r.topic, at: Date.now() };
    H.S.mgForce = 'quiz';
    H.genShoot(r);
    return r.id;
  });
  await page.waitForFunction((id) => { const r = window.__hype.S.game.releases.find((x) => x.id === id); return r && r.game && r.game.items && r.game.items.length >= 2; }, qid, { timeout: 15000 });
  const q0 = await G(page, (id) => {
    const H = window.__hype, r = H.S.game.releases.find((x) => x.id === id);
    // the first question long (three lines), the second short
    r.game.items[0].text = 'Lors du dernier conseil des maisons, quelle décision Léandre a-t-il fait voter juste avant la fin, pendant que tout le monde rangeait ?';
    r.game.items[0].a = ['le report du bal des maisons à la semaine suivante', 'la fermeture de la salle 3 pour travaux', 'un nouveau règlement pour les duels', 'la hausse du prix des potions'];
    r.game.items[1].text = 'Qui ?'; r.game.items[1].a = ['Léandre', 'Zara', 'Théo', 'Nox'];
    H.S.stack = []; H.openLayer({ t: 'minigame', id }); H.update();
    const k = !H.easyGear() && H.hasBonus(H.S.game, 'prompteur') ? 1.15 : 1;
    return { clock: H.mgClock('quiz', r.game.items, H.DIFFS.find((d) => d.id === 'mythique'), k) };
  }, qid);
  await page.waitForSelector('.layer .mg-intro', { timeout: 8000 });
  const intro = await page.textContent('.layer .mg-intro');
  await page.locator('.layer .mg-intro button', { hasText: 'parti' }).click();
  await page.waitForSelector('.layer .mg-opts .mg-opt');
  const left1 = await page.$$eval('.layer .mg-top .mono', (els) => els[els.length - 1].textContent);
  await shot(page, 'quiz-long-question');
  await page.locator('.layer .mg-opts .mg-opt').first().click();
  await page.waitForFunction(() => /^2\//.test((document.querySelector('.layer .mg-top .mono') || {}).textContent || ''), null, { timeout: 6000 });
  await sleep(300);
  const left2 = await page.$$eval('.layer .mg-top .mono', (els) => els[els.length - 1].textContent);
  const sec = (t) => +((/(\d+) s$/.exec(t.trim()) || [])[1] || 0);
  check('on screen, in Mythique: the long first question shows its own clock, the short second one a shorter clock; the rule says « plus pour les longues »',
    Math.abs(sec(left1) - Math.round(q0.clock[0] / 1000)) <= 1 && Math.abs(sec(left2) - Math.round(q0.clock[1] / 1000)) <= 1 && sec(left1) > sec(left2) && /plus pour les longues/.test(intro),
    { left1, left2, clock: q0.clock, intro: intro.slice(0, 200) });
  await G(page, () => { const H = window.__hype; H.S.mgForce = null; H.S.stack = []; H.update(); });

  // ---------- the quote: a partner brand provides its own product, nothing else ----------
  const dv = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const o = { what: 'vidéo', topic: 'le droit du travail expliqué simplement' };
    const deals = [{ id: 'dl_x', brand: 'Nébula Games', emoji: '🎮', product: 'sa bêta « Stellar Odyssey »', what: 'vidéo', state: 'signed' }];
    const objs = [
      { t: 'cost', item: 'Code du travail (édition commentée)', price: 45, kind: 'achat' },
      { t: 'have', brand: 'Nébula Games', item: 'Livres de droit et consultation d’avocat' },
      { t: 'have', brand: 'Nébula Games', item: 'Accès à la bêta de Stellar Odyssey' },
    ];
    const d = H.readDevis(g, o, objs, [], deals);
    const pr = H.promptDevis(g, o, [], deals);
    return { have: d.have.map((h) => h.name), total: H.devisTotal(d), prompt: /ne fournit que son propre produit/.test(pr) && /un jeu vidéo ne remplace pas des livres de droit/.test(pr) && /sert vraiment ce contenu/.test(pr),
      same: [H.sameThing('Bouteilles de thé glacé', 'son thé glacé Zest'), H.sameThing('Potions énergisantes', 'sa potion énergisante au citron'), H.sameThing('Matériel pour le tournage', 'sa crème pour le visage')] };
  });
  check('the quote: a game brand’s partnership cannot « provide » law books (that line goes), only its own product (its beta stays); the cost of the books stays to pay; the AI is told plainly',
    dv.have.join('|') === 'Accès à la bêta de Stellar Odyssey' && dv.total === 45 && dv.prompt && dv.same.join() === 'true,true,false', dv);

  // ---------- the mix ----------
  const mix = await G(page, () => {
    const H = window.__hype, D = (id) => H.DIFFS.find((d) => d.id === id), r = { what: 'podcast' };
    return ['moyen', 'expert', 'legende', 'mythique'].map((id) => { const m = H.makeMix(r, D(id)); return [m.tracks.length, m.band, m.drift]; });
  });
  check('the mix: a wider band and a calmer drift than before 0.27.5, each level a notch harder since 0.27.9 (Légendaire: 0,16 and 0,22; Mythique: 0,15 and 0,23, four tracks)',
    JSON.stringify(mix) === JSON.stringify([[3, 0.22, 0.16], [4, 0.18, 0.2], [4, 0.16, 0.22], [4, 0.15, 0.23]]), mix);

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  console.log(`\n${checks.filter((c) => c[0] === 'PASS').length}/${checks.length} PASS`);
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
