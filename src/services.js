/* =========================================================
   Services (0.23): the player works for the characters. Agreed in private (an edit of their clips, a thumbnail…), the
   AI notes the order; the character sends their files when they want (only their names: it is role-play), the player
   does the work (the edit's rhythm game, the thumbnail tool) and sends it back. The character reacts as they are:
   thanks or disappointment, the money if some was agreed, and maybe a post that shares it and credits the player (an
   audience that discovers them). Late, they take it badly; far too late, they give up. And word gets around: the AI
   knows what the player does for others, so someone else may ask. Nothing is automatic but the bookkeeping.
   ========================================================= */
const JOB_KINDS = {
  montage: { emoji: '🎬', label: 'Montage', noun: 'le montage', what: 'short', out: 'montage_final.mp4', files: true, work: 'Faire le montage' },
  miniature: { emoji: '🖼️', label: 'Miniature', noun: 'la miniature', what: 'vidéo', out: 'miniature.png', files: false, work: 'Faire la miniature' },
};
const JOB_MAX = 20, JOB_GRACE = 3 * DAY_MS;
const normJobKind = (k) => (/mini|thumb|vignette|couverture|cover/i.test(String(k || '')) ? 'miniature' : 'montage');
const fileStem = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').split('_').filter((w) => w.length > 2).slice(0, 2).join('_') || 'projet';
const jobsOf = (g, cid) => (g.jobs || []).filter((j) => !cid || j.c === cid);
const JOB_LIVE = ['open', 'ready', 'sent'];
// 0.28.1: the jobs still to hand in whose deadline falls between two moments (the watch says it before skipping past it)
const jobsDueIn = (g, from, to) => (g.jobs || []).filter((j) => (j.state === 'open' || j.state === 'ready') && j.due > from && j.due <= to);
const openJob = (g, cid) => jobsOf(g, cid).find((j) => JOB_LIVE.includes(j.state)) || null;
const jobOf = (g, id) => (g.jobs || []).find((j) => j.id === id) || null;
const payCap = (c, g) => Math.max(30, Math.round(Math.sqrt(Math.max(0, c.followers || 0)) * 2 * (1 + (g ? skillFx(g, 'jobPay') : 0)) / 10) * 10); // a small creator pays a little (3 000 subscribers: 110 €; 1 million: 2 000 €); 0.24: creativity, tier 10
const jobFileKind = (name) => (/\.(mp4|mov|mkv|avi|webm)$/i.test(name) ? ['🎞️', 'Vidéo'] : /\.(png|jpe?g|webp|psd|gif)$/i.test(name) ? ['🖼️', 'Image'] : /\.(wav|mp3|ogg|flac)$/i.test(name) ? ['🎵', 'Son'] : /\.(zip|rar|7z)$/i.test(name) ? ['🗜️', 'Archive'] : ['📄', 'Fichier']);
// 0.25.2: what the client sees, from bad to legendary. A montage's quality = its rhythm game's score × what its difficulty
// allows (the player picks it, as for their own videos): at « Facile », a perfect run is « bon »; « légendaire » takes
// « Expert » or more. A thumbnail's quality is its own (thumbQual).
const JOB_TIERS = [
  { min: 0.9, id: 'legende', label: 'légendaire', ai: 'légendaire : exceptionnel, de ceux qui font parler' },
  { min: 0.78, id: 'excellent', label: 'excellent', ai: 'excellent : un vrai travail de pro' },
  { min: 0.64, id: 'tresbon', label: 'très bon', ai: 'très bon : soigné' },
  { min: 0.5, id: 'bon', label: 'bon', ai: 'bon : propre et efficace' },
  { min: 0.35, id: 'correct', label: 'correct, sans plus', ai: 'correct, sans plus' },
  { min: -Infinity, id: 'rate', label: 'raté', ai: 'raté : bâclé, ça se voit' },
];
const JOB_FLOP = 0.35; // under it: a flop on their channel, half the money agreed
const JOB_K = { facile: 0.62, moyen: 0.76, difficile: 0.88, expert: 1, legende: 1.08, mythique: 1.16 };
const JOB_DIFFS = DIFFS.filter((d) => JOB_K[d.id]); // (« Cauchemar » asks real questions: a quiz, not a cut)
const JOB_DIFF_TXT = { facile: 'le rythme tranquille', moyen: 'zone plus étroite, plus rapide', difficile: 'zone étroite, rapide', expert: 'zone minuscule, très rapide', legende: 'des réflexes de pro', mythique: 'des réflexes surhumains' }; // (0.27.9: a notch harder, as DIFFS)
const jobTier = (q) => JOB_TIERS.find((t) => q >= t.min);
const jobQual = (q) => jobTier(q).label;
const tierRank = (t) => JOB_TIERS.length - 1 - JOB_TIERS.indexOf(t); // raté 0 … légendaire 5
const jobQ = (m, diff) => clamp(num(m, 0) * (JOB_K[diff] || 1), 0, 1);
const qOf = (j) => (j.q != null ? j.q : j.m); // (an order done before 0.25.2: its score was its quality)
const jobBest = (d) => jobTier(JOB_K[d.id] || 1);
const legendFrom = (d) => (JOB_K[d.id] >= 0.9 ? Math.ceil((0.9 / JOB_K[d.id]) * 100) : null); // the score it takes, in %
// 0.27.8: from what score a difficulty gives « bon », and under which it is « raté » (the worst, not only the best)
const jobFrom = (d, q) => Math.ceil((100 * q) / (JOB_K[d.id] || 1) - 1e-9);
// What they expect, by their audience (one notch more if they pay): the difficulty that gets there is the first offered.
function jobExpect(g, c, j) {
  const ix = clamp(diffIx(diffOf(fameDiff(c))) + (j && j.pay ? 1 : 0), 0, 3);
  const id = ['bon', 'tresbon', 'excellent', 'excellent'][ix];
  return { tier: JOB_TIERS.find((t) => t.id === id), diff: ['facile', 'moyen', 'difficile', 'difficile'][ix] };
}

// The order, agreed in their messages.
function addJob(g, c, o, at = later()) {
  if (!g || !c || !isMain(c) || openJob(g, c.id)) return null; // one order at a time with someone
  const kind = normJobKind(o.kind), K = JOB_KINDS[kind];
  const what = str(o.what, 80) || (kind === 'montage' ? 'un montage de ses vidéos' : 'une miniature');
  const days = clamp(int(o.days, 1, 7, 3), 1, 7);
  const pay = clamp(Math.round(num(o.pay, 0)), 0, payCap(c, g));
  const t = Date.now();
  const j = { id: uid('job'), c: c.id, kind, what, pay, at: t, due: t + days * DAY_MS, files: [], state: 'open' };
  const keep = (g.jobs || []).filter((x) => JOB_LIVE.includes(x.state));
  g.jobs = (g.jobs || []).filter((x) => !JOB_LIVE.includes(x.state)).concat(keep, j).slice(-JOB_MAX);
  const convo = g.dms[c.id] || (g.dms[c.id] = { msgs: [], readAt: 0 });
  convo.msgs.push(tag({ id: uid('m'), me: false, sys: 'job', job: j.id, text: `[Commande : ${K.noun} « ${what} »${pay ? `, ${fmtMoney(g, pay)}` : ', entre amis'}]`, ts: at, at }));
  addNotif(g, { k: 'money', c: c.id, at, text: `${K.emoji} Commande de ${firstName(c)} : ${what}${pay ? ` · ${fmtMoney(g, pay)}` : ' · entre amis'}` });
  addMem(g, c, `le joueur va me faire ${K.noun} : ${str(what, 50)}`);
  return j;
}
// A file they send for it (only its name: role-play).
function addJobFile(g, c, o, at = later()) {
  const j = c && openJob(g, c.id);
  if (!j || j.state === 'sent' || j.files.length >= 8) return null;
  let name = str(o.name, 60).replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '');
  if (!name) return null;
  if (!/\.[a-z0-9]{2,4}$/i.test(name)) name += j.kind === 'montage' ? '.mp4' : '.png';
  if (j.files.some((f) => f.name === name)) return null;
  const when = at + clamp(int(o.in, 0, 600, 0), 0, 600) * 60000; // « after lunch »: later
  j.files.push({ name, at: when });
  const convo = g.dms[c.id] || (g.dms[c.id] = { msgs: [], readAt: 0 });
  convo.msgs.push(tag({ id: uid('m'), me: false, sys: 'file', job: j.id, name, text: '📁 ' + name, ts: when, at: when }));
  return j;
}
const filesIn = (j, t = Date.now()) => j.files.filter((f) => f.at <= t);
// The orders still waiting for their files (an edit needs them): a refresh may bring them.
const jobFilesWanted = (g) => jobsOf(g).filter((j) => j.state === 'open' && JOB_KINDS[j.kind].files && !j.files.length && g.chars[j.c] && g.chars[j.c].unlocked).slice(0, 2);

// The work: the edit's rhythm game, at the difficulty the player picked (0.25.2), or the thumbnail tool.
function jobGame(g, j, diff) {
  const c = g.chars[j.c];
  const D = diffOf(JOB_K[diff] ? diff : jobExpect(g, c, j).diff);
  const m = makeMontage({ what: JOB_KINDS.montage.what, topic: j.what }, D);
  return Object.assign(m, { title: `Le montage pour ${c ? firstName(c) : 'ton client'}`, edit: true });
}
const thumbQual = (t) => clamp(0.35 + (t && t.ctr ? t.ctr : 0) * 2.2, 0, 1);
function jobWorked(g, j, m, extra = {}) {
  if (!j || (j.state !== 'open' && j.state !== 'ready')) return;
  const sc = clamp(num(m, 0.5), 0, 1), diff = JOB_K[extra.diff] ? extra.diff : null;
  Object.assign(j, extra, { m: sc, diff, q: diff ? jobQ(sc, diff) : sc, state: 'ready', game: null });
  if (!j.timed) { j.timed = 1; spendTime(g, (JOB_H[j.kind] || 1) * 3600000, j.kind === 'miniature' ? '🖼️ La miniature' : '🎬 Le montage', 'work'); } // 0.30.1: the work takes its time
  scheduleSave();
  update();
}

/* ---------- the delivery: they react, pay what was agreed, maybe share it ---------- */
function promptJobDone(g, c, j, paid) {
  const K = JOB_KINDS[j.kind], first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel');
  const late = j.sentAt > j.due ? j.sentAt - j.due : 0;
  const msgs = ((g.dms[c.id] || {}).msgs || []).filter((m) => m.text && m.at <= Date.now()).slice(-8);
  return [RULES_PRIVATE, '', ctxText(g, { kind: 'private', about: c, focus: new Set() }), '',
    `## TÂCHE : LE TRAVAIL LIVRÉ À @${c.handle} (${c.name})`,
    `Fiche de ${c.name} : ${ficheText(g, c, false)}`,
    `Relation avec le joueur : ${fmtRel(c.rel)} (${relLabel(c.rel, c.g, c.vibe).toLowerCase()})`,
    c.mem && c.mem.length ? `Ce que ${first} retient du joueur : ${c.mem.slice(-4).map((m) => m.t).join(' ; ')}` : null,
    msgs.length ? 'Leurs derniers messages (du plus ancien au plus récent) :\n' + msgs.map((m) => (m.sys ? sysLine(g, c, m) : `${m.me ? g.player.name + ' (le joueur)' : first} : ${str(m.text, 200)}`)).join('\n') : null,
    `Le joueur vient d’envoyer à ${first} ${K.noun} commandé${j.kind === 'miniature' ? 'e' : ''} : « ${j.what} »${j.files.length ? ` (à partir de ${j.files.map((f) => f.name).join(', ')})` : ''}${late ? `, avec ${fmtDur(late)} de retard` : ''}.`,
    `Le résultat, tel que ${first} le découvre : ${jobTier(qOf(j)).ai} (qualité ${pctOf(qOf(j))} %).`,
    j.kind === 'montage' ? `Ce que ${first} attendait, vu son audience${j.pay ? ' et ce qu’' + il + ' paie' : ''} : un montage au moins ${jobExpect(g, c, j).tier.label}.` : null,
    j.pay ? (paid >= j.pay ? `${first} paie ${fmtMoney(g, paid)} au joueur, comme convenu.` : `${first} ne paie que ${fmtMoney(g, paid)} sur les ${fmtMoney(g, j.pay)} convenus : le résultat ne vaut pas plus à ses yeux.`) : 'C’était un service entre eux, sans argent.',
    '', '## TA MISSION',
    `${first} découvre le travail et réagit en privé, dans sa voix : ${il} ressent ce que vaut le résultat (et le retard, s’il y en a un), selon sa personnalité et leur relation. Puis ${il} publie ${j.kind === 'montage' ? 'la vidéo sur SA chaîne' : 'sa vidéo, avec cette miniature, sur SA chaîne'} (c’est la sienne, pas celle du joueur), en mentionnant le joueur.`,
    '', FORMAT, 'Lignes à produire :',
    '- 1 à 3 lignes : {"t":"msg","text":"≤ 220 caractères"}',
    '- Puis : {"t":"rel","d":3,"why":"≤ 70 caractères"} (d de -8 à 10)',
    `- Puis : {"t":"jobpost","text":"≤ 220 caractères : son post qui publie ${j.kind === 'montage' ? 'la vidéo' : 'la vidéo'} sur sa chaîne, dans sa voix, en mentionnant @${g.player.handle} (fier·e, sobre ou à peine, selon ce qu’${il} en pense)"}`,
    `- Facultatif : {"t":"mem","text":"≤ 90 caractères"} : ce que ${first} en retient.`,
  ].filter((x) => x !== null).join('\n');
}
async function sendJob(id) {
  const g = S.game, j = g && jobOf(g, id), c = j && g.chars[j.c];
  if (!g || !c || j.state !== 'ready' || S.busy.job) return false;
  if (!canAfford(g, 'dm')) { budgetBlocked(); return false; }
  const K = JOB_KINDS[j.kind], convo = g.dms[c.id] || (g.dms[c.id] = { msgs: [], readAt: 0 }), t = Date.now();
  const name = `${fileStem(j.what)}_${K.out}`;
  const mine = { id: uid('m'), me: true, sys: 'file', job: j.id, name, text: '📁 ' + name, ts: t, at: t };
  convo.msgs.push(mine);
  Object.assign(j, { state: 'sent', sentAt: t, out: name });
  const paid = j.pay ? (qOf(j) >= JOB_FLOP ? j.pay : Math.round(j.pay / 2)) : 0;
  S.busy.job = j.id;
  update(false);
  const f = startFlow(g);
  let at = t + rand(2500, 6000), msgs = 0, got = false;
  const fx = {};
  try {
    await aiStream(promptJobDone(g, c, j, paid), (o) => {
      got = true;
      if (o.t === 'msg' && msgs < 3) { const m = str(o.text, 320); if (m) { convo.msgs.push(tag({ id: uid('m'), me: false, r: 1, text: m, ts: at, at })); msgs++; at += 1200 + m.length * 28; } }
      else if (o.t === 'rel' && !fx.rel) fx.rel = { d: int(o.d, -8, 10, 2), why: str(o.why, 70) };
      else if (o.t === 'jobpost' && !fx.post) fx.post = str(o.text, 320);
      else if (o.t === 'mem' && !fx.mem) fx.mem = str(o.text, 90);
      update(false);
    }, { signal: f.ctl.signal, src: f.id, kind: 'dm', use: 'job' });
  } catch (e) { if (!e || e.code !== 'cancelled') reportAiError(e, null, 'dm'); }
  S.busy.job = null;
  endFlow(f);
  if (!got || !msgs) { // nothing came: the work is still theirs to send
    convo.msgs = convo.msgs.filter((m) => m !== mine);
    untag(g, f.id);
    Object.assign(j, { state: 'ready', sentAt: null });
    update();
    return false;
  }
  jobOutcome(g, c, j, paid, fx, at);
  update();
  return true;
}
// What the work leaves: the money agreed, the XP, the creativity, the bond, and an audience if they share it.
function jobOutcome(g, c, j, paid, fx = {}, at = later()) {
  const K = JOB_KINDS[j.kind], first = firstName(c), q = qOf(j), legend = jobTier(q).id === 'legende';
  Object.assign(j, { state: 'done', doneAt: Date.now(), paid });
  if (paid) { earn(g, paid, `${K.label} pour ${c.name}`, 'job'); addNotif(g, { k: 'money', c: c.id, at, text: `💸 ${first} te paie ${fmtMoney(g, paid)} pour ${K.noun}.` }); }
  gainXP(g, Math.round(10 + 25 * q));
  trainSkill(g, 'creativite', 3 + Math.round(6 * q), at); // (a craft practised; 0.24: as XP of the skill)
  const rd = fx.rel ? fx.rel.d : q >= 0.7 ? 5 : q >= JOB_FLOP ? 2 : -3;
  applyRel(g, c, rd, (fx.rel && fx.rel.why) || (rd > 0 ? `${gx(c.g, 'content', 'contente', 'content·e')} de ${K.noun}` : `${gx(c.g, 'déçu', 'déçue', 'déçu·e')} par ${K.noun}`), at + 600, 12);
  if (j.sentAt > j.due) applyRel(g, c, -2, 'tu as rendu en retard', at + 900, 4);
  if (fx.mem) addMem(g, c, fx.mem);
  // 0.23: the video goes out on THEIR channel, the player mentioned: an audience that comes by how known they are and how
  // the video does; a botched one does badly, and they hold it against the player a little
  const handle = '@' + g.player.handle;
  let text = fx.post || '';
  if (!text.includes(handle)) text = (text ? text + ' ' : `Nouvelle vidéo : ${j.what} 🎬 `) + `(${j.kind === 'montage' ? 'montage' : 'miniature'} : ${handle})`;
  const p = addAmbientPost(g, { by: c.handle, text }, at + rand(20000, 90000));
  if (p) {
    const perf = 0.4 + 1.2 * Math.pow(q, 1.5) * (legend ? 1.6 : 1), views = Math.round(Math.max(300, c.followers) * rand(0.15, 0.45) * perf); // 0.25.2: a legendary one takes off
    p.video = { what: K.what, topic: j.what, views, by: g.player.handle };
    p.likeT = Math.round(p.likeT * (0.5 + perf));
    const fol = grow(g.stats.followers, Math.round(Math.sqrt(views) * 1.2 * (0.3 + q) * rand(0.8, 1.2) * (1 + skillFx(g, 'jobFol')))); // 0.24: creativity, tier 30
    g.stats.followers += fol;
    checkMilestones(g);
    Object.assign(j, { post: p.id, fol, views });
    if (q < JOB_FLOP) { // it did badly, and they know why
      applyRel(g, c, -3, 'ta vidéo pour lui ou elle a fait un flop', p.at + 1500, 6);
      addTrigger(g, `La vidéo de @${c.handle} montée par le joueur (« ${str(j.what, 60)} ») fait un flop : ${fmtN(views)} vues seulement. @${c.handle} lui en veut un peu (en privé, ou une pique en public, selon son caractère).`, c.id);
      addNotif(g, { k: 'reldown', c: c.id, p: p.id, at: p.at, text: `📉 La vidéo de ${first} que tu as ${j.kind === 'montage' ? 'montée' : 'illustrée'} fait un flop (${fmtN(views)} vues)${fol ? ` · ${nAbonnes(fol, true)}` : ''}.` });
    } else if (legend) addNotif(g, { k: 'relup', c: c.id, p: p.id, at: p.at, text: `🔥 La vidéo de ${first} que tu as ${j.kind === 'montage' ? 'montée' : 'illustrée'} cartonne : ${fmtN(views)} vues${fol ? ` · ${nAbonnes(fol, true)}` : ''}.` });
    else addNotif(g, { k: 'relup', c: c.id, p: p.id, at: p.at, text: `✂️ ${first} publie la vidéo et te mentionne : ${fmtN(views)} vues${fol ? ` · ${nAbonnes(fol, true)}` : ''}.` });
  }
  addChronicle(g, `${g.player.name} a fait ${K.noun} d’une vidéo de ${c.name}, publiée sur sa chaîne${q < JOB_FLOP ? ' (un flop)' : legend ? ' (un montage légendaire)' : ''}.`);
  scheduleSave();
}

/* ---------- the clock: late, then given up ---------- */
function tickJobs(g, t = Date.now()) {
  let ch = false;
  for (const j of g.jobs || []) {
    if (j.state !== 'open' && j.state !== 'ready') continue;
    const c = g.chars[j.c];
    if (!c) { j.state = 'dropped'; ch = true; continue; }
    const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel'), K = JOB_KINDS[j.kind];
    if (t > j.due + JOB_GRACE) {
      j.state = 'dropped';
      applyRel(g, c, -6, `tu n’as jamais rendu ${K.noun}`, later(), 10);
      addMem(g, c, `le joueur m’a promis ${K.noun} et ne l’a jamais fait`);
      addNotif(g, { k: 'reldown', c: c.id, text: `${K.emoji} ${first} laisse tomber : tu n’as jamais rendu ${K.noun}.` });
      ch = true;
    } else if (t > j.due && !j.lateSaid) {
      j.lateSaid = true;
      applyRel(g, c, -3, `tu es en retard sur ${K.noun}`, later(), 6);
      addTrigger(g, `@${c.handle} attend toujours ${K.noun} que le joueur lui a promis (« ${str(j.what, 60)} ») : c’est en retard, ${il} le lui fait savoir en privé (agacé·e, inquiet·e ou blasé·e, selon son caractère).`, c.id);
      ch = true;
    }
  }
  return ch;
}

/* ---------- what the AI is told ---------- */
// To everyone: what the player does for others (so someone else may ask).
function jobsCtx(g) {
  const done = jobsOf(g).filter((j) => j.state === 'done');
  if (!done.length) return '';
  const avg = Math.round((done.reduce((n, j) => n + qOf(j), 0) / done.length) * 100);
  const kinds = [...new Set(done.map((j) => JOB_KINDS[j.kind].label.toLowerCase() + 's'))].join(' et ');
  return `Le joueur rend aussi des services aux autres créateurs (${kinds}) : ${done.length} ${plural(done.length, 'travail rendu', 'travaux rendus')}, ${avg} % de qualité en moyenne${done.some((j) => j.post) ? ', certains partagés en public avec son nom' : ''}. Quelqu’un peut lui en demander un.`;
}
// In their conversation: the order under way.
function jobDMCtx(g, c) {
  const j = openJob(g, c.id);
  if (!j) return [];
  const K = JOB_KINDS[j.kind], il = gx(c.g, 'il', 'elle', 'iel'), got = filesIn(j);
  return [`Commande en cours : le joueur fait ${K.noun} de ${c.name} (« ${j.what} »)${j.pay ? `, payé ${fmtMoney(g, j.pay)} à la livraison` : ', un service entre eux'} ; à rendre ${dueText(j.due)}${Date.now() > j.due ? ' : C’EST EN RETARD' : ''}. ${got.length ? `${cap1(il)} a envoyé : ${got.map((f) => f.name).join(', ')}.` : K.files ? `${cap1(il)} n’a pas encore envoyé ses fichiers.` : ''}${j.state === 'sent' ? ' Le joueur vient de livrer.' : ''}`];
}
const JOB_RE = /\b(?:montages?|monteu(?:r|se)s?|monter (?:ta|tes|ton|ma|mes|mon|une|un|la|les|des|leurs?) (?:vid|clip|edit|short|vlog|rush|live|stream)\w*|edits?|miniatures?|thumbnails?|vignettes?|rush(?:es)?|clips?|fichiers?|je (?:te|vous) (?:fais|ferai|fait|monte|dessine)|logo|banni[èe]re)\b/i;
const jobTalk = (history, text) => JOB_RE.test(text) || history.slice(-6).some((m) => m.text && JOB_RE.test(m.text));
const JOB_LINE = (g, c) => {
  const j = openJob(g, c.id), il = gx(c.g, 'il', 'elle', 'iel'), first = firstName(c);
  return [j ? null : `- Seulement si ${first} et le joueur se mettent d’accord pour que le joueur lui rende un service (monter ses vidéos, faire sa miniature…), une ligne : {"t":"job","kind":"montage ou miniature","what":"≤ 80 caractères : ce qui est demandé","pay":0,"days":3} (pay : ce que ${first} paie en euros, ${payCap(c, g)} au plus, 0 si c’est un service entre amis ; days : le délai convenu, de 1 à 7 jours).`,
    `- Quand ${first} envoie ses fichiers pour ${j ? 'cette commande' : 'une commande'} (rushes, clips, photos, logo…), une ligne par fichier : {"t":"file","name":"nom_du_fichier.mp4","in":0} ("in" : dans combien de minutes, si ${il} dit les envoyer plus tard ; 0 pour tout de suite). Les fichiers sont pour de faux : seul leur nom compte, un nom réaliste qui colle au contenu.`].filter(Boolean);
};

/* ---------- the screens ---------- */
function JobCard({ g, c, m }) {
  const j = jobOf(g, m.job);
  if (!j) return html`<div class="dm-card"><span class="evt-kind">🎬 Commande</span><p>${m.text}</p></div>`;
  const K = JOB_KINDS[j.kind], got = filesIn(j);
  const state = j.state === 'done' ? `Rendu · ${jobQual(qOf(j))}${j.paid ? ` · ${fmtMoney(g, j.paid)}` : ''}` : j.state === 'dropped' ? 'Abandonnée' : j.state === 'sent' ? 'Livré, en attente de sa réponse' : j.state === 'ready' ? `Prêt à envoyer · ${jobQual(qOf(j))}` : Date.now() > j.due ? 'En retard !' : `À rendre ${fmtWhen(j.due)}`;
  return html`<div class=${'dm-card job-card st-' + j.state}>
    <span class="evt-kind">${K.emoji} Commande · ${K.label}</span>
    <b>${j.what}</b>
    <p>${j.pay ? fmtMoney(g, j.pay) : 'Entre amis'} · ${state}${K.files && j.state === 'open' ? ` · ${got.length} ${plural(got.length, 'fichier reçu', 'fichiers reçus')}` : ''}</p>
    ${JOB_LIVE.includes(j.state) ? html`<button class="btn btn-hot btn-sm" onClick=${() => openLayer({ t: 'job', id: j.id })}>${j.state === 'ready' ? 'Envoyer' : j.state === 'sent' ? 'Voir' : K.work}</button>` : null}
  </div>`;
}
function FileCard({ m }) {
  const [emo, kind] = jobFileKind(m.name || '');
  return html`<div class=${'file-card ' + (m.me ? 'me' : 'them')}><span class="fc-emo" aria-hidden="true">${emo}</span><div><b>${m.name}</b><small>${kind}</small></div></div>`;
}
function JobLayer({ l, g, now, i }) {
  const j = jobOf(g, l.id), c = j && g.chars[j.c];
  if (!j || !c) return html`<${LayerShell} i=${i} title="Commande"><div class="empty"><b>Commande introuvable</b></div><//>`;
  const K = JOB_KINDS[j.kind], first = firstName(c), got = filesIn(j, now), busy = S.busy.job === j.id;
  const head = html`<div class="dlog-head job-head"><${Avatar} who=${author(g, 'c:' + c.id)} size=${44} /><div><b>${K.emoji} ${j.what}</b><small>${K.label} pour ${c.name} · ${j.pay ? fmtMoney(g, j.pay) : 'entre amis'} · ${now > j.due ? 'en retard' : 'à rendre ' + fmtWhen(j.due, now)}</small></div></div>`;
  const files = got.length ? html`<div class="job-files">${got.map((f) => html`<${FileCard} key=${f.name} m=${{ name: f.name, me: false }} />`)}</div>` : null;
  let body;
  if (j.state === 'done' || j.state === 'dropped') body = html`<p class="muted">${j.state === 'done' ? `Rendu : ${jobQual(qOf(j))}${j.diff ? ` (${diffOf(j.diff).label}, ${pctOf(j.m)} %)` : ''}${j.paid ? `, payé ${fmtMoney(g, j.paid)}` : ''}${j.fol ? `, partagé en public (${nAbonnes(j.fol, true)})` : ''}.` : 'Commande abandonnée.'}</p>`;
  else if (j.state === 'sent' || busy) body = html`<p class="muted">${busy ? html`<${Typing} /> ${first} découvre ton travail…` : `Envoyé à ${first}. Sa réponse est dans vos messages.`}</p>`;
  else if (j.state === 'ready') body = html`<${JobReady} g=${g} j=${j} c=${c} busy=${busy} />`;
  else if (K.files && !got.length) body = html`<p class="muted">${first} ne t’a pas encore envoyé ses fichiers. Tu peux les lui réclamer en message.</p>`;
  else if (j.kind === 'miniature') body = html`<${ThumbStep} g=${g} r=${j.r || (j.r = { what: K.what, topic: j.what })} onDone=${(t) => jobWorked(g, j, thumbQual(t), { look: t })} />`;
  else body = html`<${JobEdit} g=${g} j=${j} />`;
  return html`<${LayerShell} i=${i} title=${K.label + ' · ' + first}><div class="lpad">${head}${files}${body}</div><//>`;
}
// 0.25.2: the difficulty first (the one picked last time, or what they expect), then the cut; a game already rolling
// goes on at its own difficulty.
function JobEdit({ g, j }) {
  const c = g.chars[j.c], first = c ? firstName(c) : 'ton client', exp = jobExpect(g, c, j);
  const [game, setGame] = useState(() => (j.game && j.game.run && j.game.run.on ? j.game : null));
  const [diff, setDiff] = useState(() => (JOB_K[g.jobDiff] ? g.jobDiff : exp.diff));
  if (game) return html`<${MontageGame} game=${game} onDone=${(m) => jobWorked(g, j, m, { diff: game.diff })} run=${game.run || null} keep=${(part, soon) => mgKeep(game, part, soon)} />`;
  const D = diffOf(diff), best = jobBest(D), lf = legendFrom(D), n = mgCount('montage', D);
  const start = () => {
    const gm = jobGame(g, j, diff);
    j.game = gm;
    g.jobDiff = gm.diff; // (offered first next time)
    mgKeep(gm, { on: Date.now() });
    setGame(gm);
    update();
  };
  return html`<div class="mg-intro studio-step edit-step job-setup">
    <span class="eyebrow">${D.emoji} ${D.label}</span>
    <h3>Le montage pour ${first}</h3>
    <p>Coupe ses rushes au rythme : chaque coupe dans la zone compte.</p>
    <p class="job-expect">${first} attend un montage au moins <b>${exp.tier.label}</b>.</p>
    <div class="field">
      <span class="lbl" id="job-diff">Difficulté</span>
      <div class="diff-list compact" role="radiogroup" aria-labelledby="job-diff">${JOB_DIFFS.map((d) => { const lfd = legendFrom(d); return html`<button type="button" key=${d.id} role="radio" aria-checked=${diff === d.id ? 'true' : 'false'} class=${'diff-opt' + (diff === d.id ? ' on' : '')} onClick=${() => setDiff(d.id)}>
        <span class="d-emo" aria-hidden="true">${d.emoji}</span><span class="d-mid"><b>${d.label}</b><small>${mgCount('montage', d)} coupes, ${JOB_DIFF_TXT[d.id]} · bon dès ${jobFrom(d, 0.5)} %, raté sous ${jobFrom(d, JOB_FLOP)} %${lfd ? ` · légendaire dès ${lfd} %` : ''}</small></span><span class="d-mult">${lfd ? 'légendaire' : 'au mieux ' + jobBest(d).label}</span>
      </button>`; })}</div>
    </div>
    <p class="muted">${cutRule('Couper', n, false)} ${lf ? `Dès ${lf} %, le montage est légendaire.` : `Même sans faute, ce sera au mieux « ${best.label} ».`} Raté : sa vidéo fait un flop${j.pay ? ` et ${first} ne paie que la moitié` : ''}.</p>
    <button class="btn btn-hot" onClick=${start}><${Icon} n="scissors" s=${16} /> Monter</button>
  </div>`;
}
// Done: what it gives (from the score and the difficulty), against what they expect; sent, or done again.
function JobReady({ g, j, c, busy }) {
  const K = JOB_KINDS[j.kind], first = firstName(c), t = jobTier(qOf(j));
  const exp = j.kind === 'montage' ? jobExpect(g, c, j).tier : null, gap = exp ? tierRank(t) - tierRank(exp) : 0;
  return html`<div class=${'job-ready tier-' + t.id}>
    <p><b>${K.label} : ${t.label}</b>${j.diff ? ` · ${pctOf(j.m)} % en ${diffOf(j.diff).emoji} ${diffOf(j.diff).label}` : ` · ${pctOf(j.m)} %`}</p>
    ${exp ? html`<p class="muted">${gap > 0 ? `Mieux que ce que ${first} attendait (${exp.label}).` : gap === 0 ? `C’est ce que ${first} attendait.` : `${first} attendait au moins « ${exp.label} ».`}</p>` : null}
    <div class="row ss-actions">
      <button class="btn btn-hot" onClick=${() => sendJob(j.id)} disabled=${busy}><${Icon} n="send" s=${16} /> Envoyer à ${first}</button>
      <button class="btn btn-ghost" onClick=${() => { Object.assign(j, { state: 'open', m: null, q: null, diff: null, game: null, look: null }); update(); }}>Refaire</button>
    </div></div>`;
}
function JobsSection({ g, now }) {
  const live = jobsOf(g).filter((j) => JOB_LIVE.includes(j.state));
  if (!live.length) { // 0.27.8: said before the first one (it is agreed in private, never on its own)
    return html`<section class="section jobs-sec"><div class="section-h"><h3>Tes commandes</h3><span>aucune en cours</span></div>
      <p class="muted">Propose en message à un créateur de monter sa vidéo ou de faire sa miniature : s’il accepte, sa commande arrive ici.</p></section>`;
  }
  return html`<section class="section jobs-sec">
    <div class="section-h"><h3>Tes commandes</h3><span>${live.length} en cours</span></div>
    ${live.map((j) => { const c = g.chars[j.c], K = JOB_KINDS[j.kind]; return c ? html`<button key=${j.id} class="rel-row" onClick=${() => openLayer({ t: 'job', id: j.id })}>
      <${Avatar} who=${author(g, 'c:' + c.id)} size=${40} />
      <div class="mid"><div><b>${K.emoji} ${j.what}</b></div><span>${c.name} · ${j.state === 'ready' ? 'prêt à envoyer' : j.state === 'sent' ? 'livré' : now > j.due ? 'en retard' : 'à rendre ' + fmtWhen(j.due, now)}</span></div>
      <span class="num">${j.pay ? fmtMoney(g, j.pay) : '♡'}</span></button>` : null; })}
  </section>`;
}
