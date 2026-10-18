/* =========================================================
   0.21: the community (« ta commu »): how warm it is with the player, the fans who write, the questions they ask,
   the regulars; in lives, the donations.
   - The warmth (0 to 100) rises when the player answers the fans, makes videos on their questions, thanks those who
     give, goes live; it falls with a bad buzz, a scam promoted, fans left without an answer, begging for money.
   - Fans write in private during the feed's refreshes: the AI decides who and what (a question, an idea, a word).
   - A video on a fan's question: the fan becomes a regular (comes back, gives more in lives, defends the player).
   Nothing here calls the AI on its own.
   ========================================================= */
const WARM_WORDS = [[80, 'soudée', '🔥'], [60, 'chaleureuse', '🧡'], [40, 'tiède', '🙂'], [20, 'froide', '🥶'], [0, 'glaciale', '🧊']];
const WARM0 = 40;
// A day of the game's own calendar (the watch moves the game's clock, not the computer's): what happens once a day.
const gameDay = (t = Date.now()) => Math.floor((t + clockOff()) / DAY_MS);
const warmOf = (g) => (g && g.career && typeof g.career.warmth === 'number' ? g.career.warmth : WARM0);
const warmWord = (w) => WARM_WORDS.find(([m]) => w >= m) || WARM_WORDS[WARM_WORDS.length - 1];
// What warms gets harder the warmer it already is (×0,67 at 40, ×0,33 at 80); what cools does not.
const warmGain = (w, d) => (d > 0 ? d * Math.max(0.1, 1 - w / 120) : d);
function warmMove(g, d, why, t = Date.now()) {
  const c = g && g.career;
  if (!c || !d) return 0;
  const w0 = warmOf(g), w1 = clamp(Math.round((w0 + warmGain(w0, d)) * 10) / 10, 0, 100);
  c.warmth = w1;
  const log = c.warmLog || (c.warmLog = []);
  log.push({ at: t, d: Math.round((w1 - w0) * 10) / 10, why: str(why, 80) });
  if (log.length > 30) log.splice(0, log.length - 30);
  return w1 - w0;
}

/* ---------- the fans who write ---------- */
const FAN_OPEN_MAX = 3; // messages waiting for an answer at once
const fanList = (g) => Object.values(g.chars).filter((c) => c.kind === 'fan' && c.fan);
const fansWaiting = (g) => fanList(g).filter((c) => c.fan.open).sort((a, b) => a.fan.at - b.fan.at);
const fanQuestions = (g) => fanList(g).filter((c) => c.fan.q && !c.fan.video).sort((a, b) => b.fan.at - a.fan.at);
const fanPlanned = (g, c) => plannedReleases(g).some((r) => r.fanQ === c.id); // 0.27.6: a video on it already planned
const fanRegulars = (g) => fanList(g).filter((c) => c.regular);
const fanLineOK = (g, t = Date.now()) => g.stats.followers >= 300 && fansWaiting(g).length < FAN_OPEN_MAX && t >= (g.career.fanAt || 0);
// The line a refresh may write: a fan (an adult of this world, never a main character) writes to the player.
const FAN_LINE = '- Facultatif (souvent) : un abonné du joueur lui écrit en privé, un adulte de ce monde, jamais un personnage principal : une question sur ses vidéos ou sur sa vie, une idée de sujet, un mot gentil ou un souci. {"t":"fan","name":"Prénom Nom","handle":"pseudo","g":"f, m ou x","bio":"qui c’est, ≤ 50 caractères","text":"son message, ≤ 180 caractères","q":true} (q = true si c’est une question à laquelle le joueur pourrait répondre en vidéo).';
function fanMessage(g, o, t = Date.now()) {
  if (!fanLineOK(g, t)) return null;
  const text = str(o.text, 200);
  if (!text) return null;
  const F = { kind: 'fan', handle: o.handle, g: o.g, tag: 'fan', role: 'Abonné·e', bio: str(o.bio, 60) || 'abonné·e de ta chaîne', emoji: '💌', followers: randi(40, 900), rel: 15, minAge: 18,
    personality: 'un·e abonné·e qui suit le joueur depuis un moment : sincère, un peu impressionné·e, touché·e qu’on lui réponde', voice: 'spontané, familier, quelques emojis' };
  const c = addContact(g, Object.assign({ name: o.name }, F)) || addContact(g, F); // (a name already taken: another one)
  if (!c) return null;
  c.fan = { q: o.q === true || o.q === 'true', text, at: t, open: true };
  g.career.fanAt = t + randi(8, 20) * 3600000;
  addIncomingDM(g, c, text, later() + 800, { max: 300 }); // (told like any message)
  return c;
}
// The player answers a fan: the community warms up (once per fan and per day).
function fanAnswered(g, c, t = Date.now()) {
  if (!c || c.kind !== 'fan' || !c.fan) return false;
  const first = c.fan.open;
  c.fan.open = false;
  if (t - (c.fan.lastAnswer || 0) < DAY_MS) return false;
  c.fan.lastAnswer = t;
  c.rel = clamp((c.rel || 0) + (first ? 5 : 2), -100, 100);
  warmMove(g, first ? 3 : 1, `tu as répondu à ${c.name.split(' ')[0]}, ${gx(c.g, 'un abonné', 'une abonnée', 'un·e abonné·e')}`, t);
  return true;
}
// A release that answers a fan's question: the fan becomes a regular, the community warms up a lot.
function fanVideoDone(g, r, post) {
  const c = r && r.fanQ ? g.chars[r.fanQ] : null;
  if (!c || !c.fan || c.fan.video) return false; // (0.27.6: one question, one video that counts)
  c.fan.video = post ? post.id : 'done';
  c.fan.open = false;
  c.regular = true;
  c.rel = clamp((c.rel || 0) + 15, -100, 100);
  warmMove(g, 8, `une vidéo sur la question de ${c.name.split(' ')[0]}`);
  addIncomingDM(g, c, pick(['TU AS RÉPONDU À MA QUESTION EN VIDÉO 😭 merci merci, je l’ai partagée partout', 'je viens de voir la vidéo… c’est ma question !! t’es trop gentil·le, je suis là pour de bon 💛', 'oh la la ma question en vidéo, j’en reviens pas. merci, sincèrement 🙏']), later() + 4000, { max: 300 });
  addNotif(g, { k: 'relup', c: c.id, text: `💛 ${c.name} devient ${gx(c.g, 'un habitué', 'une habituée', 'un·e habitué·e')} de ta commu : tu as répondu à sa question en vidéo.` });
  return true;
}
// The topic of a video on a fan's question.
const qaTopic = (c) => { const t = String(c.fan.text || ''), q = t.length > 52 ? t.slice(0, 52).replace(/[\s,;:!?.]+\S*$/, '') + '…' : t; return `Je réponds à ${c.name.split(' ')[0]} : ${q}`.slice(0, 80); };
// A release on a fan's question, as the AI should see it.
const fanVideoLine = (g, r) => { const c = r && r.fanQ ? g.chars[r.fanQ] : null; return c && c.fan ? `C’est une vidéo « vos questions » : le joueur répond à la question de son abonné·e @${c.handle} (« ${str(c.fan.text, 120)} »). @${c.handle} réagit forcément, ravi·e.` : ''; };

/* ---------- the clock: fans left without an answer, the warmth that drifts back ---------- */
function tickCommu(g, t = Date.now()) {
  const c = g.career;
  if (!c) return false;
  let ch = false;
  for (const f of fanList(g)) if (f.fan.open && !f.fan.ignored && t - f.fan.at > 3 * DAY_MS) { f.fan.ignored = true; warmMove(g, -1.5, `${f.name.split(' ')[0]} attend toujours ta réponse`, t); ch = true; }
  if (g.pbb && g.pbb.at && c.warmPbb !== g.pbb.at) { c.warmPbb = g.pbb.at; warmMove(g, -8, 'ton bad buzz', t); ch = true; } // any bad buzz of the player
  const day = gameDay(t);
  if (c.warmDay !== day) { // little by little, back toward lukewarm (faster from far): a warm community needs care
    if (c.warmDay != null) { const w = warmOf(g), dd = Math.round((WARM0 - w) * 0.03 * 10) / 10; if (Math.abs(dd) >= 0.1) { c.warmth = clamp(Math.round((w + dd) * 10) / 10, 0, 100); (c.warmLog || (c.warmLog = [])).push({ at: t, d: dd, why: 'le temps passe' }); } }
    c.warmDay = day;
  }
  return ch;
}
// What the prompts know of the community.
function commuCtx(g) {
  const w = warmOf(g), W = warmWord(w), regs = fanRegulars(g).slice(-6);
  return `Sa commu : ${W[1]} (${Math.round(w)}/100)${regs.length ? ` ; ses habitués, des abonnés fidèles qui commentent souvent, le soutiennent en live et le défendent : ${regs.map((c) => '@' + c.handle).join(', ')}` : ''}${membCtx(g)}.`;
}
// What a player's own post says about money: asking for donations cools the community.
const BEG_RE = /\b(faites? (un )?don|donnez|soutenez[- ]moi|tipeee|paypal|cagnotte|lien de don|super ?chats?|abonnez[- ]vous .*payant)/i;
function postCommu(g, text) { if (BEG_RE.test(String(text || ''))) warmMove(g, -3, 'tu réclames des dons'); }

/* ---------- the Studio: « Ta commu » ---------- */
function CommuSection({ g, now }) {
  const w = warmOf(g), W = warmWord(w);
  const qs = fanQuestions(g).slice(0, 4), wait = fansWaiting(g), regs = fanRegulars(g);
  const log = (g.career.warmLog || []).slice(-4).reverse();
  return html`<section class="section commu-sec">
    <div class="section-h"><h3>Ta commu</h3><span>${W[2]} ${cap1(W[1])}</span></div>
    <${Meter} frac=${w / 100} tone=${w >= 60 ? 'good' : w < 25 ? 'bad' : ''} />
    <p class="muted">Ce qui la réchauffe : répondre à tes abonnés, faire des vidéos sur leurs questions, remercier ceux qui te soutiennent en live. Ce qui la refroidit : les bad buzz, les arnaques dont tu fais la promo, les messages laissés sans réponse, réclamer des dons.</p>
    ${wait.length ? html`<p class="commu-wait">💌 ${wait.length} ${plural(wait.length, 'message d’abonné attend', 'messages d’abonnés attendent')} ta réponse.</p>` : null}
    ${qs.length ? html`<div class="fan-qs">${qs.map((c) => html`<div class="fan-q" key=${c.id}>
      <${Avatar} who=${author(g, 'c:' + c.id)} size=${36} onClick=${() => openDM(c.id)} />
      <div class="mid"><b>${c.name}</b><span>« ${str(c.fan.text, 120)} »</span>
        <div class="row"><button class="btn btn-ghost btn-sm" onClick=${() => openDM(c.id)}><${Icon} n="msg" s=${14} /> Répondre</button>${fanPlanned(g, c) ? html`<span class="chip">📅 Vidéo prévue</span>` : html`<button class="btn btn-hot btn-sm" disabled=${!planRoom(g)} onClick=${() => openLayer({ t: 'series', id: 'single', fanQ: c.id })}><${Icon} n="calendar" s=${14} /> En faire une vidéo</button>${planRoom(g) ? null : html`<small class="muted">${MAX_PLANNED} sorties déjà prévues</small>`}`}</div></div>
    </div>`)}</div>` : html`<p class="muted">${g.stats.followers < 300 ? 'Tes abonnés t’écriront à partir de 300 abonnés.' : 'Pas de question d’abonné en attente. Elles arrivent en message privé, quand ton fil bouge.'}</p>`}
    ${regs.length ? html`<p class="commu-regs">💛 Tes habitués : ${regs.slice(-8).map((c) => c.name.split(' ')[0]).join(', ')}</p>` : null}
    <${MembBlock} g=${g} />
    ${log.length ? html`<details class="ledger"><summary>Ce qui a bougé</summary><ul>${log.map((x, k) => html`<li key=${k}><span>${x.why}</span><b class=${x.d < 0 ? 'neg' : 'pos'}>${x.d > 0 ? '+' : '−'}${fmtDec(Math.abs(x.d))}</b></li>`)}</ul></details>` : null}
  </section>`;
}

/* ---------- 0.21: the donations in lives (Super Chats, gifts, bits): the warmer the community, the more it gives ---------- */
// What the creator keeps of a donation, by platform; donations come once the account can receive them (500 followers,
// and ads not cut for warnings).
const DON_SHARE = { youtube: 0.7, twitch: 0.5, tiktok: 0.5, instagram: 0.8 };
const donOK = (g) => !!DON_SHARE[platformOf(g)] && g.stats.followers >= 500 && !demonetized(g);
// The line the AI may write during a live: donors and their messages (the game sets the amounts).
const DON_LINE = '- Puis 2 à 4 lignes de dons envoyés pendant le live par des abonnés (souvent ses habitués) : {"t":"don","by":"handle","text":"le message qui accompagne le don, ≤ 100 caractères"} (le montant, c’est le jeu qui le fixe).';
// About 100 € per 1 000 viewers at the same time for a lukewarm community, two to three times more when it is warm;
// each regular there gives a little more.
function donTotal(g, views) {
  if (!donOK(g)) return 0;
  const cc = Math.max(1, Math.round(views * 0.25)), w = warmOf(g);
  const k = Math.pow(Math.max(5, w) / WARM0, 1.5), regs = Math.min(fanRegulars(g).length, 12);
  return Math.max(0, Math.round(cc / 1000 * 100 * k * rand(0.7, 1.3) + regs * randi(5, 25)));
}
// After a live: the donations, split among the donors the AI wrote (the rest: « and N others »), booked for the month.
function liveDonations(g, post, views, dons) {
  const total = donTotal(g, views);
  if (!total || !post || !post.video) return 0;
  const list = (dons || []).slice(0, 4).map((x) => ({ by: normHandle(x.by) || 'anonyme', text: str(x.text, 100), w: rand(0.6, 1.6) }));
  const named = list.length ? Math.min(0.6, 0.15 * list.length) * total : 0, sumW = list.reduce((n, x) => n + x.w, 0) || 1;
  const out = list.map((x) => ({ by: x.by, text: x.text, amount: Math.max(2, Math.round(named * x.w / sumW)) }));
  const rest = Math.max(0, total - out.reduce((n, x) => n + x.amount, 0));
  const net = Math.round(total * (DON_SHARE[platformOf(g)] || 0.5) * 100) / 100;
  post.video.dons = out;
  post.video.donRest = rest;
  post.video.donTotal = total;
  post.video.donNet = net;
  g.career.est += net;
  ledger(g, `Dons du live « ${str(post.video.topic, 30)} » (${Math.round((DON_SHARE[platformOf(g)] || 0.5) * 100)} % pour toi)`, net, 'est');
  addNotif(g, { k: 'money', p: post.id, text: `💝 Ton live a reçu ${fmtMoney(g, total)} de dons (${fmtMoney(g, net)} pour toi, versés avec tes revenus du mois).` });
  return net;
}
// The player thanks those who gave: the community warms up (once per live); the regulars who gave, closer.
function thankDonors(g, post) {
  const v = post && post.video;
  if (!v || !v.donTotal || v.thanked) return false;
  v.thanked = true;
  warmMove(g, 2, 'tu as remercié ceux qui t’ont soutenu en live');
  for (const d of v.dons || []) { const c = charByHandle(g, d.by); if (c && c.kind === 'fan') c.rel = clamp((c.rel || 0) + 3, -100, 100); }
  toast('Merci envoyé à tous ceux qui ont donné : ta commu apprécie.', 'good');
  return true;
}
function DonsBlock({ g, p }) {
  const v = p.video;
  if (!v || !v.donTotal) return null;
  return html`<div class="dons" onClick=${(ev) => ev.stopPropagation()}>
    <div class="dons-h"><b>💝 ${fmtMoney(g, v.donTotal)} de dons</b><span>${fmtMoney(g, v.donNet)} pour toi</span></div>
    ${(v.dons || []).map((d, k) => html`<div class="don" key=${k}><span class="don-amt">${fmtMoney(g, d.amount)}</span><span><b>@${d.by}</b> ${d.text}</span></div>`)}
    ${v.donRest ? html`<small class="muted">et ${fmtMoney(g, v.donRest)} d’autres dons</small>` : null}
    ${v.thanked ? html`<small class="muted">Merci envoyé ✓</small>` : html`<button class="btn btn-ghost btn-sm" onClick=${() => { if (thankDonors(g, p)) update(); }}>🙏 Remercier tout le monde</button>`}
  </div>`;
}

/* ---------- 0.22: memberships (« adhésions »): fans who pay each month for what the creator promised ---------- */
// Where: YouTube (in the partner program, from 1 000 subscribers), Instagram (10 000), TikTok (1 000, through its lives).
// On Twitch, the paying subs are already in what the lives bring. What the creator keeps, by platform.
const MEMB_PF = { youtube: { min: 1000, share: 0.7, prog: true, name: 'adhésions', f: true }, instagram: { min: 10000, share: 0.8, name: 'abonnements' }, tiktok: { min: 1000, share: 0.5, name: 'abonnements LIVE' } };
const MEMB_PRICES = [1.99, 4.99, 9.99];
const MEMB_PRICE_K = { 1.99: 1.6, 4.99: 1, 9.99: 0.45 }; // the cheaper, the more join
// What can be promised: the badge comes with it; the others are promises, at least one a month.
const MEMB_PERKS = [['badge', 'Badge et emojis', ''], ['avant', 'Vidéos en avant-première', 'une par mois au moins'], ['live', 'Lives réservés aux membres', 'un par mois au moins']];
const membOf = (g) => (g && g.career && g.career.memb) || null;
const membOn = (g) => { const m = membOf(g); return !!(m && m.on); };
function membCan(g) {
  const pf = platformOf(g), M = MEMB_PF[pf];
  if (!M) return { ok: false, why: pf === 'twitch' ? 'Sur Twitch, tes abonnés payants sont déjà dans ce que rapportent tes lives.' : 'Pas d’adhésions payantes sur cette plateforme.' };
  if (g.stats.followers < M.min) return { ok: false, why: `Les ${M.name} ${M.f ? 'payantes' : 'payants'} s’ouvrent à ${nfFull.format(M.min)} abonnés${M.prog ? ', dans le Programme Partenaire' : ''}.` };
  if (M.prog && !monetized(g)) return { ok: false, why: demonetized(g) ? 'Pubs coupées pour avertissements : les adhésions sont suspendues aussi.' : 'Les adhésions s’ouvrent avec le Programme Partenaire.' };
  return { ok: true, M };
}
// How many would join: about 0,2 % of the audience for a lukewarm community at 4,99 €, more when it is warm, cheaper or
// offers more; fewer after a broken promise. The regulars join first.
function membTarget(g) {
  const m = membOf(g);
  if (!m || !m.on || !membCan(g).ok) return 0;
  const w = warmOf(g), perks = (m.perks || []).filter((k) => k !== 'badge').length;
  const base = g.stats.followers * 0.002 * Math.pow(Math.max(5, w) / WARM0, 1.2) * (MEMB_PRICE_K[m.price] || 1) * (1 + 0.25 * perks) * (m.unmet ? 0.7 : 1);
  return Math.round(base + Math.min(fanRegulars(g).length, 40) * 0.6);
}
const membShare = (g) => (MEMB_PF[platformOf(g)] || {}).share || 0.5;
const membNet = (g, m = membOf(g)) => (m ? Math.round(m.members * m.price * membShare(g) * 100) / 100 : 0);
const membName = (g) => (MEMB_PF[platformOf(g)] || { name: 'adhésions' }).name;
const membPaid = (g) => ((MEMB_PF[platformOf(g)] || { f: true }).f ? 'payantes' : 'payants');
// Opening them, or changing the price or the promises (a higher price makes some leave).
function openMemb(g, price, perks, t = Date.now()) {
  if (!membCan(g).ok || !MEMB_PRICES.includes(price)) return false;
  const P = ['badge'].concat(['avant', 'live'].filter((k) => (perks || []).includes(k)));
  const m = membOf(g);
  if (m && m.on) {
    if (price > m.price) m.members = Math.round(m.members * 0.8);
    m.price = price;
    m.perks = P;
    return true;
  }
  g.career.memb = { on: true, price, perks: P, members: Math.min(fanRegulars(g).length, 40), at: t, paidKey: monthKey(gameDate(t)), monthAt: t, done: {}, day: gameDay(t), unmet: false };
  warmMove(g, 1, `tu ouvres les ${membName(g)}`, t);
  addTrigger(g, `Le joueur ouvre des ${membName(g)} ${membPaid(g)} à ${fmtDec(price)} € par mois (${P.map((k) => MEMB_PERKS.find((x) => x[0] === k)[1].toLowerCase()).join(', ')}) : ses fans en parlent, certains adhèrent, d’autres trouvent que c’est pour l’argent.`);
  return true;
}
function closeMemb(g, t = Date.now()) {
  const m = membOf(g);
  if (!m || !m.on) return false;
  m.on = false;
  m.members = 0;
  warmMove(g, -3, `tu fermes les ${membName(g)}`, t);
  return true;
}
// A release that keeps a promise: a video in early access, a members-only live.
function membDelivered(g, k, t = Date.now()) {
  const m = membOf(g);
  if (!m || !m.on || !(m.perks || []).includes(k)) return false;
  m.done = m.done || {};
  const first = !(m.done[k] >= m.monthAt);
  m.done[k] = t;
  if (first) warmMove(g, k === 'live' ? 2 : 1, k === 'live' ? 'un live entre membres' : 'une avant-première pour tes membres', t);
  return true;
}
const membMissing = (m) => (m.perks || []).filter((k) => k !== 'badge' && !((m.done || {})[k] >= m.monthAt));
// Each game day, members come and go; each month, they pay (less the platform's share) and the promises are checked.
function tickMemb(g, t = Date.now()) {
  const m = membOf(g);
  if (!m || !m.on) return false;
  const day = gameDay(t);
  if (m.day === day) return false;
  const can = membCan(g).ok;
  for (let k = 0, n = Math.min(31, Math.max(1, day - (m.day == null ? day - 1 : m.day))); k < n; k++) {
    const gap = (can ? membTarget(g) : 0) - m.members;
    m.members = Math.max(0, m.members + Math.round(gap * (gap > 0 ? 0.12 : 0.06) * rand(0.6, 1.4)));
  }
  m.day = day;
  const key = monthKey(gameDate(t));
  if (!m.paidKey || key > m.paidKey) { // 0.27.4: (a clock set back pays no month twice)
    const month = monthOfKey(m.paidKey), frac = Math.min(1, (t - m.monthAt) / (30 * DAY_MS)), N = cap1(membName(g));
    if (can && m.members > 0) {
      const net = Math.round(membNet(g, m) * frac * 100) / 100;
      g.career.est += net;
      ledger(g, `${N} ${deMonth(month)} : ${fmtN(m.members)} ${plural(m.members, 'membre', 'membres')}`, net, 'est');
      addNotif(g, { k: 'money', text: `👑 ${N} ${deMonth(month)} : ${fmtN(m.members)} ${plural(m.members, 'membre', 'membres')}, +${fmtMoney(g, net)} (versés avec tes revenus du mois).` });
    }
    const miss = frac >= 0.5 ? membMissing(m) : []; // (a first month of a few days: nothing owed yet)
    m.unmet = miss.length > 0;
    if (miss.length && m.members > 0) {
      const what = miss.map((k) => (k === 'avant' ? 'leur vidéo en avant-première' : 'leur live réservé')).join(' ni ');
      m.members = Math.round(m.members * 0.85);
      warmMove(g, -3, 'une promesse non tenue à tes membres', t);
      addNotif(g, { k: 'reldown', text: `👑 Tes membres n’ont pas eu ${what} ${deMonth(month)} : certains s’en vont.` });
      addTrigger(g, `Des membres payants du joueur se plaignent : ${deMonth(month).replace(/^de |^d’/, 'en ')}, ils n’ont pas eu ${what}, alors que c’était promis.`);
    }
    m.paidKey = key;
    m.monthAt = t;
  }
  return true;
}
// What the prompts know of it.
function membCtx(g) {
  const m = membOf(g);
  if (!m || !m.on || !m.members) return '';
  const promised = (m.perks || []).filter((k) => k !== 'badge').map((k) => MEMB_PERKS.find((x) => x[0] === k)[1].toLowerCase());
  return ` ; ${fmtN(m.members)} membres payants (${membName(g)} à ${fmtDec(m.price)} € par mois${promised.length ? `, promis : ${promised.join(', ')}` : ''})`;
}
// In « Ta commu »: open them, or follow them.
function MembBlock({ g }) {
  const [ed, setEd] = useState(null); // { price, perks } while choosing
  const can = membCan(g), m = membOf(g), on = !!(m && m.on);
  if (!can.ok && !on) return html`<div class="memb"><b>👑 Adhésions</b><p class="muted">${can.why}</p></div>`;
  const N = cap1(membName(g));
  if (on && !ed) {
    return html`<div class="memb on">
      <div class="memb-h"><b>👑 ${fmtN(m.members)} ${plural(m.members, 'membre', 'membres')}</b><span>${fmtDec(m.price)} € par mois · ≈ ${fmtMoney(g, membNet(g, m))} par mois pour toi</span></div>
      ${!can.ok ? html`<p class="muted">${can.why}</p>` : null}
      <ul class="memb-perks">${m.perks.map((k) => { const P = MEMB_PERKS.find((x) => x[0] === k), ok = k === 'badge' || (m.done || {})[k] >= m.monthAt; return html`<li key=${k} class=${ok ? 'ok' : 'todo'}><span>${ok ? '✓' : '○'}</span> ${P[1]}${P[2] ? html` <small>${ok ? '· fait ce mois-ci' : '· ' + P[2]}</small>` : null}</li>`; })}</ul>
      <div class="row"><button class="btn btn-ghost btn-sm" onClick=${() => setEd({ price: m.price, perks: m.perks.slice() })}>Modifier</button><button class="linkbtn" onClick=${() => askConfirm({ title: `Fermer les ${membName(g)} ?`, text: `${m.members ? `${m.members > 1 ? `Tes ${fmtN(m.members)} membres arrêtent` : 'Ton membre arrête'} de payer` : 'Plus personne ne pourra adhérer'}, et ta commu le prendra mal.`, ok: 'Fermer', danger: true, run: () => { if (closeMemb(g)) update(); } })}>Fermer les ${membName(g)}</button></div>
    </div>`;
  }
  const E = ed || { price: 4.99, perks: ['badge', 'avant'] };
  const set = (patch) => setEd(Object.assign({}, E, patch));
  return html`<div class="memb">
    <b>👑 ${N} ${membPaid(g)}</b>
    <p class="muted">Tes fans paient chaque mois pour ce que tu leur promets ; ${pfName(g, platformOf(g))} garde ${Math.round((1 - membShare(g)) * 100)} %.</p>
    <div class="tr-chips">${MEMB_PRICES.map((p) => html`<button type="button" key=${p} class=${'chip-btn' + (E.price === p ? ' on' : '')} onClick=${() => set({ price: p })}>${fmtDec(p)} € par mois</button>`)}</div>
    <div class="tr-chips">${MEMB_PERKS.map(([k, label, note]) => html`<button type="button" key=${k} class=${'chip-btn' + (E.perks.includes(k) ? ' on' : '')} disabled=${k === 'badge'} onClick=${() => set({ perks: E.perks.includes(k) ? E.perks.filter((x) => x !== k) : E.perks.concat([k]) })}>${label}${k === 'badge' ? ' (toujours inclus)' : note ? ` (${note})` : ''}</button>`)}</div>
    ${on && m.members && E.price > m.price ? html`<small class="muted memb-warn">Une hausse fait partir environ un membre sur cinq.</small>` : null}
    <div class="row"><button class="btn btn-hot btn-sm" onClick=${() => { if (openMemb(g, E.price, E.perks)) { setEd(null); update(); } }}>${on ? 'Enregistrer' : `Ouvrir les ${membName(g)}`}</button>${ed && on ? html`<button class="btn btn-ghost btn-sm" onClick=${() => setEd(null)}>Annuler</button>` : null}</div>
  </div>`;
}
