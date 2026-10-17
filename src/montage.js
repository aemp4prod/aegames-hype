/* =========================================================
   The studio after the shoot (0.14): the edit and the thumbnail, two short games before a video goes out.
   - The edit: cut on the beat (or sort the rushes, when the shoot already was a rhythm game). An editor on the team does
     it for the player. A careful edit lifts the video, a sloppy one drags it down: the shoot's score moves by up to
     ±15 points (a good edit can save a so-so shoot, the way it does for real).
   - The thumbnail (long videos): put one together (a background, a face, a few words, a detail) or draw it. A designer
     on the team does it. In the ChatGPT app, with no daily limit, the AI can turn the sketch into a real thumbnail.
   Nothing here calls the AI, but the last one (and only when the player asks).
   ========================================================= */
const EDIT_SWING = 0.3; // a perfect edit: +15 points on the shoot's score; a botched one: −15
const needsEdit = (r) => !!r && r.what !== 'live';
const needsThumb = (r) => !!r && r.what === 'vidéo';
const EDIT_INTRO = {
  vidéo: 'Au montage, chaque coupe pile dans le temps fort rend ta vidéo plus nerveuse. Un montage soigné rattrape un tournage moyen ; un montage bâclé gâche un bon tournage.',
  short: 'Un format court, c’est du rythme : coupe pile au bon moment, sinon on scrolle.',
  clip: 'Le clip vit sur le beat : chaque coupe doit tomber pile dessus.',
  podcast: 'Au mixage, chaque coupe doit tomber dans le blanc : une bourde qui reste, et ça s’entend.',
};
const RUSHES = {
  vidéo: { good: ['Le moment fort, en gros plan', 'L’explication face caméra', 'Le plan large qui pose le décor', 'La réaction à chaud', 'La chute, au bon moment', 'Le détail qui fait rire', 'La conclusion qui donne envie de revenir'],
    bad: ['Un plan flou de 12 secondes', 'Le micro qui sature', 'Tu cherches tes clés hors champ (40 s)', 'Une blague qui tombe à plat', 'Le même plan, en double', 'Un long silence gênant', 'Le moment où tu oublies ton texte'] },
  short: { good: ['Les 2 premières secondes qui accrochent', 'Le geste qui fait tout', 'La réaction en gros plan', 'La chute', 'Le plan qui boucle avec le début'],
    bad: ['Un « salut tout le monde » de 6 secondes', 'Un plan flou', 'Le temps mort avant la chute', 'Le même plan, en double', 'Le moment où tu ris toute seule hors champ'] },
  clip: { good: ['Le refrain, plan serré', 'Le plan large sur le décor', 'Le pas de danse', 'Le regard caméra', 'La dernière note'],
    bad: ['Un plan décalé du beat', 'Un plan flou', 'Le figurant qui regarde la caméra', 'Le reflet de l’équipe dans la vitre', 'Le même plan, en double'] },
  podcast: { good: ['La meilleure anecdote', 'La question qui relance', 'L’intro qui accroche', 'Le fou rire', 'La conclusion'],
    bad: ['Le micro qui grésille', 'Trois minutes hors sujet', 'Un silence de 15 secondes', 'La toux en plein milieu', 'La même histoire, racontée deux fois'] },
};
const RUSH_WHY = { good: 'un bon plan : il reste', bad: 'au montage, ça part' };
// The rushes to sort (when the shoot was the rhythm game already): good takes to keep, failed ones to cut.
function makeRushes(r, D) {
  const R = RUSHES[r.what] || RUSHES.vidéo, ix = diffIx(D);
  const nBad = ix >= 3 ? 3 : 2, nGood = 4 + (ix >= 4 ? 1 : 0);
  const topic = str(r.topic, 40);
  const good = shuffle(R.good.slice()).slice(0, nGood).map((t) => ({ text: t, good: true, why: RUSH_WHY.good }));
  good[0] = { text: `« ${topic} » : le plan qui résume tout`, good: true, why: RUSH_WHY.good };
  const bad = shuffle(R.bad.slice()).slice(0, nBad).map((t) => ({ text: t, good: false, why: RUSH_WHY.bad }));
  return { kind: 'tri', edit: true, title: 'Le dérushage', intro: 'Garde les bons plans, coupe les ratés : une vidéo, c’est d’abord ce qu’on enlève.', items: shuffle(good.concat(bad)), diff: D.id };
}
// 0.20: the machine the edit is made on: a lagging laptop narrows the zones to hit, a good one widens them.
function widenZone(x, w) {
  const c = (x.z0 + x.z1) / 2, half = Math.min(0.2, ((x.z1 - x.z0) / 2) * w);
  const z0 = clamp(c - half, 0.03, 0.97 - 2 * half);
  return { z0: Math.round(z0 * 1000) / 1000, z1: Math.round((z0 + 2 * half) * 1000) / 1000 };
}
function makeEdit(r, g) {
  const D = diffOf((r.played && r.played.diff) || r.diff);
  const E = g ? gearEdit(g, r) : null;
  // 0.25: a rotation, by format: the cut, the rushes, the grading, the reframing, the mix (never the shoot's own game, and
  // not the last edit when there is another one)
  const shot = r.played && r.played.kind;
  let pool = (EDIT_FOR[r.what] || EDIT_FOR.vidéo).filter((k) => k !== shot && !(shot === 'montage' && k === 'montage'));
  if (g && pool.length > 1) pool = pool.filter((k) => k !== g.editLast);
  const kind = S.editForce || pick(pool) || 'montage';
  if (g) g.editLast = kind;
  if (kind === 'tri') return Object.assign(makeRushes(r, D), { timeK: E ? E.time : 1 });
  if (kind !== 'montage' && ROUND_MAKERS[kind]) { // the machine helps here too: a good one gives some room
    const m = ROUND_MAKERS[kind](r, D), w = E ? E.w : 1;
    if (m.band) m.band = Math.min(0.45, m.band * w);
    if (m.w) m.w = Math.min(0.5, m.w * w);
    if (m.tol) m.tol = Math.min(0.8, m.tol * w);
    return Object.assign(m, { edit: true, timeK: E ? E.time : 1 });
  }
  const m = makeMontage(r, D);
  m.items = m.items.slice(0, Math.max(4, m.items.length - 2));
  if (E && E.w !== 1) m.items = m.items.map((x) => widenZone(x, E.w));
  return Object.assign(m, { edit: true, title: r.what === 'podcast' ? 'Le mixage' : 'Le montage', intro: EDIT_INTRO[r.what] || EDIT_INTRO.vidéo, timeK: E ? E.time : 1 });
}
// The edit is done (by the player, quickly, or by the editor): the video's score moves.
function applyEdit(g, r, m, by) {
  if (!r || !r.played || r.edit) return;
  m = clamp(num(m, 0.5), 0, 1);
  const s0 = r.played.score, s1 = clamp(s0 + (m - 0.5) * EDIT_SWING, 0, 1);
  const ed = by === 'staff' ? hasStaff(g, 'monteur') : null;
  r.edit = { m, by: by || 'me', s0, who: ed && g.chars[ed.c] ? g.chars[ed.c].name.split(' ')[0] : '' };
  r.render = null; // 0.20: a new edit, a new render
  r.played.score = s1;
  r.played.tier = tierOf(s1);
  r.editGame = null;
}
function editWord(r) {
  const e = r.edit, d = Math.round((r.played.score - e.s0) * 100);
  const delta = d ? ` (${d > 0 ? '+' : '−'}${Math.abs(d)} ${Math.abs(d) > 1 ? 'points' : 'point'})` : '';
  if (e.by === 'vite') return `Montage bâclé${delta}`;
  if (e.by === 'staff') return `Montage par ${e.who || 'ton équipe'} : ${Math.round(e.m * 100)} %${delta}`;
  return `Ton montage : ${Math.round(e.m * 100)} %${delta}`;
}

/* ---------- the thumbnail ---------- */
const THUMB_BGS = { rouge: '#E53935', jaune: '#FFC21A', nuit: '#1D2142', ciel: '#1E88E5', menthe: '#12B98F', rose: '#EC407A', clair: '#F3EEE4' };
const THUMB_BG_NAMES = { rouge: 'Rouge', jaune: 'Jaune', nuit: 'Nuit', ciel: 'Bleu', menthe: 'Menthe', rose: 'Rose', clair: 'Clair' };
const THUMB_FACES = ['😱', '🤯', '😂', '🥹', '😎', '🤔', '😍', '😤'];
const THUMB_DECOS = [['none', 'Aucun'], ['fleche', 'Une flèche'], ['cercle', 'Un cercle'], ['avap', 'Avant · Après']];
const PRESET_CTR = { choc: 0.3, mystere: 0.18, propre: 0.08 };
const firstWords = (s, n) => String(s || '').replace(/[«»"“”()]/g, ' ').split(/\s+/).filter(Boolean).slice(0, n).join(' ');
function presetLook(k, r, title) {
  const W = WHATS[r.what] || WHATS.vidéo;
  if (k === 'choc') return { bg: 'rouge', emo: '😱', text: firstWords(title || r.topic, 3), deco: 'fleche' };
  if (k === 'mystere') return { bg: 'nuit', emo: '🤔', text: '???', deco: 'cercle' };
  return { bg: 'clair', emo: W.emoji, text: '', deco: 'none' };
}
const sameLook = (a, b) => !!a && !!b && a.bg === b.bg && a.emo === b.emo && (a.text || '') === (b.text || '') && a.deco === b.deco;
// What makes people click, roughly the way it works: a face, a few big words, one detail that draws the eye.
function lookCtr(look) {
  const L = look || {};
  let c = 0.05;
  if (THUMB_FACES.includes(L.emo)) c += 0.06; else if (L.emo) c += 0.03;
  const words = String(L.text || '').trim().split(/\s+/).filter(Boolean).length;
  if (words >= 1 && words <= 4) c += 0.07; else if (words > 4 && words <= 6) c += 0.02; else if (words > 6) c -= 0.03;
  if (L.deco === 'fleche' || L.deco === 'cercle') c += 0.04;
  if (L.deco === 'avap') c += 0.05;
  if (L.bg === 'rouge' || L.bg === 'jaune') c += 0.02;
  if (lookChoc(L)) c += 0.06; // shocking works… until the video does not deliver
  return Math.round(clamp(c, 0, 0.32) * 100) / 100;
}
const lookChoc = (L) => !!L && ['😱', '🤯'].includes(L.emo) && !!String(L.text || '').trim() && (L.deco === 'fleche' || L.deco === 'cercle');
// A hand-drawn one: its charm, and how much of it there is.
const drawnCtr = (sk) => Math.round(clamp(0.06 + 0.1 * Math.min(1, ((sk && sk.cover) || 0) / 0.3) + 0.02 * Math.min(3, Math.max(0, ((sk && sk.colors) || 1) - 1)), 0, 0.22) * 100) / 100;
const AI_THUMB_CTR = 0.26;
function staffThumb(g, r) {
  const m = hasStaff(g, 'miniature'), who = m && g.chars[m.c] ? g.chars[m.c].name.split(' ')[0] : '';
  const look = { bg: pick(['jaune', 'rouge', 'ciel', 'rose']), emo: pick(THUMB_FACES.slice(0, 6)), text: firstWords(r.topic, 3), deco: pick(['fleche', 'cercle', 'none']) };
  return { kind: 'staff', look, ctr: Math.min(lookCtr(look), 0.2), choc: false, who }; // their own bonus comes on top (staffMult)
}
const thumbWord = (t) => (t.kind === 'staff' ? `Faite par ${t.who || 'ton graphiste'}` : t.kind === 'ai' ? 'Ton croquis, finalisé par l’IA' : t.kind === 'drawn' ? 'Dessinée à la main' : t.preset ? THUMBS[t.preset].label : 'Ta composition');
// A thumbnail on screen: a composition, or a picture (drawn, or made by the AI).
function ThumbArt({ look, img, small, label }) {
  if (img) {
    const src = mediaSrc(img);
    return html`<span class=${'th-art' + (small ? ' sm' : '')} role="img" aria-label=${label || 'Miniature'}>${src ? html`<img src=${src} alt="" />` : null}</span>`;
  }
  const L = look || {}, txt = String(L.text || '').trim();
  const fs = txt.length <= 8 ? 13 : txt.length <= 14 ? 10 : txt.length <= 20 ? 8.5 : 7;
  return html`<span class=${'th-art' + (small ? ' sm' : '') + (L.deco === 'avap' ? ' avap' : '')} style=${'--tb:' + (THUMB_BGS[L.bg] || THUMB_BGS.clair)} role="img" aria-label=${label || 'Miniature'}>
    ${L.deco === 'avap' ? html`<span class="th-av">AVANT</span><span class="th-ap">APRÈS</span>` : null}
    ${L.emo ? html`<span class="th-emo">${L.emo}</span>` : null}
    ${L.deco === 'cercle' ? html`<span class="th-ring"></span>` : null}
    ${L.deco === 'fleche' ? html`<svg class="th-arrow" viewBox="0 0 100 60" aria-hidden="true"><path d="M6 30 H72 M54 10 L80 30 L54 50" /></svg>` : null}
    ${txt ? html`<b class="th-text" style=${'font-size:' + fs + 'cqw'}>${txt.toUpperCase()}</b>` : null}
  </span>`;
}

/* ---------- drawing it by hand ---------- */
const SKETCH_W = 640, SKETCH_H = 360;
const ctx2d = (c) => c.getContext('2d', { willReadFrequently: true }); // the drawing is read back to weigh it
const SKETCH_COLORS = ['#111111', '#FFFFFF', '#E53935', '#FFC21A', '#1E88E5', '#12B98F', '#EC407A', '#8E44AD'];
function drawStroke(x, s) {
  x.strokeStyle = s.color; x.fillStyle = s.color; x.lineWidth = s.size; x.lineCap = 'round'; x.lineJoin = 'round';
  if (s.pts.length === 1) { x.beginPath(); x.arc(s.pts[0][0], s.pts[0][1], s.size / 2, 0, Math.PI * 2); x.fill(); return; }
  x.beginPath();
  x.moveTo(s.pts[0][0], s.pts[0][1]);
  for (const p of s.pts.slice(1)) x.lineTo(p[0], p[1]);
  x.stroke();
}
function SketchPad({ onChange }) {
  const cv = useRef(null), st = useRef({ strokes: [], cur: null, bg: '#F3EEE4' });
  const [color, setColor] = useState('#111111');
  const [size, setSize] = useState(10);
  const [, setN] = useState(0);
  const redraw = () => {
    const c = cv.current;
    if (!c) return;
    const x = ctx2d(c);
    x.fillStyle = st.current.bg;
    x.fillRect(0, 0, SKETCH_W, SKETCH_H);
    for (const s of st.current.strokes) drawStroke(x, s);
  };
  // what there is to see: how much of it is drawn, with how many colors (sampled)
  const snap = () => {
    const c = cv.current;
    if (!c) return null;
    const d = ctx2d(c).getImageData(0, 0, SKETCH_W, SKETCH_H).data;
    const bg = st.current.bg, br = parseInt(bg.slice(1, 3), 16), bgG = parseInt(bg.slice(3, 5), 16), bb = parseInt(bg.slice(5, 7), 16);
    let ink = 0, n = 0;
    for (let k = 0; k < d.length; k += 4 * 37) { n++; if (Math.abs(d[k] - br) + Math.abs(d[k + 1] - bgG) + Math.abs(d[k + 2] - bb) > 60) ink++; }
    const colors = new Set(st.current.strokes.map((s) => s.color).concat(bg !== '#F3EEE4' ? [bg] : [])).size;
    return { url: c.toDataURL('image/jpeg', 0.82), cover: n ? ink / n : 0, colors, strokes: st.current.strokes.length };
  };
  const tell = () => { setN(st.current.strokes.length); if (onChange) onChange(st.current.strokes.length || st.current.bg !== '#F3EEE4' ? snap() : null); };
  useEffect(() => { redraw(); }, []);
  const pt = (e) => { const c = cv.current, b = c.getBoundingClientRect(); return [Math.round(((e.clientX - b.left) / b.width) * SKETCH_W), Math.round(((e.clientY - b.top) / b.height) * SKETCH_H)]; };
  const down = (e) => { e.preventDefault(); try { cv.current.setPointerCapture(e.pointerId); } catch (err) { /* a synthetic event */ } const s = { color, size, pts: [pt(e)] }; st.current.cur = s; st.current.strokes.push(s); redraw(); };
  const move = (e) => {
    const s = st.current.cur;
    if (!s) return;
    const p = pt(e), q = s.pts[s.pts.length - 1];
    if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) < 2) return;
    s.pts.push(p);
    const x = ctx2d(cv.current);
    drawStroke(x, { color: s.color, size: s.size, pts: [q, p] });
  };
  const up = () => { if (st.current.cur) { st.current.cur = null; tell(); } };
  const undo = () => { st.current.strokes.pop(); redraw(); tell(); };
  const clear = () => { st.current.strokes = []; st.current.bg = '#F3EEE4'; redraw(); tell(); };
  const fill = () => { st.current.bg = color; st.current.strokes = st.current.strokes.filter((s) => s.color !== color); redraw(); tell(); };
  return html`<div class="sketch">
    <canvas ref=${cv} width=${SKETCH_W} height=${SKETCH_H} class="sketch-cv" aria-label="Ta miniature, à dessiner au doigt ou à la souris"
      onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${up} onPointerLeave=${up}></canvas>
    <div class="sketch-tools" role="toolbar" aria-label="Outils de dessin">
      ${SKETCH_COLORS.map((k) => html`<button key=${k} type="button" class=${'sk-color' + (color === k ? ' on' : '')} style=${'--c:' + k} aria-label=${'Couleur ' + k} aria-pressed=${color === k ? 'true' : 'false'} onClick=${() => setColor(k)}></button>`)}
      <button type="button" class=${'chip-btn' + (size === 10 ? ' on' : '')} onClick=${() => setSize(10)}>Fin</button>
      <button type="button" class=${'chip-btn' + (size === 26 ? ' on' : '')} onClick=${() => setSize(26)}>Épais</button>
    </div>
    <div class="sketch-tools">
      <button type="button" class="chip-btn" onClick=${fill}>🪣 Fond de cette couleur</button>
      <button type="button" class="chip-btn" onClick=${undo} disabled=${!st.current.strokes.length}>↩︎ Annuler</button>
      <button type="button" class="chip-btn" onClick=${clear}>Tout effacer</button>
    </div>
  </div>`;
}
// The ChatGPT app, with no daily limit: the AI turns the sketch into a finished thumbnail (≤ 30 s, or the sketch stays).
const canAiThumb = (g) => !!(HOST && typeof HOST.aiImage === 'function' && budgetOf(g).daily === 0 && !g.noAiImage);
const AI_THUMB_MS = 35000;
async function aiThumb(g, r, sketchUrl, title) {
  const id = uid('img');
  const prompt = [`Miniature de vidéo (format paysage 16:9) pour une vidéo intitulée « ${str(title || r.topic, 100)} » (sujet : ${str(r.topic, 120)}).`,
    'Transforme ce croquis en une vraie miniature, finie et professionnelle, en gardant sa composition, ses couleurs et ses éléments : couleurs vives et contrastées, lisible en tout petit, un gros texte court s’il y en a un sur le croquis.',
    'Personnages fictifs uniquement : aucune personne réelle reconnaissable, aucun logo, aucune marque. Rien de choquant, rien de sexuel.'].join(' ');
  let timer = null;
  const late = new Promise((res) => { timer = setTimeout(() => res({ ok: false, error: { code: 'timeout' } }), AI_THUMB_MS); });
  let res;
  try { res = await Promise.race([HOST.aiImage({ id, prompt, sketch: sketchUrl }), late]); }
  catch (e) { res = { ok: false, error: e }; }
  clearTimeout(timer);
  if (res && res.ok && typeof res.dataUrl === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(res.dataUrl)) return res.dataUrl;
  if (res && res.error && res.error.code === 'timeout' && typeof HOST.aiCancel === 'function') HOST.aiCancel(id);
  const code = (res && res.error && res.error.code) || 'unexpected';
  if (code === 'image_unsupported') g.noAiImage = true; // not with this connection: never asked again in this game
  throw { code };
}
// A picture (drawn, or the AI's) kept on the device like the player's photos.
async function keepThumbImage(g, url) {
  const id = uid('th');
  if (!(await mediaPut(id, url))) return null;
  g.media = (g.media || []).concat(id);
  return id;
}

/* ---------- the steps, between the shoot and the upload screen ---------- */
function EditStep({ g, r, now }) {
  const [game] = useState(() => r.editGame || (r.editGame = makeEdit(r, g)));
  const [phase, setPhase] = useState(() => (game.run && game.run.on ? 'play' : 'intro'));
  const keep = (part, soon) => mgKeep(game, part, soon);
  const onDone = (m) => { applyEdit(g, r, m, 'me'); scheduleSave(); update(); };
  if (phase === 'intro') {
    return html`<div class="mg-intro studio-step edit-step">
      <span class="eyebrow">Le montage</span>
      <h3>${game.title}</h3>
      <p>${game.intro}</p>
      ${r.crashes ? html`<p class="date-late"><${Icon} n="wrench" s=${15} /> Ton dernier montage a été perdu dans un plantage : à refaire.</p>` : null}
      <p class="muted">${game.kind === 'tri' ? 'Garde ou coupe chaque plan, avant la fin du chrono.' : game.rule || `Touche « ${game.verb || 'Couper'} » quand le curseur passe dans la zone : ${game.items.length} coupes.`} Ton score de montage fait bouger celui de ${laW(r)} (jusqu’à 15 points, dans un sens ou dans l’autre).</p>
      <div class="row ss-actions">
        <button class="btn btn-hot" onClick=${() => { mgKeep(game, { on: Date.now() }); setPhase('play'); }}><${Icon} n="scissors" s=${16} /> Monter</button>
        <button class="btn btn-ghost" onClick=${() => { applyEdit(g, r, 0.3, 'vite'); scheduleSave(); update(); }}>Monter vite, sans soin</button>
      </div>
    </div>`;
  }
  if (game.kind === 'tri') return html`<${TriGame} items=${game.items} onDone=${onDone} now=${now} total=${Math.round(mgTime('tri', game.items.length, diffOf(game.diff)) * (game.timeK || 1))} hints=${0} run=${game.run || null} keep=${keep} />`;
  if (ARCADE_KINDS.includes(game.kind)) return html`<${ArcadeGame} game=${game} onDone=${onDone} now=${now} run=${game.run || null} keep=${keep} />`; // 0.25
  return html`<${MontageGame} game=${game} onDone=${onDone} run=${game.run || null} keep=${keep} />`;
}
function ThumbStep({ g, r, onDone }) {
  const W = WHATS[r.what] || WHATS.vidéo;
  const [tab, setTab] = useState('compose');
  const [look, setLook] = useState(() => presetLook('propre', r));
  const [sketch, setSketch] = useState(null);
  const [ai, setAi] = useState(null); // { busy } | { url } | { err }
  const preset = Object.keys(PRESET_CTR).find((k) => sameLook(look, presetLook(k, r))) || null;
  const ctr = preset ? PRESET_CTR[preset] : lookCtr(look), choc = preset ? preset === 'choc' : lookChoc(look);
  const set = (k, v) => setLook(Object.assign({}, look, { [k]: v }));
  const words = [...new Set([firstWords(r.topic, 2), firstWords(r.topic, 3), 'JE TESTE', 'ÇA A MAL TOURNÉ', '???', 'INCROYABLE'].map((x) => x.toUpperCase()).filter(Boolean))].slice(0, 6);
  const done = (t) => { r.thumb = t; if (onDone) onDone(t); scheduleSave(); update(); }; // (0.23: a thumbnail made for someone else)
  const useCompose = () => done({ kind: 'compose', preset, look, ctr, choc });
  const useSketch = async () => {
    if (!sketch) return;
    const id = await keepThumbImage(g, sketch.url);
    if (!id) { toast('Impossible de garder ton dessin sur cet appareil : prends une composition.', 'bad'); return; }
    done({ kind: 'drawn', img: id, ctr: drawnCtr(sketch), choc: false });
  };
  const finishAi = async () => {
    if (!sketch || (ai && ai.busy)) return;
    setAi({ busy: true, at: Date.now() });
    try {
      const url = await aiThumb(g, r, sketch.url, r.topic);
      const id = await keepThumbImage(g, url);
      if (!id) throw { code: 'storage' };
      setAi(null);
      done({ kind: 'ai', img: id, ctr: AI_THUMB_CTR, choc: false });
    } catch (e) {
      const why = e && e.code === 'timeout' ? 'L’IA a mis trop de temps' : e && e.code === 'image_unsupported' ? 'Ta connexion ChatGPT ne permet pas de créer des images' : 'L’IA n’a pas pu la faire';
      setAi({ err: `${why} : ton dessin servira de miniature.` });
    }
  };
  return html`<div class="studio-step thumb-step">
    <span class="eyebrow">La miniature</span>
    <div class="th-preview">${tab === 'draw' ? null : html`<${ThumbArt} look=${look} label=${'Aperçu de ta miniature'} />`}</div>
    <div class="seg" role="tablist" aria-label="Comment la faire">
      <button type="button" role="tab" aria-selected=${tab === 'compose' ? 'true' : 'false'} class=${tab === 'compose' ? 'on' : ''} onClick=${() => setTab('compose')}>Composer</button>
      <button type="button" role="tab" aria-selected=${tab === 'draw' ? 'true' : 'false'} class=${tab === 'draw' ? 'on' : ''} onClick=${() => setTab('draw')}>Dessiner</button>
    </div>
    ${tab === 'compose' ? html`<div class="th-compose">
      <div class="field"><span class="lbl">Modèles</span><div class="thumb-pick">${Object.keys(PRESET_CTR).map((k) => html`<button type="button" key=${k} class=${'thumb-opt' + (preset === k ? ' on' : '')} onClick=${() => setLook(presetLook(k, r))}><${ThumbArt} look=${presetLook(k, r)} small=${true} /><b>${THUMBS[k].label}</b><small>+${Math.round(PRESET_CTR[k] * 100)} % de clics${THUMBS[k].risk ? ' · si c’est raté, « putaclic »' : ''}</small></button>`)}</div></div>
      <div class="field"><span class="lbl">Le fond</span><div class="th-swatches">${Object.keys(THUMB_BGS).map((k) => html`<button key=${k} type="button" class=${'th-sw' + (look.bg === k ? ' on' : '')} style=${'--c:' + THUMB_BGS[k]} aria-label=${THUMB_BG_NAMES[k]} aria-pressed=${look.bg === k ? 'true' : 'false'} onClick=${() => set('bg', k)}></button>`)}</div></div>
      <div class="field"><span class="lbl">La tête</span><div class="tr-chips">${[W.emoji, ...THUMB_FACES].map((x) => html`<button key=${x} type="button" class=${'chip-btn th-face' + (look.emo === x ? ' on' : '')} onClick=${() => set('emo', x)}>${x}</button>`)}</div></div>
      <div class="field"><label class="lbl" for="th-text">Le texte</label>
        <input id="th-text" class="input" maxlength="28" value=${look.text} onInput=${(ev) => set('text', ev.target.value)} placeholder="2 à 4 mots, en gros" />
        <div class="tr-chips">${words.map((w) => html`<button key=${w} type="button" class="chip-btn" onClick=${() => set('text', w)}>${w}</button>`)}<button type="button" class="chip-btn" onClick=${() => set('text', '')}>Sans texte</button></div></div>
      <div class="field"><span class="lbl">Le détail</span><div class="tr-chips">${THUMB_DECOS.map(([k, l]) => html`<button key=${k} type="button" class=${'chip-btn' + (look.deco === k ? ' on' : '')} onClick=${() => set('deco', k)}>${l}</button>`)}</div></div>
      <p class="th-est"><b>≈ +${Math.round(ctr * 100)} % de clics</b>${choc ? ' · accrocheur… mais si ta vidéo est ratée, on criera au putaclic' : ''}</p>
      <button class="btn btn-hot th-ok" onClick=${useCompose}><${Icon} n="check" s=${16} /> Valider la miniature</button>
    </div>` : html`<div class="th-draw">
      <${SketchPad} onChange=${setSketch} />
      ${ai && ai.err ? html`<p class="notice"><span>${ai.err}</span></p>` : null}
      ${sketch ? html`<p class="th-est"><b>≈ +${Math.round(drawnCtr(sketch) * 100)} % de clics</b> · fait main${canAiThumb(g) && !(ai && ai.err) ? ` · finalisée par l’IA : ≈ +${Math.round(AI_THUMB_CTR * 100)} %` : ''}</p>` : html`<p class="muted">Dessine au doigt ou à la souris : un visage, un objet, un gros mot-clé… Pas besoin d’être doué.</p>`}
      <div class="row ss-actions">
        <button class="btn btn-hot th-ok" onClick=${useSketch} disabled=${!sketch || (ai && ai.busy)}><${Icon} n="check" s=${16} /> Utiliser mon dessin</button>
        ${canAiThumb(g) && !(ai && ai.err) ? html`<button class="btn btn-ghost th-ai" onClick=${finishAi} disabled=${!sketch || (ai && ai.busy)}>${ai && ai.busy ? html`<${Typing} /> L’IA dessine… (30 s au plus)` : '✨ L’IA la finalise'}</button>` : null}
      </div>
    </div>`}
  </div>`;
}
// 0.20: the render, after the edit: a short wait (longer on a cheap machine), and the software may crash. Lost, the edit is
// to be made again (the pro software's auto-save keeps it). Made by the editor on the team: on their own machine.
function needsRender(g, r) {
  if (!needsEdit(r) || !r.edit || r.edit.by === 'staff' || r.render) return false;
  const E = gearEdit(g, r);
  return E.ms > 0 || E.crash > 0;
}
function RenderStep({ g, r }) {
  const [E] = useState(() => gearEdit(g, r));
  const [p, setP] = useState(0);
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done || r.render || !r.edit) return;
      done = true;
      if (Math.random() >= E.crash) r.render = { ok: true, at: Date.now() };
      else if (E.save) { r.render = { ok: true, saved: true, at: Date.now() }; toast('Le logiciel a planté pendant le rendu… la sauvegarde auto a tout récupéré.', 'flash'); }
      else { // the edit is lost: back to the shoot's own score
        r.played.score = r.edit.s0;
        r.played.tier = tierOf(r.edit.s0);
        r.edit = null;
        r.editGame = null;
        r.crashes = (r.crashes || 0) + 1;
        toast(`Plantage ! Le logiciel a crashé pendant le rendu : ton montage est perdu.${E.on === 'pc' ? ' Un meilleur ordinateur (ou le logiciel pro) t’éviterait ça.' : ''}`, 'bad');
      }
      scheduleSave();
      update();
    };
    const t0 = Date.now();
    const id = setInterval(() => { const x = Math.min(1, (Date.now() - t0) / Math.max(1, E.ms)); setP(x); if (x >= 1) { clearInterval(id); finish(); } }, 120);
    return () => clearInterval(id);
  }, [r.id]);
  return html`<div class="studio-step render-step">
    <span class="eyebrow">Le rendu</span>
    <p>${E.on === 'phone' ? 'Ton téléphone exporte la vidéo…' : 'Ton ordinateur calcule la vidéo…'}${E.ms >= 4000 ? ' Il rame un peu.' : ''}</p>
    <div class="render-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(p * 100)}><i style=${'width:' + Math.round(p * 100) + '%'}></i></div>
    <small class="muted">${Math.round(p * 100)} %</small>
  </div>`;
}
// Where a release stands after its shoot: the edit, the render, the thumbnail, then the upload screen.
function StudioSteps({ g, r, now }) {
  const step = needsEdit(r) && !r.edit ? 'edit' : needsRender(g, r) ? 'render' : needsThumb(r) && !r.thumb ? 'thumb' : 'publish';
  const stages = [['shoot', 'Tournage', true], needsEdit(r) ? ['edit', 'Montage', !!r.edit] : null, needsThumb(r) ? ['thumb', 'Miniature', !!r.thumb] : null, ['publish', 'Publication', false]].filter(Boolean);
  return html`<div class="studio-steps">
    <ol class="ss-dots" aria-label="Les étapes avant la sortie">${stages.map(([k, l, ok]) => html`<li key=${k} class=${ok ? 'ok' : k === step ? 'on' : ''} aria-current=${k === step ? 'step' : null}>${ok ? '✓ ' : ''}${l}</li>`)}</ol>
    ${r.edit ? html`<p class="ss-edit">✂️ ${editWord(r)}</p>` : null}
    ${step === 'edit' ? html`<${EditStep} key=${'ed' + r.id + ':' + (r.crashes || 0)} g=${g} r=${r} now=${now} />` : step === 'render' ? html`<${RenderStep} key=${'rd' + r.id + ':' + (r.crashes || 0)} g=${g} r=${r} />` : step === 'thumb' ? html`<${ThumbStep} key=${'th' + r.id} g=${g} r=${r} />` : html`<${PublishForm} key=${'up' + r.id} g=${g} r=${r} now=${now} />`}
  </div>`;
}
// Right after the shoot: the team does its part (the editor edits, the designer makes the thumbnail).
function afterShoot(g, r) {
  if (!g || !r || !r.played) return;
  r.edit = null;
  r.editGame = null;
  r.render = null;
  const crew = r.crew || [];
  if (needsEdit(r) && crew.includes('monteur')) applyEdit(g, r, clamp(0.5 + 0.1 * staffPower(g, 'monteur') + rand(-0.05, 0.05), 0, 1), 'staff');
  if (needsThumb(r) && crew.includes('miniature') && !r.thumb) r.thumb = staffThumb(g, r);
}
