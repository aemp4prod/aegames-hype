// Hype for ChatGPT: the desktop app. The game page runs sandboxed; this main process owns the ChatGPT
// connection (OpenAI's Sign in with ChatGPT SDK), the game files and the file dialogs.
import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, safeStorage, screen, session, shell } from 'electron';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createChatGPT, CHATGPT_USAGE_URL } from './vendor/siwc-local/dist/index.js';
import { createCredentialEncryption } from './lib/credential-encryption.mjs';
import { GameStore } from './lib/store.mjs';
import { AiRunner } from './lib/ai.mjs';
import { readConfig as achConfig, createAchievementService, httpTransport } from './lib/achievements.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const RENDERER = join(ROOT, 'renderer');
const ORIGIN = 'hype://app';
const TEST = process.env.HYPE_TEST === '1';
const FAKE = TEST && process.env.HYPE_FAKE_AI === '1'; // simulated ChatGPT, for the automated tests only

app.setName('Hype');
if (process.env.HYPE_DATA_DIR) app.setPath('userData', resolve(process.env.HYPE_DATA_DIR));
protocol.registerSchemesAsPrivileged([{ scheme: 'hype', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
if (!app.requestSingleInstanceLock()) app.exit(0);

let win = null;
// 0.27.9: the windows the player takes out of the game: real windows of the system, without its frame (the game draws
// Hype's own bar in them), moved anywhere, a second screen too. The game page fills them from inside (same game, same
// state): they load nothing and run nothing of their own, and they close with the game.
const kids = new Map();
const KID_NAME = /^hypewin-[a-z0-9]{1,40}$/i;
const kidOptions = () => ({ frame: false, show: true, minWidth: 340, minHeight: 280, autoHideMenuBar: true, title: 'Hype', icon: join(ROOT, 'build', 'icon.png'), backgroundColor: '#0f0d12',
  webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: process.platform !== 'linux', zoomFactor: win ? win.webContents.getZoomFactor() : 1 } });
const store = new GameStore(join(app.getPath('userData'), 'parties'));
const PREFS_FILE = join(app.getPath('userData'), 'preferences.json');

/* ---------- preferences: the chosen model, the welcome already shown ---------- */
let prefs = null;
async function loadPrefs() {
  if (prefs) return prefs;
  try { prefs = JSON.parse(await readFile(PREFS_FILE, 'utf8')); } catch (e) { prefs = {}; }
  if (!prefs || typeof prefs !== 'object') prefs = {};
  return prefs;
}
async function savePrefs(patch) {
  const p = await loadPrefs();
  if (patch && typeof patch === 'object') {
    if (typeof patch.model === 'string' && patch.model.length <= 200) p.model = patch.model;
    if (patch.welcomed === true) p.welcomed = true;
    if (typeof patch.zoom === 'number' && Number.isFinite(patch.zoom)) p.zoom = clampZoom(patch.zoom);
    else if (patch.zoom === null) delete p.zoom; // back to the size for this screen
  }
  await mkdir(dirname(PREFS_FILE), { recursive: true });
  await writeFile(PREFS_FILE, JSON.stringify(p), 'utf8');
  return { ...p };
}

/* ---------- the ChatGPT connection ---------- */
let chatgpt = null;
async function client() {
  if (chatgpt) return chatgpt;
  if (FAKE) {
    const { createFakeChatGPT } = await import('./test/fake-chatgpt.mjs');
    chatgpt = createFakeChatGPT();
    globalThis.__hypeFake = chatgpt;
  } else {
    chatgpt = createChatGPT({
      appName: 'Hype',
      appId: 'hype-game',
      redirectPort: 0,
      storageDir: join(app.getPath('userData'), 'chatgpt'),
      credentialEncryption: createCredentialEncryption(safeStorage, () => app.isReady()),
      openBrowser: async (url) => {
        const target = new URL(url);
        if (target.origin !== 'https://auth.openai.com') throw new Error('Unexpected sign-in destination.');
        await shell.openExternal(target.href);
      },
    });
  }
  chatgpt.subscribe((s) => send('hype:session', s));
  return chatgpt;
}
let modelCache = null; // { profileId, at, list }
async function models(c) {
  const s = await c.getSession();
  if (modelCache && modelCache.profileId === s.profileId && Date.now() - modelCache.at < 10 * 60000) return modelCache.list;
  const list = await c.listModels();
  modelCache = { profileId: s.profileId, at: Date.now(), list };
  return list;
}
async function currentModel(c) {
  const list = await models(c);
  if (!list.length) throw { code: 'no_model', message: 'no model' };
  const p = await loadPrefs();
  return (list.find((m) => m.slug === p.model) || list[0]).slug;
}
const ai = new AiRunner(client, currentModel);

/* ---------- the window ---------- */
function send(channel, payload) {
  if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) win.webContents.send(channel, payload);
}
// img-src blob: the portrait a player imports is read from a local blob before it is shrunk; connect-src 'self': the
// photo atelier reads the images shipped with the app (0.27.1), nothing else — the network goes through the main process
const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'";
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json; charset=utf-8' };
function serveApp() {
  protocol.handle('hype', async (request) => {
    const url = new URL(request.url);
    if (url.host !== 'app') return new Response('Introuvable', { status: 404 });
    const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = resolve(RENDERER, '.' + rel);
    if (!file.startsWith(RENDERER + sep)) return new Response('Introuvable', { status: 404 });
    try {
      const body = await readFile(file);
      return new Response(body, { headers: { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'content-security-policy': CSP, 'cache-control': 'no-store' } });
    } catch (e) {
      return new Response('Introuvable', { status: 404 });
    }
  });
}
/* ---------- the size of everything: Ctrl + wheel, Ctrl + / − / 0, the settings; a big screen starts bigger ---------- */
const ZOOM_MIN = 0.6, ZOOM_MAX = 2.5;
const clampZoom = (z) => Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) * 20) / 20; // steps of 5 %
// The work area in pixels of the system's own scale: a 4K screen left at 100 % is 3840 wide, and everything is tiny.
const autoZoom = () => { const w = screen.getPrimaryDisplay().workAreaSize.width; return w >= 3400 ? 1.5 : w >= 2500 ? 1.2 : 1; };
const savedZoom = () => (prefs && typeof prefs.zoom === 'number' ? clampZoom(prefs.zoom) : null);
let zoomTimer = null;
function applyZoom(z, keep = true) {
  if (!win) return;
  const v = clampZoom(z);
  win.webContents.setZoomFactor(v);
  for (const k of kids.values()) if (!k.isDestroyed()) k.webContents.setZoomFactor(v); // (0.27.9: the windows out of the game follow)
  if (keep) { prefs.zoom = v; clearTimeout(zoomTimer); zoomTimer = setTimeout(() => { savePrefs({ zoom: v }).catch(() => {}); }, 300); }
  win.webContents.send('hype:zoom', { zoom: v, auto: savedZoom() === null });
}
function resetZoom() {
  clearTimeout(zoomTimer);
  if (prefs) delete prefs.zoom;
  savePrefs({ zoom: null }).catch(() => {});
  applyZoom(autoZoom(), false);
}
// Ctrl + wheel, Ctrl +, Ctrl −, Ctrl 0: in the game and in its windows out of it (0.27.9), the same size for all.
const zoomWheel = (event, dir) => { if (win) applyZoom(win.webContents.getZoomFactor() + (dir === 'in' ? 0.1 : -0.1)); };
function zoomKeys(event, input) {
  if (!win || input.type !== 'keyDown' || !(input.control || input.meta) || input.alt) return;
  const k = input.key, c = input.code;
  if (k === '+' || k === '=' || c === 'Equal' || c === 'NumpadAdd') { event.preventDefault(); applyZoom(win.webContents.getZoomFactor() + 0.1); }
  else if (k === '-' || c === 'Minus' || c === 'NumpadSubtract') { event.preventDefault(); applyZoom(win.webContents.getZoomFactor() - 0.1); }
  else if (k === '0' || c === 'Digit0' || c === 'Numpad0') { event.preventDefault(); resetZoom(); }
}
// 0.27.10: a window torn out of the game by its bar follows the mouse (onto another screen too) until it is let go:
// the game says where its bar is held and how big it is (in the page's pixels), the app moves it under the cursor.
let follow = null;
const stopFollow = () => { if (follow) { clearInterval(follow.timer); clearTimeout(follow.end); follow = null; } };
function followKid(kid, arg) {
  stopFollow();
  if (!win || win.isDestroyed() || !kid || kid.isDestroyed()) return;
  const z = win.webContents.getZoomFactor(), n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const dx = Math.round(n(arg && arg.dx) * z), dy = Math.round(n(arg && arg.dy) * z), w = Math.round(n(arg && arg.w) * z), h = Math.round(n(arg && arg.h) * z);
  if (w >= 340 && h >= 280) { try { kid.setSize(w, h); } catch (e) { /* (closing) */ } }
  const step = () => { if (kid.isDestroyed()) { stopFollow(); return; } const p = screen.getCursorScreenPoint(); kid.setPosition(Math.round(p.x - dx), Math.round(p.y - dy)); };
  step();
  follow = { timer: setInterval(step, 15), end: setTimeout(stopFollow, 20000) }; // (letting go ends it; 20 s at most)
}
// 0.27.10: the game's own window, as Hype's bar shows it (enlarged or not, full screen, in front).
const appState = () => (win && !win.isDestroyed() ? { max: win.isMaximized(), full: win.isFullScreen(), focus: win.isFocused() } : { max: false, full: false, focus: false });
const sendAppState = () => { if (win && !win.isDestroyed()) win.webContents.send('hype:app-state', appState()); };
// While a window is out of the game, the game keeps its pace even minimized (it is the one that draws that window).
const kidsChanged = () => { if (win && !win.isDestroyed()) win.webContents.setBackgroundThrottling(kids.size === 0); };
function createWindow() {
  const z0 = savedZoom() || autoZoom(), wa = screen.getPrimaryDisplay().workAreaSize, big = Math.max(1, z0);
  win = new BrowserWindow({
    width: Math.min(Math.round(1200 * big), wa.width - 40), height: Math.min(Math.round(860 * big), wa.height - 40), minWidth: 380, minHeight: 560,
    title: 'Hype', show: false, autoHideMenuBar: true, icon: join(ROOT, 'build', 'icon.png'),
    backgroundColor: '#0f0d12',
    frame: process.platform === 'darwin', // 0.27.10: no Windows title bar: the game draws Hype's own (moved by it, resized by the edges)
    // spelling: the system's own checker on Windows and macOS (on Linux it would download dictionaries from Google: off)
    webPreferences: { preload: join(ROOT, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: process.platform !== 'linux', additionalArguments: TEST ? ['--hype-test'] : [], zoomFactor: z0 },
  });
  win.webContents.on('did-finish-load', () => applyZoom(savedZoom() || autoZoom(), false));
  for (const ev of ['maximize', 'unmaximize', 'restore', 'enter-full-screen', 'leave-full-screen', 'focus', 'blur']) win.on(ev, sendAppState); // (Hype's bar follows)
  win.webContents.on('zoom-changed', zoomWheel);
  win.webContents.on('before-input-event', zoomKeys);
  // 0.27.9: only the game's own windows (an empty page it fills itself, named by the game); nothing else ever opens
  win.webContents.setWindowOpenHandler(({ url, frameName }) => (KID_NAME.test(frameName || '') && (!url || url === 'about:blank') ? { action: 'allow', overrideBrowserWindowOptions: kidOptions() } : { action: 'deny' }));
  win.webContents.on('did-create-window', (kid, { frameName }) => {
    kids.set(frameName, kid);
    kid.setMenuBarVisibility(false);
    kid.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    kid.webContents.on('will-navigate', (event) => event.preventDefault());
    kid.webContents.setZoomFactor(win.webContents.getZoomFactor());
    kid.webContents.on('zoom-changed', zoomWheel);
    kid.webContents.on('before-input-event', zoomKeys);
    kidsChanged();
    kid.on('closed', () => { if (kids.get(frameName) === kid) kids.delete(frameName); kidsChanged(); });
  });
  win.on('close', () => { for (const k of kids.values()) if (!k.isDestroyed()) k.destroy(); kids.clear(); });
  win.webContents.on('will-navigate', (event, url) => { if (!url.startsWith(ORIGIN + '/')) event.preventDefault(); });
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { win = null; });
  win.loadURL(ORIGIN + '/index.html');
}

/* ---------- what the page may ask (and nothing else) ---------- */
function handle(channel, fn) {
  ipcMain.handle(channel, async (event, ...args) => {
    const frame = event.senderFrame;
    if (!win || event.sender !== win.webContents || !frame || !frame.url.startsWith(ORIGIN + '/')) throw new Error('refused');
    try { return await fn(event, ...args); }
    catch (e) { return { ok: false, error: { code: e && e.code ? String(e.code) : 'unexpected', message: e && e.message ? String(e.message).slice(0, 200) : '' } }; }
  });
}
const ok = (value) => ({ ok: true, value });
function registerIpc() {
  handle('hype:ai-stream', async (event, req) => {
    if (!req || typeof req.id !== 'string' || req.id.length > 80 || typeof req.prompt !== 'string' || req.prompt.length > 2_000_000) return { ok: false, error: { code: 'invalid_request' } };
    // the player's images, when the characters see them: a few small data URLs, nothing else
    const images = Array.isArray(req.images) ? req.images : [];
    if (images.length > 4 || images.some((u) => typeof u !== 'string' || u.length > 4_000_000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(u))) return { ok: false, error: { code: 'image_rejected' } };
    const sender = event.sender;
    return ai.stream({ id: req.id, prompt: req.prompt, tier: String(req.tier || 'default'), images }, (d) => { if (!sender.isDestroyed()) sender.send('hype:ai-delta', { id: req.id, d }); });
  });
  // 0.14: an image (a thumbnail the player drew, finished by the model), in the game's « Sans limite » mode
  handle('hype:ai-image', async (event, req) => {
    if (!req || typeof req.id !== 'string' || req.id.length > 80 || typeof req.prompt !== 'string' || req.prompt.length > 8000) return { ok: false, error: { code: 'invalid_request' } };
    const sketch = typeof req.sketch === 'string' && req.sketch.length < 4_000_000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(req.sketch) ? req.sketch : undefined;
    return ai.image({ id: req.id, prompt: req.prompt, sketch });
  });
  handle('hype:ai-cancel', async (event, id) => { ai.cancel(String(id)); return ok(true); });
  // 0.28: an achievement of the game (it names it; the service adds the ticket): « unlock », « set » a total, « increment »
  ipcMain.on('hype:ach', (event, op, key, value, saveId) => {
    if (!win || win.isDestroyed() || event.sender !== win.webContents) return;
    const md = /^[a-z0-9]{1,40}$/i.test(String(saveId || '')) ? { saveId: String(saveId) } : {};
    if (op === 'unlock') ach.unlock(key, md);
    else if (op === 'set') ach.setProgress(key, value, md);
    else if (op === 'increment') ach.incrementProgress(key, value, md);
  });
  // 0.27.10: Hype's bar on the game's own window: reduce, enlarge (or back), close; 'state' only answers
  handle('hype:app', async (event, act) => {
    if (!win || win.isDestroyed() || event.sender !== win.webContents) return ok(null);
    if (act === 'min') win.minimize();
    else if (act === 'max') { if (win.isFullScreen()) win.setFullScreen(false); else if (win.isMaximized()) win.unmaximize(); else win.maximize(); }
    else if (act === 'close') win.close();
    else if (act !== 'state') return ok(null);
    return ok(appState());
  });
  // 0.27.9: Hype's bar in a window out of the game: reduce, enlarge, close, bring to the front, back to the game
  handle('hype:win', async (event, name, act, arg) => {
    const kid = kids.get(String(name));
    if (act === 'game') { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } return ok(true); }
    if (!kid || kid.isDestroyed()) return ok(false);
    if (act === 'min') kid.minimize();
    else if (act === 'max') { if (kid.isMaximized()) kid.unmaximize(); else kid.maximize(); }
    else if (act === 'close') kid.close();
    else if (act === 'front') { if (kid.isMinimized()) kid.restore(); kid.show(); kid.focus(); }
    else if (act === 'follow') followKid(kid, arg);
    else if (act === 'drop') { stopFollow(); kid.focus(); }
    else return ok(false);
    return ok(true);
  });

  handle('hype:store-get', async (event, path) => ok(await store.get(path)));
  handle('hype:store-set', async (event, path, body) => { await store.set(path, body); return ok(true); });
  handle('hype:store-del', async (event, path) => { await store.del(path); return ok(true); });

  handle('hype:session-get', async () => (await client()).getSession());
  handle('hype:sign-in', async () => {
    const c = await client();
    const s = await c.getSession();
    try {
      // connected without the plan: ask again, this time with the consent screen
      return ok(await c.signIn(s.status === 'connected' && !s.sharing ? { reconsent: true } : {}));
    } catch (e) {
      if (e && e.code === 'registration_upgrade_required') return ok(await c.signIn({ newProfile: true }));
      throw e;
    }
  });
  handle('hype:sign-in-cancel', async () => { (await client()).cancelSignIn(); return ok(true); });
  handle('hype:disconnect', async () => { modelCache = null; await (await client()).disconnect(); return ok(true); });
  handle('hype:models', async () => ok(await models(await client())));
  handle('hype:prefs-get', async () => ({ ...(await loadPrefs()) }));
  handle('hype:zoom-get', async () => ({ zoom: win ? clampZoom(win.webContents.getZoomFactor()) : 1, auto: savedZoom() === null }));
  handle('hype:zoom-set', async (event, v) => { if (v === 'auto') resetZoom(); else if (typeof v === 'number' && Number.isFinite(v)) applyZoom(v); return ok(true); });
  handle('hype:prefs-set', async (event, patch) => savePrefs(patch));
  handle('hype:open-usage', async () => {
    if (TEST) { globalThis.__hypeOpened = (globalThis.__hypeOpened || []).concat(CHATGPT_USAGE_URL); return ok(true); }
    await shell.openExternal(CHATGPT_USAGE_URL);
    return ok(true);
  });

  // kind 'pack': the creator's photo pack (much bigger than a game)
  const FILES = { game: { max: 30_000_000, save: 'Exporter la partie', open: 'Importer une partie', type: 'Partie Hype', name: 'partie-hype' },
    pack: { max: 400_000_000, save: 'Exporter le pack photos', open: 'Importer un pack photos', type: 'Pack photos Hype', name: 'hype-pack-photos' } };
  handle('hype:file-save', async (event, name, text, kind) => {
    const K = FILES[kind] || FILES.game;
    if (typeof text !== 'string' || text.length > K.max) return false;
    const safe = (basename(String(name || '')).replace(/[^\w.-]+/g, '-').slice(0, 90) || K.name) .replace(/(\.json)?$/, '.json');
    let file;
    if (TEST && globalThis.__hypeSaveDir) file = join(globalThis.__hypeSaveDir, safe);
    else {
      const r = await dialog.showSaveDialog(win, { title: K.save, defaultPath: join(app.getPath('documents'), safe), filters: [{ name: K.type, extensions: ['json'] }] });
      if (r.canceled || !r.filePath) return false;
      file = r.filePath;
    }
    await writeFile(file, text, 'utf8');
    return true;
  });
  handle('hype:file-open', async (event, kind) => {
    const K = FILES[kind] || FILES.game;
    let file;
    if (TEST && globalThis.__hypeOpenFile) file = globalThis.__hypeOpenFile;
    else {
      const r = await dialog.showOpenDialog(win, { title: K.open, properties: ['openFile'], filters: [{ name: K.type, extensions: ['json'] }] });
      if (r.canceled || !r.filePaths[0]) return null;
      file = r.filePaths[0];
    }
    if ((await stat(file)).size > K.max) return null;
    return { name: basename(file), text: await readFile(file, 'utf8') };
  });
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
// 0.28: the achievements of an Æ Games Launcher session (off when Hype is launched on its own). The ticket and the key
// are read once, then taken out of the environment: they live in the service's memory only.
const ach = createAchievementService({
  config: achConfig(process.env),
  transport: httpTransport((url, o) => net.fetch(url, o)),
  log: (x) => console.warn(x), // (plain words: never a value of the configuration)
  meta: { gameVersion: app.getVersion() },
});
for (const k of ['AE_GAMES_ACHIEVEMENT_TOKEN', 'AE_GAMES_SUPABASE_KEY']) delete process.env[k];
let achFlushed = false;
app.on('before-quit', (e) => { // (a short moment to send what waits: two seconds at most, never more)
  if (achFlushed || !ach.enabled || !ach.pending) return;
  achFlushed = true;
  e.preventDefault();
  ach.flush(2000).catch(() => {}).finally(() => app.quit());
});
app.on('window-all-closed', () => app.quit());
app.whenReady().then(async () => {
  if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => callback(false));
  serveApp();
  registerIpc();
  await client();
  await loadPrefs(); // the size the player chose, before the window opens
  createWindow();
});
