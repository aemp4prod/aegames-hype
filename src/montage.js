/* =========================================================
   The studio after the shoot (0.14): the edit and the thumbnail, two short games before a video goes out.
   - The edit: cut on the beat (or sort the rushes, when the shoot already was a rhythm game). An editor on the team does
     it for the player. A careful edit lifts the video, a sloppy one drags it down: the shoot's score moves by up to
     ±15 points (a good edit can save a so-so shoot, the way it does for real).
   - The thumbnail (long videos): put one together (a background, a face, a few words, a detail), draw it, or (0.31.1)
     make it of the player's own images (a short gets an optional cover that way, when it goes out). A designer
     on the team does it. In the ChatGPT app, with no daily limit, the AI can turn the sketch into a real thumbnail.
   Nothing here calls the AI, but the last one (and only when the player asks).
   ========================================================= */
const EDIT_SWING = 0.3; // a perfect edit: +15 points on the shoot's score; a botched one: −15
const swingOf = (r) => (r && r.big ? BIG_EDIT : EDIT_SWING); // 0.30.1: a big production's post-production: ±20
const needsEdit = (r) => !!r && r.what !== 'live';
const needsThumb = (r) => !!r && r.what === 'vidéo';
const EDIT_INTRO = {
  vidéo: 'Au montage, chaque coupe pile dans le temps fort rend ta vidéo plus nerveuse. Un montage soigné rattrape un tournage moyen ; un montage bâclé gâche un bon tournage.',
  short: 'Un format court, c’est du rythme : plus tes coupes tombent pile, plus on reste jusqu’au bout.',
  clip: 'Le clip vit sur le beat : plus tes coupes tombent dessus, mieux il sonne.',
  podcast: 'Coupe pile dans les blancs : plus tu en attrapes, plus l’épisode est fluide.',
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
  const nBad = ix >= 2 ? 3 : 2, nGood = 4 + (ix >= 3 ? 1 : 0); // (0.27.9: a notch harder, as DIFFS)
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
  // 0.25: a rotation, by format: the cut, the rushes, the reframing, the mix (0.27.4: no more grading) (never the shoot's own game, and
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
    return Object.assign(m, { edit: true, timeK: E ? E.time : 1 });
  }
  const m = makeMontage(r, D);
  m.items = m.items.slice(0, Math.max(4, m.items.length - 2));
  if (E && E.w !== 1) m.items = m.items.map((x) => widenZone(x, E.w));
  return Object.assign(m, { edit: true, title: r.what === 'podcast' ? 'La chasse aux blancs' : 'Le montage', intro: EDIT_INTRO[r.what] || EDIT_INTRO.vidéo, timeK: E ? E.time : 1 }); // (0.27.8: « Le mixage » is another game)
}
// The edit is done (by the player, quickly, or by the editor): the video's score moves.
function applyEdit(g, r, m, by) {
  if (!r || !r.played || r.edit) return;
  m = clamp(num(m, 0.5), 0, 1);
  const s0 = r.played.score, s1 = clamp(s0 + (m - 0.5) * swingOf(r), 0, 1);
  const ed = by === 'staff' ? hasStaff(g, 'monteur') : null;
  r.edit = { m, by: by || 'me', s0, who: ed && g.chars[ed.c] ? firstName(g.chars[ed.c]) : '' };
  r.render = null; // 0.20: a new edit, a new render
  r.played.score = s1;
  r.played.tier = tierOf(s1);
  r.editGame = null;
  if (r.big) bigPostDone(g, r); // 0.30.1: a production's post-production done: its time goes by
}
// 0.28.1: the team's edit is the default; the player may still make their own (from the shoot's own score), or take
// the team's back.
function selfEdit(g, r) {
  const e = r && r.edit;
  if (!e || e.by !== 'staff' || !r.played) return false;
  r.staffEdit = e;
  r.played.score = e.s0;
  r.played.tier = tierOf(e.s0);
  r.edit = null;
  r.editGame = null;
  r.render = null;
  return true;
}
function staffEditBack(g, r) {
  const e = r && r.staffEdit;
  if (!e || r.edit || !r.played) return false;
  applyEdit(g, r, e.m, 'staff');
  if (r.edit) r.edit.who = e.who || r.edit.who;
  return true;
}
function editWord(r) {
  const e = r.edit, d = Math.round((r.played.score - e.s0) * 100);
  const delta = d ? ` (${d > 0 ? '+' : '−'}${Math.abs(d)} ${Math.abs(d) > 1 ? 'points' : 'point'})` : '';
  if (e.by === 'vite') return `Montage bâclé${delta}`;
  if (e.by === 'staff') return `Montage par ${e.who || 'ton équipe'} : ${Math.round(e.m * 100)} %${delta}`;
  return `Ton montage : ${Math.round(e.m * 100)} %${delta}`;
}

/* ---------- the thumbnail ---------- */
const THUMB_BGS = { rouge: '#E53935', jaune: '#FFC21A', nuit: '#1D2142', ciel: '#1E88E5', menthe: '#12B98F', rose: '#EC407A', clair: '#F3EEE4' };
const THUMB_BG_NAMES = { rouge: 'Rouge', jaune: 'Jaune', nuit: 'Nuit', ciel: 'Bleu', menthe: 'Menthe', rose: 'Rose', clair: 'Clair' };
const THUMB_FACES = ['😱', '🤯', '😂', '🥹', '😎', '🤔', '😍', '😤'];
const THUMB_DECOS = [['none', 'Aucun'], ['fleche', 'Une flèche'], ['cercle', 'Un cercle'], ['avap', 'Avant · Après']];
const PRESET_CTR = { choc: 0.3, mystere: 0.18, propre: 0.08 };
const firstWords = (s, n) => String(s || '').replace(/[«»"“”()]/g, ' ').split(/\s+/).filter(Boolean).slice(0, n).join(' ');
// 0.28.1: the words of a topic that say what it is about, for a thumbnail (« jeu de société magique », not « je teste
// un »): the one who speaks and their verb go (« je teste », « j’ai testé »), the little words at both ends too.
const TH_SUBJ = new Set(['je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles']);
const TH_OBJ = new Set(['me', 'te', 'se', 'le', 'la', 'les', 'lui', 'leur', 'vous', 'nous', 'y', 'en']);
const TH_SMALL = new Set(['un', 'une', 'des', 'le', 'la', 'les', 'de', 'du', 'au', 'aux', 'a', 'à', 'en', 'et', 'ou', 'pour', 'avec', 'sur', 'dans', 'par', 'chez', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'notre', 'nos', 'votre', 'vos', 'leur', 'leurs', 'ce', 'cet', 'cette', 'ces', 'qui', 'que', 'quand', 'mais', 'ne', 'pas']);
function thumbWords(s, n = 4) {
  let w = String(s || '').replace(/[«»"“”()!?.,;:…]/g, ' ').split(/\s+/).filter(Boolean);
  const low = (x) => x.toLowerCase(), small = (x) => TH_SMALL.has(low(x));
  if (w.length > 2) {
    let i = 0;
    const el = /^j['’](.+)$/i.exec(w[0]);
    if (TH_SUBJ.has(low(w[0]))) { i = 1; while (i < w.length - 1 && (TH_OBJ.has(low(w[i])) || /^[mtsl]['’]/i.test(w[i]))) i++; i++; } // je (vous) montre…
    else if (el) i = low(el[1]) === 'ai' ? 2 : 1; // j’adore…, j’ai testé…
    if (i < w.length) w = w.slice(i);
  }
  while (w.length > 1 && small(w[0])) w.shift();
  if (w.length && /^[ldjqmts]['’]./i.test(w[0])) w[0] = w[0].replace(/^[ldjqmts]['’]/i, ''); // (l’ascension → ascension)
  w = w.slice(0, n);
  const tail = () => { while (w.length > 1 && small(w[w.length - 1])) w.pop(); };
  tail();
  while (w.length > 1 && w.join(' ').length > 24) { w.pop(); tail(); }
  return w.join(' ') || firstWords(s, 3);
}
function presetLook(k, r, title) {
  const W = WHATS[r.what] || WHATS.vidéo;
  if (k === 'choc') return { bg: 'rouge', emo: '😱', text: thumbWords(title || r.topic, 3), deco: 'fleche' };
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
  const m = hasStaff(g, 'miniature'), who = m && g.chars[m.c] ? firstName(g.chars[m.c]) : '';
  const look = { bg: pick(['jaune', 'rouge', 'ciel', 'rose']), emo: pick(THUMB_FACES.slice(0, 6)), text: thumbWords(r.topic), deco: pick(['fleche', 'cercle', 'none']) };
  return { kind: 'staff', look, ctr: Math.min(lookCtr(look), 0.2), choc: false, who }; // their own bonus comes on top (staffMult)
}
const thumbWord = (t) => (t.kind === 'staff' ? `Faite par ${t.who || 'ton graphiste'}` : t.kind === 'ai' ? 'Ton croquis, finalisé par l’IA' : t.kind === 'drawn' ? 'Dessinée à la main' : t.kind === 'photos' ? 'Tes images' : t.preset ? THUMBS[t.preset].label : 'Ta composition');
// A thumbnail on screen: a composition, or a picture (drawn, or made by the AI).
function ThumbArt({ look, img, small, label, vert }) {
  if (img) {
    const src = mediaSrc(img);
    return html`<span class=${'th-art' + (small ? ' sm' : '') + (vert ? ' vert' : '')} role="img" aria-label=${label || 'Miniature'}>${src ? html`<img src=${src} alt="" />` : null}</span>`;
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

/* ---------- 0.31.1: a thumbnail (or a short's cover) made of the player's own images ----------
   Up to six images of the device, placed by a layout (full frame, side by side, a trio, a grid) or freely (moved,
   resized, one over another), each one reframed (dragged) and zoomed, and a big word at the top or the bottom. The
   preview IS the picture: the same drawing on a canvas, then kept on the device like a drawn one. Nothing goes to the AI. */
const TI_MAX = 6;
const TI_LAYOUTS = [['plein', 'Plein cadre'], ['duo', 'Côte à côte'], ['trio', 'Trio'], ['grille', 'Grille'], ['libre', 'Libre']];
const TI_SIZE = { wide: [1280, 720], vert: [720, 1280] };
const TI_GAP = 0.006; // (a thin line between the cells)
// The cells of a layout for n images (fractions of the frame: x, y, w, h); a vertical cover stacks instead of side by side.
function tiCells(layout, n, vert) {
  if (!n) return [];
  const grid = (cols, rows) => Array.from({ length: n }, (x, k) => [(k % cols) / cols, Math.floor(k / cols) / rows, 1 / cols, 1 / rows]);
  const strip = (m) => Array.from({ length: n }, (x, k) => (vert ? [0, k / m, 1, 1 / m] : [k / m, 0, 1 / m, 1]));
  let out;
  if (layout === 'duo') out = strip(n);
  else if (layout === 'trio') {
    const rest = n - 1, big = n === 1 ? 1 : 0.6;
    out = [vert ? [0, 0, 1, big] : [0, 0, big, 1]].concat(Array.from({ length: rest }, (x, k) => (vert ? [k / rest, big, 1 / rest, 1 - big] : [big, k / rest, 1 - big, 1 / rest])));
  } else if (layout === 'grille') {
    const [c, r] = n <= 2 ? (vert ? [1, 2] : [2, 1]) : n <= 4 ? [2, 2] : vert ? [2, 3] : [3, 2];
    out = grid(c, r);
  } else { // full frame: the first one, the others in insets along the side
    out = [[0, 0, 1, 1]].concat(Array.from({ length: n - 1 }, (x, k) => (vert ? [0.06 + (k % 2) * 0.47, 0.6 - Math.floor(k / 2) * 0.2, 0.41, 0.18] : [0.66, 0.06 + k * 0.19, 0.3, 0.17])));
  }
  if (layout === 'plein') return out;
  return out.map(([x, y, w, h]) => [x + TI_GAP / 2, y + TI_GAP / 2, w - TI_GAP, h - TI_GAP]);
}
const tiRect = (st, k, vert) => (st.layout === 'libre' ? [st.layers[k].x, st.layers[k].y, st.layers[k].w, st.layers[k].h] : tiCells(st.layout, st.layers.length, vert)[k]);
const tiBig = (t) => String(t || '').trim().replace(/\s+/g, ' ').toUpperCase().slice(0, 40);
const TI_INK = { blanc: '#FFFFFF', jaune: '#FFD400' };
// Draws the thumbnail on a canvas of W × H (sel: the image picked, outlined on screen only).
function tiDraw(x, W, H, st, vert, imgs, sel) {
  x.fillStyle = THUMB_BGS[st.bg] || THUMB_BGS.nuit;
  x.fillRect(0, 0, W, H);
  st.layers.forEach((L, k) => {
    const im = imgs[L.id];
    const [fx, fy, fw, fh] = tiRect(st, k, vert), rx = fx * W, ry = fy * H, rw = fw * W, rh = fh * H;
    if (!im || !im.naturalWidth || rw < 2 || rh < 2) return;
    const s = Math.max(rw / im.naturalWidth, rh / im.naturalHeight) * (L.zoom || 1), dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    x.save();
    x.beginPath(); x.rect(rx, ry, rw, rh); x.clip();
    x.drawImage(im, rx - (dw - rw) * (L.px / 100), ry - (dh - rh) * (L.py / 100), dw, dh);
    x.restore();
    const inset = fx > 0.002 || fy > 0.002 || fw < 0.996 || fh < 0.996;
    if (inset && (st.layout === 'libre' || st.layout === 'plein')) { x.lineWidth = Math.max(2, W * 0.004); x.strokeStyle = 'rgba(255,255,255,.9)'; x.strokeRect(rx, ry, rw, rh); } // (an inset has a white edge)
    if (sel && L.id === sel) { x.lineWidth = Math.max(3, W * 0.006); x.setLineDash([W * 0.02, W * 0.012]); x.strokeStyle = '#E91E7A'; x.strokeRect(rx + 2, ry + 2, rw - 4, rh - 4); x.setLineDash([]); }
  });
  const t = tiBig(st.text);
  if (t) { // the big word: as wide as it can be, two lines at most, an outline that reads on anything
    let fs = Math.round((vert ? W * 0.17 : H * 0.2)), lines = [t];
    const font = (n) => `800 ${n}px Unbounded, "Arial Black", sans-serif`;
    const fit = () => {
      x.font = font(fs);
      const words = t.split(' '), out = [];
      let cur = '';
      for (const w of words) { const tr = cur ? cur + ' ' + w : w; if (cur && x.measureText(tr).width > W * 0.9) { out.push(cur); cur = w; } else cur = tr; }
      if (cur) out.push(cur);
      return out;
    };
    for (let k = 0; k < 40; k++) { lines = fit(); if (lines.length <= 2 && lines.every((l) => x.measureText(l).width <= W * 0.9)) break; fs = Math.round(fs * 0.9); }
    const lh = fs * 1.02, top = st.pos === 'haut' ? H * 0.05 + fs * 0.86 : H * 0.95 - (lines.length - 1) * lh - fs * 0.12;
    x.textAlign = 'center'; x.lineJoin = 'round';
    lines.forEach((l, k) => {
      const y = top + k * lh;
      x.lineWidth = fs * 0.2; x.strokeStyle = '#111111'; x.strokeText(l, W / 2, y);
      x.fillStyle = TI_INK[st.ink] || TI_INK.blanc; x.fillText(l, W / 2, y);
    });
  }
}
// What makes people click, as for the others: real pictures, a few big words, not too many images at once.
function photoCtr(n, text, vert) {
  const words = tiBig(text).split(' ').filter(Boolean).length;
  if (vert) return Math.round((THUMBS.propre.ctr + (n ? 0.02 : 0) + (words >= 1 && words <= 4 ? 0.04 : words <= 6 && words ? 0.015 : 0)) * 100) / 100; // a short's cover: a little more than nothing
  let c = 0.12;
  if (words >= 1 && words <= 4) c += 0.06; else if (words > 4 && words <= 6) c += 0.02; else if (words > 6) c -= 0.02;
  if (n === 2 || n === 3) c += 0.02; else if (n >= 5) c -= 0.02;
  return Math.round(clamp(c, 0.04, 0.22) * 100) / 100;
}
// An image of the device, kept whole (never cropped here), 1600 px at most on its long side.
async function tiLoad(file) {
  const url = URL.createObjectURL(file);
  try {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image')); i.src = url; });
    const s = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(im.naturalWidth * s)); cv.height = Math.max(1, Math.round(im.naturalHeight * s));
    const cx = cv.getContext('2d');
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(im, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', 0.88);
  } finally { URL.revokeObjectURL(url); }
}
const tiImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
function PhotoThumb({ vert, onChange }) {
  const [W, H] = TI_SIZE[vert ? 'vert' : 'wide'];
  const cv = useRef(null), file = useRef(null), imgs = useRef({}), drag = useRef(null);
  const st = useRef({ layers: [], layout: 'plein', auto: true, bg: 'nuit', text: '', pos: vert ? 'haut' : 'bas', ink: 'blanc', sel: null }); // (a short's cover: its word on top, away from the counters)
  const [, setN] = useState(0), [busy, setBusy] = useState(false);
  const S0 = st.current, sel = S0.layers.find((L) => L.id === S0.sel) || null;
  const paint = () => { const c = cv.current; if (c) tiDraw(ctx2d(c), W, H, S0, vert, imgs.current, S0.sel); };
  const tell = () => {
    setN((n) => n + 1);
    paint();
    if (!onChange) return;
    if (!S0.layers.length) { onChange(null); return; }
    const snap = JSON.parse(JSON.stringify(S0));
    onChange({ n: snap.layers.length, text: tiBig(snap.text), ctr: photoCtr(snap.layers.length, snap.text, vert), render: () => { const c = document.createElement('canvas'); c.width = W; c.height = H; tiDraw(c.getContext('2d'), W, H, snap, vert, imgs.current, null); return c.toDataURL('image/jpeg', 0.86); } });
  };
  useEffect(() => { paint(); if (document.fonts && document.fonts.load) document.fonts.load('800 40px Unbounded').then(paint, () => {}); }, []);
  const set = (k, v) => { S0[k] = v; tell(); };
  const add = async (files) => {
    const list = Array.from(files || []).filter(okImage).slice(0, TI_MAX - S0.layers.length);
    if (!list.length) { toast(S0.layers.length >= TI_MAX ? `${TI_MAX} images au plus.` : 'Choisis des images (JPG, PNG ou WebP).', 'bad'); return; }
    setBusy(true);
    for (const f of list) {
      try {
        const url = await tiLoad(f), im = await tiImg(url);
        if (!im) continue;
        const id = uid('ph'), k = S0.layers.length, w = 0.5, h = Math.min(0.9, (w * W * im.naturalHeight) / im.naturalWidth / H);
        imgs.current[id] = im;
        S0.layers.push({ id, url, x: Math.min(0.45, 0.05 + 0.08 * k), y: Math.min(0.4, 0.05 + 0.08 * k), w, h, px: 50, py: 50, zoom: 1 });
        S0.sel = id;
      } catch (e) { toast(`Impossible d’importer ${str(f.name, 40)}.`, 'bad'); }
    }
    if (S0.auto) { const n = S0.layers.length; S0.layout = n <= 1 ? 'plein' : n === 2 ? 'duo' : n === 3 ? 'trio' : 'grille'; } // (until the player picks one: by how many there are)
    setBusy(false);
    tell();
  };
  const layout = (k) => {
    if (k === 'libre' && S0.layout !== 'libre') S0.layers.forEach((L, j) => { const [x, y, w, h] = tiRect(S0, j, vert); Object.assign(L, { x, y, w, h }); }); // (free from where they are)
    S0.auto = false;
    set('layout', k);
  };
  const at = (e) => { const b = cv.current.getBoundingClientRect(); return [(e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height]; };
  const down = (e) => {
    if (!S0.layers.length) return;
    e.preventDefault();
    const [fx, fy] = at(e);
    let k = -1;
    for (let j = S0.layers.length - 1; j >= 0; j--) { const [x, y, w, h] = tiRect(S0, j, vert); if (fx >= x && fx <= x + w && fy >= y && fy <= y + h) { k = j; break; } }
    if (k < 0) { S0.sel = null; tell(); return; }
    const L = S0.layers[k];
    S0.sel = L.id;
    try { cv.current.setPointerCapture(e.pointerId); } catch (err) { /* a synthetic event */ }
    drag.current = { L, k, fx, fy, x: L.x, y: L.y, px: L.px, py: L.py };
    paint();
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const [fx, fy] = at(e), L = d.L, dx = fx - d.fx, dy = fy - d.fy;
    if (S0.layout === 'libre') { L.x = clamp(d.x + dx, 0.04 - L.w, 0.96); L.y = clamp(d.y + dy, 0.04 - L.h, 0.96); } // (moved: a corner always stays in)
    else { // reframed inside its cell
      const im = imgs.current[L.id], [, , fw, fh] = tiRect(S0, d.k, vert);
      if (im) {
        const rw = fw * W, rh = fh * H, s = Math.max(rw / im.naturalWidth, rh / im.naturalHeight) * L.zoom, ox = im.naturalWidth * s - rw, oy = im.naturalHeight * s - rh;
        if (ox > 1) L.px = clamp(d.px - ((dx * W) / ox) * 100, 0, 100);
        if (oy > 1) L.py = clamp(d.py - ((dy * H) / oy) * 100, 0, 100);
      }
    }
    paint();
  };
  const up = () => { if (drag.current) { drag.current = null; tell(); } };
  const resize = (v) => { // libre: its size, from its centre, its shape kept
    const L = sel;
    if (!L) return;
    const cx = L.x + L.w / 2, cy = L.y + L.h / 2, r = L.h / L.w, w = clamp(v / 100, 0.15, 1.2), h = w * r;
    Object.assign(L, { w, h, x: cx - w / 2, y: cy - h / 2 });
    tell();
  };
  const swap = (d) => { const k = S0.layers.indexOf(sel), j = k + d; if (!sel || j < 0 || j >= S0.layers.length) return; const a = S0.layers; [a[k], a[j]] = [a[j], a[k]]; tell(); };
  const front = () => { if (!sel) return; S0.layers = S0.layers.filter((L) => L !== sel).concat(sel); tell(); };
  const drop = () => { if (!sel) return; delete imgs.current[sel.id]; S0.layers = S0.layers.filter((L) => L !== sel); S0.sel = S0.layers.length ? S0.layers[S0.layers.length - 1].id : null; if (S0.auto || (S0.layers.length < 2 && S0.layout !== 'libre')) { const n = S0.layers.length; S0.layout = n <= 1 ? 'plein' : n === 2 ? 'duo' : n === 3 ? 'trio' : 'grille'; } tell(); };
  const k = sel ? S0.layers.indexOf(sel) : -1;
  return html`<div class=${'ph-thumb' + (vert ? ' vert' : '')}>
    <canvas ref=${cv} width=${W} height=${H} class="ph-cv" aria-label=${vert ? 'Ta couverture : touche une image pour la choisir, fais-la glisser pour la placer' : 'Ta miniature : touche une image pour la choisir, fais-la glisser pour la placer'}
      onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${up}></canvas>
    <div class="row ph-tools">
      <button type="button" class="btn btn-ghost btn-sm" onClick=${() => file.current && file.current.click()} disabled=${busy || S0.layers.length >= TI_MAX}>${busy ? html`<${Typing} />` : html`<${Icon} n="upload" s=${14} />`} ${S0.layers.length ? 'Ajouter des images' : 'Importer tes images'}</button>
      <input ref=${file} type="file" accept="image/*" multiple hidden onChange=${(ev) => { const fs = Array.from(ev.target.files || []); ev.target.value = ''; add(fs); }} />
      <small class="muted">${S0.layers.length}/${TI_MAX}</small>
    </div>
    ${S0.layers.length ? html`
      <div class="field"><span class="lbl">La disposition</span><div class="tr-chips">${TI_LAYOUTS.filter(([id]) => S0.layers.length > 1 || id === 'plein' || id === 'libre').map(([id, lb]) => html`<button type="button" key=${id} class=${'chip-btn' + (S0.layout === id ? ' on' : '')} aria-pressed=${S0.layout === id} onClick=${() => layout(id)}>${lb}</button>`)}</div>
        <small class="muted">${S0.layout === 'libre' ? 'Fais glisser une image pour la placer ; la dernière choisie peut passer devant.' : 'Fais glisser une image pour la recadrer dans sa case.'}</small></div>
      ${sel ? html`<div class="field ph-sel"><span class="lbl">L’image choisie</span>
        <label class="ph-range"><span>Zoom</span><input type="range" min="100" max="300" step="5" value=${Math.round(sel.zoom * 100)} onInput=${(ev) => { sel.zoom = Number(ev.target.value) / 100; tell(); }} aria-label="Zoom de l’image" /></label>
        ${S0.layout === 'libre' ? html`<label class="ph-range"><span>Taille</span><input type="range" min="15" max="120" step="1" value=${Math.round(sel.w * 100)} onInput=${(ev) => resize(Number(ev.target.value))} aria-label="Taille de l’image" /></label>` : null}
        <div class="tr-chips">
          ${S0.layout === 'libre' ? html`<button type="button" class="chip-btn" onClick=${front} disabled=${k === S0.layers.length - 1}>Devant</button>` : html`<button type="button" class="chip-btn" onClick=${() => swap(-1)} disabled=${k <= 0}>◀ Avant</button><button type="button" class="chip-btn" onClick=${() => swap(1)} disabled=${k >= S0.layers.length - 1}>Après ▶</button>`}
          <button type="button" class="chip-btn" onClick=${drop}>Retirer</button>
        </div></div>` : null}
      <div class="field"><span class="lbl">Le fond</span><div class="th-swatches">${Object.keys(THUMB_BGS).map((b) => html`<button key=${b} type="button" class=${'th-sw' + (S0.bg === b ? ' on' : '')} style=${'--c:' + THUMB_BGS[b]} aria-label=${THUMB_BG_NAMES[b]} aria-pressed=${S0.bg === b ? 'true' : 'false'} onClick=${() => set('bg', b)}></button>`)}</div></div>
      <div class="field"><label class="lbl" for=${vert ? 'ph-text-v' : 'ph-text'}>Le texte</label>
        <input id=${vert ? 'ph-text-v' : 'ph-text'} class="input" maxlength="40" value=${S0.text} onInput=${(ev) => set('text', ev.target.value)} placeholder="2 à 4 mots, en gros (facultatif)" />
        <div class="tr-chips"><button type="button" class=${'chip-btn' + (S0.pos === 'haut' ? ' on' : '')} onClick=${() => set('pos', 'haut')}>En haut</button><button type="button" class=${'chip-btn' + (S0.pos === 'bas' ? ' on' : '')} onClick=${() => set('pos', 'bas')}>En bas</button><button type="button" class=${'chip-btn' + (S0.ink === 'blanc' ? ' on' : '')} onClick=${() => set('ink', 'blanc')}>Blanc</button><button type="button" class=${'chip-btn' + (S0.ink === 'jaune' ? ' on' : '')} onClick=${() => set('ink', 'jaune')}>Jaune</button></div></div>`
      : html`<p class="muted">Importe jusqu’à ${TI_MAX} images de ton appareil (tes photos, celles de ton perso IA) : elles restent sur cet appareil.</p>`}
  </div>`;
}

/* ---------- the steps, between the shoot and the upload screen ---------- */
function EditStep({ g, r, now }) {
  const [game] = useState(() => r.editGame || (r.editGame = makeEdit(r, g)));
  const [phase, setPhase] = useState(() => (game.run && game.run.on ? 'play' : 'intro'));
  const keep = (part, soon) => mgKeep(game, part, soon);
  const onDone = (m) => { applyEdit(g, r, m, 'me'); scheduleSave(); update(); };
  if (phase === 'intro') {
    return html`<div class="mg-intro studio-step edit-step">
      <span class="eyebrow">Montage · ${MG_LABEL[game.kind] || MG_LABEL.montage}</span>
      <h3>${game.title}</h3>
      <p>${game.intro}</p>
      ${r.crashes ? html`<p class="date-late"><${Icon} n="wrench" s=${15} /> Ton dernier montage a été perdu dans un plantage : à refaire.</p>` : null}
      <p class="muted">${game.kind === 'tri' ? 'Garde ou coupe chaque plan, avant la fin du chrono.' : game.rule || cutRule(game.verb, game.items.length, false)} Ton score de montage s’ajoute à celui du tournage : 50 % ne change rien, 100 % donne +${Math.round(swingOf(r) * 50)} points, 0 % en retire ${Math.round(swingOf(r) * 50)}.</p>
      <div class="row ss-actions">
        <button class="btn btn-hot" onClick=${() => { mgKeep(game, { on: Date.now() }); setPhase('play'); }}><${Icon} n="scissors" s=${16} /> Monter</button>
        <button class="btn btn-ghost" onClick=${() => { applyEdit(g, r, 0.3, 'vite'); scheduleSave(); update(); }}>Passer le montage (−${Math.round((0.5 - 0.3) * swingOf(r) * 100)} points)</button>
        ${r.staffEdit ? html`<button class="btn btn-ghost" onClick=${() => { if (staffEditBack(g, r)) { scheduleSave(); update(); } }}>Garder le montage de ${r.staffEdit.who || 'ton équipe'} (${Math.round(r.staffEdit.m * 100)} %)</button>` : null}
      </div>
    </div>`;
  }
  if (game.kind === 'tri') return html`<${TriGame} items=${game.items} onDone=${onDone} now=${now} total=${mgClock('tri', game.items, diffOf(game.diff), game.timeK || 1)} hints=${0} run=${game.run || null} keep=${keep} />`;
  if (ARCADE_KINDS.includes(game.kind)) return html`<${ArcadeGame} game=${game} onDone=${onDone} now=${now} run=${game.run || null} keep=${keep} />`; // 0.25
  return html`<${MontageGame} game=${game} onDone=${onDone} run=${game.run || null} keep=${keep} />`;
}
function ThumbStep({ g, r, onDone }) {
  const W = WHATS[r.what] || WHATS.vidéo;
  const [tab, setTab] = useState('compose');
  const [look, setLook] = useState(() => presetLook('propre', r));
  const [sketch, setSketch] = useState(null);
  const [ph, setPh] = useState(null); // 0.31.1: the player's own images
  const [ai, setAi] = useState(null); // { busy } | { url } | { err }
  const preset = Object.keys(PRESET_CTR).find((k) => sameLook(look, presetLook(k, r))) || null;
  const ctr = preset ? PRESET_CTR[preset] : lookCtr(look), choc = preset ? preset === 'choc' : lookChoc(look);
  const set = (k, v) => setLook(Object.assign({}, look, { [k]: v }));
  const words = [...new Set([thumbWords(r.topic, 2), thumbWords(r.topic), 'JE TESTE', 'ÇA A MAL TOURNÉ', '???', 'INCROYABLE'].map((x) => x.toUpperCase()).filter(Boolean))].slice(0, 6);
  const done = (t) => { r.thumb = t; if (onDone) onDone(t); scheduleSave(); update(); }; // (0.23: a thumbnail made for someone else)
  const useCompose = () => done({ kind: 'compose', preset, look, ctr, choc });
  const useSketch = async () => {
    if (!sketch) return;
    const id = await keepThumbImage(g, sketch.url);
    if (!id) { toast('Impossible de garder ton dessin sur cet appareil : prends une composition.', 'bad'); return; }
    done({ kind: 'drawn', img: id, ctr: drawnCtr(sketch), choc: false });
  };
  const usePhotos = async () => {
    if (!ph || (ai && ai.busy)) return;
    const id = await keepThumbImage(g, ph.render());
    if (!id) { toast('Impossible de garder ta miniature sur cet appareil : prends une composition.', 'bad'); return; }
    done({ kind: 'photos', img: id, ctr: ph.ctr, choc: false });
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
    ${r.staffThumb ? html`<p class="ss-edit">🖼️ ${thumbWord(r.staffThumb)} · +${Math.round(r.staffThumb.ctr * 100)} % de vues <button type="button" class="linkbtn" onClick=${() => done(r.staffThumb)}>La garder</button></p>` : null}
    <div class="th-preview">${tab === 'compose' ? html`<${ThumbArt} look=${look} label=${'Aperçu de ta miniature'} />` : null}</div>
    <div class="seg" role="tablist" aria-label="Comment la faire">
      <button type="button" role="tab" aria-selected=${tab === 'compose' ? 'true' : 'false'} class=${tab === 'compose' ? 'on' : ''} onClick=${() => setTab('compose')}>Composer</button>
      <button type="button" role="tab" aria-selected=${tab === 'draw' ? 'true' : 'false'} class=${tab === 'draw' ? 'on' : ''} onClick=${() => setTab('draw')}>Dessiner</button>
      <button type="button" role="tab" aria-selected=${tab === 'images' ? 'true' : 'false'} class=${tab === 'images' ? 'on' : ''} onClick=${() => setTab('images')}>Tes images</button>
    </div>
    ${tab === 'compose' ? html`<div class="th-compose">
      <div class="field"><span class="lbl">Modèles</span><div class="thumb-pick">${Object.keys(PRESET_CTR).map((k) => html`<button type="button" key=${k} class=${'thumb-opt' + (preset === k ? ' on' : '')} onClick=${() => setLook(presetLook(k, r))}><${ThumbArt} look=${presetLook(k, r)} small=${true} /><b>${THUMBS[k].label}</b><small>+${Math.round(PRESET_CTR[k] * 100)} % de vues${THUMBS[k].risk ? ' · si c’est raté, « putaclic »' : ''}</small></button>`)}</div></div>
      <div class="field"><span class="lbl">Le fond</span><div class="th-swatches">${Object.keys(THUMB_BGS).map((k) => html`<button key=${k} type="button" class=${'th-sw' + (look.bg === k ? ' on' : '')} style=${'--c:' + THUMB_BGS[k]} aria-label=${THUMB_BG_NAMES[k]} aria-pressed=${look.bg === k ? 'true' : 'false'} onClick=${() => set('bg', k)}></button>`)}</div></div>
      <div class="field"><span class="lbl">La tête</span><div class="tr-chips">${[W.emoji, ...THUMB_FACES].map((x) => html`<button key=${x} type="button" class=${'chip-btn th-face' + (look.emo === x ? ' on' : '')} onClick=${() => set('emo', x)}>${x}</button>`)}</div></div>
      <div class="field"><label class="lbl" for="th-text">Le texte</label>
        <input id="th-text" class="input" maxlength="28" value=${look.text} onInput=${(ev) => set('text', ev.target.value)} placeholder="2 à 4 mots, en gros" />
        <div class="tr-chips">${words.map((w) => html`<button key=${w} type="button" class="chip-btn" onClick=${() => set('text', w)}>${w}</button>`)}<button type="button" class="chip-btn" onClick=${() => set('text', '')}>Sans texte</button></div></div>
      <div class="field"><span class="lbl">Le détail</span><div class="tr-chips">${THUMB_DECOS.map(([k, l]) => html`<button key=${k} type="button" class=${'chip-btn' + (look.deco === k ? ' on' : '')} onClick=${() => set('deco', k)}>${l}</button>`)}</div></div>
      <p class="th-est"><b>≈ +${Math.round(ctr * 100)} % de vues</b>${choc ? ' · accrocheur… mais si ta vidéo est ratée, on criera au putaclic' : ''}</p>
      <button class="btn btn-hot th-ok" onClick=${useCompose}><${Icon} n="check" s=${16} /> Valider la miniature</button>
    </div>` : tab === 'images' ? html`<div class="th-photos">
      <${PhotoThumb} onChange=${setPh} />
      ${ph ? html`<p class="th-est"><b>≈ +${Math.round(ph.ctr * 100)} % de vues</b> · tes images${ph.text ? '' : ' · un gros texte de 2 à 4 mots donne envie de cliquer'}</p>` : null}
      <button class="btn btn-hot th-ok" onClick=${usePhotos} disabled=${!ph}><${Icon} n="check" s=${16} /> Utiliser cette miniature</button>
    </div>` : html`<div class="th-draw">
      <${SketchPad} onChange=${setSketch} />
      ${ai && ai.err ? html`<p class="notice"><span>${ai.err}</span></p>` : null}
      ${sketch ? html`<p class="th-est"><b>≈ +${Math.round(drawnCtr(sketch) * 100)} % de vues</b> · fait main${canAiThumb(g) && !(ai && ai.err) ? ` · finalisée par l’IA : ≈ +${Math.round(AI_THUMB_CTR * 100)} %` : ''}</p>` : html`<p class="muted">Dessine au doigt ou à la souris : un visage, un objet, un gros mot-clé… Pas besoin d’être doué.</p>`}
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
    <small class="muted">${Math.round(p * 100)} %</small>
  </div>`;
}
// Where a release stands after its shoot: the edit, the render, the thumbnail, then the upload screen.
function StudioSteps({ g, r, now }) {
  const step = needsEdit(r) && !r.edit ? 'edit' : needsRender(g, r) ? 'render' : needsThumb(r) && !r.thumb ? 'thumb' : 'publish';
  const stages = [['shoot', 'Tournage', true], needsEdit(r) ? ['edit', 'Montage', !!r.edit] : null, needsThumb(r) ? ['thumb', 'Miniature', !!r.thumb] : null, ['publish', 'Publication', false]].filter(Boolean);
  return html`<div class="studio-steps">
    <ol class="ss-dots" aria-label="Les étapes avant la sortie">${stages.map(([k, l, ok]) => html`<li key=${k} class=${ok ? 'ok' : k === step ? 'on' : ''} aria-current=${k === step ? 'step' : null}>${ok ? '✓ ' : ''}${l}</li>`)}</ol>
    ${r.edit ? html`<p class="ss-edit">✂️ ${editWord(r)}${r.edit.by === 'staff' ? html` <button type="button" class="linkbtn" onClick=${() => { if (selfEdit(g, r)) { scheduleSave(); update(); } }}>Monter moi-même</button>` : null}</p>` : null}
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
