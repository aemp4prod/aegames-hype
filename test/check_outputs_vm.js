// Replays saved model answers (agents/outputs2/quick/*.jsonl) through the real game flows in Node (core.js + ai.js in a vm)
// and reports what each answer changed. Run: node test/check_outputs_vm.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const OUTS = path.join(ROOT, 'agents', 'outputs2', 'quick');

const code = fs.readFileSync(path.join(ROOT, 'src', 'core.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'src', 'ai.js'), 'utf8')
  + '\n;globalThis.__api = { S, createWorld, enterNewGame, mains, charByHandle, addMem, applyVibe, setVibeGoal, setQuestProg, activeQuests, revealedPosts, addReplyTo, runAct, sendDM, refreshFeed, loadIdeas, FLOWS, makeScanner, VIBES };';
const WORLD_TEXT = fs.readFileSync(path.join(ROOT, 'agents', 'outputs', 'default', '01-monde-influence.jsonl'), 'utf8');
let now = Date.UTC(2026, 9, 13, 12, 0, 0);
let answer = WORLD_TEXT;
const sample = async (prompt, o) => { const t = answer; for (let i = 1; i <= t.length; i += 40) o.onText && o.onText({ text: t.slice(0, i) }); return { text: t }; };
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
const read = (f) => fs.readFileSync(path.join(OUTS, f), 'utf8');
function lineTypes(text) { const out = {}; A.makeScanner((o) => { out[o.t] = (out[o.t] || 0) + 1; })(text); return out; }
function snap(g) {
  return {
    posts: g.posts.length, later: g.posts.filter((p) => p.at > now + 50000).length, photos: g.posts.filter((p) => p.photo).length,
    notifs: g.notifs.length, chron: g.chronicle.length, fol: g.stats.followers, rep: g.stats.reputation,
    mems: A.mains(g).reduce((n, c) => n + c.mem.length, 0), vibes: A.mains(g).map((c) => c.vibe).filter(Boolean).join(','),
    rels: A.mains(g).map((c) => c.rel).join(','), dms: Object.values(g.dms).reduce((n, c) => n + c.msgs.length, 0),
    quests: A.activeQuests(g).map((q) => q.id + (q.pct ? '@' + q.pct : '') + (q.pendingDone ? '!' : '')).join(' '),
  };
}
function diff(a, b) { const o = {}; for (const k of Object.keys(a)) if (a[k] !== b[k]) o[k] = [a[k], b[k]]; return o; }

(async () => {
  A.S.ob = { step: 'persona', world: 'influence', custom: '', errors: {}, persona: { name: 'Nina Swipe', handle: 'nina.swipe', emoji: '📸', hue: 330, identity: 'une petite créatrice lifestyle de Lyon qui vise le million d’abonnés', bio: '', start: 'anon', pron: 'elle', chaos: 1 } };
  await A.createWorld();
  const g = A.S.ob.game;
  const ms = A.mains(g);
  A.enterNewGame(ms.slice().sort((a, b) => b.rel - a.rel)[0].id);
  const rival = ms.slice().sort((a, b) => a.rel - b.rel)[0];
  rival.rel = -38;
  A.applyVibe(g, rival, 'rival', 'test');
  now += 10 * 60000;
  const post = A.revealedPosts(g).find((p) => p.a.startsWith('c:'));
  const r1 = A.addReplyTo(g, post, { by: rival.handle, text: 'mdr qui regarde encore ce genre de contenu en 2026' }, now - 30000);
  const runs = [
    ['01-post-mention-rival.jsonl', () => A.runAct('post', `@${rival.handle} ton dernier vlog c’était une pub de 12 minutes avec un peu de vlog autour. on en parle ?`)],
    ['02-post-photo.jsonl', () => A.runAct('post', 'premier café de la semaine, premier fail', null, null, { photo: { desc: 'une tasse de cappuccino renversée sur une veste en velours côtelé' } })],
    ['04-reponse-a-un-commentaire.jsonl', () => A.runAct('reply', 'moi. et visiblement toi aussi puisque t’es là', post, r1)],
    ['05-dm-souvenirs-declencheur.jsonl', () => A.sendDM(rival.id, 'bon. on peut parler sans que ça finisse en story ?')],
    ['07-actualiser-declencheurs.jsonl', () => A.refreshFeed(0)],
    ['08-idees-quete.jsonl', () => A.loadIdeas(null, null, A.activeQuests(g).find((q) => q.kind === 'story'))],
    ['03-post-excuses.jsonl', () => { g.stats.cancelled = true; g.stats.reputation = 11; return A.runAct('post', 'je vous dois des excuses…', null, null, { apology: true }); }],
    ['06-dm-relation-tres-mauvaise.jsonl', () => { rival.rel = -55; return A.sendDM(rival.id, 'tu vas m’ignorer longtemps ?'); }],
  ];
  for (const [file, fn] of runs) {
    answer = read(file);
    now += 4 * 60000;
    g.lastRefreshAt = 0;
    const before = snap(g);
    const ok = await fn();
    now += 30000;
    const after = snap(g);
    const extra = file.startsWith('08') ? { ideas: (A.S.ideas && A.S.ideas.list.length) || 0 } : {};
    const mine = g.posts.filter((p) => p.a === 'p').slice(-1)[0];
    if (file.match(/^0[123]/) && mine) Object.assign(extra, { verdict: mine.res && mine.res.verdict, fol: mine.res && mine.res.fol, photo: mine.photo && mine.photo.emoji, sincerity: mine.res && mine.res.sincerity, replies: mine.replies.length });
    console.log(file.padEnd(38), 'ok=' + ok, JSON.stringify(lineTypes(answer)), '\n   changed', JSON.stringify(diff(before, after)), JSON.stringify(extra));
  }
  console.log('flows left running:', A.FLOWS.size);
})().catch((e) => { console.error(e); process.exit(1); });
