/* =========================================================
   0.29: the roles every game has.
   - The critic: a creator who reviews the network, harder on the player than anyone. Every misstep is theirs to point
     out (they start the dramas), a real success gets a grudging nod. Their AI decides when: a video of theirs is one of
     their posts, with its title and its tone.
   - Rebecca Silver, the same name in every world: she writes fanfictions about the people of the network (the player
     and the cast, or two of them), melodramatic, a little cringe, never explicit. The ones she pairs react; the player
     may answer in a video. She is a character like the others (she can be loved, she can be the one).
   - The psychopath: drawn in secret among the cast, the first follower included. They want to be everything to the
     player: a seducer who overdoes it, or the friend who never lets go. Red flags slip into what they write (noted in
     the player's file on them); the first evenings at their place are only strange. After a week, once enough signs
     showed, an evening alone with them, a door opened at night, a night together may be the last: the game saved just
     before (a date, a visit), and a death ends the game on a screen that offers the saves. Unmasked in public with the
     right clues, they fall, and the player rises; calling someone else a danger is defamation.
   ========================================================= */
const ROLE_TPL = {
  critique: {
    name: 'Le Démineur', handle: 'le.demineur', emoji: '🧨', g: 'm', age: 31, followers: 420000, rel: -8, garde: 3, mefiance: 'a vu trop de créateurs mentir à leur public',
    role: 'Critique de créateurs, vidéaste',
    bio: 'je dis tout haut ce que vos créateurs préférés font tout bas. une vidéo par semaine, aucun cadeau.',
    personality: 'exigeant, cinglant et drôle, redouté pour ses vidéos de critique ; guette chaque faux pas des créateurs (ceux du joueur en premier) et lance les dramas, mais reconnaît une vraie réussite, à contrecœur ; démonte aussi les arnaques des marques',
    voice: 'ironique et précis, phrases-chocs, « bon. on va en parler. »',
    temper: 'integre', temperWhy: 'ne laisse rien passer, même à ceux qu’il aime bien',
  },
  fanfic: {
    name: 'Rebecca Silver', handle: 'rebeccasilver', emoji: '💌', g: 'f', age: 25, followers: 23000, rel: 8, garde: 1, mefiance: 'croit à l’amour comme on croit au destin',
    role: 'Autrice de fanfictions',
    bio: 'j’écris vos histoires d’amour avant que vous les viviez ✍️💘 (toute ressemblance est volontaire)',
    personality: 'romantique incurable et drama queen : voit des couples partout, surtout là où il n’y en a pas ; écrit des fanfictions enflammées et gênantes sur les gens du réseau ; adorable, sincère, persuadée d’avoir du flair',
    voice: 'lyrique et théâtrale, points de suspension, majuscules d’émotion, des cœurs',
    temper: 'fidele', temperWhy: 'reste du côté de ses « personnages » quoi qu’il arrive', coeur: 'impulsif',
  },
};
const ROLE_ASKS = 2; // an old game: the refreshes that may bring them in, before the game does it itself
const FIC_GAP = 18 * HR, CRIT_GAP = 20 * HR; // (game time) between two fanfictions, two critic videos
const rolesOf = (g) => g.roles || (g.roles = {});
const plainOf = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const roleKey = (o) => { const k = plainOf(o && o.fixe); return /crit/.test(k) ? 'critique' : /fanf|fic|rebecca/.test(k) ? 'fanfic' : ''; };
const roleChar = (g, k, unlockedOnly = true) => (g && g.order ? g.order.map((id) => g.chars[id]).find((c) => c && c.fixed === k && (!unlockedOnly || c.unlocked)) || null : null);
const criticOf = (g) => { const c = roleChar(g, 'critique'); return c && !c.cut && !c.jailed ? c : null; };
const rebeccaOf = (g) => { const c = roleChar(g, 'fanfic'); return c && !c.cut && !c.jailed ? c : null; };
// Who exposes the brands' scams: the critic of this world, or the one of before (« Le Démineur », a figure of the public).
function criticAcct(g) {
  const c = criticOf(g);
  return c ? { by: c.handle, name: c.name } : CRITIC;
}
// A role line from the AI (a new world, or an old one that did not have them), or the role's own sheet.
function addRoleChar(g, o, k, tpl = false) {
  const T = ROLE_TPL[k];
  if (!T || roleChar(g, k, false)) return null;
  const x = Object.assign({}, tpl ? T : {}, o || {});
  if (k === 'fanfic') Object.assign(x, { name: T.name, handle: T.handle, g: 'f' }); // the same name in every world
  for (const f of ['name', 'role', 'bio', 'personality', 'voice']) if (str(x[f], 200).length < 3) x[f] = T[f];
  if (!str(x.handle, 30)) x.handle = T.handle;
  const age = Math.min(60, num(x.age, 0) >= 18 ? num(x.age, 0) : T.age + randi(-3, 5));
  let c = addCharFromAI(g, x, { unlocked: true, kind: 'main', rename: true, age: { age } });
  if (!c) { // the same name already there (the AI wrote her among the others): that one plays the role
    const nm = String(x.name).toLowerCase();
    c = Object.values(g.chars).find((y) => y && isMain(y) && !y.fixed && y.name.toLowerCase() === nm) || null;
    if (!c) return null;
    if (!c.unlocked) { c.unlocked = true; c.unlockedAt = Date.now(); }
  }
  c.fixed = k;
  if (typeof c.dates !== 'number') c.dates = 0;
  if (o && o.face) assignFace(g, c, String(o.face));
  return c;
}
// Someone of a role joins a game already under way.
function roleArrives(g, c) {
  initTies(g);
  assignFace(g, c);
  addNotif(g, { k: 'new', c: c.id, text: `${c.name} débarque dans ton monde${c.role ? ' : ' + c.role.toLowerCase() : ''}` });
  addChronicle(g, `${c.name} (@${c.handle}) vient d’arriver dans le monde.`);
}
// fresh: a world just written (what the AI forgot comes from the sheets at once); otherwise an old game: its next
// refreshes are asked first. And the psychopath, drawn once.
function ensureRoles(g, fresh = false) {
  if (!g || !g.chars || !g.order) return;
  const R = rolesOf(g);
  for (const k of Object.keys(ROLE_TPL)) {
    if (roleChar(g, k, false) || (!fresh && (R.ask || 0) < ROLE_ASKS)) continue;
    const c = addRoleChar(g, {}, k, true);
    if (c && !fresh) roleArrives(g, c);
  }
  if (!g.psy) drawPsy(g);
}
// An old game: the refresh brings them in, in the words of its world.
function roleAskLines(g) {
  const miss = Object.keys(ROLE_TPL).filter((k) => !roleChar(g, k, false));
  if (!miss.length || g.pendingCast) return [];
  const R = rolesOf(g);
  R.ask = (R.ask || 0) + 1;
  const F = '"emoji":"…","g":"f","age":30,"role":"≤ 40 caractères","bio":"≤ 110 caractères","personality":"≤ 160 caractères","voice":"≤ 90 caractères","followers":30000,"rel":0';
  return ['- D’ABORD, avant tout post : ' + (miss.length > 1 ? 'deux personnages arrivent' : 'un personnage arrive') + ' dans ce monde, une ligne chacun :',
    ...miss.map((k) => (k === 'critique'
      ? `  {"t":"char","fixe":"critique","name":"…","handle":"…",${F}} : LE CRITIQUE du réseau, adapté à ce monde : un·e créateur·rice qui fait des vidéos de critique (analyses, réactions, « ce qui ne va pas avec… »), redouté·e et très suivi·e, plus dur·e que personne avec le joueur (chacun de ses faux pas, c’est lui ou elle qui le relève et lance le drama), qui reconnaît pourtant une vraie réussite, à contrecœur.`
      : `  {"t":"char","fixe":"fanfic","name":"Rebecca Silver","handle":"rebeccasilver",${F.replace('"g":"f",', '')}} : REBECCA SILVER (toujours ce nom), autrice de fanfictions sur les gens du réseau : romantique incurable et drama queen, ses histoires mélodramatiques et un peu gênantes mettent en couple le joueur et des personnages, ou des personnages entre eux. Adapte son rôle et sa bio à ce monde.`)),
    '  Puis un premier post de chacun, dans sa voix.'];
}

/* ---------- the roles, as the AI reads them ---------- */
function roleTag(c) {
  if (!c) return '';
  if (c.gone) return ' · PORTÉ·E DISPARU·E (personne ne sait ce qui lui est arrivé) : ne poste plus, ne répond plus'; // 0.33.1
  if (c.jailed) return ' · DÉMASQUÉ·E ET ARRÊTÉ·E (obsédé·e par le joueur, dangereux·se) : ne poste plus, ne répond plus';
  if (c.fixed === 'critique') return ' · RÔLE : le critique du réseau, le plus dur avec le joueur (relève chacun de ses faux pas et lance les dramas ; reconnaît une vraie réussite, à contrecœur)';
  if (c.fixed === 'fanfic') return ' · RÔLE : écrit des fanfictions mélodramatiques sur les gens du réseau';
  return '';
}
// What the two roles may do in this answer (each when their time has come). act: the reactions to a post of the player.
function roleLines(g, act = false) {
  const t = Date.now(), R = rolesOf(g), L = [];
  const cr = criticOf(g), rb = rebeccaOf(g);
  if (cr && t - (R.critAt || 0) >= CRIT_GAP) {
    L.push(`- Facultatif, pas à chaque fois (au plus 1) : le critique @${cr.handle} sort une vidéo : un de ses posts, avec "critique":{"title":"≤ 70 caractères : le titre de sa vidéo","tone":"dur","about":"handle visé"} (tone parmi dur, mitige, respect ; about = le joueur ou un personnage). Sur le joueur : ${act ? 'seulement si ce post est un vrai faux pas (malaise, mensonge, mauvaise foi, placement douteux, excuses bidon, méchanceté gratuite) ou une vraie réussite, qu’il ou elle reconnaît à contrecœur (respect)' : 'quand il a fait un vrai faux pas ces derniers temps (dur ou mitige), ou une vraie réussite (respect, à contrecœur)'} ; sinon sur un autre créateur du réseau, et c’est un drama entre eux.`);
  }
  if (rb && t - (R.ficAt || 0) >= FIC_GAP) {
    L.push(`- Facultatif, de temps en temps (au plus 1) : @${rb.handle} publie une fanfiction : un de ses posts (son annonce, théâtrale), avec "fanfic":{"title":"≤ 60 caractères","a":"handle","b":"handle","tags":"≤ 50 caractères (ex : ennemis devenus amants, slow burn)","bit":"≤ 260 caractères : un extrait"} ; a et b = le couple de l’histoire : le joueur et un personnage, ou deux personnages (deux ennemis jurés, deux personnes qui s’ignorent, quelqu’un d’hétéro dans une romance gay…). L’humour vient de l’absurde du couple et du style mélodramatique, jamais de l’orientation de qui que ce soit. Pudique : au plus un baiser, puis la scène coupe (« … et la lune détourna les yeux »). Les concernés réagissent en réponse (gêne, fou rire, flattés, furieux).`);
  }
  return L;
}

/* ---------- their posts: a fanfiction, a critic video ---------- */
const CRIT_TONES = {
  dur: { label: 'Critique', ai: 'dure' },
  mitige: { label: 'Avis mitigé', ai: 'mitigée' },
  respect: { label: 'Respect', ai: 'élogieuse, à contrecœur' },
};
const normTone = (t) => { t = plainOf(t); return /resp|eloge|bravo|positi|chapeau/.test(t) ? 'respect' : /miti|nuanc|mixte|moyen/.test(t) ? 'mitige' : 'dur'; };
// A post of theirs: what it carries (called once the post exists, wherever it came from).
function decoratePost(g, p, o) {
  if (!g || !p || !o || !p.a) return p;
  decorateSocial(g, p, o); // (a dig without a name, a soft launch, a poll: anyone's)
  if (!p.a.startsWith('c:')) return p;
  const c = g.chars[p.a.slice(2)];
  if (!c) return p;
  if (o.fanfic && c.fixed === 'fanfic') addFic(g, p, c, o.fanfic);
  else if (o.critique && c.fixed === 'critique') addCrit(g, p, c, o.critique);
  return p;
}
function roleWho(g, h) {
  const x = normHandle(h);
  if (!x) return null;
  if (x === g.player.handle) return 'p';
  const y = charByHandle(g, x);
  return y && y.unlocked && isMain(y) && !y.jailed ? 'c:' + y.id : null;
}
const whoName = (g, a) => (a === 'p' ? g.player.name : g.chars[a.slice(2)] ? g.chars[a.slice(2)].name : '');
// A post of theirs, as the AI reads the feed.
function roleCtxOf(g, p) {
  const h = (a) => (a === 'p' ? 'le joueur' : '@' + author(g, a).handle);
  if (p.fic) return ` [fanfiction « ${str(p.fic.title, 50)} » : ${h(p.fic.a)} × ${h(p.fic.b)}]`;
  if (p.crit) return ` [vidéo de critique « ${str(p.crit.title, 50)} » sur ${h(p.crit.about)}, ${CRIT_TONES[p.crit.tone] ? CRIT_TONES[p.crit.tone].ai : 'dure'}]`;
  return socialPostCtx(g, p);
}
function addFic(g, p, c, f) {
  const R = rolesOf(g), t = Date.now();
  if (!f || typeof f !== 'object' || p.fic || t - (R.ficAt || 0) < FIC_GAP) return null;
  const a = roleWho(g, f.a), b = roleWho(g, f.b), title = str(f.title, 70);
  if (!a || !b || a === b || !title) return null;
  p.fic = { title, a, b, tags: str(f.tags, 60), bit: str(f.bit, 300) };
  R.ficAt = t;
  const first = firstName(c), pair = `${whoName(g, a)} × ${whoName(g, b)}`;
  const other = [a, b].filter((x) => x !== 'p' && x !== 'c:' + c.id).map((x) => g.chars[x.slice(2)])[0] || null;
  if (a === 'p' || b === 'p') {
    const with_ = [a, b].find((x) => x !== 'p');
    addNotif(g, { k: 'fanfic', c: c.id, p: p.id, at: p.at, text: `📖 ${first} a écrit une fanfiction sur toi et ${with_ === 'c:' + c.id ? gx(c.g, 'lui', 'elle', 'iel') : whoName(g, with_)} : « ${title} »` });
  }
  addTrigger(g, `@${c.handle} vient de publier une fanfiction, « ${title} » (${pair}) : les concernés réagissent (gêne, fou rire, flattés, furieux), les fans shippent, certains en redemandent.`, other ? other.id : null);
  return p.fic;
}
function addCrit(g, p, c, o) {
  const R = rolesOf(g), t = Date.now();
  if (!o || typeof o !== 'object' || p.crit || t - (R.critAt || 0) < CRIT_GAP) return null;
  const title = str(o.title, 80);
  if (!title) return null;
  const about = roleWho(g, o.about) || 'p', tone = normTone(o.tone);
  p.crit = { title, tone, about: about === 'c:' + c.id ? 'p' : about, mins: randi(9, 34) };
  R.critAt = t;
  if (p.crit.about === 'p') critHits(g, c, p);
  else {
    const x = g.chars[p.crit.about.slice(2)];
    applyTieLine(g, { a: c.handle, b: x.handle, d: tone === 'respect' ? 5 : -8, why: `sa vidéo « ${str(title, 40)} »` });
    addTrigger(g, `@${c.handle} vient de sortir une vidéo de critique sur @${x.handle} : « ${title} » (${CRIT_TONES[tone].ai}). @${x.handle} réagit forcément, le réseau prend parti.`, x.id);
  }
  return p.crit;
}
// A video on the player: how it lands (a big critic on a small account weighs more).
function critHits(g, c, p) {
  const s = g.stats, tone = p.crit.tone, first = firstName(c), at = Math.max(later(), p.at) + 1500;
  const k = clamp(Math.sqrt(Math.max(1, c.followers) / Math.max(1000, s.followers)), 0.5, 2);
  let text;
  if (tone === 'respect') {
    const fol = grow(s.followers, Math.round(Math.max(15, c.followers * 0.004 * rand(0.7, 1.3))));
    if (fol > 0) { s.followers += fol; checkMilestones(g); }
    const dr = repMove(g, { cred: 3 * k, image: 2 * k }, `${first} reconnaît ton travail`);
    text = `🎬 ${c.name} parle de toi dans sa vidéo « ${p.crit.title} »… et reconnaît ton travail, à contrecœur (${[fol > 0 ? nAbonnes(fol, true) : '', repBit(dr)].filter(Boolean).join(', ') || 'le réseau en parle'}).`;
  } else {
    const loss = tone === 'dur' ? Math.min(s.followers, Math.round(s.followers * 0.012 * k * rand(0.6, 1.2))) : 0;
    if (loss) s.followers -= loss;
    const dr = repMove(g, tone === 'dur' ? { image: -3 * k, cred: -2 * k } : { image: -1 * k }, `la vidéo de ${first} sur toi`);
    text = `🎬 ${c.name} a sorti une vidéo sur toi : « ${p.crit.title} »${tone === 'mitige' ? ', un avis mitigé' : ''} (${[loss ? nAbonnes(-loss, true) : '', repBit(dr)].filter(Boolean).join(', ') || 'le réseau en parle'}).`;
  }
  addNotif(g, { k: 'crit', c: c.id, p: p.id, at, text });
  addTrigger(g, `@${c.handle} vient de sortir une vidéo de critique sur le joueur : « ${p.crit.title} » (${CRIT_TONES[tone].ai}). Le réseau en parle : certains en rajoutent, d’autres défendent le joueur.`, c.id);
  addChronicle(g, `${c.name} a sorti une vidéo de critique sur ${g.player.name} : « ${p.crit.title} ».`);
}
// The lines of the roles in an answer (a refresh, an act): a role arriving, a sign of the psychopath.
// Not deferred, a role's line: their first post may come right after it in the same answer.
function applyRoleLine(g, o, effects) {
  if (o.t === 'char' && roleKey(o)) {
    const c = addRoleChar(g, o, roleKey(o));
    if (c) roleArrives(g, c);
    return true;
  }
  if (o.t === 'psy') {
    const c = charByHandle(g, normHandle(o.by)), text = o.text, at = later() + 2500;
    effects.push(() => psySign(g, c, text, at));
    return true;
  }
  return applyStalkLine(g, o, effects); // 0.32: the ones who follow the player
}

/* =========================================================
   The psychopath
   ========================================================= */
const PSY_HOLD_DAYS = 3, PSY_DANGER_DAYS = 7; // (game days since they were drawn: never the first week)
const PSY_HOLD_SIGNS = 2, PSY_DANGER_SIGNS = 4; // the signs that showed first
const PSY_CLUES = 10;
const PSY_ALONE_RE = /chez (?:moi|toi|lui|elle|eux|nous|vous|l’un|l'un)|à la maison|appart|studio|plaid|canap|soirée pyjama|dîner maison|cuisiner ensemble|en tête-à-tête chez|chalet|cabane|maison de campagne|for[êe]t|\bbois\b|bord du lac|\blac\b|plage déserte|parking|entrep[ôo]t|\bcave\b|sous-sol|grenier|sur le toit|\btoit\b|en voiture|dans sa voiture|atelier/i;
const PSY_TALK = /psychopath|psycho\b|tueu[rs]|tueuse|meurtr|assassin|dangereu|danger public|harc[eè]l|stalk|traqu|obs[ée]d|obsession|menac|couteau|s[ée]questr|kidnapp|enl[eè]v|violen/i;
const isPsy = (g, c) => !!(g && g.psy && c && g.psy.c === c.id && !g.psy.out);
// The psychopath while still a danger (present, not unmasked, the game not over).
function psyNow(g) {
  const P = g && g.psy;
  if (!P || P.out || g.over) return null;
  const c = g.chars[P.c];
  return c && c.unlocked && !c.jailed ? c : null;
}
function drawPsy(g, t = Date.now()) {
  if (!g || g.psy) return g ? g.psy : null;
  if (window.__HYPE_TEST__ && window.__psyNone) return null;
  const pool = mains(g).filter((c) => !c.jailed && !isStalker(g, c));
  if (!pool.length) return null;
  const want = window.__HYPE_TEST__ && window.__psyPick ? charByHandle(g, window.__psyPick) : null;
  const c = want && pool.includes(want) ? want : pick(pool);
  g.psy = { c: c.id, at: t, stage: 0, signs: 0 };
  return g.psy;
}
// 0 all seems perfect, 1 the first signals, 2 the hold (their place, strange), 3 ready: a night alone may be the last.
function psyStage(g, t = Date.now()) {
  const P = g && g.psy;
  if (!psyNow(g)) return -1;
  const days = (t - P.at) / DAY_MS, n = P.signs || 0;
  const s = days >= PSY_DANGER_DAYS && n >= PSY_DANGER_SIGNS ? 3 : days >= PSY_HOLD_DAYS && n >= PSY_HOLD_SIGNS ? 2 : days >= 1 ? 1 : 0;
  if (s > (P.stage || 0)) P.stage = s; // (what they became stays)
  return Math.max(s, P.stage || 0);
}
// A red flag the player could notice: noted in their file on them (a clue to cite), counted.
function psySign(g, c, text, at, force) {
  const P = g && g.psy;
  if (!P || P.out || !c || c.id !== P.c) return stalkSign(g, c, text, at); // (0.32: or a sign of one who follows the player)
  text = str(text, 130);
  if (text.length < 4) return null;
  P.signs = (P.signs || 0) + 1;
  P.signAt = Date.now();
  if (!Array.isArray(g.clues)) g.clues = [];
  const mine = g.clues.filter((k) => k.c === c.id && k.psy);
  let k = null;
  if ((force || mine.length < PSY_CLUES) && !mine.some((x) => x.text === text || (!force && similar(x.text, text)))) { // (0.33.1 force: what they did, always noted)
    const t = at || later();
    k = tag({ id: uid('k'), c: c.id, text, ts: t, at: t, psy: 1 });
    g.clues.push(k);
    addNotif(g, { k: 'clue', c: c.id, at: t, text: `Indice noté sur ${c.name} : ${text}` });
  }
  psyStage(g);
  return k || true;
}
const PSY_SIGNS = 'il ou elle sait des choses que le joueur ne lui a jamais dites, répond à 3 h du matin à la seconde, insiste quand le joueur ne répond pas (« ?? », « tu es où »), est jaloux·se de tous ceux qui l’approchent, « passe » devant chez lui, a des photos de lui qu’il n’a jamais postées, parle de leur avenir comme d’une évidence';
const PSY_HOME = 'un sourire figé qui dure beaucoup trop longtemps, un couteau toujours posé à portée de main (« pour les fruits »), des photos du joueur au mur, une porte fermée à clé dont il ou elle ne parle jamais, une deuxième brosse à dents « pour toi », une playlist faite de leurs conversations, des fleurs fanées gardées « depuis ton premier message »';
// 0.33.1: what they say goes further too, stage after stage: from a possessive lover to someone who frightens (« je
// pensais au tueur, mais je pensais aussi juste à une personne possessive »).
const PSY_CREEP = {
  2: 'Ses phrases aussi deviennent bizarres, de plus en plus au fil d’une conversation : il ou elle parle du joueur comme d’un acquis (« quand tu habiteras ici », « nos affaires »), laisse échapper ce qu’il a fait hier soir sans qu’il l’ait raconté, plaisante sur le fait qu’il ne pourrait pas partir (« tu ne m’échapperas pas, hein ? »), avec un rire qui dure trop',
  3: 'Plus de doute pour qui écoute, et ça monte au fil d’une conversation : des phrases qui glacent (« ici, personne ne nous dérangera », « j’ai tout prévu pour nous deux », « la dernière personne qui a voulu me quitter l’a regretté », « tu n’auras plus besoin de ton téléphone »), un calme qui fait peur, des choses qu’on ne peut plus prendre pour de la jalousie. Jamais d’aveu, jamais de violence montrée, rien de gore',
};
const PSY_STAGES = [
  'tout semble parfait : charmant·e, attentionné·e, toujours là… à peine trop. Pas encore de vrai signe (au plus un, minuscule)',
  'les premiers signaux, discrets : ' + PSY_SIGNS,
  'l’emprise : il ou elle veut isoler le joueur (glisse du mal de ses proches, se vexe quand il voit d’autres gens) et l’attirer chez lui ou elle. Chez lui ou elle, des détails de film d’horreur (' + PSY_HOME + ') : la soirée est étrange, mais il ne lui arrive rien. ' + PSY_CREEP[2],
  'il ou elle est prêt·e à passer à l’acte : il ou elle veut le joueur seul, la nuit (chez lui ou elle, ou en débarquant chez le joueur), et le propose avec une douceur insistante ; rien n’arrive sans que le joueur accepte. ' + PSY_CREEP[3],
];
// How they want the player: a seducer who overdoes it, or the friend who never lets go (the bond says it).
function psyMode(g, c) {
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel');
  const seduce = `${first} drague le joueur beaucoup trop, et beaucoup trop vite : ${il} veut tout faire pour lui plaire. Compliments en boucle, mots doux dès le deuxième message, cadeaux trop chers, photos envoyées sans raison (« tu en penses quoi ? », dans une tenue bien trop légère) ; en vrai, des tenues trop sexy pour l’occasion, décrites en mots (une robe de chambre en soie à peine nouée pour « juste un café », une chemise ouverte jusqu’au nombril « parce qu’il fait chaud ») ; ${il} se colle, effleure, chuchote, veut aller très vite (rester dormir dès le premier soir) et insiste quand le joueur freine. Séduction appuyée et sensuelle, mais rien d’explicite : ni nudité ni acte sexuel décrits ; si ça va plus loin, la scène coupe.`;
  const friend = `${first} veut être son ou sa meilleur·e ami·e, seul·e et unique : toujours là, vexé·e quand il ne répond pas dans la minute, jaloux·se de ses autres amis et de ses amours, qui sait tout de sa journée sans qu’il l’ait racontée, qui veut des tenues assorties et des photos d’eux partout.`;
  if (LOVE_ACTIVE.includes(c.vibe)) return seduce;
  if (BOND_VIBES.includes(c.vibe)) return friend;
  return `S’${il} peut plaire au joueur (d’après ce que le joueur montre : qui il drague, à qui il répond), c’est la drague. ${seduce} Sinon, c’est l’ami·e qui ne lâche plus : ${friend}`;
}
// The secret, for a call where they speak to the player (their DMs, an evening, a visit).
function psyCore(g, c) {
  const st = Math.max(0, psyStage(g)), first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel');
  return ['', `## SECRET DU JEU : ${first.toUpperCase()} EST LE PSYCHOPATHE DE CETTE PARTIE`,
    `Personne ne le sait : ni le joueur, ni les autres personnages. ${first} ne l’avoue jamais et ne se trahit jamais d’un coup : tout passe par des détails et des phrases de plus en plus inquiétantes à mesure que ça avance, comme dans un film d’horreur (jamais de menace en toutes lettres avant de passer à l’acte). Rien de gore.`,
    `Ce qu’${il} veut : devenir tout pour le joueur, à n’importe quel prix. ${psyMode(g, c)}`,
    `Où ${il} en est : ${PSY_STAGES[st]}.`];
}
const PSY_SIGN_LINE = '- Facultatif (au plus 1) : si tu glisses un détail inquiétant (naturellement, jamais souligné ni expliqué), ajoute {"t":"psy","text":"≤ 90 caractères : ce que le joueur a pu remarquer, factuel (ex : « connaît le nom de ta sœur alors que tu ne l’as jamais dit »)"}.';
// 0.33.1: the signs noted go further with the stage: past jealousy, then frightening.
const PSY_SIGN_DEEP = {
  2: ' À ce stade, un détail qui met vraiment mal à l’aise, au-delà de la jalousie (ex : « un carnet avec tes horaires de la semaine », « une photo de toi prise de nuit, devant chez toi »).',
  3: ' À ce stade, un détail qui fait peur, qu’on ne peut plus prendre pour de la possessivité (ex : « une coupure de presse sur un ex porté disparu, dans son tiroir », « un couteau caché sous le coussin du canapé », « du ruban adhésif et une corde dans le placard de l’entrée »), sans rien de gore.',
};
const psySignLine = (g) => PSY_SIGN_LINE + (PSY_SIGN_DEEP[Math.max(0, psyStage(g))] || '');
// Their private messages.
function psyDMCtx(g, c) { return psyNow(g) && isPsy(g, c) ? psyCore(g, c) : stalkCore(g, c); } // (0.32: or one who follows the player)
const psyOutLine = (g, c) => (psyNow(g) && isPsy(g, c) ? psySignLine(g) : isStalker(g, c) ? STALK_SIGN_LINE : null);
// The refreshes and the reactions: the secret, in a line (their public face, their DMs written there).
function psyPublicLines(g) {
  const c = psyNow(g), st = c ? psyStage(g) : -1;
  if (!c || st < 1) return stalkPublicLines(g); // (0.32: the ones who follow the player)
  const first = firstName(c);
  return stalkPublicLines(g).concat([`- SECRET DU JEU (toi seul le sais : aucun personnage ne le sait ni ne le soupçonne, personne n’en parle) : @${c.handle} est le psychopathe de cette partie, obsédé·e par le joueur. En public, ${first} reste crédible ; dans ses messages privés au joueur (lignes dm), ${PSY_STAGES[st]}. Facultatif, rarement : un détail un peu trop intense de ${first} en public (un like à la seconde sur chaque post du joueur, une réponse qui en sait trop, une photo prise près de chez lui) ; si tu en glisses un, ajoute {"t":"psy","by":"${c.handle}","text":"≤ 90 caractères : ce que le joueur a pu remarquer"}.`]);
}

/* ---------- an evening with them, a visit of theirs ---------- */
const nightAt = (t) => { const h = gameDate(t).getHours(); return h >= 22 || h < 6; };
// The evening alone with them, once they are ready: the deadly one (decided as it opens, the game saved just before).
// 0.33.1: alone with them, said as the place says it (« chez Zara », « chez @pseudo », a closed place: as meetPlace reads it)
const psyAlone = (g, ev) => PSY_ALONE_RE.test(ev.what || '') || ['home', 'shut'].includes(meetPlace(g, ev));
const psyDeadlyDate = (g, ev) => { const c = g.chars[ev.c]; return isPsy(g, c) && psyStage(g) >= 3 && psyAlone(g, ev); };
const PSY_ESCAPE = (first, il, home) => `Le joueur peut encore s’en sortir : s’il se méfie vraiment et agit (${home ? 'mettre ' + first + ' dehors et fermer à clé, s’enfermer dans une pièce, appeler quelqu’un, s’enfuir par l’escalier' : 's’enfuir, inventer une excuse crédible et partir pour de bon, appeler quelqu’un, refuser ce qu’' + il + ' lui sert, ne pas entrer dans la pièce fermée'}), il s’échappe de justesse : ajoute alors {"t":"escape","text":"≤ 160 caractères : comment il s’en sort"}. Une simple gêne ou un « je vais y aller » poli ne suffit pas : ${first} le retient, avec douceur.`;
const PSY_FIN = (first) => `{"t":"fin","text":"≤ 200 caractères : la dernière image, pudique (une lumière qui s’éteint, une porte qui se referme, une playlist qui continue), sans rien de gore, à la deuxième personne"}`;
function psyTalkCtx(g, ev, c) {
  if (!psyNow(g) || !isPsy(g, c)) return stalkCore(g, c); // (0.32: or one who follows the player)
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel'), lui = gx(c.g, 'lui', 'elle', 'iel');
  const L = psyCore(g, c);
  const f = plusOf(g, ev); // 0.33.1: someone came with the player
  if (ev.psy === 'deadly' && f) L.push(`## CE SOIR, LE JOUEUR N’EST PAS VENU SEUL : @${f.handle} (${f.name}) EST LÀ`, `${first} ne s’y attendait pas. ${cap1(il)} veut le joueur seul : ${il} essaie de les séparer (envoyer @${f.handle} chercher quelque chose, ${gx(f.g, 'l’', 'l’', 'l’')}éloigner, ${gx(f.g, 'le', 'la', 'le ou la')} pousser à partir), sourit trop, se crispe quand ${firstName(f)} parle. Le joueur et ${firstName(f)} peuvent encore partir à temps ; s’${il} passe à l’acte, c’est contre eux deux.`);
  else if (f && psyStage(g) >= 1) L.push(`Ce soir, le joueur n’est pas venu seul : @${f.handle} est là. ${first} reste ${gx(c.g, 'charmant', 'charmante', 'charmant·e')} en façade, mais sa jalousie envers ${firstName(f)} affleure (un regard, une pique, un silence de trop).`);
  const T = ev.talk, n = T ? T.turn || 0 : 0, max = T ? T.max || TALK_TURNS : TALK_TURNS; // 0.33.1: where the evening is: it goes further, line after line
  if (ev.psy === 'deadly') {
    L.push(`## CE SOIR, ${first.toUpperCase()} PASSE À L’ACTE (le joueur ne le sait pas)`,
      `La soirée vire lentement au cauchemar, comme dans un film d’horreur : d’abord trop parfaite, puis de plus en plus inquiétante (une porte qu’${il} ferme à clé derrière eux, un couteau qui change de place, des photos du joueur partout, ${il} répond à des questions que le joueur n’a pas posées…). La peur passe par les détails, les silences, les regards, et par ce qu’${il} dit.`,
      `Où en est la soirée : réplique ${Math.min(n + 1, max)} sur ${max}. ${n < 1 ? `Encore trop parfaite, avec un premier détail qui cloche, et une phrase de ${first} un peu trop intense.` : n < 3 ? `Ça monte : ses phrases deviennent franchement bizarres (${PSY_CREEP[2].split(' : ')[1] || 'des phrases qui dérangent'}).` : `Plus aucun doute pour qui écoute : ${first} dit des choses qui glacent (« ici, personne ne nous dérangera », « tu n’as plus besoin de ton téléphone », « j’ai tout prévu pour nous deux »), et ce que le joueur voit fait peur. Sans aveu, sans violence montrée.`}`,
      PSY_ESCAPE(first, il, false));
  } else if (psyAlone(g, ev) && psyStage(g) >= 2 && !f) { // (0.29.1: from the hold on, not before: the first days, all seems perfect; 0.33.1: alone)
    L.push(`Ce soir, ils sont seuls (« ${ev.what} ») : glisse un ou deux détails de film d’horreur dans la scène ou dans ce que le joueur voit (${PSY_HOME}), et des phrases de ${first} de plus en plus étranges au fil de la soirée (réplique ${Math.min(n + 1, max)} sur ${max}). La soirée est étrange, mais il ne lui arrive rien ce soir.`);
  } else if (psyStage(g) >= 3) L.push(`Vers la fin de la soirée, ${first} propose, l’air de rien, de la finir chez ${lui} ou de rester dormir ensemble. Une ou deux de ses phrases glacent, même ici.`);
  if (ev.talk && ev.talk.ell) L.push(`Plus haut, la scène a coupé sur un moment intime entre eux : rien ne s’en raconte ; la soirée continue un peu plus tard, et ${first} est encore plus collant·e.`);
  return L;
}
// The lines they may add tonight. last: the end of the evening (their last words).
function psyTalkOut(g, ev, c, last) {
  if (!psyNow(g) || !isPsy(g, c)) return isStalker(g, c) ? [STALK_SIGN_LINE] : [];
  const L = [psySignLine(g)];
  const f = plusOf(g, ev), atk = `{"t":"attaque","text":"≤ 160 caractères : ce que ${firstName(c)} fait, au présent, sans rien de gore"}`;
  if (ev.psy === 'deadly' && (f || duelOn())) { // 0.33.1: the strike is a scene the game plays (they defend themselves, two of them or alone)
    L.push(f ? `- Seulement si le joueur s’échappe vraiment avec ${firstName(f)} : {"t":"escape","text":"≤ 160 caractères"} (voir plus haut).` : '- Seulement si le joueur s’échappe vraiment : {"t":"escape","text":"≤ 160 caractères"} (voir plus haut).');
    L.push(last ? `- C’est la fin de la soirée : si le joueur ne s’est pas échappé, ${firstName(c)} passe à l’acte : sa dernière réplique, puis ${atk}.`
      : `- Seulement si ${firstName(c)} passe à l’acte maintenant (le joueur se laisse isoler, suit ${firstName(c)} dans la pièce fermée, boit ce qu’on lui tend…) : sa dernière réplique, puis ${atk}.`);
    return L;
  }
  if (ev.psy === 'deadly') {
    L.push('- Seulement si le joueur s’échappe vraiment : {"t":"escape","text":"≤ 160 caractères"} (voir plus haut).');
    if (last) L.push(`- C’est la fin de la soirée : si le joueur ne s’est pas échappé, ${firstName(c)} referme le piège : sa dernière réplique, puis ${PSY_FIN(firstName(c))}.`);
    else L.push(`- Seulement si le joueur se jette dans la gueule du loup (il le ou la suit dans la pièce fermée, boit ce qu’on lui tend alors que tout l’alertait…) : ${PSY_FIN(firstName(c))}.`);
  }
  return L;
}
// The end of the evening, once it is over: they fled.
function psyEndLines(g, ev) {
  const c = g.chars[ev.c];
  if (!ev.fled || !c) return [];
  const first = firstName(c), A = ev.talk && ev.talk.attack, f = A && A.ok && A.f ? g.chars[A.f] : null;
  if (A && A.ok && !f) return [`${first} a attaqué le joueur avec un couteau${A.where === 'night' ? ', en pleine nuit, pendant qu’il dormait' : ''} : seul, il s’est défendu et s’est enfui de justesse, puis a appelé la police. Le récit le dit sobrement, sans rien de gore. Puis ${first} lui écrit comme si de rien n’était, d’une douceur glaçante (pas de menace franche).`]; // 0.33.1: alone
  if (f) return [`${first} les a attaqués, le joueur et @${f.handle}, avec un couteau : ils se sont défendus ensemble et se sont enfuis, ${firstName(f)} a appelé la police. Le récit le dit sobrement, sans rien de gore. Puis ${first} écrit au joueur comme si de rien n’était, d’une douceur glaçante (pas de menace franche).`]; // 0.33.1
  return [`Le joueur s’est enfui en pleine soirée, terrifié par ce qu’il a vu chez ${first} : le récit le dit sobrement. Puis ${first} lui écrit comme si de rien n’était, d’une douceur glaçante (pas de menace franche).`];
}
// A visit: at night, once they are ready, opening the door may be the last thing the player does.
const psyDeadlyVisit = (g, c, at) => isPsy(g, c) && psyStage(g) >= 3 && nightAt(at);
function psyVisitCtx(g, v, c) {
  if (!psyNow(g) || !isPsy(g, c)) return stalkCore(g, c).concat(stalkerOf(g, c) && nightAt(v.at) ? [`${firstName(c)} « passait dans le coin », tard : un peu trop de hasard, un regard qui en sait trop sur la maison du joueur ; inoffensif ce soir.`] : []);
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel');
  const L = psyCore(g, c);
  if (v.psy === 'deadly') L.push(`## CETTE NUIT, ${first.toUpperCase()} PASSE À L’ACTE (le joueur ne le sait pas)`,
    `${first} a frappé chez le joueur en pleine nuit, et le joueur a ouvert. Tout est doux, trop doux : ${il} entre, regarde partout, ferme derrière ${gx(c.g, 'lui', 'elle', 'iel')}, sourit sans arrêt. La peur monte par les détails, jamais par la violence montrée.`,
    PSY_ESCAPE(first, il, true));
  else if (nightAt(v.at) && psyStage(g) >= 2) L.push(`${first} débarque tard le soir sans vraie raison : un sourire trop grand, un regard par-dessus l’épaule du joueur, l’envie d’entrer « deux minutes ». Étrange, mais il ne lui arrive rien cette fois.`);
  return L;
}
function psyVisitOut(g, v, c, last) {
  if (!psyNow(g) || !isPsy(g, c)) return isStalker(g, c) ? [STALK_SIGN_LINE] : [];
  const L = [psySignLine(g)];
  if (v.psy === 'deadly') {
    L.push('- Seulement si le joueur s’échappe vraiment : {"t":"escape","text":"≤ 160 caractères"} (voir plus haut). Alors, pas de ligne leave.');
    if (last) L.push(`- C’est la fin de la visite : si le joueur ne s’est pas échappé, pas de ligne leave : la dernière réplique de ${firstName(c)}, puis ${duelOn() ? `{"t":"attaque","text":"≤ 160 caractères : ce que ${firstName(c)} fait, au présent, sans rien de gore"}` : PSY_FIN(firstName(c))}.`);
  }
  return L;
}

/* ---------- the end of the game, and the way back ---------- */
const PSY_ENDS = {
  date: (g, c) => `La porte s’est refermée derrière toi. Chez ${firstName(c)}, la musique a joué jusqu’au matin. Personne ne t’a ${px(g, 'revu', 'revue', 'revu·e')}.`,
  visit: (g, c) => `Tu as ouvert. ${firstName(c)} souriait. Le lendemain, ton téléphone sonnait encore dans l’appartement vide.`,
};
function psyKill(g, c, text, where = 'date') {
  if (!g || g.over || !c) return null;
  const P = g.psy;
  g.over = { k: 'psy', c: c.id, at: Date.now(), where, text: str(text, 260) || (PSY_ENDS[where] || PSY_ENDS.date)(g, c) };
  if (P) P.killedAt = Date.now();
  S.modals = [];
  dropLayers(() => true);
  if (S.game === g) saveNow();
  update();
  return g.over;
}
// They got away (a date, a visit): alive, and with something to say about it.
function psyEscape(g, c, where = 'date') {
  const P = g.psy;
  if (!P || !c) return;
  P.escaped = (P.escaped || 0) + 1;
  const first = firstName(c);
  psySign(g, c, where === 'visit' ? `${first} est ${gx(c.g, 'entré', 'entrée', 'entré·e')} chez toi en pleine nuit : tu as dû ${gx(c.g, 'le', 'la', 'le ou la')} mettre dehors` : `chez ${first}, la soirée a tourné au cauchemar : tu t’es ${px(g, 'enfui', 'enfuie', 'enfui·e')}`, later() + 600); // (what happened, as the file keeps it)
  addMem(g, c, where === 'visit' ? `le joueur m’a ${gx(c.g, 'mis', 'mise', 'mis·e')} dehors cette nuit-là : ${px(g, 'il', 'elle', 'iel')} ne m’échappera pas longtemps` : `le joueur s’est ${px(g, 'enfui', 'enfuie', 'enfui·e')} de chez moi : ${px(g, 'il', 'elle', 'iel')} reviendra`);
  addChronicle(g, `${g.player.name} s’est ${px(g, 'enfui', 'enfuie', 'enfui·e')} ${where === 'visit' ? `quand ${c.name} est ${gx(c.g, 'entré', 'entrée', 'entré·e')} chez ${px(g, 'lui', 'elle', 'iel')} en pleine nuit` : `de chez ${c.name}, en pleine nuit`}.`, [c.id]);
}
// Their date: the evening ended with the escape (the end of the date says so).
function fleeDate(g, ev, c, text) {
  const T = ev.talk;
  T.lines.push({ who: 'n', text: str(text, 200) || 'Tu attrapes ta veste et tu files sans te retourner.' });
  T.turn = T.max;
  T.fled = true;
  ev.fled = true;
  finishTalk(g, ev);
  ev.played.score = Math.min(ev.played.score, 0.15);
  ev.played.tier = tierOf(ev.played.score);
  psyEscape(g, c, 'date');
  prepEnd(g, ev);
}
// A call-out of them, for the reactions: the truth the AI judges with. A danger named on someone else: defamation.
function psyAccuseLines(g, c, text, clues) {
  const said = [text].concat(clues || []).join(' ');
  if (isPsy(g, c) && psyNow(g)) {
    return [`La vérité, que personne ne sait : @${c.handle} est réellement dangereux·se, le psychopathe de cette partie, obsédé·e par le joueur. Si l’accusation parle de ce danger (obsession, harcèlement, menaces, comportement inquiétant, psychopathe) et s’appuie sur des indices précis, elle touche juste : credibility 8 à 10 et exposed = true. Les réactions : le choc, des gens qui avaient remarqué des choses, la police qui s’en mêle, les médias qui s’emparent de l’affaire ; @${c.handle} nie avec un calme glaçant.`];
  }
  const sl = stalkAccuseLines(g, c); // 0.32: one who follows the player: the truth, whatever the words
  if (sl) return sl;
  if (PSY_TALK.test(said)) return [`La vérité : @${c.handle} n’est PAS dangereux·se. L’accuser d’être un psychopathe, un harceleur ou un danger public, c’est de la diffamation grave : credibility 0 à 2, sauf preuves accablantes (il n’y en a pas). @${c.handle} est choqué·e et parle de porter plainte.`];
  return [];
}
// After the call-out (the AI judged it): unmasked, or defamation. true: the call-out was about this, nothing else to do.
function psyAccusation(ctx) {
  const g = ctx.g, c = ctx.accuse, cred = ctx.post && ctx.post.res ? ctx.post.res.cred : 0;
  if (!c || ctx.fake) return false;
  const cited = (g.clues || []).filter((k) => (ctx.citedIds || []).includes(k.id));
  const said = [ctx.post.text].concat(cited.map((k) => k.text)).join(' ');
  if (isPsy(g, c) && psyNow(g)) {
    if (cred >= 7 && (PSY_TALK.test(said) || cited.some((k) => k.psy))) { psyUnmask(g, c); return true; }
    if (PSY_TALK.test(said)) { // they know the player suspects them now
      addTrigger(g, `@${c.handle} sait maintenant que le joueur se méfie : ${gx(c.g, 'il', 'elle', 'iel')} lui écrit en privé, faussement ${gx(c.g, 'blessé', 'blessée', 'blessé·e')}, d’une douceur glaçante.`, c.id);
      addMem(g, c, `le joueur m’a ${gx(c.g, 'accusé', 'accusée', 'accusé·e')} en public : ${px(g, 'il', 'elle', 'iel')} n’a rien compris, je vais lui montrer`);
    }
    return false;
  }
  const sa = stalkAccusation(g, c, cred, said, cited); // 0.32: one who follows the player: unmasked, or a call-out as any other (never defamation)
  if (sa) return sa === 'unmasked';
  if (PSY_TALK.test(said) && cred < 4) { // calling someone else a danger
    const at = later() + 1600, il = gx(c.g, 'il', 'elle', 'iel');
    const dr = repMove(g, { cred: -8, kind: -6 }, `tu as traité ${c.name} de danger public sans preuve`);
    charge(g, 1500, `Avocat : plainte de ${c.name} pour diffamation`);
    applyRel(g, c, -20, 'tu l’as fait passer pour un danger public', at, 25);
    addNotif(g, { k: 'screen', c: c.id, at, text: `⚖️ ${c.name} porte plainte pour diffamation : tu l’as fait passer pour un danger public sans rien de solide${repBit(dr, ' (', ')')}. L’avocat te coûte 1 500 €.` });
    addTrigger(g, `Le joueur a accusé @${c.handle} d’être dangereux·se sans aucune preuve : ${il} porte plainte pour diffamation, la commu recadre durement le joueur.`, c.id);
  }
  return false;
}
// Unmasked: they fall, the player rises (the whole network talks about it).
function psyUnmask(g, c) {
  const P = g.psy, s = g.stats, at = later() + 1200, first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel');
  P.out = 'unmasked';
  P.outAt = Date.now();
  c.jailed = Date.now();
  c.cut = true;
  const fol = grow(s.followers, Math.round(Math.max(3000, s.followers * 0.3) * rand(0.85, 1.2)));
  if (fol > 0) { s.followers += fol; checkMilestones(g); }
  const dr = repMove(g, { cred: 14, image: 10, kind: 6 }, `tu as démasqué ${c.name}`);
  gainXP(g, 150);
  const md = medias(g);
  if (md[0]) addAmbientPost(g, { by: md[0].handle, text: `🚨 AFFAIRE @${c.handle} : ${il} est en garde à vue. Obsession, mensonges, des dizaines de photos… C’est @${g.player.handle} qui a tout révélé. On vous raconte tout.` }, at + 3000, at + 3000);
  addNotif(g, { k: 'viral', c: c.id, at, text: `🚨 Tu as démasqué ${c.name} : ${il} est ${gx(c.g, 'arrêté', 'arrêtée', 'arrêté·e')}. Tout le réseau en parle (${[nAbonnes(fol, true), repBit(dr)].filter(Boolean).join(', ')}).` });
  addChronicle(g, `${g.player.name} a démasqué ${c.name} en public : ${il} était obsédé·e par ${g.player.name} et dangereux·se. La police l’a ${gx(c.g, 'arrêté', 'arrêtée', 'arrêté·e')}.`, null);
  addTrigger(g, `@${c.handle} vient d’être démasqué·e par le joueur (obsédé·e par lui, dangereux·se) et arrêté·e : tout le réseau en parle. Le choc, le soutien au joueur, ceux qui avaient remarqué des choses, ceux qui aimaient bien ${first} et tombent des nues.`);
  queueModalFor(g, { t: 'psyout', charId: c.id, fol, at });
  return true;
}
// The clock: the stage follows the days and the signs (the AI writes the signs, the game only counts).
function tickRoles(g, t = Date.now()) {
  if (!g || g.over) return false;
  const R = rolesOf(g);
  if (!g.pendingCast && (R.ask || 0) >= ROLE_ASKS && Object.keys(ROLE_TPL).some((k) => !roleChar(g, k, false))) { ensureRoles(g); return true; }
  if (!g.psy && !g.pendingCast && mains(g).length) { drawPsy(g, t); return false; }
  psyStage(g, t);
  return false;
}

/* ---------- on screen ---------- */
function FicCard({ g, p }) {
  const F = p.fic, mine = F.a === 'p' || F.b === 'p';
  const go = (e) => { e.stopPropagation(); openCompose({ text: `Je réagis en vidéo à la fanfiction de @${author(g, p.a).handle} sur nous, « ${F.title} »… ` }); };
  return html`<div class="fic-card">
    <span class="fic-kicker"><${Icon} n="book" s=${13} /> Fanfiction</span>
    <b class="fic-title">${F.title}</b>
    <span class="fic-ship">${whoName(g, F.a)} <i>×</i> ${whoName(g, F.b)}</span>
    ${F.tags ? html`<span class="fic-tags">${F.tags}</span>` : null}
    ${F.bit ? html`<p class="fic-bit">« ${F.bit} »</p>` : null}
    ${mine ? html`<button class="btn btn-ghost btn-sm fic-go" onClick=${go}><${Icon} n="clapper" s=${14} /> Réagir en vidéo</button>` : null}
  </div>`;
}
function CritCard({ g, p }) {
  const C = p.crit, T = CRIT_TONES[C.tone] || CRIT_TONES.dur, on = C.about === 'p';
  const go = (e) => { e.stopPropagation(); openCompose({ text: `Ma réponse en vidéo à @${author(g, p.a).handle} arrive. ` }); };
  return html`<div class=${'crit-card tone-' + C.tone}>
    <div class="crit-play" aria-hidden="true"><${Icon} n="play" s=${22} fill=${true} /><small>${C.mins} min</small></div>
    <div class="crit-mid">
      <span class="crit-kicker">Nouvelle vidéo · ${T.label}</span>
      <b>${C.title}</b>
      <small>${on ? 'sur toi' : `sur @${author(g, C.about).handle}`}</small>
    </div>
    ${on && C.tone !== 'respect' ? html`<button class="btn btn-ghost btn-sm crit-go" onClick=${go}>Répondre en vidéo</button>` : null}
  </div>`;
}
// The end of a game: a pudic last image, who it was and the signs the player had seen, and the saves to go back to.
function GameOver({ g }) {
  const O = g.over, c = g.chars[O.c];
  const list = (g.saves || []).slice().sort((a, b) => b.at - a.at);
  const signs = c ? (g.clues || []).filter((k) => k.c === c.id && k.psy).slice(-5) : [];
  const back = (x) => loadSave(x.slot); // (nothing to lose any more: no question asked)
  return html`<div class="over-screen" role="dialog" aria-modal="true" aria-label="Fin de partie">
    <div class="over-card">
      <span class="eyebrow">Fin de partie</span>
      <p class="over-text">${O.text}</p>
      ${c ? html`<div class="over-who"><${Avatar} who=${author(g, 'c:' + c.id)} size=${44} /><div><b>C’était ${c.name}.</b><span>@${c.handle}${c.role ? ' · ' + c.role : ''}</span></div></div>` : null}
      ${signs.length ? html`<div class="over-signs"><span class="lbl">Les signes étaient là</span><ul>${signs.map((k) => html`<li key=${k.id}>${k.text}</li>`)}</ul></div>` : null}
      <div class="over-saves">
        <span class="lbl">Revenir en arrière</span>
        ${list.length ? list.map((x, i) => html`<button key=${x.slot} class=${'over-save' + (i === 0 ? ' first' : '')} onClick=${() => back(x)} disabled=${S.busy.save}>
          <b>${saveName(x)}</b><small>${i === 0 && x.auto ? 'Juste avant · ' : x.auto ? 'Auto · ' : ''}${agoLabel(x.at)} · Niv. ${x.lvl}</small>
        </button>`) : html`<p class="muted">Aucune sauvegarde de cette partie.</p>`}
      </div>
      <button class="btn btn-ghost" onClick=${leaveGame}>Retour à l’accueil</button>
    </div>
  </div>`;
}
function PsyOutCard({ g, m, close }) {
  const c = g.chars[m.charId];
  if (!c) return null;
  return html`<div class="modal-card">
    <span class="eyebrow" style="color:var(--good)">Démasqué${gx(c.g, '', 'e', '·e')}</span>
    <div class="modal-char"><${Avatar} who=${author(g, 'c:' + c.id)} size=${48} /><div><b>${c.name}</b><span>@${c.handle} · ${gx(c.g, 'arrêté', 'arrêtée', 'arrêté·e')}</span></div></div>
    <p>Tu avais vu juste : ${firstName(c)} était obsédé${gx(c.g, '', 'e', '·e')} par toi, et dangereu${gx(c.g, 'x', 'se', 'x·se')}. Tout le réseau en parle${m.fol > 0 ? ` (${nAbonnes(m.fol, true)})` : ''}.</p>
    <button class="btn btn-ink" onClick=${close}>Respirer enfin</button>
  </div>`;
}
