/* =========================================================
   0.29: what makes a network feel real.
   - Stories (24 h): the characters post theirs (their AI decides, in a refresh): a bar on top of the feed, a viewer, a
     poll to answer, a reply that goes to their DMs. The player posts theirs: « Vu par » grows by the hour (the close ones
     first; some always look at once), and the network answers in one call (private replies, the votes, the questions).
   - Group chats: the AI starts one (a band of friends, a project, a party) with the player and a few of the cast; the
     player writes in it, they answer each other, the group lives in the refreshes. A group without the player leaks now
     and then: a friend sends a screenshot in private.
   - The player's mother joins the network (her AI decides when): she comments in public, lovingly embarrassing.
   - Fan accounts and ships: an account devoted to the player; the fans pair the player (or two of the cast) under a
     hashtag; the cast reacts.
   - Fake accounts: a fake giveaway in the player's name (report it, or it costs), a parody (it stays: it is allowed).
   ========================================================= */
const STORY_MS = 24 * HR, STORY_MAX = 40, STORY_HUES = [330, 265, 205, 150, 28];
// Anyone of the network by their handle: the player, a character there, someone of the public already known.
const whoAny = (g, h) => { const x = normHandle(h); return !x ? null : roleWho(g, x) || (g.npcs[x] ? 'n:' + x : null); };
const storiesOf = (g) => g.stories || (g.stories = []);
const liveStories = (g, t = Date.now()) => storiesOf(g).filter((s) => s.at <= t && t < s.until);
function trimStories(g, t = Date.now()) {
  g.stories = storiesOf(g).filter((s) => t - s.until < 2 * DAY_MS).slice(-STORY_MAX);
}
function storyPoll(o) {
  if (!o || typeof o !== 'object') return null;
  const q = str(o.q, 90), opts = (Array.isArray(o.a) ? o.a : Array.isArray(o.opts) ? o.opts : []).map((x) => str(x, 32)).filter(Boolean).slice(0, 2);
  return q && opts.length === 2 ? { q, opts, split: int(o.split, 5, 95, randi(30, 70)), mine: null } : null;
}
// A story of someone of the network (a refresh line).
function addStory(g, o, at) {
  const a = resolveAuthor(g, o.by, o.name, o.bio);
  const text = str(o.text, 160);
  if (!a || a === 'p' || !text) return null;
  const t = at || later();
  if (storiesOf(g).filter((s) => s.a === a && s.until > t).length >= 3) return null; // (three at a time, at most)
  const s = tag({ id: uid('st'), a, at: t, ts: t, until: t + STORY_MS, text, hue: STORY_HUES[hashStr(text) % STORY_HUES.length] });
  const ph = str(o.photo, 120);
  if (ph.length >= 3) {
    s.photo = { desc: ph, emoji: photoEmoji(ph) };
    const c = a.startsWith('c:') ? g.chars[a.slice(2)] : null;
    const x = c && isMain(c) ? matchAiPhoto(g, c, ph, t, text) : null; // their real photo, when it shows what they say
    if (x) { s.photo.img = x.id; usePhoto(g, x.id, t); }
  }
  s.poll = storyPoll(o.poll);
  const ask = str(o.ask, 90);
  if (ask && !s.poll) s.ask = ask;
  storiesOf(g).push(s);
  trimStories(g, t);
  return s;
}
// « Vu par »: how many, and who by name (decided when it is posted: the close ones, those who cannot stay away…).
function storyViewers(g, s) {
  const t = s.at, out = [], add = (a, ms) => { if (!out.some((x) => x.a === a)) out.push({ a, at: t + Math.max(15000, Math.round(ms)) }); };
  const psy = psyNow(g);
  if (psy) add('c:' + psy.id, randi(18, 70) * 1000); // (always, within the minute)
  if (g.mom && g.npcs[g.mom]) add('n:' + g.mom, randi(1, 20) * 60000);
  for (const n of Object.values(g.npcs)) if (n.fanOf === 'p' && !n.gone) add('n:' + n.handle, randi(1, 6) * 60000);
  for (const c of mains(g)) {
    if (c.cut || c.jailed) continue;
    const love = LOVE_ACTIVE.includes(c.vibe), p = love || c.rel >= 25 ? 0.85 : c.vibe === 'ex' ? 0.7 : c.rel <= -25 ? 0.5 : 0.3;
    if (Math.random() < p) add('c:' + c.id, (love || c.rel >= 25 ? randi(2, 90) : c.vibe === 'ex' ? randi(10, 300) : randi(5, 600)) * 60000);
  }
  for (const n of regulars(g).slice(0, 6)) if (Math.random() < 0.4) add('n:' + n.handle, randi(5, 400) * 60000);
  return out.sort((x, y) => x.at - y.at);
}
const storyViewsN = (s, now = Date.now()) => Math.round((s.vt || 0) * ease((now - s.at) / (6 * HR)));
const storySeen = (s, now = Date.now()) => (s.views || []).filter((x) => x.at <= now);
// The player's own story: posted at once, then the network answers (one call).
async function postStory(d) {
  const g = S.game;
  if (!g || S.busy.story) return false;
  const text = str(d && d.text, 160);
  if (!text) return false;
  if (!canAfford(g, 'reply')) { budgetBlocked(); return false; }
  const t = Date.now();
  const s = { id: uid('st'), a: 'p', at: t, ts: t, until: t + STORY_MS, text, hue: STORY_HUES.includes(d.hue) ? d.hue : STORY_HUES[0] };
  s.poll = storyPoll(d.poll);
  const ask = str(d.ask, 90);
  if (ask && !s.poll) { s.ask = ask; s.qs = []; }
  s.vt = Math.round(g.stats.followers * rand(0.06, 0.14) + randi(3, 12));
  s.views = storyViewers(g, s);
  if (s.poll) s.voters = [];
  storiesOf(g).push(s);
  trimStories(g, t);
  g.lastPlayedAt = t;
  S.busy.story = true;
  update(false);
  const f = startFlow(g);
  const fx = [];
  let dms = 0, votes = 0, qs = 0, rel = 0, mem = 0, sign = null, at = t + rand(40000, 90000);
  try {
    await aiStream(promptStory(g, s), (o) => {
      if (o.t === 'dm' && dms < 3) { const when = at; at += rand(60000, 240000); dms++; fx.push(() => { const ok = addIncomingDM(g, o.by, o.text, when); /* (an answer to the story: it goes through) */ if (ok) { const c = charByHandle(g, normHandle(o.by)), cv = c && g.dms[c.id]; const m = cv && cv.msgs[cv.msgs.length - 1]; if (m) m.story = { by: 'p', text: str(s.text, 90) }; } }); }
      else if (o.t === 'poll' && s.poll) s.poll.split = int(o.split, 0, 100, s.poll.split);
      else if (o.t === 'vote' && s.poll && votes < 6) { const a = whoAny(g, o.by), k = int(o.pick, 0, 1, 0); if (a && a !== 'p' && !s.voters.some((x) => x.a === a)) { votes++; s.voters.push({ a, k, at: t + randi(1, 120) * 60000 }); } }
      else if (o.t === 'q' && s.ask && qs < 4) { const tx = str(o.text, 140), by = normHandle(o.by); if (tx && by) { qs++; s.qs.push({ by, name: str(o.name, 40), text: tx, at: t + randi(2, 150) * 60000 }); } }
      else if (o.t === 'rel' && !rel) { rel = 1; const when = t + rand(60000, 300000); fx.push(() => applyRel(g, o.by, o.d, o.why, when, 6)); }
      else if (o.t === 'mem' && !mem) { mem = 1; fx.push(() => addMem(g, o.by, o.text)); }
      else if (o.t === 'psy' && !sign) { sign = o; }
      update(false);
    }, { signal: f.ctl.signal, src: f.id, kind: 'reply', use: 'story' });
  } catch (e) { if (!e || e.code !== 'cancelled') reportAiError(e, null, 'story'); }
  for (const x of fx) { try { x(); } catch (err) { console.error(err); } }
  if (sign) psySign(g, charByHandle(g, normHandle(sign.by)) || psyNow(g), sign.text, t + rand(60000, 200000));
  // who voted or answered saw it, of course (a little before)
  const saw = (a, when) => { const x = s.views.find((v) => v.a === a); if (x) x.at = Math.min(x.at, when); else s.views.push({ a, at: when }); };
  for (const v of s.voters || []) saw(v.a, v.at - randi(1, 5) * 60000);
  for (const c of mains(g)) { const m = (g.dms[c.id] || { msgs: [] }).msgs.find((x) => !x.me && x.story && x.at >= t); if (m) saw('c:' + c.id, m.at - randi(1, 4) * 60000); }
  s.views = s.views.map((x) => ({ a: x.a, at: Math.max(t + 15000, x.at) })).sort((x, y) => x.at - y.at);
  S.busy.story = false;
  endFlow(f);
  update();
  return s;
}
function promptStory(g, s) {
  const L = [RULES, '', ctxText(g, { kind: 'light', feed: 4, chron: 4 }), '',
    '## LA STORY DU JOUEUR (elle disparaîtra dans 24 h)', `« ${noJson(s.text)} »`];
  if (s.poll) L.push(`Avec un sondage : « ${s.poll.q} » (${s.poll.opts.map((x) => `« ${x} »`).join(' ou ')}).`);
  if (s.ask) L.push(`Avec une question pour ses abonnés : « ${s.ask} » (ils lui posent leurs questions).`);
  L.push('', '## TA MISSION', 'Ce qui se passe quand ses abonnés voient cette story. Comme sur un vrai réseau : la plupart regardent sans rien dire ; quelques-uns répondent en privé (une vanne, un compliment, une drague, une pique, une question), selon leur relation avec le joueur.',
    '', FORMAT, 'Lignes à produire :',
    '- 0 à 3 lignes : {"t":"dm","by":"handle d’un personnage principal","text":"≤ 160 caractères : sa réponse privée à la story"}',
    s.poll ? '- Une ligne : {"t":"poll","split":60} (le pourcentage de votes pour la première réponse), puis 0 à 5 lignes {"t":"vote","by":"handle","pick":0} : des personnages principaux ou des habitués qui ont voté (pick 0 = la première réponse, 1 = la seconde), d’après qui ils sont.' : null,
    s.ask ? '- 2 à 4 lignes : {"t":"q","by":"handle d’un personnage ou d’un habitué du public","name":"son nom s’il est nouveau","text":"≤ 120 caractères : la question qu’il pose au joueur"} (sincères, drôles, indiscrètes, un troll).' : null,
    '- Facultatif (au plus 1) : {"t":"rel","by":"handle","d":2,"why":"≤ 60 caractères"} si la story change vraiment ce qu’un personnage pense du joueur.',
    '- Facultatif (au plus 1) : {"t":"mem","by":"handle","text":"≤ 90 caractères"}', ...psyPublicLines(g));
  return L.filter((x) => x !== null).join('\n');
}
// The player answers a poll of theirs, reacts or replies (a reply goes to their DMs, with the story quoted).
function voteStory(g, s, k) {
  if (!s || !s.poll || s.poll.mine != null || s.a === 'p') return false;
  s.poll.mine = k === 1 ? 1 : 0;
  const c = s.a.startsWith('c:') ? g.chars[s.a.slice(2)] : null;
  if (c && isMain(c)) addMem(g, c, `le joueur a voté « ${s.poll.opts[s.poll.mine]} » à mon sondage « ${str(s.poll.q, 50)} »`);
  update();
  return true;
}
const STORY_REACTS = ['❤️', '😂', '😮', '😢', '🔥', '👏'];
function reactStory(g, s, emo) {
  const c = s && s.a.startsWith('c:') ? g.chars[s.a.slice(2)] : null;
  if (!c || !DM_KINDS.includes(c.kind) || c.cut) return false;
  const t = Date.now(), convo = g.dms[c.id] || (g.dms[c.id] = { msgs: [], readAt: 0 });
  convo.msgs.push({ id: uid('m'), me: true, text: emo, ts: t, at: t, story: { by: s.a, text: str(s.text, 90) } });
  convo.readAt = t;
  s.reacted = emo;
  touch(c);
  addTrigger(g, `Le joueur a réagi à la story de @${c.handle} (« ${str(s.text, 70)} ») avec ${emo} : ${gx(c.g, 'il', 'elle', 'iel')} peut lui répondre en privé.`, c.id);
  update();
  return true;
}
// What the AI knows of the stories: the live ones (the player's with how far it went), and whether the player saw theirs.
function storiesCtx(g, now = Date.now()) {
  const live = liveStories(g, now).slice(-6);
  if (!live.length) return [];
  return ['Stories en ligne (24 h) : ' + live.map((s) => {
    const au = author(g, s.a);
    return `${s.a === 'p' ? 'le joueur' : '@' + au.handle} : « ${str(s.text, 80)} »${s.poll ? ` [sondage : ${s.poll.q}]` : ''}${s.a === 'p' ? ` (vue par ${fmtPlain(storyViewsN(s, now))} personnes)` : s.seenAt ? ' (le joueur l’a vue)' : ''}`;
  }).join(' ; ')];
}

/* ---------- groups ---------- */
const GROUP_MAX = 4, GROUP_MSGS = 40;
const groupsOf = (g) => g.groups || (g.groups = []);
const liveGroups = (g) => groupsOf(g).filter((x) => !x.left);
const groupOf = (g, id) => groupsOf(g).find((x) => x.id === id) || null;
const groupByName = (g, name) => { const k = plainOf(name).replace(/[^a-z0-9]/g, ''); return k ? liveGroups(g).find((x) => plainOf(x.name).replace(/[^a-z0-9]/g, '') === k) || null : null; };
const groupMembers = (g, gr) => gr.members.map((id) => g.chars[id]).filter((c) => c && !c.jailed);
const trimGroup = (gr) => { if (gr.msgs.length > GROUP_MSGS) gr.msgs.splice(0, gr.msgs.length - GROUP_MSGS); };
function addGroup(g, o, at) {
  if (liveGroups(g).length >= GROUP_MAX || groupByName(g, o.name)) return null;
  const name = str(o.name, 36);
  const ids = [...new Set([o.by].concat(Array.isArray(o.with) ? o.with : []).map((h) => charByHandle(g, normHandle(h))).filter((c) => c && isMain(c) && c.unlocked && !c.cut && !c.jailed).map((c) => c.id))].slice(0, 6);
  if (!name || ids.length < 2) return null;
  const t = at || later();
  const gr = tag({ id: uid('gr'), name, emoji: cleanEmojis(o.emoji, 1) || '💬', members: ids, msgs: [], readAt: 0, at: t });
  groupsOf(g).push(gr);
  const by = charByHandle(g, normHandle(o.by));
  addGroupMsg(g, gr, by && ids.includes(by.id) ? by : g.chars[ids[0]], o.text, t);
  addNotif(g, { k: 'dm', at: t, text: `👥 ${by && ids.includes(by.id) ? firstName(by) : 'Quelqu’un'} t’a ajouté${px(g, '', 'e', '·e')} au groupe « ${name} »` });
  return gr;
}
function addGroupMsg(g, gr, c, text, at) {
  text = str(text, 300);
  if (!gr || !c || !gr.members.includes(c.id) || !text) return null;
  const m = tag({ id: uid('m'), a: 'c:' + c.id, text, ts: at, at });
  gr.msgs.push(m);
  trimGroup(gr);
  bumpLive(at + 800);
  return m;
}
const unreadGroup = (gr, now) => gr.msgs.filter((m) => m.a !== 'p' && m.at <= now && m.at > (gr.readAt || 0)).length;
const unreadGroups = (g, now = Date.now()) => liveGroups(g).filter((gr) => unreadGroup(gr, now) > 0 && !S.stack.some((l) => l.t === 'group' && l.id === gr.id)).length;
const groupBusy = (id) => !!(S.busy.groups && S.busy.groups[id]);
async function sendGroup(id, text) {
  const g = S.game, gr = g && groupOf(g, id);
  text = String(text || '').trim().slice(0, DM_MAX);
  if (!gr || gr.left || !text || groupBusy(id)) return null;
  if (!canAfford(g, 'dm')) { budgetBlocked(); return false; }
  const t = Date.now();
  const mine = { id: uid('m'), a: 'p', text, ts: t, at: t };
  gr.msgs.push(mine);
  trimGroup(gr);
  gr.readAt = t;
  g.lastPlayedAt = t;
  S.busy.groups = Object.assign({}, S.busy.groups, { [id]: true });
  update(false);
  const f = startFlow(g);
  let at = t + rand(1800, 3500), n = 0, rel = 0, mem = 0, quit = null, name = null, sign = null, ok = true;
  const fx = [];
  try {
    await aiStream(promptGroup(g, gr, text), (o) => {
      if (o.t === 'msg' && n < 5) { const c = charByHandle(g, normHandle(o.by)); if (c && addGroupMsg(g, gr, c, o.text, at)) { n++; at += 900 + str(o.text, 300).length * 18; } }
      else if (o.t === 'rel' && rel < 2) { rel++; const when = at; fx.push(() => applyRel(g, o.by, int(o.d, -6, 6, 0), o.why, when, 6)); }
      else if (o.t === 'mem' && !mem) { mem = 1; fx.push(() => addMem(g, o.by, o.text)); }
      else if (o.t === 'quit' && !quit) quit = o;
      else if (o.t === 'name' && !name) name = str(o.text, 36);
      else if (o.t === 'psy' && !sign) sign = o;
      update(false);
    }, { signal: f.ctl.signal, src: f.id, kind: 'dm', use: 'group' });
  } catch (e) {
    if (e && e.code === 'refused') { gr.msgs = gr.msgs.filter((m) => m !== mine); ok = false; }
    if (!e || e.code !== 'cancelled') reportAiError(e, null, 'dm');
  }
  for (const x of fx) { try { x(); } catch (err) { console.error(err); } }
  if (sign) psySign(g, charByHandle(g, normHandle(sign.by)), sign.text, at + 600);
  if (name && name !== gr.name) { gr.name = name; gr.msgs.push({ id: uid('m'), sys: 'name', text: name, ts: at, at }); }
  if (quit) quitGroup(g, gr, charByHandle(g, normHandle(quit.by)), quit.why, at + 800);
  trimGroup(gr);
  if (S.busy.groups) { delete S.busy.groups[id]; if (!Object.keys(S.busy.groups).length) S.busy.groups = null; }
  endFlow(f);
  update();
  return ok;
}
function quitGroup(g, gr, c, why, at) {
  if (!gr || !c || !gr.members.includes(c.id)) return false;
  gr.members = gr.members.filter((x) => x !== c.id);
  gr.msgs.push({ id: uid('m'), sys: 'quit', a: 'c:' + c.id, text: str(why, 80), ts: at || later(), at: at || later() });
  trimGroup(gr);
  return true;
}
function leaveGroup(g, gr) {
  if (!gr || gr.left) return;
  gr.left = Date.now();
  const first = groupMembers(g, gr).map((c) => '@' + c.handle).join(', ');
  if (first) addTrigger(g, `Le joueur a quitté le groupe « ${gr.name} » (${first}) : ceux qui y sont en parlent, vexés ou soulagés.`);
  update();
}
function promptGroup(g, gr, text) {
  const ms = groupMembers(g, gr), focus = new Set(ms.map((c) => c.id));
  const L = [RULES_PRIVATE, '', ctxText(g, { kind: 'private', focus, feed: 3 }), '',
    `## LE GROUPE DE DISCUSSION « ${gr.name} » (le joueur et ${ms.map((c) => '@' + c.handle).join(', ')})`,
    'Ce qui s’y dit reste entre eux.', 'Derniers messages (du plus ancien au plus récent) :',
    ...gr.msgs.slice(-14, -1).map((m) => (m.sys ? `(${m.sys === 'quit' ? `@${author(g, m.a).handle} a quitté le groupe` : `le groupe s’appelle maintenant « ${m.text} »`})` : `${m.a === 'p' ? g.player.name + ' (le joueur)' : '@' + author(g, m.a).handle} : ${(m.a === 'p' ? noJson(m.text) : m.text).slice(0, 200)}`)),
    'Nouveau message du joueur :', `« ${noJson(text)} »`];
  for (const c of ms) if (isPsy(g, c) && psyNow(g)) L.push(`(Secret du jeu : @${c.handle} est le psychopathe de la partie ; dans le groupe, ${gx(c.g, 'il', 'elle', 'iel')} reste crédible, à peine trop intense avec le joueur.)`);
  L.push('', '## TA MISSION', 'Les membres réagissent comme dans un vrai groupe : pas tous, pas toujours d’accord, ils se répondent entre eux, des blagues internes, des messages courts. Chacun garde sa voix.',
    '', FORMAT, 'Lignes à produire :',
    '- 1 à 4 lignes : {"t":"msg","by":"handle d’un membre","text":"≤ 160 caractères"}',
    '- Facultatif (au plus 2) : {"t":"rel","by":"handle","d":2,"why":"≤ 60 caractères"} (d de -6 à 6)',
    '- Facultatif (au plus 1) : {"t":"mem","by":"handle","text":"≤ 90 caractères"}',
    '- Facultatif, rare : {"t":"name","text":"≤ 30 caractères"} si quelqu’un renomme le groupe ; {"t":"quit","by":"handle","why":"≤ 60 caractères"} si quelqu’un le quitte, vexé.',
    psyNow(g) && ms.includes(psyNow(g)) ? '- Facultatif (au plus 1) : {"t":"psy","by":"handle","text":"≤ 90 caractères : ce que le joueur a pu remarquer"} si le psychopathe laisse un détail inquiétant.' : null);
  return L.filter((x) => x !== null).join('\n');
}
// A group without the player: a friend sends a screenshot of it.
function addLeak(g, o, at) {
  const by = charByHandle(g, normHandle(o.by));
  const name = str(o.group, 36);
  const lines = (Array.isArray(o.lines) ? o.lines : []).map((x) => ({ c: x && charByHandle(g, normHandle(x.by)), text: str(x && x.text, 140) })).filter((x) => x.c && isMain(x.c) && x.text && x.c !== by).slice(0, 4);
  if (!by || !isMain(by) || !by.unlocked || by.cut || !name || lines.length < 2) return null;
  const t = at || later(), convo = g.dms[by.id] || (g.dms[by.id] = { msgs: [], readAt: 0 });
  convo.msgs.push(tag({ id: uid('m'), sys: 'leak', group: name, lines: lines.map((x) => ({ a: 'c:' + x.c.id, text: x.text })), text: `capture du groupe « ${name} »`, ts: t, at: t }));
  addNotif(g, { k: 'dm', c: by.id, at: t, text: `📸 ${firstName(by)} t’a envoyé une capture du groupe « ${name} »… sans toi.` });
  const who = [...new Set(lines.map((x) => x.c))];
  addMem(g, by, `j’ai montré au joueur la capture du groupe « ${str(name, 30)} »`);
  addChronicle(g, `${by.name} a montré à ${g.player.name} une capture du groupe « ${name} », où ${who.map((c) => c.name).join(' et ')} parlaient de ${px(g, 'lui', 'elle', 'iel')}.`, [by.id]);
  for (const c of who) addTrigger(g, `@${c.handle} ne sait pas que le joueur a vu sa conversation du groupe « ${name} » (une capture de @${by.handle}) : s’il en parle, c’est le malaise (déni, excuses ou contre-attaque).`, c.id);
  return true;
}

/* ---------- the mother, the fans, the fakes ---------- */
// One line of the refresh starts each of them (once ready); the game only keeps who they are.
function addMom(g, o, at) {
  if (g.mom || !str(o.name, 40)) return null;
  const h = normHandle(o.handle) || normHandle(o.name);
  if (!h || h.length < 3 || h === g.player.handle || charByHandle(g, h) || g.npcs[h]) return null;
  resolveAuthor(g, h, o.name, `la mère de @${g.player.handle} 💕`);
  const n = g.npcs[h];
  Object.assign(n, { regular: true, mom: true, youFollow: false });
  n.emoji = avatarEmoji(o.emoji, h, '💐');
  g.mom = h;
  const t = at || later();
  addNotif(g, { k: 'follow', at: t, text: `👩 Ta mère vient de créer son compte (@${h})… et elle te suit.` });
  addChronicle(g, `La mère de ${g.player.name} (@${h}) est arrivée sur le réseau. Elle commente tout.`);
  if (str(o.text, 10)) addAmbientPost(g, { by: h, text: o.text }, t + 1500, t + 1500);
  return n;
}
function addFanAcct(g, o, at) {
  const h = normHandle(o.handle);
  if (!h || h.length < 3 || charByHandle(g, h) || g.npcs[h] || Object.values(g.npcs).filter((n) => n.fanOf === 'p').length >= 2) return null;
  resolveAuthor(g, h, o.name, str(o.bio, 70) || `fan account de @${g.player.handle} ✨`);
  const n = g.npcs[h];
  Object.assign(n, { regular: true, fanOf: 'p' });
  const t = at || later();
  addNotif(g, { k: 'follow', at: t, text: `✨ Un compte fan rien que pour toi vient d’ouvrir : @${h}` });
  if (str(o.text, 10)) addAmbientPost(g, { by: h, text: o.text }, t + 1200, t + 1200);
  return n;
}
const shipsOf = (g) => g.ships || (g.ships = []);
function addShip(g, o, at) {
  const a = roleWho(g, o.a), b = roleWho(g, o.b);
  let tg = str(o.tag, 32).replace(/\s+/g, '');
  if (tg && !tg.startsWith('#')) tg = '#' + tg;
  if (!a || !b || a === b || !/^#[\p{L}\p{N}_]{3,30}$/u.test(tg)) return null;
  const key = [a, b].sort().join('+');
  if (shipsOf(g).some((x) => [x.a, x.b].sort().join('+') === key || x.tag.toLowerCase() === tg.toLowerCase())) return null;
  const t = at || later();
  const sh = { id: uid('sh'), a, b, tag: tg, at: t };
  g.ships = shipsOf(g).concat(sh).slice(-6);
  if (a === 'p' || b === 'p') addNotif(g, { k: 'trend', tg, at: t, text: `💞 Les fans te shippent avec ${whoName(g, a === 'p' ? b : a)} : ${tg}` });
  addTrigger(g, `Les fans shippent ${a === 'p' ? 'le joueur' : '@' + author(g, a).handle} et ${b === 'p' ? 'le joueur' : '@' + author(g, b).handle} sous ${tg} : les concernés réagissent (gêne, amusement, agacement), les jaloux aussi.`, [a, b].filter((x) => x !== 'p').map((x) => x.slice(2))[0] || null);
  return sh;
}
const FAKE_GAP = 5 * DAY_MS;
function addFake(g, o, at) {
  const kind = /paro/.test(plainOf(o.kind)) ? 'parodie' : 'giveaway';
  const h = normHandle(o.handle);
  if (!h || h.length < 3 || h === g.player.handle || charByHandle(g, h) || g.npcs[h] || Object.values(g.npcs).some((n) => n.fake && !n.gone)) return null;
  const t = at || later();
  resolveAuthor(g, h, str(o.name, 40) || g.player.name, str(o.bio, 70));
  const n = g.npcs[h];
  Object.assign(n, { regular: true, fake: { kind, at: t } });
  g.fakeAt = t;
  if (str(o.text, 10)) addAmbientPost(g, { by: h, text: o.text }, t + 1000, t + 1000);
  return n;
}
// Reporting an account: a fake in the player's name goes, some time later; a parody stays (it says so); anyone else, nothing.
function reportNpc(g, n) {
  if (!n || n.reported) return false;
  n.reported = Date.now();
  if (n.fake && n.fake.kind === 'giveaway') n.fake.until = Date.now() + randi(15, 45) * 60000;
  else if (n.fake) n.fake.kept = true;
  toast('Signalement envoyé. Merci.');
  update();
  return true;
}
// The clock: the reported fake taken down; the fake left alone too long costs the player (their fans got fooled).
function tickSocial(g, t = Date.now()) {
  let ch = tickNet(g, t); // (the end of an outage, the birthdays of the day)
  if (groupsOf(g).length > GROUP_MAX + 4) { const left = g.groups.filter((x) => x.left); g.groups = g.groups.filter((x) => !x.left || left.indexOf(x) >= left.length - 4); } // (the groups left: the last four kept)
  for (const n of Object.values(g.npcs)) {
    const F = n.fake;
    if (!F || n.gone) continue;
    if (F.until && t >= F.until) {
      n.gone = t;
      g.posts = g.posts.filter((p) => p.a !== 'n:' + n.handle);
      for (const p of g.posts) p.replies = p.replies.filter((r) => r.a !== 'n:' + n.handle);
      const dr = repMove(g, { cred: 2, image: 1 }, 'tu as fait fermer le faux compte');
      addNotif(g, { k: 'uncancel', at: t, text: `🛡️ Le faux compte @${n.handle} a été suspendu${repBit(dr, ' (', ')')}.` });
      ch = true;
    } else if (F.kind === 'parodie' && F.kept && !F.said) {
      F.said = true;
      addNotif(g, { k: 'info', at: t + 2000, text: `Le réseau a examiné ton signalement : @${n.handle} est une parodie, elle reste en ligne.` });
      ch = true;
    } else if (F.kind === 'giveaway' && !F.hurt && !n.reported && t - F.at > 3 * HR) {
      F.hurt = true;
      const dr = repMove(g, { cred: -4, kind: -2 }, `le faux compte @${n.handle} à ton nom a piégé des fans`);
      addNotif(g, { k: 'reldown', at: t, text: `😡 Des fans se sont fait piéger par le faux compte @${n.handle} et t’en veulent${repBit(dr, ' (', ')')}.` });
      addTrigger(g, `Des fans se sont fait arnaquer par @${n.handle}, un faux compte qui se fait passer pour le joueur : certains lui en veulent de ne rien avoir dit, d’autres le défendent.`);
      ch = true;
    }
  }
  return ch;
}

/* ---------- what the AI reads, what it may start ---------- */
function socialCtx(g, kind, now = Date.now()) {
  if (kind === 'scene') return [];
  const L = storiesCtx(g, now);
  const gs = liveGroups(g);
  if (gs.length && kind !== 'private') L.push('Groupes de discussion du joueur : ' + gs.map((gr) => `« ${gr.name} » (${groupMembers(g, gr).map((c) => '@' + c.handle).join(', ')})${gr.msgs.length ? ` — dernier message : ${gr.msgs[gr.msgs.length - 1].a === 'p' ? 'le joueur' : '@' + author(g, gr.msgs[gr.msgs.length - 1].a).handle} : « ${str(gr.msgs[gr.msgs.length - 1].text, 70)} »` : ''}`).join(' ; '));
  if (g.mom && g.npcs[g.mom]) L.push(`@${g.mom} est la mère du joueur : elle le suit et commente en public avec l’amour maladroit d’une maman sur les réseaux (jamais méchante, très gênante).`);
  const fans = Object.values(g.npcs).filter((n) => n.fanOf === 'p' && !n.gone);
  if (fans.length) L.push(`Comptes fans du joueur : ${fans.map((n) => '@' + n.handle).join(', ')} (ils le défendent, postent ses moments, font des edits).`);
  const sh = shipsOf(g);
  if (sh.length) L.push('Ships du public : ' + sh.map((x) => `${x.tag} (${x.a === 'p' ? 'le joueur' : '@' + author(g, x.a).handle} × ${x.b === 'p' ? 'le joueur' : '@' + author(g, x.b).handle})`).join(' ; '));
  const fk = Object.values(g.npcs).find((n) => n.fake && !n.gone);
  if (fk) L.push(fk.fake.kind === 'parodie' ? `@${fk.handle} est un compte parodique du joueur (il se moque de ses posts).` : `@${fk.handle} est un FAUX compte qui se fait passer pour le joueur (un faux concours pour soutirer des infos à ses fans)${fk.reported ? ' ; le joueur l’a signalé' : ' ; le joueur n’a encore rien fait'}.`);
  L.push(...netCtx(g, now)); // (the rest: birthdays, the main character of the day, the algorithm, an outage, the top fan)
  return L.length ? ['', '## LA VIE DU RÉSEAU', ...L] : [];
}
// The lines a refresh may write (each one when the moment allows it).
// The game offers some of these now and then (the AI decides whether anything happens): never all of them at once.
const offer = (p) => (window.__HYPE_TEST__ && !window.__offerOdds) || Math.random() < p;
function socialLines(g, t = Date.now()) {
  const L = ['- Facultatif (0 à 2) : des stories (24 h) de personnages ou d’habitués, plus spontanées que les posts : {"t":"story","by":"handle","text":"≤ 120 caractères","photo":"ce qu’on voit (facultatif)","poll":{"q":"≤ 60","a":["…","…"]} (facultatif),"ask":"une question à leurs abonnés (facultatif)"}.'];
  const gs = liveGroups(g);
  if (gs.length) L.push('- Facultatif (au plus 3) : la vie des groupes du joueur, sans lui : {"t":"gmsg","group":"nom exact du groupe","by":"handle d’un membre","text":"≤ 160 caractères"}.');
  const close = mains(g).filter((c) => c.rel >= 20 && !c.cut && !c.jailed);
  if (gs.length < GROUP_MAX && close.length >= 2 && offer(0.3)) L.push('- Facultatif, rare : un personnage crée un groupe de discussion avec le joueur et 1 à 4 autres (une bande, un projet, une soirée) : {"t":"group","name":"≤ 30 caractères","emoji":"🎉","by":"handle","with":["handle","handle"],"text":"≤ 160 caractères : son premier message"}.');
  const foes = mains(g).filter((c) => c.rel <= 5 && !c.cut && !c.jailed);
  if (close.length && foes.length >= 2 && t - (g.leakAt || 0) > 2 * DAY_MS && offer(0.25)) L.push('- Facultatif, rare : un groupe SANS le joueur où l’on parle de lui fuite : un ami lui envoie la capture : {"t":"groupleak","by":"handle de l’ami","group":"≤ 30 caractères","lines":[{"by":"handle","text":"≤ 120 caractères"},{"by":"handle","text":"…"}]} (2 à 4 messages de 2 personnes ou plus), puis une ligne dm de l’ami.');
  if (!g.mom && t - (g.createdAt || t) > DAY_MS && g.stats.posts >= 2 && offer(0.35)) L.push(`- Facultatif, une seule fois dans la partie : la mère du joueur débarque sur le réseau : {"t":"mom","name":"Prénom Nom","handle":"…","emoji":"💐","text":"≤ 200 caractères : son premier commentaire, maladroit et touchant (« Bravo mon ${px(g, 'chéri', 'amour', 'cœur')} !! », signé « Bisous, Maman »), qui mentionne @${g.player.handle}"}.`);
  if (g.stats.followers >= 3000 && Object.values(g.npcs).filter((n) => n.fanOf === 'p').length < 2 && offer(0.25)) L.push(`- Facultatif, rare : un compte fan du joueur ouvre : {"t":"fanacc","name":"…","handle":"…","bio":"≤ 70 caractères","text":"≤ 200 caractères : son premier post sur @${g.player.handle}"}.`);
  if (shipsOf(g).length < 6 && offer(0.25)) L.push('- Facultatif, rare : des fans « shippent » deux personnes (le joueur et un personnage vu proche, ou deux personnages) sous un hashtag de leurs prénoms : {"t":"ship","a":"handle","b":"handle","tag":"#MilaThéo"}.');
  if (g.stats.followers >= 5000 && t - (g.fakeAt || 0) > FAKE_GAP && !Object.values(g.npcs).some((n) => n.fake && !n.gone) && offer(0.15)) L.push('- Facultatif, rare : un faux compte vise le joueur (kind "giveaway" : un faux concours à son nom pour soutirer des infos à ses fans ; "parodie" : un compte qui se moque de lui) : {"t":"fake","kind":"giveaway","name":"…","handle":"…","bio":"≤ 70 caractères","text":"≤ 200 caractères"} ; des fans demandent au joueur « c’est toi ? ».');
  const mom = g.mom && g.npcs[g.mom];
  if (mom) L.push(`- @${mom.handle}, la mère du joueur, peut commenter ou poster (pas à chaque fois).`);
  L.push(...netLines(g, t));
  return L;
}
// For a post of the player: their mother and their fans may react too.
function socialActLines(g) {
  const L = [];
  const mom = g.mom && g.npcs[g.mom];
  if (mom) L.push(`- Facultatif (pas à chaque post) : @${mom.handle}, la mère du joueur, répond en public avec la maladresse touchante d’une maman sur les réseaux (« Bravo mon ${px(g, 'chéri', 'amour', 'cœur')} !! », « C’est qui la personne sur la photo ? », « Tu as bien mangé ? », signée « Bisous, Maman ») : une de tes lignes reply.`);
  const fans = Object.values(g.npcs).filter((n) => n.fanOf === 'p' && !n.gone);
  if (fans.length) L.push(`- Les comptes fans du joueur (${fans.map((n) => '@' + n.handle).join(', ')}) peuvent répondre, le défendre ou en faire un edit.`);
  return L;
}
function applySocialLine(g, o, effects) {
  switch (o.t) {
    case 'story': { if ((effects.stories = (effects.stories || 0) + 1) > 3) return true; const at = later() + rand(4000, 30000); effects.push(() => addStory(g, o, at)); return true; }
    case 'gmsg': { if ((effects.gmsgs = (effects.gmsgs || 0) + 1) > 4) return true; const gr = groupByName(g, o.group), c = charByHandle(g, normHandle(o.by)), at = later() + rand(3000, 40000); if (gr && c) effects.push(() => addGroupMsg(g, gr, c, o.text, at)); return true; }
    case 'group': { if (effects.group) return true; effects.group = 1; const at = later() + rand(5000, 20000); effects.push(() => addGroup(g, o, at)); return true; }
    case 'groupleak': { if (effects.leak) return true; // (not 'leak': that one is a leaked DM capture, career.js)
      effects.leak = 1; const at = later() + rand(8000, 30000); effects.push(() => { if (addLeak(g, o, at)) g.leakAt = Date.now(); }); return true; }
    case 'mom': { const at = later() + rand(3000, 9000); effects.push(() => addMom(g, o, at)); return true; }
    case 'fanacc': { const at = later() + rand(3000, 9000); effects.push(() => addFanAcct(g, o, at)); return true; }
    case 'ship': { const at = later() + rand(4000, 12000); effects.push(() => addShip(g, o, at)); return true; }
    case 'fake': { const at = later() + rand(4000, 12000); effects.push(() => addFake(g, o, at)); return true; }
    default: return applyNetLine(g, o, effects);
  }
}

/* ---------- on screen: the stories ---------- */
// The bar on top of the feed: the player's own (or « + »), then whoever has stories, the ones not seen yet first.
function storyAuthors(g, now = Date.now()) {
  const by = new Map();
  for (const s of liveStories(g, now)) { if (s.a === 'p') continue; const x = by.get(s.a) || { a: s.a, list: [], at: 0 }; x.list.push(s); x.at = Math.max(x.at, s.at); by.set(s.a, x); }
  return [...by.values()].map((x) => Object.assign(x, { unseen: x.list.some((s) => !s.seenAt) })).sort((a, b) => (b.unseen - a.unseen) || (b.at - a.at));
}
function StoriesBar({ g, now }) {
  const mine = liveStories(g, now).filter((s) => s.a === 'p'), list = storyAuthors(g, now), me = author(g, 'p');
  if (!list.length && !mine.length && !g.stats.posts) return null;
  return html`<div class="stories-bar" role="list" aria-label="Stories">
    <div class="sb-it" role="listitem">
      <button type="button" class=${'sb-ring' + (mine.length ? ' mine' : ' none')} onClick=${() => (mine.length ? openStory('p') : openLayer({ t: 'storynew' }))} aria-label=${mine.length ? 'Voir ta story' : 'Publier une story'}><${Avatar} who=${me} size=${56} /></button>
      ${mine.length ? html`<button type="button" class="sb-plus" onClick=${() => openLayer({ t: 'storynew' })} aria-label="Publier une autre story"><${Icon} n="plus" s=${14} /></button>` : html`<span class="sb-plus" aria-hidden="true"><${Icon} n="plus" s=${14} /></span>`}
      <span>Ta story</span>
    </div>
    ${list.map((x) => { const au = author(g, x.a); return html`<div class="sb-it" role="listitem" key=${x.a}><button type="button" class=${'sb-ring' + (x.unseen ? '' : ' seen')} onClick=${() => openStory(x.a)} aria-label=${'Story de ' + au.name}><${Avatar} who=${au} size=${56} /></button><span>${firstName(au)}</span></div>`; })}
  </div>`;
}
function openStory(a) {
  const g = S.game;
  if (!g) return;
  const list = liveStories(g).filter((s) => s.a === a);
  if (!list.length) return;
  const k = a === 'p' ? 0 : Math.max(0, list.findIndex((s) => !s.seenAt));
  S.storyView = { a, k };
  update(false);
}
// The viewer, over everything: one author's stories, then the next author's.
function StoryView({ g, now }) {
  const V = S.storyView;
  const list = V ? liveStories(g, now).filter((s) => s.a === V.a) : [];
  const [val, setVal] = useState('');
  const [hold, setHold] = useState(false);
  const [views, setViews] = useState(false);
  const s = list[Math.min(V ? V.k : 0, list.length - 1)];
  useEffect(() => { if (s && s.a !== 'p' && !s.seenAt) { s.seenAt = Date.now(); const c = s.a.startsWith('c:') ? g.chars[s.a.slice(2)] : null; if (c && isMain(c)) c.storySeen = { id: s.id, at: Date.now() }; } }, [s && s.id]);
  useEffect(() => {
    if (!s || hold || views) return undefined;
    const id = setTimeout(() => next(1), 6500);
    return () => clearTimeout(id);
  }, [s && s.id, hold, views]);
  if (!V || !s) return null;
  const close = () => { S.storyView = null; setViews(false); update(false); };
  function next(d) {
    const k = V.k + d;
    if (k >= 0 && k < list.length) { S.storyView = { a: V.a, k }; setViews(false); update(false); return; }
    if (d < 0) return;
    const na = (storyAuthors(g).find((x) => x.a !== V.a && x.unseen) || {}).a; // (on to whoever still has something new)
    if (na) { const l2 = liveStories(g).filter((x) => x.a === na); S.storyView = { a: na, k: Math.max(0, l2.findIndex((x) => !x.seenAt)) }; setViews(false); update(false); } else close();
  }
  const au = author(g, s.a), c = s.a.startsWith('c:') ? g.chars[s.a.slice(2)] : null;
  const canDM = !!(c && DM_KINDS.includes(c.kind) && !c.cut && !c.jailed);
  const src = s.photo && s.photo.img && PACK.photos[s.photo.img] && g.portraits !== false ? photoSrcById(s.photo.img) : null;
  const P = s.poll, tot = P ? (s.a === 'p' ? (s.voters || []).length + Math.round(storyViewsN(s, now) * 0.3) : 0) : 0;
  const send = async () => {
    const text = val.trim();
    if (!text || !canDM) return;
    setVal('');
    setHold(false);
    const ok = await sendDM(c.id, text, { story: { by: s.a, text: s.text } });
    if (ok === false) setVal(text); else toast(`Message envoyé à ${firstName(c)}.`);
  };
  const seen = s.a === 'p' ? storySeen(s, now) : [];
  return html`<div class="story-ov sv" role="dialog" aria-modal="true" aria-label=${'Story de ' + au.name}>
    <div class="sv-card" style=${'--h:' + s.hue}>
      <div class="ss-bars" aria-hidden="true">${list.map((x, j) => html`<i key=${x.id} class=${j < V.k ? 'done' : ''}>${j === V.k && !hold && !views ? html`<b key=${'r' + x.id} style="--d:6500ms"></b>` : j === V.k ? html`<b class="held" key=${'h' + x.id}></b>` : null}</i>`)}</div>
      <div class="story-top"><${Avatar} who=${au} size=${30} /><b>${au.name}</b><span>${fmtAgo(s.at, now)}</span>
        <button type="button" class="iconbtn" onClick=${close} aria-label="Fermer"><${Icon} n="x" s=${22} /></button></div>
      ${src ? html`<img class="sv-img" src=${src} alt="" />` : s.photo ? html`<div class="sv-ph" aria-hidden="true">${s.photo.emoji || '📷'}</div>` : null}
      <button type="button" class="ss-prev" onClick=${() => next(-1)} aria-label="Story précédente"></button>
      <button type="button" class="ss-next" onClick=${() => next(1)} aria-label="Story suivante"></button>
      <div class=${'sv-mid' + (src ? ' on-img' : '')}>
        <p class="sv-text">${emoParts(s.text)}</p>
        ${s.photo && !src ? html`<small class="sv-desc">${s.photo.desc}</small>` : null}
        ${P ? html`<div class="sv-poll"><b>${P.q}</b>${P.opts.map((o, k) => {
          const show = s.a === 'p' || P.mine != null, pct = k === 0 ? P.split : 100 - P.split;
          return html`<button type="button" key=${k} class=${'sv-opt' + (P.mine === k ? ' mine' : '')} disabled=${show} onClick=${() => voteStory(g, s, k)}>${show ? html`<i style=${'width:' + pct + '%'}></i>` : null}<span>${o}</span>${show ? html`<em>${pct} %</em>` : null}</button>`;
        })}${s.a === 'p' && tot ? html`<small>${fmtN(tot)} ${plural(tot, 'vote', 'votes')}</small>` : null}</div>` : null}
        ${s.ask ? html`<div class="sv-ask"><b>${s.ask}</b>${s.a === 'p' ? html`<small>${(s.qs || []).filter((x) => x.at <= now).length} ${plural((s.qs || []).filter((x) => x.at <= now).length, 'réponse', 'réponses')}</small>` : html`<small>Réponds-lui en message</small>`}</div>` : null}
      </div>
      ${s.a === 'p' ? html`<div class="sv-foot">
        <button type="button" class="sv-views" onClick=${() => setViews(!views)} aria-expanded=${views ? 'true' : 'false'}><${Icon} n="users" s=${16} /> Vu par ${fmtN(storyViewsN(s, now))}</button>
        ${views ? html`<div class="sv-list">
          ${seen.length ? seen.slice().reverse().map((x) => { const w = author(g, x.a), v = (s.voters || []).find((y) => y.a === x.a && y.at <= now); return html`<div class="sv-who" key=${x.a}><${Avatar} who=${w} size=${32} /><div class="sv-wn"><b>${w.name}</b>${v ? html`<small>a voté « ${P.opts[v.k]} »</small>` : null}</div><span class="sv-at">${fmtAgo(x.at, now)}</span></div>`; }) : html`<small class="muted">Personne de ton entourage pour l’instant.</small>`}
          ${(s.qs || []).filter((x) => x.at <= now).map((q, j) => html`<div class="sv-q" key=${j}><small>@${q.by} demande</small><p>${q.text}</p><button type="button" class="linkbtn" onClick=${() => { close(); openCompose({ text: `« ${q.text} » (@${q.by}) → ` }); }}>Répondre en public</button></div>`)}
        </div>` : null}
      </div>` : canDM ? html`<div class="sv-foot">
        <div class="sv-reacts" role="group" aria-label="Réagir">${STORY_REACTS.map((e) => html`<button type="button" key=${e} class=${'sv-re' + (s.reacted === e ? ' on' : '')} onClick=${() => { reactStory(g, s, e); toast(`Réaction envoyée à ${firstName(c)}.`); }}>${emoParts(e)}</button>`)}</div>
        <div class="sv-reply"><input class="input" maxlength=${DM_MAX} placeholder=${'Répondre à ' + firstName(c) + '…'} value=${val} onFocus=${() => setHold(true)} onBlur=${() => { if (!val.trim()) setHold(false); }} onInput=${(e) => setVal(e.target.value)} onKeyDown=${(e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); send(); } }} />
          <button type="button" class="send" onClick=${send} disabled=${!val.trim() || dmBusy(c.id)} aria-label="Envoyer"><${Icon} n="send" s=${16} /></button></div>
      </div>` : null}
    </div>
  </div>`;
}
// Posting one: a few words on a colour, and a poll or a question if the player wants.
function StoryNewLayer({ g, now, i }) {
  const [d, setD] = useState({ text: '', hue: STORY_HUES[0], extra: '', q: '', a: '', b: '' });
  const set = (k, v) => setD(Object.assign({}, d, { [k]: v }));
  const busy = !!S.busy.story;
  const ok = d.text.trim().length >= 1 && !busy && canAfford(g, 'reply') && (d.extra !== 'poll' || (d.q.trim() && d.a.trim() && d.b.trim())) && (d.extra !== 'ask' || d.q.trim());
  const go = async () => {
    if (!ok) return;
    const x = { text: d.text, hue: d.hue, poll: d.extra === 'poll' ? { q: d.q, a: [d.a, d.b] } : null, ask: d.extra === 'ask' ? d.q : '' };
    closeLayer();
    const s = await postStory(x);
    if (s) toast('Ta story est en ligne pour 24 h.', 'good');
  };
  return html`<${LayerShell} i=${i} title="Nouvelle story">
    <div class="sn">
      <div class="sn-prev" style=${'--h:' + d.hue}><p>${d.text.trim() ? emoParts(d.text) : html`<span class="muted-w">Écris ta story…</span>`}</p></div>
      <textarea class="input" rows="3" maxlength="160" placeholder="Ce que tu vis, là, maintenant…" value=${d.text} onInput=${(e) => set('text', e.target.value)}></textarea>
      <div class="sn-hues" role="group" aria-label="Couleur">${STORY_HUES.map((h) => html`<button type="button" key=${h} class=${'sn-hue' + (d.hue === h ? ' on' : '')} style=${'--h:' + h} onClick=${() => set('hue', h)} aria-label=${'Couleur ' + h} aria-pressed=${d.hue === h ? 'true' : 'false'}></button>`)}</div>
      <div class="seg" role="group" aria-label="Ajouter">${[['', 'Rien de plus'], ['poll', 'Un sondage'], ['ask', 'Une question']].map(([k, label]) => html`<button type="button" key=${k} class=${d.extra === k ? 'on' : ''} onClick=${() => set('extra', k)}>${label}</button>`)}</div>
      ${d.extra === 'poll' ? html`<div class="sn-x"><input class="input" maxlength="60" placeholder="Ta question (ex : je teinte en rose ?)" value=${d.q} onInput=${(e) => set('q', e.target.value)} /><div class="sn-ab"><input class="input" maxlength="30" placeholder="Réponse 1" value=${d.a} onInput=${(e) => set('a', e.target.value)} /><input class="input" maxlength="30" placeholder="Réponse 2" value=${d.b} onInput=${(e) => set('b', e.target.value)} /></div></div>` : null}
      ${d.extra === 'ask' ? html`<div class="sn-x"><input class="input" maxlength="60" placeholder="Ex : posez-moi vos questions !" value=${d.q} onInput=${(e) => set('q', e.target.value)} /></div>` : null}
      <button type="button" class="btn btn-hot btn-block" onClick=${go} disabled=${!ok}>${busy ? 'Une story part…' : 'Publier pour 24 h'}</button>
      <small class="muted">Tes abonnés la voient pendant 24 h : certains te répondent en privé.</small>
    </div>
  <//>`;
}

/* ---------- on screen: the groups ---------- */
function GroupRows({ g, now }) {
  const gs = liveGroups(g).slice().sort((a, b) => ((b.msgs[b.msgs.length - 1] || {}).at || b.at) - ((a.msgs[a.msgs.length - 1] || {}).at || a.at));
  if (!gs.length) return null;
  return html`<div class="list-h">Groupes<span>${gs.length}</span></div>${gs.map((gr) => {
    const last = gr.msgs.filter((m) => m.at <= now && !m.sys).pop(), n = unreadGroup(gr, now), ms = groupMembers(g, gr);
    return html`<button key=${gr.id} class=${'convo' + (n ? ' unread' : '')} onClick=${() => openLayer({ t: 'group', id: gr.id })}>
      <span class="gr-avs" aria-hidden="true">${ms.slice(0, 2).map((c) => html`<${Avatar} key=${c.id} who=${author(g, 'c:' + c.id)} size=${34} />`)}</span>
      <div class="mid"><div><b>${gr.emoji} ${gr.name}</b><span>${ms.length + 1} membres</span></div><p>${last ? (last.a === 'p' ? 'Toi : ' : firstName(author(g, last.a)) + ' : ') : ''}${last ? emoParts(last.text) : ''}</p></div>
      <div class="side-meta"><span>${last ? fmtAgo(last.at, now) : ''}</span>${n ? html`<span class="dot-count">${n}</span>` : null}</div>
    </button>`;
  })}`;
}
function GroupLayer({ l, g, now, i }) {
  const gr = groupOf(g, l.id);
  const [val, setVal] = useState('');
  const ref = useRef(null), box = useRef(null);
  const msgs = gr ? gr.msgs.filter((m) => m.at <= now) : [];
  const busy = gr && groupBusy(gr.id);
  const typing = busy || !!(gr && gr.msgs.some((m) => m.at > now && m.at - now < 60000));
  useEffect(() => { if (gr) gr.readAt = Math.max(gr.readAt || 0, Date.now()); const el = box.current && box.current.closest('.layer-body'); if (el) el.scrollTop = el.scrollHeight; }, [msgs.length, typing]);
  if (!gr) return null;
  const ms = groupMembers(g, gr);
  const send = async () => {
    const text = val.trim();
    if (!text || busy) return;
    setVal('');
    if (ref.current) ref.current.style.height = '';
    const ok = await sendGroup(gr.id, text);
    if (ok === false) setVal(text);
  };
  return html`<${LayerShell} i=${i} title=${gr.name}
    head=${html`<div class="who"><span class="gr-avs" aria-hidden="true">${ms.slice(0, 3).map((c) => html`<${Avatar} key=${c.id} who=${author(g, 'c:' + c.id)} size=${30} />`)}</span><div><b>${gr.emoji} ${gr.name}</b><span>Toi, ${ms.map((c) => firstName(c)).join(', ')}</span></div></div>`}
    foot=${gr.left ? html`<p class="muted" style="text-align:center;font-size:13.5px">Tu as quitté ce groupe.</p>` : html`<div>
      <div class="reply-box">
        <textarea ref=${ref} rows="1" maxlength=${DM_MAX} placeholder=${'Message au groupe…'} value=${val} onInput=${(e) => { setVal(e.target.value); autosize(e.target); }}
          onKeyDown=${(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } }}></textarea>
        <button class="send" onClick=${send} disabled=${busy || !val.trim() || !canAfford(g, 'dm')} aria-label="Envoyer"><${Icon} n="send" s=${16} /> Envoyer</button>
      </div>
      <button type="button" class="linkbtn gr-leave" onClick=${() => askConfirm({ title: `Quitter « ${gr.name} » ?`, text: 'Les autres le verront.', ok: 'Quitter le groupe', danger: true, run: () => leaveGroup(g, gr) })}>Quitter le groupe</button>
    </div>`}>
    <div class="bubbles gr-bubbles" ref=${box}>
      <div class="dm-intro"><b>${gr.emoji} ${gr.name}</b><span>Groupe · toi et ${ms.length} ${plural(ms.length, 'autre', 'autres')}</span></div>
      ${msgs.map((m, k) => {
        if (m.sys) return html`<div key=${m.id} class="gr-sys">${m.sys === 'quit' ? `${firstName(author(g, m.a))} a quitté le groupe${m.text ? ' (' + m.text + ')' : ''}` : `Le groupe s’appelle maintenant « ${m.text} »`}</div>`;
        if (m.a === 'p') return html`<div key=${m.id} class="bubble me">${emoParts(m.text)}</div>`;
        const au = author(g, m.a), prev = msgs[k - 1], head = !prev || prev.a !== m.a || prev.sys;
        return html`<div key=${m.id} class="gr-line">${head ? html`<${Avatar} who=${au} size=${28} />` : html`<span class="gr-pad"></span>`}<div>${head ? html`<small class="gr-name" style=${'--h:' + au.hue}>${firstName(au)}</small>` : null}<div class="bubble them">${emoParts(m.text)}</div></div></div>`;
      })}
      ${typing ? html`<div class="bubble them typing-b" aria-label="Le groupe écrit"><${Typing} /></div>` : null}
    </div>
  <//>`;
}
// A screenshot of a group without the player, in the conversation of the friend who sent it.
function LeakCard({ g, m }) {
  return html`<div class="dm-card leak"><span class="evt-kind">📸 Capture d’écran</span>
    <div class="leak-shot"><b>${m.group}</b>${(m.lines || []).map((x, j) => { const au = author(g, x.a); return html`<div key=${j} class="leak-l"><small>${firstName(au)}</small><span>${emoParts(x.text)}</span></div>`; })}</div>
  </div>`;
}
// The ships the player is part of, on their profile.
function ShipsRow({ g }) {
  const sh = shipsOf(g).filter((x) => x.a === 'p' || x.b === 'p');
  if (!sh.length) return null;
  return html`<div class="ships"><span class="lbl">Tes ships</span>${sh.map((x) => html`<button type="button" key=${x.id} class="chip-btn" onClick=${() => openTag(x.tag)}>💞 ${x.tag} · ${whoName(g, x.a === 'p' ? x.b : x.a)}</button>`)}</div>`;
}

/* =========================================================
   The everyday of a network (0.29, the rest): a dig without a name, a soft launch, birthdays, memories, « on t'a
   croisé·e », a ratio, the main character of the day, a drama channel, polls, a pinned comment and the top fan, an
   outage or a new algorithm, and the world in the comments when a post goes around the planet. The AI starts what
   happens; the game keeps what was decided and says what a real network says (a memory, a birthday, a badge).
   ========================================================= */
const dayKey = (t = Date.now()) => { const d = gameDate(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const mdOf = (t = Date.now()) => { const d = gameDate(t); return String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
// A post of the network: what it carries besides its words (a dig at someone, a soft launch, a poll).
function decorateSocial(g, p, o) {
  if (!p || !o) return p;
  const sub = o.sub ? whoAny(g, o.sub) : null;
  if (sub && sub !== p.a && !p.sub) {
    p.sub = sub;
    if (sub === 'p') addNotif(g, { k: 'drama', c: charIdOf(p.a), p: p.id, at: p.at, text: `👀 ${author(g, p.a).name} a posté un truc… qui pourrait bien te viser.` });
  }
  const soft = o.soft ? whoAny(g, o.soft) : null;
  if (soft && soft !== p.a && !p.soft) {
    p.soft = soft;
    if (soft === 'p') addNotif(g, { k: 'vibe', c: charIdOf(p.a), p: p.id, at: p.at, text: `💞 ${author(g, p.a).name} a fait un soft launch… et c’est toi qu’on devine sur la photo.` });
  }
  if (o.poll && !p.poll) p.poll = postPoll(o.poll);
  return p;
}
function postPoll(o) {
  if (!o || typeof o !== 'object') return null;
  const opts = (Array.isArray(o.a) ? o.a : Array.isArray(o.opts) ? o.opts : []).map((x) => str(x, 40)).filter(Boolean).slice(0, 4);
  if (opts.length < 2) return null;
  return { opts, res: pollRes(o.res, opts.length), mine: null };
}
// Percentages that make 100 (the AI's, or a draw).
function pollRes(res, n) {
  let v = Array.isArray(res) && res.length === n ? res.map((x) => Math.max(0, num(x, 0))) : Array.from({ length: n }, () => rand(0.5, 3));
  const sum = v.reduce((a, b) => a + b, 0) || 1;
  v = v.map((x) => Math.round((x / sum) * 100));
  v[0] += 100 - v.reduce((a, b) => a + b, 0);
  return v;
}
function votePoll(g, p, k) {
  if (!p || !p.poll || p.a === 'p' || p.poll.mine != null || !(k >= 0 && k < p.poll.opts.length)) return false;
  p.poll.mine = k;
  const c = p.a.startsWith('c:') ? g.chars[p.a.slice(2)] : null;
  if (c && isMain(c)) touch(c);
  update();
  return true;
}
// What the AI reads of a post besides its words.
function socialPostCtx(g, p) {
  const h = (a) => (a === 'p' ? 'le joueur' : '@' + author(g, a).handle);
  const out = [];
  if (p.sub) out.push(`sous-entendu qui vise ${h(p.sub)}`);
  if (p.soft) out.push(`soft launch : on devine quelqu’un sans le voir (en vrai : ${h(p.soft)})`);
  if (p.poll) out.push(`sondage : ${p.poll.opts.map((o, k) => `${o}${p.poll.res ? ' ' + p.poll.res[k] + ' %' : ''}`).join(' / ')}`);
  if (p.pin) { const r = p.replies.find((x) => x.id === p.pin); if (r) out.push(`commentaire épinglé par le joueur : ${h(r.a)} « ${str(r.text, 60)} »`); }
  if (p.ratio) { const r = p.replies.find((x) => x.id === p.ratio); if (r) out.push(`ratio : la réponse de ${h(r.a)} a fait plus de likes que le post`); }
  return out.length ? ` [${out.join(' ; ')}]` : '';
}

/* ---------- birthdays ---------- */
// Theirs: a day of the year that stays theirs. The player's: in the settings (none until set).
function bdayOf(c) {
  if (!c) return '';
  if (!/^\d\d-\d\d$/.test(c.bday || '')) { const h = hashStr(c.id + ':' + c.name); c.bday = String(1 + (h % 12)).padStart(2, '0') + '-' + String(1 + ((h >> 4) % 28)).padStart(2, '0'); }
  return c.bday;
}
const BDAY_RE = /anniv|joyeux anniversaire|bon anniversaire|happy birthday|\bhbd\b|🎂|🥳/i;
// The player wished it (in private, or in public with their @): it counts once.
function bdayWish(g, c, text) {
  if (!c || !isMain(c) || !BDAY_RE.test(String(text || '')) || bdayOf(c) !== mdOf()) return false;
  const B = g.bdays || (g.bdays = {});
  const k = dayKey();
  if (B[c.id] === k) return false;
  B[c.id] = k;
  applyRel(g, c, 4, 'tu as pensé à son anniversaire', later() + 1500, 6);
  addMem(g, c, 'le joueur m’a souhaité mon anniversaire');
  return true;
}
function bdaysToday(g, t = Date.now()) { const md = mdOf(t); return mains(g).filter((c) => !c.jailed && bdayOf(c) === md); }
// Once a day: whose birthday it is, who was forgotten yesterday, the player's own.
function tickBdays(g, t = Date.now()) {
  const k = dayKey(t);
  if (g.bdayDay === k) return false;
  const prev = g.bdayDay;
  g.bdayDay = k;
  if (prev) for (const c of mains(g)) { // yesterday's birthdays: a close one forgotten notices
    const y = mdOf(t - DAY_MS);
    if (bdayOf(c) !== y || (g.bdays || {})[c.id] === dayKey(t - DAY_MS) || c.cut || c.jailed) continue;
    if (c.rel >= 40 || LOVE_ACTIVE.includes(c.vibe)) {
      applyRel(g, c, -4, 'tu as oublié son anniversaire', later() + 2000, 6);
      addMem(g, c, 'le joueur a oublié mon anniversaire');
      addNotif(g, { k: 'reldown', c: c.id, text: `😕 C’était l’anniversaire de ${firstName(c)} hier… et tu as oublié.` });
    }
  }
  for (const c of bdaysToday(g, t)) {
    const yr = gameDate(t).getFullYear();
    if (c.ageYear && c.ageYear < yr && c.age >= 18) c.age += 1;
    c.ageYear = yr;
    addNotif(g, { k: 'info', c: c.id, text: `🎂 C’est l’anniversaire de ${c.name} aujourd’hui${c.age ? ` (${c.age} ans)` : ''} !` });
  }
  if (g.player.bday && g.player.bday === mdOf(t)) {
    addNotif(g, { k: 'milestone', text: '🎂 Joyeux anniversaire ! Ton réseau le sait…' });
    addTrigger(g, 'C’est l’anniversaire du joueur aujourd’hui : ses proches le lui souhaitent, en public ou en privé (ou l’oublient), ses fans aussi.');
  }
  return true;
}
function bdayCtx(g, t = Date.now()) {
  const L = bdaysToday(g, t).map((c) => `aujourd’hui, c’est l’anniversaire de @${c.handle}${c.age ? ` (${c.age} ans)` : ''}${(g.bdays || {})[c.id] === dayKey(t) ? ' : le joueur le lui a souhaité' : ''}`);
  if (g.player.bday && g.player.bday === mdOf(t)) L.push('aujourd’hui, c’est l’anniversaire du joueur');
  return L.length ? [cap1(L.join(' ; ')) + '.'] : [];
}

/* ---------- memories ---------- */
const MEM_AGO = [[365, 'il y a un an'], [30, 'il y a un mois'], [7, 'il y a une semaine']];
// A post of the player's from a week, a month or a year ago (game time), once a day, unless put away.
function memoryOf(g, now = Date.now()) {
  if (g.memDay === dayKey(now)) return null;
  for (const [d, label] of MEM_AGO) {
    const p = g.posts.filter((x) => x.a === 'p' && x.text && Math.abs(now - x.ts - d * DAY_MS) < 0.5 * DAY_MS).sort((a, b) => (b.likeT || 0) - (a.likeT || 0))[0];
    if (p) return { p, label };
  }
  return null;
}
function MemoryCard({ g, now }) {
  const M = memoryOf(g, now);
  if (!M) return null;
  const hide = () => { g.memDay = dayKey(now); update(false); };
  return html`<div class="mem-card">
    <span class="mem-k">📅 Souvenir · ${M.label}, tu postais</span>
    <p>« ${emoParts(str(M.p.text, 200))} »</p>
    <div class="row" style="gap:6px"><button type="button" class="btn btn-hot btn-sm" onClick=${() => { hide(); openCompose({ quote: M.p.id, text: `${cap1(M.label)}… ` }); }}>Repartager</button><button type="button" class="btn btn-ghost btn-sm" onClick=${hide}>Masquer</button></div>
  </div>`;
}

/* ---------- a ratio ---------- */
// Under a post of the player: a reply the public liked more (the AI says which). The player may ratio someone too.
function ratioMark(g, p, r) {
  if (!p || !r || p.a !== 'p' || p.ratio || r.a === 'p') return false;
  r.likeT = Math.round(Math.max(p.likeT || 0, 10) * rand(1.2, 1.8)) + randi(2, 20);
  p.ratio = r.id;
  const au = author(g, r.a), dr = repMove(g, { image: -1.5 }, 'tu t’es fait ratio');
  addNotif(g, { k: 'reldown', c: au.id && au.id !== 'p' ? au.id : null, p: p.id, at: r.at + 20000, text: `💀 Ratio : la réponse de ${au.name} fait plus de likes que ton post${repBit(dr, ' (', ')')}.` });
  addTrigger(g, `@${au.handle} a « ratio » le joueur (sa réponse fait plus de likes que son post) : le public en rit, le joueur peut répondre ou laisser couler.`);
  return true;
}
function ratioCheck(ctx) {
  const g = ctx.g, r = ctx.mine, p = ctx.target, t = Date.now();
  if (ctx.kind !== 'reply' || !r || !p || p.a === 'p' || p.ratioBy || !ctx.eval || ctx.eval.reception < 5 || t - (g.ratioAt || 0) < 12 * HR) return false;
  if (!((r.likeT || 0) >= 20 && (r.likeT || 0) > (p.likeT || 0) * 1.2)) return false;
  p.ratioBy = r.id;
  g.ratioAt = t;
  const au = author(g, p.a), c = p.a.startsWith('c:') ? g.chars[p.a.slice(2)] : null;
  const dr = repMove(g, { image: 1 }, `tu as ratio ${au.name}`);
  addNotif(g, { k: 'viral', p: p.id, at: later() + 2500, text: `😎 Ratio : ta réponse fait plus de likes que le post de ${au.name}${repBit(dr, ' (', ')')}.` });
  if (c && isMain(c)) applyRel(g, c, -3, 'tu l’as ratio', later() + 3000, 4);
  return true;
}

/* ---------- the main character of the day, an outage, a new algorithm ---------- */
const ALGO_FMTS = { video: 'vidéos longues', short: 'formats courts', photo: 'photos', texte: 'posts texte', live: 'lives' };
const algoPut = (f) => (f === 'video' || f === 'photo' ? 'mises' : 'mis'); // (« les photos sont mises en avant »)
const normFmt = (f) => { f = plainOf(f); return /short|court|tiktok|reel/.test(f) ? 'short' : /live|direct|stream/.test(f) ? 'live' : /photo|image|selfie|carrou/.test(f) ? 'photo' : /text|ecri|thread/.test(f) ? 'texte' : 'video'; };
const algoOn = (g, t = Date.now()) => (g.algo && t < g.algo.until ? g.algo : null);
const outageOn = (g, t = Date.now()) => (g.outage && t < g.outage.until ? g.outage : null);
// What the algorithm of the moment does to a post or a release of the player (×1.3 for its format, a little less for the others).
function algoMult(g, fmt) { const A = algoOn(g); return A ? (A.favors === fmt ? 1.3 : 0.88) : 1; }
const fmtOfAct = (vid, photo) => (vid ? (/short|tiktok|reel/i.test(vid.r.what) ? 'short' : /live/i.test(vid.r.what) ? 'live' : 'video') : photo ? 'photo' : 'texte');
function setMainDay(g, o, at) {
  const k = dayKey();
  if (g.mainDay && g.mainDay.day === k) return null;
  const a = whoAny(g, o.who);
  if (!a) return null;
  g.mainDay = { a, why: str(o.why, 90), day: k, at: at || later() };
  if (a === 'p') {
    const s = g.stats, fol = grow(s.followers, Math.round(Math.max(30, s.followers * rand(0.03, 0.08))));
    if (fol > 0) { s.followers += fol; checkMilestones(g); }
    addNotif(g, { k: 'viral', at: g.mainDay.at, text: `🎬 Tu es le personnage principal du jour sur le réseau${g.mainDay.why ? ' : ' + g.mainDay.why : ''}. Tout le monde a un avis (${nAbonnes(fol, true)}).` });
    addTrigger(g, `Le joueur est le personnage principal du jour sur le réseau${g.mainDay.why ? ` (${g.mainDay.why})` : ''} : tout le monde a un avis sur lui (mèmes, moqueries, défense, théories).`);
  }
  return g.mainDay;
}
function setOutage(g, o, at) {
  const t = at || later();
  if (outageOn(g, t) || t - (g.outageAt || 0) < 3 * DAY_MS) return null;
  g.outage = { at: t, until: t + int(o.min, 10, 90, 30) * 60000, why: str(o.why, 70) };
  g.outageAt = t;
  addNotif(g, { k: 'screen', at: t, text: `⚠️ Le réseau est en panne${g.outage.why ? ' (' + g.outage.why + ')' : ''} : impossible de publier pour l’instant.` });
  return g.outage;
}
function setAlgo(g, o, at) {
  const t = at || later();
  if (algoOn(g, t) || t - (g.algoAt || 0) < 7 * DAY_MS) return null;
  const favors = normFmt(o.favors), days = int(o.days, 2, 7, 4);
  g.algo = { favors, at: t, until: t + days * DAY_MS, why: str(o.why, 90) };
  g.algoAt = t;
  addNotif(g, { k: 'trend', at: t, text: `📈 Nouvel algorithme : les ${ALGO_FMTS[favors]} sont ${algoPut(favors)} en avant pendant ${days} jours${g.algo.why ? ' (' + g.algo.why + ')' : ''}.` });
  return g.algo;
}
function tickNet(g, t = Date.now()) {
  let ch = false;
  if (g.outage && !g.outage.over && t >= g.outage.until) {
    g.outage.over = true;
    addNotif(g, { k: 'info', at: t, text: '✅ Le réseau est revenu. Tu peux publier.' });
    addTrigger(g, `Le réseau revient d’une panne de ${Math.round((g.outage.until - g.outage.at) / 60000)} min : tout le monde en parle (« c’était pas mon wifi », mèmes, ceux qui ont cru être bannis).`);
    ch = true;
  }
  if (tickBdays(g, t)) ch = true;
  return ch;
}
// A drama channel: a media of its own kind, once (a refresh line).
function addDramaChannel(g, o) {
  if (medias(g).some((c) => c.drama) || medias(g).length >= 5) return null;
  const c = addCharFromAI(g, Object.assign({}, o, { followers: o.followers || randi(40000, 160000) }), { unlocked: true, kind: 'media', rename: true });
  if (!c) return null;
  c.drama = 1;
  addNotif(g, { k: 'new', c: c.id, text: `☕ Une chaîne de drama vient d’ouvrir : ${c.name} (@${c.handle}). Plus aucun clash ne passera inaperçu.` });
  return c;
}

/* ---------- the top fan, the pinned comment ---------- */
// Whoever answered the player's posts the most these last seven days (three times at least): the badge, until it moves.
function topFanOf(g, now = Date.now()) {
  const k = dayKey(now);
  if (g.topFan && g.topFan.day === k) return g.topFan.a;
  const n = {};
  for (const p of g.posts) {
    if (p.a !== 'p' || now - p.ts > 7 * DAY_MS) continue;
    for (const r of p.replies) if (r.a !== 'p' && r.at <= now && !(r.a.startsWith('n:') && g.npcs[r.a.slice(2)] && (g.npcs[r.a.slice(2)].fake || g.npcs[r.a.slice(2)].mom))) n[r.a] = (n[r.a] || 0) + 1;
  }
  const best = Object.entries(n).sort((x, y) => y[1] - x[1])[0];
  g.topFan = { day: k, a: best && best[1] >= 3 ? best[0] : null };
  return g.topFan.a;
}
function TopFanTag({ g, a }) {
  return a && topFanOf(g) === a ? html`<span class="topfan" title="A le plus commenté tes posts cette semaine">💎 Top fan</span>` : null;
}
function pinReply(g, p, r) {
  if (!p || p.a !== 'p' || !r || r.a === 'p') return false;
  if (p.pin === r.id) { p.pin = null; update(); return true; }
  p.pin = r.id;
  const c = r.a.startsWith('c:') ? g.chars[r.a.slice(2)] : null;
  if (c && isMain(c) && !(r.pinned)) { applyRel(g, c, 2, 'tu as épinglé son commentaire', later() + 800, 3); addMem(g, c, 'le joueur a épinglé mon commentaire sous son post'); }
  r.pinned = true;
  update();
  return true;
}
const pinFirst = (p, rows) => { if (!p.pin) return rows; const k = rows.findIndex((x) => x.r.id === p.pin); if (k <= 0) return rows; const row = Object.assign({}, rows[k], { depth: 0, parent: null }); return [row, ...rows.slice(0, k), ...rows.slice(k + 1)]; };

/* ---------- what the AI reads and may start (the rest) ---------- */
function netCtx(g, now = Date.now()) {
  const L = bdayCtx(g, now);
  if (g.mainDay && g.mainDay.day === dayKey(now)) L.push(`Personnage principal du jour sur le réseau : ${g.mainDay.a === 'p' ? 'le joueur' : '@' + author(g, g.mainDay.a).handle}${g.mainDay.why ? ` (${g.mainDay.why})` : ''}.`);
  const A = algoOn(g, now);
  if (A) L.push(`Algorithme du moment : les ${ALGO_FMTS[A.favors]} sont ${algoPut(A.favors)} en avant (les créateurs en parlent).`);
  const O = outageOn(g, now);
  if (O) L.push(`LE RÉSEAU EST EN PANNE depuis ${fmtDur(now - O.at)} : presque rien ne passe, les gens s’en plaignent ailleurs.`);
  const dc = medias(g).find((c) => c.drama);
  if (dc) L.push(`@${dc.handle} est une chaîne de drama : elle couvre chaque clash du réseau (threads, « tout ce qu’on sait sur… »), sans méchanceté gratuite.`);
  const tf = topFanOf(g, now);
  if (tf) L.push(`${tf.startsWith('c:') ? '@' + author(g, tf).handle : '@' + tf.slice(2)} a le badge « top fan » du joueur (le plus de commentaires sur ses posts cette semaine).`);
  return L;
}
function netLines(g, t = Date.now()) {
  const L = [];
  if (offer(0.5)) L.push('- Facultatif, de temps en temps, sur un de tes posts : "sub":"handle visé" (un sous-entendu : une pique sans nommer personne), "soft":"handle" (un « soft launch » : on devine quelqu’un sans le voir ; secret) ou "poll":{"a":["choix 1","choix 2"],"res":[60,40]} (un sondage, 2 à 4 choix, res en pourcentages).');
  if (g.stats.followers >= 1000 && offer(0.25)) L.push('- Facultatif, rare : quelqu’un du public a croisé le joueur en vrai (rue, soirée, son dernier rendez-vous) : un post qui le mentionne (« je viens de croiser @… »).');
  if (!(g.mainDay && g.mainDay.day === dayKey(t)) && offer(0.4)) L.push('- Facultatif (une fois par jour du jeu au plus) : {"t":"maindujour","who":"handle","why":"≤ 80 caractères"} : le « personnage principal du jour », celui ou celle dont tout le réseau parle (une bourde, une phrase, une photo), parfois le joueur.');
  if (!medias(g).some((c) => c.drama) && offer(0.3)) L.push('- Facultatif, une seule fois : une chaîne de drama ouvre (elle résume les clashs) : {"t":"media","drama":true,"name":"…","handle":"…","emoji":"☕","role":"chaîne de drama","bio":"≤ 110 caractères","followers":90000}.');
  if (!outageOn(g, t) && t - (g.outageAt || 0) > 3 * DAY_MS && offer(0.1)) L.push('- Très rare : {"t":"panne","min":30,"why":"≤ 60 caractères"} : le réseau tombe en panne (10 à 90 min).');
  if (!algoOn(g, t) && t - (g.algoAt || 0) > 7 * DAY_MS && offer(0.15)) L.push('- Rare : {"t":"algo","favors":"video","days":4,"why":"≤ 80 caractères"} : la plateforme change son algorithme (favors parmi video, short, photo, texte, live).');
  return L;
}
function applyNetLine(g, o, effects) {
  switch (o.t) {
    case 'maindujour': { const at = later() + rand(3000, 9000); effects.push(() => setMainDay(g, o, at)); return true; }
    case 'panne': { const at = later() + rand(2000, 6000); effects.push(() => setOutage(g, o, at)); return true; }
    case 'algo': { const at = later() + rand(3000, 9000); effects.push(() => setAlgo(g, o, at)); return true; }
    case 'media': if (o.drama === true || o.drama === 'true') { addDramaChannel(g, o); return true; } return false; // (now: its first post may follow)
    default: return false;
  }
}
// The world in the comments: a post gone viral gets answers from abroad (in their language, translated on demand).
const WORLD_LINE = '- Le post a fait le tour du monde : 2 ou 3 de ces réponses viennent de l’étranger, dans leur langue (anglais, espagnol, portugais, japonais, coréen, arabe…) : ajoute à chacune "lang":"en" (le code de sa langue) et "fr":"sa traduction en français".';
function replyLang(r, o) {
  const lang = plainOf(o && o.lang).replace(/[^a-z-]/g, '').slice(0, 5), fr = str(o && o.fr, 300);
  if (r && lang && lang !== 'fr' && fr && fr !== r.text) { r.lang = lang; r.fr = fr; }
  return r;
}
const LANG_NAMES = { en: 'l’anglais', es: 'l’espagnol', pt: 'le portugais', ja: 'le japonais', ko: 'le coréen', ar: 'l’arabe', de: 'l’allemand', it: 'l’italien', zh: 'le chinois', ru: 'le russe', tr: 'le turc', nl: 'le néerlandais', hi: 'l’hindi', pl: 'le polonais' };

/* ---------- on screen (the rest) ---------- */
// On top of the feed: the network is down, the algorithm changed, the main character of the day.
function NetBanner({ g, now }) {
  const O = outageOn(g, now), A = algoOn(g, now), M = g.mainDay && g.mainDay.day === dayKey(now) && now >= g.mainDay.at ? g.mainDay : null;
  if (!O && !A && !M) return null;
  const who = M ? author(g, M.a) : null;
  return html`<div class="net-bans">
    ${O ? html`<div class="net-ban bad"><span aria-hidden="true">⚠️</span><span><b>Le réseau est en panne</b>${O.why ? ' · ' + O.why : ''}. Retour estimé dans ${fmtDur(O.until - now)}.</span></div>` : null}
    ${A ? html`<div class="net-ban"><span aria-hidden="true">📈</span><span><b>Nouvel algorithme</b> : les ${ALGO_FMTS[A.favors]} sont ${algoPut(A.favors)} en avant encore ${fmtDur(A.until - now)}.</span></div>` : null}
    ${M ? html`<button type="button" class=${'net-ban main' + (M.a === 'p' ? ' me' : '')} onClick=${() => openAuthor(who)}><span aria-hidden="true">🎬</span><span><b>Personnage principal du jour : ${M.a === 'p' ? 'toi' : who.name}</b>${M.why ? ' · ' + M.why : ''}</span></button>` : null}
  </div>`;
}
// A poll in a post: the player's own (the results as the votes come in), or someone else's (vote, then the results).
function PollCard({ g, p, now }) {
  const P = p.poll, mine = p.a === 'p', show = mine ? !!P.res : P.mine != null;
  const votes = Math.max(0, Math.round(shownLikes(p, now) * 0.6) + (P.mine != null ? 1 : 0));
  return html`<div class="poll-card" onClick=${(e) => e.stopPropagation()}>
    ${P.opts.map((o, k) => (show
      ? html`<div key=${k} class=${'poll-opt done' + (P.mine === k ? ' mine' : '')}><i style=${'width:' + (P.res ? P.res[k] : 0) + '%'}></i><span>${o}</span><em>${P.res ? P.res[k] + ' %' : ''}</em></div>`
      : html`<button type="button" key=${k} class="poll-opt" disabled=${mine} onClick=${() => votePoll(g, p, k)}><span>${o}</span></button>`))}
    <small>${mine && !P.res ? 'Les votes arrivent…' : `${fmtN(votes)} ${plural(votes, 'vote', 'votes')}`}</small>
  </div>`;
}

// The player's birthday (day and month, in the settings): their network wishes it… or forgets.
function BdayField({ g }) {
  const v = g.player.bday || '', [m, d] = v ? v.split('-').map((x) => +x) : [0, 0];
  const cur = () => (g.player.bday ? g.player.bday.split('-').map((x) => +x) : [0, 0]); // (what is set now: two picks in a row)
  const set = (mm, dd) => { g.player.bday = mm && dd ? String(mm).padStart(2, '0') + '-' + String(Math.min(dd, [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mm - 1])).padStart(2, '0') : ''; update(); };
  return html`<div class="field bday-field">
    <span class="lbl">Ton anniversaire</span>
    <div class="row" style="gap:6px;flex-wrap:nowrap">
      <select class="input" aria-label="Jour" value=${d || ''} onChange=${(e) => set(cur()[0] || 1, +e.target.value)}><option value="">Jour</option>${Array.from({ length: 31 }, (_, k) => html`<option key=${k} value=${k + 1}>${k + 1}</option>`)}</select>
      <select class="input" aria-label="Mois" value=${m || ''} onChange=${(e) => set(+e.target.value, cur()[1] || 1)}><option value="">Mois</option>${MONTHS.map((x, k) => html`<option key=${k} value=${k + 1}>${x}</option>`)}</select>
      ${v ? html`<button type="button" class="linkbtn" onClick=${() => set(0, 0)}>Effacer</button>` : null}
    </div>
    <small class="muted">${v ? `Le ${d} ${MONTHS[m - 1]} (temps du jeu), ton réseau le saura.` : 'Facultatif : le jour venu, ton réseau te le souhaite… ou oublie.'}</small>
  </div>`;
}
