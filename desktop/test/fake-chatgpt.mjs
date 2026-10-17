// A simulated ChatGPT for the automated tests: the same canned answers as the Claude version's tests
// (../../test/mock.js, run here in a sandbox), behind the interface of OpenAI's SDK client.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createFakeChatGPT() {
  const mem = new Map();
  const localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const win = {};
  const ctx = vm.createContext({ window: win, localStorage, setTimeout, clearTimeout, console, JSON, Math, Date, Object, Array, String, Number, Promise, Error });
  vm.runInContext(readFileSync(join(HERE, '..', '..', 'test', 'mock.js'), 'utf8'), ctx);

  let state = { status: 'disconnected', sharing: false };
  let failNext = null;
  const subs = new Set();
  const publish = () => { for (const f of subs) { try { f({ ...state }); } catch (e) { /* listener */ } } return { ...state }; };
  const need = () => { if (state.status !== 'connected') throw Object.assign(new Error('Sign in with ChatGPT to continue.'), { code: 'sign_in_required' }); };

  const fake = {
    calls: [],
    signIns: 0,
    prompts: () => win.__prompts.slice(),
    failNext(err) { failNext = err; },
    async signIn(opts = {}) {
      fake.signIns++;
      fake.lastSignIn = opts;
      await sleep(400);
      state = { status: 'connected', sharing: true, profileId: 'p1', profileLabel: 'Connexion 1', identity: { name: 'Testeur', email: 'testeur@exemple.fr' } };
      return publish();
    },
    cancelSignIn() {},
    async getSession() { return { ...state }; },
    async listProfiles() { return []; },
    async selectProfile() { return { ...state }; },
    subscribe(f) { subs.add(f); f({ ...state }); return () => subs.delete(f); },
    async disconnect() { state = { status: 'disconnected', sharing: false }; publish(); },
    async listModels() { need(); return [{ slug: 'gpt-test-rapide', displayName: 'GPT test rapide' }, { slug: 'gpt-test-pro', displayName: 'GPT test pro' }]; },
    async streamResponse({ model, input, reasoning, signal, onDelta }) {
      need();
      // the text of the request, and the images that came with it (input_image parts, 0.9.2)
      const parts = typeof input === 'string' ? [{ type: 'input_text', text: input }] : input.flatMap((m) => (typeof m.content === 'string' ? [{ type: 'input_text', text: m.content }] : m.content));
      const text = parts.filter((x) => x.type === 'input_text').map((x) => x.text).join('\n');
      const imgs = parts.filter((x) => x.type === 'input_image');
      fake.calls.push({ model, effort: reasoning ? reasoning.effort : null, chars: text.length, img: /data:image|base64,/.test(text), photo: /Avec une PHOTO\. Ce qu’on voit/.test(text), imgs: imgs.length,
        imgOk: imgs.every((x) => /^data:image\/jpeg;base64,/.test(x.image_url) && x.detail === 'low'), seen: text.includes('générées par IA du perso du joueur') });
      if (failNext) { const e = failNext; failNext = null; await sleep(150); throw Object.assign(new Error(e.message || e.code), e); }
      const sample = await win.claude.use('sample');
      let last = '';
      const res = await sample(text, { onText: ({ text }) => { if (signal && signal.aborted) return; if (text.length > last.length) { onDelta(text.slice(last.length)); last = text; } } });
      if (signal && signal.aborted) throw Object.assign(new Error('cancelled'), { code: 'cancelled' });
      if (res.text.length > last.length) onDelta(res.text.slice(last.length));
      return { text: res.text };
    },
    // 0.14: an image from a prompt and a sketch (a small JPEG, the sketch itself when there is one)
    images: [],
    async generateImage({ model, prompt, image, signal }) {
      need();
      fake.images.push({ model, chars: String(prompt || '').length, sketch: typeof image === 'string' && /^data:image\/jpeg;base64,/.test(image) });
      if (failNext) { const e = failNext; failNext = null; await sleep(150); throw Object.assign(new Error(e.message || e.code), e); }
      await sleep(300);
      if (signal && signal.aborted) throw Object.assign(new Error('cancelled'), { code: 'cancelled' });
      const b64 = typeof image === 'string' && image.includes('base64,') ? image.split('base64,')[1] : '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
      return { b64, format: 'jpeg' };
    },
  };
  return fake;
}
