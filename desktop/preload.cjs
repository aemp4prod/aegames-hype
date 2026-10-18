// The only door between the game page and the app: a few named requests, no Node, no credentials.
const { contextBridge, ipcRenderer } = require('electron');

const deltas = new Map();
ipcRenderer.on('hype:ai-delta', (_event, msg) => {
  const f = msg && deltas.get(msg.id);
  if (f) f(msg.d);
});
const sessionListeners = new Set();
const zoomListeners = new Set();
ipcRenderer.on('hype:zoom', (_event, z) => {
  for (const f of zoomListeners) { try { f(z); } catch (e) { /* a listener of the page */ } }
});
ipcRenderer.on('hype:session', (_event, s) => {
  for (const f of sessionListeners) { try { f(s); } catch (e) { /* a listener of the page */ } }
});
// Requests answer { ok, value } or { ok: false, error }: the error becomes a rejection the game understands.
const unwrap = (r) => {
  if (r && r.ok === false) throw (r.error || { code: 'unexpected' });
  return r && Object.prototype.hasOwnProperty.call(r, 'value') ? r.value : r;
};

// the automated tests reach into the game (window.__hype), never a normal launch
if (process.argv.includes('--hype-test')) contextBridge.exposeInMainWorld('__HYPE_TEST__', true);

contextBridge.exposeInMainWorld('hypeHost', {
  kind: 'chatgpt',
  assets: { markBlack: 'brand/chatgpt-black.svg', markWhite: 'brand/chatgpt-white.svg' },
  aiStream(req, onDelta) {
    const id = String(req && req.id);
    if (typeof onDelta === 'function') deltas.set(id, onDelta);
    const images = req && Array.isArray(req.images) ? req.images.filter((u) => typeof u === 'string').slice(0, 4) : [];
    return ipcRenderer.invoke('hype:ai-stream', { id, prompt: String(req && req.prompt), tier: String((req && req.tier) || 'default'), images })
      .finally(() => deltas.delete(id));
  },
  aiCancel: (id) => ipcRenderer.invoke('hype:ai-cancel', String(id)),
  // 0.14: an image from a prompt and the player's sketch → { ok, dataUrl } or { ok: false, error }
  aiImage: (req) => ipcRenderer.invoke('hype:ai-image', { id: String(req && req.id), prompt: String((req && req.prompt) || ''), sketch: req && typeof req.sketch === 'string' ? req.sketch : undefined }),
  storeGet: (path) => ipcRenderer.invoke('hype:store-get', String(path)),
  storeSet: (path, body) => ipcRenderer.invoke('hype:store-set', String(path), body),
  storeDel: (path) => ipcRenderer.invoke('hype:store-del', String(path)),
  getSession: () => ipcRenderer.invoke('hype:session-get'),
  onSession(cb) { if (typeof cb === 'function') sessionListeners.add(cb); },
  signIn: () => ipcRenderer.invoke('hype:sign-in').then(unwrap),
  cancelSignIn: () => ipcRenderer.invoke('hype:sign-in-cancel'),
  disconnect: () => ipcRenderer.invoke('hype:disconnect').then(unwrap),
  listModels: () => ipcRenderer.invoke('hype:models').then(unwrap),
  getPrefs: () => ipcRenderer.invoke('hype:prefs-get'),
  // the size of everything: { zoom, auto }; 'auto' = the size for this screen
  getZoom: () => ipcRenderer.invoke('hype:zoom-get'),
  setZoom: (v) => ipcRenderer.invoke('hype:zoom-set', v === 'auto' ? 'auto' : Number(v)),
  onZoom(cb) { if (typeof cb === 'function') zoomListeners.add(cb); },
  setPrefs: (patch) => ipcRenderer.invoke('hype:prefs-set', patch),
  openUsage: () => ipcRenderer.invoke('hype:open-usage'),
  saveFile: (name, text, kind) => ipcRenderer.invoke('hype:file-save', String(name), String(text), kind === 'pack' ? 'pack' : 'game').then((r) => r === true),
  openFile: (kind) => ipcRenderer.invoke('hype:file-open', kind === 'pack' ? 'pack' : 'game').then((r) => (r && typeof r.text === 'string' ? r : null)),
  // 0.27.9: a window out of the game: 'min', 'max', 'close', 'front'; 'game' brings the game's own window to the front
  winCtl: (name, act) => ipcRenderer.invoke('hype:win', String(name), String(act)).then(unwrap),
});
