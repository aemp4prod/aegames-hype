/* =========================================================
   Your secrets (0.18). When the game starts (or later, from the profile), the player may give their own character up to
   three secrets, each with a weight: embarrassing, serious or explosive. Nobody knows them. They come out the way they
   would for real, always through the characters:
   - the player confides one in private: that person knows now, and keeps it… or not;
   - an enemy digs into the player's past (the AI decides to; the game rolls what they find), a friend who investigates
     for someone may find one too;
   - whoever knows may let it slip to someone else, and whoever holds it and resents the player may throw it out in public;
   - the player may confess first, in a post: it costs less than being unmasked.
   Once it is out, the player answers as they like (deny, own it, apologize, or say nothing) and the AI judges how the
   network takes it. A denial is a lie: whoever knows the truth may come back with proof.
   ========================================================= */
const SECRET_MAX = 140; // characters
const SEC_MAX = 3; // written by the player (a hidden ad the game notes is not one of them)
const SEVS = {
  1: { label: 'Gênant', emoji: '😬', ai: 'gênant', hit: { image: -6, cred: -3 }, fol: 0.01 },
  2: { label: 'Grave', emoji: '😰', ai: 'grave', hit: { image: -14, cred: -9, kind: -5 }, fol: 0.03 },
  3: { label: 'Explosif', emoji: '💣', ai: 'explosif', hit: { image: -26, cred: -16, kind: -10, pro: -6 }, fol: 0.07 },
};
const SEV_ITEMS = [[1, '😬 Gênant'], [2, '😰 Grave'], [3, '💣 Explosif']];
const sevOf = (s) => SEVS[s && s.sev] || SEVS[1];
const SEC_EX = ['Un vieux post dont j’ai honte', 'J’ai acheté des abonnés à mes débuts', 'Une rupture où j’ai très mal agi', 'Mon « succès surprise » était préparé depuis des mois', 'J’ai copié l’idée de ma vidéo la plus vue'];
// The game's own rolls (a test can queue them).
const roll18 = () => (window.__HYPE_TEST__ && Array.isArray(window.__rolls18) && window.__rolls18.length ? window.__rolls18.shift() : Math.random());

const mySecrets = (g) => (g && g.player && Array.isArray(g.player.secrets) ? g.player.secrets : []);
function ensureSecrets(g) {
  if (!g || !g.player) return [];
  if (!Array.isArray(g.player.secrets)) g.player.secrets = [];
  return g.player.secrets;
}
const secretOf = (g, id) => mySecrets(g).find((s) => s.id === id) || null;
const hiddenSecrets = (g) => mySecrets(g).filter((s) => !s.out);
const knowsSecret = (s, c) => !!(s && c && s.known.some((k) => k.c === c.id));
const secretsKnownBy = (g, c) => hiddenSecrets(g).filter((s) => knowsSecret(s, c));
const ownSecrets = (g) => mySecrets(g).filter((s) => !s.auto);
// The secrets typed at the start (the persona form): cleaned, with an id each.
function cleanSecrets(list) {
  const out = [];
  for (const x of Array.isArray(list) ? list : []) {
    const t = str(x && x.t, SECRET_MAX).replace(/^[«"“]\s*|\s*[»"”]$/g, '');
    if (t.length < 6 || out.some((s) => s.t.toLowerCase() === t.toLowerCase())) continue;
    out.push({ id: uid('sc'), t, sev: SEVS[x.sev] ? Number(x.sev) : 1, at: Date.now(), known: [], out: null });
    if (out.length >= SEC_MAX) break;
  }
  return out;
}
// o.auto: a secret the game notes for the player (a hidden ad), beyond the three.
function addSecret(g, text, sev, o = {}) {
  const list = ensureSecrets(g);
  const t = str(text, SECRET_MAX).replace(/^[«"“]\s*|\s*[»"”]$/g, '');
  if (t.length < 6 || list.some((s) => s.t.toLowerCase() === t.toLowerCase())) return null;
  if (!o.auto && ownSecrets(g).length >= SEC_MAX) return null;
  const s = { id: uid('sc'), t, sev: SEVS[sev] ? Number(sev) : 1, at: Date.now(), known: [], out: null };
  if (o.auto) s.auto = o.auto;
  if (o.deal) s.deal = o.deal;
  list.push(s);
  return s;
}

/* ---------- who knows ---------- */
// how: 'confie' (the player told them), 'enquete' (they dug), 'fuite' (someone told them), 'marque' (a hidden ad, together)
function learnSecret(g, s, c, how, from = null, at = Date.now()) {
  if (!g || !s || !c || s.out || knowsSecret(s, c)) return false;
  s.known.push({ c: c.id, how, at, from: from ? from.id : null });
  if (!isMain(c)) return true;
  const q = `« ${str(s.t, 70)} »`;
  if (how === 'confie') addMem(g, c, `le joueur m’a confié un secret : ${q}`);
  else if (how === 'enquete') addMem(g, c, `j’ai découvert un secret du joueur : ${q}`, 's’intéresse de près à ton passé'); // (the player does not know they know)
  else if (how === 'fuite') addMem(g, c, `${from ? from.name.split(' ')[0] : 'quelqu’un'} m’a appris un secret du joueur : ${q}`, 'a entendu des choses sur toi');
  return true;
}
// How they know it, for the AI.
function howKnown(g, s, c) {
  const k = s.known.find((x) => x.c === c.id);
  if (!k) return '';
  const fr = k.from && g.chars[k.from];
  return { confie: 'le joueur le lui a confié', enquete: 'découvert en fouillant son passé', fuite: fr ? `appris par @${fr.handle}` : 'on le lui a répété', marque: 'le partenariat caché avec lui ou elle' }[k.how] || '';
}
// Someone who resents the player enough to use it.
const hostileTo = (c) => !!c && (c.vibe === 'nemesis' || c.vibe === 'rival' || c.vibe === 'froid' || c.vibe === 'ex' || c.rel <= -20 || !!c.cut);

/* ---------- an enemy digs (the AI decides when; the game rolls what they find) ---------- */
const DIG_GAP = 36 * HR;
const digFoes = (g) => mains(g).filter((c) => c.unlocked && !c.cut && (c.vibe === 'nemesis' || c.rel <= -35 || (c.vibe === 'rival' && c.rel <= -20)));
const digOK = (g, t = Date.now()) => hiddenSecrets(g).length > 0 && t - (g.digAt || 0) >= DIG_GAP / lifeK(g); // 0.19: by level
// The more people know it, the easier it is to find; the heavier it is, the better it was hidden.
const digChance = (g, s) => clamp(0.35 + 0.08 * s.known.length + (g.stats.followers >= 50000 ? 0.1 : 0) - 0.07 * (s.sev - 1), 0.15, 0.75);
function digInto(g, by) {
  const c = typeof by === 'object' ? by : charByHandle(g, normHandle(by));
  if (!c || !digFoes(g).includes(c) || !digOK(g)) return null;
  g.digAt = Date.now();
  const pool = hiddenSecrets(g).filter((s) => !knowsSecret(s, c));
  if (!pool.length) return null;
  const w = pool.map((s) => (1 + s.known.length) * (4 - s.sev));
  let r = roll18() * w.reduce((a, b) => a + b, 0), s = pool[pool.length - 1];
  for (let k = 0; k < pool.length; k++) { r -= w[k]; if (r <= 0) { s = pool[k]; break; } }
  const found = roll18() < digChance(g, s);
  const il = gx(c.g, 'il', 'elle', 'iel');
  const al = allies(g).filter((a) => a !== c && !a.cut).sort((a, b) => b.rel - a.rel)[0];
  if (found) {
    learnSecret(g, s, c, 'enquete');
    addTrigger(g, `@${c.handle} a déterré un secret du joueur : « ${str(s.t, 80)} » (${sevOf(s).ai}). ${cap1(il)} décide quoi en faire : le garder sous le coude, faire pression en privé, ou le balancer.`, c.id);
    if (al && roll18() < 0.45) addIncomingDM(g, al, pick([`fais gaffe… @${c.handle} fouille dans ton passé, et j’ai l’impression qu’${il} a trouvé un truc.`, `je préfère te prévenir : @${c.handle} pose plein de questions sur toi depuis quelques jours. ${cap1(il)} a l’air très ${gx(c.g, 'content', 'contente', 'content·e')} de ${gx(c.g, 'lui', 'elle', 'iel')}.`]), later() + randi(6000, 15000), { max: 300 });
  } else {
    addMem(g, c, 'j’ai fouillé dans le passé du joueur sans rien trouver', 's’est renseigné·e sur toi');
    if (al && roll18() < 0.3) addIncomingDM(g, al, `@${c.handle} pose des questions sur toi un peu partout. je dis rien, mais fais gaffe.`, later() + randi(6000, 15000), { max: 300 });
  }
  return { found, s };
}

/* ---------- a confidant lets it slip to someone (the AI decides; nobody sees it in public) ---------- */
function slipSecret(g, o) {
  const by = charByHandle(g, normHandle(o.by)), to = charByHandle(g, normHandle(o.to)), s = secretOf(g, str(o.id, 24));
  const t = Date.now();
  if (!by || !to || by === to || !s || s.out || !knowsSecret(s, by) || knowsSecret(s, to) || !isMain(to) || !to.unlocked || t - (g.slipAt || 0) < (12 * HR) / lifeK(g)) return false;
  g.slipAt = t;
  learnSecret(g, s, to, 'fuite', by);
  bumpTie(g, by.id, to.id, 2); // a secret shared brings closer
  const il = gx(to.g, 'il', 'elle', 'iel');
  if (guards(to)) { // a friend of the player who hears it keeps it, and warns them
    addIncomingDM(g, to, pick([`on m’a raconté un truc sur toi… « ${str(s.t, 80)} ». je dirai rien, mais fais gaffe à qui tu te confies.`, `je sais pas si c’est vrai, mais ça circule entre nous : « ${str(s.t, 80)} ». moi je garde ça pour moi.`]), later() + randi(6000, 14000), { max: 360 });
    addMem(g, to, 'j’ai prévenu le joueur qu’un de ses secrets circule');
  } else if (hostileTo(to) || isFoe(g, to)) addTrigger(g, `@${to.handle} vient d’apprendre par @${by.handle} un secret du joueur : « ${str(s.t, 80)} ». ${cap1(il)} peut s’en servir.`, to.id);
  return true;
}

/* ---------- out in public ---------- */
const OUT_MS = 3 * HR; // unanswered, it keeps people talking this long
// o: { by: the character who threw it out (none for a confession or the law), how: 'revele' | 'aveu', post, k: the share of
// the damage (a confession costs less), quiet: no modal (the law's fine says it already) }
function secretOut(g, s, o = {}) {
  if (!g || !s || s.out) return null;
  const t = Date.now(), S0 = sevOf(s), c = o.by || null, k = o.k == null ? 1 : o.k, aveu = o.how === 'aveu';
  const loss = staffMult(g, 'loss'); // a community manager limits the damage
  const plan = {};
  for (const key in S0.hit) plan[key] = S0.hit[key] * loss * k;
  const dr = k ? repMove(g, plan, aveu ? `ton aveu : « ${str(s.t, 40)} »` : `ton secret révélé : « ${str(s.t, 40)} »`, { noCheck: true }) : 0;
  const fol = Math.round(g.stats.followers * S0.fol * loss * k);
  g.stats.followers = Math.max(0, g.stats.followers - fol);
  let post = o.post ? g.posts.find((p) => p.id === o.post) || null : null;
  if (!post && c) post = addAmbientPost(g, { by: c.handle, text: `Puisque @${g.player.handle} se fait passer pour ${px(g, 'un saint', 'une sainte', 'un·e saint·e')}, je vous dis tout : « ${s.t} ». Et c’est vrai.` }, later() + 1500);
  if (post) post.secret = s.id;
  s.out = { at: t, by: c ? c.id : null, how: aveu ? 'aveu' : o.how || 'revele', post: post ? post.id : null, until: t + OUT_MS, drain: t, answer: aveu ? 'aveu' : null, cred: null, lie: false, rep: dr, fol, state: aveu || o.quiet ? 'done' : 'live' };
  if (o.quiet) return s; // (the law's fine says it all)
  if (!aveu) {
    addNotif(g, { k: 'cancel', c: c ? c.id : null, p: post ? post.id : null, at: later() + 1200, text: `🤐 ${c ? `${c.name} balance ton secret` : 'Ton secret est sorti'} : « ${str(s.t, 80)} » (${repWord(dr)}${fol ? `, −${nAbonnes(fol)}` : ''}).` });
    addChronicle(g, `${c ? c.name : 'Quelqu’un'} a révélé un secret de ${g.player.name} : « ${str(s.t, 90)} ».`);
    addTrigger(g, `Un secret du joueur vient d’éclater${c ? `, balancé par @${c.handle}` : ''} : « ${str(s.t, 90)} » (${S0.ai}). C’est vrai. Le réseau s’en empare : choqués, moqueurs, curieux ; ses proches attendent sa réponse.`, c ? c.id : null);
    if (c) addMem(g, c, `j’ai révélé un secret du joueur : « ${str(s.t, 60)} »`);
    queueModalFor(g, { t: 'secret', sid: s.id });
    checkCancel(g);
  } else {
    addChronicle(g, `${g.player.name} a avoué en public : « ${str(s.t, 100)} ».`);
    // those who held it: no more leverage (and a confidant may feel relieved, or left out)
    for (const x of s.known) {
      const kc = g.chars[x.c];
      if (!kc || !isMain(kc)) continue;
      addMem(g, kc, `le joueur a fini par avouer en public : « ${str(s.t, 60)} »`);
      if (hostileTo(kc)) addTrigger(g, `Le joueur a avoué lui-même en public ce que @${kc.handle} tenait contre lui (« ${str(s.t, 70)} ») : son moyen de pression tombe à l’eau, ${gx(kc.g, 'il', 'elle', 'iel')} enrage ou fait semblant de s’en moquer.`, kc.id);
    }
  }
  return s;
}
// A character who knows it and resents the player throws it out (the AI wrote their post just before).
function exposeSecret(g, o, postId) {
  const c = charByHandle(g, normHandle(o.by)), s = secretOf(g, str(o.id, 24));
  if (!c || !s || s.out || !knowsSecret(s, c) || !hostileTo(c) || !c.unlocked) return null;
  return secretOut(g, s, { by: c, how: 'revele', post: postId });
}
// The player's own confession, judged on its sincerity: the more sincere, the less it costs.
function confessResult(g, s, si, post) {
  if (!s || s.out) return null;
  si = si == null ? 5 : si;
  const k = si >= 7 ? 0.35 : si >= 4 ? 0.55 : 0.8;
  secretOut(g, s, { how: 'aveu', post: post ? post.id : null, k });
  let up = 0;
  if (si >= 7) up = repMove(g, { kind: 4, cred: 3 }, 'tu as eu le courage d’avouer', { raw: true });
  const dr = (s.out.rep || 0) + up;
  addNotif(g, { k: si >= 7 ? 'relup' : 'drama', p: post ? post.id : null, text: `🤐 Tu as avoué : « ${str(s.t, 70)} ». ${si >= 7 ? 'Ton honnêteté est saluée' : si >= 4 ? 'Ça passe… à moitié' : 'Personne n’y croit vraiment'} (${repWord(dr)}${s.out.fol ? `, −${nAbonnes(s.out.fol)}` : ''}).` });
  return s;
}

/* ---------- the player's answer, once it is out ---------- */
const STANCES = {
  dement: { label: 'Démentir', title: 'Démentir', btn: 'Démentir', ai: 'Il DÉMENT (c’est un mensonge : le secret est vrai)', ph: 'C’est faux, et voilà pourquoi…', hint: 'C’est un mensonge : le public peut te croire… mais ceux qui savent, eux, savent. Et ils peuvent le prouver.' },
  assume: { label: 'Assumer', title: 'Assumer', btn: 'Assumer', ai: 'Il ASSUME, sans s’excuser', ph: 'Oui, c’est vrai. Et voilà ce que j’en pense…', hint: 'Tu reconnais, sans t’excuser. Franc et calme, ça peut forcer le respect. Arrogant, ça passe mal.' },
  excuse: { label: 'M’excuser', title: 'Tes excuses', btn: 'M’excuser', ai: 'Il S’EXCUSE', ph: 'Je vous dois des excuses…', hint: 'Des excuses sincères calment le jeu. De façade, elles enfoncent.' },
};
const liveSecret = (g) => mySecrets(g).find((s) => s.out && s.out.state === 'live' && !s.out.answer) || null;
// cred (0-10, the AI's judgment): believed, accepted, forgiven. A denial that works is a lie someone can still prove.
function answerResult(g, s, stance, cred, post) {
  const o = s && s.out;
  if (!o || o.answer || !STANCES[stance]) return null;
  cred = cred == null ? 4 : cred;
  o.answer = stance;
  o.cred = cred;
  o.state = 'done';
  const hit = Math.abs(o.rep || 0), by = o.by && g.chars[o.by];
  const back = (f, why) => (f > 0 ? repShift(g, hit * f, why, { noCheck: true }) : f < 0 ? repMove(g, { cred: hit * f * 2, image: hit * f }, why, { noCheck: true }) : 0);
  let dr = 0, text = '';
  if (stance === 'dement') {
    if (cred >= 7) { dr = back(0.7, 'ton démenti passe'); o.lie = true; text = `Ton démenti passe : on te croit… pour l’instant. ${by ? `${by.name.split(' ')[0]} sait que tu mens.` : 'Mais c’est un mensonge.'}`; }
    else if (cred >= 4) { dr = back(0.3, 'ton démenti sème le doute'); o.lie = true; text = 'Ton démenti sème le doute : certains te croient, d’autres non.'; }
    else { dr = back(-0.6, 'personne ne croit ton démenti'); o.lie = 'caught'; text = 'Personne ne croit ton démenti : maintenant, en plus, tu passes pour ' + px(g, 'un menteur', 'une menteuse', 'un·e menteur·se') + '.'; }
    if (by && o.lie === true) addTrigger(g, `Le joueur a démenti le secret que @${by.handle} a révélé (« ${str(s.t, 70)} ») : c’est un mensonge, et @${by.handle} le sait. ${cap1(gx(by.g, 'il', 'elle', 'iel'))} enrage.`, by.id);
  } else if (stance === 'assume') {
    if (cred >= 7) { dr = back(0.5, 'tu assumes, ça force le respect'); dr += repMove(g, { kind: 3 }, null, { raw: true, noCheck: true }); text = 'Tu assumes, et ça force le respect.'; }
    else if (cred >= 4) { dr = back(0.25, 'tu assumes, ça passe à moitié'); text = 'Tu assumes : ça passe à moitié.'; }
    else { dr = back(-0.15, 'tu assumes avec arrogance'); text = 'Tu assumes… avec arrogance : ça passe mal.'; }
  } else {
    if (cred >= 7) { dr = back(0.6, 'tes excuses sont sincères'); dr += repMove(g, { kind: 4 }, null, { raw: true, noCheck: true }); text = 'Tes excuses sont sincères : la plupart te pardonnent.'; }
    else if (cred >= 4) { dr = back(0.3, 'tes excuses passent moyen'); text = 'Tes excuses passent moyen.'; }
    else { dr = back(-0.2, 'des excuses de façade'); text = 'Des excuses de façade : ça t’enfonce.'; }
  }
  addNotif(g, { k: cred >= 7 ? 'relup' : cred >= 4 ? 'drama' : 'reldown', p: post ? post.id : null, text: `🤐 ${text} (${repWord(dr)})` });
  addChronicle(g, `${g.player.name} a répondu à la révélation de son secret : ${STANCES[stance].label.toLowerCase().replace('m’excuser', 's’excuser')} (${cred >= 7 ? 'ça passe' : cred >= 4 ? 'ça divise' : 'ça passe mal'}).`);
  checkCancel(g);
  return o;
}
// « Me taire »: nothing to say; it keeps people talking until it fades.
function keepQuiet(g, s) {
  if (!s || !s.out || s.out.answer) return;
  s.out.answer = 'silence';
  addChronicle(g, `${g.player.name} ne répond pas à la révélation de son secret.`);
}
// Someone who knows the truth proves the denial was a lie (the AI decides when).
function proveLie(g, o, postId) {
  const c = charByHandle(g, normHandle(o.by)), s = secretOf(g, str(o.id, 24));
  if (!c || !s || !s.out || s.out.lie !== true || !knowsSecret(s, c)) return null;
  const S0 = sevOf(s), loss = staffMult(g, 'loss');
  s.out.lie = 'caught';
  s.out.caughtAt = Date.now();
  const dr = repMove(g, { cred: -(12 + 6 * s.sev) * loss, image: -6 * loss, kind: -6 * loss }, `ton démenti démonté par ${c.name}`, { noCheck: true });
  const fol = Math.round(g.stats.followers * 0.02 * s.sev * loss);
  g.stats.followers = Math.max(0, g.stats.followers - fol);
  let p = postId ? g.posts.find((x) => x.id === postId) : null;
  if (!p) p = addAmbientPost(g, { by: c.handle, text: `@${g.player.handle} a juré que c’était faux. Voilà la preuve que c’est vrai. Fin du débat.` }, later() + 1500);
  if (p) p.ev = { kind: 'dm', desc: `« ${str(s.t, 120)} » — la preuve`, real: true };
  const t = Date.now();
  g.pbb = { at: t, until: t + Math.round(45 * 60000 * s.sev * staffMult(g, 'bb')), c: c.id, kind: 'mensonge' };
  addNotif(g, { k: 'screen', c: c.id, p: p ? p.id : null, text: `📸 ${c.name} prouve que ton démenti était un mensonge (${repWord(dr)}${fol ? `, −${nAbonnes(fol)}` : ''}).` });
  addChronicle(g, `${c.name} a prouvé que ${g.player.name} avait menti sur son secret.`);
  addTrigger(g, `@${c.handle} vient de prouver que le joueur a menti en démentant son secret (« ${str(s.t, 70)} ») : tout le réseau lui tombe dessus, ses proches sont déçus.`, c.id);
  queueModalFor(g, { t: 'secretlie', sid: s.id, by: c.id, rep: repPts(dr), loss: fol });
  checkCancel(g);
  return s;
}
// While it runs unanswered (or the player keeps quiet), it keeps people talking: a slow drip, then it fades.
function tickSecrets(g, t = Date.now()) {
  let ch = false;
  const step = 20 * 60000;
  for (const s of mySecrets(g)) {
    const o = s.out;
    if (!o || o.state !== 'live') continue;
    if (o.answer && o.answer !== 'silence') { o.state = 'done'; ch = true; continue; }
    const loss = staffMult(g, 'loss');
    while (t - o.drain >= step && o.drain < o.until) {
      o.drain += step;
      repMove(g, { image: -0.5 * s.sev * loss, cred: -0.5 * s.sev * loss }, 'ton secret fait jaser', { noCheck: true });
      g.stats.followers = Math.max(0, g.stats.followers - Math.round(g.stats.followers * 0.002 * s.sev * loss));
      ch = true;
    }
    if (t >= o.until) {
      o.state = 'done';
      if (!o.answer) o.answer = 'silence';
      addNotif(g, { k: 'drama', text: `On parle moins de ton secret (« ${str(s.t, 60)} ») : le réseau passe à autre chose.` });
      checkCancel(g);
      ch = true;
    }
  }
  return ch;
}

/* ---------- a hidden ad becomes a secret (0.18): the brand's contact knows ---------- */
function secretFromDeal(g, d) {
  if (!d || mySecrets(g).some((s) => s.deal === d.id)) return null;
  const s = addSecret(g, `Mon partenariat avec ${d.brand} était payé, et je ne l’ai jamais dit`, d.banned ? 3 : 2, { auto: 'pub', deal: d.id });
  const c = s && g.chars[d.contact];
  if (c) learnSecret(g, s, c, 'marque');
  return s;
}
// The law spotted it: it is out (the fine says it all, no second blow).
function dealSecretOut(g, d, post) {
  const s = mySecrets(g).find((x) => x.deal === d.id && !x.out);
  if (s) secretOut(g, s, { how: 'revele', post: post ? post.id : null, k: 0, quiet: true });
}

/* ---------- what the AI knows of it ---------- */
// For the line of a character (LIENS): what they know of the player that the public does not.
function secretKnowCtx(g, c) {
  const ks = secretsKnownBy(g, c);
  if (!ks.length) return '';
  return `connaît ${ks.length > 1 ? 'des secrets' : 'un secret'} du joueur que le public ignore : ${ks.map((s) => `[${s.id}] « ${str(s.t, 90)} » (${sevOf(s).ai}, ${howKnown(g, s, c)})`).join(' ; ')}`;
}
// For the player's part of the context: what came out lately, and how the player answered.
function secretsOutCtx(g, t = Date.now()) {
  return mySecrets(g).filter((s) => s.out && t - s.out.at < 3 * DAY_MS).map((s) => {
    const o = s.out, by = o.by && g.chars[o.by];
    const ans = o.answer === 'aveu' ? '' : o.answer === 'dement' ? (o.lie === 'caught' ? ' ; il a démenti, mais son mensonge a été démasqué' : o.cred >= 7 ? ' ; il a démenti et le public l’a cru (seuls ceux qui savent savent que c’est vrai)' : ' ; il a démenti sans convaincre tout le monde') : o.answer === 'assume' ? ' ; il assume' : o.answer === 'excuse' ? ' ; il s’est excusé' : o.answer === 'silence' ? ' ; il se tait' : ' ; il n’a pas encore répondu';
    return `Secret du joueur sorti au grand jour (${sevOf(s).ai}) : « ${str(s.t, 100)} », ${o.how === 'aveu' ? 'qu’il a avoué lui-même' : by ? `révélé par @${by.handle}` : 'révélé'}${ans}.`;
  });
}
// The lines a refresh may write about the player's secrets (the AI decides; the game says who could).
function secretLines(g, t = Date.now()) {
  const out = [];
  const hid = hiddenSecrets(g);
  const T = window.__HYPE_TEST__ ? window : {};
  if (hid.length && digOK(g, t)) {
    const foes = digFoes(g);
    if (foes.length && (T.__digOffer || Math.random() < Math.min(0.8, 0.35 * lifeK(g)))) out.push(`- Facultatif, si ça colle à son caractère : un ennemi du joueur (${foes.slice(0, 4).map((c) => '@' + c.handle).join(', ')}) fouille dans son passé pour trouver de quoi l’atteindre (vieux posts, anciens proches, un détective) : {"t":"dig","by":"handle"}. Le jeu dira ce qu’il trouve : n’invente pas de révélation.`);
  }
  const hold = [], soft = [];
  for (const s of hid) for (const k of s.known) {
    const c = g.chars[k.c];
    if (!c || !isMain(c) || !c.unlocked) continue;
    (hostileTo(c) ? hold : soft).push([c, s]);
  }
  if (hold.length) out.push(`- Facultatif : ${[...new Set(hold.map(([c]) => '@' + c.handle))].join(', ')} ${hold.length > 1 ? 'connaissent' : 'connaît'} un secret du joueur et lui en veut (voir LIENS). S’il ou elle décide de le balancer en public maintenant : écris son post dans une ligne "post", puis juste après {"t":"expose","by":"handle","id":"…"} (l’id entre crochets). ${hold.length > 1 ? 'Ils' : 'Il ou elle'} peut aussi le garder pour faire pression.`);
  if (soft.length && t - (g.slipAt || 0) >= (12 * HR) / lifeK(g) && (T.__slipOffer || Math.random() < Math.min(0.7, 0.3 * lifeK(g)))) out.push(`- Facultatif, rare : ${[...new Set(soft.map(([c]) => '@' + c.handle))].join(', ')} ${soft.length > 1 ? 'connaissent' : 'connaît'} un secret du joueur (voir LIENS). Si l’un d’eux est bavard, déçu ou fâché, ça peut lui échapper auprès d’un autre personnage principal : {"t":"slip","by":"handle","id":"…","to":"handle"} (personne ne le voit en public).`);
  out.push(...proofLines(g));
  return out;
}
// A denial that worked: whoever knows the truth may prove it (the AI decides when).
function proofLines(g) {
  const out = [];
  for (const s of mySecrets(g)) {
    if (!s.out || s.out.lie !== true) continue;
    const who = s.known.map((k) => g.chars[k.c]).filter((c) => c && isMain(c) && c.unlocked && (hostileTo(c) || c.id === s.out.by));
    if (!who.length) continue;
    out.push(`- Facultatif : le joueur a démenti son secret « ${str(s.t, 70)} » alors que c’est vrai. ${who.slice(0, 3).map((c) => '@' + c.handle).join(', ')} ${who.length > 1 ? 'savent' : 'sait'} que c’est vrai et peut le prouver (une capture, un témoin). Si l’un d’eux le fait maintenant : écris son post, puis {"t":"proof","by":"handle","id":"${s.id}"}.`);
  }
  return out;
}
// The same, for an action of the player (only the characters it is about).
function secretActLines(g, focus) {
  const hold = [];
  for (const s of hiddenSecrets(g)) for (const k of s.known) { const c = g.chars[k.c]; if (c && isMain(c) && c.unlocked && hostileTo(c) && (!focus || focus.has(c.id))) hold.push(c); }
  const out = [];
  if (hold.length) out.push(`- Facultatif : ${[...new Set(hold.map((c) => '@' + c.handle))].join(', ')} connaît un secret du joueur et lui en veut (voir LIENS) : s’il ou elle le balance en public maintenant, écris son post dans une ligne "post", puis juste après {"t":"expose","by":"handle","id":"…"}.`);
  return out.concat(proofLines(g));
}
// Lines of a refresh or an act about the secrets: returns true when the line was one of them.
function applySecretLine(g, o, effects, lastOf = {}) {
  const postOf = (h) => { const c = charByHandle(g, normHandle(h)); const x = c && lastOf['c:' + c.id]; return x && !x.r ? x.p : null; };
  switch (o.t) {
    case 'dig': effects.push(() => digInto(g, o.by)); return true;
    case 'slip': effects.push(() => slipSecret(g, o)); return true;
    case 'expose': { const pid = postOf(o.by); effects.push(() => exposeSecret(g, o, pid)); return true; }
    case 'proof': { const pid = postOf(o.by); effects.push(() => proveLie(g, o, pid)); return true; }
    default: return false;
  }
}
// In a private conversation: what they know of the player, and how they may use it.
function secretDMLines(g, c, confideNow) {
  const out = [];
  const ks = secretsKnownBy(g, c).filter((s) => s !== confideNow);
  const il = gx(c.g, 'il', 'elle', 'iel'), lui = gx(c.g, 'lui', 'elle', 'iel');
  if (ks.length) out.push(`Ce que ${c.name} sait du joueur et que le public ignore : ${ks.map((s) => `« ${str(s.t, 90)} » (${sevOf(s).ai}, ${howKnown(g, s, c)})`).join(' ; ')}. ${hostileTo(c) ? `${c.name} lui en veut : ${il} peut s’en servir (une allusion, une menace, du chantage) ou le garder pour le bon moment.` : `${c.name} garde ça pour ${lui}, sauf si la relation se dégrade ; ${il} peut en reparler avec le joueur.`}`);
  if (confideNow) out.push(`Le joueur vient de confier à ${c.name} un secret sur lui (${sevOf(confideNow).ai}) : « ${confideNow.t} ». Réagis vraiment, selon votre relation, son caractère et sa maturité : soutien, surprise, gêne, une question, ou une info qu’${il} garde dans un coin.`);
  const rv = mySecrets(g).filter((s) => s.out && s.out.by === c.id && Date.now() - s.out.at < 3 * DAY_MS);
  if (rv.length) out.push(`C’est ${c.name} qui a révélé en public le secret du joueur « ${str(rv[0].t, 80)} ».`);
  return out;
}
// The player wrote it in their own words (no button): the secret whose words the message nearly all says.
const SEC_STOP = new Set('les des une est pas sur par aux ses son ton tes mes vos nos que qui dont pour avec dans mais tout tous plus tres deja fait avoir etre suis cette ces mon'.split(' '));
const secWords = (t) => new Set([...talkWords(t)].filter((w) => !SEC_STOP.has(w)));
function confidedIn(g, c, text) {
  const A = secWords(text);
  if (A.size < 2) return null;
  let best = null, bv = 0;
  for (const s of hiddenSecrets(g)) {
    if (s.auto || knowsSecret(s, c)) continue;
    const B = secWords(s.t);
    if (B.size < 2) continue;
    let n = 0;
    for (const w of B) if (A.has(w)) n++;
    if (n / B.size > bv) { bv = n / B.size; best = s; }
  }
  return bv >= 0.75 ? best : null;
}

/* ---------- screens ---------- */
// At the start (the persona form): up to three, with their weight.
function SecretsField({ list, onChange }) {
  const rows = list || [];
  const upd = (k, patch) => onChange(rows.map((x, j) => (j === k ? Object.assign({}, x, patch) : x)));
  const add = (t = '') => { if (rows.length < SEC_MAX) onChange(rows.concat({ t, sev: 1 })); };
  const ex = SEC_EX.filter((t) => !rows.some((x) => x.t === t)).slice(0, 3);
  return html`<div class="field secrets-field">
    <span class="lbl">Tes secrets <span class="muted">(facultatif)</span></span>
    <small>Jusqu’à 3, sur ton perso. Personne ne les connaît… pour l’instant. Une confidence, quelqu’un qui fouille, une fuite : ils peuvent sortir. Avouer en premier coûte moins cher que de se faire griller.</small>
    ${rows.map((x, k) => html`<div class="secret-edit" key=${k}>
      <div class="row" style="gap:6px;flex-wrap:nowrap"><input class="input" maxlength=${SECRET_MAX} placeholder="ex : un vieux post dont j’ai honte" value=${x.t} onInput=${(e) => upd(k, { t: e.target.value })} aria-label=${'Secret ' + (k + 1)} />
        <button type="button" class="iconbtn" onClick=${() => onChange(rows.filter((y, j) => j !== k))} aria-label="Retirer ce secret"><${Icon} n="x" s=${16} /></button></div>
      <${Seg} items=${SEV_ITEMS} value=${x.sev} onPick=${(v) => upd(k, { sev: v })} label="Gravité" />
    </div>`)}
    ${rows.length < SEC_MAX ? html`<div class="row sec-ex" style="gap:6px">
      <button type="button" class="btn btn-ghost btn-sm" onClick=${() => add()}><${Icon} n="plus" s=${15} /> Ajouter un secret</button>
      ${ex.map((t) => html`<button type="button" key=${t} class="chip-btn" onClick=${() => add(t)}>${t}</button>`)}
    </div>` : null}
  </div>`;
}
// On the profile: each secret, who knows (as far as the player knows), and what can be done.
function SecretsSection({ g, now }) {
  const list = mySecrets(g);
  const [form, setForm] = useState(null);
  const room = ownSecrets(g).length < SEC_MAX;
  const save = () => {
    const s = form && addSecret(g, form.t, form.sev);
    if (!s) { toast(form && str(form.t, SECRET_MAX).length < 6 ? 'Écris ton secret en quelques mots.' : 'Impossible d’ajouter ce secret.', 'bad'); return; }
    setForm(null);
    toast('Secret ajouté. Personne ne le sait… pour l’instant.', 'good');
    update();
  };
  return html`<section class="section secrets">
    <div class="section-h"><h3>Tes secrets</h3><span>${list.length ? `${hiddenSecrets(g).length} ${plural(hiddenSecrets(g).length, 'caché', 'cachés')}` : 'aucun'}</span></div>
    ${list.length ? list.map((s) => html`<${SecretRow} key=${s.id} g=${g} s=${s} now=${now} />`)
      : html`<p class="muted" style="font-size:13.5px">Ton perso n’a rien à cacher… pour l’instant. Un secret peut sortir (une confidence, quelqu’un qui fouille, une fuite) : de quoi pimenter ta partie.</p>`}
    ${form ? html`<div class="secret-edit">
      <input class="input" maxlength=${SECRET_MAX} placeholder="ex : j’ai acheté des abonnés à mes débuts" value=${form.t} onInput=${(e) => setForm(Object.assign({}, form, { t: e.target.value }))} aria-label="Ton secret" />
      <${Seg} items=${SEV_ITEMS} value=${form.sev} onPick=${(v) => setForm(Object.assign({}, form, { sev: v }))} label="Gravité" />
      <div class="row" style="gap:6px"><button class="btn btn-hot btn-sm" onClick=${save}>Ajouter</button><button class="btn btn-ghost btn-sm" onClick=${() => setForm(null)}>Annuler</button></div>
    </div>` : room ? html`<button class="btn btn-ghost btn-sm" onClick=${() => setForm({ t: '', sev: 1 })}><${Icon} n="plus" s=${15} /> Ajouter un secret</button>` : null}
  </section>`;
}
const SEV_CHIP = { 1: 'flash', 2: 'hot', 3: 'bad' };
function SecretRow({ g, s, now }) {
  const S0 = sevOf(s), o = s.out;
  const told = s.known.filter((k) => k.how === 'confie' || k.how === 'marque').map((k) => g.chars[k.c]).filter(Boolean);
  const by = o && o.by ? g.chars[o.by] : null;
  const state = o ? (o.how === 'aveu' ? 'Tu l’as avoué en public.' : `Révélé par ${by ? by.name : 'quelqu’un'}.`) + (o.answer && o.answer !== 'aveu' ? ` Ta réponse : ${o.answer === 'silence' ? 'le silence' : STANCES[o.answer] ? STANCES[o.answer].label.toLowerCase() : o.answer}${o.lie === 'caught' ? ' (démasqué)' : ''}.` : '')
    : told.length ? (s.auto === 'pub' ? `Ton contact chez la marque le sait (${told.map((c) => c.name.split(' ')[0]).join(', ')}).` : `Tu l’as confié à ${told.map((c) => c.name.split(' ')[0]).join(', ')}.`) + ' Personne d’autre, à ta connaissance.' : 'Personne ne le sait, à ta connaissance.';
  return html`<div class=${'secret-card' + (o ? ' out' : '')}>
    <div class="row" style="gap:6px"><span class=${'chip ' + SEV_CHIP[s.sev]}>${S0.emoji} ${S0.label}</span>${o ? html`<span class="chip bad">Sorti</span>` : null}${s.auto === 'pub' ? html`<span class="chip">Pub cachée</span>` : null}</div>
    <p class="secret-t">« ${s.t} »</p>
    <small class="muted">${state}</small>
    ${!o ? html`<div class="row" style="gap:6px"><button class="btn btn-ghost btn-sm" onClick=${() => openCompose({ confess: s.id })}><${Icon} n="megaphone" s=${15} /> Avouer dans un post</button></div>`
      : o.state === 'live' && !o.answer ? html`<${SecretAnswers} s=${s} />` : null}
  </div>`;
}
function SecretAnswers({ s, close }) {
  const go = (k) => { if (close) close(); openCompose({ secAns: { id: s.id, stance: k } }); };
  return html`<div class="paths secret-paths">
    ${Object.entries(STANCES).map(([k, v]) => html`<button key=${k} class="path" onClick=${() => go(k)}><b>${v.label}</b><span>${v.hint}</span></button>`)}
  </div>`;
}
// In the feed while it runs unanswered.
function SecretBanner({ g, now }) {
  const s = liveSecret(g);
  if (!s) return null;
  const by = s.out.by && g.chars[s.out.by];
  return html`<div class="rumor-banner secret-banner">
    <span class="nic" aria-hidden="true">🤐</span>
    <div class="rb-mid">
      <b>${by ? `${by.name} a balancé ton secret` : 'Ton secret est sorti'}</b>
      <p>« ${s.t} »</p>
      <small>Ça retombe ${fmtWhen(s.out.until, now)} · ${sevOf(s).emoji} ${sevOf(s).label}</small>
      <div class="row">
        ${Object.entries(STANCES).map(([k, v]) => html`<button key=${k} class=${'btn btn-sm ' + (k === 'excuse' ? 'btn-hot' : 'btn-ghost')} onClick=${() => openCompose({ secAns: { id: s.id, stance: k } })}>${v.label}</button>`)}
        <button class="linkbtn" onClick=${() => { keepQuiet(g, s); update(); }}>Me taire</button>
        ${s.out.post ? html`<button class="linkbtn" onClick=${() => openPost(s.out.post)}>Voir le post</button>` : null}
      </div>
    </div>
  </div>`;
}
// The modals: it came out; a denial proved to be a lie.
function SecretModal({ m, g, close }) {
  const s = secretOf(g, m.sid);
  if (!s || !s.out) return null;
  const o = s.out, by = o.by && g.chars[o.by], S0 = sevOf(s);
  if (m.t === 'secretlie') {
    const c = g.chars[m.by];
    return html`<div class="modal-card busted">
      <span class="eyebrow">Ton démenti ne tient plus</span>
      <div class="burst">MENSONGE</div>
      ${c ? html`<div class="modal-char"><${Avatar} who=${author(g, 'c:' + c.id)} size=${44} /><div><b>${c.name}</b><span>apporte la preuve que c’est vrai</span></div></div>` : null}
      <div class="evidence"><span class="ev-kind">${S0.emoji} ${S0.label}</span><span class="ev-desc">« ${s.t} »</span></div>
      <div class="rewards">${m.rep ? html`<span class="chip bad">${repWord(m.rep / 10)}</span>` : null}${m.loss ? html`<span class="chip bad">−${nAbonnes(m.loss)}</span>` : null}<span class="chip bad">Bad buzz</span></div>
      <p>Le secret, plus le mensonge : tout le monde t’en veut un peu plus. Des excuses sincères, plus tard, pourraient aider.</p>
      <button class="btn btn-ghost" onClick=${close}>Encaisser</button>
    </div>`;
  }
  if (o.state !== 'live' || o.answer) return null;
  return html`<div class="modal-card busted secret-modal">
    <span class="eyebrow">Ton secret est sorti</span>
    <div class="burst">RÉVÉLÉ</div>
    ${by ? html`<div class="modal-char"><${Avatar} who=${author(g, 'c:' + by.id)} size=${44} /><div><b>${by.name}</b><span>@${by.handle} a tout balancé</span></div></div>` : null}
    <div class="evidence"><span class="ev-kind">${S0.emoji} ${S0.label}</span><span class="ev-desc">« ${s.t} »</span></div>
    <div class="rewards">${o.rep ? html`<span class="chip bad">${repWord(o.rep)}</span>` : null}${o.fol ? html`<span class="chip bad">−${nAbonnes(o.fol)}</span>` : null}</div>
    <p>Tout le monde en parle. Tant que tu ne réponds pas, ça jase (3 h). Ce que tu dis maintenant compte : les persos décident s’ils te croient.</p>
    <${SecretAnswers} s=${s} close=${close} />
    <button class="btn btn-ghost" onClick=${() => { keepQuiet(g, s); close(); update(); }}>Me taire</button>
  </div>`;
}
// In a private conversation: confide one of them (the message is prefilled; the player can rewrite it).
function ConfideChip({ g, c, onPick }) {
  const [open, setOpen] = useState(false);
  const list = hiddenSecrets(g).filter((s) => !s.auto && !knowsSecret(s, c));
  if (!isMain(c) || !list.length || c.cut) return null;
  return html`<span class="confide-wrap">
    <button type="button" class=${'voice-chip confide-btn' + (open ? ' on' : '')} aria-expanded=${open ? 'true' : 'false'} onMouseDown=${(e) => e.preventDefault()} onClick=${() => setOpen(!open)}>${emoParts('🤫')} Confier un secret</button>
    ${open ? html`<div class="confide-pop" role="menu">${list.map((s) => html`<button key=${s.id} type="button" role="menuitem" class="confide-opt" onClick=${() => { setOpen(false); onPick(s); }}><span class=${'chip ' + SEV_CHIP[s.sev]}>${sevOf(s).emoji}</span><span>« ${str(s.t, 70)} »</span></button>`)}</div>` : null}
  </span>`;
}
// What the player confided to someone, on their page.
function SecretsKnownSection({ g, c }) {
  const list = mySecrets(g).filter((s) => s.known.some((k) => k.c === c.id && (k.how === 'confie' || k.how === 'marque')) || (s.out && s.out.by === c.id));
  if (!list.length) return null;
  const first = c.name.split(' ')[0];
  return html`<section class="section">
    <div class="section-h"><h3>Tes secrets que ${first} connaît</h3><span>${list.length}</span></div>
    <ul class="clue-list">${list.map((s) => html`<li key=${s.id}><span aria-hidden="true">${sevOf(s).emoji}</span><span>« ${s.t} »${s.out && s.out.by === c.id ? ` — ${first} l’a balancé` : s.out ? ' — sorti depuis' : ''}</span></li>`)}</ul>
  </section>`;
}
