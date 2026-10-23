/* =========================================================
   0.30: the traitors. Some of the people who come into the player's life are not who they seem:
   - « séduction »: they do everything to be in a couple with the player, for what the player has (fame, money, followers,
     a story to sell), then stab them in the back: their story sold to a media, cheating in public. A fall that hurts,
     never a death (that is the psychopath's).
   - « faux pote »: a close friend who gathers the player's confidences and messages, then betrays: a secret thrown out,
     private messages leaked, a rumor, the enemy's side.
   They are drawn among the newcomers (more often with a toxic name: it draws people like itself), and once, among the
   cast, when the name is very toxic; never the psychopath, never the critic nor Rebecca. Their AI plays the part, with
   small signs a careful player can notice (noted in their file, like the psychopath's). The game decides when they
   strike, and what it costs. A player who sees through them foils it: a breakup or cut ties before they strike, or
   confronting them with facts (their AI decides whether they are caught).
   With a very toxic name, once the psychopath is unmasked, a newcomer may be another one.
   ========================================================= */
const TRAIT_P = [0.1, 0.18, 0.32, 0.5]; // the chance a newcomer is one, by toxic level
const TRAIT_MAX = 2; // at once
const traitorsOf = (g) => g.traitors || (g.traitors = []);
const traitOf = (g, c) => (g && c ? (g.traitors || []).find((T) => T.c === c.id && !T.done) || null : null);
function maybeTraitor(g, c, t = Date.now(), o = {}) {
  if (!g || !c || !isMain(c) || c.fixed || isPsy(g, c) || isStalker(g, c) || traitOf(g, c) || c.cut || c.jailed) return null;
  if (traitorsOf(g).filter((T) => !T.done).length >= TRAIT_MAX) return null;
  const T0 = window.__HYPE_TEST__ ? window.__traitPick : null; // (the tests: { handle, kind })
  if (window.__HYPE_TEST__ && window.__traitNone) return null;
  if (T0 && T0.handle !== c.handle) return null;
  if (!T0 && Math.random() >= (o.p != null ? o.p : TRAIT_P[toxLv(g)])) return null;
  const T = { c: c.id, kind: T0 ? T0.kind : o.kind || (Math.random() < 0.5 ? 'seduction' : 'faux'), at: t, stage: 0, signs: 0 };
  traitorsOf(g).push(T);
  return T;
}
// 0 the approach; 1 the hook (in a couple with the player, or a close friend); 2 ready to strike (the game picks when).
function traitStage(g, T, t = Date.now()) {
  const c = T && g.chars[T.c];
  if (!c || T.done) return -1;
  const hooked = T.kind === 'seduction' ? PARTNER.includes(c.vibe) : (BOND_VIBES.includes(c.vibe) || c.rel >= 45);
  if (hooked && !T.hookAt) T.hookAt = t;
  const s = !T.hookAt ? 0 : (t - T.hookAt) / DAY_MS >= (T.kind === 'seduction' ? 2 : 3) && (t - T.at) / DAY_MS >= 4 ? 2 : 1;
  if (s > (T.stage || 0)) T.stage = s;
  return T.stage || 0;
}
// A sign the player could notice: noted in their file on them, counted.
function traitSign(g, c, text, at) {
  const T = traitOf(g, c);
  if (!T) return null;
  text = str(text, 130);
  if (text.length < 4) return null;
  T.signs = (T.signs || 0) + 1;
  if (!Array.isArray(g.clues)) g.clues = [];
  const mine = g.clues.filter((k) => k.c === c.id && k.trait);
  if (mine.length >= 8 || mine.some((x) => similar(x.text, text))) return true;
  const t = at || later();
  const k = tag({ id: uid('k'), c: c.id, text, ts: t, at: t, trait: 1 });
  g.clues.push(k);
  addNotif(g, { k: 'clue', c: c.id, at: t, text: `Indice noté sur ${c.name} : ${text}` });
  return k;
}
const TRAIT_PLAY = {
  seduction: (c, il) => ({
    want: `être en couple avec le joueur pour ce qu’il a (sa notoriété, son argent, ses abonnés, une histoire à vendre), pas par amour. ${cap1(il)} est charmant·e, flatteur·se, se rend indispensable, pousse vers le couple et l’officialisation, veut être vu·e avec lui en public`,
    stages: [`l’approche : ${il} séduit et flatte ; pas encore de signe (au plus un, minuscule)`,
      `l’accroche : ${il} demande des choses (des cadeaux, de l’argent pour un imprévu, des mentions, une collab, des photos de couple à poster), garde des captures, s’intéresse beaucoup à ses chiffres et à ses contrats`,
      `prêt·e à frapper : en apparence ${il} reste adorable, mais ${il} prépare sa sortie (ne la joue pas toi-même : le jeu décide du moment)`],
  }),
  faux: (c, il) => ({
    want: `se faire passer pour son ami·e fidèle pour récolter ses confidences, ses messages et ses secrets, et le trahir quand ça l’arrangera (jalousie, intérêt, ou le camp d’en face)`,
    stages: [`l’approche : ${il} est sympa, disponible, drôle ; pas encore de signe (au plus un, minuscule)`,
      `l’accroche : ${il} pose beaucoup de questions sur ses secrets et ses embrouilles, pousse aux confidences, répète parfois des choses ailleurs, traîne avec ses ennemis`,
      `prêt·e à frapper : en apparence ${il} reste le pote parfait, mais ${il} a ce qu’il lui faut (ne joue pas la trahison toi-même : le jeu décide du moment)`],
  }),
};
// The secret, for a call where they speak to the player (their messages, an evening, a visit).
function traitCore(g, c) {
  const T = traitOf(g, c);
  if (!T) return [];
  const st = Math.max(0, traitStage(g, T)), first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel');
  const P = TRAIT_PLAY[T.kind](c, il);
  return ['', `## SECRET DU JEU : ${first.toUpperCase()} JOUE LA COMÉDIE`,
    `Personne ne le sait : ni le joueur, ni les autres personnages. ${first} ne l’avoue jamais et ne se trahit jamais d’un coup : seulement de petits détails qui ne collent pas. Si le joueur le ou la démasque avec des faits précis (pas un simple soupçon), ${il} perd ses moyens : ajoute alors {"t":"demasque"}.`,
    `Ce qu’${il} veut : ${P.want}.`, `Où ${il} en est : ${P.stages[st]}.`];
}
const TRAIT_SIGN_LINE = '- Facultatif (au plus 1) : si tu glisses un petit détail qui ne colle pas (naturellement, jamais souligné ni expliqué), ajoute {"t":"traitre","text":"≤ 90 caractères : ce que le joueur a pu remarquer, factuel"}.';
const traitOutLines = (g, c) => (traitOf(g, c) ? [TRAIT_SIGN_LINE] : []);
// Seen through: they leave (cut ties), the player is told; the plan is foiled.
function traitUnmask(g, c, t = Date.now()) {
  const T = traitOf(g, c);
  if (!T) return false;
  T.done = 'unmasked'; T.doneAt = t;
  c.vibe = 'froid'; c.vibeGoal = null;
  applyRel(g, c, -20, 'tu l’as démasqué·e', t, 30);
  addMem(g, c, 'le joueur a vu clair dans mon jeu');
  addNotif(g, { k: 'relup', c: c.id, at: t + 1500, text: `🕵️ Tu as vu clair dans le jeu de ${c.name} : ${T.kind === 'seduction' ? `${gx(c.g, 'il', 'elle', 'iel')} se servait de toi` : `cette amitié n’était qu’une façade`}. ${gx(c.g, 'Il', 'Elle', 'Iel')} prend ses distances.` });
  addChronicle(g, `${g.player.name} a démasqué ${c.name}, qui jouait la comédie.`);
  return true;
}
// They strike: what it costs the player, and what the network will say about it.
function traitBetray(g, T, t = Date.now()) {
  const c = T && g.chars[T.c];
  if (!c || T.done) return null;
  T.done = 'betrayed'; T.doneAt = t;
  const s = g.stats, first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel'), F = s.followers, h = g.player.handle;
  const sec = secretsKnownBy(g, c)[0] || null;
  let how;
  if (T.kind === 'seduction') {
    how = Math.random() < 0.55 ? 'vend' : 'trompe';
    c.vibe = 'ex'; c.vibeGoal = null;
    applyRel(g, c, -45, 't’a trahi·e', t, 60);
    const loss = Math.round(F * (how === 'vend' ? 0.03 : 0.02));
    s.followers = Math.max(0, F - loss);
    const dr = repMove(g, how === 'vend' ? { image: -8, cred: -5 } : { image: -10, kind: -2 }, how === 'vend' ? `${c.name} vend votre histoire` : `${c.name} te trompe en public`, { noCheck: true });
    addAmbientPost(g, { by: c.handle, text: how === 'vend' ? `Il est temps que vous sachiez qui est vraiment @${h}. J’ai tout raconté. L’interview sort ce soir 👀` : `nouvelle vie, nouvelles habitudes 💋 (oui, c’est bien qui vous croyez)` }, t + randi(2000, 5000));
    addNotif(g, { k: 'cancel', c: c.id, at: t + 6000, text: how === 'vend' ? `💔 ${c.name} t’a trahi·e : ${il} vend votre histoire à un média (${repWord(dr)}, −${nAbonnes(loss)}). Tout était calculé.` : `💔 ${c.name} t’a trahi·e : ${il} s’affiche en public avec quelqu’un d’autre (${repWord(dr)}, −${nAbonnes(loss)}).` });
    addTrigger(g, how === 'vend'
      ? `@${c.handle}, qui était en couple avec le joueur, vend son histoire à un média : « tout ce qu’il ne montre pas » (ses défauts, ses coulisses, ses mensonges ; rien d’intime ni d’explicite). La presse people s’en régale, le réseau se déchire.`
      : `@${c.handle}, en couple avec le joueur, s’affiche en public avec quelqu’un d’autre sans même avoir rompu : le réseau se moque du joueur (« trompé·e en direct »), certains le plaignent.`, c.id);
  } else {
    how = sec ? 'secret' : (g.intel || []).some((x) => !x.leaked && x.known.includes(c.id)) ? 'capture' : 'rumeur';
    c.vibe = 'nemesis'; c.vibeGoal = null;
    applyRel(g, c, -40, 't’a planté un couteau dans le dos', t, 60);
    addNotif(g, { k: 'cancel', c: c.id, at: t + 6000, text: `🗡️ ${c.name}, que tu croyais ton ami·e, t’a planté un couteau dans le dos${how === 'secret' ? ' : ton secret est dehors' : how === 'capture' ? ' : tes messages privés sont dehors' : ` : ${il} répand des horreurs sur toi`}.` });
    if (how === 'secret') secretOut(g, sec, { by: c, how: 'revele' });
    else if (how === 'capture') { const it = g.intel.find((x) => !x.leaked && x.known.includes(c.id)); leakIntel(g, { id: it.id, by: c.handle, public: true }, null); }
    else addWhisper(g, c, 'joue la comédie avec tout le monde et ne pense qu’à sa gueule', { tone: 'bad', now: true, seed: 'trahison' });
    addTrigger(g, `@${c.handle}, qui se disait l’ami·e du joueur, le trahit${how === 'secret' ? ' en balançant un de ses secrets' : how === 'capture' ? ' en publiant ses messages privés' : ' en racontant partout du mal de lui'} et passe dans le camp de ses ennemis : choc, moqueries, « on t’avait prévenu ».`, c.id);
  }
  T.how = how;
  worry(g, T.kind === 'seduction' ? `${c.name} l’a trahi` : `${c.name}, son ami, l’a trahi`, t); // 0.32: the worriers rush
  addMem(g, c, T.kind === 'seduction' ? 'j’ai trahi le joueur : tout était calculé' : 'j’ai trahi le joueur, mon soi-disant ami');
  addChronicle(g, `${c.name} a trahi ${g.player.name} (${T.kind === 'seduction' ? 'tout était calculé' : 'un faux ami'}).`);
  return how;
}
// The clock: the stage, a betrayal foiled (the bond broken before), the moment they strike, one of the cast who turns.
function tickTraitors(g, t = Date.now()) {
  if (!g || g.over) return false;
  let ch = false;
  for (const T of traitorsOf(g)) {
    if (T.done) continue;
    const c = g.chars[T.c];
    if (!c || c.cut || c.jailed) { T.done = 'gone'; ch = true; continue; }
    const st = traitStage(g, T, t);
    const broken = T.hookAt && (T.kind === 'seduction' ? !LOVE_ACTIVE.includes(c.vibe) : c.rel < 10);
    if (broken) { T.done = 'foiled'; T.doneAt = t; ch = true; continue; } // (the player walked away in time: nothing happens)
    if (st >= 2 && t - (T.tryAt || 0) >= 2 * 3600000) { T.tryAt = t; if (Math.random() < 0.3) { traitBetray(g, T, t); ch = true; } }
  }
  // a very toxic name: once, someone of the cast who only follows the wind turns
  if (!g.traitCast && toxLv(g) >= 2 && t - (g.traitCastAt || 0) >= DAY_MS) {
    g.traitCastAt = t;
    const pool = mains(g).filter((c) => !c.fixed && !isPsy(g, c) && !traitOf(g, c) && !c.cut && c.rel >= 15 && ['opportuniste', 'envieux', 'trouble'].includes(temperOf(c)));
    if (pool.length && Math.random() < 0.3 && maybeTraitor(g, pick(pool), t, { p: 1, kind: 'faux' })) { g.traitCast = t; ch = true; }
  }
  return ch;
}
// Someone new arrives (a level, the button, the story): one of them may be a traitor; with a very toxic name, once the
// psychopath is unmasked, another one.
function newcomerRoll(g, c, t = Date.now()) {
  if (!g || !c || !isMain(c)) return null;
  const force = window.__HYPE_TEST__ ? window.__psy2 : undefined; // (the tests: true or false)
  if (g.psy && g.psy.out === 'unmasked' && !g.psy2 && toxLv(g) >= 3 && !c.fixed && (force != null ? force : Math.random() < 0.35) && !(window.__HYPE_TEST__ && window.__psyNone)) {
    g.psyPast = (g.psyPast || []).concat(g.psy);
    g.psy = { c: c.id, at: t, stage: 0, signs: 0, second: 1 };
    g.psy2 = t;
    return 'psy';
  }
  return maybeTraitor(g, c, t) ? 'traitre' : null;
}
