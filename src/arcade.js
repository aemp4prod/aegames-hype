/* =========================================================
   0.25: more skill rounds, played without the AI (0 token): moderating a live's chat, mixing a podcast, reframing a
   horizontal video for a phone (0.27.4: the colour grading is gone, far too hard). They come in the shoot's rotation (by format) and at the edit
   step, so that a player keeps finding new ones. Each one: rounds (or messages), a score from 0 to 1, harder with the
   difficulty (faster, tighter, more to watch), kept as it goes (leaving and coming back: the round under way is lost).
   ========================================================= */
const shortTopic = (r) => firstWordsOf(r && r.topic, 3) || 'ton sujet';
const firstWordsOf = (s, n) => String(s || '').replace(/[«»"“”()]/g, ' ').split(/\s+/).filter(Boolean).slice(0, n).join(' ');

/* ---------- the chat of a live: remove the insults, the scams and the spam, keep the fans ---------- */
const CHAT_NICKS = ['lucas_92', 'mel.lumiere', 'xXdarkXx', 'nina.b', 'zozo_officiel', 'kev1n', 'la_vraie_ines', 'tom.tom', 'saraah', 'noe_gaming', 'juju.bzh', 'pablito', 'emma_ldn', 'mehdi.13', 'clara_o', 'yanis.prod', 'lou_pi', 'theo.dlc', 'chlo3', 'bastien.v'];
const CHAT_GOOD = ['trop bien ce live 🔥', 'première fois ici, je kiffe déjà', 'c’est quoi ton setup ?', 'gg !!', 'tu peux dire bonjour à ma sœur ? 😄', 'on t’aime ❤️', 'le son est un peu bas', 'ça fait combien de temps que tu fais ça ?', 'mdr 😂😂', 'enfin quelqu’un qui parle de {t}', 'tu refais un live demain ?', 'salut de Lyon 👋', 'trop fort', 'je partage à mes potes', 'mon moment préféré de la semaine', 'question : tu conseilles quoi pour débuter ?', 'bon courage pour la suite 💪', 'les autres, soyez sympas dans le chat svp', '{t} 😍', 'je suis là depuis le début !'];
const CHAT_BAD = ['t’es nul, arrête le live', 'ABONNEZ-VOUS À MA CHAÎNE 🔥🔥🔥', 'gagne 1000 € par jour ➜ lien dans ma bio', 'donne-moi ton mot de passe, je t’offre un badge', 'je sais où t’habites', 'regarde mes photos 🔞 lien ici', 'vous êtes tous des clowns', 'FREE ROBUX ➜ bit.ly/xx', 'achète des abonnés ici, pas cher', 'cringe. personne te regarde', '{t} c’est pour les losers', 'spam spam spam spam spam'];
// From « Difficile » on, the traps: friendly words that hide a scam or an insult, rough words that are only teasing or useful.
const CHAT_TRAP_BAD = ['super live ! au fait, clique ici pour gagner un iPhone 🎁', 'j’adore… pas du tout 😴', 'trop cool ! code promo SCAM50 sur mon site 😉', 'bravo pour ce live, dommage que tu sois si moche', 'je t’aide à gagner des abonnés, envoie-moi tes codes en privé'];
const CHAT_TRAP_GOOD = ['t’es vraiment nul à ce jeu 😂 je t’adore', 'ATTENTION LE SON COUPE !!', 'c’est quoi le lien du merch ?', 'NON MAIS LE MOMENT LÀ 😱😱', 'arrête, tu vas me faire pleurer 😭 trop beau', 'je vais te clasher… avec des cœurs ❤️❤️'];
function makeChat(r, D) {
  const ix = diffIx(D), n = [14, 16, 18, 20, 24, 28, 28][ix] || 18, per = [1500, 1300, 1100, 950, 850, 750, 750][ix] || 1100;
  const t = shortTopic(r), fill = (s) => s.split('{t}').join(t);
  const nBad = Math.round(n * 0.42), trapsBad = ix >= 2 ? Math.min(nBad - 2, ix) : 0, trapsGood = ix >= 2 ? Math.min(n - nBad - 2, ix) : 0;
  const bad = shuffle(CHAT_TRAP_BAD).slice(0, trapsBad).concat(shuffle(CHAT_BAD).slice(0, nBad - trapsBad)).map((x) => ({ text: fill(x), bad: true }));
  const good = shuffle(CHAT_TRAP_GOOD).slice(0, trapsGood).concat(shuffle(CHAT_GOOD).slice(0, n - nBad - trapsGood)).map((x) => ({ text: fill(x), bad: false }));
  const nicks = shuffle(CHAT_NICKS);
  const items = shuffle(bad.concat(good)).map((x, k) => Object.assign(x, { who: nicks[k % nicks.length] }));
  return { kind: 'chat', title: 'Modère le chat', what: r.what, intro: 'Ton chat déborde : supprime les insultes, les arnaques et le spam avant qu’ils restent à l’écran. Un fan supprimé par erreur, ça se voit aussi.', items, per, life: per * 4, diff: D.id,
    rule: `Les messages défilent : touche 🚫 sur ceux qui n’ont rien à faire là (insultes, arnaques, spam), laisse les autres. ${items.length} messages.` };
}

/* ---------- a podcast's mix: each track drifts, keep it in the green band ---------- */
const MIX_TRACKS = [['🎙️', 'Ta voix', 0.62], ['🎙️', 'L’invité', 0.58], ['🎵', 'La musique', 0.32], ['🔊', 'Les bruitages', 0.45]];
function makeMix(r, D) {
  const ix = diffIx(D), nT = [2, 2, 3, 3, 4, 4, 4][ix] || 3;
  return { kind: 'mixage', title: 'Le mixage', what: r.what, intro: 'Chaque piste bouge toute seule : garde-la dans la bande verte. Une voix qui sature ou une musique qui couvre tout, et l’épisode devient pénible à écouter.',
    tracks: MIX_TRACKS.slice(0, nT).map(([e, l, target]) => ({ e, l, target })), band: [0.3, 0.26, 0.22, 0.18, 0.15, 0.13, 0.13][ix] || 0.2,
    drift: [0.1, 0.13, 0.16, 0.2, 0.24, 0.28, 0.28][ix] || 0.16, roundMs: 7000, items: [0, 1, 2], diff: D.id,
    rule: `${nT} pistes à tenir dans le vert avec + et −, trois passages de 7 secondes.` };
}

/* ---------- a horizontal video, reframed for a phone: keep the subject in the vertical frame ---------- */
const FRAME_SUBJECTS = ['🕺', '🐕', '🛹', '🏃', '🎤', '🐈', '🚲', '💃'];
function makeFrame(r, D) {
  const ix = diffIx(D);
  return { kind: 'cadrage', title: 'Le recadrage vertical', what: r.what, intro: 'Ta vidéo est filmée à l’horizontale : garde le sujet dans le cadre vertical pendant qu’il bouge. S’il sort du cadre, on ne le voit plus sur le téléphone.',
    subject: pick(FRAME_SUBJECTS), w: [0.36, 0.32, 0.29, 0.26, 0.23, 0.21, 0.21][ix] || 0.28, speed: [0.16, 0.2, 0.25, 0.3, 0.36, 0.42, 0.42][ix] || 0.25,
    turns: [0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.5][ix] || 0.9, roundMs: 6500, items: [0, 1, 2], diff: D.id,
    rule: 'Fais glisser le cadre (ou ◀ ▶, ou les flèches du clavier) pour garder le sujet dedans : trois plans de 6 secondes.' };
}

// The makers, by kind (the shoot's rotation and the edit step read them).
const ROUND_MAKERS = { montage: makeMontage, memoire: makeMemoire, chat: makeChat, mixage: makeMix, cadrage: makeFrame }; // (0.27.4: no more grading)
// The skill rounds each format may get, at the shoot (the AI's games aside) and at the edit.
const ROUNDS_FOR = { vidéo: ['montage', 'memoire'], short: ['montage', 'memoire', 'cadrage'], live: ['montage', 'memoire', 'chat'], clip: ['montage', 'memoire'], podcast: ['montage', 'memoire', 'mixage'] };
const EDIT_FOR = { vidéo: ['montage', 'tri'], short: ['montage', 'tri', 'cadrage'], clip: ['montage', 'tri'], podcast: ['montage', 'tri', 'mixage'] };

/* ---------- the games on screen ---------- */
// A round-based game that runs in real time: the round under way when the player left counts as lost (like the cut).
function roundsStart(run, n) {
  let k = run && typeof run.k === 'number' ? run.k : 0, got = run && Array.isArray(run.got) ? run.got.slice() : [];
  if (run && run.live === k && k < n) { got = got.concat(0); k += 1; }
  return { k, got };
}
function ChatGame({ game, onDone, run, keep }) {
  const items = game.items, n = items.length, per = game.per || 1100, life = (game.life || per * 4) + MG_EXTRA; // (0.27.4: two more seconds on each message)
  const st = useRef(null);
  if (!st.current) {
    const res = run && Array.isArray(run.res) ? run.res.slice() : Array(n).fill(null);
    const i = run && typeof run.i === 'number' ? run.i : 0;
    for (let j = 0; j < i; j++) if (res[j] == null) res[j] = items[j].bad ? 0 : 1; // on screen when the player left: let through
    st.current = { i, res, shown: [], t0: 0, gone: {} };
  }
  const [, setV] = useState(0);
  const render = () => setV((v) => v + 1);
  const done = useRef(false);
  const finish = () => { if (!done.current) { done.current = true; const x = st.current; onDone(x.res.reduce((a, v) => a + (v || 0), 0) / n); } };
  const save = () => { const x = st.current; keep(Object.assign({ i: x.i, res: x.res }, x.res.every((v) => v != null) ? { score: x.res.reduce((a, v) => a + (v || 0), 0) / n } : {})); };
  useEffect(() => {
    const x = st.current;
    if (x.i >= n && x.res.every((v) => v != null)) { finish(); return undefined; }
    save();
    let last = performance.now() - per; // the first message right away
    const tick = setInterval(() => {
      const t = performance.now();
      let ch = false;
      if (x.i < n && t - last >= per) { x.shown.push({ j: x.i, at: t }); x.i += 1; last = t; ch = true; save(); }
      for (const m of x.shown) if (x.res[m.j] == null && t - m.at >= life) { x.res[m.j] = items[m.j].bad ? 0 : 1; m.out = true; ch = true; save(); }
      x.shown = x.shown.filter((m) => !(m.gone && t - m.gone > 700) && !(m.out && t - m.at > life + 300));
      if (ch) render();
      if (x.i >= n && x.res.every((v) => v != null) && !x.shown.length) { clearInterval(tick); finish(); }
    }, 100);
    return () => clearInterval(tick);
  }, []);
  const del = (m) => {
    const x = st.current;
    if (x.res[m.j] != null || done.current) return;
    x.res[m.j] = items[m.j].bad ? 1 : 0;
    m.gone = performance.now();
    m.ok = items[m.j].bad;
    save();
    render();
  };
  const x = st.current, ok = x.res.filter((v) => v === 1).length, seen = x.res.filter((v) => v != null).length;
  return html`<div class="mg-play chat-play">
    <div class="mg-top"><span class="mono">${Math.min(x.i, n)}/${n}</span><span class="mt-fb">${seen ? `${ok}/${seen} bien gérés` : 'Le chat s’anime…'}</span></div>
    <div class="chat-box" aria-live="polite">
      ${x.shown.map((m) => { const it = items[m.j]; return html`<div key=${m.j} class=${'chat-msg' + (m.gone ? (m.ok ? ' del ok' : ' del ko') : '')} data-j=${m.j} data-bad=${it.bad ? '1' : '0'}>
        <span class="chat-txt"><b>${it.who}</b> ${it.text}</span>
        ${m.gone ? html`<small>${m.ok ? 'Supprimé' : 'Oups, c’était un fan'}</small>` : html`<button type="button" class="chat-del" onClick=${() => del(m)} aria-label=${'Supprimer le message de ' + it.who}>🚫</button>`}
      </div>`; })}
    </div>
  </div>`;
}
function MixGame({ game, onDone, run, keep }) {
  const T = game.tracks, nR = game.items.length, ms = game.roundMs || 7000, band = game.band || 0.2;
  const st = useRef(null);
  if (!st.current) st.current = Object.assign(roundsStart(run, nR), { lv: T.map((x) => x.target), v: T.map(() => 0), inb: T.map(() => 0), t0: 0, last: 0, fb: null });
  const [, setV] = useState(0);
  const render = () => setV((v) => v + 1);
  const bars = useRef([]), done = useRef(false), alive = useRef(true);
  const finish = (got) => { if (!done.current) { done.current = true; onDone(got.reduce((a, v) => a + v, 0) / nR); } };
  const startRound = () => {
    const x = st.current;
    Object.assign(x, { lv: T.map((t) => clamp(t.target + rand(-0.25, 0.25), 0.05, 0.95)), v: T.map(() => 0), inb: T.map(() => 0), t0: performance.now(), last: performance.now(), fb: null });
    keep({ k: x.k, got: x.got, live: x.k });
    render();
  };
  useEffect(() => {
    const x0 = st.current;
    if (x0.k >= nR) { finish(x0.got); return () => { alive.current = false; }; }
    startRound();
    let raf = 0;
    const loop = () => {
      const x = st.current, t = performance.now();
      if (!x.fb && !done.current && x.t0) {
        const dt = Math.min(0.1, (t - x.last) / 1000);
        x.last = t;
        for (let k = 0; k < T.length; k++) {
          x.v[k] = clamp(x.v[k] + rand(-1, 1) * game.drift * 2.2 * dt, -game.drift * 1.6, game.drift * 1.6);
          if (Math.random() < 0.18 * dt * (1 + game.drift * 3)) x.lv[k] += rand(-1, 1) * 0.18; // someone laughs too close to the mic, a jingle too loud
          x.lv[k] = clamp(x.lv[k] + x.v[k] * dt, 0, 1);
          if (Math.abs(x.lv[k] - T[k].target) <= band / 2) x.inb[k] += dt;
          const b = bars.current[k];
          if (b) { b.style.left = (x.lv[k] * 100).toFixed(1) + '%'; b.parentNode.classList.toggle('in', Math.abs(x.lv[k] - T[k].target) <= band / 2); }
        }
        if (t - x.t0 >= ms) {
          const sec = ms / 1000, v = T.reduce((a, _, k) => a + Math.min(1, x.inb[k] / sec), 0) / T.length;
          x.got = x.got.concat(Math.round(v * 1000) / 1000);
          x.fb = { v };
          keep(Object.assign({ k: x.k + 1, got: x.got, live: -1 }, x.k + 1 >= nR ? { score: x.got.reduce((a, b) => a + b, 0) / nR } : {}));
          render();
          setTimeout(() => { if (x.k + 1 >= nR) finish(x.got); else if (alive.current) { x.k += 1; startRound(); } }, 1100);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { alive.current = false; cancelAnimationFrame(raf); };
  }, []);
  const nudge = (k, d) => { const x = st.current; if (x.fb || done.current) return; x.lv[k] = clamp(x.lv[k] + d, 0, 1); x.v[k] *= 0.4; };
  const x = st.current;
  if (x.k >= nR) return html`<div class="mg-play mg-wait"><${Typing} /></div>`;
  return html`<div class="mg-play mix-play">
    <div class="mg-top"><span class="mono">${x.k + 1}/${nR}</span><span class="mt-fb" aria-live="polite">${x.fb ? `${Math.round(x.fb.v * 100)} % dans le vert` : 'Garde chaque piste dans le vert'}</span></div>
    ${T.map((tr, k) => html`<div key=${k} class="mix-row" data-k=${k}>
      <span class="mix-lbl"><span aria-hidden="true">${tr.e}</span> ${tr.l}</span>
      <button type="button" class="mix-btn" onClick=${() => nudge(k, -0.08)} aria-label=${'Baisser ' + tr.l}>−</button>
      <span class="mix-meter"><span class="mix-band" style=${`left:${((tr.target - band / 2) * 100).toFixed(1)}%;width:${(band * 100).toFixed(1)}%`}></span><span class="mix-dot" ref=${(el) => { bars.current[k] = el; }} style=${'left:' + (x.lv[k] * 100).toFixed(1) + '%'}></span></span>
      <button type="button" class="mix-btn" onClick=${() => nudge(k, 0.08)} aria-label=${'Monter ' + tr.l}>+</button>
    </div>`)}
  </div>`;
}
/* 0.27.2: the frame answers at once. A press moves it right away (a little step, then it glides while held, faster than
   the quickest subject); two arrows held, the last one pressed wins, and letting one go never stops the other; a button
   held keeps going even if the pointer slips off it. The frame and the subject move by transform (no layout, no repaint
   of the whole picture at every frame). */
const FRAME_SPEED = 1.1, FRAME_STEP = 0.015; // (a second's glide, in widths of the picture; 0.9 in the 0.27, 0.55 before)
function FrameGame({ game, onDone, run, keep }) {
  const nR = game.items.length, ms = game.roundMs || 6500, w = game.w || 0.28;
  const st = useRef(null);
  if (!st.current) st.current = Object.assign(roundsStart(run, nR), { sx: 0.5, dir: 1, f: 0.5 - w / 2, inT: 0, t0: 0, last: 0, fb: null, ptr: 0, keys: { l: false, r: false, last: 0 } });
  const [, setV] = useState(0);
  const render = () => setV((v) => v + 1);
  const stage = useRef(null), subj = useRef(null), frame = useRef(null), bL = useRef(null), bR = useRef(null), done = useRef(false), alive = useRef(true);
  const finish = (got) => { if (!done.current) { done.current = true; onDone(got.reduce((a, v) => a + v, 0) / nR); } };
  // where the frame goes: a button held, else the arrows of the keyboard (both held: the last one pressed)
  const dirNow = () => { const x = st.current, K = x.keys; return x.ptr || (K.l && K.r ? K.last : K.l ? -1 : K.r ? 1 : 0); };
  const draw = () => {
    const x = st.current, W = stage.current ? stage.current.clientWidth : 0, d = dirNow();
    if (subj.current) subj.current.style.transform = `translate3d(${(x.sx * W).toFixed(1)}px,0,0) translateX(-50%)`;
    if (frame.current) { frame.current.style.transform = `translate3d(${(x.f * W).toFixed(1)}px,0,0)`; frame.current.classList.toggle('in', x.sx >= x.f && x.sx <= x.f + w); }
    if (bL.current) bL.current.classList.toggle('on', d < 0);
    if (bR.current) bR.current.classList.toggle('on', d > 0);
  };
  const nudge = (d) => { const x = st.current; if (x.fb || done.current || !x.t0) return; x.f = clamp(x.f + d * FRAME_STEP, 0, 1 - w); draw(); };
  const startRound = () => {
    const x = st.current;
    Object.assign(x, { sx: rand(0.3, 0.7), dir: Math.random() < 0.5 ? -1 : 1, f: 0.5 - w / 2, inT: 0, t0: performance.now(), last: performance.now(), fb: null });
    keep({ k: x.k, got: x.got, live: x.k });
    render();
  };
  useLayoutEffect(() => { draw(); }); // (after every render: the positions are set by hand)
  useEffect(() => {
    const x0 = st.current;
    if (x0.k >= nR) { finish(x0.got); return () => { alive.current = false; }; }
    startRound();
    let raf = 0;
    const loop = () => {
      const x = st.current, t = performance.now();
      if (!x.fb && !done.current && x.t0) {
        const dt = Math.min(0.1, (t - x.last) / 1000);
        x.last = t;
        if (Math.random() < game.turns * dt) x.dir = -x.dir; // the subject changes its mind
        x.sx += x.dir * game.speed * rand(0.6, 1.4) * dt;
        if (x.sx < 0.04) { x.sx = 0.04; x.dir = 1; } else if (x.sx > 0.96) { x.sx = 0.96; x.dir = -1; }
        const d = dirNow();
        if (d) x.f = clamp(x.f + d * FRAME_SPEED * dt, 0, 1 - w);
        if (x.sx >= x.f && x.sx <= x.f + w) x.inT += dt;
        draw();
        if (t - x.t0 >= ms) {
          const v = Math.min(1, x.inT / (ms / 1000));
          x.got = x.got.concat(Math.round(v * 1000) / 1000);
          x.fb = { v };
          keep(Object.assign({ k: x.k + 1, got: x.got, live: -1 }, x.k + 1 >= nR ? { score: x.got.reduce((a, b) => a + b, 0) / nR } : {}));
          render();
          setTimeout(() => { if (x.k + 1 >= nR) finish(x.got); else if (alive.current) { x.k += 1; startRound(); } }, 1100);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onKey = (e) => {
      const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
      if (!d) return;
      e.preventDefault();
      const K = st.current.keys, down = e.type === 'keydown';
      if (d < 0) K.l = down; else K.r = down;
      if (down) { K.last = d; if (!e.repeat) nudge(d); } else draw();
    };
    const letGo = () => { const x = st.current; x.keys.l = x.keys.r = false; x.ptr = 0; draw(); }; // (the window left: nothing stays pressed)
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', letGo);
    return () => { alive.current = false; cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', letGo); };
  }, []);
  const moveTo = (e) => { const el = stage.current, x = st.current; if (!el || x.fb) return; const b = el.getBoundingClientRect(); x.f = clamp((e.clientX - b.left) / b.width - w / 2, 0, 1 - w); draw(); };
  const hold = (d) => ({
    onPointerDown: (e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* (a pointer the browser does not track) */ } st.current.ptr = d; nudge(d); },
    onPointerUp: () => { if (st.current.ptr === d) { st.current.ptr = 0; draw(); } },
    onPointerCancel: () => { if (st.current.ptr === d) { st.current.ptr = 0; draw(); } },
    onLostPointerCapture: () => { if (st.current.ptr === d) { st.current.ptr = 0; draw(); } },
    onContextMenu: (e) => e.preventDefault(),
  });
  const x = st.current;
  if (x.k >= nR) return html`<div class="mg-play mg-wait"><${Typing} /></div>`;
  return html`<div class="mg-play frame-play">
    <div class="mg-top"><span class="mono">${x.k + 1}/${nR}</span><span class="mt-fb" aria-live="polite">${x.fb ? `${Math.round(x.fb.v * 100)} % du temps dans le cadre` : 'Garde le sujet dans le cadre'}</span></div>
    <div class="frame-stage" ref=${stage} onPointerDown=${(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* (a pointer the browser does not track) */ } moveTo(e); }} onPointerMove=${(e) => { if (e.buttons || e.pointerType === 'touch') moveTo(e); }}>
      <span class="frame-subj" ref=${subj} aria-hidden="true">${game.subject}</span>
      <span class="frame-win" ref=${frame} style=${`width:${(w * 100).toFixed(2)}%`}></span>
    </div>
    <div class="row frame-btns">
      <button type="button" class="btn btn-ghost" ref=${bL} ...${hold(-1)} aria-label="Cadre à gauche">◀</button>
      <button type="button" class="btn btn-ghost" ref=${bR} ...${hold(1)} aria-label="Cadre à droite">▶</button>
    </div>
  </div>`;
}
// The new rounds, on screen (the shoot and the edit dispatch here).
function ArcadeGame({ game, onDone, now, run, keep }) {
  if (game.kind === 'chat') return html`<${ChatGame} game=${game} onDone=${onDone} run=${run} keep=${keep} />`;
  if (game.kind === 'mixage') return html`<${MixGame} game=${game} onDone=${onDone} run=${run} keep=${keep} />`;
  return html`<${FrameGame} game=${game} onDone=${onDone} run=${run} keep=${keep} />`;
}
const ARCADE_KINDS = ['chat', 'mixage', 'cadrage']; // (0.27.4: the grading is gone: far too hard)
