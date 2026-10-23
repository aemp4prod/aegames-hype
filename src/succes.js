/* =========================================================
   0.28: the achievements (« Succès »). Funny ones, read from what really happens in the game: the hearts, the audience,
   the career. Some stay hidden until they come (« Succès caché »). Each comes once, with a notification (the
   notifications wait while a mini-game is played). Nothing here decides anything: it only watches.
   ========================================================= */
const ACH_GROUPS = [['debut', 'Les premiers pas'], ['coeur', 'Relations'], ['drama', 'Drama et réputation'], ['avance', 'Avancement'], ['argent', 'Carrière et argent'], ['rare', 'Extrêmement rare']];
// id: a stable key, also the one the Æ Games Launcher knows (never renamed, never reused). goal: counted (« 3 / 10 »).
// hidden: « Succès caché » until it comes (those that would give away a trap of the game stay hidden). rec: its progress
// is the best reached (the count can go down again: shown as « record »).
const ACH = [
  // ---- the first steps ----
  { id: 'first-post', grp: 'debut', emoji: '✍️', name: 'Premier post', desc: 'Publier ton premier post.' },
  { id: 'viral-post', grp: 'debut', emoji: '🚀', name: 'Carton plein', desc: 'Avoir un post viral.' },
  { id: 'flop-post', grp: 'debut', emoji: '🫠', name: 'Flop complet', desc: 'Avoir un post qui flop.' },
  { id: 'internet-laughingstock', grp: 'debut', emoji: '🤡', name: 'Risée d’internet', desc: 'Avoir un post tellement nul que tout le monde se moque.' },
  { id: 'sell-me-this-pen', grp: 'debut', emoji: '🖊️', name: 'Vends-moi ce stylo', desc: 'Négocier un contrat.' },
  { id: 'first-contract', grp: 'debut', emoji: '📝', name: 'Les pubs rapportent rien', desc: 'Signer un contrat.' },
  { id: 'worldwide-trend', grp: 'debut', emoji: '🌍', name: 'Tout le monde en parle', desc: 'Lancer une tendance : un de tes hashtags, repris par tout le réseau.', hidden: true },
  // ---- relations ----
  { id: 'first-crush', grp: 'coeur', emoji: '💘', name: 'Premier crush', desc: 'Ta première vraie connexion avec quelqu’un.' },
  { id: 'charro-two', grp: 'coeur', emoji: '😏', name: 'Charro', desc: 'Sortir avec deux personnes en même temps.' },
  { id: 'charro-three', grp: 'coeur', emoji: '🍾', name: 'Charro de luxe', desc: 'Sortir avec trois personnes en même temps.' },
  { id: 'charro-week', grp: 'coeur', emoji: '🕶️', name: 'Charro discipliné', desc: 'Sortir avec trois personnes pendant une semaine sans te faire griller.', hidden: true },
  { id: 'charro-month', grp: 'coeur', emoji: '🥷', name: 'Charro ninja', desc: 'Sortir avec trois personnes pendant un mois sans te faire griller.', hidden: true },
  { id: 'coin-coin', grp: 'coeur', emoji: '🦆', name: 'Coin coin', desc: 'Offrir 1 000 € de cadeaux (ou plus) à ta moitié.', goal: 1000, unit: '€' },
  { id: 'enemies-to-lovers', grp: 'coeur', emoji: '⚔️', name: 'Enemies to lovers', desc: 'Sortir avec quelqu’un qui t’a déjà détesté au plus haut point.' },
  { id: 'good-doggy', grp: 'coeur', emoji: '🐶', name: 'Bon toutou', desc: 'Te faire piquer ta moitié par quelqu’un d’autre.', hidden: true },
  { id: 'public-enemy', grp: 'coeur', emoji: '🎯', name: 'Ennemi public n° 1', desc: 'Être détesté par tout le monde.', hidden: true },
  { id: 'too-fast', grp: 'coeur', emoji: '🐇', name: 'Chaud lapin', desc: 'Te faire recaler parce que tu vas trop vite.', hidden: true },
  { id: 'friendzone', grp: 'coeur', emoji: '🫂', name: 'Friendzone', desc: (g) => `« Non mais je te vois plus comme ${px(g, 'un frère', 'une sœur', 'un frère ou une sœur')}. »`, hidden: true },
  { id: 'just-no', grp: 'coeur', emoji: '🙅', name: 'Indésirable', desc: '« Non. »', hidden: true },
  { id: 'milf-lover', grp: 'coeur', emoji: '🍷', name: 'MILF Lover', desc: 'Sortir avec quelqu’un de plus de 35 ans.' },
  { id: 'gilf-lover', grp: 'coeur', emoji: '🫖', name: 'GILF Lover', desc: 'Sortir avec quelqu’un de plus de 55 ans.' },
  { id: 'date-from-hell', grp: 'coeur', emoji: '👹', name: 'Rendez-vous en enfer', desc: 'Rater trois rendez-vous d’affilée.', goal: 3, rec: true },
  { id: 'stood-up', grp: 'coeur', emoji: '🐰', name: 'Lapin', desc: 'Laisser quelqu’un en plan à un rendez-vous.', hidden: true },
  { id: 'ghosted', grp: 'coeur', emoji: '👻', name: 'Ghosté', desc: 'Ne plus avoir de réponse pendant trois jours.', hidden: true },
  { id: 'ex-comeback', grp: 'coeur', emoji: '🔁', name: 'Le retour de l’ex', desc: 'Te remettre avec ton ex.' },
  { id: 'express-wedding', grp: 'coeur', emoji: '⚡', name: 'Mariage express', desc: 'De la rencontre au mariage en moins d’une semaine.' },
  { id: 'ungrateful', grp: 'coeur', emoji: '🙃', name: 'Ingrat', desc: 'Revendre sur Occaz un cadeau… et que la personne tombe sur l’annonce.', hidden: true },
  { id: 'engaged', grp: 'coeur', emoji: '💍', name: 'Oui !', desc: 'Te fiancer.' },
  { id: 'married', grp: 'coeur', emoji: '💒', name: 'Pour le meilleur et pour le pire', desc: 'Te marier.' },
  // ---- drama and reputation ----
  { id: 'phoenix', grp: 'drama', emoji: '🔥', name: 'Le phénix', desc: 'Remonter de moins de 100 à plus de 700 de réputation.' },
  { id: 'fake-proof-busted', grp: 'drama', emoji: '💎', name: 'Le comte de menthe et cristaux', desc: 'Te faire griller avec une fausse preuve.', hidden: true },
  { id: 'the-crow', grp: 'drama', emoji: '🐦', name: 'Le corbeau', desc: 'Une rumeur anonyme que tu as lancée prend.', hidden: true },
  { id: 'public-apology', grp: 'drama', emoji: '🙇', name: 'Ohh, grand prince', desc: 'T’excuser publiquement.' },
  { id: 'apology-accepted', grp: 'drama', emoji: '🙏', name: 'Est-ce que c’est bon pour vous ?', desc: 'Des excuses publiques qui passent.' },
  { id: 'secret-out', grp: 'drama', emoji: '🤐', name: 'J’fais des trucs un peu malsains', desc: 'Avoir un secret dévoilé sans le vouloir.', hidden: true },
  { id: 'cashed-the-check', grp: 'drama', emoji: '💸', name: 'Moi j’ai touché le chèque', desc: 'Avoir une sponso mal reçue.' },
  { id: 'owned-the-bad-buzz', grp: 'drama', emoji: '😤', name: 'Gngn je pensais pas ça de toi', desc: 'Assumer un bad buzz.' },
  { id: 'hype-train', grp: 'drama', emoji: '🚂', name: 'Il est bien monté le minotaure', desc: 'Monter dans le train de la hyyype.' },
  { id: 'cancelled', grp: 'drama', emoji: '🧯', name: 'Annulé', desc: 'Te faire annuler par le réseau.', hidden: true },
  // ---- the climb ----
  { id: 'gaining-traction', grp: 'avance', emoji: '📈', name: 'Ça commence à prendre', desc: 'Atteindre 1 000 abonnés.', goal: 1000, rec: true },
  { id: 'partner-program', grp: 'avance', emoji: '🤝', name: 'Partenaire', desc: 'Débloquer la monétisation.' },
  { id: 'silver-play-button', grp: 'avance', emoji: '🥈', name: 'Silver Play Button', desc: 'Atteindre 100 000 abonnés.' },
  { id: 'golden-play-button', grp: 'avance', emoji: '🥇', name: 'Golden Play Button', desc: 'Atteindre 500 000 abonnés.' },
  { id: 'diamond-play-button', grp: 'avance', emoji: '💎', name: 'Diamant Play Button', desc: 'Atteindre 1 000 000 d’abonnés.' },
  { id: 'ruby-play-button', grp: 'avance', emoji: '♦️', name: 'Ruby Play Button', desc: 'Atteindre 10 000 000 d’abonnés.' },
  { id: 'poopy-play-button', grp: 'avance', emoji: '💩', name: 'Poopy Play Button', desc: 'Retomber à 0 abonné. Mais… comment ?', hidden: true },
  { id: 'pigeon', grp: 'avance', emoji: '🛍️', name: 'Pigeon', desc: 'Acheter chacun des objets de la boutique (à gemmes).', goal: 4 },
  // ---- career and money ----
  { id: 'in-the-red', grp: 'argent', emoji: '🔴', name: 'Dans le rouge', desc: 'Passer à découvert.' },
  { id: 'incorruptible', grp: 'argent', emoji: '✋', name: 'Intègre', desc: 'Refuser 10 offres de marques.', goal: 10 },
  { id: 'billboard', grp: 'argent', emoji: '🪧', name: 'Panneau publicitaire', desc: 'Signer 5 contrats le même mois.', goal: 5, rec: true },
  { id: 'big-spender', grp: 'argent', emoji: '💳', name: 'Flambeur', desc: 'T’offrir la nouveauté la plus chère du moment.' },
  { id: 'yard-sale', grp: 'argent', emoji: '📦', name: 'Vide-grenier', desc: 'Vendre 10 objets sur Occaz.', goal: 10 },
  { id: 'the-boss', grp: 'argent', emoji: '💼', name: 'Le boss', desc: 'Avoir une équipe de 5 personnes.', goal: 5, rec: true },
  { id: 'jail-time', grp: 'argent', emoji: '🚔', name: 'Case prison', desc: 'Avoir un partenariat illégal découvert.', hidden: true },
  { id: 'tv-show', grp: 'argent', emoji: '📺', name: 'Ça devient la télé', desc: 'Produire une vidéo à plus de 100 000 €.' },
  { id: 'mrbeast', grp: 'argent', emoji: '🤑', name: 'MrBeast', desc: 'Produire une vidéo à plus de 1 000 000 €.' },
  { id: 'born-to-be-hero', grp: 'argent', emoji: '🦸', name: 'Born to be hero', desc: 'Dénoncer un influvoleur.', hidden: true },
  // ---- extremely rare ----
  { id: 'subject-expert', grp: 'rare', emoji: '🎓', name: 'Expert en la matière', desc: 'Réussir 10 tournages d’affilée en Cauchemar.', goal: 10, rec: true },
  { id: 'living-legend', grp: 'rare', emoji: '🌌', name: 'Légende vivante', desc: 'Réussir un tournage en Mythique.' },
  { id: 'sleepless-night', grp: 'rare', emoji: '🦉', name: 'Nuit blanche', desc: 'Publier entre 3 h et 5 h du matin.' },
];
const ACH_BY = Object.fromEntries(ACH.map((A) => [A.id, A]));
const ACH_PLAY = [['gaining-traction', 1000], ['silver-play-button', 100000], ['golden-play-button', 500000], ['diamond-play-button', 1000000], ['ruby-play-button', 10000000]];
const achDesc = (g, A) => (typeof A.desc === 'function' ? A.desc(g) : A.desc);
// A name that agrees with the player (« Ghostée », « Annulée », « Ingrate »…).
const ACH_FEM = { ghosted: ['Ghosté', 'Ghostée', 'Ghosté·e'], cancelled: ['Annulé', 'Annulée', 'Annulé·e'], ungrateful: ['Ingrat', 'Ingrate', 'Ingrat·e'], 'big-spender': ['Flambeur', 'Flambeuse', 'Flambeur·se'],
  'public-enemy': ['Ennemi public n° 1', 'Ennemie publique n° 1', 'Ennemi·e public·que n° 1'], 'subject-expert': ['Expert en la matière', 'Experte en la matière', 'Expert·e en la matière'] };
const achName = (g, A) => (ACH_FEM[A.id] ? px(g, ...ACH_FEM[A.id]) : A.name);
function ensureAch(g) {
  if (!g.ach || typeof g.ach !== 'object') g.ach = {};
  if (!g.ach.got || typeof g.ach.got !== 'object') g.ach.got = {};
  if (!g.ach.prog || typeof g.ach.prog !== 'object') g.ach.prog = {};
  const was = 'chea' + 'ted'; // (0.29: the mark of a game changed by hand, under its name of before)
  if (g.ach[was]) { g.ach.local = 1; delete g.ach[was]; }
  return g.ach;
}
const achGot = (g, id) => !!(g && g.ach && g.ach.got && g.ach.got[id]);
const achCount = (g) => ACH.filter((A) => achGot(g, A.id)).length;
// To the Æ Games Launcher too, when it launched the PC app (its service adds the ticket; elsewhere: nothing).
// « gaining-traction » is the followers' total itself (sent apart, when it changes and at each game's start).
function achOut(g, op, id, value) {
  if (id === 'gaining-traction' && op !== 'follow') return;
  if (g && g.ach && g.ach.local) return; // (a game changed by hand keeps them to itself)
  try { if (HOST && HOST.ach) HOST.ach(op === 'follow' ? 'set' : op, id, value, g && g.id); } catch (e) { /* (never in the way of the game) */ }
}
// Once per game and session: what it already has (unlocked while Hype was launched on its own, before 0.28…).
let achSyncedFor = null, achFolSent = null, achFolOf = null, achFolAt = 0;
function achSync(g) {
  if (!g || achSyncedFor === g.id) return;
  achSyncedFor = g.id;
  achFolSent = null;
  const st = ensureAch(g);
  for (const A of ACH) {
    if (achGot(g, A.id)) achOut(g, A.goal ? 'set' : 'unlock', A.id, A.goal || null);
    else if (A.goal && st.prog[A.id] > 0) achOut(g, 'set', A.id, st.prog[A.id]);
  }
}
// Unlocked: once, with its notification (its toast waits for a mini-game to end, as all of them).
function unlockAch(g, id, at) {
  const A = ACH_BY[id];
  if (!g || !A || achGot(g, id)) return false;
  const t = (at || Date.now()) + 1200; // (after what brought it)
  const st = ensureAch(g);
  st.got[id] = t;
  if (A.goal) st.prog[id] = Math.max(st.prog[id] || 0, A.goal);
  addNotif(g, { k: 'ach', a: id, at: t, text: `🏆 Succès débloqué : ${achName(g, A)}` }); // (0.28.1: its icon shows with it)
  achOut(g, A.goal ? 'set' : 'unlock', id, A.goal || null);
  return true;
}
// A counted one: where it stands (it only goes up), unlocked at its goal. The launcher gets the total when it changes.
function achProgress(g, id, value, at) {
  const A = ACH_BY[id];
  if (!g || !A || !A.goal) return;
  const st = ensureAch(g), v = Math.max(0, Math.floor(num(value, 0)));
  if (v <= (st.prog[id] || 0)) return;
  st.prog[id] = v;
  if (v >= A.goal) unlockAch(g, id, at);
  else achOut(g, 'set', id, v);
}
// A contract signed: the first one; five in the same month of the game (the best month is what counts).
function dealSignedAch(g, t = Date.now()) {
  unlockAch(g, 'first-contract', t);
  const st = ensureAch(g), mk = monthKey(gameDate(t));
  st.signN = st.signMonth === mk ? (st.signN || 0) + 1 : 1;
  st.signMonth = mk;
  achProgress(g, 'billboard', st.signN, t);
}
// Back to a save: what was unlocked since stays unlocked, counted ones keep their best (the streaks are the save's).
function achKeep(snap, g) {
  if (!snap || !g || !g.ach) return;
  const a = snap.ach && typeof snap.ach === 'object' ? snap.ach : {}, b = g.ach;
  const got = Object.assign({}, a.got), prog = Object.assign({}, a.prog);
  for (const id in b.got || {}) if (!got[id]) got[id] = b.got[id];
  for (const id in b.prog || {}) prog[id] = Math.max(prog[id] || 0, b.prog[id] || 0);
  // (0.28.1) the counters behind them are the save's own: an offer declined, then the save loaded, then declined again,
  // is one offer declined (the progress shown keeps its high-water mark, it never goes down)
  snap.ach = Object.assign({}, a, { got, prog });
  if (b.local) snap.ach.local = 1;
}
// Caught with someone else (a partner finds out): the « discipline » starts again.
function noteCaught(g, t = Date.now()) { if (g) ensureAch(g).caughtAt = t; }
// What can be read at any moment: the audience, the career, the hearts. (Called with the clock, every few seconds.)
const ROMANCE_ON = ['crush', 'flirt', 'couple', 'fiancailles', 'mariage'];
function tickAch(g, t = Date.now()) {
  if (!g || !g.ready || !g.stats) return;
  achSync(g);
  const st = ensureAch(g), s = g.stats, fol = Math.max(0, Math.round(num(s.followers, 0)));
  // the audience: the launcher gets the total itself when it changed (every 30 seconds at most), and at once when a
  // game or a save opens
  if (achFolOf !== g) { achFolOf = g; achFolSent = null; }
  if (fol !== achFolSent && (achFolSent === null || Math.abs(t - achFolAt) >= 30000)) { achFolSent = fol; achFolAt = t; achOut(g, 'follow', 'gaining-traction', fol); }
  if (fol > (st.maxFol || 0)) st.maxFol = fol;
  achProgress(g, 'gaining-traction', Math.min(fol, 1000), t);
  for (const [id, n] of ACH_PLAY) if (fol >= n) unlockAch(g, id, t);
  if (fol <= 0 && (st.maxFol || 0) >= 10) unlockAch(g, 'poopy-play-button', t); // (back down to nothing, after having had an audience)
  if (s.posts > 0 && !(g.posts || []).some((p) => p.a === 'p' && p.pending)) unlockAch(g, 'first-post', t); // (once the network has seen it)
  if (s.trains > 0) unlockAch(g, 'hype-train', t);
  st.soldN = Math.max(st.soldN || 0, invSold(g).length); // (a game from before 0.28: what its list still shows)
  if (st.soldN) achProgress(g, 'yard-sale', st.soldN, t);
  if (!achGot(g, 'worldwide-trend') && Math.abs(t - achTrendAt) > 30000) { achTrendAt = t; if (myTrend(g, t)) unlockAch(g, 'worldwide-trend', t); }
  // the reputation, from the depths: under 100 once, then over 700
  const rep = rep1000(s.reputation);
  if (rep < 100) st.repLow = 1;
  if (st.repLow && rep > 700) unlockAch(g, 'phoenix', t);
  if (s.cancelled) unlockAch(g, 'cancelled', t);
  if (g.pbb && !g.pbb.over && t >= g.pbb.until) { g.pbb.over = 1; if (!g.pbb.sorry && !g.pbb.agency) unlockAch(g, 'owned-the-bad-buzz', t); } // 0.28.1: assumed
  // the career, the money
  const car = g.career || {};
  if (car.prog && car.prog.state === 'on') unlockAch(g, 'partner-program', t);
  if (num(car.cash, 0) < 0) unlockAch(g, 'in-the-red', t);
  achProgress(g, 'the-boss', (g.staff || []).length, t);
  // the hearts
  const ms = mains(g);
  for (const c of ms) if (c.rel <= -60) c.hated = 1; // (« Ennemi juré » once: remembered)
  if (ms.some((c) => ROMANCE_ON.includes(c.vibe))) unlockAch(g, 'first-crush', t);
  const partners = ms.filter((c) => PARTNER.includes(c.vibe));
  if (partners.length >= 2) unlockAch(g, 'charro-two', t);
  if (partners.length >= 3) {
    unlockAch(g, 'charro-three', t);
    if (!st.multiFrom) st.multiFrom = t;
    const since = Math.max(st.multiFrom, st.caughtAt || 0);
    if (t - since >= 7 * DAY_MS) unlockAch(g, 'charro-week', t);
    if (t - since >= 30 * DAY_MS) unlockAch(g, 'charro-month', t);
  } else st.multiFrom = 0;
  for (const c of partners) {
    if (c.hated) unlockAch(g, 'enemies-to-lovers', t);
    if (c.age > 35) unlockAch(g, 'milf-lover', t);
    if (c.age > 55) unlockAch(g, 'gilf-lover', t);
    if (c.vibe === 'fiancailles' || c.vibe === 'mariage') unlockAch(g, 'engaged', t);
    if (c.vibe === 'mariage') {
      unlockAch(g, 'married', t);
      const met = c.firstTalk || c.unlockedAt || Infinity, wed = c.pace && c.pace.v === 'mariage' ? c.pace.at : t;
      if (Number.isFinite(met) && wed - met < 7 * DAY_MS) unlockAch(g, 'express-wedding', t);
    }
  }
  if (ms.length >= 4 && ms.every((c) => c.rel <= -30)) unlockAch(g, 'public-enemy', t); // (everyone a rival or worse)
  // ghosted: a message of the player with no answer for three days (left on read, or « … »)
  for (const c of ms) {
    const msgs = (g.dms[c.id] || {}).msgs || [];
    let last = null;
    for (let k = msgs.length - 1; k >= 0 && !last; k--) { const m = msgs[k]; if (!m.sys && (m.me || m.text !== '…')) last = m; }
    if (last && last.me && t - (last.at || t) >= 3 * DAY_MS) { unlockAch(g, 'ghosted', t); break; }
  }
}
// A hashtag of the player's among the network's trends, taken up by at least three others since.
let achTrendAt = 0;
function myTrend(g, t = Date.now()) {
  for (const [tag] of trends(g, t)) {
    const k = tag.toLowerCase(), has = (p) => (p.text.match(TAG_RE) || []).some((x) => x.toLowerCase() === k);
    const mine = (g.posts || []).filter((p) => p.a === 'p' && !p.pending && p.at <= t && has(p));
    if (!mine.length) continue;
    const from = Math.min(...mine.map((p) => p.at));
    if ((g.posts || []).some((p) => p.a !== 'p' && p.at < from && has(p))) continue; // (0.28.1: launched by someone else)
    const after = (g.posts || []).filter((p) => p.a !== 'p' && p.at >= from && p.at <= t && has(p));
    if (after.length >= 3 && new Set(after.map((p) => p.a)).size >= 2) return true;
  }
  return false;
}
// Their partner leaves them for someone of the cast (the AI said so: "pour" on its vibe line).
function leftFor(g, c, handle, at = later()) {
  const o = handle ? charByHandle(g, normHandle(handle)) : null;
  if (!c || !o || o === c || !isMain(o) || !o.unlocked) return false; // (0.28.1: not for someone who is not on the network yet)
  const first = firstName(c);
  setTie(g, c.id, o.id, Math.max(tieOf(g, c.id, o.id), 70));
  addMem(g, c, `j’ai quitté le joueur pour ${o.name}`);
  addMem(g, o, `${c.name} a quitté le joueur pour moi`);
  addNotif(g, { k: 'drama', c: c.id, at, text: `💔 ${first} te quitte pour ${o.name}.` });
  addTrigger(g, `@${c.handle} a quitté le joueur pour @${o.handle} : ils s’affichent ensemble, et tout le monde en parle.`, c.id);
  unlockAch(g, 'good-doggy', at);
  return true;
}
// The AI's vibe line, with its « pour »: a partner leaving the player for someone of the cast (« Bon toutou »).
function vibeLine(g, by, o, at) {
  const c = typeof by === 'object' ? by : charByHandle(g, normHandle(by));
  const was = c ? c.vibe : null, done = applyVibe(g, by, o.vibe, o.why, at);
  if (done && c && o.pour && PARTNER.includes(was) && (c.vibe === 'ex' || c.vibe === 'complique')) leftFor(g, c, String(o.pour), at);
  return done;
}
// A present the player gives (bought now): counted for a partner (« Coin coin »).
function giftCounted(g, c, price, at) {
  if (!g || !c || !(price > 0)) return;
  c.giftsGot = (c.giftsGot || 0) + price;
  if (PARTNER.includes(c.vibe)) { c.giftsLove = (c.giftsLove || 0) + price; achProgress(g, 'coin-coin', c.giftsLove, at); } // (to one partner: 1 000 €)
}

/* ---------- the screens: a few on the profile, all of them in their window ---------- */
// 0.28.1: an achievement's icon (a sticker drawn for it; its emoji if it has none)
const ACH_SRC = {};
function achIcon(A, size = 36, cls = '') {
  const svg = A && typeof ACH_ICONS !== 'undefined' ? ACH_ICONS[A.id] : null;
  if (!svg) return A ? emoParts(A.emoji) : null;
  const src = ACH_SRC[A.id] || (ACH_SRC[A.id] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  return html`<img class=${'ach-ic' + (cls ? ' ' + cls : '')} src=${src} width=${size} height=${size} alt="" draggable=${false} />`;
}
function AchBadge({ g, A }) {
  const got = achGot(g, A.id), hide = A.hidden && !got;
  return html`<div class=${'ach-row' + (got ? ' got' : '')} data-ach=${A.id}>
    <span class=${'ach-emo' + (hide ? '' : ' has-ic')} aria-hidden="true">${hide ? emoParts('❔') : got ? achIcon(A, 40) : html`${achIcon(A, 40, 'locked')}<i class="ach-lock">${emoParts('🔒')}</i>`}</span>
    <div class="mid"><b>${hide ? 'Succès caché' : achName(g, A)}</b><small>${hide ? 'Il se dévoile quand tu le débloques.' : achDesc(g, A)}${got ? html` · <span class="ach-when">${fmtDate(g.ach.got[A.id])}</span>` : null}</small>
      ${A.goal && !got && !hide ? html`<span class="ach-prog"><${Meter} frac=${Math.min(1, ((g.ach.prog || {})[A.id] || 0) / A.goal)} /><small>${A.rec ? 'record : ' : ''}${fmtN((g.ach.prog || {})[A.id] || 0)}${A.unit ? '\u00a0' + A.unit : ''} / ${fmtN(A.goal)}${A.unit ? '\u00a0' + A.unit : ''}</small></span>` : null}</div>
  </div>`;
}
function AchSection({ g }) {
  const got = ACH.filter((A) => achGot(g, A.id)).sort((a, b) => g.ach.got[b.id] - g.ach.got[a.id]);
  return html`<section class="section ach-sec">
    <div class="section-h"><h3>Succès</h3><span>${got.length} / ${ACH.length}</span></div>
    ${got.length ? html`<div class="ach-chips">${got.slice(0, 8).map((A) => html`<span class="ach-chip" key=${A.id} title=${achDesc(g, A)}>${achIcon(A, 22)} ${achName(g, A)}</span>`)}</div>` : html`<p class="muted" style="font-size:13px">Aucun pour l’instant : ils viennent avec ce que tu vis.</p>`}
    <button class="btn btn-ghost btn-sm" onClick=${() => openLayer({ t: 'ach' })}><${Icon} n="trophy" s=${15} /> Tous les succès</button>
  </section>`;
}
function AchLayer({ g, i }) {
  return html`<${LayerShell} i=${i} title="Succès">
    <p class="muted ach-intro">${achCount(g)} sur ${ACH.length}. Certains sont cachés : ils se dévoilent quand ils arrivent.${g.ach.local && HOST && HOST.ach ? ' Cette partie a été modifiée à la main : ses succès restent dans le jeu, sans partir vers Æ Games Launcher.' : ''}</p>
    ${ACH_GROUPS.map(([grp, name]) => html`<section class="section" key=${grp}>
      <div class="section-h"><h3>${name}</h3><span>${ACH.filter((A) => A.grp === grp && achGot(g, A.id)).length} / ${ACH.filter((A) => A.grp === grp).length}</span></div>
      ${ACH.filter((A) => A.grp === grp).map((A) => html`<${AchBadge} key=${A.id} g=${g} A=${A} />`)}
    </section>`)}
  <//>`;
}
