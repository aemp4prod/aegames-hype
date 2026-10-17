// Builds the new prompts on a real saved game (core + feed + DMs JSON files) to check them on real data.
// Run: node test/user_game_prompts.js <dir with g_<id>.json, g_<id>_feed.json, g_<id>_dms.json> <id> <out dir>
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const [dir, id, outDir] = process.argv.slice(2);
const code = fs.readFileSync(path.join(ROOT, 'src', 'core.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'src', 'ai.js'), 'utf8')
  + '\n;globalThis.__api = { S, migrate, mains, charByHandle, promptAct, promptDM, promptRefresh, activeTriggers, linesOf, ticsOf, regulars };';
const ctx = {
  console, TextEncoder, Intl, AbortController, setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  requestAnimationFrame: () => 0, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, window: { claude: null }, goFeedTop: () => {},
};
vm.createContext(ctx);
vm.runInContext(code, ctx);
const A = ctx.__api;
const load = (n) => { const raw = JSON.parse(fs.readFileSync(path.join(dir, n + '.json'), 'utf8')); return raw.data || raw; };
const core = load('g_' + id), feed = load('g_' + id + '_feed'), dms = load('g_' + id + '_dms');
const g = A.migrate(Object.assign({}, core, { posts: feed.posts, dms: dms.dms || {} }));
A.S.game = g;
fs.mkdirSync(outDir, { recursive: true });
const ms = A.mains(g);
for (const c of ms) console.log('tics', c.handle, JSON.stringify(A.ticsOf(A.linesOf(g, c))));
// the thread the player is busy with: his post-less replies under a character's post
const thread = g.posts.filter((p) => p.replies.some((r) => r.a === 'p')).sort((a, b) => b.replies.length - a.replies.length)[0];
const last = thread.replies.filter((r) => r.a !== 'p').slice(-1)[0];
const out = {
  'reply-in-thread': A.promptAct(g, 'reply', 'tu réponds toujours pas, c’est quoi la marque exactement ?', thread, {}, last, { trig: [] }),
  refresh: A.promptRefresh(g, 0, A.activeTriggers(g)),
};
const target = A.charByHandle(g, ms.slice().sort((a, b) => a.rel - b.rel)[0].handle);
out.accusation = A.promptAct(g, 'post', `@${target.handle} fait la promo d’une boisson qui a provoqué des tachycardies, sans jamais dire que c’est une pub. Il esquive depuis 4 messages.`, null, {}, null, { trig: [], accuse: { c: target, clues: [] } });
out['accusation-fake'] = A.promptAct(g, 'post', `@${target.handle} touche 5000 balles par post pour cette boisson et il le cache. Regardez ce qu’il écrit à son agent.`, null, {}, null, { trig: [], accuse: { c: target, clues: [], fake: { kind: 'dm', desc: `@${target.handle} à son agent : « dis rien sur les effets, on encaisse et on se tait »`, vig: 62 } } });
const dmWith = ms.find((c) => g.dms[c.id]) || ms[0];
out.dm = A.promptDM(g, dmWith, (g.dms[dmWith.id] || { msgs: [] }).msgs.slice(-10), 'désolé j’ai pas répondu, j’étais occupé', []);
for (const [k, v] of Object.entries(out)) { fs.writeFileSync(path.join(outDir, k + '.txt'), v); console.log(k, v.length, 'chars ≈', Math.round(v.length / 3.5), 'tokens'); }
