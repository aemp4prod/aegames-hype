/* =========================================================
   0.32: the ones who follow the player (his wish of 23 October: « le stalker qui fait tout pour être en couple avec le
   joueur… tu le repères qu'avec quelques indices… en soi, il est pas méchant », « un autre stalker… qui prend des photos
   de toi dans ton privé, les poste, ou essaye de nuire à tes partenariats », « à partir de 10 000 abonnés »).
   Once the player is known (10 000 followers), someone who has followed them for a long time may come into their life:
   - « doux », the secret admirer: knows too much, always there first, does everything to please, wants to be with the
     player. Harmless: their AI never threatens nor harms.
   - « hater »: the same at first; ignored or turned down, it sours. Their AI may then post stolen photos of the player's
     private life (never intimate) from an anonymous account, and write to the player's brands to sabotage them.
   Both leave signs, noted in the player's file on them like the psychopath's: the only way to tell them apart. Called
   out in public with the right signs: the hater falls (banned, charged), the admirer is ashamed and steps back. Calling
   someone else a stalker stays defamation. Their AI decides when they act; the game only counts and caps.
   ========================================================= */
const STALK_MIN = 10000;
const STALK_P = { doux: 0.6, hater: 0.5 };
const STALK_CLUES = 10;
const STALK_PHOTO_GAP = DAY_MS, STALK_SABO_GAP = 2 * DAY_MS, STALK_PHOTO_MAX = 4, STALK_SABO_MAX = 3;
const stalkOf = (g) => g.stalk || (g.stalk = { list: [] });
const stalkerOf = (g, c) => (g && c && g.stalk ? (g.stalk.list || []).find((X) => X.c === c.id && !X.out) || null : null);
const isStalker = (g, c) => !!stalkerOf(g, c);
// The one arriving, as the AI is told when it writes them (their public face first: nothing gives them away).
const STALK_BIRTH = {
  doux: 'SECRET DU JEU (le joueur ne le saura pas) : ce nouveau personnage suit le joueur depuis ses débuts, en secret ; il ou elle sait presque tout de lui et va tout faire pour entrer dans sa vie et être en couple avec lui. Pas méchant·e : maladroit·e, envahissant·e, attachant·e. En public, un profil tout à fait normal (un métier, une vie, des passions) ; rien dans sa bio ni dans son premier post ne le trahit.',
  hater: 'SECRET DU JEU (le joueur ne le saura pas) : ce nouveau personnage suit le joueur depuis ses débuts, en secret, et en est obsédé·e ; il ou elle va tout faire pour entrer dans sa vie. Mais il ou elle supporte très mal d’être ignoré·e ou repoussé·e : l’admiration peut tourner à la rancœur. En public, un profil tout à fait normal (un métier, une vie, des passions) ; rien dans sa bio ni dans son premier post ne le trahit.',
};
const stalkBirth = (k) => STALK_BIRTH[k] || null;
// Their heart, as the game draws it for them (the admirer wants it all at once; the hater cannot share).
const STALK_HEART = { doux: ['fusionnel', 'fusionnel', 'anxieux'], hater: ['possessif', 'jaloux', 'fusionnel'] };

/* ---------- when they come ---------- */
function tickStalkers(g, t = Date.now()) {
  if (!g || g.over || g.pendingCast || !g.ready || !t32On()) return false;
  const st = stalkOf(g);
  let ch = false;
  if (!st.planned && g.stats.followers >= STALK_MIN) {
    st.planned = t;
    st.plan = {};
    const T = window.__HYPE_TEST__ ? window.__stalkPlan || null : undefined; // (the tests: { doux: ms, hater: ms }; a kind left out, or no plan, does not come)
    for (const k of ['doux', 'hater']) {
      if (T !== undefined ? !T || T[k] == null : Math.random() >= STALK_P[k]) continue;
      st.plan[k] = { due: t + (T ? T[k] : rand(k === 'doux' ? 6 : 30, k === 'doux' ? 48 : 96) * HR) };
    }
    ch = true;
  }
  if (st.plan && !S.busy.newchar && !S.busy.create) {
    for (const k of ['doux', 'hater']) {
      const P = st.plan[k];
      if (!P || P.done || t < P.due || t - (P.tryAt || 0) < 20 * 60000 * 2 ** Math.min(P.fails || 0, 5)) continue;
      if (!canAfford(g, 'newchar')) break;
      if ((P.fails || 0) >= 5) { P.done = 'missed'; continue; } // (the AI never wrote them: they will not come)
      P.tryAt = t;
      P.fails = (P.fails || 0) + 1; // (reset by nothing: done once they are there)
      genNewChar(null, '', false, { stalk: k });
      ch = true;
      break;
    }
  }
  for (const X of st.list || []) if (!X.out) stalkStage(g, X, t);
  return ch;
}
// The plan of their arrival, for the newcomer's prompt: their heart, their way of fighting, and their secret.
function stalkPlan(g, k, plan) {
  const hs = STALK_HEART[k] || STALK_HEART.doux;
  plan.coeur = hs[randi(0, hs.length - 1)];
  if (k === 'hater') plan.clash = pick(['rancunier', 'dramatique', 'rancunier', 'culpabilisant']);
  if (plan.extreme === 'coeur' && !COEUR_EXT[plan.coeur]) plan.extreme = null;
  plan.ouvert = false;
  plan.stalk = k;
  return plan;
}
// They are there: their file opens (in secret), they already follow the player.
function stalkArrives(g, c, k, t = Date.now()) {
  if (!g || !c || !STALK_BIRTH[k]) return null;
  const st = stalkOf(g);
  if (st.plan && st.plan[k]) st.plan[k].done = t;
  const X = { c: c.id, kind: k, at: t, stage: 0, signs: 0, photos: 0, sabos: 0 };
  st.list = (st.list || []).concat(X);
  c.followsYou = true;
  if (c.rel < 10) c.rel = 10; // (no memory of it: the player reads their memories on their sheet; their AI knows from the secret)
  return X;
}
// 0 the first contact, 1 the signs, 2 the admirer insists / the hater sours (and may harm).
function stalkStage(g, X, t = Date.now()) {
  const c = X && g.chars[X.c];
  if (!c || X.out) return -1;
  if (c.cut || c.jailed) { X.out = 'gone'; return -1; }
  const days = (t - X.at) / DAY_MS, n = X.signs || 0;
  let s = days >= 1 ? 1 : 0;
  if (days >= 3 && n >= 2 && (X.kind === 'doux' || spurned(g, c, X, t) || days >= 6)) s = 2;
  if (s > (X.stage || 0)) X.stage = s;
  return X.stage || 0;
}
// The hater sours when the player does not give back: with someone else, cold to them, or silent for two days.
function spurned(g, c, X, t = Date.now()) {
  const other = mains(g).some((o) => o !== c && PARTNER.includes(o.vibe));
  if (PARTNER.includes(c.vibe)) return other;
  const mine = ((g.dms[c.id] || {}).msgs || []).filter((m) => m.me).reduce((m, x) => Math.max(m, x.at || 0), 0);
  return other || c.rel < 15 || t - (mine || X.at) > 2 * DAY_MS;
}

/* ---------- their part ---------- */
const STALK_SIGNS = 'il ou elle en sait trop (un détail de la vie du joueur jamais posté : son café, ses horaires, le nom d’un proche), like chaque post à la seconde, ressort des posts d’il y a des années, était « par hasard » au même endroit que lui, a des photos de lui qu’il n’a jamais vues, demande pourquoi il a mis du temps à répondre';
const STALK_STAGES = {
  doux: (il) => [`le premier contact : ${il} est charmant·e, admiratif·ve, un peu trop disponible ; pas encore de signe (au plus un, minuscule)`,
    `les premiers signes, discrets : ${STALK_SIGNS}`,
    `l’insistance : ${il} veut être en couple avec le joueur, multiplie les attentions et les signes ; toujours inoffensif·ve`],
  hater: (il) => [`le premier contact : ${il} est charmant·e, admiratif·ve, un peu trop disponible ; pas encore de signe (au plus un, minuscule)`,
    `les premiers signes, discrets : ${STALK_SIGNS}`,
    `la rancœur : en privé, ${il} est tantôt charmant·e, tantôt blessé·e et froid·e ; en secret, ${il} cherche à lui nuire (photos volées de sa vie privée, coups bas contre ses partenariats) sans jamais l’avouer`],
};
// For a call where they speak to the player (their messages, an evening, a visit).
function stalkCore(g, c) {
  const X = stalkerOf(g, c);
  if (!X) return [];
  const st = Math.max(0, stalkStage(g, X)), first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel');
  const want = X.kind === 'doux'
    ? `entrer dans la vie du joueur et être en couple avec lui ; ${il} le suit depuis longtemps, sait presque tout de lui, et fait tout pour lui plaire (compliments, attentions, toujours disponible, toujours d’accord). Pas méchant·e : maladroit·e, envahissant·e, attachant·e ; jamais de menace, jamais rien qui lui nuise`
    : `le joueur, rien que le joueur ; ${il} le suit depuis longtemps et sait presque tout de lui. Mais ${il} supporte très mal d’être ignoré·e ou repoussé·e : l’admiration tourne vite à la rancœur. Jamais de menace franche ni de violence`;
  return ['', `## SECRET DU JEU : ${first.toUpperCase()} SUIT LE JOUEUR DE TROP PRÈS`,
    `Personne ne le sait : ni le joueur, ni les autres personnages. ${first} ne l’avoue jamais d’un coup : seuls de petits détails le trahissent.`,
    `Ce qu’${il} veut : ${want}.`, `Où ${il} en est : ${STALK_STAGES[X.kind](il)[st]}.`]
    .concat(X.suspected ? [`Le joueur l’a accusé·e en public de le suivre de trop près, sans preuve assez solide : ${first} sait qu’il se méfie (${X.kind === 'doux' ? 'gêné·e, blessé·e, ' + il + ' se fait plus discret·ète' : 'piqué·e au vif, ' + il + ' nie et redouble de prudence'}).`] : []);
}
const STALK_SIGN_LINE = '- Facultatif (au plus 1) : si tu glisses un détail qui montre qu’il ou elle en sait trop ou suit le joueur de trop près (naturellement, jamais souligné ni expliqué), ajoute {"t":"suivi","text":"≤ 90 caractères : ce que le joueur a pu remarquer, factuel (ex : « savait que tu étais au café ce matin »)"}.';
// The refreshes and the reactions: their secret in a line; the hater's means, once soured (their AI decides).
function stalkPublicLines(g, t = Date.now()) {
  const L = [];
  for (const X of (g.stalk && g.stalk.list) || []) {
    const c = !X.out && g.chars[X.c];
    if (!c || !c.unlocked || c.cut || c.jailed) continue;
    const st = stalkStage(g, X, t), first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel');
    L.push(`- SECRET DU JEU (toi seul le sais : personne ne le sait ni ne le soupçonne, personne n’en parle) : @${c.handle} suit le joueur de trop près (${X.kind === 'doux' ? 'un·e admirateur·rice obsessionnel·le, inoffensif·ve' : st >= 2 ? 'un·e admirateur·rice obsessionnel·le, devenu·e rancunier·ère' : 'un·e admirateur·rice obsessionnel·le'}). En public, ${first} reste crédible ; facultatif, rarement : un détail un peu trop intense (un like à la seconde sur chaque post du joueur, un commentaire qui en sait trop, toujours au même endroit que lui) ; si tu en glisses un, ajoute {"t":"suivi","by":"${c.handle}","text":"≤ 90 caractères : ce que le joueur a pu remarquer"}.`);
    if (X.kind !== 'hater' || st < 2) continue;
    if ((X.photos || 0) < STALK_PHOTO_MAX && t - (X.photoAt || 0) >= STALK_PHOTO_GAP) L.push(`- Facultatif, seulement si ${first} le décide maintenant (au plus 1) : depuis un compte anonyme (jamais le sien), ${il} poste une photo volée de la vie privée du joueur, jamais intime ni dénudée (dans la rue, en terrasse, devant chez lui, avec quelqu’un, au supermarché) : {"t":"vole","by":"${c.handle}","compte":"${X.burner || 'pseudo du compte anonyme'}","text":"≤ 200 caractères : la légende, venimeuse ou faussement innocente, jamais haineuse","photo":"≤ 110 caractères : ce qu’on voit"}.`);
    const deals = (g.deals || []).filter((d) => (d.state === 'signed' || d.state === 'offer') && !d.doubt);
    if (deals.length && (X.sabos || 0) < STALK_SABO_MAX && t - (X.saboAt || 0) >= STALK_SABO_GAP) L.push(`- Facultatif, seulement si ${first} le décide maintenant (au plus 1) : ${il} écrit en secret à une marque qui travaille avec le joueur (${[...new Set(deals.map((d) => d.brand))].slice(0, 4).join(', ')}) pour saboter leur collaboration (une rumeur, une fausse capture, « il dit du mal de vous », « il bosse pour vos concurrents ») : {"t":"sabote","by":"${c.handle}","brand":"la marque","text":"≤ 160 caractères : ce qu’${il} leur fait croire"}.`);
  }
  return L;
}
// A sign the player could notice: noted in their file on them, counted.
function stalkSign(g, c, text, at) {
  const X = stalkerOf(g, c);
  if (!X) return null;
  text = str(text, 130);
  if (text.length < 4) return null;
  X.signs = (X.signs || 0) + 1;
  if (!Array.isArray(g.clues)) g.clues = [];
  const mine = g.clues.filter((k) => k.c === c.id && k.stalk);
  if (mine.length >= STALK_CLUES || mine.some((x) => similar(x.text, text))) return true;
  const t = at || later();
  const k = tag({ id: uid('k'), c: c.id, text, ts: t, at: t, stalk: 1 });
  g.clues.push(k);
  addNotif(g, { k: 'clue', c: c.id, at: t, text: `Indice noté sur ${c.name} : ${text}` });
  stalkStage(g, X);
  return k;
}
// The lines of a refresh or a reaction: a sign, a stolen photo, a word to a brand.
function applyStalkLine(g, o, effects) {
  if (o.t !== 'suivi' && o.t !== 'vole' && o.t !== 'sabote') return false;
  const c = charByHandle(g, normHandle(o.by));
  if (!c || !stalkerOf(g, c)) return true;
  if (o.t === 'suivi') { const tx = o.text, at = later() + 2500; effects.push(() => stalkSign(g, c, tx, at)); }
  else if (o.t === 'vole') effects.push(() => stalkPhoto(g, c, o));
  else effects.push(() => stalkSabotage(g, c, o));
  return true;
}
// A stolen photo of the player's private life, from an anonymous account: the network sees it, the player too.
function stalkPhoto(g, c, o, t = Date.now()) {
  const X = stalkerOf(g, c);
  if (!X || X.kind !== 'hater' || stalkStage(g, X, t) < 2 || (X.photos || 0) >= STALK_PHOTO_MAX || t - (X.photoAt || 0) < STALK_PHOTO_GAP) return null;
  const photo = str(o.photo, 120), text = str(o.text, 220);
  if (!photo || !text) return null;
  if (!X.burner) X.burner = normHandle(o.compte) && !charByHandle(g, normHandle(o.compte)) ? normHandle(o.compte).slice(0, 24) : `vu.par.hasard${randi(10, 99)}`;
  const at = later() + 2000;
  const p = addAmbientPost(g, { by: X.burner, name: X.burner, bio: 'je poste ce que je vois 👀', text, photo, noPack: true }, at, at);
  if (!p) return null;
  p.stolen = { c: c.id }; // (whose it is: the game knows, the player does not)
  X.photos = (X.photos || 0) + 1;
  X.photoAt = t;
  const dr = repMove(g, { image: -2 }, 'une photo volée de toi circule', { noCheck: true });
  addNotif(g, { k: 'drama', at: at + 1500, text: `📸 Un compte anonyme (@${X.burner}) a posté une photo de toi, prise à ton insu : « ${wordCut(photo, 70)} »${repBit(dr, ' (', ')')}.` });
  addChronicle(g, `Un compte anonyme (@${X.burner}) a posté une photo volée de ${g.player.name} : « ${wordCut(photo, 80)} ».`);
  addTrigger(g, `Un compte anonyme, @${X.burner}, vient de poster une photo volée de la vie privée du joueur (« ${wordCut(photo, 80)} ») : malaise, curieux, gens choqués, quelques-uns qui en rajoutent ; personne ne sait qui est derrière.`);
  worry(g, 'une photo volée de lui circule', t);
  return p;
}
// A word to one of the player's brands, in secret: they ask the player for an explanation, and may walk away.
function stalkSabotage(g, c, o, t = Date.now()) {
  const X = stalkerOf(g, c);
  if (!X || X.kind !== 'hater' || stalkStage(g, X, t) < 2 || (X.sabos || 0) >= STALK_SABO_MAX || t - (X.saboAt || 0) < STALK_SABO_GAP) return null;
  const want = plainOf(o.brand);
  const d = (g.deals || []).find((x) => (x.state === 'signed' || x.state === 'offer') && !x.doubt && (plainOf(x.brand) === want || (want && plainOf(x.brand).includes(want))))
    || (g.deals || []).find((x) => (x.state === 'signed' || x.state === 'offer') && !x.doubt);
  const text = str(o.text, 160);
  if (!d || !text) return null;
  X.sabos = (X.sabos || 0) + 1;
  X.saboAt = t;
  d.doubt = { at: t, text, by: c.id };
  const bc = g.chars[d.contact], at = later() + 4000;
  if (bc) addIncomingDM(g, bc, `Bonjour. On a reçu un message anonyme à votre sujet (« ${wordCut(text, 110)} »). Avant d’aller plus loin, on aimerait comprendre : vous pouvez nous expliquer ?`, at, { max: 320 });
  addNotif(g, { k: 'money', c: d.contact, at: at + 500, text: `⚠️ ${d.brand} a reçu un message anonyme à ton sujet et te demande des explications.` });
  worry(g, `quelqu’un essaie de saboter son partenariat avec ${d.brand}`, t);
  return d;
}
// For the brand's AI: what it was told, and what it may do about it.
function doubtLines(g, c) {
  const d = (g.deals || []).find((x) => x.contact === c.id && x.doubt && (x.state === 'signed' || x.state === 'offer'));
  if (!d) return [];
  return [`- ${c.name} a reçu un message anonyme sur le joueur : « ${d.doubt.text} ». ${c.name} ne sait pas qui l’a envoyé. Si les explications du joueur la rassurent, elle maintient la collaboration (aucune ligne) ; si elle n’y croit pas, elle peut ${d.state === 'offer' ? 'retirer son offre' : 'rompre le contrat'} : {"t":"deal","walk":true}.`];
}
const doubtWalk = (d) => !!(d && d.doubt && Date.now() - d.doubt.at < 3 * DAY_MS);

/* ---------- called out in public ---------- */
// For the reactions: the truth the AI judges with (psyAccuseLines asks it first).
function stalkAccuseLines(g, c) {
  const X = stalkerOf(g, c);
  if (!X) return null;
  if (X.kind === 'hater') return [`La vérité, que personne ne sait : @${c.handle} suit réellement le joueur de trop près depuis longtemps, obsédé·e par lui${(X.photos || X.sabos) ? ` (c’est lui ou elle qui est derrière ${[X.photos ? `les photos volées du compte @${X.burner}` : '', X.sabos ? 'les messages anonymes à ses marques' : ''].filter(Boolean).join(' et ')})` : ''}. Si l’accusation parle de cette obsession (harcèlement, traque, photos volées, sabotage) et s’appuie sur des indices précis, elle touche juste : credibility 8 à 10 et exposed = true. Les réactions : le choc, des gens qui avaient remarqué des choses, la plateforme qui bannit ses comptes, une plainte ; @${c.handle} nie, puis se tait.`];
  return [`La vérité, que personne ne sait : @${c.handle} suit réellement le joueur de trop près (obsédé·e, en sait beaucoup trop), mais n’a jamais voulu lui nuire. Si l’accusation parle de cette obsession et s’appuie sur des indices précis, elle touche juste : credibility 6 à 9 et exposed = true (si elle en fait un danger public ou un psychopathe, elle exagère : credibility 4 à 6). Les réactions : malaise, des gens choqués, d’autres qui plaignent @${c.handle} ; ${firstName(c)} a honte et s’excuse publiquement.`];
}
// After the call-out (judged): 'unmasked'; 'stalker' (a call-out as any other, never defamation: it is true); false.
function stalkAccusation(g, c, cred, said, cited) {
  const X = stalkerOf(g, c);
  if (!X) return false;
  const about = PSY_TALK.test(said) || /suit partout|me suit|espionn|photo vol|compte anonyme|sabot/i.test(said) || cited.some((k) => k.stalk);
  if (about && cred >= (X.kind === 'hater' ? 7 : 6)) { stalkUnmask(g, c, X); return 'unmasked'; }
  if (about) X.suspected = Date.now(); // (their AI is told, in their part: never on the player's sheet)
  return 'stalker';
}
function stalkUnmask(g, c, X, t = Date.now()) {
  const s = g.stats, at = later() + 1200, first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel');
  X.out = 'unmasked';
  X.outAt = t;
  for (const d of g.deals || []) if (d.doubt && d.doubt.by === c.id) d.doubt = null; // (the brands understand)
  if (X.kind === 'hater') {
    c.cut = { at: t };
    c.banned = t;
    const fol = grow(s.followers, Math.round(Math.max(1500, s.followers * 0.12) * rand(0.85, 1.2)));
    if (fol > 0) { s.followers += fol; checkMilestones(g); }
    const dr = repMove(g, { cred: 8, image: 6, kind: 4 }, `tu as démasqué ${c.name}`);
    gainXP(g, 80);
    const md = medias(g);
    if (md[0]) addAmbientPost(g, { by: md[0].handle, text: `🚨 @${g.player.handle} harcelé·e depuis des semaines : c’était @${c.handle}${X.burner ? `, derrière le compte @${X.burner}` : ''}. Comptes bannis, plainte déposée.` }, at + 3000, at + 3000);
    addNotif(g, { k: 'viral', c: c.id, at, text: `🚨 Tu as démasqué ${c.name} : c’était ${gx(c.g, 'lui', 'elle', 'iel')} qui te suivait partout${X.burner ? ` et postait tes photos (@${X.burner})` : ''}. Comptes bannis, plainte déposée (${[nAbonnes(fol, true), repBit(dr)].filter(Boolean).join(', ')}).` });
    addChronicle(g, `${g.player.name} a démasqué ${c.name}, qui ${gx(c.g, 'le', 'la', 'le ou la')} harcelait en secret${X.burner ? ` (le compte anonyme @${X.burner})` : ''}. Ses comptes sont bannis.`, null);
    addTrigger(g, `@${c.handle} vient d’être démasqué·e par le joueur : ${il} le suivait partout en secret${X.burner ? ` et postait ses photos volées depuis @${X.burner}` : ''}. Ses comptes sont bannis, une plainte est déposée : le réseau est sous le choc, beaucoup soutiennent le joueur.`);
  } else {
    c.vibe = c.vibe && LOVE_ACTIVE.includes(c.vibe) ? 'complique' : c.vibe;
    startCool(g, c, 'ghost', 'démasqué·e en public');
    const dr = repMove(g, { cred: 4, kind: -2 }, `tu as révélé l’obsession de ${c.name}`);
    addMem(g, c, 'le joueur a révélé en public que je le suivais partout : j’ai tellement honte');
    addNotif(g, { k: 'drama', c: c.id, at, text: `😳 ${c.name} te suivait vraiment partout… mais sans jamais te vouloir de mal. ${cap1(il)} a honte et prend ses distances${repBit(dr, ' (', ')')}.` });
    addChronicle(g, `${g.player.name} a révélé que ${c.name} ${gx(c.g, 'le', 'la', 'le ou la')} suivait partout en secret ; ${il} s’excuse, mortifié·e.`, null);
    addTrigger(g, `Le joueur a révélé en public que @${c.handle} le suivait partout en secret : malaise général ; @${c.handle} poste des excuses gênées et se fait discret·ète ; certains le ou la plaignent, d’autres trouvent le joueur dur.`, c.id);
  }
  return true;
}

/* ---------- a visit: they may come by (the hater too, before it sours) ---------- */
const stalkVisit = (g, c, t = Date.now()) => { const X = stalkerOf(g, c); return !!(X && stalkStage(g, X, t) >= 1); };
