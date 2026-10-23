// End-to-end test of the desktop app, with a simulated ChatGPT (fake-chatgpt.mjs) in the main process.
// Run: OUT=<dir for screenshots> xvfb-run -a node test/e2e.mjs   (Linux; Playwright from PLAYWRIGHT or /opt/npm-tools)
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { _electron: electron } = require(process.env.PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || join(APP, 'test', 'shots');
mkdirSync(OUT, { recursive: true });
const DATA = mkdtempSync(join(OUT, 'data-'));
const EXPORTS = mkdtempSync(join(OUT, 'exports-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// a small PNG for the atelier (8 × 10 pixels)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAKCAIAAAAGpYjXAAAAJElEQVR4nGO4U6EBRBpRJ4AImc2AVRTIYMAqCpXAahrDoLQDADTMbvExYGgJAAAAAElFTkSuQmCC', 'base64');
const checks = [], errors = [];
const check = (name, ok, info) => { checks.push([ok, name]); console.log(ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)); };
let shotN = 0, lastPage = null;
const shot = async (page, name) => { shotN++; await page.screenshot({ path: join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`) }); };

async function launch(env = {}) {
  const app = await electron.launch({
    executablePath: join(APP, 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron'),
    args: [APP, '--no-sandbox'],
    env: { ...process.env, HYPE_TEST: '1', HYPE_FAKE_AI: '1', HYPE_DATA_DIR: DATA, ...env },
  });
  app.process().stderr.on('data', (d) => { const t = String(d); if (/Error|error:|Uncaught/.test(t) && !/dbus|Fontconfig|gpu|GPU|viz|libva|vaapi|Debugger/.test(t)) errors.push('[main] ' + t.trim()); });
  const page = await app.firstWindow();
  lastPage = page;
  page.on('pageerror', (e) => errors.push('[page] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  await page.waitForSelector('#app *', { timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector('#app .splash'), null, { timeout: 15000 }); // the first screen, past the splash
  return { app, page };
}
const G = (page, fn, arg) => page.evaluate(fn, arg);
// in the main process: fn(electronModule, arg)
const main = (app, fn, arg) => app.evaluate(fn, arg);
async function clickText(page, sel, text) {
  const el = page.locator(sel, { hasText: text }).first();
  await el.waitFor({ state: 'visible', timeout: 15000 });
  if (!sel.startsWith('.modal')) await dismiss(page); // a modal that arrived meanwhile (a new dynamic, a viral post…)
  await el.click();
}
async function closeLayers(page) { for (let k = 0; k < 5 && (await page.$('.layer')); k++) { await page.click('.layer-head .iconbtn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(400); } }
async function dismiss(page) { for (let k = 0; k < 6 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(700); } }
async function idle(page, ms = 25000) {
  const end = Date.now() + ms;
  while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.create); })) await sleep(300);
}
// the window is wide: the left rail (labels) instead of the phone tab bar and the floating button
const tab = async (page, label) => { await dismiss(page); await closeLayers(page); await page.click(`.tab:visible:has-text("${label}"), .rail-item[aria-label="${label}"]:visible`); };
const compose = async (page) => { await dismiss(page); await page.click('.fab:visible, .rail-post:visible'); };
// everything about the game (ChatGPT, the cafés, export, delete) is behind the gear, top right
const settings = async (page) => { await dismiss(page); await closeLayers(page); await page.click('.gear-btn:visible'); await page.waitForSelector('.layer .section'); await sleep(300); };
async function post(page, text) {
  await compose(page);
  await page.waitForSelector('#compose');
  await page.fill('#compose', text);
  await clickText(page, '.layer-head button', 'Publier');
}

try {
  // ---------- first launch: nothing works before ChatGPT is connected ----------
  let { app, page } = await launch();
  const home0 = await G(page, () => ({ panel: !!document.querySelector('.gpt-panel .gpt-btn'), btn: (document.querySelector('.gpt-btn') || {}).textContent || '', newDisabled: [...document.querySelectorAll('button')].find((b) => /Nouvelle partie/.test(b.textContent)).disabled, store: window.__hype.S.store, import: !!document.querySelector('button .ic') && /Importer une partie/.test(document.body.textContent) }));
  await shot(page, 'home-signed-out');
  check('first launch: « Continuer avec ChatGPT », no new game before signing in, games saved on this computer', home0.panel && /Continuer avec ChatGPT/.test(home0.btn) && home0.newDisabled && home0.store === 'db' && home0.import, home0);
  // 0.32: « Comment ça marche ? » is there before signing in; its last step says why no game can be created yet
  await page.click('.tuto-open');
  await page.waitForSelector('.modal-card.tuto');
  await page.click('.tuto-dots button >> nth=-1');
  await sleep(400);
  await shot(page, 'tuto-signed-out');
  const tu0 = await G(page, () => ({ steps: document.querySelectorAll('.tuto-dots button').length, main: document.querySelector('.tuto-nav .btn-hot').textContent, why: (document.querySelector('.tuto-body.on .tuto-why') || {}).textContent || '' }));
  await page.click('.tuto-nav .btn-hot');
  await sleep(300);
  const tu0closed = !(await page.$('.modal-card.tuto'));
  check('« Comment ça marche ? » on the home screen before signing in: eight steps, the last one says to connect ChatGPT first, and only closes', tu0.steps === 8 && tu0.main === 'Compris !' && /connecte d’abord ChatGPT/.test(tu0.why) && tu0closed, tu0);
  // 0.27.10: no Windows title bar: Hype's own bar on the game's window (the buttons drive the real window: under Xvfb,
  // without a window manager, the window cannot enlarge, so the window's own calls are watched instead)
  const bar0 = await G(page, () => { const b = document.querySelector('.appbar'), body = document.querySelector('.app-body'), r = b && b.getBoundingClientRect(), rb = body && body.getBoundingClientRect();
    return { bar: !!b, logo: !!(b && b.querySelector('.hb-logo')), btns: b ? [...b.querySelectorAll('.win-btn')].map((x) => x.getAttribute('aria-label')) : [], h: r ? Math.round(r.height) : 0, bodyTop: rb ? Math.round(rb.top) : -1, drag: b ? getComputedStyle(b).getPropertyValue('-webkit-app-region') : '' }; });
  await main(app, ({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0];
    let max = false;
    globalThis.__winCalls = [];
    w.maximize = () => { globalThis.__winCalls.push('maximize'); max = true; w.emit('maximize'); };
    w.unmaximize = () => { globalThis.__winCalls.push('unmaximize'); max = false; w.emit('unmaximize'); };
    w.minimize = () => { globalThis.__winCalls.push('minimize'); };
    w.isMaximized = () => max;
  });
  await page.click('.appbar .win-max');
  await page.waitForFunction(() => /Remettre Hype à sa taille/.test(document.querySelector('.appbar .win-max').getAttribute('aria-label')), null, { timeout: 5000 }).catch(() => {});
  const lab1 = await G(page, () => document.querySelector('.appbar .win-max').getAttribute('aria-label'));
  await page.click('.appbar .win-max');
  await page.waitForFunction(() => /Agrandir Hype/.test(document.querySelector('.appbar .win-max').getAttribute('aria-label')), null, { timeout: 5000 }).catch(() => {});
  const lab2 = await G(page, () => document.querySelector('.appbar .win-max').getAttribute('aria-label'));
  await page.click('.appbar .win-min');
  await sleep(400);
  const winCalls = await main(app, () => globalThis.__winCalls.slice());
  check('the game’s window wears Hype’s bar, not the system’s: the logo, « Réduire », « Agrandir » (then « Remettre à sa taille »), « Fermer »; the bar moves the window; the game starts under it',
    bar0.bar && bar0.logo && bar0.btns.join('|') === 'Réduire Hype|Agrandir Hype|Fermer Hype' && bar0.h === 36 && bar0.bodyTop === 36 && bar0.drag === 'drag'
      && /Remettre Hype à sa taille/.test(lab1) && /Agrandir Hype/.test(lab2) && winCalls.join(',') === 'maximize,unmaximize,minimize', { bar0, lab1, lab2, winCalls });
  // the photo pack shipped with the game (assets/pack/, when there is one): its images are in the app and load
  const shipped = join(APP, '..', 'assets', 'pack', 'manifest.json');
  if (existsSync(shipped)) {
    const want = JSON.parse(readFileSync(shipped, 'utf8')).people;
    const pk = await G(page, async () => {
      const H = window.__hype, P = H.PACK, srcs = P.people.map((p) => H.portraitSrc(p)).concat(Object.values(P.photos).slice(0, 3).map((x) => 'pack/' + x.ph.file));
      const sizes = await Promise.all(srcs.map((s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i.naturalWidth); i.onerror = () => ok(0); i.src = s; })));
      return { n: P.bundled, srcs, sizes };
    });
    check(`the photo pack shipped with the game is in the app: ${want.length} people, their images load`, pk.n === want.length && pk.sizes.length >= want.length && pk.sizes.every((w) => w > 0), pk);
  }

  await page.click('.gpt-btn');
  await page.waitForSelector('.host-modal', { timeout: 10000 });
  await sleep(300);
  await shot(page, 'welcome-plan');
  const welcome = await G(page, () => ({ title: document.querySelector('.host-modal .modal-title').textContent, panel: (document.querySelector('.gpt-panel') || {}).textContent || '' }));
  await clickText(page, '.host-modal .btn', 'Compris');
  await sleep(400);
  const prefs1 = JSON.parse(readFileSync(join(DATA, 'preferences.json'), 'utf8'));
  check('sign-in: connected as the account, the plan welcome shown once and remembered', /ton abonnement ChatGPT/.test(welcome.title) && /Connecté à ChatGPT/.test(welcome.panel) && /testeur@exemple\.fr/.test(welcome.panel) && prefs1.welcomed === true, { welcome, prefs1 });
  await page.click('.tuto-open');
  await page.waitForSelector('.modal-card.tuto');
  await page.click('.tuto-dots button >> nth=-1');
  await sleep(400);
  const tu1 = await G(page, () => document.querySelector('.tuto-nav .btn-hot').textContent);
  await page.keyboard.press('Escape');
  await sleep(300);
  const tu1closed = !(await page.$('.modal-card.tuto'));
  check('signed in: the last step of « Comment ça marche ? » offers « Créer ma partie »', tu1 === 'Créer ma partie' && tu1closed, { tu1, tu1closed });

  // ---------- a new game, written by « ChatGPT » ----------
  await clickText(page, 'button', 'Nouvelle partie');
  await page.waitForSelector('.world');
  await clickText(page, 'button.world', 'Académie Lumen');
  await page.waitForSelector('#pn');
  await page.fill('#pn', 'Mila Flux');
  await clickText(page, '.seg button', 'Elle');
  await page.fill('#pi', 'Une nouvelle élève qui cache un pouvoir interdit');
  await page.check('#p18');
  const creating = await page.textContent('form');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=Qui sera ton premier abonné', { timeout: 30000 });
  await page.locator('.cast-card.pick', { hasText: 'Théo' }).click();
  await page.click('.cast-cta button');
  await page.waitForSelector('.post', { timeout: 15000 });
  await sleep(5000);
  await dismiss(page);
  await shot(page, 'feed');
  const calls0 = await main(app, () => globalThis.__hypeFake.calls.slice());
  const st0 = await G(page, () => { const g = window.__hype.S.game; return { posts: g.posts.length, chars: Object.keys(g.chars).length, id: g.id }; });
  check('world created through the ChatGPT plan (first listed model, low effort), « ChatGPT invente tes personnages »', st0.posts >= 3 && st0.chars >= 8 && calls0.length >= 1 && calls0[0].model === 'gpt-test-rapide' && calls0[0].effort === 'low' && /ChatGPT invente tes personnages/.test(creating), { st0, calls0: calls0.slice(0, 2) });

  // ---------- a post: streamed answer, the plan shown next to the composer ----------
  await compose(page);
  await page.waitForSelector('#compose');
  const planLine = await page.textContent('.composer-plan').catch(() => '');
  await page.fill('#compose', '@zara.vey demain 8h, cour des Glycines. ramène tes lunettes de soleil #DuelDesGlycines');
  // with a real photo of the player's (0.9.1): kept as a file of the app, the AI reads only what it shows
  await clickText(page, '.layer .ideas button', 'Photo');
  await page.setInputFiles('.layer .pics-box input[type=file]', { name: 'moi.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForSelector('.layer .pics .pic img', { timeout: 10000 });
  await page.fill('#photo-desc', 'moi dans la cour des Glycines, lunettes de soleil sur le nez');
  await shot(page, 'compose-plan');
  const nCalls = await main(app, () => globalThis.__hypeFake.calls.length);
  await clickText(page, '.layer-head button', 'Publier');
  await sleep(6000);
  await idle(page);
  await sleep(4000);
  await dismiss(page);
  const st1 = await G(page, () => { const g = window.__hype.S.game; const p = g.posts.find((x) => x.a === 'p'); return { res: !!(p && p.res), replies: p ? p.replies.length : 0, own: p && p.photo && p.photo.own ? p.photo.own : [], img: !!(p && document.querySelector(`.post[data-p="${p.id}"] .photo.real img[src^="data:image/"]`)) }; });
  const callsPh = (await main(app, () => globalThis.__hypeFake.calls.slice())).slice(nCalls);
  check('a post answered on the ChatGPT plan; « Utilise ton abonnement ChatGPT · Gérer l’usage » next to the composer', st1.res && st1.replies >= 2 && /Utilise ton abonnement ChatGPT/.test(planLine) && /Gérer l’usage/.test(planLine), { st1, planLine });
  check('the post has the player’s own photo, shown in the feed; ChatGPT gets its description, never the image', st1.own.length === 1 && st1.img && callsPh.length >= 1 && callsPh[0].photo && callsPh.every((c) => !c.img), { own: st1.own, img: st1.img, callsPh });
  await shot(page, 'post-answered');

  // ---------- files on this computer ----------
  const base = join(DATA, 'parties', 'data', 'users', 'local');
  const files = existsSync(base) ? readdirSync(base) : [];
  const index = files.includes('index.json') ? JSON.parse(readFileSync(join(base, 'index.json'), 'utf8')) : null;
  check('the game is a set of files in the app folder (index, core, feed, messages)', !!index && index.games.some((x) => x.id === st0.id) && files.includes(`g_${st0.id}.json`) && files.includes(`g_${st0.id}_feed.json`), { files });
  const pm = files.filter((f) => /^pm_/.test(f));
  const pmDoc = pm.length ? JSON.parse(readFileSync(join(base, pm[0]), 'utf8')) : null;
  const feedDoc = JSON.parse(readFileSync(join(base, `g_${st0.id}_feed.json`), 'utf8'));
  check('the photo is a file of its own in the app folder (not inside the game’s files)', pm.length === 1 && pm[0] === `pm_${st1.own[0]}.json` && /"data:image\/(webp|png|jpeg);base64,/.test(JSON.stringify(pmDoc)) && !JSON.stringify(feedDoc).includes('data:image'), { pm });

  // ---------- settings (the gear): the model, the plan, the account, the cafés ----------
  await settings(page);
  await G(page, () => { const el = document.querySelector('.layer .gpt-settings'); if (el) el.scrollIntoView({ block: 'center' }); });
  await sleep(300);
  await shot(page, 'settings-chatgpt');
  const prof = await G(page, () => { const box = document.querySelector('.layer .gpt-settings'); const sel = box && box.querySelector('select'); return { text: box ? box.textContent : '', options: sel ? [...sel.options].map((o) => o.value) : [], value: sel ? sel.value : '', budget: /Budget IA par jour/.test(document.querySelector('.layer').textContent), version: (document.querySelector('.layer .danger-zone') || {}).textContent || '' }; });
  await page.selectOption('.layer .gpt-settings select', 'gpt-test-pro');
  await sleep(500);
  const prefs2 = JSON.parse(readFileSync(join(DATA, 'preferences.json'), 'utf8'));
  check('settings: plan line, model list from the account, the choice is kept; the café budget and the version (alpha) there too', /Utilise ton abonnement ChatGPT/.test(prof.text) && /testeur@exemple\.fr/.test(prof.text) && prof.options.join() === 'gpt-test-rapide,gpt-test-pro' && prof.value === 'gpt-test-rapide' && prefs2.model === 'gpt-test-pro' && prof.budget && /0\.\d+\.\d+ · alpha/.test(prof.version), { prof, prefs2 });

  // ---------- 0.9.3: the size of everything (the settings, Ctrl + / − / 0) ----------
  const zf = () => main(app, ({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getZoomFactor());
  const z0 = await zf();
  await clickText(page, '.layer .zoom-pick button', 'A+');
  await sleep(900);
  const z1 = await zf();
  const zl = await page.textContent('.layer .zoom-pick b');
  const zp1 = JSON.parse(readFileSync(join(DATA, 'preferences.json'), 'utf8')).zoom;
  await shot(page, 'settings-zoom');
  // what the window hears from the keyboard and the wheel (as Chromium reports them to the app)
  const key = (code, k) => main(app, ({ BrowserWindow }, a) => { BrowserWindow.getAllWindows()[0].webContents.emit('before-input-event', { preventDefault() {} }, { type: 'keyDown', control: true, meta: false, alt: false, key: a.k, code: a.code }); }, { code, k });
  await main(app, ({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0].webContents.emit('zoom-changed', {}, 'in'); });
  await sleep(500);
  const zw = await zf();
  await key('Minus', '-');
  await key('Digit6', '-'); // AZERTY: the « - » is on the 6
  await sleep(600);
  const z2 = await zf();
  const zl2 = await page.textContent('.layer .zoom-pick b');
  await key('Digit0', 'à'); // AZERTY: Ctrl + the « 0 » key
  await sleep(900);
  const z3 = await zf();
  const zp3 = JSON.parse(readFileSync(join(DATA, 'preferences.json'), 'utf8')).zoom;
  check('display size: « A+ » in the settings makes everything bigger and is kept; Ctrl + wheel bigger, Ctrl − smaller (AZERTY too); Ctrl 0 back to the size for this screen',
    Math.abs(z0 - 1) < 0.01 && Math.abs(z1 - 1.1) < 0.01 && /110\s%/.test(zl) && Math.abs(zp1 - 1.1) < 0.01 && Math.abs(zw - 1.2) < 0.01 && Math.abs(z2 - 1) < 0.01 && /100\s%/.test(zl2) && Math.abs(z3 - 1) < 0.01 && zp3 === undefined,
    { z0, z1, zl, zp1, zw, z2, zl2, z3, zp3 });

  // ---------- 0.27.9: a window out of the game: a real window without the system's frame, Hype's bar, live on the game ----------
  await dismiss(page);
  await closeLayers(page);
  const cid = await G(page, () => { const H = window.__hype, c = H.mains(H.S.game)[0]; H.openDM(c.id); return c.id; });
  await page.waitForSelector('.layer .win-out', { timeout: 10000 });
  const under = await G(page, () => { const L = document.querySelector('.layer .layer-panel').getBoundingClientRect(), e = document.elementFromPoint(260, 18); return { top: Math.round(L.top), bar: !!(e && e.closest('.appbar')) }; });
  check('0.27.10: the game’s windows open under Hype’s bar, never over it', under.top >= 36 && under.bar, under);
  const [kid] = await Promise.all([app.waitForEvent('window', { timeout: 15000 }), page.click('.layer .win-out')]);
  await kid.waitForSelector('.os-bar .hb-logo', { timeout: 15000 });
  await sleep(500);
  const wins1 = await main(app, ({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
  const out1 = await G(page, (id) => { const H = window.__hype; return { os: (H.S.os || []).map((l) => l.t + ':' + l.id), inGame: H.S.stack.some((l) => l.t === 'dm' && l.id === id) }; }, cid);
  const box = await kid.$('.layer-foot textarea, .reply-box textarea, textarea');
  if (box) await box.fill('coucou depuis ma fenêtre');
  await sleep(300);
  const draft = await G(page, (id) => (window.__hype.S.drafts.dm || {})[id] || '', cid);
  const kidUi = await kid.evaluate(() => ({ title: document.title, btns: [...document.querySelectorAll('.os-bar .win-btn')].map((b) => b.getAttribute('aria-label')), styled: getComputedStyle(document.querySelector('.os-bar')).backgroundImage.includes('gradient') }));
  await kid.screenshot({ path: join(OUT, 'os-window.png') });
  const gone = kid.waitForEvent('close', { timeout: 15000 });
  await kid.click('.os-bar .win-in').catch(() => {}); // (the window closes under the click: its end may not be seen)
  await gone;
  await sleep(500);
  const back1 = await G(page, (id) => { const H = window.__hype; return { os: (H.S.os || []).length, inGame: H.S.stack.some((l) => l.t === 'dm' && l.id === id), text: (document.querySelector('.layer:not(.min) textarea') || {}).value || '' }; }, cid);
  const wins2 = await main(app, ({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
  const [kid2] = await Promise.all([app.waitForEvent('window', { timeout: 15000 }), page.click('.layer .win-out')]);
  await kid2.waitForSelector('.os-bar .win-close', { timeout: 15000 });
  await G(page, (id) => window.__hype.openDM(id), cid); // (already out of the game: that window comes to the front, no second one)
  await sleep(300);
  const twice = await G(page, (id) => { const H = window.__hype; return { os: (H.S.os || []).length, inGame: H.S.stack.some((l) => l.t === 'dm' && l.id === id) }; }, cid);
  const gone2 = kid2.waitForEvent('close', { timeout: 15000 });
  await kid2.click('.os-bar .win-close').catch(() => {});
  await gone2;
  await sleep(400);
  const shut = await G(page, (id) => { const H = window.__hype; return { os: (H.S.os || []).length, open: H.S.stack.some((l) => l.t === 'dm' && l.id === id) }; }, cid);
  check('« Sortir du jeu »: the conversation becomes a real window (no system frame, Hype’s bar: back in the game, reduce, enlarge, close), live on the game (what is typed there is the game’s draft); « Remettre dans le jeu » brings it back as it was; its ✕ closes it',
    wins1 === 2 && out1.os.length === 1 && !out1.inGame && /coucou depuis ma fenêtre/.test(draft) && kidUi.btns.length === 4 && kidUi.styled && /Hype/.test(kidUi.title)
      && back1.os === 0 && back1.inGame && /coucou depuis ma fenêtre/.test(back1.text) && wins2 === 1 && twice.os === 1 && !twice.inGame && shut.os === 0 && !shut.open, { wins1, out1, draft, kidUi, back1, wins2, twice, shut });
  // a save loaded (the game entered again): its windows out of the game close with the game they showed
  await G(page, (id) => window.__hype.openDM(id), cid);
  await page.waitForSelector('.layer .win-out', { timeout: 10000 });
  const [kid3] = await Promise.all([app.waitForEvent('window', { timeout: 15000 }), page.click('.layer .win-out')]);
  await kid3.waitForSelector('.os-bar .hb-logo', { timeout: 15000 });
  const gone3 = kid3.waitForEvent('close', { timeout: 15000 });
  await G(page, () => { const H = window.__hype; H.enterGame(H.S.game, { tab: 'feed', hot: true }); });
  await gone3;
  await sleep(400);
  const reload = await G(page, () => ({ os: (window.__hype.S.os || []).length, stack: window.__hype.S.stack.length }));
  const wins3 = await main(app, ({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
  check('a save loaded: the windows out of the game close with the game they showed', reload.os === 0 && reload.stack === 0 && wins3 === 1, { reload, wins3 });
  // 0.27.10, the PC app: no window inside the game any more; its bar dragged, it is a real window at once, following the mouse
  await G(page, (id) => window.__hype.openDM(id), cid);
  await page.waitForSelector('.layer .layer-head.movable', { timeout: 10000 });
  const noIn = await G(page, () => { const o = document.querySelector('.layer .win-out'); return { float: !!document.querySelector('.layer .win-float'), out: o ? o.getAttribute('aria-label') : '' }; });
  const hd = await G(page, () => { const r = document.querySelector('.layer .layer-head .who, .layer .layer-head h2').getBoundingClientRect(); return { x: Math.round(r.left + 20), y: Math.round(r.top + r.height / 2) }; });
  await page.mouse.move(hd.x, hd.y);
  await page.mouse.down();
  const [kid6] = await Promise.all([app.waitForEvent('window', { timeout: 15000 }), (async () => { for (let k = 1; k <= 6; k++) { await page.mouse.move(hd.x + 12 * k, hd.y + 6 * k); await sleep(40); } })()]);
  await kid6.waitForSelector('.os-bar', { timeout: 15000 });
  await page.mouse.up();
  await sleep(500);
  const torn = await G(page, (id) => { const H = window.__hype; return { os: (H.S.os || []).map((l) => l.t + ':' + l.id), inGame: H.S.stack.some((l) => l.t === 'dm' && l.id === id), profile: H.S.stack.some((l) => l.t === 'char') }; }, cid);
  const wins6 = await main(app, ({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
  check('0.27.10, the PC app: no window inside the game (no « Détacher » that floats inside); dragging its bar makes it a real window at once, which follows the mouse; the drag opens no profile',
    !noIn.float && noIn.out === 'Détacher la fenêtre' && torn.os.length === 1 && !torn.inGame && !torn.profile && wins6 === 2, { noIn, torn, wins6 });
  const gone6 = kid6.waitForEvent('close', { timeout: 15000 });
  await kid6.click('.os-bar .win-close').catch(() => {});
  await gone6;
  await sleep(300);
  // the post being written, out of the game: « Publier » there publishes it, and its window closes
  await compose(page);
  await page.waitForSelector('.layer .win-out', { timeout: 10000 });
  const [kid4] = await Promise.all([app.waitForEvent('window', { timeout: 15000 }), page.click('.layer .win-out')]);
  await kid4.waitForSelector('#compose', { timeout: 15000 });
  const mine0 = await G(page, () => window.__hype.S.game.posts.filter((x) => x.a === 'p').length);
  await kid4.focus('#compose');
  await kid4.keyboard.type('@za');
  await sleep(500);
  const ment = await kid4.evaluate(() => [...document.querySelectorAll('.mention-list [role=option] .mo-h')].map((x) => x.textContent));
  await kid4.fill('#compose', 'écrit dans ma fenêtre à part');
  await sleep(300);
  const gone4 = kid4.waitForEvent('close', { timeout: 15000 });
  await kid4.locator('.layer-head button', { hasText: 'Publier' }).first().click().catch(() => {});
  await gone4;
  await sleep(1000);
  await idle(page);
  await sleep(1000);
  await dismiss(page);
  const pub = await G(page, () => { const H = window.__hype, mine = H.S.game.posts.filter((x) => x.a === 'p'); return { n: mine.length, text: (mine.find((x) => /fenêtre à part/.test(x.text)) || {}).text, os: (H.S.os || []).length, compose: H.S.stack.some((l) => l.t === 'compose') }; });
  const wins4 = await main(app, ({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
  check('the post being written, out of the game: « @ » suggests who to mention there; « Publier » there publishes it, and its window closes', ment.includes('@zara.vey') && pub.n === mine0 + 1 && /écrit dans ma fenêtre à part/.test(pub.text || '') && pub.os === 0 && !pub.compose && wins4 === 1, { ment, mine0, pub, wins4 });
  // a question asked from a window out of the game (deleting that post): answered in the game's window, it closes that window, not the game's
  const pid = await G(page, () => { const p = window.__hype.S.game.posts.find((x) => x.a === 'p' && /fenêtre à part/.test(x.text)); return p ? p.id : null; });
  await G(page, (id) => { const H = window.__hype; H.openLayer({ t: 'settings' }); H.openPost(id); }, pid);
  await page.waitForSelector('.layer .win-out', { timeout: 10000 });
  const [kid5] = await Promise.all([app.waitForEvent('window', { timeout: 15000 }), page.locator('.layer .win-out').last().click()]);
  await kid5.waitForSelector('.os-bar', { timeout: 15000 });
  await kid5.locator('button', { hasText: 'Supprimer' }).first().click();
  await page.waitForSelector('.modal .modal-title', { timeout: 10000 });
  await sleep(600);
  const gone5 = kid5.waitForEvent('close', { timeout: 15000 });
  await page.locator('.modal .btn', { hasText: 'Supprimer' }).first().click();
  await gone5;
  await sleep(500);
  const asked = await G(page, (id) => { const H = window.__hype; return { deleted: !H.S.game.posts.some((x) => x.id === id), os: (H.S.os || []).length, stack: H.S.stack.map((l) => l.t) }; }, pid);
  check('a question asked from a window out of the game is answered in the game; what it closes is that window', !!pid && asked.deleted && asked.os === 0 && asked.stack.join(',') === 'settings', { pid, asked });
  await closeLayers(page);
  await closeLayers(page);

  // ---------- a model that refuses the reasoning option: asked again without it ----------
  await main(app, () => globalThis.__hypeFake.failNext({ code: 'invalid_request', status: 400, param: 'reasoning.effort', message: 'unsupported' }));
  const n0 = await main(app, () => globalThis.__hypeFake.calls.length);
  await tab(page, 'Fil');
  await sleep(300);
  await post(page, 'qui vient réviser les potions ce soir ?');
  await sleep(6000);
  await idle(page);
  await sleep(3000);
  await dismiss(page);
  const calls1 = (await main(app, () => globalThis.__hypeFake.calls.slice())).slice(n0);
  const st2 = await G(page, () => { const g = window.__hype.S.game; const mine = g.posts.filter((x) => x.a === 'p'); return { mine: mine.length, last: !!(mine[0] && mine[0].res) }; });
  check('the chosen model is used; refused reasoning option → same request again without it, the post still answered', calls1.length >= 2 && calls1[0].model === 'gpt-test-pro' && calls1[0].effort === 'low' && calls1[1].model === 'gpt-test-pro' && calls1[1].effort === null && st2.last, { calls1, st2 });

  // ---------- the plan's usage limit: « Gérer l’usage » first ----------
  await main(app, () => globalThis.__hypeFake.failNext({ code: 'subscription_sharing_usage_limit_exceeded', status: 429, message: 'limit' }));
  await post(page, 'dernier post avant le couvre-feu');
  await page.waitForSelector('.host-modal', { timeout: 15000 });
  await sleep(300);
  await shot(page, 'usage-limit');
  const lim = await G(page, () => ({ title: document.querySelector('.host-modal .modal-title').textContent, first: document.querySelector('.host-modal .btn').textContent }));
  await page.click('.host-modal .btn-hot');
  await sleep(300);
  const opened = await main(app, () => globalThis.__hypeOpened || []);
  check('usage limit: a clear message, « Gérer l’usage » as the main action, it opens ChatGPT’s usage settings', /Limite d’usage atteinte/.test(lim.title) && /Gérer l’usage/.test(lim.first) && opened.includes('https://chatgpt.com/settings/usage'), { lim, opened });
  await idle(page);
  await dismiss(page);
  await closeLayers(page);

  // ---------- 0.14: a thumbnail drawn, finished by ChatGPT (« Sans limite » only); a connection that cannot: the sketch stays ----------
  const SKETCH = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
  const img1 = await G(page, async (sk) => {
    const H = window.__hype, g = H.S.game, b = g.budget, d0 = b.daily;
    b.daily = 60; const limited = H.canAiThumb(g);
    b.daily = 0; const unlimited = H.canAiThumb(g);
    b.daily = d0;
    const res = await window.hypeHost.aiImage({ id: 'img-test-1', prompt: 'Miniature de vidéo : test', sketch: sk });
    return { limited, unlimited, ok: res.ok, url: res.ok ? res.dataUrl.slice(0, 30) : res.error };
  }, SKETCH);
  const imgCalls = await main(app, () => globalThis.__hypeFake.images.slice());
  await main(app, () => globalThis.__hypeFake.failNext({ code: 'subscription_sharing_unsupported_capability', status: 400, message: 'unsupported' }));
  const img2 = await G(page, async (sk) => { const res = await window.hypeHost.aiImage({ id: 'img-test-2', prompt: 'Miniature', sketch: sk }); return res.ok ? 'ok' : res.error.code; }, SKETCH);
  check('a drawn thumbnail can be finished by ChatGPT, only without a daily limit: the bridge sends the prompt and the sketch, an image comes back; a connection that cannot create images says so (the game keeps the sketch)',
    img1.limited === false && img1.unlimited === true && img1.ok === true && /^data:image\/jpeg;base64,/.test(img1.url) && imgCalls.length === 1 && imgCalls[0].sketch && imgCalls[0].model === 'gpt-test-pro' && img2 === 'image_unsupported', { img1, imgCalls, img2 });

  // ---------- export, then import as a new game ----------
  await main(app, (_electron, dir) => { globalThis.__hypeSaveDir = dir; }, EXPORTS);
  await settings(page);
  await clickText(page, '.layer .section button', 'Exporter');
  await sleep(800);
  const exported = readdirSync(EXPORTS).filter((f) => f.endsWith('.json'));
  const file = exported.length ? JSON.parse(readFileSync(join(EXPORTS, exported[0]), 'utf8')) : null;
  check('export: one JSON file (« hype-partie »), named after the world and the player, with the player’s photo inside', exported.length === 1 && /^hype-academie-lumen-mila-flux\.json$/.test(exported[0]) && file.format === 'hype-partie' && file.core.id === st0.id && file.feed.posts.length >= 3
    && !!file.media && Object.keys(file.media).join() === st1.own[0] && /^data:image\//.test(file.media[st1.own[0]]), { exported, media: file && file.media ? Object.keys(file.media) : null });
  await clickText(page, '.layer .section button', 'Mes parties');
  await page.waitForSelector('.save-wrap');
  await main(app, (_electron, f) => { globalThis.__hypeOpenFile = f; }, join(EXPORTS, exported[0]));
  await clickText(page, 'button', 'Importer une partie');
  await page.waitForFunction(() => window.__hype.S.games.length === 2, null, { timeout: 10000 });
  await sleep(600);
  await shot(page, 'home-imported');
  const imp = await G(page, () => window.__hype.S.games.map((x) => ({ id: x.id, world: x.world, name: x.name })));
  check('import: the file comes back as a second game, with its own id', imp.length === 2 && imp.every((x) => x.world === 'Académie Lumen' && x.name === 'Mila Flux') && imp[0].id !== imp[1].id && imp.some((x) => x.id === st0.id), imp);
  const other = imp.find((x) => x.id !== st0.id);
  await page.locator('.save-wrap').filter({ hasText: 'Académie Lumen' }).first().locator('.save').click();
  await page.waitForSelector('.post', { timeout: 15000 });
  const opened2 = await G(page, () => ({ id: window.__hype.S.game.id, posts: window.__hype.S.game.posts.length }));
  const pm2 = readdirSync(base).filter((f) => /^pm_/.test(f));
  check('the imported game opens with its whole feed; its photo is a copy of its own', opened2.posts >= 3 && [st0.id, other.id].includes(opened2.id) && pm2.length === 2, { opened2, pm2 });
  await dismiss(page);

  // ---------- sign out: the game asks to reconnect, without a second welcome ----------
  await settings(page);
  await clickText(page, '.layer .gpt-settings button', 'Se déconnecter');
  await sleep(600);
  await tab(page, 'Fil');
  await post(page, 'test sans connexion');
  const toastEl = page.locator('.toast', { hasText: 'Connecte-toi à ChatGPT' });
  await toastEl.waitFor({ timeout: 15000 });
  await shot(page, 'signed-out-toast');
  const signIns0 = await main(app, () => globalThis.__hypeFake.signIns);
  await toastEl.locator('button').click();
  await page.waitForFunction(() => window.__hype.S.host.session && window.__hype.S.host.session.sharing, null, { timeout: 10000 });
  await sleep(500);
  const back = await G(page, () => ({ modal: !!document.querySelector('.host-modal') }));
  const signIns1 = await main(app, () => globalThis.__hypeFake.signIns);
  check('signed out: an AI action says to reconnect, « Se connecter » signs in again, no second welcome', signIns1 === signIns0 + 1 && !back.modal, { signIns0, signIns1, back });
  await idle(page);

  // ---------- 0.9.2: the characters see the player's images (ticked, AI images only) ----------
  await tab(page, 'Fil');
  await compose(page);
  await page.waitForSelector('#compose');
  await clickText(page, '.layer .ideas button', 'Photo');
  await page.setInputFiles('.layer .pics-box input[type=file]', { name: 'perso.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForSelector('.layer .see-box', { timeout: 10000 });
  const seeTxt = await page.textContent('.layer .see-box');
  await page.check('.layer .see-box input');
  await page.fill('#compose', 'mon perso à la plage');
  await shot(page, 'compose-see-images');
  const nSee = await main(app, () => globalThis.__hypeFake.calls.length);
  await clickText(page, '.layer-head button', 'Publier');
  await sleep(6000);
  await idle(page);
  await sleep(3000);
  await dismiss(page);
  const callsSee = (await main(app, () => globalThis.__hypeFake.calls.slice())).slice(nSee);
  const seePost = await G(page, () => { const g = window.__hype.S.game; const p = g.posts.filter((x) => x.a === 'p').sort((a, b) => b.ts - a.ts)[0]; return { see: p.photo && p.photo.see, desc: p.photo && p.photo.desc, replies: p.replies.length }; });
  check('ticked « Les persos voient ces images » (AI images only, said so): the image goes to ChatGPT with the post (JPEG, low detail), what it saw is kept',
    /Images générées par IA uniquement/.test(seeTxt) && /envoyées à ChatGPT/.test(seeTxt) && callsSee.length >= 1 && callsSee[0].imgs === 1 && callsSee[0].imgOk && callsSee[0].seen && !callsSee[0].img && seePost.see === 1 && /néons/.test(seePost.desc || '') && seePost.replies >= 1, { seeTxt, callsSee: callsSee.slice(0, 2), seePost });

  // ---------- 0.10: at Ultime, the network lives on its own in the app (while the player plays) ----------
  await closeLayers(page);
  await dismiss(page);
  const nLive = await main(app, () => globalThis.__hypeFake.calls.length);
  // 0.23.1: it pauses when Hype is not in front of the player, or after 3 minutes without a touch (__hypeFocus: the window's focus, for the test)
  const due0 = await G(page, () => { const H = window.__hype, g = H.S.game; window.__hypeFocus = true; g.opts.intensity = 'normal'; H.S.lastInputAt = Date.now(); g.lastRefreshAt = Date.now() - 5 * 60000; return H.autoLiveDue(g, Date.now()); });
  const paused = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    g.opts.intensity = 'ultime'; g.lastRefreshAt = t - 7 * 60000;
    window.__hypeFocus = false; H.S.lastInputAt = t;
    const away = [H.livePause(t), H.autoLiveDue(g, t)];
    window.__hypeFocus = true; H.S.lastInputAt = t - 4 * 60000;
    const idle = [H.livePause(t), H.autoLiveDue(g, t)];
    return { away, idle, ms: H.intensityOf(g).liveMs, before: (H.budgetOf(g).today || {}).auto || 0 };
  });
  await G(page, () => { const H = window.__hype; H.S.lastInputAt = Date.now(); }); // (back: Ultime's pace is every 5 minutes, the last one was 7 minutes ago)
  await page.waitForFunction(() => window.__hype.S.game.lastRefreshAt > Date.now() - 60000, null, { timeout: 15000 }).catch(() => {});
  await idle(page);
  await sleep(800);
  const live = (await main(app, () => globalThis.__hypeFake.calls.slice())).slice(nLive);
  const again = await G(page, () => window.__hype.autoLiveDue(window.__hype.S.game, Date.now()));
  const used = await G(page, () => { const H = window.__hype, g = H.S.game; return { auto: (H.budgetOf(g).today || {}).auto || 0, line: (document.querySelector('.live-line') || {}).textContent || '' }; });
  await G(page, () => { window.__hype.S.game.opts.intensity = 'normal'; });
  check('Ultime in the app: the network refreshes on its own while the player plays (not at Normal, not twice in a row); paused when Hype is not in front or after 3 minutes without a touch; its cafés counted apart',
    due0 === false && paused.away[0] === 'away' && paused.away[1] === false && paused.idle[0] === 'idle' && paused.idle[1] === false && paused.ms === 5 * 60000
      && live.length >= 1 && again === false && used.auto > paused.before && /Le réseau vit tout seul/.test(used.line), { due0, paused, live: live.length, again, used });

  // ---------- dark mode ----------
  await page.emulateMedia({ colorScheme: 'dark' });
  await settings(page);
  // 0.19: in the app, the level's two settings (0.23.1: four steps each): « Les commentaires » and « Le réseau vit tout seul »;
  // and where the cafés went
  await G(page, () => { const el = document.querySelector('.layer .int-settings'); if (el) el.scrollIntoView({ block: 'center' }); });
  await sleep(300);
  await shot(page, 'settings-switches-dark');
  const sws = await G(page, () => [...document.querySelectorAll('.layer .int-settings .int-set')].map((c) => ({ b: c.querySelector('.lbl').textContent, on: (c.querySelector('.seg button.on') || {}).textContent || '', opts: [...c.querySelectorAll('.seg button')].map((x) => x.textContent), small: c.querySelector('small').textContent })));
  await page.locator('.layer .int-settings .int-set', { hasText: 'Le réseau vit tout seul' }).locator('.seg button', { hasText: /^Normal$/ }).click();
  await sleep(250);
  const swLive = await G(page, () => { const H = window.__hype, g = H.S.game; return { opt: g.opts.live, on: H.autoLiveOn(g), ms: H.intensityOf(g).liveMs, small: [...document.querySelectorAll('.layer .int-settings .int-set small')].map((x) => x.textContent).pop() }; });
  await G(page, () => { const H = window.__hype; H.setOpt(H.S.game, 'live', 'off'); delete H.S.game.opts.live; H.update(); });
  const uses = await G(page, () => [...document.querySelectorAll('.layer .cafe-uses li')].map((li) => li.textContent));
  await G(page, () => { const el = document.querySelector('.layer .cafe-uses'); if (el) el.scrollIntoView({ block: 'center' }); });
  await sleep(300);
  await shot(page, 'settings-cafes-dark');
  check('in the app, the level has its two settings in four steps; « Le réseau vit tout seul » at Normal: every 8 minutes, with what it costs per hour and when it pauses; where the cafés went today',
    sws.length === 2 && /Les commentaires/.test(sws[0].b) && /Le réseau vit tout seul/.test(sws[1].b) && sws[1].on === 'Coupé' && sws[1].opts.join('|') === 'Coupé|Doux|Normal|À fond'
      && swLive.opt === 'normal' && swLive.on && swLive.ms === 8 * 60000 && /☕ \/ heure/.test(swLive.small) && /pause/.test(swLive.small)
      && uses.some((x) => /Le réseau vit tout seul/.test(x)) && uses.some((x) => /☕/.test(x)), { sws, swLive, uses });
  await G(page, () => { const el = document.querySelector('.layer .gpt-settings'); if (el) el.scrollIntoView({ block: 'center' }); });
  await sleep(300);
  await shot(page, 'settings-dark');
  await app.close();

  // ---------- restart: the games are still there ----------
  ({ app, page } = await launch());
  await page.waitForFunction(() => window.__hype.S.games.length === 2, null, { timeout: 15000 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await sleep(500);
  await shot(page, 'restart-home-dark');
  check('after a restart, both games are still on the computer', (await G(page, () => window.__hype.S.games.length)) === 2);

  // ---------- the creator's atelier: photos kept on this computer, the pack exported as one file ----------
  await page.emulateMedia({ colorScheme: 'light' });
  for (let k = 0; k < 7; k++) { await page.click('.app-version'); await sleep(90); }
  await clickText(page, 'button', 'Atelier photos');
  await page.waitForSelector('.atelier');
  await clickText(page, '.at-add button', 'Homme');
  await page.waitForSelector('.at-person');
  await page.setInputFiles('.at-person .at-ph-head input[type=file]', { name: 'portrait.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForSelector('.at-portrait img');
  await page.setInputFiles('.at-drop input[type=file]', [{ name: 'sport-ete.png', mimeType: 'image/png', buffer: PNG }, { name: 'soiree.png', mimeType: 'image/png', buffer: PNG }]);
  await page.waitForFunction(() => document.querySelectorAll('.at-photo img').length === 2, null, { timeout: 15000 });
  await page.fill('.at-photo >> nth=0 >> .at-desc textarea', 'Tenue de sport, casque sur les oreilles, regard déterminé en pleine course.');
  await page.fill('.at-photo >> nth=0 >> .tag-in', 'déterminé');
  await page.press('.at-photo >> nth=0 >> .tag-in', 'Enter');
  await page.fill('.at-profile textarea', 'Accro au sport et aux jeux vidéo, compétitif, rigolo.');
  await sleep(1200);
  await shot(page, 'atelier');
  const docs = readdirSync(base).filter((f) => /^pk_/.test(f));
  await main(app, (_electron, dir) => { globalThis.__hypeSaveDir = dir; }, EXPORTS);
  await clickText(page, '.at-pack button', 'Exporter le pack');
  await page.waitForFunction(() => [...document.querySelectorAll('.toast')].some((t) => /Pack exporté/.test(t.textContent)), null, { timeout: 15000 });
  const packFile = readdirSync(EXPORTS).find((f) => /^hype-pack-photos-.*\.json$/.test(f));
  const pack = packFile ? JSON.parse(readFileSync(join(EXPORTS, packFile), 'utf8')) : null;
  check('the atelier (creator mode) keeps its photos as files on this computer and exports the pack as one file', docs.includes('pk_meta.json') && docs.filter((f) => /^pk_img_/.test(f)).length === 3
    && pack && pack.format === 'hype-pack' && pack.v === 2 && pack.people.length === 1 && pack.people[0].g === 'm' && /compétitif/.test(pack.people[0].profile) && pack.people[0].photos.length === 2
    && pack.people[0].photos[0].tags.join() === 'sport,déterminé' && /casque/.test(pack.people[0].photos[0].desc) && /^data:image\/webp/.test(pack.people[0].photos[0].img), { docs, packFile, tags: pack && pack.people[0].photos[0].tags });
  // 0.27.1: the creator's older copy of a shipped face takes in the shipped version (its images read by the app itself)
  if (existsSync(shipped)) {
    const all = JSON.parse(readFileSync(shipped, 'utf8')).people, want = all.find((p) => p.photos.length >= 2);
    const sync = await G(page, async (w) => {
      const H = window.__hype, ph = w.photos[0];
      const r = await fetch('pack/' + ph.file).catch(() => null);
      if (!r || !r.ok) return { fetched: false };
      const b = await r.blob(), data = await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); });
      const meta = (await H.Store.read('pk_meta')) || { v: 2, people: [] };
      meta.people.push({ id: w.id, g: w.g, style: w.style || 'moderne', label: w.label, look: '', profile: '', portrait: null, photos: [{ id: ph.id, season: 'all', moment: 'all', set: '', tags: ['ancien'], desc: 'ancien' }], next: 2 });
      await H.Store.write('pk_img_' + ph.id, { data });
      await H.Store.write('pk_meta', meta);
      await H.loadAtelier();
      const L = H.S.atelier.meta.people.find((x) => x.id === w.id), E = JSON.parse(await H.packExportText()).people.find((x) => x.id === w.id);
      return { fetched: true, n: L ? L.photos.length : 0, files: L ? L.photos.filter((x) => x.file).length : 0, people: H.S.atelier.meta.people.length, exported: E ? E.photos.filter((x) => /^data:image\//.test(x.img)).length : 0 };
    }, want);
    check('the creator’s older copy of a shipped face takes in the shipped version (all its photos, the other shipped faces too), and its export carries the shipped images', sync.fetched && sync.n === want.photos.length && sync.files === want.photos.length && sync.people === 1 + all.length && sync.exported === want.photos.length, sync);
  }
  await app.close();

  // ---------- 0.28: an Æ Games Launcher session: the game's achievements reach its backend (here, a stand-in) ----------
  {
    const { createServer } = await import('node:https');
    const { execFileSync } = await import('node:child_process');
    const keyF = join(OUT, 'ae-key.pem'), crtF = join(OUT, 'ae-cert.pem');
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyF, '-out', crtF, '-days', '2', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost'], { stdio: 'ignore' });
    const hits = [], fail = new Set(), hang = new Set();
    const srv = createServer({ key: readFileSync(keyF), cert: readFileSync(crtF) }, (req, res) => {
      let b = '';
      req.on('data', (d) => { b += d; });
      req.on('end', () => {
        let body = null;
        try { body = JSON.parse(b); } catch (e) { body = null; }
        const k = body && body.p_achievement_key;
        hits.push({ at: Date.now(), url: req.url, method: req.method, headers: req.headers, body });
        if (fail.has(k)) { fail.delete(k); res.writeHead(503); res.end('{}'); return; }
        if (hang.has(k)) return; // (never answered: the way out must not wait for it)
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([{ achievement_key: k, progress: body && body.p_value, newly_unlocked: true, idempotent: false }]));
      });
    });
    await new Promise((r) => srv.listen(0, '127.0.0.1', r));
    const TOKEN = 'c0ffee'.repeat(10) + 'beef', KEY = 'sb_publishable_E2eLauncherKey2026';
    const of = (key, op) => hits.filter((h) => h.body && h.body.p_achievement_key === key && (!op || h.body.p_operation === op));
    const waitHit = async (key, n = 1, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end && of(key).length < n) await sleep(200); return of(key).length >= n; };
    ({ app, page } = await launch({ AE_GAMES_GAME_ID: 'hype', AE_GAMES_SUPABASE_URL: `https://localhost:${srv.address().port}`, AE_GAMES_SUPABASE_KEY: KEY, AE_GAMES_ACHIEVEMENT_TOKEN: TOKEN, AE_GAMES_ACHIEVEMENT_EXPIRES_AT: new Date(Date.now() + 3600000).toISOString() }));
    await main(app, ({ session }) => { session.defaultSession.setCertificateVerifyProc((req, cb) => cb(req.hostname === 'localhost' ? 0 : -3)); }); // (the stand-in's own certificate)
    const envLeft = await main(app, () => ['AE_GAMES_ACHIEVEMENT_TOKEN', 'AE_GAMES_SUPABASE_KEY'].filter((k) => process.env[k]));
    const version = await main(app, ({ app: a }) => a.getVersion());
    const [id1, id2] = await G(page, () => window.__hype.S.games.map((x) => x.id));
    await G(page, (id) => window.__hype.openGame(id), id1);
    await page.waitForSelector('.post', { timeout: 20000 });
    await dismiss(page);
    // a first crush, by the game's own rules (its clock reads it)
    await G(page, () => { const H = window.__hype, g = H.S.game, c = H.mains(g).find((x) => x.unlocked) || H.mains(g)[0]; c.vibe = 'crush'; });
    await page.waitForFunction(() => window.__hype.achGot(window.__hype.S.game, 'first-crush'), null, { timeout: 15000 });
    await waitHit('first-crush');
    await waitHit('gaining-traction');
    const fol = await G(page, () => Math.round(window.__hype.S.game.stats.followers));
    const crush = of('first-crush', 'unlock')[0], trac = of('gaining-traction', 'set')[0];
    const b = crush && crush.body;
    check('a launcher session: its backend gets the game’s first crush (« unlock », p_value null) and the followers’ total (« set »), with the ticket and the public key as the contract says, the game version and the game as metadata',
      !!(crush && trac) && crush.method === 'POST' && crush.url === '/rest/v1/rpc/record_hype_achievement_event' && crush.headers.apikey === KEY && /application\/json/.test(crush.headers['content-type']) && !crush.headers.authorization
        && b.p_session_token === TOKEN && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(b.p_event_id) && b.p_operation === 'unlock' && b.p_value === null && !Number.isNaN(Date.parse(b.p_client_occurred_at))
        && JSON.stringify(b.p_metadata) === JSON.stringify({ gameVersion: version, saveId: id1 }) && of('gaining-traction', 'set').some((h) => h.body.p_value === fol),
      { crush: b && { ...b, p_session_token: b.p_session_token === TOKEN ? '(the ticket)' : 'WRONG' }, trac: trac && trac.body.p_value, fol, n: hits.length });
    // the ticket and the key: in the main process's memory only (not in its environment, the page, the game's files)
    const page1 = await G(page, ([t, k]) => { const all = document.documentElement.outerHTML + JSON.stringify(Object.assign({}, localStorage)) + JSON.stringify(Object.keys(window.hypeHost || {})); return all.includes(t) || all.includes(k); }, [TOKEN, KEY]);
    const filesWith = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? filesWith(join(dir, e.name)) : [join(dir, e.name)])).filter((f) => { try { const x = readFileSync(f, 'latin1'); return x.includes(TOKEN) || x.includes(KEY); } catch (e) { return false; } });
    await G(page, () => window.__hype.saveNow && window.__hype.saveNow());
    await sleep(800);
    const leaked = filesWith(DATA);
    check('the ticket and the key stay in the main process’s memory: out of its environment once read, never in the page, its storage or the game’s files', envLeft.length === 0 && !page1 && leaked.length === 0, { envLeft, page1, leaked });
    // a network failure: the same event again, later
    fail.add('living-legend');
    await G(page, () => window.__hype.unlockAch(window.__hype.S.game, 'living-legend'));
    await waitHit('living-legend', 2, 12000);
    const ll = of('living-legend');
    check('an answer 503: the same event is sent again a few seconds later, with the same id', ll.length === 2 && ll[0].body.p_event_id === ll[1].body.p_event_id && ll[1].at - ll[0].at >= 1800, ll.map((h) => ({ id: h.body.p_event_id, at: h.at - ll[0].at })));
    // a game changed by hand (the palette) keeps its achievements to itself
    await G(page, () => window.__hype.leaveGame && window.__hype.leaveGame());
    await sleep(800);
    await G(page, (id) => window.__hype.openGame(id), id2);
    await page.waitForSelector('.post', { timeout: 20000 });
    await dismiss(page);
    await sleep(5000); // (its first look: what it has goes to the launcher)
    const sync2 = hits.filter((h) => h.body && (h.body.p_metadata || {}).saveId === id2).length;
    const n0 = hits.length;
    const boss2 = await G(page, () => { const H = window.__hype, g = H.S.game; H.paletteApply(g, { gems: g.stats.gems + 1 }); return H.unlockAch(g, 'the-boss') && H.achGot(g, 'the-boss'); });
    await sleep(5000);
    const after = hits.slice(n0).filter((h) => h.body && (h.body.p_metadata || {}).saveId === id2);
    check('a game changed by hand (the palette): its achievements stay in the game (« Le boss » unlocked), nothing more goes to the launcher', sync2 > 0 && boss2 && after.length === 0, { sync2, boss2, after: after.map((h) => h.body.p_achievement_key) });
    // the way out: what waits is sent, two seconds at most (the backend here never answers)
    await G(page, () => window.__hype.leaveGame && window.__hype.leaveGame());
    await sleep(800);
    await G(page, (id) => window.__hype.openGame(id), id1);
    await page.waitForSelector('.post', { timeout: 20000 });
    fail.add('married'); hang.add('married');
    await G(page, () => window.__hype.unlockAch(window.__hype.S.game, 'married'));
    await waitHit('married', 1, 10000);
    const t0 = Date.now();
    await app.close();
    const took = Date.now() - t0;
    check('quitting: the event still waiting goes out at once, and the app never waits more than two seconds for it', of('married').length === 2 && took < 4500, { tries: of('married').length, took });
    srv.closeAllConnections(); srv.close();
  }

  // ---------- the real SDK (no fake): the app starts and offers to connect ----------
  ({ app, page } = await launch({ HYPE_FAKE_AI: '0', HYPE_DATA_DIR: mkdtempSync(join(OUT, 'real-')) }));
  await page.waitForSelector('.gpt-btn', { timeout: 15000 });
  await sleep(500);
  await shot(page, 'real-sdk-home');
  const real = await G(page, () => ({ btn: document.querySelector('.gpt-btn').textContent, session: window.__hype.S.host.session, panel: document.querySelector('.gpt-panel').textContent }));
  // a Linux machine without a desktop keyring (like this test box) cannot store the connection: the app says so plainly
  const noKeyring = real.session && real.session.error && real.session.error.code === 'storage_encryption_unavailable';
  check('with OpenAI’s real SDK: the app starts, offers « Continuer avec ChatGPT » (and explains a missing keyring)', /Continuer avec ChatGPT/.test(real.btn) && real.session && (real.session.status === 'disconnected' || (noKeyring && /trousseau du système indisponible/.test(real.panel))), real);
  await app.close();
} catch (e) {
  console.error('FAILED', e);
  if (lastPage) await lastPage.screenshot({ path: join(OUT, 'fail.png') }).catch(() => {});
  errors.push('[test] ' + (e && e.message ? e.message.split('\n')[0] : String(e)));
}
console.log('\nCHECKS', checks.filter((c) => c[0]).length + '/' + checks.length);
for (const c of checks.filter((x) => !x[0])) console.log('  FAIL', c[1]);
console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
process.exit(checks.every((c) => c[0]) && !errors.length ? 0 : 1);
