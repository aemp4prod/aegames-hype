// 0.27.1 end to end, in Chromium against the built hype.html with the mocked Claude runtime: the creator's photo
// atelier follows the pack shipped with the game.
// - a player who never made a pack: nothing changes, nothing is written;
// - the creator's atelier from before (an older copy of the shipped faces, the same images): it takes in the newer
//   shipped versions (new photos, profile, profile photo), adds a shipped face it lacks, keeps the creator's own faces
//   and photos (one of theirs under a shipped id gets an id of its own, its series too); the game shows the same;
// - a reload takes nothing in twice; a shipped face the creator removed does not come back (until a newer version);
// - a face of the creator's own under a shipped id moves to an id of its own; an image that cannot be read: nothing
//   touched, tried again later; an older export imported takes in the shipped faces too;
// - the export carries the shipped images; no photo goal in the atelier, no real limit to a face's photos.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v271.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v271');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(process.env.PAGE || path.join(ROOT, 'hype.html'), 'utf8');
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
    const pk = /^https:\/\/hype\.test\/pack\/([\w.-]+\.webp)$/.exec(url); // the shipped images, as the app serves them
    if (pk) return fs.existsSync(path.join(ROOT, 'assets', 'pack', pk[1])) ? route.fulfill({ status: 200, contentType: 'image/webp', body: fs.readFileSync(path.join(ROOT, 'assets', 'pack', pk[1])) }) : route.fulfill({ status: 404, body: '' });
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
// In the page: the shipped image of a file, as a data URL (what the creator's own export held).
const SHIPPED = `(async function (file) { const b = await (await fetch('pack/' + file)).blob(); return await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); }); })`;
const TINY = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);

  // ---------- a player who never made a pack ----------
  const fresh = await G(page, async () => { const H = window.__hype; await H.loadAtelier(); return { meta: await H.Store.read('pk_meta').catch(() => null), people: H.S.atelier.meta.people.length, m01: H.PACK.byId.m01.photos.length, f02: H.PACK.byId.f02.photos.length, local: H.PACK.local }; });
  check('a player who never made a pack: their atelier stays empty (nothing written), the game has every shipped face (Jasmine’s 150 photos, Cloé’s 43)',
    !fresh.meta && fresh.people === 0 && fresh.m01 === 150 && fresh.f02 === 43 && fresh.local === 0, fresh);

  // ---------- the creator's atelier from before: older copies of Sarah and Jasmine (the same images), a photo of their
  // own under a shipped id, no Cloé, a face of their own ----------
  const before = await G(page, async ({ SHIPPED, TINY }) => {
    const H = window.__hype, shipped = eval(SHIPPED), man = (id) => H.PACK.byId[id];
    const old = (pid, n) => man(pid).photos.slice(0, n).map((ph) => ({ id: ph.id, season: 'all', moment: 'all', set: ph.set, tags: ['ancien'], desc: 'ancienne description', _f: ph.file }));
    const sarah = old('f01', 19), jas = old('m01', 17);
    jas.push({ id: 'm01-18', season: 'ete', moment: 'jour', set: 's3', tags: ['à moi'], desc: 'ma photo à moi', _own: true }, { id: 'm01-19', season: 'ete', moment: 'jour', set: 's3', tags: ['à moi'], desc: 'mon autre photo', _own: true });
    const meta = { v: 2, people: [
      { id: 'f01', g: 'f', style: 'moderne', label: 'Sarah', look: '', profile: 'ancien profil', portrait: 'f01-p', photos: sarah, next: 20 },
      { id: 'm01', g: 'f', style: 'moderne', label: 'Jasmine', look: 'ancien look', profile: 'ancien profil', portrait: 'm01-p', photos: jas, next: 20 },
      { id: 'f05', g: 'f', style: 'moderne', label: 'Femme 5', look: '', profile: '', portrait: null, photos: [{ id: 'f05-1', season: 'all', moment: 'all', set: '', tags: ['à moi'], desc: '' }], next: 2 },
    ] };
    for (const p of meta.people) {
      if (p.portrait) await H.Store.write('pk_img_' + p.portrait, { data: TINY });
      for (const ph of p.photos) { await H.Store.write('pk_img_' + ph.id, { data: ph._f ? await shipped(ph._f) : TINY }); delete ph._f; delete ph._own; }
    }
    const s3 = man('m01').photos.filter((x) => x.set === 's3').map((x) => x.id);
    await H.Store.write('pk_meta', meta);
    await H.loadAtelier();
    await new Promise((r) => setTimeout(r, 400));
    const A = H.S.atelier.meta, at = (id) => A.people.find((x) => x.id === id), m = at('m01'), c = at('f02'), gm = H.PACK.byId.m01;
    const mine = m.photos.filter((x) => x.tags.includes('à moi'));
    return { ids: A.people.map((x) => x.id).join(), m01: m.photos.length, next: m.next, look: m.look, pt: H.atPortrait(m), first: m.photos[0].file, desc: m.photos[0].desc,
      mine: mine.map((x) => `${x.id}:${x.set}:${x.file || ''}`).join(), mineImg: (await H.Store.read('pk_img_' + (mine[0] || {}).id).catch(() => null) || {}).data === TINY,
      oldDoc: !!(await H.Store.read('pk_img_m01-18').catch(() => null)), shippedS3: s3.join(), s3now: m.photos.filter((x) => x.set === 's3').map((x) => x.id).join(),
      f02: c ? c.photos.length : 0, f02pt: c ? H.atPortrait(c) : '', f05: at('f05').photos.length, f01files: at('f01').photos.filter((x) => x.file).length,
      shipped: A.shipped, saved: ((await H.Store.read('pk_meta')) || { people: [] }).people.length,
      game: { m01: gm.photos.length, local: gm.local, src: H.phSrc(gm, gm.photos.find((x) => x.id === 'm01-61')), mineSrc: H.phSrc(gm, gm.photos.find((x) => x.id === (mine[0] || {}).id)), pt: H.portraitSrc(gm), f02: H.PACK.byId.f02.photos.length, f05: H.PACK.byId.f05 ? H.PACK.byId.f05.photos.length : 0 } };
  }, { SHIPPED, TINY });
  check('the creator’s atelier from before (Sarah and Jasmine as exported, 17 photos for Jasmine): it takes in the shipped versions — Jasmine’s 150 photos, her new look and profile photo; Cloé and Zoé, missing, come in (43 and 1 photos); the creator’s own face stays; saved; the game shows the same',
    before.ids === 'f01,m01,f05,f02,f03' && before.m01 === 152 && before.next === 153 && /taches de rousseur/.test(before.look) && before.pt === 'pack/m01-p.webp' && before.first === 'm01-1.webp' && before.desc !== 'ancienne description'
      && before.f01files === 54 && before.f02 === 43 && before.f02pt === 'pack/f02-p.webp' && before.f05 === 1 && before.shipped && before.shipped.m01 === 202610191945 && before.saved === 5
      && before.game.m01 === 152 && before.game.local && before.game.src === 'pack/m01-61.webp' && before.game.pt === 'pack/m01-p.webp' && before.game.f02 === 43 && before.game.f05 === 1, before);
  check('the creator’s own photos under shipped ids (another picture): kept, with ids of their own (their image follows), their series apart from the shipped one',
    before.mine === 'm01-151:s40:,m01-152:s40:' && before.mineImg && !before.oldDoc && before.shippedS3.length > 0 && before.s3now === before.shippedS3 && /^data:image\/webp/.test(before.game.mineSrc || ''), before);

  // ---------- on screen: the atelier, no photo goal ----------
  await G(page, () => { const H = window.__hype; H.S.atelier.sel = 'f02'; H.openAtelier(); });
  await page.waitForSelector('.atelier .at-goal', { timeout: 5000 });
  await page.waitForFunction(() => [...document.querySelectorAll('.atelier .at-photo img')].length >= 10, null, { timeout: 8000 });
  await sleep(800);
  const ui = await G(page, () => ({ goal: document.querySelector('.atelier .at-goal').textContent, cards: [...document.querySelectorAll('.atelier .at-pcard b')].map((b) => b.textContent), imgs: [...document.querySelectorAll('.atelier .at-photo img')].slice(0, 3).map((i) => i.getAttribute('src')), loaded: [...document.querySelectorAll('.atelier .at-photo img')].slice(0, 3).every((i) => i.complete && i.naturalWidth > 0) }));
  await shot(page, 'atelier-cloe');
  check('on screen: the atelier lists Cloé with her photos (the shipped images, shown), and counts the photos without a goal (no « /135 »)',
    /Photos 251/.test(ui.goal) && !/\//.test(ui.goal.split('Photos')[1]) && ui.cards.includes('Cloé') && ui.cards.includes('Zoé') && ui.imgs.length === 3 && ui.imgs.every((s) => /^pack\/f02-\d+\.webp$/.test(s)) && ui.loaded, ui);

  // ---------- a reload: nothing twice; a shipped face removed by the creator does not come back ----------
  const again = await G(page, async () => {
    const H = window.__hype;
    await H.loadAtelier();
    const n1 = H.S.atelier.meta.people.map((x) => `${x.id}:${x.photos.length}`).join();
    H.removePerson(H.S.atelier.meta.people.find((x) => x.id === 'f02'));
    await new Promise((r) => setTimeout(r, 900));
    await H.loadAtelier();
    return { n1, ids: H.S.atelier.meta.people.map((x) => x.id).join(), game: H.PACK.byId.f02 ? { local: H.PACK.byId.f02.local, n: H.PACK.byId.f02.photos.length } : null };
  });
  check('a reload takes nothing in twice; Cloé removed from the atelier does not come back there (the game still has the shipped one)',
    again.n1 === 'f01:54,m01:152,f05:1,f02:43,f03:1' && again.ids === 'f01,m01,f05,f03' && again.game && !again.game.local && again.game.n === 43, again);

  // ---------- the export carries the shipped images ----------
  const ex = await G(page, async ({ TINY }) => { const t = JSON.parse(await window.__hype.packExportText()); const m = t.people.find((p) => p.id === 'm01'); return { n: m.photos.length, img: (m.photos[60].img || '').slice(0, 22), size: (m.photos[60].img || '').length, pt: (m.portrait || '').slice(0, 22), mine: m.photos.filter((x) => x.img === TINY).map((x) => x.id).join(), own: t.people.find((p) => p.id === 'f05').photos.length }; }, { TINY });
  check('the exported pack carries every photo, the shipped ones included (their images, the new profile photo), and the creator’s own',
    ex.n === 152 && ex.img === 'data:image/webp;base64' && ex.size > 2000 && ex.pt === 'data:image/webp;base64' && ex.mine === 'm01-151,m01-152' && ex.own === 1, ex);

  // ---------- a face of the creator's own under a shipped id; an unreadable image; an older export imported ----------
  const other = await G(page, async ({ TINY }) => {
    const H = window.__hype;
    await H.Store.write('pk_img_f02-1', { data: TINY }); await H.Store.write('pk_img_f02-2', { data: TINY }); await H.Store.write('pk_img_f02-p', { data: TINY });
    await H.Store.write('pk_meta', { v: 2, people: [{ id: 'f02', g: 'f', style: 'moderne', label: 'Léa', look: '', profile: 'ma Léa', portrait: 'f02-p', photos: [1, 2].map((k) => ({ id: 'f02-' + k, season: 'all', moment: 'all', set: '', tags: ['léa'], desc: 'Léa ' + k })), next: 3 }] });
    await H.loadAtelier();
    await new Promise((r) => setTimeout(r, 400));
    const A = H.S.atelier.meta, lea = A.people.find((x) => x.label === 'Léa'), cloe = A.people.find((x) => x.id === 'f02');
    return { ids: A.people.map((x) => `${x.id}:${x.label}:${x.photos.length}`).join(), lea: lea ? lea.photos.map((x) => x.id).join() + '|' + lea.portrait : '', leaImg: lea ? ((await H.Store.read('pk_img_' + lea.photos[0].id).catch(() => null)) || {}).data === TINY : false,
      oldDoc: !!(await H.Store.read('pk_img_f02-1').catch(() => null)), cloe: cloe ? `${cloe.photos.length}:${cloe.photos[0].file}` : '', game: H.PACK.byId.f02 && H.PACK.byId.f02.photos.length };
  }, { TINY });
  check('a face of the creator’s own under a shipped id (« Léa » as f02): she moves to an id of her own, with her photos and profile photo; Cloé takes f02 (and the other shipped faces come in)',
    /^f0\d:Léa:2,f01:Sarah:54,m01:Jasmine:150,f02:Cloé:43,f03:Zoé:1$/.test(other.ids) && /^(f0\d)-1,\1-2\|\1-p$/.test(other.lea) && !/^f02-/.test(other.lea) && other.leaImg && !other.oldDoc && other.cloe === '43:f02-1.webp' && other.game === 43, other);

  const e0 = errors.length; // (the unreadable image: one 404, expected)
  const dark = await G(page, async ({ TINY }) => {
    const H = window.__hype;
    window.__HYPE_TEST_PACK__ = { v: 2, people: [{ id: 'f01', g: 'f', style: 'moderne', label: 'Sarah', rev: 209901010000, portrait: 'f01-p.webp', photos: [{ id: 'f01-1', file: 'introuvable-1.webp', season: 'all', moment: 'all', set: '', tags: ['x'], desc: 'x' }] }] };
    await H.Store.write('pk_img_f01-1', { data: TINY });
    await H.Store.write('pk_meta', { v: 2, people: [{ id: 'f01', g: 'f', style: 'moderne', label: 'Ma Sarah', look: '', profile: '', portrait: null, photos: [{ id: 'f01-1', season: 'all', moment: 'all', set: '', tags: ['à moi'], desc: 'à moi' }], next: 2 }] });
    const before = JSON.stringify((await H.Store.read('pk_meta')).people);
    await H.loadAtelier();
    const after = JSON.stringify(H.S.atelier.meta.people), saved = JSON.stringify((await H.Store.read('pk_meta')).people);
    delete window.__HYPE_TEST_PACK__;
    H.rebuildPack();
    return { same: before === after && saved === before, shipped: H.S.atelier.meta.shipped || null };
  }, { TINY });
  await sleep(300);
  errors.splice(e0, errors.length - e0, ...errors.slice(e0).filter((e) => !/status of 404/.test(e)));
  check('a shipped image that cannot be read: that face is left as it is (nothing written), tried again next time', dark.same && !(dark.shipped && dark.shipped.f01), dark);

  const imp = await G(page, async ({ SHIPPED }) => {
    const H = window.__hype, shipped = eval(SHIPPED);
    await H.loadAtelier();
    const m = H.PACK.byId.m01;
    const photos = [];
    for (const ph of m.photos.slice(0, 17)) photos.push({ id: ph.id, season: ph.season, moment: ph.moment, set: ph.set, tags: ph.tags, desc: ph.desc, img: await shipped(ph.file) });
    const n = await H.packImportText(JSON.stringify({ format: 'hype-pack', v: 2, made: '2026-10-01T10:00:00.000Z', people: [{ id: 'm01', g: 'f', style: 'moderne', label: 'Jasmine', look: '', profile: 'ancien', portrait: null, photos }] }));
    await new Promise((r) => setTimeout(r, 400));
    const A = H.S.atelier.meta;
    return { n, ids: A.people.map((x) => `${x.id}:${x.photos.length}`).join(), files: A.people[0].photos.filter((x) => x.file).length, game: H.PACK.byId.m01.photos.length };
  }, { SHIPPED });
  check('an older export imported (Jasmine with 17 photos): the atelier takes in the faces shipped since (her 150 photos, Sarah, Cloé, Zoé)', imp.n === 1 && imp.ids === 'm01:150,f01:54,f02:43,f03:1' && imp.files === 150 && imp.game === 150, imp);

  // ---------- no real limit to a face's photos ----------
  const lim = await G(page, () => {
    const H = window.__hype, photos = Array.from({ length: 300 }, (_, k) => ({ id: `f09-${k + 1}`, file: `f09-${k + 1}.webp`, tags: ['test'], desc: '' }));
    window.__HYPE_TEST_PACK__ = { v: 1, people: [{ id: 'f09', g: 'f', style: 'moderne', label: 'Test', portrait: 'f09-p.webp', photos }] };
    H.rebuildPack();
    const n = H.PACK.byId.f09 ? H.PACK.byId.f09.photos.length : 0;
    delete window.__HYPE_TEST_PACK__;
    H.rebuildPack();
    return { n, max: H.PH_PER_PERSON };
  });
  check('a face can have hundreds of photos (300 here, 60 before the 0.27)', lim.n === 300 && lim.max >= 1000, lim);

  await browser.close();
  console.log('\nERRORS', errors.length ? errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`\n${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
