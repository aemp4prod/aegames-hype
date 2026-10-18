/* =========================================================
   The photo pack (0.8): real faces and real photos for the main characters. The game's creator makes them once
   (with ChatGPT), describes and labels them in the « Atelier photos », and they ship with the game for everyone.
   The game picks them by itself, without any AI: the season and the occasion of the game's date, the time of day,
   what a post talks about. Characters get a profile photo, a page in the style of Instagram (their photos, their
   highlights), slideshows in the style of TikTok, and post their photos in the feed.
   Nothing here calls html`` at load time: htm is set up later, in ui.js.
   ========================================================= */
const PH_SEASONS = [['all', 'Toute l’année'], ['ete', 'Été'], ['hiver', 'Hiver'], ['mi', 'Mi-saison']];
const PH_MOMENTS = [['all', 'Jour et soir'], ['jour', 'Jour'], ['soir', 'Soir']];
const PH_STYLES = [['moderne', 'Monde actuel'], ['magie', 'Magie'], ['scifi', 'Science-fiction'], ['cyber', 'Cyberpunk'], ['fantasy', 'Fantasy']];
const PH_GENDERS = [['f', 'Femme'], ['m', 'Homme'], ['x', 'Look androgyne']];
// What a complete pack holds: a face for every main character of a game (the 10 of the start, the 5 who arrive with
// the levels), each with a profile photo and enough photos for a grid of 3 × 3.
const PACK_GOAL = { f: 7, m: 6, x: 2, photos: 9 };
const PH_DESC_MAX = 300, PH_PROFILE_MAX = 300, PH_TAG_MAX = 20, PH_PER_PERSON = 150; // (0.27: 20 tags of up to 32 characters, the creator's as written; 150 photos a face, 60 before)
// The creator's tags are free. The game understands them through these families of words (case and accents
// ignored): what a photo shows (for the highlights, and to match what a post talks about), its mood (a character in a
// bad buzz posts a serious photo rather than a laughing one), the occasions it belongs to (out only at their time).
// [emoji, label, words…]
const TAG_GROUPS = {
  gaming: ['🎮', 'Gaming', 'gaming', 'jeu video', 'jeux video', 'gamer', 'manette', 'console', 'stream', 'streameur', 'streameuse', 'twitch', 'esport', 'pc gamer', 'gta', 'fortnite', 'minecraft', 'ps5', 'playstation', 'xbox', 'valorant'],
  sport: ['💪', 'Sport', 'sport', 'salle de sport', 'muscu', 'musculation', 'fitness', 'gym', 'running', 'jogging', 'course a pied', 'foot', 'football', 'basket', 'tennis', 'yoga', 'velo', 'piscine', 'natation', 'entrainement'],
  plage: ['🏖️', 'Plage', 'plage', 'mer', 'ocean', 'sable', 'surf', 'bronzer', 'bronzage', 'baignade', 'calanque', 'calanques'],
  soiree: ['🎉', 'Soirées', 'soiree', 'fete', 'party', 'boite', 'club', 'danse', 'cocktail', 'anniversaire', 'anniv', 'rave', 'teuf', 'after'],
  cafe: ['☕', 'Café', 'cafe', 'latte', 'cappuccino', 'brunch', 'terrasse', 'croissant'],
  resto: ['🍽️', 'Restos', 'resto', 'restaurant', 'diner', 'dejeuner', 'repas', 'pizza', 'sushi', 'burger'],
  musique: ['🎶', 'Musique', 'musique', 'concert', 'festival', 'guitare', 'piano', 'chant', 'chanson', 'micro', 'dj', 'rap', 'techno', 'platines', 'vinyle', 'vinyles'],
  nature: ['🌿', 'Nature', 'nature', 'foret', 'montagne', 'rando', 'randonnee', 'parc', 'lac', 'jardin', 'fleurs', 'coucher de soleil', 'lever de soleil', 'campagne'],
  ville: ['🏙️', 'En ville', 'ville', 'rue', 'metro', 'balade', 'quartier', 'shopping', 'vitrine'],
  voyage: ['✈️', 'Voyages', 'voyage', 'vacances', 'avion', 'aeroport', 'valise', 'roadtrip', 'road trip', 'train', 'hotel', 'escapade', 'week end'],
  travail: ['💻', 'Au travail', 'travail', 'bureau', 'boulot', 'reunion', 'cours', 'revisions', 'examen', 'etudes', 'bibliotheque', 'tournage', 'ordinateur'],
  maison: ['🏠', 'À la maison', 'maison', 'chambre', 'canape', 'lit', 'plaid', 'cocooning', 'chez moi', 'appart', 'appartement'],
  selfie: ['🤳', 'Selfies', 'selfie', 'miroir', 'portrait'],
  mode: ['✨', 'Looks', 'tenue', 'outfit', 'look', 'ootd', 'mode', 'style', 'fashion', 'shooting'],
  amis: ['👯', 'Les potes', 'amis', 'potes', 'copines', 'copains', 'bande', 'squad', 'entre amis'],
  animaux: ['🐾', 'Animaux', 'animaux', 'animal', 'chat', 'chien', 'chaton', 'chiot'],
  lecture: ['📖', 'Lecture', 'lecture', 'livre', 'lire', 'roman'],
  art: ['🎨', 'Art', 'art', 'dessin', 'peinture', 'musee', 'expo', 'exposition'],
  cuisine: ['🍰', 'Cuisine', 'cuisine', 'cuisiner', 'gateau', 'patisserie', 'recette'],
};
const MOOD_GROUPS = {
  joyeux: ['😂', 'marrant', 'drole', 'rire', 'fou rire', 'joyeux', 'joyeuse', 'heureux', 'heureuse', 'content', 'contente', 'souriant', 'souriante', 'sourire', 'joie', 'euphorie', 'euphorique', 'fier', 'fiere', 'happy'],
  calme: ['😌', 'calme', 'zen', 'pensif', 'pensive', 'reveur', 'reveuse', 'detendu', 'detendue', 'chill'],
  serieux: ['🧐', 'serieux', 'serieuse', 'concentre', 'concentree', 'determine', 'determinee'],
  triste: ['🥀', 'triste', 'melancolique', 'nostalgique', 'decu', 'decue', 'fatigue', 'fatiguee'],
  enerve: ['😤', 'enerve', 'enervee', 'colere', 'agace', 'agacee', 'blase', 'blasee'],
  amoureux: ['💞', 'amoureux', 'amoureuse', 'romantique', 'love'],
};
const OCC_GROUPS = {
  halloween: ['🎃', 'Halloween', 'halloween', 'deguisement', 'citrouille'],
  noel: ['🎄', 'Noël', 'noel', 'sapin', 'fetes de fin d annee'],
  nouvelan: ['🥂', 'Nouvel An', 'nouvel an', 'reveillon', 'bonne annee'],
  valentin: ['💘', 'Saint-Valentin', 'saint valentin', 'valentin'],
};
// The tags offered with one click in the atelier (any other word can be typed).
const TAG_SUGGEST = ['marrant', 'joyeux', 'calme', 'sérieux', 'triste', 'gaming', 'sport', 'plage', 'soirée', 'café', 'resto', 'musique', 'nature', 'ville', 'voyage', 'travail', 'maison',
  'selfie', 'tenue', 'amis', 'animaux', 'lecture', 'art', 'cuisine', 'énervé', 'amoureux', 'halloween', 'noël', 'nouvel an', 'saint-valentin'];
const normT = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const hasPhrase = (hay, w) => (' ' + hay + ' ').includes(' ' + w + ' ');
// The families a text belongs to: its words or phrases are in the family (« jeu vidéo », « manette » → gaming).
function familiesOf(text, groups, from) {
  const h = normT(text), out = [];
  if (!h) return out;
  for (const k in groups) if (groups[k].slice(from).some((w) => hasPhrase(h, w))) out.push(k);
  return out;
}
const SEASON_RE = { ete: /(?<![a-zà-ÿ])[ée]t[ée](?![a-zà-ÿ])|summer|juillet|ao[ûu]t/i, hiver: /hiver|winter|neige|ski\b|d[ée]cembre|janvier/i, mi: /printemps|automne|spring|autumn|fall\b/i };
// A tag as the creator typed it, tidied up (« Jeu Vidéo » stays readable, two spaces do not).
const cleanTag = (t) => str(t, 32).replace(/^#+/, '').toLowerCase();
// The 0.8.0 atelier had fixed labels: they become tags.
const OLD_PLACES = { selfie: 'selfie', tenue: 'tenue', maison: 'maison', cafe: 'café', resto: 'resto', soiree: 'soirée', amis: 'amis', sport: 'sport', plage: 'plage', nature: 'nature', ville: 'ville', voyage: 'voyage', travail: 'travail', concert: 'concert' };
const OLD_OCCS = { halloween: 'halloween', noel: 'noël', nouvelan: 'nouvel an', valentin: 'saint-valentin' };

/* ---------- the pack: the one shipped with the game, and the one the creator is making on this computer ---------- */
const PACK_BASE = 'pack/';
// Written into the page when it is built (build.py, desktop/scripts/build-renderer.mjs) from assets/pack/manifest.json.
const PACK_BUNDLED = { v: 1, people: [] } /*@pack*/;
const PACK = { people: [], byId: {}, photos: {}, sets: {}, bundled: 0, local: 0, ver: 0 };
const PH_ID = /^[a-z0-9][a-z0-9-]{0,30}$/;
const PH_FILE = /^[\w.-]{1,80}\.(webp|jpe?g|png)$/i;
const SET_ID = /^s\d{1,3}$/;
// A photo: its season, its moment, the creator's tags, and the description the AI gets (never shown to players).
// keys, mood and occ are what the game reads in the tags.
function cleanPhoto(x, local) {
  if (!x || !PH_ID.test(String(x.id || ''))) return null;
  const file = local ? null : String(x.file || '');
  if (!local && !PH_FILE.test(file)) return null;
  let tags = Array.isArray(x.tags) ? x.tags : [];
  if (!tags.length && (Array.isArray(x.places) || Array.isArray(x.occ))) { // a pack made with the 0.8.0 atelier
    tags = [...(x.places || []).map((k) => OLD_PLACES[k]), ...(x.occ || []).map((k) => OLD_OCCS[k])].filter(Boolean);
  }
  tags = tags.map(cleanTag).filter((t, i, all) => t && all.indexOf(t) === i).slice(0, PH_TAG_MAX);
  const joined = tags.join(' | ');
  return {
    id: x.id, file,
    season: PH_SEASONS.some((v) => v[0] === x.season) ? x.season : 'all',
    moment: PH_MOMENTS.some((v) => v[0] === x.moment) ? x.moment : 'all',
    set: SET_ID.test(String(x.set || '')) ? x.set : '', // a series: photos of the same shoot (0.9.1)
    tags, desc: str(x.desc, PH_DESC_MAX),
    keys: [...new Set(tags.flatMap((t) => familiesOf(t, TAG_GROUPS, 2)))],
    mood: [...new Set(tags.flatMap((t) => familiesOf(t, MOOD_GROUPS, 1)))],
    occ: familiesOf(joined, OCC_GROUPS, 2),
  };
}
function cleanPerson(x, local) {
  if (!x || !PH_ID.test(String(x.id || ''))) return null;
  const pt = x.portrait ? String(x.portrait) : '';
  return {
    id: x.id, local: !!local,
    g: ['f', 'm', 'x'].includes(x.g) ? x.g : 'x',
    style: PH_STYLES.some((v) => v[0] === x.style) ? x.style : 'moderne',
    label: str(x.label, 30), look: str(x.look, 60), profile: str(x.profile, PH_PROFILE_MAX),
    portrait: local ? (PH_ID.test(pt) ? pt : null) : (PH_FILE.test(pt) ? pt : null),
    photos: (Array.isArray(x.photos) ? x.photos : []).map((ph) => cleanPhoto(ph, local)).filter(Boolean).slice(0, PH_PER_PERSON),
  };
}
const bundledPack = () => (window.__HYPE_TEST_PACK__ && typeof window.__HYPE_TEST_PACK__ === 'object' ? window.__HYPE_TEST_PACK__ : PACK_BUNDLED);
// The creator's people come first: they replace the shipped ones with the same id (a newer version of them).
function rebuildPack() {
  const list = [], seen = new Set();
  const local = (S.atelier && S.atelier.meta && Array.isArray(S.atelier.meta.people)) ? S.atelier.meta.people : [];
  const B = bundledPack();
  let nb = 0;
  for (const x of local) { const p = cleanPerson(x, true); if (p && !seen.has(p.id)) { seen.add(p.id); list.push(p); } }
  for (const x of (B && Array.isArray(B.people) ? B.people : [])) { const p = cleanPerson(x, false); if (p && !seen.has(p.id)) { seen.add(p.id); list.push(p); nb++; } }
  PACK.people = list;
  PACK.byId = {};
  PACK.photos = {};
  PACK.sets = {};
  for (const p of list) {
    PACK.byId[p.id] = p;
    const by = {};
    for (const ph of p.photos) { PACK.photos[ph.id] = { p, ph }; if (ph.set) (by[ph.set] = by[ph.set] || []).push(ph); }
    // a series of one photo is just a photo; sk: the key of the shoot, shared by every photo of a series
    for (const ph of p.photos) { const grp = ph.set ? by[ph.set] : null; ph.sk = grp && grp.length >= 2 ? p.id + ':' + ph.set : ''; }
    for (const k in by) if (by[k].length >= 2) PACK.sets[p.id + ':' + k] = by[k].map((ph) => ph.id);
  }
  PACK.bundled = nb;
  PACK.local = list.length - nb;
  PACK.ver++;
  for (const k in NOFACE) delete NOFACE[k];
}
// The creator's images live in their own documents (one per image), read when first shown.
const PACK_IMG = {};
function localImg(id) {
  const v = PACK_IMG[id];
  if (v === undefined) {
    PACK_IMG[id] = 'loading';
    Store.read('pk_img_' + id).then((b) => { PACK_IMG[id] = b && typeof b.data === 'string' && b.data.startsWith('data:image/') ? b.data : 'missing'; update(false); })
      .catch(() => { PACK_IMG[id] = 'missing'; });
    return null;
  }
  return v === 'loading' || v === 'missing' ? null : v;
}
const phSrc = (p, ph) => (!p || !ph ? null : p.local ? localImg(ph.id) : PACK_BASE + ph.file);
const portraitSrc = (p) => (!p || !p.portrait ? null : p.local ? localImg(p.portrait) : PACK_BASE + p.portrait);
const photoSrcById = (id) => { const x = PACK.photos[id]; return x ? phSrc(x.p, x.ph) : null; };

/* ---------- faces: who plays which main character ---------- */
const STYLE_OF_PRESET = (id) => ({ orion: 'scifi', neolyon: 'cyber', aldoree: 'fantasy', lumen: 'magie' }[id] || 'moderne');
// The people who can play in a world: its own style, and the people of today for the modern worlds and the academy of magic.
const packPool = (style) => PACK.people.filter((p) => p.style === style || (style === 'magie' && p.style === 'moderne'));
const NOFACE = {}; // characters left without a face for this version of the pack (no need to look again at every render)
// The face of a main character: chosen once per game, never twice the same. Others (media, brands, the public) keep their emoji.
function faceOf(g, c) {
  if (!g || !c || c.kind !== 'main' || g.portraits === false || !PACK.people.length) return null;
  const id = g.faces && g.faces[c.id];
  if (id && PACK.byId[id]) return PACK.byId[id];
  if (g.facesWait) return null; // the AI is still choosing the faces of a new world
  return assignFace(g, c);
}
// want: the face the AI built the character around (when it creates a world or a newcomer); otherwise one of their gender.
function assignFace(g, c, want) {
  if (!g || !c || c.kind !== 'main' || g.portraits === false) return null;
  const key = g.id + ':' + c.id;
  if (!want && NOFACE[key] === PACK.ver) return null;
  const pool = packPool(STYLE_OF(g));
  if (!g.faces) g.faces = {};
  const used = new Set(Object.keys(g.faces).filter((k) => k !== c.id).map((k) => g.faces[k]));
  const free = pool.filter((x) => !used.has(x.id));
  let p = want ? free.find((x) => x.id === want) || null : null;
  // A face of the other gender (the AI wrote a man for a woman's face, or the reverse): the character stays who the AI
  // wrote (name, role, words), with a face of their own gender; the face goes to someone it fits. A look androgyne fits anyone.
  if (p && c.g !== 'x' && p.g !== 'x' && c.g !== p.g) p = null;
  if (p) { if (c.g === 'x') c.g = p.g; } // no gender said: the face's
  else {
    const gd = c.g || 'x';
    // their own gender first; a face with an androgynous look fits anyone
    const tiers = gd === 'x' ? [free.filter((x) => x.g === 'x'), free] : [free.filter((x) => x.g === gd), free.filter((x) => x.g === 'x')];
    const list = tiers.find((l) => l.length);
    if (!list) { NOFACE[key] = PACK.ver; return null; }
    p = list[hashStr(g.id + ':' + c.handle) % list.length];
  }
  g.faces[c.id] = p.id;
  // a new face (the pack changed): what they had posted with the old one goes away
  const mine = (id) => PACK.photos[id] && PACK.photos[id].p.id === p.id;
  if (Array.isArray(c.ig) && c.ig.length && !c.ig.some((e) => mine(e.ph))) delete c.ig;
  if (Array.isArray(c.tt) && c.tt.length && !c.tt.some((x) => x.phs.every(mine))) delete c.tt;
  seedSocial(g, c, p);
  return p;
}
// While a world is being written, the faces wait: the AI chooses them, the others get theirs at the end.
function assignFaces(g) { if (g) for (const id of g.order) { const c = g.chars[id]; if (c && c.kind === 'main') faceOf(g, c); } }
const charPortrait = (g, c) => portraitSrc(faceOf(g, c));
const faceLook = (g, c) => { const p = faceOf(g, c); return p && p.look ? p.look : ''; };
// For the AI, when it creates characters: the faces it can give them, each with the creator's profile of that person.
// Sent only when a world is created and when a newcomer arrives (never in the other calls).
function facesAsk(style, used = new Set()) {
  const pool = packPool(style).filter((x) => !used.has(x.id)).slice(0, 20);
  if (!pool.length) return null;
  const gw = { f: 'femme', m: 'homme', x: 'look androgyne' };
  return ['## LES VISAGES DU JEU (de vraies photos)',
    'Chaque personnage principal reçoit un de ces visages : mets son identifiant dans "face" et construis le personnage autour de son profil (passions, univers, humeur), adapté à ce monde : nom, rôle et caractère sont à toi. Jamais deux fois le même visage ; s’il y a plus de personnages que de visages, laisse "face" vide pour les autres.',
    'Le genre du personnage est TOUJOURS celui de son visage : un visage de femme est une femme ("g":"f", un prénom féminin, son rôle et ses accords au féminin : une créatrice, pas un créateur), un visage d’homme est un homme ("g":"m"), un look androgyne peut être qui tu veux. Un visage qui ne colle pas au genre du personnage lui est retiré.',
    ...pool.map((x) => `- ${x.id} (${gw[x.g]})${x.profile ? ' : ' + x.profile : ''}`)].join('\n');
}

/* ---------- choosing a photo, without any AI ---------- */
const seasonOf = (d) => { const m = d.getMonth(); return m === 11 || m <= 1 ? 'hiver' : m >= 5 && m <= 7 ? 'ete' : 'mi'; };
const momentOf = (d) => { const h = d.getHours(); return h >= 7 && h < 19 ? 'jour' : 'soir'; };
const seasonName = (d) => { const s = seasonOf(d), m = d.getMonth(); return s === 'hiver' ? 'l’hiver' : s === 'ete' ? 'l’été' : m >= 2 && m <= 4 ? 'le printemps' : 'l’automne'; };
// The occasions a photo can be posted for, around the game's date.
function occasionsAt(d) {
  const y = d.getFullYear(), day = startOfDay(d).getTime(), out = [];
  const near = (dt, before, after) => { const n = Math.round((startOfDay(dt).getTime() - day) / DAY_MS); return n <= before && n >= -after; };
  if (near(new Date(y, 9, 31), 7, 1)) out.push('halloween');
  if (near(new Date(y, 11, 25), 10, 1)) out.push('noel');
  if (near(new Date(y, 11, 31), 1, 0) || near(new Date(y, 0, 1), 0, 1)) out.push('nouvelan');
  if (near(new Date(y, 1, 14), 2, 0)) out.push('valentin');
  return out;
}
// In season, and an occasion photo only around its occasion (no Christmas tree in July).
const photoFits = (ph, d, occ) => (ph.season === 'all' || ph.season === seasonOf(d)) && (!ph.occ.length || ph.occ.some((o) => occ.includes(o)));
// What their Insta and TikTok pages show: about a week of game time (older posts are gone from them).
const IG_WINDOW = 7 * DAY_MS;
// A shoot: a whole series counts as one (its photos look alike), a photo on its own is its own shoot.
const shotOf = (id) => { const x = PACK.photos[id]; return x ? x.ph.sk || id : id; };
// The shoots the player can still see somewhere (the feed, an Insta or a TikTok page, a photo waiting for its caption).
// None of their photos comes out again until it is gone from everywhere: at most a feeling of déjà-vu, never a proof.
function visibleShots(g, now = Date.now()) {
  const out = new Set();
  const add = (id) => { if (id) out.add(shotOf(id)); };
  for (const p of g.posts) {
    if (p.photo && p.photo.img) { add(p.photo.img); for (const id of p.photo.more || []) add(id); }
    if (p.slides) { const c = g.chars[p.slides.c]; const s = c && c.tt ? c.tt.find((x) => x.id === p.slides.s) : null; if (s) s.phs.forEach(add); }
  }
  for (const id of g.order) {
    const c = g.chars[id];
    if (!c) continue;
    for (const e of c.ig || []) if (now - e.at < IG_WINDOW) { add(e.ph); for (const x of e.more || []) add(x); }
    for (const s of c.tt || []) if (now - s.at < IG_WINDOW) s.phs.forEach(add);
  }
  for (const q of g.phQ || []) { add(q.ph); for (const x of q.more || []) add(x); for (const x of q.phs || []) add(x); }
  return out;
}
// What a text talks about: families of words (gaming, beach…), occasions, moods, and its words.
function hintTags(text) {
  const t = String(text || '');
  return { keys: familiesOf(t, TAG_GROUPS, 2), occ: familiesOf(t, OCC_GROUPS, 2), mood: familiesOf(t, MOOD_GROUPS, 1), words: new Set(normT(t).split(' ').filter((w) => w.length >= 4)) };
}
function wordHits(words, ph) {
  if (!words || !words.size) return 0;
  let n = 0;
  for (const w of new Set(normT(ph.tags.join(' ') + ' ' + ph.desc).split(' '))) if (words.has(w)) n++;
  return Math.min(3, n);
}
// o: { hint (what the post says), mood ('down': a bad moment, 'up': a good one), exclude (ids), among (only these),
//      relax (out of season when nothing fits), min (score), vis (the shoots still visible, when the caller has them) }
function pickPhoto(g, p, d, o = {}) {
  if (!p || !p.photos.length) return null;
  const occ = occasionsAt(d), mo = momentOf(d), use = g.phUse || {}, now = Date.now();
  const want = o.hint ? hintTags(o.hint) : null;
  const vis = o.vis || visibleShots(g, now); // never a photo whose shoot can still be seen somewhere
  const base = (o.among || p.photos).filter((ph) => !(o.exclude || []).includes(ph.id) && !vis.has(ph.sk || ph.id));
  let fit = base.filter((ph) => photoFits(ph, d, occ));
  if (!fit.length && o.relax) fit = base.filter((ph) => !ph.occ.length);
  if (!fit.length) return null;
  let best = null, bs = -1e9;
  for (const ph of fit) {
    let s = rand(0, 1.5);
    if (ph.occ.length) s += 6; // Halloween photos come out for Halloween
    if (ph.moment === mo) s += 1.5; else if (ph.moment !== 'all') s -= 1.5;
    if (ph.season !== 'all' && ph.season === seasonOf(d)) s += 0.8;
    if (want) s += 4 * ph.keys.filter((k) => want.keys.includes(k)).length + 5 * ph.occ.filter((k) => want.occ.includes(k)).length + 2 * ph.mood.filter((k) => want.mood.includes(k)).length + wordHits(want.words, ph);
    if (o.mood === 'down') s += ph.mood.some((m) => m === 'serieux' || m === 'triste' || m === 'calme') ? 3 : ph.mood.includes('joyeux') ? -4 : 0;
    else if (o.mood === 'up') s += ph.mood.includes('joyeux') ? 3 : ph.mood.includes('triste') ? -3 : 0;
    const last = Math.max(use[ph.id] || 0, ph.sk ? use['set:' + ph.sk] || 0 : 0);
    s += last ? -Math.max(0, 14 - (now - last) / DAY_MS) : 2; // the ones not seen for a while first (a shoot counts as one)
    if (s > bs) { bs = s; best = ph; }
  }
  return o.min != null && bs < o.min ? null : best;
}
function usePhoto(g, id, at) {
  if (!g.phUse) g.phUse = {};
  g.phUse[id] = at || Date.now();
  const x = PACK.photos[id];
  if (x && x.ph.sk) g.phUse['set:' + x.ph.sk] = at || Date.now();
  const keys = Object.keys(g.phUse);
  if (keys.length > 260) for (const k of keys) if (k.startsWith('set:') ? !PACK.sets[k.slice(4)] : !PACK.photos[k]) delete g.phUse[k];
}
// The other photos of a chosen photo's shoot, still free, for a carousel (2 to 5 photos in all, the chosen one first).
function carouselOf(ph, d) {
  if (!ph || !ph.sk) return [];
  const occ = occasionsAt(d);
  const mates = (PACK.sets[ph.sk] || []).filter((id) => id !== ph.id).map((id) => PACK.photos[id] && PACK.photos[id].ph).filter((x) => x && photoFits(x, d, occ));
  return mates.slice(0, 4).map((x) => x.id);
}
const CAROUSEL_P = 0.55; // a series comes out as a carousel about one time in two; otherwise one of its photos alone
// A post the AI wrote « with a photo »: one of the character's real photos when it shows what the text says.
// A photo of something else (a cauldron, a poster…) keeps its illustrated card.
// text: the post itself, which helps choose among the photos that fit (never decides alone that one fits).
function matchAiPhoto(g, c, desc, at, text = '') {
  const p = faceOf(g, c);
  if (!p || !p.photos.length) return null;
  const want = hintTags(desc);
  const generic = /selfie|\bmoi\b|portrait|tenue|\blook\b|outfit|ootd|photo de (moi|nous)/i.test(desc);
  if (!want.keys.length && !want.occ.length && !generic) return null;
  const among = !want.keys.length && !want.occ.length ? p.photos
    : p.photos.filter((ph) => ph.keys.some((k) => want.keys.includes(k)) || ph.occ.some((k) => want.occ.includes(k)));
  return among.length ? pickPhoto(g, p, gameDate(at), { hint: desc + ' ' + text, among }) : null;
}
// A photo in the feed, for the prompts: a photo of the pack is its tags, and, for the two latest ones, the creator's
// description (what the characters react to). Other photos: what the AI said it shows.
function photoCtx(p, recent) {
  const own = p.photo.own && p.photo.own.length; // the player's own photos: only what the player said they show
  if (own) return ` [${p.photo.diapo ? `diaporama de ${own} photos` : own > 1 ? `carrousel de ${own} photos` : 'photo'} : ${str(p.photo.ai || p.photo.desc, 120) || 'non décrite'}]`; // what the characters saw, or what the player said
  const x = p.photo.img && PACK.photos[p.photo.img];
  if (!x) return p.photo.desc === p.text ? ' [photo]' : ` [photo : ${String(p.photo.desc).slice(0, 80)}]`;
  const tags = x.ph.tags.slice(0, 6).join(', ');
  const desc = recent && recent.has(p.id) && x.ph.desc ? ` — ${str(x.ph.desc, 220)}` : '';
  const n = 1 + (p.photo.more || []).length;
  return ` [${n > 1 ? `carrousel de ${n} photos du même shooting` : 'photo'}${tags ? ' : ' + tags : ''}${desc}]`;
}
// A caption when no AI writes one (the past of a new character, a day without cafés): an emoji or two, as many real posts.
function emojiCaption(ph) {
  const out = [...ph.occ.map((k) => OCC_GROUPS[k][0]), ...ph.keys.map((k) => TAG_GROUPS[k][0]), ...ph.mood.map((k) => MOOD_GROUPS[k][0])];
  return out.length ? [...new Set(out)].slice(0, 2).join(' ') : ['📸', '✨', '🤍'][hashStr(ph.id) % 3];
}
function attachPhoto(g, c, post, ph, at) {
  post.photo.img = ph.id;
  usePhoto(g, ph.id, at);
  igAdd(c, igEntry(g, c, ph, at, { p: post.id, cap: post.text }));
}

/* ---------- their Insta and their TikTok: what they posted ---------- */
const IG_MAX = 18, TT_MAX = 6;
// Comments written by the game (no AI): kind words from the regulars, and a troll now and then.
const IG_CM = ['trop belle cette photo 😍', 'la vibe 🔥', 'on veut la même', 'qui a pris la photo ? 👀', 'magnifique ✨', 'je valide 💯', 'ça donne envie',
  'la lumière 👌', 'c’est où ??', 'trop stylé', 'photo de l’année', 'invite-moi la prochaine fois', 'toujours au top', 'j’adore', '😍😍😍', 'ce cadre !!'];
const IG_TROLL = ['encore une photo… 🙄', 'filtre détecté 🔍', 'on a compris, t’es dehors', 'c’est retouché ça non ?', 'ratio'];
function igComments(g, lk) {
  const regs = regulars(g);
  if (!regs.length) return [];
  const n = Math.min(3, lk > 400 ? randi(1, 3) : randi(0, 2));
  const out = [], taken = new Set();
  for (let k = 0; k < n; k++) {
    const r = pick(regs);
    if (taken.has(r.handle)) continue;
    taken.add(r.handle);
    out.push(isTroll(r) && Math.random() < 0.6 ? ['n:' + r.handle, 100 + randi(0, IG_TROLL.length - 1)] : ['n:' + r.handle, randi(0, IG_CM.length - 1)]);
  }
  return out;
}
const igCommentText = (k) => (k >= 100 ? IG_TROLL[k - 100] : IG_CM[k]) || '🔥';
// o.more: the other photos of a carousel (the same shoot).
function igEntry(g, c, ph, at, o = {}) {
  const lk = Math.round(Math.max(30, c.followers || 0) * rand(0.02, 0.08) + randi(3, 40)) * (inBadBuzz(c, at) ? 0.5 : 1);
  const e = { id: uid('i'), ph: ph.id, at, lk: Math.round(lk), cm: igComments(g, lk) };
  if (o.more && o.more.length) e.more = o.more.slice(0, 9);
  if (o.p) e.p = o.p;
  if (o.cap) e.cap = str(o.cap, 220);
  return tag(e);
}
// Older than their page shows: gone (a day of margin, for a clock that moves back and forth).
function igAdd(c, e) {
  if (!c.ig) c.ig = [];
  c.ig.push(e);
  const t = Date.now();
  c.ig = c.ig.filter((x) => t - x.at < IG_WINDOW + DAY_MS);
  if (c.ig.length > IG_MAX) c.ig.sort((a, b) => a.at - b.at).splice(0, c.ig.length - IG_MAX);
}
// A newly cast character already has a past on their Insta: a few photos from the last days, each fitting its date,
// sometimes a carousel (their captions are emojis: no AI is asked for the past). Never more than about half of their
// photos: the rest is for what they will post while the player plays.
function seedSocial(g, c, p) {
  const vis = visibleShots(g);
  const budget = Math.max(2, Math.floor(p.photos.length * 0.45));
  let spent = 0;
  if (!Array.isArray(c.ig)) {
    c.ig = [];
    let at = Date.now() - randi(8, 30) * 3600000;
    for (let k = 0; k < 4 && spent < budget; k++) {
      const d = gameDate(at);
      const ph = pickPhoto(g, p, d, { vis });
      if (ph) {
        const more = ph.sk && Math.random() < CAROUSEL_P ? carouselOf(ph, d).slice(0, Math.max(0, budget - spent - 1)) : [];
        c.ig.push(igEntry(g, c, ph, at, { cap: emojiCaption(ph), more }));
        vis.add(ph.sk || ph.id);
        spent += 1 + more.length;
      }
      at -= randi(26, 44) * 3600000;
    }
    c.ig.sort((a, b) => a.at - b.at);
  }
  if (c.tt === undefined) {
    // about half of them are on TikTok too: those whose role says so, and some others
    c.tt = /tik ?tok|danse|humour|vlog|influen|star|cr[ée]atrice|cr[ée]ateur|chant|musique|gam/i.test(`${c.role} ${c.bio}`) || hashStr(c.handle) % 2 === 0 ? [] : null;
    if (c.tt && p.photos.length - spent >= 5) { // a first slideshow only when enough photos are left for the days to come
      const at = Date.now() - randi(2, 5) * DAY_MS, phs = pickSlides(g, p, gameDate(at), null, vis);
      if (phs.length >= 3) makeSlides(g, c, phs, at, pick(SLIDE_TITLES)(gameDate(at), phs.length), false);
    }
  }
}
const inWindow = (at, now) => at <= now && now - at < IG_WINDOW;
const igList = (g, c, now) => { const p = faceOf(g, c); return p ? (c.ig || []).filter((e) => inWindow(e.at, now) && PACK.photos[e.ph] && PACK.photos[e.ph].p.id === p.id && (e.more || []).every((id) => PACK.photos[id])).sort((a, b) => b.at - a.at) : []; };
const ttList = (g, c, now) => { const p = faceOf(g, c); return p && c.tt ? c.tt.filter((s) => inWindow(s.at, now) && s.phs.every((id) => PACK.photos[id] && PACK.photos[id].p.id === p.id)).sort((a, b) => b.at - a.at) : []; };

/* ---------- TikTok-like slideshows: a few photos in a row, a title over them ---------- */
// Titles for when no AI writes one (the past of a new character, a day without cafés).
const SLIDE_TITLES = [
  (d) => `photo dump ${deMonth(MONTHS[d.getMonth()])} 📸`,
  (d, n) => `ma semaine en ${n} photos`,
  (d) => `POV : tu passes ${['un dimanche', 'un lundi', 'un mardi', 'un mercredi', 'un jeudi', 'un vendredi', 'un samedi'][d.getDay()]} avec moi`,
  () => 'petit récap, rien de spécial (tout est spécial)',
  (d) => `${cap1(seasonName(d))}, version moi`,
  () => 'les photos que je n’avais pas postées',
  () => 'moodboard du moment ✨',
  () => 'si tu me vois comme ça, tout va bien',
];
// A slideshow: a whole series when one is free (a shoot makes the best photo dump), otherwise 3 or 4 photos.
function pickSlides(g, p, d, mood, vis) {
  vis = vis || visibleShots(g);
  const occ = occasionsAt(d);
  const shoots = Object.keys(PACK.sets).filter((k) => k.startsWith(p.id + ':') && !vis.has(k))
    .map((k) => PACK.sets[k].filter((id) => PACK.photos[id] && photoFits(PACK.photos[id].ph, d, occ))).filter((ids) => ids.length >= 3);
  if (shoots.length && Math.random() < 0.6) return pick(shoots).slice(0, 6);
  const picked = [];
  for (let k = 0; k < 4; k++) { const ph = pickPhoto(g, p, d, { exclude: picked, mood, vis }); if (!ph) break; picked.push(ph.id); }
  return picked;
}
function makeSlides(g, c, phs, at, title, announce) {
  const s = tag({ id: uid('s'), phs, ti: str(title, 80), at, lk: Math.round(Math.max(30, c.followers || 0) * rand(0.03, 0.15) + randi(5, 60)) });
  if (!c.tt) c.tt = [];
  c.tt.push(s);
  if (c.tt.length > TT_MAX) c.tt.sort((a, b) => a.at - b.at).splice(0, c.tt.length - TT_MAX);
  for (const id of phs) usePhoto(g, id, at);
  if (announce) {
    const post = addAmbientPost(g, { by: c.handle, text: `nouveau diapo sur ${pfName(g, 'tiktok')} 🎞️ ${s.ti}` }, Date.now() + 600, at);
    if (post) { post.slides = { c: c.id, s: s.id }; s.p = post.id; }
  }
  return s;
}

/* ---------- the game posts their photos by itself; the characters write the captions ---------- */
// When a photo is due, the game chooses it (no AI) and it waits for the next update of the feed (« Actualiser », a jump
// in time, a return), where its character writes the caption in the same call as the other posts. With no update for
// 45 minutes, or no cafés left, it goes out with an emoji, like many real posts.
const PH_GAP = [16, 44]; // game hours between two photos of a character
const TT_GAP = [96, 200]; // between two slideshows (they use several photos at once)
const CAP_WAIT = 45 * 60000;
function nextPostAt(t, gap) {
  let at = t + rand(gap[0], gap[1]) * 3600000;
  const h = gameDate(at).getHours();
  if (h >= 1 && h < 8) at += (8 - h + rand(0, 3)) * 3600000; // nobody posts at four in the morning
  return at;
}
// A bad moment (a bad buzz): a serious photo rather than a laughing one.
const moodOf = (g, c, t) => (inBadBuzz(c, t) ? 'down' : null);
function queuePost(g, q) {
  if (!g.phQ) g.phQ = [];
  g.phQ.push(q);
  while (g.phQ.length > 6) publishQueued(g, g.phQ[0], null);
}
// queuedAt: real time (kept as it is when the game clock jumps), for the 45 minutes of waiting.
function publishQueued(g, q, text) {
  g.phQ = (g.phQ || []).filter((x) => x !== q);
  const c = g.chars[q.c];
  const p = c ? faceOf(g, c) : null;
  if (!c || !c.unlocked || !p) return null;
  if (q.k === 'tt') {
    const phs = (q.phs || []).filter((id) => PACK.photos[id] && PACK.photos[id].p.id === p.id);
    return phs.length >= 3 ? makeSlides(g, c, phs, q.at, str(text, 80) || pick(SLIDE_TITLES)(gameDate(q.at), phs.length), true) : null;
  }
  const x = PACK.photos[q.ph];
  if (!x || x.p.id !== p.id) return null;
  const more = (q.more || []).filter((id) => PACK.photos[id] && PACK.photos[id].p.id === p.id); // a carousel: the rest of the shoot
  const cap = str(text, 220) || emojiCaption(x.ph);
  const post = addAmbientPost(g, { by: c.handle, text: cap, photo: x.ph.desc || x.ph.tags.join(', ') || 'une photo', noPack: true }, Date.now() + 600, Math.min(q.at, Date.now()));
  if (!post) return null;
  post.photo.img = x.ph.id;
  if (more.length) post.photo.more = more;
  post.prog = 1;
  igAdd(c, igEntry(g, c, x.ph, q.at, { p: post.id, cap, more }));
  return post;
}
// The photos for the next update of the feed (three at most): what the prompt says about them, and nothing else.
const capBatch = (g) => (g.phQ || []).filter((q) => g.chars[q.c]).sort((a, b) => a.at - b.at).slice(0, 3);
function capLines(g, batch) {
  const L = [];
  for (const q of batch) {
    const c = g.chars[q.c];
    if (q.k === 'tt') {
      const tags = [...new Set((q.phs || []).flatMap((id) => (PACK.photos[id] ? PACK.photos[id].ph.tags : [])))].slice(0, 8);
      L.push(`- ${q.id} · @${c.handle} · un diaporama de ${(q.phs || []).length} photos façon TikTok${tags.length ? ' · tags : ' + tags.join(', ') : ''} : son titre, court, façon trend`);
    } else {
      const x = PACK.photos[q.ph], n = 1 + (q.more || []).length;
      if (x) L.push(`- ${q.id} · @${c.handle}${n > 1 ? ` · un carrousel de ${n} photos du même shooting` : ''}${x.ph.tags.length ? ' · tags : ' + x.ph.tags.slice(0, 12).join(', ') : ''} · « ${x.ph.desc || 'une photo d’' + (c.g === 'm' ? 'eux' : c.g === 'f' ? 'elle' : 'iel')} »`);
    }
  }
  if (!L.length) return [];
  return ['', '## PHOTOS QUI SORTENT',
    'Ces personnages publient une photo d’eux (déjà choisie : c’est bien eux dessus). Écris la légende que chacun met : dans sa voix, liée à sa vie, à ce qui se passe dans le monde et au moment ; sans décrire la photo comme un inventaire.',
    ...L, 'Une ligne par photo, en plus du reste : {"t":"cap","id":"q…","text":"≤ 150 caractères"}'];
}
// At most four new ones at once: after a long jump in time, the latest ones (the others wait their turn).
function tickPhotos(g, t = Date.now()) {
  if (!g || g.portraits === false || g.pendingCast) return false;
  let n = 0, changed = false;
  const aiOK = S.ai !== 'unavailable' && canAfford(g, 'refresh');
  for (const q of (g.phQ || []).slice()) if (!aiOK || t - (q.queuedAt || 0) > CAP_WAIT) { publishQueued(g, q, null); changed = true; }
  if (!PACK.people.length) return changed;
  const vis = visibleShots(g, t); // what is still visible somewhere stays out of the choice
  for (const c of mains(g)) {
    const p = faceOf(g, c);
    if (!p || !p.photos.length) continue;
    const waiting = (g.phQ || []).some((q) => q.c === c.id);
    if (!c.phAt) { c.phAt = nextPostAt(t, [1, 26]); changed = true; }
    else if (c.phAt <= t && !waiting) {
      if (n < 4) {
        const at = Math.max(c.phAt, t - 2 * DAY_MS), d = gameDate(at), ph = pickPhoto(g, p, d, { mood: moodOf(g, c, at), vis });
        if (ph) {
          const more = ph.sk && Math.random() < CAROUSEL_P ? carouselOf(ph, d) : []; // a series: a carousel, or one photo of it
          for (const id of [ph.id, ...more]) usePhoto(g, id, at);
          vis.add(ph.sk || ph.id);
          queuePost(g, { id: uid('q'), k: 'ph', c: c.id, ph: ph.id, more, at, queuedAt: t });
          n++;
        }
        c.phAt = nextPostAt(t, PH_GAP);
      } else c.phAt = nextPostAt(t, [0.5, 6]);
      changed = true;
    }
    if (c.tt) {
      if (!c.ttAt) { c.ttAt = nextPostAt(t, [10, 80]); changed = true; }
      else if (c.ttAt <= t && !waiting) {
        if (n < 4) {
          const at = Math.max(c.ttAt, t - 2 * DAY_MS), phs = pickSlides(g, p, gameDate(at), moodOf(g, c, at), vis);
          if (phs.length >= 3) { for (const id of phs) { usePhoto(g, id, at); vis.add(shotOf(id)); } queuePost(g, { id: uid('q'), k: 'tt', c: c.id, phs, at, queuedAt: t }); n++; }
        }
        c.ttAt = nextPostAt(t, n < 4 ? TT_GAP : [1, 8]);
        changed = true;
      }
    }
  }
  return changed;
}

/* ---------- creator mode and the « Atelier photos » ---------- */
const creatorOn = () => lsGet('hype:creator') === '1';
// The atelier lives in the desktop app (its photos are files on the creator's computer, its export a file dialog);
// the automated tests reach it in the browser too.
const atelierHere = () => !!(HOST || window.__HYPE_TEST__);
const verTaps = { n: 0, at: 0 };
// Seven taps on the version number, like the developer options of a phone.
function tapVersion() {
  const t = Date.now();
  verTaps.n = t - verTaps.at < 1600 ? verTaps.n + 1 : 1;
  verTaps.at = t;
  if (verTaps.n >= 7) {
    verTaps.n = 0;
    if (!atelierHere()) { toast('L’Atelier photos est dans l’appli PC (Hype pour ChatGPT).'); return; }
    const on = !creatorOn();
    lsSet('hype:creator', on ? '1' : '0');
    toast(on ? 'Mode créateur activé : l’Atelier photos est sur l’accueil.' : 'Mode créateur désactivé.', on ? 'good' : '');
    update(false);
  } else if (verTaps.n >= 4) toast(`Encore ${7 - verTaps.n} ${plural(7 - verTaps.n, 'appui', 'appuis')}…`);
}
S.atelier = { meta: { v: 2, people: [] }, loaded: false, sel: null, saving: false, savedAt: 0, busy: '', err: '' };
async function loadAtelier() {
  try {
    const m = await Store.read('pk_meta');
    S.atelier.meta = m && Array.isArray(m.people) ? m : { v: 2, people: [] };
  } catch (e) { S.atelier.meta = { v: 2, people: [] }; }
  for (const p of S.atelier.meta.people) for (const ph of p.photos || []) { // made with the 0.8.0 atelier: its labels become tags
    if (!Array.isArray(ph.tags)) { const c = cleanPhoto(ph, true); ph.tags = c ? c.tags : []; delete ph.places; delete ph.occ; }
  }
  S.atelier.loaded = true;
  rebuildPack();
}
let atSaveTimer = null;
function saveAtelier(now = false) {
  rebuildPack();
  S.atelier.saving = true;
  update(false);
  clearTimeout(atSaveTimer);
  const run = async () => {
    try { await Store.write('pk_meta', S.atelier.meta); S.atelier.savedAt = Date.now(); S.atelier.err = ''; }
    catch (e) { S.atelier.err = 'Enregistrement impossible pour l’instant : réessaie dans un moment.'; }
    S.atelier.saving = false;
    update(false);
  };
  if (now) return run();
  atSaveTimer = setTimeout(run, 500);
  return null;
}
function openAtelier() {
  S.phase = 'atelier';
  if (!S.atelier.sel && S.atelier.meta.people.length) S.atelier.sel = S.atelier.meta.people[0].id;
  update(false);
}
function closeAtelier() { S.phase = 'home'; update(false); }
const atPerson = (id) => S.atelier.meta.people.find((p) => p.id === id) || null;
// New ids never take one of the shipped pack (that would replace that person).
function nextPersonId(gd) {
  let n = 0;
  for (const p of [...S.atelier.meta.people, ...PACK.people]) { const m = new RegExp('^' + gd + '(\\d+)$').exec(p.id); if (m) n = Math.max(n, parseInt(m[1], 10)); }
  return gd + String(n + 1).padStart(2, '0');
}
function addPerson(gd) {
  const id = nextPersonId(gd);
  const n = S.atelier.meta.people.filter((p) => p.g === gd).length + 1;
  S.atelier.meta.people.push({ id, g: gd, style: 'moderne', label: `${{ f: 'Femme', m: 'Homme', x: 'Androgyne' }[gd]} ${n}`, look: '', profile: '', portrait: null, photos: [], next: 1 });
  S.atelier.sel = id;
  saveAtelier();
}
// An image → a data URL cropped to w × h (faces sit a bit above the middle), WebP when the browser can, JPEG otherwise.
async function packShrink(file, w, h, q = 0.82) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('image')); im.src = url; });
    const sw = img.naturalWidth, sh = img.naturalHeight;
    if (!sw || !sh) throw new Error('image');
    const r = w / h;
    let cw = sw, chh = Math.round(sw / r);
    if (chh > sh) { chh = sh; cw = Math.round(sh * r); }
    const x = Math.round((sw - cw) / 2), y = Math.round((sh - chh) * (w === h ? 0.3 : 0.4));
    const scale = Math.min(1, w / cw); // never blown up
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(cw * scale));
    cv.height = Math.max(1, Math.round(chh * scale));
    const cx = cv.getContext('2d');
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(img, x, y, cw, chh, 0, 0, cv.width, cv.height);
    let data = cv.toDataURL('image/webp', q);
    if (!data.startsWith('data:image/webp')) data = cv.toDataURL('image/jpeg', q);
    return data;
  } finally { URL.revokeObjectURL(url); }
}
const okImage = (f) => f && /^image\/(png|jpe?g|webp|gif|avif|bmp)$/i.test(f.type || '') && f.size <= 40e6;
async function setPortrait(person, file) {
  if (!okImage(file)) { toast('Choisis une image (PNG, JPG ou WebP).', 'bad'); return; }
  S.atelier.busy = 'Photo de profil…';
  update(false);
  try {
    const data = await packShrink(file, 320, 320, 0.85);
    const id = person.id + '-p';
    await Store.write('pk_img_' + id, { data });
    PACK_IMG[id] = data;
    person.portrait = id;
    await saveAtelier(true);
  } catch (e) { toast('Impossible d’importer cette image.', 'bad'); }
  S.atelier.busy = '';
  update(false);
}
// The labels a file name already gives: « plage-ete-soir.png » is a summer photo at the beach, in the evening.
// What a file name already says: « gaming-marrant-soir.png » is tagged gaming and marrant, and taken in the evening.
const TAG_DISPLAY = Object.fromEntries(TAG_SUGGEST.map((t) => [normT(t), t]));
const KNOWN_WORDS = new Set([...Object.values(TAG_GROUPS).flatMap((x) => x.slice(2)), ...Object.values(MOOD_GROUPS).flatMap((x) => x.slice(1)), ...Object.values(OCC_GROUPS).flatMap((x) => x.slice(2))].filter((w) => !w.includes(' ')));
function guessTags(name) {
  const t = String(name || '').replace(/\.[a-z0-9]+$/i, '').replace(/[-_.]+/g, ' ');
  let season = 'all';
  for (const k in SEASON_RE) if (SEASON_RE[k].test(t)) { season = k; break; }
  const moment = /soir|nuit|night|evening/i.test(t) ? 'soir' : /matin|jour|morning|day\b/i.test(t) ? 'jour' : 'all';
  const tags = [...new Set(normT(t).split(' ').filter((w) => KNOWN_WORDS.has(w)).map((w) => TAG_DISPLAY[w] || w))].slice(0, 6);
  return { season, moment, tags };
}
async function addPhotos(person, files) {
  const list = Array.from(files || []).filter(okImage);
  if (!list.length) { toast('Aucune image dans ce que tu as choisi.', 'bad'); return; }
  let done = 0;
  const added = [];
  for (const f of list) {
    S.atelier.busy = `Import des photos : ${done + 1} sur ${list.length}…`;
    update(false);
    try {
      const data = await packShrink(f, 720, 900, 0.8);
      const id = `${person.id}-${person.next || 1}`;
      person.next = (person.next || 1) + 1;
      await Store.write('pk_img_' + id, { data });
      PACK_IMG[id] = data;
      person.photos.push(Object.assign({ id, desc: '' }, guessTags(f.name)));
      added.push(id);
      done++;
    } catch (e) { toast(`Impossible d’importer ${str(f.name, 40)}.`, 'bad'); }
  }
  S.atelier.busy = '';
  if (added.length >= 2) S.atelier.ask = { pid: person.id, ids: added }; // several at once: maybe one shoot
  await saveAtelier(true);
  if (done) toast(`${done} ${plural(done, 'photo ajoutée', 'photos ajoutées')}. Ajoute leur description et leurs tags.`, 'good');
}
// A series: photos of the same shoot (same outfit, same place). The game never posts two of them a few days apart:
// they come out together as a carousel, or one of them alone. They share their season and their moment.
function nextSetId(person) {
  let n = 0;
  for (const ph of person.photos) { const m = /^s(\d+)$/.exec(ph.set || ''); if (m) n = Math.max(n, parseInt(m[1], 10)); }
  return 's' + (n + 1);
}
function makeSeries(person, ids) {
  const list = person.photos.filter((ph) => ids.includes(ph.id));
  if (list.length < 2) return false;
  const sid = nextSetId(person), first = list[0];
  const old = new Set(list.map((ph) => ph.set).filter(Boolean));
  for (const ph of list) { ph.set = sid; ph.season = first.season; ph.moment = first.moment; }
  for (const o of old) { const left = person.photos.filter((x) => x.set === o); if (left.length < 2) left.forEach((x) => { x.set = ''; }); } // what is left of their old series
  // the photos of a series stay together, where the first one was
  const at = person.photos.indexOf(first);
  const rest = person.photos.filter((ph) => !list.includes(ph));
  rest.splice(person.photos.slice(0, at).filter((ph) => !list.includes(ph)).length, 0, ...list);
  person.photos = rest;
  if (S.atelier.ask && S.atelier.ask.pid === person.id) S.atelier.ask = null;
  saveAtelier();
  return true;
}
function undoSeries(person, sid) { for (const ph of person.photos) if (ph.set === sid) ph.set = ''; saveAtelier(); }
function leaveSeries(person, ph) {
  const sid = ph.set;
  ph.set = '';
  const left = person.photos.filter((x) => x.set === sid);
  if (left.length < 2) left.forEach((x) => { x.set = ''; });
  saveAtelier();
}
function setSeries(person, sid, k, v) { for (const ph of person.photos) if (ph.set === sid) ph[k] = v; saveAtelier(); }
function removePhotoAt(person, ph) {
  person.photos = person.photos.filter((x) => x !== ph);
  if (ph.set && person.photos.filter((x) => x.set === ph.set).length < 2) person.photos.forEach((x) => { if (x.set === ph.set) x.set = ''; });
  Store.remove('pk_img_' + ph.id).catch(() => {});
  delete PACK_IMG[ph.id];
  saveAtelier();
}
function removePerson(person) {
  for (const ph of person.photos) Store.remove('pk_img_' + ph.id).catch(() => {});
  if (person.portrait) Store.remove('pk_img_' + person.portrait).catch(() => {});
  S.atelier.meta.people = S.atelier.meta.people.filter((p) => p !== person);
  S.atelier.sel = S.atelier.meta.people.length ? S.atelier.meta.people[0].id : null;
  saveAtelier();
}
async function imgData(id) {
  const v = PACK_IMG[id];
  if (typeof v === 'string' && v.startsWith('data:')) return v;
  const b = await Store.read('pk_img_' + id).catch(() => null);
  return b && typeof b.data === 'string' && b.data.startsWith('data:image/') ? b.data : null;
}
// The whole pack in one file (format « hype-pack »): what tools/pack.py turns into the pack shipped with the game.
async function packExportText() {
  const people = [];
  for (const p of S.atelier.meta.people) {
    const photos = [];
    for (const ph of p.photos) {
      const img = await imgData(ph.id);
      if (img) photos.push({ id: ph.id, season: ph.season, moment: ph.moment, set: ph.set || '', tags: ph.tags || [], desc: ph.desc || '', img });
    }
    people.push({ id: p.id, g: p.g, style: p.style, label: p.label, look: p.look || '', profile: p.profile || '', portrait: p.portrait ? await imgData(p.portrait) : null, photos });
  }
  return JSON.stringify({ format: 'hype-pack', v: 2, app: APP_VERSION, made: new Date().toISOString(), people });
}
async function exportPack() {
  if (!S.atelier.meta.people.length) { toast('Ton atelier est vide : ajoute d’abord des personnes.', 'bad'); return; }
  S.atelier.busy = 'Préparation du pack…';
  update(false);
  try {
    const text = await packExportText();
    const name = `hype-pack-photos-${new Date().toISOString().slice(0, 10)}.json`;
    if (HOST && HOST.saveFile) { if (await HOST.saveFile(name, text, 'pack')) toast('Pack exporté : envoie ce fichier pour qu’il soit ajouté au jeu.', 'good'); }
    else toast('L’export du pack se fait dans l’appli PC (Hype pour ChatGPT).', 'bad');
  } catch (e) { toast('Export impossible pour l’instant.', 'bad'); }
  S.atelier.busy = '';
  update(false);
}
const DATA_IMG = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/;
// Replaces the atelier with a pack file (the creator's own export, on another computer or after a reinstall).
async function packImportText(text) {
  let o = null;
  try { o = JSON.parse(text); } catch (e) { o = null; }
  if (!o || o.format !== 'hype-pack' || !Array.isArray(o.people)) throw new Error('format');
  await clearAtelierDocs();
  const people = [];
  for (const x of o.people.slice(0, 80)) {
    const p = cleanPerson(Object.assign({}, x, { portrait: null, photos: [] }), true);
    if (!p || people.some((y) => y.id === p.id)) continue;
    const meta = { id: p.id, g: p.g, style: p.style, label: p.label, look: p.look, profile: p.profile, portrait: null, photos: [], next: 1 };
    if (typeof x.portrait === 'string' && x.portrait.length < 900000 && DATA_IMG.test(x.portrait)) {
      const id = p.id + '-p';
      await Store.write('pk_img_' + id, { data: x.portrait });
      PACK_IMG[id] = x.portrait;
      meta.portrait = id;
    }
    for (const y of (Array.isArray(x.photos) ? x.photos : []).slice(0, PH_PER_PERSON)) {
      const ph = cleanPhoto(y, true);
      if (!ph || !ph.id.startsWith(p.id + '-') || typeof y.img !== 'string' || y.img.length > 1200000 || !DATA_IMG.test(y.img)) continue;
      await Store.write('pk_img_' + ph.id, { data: y.img });
      PACK_IMG[ph.id] = y.img;
      meta.photos.push({ id: ph.id, season: ph.season, moment: ph.moment, set: ph.set, tags: ph.tags, desc: ph.desc });
      const k = parseInt(ph.id.slice(p.id.length + 1), 10);
      if (k >= meta.next) meta.next = k + 1;
    }
    people.push(meta);
  }
  S.atelier.meta = { v: 2, people };
  S.atelier.sel = people.length ? people[0].id : null;
  await saveAtelier(true);
  return people.length;
}
async function clearAtelierDocs() {
  for (const p of S.atelier.meta.people) {
    if (p.portrait) await Store.remove('pk_img_' + p.portrait).catch(() => {});
    for (const ph of p.photos) await Store.remove('pk_img_' + ph.id).catch(() => {});
  }
  for (const k in PACK_IMG) delete PACK_IMG[k];
}
async function importPackFrom(text) {
  S.atelier.busy = 'Import du pack…';
  update(false);
  try { const n = await packImportText(text); toast(`Pack importé : ${n} ${plural(n, 'personne', 'personnes')}.`, 'good'); }
  catch (e) { toast(e && e.message === 'format' ? 'Ce fichier n’est pas un pack photos Hype.' : 'Import impossible pour l’instant.', 'bad'); }
  S.atelier.busy = '';
  update(false);
}
async function clearAtelier() {
  await clearAtelierDocs();
  S.atelier.meta = { v: 2, people: [] };
  S.atelier.sel = null;
  await saveAtelier(true);
  toast('Atelier vidé.');
}

/* =========================================================
   Screens: the Insta-like page, the TikTok-like slideshows, the photos in the feed, the atelier
   ========================================================= */
// A slideshow: the photos follow each other, a bar per photo at the top; tap the left side to go back, the right to go on.
function SlideShow({ srcs, dur = 3200, children, label }) {
  const [k, setK] = useState(0);
  const n = srcs.length;
  useEffect(() => {
    if (n < 2) return undefined;
    const id = setTimeout(() => setK((x) => (x + 1) % n), dur);
    return () => clearTimeout(id);
  }, [k, n]);
  const go = (d) => setK((x) => (x + d + n) % n);
  const src = srcs[Math.min(k, n - 1)];
  return html`<div class="ss" role="group" aria-roledescription="diaporama" aria-label=${label || 'Diaporama'}>
    <div class="ss-bars" aria-hidden="true">${srcs.map((_, j) => html`<i key=${j} class=${j < k ? 'done' : ''}>${j === k ? html`<b key=${'r' + k} style=${'--d:' + dur + 'ms'}></b>` : null}</i>`)}</div>
    <div class="ss-img" key=${k}>${src ? html`<img class="ss-bg" src=${src} alt="" /><img class="ss-fg" src=${src} alt="" />` : html`<span class="ss-wait"><${Typing} /></span>`}</div>
    <button type="button" class="ss-prev" onClick=${() => go(-1)} aria-label="Photo précédente"></button>
    <button type="button" class="ss-next" onClick=${() => go(1)} aria-label="Photo suivante"></button>
    ${children}
  </div>`;
}
// Several photos in one post, swiped like on Insta: a counter, dots, arrows on a computer; the first one is the cover.
function Carousel({ srcs, label }) {
  const [k, setK] = useState(0);
  const ref = useRef(null);
  const n = srcs.length;
  const onScroll = (e) => { const el = e.currentTarget, i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth)); if (i !== k) setK(clamp(i, 0, n - 1)); };
  const go = (d) => { const el = ref.current; if (el) el.scrollTo({ left: clamp(k + d, 0, n - 1) * el.clientWidth, behavior: 'smooth' }); };
  return html`<div class="carousel" role="group" aria-roledescription="carrousel" aria-label=${label || 'Carrousel de photos'}>
    <div class="car-track" ref=${ref} onScroll=${onScroll}>
      ${srcs.map((src, i) => html`<div class="car-slide" key=${i}>${src ? html`<img src=${src} alt="" loading="lazy" decoding="async" />` : html`<span class="ss-wait"><${Typing} /></span>`}</div>`)}
    </div>
    <span class="car-count">${k + 1}/${n}</span>
    ${k > 0 ? html`<button type="button" class="car-nav prev" onClick=${stop(() => go(-1))} aria-label="Photo précédente"><${Icon} n="back" s=${16} /></button>` : null}
    ${k < n - 1 ? html`<button type="button" class="car-nav next" onClick=${stop(() => go(1))} aria-label="Photo suivante"><${Icon} n="back" s=${16} /></button>` : null}
    <div class="car-dots" aria-hidden="true">${srcs.map((_, i) => html`<i key=${i} class=${i === k ? 'on' : ''}></i>`)}</div>
  </div>`;
}
// The Insta-like page: a header, highlights (only in the creator's preview), a grid of photos; a photo opens on its own
// with likes and comments.
// prof: { name, handle, role, bio, followers, following, avatar (author), follow: { on, run }, dm }
// items: [{ id, src, srcs (a carousel), cap, lk, liked, at, cm: [[name, text]], post }]
function IgView({ prof, items, highlights, open, setOpen, onLike, preview, now, g }) {
  const [story, setStory] = useState(null);
  const sel = open ? items.find((x) => x.id === open) : null;
  if (sel) return html`<${IgPost} prof=${prof} it=${sel} onLike=${onLike} now=${now} g=${g} preview=${preview} />`;
  return html`<div class="ig">
    <header class="ig-head">
      <span class="ig-ring"><${Avatar} who=${prof.avatar} size=${86} /></span>
      <div class="ig-counts">
        <span><b>${fmtN(items.length)}</b>${plural(items.length, 'publication', 'publications')}</span>
        <span><b>${fmtN(prof.followers)}</b>${plural(prof.followers, 'abonné', 'abonnés')}</span>
        <span><b>${fmtN(prof.following)}</b>${plural(prof.following, 'abonnement', 'abonnements')}</span>
      </div>
    </header>
    <div class="ig-bio"><b>${prof.name}</b>${prof.role ? html`<span class="ig-role">${prof.role}</span>` : null}${prof.bio ? html`<p>${prof.bio}</p>` : null}</div>
    ${preview ? null : html`<div class="ig-actions">
      ${prof.follow ? html`<button type="button" class=${'btn btn-sm ' + (prof.follow.on ? 'btn-ghost' : 'btn-hot')} onClick=${prof.follow.run}>${prof.follow.on ? 'Abonné·e' : 'Suivre'}</button>` : null}
      ${prof.dm ? html`<button type="button" class="btn btn-ghost btn-sm" onClick=${prof.dm}>Message</button>` : null}
    </div>`}
    ${highlights.length ? html`<div class="ig-hl" role="list" aria-label="Stories à la une">${highlights.map((h) => html`<button type="button" role="listitem" key=${h.key} class="ig-hl-it" onClick=${() => setStory(h)}>
      <span class="ig-hl-c">${h.cover ? html`<img src=${h.cover} alt="" loading="lazy" />` : h.emoji}</span><span>${h.label}</span></button>`)}</div>` : null}
    <div class="ig-tabs" aria-hidden="true"><span class="on"><${Icon} n="grid" s=${20} /></span></div>
    ${items.length ? html`<div class="ig-grid">${items.map((it) => html`<button type="button" key=${it.id} class="ig-cell" onClick=${() => setOpen(it.id)} aria-label=${(it.srcs && it.srcs.length > 1 ? `Carrousel de ${it.srcs.length} photos : ` : 'Photo : ') + (it.cap || 'sans légende')}>
      ${it.src ? html`<img src=${it.src} alt="" loading="lazy" decoding="async" />` : null}${it.srcs && it.srcs.length > 1 ? html`<span class="ig-multi" aria-hidden="true"><${Icon} n="stack" s=${18} /></span>` : null}</button>`)}</div>`
      : html`<div class="empty"><span>Pas encore de publication.</span></div>`}
    ${story ? html`<div class="story-ov" role="dialog" aria-modal="true" aria-label=${'Story à la une : ' + story.label}>
      <${SlideShow} key=${story.key} srcs=${story.srcs} label=${story.label}>
        <div class="story-top"><${Avatar} who=${prof.avatar} size=${30} /><b>${prof.handle}</b><span>${story.label}</span>
          <button type="button" class="iconbtn" onClick=${() => setStory(null)} aria-label="Fermer"><${Icon} n="x" s=${22} /></button></div>
      <//>
    </div>` : null}
  </div>`;
}
function IgPost({ prof, it, onLike, now, g, preview }) {
  const [burst, setBurst] = useState(0);
  const last = useRef(0);
  const like = (force) => { if (preview) return; if (!it.liked || !force) onLike(it); if (force || !it.liked) setBurst((x) => x + 1); };
  const tap = () => { const t = Date.now(); if (t - last.current < 320) { like(true); last.current = 0; } else last.current = t; };
  const d = gameDate(it.at);
  return html`<article class="ig-post">
    <header class="ig-post-h"><${Avatar} who=${prof.avatar} size=${32} /><b>${prof.handle}</b>${it.at ? html`<span>· ${fmtAgo(it.at, now)}</span>` : null}</header>
    <div class="ig-media" onClick=${tap} onDblClick=${(e) => { e.preventDefault(); }} role="img" aria-label=${it.cap || 'Photo'}>
      ${it.srcs && it.srcs.length > 1 ? html`<${Carousel} srcs=${it.srcs} label=${it.cap} />` : it.src ? html`<img src=${it.src} alt="" decoding="async" />` : html`<span class="ss-wait"><${Typing} /></span>`}
      ${burst ? html`<span class="ig-burst" key=${burst} aria-hidden="true"><${Icon} n="heart" s=${88} fill=${true} /></span>` : null}
    </div>
    <div class="ig-acts">
      <button type="button" class=${'iconbtn' + (it.liked ? ' liked' : '')} onClick=${() => like(false)} aria-pressed=${it.liked ? 'true' : 'false'} aria-label="J’aime" disabled=${preview}><${Icon} n="heart" s=${24} fill=${!!it.liked} /></button>
      ${it.post && g ? html`<button type="button" class="iconbtn" onClick=${() => openPost(it.post)} aria-label="Voir les réactions"><${Icon} n="msg" s=${23} /></button>` : html`<span class="iconbtn" aria-hidden="true"><${Icon} n="msg" s=${23} /></span>`}
      <span class="iconbtn" aria-hidden="true"><${Icon} n="send" s=${22} /></span>
      <span class="sp"></span>
      <span class="iconbtn" aria-hidden="true"><${Icon} n="bookmark" s=${22} /></span>
    </div>
    <div class="ig-txt">
      <b class="ig-likes">${fmtN(it.lk + (it.liked ? 1 : 0))} J’aime</b>
      ${it.cap ? html`<p><b>${prof.handle}</b> ${it.cap}</p>` : null}
      ${(it.cm || []).map((x, k) => html`<p key=${k} class="ig-cm"><b>${x[0]}</b> ${x[1]}</p>`)}
      ${it.post && g && g.posts.some((p) => p.id === it.post) ? html`<button type="button" class="linkbtn" onClick=${() => openPost(it.post)}>Voir les réactions sur le réseau</button>` : null}
      ${it.at ? html`<small class="ig-date">${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</small>` : null}
    </div>
  </article>`;
}
// The highlights of a person: their photos by place (two at least), like stories kept on the profile.
function highlightsOf(p, srcOf) {
  const by = {};
  for (const ph of p.photos) for (const k of ph.keys) (by[k] = by[k] || []).push(ph);
  return Object.keys(by).filter((k) => by[k].length >= 2).sort((a, b) => by[b].length - by[a].length).slice(0, 5)
    .map((k) => ({ key: k, label: TAG_GROUPS[k][1], emoji: TAG_GROUPS[k][0], cover: srcOf(by[k][0]), srcs: by[k].map(srcOf) }));
}
const igName = (g, a) => author(g, a).name;
function InstaLayer({ l, g, now, i }) {
  if (l.id === 'p') return html`<${PlayerInstaLayer} l=${l} g=${g} now=${now} i=${i} />`; // the player's own page (media.js)
  const c = g.chars[l.id];
  const p = c ? faceOf(g, c) : null;
  const [open, setOpen] = useState(l.post || null);
  const title = pfName(g, 'instagram');
  if (!c || !p) return html`<${LayerShell} i=${i} title=${title}><div class="empty"><b>Rien à voir ici</b></div><//>`;
  const items = igList(g, c, now).map((e) => ({
    id: e.id, src: photoSrcById(e.ph), srcs: e.more && e.more.length ? [e.ph, ...e.more].map(photoSrcById) : null,
    cap: e.cap || emojiCaption(PACK.photos[e.ph].ph), lk: e.lk, liked: !!e.liked, at: e.at, post: e.p || null, e,
    cm: (e.cm || []).map(([a, k]) => [igName(g, a), igCommentText(k)]),
  }));
  const prof = {
    name: c.name, handle: c.handle, role: c.role, bio: c.bio, followers: c.followers, following: 60 + (hashStr(c.handle) % 840),
    avatar: author(g, 'c:' + c.id), follow: { on: c.youFollow, run: () => toggleFollow(c) }, dm: DM_KINDS.includes(c.kind) ? () => openDM(c.id) : null,
  };
  const onLike = (it) => { const e = it.e; e.liked = !e.liked; if (e.liked && !e.lr) { e.lr = 1; freeRel(c, 1); } update(); };
  return html`<${LayerShell} i=${i} title=${title} onBack=${open ? () => setOpen(null) : null}
    head=${html`<div class="ig-title"><b>${c.handle}</b><span>${title}</span></div>`}>
    <${IgView} prof=${prof} items=${items} highlights=${[]} open=${open} setOpen=${setOpen} onLike=${onLike} now=${now} g=${g} />
  <//>`;
}
// The TikTok-like page: one slideshow at a time, the next one with the arrows (or a swipe).
function TikTokLayer({ l, g, now, i }) {
  if (l.id === 'p') return html`<${PlayerTikTokLayer} l=${l} g=${g} now=${now} i=${i} />`; // the player's own slideshows (media.js)
  const c = g.chars[l.id];
  const list = c ? ttList(g, c, now) : [];
  const [n, setN] = useState(Math.max(0, list.findIndex((s) => s.id === l.s)));
  const start = useRef(null), wheelAt = useRef(0);
  const title = pfName(g, 'tiktok');
  const s = list[Math.min(n, list.length - 1)];
  if (!c || !s) return html`<${LayerShell} i=${i} title=${title}><div class="empty"><b>Pas encore de diaporama</b></div><//>`;
  const au = author(g, 'c:' + c.id);
  const go = (d) => setN((x) => clamp(x + d, 0, list.length - 1));
  const like = () => { s.liked = !s.liked; if (s.liked && !s.lr) { s.lr = 1; freeRel(c, 1); } update(); };
  const cm = Math.round(s.lk * 0.04) + 2;
  return html`<${LayerShell} i=${i} title=${title} dark=${true}
    head=${html`<div class="ig-title"><b>@${c.handle}</b><span>${title} · ${n + 1} sur ${list.length}</span></div>`}>
    <div class="tt" onPointerDown=${(e) => { start.current = e.clientY; }} onPointerUp=${(e) => { if (start.current != null && Math.abs(e.clientY - start.current) > 70) go(e.clientY < start.current ? 1 : -1); start.current = null; }}
      onWheel=${(e) => { const t = Date.now(); if (Math.abs(e.deltaY) > 40 && t - wheelAt.current > 700) { wheelAt.current = t; go(e.deltaY > 0 ? 1 : -1); } }}>
      <${SlideShow} key=${s.id} srcs=${s.phs.map(photoSrcById)} dur=${2800} label=${s.ti}>
        <p class="tt-title">${s.ti}</p>
        <div class="tt-rail">
          <${Avatar} who=${au} size=${44} />
          <button type="button" class=${'tt-btn' + (s.liked ? ' liked' : '')} onClick=${like} aria-pressed=${s.liked ? 'true' : 'false'} aria-label="J’aime"><${Icon} n="heart" s=${30} fill=${true} /><span>${fmtN(s.lk + (s.liked ? 1 : 0))}</span></button>
          ${s.p && g.posts.some((p) => p.id === s.p) ? html`<button type="button" class="tt-btn" onClick=${() => openPost(s.p)} aria-label="Voir les réactions"><${Icon} n="msg" s=${28} fill=${true} /><span>${fmtN(cm)}</span></button>` : html`<span class="tt-btn"><${Icon} n="msg" s=${28} fill=${true} /><span>${fmtN(cm)}</span></span>`}
          <span class="tt-btn"><${Icon} n="repeat" s=${28} /><span>${fmtN(Math.round(s.lk * 0.02) + 1)}</span></span>
        </div>
        <div class="tt-foot"><b>@${c.handle}</b><span>${fmtAgo(s.at, now)}</span><small><${Icon} n="music" s=${13} /> son original · ${c.name}</small></div>
      <//>
      <div class="tt-nav">
        <button type="button" class="iconbtn" onClick=${() => go(-1)} disabled=${n <= 0} aria-label="Diaporama précédent"><${Icon} n="chevup" s=${24} /></button>
        <button type="button" class="iconbtn" onClick=${() => go(1)} disabled=${n >= list.length - 1} aria-label="Diaporama suivant"><${Icon} n="chevdown" s=${24} /></button>
      </div>
    </div>
  <//>`;
}
// On a character's profile: their Insta and their TikTok.
function SocialLinks({ g, c, now }) {
  const p = faceOf(g, c);
  if (!p || !p.photos.length) return null; // a face without photos: just the profile photo
  const ig = igList(g, c, now).length, tt = c.tt ? ttList(g, c, now).length : 0;
  return html`<div class="soc-links">
    <button type="button" class="soc-btn is-ig" onClick=${() => openLayer({ t: 'insta', id: c.id })}><span class="soc-ic" aria-hidden="true">📸</span><span><b>${pfName(g, 'instagram')}</b><small>${ig} ${plural(ig, 'publication', 'publications')}</small></span></button>
    ${c.tt ? html`<button type="button" class="soc-btn is-tt" onClick=${() => openLayer({ t: 'tiktok', id: c.id })} disabled=${!tt}><span class="soc-ic" aria-hidden="true">🎵</span><span><b>${pfName(g, 'tiktok')}</b><small>${tt} ${plural(tt, 'diaporama', 'diaporamas')}</small></span></button>` : null}
  </div>`;
}
// A real photo in a post of the feed (or a carousel, swiped in place): it opens on the character's Insta.
function RealPhoto({ g, p, ph }) {
  const x = PACK.photos[ph.img];
  const src = x ? phSrc(x.p, x.ph) : null;
  const c = p && p.a && p.a.startsWith('c:') ? g.chars[p.a.slice(2)] : null;
  const e = c && c.ig ? c.ig.find((y) => y.p === p.id) : null;
  const open = () => { if (c && e && faceOf(g, c) && inWindow(e.at, Date.now())) openLayer({ t: 'insta', id: c.id, post: e.id }); };
  const more = (ph.more || []).filter((id) => PACK.photos[id]);
  if (more.length) return html`<div class="photo real is-car" onClick=${stop(open)}><${Carousel} srcs=${[ph.img, ...more].map(photoSrcById)} label=${x && x.ph.tags.length ? 'Photos : ' + x.ph.tags.join(', ') : 'Photos'} /></div>`;
  return html`<button type="button" class="photo real" onClick=${stop(open)} aria-label=${x && x.ph.tags.length ? 'Photo : ' + x.ph.tags.join(', ') : 'Photo'}>${src ? html`<img src=${src} alt="" loading="lazy" decoding="async" />` : null}</button>`;
}
// A slideshow announced in the feed: three of its photos; it opens on the TikTok-like page.
function SlidesCard({ g, p }) {
  const c = g.chars[p.slides.c];
  const s = c && c.tt ? c.tt.find((x) => x.id === p.slides.s) : null;
  if (!s || !s.phs.every((id) => PACK.photos[id])) return null;
  return html`<button type="button" class="slides-card" onClick=${stop(() => { if (inWindow(s.at, Date.now())) openLayer({ t: 'tiktok', id: c.id, s: s.id }); })} aria-label=${'Voir le diaporama : ' + s.ti}>
    ${s.phs.slice(0, 3).map((id) => { const src = photoSrcById(id); return html`<span key=${id}>${src ? html`<img src=${src} alt="" loading="lazy" />` : null}</span>`; })}
    <span class="slides-play"><${Icon} n="play" s=${18} fill=${true} /> ${s.phs.length} photos</span>
  </button>`;
}

/* ---------- the atelier ---------- */
function Atelier({ now }) {
  const A = S.atelier;
  const people = A.meta.people;
  const sel = A.sel ? atPerson(A.sel) : null;
  const fileRef = useRef(null);
  const [wipe, setWipe] = useState(false);
  const [preview, setPreview] = useState(false);
  const cnt = { f: 0, m: 0, x: 0 };
  let photos = 0;
  for (const p of people) { cnt[p.g]++; photos += p.photos.length; }
  const goal = PACK_GOAL.f + PACK_GOAL.m + PACK_GOAL.x;
  const importFile = async () => {
    if (HOST && HOST.openFile) { const f = await HOST.openFile('pack'); if (f && typeof f.text === 'string') await importPackFrom(f.text); return; }
    if (fileRef.current) fileRef.current.click();
  };
  return html`<div class="screen atelier"><div class="screen-in">
    <div class="at-top">
      <button type="button" class="iconbtn" onClick=${closeAtelier} aria-label="Retour à l’accueil"><${Icon} n="back" /></button>
      <h1 class="h-lg">Atelier photos</h1>
      <span class="at-state">${A.busy ? html`<${Typing} /> ${A.busy}` : A.saving ? 'Enregistrement…' : A.err ? html`<span class="bad">${A.err}</span>` : A.savedAt ? 'Enregistré ✓' : ''}</span>
    </div>
    <p class="lede">Ton pack : les personnes qui jouent les persos principaux, leur photo de profil et leurs photos. Le jeu pioche dedans tout seul, sans IA : la saison et les fêtes de la date du jeu, l’heure, ce que les persos racontent.</p>
    <div class="at-goal">
      <span class=${'chip' + (cnt.f >= PACK_GOAL.f ? ' good' : '')}>Femmes ${cnt.f}/${PACK_GOAL.f}</span>
      <span class=${'chip' + (cnt.m >= PACK_GOAL.m ? ' good' : '')}>Hommes ${cnt.m}/${PACK_GOAL.m}</span>
      <span class=${'chip' + (cnt.x >= PACK_GOAL.x ? ' good' : '')}>Look androgyne ${cnt.x}/${PACK_GOAL.x}</span>
      <span class=${'chip' + (photos >= goal * PACK_GOAL.photos ? ' good' : '')}>Photos ${photos}/${goal * PACK_GOAL.photos}</span>
    </div>
    ${HOST ? null : html`<div class="notice"><${Icon} n="alert" /><p>Ici, la place est comptée : pour tout le pack, travaille plutôt dans l’appli PC (Hype pour ChatGPT), qui range les photos sur ton ordi.</p></div>`}
    <div class="at-people">
      ${people.map((p) => { const pt = p.portrait ? localImg(p.portrait) : null; const miss = p.photos.filter((x) => !x.desc).length; return html`<button type="button" key=${p.id} class=${'at-pcard' + (sel === p ? ' on' : '')} onClick=${() => { S.atelier.sel = p.id; update(false); }}>
        <span class="at-pt">${pt ? html`<img src=${pt} alt="" />` : html`<${Icon} n="user" s=${26} />`}</span>
        <span class="at-pmain"><b>${p.label || p.id}</b><small>${{ f: 'Femme', m: 'Homme', x: 'Look androgyne' }[p.g]} · ${p.photos.length} ${plural(p.photos.length, 'photo', 'photos')}</small>
          ${!p.portrait ? html`<small class="warn">sans photo de profil</small>` : !p.profile ? html`<small class="warn">sans profil</small>` : miss ? html`<small class="warn">${miss} sans description</small>` : null}</span>
      </button>`; })}
      <div class="at-add">
        ${PH_GENDERS.map(([k, lb]) => html`<button type="button" key=${k} class="btn btn-ghost btn-sm" onClick=${() => addPerson(k)}><${Icon} n="plus" s=${15} /> ${lb}</button>`)}
      </div>
    </div>
    ${sel ? html`<${AtPerson} p=${sel} onPreview=${() => setPreview(true)} />` : people.length ? null : html`<div class="empty"><b>Commence par ajouter une personne</b><span>Objectif : ${PACK_GOAL.f} femmes, ${PACK_GOAL.m} hommes et ${PACK_GOAL.x} personnes au look androgyne, avec une photo de profil et ${PACK_GOAL.photos} photos chacune.</span></div>`}
    <section class="section at-pack">
      <div class="section-h"><h3>Ton pack</h3><span>${people.length} ${plural(people.length, 'personne', 'personnes')} · ${photos} ${plural(photos, 'photo', 'photos')}</span></div>
      <p class="muted">Quand il te plaît, exporte-le : ça donne un seul fichier, à envoyer pour qu’il soit ajouté au jeu de tout le monde. Dans tes parties à toi, il marche déjà.</p>
      <div class="row">
        <button type="button" class="btn btn-hot btn-sm" onClick=${exportPack} disabled=${!!A.busy || !people.length}><${Icon} n="download" s=${15} /> Exporter le pack</button>
        <button type="button" class="btn btn-ghost btn-sm" onClick=${importFile} disabled=${!!A.busy}><${Icon} n="upload" s=${15} /> Importer un pack</button>
        ${wipe ? html`<button type="button" class="btn btn-danger-solid btn-sm" onClick=${() => { setWipe(false); clearAtelier(); }}>Oui, tout effacer</button><button type="button" class="linkbtn" onClick=${() => setWipe(false)}>Annuler</button>`
          : html`<button type="button" class="linkbtn quiet" onClick=${() => setWipe(true)} disabled=${!people.length}>Tout effacer</button>`}
      </div>
      <input ref=${fileRef} type="file" accept=".json,application/json" hidden onChange=${async (ev) => { const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; if (f) await importPackFrom(await f.text()); }} />
      <small class="muted">Importer un pack remplace ce qu’il y a dans l’atelier.</small>
    </section>
    ${preview && sel ? html`<${AtPreview} p=${sel} close=${() => setPreview(false)} now=${now} />` : null}
  </div></div>`;
}
function AtPerson({ p, onPreview }) {
  const ptRef = useRef(null), phRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [del, setDel] = useState(false);
  const [pick, setPick] = useState(null); // grouping photos into a series: the ids ticked so far
  const pt = p.portrait ? localImg(p.portrait) : null;
  const set = (k, v) => { p[k] = v; saveAtelier(); };
  const cov = { all: 0, ete: 0, hiver: 0, mi: 0 };
  for (const ph of p.photos) cov[ph.season]++;
  const missing = ['ete', 'hiver', 'mi'].filter((k) => !cov[k]);
  // the photos as they will come out: a series together, a photo on its own alone
  const blocks = [], seen = new Set();
  for (const ph of p.photos) {
    if (seen.has(ph.id)) continue;
    const grp = ph.set ? p.photos.filter((x) => x.set === ph.set) : [ph];
    grp.forEach((x) => seen.add(x.id));
    blocks.push(grp.length >= 2 ? { set: ph.set, photos: grp } : { set: '', photos: [ph] });
  }
  const nSeries = blocks.filter((b) => b.set).length;
  const ask = S.atelier.ask && S.atelier.ask.pid === p.id ? S.atelier.ask.ids.filter((id) => p.photos.some((ph) => ph.id === id)) : [];
  const toggle = (id) => setPick((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  return html`<section class="section at-person">
    <div class="at-ph-head">
      <button type="button" class="at-portrait" onClick=${() => ptRef.current && ptRef.current.click()} aria-label="Choisir la photo de profil">
        ${pt ? html`<img src=${pt} alt="" />` : html`<span><${Icon} n="camera" s=${24} /><small>Photo de profil</small></span>`}
      </button>
      <input ref=${ptRef} type="file" accept="image/*" hidden onChange=${(ev) => { const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; if (f) setPortrait(p, f); }} />
      <div class="at-fields">
        <label class="field"><span class="lbl">Nom de code</span><input class="input" value=${p.label} maxlength="30" onInput=${(e) => set('label', e.target.value)} /></label>
        <div class="field"><span class="lbl">Genre</span><${Seg} items=${PH_GENDERS} value=${p.g} onPick=${(k) => set('g', k)} label="Genre" /></div>
        <label class="field"><span class="lbl">Univers</span><select class="input" value=${p.style} onChange=${(e) => set('style', e.target.value)}>${PH_STYLES.map(([k, lb]) => html`<option key=${k} value=${k}>${lb}</option>`)}</select>
          <small>« Monde actuel » sert aussi à l’Académie Lumen.</small></label>
        <label class="field"><span class="lbl">Son look en quelques mots (facultatif)</span><input class="input" value=${p.look || ''} maxlength="60" placeholder="ex : cheveux bouclés bruns, lunettes rondes" onInput=${(e) => set('look', e.target.value)} />
          <small>L’IA s’en sert pour parler de son apparence sans se tromper.</small></label>
        <label class="field at-profile"><span class="lbl">Son profil <small>${(p.profile || '').length}/${PH_PROFILE_MAX}</small></span>
          <textarea class="input" rows="3" maxlength=${PH_PROFILE_MAX} placeholder="Ses passions, son univers, son humeur, ce qui ne lui ressemble pas (3 ou 4 phrases)." value=${p.profile || ''} onInput=${(e) => set('profile', e.target.value)}></textarea>
          <small>À chaque nouvelle partie, l’IA construit le perso autour : nom, rôle et caractère changent, ses passions restent.</small></label>
      </div>
    </div>
    <div class="row at-tools">
      <button type="button" class="btn btn-ghost btn-sm" onClick=${onPreview} disabled=${!p.photos.length}><${Icon} n="grid" s=${15} /> Aperçu façon Insta</button>
      <button type="button" class="btn btn-ghost btn-sm" onClick=${() => setPick(pick ? null : [])} disabled=${p.photos.length < 2} aria-pressed=${pick ? 'true' : 'false'}><${Icon} n="stack" s=${15} /> ${pick ? 'Fini de grouper' : 'Grouper en série'}</button>
      ${del ? html`<button type="button" class="btn btn-danger-solid btn-sm" onClick=${() => removePerson(p)}>Oui, supprimer ${p.label || 'cette personne'}</button><button type="button" class="linkbtn" onClick=${() => setDel(false)}>Annuler</button>`
        : html`<button type="button" class="linkbtn quiet" onClick=${() => setDel(true)}>Supprimer cette personne</button>`}
    </div>
    <div class="at-cover">
      ${PH_SEASONS.map(([k, lb]) => html`<span key=${k} class="chip">${lb} · ${cov[k]}</span>`)}
      ${nSeries ? html`<span class="chip hot">${nSeries} ${plural(nSeries, 'série', 'séries')}</span>` : null}
      ${p.photos.length && missing.length ? html`<small class="warn">Pas encore de photo ${missing.map((k) => ({ ete: 'd’été', hiver: 'd’hiver', mi: 'de mi-saison' }[k])).join(', ')} : les « toute l’année » prennent le relais.</small>` : null}
    </div>
    <label class=${'at-drop' + (drag ? ' on' : '')} onDragOver=${(e) => { e.preventDefault(); if (!drag) setDrag(true); }} onDragLeave=${() => setDrag(false)}
      onDrop=${(e) => { e.preventDefault(); setDrag(false); addPhotos(p, e.dataTransfer && e.dataTransfer.files); }}>
      <input ref=${phRef} type="file" accept="image/*" multiple class="sr" onChange=${(ev) => { const fs = Array.from(ev.target.files || []); ev.target.value = ''; addPhotos(p, fs); }} />
      <${Icon} n="upload" s=${22} />
      <b>Glisse tes photos ici, ou clique pour en choisir (plusieurs à la fois)</b>
      <small>Astuce : un nom de fichier comme « gaming-marrant-soir.png » remplit déjà les tags, la saison et le moment.</small>
    </label>
    ${ask.length >= 2 ? html`<div class="at-ask" role="group" aria-label="Une série ?">
      <div class="at-ask-imgs">${ask.slice(0, 5).map((id) => { const src = localImg(id); return html`<span key=${id}>${src ? html`<img src=${src} alt="" />` : null}</span>`; })}</div>
      <p><b>Ces ${ask.length} photos vont ensemble ?</b> Le même shooting : même tenue, même lieu. Le jeu ne les postera jamais à quelques jours d’écart : elles sortiront en carrousel, ou l’une d’elles seule, plus tard.</p>
      <div class="row"><button type="button" class="btn btn-hot btn-sm" onClick=${() => makeSeries(p, ask)}>Oui, c’est une série</button><button type="button" class="btn btn-ghost btn-sm" onClick=${() => { S.atelier.ask = null; update(false); }}>Non, des photos séparées</button></div>
    </div>` : null}
    ${pick ? html`<div class="at-pickbar"><span>${pick.length ? `${pick.length} ${plural(pick.length, 'photo cochée', 'photos cochées')}` : 'Coche les photos d’un même shooting'}</span>
      <button type="button" class="btn btn-hot btn-sm" disabled=${pick.length < 2} onClick=${() => { if (makeSeries(p, pick)) setPick(null); }}>Faire une série</button></div>` : null}
    <div class="at-photos">${blocks.map((b) => (b.set
      ? html`<div class="at-series" key=${'s' + b.set}>
          <div class="at-series-h"><b><${Icon} n="stack" s=${15} /> Série · ${b.photos.length} photos</b>
            <div class="at-line"><span>Saison</span><${Seg} items=${PH_SEASONS} value=${b.photos[0].season} onPick=${(k) => setSeries(p, b.set, 'season', k)} label="Saison de la série" /></div>
            <div class="at-line"><span>Moment</span><${Seg} items=${PH_MOMENTS} value=${b.photos[0].moment} onPick=${(k) => setSeries(p, b.set, 'moment', k)} label="Moment de la série" /></div>
            <button type="button" class="linkbtn quiet" onClick=${() => undoSeries(p, b.set)}>Défaire la série</button></div>
          ${b.photos.map((ph) => html`<${AtPhoto} key=${ph.id} p=${p} ph=${ph} inSet=${true} pick=${pick} onPick=${toggle} />`)}
        </div>`
      : html`<${AtPhoto} key=${b.photos[0].id} p=${p} ph=${b.photos[0]} pick=${pick} onPick=${toggle} />`))}</div>
  </section>`;
}
// inSet: in a series (its season and moment are the series'); pick: the grouping mode, with its ticked ids.
function AtPhoto({ p, ph, inSet, pick, onPick }) {
  const src = localImg(ph.id);
  const set = (k, v) => { ph[k] = v; saveAtelier(); };
  const on = !!(pick && pick.includes(ph.id));
  return html`<div class=${'at-photo' + (on ? ' picked' : '')}>
    <div class="at-img">${src ? html`<img src=${src} alt="" />` : null}
      ${pick ? html`<label class="at-tick"><input type="checkbox" checked=${on} onChange=${() => onPick(ph.id)} aria-label="Cocher cette photo" /></label>`
        : html`<button type="button" class="at-x" onClick=${() => removePhotoAt(p, ph)} aria-label="Retirer cette photo" title="Retirer"><${Icon} n="x" s=${16} /></button>`}</div>
    <div class="at-f">
      ${inSet ? html`<button type="button" class="linkbtn quiet at-leave" onClick=${() => leaveSeries(p, ph)}>Sortir de la série</button>`
        : html`<div class="at-line"><span>Saison</span><${Seg} items=${PH_SEASONS} value=${ph.season} onPick=${(k) => set('season', k)} label="Saison" /></div>
      <div class="at-line"><span>Moment</span><${Seg} items=${PH_MOMENTS} value=${ph.moment} onPick=${(k) => set('moment', k)} label="Moment" /></div>`}
      <${TagEditor} tags=${ph.tags || []} get=${() => ph.tags || []} set=${(v) => set('tags', v)} />
      <label class="at-desc"><span>Description pour l’IA <small>${(ph.desc || '').length}/${PH_DESC_MAX}</small></span>
        <textarea class="input" rows="3" maxlength=${PH_DESC_MAX} placeholder="Ce qu’on voit : sa tenue, son humeur, ce qu’il ou elle fait, le décor (2 ou 3 phrases). Les persos s’en servent pour écrire leurs légendes ; les joueurs ne la voient pas." value=${ph.desc || ''} onInput=${(e) => set('desc', e.target.value)}></textarea></label>
    </div>
  </div>`;
}
// The creator's own tags: typed (Entrée or a comma adds one), or one click on a suggestion.
// get: the tags as they are now (a tag typed then a suggestion clicked: the blur adds the first, the click the second).
function TagEditor({ tags, get, set }) {
  const [val, setVal] = useState('');
  const commit = (text) => {
    const add = String(text || '').split(/[,;\n]/).map(cleanTag).filter(Boolean);
    setVal('');
    if (!add.length) return;
    const cur = get ? get() : tags, next = cur.slice();
    for (const x of add) if (!next.includes(x) && next.length < PH_TAG_MAX) next.push(x);
    if (next.length !== cur.length) set(next);
  };
  const sug = TAG_SUGGEST.filter((t) => !tags.includes(t)).slice(0, 16);
  return html`<div class="tag-ed">
    <div class="tag-box">
      ${tags.map((t) => html`<span class="tag" key=${t}>#${t}<button type="button" onClick=${() => set(tags.filter((x) => x !== t))} aria-label=${'Retirer le tag ' + t}><${Icon} n="x" s=${12} /></button></span>`)}
      <input class="tag-in" value=${val} maxlength="60" aria-label="Ajouter un tag" placeholder=${tags.length ? 'un autre tag…' : 'des tags : marrant, gaming…'}
        onInput=${(e) => { const v = e.target.value; if (/[,;]/.test(v)) commit(v); else setVal(v); }}
        onKeyDown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(val); } else if (e.key === 'Backspace' && !val && tags.length) set(tags.slice(0, -1)); }}
        onBlur=${() => { if (val.trim()) commit(val); }} />
    </div>
    ${tags.length < PH_TAG_MAX ? html`<div class="tag-sug">${sug.map((t) => html`<button type="button" key=${t} class="chip-btn" onClick=${() => commit(t)}>+ ${t}</button>`)}</div>` : null}
  </div>`;
}
function AtPreview({ p, close, now }) {
  const [open, setOpen] = useState(null);
  const person = cleanPerson(p, true);
  // a series is one post: a carousel of its photos, as it may come out in the game
  const items = [], done = new Set();
  person.photos.forEach((ph, k) => {
    if (done.has(ph.id)) return;
    const grp = ph.set ? person.photos.filter((x) => x.set === ph.set) : [ph];
    grp.forEach((x) => done.add(x.id));
    const tags = [...new Set(grp.flatMap((x) => x.tags))];
    items.push({ id: ph.id, src: phSrc(person, ph), srcs: grp.length > 1 ? grp.map((x) => phSrc(person, x)) : null, cap: tags.map((t) => '#' + t.replace(/\s+/g, '')).join(' ') || emojiCaption(ph), lk: 120 + ((k * 37) % 300), liked: false, at: 0, cm: [] });
  });
  const prof = { name: p.label || 'Aperçu', handle: 'apercu.' + p.id, role: PH_STYLES.find((x) => x[0] === person.style)[1], bio: person.look, followers: 12400, following: 312,
    avatar: { name: p.label || 'Aperçu', handle: p.id, emoji: '🙂', hue: 300, photo: portraitSrc(person) } };
  return html`<div class="modal at-preview" role="dialog" aria-modal="true" aria-label="Aperçu façon Insta" onClick=${(e) => { if (e.target === e.currentTarget) close(); }}>
    <div class="at-prev-card">
      <div class="at-prev-h">${open ? html`<button type="button" class="iconbtn" onClick=${() => setOpen(null)} aria-label="Retour à la grille"><${Icon} n="back" /></button>` : null}<b>Aperçu</b><span class="muted">dans le jeu, la légende est écrite par le perso</span><button type="button" class="iconbtn" onClick=${close} aria-label="Fermer"><${Icon} n="x" /></button></div>
      <${IgView} prof=${prof} items=${items} highlights=${highlightsOf(person, (ph) => phSrc(person, ph))} open=${open} setOpen=${setOpen} onLike=${() => {}} preview=${true} now=${now} g=${null} />
    </div>
  </div>`;
}
