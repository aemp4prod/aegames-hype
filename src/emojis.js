/* =========================================================
   Emojis (0.17): the game's own stickers, everywhere an emoji shows (posts, replies, private messages, notifications,
   toasts, bios), and the phone's own when we have no drawing of it. The text keeps the real emoji characters (the AI
   reads and writes them as usual): only the display changes. A button opens them like a phone keyboard does, by
   category or searched by word (« joyeux », « triste », « drague »…), with the ones used lately first.
   ========================================================= */
const EMO_LIST = EMOS.map(([id, c, n, tags, cat, svg]) => ({ id, c, n, tags, cat, svg }));
const EMO_BY = {}; // the emoji without its variation selector → its sticker
for (const e of EMO_LIST) EMO_BY[e.c.replace(/️/g, '')] = e;
const EMO_SRC = {};
const emoSrc = (e) => EMO_SRC[e.id] || (EMO_SRC[e.id] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(e.svg));
// One of ours, alone (not inside a combined emoji, not with a skin tone: those stay the phone's).
const EMO_RE = new RegExp('(?<!\\u200D)(' + Object.keys(EMO_BY).sort((a, b) => b.length - a.length).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?!\\uFE0F?[\\u200D\\u{1F3FB}-\\u{1F3FF}])\\uFE0F?', 'gu');
const ANY_EMO = /\p{Extended_Pictographic}/u;
// A text, cut into strings and stickers (for a render).
function emoParts(text, kb = 'e') {
  text = text == null ? '' : String(text);
  if (!text || !ANY_EMO.test(text)) return [text];
  const out = [];
  let last = 0, m, k = 0;
  EMO_RE.lastIndex = 0;
  while ((m = EMO_RE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const e = EMO_BY[m[1]];
    out.push(html`<img key=${kb + k++} class="emo" src=${emoSrc(e)} alt=${m[0]} title=${e.n} draggable="false" />`);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
// 0.29: the same for any text of the game (ui.js: html): the text as it is when it has none of ours, else its pieces.
// The emoji stays in the text (read aloud, copied, found), unseen, over its sticker.
function emoNodes(text) {
  const out = [];
  let last = 0, m;
  EMO_RE.lastIndex = 0;
  while ((m = EMO_RE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = h('hype-emo-t', { class: 'emo-t' }, m[0]);
    const v = h('hype-emo', { class: 'emo emo-s', style: { backgroundImage: 'url("' + emoSrc(EMO_BY[m[1]]) + '")' } }, t); // (an element of its own: no rule meant for a span of the screen reaches it)
    t.__emo = v.__emo = 1; // (already ours: not looked at again)
    out.push(v);
    last = m.index + m[0].length;
  }
  if (!out.length) return text;
  if (last < text.length) out.push(text.slice(last));
  return out;
}
// A message made of one to three emojis and nothing else is shown big (like on a phone).
function emoOnly(text) {
  const s = String(text || '').trim();
  if (!s || s.length > 24 || !ANY_EMO.test(s)) return false;
  const n = (s.match(EMO_RE) || []).length;
  EMO_RE.lastIndex = 0;
  return n >= 1 && n <= 3 && !s.replace(EMO_RE, '').replace(/[\s️]/g, '');
}

/* ---------- the keyboard ---------- */
const EMO_CATS = [['recents', 'Récents'], ['visages', 'Visages'], ['mains', 'Mains'], ['coeurs', 'Cœurs'], ['objets', 'Objets'], ['symboles', 'Symboles']]; // (0.27: the objects)
const EMO_RECENT_KEY = 'hype:emo:recent';
function emoRecents() {
  try { const v = JSON.parse(localStorage.getItem(EMO_RECENT_KEY) || '[]'); return Array.isArray(v) ? v.filter((id) => EMO_LIST.some((e) => e.id === id)).slice(0, 16) : []; } catch (e) { return []; }
}
function emoUsed(id) {
  try { localStorage.setItem(EMO_RECENT_KEY, JSON.stringify([id, ...emoRecents().filter((x) => x !== id)].slice(0, 16))); } catch (e) { /* this view keeps no history */ }
}
// By word: a tag, the name or the id that starts with what is typed (accents and case left aside).
function emoSearch(q) {
  const w = foldAcc(q).trim();
  if (!w) return [];
  return EMO_LIST.filter((e) => [e.n, e.id, ...e.tags].some((x) => foldAcc(x).split(/[\s'’-]+/).some((p) => p.startsWith(w)) || foldAcc(x).startsWith(w)));
}
// For a text field: the button (in its tools) and the panel (where the caller wants it). getVal / setVal: its text.
function useEmoji(key, ref, getVal, setVal, max = 280) {
  const open = S.emoOpen === key;
  const [st, setSt] = useState({ q: '', cat: '' });
  const toggle = () => { S.emoOpen = open ? null : key; setSt({ q: '', cat: emoRecents().length ? 'recents' : 'visages' }); update(false); }; // the tab is chosen once, at the opening
  const insert = (e) => {
    const t = ref.current, v = getVal() || '';
    const a = t && typeof t.selectionStart === 'number' ? t.selectionStart : v.length;
    const b = t && typeof t.selectionEnd === 'number' ? t.selectionEnd : a;
    const next = (v.slice(0, a) + e.c + v.slice(b)).slice(0, max);
    setVal(next);
    emoUsed(e.id);
    if (t) {
      t.value = next;
      const p = Math.min(next.length, a + e.c.length);
      try { if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) t.focus({ preventScroll: true }); t.setSelectionRange(p, p); } catch (x) { /* a field that does not take a caret */ }
    }
    setSt((s) => Object.assign({}, s)); // the « recent » ones follow
  };
  const btn = html`<button type="button" class=${'voice-chip emo-btn' + (open ? ' on' : '')} aria-expanded=${open ? 'true' : 'false'} aria-label="Emojis" onMouseDown=${(ev) => ev.preventDefault()} onClick=${toggle}><img class="emo" src=${emoSrc(EMO_BY['😊'])} alt="" /> Emojis</button>`;
  if (!open) return { btn, panel: null };
  const rec = emoRecents();
  const cat = st.cat === 'recents' && !rec.length ? 'visages' : st.cat || 'visages';
  const found = st.q.trim() ? emoSearch(st.q) : null;
  const list = found || (cat === 'recents' ? rec.map((id) => EMO_LIST.find((e) => e.id === id)).filter(Boolean) : EMO_LIST.filter((e) => e.cat === cat));
  const panel = html`<div class="emo-panel" role="dialog" aria-label="Emojis">
    <div class="emo-top">
      <input class="input emo-search" type="search" value=${st.q} placeholder="Chercher : joyeux, triste, drague…" aria-label="Chercher un emoji" onInput=${(ev) => setSt({ q: ev.target.value, cat: st.cat })} onKeyDown=${(ev) => { if (ev.key === 'Escape') { ev.preventDefault(); toggle(); } }} />
      <button type="button" class="iconbtn" onClick=${toggle} aria-label="Fermer les emojis"><${Icon} n="x" s=${16} /></button>
    </div>
    ${found ? null : html`<div class="emo-cats" role="tablist">${EMO_CATS.filter(([id]) => id !== 'recents' || rec.length).map(([id, label]) => html`<button key=${id} type="button" role="tab" aria-selected=${cat === id ? 'true' : 'false'} class=${'emo-cat' + (cat === id ? ' on' : '')} onMouseDown=${(ev) => ev.preventDefault()} onClick=${() => setSt({ q: '', cat: id })}>${label}</button>`)}</div>`}
    ${list.length ? html`<div class="emo-grid">${list.map((e) => html`<button key=${e.id} type="button" class="emo-cell" title=${e.n} aria-label=${e.n} onMouseDown=${(ev) => ev.preventDefault()} onClick=${() => insert(e)}><img src=${emoSrc(e)} alt="" draggable="false" /></button>`)}</div>`
      : html`<p class="muted emo-none">Aucun emoji pour « ${st.q.trim()} ».</p>`}
  </div>`;
  return { btn, panel };
}
