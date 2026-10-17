// Hype for ChatGPT: the desktop app. The game page runs sandboxed; this main process owns the ChatGPT
// connection (OpenAI's Sign in with ChatGPT SDK), the game files and the file dialogs.
import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, safeStorage, screen, session, shell } from 'electron';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createChatGPT, CHATGPT_USAGE_URL } from './vendor/siwc-local/dist/index.js';
import { createCredentialEncryption } from './lib/credential-encryption.mjs';
import { GameStore } from './lib/store.mjs';
import { AiRunner } from './lib/ai.mjs';

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
// img-src blob: the portrait a player imports is read from a local blob before it is shrunk
const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'";
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
  if (keep) { prefs.zoom = v; clearTimeout(zoomTimer); zoomTimer = setTimeout(() => { savePrefs({ zoom: v }).catch(() => {}); }, 300); }
  win.webContents.send('hype:zoom', { zoom: v, auto: savedZoom() === null });
}
function resetZoom() {
  clearTimeout(zoomTimer);
  if (prefs) delete prefs.zoom;
  savePrefs({ zoom: null }).catch(() => {});
  applyZoom(autoZoom(), false);
}
function createWindow() {
  const z0 = savedZoom() || autoZoom(), wa = screen.getPrimaryDisplay().workAreaSize, big = Math.max(1, z0);
  win = new BrowserWindow({
    width: Math.min(Math.round(1200 * big), wa.width - 40), height: Math.min(Math.round(860 * big), wa.height - 40), minWidth: 380, minHeight: 560,
    title: 'Hype', show: false, autoHideMenuBar: true, icon: join(ROOT, 'build', 'icon.png'),
    backgroundColor: '#0f0d12',
    // spelling: the system's own checker on Windows and macOS (on Linux it would download dictionaries from Google: off)
    webPreferences: { preload: join(ROOT, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: process.platform !== 'linux', additionalArguments: TEST ? ['--hype-test'] : [], zoomFactor: z0 },
  });
  win.webContents.on('did-finish-load', () => applyZoom(savedZoom() || autoZoom(), false));
  win.webContents.on('zoom-changed', (event, dir) => applyZoom(win.webContents.getZoomFactor() + (dir === 'in' ? 0.1 : -0.1)));
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || !(input.control || input.meta) || input.alt) return;
    const k = input.key, c = input.code;
    if (k === '+' || k === '=' || c === 'Equal' || c === 'NumpadAdd') { event.preventDefault(); applyZoom(win.webContents.getZoomFactor() + 0.1); }
    else if (k === '-' || c === 'Minus' || c === 'NumpadSubtract') { event.preventDefault(); applyZoom(win.webContents.getZoomFactor() - 0.1); }
    else if (k === '0' || c === 'Digit0' || c === 'Numpad0') { event.preventDefault(); resetZoom(); }
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
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
