/* =========================================================
   Trust (0.9): how much a main character believes the player, and follows their advice.
   The relation says whether they like the player; trust, whether they believe them. It grows slowly (advice that works,
   a word kept, a secret kept, being there in a bad moment) and falls fast (a lie, a leak, a trap). Some give it harder
   than others: their nature (their « garde », chosen by the AI when it writes them) and their fame.
   With enough of it they follow the player's advice: a post, a video, the way they answer a clash… Good advice makes
   them shine; bad advice sends them into a bad buzz, and they may understand who pushed them into it.
   ========================================================= */
const TRUST_STEPS = [40, 70, 90]; // small advice; big advice (and their secret); blind trust
const ADVICE_NEED = [40, 70, 90]; // by the risk of the advice for them: 0 harmless, 1 notable, 2 a big risk for their image
const TRUST_DAY_CAP = 12; // what talking can bring in a game day (advice that worked, a date, a secret kept: on top of it)
const SHADY_MS = 36 * 3600000; // caught manipulating someone: everybody is wary of the player's advice for a while
const ADVICE_KINDS = {
  post: { emoji: '✍️', noun: 'un post' },
  video: { emoji: '🎬', noun: 'une vidéo' },
  reply: { emoji: '💬', noun: 'une réponse' },
};
const trustOf = (c) => (c && typeof c.trust === 'number' ? c.trust : 0);
const gardeOf = (c) => (c && [1, 2, 3].includes(c.garde) ? c.garde : 2);
const isShady = (g, t = Date.now()) => !!(g && g.shady && t < g.shady.until);
// Everybody wants something from a star: the more famous, the slower they trust.
const fameGuard = (f) => (f >= 1e6 ? 0.55 : f >= 1e5 ? 0.7 : f >= 1e4 ? 0.85 : 1);
// What a gain is worth for them: their nature, their fame, the player's name (caught manipulating someone), the relation.
const trustMult = (g, c, t = Date.now()) => ({ 1: 1.25, 2: 0.9, 3: 0.55 })[gardeOf(c)] * fameGuard(c.followers || 0) * (isShady(g, t) ? 0.5 : 1) * (c.rel < 0 ? 0.4 : 1) * heartTrust(c); // 0.11: their heart too
// Tests drive the dice of the outcomes; the game rolls them.
const roll = () => (window.__HYPE_TEST__ && Array.isArray(window.__trustRolls) && window.__trustRolls.length ? window.__trustRolls.shift() : Math.random());

function trustLabel(t, gd) {
  if (t >= 90) return 'Confiance aveugle';
  if (t >= 70) return 'Te fait confiance';
  if (t >= 40) return 'À l’écoute';
  if (t >= 15) return 'Pas encore'; // (0.28.1: not « Méfiant » above someone who « fait vite confiance »: it is just early)
  return 'Aucune confiance';
}
const gardeLabel = (c) => ({ 1: 'Fait vite confiance', 2: gx(c.g, 'Prudent', 'Prudente', 'Prudent·e'), 3: gx(c.g, 'Très méfiant', 'Très méfiante', 'Très méfiant·e') })[gardeOf(c)];
const gardeWhy = (c) => c.gardeWhy || ({ 1: 'croit facilement aux gens', 2: 'attend de voir avant de faire confiance', 3: 's’est déjà fait avoir' })[gardeOf(c)];
const fameNote = (c) => (c.followers >= 1e6 ? 'une star : tout le monde veut quelque chose' : c.followers >= 1e5 ? gx(c.g, 'très connu', 'très connue', 'très connu·e') + ' : se méfie des gens intéressés' : '');
// What the next step brings, for the profile.
function trustNext(c) {
  const t = trustOf(c), il = gx(c.g, 'il', 'elle', 'iel');
  if (t < 40) return `Encore ${40 - t} pour qu’${il} écoute tes petits conseils (le sujet d’un post, le ton d’une réponse).`;
  if (t < 70) return `Encore ${70 - t} pour qu’${il} suive tes gros conseils (une vidéo, sa réponse à un clash), et te confie peut-être un secret.`;
  if (t < 90) return `Encore ${90 - t} pour une confiance aveugle : même tes conseils les plus risqués.`;
  return `${cap1(il)} suivrait presque n’importe quel conseil de ta part.`;
}
// How it grows, how it falls: said once on the profile.
const TRUST_HOW = 'Elle monte quand tes conseils marchent, quand tu tiens parole, gardes ses confidences et es là dans les moments durs. Elle chute si tu mens, fais tourner ses messages ou lui tends un piège.';

/* ---------- a new character, an old game ---------- */
// Their nature (from the AI, or chance) and a little trust to start, from how they see the player.
function initTrust(c, o = {}) {
  const gd = int(o.garde, 0, 3, 0);
  c.garde = gd >= 1 ? gd : [1, 2, 2, 3][randi(0, 3)];
  const why = str(o.mefiance, 80);
  if (why) c.gardeWhy = why;
  c.trust = clamp(Math.round(18 + c.rel * 0.4 + rand(-6, 6) - (c.garde - 2) * 6), 0, 35);
}
// Games from before 0.9: their nature by chance (always the same for a handle), trust from the relation and the bond.
const TRUST_BONDS = ['amitie', 'bff', 'famille', 'confidences', 'complices', 'colocs', 'couple', 'fiancailles', 'mariage', 'mentor', 'disciple', 'partenaires', 'alliance', 'fan'];
function migrateTrust(g) {
  for (const id of g.order || []) {
    const c = g.chars[id];
    if (!c || !isMain(c) || typeof c.trust === 'number') continue;
    c.garde = [1, 2, 2, 3][hashStr(c.handle + '#garde') % 4];
    c.trust = clamp(Math.round(15 + Math.max(0, c.rel) * 0.6 + (TRUST_BONDS.includes(c.vibe) ? 8 : 0) - (c.garde - 2) * 6), 0, 70);
  }
  if (!Array.isArray(g.advice)) g.advice = [];
}

/* ---------- trust moves ---------- */
// d > 0 is scaled by how hard they give their trust, and what talking brings is capped per day (opts.free: something
// that proves itself, like advice that worked). With a relation below 0 it stays under 30: nobody trusts who they dislike.
function applyTrust(g, who, d, why, at, opts = {}) {
  const c = typeof who === 'object' ? who : charByHandle(g, normHandle(who));
  if (!c || !c.unlocked || !isMain(c)) return 0;
  if (typeof c.trust !== 'number') initTrust(c);
  let delta = int(d, -100, 100, 0);
  if (!delta) return 0;
  const t = Date.now();
  if (delta > 0) {
    let x = delta * trustMult(g, c, t) * (1 + skillFx(g, 'trustGain')); // 0.24: charisma (tiers 5 and 30); the daily cap stays
    if (!opts.free) {
      if (!c.trustDay || t - c.trustDay.at >= DAY_MS) c.trustDay = { at: t, n: 0 };
      x = Math.min(x, Math.max(0, TRUST_DAY_CAP - c.trustDay.n));
    }
    delta = x >= 0.5 ? Math.max(1, Math.round(x)) : 0;
    if (!delta) return 0;
    if (!opts.free) c.trustDay.n += delta;
  }
  const before = c.trust;
  const top = delta > 0 ? Math.max(before, c.rel < 0 ? 30 : 100) : 100;
  c.trust = clamp(before + delta, 0, top);
  const real = c.trust - before;
  if (!real) return 0;
  at = at || later();
  const reason = str(why, 90);
  if (!opts.quiet) addNotif(g, { k: real > 0 ? 'trust' : 'trustdown', c: c.id, at, text: `${c.name} : confiance ${real > 0 ? '+' : '−'}${Math.abs(real)}${reason ? ' · ' + reason : ''}` });
  const il = gx(c.g, 'il', 'elle', 'iel');
  for (const s of TRUST_STEPS) {
    if (before < s && c.trust >= s) addNotif(g, { k: 'trustup', c: c.id, at: at + 300, text: s === 40 ? `🔓 ${c.name} t’écoute : ${il} suivra tes petits conseils` : s === 70 ? `🔓 ${c.name} te fait confiance : ${il} suivra tes gros conseils` : `🔓 ${c.name} a une confiance aveugle en toi` });
    else if (before >= s && c.trust < s) addNotif(g, { k: 'trustdown', c: c.id, at: at + 300, text: `🔒 ${c.name} n’a plus assez confiance en toi pour suivre ${s === 40 ? 'tes conseils' : s === 70 ? 'tes gros conseils' : 'n’importe quel conseil'}` });
  }
  return real;
}
// Everybody saw something (a fake proof exposed): one grouped notification, not one per character.
function trustAll(g, d, except) {
  for (const o of mains(g)) if (o !== except && typeof o.trust === 'number') o.trust = clamp(o.trust + d, 0, 100);
}
// Caught: the whole network is wary of the player's advice for a while.
function markShady(g, c) {
  const t = Date.now();
  g.shady = { at: t, until: t + SHADY_MS, c: c ? c.id : null, n: ((g.shady && g.shady.n) || 0) + 1 };
}

/* ---------- advice ---------- */
const adviceNeed = (risk) => ADVICE_NEED[int(risk, 0, 2, 1)];
const plannedAdvice = (g, c) => (g.advice || []).find((a) => a.c === c.id && a.state === 'planned') || null;
// The character's answer to the player's advice (a line of the DM): what they will do, and when.
// Said yes without enough trust for it: they will not do it (people say yes and do nothing).
function addAdvice(g, c, o, msgId) {
  if (!c || !isMain(c) || !(o.follow === true || o.follow === 'true')) return null;
  const kind = ADVICE_KINDS[o.kind] ? o.kind : 'post';
  const what = str(o.what, 100), text = str(o.text, 280);
  if (!what || !text) return null;
  const risk = int(o.risk, 0, 2, 1), q = int(o.q, -3, 3, 0);
  const t = Date.now();
  const old = plannedAdvice(g, c);
  if (old) old.state = 'dropped'; // a new piece of advice replaces the one they had not followed yet
  const a = { id: uid('ad'), c: c.id, kind, what, text, to: normHandle(o.to || ''), risk, q, at: t, due: t + int(o.in, 10, 1440, 90) * 60000, state: 'planned', m: msgId || null };
  if (trustOf(c) < adviceNeed(risk) - 10) a.bail = true;
  if (!g.advice) g.advice = [];
  g.advice.push(a);
  if (g.advice.length > 12) g.advice = g.advice.filter((x, k, all) => x.state === 'planned' || k >= all.length - 12);
  addNotif(g, { k: 'advice', c: c.id, at: later() + 1500, text: `💡 ${c.name} va suivre ton conseil : « ${str(what, 70)} » (${fmtWhen(a.due)})` });
  return a;
}
// Called by the clock (and after a jump in time): advice that is due is followed; a confided secret kept is noticed.
function tickAdvice(g, t = Date.now()) {
  if (!g) return false;
  let ch = false;
  for (const a of g.advice || []) if (a.state === 'planned' && a.due <= t) { resolveAdvice(g, a, t); ch = true; }
  for (const c of mains(g)) {
    if (c.secretTold && !c.secretKept && !c.secretOut && t - c.secretTold.at >= 3 * DAY_MS) {
      c.secretKept = true;
      applyTrust(g, c, 6, 'tu as gardé son secret', t, { free: true });
      ch = true;
    }
  }
  return ch;
}
// The card in the conversation, where the advice was given.
function adviceCard(g, c, a, text) {
  const convo = g.dms[c.id] || (g.dms[c.id] = { msgs: [], readAt: 0 });
  const t = later() + 800;
  convo.msgs.push({ id: uid('m'), sys: 'advice', state: a.state, title: str(a.what, 100), text, ts: t, at: t });
}
// They do it (a post, a video, an answer under someone's post), then the game decides how it lands, without AI:
// good advice mostly works, bad advice mostly ends in a bad buzz. The network talks about it on its next update.
function resolveAdvice(g, a, t = Date.now()) {
  const c = g.chars[a.c];
  if (!c || !c.unlocked) { a.state = 'dropped'; return; }
  const first = c.name.split(' ')[0];
  if (a.bail) {
    a.state = 'bailed';
    addNotif(g, { k: 'advice', c: c.id, at: later(), text: `💡 ${first} a finalement laissé tomber ton conseil (« ${str(a.what, 60)} ») : pas encore assez confiance en toi.` });
    adviceCard(g, c, a, `Finalement, ${first} ne l’a pas fait : pas encore assez confiance en toi pour ça.`);
    return;
  }
  const at = Math.max(a.due, t - 2 * DAY_MS);
  let post = null, reply = null;
  if (a.kind === 'reply' && a.to) { // under the latest post of the person they answer
    const tc = charByHandle(g, a.to);
    const aid = tc ? 'c:' + tc.id : 'n:' + a.to;
    const target = revealedPosts(g, t).find((p) => p.a === aid && t - p.ts < 3 * DAY_MS) || null;
    if (target) { reply = addReplyTo(g, target, { by: c.handle, text: a.text }, at); if (reply) post = target; }
  }
  if (!post) {
    post = addAmbientPost(g, { by: c.handle, text: a.text }, at, at);
    if (post && a.kind === 'video') post.video = { what: 'vidéo', topic: a.what, views: Math.round(Math.max(200, c.followers) * rand(0.15, 0.5)) };
  }
  if (!post) { a.state = 'dropped'; return; }
  a.p = post.id;
  if (reply) a.r = reply.id;
  const win = roll() < clamp(0.5 + 0.17 * a.q - 0.05 * a.risk, 0.06, 0.94);
  if (win) adviceWin(g, c, a, post, reply);
  else if (a.q < 0 || (a.risk >= 2 && roll() < 0.5)) adviceBuzz(g, c, a, post);
  else adviceFlop(g, c, a, post);
}
function adviceWin(g, c, a, post, reply) {
  const t = later(), first = c.name.split(' ')[0], il = gx(c.g, 'il', 'elle', 'iel'), lui = gx(c.g, 'lui', 'elle', 'iel');
  const gain = Math.round(c.followers * rand(0.03, 0.08)) + randi(5, 40);
  c.followers += gain;
  if (reply) reply.likeT = Math.round((reply.likeT || 0) * 3 + randi(20, 90));
  else {
    post.likeT = Math.round(post.likeT * rand(2, 3.5)) + randi(10, 60);
    post.rpT = Math.round(post.likeT * rand(0.08, 0.2));
    if (post.video) post.video.views = Math.round(post.video.views * rand(2, 3));
  }
  a.state = 'win';
  a.res = { fol: gain };
  applyTrust(g, c, randi(6, 10), 'ton conseil a marché', t + 1200, { free: true });
  applyRel(g, c, 4, 'ton conseil a marché', t + 1800, 10);
  addMem(g, c, 'le joueur m’a donné un conseil qui a marché');
  gainXP(g, 15);
  addNotif(g, { k: 'advice', c: c.id, p: post.id, at: t, text: `💡 Ton conseil a marché : ${first} cartonne avec « ${str(a.what, 60)} » (${nAbonnes(gain, true)} pour ${lui})` });
  adviceCard(g, c, a, `${nAbonnes(gain, true)} pour ${first}, qui te fait encore plus confiance.`);
  addChronicle(g, `${c.name} cartonne avec « ${str(a.what, 80)} ».`);
  addTrigger(g, `@${c.handle} a suivi un conseil du joueur (« ${str(a.what, 80)} ») et ça cartonne : le public adore, et ${il} peut remercier le joueur (en privé ou en public).`, c.id);
  addEcho(g, 'advice', { c: c.id, text: a.what });
}
function adviceFlop(g, c, a, post) {
  const t = later(), first = c.name.split(' ')[0], il = gx(c.g, 'il', 'elle', 'iel'), decu = gx(c.g, 'déçu', 'déçue', 'déçu·e');
  const loss = Math.round(c.followers * rand(0.005, 0.02));
  c.followers = Math.max(12, c.followers - loss);
  a.state = 'flop';
  a.res = { fol: -loss };
  applyTrust(g, c, -3, 'ton conseil a fait un flop', t + 1200);
  applyRel(g, c, -2, 'ton conseil a fait un flop', t + 1800, 5);
  addNotif(g, { k: 'advice', c: c.id, p: post.id, at: t, text: `💡 Ton conseil a fait un flop : « ${str(a.what, 60)} » est passé inaperçu, ${first} est ${decu}.` });
  adviceCard(g, c, a, `Presque personne n’a réagi. ${first} est ${decu}.`);
  addTrigger(g, `@${c.handle} a suivi un conseil du joueur (« ${str(a.what, 80)} ») mais ça a fait un flop : presque personne n’a réagi, ${il} est ${decu}.`, c.id);
}
const ADVICE_BUZZ = [
  (h, t) => `mais qu’est-ce qui est passé par la tête de @${h} 💀 ${t}`,
  (h, t) => `@${h} a vraiment publié ça en pensant que ça passerait ? ${t}`,
  (h, t) => `le malaise de l’année, merci @${h} ${t}`,
  (h, t) => `quelqu’un peut expliquer à @${h} pourquoi c’était une mauvaise idée ? ${t}`,
];
function adviceBuzz(g, c, a, post) {
  const t = later(), first = c.name.split(' ')[0];
  const loss = Math.round(c.followers * rand(0.06, 0.12));
  c.followers = Math.max(12, c.followers - loss);
  c.badBuzz = { at: t, until: t + BADBUZZ_MS, reason: str(a.what, 140), loss, strength: clamp(0.5 + 0.1 * a.risk, 0, 1), advice: a.id };
  c.buried = false;
  a.state = 'buzz';
  a.res = { fol: -loss };
  addAmbientPost(g, { by: pick(CANCEL_NPCS)[0], text: pick(ADVICE_BUZZ)(c.handle, '#' + pascalHandle(c.handle) + 'Gate') }, t + randi(3000, 7000));
  addNotif(g, { k: 'badbuzz', c: c.id, p: post.id, at: t, text: `🔥 ${c.name} est en plein bad buzz après « ${str(a.what, 60)} » : −${nAbonnes(loss)}` });
  addChronicle(g, `${c.name} (@${c.handle}) s’est pris un bad buzz avec « ${str(a.what, 80)} ».`);
  // Did they understand who pushed them into it? The worse the advice and the warier they are, the likelier.
  const pCaught = clamp(0.15 + 0.15 * Math.max(0, -a.q) + 0.1 * (gardeOf(c) - 2) - (trustOf(c) >= 90 ? 0.15 : 0) + (enemies(g).some((x) => x !== c) ? 0.08 : 0), 0.05, 0.85);
  if (roll() < pCaught) { adviceCaught(g, c, a, loss); return; }
  applyTrust(g, c, -8, 'ton conseil lui a valu un bad buzz', t + 1500);
  applyRel(g, c, -4, 'ton conseil lui a valu un bad buzz', t + 2000, 8);
  addMem(g, c, 'le conseil du joueur m’a valu un bad buzz');
  adviceCard(g, c, a, `−${nAbonnes(loss)} pour ${first}, et le réseau se moque. ${cap1(gx(c.g, 'il', 'elle', 'iel'))} ne te soupçonne pas… pour l’instant.`);
  addTrigger(g, `@${c.handle} est en plein bad buzz après « ${str(a.what, 80)} » (une idée suivie sur le conseil du joueur, mais le public l’ignore) : moqueries, critiques, un média s’en empare ; @${c.handle} réagit (déni, excuses ou contre-attaque).`, c.id);
}
// They understood: trust gone, and maybe the whole network hears it.
function adviceCaught(g, c, a, loss) {
  const t = later(), s = g.stats, first = c.name.split(' ')[0];
  const il = gx(c.g, 'il', 'elle', 'iel'), pg = gx(c.g, 'piégé', 'piégée', 'piégé·e'), fur = gx(c.g, 'furieux', 'furieuse', 'furieux·se');
  applyTrust(g, c, -45, `a compris que tu l’as ${pg}`, t + 1500);
  applyRel(g, c, -20, `a compris que tu l’as ${pg}`, t + 2000, 25);
  addMem(g, c, `le joueur m’a ${pg} avec un conseil pourri`);
  addEcho(g, 'caught', { c: c.id, text: a.what });
  const pub = roll() < 0.45 + 0.12 * (gardeOf(c) - 1);
  a.caught = pub ? 'public' : 'private';
  if (pub) {
    const lost = Math.round(s.followers * 0.02);
    s.followers = Math.max(0, s.followers - lost);
    const dr = repMove(g, { kind: -20, cred: -12 }, `${first} raconte que tu l’as ${pg}`, { noCheck: true });
    markShady(g, c);
    addNotif(g, { k: 'screen', c: c.id, at: t + 2500, text: `😬 ${first} a compris que tu l’as ${pg} et te balance en public : ${repWord(dr)}${lost ? `, −${nAbonnes(lost)}` : ''}. Les autres se méfieront de tes conseils.` });
    adviceCard(g, c, a, `−${nAbonnes(loss)} pour ${first}… qui a compris que tu l’as ${pg}, et le dit à tout le monde.`);
    addChronicle(g, `${c.name} accuse ${g.player.name} de l’avoir ${pg} avec un conseil pourri.`);
    addTrigger(g, `@${c.handle} a compris que le joueur l’a ${pg} avec son conseil (« ${str(a.what, 70)} ») et le dénonce publiquement, ${fur} : tout le monde se méfie maintenant des conseils du joueur.`, c.id);
    checkCancel(g);
  } else {
    addNotif(g, { k: 'reldown', c: c.id, at: t + 2500, text: `😬 ${first} a compris que ton conseil était un piège.` });
    adviceCard(g, c, a, `−${nAbonnes(loss)} pour ${first}… qui a compris que ton conseil était un piège.`);
    addTrigger(g, `@${c.handle} a compris que le joueur l’a ${pg} avec son conseil (« ${str(a.what, 70)} ») : ${il} le lui fait savoir en privé, froidement (ou ne lui répond plus).`, c.id);
  }
}

/* ---------- a secret confided ---------- */
// At 70 of trust and more they may tell the player their secret (a line of the DM). Kept, it builds trust; out, it is
// the worst betrayal there is.
function confideSecret(g, c, msgId) {
  if (!c || !isMain(c) || !c.secret || c.secretOut || c.secretTold || trustOf(c) < 70) return false;
  c.secretTold = { at: Date.now(), m: msgId || null };
  addNotif(g, { k: 'secret', c: c.id, at: later() + 1500, text: `🤫 ${c.name} t’a confié son secret. À toi de le garder… ou pas.` });
  addMem(g, c, 'j’ai confié mon secret au joueur');
  addChronicle(g, `${c.name} a confié son secret à ${g.player.name}.`, [c.id]);
  return true;
}
function secretBetrayed(g, c) {
  if (!c || !c.secretTold || c.secretBetrayed) return;
  c.secretBetrayed = true;
  const t = later() + 2500, il = gx(c.g, 'il', 'elle', 'iel');
  applyTrust(g, c, -100, 'tu as révélé son secret', t);
  applyRel(g, c, -30, `tu as révélé ce qu’${il} t’avait confié`, t + 500, 40);
  addMem(g, c, 'le joueur a révélé le secret que je lui avais confié');
  addEcho(g, 'betray', { c: c.id });
  repMove(g, { kind: -20 }, `tu as trahi le secret de ${c.name}`); // 0.10: it gets around
  markShady(g, c);
  addTrigger(g, `@${c.handle} sait que c’est le joueur qui a révélé son secret, qu’${il} lui avait confié en privé : trahison, et ${il} le dit à tout le monde.`, c.id);
}

/* ---------- what the AI is told ---------- */
const TRUST_LINE = (c) => `- Facultatif (au plus 1) : {"t":"trust","d":2,"why":"≤ 70 caractères"} seulement si la confiance de ${c.name} envers le joueur bouge vraiment (d de -15 à 8) : elle monte doucement quand il est sincère, tient parole, garde un secret, le soutient dans un moment dur ou donne un conseil sensé (+1 à +4, jusqu’à +8 pour un vrai geste) ; elle chute s’il ment, se contredit, manipule, menace ou trahit (-4 à -15). Un message simplement sympa ne change rien.`;
const ACT_TRUST_LINE = '- Facultatif (au plus 2) : {"t":"trust","by":"handle d’un personnage principal","d":3,"why":"≤ 70 caractères"} si l’action change vraiment la confiance d’un personnage envers le joueur : il le défend en public ou tient parole (d de 1 à 8) ; il ment, le trahit ou balance ce qu’on lui a confié (d de -4 à -15).';
const CONFIDE_LINE = (c) => `- Facultatif, rare : ${c.name} a assez confiance pour confier son secret au joueur, si la conversation s’y prête vraiment (jamais forcé, une seule fois) : écris l’aveu dans ses messages, puis une ligne {"t":"confide"}.`;
const canConfide = (c) => !!(c && isMain(c) && c.secret && !c.secretOut && !c.secretTold && trustOf(c) >= 70);
// For the DM: who they are toward the player, beyond the relation.
function trustDMLine(c) {
  const t = trustOf(c);
  return `confiance ${t}/100 (${(t >= 15 && t < 40 ? gx(c.g, 'méfiant', 'méfiante', 'méfiant·e') : trustLabel(t, c.g)).toLowerCase()}) ; ${gardeLabel(c).toLowerCase()} : ${gardeWhy(c)}${fameNote(c) ? ' ; ' + fameNote(c) : ''}`;
}
// The player gives advice: the rule of the game, written for the model, and the line it answers with.
function adviceAsk(g, c) {
  const t = trustOf(c), il = gx(c.g, 'il', 'elle', 'iel'), lui = gx(c.g, 'lui', 'elle', 'iel');
  const pa = plannedAdvice(g, c);
  return ['', '## CE MESSAGE EST UN CONSEIL',
    `Le joueur conseille à ${c.name} de faire quelque chose de précis : publier un post, faire une vidéo ou un live sur un sujet, répondre à quelqu’un d’une certaine façon…`,
    `Confiance de ${c.name} envers le joueur : ${t}/100. Règle du jeu, selon le risque du conseil pour ${lui} :`,
    '- risque 0 (anodin : le sujet d’un post, le ton d’une réponse) : suivi à partir de 40 de confiance ;',
    '- risque 1 (notable : une vidéo sur un sujet sensible, répondre à un clash, viser quelqu’un en public) : à partir de 70 ;',
    '- risque 2 (gros risque pour son image : provoquer tout le réseau, révéler quelque chose, changer complètement d’image) : à partir de 90.',
    `Sous le seuil, ${il} refuse ou se méfie, dans sa voix. Même en confiance aveugle, ${il} refuse ce qui va contre ses valeurs ou ses intérêts évidents, et jamais rien de haineux, d’illégal ou de dangereux.`,
    `Juge en secret si ce conseil est bon POUR ${lui.toUpperCase()} : q de -3 (un conseil pourri qui lui vaudra un bad buzz) à 3 (un excellent conseil).`,
    pa ? `${c.name} avait déjà prévu de suivre un autre conseil du joueur (« ${pa.what} ») : s’${il} accepte celui-ci, il le remplace.` : null,
  ].filter((x) => x !== null);
}
const ADVICE_LINE = '- D’abord une ligne : {"t":"advice","risk":1,"q":0,"follow":true,"kind":"post","what":"≤ 80 caractères : ce qu’il ou elle va faire","text":"≤ 220 caractères : son futur post (ou sa réponse), dans sa voix, tel qu’il sera publié","to":"handle de la personne à qui il ou elle répondra, sinon vide","in":90}\n  follow = false s’il ou elle refuse (alors ni "what" ni "text"). kind parmi post, video, reply (reply : répondre à quelqu’un, avec "to"). "in" = minutes avant de le faire, d’après ce qui se dit (10 à 1440).';

/* ---------- screens ---------- */
function TrustMeter({ t }) {
  return html`<div class="trustmeter" role="img" aria-label=${'Confiance ' + t + ' sur 100'}><i style=${'--p:' + clamp(t, 0, 100) + '%'}></i>${TRUST_STEPS.map((s) => html`<b key=${s} class=${t >= s ? 'on' : ''} style=${'--at:' + s + '%'}></b>`)}</div>`;
}
function openAdvice(id) {
  S.drafts.adv = S.drafts.adv || {};
  S.drafts.adv[id] = true;
  openDM(id);
}
// On a main character's profile: where trust stands, what makes it hard, what comes next.
function TrustSection({ g, c, now }) {
  const t = trustOf(c), first = c.name.split(' ')[0];
  const pa = plannedAdvice(g, c);
  const fame = fameNote(c);
  return html`<section class="section trust-sec">
    <div class="section-h"><h3>Sa confiance en toi</h3><span class="mono">${t}/100</span></div>
    <div class="trust-head"><span class=${'chip ' + (t >= 70 ? 'good' : t >= 40 ? 'hot' : '')}><${Icon} n="trust" s=${14} /> ${trustLabel(t, c.g)}</span>${t >= 40 ? html`<span class="trust-garde"><b>${gardeLabel(c)}</b> · ${gardeWhy(c)}${fame ? ' · ' + fame : ''}</span>` : null}</div>
    <${TrustMeter} t=${t} />
    <div class="trust-steps" aria-hidden="true">${[[40, 'petits conseils'], [70, 'gros conseils, secrets'], [90, 'confiance aveugle']].map(([s, lb]) => html`<span key=${s} class=${t >= s ? 'on' : ''}>${s} · ${lb}</span>`)}</div>
    <p class="muted trust-next">${trustNext(c)} ${TRUST_HOW}</p>
    ${pa ? html`<p class="trust-plan">💡 ${first} prévoit de suivre ton conseil : « ${str(pa.what, 70)} » · ${fmtWhen(pa.due, now)}</p>` : null}
    <div class="row"><button class="btn btn-ghost btn-sm" onClick=${() => openAdvice(c.id)}><${Icon} n="bulb" s=${15} /> Donner un conseil à ${first}</button></div>
  </section>`;
}
// The secret they told the player: kept here, where the player can see what they hold.
function SecretToldSection({ c }) {
  if (!c.secretTold || c.secretOut || !c.secret) return null;
  const il = gx(c.g, 'il', 'elle', 'iel');
  return html`<section class="section secret-told">
    <div class="section-h"><h3>🤫 Ce qu’${il} t’a confié</h3><span>toi seul${px(S.game, '', 'e', '·e')} le sais</span></div>
    <p>${c.secret}</p>
    <small class="muted">${c.secretKept ? `${cap1(il)} sait que tu as su te taire.` : 'Garde-le pour toi… ou pas. Si ça sort, ' + il + ' saura que c’est toi.'}</small>
  </section>`;
}
// In the conversation: the advice they will follow, with a way to jump to it.
function AdviceChip({ g, a, now }) {
  const c = g.chars[a.c];
  if (!c) return null;
  const K = ADVICE_KINDS[a.kind] || ADVICE_KINDS.post;
  const due = () => { const x = S.game && (S.game.advice || []).find((y) => y.id === a.id && y.state === 'planned'); return x ? x.due : 0; };
  return html`<div class="evt-chip adv-chip" onClick=${stop(() => {})}>
    <span class="evt-emo" aria-hidden="true">${K.emoji}</span>
    <span class="evt-mid"><b>${c.name.split(' ')[0]} suit ton conseil</b><small>${fmtWhen(a.due, now)} · « ${str(a.what, 70)} »</small></span>
    <span class="evt-acts"><button class="btn btn-ghost btn-sm" onClick=${stop(() => skipTime(a.due - Date.now() + 1000, due))}><${Icon} n="ffwd" s=${14} /> Avancer</button></span>
  </div>`;
}
const ADVICE_CARD = { win: ['💡 Conseil suivi · ça a cartonné', 'top'], flop: ['💡 Conseil suivi · flop', ''], buzz: ['💡 Conseil suivi · bad buzz', 'flop'], bailed: ['💡 Conseil laissé tombé', 'cancel'] };
function AdviceCard({ m }) {
  const [label, cls] = ADVICE_CARD[m.state] || ADVICE_CARD.flop;
  return html`<div class=${'dm-card adv ' + cls}><span class="evt-kind">${label}</span><b>« ${m.title} »</b>${m.text ? html`<p>${m.text}</p>` : null}</div>`;
}
// Above the DM box, in advice mode: what this level of trust allows.
function adviceHint(c) {
  const t = trustOf(c), first = c.name.split(' ')[0], il = gx(c.g, 'il', 'elle', 'iel');
  if (t < 40) return `${first} ne t’écoute pas encore (confiance ${t}/100, il en faut 40) : ${il} risque de refuser.`;
  if (t < 70) return `${first} suit tes petits conseils (un post, le ton d’une réponse). Pour une vidéo ou un clash, il faut 70.`;
  if (t < 90) return `${first} suit tes gros conseils (une vidéo, sa réponse à un clash). Les plus risqués demandent 90.`;
  return `${first} a une confiance aveugle en toi : ${il} suivra presque tout.`;
}
