// Builds the game's real prompts in Node (core.js + ai.js in a vm, no DOM) on a world made from a saved model answer,
// for several situations, and writes them to agents/prompts2/{quick,default}/. Run: node test/gen_prompts_vm.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'agents', 'prompts2');

const code = fs.readFileSync(path.join(ROOT, 'src', 'core.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'src', 'ai.js'), 'utf8')
  + '\n;globalThis.__api = { S, WORLDS, blankGame, createWorld, enterNewGame, mains, charByHandle, addMem, applyVibe, setVibeGoal, addTrigger, activeTriggers, promptAct, promptDM, promptRefresh, promptIdeas, promptWorld, promptNewChar, addStoryQuest, activeQuests, addAmbientPost, addReplyTo, revealedPosts, setQuestProg, makeScanner };';
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
  A.S.ob = { step: 'persona', world: 'influence', custom: '', errors: {}, persona: { name: 'Nina Swipe', handle: 'nina.swipe', emoji: '📸', hue: 330, identity: 'une petite créatrice lifestyle de Lyon qui vise le million d’abonnés', bio: 'café, vintage et vlogs pas très organisés', start: 'anon', pron: 'elle', chaos: 1 } };
  await A.createWorld();
  const g = A.S.ob.game;
  const ms = A.mains(g);
  const ally = ms.slice().sort((a, b) => b.rel - a.rel)[0];
  A.enterNewGame(ally.id);
  now += 5 * 60000;
  const rival = ms.slice().sort((a, b) => a.rel - b.rel)[0];
  // some history: memories, a dynamic, story progress
  A.addMem(g, rival, 'Nina a dit que ses vlogs étaient « aussi beiges que son lin »');
  rival.rel = -38;
  A.applyVibe(g, rival, 'rival', 'clash sur les vlogs');
  const story = A.activeQuests(g).filter((q) => q.kind === 'story');
  if (story[0]) A.setQuestProg(g, story[0].id, 30, 'Zélie a accepté d’en parler');
  const third = ms.find((c) => c !== ally && c !== rival);
  A.setVibeGoal(third, 'crush');
  const post = A.revealedPosts(g).find((p) => p.a.startsWith('c:'));
  const r1 = A.addReplyTo(g, post, { by: rival.handle, text: 'mdr qui regarde encore ce genre de contenu en 2026' }, now - 30000);
  const W = A.WORLDS.find((w) => w.id === 'influence');
  const trig = A.activeTriggers(g);
  const prompts = {
    'quick/01-post-mention-rival': A.promptAct(g, 'post', `@${rival.handle} ton dernier vlog c’était une pub de 12 minutes avec un peu de vlog autour. on en parle ?`, null, {}, null, { trig }),
    'quick/02-post-photo': A.promptAct(g, 'post', 'premier café de la semaine, premier fail : j’ai renversé la moitié sur ma veste vintage', null, {}, null, { photo: { desc: 'une tasse de cappuccino renversée sur une veste en velours côtelé, sur une terrasse lyonnaise' }, trig: [] }),
    'quick/04-reponse-a-un-commentaire': A.promptAct(g, 'reply', 'moi. et visiblement toi aussi puisque t’es là', post, {}, r1, { trig: [] }),
    'quick/05-dm-souvenirs-declencheur': A.promptDM(g, rival, [], 'bon. on peut parler sans que ça finisse en story ?', A.activeTriggers(g, rival.id)),
    'quick/07-actualiser-declencheurs': A.promptRefresh(g, 0, A.activeTriggers(g)),
    'quick/08-idees-quete': A.promptIdeas(g, null, null, story[0] || null),
  };
  // the player is now cancelled: apologies, and a DM with someone who hates her
  g.stats.cancelled = true; g.stats.reputation = 11;
  prompts['quick/03-post-excuses'] = A.promptAct(g, 'post', 'je vous dois des excuses. j’ai été méchante avec Sixtine pour faire du buzz, c’était nul. je retire tout et je vais faire mieux.', null, {}, null, { apology: true, trig: [] });
  rival.rel = -55;
  prompts['quick/06-dm-relation-tres-mauvaise'] = A.promptDM(g, rival, [{ me: true, text: 'je voulais m’excuser pour le vlog' }], 'tu vas m’ignorer longtemps ?', []);
  prompts['default/01-monde-perso'] = A.promptWorld({ id: null, emoji: '✨', hue: 300, name: 'Ton univers', desc: '', prompt: 'Une colonie sous-marine en 2200 où les influenceurs vivent dans des bulles de verre et se disputent les abonnés de la surface' }, { name: 'Sam Récap', handle: 'sam.recap', emoji: '🎬', hue: 200, bio: '', identity: 'un petit vidéaste qui raconte les dramas de la colonie', start: 'rising', pron: 'il', chaos: 2 });
  for (const d of ['quick', 'default']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
  for (const [k, v] of Object.entries(prompts)) fs.writeFileSync(path.join(OUT, k + '.txt'), v);
  console.log(Object.entries(prompts).map(([k, v]) => `${k}  ${v.length} chars ≈ ${Math.round(v.length / 3.5)} tokens`).join('\n'));
})().catch((e) => { console.error(e); process.exit(1); });
