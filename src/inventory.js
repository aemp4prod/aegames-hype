/* =========================================================
   0.26: the inventory, and second-hand sales.
   - Everything the player owns and does not use: the gear they replaced, the gear and the products brands sent, what
     they bought for themselves, what someone gave them. Nothing is sold in their place any more: a gift better than
     what they have goes in use (the old one to the inventory), otherwise it waits in the inventory.
   - Selling: the second-hand app of this world (inspired by the real ones, with its own name and look). The player sets
     the price; how fast it goes depends on that price against what the thing is worth (its state), on the audience and
     on how warm the community is: fans pay more for what comes from their creator. No AI call: the game counts.
   - A brand that sees its gift on sale soon after sending it, or a character their present, may take it badly: their
     AI decides how (a trigger for the next calls, a line in the brand's DMs).
   ========================================================= */
const INV_MAX = 80;
const COND = {
  neuf: { label: 'Neuf', k: 0.75 },
  bon: { label: 'Bon état', k: 0.5 },
  abime: { label: 'Abîmé', k: 0.3 },
  casse: { label: 'Cassé', k: 0.1 },
};
const RESALE_APP = { aldoree: 'La Foire aux Trouvailles', orion: 'Troc Orbital' };
const resaleName = (g) => (g && g.world && RESALE_APP[g.world.preset]) || 'Occaz';
const NOTICE_MS = 30 * DAY_MS; // a gift on sale this soon after it came: whoever gave it may see it
const SALE_RATE = 1 / 30; // the chance an hour of game time, at the right price, for an ordinary audience: a day or two
const invOf = (g) => (Array.isArray(g.inv) ? g.inv : (g.inv = []));
const invItem = (g, id) => invOf(g).find((x) => x.id === id) || null;
const invLive = (g) => invOf(g).filter((x) => !x.sold);
const invSold = (g) => invOf(g).filter((x) => x.sold).sort((a, b) => b.sold.at - a.sold.at);
const roundPrice = (n) => (n < 20 ? Math.max(1, Math.round(n)) : n < 100 ? Math.round(n / 5) * 5 : n < 1000 ? Math.round(n / 10) * 10 : Math.round(n / 50) * 50);

function invAdd(g, o) {
  const it = { id: uid('iv'), kind: o.kind || 'buy', name: cap1(str(o.name, 80)) || 'Un objet', emoji: cleanEmoji(o.emoji) || '📦', value: Math.max(0, Math.round(num(o.value, 0))),
    cond: COND[o.cond] ? o.cond : 'neuf', at: o.at || Date.now(), from: o.from || {} };
  if (o.gear) it.gear = o.gear;
  const list = invOf(g);
  list.push(it);
  // 0.27.6: over the cap, the sold entries go first, then the least valuable thing that is not on sale (it went silently,
  // whatever it was worth, on sale or not)
  while (list.length > INV_MAX) {
    let k = list.findIndex((x) => x.sold);
    if (k < 0) { let best = -1; list.forEach((x, j) => { if (x !== it && !x.sale && (best < 0 || x.value < list[best].value)) best = j; }); k = best; }
    if (k < 0) break;
    list.splice(k, 1);
  }
  return it;
}
// A piece of gear: its state from its life (a gift never used is new).
const gearCond = (it, fresh) => (it.broken || it.virus ? 'casse' : it.crack ? 'abime' : fresh ? 'neuf' : 'bon');
function gearToInv(g, k, it, from = {}, fresh = false) {
  if (!it || !GEAR[k]) return null;
  const value = it.dead ? 0 : priceOf(k, it) || 0;
  if (!(value > 0)) return null; // (the old phone nobody wants)
  const X = it.sp ? NEW_BY_ID[it.sp] : null;
  const F = it.from && it.from.how === 'marque' ? it.from : from; // 0.27.6: a brand's gift stays theirs, in use or not
  return invAdd(g, { kind: 'gear', name: itemName(g, k, it), emoji: X ? X.emoji : GEAR[k].emoji, value, cond: gearCond(it, fresh), from: F, gear: { k, it } });
}
// A piece of gear from the inventory goes in use; the one it replaces goes to the inventory.
function equipInv(g, id) {
  const x = invItem(g, id);
  if (!x || x.kind !== 'gear' || !x.gear || x.sold || !g.gear) return false;
  const { k, it } = x.gear, cur = g.gear.items[k];
  invOf(g).splice(invOf(g).indexOf(x), 1);
  g.gear.items[k] = it;
  const old = cur ? gearToInv(g, k, cur, { how: 'ancien' }) : null;
  addNotif(g, { k: 'gear', text: `🔧 Tu utilises maintenant : ${x.name}${old ? ' (l’ancien est dans ton inventaire)' : ''}${it.broken || it.virus ? ' : il est encore en panne, fais-le réparer' : ''}.` });
  return true;
}
// A gift of gear (a brand's): in use if it is better than what the player has, otherwise in the inventory.
function receiveGear(g, k, it, from, label) {
  const cur = g.gear && g.gear.items[k];
  if (from && from.how === 'marque') it.from = Object.assign({ at: Date.now() }, from); // (0.27.6: where it came from travels with it)
  if (g.gear && (!usable(cur) || tierOfItem(cur) < tierOfItem(it))) {
    g.gear.items[k] = it;
    const old = cur ? gearToInv(g, k, cur, { how: 'ancien' }) : null; // (broken: it waits there, its repair goes on, it can be used again)
    addNotif(g, { k: 'gear', text: `📦 ${label} : en service${old ? ' (l’ancien est dans ton inventaire)' : ''}.` });
    return 'used';
  }
  gearToInv(g, k, it, from, true);
  addNotif(g, { k: 'gear', text: `📦 ${label} : tu avais déjà aussi bien, il t’attend dans ton inventaire.` });
  return 'kept';
}

// 0.27.6: a repair paid for, a reinstall, a counterfeit's end go on in the inventory too (they only ran for gear in use:
// a station at the repairer pushed there by a gift never came back).
function tickInvGear(g, t = Date.now()) {
  let ch = false;
  for (const x of invOf(g)) {
    const it = x.kind === 'gear' && !x.sold && x.gear && x.gear.it;
    if (!it) continue;
    if (it.fake && t >= it.fake) {
      delete it.fake; it.dead = true; it.broken = 1; x.cond = 'casse'; x.value = 0;
      if (x.sale) delete x.sale;
      addNotif(g, { k: 'gear', text: `🪤 ${x.name}, dans ton inventaire : c’était une contrefaçon, elle a lâché. Elle ne vaut plus rien.` });
      ch = true;
      continue;
    }
    if (it.fixAt && t >= it.fixAt) { it.fixAt = 0; it.broken = 0; x.cond = gearCond(it, false); addNotif(g, { k: 'gear', text: `🔧 ${x.name} est de retour de réparation (dans ton inventaire).` }); ch = true; }
    if (it.virusEnd && t >= it.virusEnd) { it.virusEnd = 0; it.virus = 0; x.cond = gearCond(it, false); ch = true; }
  }
  return ch;
}

/* ---------- the price, and how fast it goes ---------- */
const warm01 = (g) => clamp(warmOf(g) / 100, 0, 1);
const fame01 = (g) => clamp(Math.log10(Math.max(1, g.stats.followers)) / 6, 0, 1);
const fanBoost = (g) => 0.4 * warm01(g) * fame01(g); // fans pay more for what comes from their creator
const fairOf = (g, x) => Math.max(1, x.value * (COND[x.cond] || COND.bon).k);
const suggestOf = (g, x) => roundPrice(fairOf(g, x) * (1 + fanBoost(g)));
const resaleDemand = (g) => (0.5 + 0.5 * warm01(g)) * (0.6 + 0.25 * Math.log10(1 + g.stats.followers / 1000));
// 0.27.6: three times what it is worth (fans included) or more, nobody buys (before: 3 % of the pace, whatever the price:
// a thing listed at ten million sold within weeks)
const priceK = (r) => (r <= 0.6 ? 3 : r >= 3 ? 0 : clamp(Math.pow(2, (1 - r) * 4), 0, 3));
// How it should go, in words (the sell sheet).
function saleSpeed(g, x, price) {
  const r = price / (fairOf(g, x) * (1 + fanBoost(g))), k = priceK(r), h = 1 / Math.max(1e-6, SALE_RATE * resaleDemand(g) * k);
  if (!(k > 0)) return 'ne partira pas : beaucoup trop cher pour ce que c’est';
  return h <= 12 ? 'part dans la journée' : h <= 48 ? 'part en un ou deux jours' : h <= 24 * 6 ? 'peut prendre plusieurs jours' : 'risque de ne jamais partir';
}
function listItem(g, id, price) {
  const x = invItem(g, id);
  if (!x || x.sold) return false;
  const p = Math.round(num(price, 0));
  if (!(p >= 1)) { toast('Indique un prix.', 'bad'); return false; }
  const first = !x.sale, t = Date.now();
  x.sale = Object.assign(x.sale || { at: t, views: 0, favs: 0 }, { price: p, last: x.sale ? x.sale.last : t });
  if (first) noticeSale(g, x);
  return true;
}
function unlist(g, id) { const x = invItem(g, id); if (x && x.sale) delete x.sale; }
// Game time goes by: buyers come, or not.
function tickResale(g, t = Date.now()) {
  let ch = false;
  for (const x of invOf(g)) {
    const s = x.sale;
    if (!s || x.sold) continue;
    const from = s.last || s.at, hrs = (t - from) / 3600000;
    if (hrs < 0.25) continue;
    const r = s.price / (fairOf(g, x) * (1 + fanBoost(g))), d = resaleDemand(g), k = priceK(r);
    s.views += Math.round(hrs * (3 + 12 * d) * rand(0.6, 1.4));
    s.favs = (s.favs || 0) + hrs * 0.35 * d * k * rand(0.5, 1.5); // (0.27.6: kept with its fractions, shown whole)
    s.last = t;
    ch = true;
    if (roll() >= 1 - Math.pow(1 - clamp(SALE_RATE * d * k, 0, 0.9), hrs)) continue;
    sellItem(g, x, Math.min(t, from + rand(0.15, 1) * (t - from)));
  }
  return ch;
}
function sellItem(g, x, at = Date.now()) {
  const s = x.sale, app = resaleName(g);
  const fan = Math.random() < 0.8 * warm01(g) * (g.stats.followers >= 300 ? 1 : 0.2);
  const fans = fan ? fanList(g) : [], who = fans.length && Math.random() < 0.5 ? pick(fans).name : '';
  x.sold = { price: s.price, at, fan, who };
  delete x.sale;
  earn(g, s.price, `${app} : ${x.name}`, 'resale');
  addNotif(g, { k: 'money', at, text: `💸 Vendu sur ${app} : ${x.name}, ${fmtMoney(g, s.price)} (${who ? `à ${who}, qui te suit` : fan ? 'à quelqu’un qui te suit' : 'à quelqu’un que tu ne connais pas'}).` });
  if (fan) warmMove(g, 0.5, 'un abonné a acheté un objet du joueur', at);
}

/* ---------- whoever gave it may see it on sale ---------- */
function noticeSale(g, x) {
  const t = Date.now(), app = resaleName(g), F = x.from || {};
  const got = F.at || x.at; // (0.27.6: when it came, not when it went back to the inventory)
  if (t - got > NOTICE_MS) return;
  const d = F.deal ? (g.deals || []).find((y) => y.id === F.deal) : null, c = F.c ? g.chars[F.c] : null;
  if (d && c) {
    if (d.resold) return; // (0.27.6: they learn it once; a new ad for the same gift is the same story)
    d.resold = { at: t, what: x.name, price: x.sale.price, after: t - got };
    const il = gx(c.g, 'il', 'elle', 'iel');
    addTrigger(g, `@${c.handle} (${d.brand}${d.state === 'signed' ? ', contrat pas encore livré' : ''}) tombe sur l’annonce : le joueur revend sur ${app} « ${str(x.name, 40)} », offert il y a ${fmtDur(t - got)}, à ${fmtMoney(g, x.sale.price)}. ${cap1(il)} peut lui en parler en privé, à sa façon.`, c.id); // (0.27.6: short enough to be kept whole)
  } else if (c && isMain(c) && F.how === 'cadeau') {
    const il = gx(c.g, 'il', 'elle', 'iel');
    addTrigger(g, `@${c.handle} pourrait voir le joueur revendre « ${str(x.name, 40)} » sur ${app}, son cadeau d’il y a ${fmtDur(t - got)} : s’${il} le voit, ${il} réagit à sa façon (blessé·e, vexé·e, ou amusé·e).`, c.id);
  }
}
// The brand's DMs: what they know of it (kept with the contract).
const resoldLine = (g, d) => (d && d.resold ? `Le joueur a mis en vente sur ${resaleName(g)} ce que ${d.brand} lui avait offert (« ${d.resold.what} », à ${fmtMoney(g, d.resold.price)}), ${fmtDur(d.resold.after || 0)} après l’avoir reçu.` : '');
// What the story knows: what is on sale, what sold lately (the audience can see it).
function resaleCtx(g) {
  const on = invLive(g).filter((x) => x.sale).slice(0, 3), t = Date.now();
  const sold = invSold(g).filter((x) => t - x.sold.at < 3 * DAY_MS).length;
  if (!on.length && !sold) return '';
  return `Le joueur revend des affaires sur ${resaleName(g)}${on.length ? ` : ${on.map((x) => `${x.name} (${fmtMoney(g, x.sale.price)})`).join(', ')}` : ''}${sold ? `${on.length ? ' ; ' : ' : '}${sold} ${plural(sold, 'vente', 'ventes')} ces derniers jours` : ''}. Ses abonnés peuvent le voir.`;
}

/* ---------- what someone gives the player (a date, their messages) ---------- */
const GIFT_RE = /\b(?:cadeaux?|offr\w*|offert\w*|anniv\w*|souvenir|surprise|pour toi|colis|envoy\w*|garde-le|garde-la|tiens)\b/i;
const giftTalk = (text, history) => GIFT_RE.test(String(text || '')) || (history || []).slice(-6).some((m) => m && m.text && GIFT_RE.test(m.text));
const GIFT_LINE = (g, c) => `- Seulement si ${c.name.split(' ')[0]} donne ou envoie pour de vrai un objet au joueur, maintenant (pas une promesse) : {"t":"gift","what":"≤ 60 caractères : l’objet","value":30} (value : ce qu’il vaut à peu près, en ${moneyWord(g)}).`;
function receiveGift(g, c, o, at = later()) {
  const what = str(o.what, 60);
  if (!what || !c) return null;
  const x = invAdd(g, { kind: 'gift', name: what, emoji: '🎁', value: clamp(Math.round(buyPrice(o.value)), 0, 5000), cond: 'neuf', at, from: { how: 'cadeau', c: c.id } });
  addNotif(g, { k: 'vibe', c: c.id, at, text: `🎁 ${c.name.split(' ')[0]} t’offre : ${what}. Il t’attend dans ton inventaire.` });
  return x;
}

/* ---------- the screens ---------- */
const fromText = (g, x) => {
  const F = x.from || {}, c = F.c ? g.chars[F.c] : null;
  if (F.how === 'marque') return `Offert par ${F.brand || (c ? c.name : 'une marque')}`;
  if (F.how === 'cadeau') return `Offert par ${c ? c.name.split(' ')[0] : 'quelqu’un'}`;
  if (F.how === 'ancien') return 'Ton ancien matos';
  if (F.how === 'achat') return 'Acheté';
  return '';
};
function InvRow({ g, x, now }) {
  return html`<div class=${'inv-row' + (x.sale ? ' on-sale' : '')}>
    <span class="inv-emo" aria-hidden="true">${x.emoji}</span>
    <div class="mid"><b>${x.name}</b><small>${[fromText(g, x), fmtAgo(x.at, now), COND[x.cond].label, x.value > 0 ? `revente ≈ ${fmtMoney(g, roundPrice(fairOf(g, x)))}` : ''].filter(Boolean).join(' · ')}</small>
      ${x.sale ? html`<small class="inv-sale">🏷️ En vente sur ${resaleName(g)} · ${fmtMoney(g, x.sale.price)} · ${fmtN(x.sale.views)} vues · ♡ ${fmtN(Math.floor(x.sale.favs || 0))}</small>` : null}</div>
    <div class="acts">
      ${x.kind === 'gear' && !x.sale && !(x.gear && x.gear.it && x.gear.it.dead) ? html`<button class="btn btn-ghost btn-sm" onClick=${() => { if (equipInv(g, x.id)) update(); }}>Utiliser</button>` : null}
      <button class=${'btn btn-sm ' + (x.sale ? 'btn-ghost' : 'btn-hot')} onClick=${() => openLayer({ t: 'sell', id: x.id })}>${x.sale ? 'Voir l’annonce' : 'Vendre'}</button>
    </div>
  </div>`;
}
function InvSection({ g, now }) {
  const live = invLive(g).sort((a, b) => b.at - a.at), sold = invSold(g);
  const app = resaleName(g);
  return html`<section class="section inv-sec">
    <div class="section-h"><h3>Ton inventaire</h3><span>${live.length ? `${live.length} ${plural(live.length, 'objet', 'objets')}` : 'vide'}</span></div>
    ${live.length ? live.slice(0, 6).map((x) => html`<${InvRow} key=${x.id} g=${g} x=${x} now=${now} />`)
      : html`<p class="muted">Les cadeaux des marques, ton ancien matos, ce que tu t’achètes et ce qu’on t’offre arrivent ici. Tu les gardes, tu les utilises ou tu les revends.</p>`}
    <div class="row">${live.length > 6 ? html`<button class="btn btn-ghost btn-sm" onClick=${() => openLayer({ t: 'inv' })}>Tout voir (${live.length})</button>` : null}
      <button class="btn btn-ghost btn-sm resale-btn" onClick=${() => openLayer({ t: 'resale' })}><span aria-hidden="true">🏷️</span> Revendre sur ${app}${sold.length ? ` · ${sold.length} ${plural(sold.length, 'vente', 'ventes')}` : ''}</button></div>
  </section>`;
}
function InvLayer({ g, now, i }) {
  const live = invLive(g).sort((a, b) => b.at - a.at);
  return html`<${LayerShell} i=${i} title="Ton inventaire"><div class="lpad">
    ${live.length ? live.map((x) => html`<${InvRow} key=${x.id} g=${g} x=${x} now=${now} />`) : html`<div class="empty"><b>Ton inventaire est vide</b></div>`}
  </div><//>`;
}
// Putting something on sale: the price is the player's, the game says what it is worth and how fast it would go.
function SellLayer({ l, g, now, i }) {
  const x = invItem(g, l.id);
  const sug = x ? suggestOf(g, x) : 0;
  const [price, setPrice] = useState(() => String(x && x.sale ? x.sale.price : sug));
  if (!x || x.sold) return html`<${LayerShell} i=${i} title="Vendre"><div class="empty"><b>${x && x.sold ? 'Déjà vendu' : 'Objet introuvable'}</b></div><//>`;
  const app = resaleName(g), p = Math.round(num(price, 0)), w = warmWord(warmOf(g)), boost = Math.round(fanBoost(g) * 100);
  const picks = [['Vendre vite', roundPrice(sug * 0.8)], ['Prix conseillé', sug], ['Prix fort', roundPrice(sug * 1.25)]];
  const go = () => { if (listItem(g, x.id, p)) { toast(x.sale && x.sale.at < Date.now() - 1000 ? 'Prix mis à jour.' : `En vente sur ${app} : ${fmtMoney(g, p)}.`, 'good'); closeLayer(); update(); } };
  return html`<${LayerShell} i=${i} title=${x.sale ? 'Ton annonce' : 'Vendre sur ' + app}><div class="lpad sell">
    <div class="sell-item"><span class="inv-emo big" aria-hidden="true">${x.emoji}</span><div><b>${x.name}</b><small>${[fromText(g, x), COND[x.cond].label, `valeur neuve ${fmtMoney(g, x.value)}`].filter(Boolean).join(' · ')}</small></div></div>
    <p class="muted">${x.cond === 'neuf' ? 'Neuf, jamais servi' : `D’occasion, ${COND[x.cond].label.toLowerCase()}`} : ça se revend autour de ${fmtMoney(g, roundPrice(fairOf(g, x)))}.${boost >= 3 ? ` Ta commu est ${w[1]} ${w[2]} : tes abonnés paient jusqu’à ${boost} % de plus ce qui vient de toi.` : ''}</p>
    <div class="field"><label class="lbl" for="sell-price">Ton prix</label>
      <input id="sell-price" class="input" inputmode="numeric" value=${price} onInput=${(ev) => setPrice(ev.target.value.replace(/[^\d]/g, '').slice(0, 7))} />
      <div class="row sell-picks">${picks.map(([lbl, v]) => html`<button key=${lbl} type="button" class=${'chip-btn' + (p === v ? ' on' : '')} onClick=${() => setPrice(String(v))}>${lbl} · ${fmtMoney(g, v)}</button>`)}</div>
      ${p >= 1 ? html`<small class="muted">À ${fmtMoney(g, p)}, ça ${saleSpeed(g, x, p)}.</small>` : null}
    </div>
    <button class="btn btn-hot" onClick=${go} disabled=${!(p >= 1)}><${Icon} n="cash" s=${16} /> ${x.sale ? 'Changer le prix' : 'Mettre en vente'}</button>
    ${x.sale ? html`<button class="btn btn-ghost" onClick=${() => { unlist(g, x.id); toast('Annonce retirée.'); closeLayer(); update(); }}>Retirer l’annonce</button>` : null}
  </div><//>`;
}
// The app itself: what is on sale, what sold.
function ResaleLayer({ g, now, i }) {
  const [tab, setTab] = useState('on');
  const app = resaleName(g), on = invLive(g).filter((x) => x.sale).sort((a, b) => b.sale.at - a.sale.at), sold = invSold(g);
  const total = sold.reduce((n, x) => n + x.sold.price, 0), toSell = invLive(g).filter((x) => !x.sale);
  const list = tab === 'on' ? on : tab === 'sold' ? sold : toSell;
  return html`<${LayerShell} i=${i} title=${app}
    head=${html`<div class="rs-title"><span class="rs-logo" aria-hidden="true">🏷️</span><b>${app}</b><small>l’appli de seconde main</small></div>`}>
    <div class="rs-head">
      <div class="rs-stats"><span><b>${on.length}</b> en vente</span><span><b>${sold.length}</b> ${plural(sold.length, 'vendu', 'vendus')}</span><span><b>${fmtMoney(g, total)}</b> gagnés</span></div>
      <${Seg} items=${[['on', 'En vente'], ['sold', 'Vendus'], ['add', 'Inventaire']]} value=${tab} onPick=${setTab} label="Rayon" />
    </div>
    <div class="lpad">
      ${list.length ? html`<div class="rs-grid">${list.map((x) => html`<button key=${x.id} type="button" class=${'rs-card' + (x.sold ? ' sold' : '')} onClick=${() => { if (!x.sold) openLayer({ t: 'sell', id: x.id }); }} disabled=${!!x.sold}>
          <span class="rs-pic" aria-hidden="true">${x.emoji}</span>
          <b class="rs-price">${fmtMoney(g, x.sold ? x.sold.price : x.sale ? x.sale.price : suggestOf(g, x))}</b>
          <span class="rs-name">${x.name}</span>
          <small>${x.sold ? `Vendu ${fmtAgo(x.sold.at, now)}${x.sold.fan ? ' · à quelqu’un qui te suit' : ''}` : x.sale ? `${COND[x.cond].label} · ${fmtN(x.sale.views)} vues · ♡ ${fmtN(Math.floor(x.sale.favs || 0))}` : `${COND[x.cond].label} · prix conseillé`}</small>
        </button>`)}</div>`
        : html`<div class="empty"><b>${tab === 'on' ? 'Rien en vente' : tab === 'sold' ? 'Pas encore de vente' : 'Ton inventaire est vide'}</b><span>${tab === 'add' ? 'Les cadeaux des marques, ton ancien matos et ce qu’on t’offre arrivent dans ton inventaire.' : 'Mets en vente ce que tu n’utilises plus, depuis ton inventaire.'}</span></div>`}
      <p class="muted rs-note">Une appli de seconde main de ${g.world.name}. Ce qui vient de toi part plus vite et plus cher quand ta commu est chaleureuse.</p>
    </div>
  <//>`;
}
