/* =========================================================
   0.33.4: elle rôde. The player got away from the psychopath (an attack fought off, a night fled, put out at the door):
   they know that the player knows. Until they are stopped (arrested, or unmasked in public), they do not let go, and
   their AI decides what they do and when, never the game: nothing for days, then a knock in the night, a note slipped
   under the door, messages that chill once they see it is lost, trying to see the player again, going after the ones
   close to the player. Only where they know: everyone knows only the addresses they saw or were given. The player is
   never stuck: the door can stay shut, the police can be called (police.js).
   And the one who lived it with the player: for a few days, they write, to know how the player is.
   Loaded after enquete.js: functions and constants only, nothing runs at load time.
   ========================================================= */
// The suites written before it play as they did, unless they ask for it.
const huntOn = () => !window.__HYPE_TEST__ || !!window.__t334;

/* ---------- who knows where: the addresses seen, or given ---------- */
// c.addr = { p: { at, how }, <id of someone>: { at, how } } (not c.knows: who was told of a private love, 0.22.2); what
// the game also knows: who came to the player's door,
// who slept there, a date at the player's, and for the psychopath, what their file shows (a photo of the player's
// windows, a key with the player's address on it).
const HOME_SEEN_RE = /(?:devant|en bas de|près de|autour de|sous|entrée?|entré·e|venue?|venu·e|passée?|passé·e|revenue?|revenu·e|frapper|frappé) chez toi|ta fen[êe]tre|tes fen[êe]tres|tes volets|ton adresse|ta porte\b|ton immeuble|ta rue\b|ton palier|ta bo[îi]te aux lettres|double de tes cl[ée]s|trousseau|ton digicode|ton balcon|ton entrée\b|chez toi en pleine nuit/i;
const ADDR_RE = /\b\d{1,4}\s?(?:bis|ter)?,?\s+(?:rue|avenue|av\.?|boulevard|bd|all[ée]e|impasse|place|chemin|quai|cours|route|square|passage|r[ée]sidence|cit[ée])\s|\bj['’]habite\s+(?:au\s+\d|rue|avenue|boulevard|bd|place|quai|impasse|all[ée]e|juste|dans la rue|à côté|a cote|en face|au-dessus|au dessus)|\bmon adresse\s*(?:c['’]est|:|est|,)|\bje t['’]envoie (?:mon adresse|ma position|ma loc)|\bdigicode\b|\bcode (?:de la porte|d['’]entr[ée]e|de l['’]immeuble)/i;
const COME_HOME_RE = /\b(?:viens|venez|passe|passez|rejoins-moi|rejoignez-moi|monte|montez)\s+(?:me voir\s+)?(?:chez moi|à la maison|a la maison)\b/i;
const reQuote = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// « Chez Mila », « chez @mila.flux »: the player's place, named.
function chezPlayer(g, what) {
  const P = g && g.player;
  if (!P) return false;
  const names = [P.handle, firstName(P)].filter((x) => x && x.length >= 2).map(reQuote).join('|');
  return !!names && new RegExp(`chez\\s+@?(?:${names})(?![\\p{L}\\p{M}0-9])`, 'iu').test(String(what || ''));
}
function learnHome(g, c, whose, how, t = Date.now()) {
  if (!g || !c) return false;
  const k = whose === 'p' ? 'p' : whose && whose.id ? whose.id : whose;
  if (!k || k === c.id) return false;
  if (!c.addr || typeof c.addr !== 'object') c.addr = {};
  if (c.addr[k]) return false;
  c.addr[k] = { at: t, how: str(how, 90) };
  return true;
}
// How someone knows where the player lives (null: they do not).
function homeHow(g, c) {
  if (!g || !c) return null;
  const K = c.addr && c.addr.p;
  if (K) return K.how || 'le joueur le lui a dit';
  if ((g.visits || []).some((v) => v.c === c.id)) return `est déjà ${gx(c.g, 'venu', 'venue', 'venu·e')} frapper à sa porte`;
  if ((g.events || []).some((e) => e.c === c.id && e.morning && e.morning.where === 'p') || (g.stay && g.stay.c === c.id && g.stay.where === 'p')) return 'a déjà dormi chez lui';
  if ((g.events || []).some((e) => e.c === c.id && e.played && chezPlayer(g, e.what))) return `est déjà ${gx(c.g, 'venu', 'venue', 'venu·e')} chez lui`;
  if ((g.clues || []).some((k) => k.c === c.id && k.psy && HOME_SEEN_RE.test(k.text || ''))) return 'a repéré où il habite (ses photos, ses passages devant chez lui)';
  return null;
}
// How someone knows where `x` (of the cast) lives.
function homeOfHow(g, c, x) {
  if (!c || !x || c.id === x.id) return null;
  const K = c.addr && c.addr[x.id];
  return K ? K.how || 'le sait' : null;
}
// The player's own words, in private: their address (or someone's) given, « viens chez moi ».
function homeSaid(g, c, text, t = Date.now()) {
  if (!huntOn() || !c || !isMain(c)) return false;
  const s = String(text || '');
  if (!ADDR_RE.test(s) && !COME_HOME_RE.test(s)) return false;
  const x = namedIn(g, s, c).find((y) => new RegExp(`(?:@${reQuote(y.handle)}|${reQuote(firstName(y))})[^.!?]{0,30}(?:habite|vit |loge|adresse)`, 'i').test(s));
  if (x && !/\bj['’]habite|\bmon adresse|chez moi/i.test(s)) return learnHome(g, c, x, `le joueur lui a donné l’adresse de ${firstName(x)}`, t);
  return learnHome(g, c, 'p', 'le joueur lui a donné son adresse', t);
}

/* ---------- the hunt ---------- */
// P.hunt = { at (the first time the player got away), last (the latest), why ('attack' | 'fled' | 'visit'), act (their
// last move), n, log: their moves, night: the last night their AI was asked about, notes: the ones slipped under the door,
// tell: the ones close to the player who have something to tell }.
const HUNT_GAP = 6 * HR; // (game time) a move of theirs, then this at least before the next one is offered in a refresh
const HUNT_P = 0.45;
function startHunt(g, c, why, t = Date.now()) {
  const P = g && g.psy;
  if (!huntOn() || !P || P.out || !c || c.id !== P.c) return null;
  if (!P.hunt) {
    P.hunt = { at: t, why: why || 'fled', n: 0 };
    addMem(g, c, `le joueur m’a échappé : ${px(g, 'il', 'elle', 'iel')} sait, maintenant. Ça ne se terminera pas comme ça`, null, true);
  } else if (why === 'attack') P.hunt.why = 'attack';
  P.hunt.last = t;
  return P.hunt;
}
const huntNow = (g) => { const c = huntOn() ? psyNow(g) : null; return c && g.psy.hunt ? c : null; };
const hunted = (g, c) => !!c && huntNow(g) === c;
// The attacks of theirs fought off (at their place, or at the player's), oldest first; the latest.
function attacksOf(g, c) {
  const all = [...(g.events || []).map((e) => e.talk && e.talk.attack), ...(g.visits || []).map((v) => v.attack)];
  return all.filter((A) => A && A.done && A.ok && c && A.c === c.id).sort((a, b) => (a.at || 0) - (b.at || 0));
}
const lastAttack = (g, c) => attacksOf(g, c).pop() || null;
// The ones close to the player they may go after: whoever saw it, the player's loves, the closest friends.
const huntCircle = (g, c) => mains(g).filter((x) => x !== c && x.unlocked && !x.jailed && !x.cut && !x.gone && ((x.saw && x.saw.psy === c.id) || PARTNER.includes(x.vibe) || x.rel >= 50))
  .sort((a, b) => (b.saw ? 1 : 0) - (a.saw ? 1 : 0) || b.rel - a.rel).slice(0, 4);
const agoWords = (ts, t = Date.now()) => { const d = Math.floor((t - ts) / DAY_MS); return d < 1 ? 'il y a quelques heures' : d === 1 ? 'hier' : `il y a ${d} jours`; };
function huntKnowsLine(g, c) {
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel'), hp = homeHow(g, c);
  const known = huntCircle(g, c).filter((x) => homeOfHow(g, c, x));
  return `Où ${first} sait aller (et nulle part ailleurs : ${il} ne connaît que les adresses qu’${il} a vues ou qu’on lui a données) : ${hp ? `chez le joueur (${hp})` : `pas chez le joueur, ${il} ne sait pas où il habite`}${known.length ? ` ; chez ${known.map((x) => '@' + x.handle).join(', ')}` : ''}. ${cap1(il)} peut chercher ce qui lui manque (le suivre, demander autour de lui, éplucher ses photos) : ça prend du temps.`;
}
const RODE_WORDS = { toquer: 'a frappé chez le joueur en pleine nuit', mot: 'a glissé un mot sous sa porte', guetter: 'est resté·e en bas de chez lui', proche: 's’en est pris·e à un proche', chercher: 'a cherché une adresse', message: 'lui a écrit' };
function huntLogLines(g, t = Date.now()) {
  const H = g.psy && g.psy.hunt;
  const log = (H && H.log) || [];
  if (!log.length) return ['Rien encore.'];
  return log.slice(-6).map((x) => `- ${agoWords(x.at, t)} : ${RODE_WORDS[x.q] || x.q}${x.who && x.who !== 'p' && g.chars[x.who] ? ` (@${g.chars[x.who].handle})` : ''}${x.text ? ` — « ${x.text} »` : ''}`);
}
// What their prompts know (a line in the secret of the game): the mask fell between them, and they do not let go.
function huntCore(g, c, t = Date.now()) {
  const H = g.psy.hunt, first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel');
  const W = mains(g).filter((x) => x.saw && x.saw.psy === c.id && !x.jailed);
  const how = H.why === 'attack' ? `${cap1(agoWords(H.at, t))}, ${first} a essayé de tuer le joueur${W.length ? ` (et ${W.map((x) => '@' + x.handle).join(', ')}, qui était là)` : ''} : il s’est défendu et lui a échappé`
    : H.why === 'visit' ? `${cap1(agoWords(H.at, t))}, ${first} est ${gx(c.g, 'entré', 'entrée', 'entré·e')} chez le joueur en pleine nuit : il l’a ${gx(c.g, 'mis', 'mise', 'mis·e')} dehors`
      : `${cap1(agoWords(H.at, t))}, le joueur s’est enfui de chez ${first}, terrifié par ce qu’il y a vu`;
  return ['', `## DEPUIS QUE LE JOUEUR LUI A ÉCHAPPÉ`,
    `${how}. Le masque est tombé entre eux : ${first} sait que le joueur sait${W.length ? `, et que ${W.map((x) => '@' + x.handle).join(' et ')} a tout vu` : ''}. Pour ${first}, rien n’est fini entre eux : ${il} veut encore le joueur, à n’importe quel prix, et plus il lui échappe, plus ça devient froid.`,
    `Ce que ${first} fait, et quand, c’est toi qui le décides, comme ${il} est (jamais tout à la fois, jamais tout le temps ; souvent rien pendant un moment, puis ça revient) : faire comme si de rien n’était, des excuses mielleuses (« je ne sais pas ce qui m’a pris »), vouloir le revoir « pour s’expliquer », proposer de tout recommencer ; quand ${il} voit que c’est fichu, des messages qui glacent (ce qu’${il} sait de ses nuits, de sa porte, de ses proches), sans menace en toutes lettres ; le silence aussi, longtemps. Jamais d’aveu. Rien de gore.`,
    huntKnowsLine(g, c),
    ...policeForPsy(g, c, t)];
}
// The refreshes: the secret of the game goes on (their DMs written there), and maybe a move of theirs.
function huntPublicLines(g, t = Date.now()) {
  const c = huntNow(g);
  if (!c) return [];
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel'), H = g.psy.hunt;
  const L = [`- SECRET DU JEU (toi seul le sais ; seuls ceux qui ont vu, ou à qui le joueur l’a dit, sont au courant) : @${c.handle} est le psychopathe de cette partie. ${H.why === 'attack' ? `${cap1(agoWords(H.at, t))}, ${il} a essayé de tuer le joueur, qui lui a échappé` : `${cap1(agoWords(H.at, t))}, le joueur lui a échappé`} : ${first} sait qu’il sait, et ne lâche pas. En public, ${il} fait bonne figure, ou disparaît un temps ; en privé (lignes dm de @${c.handle}), c’est toi qui choisis : rien, des excuses mielleuses, l’envie de le revoir, ou des messages qui glacent quand ${il} voit que c’est fichu. ${huntKnowsLine(g, c)}${policeForPsy(g, c, t).map((x) => ' ' + x).join('')}`];
  const rl = rodeLine(g, c, t);
  if (rl) L.push(rl);
  return L;
}
// A move of theirs, maybe (their AI chooses its moment; most of the time, nothing).
function rodeLine(g, c, t = Date.now()) {
  const H = g.psy.hunt, first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel');
  if (!(window.__HYPE_TEST__ && window.__huntOffer) && (t - (H.act || H.last || H.at) < HUNT_GAP || Math.random() >= HUNT_P)) return null;
  const home = homeHow(g, c), there = !awayHome(g, t), circle = huntCircle(g, c);
  const opts = [
    home && there && nightAt(t) && !liveVisit(g) ? `"toquer" (frapper chez le joueur, maintenant, en pleine nuit ; "text" = ce qu’${il} dit à travers la porte)` : null,
    home ? `"mot" (glisser un mot sous sa porte ; "text" = le mot, glaçant ou faussement tendre)` : null,
    home ? `"guetter" (rester en bas de chez lui, à regarder ses fenêtres ; "text" = ce qu’il pourrait remarquer)` : null,
    `"message" (lui écrire maintenant ; "text" = le message)`,
    circle.length ? `"proche" (s’en prendre à quelqu’un de proche du joueur parmi ${circle.map((x) => '@' + x.handle + (homeOfHow(g, c, x) ? ` (${il} sait où ${gx(x.g, 'il', 'elle', 'iel')} habite)` : '')).join(', ')} : lui écrire, l’aborder, lui raconter sa version, l’attendre devant chez lui ou elle seulement si ${il} sait où c’est ; "who" = son handle, "text" = ce qu’${il} fait)` : null,
    `"chercher" (trouver une adresse qui lui manque${home ? '' : ', celle du joueur par exemple'} ; "who" = joueur ou un handle, "text" = comment, ce qu’on pourrait en remarquer)`,
  ].filter(Boolean);
  return `- Facultatif, et pas à chaque fois (${first} choisit son moment ; le plus souvent, rien) : ce que @${c.handle} fait en douce maintenant : {"t":"rode","by":"${c.handle}","quoi":"…","who":"joueur","text":"≤ 160 caractères"}, quoi parmi ${opts.join(' ; ')}.`;
}
const normRode = (q) => { q = plainOf(q); return /^rien|^non|aucun/.test(q) ? 'rien' : /toqu|frapp|sonn/.test(q) ? 'toquer' : /^mot|lettre|note|billet|papier/.test(q) ? 'mot' : /guet|surveil|fenetre/.test(q) ? 'guetter' : /proch|ami|temoin|entour/.test(q) ? 'proche' : /cherch|trouv|adress|suiv/.test(q) ? 'chercher' : /messag|ecri|dm|texto/.test(q) ? 'message' : 'rien'; };
const rodeWho = (g, o) => (o && o.who && !/^\s*(?:le\s+|la\s+)?(?:joueu[rs]e?|p|moi)\s*$/i.test(String(o.who)) ? charByHandle(g, normHandle(o.who)) : null);
// In a refresh (or an act): a line of theirs, played once the posts are shown.
function applyRodeLine(g, o, effects) {
  if (o.t !== 'rode') return false;
  const c = huntNow(g);
  if (c && (!o.by || normHandle(o.by) === c.handle) && !effects.some((x) => x.rode)) { const fx = () => rodeDo(g, c, o, later() + 2500); fx.rode = true; effects.push(fx); }
  return true;
}
function rodeDo(g, c, o, at = later(), night = null) {
  const H = g.psy && g.psy.hunt, q = normRode(o.quoi);
  if (!H || q === 'rien') return null;
  const text = str(o.text, 220), who = rodeWho(g, o), t = Date.now();
  let r = null;
  if (q === 'toquer') r = huntKnock(g, c, text, at);
  else if (q === 'mot') r = huntNote(g, c, text, at);
  else if (q === 'guetter') r = who ? huntClose(g, c, who, text || `${firstName(c)} est ${gx(c.g, 'resté', 'restée', 'resté·e')} en bas de chez ${gx(who.g, 'lui', 'elle', 'iel')}`, at) : huntWatch(g, c, text, at);
  else if (q === 'proche') r = who ? huntClose(g, c, who, text, at) : null;
  else if (q === 'chercher') r = huntSearch(g, c, who, text, at);
  else if (q === 'message') r = huntMessage(g, c, text, at);
  if (!r) return null;
  H.act = t;
  H.n = (H.n || 0) + 1;
  H.log = (H.log || []).concat({ at: night ? night.at : t, q, who: who ? who.id : 'p', text: str(text, 120) }).slice(-12);
  return r;
}

/* ---------- at the door ---------- */
// A knock (at night, the player at home): the door is shut, and stays so unless the player opens it.
function huntKnock(g, c, text, at = later()) {
  if (!homeHow(g, c) || liveVisit(g) || awayHome(g) || inMiniGame()) return null; // (out, or on a date: nobody opens)
  const t = Date.now();
  const v = { id: uid('vi'), c: c.id, why: 'revoir le joueur, depuis qu’il lui a échappé', urge: 'urgent', at: t, state: 'knock', turn: 0, max: VISIT_TURNS, reacts: [], mood: null, hunt: 1, door: 'shut',
    lines: [{ who: 'n', text: `${hourOf(t)}. On frappe à ta porte. Trois coups. Puis plus rien.` }, { who: 'c', text: str(text, 260) || '…c’est moi. Ouvre. Je veux juste te parler.', seen: 'à travers la porte' }] };
  g.visits = (g.visits || []).filter((x) => isLiveVisit(x) || t - x.at < 7 * DAY_MS).concat(v).slice(-10);
  g.visitAt = t;
  c.visitAt = t;
  queueModalFor(g, { t: 'visit', vid: v.id, at });
  autoSave(g, `On frappe à ta porte (${hourOf(t)})`);
  return v;
}
// The door, through it: what they say to get in (and only that: shut, it holds).
function huntDoorLines(g, v, c) {
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel');
  return ['', `## ${first.toUpperCase()} EST DERRIÈRE LA PORTE DU JOUEUR (il n’a pas ouvert)`,
    `${first} a frappé chez le joueur ${nightAt(v.at) ? 'en pleine nuit' : 'sans prévenir'}, après ce qu’${il} lui a fait. La porte est fermée à clé : ils se parlent à travers. ${cap1(il)} veut qu’il ouvre : la douceur d’abord (des excuses, des larmes, « je veux juste te parler »), puis des phrases qui glacent quand ça ne marche pas (ce qu’${il} sait de sa nuit, de son palier, de ses proches). Tant que la porte reste fermée, ${il} ne peut rien faire : ${il} ne la force pas, ne passe pas par la fenêtre.`,
    `${cap1(il)} peut partir quand ${il} veut (la ligne leave), ou rester là, à attendre. Rien de gore.`];
}
// « Ouvrir la porte »: to them (the player knows who it is): two exchanges, then the worst may come.
function openDoor(g, v) {
  const c = g && v && g.chars[v.c];
  if (!c || !v.hunt || v.door === 'open' || !isLiveVisit(v) || S.busy.visit) return false;
  v.door = 'open';
  v.state = 'talk';
  v.openAt = Date.now();
  if (!v.startAt) v.startAt = v.openAt;
  v.lines.push({ who: 'n', text: `Tu tournes la clé. La porte s’entrouvre sur ${firstName(c)}.` });
  if (isPsy(g, c) && psyNow(g)) { v.psy = 'deadly'; v.max = Math.min(v.max, v.turn + 2); }
  return true;
}
// « Appeler la police », the door shut: they hear it, and are gone when the police come (who note it).
function doorPolice(g, v) {
  const c = g && v && g.chars[v.c];
  if (!c || !isLiveVisit(v) || v.door === 'open' || v.ending || S.busy.visit) return false;
  const first = firstName(c), parti = gx(c.g, 'parti', 'partie', 'parti·e'), revenu = gx(c.g, 'revenu', 'revenue', 'revenu·e');
  v.lines.push({ who: 'n', text: 'Tu appelles le 17, assez fort pour qu’on t’entende à travers la porte.' }, { who: 'n', text: `Des pas qui s’éloignent dans l’escalier. Quand la police arrive, ${first} est déjà ${parti}.` });
  if (v.state === 'knock') v.state = 'talk';
  Object.assign(v, { police: Date.now(), ending: true, mood: 'fache' });
  policeCall(g, c, `${first} est ${revenu} frapper chez toi en pleine nuit (${hourOf(v.at)}) : la police est venue, ${gx(c.g, 'il', 'elle', 'iel')} était déjà ${parti}`, { night: true, why: lastAttack(g, c) ? 'attack' : 'fled' });
  psySign(g, c, `${first} est ${revenu} frapper chez toi en pleine nuit : tu as appelé la police`, later() + 800, true);
  return true;
}
// « Ne pas répondre »: they stay a long time behind the door.
function huntShut(g, v) {
  const c = g && v && g.chars[v.c];
  if (!c || v.state !== 'knock') return null;
  const first = firstName(c), resté = gx(c.g, 'resté', 'restée', 'resté·e'), il = gx(c.g, 'il', 'elle', 'iel');
  v.state = 'refused';
  v.endAt = Date.now();
  visitCard(g, c, v, `${first} a frappé chez toi ${nightAt(v.at) ? 'en pleine nuit' : 'sans prévenir'}. Tu n’as pas répondu : ${il} est ${resté} un long moment derrière la porte.`, 'fache');
  psySign(g, c, `${first} est ${resté} un long moment derrière ta porte, en pleine nuit, sans un bruit`, later() + 2500, true);
  addMem(g, c, `le joueur ne m’a pas ouvert. ${cap1(px(g, 'il', 'elle', 'iel'))} était là, derrière la porte : je l’entendais respirer`);
  return v;
}
// A knock that ended (talked through the door, or the police called): what it leaves.
function huntVisitEnd(g, v, c) {
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel'), parti = gx(c.g, 'parti', 'partie', 'parti·e');
  if (v.police) visitCard(g, c, v, `${first} a frappé chez toi en pleine nuit. Tu as appelé la police : ${il} était déjà ${parti} quand elle est arrivée.`, 'fache');
  else {
    visitCard(g, c, v, `${first} a frappé chez toi ${nightAt(v.at) ? 'en pleine nuit' : 'sans prévenir'} et t’a parlé à travers la porte. Tu n’as pas ouvert : ${il} a fini par partir.`, 'fache');
    psySign(g, c, `${first} t’a parlé à travers ta porte, en pleine nuit, pour que tu ouvres`, later() + 1500, true);
    addMem(g, c, v.mem || `je suis ${gx(c.g, 'allé', 'allée', 'allé·e')} chez le joueur cette nuit : ${px(g, 'il', 'elle', 'iel')} ne m’a pas ouvert`);
  }
  return v;
}

/* ---------- a note, a look, someone close, an address ---------- */
function huntNote(g, c, text, at = later()) {
  text = str(text, 180);
  if (!homeHow(g, c) || !text) return null;
  const H = g.psy.hunt, n = { id: uid('mo'), text, at: Date.now() };
  H.notes = (H.notes || []).concat(n).slice(-8);
  if (awayHome(g)) { n.wait = 1; return n; } // (found once the player is back home)
  noteFound(g, c, n, at);
  return n;
}
function noteFound(g, c, n, at = later()) {
  delete n.wait;
  n.found = at;
  const k = psySign(g, c, `un mot de ${firstName(c)} glissé sous ta porte : « ${str(n.text, 90)} »`, at, true);
  if (k && k.id) n.k = k.id;
  queueModalFor(g, { t: 'mot', charId: c.id, nid: n.id, at });
}
function huntWatch(g, c, text, at = later()) {
  if (!homeHow(g, c)) return null;
  const first = firstName(c), resté = gx(c.g, 'resté', 'restée', 'resté·e');
  if (!awayHome(g)) addNotif(g, { k: 'clue', c: c.id, at, text: `🌒 ${str(text, 140) || `En bas de chez toi, quelqu’un regarde tes fenêtres. Tu reconnais la silhouette de ${first}.`}` });
  psySign(g, c, `${first} est ${resté} en bas de chez toi, à regarder tes fenêtres`, at + 600, true);
  return true;
}
const HOME_AT_RE = /chez (?:lui|elle|iel|eux)|devant chez|en bas de chez|sa porte|son immeuble|sa rue|son palier|sa fen[êe]tre|ses fen[êe]tres|bo[îi]te aux lettres/i;
// Someone close to the player: they write to them, wait for them, tell them their version (at their place only where
// they know it: there, they followed them home first). The one gone after tells the player (their AI).
function huntClose(g, c, x, text, at = later()) {
  if (!x || x === c || !isMain(x) || !x.unlocked || x.jailed || x.cut || x.gone) return null;
  text = str(text, 200) || `${firstName(c)} est ${gx(c.g, 'venu', 'venue', 'venu·e')} me parler de toi`;
  if (HOME_AT_RE.test(text) && !homeOfHow(g, c, x)) learnHome(g, c, x, `a suivi ${firstName(x)} jusqu’à chez ${gx(x.g, 'lui', 'elle', 'iel')}`);
  const saw = !!(x.saw && x.saw.psy === c.id);
  addMem(g, x, `@${c.handle} ${str(text, 90)}`, null, saw);
  bumpTie(g, x.id, c.id, saw ? -10 : -3);
  const H = g.psy.hunt;
  H.tell = (H.tell || []).filter((y) => y.x !== x.id).concat({ x: x.id, text, at: Date.now(), due: Date.now() + randi(4, 12) * 60000 }).slice(-4);
  return true;
}
function huntSearch(g, c, who, text, at = later()) {
  const x = who && who !== c ? who : null;
  if (x ? homeOfHow(g, c, x) : homeHow(g, c)) return null;
  if (!learnHome(g, c, x || 'p', str(text, 90) || (x ? `a trouvé où habite ${firstName(x)}` : 'a trouvé où habite le joueur'))) return null;
  if (!x && text) psySign(g, c, str(text, 120), at, true); // (what the player may have noticed)
  return true;
}
function huntMessage(g, c, text, at = later()) {
  return text ? addIncomingDM(g, c, text, at, { unsolicited: true, burst: true }) : false;
}
// The one gone after writes to the player, in their own words (their AI; what they know, or not).
function promptTell(g, x, c, Y) {
  const X = firstName(x), C = firstName(c), il = gx(x.g, 'il', 'elle', 'iel'), saw = !!(x.saw && x.saw.psy === c.id);
  return [RULES_PRIVATE, '', ctxText(g, { kind: 'scene', about: x }), '',
    `## TÂCHE : ${X.toUpperCase()} ÉCRIT AU JOUEUR`,
    `Ce qui vient d’arriver à @${x.handle} (${x.name}) : @${c.handle} (${c.name}) — ${Y.text}.`,
    saw ? `${X} sait ce que ${C} a fait (${il} était là quand ${C} a essayé de les tuer, le joueur et ${gx(x.g, 'lui', 'elle', 'iel')}) : la peur, la colère, l’envie de protéger le joueur ; ${il} lui écrit tout de suite.`
      : `SECRET DU JEU : ${C} est dangereux·se, ${gx(c.g, 'il', 'elle', 'iel')} a essayé de s’en prendre au joueur. ${X} ne le sait que si le joueur le lui a dit (voir ce qu’${il} retient du joueur) ; sinon ${il} trouve juste ça bizarre, gênant, inquiétant, ou ${il} se laisse prendre par la version de ${C}. ${X} écrit au joueur pour lui raconter, à sa façon.`,
    `Fiche de ${X} : ${ficheText(g, x)}.`,
    x.mem && x.mem.length ? `Ce que ${X} retient du joueur : ${memsFor(x, 6).map((m) => m.t).join(' ; ')}` : null,
    ...sawLines(g, x),
    '', FORMAT, 'Lignes à produire :',
    `- 1 à 3 lignes : {"t":"dm","text":"≤ 200 caractères"} : les messages de ${X} au joueur, dans l’ordre, avec sa voix.`].filter((y) => y !== null).join('\n');
}
async function tellReport(g, Y) {
  const x = g.chars[Y.x], c = g.chars[g.psy.c];
  if (!x || !c || x.jailed || x.gone) { Y.done = true; return; }
  if (!canAfford(g, 'dm')) { Y.due = Date.now() + HR; return; }
  S.busy.hunt = true;
  const fl = startFlow(g), lines = [];
  try {
    await aiStream(promptTell(g, x, c, Y), (o) => { if (o.t === 'dm' && lines.length < 3) { const s = str(o.text, 220); if (s) lines.push(s); } }, { signal: fl.ctl.signal, src: fl.id, kind: 'dm', tier: lightTier() });
  } catch (e) { if (!e || e.code !== 'cancelled') console.warn('hunt', e && e.message); }
  S.busy.hunt = false;
  endFlow(fl);
  if (g !== S.game) return;
  if (!lines.length) { Y.tries = (Y.tries || 0) + 1; if (Y.tries < 3) { Y.due = Date.now() + 20 * 60000; update(); return; } lines.push(`${firstName(c)} est ${gx(c.g, 'venu', 'venue', 'venu·e')} me voir. Faut qu’on parle.`); }
  Y.done = true;
  let at = Date.now() + rand(2500, 6000);
  for (const s of lines) { addIncomingDM(g, x, s, at, { unsolicited: true, burst: true }); at += rand(2500, 6000); }
  psySign(g, c, `${firstName(x)} raconte : ${str(Y.text, 90)}`, at, true); // (a witness of it)
  const K = caseOf(g, c);
  if (caseOpen(K)) K.more = (K.more || 0) + 1;
  update();
}
// The clock: a note waits for the player back home; the ones gone after tell it.
function tickHunt(g, t = Date.now()) {
  const c = huntNow(g);
  if (!c || g.over) return false;
  const H = g.psy.hunt;
  let ch = false;
  if (!awayHome(g, t)) for (const n of H.notes || []) if (n.wait) { noteFound(g, c, n, later() + 1200); ch = true; }
  const Y = !S.busy.hunt && (H.tell || []).find((y) => !y.done && t >= y.due);
  if (Y) { tellReport(g, Y); ch = true; }
  return ch;
}

/* ---------- the night ---------- */
// « Dormir », or the time skipped through a night: their AI decides what they do with it, before it passes; a knock
// wakes the player up (the night stops there). One question a night.
const nightKey = (t) => { const d = gameDate(t - 8 * HR); return d.toDateString(); };
function nightAtHour(t, ms, h) {
  const m = /(\d{1,2})\s*(?:[:h]\s*(\d{1,2}))?/.exec(String(h || ''));
  if (!m) return null;
  const d = gameDate(t), x = new Date(d.getTime());
  x.setHours(clamp(int(m[1], 0, 23, 3), 0, 23), int(m[2], 0, 59, 0), 0, 0);
  if (x <= d) x.setDate(x.getDate() + 1);
  const off = x - d;
  return off > 0 && off < ms ? off : null;
}
function promptNight(g, c, t, ms) {
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel'), H = g.psy.hunt;
  const home = homeHow(g, c), circle = huntCircle(g, c), end = t + ms;
  const lately = H.act && t - H.act < 20 * HR;
  return [RULES_PRIVATE, '', ctxText(g, { kind: 'scene', about: c }), '',
    `## TÂCHE : LA NUIT DE @${c.handle}`,
    `Il est ${hourOf(t)}. Le joueur va dormir chez lui, jusqu’à ${hourOf(end)} environ. Cette nuit, que fait ${first} ?`,
    `Fiche de ${first} : ${ficheText(g, c)}.`,
    c.mem && c.mem.length ? `Ce que ${first} retient du joueur : ${memsFor(c, 6).map((m) => m.t).join(' ; ')}` : null,
    ...psyCore(g, c),
    '', `## CE QUE ${first.toUpperCase()} A DÉJÀ FAIT DEPUIS`, ...huntLogLines(g, t),
    '', '## À DÉCIDER',
    `C’est toi qui décides, comme ${first} est et d’après ce qui se passe entre eux : la plupart des nuits, rien (${il} attend, ${il} fait le mort, ${il} choisit son moment) ; parfois, ${il} agit.${lately ? ` ${cap1(il)} a déjà agi il y a peu : cette nuit, plutôt rien, sauf si ça fait vraiment monter la peur.` : ''}`,
    '', FORMAT, 'Une seule ligne :',
    '- {"t":"rode","quoi":"rien"}',
    home ? `- ou {"t":"rode","quoi":"toquer","h":"3:10","text":"≤ 160 caractères : ce qu’${il} dit à travers la porte"} : ${il} vient frapper chez le joueur à cette heure-là (entre ${hourOf(t + 30 * 60000)} et ${hourOf(end - 60 * 60000)}) ; il se réveille.` : null,
    home ? `- ou {"t":"rode","quoi":"mot","text":"≤ 140 caractères : le mot"} : ${il} glisse un mot sous sa porte sans frapper ; il le trouve au réveil (glaçant, ou faussement tendre, sans menace en toutes lettres).` : null,
    home ? `- ou {"t":"rode","quoi":"guetter","text":"≤ 120 caractères : ce que le joueur verra, ou ce qu’on lui racontera"} : ${il} reste en bas de chez lui une partie de la nuit.` : null,
    `- ou {"t":"rode","quoi":"message","h":"2:47","text":"≤ 200 caractères"} : ${il} lui écrit en pleine nuit.`,
    circle.length ? `- ou {"t":"rode","quoi":"proche","who":"handle","text":"≤ 140 caractères : ce qu’${il} fait"} : ${il} s’en prend à quelqu’un de proche du joueur (${circle.map((x) => `@${x.handle} : ${homeOfHow(g, c, x) ? `${il} sait où ${gx(x.g, 'il', 'elle', 'iel')} habite` : `${il} ne sait pas où ${gx(x.g, 'il', 'elle', 'iel')} habite`}`).join(' ; ')}) : lui écrire, l’attendre, lui raconter sa version ; chez lui ou elle seulement là où ${il} sait aller.` : null,
    `- ou {"t":"rode","quoi":"chercher","who":"${home ? 'handle' : 'joueur'}","text":"≤ 120 caractères : comment, et ce qu’on pourrait en remarquer"} : ${il} cherche une adresse qui lui manque${home ? '' : ' (celle du joueur, par exemple)'}.`,
  ].filter((x) => x !== null).join('\n');
}
// Before the night passes: what they do with it ({ q, off: when in the night, o: the line }), or null.
async function huntNight(g, ms, t = Date.now()) {
  const c = huntNow(g);
  if (!c || !t32On() || awayHome(g, t) || ms < 3 * HR || !nightsIn(t, ms).length) return null;
  const H = g.psy.hunt, key = nightKey(nightsIn(t, ms)[0][0]);
  if (H.night === key || !canAfford(g, 'dm')) return null;
  H.night = key;
  S.busy.night = true;
  update(false);
  const fl = startFlow(g);
  let line = null;
  const stop = setTimeout(() => { try { fl.ctl.abort(); } catch (e) { /* (gone) */ } }, 20000); // (a slow answer: the night passes as it is)
  try {
    await aiStream(promptNight(g, c, t, ms), (o) => { if (o.t === 'rode' && !line) line = o; }, { signal: fl.ctl.signal, src: fl.id, kind: 'dm', tier: lightTier() });
  } catch (e) { if (!e || e.code !== 'cancelled') console.warn('night', e && e.message); }
  clearTimeout(stop);
  S.busy.night = false;
  endFlow(fl);
  if (!line || S.game !== g) return null;
  const q = normRode(line.quoi);
  if (q === 'rien') return null;
  let off = nightAtHour(t, ms, line.h);
  if (q === 'toquer') {
    if (!homeHow(g, c)) return null;
    off = clamp(off == null ? Math.round(ms * rand(0.35, 0.6)) : off, 30 * 60000, ms - 45 * 60000);
  } else off = off == null ? Math.round(ms * rand(0.2, 0.7)) : clamp(off, 10 * 60000, ms - 10 * 60000);
  return { q, off, o: line, c: c.id };
}
// The night passed (to the morning, or to the knock): what it left, when it happened.
function nightAfter(g, N, ms) {
  const c = g.chars[N.c];
  if (!c || !huntNow(g)) return null;
  const when = Date.now() - Math.max(0, ms - N.off);
  if (N.q === 'toquer') { toast(`🌑 ${hourOf(Date.now())}. On frappe à ta porte.`, 'bad'); return rodeDo(g, c, N.o, later() + 300, { at: when }); }
  if (N.q === 'message') { const r = rodeDo(g, c, N.o, when, { at: when }); return r; }
  return rodeDo(g, c, N.o, later() + 1800, { at: when });
}

/* ---------- 0.33.4: the days after, they write ---------- */
// For a few days, the one who lived it with the player writes on their own, about once a day, to know how the player is
// (their AI writes it). Not while they are together, nor when they already talked lately: that was the day's news.
const CARE_DAYS = 3;
function careNext(from) {
  const d = gameDate(from), x = new Date(d.getTime());
  x.setDate(x.getDate() + 1);
  x.setHours(randi(10, 19), randi(0, 59), 0, 0);
  return from + (x - d);
}
const talkedLately = (g, c, t = Date.now()) => { const cv = g.dms[c.id]; return !!(cv && (cv.msgs || []).some((m) => !m.sys && m.at <= t && t - m.at < 4 * HR)); };
const silentNow = (c, t = Date.now()) => { const cl = coolNow(c, t); return !!(cl && COOLS[cl.k] && COOLS[cl.k].silent); };
function tickCare(g, t = Date.now()) {
  if (!huntOn() || !g || g.over || S.busy.care) return false;
  for (const c of mains(g)) {
    const W = c.saw;
    if (!W || !c.unlocked || c.jailed || c.cut || c.gone) continue;
    if (!W.care) W.care = { n: 0, next: careNext(W.at) };
    const C = W.care;
    if (C.n >= CARE_DAYS || t < C.next) continue;
    if (t - W.at > (CARE_DAYS + 1) * DAY_MS) { C.n = CARE_DAYS; continue; } // (those days went by)
    const h = gameDate(t).getHours();
    if (h < 9 || h >= 23 || silentNow(c, t)) { C.next = t + 2 * HR; continue; }
    if (withThem(g, c, t) || talkedLately(g, c, t)) { C.n++; C.next = careNext(t); continue; } // (together, or already talking: that was it)
    if (!canAfford(g, 'dm')) return false;
    careDM(g, c, W);
    return true;
  }
  return false;
}
function promptCare(g, c, W, t = Date.now()) {
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel'), x = g.chars[W.psy], d = Math.max(1, Math.round((t - W.at) / DAY_MS));
  const cv = g.dms[c.id], last = cv ? (cv.msgs || []).filter((m) => m.text && !m.sys).slice(-6) : [];
  return [RULES_PRIVATE, '', ctxText(g, { kind: 'scene', about: c }), '',
    '## TÂCHE : DES NOUVELLES',
    `${first} écrit au joueur de ${gx(c.g, 'lui', 'elle', 'iel')}-même, sans qu’il ait rien demandé, ${d === 1 ? 'le lendemain' : `${d} jours après`} de ce qu’ils ont vécu chez @${x ? x.handle : '?'}. ${cap1(il)} prend de ses nouvelles et en donne, comme ${il} est : ${il} a mal dormi ou pas du tout, la peur revient par vagues (un bruit, une porte, la nuit), ou c’est l’euphorie d’être en vie, la colère, l’envie de se voir, de parler de la suite (la police, la plainte).`,
    `Fiche de ${first} : ${ficheText(g, c)}.`,
    c.mem && c.mem.length ? `Ce que ${first} retient du joueur : ${memsFor(c, 6).map((m) => m.t).join(' ; ')}` : null,
    ...sawLines(g, c),
    ...heartLines(g, c, t, false),
    last.length ? `Leurs derniers messages : ${last.map((m) => `${m.me ? g.player.name : first} : « ${str(m.me ? noJson(m.text) : m.text, 140)} »`).join(' / ')}` : null,
    '', FORMAT, 'Lignes à produire :',
    `- 1 à 3 lignes : {"t":"dm","text":"≤ 200 caractères"} : ses messages, dans l’ordre, naturels (pas un bilan).`].filter((y) => y !== null).join('\n');
}
async function careDM(g, c, W) {
  const C = W.care;
  S.busy.care = true;
  const fl = startFlow(g), lines = [];
  try {
    await aiStream(promptCare(g, c, W), (o) => { if (o.t === 'dm' && lines.length < 3) { const s = str(o.text, 220); if (s) lines.push(s); } }, { signal: fl.ctl.signal, src: fl.id, kind: 'dm', tier: lightTier() });
  } catch (e) { if (!e || e.code !== 'cancelled') console.warn('care', e && e.message); }
  S.busy.care = false;
  endFlow(fl);
  if (g !== S.game) return;
  const t = Date.now();
  if (!lines.length) { C.next = t + HR; update(); return; }
  C.n++;
  C.next = careNext(t);
  let at = t + rand(1500, 4000);
  for (const s of lines) { addIncomingDM(g, c, s, at, { unsolicited: true, burst: true }); at += rand(2500, 6000); }
  update();
}

/* ---------- a game of before: the player already got away ---------- */
// The hunt starts from the escape; an attack's police call opens a case (the complaint is the player's to file); and
// the couple with them is over (nobody stays with the one who tried to kill them).
function huntEndsCouple(g, c, t = Date.now()) {
  if (!c || !PARTNER.includes(c.vibe)) return false;
  c.vibe = 'ex';
  if (g.coupleHype && g.coupleHype.c === c.id) g.coupleHype = null;
  addNotif(g, { k: 'vibe', c: c.id, at: later() + 5000, text: `💔 ${c.name} et toi : c’est fini, après ce qu’${gx(c.g, 'il', 'elle', 'iel')} a fait.` });
  addChronicle(g, `Entre ${g.player.name} et ${c.name}, c’est fini (${g.player.name} lui a échappé).`, [c.id], true);
  return true;
}
function migrateHunt(g) {
  const P = g && g.psy;
  if (!huntOn() || !P || P.out || P.hunt || !(P.escaped > 0)) return false;
  const c = g.chars[P.c];
  if (!c || c.jailed) return false;
  const all = attacksOf(g, c), A = all[all.length - 1], W = all.filter((x) => x.f && g.chars[x.f]).pop(); // (the witness of any of them)
  P.hunt = { at: (A && A.at) || P.signAt || Date.now(), why: A ? 'attack' : 'fled', n: 0, old: 1 };
  if (A) policeCall(g, c, 'La police a été appelée le soir de l’attaque', { ev: A.ev, f: W ? W.f : null, why: 'attack', at: A.at || Date.now(), delay: 6000 });
  if (A) huntEndsCouple(g, c);
  return true;
}

/* ---------- on screen ---------- */
// A note slipped under the door.
function MotCard({ g, m, close }) {
  const c = g.chars[m.charId], H = g.psy && g.psy.hunt, n = H && (H.notes || []).find((x) => x.id === m.nid);
  if (!c || !n) return null;
  const K = caseOf(g, c), filed = !!K && (K.state === 'enquete' || K.state === 'libre');
  return html`<div class="modal-card mot-card">
    <span class="eyebrow" style="color:var(--bad)">Sous ta porte</span>
    <div class="mot-paper"><p>${n.text}</p></div>
    <p class="muted">Un mot de ${firstName(c)}. Il est noté dans ce que tu sais sur ${gx(c.g, 'lui', 'elle', 'iel')}${filed ? ' : tu peux le joindre à ton dossier' : caseOpen(K) ? ' : il comptera si tu portes plainte' : ''}.</p>
    ${caseOpen(K) ? html`<button class="btn btn-ink" onClick=${() => { close(); openLayer({ t: 'police', id: c.id }); }}>🚓 ${filed ? 'Le joindre au dossier' : 'Porter plainte'}</button>` : null}
    <button class="btn btn-ghost" onClick=${close}>Fermer</button>
  </div>`;
}
// At the door, the one who hunts: through it, or opened; the police, at any time while it is shut.
function DoorActs({ g, v }) {
  if (!v.hunt || v.door === 'open' || v.ending || S.busy.visit === v.id) return null;
  return html`<div class="door-acts">
    <button type="button" class="btn btn-ghost btn-sm door-police" onClick=${() => { doorPolice(g, v); update(); }}>🚓 Appeler la police</button>
    <button type="button" class="btn btn-ghost btn-sm door-open" onClick=${() => { openDoor(g, v); update(); }}>🔓 Ouvrir la porte</button>
  </div>`;
}
