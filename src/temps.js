/* =========================================================
   0.32: le temps qui passe. Every action takes its time (a message a few minutes, a post a quarter of an hour, a video
   a working day), the player's energy goes down through the day (faster at work) and comes back with sleep, the
   characters have lives of their own (they sleep, work, answer later, and their AI may step away; those it fits stay
   at hand), and the network lives on through the hours that pass, as after a skip.
   Loaded after romance.js: functions and constants only, nothing runs at load time.
   ========================================================= */
// The tests written before it play as they did (instant answers, no time taken), unless they ask for it.
const t32On = () => !window.__HYPE_TEST__ || !!window.__t32;

/* ---------- the player's energy ---------- */
// g.nrg: { e (0–100) at `at` (a timestamp the clock moves with the others), wake (when the player last woke up),
// night (the night already offered a bed), low (the waking already told of exhaustion) }.
const NRG_DRAIN = 5; // an hour awake: 100 → 0 in 20 h (tired after about 14 h up, exhausted after 17)
const NRG_WORK = 1.3; // a shoot, an edit, a stage of a production: more tiring
const NRG_SLEEP = 12.5; // an hour asleep (8 h: rested)
const NRG_NAP_MS = 90 * 60000, NRG_NAP = 25; // a nap: an hour and a half, a quarter of the bar
const NRG_REST_MS = 6 * 3600000; // the game closed this long: the player rested
const NRG_NIGHT_H = 8, NRG_NIGHT_MIN = 3 * 3600000; // a skip that takes in 3 h of the night (midnight to 8) or more: slept
const NRG_LEVELS = [ // from the top; malus: what a shoot made in that state loses
  { min: 60, id: 'forme', malus: 0 },
  { min: 30, id: 'ok', malus: 0 },
  { min: 15, id: 'fatigue', malus: 0.1 },
  { min: 0.5, id: 'epuise', malus: 0.25 },
  { min: -1, id: 'bout', malus: 0.4 },
];
const nrgLevel = (e) => NRG_LEVELS.find((L) => e >= L.min) || NRG_LEVELS[NRG_LEVELS.length - 1];
const NRG_WORD = { forme: () => 'En forme', ok: () => 'Ça va', fatigue: (g) => px(g, 'Fatigué', 'Fatiguée', 'Fatigué·e'), epuise: (g) => px(g, 'Épuisé', 'Épuisée', 'Épuisé·e'), bout: () => 'À bout' };
function nrgOf(g, t = Date.now()) {
  if (!g.nrg || typeof g.nrg.e !== 'number') g.nrg = { e: 100, at: t, wake: t }; // (a game from before: rested)
  return g.nrg;
}
const nrgNow = (g, t = Date.now()) => { const F = nrgOf(g, t); return clamp(F.e - NRG_DRAIN * Math.max(0, t - F.at) / 3600000, 0, 100); };
function nrgState(g, t = Date.now()) {
  const e = nrgNow(g, t), L = nrgLevel(e);
  return { e, pct: Math.round(e), id: L.id, malus: L.malus, label: NRG_WORD[L.id](g), up: Math.max(0, t - (nrgOf(g, t).wake || t)) };
}
// The nights in [t, t + ms] (midnight to 8 on the game's clock), each with 3 h of it or more: [[from, to], …].
function nightsIn(t, ms) {
  const out = [], end = t + ms, d = gameDate(t), m = new Date(d.getTime());
  m.setHours(0, 0, 0, 0);
  for (let k = 0; k < 400; k++) {
    const a = t + (m - d);
    if (a >= end) break;
    const w = new Date(m.getTime());
    w.setHours(NRG_NIGHT_H, 0, 0, 0);
    const x = Math.max(a, t), y = Math.min(t + (w - d), end);
    if (y - x >= NRG_NIGHT_MIN) out.push([x, y]);
    m.setDate(m.getDate() + 1);
  }
  return out;
}
// What ms from t do to the energy: 'awake' (the default), 'act' (writing), 'date', 'work', 'sleep' or 'night' (asleep),
// 'nap', or 'skip' (the time accelerator: the night in it is slept). Called before the clock moves.
function nrgPass(g, ms, how = 'awake', t = Date.now()) {
  if (!g || !(ms > 0)) return;
  const F = nrgOf(g, t);
  let e = nrgNow(g, t);
  const drain = (x, k = 1) => { e = clamp(e - NRG_DRAIN * k * Math.max(0, x) / 3600000, 0, 100); };
  const rest = (x) => { e = clamp(e + NRG_SLEEP * Math.max(0, x) / 3600000, 0, 100); };
  if (how === 'sleep' || how === 'night') { rest(ms); F.wake = t + ms; }
  else if (how === 'nap') e = clamp(e + NRG_NAP, 0, 100);
  else if (how === 'skip') {
    let cur = t;
    for (const [a, b] of nightsIn(t, ms)) { drain(a - cur); rest(b - a); F.wake = b; cur = b; }
    drain(t + ms - cur);
  } else drain(ms, how === 'work' ? NRG_WORK : 1);
  F.e = e;
  F.at = t + ms; // (moved back with every timestamp when the clock jumps: it reads « now » after the jump)
}
// The game closed (or out of sight) since `from`: a long absence rests the player, a short one is lived (its night slept).
function nrgBack(g, from, t = Date.now()) {
  if (!g || !from || t - from < 60000) return;
  const F = nrgOf(g, from);
  F.e = nrgNow(g, from);
  F.at = from;
  if (t - from >= NRG_REST_MS) { F.e = 100; F.at = t; F.wake = t; return; }
  nrgPass(g, t - from, 'skip', from);
}
// A shoot of D ms started now: its energy before and after, and what it loses (the mean of both states).
function nrgShoot(g, D, t = Date.now()) {
  const e0 = nrgNow(g, t), e1 = clamp(e0 - NRG_DRAIN * NRG_WORK * Math.max(0, D) / 3600000, 0, 100);
  const m = (nrgLevel(e0).malus + nrgLevel(e1).malus) / 2;
  return { e0, e1, malus: t32On() ? Math.round(m * 100) / 100 : 0 };
}
const pctW = (x) => `${Math.round(x * 100)} %`;
// What every prompt knows of it: it may show (their AI decides whether they notice).
function nrgCtx(g, t = Date.now()) {
  if (!t32On()) return null;
  const s = nrgState(g, t);
  if (!s.malus) return null;
  const up = Math.round(s.up / 3600000);
  return `Le joueur est ${s.id === 'fatigue' ? 'fatigué' : s.id === 'epuise' ? 'épuisé' : 'à bout de forces'}${up >= 10 ? ` (debout depuis ${up} h)` : ''} : ça peut se sentir (messages plus courts ou décousus, fautes, cernes en vidéo, bâillements en vrai) ; chacun le remarque ou non, selon qui il est et ce qu’il voit.`;
}

/* ---------- sleeping ---------- */
// « Dormir »: from 20 h to 6 h, the night until 8 h; in the day, a nap (night: true, the night anyway). Never past a
// release to shoot or a date: the alarm rings 45 min before it.
function sleepPlan(g, t = Date.now(), night = null) {
  const d = gameDate(t), h = d.getHours();
  const nap = night === false || (night == null && h >= 6 && h < 20);
  let ms = NRG_NAP_MS;
  if (!nap) {
    const w = new Date(d.getTime());
    w.setHours(NRG_NIGHT_H, 0, 0, 0);
    while (w - d < 2 * 3600000) w.setDate(w.getDate() + 1);
    ms = w - d;
  }
  const stops = [activeRelease(g), ...activeEvents(g).filter((e) => e.player)].filter((x) => x && x.due > t).sort((a, b) => a.due - b.due);
  let alarm = null;
  if (stops.length && stops[0].due - 45 * 60000 < t + ms) { ms = stops[0].due - 45 * 60000 - t; alarm = stops[0]; }
  ms = Math.round(ms);
  return { nap, ms, until: t + ms, alarm, ok: ms >= (nap ? 20 : 60) * 60000 };
}
function alarmWord(g, x) {
  if (!x) return '';
  const c = x.player ? g.chars[x.c] : null;
  return c ? `ton rendez-vous avec ${firstName(c)} à ${hourOf(x.due)}` : x.big ? `ta production « ${str(x.topic, 40)} » à ${hourOf(x.due)}` : `${ta(x)} « ${str(x.topic, 40)} » à ${x.what === 'live' ? 'lancer' : 'tourner'} à ${hourOf(x.due)}`;
}
function goSleep(night = null) {
  const g = S.game;
  if (!g) return;
  const P = sleepPlan(g, Date.now(), night);
  if (!P.ok) { toast(P.alarm ? `Pas le temps de dormir : ${alarmWord(g, P.alarm)}.` : 'Pas le temps de dormir maintenant.', 'bad'); return; }
  skipTime(P.ms, null, { how: P.nap ? 'nap' : 'sleep', alarm: P.alarm });
}
// From 1 h in the night, or exhausted: a bed is offered, once (never forced).
function tickNrg(g, t = Date.now()) {
  if (!g || !t32On() || inMiniGame() || t - (S.lastInputAt || 0) > 3 * 60000) return false; // (0.33.6: at someone's too: one sleeps there)
  const F = nrgOf(g, t), d = gameDate(t), h = d.getHours(), s = nrgState(g, t);
  const night = new Date(d.getTime() - 8 * 3600000).toDateString(); // (the night of that evening)
  if (h >= 1 && h < 6 && F.night !== night) {
    F.night = night;
    toast(`🌙 Il est ${hourOf(t)}… Une vraie nuit te ferait du bien${s.malus ? ' : tu commences à fatiguer' : ''}.`, 'flash', { label: 'Dormir', run: () => goSleep() });
    return true;
  }
  if (s.e < 15 && F.low !== F.wake) {
    F.low = F.wake;
    toast(`😵 Tu es ${px(g, 'épuisé', 'épuisée', 'épuisé·e')} : tes tournages s’en ressentent, et ça peut se voir.`, 'flash', { label: 'Dormir', run: () => goSleep(true) });
    return true;
  }
  return false;
}

/* ---------- what an action takes ---------- */
const ACT_MIN = { msg: 5, long: 10, post: 15, photo: 20, heavy: 30, story: 10 };
const msgMin = (text) => (graphemes(String(text || '')).length > 200 ? ACT_MIN.long : ACT_MIN.msg);
// A post: a quarter of an hour, 20 min with a photo, half an hour for a carousel or an accusation with proofs.
function postMin(o) {
  if (!o || o.video) return 0; // (a release: its time is the production's)
  if (o.proofs || (o.photo && o.photo.diapo)) return ACT_MIN.heavy;
  return o.photo ? ACT_MIN.photo : ACT_MIN.post;
}
// The time is owed, and passes once nobody is writing (the clock's loop): quietly, with a « +5 min » on the clock.
function actTime(g, min) {
  if (!g || !(min > 0) || !t32On()) return 0;
  g.actDebt = (g.actDebt || 0) + Math.round(min * 60000);
  return min;
}
const clockBusy = () => skipBusy() || !!(S.busy.groups || S.busy.story || S.busy.talk || S.busy.more || S.busy.rp);
const typingSoon = (g, t = Date.now()) => Object.values(g.dms || {}).some((cv) => (cv.msgs || []).slice(-6).some((m) => m.at > t && m.at - t < 60000)); // (an answer being typed: it ends first)
const minWord = (ms) => { const m = Math.max(1, Math.round(ms / 60000)); return m < 60 ? `${m} min` : hWord(m / 60); }; // « 5 min », « 1 h 15 »
function payActTime(g, t = Date.now()) {
  const ms = g && g.actDebt;
  if (!ms || clockBusy() || inMiniGame() || typingSoon(g, t)) return 0;
  g.actDebt = 0;
  jumpClock(g, ms, 'act');
  g.lastPlayedAt = Date.now();
  S.clockBump = { ms, at: Date.now() };
  return ms;
}

/* ---------- the network lives on through the hours that pass ---------- */
const TELL_MS = 2 * 3600000; // hours gone by untold (writing, shooting, an evening out): past this, the network tells them
const QUIET_HOW = { act: 'était occupé', awake: 'était occupé', date: 'était en rendez-vous', work: 'travaillait sur ses contenus', night: 'dormait' };
function noteQuiet(g, ms, how) {
  if (!QUIET_HOW[how] || !t32On()) return;
  g.quietMs = (g.quietMs || 0) + ms;
  if (how !== 'act' || !g.quietWhy) g.quietWhy = QUIET_HOW[how];
}
function tickTold(g, t = Date.now()) {
  if (!g || !(g.quietMs >= TELL_MS) || clockBusy() || S.busy.newchar || inMiniGame() || S.publishing || S.catchup) return false; // (the story of an absence first)
  const ms = Math.min(g.quietMs, 2 * DAY_MS), why = g.quietWhy || 'était occupé';
  g.quietMs = 0;
  delete g.quietWhy;
  if (!canAfford(g, 'skip')) return false; // (no cafés left: the time went by, untold)
  refreshFeed(ms, { skip: true, auto: true, busy: why });
  return true;
}
// A moment in the last ms that is not in the dead of the night (posts told for a stretch of time), when there is one.
function awakeTs(t, ms) {
  let x = t - Math.round(rand(0.05, 0.95) * ms);
  for (let k = 0; k < 6; k++) { const h = gameDate(x).getHours(); if (h < 1 || h >= 7) return x; x = t - Math.round(rand(0.05, 0.95) * ms); }
  return x;
}

/* ---------- the characters' lives: when they sleep, how fast they answer ---------- */
// How fast they pick up their phone (minutes, the median of a first answer), by heart; those glued to it stay at hand.
const DISPO_SPEED = { impulsif: 1, jaloux: 2, anxieux: 5, serein: 12, prudent: 20, forteresse: 40, inaccessible: 90, fusionnel: 1, possessif: 1, volage: 10, libre: 15, chaudfroid: 20 };
const DISPO_GLUED = ['impulsif', 'jaloux', 'fusionnel', 'possessif'];
// 0.32: the ones who work at night (the DJ who mixes, the barman, the bouncer, a night shift) go to bed at dawn
const NIGHT_RE = /\bdj\b|mixe |platines|barman|barmaid|videu|de nuit|night ?club|bo[îi]te de nuit|travaille la nuit|bosse la nuit/i;
const OWL_RE = /noctambule|nocturne|la nuit|insomni|gam(?:e|er|eu|ing)|stream|\bdj\b|barman|barmaid|serveu|f[êe]tard|clubb|soir[ée]es?\b|musicien|rappeu|beatmak|producteur|artiste|d[ée]veloppeu|codeu|hacker/i;
const LARK_RE = /matinal|l[èe]ve-t[ôo]t|sporti|coach|running|yoga|fitness|boulang|infirmi|m[ée]decin|chirurgien|militaire|agricult|mara[îi]ch|nageu|cycliste/i;
const HOT_MS = 20 * 60000; // they wrote this recently: still on their phone
const drand = () => (window.__HYPE_TEST__ && Array.isArray(window.__dispoRolls) && window.__dispoRolls.length ? window.__dispoRolls.shift() : Math.random());
const gaussR = () => Math.sqrt(-2 * Math.log(1 - drand() * 0.999999)) * Math.cos(2 * Math.PI * drand());
function rythmeOf(g, c) {
  const hh = hashStr((c.handle || c.id || '') + '#rythme'), txt = [c.personality, c.role, c.bio].join(' ');
  let bed = 22.75 + (hh % 11) * 0.25, wake = 6.75 + (Math.floor(hh / 11) % 11) * 0.25; // (22 h 45 – 1 h 15, 6 h 45 – 9 h 15)
  if (NIGHT_RE.test(txt)) { bed = 4 + (hh % 7) * 0.25; wake = 11.5 + (Math.floor(hh / 7) % 7) * 0.25; } // (4 h – 5 h 30, 11 h 30 – 13 h)
  else if (OWL_RE.test(txt)) { bed += 1.75; wake += 1.25; } else if (LARK_RE.test(txt)) { bed -= 1; wake -= 1.25; }
  if (c.age && c.age < 23) { bed += 0.5; wake += 0.5; }
  const psy = typeof isPsy === 'function' && isPsy(g, c);
  let speed = c.kind === 'fan' ? 2 : c.kind === 'media' ? 45 : c.kind === 'staff' || c.kind === 'cand' ? 25 : DISPO_SPEED[c.coeur] || 12; // (0.32.1: a brand never waits, see dispoOf)
  const glued = c.kind === 'fan' || psy || DISPO_GLUED.includes(c.coeur);
  if (psy) { speed = 1; bed += 1.5; } // (all theirs: at hand, at any hour)
  else if (c.coeur === 'chaudfroid' && isMain(c)) speed = cfHot(c) ? 3 : 90; // 0.32: a warm spell, a cold one
  if (isMain(c)) speed *= LOVE_ACTIVE.includes(c.vibe) ? 0.45 : c.rel >= 60 ? 0.7 : c.rel <= -20 ? 1.8 : 1;
  return { bed: bed % 24, wake, speed, glued, biz: c.kind === 'cand' };
}
// Asleep at t on the game's clock: until when (0: awake).
function asleepUntil(R, t = Date.now()) {
  const d = gameDate(t), x = d.getHours() + d.getMinutes() / 60;
  if (!(R.bed >= 12 ? x >= R.bed || x < R.wake : x >= R.bed && x < R.wake)) return 0;
  const w = new Date(d.getTime());
  w.setHours(Math.floor(R.wake), Math.round((R.wake % 1) * 60), 0, 0);
  if (w <= d) w.setDate(w.getDate() + 1);
  return t + (w - d);
}
// A brand, a candidate: office hours (9 h – 19 h). Closed: when it opens.
function bizOpensAt(t = Date.now()) {
  const d = gameDate(t), h = d.getHours();
  if (h >= 9 && h < 19) return 0;
  const o = new Date(d.getTime());
  o.setHours(9, 0, 0, 0);
  if (h >= 19) o.setDate(o.getDate() + 1);
  return t + (o - d);
}
const lastFrom = (msgs, t) => { for (let k = msgs.length - 1; k >= 0; k--) { const m = msgs[k]; if (!m.me && !m.sys && m.text && m.at <= t) return m; } return null; };
const onlineNow = (g, c, t = Date.now()) => { const m = lastFrom(((g.dms[c.id] || {}).msgs) || [], t); return !!(m && t - m.at < HOT_MS); };
// Can they answer now? { now: true }, or { at, why } (when they will, and what kept them: for their AI).
function dispoOf(g, c, t = Date.now(), convo = g.dms[c.id]) {
  if (!c || !t32On() || c.kind === 'gone') return { now: true };
  if (c.kind === 'brand') return { now: true }; // 0.32.1: the partnerships answer right away, at any hour (the player's ask: waiting for them was a chore)
  if (stayWith(g, c, t)) return { now: true }; // (together; 0.33.5: not when they went out)
  if (isMain(c) && activeEvents(g).some((e) => e.player && e.c === c.id && e.due - t < 2 * 3600000 && t - e.due < DATE_H * 3600000)) return { now: true }; // (about to meet, or meeting)
  if (isMain(c) && awayDateOf(g, c, t)) return { now: true }; // (a date missed: they wait for the player's word)
  const R = rythmeOf(g, c), msgs = (convo && convo.msgs) || [], last = lastFrom(msgs, t);
  if (c.away && c.away.until > t) { // their own word: they stepped away
    if (R.glued && drand() < 0.35) return { now: false, at: t + Math.round(rand(4, 20) * 60000), why: '' };
    return { now: false, at: c.away.until + Math.round(rand(0, 20) * 60000), why: str(c.away.why, 50) || 'pas dispo' };
  }
  if (last && t - last.at < HOT_MS) return { now: true }; // a conversation going on
  const sl = asleepUntil(R, t);
  if (sl && !(R.glued && drand() < 0.25)) return { now: false, at: sl + Math.round(rand(5, 50) * 60000), why: 'dormait' };
  if (R.biz) { const o = bizOpensAt(t); if (o) return { now: false, at: o + Math.round(rand(0, 90) * 60000), why: 'hors des heures de bureau' }; }
  const m = R.speed * Math.exp(gaussR() * 0.9); // minutes: a life, not a rule
  if (m < 3) return { now: true };
  return { now: false, at: t + Math.round(m * 60000), why: '' };
}
// Their AI's word: « je file au taf, je te réponds ce soir ».
function setAway(g, c, o, at = Date.now()) {
  const h = clamp(num(o && o.h, 0), 0.5, 12);
  if (!c || !(h > 0)) return;
  c.away = { at, until: at + Math.round(h * 3600000), why: str(o.why, 50) };
}
const DISPO_LINE = (c) => { const il = gx(c.g, 'il', 'elle', 'iel'); return `- Facultatif : si, après ces messages, ${firstName(c)} n’est plus dispo pendant un moment (${il} part travailler, en cours, au sport, en soirée, va dormir, coupe son téléphone, ou n’a pas envie de répondre tout de suite), ajoute {"t":"dispo","h":2,"why":"≤ 40 caractères"} (h : dans combien d’heures ${il} reprend son téléphone, de 0,5 à 12). Selon qui ${il} est : quelqu’un d’impulsif, de collant ou d’accro à son téléphone décroche rarement ; quelqu’un de très pris, de distant ou qui se fait désirer, plus souvent. S’${il} prévient le joueur, c’est dans ses messages.`; };
// 0.32.1: a brand answers right away, at any hour, and deals with what was asked in that very answer.
const BRAND_NOW_LINE = (c) => { const il = gx(c.g, 'il', 'elle', 'iel'); return `- ${firstName(c)} répond tout de suite, à toute heure : ${il} traite ce que dit le joueur dans ce message même (un oui, un non, une question, une contre-proposition), sans le renvoyer à plus tard ni « aux heures de bureau ». S’${il} avait promis de revenir vers le joueur (une proposition, un chiffre, le « feu vert » de sa direction), c’est maintenant : ${il} revient avec la réponse.`; };
// 0.33: the same in a group, for the brands in it
const BRAND_NOW_GROUP = (bs) => `- ${bs.map((c) => '@' + c.handle).join(', ')} ${bs.length > 1 ? 'répondent' : 'répond'} tout de suite et ${bs.length > 1 ? 'décident' : 'décide'} dans ce message (un oui avec la ligne qui va avec, un non, une contre-proposition) : jamais « je reviens vers vous », « on attend le feu vert » ou « je regarde le budget ». ${bs.length > 1 ? 'Celle qui avait promis' : 'Si elle avait promis'} de revenir avec une proposition ou une réponse, c’est maintenant.`;
// The message waits for them: no answer now (theirs comes when they pick up their phone).
function deferDM(g, c, convo, text, av, t = Date.now()) {
  convo.msgs.push({ id: uid('m'), me: true, text, ts: t, at: t });
  convo.readAt = t;
  touch(c);
  c.dmSent = (c.dmSent || 0) + 1;
  g.stats.dms++;
  g.lastPlayedAt = t;
  const D = convo.due;
  if (!D || av.at < D.at) convo.due = { at: Math.max(t + 60000, av.at), why: av.why || (D && D.why) || '', from: D ? D.from : t };
  actTime(g, msgMin(text));
  if (!g.tipDispo) { g.tipDispo = t; toast(`💬 ${firstName(c)} n’a pas encore lu ton message : chacun sa vie. Fais autre chose, ou avance le temps.`, 'flash'); }
  update();
}
// The answers whose time came (one at a time; after a skip, in order).
function tickReplies(g, t = Date.now()) {
  if (!g || S.busy.refresh || S.busy.act || inMiniGame() || Object.keys(S.busy.dms || {}).length >= 2) return false;
  let best = null;
  for (const id in g.dms) {
    const D = g.dms[id].due;
    if (!D || dmBusy(id)) continue;
    const c = g.chars[id];
    if (D.at > t) {
      if (!c || c.kind !== 'brand') continue;
      D.at = t; D.why = ''; // 0.32.1: a brand's answer put off before (office hours, its AI stepping away) comes now
    }
    if (!c || c.cut || c.kind === 'gone') { delete g.dms[id].due; continue; }
    if (!best || D.at < best.D.at) best = { c, D };
  }
  if (!best) return false;
  if (!canAfford(g, 'dm')) { best.D.at = t + 30 * 60000; return false; } // (no cafés left: later)
  answerDue(g, best.c);
  return true;
}
// A group: who is there now; if nobody, when the first one will be.
function groupDispo(g, gr, t = Date.now()) {
  const ms = groupMembers(g, gr), now = [], off = [];
  const lastIn = (c) => { for (let k = gr.msgs.length - 1; k >= 0; k--) { const m = gr.msgs[k]; if (m.a === 'c:' + c.id && !m.sys && m.at <= t) return m; } return null; };
  for (const c of ms) {
    const l = lastIn(c);
    const av = l && t - l.at < HOT_MS ? { now: true } : dispoOf(g, c, t, { msgs: [] });
    (av.now ? now : off).push(Object.assign({ c }, av));
  }
  return { now: now.map((x) => x.c), off, at: off.length ? Math.min(...off.map((x) => x.at)) : t };
}
const groupAwayLine = (off) => (off.length ? `Pas dispo en ce moment (ne répondent pas, sauf vraie raison) : ${off.map((x) => `@${x.c.handle}${x.why === 'dormait' ? ' (dort sûrement)' : x.why && x.why !== 'hors des heures de bureau' ? ` (${x.why})` : ''}`).join(', ')}.` : null);
function tickGroups(g, t = Date.now()) {
  if (!g || S.busy.refresh || S.busy.act || inMiniGame()) return false;
  for (const gr of g.groups || []) {
    const D = gr.due;
    if (!D || gr.left || groupBusy(gr.id)) continue;
    if (D.at > t) {
      if (!groupMembers(g, gr).some((c) => c.kind === 'brand')) continue;
      D.at = t; // 0.32.1: a brand in the group: someone answers now (an answer put off before)
    }
    if (!canAfford(g, 'dm')) { D.at = t + 30 * 60000; continue; }
    answerGroupDue(g, gr);
    return true;
  }
  return false;
}

/* ---------- 0.32: releases planned before it keep their hour out (their shoot starts earlier, or now) ---------- */
function prod32(g, t = Date.now()) {
  for (const r of g.releases || []) {
    if (r.state !== 'scheduled' || r.big || r.played || r.prod === 0 || r.what === 'live' || r.outAt == null) continue;
    const D = prodMs(r);
    if (!D || Math.abs(r.outAt - r.due - D) < 60000) continue; // (planned with these hours)
    if (r.collab || r.now) { r.outAt = r.due + D; continue; } // (they meet to shoot at that hour; or started right away)
    setOut(r, r.ann && r.ann < r.outAt ? r.ann : r.outAt, t);
    delete r.dueSaid;
    delete r.soonSaid;
  }
}

/* ---------- on screen ---------- */
// The battery beside the clock: the energy left (the time sheet has the details, and the bed).
function NrgChip({ g, now }) {
  const s = nrgState(g, now);
  return html`<button class=${'fit-chip ' + s.id} onClick=${openWatch} aria-label=${`Énergie ${s.pct} % : ${s.label}. Dormir ou avancer le temps`} title=${`Énergie ${s.pct} % · ${s.label}`}><span class="fit-bat" aria-hidden="true"><i style=${'width:' + Math.max(4, s.pct) + '%'}></i></span><b>${s.pct} %</b></button>`;
}
// Before a shoot: the energy it starts with and ends with, and what it would lose.
function NrgShootNote({ g, PD }) {
  const F = nrgShoot(g, PD), a = Math.round(F.e0), b = Math.round(F.e1), tired = px(g, 'fatigué', 'fatiguée', 'fatigué·e');
  return html`<p class=${'prod-note fit-note' + (F.malus ? ' tired' : '')}>⚡ Énergie ${a} % → ${b} % à la fin${F.malus ? ` : ${F.e0 < 30 ? `tu es déjà ${tired}` : `tu finiras ${tired}`}, ton tournage perdra ${pctW(F.malus)}` : ''}.</p>`;
}
// In the time sheet: how the player is, and the bed (or a nap).
function NrgBlock({ g, close }) {
  const t = Date.now(), s = nrgState(g, t), h = gameDate(t).getHours(), up = Math.floor(s.up / 3600000);
  const P = sleepPlan(g, t), N = P.nap && s.e < 30 && h >= 14 ? sleepPlan(g, t, true) : null;
  const go = (night) => { close(); goSleep(night); };
  const late = h >= 20 || h < 6;
  const note = s.malus ? `${s.label} : tes tournages perdent ${pctW(s.malus)}.` : s.id === 'forme' ? (late ? 'Tu es encore en forme.' : 'Tu as de l’énergie pour la journée.') : late ? 'Ça va, mais une nuit de sommeil ne serait pas de trop.' : 'Ça va, mais pense à dormir ce soir.';
  return html`<div class=${'fit-block ' + s.id}>
    <div class="fit-head"><b>⚡ Énergie ${s.pct} %</b><span>${s.label}${up >= 1 ? ` · debout depuis ${up} h` : ''}</span></div>
    <div class="fit-bar" role="img" aria-label=${`Énergie ${s.pct} %`}><i style=${'width:' + Math.max(2, s.pct) + '%'}></i></div>
    <small class="muted">${note}</small>
    <div class="fit-acts">
      <button class="btn btn-ghost btn-sm" disabled=${!P.ok} onClick=${() => go(null)}>${P.nap ? `😴 Faire une sieste (${hWord(P.ms / 3600000)})` : `🛏️ Dormir jusqu’à ${hourOf(P.until)}`}</button>
      ${N ? html`<button class="btn btn-ghost btn-sm" disabled=${!N.ok} onClick=${() => go(true)}>🛏️ Dormir jusqu’à ${hourOf(N.until)}</button>` : null}
    </div>
    ${P.alarm && P.ok ? html`<small class="muted">⏰ Ton réveil sonnera avant ${alarmWord(g, P.alarm)}.</small>` : null}
  </div>`;
}
