/* =========================================================
   The player's own photos (0.9.1): real pictures in a post (one photo, a carousel, or a TikTok-like slideshow), and
   the player's own Insta-like and TikTok-like pages. Their own photos, or the ones of the AI character they made.
   They stay on this device: files of the app on a computer (Hype pour ChatGPT), the browser's own storage in the
   Claude version (the artifact's shared space holds everybody's games: no room for photos there).
   The AI never sees them: it reads what the player says they show.
   ========================================================= */
const MEDIA = {}; // id → data URL, 'loading' or 'missing'
const MEDIA_MAX = 10; // photos in one post
let idbP = null;
function idbOpen() {
  if (idbP) return idbP;
  idbP = new Promise((res) => {
    try {
      const rq = window.indexedDB.open('hype-media', 1);
      rq.onupgradeneeded = () => { try { rq.result.createObjectStore('img'); } catch (e) { /* already there */ } };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => res(null);
      rq.onblocked = () => res(null);
    } catch (e) { res(null); }
  });
  return idbP;
}
function idbRun(mode, fn) {
  return idbOpen().then((db) => new Promise((res, rej) => {
    if (!db) { rej(new Error('idb')); return; }
    try {
      const tx = db.transaction('img', mode), rq = fn(tx.objectStore('img'));
      tx.oncomplete = () => res(rq ? rq.result : undefined);
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error);
    } catch (e) { rej(e); }
  }));
}
// false: kept for this visit only (a private window, a browser that refuses): the post falls back to its description.
async function mediaPut(id, data) {
  MEDIA[id] = data;
  if (HOST) { try { await Store.write('pm_' + id, { data }); return true; } catch (e) { return false; } }
  try { await idbRun('readwrite', (st) => st.put(data, id)); return true; } catch (e) { return false; }
}
async function mediaGet(id) {
  if (typeof MEDIA[id] === 'string' && MEDIA[id].startsWith('data:')) return MEDIA[id];
  if (HOST) { const b = await Store.read('pm_' + id).catch(() => null); return b && typeof b.data === 'string' ? b.data : null; }
  try { const v = await idbRun('readonly', (st) => st.get(id)); return typeof v === 'string' ? v : null; } catch (e) { return null; }
}
function mediaDel(id) {
  delete MEDIA[id];
  if (HOST) return Store.remove('pm_' + id).catch(() => {});
  return idbRun('readwrite', (st) => st.delete(id)).catch(() => {});
}
// For the screens: the image now, or null while it loads (gone: the post shows what it described instead).
function mediaSrc(id) {
  const v = MEDIA[id];
  if (v === undefined) {
    MEDIA[id] = 'loading';
    mediaGet(id).then((d) => { MEDIA[id] = d && d.startsWith('data:image/') ? d : 'missing'; update(false); })
      .catch(() => { MEDIA[id] = 'missing'; update(false); });
    return null;
  }
  return v === 'loading' || v === 'missing' ? null : v;
}
const mediaGone = (id) => MEDIA[id] === 'missing';
const ownIds = (p) => (p && p.photo && Array.isArray(p.photo.own) ? p.photo.own.filter((id) => !mediaGone(id)) : []);
// Photos picked in the composer and never published (the page closed on a draft): listed on this device, cleared
// at a later start. Half a day of grace, for a second window still busy with its own draft.
const PIC_DRAFTS = 'hype:picDrafts';
function picDrafts() {
  try { const v = JSON.parse(lsGet(PIC_DRAFTS) || '[]'); return Array.isArray(v) ? v.filter((x) => x && typeof x.id === 'string') : []; } catch (e) { return []; }
}
function markDrafts(add, drop) {
  const out = picDrafts().filter((x) => !(drop || []).includes(x.id));
  for (const id of add || []) out.push({ id, at: Date.now() });
  lsSet(PIC_DRAFTS, JSON.stringify(out.slice(-300)));
}
function sweepDrafts() {
  const list = picDrafts();
  if (!list.length) return;
  const mine = new Set(S.drafts.pics || []), t = Date.now();
  const old = list.filter((x) => !mine.has(x.id) && t - (x.at || 0) > 12 * 3600000);
  for (const x of old) mediaDel(x.id);
  if (old.length) lsSet(PIC_DRAFTS, JSON.stringify(list.filter((x) => !old.includes(x))));
}

/* ---------- the characters see the images (0.9.2) ----------
   The player's choice, post by post, and only for images made by AI (said where the box is ticked): the game cannot
   tell a real photo from an AI image, so this is the player's word. The first images of the post go with the call
   that writes the reactions, smaller than on screen (about 400 tokens each); later prompts only read what was seen. */
const SEE_MAX = 4;
const SEE_CHARS = 1600; // what one image costs in the café count (about 400 tokens)
const seeCafes = (n) => (n * SEE_CHARS) / CAFE_CHARS;
let visionP = null;
// How many images this view can send with a call (0: none). Claude: the artifact declares images and the viewer's
// app can send them; the PC app: its host says so.
function visionCheck() {
  if (!visionP) {
    visionP = getSample()
      .then((s) => (s && typeof s.limits === 'function' ? s.limits().catch(() => null) : null))
      .then((l) => (l && l.images ? Math.max(1, Math.min(SEE_MAX, Number(l.images.maxCount) || SEE_MAX)) : 0), () => 0)
      .then((n) => { if (!S.visionOff) S.vision = n; update(false); return n; });
  }
  return visionP;
}
// The images sent to the AI: JPEG, 480 × 600 at most.
async function seeBlobs(ids, n) {
  const out = [];
  for (const id of ids) {
    if (out.length >= n) break;
    const d = await mediaGet(id);
    if (!d) continue;
    try {
      const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('image')); im.src = d; });
      const s = Math.min(1, 480 / img.naturalWidth, 600 / img.naturalHeight);
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.naturalWidth * s));
      cv.height = Math.max(1, Math.round(img.naturalHeight * s));
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      const b = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.82));
      if (b) out.push(b);
    } catch (e) { /* this one stays out */ }
  }
  return out;
}
// The images could not go (refused, not supported): the post is read from its description. After two misses in a
// visit, or when this view cannot send images at all, the box goes away until the next visit.
function visionMissed(code) {
  S.visionMiss = (S.visionMiss || 0) + 1;
  if (code === 'images_unavailable' || S.visionMiss >= 2) { S.vision = 0; S.visionOff = true; }
  toast(`${AI_NAME} n’a pas pu voir tes images : les persos réagissent à ta description.`, 'bad');
}

/* ---------- in the composer ---------- */
// The photos the player picks are shrunk (like the atelier's: 720 × 900, WebP) and kept right away.
async function addPics(files) {
  const list = Array.from(files || []).filter(okImage);
  if (!list.length) { toast('Choisis des images (JPG, PNG ou WebP).', 'bad'); return; }
  const d = S.drafts;
  d.pics = d.pics || [];
  const room = MEDIA_MAX - d.pics.length;
  if (room <= 0) { toast(`${MEDIA_MAX} photos au plus dans un post.`, 'bad'); return; }
  S.picBusy = true;
  update(false);
  let lost = false;
  for (const f of list.slice(0, room)) {
    try {
      const data = await packShrink(f, 720, 900, 0.8);
      const id = uid('pm');
      if (!(await mediaPut(id, data))) lost = true;
      markDrafts([id]);
      d.pics.push(id);
      if (d.photo == null) d.photo = '';
      update(false);
    } catch (e) { toast(`Impossible d’importer ${str(f.name, 40)}.`, 'bad'); }
  }
  if (list.length > room) toast(`${MEDIA_MAX} photos au plus dans un post : les autres sont restées de côté.`, 'bad');
  if (lost) toast('Ce navigateur ne garde pas les photos : elles disparaîtront en quittant la page.', 'bad');
  S.picBusy = false;
  update(false);
}
function dropPic(id) {
  S.drafts.pics = (S.drafts.pics || []).filter((x) => x !== id);
  mediaDel(id);
  markDrafts(null, [id]);
  update(false);
}
// What the composer shows under the description: the photos, removable, and carousel or slideshow.
function PicsBox() {
  const d = S.drafts, pics = d.pics || [];
  const ref = useRef(null);
  useEffect(() => { visionCheck(); }, []);
  const canSee = S.vision > 0 && pics.length > 0, see = canSee && !!d.see;
  const diapo = d.diapo ? 'Un diapo façon TikTok : le texte de ton post en sera le titre. ' : '';
  return html`<div class="pics-box">
    ${pics.length ? html`<div class="pics">${pics.map((id) => { const src = mediaSrc(id); return html`<span class="pic" key=${id}>${src ? html`<img src=${src} alt="" />` : null}<button type="button" class="pic-x" onClick=${() => dropPic(id)} aria-label="Retirer cette photo"><${Icon} n="x" s=${13} /></button></span>`; })}</div>` : null}
    <div class="row pics-tools">
      <button type="button" class="btn btn-ghost btn-sm" onClick=${() => ref.current && ref.current.click()} disabled=${S.picBusy || pics.length >= MEDIA_MAX}>${S.picBusy ? html`<${Typing} />` : html`<${Icon} n="upload" s=${14} />`} ${pics.length ? 'Ajouter des photos' : 'Ajouter tes vraies photos'}</button>
      <input ref=${ref} type="file" accept="image/*" multiple hidden onChange=${(ev) => { const fs = Array.from(ev.target.files || []); ev.target.value = ''; addPics(fs); }} />
      ${pics.length >= 2 ? html`<${Seg} items=${[[false, 'Carrousel'], [true, 'Diapo TikTok']]} value=${!!d.diapo} onPick=${(k) => { d.diapo = k; update(false); }} label="Comment les publier" />` : null}
    </div>
    ${canSee ? html`<label class=${'see-box' + (see ? ' on' : '')}>
      <input type="checkbox" checked=${see} onChange=${(ev) => { d.see = ev.target.checked; update(false); }} />
      <span><b>Les persos voient ces images</b><small>Images générées par IA uniquement (ton perso IA), jamais de photos de vraies personnes : elles sont envoyées à ${AI_NAME}${pics.length > S.vision ? ` (les ${S.vision} premières)` : ''}.</small></span>
    </label>` : null}
    <small class="muted">${!pics.length ? 'Tes photos (ou celles de ton perso IA) restent sur cet appareil : les persos ne lisent que ta description.'
      : see ? diapo + `Les persos voient tes images : ta description devient facultative. ≈ +${String(Math.max(0.1, Math.round(seeCafes(Math.min(S.vision, pics.length)) * 10) / 10)).replace('.', ',')} café.`
        : diapo + 'Tes photos restent sur cet appareil : les persos ne lisent que ta description.'}</small>
  </div>`;
}

/* ---------- in the feed, on the player's pages ---------- */
function OwnMedia({ g, p }) {
  const ids = ownIds(p);
  const srcs = ids.map(mediaSrc);
  if (p.photo.diapo) {
    return html`<button type="button" class="slides-card" onClick=${stop(() => openLayer({ t: 'tiktok', id: 'p', s: p.id }))} aria-label=${'Voir ton diaporama : ' + (p.text || p.photo.desc)}>
      ${srcs.slice(0, 3).map((src, k) => html`<span key=${k}>${src ? html`<img src=${src} alt="" loading="lazy" />` : null}</span>`)}
      <span class="slides-play"><${Icon} n="play" s=${18} fill=${true} /> ${ids.length} photos</span>
    </button>`;
  }
  const open = () => openLayer({ t: 'insta', id: 'p', post: p.id });
  if (ids.length > 1) return html`<div class="photo real is-car" onClick=${stop(open)}><${Carousel} srcs=${srcs} label=${p.photo.desc} /></div>`;
  return html`<button type="button" class=${'photo real' + (p.pfp ? ' is-pfp' : '')} onClick=${stop(open)} aria-label=${(p.pfp ? 'Nouvelle photo de profil : ' : 'Photo : ') + p.photo.desc}>${srcs[0] ? html`<img src=${srcs[0]} alt="" loading="lazy" decoding="async" />` : null}</button>`;
}
// The player's posts with their own photos: a carousel or a photo (diapo false), or a slideshow (diapo true).
const ownPosts = (g, now, diapo) => g.posts.filter((p) => p.a === 'p' && p.at <= now && !p.pending && ownIds(p).length && !!p.photo.diapo === diapo).sort((a, b) => b.ts - a.ts);
function PlayerInstaLayer({ l, g, now, i }) {
  const [open, setOpen] = useState(l.post || null);
  const P = g.player, s = g.stats;
  const title = pfName(g, 'instagram');
  const items = ownPosts(g, now, false).map((p) => {
    const ids = ownIds(p);
    return { id: p.id, src: mediaSrc(ids[0]), srcs: ids.length > 1 ? ids.map(mediaSrc) : null, cap: p.text, lk: shownLikes(p, now), liked: false, at: p.ts, post: p.id,
      cm: p.replies.filter((r) => r.at <= now).slice(0, 8).map((r) => [author(g, r.a).name, r.text]) };
  });
  const prof = { name: P.name, handle: P.handle, role: '', bio: P.bio, followers: s.followers, following: s.following, avatar: author(g, 'p') };
  return html`<${LayerShell} i=${i} title=${title} onBack=${open ? () => setOpen(null) : null}
    head=${html`<div class="ig-title"><b>${P.handle}</b><span>${title}</span></div>`}>
    <${IgView} prof=${prof} items=${items} highlights=${[]} open=${open} setOpen=${setOpen} onLike=${() => {}} preview=${true} now=${now} g=${g} />
  <//>`;
}
function PlayerTikTokLayer({ l, g, now, i }) {
  const list = ownPosts(g, now, true);
  const [n, setN] = useState(Math.max(0, list.findIndex((p) => p.id === l.s)));
  const start = useRef(null), wheelAt = useRef(0);
  const title = pfName(g, 'tiktok');
  const p = list[Math.min(n, list.length - 1)];
  if (!p) return html`<${LayerShell} i=${i} title=${title}><div class="empty"><b>Pas encore de diaporama</b></div><//>`;
  const go = (d) => setN((x) => clamp(x + d, 0, list.length - 1));
  const ti = p.text || p.photo.desc;
  return html`<${LayerShell} i=${i} title=${title} dark=${true}
    head=${html`<div class="ig-title"><b>@${g.player.handle}</b><span>${title} · ${n + 1} sur ${list.length}</span></div>`}>
    <div class="tt" onPointerDown=${(e) => { start.current = e.clientY; }} onPointerUp=${(e) => { if (start.current != null && Math.abs(e.clientY - start.current) > 70) go(e.clientY < start.current ? 1 : -1); start.current = null; }}
      onWheel=${(e) => { const t = Date.now(); if (Math.abs(e.deltaY) > 40 && t - wheelAt.current > 700) { wheelAt.current = t; go(e.deltaY > 0 ? 1 : -1); } }}>
      <${SlideShow} key=${p.id} srcs=${ownIds(p).map(mediaSrc)} dur=${2800} label=${ti}>
        <p class="tt-title">${ti}</p>
        <div class="tt-rail">
          <${Avatar} who=${author(g, 'p')} size=${44} />
          <span class="tt-btn"><${Icon} n="heart" s=${30} fill=${true} /><span>${fmtN(shownLikes(p, now))}</span></span>
          <button type="button" class="tt-btn" onClick=${() => openPost(p.id)} aria-label="Voir les réactions"><${Icon} n="msg" s=${28} fill=${true} /><span>${fmtN(Math.max(p.replies.filter((r) => r.at <= now).length, shownReplies(p, now)))}</span></button>
          <span class="tt-btn"><${Icon} n="repeat" s=${28} /><span>${fmtN(shownReposts(p, now))}</span></span>
        </div>
        <div class="tt-foot"><b>@${g.player.handle}</b><span>${fmtAgo(p.ts, now)}</span><small><${Icon} n="music" s=${13} /> son original · ${g.player.name}</small></div>
      <//>
      <div class="tt-nav">
        <button type="button" class="iconbtn" onClick=${() => go(-1)} disabled=${n <= 0} aria-label="Diaporama précédent"><${Icon} n="chevup" s=${24} /></button>
        <button type="button" class="iconbtn" onClick=${() => go(1)} disabled=${n >= list.length - 1} aria-label="Diaporama suivant"><${Icon} n="chevdown" s=${24} /></button>
      </div>
    </div>
  <//>`;
}
// On the player's profile: their own Insta and TikTok, once they have posted photos.
function PlayerSocialLinks({ g, now }) {
  const ig = ownPosts(g, now, false).length, tt = ownPosts(g, now, true).length;
  if (!ig && !tt) return null;
  return html`<div class="soc-links">
    ${ig ? html`<button type="button" class="soc-btn is-ig" onClick=${() => openLayer({ t: 'insta', id: 'p' })}><span class="soc-ic" aria-hidden="true">📸</span><span><b>Ton ${pfName(g, 'instagram')}</b><small>${ig} ${plural(ig, 'publication', 'publications')}</small></span></button>` : null}
    ${tt ? html`<button type="button" class="soc-btn is-tt" onClick=${() => openLayer({ t: 'tiktok', id: 'p' })}><span class="soc-ic" aria-hidden="true">🎵</span><span><b>Ton ${pfName(g, 'tiktok')}</b><small>${tt} ${plural(tt, 'diaporama', 'diaporamas')}</small></span></button>` : null}
  </div>`;
}

/* ---------- a game's photos: kept with it, gone with it ---------- */
const mediaOfGame = (g) => [...new Set([...(g.media || []), ...g.posts.flatMap((p) => (p.a === 'p' && p.photo && Array.isArray(p.photo.own) ? p.photo.own : []))])];
// For the export file (a game moves from one AI to the other with its photos).
async function mediaExport(g) {
  const out = {};
  let size = 0;
  for (const id of mediaOfGame(g)) {
    const d = await mediaGet(id);
    if (!d || size + d.length > 60e6) continue;
    out[id] = d;
    size += d.length;
  }
  return out;
}
// An imported game gets its own copies (importing the same file twice gives two games, never shared photos).
// core and feed: where the ids are kept (core.media) and used (feed.posts); for a game, both are the game.
async function mediaImport(core, feed, media) {
  if (!media || typeof media !== 'object') return;
  const map = {};
  for (const id of Object.keys(media).slice(0, 600)) {
    const d = media[id];
    if (typeof d !== 'string' || d.length > 3e6 || !/^data:image\/(webp|jpeg|png);base64,/.test(d)) continue;
    const nid = uid('pm');
    if (await mediaPut(nid, d)) map[id] = nid;
  }
  for (const p of feed.posts || []) if (p && p.photo && Array.isArray(p.photo.own)) p.photo.own = p.photo.own.map((id) => map[id] || id);
  core.media = Object.values(map);
}
