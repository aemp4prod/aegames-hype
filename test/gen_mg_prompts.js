// Builds the real shoot mini-game prompts (Expert with format rotation, Cauchemar on real and in-world topics)
// in Node on a world made from a saved model answer. Writes agents/prompts3/mg/*.txt. Run: node test/gen_mg_prompts.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'agents', 'prompts3', 'mg');
const code = fs.readFileSync(path.join(ROOT, 'src', 'core.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'src', 'ai.js'), 'utf8')
  + '\n;globalThis.__api = { S, createWorld, enterNewGame, mains, promptMiniGame, promptDateGame, fameDiff, uid };';
const WORLD_TEXT = fs.readFileSync(path.join(ROOT, 'agents', 'outputs', 'default', '01-monde-influence.jsonl'), 'utf8');
let now = Date.UTC(2026, 9, 13, 12, 0, 0);
const sample = async (prompt, o) => { if (o.onText) o.onText({ text: WORLD_TEXT }); return { text: WORLD_TEXT }; };
const ctx = {
  console, TextEncoder, Intl, AbortController, setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  requestAnimationFrame: () => 0, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  window: { claude: { use: async (n) => (n === 'sample' ? sample : null) } },
  goFeedTop: () => {}, enterGame: (g) => { ctx.__api.S.game = g; g.ready = true; },
};
vm.createContext(ctx);
vm.runInContext('Date.now = () => __now();', Object.assign(ctx, { __now: () => now }));
vm.runInContext(code, ctx);
const A = ctx.__api;
(async () => {
  A.S.ob = { step: 'persona', world: 'influence', custom: '', errors: {}, persona: { name: 'Nina Swipe', handle: 'nina.swipe', emoji: '📸', hue: 330, identity: 'une petite créatrice lifestyle de Lyon qui vise le million', start: 'anon', pron: 'elle' }, chaos: 1 };
  await A.createWorld();
  const g = A.S.ob.game;
  const ms = A.mains(g);
  A.enterNewGame(ms[0].id);
  const rival = ms.slice().sort((a, b) => a.rel - b.rel)[0];
  const rel = (o) => Object.assign({ id: A.uid('rl'), state: 'scheduled', at: now, due: now, delays: 0, c: null, said: '' }, o);
  const P = {};
  g.mgLast = 'tri';
  P['01-expert-rotation'] = A.promptMiniGame(g, rel({ what: 'vidéo', topic: 'Pourquoi le lin beige est le pire choix pour un vlog', diff: 'expert' }));
  P['02-cauchemar-jeu-video'] = A.promptMiniGame(g, rel({ what: 'live', topic: 'Mon live sur Minecraft : les secrets du Nether', diff: 'cauchemar' }));
  P['03-cauchemar-sport'] = A.promptMiniGame(g, rel({ what: 'vidéo', topic: 'L’histoire de la Coupe du monde de football', diff: 'cauchemar' }));
  P['04-cauchemar-dans-le-jeu'] = A.promptMiniGame(g, rel({ what: 'vidéo', topic: `Tout ce que @${rival.handle} cache depuis le début`, diff: 'cauchemar', c: rival.id }));
  P['05-cauchemar-cuisine'] = A.promptMiniGame(g, rel({ what: 'podcast', topic: 'La vraie histoire de la pizza napolitaine', diff: 'cauchemar' }));
  fs.mkdirSync(OUT, { recursive: true });
  for (const [k, v] of Object.entries(P)) fs.writeFileSync(path.join(OUT, k + '.txt'), v);
  console.log(Object.entries(P).map(([k, v]) => `${k}  ${v.length} chars`).join('\n'));
})().catch((e) => { console.error(e); process.exit(1); });
