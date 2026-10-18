// 0.27 end to end, in Chromium against the built hype.html with the mocked Claude runtime.
// - the grading (étalonnage), judged on the picture in 0.27, is gone in 0.27.4 (far too hard): what is checked now is that
//   it never comes back, even from a game drawn before the update;
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
(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);
  await newGame(page, 'Créatrice food et gaming');
  await G(page, () => { const g = window.__hype.S.game; g.career.cash = 5000; g.stats.followers = 20000; window.__hypeEasyGear = false; });

  // ---------- 0.27.4: the grading is gone (far too hard); one drawn before the update is drawn again ----------
  const gone = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    const r = { id: 'rl_legacy', what: 'vidéo', topic: 'avant la mise à jour', state: 'scheduled', due: Date.now() + 3600000, at: Date.now(), delays: 0, tries: 0, game: { kind: 'etalonnage', items: [{}, {}, {}] }, editGame: null, played: null };
    const r2 = { id: 'rl_legacy2', what: 'clip', topic: 'monté avant', state: 'scheduled', due: Date.now() + 7200000, at: Date.now(), delays: 0, tries: 0, game: null, played: { kind: 'quiz', score: 0.6, tier: 'mid', diff: 'moyen' }, editGame: { kind: 'etalonnage', items: [{}, {}, {}] } };
    const m = H.migrate(H.cloneJSON(Object.assign({}, g, { releases: [r, r2] })));
    const a = m.releases.find((x) => x.id === 'rl_legacy'), b = m.releases.find((x) => x.id === 'rl_legacy2');
    return { makers: Object.keys(H.ROUND_MAKERS).join(), arcade: H.ARCADE_KINDS.join(), rounds: JSON.stringify(H.ROUNDS_FOR), edits: JSON.stringify(H.EDIT_FOR), game: a.game, edit: b.editGame };
  });
  check('the colour grading is gone from the shoot, the edit and the rounds; a game of it drawn before the update (not played) is drawn again',
    !/etalonnage/.test(gone.makers + gone.arcade + gone.rounds + gone.edits) && gone.game === null && gone.edit === null, gone);

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
      { t: 'have', id: 'i2', use: 'conso' }, { t: 'have', brand: 'Croc’Midi', item: 'nappe et couverts' }, { t: 'have', brand: 'Croc’Midi', item: 'repas du jour Croc’Midi' }, { t: 'have', id: 'i9', use: 'conso' }, // (0.27.5: a brand provides its own product only: no tablecloth)
    ];
    H.S.devis = null; H.S.devisBy = {};
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
  check('the quote knows what the player has: the inventory (not what is on sale or sold) and the brand signed for this kind of content are in the prompt; what covers a need is « Déjà là, rien à payer » (the brand’s box repas, used up by the shoot; a meal of the brand, but never what it does not make), never on the bill, even when the AI lists it',
    dv1.stock.includes('[i1] Plaid à carreaux (un cadeau)') && dv1.stock.includes('[i2] Box repas (envoyé par Croc’Midi)') && !/sweat|lampe/i.test(dv1.stock) && /Croc’Midi \(ses box repas\)/.test(dv1.deals) && dv1.rule
      && dv1.items.join('|') === 'nappe à carreaux rouges' && dv1.total === 15 && dv1.have.length === 2 && dv1.have[0][0] === 'Box repas' && dv1.have[0][2] === 'conso' && /fourni par Croc’Midi/.test(dv1.have[1][1])
      && /Déjà là, rien à payer/.test(dv1.card) && /utilisé pour le tournage/.test(dv1.card) && /15\s€/.test(dv1.card), dv1);
  await page.locator('.layer .btn-hot', { hasText: 'Payer' }).click();
  await sleep(500);
  const dv2 = await G(page, (ids) => { const H = window.__hype, g = H.S.game, r = H.activeRelease(g); const out = { box: !!H.invItem(g, ids.box), plaid: !!H.invItem(g, ids.plaid), notif: (g.notifs.filter((n) => /tu utilises ce que tu avais/.test(n.text)).pop() || {}).text || '', have: r && r.devis && r.devis.have.length, cash: g.career.cash }; if (r) r.state = 'dropped'; window.__mockDevis = null; H.S.devis = null; H.S.devisBy = {}; H.closeLayer(); return out; }, setup);
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
