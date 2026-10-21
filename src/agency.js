/* =========================================================
   0.31: the agent, then the agency.
   - The player represents characters (« talents »). Proposed in their messages, with a commission (10, 15 or 20 %) and,
     or not, the exclusivity of their brand deals: their AI says yes or no (the relationship, their trust, what the
     player weighs in the milieu, their ambition), and may haggle over the commission.
   - Then brands write to the player for them: the game's own (more often for a big talent, and for an agent the
     brands trust), or one the AI brings with a refresh. One offer per talent at a time, negotiated in the brand's
     messages (its AI defends its budget). The talent has the last word: the player passes the offer on in their
     messages, and their AI judges whether the brand fits them. Signed, the talent posts the sponsored post when it
     suits them (their AI writes it, in a refresh, with "deal"); delivered, the brand pays and the player takes the
     commission; late, the brand complains; never, the player's name as an agent suffers.
   - And it can go wrong: a talent signs behind the player's back (their AI's doing), another is jealous, the player
     competes with their own talent for a brand, a talent leaves (in their messages).
   - With two talents, the agency: a name, room for more talents, an agent of the agency to hire, brands that come
     more often and pay a little more, creators who come knocking, rival agencies that try to take a talent away, a
     talent's scandal that splashes on it, the month's report.
   Nothing here calls the AI on its own: the messages and the refreshes do.
   ========================================================= */
const AGENT_CUTS = [10, 15, 20];
const TALENT_MIN = 1000; // subscribers: below, no brand goes through an agent for them
const TALENT_MAX = 3, TALENT_MAX_AG = 6; // talents at once: alone / with the agency (+1 per level of its agent)
const TDEAL_OPEN = ['offer', 'ask', 'signed', 'late'];
const TD_LATE = 2 * DAY_MS; // late: two more days, then it is lost
const FOUND_COST = 2000, AG_MIN = 2; // the agency: its papers, an office, a site; with two talents
const AG_EMOJIS = ['🏢', '✨', '🦋', '🔥', '💎', '🌙', '🚀', '🎯'];
const TD_STATES = { offer: 'Offre', ask: 'Attend son accord', signed: 'Signé', late: 'En retard', done: 'Livré', failed: 'Perdu', refused: 'Refusé par ton talent', declined: 'Refusé', expired: 'Expiré', withdrawn: 'Retiré' };

function agencyOf(g) {
  if (!g.agency || typeof g.agency !== 'object') g.agency = { rep: 50, talents: [], deals: [], earned: 0, name: '', emoji: '', foundedAt: 0, day: null, month: null };
  const A = g.agency;
  if (!Array.isArray(A.talents)) A.talents = [];
  if (!Array.isArray(A.deals)) A.deals = [];
  if (!(A.rep >= 0)) A.rep = 50;
  return A;
}
const talentOf = (g, c) => (g && g.agency && c ? g.agency.talents.find((T) => T.c === c.id && (T.state === 'asked' || T.state === 'on')) || null : null);
const talentOn = (g, c) => { const T = talentOf(g, c); return T && T.state === 'on' ? T : null; };
const talentsOn = (g) => (g && g.agency ? g.agency.talents.filter((T) => T.state === 'on' && g.chars[T.c]) : []);
const agencyFounded = (g) => !!(g && g.agency && g.agency.foundedAt);
const talentCap = (g) => (agencyFounded(g) ? TALENT_MAX_AG + staffPower(g, 'agence') : TALENT_MAX);
const tdealOf = (g, id) => (g && g.agency ? g.agency.deals.find((d) => d.id === id) || null : null);
const tdealOpen = (d) => !!d && TDEAL_OPEN.includes(d.state);
const tdealByContact = (g, c) => (g && g.agency && c ? g.agency.deals.filter((d) => d.contact === c.id).slice(-1)[0] || null : null);
const tdealAsking = (g, c) => (g && g.agency && c ? g.agency.deals.find((d) => d.c === c.id && d.state === 'ask') || null : null);
const cutOf = (cut, fee) => Math.round((num(fee, 0) * num(cut, 15)) / 100);
const agRepWord = (r) => (r >= 80 ? 'les marques se l’arrachent' : r >= 60 ? 'les marques lui font confiance' : r >= 40 ? 'les marques le jugent sur pièces' : r >= 20 ? 'les marques se méfient' : 'les marques l’évitent');
function agRep(g, d) {
  const A = agencyOf(g), v0 = A.rep;
  A.rep = clamp(Math.round(A.rep + d), 0, 100);
  return A.rep - v0;
}
function trimTdeals(A) { while (A.deals.length > 30) { const k = A.deals.findIndex((d) => !tdealOpen(d)); if (k < 0) break; A.deals.splice(k, 1); } }
// The month's figures of the agency (the report is said when a new month starts).
function agMonth(g, t = Date.now()) {
  const A = agencyOf(g), d = gameDate(t), k = `${d.getFullYear()}-${d.getMonth()}`;
  if (!A.month || A.month.k !== k) A.month = { k, deals: 0, earned: 0, m: d.getMonth() };
  return A.month;
}

/* ---------- becoming someone's agent ---------- */
// Why the player cannot propose it to them (nothing: they can).
function agentWhy(g, c) {
  if (!c || !isMain(c) || !c.unlocked) return 'Seulement avec les personnages que tu connais.';
  if (c.cut) return `${firstName(c)} a coupé les ponts avec toi.`;
  if (c.jailed) return `${firstName(c)} n’est pas en état de signer quoi que ce soit.`;
  const T = talentOf(g, c);
  if (T) return T.state === 'on' ? `Tu es déjà l’agent de ${firstName(c)}.` : `Ta proposition attend sa réponse.`;
  const no = (g.agency ? g.agency.talents : []).filter((x) => x.c === c.id && x.state === 'refused').slice(-1)[0];
  if (no && Date.now() - (no.endAt || no.at) < 2 * DAY_MS) return `${firstName(c)} t’a dit non il y a peu : laisse passer quelques jours.`;
  if ((c.followers || 0) < TALENT_MIN) return `Moins de ${nfFull.format(TALENT_MIN)} abonnés : les marques ne passent pas encore par un agent pour ${firstName(c)}.`;
  if (talentsOn(g).length >= talentCap(g)) return agencyFounded(g) ? `Ton agence gère déjà ${talentsOn(g).length} talents : engage un agent pour ton agence, ou sépare-toi d’un talent.` : `Tu gères déjà ${talentsOn(g).length} talents : monte ton agence pour en prendre plus.`;
  return '';
}
function askAgent(g, c, o = {}) {
  const why = agentWhy(g, c);
  if (why) return { ok: false, why };
  const A = agencyOf(g), cut = AGENT_CUTS.includes(+o.cut) ? +o.cut : 15;
  A.talents = A.talents.filter((T) => T.c !== c.id || T.state === 'ended');
  while (A.talents.length > 24) { const k = A.talents.findIndex((x) => x.state === 'ended' || x.state === 'refused'); if (k < 0) break; A.talents.splice(k, 1); }
  const T = { c: c.id, at: Date.now(), cut, excl: !!o.excl, state: 'asked', deals: 0, earned: 0 };
  A.talents.push(T);
  return { ok: true, T };
}
// What the player sends them (left in their conversation, to edit and send).
function agentText(g, c, T) {
  return `Ça te dirait que je devienne ton agent ? Je m’occupe de tes partenariats : je trouve les marques, je négocie tes contrats, et je prends ${T.cut} % de ce que tu touches. ${T.excl ? 'En exclusivité : tous tes partenariats passent par moi.' : 'Sans exclusivité : tu restes libre de signer de ton côté.'} T’en penses quoi ?`;
}
// Their AI's answer: yes (with the commission they agreed to), no; later, the end of it, or staying despite a rival.
function applyAgentLine(g, c, o) {
  const T = talentOf(g, c);
  if (!T) return false;
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel'), t = Date.now();
  if (T.state === 'asked') {
    const ok = o.ok === true || o.ok === 'true', why = str(o.why, 70);
    if (ok) {
      const cut = Math.round(num(o.cut, T.cut));
      if (cut >= 5 && cut <= 25 && cut !== T.cut) T.cut = cut;
      Object.assign(T, { state: 'on', since: t });
      addNotif(g, { k: 'relup', c: c.id, at: later() + 1500, text: `🤝 ${first} accepte : tu deviens son agent (${T.cut} %${T.excl ? ', en exclusivité' : ''}). Les marques vont pouvoir passer par toi.` });
      addMem(g, c, `le joueur est devenu mon agent (${T.cut} %)`);
      addChronicle(g, `${g.player.name} est ${px(g, 'devenu', 'devenue', 'devenu·e')} l’agent de ${c.name}.`);
      touch(c);
    } else {
      T.state = 'refused'; T.endAt = t;
      addNotif(g, { k: 'reldown', c: c.id, at: later() + 1500, text: `${first} ne veut pas de toi comme agent${why ? ` : « ${why} »` : ''}.` });
      addMem(g, c, `le joueur voulait devenir mon agent, j’ai dit non${why ? ` (${why})` : ''}`);
    }
    return true;
  }
  if (T.state === 'on' && (o.fin === true || o.fin === 'true')) return endTalent(g, T, 'talent', o.why);
  if (T.state === 'on' && (o.reste === true || o.reste === 'true') && T.poach) {
    addNotif(g, { k: 'relup', c: c.id, at: later() + 1500, text: `🤝 ${first} dit non à ${T.poach.agence} : ${il} reste avec toi.` });
    addMem(g, c, `j’ai refusé l’agence ${T.poach.agence} pour rester avec le joueur`);
    T.poach = null;
    return true;
  }
  return false;
}
// The end of a contract: by the player, by the talent, a rival agency, or they are gone. The offers still open go; the
// contracts signed stay to be delivered (and pay their commission).
function endTalent(g, T, by, why) {
  if (!T || T.state !== 'on') return false;
  const c = g.chars[T.c], t = Date.now(), A = agencyOf(g);
  Object.assign(T, { state: 'ended', endAt: t, endBy: by, endWhy: str(why, 80), poach: null, behind: null });
  for (const d of A.deals) if (d.c === T.c && (d.state === 'offer' || d.state === 'ask')) {
    d.state = 'withdrawn';
    const b = g.chars[d.contact];
    if (b && c) addIncomingDM(g, b, `D’accord, on retire notre proposition pour @${c.handle}.`, later() + 1500, { max: 300 });
  }
  if (!c) return true;
  const first = firstName(c);
  if (by === 'player') {
    applyRel(g, c, -4, 'son agent a mis fin à leur contrat', later(), 6);
    addMem(g, c, 'le joueur ne veut plus être mon agent');
    addNotif(g, { k: 'money', c: c.id, text: `Tu n’es plus l’agent de ${first}.` });
  } else if (by === 'rival') {
    addMem(g, c, `j’ai quitté mon agent (le joueur) pour l’agence ${str(why, 40)}`);
    addNotif(g, { k: 'reldown', c: c.id, text: `💔 ${first} te quitte pour l’agence ${str(why, 40)}.` });
    addTrigger(g, `@${c.handle} quitte son agent (le joueur) pour l’agence ${str(why, 40)} : le milieu en parle.`, c.id);
  } else if (by === 'gone') addNotif(g, { k: 'money', c: c.id, text: `Ton contrat d’agent avec ${first} s’arrête.` });
  else {
    addMem(g, c, `j’ai mis fin au contrat de mon agent, le joueur${why ? ` (${str(why, 60)})` : ''}`);
    addNotif(g, { k: 'reldown', c: c.id, text: `💔 ${first} met fin à ton contrat d’agent${why ? ` : « ${str(why, 60)} »` : ''}.` });
  }
  addChronicle(g, `${g.player.name} n’est plus l’agent de ${c.name}.`);
  return true;
}

/* ---------- the brands, for a talent ---------- */
// What a brand pays a talent for a sponsored post: about 10 € per 1 000 subscribers (the rule of thumb of Instagram),
// the season, what the brands think of the player as an agent, the agency and its agent.
function talentFee(g, c) {
  const F = Math.max(0, num(c.followers, 0));
  let fee = Math.max(40, (F / 1000) * 10) * rand(0.8, 1.25) * sponsorSeason(gameDate(Date.now()));
  fee *= 0.85 + num(agencyOf(g).rep, 50) / 333; // (0,85 → 1,15)
  if (agencyFounded(g)) fee *= 1.1;
  fee *= 1 + 0.04 * staffPower(g, 'agence');
  return niceRound(fee);
}
// The sector of a talent: what their bio and their role say, else anything.
function talentSector(c) {
  const txt = `${c.bio || ''} ${c.role || ''} ${c.personality || ''}`;
  const hit = TOPIC_SECTORS.filter(([re]) => re.test(txt)).map(([, k]) => k).filter((k) => SECTORS.some((s) => s.id === k));
  return hit.length && Math.random() < 0.75 ? pick(hit) : pick(SECTORS).id;
}
const tdealSummary = (g, d) => { const c = g.chars[d.c]; return `${fmtMoney(g, d.fee)} pour un post sponsorisé de @${c ? c.handle : '?'} avec ${d.product}, à publier sous ${d.days} jours`; };
// A card in a conversation (the brand's, the talent's), and its line for the AI.
function tdCard(g, c, d, at = later(), o = {}) {
  const convo = g.dms[c.id] || (g.dms[c.id] = { msgs: [], readAt: 0 });
  const tal = g.chars[d.c];
  const text = o.talent ? `[Proposition de partenariat transmise par ton agent : ${d.brand}, un post sponsorisé avec ${d.product}, ${fmtMoney(g, d.fee)} (ta part : ${fmtMoney(g, d.fee - cutOf(d.cut || (talentOf(g, tal) || {}).cut, d.fee))}), à publier sous ${d.days} jours]`
    : `[${o.upd ? 'Nouvelle proposition' : 'Proposition de partenariat'} pour @${tal ? tal.handle : '?'} : ${tdealSummary(g, d)}]`;
  convo.msgs.push({ id: uid('m'), me: false, sys: 'tdeal', tdeal: d.id, talent: o.talent ? 1 : undefined, ts: at, at, text });
}
// An offer for a talent: by the game (its own brands), or by the AI in a refresh (one of this world).
function makeTalentOffer(g, c, o = {}) {
  const A = agencyOf(g), T = c && talentOn(g, c);
  if (!T || A.deals.some((d) => d.c === c.id && (d.state === 'offer' || d.state === 'ask')) || A.deals.filter((d) => d.state === 'offer' || d.state === 'ask').length >= 4) return null;
  const S0 = SECTORS.find((x) => x.id === o.sector) || SECTORS.find((x) => x.id === talentSector(c)) || pick(SECTORS);
  const sour = (b) => A.deals.some((d) => d.c === c.id && d.brand === b && (d.state === 'refused' || d.state === 'failed') && Date.now() - d.at < 30 * DAY_MS); // (not the brand they turned down, or let down, last month)
  const fresh = S0.brands.filter((b) => !brandBurnt(g, b) && !sour(b) && !A.deals.some((d) => d.brand === b && tdealOpen(d)));
  const brand = str(o.brand, 30) || (fresh.length ? pick(fresh) : '');
  if (!brand || brandBurnt(g, brand) || A.deals.some((d) => d.c === c.id && tdealOpen(d) && d.brand.toLowerCase() === brand.toLowerCase())) return null;
  const t = Date.now(), fee = talentFee(g, c);
  const same = (x) => x.brand.toLowerCase() === brand.toLowerCase() && g.chars[x.contact] && g.chars[x.contact].kind === 'brand';
  const old = A.deals.filter(same).slice(-1)[0] || (g.deals || []).filter(same).slice(-1)[0]; // (the same person writes again)
  const contact = old ? g.chars[old.contact] : addContact(g, { name: o.contact, handle: o.handle, g: o.g, brand, role: `Partenariats · ${brand}`, emoji: cleanEmoji(o.emoji) || S0.emoji });
  if (!contact) return null;
  const d = { id: uid('td'), c: c.id, brand, emoji: cleanEmoji(o.emoji) || S0.emoji, sector: S0.id, product: str(o.product, 80) || pick(S0.products), fee, fee0: fee,
    lo: niceRound(fee * 0.7), max: Math.round(fee * (1.3 + 0.03 * staffPower(g, 'agence'))), days: randi(4, 8), at: t, until: t + 2 * DAY_MS, state: 'offer', contact: contact.id, cut: T.cut };
  A.deals.push(d);
  trimTdeals(A);
  const pitch = str(o.text, 300) || `Salut ${firstName(g.player)} ! Je gère les partenariats de ${brand}. On aimerait beaucoup travailler avec @${c.handle} : c’est bien toi qui t’occupes de ses contrats ? Voici notre proposition ⬇️`;
  const at = later() + 1200;
  addIncomingDM(g, contact, pitch, at, { max: 400 });
  tdCard(g, contact, d, at + 400);
  addNotif(g, { k: 'money', c: contact.id, at, text: `${d.emoji} ${brand} veut ${firstName(c)} pour un partenariat : ${fmtMoney(g, fee)} (ta commission : ${fmtMoney(g, cutOf(T.cut, fee))}).` });
  return d;
}
// The player passes it on: their conversation gets the proposal (the talent's AI answers when the player writes).
function askTalentDeal(g, d) {
  if (!d || d.state !== 'offer') return false;
  const c = g.chars[d.c], T = c && talentOn(g, c);
  if (!c || !T) return false;
  const t = Date.now();
  Object.assign(d, { state: 'ask', askAt: t, until: Math.max(d.until, t + DAY_MS), cut: T.cut });
  tdCard(g, c, d, t, { talent: true });
  return true;
}
const tdealDraft = (g, d) => `J’ai une proposition pour toi : ${d.brand} voudrait un post sponsorisé avec ${d.product}. ${fmtMoney(g, d.fee)}, dont ${fmtMoney(g, d.fee - cutOf(d.cut, d.fee))} pour toi, à publier sous ${d.days} jours. Ça te dit ?`;
function declineTdeal(g, d) {
  if (!d || (d.state !== 'offer' && d.state !== 'ask')) return false;
  d.state = 'declined';
  const b = g.chars[d.contact];
  if (b) addIncomingDM(g, b, pick(['Dommage ! Peut-être une prochaine fois.', 'Ok, je comprends. On garde ton contact.']), later() + 1500, { max: 300 });
  return true;
}
// The talent's answer, in their messages.
function applyTdealAnswer(g, c, o) {
  const d = tdealAsking(g, c);
  if (!d) return false;
  return o.ok === true || o.ok === 'true' ? signTdeal(g, d) : refuseTdeal(g, d, o.why);
}
function signTdeal(g, d) {
  if (!d || (d.state !== 'ask' && d.state !== 'offer')) return false;
  const c = g.chars[d.c], b = g.chars[d.contact], t = Date.now(), A = agencyOf(g);
  Object.assign(d, { state: 'signed', signedAt: t, due: t + d.days * DAY_MS });
  if (b && c) { addIncomingDM(g, b, pick([`Top, c’est signé pour @${c.handle} ! On attend son post avant ${fmtWhen(d.due)} 🙌`, `Parfait, contrat signé ! Hâte de voir le post de @${c.handle}.`]), later() + 1500, { max: 300 }); applyRel(g, b, 3, 'un partenariat signé', later() + 1600, 6); }
  if (c) {
    addNotif(g, { k: 'money', c: c.id, at: later() + 1500, text: `✍️ ${firstName(c)} accepte ${d.brand} : son post sponsorisé est attendu ${fmtWhen(d.due)}.` });
    addMem(g, c, `mon agent m’a trouvé un partenariat avec ${d.brand}`);
    // another talent who cannot stand being left out sees it go by (their AI makes something of it, or not)
    for (const T of talentsOn(g)) {
      const o = g.chars[T.c];
      if (o && o !== c && temperOf(o) === 'envieux' && Math.random() < 0.6) { addTrigger(g, `@${o.handle} voit passer le partenariat ${d.brand} de @${c.handle} : ${gx(o.g, 'il', 'elle', 'iel')} se demande pourquoi son agent (le joueur, qui les représente tous les deux) ne le lui a pas proposé.`, o.id); break; }
    }
    // the player competes with their own talent: a contract of their own with that brand
    if ((g.deals || []).some((x) => x.brand.toLowerCase() === d.brand.toLowerCase() && DEAL_OPEN.includes(x.state))) ownTalentClash(g, c, d.brand);
  }
  agRep(g, 1);
  return true;
}
function refuseTdeal(g, d, why) {
  if (!d || d.state !== 'ask') return false;
  d.state = 'refused';
  const c = g.chars[d.c], b = g.chars[d.contact];
  if (b) addIncomingDM(g, b, pick(['Dommage… Si @' + (c ? c.handle : '') + ' change d’avis, on est là.', 'Ok, tant pis. Peut-être une prochaine fois !']), later() + 1500, { max: 300 });
  if (c) { addNotif(g, { k: 'reldown', c: c.id, at: later() + 1500, text: `🙅 ${firstName(c)} ne veut pas de ${d.brand}${why ? ` : « ${str(why, 60)} »` : ''}.` }); addMem(g, c, `j’ai refusé le partenariat ${d.brand} que mon agent m’a proposé`); }
  agRep(g, -1);
  return true;
}
// The player signed for themselves with a brand their own talent was dealing with: a conflict of interest.
function ownTalentClash(g, c, brand) {
  applyRel(g, c, -8, `son agent a signé pour ${px(g, 'lui-même', 'elle-même', 'soi-même')} avec ${brand}`, later() + 2500, 10);
  addTrigger(g, `@${c.handle} découvre que son agent (le joueur) a aussi un contrat avec ${brand}, la marque qu’il négociait pour ${gx(c.g, 'lui', 'elle', 'iel')} : conflit d’intérêts, ${gx(c.g, 'il', 'elle', 'iel')} le prend selon son caractère.`, c.id);
}
// Called when the player signs a contract of their own: a talent of theirs dealing with that brand finds out.
function agencyOnOwnDeal(g, d) {
  if (!g.agency || !d) return;
  for (const x of g.agency.deals) if (tdealOpen(x) && x.brand.toLowerCase() === d.brand.toLowerCase()) { const c = g.chars[x.c]; if (c) { ownTalentClash(g, c, d.brand); break; } }
}
// The brand's contact moves in its messages: the price, the deadline, or it walks out.
function applyTdealLine(g, b, o) {
  const d = g.agency ? g.agency.deals.filter((x) => x.contact === b.id && (x.state === 'offer' || x.state === 'ask')).slice(-1)[0] : null;
  if (!d) return false;
  if (o.walk === true || o.walk === 'true') { d.state = 'withdrawn'; addNotif(g, { k: 'money', c: b.id, text: `${d.brand} retire son offre pour ${g.chars[d.c] ? firstName(g.chars[d.c]) : 'ton talent'}.` }); return true; }
  const said = [], fee = Math.round(num(o.fee, 0)), days = int(o.days, 0, 30, 0);
  if (fee > 0) { const nf = clamp(fee, d.lo, d.max); if (nf !== d.fee) { d.fee = nf; said.push(fmtMoney(g, nf)); } }
  if (days && clamp(days, 2, 14) !== d.days) { d.days = clamp(days, 2, 14); said.push(`à publier sous ${d.days} jours`); }
  if (!said.length) return false;
  tdCard(g, b, d, later() + 2500, { upd: true });
  addNotif(g, { k: 'money', c: b.id, text: `${d.brand} revoit son offre pour ${g.chars[d.c] ? firstName(g.chars[d.c]) : 'ton talent'} : ${said.join(', ')}.` });
  return true;
}

/* ---------- the sponsored post, and what follows ---------- */
// A post of the refresh carries "deal": the talent of that contract delivers it.
function talentPosted(g, p, id, at = Date.now()) {
  const A = g.agency;
  if (!A || !p) return false;
  const d = A.deals.find((x) => x.id === String(id)) || null;
  if (!d || (d.state !== 'signed' && d.state !== 'late') || p.a !== 'c:' + d.c) return false;
  return deliverTdeal(g, d, p, at);
}
function deliverTdeal(g, d, p, at = Date.now()) {
  const c = g.chars[d.c], b = g.chars[d.contact], A = agencyOf(g), late = d.state === 'late';
  Object.assign(d, { state: 'done', doneAt: at, post: p ? p.id : null });
  if (p) p.sp = d.brand; // (the feed shows it as a sponsored post)
  const com = cutOf(d.cut, d.fee), T = A.talents.filter((x) => x.c === d.c && x.state !== 'refused' && x.state !== 'asked').slice(-1)[0] || null;
  if (com > 0) earn(g, com, `Commission ${d.cut} % : ${c ? firstName(c) : 'ton talent'} × ${d.brand}`, 'agency');
  A.earned = (A.earned || 0) + com;
  if (T) { T.deals = (T.deals || 0) + 1; T.earned = (T.earned || 0) + com; }
  const M = agMonth(g, at); M.deals++; M.earned += com;
  agRep(g, late ? 1 : 4);
  if (b && c) { applyRel(g, b, late ? -2 : 4, late ? 'le post est arrivé en retard' : 'un partenariat bien livré', at + 3000, 8); addIncomingDM(g, b, late ? `Le post de @${c.handle} est enfin là. Mieux vaut tard que jamais…` : pick([`Le post de @${c.handle} est top, merci à vous deux 🙌`, `Super retour sur le post de @${c.handle} ! On refera ça.`]), at + 6000, { max: 300 }); }
  if (c) { applyRel(g, c, 2, 'un partenariat payé grâce à son agent', at + 4000, 6); addNotif(g, { k: 'money', c: c.id, at: at + 1500, text: `🤝 ${firstName(c)} a livré son partenariat ${d.brand}${late ? ' (en retard)' : ''} : +${fmtMoney(g, com)} de commission pour toi.` }); }
  return true;
}
// A talent signed with a brand without the player (their AI's doing): with an exclusive contract, the commission is owed.
function applyBehindBack(g, c, brand) {
  const T = c && talentOn(g, c);
  if (!T || T.behind) return false;
  const B = str(brand, 30) || 'une marque', est = cutOf(T.cut, talentFee(g, c));
  T.behind = { brand: B, at: Date.now(), owed: T.excl ? est : 0 };
  addNotif(g, { k: 'reldown', c: c.id, text: T.excl ? `😤 ${firstName(c)} a signé avec ${B} sans passer par toi. Votre contrat est exclusif : tu peux réclamer ta commission (≈ ${fmtMoney(g, est)}).` : `${firstName(c)} a signé avec ${B} de son côté (votre contrat n’est pas exclusif).` });
  return true;
}
function claimBehind(g, c, claim) {
  const T = c && talentOn(g, c);
  if (!T || !T.behind) return false;
  const B = T.behind;
  T.behind = null;
  if (claim && B.owed > 0) {
    earn(g, B.owed, `Commission réclamée : ${firstName(c)} × ${B.brand}`, 'agency');
    agencyOf(g).earned += B.owed;
    agMonth(g).earned += B.owed;
    T.earned = (T.earned || 0) + B.owed;
    applyRel(g, c, -10, 'son agent lui réclame sa commission', later(), 12);
    addMem(g, c, `mon agent m’a réclamé sa commission sur ${B.brand}`);
    addTrigger(g, `Le joueur, son agent, réclame à @${c.handle} sa commission sur le partenariat ${B.brand} signé dans son dos : ${gx(c.g, 'il', 'elle', 'iel')} réagit selon son caractère (gêne, mauvaise foi, colère).`, c.id);
  } else if (claim === false) { applyRel(g, c, 2, 'son agent a passé l’éponge', later(), 4); addMem(g, c, `mon agent a laissé passer mon contrat ${B.brand}`); }
  return true;
}
// A rival agency tries to take a talent away (the AI's doing): talked through in their messages, else their loyalty decides.
function applyRival(g, c, agence, why) {
  const T = c && talentOn(g, c);
  if (!T || T.poach) return false;
  const name = str(agence, 40) || 'une agence rivale';
  T.poach = { agence: name, why: str(why, 90), at: Date.now(), until: Date.now() + 2 * DAY_MS };
  addNotif(g, { k: 'reldown', c: c.id, text: `🦈 ${name} fait les yeux doux à ${firstName(c)}${T.poach.why ? ` : ${T.poach.why}` : ''}. Parle-lui vite.` });
  return true;
}

/* ---------- the agency ---------- */
function agencyWhy(g) {
  if (agencyFounded(g)) return 'Ton agence existe déjà.';
  if (talentsOn(g).length < AG_MIN) return `Il te faut ${AG_MIN} talents pour monter ton agence (tu en as ${talentsOn(g).length}).`;
  if (g.career.cash < FOUND_COST) return `Il te faut ${fmtMoney(g, FOUND_COST)} (les statuts, un bureau, un site).`;
  return '';
}
function foundAgency(g, name, emoji) {
  const why = agencyWhy(g), nm = str(name, 40);
  if (why) return { ok: false, why };
  if (nm.length < 2) return { ok: false, why: 'Donne un nom à ton agence.' };
  if (!pay(g, FOUND_COST, `Création de ton agence « ${nm} »`, 'agency')) return { ok: false, why: `Il te faut ${fmtMoney(g, FOUND_COST)}.` };
  const A = agencyOf(g);
  Object.assign(A, { name: nm, emoji: AG_EMOJIS.includes(emoji) ? emoji : AG_EMOJIS[0], foundedAt: Date.now() });
  agRep(g, 5);
  addNotif(g, { k: 'money', text: `${A.emoji} Ton agence « ${nm} » est née : plus de place pour tes talents, des marques qui viennent plus souvent, et un agent à engager dans le Studio.` });
  addChronicle(g, `${g.player.name} a monté son agence d’influence, « ${nm} ».`);
  addTrigger(g, `Le joueur lance son agence d’influence « ${nm} » (ses talents : ${talentsOn(g).map((T) => '@' + g.chars[T.c].handle).join(', ')}) : le milieu en parle, ses talents fêtent ça, certains créateurs aimeraient y entrer.`);
  return { ok: true };
}

/* ---------- the clock ---------- */
const offerChance = (g, c) => clamp(0.12 + 0.08 * Math.log10(Math.max(1, num(c.followers, 0)) / 1000), 0.08, 0.5) * (0.6 + (agencyOf(g).rep / 100) * 0.8) * (agencyFounded(g) ? 1.3 : 1) * (1 + 0.15 * staffPower(g, 'agence'));
function tickAgency(g, t = Date.now()) {
  if (!g.agency) return false;
  const A = agencyOf(g);
  let ch = false;
  // the talents: gone, cut ties, jailed: the contract stops; a rival's deadline; a scandal that splashes
  for (const T of A.talents) {
    if (T.state === 'asked' && t - T.at > 7 * DAY_MS) { T.state = 'refused'; T.endAt = t; ch = true; continue; } // (never answered: forgotten)
    if (T.state !== 'on') continue;
    const c = g.chars[T.c];
    if (!c || c.cut || c.jailed || !isMain(c)) { endTalent(g, T, 'gone'); ch = true; continue; }
    if (T.poach && t >= T.poach.until) {
      const stays = c.rel >= 40 || (c.rel >= 20 && Math.random() < 0.5);
      if (stays) { addNotif(g, { k: 'relup', c: c.id, text: `🤝 ${firstName(c)} a dit non à ${T.poach.agence} : ${gx(c.g, 'il', 'elle', 'iel')} reste avec toi.` }); T.poach = null; }
      else endTalent(g, T, 'rival', T.poach.agence);
      ch = true; continue;
    }
    if (c.badBuzz && inBadBuzz(c, t) && (T.bbAt || 0) < c.badBuzz.at) {
      T.bbAt = t;
      const dr = agRep(g, -3);
      addNotif(g, { k: 'reldown', c: c.id, text: `📉 Le bad buzz de ${firstName(c)} éclabousse ${agencyFounded(g) ? `ton agence « ${A.name} »` : 'ta réputation d’agent'}${dr ? ` (−${Math.abs(dr)})` : ''}.` });
      ch = true;
    }
  }
  // the contracts: offers that expire, posts that do not come
  for (const d of A.deals) {
    const c = g.chars[d.c], b = g.chars[d.contact];
    if ((d.state === 'offer' || d.state === 'ask') && t > d.until) {
      const asked = d.state === 'ask';
      d.state = 'expired'; ch = true;
      if (b && c && (asked || Math.random() < 0.4)) addIncomingDM(g, b, `Pas de nouvelles pour @${c.handle}… On passe à autre chose, dommage.`, later() + 1000, { max: 300 });
    } else if (d.state === 'signed' && t > d.due) {
      Object.assign(d, { state: 'late', lateAt: t }); ch = true;
      agRep(g, -4);
      if (b && c) addIncomingDM(g, b, `On n’a toujours rien vu passer de @${c.handle}… Tu peux ${gx(c.g, 'le', 'la', 'le')} relancer ?`, later() + 1000, { max: 300 });
      if (c) addNotif(g, { k: 'reldown', c: c.id, text: `⏰ ${firstName(c)} n’a pas encore posté pour ${d.brand} : relance-${gx(c.g, 'le', 'la', 'le')}.` });
    } else if (d.state === 'late' && t > d.due + TD_LATE) {
      d.state = 'failed'; ch = true;
      agRep(g, -10);
      if (b) { applyRel(g, b, -15, 'le talent n’a jamais posté', later(), 20); if (c) addIncomingDM(g, b, `Bon, on arrête là pour @${c.handle}. On ne retravaillera pas comme ça.`, later() + 1000, { max: 300 }); }
      if (c) { addNotif(g, { k: 'reldown', c: c.id, text: `💔 Partenariat ${d.brand} perdu : ${firstName(c)} n’a jamais posté. Ta réputation d’agent en prend un coup.` }); addMem(g, c, `je n’ai jamais posté pour ${d.brand}, le partenariat trouvé par mon agent`); }
    }
  }
  // each game day: the brands, for the talents (the days of a long skip one after the other, a week at most)
  const day = gameDay(t);
  if (A.day == null) A.day = day;
  for (let k = 0; A.day < day && k < 7; k++) {
    A.day++;
    for (const T of talentsOn(g)) { const c = g.chars[T.c]; if (c && Math.random() < offerChance(g, c) && makeTalentOffer(g, c)) ch = true; }
  }
  if (A.day < day) A.day = day;
  // a new month: the agency's report (when there was something)
  const prev = A.month, M = agMonth(g, t);
  if (prev && prev.k !== M.k && agencyFounded(g) && (prev.deals || prev.earned)) {
    addNotif(g, { k: 'money', text: `${A.emoji} ${A.name} en ${MONTHS[prev.m]} : ${prev.deals} ${plural(prev.deals, 'partenariat livré', 'partenariats livrés')}, +${fmtMoney(g, prev.earned)} de commissions. Réputation auprès des marques : ${A.rep}/100.` });
    ch = true;
  }
  return ch;
}

/* ---------- what the prompts know ---------- */
// The world knows who the player represents.
function agencyCtx(g) {
  const L = talentsOn(g);
  if (!L.length) return '';
  const A = agencyOf(g);
  return `${agencyFounded(g) ? `Il dirige une agence d’influence, « ${A.name} »` : 'Il est agent'} : il représente ${L.map((T) => `@${g.chars[T.c].handle}`).join(', ')} auprès des marques (réputation d’agent ${A.rep}/100 : ${agRepWord(A.rep)}).`;
}
// A talent's (or someone asked) messages: what is between them.
function agentDMCtx(g, c) {
  const T = talentOf(g, c);
  if (!T) return [];
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel'), A = agencyOf(g), out = [];
  const n = talentsOn(g).length, pro = rep1000(g.stats.rep4 ? g.stats.rep4.pro : g.stats.reputation);
  if (T.state === 'asked') {
    out.push(`Le joueur propose à ${first} de devenir son AGENT : il lui trouve des partenariats avec des marques, négocie ses contrats et prend ${T.cut} % de ce qu’${il} touche${T.excl ? ', en exclusivité (tous ses partenariats passeraient par lui)' : ', sans exclusivité (libre de signer de son côté)'}. ${first} décide selon votre relation, sa confiance, ce que le joueur pèse dans le milieu (${fmtPlain(g.stats.followers)} abonnés, réputation pro ${pro}/1000, ${n ? `déjà agent de ${n} créateur${n > 1 ? 's' : ''}${agencyFounded(g) ? `, son agence « ${A.name} »` : ''}` : 'agent de personne pour l’instant'}), son ambition et son caractère ; ${il} peut négocier la commission.`);
    return out;
  }
  out.push(`Le joueur est l’AGENT de ${first} depuis ${fmtDur(Date.now() - (T.since || T.at))} (${T.cut} %${T.excl ? ', en exclusivité' : ''}) : il lui trouve ses partenariats et négocie pour ${gx(c.g, 'lui', 'elle', 'iel')}${agencyFounded(g) ? `, dans son agence « ${A.name} »` : ''}.`);
  for (const d of A.deals.filter((x) => x.c === c.id && tdealOpen(x))) {
    if (d.state === 'ask') out.push(`Le joueur, son agent, lui transmet une proposition de partenariat : ${d.brand} voudrait un post sponsorisé avec ${d.product}, ${fmtMoney(g, d.fee)} (sa part : ${fmtMoney(g, d.fee - cutOf(d.cut, d.fee))}), à publier sous ${d.days} jours. ${first} décide selon son univers et ses valeurs (cette marque lui ressemble-t-elle ?), l’argent, son image et votre relation.`);
    else if (d.state === 'signed') out.push(`Partenariat signé avec ${d.brand} : ${first} doit publier son post sponsorisé (${d.product}) avant ${fmtWhen(d.due)}.`);
    else if (d.state === 'late') out.push(`Partenariat ${d.brand} EN RETARD : la marque attend toujours le post de ${first}, son agent ${gx(c.g, 'le', 'la', 'le')} relance.`);
  }
  if (T.behind) out.push(`${first} a signé avec ${T.behind.brand} sans passer par son agent${T.excl ? ' (leur contrat est pourtant exclusif)' : ''}.`);
  if (T.poach) out.push(`L’agence ${T.poach.agence} essaie de débaucher ${first}${T.poach.why ? ` (${T.poach.why})` : ''} : ${il} hésite, selon ce que le joueur lui dit et ce qu’il a fait pour ${gx(c.g, 'lui', 'elle', 'iel')}.`);
  return out;
}
// The lines of a talent's messages.
function agentDMLines(g, c) {
  const T = talentOf(g, c);
  if (!T) return [];
  const first = firstName(c), il = gx(c.g, 'il', 'elle', 'iel'), out = [];
  if (T.state === 'asked') out.push(`- Quand ${first} a décidé pour l’agent : {"t":"agent","ok":true,"cut":${T.cut},"why":"≤ 60 caractères"} (ok:false s’${il} refuse ; "cut" : la commission acceptée, de 10 à 20, si ${il} l’a négociée). Pas de ligne agent s’${il} hésite encore.`);
  else {
    const d = tdealAsking(g, c);
    if (d) out.push(`- Quand ${first} a décidé pour le partenariat ${d.brand} : {"t":"partenariat","ok":true,"why":"≤ 60 caractères"} (ok:false s’${il} refuse). Rien s’${il} hésite encore.`);
    out.push(T.poach ? `- Si ${first} décide de rester avec le joueur malgré l’agence ${T.poach.agence} : {"t":"agent","reste":true} ; s’${il} part : {"t":"agent","fin":true,"why":"≤ 60 caractères"}.`
      : `- Seulement si ${first} décide de ne plus avoir le joueur comme agent (déçu·e, une dispute, une autre agence) : {"t":"agent","fin":true,"why":"≤ 60 caractères"}.`);
  }
  return out;
}
// A brand's contact who writes about a talent: the offer, the room to haggle.
function tdealBrandCtx(g, b, d) {
  const c = g.chars[d.c], il = gx(b.g, 'il', 'elle', 'iel');
  if (!c) return [];
  const out = [`${b.name} est chargé·e des partenariats chez ${d.brand} et parle au joueur en tant qu’AGENT de @${c.handle} (${fmtPlain(c.followers)} abonnés${c.bio ? ` : ${str(c.bio, 90)}` : ''}). Une vraie pro, aimable, qui défend son budget.`];
  if (d.state === 'offer' || d.state === 'ask') out.push(`Son offre : ${tdealSummary(g, d)}. ${cap1(il)} peut monter jusqu’à ${fmtMoney(g, d.max)} au grand maximum si l’agent argumente bien (l’audience de son talent, son univers, la qualité de ses posts) ; s’il est exigeant sans raison ou demande plus, ${il} refuse ou retire l’offre. Le prix et le délai se négocient.${d.state === 'ask' ? ` L’agent attend la réponse de @${c.handle}.` : ''}`);
  else if (d.state === 'signed') out.push(`C’est signé : @${c.handle} doit publier son post sponsorisé avant ${fmtWhen(d.due)}.`);
  else if (d.state === 'late') out.push(`@${c.handle} est EN RETARD : ${b.name} attend toujours son post et s’impatiente.`);
  else out.push({ done: `Le post de @${c.handle} a été livré.`, failed: `@${c.handle} n’a jamais posté : ${b.name} en garde un mauvais souvenir.`, refused: `@${c.handle} a refusé leur proposition.`, declined: 'L’agent a refusé leur proposition.', expired: 'Leur proposition a expiré sans réponse.', withdrawn: 'Leur proposition a été retirée.' }[d.state] || 'Leur proposition est terminée.');
  return out;
}
const tdealBrandLines = (g, b, d) => (d.state === 'offer' || d.state === 'ask' ? [`- OBLIGATOIRE dès que ${b.name} accepte ou propose un changement de l’offre pour @${g.chars[d.c] ? g.chars[d.c].handle : '?'} dans ce message : {"t":"tdeal","fee":${d.fee},"days":${d.days}} avec seulement ce qui change (le prix entre ${d.lo} et ${d.max}, le délai de 2 à 14 jours). Si ${gx(b.g, 'il', 'elle', 'iel')} retire l’offre : {"t":"tdeal","walk":true}.`] : []);
// What a refresh may write about the talents: their sponsored posts to publish, an offer, a betrayal, a rival.
function agencyRefreshLines(g, t = Date.now()) {
  const L = talentsOn(g), A = g.agency, out = [];
  if (!A) return out;
  for (const d of A.deals.filter((x) => x.state === 'signed' || x.state === 'late').slice(0, 4)) {
    const c = g.chars[d.c];
    if (!c) continue;
    const il = gx(c.g, 'il', 'elle', 'iel');
    out.push(`- @${c.handle} (dont le joueur est l’agent) a un post sponsorisé à publier pour ${d.brand} (${d.product}) ${d.state === 'late' ? `: EN RETARD, son agent ${gx(c.g, 'le', 'la', 'le')} relance ; publie-le maintenant, sauf si @${c.handle} décide de lâcher la marque` : `avant ${fmtWhen(d.due)} : publie-le dans cette actualisation si ${il} est du genre à ne pas traîner`}. Ce post, dans sa voix, avec #partenariat ou « collaboration commerciale », porte "deal":"${d.id}".`);
  }
  if (!L.length) return out;
  const hs = L.map((T) => '@' + g.chars[T.c].handle).join(', ');
  if (A.deals.filter((d) => d.state === 'offer' || d.state === 'ask').length < 3 && Math.random() < 0.35) out.push(`- Facultatif, rarement : une marque fictive de ce monde veut un talent du joueur (${hs}) et passe par lui, son agent : {"t":"offre_talent","for":"handle du talent","brand":"nom inventé","emoji":"🥤","sector":"${SECTORS.map((s) => s.id).join(', ')}","product":"≤ 60 caractères","text":"≤ 200 caractères : son premier message à l’agent"}.`);
  const sly = L.filter((T) => { const c = g.chars[T.c]; return c && !T.behind && (['opportuniste', 'envieux', 'trouble'].includes(temperOf(c)) || c.rel < 25); });
  if (sly.length && Math.random() < 0.25) out.push(`- Rare, seulement si ça lui ressemble : ${sly.map((T) => '@' + g.chars[T.c].handle).join(', ')} signe un partenariat sans passer par son agent (le joueur) : écris d’abord son post sponsorisé, puis {"t":"dans_le_dos","by":"handle","brand":"la marque"}.`);
  if ((agencyFounded(g) || L.length >= 2) && !L.some((T) => T.poach) && Math.random() < 0.2) out.push(`- Rare : une agence d’influence rivale (nom inventé, de ce monde) essaie de débaucher un talent du joueur (${hs}) : {"t":"rivale","for":"handle","agence":"son nom","why":"≤ 80 caractères : ce qu’elle lui promet"}.`);
  return out;
}
// The career lines of a refresh about the agency.
function applyAgencyLine(g, o, effects) {
  if (o.t === 'offre_talent') { effects.push(() => { const c = charByHandle(g, normHandle(o.for)); if (c) makeTalentOffer(g, c, o); }); return true; }
  if (o.t === 'dans_le_dos') { effects.push(() => { const c = charByHandle(g, normHandle(o.by)); if (c) applyBehindBack(g, c, o.brand); }); return true; }
  if (o.t === 'rivale') { effects.push(() => { const c = charByHandle(g, normHandle(o.for)); if (c) applyRival(g, c, o.agence, o.why); }); return true; }
  return false;
}

/* ---------- the screens ---------- */
// On a character's profile: becoming their agent, or the contract.
function AgentSection({ g, c, now }) {
  const T = talentOf(g, c), first = firstName(c);
  if (T && T.state === 'on') {
    const open = (g.agency.deals || []).filter((d) => d.c === c.id && tdealOpen(d));
    return html`<section class="section agent-sec">
      <div class="section-h"><h3>🤝 Ton talent</h3><span>${T.cut} %${T.excl ? ' · exclusivité' : ''}</span></div>
      <p class="muted">Tu es l’agent de ${first} depuis ${fmtDur(now - (T.since || T.at))} : ${T.deals || 0} ${plural(T.deals || 0, 'partenariat livré', 'partenariats livrés')}, ${fmtMoney(g, T.earned || 0)} de commissions.${open.length ? ` En cours : ${open.map((d) => `${d.brand} (${TD_STATES[d.state].toLowerCase()})`).join(', ')}.` : ''}</p>
      <${TalentAlerts} g=${g} c=${c} T=${T} now=${now} />
      <button class="linkbtn quiet" onClick=${() => askConfirm({ title: `Ne plus être l’agent de ${first} ?`, text: 'Les offres en cours pour ce talent sont retirées ; les contrats signés restent à livrer.', ok: 'Mettre fin au contrat', danger: true, run: () => { endTalent(g, T, 'player'); update(); } })}>Mettre fin au contrat</button>
    </section>`;
  }
  const why = agentWhy(g, c);
  return html`<section class="section agent-sec">
    <div class="section-h"><h3>🤝 Devenir son agent</h3><span>${T ? 'proposition envoyée' : (c.followers || 0) >= TALENT_MIN ? `≈ ${fmtMoney(g, Math.max(40, Math.round(((c.followers || 0) / 1000) * 10)))} par post sponsorisé` : ''}</span></div>
    <p class="muted">${T ? `${first} n’a pas encore répondu : ça se passe dans vos messages.` : why || `Trouve des marques pour ${first}, négocie ses contrats, et prends une commission sur ce qu’${gx(c.g, 'il', 'elle', 'iel')} touche. C’est ${gx(c.g, 'lui', 'elle', 'iel')} qui décide.`}</p>
    ${T ? html`<button class="btn btn-ghost btn-sm" onClick=${() => openDM(c.id)}><${Icon} n="msg" s=${14} /> Vos messages</button>` : !why ? html`<button class="btn btn-hot btn-sm" onClick=${() => openLayer({ t: 'agent', id: c.id })}>🤝 Lui proposer</button>` : null}
  </section>`;
}
// What needs the player's decision on a talent: a contract signed behind their back, a rival agency.
function TalentAlerts({ g, c, T, now }) {
  const first = firstName(c);
  return html`${T.behind ? html`<div class="mp-alert bad"><span>😤 ${first} a signé avec ${T.behind.brand} sans passer par toi${T.behind.owed ? ` : ta commission (≈ ${fmtMoney(g, T.behind.owed)})` : ''}.</span>
      <span class="row">${T.behind.owed ? html`<button class="btn btn-ghost btn-sm" onClick=${() => { claimBehind(g, c, true); update(); }}>Réclamer ta commission</button>` : null}<button class="btn btn-ghost btn-sm" onClick=${() => { claimBehind(g, c, false); update(); }}>Laisser passer</button></span></div>` : null}
    ${T.poach ? html`<div class="mp-alert bad"><span>🦈 ${T.poach.agence} veut ${first}${T.poach.why ? ` : ${T.poach.why}` : ''} (${untilWhen(T.poach.until, now)}).</span><span class="row"><button class="btn btn-ghost btn-sm" onClick=${() => openDM(c.id)}><${Icon} n="msg" s=${14} /> Lui parler</button></span></div>` : null}`;
}
// « Devenir son agent »: the commission, the exclusivity, then the message, ready to send.
function AgentLayer({ l, g, now, i }) {
  const c = g.chars[l.id];
  const [cut, setCut] = useState(15), [excl, setExcl] = useState(false);
  if (!c) return html`<${LayerShell} i=${i} title="Agent"><div class="empty"><b>Introuvable</b></div><//>`;
  const first = firstName(c), why = agentWhy(g, c), per = Math.max(40, Math.round(((c.followers || 0) / 1000) * 10));
  const go = () => { const r = askAgent(g, c, { cut, excl }); if (!r.ok) { toast(r.why, 'bad'); return; } S.drafts.dm[c.id] = agentText(g, c, r.T); closeLayer(); openDM(c.id); update(); };
  return html`<${LayerShell} i=${i} title=${'Agent de ' + first}>
    <div class="lpad agent-form">
      <p>Tu proposes à ${first} de t’occuper de ses partenariats : les marques passent par toi, tu négocies, et tu prends une commission sur ce qu’${gx(c.g, 'il', 'elle', 'iel')} touche. ${first} décide (votre relation, sa confiance, ce que tu pèses dans le milieu), et peut négocier.</p>
      <div class="field"><span class="lbl">Ta commission</span><${Seg} items=${AGENT_CUTS.map((k) => [k, k + ' %'])} value=${cut} onPick=${setCut} label="Ta commission" />
        <small class="muted">Pour ${fmtN(c.followers || 0)} abonnés, un post sponsorisé se paie ≈ ${fmtMoney(g, per)} : ≈ ${fmtMoney(g, cutOf(cut, per))} pour toi. Plus tu prends, moins ça ${gx(c.g, 'le', 'la', 'le')} tente.</small></div>
      <label class="check-card"><input type="checkbox" checked=${excl} onChange=${(e) => setExcl(e.target.checked)} /><span><b>Exclusivité</b><small>Tous ses partenariats passent par toi (signer dans ton dos te devra ta commission). Plus engageant pour ${gx(c.g, 'lui', 'elle', 'iel')}.</small></span></label>
      ${why ? html`<p class="notice"><${Icon} n="users" /><span>${why}</span></p>` : null}
      <button class="btn btn-hot" disabled=${!!why} onClick=${go}><${Icon} n="msg" s=${16} /> Lui proposer en message</button>
    </div>
  <//>`;
}
// A contract for a talent: in the brand's conversation, the talent's, and the Studio.
function TdealCard({ g, d, now, inDM, talentView }) {
  if (!d) return null;
  const c = g.chars[d.c], b = g.chars[d.contact];
  if (!c) return null;
  const T = talentOf(g, c), com = cutOf(d.cut || (T && T.cut), d.fee), left = d.state === 'offer' || d.state === 'ask' ? d.until - now : d.state === 'signed' ? d.due - now : 0;
  const pass = () => { if (askTalentDeal(g, d)) { S.drafts.dm[c.id] = tdealDraft(g, d); openDM(c.id); update(); } };
  const nego = () => { S.drafts.dm[d.contact] = `Merci ! @${c.handle} a ${fmtN(c.followers || 0)} abonnés très engagés : on serait plutôt sur ${fmtMoney(g, niceRound(d.fee * 1.25))}. On peut en parler ?`; if (!inDM) openDM(d.contact); else update(false); };
  return html`<div class=${'deal-card td-card st-' + d.state}>
    <div class="dl-head"><span class="dl-emo" aria-hidden="true">${d.emoji}</span><div><b>${d.brand} × ${firstName(c)}</b><span>${cap1(d.product)}</span></div><span class="dl-state">${TD_STATES[d.state] || ''}</span></div>
    <div class="dl-terms">
      <span><small>${talentView ? `Pour ${firstName(c)}` : 'La marque paie'}</small><b>${fmtMoney(g, talentView ? d.fee - com : d.fee)}</b></span>
      <span><small>Ta commission</small><b>${fmtMoney(g, com)}</b><em>${d.cut || (T && T.cut) || 15} %</em></span>
      <span><small>À livrer</small><b>Un post sponsorisé</b><em>${d.state === 'signed' || d.state === 'late' ? `avant ${fmtGameAt(d.due)}` : `sous ${d.days} jours`}</em></span>
    </div>
    ${talentView ? null : d.state === 'offer' ? html`<div class="row">
      <button class="btn btn-hot btn-sm" onClick=${pass}>Proposer à ${firstName(c)}</button>
      <button class="btn btn-ghost btn-sm" onClick=${nego}>${inDM ? 'Négocier' : 'Négocier en message'}</button>
      <button class="linkbtn quiet" onClick=${() => askConfirm({ title: `Refuser l’offre de ${d.brand} ?`, text: `${firstName(c)} n’en saura rien.`, ok: 'Refuser', danger: true, run: () => { declineTdeal(g, d); update(); } })}>Refuser</button>
      <small class="muted">${left > 0 ? `Offre valable ${fmtDur(left)}` : ''}</small></div>`
      : d.state === 'ask' ? html`<p class="muted dl-note">C’est à ${firstName(c)} de dire oui ou non : ça se passe dans vos messages${left > 0 ? ` (offre valable ${fmtDur(left)})` : ''}.</p><button class="btn btn-ghost btn-sm" onClick=${() => openDM(c.id)}><${Icon} n="msg" s=${14} /> Écrire à ${firstName(c)}</button>`
      : d.state === 'signed' ? html`<p class="muted dl-note">${firstName(c)} doit publier son post ${fmtWhen(d.due, now)}.</p>`
      : d.state === 'late' ? html`<p class="muted dl-note late">En retard : la marque attend. Relance ${firstName(c)}.</p><button class="btn btn-ghost btn-sm" onClick=${() => openDM(c.id)}><${Icon} n="msg" s=${14} /> Relancer ${firstName(c)}</button>` : null}
    ${!inDM && b ? html`<button class="linkbtn dl-contact" onClick=${() => openDM(b.id)}>Écrire à ${firstName(b)}</button>` : null}
  </div>`;
}
// In the Studio: the talents (and the agency), the offers for them, the month.
function AgencySection({ g, now }) {
  const A = g.agency || null, L = talentsOn(g), asked = A ? A.talents.filter((T) => T.state === 'asked' && g.chars[T.c]) : [];
  const [name, setName] = useState(''), [emo, setEmo] = useState(AG_EMOJIS[0]), [form, setForm] = useState(false);
  const open = A ? A.deals.filter((d) => tdealOpen(d)).slice().reverse() : [], past = A ? A.deals.filter((d) => !tdealOpen(d)).slice(-4).reverse() : [];
  const M = A && A.month && A.month.k === agMonth(g, now).k ? A.month : null, why = agencyWhy(g);
  const found = () => { const r = foundAgency(g, name, emo); if (!r.ok) { toast(r.why, 'bad'); return; } setForm(false); toast(`${emo} « ${str(name, 40)} » est née !`, 'good'); update(); };
  return html`<section class="section agency">
    <div class="section-h"><h3>${agencyFounded(g) ? `${A.emoji} ${A.name}` : '🤝 Tes talents'}</h3><span>${L.length ? `${L.length}/${talentCap(g)} ${plural(L.length, 'talent', 'talents')} · ${fmtMoney(g, (A && A.earned) || 0)} de commissions` : 'agent de personne'}</span></div>
    ${!L.length && !asked.length ? html`<p class="muted">Deviens l’agent d’un perso depuis son profil : tu lui trouves des marques, tu négocies, tu prends ta commission. C’est le perso qui décide.</p>` : null}
    ${A && (L.length || A.earned) ? html`<div class="ag-rep"><span>Réputation d’agent</span><${Meter} frac=${A.rep / 100} tone=${A.rep >= 60 ? 'good' : A.rep < 30 ? 'bad' : ''} /><b>${A.rep}/100</b><small class="muted">${agRepWord(A.rep)}${M ? ` · ce mois-ci : ${M.deals} ${plural(M.deals, 'partenariat', 'partenariats')}, +${fmtMoney(g, M.earned)}` : ''}</small></div>` : null}
    ${L.map((T) => { const c = g.chars[T.c]; return html`<div class="staff-row talent-row" key=${T.c}>
      <${Avatar} who=${author(g, 'c:' + c.id)} size=${44} onClick=${() => openChar(c.id)} />
      <div class="mid"><b>${c.name}</b><span>${fmtN(c.followers || 0)} abonnés · ${T.cut} %${T.excl ? ' · exclusivité' : ''}</span><small>${T.deals || 0} ${plural(T.deals || 0, 'partenariat livré', 'partenariats livrés')} · ${fmtMoney(g, T.earned || 0)}</small>
        <${TalentAlerts} g=${g} c=${c} T=${T} now=${now} /></div>
      <div class="acts"><button class="btn btn-ghost btn-sm" onClick=${() => openDM(c.id)} aria-label=${'Écrire à ' + firstName(c)} title=${'Écrire à ' + firstName(c)}><${Icon} n="msg" s=${14} /></button></div>
    </div>`; })}
    ${asked.length ? html`<p class="muted">En attente de réponse : ${asked.map((T) => firstName(g.chars[T.c])).join(', ')}.</p>` : null}
    ${open.map((d) => html`<${TdealCard} key=${d.id} g=${g} d=${d} now=${now} />`)}
    ${past.length ? html`<details class="ledger"><summary>Anciens contrats de tes talents</summary><ul>${past.map((d) => html`<li key=${d.id}><span>${d.emoji} ${d.brand} × ${g.chars[d.c] ? firstName(g.chars[d.c]) : '?'}</span><b>${TD_STATES[d.state] || d.state}</b></li>`)}</ul></details>` : null}
    ${agencyFounded(g) ? html`<small class="muted">${hasStaff(g, 'agence') ? '' : 'Engage un agent pour ton agence (Recruter) : plus d’offres, de meilleurs prix, plus de talents.'}</small>`
      : L.length ? (form ? html`<div class="ag-found">
          <input class="input" maxlength="40" value=${name} placeholder="Le nom de ton agence" onInput=${(e) => setName(e.target.value)} aria-label="Le nom de ton agence" />
          <div class="tr-chips">${AG_EMOJIS.map((x) => html`<button type="button" key=${x} class=${'chip-btn' + (emo === x ? ' on' : '')} onClick=${() => setEmo(x)} aria-label=${'Emoji ' + x}>${x}</button>`)}</div>
          <div class="row"><button class="btn btn-hot btn-sm" disabled=${!!why || str(name, 40).length < 2} onClick=${found}>Monter l’agence · ${fmtMoney(g, FOUND_COST)}</button><button class="linkbtn quiet" onClick=${() => setForm(false)}>Annuler</button></div>
          ${why ? html`<small class="muted">${why}</small>` : null}</div>`
        : html`<button class=${'btn btn-sm ' + (why ? 'btn-ghost' : 'btn-hot')} onClick=${() => setForm(true)}>🏢 Monter ton agence</button>${why ? html`<small class="muted">${why}</small>` : html`<small class="muted">Plus de place pour tes talents, des marques qui viennent plus souvent, un agent à engager.</small>`}`) : null}
  </section>`;
}
