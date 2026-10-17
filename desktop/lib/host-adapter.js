// Runs in the game page, before the game. The game was written for Claude's artifact runtime
// (window.claude.use('sample' | 'db' | 'user')): this gives it the same API on top of the desktop app
// (window.hypeHost, exposed by preload.cjs), so the game itself does not change.
// AI requests go to the player's own ChatGPT plan through the app's main process; games are files on this computer.
(function () {
  'use strict';
  const H = window.hypeHost;
  if (!H) return;
  let seq = 0;

  // The player's images (Blobs), as data URLs for the request.
  const dataUrl = (b) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = () => rej(fr.error); fr.readAsDataURL(b); });
  // sample(prompt, { modelTier, onText, signal, images }) → { text }, streamed like Claude's.
  function sample(input, opts) {
    const o = opts || {};
    const prompt = typeof input === 'string' ? input : Array.isArray(input) ? input.map((m) => (m && m.content) || '').join('\n') : String(input);
    const blobs = !o.images ? [] : o.images instanceof Blob ? [o.images] : Array.from(o.images);
    if (blobs.length > 4 || blobs.some((b) => !(b instanceof Blob))) return Promise.reject({ code: 'image_rejected', message: 'images: at most 4 Blobs' });
    return Promise.all(blobs.map(dataUrl)).then((images) => new Promise((resolve, reject) => {
      const id = 'q' + Date.now().toString(36) + '-' + (seq++);
      let text = '';
      if (o.signal) {
        if (o.signal.aborted) { reject({ code: 'cancelled', message: 'aborted' }); return; }
        o.signal.addEventListener('abort', () => { H.aiCancel(id); }, { once: true });
      }
      const onDelta = (d) => {
        if (typeof d !== 'string' || !d) return;
        text += d;
        if (o.onText) { try { o.onText({ text, delta: d }); } catch (e) { /* the game's own callback */ } }
      };
      H.aiStream({ id, prompt, tier: o.modelTier || 'default', images }, onDelta).then((r) => {
        if (r && r.ok) resolve({ text: typeof r.text === 'string' ? r.text : text, truncated: false });
        else reject(Object.assign({ text }, (r && r.error) || { code: 'unexpected', message: 'no answer' }));
      }, (e) => reject({ code: 'unexpected', message: String((e && e.message) || e), text }));
    }), (e) => Promise.reject({ code: 'image_rejected', message: String((e && e.message) || e) }));
  }
  // What a call can carry: the prompt, and up to four images (the player's, when the characters see them).
  sample.limits = async () => ({ maxPromptBytes: 2000000, images: { maxCount: 4, maxInputBytes: 20000000, mediaTypes: ['image/jpeg', 'image/png', 'image/webp'] } });

  const fail = (r) => { if (r && r.error) throw r.error; return r; };
  const db = {
    doc(path) {
      return {
        path,
        async get() {
          const r = fail(await H.storeGet(path));
          const v = r ? r.value : null;
          return { id: path.split('/').pop(), exists: v != null, data: () => v, metadata: {} };
        },
        async set(body) { fail(await H.storeSet(path, body)); },
        async delete() { fail(await H.storeDel(path)); },
      };
    },
    collection() { throw new Error('not used by the game'); },
  };
  // One player per computer account: the games live in this app's own folder.
  const me = { id: 'local', name: '', avatarUrl: '', color: '#888', email: null, isOwner: true, canEdit: true };
  const user = { id: async () => 'local', isOwner: async () => true, canEdit: async () => true, can: async () => true, me: async () => me };

  window.claude = { use: async (name) => ({ sample, db, user })[name] || null };
})();
