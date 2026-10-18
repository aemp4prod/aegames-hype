/* =========================================================
   Studio UI (0.7): the clock strip, the watch to skip time, the settings, the café budget, the Studio tab
   (channel, money, trends, sponsors, team, programme), recruiting, contracts in DMs, the daily upload sheet,
   the upload screens of each platform (inspired by them, never their logos), and the portraits.
   Loaded before ui.js (which renders): nothing here runs html`` at load time.
   ========================================================= */
const fmtDec = (x, d = 2) => String(Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).replace('.', ',');
const seasonEmoji = (d) => { const m = d.getMonth(); return m === 11 || m <= 1 ? '❄️' : m <= 4 ? '🌸' : m <= 7 ? '☀️' : '🍂'; };
const fmtCafes = (x) => (x === Infinity ? '∞' : fmtPlain(Math.floor(x + 1e-9)));

/* ---------- the strip under the top bar: the game clock, the moment, the money ---------- */
function StatusStrip({ g, now }) {
  const ck = fmtGameClock(now), d = ck.d, m = calMoment(d), c = g.career;
  return html`<div class="status-strip">
    <button class="clock-btn" onClick=${openWatch} aria-label=${`Il est ${ck.time}, ${ck.day}. Avancer le temps`} title="Avancer le temps"><${Icon} n="clock" s=${15} /><b>${ck.time}</b><span>${ck.day}</span><${Icon} n="ffwd" s=${13} /></button>
    ${standLv(g) ? html`<${StandChip} g=${g} />` : m ? html`<span class="cal-chip" title=${cap1(m.E.mood)}>${m.E.emoji} ${cap1(calWord(m))}</span>`
      : html`<span class="cal-chip quiet" title=${cap1(SEASON_WORD(d))}>${seasonEmoji(d)} Pubs ×${fmtDec(adSeason(d))}</span>`}
    <button class=${'cash-chip' + (c.cash < 0 ? ' neg' : '')} onClick=${() => { goTab('studio'); tapCash(); }} aria-label=${'Ton argent : ' + fmtMoney(g, c.cash) + '. Ouvrir le studio'}><span aria-hidden="true">💶</span><b>${fmtMoney(g, c.cash, false)}</b></button>
  </div>`;
}

/* ---------- the watch: drag the hand to choose how far to go ---------- */
function openWatch() { if (S.game) queueModal({ t: 'skip', at: Date.now() }); }
const WATCH_PRESETS = [[15, '+15 min'], [60, '+1 h'], [180, '+3 h'], ['soir', 'Ce soir 20 h'], ['matin', 'Demain 9 h'], [1440, '+1 jour'], [10080, '+1 semaine']];
function minsUntil(hour, t = Date.now()) { return Math.round((nextAt(hour, 0, t, 5 * 60000) - t) / 60000); }
function fmtSpan(mins) {
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
  return [d ? `${d} j` : '', h ? `${h} h` : '', m || (!d && !h) ? `${String(m).padStart(d || h ? 2 : 1, '0')} min` : ''].filter(Boolean).join(' ');
}
function WatchCard({ g, close }) {
  const t0 = Date.now();
  const r = activeRelease(g);
  const held = !!(r && r.due <= t0);
  const dates = activeEvents(g).filter((e) => e.player && e.due > t0);
  const stops = [...(r && r.due > t0 ? [{ at: r.due, label: `la sortie de ${ta(r)}`, short: 'Jusqu’à la sortie', due: () => { const x = S.game && activeRelease(S.game); return x && x.id === r.id ? x.due : 0; } }] : []),
    ...dates.map((e) => ({ at: e.due, label: `ton rendez-vous avec ${(g.chars[e.c] || { name: '…' }).name.split(' ')[0]}`, short: `Jusqu’au rdv · ${(g.chars[e.c] || { name: '…' }).name.split(' ')[0]}`, due: () => e.due }))].sort((a, b) => a.at - b.at);
  const maxMins = stops.length ? Math.max(1, Math.ceil((stops[0].at - t0) / 60000)) : 30 * 1440;
  const [mins, setMins] = useState(() => Math.min(60, maxMins));
  const drag = useRef(null);
  const nowDate = activeEvents(g).find((e) => e.player && e.due <= t0);
  const set = (v) => setMins(clamp(Math.round(v), 1, maxMins));
  const angleOf = (ev, el) => { const b = el.getBoundingClientRect(); const x = ev.clientX - (b.left + b.width / 2), y = ev.clientY - (b.top + b.height / 2); return (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360; };
  const onDown = (ev) => { const el = ev.currentTarget; el.setPointerCapture && el.setPointerCapture(ev.pointerId); drag.current = { el, last: mins }; onMove(ev); };
  const onMove = (ev) => {
    const dg = drag.current;
    if (!dg) return;
    const inHour = Math.round(angleOf(ev, dg.el) / 6 / 5) * 5 % 60; // 5-minute steps
    const prev = dg.last % 60;
    let hours = Math.floor(dg.last / 60);
    if (prev >= 45 && inHour <= 15) hours++; // the hand went past 12: one more hour
    else if (prev <= 15 && inHour >= 45 && hours > 0) hours--;
    const v = clamp(hours * 60 + inHour, 1, maxMins);
    dg.last = v;
    setMins(v);
  };
  const onUp = () => { drag.current = null; };
  const onKey = (ev) => {
    const k = ev.key, step = { ArrowRight: 5, ArrowUp: 60, ArrowLeft: -5, ArrowDown: -60, PageUp: 1440, PageDown: -1440 }[k];
    if (step) { ev.preventDefault(); set(mins + step); }
  };
  const arrive = t0 + mins * 60000, aD = gameDate(arrive), aud = audienceAt(aD), am = calMoment(aD);
  const mAng = (mins % 60) * 6; // a timer: one turn of the hand is one hour
  const go = (m, until) => { close(); skipTime(m * 60000, until); };
  const narrate = mins * 60000 >= SKIP_QUIET;
  if (held) {
    return html`<div class="modal-card watch-card"><span class="eyebrow">Accélérateur de temps</span><div class="modal-big" style="font-size:40px" aria-hidden="true">⏸️</div>
      <p>${cap1(ta(r))} doit sortir maintenant : ${whatF(r) ? 'tourne-la' : 'tourne-le'}${r.series ? '' : ` ou ${whatF(r) ? 'repousse-la' : 'repousse-le'}`} avant d’avancer le temps.</p>
      <button class="btn btn-hot" onClick=${() => { close(); startShoot(r); }}><${Icon} n="clapper" s=${16} /> Tourner ${laW(r)}</button>
      <button class="btn btn-ghost" onClick=${close}>Annuler</button></div>`;
  }
  return html`<div class="modal-card watch-card">
    <span class="eyebrow">Accélérateur de temps</span>
    <div class="watch-days" aria-label="Jours">
      <button type="button" class="iconbtn" onClick=${() => set(mins - 1440)} disabled=${mins <= 1440} aria-label="Un jour de moins">−</button>
      <span><b>${Math.floor(mins / 1440)}</b> ${plural(Math.floor(mins / 1440), 'jour', 'jours')}</span>
      <button type="button" class="iconbtn" onClick=${() => set(mins + 1440)} disabled=${mins + 1440 > maxMins} aria-label="Un jour de plus">+</button>
    </div>
    <svg class="watch" viewBox="0 0 220 220" role="slider" tabindex="0" aria-label="Durée à avancer" aria-valuemin="1" aria-valuemax=${maxMins} aria-valuenow=${mins} aria-valuetext=${fmtSpan(mins)}
      onPointerDown=${onDown} onPointerMove=${onMove} onPointerUp=${onUp} onPointerCancel=${onUp} onKeyDown=${onKey}>
      <circle cx="110" cy="110" r="104" class="w-rim" />
      <circle cx="110" cy="110" r="94" class="w-face" />
      <path d=${arcPath(110, 110, 94, 0, mAng)} class="w-arc" />
      ${Array.from({ length: 60 }, (_, i) => { const a = i * 6 * Math.PI / 180, big = i % 5 === 0; const r1 = big ? 80 : 86; return html`<line key=${i} x1=${110 + Math.sin(a) * r1} y1=${110 - Math.cos(a) * r1} x2=${110 + Math.sin(a) * 90} y2=${110 - Math.cos(a) * 90} class=${big ? 'w-tick big' : 'w-tick'} />`; })}
      ${[0, 15, 30, 45].map((n) => { const a = n * 6 * Math.PI / 180; return html`<text key=${n} x=${110 + Math.sin(a) * 66} y=${110 - Math.cos(a) * 66 + 4} class="w-num">${n}</text>`; })}
      <line x1="110" y1="110" x2=${110 + Math.sin(mAng * Math.PI / 180) * 78} y2=${110 - Math.cos(mAng * Math.PI / 180) * 78} class="w-min" />
      <circle cx=${110 + Math.sin(mAng * Math.PI / 180) * 78} cy=${110 - Math.cos(mAng * Math.PI / 180) * 78} r="11" class="w-knob" />
      <circle cx="110" cy="110" r="5" class="w-pin" />
      <text x="110" y="146" class="w-turns">${Math.floor(mins / 60) ? `${Math.floor(mins / 60)} h` : ''}</text>
    </svg>
    <div class="watch-read"><b>+ ${fmtSpan(mins)}</b><span>Arrivée ${fmtGameAt(arrive)}</span><small>${cap1(audienceWord(aud))}${am ? ' · ' + am.E.emoji + ' ' + calWord(am) : ''}</small></div>
    <div class="watch-fine">
      <button type="button" class="btn btn-ghost btn-sm" onClick=${() => set(mins - 60)} disabled=${mins <= 60}>− 1 h</button>
      <button type="button" class="btn btn-ghost btn-sm" onClick=${() => set(mins - 5)} disabled=${mins <= 5}>− 5 min</button>
      <button type="button" class="btn btn-ghost btn-sm" onClick=${() => set(mins + 5)} disabled=${mins + 5 > maxMins}>+ 5 min</button>
      <button type="button" class="btn btn-ghost btn-sm" onClick=${() => set(mins + 60)} disabled=${mins + 60 > maxMins}>+ 1 h</button>
    </div>
    <div class="watch-presets">${WATCH_PRESETS.map(([v, lb]) => { const m = v === 'soir' ? minsUntil(20) : v === 'matin' ? minsUntil(9) : v; return html`<button key=${lb} type="button" class=${'chip-btn' + (m === mins ? ' on' : '')} disabled=${m > maxMins} onClick=${() => set(m)}>${lb}</button>`; })}</div>
    ${stops.length ? html`<div class="paths">${stops.slice(0, 2).map((x) => html`<button key=${x.label} class="path" onClick=${() => go(Math.ceil((x.at - Date.now()) / 60000), x.due)}><b>${x.short}</b><span>${fmtGameAt(x.at)} · le temps ne peut pas aller plus loin</span></button>`)}</div>` : null}
    ${nowDate ? html`<p class="date-late"><${Icon} n="calendar" s=${15} /> ${(g.chars[nowDate.c] || { name: '…' }).name.split(' ')[0]} t’attend en ce moment : si tu avances trop, tu lui poses un lapin.</p>` : null}
    <p class="muted watch-note">Le réseau vit pendant que tu avances${narrate ? ` : ${AI_NAME} raconte ce qui s’est passé (≈ ${costLabel(g, 'skip')} ☕)` : ''}. Tes cafés, eux, suivent la vraie heure.</p>
    <button class="btn btn-hot" onClick=${() => go(mins)}><${Icon} n="ffwd" s=${16} /> Avancer de ${fmtSpan(mins)}</button>
    <button class="btn btn-ghost" onClick=${close}>Annuler</button>
  </div>`;
}
function arcPath(cx, cy, r, a0, a1) {
  if (a1 - a0 >= 359.9) a1 = a0 + 359.9;
  if (a1 <= a0) return '';
  const p = (a) => [cx + Math.sin(a * Math.PI / 180) * r, cy - Math.cos(a * Math.PI / 180) * r];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1} Z`;
}

/* ---------- the café budget: what the AI may use today ---------- */
function BudgetCard({ g, m, close }) {
  const b = budgetOf(g), e = energyNow(g), left = cafesLeft(g), out = !unlimited(g) && left <= 0.05;
  return html`<div class="modal-card budget-card">
    <span class="eyebrow">Ton budget IA du jour</span>
    <div class="budget-big"><span aria-hidden="true">☕</span><b>${unlimited(g) ? '∞' : fmtCafes(left)}</b>${unlimited(g) ? null : html`<small>/ ${fmtPlain(budgetMax(g))}</small>`}</div>
    ${out ? html`<p><b>Ton budget du jour est épuisé.</b> L’IA se met en pause pour ne pas manger tout ton abonnement ${AI_NAME}. Tu peux toujours lire ton fil et gérer ton studio.</p>`
      : m && m.blocked ? html`<p><b>Pas assez de cafés pour cette action.</b> Elle coûte environ ${costLabel(g, 'post')} ☕ et il t’en reste ${fmtCafes(left)}.</p>` : null}
    <p class="muted">Aujourd’hui : ${fmtDec(b.used, 1)} ☕ utilisés ≈ ${fmtPlain(budgetTokens(b.chars))} tokens de ton abonnement ${AI_NAME}. ${unlimited(g) ? 'Pas de limite réglée : le jeu compte, mais ne t’arrête jamais.' : `Le budget revient à minuit (dans ${fmtDur(e.nextIn)}).`}</p>
    <p class="muted" style="font-size:13px">1 café ≈ 4 500 tokens. Un post qui fait réagir tout le monde ≈ ${costLabel(g, 'post')} ☕, un message privé ≈ ${costLabel(g, 'dm')} ☕. C’est une estimation : ni Claude ni ChatGPT ne disent à une appli ce qu’il te reste vraiment.</p>
    <${CafeUses} g=${g} />
    ${!unlimited(g) ? html`<button class="btn btn-hot" onClick=${() => { addExtraCafes(g, 10); toast('+10 cafés pour aujourd’hui.', 'good'); close(); }}><${Icon} n="coffee" s=${16} /> +10 cafés juste pour aujourd’hui</button>` : null}
    <button class="btn btn-ghost" onClick=${() => { close(); openLayer({ t: 'settings' }); }}><${Icon} n="gear" s=${16} /> Régler mon budget</button>
    ${HOST ? html`<button class="btn btn-ghost" onClick=${() => HOST.openUsage && HOST.openUsage()}>Gérer l’usage dans ChatGPT</button>` : null}
    <button class="btn btn-ghost" onClick=${close}>OK</button>
  </div>`;
}
function BudgetPicker({ g }) {
  const b = budgetOf(g);
  return html`<div class="field">
    <span class="lbl">Budget IA par jour (les cafés)</span>
    <${BudgetTiers} value=${b.daily} lv=${levelOf(g)} vol=${volIdOf(g)} set=${(k) => { b.daily = k; b.warned = false; update(); try { localStorage.setItem('hype:budget', String(k)); } catch (e) { /* the next game starts at the default */ } }} />
    <small>${(BUDGETS.find((x) => x.n === b.daily) || BUDGETS[2]).desc} Aujourd’hui : ${fmtDec(b.used, 1)} ☕ ≈ ${fmtPlain(budgetTokens(b.chars))} tokens.</small>
    <small class="plan-advice">${PLAN_ADVICE}</small>
    <${CafeUses} g=${g} />
  </div>`;
}
/* 0.23.1: « Où passent tes cafés » : today's (or the whole game's) cafés, by what they were for, the biggest first. */
function CafeUses({ g }) {
  const [all, setAll] = useState(false);
  const list = usesOf(g, all), top = list.length ? list[0][1] : 1, sum = list.reduce((n, x) => n + x[1], 0);
  return html`<div class="cafe-uses">
    <div class="cu-head"><b>Où passent tes cafés</b><${Seg} items=${[[false, 'Aujourd’hui'], [true, 'Toute la partie']]} value=${all} onPick=${(v) => setAll(v)} label="Période" /></div>
    ${list.length ? html`<ul>${list.slice(0, 8).map(([k, n]) => html`<li key=${k}><span class="cu-what">${USE_LABELS[k] || USE_LABELS.autre}</span><span class="cu-bar"><i style=${'width:' + Math.max(3, Math.round((n / top) * 100)) + '%'}></i></span><span class="cu-n">${fmtDec(n, 1)} ☕</span></li>`)}</ul>
      <small class="muted">${fmtDec(sum, 1)} ☕ en tout${all ? ' depuis que le jeu les compte' : ' aujourd’hui'}.</small>`
      : html`<small class="muted">${all ? 'Rien de compté pour l’instant.' : 'Rien d’utilisé aujourd’hui.'}</small>`}
  </div>`;
}
// 0.10: the budget tiers, with what each is worth in actions (at this game's intensity).
function BudgetTiers({ value, set, lv = 'normal', vol }) {
  return html`<div class="tier-grid" role="radiogroup" aria-label="Budget IA par jour">${BUDGETS.map((x) => html`<button type="button" key=${x.n} role="radio" aria-checked=${value === x.n ? 'true' : 'false'} class=${'tier' + (value === x.n ? ' on' : '')} onClick=${() => set(x.n)}>
    <b>${x.label}</b><span>${x.n ? `${x.n} ☕ / jour` : '∞'}</span><small>${budgetHint(x.n, lv, vol || COMMENTS[(INTENSITY[lv] || INTENSITY.normal).comments].vol)}</small>
  </button>`)}</div>`;
}
// 0.10: how much the network says and writes (posts, comments, messages), apart from the budget. 0.19: what each level
// really costs in an hour of play (measured), with the settings as they are now (0.23.1: the two four-step settings).
// o: the game's options, or the new game's choices ({ intensity, comments, live }).
const hourCost = (o) => hourCafes(o.intensity, COMMENTS[commentsOf(null, o)].vol, HOST ? liveOf(null, o) : 'off');
function IntensityTiers({ value, set, comments, live }) {
  const I = INTENSITY[value] || INTENSITY.normal;
  return html`<div class="tier-grid int-grid" role="radiogroup" aria-label="Intensité du jeu">${INTENSITY_IDS.map((k) => { const X = INTENSITY[k], on = value === k; return html`<button type="button" key=${k} role="radio" aria-checked=${on ? 'true' : 'false'} class=${'tier' + (on ? ' on' : '')} onClick=${() => set(k)}>
    <b>${X.emoji} ${X.label}</b><span>≈ ${Math.round(hourCost(on ? { intensity: k, comments, live } : { intensity: k }))} ☕ / heure</span>
  </button>`; })}</div>
  <small>${I.desc}</small>`;
}
/* 0.19: the two biggest things a level does, each with its own setting (the level sets them; the player may change them).
   0.23.1: four steps each, with what they cost: the comments (Peu → Énorme) and, in the ChatGPT app, the network
   that lives on its own (Coupé → À fond), which pauses as soon as the player is not there. */
function IntensitySettings({ lv, comments, live, set }) {
  const o = { intensity: INTENSITY[lv] ? lv : 'normal', comments, live }, cm = commentsOf(null, o), lv2 = liveOf(null, o);
  const hour = (x) => hourCost(Object.assign({}, o, x));
  const plus = (a, b) => Math.max(1, Math.round(a - b));
  return html`<div class="int-settings">
    <div class="int-set">
      <span class="lbl">💬 Les commentaires</span>
      <${Seg} items=${COMMENT_IDS.map((k) => [k, COMMENTS[k].label])} value=${cm} onPick=${(k) => set('comments', k)} label="Les commentaires" />
      <small>${COMMENTS[cm].desc}${cm !== 'peu' ? ` ≈ +${plus(hour({ comments: cm }), hour({ comments: 'peu' }))} ☕ / heure par rapport à « Peu ».` : ''}</small>
    </div>
    ${HOST ? html`<div class="int-set">
      <span class="lbl">🌍 Le réseau vit tout seul</span>
      <${Seg} items=${LIVE_IDS.map((k) => [k, LIVE[k].label])} value=${lv2} onPick=${(k) => set('live', k)} label="Le réseau vit tout seul" />
      <small>${LIVE[lv2].desc}${lv2 !== 'off' ? ` ≈ +${plus(hour({ live: lv2 }), hour({ live: 'off' }))} ☕ / heure. Il se met en pause dès que Hype n’est plus devant toi ou que tu ne touches plus à rien depuis 3 minutes, et repart quand tu reviens.` : ''}</small>
    </div>` : null}
  </div>`;
}
const setIntensity = (g, k) => { const o = Object.assign({}, g.opts, { intensity: k }); delete o.chatty; delete o.autoLive; delete o.comments; delete o.live; g.opts = o; lsSet('hype:intensity', k); update(); }; // a level is a preset: its settings come back to its own
// k: 'comments' or 'live' (0.23.1; before: the switches 'chatty' and 'autoLive', still read in old games)
function setOpt(g, k, v) {
  const o = Object.assign({}, g.opts, { [k]: v });
  if (k === 'comments') delete o.chatty;
  if (k === 'live') delete o.autoLive;
  g.opts = o;
  update();
}

/* ---------- settings: everything about this game, behind the gear ---------- */
const THEMES = [['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']];
function themePref() { try { const v = localStorage.getItem('hype:theme'); return v === 'light' || v === 'dark' ? v : 'auto'; } catch (e) { return 'auto'; } }
function applyTheme(v = themePref()) { const el = document.documentElement; if (v === 'light' || v === 'dark') el.setAttribute('data-theme', v); else el.removeAttribute('data-theme'); }
function setTheme(v) { try { localStorage.setItem('hype:theme', v); } catch (e) { /* this view only */ } applyTheme(v); update(false); }
// The size of everything in the PC app (in a browser, its own zoom does it).
function ZoomPicker() {
  const z = S.host.zoom || { zoom: 1, auto: true };
  const set = (v) => { HOST.setZoom(v).catch(() => {}); };
  return html`<div class="field">
    <span class="lbl">Taille de l’affichage</span>
    <div class="row zoom-pick">
      <button type="button" class="btn btn-ghost btn-sm" onClick=${() => set(z.zoom - 0.1)} aria-label="Plus petit">A−</button>
      <b class="mono">${Math.round(z.zoom * 100)} %</b>
      <button type="button" class="btn btn-ghost btn-sm" onClick=${() => set(z.zoom + 0.1)} aria-label="Plus grand">A+</button>
      <button type="button" class="btn btn-ghost btn-sm" onClick=${() => set('auto')} disabled=${z.auto}>Taille auto</button>
    </div>
    <small>Aussi avec Ctrl + molette, Ctrl + et Ctrl −. Ctrl 0 revient à la taille auto, adaptée à ton écran.</small>
  </div>`;
}
function SettingsLayer({ g, i }) {
  const P = g.player;
  const pickPlatform = (k) => {
    if (k === platformOf(g)) return;
    askConfirm({ title: `Passer sur ${pfName(g, k)} ?`, text: `Ta monétisation repart de zéro sur ${pfName(g, k)} (chaque plateforme a son programme). Tes abonnés te suivent.`, ok: 'Changer de plateforme',
      run: () => { g.career.platform = k; g.career.prog = { state: 'none' }; g.trends = []; g.career.trendAt = 0; refreshTrends(g); update(); } });
  };
  return html`<${LayerShell} i=${i} title="Réglages">
    <section class="section">
      <div class="section-h"><h3>Partie</h3><span>${S.store === 'db' ? (HOST ? 'Sauvegardée sur cet ordi' : 'Sauvegardée sur ton compte') : S.store === 'local' ? 'Sauvegardée dans ce navigateur' : 'Non sauvegardée'}</span></div>
      <div class="row">
        <button class="btn btn-ghost btn-sm" onClick=${openSaves}><${Icon} n="save" s=${15} /> Sauvegardes</button>
        ${canFiles() ? html`<button class="btn btn-ghost btn-sm" onClick=${() => exportGame(g.id)}><${Icon} n="download" s=${15} /> Exporter</button>` : null}
        <button class="btn btn-ghost btn-sm" onClick=${leaveGame}><${Icon} n="grid" s=${15} /> Mes parties</button>
      </div>
    </section>
    <section class="section">
      <div class="section-h"><h3>Budget IA</h3><span>${unlimited(g) ? 'sans limite' : `${fmtCafes(cafesLeft(g))} ☕ restants aujourd’hui`}</span></div>
      <${BudgetPicker} g=${g} />
      ${!unlimited(g) ? html`<div class="row"><button class="btn btn-ghost btn-sm" onClick=${() => { addExtraCafes(g, 10); toast('+10 cafés pour aujourd’hui.', 'good'); }}><${Icon} n="coffee" s=${15} /> +10 cafés pour aujourd’hui</button></div>` : null}
      ${HOST ? html`<small class="muted">Pour une vraie limite côté OpenAI : ChatGPT → Réglages → Usage.</small>` : null}
    </section>
    <section class="section">
      <div class="section-h"><h3>Les personnages</h3><span>${AI_NAME}</span></div>
      ${HOST ? html`<${GptSettings} />` : null}
      <div class="field">
        <span class="lbl">Intelligence des personnages</span>
        <${Seg} items=${AI_TIERS} value=${aiTier()} onPick=${(k) => setAiTier(k)} label="Intelligence des personnages" />
        <small>${aiTier() === 'quick' ? 'Réponses plus rapides et moins de cafés, mais les personnages saisissent moins bien les nuances.' : aiTier() === 'complex' ? 'Les plus fins, mais plus lents (et ça pèse plus sur ton abonnement).' : 'Le bon équilibre entre finesse et vitesse.'}</small>
      </div>
      <div class="field">
        <span class="lbl">Intensité du jeu</span>
        <${IntensityTiers} value=${levelOf(g)} set=${(k) => setIntensity(g, k)} comments=${commentsOf(g)} live=${liveOf(g)} />
        <${IntensitySettings} lv=${levelOf(g)} comments=${commentsOf(g)} live=${liveOf(g)} set=${(k, v) => setOpt(g, k, v)} />
      </div>
      <div class="field">
        <span class="lbl">Rendez-vous</span>
        <${CareDatesBox} on=${!!(g.opts && g.opts.careDates)} set=${(v) => { g.opts = Object.assign({}, g.opts, { careDates: v }); lsSet('hype:careDates', v ? '1' : '0'); update(); }} />
      </div>
      <div class="field">
        <span class="lbl">Ambiance du monde</span>
        <${Seg} items=${CHAOS.map((c, k) => [k, c.label])} value=${g.world.chaos == null ? 1 : g.world.chaos} onPick=${(k) => { g.world.chaos = k; update(); }} label="Ambiance" />
        <small>${(CHAOS[g.world.chaos == null ? 1 : g.world.chaos] || CHAOS[1]).desc}</small>
      </div>
    </section>
    <section class="section">
      <div class="section-h"><h3>Ta carrière</h3><span>${nicheOf(g).label}</span></div>
      <div class="field">
        <span class="lbl">Ta plateforme principale</span>
        <div class="pf-pick">${Object.keys(PLATFORMS).map((k) => html`<button type="button" key=${k} class=${'pf-opt' + (platformOf(g) === k ? ' on' : '')} aria-pressed=${platformOf(g) === k ? 'true' : 'false'} onClick=${() => pickPlatform(k)}><span aria-hidden="true">${PLATFORMS[k].emoji}</span>${pfName(g, k)}</button>`)}</div>
        <small>Elle décide de tes formats, de tes trends et de la façon dont tu gagnes de l’argent.</small>
      </div>
    </section>
    <section class="section">
      <div class="section-h"><h3>Affichage</h3></div>
      <div class="field"><span class="lbl">Thème</span><${Seg} items=${THEMES} value=${themePref()} onPick=${setTheme} label="Thème" /></div>
      ${HOST && typeof HOST.setZoom === 'function' ? html`<${ZoomPicker} />` : null}
      <div class="field">
        <span class="lbl">Photos des persos</span>
        <${Seg} items=${[[true, 'Photos'], [false, 'Emojis']]} value=${g.portraits !== false} onPick=${(k) => { g.portraits = k; if (k) assignFaces(g); update(); }} label="Photos des persos" />
        <small>${PACK.people.length ? `${PACK.people.length} ${plural(PACK.people.length, 'personne', 'personnes')} et ${Object.keys(PACK.photos).length} photos dans le pack : les persos principaux ont leur photo, leur Insta et leurs posts photo. ` : 'Le pack photos arrive bientôt. '}Tu peux aussi importer une photo pour un perso depuis son profil.</small>
      </div>
    </section>
    ${menuOn() ? html`<section class="section">
      <div class="section-h"><h3>🛠️ Mode menu</h3><span>débloqué</span></div>
      <div class="row"><button class="btn btn-ghost btn-sm" onClick=${openMenu}><${Icon} n="gear" s=${15} /> Ouvrir le mode menu</button></div>
    </section>` : null}
    <section class="section danger-zone" style="border-bottom:0">
      <div class="section-h"><h3>Zone sensible</h3><span>Hype ${APP_VERSION} · ${APP_STAGE}</span></div>
      <button class="btn btn-ghost btn-sm" onClick=${() => askConfirm({ title: 'Supprimer cette partie ?', text: `${g.world.emoji} ${g.world.name} · ${P.name}. Tout sera effacé, sans retour possible.`, ok: 'Supprimer définitivement', danger: true, run: () => removeGame(g) })}><${Icon} n="trash" s=${15} /> Supprimer cette partie</button>
    </section>
  <//>`;
}

/* ---------- 0.27.4: the hidden menu: money, the clock, the reputation, the skills, the ties, set by hand ---------- */
// Opened with the Konami code (↑ ↑ ↓ ↓ ← → ← → B A, outside a text field) or 7 quick taps on the money; once unlocked,
// it is in the settings too. What it changes, nobody in the game hears about (no post, no chronicle).
const MENU_CODE = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
const menuOn = () => lsGet('hype:menu') === '1';
let menuKeys = [];
const cashTaps = { n: 0, at: 0 };
function openMenu() {
  if (S.phase !== 'game' || !S.game) { toast('Ouvre une partie pour le mode menu.'); return; }
  if (!menuOn()) { lsSet('hype:menu', '1'); toast('🛠️ Mode menu débloqué. Tu le retrouves aussi dans les Réglages.', 'good'); }
  if (!S.stack.some((l) => l.t === 'cheat')) openLayer({ t: 'cheat' });
}
function menuKey(e) {
  const el = e && e.target, tag = el && el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el && el.isContentEditable)) { menuKeys = []; return; }
  menuKeys = menuKeys.concat(String(e.key || '').toLowerCase()).slice(-MENU_CODE.length);
  if (menuKeys.length === MENU_CODE.length && menuKeys.every((k, n) => k === MENU_CODE[n])) { menuKeys = []; openMenu(); }
}
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('keydown', menuKey);
function tapCash() {
  const t = Date.now();
  cashTaps.n = t - cashTaps.at < 1600 ? cashTaps.n + 1 : 1;
  cashTaps.at = t;
  if (cashTaps.n >= 7) { cashTaps.n = 0; openMenu(); }
}
// « 50 000 », « 1234,5 », « -20 »: a number, or null.
const menuNum = (v) => { const x = parseFloat(String(v == null ? '' : v).replace(/[\s  ]/g, '').replace(',', '.')); return Number.isFinite(x) ? x : null; };
// The level: the characters a level brings still arrive (no gems: those are set by hand too); a lower level unlocks nothing back.
function menuLevel(g, n) {
  const s = g.stats, L = clamp(Math.round(n), 1, 300);
  while (s.level < L) {
    s.level++;
    const next = mains(g, false).find((c) => !c.unlocked);
    if (next) {
      Object.assign(next, { unlocked: true, unlockedAt: Date.now() });
      addNotif(g, { k: 'new', c: next.id, text: `${next.name} débarque dans ton monde` });
      addChronicle(g, `${next.name} (@${next.handle}) vient d’arriver dans le monde.`);
      addTrigger(g, `@${next.handle} vient d’arriver sur le réseau : qu’il ou elle se présente avec un premier post qui ouvre une nouvelle intrigue.`, next.id);
    }
  }
  s.level = L;
  s.xp = 0;
}
// The clock: the game shows `target` now (only the clock moves: nothing happens in between; a new month pays and bills once).
// 0.27.6: the day counters follow, or the days skipped were played at once (a month of merch orders in a second).
function menuClock(g, target) {
  if (!Number.isFinite(target)) return;
  g.clockOff = Math.round(target - Date.now());
  const day = gameDay(Date.now()), M = g.career && g.career.merch, m = membOf(g);
  for (const d of (M && M.drops) || []) if (d.state === 'live') d.day = day;
  if (m) m.day = day;
  if (g.career) g.career.warmDay = day;
}
// o: { cash, followers, gems, level, rep: { image, cred, pro, kind } on 1000, skills: { id: level }, at, rel: { charId: -100..100 } }
function menuApply(g, o) {
  const s = g.stats, c = g.career, done = [];
  const n = (k) => (o[k] == null ? null : menuNum(o[k]));
  if (n('cash') !== null) { c.cash = Math.round(n('cash') * 100) / 100; done.push('argent'); }
  if (n('followers') !== null) { s.followers = Math.max(0, Math.round(n('followers'))); checkMilestones(g); done.push('abonnés'); }
  if (n('gems') !== null) { s.gems = Math.max(0, Math.round(n('gems'))); done.push('gemmes'); }
  if (n('level') !== null) { menuLevel(g, n('level')); done.push('niveau'); }
  if (o.rep) {
    const P = ensureRep(s);
    for (const k of REP_IDS) { const x = menuNum(o.rep[k]); if (x !== null) P[k] = clamp(x / 10, 0, 100); }
    s.reputation = repGlobal(P);
    checkCancel(g); // (out of a cancel above 350, into one below 150: the usual rules)
    done.push('réputation');
  }
  if (o.skills) {
    if (!s.skills || typeof s.skills !== 'object') s.skills = {};
    if (!s.skillXp || typeof s.skillXp !== 'object') s.skillXp = {};
    for (const id of SKILL_IDS) { const x = menuNum(o.skills[id]); if (x !== null) { const L = clamp(Math.round(x), 0, SKILL_MAX); s.skills[id] = L; s.skillXp[id] = SKILL_CUM[L]; } }
    done.push('compétences');
  }
  if (o.at != null && Number.isFinite(+o.at)) { menuClock(g, +o.at); done.push('heure'); }
  if (o.rel) for (const id of Object.keys(o.rel)) {
    const ch = g.chars[id], x = menuNum(o.rel[id]);
    if (!ch || x === null) continue;
    ch.rel = clamp(Math.round(x), -100, 100);
    if (!ch.followsYou && ch.rel >= 25) ch.followsYou = true; // (0.27.6: the usual rule, in silence)
    else if (ch.followsYou && ch.rel < 0) ch.followsYou = false;
  }
  return done;
}
const pad2 = (x) => String(x).padStart(2, '0');
const dateField = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const timeField = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
function MenuRel({ g, c }) {
  const [v, setV] = useState(c.rel);
  return html`<div class="menu-rel">
    <${Avatar} who=${author(g, 'c:' + c.id)} size=${32} />
    <div class="mid"><b>${c.name}</b><span>${relLabel(v, c.g, c.vibe)} · ${v > 0 ? '+' : ''}${v}</span>
      <input type="range" min="-100" max="100" step="1" value=${v} aria-label=${'Relation avec ' + c.name}
        onInput=${(ev) => setV(+ev.target.value)} onChange=${(ev) => { menuApply(g, { rel: { [c.id]: ev.target.value } }); update(); }} /></div>
  </div>`;
}
// 0.27.6: the mini-games on demand: a practice round that counts for nothing (the AI writes the ones it writes, the
// others are made at once), or the next shoot's game imposed.
const MENU_GAMES = [['tri', 'Trier'], ['ordre', 'Remettre dans l’ordre'], ['quiz', 'Quiz'], ['vf', 'Vrai ou faux'], ['intrus', 'Trouve l’intrus'], ['montage', 'Coupe au rythme'], ['memoire', 'Mémoire'], ['chat', 'Chat d’un live'], ['mixage', 'Mixage'], ['cadrage', 'Recadrage']];
const PRACTICE_WHAT = { chat: 'live', mixage: 'podcast', cadrage: 'short' };
function startPractice(g, kind, diffId) {
  if (S.busy.mg) { toast('Un mini-jeu est déjà en préparation.'); return false; }
  const D = diffOf(D_REAL_OK(kind, diffId)), P = PF(g);
  const what = PRACTICE_WHAT[kind] || (P.fmts.includes('vidéo') ? 'vidéo' : P.main);
  const last = (g.releases || []).filter((x) => x.state === 'released').slice(-1)[0];
  const r = { id: 'practice', kind, what, noun: what === 'short' ? P.shortName : '', topic: (last && last.topic) || str(g.player.identity, 80) || 'mon sujet', state: 'scheduled',
    diff: D.id, game: null, played: null, crew: [], practice: true, at: Date.now(), due: Date.now(), delays: 0, tries: 0, score: null };
  S.practice = r;
  if (!S.stack.some((l) => l.t === 'practice')) openLayer({ t: 'practice' });
  if (ROUND_MAKERS[kind]) { r.game = Object.assign(ROUND_MAKERS[kind](r, D), { diff: D.id }); update(); return true; }
  genGame(r, () => promptMiniGame(g, r, kind), () => null, 'Entraînement', kind); // (without the AI: said, not replaced)
  return true;
}
const D_REAL_OK = (kind, id) => (diffOf(id).real && kind !== 'quiz' ? 'mythique' : id); // (Cauchemar: real questions, a quiz only)
function PracticeLayer({ g, i, now }) {
  const r = S.practice;
  let body;
  if (!r) body = html`<div class="empty"><b>Pas d’entraînement en cours</b><span>Ouvre le mode menu pour en lancer un.</span></div>`;
  else if (r.score != null) {
    const tier = tierOf(r.score), D = diffOf(r.diff);
    body = html`<div class="mg-intro practice-end">
      <span class="eyebrow">Entraînement · ${(MENU_GAMES.find((x) => x[0] === r.kind) || [0, r.kind])[1]}</span>
      <h3>${Math.round(r.score * 100)} % · ${tier === 'top' ? 'réussi 🎉' : tier === 'mid' ? 'moyen' : 'raté'}</h3>
      <span class="chip">${D.emoji} ${D.label}</span>
      <p class="muted">Rien ne compte dans ta partie : ni vues, ni argent, ni réputation.</p>
      <div class="row"><button class="btn btn-hot" onClick=${() => startPractice(g, r.kind, r.diff)}><${Icon} n="refresh" s=${16} /> Rejouer</button><button class="btn btn-ghost" onClick=${closeLayer}>Fermer</button></div>
    </div>`;
  } else if (!r.game && r.aiFail && !S.busy.mg) body = html`<div class="mg-intro practice-end"><h3>${AI_NAME} n’a pas répondu</h3><p class="muted">Ce mini-jeu est écrit par ${AI_NAME} (le budget IA du jour est peut-être épuisé). Réessaie, ou choisis un jeu d’adresse.</p>
      <div class="row"><button class="btn btn-hot" onClick=${() => startPractice(g, r.kind, r.diff)}><${Icon} n="refresh" s=${16} /> Réessayer</button><button class="btn btn-ghost" onClick=${closeLayer}>Fermer</button></div></div>`;
  else if (!r.game) body = html`<div class="mg-play mg-wait"><${Typing} /><p class="muted">${AI_NAME} écrit ton mini-jeu…</p></div>`;
  else body = html`<${ShootPlay} r=${r} now=${now} outcomes="Entraînement : rien ne compte dans ta partie." icon="play" onScore=${(sc) => { r.score = Math.round(clamp(num(sc, 0), 0, 1) * 1000) / 1000; update(); }} />`;
  return html`<${LayerShell} i=${i} title="🎮 Entraînement">${body}<//>`;
}
function MenuGames({ g }) {
  const [kind, setKind] = useState(() => S.menuGame || 'quiz');
  const [diff, setDiff] = useState(() => S.menuDiff || 'mythique');
  const pickK = (k) => { S.menuGame = k; setKind(k); if (diffOf(diff).real && k !== 'quiz') { S.menuDiff = 'mythique'; setDiff('mythique'); } };
  const pickD = (d) => { S.menuDiff = d; setDiff(d); };
  const ai = MG_KINDS_AI.includes(kind), next = g.mgNext;
  return html`<section class="section">
    <div class="field"><span class="lbl">Le mini-jeu</span><div class="tr-chips">${MENU_GAMES.map(([k, l]) => html`<button type="button" key=${k} class=${'chip-btn' + (kind === k ? ' on' : '')} onClick=${() => pickK(k)}>${l}</button>`)}</div></div>
    <div class="field"><span class="lbl">La difficulté</span><div class="tr-chips">${DIFFS.map((d) => html`<button type="button" key=${d.id} disabled=${d.real && kind !== 'quiz'} class=${'chip-btn' + (diff === d.id ? ' on' : '')} onClick=${() => pickD(d.id)}>${d.emoji} ${d.label}</button>`)}</div>
      ${diffOf(diff).real ? html`<small class="muted">Cauchemar, c’est le quiz de vraies questions, rien d’autre.</small>` : null}</div>
    <div class="row">
      <button class="btn btn-hot btn-sm" disabled=${!!S.busy.mg} onClick=${() => startPractice(g, kind, diff)}><${Icon} n="play" s=${15} /> Jouer maintenant${ai ? ` · ≈ ${costLabel(g, 'shoot')} ☕` : ''}</button>
      <button class=${'btn btn-sm ' + (next === kind ? 'btn-hot' : 'btn-ghost')} onClick=${() => { if (g.mgNext === kind) { delete g.mgNext; toast('Le prochain tournage tire son mini-jeu au sort.'); } else { g.mgNext = kind; toast(`Ton prochain tournage : ${(MENU_GAMES.find((x) => x[0] === kind) || [0, kind])[1]}.`, 'good'); } update(); }}>${next === kind ? '✓ Imposé au prochain tournage' : 'Imposer au prochain tournage'}</button>
    </div>
    <small class="muted">« Jouer maintenant » : un entraînement, rien ne compte dans ta partie${ai ? ` (ce mini-jeu est écrit par ${AI_NAME} sur ton sujet du moment)` : ''}. ${next ? `Imposé au prochain tournage : ${(MENU_GAMES.find((x) => x[0] === next) || [0, next])[1]} (sauf en Cauchemar).` : 'Sinon, le prochain tournage tire son mini-jeu au sort.'}</small>
  </section>`;
}
const MENU_TABS = [['argent', '💰', 'Argent'], ['rep', '⭐', 'Réputation'], ['temps', '🕐', 'Temps'], ['jeux', '🎮', 'Mini-jeux'], ['skills', '💪', 'Compétences'], ['liens', '💞', 'Relations']];
function ModeMenuLayer({ g, i, now }) {
  const s = g.stats, c = g.career, P = ensureRep(s), d0 = gameDate(now);
  const [tab, setTab0] = useState(() => S.menuTab || 'argent');
  const setTab = (t) => { S.menuTab = t; setTab0(t); };
  const [v, setV] = useState(() => ({
    cash: String(Math.round(c.cash * 100) / 100), followers: String(s.followers), gems: String(s.gems), level: String(s.level),
    rep: Object.fromEntries(REP_IDS.map((k) => [k, String(rep1000(P[k]))])),
    skills: Object.fromEntries(SKILL_IDS.map((id) => [id, String(skillLevel(g, id))])),
    date: dateField(d0), time: timeField(d0),
  }));
  const [base, setBase] = useState(() => v); // 0.27.6: what the fields showed: only what the player changed is applied
  const set = (k, x) => setV((o) => Object.assign({}, o, { [k]: x }));
  const setIn = (grp, k, x) => setV((o) => Object.assign({}, o, { [grp]: Object.assign({}, o[grp], { [k]: x }) }));
  const changed = (keys, grp) => { const o = {}, a = grp ? v[grp] : v, b = grp ? base[grp] : base; for (const k of keys) if (String(a[k]).trim() !== String(b[k]).trim()) o[k] = a[k]; return o; };
  const apply = (o, msg) => {
    const empty = !Object.keys(o).length || (o.rep && !Object.keys(o.rep).length) || (o.skills && !Object.keys(o.skills).length);
    if (empty) { toast('Rien n’a changé.'); return; }
    menuApply(g, o); setBase(v); toast(msg, 'good'); saveNow(); update();
  };
  const num2 = (k, label, hint) => html`<label class="menu-num"><span>${label}</span><input class="input" inputmode="decimal" value=${v[k]} onInput=${(ev) => set(k, ev.target.value)} />${hint ? html`<small>${hint}</small>` : null}</label>`;
  const at = new Date(`${v.date}T${v.time || '00:00'}`).getTime();
  const people = mains(g).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const sym = WORLD_MONEY[g.world.preset] ? WORLD_MONEY[g.world.preset].sym : '€';
  const panel = {
    argent: () => html`<section class="section">
      <div class="menu-grid">${num2('cash', `Argent (${sym})`, `Maintenant : ${fmtMoney(g, c.cash)}`)}${num2('followers', 'Abonnés')}${num2('gems', 'Gemmes')}${num2('level', 'Niveau', 'Monter fait arriver les persos du niveau')}</div>
      <div class="row"><button class="btn btn-hot btn-sm" onClick=${() => apply(changed(['cash', 'followers', 'gems', 'level']), 'C’est fait.')}>Appliquer</button>
        <button class="btn btn-ghost btn-sm" onClick=${() => { if (g.stats.followers < 800) toast('Les marques écrivent à partir de 800 abonnés.', 'bad'); else { const d = makeOffer(g, {}); toast(d ? `${d.brand} t’écrit en privé.` : 'Pas de marque dispo pour l’instant (deux offres déjà ouvertes ?).', d ? 'good' : ''); update(); } }}>Faire venir une marque</button></div>
    </section>`,
    rep: () => html`<section class="section">
      <div class="section-h"><h3>Sur 1000</h3><span>${rep1000(s.reputation)}/1000 · ${repLabel(s.reputation)}</span></div>
      <div class="menu-grid">${REP_IDS.map((k) => html`<label class="menu-num" key=${k}><span>${REP_PILLARS[k].emoji} ${REP_PILLARS[k].label}</span><input class="input" inputmode="numeric" value=${v.rep[k]} onInput=${(ev) => setIn('rep', k, ev.target.value)} /></label>`)}</div>
      <div class="row">
        <button class="btn btn-hot btn-sm" onClick=${() => apply({ rep: changed(REP_IDS, 'rep') }, 'Réputation changée.')}>Appliquer</button>
        ${playerBadBuzz(g, now) ? html`<button class="btn btn-ghost btn-sm" onClick=${() => { g.pbb = null; toast('Bad buzz terminé.', 'good'); update(); }}>Arrêter le bad buzz</button>` : null}
      </div>
    </section>`,
    temps: () => html`<section class="section">
      <div class="section-h"><h3>L’horloge du jeu</h3><span>${cap1(d0.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))} · ${timeField(d0)}</span></div>
      <div class="menu-grid">
        <label class="menu-num"><span>Date</span><input class="input" type="date" value=${v.date} onInput=${(ev) => set('date', ev.target.value)} /></label>
        <label class="menu-num"><span>Heure</span><input class="input" type="time" value=${v.time} onInput=${(ev) => set('time', ev.target.value)} /></label>
      </div>
      <div class="row">
        <button class="btn btn-hot btn-sm" disabled=${!Number.isFinite(at)} onClick=${() => apply({ at }, `Il est ${v.time.replace(':', ' h ')} dans le jeu.`)}>Appliquer</button>
        <button class="btn btn-ghost btn-sm" onClick=${() => { const d = new Date(); set('date', dateField(d)); set('time', timeField(d)); }}>Heure de ton PC</button>
      </div>
      <small class="muted">Seule l’horloge bouge : rien ne se passe pendant le temps sauté. Passer à un nouveau mois déclenche une fois ce qui tombe en fin de mois (paie, factures) ; revenir en arrière ne déclenche rien. Pour faire passer le temps pour de vrai, utilise « Avancer ».</small>
    </section>`,
    jeux: () => html`<${MenuGames} g=${g} />`,
    skills: () => html`<section class="section">
      <div class="section-h"><h3>Sur ${SKILL_MAX}</h3></div>
      <div class="menu-grid">${SKILL_IDS.map((id) => html`<label class="menu-num" key=${id}><span>${SKILL_TREE[id].emoji} ${SKILL_TREE[id].label}</span><input class="input" inputmode="numeric" value=${v.skills[id]} onInput=${(ev) => setIn('skills', id, ev.target.value)} /></label>`)}</div>
      <button class="btn btn-hot btn-sm" onClick=${() => apply({ skills: changed(SKILL_IDS, 'skills') }, 'Compétences changées.')}>Appliquer</button>
    </section>`,
    liens: () => html`<section class="section">
      ${people.length ? html`<div class="section-h"><h3>De −100 à +100</h3></div><div class="menu-rels">${people.map((p) => html`<${MenuRel} key=${p.id} g=${g} c=${p} />`)}</div>` : html`<p class="muted">Personne dans ton monde pour l’instant.</p>`}
    </section>`,
  };
  return html`<${LayerShell} i=${i} title="🛠️ Mode menu">
    <nav class="menu-tabs" role="tablist" aria-label="Mode menu">${MENU_TABS.map(([k, e, l]) => html`<button type="button" key=${k} role="tab" aria-selected=${tab === k ? 'true' : 'false'} class=${'menu-tab' + (tab === k ? ' on' : '')} onClick=${() => setTab(k)}><span aria-hidden="true">${e}</span>${l}</button>`)}</nav>
    ${(panel[tab] || panel.argent)()}
    <section class="section" style="border-bottom:0">
      <p class="muted">Les réglages cachés de ta partie : ça s’applique tout de suite, et personne dans le jeu n’en saura rien.</p>
      <button class="linkbtn quiet" onClick=${() => { lsSet('hype:menu', '0'); closeLayer(); toast('Mode menu masqué : le code le rouvre.'); update(); }}>Masquer le mode menu</button>
    </section>
  <//>`;
}

/* ---------- the Studio tab: your channel, your money, the trends, your sponsors, your team, your programme ---------- */
function StudioTab({ g, now }) {
  const c = g.career, pf = platformOf(g), P = PLATFORMS[pf], d = gameDate(now);
  const prog = programOf(g);
  const mine = g.posts.filter((p) => p.a === 'p' && p.video && p.video.views).sort((a, b) => b.ts - a.ts);
  const plan = plannedReleases(g); // 0.27.4
  const offers = g.deals.filter((x) => x.state === 'offer'), signed = signedDeals(g);
  const past = g.deals.filter((x) => !DEAL_OPEN.includes(x.state)).slice(-4).reverse();
  const nextMonth = MONTHS[(d.getMonth() + 1) % 12];
  const tr = activeTrends(g, now);
  const susp = demonetized(g, now), strikes = liveStrikes(g, now).length; // 0.21
  return html`
    <div class=${'studio-head pf-' + pf}>
      <span class="pf-badge" aria-hidden="true">${P.emoji}</span>
      <div><b>${pfName(g, pf)}</b><span>${fmtN(g.stats.followers)} ${P.fans} · ${nicheOf(g).label}</span></div>
      <button class="btn btn-ghost btn-sm" onClick=${() => openLayer({ t: 'settings' })}><${Icon} n="gear" s=${15} /> Changer</button>
    </div>
    <section class="section">
      <div class="section-h"><h3>Argent</h3><span>${fmtMoney(g, c.earned)} gagnés depuis le début</span></div>
      <div class="money-row">
        <div><small>En banque</small><b class=${c.cash < 0 ? 'neg' : ''}>${fmtMoney(g, c.cash)}</b></div>
        <div><small>Revenus ${deMonth(MONTHS[d.getMonth()])} (estimés)</small><b>${fmtMoney(g, c.est + c.owed)}</b></div>
      </div>
      <p class="muted money-note">${c.est + c.owed > 0 ? (pf === 'youtube' && c.est + c.owed < 70 ? `Versés début ${nextMonth} dès 70 € cumulés (le seuil de paiement de YouTube).` : `Versés début ${nextMonth}.`) : prog && !monetized(g) ? 'Tes contenus ne rapportent pas encore : rejoins le programme de ta plateforme, ou signe avec des marques.' : !prog ? `Sur ${pfName(g, pf)}, pas de partage des revenus pubs : tu gagnes ta vie avec les marques${pf === 'spotify' ? ' et les écoutes de tes sons' : ''}.` : 'Publie : chaque sortie rapporte selon ses vues.'}</p>
      <div class="season-line"><span>${seasonEmoji(d)}</span><span>${cap1(SEASON_WORD(d))}. Pubs ×${fmtDec(adSeason(d))}, marques ×${fmtDec(sponsorSeason(d))}.</span></div>
      ${c.ledger.length ? html`<details class="ledger"><summary>Historique</summary><ul>${c.ledger.slice(-12).reverse().map((x, k) => html`<li key=${k}><span>${x.label}</span><b class=${x.amount < 0 ? 'neg' : x.kind === 'est' ? 'est' : 'pos'}>${x.amount > 0 ? '+' : x.amount < 0 ? '−' : ''}${fmtMoney(g, Math.abs(x.amount))}${x.kind === 'est' ? ' (estimé)' : ''}</b></li>`)}</ul></details>` : null}
    </section>
    <${GearSection} g=${g} now=${now} />
    <${InvSection} g=${g} now=${now} />
    ${prog ? html`<section class="section">
      <div class="section-h"><h3>${prog.name}</h3><span class=${'prog-state ' + (susp ? 'refused' : c.prog.state)}>${susp ? 'Pubs coupées' : { on: 'Monétisé·e ✓', review: 'Candidature en cours', refused: 'Refusé·e', none: prog.ok ? 'Tu peux postuler' : 'Pas encore' }[c.prog.state] || ''}</span></div>
      ${c.prog.state !== 'on' ? html`${prog.needs.map((n) => html`<div class="need" key=${n.label}><div class="kv"><span>${n.label}</span><b class="mono">${fmtN(Math.min(n.cur, n.goal))}${n.unit ? ' ' + n.unit : ''} / ${fmtN(n.goal)}</b></div><${Meter} frac=${n.cur / n.goal} tone=${n.cur >= n.goal ? 'good' : ''} /></div>`)}
        ${c.prog.state === 'review' ? html`<p class="muted">Réponse ${fmtWhen(c.prog.until, now)}.</p>`
          : c.prog.state === 'refused' && now < (c.prog.retry || 0) ? html`<p class="muted">Tu pourras retenter ${fmtWhen(c.prog.retry, now)}.</p>`
            : html`<button class="btn btn-hot btn-sm" disabled=${!prog.ok} onClick=${() => { if (applyProgram(g)) update(); }}>${prog.review ? 'Postuler' : 'Rejoindre'}</button>`}`
        : html`<p class="muted">${susp ? `Plus aucune pub sur tes contenus : ${STRIKE_MAX} avertissements en ${STRIKE_DAYS} jours. Retour des pubs ${fmtWhen(c.demonet.until, now)}.` : pf === 'youtube' ? `Ce que rapporte une vidéo dépend de son sujet et de ce qu’en pensent les annonceurs : de moins d’1 € à 11 € les 1 000 vues, ×${fmtDec(adSeason(d))} avec la saison. Les Shorts, quelques centimes.` : pf === 'tiktok' ? 'Tes vidéos de plus d’une minute rapportent environ 0,40 € pour 1 000 vues qualifiées, moins si les annonceurs boudent le sujet.' : 'Tes lives rapportent : abonnements, bits et pubs.'}${strikes && !susp ? ` Avertissements : ${strikes}/${STRIKE_MAX} sur ${STRIKE_DAYS} jours.` : ''}</p>`}
    </section>` : null}
    <${CommuSection} g=${g} now=${now} />
    <${BoutiqueSection} g=${g} now=${now} />
    <${JobsSection} g=${g} now=${now} />
    <section class="section">
      <div class="section-h"><h3>Tendances sur ${pfName(g, pf)}</h3><span>Surfe dessus pour faire des vues</span></div>
      ${tr.length ? html`<div class="trend-list">${tr.slice(0, 6).map((x) => { const h = trendHeat(x, now); return html`<div class="trend-row" key=${x.id}><span class="tr-emo" aria-hidden="true">${x.emoji}</span><div><b>${x.name}</b><small>${TREND_KINDS[x.kind].label} · ${heatWord(h)}</small></div><span class="heat" style=${'--p:' + Math.round(h * 100) + '%'} aria-label=${'Popularité ' + Math.round(h * 100) + ' %'}><i></i></span></div>`; })}</div>`
        : html`<p class="muted">Rien ne monte pour l’instant. Actualise ton fil : les tendances vont et viennent.</p>`}
      <ul class="tips">${P.tips.map((t, k) => html`<li key=${k}>${t}</li>`)}</ul>
    </section>
    <section class="section">
      <div class="section-h"><h3>Sponsors</h3><span>${g.stats.followers < 800 ? 'à partir de 800 abonnés' : offers.length + signed.length ? `${offers.length} ${plural(offers.length, 'offre', 'offres')} · ${signed.length} en cours` : 'les marques arrivent'}</span></div>
      ${[...signed, ...offers].map((x) => html`<${DealCard} key=${x.id} g=${g} d=${x} now=${now} />`)}
      ${!offers.length && !signed.length ? html`<p class="muted">${g.stats.followers < 800 ? 'Les marques te contacteront quand ton audience aura grandi.' : 'Pas d’offre en ce moment. Elles arrivent en message privé (plus souvent avec un agent).'}</p>` : null}
      ${past.length ? html`<details class="ledger"><summary>Anciens contrats</summary><ul>${past.map((x) => html`<li key=${x.id}><span>${x.emoji} ${x.brand}</span><b>${DEAL_STATES[x.state] || x.state}</b></li>`)}</ul></details>` : null}
    </section>
    <section class="section">
      <div class="section-h"><h3>Ton équipe</h3><span>${g.staff.length ? `${g.staff.length} ${plural(g.staff.length, 'personne', 'personnes')}` : 'personne pour l’instant'}</span></div>
      ${g.staff.map((m) => { const p = g.chars[m.c]; if (!p) return null; const R = STAFF_ROLES[m.role]; return html`<div class="staff-row" key=${m.id}>
        <${Avatar} who=${author(g, 'c:' + p.id)} size=${44} onClick=${() => openDM(p.id)} />
        <div class="mid"><b>${p.name}</b><span>${R.emoji} ${roleName(m.role, p.g)} · ${tierName(m.tier, p.g).toLowerCase()} · ${payWord(g, m)}${m.unpaid ? ' · pas payé·e !' : ''}</span><small>${R.fx(m.tier + 1)}</small></div>
        <div class="acts"><button class="btn btn-ghost btn-sm" onClick=${() => openDM(p.id)}><${Icon} n="msg" s=${14} /></button><button class="linkbtn quiet" onClick=${() => askConfirm({ title: `Te séparer de ${p.name.split(' ')[0]} ?`, text: 'Ça risque de mal passer.', ok: 'Se séparer', danger: true, run: () => { quitStaff(g, m, 'fired'); update(); } })}>Se séparer</button></div>
      </div>`; })}
      <button class="btn btn-hot btn-sm" onClick=${() => openLayer({ t: 'recruit' })}><${Icon} n="userplus" s=${15} /> Recruter</button>
    </section>
    <section class="section">
      <div class="section-h"><h3>Programme</h3><span>${plan.length ? `${plan.length} ${plural(plan.length, 'sortie prévue', 'sorties prévues')}${seriesOn(g) ? ' · défi en cours' : ''}` : seriesOn(g) ? 'défi en cours' : 'rien de prévu'}</span></div>
      ${g.series ? html`<${SeriesCard} g=${g} s=${g.series} now=${now} />` : null}
      ${plan.length ? html`<div class="plan-list">${plan.map((r, k) => html`<${PlanRow} key=${r.id} g=${g} r=${r} first=${k === 0} now=${now} />`)}</div>` : null}
      <div class="row">
        ${!seriesOn(g) ? html`<button class="btn btn-hot btn-sm" onClick=${() => openLayer({ t: 'series' })} disabled=${!planRoom(g)}><${Icon} n="calendar" s=${15} /> Défi Daily Upload</button>` : null}
        <button class=${'btn btn-sm ' + (seriesOn(g) ? 'btn-hot' : 'btn-ghost')} onClick=${() => openLayer({ t: 'series', id: 'single' })} disabled=${!planRoom(g)}><${Icon} n="clock" s=${15} /> ${plan.length ? 'Programmer une autre sortie' : 'Programmer une sortie'}</button>
      </div>${!planRoom(g) ? html`<small class="muted">${MAX_PLANNED} sorties prévues, c’est le maximum : publie-en une d’abord.</small>` : null}
    </section>
    ${mine.length ? html`<section class="section">
      <div class="section-h"><h3>Ta chaîne</h3><span>${fmtN(mine.reduce((n, p) => n + p.video.views, 0))} vues au total</span></div>
      <div class=${'chan-grid ' + (pf === 'tiktok' || pf === 'instagram' ? 'vert' : '')}>${mine.slice(0, 12).map((p) => html`<button key=${p.id} class="chan-cell" onClick=${() => openPost(p.id)}><${MiniThumb} v=${p.video} />${p.video.ads && p.video.ads.paid ? html`<i class=${'ads-dot ' + p.video.ads.s} title=${ADS_STATES[p.video.ads.s].label} aria-label=${ADS_STATES[p.video.ads.s].label}></i>` : null}<span><b>${fmtN(p.video.views)}</b> ${p.video.what === 'podcast' || p.video.what === 'clip' ? 'écoutes' : 'vues'}</span></button>`)}</div>
    </section>` : null}
    <section class="section" style="border-bottom:0">
      <details class="howto"><summary>Comment ça marche, en vrai ?</summary>
        <ul>
          <li><b>YouTube</b> : le Programme Partenaire s’ouvre à 1 000 abonnés et 4 000 heures de visionnage public sur 12 mois (ou 10 millions de vues Shorts sur 90 jours). Tu touches 55 % des pubs de tes vidéos, 45 % sur les Shorts. Le paiement arrive le mois suivant, dès 70 €.</li>
          <li><b>Selon le sujet</b>, 1 000 vues rapportent de moins d’un euro (gaming, divertissement) à plusieurs euros (finance, tech). Les Shorts rapportent quelques centimes.</li>
          <li><b>Adaptée aux annonceurs</b> : une vidéo violente, vulgaire ou choquante n’a que des pubs limitées, ou plus du tout (démonétisée). Tu déclares toi-même ce qu’elle contient avant de la publier ; un contenu caché qui se voit vaut un avertissement. Tu peux demander un réexamen.</li>
          <li><b>La saison</b> : les annonceurs paient le plus en fin d’année (Black Friday, Noël), souvent 50 % de plus qu’au premier trimestre. En janvier, ça s’effondre.</li>
          <li><b>TikTok</b> : le programme de récompenses s’ouvre à 10 000 abonnés et 100 000 vues sur 30 jours, pour des vidéos de plus d’une minute (environ 0,40 à 1 € les 1 000 vues).</li>
          <li><b>Instagram</b> ne reverse pas ses pubs : ce sont les marques qui paient (en gros 10 € pour 1 000 abonnés par post sponsorisé).</li>
          <li><b>Twitch</b> : Affilié à 50 followers, 500 minutes de live sur 7 jours différents et 3 spectateurs en moyenne.</li>
          <li><b>Les marques</b> paient selon les vues attendues (souvent 10 à 40 € les 1 000 vues). La loi française impose la mention « Publicité » ou « Collaboration commerciale », visible tout le contenu, et interdit certaines promos (chirurgie esthétique, puffs, pronostics de paris…). Jusqu’à 2 ans de prison et 300 000 € d’amende dans les pires cas.</li>
          <li><b>Freelances</b> : un monteur débutant facture autour de 35 à 70 € la journée, un confirmé autour de 100 €, un senior 140 € et plus. Les stars du métier coûtent bien plus.</li>
        </ul>
        <small class="muted">Des ordres de grandeur réels (2026), simplifiés pour le jeu.</small>
      </details>
    </section>`;
}
// 0.27.6: an exclusive contract elsewhere no longer forbids signing: the player is told what it will cost, then decides.
function trySign(g, d) {
  const go = (o) => { if (signDeal(g, d, o)) { if (d.state !== 'scammed') toast(`Contrat signé avec ${d.brand}.`, 'good'); update(); } };
  const x = dealClash(g, d);
  if (!x) return go();
  askConfirm({ title: `Signer malgré l’exclusivité ${x.brand} ?`, text: `Ton contrat avec ${x.brand} t’interdit ce secteur pendant 30 jours. ${x.state === 'signed' ? `${x.brand} rompra le contrat : tu rembourses l’acompte et ce qu’ils t’ont envoyé, plus une pénalité.` : `${x.brand} te facturera une pénalité.`} Et ta réputation pro en prendra un coup.`, ok: 'Signer quand même', danger: true, run: () => go({ force: true }) });
}
// What the pay line adds: the first price, what comes with the money (0.27.6: gear or products on top of a fee).
function dealPayNote(g, d) {
  const was = d.fee && d.fee0 && d.fee !== d.fee0 ? `au départ ${fmtMoney(g, d.fee0)}` : '';
  const more = d.gift ? `${d.fee ? `+ ${GEAR[d.gift.kind].emoji} ${giftName(g, d.gift)} · ` : 'matos offert · '}${TIER_LABELS[d.gift.t].toLowerCase()} · valeur ${fmtMoney(g, d.gift.value)}`
    : dealGoods(d) ? (d.fee ? `+ ≈ ${fmtMoney(g, d.value)} en produits` : `≈ ${fmtMoney(g, d.value)} en produits · pas d’argent`) : '';
  const t = [was && `(${was})`, more].filter(Boolean).join(' ');
  return t ? html`<em>${t}</em>` : null;
}
const DEAL_STATES = { offer: 'Proposition', signed: 'Signé', done: 'Livré ✓', broken: 'Rompu', expired: 'Expiré', declined: 'Refusé', withdrawn: 'Offre retirée', waiting: 'Signé', scammed: 'Arnaque' };
// A brand's proposal (in DMs and in the Studio): what it pays, what it asks, what the law says.
function DealCard({ g, d, now, inDM }) {
  if (!d) return null;
  const c = g.chars[d.contact];
  const left = d.state === 'offer' ? d.until - now : d.state === 'signed' ? d.due - now : 0;
  const nego = () => { const ask = niceRound(d.fee * 1.25 || 100); S.drafts.dm[d.contact] = d.fee ? `Merci pour la proposition ! Vu mes ≈ ${fmtN(Math.round(expectedViews(g, d.what)))} vues par ${dealWhat(g, d)}, je serais plutôt sur ${fmtMoney(g, ask)}. On peut en parler ?` : d.gift ? 'Merci, le matos m’intéresse ! Vous pourriez ajouter un petit budget pour le temps de tournage ?' : 'Merci ! Plutôt qu’en produits, vous auriez un budget pour ce partenariat ?'; if (!inDM) openDM(d.contact); else update(false); };
  return html`<div class=${'deal-card st-' + d.state}>
    <div class="dl-head"><span class="dl-emo" aria-hidden="true">${d.emoji}</span><div><b>${d.brand}</b><span>${cap1(d.product)}</span></div><span class="dl-state">${DEAL_STATES[d.state] || ''}</span></div>
    <div class="dl-terms">
      <span><small>Rémunération</small><b>${d.fee ? fmtMoney(g, d.fee) : d.gift ? `${GEAR[d.gift.kind].emoji} ${giftName(g, d.gift)}` : 'Produits offerts'}</b>${dealPayNote(g, d)}</span>
      <span><small>À livrer</small><b>${d.what === 'live' ? 'Un live' : cap1(`${d.what === 'vidéo' ? 'une' : 'un'} ${dealWhat(g, d)}`)}</b><em>${d.state === 'signed' ? `avant ${fmtGameAt(d.due)}` : `sous ${d.days} jours`}</em></span>
      ${d.upfront ? html`<span><small>Acompte</small><b>${fmtMoney(g, d.upfront)}</b><em>${d.state === 'broken' ? 'remboursé' : d.signedAt && d.scam === 'brief' ? 'jamais versé' : d.signedAt ? 'versé' : 'à la signature'}</em></span>` : null}
    </div>
    <ul class="dl-clauses">
      <li>Paiement : ${payTerms(g, d)}.</li>
      <li>${d.shady ? 'Sans la mention « Collaboration commerciale », à la demande de la marque.' : 'Avec la mention « Collaboration commerciale ».'}</li>
      ${d.exclusive ? html`<li>Exclusivité : aucune autre marque du même secteur pendant 30 jours.</li>` : null}
      ${d.clause ? html`<li>${d.clause.text}</li>` : null}
      <li>Clause de moralité : en cas de scandale, la marque peut rompre le contrat.</li>
      ${d.brief ? html`<li>Le contrat et le brief se téléchargent ici : <span class="dl-file">${d.brief}</span></li>` : null}
      ${hasStaff(g, 'agent') && d.fee ? html`<li>Ton agent prend ${hasStaff(g, 'agent').rate} % de commission.</li>` : null}
    </ul>
    <${DealExtra} g=${g} d=${d} />
    ${d.state === 'offer' ? html`<div class="row">
      <button class="btn btn-hot btn-sm" onClick=${() => trySign(g, d)}>${d.costs ? `Signer et payer ${fmtMoney(g, d.costs)}` : d.brief ? 'Télécharger et signer' : 'Signer'}</button>
      <button class="btn btn-ghost btn-sm" onClick=${nego}>Négocier</button>
      <button class="linkbtn quiet" onClick=${() => { declineDeal(g, d); update(); }}>Refuser</button>
      <small class="muted">${left > 0 ? `Offre valable ${fmtDur(left)}` : ''}</small>
    </div>` : d.state === 'signed' ? html`<p class="muted dl-note">À livrer ${fmtWhen(d.due, now)} : choisis ce sponsor au moment de publier ${d.what === 'vidéo' ? 'ta prochaine vidéo' : `ton prochain ${dealWhat(g, d)}`}.${d.gift && !d.giftSent ? ' Ton matos doit arriver dans les prochains jours.' : ''}</p>`
      : d.state === 'waiting' ? html`<p class="muted dl-note">${d.gift ? 'Ton matos' : 'Ton kit'} doit arriver dans les prochains jours.</p>` : null}
    ${!inDM && c ? html`<button class="linkbtn dl-contact" onClick=${() => openDM(c.id)}>Écrire à ${c.name.split(' ')[0]}</button>` : null}
  </div>`;
}
// 0.27.4: one planned release in the programme: when, and what can be done with it (sooner, later, give up, shoot it).
function PlanRow({ g, r, first, now }) {
  const W = WHATS[r.what] || WHATS.vidéo, left = r.due - now, cc = r.collab && g.chars[r.collab];
  return html`<div class=${'plan-row' + (left <= 0 ? ' due' : '')}>
    <span class="pl-emo" aria-hidden="true">${W.emoji}</span>
    <div class="mid"><b>${cap1(nounOf(r))} « ${r.topic} »</b>
      <span>${left > 0 ? cap1(fmtWhen(r.due, now)) : 'C’est l’heure'}${r.series ? ` · défi, épisode ${r.ep}` : ''}${cc ? ` · avec ${cc.name.split(' ')[0]}` : ''}${r.delays ? ` · ${whatF(r) ? 'repoussée' : 'repoussé'} ${r.delays} fois` : ''}</span></div>
    <div class="acts">
      ${left > 0 ? (r.series ? null : html`<button class="btn btn-ghost btn-sm" onClick=${() => openLayer({ t: 'move', id: r.id })}><${Icon} n="ffwd" s=${14} /> Plus tôt</button>`)
        : first ? html`<button class="btn btn-hot btn-sm" onClick=${() => startShoot(r)}><${Icon} n="clapper" s=${14} /> ${r.played ? 'Voir le tournage' : 'Tourner'}</button>` : html`<small class="muted">après la précédente</small>`}
      ${r.series ? null : r.delays < MAX_DELAYS ? html`<button class="linkbtn quiet" onClick=${() => askPostpone(g, r)}>Repousser</button>` : html`<button class="linkbtn quiet" onClick=${() => askDrop(g, r)}>Abandonner</button>`}
    </div>
  </div>`;
}
// 0.27.4: a release brought forward: the times before the planned one, no cost.
function MoveLayer({ l, g, i, now }) {
  const r = (g.releases || []).find((x) => x.id === l.id);
  if (!r || r.state !== 'scheduled' || r.due <= now) return html`<${LayerShell} i=${i} title="Sortir plus tôt"><div class="empty"><b>${r && r.state === 'scheduled' ? 'C’est déjà l’heure' : 'Cette sortie n’est plus prévue'}</b></div><//>`;
  const opts = advanceChoices(g, r, now);
  const go = (o) => { if (advanceRelease(g, r, o.at)) { toast(o.at <= Date.now() + 60000 ? `${cap1(ta(r))} sort maintenant : à toi de tourner !` : `${cap1(ta(r))} sort ${fmtWhen(r.due)}.`, 'good'); closeLayer(); update(); } };
  return html`<${LayerShell} i=${i} title="Sortir plus tôt">
    <div class="mg-setup">
      <p class="lede-sm">${cap1(ta(r))} « ${r.topic} » est ${whatF(r) ? 'prévue' : 'prévu'} ${fmtWhen(r.due, now)}. Choisis une heure plus tôt : aucun malus, ton public l’aura juste plus vite.</p>
      <div class="move-opts">${opts.map((o) => html`<button key=${o.label} type="button" class="chip-btn" onClick=${() => go(o)}>${o.label}${o.peak ? ' 🔥' : ''}</button>`)}</div>
      <small class="muted">🔥 = heure de pointe : plus de monde en ligne, plus de vues.</small>
    </div>
  <//>`;
}
function SeriesCard({ g, s, now }) {
  const rl = plannedReleases(g).find((x) => x.series === s.id); // 0.27.4: not always the next one
  const dots = Array.from({ length: s.days }, (_, k) => s.results[k] || (k === s.ep && s.state === 'on' ? 'next' : 'todo'));
  return html`<div class=${'series-card st-' + s.state}>
    <div class="se-head"><span aria-hidden="true">${s.state === 'won' ? '🏆' : s.state === 'badbuzz' ? '💥' : s.state === 'bide' ? '😬' : '📅'}</span><div><b>Daily Upload · ${s.days} jours${s.hard ? ' · hardcore' : ''}</b><span>« ${s.theme} » · ${diffOf(s.diff).emoji} ${diffOf(s.diff).label}</span></div></div>
    <div class="se-dots" aria-label=${`${s.ep} épisodes sur ${s.days}`}>${dots.map((x, k) => html`<span key=${k} class=${'se-dot ' + x} title=${`Épisode ${k + 1}`}>${x === 'top' || x === 'mid' ? '✓' : x === 'flop' ? '✗' : x === 'missed' ? '–' : k + 1}</span>`)}</div>
    ${s.state === 'on' ? html`<p class="se-line">Série en cours : <b>${s.streak}</b> · multiplicateur <b>×${fmtDec(seriesMult(g))}</b>${rl && rl.series === s.id ? ` · prochain épisode ${fmtWhen(rl.due, now)}` : ''}</p>
      <button class="linkbtn quiet" onClick=${() => askConfirm({ title: 'Abandonner le défi ?', text: 'Tout le monde le verra : c’est le bad buzz assuré.', ok: 'Abandonner', danger: true, run: () => { endSeries(g, s, true); update(); } })}>Abandonner le défi</button>`
      : html`<p class="se-line">${s.state === 'won' ? `Réussi ! +${s.reward.gems} gemmes, ${nAbonnes(s.reward.fol, true)}.` : s.state === 'badbuzz' ? `Raté : bad buzz (−${nAbonnes(s.reward.loss)}).` : `Pas tenu : un petit bide (−${nAbonnes(s.reward.loss)}).`}</p>`}
  </div>`;
}
// A small thumbnail of a release (the channel grid, the upload preview).
function MiniThumb({ v }) {
  const W = WHATS[v.what] || WHATS.vidéo, T = THUMBS[v.thumb];
  if (v.thumbLook || v.thumbImg) return html`<span class=${'mini-thumb custom w-' + v.what}><${ThumbArt} look=${v.thumbLook} img=${v.thumbImg} small=${true} /></span>`; // 0.14: made in the studio
  return html`<span class=${'mini-thumb th-' + (v.thumb || 'propre') + ' w-' + v.what} style=${'--h:' + (hashStr(v.topic || '') % 360)}><span aria-hidden="true">${v.thumb === 'choc' ? '😱' : v.thumb === 'mystere' ? '❓' : W.emoji}</span>${T && v.thumb === 'choc' ? html`<i>${str(v.title || v.topic, 22).toUpperCase()}</i>` : null}</span>`;
}

/* ---------- recruiting ---------- */
function RecruitLayer({ g, now, i }) {
  const [role, setRole] = useState(() => (g.cands && g.cands.role) || 'monteur');
  const R = STAFF_ROLES[role];
  const list = candidates(g, role);
  const cur = hasStaff(g, role);
  const busy = S.busy.cand === role;
  return html`<${LayerShell} i=${i} title="Recruter">
    <div class="role-grid">${Object.keys(STAFF_ROLES).map((k) => html`<button key=${k} type="button" class=${'role-opt' + (role === k ? ' on' : '') + (hasStaff(g, k) ? ' taken' : '')} onClick=${() => setRole(k)} aria-pressed=${role === k ? 'true' : 'false'}><span aria-hidden="true">${STAFF_ROLES[k].emoji}</span>${STAFF_ROLES[k].x}</button>`)}</div>
    <section class="section">
      <div class="section-h"><h3>${R.emoji} ${R.x}</h3><span>${R.pay === 'cut' ? 'à la commission' : R.pay === 'week' ? 'salaire par semaine' : R.pay === 'case' ? 'payé par dossier' : 'payé par sortie'}</span></div>
      <p class="muted">${R.desc}</p>
      <div class="tier-prices">${STAFF_TIERS.map((T, k) => html`<span key=${k}><small>${T.x}</small><b>${R.pay === 'cut' ? R.rates[k] + ' %' : '≈ ' + fmtMoney(g, R.rates[k])}</b><em>${R.fx(k + 1)}</em></span>`)}</div>
      <small class="muted">Plus la personne est expérimentée, plus elle coûte… et plus elle t’apporte.</small>
      ${cur ? html`<p class="notice"><${Icon} n="users" /><span>${g.chars[cur.c].name} occupe déjà ce poste. Sépare-toi de ${gx(g.chars[cur.c].g, 'lui', 'elle', 'iel')} dans le Studio pour en engager un autre.</span></p>`
        : html`<button class="btn btn-hot btn-sm" onClick=${() => genCandidates(role)} disabled=${!!S.busy.cand}>${busy ? html`<${Typing} /> Les candidatures arrivent…` : html`<${Icon} n="search" s=${15} /> ${list.length ? 'D’autres candidats' : 'Voir des candidats'} · ≈ ${costLabel(g, 'cand')} ☕`}</button>`}
    </section>
    ${list.map((c) => html`<div class="cand-card" key=${c.id}>
      <${Avatar} who=${author(g, 'c:' + c.id)} size=${52} onClick=${() => openDM(c.id)} />
      <div class="mid">
        <b>${c.name}</b><span>${tierName(c.cand.tier, c.g)} · ${c.cand.years} ans d’expérience</span>
        <p>${c.cand.pitch}</p>
        <div class="row"><span class="chip">${payWord(g, c.cand)}</span><span class="chip good">${R.fx(c.cand.tier + 1)}</span></div>
        <div class="row">
          <button class="btn btn-hot btn-sm" disabled=${!!cur} onClick=${() => { if (hireStaff(g, c)) { toast(`${c.name.split(' ')[0]} rejoint ton équipe !`, 'good'); update(); closeLayer(); } }}>Engager</button>
          <button class="btn btn-ghost btn-sm" onClick=${() => openDM(c.id)}><${Icon} n="msg" s=${14} /> Discuter</button>
        </div>
      </div>
    </div>`)}
  <//>`;
}

/* ---------- the daily upload sheet (and a single programmed release) ---------- */
function SeriesLayer({ l, g, i }) {
  const single = l.id === 'single';
  const P = PF(g);
  const [what, setWhat] = useState(() => makeableWhat(g, P.main)); // 0.20: what the gear allows
  const [days, setDays] = useState(7);
  const [hour, setHour] = useState(18);
  const [day, setDay] = useState(0); // single release: 0 today (or tomorrow if past), 1 tomorrow…
  const fq0 = single && l.fanQ && g.chars[l.fanQ] && g.chars[l.fanQ].fan ? g.chars[l.fanQ] : null; // 0.21: a fan's question as the topic
  const [fanQ, setFanQ] = useState(fq0 ? fq0.id : '');
  const [theme, setTheme] = useState(fq0 ? qaTopic(fq0) : '');
  const [diff, setDiff] = useState('moyen');
  const [hard, setHard] = useState(false);
  const ok = theme.trim().length >= 3;
  const noun = (w) => (w === 'short' ? P.shortName : w);
  const step = hard ? 0.35 : 0.2, cap = hard ? 4 : 3;
  // 0.20: the quote first (what this content takes), paid to program
  const o = { what, topic: theme.trim(), days: single ? 0 : days };
  const needDevis = !easyGear(), dv = needDevis ? devisFor(o) : null, dvBusy = S.busy.devis === devisKey(o);
  const total = dv ? devisTotal(dv) : 0;
  const launch = () => {
    if (!ok || !canMake(g, what).ok || !planRoom(g) || (!single && seriesOn(g))) return;
    if (needDevis && !dv) { genDevis(o); return; }
    if (total > 0 && total > g.career.cash) return; // (nothing to pay: even in the red, a content made with what you have)
    const st = dv && devisStale(g, dv); // 0.27.6: what it counted on was sold, or put on sale, since
    if (st) { staleSay(st, dv); update(false); return; }
    const paid = dv ? { total, items: dv.items, have: dv.have || [], topic: dv.topic, at: Date.now() } : null;
    if (single) {
      const due = nextAt(hour, 0) + day * DAY_MS;
      const r = scheduleRelease(g, { what, topic: theme.trim(), due, devis: paid, deal: (dv && dv.attach) || '', fanQ: fanQ && g.chars[fanQ] ? fanQ : '' });
      if (r) { if (dv) { payDevis(g, dv, theme.trim()); dropDevis(dv); } toast(`${cap1(noun(what))} programmé${what === 'vidéo' ? 'e' : ''} ${fmtWhen(due)}.`, 'good'); closeLayer(); update(); }
      return;
    }
    if (startSeries(g, { what, days, hour, min: 0, theme: theme.trim(), diff, hard, devis: paid })) { if (dv) { payDevis(g, dv, `défi « ${theme.trim()} »`); dropDevis(dv); } closeLayer(); goTab('feed'); update(); }
  };
  return html`<${LayerShell} i=${i} title=${single ? 'Programmer une sortie' : 'Défi Daily Upload'}>
    <div class="mg-setup">
      ${single ? null : html`<p class="lede-sm">${days} jours de suite, ${what === 'live' ? 'un live' : `${what === 'vidéo' ? 'une' : 'un'} ${noun(what)}`} par jour à heure fixe. Chaque épisode réussi fait grimper ton multiplicateur (×${fmtDec(1 + step)}, ×${fmtDec(1 + 2 * step)}… jusqu’à ×${cap}) : vues, abonnés et argent. Pas de report possible.</p>`}
      <div class="field"><span class="lbl">Format</span><${Seg} items=${P.fmts.map((f) => [f, cap1(noun(f)), !canMake(g, f).ok])} value=${what} onPick=${setWhat} label="Format" />
        ${P.fmts.filter((f) => !canMake(g, f).ok).map((f) => html`<small class="muted gear-why" key=${f}>${canMake(g, f).why}</small>`)}</div>
      ${single ? html`<div class="field"><span class="lbl">Quel jour ?</span><${Seg} items=${[[0, 'Prochaine fois'], [1, '+1 jour'], [2, '+2 jours'], [6, '+1 semaine']]} value=${day} onPick=${setDay} label="Jour" /></div>`
        : html`<div class="field"><span class="lbl">Durée du défi</span><${Seg} items=${SERIES_DAYS.map((n) => [n, n + ' jours'])} value=${days} onPick=${setDays} label="Durée" /></div>`}
      <div class="field"><span class="lbl">Heure de sortie</span>
        <div class="hour-pick">${[8, 12, 17, 18, 19, 20, 21, 22].map((h) => { const hd = gameDate(Date.now()); hd.setHours(h, 0, 0, 0); const a = audienceAt(hd); return html`<button key=${h} type="button" class=${'chip-btn' + (hour === h ? ' on' : '')} onClick=${() => setHour(h)}>${h} h${a >= 1.2 ? ' 🔥' : ''}</button>`; })}</div>
        <small>🔥 = heure de pointe : plus de monde en ligne, plus de vues.</small></div>
      ${single && fanQuestions(g).filter((c) => !fanPlanned(g, c)).length ? html`<div class="field"><span class="lbl">Une question d’abonné ?</span><div class="tr-chips">${fanQuestions(g).filter((c) => !fanPlanned(g, c)).slice(0, 4).map((c) => html`<button type="button" key=${c.id} class=${'chip-btn' + (fanQ === c.id ? ' on' : '')} onClick=${() => { if (fanQ === c.id) { setFanQ(''); setTheme(''); } else { setFanQ(c.id); setTheme(qaTopic(c)); } }}>💌 ${c.name.split(' ')[0]}</button>`)}</div>${fanQ && g.chars[fanQ] ? html`<small>« ${str(g.chars[fanQ].fan.text, 110)} »</small>` : html`<small>Une vidéo sur sa question : ta commu se réchauffe, et cet abonné devient un habitué.</small>`}</div>` : null}
      <div class="field"><label class="lbl" for="se-theme">${single ? 'Le sujet' : 'Le thème du défi'}</label>
        <input id="se-theme" class="input" maxlength="80" value=${theme} onInput=${(ev) => setTheme(ev.target.value)} placeholder=${single ? 'ex : je teste les potions du marché noir' : 'ex : une recette ratée par jour'} /></div>
      ${single ? null : html`<div class="field"><span class="lbl" id="se-diff">Difficulté des tournages</span>
        <div class="diff-list compact" role="radiogroup" aria-labelledby="se-diff">${DIFFS.map((d) => html`<button type="button" key=${d.id} role="radio" aria-checked=${diff === d.id ? 'true' : 'false'} class=${'diff-opt' + (diff === d.id ? ' on' : '') + (d.real ? ' nightmare' : '')} onClick=${() => setDiff(d.id)}><span class="d-emo" aria-hidden="true">${d.emoji}</span><span class="d-mid"><b>${d.label}</b></span><span class="d-mult">gains ${fmtMult(d.mult)}</span></button>`)}</div></div>
      <label class=${'hard-toggle' + (hard ? ' on' : '')}><input type="checkbox" checked=${hard} onChange=${(ev) => setHard(ev.target.checked)} /><span><b>Mode hardcore 💀</b><small>Le multiplicateur grimpe presque deux fois plus vite (jusqu’à ×4) et les récompenses doublent. Mais un seul épisode raté ou manqué, et c’est le bad buzz.</small></span></label>
      <div class="se-stakes"><span>🏆 <b>Réussi</b> : +${2 * days * (hard ? 2 : 1)} gemmes, une vague d’abonnés, et une marque te repère.</span><span>😬 <b>Pas tenu</b> : un petit bide.</span><span>💥 <b>Raté en beauté</b> (la moitié des épisodes ratés ou manqués${hard ? ', ou un seul en hardcore' : ''}) : bad buzz.</span></div>`}
      ${dv ? html`<${DevisCard} g=${g} dv=${dv} attach=${single ? dv.attach || '' : null} onAttach=${single ? (id) => { dv.attach = id; update(false); } : null} />` : null}
      <button class="btn btn-hot" onClick=${launch} disabled=${!ok || !planRoom(g) || (!single && seriesOn(g)) || !canMake(g, what).ok || dvBusy || (total > 0 && total > g.career.cash)}>${needDevis && !dv
        ? (dvBusy ? html`<${Typing} /> Le devis arrive…` : html`<${Icon} n="receipt" s=${16} /> Demander le devis · ≈ ${costLabel(g, 'devis')} ☕`)
        : html`<${Icon} n="calendar" s=${16} /> ${total ? `Payer ${fmtMoney(g, total)} et ${single ? 'programmer' : 'lancer le défi'}` : single ? 'Programmer' : `Lancer le défi · ${days} jours`}`}</button>
      ${needDevis && !dv ? html`<small class="muted">Le devis dit ce qu’il faut acheter, louer ou payer pour ce contenu (jamais ce que tu as déjà). Il se paie pour programmer.</small>` : null}
    </div>
  <//>`;
}

/* ---------- a false rumor running about the player ---------- */
function RumorBanner({ g, now }) {
  const r = liveRumor(g);
  if (!r) return null;
  const c = g.chars[r.by];
  const law = hasStaff(g, 'avocat');
  return html`<div class="rumor-banner">
    <span class="nic" aria-hidden="true">🗣️</span>
    <div class="rb-mid">
      <b>Fausse rumeur lancée par ${c ? c.name : 'quelqu’un'}</b>
      <p>« ${r.text} »</p>
      <small>Elle s’installe ${fmtWhen(r.until, now)} · gravité ${'●'.repeat(r.sev)}${'○'.repeat(3 - r.sev)}${r.defended.length ? ` · ${r.defended.length} ${plural(r.defended.length, 'allié te défend', 'alliés te défendent')}` : ''}</small>
      <div class="row">
        <button class="btn btn-hot btn-sm" onClick=${() => openCompose({ debunk: r.id })}><${Icon} n="megaphone" s=${15} /> Démentir</button>
        ${law ? html`<button class="btn btn-ghost btn-sm" onClick=${() => { lawyerNotice(g, r); update(); }}>⚖️ Mise en demeure · ${fmtMoney(g, law.rate)}</button>` : null}
        ${r.post ? html`<button class="linkbtn" onClick=${() => openPost(r.post)}>Voir le post</button>` : null}
      </div>
    </div>
  </div>`;
}

/* ---------- the upload screen of each platform (inspired by them, with Hype's own look) ---------- */
// 0.27.7: an upload form half filled stays as it was, its window closed or put aside (the thumbnail is the release's own).
const PUB_KEEP = ['title', 'caption', 'hook', 'trend', 'trend2', 'collab', 'deal', 'mention', 'decl', 'membAvant', 'membLive'];
function pubDraft(r, deals) {
  const d = S.pubDrafts && S.pubDrafts[r.id];
  if (!d) return {};
  const o = Object.fromEntries(PUB_KEEP.filter((k) => k in d).map((k) => [k, d[k]]));
  if (o.deal && !deals.some((x) => x.id === o.deal)) { delete o.deal; delete o.mention; } // (that contract is over since)
  return o;
}
function keepPubDraft(r, f) { if (!S.pubDrafts) S.pubDrafts = {}; S.pubDrafts[r.id] = Object.fromEntries(PUB_KEEP.map((k) => [k, f[k]])); }
const kindOfFmt = (w) => (w === 'vidéo' ? 'wide' : w === 'short' ? 'vert' : w === 'live' ? 'live' : 'audio');
function PublishForm({ g, r, now }) {
  const pf = platformOf(g), P = PLATFORMS[pf], W = WHATS[r.what] || WHATS.vidéo, kind = kindOfFmt(r.what);
  const trends = activeTrends(g, now);
  const sounds = trends.filter((x) => x.kind === 'son'), tags = trends.filter((x) => x.kind === 'tag'), topics = trends.filter((x) => x.kind === 'sujet' || x.kind === 'format');
  const deals = signedDeals(g).filter((d) => d.what === r.what);
  const collabs0 = pf === 'instagram' || pf === 'tiktok' ? mains(g).filter((c) => c.rel >= 20) : [];
  const partner = r.collab && g.chars[r.collab] ? g.chars[r.collab] : null; // 0.14: a video planned with them
  const collabs = partner && !collabs0.includes(partner) ? [partner].concat(collabs0) : collabs0;
  const T0 = r.thumb || null; // 0.14: the thumbnail made in the studio
  const taken = (d) => plannedReleases(g).some((x) => x.id !== r.id && x.deal === d.id); // 0.27.6: carried by another planned release
  const d0 = r.deal ? deals.find((d) => d.id === r.deal) || null : deals.find((d) => !taken(d)) || null; // 0.20: the sponsor chosen with the quote (0.27.6: delivered since by another release, none rather than another brand)
  const [f, setF] = useState(() => Object.assign({ title: str(r.topic, 100), caption: `${W.emoji} ${cap1(laW(r))} est en ligne : ${r.topic}`, thumb: T0 ? T0.preset || T0.kind : 'propre', thumbCtr: T0 ? T0.ctr : undefined, thumbLook: T0 && T0.look ? T0.look : null, thumbImg: T0 && T0.img ? T0.img : '', thumbChoc: !!(T0 && T0.choc), hook: '', trend: '', trend2: '', collab: partner ? partner.id : '', deal: d0 ? d0.id : '', mention: !(d0 && d0.shady), decl: [], membAvant: false, membLive: false }, pubDraft(r, deals))); // (0.27.7: what was typed before the window was closed comes back)
  const set = (k, v, more) => { const n = Object.assign({}, f, { [k]: v }, more || {}); keepPubDraft(r, n); setF(n); };
  const [lo, hi] = estimateViews(g, r, f);
  const aud = audienceAt(gameDate(now));
  const dl = f.deal ? dealOf(g, f.deal) : null;
  const mb = membOf(g), mbOK = !!(mb && mb.on && membCan(g).ok); // 0.22: what the members were promised
  const sound = (sounds.find((x) => x.id === f.trend2) || sounds.find((x) => x.id === f.trend) || {}).name;
  const unit = kind === 'audio' ? 'écoutes' : kind === 'live' ? 'spectateurs' : 'vues';
  const trendChips = (list, k, none) => html`<div class="tr-chips">${none ? html`<button type="button" class=${'chip-btn' + (!f[k] ? ' on' : '')} onClick=${() => set(k, '')}>${none}</button>` : null}${list.map((x) => { const h = trendHeat(x, now); return html`<button type="button" key=${x.id} class=${'chip-btn' + (f[k] === x.id ? ' on' : '')} onClick=${() => set(k, f[k] === x.id ? '' : x.id)}>${x.emoji} ${x.name} <small>${h >= 0.85 ? '🔥' : h >= 0.55 ? '↗' : '↘'}</small></button>`; })}</div>`;
  return html`<div class=${'upload up-' + kind + ' pf-' + pf}>
    <div class="up-head"><span aria-hidden="true">${P.emoji}</span><b>${kind === 'live' ? 'Lancer le live' : kind === 'wide' ? 'Mettre en ligne' : 'Publier'} sur ${pfName(g, pf)}</b></div>
    <div class="up-preview" aria-hidden="true">
      ${kind === 'wide' ? html`<div class="wide-prev">${f.thumbLook || f.thumbImg ? html`<div class="wp-thumb custom"><${ThumbArt} look=${f.thumbLook} img=${f.thumbImg} /><span class="vc-dur">${8 + (hashStr(r.topic) % 14)}:${String(hashStr(r.id) % 60).padStart(2, '0')}</span></div>` : html`<div class=${'wp-thumb th-' + f.thumb} style=${'--h:' + (hashStr(r.topic) % 360)}><span class="emo">${f.thumb === 'choc' ? '😱' : f.thumb === 'mystere' ? '❓' : W.emoji}</span>${f.thumb === 'choc' ? html`<i class="th-text">${str(f.title, 28).toUpperCase()}</i>` : f.thumb === 'mystere' ? html`<i class="th-q">???</i>` : null}<span class="vc-dur">${8 + (hashStr(r.topic) % 14)}:${String(hashStr(r.id) % 60).padStart(2, '0')}</span></div>`}
          <div class="wp-meta"><${Avatar} who=${author(g, 'p')} size=${32} /><div><b>${f.title || 'Sans titre'}</b><span>${g.player.name} · ≈ ${fmtN(lo)} vues · à l’instant</span></div></div></div>`
      : kind === 'vert' ? html`<div class="vert-prev" style=${'--h:' + (hashStr(r.topic) % 360)}><span class="emo">${W.emoji}</span>${f.hook ? html`<b class="vp-hook">${f.hook}</b>` : null}
          <div class="vp-rail"><span>♥</span><span>💬</span><span>↗</span></div>
          <div class="vp-foot"><b>@${g.player.handle}</b><span>${str(f.caption, 70)}</span><span>♫ ${sound || 'son original'}</span></div></div>`
      : kind === 'live' ? html`<div class="live-prev" style=${'--h:' + (hashStr(r.topic) % 360)}><span class="live-badge">● EN DIRECT</span><span class="emo">${W.emoji}</span><b>${f.title || r.topic}</b><span>≈ ${fmtN(Math.max(1, Math.round(lo * 0.25)))} spectateurs en même temps</span></div>`
      : html`<div class="audio-prev"><span class="ap-cover" style=${'--h:' + (hashStr(r.topic) % 360)}>${W.emoji}</span><div><b>${f.title || r.topic}</b><span>${g.player.name}</span><span class="ap-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div></div>`}
    </div>
    ${kind !== 'vert' ? html`<div class="field"><label class="lbl" for="up-title">Titre</label><input id="up-title" class="input" maxlength="100" value=${f.title} onInput=${(ev) => set('title', ev.target.value)} /></div>` : null}
    ${kind === 'wide' && T0 ? html`<div class="field"><span class="lbl">Miniature</span><div class="th-chosen"><${ThumbArt} look=${T0.look} img=${T0.img} small=${true} /><div><b>${thumbWord(T0)}</b><small>+${Math.round(T0.ctr * 100)} % de clics${T0.choc ? ' · si c’est raté, « putaclic »' : ''}</small>${T0.kind !== 'staff' ? html`<button type="button" class="linkbtn" onClick=${() => { r.thumb = null; update(); }}>Changer</button>` : null}</div></div></div>` : null}
    ${kind === 'vert' ? html`<div class="field"><label class="lbl" for="up-hook">L’accroche (les 2 premières secondes)</label><input id="up-hook" class="input" maxlength="60" value=${f.hook} onInput=${(ev) => set('hook', ev.target.value)} placeholder="ex : Personne ne m’a cru. Alors j’ai filmé." /><small>Une vraie accroche retient les gens : +12 % de vues.</small></div>
      <div class="field"><span class="lbl">${pf === 'instagram' ? 'Audio tendance' : 'Son tendance'}</span>${trendChips(sounds, 'trend', 'Son original')}</div>
      ${tags.length ? html`<div class="field"><span class="lbl">Défi / hashtag</span>${trendChips(tags, 'trend2', 'Aucun')}</div>` : null}` : null}
    ${kind !== 'vert' && topics.length ? html`<div class="field"><span class="lbl">Surfer sur une tendance</span>${trendChips(topics, 'trend', 'Aucune')}</div>` : null}
    ${collabs.length ? html`<div class="field"><span class="lbl">Collab (publier à deux)</span><div class="tr-chips"><button type="button" class=${'chip-btn' + (!f.collab ? ' on' : '')} onClick=${() => set('collab', '')}>Seul·e</button>${collabs.slice(0, 6).map((c) => html`<button type="button" key=${c.id} class=${'chip-btn' + (f.collab === c.id ? ' on' : '')} onClick=${() => set('collab', c.id)}>${c.emoji || '👤'} ${c.name.split(' ')[0]}</button>`)}</div><small>Son audience voit aussi ta publication.</small></div>` : null}
    ${deals.length ? html`<div class="field up-sponsor"><span class="lbl">Sponsor</span>
      <div class="tr-chips"><button type="button" class=${'chip-btn' + (!f.deal ? ' on' : '')} onClick=${() => set('deal', '')}>Aucun</button>${deals.map((d) => html`<button type="button" key=${d.id} class=${'chip-btn' + (f.deal === d.id ? ' on' : '')} onClick=${() => set('deal', d.id, { mention: !d.shady })}>${d.emoji} ${d.brand}${d.fee ? ` · ${fmtMoney(g, d.fee - d.upfront)}` : ''}</button>`)}</div>
      <small>Une marque logique avec ton sujet : +${fitPct(1)} % de vues. Hors sujet : −${fitPct(-1)} %.</small>
      ${dl ? html`<label class=${'mention-toggle' + (f.mention ? '' : ' off')}><input type="checkbox" checked=${f.mention} onChange=${(ev) => set('mention', ev.target.checked)} /><span><b>Mention « Collaboration commerciale »</b><small>${f.mention ? (dl.shady ? 'Ton contrat dit sans. Tu la mets quand même ?' : 'Visible tout le long du contenu.') : dl.shady ? 'Comme le demande ton contrat.' : 'Le contenu ne dira pas qu’il est sponsorisé.'}</small></span></label>` : null}
    </div>` : null}
    ${declOn(g, r.what) ? html`<div class="field up-decl"><span class="lbl">Pour les annonceurs : ce que contient ${laW(r)}</span>
      <div class="tr-chips">${DECL.map(([k, label]) => html`<button type="button" key=${k} class=${'chip-btn' + (f.decl.includes(k) ? ' on' : '')} onClick=${() => set('decl', f.decl.includes(k) ? f.decl.filter((x) => x !== k) : f.decl.concat([k]))}>${label}</button>`)}</div>
      <small>${f.decl.length ? 'Déclaré : des pubs limitées, sans avertissement.' : 'Rien de coché : toutes les pubs, si c’est vrai. Un contenu caché qui se voit : démonétisé, et un avertissement.'}</small></div>` : null}
    ${mbOK && kind !== 'live' && mb.perks.includes('avant') ? html`<label class=${'mention-toggle up-memb' + (f.membAvant ? '' : ' off')}><input type="checkbox" checked=${f.membAvant} onChange=${(ev) => set('membAvant', ev.target.checked)} /><span><b>👑 En avant-première pour tes membres</b><small>${f.membAvant ? 'Tes membres la voient 48 h avant tout le monde : ta promesse du mois est tenue.' : 'Tu as promis une avant-première par mois à tes membres.'}</small></span></label>` : null}
    ${mbOK && kind === 'live' && mb.perks.includes('live') ? html`<label class=${'mention-toggle up-memb' + (f.membLive ? '' : ' off')}><input type="checkbox" checked=${f.membLive} onChange=${(ev) => set('membLive', ev.target.checked)} /><span><b>👑 Réservé à tes membres</b><small>${f.membLive ? 'Seuls tes membres le voient : bien moins de spectateurs, mais un vrai moment avec eux.' : 'Tu as promis un live réservé par mois à tes membres.'}</small></span></label>` : null}
    <div class="up-est"><span>≈ ${fmtN(lo)} à ${fmtN(hi)} ${unit}</span><span>${cap1(audienceWord(aud))}${g.boosts.push ? ' · mise en avant ×2' : ''}${r.series ? ` · série ×${fmtDec(seriesMult(g))}` : ''}${(r.crew || []).length ? ' · ton équipe a bossé dessus' : ''}</span></div>
    <label class="lbl" for="rl-cap">Ton post d’annonce sur le réseau</label>
    <textarea id="rl-cap" class="input" maxlength="280" rows="2" value=${f.caption} onInput=${(ev) => set('caption', ev.target.value)}></textarea>
    <button class="btn btn-hot" onClick=${() => publishRelease(r, f.caption, f)} disabled=${!!S.busy.act || !canAfford(g, 'post')}>${kind === 'live' ? 'Lancer le live' : 'Publier ' + laW(r)} · ≈ ${costLabel(g, 'post')} <${Icon} n="coffee" s=${15} /></button>
    ${!canAfford(g, 'post') ? html`<small class="muted">Ton budget IA du jour est épuisé. <button class="linkbtn" onClick=${budgetBlocked}>Options</button></small>` : null}
  </div>`;
}
// A release in the feed, the way its platform shows it.
function PlatformVideo({ g, p, now }) {
  const v = p.video, W = WHATS[v.what] || WHATS.vidéo, kind = kindOfFmt(v.what), mine = p.a === 'p';
  const k = v.views ? ease((now - (p.ls || p.at)) / Math.max(20000, (p.animMs || 40000) * 1.5)) : 0;
  const views = Math.round((v.views || 0) * k);
  const h = hashStr(v.topic || '');
  const unit = kind === 'audio' ? 'écoutes' : kind === 'live' ? 'spectateurs' : 'vues';
  const tierChip = mine && v.tier ? html`<span class=${'chip ' + (v.tier === 'top' ? 'good' : v.tier === 'flop' ? 'bad' : '')}>${RELEASE_TIERS[v.tier].label} · ${Math.round((v.score || 0) * 100)} %${v.diff ? ' · ' + diffOf(v.diff).emoji + ' ' + diffOf(v.diff).label : ''}${v.ep ? ` · épisode ${v.ep}` : ''}</span>` : null;
  const money = mine && v.views ? html`${v.money ? html`<span class="chip money">💶 ≈ ${fmtMoney(g, v.money * k)}</span>` : null}${v.extra ? html`<span class="chip">✂️ + un format court : ${fmtN(v.extra.views * k)} vues</span>` : null}` : null;
  const sp = v.sponsor ? html`<span class=${'sp-tag' + (v.sponsor.mention ? '' : ' hidden-ad')}>${v.sponsor.mention ? `Collaboration commerciale · ${v.sponsor.brand}` : `${v.sponsor.emoji} ${v.sponsor.brand}`}</span>` : null;
  const F = mine && v.sponsor && v.sponsor.fit ? v.sponsor.fit : 0; // 0.21: the placement, logical with the topic or not
  const fitChip = F ? html`<span class=${'chip fit-chip ' + (F > 0 ? 'good' : 'warn')}>Placement ${FIT_WORDS[F]} · ${F > 0 ? '+' : '−'}${fitPct(F)} % de vues</span>` : null;
  const mbChip = v.memb ? html`<span class="chip memb-chip">👑 ${v.memb === 'live' ? 'Réservé aux membres' : 'Avant-première membres'}</span>` : null; // 0.22
  const tr = v.trend ? html`<span class="tr-tag">${v.trend.emoji} ${v.trend.name}</span>` : null;
  const dons = mine && v.donTotal ? html`<${DonsBlock} g=${g} p=${p} />` : null; // 0.21: the donations of a live
  const A = mine && v.ads && v.ads.paid ? v.ads : null; // 0.21
  const adsRow = A ? html`<div class="row ads-row"><span class=${'chip ' + ADS_STATES[A.s].tone}>$ ${ADS_STATES[A.s].label}${A.why && A.s !== 'vert' ? ' · ' + A.why : ''}</span>${A.caught ? html`<span class="chip bad">⚠️ Avertissement</span>` : null}${A.s === 'vert' && A.appeal !== 'won' ? null
    : A.appeal === 'pending' ? html`<span class="muted ads-appeal">Réexamen en cours</span>` : A.appeal === 'won' ? html`<span class="muted ads-appeal">Réexamen accepté</span>` : A.appeal === 'lost' ? html`<span class="muted ads-appeal">Réexamen refusé</span>`
      : html`<button class="linkbtn" onClick=${(ev) => { ev.stopPropagation(); if (appealAds(g, p)) update(); }}>Demander un réexamen</button>`}</div>` : null;
  if (kind === 'vert') {
    return html`<div class=${'pv pv-vert pf-' + (v.plat || 'youtube')} style=${'--h:' + (h % 360)}>
      <div class="pv-screen" role="img" aria-label=${`${cap1(v.noun || v.what)} : ${v.topic}`}><span class="emo" aria-hidden="true">${W.emoji}</span>${v.hook ? html`<b class="vp-hook">${v.hook}</b>` : null}<span class="pv-views">▶ ${fmtN(views)}</span>${v.trend && v.trend.kind === 'son' ? html`<span class="pv-sound">♫ ${v.trend.name}</span>` : null}</div>
      <div class="pv-meta"><b>${v.topic}</b><div class="row">${sp}${tr}</div>${tierChip}<div class="row">${money}${fitChip}${mbChip}</div>${adsRow}</div>
    </div>`;
  }
  if (kind === 'audio') {
    return html`<div class="pv pv-audio"><span class="ap-cover" style=${'--h:' + (h % 360)} aria-hidden="true">${W.emoji}</span><div class="pv-meta"><b>${v.title || v.topic}</b><span class="muted">${fmtN(views)} ${unit}</span><div class="row">${sp}${tr}</div>${tierChip}<div class="row">${money}${fitChip}${mbChip}</div>${adsRow}</div></div>`;
  }
  const dur = kind === 'live' ? 'REPLAY' : `${2 + (h % 13)}:${String((h >>> 5) % 60).padStart(2, '0')}`;
  if (v.thumbLook || v.thumbImg) return html`<div class="video-card pv">
    <div class="vc-screen custom"><${ThumbArt} look=${v.thumbLook} img=${v.thumbImg} label=${`${cap1(v.noun || v.what)} : ${v.topic}`} /><span class="vc-play"><${Icon} n="play" s=${22} fill=${true} /></span><span class="vc-dur">${dur}</span></div>
    <div class="vc-meta"><b>${v.title || v.topic}</b>${v.views ? html`<span class="muted vc-views">${fmtN(kind === 'live' ? Math.round(views * 0.25) : views)} ${unit}${kind === 'live' ? ' en même temps' : ''}</span>` : null}<div class="row">${sp}${tr}</div>${tierChip}<div class="row">${money}${fitChip}${mbChip}</div>${adsRow}${dons}</div>
  </div>`;
  return html`<div class="video-card pv">
    <div class=${'vc-screen th-' + (v.thumb || 'propre')} style=${'--h:' + (h % 360)} role="img" aria-label=${`${cap1(v.noun || v.what)} : ${v.topic}`}><span class="vc-emo" aria-hidden="true">${v.thumb === 'choc' ? '😱' : v.thumb === 'mystere' ? '❓' : W.emoji}</span>${v.thumb === 'choc' ? html`<i class="th-text">${str(v.title || v.topic, 28).toUpperCase()}</i>` : null}<span class="vc-play"><${Icon} n="play" s=${22} fill=${true} /></span><span class="vc-dur">${dur}</span></div>
    <div class="vc-meta"><b>${v.title || v.topic}</b>${v.views ? html`<span class="muted vc-views">${fmtN(kind === 'live' ? Math.round(views * 0.25) : views)} ${unit}${kind === 'live' ? ' en même temps' : ''}</span>` : null}<div class="row">${sp}${tr}</div>${tierChip}<div class="row">${money}${fitChip}${mbChip}</div>${adsRow}${dons}</div>
  </div>`;
}

/* ---------- « Écrire pour moi »: the model writes the player's message, for gems ---------- */
function WriteBtn({ w, onText }) {
  const g = S.game;
  if (!g) return null;
  const cost = WRITE_COST[w.kind] || 2, key = w.key || w.kind;
  const busy = S.busy.write === key;
  return html`<button type="button" class="linkbtn row write-btn" style="gap:4px" disabled=${!!S.busy.write || g.stats.gems < cost} title=${g.stats.gems < cost ? `Il te faut ${cost} gemmes` : `${AI_NAME} écrit à ta place (tu relis avant d’envoyer)`}
    onClick=${async () => { const t = await writeForMe(Object.assign({}, w, { key })); if (t) onText(t); }}>${busy ? html`<${Typing} />` : html`<${Icon} n="pen" s=${14} />`} Écrire pour moi · ${cost} <${Icon} n="gem" s=${12} /></button>`;
}

/* ---------- real screenshots of private messages, as proof ---------- */
// What can be shown about someone: their own messages to the player, and what others said about them in private.
function capturesFor(g, target, now = Date.now()) {
  const out = [];
  const first = target.name.split(' ')[0].toLowerCase();
  for (const id in g.dms) {
    const who = g.chars[id];
    if (!who || !DM_KINDS.includes(who.kind)) continue;
    for (const m of g.dms[id].msgs) {
      if (m.me || m.sys || !m.text || m.at > now) continue;
      const t = m.text.toLowerCase();
      if (id === target.id || t.includes('@' + target.handle) || t.includes(first)) out.push({ c: id, m: m.id, text: m.text, own: id === target.id });
    }
  }
  return out.slice(-8).reverse();
}
function CapturePicker({ g, target, sel, onToggle }) {
  const list = capturesFor(g, target);
  if (!list.length) return null;
  return html`<div class="cite-list caps"><span class="lbl">Captures de DM (authentiques)</span>
    ${list.map((x) => { const who = g.chars[x.c]; const on = sel.some((y) => y.m === x.m); return html`<label key=${x.m} class="cite"><input type="checkbox" checked=${on} onChange=${() => onToggle(x)} /><span><b>@${who.handle}${x.own ? '' : ` (sur ${target.name.split(' ')[0]})`}</b> « ${str(x.text, 120)} »</span></label>`; })}
    <small class="muted">Des vraies captures pèsent lourd. Mais publier les messages privés de quelqu’un d’autre, c’est une trahison qu’il ou elle n’oubliera pas.</small>
  </div>`;
}

/* ---------- profile photos: the face the photo pack gives a main character (photos.js), or a photo the player imports ---------- */
const STYLE_OF = (g) => STYLE_OF_PRESET(g.world.preset);
// A photo the player imported (kept in its own document, outside the save).
S.photos = {};
function ownPhoto(g, key) {
  const k = g.id + ':' + key, v = S.photos[k];
  if (v === undefined) {
    S.photos[k] = 'loading';
    Store.read(`g_${g.id}_ph_${key}`).then((b) => { S.photos[k] = b && typeof b.data === 'string' && b.data.startsWith('data:image/') ? b.data : 'missing'; update(false); }).catch(() => { S.photos[k] = 'missing'; });
    return null;
  }
  return v === 'loading' || v === 'missing' ? null : v;
}
function photoOf(g, c, key) {
  if (!g || !c) return null;
  if (c.photo === 'own') return ownPhoto(g, key);
  return key === 'p' ? null : charPortrait(g, c);
}
function shrinkImage(file, size = 192) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      const s = Math.min(img.width, img.height), x = (img.width - s) / 2, y = (img.height - s) / 4; // a bit above the middle: faces
      cv.getContext('2d').drawImage(img, x, Math.max(0, y), s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      res(cv.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image')); };
    img.src = url;
  });
}
async function importPhoto(g, key, file) {
  if (!file || !/^image\//.test(file.type) || file.size > 15e6) { toast('Choisis une image (JPG, PNG ou WebP).', 'bad'); return; }
  try {
    const data = await shrinkImage(file);
    await Store.write(`g_${g.id}_ph_${key}`, { data });
    S.photos[g.id + ':' + key] = data;
    if (key === 'p') { g.player.photo = 'own'; delete g.player.photoDesc; } else if (g.chars[key]) g.chars[key].photo = 'own';
    g.photoKeys = Array.from(new Set([...(g.photoKeys || []), key]));
    if (key === 'p' && S.game === g) queueModal({ t: 'pfp', file, at: Date.now() }); // 0.25.1: show it off in a post, or not
    else toast('Photo de profil mise à jour.', 'good');
    update();
  } catch (e) { toast('Impossible d’importer cette image.', 'bad'); }
}
function removePhoto(g, key) {
  if (key === 'p') { delete g.player.photo; delete g.player.photoDesc; } else if (g.chars[key]) delete g.chars[key].photo; // back to the pack's face, or the emoji
  Store.remove(`g_${g.id}_ph_${key}`).catch(() => {});
  S.photos[g.id + ':' + key] = 'missing';
  update();
}
// The prompt to paste into ChatGPT (or any image tool) for a portrait that fits the character.
function portraitPrompt(g, key) {
  const c = key === 'p' ? null : g.chars[key];
  const gd = c ? c.g : pg(g);
  const who = gd === 'f' ? 'une femme' : gd === 'm' ? 'un homme' : 'une personne au look androgyne';
  const what = c ? `${c.role}${c.personality ? ' ; ' + c.personality : ''}` : `${g.player.identity}${g.player.bio ? ' ; ' + g.player.bio : ''}`;
  const style = { scifi: 'Univers de science-fiction (une station spatiale en 2350), tenue futuriste.', cyber: 'Ambiance cyberpunk, néons, tenue urbaine high-tech.', fantasy: 'Univers médiéval-fantastique, tenue d’époque.', magie: 'Étudiant·e d’une académie de magie moderne, tenue d’école chic.', moderne: 'Monde actuel, tenue de tous les jours.' }[STYLE_OF(g)];
  return `Photo de profil réaliste, format carré, d’une personne FICTIVE qui ne ressemble à aucune personne réelle : ${who} adulte (${c && c.age ? `environ ${Math.max(21, c.age)} ans` : 'entre 20 et 35 ans'}). Qui c’est : ${str(what, 220)}. ${style} Cadrage épaules, regard caméra, lumière naturelle, arrière-plan flou, style photo de réseau social. Pas de texte, pas de logo.`;
}
/* ---------- 0.25.1: the player's new profile photo: shown off in a post (everyone has a say: compliments, vannes,
   piques), or just changed (someone may notice it with a later call, none of its own). What it shows is in every
   prompt (ctxText): the characters can bring it up any time. ---------- */
function setPhotoDesc(g, desc) {
  const d = str(desc, 140);
  if (d.length >= 3) g.player.photoDesc = d; else delete g.player.photoDesc;
  update();
}
function pfpQuiet(g, desc) {
  setPhotoDesc(g, desc);
  const d = g.player.photoDesc;
  addTrigger(g, `Le joueur vient de changer de photo de profil${d ? ` (on y voit : « ${d} »)` : ''} : quelqu’un peut le remarquer en passant, d’un compliment, d’une vanne ou d’une pique.`);
  toast('Photo de profil mise à jour.', 'good');
}
// The post's own copy of the photo, bigger than the avatar (192 px): from the file just picked, the avatar at worst.
async function pfpAnnounce(g, desc, file) {
  setPhotoDesc(g, desc);
  let data = null;
  try { if (okImage(file)) data = await packShrink(file, 720, 720, 0.82); } catch (e) { data = null; }
  if (!data) data = ownPhoto(g, 'p');
  if (!data || S.game !== g) { toast('Impossible de préparer ce post.', 'bad'); return; }
  const id = uid('pm');
  if (!(await mediaPut(id, data))) toast('Ce navigateur ne garde pas les photos : elle disparaîtra en quittant la page.', 'bad');
  markDrafts([id]);
  if (S.game !== g) { mediaDel(id); markDrafts(null, [id]); return; }
  openCompose({ pfp: { pic: id, desc: g.player.photoDesc || '' } });
}
// What the post settled on (the player's words, or what the characters saw): the photo's description from now on.
function pfpPosted(g, p) {
  const d = str(p && p.photo ? p.photo.desc || p.photo.ai : '', 140);
  if (d.length >= 3 && g.player.photo === 'own') g.player.photoDesc = d;
}
function PfpCard({ g, m, close }) {
  const [desc, setDesc] = useState('');
  const src = ownPhoto(g, 'p');
  const go = (ann) => { close(); if (ann) pfpAnnounce(g, desc, m.file); else pfpQuiet(g, desc); };
  return html`<div class="modal-card pfp-card">
    <span class="eyebrow">Nouvelle photo de profil</span>
    <span class="pfp-big" aria-hidden="true">${src ? html`<img src=${src} alt="" />` : null}</span>
    <label class="pfp-field" for="pfp-desc">Ce qu’on y voit <small>(facultatif)</small></label>
    <input id="pfp-desc" class="input" maxlength="140" placeholder="ex : moi en terrasse, lunettes de soleil, sourire en coin" value=${desc} onInput=${(ev) => setDesc(ev.target.value)} />
    <p class="muted">Les persos connaîtront ta photo par ces mots : de quoi te complimenter… ou te vanner.</p>
    <button class="btn btn-hot" onClick=${() => go(true)}>📸 L’annoncer en post</button>
    <button class="btn btn-ghost" onClick=${() => go(false)}>Juste la changer</button>
  </div>`;
}
// On the profile: the avatar takes a new photo itself (a camera badge, as on the real apps).
function PfpButton({ g }) {
  const ref = useRef(null);
  return html`<span class="prof-av"><${Avatar} who=${author(g, 'p')} size=${84} />
    <button type="button" class="prof-cam" onClick=${() => ref.current && ref.current.click()} aria-label="Changer ta photo de profil" title="Changer ta photo de profil"><${Icon} n="camera" s=${16} /></button>
    <input ref=${ref} type="file" accept="image/*" hidden onChange=${(ev) => { const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; if (f) importPhoto(g, 'p', f); }} />
  </span>`;
}
function PhotoTools({ g, k }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [pd, setPd] = useState(null); // 0.25.1: the description being typed (null: the saved one)
  const c = k === 'p' ? g.player : g.chars[k];
  if (!c) return null;
  const prompt = portraitPrompt(g, k);
  const copy = async () => {
    try { await navigator.clipboard.writeText(prompt); toast('Prompt copié : colle-le dans ChatGPT pour générer la photo.', 'good'); }
    catch (e) { setOpen(true); toast('Sélectionne le texte et copie-le.', ''); }
  };
  return html`<section class="section photo-tools">
    <div class="section-h"><h3>Photo de profil</h3><span>${c.photo === 'own' ? 'importée' : k !== 'p' && faceOf(g, c) ? 'du pack' : 'emoji'}</span></div>
    <p class="muted" style="font-size:13.5px">Génère un portrait avec ton IA (ChatGPT ou une autre) à partir de ce prompt, puis importe l’image ici.</p>
    <div class="row">
      <button class="btn btn-ghost btn-sm" onClick=${copy}><${Icon} n="sparkles" s=${15} /> Copier le prompt</button>
      <button class="btn btn-ghost btn-sm" onClick=${() => ref.current && ref.current.click()}><${Icon} n="upload" s=${15} /> Importer une image</button>
      ${c.photo === 'own' ? html`<button class="linkbtn quiet" onClick=${() => removePhoto(g, k)}>Retirer</button>` : null}
      <input ref=${ref} type="file" accept="image/*" hidden onChange=${(ev) => { const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; if (f) importPhoto(g, k, f); }} />
    </div>
    ${k === 'p' && c.photo === 'own' ? html`<label class="pfp-desc"><span>Ce qu’on voit dessus</span>
      <input class="input" maxlength="140" placeholder="ex : moi en terrasse, lunettes de soleil" value=${pd != null ? pd : c.photoDesc || ''}
        onInput=${(ev) => setPd(ev.target.value)} onBlur=${() => { if (pd != null) { setPhotoDesc(g, pd); setPd(null); } }} onKeyDown=${(ev) => { if (ev.key === 'Enter') ev.target.blur(); }} />
      <small class="muted">Les persos connaissent ta photo par ces mots.</small></label>` : null}
    <details open=${open}><summary>Voir le prompt</summary><textarea class="input prompt-box" readonly rows="5" onFocus=${(ev) => ev.target.select()}>${prompt}</textarea></details>
  </section>`;
}

/* ---------- the career's modals: a rumor, leaked DMs, a daily upload's verdict, money news ---------- */
function CareerModal({ m, g, close }) {
  if (m.t === 'rumor') {
    const r = (g.rumors || []).find((x) => x.id === m.rid), c = r && g.chars[r.by];
    if (!r || !c || r.state !== 'live') return null;
    return html`<div class="modal-card rumor-card">
      <span class="eyebrow" style="color:var(--bad)">Coup bas</span>
      <div class="modal-big" aria-hidden="true">🗣️</div>
      <div class="modal-char"><${Avatar} who=${author(g, 'c:' + c.id)} size=${44} /><div><b>${c.name}</b><span>@${c.handle} fait courir une rumeur sur toi</span></div></div>
      <p>« ${r.text} »</p>
      <p class="muted">C’est faux, mais ça circule. Tant que tu ne la démens pas, ta réputation et tes abonnés s’effritent, et dans 3 heures elle s’installera.</p>
      <button class="btn btn-hot" onClick=${() => { close(); openCompose({ debunk: r.id }); }}><${Icon} n="megaphone" s=${16} /> Démentir maintenant</button>
      ${hasStaff(g, 'avocat') ? html`<button class="btn btn-ghost" onClick=${() => { close(); lawyerNotice(g, r); update(); }}>⚖️ Mise en demeure par ton avocat·e</button>` : null}
      <button class="btn btn-ghost" onClick=${close}>Plus tard</button>
    </div>`;
  }
  if (m.t === 'leak') {
    const it = (g.intel || []).find((x) => x.id === m.iid), c = g.chars[m.by];
    if (!it || !c) return null;
    return html`<div class="modal-card busted">
      <span class="eyebrow">Tes DM sont sortis</span>
      <div class="burst">SCREEN</div>
      <div class="modal-char"><${Avatar} who=${author(g, 'c:' + c.id)} size=${44} /><div><b>${c.name}</b><span>publie ta conversation privée</span></div></div>
      <div class="evidence"><span class="ev-kind">💬 Capture authentique</span><span class="ev-desc">« ${it.quote} »</span></div>
      <p>${it.w >= 3 ? 'C’est grave : tout le réseau en parle.' : it.w === 2 ? 'Ça fait jaser.' : 'Ça pique un peu.'} Ce que tu écris en privé peut toujours ressortir.</p>
      <button class="btn btn-ghost" onClick=${() => { close(); openCompose({ text: `@${c.handle} ` }); }}>Répondre en public</button>
      <button class="btn btn-ghost" onClick=${close}>Encaisser</button>
    </div>`;
  }
  if (m.t === 'series') {
    const s = g.series && g.series.id === m.sid ? g.series : null;
    if (!s) return null;
    return html`<div class=${'modal-card' + (s.state === 'won' ? ' viral' : s.state === 'badbuzz' ? ' busted' : '')}>
      <span class="eyebrow">Défi Daily Upload · ${s.days} jours${s.hard ? ' · hardcore' : ''}</span>
      ${s.state === 'won' ? html`<div class="burst">DÉFI RÉUSSI</div><div class="rewards"><span class="chip flash"><${Icon} n="gem" s=${12} /> +${s.reward.gems} gemmes</span><span class="chip good">${nAbonnes(s.reward.fol, true)}</span><span class="chip hot">Une marque t’a repéré·e</span></div><p>Meilleure série : ${s.best} d’affilée. Respect.</p>`
        : s.state === 'badbuzz' ? html`<div class="burst">FIASCO</div><div class="rewards"><span class="chip bad">−${nAbonnes(s.reward.loss)}</span><span class="chip bad">${s.reward.rep != null ? repWord(s.reward.rep / 10) : '−150 de réputation'}</span><span class="chip bad">Bad buzz</span></div><p>Tout le monde a vu le défi s’effondrer. Ça va se moquer un moment.</p>`
          : html`<div class="modal-big" aria-hidden="true">😬</div><div class="rewards"><span class="chip bad">−${nAbonnes(s.reward.loss)}</span><span class="chip bad">${s.reward.rep != null ? repWord(s.reward.rep / 10) : '−60 de réputation'}</span></div><p>Pas tenu jusqu’au bout : un petit bide, ça passera.</p>`}
      <${SeriesCard} g=${g} s=${s} now=${Date.now()} />
      <button class="btn btn-hot" onClick=${close}>Continuer</button>
    </div>`;
  }
  if (m.t === 'money') {
    if (m.what === 'program') return html`<div class="modal-card viral"><span class="eyebrow">Monétisation</span><div class="modal-big" aria-hidden="true">💶</div><p><b>Tu es ${px(g, 'accepté', 'acceptée', 'accepté·e')} au programme de ${pfName(g, platformOf(g))} !</b> Tes contenus rapportent de l’argent maintenant, selon leurs vues, ta niche et la saison.</p><button class="btn btn-hot" onClick=${() => { close(); goTab('studio'); }}>Voir mon studio</button><button class="btn btn-ghost" onClick=${close}>Continuer</button></div>`;
    if (m.what === 'payout') return html`<div class="modal-card viral"><span class="eyebrow">Jour de paie</span><div class="modal-big">+${fmtMoney(g, m.amount)}</div><p>${pfName(g, platformOf(g))} te verse tes revenus ${deMonth(m.month)}.</p><button class="btn btn-hot" onClick=${close}>Encaisser</button></div>`;
    if (m.what === 'fine') return html`<div class="modal-card busted"><span class="eyebrow">${m.law ? 'Promotion interdite' : 'Publicité cachée'}</span><div class="burst">AMENDE</div><div class="rewards"><span class="chip bad">−${fmtMoney(g, m.amount)}</span><span class="chip bad">${m.rep != null ? repWord(m.rep / 10) : `−${m.law ? 250 : 150} de réputation`}</span><span class="chip bad">Bad buzz</span></div><p>${m.law ? `La promo de ${m.brand} était interdite par la loi : tu as été ${px(g, 'signalé', 'signalée', 'signalé·e')}.` : `Ton partenariat avec ${m.brand} n’avait pas la mention « Collaboration commerciale » : c’est de la pratique commerciale trompeuse.`}</p><button class="btn btn-ghost" onClick=${close}>J’assume</button></div>`;
  }
  return null;
}
