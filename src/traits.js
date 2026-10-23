/* =========================================================
   0.32: who they are, beyond their heart (his wishes of 23 October: « plus d'archétypes », « colérique, paisible »,
   « les versions extrêmes », « certains traits un peu toxiques », « l'inquiet », « qu'il soit d'accord d'être en
   trouple », « une vraie notion du temps »).
   - In a conflict (c.clash): colérique, paisible, rancunier, boudeur, culpabilisant, dramatique.
   - Now and then one of their traits to the extreme (c.extreme: 'coeur' or 'clash'), about one in five.
   - Open (c.ouvert): fine with the player seeing someone else when told, and with a throuple if the other one appeals.
   - The game draws them before the AI writes the character (as it does their age): variety, and the newer hearts come
     too. Their AI plays them; the game only moves a few numbers. Nothing is said on screen: it shows.
   ========================================================= */
const CLASHES = {
  colerique: { w: 1, down: 1.25, up: 1, out: 'colere', label: 'colérique',
    ai: 'colérique : s’emporte vite (mots durs, peut clasher le joueur en public), mais redescend vite et peut s’excuser',
    ext: 'colérique à l’extrême : explose pour un rien et monte dans les tours, même en public, puis regrette parfois après coup ; jamais de haine, jamais de menace' },
  paisible: { w: 1.1, down: 0.7, up: 1.1, out: 'frein', label: 'paisible',
    ai: 'paisible : déteste les conflits ; désamorce, pardonne vite, calme les embrouilles autour de lui ou d’elle' },
  rancunier: { w: 0.9, down: 1.1, up: 1, grudge: true, out: 'colere', label: 'rancunier·ère',
    ai: 'rancunier·ère : n’oublie rien ; une crasse ressort des semaines plus tard, et le pardon se mérite',
    ext: 'rancunier·ère à l’extrême : tient la liste de tous les torts du joueur et la ressort à chaque dispute, des semaines après' },
  boudeur: { w: 0.9, down: 1, up: 0.9, out: 'ghost', label: 'boudeur·se',
    ai: 'boudeur·se : ne crie pas, boude : silences, réponses d’un mot, attend que le joueur fasse le premier pas',
    ext: 'boudeur·se à l’extrême : peut faire la tête des jours entiers, ignore le joueur même en public et attend des excuses en bonne et due forme' },
  culpabilisant: { w: 0.6, down: 1, up: 1, out: 'colere', label: 'culpabilisant·e',
    ai: 'culpabilisant·e : retourne les disputes pour que le joueur se sente coupable (« après tout ce que j’ai fait pour toi »)',
    ext: 'culpabilisant·e à l’extrême : chantage affectif permanent (« si tu tenais vraiment à moi… »), le joueur a toujours tort' },
  dramatique: { w: 0.8, down: 1.1, up: 1, out: 'affiche', label: 'dramatique',
    ai: 'dramatique : fait des scènes ; sous-entendus en public, stories mystérieuses, tout prend des proportions énormes',
    ext: 'dramatique à l’extrême : chaque désaccord devient un feuilleton public (stories en larmes, posts à sous-entendus, mises en scène)' },
};
const CLASH_IDS = Object.keys(CLASHES);
const clashOf = (c) => (c && CLASHES[c.clash] ? c.clash : null);
const normClash = (k) => {
  k = String(k || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return /coler|sanguin|explos|emport|soupe au lait|impetu/.test(k) ? 'colerique' : /paisib|calme|zen|doux|douce|apais|concili|paix/.test(k) ? 'paisible'
    : /rancun|n.oublie|rancoeur/.test(k) ? 'rancunier' : /boud|susceptib|fait la tete/.test(k) ? 'boudeur'
      : /culpabil|chantage|victimis/.test(k) ? 'culpabilisant' : /drama|theatr|scene|excessi/.test(k) ? 'dramatique' : null;
};
// Before 0.32 (or a role from its sheet): from their own words when they say it, otherwise always the same for a handle.
function guessClash(c) {
  const k = normClash([c.personality, c.voice, c.bio].join(' '));
  if (k) return k;
  const bag = ['paisible', 'paisible', 'colerique', 'rancunier', 'boudeur', 'dramatique', 'colerique', 'boudeur', 'culpabilisant'];
  return bag[hashStr((c.handle || c.id || '') + '#clash') % bag.length];
}
// A heart to the extreme (the others have theirs already: a fortress is the cautious one's, a peaceful one the serene's).
const COEUR_EXT = {
  jaloux: 'jaloux·se à l’extrême : possessif·ve maladif·ve, surveille les likes et les abonnements du joueur, fait des scènes pour un rien, pose des ultimatums ; toxique, jamais violent·e',
  impulsif: 'impulsif·ve à l’extrême : tombe amoureux·se en un message, s’enflamme pour tout, change d’avis du jour au lendemain et se lasse en deux jours',
  anxieux: 'anxieux·se à l’extrême : a besoin d’être rassuré·e sans arrêt, envoie des messages en rafale, imagine le pire au moindre silence',
  possessif: 'possessif·ve à l’extrême : contrôlant·e, veut tout savoir (où, avec qui, pourquoi), exige que le joueur coupe les ponts avec certaines personnes, vérifie tout ; toxique, jamais violent·e',
  fusionnel: 'fusionnel·le à l’extrême : parle d’emménager ensemble au bout d’une semaine, de mariage et d’enfants, ne supporte pas une journée sans nouvelles',
  chaudfroid: 'chaud-froid à l’extrême : adorable un jour, glacial·e le lendemain, disparaît des jours entiers puis revient comme si de rien n’était',
  volage: 'volage à l’extrême : flirte avec tout le monde, y compris sous les yeux du joueur, collectionne les conquêtes et s’en vante',
};
// How often each heart comes (the challenges a little less), and who is never open (they cannot share).
const COEUR_W = { serein: 1.1, prudent: 1, anxieux: 0.9, impulsif: 0.9, jaloux: 0.9, forteresse: 0.6, inaccessible: 0.5, fusionnel: 0.8, chaudfroid: 0.8, volage: 0.7, possessif: 0.6, libre: 0.6 };
const NOT_OPEN = ['jaloux', 'possessif', 'fusionnel'];
const OPEN_P = { volage: 0.6, libre: 0.5, impulsif: 0.25, serein: 0.2 }; // (others: 0.12)
const EXT_P = 0.2;
// The game draws them (in the tests, only those that ask for it: the others keep the hearts their AI wrote)
const drawOn = () => t32On() && (!window.__HYPE_TEST__ || !!window.__drawTraits);
const tPick = (list) => { let r = Math.random() * list.reduce((n, x) => n + x[1], 0); for (const x of list) { r -= x[1]; if (r <= 0 && x[1] > 0) return x[0]; } return (list.filter((x) => x[1] > 0).pop() || list[0])[0]; };
// The traits of n newcomers (cast: those already there, so that the same ones do not come back too often).
function drawTraits(n, cast = []) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const all = cast.concat(out), cnt = (f, k) => all.filter((x) => x && x[f] === k).length;
    const fade = (m) => (m >= 2 ? 0.05 : m ? 0.45 : 1);
    const coeur = tPick(Object.keys(COEUR_W).map((k) => [k, COEUR_W[k] * fade(cnt('coeur', k))]));
    const clash = tPick(CLASH_IDS.map((k) => [k, CLASHES[k].w * fade(cnt('clash', k))]));
    let extreme = null;
    if (Math.random() < EXT_P) extreme = COEUR_EXT[coeur] && (Math.random() < 0.6 || !CLASHES[clash].ext) ? 'coeur' : CLASHES[clash].ext ? 'clash' : null;
    const ouvert = !NOT_OPEN.includes(coeur) && Math.random() < (OPEN_P[coeur] || 0.12);
    out.push({ coeur, clash, extreme, ouvert });
  }
  // a real challenge among the first five of a world (a fortress, or someone out of reach), as since 0.11
  if (n >= 5 && !out.slice(0, 5).some((x) => x.coeur === 'forteresse' || x.coeur === 'inaccessible')) {
    const x = out[randi(1, 4)];
    x.coeur = Math.random() < 0.65 ? 'forteresse' : 'inaccessible';
    if (x.extreme === 'coeur') x.extreme = CLASHES[x.clash].ext ? 'clash' : null;
    if (NOT_OPEN.includes(x.coeur)) x.ouvert = false;
  }
  return out;
}
// The ten of a new world: their traits beside their ages (drawCastAges), in the same plans.
function drawCastTraits(plans) {
  const T = drawTraits(plans.length);
  plans.forEach((p, k) => Object.assign(p, T[k]));
  return plans;
}
// Set on the character the AI wrote (its own "coeur" line gives way: the game drew it).
function applyPlanTraits(c, plan) {
  if (!c || !plan) return;
  if (COEURS[plan.coeur]) c.coeur = plan.coeur;
  if (CLASHES[plan.clash]) c.clash = plan.clash;
  if (plan.extreme === 'coeur' && COEUR_EXT[c.coeur]) c.extreme = 'coeur';
  else if (plan.extreme === 'clash' && CLASHES[c.clash] && CLASHES[c.clash].ext) c.extreme = 'clash';
  if (plan.ouvert && !NOT_OPEN.includes(c.coeur)) c.ouvert = true;
  if (c.coeur === 'forteresse') c.garde = 3;
}
// Everyone has a way of fighting (the games of before, the roles); nobody becomes extreme or open overnight.
function ensureTraits(g) {
  for (const c of mains(g, false)) {
    if (!CLASHES[c.clash]) c.clash = guessClash(c);
    if (c.extreme === 'coeur' && !COEUR_EXT[c.coeur]) delete c.extreme;
    if (c.ouvert && NOT_OPEN.includes(c.coeur)) delete c.ouvert;
  }
}
const heartWord = (k) => (k === 'chaudfroid' ? 'chaud-froid' : k);
const planWords = (p) => `cœur ${heartWord(p.coeur)}${p.extreme === 'coeur' ? ' à l’extrême' : ''}, en conflit ${CLASHES[p.clash].label}${p.extreme === 'clash' ? ' à l’extrême' : ''}${p.ouvert ? ', ouvert·e au polyamour' : ''}`;
// What each of these means, said once (only those in the task).
function traitsLegend(plans) {
  const hearts = [...new Set(plans.map((p) => p.coeur))].filter((k) => COEURS[k]);
  const clashes = [...new Set(plans.map((p) => p.clash))].filter((k) => CLASHES[k]);
  const ext = plans.filter((p) => p.extreme).map((p) => (p.extreme === 'coeur' ? COEUR_EXT[p.coeur] : CLASHES[p.clash].ext)).filter(Boolean);
  const L = [`Les cœurs : ${hearts.map((k) => COEURS[k].ai).join(' ; ')}.`, `En conflit : ${clashes.map((k) => CLASHES[k].ai).join(' ; ')}.`];
  if (ext.length) L.push(`À l’extrême : ${[...new Set(ext)].join(' ; ')}.`);
  if (plans.some((p) => p.ouvert)) L.push('Ouvert·e au polyamour : n’est pas exclusif·ve par principe ; accepte que le joueur voie quelqu’un d’autre si c’est dit franchement, et peut accepter un trouple si l’autre lui plaît aussi.');
  return L.join(' ');
}
// The world's ten: imposed, in the order of their lines (with their ages, agesAsk).
const traitsAsk = (plans) => `   - "coeur" (comment il ou elle vit l’amour) et "conflit" (comment il ou elle vit une dispute) sont imposés, dans l’ordre des dix lignes : ${plans.map((p, k) => `${k + 1}) ${planWords(p)}`).join(' ; ')}. Écris-les tels quels dans "coeur" et "conflit" ; bio, personnalité et voix les laissent deviner, sans les dire en toutes lettres. ${traitsLegend(plans)} "ami" = le handle de son ou sa confident·e parmi ces dix personnages.`;
// One newcomer.
const newcomerTraits = (plan) => `Son cœur et son caractère sont imposés : ${planWords(plan)}. ${traitsLegend([plan])} Bio, personnalité et voix les laissent deviner, sans les dire en toutes lettres.`;

/* ---------- in their lines ---------- */
// Private (their messages, an evening, a visit): their way of fighting, a trait to the extreme, open, and the time.
function traitLines(g, c, t = Date.now()) {
  if (!c || !isMain(c)) return [];
  const first = firstName(c), L = [], C = CLASHES[clashOf(c)];
  if (C) L.push(`En conflit, ${first} est ${c.extreme === 'clash' && C.ext ? C.ext : C.ai}.`);
  if (c.extreme === 'coeur' && COEUR_EXT[c.coeur]) L.push(`Son cœur est poussé à l’extrême : ${COEUR_EXT[c.coeur]}.`);
  if (c.ouvert) L.push(openLine(g, c));
  const grudge = c.grudge && t - c.grudge.at < GRUDGE_MS ? c.grudge : null;
  if (grudge) L.push(`${first} n’a pas oublié : « ${grudge.why} » (il y a ${fmtDur(t - grudge.at)}).`);
  const k = knownLine(g, c, t);
  if (k) L.push(k);
  return L;
}
// « Une vraie notion du temps »: how long they have been talking, seen each other, been where they are.
const fmtDays = (ms) => { const d = ms / DAY_MS; return d < 1 ? 'moins d’une journée' : d < 1.5 ? 'un jour' : d < 13.5 ? `${Math.round(d)} jours` : d < 60 ? `${Math.round(d / 7)} semaines` : `${Math.round(d / 30)} mois`; };
function knownLine(g, c, t = Date.now()) {
  const since = c.firstTalk || c.unlockedAt;
  if (!since || t - since < 0) return null;
  const n = c.dates || 0, P = c.pace && c.pace.at && LOVE_STEPS.includes(c.pace.v) && LOVE_ACTIVE.includes(c.vibe) ? c.pace : null;
  const step = P ? `, ${VIBES[P.v].label.toLowerCase()} depuis ${fmtDays(t - P.at)}` : '';
  const first = firstName(c);
  return `Le temps entre eux : ils se parlent depuis ${fmtDays(t - since)} (${n ? `${n} rendez-vous` : 'pas encore vus en vrai'}${step}). Ici, une relation se construit sur des jours et des semaines, pas en quelques heures : ce qui compte, c’est le temps qui passe et la qualité de ce qu’ils vivent, pas la quantité. ${first} le vit à son rythme et ne fait pas comme s’ils se connaissaient depuis toujours. ${rhythmLine(g, c, t)}`;
}
// « Une base de ce qui est normal » (his words), then their own habit: what the player did with them lately, for their
// AI to judge. Far more than the norm may seem intense at first, and becomes their way once it lasts (« l'IA peut s'y
// habituer »); a sudden drop from their habit is what they notice (« si d'un coup le joueur fait moins… »).
const WEEK_MS = 7 * DAY_MS;
function cadence(g, c, t = Date.now()) {
  const since = c.firstTalk || c.unlockedAt || t;
  const mine = ((g.dms[c.id] || {}).msgs || []).filter((m) => m.me && !m.sys).map((m) => m.at || 0);
  const ds = (g.events || []).filter((e) => e.player && e.c === c.id && e.state === 'done').map((e) => (e.played && e.played.at) || e.due || 0);
  const count = (arr, a, b) => arr.filter((x) => x >= a && x < b).length;
  const weeks = clamp(Math.floor((t - WEEK_MS - since) / WEEK_MS), 0, 3); // whole weeks they knew each other before this one
  const from = t - WEEK_MS * (1 + weeks);
  return { dates: count(ds, t - WEEK_MS, t + 1), msgs: count(mine, t - WEEK_MS, t + 1), today: count(mine, t - DAY_MS, t + 1), weeks,
    prevD: weeks ? count(ds, from, t - WEEK_MS) / weeks : null, prevM: weeks ? count(mine, from, t - WEEK_MS) / weeks : null };
}
const aboutN = (x) => (x < 1 ? 'moins d’un' : x < 1.5 ? 'environ un' : `environ ${Math.round(x)}`);
function rhythmLine(g, c, t = Date.now()) {
  const R = cadence(g, c, t), first = firstName(c), together = PARTNER.includes(c.vibe);
  const maxD = together ? 3 : 2, MAX_M = 40; // (the top of what is normal, a week)
  const L = [`Leur rythme ces 7 derniers jours : ${R.dates} rendez-vous, ${R.msgs} message${R.msgs > 1 ? 's' : ''} du joueur (dont ${R.today} aujourd’hui).`,
    `La normale à ce stade : ${together ? 'deux ou trois rendez-vous par semaine' : 'un ou deux rendez-vous par semaine (un seul au tout début)'} et un ou quelques messages par jour.`];
  if (R.weeks) {
    L.push(`Leur habitude, les ${R.weeks > 1 ? R.weeks + ' semaines' : 'semaine'} d’avant : ${aboutN(R.prevD)} rendez-vous et ${aboutN(R.prevM)} message${R.prevM >= 1.5 ? 's' : ''} par semaine.`);
    const lessD = R.prevD >= 1 && R.dates < R.prevD * 0.5, lessM = R.prevM >= 7 && R.msgs < R.prevM * 0.4;
    const le = gx(c.g, 'le', 'la', 'le ou la');
    if (lessD || lessM) L.push(`Cette semaine, le joueur ${lessD && lessM ? `${le} voit et lui écrit` : lessD ? `${le} voit` : 'lui écrit'} nettement moins que d’habitude : ${first} le remarque et commence à trouver ça bizarre (il se passe quelque chose ? il s’est lassé ?), à sa façon et selon son cœur.`);
    else if (R.weeks >= 2 && (R.prevD > maxD || R.prevM > MAX_M)) L.push(`C’est leur rythme depuis des semaines, au-dessus de la normale : ${first} s’y est habitué·e, ce n’est plus intense ni bizarre, c’est leur façon d’être ensemble.`);
  }
  L.push(`Bien plus que la normale, au début, ça peut paraître intense, voire bizarre (avec le temps, on s’y habitue) ; bien moins, ou d’un coup moins qu’à leur habitude, ça peut ressembler à du désintérêt. ${first} le prend selon son cœur (un fusionnel ou un impulsif adore, un prudent trouve ça louche ; un libre ou un volage se fiche du silence, un anxieux s’inquiète vite), sans en faire une règle.`);
  return L.join(' ');
}
// In the public roster: a word (what it means, once, below).
const rosterTrait = (c) => { const C = t32On() && CLASHES[clashOf(c)]; return C ? ` · en conflit : ${C.label}${c.extreme === 'clash' ? ' (à l’extrême)' : ''}` : ''; };
function rosterLegend(cs) {
  const ks = t32On() ? [...new Set(cs.map(clashOf).filter(Boolean))] : [];
  return ks.length ? 'En conflit (sur chaque fiche) : ' + ks.map((k) => CLASHES[k].ai).join(' ; ') + '.' : null;
}

/* ---------- the numbers they move ---------- */
const GRUDGE_MS = 7 * DAY_MS;
// After their heart (heartScale): their way of fighting. A grudge keeps the next good moves small for a week.
function traitScale(c, d, why = '', t = Date.now()) {
  const C = CLASHES[clashOf(c)];
  if (!C || !d || !t32On()) return d;
  let m = d > 0 ? C.up : C.down;
  if (d < 0 && c.extreme === 'clash') m *= 1.15;
  if (d > 0 && C.grudge && c.grudge && t - c.grudge.at < GRUDGE_MS) m *= c.extreme === 'clash' ? 0.45 : 0.6;
  if (d <= -5 && C.grudge) c.grudge = { at: t, why: str(why, 60) || 'ce que le joueur a fait' };
  const v = d * m;
  return v > 0 ? Math.max(1, Math.round(v)) : Math.min(-1, Math.round(v));
}
// When the player keeps pushing after a « no »: how it gets worse, by their way of fighting (null: as before).
const clashOut = (c) => { const C = CLASHES[clashOf(c)]; return C ? C.out : null; };

/* ---------- open: another love, a throuple ---------- */
const isOpen = (c) => !!(c && c.ouvert && !NOT_OPEN.includes(c.coeur));
const troupleOf = (g, a, b) => (g.trouples || []).find((T) => !T.over && T.ok && T.ok[a.id] && T.ok[b.id] && [T.a, T.b].includes(a.id) && [T.a, T.b].includes(b.id)) || null;
// Fine with the player seeing this other one: they said so (an open relationship), or the three of them are together.
const okWith = (g, c, o) => !!(c && o && isOpen(c) && ((c.okWith || []).includes(o.id) || troupleOf(g, c, o)));
function openLine(g, c) {
  const first = firstName(c), others = mains(g).filter((o) => o !== c && LOVE_ACTIVE.includes(o.vibe) && o.vibe !== 'crush');
  const T = others.find((o) => troupleOf(g, c, o));
  if (T) return `${first} est en trouple avec le joueur et @${T.handle} : ils sont ensemble à trois, assumé ; pas de jalousie entre eux (de la complicité, des taquineries), mais ${first} tient à la sincérité.`;
  const ok = others.filter((o) => (c.okWith || []).includes(o.id));
  return `${first} est ouvert·e au polyamour : pas exclusif·ve par principe. Si le joueur voit quelqu’un d’autre et le lui dit franchement, ça ne ${gx(c.g, 'le', 'la', 'le ou la')} dérange pas ; et si l’autre lui plaît aussi, un trouple est possible. Le mensonge et la tromperie cachée, eux, passent mal.${ok.length ? ` ${first} sait et accepte que le joueur voie aussi ${ok.map((o) => '@' + o.handle).join(' et ')}.` : ''}`;
}
// The lines their AI may add in private: they accept the player seeing someone else; they agree to a throuple.
function openOutLines(g, c) {
  if (!isOpen(c) || !LOVE_ACTIVE.includes(c.vibe)) return [];
  const others = mains(g).filter((o) => o !== c && o.unlocked && !o.cut && LOVE_ACTIVE.includes(o.vibe) && o.vibe !== 'crush');
  if (!others.length) return [];
  const first = firstName(c), L = [];
  const notYet = others.filter((o) => !(c.okWith || []).includes(o.id));
  if (notYet.length) L.push(`- Seulement si le joueur vient de dire franchement qu’il voit aussi quelqu’un (${notYet.map((o) => '@' + o.handle).join(', ')}) et que ${first} l’accepte : {"t":"ouvert","with":"handle"}.`);
  const tr = others.filter((o) => isOpen(o) && !troupleOf(g, c, o));
  if (tr.length) L.push(`- Seulement si ${first} accepte pour de bon de former un trouple avec le joueur et ${tr.map((o) => '@' + o.handle).join(' ou ')} (à trois, ensemble ; il faudra aussi le oui de l’autre) : {"t":"trouple","with":"handle"}.`);
  return L;
}
function applyOpenLine(g, c, o) {
  if (!isOpen(c) || (o.t !== 'ouvert' && o.t !== 'trouple')) return false;
  const x = charByHandle(g, normHandle(o.with));
  if (!x || x === c || !LOVE_ACTIVE.includes(x.vibe)) return true;
  if (o.t === 'ouvert') {
    if (!(c.okWith || []).includes(x.id)) { c.okWith = (c.okWith || []).concat(x.id).slice(-4); addMem(g, c, `je sais que le joueur voit aussi ${x.name}, et ça me va`); }
    return true;
  }
  if (!isOpen(x)) return true;
  if (!Array.isArray(g.trouples)) g.trouples = [];
  let T = g.trouples.find((y) => !y.over && [y.a, y.b].includes(c.id) && [y.a, y.b].includes(x.id));
  if (!T) { T = { id: uid('tr'), a: c.id, b: x.id, at: Date.now(), ok: {} }; g.trouples.push(T); }
  if (T.ok[c.id]) return true;
  T.ok[c.id] = Date.now();
  c.okWith = [...new Set((c.okWith || []).concat(x.id))].slice(-4);
  if (T.ok[x.id]) troupleFormed(g, T, c, x);
  else { addMem(g, c, `je suis partant·e pour un trouple avec le joueur et ${x.name}`); addTrigger(g, `@${c.handle} est partant·e pour un trouple avec le joueur et @${x.handle} : il reste à savoir si @${x.handle} le veut aussi (le joueur peut lui en parler).`, c.id); }
  return true;
}
function troupleFormed(g, T, a, b) {
  T.formed = Date.now();
  const at = later() + 1500;
  for (const [x, y] of [[a, b], [b, a]]) addMem(g, x, `on forme un trouple, le joueur, ${y.name} et moi`);
  bumpTie(g, a.id, b.id, 12);
  addNotif(g, { k: 'vibe', c: a.id, at, text: `💞 Toi, ${a.name} et ${b.name} : vous formez un trouple.` });
  addChronicle(g, `${g.player.name}, ${a.name} et ${b.name} forment un trouple.`, [a.id, b.id], true);
  addTrigger(g, `Le joueur, @${a.handle} et @${b.handle} forment désormais un trouple : à eux trois de décider s’ils l’affichent ; entre ${firstName(a)} et ${firstName(b)}, de la complicité, pas de jalousie.`, a.id);
}

/* ---------- the worrier: something happens to the player, they rush ---------- */
const WORRY_MS = 10 * 3600000;
const worriers = (g) => mains(g).filter((c) => temperOf(c) === 'inquiet' && !c.cut && !c.jailed && c.rel >= -10);
// Something happened to the player (a scandal, a stolen photo, a betrayal, a break-up…): the worriers are told.
function worry(g, why, t = Date.now()) {
  if (!t32On()) return false;
  const W = worriers(g);
  if (!W.length || !why) return false;
  if (g.worry && t - g.worry.at < 2 * 3600000 && g.worry.why === str(why, 80)) return false;
  g.worry = { at: t, why: str(why, 80), n: {} };
  addTrigger(g, `Il vient d’arriver quelque chose au joueur (${str(why, 80)}) : ${W.map((c) => '@' + c.handle).join(' et ')}, ${W.length > 1 ? 'qui s’inquiètent' : 'qui s’inquiète'} pour tout et rien, ${W.length > 1 ? 'lui écrivent' : 'lui écrit'} en privé plusieurs messages d’affilée (deux ou trois lignes "dm" de suite, inquiètes, un peu trop) et ${W.length > 1 ? 'peuvent' : 'peut'} même débarquer chez lui pour vérifier que tout va bien.`, W[0].id);
  return true;
}
// Their burst of messages goes past the usual limit, while the worry is fresh (three each at most).
function worryDM(g, by, t = Date.now()) {
  const W = g.worry;
  if (!W || t - W.at > WORRY_MS) return false;
  const c = charByHandle(g, normHandle(by));
  if (!c || temperOf(c) !== 'inquiet') return false;
  W.n = W.n || {};
  if ((W.n[c.id] || 0) >= 3) return false;
  W.n[c.id] = (W.n[c.id] || 0) + 1;
  return true;
}
const worryFresh = (g, t = Date.now()) => !!(g && g.worry && t - g.worry.at < WORRY_MS);
