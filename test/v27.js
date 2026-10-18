// 0.27 end to end, in Chromium against the built hype.html with the mocked Claude runtime.
// - the grading (étalonnage) is judged on the picture: two grades that look the same score the same, whatever the
//   sliders say; after a shot, what was off the most, in words; thresholds tighter with the difficulty;
// - the quote knows the inventory and the brands signed: what covers a need is « already there » (not paid), what the
//   shoot uses up leaves the inventory when the quote is settled; what is on sale or sold is not offered;
// - Jasmine's 86 new photos, in 25 series, every tag kept as written (up to 20, up to 32 characters);
// - 124 stickers (57 more), an « Objets » tab in the keyboard.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v27.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v27');
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
// In the page: a grade that looks like the reference (under the « perfect » threshold) while its sliders are as far from
// it as can be found on a grid — what the eye matches without knowing the numbers.
const TWIN = `(function twin(H, game, it) {
  const steps = [-0.3, -0.24, -0.18, -0.12, -0.06, 0, 0.06, 0.12, 0.18, 0.24, 0.3], K = game.keys, cl = (x) => Math.max(-1, Math.min(1, x));
  let best = null;
  const walk = (k, v, far) => {
    if (k === K.length) { const de = H.gradeDE(it.scene, it.target, v); if (de <= game.d0 && (!best || far > best.far)) best = { v: Object.assign({}, v), far, de }; return; }
    for (const s of steps) { v[K[k]] = cl(Math.round((it.target[K[k]] + s) * 100) / 100); walk(k + 1, v, far + Math.abs(v[K[k]] - it.target[K[k]]) / K.length); }
  };
  walk(0, Object.assign({}, it.target), 0);
  return best;
})`;

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);
  await newGame(page, 'Créatrice food et gaming');
  await G(page, () => { const g = window.__hype.S.game; g.career.cash = 5000; g.stats.followers = 20000; window.__hypeEasyGear = false; });

  // ---------- the grading, judged on the picture ----------
  const gr = await G(page, (twinSrc) => {
    const H = window.__hype, twin = eval(twinSrc), D = (id) => H.DIFFS.find((d) => d.id === id), r = { what: 'vidéo', topic: 'les potions de Lumen' };
    const games = ['moyen', 'expert', 'mythique'].map((id) => H.makeGrade(r, D(id)));
    const [e2, e4, e6] = games, out = { d: games.map((e) => [e.d0, e.d1]), per: games.map((e) => e.per), keys: games.map((e) => e.keys.length), twins: [] };
    for (const it of e2.items) {
      const t = twin(H, e2, it);
      out.twins.push(t && { far: Math.round(t.far * 100) / 100, de: Math.round(t.de * 10) / 10, score: H.gradeScore(e2, it, t.v), old: Math.max(0, Math.round((1 - t.far / 0.45) * 100) / 100) });
    }
    const it = e2.items[0];
    out.perfect = H.gradeScore(e2, it, it.target);
    out.start = Math.max(...e4.items.map((x) => H.gradeScore(e4, x, x.start)));
    const warm = Object.assign({}, it.target, { temp: Math.max(-1, Math.min(1, it.target.temp + (it.target.temp > 0.3 ? -0.5 : 0.5))) });
    out.hint = H.gradeHint(e2, it, warm);
    out.hintWant = warm.temp > it.target.temp ? 'trop chaud' : 'trop froid';
    out.warmScore = H.gradeScore(e2, it, warm);
    // a grade begun before the 0.27 (its old tolerance) is still judged, as strictly
    out.legacy = H.gradeScore({ keys: e2.keys, tol: 0.45 }, it, it.target);
    return out;
  }, TWIN);
  check('the grading is judged on the picture: a grade that looks the same as the reference scores 100 % even with sliders far from it (the 0.26 formula gave less), a perfect match 1, an untouched shot little, tighter thresholds and the 4th slider with the difficulty',
    gr.perfect === 1 && gr.twins.every((t) => t && t.score === 1 && t.far >= 0.05) && gr.twins.some((t) => t.old < 0.8) && gr.start < 0.5
      && gr.d[0][1] > gr.d[1][1] && gr.d[1][1] > gr.d[2][1] && gr.d[0][0] > gr.d[2][0] && gr.keys.join() === '3,4,4' && gr.per[0] >= gr.per[2] && gr.legacy === 1, gr);
  check('after a shot that is off, the game says what was off the most, in words (« trop chaud », « un peu trop sombre »…)', gr.hint === gr.hintWant && gr.warmScore < 0.85, { hint: gr.hint, want: gr.hintWant, score: gr.warmScore });

  // on screen, at the edit step: the twins validated, one shot left warm
  const ed = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    g.career.platform = 'youtube'; window.__hypeEasyGear = true;
    const r = H.scheduleRelease(g, { what: 'vidéo', topic: 'le grand classement des potions', due: Date.now() + 60000 });
    window.__hypeEasyGear = false;
    r.due = Date.now() - 1000; r.devis = { total: 0, items: [], topic: r.topic, at: Date.now() };
    r.played = { tier: 'mid', score: 0.6, diff: 'moyen', kind: 'quiz', at: Date.now() };
    H.S.editForce = 'etalonnage';
    H.S.stack = []; H.openLayer({ t: 'minigame', id: r.id }); H.update();
    return r.id;
  });
  await page.waitForSelector('.layer .edit-step h3:has-text("L’étalonnage")', { timeout: 8000 });
  const edIntro = await page.textContent('.layer .edit-step');
  await page.locator('.layer .edit-step button', { hasText: /^ *Monter$/ }).click();
  await page.waitForSelector('.layer .grade-play', { timeout: 5000 });
  const fbs = [];
  for (let k = 0; k < 3; k++) {
    await page.waitForFunction((j) => { const el = document.querySelector('.layer .grade-play .mg-top .mono'); return el && el.textContent.startsWith((j + 1) + '/') && !document.querySelector('.layer .grade-play .btn-hot').disabled; }, k, { timeout: 8000 });
    await G(page, ([id, j, twinSrc]) => {
      const H = window.__hype, r = H.S.game.releases.find((x) => x.id === id), game = r.editGame, it = game.items[j];
      let v = j === 1 ? Object.assign({}, it.target, { temp: Math.max(-1, Math.min(1, it.target.temp + (it.target.temp > 0.3 ? -0.5 : 0.5))) }) : eval(twinSrc)(H, game, it).v;
      for (const inp of document.querySelectorAll('.layer .grade-sl input')) { inp.value = String(Math.round(v[inp.dataset.k] * 100)); inp.dispatchEvent(new Event('input', { bubbles: true })); }
    }, [ed, k, TWIN]);
    await sleep(150);
    await page.click('.layer .grade-play .btn-hot');
    await page.waitForFunction(() => /ressemblance|raccord/.test((document.querySelector('.layer .grade-play .mt-fb') || {}).textContent || ''), null, { timeout: 4000 });
    fbs.push(await page.textContent('.layer .grade-play .mt-fb'));
    if (k === 1) await shot(page, 'grade-hint');
  }
  await page.waitForFunction((id) => !!window.__hype.S.game.releases.find((x) => x.id === id).edit, ed, { timeout: 10000 });
  const edr = await G(page, (id) => { const r = window.__hype.S.game.releases.find((x) => x.id === id); return { m: r.edit.m, score: r.played.score }; }, ed);
  check('on screen, at the edit step: two shots matched by eye (not by the numbers) are « Parfait, c’est raccord ! », the shot left warm shows its likeness and what was off',
    /C’est l’image qui compte/.test(edIntro) && /Parfait, c’est raccord/.test(fbs[0]) && /Parfait, c’est raccord/.test(fbs[2]) && /% de ressemblance · .*trop (chaud|froid)/.test(fbs[1]) && edr.m > 0.66 && edr.m < 1, { fbs, edr });
  await G(page, () => { const H = window.__hype, g = H.S.game; H.S.editForce = null; for (const x of g.releases) if (x.state === 'scheduled' || x.state === 'live') x.state = 'dropped'; H.S.stack = []; H.update(); });

  // ---------- the quote: the inventory and the brands signed ----------
  const setup = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    g.inv = [];
    const box = H.invAdd(g, { kind: 'goods', name: 'box repas', emoji: '🍜', value: 80, cond: 'neuf', at: t - 5000, from: { how: 'marque', brand: 'Croc’Midi' } });
    const sold = H.invAdd(g, { kind: 'buy', name: 'vieux sweat', emoji: '👕', value: 20, at: t - 4000, from: { how: 'achat' } });
    sold.sold = { price: 10, at: t };
    const onSale = H.invAdd(g, { kind: 'buy', name: 'lampe de bureau', emoji: '💡', value: 30, at: t - 3000, from: { how: 'achat' } });
    onSale.sale = { price: 20, at: t, views: 0, favs: 0, last: t };
    const plaid = H.invAdd(g, { kind: 'gift', name: 'plaid à carreaux', emoji: '🎁', value: 40, at: t - 1000, from: { how: 'cadeau' } });
    g.deals.push({ id: 'dl-test', brand: 'Croc’Midi', emoji: '🍜', sector: 'food', product: 'ses box repas', what: 'vidéo', fee: 300, fee0: 300, value: 0, state: 'signed', at: t, signedAt: t, until: t, days: 5, due: t + 5 * 86400000, contact: '', max: 0 });
    window.__mockDevis = [
      { t: 'cost', item: 'box repas Croc’Midi', price: 30, kind: 'conso', keep: false, per: 'once' }, // (what the player has: dropped)
      { t: 'cost', item: 'nappe à carreaux rouges', price: 15, kind: 'achat', keep: true, per: 'once' },
      { t: 'have', id: 'i2', use: 'conso' }, { t: 'have', brand: 'Croc’Midi', item: 'sauces de la marque' }, { t: 'have', id: 'i9', use: 'conso' },
    ];
    H.S.devis = null;
    H.openLayer({ t: 'series', id: 'single' });
    return { box: box.id, plaid: plaid.id };
  });
  await sleep(300);
  await page.locator('.layer .seg button', { hasText: 'Vidéo' }).first().click();
  await page.fill('#se-theme', 'je teste les box repas en live dans ma cuisine');
  await page.locator('.layer .btn-hot', { hasText: 'Demander le devis' }).click();
  await page.waitForSelector('.devis-card .dv-have', { timeout: 10000 });
  await page.locator('.devis-card').scrollIntoViewIfNeeded();
  await shot(page, 'devis-deja-la');
  const dv1 = await G(page, () => {
    const p = window.__prompts.filter((x) => x.includes('## TÂCHE : LE DEVIS')).pop() || '', dv = window.__hype.S.devis;
    return { card: document.querySelector('.devis-card').textContent, items: dv.items.map((x) => x.item), have: dv.have.map((h) => [h.name, h.from, h.use || '']), total: window.__hype.devisTotal(dv),
      stock: (/Ce qu’il a sous la main, dans son inventaire : ([^\n]*)/.exec(p) || [])[1] || '', deals: (/Ses partenariats signés pour ce type de contenu : ([^\n]*)/.exec(p) || [])[1] || '', rule: /Ne lui fais jamais payer ce qu’il a déjà/.test(p) && p.includes('{"t":"have","id":"i1"') };
  });
  check('the quote knows what the player has: the inventory (not what is on sale or sold) and the brand signed for this kind of content are in the prompt; what covers a need is « Déjà là, rien à payer » (the brand’s box repas, used up by the shoot; the brand’s sauces), never on the bill, even when the AI lists it',
    dv1.stock.includes('[i1] Plaid à carreaux (un cadeau)') && dv1.stock.includes('[i2] Box repas (envoyé par Croc’Midi)') && !/sweat|lampe/i.test(dv1.stock) && /Croc’Midi \(ses box repas\)/.test(dv1.deals) && dv1.rule
      && dv1.items.join('|') === 'nappe à carreaux rouges' && dv1.total === 15 && dv1.have.length === 2 && dv1.have[0][0] === 'Box repas' && dv1.have[0][2] === 'conso' && /fourni par Croc’Midi/.test(dv1.have[1][1])
      && /Déjà là, rien à payer/.test(dv1.card) && /utilisé pour le tournage/.test(dv1.card) && /15 €/.test(dv1.card), dv1);
  await page.locator('.layer .btn-hot', { hasText: 'Payer' }).click();
  await sleep(500);
  const dv2 = await G(page, (ids) => { const H = window.__hype, g = H.S.game, r = H.activeRelease(g); const out = { box: !!H.invItem(g, ids.box), plaid: !!H.invItem(g, ids.plaid), notif: (g.notifs.filter((n) => /tu utilises ce que tu avais/.test(n.text)).pop() || {}).text || '', have: r && r.devis && r.devis.have.length, cash: g.career.cash }; if (r) r.state = 'dropped'; window.__mockDevis = null; H.S.devis = null; H.closeLayer(); return out; }, setup);
  check('…settled: what the shoot uses up leaves the inventory (the box repas), the rest stays (the plaid); the release keeps its « already there » lines',
    !dv2.box && dv2.plaid && /Box repas/.test(dv2.notif) && dv2.have === 2 && dv2.cash === 4985, dv2);

  // ---------- Jasmine's new photos ----------
  const pk = await G(page, () => {
    const H = window.__hype, P = H.PACK, j = P.byId.m01, phs = j ? j.photos : [];
    const long = phs.find((x) => x.tags.includes('lunettes de soleil sur la tête'));
    return { n: phs.length, look: j && j.look, profile: j && j.profile, maxTags: Math.max(...phs.map((x) => x.tags.length)), long: !!long, sets: Object.keys(P.sets).filter((k) => k.startsWith('m01:')).length,
      ete: phs.filter((x) => x.season === 'ete').length, soir: phs.filter((x) => x.moment === 'soir').length, all: Object.keys(P.photos).length };
  });
  check('Jasmine’s rework: 86 photos more (103), every tag kept as written (19 on some, « lunettes de soleil sur la tête » whole), 27 series, her new look and profile',
    pk.n === 103 && pk.maxTags === 19 && pk.long && pk.sets === 27 && pk.ete >= 6 && pk.soir >= 30 && /taches de rousseur/.test(pk.look) && /pâtisserie/.test(pk.profile) && pk.all >= 165, pk);

  // ---------- the stickers: 124, the objects ----------
  const em = await G(page, () => {
    const H = window.__hype, parts = H.emoParts('pause ☕ puis 📱 et 🫶 merci 💸, 🤝🏽 non');
    return { n: H.EMO_LIST.length, cats: [...new Set(H.EMO_LIST.map((e) => e.cat))].join(), imgs: parts.filter((x) => typeof x !== 'string').length, cafe: H.emoSearch('café').map((e) => e.id).join(), deal: H.emoSearch('partenariat').map((e) => e.id).join() };
  });
  await G(page, () => { const H = window.__hype, g = H.S.game, T = H.charByHandle(g, 'theo.marlin'); H.addIncomingDM(g, T, 'trop bien 🫶☕', Date.now() - 500); H.openDM(T.id); });
  await page.waitForSelector('.layer .bubbles', { timeout: 5000 });
  await page.click('.layer .emo-btn');
  await page.waitForSelector('.layer .emo-panel', { timeout: 3000 });
  await page.locator('.layer .emo-panel .emo-cat', { hasText: 'Objets' }).click();
  await sleep(250);
  const kb = await page.$eval('.layer .emo-panel', (e) => ({ cats: [...e.querySelectorAll('.emo-cat')].map((x) => x.textContent), cells: e.querySelectorAll('.emo-cell').length }));
  await shot(page, 'emoji-objets');
  check('124 stickers (57 more): the coffee, the phone, the heart hands, the flying money are ours now (a skin tone stays the phone’s); found by word; an « Objets » tab',
    em.n === 124 && em.cats === 'visages,mains,coeurs,symboles,objets' && em.imgs === 4 && em.cafe.split(',').includes('cafe') && em.deal.includes('accord') && kb.cats.includes('Objets') && kb.cells === 22, Object.assign({ kb }, em));
  await G(page, () => { window.__hype.S.stack = []; window.__hype.S.emoOpen = null; window.__hype.update(); });

  // ---------- the reframing's buttons: faster than the quickest subject ----------
  const fsp = /const FRAME_SPEED = ([\d.]+)/.exec(PAGE); // (0.27.2: 1,1)
  check('the reframing’s buttons move the frame faster than the quickest subject (0,9 a second or more, 0,59 at most for the subject)', !!fsp && parseFloat(fsp[1]) >= 0.9 && /x\.f \+ d \* FRAME_SPEED \* dt/.test(PAGE), fsp && fsp[1]);

  await browser.close();
  console.log('\nERRORS', errors.length ? errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`\n${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
