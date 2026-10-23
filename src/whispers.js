/* =========================================================
   Word of mouth (0.13): the characters live among themselves.
   They have ties to each other (close friends, people who cannot stand each other), written by the AI with them and
   changing with the story; the AI is told, so they act on them in public. And what they hear about the player travels
   from one to the next, along friendships and by temperament: the troubled, the envious and the opportunists talk,
   the loyal and the principled keep it (and may warn the player). Where it lands decides: an enemy of the player turns
   it into a rumor or a dig, the one it is about takes it badly, a friend warns the player, some find it funny, and
   good things said about the player open doors. Nothing is shown as such: it is in their memories, their messages,
   their posts, and in what happens.
   ========================================================= */
const tieKey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
function tieOf(g, a, b) { if (!g || !a || !b || a === b) return 0; const v = (g.ties || {})[tieKey(a, b)]; return typeof v === 'number' ? v : 0; }
function setTie(g, a, b, v) { if (!g || !a || !b || a === b) return; if (!g.ties) g.ties = {}; g.ties[tieKey(a, b)] = clamp(Math.round(v), -100, 100); }
const bumpTie = (g, a, b, d) => setTie(g, a, b, tieOf(g, a, b) + d);
const tiePhrase = (v, gd, who) => (v >= 60 ? `inséparable de ${who}` : v >= 35 ? `proche de ${who}` : v >= 15 ? `s’entend bien avec ${who}` : v <= -60 ? `${gx(gd, 'ennemi juré', 'ennemie jurée', 'ennemi·e juré·e')} de ${who}` : v <= -35 ? `ne supporte pas ${who}` : v <= -15 ? `en froid avec ${who}` : '');
// From the AI lines that create them ("proches", "ennemis": handles of the cast), their confidant, and for the rest a
// little something (always the same for a pair of handles).
function initHeartTies(c, o = {}) {
  const hs = (x) => (Array.isArray(x) ? x : typeof x === 'string' ? x.split(/[,;]/) : []).map((h) => normHandle(h)).filter(Boolean).slice(0, 3);
  const p = hs(o.proches), e = hs(o.ennemis);
  if (p.length) c.prochesH = p;
  if (e.length) c.ennemisH = e;
}
function initTies(g) {
  const ms = mains(g, false);
  if (!g.ties || typeof g.ties !== 'object') g.ties = {};
  for (const c of ms) {
    for (const h of c.prochesH || []) { const o = charByHandle(g, h); if (o && o !== c && isMain(o)) setTie(g, c.id, o.id, Math.max(tieOf(g, c.id, o.id), 45)); }
    for (const h of c.ennemisH || []) { const o = charByHandle(g, h); if (o && o !== c && isMain(o)) setTie(g, c.id, o.id, Math.min(tieOf(g, c.id, o.id), -45)); }
    delete c.prochesH;
    delete c.ennemisH;
    const a = c.amiH ? charByHandle(g, c.amiH) : c.ami ? g.chars[c.ami] : null;
    if (a && a !== c && isMain(a)) setTie(g, c.id, a.id, Math.max(tieOf(g, c.id, a.id), 55));
  }
  for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) {
    const k = tieKey(ms[i].id, ms[j].id);
    if (typeof g.ties[k] !== 'number') g.ties[k] = (hashStr(ms[i].handle + '~' + ms[j].handle) % 41) - 20;
  }
  if (!Array.isArray(g.whispers)) g.whispers = [];
}
// The ties worth telling (the strongest first).
function tiesOf(g, c, min = 15) {
  return mains(g).filter((o) => o !== c).map((o) => ({ o, v: tieOf(g, c.id, o.id) })).filter((x) => Math.abs(x.v) >= min).sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
}
// A line of a refresh: two characters grow closer, or fall out.
function applyTieLine(g, o) {
  const a = charByHandle(g, normHandle(o.a)), b = charByHandle(g, normHandle(o.b));
  if (!a || !b || a === b || !isMain(a) || !isMain(b)) return false;
  bumpTie(g, a.id, b.id, int(o.d, -12, 12, 0));
  return true;
}

/* ---------- 0.15: getting close to someone annoys the people who cannot stand them ---------- */
// The nice player has conflicts too: a new close friend, a couple, a video together, standing by someone… and whoever
// cannot stand that person takes it badly (a little colder, a dig in public, or a jealous word in private for a friend of
// the player), and stays wary while the player is close to them. The ties stay hidden: only what happens shows.
const FOE_TIE = -35;
const foesOf = (g, c) => mains(g).filter((o) => o !== c && tieOf(g, c.id, o.id) <= FOE_TIE);
const closeToFoe = (g, e) => mains(g).some((o) => o !== e && tieOf(g, e.id, o.id) <= FOE_TIE && (o.rel >= 45 || PARTNER.includes(o.vibe)));
// how: 'close' (a bond), 'public' (a couple announced, a video together, a public defence: it hits harder)
function foesNotice(g, c, how = 'close', at = later()) {
  if (!g || !c || !isMain(c)) return 0;
  const t = Date.now(), first = firstName(c);
  let n = 0;
  for (const e of foesOf(g, c).sort((a, b) => tieOf(g, c.id, a.id) - tieOf(g, c.id, b.id)).slice(0, 2)) {
    e.foeSeen = e.foeSeen || {};
    if (t - (e.foeSeen[c.id] || 0) < 48 * HR) continue; // once in two days for the same two people
    e.foeSeen[c.id] = t;
    const d = Math.round((tieOf(g, c.id, e.id) <= -60 ? 6 : 4) * (how === 'public' ? 1.5 : 1)), il = gx(e.g, 'il', 'elle', 'iel');
    applyRel(g, e, -d, 'n’apprécie pas tes nouvelles fréquentations', at + 2500 + n * 900, 10);
    addMem(g, e, `le joueur s’affiche avec ${first}`);
    addTrigger(g, e.rel >= 25
      ? `@${e.handle}, proche du joueur, ne supporte pas @${c.handle} et le voit s’en rapprocher : ${il} le lui dit en privé, à sa façon (jalousie, mise en garde, déception), sans forcément tout expliquer.`
      : `@${e.handle} ne supporte pas @${c.handle} et voit le joueur s’en rapprocher : ${il} le lui fait sentir (une pique en public ou un message froid), sans tout expliquer.`, e.id);
    n++;
  }
  return n;
}

/* ---------- what is said about the player, passed from one to the next ---------- */
// The chattiest pass it on; the loyal keep it to themselves.
const TALKS = { trouble: 0.7, envieux: 0.65, opportuniste: 0.6, inquiet: 0.5, detache: 0.4, integre: 0.3, fidele: 0.25 };
const talks = (c) => Math.min(0.85, (TALKS[temperOf(c)] || 0.4) + ((t32On() && { dramatique: 0.15, paisible: -0.1 }[clashOf(c)]) || 0)); // (0.32: the dramatic talk more)
// text: about the player, in the third person (« pose des lapins »); about: a character it concerns (it may reach them).
// love (0.22.2): the character the player has something with, that whoever hears it learns of; soon: told within hours.
function addWhisper(g, from, text, o = {}) {
  const c = typeof from === 'object' ? from : g.chars[from];
  text = str(text, 140);
  if (!g || !c || !isMain(c) || !text) return null;
  const t = Date.now();
  if ((g.whispers || []).some((w) => w.state === 'live' && w.text === text)) return null;
  const w = { id: uid('wh'), text, tone: ['bad', 'good', 'funny'].includes(o.tone) ? o.tone : 'bad', about: o.about || null, src: c.id, heard: [c.id], at: t, next: t + (o.now ? 0 : (o.soon ? rand(1, 6) : rand(3, 8)) * HR), hops: 0, state: 'live', seed: o.seed || '' };
  if (o.love) w.love = o.love;
  g.whispers = (g.whispers || []).filter((x) => x.state === 'live' || t - x.at < 7 * 24 * HR).concat(w).slice(-24);
  return w;
}
const isFoe = (g, c) => c.vibe === 'nemesis' || c.rel <= -30 || (temperOf(c) === 'envieux' && c.rel < 0);
const guards = (c) => c.rel >= 50 && (temperOf(c) === 'fidele' || temperOf(c) === 'integre');
function warnPlayer(g, c, w) {
  const at = later() + randi(4000, 12000);
  const said = `« il paraît que @${g.player.handle} ${w.text} »`; // (what is said, as it is said: in the third person)
  addIncomingDM(g, c, pick([`hey… ça circule à ton sujet : ${said}. je préfère te le dire avant que ça tourne.`, `fais gaffe, j’ai entendu ça : ${said}. c’est vrai ?`, `je te préviens, entre nous : ${said}. je n’y crois pas trop, mais ça circule.`]), at, { max: 360 });
  addMem(g, c, `j’ai prévenu le joueur de ce qui se dit sur lui`);
}
// It reaches someone: what they do with it.
function hear(g, w, teller, to) {
  w.heard.push(to.id);
  w.hops += 1;
  bumpTie(g, teller.id, to.id, 2); // a secret shared brings closer
  const tf = firstName(teller), il = gx(to.g, 'il', 'elle', 'iel'), lui = gx(to.g, 'lui', 'elle', 'iel');
  // 0.17: they know who told them; the player does not (unless someone says it, in public or in private)
  addMem(g, to, `${tf} m’a dit que le joueur ${w.text}`, `on m’a dit que le joueur ${w.text}`);
  const lc = w.love && w.love !== to.id ? g.chars[w.love] : null;
  if (lc) { // 0.22.2: they know now what there is between the player and lc; it hurts the ones who have feelings for the player
    learnLove(g, to, lc);
    if (w.about !== to.id && LOVE_ACTIVE.includes(to.vibe)) {
      const partner = PARTNER.includes(to.vibe), lf = firstName(lc);
      applyRel(g, to, partner ? -12 : -5, `on lui a parlé de toi et ${lf}`, later() + 2000, partner ? 20 : 8);
      addTrigger(g, `@${to.handle} a appris par @${teller.handle} que le joueur ${w.text} : ça lui fait quelque chose (jalousie, tristesse, colère, ou ${il} fait comme si de rien n’était, selon son caractère), sans forcément dire qui le lui a dit.`, to.id);
      if (partner && !coolNow(to)) startCool(g, to, 'colere', `toi et ${lf}`, `ce qu’on lui a raconté : le joueur ${str(w.text, 70)}`);
      return 'jealous';
    }
  }
  if (w.about && w.about === to.id) { // the one it is about
    const why = w.seed === 'cheat' ? 'on lui a parlé de ton rendez-vous avec quelqu’un d’autre' : w.seed === 'intel' ? `on lui a répété ce que tu as écrit sur ${lui}` : 'on lui a répété ce qui se dit sur toi';
    applyRel(g, to, w.seed === 'cheat' && PARTNER.includes(to.vibe) ? -18 : -12, why, later() + 2000, 20);
    applyTrust(g, to, -6, why, later() + 2400);
    addTrigger(g, `@${to.handle} a appris par @${teller.handle} que le joueur ${w.text} : ${il} le prend très mal (en privé, ou en public selon son caractère), sans forcément dire qui le lui a dit.`, to.id);
    if (w.seed === 'cheat' && PARTNER.includes(to.vibe) && !coolNow(to)) startCool(g, to, 'colere', 'un rendez-vous avec quelqu’un d’autre', `ce qu’on lui a raconté : le joueur ${str(w.text, 70)}`);
    w.state = 'done';
    return 'subject';
  }
  if (w.tone === 'bad' && isFoe(g, to)) { // an enemy uses it (and makes it bigger than it is)
    if (rumorSource(g).includes(to) && roll() < 0.6 && addRumor(g, to, `${w.text}, et ce n’est pas la première fois`, 2)) { w.state = 'done'; return 'rumor'; }
    addTrigger(g, `@${to.handle} a eu vent que le joueur ${w.text} : ${il} s’en sert pour lancer une pique en public (sans dire d’où ${il} le tient).`, to.id);
    return 'dig';
  }
  if (w.tone === 'bad') {
    if (to.rel > -20) applyRel(g, to, -3, `on lui a parlé de toi : « ${str(w.text, 50)}${w.text.length > 50 ? '…' : ''} »`, later() + 2500, 5);
    if (guards(to)) { warnPlayer(g, to, w); w.state = 'done'; return 'warned'; }
    return 'heard';
  }
  if (w.tone === 'good') { if (!w.love) applyRel(g, to, 3, 'on lui a dit du bien de toi', later() + 2500, 5); return 'good'; } // (a love story told: news, not praise)
  addTrigger(g, `Ça circule : le joueur ${w.text}. @${to.handle} en rit et le partage (une vanne, un mème, rien de méchant).`, to.id);
  return 'funny';
}
// The clock: every few hours, a whisper may go one step further (four at most, for four days).
function tickWhispers(g, t = Date.now()) {
  let ch = false;
  for (const w of g.whispers || []) {
    if (w.state !== 'live' || t < w.next) continue;
    w.next = t + rand(4, 9) * HR;
    if (w.hops >= 4 || t - w.at > 4 * 24 * HR) { w.state = 'done'; continue; }
    const teller = w.heard.map((id) => g.chars[id]).filter((c) => c && c.unlocked).sort((a, b) => talks(b) - talks(a))[0];
    if (!teller) { w.state = 'done'; continue; }
    if (w.tone === 'bad' && guards(teller)) { // a friend keeps it (and tells the player, when it came from someone else)
      if (teller.id !== w.src) warnPlayer(g, teller, w);
      w.state = 'done';
      ch = true;
      continue;
    }
    if (roll() > talks(teller)) continue; // not this time
    const pool = mains(g).filter((o) => o !== teller && !w.heard.includes(o.id));
    if (!pool.length) { w.state = 'done'; continue; }
    pool.sort((a, b) => tieOf(g, teller.id, b.id) - tieOf(g, teller.id, a.id)); // friends talk to friends
    const to = pool[Math.min(pool.length - 1, Math.floor(roll() * Math.min(3, pool.length)))];
    hear(g, w, teller, to);
    ch = true;
  }
  return ch;
}
// What a character has heard (for the prompts).
const heardOf = (g, c) => (g.whispers || []).filter((w) => w.heard.includes(c.id) && w.src !== c.id && Date.now() - w.at < 5 * 24 * HR).slice(-2);
function tieCtx(g, c) {
  const out = [];
  const ts = tiesOf(g, c, 25).slice(0, 3).map((x) => tiePhrase(x.v, c.g, '@' + x.o.handle)).filter(Boolean);
  if (ts.length) out.push('entre persos : ' + ts.join(', '));
  const hw = heardOf(g, c);
  if (hw.length) out.push('a entendu dire que le joueur ' + hw.map((w) => w.text).join(' ; '));
  return out;
}

/* ---------- where whispers come from ---------- */
// What the player wrote in private and someone kept (intel): it may travel, all the way to whoever it is about.
function whisperFromIntel(g, c, it) {
  if (!it || it.w < 2 || roll() > talks(c)) return null;
  const about = mentionedChars(g, it.quote).find((o) => o !== c) || null;
  return addWhisper(g, c, `a écrit en privé à ${firstName(c)} : « ${str(it.quote, 70)} »`, { tone: 'bad', about: about ? about.id : null, seed: 'intel' });
}
// A date that went one way or another: told around. 0.22.2: unless it was seen, this is the only way the others learn of
// it (a kiss too): from the one the player was with, by temperament, a few hours later, along friendships.
function whisperFromDate(g, ev, c) {
  if (!ev.played || meetKind(c, ev) !== 'love') return null;
  const first = firstName(c);
  const partner = mains(g).find((o) => o !== c && PARTNER.includes(o.vibe) && knowsOf(c, o)); // (a couple they know of)
  if (partner && roll() < 0.5) return addWhisper(g, c, `est avec @${partner.handle} mais a eu un rendez-vous avec @${c.handle}`, { tone: 'bad', about: partner.id, seed: 'cheat', love: c.id });
  if (ev.played.tier === 'flop' && roll() < 0.5) return addWhisper(g, c, `a raté son rendez-vous avec @${c.handle} de façon mémorable`, { tone: 'funny', seed: 'flop', love: c.id });
  const kiss = !!(ev.talk && (ev.talk.reacts || []).some((x) => x.g === 'bisou' && (x.r === 'charme' || x.r === 'amuse')));
  if ((kiss || ev.played.tier === 'top') && roll() < talks(c)) return addWhisper(g, c, kiss ? `a embrassé @${c.handle} pendant leur rendez-vous` : `a passé une soirée géniale avec @${c.handle}`, { tone: 'good', seed: kiss ? 'kiss' : 'top', love: c.id, soon: true });
  return null;
}
// (The ties are never shown to the player: they find out from what happens.)

/* ---------- 0.17: what the characters see the player do in public ----------
   A flirt in the comments, a clash, always under the same person's posts, a friend's post left without a word: the people
   it concerns see it (the one the player is seeing, the friends of whoever got hit, the friend left aside). It counts
   more when it is repeated, and when the player is well known; it fades after a few days. They have it in mind when
   they write. Once it is blatant, the AI is asked to have them react in their own way (tease, ask, sulk, or let it
   go): the game decides nothing, not even whether it is a crisis. */
const SEEN_HALF = 72 * HR; // half as present after three days
const SEEN_GAP = 48 * HR; // once they reacted to it, two days before the same thing again
const SEEN_NEED = { drague: 3, present: 3, clash: 1.5, ignore: 1 };
const seenFame = (g) => (g.stats.followers >= 100000 ? 1.5 : g.stats.followers >= 10000 ? 1.25 : 1);
const seenNow = (s, t = Date.now()) => s.n * Math.pow(0.5, Math.max(0, t - s.at) / SEEN_HALF);
// k: drague, present, clash or ignore; x: the other person (none for ignore); w: how much it shows.
function noteSeen(g, o, k, x, w, t = Date.now()) {
  if (!o || !isMain(o) || !o.unlocked || o.cut || !(w > 0)) return null;
  o.seen = (o.seen || []).filter((s) => seenNow(s, t) >= 0.15 || t - (s.told || 0) < SEEN_GAP);
  const xid = x ? x.id : null;
  let s = o.seen.find((y) => y.k === k && y.x === xid);
  if (!s) { s = { k, x: xid, n: 0, at: t, told: 0, times: 0 }; o.seen.push(s); }
  s.n = seenNow(s, t) + w;
  s.at = t;
  s.times += 1;
  if (o.seen.length > 6) o.seen.splice(0, o.seen.length - 6);
  return s;
}
// How blatant it has to be before they react: the one the player is with, the jealous and the anxious see it sooner.
function seenNeed(o, k) {
  let n = SEEN_NEED[k] || 3;
  if (k === 'drague' || k === 'present') {
    if (PARTNER.includes(o.vibe)) n *= 0.7;
    n *= { jaloux: 0.6, anxieux: 0.8, forteresse: 0.8, serein: 1.3, inaccessible: 1.4, possessif: 0.5, fusionnel: 0.7, volage: 1.8, libre: 2.2 }[o.coeur] || 1;
    if (isOpen(o)) n *= 1.8; // 0.32: open: it hardly bothers them
  }
  return n;
}
function seenCheck(g, o, s, x, t = Date.now()) {
  if (!s || seenNow(s, t) < seenNeed(o, s.k) || t - (s.told || 0) < SEEN_GAP) return false;
  const il = gx(o.g, 'il', 'elle', 'iel'), xh = x ? '@' + x.handle : '', lui = x ? gx(x.g, 'lui', 'elle', 'iel') : '';
  const V = VIBES[o.vibe], bond = V ? `(${V.label.toLowerCase()} avec le joueur)` : '(proche du joueur)';
  // (a trigger holds 240 characters: the AI knows their heart from their sheet)
  const T = {
    drague: [`j’ai vu le joueur draguer ${xh} en public`, `@${o.handle} ${bond} l’a vu draguer ${xh} en public${s.times >= 3 ? ', et pas qu’une fois' : ''}${PARTNER.includes(o.vibe) ? ' : ça compte' : ''}. ${cap1(il)} réagit à sa façon : une question, une pique, une taquinerie, bouder ou laisser couler. C’est son choix, pas forcément une crise.`],
    present: [`le joueur passe son temps dans les commentaires de ${xh}`, `@${o.handle} ${bond} remarque que le joueur est tout le temps dans les commentaires de ${xh} : ${il} réagit à sa façon (une remarque, une question, une pointe de jalousie, ou rien du tout).`],
    clash: [`le joueur s’en est pris à ${xh} en public`, `@${o.handle}, proche de ${xh}, a vu le joueur s’en prendre à ${lui} en public : ${il} réagit à sa façon (prendre sa défense en public, écrire au joueur, ou prendre ses distances).`],
    ignore: ['le joueur commente chez tout le monde sauf chez moi', `@${o.handle}, proche du joueur, remarque qu’il commente partout sauf sous son dernier post : ${il} réagit à sa façon (une taquinerie, une petite vexation, ou rien).`],
  }[s.k];
  if (!T || (s.k !== 'ignore' && !x)) return false;
  if ((s.k === 'drague' || s.k === 'present') && okWith(g, o, x)) return false; // 0.32: open, and fine with that one
  s.told = t;
  s.n = 0;
  addMem(g, o, T[0]);
  addTrigger(g, T[1], o.id);
  return true;
}
// After a post or a reply of the player, once the AI read it (its eval: flirt, kindness).
function witnessAct(ctx) {
  const g = ctx.g, e = ctx.eval;
  if (!g || !e) return;
  const t = Date.now(), tgt = [];
  const add = (c) => { if (c && isMain(c) && c.unlocked && !tgt.includes(c)) tgt.push(c); };
  if (ctx.kind === 'reply' && ctx.target) add(g.chars[charIdOf(ctx.targetReply ? ctx.targetReply.a : ctx.target.a)]);
  for (const c of ctx.men || []) add(c);
  const vis = (ctx.kind === 'post' ? 1.5 : 1) * seenFame(g);
  const lovers = mains(g).filter((o) => LOVE_ACTIVE.includes(o.vibe));
  const fw = e.flirtWith ? charByHandle(g, e.flirtWith) : null;
  const flirted = e.flirt >= 2 ? (fw && isMain(fw) && fw.unlocked ? fw : tgt[0] || null) : null;
  if (flirted) for (const o of lovers) if (o !== flirted) seenCheck(g, o, noteSeen(g, o, 'drague', flirted, (e.flirt - 1) * vis, t), flirted, t);
  for (const x of tgt) {
    if (x !== flirted) for (const o of lovers) if (o !== x) seenCheck(g, o, noteSeen(g, o, 'present', x, 0.5 * vis, t), x, t);
    if (e.kindness <= -3) for (const o of mains(g)) if (o !== x && tieOf(g, o.id, x.id) >= 35) seenCheck(g, o, noteSeen(g, o, 'clash', x, (e.kindness <= -4 ? 1.5 : 1) * vis, t), x, t);
  }
  if (ctx.kind === 'reply') ignoredFriends(g, ctx.target, t);
}
// A close friend posted, and the player comments everywhere else (four times at least) without a word for them.
function ignoredFriends(g, target, t = Date.now()) {
  for (const o of mains(g)) {
    if (o.rel < 55 || o.cut || (target && target.a === 'c:' + o.id)) continue;
    const p = g.posts.filter((q) => q.a === 'c:' + o.id && q.ts <= t && t - q.ts < 12 * HR).pop();
    if (!p || p.liked || p.replies.some((r) => r.a === 'p')) continue;
    const since = g.posts.reduce((n, q) => n + q.replies.filter((r) => r.a === 'p' && r.ts > p.ts).length, 0);
    if (since >= 4) seenCheck(g, o, noteSeen(g, o, 'ignore', null, 1, t), null, t);
  }
}
// What they saw lately, for the prompts (only what really shows).
function seenCtx(g, c, t = Date.now()) {
  const out = (c.seen || []).filter((s) => s.x && g.chars[s.x] && seenNow(s, t) >= 1).map((s) => {
    const xh = '@' + g.chars[s.x].handle;
    return s.k === 'drague' ? `le joueur drague ${xh} en public` : s.k === 'present' ? `le joueur est souvent dans les commentaires de ${xh}` : s.k === 'clash' ? `le joueur s’en est pris à ${xh} en public` : '';
  }).filter(Boolean);
  return out.length ? 'a vu passer : ' + out.join(', ') : '';
}
