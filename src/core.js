'use strict';
/* =========================================================
   Utilities
   ========================================================= */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const int = (v, a, b, d) => clamp(Math.round(num(v, d)), a, b);
const str = (v, max = 400) => (typeof v === 'string' ? v : (v == null ? '' : String(v))).replace(/[^\S\u00a0\u202f]+/g, ' ').trim().slice(0, max); // (0.27.8: the no-break spaces stay: « 150 € » never breaks)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cloneJSON = (o) => JSON.parse(JSON.stringify(o));
const ease = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const byteLen = (s) => { try { return new TextEncoder().encode(s).length; } catch (e) { return s.length * 2; } };
let SEQ = 0;
const uid = (p = '') => p + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 7) + (SEQ++).toString(36);
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const nfFull = new Intl.NumberFormat('fr-FR');
const nfCompact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });
function fmtN(n) { n = Math.round(num(n)); return Math.abs(n) < 10000 ? nfFull.format(n) : nfCompact.format(n); }
function fmtPlain(n) { return nfFull.format(Math.round(num(n))); }
function fmtSigned(n) { n = Math.round(num(n)); return (n > 0 ? '+' : n < 0 ? '−' : '±') + fmtN(Math.abs(n)); }
const fmtRel = (r) => (r > 0 ? '+' : '') + r;
const cap1 = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);
// French plural: 0 and 1 take the singular.
const plural = (n, one, many) => (Math.abs(Math.round(num(n))) >= 2 ? many : one);
const nAbonnes = (n, signed) => (signed ? fmtSigned(n) : fmtN(n)) + ' ' + plural(n, 'abonné', 'abonnés');
function fmtAgo(ts, now) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 10) return 'à l’instant';
  if (s < 60) return s + ' s';
  const m = Math.floor(s / 60);
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' h';
  const d = Math.floor(h / 24);
  if (d < 7) return d + ' j';
  return gameDate(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
function fmtDur(ms) {
  const m = Math.max(1, Math.round(ms / 60000));
  if (m < 60) return m + ' min';
  const h = Math.round(m / 60);
  if (h < 48) return h + ' h';
  return Math.round(h / 24) + ' jours';
}
function fmtClock(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function fmtDate(ts) { return gameDate(ts).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }); }
// The game's clock: the real one, moved forward by the time accelerator (and wound back with a save loaded later).
const clockOff = () => (S.game && typeof S.game.clockOff === 'number' ? S.game.clockOff : 0);
const gameDate = (ts) => new Date(ts + clockOff());
const segmenter = (typeof Intl !== 'undefined' && Intl.Segmenter) ? new Intl.Segmenter('fr', { granularity: 'grapheme' }) : null;
function graphemes(s) { if (!s) return []; if (segmenter) return Array.from(segmenter.segment(s), (x) => x.segment); return Array.from(s); }
function firstGrapheme(s) { return graphemes(s)[0] || ''; }
let PICTO = null;
try { PICTO = new RegExp('\\p{Extended_Pictographic}', 'u'); } catch (e) { PICTO = /[☀-➿\uD83C-\uDBFF]/; }
function cleanEmoji(e) { const g = firstGrapheme(str(e, 24)); return g && PICTO.test(g) ? g : ''; }
function cleanEmojis(e, max = 3) { return graphemes(str(e, 40)).filter((x) => PICTO.test(x)).slice(0, max).join(''); }
function initials(name) {
  const w = str(name, 60).split(' ').filter(Boolean);
  const s = (w[0] ? Array.from(w[0])[0] : '?') + (w[1] ? Array.from(w[1])[0] : '');
  return s.toUpperCase();
}
function normHandle(h) {
  return str(h, 60).replace(/^@+/, '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9._]/g, '').replace(/^[._]+|[._]+$/g, '').slice(0, 20);
}
function prettyHandle(h) {
  return h.split(/[._]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') || h;
}
const pascalHandle = (h) => prettyHandle(h).replace(/\s+/g, '');
function niceRound(n) {
  n = Math.max(1, Math.round(n));
  const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(n)) - 1));
  return Math.ceil(n / p) * p;
}
// The game's version (the same number as the desktop installer): still an alpha.
const APP_VERSION = '0.27.8';
const APP_STAGE = 'alpha';
// Who runs the game: Claude (as an artifact), or the desktop app on the player's own ChatGPT plan (window.hypeHost, see desktop/).
const HOST = typeof window !== 'undefined' && window.hypeHost && window.hypeHost.kind === 'chatgpt' ? window.hypeHost : null;
const AI_NAME = HOST ? 'ChatGPT' : 'Claude';
function lsOK() {
  try { const k = '__hype_t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; }
}
// Grammatical gender: characters carry g ('f' | 'm' | 'x'); the player picks il / elle / iel.
const gx = (gd, m, f, x) => (gd === 'f' ? f : gd === 'm' ? m : x);
const pg = (g) => ({ il: 'm', elle: 'f' })[g && g.player ? g.player.pron : ''] || 'x';
const px = (g, m, f, x) => gx(pg(g), m, f, x);
const TAG_RE = /#[\p{L}\p{N}_]{2,40}/gu;
const wordSet = (t) => new Set(String(t).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 4));
function similar(a, b) {
  const A = wordSet(a), B = wordSet(b);
  if (!A.size || !B.size) return false;
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size) >= 0.6;
}
const mentionRe = (h) => new RegExp('@' + h.replace(/\./g, '\\.') + '(?![a-z0-9._])', 'i');

/* =========================================================
   Game constants
   ========================================================= */
const REFRESH_COOLDOWN = 45 * 1000;
const DM_MAX = 1000; // a private message (long enough for a detailed quote to a brand)
const SKIP_QUIET = 10 * 60 * 1000; // a time skip shorter than this just moves the clock (the network has nothing to tell yet)
const ABSENCE_MS = 40 * 60 * 1000;
const MAX_GAMES = 6;
const LEVEL_GEMS = 6;
const LOW_MS = 15 * 60 * 1000;
const LOW_STEP = 45 * 1000;
const LOW_MAX = 20;
const APOLOGY_COOLDOWN = 10 * 60 * 1000;
const ACCUSE_COOLDOWN = 30 * 60 * 1000; // one accusation per character every 30 minutes
const BADBUZZ_MS = 40 * 60 * 1000;
const PLAYER_BB_MS = 60 * 60 * 1000; // the player's own bad buzz, once a fake proof is exposed
const MAX_REGULARS = 12;
// Fake proofs the player can fabricate for a call-out.
const EV_KINDS = { // f: feminine noun (« ta capture était fausse », « ton vocal était faux »)
  dm: { emoji: '💬', label: 'Capture de DM', chip: 'Capture de DM', short: 'capture', f: true },
  photo: { emoji: '📸', label: 'Photo', chip: 'Photo', short: 'photo', f: true },
  vocal: { emoji: '🎙️', label: 'Message vocal', chip: 'Vocal', short: 'vocal', f: false },
  temoin: { emoji: '🕶️', label: 'Témoin anonyme', chip: 'Témoin', short: 'témoignage', f: false },
};
const evLabel = (kind) => { const l = (EV_KINDS[kind] || EV_KINDS.dm).label; return l[0].toLowerCase() + l.slice(1); }; // « capture de DM »
const START = {
  anon: { label: 'Inconnu·e', desc: 'Tu pars de zéro. Chaque abonné se mérite.', followers: 40, rep: 50 },
  rising: { label: 'Étoile montante', desc: 'On commence à parler de toi.', followers: 2500, rep: 60 },
  star: { label: 'Star', desc: 'Tout le monde te connaît. Tout le monde te juge.', followers: 250000, rep: 62 },
};
const CHAOS = [
  { label: 'Réaliste', desc: 'Des réactions crédibles et mesurées.', line: 'Ambiance : réaliste. Réactions mesurées, peu de coups de théâtre.' },
  { label: 'Piquant', desc: 'Du drama et des surprises de temps en temps.', line: 'Ambiance : piquante. Du drama et des surprises de temps en temps.' },
  { label: 'Chaos total', desc: 'Rebondissements et révélations en série.', line: 'Ambiance : chaos total. Rebondissements fréquents, révélations, situations folles mais cohérentes avec le monde.' },
];
const PRONOUNS = [['elle', 'Elle'], ['il', 'Il'], ['iel', 'Iel']];
const SKILLS = [
  { id: 'charisme', label: 'Charisme', hint: 'Tes relations progressent plus vite' },
  { id: 'humour', label: 'Humour', hint: 'Plus de likes quand tu es drôle' },
  { id: 'audace', label: 'Audace', hint: 'Plus de chances de devenir viral' },
  { id: 'creativite', label: 'Créativité', hint: 'Plus d’XP à chaque action' },
];
const SHOP = [
  { id: 'push', icon: 'trend', tone: 'hot', label: 'Mise en avant', desc: 'Ta prochaine sortie (vidéo, short, live…) est poussée par l’algorithme : deux fois plus de vues.', price: 15 },
  { id: 'reach', icon: 'zap', tone: 'good', label: 'Boost de portée', desc: 'Ton prochain post touche 2,5 fois plus de monde.', price: 10 },
  { id: 'viral', icon: 'flame', tone: 'flash', label: 'Moment viral', desc: 'Ton prochain post devient viral, c’est garanti.', price: 30 },
  { id: 'pr', icon: 'shield', tone: 'bad', label: 'Agence de com’', desc: '+250 de réputation, et la fin d’un cancel garantie.', price: 18 },
];
const shopPrice = (id) => (SHOP.find((x) => x.id === id) || { price: 0 }).price;
// Every kind of bond, in four families. Some are stages: a couple before an engagement, an engagement before a wedding.
// from: the dynamics it can grow out of (none: only the relation level counts); prev: the stage before, on the way to it.
const VIBE_GROUPS = [['amour', 'Amour'], ['amitie', 'Amitié'], ['pro', 'Pro & réseau'], ['conflit', 'Conflit']];
const ROMANCE = ['crush', 'flirt', 'couple', 'fiancailles', 'mariage', 'complique', 'ex'];
const PARTNER = ['couple', 'fiancailles', 'mariage'];
/* 0.22.2: who knows what about the player's love life. A crush, a flirt, confidences, a cold, a date, a kiss, a couple kept
   for the two of them stay between the two of them. The others know once it shows (an announced couple, an engagement,
   a wedding, a date seen in public, a photo going around) or once someone told them (word of mouth: the whispers, which
   take hours and depend on who talks). What someone cannot know stays out of what the AI reads for them. */
const PRIVATE_VIBES = ['crush', 'flirt', 'complique', 'confidences', 'froid'];
const vibePrivate = (c) => !!c && (PRIVATE_VIBES.includes(c.vibe) || (c.vibe === 'couple' && (c.officiel === 'pending' || c.officiel === 'secret'))
  || (c.vibe === 'ex' && c.officiel !== 'public' && c.officiel !== 'leaked')); // (a break-up shows if the couple did)
function learnLove(g, x, c, t = Date.now()) { if (!x || !c || x === c) return false; if (!x.knows || typeof x.knows !== 'object') x.knows = {}; if (x.knows[c.id]) return false; x.knows[c.id] = t; return true; }
const allLearn = (g, c, t = Date.now()) => { for (const x of mains(g, false)) learnLove(g, x, c, t); };
// x knows what there is between the player and c
const knowsOf = (x, c) => !!x && !!c && (x === c || !vibePrivate(c) || !!(x.knows && x.knows[c.id]));
// A private line of the chronicle: who may read it (the ones in it, and for a love story, whoever heard of it).
const seesChron = (g, x, e) => !e.who || !x || e.who.includes(x.id) || (!!e.love && e.who.some((id) => g.chars[id] && knowsOf(x, g.chars[id])));
function privNote(g, e) {
  if (!e.who) return '';
  const cs = e.who.map((id) => g.chars[id]).filter(Boolean);
  if (e.love && cs.length && cs.every((c) => !vibePrivate(c))) return ''; // it came out since
  const ids = new Set(cs.map((c) => c.id));
  if (e.love) for (const c of cs) for (const x of mains(g)) if (x.knows && x.knows[c.id]) ids.add(x.id);
  const hs = [...ids].map((id) => g.chars[id]).filter(Boolean).map((c) => '@' + c.handle);
  return hs.length ? `privé : seuls le joueur et ${hs.length > 1 ? hs.slice(0, -1).join(', ') + ' et ' + hs[hs.length - 1] : hs[0]} le savent` : '';
}
const thr = (n) => `relation ${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}${n > 0 ? ' au moins' : ' ou moins'}`;
const VIBES = {
  crush: { grp: 'amour', emoji: '💘', label: 'Crush', ai: 'attirance (crush)', goal: true, dir: 1, need: 20,
    quest: (g, c) => `Fais craquer ${c.name}`, qdesc: (g, c) => `Rapproche-toi de @${c.handle} jusqu’au déclic (${thr(20)}).` },
  flirt: { grp: 'amour', emoji: '😏', label: 'Flirt', ai: 'ça flirte, attirance réciproque', goal: true, dir: 1, need: 30,
    quest: (g, c) => `Flirte avec ${c.name}`, qdesc: (g, c) => `Des regards, des piques, des messages tard le soir… jusqu’à ce que ça flirte vraiment avec @${c.handle} (${thr(30)}).` },
  couple: { grp: 'amour', emoji: '💞', label: 'En couple', ai: 'en couple', goal: true, dir: 1, need: 45, prev: 'flirt',
    from: ['crush', 'flirt', 'complique', 'ex', 'potes', 'amitie', 'bff', 'confidences', 'complices', 'colocs'],
    quest: (g, c) => `Sors avec ${c.name}`, qdesc: (g, c) => `Un crush, un flirt ou une belle amitié d’abord, puis le couple officiel avec @${c.handle} (${thr(45)}).` },
  fiancailles: { grp: 'amour', emoji: '💍', label: 'Fiançailles', ai: 'fiancés', goal: true, dir: 1, need: 65, prev: 'couple', from: ['couple'],
    quest: (g, c) => `Fiance-toi avec ${c.name}`, qdesc: (g, c) => `En couple d’abord, puis la demande… et le oui de @${c.handle} (${thr(65)}).` },
  mariage: { grp: 'amour', emoji: '💒', label: 'Mariage', ai: 'mariés', goal: true, dir: 1, need: 80, prev: 'fiancailles', from: ['fiancailles'],
    quest: (g, c) => `Épouse ${c.name}`, qdesc: (g, c) => `Fiancés d’abord, puis le grand jour avec @${c.handle} (${thr(80)}). Fixez la date : la cérémonie se joue comme un rendez-vous.` },
  complique: { grp: 'amour', emoji: '🌀', label: 'C’est compliqué', ai: 'c’est compliqué (ni ensemble ni séparés)', goal: false, dir: 0,
    from: ['crush', 'flirt', 'couple', 'fiancailles', 'mariage', 'ex'] },
  ex: { grp: 'amour', emoji: '💔', label: 'Ex', ai: 'ex (rupture)', goal: false, dir: 0, from: ['crush', 'flirt', 'couple', 'fiancailles', 'mariage', 'complique'] },
  potes: { grp: 'amitie', emoji: '🙂', label: 'Bons potes', ai: 'bons potes', goal: true, dir: 1, need: 10,
    quest: (g, c) => `Deviens pote avec ${c.name}`, qdesc: (g, c) => `Quelques échanges sympas avec @${c.handle} (${thr(10)}).` },
  amitie: { grp: 'amitie', emoji: '😊', label: 'Amitié', ai: 'une vraie amitié', goal: true, dir: 1, need: 25, prev: 'potes',
    quest: (g, c) => `Deviens ${px(g, 'l’ami', 'l’amie', 'l’ami·e')} de ${c.name}`, qdesc: (g, c) => `Une vraie amitié avec @${c.handle} (${thr(25)}).` },
  bff: { grp: 'amitie', emoji: '🤝', label: 'Inséparables', ai: 'meilleurs amis, inséparables', goal: true, dir: 1, need: 45, prev: 'amitie',
    quest: (g, c) => `Deviens inséparable de ${c.name}`, qdesc: (g, c) => `Une amitié à toute épreuve avec @${c.handle} (${thr(45)}).` },
  famille: { grp: 'amitie', emoji: '🫶', label: 'Famille de cœur', ai: 'famille de cœur (comme frère et sœur)', goal: true, dir: 1, need: 70, prev: 'bff',
    from: ['amitie', 'bff', 'confidences', 'complices', 'colocs'],
    quest: (g, c) => `Fais de ${c.name} ta famille de cœur`, qdesc: (g, c) => `Plus que des amis : la famille qu’on se choisit, avec @${c.handle} (une vraie amitié d’abord, ${thr(70)}).` },
  confidences: { grp: 'amitie', emoji: '🤫', label: 'Confidences', ai: 'confidents, se disent leurs secrets', goal: true, dir: 1, need: 35,
    quest: (g, c) => `Gagne les confidences de ${c.name}`, qdesc: (g, c) => `Qu’@${c.handle} te confie ce qu’${gx(c.g, 'il', 'elle', 'iel')} ne dit à personne (${thr(35)}).` },
  complices: { grp: 'amitie', emoji: '🦊', label: 'Complices', ai: 'complices, font les 400 coups ensemble', goal: true, dir: 1, need: 30,
    quest: (g, c) => `Deviens complice de ${c.name}`, qdesc: (g, c) => `Les 400 coups avec @${c.handle} (${thr(30)}).` },
  colocs: { grp: 'amitie', emoji: '🏠', label: 'Colocs', ai: 'colocataires', goal: true, dir: 1, need: 20,
    quest: (g, c) => `Emménage avec ${c.name}`, qdesc: (g, c) => `Une colocation avec @${c.handle}, si le monde s’y prête (${thr(20)}).` },
  mentor: { grp: 'pro', emoji: '🎓', label: 'Mentor', ai: 'son mentor, le guide', goal: true, dir: 1, need: 10,
    quest: (g, c) => `Fais de ${c.name} ton mentor`, qdesc: (g, c) => `Gagne le respect de @${c.handle} pour ${gx(c.g, 'qu’il', 'qu’elle', 'qu’iel')} te prenne sous son aile.` },
  disciple: { grp: 'pro', emoji: '🌱', label: 'Disciple', ai: 'le joueur est son mentor', goal: true, dir: 1, need: 10,
    quest: (g, c) => `Prends ${c.name} sous ton aile`, qdesc: (g, c) => `Deviens le mentor de @${c.handle} (${thr(10)}).` },
  partenaires: { grp: 'pro', emoji: '💼', label: 'Partenaires', ai: 'partenaires de collab ou de business', goal: true, dir: 1, need: 20,
    quest: (g, c) => `Monte un projet avec ${c.name}`, qdesc: (g, c) => `Collab, business ou duo avec @${c.handle} (${thr(20)}).` },
  alliance: { grp: 'pro', emoji: '🛡️', label: 'Alliance', ai: 'alliés stratégiques', goal: true, dir: 1, need: 15,
    quest: (g, c) => `Fais alliance avec ${c.name}`, qdesc: (g, c) => `Un pacte stratégique avec @${c.handle} (${thr(15)}).` },
  fan: { grp: 'pro', emoji: '⭐', label: 'Fan n°1', ai: 'fan n°1 du joueur', goal: true, dir: 1, need: 20,
    quest: (g, c) => `Fais de ${c.name} ton fan n°1`, qdesc: (g, c) => `Qu’@${c.handle} devienne ton plus grand soutien (${thr(20)}).` },
  rival: { grp: 'conflit', emoji: '⚔️', label: 'Rivalité', ai: 'rivaux', goal: true, dir: -1, need: 40,
    quest: (g, c) => `Deviens ${px(g, 'le rival officiel', 'la rivale officielle', 'rival·e officiel·le')} de ${c.name}`, qdesc: (g, c) => `Défie @${c.handle} en public jusqu’à ce que la rivalité soit officielle.` },
  froid: { grp: 'conflit', emoji: '🧊', label: 'En froid', ai: 'en froid, brouillés', goal: true, dir: -1, need: -10,
    quest: (g, c) => `Brouille-toi avec ${c.name}`, qdesc: (g, c) => `Une vraie dispute avec @${c.handle} (${thr(-10)}).` },
  nemesis: { grp: 'conflit', emoji: '😈', label: 'Némésis', ai: 'ennemis jurés', goal: true, dir: -1, need: -35,
    quest: (g, c) => `Fais de ${c.name} ta némésis`, qdesc: (g, c) => `Pousse le conflit avec @${c.handle} à l’extrême (${thr(-35)}).` },
};
const VIBE_GOALS = Object.keys(VIBES).filter((v) => VIBES[v].goal);
function vibeOK(c, v) {
  const V = VIBES[v];
  if (!V) return false;
  if (ROMANCE.includes(v) && noRomance(c)) return false; // 0.17: an older character has a role apart
  if (V.from && !V.from.includes(c.vibe)) return false; // a stage comes after the one before
  if (!V.dir) return true; // a breakup, an on-and-off: the story decides
  return V.dir > 0 ? c.rel >= V.need : c.rel <= V.need;
}
// The stages still to go on the way to a goal, from where things stand: ['flirt', 'couple', 'fiancailles', 'mariage'].
function vibePath(c, goal) {
  const out = [];
  for (let v = goal, k = 0; v && k < 6; k++) {
    const V = VIBES[v];
    if (!V) break;
    out.unshift(v);
    if (!V.from || V.from.includes(c.vibe)) break;
    v = V.prev || null;
  }
  return out;
}
/* ---------- 0.17: an age, and a maturity that goes with it ----------
   Everyone is 18 or older, always. On a social network it is mostly 18-25, a few 26-32, and in one game out of two one
   or two older people (35-55), in roles apart (a mentor, a boss, a teacher, someone's parent): never a romance. The
   maturity is drawn from the age: at 19 one is often immature (trolls, silly jokes, tackles), sometimes very mature. */
const MATU = {
  tres_immature: { label: 'très immature', ai: 'très immature : rit des blagues bêtes (pipi-caca), trolle et chambre tout le monde, réagit au quart de tour ; s’il ou elle aime piquer, tacle très souvent' },
  immature: { label: 'immature', ai: 'immature : vannes faciles, réagit à chaud, aime troller un peu, se vexe vite' },
  pose: { label: 'posé·e', ai: 'posé·e : réfléchit avant de poster, humour plus fin, évite les clashs inutiles' },
  tres_mature: { label: 'très mature', ai: 'très mature : calme, prend du recul, conseille, fait parfois la morale (limite donneur·se de leçons, un peu rabat-joie)' },
};
const MATU_IDS = Object.keys(MATU);
const MATU_ODDS = [[21, [25, 35, 30, 10]], [26, [10, 30, 45, 15]], [34, [5, 20, 50, 25]], [999, [0, 10, 45, 45]]]; // up to that age: the odds, in MATU order
const ROMANCE_MAX_AGE = 34; // older: a role apart, no romance with the player
function drawMatu(age) {
  const w = MATU_ODDS.find(([max]) => age <= max)[1];
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let k = 0; k < w.length; k++) { r -= w[k]; if (r < 0) return MATU_IDS[k]; }
  return 'pose';
}
const drawYoungAge = () => { const r = Math.random(); return r < 0.35 ? randi(18, 21) : r < 0.75 ? randi(22, 26) : randi(27, 32); };
// The ten characters of a new world: their ages and maturities, decided before the AI writes them.
function drawCastAges(n = 10) {
  const out = Array.from({ length: n }, drawYoungAge);
  const r = Math.random(), olds = window.__HYPE_TEST__ && window.__castOlds != null ? window.__castOlds : r < 0.5 ? 0 : r < 0.85 ? 1 : 2; // one game out of two: one or two older people (a test may ask for none)
  const slots = [...out.keys()].sort(() => Math.random() - 0.5).slice(0, olds);
  for (const k of slots) out[k] = randi(35, 55);
  return out.map((age) => ({ age, matu: drawMatu(age) }));
}
// plan: the age decided for them; min: their experience asks for it (a job candidate); pro: someone met through work.
function initAge(c, plan, o = {}) {
  if (!c) return;
  if (plan && plan.age >= 18) { c.age = Math.round(plan.age); if (MATU[plan.matu]) c.matu = plan.matu; }
  if (!(c.age >= 18)) c.age = o.pro && Math.random() < 0.15 ? randi(35, 48) : o.pro ? randi(22, 34) : drawYoungAge();
  if (o.min && c.age < o.min) c.age = Math.min(60, o.min + randi(0, 3));
  if (!MATU[c.matu]) c.matu = drawMatu(c.age);
}
const noRomance = (c) => !!(c && c.age > ROMANCE_MAX_AGE);
// For the AI: their age, how mature they are, and a role apart for the older ones.
// short (0.19): the maturity in a word, when the prompt explains the words once (see ctxText).
const ageText = (c, short = false) => (c && c.age ? `${c.age} ans, ${short ? (MATU[c.matu] || MATU.pose).label : (MATU[c.matu] || MATU.pose).ai}${noRomance(c) ? ' ; rôle à part : jamais de romance avec le joueur' : ''}` : '');
// A partner's status, for the people on screen: « Ta copine », « Ton fiancé », « Ta femme ».
const partnerWord = (c) => (c.vibe === 'mariage' ? gx(c.g, 'Ton mari', 'Ta femme', 'Ton·ta conjoint·e') : c.vibe === 'fiancailles' ? gx(c.g, 'Ton fiancé', 'Ta fiancée', 'Ton·ta fiancé·e') : c.vibe === 'couple' ? gx(c.g, 'Ton copain', 'Ta copine', 'Ton·ta partenaire') : '');
const WORLDS = [
  { id: 'reel', emoji: '🌍', hue: 205, name: 'Monde réel', inName: 'dans le monde réel', desc: 'Notre monde, aujourd’hui : la vraie actu du moment, des personnages inventés.', real: true,
    prompt: 'Le monde réel d’aujourd’hui, en France et ailleurs : réseaux sociaux, créateurs de contenu, médias, sport, musique, cinéma, jeux vidéo, tech et faits de société. Les personnages principaux, les médias et les habitués du réseau sont TOUS inventés (aucune vraie personne n’a de compte dans le jeu) et parlent de l’actualité réelle du moment comme de vrais internautes.',
    role: 'ex : une créatrice qui commente l’actu sur ses réseaux' },
  { id: 'influence', emoji: '📱', hue: 48, name: 'Planète Influence', inName: 'sur Planète Influence', desc: 'Créateurs de contenu, placements de produits, collabs et bad buzz.',
    prompt: 'Le monde des influenceurs et créateurs de contenu (fictif) : vlogueuses lifestyle, youtubeurs, streamers gaming, gourous beauté, influenceurs foot, anciens candidats de téléréalité, agents et marques. Placements de produits, collabs, course aux abonnés, drama et bad buzz. Tous les créateurs sont des personnages originaux aux noms inventés : aucun nom, pseudo ou parodie de vraie personne.',
    role: 'ex : une petite créatrice lifestyle qui vise le million d’abonnés' },
  { id: 'paillettes', emoji: '🎤', hue: 330, name: 'Scène & Paillettes', inName: 'dans le monde de Scène & Paillettes', desc: 'L’industrie musicale : artistes, producteurs, rivalités et classements.',
    prompt: 'L’industrie musicale d’aujourd’hui (fictive) : rappeuses, chanteurs pop, producteurs, labels, classements du streaming, featurings, clashs et rumeurs. Le réseau est le terrain de jeu des artistes et de leurs fans.',
    role: 'ex : une chanteuse qui vient de sortir son premier son' },
  { id: 'lumen', emoji: '🔮', hue: 265, name: 'Académie Lumen', inName: 'à l’Académie Lumen', desc: 'Une académie de magie pour jeunes adultes, ses maisons rivales et ses secrets.',
    prompt: 'Une prestigieuse académie supérieure de magie cachée dans les Alpes, pour étudiants majeurs (18 à 25 ans), avec quatre maisons rivales (Aube, Brasier, Marée, Ombre), des professeurs excentriques, des duels, des créatures et un secret ancien enfoui sous l’académie. Les étudiants utilisent un réseau social interne.',
    role: 'ex : un nouvel étudiant qui cache un pouvoir interdit' },
  { id: 'brumeval', emoji: '🌙', hue: 220, name: 'Campus de Brumeval', inName: 'sur le campus de Brumeval', desc: 'Drama surnaturel à la fac : vampires, loups-garous et gala de fin d’année.',
    prompt: 'Le campus universitaire d’une petite ville brumeuse où cohabitent étudiants humains, vampires, loups-garous et sorcières qui cachent leur secret, tous majeurs. Rumeurs, couples, rivalités, et le gala de fin d’année qui approche.',
    role: 'ex : la nouvelle étudiante qui vient d’emménager et sent que quelque chose cloche' },
  { id: 'paradiso', emoji: '🌴', hue: 25, name: 'Villa Paradiso', inName: 'à la Villa Paradiso', desc: 'Une téléréalité : candidats, couples, clashs et éliminations.',
    prompt: 'Une téléréalité fictive tournée dans une villa au soleil : candidats, couples qui se font et se défont, alliances, trahisons, éliminations chaque semaine, et des fans qui commentent tout en direct.',
    role: 'ex : le nouveau candidat qui débarque en milieu de saison' },
  { id: 'orion', emoji: '🚀', hue: 200, name: 'Station Orion', inName: 'sur la Station Orion', desc: '2350 : une colonie spatiale, son équipage et une IA de bord trop curieuse.',
    prompt: 'En 2350, une station spatiale en orbite autour de Jupiter : équipage, scientifiques, colons, une IA de bord trop curieuse et des incidents mystérieux. Le réseau interne de la station relie tout le monde.',
    role: 'ex : une ingénieure fraîchement débarquée de la Terre' },
  { id: 'neolyon', emoji: '🌆', hue: 290, name: 'Néo-Lyon 2077', inName: 'à Néo-Lyon', desc: 'Cyberpunk : hackers, mégacorpos et influenceurs augmentés.',
    prompt: 'Un Lyon cyberpunk en 2077 : mégacorporations, hackers, influenceurs augmentés, gangs de drones et néons sur la Saône. Sur le réseau, la réputation vaut de l’or et les scandales se monnayent.',
    role: 'ex : un hacker qui veut devenir influenceur' },
  { id: 'aldoree', emoji: '🐉', hue: 140, name: 'Royaume d’Aldorée', inName: 'au royaume d’Aldorée', desc: 'Fantasy médiévale : cour royale, chevaliers, dragons et intrigues.',
    prompt: 'Un royaume médiéval fantastique dont le réseau de corbeaux messagers fonctionne comme un réseau social : cour royale, chevaliers, mages, dragons, complots pour le trône et grand tournoi annuel.',
    role: 'ex : une écuyère qui rêve de devenir chevalière' },
  { id: 'etoile', emoji: '⚽', hue: 110, name: 'Ligue Étoile', inName: 'dans la Ligue Étoile', desc: 'Football pro : joueurs, coachs, mercato et journalistes.',
    prompt: 'Un championnat de football fictif : joueurs stars et jeunes talents, coachs sous pression, mercato, journalistes sportifs et supporters qui s’enflamment sur le réseau après chaque match.',
    role: 'ex : un jeune attaquant qui vient de signer son premier contrat pro' },
];
const PERSONA_EMOJIS = ['😎', '🦊', '🐺', '🦄', '🐉', '🌸', '🔥', '⭐', '🎧', '🎤', '🧙', '🧛', '🤖', '👽', '🐱', '🐸', '🦋', '🌙', '⚡', '🍀', '🎨', '🛹', '🏀', '👑'];
const PERSONA_HUES = [330, 10, 35, 95, 150, 190, 225, 265];
const NPC_EMOJIS = ['🐸', '🍓', '🌙', '🦋', '🍜', '🎧', '🐱', '🌵', '🍩', '🛹', '🎲', '🧃', '🌈', '🦖', '🐙', '🍀', '🧸', '🥐', '🐝', '🎮', '🌻', '🦉', '🍕', '🐧', '🍒', '🪐', '🐌', '🥑'];
const MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000];
// Whole words only (« lune » is not in « lunettes », « sort » not in « sortie »), plurals too.
const PK = (words) => new RegExp(`(?:^|[^a-zà-ÿœæ])(?:${words})(?:s|x|es)?(?![a-zà-ÿœæ])`);
const PHOTO_KEYS = [
  [PK('plage|mer|océan|vague|sable'), '🏖️'], [PK('coucher de soleil|lever de soleil|aube|aurore|crépuscule'), '🌅'], [PK('nuit|lune|étoile|ciel'), '🌙'],
  [PK('café|latte|cappuccino|thé|tasse|terrasse'), '☕'], [PK('chat'), '🐱'], [PK('chien'), '🐶'], [PK('concert|scène|micro|studio'), '🎤'],
  [PK('match|foot|ballon|stade|terrain'), '⚽'], [PK('gâteau|dessert|pâtisserie|cookie'), '🍰'], [PK('pizza|burger|repas|resto|plat|dîner'), '🍽️'],
  [PK('selfie|miroir|visage'), '🤳'], [PK('ville|rue|immeuble|néon|toit'), '🌆'], [PK('forêt|arbre|montagne|lac'), '🌲'],
  [PK('livre|bibliothèque|grimoire'), '📚'], [PK('fleur|bouquet'), '🌸'], [PK('neige|hiver'), '❄️'], [PK('robe|tenue|look|outfit|vêtement'), '👗'],
  [PK('voiture|moto'), '🚗'], [PK('château|tour|donjon'), '🏰'], [PK('dragon'), '🐉'], [PK('potion|magie|sort|baguette'), '✨'], [PK('fusée|vaisseau|planète|espace'), '🚀'],
];
function photoEmoji(desc) {
  const d = str(desc, 200).toLowerCase();
  for (const [re, e] of PHOTO_KEYS) if (re.test(d)) return e;
  return '📷';
}

/* =========================================================
   App state
   ========================================================= */
const S = {
  phase: 'boot',
  now: Date.now(),
  games: [],
  indexError: false,
  game: null,
  tab: 'feed',
  stack: [],
  dock: [], // 0.27.7: the windows put aside (still open, everything typed in them kept)
  win: null, // 0.27.7: where each kind of window floats on a computer (read from this browser once)
  pubDrafts: {}, // 0.27.7: an upload form half filled, by release (closing it no longer loses it)
  setupDrafts: {}, // 0.27.7: the topic, the plan and the level of a shoot being prepared
  modals: [],
  modalGapUntil: 0,
  toasts: [],
  ob: null,
  busy: { act: null, dm: null, refresh: false, ideas: false, newchar: false, create: false, load: false, mg: null, ev: null, save: false, rp: false, prep: null, review: null, more: null },
  lastInputAt: 0, // 0.10: the last time the player touched the game (the network only lives on its own while they play)
  ideas: null,
  drafts: { post: '', photo: null, pics: [], diapo: false, see: false, quote: null, apology: false, accuse: null, cite: [], fake: null, reply: {}, dm: {}, confess: null, secAns: null, conf: {} },
  vision: 0, // images the AI can see with one call (0: none in this view)
  visionMiss: 0,
  visionOff: false,
  replyTo: {},
  voice: false,
  autoSkip: {},
  feedSeenAt: 0,
  feedAtTop: true,
  catchup: null,
  liveUntil: 0,
  lastToastAt: 0,
  notifSeenBefore: 0,
  ai: 'unknown',
  store: 'pending',
  news: null, // the real news digest of the day, for the « Monde réel » world
  host: { session: null, models: [], prefs: {}, busy: false, zoom: null }, // the ChatGPT connection (desktop app only); zoom: the size of everything
  hostModal: null, // a host message over everything: { t: 'gpt-welcome' | 'gpt-limit' }
  skipWait: false, // a time jump waiting for the characters to finish writing
};
// While a reaction is being committed, notifications, toasts and modals it creates wait for its results to be revealed.
let holdUntil = 0;
const later = () => Math.max(Date.now(), holdUntil);
// Every running AI flow (post, reply, DM, refresh, ideas…): leaving or deleting a game aborts and awaits them.
const FLOWS = new Set();
function startFlow(g) {
  const f = { id: uid('f'), g, ctl: new AbortController(), keep: null };
  f.done = new Promise((r) => { f.end = r; });
  FLOWS.add(f);
  return f;
}
function endFlow(f) { FLOWS.delete(f); f.end(); }
function abortFlows() {
  const all = [...FLOWS];
  for (const f of all) f.ctl.abort();
  return Promise.allSettled(all.map((f) => f.done));
}
let renderApp = () => {};
let renderQueued = false;
function update(save = true) {
  if (save && S.game && S.game.ready && !FLOWS.size) scheduleSave();
  if (renderQueued) return;
  renderQueued = true;
  const run = () => { if (!renderQueued) return; renderQueued = false; S.now = Date.now(); try { renderApp(); } catch (e) { console.error(e); } };
  requestAnimationFrame(run);
  setTimeout(run, 120);
}
function bumpLive(until) { if (until > S.liveUntil) S.liveUntil = until; }
function toast(text, kind = '', action = null, from = 0) {
  if (!text) return;
  const start = Math.max(from || 0, later());
  const dur = action ? 7000 : kind === 'bad' ? 6500 : 3600;
  S.toasts.push({ id: uid('t'), text, kind, action, from: start, until: start + dur });
  if (S.toasts.length > 4) S.toasts.splice(0, S.toasts.length - 4);
  update(false);
}
function queueModal(m) {
  m.id = uid('m');
  m.at = Math.max(m.at || 0, later());
  S.modals.push(m);
  update(false);
}
function queueModalFor(g, m) { if (S.game === g) queueModal(m); }
function askConfirm(m) { queueModal(Object.assign({ t: 'confirm' }, m, { at: Date.now() })); }

/* ---------- flow tagging: what a stream adds can be withdrawn ---------- */
let SRC = null; // id of the flow whose stream callback is running (set by aiStream)
const tag = (o) => { if (SRC) o.src = SRC; return o; };
function untag(g, src) {
  const keep = (x) => x.src !== src;
  g.posts = g.posts.filter(keep);
  for (const p of g.posts) p.replies = p.replies.filter(keep);
  for (const id in g.dms) g.dms[id].msgs = g.dms[id].msgs.filter(keep);
  g.notifs = g.notifs.filter(keep);
  if (g.clues) g.clues = g.clues.filter(keep);
  for (const id in g.chars) { const c = g.chars[id]; if (Array.isArray(c.ig)) c.ig = c.ig.filter(keep); if (Array.isArray(c.tt)) c.tt = c.tt.filter(keep); }
}

/* =========================================================
   Game model
   ========================================================= */
function blankGame(world, persona) {
  const st = START[persona.start] || START.anon;
  const t = Date.now();
  const career = newCareer(persona, st), gear = newGear(persona, career.platform, t); // 0.20: each game starts its own way
  career.cash += gear.start.savings;
  return {
    v: 2,
    id: 'g' + uid(),
    createdAt: t,
    updatedAt: t,
    lastPlayedAt: t,
    lastSeenAt: t,
    ready: false,
    world: {
      preset: world.id || null, name: world.name, inName: world.inName || '', emoji: world.emoji || '✨', hue: world.hue == null ? 300 : world.hue,
      tagline: world.desc || '', description: world.prompt || '', tone: '', chaos: persona.chaos == null ? 1 : persona.chaos,
    },
    player: { name: persona.name, handle: persona.handle, emoji: persona.emoji, hue: persona.hue, bio: persona.bio || '', identity: persona.identity, start: persona.start, pron: persona.pron || 'iel', secrets: cleanSecrets(persona.secrets) }, // 0.18: the player's own secrets
    stats: {
      followers: st.followers, following: 0, reputation: st.rep, xp: 0, level: 1, gems: 15,
      rep4: { image: st.rep, cred: st.rep, pro: st.rep, kind: st.rep }, repLog: [], // 0.10: the four pillars of the reputation
      skills: { charisme: 0, humour: 0, audace: 0, creativite: 0 }, skillXp: { charisme: 0, humour: 0, audace: 0, creativite: 0 }, skillPoints: 0, // 0.24: levels (0-50), from their XP
      cancelled: false, cancels: 0, posts: 0, replies: 0, replyc: 0, dms: 0, mentions: 0, virals: 0, bestLikes: 0, milestone: 0,
      fakes: 0, busts: 0,
    },
    budget: { daily: persona.budget == null ? BUDGET_DEFAULT : persona.budget, day: realDay(t), used: 0, extra: 0, chars: 0, total: 0, avg: {}, warned: false },
    chars: {}, order: [], npcs: {},
    quests: [], chronicle: [], boosts: { reach: false, viral: false, push: false },
    notifs: [], notifReadAt: t, posts: [], dms: {},
    seq: 0, lastRefreshAt: 0, triggers: [], storyDoneAt: 0, low: null, apologyAt: 0, lastQuestKind: '', clues: [],
    fakes: [], pbb: null, releases: [], events: [], saves: [], invites: [],
    // v0.7: the career (platform, money, sponsors, team, daily upload) and the darker side of fame
    career, deals: [], staff: [], series: null, trends: [], rumors: [], intel: [],
    gear, // 0.20: the phone, the computer, the camera… the connection and the subscriptions
    advice: [], // v0.9: the advice characters follow because they trust the player
    visits: [], dilemmas: [], // 0.18: surprise visits, dilemmas
    opts: Object.assign({ careDates: !!persona.careDates, intensity: INTENSITY[persona.intensity] ? persona.intensity : 'normal' }, // v0.9.3: the player's AI options for this game (0.10: the intensity)
      COMMENTS[persona.comments] ? { comments: persona.comments } : typeof persona.chatty === 'boolean' ? { chatty: persona.chatty } : {},
      LIVE[persona.live] ? { live: persona.live } : typeof persona.autoLive === 'boolean' ? { autoLive: persona.autoLive } : {}), // 0.19: the two switches, when changed (0.23.1: four steps each)
    adultAt: persona.adult ? t : 0, // v0.9.3: when the player said they are 18 or older
  };
}
function migrate(g) {
  const d = blankGame({ name: g.world ? g.world.name : 'Monde' }, g.player || { name: 'Toi', handle: 'toi', start: 'anon' });
  if (!g.gear) g.gear = legacyGear(g); // 0.20: a game from before gets nothing (a phone, a 4G box), never a new draw
  for (const k of Object.keys(d)) if (g[k] === undefined) g[k] = d[k];
  if (!g.opts || typeof g.opts !== 'object') g.opts = { careDates: false };
  if (!INTENSITY[g.opts.intensity]) g.opts.intensity = 'normal'; // 0.10
  ensureRep(g.stats); // 0.10: a game from before the pillars starts with all four at its reputation (before the defaults below)
  if (g.stats && !g.stats.skillXp) ensureSkills(g); // 0.24: the old skills converted (before the defaults below, which have none)
  for (const k of ['world', 'player', 'stats']) for (const kk of Object.keys(d[k])) if (g[k][kk] === undefined) g[k][kk] = d[k][kk];
  for (const k of Object.keys(d.stats.skills)) if (g.stats.skills[k] === undefined) g.stats.skills[k] = g.stats.skillXp ? 0 : 5; // (5: the old scale's start)
  ensureSkills(g); // 0.24: levels from practice (a game from before: its old values, converted)
  if (!Array.isArray(g.dateLog)) backfillDates(g); // 0.22.4: the evenings, kept to read again
  if (g.world.hue == null) g.world.hue = 300;
  for (const id in g.chars) { const c = g.chars[id]; if (!Array.isArray(c.mem)) c.mem = []; if (c.vibe === undefined) c.vibe = null; }
  // 0.17: an age and a maturity for everyone already there (never an older one: a love story may already be under way)
  for (const id in g.chars) { const c = g.chars[id]; if (c.kind !== 'media' && !(c.age >= 18)) initAge(c, { age: c.kind === 'main' ? drawYoungAge() : randi(22, 34) }); }
  if (!Array.isArray(g.clues)) g.clues = [];
  if (!Array.isArray(g.fakes)) g.fakes = [];
  if (!Array.isArray(g.releases)) g.releases = [];
  for (const r of g.releases) { // 0.27.4: the grading is gone: one drawn and not played yet is drawn again
    if (r && r.state === 'scheduled' && r.game && r.game.kind === 'etalonnage' && !r.played) r.game = null;
    if (r && r.state === 'scheduled' && r.editGame && r.editGame.kind === 'etalonnage' && !r.edit) r.editGame = null;
  }
  if (!Array.isArray(g.events)) g.events = [];
  if (!Array.isArray(g.saves)) g.saves = [];
  if (!Array.isArray(g.arcs)) g.arcs = [];
  if (typeof g.clockOff !== 'number') g.clockOff = num(g.stats.skipped, 0); // the clock of a game skipped before clocks existed
  // A reaction that never finished (page closed while it streamed): settle it.
  for (const p of g.posts) {
    if (!Array.isArray(p.replies)) p.replies = [];
    if (p.pending) { p.pending = false; p.res = p.res || { fol: 0, xp: 0, rep: 0, verdict: 'Passé inaperçu', viral: false }; }
    for (const r of p.replies) if (r.pending) { r.pending = false; r.res = r.res || { fol: 0, xp: 0, rep: 0, verdict: '', viral: false }; }
  }
  for (const id in g.dms) { if (!Array.isArray(g.dms[id].msgs)) g.dms[id].msgs = []; }
  budgetOf(g);
  migrateCareer(g); // v0.7
  migrateGear(g); // 0.20
  migrateTrust(g); // v0.9
  migrateTemper(g); // v0.9.4: how each one reacts when the player's name moves
  ensureHearts(g); // v0.11: how each one loves, and at least one real challenge from the start
  initTies(g); // v0.13: who is close to whom among them, what is said about the player
  return g;
}
/* ---------- the world's own storylines: dramas, trends, a troll now and then, the real news in the real world ---------- */
const ARC_EVERY = 4 * 3600000; // a new storyline when nothing new started for this long (game time), or after a few refreshes
const ARC_KINDS = {
  drama: { emoji: '💥', label: 'Drama' },
  tendance: { emoji: '📈', label: 'Tendance' },
  troll: { emoji: '🤡', label: 'Délire du réseau' },
  news: { emoji: '🌍', label: 'Actu' },
};
// Whether this refresh should start something new, and what.
function pickArc(g, t = Date.now()) {
  const k = lifeK(g); // 0.19: a livelier level starts them sooner, a quiet one later
  if (t - (g.lastArcAt || 0) < ARC_EVERY / k && (g.refreshes || 0) - (g.arcRefresh || 0) < Math.round(4 / k)) return null;
  if (isReal(g)) { // in the real world, the trends are the real ones
    const used = new Set(g.usedNews || []);
    const fresh = newsFresh() ? S.news.items.filter((x) => !used.has(hashStr(x.text))) : [];
    if (fresh.length && Math.random() < 0.7) return { kind: 'news', news: pick(fresh) };
    return { kind: Math.random() < 0.6 ? 'drama' : 'tendance' };
  }
  const r = Math.random();
  if (r < 0.14 && t - (g.lastTrollAt || 0) > 3 * 86400000) return { kind: 'troll' }; // rare: a few game days apart at least
  return { kind: r < 0.58 ? 'drama' : 'tendance' };
}
function addArc(g, arc, o, t = Date.now()) {
  const K = ARC_KINDS[arc.kind] || ARC_KINDS.tendance;
  const title = str(o && o.title, 70) || (arc.news ? str(arc.news.text, 70) : K.label);
  let tag = str(o && o.tag, 40).replace(/\s+/g, '');
  if (tag && !tag.startsWith('#')) tag = '#' + tag;
  const a = { id: uid('arc'), kind: arc.kind, title, tag: /^#[\p{L}\p{N}_]{2,40}$/u.test(tag) ? tag : '', at: t };
  g.arcs = (g.arcs || []).concat(a).slice(-8);
  g.lastArcAt = t;
  g.arcRefresh = g.refreshes || 0;
  if (arc.kind === 'troll') g.lastTrollAt = t;
  if (arc.news) g.usedNews = (g.usedNews || []).concat(hashStr(arc.news.text)).slice(-40);
  addNotif(g, { k: 'trend', tg: a.tag || null, text: `${K.emoji} Nouveau sur le réseau : ${title}${a.tag ? ' ' + a.tag : ''}` });
  addChronicle(g, `${K.label} sur le réseau : ${title}${a.tag ? ' (' + a.tag + ')' : ''}.`);
  return a;
}
// The storylines of the last two days, newest first.
const liveArcs = (g, t = Date.now()) => (g.arcs || []).filter((a) => t - a.at < 2 * 86400000).slice(-4).reverse();

/* ---------- real news, for the « Monde réel » world ---------- */
// A digest of the day's real news, written by Claude (outside the game) into the shared doc news/today.
const NEWS_MAX_AGE = 4 * 24 * 3600 * 1000;
const isReal = (g) => !!(g && g.world && g.world.preset === 'reel');
const newsFresh = () => !!(S.news && S.news.items.length && Date.now() - S.news.updatedAt < NEWS_MAX_AGE);
async function loadNews() {
  if (Store.mode !== 'db' || !Store.db) return;
  try {
    const snap = await Store.db.doc('news/today').get();
    if (!snap.exists) return;
    const d = snap.data() || {};
    const items = (Array.isArray(d.items) ? d.items : []).map((x) => ({ cat: str(x && x.cat, 30), text: str(x && x.text, 260) })).filter((x) => x.text).slice(0, 14);
    const at = num(d.updatedAt, 0);
    if (items.length && at) S.news = { date: str(d.date, 20), label: str(d.label, 60), updatedAt: at, items };
  } catch (e) { console.warn('news', e && (e.code || e.message)); }
}

function charByHandle(g, h) {
  if (!h) return null;
  for (const id of g.order) { const c = g.chars[id]; if (c && c.handle === h) return c; }
  return null;
}
const charIdOf = (a) => (a && a.startsWith('c:') ? a.slice(2) : null);
// Who can write to the player in private: the main characters, brand contacts, the team (and job candidates), the fans (0.21).
const DM_KINDS = ['main', 'brand', 'staff', 'cand', 'ex', 'fan'];
// 0.16: a main character: someone of the cast, or anyone who joined it once it got personal with the player (joinCast).
const isMain = (c) => !!c && (c.kind === 'main' || !!c.joined);
/* ---------- 0.16: anyone the player writes to can join the cast ----------
   A brand contact, someone of the team, a candidate, a former employee: once it gets personal (they open up, flirt, want
   to see the player outside work, or they simply grow close), they become a main character, and keep their job. From
   then on everything works with them as with the others: their heart, trust and temperament, their ties, invitations
   and dates, a couple, jealousy, rumors. The AI says when, in their private messages; a real closeness does it too. */
const JOIN_KINDS = ['brand', 'staff', 'cand', 'ex', 'fan']; // (0.21: a fan who becomes a friend)
const JOIN_REL = 50; // this close, it is personal anyway
const canJoin = (c) => !!c && !isMain(c) && JOIN_KINDS.includes(c.kind) && !!c.unlocked;
function joinCast(g, c, why) {
  if (!g || !canJoin(c)) return false;
  const first = c.name.split(' ')[0];
  c.joined = Date.now();
  delete c.slim;
  if (typeof c.trust !== 'number') initTrust(c, {});
  if (!TEMPERS[c.temper]) initTemper(c);
  if (!COEURS[c.coeur]) c.coeur = guessCoeur(c);
  if (typeof c.dates !== 'number') c.dates = 0;
  if (!Array.isArray(c.mem)) c.mem = [];
  c.firstTalk = c.firstTalk || Date.now();
  initTies(g); // a little something with each of the others (always the same for a pair)
  why = str(why, 70);
  addMem(g, c, why ? `avec le joueur, c’est devenu perso : ${why}` : 'avec le joueur, ce n’est plus seulement le travail');
  addNotif(g, { k: 'relup', c: c.id, at: later() + 1200, text: `💬 Avec ${first}, ce n’est plus seulement le travail.` });
  addChronicle(g, `Entre ${g.player.name} et ${c.name} (${c.role || 'un contact'}), c’est devenu personnel.`, [c.id]);
  return true;
}
// Their job, for the AI (they keep it once they joined the cast).
const jobLine = (c) => (c && c.joined && c.kind !== 'main' ? `${c.kind === 'ex' ? 'a travaillé pour le joueur' : c.kind === 'cand' ? 'postule chez le joueur' : c.kind === 'staff' ? 'travaille pour le joueur' : 'contact pro du joueur'} (${c.role || 'son métier'}), et c’est devenu personnel entre eux` : '');
function mains(g, unlockedOnly = true) {
  return g.order.map((id) => g.chars[id]).filter((c) => c && isMain(c) && (!unlockedOnly || c.unlocked));
}
function medias(g) { return g.order.map((id) => g.chars[id]).filter((c) => c && c.kind === 'media' && c.unlocked); }
function uniqueHandle(g, h) {
  const taken = new Set([g.player.handle, ...Object.values(g.chars).map((c) => c.handle)]);
  let x = h, i = 2;
  while (taken.has(x)) x = h.slice(0, 16) + i++;
  return x;
}
// opts.rename: give a taken handle a number instead of dropping the line (new characters after level 7).
// age: the age and maturity decided for them (0.17), or none (then the AI's "age", or a draw).
function addCharFromAI(g, o, { unlocked, kind, rename, age }) {
  const name = str(o.name, 40);
  if (!name) return null;
  let h = normHandle(o.handle) || normHandle(name);
  if (h.length < 2) h = 'perso' + randi(10, 99);
  if (Object.values(g.chars).some((c) => c.name.toLowerCase() === name.toLowerCase())) return null; // same person twice
  if (charByHandle(g, h) && !rename) return null; // duplicate line from the model
  h = uniqueHandle(g, h);
  const id = 'c' + (++g.seq);
  const rel = kind === 'media' ? 0 : int(o.rel, -40, 40, 0);
  const c = {
    id, kind, name, handle: h,
    emoji: cleanEmoji(o.emoji) || (kind === 'media' ? '📰' : ''),
    hue: hashStr(h) % 360,
    g: ['f', 'm', 'x'].includes(o.g) ? o.g : 'x',
    role: str(o.role, 60), bio: str(o.bio, 170), personality: str(o.personality, 240), voice: str(o.voice, 140),
    followers: Math.min(5e7, Math.max(12, Math.round(num(o.followers, randi(800, 40000))))),
    rel, unlocked: !!unlocked, unlockedAt: unlocked ? Date.now() : 0,
    followsYou: rel >= 25, youFollow: false, dmSent: 0, vibe: null, vibeGoal: null, mem: [],
  };
  if (kind === 'main') {
    const hook = str(o.hook, 110), hello = str(o.hello, 200), secret = str(o.secret, 160);
    if (hook) c.hook = hook;
    if (hello) c.hello = hello;
    if (secret) c.secret = secret; // hidden from the player: only the model knows it
    initTrust(c, o); // how hard they give their trust, and how much they start with
    initTemper(c, o); // 0.9.4: how they react to a scandal or to success, written by the AI
    initHeart(c, o); // 0.11: how they love (and how fast), and their closest friend
    initHeartTies(c, o); // 0.13: the cast they are close to, or cannot stand
    initAge(c, age || (num(o.age, 0) >= 18 ? { age: Math.min(70, num(o.age, 0)) } : null)); // 0.17
  }
  g.chars[id] = c;
  g.order.push(id);
  return c;
}
function author(g, a) {
  if (a === 'p') { const P = g.player; return { kind: 'player', id: 'p', name: P.name, handle: P.handle, emoji: P.emoji, hue: P.hue, photo: photoOf(g, P, 'p') }; }
  if (a && a.startsWith('c:')) {
    const c = g.chars[a.slice(2)];
    if (c) return { kind: c.kind === 'media' ? 'media' : 'char', id: c.id, name: c.name, handle: c.handle, emoji: c.emoji, hue: c.hue, verified: c.kind === 'main', photo: c.photo === 'none' ? null : photoOf(g, c, c.id) };
  }
  const h = a && a.startsWith('n:') ? a.slice(2) : 'inconnu';
  const n = g.npcs[h];
  if (n) return { kind: 'npc', id: null, name: n.name, handle: n.handle, emoji: n.emoji, hue: n.hue };
  return { kind: 'npc', id: null, name: prettyHandle(h), handle: h, emoji: '', hue: hashStr(h) % 360 };
}
// The public: ordinary users played by the model. Those seen often become regulars, who keep their name and tone.
function resolveAuthor(g, by, name, bio) {
  const h = normHandle(by);
  if (!h) return null;
  if (h === g.player.handle) return 'p';
  const c = charByHandle(g, h);
  if (c) return c.unlocked ? 'c:' + c.id : null;
  let n = g.npcs[h];
  if (!n) {
    let nm = str(name, 40) || prettyHandle(h);
    if (Object.values(g.chars).some((x) => x.name.toLowerCase() === nm.toLowerCase())) nm += ' (fan)'; // never a main character's name
    n = g.npcs[h] = { handle: h, name: nm, emoji: NPC_EMOJIS[hashStr(h) % NPC_EMOJIS.length], hue: hashStr(h + '*') % 360, seen: 0 };
  }
  const b = str(bio, 90);
  if (b && !n.bio) n.bio = b;
  n.seen = (n.seen || 0) + 1;
  n.lastAt = Date.now();
  // a network needs its trolls: the first ones to show up become regulars right away
  if (!n.regular && regulars(g).length < MAX_REGULARS && (n.seen >= 3 || (isTroll(n) && regulars(g).filter(isTroll).length < 3))) n.regular = true;
  return 'n:' + h;
}
function regulars(g) { return Object.values(g.npcs).filter((n) => n.regular).sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0)); }
const TROLL_RE = /troll|vanne|blague|m[èe]me|shitpost|chambr|clown|ratio|bouffon|second degr|trash|provoc|moqu|💀/i;
const isTroll = (n) => !!n && TROLL_RE.test(n.bio || '');
function addRegular(g, o) {
  const h = normHandle(o.handle) || normHandle(o.name);
  if (!h || h.length < 2 || h === g.player.handle || charByHandle(g, h) || g.npcs[h] || regulars(g).length >= MAX_REGULARS) return null;
  resolveAuthor(g, h, o.name, o.bio);
  const n = g.npcs[h];
  n.regular = true;
  n.seen = 0;
  n.lastAt = 0;
  const em = cleanEmoji(o.emoji);
  if (em) n.emoji = em;
  return n;
}
const npcFollowers = (n) => (n.regular ? 300 : 20) + (hashStr(n.handle + '#') % (n.regular ? 9000 : 1500));
function authorFollowers(g, a) {
  if (a && a.startsWith('c:')) { const c = g.chars[a.slice(2)]; if (c) return c.followers; }
  return randi(40, 900);
}

/* ---------- labels ---------- */
// vibe: with a crush or a flirt, being very close is not « meilleure amie ».
function relLabel(rel, gd, vibe) {
  const e = (m, fe, xe) => gx(gd, m, fe, xe);
  if ((vibe === 'crush' || vibe === 'flirt') && rel >= 55) return rel >= 80 ? 'Coup de foudre' : 'Coup de cœur';
  if (rel <= -60) return e('Ennemi juré', 'Ennemie jurée', 'Ennemi·e juré·e');
  if (rel <= -30) return e('Rival', 'Rivale', 'Rival·e');
  if (rel <= -10) return 'Ça coince';
  if (rel < 10) return 'Neutre';
  if (rel < 30) return 'Connaissance';
  if (rel < 55) return 'Pote';
  if (rel < 80) return e('Ami proche', 'Amie proche', 'Ami·e proche');
  return e('Meilleur ami', 'Meilleure amie', 'Meilleur·e ami·e');
}
/* ---------- reputation (0.10): shown on 1000, four pillars; slow to earn (slower near the top), quick to lose ----------
   stats.reputation stays the overall figure on 100 (every threshold of the game reads it), made of the four pillars. */
const REP_PILLARS = {
  image: { label: 'Image', w: 0.35, emoji: '✨', desc: 'comment tes posts sont reçus', ai: 'image' },
  cred: { label: 'Crédibilité', w: 0.25, emoji: '🔎', desc: 'est-ce qu’on te croit : preuves, rumeurs, promesses tenues', ai: 'crédibilité' },
  pro: { label: 'Fiabilité pro', w: 0.15, emoji: '🤝', desc: 'contrats, mentions légales, salaires', ai: 'fiabilité pro' },
  kind: { label: 'Comportement', w: 0.25, emoji: '🫶', desc: 'comment tu traites les gens', ai: 'comportement' },
};
const REP_IDS = Object.keys(REP_PILLARS);
const REP_TIERS = [[970, 'Légendaire'], [900, 'Exemplaire'], [800, 'Excellente'], [700, 'Très bonne'], [550, 'Bonne'], [400, 'Correcte'], [250, 'Fragile'], [100, 'Sulfureuse'], [0, 'Infréquentable']];
const REP_DAY_CAP = 8; // what a pillar can gain in a game day at the full rate (beyond: a quarter of it)
const rep1000 = (r) => Math.round(clamp(num(r, 0), 0, 100) * 10);
function repLabel(r) { const v = rep1000(r); return (REP_TIERS.find(([m]) => v >= m) || REP_TIERS[REP_TIERS.length - 1])[1]; }
// A change of the overall figure, in the points shown (on 1000): « +14 de réputation », « −120 de réputation ».
const repPts = (d) => Math.round(d * 10);
const repWord = (d) => { const n = repPts(d); return `${n >= 0 ? '+' : '−'}${Math.abs(n)} de réputation`; };
function ensureRep(s) {
  const r0 = clamp(num(s.reputation, 50), 0, 100);
  if (!s.rep4 || typeof s.rep4 !== 'object') s.rep4 = {};
  for (const k of REP_IDS) if (typeof s.rep4[k] !== 'number') s.rep4[k] = r0;
  if (!Array.isArray(s.repLog)) s.repLog = [];
  return s.rep4;
}
const repGlobal = (P) => Math.round(REP_IDS.reduce((n, k) => n + P[k] * REP_PILLARS[k].w, 0) * 100) / 100;
const repRoom = (cur) => clamp(1 - cur / 100, 0.05, 1); // what a gain is worth: everything at the bottom, a tenth near the top
const repFall = (cur) => 0.8 + cur / 250; // the higher, the harder the fall
// Applies a plan { image, cred, pro, kind } (pillar points on 100) and returns the change of the overall figure.
// opts.raw: as is (a recovery, an agency); opts.dry: only says what it would do.
function repMove(g, plan, why, opts = {}) {
  const s = g.stats, P0 = ensureRep(s), t = Date.now();
  const P = opts.dry ? Object.assign({}, P0) : P0;
  const live = s.repDay && t - s.repDay.at < 24 * 3600000 ? s.repDay : { at: t, n: {} };
  const day = opts.dry ? { at: live.at, n: Object.assign({}, live.n) } : (s.repDay = live);
  const before = repGlobal(P);
  for (const k of REP_IDS) {
    let d = num(plan && plan[k], 0);
    if (!d) continue;
    if (d > 0 && !opts.raw) {
      d *= repRoom(P[k]);
      const used = day.n[k] || 0;
      d = used >= REP_DAY_CAP ? d * 0.25 : used + d > REP_DAY_CAP ? REP_DAY_CAP - used + (used + d - REP_DAY_CAP) * 0.25 : d;
      day.n[k] = used + d;
    } else if (d < 0 && !opts.raw) d *= repFall(P[k]);
    P[k] = clamp(Math.round((P[k] + d) * 100) / 100, 0, 100);
  }
  const after = repGlobal(P), delta = Math.round((after - before) * 100) / 100;
  if (opts.dry) return delta;
  s.reputation = after;
  if (why && Math.abs(delta) >= 0.05) {
    const main = REP_IDS.filter((k) => plan && plan[k]).sort((a, b) => Math.abs(plan[b] * REP_PILLARS[b].w) - Math.abs(plan[a] * REP_PILLARS[a].w))[0] || null;
    const last = s.repLog[s.repLog.length - 1], w = str(why, 90);
    if (last && last.why === w && t - last.at < 30 * 60000) { last.d = Math.round((last.d + delta) * 100) / 100; last.at = t; } // a drip, a recovery: one line
    else s.repLog.push({ at: t, d: delta, why: w, p: main });
    if (s.repLog.length > 30) s.repLog.splice(0, s.repLog.length - 30);
  }
  if (!opts.noCheck) checkCancel(g);
  return delta;
}
const repTry = (g, plan, opts = {}) => repMove(g, plan, null, Object.assign({}, opts, { dry: true }));
// The same move for every pillar (a recovery, a communication agency): the overall figure moves by d.
const repShift = (g, d, why, opts = {}) => repMove(g, Object.fromEntries(REP_IDS.map((k) => [k, d])), why, Object.assign({ raw: true }, opts));
// Never above max (an exposed fake always ends in a cancel): every pillar comes down in proportion.
function repFloor(g, max, why) {
  const s = g.stats, P = ensureRep(s), cur = repGlobal(P);
  if (cur <= max) return 0;
  const f = max / cur;
  for (const k of REP_IDS) P[k] = Math.round(P[k] * f * 100) / 100;
  s.reputation = repGlobal(P);
  if (why) s.repLog.push({ at: Date.now(), d: s.reputation - cur, why: str(why, 90), p: 'cred' });
  return s.reputation - cur;
}
// Sets the whole reputation (every pillar) at r: a save from before, the tests.
function repSet(g, r) { const P = ensureRep(g.stats); for (const k of REP_IDS) P[k] = clamp(num(r, 50), 0, 100); g.stats.reputation = repGlobal(P); return g.stats.reputation; }
// At least min (the agency's guaranteed end of a cancel).
function repAtLeast(g, min, why) { const cur = repGlobal(ensureRep(g.stats)); return cur < min ? repShift(g, min - cur + 0.01, why, { noCheck: true }) : 0; }
// For the AI: the overall figure and where it comes from.
function repCtx(s) {
  const P = ensureRep(s), low = REP_IDS.filter((k) => P[k] < 35), high = REP_IDS.filter((k) => P[k] >= 75);
  return `réputation ${rep1000(s.reputation)}/1000 (${repLabel(s.reputation).toLowerCase()}) : ${REP_IDS.map((k) => `${REP_PILLARS[k].ai} ${rep1000(P[k])}`).join(', ')}`
    + (low.length ? ` ; point faible : ${low.map((k) => REP_PILLARS[k].ai).join(', ')}` : '') + (high.length ? ` ; point fort : ${high.map((k) => REP_PILLARS[k].ai).join(', ')}` : '');
}

/* =========================================================
   Cafés: the player's AI budget for the day. Every answer of the characters uses some of the player's own
   Claude or ChatGPT plan; the game counts what it uses (by the length of what it sends and gets back),
   shows it, and pauses before going past the budget the player set for this game. Back to full at midnight.
   ========================================================= */
const CAFE_CHARS = 18000; // what one café pays for: about 4 500 tokens, the question and the answer together
const CHARS_PER_TOKEN = 4;
const BUDGETS = [ // cafés per day; 0: no limit (still counted)
  { n: 10, label: 'Découverte', desc: 'Pour essayer : quelques actions par jour.' },
  { n: 25, label: 'Léger', desc: 'Une petite session par jour : ton abonnement reste libre pour le reste.' },
  { n: 60, label: 'Normal', desc: 'Une bonne session de jeu par jour.' },
  { n: 150, label: 'Intensif', desc: 'Pour jouer longtemps, ou en intensité Vivant.' },
  { n: 400, label: 'Marathon', desc: 'Des heures de jeu, ou l’intensité Ultime : pour les gros abonnements.' },
  { n: 0, label: 'Sans limite', desc: 'Le jeu compte, mais ne t’arrête jamais. À toi de surveiller.' },
];
// Which budget for which plan (0.10): what the player's subscription can take.
const PLAN_ADVICE = 'Claude gratuit : Découverte ou Léger. Claude Pro, ChatGPT Go ou Plus : Intensif ou Marathon (avec l’intensité Vivant ou Ultime). Claude Max, ChatGPT Pro : Sans limite.';
/* ---------- the game's intensity (0.10; 0.19: every level has every feature, only the volume and the pace change) ----------
   A level sets three things:
   - the volume (vol): replies to the player's post and to one of their replies, posts around it, a refresh's posts and
     replies, the comments « Voir plus » writes, the reactions that keep coming after a post (waves, written in the post's
     own answer since 0.19) and, at the top, comments loaded as soon as a thread opens. 0.23.1: « Les commentaires »
     (opts.comments: Peu, Normal, Beaucoup, Énorme) picks it, whatever the level (before: the switch opts.chatty);
   - the life (DMs the characters send, how often they take the initiative, come over, start a drama…): life.k;
   - the memory sent with each call (the feed, the chronicle, the public, how many character sheets in full; for a talk
     or a scene, the chronicle; for a private conversation, how many of its last messages): mem.
   « Le réseau vit tout seul » (the ChatGPT app only; 0.23.1: opts.live, Coupé, Doux, Normal, À fond: a refresh
   every 15, 8 or 5 minutes, only while the player is there; before: the switch opts.autoLive). */
const VOL = {
  calme: { act: ['3 à 4', '1 à 2'], actMax: 5, actPosts: '0 à 2', actPostMax: 2, refresh: { posts: '3 à 4', absent: '5 à 6', replies: '1 à 2', perPost: 4, max: 6 }, more: 6, waves: 0 },
  normal: { act: ['4 à 6 (jusqu’à 8 si ça fait vraiment du bruit)', '1 à 3'], actMax: 8, actPosts: '1 à 3', actPostMax: 4, refresh: { posts: '4 à 6', absent: '6 à 8', replies: '2 à 4', perPost: 6, max: 8 }, more: 8, waves: 0 },
  vivant: { act: ['7 à 10 (jusqu’à 12 si ça fait vraiment du bruit)', '2 à 4'], actMax: 12, actPosts: '2 à 4', actPostMax: 5, refresh: { posts: '6 à 8', absent: '8 à 10', replies: '6 à 10, deux ou trois sous la plupart des posts', perPost: 10, max: 10 }, more: 10, waves: 1 },
  ultime: { act: ['10 à 14 (jusqu’à 18 si ça fait vraiment du bruit)', '3 à 5'], actMax: 18, actPosts: '3 à 5', actPostMax: 6, refresh: { posts: '8 à 10', absent: '10 à 12', replies: '10 à 16, trois à cinq sous chaque post, qui se répondent entre eux', perPost: 16, max: 12 }, more: 14, waves: 2, autoMore: true },
};
const INTENSITY = {
  calme: { label: 'Calme', emoji: '🌙', desc: 'Le moins cher : des persos qui prennent moins souvent l’initiative, un monde plus tranquille, une mémoire un peu plus courte.',
    actDms: 1, dmMsgs: '1 à 2', dmMax: 2, dms: 1, absentDms: 1, comments: 'peu', live: 'off', life: { k: 0.6, often: 'rarement' }, mem: { feed: 5, chron: 4, crowd: 4, focus: 4, talk: 3, dm: 8 } },
  normal: { label: 'Normal', emoji: '☀️', desc: 'L’équilibre : un monde vivant sans trop consommer.',
    actDms: 1, dmMsgs: '1 à 3', dmMax: 3, dms: 1, absentDms: 2, comments: 'normal', live: 'off', life: { k: 1, often: 'de temps en temps' }, mem: { feed: 8, chron: 6, crowd: 6, focus: 6, talk: 5, dm: 10 } },
  vivant: { label: 'Vivant', emoji: '🔥', desc: 'Des persos qui t’écrivent et débarquent plus souvent, un monde qui bouge plus vite.',
    actDms: 2, dmMsgs: '1 à 3', dmMax: 3, dms: 2, absentDms: 3, comments: 'beaucoup', live: 'off', life: { k: 1.4, often: 'assez souvent' }, mem: { feed: 8, chron: 6, crowd: 6, focus: 6, talk: 5, dm: 10 } },
  ultime: { label: 'Ultime', emoji: '🚀', desc: 'Le maximum : les persos t’écrivent et débarquent souvent, le monde bouge vite, et ils ont la plus longue mémoire.',
    actDms: 3, dmMsgs: '2 à 4', dmMax: 4, dms: 3, absentDms: 4, comments: 'enorme', live: 'fort', life: { k: 1.8, often: 'souvent' }, mem: { feed: 10, chron: 8, crowd: 7, focus: 7, talk: 6, dm: 12 } },
};
const INTENSITY_IDS = Object.keys(INTENSITY);
const levelOf = (g) => (g && g.opts && INTENSITY[g.opts.intensity] ? g.opts.intensity : 'normal');
/* 0.23.1: the two biggest costs, each in four steps (the level sets them; the player may change them). */
const COMMENTS = {
  peu: { label: 'Peu', vol: 'calme', desc: 'Quelques réactions sous chaque post.' },
  normal: { label: 'Normal', vol: 'normal', desc: 'Des commentaires en nombre normal.' },
  beaucoup: { label: 'Beaucoup', vol: 'vivant', desc: 'Plein de réactions sous chaque post, et une vague de plus après chacun de tes posts.' },
  enorme: { label: 'Énorme', vol: 'ultime', desc: 'Le fil déborde : deux vagues de plus après chacun de tes posts, et les commentaires se chargent tout seuls quand tu ouvres un post.' },
};
const COMMENT_IDS = Object.keys(COMMENTS);
const LIVE = {
  off: { label: 'Coupé', ms: 0, desc: 'Le fil ne bouge que quand tu l’actualises ou que tu avances le temps.' },
  doux: { label: 'Doux', ms: 15 * 60000, desc: 'De nouveaux posts toutes les 15 minutes environ.' },
  normal: { label: 'Normal', ms: 8 * 60000, desc: 'De nouveaux posts toutes les 8 minutes environ.' },
  fort: { label: 'À fond', ms: 5 * 60000, desc: 'De nouveaux posts toutes les 5 minutes environ.' },
};
const LIVE_IDS = Object.keys(LIVE);
// A volume, in the comments' words (the games from before 0.23.1 had a switch: on, Vivant's at least; off, Normal's at most).
const VOL_COMMENTS = { calme: 'peu', normal: 'normal', vivant: 'beaucoup', ultime: 'enorme' };
const volId = (lv, chatty) => (chatty ? (lv === 'ultime' ? 'ultime' : 'vivant') : lv === 'calme' ? 'calme' : 'normal'); // (the old switch)
// What the player chose, or the level's own.
function commentsOf(g, o = g && g.opts) {
  const lv = INTENSITY[o && o.intensity] ? o.intensity : levelOf(g);
  if (o && COMMENTS[o.comments]) return o.comments;
  if (o && typeof o.chatty === 'boolean') return VOL_COMMENTS[volId(lv, o.chatty)];
  return INTENSITY[lv].comments;
}
function liveOf(g, o = g && g.opts) {
  const lv = INTENSITY[o && o.intensity] ? o.intensity : levelOf(g);
  if (o && LIVE[o.live]) return o.live;
  if (o && typeof o.autoLive === 'boolean') return o.autoLive ? 'normal' : 'off';
  return INTENSITY[lv].live;
}
const chattyOn = (g) => COMMENTS[commentsOf(g)].vol === 'vivant' || COMMENTS[commentsOf(g)].vol === 'ultime';
const autoLiveOn = (g) => liveOf(g) !== 'off';
const volIdOf = (g) => COMMENTS[commentsOf(g)].vol;
const volFor = (vol) => VOL[vol] || VOL.normal;
// What the rest of the game reads: the level, its volume (switch included) and its life, in one object.
function intensityOf(g) {
  const lv = levelOf(g), I = INTENSITY[lv], V = volFor(volIdOf(g));
  return Object.assign({}, I, V, { id: lv, refresh: Object.assign({}, V.refresh, { dms: I.dms, absentDms: I.absentDms }), autoMore: !!V.autoMore, auto: autoLiveOn(g), liveMs: LIVE[liveOf(g)].ms });
}
const lifeK = (g) => intensityOf(g).life.k;
const BUDGET_DEFAULT = 60;
/* ---------- what things cost (0.19: measured, no longer guessed) ----------
   Cafés per call, in two parts: what the game sends, by level (its memory: measured on games with ten characters, a few
   hours in, and on the lab's situations), and what usually comes back, by volume (from real answers, scaled by what each
   volume asks for). The game then learns each game's own average per kind (budget.avg). */
const COST_IN = {
  calme: { post: 0.95, reply: 0.93, dm: 0.62, refresh: 1.01, skip: 0.97, more: 0.61, talk: 0.55, visit: 0.62, ideas: 0.58 },
  normal: { post: 1.06, reply: 1.03, dm: 0.65, refresh: 1.09, skip: 1.08, more: 0.61, talk: 0.56, visit: 0.63, ideas: 0.58 },
  vivant: { post: 1.09, reply: 1.05, dm: 0.65, refresh: 1.11, skip: 1.08, more: 0.61, talk: 0.56, visit: 0.63, ideas: 0.58 },
  ultime: { post: 1.12, reply: 1.08, dm: 0.68, refresh: 1.12, skip: 1.11, more: 0.61, talk: 0.57, visit: 0.64, ideas: 0.58 },
};
const COST_OUT = {
  calme: { post: 0.08, reply: 0.04, dm: 0.02, refresh: 0.08, skip: 0.11, more: 0.06, talk: 0.02, visit: 0.03, ideas: 0.03 },
  normal: { post: 0.11, reply: 0.05, dm: 0.03, refresh: 0.12, skip: 0.16, more: 0.08, talk: 0.02, visit: 0.03, ideas: 0.03 },
  vivant: { post: 0.22, reply: 0.06, dm: 0.03, refresh: 0.2, skip: 0.25, more: 0.09, talk: 0.02, visit: 0.03, ideas: 0.03 },
  ultime: { post: 0.32, reply: 0.07, dm: 0.04, refresh: 0.28, skip: 0.33, more: 0.13, talk: 0.02, visit: 0.03, ideas: 0.03 },
};
const COST_KINDS = Object.keys(COST_IN.normal);
const costAt = (lv, vol, kind) => (COST_IN[lv] || COST_IN.normal)[kind] + (COST_OUT[vol] || COST_OUT.normal)[kind];
// One hour of play: 8 posts, 4 comments, 15 private messages, 4 refreshes, a date (5 exchanges), a visit (3 exchanges),
// 2 « Voir plus », 1 « Des idées ? ». A livelier level writes to the player and comes over more often (more to answer);
// more comments (the late reactions are written in the post's own answer: its measured cost) and, at the top, comments
// loaded as threads open; and the network that lives on its own (the ChatGPT app), at its pace (0.23.1).
const HOUR_MIX = { post: 8, reply: 4, dm: 15, refresh: 4, talk: 5, visit: 3, more: 2, ideas: 1 };
function hourCafes(lv, vol, live) {
  const V = volFor(vol), ms = (LIVE[live] || LIVE.off).ms;
  const k = (INTENSITY[lv] || INTENSITY.normal).life.k, mix = Object.assign({}, HOUR_MIX, { dm: HOUR_MIX.dm * (0.7 + 0.3 * k), visit: HOUR_MIX.visit * k });
  let n = 0;
  for (const x in mix) n += mix[x] * costAt(lv, vol, x);
  if (V.autoMore) n += 6 * costAt(lv, vol, 'more');
  if (ms) n += (3600000 / ms) * costAt(lv, vol, 'refresh');
  return n;
}
const hourCafesOf = (g) => hourCafes(levelOf(g), volIdOf(g), HOST ? liveOf(g) : 'off');
// What a budget is worth in actions, at a level (posts, or private messages).
function budgetHint(n, lv = 'normal', vol = COMMENTS[(INTENSITY[lv] || INTENSITY.normal).comments].vol) {
  if (!n) return 'compté, jamais bloqué';
  const posts = Math.max(1, Math.round(n / costAt(lv, vol, 'post'))), dms = Math.max(1, Math.round(n / costAt(lv, vol, 'dm')));
  return `≈ ${fmtPlain(posts)} ${plural(posts, 'post', 'posts')} ou ${fmtPlain(dms)} ${plural(dms, 'message', 'messages')}`;
}
// What the rarer kinds of call usually cost, before the game has measured them (cafés); the others: costAt.
const CAFE_GUESS = { wave: 0.62, accuse: 1.2, debunk: 1.15, shoot: 0.7, date: 0.75, event: 0.9, write: 0.55, cand: 0.6, newchar: 0.6, world: 2.6, repost: 0.5, devis: 0.3 }; // 0.20: the quote
const realDay = (t = Date.now()) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const nextMidnight = (t = Date.now()) => { const d = new Date(t); d.setHours(24, 0, 0, 0); return d.getTime(); };
function budgetOf(g) {
  if (!g.budget || typeof g.budget !== 'object') g.budget = { daily: BUDGET_DEFAULT, day: realDay(), used: 0, extra: 0, chars: 0, total: 0, avg: {}, warned: false };
  const b = g.budget;
  if (!b.avg || typeof b.avg !== 'object') b.avg = {};
  const today = realDay();
  if (b.day !== today) Object.assign(b, { day: today, used: 0, extra: 0, chars: 0, warned: false, today: {} }); // a new day: back to full
  if (!b.today || typeof b.today !== 'object') b.today = {};
  if (!b.uses || typeof b.uses !== 'object') b.uses = {};
  return b;
}
const unlimited = (g) => budgetOf(g).daily === 0;
const budgetMax = (g) => { const b = budgetOf(g); return b.daily + (b.extra || 0); };
// Cafés left today (Infinity without a limit).
function cafesLeft(g) { const b = budgetOf(g); return b.daily === 0 ? Infinity : Math.max(0, budgetMax(g) - b.used); }
// The café chip and every « il t’en reste » read this. nextIn: until the budget is full again (midnight).
function energyNow(g, t = Date.now()) {
  const b = budgetOf(g), left = cafesLeft(g);
  return { energy: left === Infinity ? Infinity : Math.floor(left + 1e-9), left, max: budgetMax(g), used: b.used, full: b.used <= 0, nextIn: nextMidnight(t) - t, unlimited: b.daily === 0 };
}
// What an action will cost, from what this kind of call cost before in this game (shown on the buttons: « ≈ 2 ☕ »).
const costGuess = (g, kind) => { const a = budgetOf(g).avg[kind]; return a > 0 ? a : COST_KINDS.includes(kind) ? costAt(levelOf(g), volIdOf(g), kind) : CAFE_GUESS[kind] || 1; };
const costLabel = (g, kind) => Math.max(1, Math.round(costGuess(g, kind)));
// The guard: can this action start? (the call is paid after, for what it really used)
const canAfford = (g, kind) => unlimited(g) || (cafesLeft(g) > 0.05 && cafesLeft(g) >= costGuess(g, kind) * 0.5);
// use (0.23.1): what it was for, when the kind does not say it (the network living on its own, a visit…): « Où passent
// tes cafés » shows today's and the whole game's, by use.
function chargeBudget(g, kind, chars, use) {
  if (!g || !(chars > 0)) return 0;
  const b = budgetOf(g), cafes = chars / CAFE_CHARS, u = use || kind || 'autre';
  b.used += cafes;
  b.chars += chars;
  b.total = (b.total || 0) + cafes;
  if (kind) b.avg[kind] = b.avg[kind] > 0 ? b.avg[kind] * 0.7 + cafes * 0.3 : cafes;
  b.today[u] = (b.today[u] || 0) + cafes;
  b.uses[u] = (b.uses[u] || 0) + cafes;
  return cafes;
}
// What each use is called, for « Où passent tes cafés ».
const USE_LABELS = {
  dm: '💬 Messages privés', talk: '💘 Rendez-vous (en vrai)', date: '🎲 Rendez-vous (mini-jeu)', visit: '🚪 Visites', post: '✍️ Tes posts',
  reply: '↩️ Tes commentaires', accuse: '📣 Accusations', debunk: '🧯 Démentis', auto: '🌍 Le réseau vit tout seul', refresh: '🔄 Actualiser le fil',
  skip: '⏩ Avancer le temps', more: '💭 Voir plus de commentaires', wave: '🌊 Vagues de réactions', shoot: '🎬 Tournages', event: '🎟️ Événements',
  ideas: '💡 Des idées ?', write: '🪄 Écrire pour moi', world: '🌐 Création du monde', newchar: '🧑 Nouveaux personnages', cand: '🧾 Candidatures',
  devis: '🧮 Devis', repost: '🔁 Reposts', job: '🎞️ Tes services', images: '🖼️ Tes images', autre: '· Autre',
};
// The uses, the biggest first: [[use, cafés], …].
const usesOf = (g, all) => Object.entries(all ? budgetOf(g).uses : budgetOf(g).today).filter((x) => x[1] >= 0.05).sort((a, b) => b[1] - a[1]);
const budgetTokens = (chars) => Math.round(chars / CHARS_PER_TOKEN);
// Back-compat for the code that spoke of energy: nothing is paid up front any more.
function syncEnergy(g) { budgetOf(g); }
// After each call: a word when a fifth of the day's budget is left, and when it is gone.
function budgetWatch(g) {
  if (!g || unlimited(g) || S.game !== g) return;
  const b = budgetOf(g), left = cafesLeft(g), max = budgetMax(g);
  if (left <= 0.05) { if (b.warned !== 'out') { b.warned = 'out'; toast(`Budget IA du jour épuisé (${fmtPlain(max)} cafés). L’IA se met en pause jusqu’à minuit.`, 'bad', { label: 'Options', run: () => queueModal({ t: 'budget', at: Date.now() }) }); } }
  else if (left <= max * 0.2 && !b.warned) { b.warned = 'low'; toast(`Plus que ${Math.floor(left)} ${plural(Math.floor(left), 'café', 'cafés')} aujourd’hui : ton budget IA touche à sa fin.`, 'flash', { label: 'Régler', run: () => queueModal({ t: 'budget', at: Date.now() }) }); }
}
// An action the budget cannot pay for: explain, and let the player decide.
function budgetBlocked() { queueModal({ t: 'budget', at: Date.now(), blocked: true }); }
// « +10 cafés juste pour aujourd’hui »: the player's own choice, never automatic.
function addExtraCafes(g, n = 10) { const b = budgetOf(g); b.extra = (b.extra || 0) + n; if (b.warned === 'out') b.warned = 'low'; update(); }

/* =========================================================
   Notifications, chronicle, memories, triggers
   ========================================================= */
function addNotif(g, n) {
  const at = n.at || later();
  const o = tag({ id: uid('n'), ts: at, at, k: n.k, text: n.text, c: n.c || null, p: n.p || null });
  if (n.tg) o.tg = n.tg; // a hashtag to open
  if (n.sk) o.sk = n.sk; // 0.24: a skill's tree to open
  g.notifs.push(o);
  if (g.notifs.length > 140) g.notifs.splice(0, g.notifs.length - 140);
  bumpLive(at + 500);
  return o;
}
// who (0.22.2): the characters it happened with, when it happened in private (only they know, and whoever is told);
// love: a love story's line (whoever heard of that love story may read it too).
function addChronicle(g, text, who = null, love = false) {
  text = str(text, 220);
  if (!text) return;
  if (g.chronicle.length && g.chronicle[g.chronicle.length - 1].text === text) return;
  const e = { ts: Date.now(), text };
  if (Array.isArray(who) && who.length) { e.who = who.slice(0, 4); if (love) e.love = true; }
  g.chronicle.push(e);
  if (g.chronicle.length > 24) g.chronicle.splice(0, g.chronicle.length - 24);
}
// What a character remembers about the player, from their point of view (up to 6, oldest first out).
// shown (0.17): what the player sees of it, when the character knows more than the player may (who told them).
function addMem(g, by, text, shown) {
  const c = typeof by === 'object' ? by : charByHandle(g, normHandle(by));
  if (!c || !isMain(c)) return;
  text = str(text, 110);
  const wrapped = /^[«"“]\s*([^«»"“”]*?)\s*[»"”]$/.exec(text); // the whole memory quoted: drop the quotes
  if (wrapped) text = wrapped[1];
  if (!text) return;
  c.mem = (c.mem || []).filter((m) => m.t.toLowerCase() !== text.toLowerCase() && !similar(m.t, text));
  c.mem.push(shown ? { t: text, ts: Date.now(), s: str(shown, 110) } : { t: text, ts: Date.now() });
  if (c.mem.length > 6) c.mem.splice(0, c.mem.length - 6);
}
// Story beats chosen by the game, played by the next AI call (post, reply, refresh, or a DM with that character).
const TRIGGER_TTL = 30 * 60 * 1000;
function addTrigger(g, text, charId) {
  if (!g.triggers) g.triggers = [];
  const tx = str(text, 240);
  if (g.triggers.some((x) => x.text === tx)) return; // (0.27.6: compared as kept: a long one was never found again)
  g.triggers.push({ id: uid('tr'), text: tx, c: charId || null, at: Date.now() });
  if (g.triggers.length > 4) g.triggers.splice(0, g.triggers.length - 4);
}
function activeTriggers(g, charId) {
  const t = Date.now();
  g.triggers = (g.triggers || []).filter((x) => t - x.at < TRIGGER_TTL);
  return charId === undefined ? g.triggers.slice() : g.triggers.filter((x) => x.c === charId);
}
function dropTriggers(g, list) {
  if (!list || !list.length) return;
  const ids = new Set(list.map((x) => x.id));
  g.triggers = (g.triggers || []).filter((x) => !ids.has(x.id));
}

// Clues the player noticed about a character's secret: they go to the player's file on that character.
function addClue(g, about, text, at) {
  const c = typeof about === 'object' ? about : charByHandle(g, normHandle(about));
  if (!c || !isMain(c) || !c.unlocked || c.secretOut) return null;
  text = str(text, 130);
  if (!text) return null;
  if (!g.clues) g.clues = [];
  const mine = g.clues.filter((k) => k.c === c.id);
  if (mine.length >= 6 || mine.some((k) => similar(k.text, text))) return null;
  const t = at || later();
  const k = tag({ id: uid('k'), c: c.id, text, ts: t, at: t });
  g.clues.push(k);
  addNotif(g, { k: 'clue', c: c.id, at: t, text: `Indice noté sur ${c.name} : ${text}` });
  return k;
}
const inBadBuzz = (c, t = Date.now()) => !!(c && c.badBuzz && t < c.badBuzz.until);
// 0.15: whether the player caused it (a call-out), or not (their own doing, a trial, an advice nobody knows about).
const bbByPlayer = (c) => !!(c && c.badBuzz && !c.badBuzz.self && !c.badBuzz.trial && !c.badBuzz.advice);
const BUZZ_LINES = [
  (h, t) => `@${h} va devoir s’expliquer… ${t}`,
  (h, t) => `bon @${h} on attend tes explications ${t} 🍿`,
  (h, t) => `j’ai toujours su que @${h} cachait un truc ${t}`,
  (h, t) => `les screens de @${h} tournent partout, c’est chaud ${t}`,
];
// strength (0-1): how hard the proof hits (a video's score, a call-out's credibility): the stronger, the harder to get out.
function startBadBuzz(g, c, reason, cred, exposed, strength) {
  const t = later();
  const loss = Math.round(c.followers * clamp(0.06 + (cred - 6) * 0.025, 0.06, 0.2));
  c.followers = Math.max(12, c.followers - loss);
  c.badBuzz = { at: t, until: t + BADBUZZ_MS, reason: str(reason, 140), loss, strength: clamp(strength != null ? strength : cred / 10, 0, 1) };
  c.buried = false;
  const out = exposed && c.secret ? c.secret : '';
  if (out) c.secretOut = out;
  if (out && c.secretTold) secretBetrayed(g, c); // the secret they had confided to the player: they know who told
  addNotif(g, { k: 'badbuzz', c: c.id, at: t, text: `${c.name} est en plein bad buzz : −${nAbonnes(loss)}${out ? '. Son secret éclate au grand jour' : ''}` });
  addChronicle(g, `${c.name} (@${c.handle}) est en plein bad buzz après les accusations de ${g.player.name}${out ? ' : ' + out : ''}.`);
  addTrigger(g, `@${c.handle} est en plein bad buzz (le joueur l’accuse : « ${str(reason, 90)} »)${out ? ` et son secret a éclaté : ${out}` : ''}. Qu’il ou elle réagisse (déni, excuses ou contre-attaque) et que les autres prennent parti.`, c.id);
  const n = pick(CANCEL_NPCS);
  const hashtag = '#' + pascalHandle(c.handle) + 'Gate';
  addAmbientPost(g, { by: n[0], name: n[1], text: pick(BUZZ_LINES)(c.handle, hashtag) }, t + randi(3000, 7000));
}

/* ---------- 0.15: they fall into a bad buzz on their own too ----------
   The AI decides who and why, when a refresh gives it the chance (at most one every day and a half of game time, one
   bad buzz at a time); the game makes it count: followers lost, everybody talks, and the player chooses a side, or not. */
const SELF_BUZZ_GAP = 36 * 3600000;
const SELF_BUZZ_MS = 8 * 3600000;
const selfBuzzOK = (g, t = Date.now()) => t - (g.selfBuzzAt || 0) >= SELF_BUZZ_GAP / lifeK(g) && !mains(g).some((c) => inBadBuzz(c, t)); // 0.19: by level
function startSelfBuzz(g, by, why) {
  const c = typeof by === 'object' ? by : charByHandle(g, normHandle(by));
  why = str(why, 100).replace(/[.\s]+$/, '');
  if (!c || !isMain(c) || !c.unlocked || !why || !selfBuzzOK(g) || openTrial(g, c)) return null;
  const t = later();
  const loss = Math.round(c.followers * rand(0.04, 0.09));
  c.followers = Math.max(12, c.followers - loss);
  c.badBuzz = { at: t, until: t + SELF_BUZZ_MS, reason: why, loss, strength: 0.55, self: true };
  c.buried = false;
  g.selfBuzzAt = Date.now();
  addNotif(g, { k: 'badbuzz', c: c.id, at: t, text: `🔥 ${c.name} est en plein bad buzz : ${why}${loss > 0 ? ` (−${nAbonnes(loss)})` : ''}` });
  addChronicle(g, `${c.name} (@${c.handle}) se prend un bad buzz : ${why}.`);
  return c;
}

// The chance that someone in a bad buzz gets out of it at their own event (live, answer…): none once buried.
const bbEscape = (c) => (c.buried ? 0 : clamp(0.85 - (c.badBuzz && c.badBuzz.strength != null ? c.badBuzz.strength : 0.7), 0.05, 0.75));
const escapeChance = (c) => (!inBadBuzz(c) ? 1 : bbEscape(c));
// A second proof while they are down: no way out of this one, whatever they answer.
function buryChar(g, c) {
  const t = later();
  const loss = Math.round(c.followers * 0.1);
  c.followers = Math.max(12, c.followers - loss);
  c.buried = true;
  if (c.badBuzz) Object.assign(c.badBuzz, { until: Math.max(c.badBuzz.until, Date.now()) + 3 * BADBUZZ_MS, loss: (c.badBuzz.loss || 0) + loss, strength: 1 });
  const fin = gx(c.g, 'enterré', 'enterrée', 'enterré·e');
  addNotif(g, { k: 'badbuzz', c: c.id, at: t, text: `${c.name} est ${fin} : −${nAbonnes(loss)}, et plus aucune réponse ne pourra ${gx(c.g, 'le', 'la', 'l’')} sauver.` });
  addChronicle(g, `${g.player.name} a ${fin} ${c.name} avec une nouvelle vidéo implacable.`);
  addTrigger(g, `@${c.handle} est ${fin} : la nouvelle vidéo du joueur l’a ${gx(c.g, 'achevé', 'achevée', 'achevé·e')}. Quoi qu’${gx(c.g, 'il', 'elle', 'iel')} dise, plus personne ne ${gx(c.g, 'le', 'la', 'l’')} croit.`, c.id);
  addMem(g, c, `le joueur m’a ${fin} avec sa deuxième vidéo`);
}

/* ---------- fake proofs: if the network bites, the target sinks; if someone spots the fake, the player does ---------- */
const playerBadBuzz = (g, t = Date.now()) => !!(g && g.pbb && t < g.pbb.until);
// How closely the public looks at this call-out (0-100), rolled by the game before the model judges the fake.
function rollVigilance(g, c, nClues) {
  const s = g.stats;
  let v = randi(15, 85);
  v += 12 * Math.min(4, s.busts || 0); // caught lying before: everybody checks
  if (c.followers > s.followers * 2) v += 8; // a big name has fans who check everything
  v -= Math.round((s.reputation - 50) / 4); // a trusted account is believed
  v -= 7 * Math.min(3, nClues); // real clues make the fake blend in
  v -= Math.round(skillFx(g, 'forge')); // a creative mind forges better (0.24: its level / 5)
  return clamp(v, 5, 95);
}
const fakeNeed = (vig) => Math.max(1, Math.ceil(vig / 10)); // the fake's quality (0-10) that gets past this vigilance
// A fake that got past the public can still be taken apart later by a counter-investigation.
const laterBustChance = (g, q) => clamp(0.12 + (10 - q) * 0.07 + 0.05 * (g.stats.busts || 0), 0.1, 0.6);
const FAKE_LINES = [
  (h, c, t) => `la « preuve » de @${h} contre @${c} était un fake. on en parle ? ${t}`,
  (h, c, t) => `inventer des preuves pour couler @${c}… @${h} c’est grave ${t}`,
  (h, c, t) => `je savais que c’était bizarre ce truc. @${h} 🤡 ${t}`,
  (h, c, t) => `le niveau de mytho de @${h} 💀 ${t}`,
  (h, c, t) => `on attend les excuses de @${h} à @${c}. ${t}`,
];
// The fake is exposed: a huge bad buzz for the player (cancel, followers, every relation), the target is cleared.
function fakeBusted(g, c, fk, lateBust, lossNow = 0) {
  const s = g.stats, P = g.player, t = later();
  const K = EV_KINDS[fk.kind] || EV_KINDS.dm;
  fk.state = 'busted';
  fk.bustAt = t;
  s.busts = (s.busts || 0) + 1;
  const p = g.posts.find((x) => x.id === fk.post);
  if (p && p.ev) p.ev.busted = true;
  let loss = lossNow;
  if (lateBust) { // caught after the fact: the whole network turns at once
    loss = Math.round(s.followers * rand(0.15, 0.22)) + 8;
    s.followers = Math.max(0, s.followers - loss);
  }
  repMove(g, { cred: -50, kind: -30, image: lateBust ? -25 : -12 }, `ta fausse preuve contre ${c.name}, démasquée`, { noCheck: true });
  if (!s.cancelled) repFloor(g, 12, 'un fake démasqué finit toujours en cancel'); // an exposed fake always ends in a cancel
  checkCancel(g, { quiet: true });
  g.pbb = { at: t, until: t + PLAYER_BB_MS, c: c.id, kind: fk.kind };
  // the target is cleared, and the wave of sympathy brings followers
  const wasBuzz = inBadBuzz(c);
  const back = wasBuzz ? Math.round((c.badBuzz.loss || 0) * 1.5) : Math.round(c.followers * 0.05);
  if (wasBuzz) c.badBuzz.until = Date.now();
  c.followers += back;
  c.framed = Object.assign({}, c.framed, { busted: true });
  applyRel(g, c, -35, 'ta fausse preuve', t + 600, 40);
  addMem(g, c, 'le joueur a fabriqué une fausse preuve pour me faire tomber');
  for (const o of mains(g)) { // everybody saw it: one grouped notification, not one per character
    if (o === c) continue;
    o.rel = clamp(o.rel - 5, -100, 100);
    if (o.followsYou && o.rel < 0) o.followsYou = false;
  }
  trustAll(g, -8, c); // and nobody believes the player's word for a while
  applyTrust(g, c, -60, 'ta fausse preuve', t + 700, { quiet: true });
  markShady(g, c);
  const h = P.handle, hashtag = '#' + pascalHandle(h) + 'Fake';
  let at = t + randi(2500, 5000);
  if (lateBust) {
    const d = fk.debunk;
    const dp = d && d.text ? addAmbientPost(g, d, at, at) : null;
    if (!dp) addAmbientPost(g, { by: 'contre.enquete', name: 'Contre-Enquête', bio: 'vérifie les screens avant tout le monde', text: `On a vérifié ${K.f ? 'la' : 'le'} ${K.short} de @${h} contre @${c.handle} : rien ne colle, c’est un montage. ${hashtag}` }, at, at);
    at += randi(4000, 8000);
  }
  const npcs = CANCEL_NPCS.slice().sort(() => Math.random() - 0.5);
  FAKE_LINES.slice().sort(() => Math.random() - 0.5).slice(0, 2).forEach((fn, i) => {
    addAmbientPost(g, { by: npcs[i][0], name: npcs[i][1], text: fn(h, c.handle, hashtag) }, at, at);
    at += randi(4000, 9000);
  });
  addNotif(g, { k: 'busted', c: c.id, p: fk.post, at: t, text: `Ta fausse preuve contre ${c.name} a été démasquée${lateBust ? ' par une contre-enquête' : ''} : tout le réseau se retourne contre toi${loss > 0 ? ` (−${nAbonnes(loss)})` : ''}.` });
  addNotif(g, { k: 'reldown', at: t + 900, text: 'Tout le monde a vu ton fake : −5 de relation et −8 de confiance avec les autres personnages' });
  addChronicle(g, `${P.name} (@${P.handle}) s’est fait griller : sa « preuve » contre ${c.name} était un faux${lateBust ? ', démasqué par une contre-enquête' : ''}.`);
  addTrigger(g, `Le joueur s’est fait griller : sa « preuve » contre @${c.handle} (${evLabel(fk.kind)} : « ${str(fk.desc, 70)} ») était un faux. @${c.handle} exige des excuses${wasBuzz ? ' et savoure sa revanche' : ''}, les autres prennent parti, un média s’en régale.`, c.id);
  addEcho(g, 'fake', { c: c.id, text: fk.desc }); // it will come back
  queueModalFor(g, { t: 'busted', charId: c.id, kind: fk.kind, desc: fk.desc, loss, late: !!lateBust });
}
/* ---------- time accelerator ---------- */
// Fast-forward: every timestamp of the game moves back by ms, as if that much time had passed.
// Kept as they are: when the game was made and saved, when the player was last seen (absences),
// and the coffee clock (accelerated time is spent working: it refills nothing).
const TIME_KEEP = new Set(['createdAt', 'updatedAt', 'lastSeenAt', 'lastPlayedAt', 'energyAt', 'queuedAt']); // queuedAt: a photo waiting for its caption, in real time
// all: every timer moves (a save loaded later picks up where it was); otherwise story beats keep their age.
function shiftTime(g, ms, all = false) {
  const walk = (o) => {
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'number') { if (v > 1.4e12 && v < 4.1e12 && !TIME_KEEP.has(k)) o[k] = v - ms; }
      else if (v && typeof v === 'object') walk(v);
    }
  };
  const ages = (g.triggers || []).map((x) => x.at); // the narration of the skipped time plays them
  walk(g);
  if (!all) (g.triggers || []).forEach((x, i) => { x.at = ages[i]; });
}
// How long the countdown still runs, for people: « 1 h 05 », « 47 min », « 0:42 ».
function fmtLeft(ms) {
  if (ms >= 3600000) { const m = Math.round(ms / 60000); return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0'); }
  if (ms >= 60000) return Math.ceil(ms / 60000) + ' min';
  return fmtClock(ms);
}

/* ---------- announced releases: a video comes out through a mini-game, or gets postponed at a price ---------- */
const WHATS = { vidéo: { f: true, emoji: '🎬' }, short: { f: false, emoji: '📱' }, live: { f: false, emoji: '🔴' }, clip: { f: false, emoji: '🎵' }, podcast: { f: false, emoji: '🎙️' } };
const normWhat = (w) => { w = String(w || '').toLowerCase(); return /live|stream|direct/.test(w) ? 'live' : /short|tik ?tok|\breels?\b|r[ée]el\b|format court|vertical/.test(w) ? 'short' : /clip|single|morceau|chanson|son\b/.test(w) ? 'clip' : /podcast/.test(w) ? 'podcast' : 'vidéo'; };
const whatF = (r) => (WHATS[r.what] || WHATS.vidéo).f;
const nounOf = (r) => r.noun || r.what; // « tiktok », « reel » or « short » for the short format, by platform
const ta = (r) => (whatF(r) ? 'ta ' : 'ton ') + nounOf(r); // « ta vidéo », « ton live »
const sa = (r) => (whatF(r) ? 'sa ' : 'son ') + nounOf(r);
const laW = (r) => (whatF(r) ? 'la ' : 'le ') + nounOf(r);
const unW = (r) => (whatF(r) ? 'une ' : 'un ') + nounOf(r);
const MAX_DELAYS = 3;
// 0.10: what postponing (1st, 2nd, 3rd time) and dropping cost, by pillar (the screens preview them with repTry).
const postponePlan = (n) => { const pen = [5, 10, 15][clamp(n, 1, 3) - 1]; return { cred: -pen * 2.8, image: -pen * 0.8 }; };
const DROP_PLAN = { cred: -35, image: -10 };
const RELEASE_GRACE = 60 * 60 * 1000; // a release left undone this long after its time is given up, with a penalty
const RELEASE_TIERS = {
  top: { label: 'Tournage réussi', verdict: 'cartonne', cred: 8 },
  mid: { label: 'Tournage moyen', verdict: 'marche moyen', cred: 5 },
  flop: { label: 'Tournage raté', verdict: 'fait un flop', cred: 2 },
};
const PROD_STEPS = { // the shoot when Claude cannot write one: the production steps, in order
  vidéo: ['Écrire le script', 'Tourner les plans', 'Trier les rushs', 'Monter la vidéo', 'Ajouter le son et les sous-titres'],
  short: ['Trouver l’idée', 'Écrire l’accroche', 'Filmer à la verticale', 'Couper en rythme', 'Caler le son tendance'],
  live: ['Annoncer l’heure du live', 'Tester le micro et la caméra', 'Lancer le live', 'Répondre au chat', 'Remercier et couper le live'],
  clip: ['Écrire le texte', 'Composer la prod', 'Enregistrer la voix', 'Mixer le son', 'Tourner le clip'],
  podcast: ['Choisir le sujet', 'Préparer les questions', 'Enregistrer l’épisode', 'Couper les blancs', 'Publier l’épisode'],
};
// Shoot difficulty: less time, more items and finer traps, for bigger rewards.
const DIFFS = [
  { id: 'facile', emoji: '😌', label: 'Facile', time: 2, items: -1, opts: 3, mult: 0.6, traps: 'pièges évidents, faciles à repérer', desc: 'Plus de temps, pièges évidents' },
  { id: 'moyen', emoji: '🙂', label: 'Moyen', time: 1.4, items: 0, opts: 3, mult: 1, traps: 'pièges plausibles', desc: 'Le rythme tranquille' },
  { id: 'difficile', emoji: '😤', label: 'Difficile', time: 1, items: 0, opts: 3, mult: 1.6, traps: 'pièges subtils', desc: 'Moins de temps, pièges plus fins' },
  { id: 'expert', emoji: '🔥', label: 'Expert', time: 0.75, items: 1, opts: 4, mult: 2.3, traps: 'pièges très subtils, réponses très proches les unes des autres', desc: 'Encore moins de temps, plus de choses à gérer' },
  { id: 'legende', emoji: '💀', label: 'Légendaire', time: 0.55, items: 2, opts: 4, mult: 3.2, viral: true, traps: 'pièges diaboliques : tout semble vrai, un seul détail fait la différence', desc: 'Très dur. Réussi, c’est viral à coup sûr' },
  { id: 'mythique', emoji: '🌌', label: 'Mythique', time: 0.42, items: 3, opts: 4, mult: 4.4, viral: true, traps: 'pièges vicieux : les mauvaises réponses ont l’air plus vraies que la bonne', desc: 'Le plus rapide. Réussi, c’est viral à coup sûr' },
  // the very last: real questions on the real subject (a game, a film, a sport…), no mercy
  { id: 'cauchemar', emoji: '👹', label: 'Cauchemar', time: 0.8, items: 2, opts: 4, mult: 6, viral: true, real: true, traps: 'de vraies questions de connaisseur, sans aucune pitié', desc: 'Le tout dernier : de VRAIES questions pointues sur ton sujet. Seuls les vrais experts survivent' },
];
const diffOf = (id) => DIFFS.find((d) => d.id === id) || DIFFS[1];
const MG_EXTRA = 2000; // 0.27.4: two more seconds for each answer, at every difficulty (it was impossible at the top)
const fmtMult = (m) => '×' + String(m).replace('.', ',');
const MG_BASE_N = { tri: 6, ordre: 5, quiz: 4, vf: 7, intrus: 4, montage: 5 }; // items at « Moyen » and « Difficile »
const mgCount = (kind, d) => Math.max(4, (MG_BASE_N[kind] || 5) + d.items); // (0.27.5: four at least: with three questions, one slip at Facile cost the « top » that Moyen still gave)
const diffIx = (D) => Math.max(0, DIFFS.findIndex((d) => d.id === D.id));
// Skill rounds played without Claude: cut on the beat, remember the script. Harder: faster, tighter, longer.
const MONTAGE = {
  // (0.27.8: the score is the average of the cuts: one miss does not ruin it, and the texts no longer say so)
  vidéo: { title: 'Le montage au rythme', verb: 'Couper', intro: 'Chaque coupe pile dans le temps fort rend ta vidéo plus nerveuse.' },
  short: { title: 'La coupe parfaite', verb: 'Couper', intro: 'Un format court, c’est du rythme : plus tes coupes tombent pile, plus on reste jusqu’au bout.' },
  live: { title: 'Le direct sans blanc', verb: 'Relancer', intro: 'En direct, chaque relance au bon moment évite un blanc.' },
  clip: { title: 'Le beat parfait', verb: 'Couper', intro: 'Le clip vit sur le beat : plus tes coupes tombent dessus, mieux il sonne.' },
  podcast: { title: 'La chasse aux blancs', verb: 'Couper', intro: 'Coupe pile dans les blancs : plus tu en attrapes, plus l’épisode est fluide.' },
};
function makeMontage(r, D) {
  const ix = diffIx(D), w = [0.3, 0.22, 0.16, 0.12, 0.09, 0.08, 0.08][ix];
  const M = MONTAGE[r.what] || MONTAGE.vidéo;
  const items = Array.from({ length: mgCount('montage', D) }, () => { const z0 = rand(0.06, 0.94 - w); return { z0: Math.round(z0 * 1000) / 1000, z1: Math.round((z0 + w) * 1000) / 1000 }; });
  return { kind: 'montage', title: M.title, verb: M.verb, what: r.what, intro: M.intro, items, speed: [2200, 1800, 1500, 1250, 1050, 950, 950][ix], diff: D.id };
}
const MEM_SYMBOLS = {
  vidéo: ['🎬', '🎥', '💡', '🎤', '📱', '✂️', '🔥', '⭐', '🎞️', '📢'],
  short: ['📱', '🎵', '✂️', '🔥', '😂', '👀', '⭐', '💥', '🎬', '👋'],
  live: ['💬', '❤️', '🔥', '😂', '👀', '🎁', '⭐', '📢', '🎮', '👋'],
  clip: ['🎵', '🎸', '🥁', '🎹', '🎤', '🔥', '💃', '⭐', '🎧', '🕺'],
  podcast: ['🎙️', '🎧', '💬', '☕', '📻', '🔊', '⭐', '📝', '🤔', '💡'],
};
function makeMemoire(r, D) {
  const ix = diffIx(D), len = 3 + (ix >= 3 ? 1 : 0) + (ix >= 5 ? 1 : 0);
  const pool = MEM_SYMBOLS[r.what] || MEM_SYMBOLS.vidéo;
  const seqOf = (n) => { const seq = []; while (seq.length < n) { const x = pick(pool); if (x !== seq[seq.length - 1]) seq.push(x); } return seq; }; // never twice in a row
  return { kind: 'memoire', title: 'Retiens ton script', what: r.what, intro: 'Ton script tient en quelques images clés : oublie-en une en plein tournage, et ça se verra.', items: [0, 1, 2].map((k) => ({ seq: seqOf(len + k) })), pool, per: [1000, 850, 750, 650, 560, 480, 480][ix], diff: D.id };
}
const tierOf = (score) => (score >= 0.75 ? 'top' : score >= 0.4 ? 'mid' : 'flop');
// 0.27.8: a score shown next to its tier, rounded down: 74,6 % reads « 74 % » (moyen), never « 75 % »
const pctOf = (score) => Math.floor(clamp(num(score, 0), 0, 1) * 100 + 1e-9);
const TIER_STEPS = ['75 % et plus', '40 à 74 %', 'moins de 40 %'];
const tierRule = (top, mid, flop) => `Réussi (${TIER_STEPS[0]}) : ${top}. Moyen (${TIER_STEPS[1]}) : ${mid}. Raté (${TIER_STEPS[2]}) : ${flop}.`;
const VIDEO_RANGES = { // the community's grades a release gets, by how the shoot went
  top: { quality: [7, 9], reception: [6, 9], virality: [7, 9] },
  mid: { quality: [4, 6], reception: [1, 4], virality: [3, 5] },
  flop: { quality: [1, 3], reception: [-6, -2], virality: [1, 4] },
};
// « dans 2 h », « à 21h30 », « ce soir », « demain »… → minutes from now (now: a Date on the game clock), or null.
// The day a sentence points to, from today (0.9.4): « demain », « après-demain », « samedi », « dans 3 jours », « ce week-end ».
const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
function dayOffset(t, now) {
  let m;
  if (/\bapr[èe]s[- ]demain\b/.test(t)) return 2;
  if (/\bdemain\b/.test(t)) return 1;
  if ((m = /\bdans\s+(\d)\s+jours?\b/.exec(t))) return +m[1];
  if ((m = /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b(?!\s+(?:dernier|pass[ée]))/.exec(t))) {
    const d = (WEEKDAYS.indexOf(m[1]) - now.getDay() + 7) % 7;
    return d || (new RegExp(`\\b(?:ce|aujourd'hui,?)\\s+${m[1]}\\b`).test(t) ? 0 : 7);
  }
  if (/\bce (?:week-?end|we)\b/.test(t)) return (6 - now.getDay() + 7) % 7;
  return null;
}
// The time of day a sentence gives without a clock time: « samedi soir » is 21 h, « dimanche midi » 12 h.
const partHour = (t, d = 18) => (/\bcette nuit\b|\bdans la nuit\b/.test(t) ? 23 : /\bsoir(?:ée)?\b/.test(t) ? 21 : /\bmidi\b/.test(t) ? 12 : /\bmatin\b/.test(t) ? 10 : /\bapr[èe]s[- ]midi\b|\baprem\b/.test(t) ? 15 : d);
function parseWhen(t, now) {
  let m;
  if ((m = /dans\s+(\d{1,3})\s*(?:mn|min|minutes?|m)\b/.exec(t))) return +m[1];
  if ((m = /dans\s+(\d{1,2})\s*(?:h|heures?)\s*(\d{1,2})?/.exec(t))) return +m[1] * 60 + (m[2] ? +m[2] : 0);
  if (/dans\s+une?\s+demi[- ]heure/.test(t)) return 30;
  if (/dans\s+un\s+quart\s+d'heure/.test(t)) return 15;
  if (/dans\s+une\s+heure/.test(t)) return 60;
  const at = new Date(now.getTime());
  const days = dayOffset(t, now);
  m = /\s(?:à|a|vers|pour|dès)\s+(\d{1,2})\s*h\s*(\d{2})?\b/.exec(t)
    || (days != null ? /(?<!\bde\s|\bpendant\s|\bdurant\s)\b(\d{1,2})\s*(?:h|:(?=\d))\s*(\d{2})?\b/.exec(t) : null) // « samedi 20h », not « un live de 3h »
    || ((m = /\s(?:à|a|vers|pour|dès)\s+(minuit|midi)\b/.exec(t)) ? [m[0], m[1] === 'midi' ? '12' : '0', null] : null);
  if (m && +m[1] < 24 && !(m[2] && +m[2] > 59)) {
    at.setHours(+m[1], m[2] ? +m[2] : 0, 0, 0);
    if (days) at.setDate(at.getDate() + days);
    else if (at <= now) at.setDate(at.getDate() + 1);
    return Math.round((at - now) / 60000);
  }
  if (!days && /\bce soir\b|\bcette nuit\b/.test(t)) { at.setHours(/\bcette nuit\b/.test(t) ? 23 : 21, 0, 0, 0); const d = Math.round((at - now) / 60000); return d >= 30 ? d : 60; }
  if (days === 1 && !/\bsoir|nuit|midi|matin|apr[èe]s[- ]midi|aprem/.test(t)) { at.setDate(at.getDate() + 1); at.setHours(18, 0, 0, 0); return Math.round((at - now) / 60000); }
  if (days) { at.setDate(at.getDate() + days); at.setHours(partHour(t), 0, 0, 0); return Math.round((at - now) / 60000); }
  if (/\btout [àa] l'heure\b/.test(t)) return 120;
  return null;
}
// The player announces a release in their own words: « ma vidéo sort dans 5mn », « live ce soir à 21h ».
// A safety net for when the model does not flag the announcement itself.
function parseAnnounce(text, now = gameDate(Date.now())) {
  const t = ' ' + String(text || '').toLowerCase().replace(/’/g, "'") + ' ';
  const k = /\b(vid[ée]o|vlog|live|stream|short|tik ?tok|reel|clip|single|son|podcast|[ée]pisode|reportage|enqu[êe]te|docu(?:mentaire)?)s?\b/.exec(t);
  if (!k) return null;
  const isLive = /live|stream/.test(k[1]);
  if (!isLive && !/\b(sort|sortie|sortira|arrive|tombe|dispo|en ligne|publi|post|balance|l[âa]che|upload|drop|lance|diffus|nouve(?:lle|au)|prochaine?)/.test(t)) return null;
  const mins = parseWhen(t, now);
  if (mins == null || mins < 1 || mins > 1440) return null;
  return { what: k[1], in: mins };
}
// A character's own words promising something for later (« je réponds ce soir en live », « mon dossier sort demain »),
// for when the model forgets its plan line, and for promises made before events existed.
function parsePlan(text, now = gameDate(Date.now())) {
  const t = ' ' + String(text || '').toLowerCase().replace(/’/g, "'") + ' ';
  if (/\bpas question\b|\bjamais\b|\bpas de (?:live|vid[ée]o|r[ée]ponse)\b|\bn'(?:y )?aura (?:pas|aucun)|\bne (?:ferai|ferais|vais) (?:pas|jamais|aucun)/.test(t)) return null; // a refusal is not a promise
  const me = /\b(je|mon|ma|mes|moi|on|nous|notre)\b|\bj'/.test(t);
  const live = me && /\b(live|direct|stream)\b/.test(t) && !/\b(?:le|un|son|ton|du) live (?:de|d'|du)\s/.test(t) && !/\b(?:regard|voir|vu|suivr|mat)\w* (?:le |un |son |ton )?live\b/.test(t);
  // a public answer (« je vous réponds demain », « je réponds à tout en live »), not a private « je te réponds »
  const answer = /\bje vous (?:r[ée]pond\w*|expliqu\w*|dirai tout)\b|\bje (?:vais )?(?:r[ée]pond\w*|m'expliquer\w*)\b[^.!?]*\b(?:en live|en direct|publiquement|officiellement|[àa] tout|[àa] tous|tout le monde)\b|\bje (?:vais )?(?:vous )?(?:dire|balancer|expliquer) tout\b|\br[ée]ponse officielle\b|\bcommuniqu[ée] officiel\b/.test(t);
  const drop = /\b(?:ma|mon|notre|le|la) (?:vid[ée]o|dossier|enqu[êe]te|clip|single|album|collection|podcast|interview)\b[^.!?]*\b(?:sort\w*|tombe\w*|arrive\w*|publi\w*|en ligne)\b/.test(t);
  if (!live && !answer && !drop) return null;
  const mins = parseWhen(t, now);
  if (mins == null || mins < 5 || mins > 2880) return null;
  return { kind: live ? 'live' : 'annonce', in: mins };
}
// What happens in a release, in the player's words (0.9.2): the AI knows what the content is, not only its topic.
const PLOT_MAX = 300;
const PLOT_HINT = { // any world
  vidéo: 'ex : je teste 5 recettes virales, la 3e explose dans le four, je finis par commander une pizza',
  short: 'ex : 30 secondes, je tente un défi à la mode et je me rate en beauté à la fin',
  live: 'ex : je réponds à vos questions, puis je montre mon entraînement en direct',
  clip: 'ex : un clip tourné de nuit sur un toit, le refrain repris en chœur par mes potes',
  podcast: 'ex : je reçois une invitée qui raconte la pire soirée de sa vie',
};
// 0.27.4: several releases can be planned at once; the soonest is the one on the clock (shot, published, or given up
// first). Before 0.27.4, one at a time.
const MAX_PLANNED = 6;
const plannedReleases = (g) => (g.releases || []).filter((r) => r.state === 'scheduled').sort((a, b) => a.due - b.due || a.at - b.at);
const activeRelease = (g) => plannedReleases(g)[0] || null;
const planRoom = (g) => plannedReleases(g).length < MAX_PLANNED;
// The old ones go (never one still planned).
function trimReleases(g, max = 10 + MAX_PLANNED) {
  while (g.releases.length > max) { const k = g.releases.findIndex((r) => r.state !== 'scheduled'); if (k < 0) break; g.releases.splice(k, 1); }
}
// 0.27.4: brought forward, at no cost (the public simply gets it sooner); a shoot not played yet stays as it is.
function advanceRelease(g, r, due) {
  const t = Date.now();
  if (!r || r.state !== 'scheduled' || r.series || !(due < r.due - 30000)) return false; // (0.27.6: a daily upload keeps its hour, like when postponing)
  r.due = Math.max(t, Math.round(due));
  r.dueSaid = false;
  const when = r.due - t < 60000 ? 'maintenant' : fmtWhen(r.due, t);
  addNotif(g, { k: 'release', text: `⏩ ${cap1(ta(r))} « ${str(r.topic, 60)} » sort plus tôt : ${when}.` });
  addTrigger(g, `Le joueur avance la sortie de ${sa(r)} « ${str(r.topic, 60)} » : ${when === 'maintenant' ? 'elle arrive tout de suite' : `elle sort ${when}`}. Bonne surprise pour ceux qui l’attendaient.`, r.c || null);
  return true;
}
// The earlier times offered (the hours of the day planner, and soon), up to the planned one.
function advanceChoices(g, r, now = Date.now()) {
  const out = [{ at: now, label: 'Maintenant' }];
  const ok = (at) => at > now + 10 * 60000 && at < r.due - 5 * 60000 && !out.some((o) => Math.abs(o.at - at) < 20 * 60000);
  for (const m of [30, 60, 120, 180]) { const at = now + m * 60000; if (ok(at)) out.push({ at, label: m < 60 ? `Dans ${m} min` : `Dans ${m / 60} h` }); }
  for (let dd = 0; dd <= 7; dd++) {
    for (const h of [8, 12, 17, 18, 19, 20, 21, 22]) {
      const x = gameDate(now); x.setDate(x.getDate() + dd); x.setHours(h, 0, 0, 0);
      const at = x.getTime() - clockOff();
      if (ok(at)) out.push({ at, label: `${dd === 0 ? (h >= 18 ? 'Ce soir' : 'Aujourd’hui') : dd === 1 ? 'Demain' : cap1(x.toLocaleDateString('fr-FR', { weekday: 'long' }))} ${h} h`, peak: audienceAt(gameDate(at)) >= 1.2 });
    }
  }
  return out.sort((a, b) => a.at - b.at).slice(0, 18);
}
// The words of a topic that say what it is about (not « ma nouvelle vidéo ce soir »).
const REL_GENERIC = new Set(['video', 'videos', 'tiktok', 'tiktoks', 'short', 'shorts', 'reel', 'reels', 'live', 'lives', 'stream', 'podcast', 'episode', 'episodes', 'clip', 'clips', 'nouveau', 'nouvelle', 'nouvel', 'prochain', 'prochaine', 'demain', 'soir', 'heure', 'heures', 'minute', 'minutes', 'bientot', 'arrive', 'sortie', 'sort', 'annonce', 'chaine', 'abonnes', 'rendez', 'vous', 'ensemble', 'surprise']);
const relWords = (s) => bigWords(s).filter((w) => !REL_GENERIC.has(w));
// said: the player's own message that announced it (the topic stays theirs). o.loose: read in the player's own words
// (the model missed it), so its « topic » is the whole message.
function addRelease(g, o, post, said) {
  if (!planRoom(g)) return null;
  const topic = str(o.topic, 100);
  if (!topic) return null;
  const mins = int(o.in, 1, 1440, 60);
  const t = Date.now();
  const target = o.about ? charByHandle(g, normHandle(o.about)) : null;
  let what = normWhat(o.what);
  if (!PF(g).fmts.includes(what)) what = PF(g).main; // a « vidéo » on TikTok is a tiktok
  const asked = what;
  what = makeableWhat(g, what); // 0.20: no computer, no long video: the announcement becomes what the player can make
  // 0.27.4: another post about a release already planned is not a second one (the planned one gets the announcement).
  // 0.27.6: the same format, around the same time; later that day, only about the same thing (or in words that name
  // nothing new): two shorts on two topics the same day are two releases, a video announced next to a live is a video.
  const due = t + mins * 60000, day = (x) => gameDate(x).toDateString(), words = relWords(topic);
  const same = plannedReleases(g).find((x) => x.what === what && (Math.abs(x.due - due) < 90 * 60000 || (day(x.due) === day(due) && (o.loose || !words.length || sameThing(x.topic, topic)))));
  if (same) { if (!same.post && post) { same.post = post.id; same.said = same.said || str(said, 280); } if (!same.c && target && isMain(target) && target.unlocked) same.c = target.id; return null; }
  const r = {
    id: uid('rl'), what, noun: what === 'short' ? PF(g).shortName : '', topic, post: post ? post.id : null, at: t, due: t + mins * 60000, state: 'scheduled', delays: 0, tries: 0,
    c: target && isMain(target) && target.unlocked ? target.id : null, game: null, played: null,
    said: str(said, 280), diff: 'moyen',
  };
  if (!g.releases) g.releases = [];
  g.releases.push(r);
  trimReleases(g);
  addNotif(g, { k: 'release', p: r.post, text: `Compte à rebours lancé : ${ta(r)} « ${topic} » sort dans ${fmtLeft(mins * 60000)}.${asked !== what ? ` (${asked === 'vidéo' ? 'Pas de quoi monter une vidéo longue' : asked === 'live' ? 'Pas de connexion pour un live' : 'Pas le matos'} : ce sera ${unW(r)}.)` : ''}` });
  addTrigger(g, `Le joueur a annoncé ${unW(r)} dans ${fmtDur(mins * 60000)} : « ${str(topic, 80)} ». Le public l’attend : certains font monter la hype, d’autres doutent.`);
  return r;
}
const DELAY_LINES = [
  (h, r, t) => `@${h} qui repousse ${sa(r)}… on connaît la chanson ${t}`,
  (h, r, t) => `toujours pas de ${r.what} de @${h}. ça sent la panne d’idées ${t}`,
  (h, r, t) => `@${h} annonce, repousse, annonce, repousse… ${t}`,
];
// Postponing costs more each time: not very pro, then unprofessional, then « il se défile ».
function postponeRelease(g, r, mins = 30) {
  if (!r || r.state !== 'scheduled' || r.delays >= MAX_DELAYS || r.series) return false; // no postponing in a daily upload
  const s = g.stats, t = Date.now();
  r.delays++;
  const loss = r.delays >= 2 ? Math.round(s.followers * (r.delays === 2 ? 0.03 : 0.05)) : 0;
  const dr = repMove(g, postponePlan(r.delays), `tu as repoussé ${ta(r)}`, { noCheck: true });
  if (loss) s.followers = Math.max(0, s.followers - loss);
  r.due = Math.max(r.due, t) + mins * 60000;
  r.game = null; // a new shoot next time
  r.played = null;
  r.edit = null; r.editGame = null; r.thumb = null; r.render = null; // 0.14: and a new edit, a new thumbnail (0.20: a new render)
  r.dueSaid = false;
  const word = ['On trouve ça moyen pro.', 'Manque de professionnalisme : ça commence à se voir.', 'Pour beaucoup, tu te défiles.'][r.delays - 1];
  addNotif(g, { k: 'delay', at: t, text: `Tu repousses ${ta(r)} (${r.delays}/${MAX_DELAYS}) : ${repWord(dr)}${loss ? `, −${nAbonnes(loss)}` : ''}. ${word}` });
  addChronicle(g, `${g.player.name} a repoussé ${sa(r)} « ${str(r.topic, 80)} » (${r.delays === 1 ? '1re' : r.delays + 'e'} fois).`);
  const c = r.c ? g.chars[r.c] : null;
  if (c) addMem(g, c, `le joueur repousse ${sa(r)} sur moi : ${px(g, 'il se dégonfle', 'elle se dégonfle', 'iel se dégonfle')}`);
  addTrigger(g, `Le joueur repousse ${sa(r)} « ${str(r.topic, 60)} » (${r.delays === 1 ? 'premier' : r.delays === 2 ? 'deuxième' : 'troisième'} report) : le public se moque ou s’impatiente (« il se défile ? »)${c ? `, @${c.handle} en profite pour le ridiculiser` : ''}.`, c ? c.id : null);
  const n = pick(CANCEL_NPCS);
  const hashtag = '#OùEst' + (whatF(r) ? 'La' : 'Le') + r.what[0].toUpperCase() + r.what.slice(1);
  addAmbientPost(g, { by: n[0], name: n[1], text: pick(DELAY_LINES)(g.player.handle, r, hashtag) }, t + randi(3000, 7000));
  checkCancel(g);
  return true;
}
function dropRelease(g, r, forgot) {
  if (!r || r.state !== 'scheduled') return;
  if (r.series) { r.state = 'dropped'; seriesMissed(g, r); return; } // an episode of a daily upload: the series decides
  const s = g.stats, t = later();
  r.state = 'dropped';
  const loss = Math.round(s.followers * 0.04);
  const dr = repMove(g, DROP_PLAN, `${sa(r)} promis${whatF(r) ? 'e' : ''}, jamais sorti${whatF(r) ? 'e' : ''}`, { noCheck: true });
  s.followers = Math.max(0, s.followers - loss);
  addNotif(g, { k: 'delay', at: t, text: `${ta(r)[0].toUpperCase() + ta(r).slice(1)} « ${str(r.topic, 60)} » ne sortira jamais${forgot ? ` (tu ${whatF(r) ? 'l’as laissée' : 'l’as laissé'} en plan)` : ''} : ${repWord(dr)}, −${nAbonnes(loss)}. On retiendra que tu t’es ${px(g, 'défilé', 'défilée', 'défilé·e')}.` });
  addChronicle(g, `${g.player.name} n’a jamais sorti ${sa(r)} « ${str(r.topic, 80)} » : on dit qu’${px(g, 'il s’est défilé', 'elle s’est défilée', 'iel s’est défilé·e')}.`);
  addTrigger(g, `Le joueur a abandonné ${sa(r)} « ${str(r.topic, 60)} » promise à tout le monde : moqueries, déception, certains parlent de lâcheté.`, r.c || null);
  checkCancel(g);
}
// The moment a release past its time is given up (0.27.6: shown on its card).
const relLimit = (r) => Math.max(r.due, r.waited || 0) + RELEASE_GRACE * (r.played ? 2 : 1);
// Called by the clock: a release forgotten long after its time is given up. 0.27.6: one that waited behind another has
// its grace from when that one was done (it could not be shot before); one being shot or published right now (onScreen)
// is never pulled from under the player.
function checkReleases(g, t = Date.now(), onScreen = () => false) {
  const r = activeRelease(g);
  if (!r) return false;
  if (g.relFirst !== r.id) { // a new one on the clock: did it wait behind the one that just left?
    const was = g.relFirst && (g.releases || []).find((x) => x.id === g.relFirst);
    if (g.relFirst && (!was || was.state !== 'scheduled') && r.at <= (g.relFirstAt || 0) && r.due < t) r.waited = t; // (already late: its grace starts now)
    g.relFirst = r.id;
  }
  g.relFirstAt = t;
  if (onScreen(r.id)) return false;
  if (t > relLimit(r)) { dropRelease(g, r, true); return true; }
  return false;
}

/* ---------- scheduled events: a character's live or announcement, a date with the player ---------- */
// src: where it was announced ({ p: post, r: reply } or { dm: charId }) so a ⏩ button can sit right there.
const firstName = (c) => c.name.split(' ')[0];
const deN = (n) => (/^[aeiouyàâäéèêëîïôöûùüœæ]/i.test(n) ? 'd’' : 'de ') + n; // « d’Axel », « de Léandre »
const EVENT_KINDS = {
  rdv: { emoji: '🥂', label: (c) => `Rendez-vous avec ${firstName(c)}`, go: 'Y aller', now: (c) => `C’est l’heure de ton rendez-vous avec ${firstName(c)}` },
  live: { emoji: '🔴', label: (c) => `Live ${deN(firstName(c))}`, go: 'Voir le live', now: (c) => `Le live ${deN(firstName(c))} commence` },
  annonce: { emoji: '📣', label: (c) => `Annonce ${deN(firstName(c))}`, go: 'Voir l’annonce', now: (c) => `${firstName(c)} fait son annonce` },
  match: { emoji: '🏟️', label: (c) => `Le grand moment ${deN(firstName(c))}`, go: 'Voir', now: (c) => `C’est le grand moment ${deN(firstName(c))}` },
  autre: { emoji: '📅', label: (c) => `L’événement ${deN(firstName(c))}`, go: 'Voir', now: (c) => `L’événement ${deN(firstName(c))} commence` },
};
const normEventKind = (k) => { k = String(k || '').toLowerCase(); return /rdv|rendez|date|d[îi]ner|resto|soir[ée]e|verre|cin[ée]/.test(k) ? 'rdv' : /live|stream|direct/.test(k) ? 'live' : /annonce|r[ée]ponse|communiqu|vid[ée]o|post/.test(k) ? 'annonce' : /match|concert|duel|show|tournoi|course/.test(k) ? 'match' : 'autre'; };
// A meeting with the player: a romantic date, a friends' outing or a work meeting (the texts follow).
const ROMANTIC_RE = /d[îi]ner|resto|soir[ée]e|verre|cin[ée]|balade|rencard|\bdate\b|romanti|bisou|chandelle|danse|pique-nique|coucher de soleil/i;
// A date that is a wedding (engaged) or a proposal (together): the evening decides the answer.
const dateKind = (c, ev) => (c.vibe === 'fiancailles' && /mariage|mari[ée]s?\b|noces|c[ée]r[ée]monie|autel|dire oui/i.test(ev.what) ? 'wedding'
  : c.vibe === 'couple' && (ev.talk ? (ev.talk.used || []).includes('demande') : /demande|bague|fian[cç]/i.test(ev.what)) ? 'proposal' : null); // 0.11: played for real, the ring is a gesture
const FRIEND_VIBES = ['potes', 'amitie', 'bff', 'famille', 'confidences', 'complices', 'colocs', 'fan'];
const PRO_RE = /appel|visio|r[ée]union|\bpoint\b|business|contrat|collab|n[ée]goci|interview|entretien|meeting|brief|dossier|pi[èe]ces|travail|boulot|projet|partenariat/i;
function meetKind(c, ev) {
  if (!c) return 'friends';
  if (dateKind(c, ev) || ROMANCE.includes(c.vibe) || /romanti|chandelle|bisou|rencard|\bdate\b/i.test(ev.what)) return 'love';
  if (FRIEND_VIBES.includes(c.vibe)) return 'friends';
  if (PRO_RE.test(ev.what) || ['partenaires', 'alliance', 'mentor', 'disciple', 'rival', 'froid', 'nemesis'].includes(c.vibe)) return 'pro';
  return ROMANTIC_RE.test(ev.what) ? 'love' : 'friends';
}
const MEET = {
  love: { emoji: '🥂', icon: 'heart', tiers: ['Soirée réussie', 'Soirée mitigée', 'Soirée ratée'], lines: ['Le courant passe, vous ne voyez pas le temps filer.', 'Sympa, sans plus.', 'Ça ne prend pas du tout.'], end: 'Voir comment la soirée se termine', ending: 'La soirée se termine…',
    outcomes: tierRule('une soirée magique', 'sympa, sans plus', 'malaise garanti'), why: ['une soirée réussie', 'une soirée sympa, sans plus', 'un rendez-vous raté'], mem: ['notre rendez-vous était génial', 'notre rendez-vous était sympa, sans plus', 'notre rendez-vous était un fiasco'],
    task: 'un rendez-vous amoureux', res: ['RÉUSSI : le courant passe, complicité, éclats de rire, envie de se revoir', 'MOYEN : sympa mais sans plus, un ou deux malaises', 'RATÉ : gênant, froid ou dispute, la soirée tourne court'] },
  friends: { emoji: '🍻', icon: 'users', tiers: ['Super moment', 'Moment sympa', 'Sortie ratée'], lines: ['Fous rires et vraie complicité.', 'Sympa, sans plus.', 'Ambiance gênante, vous écourtez.'], end: 'Voir la suite', ending: 'Vous vous quittez…',
    outcomes: tierRule('un super moment', 'sympa, sans plus', 'ambiance gênante'), why: ['un super moment ensemble', 'un moment sympa', 'une sortie ratée'], mem: ['on a passé un super moment ensemble', 'notre sortie était sympa, sans plus', 'notre sortie était gênante'],
    task: 'une sortie entre amis', res: ['RÉUSSI : fous rires, complicité, vraie amitié', 'MOYEN : sympa, sans plus', 'RATÉ : malaise ou dispute, ça tourne court'] },
  pro: { emoji: '💼', icon: 'msg', tiers: ['Échange réussi', 'Échange mitigé', 'Échange raté'], lines: ['Vous vous comprenez : ça peut mener loin.', 'Poli, sans rien de décisif.', 'Ça coince : rien de concret.'], end: 'Voir comment ça se termine', ending: 'Ça se termine…',
    outcomes: tierRule('un échange qui compte', 'poli, sans plus', 'rien de concret'), why: ['un échange qui compte', 'un échange poli', 'un rendez-vous pro raté'], mem: ['notre échange a été vraiment utile', 'notre échange était poli, sans plus', 'notre rendez-vous n’a rien donné'],
    task: 'un rendez-vous pro (appel, visio, réunion ou café de travail : convaincre, négocier, rester crédible)', res: ['RÉUSSI : ils se comprennent, une vraie avancée (accord, piste, confiance)', 'MOYEN : poli, rien de décisif', 'RATÉ : ça coince, rien de concret, méfiance'] },
};
const tierIx = (tier) => (tier === 'top' ? 0 : tier === 'mid' ? 1 : 2);
const EVENT_GRACE = 90 * 60 * 1000; // a date missed by that much is a stood-up date; a character's event is gone
const activeEvents = (g) => (g.events || []).filter((e) => e.state === 'scheduled').sort((a, b) => a.due - b.due);
const eventOf = (g, id) => (g.events || []).find((e) => e.id === id) || null;
const evEmoji = (g, ev) => (ev.kind === 'rdv' ? MEET[meetKind(g.chars[ev.c], ev)].emoji : (EVENT_KINDS[ev.kind] || EVENT_KINDS.autre).emoji);
function eventLabel(g, ev) { const c = g.chars[ev.c]; return c ? (EVENT_KINDS[ev.kind] || EVENT_KINDS.autre).label(c) : 'Un événement'; }
// When it is, for people: « dans 45 min », « ce soir 21 h », « demain 20 h ».
function fmtWhen(ts, now = Date.now()) {
  if (ts <= now) return 'maintenant';
  if (ts - now < 3 * 3600000) return 'dans ' + fmtLeft(ts - now);
  const d = gameDate(ts), n = gameDate(now);
  const hh = d.getHours() + ' h' + (d.getMinutes() ? ' ' + String(d.getMinutes()).padStart(2, '0') : '');
  const days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 86400000);
  if (days === 0) return (d.getHours() >= 18 ? 'ce soir ' : 'aujourd’hui ') + hh;
  if (days === 1) return 'demain ' + hh;
  if (days >= 7) return `le ${d.getDate() === 1 ? '1er' : d.getDate()} ${MONTHS[d.getMonth()]}`; // 0.21: a far date is a date, not a weekday
  return d.toLocaleDateString('fr-FR', { weekday: 'long' }) + ' ' + hh;
}
// 0.22.1: what the AI reads of a moment to come: the day, the hour and the time left, never a bare « ce soir 19 h »
// (telling a skipped afternoon, it once took a date at 19 h for gone at 15 h).
const dayDiff = (ts, now) => { const d = gameDate(ts), n = gameDate(now); return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 86400000); };
const longDay = (ts) => gameDate(ts).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const hourOf = (ts) => { const d = gameDate(ts); return d.getHours() + ' h' + (d.getMinutes() ? ' ' + String(d.getMinutes()).padStart(2, '0') : ''); };
function dueText(ts, now = Date.now()) {
  if (ts <= now) return 'c’est l’heure, maintenant';
  const word = ['aujourd’hui', 'demain', 'après-demain'][dayDiff(ts, now)];
  const left = ts - now < 60000 ? 'moins d’une minute' : ts - now < 3 * 3600000 ? fmtLeft(ts - now) : fmtDur(ts - now);
  return `${longDay(ts)} à ${hourOf(ts)} (${word ? word + ', ' : ''}dans ${left}) : pas encore passé`;
}
// A day in a conversation: « hier (jeudi 15 octobre) », so that an old « à demain » reads right.
function dayLabel(ts, now = Date.now()) {
  const k = dayDiff(ts, now);
  return k === 0 ? `aujourd’hui (${longDay(ts)})` : k === -1 ? `hier (${longDay(ts)})` : longDay(ts);
}
// The harder to impress, the more famous: the date's difficulty comes from the person's audience.
function fameDiff(c) {
  const f = c ? c.followers : 0;
  const d = f < 10000 ? 'facile' : f < 100000 ? 'moyen' : f < 1000000 ? 'difficile' : f < 5000000 ? 'expert' : 'legende';
  if (!c || !isDefi(c)) return d;
  return DIFFS[Math.min(DIFFS.findIndex((x) => x.id === 'legende'), DIFFS.findIndex((x) => x.id === d) + 1)].id; // 0.11: a real challenge, one notch harder
}
// When a plan happens (0.9.4): o.due, an exact moment; "day" + "at", a day from today (0 today, 1 tomorrow… up to 7)
// and a clock time of the game (« samedi 20 h » is day 3, at "20:00"); or "in", minutes from now. A date a few days away
// is no longer squeezed into the next 48 hours (it was, and then counted as missed).
const PLAN_DAYS = 7;
function planDue(o, t = Date.now()) {
  if (o.due) return num(o.due, 0);
  const hm = /^\s*(\d{1,2})\s*(?:[h:.]\s*(\d{2})?)?\s*$/i.exec(String(o.at == null ? '' : o.at));
  const day = o.day == null || o.day === '' ? null : int(o.day, 0, PLAN_DAYS + 1, 0);
  if ((hm && +hm[1] < 24 && !(hm[2] && +hm[2] > 59)) || day != null) {
    const off = clockOff(), d = new Date(t + off);
    d.setHours(hm ? +hm[1] : 20, hm && hm[2] ? +hm[2] : 0, 0, 0);
    if (day) d.setDate(d.getDate() + day);
    let due = d.getTime() - off;
    if (due <= t && day == null) due += DAY_MS; // « à 20 h » said at 22 h: tomorrow
    return due;
  }
  const mins = num(o.in, NaN);
  return Number.isFinite(mins) ? t + Math.round(mins) * 60000 : 0;
}
function addEvent(g, o, src) {
  const c = charByHandle(g, normHandle(o.by));
  if (!c || !isMain(c) || !c.unlocked) return null;
  const what = str(o.what, 100);
  const t = Date.now();
  const due = planDue(o, t);
  if (!what || !(due >= t + 60000) || due > t + (PLAN_DAYS * 24 + 2) * 3600000) return null;
  const kind = normEventKind(o.kind);
  if (kind === 'autre') return null; // an intention, a deadline, a « later »: not something the player can attend
  const player = kind === 'rdv' || o.with_player === true || o.with_player === 'true';
  if (player && /[ée]ch[ée]ance|deadline|remettre|envoyer|attend(?:re)? (?:les|des|ses|tes|vos)|pi[èe]ces/i.test(what)) return null; // a deadline is not a date
  if (!g.events) g.events = [];
  // the same thing announced twice (a reply and a post), or announced again after it happened, is one event
  if (g.events.some((e) => e.c === c.id && ((e.state === 'scheduled' && Math.abs(e.due - due) < 3 * 3600000)
    || (e.kind === (player ? 'rdv' : kind) && t - e.at < 12 * 3600000 && sameWhat(e.what, what, c.name))))) return null;
  if (activeEvents(g).length >= 6) return null;
  const ev = { id: uid('ev'), kind: player ? 'rdv' : kind, c: c.id, what, at: t, due, state: 'scheduled', src: src || null, player, game: null, played: null, diff: player ? fameDiff(c) : null, tries: 0 };
  // their answer to a bad buzz (still running, or barely over): the network waits for it, the event decides
  if (!player && (kind === 'live' || kind === 'annonce') && due - t <= 48 * 3600000 && c.badBuzz && (inBadBuzz(c) || t - c.badBuzz.until < 6 * 3600000)) {
    ev.bb = true;
    c.badBuzz.until = Math.max(c.badBuzz.until, due + EVENT_GRACE + 60000);
  }
  g.events.push(ev);
  if (g.events.length > 16) g.events.splice(0, g.events.length - 16);
  addNotif(g, { k: 'event', c: c.id, p: src && src.p ? src.p : null, text: `${evEmoji(g, ev)} ${eventLabel(g, ev)} · ${fmtWhen(due)} : « ${str(what, 70)} »` });
  if (player) {
    if (dateKind(c, ev) === 'wedding') startVeille(g, c, ev); // 0.12: before the wedding, a doubt or the guest list
    addMem(g, c, `a un rendez-vous avec le joueur : ${str(what, 70)}`);
    closeInvites(g, c, ev);
    const clash = datesClash(g, ev);
    if (clash) queueModalFor(g, { t: 'clash', a: clash.id, b: ev.id });
  } else addTrigger(g, `@${c.handle} a annoncé : « ${str(what, 80)} » (${fmtWhen(due)}). Le public l’attend, certains spéculent déjà.`, c.id);
  return ev;
}
// Two ways to say the same thing: « Appel rapide avec Hugo (créneau à confirmer) » and « Appel rapide avec Hugo ».
const WHAT_COMMON = new Set('live direct stream avec pour dans demain soir matin midi rendez vous joueur appel visio cette leur notre votre chez apres avant heure heures minutes sera tout tous'.split(' '));
function sameWhat(a, b, name = '') {
  const skip = new Set([...WHAT_COMMON, ...String(name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/)]);
  const words = (x) => new Set(String(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !skip.has(w)));
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return false;
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size) >= 0.6;
}
// A promise read in a character's own words (the model did not flag it): never twice for the same moment.
function addPlanFallback(g, c, text, src, at = Date.now()) {
  if (!c || !isMain(c) || !c.unlocked) return null;
  const pl = parsePlan(text, gameDate(at));
  if (!pl) return null;
  const off = clockOff(), t = Date.now();
  const due = Math.round((at + pl.in * 60000 + off) / 300000) * 300000 - off; // « ce soir » is 21 h, not 20 h 59
  if (due < t + 5 * 60000) return null; // already over
  if (activeEvents(g).some((e) => e.c === c.id && Math.abs(e.due - due) < 3 * 3600000)) return null;
  // the sentence that says it, as its title
  const parts = String(text).split(/(?<=[.!?…])\s+/);
  const what = parts.find((x) => /\b(?:live|direct|stream|r[ée]pond\w*|r[ée]ponse|annonc\w*|communiqu\w*|expliqu\w*|sort\w*|tombe\w*|publie\w*|en ligne)\b/i.test(x)) || text;
  return addEvent(g, { by: c.handle, kind: pl.kind, what: str(what, 90), due }, src);
}
// After a stream: what a main character just said may hold a promise the model did not flag as a plan.
function planFallbacks(g, lastOf, plans) {
  const planned = new Set((plans || []).map((o) => normHandle(o.by)));
  for (const a in lastOf) {
    if (!a.startsWith('c:')) continue;
    const c = g.chars[a.slice(2)];
    if (!c || planned.has(c.handle)) continue;
    const src = lastOf[a];
    const p = g.posts.find((x) => x.id === src.p);
    const x = p && (src.r ? p.replies.find((r) => r.id === src.r) : p);
    if (x && x.text) addPlanFallback(g, c, x.text, src, Math.min(x.ts || Date.now(), Date.now()));
  }
}
// Once per game: promises made before events existed (« je réponds ce soir en live » under a comment).
function scanPlans(g, since = 12 * 3600000) {
  g.planScan = 1;
  const t = Date.now(), found = [];
  for (const p of g.posts) {
    for (const x of [p, ...p.replies]) {
      if (!x.a || !x.a.startsWith('c:') || !x.text || x.ts > t || t - x.ts > since) continue;
      found.push({ x, src: x === p ? { p: p.id } : { p: p.id, r: x.id } });
    }
  }
  found.sort((a, b) => b.x.ts - a.x.ts);
  let n = 0;
  for (const f of found) {
    if (n >= 2) break;
    if (addPlanFallback(g, g.chars[f.x.a.slice(2)], f.x.text, f.src, f.x.ts)) n++;
  }
  return n;
}
// Cancelling a date: the sooner the person knows, the less it hurts.
const cancelHurt = (lead) => (lead >= 12 * 3600000 ? 0 : lead >= 3 * 3600000 ? -3 : lead >= 3600000 ? -6 : lead > 0 ? -10 : -14);
const CANCEL_REPLIES = {
  0: [() => 'pas de souci, on remet ça 🙂', () => 'ok, pas de stress, une autre fois !'],
  '-3': [() => 'ah… dommage. une autre fois alors', () => 'ok… j’avais un peu prévu le coup mais bon'],
  '-6': [() => 'sérieux ? j’avais tout organisé…', () => 'ok. je retiens.'],
  '-10': [() => 'à la dernière minute ? merci du respect.', (c) => `wow. j’étais déjà ${gx(c.g, 'prêt', 'prête', 'prêt·e')}.`],
  '-14': [() => 'tu m’as posé un lapin. vraiment.'],
};
function cancelDate(g, ev, why) {
  if (!ev || ev.state !== 'scheduled' || !ev.player) return;
  ev.state = 'cancelled';
  const c = g.chars[ev.c];
  if (!c) return;
  const lead = ev.due - Date.now(), hurt = cancelHurt(lead), t = later();
  if (hurt) applyRel(g, c, hurt, lead >= 3600000 ? 'tu as annulé votre rendez-vous' : lead > 0 ? 'annulé à la dernière minute' : 'tu lui as posé un lapin', t + 3000, 20);
  if (hurt <= -6) addMem(g, c, `le joueur a annulé notre rendez-vous ${lead > 0 ? 'à la dernière minute' : 'sans prévenir'}`);
  const convo = g.dms[c.id] || (g.dms[c.id] = { msgs: [], readAt: 0 });
  convo.msgs.push({ id: uid('m'), sys: 'cancel', title: str(ev.what, 100), text: lead >= 12 * 3600000 ? 'Annulé bien à l’avance' : lead > 0 ? `Annulé ${fmtLeft(lead)} avant` : 'Annulé trop tard', ts: t, at: t });
  const reply = pick(CANCEL_REPLIES[String(hurt)] || CANCEL_REPLIES['-6'])(c);
  convo.msgs.push({ id: uid('m'), me: false, r: 1, text: reply, ts: t + 2500, at: t + 2500 });
  addNotif(g, { k: hurt ? 'reldown' : 'event', c: c.id, at: t + 2500, text: `Rendez-vous annulé avec ${c.name} : « ${reply} »` });
  if (hurt <= -6) addTrigger(g, `Le joueur a annulé son rendez-vous avec @${c.handle} ${lead > 0 ? 'à la dernière minute' : 'sans prévenir'}${why ? ' (' + why + ')' : ''} : ${gx(c.g, 'il est vexé', 'elle est vexée', 'iel est vexé·e')}.`, c.id);
}
// The other side calls it off (a fight, a bad buzz, no more wish to see the player): no blame on the player (0.9.3).
function charCancelsDate(g, c, why, at = later()) {
  const ev = activeEvents(g).find((e) => e.player && e.c === c.id);
  if (!ev) return null;
  ev.state = 'cancelled';
  ev.by = 'them';
  const first = c.name.split(' ')[0], w = str(why, 80);
  const convo = g.dms[c.id] || (g.dms[c.id] = { msgs: [], readAt: 0 });
  convo.msgs.push({ id: uid('m'), sys: 'cancel', title: str(ev.what, 100), text: `${first} a annulé${w ? ' : ' + w : ''}`, ts: at, at });
  addNotif(g, { k: 'reldown', c: c.id, at: at + 400, text: `❌ ${c.name} a annulé votre rendez-vous${w ? ` (${w})` : ''}.` });
  addMem(g, c, `j’ai annulé mon rendez-vous avec le joueur${w ? ' : ' + str(w, 60) : ''}`);
  return ev;
}
/* ---------- invitations (0.9.4): a character asks the player out, the player answers in one tap ---------- */
const inviteOf = (g, id) => (g.invites || []).find((x) => x.id === id) || null;
const openInvite = (g, c) => (c ? (g.invites || []).find((x) => x.c === c.id && x.state === 'open') || null : null);
// o: { what, in } or { what, day, at } (as a plan line). at: when the card shows in the conversation.
function addInvite(g, by, o, at = later()) {
  const c = typeof by === 'object' && by ? by : charByHandle(g, normHandle(by));
  if (!c || !isMain(c) || !c.unlocked) return null;
  const what = str(o.what, 100).replace(/\s*\?+$/, '');
  const t = Date.now(), due = planDue(o, t);
  if (what.length < 3 || !(due >= t + 15 * 60000) || due > t + (PLAN_DAYS * 24 + 2) * 3600000) return null;
  if (activeEvents(g).some((e) => e.player && e.c === c.id && Math.abs(e.due - due) < 3 * 3600000)) return null; // already on the agenda
  const old = openInvite(g, c);
  if (old) { if (Math.abs(old.due - due) < 3600000) return null; old.state = 'replaced'; }
  if (!g.invites) g.invites = [];
  const iv = { id: uid('iv'), c: c.id, what: cap1(what), due, at: t, state: 'open', ev: null, collab: !!o.collab || COLLAB_RE.test(what) }; // 0.14: a video to make together
  g.invites.push(iv);
  if (g.invites.length > 12) g.invites = g.invites.filter((x, k, all) => x.state === 'open' || k >= all.length - 12);
  const convo = g.dms[c.id] || (g.dms[c.id] = { msgs: [], readAt: 0 });
  convo.msgs.push({ id: uid('m'), sys: 'invite', inv: iv.id, me: false, title: iv.what, text: '', ts: at, at });
  addNotif(g, { k: 'dm', c: c.id, at, text: iv.collab ? `🎬 ${c.name} te propose de tourner ensemble ${fmtWhen(due)} : « ${str(iv.what, 60)} »` : `📅 ${c.name} te propose de vous voir ${fmtWhen(due)} : « ${str(iv.what, 60)} »` });
  bumpLive(at + 1500); // the screen refreshes when the card arrives (the clock ticks every second)
  return iv;
}
// A date on the agenda with them closes their open invitation: accepted if it is the same moment, replaced if not.
function closeInvites(g, c, ev) {
  for (const iv of g.invites || []) {
    if (iv.c !== c.id || iv.state !== 'open') continue;
    if (Math.abs(iv.due - ev.due) < 3 * 3600000) { iv.state = 'accepted'; iv.ev = ev.id; } else iv.state = 'replaced';
  }
}
const ACCEPT_LINES = [() => 'Ok, j’y serai !', () => 'Avec plaisir 🙂', () => 'Carrément, ça marche !'];
// 0.14: a video (a live, a short…) to make together: it becomes the next release, with them in it.
const COLLAB_RE = /\bcollab\b|\ben duo\b|(tourner|filmer|faire|enregistrer|cr[ée]er|monter)\s+(?:une?|le|la|des|notre|nos|un petit|une petite)?\s*(?:vid[ée]o|live|short|reel|tiktok|podcast|clip|vlog)/i;
const collabWhat = (s) => (/\blive\b/i.test(s) ? 'live' : /short|reel|tiktok/i.test(s) ? 'short' : /podcast/i.test(s) ? 'podcast' : /\bclip\b/i.test(s) ? 'clip' : 'vidéo');
const COLLAB_REPLIES = [(w) => `trop bien ! on tourne ${w} alors 🎬`, (w) => `yes ! ${w}, je ramène mes idées`, (w) => `parfait, ${w} : ça va être énorme`];
function acceptCollab(g, iv, c, quiet) {
  if (!planRoom(g)) return null; // the programme is full: they meet to talk it over instead
  // 0.22: made with what the player has: no computer for a long video, so a vertical one on the phone (never a refusal)
  const asked = normWhat(collabWhat(iv.what));
  let what = PF(g).fmts.includes(asked) ? asked : PF(g).main;
  if (!canMake(g, what).ok) what = makeableWhat(g, what);
  if (!canMake(g, what).ok) return null; // (nothing to film with: they simply meet)
  const r = scheduleRelease(g, { what, topic: iv.what, due: iv.due });
  if (!r) return null;
  if (what !== asked && asked === 'vidéo') addNotif(g, { k: 'release', c: c.id, text: `🎬 Sans ordinateur pour monter une vidéo longue, vous tournerez ça au téléphone : ${unW(r)}.` });
  r.collab = c.id;
  iv.state = 'accepted';
  iv.rl = r.id;
  touch(c);
  if (!quiet) {
    const convo = g.dms[c.id] || (g.dms[c.id] = { msgs: [], readAt: 0 }), t = Date.now(), w = fmtWhen(iv.due);
    convo.msgs.push({ id: uid('m'), me: true, text: pick(ACCEPT_LINES)(), ts: t, at: t });
    convo.msgs.push({ id: uid('m'), me: false, r: 1, text: pick(COLLAB_REPLIES)(w), ts: t + 2200, at: t + 2200 });
    convo.readAt = t;
  }
  applyRel(g, c, 3, 'vous allez tourner ensemble', Date.now() + 2600, 10);
  addMem(g, c, 'on va tourner une vidéo ensemble');
  return r;
}
const ACCEPTED_REPLIES = [(w) => `parfait, à ${w} alors`, (w) => `top, à ${w} !`, (w) => `ça marche, à ${w}`];
// The player taps « Accepter » (or says yes in their own words): the date goes on the agenda.
function acceptInvite(g, iv, quiet) {
  if (!iv || iv.state !== 'open') return null;
  const c = g.chars[iv.c];
  if (!c) return null;
  if (iv.due < Date.now() + 5 * 60000) { iv.state = 'expired'; return null; }
  if (iv.collab) { const r = acceptCollab(g, iv, c, quiet); if (r) return r; } // 0.14: a video to make together goes in the Studio
  const ev = addEvent(g, { by: c.handle, kind: 'rdv', what: iv.what, due: iv.due }, { dm: c.id });
  if (!ev) return null;
  iv.state = 'accepted';
  iv.ev = ev.id;
  touch(c);
  if (!quiet) {
    const convo = g.dms[c.id] || (g.dms[c.id] = { msgs: [], readAt: 0 }), t = Date.now(), w = fmtWhen(iv.due);
    convo.msgs.push({ id: uid('m'), me: true, text: pick(ACCEPT_LINES)(), ts: t, at: t });
    convo.msgs.push({ id: uid('m'), me: false, r: 1, text: pick(ACCEPTED_REPLIES)(w), ts: t + 2200, at: t + 2200 });
    convo.readAt = t;
  }
  applyRel(g, c, 2, 'tu as accepté son invitation', Date.now() + 2600, 10);
  return ev;
}
const DECLINE_LINES = [() => 'Je ne vais pas pouvoir cette fois, désolé·e 🙏', () => 'Pas dispo à ce moment-là, une autre fois ?', () => 'Ça ne va pas le faire pour moi, désolé·e.'];
const DECLINED_REPLIES = [() => 'ok, une autre fois alors', () => 'dommage… tant pis', () => 'pas de souci, je retiens 😉'];
function declineInvite(g, iv) {
  if (!iv || iv.state !== 'open') return;
  iv.state = 'declined';
  const c = g.chars[iv.c];
  if (!c) return;
  const convo = g.dms[c.id] || (g.dms[c.id] = { msgs: [], readAt: 0 }), t = Date.now();
  convo.msgs.push({ id: uid('m'), me: true, text: pick(DECLINE_LINES)().replace('désolé·e', px(g, 'désolé', 'désolée', 'désolé·e')), ts: t, at: t });
  convo.msgs.push({ id: uid('m'), me: false, r: 1, text: pick(DECLINED_REPLIES)(), ts: t + 2400, at: t + 2400 });
  convo.readAt = t;
  addMem(g, c, `le joueur a décliné mon invitation (« ${str(iv.what, 50)} »)`);
  touch(c);
}
// The model says the invitation fell through (the player said no in their words, or they took it back).
function dropInvite(g, c) { const iv = openInvite(g, c); if (iv) iv.state = 'off'; return iv; }
// A character's own words asking the player out (« on se fait un resto samedi soir ? »), when the model forgot its line.
const INVITE_RE = /\b(?:on se (?:voit|capte|retrouve|fait|boit|prend)|rejoins-moi|(?:ça|ca) te (?:dit|tente|branche)|t'es (?:dispo|libre|chaud|chaude)|tu (?:es|serais) (?:dispo|libre)|tu (?:viens|veux venir|passes)|je t'invite|rendez-vous|rdv|rencard|d[îi]ner|d[ée]jeuner|un verre|boire un|un caf[ée]|un resto|au resto|un cin[ée]|au cin[ée]|une balade|un appel|une visio|un call|on s'appelle|viens (?:chez|me|boire|manger|voir))/;
const NO_INVITE_RE = /\b(?:pas (?:dispo|libre|possible|le temps)|impossible|annul\w*|d[ée]sol[ée]e?|une autre fois|plus tard|jamais|hier|la derni[èe]re fois|l'autre (?:jour|soir))\b/;
function inviteIn(text, now = gameDate(Date.now())) {
  const t = ' ' + String(text || '').toLowerCase().replace(/’/g, "'") + ' ';
  if (!INVITE_RE.test(t) || NO_INVITE_RE.test(t) || !/\?|je t'invite|on se (?:voit|retrouve)|rejoins-moi|viens/.test(t)) return null;
  const mins = parseWhen(t, now);
  if (mins == null || mins < 20 || mins > PLAN_DAYS * 1440) return null;
  const parts = String(text).split(/(?<=[.!?…])\s+/);
  const what = parts.find((x) => INVITE_RE.test(' ' + x.toLowerCase().replace(/’/g, "'") + ' ')) || text;
  return { in: mins, what: str(what, 90) };
}
// The player says yes in their own words to an open invitation (« oui avec plaisir ! »): no « but », no « rather ».
const saysYes = (text) => { const t = ' ' + String(text || '').toLowerCase().replace(/’/g, "'"); return /^\s*(?:oui|ouais|ok|okay|carr[ée]ment|grave|avec plaisir|volontiers|[çc]a marche|vas-y|go|deal|parfait|top|trop bien|bien s[ûu]r|let'?s go|j'y serai|je serai l[àa]|chaud|chaude|yes|d'acc?(?:ord)?)\b/.test(t) && !/\b(?:pas|non|plut[ôo]t|mais|sauf|impossible|d[ée]sol)/.test(t); };
// Two dates at the same time: the player has to choose.
const datesClash = (g, ev) => activeEvents(g).find((e) => e !== ev && e.player && Math.abs(e.due - ev.due) < 90 * 60000) || null;
// Showing up late: the evening starts badly (one level harder) and they notice.
function arriveDate(g, ev) {
  const late = Date.now() - ev.due;
  if (late < 15 * 60000 || ev.late) return 0;
  ev.late = Math.round(late / 60000);
  const k = DIFFS.findIndex((d) => d.id === (ev.diff || 'moyen'));
  ev.diff = DIFFS[Math.min(DIFFS.findIndex((d) => d.id === 'mythique'), k + 1)].id;
  const c = g.chars[ev.c];
  if (c) applyRel(g, c, -3, `tu es ${px(g, 'arrivé', 'arrivée', 'arrivé·e')} avec ${ev.late} min de retard`);
  return ev.late;
}
// Close friends left without news feel it (time skips count too).
const touch = (c) => { if (c && isMain(c)) c.lastTouch = Date.now(); };
function checkNeglect(g, t = Date.now()) {
  let changed = false;
  for (const c of mains(g)) {
    if (!c.lastTouch) { c.lastTouch = t; continue; } // game time starts counting from here (skips move it)
    if (c.rel < 40) continue;
    const last = Math.max(c.lastTouch, c.unlockedAt || 0);
    if (t - last < 24 * 3600000 || t - (c.neglectAt || 0) < 24 * 3600000) continue;
    c.neglectAt = t;
    changed = true;
    applyRel(g, c, -3, 'tu ne lui donnes plus de nouvelles', t, 5);
    addTrigger(g, `@${c.handle} trouve que le joueur ne lui donne plus de nouvelles depuis longtemps : ${gx(c.g, 'il', 'elle', 'iel')} le lui fait sentir (message, pique, distance).`, c.id);
  }
  return changed;
}

// A date the player never showed up to: they waited for nothing.
function standUp(g, ev, t = Date.now(), why) {
  ev.state = 'missed';
  const c = g.chars[ev.c];
  if (!c) return;
  applyRel(g, c, -15, 'tu lui as posé un lapin', t, 20);
  applyTrust(g, c, -8, 'tu lui as posé un lapin', t + 400);
  addMem(g, c, 'le joueur m’a posé un lapin');
  addNotif(g, { k: 'reldown', c: c.id, at: t, text: `Tu as raté ton rendez-vous avec ${c.name}${why ? ' ' + why : ''} : ${gx(c.g, 'il', 'elle', 'iel')} t’a ${px(g, 'attendu', 'attendue', 'attendu·e')} pour rien.` });
  addTrigger(g, `Le joueur a posé un lapin à @${c.handle} (« ${str(ev.what, 60)} »)${why ? ' ' + why : ''} : ${gx(c.g, 'il est vexé', 'elle est vexée', 'iel est vexé·e')} et le fait savoir.`, c.id);
  addEcho(g, 'lapin', { c: c.id, text: ev.what });
  addWhisper(g, c, `pose des lapins : @${c.handle} l’a ${px(g, 'attendu', 'attendue', 'attendu·e')} pour rien`, { tone: 'bad', seed: 'lapin' }); // 0.13: and it is told around
  repMove(g, { kind: -4 }, `ton lapin à ${c.name}`); // 0.10: they tell people
}
// Called by the clock: a date the player never showed up to, a character's event nobody watched.
function checkEvents(g, t = Date.now(), onScreen = () => false) {
  let changed = false;
  for (const iv of g.invites || []) if (iv.state === 'open' && t > iv.due - 5 * 60000) { iv.state = 'expired'; changed = true; } // never answered: no blame
  for (const ev of g.events || []) {
    if (ev.state !== 'scheduled' || t < ev.due + EVENT_GRACE * (ev.played ? 2 : 1) || onScreen(ev.id)) continue; // (0.27.6: a date being played is no stood-up date)
    changed = true;
    if (ev.player) { if (!endUnfinished(g, ev)) standUp(g, ev, t); continue; } // 0.11: an evening that happened is not a stood-up date
    ev.state = 'missed';
    const c = g.chars[ev.c];
    if (!c) continue;
    if (ev.bb && c.badBuzz) { // it happened without the player: the game decides whether they got out of their bad buzz
      const esc = Math.random() < bbEscape(c), first = c.name.split(' ')[0];
      if (esc) { c.badBuzz.until = Math.min(c.badBuzz.until, t); c.buried = false; c.followers += Math.round((c.badBuzz.loss || 0) * 0.5); }
      else c.badBuzz.until = Math.max(c.badBuzz.until, t) + BADBUZZ_MS;
      const line = esc ? `${first} s’est ${gx(c.g, 'sorti', 'sortie', 'sorti·e')} de son bad buzz` : `ça n’a pas suffi, ${first} reste en plein bad buzz`;
      addNotif(g, { k: 'event', c: c.id, at: t, text: `${(EVENT_KINDS[ev.kind] || EVENT_KINDS.autre).emoji} ${eventLabel(g, ev)} a eu lieu sans toi : ${line}.` });
      addChronicle(g, `${eventLabel(g, ev)} (« ${str(ev.what, 60)} ») : ${line}.`);
      addTrigger(g, `${eventLabel(g, ev)} a eu lieu (« ${str(ev.what, 60)} ») : ${esc ? 'convaincant, une partie du public pardonne' : 'raté, le public n’y croit pas'}. Le réseau en parle encore.`, c.id);
    } else addTrigger(g, `L’événement de @${c.handle} a eu lieu (« ${str(ev.what, 60)} ») : le réseau en parle encore.`, c.id);
  }
  return changed;
}

// Called by the clock: a counter-investigation that was due takes the fake apart (no AI call: its post was written with the accusation).
function checkFakes(g, t = Date.now()) {
  let changed = false;
  for (const fk of g.fakes || []) {
    if (fk.state !== 'live' || !fk.later || t < fk.later) continue;
    const c = g.chars[fk.c];
    if (!c) { fk.state = 'safe'; continue; }
    fakeBusted(g, c, fk, true);
    changed = true;
  }
  return changed;
}

/* =========================================================
   Relations and dynamics
   ========================================================= */
const BIG_LABELS = ['Pote', 'Ami proche', 'Amie proche', 'Ami·e proche', 'Meilleur ami', 'Meilleure amie', 'Meilleur·e ami·e', 'Rival', 'Rivale', 'Rival·e', 'Ennemi juré', 'Ennemie jurée', 'Ennemi·e juré·e'];
function applyRel(g, handle, d, why, at, cap = 15) {
  const c = typeof handle === 'object' ? handle : charByHandle(g, normHandle(handle));
  if (!c || !c.unlocked || !DM_KINDS.includes(c.kind)) return;
  let delta = int(d, -cap, cap, 0);
  if (!delta) return;
  if (isMain(c)) delta = heartScale(c, delta); // 0.11: a fortress gives little and takes a lot, the impulsive swing
  if (delta > 0 && isMain(c) && closeToFoe(g, c)) delta = Math.max(1, Math.round(delta * 0.6)); // 0.15: wary of whoever is close to someone they cannot stand
  if (delta > 0) delta = Math.max(1, sround(delta * (1 + skillFx(g, 'relGain')))); // 0.24: charisma (its levels and tiers)
  else delta = -Math.max(1, sround(-delta * (1 - skillFx(g, 'relLoss'))));
  const before = c.rel;
  c.rel = clamp(c.rel + delta, -100, 100);
  const real = c.rel - before;
  if (!real) return;
  at = at || later();
  const reason = str(why, 90);
  addNotif(g, { k: real > 0 ? 'relup' : 'reldown', c: c.id, at, text: `${c.name} ${real > 0 ? '+' : '−'}${Math.abs(real)}${reason ? ' · ' + reason : ''}` });
  const lb = relLabel(before, c.g, c.vibe), la = relLabel(c.rel, c.g, c.vibe);
  if (lb !== la) {
    addNotif(g, { k: real > 0 ? 'relup' : 'reldown', c: c.id, at: at + 300, text: `${c.name} et toi, c’est maintenant : ${la}` });
    if (BIG_LABELS.includes(la)) addTrigger(g, `@${c.handle} et le joueur viennent de passer à « ${la.toLowerCase()} » : que @${c.handle} le montre (message privé, post ou réaction).`, c.id);
    if (real > 0 && isMain(c) && c.rel >= 55) foesNotice(g, c, 'close', at); // 0.15: close friends now: their enemies notice
  }
  if (real > 0 && c.rel >= JOIN_REL && canJoin(c)) joinCast(g, c, 'vous êtes devenus proches'); // 0.16: that close, it is personal
  if (!c.followsYou && c.rel >= 25) { c.followsYou = true; addNotif(g, { k: 'follow', c: c.id, at: at + 600, text: `${c.name} s’est ${gx(c.g, 'abonné', 'abonnée', 'abonné·e')} à toi` }); }
  else if (c.followsYou && c.rel < 0) { c.followsYou = false; addNotif(g, { k: 'unfollow', c: c.id, at: at + 600, text: `${c.name} s’est ${gx(c.g, 'désabonné', 'désabonnée', 'désabonné·e')} de toi` }); }
}
// Free relation gains (likes, reposts, follows): one per character every 10 minutes.
function freeRel(c, d) {
  const t = Date.now();
  if (!c || !isMain(c) || t - (c.freeRelAt || 0) < 10 * 60000) return;
  c.freeRelAt = t;
  c.rel = clamp(c.rel + d, -100, 100);
}
// What the model may write for a dynamic: « fiançailles », « mariés », « ensemble »…
const VIBE_ALIAS = { marie: 'mariage', maries: 'mariage', married: 'mariage', fiance: 'fiancailles', fiances: 'fiancailles', ensemble: 'couple', amis: 'amitie', ami: 'amitie', pote: 'potes', bestie: 'bff', coloc: 'colocs', complice: 'complices', confident: 'confidences', confidents: 'confidences', partenaire: 'partenaires', allies: 'alliance', allie: 'alliance', rivaux: 'rival', rivalite: 'rival', ennemis: 'nemesis', ennemi: 'nemesis', rupture: 'ex', separes: 'ex', enfroid: 'froid', encouple: 'couple', cestcomplique: 'complique', familledecoeur: 'famille', meilleursamis: 'bff', bonspotes: 'potes', fann: 'fan' };
const normVibe = (v) => { v = String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, ''); return VIBES[v] ? v : VIBE_ALIAS[v] || v; };
// force: a stage reached through the story itself (a wedding that happened) needs the stage before, not the relation level.
function applyVibe(g, by, v, why, at, force) {
  const c = typeof by === 'object' ? by : charByHandle(g, normHandle(by));
  if (!c || !c.unlocked || !isMain(c)) return false;
  v = normVibe(v);
  const V = VIBES[v];
  if (!V || c.vibe === v) return false;
  if (ROMANCE.includes(v) && noRomance(c)) return false; // 0.17: never a romance with an older character, even forced
  if (force ? V.from && !V.from.includes(c.vibe) : !vibeOK(c, v)) return false;
  if (!force && paceCheck(g, c, v) === 'block') return false; // 0.11: too fast for their heart: they slow down, panic, wonder…
  if (!force && trialCheck(g, c, v) === 'trial') return false; // 0.12: a trial first (their bad buzz, a rival, a secret…)
  c.vibe = v;
  notePace(c, v);
  if (c.vibeGoal === v) c.vibeGoal = null;
  const reason = str(why, 80);
  addNotif(g, { k: 'vibe', c: c.id, at: at || later(), text: `${c.name} et toi : ${V.emoji} ${V.label}${reason ? ' · ' + reason : ''}` });
  if (v === 'couple') c.officiel = 'pending'; // 0.12: announced on the network, or kept for the two of them (the player says)
  addChronicle(g, `Entre ${g.player.name} et ${c.name} : ${V.ai}${reason ? ' (' + reason + ')' : ''}.`, vibePrivate(c) ? [c.id] : null, true); // 0.22.2: a flirt stays between them
  queueModalFor(g, { t: 'vibe', charId: c.id, vibe: v, why: reason, at: at || 0 });
  if (v !== 'couple' && PARTNER.includes(v)) officialize(g, c, v, at); // (a couple: announced or kept, the player says)
  else if (BOND_VIBES.includes(v)) foesNotice(g, c, 'close', at || later()); // 0.15: a bond people can see: their enemies notice
  checkQuests(g);
  return true;
}
// The bonds that show (a crush, a flirt, confidences stay between them; a couple shows once it is announced).
const BOND_VIBES = ['amitie', 'bff', 'famille', 'complices', 'colocs', 'partenaires', 'alliance', 'mentor', 'disciple', 'fan'];
// A couple, an engagement, a wedding: the network notices, and whoever else the player was with feels betrayed.
function officialize(g, c, v, at) {
  const t = at || later(), V = VIBES[v], first = c.name.split(' ')[0];
  // 0.14: going public makes both grow, the way it does online: each one's audience discovers the other (the smaller
  // account gains the most), and for a week the player's releases draw more eyes.
  const share = ({ couple: 0.03, fiancailles: 0.05, mariage: 0.08 })[v] || 0.03, s = g.stats;
  const fol = grow(s.followers, Math.round(Math.min(c.followers * share * rand(0.7, 1.3), Math.max(2000, s.followers * 5))));
  const back = Math.round(Math.min(s.followers * share * rand(0.7, 1.3), Math.max(2000, c.followers * 5)));
  if (fol > 0) { s.followers += fol; checkMilestones(g); }
  if (back > 0) c.followers += back;
  g.coupleHype = { c: c.id, until: Date.now() + 7 * 24 * 3600000, mult: ({ couple: 1.25, fiancailles: 1.35, mariage: 1.5 })[v] || 1.25 };
  addNotif(g, { k: 'follow', at: t + 1500, text: `${v === 'mariage' ? 'Ton mariage' : v === 'fiancailles' ? 'Tes fiançailles' : 'Ton couple'} avec ${c.name} fait jaser : ${fol > 0 ? nAbonnes(fol, true) : 'tout le monde en parle'}${back > 0 ? `, et ${first} ${nAbonnes(back, true)}` : ''}. Vos prochaines vidéos seront très regardées.` });
  addTrigger(g, `Le joueur et @${c.handle} sont maintenant ${V.ai} : le réseau en parle (fans ravis, jaloux, rumeurs, médias).`, c.id);
  foesNotice(g, c, 'public', t); // 0.15: and whoever cannot stand them takes it badly
  for (const o of mains(g)) {
    if (o === c || !o.unlocked) continue;
    if (PARTNER.includes(o.vibe)) { // the player was already with someone else
      applyRel(g, o, -20, `te découvre avec ${first}`, t + 2500, 25);
      addMem(g, o, `le joueur m’a ${gx(o.g, 'trompé', 'trompée', 'trompé·e')} avec ${c.name}`);
      addTrigger(g, `@${o.handle} découvre que le joueur, avec qui ${gx(o.g, 'il', 'elle', 'iel')} était ${VIBES[o.vibe].ai}, s’affiche maintenant avec @${c.handle} : trahison, et tout le réseau le voit.`, o.id);
      applyVibe(g, o, o.rel < 20 ? 'ex' : 'complique', `${gx(o.g, 'trompé', 'trompée', 'trompé·e')} avec ${first}`, t + 3500);
    } else if (o.vibe === 'crush' || o.vibe === 'flirt') {
      applyRel(g, o, -6, `${gx(o.g, 'jaloux', 'jalouse', 'jaloux·se')} de toi et ${first}`, t + 2000, 10);
    }
  }
}
// The player ends it: a breakup (or a divorce), a friendship left to cool down.
const ENDABLE = ['flirt', 'couple', 'fiancailles', 'mariage', 'complique'];
const BREAK_LINES = {
  mariage: ['après tout ce qu’on a vécu… très bien.', 'je n’arrive pas à y croire. je signe où tu veux.'],
  fiancailles: ['et la bague, j’en fais quoi ?', 'on devait se marier…'],
  couple: ['…ok. je m’y attendais pas.', 'tu aurais pu me le dire en face.'],
  flirt: ['ah. bon. ok.', 'dommage, j’y croyais un peu.'],
  complique: ['au moins c’est clair maintenant.', 'ok. on arrête là.'],
};
function breakUp(g, c) {
  if (!c || !ENDABLE.includes(c.vibe)) return;
  const was = c.vibe, t = later();
  applyRel(g, c, { flirt: -6, complique: -8, couple: -12, fiancailles: -16, mariage: -20 }[was], was === 'mariage' ? 'tu as demandé le divorce' : 'tu as rompu', t + 1500, 25);
  addMem(g, c, was === 'mariage' ? 'le joueur a demandé le divorce' : `le joueur m’a ${gx(c.g, 'quitté', 'quittée', 'quitté·e')}`);
  applyVibe(g, c, 'ex', was === 'mariage' ? 'divorce' : 'rupture', t, true);
  const convo = g.dms[c.id] || (g.dms[c.id] = { msgs: [], readAt: 0 });
  const reply = pick(BREAK_LINES[was]);
  convo.msgs.push({ id: uid('m'), me: false, r: 1, text: reply, ts: t + 4000, at: t + 4000 });
  addNotif(g, { k: 'dm', c: c.id, at: t + 4000, text: `${c.name} t’a écrit : « ${reply} »` });
  addTrigger(g, `Le joueur vient de ${was === 'mariage' ? 'divorcer de' : 'rompre avec'} @${c.handle} : ${gx(c.g, 'il', 'elle', 'iel')} encaisse (tristesse, colère ou soulagement selon sa personnalité) et le réseau s’en mêle.`, c.id);
  update();
}
function dropVibe(g, c) {
  const V = c && c.vibe && VIBES[c.vibe];
  if (!V || ROMANCE.includes(c.vibe) || V.grp === 'conflit') return;
  c.vibe = null;
  applyRel(g, c, -5, 'tu prends tes distances', later(), 10);
  addNotif(g, { k: 'vibe', c: c.id, text: `${c.name} et toi : fini, ${V.label.toLowerCase()}` });
  addTrigger(g, `Le joueur prend ses distances avec @${c.handle} (fini : ${V.ai}) : ${gx(c.g, 'il', 'elle', 'iel')} le remarque.`, c.id);
  update();
}
function setVibeGoal(c, v) {
  const g = S.game;
  if (!g || !c || !isMain(c)) return;
  if (v && ROMANCE.includes(v) && noRomance(c)) return; // 0.17: a role apart
  g.quests = g.quests.filter((q) => !(q.kind === 'vibe' && q.charId === c.id && q.status === 'active'));
  if (!v || !VIBES[v] || c.vibe === v) { c.vibeGoal = null; g.triggers = (g.triggers || []).filter((x) => !x.text.startsWith(`Le joueur aimerait que sa relation avec @${c.handle}`)); update(); return; }
  const V = VIBES[v];
  const path = vibePath(c, v);
  c.vibeGoal = v;
  g.quests.push({ id: 'q' + (++g.seq), kind: 'vibe', vibe: v, charId: c.id, title: V.quest(g, c), desc: V.qdesc(g, c), base: c.rel, target: V.need, n0: path.length, reward: { xp: (50 + 10 * g.stats.level) * Math.max(1, path.length), gems: 4 * Math.max(1, path.length) }, status: 'active', createdAt: Date.now() });
  const next = path[0] !== v ? VIBES[path[0]] : null;
  g.triggers = (g.triggers || []).filter((x) => !x.text.startsWith(`Le joueur aimerait que sa relation avec @${c.handle}`));
  addTrigger(g, `Le joueur aimerait que sa relation avec @${c.handle} devienne : ${V.ai}${next ? ` (prochaine étape : ${next.ai})` : ''}. Fais-la évoluer lentement, une étape à la fois, avec des obstacles.`, c.id);
  toast(`Objectif ${V.emoji} ${V.label} avec ${c.name}${next ? ` · d’abord ${next.emoji} ${next.label}` : ''} : nouvelle quête ajoutée.`, 'good');
  update();
}

/* =========================================================
   Outcome of an action
   ========================================================= */
function cleanEval(ev) {
  const sk = Array.isArray(ev.skills) ? ev.skills.map((s) => normHandle(s).replace(/[^a-z]/g, '')).filter((s) => SKILLS.some((x) => x.id === s)) : [];
  return {
    quality: int(ev.quality, 0, 10, 4), humor: int(ev.humor, 0, 10, 2), bold: int(ev.bold, 0, 10, 2),
    controversy: int(ev.controversy, 0, 10, 0), reception: int(ev.reception, -10, 10, 1), virality: int(ev.virality, 0, 10, 2),
    kindness: ev.kindness == null ? 0 : int(ev.kindness, -5, 5, 0), // 0.10: how the player treats people (the behaviour pillar)
    flirt: ev.flirt == null ? 0 : int(ev.flirt, 0, 3, 0), flirtWith: normHandle(str(ev.flirtWith, 40)), // 0.17: flirting in public (seen by others)
    sincerity: ev.sincerity == null ? null : int(ev.sincerity, 0, 10, 5),
    credibility: ev.credibility == null ? null : int(ev.credibility, 0, 10, 4),
    exposed: ev.exposed === true || ev.exposed === 'true',
    fake: ev.fake == null ? null : int(ev.fake, 0, 10, 4),
    busted: ev.busted === true || ev.busted === 'true' ? true : ev.busted === false || ev.busted === 'false' ? false : null,
    pe: cleanEmojis(ev.pe, 3),
    // 0.21: a release, as the advertisers see it (green: every ad; yellow: limited; red: demonetized) and what its topic is worth to them (1-5)
    ads: ['vert', 'jaune', 'rouge'].includes(ev.ads) ? ev.ads : null, adv: ev.adv == null ? null : int(ev.adv, 1, 5, 3), adsWhy: str(ev.adsWhy, 50).replace(/^…$/, ''),
    fit: ev.fit == null || ev.fit === '' ? null : int(ev.fit, -1, 1, 0), // 0.21: a sponsor that fits the video (1), that passes (0), that has nothing to do with it (-1)
    merch: ev.merch == null || ev.merch === '' ? null : int(ev.merch, 1, 5, 3), // 0.22: how much people want the merch it launches
    skills: Array.from(new Set(sk)).slice(0, 3), verdict: str(ev.verdict, 40).replace(/^…$/, ''), memo: str(ev.memo, 220),
  };
}
const reachOf = (F) => Math.pow(Math.max(0, F), 0.85);
// 0.20: the bigger the audience, the slower it grows: nothing changes up to 1 000 followers, then each new one is harder
// to win (×0,4 around 10 000, ×0,16 around 100 000, ×0,05 past 2 millions). Without it, audiences doubled every few days.
const GROWTH_F0 = 3000, GROWTH_A = 0.45;
const growthK = (F) => (F <= 1000 ? 1 : 1 / (1 + Math.pow((F - 1000) / GROWTH_F0, GROWTH_A)));
const grow = (F, n) => (n > 0 ? Math.round(n * growthK(F)) : n);
function estLikes(g) {
  const s = g.stats;
  return (60 + reachOf(s.followers) + s.level * 15) * 0.14;
}
// The audience a post or reply borrows from the accounts it involves (mentioned, accused, quoted, the thread's author):
// giants are capped, someone in a bad buzz draws more eyes.
function spotlight(g, ids) {
  let sum = 0;
  const seen = new Set();
  for (const a of ids) {
    if (!a || a === 'p' || seen.has(a)) continue;
    seen.add(a);
    let f = 0, hot = 1;
    if (a.startsWith('c:')) { const c = g.chars[a.slice(2)]; if (!c) continue; f = c.followers; if (inBadBuzz(c)) hot = 1.5; }
    else if (a.startsWith('n:')) { const n = g.npcs[a.slice(2)]; f = n ? npcFollowers(n) : 200; }
    sum += Math.pow(Math.min(f, 2e6), 0.95) * hot;
  }
  return sum;
}
// mods: { photo, rival (the post tags a rival), apology, accuse, busted, spot (spotlight), mult (shoot difficulty), forceViral }
function computeOutcome(g, e, kind, boosts, mods = {}) {
  const s = g.stats, F = s.followers;
  const chaos = g.world && g.world.chaos != null ? g.world.chaos : 1;
  const spread = [0.15, 0.27, 0.42][chaos] || 0.27;
  const isPost = kind === 'post';
  let reach = isPost ? 60 + reachOf(F) + s.level * 15 : 18 + 0.2 * reachOf(F) + s.level * 5;
  if (isPost && boosts && boosts.reach) reach *= 2.5;
  if (isPost && mods.ally) reach *= 1 + mods.ally; // allies share it
  if (isPost && mods.photo) reach *= 1.15;
  // the situation's audience: it only comes when the post or reply is worth talking about
  const spotReach = (mods.spot || 0) * 0.02 * Math.pow(e.virality / 10, 2) * (0.6 + e.controversy / 25) * (isPost ? 1 : 0.3);
  let rate = 0.04 + e.quality * 0.012 + e.humor * 0.006 + e.virality * 0.01 + Math.max(0, e.reception) * 0.006;
  rate *= (1 + skillFx(g, 'likeFun') * (e.humor / 10)) * (1 + skillFx(g, 'likeAll')); // 0.24: humour
  if (e.reception < 0) rate *= 0.6;
  if (playerBadBuzz(g)) rate *= 0.7; // fewer people dare to like a caught liar
  let viral = false;
  if (isPost) {
    if ((boosts && boosts.viral) || mods.forceViral) viral = true;
    else if (e.virality >= 7 && e.reception >= -2) viral = Math.random() < 0.14 + (e.virality - 7) * 0.12 + skillFx(g, 'viral') + (e.humor >= 8 ? skillFx(g, 'viralFun') : 0) + (e.bold >= 7 ? skillFx(g, 'viralBold') : 0) + [-0.04, 0, 0.06][chaos] + (mods.viralPlus || 0); // 0.20: the 360° camera; 0.24: boldness, humour
  }
  const mult = viral ? rand(4, 8) : 1;
  const luck = rand(1 - spread, 1 + spread);
  const likesOwn = Math.max(0, Math.round(reach * rate * mult * luck));
  const likesSpot = Math.max(0, Math.round(spotReach * rate * mult * luck)); // strangers drawn by the drama: they like more than they follow
  let likes = likesOwn + likesSpot;
  let reposts = Math.max(0, Math.round(likes * (0.05 + e.virality * 0.015) * rand(0.7, 1.3)));
  let fol;
  if (e.reception >= 0) fol = Math.round((likesOwn * (isPost ? 0.3 + e.reception * 0.05 : 0.18 + e.reception * 0.03) + likesSpot * (isPost ? 0.1 + e.reception * 0.02 : 0.04 + e.reception * 0.01)) * rand(0.8, 1.2));
  else fol = -Math.round((F * 0.004 + 2) * -e.reception * (0.5 + e.controversy / 10) * rand(0.8, 1.2) * (isPost ? 1 : 0.4) * (1 - skillFx(g, 'folLoss'))); // 0.24: humour, a badly received post costs less
  if (fol > 0 && e.bold >= 7) fol = Math.round(fol * (1 + skillFx(g, 'boldFol'))); // 0.24: a bold post that lands
  if (mods.rival && e.reception >= 0) fol = Math.round(fol * 1.25); // a rivalry sells
  if (s.cancelled) fol = e.reception >= 6 ? Math.round(Math.max(0, fol) * 0.4) : Math.min(fol, -Math.round((F * 0.01 + 3) * (isPost ? 1 : 0.4)));
  let rep = e.reception * (isPost ? 0.9 : 0.5) - Math.max(0, e.controversy - 5) * (isPost ? 1.6 : 0.9) * (1 - skillFx(g, 'polemic')); // 0.24: boldness
  if (viral && e.reception > 0) rep += 4;
  if (mods.apology) {
    const si = e.sincerity == null ? 5 : e.sincerity;
    rep = si >= 7 ? 20 : si >= 4 ? 5 : -5;
    if (si >= 7) fol = Math.max(0, fol);
  }
  if (mods.accuse != null) { // a credible call-out pays, a baseless one backfires
    const cr = mods.accuse;
    if (cr >= 7) { rep = Math.max(rep, 6); fol = Math.max(fol, 2); }
    else if (cr >= 4) rep = Math.min(rep, 0) - 2;
    else { rep = -12; fol = Math.min(fol, -Math.round(F * 0.04 + 3)); }
  }
  if (mods.busted) { rep = -30; fol = -Math.round(F * rand(0.15, 0.22) + 8); } // a fake proof spotted on the spot
  if (fol < 0 && mods.lossMult && !mods.busted) fol = Math.round(fol * mods.lossMult); // a community manager limits the damage
  // one action never costs more than 12% of the audience (25% for an exposed fake)
  fol = Math.max(fol, mods.busted ? -Math.ceil(F * 0.25 + 8) : -Math.ceil(F * 0.12));
  let xp = mods.busted ? 5 : isPost ? 10 + e.quality * 2 + e.humor + e.bold * 0.5 + (viral ? 25 : 0) + (mods.accuse >= 7 ? 15 : 0) : 6 + e.quality + e.humor * 0.5;
  xp = Math.round(xp * (1 + skillFx(g, 'xp'))); // 0.24: creativity
  if (mods.mult && mods.mult !== 1) { // a harder shoot multiplies what the release brings
    likes = Math.round(likes * mods.mult);
    reposts = Math.round(reposts * mods.mult);
    xp = Math.round(xp * mods.mult);
    if (fol > 0) fol = Math.round(fol * mods.mult);
    if (rep > 0) rep += 2 * (mods.mult - 1);
  }
  if (mods.gear && mods.gear !== 1 && e.reception >= 0) { // 0.20: the gear of the moment (« on te trouve plus drôle »)
    likes = Math.round(likes * mods.gear);
    if (fol > 0) fol = Math.round(fol * mods.gear);
  }
  if (mods.train && mods.train !== 1 && e.reception >= 0) { // 0.17: the train of the hyyype carries the player's posts further
    likes = Math.round(likes * mods.train);
    reposts = Math.round(reposts * mods.train);
    if (fol > 0) fol = Math.round(fol * mods.train);
  }
  fol = grow(F, fol); // 0.20: the bigger, the slower
  return { likes, reposts, fol, rep: Math.round(rep * 10) / 10, xp, viral };
}

/* =========================================================
   XP, levels, skills
   ========================================================= */
const xpNeed = (lvl) => 100 + 35 * (lvl - 1) + 12 * (lvl - 1) * (lvl - 1);
function gainXP(g, xp) {
  const s = g.stats;
  s.xp += Math.max(0, Math.round(xp));
  while (s.xp >= xpNeed(s.level)) { s.xp -= xpNeed(s.level); s.level++; levelUp(g); }
}
function levelUp(g) {
  const s = g.stats;
  s.gems += LEVEL_GEMS; // (0.24: no skill points any more: the skills rise by practice)
  const next = mains(g, false).find((c) => !c.unlocked);
  if (next) {
    next.unlocked = true;
    next.unlockedAt = Date.now();
    addNotif(g, { k: 'new', c: next.id, text: `${next.name} débarque dans ton monde` });
    addChronicle(g, `${next.name} (@${next.handle}) vient d’arriver dans le monde.`);
    addTrigger(g, `@${next.handle} vient d’arriver sur le réseau : qu’il ou elle se présente avec un premier post qui ouvre une nouvelle intrigue.`, next.id);
  }
  addNotif(g, { k: 'level', text: `Niveau ${s.level} atteint : +${LEVEL_GEMS} gemmes` });
  queueModalFor(g, { t: 'level', level: s.level, charId: next ? next.id : null });
}
function checkMilestones(g) {
  const s = g.stats;
  for (const m of MILESTONES) {
    if (s.followers >= m && s.milestone < m) {
      s.milestone = m;
      addNotif(g, { k: 'milestone', text: `Tu as dépassé ${fmtN(m)} abonnés !` });
    }
  }
}

/* ---------- cancel, apologies, low profile ---------- */
const CANCEL_NPCS = [['drama.radar', 'Drama Radar'], ['popcorn.time', 'Popcorn Time'], ['la.verite.vraie', 'La Vérité Vraie'], ['juste.un.avis', 'Juste un avis']];
const CANCEL_LINES = [
  (h, t) => `bon on en parle de @${h} ou pas ? ${t}`,
  (h, t) => `@${h} a vraiment cru que ça passerait 💀 ${t}`,
  (h, t) => `j’ai unfollow @${h} et je me sens libre ${t}`,
  (h, t) => `le thread récap sur @${h} arrive ce soir. accrochez-vous. ${t}`,
];
function cancelPosts(g) {
  const h = g.player.handle;
  const hashtag = '#' + pascalHandle(h) + px(g, 'EstFini', 'EstFinie', 'EstFini');
  const lines = CANCEL_LINES.slice().sort(() => Math.random() - 0.5).slice(0, 2);
  const npcs = CANCEL_NPCS.slice().sort(() => Math.random() - 0.5);
  let at = later() + randi(3000, 6000);
  lines.forEach((fn, i) => {
    addAmbientPost(g, { by: npcs[i][0], name: npcs[i][1], text: fn(h, hashtag) }, at, at);
    at += randi(4000, 9000);
  });
}
// opts.quiet: the caller tells the story itself (posts, trigger, modal), as an exposed fake does.
function checkCancel(g, opts = {}) {
  const s = g.stats, P = g.player;
  if (!s.cancelled && s.reputation < 15) {
    s.cancelled = true;
    s.cancels = (s.cancels || 0) + 1;
    addNotif(g, { k: 'cancel', text: 'La communauté t’a cancel. Des excuses publiques sincères peuvent t’en sortir, ou faire profil bas le temps que ça passe.' }); // 0.15: the way out, named
    addChronicle(g, `${P.name} (@${P.handle}) s’est fait cancel par la communauté.`);
    if (!opts.quiet) {
      addTrigger(g, 'Le joueur vient de se faire cancel : des personnages principaux prennent parti (le défendre ou l’enfoncer), un média en parle ; un proche du joueur (s’il en a) lui écrit en privé pour le soutenir et lui conseiller de s’excuser en public.'); // (≤ 240 characters)
      cancelPosts(g);
      queueModalFor(g, { t: 'cancel' });
    }
  } else if (s.cancelled && s.reputation >= 35) {
    s.cancelled = false;
    addNotif(g, { k: 'uncancel', text: `Tu es ${px(g, 'revenu', 'revenue', 'revenu·e')} en grâce : fin du cancel.` });
    addChronicle(g, `${P.name} (@${P.handle}) est ${px(g, 'revenu', 'revenue', 'revenu·e')} en grâce après son cancel.`);
    addTrigger(g, 'Le joueur vient de sortir de son cancel : certains le saluent, d’autres restent méfiants.');
    queueModalFor(g, { t: 'uncancel' });
  }
}
const lowActive = (g, t = Date.now()) => !!(g && g.low && t < g.low.until);
function startLowProfile() {
  const g = S.game;
  if (!g || lowActive(g)) return;
  const t = Date.now();
  g.low = { start: t, until: t + LOW_MS, gain: 0 };
  addChronicle(g, `${g.player.name} (@${g.player.handle}) fait profil bas.`);
  toast('Profil bas : pas de post pendant 15 min. Ta réputation remonte doucement.', 'good');
  update();
}
function stopLowProfile() {
  const g = S.game;
  if (!g || !g.low) return;
  syncLow(g, Date.now(), true);
  update();
}
function syncLow(g, t, stop = false) {
  const L = g.low;
  if (!L) return;
  const end = stop ? Math.min(t, L.until) : L.until;
  const steps = Math.min(LOW_MAX, Math.floor((Math.min(t, end) - L.start) / LOW_STEP));
  if (steps > L.gain) {
    repShift(g, steps - L.gain, 'profil bas : on t’oublie un peu', { noCheck: true });
    L.gain = steps;
    checkCancel(g);
  }
  if (stop || t >= L.until) {
    addNotif(g, { k: 'low', at: Math.min(t, L.until), text: `Fin du profil bas : ${repWord(L.gain)}.` });
    g.low = null;
  }
}
function deletePost(g, p) {
  if (!g || !p || p.a !== 'p' || p.pending) return;
  g.posts = g.posts.filter((x) => x !== p);
  const risky = (p.likeT || 0) >= 50 || (p.res && p.res.contro >= 6) || (p.res && p.res.viral);
  if (risky && Math.random() < 0.55) {
    const t = Date.now() + randi(3000, 7000);
    const np = addAmbientPost(g, { by: 'archives.du.net', name: 'Archives du Net', text: `@${g.player.handle} a supprimé ça, mais j’ai le screen 👀 « ${p.text.slice(0, 110)}${p.text.length > 110 ? '…' : ''} »` }, t, t);
    const dr = repMove(g, { cred: -6, image: -4 }, 'ton post supprimé ressort en capture', { noCheck: true });
    addNotif(g, { k: 'screen', p: np ? np.id : null, at: t + 300, text: `Quelqu’un avait fait une capture de ton post supprimé… ${repWord(dr)}` });
    checkCancel(g);
  }
  toast('Post supprimé.');
  update();
}

/* =========================================================
   Quests
   ========================================================= */
function activeQuests(g) { return g.quests.filter((q) => q.status === 'active'); }
const isCodeQuest = (q) => q.kind !== 'story' && q.kind !== 'vibe';
function codeReward(g) { return { xp: 25 + 5 * g.stats.level, gems: 2 }; }
function makeCodeQuest(g, exclude) {
  const s = g.stats, t = Date.now();
  const cands = [];
  const ms = mains(g);
  const used = new Set(activeQuests(g).map((q) => q.charId).filter(Boolean));
  const ok = (k) => !exclude.includes(k) && g.lastQuestKind !== k;
  if (ok('rep') && s.reputation < 45) {
    cands.push({ w: 4, kind: 'rep', base: Math.round(s.reputation), target: 55, title: 'Remonte ta réputation à 550', desc: 'Fais-toi pardonner et montre ton meilleur côté.' });
  }
  if (ok('followers')) {
    const goal = niceRound(Math.max(20, estLikes(g) * 0.4 * 8));
    cands.push({ w: 2, kind: 'followers', base: s.followers, target: s.followers + goal, title: `Gagne ${fmtN(goal)} abonnés`, desc: 'Publie, fais réagir, deviens incontournable.' });
  }
  if (ok('likes')) {
    const target = niceRound(Math.max(8, estLikes(g) * 1.8));
    cands.push({ w: 2, kind: 'likes', base: 0, target, title: `Fais un post à ${fmtN(target)} likes`, desc: 'Un seul post doit atteindre ce score.' });
  }
  const relC = ms.filter((c) => c.rel < 30 && !used.has(c.id));
  if (ok('rel') && relC.length) {
    const c = pick(relC);
    if (c.rel <= -20) cands.push({ w: 2, kind: 'rel', charId: c.id, base: c.rel, target: 0, title: `Fais la paix avec ${c.name}`, desc: `Ramène ta relation avec @${c.handle} au moins à zéro.` });
    else cands.push({ w: 2, kind: 'rel', charId: c.id, base: c.rel, target: 30, title: `Deviens pote avec ${c.name}`, desc: `Monte ta relation avec @${c.handle} à +30.` });
  }
  const free = ms.filter((c) => !used.has(c.id));
  if (ok('dm') && free.length) {
    const c = pick(free);
    cands.push({ w: 1, kind: 'dm', charId: c.id, base: c.dmSent || 0, target: 3, title: `Écris 3 messages à ${c.name}`, desc: `Passe en privé avec @${c.handle}.` });
  }
  if (ok('mention') && free.length) {
    const c = pick(free);
    cands.push({ w: 1.5, kind: 'mention', charId: c.id, base: 0, target: 1, title: `Interpelle ${c.name} en public`, desc: `Publie un post qui mentionne @${c.handle}.` });
  }
  if (ok('replies')) cands.push({ w: 1, kind: 'replies', base: s.replies, target: 3, title: 'Réponds à 3 posts', desc: 'Mêle-toi aux conversations des autres.' });
  if (ok('replyc')) cands.push({ w: 1, kind: 'replyc', base: s.replyc || 0, target: 2, title: 'Réponds à 2 commentaires', desc: 'Sous un post, touche « Répondre » sous le commentaire de quelqu’un.' });
  if (ok('viral') && s.level >= 3) cands.push({ w: 1, kind: 'viral', base: s.virals, target: 1, title: 'Fais un post viral', desc: 'Un post qui explose : audace et timing.' });
  if (!cands.length) return null;
  const total = cands.reduce((a, c) => a + c.w, 0);
  let r = Math.random() * total, c = cands[0];
  for (const x of cands) { r -= x.w; if (r <= 0) { c = x; break; } }
  return newCodeQuest(g, c, t);
}
function newCodeQuest(g, c, t = Date.now()) {
  return { id: 'q' + (++g.seq), kind: c.kind, title: c.title, desc: c.desc, target: c.target, base: c.base || 0, charId: c.charId || null, reward: codeReward(g), status: 'active', createdAt: t };
}
function ensureQuests(g) {
  const code = activeQuests(g).filter(isCodeQuest);
  let guard = 0;
  while (code.length < 2 && guard++ < 4) {
    const q = makeCodeQuest(g, code.map((x) => x.kind));
    if (!q) break;
    g.quests.push(q);
    code.push(q);
  }
}
function mentionsIn(g, h, since) {
  const re = mentionRe(h);
  return g.posts.some((p) => p.a === 'p' && p.ts >= since && !p.pending && re.test(p.text));
}
function questProgress(g, q, now = Date.now()) {
  const s = g.stats;
  const frac = (cur, base, target) => (target === base ? (cur >= target ? 1 : 0) : clamp((cur - base) / (target - base), 0, 1));
  switch (q.kind) {
    case 'followers': {
      const gained = s.followers - q.base, goal = q.target - q.base;
      return { frac: clamp(gained / Math.max(1, goal), 0, 1), done: s.followers >= q.target, text: `${fmtSigned(Math.max(0, gained))} / +${fmtN(goal)}` };
    }
    case 'likes': {
      let best = 0;
      for (const p of g.posts) if (p.a === 'p' && p.ts >= q.createdAt) best = Math.max(best, shownLikes(p, now));
      return { frac: clamp(best / q.target, 0, 1), done: best >= q.target, text: `${fmtN(best)} / ${fmtN(q.target)}` };
    }
    case 'rel': {
      const c = g.chars[q.charId];
      if (!c) return { frac: 0, done: false, text: '' };
      return { frac: frac(c.rel, q.base, q.target), done: c.rel >= q.target, text: `${fmtRel(c.rel)} / ${fmtRel(q.target)}` };
    }
    case 'dm': {
      const c = g.chars[q.charId];
      const v = c ? (c.dmSent || 0) - q.base : 0;
      return { frac: clamp(v / q.target, 0, 1), done: v >= q.target, text: `${Math.max(0, v)} / ${q.target}` };
    }
    case 'mention': {
      const c = g.chars[q.charId];
      const done = !!c && mentionsIn(g, c.handle, q.createdAt);
      return { frac: done ? 1 : 0, done, text: `${done ? 1 : 0} / 1` };
    }
    case 'replies': { const v = s.replies - q.base; return { frac: clamp(v / q.target, 0, 1), done: v >= q.target, text: `${Math.max(0, v)} / ${q.target}` }; }
    case 'replyc': { const v = (s.replyc || 0) - q.base; return { frac: clamp(v / q.target, 0, 1), done: v >= q.target, text: `${Math.max(0, v)} / ${q.target}` }; }
    case 'viral': { const v = s.virals - q.base; return { frac: clamp(v, 0, 1), done: v >= 1, text: `${Math.max(0, v)} / 1` }; }
    case 'rep': return { frac: frac(s.reputation, q.base, q.target), done: s.reputation >= q.target, text: `${rep1000(s.reputation)} / ${q.target * 10}` };
    case 'vibe': {
      const c = g.chars[q.charId], V = VIBES[q.vibe];
      if (!c || !V) return { frac: 0, done: false, text: '' };
      if (c.vibe === q.vibe) return { frac: 1, done: true, text: `${V.emoji} ${V.label}` };
      const path = vibePath(c, q.vibe), n0 = Math.max(q.n0 || 1, path.length);
      const N = VIBES[path[0]] || V, at = path[0] && path[0] !== q.vibe ? `Étape ${n0 - path.length + 1}/${n0} : ${N.emoji} ${N.label}` : '';
      const lvl = !N.dir ? 1 : N.dir > 0 ? frac(c.rel, Math.min(q.base, N.need - 1), N.need) : frac(-c.rel, Math.min(-q.base, -N.need - 1), -N.need);
      const f = ((n0 - path.length) + lvl * 0.8) / n0;
      if (vibeOK(c, path[0] || q.vibe)) return { frac: f, done: false, text: at ? `${at} · le déclic peut arriver` : 'Le déclic peut arriver' };
      return { frac: f, done: false, text: `${at ? at + ' · ' : ''}relation ${fmtRel(c.rel)} / ${fmtRel(N.need)}` };
    }
    default: return null;
  }
}
function completeQuest(g, q) {
  if (q.status !== 'active') return;
  q.status = 'done';
  q.doneAt = Date.now();
  q.pendingDone = false;
  g.lastQuestKind = q.kind;
  g.stats.gems += q.reward.gems;
  addNotif(g, { k: 'quest', text: `Quête réussie : ${q.title} · +${q.reward.gems} ${plural(q.reward.gems, 'gemme', 'gemmes')}, +${q.reward.xp} XP` });
  if (S.game === g) toast(`Quête réussie : ${q.title} ✓`, 'flash');
  gainXP(g, q.reward.xp);
  ensureQuests(g);
}
function checkQuests(g) {
  for (const q of g.quests.slice()) {
    if (q.status !== 'active' || q.kind === 'story') continue;
    const p = questProgress(g, q);
    if (p && p.done) completeQuest(g, q);
  }
}
function addStoryQuest(g, o, silent = false) {
  const active = activeQuests(g).filter((q) => q.kind === 'story');
  if (active.length >= 3) return;
  const title = str(o.title, 70);
  if (!title || g.quests.some((q) => q.title === title)) return;
  const c = charByHandle(g, normHandle(o.char));
  g.quests.push({ id: 'q' + (++g.seq), kind: 'story', title, desc: str(o.desc, 180), charId: c ? c.id : null, reward: { xp: 40 + 10 * g.stats.level, gems: 3 }, status: 'active', createdAt: Date.now(), pct: 0, step: '' });
  if (!silent) addNotif(g, { k: 'questnew', text: `Nouvelle quête : ${title}` });
}
function findStory(g, id) {
  const qid = str(id, 16).replace(/^#/, '');
  return g.quests.find((x) => x.kind === 'story' && x.status === 'active' && (x.id === qid || x.id === 'q' + qid)) || null;
}
// The model judges story quests: completions wait a minute after the quest appears and 3 minutes after the previous one.
const storyReady = (g, q, t) => t - q.createdAt >= 60000 && t - (g.storyDoneAt || 0) >= 3 * 60000;
function completeStoryQuest(g, id) {
  const q = findStory(g, id);
  if (!q) return;
  const t = Date.now();
  q.pct = 100;
  if (!storyReady(g, q, t)) { q.pendingDone = true; return; }
  g.storyDoneAt = t;
  completeQuest(g, q);
}
function setQuestProg(g, id, pct, step) {
  const q = findStory(g, id);
  if (!q) return;
  const p = int(pct, 0, 100, 0);
  if (p >= 100) { if (step) q.step = str(step, 100); completeStoryQuest(g, q.id); return; }
  const before = q.pct || 0;
  if (p <= before) return;
  q.pct = Math.min(95, p);
  if (step) q.step = str(step, 100);
  if (q.pct - before >= 10) addNotif(g, { k: 'questprog', text: `Quête avancée · ${q.title}${q.step ? ' : ' + q.step : ''}` });
}
function tickQuests(g, t) {
  let changed = false;
  for (const q of g.quests.slice()) {
    if (q.status !== 'active') continue;
    if (q.kind === 'likes') { const p = questProgress(g, q, t); if (p && p.done) { completeQuest(g, q); changed = true; } }
    else if (q.kind === 'story' && q.pendingDone && storyReady(g, q, t)) { g.storyDoneAt = t; completeQuest(g, q); changed = true; }
  }
  return changed;
}
function abandonQuest(g, q) {
  g.quests = g.quests.filter((x) => x !== q);
  if (q.kind === 'vibe' && g.chars[q.charId]) g.chars[q.charId].vibeGoal = null;
  update();
}

/* =========================================================
   Feed helpers
   ========================================================= */
function revealedPosts(g, now = Date.now()) { return g.posts.filter((p) => p.at <= now).sort((a, b) => b.ts - a.ts); }
function shownLikes(p, now) { return (p.likes0 || 0) + Math.round((p.likeT || 0) * ease((now - (p.ls || p.at)) / (p.animMs || 40000))) + (p.liked ? 1 : 0); }
// The comments a post shows: those written by the model, plus the crowd that comes with the likes.
function shownReplies(p, now) { return Math.round((p.rT || 0) * ease((now - (p.ls || p.at)) / (p.animMs || 40000))); }
// 0.10: the counter promises comments nobody can read: « Voir plus de commentaires » writes them.
const moreDue = (p, now) => shownReplies(p, now) >= p.replies.filter((r) => r.at <= now).length + 3;
function shownReposts(p, now) { return Math.round((p.rpT || 0) * ease((now - (p.ls || p.at)) / (p.animMs || 40000))) + (p.reposted ? 1 : 0); }
// opts.cool: drop a post when its author already posted in the last minutes (no media recap after every reply).
// opts.quoteOf: the player's post this one quotes.
function addAmbientPost(g, o, at, ts, opts = {}) {
  const text = str(o.text, 320);
  if (!text) return null;
  const a = resolveAuthor(g, o.by, o.name, o.bio);
  if (!a || a === 'p') return null;
  if (opts.cool) {
    const media = a.startsWith('c:') && g.chars[a.slice(2)] && g.chars[a.slice(2)].kind === 'media';
    const since = Date.now() - (media ? 8 : 3) * 60000;
    if (g.posts.some((p) => p.cd && p.a === a && p.ts >= since)) return null;
  }
  const base = authorFollowers(g, a);
  const ch = a.startsWith('c:') ? g.chars[a.slice(2)] : null;
  const likeT = Math.round((base * rand(0.004, 0.03) + randi(0, 9)) * (inBadBuzz(ch, at) ? 0.4 : 1));
  const p = {
    id: uid('p'), a, text, ts: ts || at, at, likes0: 0, likeT, rpT: Math.round(likeT * rand(0.04, 0.2)), rT: Math.round(likeT * rand(0.015, 0.05)),
    ls: ts || at, animMs: 60000, replies: [], liked: false, reposted: false,
  };
  const photo = str(o.photo, 140);
  if (photo && photo.length >= 3) p.photo = { desc: photo, emoji: cleanEmojis(o.pe, 3) || photoEmoji(photo) };
  if (p.photo && ch && ch.kind === 'main' && !o.noPack) { const ph = matchAiPhoto(g, ch, photo, at, text); if (ph) attachPhoto(g, ch, p, ph, at); } // the character's real photo, when it shows what the post says
  if (opts.quoteOf) { const q = opts.quoteOf; p.q = { id: q.id, a: q.a, text: q.text.slice(0, 220), photo: q.photo || null }; }
  if (opts.cool) p.cd = 1; // a reaction during play: counts for its author's cooldown
  g.posts.push(tag(p));
  bumpLive(at + 2000);
  if (mentionRe(g.player.handle).test(text)) {
    const au = author(g, a);
    addNotif(g, { k: 'mention', p: p.id, c: au.id, at, text: `${au.name} t’a ${px(g, 'mentionné', 'mentionnée', 'mentionné·e')} : « ${text.slice(0, 90)}${text.length > 90 ? '…' : ''} »` });
  }
  return p;
}
// A reply that answers another comment of the thread (« re » / « to » : the handle of the one it answers).
function linkReply(g, post, r, to) {
  const th = typeof to === 'string' ? normHandle(to) : '';
  if (!r || !th || th === g.player.handle) return null;
  const tc = charByHandle(g, th), aid = tc ? 'c:' + tc.id : 'n:' + th;
  for (let k = post.replies.length - 1; k >= 0; k--) {
    const x = post.replies[k];
    if (x === r || x.a !== aid) continue;
    r.to = x.id;
    if (r.at <= x.at) { r.at = x.at + randi(2000, 6000); r.ts = r.at; r.ls = r.at; } // an answer comes after what it answers
    return x;
  }
  return null;
}
function addReplyTo(g, post, o, at) {
  const a = resolveAuthor(g, o.by, o.name, o.bio);
  if (!a || a === 'p') return null;
  const text = str(o.text, 300);
  if (!text) return null;
  const r = { id: uid('r'), a, text, ts: at, at, likeT: randi(0, 4) + Math.round(rand(0, 1) * authorFollowers(g, a) * 0.002), ls: at, animMs: 30000 };
  post.replies.push(tag(r));
  bumpLive(at + 1000);
  return r;
}
// opts.unsolicited: a character who already wrote twice without an answer waits for the player.
function addIncomingDM(g, by, text, at, opts = {}) {
  const c = typeof by === 'object' && by ? by : charByHandle(g, normHandle(by));
  if (!c || !c.unlocked || !DM_KINDS.includes(c.kind)) return false;
  text = str(text, opts.max || 320);
  if (!text) return false;
  const convo = g.dms[c.id] || (g.dms[c.id] = { msgs: [], readAt: 0 });
  if (opts.unsolicited) {
    let waiting = 0;
    for (let k = convo.msgs.length - 1; k >= 0 && !convo.msgs[k].me; k--) if (!convo.msgs[k].sys) waiting++;
    if (waiting >= 2) return false;
  }
  convo.msgs.push(tag({ id: uid('m'), me: false, text, ts: at, at }));
  addNotif(g, { k: 'dm', c: c.id, at, text: `${c.name} t’a écrit : « ${text.slice(0, 70)}${text.length > 70 ? '…' : ''} »` });
  bumpLive(at + 1000);
  return true;
}
function toggleLike(p) {
  const g = S.game;
  if (!g || p.a === 'p') return;
  p.liked = !p.liked;
  if (p.liked && p.a.startsWith('c:')) touch(g.chars[p.a.slice(2)]);
  if (p.liked && !p.likeRel && p.a.startsWith('c:')) { freeRel(g.chars[p.a.slice(2)], 1); p.likeRel = true; }
  update();
}
function toggleRepost(p) {
  const g = S.game;
  if (!g || p.a === 'p') return;
  p.reposted = !p.reposted;
  if (p.reposted) p.rpAt = Date.now();
  if (p.reposted && p.a.startsWith('c:')) touch(g.chars[p.a.slice(2)]);
  const c = p.a.startsWith('c:') ? g.chars[p.a.slice(2)] : null;
  if (p.reposted) toast('Reposté sur ton profil : tes abonnés le voient');
  // a repost is public: the author notices and reacts (thanks, a private word, annoyance if it looks ironic…)
  if (p.reposted && !p.rpRel && c && isMain(c) && Date.now() - (c.rpReactAt || 0) > 10 * 60000) { p.rpRel = true; c.rpReactAt = Date.now(); repostReaction(p, c); }
  else if (p.reposted && !p.rpRel && c) { freeRel(c, 2); p.rpRel = true; }
  update();
}
function toggleFollow(c) {
  const g = S.game;
  c.youFollow = !c.youFollow;
  if (c.youFollow && !c.followRel && isMain(c)) { freeRel(c, 3); c.followRel = true; }
  g.stats.following = followingCount(g);
  toast(c.youFollow ? `Tu suis ${c.name}` : `Tu ne suis plus ${c.name}`);
  update();
}
const followingCount = (g) => Object.values(g.chars).filter((x) => x.youFollow).length + Object.values(g.npcs).filter((x) => x.youFollow).length;
function toggleFollowNpc(n) {
  const g = S.game;
  if (!g || !n) return;
  n.youFollow = !n.youFollow;
  g.stats.following = followingCount(g);
  toast(n.youFollow ? `Tu suis ${n.name}` : `Tu ne suis plus ${n.name}`);
  update();
}
function unreadNotifs(g, now) { return g.notifs.filter((n) => n.k !== 'dm' && n.at <= now && n.at > g.notifReadAt).length; }
function unreadDM(g, id, now) {
  const c = g.dms[id];
  if (!c) return 0;
  return c.msgs.filter((m) => !m.me && m.at <= now && m.at > (c.readAt || 0)).length;
}
function unreadDMs(g, now, exceptId) {
  let n = 0;
  for (const id in g.dms) if (id !== exceptId && unreadDM(g, id, now) > 0) n++;
  return n;
}
function trends(g, now) {
  const counts = new Map();
  for (const p of g.posts) {
    if (p.at > now) continue;
    const tags = p.text.match(TAG_RE);
    if (!tags) continue;
    const seen = new Set();
    for (const tg of tags) {
      const k = tg.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      const e = counts.get(k) || { tag: tg, n: 0 };
      e.n += 1 + (p.a === 'p' ? 1 : 0);
      counts.set(k, e);
    }
  }
  return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 5).map((e) => [e.tag, e.n]);
}
function postsWithTag(g, tg, now) {
  const k = tg.toLowerCase();
  return revealedPosts(g, now).filter((p) => (p.text.match(TAG_RE) || []).some((x) => x.toLowerCase() === k));
}
// Followers gained or lost while the player was away (applied once, when the game opens).
// skip: the time went by through the accelerator, not while the player was away.
function applyAbsence(g, away, skip = false) {
  const s = g.stats;
  const hours = Math.min(48, away / 3600000);
  const factor = s.cancelled ? -0.8 : s.reputation >= 40 ? 1 : 0.3;
  const gain = grow(s.followers, Math.round((0.03 * reachOf(s.followers) + 2 + s.level) * hours * factor)); // 0.20: the bigger, the slower
  if (!gain) return 0;
  s.followers = Math.max(0, s.followers + gain);
  addNotif(g, { k: gain > 0 ? 'milestone' : 'unfollow', text: `${skip ? 'En accéléré' : 'Pendant ton absence'} : ${nAbonnes(gain, true)}` });
  checkMilestones(g);
  checkQuests(g);
  return gain;
}

/* =========================================================
   Storage: db capability per viewer, then localStorage, then memory
   ========================================================= */
const MEM = {};
const ACCESS = ['invalid_argument', 'not_granted', 'capability_disabled', 'capability_removed', 'transform_error'];
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
const toastAt = {};
function toastOnce(key, text) { const t = Date.now(); if (t - (toastAt[key] || 0) < 60000) return; toastAt[key] = t; toast(text, 'bad'); }
const Store = {
  mode: 'pending', db: null, uid: null,
  async init() {
    let db = null, user = null;
    const use = window.claude && typeof window.claude.use === 'function' ? (n) => window.claude.use(n).catch(() => null) : null;
    if (use) [db, user] = await Promise.all([use('db'), use('user')]);
    let id = null;
    if (user && typeof user.id === 'function') { try { id = await user.id(); } catch (e) { id = null; } }
    this.uid = id;
    // A viewer whose writes were refused for access reasons keeps playing in this browser on later visits too.
    if (db && id && lsGet('hype:local:' + id) !== '1') { this.db = db; this.mode = 'db'; }
    else this.mode = lsOK() ? 'local' : 'memory';
    S.store = this.mode;
  },
  path(name) { return 'data/users/' + this.uid + '/' + name; },
  // Resolves null only for a missing document; rejects when it could not read (callers must not save over it).
  async read(name) {
    if (this.mode === 'db') {
      const ref = this.db.doc(this.path(name));
      try { const s = await ref.get(); return s.exists ? cloneJSON(s.data()) : null; }
      catch (e) {
        if (e && ACCESS.includes(e.code)) throw e;
        await sleep(600 + Math.random() * 900);
        const s = await ref.get();
        return s.exists ? cloneJSON(s.data()) : null;
      }
    }
    if (this.mode === 'local') { const v = localStorage.getItem('hype:' + name); return v ? JSON.parse(v) : null; }
    return MEM[name] ? cloneJSON(MEM[name]) : null;
  },
  async write(name, body) {
    if (this.mode === 'db') {
      try { await this.db.doc(this.path(name)).set(body); return; }
      catch (e) {
        let err = e;
        if (!err || (!ACCESS.includes(err.code) && err.code !== 'revoked' && err.code !== 'quota_exceeded')) {
          await sleep(600 + Math.random() * 900);
          try { await this.db.doc(this.path(name)).set(body); return; } catch (e2) { err = e2; }
        }
        const tooBig = err && err.code === 'invalid_argument' && byteLen(JSON.stringify(body)) > 250000;
        if (err && !tooBig && (ACCESS.includes(err.code) || err.code === 'revoked')) {
          this.switchToLocal(err.code !== 'revoked');
          throw { code: 'store_switched', message: 'backend changed' };
        }
        if (err && err.code === 'quota_exceeded') toastOnce('quota', 'Stockage plein : supprime une ancienne partie.');
        throw err;
      }
    }
    if (this.mode === 'local') {
      try { localStorage.setItem('hype:' + name, JSON.stringify(body)); return; }
      catch (e) { toastOnce('quota', 'Le stockage de ce navigateur est plein : supprime une ancienne partie.'); throw e; }
    }
    MEM[name] = cloneJSON(body);
  },
  switchToLocal(pin) {
    this.mode = lsOK() ? 'local' : 'memory';
    S.store = this.mode;
    if (pin && this.uid) lsSet('hype:local:' + this.uid, '1');
    for (const k in lastWritten) delete lastWritten[k]; // everything must be written again, to the new place
    toast(this.mode === 'local' ? 'Sauvegarde dans ce navigateur uniquement.' : 'Sauvegarde impossible : ta partie sera perdue en quittant.', 'bad');
  },
  // false when it could not delete (deleteGame reads everything back anyway)
  async remove(name) {
    if (this.mode === 'db') { try { await this.db.doc(this.path(name)).delete(); return true; } catch (e) { return false; } }
    if (this.mode === 'local') { try { localStorage.removeItem('hype:' + name); return true; } catch (e) { return false; } }
    delete MEM[name];
    return true;
  },
};
function pruneGame(g) {
  const keepIds = new Set();
  for (const f of FLOWS) if (f.keep) keepIds.add(f.keep);
  const sorted = g.posts.slice().sort((a, b) => b.ts - a.ts);
  const keep = new Set();
  let mine = 0, others = 0;
  for (const p of sorted) {
    if (keepIds.has(p.id)) keep.add(p);
    else if (p.a === 'p') { if (mine < 50) { keep.add(p); mine++; } }
    else if (others < 110) { keep.add(p); others++; }
  }
  if (keep.size !== g.posts.length) {
    // the player's own photos of the posts that go: gone from this device too (unless another post still shows them)
    const own = (p) => (p.a === 'p' && p.photo && Array.isArray(p.photo.own) ? p.photo.own : []).concat(p.a === 'p' && p.video && p.video.thumbImg ? [p.video.thumbImg] : []); // 0.14: and its drawn thumbnail
    const gone = g.posts.filter((p) => !keep.has(p)).flatMap(own);
    g.posts = g.posts.filter((p) => keep.has(p));
    if (gone.length) {
      const still = new Set(g.posts.flatMap(own));
      for (const id of gone) if (!still.has(id)) mediaDel(id);
      g.media = (g.media || []).filter((id) => still.has(id) || !gone.includes(id));
    }
  }
  for (const p of g.posts) if (p.replies.length > 24) p.replies = p.replies.slice(-24);
  for (const id in g.dms) { const c = g.dms[id]; if (c.msgs.length > 60) c.msgs = c.msgs.slice(-60); }
  const used = new Set();
  const mark = (a) => { if (a && a.startsWith('n:')) used.add(a.slice(2)); };
  for (const p of g.posts) { mark(p.a); if (p.q) mark(p.q.a); for (const r of p.replies) mark(r.a); }
  for (const h in g.npcs) if (!used.has(h) && !g.npcs[h].regular && !g.npcs[h].youFollow) delete g.npcs[h];
  if (g.clues && g.clues.length > 40) g.clues = g.clues.slice(-40);
  if (g.fakes && g.fakes.length > 12) g.fakes = g.fakes.filter((f, k, all) => f.state === 'live' || k >= all.length - 12);
  if (g.notifs.length > 120) g.notifs = g.notifs.slice(-120);
  const done = g.quests.filter((q) => q.status === 'done');
  if (done.length > 12) { const drop = new Set(done.slice(0, done.length - 12)); g.quests = g.quests.filter((q) => !drop.has(q)); }
}
// 0.14: the core document (the game without its feed and its messages) must stay under the cap too, or the whole save
// fails. A long game piles up what it no longer needs: old notifications, the details of contacts it is done with, the
// candidates who were told no. Least useful first, and only as much as it takes. (Works on a snapshot as well.)
const CONTACT_IDLE_MS = 30 * 24 * 3600000;
function slimContact(c) {
  if (c.kind === 'brand') { c.bio = str(c.role, 60); c.personality = 'professionnelle, directe, défend son budget'; c.voice = 'pro, phrases courtes'; }
  else { c.bio = ''; c.personality = ''; c.voice = ''; delete c.cand; }
  c.mem = [];
  c.slim = true;
}
function compactCore(g, cap, size) {
  const t = Date.now();
  const chars = () => Object.values(g.chars || {});
  const lastSeen = (c) => { const m = g.dms && g.dms[c.id] ? g.dms[c.id].msgs : null; return Math.max(c.unlockedAt || 0, m && m.length ? m[m.length - 1].ts || 0 : 0); };
  const busy = (c) => (g.staff || []).some((s) => s.c === c.id) || (g.deals || []).some((d) => d.contact === c.id && (d.state === 'signed' || DEAL_OPEN.includes(d.state)));
  const said = (id) => (g.posts || []).some((p) => p.a === 'c:' + id || (p.replies || []).some((r) => r.a === 'c:' + id));
  const refd = (id) => (g.notifs || []).some((n) => n.c === id) || said(id) || (g.quests || []).some((q) => q.charId === id) || (g.events || []).some((e) => e.c === id) || (g.deals || []).some((d) => d.contact === id) || (g.staff || []).some((s) => s.c === id);
  const steps = [
    () => { if (g.notifs.length > 60) g.notifs = g.notifs.slice(-60); },
    () => { for (const c of chars()) if (c.kind === 'gone' && !c.slim) slimContact(c); },
    () => { for (const c of chars()) if (c.kind === 'brand' && !c.joined && !c.slim && !busy(c) && t - lastSeen(c) > CONTACT_IDLE_MS) slimContact(c); },
    () => { for (const c of chars()) if (c.kind === 'gone' && !refd(c.id)) { delete g.chars[c.id]; if (g.dms) delete g.dms[c.id]; g.order = g.order.filter((id) => id !== c.id); } },
    () => {
      if (g.notifs.length > 30) g.notifs = g.notifs.slice(-30);
      if (g.clues && g.clues.length > 20) g.clues = g.clues.slice(-20);
      if (g.chronicle && g.chronicle.length > 16) g.chronicle = g.chronicle.slice(-16);
      if (Array.isArray(g.whispers)) g.whispers = g.whispers.filter((w) => w.state === 'live');
    },
  ];
  for (const step of steps) { if (size() <= cap) return true; step(); }
  return size() <= cap;
}
const coreSize = (g) => { const { posts, dms, updatedAt, ready, ...core } = g; return byteLen(JSON.stringify(core)); };
// A save that did not land is said, once in a while, with a way out (the export keeps everything).
let saveFailAt = 0;
function saveFailed(e) {
  if (e && (e.code === 'quota_exceeded' || e.code === 'store_switched')) return; // already said by the store
  const t = Date.now();
  if (t - saveFailAt < 10 * 60000) return;
  saveFailAt = t;
  toast('Ta partie n’a pas pu être sauvegardée. Exporte-la pour ne rien perdre.', 'bad', S.game ? { label: 'Exporter', run: () => exportGame(S.game.id) } : null);
}
/* ---------- quick saves: three slots, plus one taken automatically before a risky action ---------- */
const SAVE_SLOTS = ['1', '2', '3'];
const AUTO_SLOTS = ['auto', 'auto2', 'auto3']; // the last three automatic saves, the oldest one replaced
const saveLabel = (g) => `Niv. ${g.stats.level} · ${fmtN(g.stats.followers)} ${plural(g.stats.followers, 'abonné', 'abonnés')}`;
// 0.10.2: a mini-game not played to the end never travels in a save or an export: loading it writes a new one.
// Otherwise its questions could be seen (or played and failed), then the save loaded, and the answers known.
function dropUnplayed(o) {
  for (const r of (o && o.releases) || []) {
    if (r && r.state === 'scheduled' && !r.played) r.game = null;
    if (r && r.state === 'scheduled' && r.played && !r.edit) r.editGame = null; // 0.14: an edit half done, a new one
  }
  for (const e of (o && o.events) || []) if (e && e.player && e.state === 'scheduled' && !e.played) { e.game = null; delete e.prep; delete e.talk; }
  return o;
}
// The whole game as it is now (its own save list aside), small enough for one document.
function snapshotOf(g) {
  pruneGame(g);
  const snap = dropUnplayed(cloneJSON(Object.assign({}, g, { saves: [] })));
  let txt = JSON.stringify(snap);
  const cap = docCap() - 4000;
  if (byteLen(txt) > cap) { // long conversations and old notifications first
    for (const id in snap.dms) if (snap.dms[id].msgs.length > 30) snap.dms[id].msgs = snap.dms[id].msgs.slice(-30);
    if (snap.notifs.length > 50) snap.notifs = snap.notifs.slice(-50);
    txt = JSON.stringify(snap);
  }
  if (byteLen(txt) > cap) { compactCore(snap, cap, () => byteLen(JSON.stringify(snap))); txt = JSON.stringify(snap); } // 0.14: contacts and candidates of the past
  while (byteLen(txt) > cap && snap.posts.length > 20) { // then the oldest posts of others
    const others = snap.posts.filter((p) => p.a !== 'p').sort((a, b) => a.ts - b.ts);
    const drop = new Set((others.length ? others : snap.posts.slice().sort((a, b) => a.ts - b.ts)).slice(0, 5));
    snap.posts = snap.posts.filter((p) => !drop.has(p));
    txt = JSON.stringify(snap);
  }
  return snap;
}
async function writeSave(g, slot, label) {
  const meta = { slot, at: Date.now(), label: label || saveLabel(g), lvl: g.stats.level, fol: g.stats.followers, auto: AUTO_SLOTS.includes(slot) };
  const body = { v: 1, meta, game: snapshotOf(g) };
  await Store.write(`g_${g.id}_save_${slot}`, body);
  g.saves = (g.saves || []).filter((x) => x.slot !== slot).concat(meta); // 0.14: listed only once it is really there
}
// Before a risky action (a call-out, a release, a date, a long skip): the player can take it back.
function autoSave(g, why) {
  if (!g || S.game !== g || !g.ready) return;
  const used = g.saves || [];
  const at = (k) => (used.find((x) => x.slot === k) || {}).at || 0;
  const slot = AUTO_SLOTS.find((k) => !used.some((x) => x.slot === k)) || AUTO_SLOTS.slice().sort((a, b) => at(a) - at(b))[0];
  writeSave(g, slot, why).catch((e) => console.warn('auto save', e && (e.code || e.message)));
}

function summarize(g) {
  return {
    id: g.id, world: g.world.name, emoji: g.world.emoji, hue: g.world.hue, title: g.title || '', // (0.27.7: the name the player gave it)
    name: g.player.name, handle: g.player.handle, avatar: g.player.emoji, ahue: g.player.hue,
    level: g.stats.level, followers: g.stats.followers, updatedAt: g.updatedAt, setup: !!g.pendingCast,
  };
}
const SUMMARY_KEYS = ['world', 'title', 'emoji', 'hue', 'name', 'handle', 'avatar', 'ahue', 'level', 'followers', 'setup'];
const lastWritten = {};
let saveTimer = null;
let saving = Promise.resolve();
let indexOK = false; // set by boot once the index was read (or confirmed absent)
let lastIndexAt = 0;
const deletedIds = new Set();
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; saveNow(); }, 2500);
}
function saveNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  return saveGame(S.game);
}
function saveGame(g) {
  if (!g || !g.ready || deletedIds.has(g.id)) return saving;
  saving = saving.then(() => writeGame(g)).catch((e) => { console.warn('save failed', e && (e.code || e.message)); saveFailed(e); });
  return saving;
}
// Byte caps per document: 230 KB in the db (256 KiB limit), 110 KB in localStorage (~5 MB for every game together).
const docCap = () => (Store.mode === 'db' ? 230000 : 110000);
async function writeGame(g, retried = false) {
  if (deletedIds.has(g.id)) return;
  pruneGame(g);
  if (coreSize(g) > docCap()) compactCore(g, docCap() - 2000, () => coreSize(g)); // 0.14: or the whole save would fail
  const { posts, dms, updatedAt, ready, ...core } = g;
  const feedBody = { posts };
  let feedStr = JSON.stringify(feedBody);
  while (byteLen(feedStr) > docCap() && feedBody.posts.length > 20) {
    const others = feedBody.posts.filter((p) => p.a !== 'p').sort((a, b) => a.ts - b.ts);
    const drop = new Set((others.length > 10 ? others : feedBody.posts.slice().sort((a, b) => a.ts - b.ts)).slice(0, 10));
    feedBody.posts = feedBody.posts.filter((p) => !drop.has(p));
    g.posts = feedBody.posts;
    feedStr = JSON.stringify(feedBody);
  }
  const dmsBody = { dms };
  let dmStr = JSON.stringify(dmsBody);
  while (byteLen(dmStr) > docCap()) {
    let changed = false;
    for (const id in dms) if (dms[id].msgs.length > 10) { dms[id].msgs = dms[id].msgs.slice(-Math.floor(dms[id].msgs.length * 0.7)); changed = true; }
    if (!changed) break;
    dmStr = JSON.stringify(dmsBody);
  }
  const docs = [['g_' + g.id, JSON.stringify(core)], ['g_' + g.id + '_feed', feedStr], ['g_' + g.id + '_dms', dmStr]];
  let wrote = false;
  try {
    for (const [name, s] of docs) {
      if (lastWritten[name] === s) continue;
      await Store.write(name, JSON.parse(s));
      lastWritten[name] = s;
      wrote = true;
    }
  } catch (e) {
    if (e && e.code === 'store_switched' && !retried) return writeGame(g, true); // all three documents, then the index, in the new place
    throw e;
  }
  if (wrote) {
    g.updatedAt = Date.now();
    await writeIndex(g);
  }
}
async function writeIndex(g, force = false) {
  if (!indexOK) return; // never overwrite a list we could not read
  if (g && !force) {
    const cur = S.games.find((x) => x.id === g.id);
    const sm = summarize(g);
    if (cur && Date.now() - lastIndexAt < 60000 && SUMMARY_KEYS.every((k) => cur[k] === sm[k])) { cur.updatedAt = sm.updatedAt; return; }
  }
  let stored;
  try { stored = await Store.read('index'); } catch (e) { return; } // another tab or device may have added a game: merge
  const byId = new Map();
  for (const x of (stored && Array.isArray(stored.games) ? stored.games : [])) if (x && x.id && !deletedIds.has(x.id)) byId.set(x.id, x);
  for (const x of S.games) { const o = byId.get(x.id); if (!deletedIds.has(x.id) && (!o || (x.updatedAt || 0) >= (o.updatedAt || 0))) byId.set(x.id, x); }
  if (g && !deletedIds.has(g.id)) byId.set(g.id, summarize(g));
  S.games = [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_GAMES + 2);
  const body = { games: S.games };
  const s = JSON.stringify(body);
  lastIndexAt = Date.now();
  if (lastWritten.index === s) return;
  await Store.write('index', body);
  lastWritten.index = s;
}
// Rejects when a document could not be read: the caller must not enter (and later save) a partial game.
async function loadGameData(id) {
  const [core, feed, dms] = await Promise.all([Store.read('g_' + id), Store.read('g_' + id + '_feed'), Store.read('g_' + id + '_dms')]);
  if (!core) return null;
  for (const k of Object.keys(lastWritten)) if (k.startsWith('g_') && !k.startsWith('g_' + id)) delete lastWritten[k]; // only the open game is cached
  lastWritten['g_' + id] = JSON.stringify(core);
  if (feed) lastWritten['g_' + id + '_feed'] = JSON.stringify(feed);
  if (dms) lastWritten['g_' + id + '_dms'] = JSON.stringify(dms);
  const g = Object.assign({}, core, { posts: feed && Array.isArray(feed.posts) ? feed.posts : [], dms: dms && dms.dms ? dms.dms : {} });
  return migrate(g);
}
// A game as one file, to keep or to move to another AI (Claude ↔ ChatGPT). Quick saves stay behind.
const EXPORT_FORMAT = 'hype-partie';
async function exportGameText(id) {
  const g = S.game && S.game.id === id ? S.game : await loadGameData(id);
  if (!g) throw { code: 'not_found' };
  const { posts, dms, updatedAt, ready, ...core } = cloneJSON(g);
  core.saves = [];
  dropUnplayed(core);
  const media = await mediaExport(g).catch(() => ({})); // the player's own photos travel with the game
  return JSON.stringify(Object.assign({ format: EXPORT_FORMAT, version: 1, exportedAt: Date.now(), from: AI_NAME, core, feed: { posts }, dms: { dms } }, Object.keys(media).length ? { media } : {}));
}
const exportName = (s) => 'hype-' + String((s && (s.world + '-' + s.name)) || 'partie').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) + '.json';
// Comes back as a new game (its own id): importing the same file twice gives two games, never a clash.
async function importGameText(text) {
  let d = null;
  try { d = JSON.parse(text); } catch (e) { /* not JSON */ }
  if (!d || d.format !== EXPORT_FORMAT || !d.core || typeof d.core !== 'object' || !d.core.player || !d.core.world) throw { code: 'invalid' };
  if (S.games.length >= MAX_GAMES) throw { code: 'full' };
  const g = migrate(Object.assign({}, d.core, { posts: d.feed && Array.isArray(d.feed.posts) ? d.feed.posts : [], dms: d.dms && d.dms.dms && typeof d.dms.dms === 'object' ? d.dms.dms : {} }));
  g.media = [];
  if (d.media) await mediaImport(g, g, d.media).catch(() => {}); // its photos, as copies of its own
  g.id = uid('g');
  g.saves = [];
  g.lastSeenAt = Date.now();
  await writeGame(g);
  return g;
}
// Erased for real, and checked: every document is read back and must be gone (a network hiccup is retried once),
// then the list of games is written without it. Resolves true only when all of that is done.
function deleteGame(id) {
  deletedIds.add(id);
  const names = ['g_' + id, 'g_' + id + '_feed', 'g_' + id + '_dms', ...SAVE_SLOTS.concat(AUTO_SLOTS).map((k) => `g_${id}_save_${k}`)];
  const still = async (list) => { try { return (await Promise.all(list.map(async (n) => ((await Store.read(n)) ? n : null)))).filter(Boolean); } catch (e) { return list; } };
  const job = saving.then(async () => {
    // the portraits the player imported live in their own documents
    try {
      const core = await Store.read('g_' + id);
      if (core && Array.isArray(core.photoKeys)) for (const k of core.photoKeys) names.push(`g_${id}_ph_${k}`);
      if (core && Array.isArray(core.media)) for (const m of core.media) mediaDel(m); // the player's own photos (best effort)
    } catch (e) { /* none known */ }
    await Promise.all(names.map((n) => Store.remove(n)));
    let left = await still(names);
    if (left.length) { await sleep(800); await Promise.all(left.map((n) => Store.remove(n))); left = await still(left); }
    for (const k of Object.keys(lastWritten)) if (k.startsWith('g_' + id)) delete lastWritten[k];
    if (left.length) return false;
    S.games = S.games.filter((x) => x.id !== id);
    await writeIndex(null, true);
    if (!indexOK) return true;
    const idx = await Store.read('index');
    return !(idx && Array.isArray(idx.games) && idx.games.some((x) => x && x.id === id));
  }).catch(() => false);
  saving = job.then(() => {});
  return job;
}
