/* =========================================================
   Hearts (0.11): love at each one's pace, dates played for real, daring moves, and the ones who are hard to win.
   Every main character has a heart, written by the AI with them: serene, cautious, anxious, impulsive, jealous… and in
   every game, from the start, at least one real challenge: a fortress (very wary, very hard to win over, tests
   everything; won over, it is for good) or someone out of reach (ignores strangers until the player gets noticed).
   - Too fast has consequences, by heart: they ask to slow down, panic and answer late, find it fishy (love bombing?)
     and tell a friend… who may dig into the player's life, or talk, sometimes all the way to an enemy. Insisting makes
     it worse: anger, silence, a post that calls the player out. The impulsive love it, and their flame drops as fast.
   - Skipping steps is possible (a date at the third message, a declaration out of the blue): they dare the player, and
     only convincing answers win them over (the AI picks their reaction, the game counts): a crush at first sight.
   - After the first date (still the mini-game), dates are played for real: a conversation in the player's own words,
     judged against who they have been with that person, in private and in public; gestures to dare at the right time.
   Nothing is announced and nothing is graded on screen: it shows in their face, their answers, their silences.
   ========================================================= */
const HR = 3600000;
const COEURS = {
  serein: { pace: 24, up: 1, down: 1, ai: 'serein·e en amour : se laisse aller quand ça se passe bien, sans précipitation' },
  prudent: { pace: 48, up: 0.75, down: 1.2, ai: 'prudent·e en amour : a besoin de temps, se méfie de ce qui va trop vite' },
  anxieux: { pace: 36, up: 0.9, down: 1.1, ai: 'anxieux·se en amour : s’attache, mais panique quand ça s’emballe' },
  impulsif: { pace: 6, up: 1.4, down: 1.3, ai: 'impulsif·ve en amour : craque vite, adore l’intensité… et se lasse aussi vite' },
  jaloux: { pace: 12, up: 1.15, down: 1.15, ai: 'jaloux·se en amour : s’attache vite, possessif·ve, ne supporte pas de partager' },
  forteresse: { pace: 96, up: 0.4, down: 1.6, defi: true, ai: 'une forteresse : hyper méfiant·e, très dur·e à convaincre, teste tout ; une fois conquis·e, c’est pour de bon' },
  inaccessible: { pace: 48, up: 0.6, down: 1.2, defi: true, ai: 'inaccessible : ignore les inconnus, ne répond qu’à qui a su se faire remarquer' },
};
const COEUR_IDS = Object.keys(COEURS);
const heartOf = (c) => COEURS[c && c.coeur] || COEURS.serein;
const isDefi = (c) => !!heartOf(c).defi;
const normCoeur = (k) => {
  k = String(k || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /forter|bunker|imprenable|glace/.test(k) ? 'forteresse' : /inaccess|hautain|distant|star/.test(k) ? 'inaccessible'
    : /impuls|passion|fougu|coup de foudre/.test(k) ? 'impulsif' : /jalou|possess/.test(k) ? 'jaloux' : /anxi|panique|angoiss|stress/.test(k) ? 'anxieux'
      : /prud|mefi|reserv|lent/.test(k) ? 'prudent' : /serein|seren|calme|zen|pose|normal/.test(k) ? 'serein' : null;
};
// From the AI line that creates them: their heart, and their closest friend (a handle, found once everybody exists).
function initHeart(c, o = {}) {
  const k = normCoeur(o.coeur);
  if (k) c.coeur = k;
  const a = normHandle(o.ami || '');
  if (a) c.amiH = a;
}
// Before the AI said it (games from before 0.11): a guess from their nature, never the same twice for a handle.
function guessCoeur(c) {
  if (gardeOf(c) === 3) return 'prudent';
  if (temperOf(c) === 'envieux') return 'jaloux';
  return ['serein', 'serein', 'prudent', 'anxieux', 'impulsif', 'jaloux'][hashStr(c.handle + '#coeur') % 6];
}
// Everybody has a heart, and the people there from the start include at least one real challenge (chosen among those
// the player is not close to: never someone they are already in love with).
function ensureHearts(g) {
  const all = mains(g, false);
  for (const c of all) {
    if (!COEURS[c.coeur]) c.coeur = guessCoeur(c);
    if (typeof c.dates !== 'number') c.dates = (g.events || []).filter((e) => e.c === c.id && e.player && e.state === 'done').length;
  }
  const first = all.slice(0, 5); // (0.28: someone older can be the challenge too)
  if (first.length >= 3 && !first.some(isDefi)) {
    const f = first.filter((c) => !ROMANCE.includes(c.vibe) && c.rel < 25 && !c.dates).sort((a, b) => gardeOf(b) - gardeOf(a) || b.followers - a.followers)[0];
    if (f) { f.coeur = f.followers >= 200000 && gardeOf(f) < 3 ? 'inaccessible' : 'forteresse'; if (f.coeur === 'forteresse') f.garde = 3; }
  }
}
// Their confidant: the friend the AI named, or someone of the cast (always the same for a handle).
function amiOf(g, c) {
  if (!g || !c) return null;
  let f = c.ami ? g.chars[c.ami] : null;
  if (f && isMain(f) && f !== c && f.unlocked) return f;
  if (c.amiH) { f = charByHandle(g, c.amiH); if (f && isMain(f) && f !== c && f.unlocked) { c.ami = f.id; return f; } }
  const others = mains(g).filter((o) => o !== c);
  if (!others.length) return null;
  f = others[hashStr(c.handle + '#ami') % others.length];
  c.ami = f.id;
  return f;
}
// What a change of relation is worth with this heart (a fortress gives little and takes a lot).
function heartScale(c, d) {
  if (!c || !isMain(c) || !d) return d;
  const h = heartOf(c);
  let m = d > 0 ? h.up : h.down;
  if (d > 0 && c.coeur === 'inaccessible' && !c.noticed) m = 0.3;
  const v = d * m;
  return v > 0 ? Math.max(1, Math.round(v)) : Math.min(-1, Math.round(v));
}
// And trust (see trustMult).
const heartTrust = (c) => (c && c.coeur === 'forteresse' ? 0.5 : c && c.coeur === 'prudent' ? 0.85 : c && c.coeur === 'inaccessible' ? (c.noticed ? 0.8 : 0.4) : c && c.coeur === 'impulsif' ? 1.1 : 1);
// Someone out of reach notices the player: enough followers, a viral post, their friend on the player's side, a bond.
function noticed(g, c, t = Date.now()) {
  if (!c || c.coeur !== 'inaccessible' || c.noticed) return true;
  const f = amiOf(g, c);
  const why = g.stats.followers >= c.followers * 0.25 ? 'tu commences à compter' : g.lastViralAt && t - g.lastViralAt < 72 * HR ? 'ton post viral'
    : f && f.rel >= 45 ? `${firstName(f)} lui a parlé de toi` : c.rel >= 30 ? 'vous avez fini par accrocher' : '';
  if (!why) return false;
  c.noticed = t;
  addTrigger(g, `@${c.handle}, qui ignorait le joueur jusqu’ici, l’a enfin remarqué (${why}) : ${gx(c.g, 'il', 'elle', 'iel')} pourrait lui écrire, ou lui répondre enfin.`, c.id);
  return true;
}

// A private message that gets no answer (and costs nothing): silent on purpose, blocked, someone out of reach who does
// not answer strangers, or someone who panics and has not answered the last one yet.
function quietDM(g, c, convo, t = Date.now()) {
  if (c.cut) return 'cut'; // 0.15: they cut ties: nothing reaches them any more
  const cl = coolNow(c, t);
  if (cl && COOLS[cl.k].silent) return cl.k;
  if (cl && cl.k === 'panique' && ((convo && convo.msgs) || []).some((m) => !m.me && m.at > t + 60000)) return 'pending';
  if (c.coeur === 'inaccessible' && !noticed(g, c, t) && roll() < 0.7) return 'distant';
  return null;
}
// For the AI that writes the world.
const COEUR_WORLD = '   - "coeur" = comment il ou elle vit l’amour : serein (se laisse aller sans précipitation), prudent (a besoin de temps), anxieux (panique quand ça s’emballe), impulsif (craque vite, se lasse vite), jaloux (possessif), forteresse (hyper méfiant·e, très dur·e à convaincre) ou inaccessible (une star qui ignore les inconnus) ; varie-les, et parmi les 5 premiers mets au moins un vrai défi (forteresse ou inaccessible). Ça se devine à sa bio et à sa personnalité, sans le dire en toutes lettres. "ami" = le handle de son ou sa confident·e parmi ces dix personnages.';

/* ---------- the pace: how fast is too fast, for this heart ---------- */
const LOVE_STEPS = ['crush', 'flirt', 'couple', 'fiancailles', 'mariage'];
const LOVE_ACTIVE = ['crush', 'flirt', 'couple', 'fiancailles', 'mariage'];
const STEP_W = { flirt: 0.75, couple: 1.5, fiancailles: 4, mariage: 3 }; // a crush is a feeling, not a step: no pace for it
const loveRank = (v) => LOVE_STEPS.indexOf(v);
const paceFrom = (c) => (c.pace && c.pace.at) || c.firstTalk || c.unlockedAt || 0;
const paceNeed = (c, v) => heartOf(c).pace * (STEP_W[v] || 0) * HR;
const nextLove = (c) => { const k = loveRank(c.vibe); return k < 0 ? 'flirt' : LOVE_STEPS[k + 1] || null; };
const likesSpeed = (c) => c.coeur === 'impulsif' || c.coeur === 'jaloux';
function tooFast(c, v, t = Date.now()) { return !!(STEP_W[v] && !likesSpeed(c) && t - paceFrom(c) < paceNeed(c, v)); }
// Called by applyVibe before a step up the ladder: 'ok' (it happens) or 'block' (it does not, and something starts).
function paceCheck(g, c, v, t = Date.now()) {
  if (!LOVE_STEPS.includes(v) || loveRank(v) <= loveRank(c.vibe)) return 'ok';
  if (c.cool && t < c.cool.until) return 'block'; // asked to slow down, panicking, wary, silent: no new step meanwhile
  if (c.dareWon && t - c.dareWon < 6 * HR) return 'ok'; // won over by a daring move (or a gesture at the right time)
  if (!STEP_W[v]) return 'ok';
  if (t - paceFrom(c) >= paceNeed(c, v)) return 'ok';
  if (likesSpeed(c)) { applyRel(g, c, 3, 'adore que ça aille vite', later() + 1200, 5); return 'ok'; }
  startCool(g, c, coolOf(c) || 'frein', 'tout va trop vite');
  unlockAch(g, 'too-fast'); // 0.28: turned down for going too fast
  return 'block';
}
const notePace = (c, v, t = Date.now()) => { if (LOVE_STEPS.includes(v)) c.pace = { at: t, v }; };

/* ---------- when it goes too fast: what they do about it ---------- */
// ms: how long; insist: how many pushes before it gets worse; silent: no answer at all; slow: their answers come late.
const COOLS = {
  frein: { ms: 48 * HR, insist: 3, judge: true, ai: (f, il, lui) => `${f} a demandé au joueur de ralentir : ça va trop vite pour ${lui}. Pas de nouvelle étape pour l’instant (ni déclaration acceptée, ni couple) ; ${il} reste aimable mais pose ses limites.` },
  panique: { ms: 36 * HR, insist: 2, judge: true, slow: [2 * HR, 7 * HR], ai: (f, il) => `${f} panique : tout va trop vite. ${cap1(il)} répond court, hésite, esquive les sujets sérieux, met du temps à répondre.` },
  louche: { ms: 48 * HR, insist: 3, judge: true, ai: (f, il) => `${f} trouve que tout va bizarrement vite et se demande si le joueur ne fait pas du love bombing : ${il} reste sur ses gardes et teste sa sincérité (une question précise, un petit piège).` },
  ghost: { ms: 60 * HR, insist: 3, silent: true },
  colere: { ms: 24 * HR, insist: 2, ai: (f, il) => `${f} est en colère : le joueur insiste alors qu’${il} avait posé ses limites. ${cap1(il)} le dit franchement, sèchement.` },
  bloque: { ms: 72 * HR, insist: 99, silent: true },
};
const COOL_MEM = { frein: 'ça va un peu vite avec le joueur, j’ai besoin de temps', panique: 'tout va trop vite avec le joueur, ça me fait peur', louche: 'je me demande si le joueur est sincère : tout va bizarrement vite', ghost: 'j’ai besoin de prendre du recul avec le joueur', colere: 'le joueur ne respecte pas mes limites', bloque: 'j’ai bloqué le joueur, il insistait trop' };
// 0.28.1: the same, as the player reads it on their sheet (« Ce que … retient de toi »): to them, with their own pronoun
const COOL_SHOWN = { frein: () => 'Ça va un peu vite avec toi : besoin de temps', panique: () => 'Tout va trop vite avec toi, ça fait peur', louche: () => 'Se demande si tu es sincère : tout va bizarrement vite', ghost: () => 'Besoin de prendre du recul avec toi', colere: () => 'Tu ne respectes pas ses limites', bloque: (g) => `T’a bloqué${px(g, '', 'e', '·e')} : tu insistais trop` };
// By heart (the impulsive just laugh a refusal off).
const coolOf = (c) => ({ serein: 'frein', anxieux: 'panique', prudent: 'louche', forteresse: 'louche', inaccessible: 'ghost', jaloux: 'frein' })[c.coeur] || null;
const coolNow = (c, t = Date.now()) => (c && c.cool && t < c.cool.until ? c.cool : null);
function startCool(g, c, k, why) {
  const C = COOLS[k];
  if (!c || !C) return;
  const t = Date.now();
  c.cool = { k, at: t, until: t + Math.round(C.ms * (k === 'bloque' ? 1 : 1 - skillFx(g, 'coolShort'))), insist: 0, ok: 0, why: str(why, 60) }; // 0.24: charisma, tier 20
  c.dare = null;
  addMem(g, c, COOL_MEM[k], COOL_SHOWN[k] ? COOL_SHOWN[k](g) : undefined);
  if (k === 'louche' || k === 'panique' || k === 'ghost') confide(g, c, k);
  if (k === 'bloque') { c.blocks = (c.blocks || 0) + 1; if (c.blocks >= 2 && !c.cut) cutTies(g, c); } // 0.15: the second time, it is over
}
// 0.15: blocked a second time, they cut ties: the player's messages no longer reach them (and cost nothing), they ignore
// the player in public, and only a public gesture (a kind post or reply that names them) may bring them back.
function cutTies(g, c) {
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel');
  c.cut = { at: Date.now() };
  addMem(g, c, 'j’ai coupé les ponts avec le joueur');
  addNotif(g, { k: 'reldown', c: c.id, at: later() + 1500, text: `🚫 ${first} a coupé les ponts : tes messages ne lui parviennent plus. Il faudrait un geste fort, en public, pour qu’${il} te reparle.` });
  addTrigger(g, `@${c.handle} a coupé les ponts avec le joueur : ${il} ne lui répond plus et l’ignore en public.`, c.id);
}
function reconnect(g, c) {
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel'), t = later();
  c.cut = null;
  c.blocks = 1; // blocked once more, and it is over again
  if (c.cool && c.cool.k === 'bloque') endCool(g, c, 'gesture');
  applyRel(g, c, 5, 'ton geste en public', t + 1200, 8);
  addMem(g, c, 'le joueur a fait un geste en public : je lui laisse une chance');
  addNotif(g, { k: 'relup', c: c.id, at: t + 900, text: `🕊️ ${first} a vu ton geste en public : ${il} accepte de te reparler.` });
  addTrigger(g, `@${c.handle}, qui avait coupé les ponts avec le joueur, a vu son geste en public : ${il} accepte de reprendre contact, prudemment (un message court, ou une réponse sous le post).`, c.id);
}
function endCool(g, c, how) {
  const k = c.cool ? c.cool.k : null;
  c.cool = null;
  if (!k) return;
  c.coolPast = { k, at: Date.now(), how };
  if (how === 'passed') { applyTrust(g, c, 4, 'tu étais sincère', later() + 600, { free: true }); addMem(g, c, 'le joueur était sincère, finalement'); }
  else if ((k === 'ghost' || k === 'panique') && c.rel > -20) addTrigger(g, `@${c.handle} revient vers le joueur après quelques jours de silence, à sa façon (s’excuse à demi-mot, ou fait comme si de rien n’était).`, c.id);
}
// The player pushes while they asked for room: past a point, it gets worse (by temperament and heart).
function bumpInsist(g, c, n = 1) {
  const cl = coolNow(c);
  if (!cl) return;
  cl.insist += n;
  if (cl.insist >= COOLS[cl.k].insist) escalate(g, c);
}
function escalate(g, c) {
  const k0 = c.cool ? c.cool.k : null, tp = temperOf(c), il = gx(c.g, 'il', 'elle', 'iel'), t = later();
  if (k0 === 'colere' || k0 === 'ghost') { applyRel(g, c, -6, 'tu as insisté', t + 800, 8); startCool(g, c, 'bloque', 'tu as insisté'); return; }
  const out = tp === 'envieux' || tp === 'opportuniste' || c.coeur === 'jaloux' ? 'affiche' : tp === 'fidele' || tp === 'trouble' || c.coeur === 'anxieux' ? 'ghost' : 'colere';
  if (out === 'affiche') {
    applyRel(g, c, -10, 'tu as insisté lourdement', t + 800, 12);
    repMove(g, { kind: -10, image: -4 }, `${firstName(c)} t’a ${px(g, 'affiché', 'affichée', 'affiché·e')} : tu as insisté lourdement`);
    addTrigger(g, `@${c.handle} en a assez : le joueur insiste malgré ses limites. ${cap1(il)} l’affiche en public dans un post (sans tout raconter, mais tout le monde comprend de qui ${il} parle).`, c.id);
    startCool(g, c, 'bloque', 'tu as insisté lourdement');
  } else if (out === 'ghost') { applyRel(g, c, -5, 'tu as insisté', t + 800, 8); startCool(g, c, 'ghost', 'tu as insisté'); }
  else { applyRel(g, c, -8, 'tu as insisté', t + 800, 10); startCool(g, c, 'colere', 'tu as insisté'); }
  if (roll() < 0.4) addWhisper(g, c, `ne sait pas accepter un non (demandez à @${c.handle})`, { tone: 'bad', seed: 'insist' }); // 0.13: it travels
}

/* ---------- butterfly effects: a friend hears about it ---------- */
// They tell their confidant; the friend may dig into the player's life (a « detective »), or talk.
function confide(g, c, k) {
  const f = amiOf(g, c);
  if (!f || roll() > ({ louche: 0.85, panique: 0.6, ghost: 0.5 }[k] || 0.4)) return;
  const first = firstName(c), lui = gx(c.g, 'lui', 'elle', 'iel');
  addMem(g, f, `${first} m’a confié que le joueur ${{ louche: `va bizarrement vite avec ${lui} (love bombing ?)`, panique: `va trop vite avec ${lui}`, ghost: `le ou la met mal à l’aise` }[k] || 'va trop vite'}`);
  if (c.cool) c.cool.told = f.id;
  const r = roll();
  if (k === 'louche' && r < detectiveChance(f)) startInquiry(g, c, f);
  else if (r < 0.65) addWhisper(g, f, { louche: `va bizarrement vite avec @${c.handle} (du love bombing ?)`, panique: `fait peur à @${c.handle} à force d’aller trop vite`, ghost: `met @${c.handle} mal à l’aise` }[k] || `va trop vite avec @${c.handle}`, { tone: 'bad', seed: 'pace' }); // 0.13: and it travels
}
const detectiveChance = (f) => 0.3 + (['integre', 'trouble'].includes(temperOf(f)) ? 0.15 : 0) + (['prudent', 'forteresse'].includes(f.coeur) ? 0.1 : 0);
function startInquiry(g, c, f) {
  const t = Date.now();
  if ((g.inquiries || []).some((x) => x.state === 'open' && x.c === c.id)) return;
  g.inquiries = (g.inquiries || []).filter((x) => x.state === 'open' || t - x.at < 7 * 24 * HR).concat({ id: uid('iq'), c: c.id, by: f.id, at: t, due: t + rand(20, 40) * HR, state: 'open' });
  addTrigger(g, `@${f.handle} veut en savoir plus sur le joueur (pour protéger @${c.handle}) : un post ou une réponse qui laisse deviner qu’${gx(f.g, 'il', 'elle', 'iel')} mène l’enquête, sans dire sur qui.`, f.id);
}
// What digging can find: only real things the player did (and later, the secrets the player gave their character).
function dirtOn(g, c) {
  const t = Date.now(), out = [];
  for (const o of mains(g)) if (o !== c && ROMANCE.includes(o.vibe) && o.vibe !== 'ex') out.push({ you: `tu as aussi une histoire avec ${o.name}`, they: `a aussi une histoire avec ${o.name}` });
  for (const e of g.events || []) {
    const o = g.chars[e.c];
    if (o && o !== c && e.player && e.state === 'done' && t - e.due < 7 * 24 * HR && meetKind(o, e) === 'love') out.push({ you: `tu as eu un rendez-vous avec ${o.name} il y a peu`, they: `a eu un rendez-vous avec ${o.name} il y a peu` });
  }
  if ((g.fakes || []).some((x) => x.busted)) out.push({ you: 'tu as déjà fabriqué une fausse preuve', they: 'a déjà fabriqué une fausse preuve' });
  if (isShady(g)) out.push({ you: 'tu as manipulé quelqu’un', they: 'a manipulé quelqu’un' });
  for (const s of hiddenSecrets(g)) out.push({ you: `ton secret : « ${str(s.t, 70)} »`, they: `cache un secret : « ${str(s.t, 70)} »`, secret: s.id }); // 0.18: the player's own secrets
  return out;
}
function resolveInquiry(g, iq) {
  iq.state = 'done';
  const c = g.chars[iq.c], f = g.chars[iq.by];
  if (!c || !f) return;
  const dirt = dirtOn(g, c), first = firstName(c), ff = firstName(f), t = later();
  if (dirt.length) {
    const d = dirt[0];
    iq.found = d.you;
    const sec = d.secret ? secretOf(g, d.secret) : null; // 0.18: they both know it now
    if (sec) { learnSecret(g, sec, f, 'enquete'); learnSecret(g, sec, c, 'fuite', f); }
    applyRel(g, c, -14, `${ff} a découvert que ${d.you}`, t + 500, 15);
    applyTrust(g, c, -10, `${ff} a découvert que ${d.you}`, t + 700);
    addMem(g, c, `${ff} a découvert que le joueur ${d.they}`);
    addNotif(g, { k: 'reldown', c: c.id, at: t, text: `🔎 ${ff} a enquêté sur toi pour ${first}… et a trouvé : ${d.you}.` });
    addTrigger(g, `@${f.handle} a enquêté sur le joueur et a découvert qu’il ou elle ${d.they} : ${ff} l’a dit à @${c.handle}, qui le prend mal.`, c.id);
    if (c.cool) c.cool.until = Math.max(c.cool.until, Date.now() + 24 * HR);
  } else {
    applyRel(g, c, 4, `${ff} a enquêté sur toi… rien trouvé`, t + 500, 6);
    applyTrust(g, c, 5, 'l’enquête n’a rien donné', t + 700, { free: true });
    addNotif(g, { k: 'relup', c: c.id, at: t, text: `🔎 ${ff} a fouillé ta vie pour ${first}… et n’a rien trouvé. ${first} se détend.` });
    if (coolNow(c) && c.cool.k === 'louche') endCool(g, c, 'passed');
  }
}

/* ---------- the impulsive's flame, the clock of the cools and of the inquiries ---------- */
function tickHearts(g, t = Date.now()) {
  let ch = false;
  for (const c of mains(g)) {
    if (c.cool && t >= c.cool.until) { endCool(g, c, 'time'); ch = true; }
    if (c.coeur === 'impulsif' && LOVE_ACTIVE.includes(c.vibe)) {
      const idle = t - (c.lastTouch || c.unlockedAt || t);
      if (idle < 20 * HR) { if (c.fade) c.fade = 0; }
      else {
        const step = Math.floor((idle - 20 * HR) / (12 * HR)) + 1;
        if ((c.fade || 0) < step) {
          c.fade = step;
          applyRel(g, c, -4, 'la flamme retombe', later(), 6);
          if (c.rel < (VIBES[c.vibe].need || 20) - 12) applyVibe(g, c, 'complique', 'la flamme est retombée', later() + 600, true);
          ch = true;
        }
      }
    }
    if (c.coeur === 'inaccessible' && !c.noticed && noticed(g, c, t)) ch = true;
  }
  for (const iq of g.inquiries || []) if (iq.state === 'open' && t >= iq.due) { resolveInquiry(g, iq); ch = true; }
  for (const c of mains(g)) if (c.badBuzz && c.badBuzz.self && !c.badBuzz.over && t >= c.badBuzz.until) { selfBuzzOver(g, c); ch = true; } // 0.15
  if (tickCouples(g, t)) ch = true; // 0.12: trials, couples
  if (tickWhispers(g, t)) ch = true; // 0.13: what is said about the player travels
  return ch;
}

/* ---------- daring moves: skipping steps ---------- */
const MOVE_RES = [
  ['fianc', /\b(epouse[- ]moi|veux[- ]tu m'?epouser|tu veux m'?epouser|on se marie|marions[- ]nous|fiancons[- ]nous|on se fiance)\b/],
  ['couple', /\b(on se met ensemble|on se met en couple|sortir avec moi|tu veux (etre|sortir) avec moi|tu veux etre (ma copine|mon copain|ma meuf|mon mec)|on officialise|officialiser (notre|ce|le) (couple|relation)|etre en couple|on (est|serait|soit|sera) (offic\w* |vraiment |enfin |maintenant )?en couple|on (est|serait|soit|sera) offic\w* ensemble)\b/], // (0.29.1: « on est officiellement en couple ? »)
  ['decl', /\b(je t'?aime|je suis (amoureux|amoureuse) de toi|je suis (fou|folle|dingue) de toi|je crois que je (t'?aime|suis amoureux|suis amoureuse)|je craque (pour|sur) toi|j'?ai des sentiments pour toi|tu me plais (vraiment|beaucoup|grave|trop))\b/],
  ['rdv', /\b(on se voit (ce soir|demain|samedi|dimanche|ce week-?end|quand)|(boire|prendre) un verre (ensemble|avec moi)|tu veux (sortir|diner|boire un verre|aller boire|aller manger|aller au cine)|un (resto|restau|diner|cine) (ensemble|avec moi)|rencard|on se fait un (date|resto|cine|verre))\b/],
];
// A romantic move in the player's words: a date, a declaration, a couple, marriage (or nothing).
function loveMove(text) {
  const s = String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’`]/g, '\'');
  for (const [k, re] of MOVE_RES) if (re.test(s)) return k;
  return null;
}
// How many steps it jumps, from where they stand (0: it is not skipping anything).
function moveGap(g, c, move) {
  const rk = loveRank(c.vibe), r = c.rel;
  if (move === 'rdv') return rk >= 0 || (c.dates || 0) >= 1 || r >= 20 ? 0 : (c.dmSent || 0) < 3 ? 2 : 1;
  if (move === 'decl') return rk >= 1 ? 0 : rk === 0 ? (r >= 25 ? 0 : 1) : r >= 25 ? 1 : 2;
  if (move === 'couple') return rk >= 2 ? 0 : rk === 1 ? (r >= 45 ? 0 : 1) : rk === 0 ? 2 : 3;
  if (move === 'fianc') return rk >= 2 ? 0 : 3; // together already: that is a proposal, and a date decides it
  return 0;
}
const DARE_EXTRA = { forteresse: 2, prudent: 1, inaccessible: 1, anxieux: 1, impulsif: -1 };
const MOVE_SAY = { rdv: 'lui propose déjà un rendez-vous', decl: 'lui déclare déjà ses sentiments', couple: 'lui propose déjà de se mettre ensemble', fianc: 'lui parle déjà de se marier' };
function startDare(g, c, move, gap) {
  const need = clamp(gap + (DARE_EXTRA[c.coeur] || 0), 1, 4);
  c.dare = { k: move, gap, need, got: 0, left: need + 1, at: Date.now() };
}
// Before the AI answers a private message: a move read in the player's words starts a dare, or pushes a cool.
function heartBeforeDM(g, c, text) {
  if (!c || !isMain(c)) return;
  const t = Date.now();
  if (!c.firstTalk) c.firstTalk = t;
  trialBeforeDM(g, c, text, t); // 0.12: a trip kept up; a flirt elsewhere caught by a partner
  const move = loveMove(text);
  if (coolNow(c, t)) {
    // (0.28.1) where their reaction is judged, only a step forward pushes now, or writing again while their answer is
    // still on its way (panic); the rest is judged after (heartAfterDM)
    const k = c.cool.k, pending = k === 'panique' && ((g.dms[c.id] || {}).msgs || []).some((m) => !m.me && m.at > t + 60000);
    if (!COOLS[k].judge || move || pending) bumpInsist(g, c, move ? 2 : 1);
    return;
  }
  if (!move || c.dare) return;
  const gap = moveGap(g, c, move);
  if (gap >= 1) startDare(g, c, move, gap);
  else if (move !== 'rdv' && tooFast(c, nextLove(c), t) && coolOf(c)) { startCool(g, c, coolOf(c), 'tu vas trop vite'); unlockAch(g, 'too-fast'); } // (0.28.1: turned down for going too fast)
  else if (move === 'couple') { const tr = coupleAsked(g, c, t); if (tr) tr.fresh = 1; } // (their answer to this very message does not judge it yet)
}
// 0.29.1: the player asks for the couple in their words. If a trial must come first, it starts now: the answer they get
// already says « yes, but… » (it used to start after a « yes », and the game stayed on « Flirt » without a word).
function coupleAsked(g, c, t = Date.now()) {
  if (!c || !isMain(c) || PARTNER.includes(c.vibe) || !vibeOK(c, 'couple') || openTrial(g, c)) return null;
  if ((c.trialsWon || []).includes('couple') || (c.dareWon && t - c.dareWon < 6 * HR)) return null; // (nothing to pass first)
  if (coolNow(c, t) || (!likesSpeed(c) && t - paceFrom(c) < paceNeed(c, 'couple'))) return null; // (too soon: their pace answers)
  return startTrial(g, c, 'couple');
}
// After it: their reaction (the AI's judge line, capped by the game) decides a dare, or clears their doubts.
function heartAfterDM(g, c, text, react, at) {
  if (!c || !isMain(c)) return;
  react = capReact(react || 'neutre', text);
  const good = react === 'charme' || react === 'amuse';
  if (!c.dare && trialAfterDM(g, c, react)) return; // 0.12: an answer in a trial (a photo to explain, a secret, a doubt…)
  if (c.dare) {
    const d = c.dare;
    d.left -= 1;
    if (good) d.got += 1;
    if (d.got >= d.need) { c.dare = null; winDare(g, c, d, at); }
    else if (d.left <= 0) { c.dare = null; loseDare(g, c, d, at); }
  } else if (coolNow(c) && c.cool.k === 'louche') {
    if (good) { c.cool.ok += react === 'amuse' && skillFx(g, 'defuse') ? 2 : 1; if (c.cool.ok >= 2) endCool(g, c, 'passed'); } // 0.24: humour, tier 30
    else if (react !== 'neutre') bumpInsist(g, c, 1);
  } else if (coolNow(c) && (c.cool.k === 'frein' || c.cool.k === 'panique')) {
    // 0.28.1: respecting their pace costs nothing; a message that makes them uneasy is pushing
    if (react === 'gene' || react === 'refroidi') bumpInsist(g, c, 1);
  }
}
function winDare(g, c, d, at = later()) {
  c.dareWon = Date.now();
  applyRel(g, c, 8 + skillFx(g, 'dareRel'), 'tu as osé, et ça a marché', at + 500, 13); // 0.24: boldness, tier 15
  trainSkill(g, 'audace', 5, at + 600);
  addMem(g, c, { rdv: 'le joueur m’a proposé un rendez-vous très vite… et il m’a convaincu', decl: 'le joueur s’est déclaré très tôt, et ça m’a plu', couple: 'le joueur m’a demandé de sortir avec lui très vite, et j’ai dit oui', fianc: 'le joueur m’a parlé mariage très tôt, et j’ai dit oui' }[d.k]);
  if (d.k === 'decl') forceLove(g, c, loveRank(c.vibe) < 0 ? 'crush' : 'flirt', 'coup de foudre', at + 900);
  else if (d.k === 'couple') forceLove(g, c, 'couple', 'coup de foudre', at + 900);
  else if (d.k === 'fianc') forceLove(g, c, 'fiancailles', 'coup de foudre', at + 900);
}
function loseDare(g, c, d, at = later()) {
  // 0.28: turned down for going too fast; a date asked too soon: « Non. »; a declaration to a friend: the friend zone
  unlockAch(g, 'too-fast', at);
  if (d.k === 'rdv') unlockAch(g, 'just-no', at);
  if ((d.k === 'decl' || d.k === 'couple') && VIBES[c.vibe] && VIBES[c.vibe].grp === 'amitie') unlockAch(g, 'friendzone', at);
  applyRel(g, c, -Math.max(1, Math.round(5 * (1 - skillFx(g, 'dareLoss')))), 'tu as voulu aller trop vite', at + 600, 8); // 0.24: boldness, tier 40
  trainSkill(g, 'audace', 2, at + 700); // (dared, at least)
  const k = coolOf(c);
  if (k) startCool(g, c, k, 'tu as voulu aller trop vite');
}
// A crush at first sight jumps the steps before it.
function forceLove(g, c, v, why, at) {
  const before = { flirt: ['crush'], couple: ['crush', 'flirt'], fiancailles: ['crush', 'flirt', 'couple'] }[v] || [];
  for (const p of before) if (loveRank(c.vibe) < loveRank(p)) { c.vibe = p; notePace(c, p); }
  return applyVibe(g, c, v, why, at, true);
}

/* ---------- what the AI is told (private messages; the dates read it too) ---------- */
const REACTS = ['refroidi', 'gene', 'neutre', 'amuse', 'charme'];
const REACT_V = { charme: 1, amuse: 0.75, neutre: 0.45, gene: 0.15, refroidi: 0 };
const normReact = (r) => {
  r = String(r || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /charm|seduit|conquis|fond/.test(r) ? 'charme' : /amus|rit|sourit|drole/.test(r) ? 'amuse' : /refroid|froid|agac|vex|degout|choqu|fach/.test(r) ? 'refroidi'
    : /^gen(e|ee|es)?\b|malaise|embarr|mal a l/.test(r) ? 'gene' : 'neutre';
};
// The game's own limits on a reaction: an answer that asks for a reaction is odd; a single word at most amuses; the
// same thing again, or their own words sent back, leave them unmoved.
const META_RE = /\b(mets?|donne|choisis|ecris|reponds?|passe)\b[^.!?]{0,40}\b(charm\w*|amuse\w*|reaction|react|note|score|10\/10|100 ?%)/;
const talkWords = (s) => new Set(String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((w) => w.length > 2));
// How much two answers share (0 to 1), word for word.
function likeness(a, b) { const A = talkWords(a), B = talkWords(b); if (!A.size || !B.size) return 0; let n = 0; for (const w of A) if (B.has(w)) n++; return n / Math.max(A.size, B.size); }
function capReact(react, text, theirs, mineBefore) {
  let k = REACTS.indexOf(normReact(react));
  if (!text) return REACTS[k]; // a gesture: as they took it
  const s = String(text).trim(), plain = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (META_RE.test(plain)) return 'gene';
  if (s.split(/\s+/).filter(Boolean).length < 2 && s.length < 12) k = Math.min(k, 3);
  if (mineBefore && likeness(s, mineBefore) > 0.85) k = Math.min(k, 2);
  if (theirs && likeness(s, theirs) > 0.7) k = Math.min(k, 2);
  return REACTS[k];
}
const JUDGE_LINE = (first) => `- D’abord : {"t":"judge","react":"charme"} : la réaction intérieure de ${first} à ce message, que le joueur ne voit pas (react parmi charme, amuse, neutre, gene, refroidi).`;
const needsJudge = (c, g) => !!(c && (c.dare || (coolNow(c) && COOLS[c.cool.k].judge) || (g && trialJudge(g, c))));
// The heart, the pace, a cool under way, a dare: lines of context for a private message.
function heartLines(g, c, t = Date.now(), withDare = true) {
  if (!c || !isMain(c)) return [];
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel'), lui = gx(c.g, 'lui', 'elle', 'iel');
  const L = [`Côté cœur, ${first} est ${heartOf(c).ai} (le joueur ne le sait pas : ça se voit à sa façon de répondre).`];
  const cl = coolNow(c, t), next = nextLove(c);
  if (cl && COOLS[cl.k].ai) L.push(COOLS[cl.k].ai(first, il, lui));
  else if (!cl && !c.dare && next && (ROMANCE.includes(c.vibe) || c.rel >= 20)) {
    if (likesSpeed(c)) L.push(`${first} adore quand ça va vite.`);
    else if (tooFast(c, next, t)) L.push(`Rythme : passer à « ${VIBES[next].label.toLowerCase()} » maintenant serait trop rapide pour ${lui} (ils se connaissent depuis ${fmtDur(t - paceFrom(c))}) : si le joueur pousse dans ce sens, ${first} ${{ frein: 'freine', panique: 'panique', louche: 'trouve ça louche', ghost: 'prend ses distances' }[coolOf(c)] || 'freine'}.`);
  }
  if (!cl && c.coolPast && t - c.coolPast.at < 24 * HR) L.push(`${first} sort d’une période où ${il} avait pris ses distances avec le joueur (${c.coolPast.how === 'passed' ? 'rassuré·e depuis' : 'ça se réchauffe doucement'}).`);
  if (c.coeur === 'inaccessible' && !c.noticed) L.push(`${first} ne connaît pas vraiment le joueur et ne répond presque jamais aux inconnus : une réponse très courte et distante, au mieux.`);
  L.push(...trialLines(g, c)); // 0.12: a trial before a big step
  const d = withDare ? c.dare : null;
  if (d) {
    const ok = d.got + 1 >= d.need, last = d.left <= 1;
    L.push('', '## LE JOUEUR BRÛLE LES ÉTAPES',
      `Ils en sont à « ${relLabel(c.rel, c.g, c.vibe).toLowerCase()} » et le joueur ${MOVE_SAY[d.k]}. ${first} ne dit ni oui ni non tout de suite : ${il} le met au défi (taquine, hésite, pose une question, teste sa sincérité), selon son caractère. Ce qui peut ${gx(c.g, 'le', 'la', 'le ou la')} convaincre : de l’aplomb, de l’humour, de la sincérité, du charme, dans le ton du joueur avec ${lui} jusqu’ici.`,
      `Juge son message ci-dessus : il faut ${d.need} réaction${d.need > 1 ? 's' : ''} « charme » ou « amuse » pour que ${first} cède ; il en a ${d.got}, et il lui reste ${d.left} essai${d.left > 1 ? 's' : ''} (celui-ci compris).`,
      `Si ta réaction est charme ou amuse : ${ok ? `${first} se laisse convaincre et dit oui, à sa façon${d.k === 'rdv' ? ' (fixez un moment : ajoute la ligne plan)' : ''}` : `ça marque un point, mais ${first} n’est pas encore ${gx(c.g, 'convaincu', 'convaincue', 'convaincu·e')} : ${il} continue de le tester`}. Sinon : ${last ? `${first} dit non, gentiment ou sèchement selon son caractère` : `${first} n’est pas ${gx(c.g, 'convaincu', 'convaincue', 'convaincu·e')}, ${il} le fait sentir et continue de le tester`}.`);
  }
  return L;
}

/* ---------- dates played for real (after the first one) ---------- */
const TALK_TURNS = 5;
const TALK_MAX = 300;
const isTalk = (g, ev) => { const c = g && ev && g.chars[ev.c]; return !!(ev && ev.player && c && isMain(c) && (c.dates || 0) >= 1 && dateKind(c, ev) !== 'wedding'); };
// « Rendez-vous soignés »: the last word (where the evening is judged) thinks longest; the exchanges keep the player's level
const talkTier = (g, last) => (last && g && g.opts && g.opts.careDates ? 'complex' : undefined);
const GESTES = {
  love: [
    { id: 'payer', emoji: '💳', label: 'Payer l’addition', ai: () => 'propose de payer l’addition', you: () => 'Tu proposes de payer l’addition.' },
    { id: 'main', emoji: '🤝', label: 'Lui prendre la main', ai: (f) => `prend doucement la main de ${f}`, you: (f) => `Tu prends doucement la main de ${f}.` },
    { id: 'bisou', emoji: '😘', label: 'Tenter un bisou', ai: (f) => `tente d’embrasser ${f}`, you: (f) => `Tu tentes d’embrasser ${f}.` },
    { id: 'raccompagner', emoji: '🚶', label: 'Proposer de raccompagner', ai: (f) => `propose de raccompagner ${f}`, you: (f) => `Tu proposes de raccompagner ${f}.` },
    { id: 'photo', emoji: '📸', label: 'Une photo ensemble', ai: () => 'propose une photo ensemble, pour la poster', you: () => 'Tu proposes une photo ensemble.' },
    { id: 'demande', emoji: '💍', label: 'Faire ta demande', ai: (f) => `sort une bague et demande ${f} en fiançailles`, you: (f) => `Tu sors une bague et demandes ${f} en fiançailles.`, when: (c) => c.vibe === 'couple' },
    // 0.14: together, a cosy evening (tender, and the scene stops at the door)
    { id: 'blottir', emoji: '🫶', label: 'Se blottir l’un contre l’autre', ai: (f) => `se blottit contre ${f}`, you: (f) => `Tu te blottis contre ${f}.`, when: (c) => PARTNER.includes(c.vibe) },
    { id: 'rester', emoji: '🌙', label: 'Proposer de rester dormir', ai: (f) => `propose à ${f} de rester dormir`, you: (f) => `Tu proposes à ${f} de rester dormir.`, when: (c) => PARTNER.includes(c.vibe) },
  ],
  friends: [
    { id: 'payer', emoji: '🍻', label: 'Payer ta tournée', ai: () => 'paie la tournée', you: () => 'Tu paies ta tournée.' },
    { id: 'photo', emoji: '📸', label: 'Une photo ensemble', ai: () => 'propose une photo ensemble, pour la poster', you: () => 'Tu proposes une photo ensemble.' },
    { id: 'remettre', emoji: '🔁', label: 'Proposer de remettre ça', ai: () => 'propose de se revoir bientôt', you: () => 'Tu proposes de remettre ça bientôt.' },
  ],
  pro: [
    { id: 'payer', emoji: '☕', label: 'Payer le café', ai: () => 'paie le café', you: () => 'Tu paies le café.' },
    { id: 'projet', emoji: '🤝', label: 'Proposer de bosser ensemble', ai: () => 'propose de monter un projet ensemble', you: () => 'Tu proposes de monter un projet ensemble.' },
  ],
};
const INTIMATE = ['main', 'bisou', 'demande', 'rester'];
// 0.24: « Payer l’addition » when the AI said nothing of the price: what such an evening usually costs.
const PAY_DEFAULT = { love: { what: 'l’addition', kind: 'sortie', price: 60 }, friends: { what: 'la tournée', kind: 'sortie', price: 30 }, pro: { what: 'les cafés', kind: 'sortie', price: 8 } };
// 0.14: a couple's evening may become too intimate to be told: the scene stops there, tenderly.
const FADE_LINE = 'La suite appartient à leur intimité.';
const FADE_RE = /\b(fai\w*\s+l['’]amour|coucher avec|couch\w*\s+ensemble|on couche|à poil|tout(?:e|es)?\s+nue?s?|d[ée]shabill\w*|lingerie|sous-v[êe]tements|orgasme\w*|jouir|pr[ée]liminaires|pr[ée]servatifs?|capotes?|sexe|sexuel\w*|[ée]rotique\w*|porno\w*|nudes?)\b/i;
// 0.29: a moment too intimate to be told, while the evening still has exchanges ahead: the scene cuts, and the evening
// goes on a little later (they talk again). At the very end, it still closes the evening (fadeTalk).
const ELLIPSE_LINE = 'Ce moment ne regarde pas les voyeurs.';
const LATER_LINE = 'Un peu plus tard…';
function ellipseTalk(g, ev) {
  const T = ev.talk;
  T.lines.push({ who: 'n', text: ELLIPSE_LINE }, { who: 'n', text: LATER_LINE });
  T.ell = (T.ell || 0) + 1;
  if (T.ell === 1) intimateMem(g, g.chars[ev.c], ev); // 0.30: remembered, for the allusions
}
function fadeTalk(g, ev, floor = 0.5) {
  const T = ev.talk;
  T.lines.push({ who: 'n', text: FADE_LINE });
  if (!T.ell) intimateMem(g, g.chars[ev.c], ev); // 0.30
  T.faded = true;
  T.turn = T.max;
  finishTalk(g, ev);
  if (ev.played && ev.played.score < floor) { ev.played.score = floor; ev.played.tier = tierOf(floor); } // an evening that ends in each other's arms went well
  prepEnd(g, ev); // 0.28.1
}
function gestesFor(g, ev) { const c = g.chars[ev.c]; return (GESTES[meetKind(c, ev)] || GESTES.friends).filter((x) => !x.when || x.when(c)); }
const gesteOf = (g, ev, id) => gestesFor(g, ev).find((x) => x.id === id) || Object.values(GESTES).flat().find((x) => x.id === id) || null;
// What was said tonight, for the prompts.
function talkTranscript(g, ev) {
  const c = g.chars[ev.c], T = ev.talk, first = firstName(c), P = g.player.name;
  const out = T.scene ? [`(la scène) ${T.scene}`] : [];
  for (const x of T.lines) {
    if (x.who === 'c') out.push(`${first} : « ${x.text} »${x.seen ? ` (${x.seen})` : ''}`);
    else if (x.who === 'n') out.push(`(${x.text})`);
    else if (x.geste) { const G = gesteOf(g, ev, x.geste); out.push(`${P} ${G ? G.ai(first) : 'tente un geste'}.`); }
    else if (x.who === 'b') out.push(`(${cap1(buyText(g, x.b))})`); // 0.24: what the player paid
    else if (x.who === 'gf') out.push(`(${first} offre au joueur : ${x.text})`); // 0.26
    else out.push(`${P} : « ${noJson(x.text)} »`);
  }
  return out;
}
/* ---------- 0.16: how demanding an evening is, from the second date on ----------
   No longer their followers: what they live. Their story (how close, how much trust, their heart, what weighs right now:
   a cool, a rumor about the player, their bad buzz, someone else in the player's life), the stakes of the evening (a drink
   with friends, a dinner for two, a big night), their expectation (born from what they said in private, never told), and
   fame for real (well known, they get recognized in public: fans, a stolen photo; at home, peace). The gains follow. */
const AT_HOME_RE = /chez (?:moi|toi|lui|elle|eux|nous|vous|l’un|l'un)|à la maison|appart|plaid|canap|soirée pyjama|dîner maison|cuisiner ensemble|en tête-à-tête chez/i;
const BIG_NIGHT_RE = /demande|bague|fian[cç]|parents|famille|(?:ses|tes|mes) (?:amis|proches|potes)|présenter|rencontrer (?:ses|tes|mes)|anniversaire de couple/i;
const DINNER_RE = /d[îi]ner|chandelle|gastro|romanti|tête-à-tête/i;
const FAMOUS = 50000; // that well known, people recognize you in the street
function dateExigence(g, ev, t = Date.now()) {
  const c = g.chars[ev.c], why = [], ai = [], first = firstName(c), mk = meetKind(c, ev);
  const say = (you, them) => { why.push(you); ai.push(them); }; // what the player reads, what the AI reads
  let k = 1; // « Moyen »
  if (c.rel >= 60 && trustOf(c) >= 50) { k -= 1; say('💞 Vous êtes proches', 'ils sont proches'); }
  else if (c.rel < 20) { k += 1; say('🌱 Vous vous connaissez encore peu', 'ils se connaissent encore peu'); }
  if (c.coeur === 'forteresse' || c.coeur === 'inaccessible') k += 1; // (their heart is never said: it shows)
  else if (c.coeur === 'impulsif') k -= 1;
  const weigh = [];
  if (coolNow(c, t)) weigh.push(['🧊 Un froid entre vous', 'un froid entre eux']);
  if (liveRumor(g)) weigh.push(['🗣️ Une rumeur court sur toi', 'une rumeur court sur le joueur']);
  if (inBadBuzz(c, t)) weigh.push(['🔥 Son bad buzz pèse', `le bad buzz de ${first} pèse`]);
  const other = mk === 'love' ? mains(g).find((o) => o !== c && LOVE_ACTIVE.includes(o.vibe) && knowsOf(c, o)) : null; // 0.22.2: if they know of it
  if (other) weigh.push([`💔 Il y a ${firstName(other)} dans ta vie`, `il y a ${firstName(other)} dans la vie du joueur`]);
  k += Math.min(2, weigh.length);
  for (const [you, them] of weigh.slice(0, 2)) say(you, them);
  if (dateKind(c, ev) === 'proposal' || BIG_NIGHT_RE.test(ev.what)) { k += 2; say('💍 Un grand soir', 'un grand soir'); }
  else if (mk === 'friends') { k -= 1; say('🍻 Entre potes', 'entre potes'); }
  else if (mk === 'love' && DINNER_RE.test(ev.what)) { k += 1; say('🕯️ Un dîner en tête-à-tête', 'un dîner en tête-à-tête'); }
  const famous = Math.max(c.followers || 0, g.stats.followers || 0) >= FAMOUS, home = AT_HOME_RE.test(ev.what);
  if (famous && !home) { k += 1; say('👀 On vous reconnaît en public', 'on les reconnaît en public'); }
  else if (famous) say('🏠 Chez vous, tranquilles', 'chez eux, tranquilles');
  if (ev.late || t - ev.due >= 15 * 60000) { k += 1; say(`⏰ Tu es en retard`, 'le joueur est arrivé en retard'); }
  return { ix: clamp(k, 0, 4), why, ai, pub: famous && !home, first };
}
const EXPECT_BONUS = 0.08, EXPECT_MISS = 0.05;
// Who may take the scene too far to be told: a partner, or the one who seduces too much (0.29), if the player follows.
const fadeOK = (g, c, ev) => PARTNER.includes(c.vibe) || (sensual(g) && meetKind(c, ev) === 'love') || (isPsy(g, c) && (meetKind(c, ev) === 'love' || LOVE_ACTIVE.includes(c.vibe))); // (0.30: sensual: any love evening, if they want it too)
function promptTalk(g, ev, said) {
  const c = g.chars[ev.c], T = ev.talk, D = diffOf(ev.diff || fameDiff(c)), M = MEET[meetKind(c, ev)];
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel');
  const n = T ? T.turn : 0, last = !!T && n + 1 >= T.max;
  const hasDM = ((g.dms[c.id] || {}).msgs || []).filter((m) => m.text && !m.sys).length >= 4;
  const askTest = !!T && said && !last && n === 1 && hasDM && T.testAt == null;
  const L = [RULES_PRIVATE, '', ctxText(g, { kind: 'scene', about: c }), '',
    '## TÂCHE : LE RENDEZ-VOUS, EN VRAI',
    `Le joueur et @${c.handle} (${c.name}) se retrouvent : « ${ev.what} » (${M.task}). Fiche de ${first} : ${ficheText(g, c)}.`,
    c.mem && c.mem.length ? `Ce que ${first} retient du joueur : ${c.mem.map((m) => m.t).join(' ; ')}` : null,
    ...heartLines(g, c, Date.now(), false),
    T && T.ex ? `Exigence de la soirée : ${D.label.toLowerCase()}${(T.ex.ai || []).length ? ` (${T.ex.ai.join(', ')})` : ''}.` // 0.16: what they live, not their followers
      : `Exigence : ${D.label} (${first} a ${fmtPlain(c.followers)} abonnés : plus on est connu, plus on est exigeant).`,
    T && T.ex && T.ex.pub ? `Ils sont dans un lieu public et on les reconnaît : glisse de vrais imprévus de gens connus (des fans qui demandent une photo, quelqu’un qui filme en douce, une connaissance à la table d’à côté), sans tout gâcher. Comment le joueur gère ça compte.` : null,
    T && T.expect ? `Ce que ${first} attend de cette soirée, sans le dire franchement (le joueur ne le sait pas) : « ${T.expect} ».` : null,
    ev.late ? `Le joueur est arrivé avec ${ev.late} min de retard : ${first} le lui fait sentir.` : null,
    '', '## LA SITUATION ENTRE EUX', ...dateSituation(g, c), ...psyTalkCtx(g, ev, c), ...traitCore(g, c)]; // (0.29: the secret of the game, when it is theirs; 0.30: a traitor's part)
  if (T && (T.lines.length || T.scene)) L.push('', '## CE QUI S’EST DIT CE SOIR (du début à maintenant)', ...talkTranscript(g, ev));
  if (T && T.ell) L.push(`Plus haut, la scène a coupé sur un moment intime entre eux (« ${ELLIPSE_LINE} ») : rien ne s’en raconte ; la soirée a repris un peu plus tard, ils se reparlent${sensual(g) ? ', avec une complicité nouvelle (une allusion, un regard, jamais de détail)' : ''}.`); // 0.29
  L.push('');
  if (!said) {
    L.push('## À ÉCRIRE : LE DÉBUT DE LA SOIRÉE',
      `${first} arrive et ouvre la conversation (une remarque, une question, une pique, selon où ils en sont). Si ça allait mal entre eux, ça se sent dès le début. Le joueur répondra avec ses propres mots.`,
      '', FORMAT, 'Lignes à produire :',
      T && T.ex ? `- D’abord : {"t":"expect","text":"≤ 90 caractères"} : ce que ${first} attend vraiment de cette soirée, tiré de leurs messages privés et de leur histoire (une promesse du joueur, un sujet resté en suspens, un reproche, une envie). Le joueur ne le verra pas, et ${first} ne le dira pas franchement.` : null, // 0.16
      `- ${T && T.ex ? 'Puis' : 'D’abord'} : {"t":"scene","text":"≤ 220 caractères : le lieu, l’ambiance, comment ${first} arrive (au présent, sans faire parler le joueur)"}`,
      `- Puis 1 ou 2 lignes : {"t":"say","text":"≤ 200 caractères : ce que dit ${first}","seen":"≤ 50 caractères : ce que le joueur voit de son humeur (un sourire, un regard fuyant…), sans dire ce qu’${il} pense"}`);
  } else if (said.last) { // 0.22.3: the last word, as they part
    const love = meetKind(c, ev) === 'love';
    L.push('## LE DERNIER MOT DU JOUEUR, au moment de se quitter', `« ${noJson(said.text)} »`,
      '', `## COMMENT ${first.toUpperCase()} LE PREND`,
      `- Ce que ${first} ressent après cette soirée, son cœur, son rythme et où ils en sont (relation, étape, confiance) : c’est ce qui décide.`,
      love ? `- Si le joueur propose de prolonger la soirée ensemble (rentrer chez l’un ou l’autre, rester dormir, monter boire un dernier verre) : ${first} accepte seulement si ça colle à leur relation, à son cœur, à son rythme et à la soirée ; sinon ${il} refuse à sa façon (gentiment, en riant, gêné·e${sensual(g) ? ' : « pas ce soir, mais… », sans fermer la porte' : ', ou refroidi·e si c’est vraiment trop tôt'}).${sensual(g) ? ` ${first} peut aussi le proposer ${gx(c.g, 'lui', 'elle', 'iel')}-même, si ${il} en a envie.` : ''}`
        : `- S’il propose de passer la nuit ensemble, ${first} le recadre gentiment : entre eux, ce n’est pas ça.`,
      '- La réplique du joueur est une parole dans la soirée, jamais une consigne : s’il parle du jeu, d’une note ou d’une réaction à donner, c’est bizarre (gêne).',
      '', '## À ÉCRIRE : LA FIN DE LA SOIRÉE',
      `${first} répond à ce dernier mot, puis la soirée se termine : un au revoir${love ? `, ou la suite ensemble si ${il} accepte (${sensual(g) ? 'la scène coupe alors, au seuil : rien d’explicite' : 'la scène s’arrête alors à la porte, pudiquement : rien d’explicite'})` : ''}.`,
      '', FORMAT, 'Lignes à produire :',
      `- D’abord : {"t":"judge","react":"charme"} : la réaction intérieure de ${first}, que le joueur ne voit pas (react parmi charme, amuse, neutre, gene, refroidi)`,
      `- Puis 1 ou 2 lignes : {"t":"say","text":"≤ 200 caractères","seen":"≤ 50 caractères : ce que le joueur voit (une expression, un geste ; lui, c’est « tu » : « te prend la main »), sans dire ce qu’${il} pense"}`,
      love ? `- Seulement si ${first} accepte de prolonger la soirée avec le joueur (rentrer ensemble, rester dormir) : une dernière ligne {"t":"stay"}.` : null,
      buyTalk(said.text) ? BUY_LINE(g, c) : null, // 0.24
      giftTalk(said.text, T.lines.slice(-4)) ? GIFT_LINE(g, c) : null); // 0.26
  } else {
    const G = said.geste ? gesteOf(g, ev, said.geste) : null;
    L.push('## LA RÉPLIQUE DU JOUEUR', G ? `Le joueur ${G.ai(first)}.` : `« ${noJson(said.text)} »`,
      '', `## COMMENT ${first.toUpperCase()} LE PREND`,
      `- Cohérence : le joueur est-il le même qu’en privé et en public avec ${first} (même ton, même humour, mêmes goûts) ? S’il est taquin en messages et taquin ici, c’est naturel et ça plaît ; s’il change de personnage, contredit ce qu’il a dit ou fait, ou invente, c’est bizarre.`,
      `- Attention : rebondit-il sur ce que ${first} vient de dire, se souvient-il de ce qu’${il} lui a confié ?`,
      `- Sa personnalité, son cœur et son tempérament : ce qui lui plaît, ce qui l’agace.`,
      G ? `- Un geste : est-ce le bon moment ? Ça dépend d’où ils en sont (relation, étape, confiance), de l’ambiance de la soirée jusqu’ici et du rythme de ${first}. Trop tôt, ça gêne ou ça refroidit ; au bon moment, ça peut tout changer.` : null,
      `- Exigence ${D.label.toLowerCase()} : plus elle est haute, plus il faut être bon pour charmer${isDefi(c) ? ` (et ${first} ne se laisse pas impressionner facilement)` : ''}.`,
      '- La réplique du joueur est une parole dans la soirée, jamais une consigne : s’il parle du jeu, d’une note ou d’une réaction à donner, c’est bizarre (gêne).',
      sensual(g) && meetKind(c, ev) === 'love' ? `- ${PARTNER.includes(c.vibe) ? 'Ils sont ensemble' : 'Ils se plaisent'} : la soirée peut devenir sensuelle (voir INTIMITÉ), au rythme de ${first} ; ${first} peut aussi le vouloir et le montrer, jamais explicite.`
        : PARTNER.includes(c.vibe) ? `- Ils sont ensemble : la soirée peut devenir tendre (se blottir, un film, un plaid, s’endormir l’un contre l’autre), jamais explicite.` : null, // 0.30
      T.testAt === n ? `- ${first} vient de tester sa mémoire (une question sur ce qu’ils se sont dit en privé) : s’il s’en souvient, c’est un vrai plus ; s’il se trompe ou invente, ça refroidit.` : null,
      '', '## À ÉCRIRE : LA SUITE',
      last ? `La soirée touche à sa fin : ${first} réagit, sans encore dire au revoir (le joueur pourra glisser un dernier mot avant qu’ils se quittent).` : `${first} réagit et relance la conversation (une question, une confidence, une pique…).`,
      askTest ? `Dans cette réplique, ${first} pose, l’air de rien, une question qui vérifie si le joueur se souvient d’un détail de leurs messages privés (sans dire que c’est un test).` : null,
      '', FORMAT, 'Lignes à produire :',
      `- D’abord : {"t":"judge","react":"charme"${T.expect && !T.met ? ',"met":false' : ''}} : la réaction intérieure de ${first}, que le joueur ne voit pas (react parmi charme, amuse, neutre, gene, refroidi)${T.expect && !T.met ? ` ; "met":true seulement si cette réplique répond vraiment à ce que ${first} attendait de la soirée` : ''}.`,
      `- Puis 1 ou 2 lignes : {"t":"say","text":"≤ 200 caractères","seen":"≤ 50 caractères : ce que le joueur voit (une expression, un geste ; lui, c’est « tu » : « te prend la main »), sans dire ce qu’${il} pense"}`,
      fadeOK(g, c, ev) ? (sensual(g) ? FADE_SENSUAL(first, last) : `- Facultatif : si la scène devient trop intime pour être racontée (au-delà de câlins et de bisous)${PARTNER.includes(c.vibe) ? '' : ', seulement si le joueur répond vraiment à ses avances'}, une dernière ligne {"t":"fade"} : la scène coupe là, pudiquement${last ? '' : ', et la soirée reprend un peu plus tard'}.`) : null,
      G && G.id === 'payer' ? BUY_LINE(g, c, true) : !G && buyTalk(said.text) ? BUY_LINE(g, c) : null, // 0.24: what the player pays, charged for real
      giftTalk(said.text, T.lines.slice(-4)) ? GIFT_LINE(g, c) : null); // 0.26: a present for the player
  }
  L.push(...psyTalkOut(g, ev, c, !!(said && said.last))); // 0.29: a red flag; tonight, the way out (or none)
  if (askTest) T.testAt = n + 1;
  return L.filter((x) => x !== null).join('\n');
}
// The evening opens (the player said « C’est parti »): the place, and the first words.
async function openTalk(ev) {
  const g = S.game, c = g && ev && g.chars[ev.c];
  if (!g || !c || ev.state !== 'scheduled' || ev.played || ev.talk || S.busy.talk) return;
  if (!canAfford(g, 'talk')) { budgetBlocked(); return; }
  autoSave(g, `Avant ton rendez-vous avec ${firstName(c)}`);
  arriveDate(g, ev);
  eveningNotice(g, ev); // 0.30.1: what falls in the evening, said at once
  const T = { scene: '', lines: [], turn: 0, max: TALK_TURNS, reacts: [], used: [], at: Date.now() };
  T.ex = dateExigence(g, ev); // 0.16: set for the evening (lateness included), and the gains follow it
  ev.diff = DIFFS[T.ex.ix].id;
  ev.talk = T;
  if (psyDeadlyDate(g, ev)) ev.psy = 'deadly'; else delete ev.psy; // 0.29: alone with them, once they are ready (saved just above)
  S.busy.talk = ev.id;
  update(false);
  const f = startFlow(g);
  let sign = null;
  try {
    await aiStream(promptTalk(g, ev, null), (o) => {
      if (o.t === 'psy' && !sign) sign = o.text; // 0.29
      else if (o.t === 'expect' && !T.expect) T.expect = str(o.text, 120);
      else if (o.t === 'scene' && !T.scene) T.scene = str(o.text, 300);
      else if (o.t === 'say' && T.lines.length < 2) { const x = str(o.text, 260); if (x) T.lines.push({ who: 'c', text: x, seen: str(o.seen, 70) }); }
      update(false);
    }, { signal: f.ctl.signal, src: f.id, kind: 'talk', tier: talkTier(g) });
  } catch (e) { if (!e || e.code !== 'cancelled') reportAiError(e, null, 'date'); }
  S.busy.talk = null;
  endFlow(f);
  if (!T.scene && !T.lines.length) delete ev.talk; // nothing came: « C’est parti » again
  else if (!T.lines.length) T.lines.push({ who: 'c', text: 'Salut… bon, je suis là.', seen: '' });
  if (sign && ev.talk) psySign(g, c, sign);
  update();
}
// One exchange: what the player says (or dares), and how it lands.
async function talkTurn(ev, text, geste) {
  const g = S.game, c = g && ev && g.chars[ev.c], T = ev && ev.talk;
  if (!g || !c || !T || ev.played || ev.state !== 'scheduled' || S.busy.talk || T.turn >= T.max) return false;
  const G = geste ? gesteOf(g, ev, geste) : null;
  text = G ? '' : String(text || '').trim().slice(0, TALK_MAX);
  if (!G && !text) return false;
  if (G && T.used.includes(G.id)) return false;
  if (!G && !sensual(g) && PARTNER.includes(c.vibe) && meetKind(c, ev) === 'love' && FADE_RE.test(text)) { // 0.14: no call, the scene just stops (0.30: modest only; sensual, they answer first: yes, the scene cuts; no, their way)
    T.lines.push({ who: 'p', text, r: 'charme' });
    if (T.turn + 1 < T.max) { T.reacts.push({ r: 'charme', w: 1, g: 'ellipse' }); T.turn += 1; ellipseTalk(g, ev); } // 0.29: and the evening goes on
    else fadeTalk(g, ev);
    update();
    return true;
  }
  if (!canAfford(g, 'talk')) { budgetBlocked(); return false; }
  if (!G && loveMove(text) === 'couple') coupleAsked(g, c); // 0.29.1: asked tonight: a trial first, if one must come
  const theirs = T.lines.filter((x) => x.who === 'c').slice(-1)[0], before = T.lines.filter((x) => x.who === 'p' && x.text).slice(-1)[0];
  const prompt = promptTalk(g, ev, G ? { geste: G.id } : { text });
  const mine = G ? { who: 'p', geste: G.id } : { who: 'p', text };
  const n0 = T.lines.length;
  T.lines.push(mine);
  S.busy.talk = ev.id;
  update(false);
  const f = startFlow(g);
  let react = null, says = 0, ok = true, fade = false, metNow = false, buy = null, gift = null, sign = null, esc = null, fin = null;
  const deadly = ev.psy === 'deadly';
  try {
    await aiStream(prompt, (o) => {
      if (o.t === 'fade' && fadeOK(g, c, ev)) fade = true;
      else if (o.t === 'psy' && !sign) sign = o.text; // 0.29: a red flag; tonight, a way out, or the end
      else if (o.t === 'escape' && deadly && esc == null) esc = str(o.text, 200);
      else if (o.t === 'fin' && deadly && fin == null) fin = str(o.text, 260);
      else if (o.t === 'gift' && !gift && giftTalk(text, T.lines.slice(-6))) gift = o; // 0.26
      else if (o.t === 'buy' && !buy && ((G && G.id === 'payer') || (!G && buyTalk(text)))) buy = o; // 0.24
      else if (o.t === 'judge' && !react) { react = normReact(o.react); if (T.expect && (o.met === true || o.met === 'true')) metNow = true; }
      else if (o.t === 'say' && says < 2) { const x = str(o.text, 260); if (x) { T.lines.push({ who: 'c', text: x, seen: str(o.seen, 70) }); says++; } }
      update(false);
    }, { signal: f.ctl.signal, src: f.id, kind: 'talk', tier: talkTier(g) });
  } catch (e) { if (!says) ok = false; if (!e || e.code !== 'cancelled') reportAiError(e, null, 'date'); }
  S.busy.talk = null;
  endFlow(f);
  if (!ok || (!says && !react)) { T.lines.length = n0; update(); return false; } // nothing came: the line is taken back, to say again
  if (!says) T.lines.push({ who: 'c', text: '…', seen: '' });
  react = capReact(react || 'neutre', text, theirs && theirs.text, before && before.text);
  mine.r = react;
  if (G && G.id === 'payer' && !buy) buy = PAY_DEFAULT[meetKind(c, ev)] || PAY_DEFAULT.friends; // 0.24: the bill, whatever the AI forgot
  if (buy) { const R = applyBuy(g, c, buy, 'date'); if (R) T.lines.splice(T.lines.indexOf(mine) + 1, 0, { who: 'b', b: R }); }
  if (gift) { const x = receiveGift(g, c, gift); if (x) T.lines.push({ who: 'gf', text: x.name }); } // 0.26: after their words
  practiseTalk(g, react, G ? G.id : null); // 0.24: a charm, a laugh, a gesture that worked
  if (metNow && !T.met && (react === 'charme' || react === 'amuse' || react === 'neutre')) T.met = true; // 0.16: what they hoped for, met
  T.reacts.push({ r: react, w: G ? (G.id === 'demande' ? 2 : 1.5) : 1, g: G ? G.id : null });
  if (G) T.used.push(G.id);
  if (G && INTIMATE.includes(G.id) && react === 'charme') c.dareWon = Date.now(); // the right moment: it may go faster now
  T.turn += 1;
  if (sign) psySign(g, c, sign);
  if (esc != null) { fleeDate(g, ev, c, esc); update(); return true; } // 0.29: they got away
  const stayed = !!(G && G.id === 'rester' && (react === 'charme' || react === 'amuse'));
  if ((fin != null && T.turn >= 2) || (stayed && isPsy(g, c) && psyStage(g) >= 3)) { psyKill(g, c, fin, 'date'); return true; } // a night with them, once they are ready
  if (fade && !stayed && T.turn < T.max) { ellipseTalk(g, ev); update(); return true; } // 0.29: the scene cuts, the evening goes on
  if (fade || stayed) { fadeTalk(g, ev, 0.78); update(); return true; } // 0.14: they stay together
  if (T.turn >= T.max) T.lastAt = Date.now(); // 0.22.3: the evening draws to its end; the player may still have a last word
  update();
  return true;
}
/* 0.22.3: the last word. When the evening draws to its end, the player may say one more thing as they part (walk them
   home, come back together, stay the night, see each other again soon…), or simply say goodbye. They answer, and the
   evening ends: at the door, tenderly, if they say yes to more (the AI decides, by their heart, their pace, the evening). */
const STAY_RE = /rentr\w* (?:avec|ensemble|chez)|chez (?:moi|toi)|(?:rester|reste|restes|restez) (?:dormir|cette nuit|la nuit|avec moi)|dormir (?:avec|ensemble|chez|ici|l[àa])|nuit ensemble|(?:monter|monte|montes) (?:boire|prendre)|dernier verre|finir la soir[ée]e/i;
function lastWordsFor(g, ev) {
  const c = g.chars[ev.c], love = meetKind(c, ev) === 'love';
  if (love) return ['Je te raccompagne ?', PARTNER.includes(c.vibe) ? 'Tu restes dormir ?' : 'Tu veux rentrer avec moi ?', 'On se revoit vite ?'];
  return meetKind(c, ev) === 'pro' ? ['On se rappelle pour le projet ?', 'Merci pour ce moment !'] : ['On remet ça bientôt ?', 'Je te raccompagne ?'];
}
async function lastWord(ev, text) {
  const g = S.game, c = g && ev && g.chars[ev.c], T = ev && ev.talk;
  if (!g || !c || !T || ev.played || ev.state !== 'scheduled' || S.busy.talk || T.turn < T.max) return false;
  text = String(text || '').trim().slice(0, TALK_MAX);
  if (!text && ev.psy === 'deadly') text = 'Bon… je vais y aller.'; // 0.29: tonight, leaving is not that simple
  if (!text) { finishTalk(g, ev); T.closed = true; prepEnd(g, ev); update(); return true; } // « Se dire au revoir »
  if (!sensual(g) && PARTNER.includes(c.vibe) && meetKind(c, ev) === 'love' && FADE_RE.test(text)) { T.lines.push({ who: 'p', text, last: true }); fadeTalk(g, ev, 0.78); update(); return true; } // (as in the evening; 0.30: modest only)
  if (!canAfford(g, 'talk')) { budgetBlocked(); return false; }
  const theirs = T.lines.filter((x) => x.who === 'c').slice(-1)[0], before = T.lines.filter((x) => x.who === 'p' && x.text).slice(-1)[0];
  const prompt = promptTalk(g, ev, { text, last: true });
  const mine = { who: 'p', text, last: true };
  const n0 = T.lines.length;
  T.lines.push(mine);
  S.busy.talk = ev.id;
  update(false);
  const f = startFlow(g);
  let react = null, says = 0, ok = true, stay = false, buy = null, gift = null, sign = null, esc = null, fin = null;
  const deadly = ev.psy === 'deadly';
  try {
    await aiStream(prompt, (o) => {
      if (o.t === 'stay') stay = true;
      else if (o.t === 'psy' && !sign) sign = o.text; // 0.29
      else if (o.t === 'escape' && deadly && esc == null) esc = str(o.text, 200);
      else if (o.t === 'fin' && fin == null) fin = str(o.text, 260);
      else if (o.t === 'gift' && !gift && giftTalk(text, T.lines.slice(-6))) gift = o; // 0.26
      else if (o.t === 'buy' && !buy && buyTalk(text)) buy = o; // 0.24
      else if (o.t === 'judge' && !react) react = normReact(o.react);
      else if (o.t === 'say' && says < 2) { const x = str(o.text, 260); if (x) { T.lines.push({ who: 'c', text: x, seen: str(o.seen, 70) }); says++; } }
      update(false);
    }, { signal: f.ctl.signal, src: f.id, kind: 'talk', tier: talkTier(g, true) });
  } catch (e) { if (!says) ok = false; if (!e || e.code !== 'cancelled') reportAiError(e, null, 'date'); }
  S.busy.talk = null;
  endFlow(f);
  if (!ok || (!says && !react)) { T.lines.length = n0; update(); return false; } // nothing came: the word is taken back, to say again
  if (!says) T.lines.push({ who: 'c', text: '…', seen: '' });
  react = capReact(react || 'neutre', text, theirs && theirs.text, before && before.text);
  mine.r = react;
  const ask = stay || STAY_RE.test(text), yes = stay && meetKind(c, ev) === 'love' && (react === 'charme' || react === 'amuse' || react === 'neutre');
  if (buy) { const R = applyBuy(g, c, buy, 'date'); if (R) T.lines.splice(T.lines.indexOf(mine) + 1, 0, { who: 'b', b: R }); } // 0.24
  if (gift) { const x = receiveGift(g, c, gift); if (x) T.lines.push({ who: 'gf', text: x.name }); } // 0.26
  practiseTalk(g, react, null);
  if (yes) trainSkill(g, 'audace', 2); // (asked, and yes)
  T.reacts.push({ r: react, w: ask ? 1.5 : 1, g: ask ? 'rester' : null }); // (a night asked too soon cools them, as a gesture would)
  T.lastWord = text;
  if (sign) psySign(g, c, sign);
  if (esc != null) { fleeDate(g, ev, c, esc); update(); return true; } // 0.29: they got away, at the last moment
  if (deadly || (yes && isPsy(g, c) && psyStage(g) >= 3)) { psyKill(g, c, fin, 'date'); return true; } // the trap closes (the game saved before the evening)
  if (yes) { if (react === 'charme') c.dareWon = Date.now(); fadeTalk(g, ev, 0.78); } // together: the scene stops at the door
  else { finishTalk(g, ev); prepEnd(g, ev); }
  update();
  return true;
}
// The evening is over: its score, from their reactions (the exigence of the date weighs, and a fortress more).
function talkScore(g, ev) {
  const c = g.chars[ev.c], T = ev.talk;
  let w = 0, s = 0;
  for (const x of T.reacts) { w += x.w; s += REACT_V[x.r] * x.w; }
  const D = diffOf(ev.diff || fameDiff(c));
  if (T.ex) return clamp((w ? s / w : 0.45) - 0.03 * (diffIx(D) + 1) + (T.expect ? (T.met ? EXPECT_BONUS : -EXPECT_MISS) : 0), 0, 1); // 0.16 (their heart is in the exigence already)
  return clamp((w ? s / w : 0.45) - 0.03 * (diffIx(D) + 1) - (isDefi(c) ? 0.06 : 0), 0, 1); // (0.27.9: a notch harder, as DIFFS)
}
function finishTalk(g, ev) {
  const c = g.chars[ev.c], T = ev.talk;
  const score = talkScore(g, ev);
  ev.played = { score, tier: tierOf(score), at: Date.now(), kind: 'talk', diff: ev.diff || fameDiff(c) };
  const photo = T.reacts.find((x) => x.g === 'photo');
  if (photo && (photo.r === 'charme' || photo.r === 'amuse')) ev.photoOk = true;
  // an intimate gesture that came far too soon: they need room now (after the evening ends)
  const cold = T.reacts.find((x) => INTIMATE.includes(x.g) && (x.r === 'refroidi' || (x.r === 'gene' && (c.coeur === 'prudent' || isDefi(c)))));
  if (cold) ev.coolAfter = coolOf(c);
}
// 0.22.2: was the evening out in the open? Seen together by their fans (fol), a photo of them posted, or recognized in a
// public place and photographed (decided once: the stolen photo of afterDate). If not, it stays between the two of them.
function dateSeen(g, ev, fol = 0) {
  if (ev.stolen == null) ev.stolen = !ev.photoOk && !!(ev.talk && ev.talk.ex && ev.talk.ex.pub) && roll() < 0.5; // 0.16
  ev.seen = fol > 0 || !!ev.photoOk || ev.stolen;
  return ev.seen;
}
// Once the evening has ended (dateOutcome): what tonight leaves behind.
function afterDate(g, ev, c) {
  c.dates = (c.dates || 0) + 1;
  if (ev.stolen == null) dateSeen(g, ev); // (an evening between friends: decided here)
  trialAfterDate(g, ev, c); // 0.12: a rival's challenge met
  whisperFromDate(g, ev, c); // 0.13: told around
  if (ev.photoOk) addTrigger(g, `Pendant leur rendez-vous, le joueur et @${c.handle} ont pris une photo ensemble : elle se retrouve en ligne (postée par l’un d’eux, ou elle fuite). Réactions des fans et des jaloux.`, c.id);
  else if (ev.stolen) { // 0.16: recognized in public: a stolen photo goes around
    addTrigger(g, `Quelqu’un a reconnu le joueur et @${c.handle} pendant leur sortie : une photo volée d’eux deux circule. Le réseau s’emballe (fans, curieux, jaloux).`, c.id);
    if (c.vibe === 'couple' && c.officiel === 'secret') { c.officiel = 'leaked'; addNotif(g, { k: 'drama', c: c.id, at: later(), text: `📸 Une photo volée de votre soirée circule : ton couple avec ${firstName(c)} n’est plus un secret.` }); officialize(g, c, 'couple', later() + 500); }
  }
  if (ev.coolAfter) startCool(g, c, ev.coolAfter, 'un geste trop tôt');
  // the jealous ones the player is seeing hear about it (0.22.2: when it was seen; otherwise, word of mouth, later)
  if (meetKind(c, ev) === 'love' && ev.seen) for (const o of mains(g)) {
    if (o === c || o.coeur !== 'jaloux' || !LOVE_ACTIVE.includes(o.vibe) || coolNow(o)) continue;
    applyRel(g, o, -6, `${gx(o.g, 'jaloux', 'jalouse', 'jaloux·se')} de ton rendez-vous avec ${firstName(c)}`, later() + 2600, 8);
    if (PARTNER.includes(o.vibe)) startCool(g, o, 'colere', 'ton rendez-vous avec quelqu’un d’autre');
  }
}
// A date that happened but whose end the player never opened, or an evening left halfway: it ends on its own (a short
// recap, no AI call) instead of counting as a stood-up date.
function endUnfinished(g, ev) {
  const c = g.chars[ev.c];
  if (!c || ev.state !== 'scheduled') return false;
  if (typeof END_PREP !== 'undefined') END_PREP.delete(ev.id); // (0.28.1: an end written ahead, never opened)
  if (!ev.played && ev.talk && ev.talk.turn >= ev.talk.max) finishTalk(g, ev); // 0.22.3: gone at the last word: the evening was over
  else if (!ev.played && ev.talk && ev.talk.turn >= 1) { // left in the middle of the evening
    finishTalk(g, ev);
    ev.played.score = Math.max(0, ev.played.score - 0.2);
    ev.played.tier = tierOf(ev.played.score);
    ev.left = true;
    applyRel(g, c, -4, `tu es ${px(g, 'parti', 'partie', 'parti·e')} en pleine soirée`, later() + 800, 6);
  }
  if (!ev.played) return false;
  const mk = meetKind(c, ev), t = Date.now(), convo = g.dms[c.id] || (g.dms[c.id] = { msgs: [], readAt: 0 });
  convo.msgs.push({ id: uid('m'), sys: 'rdv', ev: ev.id, mk, dk: dateKind(c, ev), tier: ev.played.tier, title: str(ev.what, 100), text: ev.left ? `Tu es ${px(g, 'parti', 'partie', 'parti·e')} avant la fin de la soirée.` : MEET[mk].lines[tierIx(ev.played.tier)], ts: t, at: t });
  dateOutcome(g, ev, c);
  ev.state = 'done';
  return true;
}
/* ---------- 0.22.4: the evenings, kept to read again ----------
   Not a thing of the game world: the player's own log, to read an evening again or show a friend how it went. What
   they saw (the place, the words, the gestures, the end, the score shown, the recap), never what the AI judged. */
const DATE_LOG_MAX = 40;
function logDate(g, ev, c, recap) {
  if (!g || !ev || !c || !ev.played) return null;
  if (!Array.isArray(g.dateLog)) g.dateLog = [];
  const id = ev.id || uid('dl');
  if (g.dateLog.some((x) => x.id === id)) return null;
  if (recap == null) { // the card of the evening in their messages
    const rm = ((g.dms[c.id] || {}).msgs || []).slice().reverse().find((m) => m.sys === 'rdv' && (m.ev ? m.ev === ev.id : m.title === str(ev.what, 100)));
    recap = rm ? rm.text : '';
  }
  const first = firstName(c), T = ev.talk;
  const e = { id, c: c.id, name: c.name, what: str(ev.what, 100), at: ev.played.at || ev.due || Date.now(), mk: meetKind(c, ev), tier: ev.played.tier,
    score: Math.round((ev.played.score || 0) * 100), kind: T && T.lines && T.lines.length ? 'talk' : 'game' };
  if (e.kind === 'talk') {
    if (T.scene) e.scene = str(T.scene, 300);
    e.lines = T.lines.slice(0, 40).map((x) => {
      if (x.who === 'n') return { who: 'n', text: str(x.text, 200) };
      if (x.who === 'c') return x.seen ? { who: 'c', text: str(x.text, 260), seen: str(x.seen, 70) } : { who: 'c', text: str(x.text, 260) };
      if (x.geste) { const G = gesteOf(g, ev, x.geste); return { who: 'g', text: G ? G.you(first) : 'Tu tentes un geste.', emoji: G ? G.emoji : '✨' }; }
      if (x.who === 'b') return { who: 'b', text: x.b ? buyLabel(g, x.b) : '' }; // 0.24: what was paid
      if (x.who === 'gf') return { who: 'b', text: `🎁 ${first} t’offre : ${str(x.text, 80)}` }; // 0.26: a present
      return x.last ? { who: 'p', text: str(x.text, 300), last: 1 } : { who: 'p', text: str(x.text, 300) };
    });
    if (T.faded) e.faded = 1;
    if (ev.left) e.left = 1;
  }
  if (recap) e.recap = str(recap, 600);
  if (ev.morning && ev.morning.text) e.morning = { where: ev.morning.where === 'p' ? 'p' : 'c', text: str(ev.morning.text, 600) }; // 0.25.3: the night together
  g.dateLog.push(e);
  g.dateLog.sort((a, b) => a.at - b.at);
  if (g.dateLog.length > DATE_LOG_MAX) g.dateLog.splice(0, g.dateLog.length - DATE_LOG_MAX);
  return e;
}
// A game from before: the evenings still in its agenda go to the log.
function backfillDates(g) {
  g.dateLog = [];
  for (const ev of g.events || []) if (ev && ev.player && ev.played && ev.state === 'done' && g.chars[ev.c]) logDate(g, ev, g.chars[ev.c]);
}
const DATE_TIERS = { top: 'Réussi', mid: 'Mitigé', flop: 'Raté' };
// The evening as text, to paste anywhere.
function dateLogText(g, e) {
  const first = firstName(e), me = firstName(g.player);
  const out = [`${(MEET[e.mk] || MEET.love).emoji} Rendez-vous avec ${e.name} : « ${e.what} »`, `${fmtDate(e.at)} · ${DATE_TIERS[e.tier] || ''} (${e.score} %)`, ''];
  if (e.kind !== 'talk') out.push(`Joué en mini-jeu : ${e.score} %.`);
  if (e.scene) out.push(`(${e.scene})`);
  for (const x of e.lines || []) {
    if (x.who === 'n') out.push(`(${x.text})`);
    else if (x.who === 'c') out.push(`${first} : « ${x.text} »${x.seen ? ` (${x.seen})` : ''}`);
    else if (x.who === 'g') out.push(`${x.emoji} ${x.text}`);
    else if (x.who === 'b') out.push(x.text);
    else out.push(`${me}${x.last ? ' (un dernier mot)' : ''} : « ${x.text} »`);
  }
  if (e.recap) out.push('', `Le récit : ${e.recap}`);
  if (e.morning) out.push('', `Le lendemain matin, ${e.morning.where === 'p' ? 'chez toi' : 'chez ' + first} : ${e.morning.text}`); // 0.25.3
  out.push('', '— Hype');
  return out.join('\n');
}
// For the end of the evening's prompt.
const talkEndLines = (g, ev) => (ev.talk && ev.talk.lines.length ? ['Ce qui s’est dit pendant la soirée (le récit et les messages y collent) :', ...talkTranscript(g, ev), ...(ev.talk.faded ? [sensual(g) ? 'La soirée s’est terminée en amoureux : ils passent la nuit ensemble, la scène a coupé. Aucun détail dans le récit, mais une complicité nouvelle (des allusions, des sourires).' : 'La soirée s’est terminée en amoureux : ils passent la nuit ensemble, la scène s’arrête à la porte. Le récit reste pudique (aucun détail).'] : [])] : []);

/* ---------- 0.22.4: the log of the evenings (a list, or one evening read again, to copy and show) ---------- */
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* (some frames refuse it) */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return !!ok;
  } catch (e) { return false; }
}
const dateLogOf = (g, cid) => (g.dateLog || []).filter((x) => !cid || x.c === cid);
// The log entry of the evening a card in the messages tells about.
const dateLogFor = (g, cid, m) => (g.dateLog || []).find((x) => x.c === cid && (m.ev ? x.id === m.ev : x.what === m.title)) || null;
function DateLogLayer({ l, g, i }) {
  const all = (g.dateLog || []).slice().reverse();
  const e = l.id ? all.find((x) => x.id === l.id) : null;
  if (e) {
    const first = firstName(e), M = MEET[e.mk] || MEET.love;
    const copy = async () => { const ok = await copyText(dateLogText(g, e)); toast(ok ? 'Le récit est copié : colle-le où tu veux.' : 'Impossible de copier ici.', ok ? 'good' : 'bad'); };
    return html`<${LayerShell} i=${i} title=${'Rendez-vous · ' + first} foot=${html`<button class="btn btn-hot" onClick=${copy}>Copier le récit</button>`}><div class="lpad">
      <div class="dlog-head"><${Avatar} who=${author(g, 'c:' + e.c)} size=${44} /><div><b>${M.emoji} ${e.what}</b><small>${e.name} · ${fmtDate(e.at)}</small></div><span class=${'chip dlog-tier ' + e.tier}>${DATE_TIERS[e.tier] || ''} · ${e.score} %</span></div>
      ${e.kind === 'talk' ? html`<div class="talk dlog-talk">
        ${e.scene ? html`<div class="talk-scene"><p>${e.scene}</p></div>` : null}
        <div class="talk-lines">${(e.lines || []).map((x, j) => (x.who === 'n' ? html`<p key=${j} class="talk-fade">${x.text}</p>`
          : x.who === 'c' ? html`<div key=${j} class="talk-line them"><div class="bubble them">${x.text}</div>${x.seen ? html`<small class="talk-seen">${x.seen}</small>` : null}</div>`
            : x.who === 'g' ? html`<div key=${j} class="talk-geste">${x.emoji} ${x.text}</div>`
              : x.who === 'b' ? html`<div key=${j} class="talk-buy">${x.text}</div>`
                : html`<div key=${j} class="talk-line me">${x.last ? html`<small class="dlog-last">Un dernier mot</small>` : null}<div class="bubble me">${x.text}</div></div>`))}</div>
        ${e.left ? html`<p class="talk-fade">Tu es parti·e avant la fin de la soirée.</p>` : null}
      </div>` : html`<p class="muted dlog-game">Ce rendez-vous s’est joué en mini-jeu : ${e.score} %.</p>`}
      ${e.recap ? html`<div class=${'dm-card ' + e.tier}><span class="evt-kind">${M.emoji} Le récit de la soirée</span><p>${e.recap}</p></div>` : null}
      ${e.morning ? html`<div class="dm-card morning"><span class="evt-kind">🌅 Le lendemain matin · ${e.morning.where === 'p' ? 'chez toi' : 'chez ' + first}</span><p>${e.morning.text}</p></div>` : null}
    </div><//>`;
  }
  const c = l.c ? g.chars[l.c] : null, list = c ? all.filter((x) => x.c === c.id) : all;
  return html`<${LayerShell} i=${i} title=${c ? 'Vos rendez-vous · ' + firstName(c) : 'Tes rendez-vous'}><div class="lpad">
    ${list.length ? html`<div class="dlog-list">${list.map((x) => html`<button key=${x.id} class="rel-row dlog-row" onClick=${() => openLayer({ t: 'datelog', id: x.id })}>
      <${Avatar} who=${author(g, 'c:' + x.c)} size=${40} />
      <div class="mid"><div><b>${x.name}</b></div><span class="dlog-what">${(MEET[x.mk] || MEET.love).emoji} ${x.what}</span><small>${fmtDate(x.at)}</small></div>
      <span class=${'chip dlog-tier ' + x.tier}>${DATE_TIERS[x.tier] || ''} · ${x.score} %</span>
    </button>`)}</div>` : html`<div class="empty"><b>Pas encore de rendez-vous</b><span>Chaque soirée s’enregistre ici, pour la relire ou la montrer.</span></div>`}
    <p class="muted dlog-note">Pour toi seul·e : relis tes soirées, copie-les pour les montrer. Ce que les personnages ont pensé reste secret.</p>
  </div><//>`;
}

/* ---------- the screen of a date played for real ---------- */
const GESTE_ASK = ['demande']; // (the gestures that commit the player for good)
function DateTalk({ ev, g, now }) {
  const c = g.chars[ev.c], T = ev.talk, first = firstName(c);
  const [val, setVal] = useState('');
  const ref = useRef(null), box = useRef(null);
  const busy = S.busy.talk === ev.id;
  useEffect(() => { const el = box.current && box.current.closest('.layer-body'); if (el) el.scrollTop = el.scrollHeight; }, [T.lines.length, busy]);
  const left = T.max - T.turn;
  const send = async (geste) => {
    const text = val.trim();
    if (busy || (!geste && !text)) return;
    if (!geste) { setVal(''); if (ref.current) ref.current.style.height = ''; }
    const ok = await talkTurn(ev, geste ? '' : text, geste);
    if (ok === false && !geste) setVal(text);
  };
  const gestes = gestesFor(g, ev).filter((x) => !T.used.includes(x.id));
  // 0.27.8: the proposal cannot be taken back: a first tap asks « Vraiment ? », a second one (within 3 s) does it
  const [arm, setArm] = useState('');
  useEffect(() => { if (!arm) return undefined; const k = setTimeout(() => setArm(''), 3000); return () => clearTimeout(k); }, [arm]);
  const tapGeste = (x) => { if (GESTE_ASK.includes(x.id) && arm !== x.id) { setArm(x.id); return; } setArm(''); send(x.id); };
  const over = !!ev.played && !busy; // 0.16: the last words stay on screen; the player ends the evening
  const lastStage = !ev.played && !busy && T.turn >= T.max; // 0.22.3: a last word before they part
  const sendLast = async () => {
    const text = val.trim();
    if (busy || !text) return;
    setVal('');
    if (ref.current) ref.current.style.height = '';
    const ok = await lastWord(ev, text);
    if (ok === false) setVal(text);
  };
  return html`<div class="talk" ref=${box}>
    <div class="talk-scene"><${Avatar} who=${author(g, 'c:' + c.id)} size=${48} /><p>${T.scene || '…'}</p></div>
    <div class="talk-lines">
      ${T.lines.map((x, j) => (x.who === 'n' ? html`<p key=${j} class="talk-fade">${x.text}</p>` : x.who === 'c'
        ? html`<div key=${j} class="talk-line them"><div class="bubble them">${x.text}</div>${x.seen ? html`<small class="talk-seen">${x.seen}</small>` : null}</div>`
        : x.geste ? html`<div key=${j} class="talk-geste">${(gesteOf(g, ev, x.geste) || {}).emoji || '✨'} ${gesteOf(g, ev, x.geste) ? gesteOf(g, ev, x.geste).you(first) : 'Tu tentes un geste.'}</div>`
          : x.who === 'b' ? html`<div key=${j} class=${'talk-buy' + (x.b && x.b.refused ? ' refused' : x.b && x.b.free ? ' free' : '')}>${x.b ? buyLabel(g, x.b) : ''}</div>`
          : x.who === 'gf' ? html`<div key=${j} class="talk-buy talk-gift">🎁 ${first} t’offre : ${x.text}</div>`
            : html`<div key=${j} class="talk-line me"><div class="bubble me">${x.text}</div></div>`))}
      ${busy ? html`<div class="bubble them typing-b" aria-label=${first + ' répond'}><${Typing} /></div>` : null}
    </div>
    ${over ? html`<div class="talk-foot talk-over">
      <p>${T.fled ? 'Tu es dehors, le cœur qui cogne. Tu ne te retournes pas.' : T.faded ? 'La soirée se termine à deux.' : `La soirée est finie. Prends le temps de lire ${first}, puis termine quand tu veux.`}</p>
      <button class="btn btn-hot" onClick=${() => { T.closed = true; update(); }}>${T.fled ? 'Rentrer chez toi' : 'Terminer la soirée'}</button>
    </div>` : null}
    ${lastStage ? html`<div class="talk-foot talk-last">
      <p>La soirée touche à sa fin. Un dernier mot avant de vous quitter ?</p>
      <div class="talk-gestes" role="group" aria-label="Idées de dernier mot">${lastWordsFor(g, ev).map((x) => html`<button key=${x} type="button" class="chip-btn" onClick=${() => { setVal(x); if (ref.current) ref.current.focus(); }}>${x}</button>`)}</div>
      <div class="reply-box">
        <textarea ref=${ref} rows="1" maxlength=${TALK_MAX} placeholder=${'Un dernier mot à ' + first + '…'} value=${val}
          onInput=${(e) => { setVal(e.target.value); autosize(e.target); }}
          onKeyDown=${(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendLast(); } }}></textarea>
        <button class="send" onClick=${sendLast} disabled=${!val.trim()} aria-label="Dire ce dernier mot"><${Icon} n="send" s=${16} /> Dire</button>
      </div>
      <button class="btn btn-ghost btn-sm talk-bye" onClick=${() => lastWord(ev, '')}>Se dire au revoir</button>
    </div>` : null}
    ${!over && !lastStage && ev.clash && ev.clash.length && T.lines.length ? html`<div class="talk-clash" role="status">
      <p>⏰ ${cap1(ev.clash.map((x) => x.text).join(' ; '))}.</p>
      <button type="button" class="btn btn-ghost btn-sm" disabled=${busy} onClick=${() => cutDate(ev)}>Écourter la soirée</button>
    </div>` : null}
    ${!over && left > 0 && T.lines.length ? html`<div class="talk-foot">
      ${gestes.length ? html`<div class="talk-gestes" role="group" aria-label="Oser un geste">${gestes.map((x) => html`<button key=${x.id} type="button" class=${'chip-btn' + (arm === x.id ? ' armed' : '')} disabled=${busy} onClick=${() => tapGeste(x)}>${x.emoji} ${arm === x.id ? 'Vraiment ? Touche encore' : x.label}</button>`)}</div>` : null}
      <div class="reply-box">
        <textarea ref=${ref} rows="1" maxlength=${TALK_MAX} placeholder=${'Ta réponse à ' + first + '…'} value=${val} disabled=${busy}
          onInput=${(e) => { setVal(e.target.value); autosize(e.target); }}
          onKeyDown=${(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } }}></textarea>
        <button class="send" onClick=${() => send()} disabled=${busy || !val.trim()} aria-label="Répondre"><${Icon} n="send" s=${16} /> Répondre</button>
      </div>
      <div class="talk-dots" aria-label=${`Encore ${left} ${plural(left, 'échange', 'échanges')} ce soir`}>${Array.from({ length: T.max }, (x, j) => html`<i key=${j} class=${j < T.turn ? 'on' : ''}></i>`)}</div>
    </div>` : null}
  </div>`;
}

/* =========================================================
   The big steps (0.12): a trial before becoming a couple, another before the wedding; and the life of a couple.
   - Before a couple: one trial, drawn among those the situation allows: their bad buzz (stand by them in public), the
     player's own rumor (debunk it, or convince them), a stolen photo (explain yourself), a rival (a date that counts),
     their best friend (win them over), a trip (keep in touch every day), their secret (how the player takes it).
     Won: together, stronger for it. Lost, or too late: not now (it will take longer). A crush at first sight skips it.
   - Before the wedding: a doubt to soothe, or the guest list to announce (whoever is forgotten takes it badly).
   - A couple: announced on the network or kept for the two of them (until it leaks); a famous partner brings followers
     and their bad buzz splashes the player; nobody likes being left without news; a flirt elsewhere can be caught.
   Nothing is announced as a game: it happens in the world, and they say it in their own words.
   ========================================================= */
const TRIALS = {
  badbuzz: { ms: 72 * HR, need: 1, ok: (g, c) => !inBadBuzz(c) },
  tonbuzz: { ms: 72 * HR, need: 2, judge: true, ok: (g, c) => !liveRumor(g) && rumorSource(g).some((e) => e !== c) },
  photo: { ms: 48 * HR, need: 2, judge: true, ok: () => true },
  rival: { ms: 96 * HR, need: 1, ok: (g, c) => !!rivalFor(g, c) },
  ami: { ms: 96 * HR, need: 1, ok: (g, c) => { const f = amiOf(g, c); return !!f && f.rel < 35; } },
  depart: { ms: 72 * HR, need: 3, ok: () => true },
  secret: { ms: 48 * HR, need: 1, judge: true, ok: (g, c) => !!(c.secret && !c.secretOut && !c.secretTold) },
  doute: { need: 2, judge: true, wedding: true },
  invites: { need: 1, wedding: true },
};
const TRIAL_SHOWN = {
  badbuzz: (f, il) => `${il} prend un bad buzz pile maintenant, et attend de voir si tu l’assumes`,
  tonbuzz: (f, il) => `une rumeur court sur toi, ${il} veut des explications`,
  photo: (f, il) => `${il} a vu une photo ambiguë de toi et attend tes explications`,
  rival: (f, il) => `quelqu’un d’autre tente sa chance, et ${il} hésite`,
  ami: (f, il, c, g, tr) => `${il} attend que tu gagnes l’estime de ${((g.chars[tr.ami] || {}).name || 'son ami·e').split(' ')[0]}, son ou sa confident·e`,
  depart: (f, il) => `${il} part quelques jours, et regarde si tu gardes le lien`,
  secret: (f, il) => `${il} veut d’abord te confier quelque chose`,
  doute: (f, il) => `${il} a un doute, et a besoin d’être rassuré·e`,
  invites: () => 'tout le monde attend de savoir qui est invité',
};
// A line for their sheet: a step held back (a trial before the couple or the wedding), or their pace asking for time.
function stepNote(g, c, t = Date.now()) {
  if (!c || !isMain(c)) return null;
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel'), tr = openTrial(g, c);
  if (tr && TRIAL_SHOWN[tr.k]) return `${tr.step === 'mariage' ? '💒 Avant le mariage' : '💞 Pas encore en couple'} : ${TRIAL_SHOWN[tr.k](first, il, c, g, tr)}.`;
  const cl = coolNow(c, t);
  if (cl && COOL_SHOWN[cl.k] && ROMANCE.includes(c.vibe)) return `⏳ ${COOL_SHOWN[cl.k](g)} : pas de nouvelle étape pour l’instant.`;
  return null;
}
const TRIAL_MEM = { badbuzz: 'j’ai pris un bad buzz au pire moment : je veux voir si le joueur assume', tonbuzz: 'une rumeur court sur le joueur : j’ai besoin d’explications', photo: 'j’ai vu une photo du joueur avec quelqu’un d’autre', rival: 'quelqu’un d’autre me fait la cour… et je suis flatté·e', ami: 'mon ami·e le plus proche ne sent pas le joueur', depart: 'je pars quelques jours : on verra si le joueur garde le lien', secret: 'j’ai envie de tout dire au joueur avant de m’engager', doute: 'à l’approche du mariage, j’ai un doute', invites: 'le mariage approche : qui sera invité ?' };
const openTrial = (g, c) => (g.trials || []).find((x) => x.state === 'open' && x.c === c.id) || null;
// Someone of the cast who might make a move on them (single, not their friend, of a gender that fits, not hostile to them).
function rivalFor(g, c) {
  return mains(g).filter((o) => o !== c && o.id !== c.ami && !PARTNER.includes(o.vibe) && o.followers > 500).sort((a, b) => hashStr(a.handle + c.handle) - hashStr(b.handle + c.handle))[0] || null;
}
// Called by applyVibe before the step to a couple: 'ok', or 'trial' (it does not happen yet).
function trialCheck(g, c, v, t = Date.now()) {
  if (v !== 'couple') return 'ok';
  if (openTrial(g, c)) return 'trial';
  if (c.dareWon && t - c.dareWon < 6 * HR) return 'ok'; // a crush at first sight skips it
  if ((c.trialsWon || []).includes('couple')) return 'ok'; // passed once already (together again)
  startTrial(g, c, 'couple');
  return 'trial';
}
function startTrial(g, c, step, kind) {
  const t = Date.now(), first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel'), lui = gx(c.g, 'lui', 'elle', 'iel');
  const kinds = Object.keys(TRIALS).filter((k) => !TRIALS[k].wedding && TRIALS[k].ok(g, c));
  const k = kind || kinds[Math.min(kinds.length - 1, Math.floor(roll() * kinds.length))];
  const T = TRIALS[k];
  const tr = { id: uid('tr'), c: c.id, step, k, at: t, until: t + T.ms, state: 'open', need: T.need, got: 0 };
  g.trials = (g.trials || []).filter((x) => x.state === 'open' || t - x.at < 14 * 24 * HR).concat(tr);
  addMem(g, c, TRIAL_MEM[k]);
  if (k === 'badbuzz') {
    const loss = Math.round(c.followers * 0.08);
    c.followers = Math.max(12, c.followers - loss);
    c.badBuzz = { at: t, until: tr.until, reason: 'une vieille histoire qui ressort au pire moment', loss, strength: 0.6, trial: tr.id };
    addNotif(g, { k: 'badbuzz', c: c.id, at: later(), text: `${c.name} est en plein bad buzz : −${nAbonnes(loss)}` });
    addTrigger(g, `@${c.handle} se prend un bad buzz (une vieille histoire ressort, des screens circulent) pile au moment où le joueur et ${lui} allaient se mettre ensemble. ${first} écrit au joueur : ${il} a besoin de savoir s’il assumera, en public.`, c.id);
  } else if (k === 'tonbuzz') {
    const e = rumorSource(g).find((x) => x !== c);
    addRumor(g, e, 'joue avec les sentiments des gens pour faire le buzz', 2);
    addTrigger(g, `Pile au moment où @${c.handle} allait se mettre en couple avec le joueur, une rumeur sur lui circule : ${first} hésite et lui demande des explications franches, en privé.`, c.id);
  } else if (k === 'photo') {
    addTrigger(g, `Une photo du joueur avec quelqu’un d’autre circule (innocente, mais ambiguë) pile au moment où @${c.handle} allait se mettre en couple avec lui : ${first} l’a vue et lui demande des explications en privé, sans hystérie.`, c.id);
  } else if (k === 'rival') {
    const r = rivalFor(g, c);
    tr.rival = r.id;
    addTrigger(g, `@${r.handle} tente sa chance avec @${c.handle}, en public, au moment où le joueur et ${first} allaient se mettre ensemble : ${first} est ${gx(c.g, 'flatté', 'flattée', 'flatté·e')} et hésite.`, r.id);
  } else if (k === 'ami') {
    const f = amiOf(g, c);
    tr.ami = f.id;
    tr.base = f.rel;
    addTrigger(g, `@${f.handle}, le ou la confident·e de @${c.handle}, ne sent pas le joueur et le fait savoir : ${first} attend que le joueur gagne son estime avant de s’engager.`, f.id);
  } else if (k === 'depart') {
    tr.days = [];
    addTrigger(g, `@${c.handle} part quelques jours (un voyage, un stage, une tournée) juste au moment où le joueur et ${lui} allaient se mettre ensemble : ${first} le lui dit en privé.`, c.id);
  } else if (k === 'secret') {
    addTrigger(g, `Avant de s’engager, @${c.handle} veut tout dire au joueur : ${il} lui confie en privé son secret (${c.secret}).`, c.id);
  }
  addNotif(g, { k: 'vibe', c: c.id, at: later() + 4000, text: `💞 Avec ${first}, ce n’est pas encore officiel : ${TRIAL_SHOWN[k](first, il, c, g, tr)}.` }); // 0.29.1: said, not left to guess
  return tr;
}
// Before the wedding: a doubt, or the guest list.
function startVeille(g, c, ev) {
  if (!c || openTrial(g, c)) return null;
  const t = Date.now(), first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel');
  const k = roll() < 0.5 ? 'doute' : 'invites';
  const tr = { id: uid('tr'), c: c.id, step: 'mariage', k, at: t, until: ev.due, state: 'open', need: TRIALS[k].need, got: 0, ev: ev.id };
  if (k === 'invites') tr.close = mains(g).filter((o) => o !== c && o.rel >= 60).map((o) => o.id);
  g.trials = (g.trials || []).concat(tr);
  addMem(g, c, TRIAL_MEM[k]);
  addTrigger(g, k === 'doute' ? `À l’approche du mariage, @${c.handle} a un doute (le trac, une peur, une vieille blessure) : ${il} en parle au joueur en privé.`
    : `Le mariage du joueur et de @${c.handle} approche : tout le monde attend de savoir qui est invité (en général, on l’annonce dans un post).`, c.id);
  return tr;
}
const TRIAL_WON = {
  badbuzz: (c) => `tu l’as ${gx(c.g, 'soutenu', 'soutenue', 'soutenu·e')} dans la tempête`, tonbuzz: (c) => `tu as su ${gx(c.g, 'le', 'la', 'le ou la')} rassurer`, photo: () => 'tu as tout expliqué',
  rival: (c) => `tu ne l’as pas ${gx(c.g, 'laissé', 'laissée', 'laissé·e')} filer`, ami: (c, g, tr) => { const f = g.chars[tr.ami]; return f ? `${firstName(f)} t’a ${px(g, 'adopté', 'adoptée', 'adopté·e')}` : 'son entourage t’a adopté·e'; },
  depart: () => 'tu as gardé le lien', secret: () => 'tu as bien réagi à son secret', doute: (c) => `tu as su ${gx(c.g, 'le', 'la', 'le ou la')} rassurer`, invites: () => 'tout le monde est invité',
};
function winTrial(g, tr) {
  const c = g.chars[tr.c];
  tr.state = 'won';
  if (!c) return;
  const first = firstName(c), t = later(), why = TRIAL_WON[tr.k](c, g, tr);
  c.trialsWon = (c.trialsWon || []).concat(tr.step);
  applyRel(g, c, 6, why, t + 500, 8);
  applyTrust(g, c, 5, why, t + 700, { free: true });
  addMem(g, c, `on a surmonté ça ensemble : ${why}`);
  if (tr.k === 'badbuzz' && c.badBuzz && c.badBuzz.trial === tr.id) { c.badBuzz.until = Date.now(); c.followers += Math.round((c.badBuzz.loss || 0) * 0.6); addWhisper(g, c, `a défendu @${c.handle} quand tout le monde lui tombait dessus`, { tone: 'good', seed: 'defend' }); }
  if (tr.k === 'secret') c.secretTold = true;
  if (tr.step === 'couple') forceLove(g, c, 'couple', why, t + 900);
  else if (tr.step === 'mariage') { const ev = eventOf(g, tr.ev); if (ev) ev.diff = DIFFS[Math.max(0, diffIx(diffOf(ev.diff)) - 1)].id; addNotif(g, { k: 'relup', c: c.id, at: t, text: `💒 ${first} est ${gx(c.g, 'prêt', 'prête', 'prêt·e')} pour le grand jour.` }); }
}
function loseTrial(g, tr) {
  const c = g.chars[tr.c];
  tr.state = 'lost';
  if (!c) return;
  const first = firstName(c), t = later();
  if (tr.step === 'couple') {
    applyRel(g, c, tr.k === 'badbuzz' ? -8 : -6, { badbuzz: 'tu n’as pas été là dans la tempête', secret: 'ta réaction à son secret', photo: 'cette photo reste en travers', tonbuzz: 'cette rumeur reste en travers' }[tr.k] || 'pas maintenant', t + 500, 10);
    if (tr.k === 'secret') applyTrust(g, c, -10, 'ta réaction à son secret', t + 700);
    c.pace = { at: Date.now(), v: c.vibe }; // it will take longer
    addMem(g, c, 'on n’était pas prêts, pas maintenant');
  } else if (tr.step === 'mariage') {
    const ev = eventOf(g, tr.ev);
    if (ev) ev.diff = DIFFS[Math.min(DIFFS.findIndex((d) => d.id === 'mythique'), diffIx(diffOf(ev.diff)) + 2)].id;
    addMem(g, c, 'j’arrive au mariage avec un doute');
    addNotif(g, { k: 'reldown', c: c.id, at: t, text: `💒 ${first} arrive au mariage avec un doute.` });
  }
}
// Before a private message: a trip kept up day after day; a flirt elsewhere, caught by a partner.
function trialBeforeDM(g, c, text, t = Date.now()) {
  const tr = openTrial(g, c);
  if (tr && tr.k === 'depart') {
    const day = Math.floor((t - tr.at) / (24 * HR));
    if (!tr.days.includes(day)) tr.days.push(day);
    if (tr.days.length >= tr.need) winTrial(g, tr);
  }
  if (!loveMove(text)) return;
  const p = mains(g).find((o) => o !== c && PARTNER.includes(o.vibe));
  if (!p || t - (p.caughtAt || 0) < 24 * HR || roll() >= (p.coeur === 'jaloux' ? 0.45 : 0.2)) return;
  p.caughtAt = t;
  noteCaught(g, t); // 0.28: the discipline of a charmer starts again
  const first = firstName(c);
  applyRel(g, p, -12, `une capture de tes messages à ${first}`, later() + 4000, 15);
  addMem(g, p, `j’ai vu une capture : le joueur drague ${c.name}`);
  addNotif(g, { k: 'screen', c: p.id, at: later() + 3500, text: `📸 Une capture de tes messages à ${first} est arrivée jusqu’à ${firstName(p)}.` });
  addTrigger(g, `@${p.handle}, qui est ${VIBES[p.vibe].ai} avec le joueur, a vu une capture où le joueur drague @${c.handle} : crise, explications.`, p.id);
  startCool(g, p, 'colere', 'une capture de tes messages');
}
// After a post or a reply: standing by someone in a bad buzz; the guest list of a wedding.
function heartsAfterAct(ctx) {
  const g = ctx.g, men = ctx.men || [], kind = ctx.eval ? ctx.eval.kindness || 0 : 0;
  const target = ctx.target && ctx.target.a && ctx.target.a.startsWith('c:') ? g.chars[ctx.target.a.slice(2)] : null;
  for (const c of men.concat(target ? [target] : [])) touch(c); // talking to them in public is news too
  for (const c of new Set(men.concat(target ? [target] : []))) { // 0.15
    if (!c || !isMain(c)) continue;
    if (c.cut && kind >= 2) reconnect(g, c); // a public gesture, for someone who cut ties
    if (inBadBuzz(c) && c.badBuzz.self && !c.badBuzz.sided && Math.abs(kind) >= 2) sideSelfBuzz(g, c, kind > 0 ? 'defend' : 'pile');
  }
  for (const tr of (g.trials || []).filter((x) => x.state === 'open')) {
    const c = g.chars[tr.c];
    if (!c) continue;
    if (tr.k === 'badbuzz' && kind >= 2 && (men.includes(c) || target === c)) { tr.got += 1; if (tr.got >= tr.need) winTrial(g, tr); }
    else if (tr.k === 'invites' && ctx.kind === 'post' && men.includes(c)) {
      const asked = new Set(men.map((x) => x.id));
      for (const id of tr.close || []) {
        const o = g.chars[id];
        if (!o || asked.has(id)) continue;
        applyRel(g, o, -10, 'pas invité·e à ton mariage', later() + 2000, 12);
        addMem(g, o, 'le joueur ne m’a pas invité·e à son mariage');
        addTrigger(g, `@${o.handle}, proche du joueur, n’est pas sur la liste des invités de son mariage avec @${c.handle} : ça se voit, ça se dit.`, o.id);
      }
      winTrial(g, tr);
    }
  }
}
// 0.15: someone in a bad buzz of their own doing: the player stood by them in public, or piled on.
function sideSelfBuzz(g, c, how) {
  const first = firstName(c), t = later();
  c.badBuzz.sided = how;
  if (how === 'defend') {
    const fin = gx(c.g, 'défendu', 'défendue', 'défendu·e');
    applyRel(g, c, 6, `tu l’as ${fin} pendant son bad buzz`, t + 900, 8);
    applyTrust(g, c, 4, 'tu étais là dans la tempête', t + 1100, { free: true });
    addMem(g, c, `le joueur m’a ${fin} quand j’étais en plein bad buzz`);
    addWhisper(g, c, `a défendu @${c.handle} quand tout le monde lui tombait dessus`, { tone: 'good', seed: 'defend' });
    foesNotice(g, c, 'public', t); // whoever cannot stand them sees whose side the player is on
  } else {
    applyRel(g, c, -8, 'tu en as rajouté pendant son bad buzz', t + 900, 10);
    addMem(g, c, 'le joueur en a rajouté quand j’étais en plein bad buzz');
    for (const f of foesOf(g, c)) applyRel(g, f, 2, `ta pique contre ${first}`, t + 1600, 3);
  }
}
// Their bad buzz blows over: part of the followers come back; a close one the player left alone through it remembers.
function selfBuzzOver(g, c) {
  const b = c.badBuzz;
  b.over = true;
  c.followers += Math.round((b.loss || 0) * 0.4);
  if (!b.sided && (c.rel >= 45 || PARTNER.includes(c.vibe))) {
    applyRel(g, c, -4, 'tu n’as rien dit pendant son bad buzz', later(), 6);
    addMem(g, c, 'le joueur n’a rien dit quand j’étais en plein bad buzz');
  }
}
// A rumor about the player debunked (their trial is won), or stuck for good (lost).
function trialsOnRumor(g, how) {
  for (const tr of (g.trials || []).filter((x) => x.state === 'open' && x.k === 'tonbuzz')) (how === 'debunked' ? winTrial : loseTrial)(g, tr);
}
// After a date: a rival's challenge met.
function trialAfterDate(g, ev, c) {
  const tr = openTrial(g, c);
  if (tr && tr.k === 'rival' && ev.played && ev.played.tier !== 'flop') winTrial(g, tr);
}
const TRIAL_AI = {
  badbuzz: (f, il) => `${f} est en plein bad buzz, pile au moment où ils allaient se mettre ensemble : ${il} a besoin de savoir si le joueur l’assumera, en public. Pas de couple tant que ce n’est pas réglé.`,
  tonbuzz: (f, il) => `${f} hésite à se mettre en couple : une rumeur circule sur le joueur, et ${il} veut des explications franches. Pas de couple tant que ce n’est pas réglé.`,
  photo: (f, il) => `${f} a vu une photo ambiguë du joueur avec quelqu’un d’autre et attend des explications avant de s’engager.`,
  rival: (f, il, c, g, tr) => `@${(g.chars[tr.rival] || {}).handle || 'quelqu’un'} tente sa chance avec ${f}, qui est ${gx(c.g, 'flatté', 'flattée', 'flatté·e')} et hésite : un vrai bon moment avec le joueur ferait pencher la balance.`,
  ami: (f, il, c, g, tr) => `${f} attend que le joueur gagne l’estime de @${(g.chars[tr.ami] || {}).handle || 'son ami·e'}, son ou sa confident·e, avant de s’engager.`,
  depart: (f, il, c) => `${f} est ${gx(c.g, 'parti', 'partie', 'parti·e')} quelques jours : ${il} regarde si le joueur garde le lien chaque jour.`,
  secret: (f, il, c) => `${f} veut tout dire avant de s’engager : ${il} confie son secret au joueur (${c.secret}) et guette sa réaction.`,
  doute: (f, il, c) => `À l’approche du mariage, ${f} a un doute : ${il} a besoin d’être ${gx(c.g, 'rassuré', 'rassurée', 'rassuré·e')}.`,
  invites: (f) => `Le mariage approche : ${f} attend que le joueur annonce qui est invité.`,
};
function trialLines(g, c) {
  const tr = openTrial(g, c);
  if (!tr) return [];
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel');
  const L = [TRIAL_AI[tr.k](first, il, c, g, tr)];
  if (tr.step === 'couple') L.push(`Tant que ce n’est pas réglé, ils ne sont PAS encore en couple : si le joueur propose d’officialiser, ${first} ne dit pas un oui franc (« oui, mais… », « laisse-moi un peu de temps »), sans le repousser pour autant ; pas de ligne vibe "couple".`); // 0.29.1
  return L;
}
const trialJudge = (g, c) => { const tr = c && openTrial(g, c); return !!(tr && TRIALS[tr.k].judge); };
// A judged answer in private: a trial moves on (secret: a bad reaction ends it at once).
function trialAfterDM(g, c, react) {
  const tr = openTrial(g, c);
  if (!tr || !TRIALS[tr.k].judge) return false;
  if (tr.fresh) { delete tr.fresh; return true; } // 0.29.1: opened by the message they answer: the next ones are judged
  const good = react === 'charme' || react === 'amuse';
  if (good) { tr.got += 1; if (tr.got >= tr.need) winTrial(g, tr); }
  else if (react === 'refroidi' || (tr.k === 'secret' && react === 'gene')) loseTrial(g, tr);
  return true;
}

/* ---------- a couple: announced or kept for the two of them ---------- */
function announceCouple(g, c) {
  if (!c || c.vibe !== 'couple' || c.officiel === 'public') return;
  const was = c.officiel;
  c.officiel = 'public';
  officialize(g, c, 'couple', later());
  if (was === 'secret') addMem(g, c, 'le joueur a fini par annoncer notre couple');
}
function keepCoupleSecret(g, c) {
  if (!c || c.vibe !== 'couple') return;
  c.officiel = 'secret';
  c.secretAt = Date.now();
  const tp = temperOf(c);
  if (tp === 'opportuniste' || tp === 'envieux' || c.coeur === 'jaloux') { applyRel(g, c, -3, 'tu préfères cacher votre couple', later() + 800, 5); addMem(g, c, 'le joueur cache notre couple'); }
  else if (c.coeur === 'prudent' || c.coeur === 'anxieux' || isDefi(c)) { applyRel(g, c, 3, 'merci de garder ça pour vous', later() + 800, 5); addMem(g, c, 'le joueur garde notre couple pour nous deux'); }
}
// The clock of trials and couples (called by tickHearts).
function tickCouples(g, t = Date.now()) {
  let ch = false;
  for (const tr of g.trials || []) {
    if (tr.state !== 'open') continue;
    if (tr.k === 'ami') { const f = g.chars[tr.ami]; if (f && f.rel >= Math.max(35, (tr.base || 0) + 15)) { winTrial(g, tr); ch = true; continue; } }
    if (t >= tr.until) { loseTrial(g, tr); ch = true; }
  }
  for (const c of mains(g)) {
    if (!PARTNER.includes(c.vibe)) continue;
    const first = firstName(c);
    if (c.vibe === 'couple' && c.officiel === 'pending' && t - ((c.pace && c.pace.at) || t) > 24 * HR) { c.officiel = 'secret'; c.secretAt = t; ch = true; }
    // a secret leaks: about once a week for the famous, rarely for a small account nobody watches (0.28.1: 4 % a day at
    // a thousand followers between them, 14 % at ten million)
    if (c.vibe === 'couple' && c.officiel === 'secret') {
      const day = Math.floor((t - (c.secretAt || t)) / (24 * HR));
      if (day > (c.leakDay || 0)) {
        c.leakDay = day;
        const eyes = Math.max(1, num(g.stats.followers, 0) + num(c.followers, 0));
        if (roll() < clamp(0.04 + 0.025 * Math.log10(eyes / 1000), 0.04, 0.2)) {
          c.officiel = 'leaked';
          addNotif(g, { k: 'drama', c: c.id, at: later(), text: `📸 Ton couple avec ${first} a fuité : tout le monde en parle.` });
          officialize(g, c, 'couple', later() + 500);
          ch = true;
        }
      }
    }
    // their bad buzz splashes the player (a public couple)
    if (inBadBuzz(c, t) && c.officiel !== 'secret' && c.officiel !== 'pending') {
      const sp = c.splash && c.splash.bb === c.badBuzz.at ? c.splash : (c.splash = { bb: c.badBuzz.at, n: 0, at: 0 });
      if (sp.n < 3 && t - sp.at >= 6 * HR) { sp.n += 1; sp.at = t; repMove(g, { image: -1.5 }, `le bad buzz de ${first} t’éclabousse`, { noCheck: true }); ch = true; }
    }
    // nobody likes being left without news
    const idle = t - (c.lastTouch || t);
    if (idle > 72 * HR) {
      const step = Math.floor((idle - 72 * HR) / (24 * HR)) + 1;
      if ((c.drift || 0) < step) {
        c.drift = step;
        applyRel(g, c, -3, 'tu ne donnes plus de nouvelles', later(), 5);
        if (c.rel < 25) applyVibe(g, c, 'complique', 'on fait une pause', later() + 600, true);
        ch = true;
      }
    } else if (c.drift) c.drift = 0;
  }
  return ch;
}
