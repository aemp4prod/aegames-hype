/* =========================================================
   0.33.1: someone comes along. On a date of the player's, someone of the cast (anyone but the one they meet) may come
   with them: asked from the date's screen or in their messages, their AI says yes or no, and the game notes it. Tonight
   they are really there: they speak in the conversation, and the one who receives them reacts to their presence (a
   dinner for two with a third, it cools; between friends, the more the merrier). It counts for the three of them.
   With a witness, the worst can still happen: the psychopath tries to part them, then strikes. The attack is a scene
   under pressure, like a horror film: three beats, each with a few seconds to choose what to do (too slow: too late),
   and between them, by surprise, moments to react (dodge, break free, push together on « three », keep still in the
   dark). A moment missed is not the end: one goes back just before, a little easier each time (after three misses, one
   may let it go, hurt). The one who came along acts too, by how close they are to the player (they help, catch a miss,
   or freeze). Out of it alive: they flee together, the friend saw it all (a proof that weighs), and they are closer for
   it; caught: the end, for both. Alone (an evening at theirs, the night after it, a visit at night), the scene plays
   too, much harder.
   ========================================================= */
const COME_RE = /vien[st]? avec moi|venir avec moi|m['’]accompagner|accompagne[- ]?moi|tu m['’]accompagnes|vous m['’]accompagnez|tu viens avec|vous venez avec|on y va ensemble|on y va tous les deux|tu peux venir|tu pourrais venir|viens avec|avec moi chez|venir aussi/i;
const ATTACK_MS = 10000; // the time to choose, each beat, once the moves are shown (0.33.6: 8 s before, read included)
const atkMs = () => (window.__HYPE_TEST__ && window.__atkMs) || ATTACK_MS; // (the tests: shorter)
// 0.33.6 (« des phases de lecture, mais on ait plus de temps ; et des phases de QTE où ça peut aller vraiment vite »):
// what happens is read first, in its own time (by its length; a key or a tap goes on sooner), then the moves come.
const atkRead = (text) => (window.__HYPE_TEST__ ? num(window.__atkRead, 0) : clamp(900 + 40 * String(text || '').length, 2000, 4500));
const ATTACK_OK = 2; // what it takes to get out (each beat: what the player did, 0 to 0,9, and the friend's help, 0,45)
const ATTACK_SOLO = 2.4; // alone: hardly a mistake allowed
const duelOn = () => t33On(); // (alone too, the scene plays; before, the end came at once)
const atkRoll = () => (window.__HYPE_TEST__ && Array.isArray(window.__atkRolls) && window.__atkRolls.length ? window.__atkRolls.shift() : Math.random());
const plusOK = (g, c, ev) => !!c && !!ev && isMain(c) && c.unlocked && !c.cut && !c.jailed && c.id !== ev.c && !(c.cool && c.cool.k === 'bloque' && Date.now() < c.cool.until);
// The dates of the player's they may come to (one of them already has someone else with them: not that one).
const plusDates = (g, c, t = Date.now()) => activeEvents(g).filter((e) => e.player && e.kind === 'rdv' && e.c !== (c && c.id) && e.due > t - 15 * 60000 && !(e.plus && e.plus.ok && e.plus.c !== c.id));
// Who came along (null: alone).
const plusOf = (g, ev) => (ev && ev.plus && ev.plus.ok && g.chars[ev.plus.c] && !g.chars[ev.plus.c].jailed ? g.chars[ev.plus.c] : null);
const plusAsked = (g, c) => activeEvents(g).find((e) => e.player && e.plus && e.plus.c === c.id && e.plus.ok == null) || null;
function askPlus(g, ev, c, t = Date.now()) {
  if (!ev || ev.state !== 'scheduled' || !plusOK(g, c, ev)) return false;
  const h = g.chars[ev.c];
  ev.plus = { c: c.id, ok: null, at: t };
  S.drafts.dm[c.id] = `Tu viendrais avec moi ${fmtWhen(ev.due)} ? J’ai rendez-vous avec ${h ? '@' + h.handle : 'quelqu’un'} : « ${str(ev.what, 70)} ».`;
  return true;
}
// Their messages: the dates they may be asked to, when it is talked of (or asked from the date's screen).
function plusDMCtx(g, c, text, t = Date.now()) {
  if (!t33On() || !c || !isMain(c)) return [];
  const asked = plusAsked(g, c);
  const L = asked ? [asked] : COME_RE.test(text || '') ? plusDates(g, c, t).slice(0, 3) : [];
  if (!L.length) return [];
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel');
  return [`Rendez-vous prévus du joueur, où il peut demander à ${first} de venir avec lui : ${L.map((e) => { const h = g.chars[e.c]; return `${e.id} : « ${str(e.what, 70)} » avec @${h ? h.handle : '?'} (${fmtWhen(e.due, t)})`; }).join(' ; ')}.${asked ? ` Le joueur demande à ${first} de l’accompagner à celui-là.` : ''} ${first} décide selon votre relation, ce qu’${il} pense de cette personne, son emploi du temps et ce que le joueur lui dit (s’il a peur, s’il a besoin de soutien).`];
}
function plusLine(g, c, text, t = Date.now()) {
  if (!t33On() || !c || !isMain(c)) return null;
  const asked = plusAsked(g, c), L = asked ? [asked] : COME_RE.test(text || '') ? plusDates(g, c, t) : [];
  if (!L.length) return null;
  const il = gx(c.g, 'il', 'elle', 'iel');
  return `- Si le joueur demande à ${firstName(c)} de venir avec lui à un de ces rendez-vous et qu’${il} décide dans ce message : {"t":"accompagne","rdv":"${L[0].id}","ok":true,"why":"≤ 60 caractères"} (rdv : l’identifiant du rendez-vous ; ok:false s’${il} refuse). Pas de ligne s’${il} hésite encore.`;
}
function applyPlusLine(g, c, o, t = Date.now()) {
  const all = plusDates(g, c, t);
  const ev = all.find((e) => e.id === o.rdv) || plusAsked(g, c) || (all.length === 1 ? all[0] : null);
  if (!ev || !plusOK(g, c, ev)) return false;
  const h = g.chars[ev.c], first = firstName(c), why = str(o.why, 60);
  if (!(o.ok === true || o.ok === 'true')) {
    if (ev.plus && ev.plus.c === c.id) ev.plus.ok = false;
    addNotif(g, { k: 'reldown', c: c.id, at: later() + 1500, text: `${first} ne viendra pas avec toi${h ? ` (ton rendez-vous avec ${firstName(h)})` : ''}${why ? ` : « ${why} »` : ''}.` });
    return true;
  }
  ev.plus = { c: c.id, ok: true, at: t, why };
  addNotif(g, { k: 'relup', c: c.id, at: later() + 1500, text: `👥 ${first} vient avec toi${h ? ` : « ${str(ev.what, 50)} » avec ${firstName(h)}` : ''}, ${fmtWhen(ev.due)}.` });
  addMem(g, c, `je vais accompagner le joueur à son rendez-vous${h ? ` avec @${h.handle}` : ''} (« ${str(ev.what, 40)} »)`);
  touch(c);
  return true;
}
// Tonight, for the one who receives them: someone came along.
function plusTalkLines(g, ev) {
  const f = plusOf(g, ev), c = g.chars[ev.c];
  if (!f || !c) return [];
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel'), F = firstName(f), tie = tieOf(g, c.id, f.id);
  return ['', `## ${F.toUpperCase()} EST LÀ AUSSI`,
    `@${f.handle} (${f.name}) est venu·e avec le joueur et reste toute la soirée (sa fiche : ${ficheText(g, f)} ; sa relation avec le joueur : ${fmtRel(f.rel)}${tie ? ` ; entre ${first} et ${F} : ${tie > 0 ? 'ils s’entendent' : 'ils ne s’aiment pas'} (${fmtRel(tie)})` : ''}). ${first} ne s’y attendait pas forcément : ${il} réagit à sa présence selon qui ${il} est, et ce qu’${il} espérait de la soirée (en amoureux, une personne de trop, ça refroidit ; entre amis, ça peut faire plaisir).`,
    `${F} parle aussi, à sa façon (${f.voice ? `sa voix : ${str(f.voice, 90)}` : 'sa propre voix'}), réagit à ce qui se dit, et ne parle jamais à la place du joueur.`];
}
const PLUS_SAY = (g, ev) => { const f = plusOf(g, ev); return f ? `- Facultatif (au plus 1, quand ça vient naturellement) : {"t":"say2","text":"≤ 160 caractères : ce que dit @${f.handle}"} : une réplique de ${firstName(f)}, après celles de ${firstName(g.chars[ev.c])}.` : null; };
// After the evening: it counts for the three of them (an attack is its own story).
function plusAfter(g, ev, c) {
  const f = plusOf(g, ev);
  if (!f || (ev.talk && ev.talk.attack)) return;
  applyRel(g, f, 3, `tu ${gx(f.g, 'l’as emmené', 'l’as emmenée', 'l’as emmené·e')} avec toi`, later() + 2200, 6);
  addMem(g, f, `j’ai accompagné le joueur à son rendez-vous avec @${c.handle} (« ${str(ev.what, 40)} »)`);
  addMem(g, c, `le joueur est venu avec @${f.handle} à notre rendez-vous`);
  bumpTie(g, c.id, f.id, 2);
}

/* ---------- the attack: choices, and moments to react, like a horror film (0.33.1) ---------- */
// Three beats to choose in; in each, one good move, one that holds, two bad ones (shuffled). v: what it is worth.
// F: the one who came along (null: alone, the moves are one's own). P: the words for the one who strikes.
const ATK_BEATS = [
  [
    { text: (C, F, P) => `${C} revient vers toi, le couteau levé.`, opts: (C, F, P) => [
      ['Esquiver et attraper son poignet', 0.8, 'Tu esquives de justesse et tu lui saisis le poignet.'],
      ['Reculer vers la porte', 0.5, 'Tu recules jusqu’à la porte, le cœur qui cogne.'],
      [`Lever les mains pour ${P.le} calmer`, 0.15, `Tu lèves les mains : ${P.il} ne s’arrête pas.`],
      ['Lui demander ce qui lui prend', 0.15, `Tu parles, ${P.il} avance.`]] },
    { text: (C, F, P) => `${C} verrouille la porte et glisse la clé dans sa poche, le couteau toujours à la main.`, opts: (C, F, P) => [
      ['Attraper la chaise la plus proche', 0.8, 'Tu brandis la chaise entre vous.'],
      F ? ['Te placer à côté de ' + F, 0.5, `Tu te colles à ${F}, dos au mur.`] : ['Mettre la table entre vous', 0.5, 'Tu contournes la table : elle vous sépare, pour l’instant.'],
      ['Rire, comme si c’était une blague', 0.15, `Ton rire sonne faux. ${cap1(P.il)} sourit encore plus.`],
      ['Fouiller tes poches pour ton téléphone', 0.15, 'Tes doigts tremblent sur ton téléphone.']] },
  ],
  [
    { text: (C, F, P) => `${C} te plaque contre le mur.`, opts: (C, F, P) => [
      F ? [`Crier à ${F} de ${P.le} tirer en arrière`, 0.8, `Tu hurles le nom de ${F}.`] : ['Lui écraser le pied et te dégager', 0.8, `Ton talon s’abat sur son pied : ${P.il} lâche prise une seconde.`],
      [`${cap1(P.le)} repousser de toutes tes forces`, 0.5, `Tu ${P.le} repousses : ${P.il} revient aussitôt.`],
      ['Supplier qu’on te laisse partir', 0.15, '« Tu n’iras nulle part. »'],
      ['Fermer les yeux', 0.15, 'Une seconde de perdue.']] },
    { text: (C, F, P) => `${C} se met entre ${F ? 'vous' : 'toi'} et la sortie.`, opts: (C, F, P) => [
      F ? [`Faire diversion pour que ${F} passe derrière`, 0.8, 'Tu lui lances ce qui te tombe sous la main.'] : ['Lui lancer ce qui te tombe sous la main', 0.8, `Le vase l’atteint à l’épaule : ${P.il} recule d’un pas.`],
      ['Renverser la table entre vous', 0.5, 'La table bascule entre vous deux.'],
      ['Courir vers la chambre', 0.15, 'Un cul-de-sac.'],
      [`Essayer de ${P.le} raisonner`, 0.15, `${cap1(P.il)} ne t’écoute pas.`]] },
  ],
  [
    { text: (C, F, P) => `Ses clés ont glissé de sa poche : elles sont par terre, à deux mètres. ${C} les a vues aussi.`, opts: (C, F, P) => [
      ['Plonger sur les clés et ouvrir', 0.8, 'Ta main se referme sur les clés.'],
      F ? [`Pousser ${F} vers la porte`, 0.5, `Tu pousses ${F} devant toi.`] : ['Hurler à l’aide', 0.5, 'Tu hurles : quelque part, un voisin tape contre le mur.'],
      ['Attendre le bon moment', 0.15, 'Le bon moment ne vient pas.'],
      ['Revenir chercher ton sac', 0.15, 'Tu te retournes : mauvaise idée.']] },
    { text: (C, F, P) => `${C} revient à la charge, plus vite que toi.`, opts: (C, F, P) => [
      F ? [`Hurler à ${F} d’ouvrir la porte`, 0.8, '« La porte ! »'] : ['Te jeter contre la porte', 0.8, 'Tu te jettes contre la porte : la vieille serrure cède.'],
      ['Lui lancer la lampe', 0.5, 'La lampe vole, la pièce plonge dans le noir.'],
      ['Te cacher derrière le canapé', 0.15, `${cap1(P.il)} sait très bien où tu es.`],
      ['Lui demander pourquoi', 0.15, '« Parce que tu es à moi. »']] },
  ],
];
// 0.33.6: outside, leaving an evening (« s'il nous retrouve dehors »): the street, the cars, the avenue lit further on.
const ATK_BEATS_OUT = [
  [
    { text: (C, F, P) => `${C} fonce sur ${F ? 'vous' : 'toi'}, le couteau levé.`, opts: (C, F, P) => [
      ['Esquiver et attraper son poignet', 0.8, 'Tu esquives de justesse et tu lui saisis le poignet.'],
      ['Reculer vers la rue éclairée', 0.5, 'Tu recules vers les lampadaires, le cœur qui cogne.'],
      [`Lever les mains pour ${P.le} calmer`, 0.15, `Tu lèves les mains : ${P.il} ne s’arrête pas.`],
      ['Lui demander ce qu’il lui prend', 0.15, `Tu parles, ${P.il} avance.`]] },
    { text: (C, F, P) => `${C} ${F ? 'vous' : 'te'} barre le trottoir, le couteau à la main. La rue est déserte.`, opts: (C, F, P) => [
      ['Enrouler ta veste autour de ton bras', 0.8, 'Ta veste enroulée autour du bras, tu fais face.'],
      F ? ['Te placer à côté de ' + F, 0.5, `Tu te colles à ${F}, dos à la vitrine.`] : ['Mettre une voiture garée entre vous', 0.5, 'Tu contournes une voiture : elle vous sépare, pour l’instant.'],
      ['Rire, comme si c’était une blague', 0.15, `Ton rire sonne faux. ${cap1(P.il)} sourit encore plus.`],
      ['Chercher ton téléphone', 0.15, 'Tes doigts tremblent sur ton téléphone.']] },
  ],
  [
    { text: (C, F, P) => `${C} te plaque contre une vitrine.`, opts: (C, F, P) => [
      F ? [`Crier à ${F} de ${P.le} tirer en arrière`, 0.8, `Tu hurles le nom de ${F}.`] : ['Lui écraser le pied et te dégager', 0.8, `Ton talon s’abat sur son pied : ${P.il} lâche prise une seconde.`],
      [`${cap1(P.le)} repousser de toutes tes forces`, 0.5, `Tu ${P.le} repousses : ${P.il} revient aussitôt.`],
      ['Supplier qu’on te laisse partir', 0.15, '« Tu n’iras nulle part. »'],
      ['Fermer les yeux', 0.15, 'Une seconde de perdue.']] },
    { text: (C, F, P) => `${C} se met entre ${F ? 'vous' : 'toi'} et l’avenue.`, opts: (C, F, P) => [
      F ? [`Faire diversion pour que ${F} passe derrière`, 0.8, 'Tu lui lances ce qui te tombe sous la main.'] : ['Lui lancer ce qui te tombe sous la main', 0.8, `Une bouteille vide l’atteint à l’épaule : ${P.il} recule d’un pas.`],
      ['Renverser une poubelle entre vous', 0.5, 'La poubelle roule entre vous deux.'],
      ['Courir vers la ruelle', 0.15, 'Une impasse.'],
      [`Essayer de ${P.le} raisonner`, 0.15, `${cap1(P.il)} ne t’écoute pas.`]] },
  ],
  [
    { text: (C, F, P) => `Des phares au bout de la rue : une voiture approche. ${C} l’a vue aussi.`, opts: (C, F, P) => [
      ['Courir vers la voiture en criant', 0.8, 'Tu cours en agitant les bras dans la lumière des phares.'],
      F ? [`Pousser ${F} vers la voiture`, 0.5, `Tu pousses ${F} devant toi.`] : ['Hurler à l’aide', 0.5, 'Tu hurles : une fenêtre s’allume au-dessus de toi.'],
      ['Attendre le bon moment', 0.15, 'Le bon moment ne vient pas.'],
      ['Revenir chercher ton sac', 0.15, 'Tu te retournes : mauvaise idée.']] },
    { text: (C, F, P) => `${C} revient à la charge, plus vite que toi.`, opts: (C, F, P) => [
      F ? [`Hurler à ${F} de courir vers l’avenue`, 0.8, '« L’avenue ! »'] : ['Sprinter vers l’avenue éclairée', 0.8, 'Tu sprintes vers les lumières de l’avenue.'],
      ['Lui lancer ton sac', 0.5, 'Ton sac l’atteint en plein visage.'],
      ['Te cacher derrière une voiture', 0.15, `${cap1(P.il)} sait très bien où tu es.`],
      ['Lui demander pourquoi', 0.15, '« Parce que tu es à moi. »']] },
  ],
];
const ATK_HELP = [
  (F, f, P) => `${F} ${P.le} tire en arrière de toutes ses forces !`,
  (F, f, P) => `${F} lui fait lâcher le couteau !`,
  (F, f, P) => `${F} se jette sur la porte : elle cède !`,
];
const ATK_FROZEN = [
  (F, f) => `${F} est ${gx(f.g, 'pétrifié', 'pétrifiée', 'pétrifié·e')}.`,
  (F, f) => `${F} hurle, sans pouvoir bouger.`,
  (F, f) => `${F} cherche son téléphone, les mains qui tremblent.`,
];
// The moments to react, by surprise between the choices: read what comes, then act, fast. pre: what happens; go: what
// to do; win; help: the one who came along catches it; lose (early: too soon): too late (it is not the end yet).
const QTE_TXT = {
  dodge: (C, F, P, w) => (w === 'dehors'
    ? { pre: `Au coin de la rue, une silhouette se détache de l’ombre. ${C}. Dans sa main, un couteau. ${cap1(P.il)} sourit.`, go: 'Esquive !', win: 'La lame raye la vitrine, à un souffle de toi.', lose: 'Tu n’as pas bougé à temps.', help: `${F} te tire en arrière : la lame fend l’air.` } // 0.33.6
    : w === 'inside'
    ? { pre: `Un bruit de serrure, puis plus rien. Dans le couloir, ${C}, un couteau à la main. ${cap1(P.il)} sourit.`, go: 'Esquive !', win: 'La lame raye le mur, à un souffle de toi.', lose: 'Tu n’as pas bougé à temps.', help: `${F} te tire en arrière : la lame fend l’air.` } // 0.33.5
    : w === 'night' || w === 'home'
    ? { pre: `Un bruit te réveille. ${C} est ${P.assis} au bord du lit, dans le noir. ${cap1(P.il)} sourit. ${cap1(P.il)} tient un couteau.`, go: 'Roule hors du lit !', win: 'La lame s’enfonce dans l’oreiller, là où était ta tête.', lose: 'Tu n’as pas bougé à temps.', help: '' }
    : { pre: `${C} sourit. Un grand sourire, immobile. Dans sa main, un couteau.`, go: 'Esquive !', win: 'La lame se plante dans le mur, à un souffle de ton visage.', lose: 'Tu n’as pas bougé à temps.', help: `${F} te tire en arrière : la lame fend l’air.` }),
  dodge2: (C, F, P) => ({ pre: `${C} feinte d’un côté…`, go: 'Esquive !', win: 'Tu te baisses : la lame passe au-dessus de toi.', lose: 'Tu as esquivé du mauvais côté.', help: `${F} te tire en arrière : la lame fend l’air.` }),
  mash: (C, F, P) => ({ pre: `${C} t’attrape le poignet. Ses ongles s’enfoncent dans ta peau.${F ? ` ${F} tire avec toi.` : ''}`, go: 'Dégage-toi !', win: F ? 'Vous tirez ensemble : sa main lâche.' : 'Tu t’arraches à sa prise.', lose: 'Sa main ne te lâche pas.', help: `${F} lui tord le bras : sa main lâche.` }),
  sync: (C, F, P, w) => ({ pre: `${F} croise ton regard. Un signe de tête : à trois, vous ${P.le} poussez ensemble.`, go: 'Pousse !', win: w === 'dehors' ? `Ensemble ! ${C} bascule en arrière contre les poubelles.` : `Ensemble ! ${C} bascule en arrière contre le meuble.`, early: `Trop tôt : tu pousses ${P.seul}, ${P.il} ne bouge pas.`, lose: `Trop tard : ${F} a poussé sans toi.`, help: `${F} pousse pour deux : ${C} bascule.` }),
  still: (C, F, P, w) => (w === 'dehors' // 0.33.6
    ? { pre: F ? `${F} et toi, accroupis derrière une voiture garée. Le lampadaire grésille.` : 'Tu te jettes derrière une voiture garée. Le lampadaire grésille.', go: F ? 'Ne bougez plus.' : 'Ne bouge plus.', mid: pick(['« Je sais que tu es là… »', '« Tu ne peux pas te cacher de moi. »', '« Je t’entends respirer. »']), win: 'Ses pas s’éloignent vers la ruelle.', lose: `Ton pied heurte une canette. ${cap1(P.il)} se retourne.`, help: `${F} lance un caillou plus loin : ${C} se retourne vers le bruit.` }
    : { pre: F ? `La lumière s’éteint. ${F} et toi, accroupis derrière le canapé.` : 'La lumière s’éteint. Tu te plaques derrière le canapé.', go: F ? 'Ne bougez plus.' : 'Ne bouge plus.', mid: pick(['« Je sais que tu es là… »', '« Tu ne peux pas te cacher de moi. »', '« Je t’entends respirer. »']), win: 'Ses pas s’éloignent vers la cuisine.', lose: `Le parquet craque. ${cap1(P.il)} se retourne.`, help: `${F} lance un objet dans le couloir : ${C} se retourne vers le bruit.` }),
};
// 0.33.6: the wheel (« une roue avec une zone et une flèche, il faut appuyer au bon moment »).
QTE_TXT.wheel = (C, F, P, w) => ({ pre: w === 'dehors' ? `${C} lève le couteau sous le lampadaire. Son bras va retomber.` : `${C} lève le couteau. Son bras va retomber.`, go: 'Pare !', win: 'Tu bloques son bras au vol : la lame s’arrête à un souffle de toi.', lose: 'La lame passe : trop tôt, ou trop tard.', help: `${F} attrape son bras au vol.` });
const QTE_DUO = ['sync', 'mash', 'still'], QTE_SOLO = ['mash', 'still', 'dodge2'];
const QTE_BONUS = 0.1; // made at the first try
const QTE_SKIP = 0.3; // let go, after three misses: one gets out of it hurt
const QTE_SKIP_TXT = 'Tu t’en sors, de justesse. Ton bras te lance.';
function attackSteps(C, F, P, w, only = null) {
  const forced = Array.isArray(only) ? only : window.__HYPE_TEST__ && Array.isArray(window.__atkQ) ? window.__atkQ : null; // (the tests: which ones, or none; 0.33.6: the practice fight too)
  const qs = forced || ['dodge'].concat(shuffle(['wheel', pick(F ? QTE_DUO : QTE_SOLO)])); // (0.33.6: the wheel in each fight, and one of the others)
  const out = [];
  (w === 'dehors' ? ATK_BEATS_OUT : ATK_BEATS).forEach((pool, slot) => {
    const q = qs[slot];
    if (q && QTE_TXT[q]) out.push(Object.assign({ k: 'q', q: q === 'dodge2' ? 'dodge' : q, tries: 0, misses: 0, reveal: !out.length }, QTE_TXT[q](C, F, P, w)));
    const b = pick(pool);
    out.push({ k: 'c', slot, text: b.text(C, F, P), opts: shuffle(b.opts(C, F, P).map(([label, v, res], k) => ({ id: 'o' + k, label, v, res }))) });
  });
  return out;
}
// How close they are: the relation, the trust (and a bond, a couple), their help each beat, and what carries the rest.
function plusBond(f) {
  const aff = 0.7 * (f.rel || 0) + 0.3 * trustOf(f);
  const p = clamp(0.2 + (Math.max(0, aff) / 100) * 0.75 + (BOND_VIBES.includes(f.vibe) || PARTNER.includes(f.vibe) ? 0.1 : 0), 0.15, 0.95);
  return { aff: Math.round(aff), p: Math.round(p * 100) / 100, bond: Math.round((Math.max(0, aff - 40) / 60) * 0.8 * 100) / 100 };
}
let ATK_FX = { k: '', n: 0 }; // (the flash on screen: a key changes, it plays again)
function atkFx(k) { ATK_FX = { k, n: ATK_FX.n + 1 }; update(false); }
function atkBuzz(p) { try { if (!window.__HYPE_TEST__ && navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(p); } catch (e) { /* (no vibration here) */ } }
const atkCur = (H) => { const A = H && H.attack; return A && !A.done ? A.steps[A.i] || null : null; };
// They strike. H: where it plays (the evening's talk, or a visit); o.f: the one who came along (none: alone);
// o.where: an evening (date), the night after it (night), at the player's (visit).
function startAttack(g, H, c, text, o = {}, t = Date.now()) {
  if (!g || !H || !c || H.attack) return false;
  const f = o.f || null, w = o.where || 'date', C = firstName(c), F = f ? firstName(f) : null;
  const P = { il: gx(c.g, 'il', 'elle', 'iel'), le: gx(c.g, 'le', 'la', 'le'), assis: gx(c.g, 'assis', 'assise', 'assis·e'), seul: px(g, 'seul', 'seule', 'seul·e') };
  H.attack = Object.assign({ c: c.id, f: f ? f.id : null, where: w, ev: o.ev ? o.ev.id : null, i: 0, steps: attackSteps(C, F, P, w, o.qs || null), at: t, done: false, pl: P }, f ? plusBond(f) : { aff: 0, p: 0, bond: 0 });
  H.lines.push({ who: 'n', atk: 1, text: str(text, 200) || (w === 'night' || w === 'home' ? 'Plus tard, dans la nuit…' : w === 'dehors' ? `${C} surgit de l’ombre.` : `${C} ferme la porte à clé.`) });
  atkBuzz(60);
  return true;
}
// They stayed the night, once the other was ready: one wakes up.
function nightAttack(g, ev, c) {
  const T = ev && ev.talk;
  if (!T) return false;
  T.lines.push({ who: 'n', text: meetKind(c, ev) === 'love' ? FADE_LINE : 'Vous passez la nuit sous le même toit.' });
  return startAttack(g, T, c, 'Plus tard, dans la nuit…', { ev, where: 'night' });
}
function atkNext(g, H) {
  const A = H.attack;
  A.i++;
  if (A.i >= A.steps.length) (H.practice ? duelEnd(g, H) : attackEnd(g, H)); // (0.33.6: a practice fight: nothing in the game)
  update();
  return true;
}
// A choice (null: too late): what it does, and what the friend does.
function attackPick(g, H, id, t = Date.now()) {
  const A = H && H.attack, B = atkCur(H);
  if (!g || !A || !B || B.k !== 'c' || B.pick !== undefined) return false;
  const f = A.f ? g.chars[A.f] : null;
  const ms = B.shownAt ? t - B.shownAt : atkMs() + 1;
  const o = id ? B.opts.find((x) => x.id === id) : null;
  const late = !o || ms > atkMs() + 400;
  B.pick = late ? null : o.id;
  B.ms = ms;
  B.v = late ? 0 : Math.round((o.v + (ms < 2500 ? 0.1 : 0)) * 100) / 100;
  B.help = !!f && atkRoll() < A.p;
  H.lines.push({ who: 'n', atk: 1, text: late ? `Trop tard : tu restes ${px(g, 'figé', 'figée', 'figé·e')} une seconde de trop.` : o.res });
  if (f) H.lines.push({ who: 'n', atk: 1, text: (B.help ? ATK_HELP : ATK_FROZEN)[B.slot || 0](firstName(f), f, A.pl) });
  return atkNext(g, H);
}
// A moment to react: made it (at the first try, it counts a little); missed: the one who came along may catch it,
// otherwise too late (not the end: one goes back just before, a little easier each time; after three, one may let it go).
function qteEnd(g, H, ok, how) {
  const A = H && H.attack, Q = atkCur(H);
  if (!g || !A || !Q || Q.k !== 'q' || Q.dead || Q.ok != null) return false;
  const f = A.f ? g.chars[A.f] : null;
  if (ok) { Q.ok = true; Q.clean = !Q.tries; H.lines.push({ who: 'n', atk: 1, text: Q.win }); atkFx('ok'); atkBuzz(30); return atkNext(g, H); }
  Q.misses = (Q.misses || 0) + 1;
  if (f && Q.help && atkRoll() < A.p * 0.7) { Q.ok = true; Q.caught = true; H.lines.push({ who: 'n', atk: 1, text: Q.help }); atkFx('ok'); return atkNext(g, H); }
  Q.dead = how === 'early' && Q.early ? 'early' : 'late';
  atkFx('hit');
  atkBuzz([200, 80, 200]);
  update();
  return true;
}
function qteRetry(g, H) {
  const Q = atkCur(H);
  if (!Q || Q.k !== 'q' || !Q.dead) return false;
  Q.dead = null;
  Q.tries = (Q.tries || 0) + 1;
  update();
  return true;
}
function qteSkip(g, H) {
  const Q = atkCur(H);
  if (!g || !Q || Q.k !== 'q' || !Q.dead || (Q.misses || 0) < 3) return false;
  Q.dead = null;
  Q.ok = false;
  Q.skip = true;
  H.lines.push({ who: 'n', atk: 1, text: QTE_SKIP_TXT });
  return atkNext(g, H);
}
// The end of it: out alive (they flee; a witness, a proof that weighs), or caught (the end of the game).
function attackScore(A) {
  const ch = A.steps.filter((s) => s.k === 'c'), qs = A.steps.filter((s) => s.k === 'q');
  A.score = Math.round((ch.reduce((s, b) => s + (b.v || 0) + (b.help ? 0.45 : 0), 0) + qs.reduce((s, q) => s + (q.ok && q.clean ? QTE_BONUS : 0) - (q.skip ? QTE_SKIP : 0), 0) + (A.bond || 0)) * 100) / 100;
  A.ok = A.score >= (A.f ? ATTACK_OK : ATTACK_SOLO);
  A.done = true;
  return A.ok;
}
function attackEnd(g, H) {
  const A = H.attack, c = g.chars[A.c], f = A.f ? g.chars[A.f] : null;
  attackScore(A);
  if (!c) return;
  const C = firstName(c), F = f ? firstName(f) : '', w = A.where, revu = px(g, 'revu', 'revue', 'revu·e'), chez = gx(c.g, 'lui', 'elle', 'iel');
  const atHome = w === 'visit' || w === 'home' || w === 'inside', host = H.place && H.place !== 'p' ? g.chars[H.place] : null; // (0.33.5: theirs broken into)
  const there = host ? `Chez ${firstName(host)}` : 'Chez toi', out = w === 'dehors', evA = (g.events || []).find((e) => e.id === A.ev); // (0.33.6: in the street, leaving an evening)
  if (!A.ok) {
    psyKill(g, c, out ? (f ? `Dans la rue, le lampadaire a clignoté jusqu’au matin. Personne ne vous a revus, ${F} et toi.` : `Dans la rue, le lampadaire a clignoté jusqu’au matin. Personne ne t’a ${revu}.`)
      : atHome ? (f ? `${there}, la lumière est restée allumée jusqu’au matin. Personne ne vous a revus, ${F} et toi.` : `${there}, la lumière est restée allumée jusqu’au matin. Personne ne t’a ${revu}.`)
      : f ? `La lumière s’est éteinte. Chez ${C}, la musique a joué jusqu’au matin. Personne ne vous a revus, ${F} et toi.`
        : w === 'night' ? `La lampe de chevet s’est éteinte. Personne ne t’a ${revu}.`
          : `La lumière s’est éteinte. Chez ${C}, la musique a joué jusqu’au matin. Personne ne t’a ${revu}.`, atHome ? 'visit' : 'date');
    return;
  }
  if (atHome) {
    H.lines.push({ who: 'n', atk: 1, text: f ? `${F} et toi ${A.pl.le} repoussez dehors et claquez la porte. Deux tours de clé. ${F} appelle la police, la voix qui tremble.` : `Tu ${A.pl.le} pousses dehors et tu claques la porte. Deux tours de clé. Tu appelles la police, la voix qui tremble.` });
    Object.assign(H, { fled: true, ending: true, mood: 'fache' });
    psyEscape(g, c, 'visit');
  } else if (out) { if (evA && evA.talk === H) ambushOut(g, evA, c, f); } // 0.33.6: the evening with the other ends there (their own, after)
  else {
    const ev = evA;
    if (ev && ev.talk === H) fleeDate(g, ev, c, f ? `${F} et toi dévalez l’escalier sans vous retourner. Dehors, ${F} appelle la police, la voix qui tremble.` : `Tu dévales l’escalier${w === 'night' ? ' pieds nus' : ''} sans te retourner. Dehors, tu appelles la police, la voix qui tremble.`);
  }
  const where = out ? `dans la rue, en sortant de « ${str(evA ? evA.what : 'la soirée', 60)} »` : w === 'visit' ? 'chez toi, en pleine nuit' : atHome ? (host ? `chez ${firstName(host)}` : 'chez toi') + (w === 'home' ? ', en pleine nuit' : '') : `chez ${chez}${w === 'night' ? ', en pleine nuit' : ''}`;
  if (huntOn()) { // 0.33.4: they know now; the police came (the complaint is the player's to file); the couple is over
    startHunt(g, c, 'attack');
    const pa = px(g, 'attaqué', 'attaquée', 'attaqué·e');
    policeCall(g, c, f ? `${C} vous a attaqués ${where}, ${F} et toi : ${F} a appelé la police` : `${C} t’a ${pa} ${where} : tu as appelé la police`, { ev: A.ev, f: f ? f.id : null, why: 'attack', delay: 9000, night: atHome && w !== 'visit' });
    huntEndsCouple(g, c);
    if (f) learnHome(g, c, f, 'les a vus repartir ensemble ce soir-là, et a pris des photos'); // 0.33.5: she saw them leave
  }
  if (!f) { psySign(g, c, `${C} t’a ${px(g, 'attaqué', 'attaquée', 'attaqué·e')} avec un couteau, ${where} : tu t’en es ${px(g, 'sorti', 'sortie', 'sorti·e')} de justesse`, later() + 900, true); return; }
  psySign(g, c, `${F} a tout vu : ${C} vous a attaqués avec un couteau, ${where}`, later() + 900, true); // (a witness: a proof that weighs)
  const again = !!(f.saw && f.saw.psy === c.id); // 0.33.5: once more, together
  applyRel(g, f, again ? 6 : 10, 'vous vous en êtes sortis ensemble', later() + 2400, 12);
  applyTrust(g, f, again ? 10 : 20, again ? 'vous vous en êtes encore sortis ensemble' : 'vous vous êtes sauvé la vie', later() + 2600, { free: true, raw: true }); // (0.33.5: whatever their heart: +20, +10 each time after)
  const n0 = again ? f.saw.n || 1 : 0;
  sawIt(g, f, c, A.ev); // 0.33.3: for life (never pushed out by what comes after), and said in each of their prompts
  f.saw.raw = 1;
  f.saw.n = n0 + 1;
  bumpTie(g, c.id, f.id, -60);
  addTrigger(g, out ? `@${f.handle} et le joueur viennent d’échapper à @${c.handle}, qui les attendait à la sortie de leur soirée et les a attaqués dans la rue : @${f.handle} est sous le choc et en parle au joueur en privé ; @${c.handle} fait comme si de rien n’était.`
    : `@${f.handle} et le joueur viennent de s’enfuir de chez @${c.handle}, qui les a attaqués : @${f.handle} est sous le choc et en parle au joueur en privé ; @${c.handle} fait comme si de rien n’était.`, f.id);
}
// 0.33.6: fought off in the street: the evening is over (its score kept: it went the way it went until then); they ran to
// the avenue, the other one called the police. What comes next is theirs: stay together, or go home.
function ambushOut(g, ev, c, f) {
  const T = ev.talk, A = T.attack, F = f ? firstName(f) : '';
  T.lines.push({ who: 'n', atk: 1, text: f ? `${F} et toi ${A.pl.le} repoussez contre une voiture et courez jusqu’à l’avenue, sans vous retourner. ${F} appelle la police, la voix qui tremble.` : `Tu ${A.pl.le} repousses et tu cours jusqu’à l’avenue sans te retourner. Tu appelles la police, la voix qui tremble.` });
  T.turn = T.max;
  T.fled = true;
  if (!ev.played) finishTalk(g, ev);
  const P = g.psy;
  if (P) P.escaped = (P.escaped || 0) + 1;
  addMem(g, c, `le joueur${f ? ` et @${f.handle}` : ''} m’ont échappé dans la rue : ça ne se terminera pas comme ça`, null, true);
  addChronicle(g, `${g.player.name}${f ? ` et ${f.name}` : ''} ${f ? 'ont' : 'a'} échappé à ${c.name}, qui les attendait à la sortie d’une soirée.`, [c.id].concat(f ? [f.id] : []));
  prepEnd(g, ev);
}
// Left in the middle of it (the screen closed): the seconds ran out (the moments to react, as if they never came).
function attackTimeout(g, H) {
  const A = H && H.attack;
  if (!g || !A || A.done) return false;
  const f = A.f ? g.chars[A.f] : null;
  for (; A.i < A.steps.length; A.i++) {
    const B = A.steps[A.i];
    if (B.k === 'c') { if (B.pick === undefined) Object.assign(B, { pick: null, v: 0, help: !!f && atkRoll() < A.p }); }
    else if (B.ok == null) Object.assign(B, { ok: false, dead: null, left: true });
  }
  attackEnd(g, H);
  return true;
}

/* ---------- on screen ---------- */
// The date's screen: someone with you, or the way to ask.
function PlusBox({ g, ev, now }) {
  if (!t33On() || !ev || ev.state !== 'scheduled' || ev.played || ev.talk) return null;
  const P = ev.plus, f = P && g.chars[P.c];
  if (P && P.ok && f) return html`<p class="date-late plus-on"><${Icon} n="users" s=${15} /> <span>${firstName(f)} vient avec toi.</span> <button class="linkbtn quiet" onClick=${() => { ev.plus = null; update(); }}>Y aller seul${px(g, '', 'e', '·e')}</button></p>`;
  if (P && P.ok == null && f) return html`<p class="date-late"><${Icon} n="users" s=${15} /> <span>Tu as demandé à ${firstName(f)} de venir : en attente de sa réponse.</span> <button class="linkbtn" onClick=${() => openDM(f.id)}>Lui écrire</button></p>`;
  return html`<button class="btn btn-ghost plus-btn" onClick=${() => openLayer({ t: 'plus', id: ev.id })}>👥 Venir avec quelqu’un</button>`;
}
function PlusLayer({ l, g, i }) {
  const ev = (g.events || []).find((e) => e.id === l.id);
  const h = ev && g.chars[ev.c];
  if (!ev || ev.state !== 'scheduled' || !h) return html`<${LayerShell} i=${i} title="Venir avec quelqu’un"><div class="empty"><b>Ce rendez-vous n’est plus prévu.</b></div><//>`;
  const list = mains(g).filter((c) => plusOK(g, c, ev)).sort((a, b) => b.rel - a.rel);
  const pick = (c) => { if (askPlus(g, ev, c)) { closeLayer(); openDM(c.id); update(); } };
  return html`<${LayerShell} i=${i} title=${'Venir avec quelqu’un · ' + firstName(h)}>
    <section class="section">
      <p class="muted">Ta demande est prête dans vos messages : son IA décide. Si c’est oui, la personne est là toute la soirée, et ${firstName(h)} réagit à sa présence.</p>
      ${list.length ? html`<div class="feat-list">${list.map((c) => html`<button type="button" key=${c.id} class="feat-pick" onClick=${() => pick(c)}>
        <${Avatar} who=${author(g, 'c:' + c.id)} size=${40} />
        <span class="mid"><b>${c.name}</b><small>${relShown(c)} · confiance ${trustOf(c)}</small></span>
      </button>`)}</div>` : html`<p class="muted">Personne de disponible pour l’instant.</p>`}
    </section>
  <//>`;
}
// 0.33.6 (« un peu trop de texte »): while the fight plays, of its lines only the last one shows (all of them after).
const atkHide = (H, x, j) => { const A = H && H.attack; if (!A || A.done || !x.atk) return false; let k = -1; H.lines.forEach((y, n) => { if (y.atk) k = n; }); return j !== k; };
// The attack on screen: a few seconds each beat, and between them moments to react (a flash, a heartbeat, no warning).
function AttackView({ g, H }) {
  const A = H && H.attack, B = atkCur(H), f = A && A.f ? g.chars[A.f] : null;
  if (!B) return null;
  return html`<div class="atk-wrap">
    <i key=${'fx' + ATK_FX.n} class=${'atk-fx' + (ATK_FX.k ? ' fx-' + ATK_FX.k : '')} aria-hidden="true"></i>
    ${B.k === 'q' ? html`<${QteView} key=${'q' + A.i + ':' + (B.tries || 0) + (B.dead ? 'x' : '')} g=${g} H=${H} A=${A} Q=${B} f=${f} />` : html`<${BeatView} key=${'b' + A.i} g=${g} H=${H} A=${A} B=${B} f=${f} />`}
  </div>`;
}
const atkTyping = (e) => !!(e.target && e.target.closest && e.target.closest('input, textarea, [contenteditable="true"]'));
const atkCoarse = () => !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
const atkSeen = (el) => { if (el && el.scrollIntoView) try { el.scrollIntoView({ block: 'nearest' }); } catch (e) { /* (old browsers) */ } };
function BeatView({ g, H, A, B, f }) {
  const ref = useRef(null);
  if (!B.readTo) B.readTo = Date.now() + atkRead(B.text); // 0.33.6: read first (once: a redraw keeps it)
  const [rd, setRd] = useState(() => !B.shownAt && Date.now() < B.readTo);
  useEffect(() => { // the reading: by its length; a key (Espace, Entrée) or a tap goes on sooner
    atkSeen(ref.current);
    if (!rd) return undefined;
    const go = () => { if (!B.shownAt) setRd(false); };
    const k = setTimeout(go, Math.max(0, B.readTo - Date.now()));
    const key = (e) => { if (!e.repeat && !atkTyping(e) && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); go(); } };
    window.addEventListener('keydown', key);
    return () => { clearTimeout(k); window.removeEventListener('keydown', key); };
  }, [rd]);
  useEffect(() => { // the moves: the time to choose starts when they are shown
    if (rd || B.pick !== undefined) return undefined;
    atkSeen(ref.current);
    if (!B.shownAt) B.shownAt = Date.now();
    const k = setTimeout(() => attackPick(g, H, null), Math.max(0, B.shownAt + atkMs() - Date.now()) + 50);
    const key = (e) => { const n = Number(e.key); if (!e.repeat && !atkTyping(e) && n >= 1 && n <= B.opts.length) { e.preventDefault(); attackPick(g, H, B.opts[n - 1].id); } }; // (1 to 4: the moves, on a keyboard)
    window.addEventListener('keydown', key);
    return () => { clearTimeout(k); window.removeEventListener('keydown', key); };
  }, [rd]);
  const spent = B.shownAt ? Math.min(atkMs(), Date.now() - B.shownAt) : 0;
  const prev = (H.lines || []).filter((x) => x.atk).slice(-1)[0]; // (what just happened, in a word)
  return html`<div class=${'atk' + (rd ? ' atk-read' : '')} ref=${ref} role="alertdialog" aria-live="assertive" aria-label="Défends-toi">
    <div class="atk-head"><span>⚠️ Défends-toi</span><b>${A.i + 1}/${A.steps.length}</b></div>
    ${rd && prev && A.i > 0 ? html`<p class="atk-prev">${prev.text}</p>` : null}
    <p class="atk-text">${B.text}</p>
    ${rd ? html`<button type="button" class="atk-ready" onClick=${() => { if (!B.shownAt) setRd(false); }}><i class="atk-readbar" style=${`animation-duration:${Math.max(300, B.readTo - Date.now())}ms`} aria-hidden="true"></i><span>${atkCoarse() ? 'Touche pour réagir' : 'Espace pour réagir'}</span></button>`
      : html`<div class="atk-timer" aria-hidden="true"><i style=${`animation-duration:${atkMs()}ms;animation-delay:-${spent}ms`}></i></div>
    <div class="atk-opts">${B.opts.map((o, k) => html`<button type="button" key=${o.id} class="atk-opt" onClick=${() => attackPick(g, H, o.id)}><kbd aria-hidden="true">${k + 1}</kbd>${o.label}</button>`)}</div>`}
    <small class="atk-with">${f ? `${firstName(f)} est avec toi.` : `Tu es ${px(g, 'seul', 'seule', 'seul·e')}.`}</small>
  </div>`;
}
// For one try: the windows (wider when the one who came along is close, and at each new try), where, which key.
function qteTune(A, Q, f) {
  const test = !!window.__HYPE_TEST__, K = (test && window.__qteK) || 1, easy = 1 + Math.min(3, Q.tries || 0) * 0.25, p = f ? A.p || 0 : 0;
  return {
    pre: test && window.__qtePre != null ? window.__qtePre : clamp(600 + 32 * String(Q.pre || '').length, 1300, 3800) + (Q.q === 'dodge' ? 300 + Math.random() * 900 : 0), // (0.33.6: read in time, then it comes, fast)
    win: Math.round((Q.q === 'sync' ? 260 + 240 * p : 1250 * (1 + 0.35 * p)) * easy * K),
    key: pick(['F', 'J', 'K', 'D']),
    x: Math.round(12 + Math.random() * 76), y: Math.round(24 + Math.random() * 52),
    need: Math.max(7, 13 - 2 * (Q.tries || 0)),
    tick: Math.round(p * 0.3 * 100) / 100, // (mash: what the one who came along adds, every quarter of a second)
    dur: Q.q === 'still' ? (test && window.__qteStill) || Math.max(2200, 3600 - 400 * (Q.tries || 0)) : Math.round(3500 * easy * K),
    beat: Math.round(700 * K),
    turn: Math.round(1150 * K), // 0.33.6, the wheel: a turn of the needle; the zone, wider with the one who came along and at each try
    zone: Math.round(Math.min(150, 58 * easy * (1 + 0.35 * p))), z0: Math.round(70 + Math.random() * 200),
  };
}
// The wheel's zone: an arc from a0, w degrees wide (0 at the top, clockwise).
function wheelArc(a0, w) {
  const r = 42, pt = (a) => { const t = ((a - 90) * Math.PI) / 180; return `${(50 + r * Math.cos(t)).toFixed(2)} ${(50 + r * Math.sin(t)).toFixed(2)}`; };
  return html`<svg class="qte-dial" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r=${r} class="qte-track" /><path d=${`M ${pt(a0)} A ${r} ${r} 0 ${w > 180 ? 1 : 0} 1 ${pt(a0 + w)}`} class="qte-zone" /></svg>`;
}
function QteView({ g, H, A, Q, f }) {
  const [ph, setPh] = useState(Q.dead ? 'dead' : 'pre');
  const [n, setN] = useState(0), [cnt, setCnt] = useState(0), [mid, setMid] = useState(false);
  const [T] = useState(() => qteTune(A, Q, f));
  const R = useRef({}), ref = useRef(null);
  const end = (ok, how) => { if (R.current.end) return; R.current.end = true; qteEnd(g, H, ok, how); };
  useEffect(() => { atkSeen(ref.current); }, []);
  useEffect(() => { // read it, then it comes
    if (ph !== 'pre') return undefined;
    const k = setTimeout(() => { R.current.go = Date.now(); Q.goAt = R.current.go; Q.hitAt = Q.q === 'sync' ? R.current.go + 2 * T.beat : null; if (Q.q === 'wheel') Q.wz = { z0: T.z0, zone: T.zone, turn: T.turn }; setPh('go'); atkFx(Q.q === 'still' ? 'dark' : 'go'); atkBuzz(Q.q === 'still' ? 0 : 40); }, T.pre); // (0.33.6: the wheel, as it turns)
    return () => clearTimeout(k);
  }, [ph]);
  useEffect(() => { // act
    if (ph !== 'go') return undefined;
    const go = R.current.go || Date.now(), timers = [];
    let onKey = null, onPtr = null;
    if (Q.q === 'dodge') {
      timers.push(setTimeout(() => end(false), T.win));
      onKey = (e) => { if (e.repeat || atkTyping(e) || !e.key || e.key.length !== 1) return; if (e.key.toUpperCase() === T.key) { e.preventDefault(); end(true); } else if (/[a-z]/i.test(e.key)) end(false); };
    } else if (Q.q === 'mash') {
      R.current.n = 0;
      R.current.tap = (k = 1) => { R.current.n += k; setN(R.current.n); if (R.current.n >= T.need) end(true); };
      if (f && T.tick > 0) timers.push(setInterval(() => R.current.tap(T.tick), 250));
      timers.push(setTimeout(() => end(R.current.n >= T.need), T.dur));
      onKey = (e) => { if (e.repeat || atkTyping(e) || !e.key) return; if (e.key === ' ' || e.key === 'Enter' || e.key.length === 1) { e.preventDefault(); R.current.tap(); } };
    } else if (Q.q === 'sync') {
      setCnt(1);
      timers.push(setTimeout(() => setCnt(2), T.beat), setTimeout(() => setCnt(3), 2 * T.beat), setTimeout(() => end(false), 2 * T.beat + T.win * 1.4 + 30));
      const hit = go + 2 * T.beat;
      R.current.press = () => { const d = Date.now() - hit; if (d < -T.win) end(false, 'early'); else if (d <= T.win * 1.4) end(true); else end(false); };
      onKey = (e) => { if (e.repeat || atkTyping(e)) return; if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); R.current.press(); } };
    } else if (Q.q === 'wheel') { // 0.33.6: a press while the needle is in the zone
      const ang = (at) => (((at - go) / T.turn) * 360) % 360;
      const inZone = (a) => { const d = (a - T.z0 + 360) % 360; return d <= T.zone; };
      const spin = () => { if (R.current.needle) R.current.needle.style.transform = `rotate(${ang(Date.now())}deg)`; R.current.raf = requestAnimationFrame(spin); };
      R.current.raf = requestAnimationFrame(spin);
      timers.push({ raf: 1 });
      R.current.press = () => { const a = ang(Date.now()); Q.pa = Math.round(a); end(inZone(a)); }; // (where the needle was, kept)
      timers.push(setTimeout(() => end(false), Math.round(T.turn * 2.6)));
      onKey = (e) => { if (e.repeat || atkTyping(e)) return; if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); R.current.press(); } };
    } else if (Q.q === 'still') {
      timers.push(setTimeout(() => setMid(true), T.dur / 2), setTimeout(() => end(true), T.dur));
      const moved = (e) => { if (e && e.key && ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return; if (Date.now() - go > 400) end(false); };
      onKey = moved;
      onPtr = moved;
    }
    if (onKey) window.addEventListener('keydown', onKey, true);
    if (onPtr) window.addEventListener('pointerdown', onPtr, true);
    return () => { timers.forEach((k) => { if (k && k.raf) cancelAnimationFrame(R.current.raf); else { clearTimeout(k); clearInterval(k); } }); if (onKey) window.removeEventListener('keydown', onKey, true); if (onPtr) window.removeEventListener('pointerdown', onPtr, true); };
  }, [ph]);
  const F = f ? firstName(f) : '', touch = atkCoarse();
  if (ph === 'dead') return html`<div class="atk atk-dead" ref=${ref} role="alertdialog" aria-live="assertive" aria-label="Trop tard">
    <p class="atk-dead-t">Trop tard.</p>
    <p class="atk-dead-s">${Q.dead === 'early' ? Q.early : Q.lose}</p>
    <p class="atk-dead-n">Ce n’est pas fini : reviens juste avant.</p>
    <div class="atk-dead-b">
      <button type="button" class="btn btn-hot" onClick=${() => qteRetry(g, H)}>↺ Revenir juste avant</button>
      ${(Q.misses || 0) >= 3 ? html`<button type="button" class="btn btn-ghost" onClick=${() => qteSkip(g, H)}>Passer ce moment</button>` : null}
    </div>
  </div>`;
  const hint = ph === 'pre' ? (f ? `${F} est avec toi.` : `Tu es ${px(g, 'seul', 'seule', 'seul·e')}.`)
    : Q.q === 'dodge' ? (touch ? 'Touche la cible !' : `Clique la cible ou appuie sur ${T.key} !`)
      : Q.q === 'mash' ? (touch ? 'Tape, tape, tape !' : 'Clique ou appuie sur Espace, le plus vite possible !')
        : Q.q === 'sync' ? `Pile sur « 3 », en même temps que ${F}${touch ? '' : ' (clic ou Espace)'} !`
          : Q.q === 'wheel' ? (touch ? 'Touche la roue quand la flèche passe dans la zone !' : 'Espace (ou clic) quand la flèche passe dans la zone !')
            : 'Ne touche à rien.';
  const body = ph === 'pre' ? html`<span class="qte-wait" aria-hidden="true"></span>`
    : Q.q === 'dodge' ? html`<p class="qte-go">${Q.go}</p><button type="button" class="qte-target" style=${`left:${T.x}%;top:${T.y}%`} aria-label=${`${Q.go} (${T.key})`} onPointerDown=${(e) => { e.preventDefault(); e.stopPropagation(); end(true); }} onClick=${() => end(true)}><i class="qte-ring" style=${`animation-duration:${T.win}ms`}></i><b>${T.key}</b></button>`
      : Q.q === 'mash' ? html`<button type="button" class="qte-mash" onPointerDown=${(e) => { e.preventDefault(); if (R.current.tap) R.current.tap(); }}><i class="qte-fill" style=${`width:${Math.min(100, Math.round((n / T.need) * 100))}%`}></i><b>${Q.go}</b></button><div class="qte-bar" aria-hidden="true"><i style=${`animation-duration:${T.dur}ms`}></i></div>`
        : Q.q === 'sync' ? html`<p class="qte-count" key=${'n' + cnt}>${cnt >= 3 ? '3 !' : cnt || ''}</p><button type="button" class="qte-push" onPointerDown=${(e) => { e.preventDefault(); if (R.current.press) R.current.press(); }}>${Q.go}</button>`
          : Q.q === 'wheel' ? html`<button type="button" class="qte-wheel" aria-label=${Q.go} onPointerDown=${(e) => { e.preventDefault(); if (R.current.press) R.current.press(); }}>${wheelArc(T.z0, T.zone)}<i class="qte-needle" ref=${(el) => { R.current.needle = el; }} aria-hidden="true"></i><b>${Q.go}</b></button>`
          : html`<div class="qte-still"><i class="qte-hold" style=${`animation-duration:${T.dur}ms`}></i><b>${Q.go}</b>${mid ? html`<p class="qte-whisper">${Q.mid}</p>` : null}</div>`;
  return html`<div class=${'atk atk-q q-' + Q.q + ' ph-' + ph} ref=${ref} role="alertdialog" aria-live="assertive" aria-label=${Q.go}>
    <div class="atk-head"><span>${Q.q === 'still' ? '🤫 Silence' : '⚡ Réagis'}</span><b>${A.i + 1}/${A.steps.length}</b></div>
    <p class=${'atk-text' + (Q.reveal ? ' reveal' : '')}>${Q.pre}</p>
    <div class="qte-arena">${body}</div>
    <small class="atk-with">${hint}</small>
  </div>`;
}

/* ---------- 0.33.6: a fight to practise, from the palette (« tester les combats avec un psychopathe ») ----------
   Somewhere (their place, the player's at night, in the street, someone's by day), alone or with someone of the cast,
   the moments to react chosen or by chance: nothing of it reaches the game (no death, no police, no trust, nobody told). */
const DUEL_WHERE = [['date', 'Chez lui ou chez elle, un soir'], ['home', 'Chez toi, en pleine nuit'], ['dehors', 'Dehors, en sortant d’une soirée'], ['inside', 'Chez quelqu’un, en plein jour']];
const DUEL_Q = [['auto', 'Au hasard (la roue et un autre)'], ['wheel', 'La roue'], ['dodge', 'L’esquive'], ['mash', 'Se dégager'], ['sync', 'Ensemble, à trois'], ['still', 'Le silence'], ['none', 'Aucun : les choix seulement']];
const DUEL_OPEN = { date: (C) => `${C} ferme la porte à clé.`, home: () => 'Un bruit te réveille.', dehors: (C) => `${C} surgit de l’ombre.`, inside: (C) => `${C} est dans l’entrée.` };
function startDuel(g, where = 'date', withId = '', q = 'auto') {
  const f = withId && g.chars[withId] && isMain(g.chars[withId]) && !g.chars[withId].jailed ? g.chars[withId] : null;
  const w = DUEL_WHERE.some((x) => x[0] === where) ? where : 'date', sx = pick(['f', 'm']);
  const foe = { id: '_duel', name: sx === 'f' ? 'L’inconnue' : 'L’inconnu', g: sx }; // (never the game's own: a practice tells nothing)
  const one = q === 'sync' && !f ? 'mash' : q; // (« ensemble » needs someone)
  const qs = q === 'auto' ? null : q === 'none' ? [] : [one, one, one];
  const H = { lines: [], practice: 1, where: w, with: f ? f.id : '', q, at: Date.now() };
  startAttack(g, H, foe, DUEL_OPEN[w](foe.name), { f, where: w, qs });
  H.foe = foe;
  S.duel = H;
  if (!S.stack.some((l) => l.t === 'duel')) openLayer({ t: 'duel' });
  update();
  return H;
}
function duelEnd(g, H) {
  const A = H.attack;
  attackScore(A);
  const f = A.f ? g.chars[A.f] : null;
  H.lines.push({ who: 'n', atk: 1, text: A.ok ? (f ? `${firstName(f)} et toi vous en sortez.` : 'Tu t’en sors.') : 'Tu n’aurais pas survécu.' });
  return A.ok;
}
function DuelLayer({ g, i }) {
  const H = S.duel, A = H && H.attack, f = A && A.f ? g.chars[A.f] : null;
  let body;
  if (!H || !A) body = html`<div class="empty"><b>Pas de combat en cours</b><span>Ouvre le nuancier pour en lancer un.</span></div>`;
  else if (!A.done) {
    const last = H.lines.filter((x) => x.atk).slice(-1);
    body = html`<div class="talk duel atk-on">
      <div class="talk-lines">${last.map((x, j) => html`<p key=${j} class="talk-fade atk-line">${x.text}</p>`)}</div>
      <${AttackView} g=${g} H=${H} />
    </div>`;
  } else {
    const ch = A.steps.filter((s) => s.k === 'c'), qs = A.steps.filter((s) => s.k === 'q'), need = A.f ? ATTACK_OK : ATTACK_SOLO;
    body = html`<div class="mg-intro duel-end">
      <span class="eyebrow">Entraînement · ${(DUEL_WHERE.find((x) => x[0] === H.where) || [0, ''])[1]}</span>
      <h3>${A.ok ? 'Tu t’en sors 🎉' : 'Tu n’aurais pas survécu'}</h3>
      <p class="muted">Score ${String(A.score).replace('.', ',')} (il faut ${String(need).replace('.', ',')}${f ? `, avec ${firstName(f)}` : `, ${px(g, 'seul', 'seule', 'seul·e')}`}) · choix ${ch.filter((b) => (b.v || 0) >= 0.8).length}/${ch.length} bons · réflexes ${qs.filter((q) => q.ok).length}/${qs.length} réussis.</p>
      <p class="muted">Rien ne compte dans ta partie : personne n’en saura rien.</p>
      <div class="row"><button class="btn btn-hot" onClick=${() => startDuel(g, H.where, H.with, H.q)}><${Icon} n="refresh" s=${16} /> Rejouer</button><button class="btn btn-ghost" onClick=${() => { S.duel = null; closeLayer(); }}>Fermer</button></div>
    </div>`;
  }
  return html`<${LayerShell} i=${i} title="🔪 Entraînement au combat">${body}<//>`;
}

/* ---------- 0.33.2: out of it together, the evening goes on with them ---------- */
// Fled together: outside, the two of them; the evening goes on with the one who came along (« ensuite on est ensemble »):
// a few words, the police, the night (not alone). It counts as an evening together, never one a partner is jealous of;
// the evening at theirs ends quietly meanwhile (its recap, and their message, as if nothing happened).
const AFTER_TURNS = 4;
const GESTES_AFTER = [
  { id: 'serrer', emoji: '🫂', label: 'Vous serrer fort', ai: (f) => `serre ${f} très fort dans ses bras`, you: (f) => `Tu serres ${f} très fort dans tes bras.` },
  { id: 'police', emoji: '🚓', label: 'Appeler la police', ai: () => 'appelle la police et raconte tout', you: () => 'Tu appelles la police.' },
  { id: 'marcher', emoji: '🚶', label: 'Marcher, loin de là', ai: () => 'propose de marcher, loin de là', you: () => 'Tu proposes de marcher, loin de là.' },
];
const afterOf = (g, ev) => (ev && ev.after && g.chars[ev.after.psy]) || null; // (the one they fled)
const fledTogether = (g, ev) => { const T = ev && ev.talk, A = T && T.attack; return !!(duelOn() && T && T.fled && A && A.ok && A.f && A.where !== 'visit' && g.chars[A.f] && !g.chars[A.f].jailed); };
function afterTalkLines(g, ev) {
  const x = afterOf(g, ev), f = g.chars[ev.c];
  if (!x || !f) return [];
  const F = firstName(f), X = firstName(x), il = gx(f.g, 'il', 'elle', 'iel'), from = ev.after.out ? (g.events || []).find((e) => e.id === ev.after.from) : null;
  return ['', '## JUSTE AVANT : ILS ONT FUI ENSEMBLE',
    ev.after.out ? `Ce soir, en sortant de « ${str(from ? from.what : 'leur soirée', 80)} », @${x.handle} (${x.name}) les attendait dehors et les a attaqués avec un couteau, le joueur et ${F} : ils se sont défendus ensemble et ont couru jusqu’à l’avenue, ${F} a appelé la police. Les voilà à l’abri, essoufflés, en état de choc : la soirée continue entre eux deux, maintenant.` // 0.33.6
      : `Ce soir, chez @${x.handle} (${x.name}), ${X} les a attaqués avec un couteau, le joueur et ${F} : ils se sont défendus ensemble et se sont enfuis, ${F} a appelé la police. Les voilà dehors, dans la rue, essoufflés, en état de choc : la soirée continue entre eux deux, maintenant.`,
    `${F} est dans un drôle d’état : l’euphorie d’être en vie (des rires nerveux, l’adrénaline, l’envie de serrer le joueur), puis la peur qui revient d’un coup (les mains qui tremblent, un regard vers la porte). ${cap1(il)} réagit selon qui ${il} est et leur relation (${fmtRel(f.rel)}) : la peur, la colère, les larmes, un humour nerveux, l’envie de protéger le joueur, de ne pas le laisser seul. La police peut arriver et prendre leur déposition ; ils peuvent marcher, s’asseoir sur un trottoir, finir chez l’un des deux. ${X} n’est plus là et n’apparaît pas. Rien de gore.`];
}
function afterFlight(g, ev, c, f, t = Date.now()) {
  const old = ev.after2 && (g.events || []).find((e) => e.id === ev.after2);
  if (old) return old;
  const out = !!(ev.talk && ev.talk.attack && ev.talk.attack.where === 'dehors'); // 0.33.6: the evening was with them, in the street after
  const e2 = { id: uid('ev'), kind: 'rdv', c: f.id, what: out ? `Dehors, avec ${firstName(f)}, après l’attaque` : `Dehors, avec ${firstName(f)}, après la soirée chez ${firstName(c)}`, at: t, due: t, state: 'scheduled', src: null, player: true, game: null, played: null, diff: DIFFS[0].id, tries: 0, after: Object.assign({ from: ev.id, psy: c.id }, out ? { out: 1 } : {}), startAt: ev.startAt || ev.due || t };
  e2.talk = { scene: '', lines: [], turn: 0, max: AFTER_TURNS, reacts: [], used: [], at: t, ex: { ix: 0, why: ['🫂 Vous venez de vous en sortir ensemble'], ai: ['ils viennent de s’en sortir ensemble'], pub: false } };
  (g.events || (g.events = [])).push(e2);
  ev.after2 = e2.id;
  return e2;
}
// « Rester avec … »: the evening at theirs ends quietly, the evening with them opens.
function stayAfter(g, ev) {
  const T = ev && ev.talk, c = T && T.attack ? g.chars[T.attack.c] : ev && g.chars[ev.c], f = fledTogether(g, ev) ? g.chars[T.attack.f] : null; // (0.33.6: the one who struck)
  if (!T) return false;
  T.closed = true;
  if (!f || !c) { update(); return false; }
  const e2 = afterFlight(g, ev, c, f);
  dropLayers((l) => l.t === 'minigame' && l.id === ev.id);
  openLayer({ t: 'minigame', id: e2.id });
  endDate(ev, { quiet: true }); // (its recap and their message come meanwhile)
  openAfter(e2);
  update();
  return true;
}
async function openAfter(e2) {
  const g = S.game, f = g && e2 && g.chars[e2.c], T = e2 && e2.talk;
  if (!g || !f || !T || T.scene || T.lines.length || S.busy.talk) return false;
  if (!canAfford(g, 'talk')) { T.scene = `Dehors, ${firstName(f)} et toi, à bout de souffle.`; T.lines.push({ who: 'c', text: 'Ça va ? Dis-moi que ça va…', seen: '' }); budgetBlocked(); update(); return false; }
  S.busy.talk = e2.id;
  update(false);
  const fl = startFlow(g);
  try {
    await aiStream(promptTalk(g, e2, null), (o) => {
      if (o.t === 'scene' && !T.scene) T.scene = str(o.text, 300);
      else if (o.t === 'say' && T.lines.filter((x) => x.who === 'c').length < 2) { const x = str(o.text, 260); if (x) T.lines.push({ who: 'c', text: x, seen: str(o.seen, 70) }); }
      update(false);
    }, { signal: fl.ctl.signal, src: fl.id, kind: 'talk', tier: talkTier(g) });
  } catch (e) { if (!e || e.code !== 'cancelled') reportAiError(e, null, 'date'); }
  S.busy.talk = null;
  endFlow(fl);
  if (!T.scene) T.scene = `Dehors, ${firstName(f)} et toi, à bout de souffle.`;
  if (!T.lines.length) T.lines.push({ who: 'c', text: 'Ça va ? Dis-moi que ça va…', seen: '' });
  update();
  return true;
}

/* ---------- 0.33.3: what they lived through, they do not forget ---------- */
// The one who fled with the player saw it: a memory for life (« … a essayé de nous tuer »), and a line in their prompts.
// (0.33.2's night with them pushed the attack out of their six memories: « je sais pas si elle a essayé de nous tuer ».)
function sawIt(g, f, x, evId, t = Date.now()) {
  if (!f || !x) return;
  const prev = f.saw && f.saw.psy === x.id ? f.saw : null; // (0.33.5: once more: what was kept stays, the days after start again)
  f.saw = Object.assign({}, prev || {}, { psy: x.id, at: (prev && prev.at) || t, last: t, ev: evId || null, trust: 1 });
  delete f.saw.care;
  addMem(g, f, `@${x.handle} a essayé de nous tuer, le joueur et moi, avec un couteau, chez ${gx(x.g, 'lui', 'elle', 'iel')}. On s’en est sortis ensemble`, null, true);
}
function sawLines(g, c) {
  const W = c && c.saw, x = W && g.chars[W.psy];
  if (!W || !x) return [];
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel'), X = firstName(x), d = Math.floor((Date.now() - W.at) / DAY_MS);
  const when = d < 1 ? 'ce jour-là, il y a quelques heures' : d === 1 ? 'hier' : `il y a ${d} jours`;
  const fresh = d < 7;
  return [`CE QUE ${first.toUpperCase()} A VÉCU AVEC LE JOUEUR (${il} ne l’oublie pas, n’en doute pas une seconde) : ${when}, chez @${x.handle}, ${X} a essayé de les tuer, ${gx(c.g, 'lui', 'elle', 'iel')} et le joueur, avec un couteau ; ils se sont défendus et enfuis ensemble, la police a été appelée. ${cap1(il)} en garde la peur, la colère, l’envie de protéger le joueur${x.jailed ? ` ; ${X} a depuis été ${gx(x.g, 'arrêté', 'arrêtée', 'arrêté·e')} : un soulagement` : `, de voir ${X} payer`}.`
    + (fresh ? ` Ces jours-ci, c’est encore à vif : le soulagement fou d’être en vie, presque de l’euphorie, et la peur qui revient par vagues (un bruit, une porte, la nuit, un message de ${X}) ; ${il} prend souvent des nouvelles du joueur, et ça lui fait du bien qu’il en prenne aussi.` : '')
    + ` Ce qu’ils ont traversé les a rapprochés : ${il} lui fait confiance comme à peu de gens.` + (huntOn() ? policeSaw(g, x) : '')]; // (0.33.4: and where the police are)
}
// A game of 0.33.1 or 0.33.2: an attack got out of together, remembered for good (the memory may have been pushed out).
function migrateSaw(g) {
  for (const e of g.events || []) {
    const A = e.talk && e.talk.attack, f = A && A.ok && A.f ? g.chars[A.f] : null, x = A && g.chars[A.c || e.c];
    if (!f || !x || (f.saw && f.saw.psy === x.id)) continue;
    f.saw = { psy: x.id, at: A.at || e.due || Date.now(), ev: e.id, trust: 1 };
    applyTrust(g, f, 17, 'vous vous en êtes sortis ensemble', Date.now(), { free: true }); // (the trust it takes, as now: 8 then, 25 now)
    addMem(g, f, `@${x.handle} a essayé de nous tuer, le joueur et moi, avec un couteau, chez ${gx(x.g, 'lui', 'elle', 'iel')}. On s’en est sortis ensemble`, null, true);
  }
}
