/* =========================================================
   UI (Preact + htm)
   ========================================================= */
const { html: htmlRaw, h, render, useState, useEffect, useLayoutEffect, useRef, createContext, useContext } = window.htmPreact;
// 0.29: our stickers in every text the game shows (a status, a chip, a button, a title, a list…), not only in posts and
// messages: a text child with one of our emojis gets its sticker. What a field, a menu or an attribute shows stays as the
// system draws it (it cannot hold an image). Each template looks at what it made itself: a part made by another template
// (or a component's own children, shown by it) was already looked at, or will be.
const EMO_SKIP = new Set(['textarea', 'option', 'optgroup', 'select', 'title', 'style', 'script', 'text', 'tspan', 'textPath']);
function emoKids(v) {
  if (typeof v === 'string') return ANY_EMO.test(v) ? emoNodes(v) : v;
  if (Array.isArray(v)) {
    let out = null;
    for (let i = 0; i < v.length; i++) {
      const x = emoKids(v[i]);
      if (x !== v[i] && !out) out = v.slice(0, i);
      if (out) out.push(x);
    }
    return out || v;
  }
  if (v && typeof v === 'object' && v.props && !v.__emo) {
    v.__emo = 1;
    if (typeof v.type === 'string' && !EMO_SKIP.has(v.type) && v.props.children != null) {
      const c = v.props.children, n = emoKids(c);
      if (n !== c) v.props.children = n;
    }
  }
  return v;
}
const html = (...a) => emoKids(htmlRaw(...a));

const ICONS = {
  smile: '<path d="M22 11v1a10 10 0 1 1-9-10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/><path d="M16 5h6"/><path d="M19 2v6"/>', // 0.31.3: react to a message
  minus: '<path d="M5 12h14"/>', // 0.27.7: the windows
  detach: '<path d="M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4"/><rect width="10" height="7" x="12" y="13" rx="2"/>',
  dock: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/>',
  popout: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>', // 0.27.9: out of the game, and back
  popin: '<path d="M20 4 12 12"/><path d="M12 6v6h6"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  maxi: '<rect width="16" height="16" x="4" y="4" rx="2"/>',
  unmaxi: '<rect width="13" height="13" x="4" y="7" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>', // 0.27.10: back to its size
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  wifi: '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
  wifioff: '<path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  train: '<path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="m9 15-1-1"/><path d="m15 15 1-1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3"/><path d="m16 19 2 3"/>',
  msg: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  coffee: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
  gem: '<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
  sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
  back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  level: '<path d="m17 11-5-5-5 5"/><path d="m17 18-5-5-5 5"/>',
  megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  userplus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
  userminus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6"/>',
  trend: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>',
  mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
  quote: '<path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  hash: '<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  mask: '<path d="M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7h-5a8 8 0 0 0-5 2 8 8 0 0 0-5-2H2Z"/><path d="M6 11c1.5 0 3 .5 3 2-2 0-3 0-3-2Z"/><path d="M18 11c-1.5 0-3 .5-3 2 2 0 3 0 3-2Z"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  ffwd: '<polygon points="13 19 22 12 13 5 13 19"/><polygon points="2 19 11 12 2 5 2 19"/>',
  clapper: '<path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3.1 4"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
  download: '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
  upload: '<path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  studio: '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="m10 7 5 3-5 3Z"/><path d="M8 21h8"/><path d="M12 17v4"/>',
  cash: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  chevup: '<path d="m18 15-6-6-6 6"/>',
  chevdown: '<path d="m6 9 6 6 6-6"/>',
  stack: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/>',
  bulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/>',
  trust: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>'
};
function Icon({ n, s = 22, fill = false }) {
  return html`<svg class="ic" width=${s} height=${s} viewBox="0 0 24 24" fill=${fill ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" dangerouslySetInnerHTML=${{ __html: ICONS[n] || '' }}></svg>`;
}
const onKeys = (fn) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); fn(e); } };
function Avatar({ who, size = 44, onClick }) {
  const st = `--h:${who.hue || 0};width:${size}px;height:${size}px;font-size:${Math.round(size * (who.emoji ? 0.54 : 0.36))}px`;
  const cls = 'av' + (who.photo ? ' av-photo' : who.emoji ? '' : ' av-txt') + (who.kind === 'media' ? ' av-media' : '') + (onClick ? ' av-btn' : '');
  return html`<span class=${cls} style=${st} onClick=${onClick} onKeyDown=${onClick ? onKeys(onClick) : undefined} role=${onClick ? 'button' : undefined} tabindex=${onClick ? 0 : undefined} aria-label=${onClick ? 'Voir le profil de ' + who.name : undefined}>${who.photo ? html`<img src=${who.photo} alt="" loading="lazy" decoding="async" />` : who.emoji || initials(who.name)}</span>`;
}
const Verified = () => html`<svg class="vf" width="15" height="15" viewBox="0 0 24 24" role="img" aria-label="Personnage principal"><path fill="currentColor" d="M12 1.6l2.6 2.1 3.3-.4 1 3.2 3 1.6-1 3.2 1 3.2-3 1.6-1 3.2-3.3-.4L12 22.4l-2.6-2.1-3.3.4-1-3.2-3-1.6 1-3.2-1-3.2 3-1.6 1-3.2 3.3.4z"/><path d="M8.2 12.3l2.5 2.4 5-5" fill="none" stroke="var(--hot-ink)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const Typing = () => html`<span class="typing" aria-hidden="true"><i></i><i></i><i></i></span>`;
function Meter({ frac, tone }) {
  return html`<div class=${'meter' + (tone ? ' ' + tone : '')}><i style=${'--p:' + Math.round(clamp(num(frac), 0, 1) * 100) + '%'}></i></div>`;
}
function RelMeter({ rel }) {
  return html`<div class="relmeter" role="img" aria-label=${'Relation ' + rel}>${rel ? html`<i class=${rel > 0 ? 'pos' : 'neg'} style=${'--p:' + Math.round(Math.abs(rel) / 2) + '%'}></i>` : null}</div>`;
}
const stop = (fn) => (e) => { e.stopPropagation(); fn(e); };
function autosize(el) { if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 140) + 'px'; }
const vibeTag = (c) => (c.vibe && VIBES[c.vibe] && !partnerWord(c) ? ' · ' + VIBES[c.vibe].emoji + ' ' + VIBES[c.vibe].label : '');
const relShown = (c) => (partnerWord(c) ? VIBES[c.vibe].emoji + ' ' + partnerWord(c) : relLabel(c.rel, c.g, c.vibe));

/* ---------- voice mode: the device's own dictation fills the field, the game sends it after a pause ---------- */
const AUTO_MS = 3000;
function loadVoicePref() { try { return localStorage.getItem('hype:voice') === '1'; } catch (e) { return false; } }
function toggleVoice() {
  S.voice = !S.voice;
  try { localStorage.setItem('hype:voice', S.voice ? '1' : '0'); } catch (e) { /* a per-viewer convenience only */ }
  toast(S.voice ? 'Mode vocal activé : dicte ton message, il part tout seul.' : 'Mode vocal désactivé.');
  update(false);
}
function dictationHint() {
  const ua = navigator.userAgent || '';
  const touch = navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod|Android/.test(ua) || (/Macintosh/.test(ua) && touch)) return 'Touche le micro du clavier et parle.';
  if (/Mac/.test(ua)) return 'Appuie deux fois sur Fn (🌐) et parle.';
  if (/Windows/.test(ua)) return 'Appuie sur Windows + H et parle.';
  return 'Lance la dictée de ton clavier et parle.';
}
// Counts down only after the player typed or dictated in this field (not for an old draft, a picked idea or the mode switch).
function useAutoSend(key, val, can, send) {
  const [left, setLeft] = useState(0);
  const timer = useRef(null);
  const armed = useRef(false);
  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    clearInterval(timer.current);
    timer.current = null;
    setLeft(0);
    const text = val.trim();
    if (!S.voice || !can || !text || !armed.current || S.autoSkip[key] === text) return undefined;
    const deadline = Date.now() + AUTO_MS;
    setLeft(AUTO_MS);
    timer.current = setInterval(() => {
      const l = deadline - Date.now();
      if (l > 0) { setLeft(l); return; }
      clearInterval(timer.current);
      timer.current = null;
      setLeft(0);
      armed.current = false;
      S.autoSkip[key] = text;
      sendRef.current();
    }, 100);
    return () => { clearInterval(timer.current); timer.current = null; };
  }, [val, can, S.voice]);
  const cancel = () => { clearInterval(timer.current); timer.current = null; S.autoSkip[key] = val.trim(); armed.current = false; setLeft(0); };
  const arm = () => { armed.current = true; delete S.autoSkip[key]; };
  return [left, cancel, arm];
}
function VoiceChip() {
  return html`<button type="button" class=${'voice-chip' + (S.voice ? ' on' : '')} onClick=${toggleVoice} aria-pressed=${S.voice ? 'true' : 'false'} title="Envoi automatique après une dictée"><${Icon} n="mic" s=${14} /> Mode vocal</button>`;
}
function AutoSendBar({ left, cancel }) {
  if (left > 0) {
    return html`<div class="autosend" role="status">
      <div class="autosend-row"><span>Envoi dans ${Math.ceil(left / 1000)} s…</span><button type="button" class="linkbtn" onClick=${cancel}>Annuler</button></div>
      <${Meter} frac=${1 - left / AUTO_MS} />
    </div>`;
  }
  if (!S.voice) return null;
  return html`<div class="voice-hint"><${Icon} n="mic" s=${14} /><span>${dictationHint()} Ton message part tout seul 3 secondes après.</span></div>`;
}
function RichText({ text, g }) {
  const parts = [];
  const re = /(@[A-Za-z0-9._]{2,30}|#[\p{L}\p{N}_]{2,40}(?![\p{L}\p{N}_]))/gu; // (0.28.1: longer than 40, it is no hashtag: never cut in two)
  let last = 0, m, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(...emoParts(text.slice(last, m.index), 't' + k++ + '-')); // 0.17: our stickers
    const tok = m[0];
    if (tok[0] === '@' && g) {
      const h = normHandle(tok);
      const c = charByHandle(g, h);
      const go = c && c.unlocked ? () => openChar(c.id) : h === g.player.handle ? () => goTab('profile') : null;
      parts.push(html`<span key=${k++} class="mention" role=${go ? 'button' : undefined} tabindex=${go ? 0 : undefined} onClick=${go ? stop(go) : undefined} onKeyDown=${go ? onKeys(go) : undefined}>${tok}</span>`);
    } else if (tok[0] === '#' && g) {
      const go = () => openTag(tok);
      parts.push(html`<span key=${k++} class="tag" role="button" tabindex="0" onClick=${stop(go)} onKeyDown=${onKeys(go)}>${tok}</span>`);
    } else parts.push(html`<span key=${k++} class=${tok[0] === '@' ? 'mention' : 'tag'}>${tok}</span>`);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(...emoParts(text.slice(last), 't' + k++ + '-'));
  return parts;
}

/* ---------- navigation ---------- */
const SCROLL = {};
const VIEW_EL = { current: null };
const TABS = [
  { id: 'feed', icon: 'home', label: 'Fil' },
  { id: 'notifs', icon: 'bell', label: 'Notifs' },
  { id: 'dms', icon: 'msg', label: 'Messages' },
  { id: 'studio', icon: 'studio', label: 'Studio' },
  { id: 'quests', icon: 'trophy', label: 'Quêtes' },
  { id: 'profile', icon: 'user', label: 'Profil' },
];
const TITLES = { feed: 'Fil d’actu', notifs: 'Notifications', dms: 'Messages', studio: 'Studio', quests: 'Quêtes et boutique', profile: 'Profil' };
function goTab(t) {
  const g = S.game;
  if (!g) return;
  if (S.tab === 'notifs' && t !== 'notifs') g.notifReadAt = Date.now();
  if (t === 'notifs' && S.tab !== 'notifs') { S.notifSeenBefore = g.notifReadAt; g.notifReadAt = Date.now(); }
  if (t === S.tab && !layerCovers() && VIEW_EL.current) VIEW_EL.current.scrollTo({ top: 0, behavior: 'smooth' });
  if (t !== S.tab && VIEW_EL.current) SCROLL[S.tab] = VIEW_EL.current.scrollTop;
  closeAllLayers();
  S.tab = t;
  S.fabAway = false; // (the pen is back on another tab)
  update();
}
function openLayer(l) {
  const top = S.stack[S.stack.length - 1];
  if (top && top.t === l.t && top.id === l.id) return;
  const open = S.stack.find((x) => x.t === l.t && x.id === l.id); // 0.28.1: already open lower down: it comes to the front
  if (open) { raiseLayer(open); if (l.t === 'dm' && S.game && S.game.dms[l.id]) S.game.dms[l.id].readAt = Date.now(); return; }
  const docked = S.dock.find((x) => x.t === l.t && x.id === l.id); // 0.27.7: put aside: it comes back as it was left
  if (docked) { unminLayer(docked); return; }
  const out = (S.os || []).find((x) => x.t === l.t && x.id === l.id); // 0.27.9: out of the game: that window comes to the front
  if (out) { try { HOST.winCtl(out.os.name, 'front').catch(() => {}); } catch (e) { /* (closing) */ } if (l.t === 'dm' && S.game && S.game.dms[l.id]) S.game.dms[l.id].readAt = Date.now(); update(false); return; }
  l.key = uid('l');
  S.stack.push(l);
  if (l.t === 'dm' && S.game && S.game.dms[l.id]) S.game.dms[l.id].readAt = Date.now();
  update(false);
}
const resetComposeExtras = () => Object.assign(S.drafts, { photo: null, quote: null, apology: false, accuse: null, cite: [], fake: null, debunk: null, caps: [], plan: null }); // (0.31.2: the box too, never ticked on its own when the composer opens again)
// which: the window whose « Retour » or veil was clicked (0.28.1: that one, not the top one); none (Échap): the top one.
function closeLayer(which) {
  const o = osActive(); // 0.27.9: a close asked from a window out of the game closes that one
  if (o) { osClose(o); return; }
  const k = which && which.key ? S.stack.indexOf(which) : -1;
  const l = k >= 0 ? S.stack.splice(k, 1)[0] : S.stack.pop();
  if (l && l.t === 'dm' && S.game && S.game.dms[l.id]) S.game.dms[l.id].readAt = Date.now();
  if (l && l.t === 'compose') resetComposeExtras();
  if (S.ideas && (!l || l.t === 'compose' || S.ideas.key === l.id)) S.ideas = null;
  update();
}
function closeAllLayers() {
  const keep = []; // 0.27.7: a window floating on a computer stays open from one tab to another (the player works beside it)
  while (S.stack.length) {
    const l = S.stack.pop();
    if (winFloats(l)) { keep.unshift(l); continue; }
    if (l.t === 'dm' && S.game && S.game.dms[l.id]) S.game.dms[l.id].readAt = Date.now();
    if (l.t === 'compose') resetComposeExtras();
  }
  S.stack = keep;
  S.ideas = null;
}
/* ---------- 0.27.7: the windows. On a computer each one can float over the game (which stays usable behind it), moved
   by its title bar and resized by its corner, and its kind keeps its place. Any of them can be put aside in the dock at
   the bottom with everything typed in it, then brought back as it was. A date being played holds the game: it moves and
   resizes, but stays in front, blocks the rest, and is never put aside. On a phone: put aside only. ---------- */
const WinCtx = createContext(null);
const WIN_MIN_W = 320, WIN_MIN_H = 240;
const WIN_MIN_HT = { dm: 380, thread: 360 }; // 0.28.1: a conversation keeps room for its messages above its box
const winMinH = (t) => WIN_MIN_HT[t] || WIN_MIN_H;
const WIN_GRAB = 240; // 0.28.1: pushed to the left, its logo and its title stay in view to catch it back
const winWide = () => typeof window !== 'undefined' && window.innerWidth >= 720; // (0.27.9: from a small laptop or a zoomed app on, not only big screens)
let winWas = winWide(); // (0.27.9: the game window resized across the line: the windows' buttons follow)
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('resize', () => { const w = winWide(); if (w !== winWas) { winWas = w; update(false); } });
const WIN_BAR = 44; // (0.27.9: a floating window goes anywhere, as long as its bar, which moves it, stays on the screen)
function winStore() {
  if (!S.win) { let w = null; try { w = JSON.parse(lsGet('hype:win') || 'null'); } catch (e) { w = null; } S.win = w && typeof w === 'object' ? w : {}; }
  return S.win;
}
function winSet(t, o) { const st = winStore(); st[t] = Object.assign({}, st[t], o); try { lsSet('hype:win', JSON.stringify(st)); } catch (e) { /* (storage off: for this visit) */ } }
const winModal = (l) => !!(l && l.t === 'minigame' && S.game && (S.game.events || []).some((e) => e.id === l.id));
const winFloats = (l) => !!(l && winWide() && !osDesk() && (l.win ? l.win.float : (winStore()[l.t] || {}).float) && !winModal(l)); // (0.27.10: the PC app makes real windows instead)
const layerCovers = () => S.stack.some((l) => !winFloats(l)); // a window over the tab (a floating one leaves it in view)
// Where a kind of window floats: where it was left, always reachable on this screen.
// A window's own place once moved (l.win); a new one takes its kind's, a step aside from the others of its kind.
function winOf(l) {
  if (l.win) return winRect(l.t, l.win);
  const n = S.stack.filter((x) => x !== l && x.t === l.t && S.stack.indexOf(x) < S.stack.indexOf(l) && winFloats(x)).length;
  const R = winRect(l.t);
  return n ? winRect(l.t, Object.assign({}, R, { x: R.x + 28 * n, y: R.y + 28 * n })) : R;
}
function winRect(t, own) {
  const W = own || winStore()[t] || {}, V = viewBox(), vw = V.w, vh = V.h; // (0.27.10: under Hype's bar in the PC app)
  const mh = winMinH(t);
  const w = clamp(Math.round(W.w || Math.min(600, vw - 80)), WIN_MIN_W, Math.max(WIN_MIN_W, vw - 16));
  const h = clamp(Math.round(W.h || Math.min(760, vh - 60)), mh, Math.max(mh, vh - 16));
  const x = clamp(Math.round(W.x != null ? W.x : (vw - w) / 2), WIN_GRAB - w, vw - 120), y = clamp(Math.round(W.y != null ? W.y : (vh - h) / 2), 0, Math.max(0, vh - WIN_BAR));
  return { x, y, w, h, float: !!W.float };
}
function minLayer(l) {
  const k = S.stack.indexOf(l);
  if (k < 0 || winModal(l)) return;
  S.stack.splice(k, 1);
  l.min = true;
  S.dock.push(l);
  update(false);
}
function unminLayer(l) {
  const k = S.dock.indexOf(l);
  if (k < 0) return;
  S.dock.splice(k, 1);
  l.min = false;
  l.back = true; // (it does not slide in again)
  S.stack.push(l);
  update(false);
}
function closeDocked(l) {
  const k = S.dock.indexOf(l);
  if (k < 0) return;
  S.dock.splice(k, 1);
  if (l.t === 'compose') resetComposeExtras();
  update(false);
}
// A floating window clicked under another one comes to the front.
function raiseLayer(l) { const k = S.stack.indexOf(l); if (k >= 0 && k < S.stack.length - 1) { S.stack.splice(k, 1); S.stack.push(l); update(false); } }
// Closes the windows that match, open or put aside.
function dropLayers(fn) { S.stack = S.stack.filter((l) => !fn(l)); S.dock = S.dock.filter((l) => !fn(l)); for (const l of (S.os || []).filter(fn)) { l.os.quiet = true; osClose(l); } } // (0.27.9: out of the game too)
const layerOpen = (fn) => S.stack.some(fn) || S.dock.some(fn) || (S.os || []).some(fn);
const WIN_EMOJI = { feat: '🤝', ach: '🏆', compose: '✏️', dm: '💬', group: '👥', storynew: '📸', minigame: '🎬', series: '📅', shop: '🛍️', merch: '🛍️', gear: '🛒', inv: '📦', sell: '🏷️', resale: '♻️', job: '🧰', thread: '🧵', char: '👤', npc: '👤', tag: '#️⃣', settings: '⚙️', palette: '🎨', practice: '🎮', move: '⏩', later: '🗓️', datelog: '📔', skill: '💪', recruit: '🤝', insta: '📸', tiktok: '🎵' };
/* ---------- 0.27.10: the PC app's own window wears Hype's bar too, instead of the system's title bar: the logo, the
   world being played, reduce, enlarge (or back to its size), close. The bar moves the window (a double click enlarges
   it, as with any window); the game lives under it, in « .app-body », and its windows count their place from there. -- */
const APP_FRAMED = !!(HOST && HOST.frameless && HOST.appCtl);
const APP_ST = { max: false, full: false, focus: true };
if (APP_FRAMED) {
  const take = (s) => { if (s && typeof s === 'object') { Object.assign(APP_ST, s); update(false); } };
  try { HOST.onAppState(take); HOST.appCtl('state').then(take).catch(() => {}); } catch (e) { /* (an older app) */ }
}
function appCtl(act) { try { HOST.appCtl(act).then((s) => { if (s && typeof s === 'object') { Object.assign(APP_ST, s); update(false); } }).catch(() => {}); } catch (e) { /* (closing) */ } }
function AppBar() {
  const g = S.phase === 'game' ? S.game : null, where = g && g.world ? `${g.world.emoji || ''} ${g.world.name || ''}`.trim() : '';
  return html`<header class=${'appbar' + (APP_ST.focus ? '' : ' blur')}>
    <span class="hb-logo" aria-hidden="true">hype</span>
    ${where ? html`<span class="ab-where">${where}</span>` : null}
    <span class="ab-grab"></span>
    <span class="win-btns">
      <button type="button" class="win-btn win-min" onClick=${() => appCtl('min')} aria-label="Réduire Hype" title="Réduire"><${Icon} n="minus" s=${17} /></button>
      <button type="button" class="win-btn win-max" onClick=${() => appCtl('max')} aria-label=${APP_ST.max || APP_ST.full ? 'Remettre Hype à sa taille' : 'Agrandir Hype'} title=${APP_ST.max || APP_ST.full ? 'Remettre à sa taille' : 'Agrandir'}><${Icon} n=${APP_ST.max || APP_ST.full ? 'unmaxi' : 'maxi'} s=${15} /></button>
      <button type="button" class="win-btn win-close" onClick=${() => appCtl('close')} aria-label="Fermer Hype" title="Fermer"><${Icon} n="x" s=${17} /></button>
    </span>
  </header>`;
}
// The room the game has, and where it starts on the screen (under Hype's bar in the PC app).
function viewBox() {
  const b = APP_FRAMED && typeof document !== 'undefined' ? document.querySelector('.app-body') : null;
  if (!b) return { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
  const r = b.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}
/* ---------- 0.27.9: out of the game (the PC app): a window becomes a real window of the system, without its frame (Hype's
   own bar), moved anywhere, a second screen too, resized by its edges. It is the same game: this page fills the window's
   document (its styles copied) and draws the window in it, and it loads nothing and runs nothing of its own. A date, a
   shoot, a mini-game stay in the game (they hold it, and own the keys). ---------- */
const OS_KINDS = ['dm', 'group', 'newgroup', 'thread', 'char', 'npc', 'compose', 'series', 'inv', 'resale', 'sell', 'gear', 'settings', 'palette', 'recruit', 'shop', 'tag', 'skill', 'datelog', 'move', 'later', 'feat', 'agent', 'insta', 'tiktok', 'ach']; // (0.27.10: all but the mini-games)
// The PC app, which can open real windows (the page of the tests keeps its windows inside the game).
function osDesk() { return !!(HOST && HOST.winCtl && typeof window !== 'undefined' && typeof window.open === 'function'); }
const osWinOK = (l) => !!(l && OS_KINDS.includes(l.t) && osDesk());
// Where it opens: where this kind was last left, or beside the game (over its right side when the screen has no room).
function osOpenRect(l) {
  const st = (winStore()[l.t] || {}).os;
  if (st && st.w > 0 && st.h > 0) return st;
  const w = 480, h = Math.round(clamp(window.outerHeight - 80, 480, 760)), sc = window.screen || {};
  let x = window.screenX + window.outerWidth + 8;
  if (x + w > (sc.availLeft || 0) + (sc.availWidth || 1920)) x = window.screenX + Math.max(20, window.outerWidth - w - 40);
  return { x: Math.round(x), y: Math.round(window.screenY + 40), w, h };
}
// The game's look on a window out of it (the theme, the text size: what the page sets on <html> and <body>).
function osLook(d) {
  const src = document.documentElement, dst = d.documentElement;
  for (const a of Array.from(src.attributes)) if (dst.getAttribute(a.name) !== a.value) dst.setAttribute(a.name, a.value);
  for (const a of Array.from(dst.attributes)) if (!src.hasAttribute(a.name)) dst.removeAttribute(a.name);
  const cls = (document.body.className + ' os-win').trim();
  if (d.body && d.body.className !== cls) d.body.className = cls;
  const st = src.getAttribute('style');
  if (st !== dst.getAttribute('style')) { if (st == null) dst.removeAttribute('style'); else dst.setAttribute('style', st); }
}
function osDoc(w) {
  const d = w.document;
  d.open();
  d.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Hype</title></head><body><div id="os-root"></div></body></html>');
  d.close();
  for (const el of Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))) { const c = d.importNode(el, true); if (c.tagName === 'LINK') c.href = el.href; d.head.appendChild(c); }
  osLook(d);
  return d.getElementById('os-root');
}
// opt.at: where on the screen and how big (a window torn out of the game by its bar); opt.follow: it then follows the
// mouse until the button is released (the app moves it: { dx, dy } where its bar is held, its size).
function popOut(l, opt = {}) {
  if (!osWinOK(l) || l.os) return false;
  const name = 'hypewin-' + uid('w').replace(/[^a-z0-9]/gi, '').slice(0, 30), r = opt.at || osOpenRect(l);
  let w = null, root = null;
  try { w = window.open('', name, `popup=1,left=${r.x},top=${r.y},width=${r.w},height=${r.h}`); } catch (e) { w = null; }
  if (!w) return false;
  try { root = osDoc(w); } catch (e) { try { w.close(); } catch (e2) { /* (already gone) */ } return false; }
  S.stack = S.stack.filter((x) => x !== l);
  S.dock = S.dock.filter((x) => x !== l);
  Object.assign(l, { min: false, win: null, os: { name, w, root } });
  (S.os || (S.os = [])).push(l);
  w.addEventListener('pagehide', () => osGone(l));
  for (const ev of ['pointerdown', 'keydown', 'wheel']) w.addEventListener(ev, () => { S.lastInputAt = Date.now(); }, { passive: true, capture: true }); // (the player is here: playing in that window)
  update();
  if (opt.follow) { try { HOST.winCtl(name, 'follow', opt.follow).catch(() => {}); } catch (e) { /* (an older app: it stays where it opened) */ } }
  return true;
}
// Its window closed (its ✕, or the system's): closed in the game too. « Remettre dans le jeu »: a window of the game again.
function osGone(l) {
  const o = l.os;
  if (!o) return;
  try { winSet(l.t, { os: { x: o.w.screenX, y: o.w.screenY, w: o.w.outerWidth, h: o.w.outerHeight } }); } catch (e) { /* (closing) */ }
  try { render(null, o.root); } catch (e) { /* (its document is gone) */ }
  S.os = (S.os || []).filter((x) => x !== l);
  l.os = null;
  if (o.back) { l.back = true; S.stack.push(l); }
  else if (!o.quiet) { // (quiet: closed by the game, which has done what closing does)
    if (l.t === 'dm' && S.game && S.game.dms[l.id]) S.game.dms[l.id].readAt = Date.now();
    if (l.t === 'compose') resetComposeExtras();
  }
  update();
}
// A game entered or left: its windows out of the game close at once, and touch no game (theirs is gone).
function osDropAll() {
  const list = S.os || [];
  S.os = [];
  for (const l of list) {
    const o = l.os;
    l.os = null;
    if (!o) continue;
    try { winSet(l.t, { os: { x: o.w.screenX, y: o.w.screenY, w: o.w.outerWidth, h: o.w.outerHeight } }); } catch (e) { /* (closing) */ }
    try { render(null, o.root); } catch (e) { /* (its document is gone) */ }
    try { o.w.close(); } catch (e) { /* (already gone) */ }
  }
}
// An element by its id, in the game or in a window out of it (a reply box, a field to fill: they may be over there).
function byId(id) {
  const el = document.getElementById(id);
  if (el) return el;
  for (const l of S.os || []) { try { const x = l.os && l.os.w.document.getElementById(id); if (x) return x; } catch (e) { /* (closing) */ } }
  return null;
}
function osClose(l, back) { if (!l || !l.os) return; l.os.back = !!back; try { l.os.w.close(); } catch (e) { osGone(l); } }
const osCloseAll = () => { for (const l of (S.os || []).slice()) osClose(l); };
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('pagehide', () => osCloseAll()); // (the game reloaded or closed: they go with it)
// The window a click came from (the game's own close calls do not know it): the one whose page holds what the event
// touched. (The game's handlers live in this page: the event being handled is this page's « window.event », even when
// what was clicked is over there.)
function osActive() {
  if (OS_ASK.l && OS_ASK.l.os) return OS_ASK.l;
  let d = null;
  try { const ev = window.event; d = ev && ev.target ? ev.target.ownerDocument || null : null; } catch (e) { d = null; }
  if (!d || d === document) return null;
  return (S.os || []).find((x) => { try { return !!(x.os && x.os.w && x.os.w.document === d); } catch (e) { return false; } }) || null;
}
function OsWindows({ g, now }) {
  useLayoutEffect(() => {
    for (const l of S.os || []) {
      if (!l.os || !l.os.root) continue;
      try { osLook(l.os.w.document); render(html`<${WinCtx.Provider} value=${l}><${Layer} l=${l} i=${0} g=${g} now=${now} /><//>`, l.os.root); l.os.w.document.title = (l.title ? l.title + ' · ' : '') + 'Hype'; } catch (e) { /* (closing) */ }
    }
  });
  useEffect(() => () => osCloseAll(), []); // (out of the game: they close with it)
  return null;
}
function Dock() {
  if (!S.dock.length) return null;
  return html`<div class="win-dock" role="toolbar" aria-label="Fenêtres réduites">${S.dock.map((l) => html`<span class="win-chip" key=${l.key}>
    <button type="button" class="wc-open" onClick=${() => unminLayer(l)} title="Rouvrir"><span aria-hidden="true">${WIN_EMOJI[l.t] || '🪟'}</span><b>${l.title || 'Fenêtre'}</b></button>
    <button type="button" class="wc-x" onClick=${() => closeDocked(l)} aria-label=${'Fermer : ' + (l.title || 'la fenêtre')}><${Icon} n="x" s=${14} /></button>
  </span>`)}</div>`;
}
const openPost = (id, focus) => openLayer({ t: 'thread', id, focus: !!focus });
const openChar = (id) => { if (id === 'p') goTab('profile'); else openLayer({ t: 'char', id }); };
const openDM = (id) => openLayer({ t: 'dm', id });
const openShop = () => openLayer({ t: 'shop' });
const openTag = (tg) => openLayer({ t: 'tag', id: tg });
// opts: { text } prefills (e.g. a mention), { quote: postId }, { apology: true }, { accuse: charId }
function openCompose(opts = {}) {
  const d = S.drafts;
  if (opts.accuse || opts.debunk || opts.confess || opts.secAns || opts.merch || opts.pfp || opts.apology || opts.quote) d.contest = false; // 0.29: a post is one thing at a time
  if (opts.accuse && S.game && S.game.chars[opts.accuse]) {
    const c = S.game.chars[opts.accuse];
    if (d.accuse !== c.id) { d.fake = null; d.caps = []; } // a proof made up against someone else does not follow
    Object.assign(d, { accuse: c.id, quote: null, apology: false, photo: null, debunk: null, confess: null, secAns: null, pfp: null });
    d.cite = (S.game.clues || []).filter((k) => k.c === c.id && k.at <= Date.now()).map((k) => k.id);
    if (!d.post.includes('@' + c.handle)) d.post = ('@' + c.handle + ' ' + d.post).slice(0, 280);
  }
  if (opts.debunk && S.game) { // answering a false rumor
    const r = (S.game.rumors || []).find((x) => x.id === opts.debunk);
    if (r) Object.assign(d, { debunk: r.id, accuse: null, quote: null, apology: false, photo: null, fake: null, caps: [], confess: null, secAns: null, pfp: null });
  }
  if (opts.confess && S.game) { // 0.18: confessing one of the player's secrets first
    const sc = secretOf(S.game, opts.confess);
    if (sc && !sc.out) Object.assign(d, { confess: sc.id, secAns: null, accuse: null, debunk: null, quote: null, apology: false, fake: null, caps: [], pfp: null });
  }
  if (opts.secAns && S.game) { // 0.18: answering a secret that came out
    const sc = secretOf(S.game, opts.secAns.id);
    if (sc && sc.out && !sc.out.answer && STANCES[opts.secAns.stance]) Object.assign(d, { secAns: { id: sc.id, stance: opts.secAns.stance }, confess: null, accuse: null, debunk: null, quote: null, apology: false, fake: null, caps: [], pfp: null });
  }
  if (opts.merch && S.game) { // 0.22: the post that launches the merch
    const md = openDrop(S.game);
    if (md && md.id === opts.merch && md.state === 'ready') { Object.assign(d, { merch: md.id, accuse: null, debunk: null, confess: null, secAns: null, apology: false, quote: null, pfp: null }); if (!d.post.trim()) d.post = md.items.every((p) => MERCH[p.k].book) ? '📖 Mon livre est enfin là ! ' : '🛍️ Mon merch est enfin là ! '; }
  }
  if (opts.contest && S.game) { // 0.29: the post that asks the community for designs
    Object.assign(d, { contest: true, merch: null, accuse: null, debunk: null, confess: null, secAns: null, apology: false, quote: null, pfp: null });
    if (!d.post.trim()) d.post = '🎨 Concours ! Proposez-moi le design de mon prochain merch, je choisis le gagnant : ';
  }
  if (opts.pfp && S.game) { // 0.25.1: the post that shows the new profile photo (it takes the draft's photo spot)
    const old = (d.pics || []).filter((x) => x !== opts.pfp.pic);
    for (const x of old) mediaDel(x);
    if (old.length) markDrafts(null, old);
    Object.assign(d, { pfp: opts.pfp.pic, photo: opts.pfp.desc || '', pics: [opts.pfp.pic], diapo: false, see: false, merch: null, accuse: null, debunk: null, confess: null, secAns: null, apology: false, quote: null, fake: null, caps: [] });
    if (!d.post.trim()) d.post = '📸 Nouvelle photo de profil ! ';
  }
  if (opts.text && !d.post.toLowerCase().includes(opts.text.trim().toLowerCase())) d.post = (opts.text + d.post).slice(0, 280);
  if (opts.quote) d.quote = opts.quote;
  if (opts.apology) d.apology = true;
  if (S.stack.some((l) => l.t === 'compose')) { update(false); return; }
  openLayer({ t: 'compose' });
}
function openAuthor(au) { if (au.kind === 'player') goTab('profile'); else if (au.id) openChar(au.id); else if (au.handle) openLayer({ t: 'npc', id: au.handle }); }
function topDMId() { const l = S.stack[S.stack.length - 1]; return l && l.t === 'dm' ? l.id : null; }
// The conversations the player has before the eyes: the one on top, those out of the game (0.27.9).
function dmsShown() { const ids = (S.os || []).filter((l) => l.t === 'dm').map((l) => l.id), top = topDMId(); if (top) ids.push(top); return ids; }
function goFeedTop() {
  if (S.tab !== 'feed') { if (VIEW_EL.current) SCROLL[S.tab] = VIEW_EL.current.scrollTop; S.tab = 'feed'; }
  SCROLL.feed = 0;
  S.feedAtTop = true;
  S.feedSeenAt = Date.now();
  if (VIEW_EL.current) VIEW_EL.current.scrollTop = 0;
}
function scrollFeedTop() {
  S.feedSeenAt = Date.now();
  S.feedAtTop = true;
  if (VIEW_EL.current) VIEW_EL.current.scrollTo({ top: 0, behavior: 'smooth' });
  update(false);
}
function tabBadge(g, id, now) {
  if (id === 'notifs' && S.tab !== 'notifs') return unreadNotifs(g, now);
  if (id === 'dms') return unreadDMs(g, now, dmsShown()) + unreadGroups(g, now); // (0.29: and the groups)
  if (id === 'profile') return g.stats.skillPoints;
  if (id === 'studio') return g.deals.filter((d) => d.state === 'offer').length + (programOf(g) && programOf(g).ok && g.career.prog.state === 'none' ? 1 : 0);
  return 0;
}
// Among the modals that are due, the most important first: a cancel before a level-up.
const MODAL_RANK = { confirm: 0, saves: 0, skip: 0, budget: 0, pfp: 0, visit: 1, secret: 1, secretlie: 1, busted: 1, cancel: 1, clash: 1, leak: 1, rumor: 2, badbuzz: 2, series: 2, money: 3, viral: 3, train: 4, trainend: 4, uncancel: 4, vibe: 5, level: 6 };
function dueModal(now) {
  if (now < S.modalGapUntil) return null;
  let best = null;
  const playing = inMiniGame(); // 0.18: nobody knocks during a shoot or a date being played (0.27.6: and nothing else pops up over it but what the player asked: a confirmation, the saves)
  const top = S.stack[S.stack.length - 1], talking = !!(top && (top.t === 'dm' || top.t === 'compose')); // 0.28.1: a level-up and the like wait for the conversation or the post in front (its card, its « Accepter »)
  for (const m of S.modals) if (m.at <= now && !(playing && (MODAL_RANK[m.t] ?? 9) > 0) && !(talking && (MODAL_RANK[m.t] ?? 9) >= 3) && (!best || (MODAL_RANK[m.t] ?? 9) < (MODAL_RANK[best.t] ?? 9))) best = m;
  return best;
}
function closeModal(m) { S.modals = S.modals.filter((x) => x !== m); S.modalGapUntil = Date.now() + 700; update(false); }

/* ---------- app lifecycle ---------- */
let leaving = Promise.resolve();
// The café budget chosen last time (a new game starts with it).
function savedBudget() { try { const v = Number(localStorage.getItem('hype:budget')); return BUDGETS.some((b) => b.n === v) && localStorage.getItem('hype:budget') !== null ? v : BUDGET_DEFAULT; } catch (e) { return BUDGET_DEFAULT; } }
function startOnboarding() {
  if (!hostReady()) { toast('Connecte-toi à ChatGPT d’abord : c’est lui qui fait parler les personnages.', 'bad', { label: 'Se connecter', run: hostSignIn }); return; }
  S.ob = {
    step: 'world', world: null, custom: '', errors: {}, game: null, live: [], posts: [], error: null, follower: null,
    persona: { name: '', handle: '', handleEdited: false, emoji: pick(PERSONA_EMOJIS), hue: pick(PERSONA_HUES), identity: '', bio: '', start: 'anon', pron: '', chaos: 1, platform: '', budget: savedBudget(), adult: false, careDates: lsGet('hype:careDates') === '1', intensity: INTENSITY[lsGet('hype:intensity')] ? lsGet('hype:intensity') : 'normal', secrets: [] },
  };
  S.phase = 'onboard';
  update(false);
}
async function openGame(id) {
  if (S.busy.load) return;
  S.busy.load = true;
  S.phase = 'loading';
  update(false);
  let g = null, failed = false;
  try { await leaving; g = await loadGameData(id); } catch (e) { console.warn(e); failed = true; }
  S.busy.load = false;
  if (!g) { S.phase = 'home'; toast(failed ? 'Impossible de charger cette partie pour l’instant. Réessaie.' : 'Cette partie est introuvable.', 'bad'); update(false); return; }
  if (g.pendingCast) { // the world was created but the first follower was never picked
    g.ready = true;
    S.ob = { step: 'cast', resumed: true, world: g.world.preset || 'custom', custom: '', errors: {}, game: g, live: [], posts: g.pendingCast.posts || [], error: null, follower: null, persona: Object.assign({}, g.player) };
    S.phase = 'onboard';
    update(false);
    return;
  }
  enterGame(g);
}
function enterGame(g, restore = {}) {
  const t = Date.now();
  osDropAll();
  g.ready = true;
  syncEnergy(g);
  const kept = !restore.hot && S.deskBy && S.deskBy[g.id]; // 0.28.1: back from « Mes parties »: what was being written, the windows put aside
  if (S.deskBy) delete S.deskBy[g.id];
  TOAST_Q.length = 0;
  Object.assign(S, {
    game: g, phase: 'game', tab: restore.tab || 'feed', storyView: null, stack: [], dock: kept ? kept.dock : [], pubDrafts: kept ? kept.pubDrafts : {}, setupDrafts: kept ? kept.setupDrafts : {}, modals: [], toasts: [], ideas: null, fabAway: false, tipLayer: null,
    feedSeenAt: t, feedAtTop: true, lastToastAt: t, notifSeenBefore: g.notifReadAt,
    drafts: kept ? kept.drafts : { post: '', photo: null, quote: null, apology: false, accuse: null, cite: [], fake: null, debunk: null, caps: [], reply: {}, dm: {}, confess: null, secAns: null, conf: {} }, replyTo: kept ? kept.replyTo : {}, autoSkip: {}, catchup: null,
  });
  refreshTrends(g, t);
  for (const k in SCROLL) delete SCROLL[k];
  const away = t - (g.lastSeenAt || g.lastPlayedAt || t);
  if (!restore.hot) absenceGrace(g, g.lastSeenAt || g.lastPlayedAt, t); // 0.30: what came due while the game was closed: from now on
  if (!restore.hot) nrgBack(g, g.lastSeenAt || g.lastPlayedAt, t); // 0.32: closed long enough, the player rested
  if (away > ABSENCE_MS && !restore.hot) {
    const gain = applyAbsence(g, away);
    S.catchup = { ms: away, gain };
    scheduleSave();
  }
  g.lastSeenAt = t;
  if (g.low) syncLow(g, t);
  if (!g.planScan && scanPlans(g)) scheduleSave(); // « je réponds ce soir en live », said before events existed
  bumpLive(t + 2000);
  update(false);
}
function leaveGame() {
  const g = S.game;
  if (g) { // 0.28.1: kept for this visit, for when the game is opened again (« Rien ne se perd »)
    g.lastSeenAt = Date.now();
    if (!S.deskBy) S.deskBy = {};
    S.deskBy[g.id] = { drafts: S.drafts, pubDrafts: S.pubDrafts || {}, setupDrafts: S.setupDrafts || {}, replyTo: S.replyTo || {}, dock: S.dock.filter((l) => !l.os) };
  }
  TOAST_Q.length = 0;
  osDropAll();
  Object.assign(S, { game: null, phase: 'home', stack: [], dock: [], modals: [], toasts: [], ideas: null, catchup: null, storyView: null });
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  update(false);
  leaving = abortFlows().then(() => saveGame(g)); // each flow finishes or undoes itself on g, then g is saved once
}
async function removeGame(g) {
  const id = g.id;
  if (S.deskBy) delete S.deskBy[id];
  osDropAll();
  Object.assign(S, { game: null, phase: 'home', stack: [], dock: [], modals: [], toasts: [], ideas: null, catchup: null });
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  deletedIds.add(id); // nothing may write it back while its flows end
  update(false);
  await abortFlows();
  deleteDone(id, await deleteGame(id), null);
}

// From the home screen: a game deleted without opening it (the open one goes through removeGame).
// 0.27.7: a game gets a name of the player's own (empty: its world's name again).
async function renameGameById(id, name) {
  const n = str(name, 40), sm = S.games.find((x) => x.id === id);
  if (!sm) return;
  sm.title = n;
  update(false);
  try {
    if (S.game && S.game.id === id) { if (n) S.game.title = n; else delete S.game.title; scheduleSave(); return; }
    const core = await Store.read('g_' + id);
    if (!core) throw { code: 'not_found' };
    if (n) core.title = n; else delete core.title;
    await Store.write('g_' + id, core);
    await writeIndex(null, true);
  } catch (e) { console.warn('rename', e && (e.code || e.message)); toast('Impossible de renommer cette partie pour l’instant. Réessaie.', 'bad'); }
}
async function removeGameById(id) {
  if (S.game && S.game.id === id) return removeGame(S.game);
  const sm = S.games.find((x) => x.id === id) || null;
  if (S.deskBy) delete S.deskBy[id]; // (0.28.1: what was kept of it for this visit)
  deletedIds.add(id);
  S.games = S.games.filter((x) => x.id !== id); // out of the list at once
  update(false);
  await leaving; // a game just left finishes saving first (nothing more is written once it is marked deleted)
  deleteDone(id, await deleteGame(id), sm);
}
// Not everything could be erased (connection lost…): the game stays in the list, to delete again.
function deleteDone(id, ok, sm) {
  if (ok) toast('Partie supprimée.');
  else {
    deletedIds.delete(id);
    if (sm && !S.games.some((x) => x.id === id)) S.games = S.games.concat(sm).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    toast('La suppression n’a pas pu aller jusqu’au bout (connexion ?) : réessaie.', 'bad');
  }
  update(false);
}

/* ---------- root ---------- */
function App() {
  const [, setTick] = useState(0);
  renderApp = () => setTick((x) => x + 1);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const m = S.phase === 'game' ? dueModal(Date.now()) : null;
      if (m) { if (!STICKY_MODALS.includes(m.t)) closeModal(m); } // 0.18: a visit is not closed that way
      else if (S.stack.length) { const top = S.stack[S.stack.length - 1]; if (top.onBack) top.onBack(); else closeLayer(); } // (0.28.1: a page of its own, a photo open: back to the grid first)
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const now = S.now;
  let main = null;
  if (S.phase === 'home') main = html`<${Home} now=${now} />`;
  else if (S.phase === 'onboard') main = html`<${Onboarding} now=${now} />`;
  else if (S.phase === 'game' && S.game) main = html`<${Game} g=${S.game} now=${now} />`;
  else if (S.phase === 'atelier') main = html`<${Atelier} now=${now} />`;
  else main = html`<${Splash} />`;
  const body = html`${main}<${HostModal} /><${Toasts} now=${now} />`;
  return APP_FRAMED && !APP_ST.full ? html`<${AppBar} /><div class="app-body">${body}</div>` : APP_FRAMED ? html`<div class="app-body">${body}</div>` : body; // (0.27.10)
}
function Splash() {
  return html`<div class="splash"><span class="wm wm-xl">hype<i></i></span><${Typing} /></div>`;
}
// 0.15: the toasts sit at the bottom, just above what is there: the tab bar, or the box where the player writes (a
// conversation, a thread), so they never cover the clock or a conversation's header, nor what is being typed.
function toastBottom() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return null;
  if (document.querySelector('.modal .modal-card')) return 16; // (0.28.1: a window in front: under it, where there is room, see toastHold)
  const layers = document.querySelectorAll('.layer:not(.min)'); // (0.28.1: a window put aside is not the one in front)
  const top = layers.length ? layers[layers.length - 1] : null;
  const fab = top ? null : document.querySelector('.shell .fab:not(.away)'); // (the pen: just above it)
  const bar = top ? top.querySelector('.layer-foot') : fab && fab.offsetParent ? fab : document.querySelector('.shell .tabbar');
  let b = !bar || !bar.offsetParent ? 24 : Math.max(12, Math.round(window.innerHeight - bar.getBoundingClientRect().top + 10));
  const dock = (!top || top.classList.contains('float')) && document.querySelector('.win-dock'); // 0.28.1: above the windows put aside, too
  const dr = dock ? dock.getBoundingClientRect() : null;
  if (dr && dr.height) b = Math.max(b, Math.round(window.innerHeight - dr.top + 10));
  return b;
}
// 0.28.1: the toasts wait their turn: two at a time, the others after (their time starts when they show), an
// achievement or a quest first. None over the buttons of a window in front (they wait for it), none lost in a burst.
const TOAST_ON = 2;
const TOAST_BUSY = 3500; // (others waiting: the ones on screen make room after that long)
const TOAST_STALE = 20000; // (waited that long: old news, its notification stays in the tab; never an achievement or a quest)
const TOAST_Q = []; // the notifications' toasts, let in as room is made (the game keeps four at most)
const toastFirst = (x) => !!(x.pri || (x.action && x.action.ach) || /^Quête réussie/.test(x.text || ''));
// A modal whose buttons would be under the toasts (no room left under its card): they wait for it to close.
function toastHold() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false;
  const card = document.querySelector('.modal .modal-card');
  return !!card && window.innerHeight - card.getBoundingClientRect().bottom < 140;
}
// What must be read whatever the rush: an achievement, a quest, and a warning with something to do (« Exporter »)
const toastKeep = (x) => toastFirst(x) || !!(x.action && x.kind === 'bad');
function toastsOn(now) {
  const shown = S.phase === 'game' ? dmsShown() : [];
  const hold = toastHold(), wait = [];
  let on = [];
  for (const x of S.toasts) {
    if (x.from > now || (x.action && x.action.dm && shown.includes(x.action.dm))) continue; // (no « X t’a écrit » over X’s conversation)
    if (!x.seen) x.seen = now;
    if (x.on && !hold) { if (x.until > now) on.push(x); }
    else if (!x.on && !toastKeep(x) && now - x.seen > TOAST_STALE) x.until = 0; // (gone with the next tick)
    else wait.push(x);
  }
  if (wait.length && !hold) { for (const x of on) if (!toastKeep(x)) x.until = Math.min(x.until, x.from + TOAST_BUSY); on = on.filter((x) => x.until > now); }
  wait.sort((a, b) => (toastFirst(b) - toastFirst(a)) || (toastFirst(a) ? b.seen - a.seen : 0)); // (an achievement or a quest first, the latest first; the rest in order)
  while (!hold && on.length < TOAST_ON && wait.length) { const x = wait.shift(), d = x.until - x.from; Object.assign(x, { on: true, from: now, until: now + d }); on.push(x); }
  for (const x of wait) { const d = x.until - x.from; x.from = now; x.until = now + d; } // (waiting: their time has not started)
  return on;
}
function Toasts({ now }) {
  const list = toastsOn(now);
  if (!list.length) return null;
  const b = toastBottom();
  return html`<div class="toasts" role="status" aria-live="polite" style=${b == null ? undefined : 'bottom:' + b + 'px'}>${list.map((t) => html`<div key=${t.id} class=${'toast ' + t.kind} onClick=${() => { t.until = 0; update(false); }}>
    ${t.action && t.action.ach && ACH_BY[t.action.ach] ? html`${achIcon(ACH_BY[t.action.ach], 24, 'toast-ic')}<span>${emoParts(t.text.replace(/^🏆\s*/, ''))}</span>` : html`<span>${emoParts(t.text)}</span>`}
    ${t.action ? html`<button onClick=${stop(() => { t.until = 0; t.action.run(); update(false); })}>${t.action.label}</button>` : null}
  </div>`)}</div>`;
}

/* ---------- home ---------- */
const PREVIEW = [
  { name: 'La Gazette de Lumen', handle: 'gazette_lumen', emoji: '📰', hue: 265, kind: 'media', text: 'EXCLU : un nouvel étudiant aurait fait léviter tout le réfectoire ce midi. On enquête 👀 #Lumen', likes: 1240, rps: 210, replies: 86, time: '6 min' },
  { name: 'Zara Vey', handle: 'zara.vey', emoji: '🦊', hue: 20, verified: true, text: 'le jour où quelqu’un me battra en duel n’est pas encore arrivé. bonne chance au nouveau, il va en avoir besoin', likes: 312, rps: 18, replies: 41, time: '3 min' },
  { name: 'Mila Flux', handle: 'mila.flux', emoji: '🌙', hue: 225, me: true, text: '@zara.vey demain 8h, cour des Glycines. ramène tes lunettes de soleil', likes: 158, rps: 27, replies: 23, time: 'à l’instant', res: { fol: 48, xp: 34, verdict: 'Ça buzz fort' } },
];
function PreviewPost({ p }) {
  return html`<article class="post">
    <${Avatar} who=${p} />
    <div class="post-body">
      <div class="post-head"><span class="post-name">${p.name}</span>${p.verified ? html`<${Verified} />` : null}<span class="post-handle">@${p.handle}</span><span class="post-time">· ${p.time}</span></div>
      <p class="post-text"><${RichText} text=${p.text} g=${null} /></p>
      ${p.res ? html`<div class="res"><span class="chip good">+${p.res.fol} abonnés</span><span class="chip hot">+${p.res.xp} XP</span><span class="chip">${p.res.verdict}</span></div>` : null}
      <div class="post-actions">
        <span class="act"><${Icon} n="msg" s=${18} /><span>${p.replies}</span></span>
        <span class="act"><${Icon} n="repeat" s=${18} /><span>${fmtN(p.rps)}</span></span>
        <span class="act"><${Icon} n="heart" s=${18} /><span>${fmtN(p.likes)}</span></span>
      </div>
    </div>
  </article>`;
}
/* ---------- a game as one file (to keep, or to take to another computer) ---------- */
const canFiles = () => !!(HOST && HOST.saveFile && HOST.openFile);
async function exportGame(id) {
  try {
    const text = await exportGameText(id);
    const sm = S.games.find((x) => x.id === id) || (S.game && S.game.id === id ? summarize(S.game) : null);
    if (await HOST.saveFile(exportName(sm), text)) toast('Partie exportée : « Importer une partie » la reprend, sur cet ordi ou sur un autre.');
  } catch (e) { toast('L’export n’a pas marché. Réessaie.', 'bad'); }
}
async function importGame() {
  let f = null;
  try { f = await HOST.openFile(); } catch (e) { f = null; }
  if (!f || !f.text) return;
  try { const g = await importGameText(f.text); toast(`Partie importée : ${g.world.emoji} ${g.world.name}.`, 'good'); }
  catch (e) { toast(importErr(e), 'bad'); }
  update(false);
}
const importErr = (e, what = 'Ce fichier') => (e && e.code === 'full' ? `Tu as déjà ${MAX_GAMES} parties : supprime-en une d’abord.` : e && e.code === 'invalid' ? `${what} n’est pas une partie Hype.` : 'L’import n’a pas marché. Réessaie.');
// (0.29: the app's own files; without them, the page of the tests, there is nothing to export to)
function exportAny(id) { if (canFiles()) exportGame(id); }
function importAny() { if (canFiles()) importGame(); }

/* ---------- ChatGPT (desktop app): the way in, the account, the plan in use ---------- */
const SESSION_ERR = {
  cancelled: 'Connexion annulée.', sign_in_failed: 'La connexion n’a pas abouti. Réessaie.', connection_busy: 'Une connexion est déjà en cours.',
  network_error: 'Impossible de joindre ChatGPT. Vérifie ta connexion.', access_denied: 'Connexion refusée dans le navigateur. Tu peux réessayer quand tu veux.',
  browser_unavailable: 'Impossible d’ouvrir ton navigateur pour te connecter.', callback_port_unavailable: 'Une autre copie de Hype est peut-être ouverte : ferme-la et réessaie.',
  storage_encryption_unavailable: 'Ton ordinateur ne permet pas de protéger la connexion à ChatGPT (trousseau du système indisponible).',
  storage_invalid: 'Le fichier de connexion à ChatGPT est abîmé : reconnecte-toi.',
};
function GptMark({ s = 20 }) {
  const a = HOST && HOST.assets ? HOST.assets : {};
  return html`<span class="gpt-mark" aria-hidden="true"><img class="m-dark" src=${a.markBlack} alt="" width=${s} height=${s} /><img class="m-light" src=${a.markWhite} alt="" width=${s} height=${s} /></span>`;
}
// The plan indicator: next to the composer and the model choice, always with « Gérer l'usage ».
function GptPlanLine() {
  return html`<span class="gpt-plan"><${GptMark} s=${16} /><span>Utilise ton abonnement ChatGPT</span><span aria-hidden="true">·</span><button type="button" class="linkbtn" onClick=${() => HOST.openUsage()}>Gérer l’usage</button></span>`;
}
function GptConnect() {
  return html`<button type="button" class="btn gpt-btn" onClick=${hostSignIn} disabled=${S.host.busy}><${GptMark} />${S.host.busy ? 'Termine la connexion dans ton navigateur…' : 'Continuer avec ChatGPT'}</button>`;
}
function GptPanel() {
  const ss = S.host.session;
  if (!ss) return html`<div class="gpt-panel"><${Typing} /></div>`;
  if (ss.status === 'connected' && ss.sharing) {
    return html`<div class="gpt-panel ok">
      <${GptMark} s=${22} />
      <div class="gpt-mid"><b>Connecté à ChatGPT</b><small>${(ss.identity && ss.identity.email) || ss.profileLabel || ''}</small></div>
      <button type="button" class="linkbtn" onClick=${() => HOST.openUsage()}>Gérer l’usage</button>
    </div>`;
  }
  const keyring = ss.error && /^storage_/.test(ss.error.code || '');
  const why = ss.status === 'connected' ? 'Ton compte est connecté, mais Hype n’a pas le droit d’utiliser ton abonnement. Reconnecte-toi en l’acceptant.'
    : ss.status === 'reauth_required' && !keyring ? 'Ta connexion à ChatGPT a expiré : reconnecte-toi.'
    : 'Ici, les personnages parlent grâce à ton abonnement ChatGPT (Go, Plus ou Pro) : rien à payer en plus, aucune clé à créer.';
  const err = ss.error && ss.error.code !== 'cancelled' ? SESSION_ERR[ss.error.code] || aiErrorText({ code: ss.error.code }) : '';
  return html`<div class="gpt-panel">
    <p>${why}</p>
    <${GptConnect} />
    ${err ? html`<small class="err">${err}</small>` : null}
    ${S.host.busy ? html`<button type="button" class="linkbtn" onClick=${() => HOST.cancelSignIn()}>Annuler</button>` : null}
  </div>`;
}
function GptSettings() {
  const ss = S.host.session || {};
  const models = S.host.models;
  return html`<div class="field gpt-settings">
    <span class="lbl">ChatGPT</span>
    <${GptPlanLine} />
    ${models.length ? html`<label class="gpt-model"><span>Modèle</span><select class="input" value=${S.host.prefs.model || models[0].slug} onChange=${(ev) => setHostModel(ev.target.value)}>${models.map((m) => html`<option key=${m.slug} value=${m.slug}>${m.displayName || m.slug}</option>`)}</select></label>` : null}
    <small>${ss.status === 'connected' ? html`Connecté : ${(ss.identity && ss.identity.email) || ss.profileLabel || 'ton compte'} · <button type="button" class="linkbtn" onClick=${hostSignOut} disabled=${S.host.busy}>Se déconnecter</button>` : html`Pas connecté · <button type="button" class="linkbtn" onClick=${hostSignIn} disabled=${S.host.busy}>Continuer avec ChatGPT</button>`}</small>
  </div>`;
}
function HostModal() {
  const m = S.hostModal;
  if (!m || !HOST) return null;
  const close = () => { S.hostModal = null; update(false); };
  let card = null;
  if (m.t === 'gpt-welcome') {
    card = html`<div class="modal-card">
      <div class="modal-big" aria-hidden="true"><${GptMark} s=${44} /></div>
      <div class="modal-title">Hype utilise ton abonnement ChatGPT</div>
      <p>Les personnages répondent grâce à ton abonnement : chaque réponse compte dans l’usage inclus dans ton abonnement ChatGPT, sans rien payer en plus. Tu peux voir et limiter cet usage dans les réglages de ChatGPT.</p>
      <button class="btn btn-hot" onClick=${close}>Compris</button>
      <button class="btn btn-ghost" onClick=${() => HOST.openUsage()}>Gérer l’usage</button>
    </div>`;
  } else if (m.t === 'gpt-limit') {
    card = html`<div class="modal-card">
      <div class="modal-big" aria-hidden="true"><${GptMark} s=${44} /></div>
      <div class="modal-title">Limite d’usage atteinte</div>
      <p>Les personnages ne peuvent plus répondre pour l’instant. La limite vient de ton abonnement ChatGPT, ou de celle que tu as fixée pour Hype dans les réglages de ChatGPT.</p>
      <button class="btn btn-hot" onClick=${() => { HOST.openUsage(); close(); }}>Gérer l’usage</button>
      <button class="btn btn-ghost" onClick=${close}>Fermer</button>
    </div>`;
  }
  if (!card) return null;
  return html`<div class="modal host-modal" role="dialog" aria-modal="true" onClick=${(e) => { if (e.target === e.currentTarget) close(); }}>${card}</div>`;
}

/* ---------- 0.32: « Comment ça marche ? », the game told in a minute, from the home screen ----------
   Eight steps a child would follow (the game is for adults, the words are for everyone): a scene made of what the game
   already shows (its avatars, its stickers, its icons, the clock and the energy of the status strip), a title, a
   sentence or two. Never a word on what is meant to surprise: who the characters really are is for the game to tell. */
const tutoEmo = (e, k) => emoParts(e, 'tu' + k); // (the game's own stickers, the phone's emoji otherwise)
const tutoNb = (t) => String(t || '').replace(/ ([:;!?»])/g, '\u00a0$1').replace(/« /g, '«\u00a0'); // (never a line that starts with « : » or « ? »)
const TutoAv = ({ e, h, s = 40 }) => html`<${Avatar} who=${{ emoji: e, hue: h, name: '' }} size=${s} />`;
const TUTO_CAST = [['🦊', 20], ['🎧', 200], ['🦋', 265], ['😎', 140]];
const TUTO_STEPS = [
  { h: 330, title: 'Tout le monde est une IA… sauf toi', text: 'Hype, c’est un réseau social version jeu. Les persos sont joués par l’IA : ils lisent tes posts, te répondent, t’écrivent… et se souviennent de toi.',
    scene: () => html`<div class="ts-crowd">
      ${TUTO_CAST.slice(0, 2).map(([e, h]) => html`<div class="ts-who" key=${e}><${TutoAv} e=${e} h=${h} s=${44} /><span class="ts-tag">IA</span></div>`)}
      <div class="ts-who ts-me"><${TutoAv} e="🙂" h=${330} s=${72} /><span class="ts-tag hot">Toi</span></div>
      ${TUTO_CAST.slice(2).map(([e, h]) => html`<div class="ts-who" key=${e}><${TutoAv} e=${e} h=${h} s=${44} /><span class="ts-tag">IA</span></div>`)}
    </div>` },
  { h: 265, title: 'Ta partie en 3 étapes', text: 'Choisis un monde (ou invente le tien), crée ton perso, puis choisis ton tout premier abonné.', more: 'Hype est réservé aux 18 ans et plus.',
    scene: () => html`<div class="ts-steps">${[['✨', 'Un monde'], ['🙂', 'Ton perso'], ['⭐', '1er abonné']].map(([e, lb], k) => html`
      ${k ? html`<span class="ts-arrow" key=${'a' + k}><${Icon} n="back" s=${18} /></span>` : null}
      <div class="ts-step" key=${lb}><i>${k + 1}</i><span class="ts-big">${tutoEmo(e, 's' + k)}</span><b>${lb}</b></div>`)}</div>` },
  { h: 20, title: 'Poste, discute, sors, crée', text: 'Tout ce que tu fais te rapporte des abonnés et de l’XP. Avec assez d’XP, tu montes de niveau : des gemmes pour la boutique… et un nouveau perso.',
    scene: () => html`<div class="ts-acts">
      <div class="ts-tiles">${[['pen', 'Poster'], ['msg', 'Écrire'], ['heart', 'Sortir'], ['studio', 'Filmer'], ['trophy', 'Quêtes']].map(([n, lb]) => html`<div class="ts-tile" key=${n}><${Icon} n=${n} s=${24} /><span>${lb}</span></div>`)}</div>
      <div class="ts-res"><span class="chip good">+48 abonnés</span><span class="chip hot">+34 XP</span><span class="chip ts-lv">Niveau 2 !</span></div>
    </div>` },
  { h: 200, title: 'Les persos arrivent petit à petit', text: 'Au début, tu en rencontres une poignée. Ensuite, à chaque niveau gagné, quelqu’un de nouveau débarque : le premier arrive vite, les suivants un peu plus tard.', more: 'Et parfois, l’histoire en amène d’autres.',
    scene: () => html`<div class="ts-tl">
      <div class="ts-stop"><div class="ts-pt ts-pile">${TUTO_CAST.map(([e, h]) => html`<${TutoAv} key=${e} e=${e} h=${h} s=${27} />`)}</div><span class="ts-tag">Au début</span></div>
      ${[['🐺', 230, 2], ['🌻', 45, 3], ['🐙', 300, 4]].map(([e, h, n]) => html`<div class="ts-stop" key=${n}><div class="ts-pt"><span class="ts-new"><${TutoAv} e=${e} h=${h} s=${40} /><i>+1</i></span></div><span class="ts-tag">Niveau ${n}</span></div>`)}
      <div class="ts-stop"><div class="ts-pt"><span class="ts-etc">…</span></div><span class="ts-tag">etc.</span></div>
    </div>` },
  { h: 45, title: 'Des gentils… et des moins gentils', text: 'Chacun a son caractère et sa vie. Certains deviendront tes amis, ton crush ou tes fans. D’autres seront jaloux, rivaux, ou pas très sympas.', more: 'Il en arrive des deux sortes, tout au long de la partie. À toi de voir avec qui tu t’entends !',
    scene: () => html`<div class="ts-split">
      <div class="ts-side good"><span class="ts-row">${tutoEmo('😊🤝🥰', 'g')}</span><b>Amis · crush · fans</b></div>
      <div class="ts-side bad"><span class="ts-row">${tutoEmo('😤🙄😈', 'b')}</span><b>Rivaux · jaloux · rageux</b></div>
    </div>` },
  { h: 225, title: 'Le temps passe pour de vrai', text: 'Chaque action prend un peu de temps. Ton énergie baisse dans la journée : dors pour la recharger. Les persos aussi ont leur vie : ils travaillent, dorment, et ne répondent pas toujours tout de suite.', more: 'Pressé ? Appuie sur l’horloge pour avancer le temps.',
    scene: () => html`<div class="ts-time">
      <div class="ts-day"><span class="ts-big">${tutoEmo('☀️', 'd')}</span><i class="ts-bar"></i><span class="ts-big">${tutoEmo('🌙', 'n')}</span></div>
      <div class="ts-pills"><span class="clock-btn"><${Icon} n="clock" s=${15} /><b>23:40</b><span>mardi</span><${Icon} n="ffwd" s=${13} /></span><span class="fit-chip fatigue"><span class="fit-bat"><i style="width:25%"></i></span><b>25 %</b></span></div>
      <div class="ts-durs"><span class="chip"><${Icon} n="msg" s=${14} />Message · 5 min</span><span class="chip"><${Icon} n="pen" s=${14} />Post · 15 min</span><span class="chip"><${Icon} n="clapper" s=${14} />Vidéo · des heures</span></div>
    </div>` },
  { h: 345, title: 'Les relations prennent du temps', text: 'Pour devenir proches, il faut se parler et se voir. Chacun son rythme : pour se mettre en couple, compte en général une à deux semaines de jeu.', more: 'Trop de rendez-vous d’un coup, ou soudain plus rien ? Ça peut surprendre.',
    scene: () => html`<div class="ts-love">
      <span class="chip ts-cal"><${Icon} n="calendar" s=${14} />Souvent 1 à 2 semaines de jeu</span>
      <div class="ts-hs">
        <div class="ts-h s1"><span>${tutoEmo('🤍', '1')}</span><b>Inconnus</b></div><i class="ts-dash"></i>
        <div class="ts-h s2"><span>${tutoEmo('💞', '2')}</span><b>Proches</b></div><i class="ts-dash"></i>
        <div class="ts-h s3"><span>${tutoEmo('❤️', '3')}</span><b>En couple</b></div>
      </div>
    </div>` },
  { h: 300, title: 'Prêt ? C’est parti !', tips: [['save', 'Le jeu sauvegarde tout seul. Tu peux même revenir en arrière.'], ['coffee', `Les persos parlent grâce à ton abonnement ${AI_NAME}. Les cafés montrent ce qu’ils utilisent, et reviennent chaque jour.`]],
    scene: () => html`<div class="ts-go"><span class="ts-sp a">${tutoEmo('✨', 'a')}</span><span class="ts-rocket">${tutoEmo('🚀', 'r')}</span><span class="ts-sp b">${tutoEmo('🎉', 'b')}</span><span class="ts-sp c">${tutoEmo('✨', 'c')}</span></div>` },
];
// The box on the home screen that opens it.
function TutoOpen({ onOpen }) {
  return html`<button type="button" class="tuto-open" onClick=${onOpen}>
    <span class="to-ic" aria-hidden="true">?</span>
    <span class="to-txt"><b>Comment ça marche ?</b><small>Le jeu expliqué en 1 minute, en images.</small></span>
    <span class="to-go" aria-hidden="true"><${Icon} n="back" s=${20} /></span>
  </button>`;
}
// canNew: a game can be created from here (else the last step says why, when there is something to do, and closes).
function Tuto({ onClose, canNew, why = '' }) {
  const [st, setSt] = useState({ i: 0, dir: '' });
  const N = TUTO_STEPS.length, i = st.i, s = TUTO_STEPS[i], last = i === N - 1;
  const go = (k) => { const j = Math.max(0, Math.min(N - 1, k)); if (j !== i) setSt({ i: j, dir: j > i ? 'fwd' : 'back' }); };
  const main = useRef(null), swipe = useRef(null);
  useEffect(() => { // (on the main button when it opens, and whenever the focus was lost: never taken from a dot)
    const a = document.activeElement;
    if (main.current && (!a || a === document.body || !a.closest('.tuto'))) main.current.focus({ preventScroll: true });
  }, [i]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i]);
  const down = (e) => { swipe.current = { x: e.clientX, y: e.clientY }; };
  const up = (e) => { // (a finger slid sideways: the next step, or the one before)
    const w = swipe.current;
    swipe.current = null;
    if (!w) return;
    const dx = e.clientX - w.x, dy = e.clientY - w.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) go(i + (dx < 0 ? 1 : -1));
  };
  const start = () => { onClose(); startOnboarding(); };
  return html`<div class="modal tuto-modal" role="dialog" aria-modal="true" aria-labelledby="tuto-t" aria-describedby="tuto-d" onClick=${(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div class="modal-card tuto" style=${'--h:' + s.h} onPointerDown=${down} onPointerUp=${up} onPointerCancel=${() => { swipe.current = null; }}>
      <button type="button" class="iconbtn tuto-x" onClick=${onClose} aria-label="Fermer l’explication"><${Icon} n="x" s=${20} /></button>
      <div class="tuto-scene" key=${'s' + i} aria-hidden="true">${s.scene()}</div>
      <div class="tuto-bodies">${TUTO_STEPS.map((x, k) => { // (all of them in the same place, only one seen: the card keeps the height of the longest, its buttons never move)
        const on = k === i;
        return html`<div key=${k} class=${'tuto-body' + (on ? ' on ' + st.dir : '')} aria-hidden=${on ? undefined : 'true'}>
          <p class="eyebrow">Comment ça marche · ${k + 1} sur ${N}</p>
          <h2 class="tuto-title" id=${on ? 'tuto-t' : undefined}>${tutoNb(x.title)}</h2>
          <div id=${on ? 'tuto-d' : undefined} class="stack" style="gap:8px">
            ${x.text ? html`<p class="tuto-text">${tutoNb(x.text)}</p>` : null}
            ${x.tips ? html`<div class="tuto-tips">${x.tips.map(([n, t]) => html`<div class="tuto-tip" key=${n}><span class="tt-ic"><${Icon} n=${n} s=${18} /></span><p>${tutoNb(t)}</p></div>`)}</div>` : null}
            ${x.more ? html`<p class="tuto-more">${tutoNb(x.more)}</p>` : null}
            ${k === N - 1 && !canNew && why ? html`<p class="tuto-more tuto-why">${tutoNb(why)}</p>` : null}
          </div>
        </div>`;
      })}</div>
      <div class="tuto-dots">${TUTO_STEPS.map((x, k) => html`<button type="button" key=${k} class=${k === i ? 'on' : ''} onClick=${() => go(k)} aria-label=${`Étape ${k + 1} sur ${N}\u00a0: ${x.title}`} aria-current=${k === i ? 'step' : undefined}></button>`)}</div>
      <div class="tuto-nav">
        ${i > 0 ? html`<button type="button" key="prev" class="btn btn-ghost" onClick=${() => go(i - 1)}>Précédent</button>` : html`<button type="button" key="later" class="btn btn-ghost" onClick=${onClose}>Plus tard</button>`}
        ${!last ? html`<button type="button" key="next" class="btn btn-hot" ref=${main} onClick=${() => go(i + 1)}>Suivant</button>`
          : canNew ? html`<button type="button" key="go" class="btn btn-hot" ref=${main} onClick=${start}>Créer ma partie</button>`
          : html`<button type="button" key="ok" class="btn btn-hot" ref=${main} onClick=${onClose}>Compris !</button>`}
      </div>
    </div>
  </div>`;
}
function Home({ now }) {
  const games = S.games;
  const full = games.length >= MAX_GAMES;
  const blocked = full || S.store === 'pending' || S.indexError;
  const [del, setDel] = useState(null); // { s: the game's summary, at: when the question showed }
  useEffect(() => {
    if (!del) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setDel(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [del]);
  const confirmDel = () => { if (!del || Date.now() - del.at < 450) return; const id = del.s.id; setDel(null); removeGameById(id); };
  const [ren, setRen] = useState(null); // 0.27.7: { id, text }: a game being renamed
  const renOK = () => { if (!ren) return; renameGameById(ren.id, ren.text); setRen(null); };
  const [tuto, setTuto] = useState(false); // 0.32: « Comment ça marche ? » open
  const tutoClose = () => { setTuto(false); setTimeout(() => { const b = document.querySelector('.tuto-open'); if (b) b.focus({ preventScroll: true }); }, 0); };
  const canNew = !blocked && hostReady();
  const noNew = canNew ? '' : !hostReady() ? `Pour créer ta partie, connecte d’abord ${AI_NAME} sur l’accueil : c’est lui qui fait parler les personnages.` : full ? `Tu as déjà ${MAX_GAMES} parties : supprime-en une pour en créer une autre.` : '';
  return html`<div class="screen"><div class="screen-in">
    ${games.length ? html`<div class="screen-top">
      <span class="wm">hype<i></i></span>
      <button class="btn btn-hot btn-sm" onClick=${startOnboarding} disabled=${blocked || !hostReady()}><${Icon} n="plus" s=${16} /> Nouvelle partie</button>
    </div>` : null}
    ${HOST && games.length ? html`<${GptPanel} />` : null}
    ${S.ai === 'unavailable' ? html`<div class="notice bad"><${Icon} n="alert" /><p>Connecte-toi à ChatGPT pour que les personnages prennent vie.</p></div>` : null}
    ${S.indexError ? html`<div class="notice bad"><${Icon} n="alert" /><div class="stack" style="gap:8px"><p>Impossible de lire tes parties pour l’instant. Elles ne sont pas perdues.</p><div class="row"><button class="btn btn-hot btn-sm" onClick=${retryIndex}>Réessayer</button></div></div></div>` : null}
    ${games.length ? html`<section class="stack">
        <h1 class="h-lg">Tes parties</h1>
        <div class="saves">${games.map((s) => html`<div key=${s.id} class="save-wrap">
          ${ren && ren.id === s.id ? html`<div class="save save-renaming">
            <span class="save-tile" style=${'--h:' + (s.hue == null ? 300 : s.hue)}>${s.emoji}</span>
            <input class="input" maxlength="40" value=${ren.text} placeholder=${s.world} aria-label="Nom de la partie" ref=${(el) => { if (el && !el.dataset.f) { el.dataset.f = '1'; el.focus(); el.select(); } }}
              onInput=${(e) => setRen({ id: s.id, text: e.target.value })} onKeyDown=${(e) => { if (e.key === 'Enter') renOK(); else if (e.key === 'Escape') { e.stopPropagation(); setRen(null); } }} />
            <button class="btn btn-hot btn-sm" onClick=${renOK}>OK</button>
            <button class="btn btn-ghost btn-sm" onClick=${() => setRen(null)}>Annuler</button>
          </div>` : html`<button class="save" onClick=${() => openGame(s.id)} disabled=${S.busy.load}>
            <span class="save-tile" style=${'--h:' + (s.hue == null ? 300 : s.hue)}>${s.emoji}</span>
            <span class="save-main"><b>${s.title || s.world}</b><span>${s.title ? s.world + ' · ' : ''}${s.avatar} ${s.name} · @${s.handle}</span></span>
            <span class="save-meta">${s.setup ? html`<span class="chip hot">À finir</span>` : s.over ? html`<span class="chip bad">Fin de partie</span>` : html`<b>${fmtN(s.followers)}</b><span>${plural(s.followers, 'abonné', 'abonnés')} · niv. ${s.level}</span>`}<span>${fmtAgo(s.updatedAt, now)}</span></span>
          </button>`}
          <button class="save-edit" onClick=${() => setRen({ id: s.id, text: s.title || '' })} disabled=${S.busy.load} aria-label=${`Renommer la partie ${s.title || s.world}`} title="Renommer cette partie"><${Icon} n="pen" s=${17} /></button>
          <button class="save-del" onClick=${() => setDel({ s, at: Date.now() })} disabled=${S.busy.load} aria-label=${`Supprimer la partie ${s.world} · ${s.name}`} title="Supprimer cette partie"><${Icon} n="trash" s=${18} /></button>
        </div>`)}</div>
        ${full ? html`<p class="muted">Tu as atteint ${MAX_GAMES} parties. Pour en créer une autre, supprime-en une avec la corbeille.</p>` : null}
        <div class="row">${canFiles() ? html`<button class="btn btn-ghost btn-sm" onClick=${importAny} disabled=${full}><${Icon} n="upload" s=${15} /> Importer une partie</button>` : null}${creatorOn() && atelierHere() ? html`<button class="btn btn-ghost btn-sm" onClick=${openAtelier}><${Icon} n="camera" s=${15} /> Atelier photos</button>` : null}</div>
        <${TutoOpen} onOpen=${() => setTuto(true)} />
      </section>`
      : html`<section class="hero">
        <span class="wm wm-xl">hype<i></i></span>
        <h1 class="h-xl">Ta vie en ligne, version jeu.</h1>
        <p class="lede">Crée ton perso, choisis un monde et poste. Tout le monde est une IA sauf toi : on te répond, on s’abonne, on s’attache… ou on te cancel.</p>
        ${HOST ? html`<${GptPanel} />` : null}
        <div class="row"><button class="btn btn-hot" onClick=${startOnboarding} disabled=${S.store === 'pending' || S.indexError || !hostReady()}>${S.store === 'pending' ? 'Chargement…' : 'Nouvelle partie'}</button>${canFiles() ? html`<button class="btn btn-ghost" onClick=${importAny} disabled=${S.store === 'pending' || S.indexError}><${Icon} n="upload" s=${16} /> Importer une partie</button>` : null}${creatorOn() && atelierHere() ? html`<button class="btn btn-ghost" onClick=${openAtelier}><${Icon} n="camera" s=${16} /> Atelier photos</button>` : null}</div>
        <${TutoOpen} onOpen=${() => setTuto(true)} />
      </section>
      <section class="preview" aria-label="Aperçu d’une partie">
        <div class="preview-tag"><span>Aperçu · exemple de partie</span><span>Académie Lumen</span></div>
        ${PREVIEW.map((p) => html`<${PreviewPost} key=${p.handle} p=${p} />`)}
      </section>`}
    ${S.store === 'local' ? html`<p class="muted" style="font-size:13px">Tes parties sont gardées dans ce navigateur.</p>` : null}
    ${S.store === 'memory' ? html`<div class="notice bad"><${Icon} n="alert" /><p>La sauvegarde n’est pas disponible ici : ta partie sera perdue en quittant.</p></div>` : null}
    ${del ? html`<div class="modal" role="dialog" aria-modal="true" onClick=${(e) => { if (e.target === e.currentTarget) setDel(null); }}>
      <div class="modal-card">
        <div class="modal-big" aria-hidden="true">${del.s.emoji}</div>
        <div class="modal-title">Supprimer cette partie ?</div>
        <p>${del.s.world} · ${del.s.avatar} ${del.s.name} (@${del.s.handle}). Tout sera effacé, sauvegardes comprises, sans retour possible.</p>
        <button class="btn btn-danger-solid" onClick=${confirmDel}>Supprimer définitivement</button>
        <button class="btn btn-ghost" onClick=${() => setDel(null)}>Annuler</button>
      </div>
    </div>` : null}
    ${tuto ? html`<${Tuto} onClose=${tutoClose} canNew=${canNew} why=${noNew} />` : null}
  </div><button type="button" class="app-version" onClick=${tapVersion} title="Le jeu est encore en développement : des choses peuvent changer ou casser.">Hype ${APP_VERSION} · ${APP_STAGE}${creatorOn() && atelierHere() ? ' · créateur' : ''}</button></div>`;
}

/* ---------- onboarding ---------- */
function sanitizeHandleInput(v) {
  return String(v || '').replace(/^@+/, '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.').replace(/[^a-z0-9._]/g, '').slice(0, 18);
}
function validatePersona(P) {
  const e = {};
  if (str(P.name, 30).length < 1) e.name = 'Donne un nom à ton perso.';
  if (normHandle(P.handle).length < 3) e.handle = 'Ton pseudo doit faire au moins 3 caractères.';
  if (str(P.identity, 200).length < 4) e.identity = 'Dis en quelques mots qui tu es dans ce monde.';
  if (!P.adult) e.adult = 'Hype est réservé aux 18 ans et plus : coche la case pour continuer.';
  // 0.28.1: a secret too short to keep is said, not dropped without a word (what cleanSecrets keeps: 6 characters)
  if ((P.secrets || []).some((x) => { const t = str(x && x.t, 200).replace(/^[«"“]\s*|\s*[»"”]$/g, ''); return t.length > 0 && t.length < 6; })) e.secrets = 'Ton secret : quelques mots, au moins 6 caractères.';
  return e;
}
function obBack() {
  const ob = S.ob;
  if (!ob) return;
  if (ob.step === 'world') { S.ob = null; S.phase = 'home'; }
  else if (ob.step === 'persona') ob.step = 'world';
  else if (ob.step === 'creating' && ob.error) { ob.step = 'persona'; ob.error = null; }
  else if (ob.step === 'cast') { S.ob = null; S.phase = 'home'; } // (0.28.1: always: the game waits there, « À finir »)
  update(false);
}
function Onboarding({ now }) {
  const ob = S.ob;
  if (!ob) return null;
  const idx = { world: 0, persona: 1, creating: 2, cast: 2 }[ob.step] || 0;
  const canBack = ob.step === 'world' || ob.step === 'persona' || (ob.step === 'creating' && ob.error) || ob.step === 'cast';
  let body;
  if (ob.step === 'world') body = html`<${WorldStep} />`;
  else if (ob.step === 'persona') body = html`<${PersonaStep} />`;
  else if (ob.step === 'creating') body = html`<${CreatingStep} now=${now} />`;
  else body = html`<${CastStep} />`;
  return html`<div class="screen"><div class="screen-in">
    <div class="screen-top">
      ${canBack ? html`<button class="iconbtn" onClick=${obBack} aria-label="Retour"><${Icon} n="back" /></button>` : null}
      <span class="wm">hype<i></i></span>
      <div class="steps" aria-hidden="true">${[0, 1, 2].map((i) => html`<i key=${i} class=${i <= idx ? 'on' : ''}></i>`)}</div>
    </div>
    ${body}
  </div></div>`;
}
function WorldStep() {
  const ob = S.ob;
  const [custom, setCustom] = useState(ob.world === 'custom');
  const choose = (id) => { ob.world = id; ob.step = 'persona'; update(false); };
  return html`
    <div class="stack">
      <p class="eyebrow">Étape 1 sur 3</p>
      <h1 class="h-xl">Choisis ton monde</h1>
      <p class="lede">Chaque monde a ses personnages, ses rivalités et ses secrets. Tu pourras lancer d’autres parties ensuite.</p>
    </div>
    <div class="worlds">
      ${WORLDS.map((w) => html`<button key=${w.id} class=${'world' + (ob.world === w.id ? ' on' : '')} style=${'--h:' + w.hue} onClick=${() => choose(w.id)}>
        <span class="world-emoji">${w.emoji}</span><b>${w.name}</b><span class="world-desc">${w.desc}</span></button>`)}
      <button class=${'world world-custom' + (custom ? ' on' : '')} onClick=${() => setCustom(true)}>
        <span class="world-emoji">✨</span><b>Ton univers</b><span class="world-desc">Une série, un manga, un jeu que tu aimes, ou un monde inventé.</span></button>
    </div>
    ${custom ? html`<${CustomWorld} />` : null}`;
}
function CustomWorld() {
  const ob = S.ob;
  const [v, setV] = useState(ob.custom || '');
  const ref = useRef(null);
  useEffect(() => { if (ref.current) { ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); ref.current.querySelector('textarea').focus({ preventScroll: true }); } }, []);
  const ok = v.trim().length >= 12;
  return html`<div class="stack" ref=${ref}>
    <div class="field">
      <label for="cw">Décris ton univers</label>
      <textarea id="cw" class="input" rows="4" maxlength="900" placeholder="ex : l’univers d’une série que j’adore, une ville sous-marine en 2200, ma fac version super-héros…" value=${v} onInput=${(e) => { setV(e.target.value); ob.custom = e.target.value; }}></textarea>
      <small>Pas de vraies personnes : les personnages seront fictifs.</small>
    </div>
    <div class="row"><button class="btn btn-hot" disabled=${!ok} onClick=${() => { ob.world = 'custom'; ob.custom = v.trim(); ob.step = 'persona'; update(false); }}>Continuer</button>${ok ? null : html`<span class="muted" style="font-size:13px">Quelques mots de plus.</span>`}</div>
  </div>`;
}
function Seg({ items, value, onPick, label }) { // items: [value, label, disabled?]
  return html`<div class="seg" role="group" aria-label=${label}>${items.map(([k, lb, off]) => html`<button type="button" key=${k} class=${value === k ? 'on' : ''} aria-pressed=${value === k ? 'true' : 'false'} disabled=${!!off} onClick=${() => onPick(k)}>${lb}</button>`)}</div>`;
}
// « Rendez-vous soignés »: the AI reads its date mini-game again against the story, and writes it ahead (0.9.3).
function CareDatesBox({ on, set }) {
  return html`<label class=${'check-card' + (on ? ' on' : '')}>
    <input type="checkbox" checked=${on} onChange=${(e) => set(e.target.checked)} />
    <span><b>Rendez-vous soignés 💘</b><small>Le mini-jeu de chaque rendez-vous se prépare dès que tu y vas, et l’IA le relit pour qu’il colle à votre histoire (disputes, bad buzz, ce que vous vous êtes dit). ≈ +1 café par rendez-vous.</small></span>
  </label>`;
}
function PersonaStep() {
  const ob = S.ob, P = ob.persona;
  const [, force] = useState(0);
  const set = (k, v) => {
    P[k] = v;
    if (k === 'name' && (!P.handleEdited || !P.handle)) { P.handleEdited = false; P.handle = sanitizeHandleInput(v).replace(/^[._]+|[._]+$/g, ''); }
    if (Object.keys(ob.errors).length) {
      const fresh = validatePersona(P);
      for (const key of Object.keys(ob.errors)) if (!fresh[key]) delete ob.errors[key];
    }
    force((x) => x + 1);
  };
  const w = ob.world === 'custom' ? { name: 'Ton univers', role: 'ex : la personne la plus mystérieuse de ce monde' } : WORLDS.find((x) => x.id === ob.world);
  const errs = ob.errors || {};
  const submit = (e) => {
    e.preventDefault();
    ob.errors = validatePersona(P);
    if (Object.keys(ob.errors).length) {
      force((x) => x + 1);
      const id = ob.errors.name ? 'pn' : ob.errors.handle ? 'ph' : ob.errors.identity ? 'pi' : 'p18';
      setTimeout(() => { const el = document.getElementById(id); if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, 40);
      return;
    }
    try { localStorage.setItem('hype:budget', String(P.budget)); } catch (err) { /* the next game starts at the default */ }
    lsSet('hype:careDates', P.careDates ? '1' : '0'); // the next game offers the same choice
    lsSet('hype:intensity', P.intensity || 'normal');
    createWorld();
  };
  const who = { name: P.name || '?', emoji: P.emoji, hue: P.hue };
  return html`<form class="stack" style="gap:22px" onSubmit=${submit} novalidate>
    <div class="stack"><p class="eyebrow">Étape 2 sur 3 · ${w.name}</p><h1 class="h-xl">Qui es-tu ?</h1></div>
    <div class="persona-head"><${Avatar} who=${who} size=${64} /><div class="stack" style="gap:2px;min-width:0"><b>${P.name || 'Ton nom'}</b><span>@${normHandle(P.handle) || 'pseudo'}</span></div></div>
    <div class="field">
      <span class="lbl">Avatar</span>
      <div class="emoji-grid">${PERSONA_EMOJIS.map((em) => html`<button type="button" key=${em} class=${'emoji-opt' + (P.emoji === em ? ' on' : '')} onClick=${() => set('emoji', em)} aria-label=${'Avatar ' + em} aria-pressed=${P.emoji === em ? 'true' : 'false'}>${em}</button>`)}</div>
      <div class="swatches" style="margin-top:8px">${PERSONA_HUES.map((h) => html`<button type="button" key=${h} class=${'swatch' + (P.hue === h ? ' on' : '')} style=${'--h:' + h} onClick=${() => set('hue', h)} aria-label=${'Couleur ' + h}></button>`)}</div>
    </div>
    <div class="field">
      <label for="pn">Nom affiché</label>
      <input id="pn" class="input" maxlength="30" value=${P.name} onInput=${(e) => set('name', e.target.value)} placeholder="ex : Mila Flux" autocomplete="off" aria-invalid=${errs.name ? 'true' : undefined} />
      ${errs.name ? html`<span class="err">${errs.name}</span>` : null}
    </div>
    <div class="field">
      <label for="ph">Pseudo</label>
      <div class="input-at"><input id="ph" class="input" maxlength="18" value=${P.handle} onInput=${(e) => { P.handleEdited = true; set('handle', sanitizeHandleInput(e.target.value)); }} placeholder="mila.flux" autocomplete="off" autocapitalize="off" spellcheck="false" aria-invalid=${errs.handle ? 'true' : undefined} /></div>
      <small>Lettres, chiffres, point et tiret bas.</small>
      ${errs.handle ? html`<span class="err">${errs.handle}</span>` : null}
    </div>
    <div class="field">
      <span class="lbl">On parle de toi au…</span>
      <${Seg} items=${PRONOUNS} value=${P.pron} onPick=${(k) => set('pron', k)} label="Pronom" />
      <small>Pour accorder les textes du jeu (abonné, abonnée…).</small>
    </div>
    <div class="field">
      <label for="pi">Ton rôle dans ce monde</label>
      <textarea id="pi" class="input" rows="3" maxlength="200" value=${P.identity} onInput=${(e) => set('identity', e.target.value)} placeholder=${w.role} aria-invalid=${errs.identity ? 'true' : undefined}></textarea>
      <small>Les personnages réagiront à qui tu es.</small>
      ${errs.identity ? html`<span class="err">${errs.identity}</span>` : null}
    </div>
    <div class="field">
      <label for="pb">Bio <span class="muted">(facultatif)</span></label>
      <input id="pb" class="input" maxlength="140" value=${P.bio} onInput=${(e) => set('bio', e.target.value)} placeholder="Ce qu’on lit sur ton profil" autocomplete="off" />
    </div>
    <${SecretsField} list=${P.secrets || []} onChange=${(v) => set('secrets', v)} />
    ${errs.secrets ? html`<span class="err secrets-err">${errs.secrets}</span>` : null}
    <div class="field">
      <span class="lbl">Point de départ</span>
      <div class="starts">${Object.entries(START).map(([k, v]) => html`<button type="button" key=${k} class=${'start' + (P.start === k ? ' on' : '')} onClick=${() => set('start', k)} aria-pressed=${P.start === k ? 'true' : 'false'}><b>${v.label}</b><span>${v.desc}</span><em>${nAbonnes(v.followers)}</em></button>`)}</div>
    </div>
    <div class="field">
      <span class="lbl">Ta plateforme</span>
      <div class="pf-pick">${[['', '✨', 'Auto'], ...Object.keys(PLATFORMS).map((k) => [k, PLATFORMS[k].emoji, PLATFORMS[k].name])].map(([k, em, lb]) => html`<button type="button" key=${k || 'auto'} class=${'pf-opt' + ((P.platform || '') === k ? ' on' : '')} aria-pressed=${(P.platform || '') === k ? 'true' : 'false'} onClick=${() => set('platform', k)}><span aria-hidden="true">${em}</span>${lb}</button>`)}</div>
      <small>${P.platform ? PLATFORMS[P.platform].tips[0] : `Devinée d’après ton rôle : ${PLATFORMS[guessPlatform(P.identity)].name}.`} Elle décide de tes formats et de la façon dont tu gagnes de l’argent.</small>
    </div>
    <div class="field">
      <span class="lbl">Intensité du jeu</span>
      <${IntensityTiers} value=${P.intensity || 'normal'} set=${(k) => { delete P.chatty; delete P.autoLive; delete P.comments; delete P.live; set('intensity', k); }} comments=${P.comments} live=${P.live} />
      <${IntensitySettings} lv=${INTENSITY[P.intensity] ? P.intensity : 'normal'} comments=${P.comments} live=${P.live} set=${(k, v) => set(k, v)} />
    </div>
    <div class="field">
      <span class="lbl">Ton budget IA par jour</span>
      <${BudgetTiers} value=${P.budget} lv=${INTENSITY[P.intensity] ? P.intensity : 'normal'} vol=${COMMENTS[commentsOf(null, Object.assign({}, P, { intensity: INTENSITY[P.intensity] ? P.intensity : 'normal' }))].vol} set=${(k) => set('budget', k)} />
      <small>Chaque réaction des personnages utilise ton abonnement ${AI_NAME}. Les cafés comptent ce que le jeu en prend aujourd’hui et le mettent en pause avant ta limite. ${(BUDGETS.find((x) => x.n === P.budget) || BUDGETS[2]).desc}</small>
      <small class="plan-advice">${PLAN_ADVICE}</small>
    </div>
    <div class="field">
      <span class="lbl">Ambiance</span>
      <${Seg} items=${CHAOS.map((c, i) => [i, c.label])} value=${P.chaos} onPick=${(k) => set('chaos', k)} label="Ambiance" />
      <small>${(CHAOS[P.chaos] || CHAOS[1]).desc} Tu pourras la changer plus tard.</small>
    </div>
    <div class="field">
      <span class="lbl">Option IA</span>
      <${CareDatesBox} on=${!!P.careDates} set=${(v) => set('careDates', v)} />
      <${RomanceBox} on=${P.romance !== false} set=${(v) => set('romance', v)} />
    </div>
    <label class=${'check-card age-ok' + (P.adult ? ' on' : '') + (errs.adult ? ' bad' : '')}>
      <input id="p18" type="checkbox" checked=${!!P.adult} onChange=${(e) => set('adult', e.target.checked)} aria-invalid=${errs.adult ? 'true' : undefined} />
      <span><b>J’ai 18 ans ou plus</b><small>Hype est fait pour les adultes : drague, rendez-vous, clashs.</small></span>
    </label>
    ${errs.adult ? html`<span class="err">${errs.adult}</span>` : null}
    ${S.ai === 'unavailable' ? html`<div class="notice bad"><${Icon} n="alert" /><p>Connecte-toi à ChatGPT pour que les personnages prennent vie.</p></div>` : null}
    <div class="row">
      <button class="btn btn-hot" type="submit" disabled=${S.busy.create}>Créer mon monde</button>
      <span class="muted" style="font-size:13px">${AI_NAME} invente tes personnages : compte de 20 secondes à une minute.</span>
    </div>
  </form>`;
}
const CREATING_LINES = ['On dessine la carte du monde…', 'Les personnages se réveillent…', 'Quelqu’un lance déjà une rumeur sur toi…', 'Les rivalités se mettent en place…', 'Le fil d’actu chauffe…'];
function CreatingStep({ now }) {
  const ob = S.ob, g = ob.game;
  if (ob.error) {
    const e = ob.error;
    return html`<div class="creating">
      <div class="orb" style="--h:15">😵</div>
      <h1 class="h-lg">${e.code === 'thin' ? 'Le monde est resté trop vide' : 'La création a échoué'}</h1>
      <p class="lede">${e.code === 'thin' ? `${AI_NAME} n’a pas créé assez de personnages. Relance la création.` : aiErrorText(e, 'create')}</p>
      <div class="row" style="justify-content:center">
        <button class="btn btn-hot" onClick=${createWorld}>Réessayer</button>
        <button class="btn btn-ghost" onClick=${obBack}>Modifier mon perso</button>
        <button class="btn btn-ghost" onClick=${() => { ob.error = null; ob.step = 'world'; update(false); }}>Changer de monde</button>
      </div>
    </div>`;
  }
  const w = g ? g.world : { emoji: '✨', hue: 300, name: '' };
  const n = ob.live.length;
  return html`<div class="creating">
    <div class="orb" style=${'--h:' + w.hue}>${w.emoji}</div>
    <h1 class="h-lg">${n ? w.name : 'Ton monde prend vie'}</h1>
    <p class="muted" aria-live="polite">${n ? `${n} compte${n > 1 ? 's' : ''} sur le réseau…` : CREATING_LINES[Math.floor(now / 3200) % CREATING_LINES.length]}</p>
    <div class="cast-live">${ob.live.map((id) => { const c = g.chars[id]; return c ? html`<div class="cast-row" key=${id}><${Avatar} who=${author(g, 'c:' + id)} size=${40} /><div><b>${c.name}</b><span>@${c.handle}${c.role ? ' · ' + c.role : ''}</span></div></div>` : null; })}</div>
    <button class="btn btn-ghost btn-sm" onClick=${cancelCreate}>Annuler</button>
  </div>`;
}
function CastStep() {
  const ob = S.ob, g = ob.game;
  const ms = mains(g), md = medias(g);
  const story = g.quests.filter((q) => q.kind === 'story');
  const hint = (r) => (r <= -10 ? ['bad', 'Ça part mal'] : r >= 10 ? ['good', 'Plutôt pour toi'] : ['', 'Neutre']);
  const pickId = ob.follower;
  const picked = pickId ? g.chars[pickId] : null;
  const choose = (id) => { ob.follower = ob.follower === id ? null : id; update(false); };
  return html`
    <div class="stack" style="gap:16px">
      <p class="eyebrow">Étape 3 sur 3</p>
      <div class="world-banner" style=${'--h:' + g.world.hue}>
        <span class="big">${g.world.emoji}</span>
        <h1 class="h-xl">${g.world.name}</h1>
        ${g.world.tagline ? html`<p><b>${g.world.tagline}</b></p>` : null}
        ${g.world.description ? html`<p>${g.world.description}</p>` : null}
      </div>
    </div>
    <section class="stack">
      <div class="section-h"><h2 class="h-md">Qui sera ton premier abonné ?</h2><span class="muted">les autres le sauront</span></div>
      <div class="cast-grid">${ms.map((c) => {
        const [tone, label] = hint(c.rel);
        const on = pickId === c.id;
        return html`<button type="button" class=${'cast-card pick' + (on ? ' on' : '')} key=${c.id} onClick=${() => choose(c.id)} aria-pressed=${on ? 'true' : 'false'}>
          <header><${Avatar} who=${author(g, 'c:' + c.id)} size=${48} /><div><b>${c.name}</b><span>@${c.handle}${c.role ? ' · ' + c.role : ''}</span></div>${on ? html`<span class="pick-check"><${Icon} n="check" s=${16} /></span>` : null}</header>
          ${c.hook ? html`<p class="hook">« ${c.hook} »</p>` : c.bio ? html`<p>${c.bio}</p>` : null}
          <div class="row" style="gap:6px"><span class=${'chip ' + tone}>${label}</span><span class="chip">${nAbonnes(c.followers)}</span>${c.age ? html`<span class="chip">${c.age} ans</span>` : null}</div>
        </button>`;
      })}</div>
    </section>
    ${md.length ? html`<section class="stack"><h2 class="h-md">Les médias du coin</h2><div class="cast-grid">${md.map((c) => html`<article class="cast-card" key=${c.id}>
      <header><${Avatar} who=${author(g, 'c:' + c.id)} size=${40} /><div><b>${c.name}</b><span>@${c.handle}${c.role ? ' · ' + c.role : ''}</span></div></header>
    </article>`)}</div></section>` : null}
    ${story.length ? html`<section class="stack"><h2 class="h-md">Tes premières quêtes</h2>${story.map((q) => html`<div class="notice" key=${q.id}><${Icon} n="trophy" /><div class="stack" style="gap:2px"><b style="color:var(--ink)">${q.title}</b><p>${q.desc}</p></div></div>`)}</section>` : null}
    <div class="cast-cta"><button class="btn btn-hot btn-block" disabled=${!picked} onClick=${() => enterNewGame(pickId)}>${picked ? `Entrer avec ${firstName(picked)} comme ${gx(picked.g, 'premier abonné', 'première abonnée', 'premier·e abonné·e')}` : 'Choisis ton premier abonné'}</button></div>`;
}

/* ---------- game shell ---------- */
function Game({ g, now }) {
  const modal = dueModal(now);
  return html`<div class="shell">
    <${Rail} g=${g} now=${now} />
    <main class="col">
      <${TopBar} g=${g} />
      <${StatusStrip} g=${g} now=${now} />
      <div class="train-slot"><${TrainBar} g=${g} now=${now} /></div>
      <${TabView} g=${g} now=${now} />
      <nav class="tabbar" aria-label="Navigation">${TABS.map((t) => { const b = tabBadge(g, t.id, now); return html`<button key=${t.id} class=${'tab' + (S.tab === t.id ? ' on' : '')} onClick=${() => goTab(t.id)} aria-current=${S.tab === t.id ? 'page' : undefined}><${Icon} n=${t.icon} s=${23} /><span>${t.label}</span>${b ? html`<span class="badge">${b > 99 ? '99+' : b}</span>` : null}</button>`; })}</nav>
      ${S.tab === 'feed' || S.tab === 'profile' ? html`<button class=${'fab' + (S.fabAway ? ' away' : '')} onClick=${() => openCompose()} aria-label="Publier un post" tabindex=${S.fabAway ? -1 : undefined}><${Icon} n="pen" s=${24} /></button>` : null}
    </main>
    <${Side} g=${g} now=${now} />
    ${S.dock.concat(S.stack).map((l, i) => html`<${WinCtx.Provider} key=${l.key} value=${l}><${Layer} l=${l} i=${i} g=${g} now=${now} /><//>`)}
    <${OsWindows} g=${g} now=${now} />
    <${Dock} />
    ${modal ? html`<${Modal} key=${modal.id} m=${modal} g=${g} />` : null}
    ${S.storyView && !g.over ? html`<${StoryView} g=${g} now=${now} />` : null}
    ${g.over ? html`<${GameOver} g=${g} />` : null}
  </div>`;
}
function Rail({ g, now }) {
  return html`<nav class="rail" aria-label="Navigation principale">
    <span class="wm">hype<i></i></span>
    ${TABS.map((t) => { const b = tabBadge(g, t.id, now); return html`<button key=${t.id} class=${'rail-item' + (S.tab === t.id ? ' on' : '')} onClick=${() => goTab(t.id)} aria-label=${t.label}><${Icon} n=${t.icon} s=${24} /><span>${t.label}</span>${b ? html`<span class="badge">${b > 99 ? '99+' : b}</span>` : null}</button>`; })}
    <button class="btn btn-hot rail-post" onClick=${() => openCompose()} aria-label="Publier"><${Icon} n="pen" s=${20} /><span>Publier</span></button>
    <button class="rail-me" onClick=${() => goTab('profile')} aria-label="Mon profil"><${Avatar} who=${author(g, 'p')} size=${40} /><div><b>${g.player.name}</b><span>@${g.player.handle}</span></div></button>
  </nav>`;
}
// 0.28.1: a number where room is short (the header, a card, a total): « 12,3 k », « 2,7 M », « 1 000 Md »; in full under 10 000
const nfShort = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
function fmtShort(n) {
  n = Math.round(num(n));
  const a = Math.abs(n);
  if (a < 10000) return fmtPlain(n);
  const [d, u] = a < 1e6 ? [1e3, 'k'] : a < 1e9 ? [1e6, 'M'] : [1e9, 'Md'];
  const x = n / d;
  return (Math.abs(x) >= 100 ? fmtPlain(x) : nfShort.format(x)) + ' ' + u;
}
// And money: in full under a million, then « 2,7 M€ », « 1 000 Md€ » (the world's coin: « 2,7 M écus »).
function fmtMoneyShort(g, n) {
  if (Math.abs(num(n)) < 1e6) return fmtMoney(g, n, false);
  const W = g && g.world && WORLD_MONEY[g.world.preset];
  return fmtShort(n) + (W ? ' ' + W.sym : '€');
}
// Only this chip ticks every second while cafés regenerate (not the whole page).
// The cafés: the AI budget left today (the ring empties as the day's budget goes).
function EnergyChip({ g, label }) {
  const e = energyNow(g, Date.now());
  const frac = e.unlimited ? 1 : e.max ? clamp(e.left / e.max, 0, 1) : 0;
  const low = !e.unlimited && e.left <= e.max * 0.2;
  return html`<button class=${'res-chip' + (low ? ' low' : '')} onClick=${() => queueModal({ t: 'budget', at: Date.now() })} title=${e.unlimited ? 'Budget IA sans limite' : `Budget IA du jour : ${fmtCafes(e.left)} cafés sur ${e.max} · recharge à minuit`} aria-label=${e.unlimited ? 'Budget IA sans limite' : `${fmtCafes(e.left)} cafés sur ${e.max} aujourd’hui`}>
    <span class="ring" style=${'--p:' + frac.toFixed(3)}><${Icon} n="coffee" s=${14} /></span><b>${e.unlimited || label ? fmtCafes(e.left) : fmtShort(Math.floor(e.left + 1e-9))}</b>${e.unlimited ? null : html`<small>/${label ? e.max : fmtShort(e.max)}${label ? ' cafés' : ''}</small>`}
  </button>`;
}
function TopBar({ g }) {
  const s = g.stats;
  return html`<header class="topbar">
    <button class="iconbtn me-btn" onClick=${() => goTab('profile')} aria-label=${`Mon profil · niveau ${s.level}, ${s.xp} XP sur ${xpNeed(s.level)}`}><${Avatar} who=${author(g, 'p')} size=${34} /><span class="lvl-dot" aria-hidden="true">Niv. ${s.level}</span></button>
    <span class="wm">hype<i></i></span>
    <h1 class="topbar-title">${TITLES[S.tab]}</h1>
    <span class="lvl" title=${s.xp + ' / ' + xpNeed(s.level) + ' XP'}>Niv. ${s.level}</span>
    <${EnergyChip} g=${g} />
    <button class="res-chip" onClick=${openShop} aria-label=${fmtPlain(s.gems) + ' gemmes'}><span class="gem-dot"><${Icon} n="gem" s=${14} /></span><b>${fmtShort(s.gems)}</b></button>
    <button class="iconbtn save-btn" onClick=${openSaves} aria-label="Sauvegardes" title="Sauvegarder ou revenir en arrière"><${Icon} n="save" s=${20} /></button>
    <button class="iconbtn save-btn gear-btn" onClick=${() => openLayer({ t: 'settings' })} aria-label="Réglages de la partie" title="Réglages"><${Icon} n="gear" s=${20} /></button>
    <div class="xpline" title=${`Niveau ${s.level} : ${s.xp} / ${xpNeed(s.level)} XP`} aria-hidden="true"><i style=${'--p:' + Math.round((s.xp / xpNeed(s.level)) * 100) + '%'}></i></div>
  </header>`;
}
function TabView({ g, now }) {
  const ref = useRef(null);
  VIEW_EL.current = ref.current;
  useLayoutEffect(() => { VIEW_EL.current = ref.current; if (ref.current) { ref.current.scrollTop = SCROLL[S.tab] || 0; S.scrollY = ref.current.scrollTop; } }, [S.tab, g.id]);
  const tab = S.tab; // 0.28.1: the tab on screen (a scroll still running after a click elsewhere is this one's, not the next's)
  const onScroll = (e) => {
    const el = e.currentTarget;
    if (tab !== S.tab) return; // (the next tab is drawn at the next frame: its own place then)
    SCROLL[tab] = el.scrollTop;
    // 0.15: the pen steps aside while the player scrolls down (it hid likes and texts), and comes back on the way up
    const y = el.scrollTop, dy = y - (S.scrollY || 0);
    if (Math.abs(dy) > 6 || y < 60) {
      S.scrollY = y;
      const away = y >= 60 && dy > 0;
      if (away !== !!S.fabAway) { S.fabAway = away; update(false); }
    }
    if (S.tab === 'feed') {
      const atTop = el.scrollTop < 60;
      if (atTop !== S.feedAtTop) { S.feedAtTop = atTop; S.feedSeenAt = Date.now(); update(false); }
    }
  };
  let body;
  if (S.tab === 'feed') body = html`<${FeedTab} g=${g} now=${now} />`;
  else if (S.tab === 'notifs') body = html`<${NotifsTab} g=${g} now=${now} />`;
  else if (S.tab === 'dms') body = html`<${DMsTab} g=${g} now=${now} />`;
  else if (S.tab === 'quests') body = html`<${QuestsTab} g=${g} now=${now} />`;
  else if (S.tab === 'studio') body = html`<${StudioTab} g=${g} now=${now} />`;
  else body = html`<${ProfileTab} g=${g} now=${now} />`;
  return html`<div class="view" ref=${ref} onScroll=${onScroll}>${body}</div>`;
}
function Side({ g, now }) {
  const s = g.stats;
  const tr = trends(g, now);
  const top = mains(g).slice().sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel)).slice(0, 5);
  return html`<aside class="side" aria-label="Ton statut">
    <section class="panel">
      <h3>Ton statut</h3>
      <div><div class="bignum">${fmtN(s.followers)}</div><span class="muted">${plural(s.followers, 'abonné', 'abonnés')}</span></div>
      <div class="kv"><span>Réputation</span><b>${repLabel(s.reputation)} · ${rep1000(s.reputation)}</b></div>
      <${Meter} frac=${s.reputation / 100} tone=${s.reputation < 35 ? 'bad' : s.reputation >= 60 ? 'good' : ''} />
      ${toxOf(g) >= 1 ? html`<${ToxBlock} g=${g} now=${now} side=${true} />` : null}
      <div class="kv"><span>Niveau ${s.level}</span><b class="mono">${s.xp}/${xpNeed(s.level)} XP</b></div>
      <${Meter} frac=${s.xp / xpNeed(s.level)} />
      ${s.cancelled ? html`<span class="chip bad">Tu es cancel</span>` : null}
      ${playerBadBuzz(g, now) ? html`<span class="chip bad">Bad buzz · encore ${fmtDur(g.pbb.until - now)}</span>` : null}
    </section>
    ${tr.length ? html`<section class="panel"><h3>Tendances</h3>${tr.map(([tg]) => { const n = postsWithTag(g, tg, now).length; return html`<button class="trend" key=${tg} onClick=${() => openTag(tg)}><small>Tendance · ${g.world.name}</small><b>${tg}</b>${n ? html`<small>${n} ${plural(n, 'post', 'posts')}</small>` : null}</button>`; })}</section>` : null}
    <section class="panel"><h3>Personnages</h3>${top.map((c) => html`<button class="mini-char" key=${c.id} onClick=${() => openChar(c.id)}><${Avatar} who=${author(g, 'c:' + c.id)} size=${36} /><div><b>${c.name}</b><span>${relShown(c)} · ${fmtRel(c.rel)}${vibeTag(c)}${inBadBuzz(c, now) ? ' · ' + bbWord(c) : ''}</span></div></button>`)}</section>
  </aside>`;
}

/* ---------- posts ---------- */
// A post's picture: a real photo of the pack when there is one, a slideshow announced, or the illustrated card.
function PostMedia({ g, p, au }) {
  if (p.slides) return html`<${SlidesCard} g=${g} p=${p} />`;
  if (!p.photo) return null;
  if (ownIds(p).length) return html`<${OwnMedia} g=${g} p=${p} />`; // the player's own photos (gone from this device: the description)
  return p.photo.img && PACK.photos[p.photo.img] && g.portraits !== false ? html`<${RealPhoto} g=${g} p=${p} ph=${p.photo} />` : html`<${PhotoCard} ph=${p.photo} hue=${au.hue} />`;
}
function PhotoCard({ ph, hue }) {
  return html`<div class="photo" style=${'--h:' + (hue || 0)} role="img" aria-label=${'Photo : ' + (ph.desc || 'sans description')}>
    <span class="photo-emo" aria-hidden="true">${ph.emoji || '📷'}</span>
    <span class="photo-desc"><${Icon} n="camera" s=${13} /><span>${ph.desc || 'Photo'}</span></span>
  </div>`;
}
function QuoteCard({ g, q }) {
  const au = author(g, q.a);
  const live = g.posts.some((p) => p.id === q.id);
  const open = live ? () => openPost(q.id) : null;
  return html`<div class=${'quote-card' + (live ? ' live' : '')} onClick=${open ? stop(open) : stop(() => {})} role=${open ? 'button' : undefined} tabindex=${open ? 0 : undefined} onKeyDown=${open ? onKeys(open) : undefined}>
    <div class="post-head"><${Avatar} who=${au} size=${20} /><span class="post-name">${au.name}</span>${au.verified ? html`<${Verified} />` : null}<span class="post-handle">@${au.handle}</span></div>
    ${q.text ? html`<p class="quote-text">${q.text}</p>` : null}
    ${q.photo ? html`<span class="quote-photo"><${Icon} n="camera" s=${13} /> ${q.photo.desc || 'Photo'}</span>` : null}
  </div>`;
}
const revealed = (p, now) => !p.pending && p.res && now >= (p.res.revealAt || 0);
// 0.18: the answer to a secret that came out, as the network took it
const SEC_RES = { dement: ['Démenti cru', 'Démenti qui divise', 'Démenti qui ne passe pas'], assume: ['Tu assumes : respect', 'Tu assumes : ça passe à moitié', 'Tu assumes : ça passe mal'], excuse: ['Excuses convaincantes', 'Excuses moyennes', 'Excuses de façade'] };
function ResChips({ r, now, apology, ev, removed }) {
  const k = ease((now - (r.revealAt || 0)) / 2500); // followers count up as the result appears
  const fol = Math.round(r.fol * k);
  const late = !!(r.fake && !r.fake.busted && ev && ev.busted); // swallowed at first, taken apart later
  return html`<div class="res">
    ${apology ? html`<span class=${'chip ' + (r.sincerity >= 7 ? 'good' : r.sincerity >= 4 ? '' : 'bad')}>Excuses ${r.sincerity >= 7 ? 'convaincantes' : r.sincerity >= 4 ? 'moyennes' : 'ratées'}</span>` : null}
    ${r.fake ? html`<span class=${'chip ' + (r.fake.busted || late ? 'bad' : 'good')}>${r.fake.busted ? `Fake démasqué · ${r.fake.q}/10` : late ? 'Fake démasqué par une contre-enquête' : `Fake crédible à ${r.fake.q}/10 · bad buzz lancé`}</span>`
      : r.cred != null && r.video ? html`<span class=${'chip ' + (r.cred >= 7 ? 'good' : r.cred >= 4 ? '' : 'bad')}>${r.cred >= 7 ? 'Preuve convaincante · bad buzz lancé' : r.cred >= 4 ? 'Preuve fragile · ça divise' : 'Preuve ratée · retour de bâton'}</span>`
      : r.cred != null && r.sec ? html`<span class=${'chip ' + (r.cred >= 7 ? 'good' : r.cred >= 4 ? '' : 'bad')}>${(SEC_RES[r.sec] || SEC_RES.dement)[r.cred >= 7 ? 0 : r.cred >= 4 ? 1 : 2]} · ${r.cred}/10</span>`
      : r.cred != null && r.deny ? html`<span class=${'chip ' + (r.cred >= 7 ? 'good' : r.cred >= 4 ? '' : 'bad')}>Démenti ${r.cred}/10 · ${r.cred >= 7 ? 'rumeur démontée' : r.cred >= 4 ? 'le doute s’installe' : 'effet inverse'}</span>`
      : r.cred != null ? html`<span class=${'chip ' + (r.cred >= 7 ? 'good' : r.cred >= 4 ? '' : 'bad')}>Crédibilité ${r.cred}/10 · ${r.cred >= 7 ? 'bad buzz lancé' : r.cred >= 4 ? 'ça divise' : 'retour de bâton'}</span>` : null}
    ${r.conf ? html`<span class=${'chip ' + (r.sincerity >= 7 ? 'good' : r.sincerity >= 4 ? '' : 'bad')}>Aveu ${r.sincerity >= 7 ? 'sincère' : r.sincerity >= 4 ? 'à moitié convaincant' : 'pas cru'}</span>` : null}
    <span class=${'chip ' + (r.fol > 0 ? 'good' : r.fol < 0 ? 'bad' : '')}>${nAbonnes(fol, true)}</span>
    <span class="chip hot">+${r.xp} XP</span>
    ${r.repD && repPts(r.repD) ? html`<span class=${'chip ' + (r.repD > 0 ? 'good' : 'bad')}>Réputation ${repPts(r.repD) > 0 ? '+' : '−'}${Math.abs(repPts(r.repD))}</span>` : null}
    ${r.verdict ? html`<span class=${'chip' + (r.viral ? ' flash' : '')}>${r.verdict}</span>` : null}
    ${removed ? html`<span class="chip bad">🚫 Retiré pour harcèlement</span>` : null}
    ${r.toxLoss ? html`<span class="chip bad">−${nAbonnes(r.toxLoss)} lassés</span>` : null}
  </div>`;
}
function PostResult({ p, g, now }) {
  if (!revealed(p, now)) return p.pending || p.res ? html`<div class="res"><span class="chip pending"><${Typing} /> La commu réagit…</span></div>` : null;
  const liked = (p.likedBy || []).filter((x) => x.at <= now).map((x) => g.chars[x.id]).filter(Boolean);
  const others = Math.max(0, shownLikes(p, now) - liked.length); // the rest are people from the public
  return html`<${ResChips} r=${p.res} now=${now} apology=${!!p.apology} ev=${p.ev} removed=${!!p.removed} />
    ${liked.length ? html`<div class="liked-by"><span class="avs">${liked.slice(0, 3).map((c) => html`<${Avatar} key=${c.id} who=${author(g, 'c:' + c.id)} size=${20} />`)}</span><span>Aimé par ${liked[0].name}${liked.length + others > 1 ? ` et ${fmtN(liked.length - 1 + others)} ${plural(liked.length - 1 + others, 'autre', 'autres')}` : ''}</span></div>` : null}`;
}
const rpCost = () => (S.game ? costLabel(S.game, 'repost') : 1); // 0.28.1: a repost has its author react (an AI call): its cost said
function PostActions({ p, now, onReply }) {
  const me = p.a === 'p';
  const likes = shownLikes(p, now), rps = shownReposts(p, now);
  const nrep = Math.max(p.replies.reduce((n, r) => n + (r.at <= now ? 1 : 0), 0), shownReplies(p, now));
  return html`<div class="post-actions">
    <button class="act" onClick=${stop(onReply)} aria-label="Répondre"><${Icon} n="msg" s=${18} /><span>${nrep ? fmtN(nrep) : ''}</span></button>
    <button class=${'act act-rp' + (p.reposted ? ' on' : '')} disabled=${me} onClick=${stop(() => toggleRepost(p))} aria-label=${p.reposted ? 'Ne plus reposter' : `Reposter · ≈ ${rpCost()} ${plural(rpCost(), 'café', 'cafés')}`} title=${p.reposted || me ? undefined : `Reposter · ≈ ${rpCost()} ☕`} aria-pressed=${p.reposted ? 'true' : 'false'}><${Icon} n="repeat" s=${18} /><span>${rps ? fmtN(rps) : ''}</span></button>
    <button class="act act-q" disabled=${me} onClick=${stop(() => openCompose({ quote: p.id }))} aria-label="Citer ce post"><${Icon} n="quote" s=${16} /></button>
    <button class=${'act act-like' + (p.liked ? ' on' : '')} disabled=${me} onClick=${stop(() => toggleLike(p))} aria-label="J’aime" aria-pressed=${p.liked ? 'true' : 'false'}><${Icon} n="heart" s=${18} fill=${p.liked} /><span>${likes ? fmtN(likes) : ''}</span></button>
  </div>`;
}
const bbWord = (c) => (c.buried ? gx(c.g, 'enterré', 'enterrée', 'enterré·e') : 'bad buzz');
function BuzzTag({ g, a, now }) {
  if (a === 'p') return playerBadBuzz(g, now) ? html`<span class="bb-tag">bad buzz</span>` : null;
  const c = a && a.startsWith('c:') ? g.chars[a.slice(2)] : null;
  return inBadBuzz(c, now) ? html`<span class="bb-tag">${bbWord(c)}</span>` : null;
}
function AccuseFlag({ g, p }) {
  const c = p.acc ? g.chars[p.acc] : null;
  if (!c) return null;
  if (p.video) return html`<div class="post-flag bad"><${Icon} n="clapper" s=${13} /> Vidéo-preuve sur @${c.handle}</div>`;
  return p.ev && p.ev.busted
    ? html`<div class="post-flag bad"><${Icon} n="mask" s=${13} /> Fausse preuve démasquée contre @${c.handle}</div>`
    : html`<div class="post-flag bad"><${Icon} n="megaphone" s=${13} /> Bad buzz lancé contre @${c.handle}</div>`;
}
// A proof attached to a call-out: the clues the player cited, and the piece they may have made up.
function EvidenceCard({ ev, mine }) {
  const K = EV_KINDS[ev.kind] || EV_KINDS.dm;
  return html`<div class=${'evidence' + (ev.busted ? ' busted' : '') + (ev.real ? ' real' : '')}>
    <span class="ev-kind"><span aria-hidden="true">${K.emoji}</span> ${ev.real ? 'Capture authentique' : K.label}</span>
    <span class="ev-desc">${ev.desc}</span>
    ${ev.busted ? html`<span class="ev-stamp" aria-label="Preuve truquée">FAKE</span>` : mine && ev.fake ? html`<span class="ev-secret"><${Icon} n="lock" s=${12} /> Fabriquée par toi · chut</span>` : null}
  </div>`;
}
function Evidence({ p, g }) {
  const cites = p.cites || [], caps = p.caps || [];
  if (!cites.length && !p.ev && !caps.length) return null;
  return html`<div class="ev-wrap">
    ${cites.length ? html`<ul class="ev-cites" aria-label="Preuves citées">${cites.map((t, k) => html`<li key=${k}><${Icon} n="search" s=${13} /><span>${t}</span></li>`)}</ul>` : null}
    ${p.ev ? html`<${EvidenceCard} ev=${p.ev} mine=${p.a === 'p'} />` : null}
    ${caps.map((x, k) => html`<${EvidenceCard} key=${k} ev=${{ kind: 'dm', real: true, desc: `« ${x.text} » — @${g && g.chars[x.c] ? g.chars[x.c].handle : '…'}` }} />`)}
  </div>`;
}
// 0.28.1: a post's name and @ lead to its author, as on a real network (not to the post)
function AuthorName({ au, children }) {
  const go = () => openAuthor(au);
  return html`<span class="post-name to-author" role="button" tabindex="0" onClick=${stop(go)} onKeyDown=${onKeys(go)}>${au.name}${children}</span>`;
}
function AuthorHandle({ au }) {
  const go = () => openAuthor(au);
  return html`<span class="post-handle to-author" role="button" tabindex="0" onClick=${stop(go)} onKeyDown=${onKeys(go)}>@${au.handle}</span>`;
}
function PostRow({ g, p, now, repost }) {
  const au = author(g, p.a);
  const viral = p.res && p.res.viral && revealed(p, now);
  const open = () => openPost(p.id);
  return html`<article class=${'post' + (viral ? ' is-viral' : '')} data-p=${p.id} onClick=${open} tabindex="0" onKeyDown=${(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); open(); } }}>
    ${repost ? html`<div class="repost-tag"><${Icon} n="repeat" s=${13} /> Tu as reposté</div>` : null}
    ${viral ? html`<span class="stamp">VIRAL</span>` : null}
    <${Avatar} who=${au} onClick=${stop(() => openAuthor(au))} />
    <div class="post-body">
      <div class="post-head"><${AuthorName} au=${au} />${au.verified ? html`<${Verified} />` : null}<${TopFanTag} g=${g} a=${p.a} /><${BuzzTag} g=${g} a=${p.a} now=${now} /><${AuthorHandle} au=${au} /><span class="post-time">· ${fmtAgo(p.ts, now)}</span></div>
      ${p.apology ? html`<div class="post-flag"><${Icon} n="shield" s=${13} /> Excuses publiques</div>` : null}
      ${p.deny ? html`<div class="post-flag"><${Icon} n="megaphone" s=${13} /> Démenti</div>` : null}
      ${p.rumor ? html`<div class="post-flag bad"><span aria-hidden="true">🗣️</span> Rumeur</div>` : null}
      <${AccuseFlag} g=${g} p=${p} />
      ${p.sp ? html`<div class="post-flag"><span aria-hidden="true">🤝</span> Collaboration commerciale · ${p.sp}</div>` : null}
      ${p.text ? html`<p class="post-text"><${RichText} text=${p.text} g=${g} /></p>` : null}
      <${Evidence} p=${p} g=${g} />
      ${p.video ? html`<${PlatformVideo} g=${g} p=${p} now=${now} />` : null}
      <${PostMedia} g=${g} p=${p} au=${au} />
      ${p.fic ? html`<${FicCard} g=${g} p=${p} />` : null}
      ${p.crit ? html`<${CritCard} g=${g} p=${p} />` : null}
      ${p.poll ? html`<${PollCard} g=${g} p=${p} now=${now} />` : null}
      ${p.q ? html`<${QuoteCard} g=${g} q=${p.q} />` : null}
      ${p.evt ? html`<${EventCard} evt=${p.evt} />` : null}
      ${p.a === 'p' ? html`<${PostResult} p=${p} g=${g} now=${now} />` : null}
      ${eventsAt(g, (x) => x.p === p.id && !x.r).map((ev) => html`<${EventChip} key=${ev.id} g=${g} ev=${ev} now=${now} />`)}
      <${PostActions} p=${p} now=${now} onReply=${() => openPost(p.id, true)} />
    </div>
  </article>`;
}
function replyToReply(p, r) {
  S.replyTo[p.id] = r.id;
  update(false);
  setTimeout(() => { const el = byId('reply-' + p.id); if (el) el.focus(); }, 40);
}
function ReplyRow({ g, p, r, now, depth, parent }) {
  const au = author(g, r.a);
  const likes = Math.round((r.likeT || 0) * ease((now - (r.ls || r.at)) / (r.animMs || 30000))) + (r.liked ? 1 : 0);
  const me = r.a === 'p';
  const picked = S.replyTo[p.id] === r.id;
  const pinned = p.pin === r.id, tr = !!(r.lang && S.trOn && S.trOn[r.id]); // 0.29: pinned by the player; from abroad, translated on demand
  return html`<article id=${'r-' + r.id} class=${'post reply-row' + (depth ? ' nested' : '') + (picked ? ' picked' : '') + (pinned ? ' pinned' : '')} style="cursor:default">
    <${Avatar} who=${au} size=${depth ? 36 : 44} onClick=${() => openAuthor(au)} />
    <div class="post-body">
      ${pinned ? html`<div class="pin-tag"><span aria-hidden="true">📌</span> Épinglé par toi</div>` : null}
      <div class="post-head"><${AuthorName} au=${au} />${au.verified ? html`<${Verified} />` : null}<${TopFanTag} g=${g} a=${r.a} /><${BuzzTag} g=${g} a=${r.a} now=${now} /><${AuthorHandle} au=${au} /><span class="post-time">· ${fmtAgo(r.ts, now)}</span></div>
      ${parent ? html`<div class="reply-to">En réponse à <span class="mention">@${author(g, parent.a).handle}</span></div>` : null}
      <p class="post-text"><${RichText} text=${tr ? r.fr : r.text} g=${g} /></p>
      ${r.lang ? html`<button type="button" class="linkbtn tr-btn" onClick=${() => { S.trOn = Object.assign({}, S.trOn, { [r.id]: !tr }); update(false); }}>${tr ? `Traduit de ${LANG_NAMES[r.lang] || 'une autre langue'} · Voir l’original` : 'Traduire'}</button>` : null}
      ${p.ratio === r.id ? html`<span class="ratio-tag">💀 Ratio</span>` : null}
      ${eventsAt(g, (x) => x.r === r.id).map((ev) => html`<${EventChip} key=${ev.id} g=${g} ev=${ev} now=${now} compact=${true} />`)}
      ${me && !revealed(r, now) ? html`<div class="res"><span class="chip pending"><${Typing} /> On te lit…</span></div>` : null}
      ${me && revealed(r, now) ? html`<${ResChips} r=${r.res} now=${now} removed=${!!r.removed} />` : null}
      <div class="post-actions" style="max-width:240px">
        <button class=${'act' + (picked ? ' on-reply' : '')} onClick=${() => replyToReply(p, r)} aria-label=${'Répondre à @' + au.handle}><${Icon} n="msg" s=${17} /><span>Répondre</span></button>
        <button class=${'act act-like' + (r.liked ? ' on' : '')} disabled=${me} onClick=${() => toggleReplyLike(p, r)} aria-label="J’aime" aria-pressed=${r.liked ? 'true' : 'false'}><${Icon} n="heart" s=${17} fill=${!!r.liked} /><span>${likes ? fmtN(likes) : ''}</span></button>
        ${p.a === 'p' && !me && !depth ? html`<button class=${'act act-pin' + (pinned ? ' on' : '')} onClick=${() => pinReply(g, p, r)} aria-label=${pinned ? 'Désépingler' : 'Épingler ce commentaire'} aria-pressed=${pinned ? 'true' : 'false'} title=${pinned ? 'Désépingler' : 'Épingler'}><span aria-hidden="true">📌</span></button>` : null}
      </div>
    </div>
  </article>`;
}
// Replies grouped by conversation: each reply is followed by the answers to it (one level of indent).
function threadOrder(replies) {
  const byId = new Map(replies.map((r) => [r.id, r]));
  const kids = new Map();
  const roots = [];
  for (const r of replies) {
    if (r.to && r.to !== r.id && byId.has(r.to)) { if (!kids.has(r.to)) kids.set(r.to, []); kids.get(r.to).push(r); }
    else roots.push(r);
  }
  const out = [];
  const seen = new Set();
  const walk = (r, depth) => {
    if (seen.has(r.id)) return;
    seen.add(r.id);
    out.push({ r, depth, parent: r.to ? byId.get(r.to) || null : null });
    for (const k of (kids.get(r.id) || []).sort((a, b) => a.ts - b.ts)) walk(k, 1);
  };
  for (const r of roots.sort((a, b) => a.ts - b.ts)) walk(r, 0);
  for (const r of replies) walk(r, 0);
  return out;
}

/* ---------- tabs ---------- */
function CancelBanner({ g, now }) {
  const pr = shopPrice('pr');
  const wait = APOLOGY_COOLDOWN - (now - (g.apologyAt || 0));
  const bb = playerBadBuzz(g, now) ? g.chars[g.pbb.c] : null;
  return html`<div class="cancel-banner">
    <p><b>Tu es cancel${bb ? ` : ta fausse preuve contre ${bb.name} a été démasquée` : ''}.</b> Chaque post te coûte des abonnés tant que ta réputation (${rep1000(g.stats.reputation)}) n’est pas remontée à 350.</p>
    <div class="row">
      <button class="btn btn-hot btn-sm" onClick=${() => openCompose({ apology: true })} disabled=${wait > 0}>${wait > 0 ? 'Excuses dans ' + fmtClock(wait) : 'M’excuser'}</button>
      <button class="btn btn-ghost btn-sm" onClick=${startLowProfile}><${Icon} n="moon" s=${15} /> Profil bas</button>
      <button class="btn btn-ghost btn-sm" onClick=${() => buy('pr')} disabled=${g.stats.gems < pr}>Agence de com’ · ${pr} <${Icon} n="gem" s=${13} /></button>
    </div>
  </div>`;
}
function LowBanner({ g, now, compose }) {
  const L = g.low;
  if (!L) return null;
  return html`<div class=${'low-banner' + (compose ? ' in-compose' : '')}>
    <span class="nic"><${Icon} n="moon" s=${18} /></span>
    <div><b>Profil bas · encore ${fmtClock(L.until - now)}</b><span>${compose ? 'Pas de post pour l’instant. ' : ''}+${L.gain * 10} de réputation jusqu’ici. Tu peux répondre et écrire en privé.</span></div>
    <button class="btn btn-ghost btn-sm" onClick=${stopLowProfile}>Arrêter</button>
  </div>`;
}
const FEED_PAGE = 30; // 0.28.1: the feed shows its last 30 posts, then « Voir plus » (coming back to it stays quick)
function FeedTab({ g, now }) {
  const [pages, setPages] = useState(1);
  const all = revealedPosts(g, now);
  const seen = S.feedAtTop ? now : S.feedSeenAt;
  const every = all.filter((p) => p.at <= seen || p.a === 'p');
  const visible = every.slice(0, FEED_PAGE * pages), more = every.length - visible.length;
  const fresh = all.length - every.length;
  const s = g.stats;
  const tr = trends(g, now);
  const low = lowActive(g, now);
  return html`
    <div class="feed-tools">
      <span class="world-chip"><span class="wdot" style=${'--h:' + g.world.hue}>${g.world.emoji}</span><span>${g.world.name}</span></span>
      <div class="row" style="gap:6px;flex-wrap:nowrap">
        <button class="btn btn-ghost btn-sm ffwd-btn" onClick=${openWatch} aria-label="Avancer le temps"><${Icon} n="ffwd" s=${15} /><span class="lbl-wide">Avancer</span></button>
        <button class="btn btn-ghost btn-sm" onClick=${() => refreshFeed(0)} disabled=${S.busy.refresh}>${S.busy.refresh ? html`<${Typing} /> Ça bouge…` : html`<${Icon} n="refresh" s=${15} /> Actualiser`}</button>
      </div>
    </div>
    <${StoriesBar} g=${g} now=${now} />
    <${NetBanner} g=${g} now=${now} />
    <${MemoryCard} g=${g} now=${now} />
    ${stayOn(g, now) ? html`<${StayLine} g=${g} />` : null}
    ${HOST && autoLiveOn(g) ? html`<${LiveLine} g=${g} now=${now} />` : null}
    ${tr.length ? html`<div class="trend-strip" aria-label="Tendances">${tr.map(([tg]) => html`<button key=${tg} class="trend-chip" onClick=${() => openTag(tg)}><${Icon} n="trend" s=${13} /><span>${tg}</span></button>`)}</div>` : null}
    ${S.catchup ? html`<div class="catchup">
      <p><b>Tu étais ${px(g, 'absent', 'absente', 'absent·e')} ${fmtDur(S.catchup.ms)}.</b> ${S.catchup.gain ? nAbonnes(S.catchup.gain, true) + ' pendant ce temps. ' : ''}Le réseau ne t’a pas attendu.</p>
      <div class="row"><button class="btn btn-hot btn-sm" onClick=${() => refreshFeed(S.catchup.ms)} disabled=${S.busy.refresh}>Voir ce qui s’est passé</button><button class="btn btn-ghost btn-sm" onClick=${() => { S.catchup = null; update(false); }}>Ignorer</button></div>
    </div>` : null}
    ${low ? html`<${LowBanner} g=${g} now=${now} />`
      : s.cancelled ? html`<${CancelBanner} g=${g} now=${now} />`
        : s.reputation < 25 ? html`<div class="warn-banner"><${Icon} n="alert" s=${16} /><span>Ta réputation chute (${rep1000(s.reputation)}/1000). Encore un faux pas et c’est le cancel.</span></div>` : null}
    <${RumorBanner} g=${g} now=${now} />
    <${SecretBanner} g=${g} now=${now} />
    <${ReleaseCard} g=${g} now=${now} />
    <${EventsStrip} g=${g} now=${now} />
    ${s.posts === 0 && !S.busy.act ? html`<div class="nudge">
      <p><b>À toi de jouer.</b> Publie ton premier post. Mentionne un personnage avec son @ pour qu’il réagisse, ou va lui parler en privé dans Messages.</p>
      <button class="btn btn-hot btn-sm" onClick=${() => openCompose()}><${Icon} n="pen" s=${15} /> Publier mon premier post</button>
    </div>` : null}
    ${fresh > 0 ? html`<button class="pill-new" onClick=${scrollFeedTop}><${Icon} n="up" s=${15} /> ${fresh} ${plural(fresh, 'nouveau post', 'nouveaux posts')}</button>` : null}
    ${visible.map((p) => html`<${PostRow} key=${p.id} g=${g} p=${p} now=${now} />`)}
    ${more > 0 ? html`<div class="feed-more"><button class="btn btn-ghost btn-sm" onClick=${() => setPages(pages + 1)}><${Icon} n="chevdown" s=${15} /> Voir plus · ${more} ${plural(more, 'post', 'posts')}</button></div>` : html`<div class="feed-end">
      <span>${visible.length ? 'Tu es à jour.' : 'Ton fil est vide.'} Publie ou actualise pour faire bouger ton monde.</span>
      <div class="row" style="justify-content:center"><button class="btn btn-hot btn-sm" onClick=${() => openCompose()}>Publier</button><button class="btn btn-ghost btn-sm" onClick=${() => refreshFeed(0)} disabled=${S.busy.refresh}>Actualiser</button></div>
    </div>`}`;
}
// 0.23.1: the network living on its own says where it is: the next news in about N minutes, or paused (and why).
// 0.25.3: the morning after a night together: where the player is, until they go home.
function StayLine({ g }) {
  const s = g.stay, c = g.chars[s.c], first = firstName(c);
  return html`<div class="live-line stay-line"><span aria-hidden="true">🌅</span><span>${s.where === 'c' ? `Tu es chez ${first} depuis cette nuit` : `${first} a dormi chez toi`}</span><button type="button" class="linkbtn" onClick=${() => endStay(g)}>${s.where === 'c' ? 'Rentrer chez toi' : 'Lui dire au revoir'}</button></div>`;
}
function LiveLine({ g, now }) {
  const why = livePause(now);
  if (why) return html`<div class="live-line paused"><span aria-hidden="true">⏸</span><span>Le réseau est en pause : ${why === 'away' ? 'tu n’es pas sur Hype' : 'tu ne touches plus à rien'}. Il repart dès que tu reviens.</span></div>`;
  const left = Math.max(0, intensityOf(g).liveMs - (now - (g.lastRefreshAt || 0)));
  return html`<div class="live-line"><span aria-hidden="true">🌍</span><span>Le réseau vit tout seul · ${S.busy.refresh ? 'ça bouge…' : left < 60000 ? 'des nouvelles d’une minute à l’autre' : `des nouvelles dans ${Math.ceil(left / 60000)} min environ`}</span></div>`;
}
const NOTIF_ICON = {
  like: ['heart', 'hot'], reply: ['msg', ''], mention: ['at', 'hot'], follow: ['userplus', 'good'], unfollow: ['userminus', 'bad'],
  relup: ['users', 'good'], reldown: ['users', 'bad'], quest: ['trophy', 'flash'], ach: ['trophy', 'flash'], questnew: ['trophy', ''], questprog: ['trophy', ''], level: ['level', 'hot'], skill: ['level', 'good'],
  new: ['sparkles', 'hot'], dm: ['msg', 'hot'], viral: ['flame', 'flash'], cancel: ['alert', 'bad'], uncancel: ['shield', 'good'],
  milestone: ['trend', 'good'], drama: ['megaphone', 'bad'], collab: ['megaphone', 'good'], info: ['sparkles', ''],
  vibe: ['heart', 'hot'], seen: ['msg', 'bad'], screen: ['alert', 'bad'], apology: ['shield', ''], low: ['moon', 'good'],
  trend: ['trend', 'flash'], clue: ['search', 'hot'], badbuzz: ['flame', 'bad'], crowd: ['users', ''], busted: ['mask', 'bad'], release: ['clapper', 'hot'], releasedue: ['clapper', 'hot'], delay: ['clock', 'bad'], event: ['calendar', 'hot'], eventdue: ['calendar', 'hot'], tox: ['flame', 'bad'],
  money: ['cash', 'good'], gear: ['wrench', 'flash'], // 0.20
  advice: ['bulb', 'flash'], trust: ['trust', 'good'], trustup: ['trust', 'good'], trustdown: ['trust', 'bad'], secret: ['lock', 'hot'],
  standdown: ['trend', 'bad'], standup: ['trend', 'good'], echo: ['sparkles', 'flash'],
  train: ['train', 'flash'], trainstart: ['train', 'flash'], // 0.17
  rumor: ['megaphone', 'bad'], // 0.28.1
  fanfic: ['book', 'hot'], crit: ['clapper', 'bad'], // 0.29
};
// 0.28.1: the achievements' window, at one of them (brought into view and shown off a moment: R17)
function openAch(id) {
  openLayer({ t: 'ach' });
  const A = id && S.game ? ACH_BY[id] : null;
  if (!A) return;
  const name = achName(S.game, A);
  let tries = 0;
  const find = () => {
    const docs = [document].concat((S.os || []).map((l) => { try { return l.os.w.document; } catch (e) { return null; } }).filter(Boolean)); // (its window may be out of the game)
    for (const d of docs) {
      for (const el of d.querySelectorAll('.ach-row')) {
        const b = el.querySelector('.mid > b');
        if (el.dataset.ach ? el.dataset.ach !== id : !b || b.textContent !== name) continue;
        el.scrollIntoView({ block: 'center' });
        el.classList.add('ach-hl');
        setTimeout(() => el.classList.remove('ach-hl'), 2600);
        return;
      }
    }
    if (++tries < 12) setTimeout(find, 80);
  };
  setTimeout(find, 60);
}
function openNotif(n) {
  const g = S.game;
  if (n.k === 'ach') return openAch(n.a); // 0.28.1: an achievement: its window; a skill: its tree
  if (n.k === 'skill' && n.sk) return openLayer({ t: 'skill', id: n.sk });
  if (n.k === 'rumor' && n.p && g.posts.some((p) => p.id === n.p)) return openPost(n.p); // (0.28.1: the rumor's post, where it can be denied)
  if ((n.k === 'dm' || n.k === 'seen') && n.c && g.chars[n.c]) return openDM(n.c);
  if ((n.k === 'advice' || n.k === 'secret') && !n.p && n.c && g.chars[n.c]) return openDM(n.c);
  if (n.p && g.posts.some((p) => p.id === n.p)) return openPost(n.p);
  if (n.k === 'trend' && n.tg) return openTag(n.tg);
  if (n.k === 'quest' || n.k === 'questnew' || n.k === 'questprog') return goTab('quests');
  if (n.k === 'cancel' && g.stats.cancelled) return queueModal({ t: 'cancel', at: Date.now() }); // 0.15: the ways out, again
  if (['level', 'milestone', 'cancel', 'uncancel', 'low'].includes(n.k)) return goTab('profile');
  if (n.c && g.chars[n.c]) return openChar(n.c);
}
function NotifsTab({ g, now }) {
  const list = g.notifs.filter((n) => n.at <= now).sort((a, b) => b.at - a.at);
  if (!list.length) return html`<div class="empty"><b>Rien pour l’instant</b><span>Publie un post : les réactions arriveront ici.</span></div>`;
  return list.map((n) => {
    const [ic, tone] = NOTIF_ICON[n.k] || ['bell', ''];
    const A = n.k === 'ach' && n.a ? ACH_BY[n.a] : null; // (0.28.1: an achievement shows its icon)
    return html`<button key=${n.id} class=${'notif' + (n.at > S.notifSeenBefore ? ' unread' : '')} onClick=${() => openNotif(n)}>
      <span class=${'nic ' + (A ? 'ach' : tone)}>${A ? achIcon(A, 30) : html`<${Icon} n=${ic} s=${18} />`}</span><p>${emoParts(n.text)}</p><time>${fmtAgo(n.at, now)}</time></button>`;
  });
}
function DMsTab({ g, now }) {
  const convos = Object.keys(g.dms).map((id) => {
    const c = g.chars[id];
    const msgs = g.dms[id].msgs.filter((m) => m.at <= now);
    return { c, last: msgs[msgs.length - 1], n: unreadDM(g, id, now) };
  }).filter((x) => x.c && x.last).sort((a, b) => b.last.at - a.last.at);
  const starters = mains(g).filter((c) => !convos.some((x) => x.c.id === c.id));
  return html`
    <${GroupRows} g=${g} now=${now} />
    ${liveGroups(g).length && convos.length ? html`<div class="list-h">Messages</div>` : null}
    ${convos.length ? convos.map(({ c, last, n }) => html`<button key=${c.id} class=${'convo' + (n ? ' unread' : '')} onClick=${() => openDM(c.id)}>
        <${Avatar} who=${author(g, 'c:' + c.id)} size=${48} />
        <div class="mid"><div><b>${c.name}</b><span>${isMain(c) ? relShown(c) + (c.vibe && VIBES[c.vibe] && !partnerWord(c) ? ' ' + VIBES[c.vibe].emoji : '') : c.role}</span></div><p>${last.me ? 'Toi : ' : ''}${last.sys === 'deal' ? '📄 Proposition de partenariat' : last.sys === 'invite' ? '📅 Invitation : ' + last.title : last.sys === 'leak' ? '📸 Capture du groupe « ' + last.group + ' »' : emoParts(last.text)}</p></div>
        <div class="side-meta"><span>${fmtAgo(last.at, now)}</span>${n ? html`<span class="dot-count">${n}</span>` : null}</div>
      </button>`)
      : html`<div class="empty"><b>Aucun message</b><span>Écris à un personnage : c’est en privé que les alliances se font.</span></div>`}
    ${starters.length ? html`<div class="list-h">Écrire à quelqu’un<span>≈ ${costLabel(g, 'dm')} café par message</span></div>
      <div class="starters">${starters.map((c) => html`<button key=${c.id} class="starter" onClick=${() => openDM(c.id)}><${Avatar} who=${author(g, 'c:' + c.id)} size=${52} /><span>${firstName(c)}</span></button>`)}</div>` : null}`;
}
function ShopItem({ it, g }) {
  const active = (it.id === 'reach' && g.boosts.reach) || (it.id === 'viral' && g.boosts.viral) || (it.id === 'push' && g.boosts.push); // (0.28.1: the release's push too)
  const miss = it.price - g.stats.gems;
  return html`<div class="shop-item">
    <span class=${'nic ' + it.tone}><${Icon} n=${it.icon} s=${18} /></span>
    <div><b>${it.label}</b><span>${active ? (it.id === 'push' ? 'Actif sur ta prochaine sortie.' : 'Actif sur ton prochain post.') : it.desc}</span>${!active && miss > 0 ? html`<small class="miss">Il te manque ${miss} ${plural(miss, 'gemme', 'gemmes')}</small>` : null}</div>
    ${active ? html`<button class="btn btn-sm btn-ghost price is-on" disabled aria-label=${it.label + ' : actif'}><${Icon} n="check" s=${14} /> Actif</button>`
      : html`<button class="btn btn-sm btn-ink price" onClick=${() => buy(it.id)} disabled=${miss > 0} aria-label=${'Acheter ' + it.label + ' pour ' + it.price + ' gemmes'}><${Icon} n="gem" s=${14} /> ${it.price}</button>`}
  </div>`;
}
function questActions(g, q) {
  const c = q.charId ? g.chars[q.charId] : null;
  const ok = c && c.unlocked;
  const first = c ? firstName(c) : '';
  const A = [];
  const dm = () => A.push({ label: `Écrire à ${first}`, icon: 'msg', run: () => openDM(c.id) });
  const mention = () => A.push({ label: `Mentionner ${first}`, icon: 'at', run: () => openCompose({ text: '@' + c.handle + ' ' }) });
  const post = () => A.push({ label: 'Publier', icon: 'pen', run: () => openCompose() });
  switch (q.kind) {
    case 'followers': case 'likes': case 'viral': post(); break;
    case 'rep': if (g.stats.cancelled || playerBadBuzz(g)) A.push({ label: 'M’excuser', icon: 'shield', run: () => openCompose({ apology: true }) }); else post(); break;
    case 'rel': case 'vibe': if (ok) { dm(); mention(); } break;
    case 'dm': if (ok) dm(); break;
    case 'mention': if (ok) mention(); break;
    case 'replies': A.push({ label: 'Voir le fil', icon: 'home', run: () => goTab('feed') }); break;
    case 'replyc': {
      const p = revealedPosts(g).find((x) => x.replies.some((r) => r.a !== 'p' && r.at <= Date.now()));
      if (p) A.push({ label: 'Ouvrir une conversation', icon: 'msg', run: () => openPost(p.id) });
      break;
    }
    case 'story':
      if (ok) { dm(); mention(); }
      A.push({ label: `Des idées · ≈ ${costLabel(g, 'ideas')} ☕`, icon: 'sparkles', run: () => { openCompose(); loadIdeas(null, null, q); } });
      break;
    default: break;
  }
  return A;
}
function QuestCard({ q, g, now }) {
  const pr = q.kind === 'story' ? null : questProgress(g, q, now);
  const c = q.charId ? g.chars[q.charId] : null;
  const done = q.status === 'done';
  const acts = done ? [] : questActions(g, q);
  const kindLabel = q.kind === 'story' ? 'Histoire' : q.kind === 'vibe' ? 'Relation' : 'Défi';
  return html`<article class=${'quest' + (done ? ' done' : '')}>
    <header><span class=${'quest-kind' + (q.kind === 'story' || q.kind === 'vibe' ? ' story' : '')}>${kindLabel}</span>${c && c.unlocked ? html`<button class="linkbtn" style="font-size:13px" onClick=${() => openChar(c.id)}>@${c.handle}</button>` : null}</header>
    <h4>${q.title}</h4>
    ${q.desc ? html`<p>${q.desc}</p>` : null}
    ${q.kind === 'story' && !done ? html`<div class="prog"><${Meter} frac=${(q.pct || 0) / 100} /><span>${q.pendingDone ? 'Presque…' : (q.pct || 0) + ' %'}</span></div>
      <p class="quest-step">${q.step ? 'Dernière avancée : ' + q.step : 'C’est l’histoire qui décide quand c’est fait.'}</p>` : null}
    <footer>
      ${done ? html`<span class="chip good"><${Icon} n="check" s=${14} /> Réussie</span>`
        : pr ? html`<div class="prog"><${Meter} frac=${pr.frac} /><span>${pr.text}</span></div>` : html`<span></span>`}
      <div class="row" style="gap:6px"><span class="chip hot">+${q.reward.xp} XP</span><span class="chip flash"><${Icon} n="gem" s=${12} /> ${q.reward.gems}</span></div>
    </footer>
    ${acts.length ? html`<div class="quest-acts">${acts.map((a) => html`<button key=${a.label} class="btn btn-ghost btn-sm" onClick=${a.run}><${Icon} n=${a.icon} s=${15} /> ${a.label}</button>`)}</div>` : null}
    ${!done ? html`<div><button class="linkbtn quiet" onClick=${() => askConfirm({ title: 'Abandonner cette quête ?', text: `« ${q.title} » disparaîtra de ta liste.`, ok: 'Abandonner', danger: true, run: () => abandonQuest(g, q) })}>Abandonner cette quête</button></div>` : null}
  </article>`;
}
function QuestsTab({ g, now }) {
  const rank = (q) => (q.kind === 'story' ? 0 : q.kind === 'vibe' ? 1 : 2);
  const act = activeQuests(g).slice().sort((a, b) => rank(a) - rank(b));
  const done = g.quests.filter((q) => q.status === 'done').sort((a, b) => b.doneAt - a.doneAt).slice(0, 6);
  return html`
    <div class="list-h">En cours<span>${act.length} ${plural(act.length, 'quête', 'quêtes')}</span></div>
    ${act.length ? act.map((q) => html`<${QuestCard} key=${q.id} q=${q} g=${g} now=${now} />`) : html`<div class="empty"><span>Aucune quête pour l’instant. Publie : de nouvelles intrigues vont apparaître.</span></div>`}
    <div class="list-h">Boutique<span>${g.stats.gems} ${plural(g.stats.gems, 'gemme', 'gemmes')}</span></div>
    ${SHOP.map((it) => html`<${ShopItem} key=${it.id} it=${it} g=${g} />`)}
    ${done.length ? html`<div class="list-h">Terminées<span>${done.length}</span></div>${done.map((q) => html`<${QuestCard} key=${q.id} q=${q} g=${g} now=${now} />`)}` : null}`;
}
// 0.29: the player's bio, written or changed at any time, even when left empty at the creation (the characters read
// the new one: ai.js, « Sa bio »).
const BIO_MAX = 140;
function BioBox({ g }) {
  const P = g.player, ref = useRef(null);
  const [ed, setEd] = useState(null); // the bio being typed (null: not being edited)
  const em = useEmoji('bio', ref, () => ed || '', (v) => setEd(v), BIO_MAX);
  useEffect(() => { if (ed != null && ref.current && !ref.current.dataset.f) { ref.current.dataset.f = '1'; ref.current.focus(); } }, [ed != null]);
  const close = () => { if (S.emoOpen === 'bio') S.emoOpen = null; setEd(null); };
  const ok = () => {
    const b = str(ed, BIO_MAX);
    if (b !== (P.bio || '')) { P.bio = b; scheduleSave(); toast(b ? 'Ta bio est à jour.' : 'Ta bio est effacée.', 'good'); }
    close();
  };
  if (ed == null) {
    return P.bio
      ? html`<div class="bio-row"><p class="bio">${P.bio}</p><button class="iconbtn bio-ed" onClick=${() => setEd(P.bio)} aria-label="Modifier ta bio" title="Modifier ta bio"><${Icon} n="pen" s=${15} /></button></div>`
      : html`<button class="linkbtn bio-add" onClick=${() => setEd('')}><${Icon} n="pen" s=${14} /> Ajouter une bio</button>`;
  }
  return html`<div class="bio-edit">
    <textarea ref=${ref} class="input" rows="2" maxlength=${BIO_MAX} value=${ed} placeholder="Ce qu’on lit sur ton profil" aria-label="Ta bio"
      onInput=${(e) => setEd(e.target.value)} onKeyDown=${(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ok(); } else if (e.key === 'Escape') { e.stopPropagation(); close(); } }}></textarea>
    ${em.panel}
    <div class="bio-tools">${em.btn}<span class="muted">${ed.length}/${BIO_MAX}</span><span class="sp"></span>
      <button class="btn btn-ghost btn-sm" onClick=${close}>Annuler</button><button class="btn btn-hot btn-sm" onClick=${ok}>Enregistrer</button></div>
  </div>`;
}
function ProfileTab({ g, now }) {
  const P = g.player, s = g.stats;
  const stamp = (p) => (p.a === 'p' ? p.ts : p.rpAt || p.ts);
  const mine = revealedPosts(g, now).filter((p) => p.a === 'p' || p.reposted).sort((a, b) => stamp(b) - stamp(a));
  const rels = mains(g, true, true).slice().sort((a, b) => b.rel - a.rel); // (0.30: those « en retrait » too: writing to them brings them back)
  const fans = rels.filter((c) => c.followsYou).length;
  const journal = g.chronicle.slice(-8).reverse();
  return html`
    <div class="banner" style=${'--h:' + P.hue}></div>
    <div class="prof">
      <div class="prof-top"><${PfpButton} g=${g} /><button class="btn btn-ghost btn-sm" onClick=${leaveGame}><${Icon} n="grid" s=${15} /> Mes parties</button></div>
      <div><h2>${P.name}</h2><span class="handle">@${P.handle}</span></div>
      <${BioBox} g=${g} />
      <p class="muted" style="font-size:14px">${g.world.emoji} ${g.world.name} · ${P.identity}</p>
      <p class="muted play-time" style="font-size:14px">⏱️ ${s.playEst ? '≈ ' : ''}${fmtPlay(s.playMs)} de jeu${s.playEst ? ' (le temps d’avant la 0.30 est estimé)' : ''}</p>
      <p class="muted play-day" style="font-size:14px">📅 Jour ${playDay(g, now)} de ta partie, commencée le ${playStartWord(g)}</p>
      <${PlayerSocialLinks} g=${g} now=${now} />
      <${ShipsRow} g=${g} />
      <div class="prof-stats"><span><b>${fmtN(s.followers)}</b> ${plural(s.followers, 'abonné', 'abonnés')}</span><span><b>${s.following}</b> ${plural(s.following, 'abonnement', 'abonnements')}</span><span><b>${s.posts}</b> ${plural(s.posts, 'post', 'posts')}</span>${s.cancelled ? html`<span class="chip bad">Cancel</span>` : null}${playerBadBuzz(g, now) ? html`<span class="chip bad">Bad buzz</span>` : null}${isShady(g, now) ? html`<span class="chip bad" title="On se méfie de tes conseils">${px(g, 'Manipulateur', 'Manipulatrice', 'Manipulateur·rice')} · encore ${fmtDur(g.shady.until - now)}</span>` : null}</div>
    </div>
    <section class="section">
      <div class="section-h"><h3>Niveau ${s.level}</h3><span class="mono">${s.xp} / ${xpNeed(s.level)} XP</span></div>
      <${Meter} frac=${s.xp / xpNeed(s.level)} />
      ${lowActive(g, now) ? html`<${LowBanner} g=${g} now=${now} />` : s.cancelled ? html`<${CancelBanner} g=${g} now=${now} />` : null}
    </section>
    <${RepSection} g=${g} now=${now} />
    <${SecretsSection} g=${g} now=${now} />
    <${SkillsSection} g=${g} />
    <${AchSection} g=${g} />
    <section class="section">
      <div class="section-h"><h3>Relations</h3><span>${fans === 0 ? 'Personne ne te suit encore' : fans === 1 ? '1 te suit' : fans + ' te suivent'}</span></div>
      ${rels.map((c) => html`<button class="rel-row" key=${c.id} onClick=${() => openChar(c.id)}>
        <${Avatar} who=${author(g, 'c:' + c.id)} size=${40} />
        <div class="mid"><div><b>${c.name}</b><span>${relShown(c)}${vibeTag(c)}${c.followsYou ? ' · te suit' : ''} · confiance ${trustOf(c)}${c.asleep ? ' · 😴 en retrait' : ''}</span></div><${RelMeter} rel=${c.rel} /></div>
        <span class="num">${fmtRel(c.rel)}</span>
      </button>`)}
      ${mains(g, false).some((c) => !c.unlocked) ? html`<p class="muted" style="font-size:13px">D’autres personnages arriveront quand tu monteras de niveau.</p>` : null}
    </section>
    ${(g.dateLog || []).length ? html`<section class="section dlog-sec">
      <div class="section-h"><h3>Tes rendez-vous</h3><span>${g.dateLog.length} ${plural(g.dateLog.length, 'soirée', 'soirées')}</span></div>
      <button class="btn btn-ghost btn-sm" onClick=${() => openLayer({ t: 'datelog' })}><${Icon} n="book" s=${15} /> Les relire</button>
    </section>` : null}
    ${(() => {
      const files = mains(g).map((c) => [c, (g.clues || []).filter((k) => k.c === c.id && k.at <= now).length]).filter(([, n]) => n > 0);
      return files.length ? html`<section class="section">
        <div class="section-h"><h3>Tes dossiers</h3><span>indices remarqués</span></div>
        ${files.map(([c, n]) => html`<button class="rel-row" key=${c.id} onClick=${() => openChar(c.id)}>
          <${Avatar} who=${author(g, 'c:' + c.id)} size=${40} />
          <div class="mid"><div><b>${c.name}</b><span>${n} ${plural(n, 'indice', 'indices')}${inBadBuzz(c, now) ? ' · en plein bad buzz' : ''}</span></div></div>
          <span class="num"><${Icon} n="search" s=${16} /></span>
        </button>`)}
      </section>` : null;
    })()}
    ${journal.length ? html`<section class="section">
      <div class="section-h"><h3>Journal</h3><span>Ce que le monde retient</span></div>
      ${journal.map((e, i) => html`<div class="journal-row" key=${i}><time>${fmtAgo(e.ts, now)}</time><p>${e.text}</p></div>`)}
    </section>` : null}
    <div class="list-h">Tes posts<span>${mine.length}</span></div>
    ${mine.length ? mine.map((p) => html`<${PostRow} key=${p.id} g=${g} p=${p} now=${now} repost=${p.a !== 'p'} />`)
      : html`<div class="empty"><span>Tu n’as encore rien publié.</span><button class="btn btn-hot btn-sm" onClick=${() => openCompose()}>Publier mon premier post</button></div>`}
    <${PhotoTools} g=${g} k="p" />
    <section class="section" style="border-bottom:0">
      <div class="row"><button class="btn btn-ghost btn-sm" onClick=${() => openLayer({ t: 'settings' })}><${Icon} n="gear" s=${15} /> Réglages de la partie</button><button class="btn btn-ghost btn-sm" onClick=${() => goTab('studio')}><${Icon} n="studio" s=${15} /> Mon studio</button></div>
    </section>`;
}

/* ---------- announced releases: countdown, shoot (mini-game), publish or postpone ---------- */
// 0.28.1: postponing picks the new time; well ahead of time it is free (earlyMove), at the last minute it costs.
function askPostpone(g, r) { if (canPostpone(r)) openLayer({ t: 'later', id: r.id }); }
// The cost of a last-minute postponement, as said before choosing.
function postponeCost(g, r) {
  const n = r.delays + 1;
  return `${n === 1 ? 'Premier' : n === 2 ? 'Deuxième' : 'Dernier'} report : ${repWord(repTry(g, postponePlan(n)))}${n >= 2 ? ' et des abonnés qui partent' : ''}.`;
}
function askDrop(g, r) {
  const free = !r.series && !r.big && (r.now || r.auto); // (0.30: made right away, nobody waited; 0.31.2: launched by the game, not the player)
  askConfirm({
    title: `${free ? 'Retirer' : 'Abandonner'} ${ta(r)} ?`, ok: free ? 'Retirer' : 'Abandonner', danger: !free,
    text: r.auto && free ? `C’est le jeu qui l’avait lancé${whatF(r) ? 'e' : ''} à partir de ton post : tu peux ${whatF(r) ? 'la' : 'le'} retirer sans rien perdre.` : free ? 'Personne ne l’attendait : rien de perdu.' : `Tout le monde l’attendait : ${repWord(repTry(g, DROP_PLAN))} et des abonnés qui partent.`,
    run: () => { dropRelease(g, r); dropLayers((l) => l.t === 'minigame' && l.id === r.id); update(); },
  });
}
// 0.28.1: a text cut at its last whole word, with « … » (never in the middle of a word)
function wordCut(s, n) {
  const t = str(s, 400);
  if (t.length <= n) return t;
  const head = t.slice(0, n + 1), k = head.lastIndexOf(' ');
  return (k >= n / 2 ? head.slice(0, k) : t.slice(0, n)).replace(/[\s,;:.!?…'’«-]+$/, '') + '…';
}
// Where « jusqu’à la sortie » goes, read when the jump really happens (it may wait for the characters to finish).
const relDue = (r) => () => { const x = S.game && activeRelease(S.game); return x && x.id === r.id ? x.due : 0; };
function ReleaseCard({ g, now }) {
  const plan = plannedReleases(g), r = plan[0] || null, more = plan.slice(1); // 0.27.4: the others wait their turn
  if (!r || S.publishing === r.id) return null;
  if (r.big) return html`<${BigCard} g=${g} r=${r} now=${now} more=${more} />`; // 0.30.1: a big production
  const W = WHATS[r.what] || WHATS.vidéo;
  const left = r.due - now;
  const pw = prodMs(r) && r.what !== 'live'; // 0.30.1: the time to start it, and when it comes out
  return html`<div class=${'release-card' + (left <= 0 ? ' due' : '')}>
    <span class="rl-emo" aria-hidden="true">${W.emoji}</span>
    <div class="rl-mid">
      <b>${pw ? (left > 0 ? `Tournage de ${ta(r)} dans ${fmtLeft(left)}` : r.played ? `${cap1(ta(r))} est ${whatF(r) ? 'prête' : 'prêt'} : publie-${whatF(r) ? 'la' : 'le'} !` : `C’est l’heure de tourner ${ta(r)} !`) : left > 0 ? `${cap1(ta(r))} ${r.what === 'live' ? 'commence' : 'sort'} dans ${fmtLeft(left)}` : `C’est l’heure : ${ta(r)} doit sortir !`}</b>${pw && !r.played ? html`<span class="rl-out">Sortie ${relAnn(r) > now ? fmtWhen(relAnn(r), now) : 'en retard'} · ${prodWord(r.what, r.care, r.team)} de travail${r.care ? ' · ✨ soignée' : ''}</span>` : null}
      <span>« ${r.topic} »${r.series && g.series ? ` · défi : épisode ${r.ep}/${g.series.days} · bonus ×${fmtDec(seriesMult(g))}` : ''}${r.delays ? ` · ${whatF(r) ? 'repoussée' : 'repoussé'} ${r.delays} fois` : ''}${left <= 0 && relLimit(r) > now ? ` · encore ${fmtLeft(relLimit(r) - now)} pour ${whatF(r) ? 'la' : 'le'} ${r.played ? 'publier' : 'tourner'}, sinon ${r.series ? 'c’est un épisode manqué' : whatF(r) ? 'elle est abandonnée' : 'il est abandonné'}` : ''}</span>
      <div class="row">
        ${left > 0 ? html`<button class="btn btn-hot btn-sm" onClick=${() => skipTime(left + 1000, relDue(r))}>${S.skipWait ? html`<${Typing} /> J’avance dès que c’est fini` : html`<${Icon} n="ffwd" s=${15} /> ${pw ? 'Avancer jusqu’au tournage' : 'Avancer jusqu’à la sortie'}`}</button>`
          : html`<button class="btn btn-hot btn-sm" onClick=${() => startShoot(r)}><${Icon} n="clapper" s=${15} /> ${r.played ? 'Voir le tournage' : 'Tourner ' + laW(r)}</button>`}
        ${left > 0 && !r.series ? html`<button class="btn btn-ghost btn-sm" onClick=${() => openLayer({ t: 'move', id: r.id })}><${Icon} n="ffwd" s=${14} /> Sortir plus tôt</button>` : null}
        ${r.series ? null : html`${canPostpone(r, now) ? html`<button class="btn btn-ghost btn-sm" onClick=${() => askPostpone(g, r)}>Repousser</button>` : null}<button class="btn btn-ghost btn-sm" onClick=${() => askDrop(g, r)}>${r.auto ? 'Retirer sans malus' : 'Abandonner'}</button>`}
      </div>
      ${more.length ? html`<button type="button" class="linkbtn rl-more" onClick=${() => goTab('studio')}>Ensuite : ${more.slice(0, 2).map((x) => `${(WHATS[x.what] || WHATS.vidéo).emoji} « ${wordCut(x.topic, 28)} » ${fmtWhen(relAnn(x), now)}`).join(' · ')}${more.length > 2 ? ` · +${more.length - 2}` : ''}</button>` : null}
    </div>
  </div>`;
}
/* ---------- events: a ⏩ under what announced them, a strip of what is coming, the recap card ---------- */
const evBusy = () => !!(S.busy.act || S.busy.dm || S.busy.refresh || S.busy.ev || S.busy.mg);
// 0.27.8: why time cannot move on, said on screen (a tooltip never shows on a phone): a release to shoot first
const heldRel = (g, now) => { const rl = activeRelease(g); return rl && rl.due <= now ? rl : null; };
const heldWhy = (rl) => (rl.big ? bigHeld(rl) : `${cap1(ta(rl))} ${prodMs(rl) && rl.what !== 'live' ? 'est à tourner d’abord' : 'doit sortir d’abord'} : ${whatF(rl) ? 'tourne-la' : 'tourne-le'}${rl.series ? '' : ` ou ${whatF(rl) ? 'repousse-la' : 'repousse-le'}`}.`);
function askCancelDate(g, ev) {
  const c = g.chars[ev.c];
  const hurt = cancelHurt(ev.due - Date.now());
  askConfirm({
    title: `Annuler ton rendez-vous avec ${c ? firstName(c) : 'cette personne'} ?`,
    text: hurt === 0 ? 'Tu préviens bien à l’avance : ça devrait bien passer.' : hurt >= -3 ? 'Tu préviens un peu tard : ça risque de piquer un peu.' : hurt >= -6 ? 'À quelques heures près : ça va mal passer.' : 'À la dernière minute : ça va très mal passer.',
    ok: 'Annuler le rendez-vous', cancel: 'Garder le rendez-vous', danger: true,
    run: () => { cancelDate(g, ev); update(); },
  });
}
function EventChip({ g, ev, now, compact }) {
  const c = g.chars[ev.c];
  if (!c) return null;
  const K = EVENT_KINDS[ev.kind] || EVENT_KINDS.autre;
  const emo = ev.kind === 'rdv' ? MEET[meetKind(c, ev)].emoji : K.emoji;
  const due = now >= ev.due;
  const busy = evBusy();
  const rl = activeRelease(g);
  const held = !!(rl && rl.due <= now); // a release to shoot first: time cannot move on
  if (ev.awayUntil && now < ev.awayUntil) return html`<div class=${'evt-chip due away' + (compact ? ' compact' : '')} onClick=${stop(() => {})}>
    <span class="evt-emo" aria-hidden="true">${emo}</span>
    <span class="evt-mid"><b>${eventLabel(g, ev)}</b><small>Raté pendant ton absence · écris-lui avant ${hourOf(ev.awayUntil)}</small></span>
    <span class="evt-acts"><button class="btn btn-hot btn-sm" onClick=${stop(() => openDM(c.id))}>Lui écrire</button></span>
  </div>`; // 0.30: their time came while the game was closed: a word, before it counts
  return html`<div class=${'evt-chip' + (due ? ' due' : '') + (compact ? ' compact' : '')} onClick=${stop(() => {})}>
    <span class="evt-emo" aria-hidden="true">${emo}</span>
    <span class="evt-mid"><b>${eventLabel(g, ev)}</b><small>${due ? 'C’est maintenant' : fmtWhen(ev.due, now)} · « ${str(ev.what, 70)} »</small>${held && !due && !compact ? html`<small class="evt-held">${heldWhy(rl)}</small>` : null}</span>
    <span class="evt-acts">
      ${due ? html`<button class="btn btn-hot btn-sm" onClick=${stop(() => goEvent(ev))} disabled=${busy && S.busy.ev !== ev.id}>${S.busy.ev === ev.id ? html`<${Typing} />` : K.go}</button>`
        : html`<button class="btn btn-ghost btn-sm" onClick=${stop(() => skipTime(ev.due - Date.now() + 1000, () => ev.due))} disabled=${held} title=${held ? heldWhy(rl) : ''}><${Icon} n="ffwd" s=${14} /> Avancer</button>`}
      ${ev.player ? html`<button class="linkbtn quiet" onClick=${stop(() => askCancelDate(g, ev))}>Annuler</button>` : null}
    </span>
  </div>`;
}
const eventsAt = (g, pred) => activeEvents(g).filter((e) => e.src && pred(e.src));
function EventsStrip({ g, now }) {
  const list = activeEvents(g);
  if (!list.length) return null;
  return html`<section class="events-strip" aria-label="À venir">
    <div class="evs-h"><${Icon} n="calendar" s=${15} /> À venir</div>
    ${list.slice(0, 4).map((ev) => html`<${EventChip} key=${ev.id} g=${g} ev=${ev} now=${now} />`)}
  </section>`;
}
function EventCard({ evt }) {
  const K = EVENT_KINDS[evt.kind] || EVENT_KINDS.autre;
  const o = evt.outcome || null;
  return html`<div class=${'evt-card' + (o ? (o.success ? ' ok' : ' ko') : '')}>
    <span class="evt-kind">${K.emoji} ${evt.kind === 'live' ? 'Live terminé' : 'C’est arrivé'}</span>
    <b>${evt.what}</b>
    ${evt.recap ? html`<p>${evt.recap}</p>` : null}
    ${o ? html`<div class="res">
      ${o.line ? html`<span class=${'chip ' + (/sort/.test(o.line) && !/reste|enfonce/.test(o.line) ? 'good' : 'bad')}>${o.line}</span>` : html`<span class=${'chip ' + (o.success ? 'good' : 'bad')}>${o.success ? 'Ça a marché' : 'C’est raté'}</span>`}
      ${o.pct ? html`<span class=${'chip ' + (o.pct > 0 ? 'good' : 'bad')}>${o.pct > 0 ? '+' : '−'}${Math.abs(o.pct)} % d’abonnés</span>` : null}
      ${o.pr ? html`<span class=${'chip ' + (o.pr > 0 ? 'good' : 'bad')}>Ta réputation ${o.pr > 0 ? '+' : '−'}${Math.abs(o.pr)}</span>` : null}
    </div>` : null}
  </div>`;
}
// 0.27.8: one name per game, the same everywhere (the shoot, the edit, the practice menu)
const MG_LABEL = { tri: 'Tri', ordre: 'Remise en ordre', quiz: 'Quiz', vf: 'Vrai ou faux', intrus: 'Trouve l’intrus', montage: 'Coupe au rythme', memoire: 'Mémoire', chat: 'Modération du chat', mixage: 'Mixage', cadrage: 'Recadrage vertical' };
const MG_PER = { tri: 5000, ordre: 9000, quiz: 15000, vf: 4000, intrus: 12000 }; // per item at « Moyen » (time ×1 since 0.27.9; per round for the quiz and the odd one out)
const PER_ROUND = { quiz: true, intrus: true };
const mgTime = (kind, n, D) => Math.round((PER_ROUND[kind] ? MG_PER[kind] : (MG_PER[kind] || 0) * n) * D.time);
// 0.27.4: then two more seconds for each answer (each item, each question or series), whatever helps or slows the player
const mgExtra = (kind, n) => MG_EXTRA * (PER_ROUND[kind] ? 1 : n);
/* 0.27.5: the clock also follows what there is to read. A question of three lines and one of three words had the same
   few seconds: at the top levels, nobody could read the long ones in time. Now each item gets the time to read its
   characters (and those of its answers) at a pace that rises with the difficulty, plus the time to decide (shorter
   between two buttons, longer among four answers, in between to place a step); never less than before.
   Measured with simulated players (an average reader at about 20 characters a second, a quick one at 32): Mythique is
   very hard for the first and fine for the second; Cauchemar keeps its own clock. */
// 0.27.9: a notch harder, as DIFFS: Légendaire reads at Mythique's old pace, and Mythique past the average reader.
const MG_PACE = { facile: [10, 3], moyen: [12.5, 2.6], difficile: [15, 2.2], expert: [17.5, 1.9], legende: [20, 1.6], mythique: [22.5, 1.4] }; // [characters a second, seconds to decide]
const MG_DECIDE = { tri: 0.38, vf: 0.38, ordre: 0.6 }; // (of the seconds to decide: two buttons, placing a step; four answers: all of it, and one more)
const mgChars = (it) => String((it && it.text) || '').length + (it && Array.isArray(it.a) ? it.a.reduce((n, x) => n + String(x == null ? '' : x).length, 0) : 0);
function mgRead(kind, items, D, k) {
  const P = MG_PACE[D.id];
  if (!P || D.real || !items || !items.length) return 0;
  const [cps, dec] = P;
  if (PER_ROUND[kind]) return Math.round(1000 * (mgChars(items[k]) / cps + dec + 1));
  return Math.round(1000 * (items.reduce((n, it) => n + mgChars(it), 0) / cps + items.length * dec * (MG_DECIDE[kind] || 0.5)));
}
// The clock of a game (ms): the whole list (sort, true or false, order), or one per question (quiz, odd one out). k: the
// helpers' factor (a scriptwriter, an editor, a prompter, the machine), on all of it.
function mgClock(kind, items, D, k = 1) {
  const n = (items || []).length;
  const old = (i) => mgTime(kind, n, D) * k + mgExtra(kind, n); // (0.27.4, the floor)
  if (PER_ROUND[kind]) return (items || []).map((_, i) => Math.round(Math.max(old(i), mgRead(kind, items, D, i) * k)));
  return Math.round(Math.max(old(), mgRead(kind, items, D) * k));
}
const clockSec = (c) => Math.round((Array.isArray(c) ? c.reduce((a, b) => a + b, 0) / Math.max(1, c.length) : c) / 1000);
// 0.27.8: how the cut scores (the average of the cuts: 1, ½ or 0 each), said the same way at the shoot, the edit and a client’s order
const cutRule = (verb, n, live) => `${n} ${live ? 'relances' : 'coupes'}. Le curseur va et vient : touche « ${verb || 'Couper'} » (ou Espace) quand il passe dans la zone verte. Dedans : 1 point ; juste à côté : ½ point ; rien après deux allers-retours : 0 point.`;
const MG_RULE = {
  tri: (sec) => `Garde ce qui sert ton contenu, jette les pièges. ${sec} secondes pour tout trier.`,
  ordre: (sec) => `Touche les étapes dans le bon ordre. ${sec} secondes : celles que tu n’as pas placées à temps comptent comme fausses.`,
  quiz: (sec, game) => `Une question à la fois, ${game && game.items.some((q) => mgChars(q) > 160) ? `environ ${sec} secondes chacune (plus pour les longues)` : `${sec} secondes chacune`}.`,
  vf: (sec) => `Vrai ou faux ? Tranche vite : ${sec} secondes pour tout.`,
  intrus: (sec, game) => `Dans chaque série, une seule proposition n’a rien à faire là : trouve-la. ${game && game.items.some((q) => mgChars(q) > 120) ? `Environ ${sec} secondes par série (plus pour les longues).` : `${sec} secondes par série.`}`,
  montage: (sec, game) => cutRule(game.verb, game.items.length, game.what === 'live'),
  memoire: (sec, game) => `Des images défilent une par une : retiens-les, puis touche-les dans le même ordre. Une erreur arrête la manche. ${game.items.length} manches, de plus en plus longues.`,
  chat: (sec, game) => game.rule, mixage: (sec, game) => game.rule, cadrage: (sec, game) => game.rule, // 0.25
};
const shuffle = (a) => { const b = a.slice(); for (let k = b.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [b[k], b[j]] = [b[j], b[k]]; } return b; };
// 0.27.6: the layers where a mini-game is played (nothing pops up over them, and their keys are theirs).
const MG_LAYERS = ['minigame', 'practice', 'job'];
const inMiniGame = () => S.stack.some((l) => MG_LAYERS.includes(l.t));
const topIsGame = () => { const l = S.stack[S.stack.length - 1]; return !!(l && MG_LAYERS.includes(l.t)); };
const typingIn = (e) => { const el = e && e.target; return !!(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)); };
// A skill round that listens to the keyboard: only the last one opened, on top, and never while the player types.
const KEY_OWNERS = [];
function ownKeys(lay) {
  const tok = {};
  KEY_OWNERS.push(tok);
  // (0.27.7: its own window on top, when it knows it: windows put aside and brought back no longer go by the order they opened)
  return { mine: (e) => !typingIn(e) && (lay && lay.os ? true : lay ? S.stack[S.stack.length - 1] === lay : KEY_OWNERS[KEY_OWNERS.length - 1] === tok && topIsGame()), drop: () => { const k = KEY_OWNERS.indexOf(tok); if (k >= 0) KEY_OWNERS.splice(k, 1); } }; // (0.27.9: a window out of the game gets the keys typed in it)
}
// Steps never placed count as wrong among themselves (0.27.6: in the order they were dealt, a game left alone could win).
const leftWorst = (pool) => pool.slice().sort((a, b) => b - a);
// 1 = perfect order, from how many pairs are swapped (one swap still scores high, a random order low).
function orderScore(seq) {
  const n = seq.length;
  let inv = 0;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (seq[a] > seq[b]) inv++;
  const max = (n * (n - 1)) / 2;
  return max ? Math.pow(1 - inv / max, 1.5) : 1;
}
function TimeBar({ left, total }) {
  return html`<span class="mg-bar" aria-hidden="true"><span style=${'width:' + Math.max(0, Math.min(100, Math.round((100 * left) / total))) + '%'}></span></span>`;
}
function MgTop({ k, n, left, total }) {
  return html`<div class="mg-top"><span class="mono">${k}/${n}</span><${TimeBar} left=${left} total=${total} /><span class="mono" aria-live="off">${Math.ceil(Math.max(0, left) / 1000)} s</span></div>`;
}
// Keep or throw (tri), or true or false (vf): the same two buttons.
// The scriptwriter's hints during a shoot (a button with what is left).
const HintBtn = ({ left, onUse }) => (left > 0 ? html`<button type="button" class="btn btn-ghost btn-sm hint-btn" onClick=${onUse}>💡 Indice du scénariste (${left})</button>` : null);
// 0.10.2: a mini-game's progress lives with it (game.run), a shoot's as a date's, kept at every step. Leaving and coming
// back goes on where it stood: the answers given stay given, and the clock does not wait for the player. Before, the
// progress lived in the screen only: leaving and opening it again started over, with the answers already known.
// soon: written to the storage at once, so that a closed window never loses an answer.
function mgKeep(game, part, soon = true) {
  if (!game) return;
  game.run = Object.assign({}, game.run, part);
  update();
  if (soon && S.game && S.game.ready && !FLOWS.size) saveNow();
}
// A mini-game left with its last answer given, or whose clock ran out while the player was away: its score.
function runOver(game, t = Date.now()) {
  const run = game && game.run;
  if (!run || !run.on) return null;
  if (typeof run.score === 'number') return run.score;
  const n = (game.items || []).length;
  if (!run.end || t < run.end + 3000) return null; // only the games with one clock for everything run out on their own
  if ((game.kind === 'tri' || game.kind === 'vf') && Array.isArray(run.order)) return (run.right || 0) / Math.max(1, n);
  if (game.kind === 'ordre' && Array.isArray(run.pool) && Array.isArray(run.picked)) return orderScore(run.picked.concat(leftWorst(run.pool)));
  return null;
}
// Called by the clock: such a game is over even if the player never opens it again (a date would count as missed).
function settleRuns(g, t = Date.now()) {
  let changed = false;
  for (const r of [...(g.releases || []), ...(g.events || [])]) {
    if (!r || r.state !== 'scheduled' || r.played || !r.game || !r.game.run) continue;
    if (layerOpen((l) => l.t === 'minigame' && l.id === r.id)) continue; // on screen (0.27.7: or put aside): the game itself finishes it
    const sc = runOver(r.game, t);
    if (sc !== null) { finishShoot(r, sc); changed = true; }
  }
  return changed;
}
// 0.27.8: how long an answer's feedback stays: the time to read its explanation (about 30 characters a second), 4 s at most
const fbMs = (why, base) => Math.min(4000, base + 35 * String(why || '').length);
function TriGame({ items, onDone, now, total, vf, hints = 0, run, keep }) {
  const [s, setS] = useState(() => {
    if (run && Array.isArray(run.order)) return { list: run.order.map((j) => items[j]).filter(Boolean), order: run.order, k: run.k || 0, right: run.right || 0, fb: null, end: run.end || Date.now() + total, hints: run.hints != null ? run.hints : hints, hint: run.hint != null ? run.hint : -1 };
    const order = shuffle(items.map((x, j) => j));
    return { list: order.map((j) => items[j]), order, k: 0, right: 0, fb: null, end: Date.now() + total, hints, hint: -1 };
  });
  const done = useRef(false), alive = useRef(true);
  const n = s.list.length;
  const finish = (right) => { if (!done.current) { done.current = true; onDone(right / n); } };
  useEffect(() => {
    if (!run || !Array.isArray(run.order)) keep({ order: s.order, k: 0, right: 0, end: s.end, hints: s.hints, hint: -1 });
    else if (s.k >= n) finish(s.right); // everything was answered before the player left
    return () => { alive.current = false; };
  }, []);
  useEffect(() => { if (!s.fb && s.k < n && now >= s.end) finish(s.right); }, [now]);
  const answer = (yes) => {
    if (s.fb || done.current) return;
    const it = s.list[s.k];
    const ok = yes === !!it.good;
    const ms = fbMs(it.why, 1200), right = s.right + (ok ? 1 : 0), end = s.end + ms; // the clock stops while the answer shows (0.27.8: long enough to read why)
    keep(Object.assign({ k: s.k + 1, right, end, hint: -1 }, s.k + 1 >= n ? { score: right / n } : {})); // kept at once: leaving now goes on with the next one
    setS(Object.assign({}, s, { right, fb: { ok, keep: yes, why: it.why, good: !!it.good }, end }));
    setTimeout(() => { if (s.k + 1 >= n) finish(right); else if (alive.current) setS((x) => Object.assign({}, x, { k: x.k + 1, fb: null })); }, ms);
  };
  if (s.k >= n) return html`<div class="mg-play mg-wait"><${Typing} /></div>`;
  const it = s.list[s.k];
  const verdict = (fb) => (vf ? `${fb.ok ? 'Bien vu' : 'Raté'} : c’est ${fb.good ? 'vrai' : 'faux'}` : fb.ok ? 'Bien vu' : 'Raté');
  return html`<div class="mg-play">
    <${MgTop} k=${s.k + 1} n=${s.list.length} left=${s.end - now} total=${total} />
    <div class=${'mg-card' + (s.fb ? (s.fb.ok ? ' ok' : ' ko') : '')}>
      ${vf ? html`<span class="mg-tag">Vrai ou faux ?</span>` : null}
      <p>${it.text}</p>
      ${s.fb ? html`<small>${verdict(s.fb)}${s.fb.why ? ' · ' + s.fb.why : ''}</small>` : null}
    </div>
    ${s.hint === s.k && !s.fb ? html`<p class="mg-hint">💡 ${vf ? (it.good ? 'C’est vrai.' : 'C’est faux.') : it.good ? 'À garder.' : 'À jeter.'}</p>` : !s.fb ? html`<${HintBtn} left=${s.hints} onUse=${() => { keep({ hints: s.hints - 1, hint: s.k }); setS(Object.assign({}, s, { hints: s.hints - 1, hint: s.k })); }} />` : null}
    <div class="mg-actions">
      <button class="btn btn-ghost" onClick=${() => answer(false)} disabled=${!!s.fb}><${Icon} n="x" s=${16} /> ${vf ? 'Faux' : 'Jeter'}</button>
      <button class="btn btn-hot" onClick=${() => answer(true)} disabled=${!!s.fb}><${Icon} n="check" s=${16} /> ${vf ? 'Vrai' : 'Garder'}</button>
    </div>
  </div>`;
}
function OrderGame({ items, onDone, now, total, hints = 0, run, keep }) {
  const n = items.length;
  const [s, setS] = useState(() => {
    if (run && Array.isArray(run.pool) && Array.isArray(run.picked)) return { pool: run.pool, picked: run.picked, end: run.end || Date.now() + total, hints: run.hints != null ? run.hints : hints, hint: run.hint != null ? run.hint : -1 };
    let pool = shuffle(items.map((x, k) => k));
    if (pool.every((x, k) => x === k)) pool = pool.reverse(); // never already solved
    return { pool, picked: [], end: Date.now() + total, hints, hint: -1 };
  });
  const nextGood = s.picked.length; // the step that comes next, if what is placed is right
  const prefixOK = s.picked.every((k, j) => k === j);
  const done = useRef(false);
  const finish = (seq) => { if (!done.current) { done.current = true; onDone(orderScore(seq)); } };
  useEffect(() => {
    if (!run || !Array.isArray(run.pool)) keep({ pool: s.pool, picked: [], end: s.end, hints: s.hints, hint: -1 });
    else if (!s.pool.length) finish(s.picked); // all placed before the player left
  }, []);
  useEffect(() => { if (now >= s.end) finish(s.picked.concat(leftWorst(s.pool))); }, [now]);
  // every move is kept: leaving and coming back finds the same steps placed, the clock still running
  const set = (x) => { keep(Object.assign({ pool: x.pool, picked: x.picked, hints: x.hints, hint: x.hint }, x.pool.length ? {} : { score: orderScore(x.picked) })); setS(x); };
  const pick = (k) => {
    if (done.current) return;
    const picked = s.picked.concat(k), pool = s.pool.filter((x) => x !== k);
    set(Object.assign({}, s, { picked, pool }));
    if (!pool.length) setTimeout(() => finish(picked), 450);
  };
  const undo = () => { if (s.picked.length && !done.current) set(Object.assign({}, s, { picked: s.picked.slice(0, -1), pool: s.pool.concat(s.picked[s.picked.length - 1]) })); };
  return html`<div class="mg-play">
    <${MgTop} k=${s.picked.length} n=${n} left=${s.end - now} total=${total} />
    <ol class="mg-seq">
      ${s.picked.map((k, j) => html`<li key=${'p' + k}><span class="num">${j + 1}</span><span>${items[k].text}</span></li>`)}
      ${s.pool.map((k, j) => html`<li class="todo" key=${'t' + j}><span class="num">${s.picked.length + j + 1}</span><span>…</span></li>`)}
    </ol>
    <div class="mg-pool">${s.pool.map((k) => html`<button class=${'mg-chip' + (s.hint === k ? ' hinted' : '')} key=${k} onClick=${() => pick(k)}>${items[k].text}</button>`)}</div>
    ${prefixOK && s.pool.includes(nextGood) && s.hint !== nextGood ? html`<${HintBtn} left=${s.hints} onUse=${() => set(Object.assign({}, s, { hints: s.hints - 1, hint: nextGood }))} />` : null}
    <button class="btn btn-ghost btn-sm" onClick=${undo} disabled=${!s.picked.length || !s.pool.length}>Annuler la dernière</button>
  </div>`;
}
// A question and its answers (quiz), or a theme and the one that does not belong (intrus).
function QuizGame({ items, onDone, now, total, odd, hints = 0, run, keep }) {
  const tq = (k) => (Array.isArray(total) ? total[k] || total[total.length - 1] : total); // 0.27.5: each question its clock
  const opts = (q) => shuffle(q.a.map((t, k) => ({ t, k })));
  const optsOf = (q, ks) => ks.filter((k) => q.a[k] != null).map((k) => ({ t: q.a[k], k }));
  const n = items.length;
  // a question already on screen when the player left keeps its clock (end); the next one starts its own when it shows
  const [s, setS] = useState(() => (run && typeof run.k === 'number' && Array.isArray(run.o)
    ? { k: run.k, right: run.right || 0, fb: null, end: run.end || Date.now() + tq(run.k), o: items[run.k] ? optsOf(items[run.k], run.o) : [], hints: run.hints != null ? run.hints : hints }
    : { k: 0, right: 0, fb: null, end: Date.now() + tq(0), o: opts(items[0]), hints }));
  // a hint takes one wrong answer away (never the last one)
  const useHint = () => { const q = items[s.k]; const wrong = s.o.filter((x) => x.k !== q.ok); if (wrong.length < 2 || s.hints <= 0) return; const drop = pick(wrong); const o = s.o.filter((x) => x !== drop); keep({ hints: s.hints - 1, o: o.map((x) => x.k) }); setS(Object.assign({}, s, { hints: s.hints - 1, o })); };
  const done = useRef(false), alive = useRef(true);
  const finish = (right) => { if (!done.current) { done.current = true; onDone(right / n); } };
  useEffect(() => {
    if (s.k >= n) finish(s.right); // everything was answered before the player left
    else keep({ k: s.k, right: s.right, end: s.end, o: s.o.map((x) => x.k), hints: s.hints });
    return () => { alive.current = false; };
  }, []);
  const answer = (k) => {
    if (s.fb || done.current) return;
    const q = items[s.k];
    const ok = k === q.ok;
    const right = s.right + (ok ? 1 : 0), nk = s.k + 1;
    const no = nk < n ? opts(items[nk]) : [];
    keep(nk < n ? { k: nk, right, end: 0, o: no.map((x) => x.k) } : { k: nk, right, end: 0, o: [], score: right / n }); // kept at once
    setS(Object.assign({}, s, { right, fb: { ok, k, why: q.why } }));
    setTimeout(() => {
      if (nk >= n) finish(right);
      else if (alive.current) { const end = Date.now() + tq(nk); keep({ end }); setS((x) => Object.assign({}, x, { k: nk, fb: null, end, o: no })); }
    }, fbMs(q.why, 1400));
  };
  useEffect(() => { if (!s.fb && s.k < n && now >= s.end) answer(-1); }, [now]);
  if (s.k >= n) return html`<div class="mg-play mg-wait"><${Typing} /></div>`;
  const q = items[s.k];
  return html`<div class="mg-play">
    <${MgTop} k=${s.k + 1} n=${items.length} left=${s.end - now} total=${tq(s.k)} />
    <div class="mg-card">${odd ? html`<span class="mg-tag">Trouve l’intrus</span>` : null}<p>${q.text}</p>${s.fb ? html`<small>${s.fb.ok ? (odd ? 'Bien vu, c’était l’intrus' : 'Bonne réponse') : s.fb.k < 0 ? 'Trop tard' : 'Raté'}${s.fb.why ? ' · ' + s.fb.why : ''}</small>` : null}</div>
    <div class="mg-opts">${s.o.map((x) => html`<button key=${x.k} class=${'mg-opt' + (s.fb && x.k === q.ok ? ' ok' : s.fb && x.k === s.fb.k ? ' ko' : '')} onClick=${() => answer(x.k)} disabled=${!!s.fb}>${x.t}</button>`)}</div>
    ${!s.fb && s.o.length > 2 ? html`<${HintBtn} left=${s.hints} onUse=${useHint} />` : null}
  </div>`;
}
// The time of a tap, on the clock that draws the cursor (the event's own time when it can be trusted).
const tapTime = (e) => { const n = performance.now(), t = e && e.timeStamp; return t > 0 && t <= n + 5 && n - t < 1000 ? t : n; };
const HIT_TXT = { 1: 'Pile dans le temps fort !', 0.5: 'Presque…', 0: 'Raté' };
// Cut on the beat: a cursor sweeps the timeline, the cut lands where it is at the moment of the tap.
// Exact: the position comes from the time of the tap with the formula that draws the cursor.
function MontageGame({ game, onDone, run, keep }) {
  const items = game.items, n = items.length, sp = game.speed || 1500;
  const st = useRef(null);
  if (!st.current) {
    let k = run && typeof run.k === 'number' ? run.k : 0, got = run && Array.isArray(run.got) ? run.got.slice() : [];
    if (run && run.live === k && k < n) { got = got.concat(0); k += 1; } // the take that was rolling when the player left: missed
    st.current = { k, got, fb: null, t0: 0, key: 0 };
  }
  const [view, setView] = useState(() => ({ k: st.current.k, got: st.current.got.slice(), fb: null, t0: 0 }));
  const cur = useRef(null), done = useRef(false), alive = useRef(true);
  const keys = useRef(null), lay = useContext(WinCtx);
  if (!keys.current) keys.current = ownKeys(lay);
  const pos = (t) => { const x = (Math.max(0, t - st.current.t0) / sp) % 2; return x < 1 ? x : 2 - x; };
  const sync = () => { const x = st.current; setView({ k: x.k, got: x.got.slice(), fb: x.fb, t0: x.t0 }); };
  const finish = (got) => { if (!done.current) { done.current = true; onDone(got.reduce((a, v) => a + v, 0) / n); } };
  const cut = (t) => {
    const x = st.current;
    if (x.fb || done.current || !x.t0) return;
    const z = items[x.k], w = z.z1 - z.z0;
    const p = t == null ? -1 : pos(t);
    const v = p < 0 ? 0 : p >= z.z0 && p <= z.z1 ? 1 : p >= z.z0 - w / 2 && p <= z.z1 + w / 2 ? 0.5 : 0;
    if (p >= 0 && cur.current) cur.current.style.left = (p * 100).toFixed(2) + '%';
    x.fb = { p, v, late: p < 0 };
    x.got = x.got.concat(v);
    keep(Object.assign({ k: x.k + 1, got: x.got, live: -1 }, x.k + 1 >= n ? { score: x.got.reduce((a, b) => a + b, 0) / n } : {}));
    sync();
    setTimeout(() => {
      if (x.k + 1 >= n) { finish(x.got); return; }
      if (!alive.current) return;
      x.k += 1; x.fb = null; x.t0 = performance.now();
      keep({ live: x.k });
      sync();
    }, 800);
  };
  useEffect(() => {
    const x0 = st.current;
    if (x0.k >= n) { finish(x0.got); return () => { alive.current = false; }; } // every take was done before the player left
    x0.t0 = performance.now();
    keep({ k: x0.k, got: x0.got, live: x0.k });
    sync();
    let raf = 0;
    const draw = () => {
      const x = st.current, t = performance.now();
      if (!x.fb && !done.current) {
        if (cur.current) cur.current.style.left = (pos(t) * 100).toFixed(2) + '%';
        if (t - x.t0 > sp * 4 + MG_EXTRA) cut(null); // two round trips without a cut (0.27.4: and two more seconds): missed
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const onKey = (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat && keys.current.mine(e)) { e.preventDefault(); st.current.key = performance.now(); cut(tapTime(e)); } }; // (0.27.6: on top, and not while typing)
    window.addEventListener('keydown', onKey);
    return () => { alive.current = false; cancelAnimationFrame(raf); keys.current.drop(); window.removeEventListener('keydown', onKey); };
  }, []);
  if (view.k >= n) return html`<div class="mg-play mg-wait"><${Typing} /></div>`;
  const z = items[view.k];
  const fb = view.fb, fbc = fb ? (fb.v === 1 ? ' ok' : fb.v ? ' mid' : ' ko') : '';
  const W = WHATS[game.what] || WHATS.vidéo, live = game.what === 'live';
  return html`<div class="mg-play mt-play">
    <div class="mg-top"><span class="mono">${view.k + 1}/${n}</span><span class="mt-fb" aria-live="polite">${fb ? (fb.late ? 'Trop tard' : HIT_TXT[fb.v]) : 'Attends le bon moment…'}</span></div>
    <div class=${'mt-screen' + fbc} aria-hidden="true"><span class="mt-rec">● ${live ? 'LIVE' : 'REC'}</span><span class="mt-emo">${W.emoji}</span><span class="mt-plan">${live ? 'Relance' : 'Plan'} ${view.k + 1}</span></div>
    <div class="mt-track" data-z0=${z.z0} data-z1=${z.z1} data-t0=${view.t0} data-speed=${sp}>
      <span class=${'mt-zone' + fbc} style=${`left:${z.z0 * 100}%;width:${(z.z1 - z.z0) * 100}%`}></span>
      <span class="mt-cursor" ref=${cur}></span>
    </div>
    <button class="btn btn-hot mt-cut" onPointerDown=${(e) => cut(tapTime(e))} onClick=${(e) => { if (e.detail === 0 && performance.now() - st.current.key > 1000) cut(tapTime(e)); }} disabled=${!!fb}><${Icon} n=${live ? 'zap' : 'scissors'} s=${20} /> ${game.verb || 'Couper'}</button>
    <div class="mt-hits" aria-label="Tes coupes">${items.map((x, j) => html`<span key=${j} class=${'mt-hit' + (j < view.got.length ? ' v' + String(view.got[j]).replace('.', '') : '')}>${j < view.got.length ? (view.got[j] === 1 ? '✓' : view.got[j] ? '~' : '✗') : j + 1}</span>`)}</div>
  </div>`;
}
// Remember the script: the symbols go by one at a time, then the player taps them back in order.
// The round lives in a ref: taps as fast as the player likes never read a stale state.
function MemoryGame({ game, onDone, now, run, keep }) {
  const rounds = game.items, pool = game.pool || [], per = game.per || 800, nR = rounds.length;
  const roundScore = (k, input) => { const sq = rounds[k].seq; let ok = 0; while (ok < input.length && input[ok] === sq[ok]) ok++; return ok / sq.length; };
  const st = useRef(null);
  if (!st.current) { // a round under way when the player left: back to choosing if its time is not up, otherwise it counts as it stood
    const r0 = run && Array.isArray(run.scores) ? run : null;
    let k = r0 ? r0.k : 0, scores = r0 ? r0.scores.slice() : [];
    if (r0 && r0.live === k && k < nR) {
      if (r0.phase === 'pick' && r0.end > Date.now()) st.current = { k, phase: 'pick', shown: -1, input: (r0.input || []).slice(), scores, fb: null, end: r0.end };
      else { scores = scores.concat(roundScore(k, r0.input || [])); k += 1; }
    }
    if (!st.current) st.current = { k, phase: 'show', shown: -1, input: [], scores, fb: null, end: 0 };
  }
  const [, setV] = useState(0);
  const render = () => setV((v) => v + 1);
  const done = useRef(false), alive = useRef(true);
  const s = st.current;
  const seq = s.k < nR ? rounds[s.k].seq : [];
  const pickTime = (len) => 3000 + (1100 + MG_EXTRA) * len; // (0.27.4: two more seconds for each image)
  const finish = (scores) => { if (!done.current) { done.current = true; onDone(scores.reduce((a, v) => a + v, 0) / nR); } };
  useEffect(() => {
    const x = st.current;
    if (x.k >= nR) finish(x.scores); // every round was played before the player left
    else keep({ k: x.k, scores: x.scores, live: x.phase === 'pick' ? x.k : -1, phase: x.phase, input: x.input, end: x.end });
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    if (s.phase !== 'show' || s.k >= nR) return undefined;
    const t = setTimeout(() => {
      const x = st.current, len = rounds[x.k].seq.length;
      if (x.shown >= len - 1) { Object.assign(x, { phase: 'pick', shown: -1, end: Date.now() + pickTime(len) }); keep({ phase: 'pick', end: x.end }); }
      else { if (x.shown < 0) keep({ live: x.k, phase: 'show', input: [] }); x.shown += 1; } // the first image shows: this round is under way
      render();
    }, s.shown < 0 ? 700 : per);
    return () => clearTimeout(t);
  }, [s.phase, s.shown, s.k]);
  const endRound = () => {
    const x = st.current, v = roundScore(x.k, x.input);
    Object.assign(x, { scores: x.scores.concat(v), phase: 'fb', fb: { v } });
    keep(Object.assign({ k: x.k + 1, scores: x.scores, live: -1, phase: 'show', input: [], end: 0 }, x.k + 1 >= nR ? { score: x.scores.reduce((a, b) => a + b, 0) / nR } : {}));
    render();
    setTimeout(() => {
      if (x.k + 1 >= nR) finish(x.scores);
      else if (alive.current) { Object.assign(x, { k: x.k + 1, phase: 'show', shown: -1, input: [], fb: null }); render(); }
    }, v === 1 ? 900 : 1900);
  };
  useEffect(() => { if (st.current.phase === 'pick' && now >= st.current.end) endRound(); }, [now]);
  const tap = (sym) => {
    const x = st.current;
    if (x.phase !== 'pick' || done.current) return;
    x.input = x.input.concat(sym);
    keep({ input: x.input }, false);
    const sq = rounds[x.k].seq;
    if (sym !== sq[x.input.length - 1] || x.input.length >= sq.length) endRound();
    else render();
  };
  if (s.k >= nR) return html`<div class="mg-play mg-wait"><${Typing} /></div>`;
  const head = s.phase === 'pick' ? html`<${MgTop} k=${s.k + 1} n=${rounds.length} left=${s.end - now} total=${pickTime(seq.length)} />`
    : html`<div class="mg-top mm-top"><span class="mono">${s.k + 1}/${rounds.length}</span><span class="mt-fb">${s.phase === 'show' ? `Retiens ces ${seq.length} images` : s.fb.v === 1 ? 'Parfait !' : 'Raté : voilà la bonne suite'}</span></div>`;
  return html`<div class="mg-play mm-play" data-k=${s.k} data-phase=${s.phase}>
    ${head}
    ${s.phase === 'show' ? html`<div class="mm-stage" aria-live="off">${s.shown >= 0 ? html`<span class="mm-big" key=${s.k + ':' + s.shown}>${seq[s.shown]}</span>` : html`<span class="mm-ready">Prêt ?</span>`}</div>
      <div class="mm-dots" aria-hidden="true">${seq.map((x, j) => html`<i key=${j} class=${j <= s.shown ? 'on' : ''}></i>`)}</div>`
    : html`<div class="mm-slots">${seq.map((x, j) => html`<span key=${j} class=${'mm-slot' + (j < s.input.length ? (s.input[j] === x ? ' on' : ' ko') : '')}>${j < s.input.length ? s.input[j] : ''}</span>`)}</div>
      ${s.phase === 'fb' && s.fb.v < 1 ? html`<div class="mm-slots answer">${seq.map((x, j) => html`<span key=${j} class="mm-slot">${x}</span>`)}</div>` : null}
      <div class="mm-pool">${pool.map((x) => html`<button key=${x} onClick=${() => tap(x)} disabled=${s.phase !== 'pick'} aria-label=${x}>${x}</button>`)}</div>`}
  </div>`;
}
function ShootPlay({ r, now, outcomes, icon, onScore }) {
  const game = r.game;
  const resumed = !!(game.run && game.run.on); // started earlier: straight back into it, where it stood (the counter says where)
  const [phase, setPhase] = useState(resumed ? 'play' : 'intro');
  const keep = (part, soon) => mgKeep(game, part, soon);
  const run = game.run || null;
  const onDone = (score) => (onScore ? onScore(score) : finishShoot(r, score)); // (0.27.6: a practice round counts for nothing)
  const kind = MG_LABEL[game.kind] ? game.kind : 'ordre';
  const D = diffOf(game.diff || r.diff);
  const g = S.game, crew = !r.player && r.crew ? r.crew : []; // a release's team (an editor, a scriptwriter) helps the shoot
  const total = mgClock(kind, game.items, D, (g && crew.length ? staffMult(g, 'time', r.what, crew) : 1) * (g && !r.player ? gearTime(g) : 1)); // 0.20: the prompter; 0.27.5: by what there is to read
  const hints = g && crew.includes('scenariste') ? staffPower(g, 'scenariste') : 0;
  if (phase === 'intro') {
    return html`<div class="mg-intro">
      <span class="eyebrow">${D.real && kind === 'quiz' ? 'Questions d’expert' : MG_LABEL[kind]}</span>
      <h3>${game.title}</h3>
      <span class=${'chip' + (D.real ? ' bad' : '')}>${D.emoji} ${D.label}${r.practice ? '' : ` · bonus ${fmtMult(D.mult)}`}</span>
      <p>${game.intro}</p>
      ${D.real ? html`<p class="mg-warn">De vraies questions de connaisseur sur ton sujet : rien d’inventé, aucune pitié.</p>` : null}
      <p class="muted">${MG_RULE[kind](clockSec(total), game)}</p>
      <p class="muted mg-tiers">${outcomes || tierRule(`${laW(r)} cartonne`, `${whatF(r) ? 'elle' : 'il'} marche moyen`, 'flop')}</p>
      ${crew.length ? html`<p class="mg-crew">${crew.map((k) => STAFF_ROLES[k].emoji).join(' ')} Ton équipe est là${crew.includes('monteur') || crew.includes('scenariste') ? ` : +${Math.round((staffMult(g, 'time', r.what, crew) - 1) * 100)} % de temps` : ''}${hints ? `, ${hints} ${plural(hints, 'indice', 'indices')}` : ''}.</p>` : null}
      <p class="mg-clock-note">⏱️ Une fois lancé, ${PER_ROUND[kind] ? 'le chrono de la question en cours' : 'le chrono'} ne s’arrête plus, même si tu ${g && eventOf(g, r.id) ? 'fermes' : 'fermes ou réduis'} la fenêtre.</p>
      <button class="btn btn-hot" onClick=${() => { mgKeep(game, { on: Date.now() }); setPhase('play'); }}><${Icon} n=${icon || 'clapper'} s=${16} /> C’est parti</button>
    </div>`;
  }
  if (kind === 'tri' || kind === 'vf') return html`<${TriGame} items=${game.items} onDone=${onDone} now=${now} total=${total} vf=${kind === 'vf'} hints=${hints} run=${run} keep=${keep} />`;
  if (kind === 'quiz' || kind === 'intrus') return html`<${QuizGame} items=${game.items} onDone=${onDone} now=${now} total=${total} odd=${kind === 'intrus'} hints=${hints} run=${run} keep=${keep} />`;
  if (kind === 'montage') return html`<${MontageGame} game=${game} onDone=${onDone} run=${run} keep=${keep} />`;
  if (kind === 'memoire') return html`<${MemoryGame} game=${game} onDone=${onDone} now=${now} run=${run} keep=${keep} />`;
  if (ARCADE_KINDS.includes(kind)) return html`<${ArcadeGame} game=${game} onDone=${onDone} now=${now} run=${run} keep=${keep} />`; // 0.25
  return html`<${OrderGame} items=${game.items} onDone=${onDone} now=${now} total=${total} hints=${hints} run=${run} keep=${keep} />`;
}
// What the right answers were, after the game (always after a real-knowledge one: you want to know).
function MgAnswers({ game }) {
  if (!game || !game.items || !game.items.length) return null;
  const k = game.kind;
  if (k === 'ordre') return html`<details class="mg-fix"><summary>Le bon ordre</summary><ol>${game.items.map((x, j) => html`<li key=${j}>${x.text}</li>`)}</ol></details>`;
  if (k === 'quiz' || k === 'intrus') return html`<details class="mg-fix"><summary>Les bonnes réponses</summary><ol>${game.items.map((q, j) => html`<li key=${j}><span>${q.text}</span><b>${k === 'intrus' ? 'L’intrus : ' : ''}${q.a[q.ok]}</b>${q.why ? html`<small>${q.why}</small>` : null}</li>`)}</ol></details>`; // (0.27.8: with the explanation, too quick to read during the game)
  if (k === 'tri' || k === 'vf') return html`<details class="mg-fix"><summary>Les bonnes réponses</summary><ol>${game.items.map((x, j) => html`<li key=${j}><span>${x.text}</span><b>${k === 'vf' ? (x.good ? 'Vrai' : 'Faux') : x.good ? 'À garder' : 'À jeter'}</b>${x.why && !game.edit ? html`<small>${x.why}</small>` : null}</li>`)}</ol></details>`;
  if (k === 'chat') return html`<details class="mg-fix"><summary>Les messages à supprimer</summary><ol>${game.items.filter((x) => x.bad).map((x, j) => html`<li key=${j}><span>${x.who} : ${x.text}</span></li>`)}</ol></details>`; // 0.25
  return null;
}
// Before the shoot: the topic (the player's, editable) and the difficulty, which sets the time and the rewards.
function ShootSetup({ r }) {
  const d0 = (S.setupDrafts && S.setupDrafts[r.id]) || {}; // 0.27.7: what was typed before the window was closed
  const fixed = !!r.series; // 0.28.1: an episode of a challenge: the challenge's topic and difficulty (it was paid for them)
  const [topic, setTopic0] = useState(d0.topic != null && !r.devis && !fixed ? d0.topic : r.topic);
  const [plot, setPlot0] = useState(d0.plot != null ? d0.plot : r.plot || '');
  const [diff, setDiff0] = useState(fixed ? r.diff || 'moyen' : d0.diff || r.diff || 'moyen');
  const [care, setCare0] = useState(d0.care != null ? !!d0.care : !!r.care); // 0.30.1: « soignée », still to decide
  const keep = (k, v) => { if (!S.setupDrafts) S.setupDrafts = {}; S.setupDrafts[r.id] = Object.assign({}, S.setupDrafts[r.id], { [k]: v }); };
  const setTopic = (v) => { keep('topic', v); setTopic0(v); }, setPlot = (v) => { keep('plot', v); setPlot0(v); }, setDiff = (v) => { keep('diff', v); setDiff0(v); }, setCare = (v) => { keep('care', v); setCare0(v); };
  const W = WHATS[r.what] || WHATS.vidéo;
  const ok = topic.trim().length >= 3;
  const g = S.game, can = g ? canMakeR(g, r) : { ok: true }; // 0.20: a computer down, no connection for the live
  // 0.30.1: the time it takes, when it will come out, and what it runs over (a date: said before, made anyway: missed)
  const careable = careOK(r.what) && !fixed && r.prod !== 0, t0 = Date.now();
  const PD = r.prod === 0 ? 0 : prodH(r.what, careable ? care : r.care, r.team) * 3600000;
  const ann = r.now ? 0 : r.ann && r.ann < relAnn(r) ? r.ann : relAnn(r), lateBy = PD && ann && r.what !== 'live' ? t0 + PD - ann : 0;
  const dl = g && r.deal ? dealOf(g, r.deal) : null;
  const launch = () => {
    if (!ok || !can.ok) return;
    const go = () => { r.topic = str(topic, 120); r.plot = str(plot, PLOT_MAX); r.diff = diffOf(diff).id; if (careable) { if (care) r.care = 1; else delete r.care; } genShoot(r); };
    const cl = g && PD ? prodClash(g, r, Date.now(), PD) : null;
    if (!cl) { go(); return; }
    const d1 = cl.dates[0];
    askConfirm({ title: d1 ? `⚠️ Tu as rendez-vous avec ${firstName(d1.c)} à ${hourOf(d1.ev.due)}` : '⚠️ Ça chevauche ton programme',
      text: `${cap1(ta(r))} te prend ${hWord(PD / 3600000)} (jusqu’à ${hourOf(cl.end)}) : tu peux ${whatF(r) ? 'la' : 'le'} ${r.what === 'live' ? 'lancer' : 'tourner'} quand même, mais ${cl.out.map((x) => x.text).join(' ; ')}.`,
      ok: r.what === 'live' ? 'Lancer quand même' : 'Tourner quand même', cancel: 'Pas maintenant', danger: true, run: go });
  };
  return html`<div class="mg-setup">
    <div class="mg-setup-head"><span class="mg-emo" aria-hidden="true">${W.emoji}</span><h3>Prépare ${laW(r)}</h3></div>
    ${g ? html`<${GearBlocker} g=${g} r=${r} now=${Date.now()} />` : null}
    <div class="field">
      <label class="lbl" for="rl-topic">Le sujet</label>
      <textarea id="rl-topic" class="input" rows="2" maxlength="120" value=${topic} readOnly=${!!(fixed || (r.devis && g && !easyGear()))} onInput=${(ev) => setTopic(ev.target.value)}></textarea>
      <small class="muted">${fixed ? 'Le sujet de ton défi : c’est celui-là que tu tournes.' : r.devis && g && !easyGear() ? 'Le sujet de ton devis : c’est celui-là que tu tournes.' : 'Corrige-le si ce n’est pas ce que tu voulais dire : le mini-jeu portera sur ce sujet.'}</small>
    </div>
    <div class="field">
      <label class="lbl" for="rl-plot">Ce qui se passe dans ${laW(r)} <span class="muted">(facultatif)</span></label>
      <textarea id="rl-plot" class="input" rows="3" maxlength=${PLOT_MAX} value=${plot} onInput=${(ev) => setPlot(ev.target.value)} placeholder=${PLOT_HINT[r.what] || PLOT_HINT.vidéo}></textarea>
      <small class="muted">Ce qu’on y voit, comment ça se déroule, la chute : le mini-jeu, les réactions et la suite de la partie s’en serviront.</small>
    </div>
    <div class="field">
      <span class="lbl" id="diff-lbl">Difficulté</span>
      <small class="muted diff-note">${fixed ? 'Celle de ton défi, la même pour chaque épisode. ' : ''}Le chiffre multiplie les j’aime, les abonnés et l’XP de ta sortie, sauf si le tournage est raté.</small>
      <div class="diff-list" role="radiogroup" aria-labelledby="diff-lbl">
        ${(fixed ? DIFFS.filter((d) => d.id === diffOf(diff).id) : DIFFS).map((d) => html`<button type="button" key=${d.id} role="radio" aria-checked=${diff === d.id ? 'true' : 'false'} class=${'diff-opt' + (diff === d.id ? ' on' : '') + (d.real ? ' nightmare' : '') + (fixed ? ' fixed' : '')} onClick=${() => { if (!fixed) setDiff(d.id); }}>
          <span class="d-emo" aria-hidden="true">${d.emoji}</span><span class="d-mid"><b>${d.label}</b><small>${d.desc}</small></span><span class="d-mult">${fmtMult(d.mult)}</span>
        </button>`)}
      </div>
      ${r.aiFail ? html`<p class="date-late nm-hint"><${Icon} n="flame" s=${15} /> ${AI_NAME} n’a pas pu écrire ton quiz Cauchemar (le budget IA du jour est peut-être épuisé). Réessaie, ou choisis une autre difficulté.</p>` : null}
      ${diffOf(diff).real ? html`<p class="date-late nm-hint"><${Icon} n="flame" s=${15} /> Les questions porteront sur le vrai sujet : écris-le précisément (le nom exact du jeu, du film, du sport, de l’artiste…). Si c’est une histoire du jeu, ce sera sur ce qui s’est vraiment passé ici.</p>` : null}
    </div>
    ${careable ? html`<label class=${'check-card care-card' + (care ? ' on' : '')}><input type="checkbox" checked=${care} onChange=${(e) => setCare(e.target.checked)} /><span><b>✨ ${whatF(r) ? 'Vidéo soignée' : `${cap1(nounOf(r))} soigné`}</b><small>${prodWord(r.what, true, r.team)} de travail au lieu de ${prodWord(r.what, false, r.team)} : +${Math.round((CARE_K - 1) * 100)} % de vues, un peu plus de chances de buzz et de la crédibilité.</small></span></label>` : null}
    ${dl && dl.care && careable && !care ? html`<p class="date-late care-warn">✨ Le contrat de ${dl.brand} exige ${whatF(r) ? 'une vidéo soignée' : `un ${nounOf(r)} soigné`} : sans, la marque retiendra ${Math.round(CARE_CUT * 100)} % du paiement.</p>` : null}
    ${PD ? html`<p class="prod-note">⏱️ ${r.what === 'live' ? `Ton live dure ${prodWord('live')} : jusqu’à ${hourOf(t0 + PD)}.` : `${hWord(PD / 3600000)} de tournage et de montage${r.team ? ` (${teamWord(r.team)})` : ''} : ${whatF(r) ? 'elle' : 'il'} sortira vers ${hourOf(t0 + PD)}${lateBy > 30 * 60000 ? `, ${fmtDur(lateBy)} après l’heure annoncée (${hourOf(ann)})` : ''}.`}</p>` : null}
    ${PD && g && t32On() ? html`<${NrgShootNote} g=${g} PD=${PD} />` : null}
    ${g && can.ok && devisNeeded(g, r) ? html`<${DevisStep} g=${g} r=${r} topic=${topic} plot=${plot} />` // 0.20: the quote, before the shoot (once nothing blocks it)
      : html`<button class="btn btn-hot" onClick=${launch} disabled=${!ok || !can.ok}><${Icon} n="clapper" s=${16} /> Lancer le tournage</button>${!ok ? html`<small class="muted why-off">Écris d’abord le sujet.</small>` : null}`}
  </div>`;
}
function ShootResult({ r, g, now }) {
  const tier = r.played.tier, T = RELEASE_TIERS[tier];
  const D = diffOf(r.played.diff || r.diff);
  return html`<div class=${'mg-result ' + tier}>
    <span class="eyebrow">${T.label}</span>
    <div class="mg-score">${pctOf(r.played.score)} %</div>
    <span class=${'chip' + (D.real ? ' bad' : '')}>${D.emoji} ${D.label} · ${tier === 'flop' ? 'pas de bonus sur un flop' : 'bonus ' + fmtMult(D.mult) + (tier === 'top' && D.viral ? ' · viral assuré' : '')}</span>
    ${r.played.tired ? html`<p class="date-late fit-lost">😴 La fatigue t’a coûté ${Math.max(1, pctOf(r.played.raw) - pctOf(r.played.score))} points (${pctOf(r.played.raw)} % sans elle).</p>` : null}
    <p>${tier === 'top' ? `${cap1(laW(r))} va cartonner.` : tier === 'mid' ? `${cap1(laW(r))} marchera moyennement.` : flopWord(r)}${tier === 'top' && D.real ? ' Tu connais vraiment ton sujet : ça se sent.' : ''}${r.series && g.series ? (tier === 'flop' ? ' Ton bonus de défi retombera à ×1.' : ` Ton bonus de défi passera à ×${fmtDec(seriesMultAt(g.series, (g.series.streak || 0) + 1))}.`) : ''}</p>
    ${r.series && tier !== 'top' ? html`<p class="date-late series-note"><${Icon} n="calendar" s=${15} /><span><b>Défi Daily Upload : pas de report possible.</b> ${tier === 'flop' ? (g.series && g.series.hard ? 'Mode hardcore : un épisode raté met fin au défi, publié ou non.' : `Publie quand même : raté, ton bonus de défi retombe à ×1. Pas publié, c’est un épisode manqué (${repWord(repTry(g, { cred: -10, pro: -5 }))}), et le défi ne pourra plus être réussi.`) : 'Publie pour valider l’épisode : ton bonus de défi continue de grimper.'}</span></p>` : null}
    ${tier !== 'top' || D.real ? html`<${MgAnswers} game=${r.game} />` : null}
    <${StudioSteps} g=${g} r=${r} now=${now} />
    ${tier !== 'top' && !r.series && r.delays < MAX_DELAYS ? html`<button class="btn btn-ghost" onClick=${() => askPostpone(g, r)}>Repousser pour retenter · ${repWord(repTry(g, postponePlan(r.delays + 1)))}</button>` : null}
    ${tier !== 'top' && !r.series && r.delays >= MAX_DELAYS ? html`<small class="muted">Tu as déjà repoussé ${MAX_DELAYS} fois : publie ou abandonne.</small>` : null}
    ${!r.series ? html`<button class="btn btn-ghost" onClick=${() => askDrop(g, r)}>${r.auto ? 'Retirer sans malus' : 'Abandonner'}</button>` : null}
  </div>`;
}
// 0.27.8: a failed shoot is not the end while the edit can still lift it (up to 15 points, never for a live)
function flopWord(r) {
  if (!needsEdit(r) || r.edit) return 'Si tu publies maintenant, c’est le flop assuré.';
  const sw = Math.round(swingOf(r) * 50); // (0.30.1: a production's post-production, ±20)
  return r.played.score + swingOf(r) / 2 >= 0.4 ? `Raté pour l’instant : un bon montage peut encore le rattraper (jusqu’à +${sw} points).` : `Raté : même un montage parfait (+${sw} points) ne suffira pas à le rattraper.`;
}
// A date: the difficulty comes from how famous the person is; the result decides how the evening ends.
const partnerOf = (g, c) => mains(g).find((o) => o !== c && o.unlocked && PARTNER.includes(o.vibe)) || null;
function DateSetup({ ev, g, now }) {
  const c = g.chars[ev.c];
  const X = isTalk(g, ev) ? dateExigence(g, ev, now) : null; // 0.16: from the second date, what you live sets the exigence
  const D = X ? DIFFS[X.ix] : diffOf(ev.diff || fameDiff(c));
  const early = ev.due - now, late = now - ev.due;
  const care = !!(g.opts && g.opts.careDates), due = early <= 0;
  useEffect(() => { if (due && care) prepDate(ev); }, [due, care, ev.id]); // « Rendez-vous soignés »: written while you read this
  const other = datesClash(g, ev);
  const oc = other && g.chars[other.c];
  const wed = dateKind(c, ev) === 'wedding'; // 0.28.1: the big day is no ordinary date
  const talkCafes = Math.round(costGuess(g, 'talk') * (TALK_TURNS + 2));
  return html`<div class="mg-setup">
    <div class="date-head"><${Avatar} who=${author(g, 'c:' + c.id)} size=${56} /><div><h3>${wed ? `💒 Le grand jour avec ${firstName(c)}` : eventLabel(g, ev)}</h3><span>« ${ev.what} » · ${early > 0 ? fmtWhen(ev.due, now) : late > 15 * 60000 ? `tu as ${Math.round(late / 60000)} min de retard` : 'c’est maintenant'}</span></div></div>
    ${X ? html`<div class="diff-opt on fixed"><span class="d-emo" aria-hidden="true">${D.emoji}</span><span class="d-mid"><b>Exigence ${D.label}</b><small>Ce soir, ça dépend de ce que vous vivez, pas des abonnés.</small></span><span class="d-mult">${fmtMult(D.mult)}</span></div>
      ${X.why.length ? html`<div class="ex-why">${X.why.map((w) => html`<span key=${w} class="chip">${w}</span>`)}</div>` : null}`
      : html`<div class="diff-opt on fixed"><span class="d-emo" aria-hidden="true">${D.emoji}</span><span class="d-mid"><b>Difficulté ${D.label}</b><small>${wed ? 'Votre mariage, devant vos proches.' : `${c.name} a ${fmtN(c.followers)} ${plural(c.followers, 'abonné', 'abonnés')} : plus on est connu, plus on est exigeant.`}</small></span><span class="d-mult">${fmtMult(D.mult)}</span></div>`}
    ${isTalk(g, ev) ? null : html`<small class="muted diff-note">${wed ? 'Le chiffre multiplie ce que la cérémonie rapporte (relation, XP), sauf si elle tourne mal.' : 'Le chiffre multiplie ce que le rendez-vous rapporte (relation, XP), sauf s’il est raté.'}</small>`}
    ${isTalk(g, ev) ? html`<p class="date-late talk-note"><${Icon} n="msg" s=${15} /> Cette fois, pas de mini-jeu : vous vous parlez pour de vrai, et tu réponds avec tes mots (${TALK_TURNS} échanges, ≈ ${talkCafes} ${plural(talkCafes, 'café', 'cafés')}).</p>` : null}
    ${late > 15 * 60000 ? html`<p class="date-late"><${Icon} n="clock" s=${15} /> Tu arrives en retard : la soirée démarre mal (un cran plus dur).</p>` : null}
    ${partnerOf(g, c) && (ROMANCE.includes(c.vibe) || ROMANTIC_RE.test(ev.what)) ? html`<p class="date-late"><${Icon} n="heart" s=${15} /> ${partnerWord(partnerOf(g, c))}, ${firstName(partnerOf(g, c))}, n’est pas au courant… pour l’instant.</p>` : null}
    ${(() => { const cl = eveningClash(g, ev).filter((x) => !x.ev || !oc || x.ev !== other.id); return cl.length ? html`<p class="date-late date-clash"><${Icon} n="clock" s=${15} /> <span>Pendant ta soirée (≈ ${DATE_H} h) : ${cl.map((x) => x.text).join(' ; ')}. ${isTalk(g, ev) ? 'Tu pourras l’écourter pour y être.' : 'Pour y être, décale l’un ou l’autre avant.'}</span></p>` : null; })()}
    ${oc ? html`<p class="date-late"><${Icon} n="calendar" s=${15} /> Tu as aussi rendez-vous avec ${firstName(oc)} (${fmtWhen(other.due, now)}). Si tu y vas sans ${gx(oc.g, 'le', 'la', 'l’')} prévenir, ${gx(oc.g, 'il', 'elle', 'iel')} t’attendra pour rien.</p>` : null}
    ${early > 0 ? html`<button class="btn btn-hot" onClick=${() => skipTime(early + 1000, () => ev.due)} disabled=${!!heldRel(g, now)}><${Icon} n="ffwd" s=${16} /> Avancer jusqu’au rendez-vous</button>${heldRel(g, now) ? html`<small class="muted why-off">${heldWhy(heldRel(g, now))}</small>` : null}`
      : html`<button class="btn btn-hot" onClick=${() => genDate(ev)}>${wed ? '💒' : MEET[meetKind(c, ev)].emoji} C’est parti</button>`}
    ${due && care ? html`<small class="muted prep-note">${S.busy.prep === ev.id ? html`<${Typing} /> ${wed ? 'La cérémonie se prépare' : 'La soirée se prépare'} et se relit (rendez-vous soignés)…` : ev.prep ? (wed ? '💒 Cérémonie prête, relue pour coller à votre histoire.' : '💘 Soirée prête, relue pour coller à votre histoire.') : ''}</small>` : null}
    <button class="btn btn-ghost" onClick=${() => askCancelDate(g, ev)}>${wed ? 'Annuler la cérémonie' : 'Annuler le rendez-vous'}</button>
  </div>`;
}
// 0.28.1: the wedding's own words (a yes, unless it all goes wrong)
const WED = { tiers: ['Vous vous êtes dit oui', 'Vous vous êtes dit oui', 'Tout tourne mal'], lines: ['Une cérémonie inoubliable.', 'Quelques fausses notes, mais l’essentiel est là.', 'Rien ne se passe comme prévu.'], end: 'Voir la suite', ending: 'La fête continue…', outcomes: tierRule('une cérémonie inoubliable', 'quelques fausses notes', 'tout tourne mal') };
const meetWords = (c, ev) => (c && dateKind(c, ev) === 'wedding' ? Object.assign({}, MEET.love, WED, { emoji: '💒' }) : MEET[meetKind(c, ev)]);
function DateResult({ ev, g }) {
  const tier = ev.played.tier, D = diffOf(ev.played.diff || ev.diff), M = meetWords(g.chars[ev.c], ev), ix = tierIx(tier);
  return html`<div class=${'mg-result ' + tier}>
    <span class="eyebrow">${M.tiers[ix]}</span>
    <div class="mg-score">${pctOf(ev.played.score)} %</div>
    <span class="chip">${D.emoji} ${D.label} · ${tier === 'flop' ? 'pas de bonus sur un fiasco' : 'bonus ' + fmtMult(D.mult)}</span>
    <p>${M.lines[ix]}</p>
    <button class="btn btn-hot" onClick=${() => endDate(ev)} disabled=${!!S.busy.ev}>${M.end}</button>
  </div>`;
}
function DateLayer({ ev, g, now, i }) {
  const c = g.chars[ev.c];
  const M = meetWords(c, ev);
  let body;
  if (!c || ev.state !== 'scheduled') body = html`<div class="empty"><b>Ce rendez-vous est passé</b></div>`;
  else if (S.busy.ev === ev.id) body = html`<div class="mg-load"><span class="mg-emo" aria-hidden="true">${M.emoji}</span><b>${M.ending}</b><${Typing} /></div>`;
  else if (ev.played && !(ev.talk && !ev.talk.closed)) body = html`<${DateResult} ev=${ev} g=${g} />`;
  else if (ev.talk) body = html`<${DateTalk} ev=${ev} g=${g} now=${now} />`; // 0.11: played for real (0.16: until the player ends the evening)
  else if (ev.game) body = html`<${ShootPlay} key=${ev.id + ':' + (ev.tries || 0)} r=${ev} now=${now} icon=${M.icon} outcomes=${M.outcomes} />`;
  else if (S.busy.mg === ev.id || (S.busy.prep === ev.id && ev.go)) body = html`<div class="mg-load"><span class="mg-emo" aria-hidden="true">${M.emoji}</span><b>Tu te prépares…</b><span>${S.busy.review === ev.id ? 'L’IA relit la soirée pour qu’elle colle à votre histoire' : `« ${ev.what} »`}</span><${Typing} /></div>`;
  else body = html`<${DateSetup} ev=${ev} g=${g} now=${now} />`;
  return html`<${LayerShell} i=${i} title=${(c && dateKind(c, ev) === 'wedding' ? 'Le grand jour · ' : 'Rendez-vous · ') + (c ? firstName(c) : '')}>${body}<//>`;
}
function MiniGameLayer({ l, g, now, i }) {
  const evd = eventOf(g, l.id);
  if (evd) return html`<${DateLayer} ev=${evd} g=${g} now=${now} i=${i} />`;
  const r = (g.releases || []).find((x) => x.id === l.id);
  const W = r ? WHATS[r.what] || WHATS.vidéo : WHATS.vidéo;
  let body;
  if (!r || r.state !== 'scheduled') body = html`<div class="empty"><b>Plus rien à tourner</b><span>${r && r.state === 'released' ? 'C’est déjà en ligne.' : 'Ce projet est abandonné.'}</span></div>`;
  else if (r.big) body = html`<${BigStage} g=${g} r=${r} now=${now} />`; // 0.30.1: a big production
  else if (r.played) body = html`<${ShootResult} r=${r} g=${g} now=${now} />`;
  else if (r.game) body = html`<${ShootPlay} key=${r.id + ':' + (r.tries || 0) + ':' + r.delays} r=${r} now=${now} />`;
  else if (S.busy.mg === r.id) body = html`<div class="mg-load"><span class="mg-emo" aria-hidden="true">${W.emoji}</span><b>Préparation du tournage…</b><span>« ${r.topic} »</span><${Typing} /></div>`;
  else body = html`<${ShootSetup} key=${r.id + ':' + r.delays} r=${r} />`;
  return html`<${LayerShell} i=${i} title=${r && r.big ? 'Production · ' + (r.big.stage >= 3 ? 'Sortie' : BIG_STAGES[r.big.stage].label) : 'Tournage · ' + (r ? nounOf(r) : 'vidéo')}>${body}<//>`;
}

/* ---------- layers ---------- */
function LayerShell({ i, title, head, foot, children, onBack, dark }) {
  const l = useContext(WinCtx), panel = useRef(null);
  if (l && typeof title === 'string' && title) l.title = title; // (the dock shows it)
  if (l) l.onBack = onBack || null; // (0.28.1: Échap takes it too)
  if (l && l.os) { // 0.27.9: a window out of the game: the whole window, Hype's bar on top (it moves the window), the system's frame gone
    const ctl = (act) => { try { HOST.winCtl(l.os.name, act); } catch (e) { /* (closing) */ } };
    return html`<div class="os-shell"><section ref=${panel} class=${'layer-panel os-panel' + (dark ? ' dark' : '')} role="dialog" aria-label=${title}>
      <header class="layer-head hypebar os-bar" onDblClick=${(e) => { if (!e.target.closest('button, a, input, .who')) ctl('max'); }}>
        ${onBack ? html`<button class="iconbtn" onClick=${onBack} aria-label="Retour"><${Icon} n="back" /></button>` : html`<span class="hb-logo" aria-hidden="true">hype</span>`}${head || html`<h2>${title}</h2>`}
        <span class="os-grab" aria-hidden="true"></span>
        <span class="win-btns">
          <button type="button" class="win-btn win-in" onClick=${() => osClose(l, true)} aria-label="Remettre dans le jeu" title="Remettre dans le jeu"><${Icon} n="popin" s=${17} /></button>
          <button type="button" class="win-btn win-min" onClick=${() => ctl('min')} aria-label="Réduire la fenêtre" title="Réduire"><${Icon} n="minus" s=${18} /></button>
          <button type="button" class="win-btn win-max" onClick=${() => ctl('max')} aria-label="Agrandir la fenêtre" title="Agrandir"><${Icon} n="maxi" s=${15} /></button>
          <button type="button" class="win-btn win-close" onClick=${() => osClose(l)} aria-label="Fermer la fenêtre" title="Fermer"><${Icon} n="x" s=${18} /></button>
        </span>
      </header>
      <div class="layer-body">${children}</div>
      ${foot ? html`<footer class="layer-foot">${foot}</footer>` : null}
    </section></div>`;
  }
  // 0.27.10: in the PC app, no window inside the game any more: « Détacher », or its bar dragged, makes it a real window
  // at once (one that holds the game, a date or a mini-game, stays in the middle). Floating inside: the page of the tests.
  const desk = osDesk(), wide = !!l && winWide() && !desk, modal = winModal(l), R = wide ? winOf(l) : null, float = !!(R && R.float), osOut = osWinOK(l) && !modal;
  // 0.27.7: the title bar moves the window (it floats from the first move); the corner resizes it
  const drag = (e, mode) => {
    if (!wide || e.button > 0 || (mode === 'move' && e.target.closest('.win-btn, .iconbtn, a[href], input, textarea, select, [contenteditable="true"]'))) return; // (0.27.9: a name or an avatar in the bar moves it too; a tap on it still opens)
    const el = panel.current;
    if (!el) return;
    const r0 = el.getBoundingClientRect(), p0 = { x: e.clientX, y: e.clientY }, V = viewBox(); // (0.27.10: its place counts from under Hype's bar)
    const base = { x: r0.left - V.x, y: r0.top - V.y, w: r0.width, h: r0.height };
    if (!float) { base.h = Math.min(base.h, Math.round(V.h * 0.82)); base.w = Math.min(base.w, 640); } // (out of the middle, a window of its own: not the whole height)
    const cur = Object.assign({}, base);
    let live = false;
    const move = (ev) => {
      const dx = ev.clientX - p0.x, dy = ev.clientY - p0.y;
      if (!live) {
        if (Math.abs(dx) + Math.abs(dy) < 5) return;
        live = true;
        if (!float) { l.win = Object.assign({ float: true }, base); update(false); }
        document.body.classList.add('win-dragging');
      }
      const vw = V.w, vh = V.h;
      if (mode === 'move') { cur.x = clamp(base.x + dx, WIN_GRAB - base.w, vw - 120); cur.y = clamp(base.y + dy, 0, Math.max(0, vh - WIN_BAR)); }
      else { // (0.27.9: by any edge, like a real window: right, left, bottom, the corners)
        if (mode.includes('e')) cur.w = clamp(base.w + dx, WIN_MIN_W, Math.max(WIN_MIN_W, vw - base.x - 4));
        if (mode.includes('w')) { const w = clamp(base.w - dx, WIN_MIN_W, Math.max(WIN_MIN_W, base.x + base.w)); cur.x = base.x + base.w - w; cur.w = w; }
        if (mode.includes('s')) cur.h = clamp(base.h + dy, winMinH(l.t), Math.max(winMinH(l.t), vh - base.y - 4));
      }
      Object.assign(el.style, { left: cur.x + 'px', top: cur.y + 'px', width: cur.w + 'px', height: cur.h + 'px' });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.body.classList.remove('win-dragging');
      if (live) {
        l.win = { float: true, x: Math.round(cur.x), y: Math.round(cur.y), w: Math.round(cur.w), h: Math.round(cur.h) }; winSet(l.t, l.win); update(false); // (this one, and the next of its kind)
        const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); }; // (the click a drag ends with opens nothing)
        window.addEventListener('click', swallow, true);
        setTimeout(() => window.removeEventListener('click', swallow, true), 0);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
  // Its bar dragged in the PC app: from the first move, a real window under the mouse, which follows it (onto another
  // screen too) until it is let go. A tap without a move stays a tap (a name in the bar opens the profile).
  const tear = (e) => {
    if (!osOut || e.button > 0 || e.target.closest('.win-btn, .iconbtn, a[href], input, textarea, select, [contenteditable="true"]')) return;
    const el = panel.current;
    if (!el) return;
    const r0 = el.getBoundingClientRect(), p0 = { x: e.clientX, y: e.clientY };
    let torn = null;
    const move = (ev) => {
      if (torn || Math.abs(ev.clientX - p0.x) + Math.abs(ev.clientY - p0.y) < 5) return;
      const w = Math.round(Math.min(r0.width, 600)), h = Math.round(Math.min(r0.height, 760));
      const hx = Math.round(Math.min(p0.x - r0.left, w - 60)), hy = Math.round(Math.min(p0.y - r0.top, 40)); // (where its bar is held, inside its new size)
      const at = { x: Math.round(ev.screenX - hx), y: Math.round(ev.screenY - hy), w, h };
      torn = popOut(l, { at, follow: { dx: hx, dy: hy, w, h } }) ? { name: l.os.name } : { name: null };
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!torn) return;
      if (torn.name) { try { HOST.winCtl(torn.name, 'drop').catch(() => {}); } catch (err) { /* (closing) */ } } // (it stays where it was let go)
      const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); }; // (the click a drag ends with opens nothing)
      window.addEventListener('click', swallow, true);
      setTimeout(() => window.removeEventListener('click', swallow, true), 0);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
  const toggleFloat = () => {
    if (!l) return;
    if (float) { l.win = Object.assign({}, R, { float: false }); winSet(l.t, { float: false }); }
    else { const r0 = panel.current && panel.current.getBoundingClientRect(), V = viewBox(); l.win = Object.assign({ float: true }, r0 ? { x: r0.left - V.x + 24, y: Math.max(0, r0.top - V.y + 24), w: Math.min(r0.width, 600), h: Math.min(r0.height - 48, 760) } : winRect(l.t)); winSet(l.t, l.win); }
    update(false);
  };
  const cls = 'layer' + (float ? ' float' : '') + (float && modal ? ' held' : '') + (l && l.min ? ' min' : '') + (l && l.back ? ' back' : '');
  return html`<div class=${cls} style=${'z-index:' + (20 + (i || 0))} aria-hidden=${l && l.min ? 'true' : undefined} onClick=${(e) => { if (!float && e.target === e.currentTarget) closeLayer(l); }}>
    <section ref=${panel} class=${'layer-panel' + (dark ? ' dark' : '')} role="dialog" aria-modal=${float && !modal ? 'false' : 'true'} aria-label=${title}
      style=${float ? `left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px` : ''} onPointerDown=${float && l ? () => raiseLayer(l) : undefined}>
      <header class=${'layer-head' + (wide || osOut ? ' movable' : '') + (float ? ' hypebar' : '')} onPointerDown=${wide ? (e) => drag(e, 'move') : osOut ? tear : undefined}>
        ${float && !onBack ? html`<span class="hb-logo" aria-hidden="true">hype</span>` : html`<button class="iconbtn" onClick=${onBack || (() => closeLayer(l))} aria-label="Retour"><${Icon} n="back" /></button>`}${head || html`<h2>${title}</h2>`}
        ${l ? html`<span class="win-btns">
          ${modal ? null : html`<button type="button" class="win-btn win-min" onClick=${() => minLayer(l)} aria-label="Réduire la fenêtre" title=${l && MG_LAYERS.includes(l.t) ? 'Réduire (le chrono continue)' : 'Réduire (tout ce que tu as rempli est gardé)'}><${Icon} n="minus" s=${18} /></button>`}
          ${wide ? html`<button type="button" class="win-btn win-float" onClick=${toggleFloat} aria-label=${float ? 'Remettre la fenêtre au centre' : 'Détacher la fenêtre'} title=${float ? 'Remettre au centre' : 'Détacher : la déplacer et la redimensionner'}><${Icon} n=${float ? 'dock' : 'detach'} s=${18} /></button>` : null}
          ${osOut ? html`<button type="button" class="win-btn win-out" onClick=${() => popOut(l)} aria-label="Détacher la fenêtre" title="Détacher : une vraie fenêtre, à poser où tu veux (même sur un autre écran). Tirer sa barre la détache aussi."><${Icon} n="popout" s=${17} /></button>` : null}
          ${float ? html`<button type="button" class="win-btn win-close" onClick=${() => { raiseLayer(l); closeLayer(); }} aria-label="Fermer la fenêtre" title="Fermer"><${Icon} n="x" s=${18} /></button>` : null}
        </span>` : null}
      </header>
      <div class="layer-body">${children}</div>
      ${foot ? html`<footer class="layer-foot">${foot}</footer>` : null}
      ${float ? html`${['e', 'w', 's', 'sw'].map((m) => html`<span key=${m} class=${'win-edge ' + m} onPointerDown=${(e) => drag(e, m)} aria-hidden="true"></span>`)}<span class="win-grip" onPointerDown=${(e) => drag(e, 'se')} aria-hidden="true" title="Redimensionner"></span>` : null}
    </section>
  </div>`;
}
function Layer(props) {
  const t = props.l.t;
  if (t === 'thread') return html`<${ThreadLayer} ...${props} />`;
  if (t === 'char') return html`<${CharLayer} ...${props} />`;
  if (t === 'dm') return html`<${DMLayer} ...${props} />`;
  if (t === 'compose') return html`<${ComposeLayer} ...${props} />`;
  if (t === 'shop') return html`<${ShopLayer} ...${props} />`;
  if (t === 'tag') return html`<${TagLayer} ...${props} />`;
  if (t === 'npc') return html`<${NpcLayer} ...${props} />`;
  if (t === 'minigame') return html`<${MiniGameLayer} ...${props} />`;
  if (t === 'settings') return html`<${SettingsLayer} ...${props} />`;
  if (t === 'recruit') return html`<${RecruitLayer} ...${props} />`;
  if (t === 'series') return html`<${SeriesLayer} ...${props} />`;
  if (t === 'move') return html`<${MoveLayer} ...${props} />`; // 0.27.4: a release brought forward
  if (t === 'feat') return html`<${FeatLayer} ...${props} />`; // 0.29.1: a feat for a release
  if (t === 'agent') return html`<${AgentLayer} ...${props} />`; // 0.31: becoming someone's agent
  if (t === 'big') return html`<${BigPlanLayer} ...${props} />`; // 0.30.1: a big production, planned
  if (t === 'bigcast') return html`<${BigCastLayer} ...${props} />`; // 0.30.1: and its cast
  if (t === 'later') return html`<${LaterLayer} ...${props} />`; // 0.28.1: and postponed, to the time chosen
  if (t === 'palette') return html`<${PaletteLayer} ...${props} />`; // 0.27.4: the palette
  if (t === 'practice') return html`<${PracticeLayer} ...${props} />`; // 0.27.6: a mini-game for practice
  if (t === 'gear') return html`<${GearShopLayer} ...${props} />`; // 0.20
  if (t === 'insta') return html`<${InstaLayer} ...${props} />`;
  if (t === 'tiktok') return html`<${TikTokLayer} ...${props} />`;
  if (t === 'datelog') return html`<${DateLogLayer} ...${props} />`; // 0.22.4
  if (t === 'job') return html`<${JobLayer} ...${props} />`; // 0.23
  if (t === 'skill') return html`<${SkillLayer} ...${props} />`; // 0.24: a skill's tree
  if (t === 'ach') return html`<${AchLayer} ...${props} />`; // 0.28: the achievements
  if (t === 'inv') return html`<${InvLayer} ...${props} />`; // 0.26: the inventory
  if (t === 'merch') return html`<${MerchLayer} ...${props} />`; // 0.29: the shop that stays open
  if (t === 'sell') return html`<${SellLayer} ...${props} />`; // 0.26: putting something on sale
  if (t === 'resale') return html`<${ResaleLayer} ...${props} />`; // 0.26: the second-hand app
  if (t === 'group') return html`<${GroupLayer} ...${props} />`; // 0.29: a group chat
  if (t === 'newgroup') return html`<${NewGroupLayer} ...${props} />`; // 0.31.1: the player starts one
  if (t === 'storynew') return html`<${StoryNewLayer} ...${props} />`; // 0.29: a story of the player
  return null;
}
function IdeaList({ k, onPick }) {
  if (!S.ideas || S.ideas.key !== k) return null;
  const list = S.ideas.list.length ? S.ideas.list : S.ideas.loading ? S.ideas.prev || [] : [];
  return html`${list.map((it, n) => html`<button class=${'idea' + (S.ideas.list.length ? '' : ' stale')} key=${n + it.text.slice(0, 12)} onClick=${() => onPick(it.text)}><small>${it.angle || 'idée'}</small>${it.text}</button>`)}
    ${S.ideas.loading ? html`<div class="muted row" style="font-size:13px;padding:4px 2px"><${Typing} /> ${AI_NAME} cherche des idées…</div>` : null}`;
}
/* ---------- 0.15: « @ » suggests the people of the world (mentioning them counts) ---------- */
const foldAcc = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// The « @… » being typed just before the caret: { q, from } (from: where the @ is), or null.
function mentionAt(text, caret) {
  const m = /(^|[^\p{L}\p{N}_@.])@([\p{L}\p{N}._]{0,20})$/u.exec(String(text || '').slice(0, caret));
  return m ? { q: m[2], from: caret - m[2].length - 1 } : null;
}
// Who fits: the main characters first (the closest first), then the media and the rest of the people they know.
function mentionPicks(g, q, n = 5) {
  const k = foldAcc(q).replace(/[^a-z0-9._]/g, '');
  const rank = (c) => (isMain(c) ? 0 : c.kind === 'media' ? 1 : 2);
  return g.order.map((id) => g.chars[id]).filter((c) => c && c.unlocked && ['main', 'media', 'staff', 'ex'].includes(c.kind)
    && (!k || c.handle.startsWith(k) || foldAcc(c.name).split(/\s+/).some((w) => w.startsWith(k)) || (k.length >= 2 && c.handle.includes(k))))
    .sort((a, b) => rank(a) - rank(b) || Math.abs(b.rel || 0) - Math.abs(a.rel || 0)).slice(0, n);
}
// For a textarea: what to show, the keys it takes (↑ ↓ Entrée Tab Échap), and the pick (« @handle » + a space).
function useMentions(g, ref, val, setVal, max = 280) {
  const [st, setSt] = useState({ sel: 0, off: -1 });
  const el = ref.current;
  const at = el && el.ownerDocument && el.ownerDocument.activeElement === el ? mentionAt(val, el.selectionStart) : null; // (its own page: a window out of the game too)
  const list = at && st.off !== at.from ? mentionPicks(g, at.q) : [];
  const sel = Math.min(st.sel, Math.max(0, list.length - 1));
  const pick = (c) => {
    const t = ref.current;
    if (!t || !c) return;
    const pos = t.selectionStart, a = mentionAt(t.value, pos);
    if (!a) return;
    const next = (t.value.slice(0, a.from) + '@' + c.handle + ' ' + t.value.slice(pos)).slice(0, max);
    const caret = Math.min(next.length, a.from + c.handle.length + 2);
    setVal(next);
    setSt({ sel: 0, off: -1 });
    t.value = next;
    t.focus();
    t.setSelectionRange(caret, caret);
  };
  const onKey = (ev) => {
    if (!list.length) return false;
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); setSt({ sel: (sel + (ev.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length, off: st.off }); return true; }
    if ((ev.key === 'Enter' && !ev.shiftKey && !ev.metaKey && !ev.ctrlKey) || ev.key === 'Tab') { ev.preventDefault(); pick(list[sel]); return true; }
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); setSt({ sel: 0, off: at.from }); return true; }
    return false;
  };
  const view = list.length ? html`<div class="mention-list" role="listbox" aria-label="Mentionner quelqu’un">${list.map((c, i) => html`<button key=${c.id} type="button" role="option" aria-selected=${i === sel ? 'true' : 'false'} class=${'mention-opt' + (i === sel ? ' on' : '')}
      onMouseDown=${(e) => e.preventDefault()} onClick=${() => pick(c)}><${Avatar} who=${author(g, 'c:' + c.id)} size=${26} /><b>${c.name}</b><span class="mo-h">@${c.handle}</span></button>`)}</div>` : null;
  return { onKey, view, refresh: () => setSt((x) => ({ sel: x.sel, off: x.off })) };
}
function ReplyBox({ p, g, now, focus }) {
  const [, force] = useState(0);
  const ref = useRef(null);
  useEffect(() => { if (focus && ref.current) ref.current.focus(); }, []);
  const val = S.drafts.reply[p.id] || '';
  const e = energyNow(g, now);
  const busy = !!S.busy.act;
  const tid = S.replyTo[p.id];
  const tr = tid ? p.replies.find((r) => r.id === tid && r.at <= now) || null : null;
  const trAu = tr ? author(g, tr.a) : null;
  const can = !!val.trim() && !busy && canAfford(g, 'reply');
  const mn = useMentions(g, ref, val, (v) => { S.drafts.reply[p.id] = v; force((x) => x + 1); if (ref.current) autosize(ref.current); });
  const em = useEmoji('reply:' + p.id, ref, () => S.drafts.reply[p.id] || '', (v) => { S.drafts.reply[p.id] = v; force((x) => x + 1); if (ref.current) autosize(ref.current); }); // 0.17
  const send = async () => {
    const text = (S.drafts.reply[p.id] || '').trim(); // live state: a second tap or the voice timer cannot send twice
    if (!text || S.busy.act) return;
    const id2 = S.replyTo[p.id];
    const target = id2 ? p.replies.find((r) => r.id === id2 && r.at <= Date.now()) || null : null;
    S.drafts.reply[p.id] = '';
    delete S.replyTo[p.id];
    if (S.ideas && S.ideas.key === p.id) S.ideas = null;
    if (ref.current) ref.current.style.height = '';
    force((x) => x + 1);
    const ok = await runAct('reply', text, p, target);
    if (ok === false) { S.drafts.reply[p.id] = text; if (target) S.replyTo[p.id] = target.id; force((x) => x + 1); }
  };
  const [left, cancel, arm] = useAutoSend('reply:' + p.id, val, can, send);
  const showIdeas = S.ideas && S.ideas.key === p.id;
  return html`<div>
    ${showIdeas ? html`<div class="foot-ideas"><${IdeaList} k=${p.id} onPick=${(t) => { S.drafts.reply[p.id] = t; S.ideas = null; update(false); if (ref.current) ref.current.focus(); }} /></div>` : null}
    <${AutoSendBar} left=${left} cancel=${cancel} />
    ${tr ? html`<div class="reply-target">
      <span>En réponse à <b>@${trAu.handle}</b> · ${tr.text}</span>
      <button type="button" class="iconbtn" style="width:30px;height:30px" onClick=${() => { delete S.replyTo[p.id]; update(false); }} aria-label="Répondre au post plutôt qu’à ce commentaire"><${Icon} n="x" s=${15} /></button>
    </div>` : null}
    <div class="foot-tools">
      <button class="linkbtn row" style="gap:4px" onClick=${() => loadIdeas(p, tr)} disabled=${S.busy.ideas}><${Icon} n="sparkles" s=${14} /> Des idées ? <span class="cost-tag">≈ ${costLabel(g, 'ideas')} ☕</span></button>
      <${WriteBtn} w=${{ kind: 'reply', key: 'reply:' + p.id, p, r: tr, draft: val.trim() }} onText=${(t) => { S.drafts.reply[p.id] = t; update(false); if (ref.current) { ref.current.value = t; ref.current.focus(); autosize(ref.current); } }} />
      <${VoiceChip} />
      ${em.btn}
      <span>${busy ? 'Ta réaction précédente est encore en cours…' : canAfford(g, 'reply') ? `≈ ${costLabel(g, 'reply')} ${plural(costLabel(g, 'reply'), 'café', 'cafés')} par réponse${e.unlimited ? '' : ` · il t’en reste ${fmtCafes(e.left)}`}` : html`Budget IA épuisé · <button class="linkbtn" onClick=${budgetBlocked}>options</button>`}</span>
    </div>
    ${mn.view}
    ${em.panel}
    <div class="reply-box">
      <textarea ref=${ref} id=${'reply-' + p.id} rows="1" maxlength="280" placeholder="Ta réponse…" aria-label=${tr ? 'Répondre à @' + trAu.handle : 'Répondre au post'} value=${val}
        onInput=${(ev) => { arm(); S.drafts.reply[p.id] = ev.target.value; autosize(ev.target); force((x) => x + 1); }}
        onClick=${mn.refresh} onKeyUp=${(ev) => { if (/^(Arrow(Left|Right)|Home|End)$/.test(ev.key)) mn.refresh(); }}
        onKeyDown=${(ev) => { if (mn.onKey(ev)) return; if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); send(); } }}></textarea>
      <button class="send" onClick=${send} disabled=${!can} aria-label="Répondre"><${Icon} n="send" s=${16} /> Répondre</button>
    </div>
  </div>`;
}
function ThreadLayer({ l, g, now, i }) {
  const p = g.posts.find((x) => x.id === l.id);
  if (!p) return html`<${LayerShell} i=${i} title="Post"><div class="empty"><b>Post introuvable</b><span>Il n’est plus dans ton fil.</span></div><//>`;
  const au = author(g, p.a);
  const replies = p.replies.filter((r) => r.at <= now);
  const writing = p.replies.some((r) => r.at > now && r.at - now < 60000) || S.busy.act === p.id || S.busy.more === p.id; // (a later wave is not « writing » yet)
  return html`<${ThreadBody} key=${p.id} l=${l} g=${g} now=${now} i=${i} p=${p} au=${au} replies=${replies} writing=${writing} />`;
}
function ThreadBody({ l, g, now, i, p, au, replies, writing }) {
  const endRef = useRef(null);
  const count = replies.length;
  const rows = pinFirst(p, threadOrder(replies)); // (0.29: the comment the player pinned comes first)
  // Ultime: the comments the counter promises are written as soon as the thread opens (once per post; opening it is the player's action)
  useEffect(() => { if (intensityOf(g).autoMore && !p.more && !p.pending && moreDue(p, Date.now()) && canAfford(g, 'more')) moreReplies(p.id); }, []); // Ultime, « Beaucoup de commentaires »
  useEffect(() => {
    const el = endRef.current && endRef.current.closest('.layer-body');
    if (!el || !count) return;
    let newest = replies[0];
    for (const r of replies) if (r.at > newest.at) newest = r;
    if (Date.now() - newest.at > 8000) return;
    let lastMine = null;
    for (const r of replies) if (r.a === 'p' && (!lastMine || r.at > lastMine.at)) lastMine = r;
    const follow = lastMine && Date.now() - lastMine.at < 90000 && (newest === lastMine || newest.to === lastMine.id);
    if (follow) {
      const node = byId('r-' + newest.id);
      if (node) node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (el.scrollTop > 0 && el.scrollHeight - el.scrollTop - el.clientHeight < 240) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [count, writing]);
  const viral = p.res && p.res.viral && revealed(p, now);
  const canDelete = p.a === 'p' && !p.pending && S.busy.act !== p.id;
  return html`<${LayerShell} i=${i} title="Post" foot=${html`<${ReplyBox} p=${p} g=${g} now=${now} focus=${l.focus} />`}>
    <article class=${'post post-big' + (viral ? ' is-viral' : '')}>
      ${viral ? html`<span class="stamp">VIRAL</span>` : null}
      <div class="post-head"><${Avatar} who=${au} size=${48} onClick=${() => openAuthor(au)} /><div class="who"><${AuthorName} au=${au}>${au.verified ? html`<${Verified} />` : null}<${BuzzTag} g=${g} a=${p.a} now=${now} /><//><${AuthorHandle} au=${au} /></div></div>
      ${p.apology ? html`<div class="post-flag"><${Icon} n="shield" s=${13} /> Excuses publiques</div>` : null}
      <${AccuseFlag} g=${g} p=${p} />
      ${p.sp ? html`<div class="post-flag"><span aria-hidden="true">🤝</span> Collaboration commerciale · ${p.sp}</div>` : null}
      ${p.text ? html`<p class="post-text"><${RichText} text=${p.text} g=${g} /></p>` : null}
      <${Evidence} p=${p} g=${g} />
      ${p.video ? html`<${PlatformVideo} g=${g} p=${p} now=${now} />` : null}
      <${PostMedia} g=${g} p=${p} au=${au} />
      ${p.fic ? html`<${FicCard} g=${g} p=${p} />` : null}
      ${p.crit ? html`<${CritCard} g=${g} p=${p} />` : null}
      ${p.poll ? html`<${PollCard} g=${g} p=${p} now=${now} />` : null}
      ${p.q ? html`<${QuoteCard} g=${g} q=${p.q} />` : null}
      ${p.evt ? html`<${EventCard} evt=${p.evt} />` : null}
      ${p.a === 'p' ? html`<${PostResult} p=${p} g=${g} now=${now} />` : null}
      ${eventsAt(g, (x) => x.p === p.id && !x.r).map((ev) => html`<${EventChip} key=${ev.id} g=${g} ev=${ev} now=${now} />`)}
      <div class="post-time-full">${fmtDate(p.ts)}${canDelete ? html` · <button class="linkbtn quiet" onClick=${() => askConfirm({ title: 'Supprimer ce post ?', text: 'Il disparaîtra de ton profil… mais quelqu’un a peut-être déjà fait une capture.', ok: 'Supprimer', danger: true, run: () => { closeLayer(); deletePost(g, p); } })}>Supprimer</button>` : null}</div>
      <${PostActions} p=${p} now=${now} onReply=${() => { const el = byId('reply-' + p.id); if (el) el.focus(); }} />
    </article>
    ${rows.map(({ r, depth, parent }) => html`<${ReplyRow} key=${r.id} g=${g} p=${p} r=${r} now=${now} depth=${depth} parent=${parent} />`)}
    ${writing ? html`<div class="writing"><${Typing} /> Ça écrit…</div>` : null}
    ${S.busy.more === p.id ? html`<div class="more-replies"><${Typing} /> D’autres commentaires arrivent…</div>`
      : !writing && moreDue(p, now) && (p.more || 0) < MORE_MAX ? html`<button class="more-replies more-btn" onClick=${() => moreReplies(p.id)} disabled=${!!S.busy.more}><${Icon} n="msg" s=${15} /> Voir plus de commentaires <span>+ ${fmtN(shownReplies(p, now) - replies.length)} · ≈ ${costLabel(g, 'more')} ☕</span></button>`
        : !writing && shownReplies(p, now) > replies.length ? html`<div class="more-replies"><${Icon} n="msg" s=${15} /> + ${fmtN(shownReplies(p, now) - replies.length)} ${plural(shownReplies(p, now) - replies.length, 'autre réponse', 'autres réponses')} dans le fil</div>` : null}
    ${!replies.length && !writing ? html`<div class="empty"><span>Aucune réponse pour l’instant. Lance la conversation.</span></div>` : null}
    <div ref=${endRef}></div>
  <//>`;
}
function CharLayer({ l, g, now, i }) {
  const c = g.chars[l.id];
  if (!c) return html`<${LayerShell} i=${i} title="Profil"><div class="empty"><b>Profil introuvable</b></div><//>`;
  const posts = revealedPosts(g, now).filter((p) => p.a === 'c:' + c.id);
  const main = isMain(c), cast = c.kind === 'main'; // 0.16: someone who joined the cast has it all, but the badge stays the original cast's
  const au = author(g, 'c:' + c.id);
  const first = firstName(c);
  const V = c.vibe ? VIBES[c.vibe] : null;
  const mem = (c.mem || []).slice().reverse();
  return html`<${LayerShell} i=${i} title=${c.name}>
    <div class="banner" style=${'--h:' + c.hue}></div>
    <div class="prof">
      <div class="prof-top"><${Avatar} who=${au} size=${84} />
        <div class="row" style="gap:8px">
          ${DM_KINDS.includes(c.kind) ? html`<button class="btn btn-ghost btn-sm" onClick=${() => openDM(c.id)}><${Icon} n="msg" s=${15} /> Message</button>` : null}
          <button class=${'btn btn-sm ' + (c.youFollow ? 'btn-ghost' : 'btn-ink')} onClick=${() => toggleFollow(c)}>${c.youFollow ? 'Abonné·e' : 'Suivre'}</button>
        </div>
      </div>
      <div><h2>${c.name}${cast ? html`<${Verified} />` : null}</h2><span class="handle">@${c.handle}</span></div>
      <div class="row" style="gap:6px">${c.role ? html`<span class="chip">${c.role}</span>` : null}${c.age && c.kind !== 'media' ? html`<span class="chip">${c.age} ans</span>` : null}${c.followsYou ? html`<span class="chip good">Te suit</span>` : null}${V ? html`<span class="chip hot">${V.emoji} ${V.label}</span>` : null}${inBadBuzz(c, now) ? html`<span class="chip bad">Bad buzz · encore ${fmtDur(c.badBuzz.until - now)}</span>` : null}${c.cut ? html`<span class="chip bad">🚫 A coupé les ponts</span>` : null}</div>
      ${c.bio ? html`<p class="bio">${emoParts(c.bio)}</p>` : null}
      <div class="prof-stats"><span><b>${fmtN(c.followers)}</b> ${plural(c.followers, 'abonné', 'abonnés')}</span>${main ? html`<span>Relation : <b>${relShown(c)}</b> (${fmtRel(c.rel)})</span>` : null}</div>
      ${main ? html`<${RelMeter} rel=${c.rel} />` : null}
      ${main ? html`<${SocialLinks} g=${g} c=${c} now=${now} />` : null}
    </div>
    ${main ? html`<${TrustSection} g=${g} c=${c} now=${now} />` : null}
    ${main ? html`<${TemperSection} c=${c} />` : null}
    ${main ? html`<${AgentSection} g=${g} c=${c} now=${now} />` : null}
    ${main ? html`<${SecretToldSection} c=${c} />` : null}
    ${main ? html`<${SecretsKnownSection} g=${g} c=${c} />` : null}
    ${main && c.secretOut ? html`<section class="section secret-out">
      <div class="section-h"><h3>Secret révélé</h3><span>c’est sorti au grand jour</span></div>
      <p>${c.secretOut}</p>
    </section>` : null}
    ${main ? html`<section class="section">
      <div class="section-h"><h3>Votre dynamique</h3><span>${V ? V.emoji + ' ' + V.label : 'Rien de défini'}</span></div>
      ${stepNote(g, c, now) ? html`<p class="step-note">${stepNote(g, c, now)}</p>` : null}
      ${c.vibeGoal && VIBES[c.vibeGoal] ? html`<${VibePath} c=${c} />` : null}
      <p class="muted" style="font-size:13.5px">Ce que tu aimerais que ça devienne :</p>
      ${VIBE_GROUPS.map(([grp, name]) => html`<div class="vibe-grp" key=${grp}><span class="vibe-grp-h">${name}</span>
        <div class="vibe-goals">${VIBE_GOALS.filter((v) => VIBES[v].grp === grp).map((v) => html`<button key=${v} class=${'vibe-opt' + (c.vibeGoal === v ? ' on' : '')} disabled=${c.vibe === v} aria-pressed=${c.vibeGoal === v ? 'true' : 'false'} onClick=${() => setVibeGoal(c, c.vibeGoal === v ? null : v)}>${VIBES[v].emoji} ${VIBES[v].label}</button>`)}</div></div>`)}
      ${c.vibe === 'couple' && (c.officiel === 'secret' || c.officiel === 'pending') ? html`<button class="btn btn-ghost btn-sm couple-out" onClick=${() => { announceCouple(g, c); update(); }}>📣 Annoncer votre couple</button>` : null}
      ${ENDABLE.includes(c.vibe) ? html`<button class="linkbtn quiet vibe-end" onClick=${() => askConfirm({ title: c.vibe === 'mariage' ? `Divorcer de ${first} ?` : `Rompre avec ${first} ?`, text: `${first} va mal le prendre, et ça se saura.`, ok: c.vibe === 'mariage' ? 'Demander le divorce' : 'Rompre', danger: true, run: () => breakUp(g, c) })}>${c.vibe === 'mariage' ? 'Demander le divorce' : c.vibe === 'fiancailles' ? 'Rompre les fiançailles' : 'Rompre'}</button>`
        : V && !ROMANCE.includes(c.vibe) && V.grp !== 'conflit' ? html`<button class="linkbtn quiet vibe-end" onClick=${() => askConfirm({ title: `Prendre tes distances avec ${first} ?`, text: `Fini, ${V.label.toLowerCase()} : ${first} le remarquera.`, ok: 'Prendre mes distances', danger: true, run: () => dropVibe(g, c) })}>Prendre tes distances</button>` : null}
    </section>
    <section class="section">
      <div class="section-h"><h3>Ce que ${first} retient de toi</h3></div>
      ${mem.length ? html`<ul class="mem-list">${mem.map((m, k) => html`<li key=${k}>${m.s || m.t}</li>`)}</ul>` : html`<p class="muted" style="font-size:14px">Rien de marquant pour l’instant.</p>`}
    </section>
    ${dateLogOf(g, c.id).length ? html`<section class="section dlog-sec">
      <div class="section-h"><h3>Vos rendez-vous</h3><span>${dateLogOf(g, c.id).length} ${plural(dateLogOf(g, c.id).length, 'soirée', 'soirées')}</span></div>
      <button class="btn btn-ghost btn-sm" onClick=${() => openLayer({ t: 'datelog', c: c.id })}><${Icon} n="book" s=${15} /> Les relire</button>
    </section>` : null}
    <${CharFile} c=${c} g=${g} now=${now} />` : null}
    ${c.kind === 'staff' ? (() => { const m = g.staff.find((x) => x.c === c.id); return m ? html`<section class="section">
      <div class="section-h"><h3>Son contrat</h3><span>depuis ${fmtDur(now - m.since)}</span></div>
      <p>${STAFF_ROLES[m.role].emoji} ${roleName(m.role, c.g)} · ${tierName(m.tier, c.g).toLowerCase()} · ${payWord(g, m)}${m.unpaid ? ' · attend son salaire !' : ''}</p>
      <small class="muted">${STAFF_ROLES[m.role].fx(m.tier + 1)}</small>
    </section>` : null; })() : null}
    ${c.kind === 'brand' ? g.deals.filter((x) => x.contact === c.id).slice(-2).reverse().map((x) => html`<div class="section" key=${x.id}><${DealCard} g=${g} d=${x} now=${now} /></div>`) : null}
    ${c.kind !== 'media' ? html`<${PhotoTools} g=${g} k=${c.id} />` : null}
    ${posts.length ? posts.map((p) => html`<${PostRow} key=${p.id} g=${g} p=${p} now=${now} />`) : html`<div class="empty"><span>Pas encore de posts.</span></div>`}
  <//>`;
}
// The stages still to go toward the goal: « 😏 Flirt → 💞 En couple → 💍 Fiançailles → 💒 Mariage ».
function VibePath({ c }) {
  const path = vibePath(c, c.vibeGoal);
  const first = firstName(c);
  return html`<div class="vibe-path">
    <span class="vp-h">Objectif ${VIBES[c.vibeGoal].emoji} ${VIBES[c.vibeGoal].label}${path.length > 1 ? ` · ${path.length} étapes` : ''}</span>
    ${path.length > 1 || c.vibe ? html`<div class="vp-steps">${c.vibe && VIBES[c.vibe] ? html`<span class="vp-step now">${VIBES[c.vibe].emoji} ${VIBES[c.vibe].label}</span><span class="vp-arrow" aria-hidden="true">→</span>` : null}${path.map((v, k) => html`${k ? html`<span class="vp-arrow" aria-hidden="true">→</span>` : null}<span class=${'vp-step' + (k === 0 ? ' next' : '')}>${VIBES[v].emoji} ${VIBES[v].label}</span>`)}</div>` : null}
    <small>Une étape à la fois${PARTNER.includes(c.vibeGoal) ? `, et ${first} doit le vouloir aussi` : ''}. Ça ne se fera pas en un jour.</small>
  </div>`;
}
// The player's file on a character: clues noticed so far, and the call-out button.
function CharFile({ c, g, now }) {
  const first = firstName(c);
  const clues = (g.clues || []).filter((k) => k.c === c.id && k.at <= now);
  const wait = ACCUSE_COOLDOWN - (now - (c.accusedAt || 0));
  const bb = inBadBuzz(c, now);
  const fk = (g.fakes || []).filter((f) => f.c === c.id).slice(-1)[0] || null; // the last proof made up against them
  const fkText = !fk ? '' : fk.state === 'busted' ? `Ta fausse preuve contre ${first} a été démasquée.`
    : now - fk.at < 25 * 60000 ? `Ta fausse preuve contre ${first} tient… pour l’instant. ${first} sait que c’est faux.` : `Ta fausse preuve est passée : personne n’a rien remarqué. Sauf ${first}.`;
  return html`<section class="section">
    <div class="section-h"><h3>Ton dossier sur ${first}</h3><span>${clues.length ? `${clues.length} ${plural(clues.length, 'indice', 'indices')}` : 'vide'}</span></div>
    ${clues.length ? html`<ul class="clue-list">${clues.map((k) => html`<li key=${k.id}><${Icon} n="search" s=${14} /><span>${k.text}</span></li>`)}</ul>`
      : html`<p class="muted" style="font-size:14px">Rien de suspect pour l’instant. Ouvre l’œil : les indices se glissent dans les posts, les réponses et les messages privés.</p>`}
    ${fk ? html`<p class=${'fake-status' + (fk.state === 'busted' ? ' bad' : '')}><${Icon} n="mask" s=${14} /><span>${fkText}</span></p>` : null}
    <div class="accuse-row">
      <button class="btn btn-sm btn-danger-solid" disabled=${bb || wait > 0} onClick=${() => openCompose({ accuse: c.id })}><${Icon} n="megaphone" s=${15} /> Lancer un bad buzz</button>
      <small class="muted">${bb ? `${first} est déjà en plein bad buzz.` : wait > 0 ? `Encore ${fmtClock(wait)} avant de pouvoir recommencer.` : `≈ ${costLabel(g, 'accuse')} ${plural(costLabel(g, 'accuse'), 'café', 'cafés')}. Si tes arguments tiennent (des captures de DM aident), ${first} prend cher. Sinon, c’est toi. Tu peux aussi fabriquer une fausse preuve… à tes risques.`}</small>
    </div>
  </section>`;
}
// Someone from the public: a light profile with what they posted and answered in this game.
function NpcLayer({ l, g, now, i }) {
  const h = l.id, a = 'n:' + h;
  const n = g.npcs[h] || null;
  const au = author(g, a);
  const posts = revealedPosts(g, now).filter((p) => p.a === a);
  const reps = [];
  for (const p of g.posts) for (const r of p.replies) if (r.a === a && r.at <= now) reps.push({ p, r });
  reps.sort((x, y) => y.r.ts - x.r.ts);
  const fol = n ? npcFollowers(n) : 20 + (hashStr(h) % 400);
  return html`<${LayerShell} i=${i} title=${au.name}>
    <div class="banner" style=${'--h:' + au.hue}></div>
    <div class="prof">
      <div class="prof-top"><${Avatar} who=${au} size=${84} />${n ? html`<button class=${'btn btn-sm ' + (n.youFollow ? 'btn-ghost' : 'btn-ink')} onClick=${() => toggleFollowNpc(n)}>${n.youFollow ? 'Abonné·e' : 'Suivre'}</button>` : null}</div>
      <div><h2>${au.name}</h2><span class="handle">@${au.handle}</span></div>
      <div class="row" style="gap:6px"><span class="chip">${n && n.mom ? 'Ta mère' : n && n.fanOf === 'p' ? 'Compte fan' : n && n.regular ? 'Habitué·e du réseau' : 'Compte du public'}</span>${n && n.gone ? html`<span class="chip bad">Compte suspendu</span>` : null}</div>
      ${n && n.bio ? html`<p class="bio">${emoParts(n.bio)}</p>` : null}
      <div class="prof-stats"><span><b>${fmtN(fol)}</b> ${plural(fol, 'abonné', 'abonnés')}</span></div>
      ${n && !n.mom && !n.gone ? html`<button type="button" class="linkbtn npc-report" onClick=${() => reportNpc(g, n)} disabled=${!!n.reported}>${n.reported ? 'Compte signalé' : 'Signaler ce compte'}</button>` : null}
    </div>
    ${posts.map((p) => html`<${PostRow} key=${p.id} g=${g} p=${p} now=${now} />`)}
    ${reps.length ? html`<div class="list-h">Ses réponses<span>${reps.length}</span></div>${reps.slice(0, 20).map(({ p, r }) => html`<button class="npc-reply" key=${r.id} onClick=${() => openPost(p.id)}><small>En réponse à @${author(g, p.a).handle}</small><span>${emoParts(r.text)}</span></button>`)}` : null}
    ${!posts.length && !reps.length ? html`<div class="empty"><span>Rien de visible pour l’instant.</span></div>` : null}
  <//>`;
}
function DMBox({ c, g, now }) {
  const [, force] = useState(0);
  const ref = useRef(null);
  useEffect(() => { if (ref.current && window.matchMedia && window.matchMedia('(pointer: fine)').matches) ref.current.focus(); }, []);
  const val = S.drafts.dm[c.id] || '';
  const e = energyNow(g, now);
  const busy = dmBusy(c.id); // (0.28.1: only this conversation waits for its answer)
  const can = !!val.trim() && !busy && canAfford(g, 'dm');
  const first = firstName(c);
  const adv = isMain(c) && !!(S.drafts.adv && S.drafts.adv[c.id]); // « 💡 Conseil »: the message is advice
  const setAdv = (on) => { S.drafts.adv = S.drafts.adv || {}; S.drafts.adv[c.id] = on; force((x) => x + 1); if (ref.current) ref.current.focus(); };
  // 0.18: confiding one of the player's secrets (the message is prefilled; the player may rewrite it)
  const confId = S.drafts.conf && S.drafts.conf[c.id];
  const conf = confId ? secretOf(g, confId) : null;
  const setConf = (sc) => {
    S.drafts.conf = S.drafts.conf || {};
    S.drafts.conf[c.id] = sc ? sc.id : null;
    if (sc) { const pre = `Je te confie un truc, ça reste entre nous : ${sc.t}`; S.drafts.dm[c.id] = pre; if (ref.current) { ref.current.value = pre; ref.current.focus(); autosize(ref.current); } }
    force((x) => x + 1);
  };
  const send = async () => {
    const text = (S.drafts.dm[c.id] || '').trim();
    if (!text || dmBusy(c.id)) return;
    const advice = adv, confide = conf && !conf.out ? conf.id : null;
    S.drafts.dm[c.id] = '';
    if (ref.current) ref.current.style.height = '';
    force((x) => x + 1);
    const ok = await sendDM(c.id, text, { advice, confide });
    if (ok === false) { S.drafts.dm[c.id] = text; force((x) => x + 1); }
    else {
      if (advice && S.drafts.adv) S.drafts.adv[c.id] = false;
      if (confide && S.drafts.conf) S.drafts.conf[c.id] = null;
      force((x) => x + 1);
    }
  };
  // 0.28: a present, bought now and given in the conversation (they react to it, their way)
  const [gift, setGift] = useState(null);
  const cash = Math.floor(num(g.career && g.career.cash, 0)), gWhat = gift ? str(gift.what, 60) : '', gPrice = gift ? Math.round(num(gift.price, 0)) : 0;
  const giftWhy = !gift ? '' : !gWhat ? 'Écris ce que tu offres.' : !(gPrice >= 1) ? 'Choisis un prix.' : gPrice > cash ? `Il te manque ${fmtMoney(g, gPrice - cash)}.` : busy ? `${first} est en train de te répondre…` : !canAfford(g, 'dm') ? 'Budget IA épuisé pour aujourd’hui.' : '';
  const giveNow = async (what, price) => { setGift(null); const ok = await sendDM(c.id, '🎁 Je t’offre : ' + what, { gift: { what, price } }); if (ok === false) setGift({ what, price }); };
  const give = () => {
    if (giftWhy) return;
    const what = gWhat, price = gPrice;
    if (price > 1000 || price > cash / 2) askConfirm({ title: `Offrir « ${what} » à ${first} ?`, text: `${fmtMoney(g, price)}. Il te restera ${fmtMoney(g, cash - price)}.`, ok: 'Offrir', run: () => giveNow(what, price) });
    else giveNow(what, price);
  };
  const [left, cancel, arm] = useAutoSend('dm:' + c.id, val, can, send);
  const em = useEmoji('dm:' + c.id, ref, () => S.drafts.dm[c.id] || '', (v) => { S.drafts.dm[c.id] = v; force((x) => x + 1); if (ref.current) autosize(ref.current); }, DM_MAX); // 0.17
  return html`<div>
    <${AutoSendBar} left=${left} cancel=${cancel} />
    <div class="foot-tools"><${WriteBtn} w=${{ kind: 'dm', key: 'dm:' + c.id, c, draft: val.trim(), advice: adv }} onText=${(t) => { S.drafts.dm[c.id] = t; update(false); if (ref.current) { ref.current.value = t; ref.current.focus(); autosize(ref.current); } }} /><${VoiceChip} />${em.btn}<${ConfideChip} g=${g} c=${c} onPick=${setConf} />${isMain(c) ? html`<button type="button" class=${'voice-chip adv-toggle' + (adv ? ' on' : '')} aria-pressed=${adv ? 'true' : 'false'} onClick=${() => setAdv(!adv)}><${Icon} n="bulb" s=${14} /> Conseil</button>` : null}${isMain(c) && !c.cut ? html`<button type="button" class=${'voice-chip gift-toggle' + (gift ? ' on' : '')} aria-pressed=${gift ? 'true' : 'false'} onClick=${() => setGift(gift ? null : { what: '', price: 100 })}><span aria-hidden="true">🎁</span> Cadeau</button>` : null}<span>${canAfford(g, 'dm') ? `≈ ${costLabel(g, 'dm')} ${plural(costLabel(g, 'dm'), 'café', 'cafés')} par message${e.unlimited ? '' : ` · il t’en reste ${fmtCafes(e.left)}`}` : html`Budget IA épuisé ·<button class="linkbtn" onClick=${budgetBlocked}>options</button>`}</span></div>
    ${adv ? html`<div class="voice-hint adv-hint"><${Icon} n="bulb" s=${15} /><span>Ton message est un conseil : ${first} décide de le suivre ou non. ${adviceHint(c)}</span></div>` : null}
    ${c.cut ? html`<div class="voice-hint cut-hint"><span aria-hidden="true">🚫</span><span>${first} a coupé les ponts : tes messages ne lui parviennent plus.</span></div>` : null}
    ${conf && !conf.out ? html`<div class="voice-hint conf-hint"><span aria-hidden="true">🤫</span><span>Tu confies à ${first} : « ${str(conf.t, 80)} ». ${first} saura. Ce qu’${gx(c.g, 'il', 'elle', 'iel')} en fera, c’est son choix.</span><button type="button" class="iconbtn" onClick=${() => setConf(null)} aria-label="Ne plus confier ce secret"><${Icon} n="x" s=${15} /></button></div>` : null}
    ${em.panel}
    ${gift ? html`<div class="gift-sheet">
      <div class="gift-h"><b>🎁 Un cadeau pour ${first}</b><button type="button" class="iconbtn" onClick=${() => setGift(null)} aria-label="Fermer le cadeau"><${Icon} n="x" s=${16} /></button></div>
      <input class="input" maxlength="60" aria-label="Ce que tu offres" placeholder="Ce que tu offres (un bouquet de pivoines, un week-end à la mer…)" value=${gift.what} onInput=${(ev) => setGift(Object.assign({}, gift, { what: ev.target.value }))} />
      <div class="gift-prices" role="group" aria-label="Le prix">${[30, 100, 300, 1000, 3000].map((p) => html`<button type="button" key=${p} class=${'chip-btn' + (gPrice === p ? ' on' : '')} onClick=${() => setGift(Object.assign({}, gift, { price: p }))}>${fmtMoney(g, p)}</button>`)}
        <label class="gift-own">ou <input class="input" type="text" inputmode="numeric" maxlength="15" aria-label=${'Ton prix, en ' + (WORLD_MONEY[g.world.preset] ? WORLD_MONEY[g.world.preset].sym : 'euros')} value=${gift.price} onInput=${(ev) => { const v = String(ev.target.value).replace(/\D/g, '').slice(0, 15); if (ev.target.value !== v) ev.target.value = v; setGift(Object.assign({}, gift, { price: v })); }} /> ${WORLD_MONEY[g.world.preset] ? WORLD_MONEY[g.world.preset].sym : '€'}</label></div>
      <div class="gift-foot"><small class="muted">Il te reste ${fmtMoney(g, cash)}. ${first} réagit à sa façon.</small><button type="button" class="btn btn-hot btn-sm" disabled=${!!giftWhy} onClick=${give}>Offrir${gPrice >= 1 ? ' · ' + fmtMoney(g, gPrice) : ''}</button></div>
      ${giftWhy ? html`<small class="why-off">${giftWhy}</small>` : null}
    </div>` : null}
    <div class=${'reply-box' + (adv ? ' adv' : '')}>
      <textarea ref=${ref} id=${'dm-' + c.id} rows="1" maxlength=${DM_MAX} placeholder=${adv ? `Ton conseil à ${first}…` : 'Message à ' + first + '…'} value=${val}
        onInput=${(ev) => { arm(); S.drafts.dm[c.id] = ev.target.value; autosize(ev.target); force((x) => x + 1); }}
        onKeyDown=${(ev) => { if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); send(); } }}></textarea>
      <button class="send" onClick=${send} disabled=${!can} aria-label="Envoyer"><${Icon} n="send" s=${16} /> Envoyer</button>
    </div>
  </div>`;
}
/* 0.31.3: a message received, and the emoji the player puts on it: a button on hover (a computer), a long press or, for
   ❤️, a double tap (a phone). Whoever wrote it sees it (their AI reads it in the conversation). */
function ReactBubble({ m, cls, who, children }) {
  const [open, setOpen] = useState(false), [below, setBelow] = useState(false);
  const wrap = useRef(null), press = useRef(null), tap = useRef(0), start = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const off = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', off, true);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', off, true); document.removeEventListener('keydown', esc); };
  }, [open]);
  const show = () => { const el = wrap.current, top = el ? el.getBoundingClientRect().top : 999, head = el && el.closest('.layer') ? el.closest('.layer').getBoundingClientRect().top : 0; setBelow(top - head < 130); setOpen(true); };
  const pick = (e) => { setOpen(false); setReact(S.game, m, e, who); };
  const cancel = () => { if (press.current) { clearTimeout(press.current); press.current = null; } };
  const down = (ev) => {
    if (ev.pointerType === 'mouse') return;
    start.current = [ev.clientX, ev.clientY];
    cancel();
    press.current = setTimeout(() => { press.current = null; tap.current = 0; show(); try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { /* (no vibration) */ } }, 450);
  };
  const move = (ev) => { if (press.current && start.current && Math.hypot(ev.clientX - start.current[0], ev.clientY - start.current[1]) > 10) cancel(); };
  const up = (ev) => {
    if (ev.pointerType !== 'touch') { cancel(); return; }
    const was = !!press.current; // (a long press already opened the choice: no tap)
    cancel();
    if (!was || open) return;
    const t = Date.now();
    if (t - tap.current < 320) { tap.current = 0; if (m.rx !== '❤️') pick('❤️'); } else tap.current = t;
  };
  const r = MSG_REACTS.find(([e]) => e === m.rx); // (m.rx: m.r already marks a reply)
  return html`<div ref=${wrap} class=${'react-wrap' + (m.rx ? ' has-r' : '') + (open ? ' open' : '')}
    onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${cancel} onContextMenu=${(ev) => { if (ev.pointerType === 'touch' || open || (ev.nativeEvent && ev.nativeEvent.pointerType === 'touch')) ev.preventDefault(); }}>
    <div class=${cls}>${children}</div>
    <button type="button" class="react-btn" aria-label="Réagir à ce message" aria-expanded=${open ? 'true' : 'false'} onClick=${() => (open ? setOpen(false) : show())}><${Icon} n="smile" s=${17} /></button>
    ${m.rx ? html`<button type="button" class="react-badge" onClick=${() => (open ? setOpen(false) : show())} aria-label=${`Ta réaction : ${r ? r[1] : m.rx}. La changer`}>${emoParts(m.rx, 'rb')}</button>` : null}
    ${open ? html`<div class=${'react-pick' + (below ? ' below' : '')} role="menu" aria-label="Réagir">${MSG_REACTS.map(([e, label]) => html`<button type="button" key=${e} role="menuitemradio" aria-checked=${m.rx === e ? 'true' : 'false'} class=${m.rx === e ? 'on' : ''} onClick=${() => pick(e)} aria-label=${m.rx === e ? label + ' (retirer)' : label} title=${label}>${emoParts(e, 'rp' + e)}</button>`)}</div>` : null}
  </div>`;
}
function DMLayer({ l, g, now, i }) {
  const c = g.chars[l.id];
  const convo = g.dms[l.id];
  const msgs = convo ? convo.msgs.filter((m) => m.at <= now) : [];
  const typing = dmBusy(l.id) || !!(convo && convo.msgs.some((m) => m.at > now && m.at - now < 60000)); // (an answer hours away is not « typing » yet)
  const ref = useRef(null);
  useEffect(() => {
    if (convo) convo.readAt = Math.max(convo.readAt || 0, Date.now());
    const el = ref.current && ref.current.closest('.layer-body');
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length, typing]);
  if (!c) return null;
  const au = author(g, 'c:' + c.id);
  const last = msgs[msgs.length - 1];
  const seenShown = !!(last && last.me && convo.seenAt && convo.seenAt >= last.at && now >= convo.seenAt);
  const lost = !!(c.cut && last && last.me && last.at >= c.cut.at); // 0.15: they cut ties
  // 0.15: once per game, in the first conversation where someone answers: proposing to meet exists (no button for it)
  if (!g.tipDate && isMain(c) && !c.cut && msgs.some((m) => !m.me && m.text) && !(g.events || []).some((e) => e.player)) { g.tipDate = { c: c.id, at: now }; S.tipLayer = l.key; }
  const tip = !!(g.tipDate && !g.tipDate.done && S.tipLayer === l.key);
  return html`<${LayerShell} i=${i} title=${c.name}
    head=${html`<button class="who" onClick=${() => openChar(c.id)}><${Avatar} who=${au} size=${36} /><div><b>${c.name}${t32On() && onlineNow(g, c, now) ? html`<i class="on-dot" title="En ligne" aria-label="en ligne"></i>` : null}</b><span>${isMain(c) ? `${relShown(c)} · ${fmtRel(c.rel)}${vibeTag(c)} · confiance ${trustOf(c)}${inBadBuzz(c, now) ? ' · ' + bbWord(c) : ''}` : c.role}</span></div></button>`}
    foot=${html`<${DMBox} c=${c} g=${g} now=${now} />`}>
    <div class="bubbles" ref=${ref}>
      <div class="dm-intro"><${Avatar} who=${au} size=${64} /><b>${c.name}</b><span>@${c.handle}${c.role ? ' · ' + c.role : ''}</span><span>${c.kind === 'brand' ? 'Un contact pro : parle chiffres, négocie, demande un devis.' : c.kind === 'cand' ? 'Une candidature : pose tes questions, négocie son tarif.' : 'Ce qui se dit ici reste entre vous… en principe. Une capture est vite faite.'}</span></div>
      ${convo && (convo.trimmed || convo.msgs.length >= 60) ? html`<div class="dm-trim">Seuls les 60 derniers messages sont gardés.</div>` : null}
      ${msgs.map((m, k) => m.sys === 'tdeal' ? (msgs.slice(k + 1).some((x) => x.sys === 'tdeal' && x.tdeal === m.tdeal && !!x.talent === !!m.talent) ? html`<div key=${m.id} class="dm-card dl-old"><span class="evt-kind">📄 Proposition remplacée par la suivante</span></div>` : html`<${TdealCard} key=${m.id} g=${g} d=${tdealOf(g, m.tdeal)} now=${now} inDM=${true} talentView=${!!m.talent} />`) // 0.31: a contract for a talent
        : m.sys === 'deal' ? (msgs.slice(k + 1).some((x) => x.sys === 'deal' && x.deal === m.deal) ? html`<div key=${m.id} class="dm-card dl-old"><span class="evt-kind">📄 Proposition remplacée par la suivante</span></div>` : html`<${DealCard} key=${m.id} g=${g} d=${dealOf(g, m.deal)} now=${now} inDM=${true} />`) : m.sys === 'advice' ? html`<${AdviceCard} key=${m.id} m=${m} />` : m.sys === 'invite' ? html`<${InviteCard} key=${m.id} g=${g} m=${m} now=${now} />`
        : m.sys === 'visit' ? html`<div key=${m.id} class=${'dm-card visit ' + (MOODS[m.mood] && MOODS[m.mood].good ? 'top' : MOODS[m.mood] && MOODS[m.mood].bad ? 'flop' : 'mid')}><span class="evt-kind">🚪 Visite surprise</span>${m.title ? html`<b>${m.title}</b>` : null}<p>${m.text}</p></div>`
        : m.sys === 'file' ? html`<${FileCard} key=${m.id} m=${m} />` // 0.23: a file sent for an order (role-play)
        : m.sys === 'job' ? html`<${JobCard} key=${m.id} g=${g} c=${c} m=${m} />`
        : m.sys === 'buy' ? html`<${BuyCard} key=${m.id} g=${g} m=${m} />` // 0.24: something paid in the conversation
        : m.me && m.gift ? html`<div key=${m.id} class="dm-card gift mine"><span class="evt-kind">🎁 Ton cadeau à ${firstName(c)}</span><p>${m.gift.what}</p><small class="muted">${fmtMoney(g, m.gift.price)}</small></div>` // 0.28: a present from the player
        : m.sys === 'gift' ? html`<div key=${m.id} class="dm-card gift"><span class="evt-kind">🎁 Un cadeau pour toi</span><p>${m.text.replace(/^🎁\s*/, '')}</p><small class="muted">Dans ton inventaire.</small></div>` // 0.26
        : m.sys === 'leak' ? html`<${LeakCard} key=${m.id} g=${g} m=${m} />` // 0.29: a group without the player
        : m.sys === 'fade' ? html`<div key=${m.id} class="dm-fade"><i>${m.text}</i><small>Un peu plus tard…</small>${k === msgs.length - 1 && !typing ? html`<small class="dm-fade-hint">À toi de reprendre la conversation.</small>` : null}</div>` // 0.30: the scene cut (0.31: and who speaks next, if they did not)
        : m.sys === 'morning' ? html`<div key=${m.id} class="dm-card morning"><span class="evt-kind">🌅 Le lendemain matin · ${m.where === 'p' ? 'chez toi' : 'chez ' + firstName(c)}</span><p>${m.text}</p></div>` // 0.25.3
        : m.sys ? html`<div key=${m.id} class=${'dm-card ' + (m.sys === 'cancel' ? 'cancel' : m.tier || '')}>
          <span class="evt-kind">${m.sys === 'cancel' ? '❌ Rendez-vous annulé' : m.dk === 'wedding' ? '💒 Le grand jour · ' + (m.tier === 'flop' ? 'tout a mal tourné' : 'vous vous êtes dit oui') : (MEET[m.mk] || MEET.love).emoji + ' Rendez-vous · ' + (m.tier === 'top' ? 'réussi' : m.tier === 'mid' ? 'mitigé' : 'raté')}</span>
          <b>${m.title}</b><p>${m.text}</p>${m.sys === 'rdv' && dateLogFor(g, c.id, m) ? html`<button class="linkbtn dlog-open" onClick=${() => openLayer({ t: 'datelog', id: dateLogFor(g, c.id, m).id })}>Relire la soirée</button>` : null}</div>`
        : html`${m.story ? html`<div key=${m.id + 's'} class=${'dm-story ' + (m.me ? 'me' : 'them')}>${m.me ? 'Tu as répondu à sa story' : 'A répondu à ta story'} : « ${m.story.text} »</div>` : null}${m.me ? html`<div key=${m.id} class=${'bubble me' + (m.adv ? ' adv' : '') + (m.sec ? ' conf' : '') + (!m.adv && !m.sec && emoOnly(m.text) ? ' jumbo' : '')}>${m.adv ? html`<span class="adv-tag"><${Icon} n="bulb" s=${12} /> Conseil</span>` : null}${m.sec ? html`<span class="adv-tag">${emoParts('🤫', 'cf')} Confidence</span>` : null}${emoParts(m.text)}</div>`
          : html`<${ReactBubble} key=${m.id} m=${m} who=${c} cls=${'bubble them' + (emoOnly(m.text) ? ' jumbo' : '')}>${emoParts(m.text)}<//>`}`)}
      ${seenShown && !typing && !lost ? html`<div class="seen-tag">Vu</div>` : null}
      ${!seenShown && !typing && !lost && convo && convo.due && last && last.me ? html`<div class="seen-tag sent">Envoyé</div>` : null}
      ${lost ? html`<div class="seen-tag lost">Non distribué</div>` : null}
      ${typing ? html`<div class="bubble them typing-b" aria-label=${c.name + ' écrit'}><${Typing} /></div>` : null}
      ${stayOn(g, now) && g.stay.c === c.id ? html`<${StayLine} g=${g} />` : null}
      ${tip && !typing ? html`<div class="date-tip"><span aria-hidden="true">💡</span><p>Quand le courant passe, tu peux proposer de vous voir (un café, une sortie, un tournage ensemble) : écris-le simplement, comme à quelqu’un de vrai.</p><button type="button" class="iconbtn" onClick=${() => { g.tipDate.done = true; update(false); }} aria-label="Fermer l’astuce"><${Icon} n="x" s=${15} /></button></div>` : null}
      ${activeEvents(g).filter((e) => e.c === c.id && (e.player || (e.src && e.src.dm === c.id))).map((ev) => html`<${EventChip} key=${ev.id} g=${g} ev=${ev} now=${now} />`)}
      ${isMain(c) && plannedAdvice(g, c) && !typing ? html`<${AdviceChip} g=${g} a=${plannedAdvice(g, c)} now=${now} />` : null}
    </div>
  <//>`;
}
// A character asks the player out (0.9.4): accept puts it on the agenda, decline answers politely; no answer, no blame.
// 0.28.1: a moment gone by, for people: « aujourd’hui 20 h 30 », « hier 20 h 30 », « mardi 20 h 30 », « le 12 octobre »
function fmtPast(ts, now = Date.now()) {
  const days = -dayDiff(ts, now), d = gameDate(ts);
  if (days <= 0) return 'aujourd’hui ' + hourOf(ts);
  if (days === 1) return 'hier ' + hourOf(ts);
  if (days < 7) return d.toLocaleDateString('fr-FR', { weekday: 'long' }) + ' ' + hourOf(ts);
  return `le ${d.getDate() === 1 ? '1er' : d.getDate()} ${MONTHS[d.getMonth()]}`;
}
const INVITE_DONE = { accepted: ['✅ Invitation acceptée', 'top'], declined: ['Invitation déclinée', 'past'], expired: ['Invitation restée sans réponse', 'past'], replaced: ['Remplacée par un autre rendez-vous', 'past'], off: ['Invitation sans suite', 'past'] };
function InviteCard({ g, m, now }) {
  const iv = inviteOf(g, m.inv);
  const c = iv && g.chars[iv.c];
  if (!iv || !c) return null;
  const late = iv.state === 'open' && now > iv.due - 5 * 60000;
  const open = iv.state === 'open' && !late;
  const [label, cls] = open ? [iv.collab ? `🎬 ${firstName(c)} te propose de tourner ensemble` : `${MEET[meetKind(c, iv)].emoji} ${firstName(c)} te propose de vous voir`, 'invite'] : iv.state === 'accepted' && iv.rl ? ['✅ Collab acceptée : elle t’attend dans le Studio', 'top'] : INVITE_DONE[late ? 'expired' : iv.state] || INVITE_DONE.off;
  const clash = open ? activeEvents(g).find((e) => e.player && Math.abs(e.due - iv.due) < 90 * 60000) : null;
  const cc = clash && g.chars[clash.c];
  const foe = open && iv.collab ? collabFoe(g, c) : null; // 0.18: a collab someone close to the player will not like
  const accept = () => { const x = acceptInvite(g, iv); if (!x) toast('Impossible de l’ajouter à ton agenda : il est peut-être plein, ou ce rendez-vous y est déjà.', 'bad'); else if (iv.rl) toast(`🎬 Votre vidéo à deux est programmée ${fmtWhen(iv.due)} : elle t’attend dans le Studio.`, 'good'); update(); };
  return html`<div class=${'dm-card ' + cls}>
    <span class="evt-kind">${label}</span>
    <b>${iv.what}</b>
    <p>${cap1(iv.due <= now ? fmtPast(iv.due, now) : fmtWhen(iv.due, now))}${cc ? ` · tu as déjà un rendez-vous avec ${firstName(cc)} à ce moment-là` : ''}</p>
    ${foe ? html`<p class="collab-foe">💔 ${firstName(foe)} ne supporte pas ${firstName(c)} : ça risque de mal passer.</p>` : null}
    ${open ? html`<div class="inv-acts"><button class="btn btn-hot btn-sm" onClick=${accept}><${Icon} n="calendar" s=${14} /> Accepter</button><button class="btn btn-ghost btn-sm" onClick=${() => { declineByButton(g, iv); update(); }}>Décliner</button></div>` : null}
  </div>`;
}
// 0.28.1: a post's limit, in characters as they are seen (an emoji is one): what the counter says is what is kept
const POST_MAX = 280;
const postCut = (v) => { const s = String(v || ''); if (s.length <= POST_MAX) return s; const gs = graphemes(s); return gs.length > POST_MAX ? gs.slice(0, POST_MAX).join('') : s; };
// Placeholders of the fake proof form, per kind.
const FAKE_HINTS = {
  dm: (c) => `ex : @${c.handle} qui écrit « personne doit savoir, efface ce message »`,
  photo: (c, f) => `ex : ${f} qui sort en douce d’un endroit interdit, à 2 h du matin`,
  vocal: (c, f) => `ex : la voix de ${f} qui dit « j’ai triché, et alors ? »`,
  temoin: (c, f) => `ex : quelqu’un affirme avoir vu ${f} mentir à tout le monde`,
};
/* ---------- 0.31.2: « Faire une vidéo à partir de ce post » ----------
   The player ticks it, never the game: the post becomes the announcement of a video (a short, a live…) that starts with
   the post's own topic, at a moment the player picks. Unticked, a post never launches anything, whatever it says. When
   the post talks of a video, the box shows it, still unticked. */
const VID_TALK_RE = /(?<![\p{L}\d])(vid[ée]os?|vlogs?|lives?|streams?|shorts?|tik ?toks?|reels?|clips?|podcasts?|[ée]pisodes?)(?![\p{L}\d])/iu;
const ANN_WHEN_RE = /\s*(?<![\p{L}\d])(?:un (?:beau )?jour|un de ces (?:jours|quatre)|ce soir|cette nuit|apr[èe]s[- ]demain|demain(?: soir| matin| midi)?|tout [àa] l['’]heure|bient[ôo]t|aujourd['’]hui|ce (?:week-?end|matin|midi)|cette semaine|(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(?: soir| matin| prochain)?|dans (?:\d{1,3}|une?|quelques) ?(?:h|heures?|min(?:utes?)?|mn|jours?)|(?:(?:[àa]|vers|d[èe]s|de) )?\d{1,2} ?h(?: ?\d\d)?)(?![\p{L}\d])/giu;
const ANN_VERB_RE = /\s+(?:sort(?:ira)?|sortent|arrive(?:ra)?|tombe(?:ra)?|d[ée]barque(?:ra)?|(?:est|sera) en ligne|dispo(?:nible)?)(?=\s*(?:[!?.…]|$))/giu;
const ANN_LEAD_RE = /^(?:(?:(?:ma|mon|notre)\s+(?:(?:nouvelle|nouveau|nouvel|prochaine?|petite?|grosse?)\s+)?|(?:nouvelle|nouveau|nouvel|prochaine?)\s+)(?:vid[ée]o|vlog|live|stream|short|tik ?tok|reel|clip|podcast|[ée]pisode)(?![\p{L}\d])\s*(?:(?:sur|de|du|:|–|-)(?![\p{L}\d])\s*)*|(?:vid[ée]o|vlog|live|stream|short|tik ?tok|reel|clip|podcast)(?![\p{L}\d])\s*(?:(?:sur|:|–|-|,)(?![\p{L}\d])\s*)+)/iu;
// The topic it starts with: the post's words, without « ce soir à 21 h » nor « ma vidéo… sort » (the player changes it).
function annTopic(text) {
  const t = String(text || '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
  let x = t.replace(ANN_WHEN_RE, '').replace(/\s{2,}/g, ' ').trim().replace(/^[,;:–-]+\s*/, '');
  x = x.replace(ANN_VERB_RE, '').replace(ANN_LEAD_RE, '').replace(/\s*[,;:–-]+\s*$/, '').trim();
  return wordCut(cap1(x.length >= 8 ? x : t), 80);
}
const up5 = (ts) => { const d = gameDate(ts), r = (d.getMinutes() % 5) * 60000 + d.getSeconds() * 1000 + d.getMilliseconds(); return r ? ts - r + 300000 : ts; };
// The moments it offers (when it comes out; a live: when it starts): the one the post says, then in 1 h (or as soon as
// it can be made), tonight, tomorrow. D: the time it takes. Only the post's own moment can be too soon (its words).
function annMoments(text, D = 0, t = Date.now()) {
  const out = [], add = (k, at) => { if (!out.some((m) => Math.abs(m.at - at) < 5 * 60000)) out.push({ k, at }); };
  const pw = postWhen(text);
  if (pw != null) add('post', t + pw * 60000);
  add('h1', D > 3600000 ? up5(t + D) : t + 3600000);
  const soir = dayDue(0, 21, t);
  if (soir > t + Math.max(90 * 60000, D + 15 * 60000)) add('soir', soir);
  add('dem', dayDue(1, 18, t));
  return out;
}
const annLabel = (m, D, t = Date.now()) => (m.k === 'post' ? `Comme ton post : ${fmtWhen(m.at, t)}` : m.k === 'h1' ? (D > 3600000 ? `Au plus vite (${hourOf(m.at)})` : 'Dans 1 h') : cap1(fmtWhen(m.at, t)));
// What the box says right now (null when unticked): what the player picked, or else what the post says.
function annResolve(g, p, text, alt = '', t = Date.now()) {
  if (!p || !p.on) return null;
  const P = PF(g), src = String(text || alt || '');
  const kw = VID_TALK_RE.exec(src), guess = kw ? normWhat(kw[1]) : P.main;
  const what = p.what && P.fmts.includes(p.what) ? p.what : makeableWhat(g, P.fmts.includes(guess) && canMake(g, guess, t).ok ? guess : P.main);
  const team = teamOf(g, what), D = what === 'live' ? 0 : Math.round(prodH(what, false, team) * 3600000);
  const ms = annMoments(src, D, t);
  const m = ms.find((x) => x.k === p.when) || ms.find((x) => x.k === 'post') || ms[0];
  const mains = mentionedChars(g, src).filter((c) => isMain(c) && c.unlocked).slice(0, 4);
  const about = p.about != null ? (mains.some((c) => c.handle === p.about) ? p.about : '') : mains.length === 1 ? mains[0].handle : '';
  return { what, at: m.at, when: m.k, topic: p.topic != null ? p.topic : annTopic(src), about, D, team, ms, mains, late: what !== 'live' && m.at < t + D - 60000 };
}
// Why it cannot go as it is ('' when it can).
function annWhy(g, A, t = Date.now()) {
  if (!A) return '';
  if (!planRoom(g)) return `${MAX_PLANNED} sorties prévues, c’est le maximum : publie-en une d’abord.`;
  if (suspended(g, t)) return 'Ta chaîne est suspendue : rien ne peut sortir pour l’instant.';
  const can = canMake(g, A.what, t);
  if (!can.ok) return can.why;
  if (str(A.topic, 100).length < 3) return `Écris le sujet de ${laW({ what: A.what, noun: A.what === 'short' ? PF(g).shortName : '' })}.`;
  return '';
}
function AnnBox({ g, text, alt, set }) {
  const p = S.drafts.plan || null, on = !!(p && p.on), t = Date.now();
  const P = PF(g), noun = (w) => (w === 'short' ? P.shortName : w);
  const off = !on && (!planRoom(g) || suspended(g, t));
  const talk = VID_TALK_RE.test(String(text || ''));
  const A = on ? annResolve(g, p, text, alt, t) : null;
  const tick = (v) => { S.drafts.plan = v ? { on: true, what: null, when: null, topic: null, about: null } : null; set(); if (v) setTimeout(() => { const el = byId('ann-topic'); if (el && !el.value) el.focus(); }, 40); }; // (unticked: what was picked goes)
  const pick = (k, v) => { S.drafts.plan = Object.assign({}, S.drafts.plan, { [k]: v }); set(); };
  const r = A ? { what: A.what, noun: A.what === 'short' ? P.shortName : '' } : null;
  const same = A ? sameRelease(g, makeableWhat(g, A.what), A.at) : null;
  const why = A ? annWhy(g, A, t) : '';
  const note = !A ? '' : same ? `📣 Tu as déjà ${ta(same)} « ${wordCut(same.topic, 40)} » ${fmtWhen(relAnn(same), t)} : ce post l’annoncera, sans en faire ${whatF(same) ? 'une deuxième' : 'un deuxième'}.`
    : A.what === 'live' ? `🔴 Le live commence ${fmtWhen(A.at, t)} (il dure ${prodWord('live')}).`
      : A.late ? `⚠️ Il te faut ${hWord(A.D / 3600000)} de travail : ${whatF(r) ? 'annoncée' : 'annoncé'} ${fmtWhen(A.at, t)}, ${whatF(r) ? 'elle' : 'il'} sortira en retard, vers ${hourOf(t + A.D)}.`
        : `⏱️ ${hWord(A.D / 3600000)} de travail${A.team ? ' ' + teamWord(A.team) : ''} : tu tournes ${fmtWhen(A.at - A.D, t)} pour une sortie ${fmtWhen(A.at, t)}.`;
  return html`<div class="ann-wrap">
    <label class=${'check-card ann-card' + (on ? ' on' : talk && !off ? ' hint' : '') + (off ? ' off' : '')}>
      <input type="checkbox" checked=${on} disabled=${off} onChange=${(e) => tick(e.target.checked)} />
      <span><b>📅 Faire une vidéo à partir de ce post</b><small>${!on && !planRoom(g) ? `${MAX_PLANNED} sorties prévues, c’est le maximum : publie-en une d’abord.`
        : !on && suspended(g, t) ? 'Ta chaîne est suspendue : rien ne peut sortir pour l’instant.'
          : on ? 'Ce post l’annonce : le public va l’attendre.' : talk ? 'Ton post en parle ? Coche si tu veux la faire : ce post sera son annonce.' : 'Ce post sera son annonce, et la vidéo reprendra son sujet.'}</small></span>
    </label>
    ${A ? html`<div class="ann-box">
      <div class="field"><span class="lbl">Format</span><${Seg} items=${P.fmts.map((f) => [f, cap1(noun(f)), !canMake(g, f, t).ok])} value=${A.what} onPick=${(v) => pick('what', v)} label="Format" /></div>
      <div class="field"><span class="lbl">${A.what === 'live' ? 'Quand commence le live ?' : whatF(r) ? 'Quand sort-elle ?' : 'Quand sort-il ?'}</span>
        <div class="tr-chips" role="group" aria-label="Quand">${A.ms.map((m) => html`<button type="button" key=${m.k} class=${'chip-btn' + (A.when === m.k ? ' on' : '')} aria-pressed=${A.when === m.k ? 'true' : 'false'} onClick=${() => pick('when', m.k)}>${annLabel(m, A.D, t)}</button>`)}</div></div>
      <div class="field"><label class="lbl" for="ann-topic">Le sujet</label>
        <input id="ann-topic" class="input" maxlength="80" value=${A.topic} placeholder="ex : je teste les potions du marché noir" onInput=${(ev) => pick('topic', ev.target.value)} /></div>
      ${A.mains.length ? html`<div class="field"><span class="lbl">Au sujet de quelqu’un ?</span>
        <div class="tr-chips" role="group" aria-label="Au sujet de">${[['', 'Personne']].concat(A.mains.map((c) => [c.handle, '@' + c.handle])).map(([h, lb]) => html`<button type="button" key=${h || 'none'} class=${'chip-btn' + (A.about === h ? ' on' : '')} aria-pressed=${A.about === h ? 'true' : 'false'} onClick=${() => pick('about', h)}>${lb}</button>`)}</div>
        <small>Pour prouver ou dénoncer quelque chose sur ${A.mains.length > 1 ? 'l’un d’eux' : gx(A.mains[0].g, 'lui', 'elle', 'iel')}.</small></div>` : null}
      ${why ? html`<small class="ann-note warn">${why}</small>` : html`<small class=${'ann-note' + (A.late && !same ? ' warn' : '')}>${note}</small>`}
    </div>` : null}
  </div>`;
}
function ComposeLayer({ g, now, i }) {
  const [, force] = useState(0);
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.focus(); }, []);
  const d = S.drafts;
  const val = d.post;
  const e = energyNow(g, now);
  const remaining = POST_MAX - graphemes(val).length; // 0.28.1: an emoji counts for one, as the limit itself
  const low = lowActive(g, now);
  const apology = d.apology && (g.stats.cancelled || playerBadBuzz(g, now)); // (0.28.1: in a bad buzz of one's own too)
  const hasPhoto = d.photo != null;
  const seeOn = !!(d.see && S.vision > 0 && (d.pics || []).length); // the characters see the images: no description needed
  const photoOK = hasPhoto && (d.photo.trim().length >= 3 || seeOn);
  const quote = d.quote ? g.posts.find((p) => p.id === d.quote) || null : null;
  const target = d.accuse ? g.chars[d.accuse] || null : null;
  const accuse = !!target && !inBadBuzz(target, now);
  const rumor = !accuse && d.debunk ? (g.rumors || []).find((x) => x.id === d.debunk && x.state === 'live') || null : null; // a denial
  const liar = rumor ? g.chars[rumor.by] || null : null;
  // 0.18: a confession, or the answer to a secret that came out
  const confS = !accuse && !rumor && d.confess ? secretOf(g, d.confess) : null;
  const conf = confS && !confS.out ? confS : null;
  const saS = !accuse && !rumor && d.secAns ? secretOf(g, d.secAns.id) : null;
  const secAns = saS && saS.out && !saS.out.answer && STANCES[d.secAns.stance] ? { s: saS, stance: d.secAns.stance } : null;
  const md0 = !accuse && !rumor && !secAns && !conf && d.merch ? openDrop(g) : null;
  const drop = md0 && md0.id === d.merch && md0.state === 'ready' ? md0 : null; // 0.22: the post launches the merch
  const contest = !accuse && !rumor && !secAns && !conf && !drop && !!d.contest && !(shopOf(g).contest && shopOf(g).contest.state === 'open'); // 0.29: a design contest
  const pfp = !accuse && !rumor && !secAns && !conf && !drop && !contest && hasPhoto && !!d.pfp && (d.pics || []).includes(d.pfp); // 0.25.1: the new profile photo
  const costKind = accuse ? 'accuse' : rumor || secAns ? 'debunk' : 'post';
  const cost = Math.max(1, Math.round(costGuess(g, costKind) + (seeOn ? seeCafes(Math.min(S.vision, d.pics.length)) : 0))); // the images seen cost a little more
  const clues = accuse ? (g.clues || []).filter((k) => k.c === target.id && k.at <= now) : [];
  const first = target ? firstName(target) : '';
  const fk = accuse ? d.fake : null; // a proof the player makes up
  const fakeOK = !fk || fk.desc.trim().length >= 6;
  // 0.29: a poll (2 to 4 choices): only for a plain post, without a photo
  const pollAllowed = !hasPhoto && !accuse && !rumor && !secAns && !conf && !drop && !contest && !pfp && !apology && !quote;
  const pollOn = pollAllowed && Array.isArray(d.poll);
  const pollOpts = pollOn ? d.poll.map((x) => str(x, 40)).filter(Boolean) : [];
  // 0.31.2: « Faire une vidéo à partir de ce post »: a plain post (a photo, a quote too), ticked by the player
  const planAllowed = !accuse && !rumor && !secAns && !conf && !drop && !contest && !pfp && !apology && !pollOn;
  const ann = planAllowed ? annResolve(g, d.plan, val.trim(), hasPhoto ? d.photo : '', now) : null;
  const annBad = ann ? annWhy(g, ann, now) : '';
  const can = (!!val.trim() || photoOK) && (!hasPhoto || photoOK) && !S.busy.act && !low && canAfford(g, costKind) && (!accuse || !!val.replace('@' + target.handle, '').trim()) && fakeOK && !annBad;
  const publish = async () => {
    const D = S.drafts;
    const text = (D.post || '').trim(); // live state, not this render's
    const see = !!(D.see && S.vision > 0 && D.pics && D.pics.length);
    const ph = D.photo != null && (D.photo.trim().length >= 3 || see) ? { desc: D.photo.trim() } : null;
    if (ph && D.pics && D.pics.length) { ph.own = D.pics.slice(); ph.diapo = !!D.diapo && D.pics.length >= 2; if (see) ph.see = true; }
    const fake = D.accuse && D.fake ? { kind: D.fake.kind, desc: D.fake.desc.trim() } : null;
    if ((!text && !ph) || (D.photo != null && !ph) || (fake && fake.desc.length < 6) || S.busy.act || lowActive(S.game)) return;
    const extra = { photo: ph, quote: D.quote, apology: D.apology, debunk: D.accuse ? null : D.debunk, caps: (D.caps || []).slice(), accuse: D.accuse ? { c: D.accuse, clues: D.cite.slice(), fake } : null,
      confess: D.accuse || D.debunk ? null : D.confess || null, secret: D.accuse || D.debunk || !D.secAns ? null : Object.assign({}, D.secAns), // 0.18
      merch: D.accuse || D.debunk || D.confess || D.secAns ? null : D.merch || null, // 0.22
      contest: !!contest, // 0.29
      poll: pollOn && pollOpts.length >= 2 ? { opts: pollOpts } : null, // 0.29: a poll (the post is its question)
      pfp: D.accuse || D.debunk || D.confess || D.secAns || D.merch || !ph || !ph.own || !ph.own.includes(D.pfp) ? null : D.pfp }; // 0.25.1
    const A = planAllowed ? annResolve(S.game, D.plan, text, ph ? ph.desc : '') : null; // 0.31.2: only when the player ticked it
    if (A && annWhy(S.game, A)) { toast(annWhy(S.game, A), 'bad'); return; }
    extra.announce = A ? { what: A.what, topic: str(A.topic, 100), at: A.at, about: A.about } : null;
    const plan0 = D.plan ? Object.assign({}, D.plan) : null;
    Object.assign(S.drafts, { post: '', photo: null, pics: [], diapo: false, see: false, quote: null, apology: false, accuse: null, cite: [], fake: null, debunk: null, caps: [], confess: null, secAns: null, merch: null, pfp: null, contest: false, poll: null, plan: null });
    S.ideas = null;
    dropLayers((l) => l.t === 'compose'); // close this layer, not whatever is on top (0.27.7: nor one put aside)
    goFeedTop();
    update(false);
    const ok = await runAct('post', text, null, null, extra);
    if (ok === false && extra.poll) S.drafts.poll = extra.poll.opts.slice(); // 0.29 (the poll comes back too)
    if (ok === false) { Object.assign(S.drafts, { post: text, photo: ph ? ph.desc : null, pics: ph && ph.own ? ph.own : [], diapo: !!(ph && ph.diapo), see: !!(ph && ph.see), quote: extra.quote, apology: extra.apology, debunk: extra.debunk, caps: extra.caps, accuse: extra.accuse ? extra.accuse.c : null, cite: extra.accuse ? extra.accuse.clues : [], fake: extra.accuse ? extra.accuse.fake : null, confess: extra.confess, secAns: extra.secret, merch: extra.merch, pfp: extra.pfp, contest: !!extra.contest, plan: plan0 }); openCompose(); }
  };
  const toggleCite = (id) => { const c = S.drafts.cite; S.drafts.cite = c.includes(id) ? c.filter((x) => x !== id) : [...c, id]; force((x) => x + 1); };
  const toggleCap = (x) => { const c = S.drafts.caps || []; S.drafts.caps = c.some((y) => y.m === x.m) ? c.filter((y) => y.m !== x.m) : [...c, { c: x.c, m: x.m }].slice(-3); force((n) => n + 1); };
  const setFake = (patch) => {
    S.drafts.fake = patch === null ? null : Object.assign({ kind: 'dm', desc: '' }, S.drafts.fake, patch);
    force((x) => x + 1);
    if (patch && !('desc' in patch)) setTimeout(() => { const el = byId('fake-desc'); if (el) el.focus(); }, 40);
  };
  const pickIdea = (t) => { S.drafts.post = t; force((x) => x + 1); if (ref.current) ref.current.focus(); };
  const mn = useMentions(g, ref, val, (v) => { S.drafts.post = v; force((x) => x + 1); });
  const em = useEmoji('post', ref, () => S.drafts.post || '', (v) => { S.drafts.post = v; force((x) => x + 1); }); // 0.17
  const sorryWait = APOLOGY_COOLDOWN - (now - (g.apologyAt || 0));
  const [left, cancel, arm] = useAutoSend('post', val, can, publish);
  const title = accuse ? `Bad buzz contre ${target.name}` : rumor ? 'Démentir la rumeur' : secAns ? STANCES[secAns.stance].title : conf ? 'Avouer un secret' : apology ? 'Excuses publiques' : drop ? (drop.items.every((p) => MERCH[p.k].book) ? 'Lancer ton livre' : 'Lancer ton merch') : contest ? 'Concours de design' : pfp ? 'Nouvelle photo de profil' : quote ? 'Citer un post' : 'Nouveau post';
  const unMode = (k) => { S.drafts[k] = null; force((x) => x + 1); };
  const setOpt = (k, v) => { S.drafts.poll = d.poll.slice(); S.drafts.poll[k] = v; force((x) => x + 1); };
  const addPhoto = () => { S.drafts.photo = ''; force((x) => x + 1); setTimeout(() => { const el = byId('photo-desc'); if (el) el.focus(); }, 40); };
  return html`<${LayerShell} i=${i} title=${title}
    head=${html`<h2>${title}</h2><button class=${'btn btn-sm ' + (accuse ? 'btn-danger-solid' : 'btn-hot')} onClick=${publish} disabled=${!can}>${accuse ? 'Accuser' : rumor ? 'Démentir' : secAns ? STANCES[secAns.stance].btn : conf ? 'Avouer' : drop ? 'Lancer' : 'Publier'} · ≈ ${cost} <${Icon} n="coffee" s=${15} /></button>`}>
    ${low ? html`<${LowBanner} g=${g} now=${now} compose=${true} />` : null}
    ${accuse ? html`<div class="accuse-hint"><${Icon} n=${fk ? 'mask' : 'megaphone'} s=${16} />${fk
      ? html`<span><b>Tu bluffes.</b> Un faux précis et qui colle à ${first} a plus de chances de passer, surtout glissé parmi de vrais indices.</span>`
      : html`<span><b>Accuse avec des arguments.</b> Si c’est crédible, @${target.handle} prend un bad buzz. Sinon, c’est toi qui passes pour ${px(g, 'un menteur', 'une menteuse', 'un·e menteur·se')}.</span>`}</div>` : null}
    ${apology ? html`<div class="apology-hint"><${Icon} n="shield" s=${16} /><span><b>La sincérité compte.</b> Des excuses sincères font remonter ta réputation, des excuses de façade l’enfoncent.</span></div>` : null}
    ${(g.stats.cancelled || playerBadBuzz(g, now)) && !apology && !accuse && !rumor && !low ? html`<div class="apology-hint cancel-nudge"><${Icon} n="shield" s=${16} /><span>${g.stats.cancelled ? html`<b>Tu es cancel :</b> ce post te coûtera des abonnés. Des excuses sincères peuvent t’en sortir.` : html`<b>Tu es en plein bad buzz.</b> Des excuses sincères peuvent calmer le jeu.`}</span>
      <button type="button" class="btn btn-hot btn-sm" disabled=${sorryWait > 0} onClick=${() => { S.drafts.apology = true; force((x) => x + 1); if (ref.current) ref.current.focus(); }}>${sorryWait > 0 ? 'Excuses dans ' + fmtClock(sorryWait) : 'M’excuser'}</button></div>` : null}
    ${secAns ? html`<div class="accuse-hint secret-hint"><span aria-hidden="true">🤐</span><span><b>« ${secAns.s.t} »</b> ${STANCES[secAns.stance].hint}</span><button type="button" class="iconbtn" onClick=${() => unMode('secAns')} aria-label="Revenir à un post normal"><${Icon} n="x" s=${15} /></button></div>` : null}
    ${conf ? html`<div class="apology-hint secret-hint"><span aria-hidden="true">🤐</span><span><b>Tu avoues : « ${conf.t} »</b> (${sevOf(conf).label.toLowerCase()}). Sincère et assumé, ça coûte bien moins cher que de te faire griller. Pour le buzz, ça passe mal.</span><button type="button" class="iconbtn" onClick=${() => unMode('confess')} aria-label="Revenir à un post normal"><${Icon} n="x" s=${15} /></button></div>` : null}
    ${drop ? html`<div class="apology-hint merch-hint"><span aria-hidden="true">🛍️</span><span><b>Ton post lance ${drop.items.length > 1 ? 'tes produits' : prodYour(drop.items[0])}</b> : ${launchList(g, drop)}. Ce que le public en pense décide des ventes.</span><button type="button" class="iconbtn" onClick=${() => unMode('merch')} aria-label="Revenir à un post normal"><${Icon} n="x" s=${15} /></button></div>` : null}
    ${contest ? html`<div class="apology-hint merch-hint"><span aria-hidden="true">🎨</span><span><b>Ton post lance un concours de design</b> : ta commu te propose des idées en réponse, tu choisis la gagnante dans ta boutique.</span><button type="button" class="iconbtn" onClick=${() => unMode('contest')} aria-label="Revenir à un post normal"><${Icon} n="x" s=${15} /></button></div>` : null}
    ${pfp ? html`<div class="apology-hint pfp-hint"><span aria-hidden="true">📸</span><span><b>Ton post montre ta nouvelle photo de profil.</b> Chacun va réagir à sa façon.</span><button type="button" class="iconbtn" onClick=${() => unMode('pfp')} aria-label="Revenir à un post normal"><${Icon} n="x" s=${15} /></button></div>` : null}
    ${rumor ? html`<div class="accuse-hint"><span aria-hidden="true">🗣️</span><span><b>${liar ? liar.name : 'Quelqu’un'} raconte : « ${rumor.text} »</b> Calme, précis, avec des preuves ou des témoins : ça convainc. Agressif ou vague : la rumeur enfle.</span></div>` : null}
    <div class="composer">
      <${Avatar} who=${author(g, 'p')} />
      <div class="composer-main">
        <textarea ref=${ref} id="compose" placeholder=${accuse ? 'Ce que tu reproches, et pourquoi c’est grave…' : secAns ? STANCES[secAns.stance].ph : conf ? 'Dis-le avec tes mots…' : apology ? 'Explique-toi, sincèrement…' : hasPhoto && d.diapo && (d.pics || []).length >= 2 ? 'Le titre de ton diapo' : hasPhoto ? 'Une légende ? (facultatif)' : quote ? 'Ajoute ton avis…' : 'Quoi de neuf dans ton monde ?'} value=${val}
          onInput=${(ev) => { arm(); const v = postCut(ev.target.value); if (v !== ev.target.value) ev.target.value = v; S.drafts.post = v; force((x) => x + 1); }}
          onClick=${mn.refresh} onKeyUp=${(ev) => { if (/^(Arrow(Left|Right)|Home|End)$/.test(ev.key)) mn.refresh(); }}
          onKeyDown=${(ev) => { if (mn.onKey(ev)) return; if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); publish(); } }}></textarea>
        ${mn.view}
        ${em.panel}
        ${pollOn ? html`<div class="poll-edit">
          <span class="lbl">Sondage · ton post est la question</span>
          ${d.poll.map((o, k) => html`<div class="row" key=${k} style="gap:6px;flex-wrap:nowrap"><input class="input" maxlength="40" placeholder=${'Choix ' + (k + 1)} value=${o} onInput=${(ev) => setOpt(k, ev.target.value)} />${d.poll.length > 2 ? html`<button type="button" class="iconbtn" onClick=${() => { S.drafts.poll = d.poll.filter((_, j) => j !== k); force((x) => x + 1); }} aria-label=${'Retirer le choix ' + (k + 1)}><${Icon} n="x" s=${15} /></button>` : null}</div>`)}
          <div class="row" style="gap:6px">${d.poll.length < 4 ? html`<button type="button" class="linkbtn" onClick=${() => { S.drafts.poll = d.poll.concat(''); force((x) => x + 1); }}>+ Un choix</button>` : null}<button type="button" class="linkbtn" onClick=${() => unMode('poll')}>Retirer le sondage</button></div>
        </div>` : null}
        ${hasPhoto ? html`<div class="photo-input">
          <label for="photo-desc"><${Icon} n="camera" s=${15} /> ${seeOn ? 'Ce qu’on voit (facultatif : les persos voient tes images)' : (d.pics || []).length ? 'Ce qu’on voit (c’est ce que lisent les persos)' : 'Décris ta photo'}</label>
          <div class="row" style="gap:6px;flex-wrap:nowrap">
            <input id="photo-desc" class="input" maxlength="140" placeholder=${seeOn ? 'ex : mon perso, à Tokyo' : (d.pics || []).length ? 'ex : en terrasse avec mes potes' : 'ex : mon café renversé sur ma veste'} value=${d.photo} onInput=${(ev) => { S.drafts.photo = ev.target.value; force((x) => x + 1); }} />
            <button type="button" class="iconbtn" onClick=${() => { S.drafts.photo = null; for (const id of S.drafts.pics || []) mediaDel(id); markDrafts(null, S.drafts.pics || []); S.drafts.pics = []; S.drafts.diapo = false; S.drafts.see = false; S.drafts.pfp = null; force((x) => x + 1); }} aria-label="Retirer la photo"><${Icon} n="x" s=${16} /></button>
          </div>
          <${PicsBox} />
        </div>` : null}
        ${photoOK && !(d.pics || []).length ? html`<${PhotoCard} ph=${{ desc: d.photo.trim(), emoji: photoEmoji(d.photo) }} hue=${g.player.hue} />` : null}
        ${quote ? html`<div class="quote-wrap"><${QuoteCard} g=${g} q=${{ id: quote.id, a: quote.a, text: quote.text, photo: quote.photo || null }} /><button type="button" class="iconbtn quote-x" onClick=${() => { S.drafts.quote = null; force((x) => x + 1); }} aria-label="Ne plus citer ce post"><${Icon} n="x" s=${15} /></button></div>` : null}
        ${planAllowed ? html`<${AnnBox} g=${g} text=${val.trim()} alt=${hasPhoto ? d.photo : ''} set=${() => force((x) => x + 1)} />` : null}
        ${accuse ? (clues.length ? html`<div class="cite-list"><span class="lbl">Preuves à citer</span>${clues.map((k) => html`<label key=${k.id} class="cite"><input type="checkbox" checked=${d.cite.includes(k.id)} onChange=${() => toggleCite(k.id)} /><span>${k.text}</span></label>`)}</div>`
          : html`<p class="muted cite-none">Aucun indice dans ton dossier sur ${target.name} : ton accusation ne reposera que sur tes arguments.</p>`) : null}
        ${accuse ? html`<${CapturePicker} g=${g} target=${target} sel=${d.caps || []} onToggle=${toggleCap} />` : null}
        ${rumor && liar ? html`<${CapturePicker} g=${g} target=${liar} sel=${d.caps || []} onToggle=${toggleCap} />` : null}
        ${accuse ? html`<div class=${'fake-box' + (fk ? ' on' : '')}>
          ${fk ? html`<div class="fake-h"><span><${Icon} n="mask" s=${15} /> <b>Fausse preuve</b></span><button type="button" class="iconbtn" onClick=${() => setFake(null)} aria-label="Retirer la fausse preuve"><${Icon} n="x" s=${15} /></button></div>
            <div class="fake-kinds" role="radiogroup" aria-label="Type de fausse preuve">${Object.keys(EV_KINDS).map((k) => html`<button type="button" key=${k} role="radio" aria-checked=${fk.kind === k ? 'true' : 'false'} class=${'vibe-opt' + (fk.kind === k ? ' on' : '')} onClick=${() => setFake({ kind: k })} aria-label=${EV_KINDS[k].label}>${EV_KINDS[k].emoji} ${EV_KINDS[k].chip}</button>`)}</div>
            <input id="fake-desc" class="input" maxlength="160" aria-label="Ce que montre ta fausse preuve" placeholder=${(FAKE_HINTS[fk.kind] || FAKE_HINTS.dm)(target, first)} value=${fk.desc} onInput=${(ev) => setFake({ desc: ev.target.value })} />
            ${fk.desc.trim().length >= 6 ? html`<${EvidenceCard} ev=${{ kind: fk.kind, desc: fk.desc.trim(), fake: true }} mine=${true} />` : null}
            <small class="fake-warn"><${Icon} n="alert" s=${13} /><span>Si ça passe, ${first} prend le bad buzz. Si quelqu’un repère le fake, tout de suite ou plus tard, c’est toi qui prends un énorme bad buzz.</span></small>`
          : html`<button type="button" class="btn btn-ghost btn-sm fake-add" onClick=${() => setFake({ kind: 'dm' })}><${Icon} n="mask" s=${15} /> Fabriquer une fausse preuve</button>`}
        </div>` : null}
      </div>
    </div>
    <div class="composer-meta">
      <span>${S.busy.act ? 'Ton post précédent est encore en train de buzzer…'
        : !canAfford(g, costKind) ? html`<span class="err">Budget IA du jour épuisé. </span><button class="linkbtn" onClick=${budgetBlocked}>Options</button>`
          : `≈ ${cost} ${plural(cost, 'café', 'cafés')}${e.unlimited ? '.' : ` · il t’en reste ${fmtCafes(e.left)} aujourd’hui.`}`}</span>
      <span class=${'count' + (remaining < 20 ? ' warn' : '')}>${remaining}</span>
    </div>
    ${HOST ? html`<div class="composer-plan"><${GptPlanLine} /></div>` : null}
    <div class="composer-voice"><${AutoSendBar} left=${left} cancel=${cancel} /></div>
    ${g.boosts.viral ? html`<div class="boost-on"><${Icon} n="flame" s=${16} /> Moment viral activé sur ce post</div>` : null}
    ${g.boosts.reach ? html`<div class="boost-on"><${Icon} n="zap" s=${16} /> Boost de portée activé sur ce post</div>` : null}
    <div class="ideas">
      <div class="row">
        ${!hasPhoto && !accuse && !pollOn ? html`<button class="btn btn-ghost btn-sm" onClick=${addPhoto}><${Icon} n="camera" s=${15} /> Photo</button>` : null}
        ${pollAllowed && !pollOn ? html`<button class="btn btn-ghost btn-sm" onClick=${() => { S.drafts.poll = ['', '']; force((x) => x + 1); }}><span aria-hidden="true">📊</span> Sondage</button>` : null}
        <button class="btn btn-ghost btn-sm" onClick=${() => loadIdeas(null)} disabled=${S.busy.ideas}><${Icon} n="sparkles" s=${15} /> ${S.ideas && S.ideas.key === 'post' && S.ideas.list.length ? 'D’autres idées' : 'Des idées ?'} <span class="cost-tag">≈ ${costLabel(g, 'ideas')} ☕</span></button>
        <${WriteBtn} w=${{ kind: 'post', key: 'post', draft: val.trim() }} onText=${pickIdea} />
        <${VoiceChip} />
        ${em.btn}
      </div>
      <${IdeaList} k="post" onPick=${pickIdea} />
    </div>
  <//>`;
}
function ShopLayer({ g, now, i }) {
  const s = g.stats;
  const e = energyNow(g, now);
  return html`<${LayerShell} i=${i} title="Boutique">
    <div class="wallet">
      <span class="res-chip"><span class="gem-dot"><${Icon} n="gem" s=${14} /></span><b>${s.gems}</b><small> ${plural(s.gems, 'gemme', 'gemmes')}</small></span>
      <${EnergyChip} g=${g} label=${true} />
    </div>
    <p class="muted" style="padding:0 16px 14px;font-size:13.5px">Les cafés, c’est ton budget IA du jour : ils reviennent à minuit et ne s’achètent pas. Les gemmes se gagnent avec les quêtes, les niveaux et les défis.</p>
    ${SHOP.map((it) => html`<${ShopItem} key=${it.id} it=${it} g=${g} />`)}
  <//>`;
}
function TagLayer({ l, g, now, i }) {
  const posts = postsWithTag(g, l.id, now);
  return html`<${LayerShell} i=${i} title=${l.id}>
    <div class="tag-head"><span class="tag-ic"><${Icon} n="hash" s=${22} /></span><div><b>${l.id}</b><span>${posts.length} ${plural(posts.length, 'post', 'posts')} · ${g.world.name}</span></div></div>
    ${posts.length ? posts.map((p) => html`<${PostRow} key=${p.id} g=${g} p=${p} now=${now} />`) : html`<div class="empty"><span>Plus aucun post avec ce hashtag.</span></div>`}
  <//>`;
}

/* ---------- modals ---------- */
function openSaves() { if (S.game) queueModal({ t: 'saves', at: Date.now() }); }
async function saveToSlot() {
  const g = S.game;
  if (!g || S.busy.save) return;
  if (evBusy()) { toast('Attends que ça finisse de bouger pour sauvegarder.'); return; }
  const used = g.saves || [];
  const slot = SAVE_SLOTS.find((k) => !used.some((x) => x.slot === k)) || SAVE_SLOTS.slice().sort((a, b) => ((used.find((x) => x.slot === a) || {}).at || 0) - ((used.find((x) => x.slot === b) || {}).at || 0))[0];
  S.busy.save = true;
  update(false);
  try { await writeSave(g, slot); saveNow(); toast('Partie sauvegardée.', 'good'); }
  catch (e) { toast('Sauvegarde impossible pour l’instant. Réessaie.', 'bad'); }
  S.busy.save = false;
  update();
}
// 0.27.7: a save has the name the player gave it (or the moment it was made, or its slot).
const saveName = (x) => (x && x.name) || (x && x.auto ? x.label : 'Sauvegarde ' + (x ? x.slot : ''));
function renameSave(g, slot, name) {
  const x = (g.saves || []).find((y) => y.slot === slot);
  if (!x) return false;
  const n = str(name, 40);
  if (n) x.name = n; else delete x.name; // (empty: back to its own name)
  scheduleSave();
  Store.read(`g_${g.id}_save_${slot}`).then((b) => { if (b && b.meta) { if (n) b.meta.name = n; else delete b.meta.name; return Store.write(`g_${g.id}_save_${slot}`, b); } return null; }).catch((e) => console.warn('rename save', e && (e.code || e.message)));
  return true;
}
function SaveRow({ g, x, close }) {
  const [ed, setEd] = useState(null); // the name being typed
  const ok = () => { renameSave(g, x.slot, ed); setEd(null); update(false); };
  if (ed != null) {
    return html`<div class="save-row editing">
      <input class="input" maxlength="40" value=${ed} placeholder=${x.auto ? x.label : 'Sauvegarde ' + x.slot} aria-label="Nom de la sauvegarde" ref=${(el) => { if (el && !el.dataset.f) { el.dataset.f = '1'; el.focus(); el.select(); } }}
        onInput=${(e) => setEd(e.target.value)} onKeyDown=${(e) => { if (e.key === 'Enter') ok(); else if (e.key === 'Escape') { e.stopPropagation(); setEd(null); } }} />
      <button class="btn btn-hot btn-sm" onClick=${ok}>OK</button>
      <button class="btn btn-ghost btn-sm" onClick=${() => setEd(null)}>Annuler</button>
    </div>`;
  }
  return html`<div class=${'save-row' + (x.auto ? ' auto' : '')}>
    <div><b>${saveName(x)}</b><small>${x.auto ? 'Auto · ' : ''}${x.name && x.auto ? x.label + ' · ' : ''}${agoLabel(x.at)} · Niv. ${x.lvl} · ${fmtN(x.fol)} ${plural(x.fol, 'abonné', 'abonnés')}</small></div>
    <button class="iconbtn save-ren" onClick=${() => setEd(x.name || '')} aria-label=${'Renommer : ' + saveName(x)} title="Renommer"><${Icon} n="pen" s=${16} /></button>
    <button class="btn btn-ghost btn-sm" onClick=${() => { close(); askConfirm({ title: 'Revenir à cette sauvegarde ?', text: `${saveName(x)} (${agoLabel(x.at)}). Tout ce qui s’est passé depuis sera perdu.`, ok: 'Revenir en arrière', danger: true, run: () => loadSave(x.slot) }); }}>Charger</button>
  </div>`;
}
// « il y a 5 min », in game time (a skip makes a save older).
const agoLabel = (ts, now = Date.now()) => { const a = fmtAgo(ts, now); return /^\d+ (s|min|h|j)$/.test(a) ? 'il y a ' + a : /^\d/.test(a) ? 'le ' + a : a; }; // (0.28.1: « le 19 oct. », a date is no duration)
async function loadSave(slot) {
  const g = S.game;
  if (!g || S.busy.save) return;
  S.busy.save = true;
  let body = null;
  try { body = await Store.read(`g_${g.id}_save_${slot}`); } catch (e) { body = null; }
  S.busy.save = false;
  if (!body || !body.game) { toast('Cette sauvegarde est introuvable.', 'bad'); return; }
  await abortFlows();
  if (S.game !== g) return;
  const snap = body.game;
  if (body.meta && body.meta.at) { // its timers pick up where they were (a countdown at 30 min is at 30 min again), and so does its clock
    const away = Date.now() - body.meta.at;
    shiftTime(snap, -away, true);
    snap.clockOff = (typeof snap.clockOff === 'number' ? snap.clockOff : num(snap.stats && snap.stats.skipped, 0)) - away;
  }
  achKeep(snap, g); // 0.28: an achievement, once there, stays
  if (g.budget) snap.budget = g.budget; // 0.28.1: the cafés follow the real hour: those spent stay spent (today's and the whole game's)
  const ng = migrate(Object.assign(snap, { id: g.id, saves: g.saves, ready: true }));
  enterGame(ng, { tab: 'feed', hot: true });
  saveNow();
  const named = (ng.saves || []).find((y) => y.slot === slot);
  toast(`Retour en arrière : ${named ? saveName(named) : body.meta && body.meta.label ? body.meta.label : 'sauvegarde chargée'}.`, 'good');
}
// The ways out of a cancel (also offered when a fake proof gets exposed).
function CancelPaths({ g, close }) {
  const pr = shopPrice('pr');
  const wait = APOLOGY_COOLDOWN - (Date.now() - (g.apologyAt || 0));
  return html`<div class="paths">
    <button class="path" onClick=${() => { close(); openCompose({ apology: true }); }} disabled=${wait > 0}><b>Poster des excuses</b><span>${wait > 0 ? 'Possible dans ' + fmtClock(wait) + '.' : 'Sincères, elles font remonter ta réputation. De façade, elles l’enfoncent.'}</span></button>
    <button class="path" onClick=${() => { close(); startLowProfile(); }}><b>Faire profil bas</b><span>15 min sans poster : ta réputation remonte doucement (jusqu’à +${LOW_MAX * 10}).</span></button>
    <button class="path" onClick=${() => { close(); buy('pr'); }} disabled=${g.stats.gems < pr}><b>Agence de com’ · ${pr} gemmes</b><span>${g.stats.gems < pr ? `Il te manque ${pr - g.stats.gems} ${plural(pr - g.stats.gems, 'gemme', 'gemmes')}.` : 'Fin du cancel garantie.'}</span></button>
  </div>`;
}
function Modal({ m, g }) {
  if (!m.shownAt) m.shownAt = Date.now();
  const close = () => closeModal(m);
  const armed = () => Date.now() - m.shownAt > 450; // a double tap on the button that opened it cannot confirm
  let card = null;
  if (m.t === 'level') {
    const c = m.charId ? g.chars[m.charId] : null;
    card = html`<div class="modal-card">
      <span class="eyebrow">Niveau supérieur</span>
      <div class="modal-big">Niv. ${m.level}</div>
      <div class="rewards"><span class="chip flash"><${Icon} n="gem" s=${12} /> +${LEVEL_GEMS} gemmes</span></div>
      ${c ? html`<p>Quelqu’un de nouveau arrive sur le réseau :</p>
        <div class="modal-char"><${Avatar} who=${author(g, 'c:' + c.id)} size=${48} /><div><b>${c.name}</b><span>@${c.handle}${c.role ? ' · ' + c.role : ''}</span></div></div>
        <button class="btn btn-hot" onClick=${() => { close(); openChar(c.id); }}>Voir son profil</button>`
      : html`<p class="lv-coming">${S.busy.newchar ? html`<${Typing} /> Quelqu’un de nouveau arrive sur le réseau…` : 'Quelqu’un de nouveau va bientôt arriver sur le réseau.'}</p>`}
      <button class="btn btn-ghost" onClick=${close}>Continuer</button>
    </div>`;
  } else if (m.t === 'train' || m.t === 'trainend') {
    card = html`<${TrainCard} g=${g} m=${m} close=${close} />`;
  } else if (m.t === 'viral') {
    const p = g.posts.find((x) => x.id === m.postId);
    card = html`<div class="modal-card viral">
      <span class="eyebrow">Ton post explose</span>
      <div class="burst">VIRAL</div>
      ${p && p.text ? html`<p>« ${p.text.slice(0, 140)}${p.text.length > 140 ? '…' : ''} »</p>` : null}
      <div class="rewards"><span class="chip">${fmtN(m.likes)} likes en route</span><span class="chip">${nAbonnes(m.fol, true)}</span></div>
      <button class="btn btn-ink" onClick=${close}>Profiter du moment</button>
    </div>`;
  } else if (m.t === 'cancel') {
    card = html`<div class="modal-card">
      <span class="eyebrow" style="color:var(--bad)">Retour de bâton</span>
      <div class="modal-big" style="color:var(--bad)">Cancel</div>
      <p>Ta réputation est tombée sous 150. Tant qu’elle ne remonte pas à 350, chaque post te coûte des abonnés. Comment tu gères ?</p>
      <${CancelPaths} g=${g} close=${close} />
      <button class="btn btn-ghost" onClick=${close}>J’assume</button>
    </div>`;
  } else if (m.t === 'busted') {
    const c = g.chars[m.charId];
    const K = EV_KINDS[m.kind] || EV_KINDS.dm;
    card = html`<div class="modal-card busted">
      <span class="eyebrow">${m.late ? 'Contre-enquête' : px(g, 'Grillé', 'Grillée', 'Grillé·e') + ' en direct'}</span>
      <div class="burst">FAKE</div>
      <p>${m.late ? 'Quelqu’un a creusé. ' : 'Le réseau a tout de suite vu le montage. '}${K.f ? 'Ta' : 'Ton'} ${evLabel(m.kind)} contre ${c ? c.name : 'ta cible'} était ${K.f ? 'fausse' : 'faux'}, et maintenant tout le monde le sait.</p>
      <div class="rewards">${m.loss > 0 ? html`<span class="chip bad">−${nAbonnes(m.loss)}</span>` : null}<span class="chip bad">Réputation au plus bas</span><span class="chip bad">Cancel</span>${c ? html`<span class="chip bad">${firstName(c)} ne te le pardonnera pas</span>` : null}</div>
      <${CancelPaths} g=${g} close=${close} />
      <button class="btn btn-ghost" onClick=${close}>J’assume</button>
    </div>`;
  } else if (m.t === 'uncancel') {
    card = html`<div class="modal-card">
      <span class="eyebrow" style="color:var(--good)">Retour en grâce</span>
      <div class="modal-big">${px(g, 'Pardonné', 'Pardonnée', 'Pardonné·e')}</div>
      <p>La communauté passe à autre chose. Ta réputation est remontée : fin du cancel.</p>
      <button class="btn btn-hot" onClick=${close}>Continuer</button>
    </div>`;
  } else if (m.t === 'vibe') {
    const c = g.chars[m.charId], V = VIBES[m.vibe];
    if (c && V) {
      const choose = m.vibe === 'couple' && c.vibe === 'couple' && c.officiel === 'pending'; // 0.12: announce it, or keep it for the two of you
      const eyebrow = { couple: 'Vous êtes ensemble', fiancailles: `${gx(c.g, 'Il', 'Elle', 'Iel')} a dit oui`, mariage: 'Vive les mariés', ex: 'Rupture', complique: 'C’est compliqué' }[m.vibe] || 'Nouvelle dynamique';
      card = html`<div class="modal-card">
        <span class="eyebrow">${eyebrow}</span>
        <div class="vibe-big" aria-hidden="true">${V.emoji}</div>
        <div class="modal-big" style="font-size:34px">${V.label}</div>
        <div class="modal-char"><${Avatar} who=${author(g, 'c:' + c.id)} size=${44} /><div><b>${c.name}</b><span>@${c.handle}${m.why ? ' · ' + m.why : ''}</span></div></div>
        ${choose ? html`<p class="couple-ask">Tu l’annonces sur le réseau, ou vous gardez ça pour vous deux ?</p>
          <button class="btn btn-hot" onClick=${() => { close(); announceCouple(g, c); update(); }}>📣 L’annoncer sur le réseau</button>
          <button class="btn btn-ghost" onClick=${() => { close(); keepCoupleSecret(g, c); update(); }}>🤫 Garder ça pour nous deux</button>`
        : html`<button class="btn btn-hot" onClick=${() => { close(); openChar(c.id); }}>Voir son profil</button>
          <button class="btn btn-ghost" onClick=${close}>Continuer</button>`}
      </div>`;
    }
  } else if (m.t === 'psyout') { // 0.29: unmasked
    card = html`<${PsyOutCard} g=${g} m=${m} close=${close} />`;
  } else if (m.t === 'badbuzz') {
    const c = g.chars[m.charId];
    if (c) {
      card = html`<div class="modal-card badbuzz">
        <span class="eyebrow">Ça tourne mal pour ${firstName(c)}</span>
        <div class="burst">BAD BUZZ</div>
        <div class="modal-char"><${Avatar} who=${author(g, 'c:' + c.id)} size=${44} /><div><b>${c.name}</b><span>@${c.handle}${c.badBuzz ? ' · −' + nAbonnes(c.badBuzz.loss) : ''}</span></div></div>
        <p>${m.exposed && c.secretOut ? html`<b>Son secret éclate :</b> ${c.secretOut}` : m.fake ? 'Le réseau a mordu à ta fausse preuve. Pourvu que personne ne creuse…' : 'Le réseau te croit. Attends-toi à une contre-attaque…'}</p>
        <button class="btn btn-ink" onClick=${close}>${m.fake ? 'Croiser les doigts' : 'Savourer'}</button>
      </div>`;
    }
  } else if (m.t === 'saves') {
    const list = (g.saves || []).slice().sort((a, b) => b.at - a.at);
    card = html`<div class="modal-card saves-card">
      <span class="eyebrow">Sauvegardes</span>
      <p>Sauvegarde maintenant, ou reviens à un moment d’avant : tout ce qui s’est passé depuis sera effacé.</p>
      <button class="btn btn-hot" onClick=${saveToSlot} disabled=${S.busy.save}><${Icon} n="save" s=${16} /> ${S.busy.save ? 'Sauvegarde…' : 'Sauvegarder maintenant'}</button>
      ${SAVE_SLOTS.every((k) => list.some((x) => x.slot === k)) ? html`<small class="muted">Tes 3 emplacements sont pris : la plus ancienne sera remplacée.</small>` : null}
      ${list.length ? html`<div class="save-list">${list.map((x) => html`<${SaveRow} key=${x.slot} g=${g} x=${x} close=${close} />`)}</div>` : html`<p class="muted" style="font-size:13.5px">Aucune sauvegarde pour l’instant. Le jeu en fait aussi une tout seul juste avant tes actions risquées.</p>`}
      <button class="btn btn-ghost" onClick=${close}>Fermer</button>
    </div>`;
  } else if (m.t === 'clash') {
    const a = eventOf(g, m.a), b = eventOf(g, m.b);
    const ca = a && g.chars[a.c], cb = b && g.chars[b.c];
    if (a && b && ca && cb && a.state === 'scheduled' && b.state === 'scheduled') {
      const keep = (k, drop) => () => { close(); cancelDate(g, drop, `pour voir ${firstName(g.chars[k.c])}`); update(); };
      const hurt = (ev) => { const h = cancelHurt(ev.due - Date.now()); return h === 0 ? 'prévenu·e tôt, ça passera' : h >= -3 ? 'ça va un peu piquer' : h >= -6 ? 'ça va mal passer' : 'ça va très mal passer'; };
      card = html`<div class="modal-card">
        <span class="eyebrow" style="color:var(--bad)">Deux rendez-vous en même temps</span>
        <div class="modal-big" style="font-size:38px" aria-hidden="true">📅</div>
        <p>${ca.name} (${fmtWhen(a.due)}) et ${cb.name} (${fmtWhen(b.due)}) : tu ne peux pas être aux deux. Qui tu préviens ?</p>
        <div class="paths">
          <button class="path" onClick=${keep(a, b)}><b>Garder ${firstName(ca)}</b><span>Annuler avec ${firstName(cb)} : ${hurt(b)}.</span></button>
          <button class="path" onClick=${keep(b, a)}><b>Garder ${firstName(cb)}</b><span>Annuler avec ${firstName(ca)} : ${hurt(a)}.</span></button>
        </div>
        <button class="btn btn-ghost" onClick=${close}>Je verrai plus tard</button>
      </div>`;
    }
  } else if (m.t === 'skip') {
    card = html`<${WatchCard} g=${g} close=${close} />`;
  } else if (m.t === 'budget') {
    card = html`<${BudgetCard} g=${g} m=${m} close=${close} />`;
  } else if (m.t === 'standing') {
    card = html`<${StandingCard} g=${g} close=${close} />`;
  } else if (m.t === 'pfp') {
    card = html`<${PfpCard} g=${g} m=${m} close=${close} />`; // 0.25.1
  } else if (m.t === 'rumor' || m.t === 'leak' || m.t === 'series' || m.t === 'money') {
    card = CareerModal({ m, g, close });
  } else if (m.t === 'gear') {
    card = GearModal({ m, g, close }); // 0.20: the start, a launch, a theft
  } else if (m.t === 'secret' || m.t === 'secretlie') {
    card = SecretModal({ m, g, close }); // 0.18
  } else if (m.t === 'visit') {
    const v = visitOf(g, m.vid);
    if (isLiveVisit(v)) card = html`<${VisitCard} key=${v.id} g=${g} v=${v} close=${close} />`; // 0.18
  } else if (m.t === 'confirm') {
    card = html`<div class="modal-card">
      <div class="modal-title">${m.title}</div>
      ${m.text ? html`<p>${m.text}</p>` : null}
      <button class=${'btn ' + (m.danger ? 'btn-danger-solid' : 'btn-hot')} onClick=${() => { if (!armed()) return; close(); m.run(); }}>${m.ok || 'Confirmer'}</button>
      <button class="btn btn-ghost" onClick=${close}>${m.cancel || 'Annuler'}</button>
    </div>`;
  }
  if (!card) { Promise.resolve().then(close); return null; }
  return html`<div class=${'modal' + (STICKY_MODALS.includes(m.t) ? ' sticky' : '')} role="dialog" aria-modal="true" onClick=${(e) => { if (e.target === e.currentTarget && !STICKY_MODALS.includes(m.t)) close(); }}>${card}</div>`;
}
const STICKY_MODALS = ['visit', 'pfp']; // 0.18: someone at the door: talk, or « pas maintenant » ; 0.25.1: a new profile photo, shown off or not

/* =========================================================
   Clock, toasts for arrivals, boot
   ========================================================= */
const TOAST_KINDS = { fanfic: 'flash', crit: '', ach: 'flash', skill: 'good', trend: 'flash', dm: '', follow: 'good', unfollow: 'bad', mention: '', new: '', questnew: '', questprog: '', milestone: 'good', drama: '', collab: '', seen: 'bad', screen: 'bad', apology: '', low: 'good', clue: 'flash', release: 'flash', event: 'flash', money: 'good', advice: 'flash', trustup: 'good', secret: 'flash', standdown: 'bad', standup: 'good', echo: 'flash', train: 'flash', gear: 'flash' };
let lastSlow = 0, lastQuestTick = 0, lastNeglect = 0;
// 0.10: in the ChatGPT app (not on the page of the tests, where the AI only answers the player's actions), « Le réseau vit tout
// seul » (Ultime's default; 0.19: a switch): a refresh every few minutes, only while the player is there and playing.
// 0.23.1: at its pace (every 15, 8 or 5 minutes), and paused as soon as Hype is not in front of the player (another app,
// the window minimized) or nothing was touched for 3 minutes (a click, a key, the wheel): it comes back with them.
const AUTO_IDLE_MS = 3 * 60000;
function livePause(t = Date.now()) {
  const out = (S.os || []).some((l) => { try { return l.os.w.document.hasFocus(); } catch (e) { return false; } }); // (0.27.9: playing in a window out of the game)
  const focus = window.__hypeFocus != null ? !!window.__hypeFocus : typeof document.hasFocus !== 'function' || document.hasFocus() || out; // (__hypeFocus: the tests)
  if ((document.visibilityState !== 'visible' && !out) || !focus) return 'away';
  return t - (S.lastInputAt || 0) >= AUTO_IDLE_MS ? 'idle' : null;
}
const autoLiveDue = (g, t) => !!(HOST && g && g.ready && g.opts && autoLiveOn(g) && !livePause(t)
  && t - (g.lastRefreshAt || 0) >= intensityOf(g).liveMs && !skipBusy() && !S.busy.more && !S.busy.refresh
  && !S.stack.some((l) => l.t === 'minigame') && canAfford(g, 'refresh'));
let achTickAt = 0;
function tick() {
  const t = Date.now();
  S.now = t;
  if (S.toasts.length) { toastsOn(t); S.toasts = S.toasts.filter((x) => x.until > t); } // (0.28.1: those waiting their turn keep their time)
  let fast = S.toasts.length > 0 || S.busy.create || S.busy.refresh || !!S.busy.act || !!S.busy.dm || !!S.busy.mg || S.busy.ideas || S.busy.newchar || t < S.liveUntil || S.modals.length > 0;
  const g = S.game;
  if (S.phase === 'game' && g && !g.over) { // (0.29: a game that ended waits on its last screen)
    // 0.30: out of sight (another app, the window hidden), nothing is given up; back, what came due meanwhile starts again
    const hidden = document.visibilityState !== 'visible' && !(S.os || []).length;
    if (!hidden && g.lastSeenAt && t - g.lastSeenAt > AWAY_MIN) { absenceGrace(g, g.lastSeenAt, t); nrgBack(g, g.lastSeenAt, t); g.lastSeenAt = t; update(false); } // (0.32: out of sight long enough, rested)
    if (!hidden && t - (S.lastInputAt || 0) < AUTO_IDLE_MS && S.playTickAt) g.stats.playMs = (g.stats.playMs || 0) + Math.max(0, Math.min(5000, t - S.playTickAt)); // 0.30: the time really played
    S.playTickAt = t;
    if (t - achTickAt > 4000) { achTickAt = t; tickAch(g, t); } // 0.28: the achievements read what stands
    const shown = dmsShown(); // (0.27.9: a conversation out of the game is being read too)
    // 0.10.2: no toast over a mini-game being played (it hid the question while the clock ran); the notifications keep them
    // (0.28.1: and their toasts come after it: the time of the last toast only moves on outside a game)
    const playing = topIsGame(); // (0.27.6: a practice round, a commissioned edit too)
    const achs = []; // 0.28.1: several achievements at once: one toast for all of them
    for (const n of playing ? [] : g.notifs) {
      if (n.at > S.lastToastAt && n.at <= t && n.k in TOAST_KINDS && !((n.k === 'dm' || n.k === 'seen') && shown.includes(n.c))) {
        const cId = n.c;
        const tg = n.k === 'trend' ? n.tg : null;
        const sk = n.k === 'skill' ? n.sk : null;
        if (n.k === 'ach') { achs.push(n); continue; }
        TOAST_Q.push({ text: n.text, kind: TOAST_KINDS[n.k], pri: n.k === 'questnew' || n.k === 'questprog', at: t, action: (n.k === 'dm' || n.k === 'seen') && cId ? { label: 'Lire', dm: cId, run: () => openDM(cId) } : tg ? { label: 'Voir', run: () => openTag(tg) } : sk ? { label: 'Voir', run: () => openLayer({ t: 'skill', id: sk }) } : null });
      }
    }
    if (achs.length >= 3) { const a0 = achs[0].a; TOAST_Q.push({ text: `🏆 ${achs.length} succès débloqués`, kind: TOAST_KINDS.ach, pri: true, at: t, action: { label: 'Voir', run: () => openAch(a0) } }); }
    else for (const n of achs) TOAST_Q.push({ text: n.text, kind: TOAST_KINDS.ach, pri: true, at: t, action: { label: 'Voir', ach: n.a, run: () => openAch(n.a) } });
    // answers that arrive in a conversation the player has left
    for (const id in playing ? {} : g.dms) {
      if (shown.includes(id)) continue;
      const msgs = g.dms[id].msgs;
      for (let k = msgs.length - 1; k >= Math.max(0, msgs.length - 4); k--) {
        const m = msgs[k];
        if (m.r && m.at > S.lastToastAt && m.at <= t) { const c = g.chars[id]; if (c) TOAST_Q.push({ text: `${c.name} t’a répondu`, kind: '', at: t, action: { label: 'Lire', dm: id, run: () => openDM(id) } }); break; }
      }
    }
    if (!playing) S.lastToastAt = t;
    if (TOAST_Q.length) { // (let in as room is made: the first ones first, an achievement or a quest before the rest)
      TOAST_Q.sort((a, b) => ((b.pri ? 1 : 0) - (a.pri ? 1 : 0)) || (a.pri ? (b.at || 0) - (a.at || 0) : 0));
      while (TOAST_Q.length && S.toasts.length < 4) {
        const q = TOAST_Q.shift();
        if (!q.pri && t - (q.at || t) > TOAST_STALE) continue; // (old news: its notification stays in the tab)
        toast(q.text, q.kind, q.action);
        const x = S.toasts[S.toasts.length - 1];
        if (q.pri && x) x.pri = true;
      }
    }
    if (g.low) { const before = g.low.gain; syncLow(g, t); if (!g.low || g.low.gain !== before) update(); fast = true; }
    if (g.fakes && g.fakes.length && checkFakes(g, t)) update(); // a counter-investigation that was due
    const onScreen = (id) => S.stack.some((l) => l.t === 'minigame' && l.id === id); // 0.27.6: being played: never pulled away
    if (settleRuns(g, t)) update(); // 0.10.2: a mini-game left finished, or whose clock ran out while the player was away (0.27.6: scored before any grace runs out)
    if (!hidden && g.releases && g.releases.length && checkReleases(g, t, onScreen)) update(); // a release forgotten long after its time
    if (!hidden && ((g.events && g.events.length) || (g.invites && g.invites.length)) && checkEvents(g, t, onScreen)) update(); // a stood-up date, an event nobody watched, an invitation left unanswered
    for (const ev of activeEvents(g)) { // wherever the player is, the time is called out
      const ec = g.chars[ev.c];
      if (ev.player && ec && !ev.soonSaid && !hidden && ev.due - t > 0 && ev.due - t <= 3600000 && t - (ev.at || 0) > 15 * 60000) { ev.soonSaid = true; addNotif(g, { k: 'event', c: ec.id, at: t, text: `⏰ Dans ${fmtLeft(ev.due - t)} : ton rendez-vous avec ${ec.name} (« ${str(ev.what, 50)} »), à ${hourOf(ev.due)}.` }); update(); } // 0.30: a reminder, an hour before
      if (ev.dueSaid || t < ev.due || (inMiniGame() && !S.stack.some((l) => l.t === 'minigame' && l.id === ev.id))) continue; // (0.27.6: after the game being played: its toast opened a second game over the first)
      ev.dueSaid = true;
      const K = EVENT_KINDS[ev.kind] || EVENT_KINDS.autre;
      if (ev.player && ec) addNotif(g, { k: 'eventdue', c: ec.id, at: t, text: `🥂 C’est l’heure de ton rendez-vous avec ${ec.name} : « ${str(ev.what, 60)} ».` }); // 0.30: it stays in the bell
      if (ec && !S.stack.some((l) => l.t === 'minigame' && l.id === ev.id)) toast(`${evEmoji(g, ev)} ${K.now(ec)}`, 'flash', { label: K.go, run: () => goEvent(ev), ev: ev.id });
      update();
    }
    if (t - lastNeglect > 60000) { lastNeglect = t; if (checkNeglect(g, t)) update(); }
    const rl = activeRelease(g);
    if ((rl && rl.due - t < 120000) || S.stack.some((l) => l.t === 'minigame')) fast = true; // live countdown, mini-game timers
    if (!skipBusy()) for (const x of plannedReleases(g)) if (x.prodWait) { prodJump(g, x); update(); } // 0.30.1: a shoot done while the characters were writing: its time passes now
    if (!skipBusy()) for (const x of plannedReleases(g)) if (x.big && x.big.wait) { bigJump(g, x); update(); } // 0.30.1: a production's stage, the same
    if (g.timeDebt && !skipBusy() && !inMiniGame()) { const ms = g.timeDebt, why = g.timeWhy; g.timeDebt = 0; delete g.timeWhy; spendTime(g, ms, why); update(); } // 0.30.1: time spent elsewhere
    if (g.actDebt && payActTime(g, t)) update(); // 0.32: the minutes the player's messages and posts took
    if (tickTold(g, t)) update(); // 0.32: the hours gone by untold: the network tells them
    if (tickReplies(g, t) || tickGroups(g, t)) update(); // 0.32: they pick up their phone
    if (!hidden && tickNrg(g, t)) update(); // 0.32: a bed offered in the night, or when exhausted
    for (const x of plannedReleases(g)) { // 0.31.3: a feat: someone waits for the player at that hour, even behind another release (said, and it can be shot)
      if (x === rl || !x.collab || x.big || hidden) continue;
      const xc = g.chars[x.collab];
      if (!x.soonSaid && x.due - t > 0 && x.due - t <= 3600000 && t - (x.at || 0) > 15 * 60000) { x.soonSaid = true; addNotif(g, { k: 'event', c: xc ? xc.id : null, at: t, text: `⏰ Dans ${fmtLeft(x.due - t)} : ton tournage avec ${xc ? xc.name : 'ton feat'}, « ${str(x.topic, 60)} ».` }); update(); }
      if (x.dueSaid || t < x.due) continue;
      x.dueSaid = true;
      addNotif(g, { k: 'releasedue', c: xc ? xc.id : null, at: t, text: `🎬 C’est l’heure de retrouver ${xc ? xc.name : 'ton feat'} pour tourner ${ta(x)} « ${str(x.topic, 60)} ».` });
      if (!inMiniGame()) toast(`🎬 ${xc ? `${firstName(xc)} t’attend` : 'C’est l’heure'} pour tourner ${ta(x)} !`, 'flash', { label: 'Tourner', run: () => startShoot(x) });
      update();
    }
    if (rl && !rl.dueSaid && t >= rl.due && rl.big) { rl.dueSaid = true; bigDueNotif(g, rl, t); update(); } // 0.30.1: a production's stage
    if (rl && !rl.dueSaid && t >= rl.due) { // wherever the player is, the release time is called out
      rl.dueSaid = true;
      const pw = prodMs(rl) && rl.what !== 'live'; // 0.30.1: one that takes time: the time to start it
      addNotif(g, { k: 'releasedue', p: rl.post, text: pw ? `C’est l’heure de tourner ${ta(rl)} « ${str(rl.topic, 60)} » : ${prodWord(rl.what, rl.care, rl.team)} de travail, ${whatF(rl) ? 'elle' : 'il'} sort ${relAnn(rl) > t ? 'à ' + hourOf(relAnn(rl)) : 'dès que c’est fini'}.` : `C’est l’heure : ${ta(rl)} « ${str(rl.topic, 60)} » doit sortir !` });
      const away = awayGear(g, rl); // 0.30.1: at someone's place without the gear: said too
      if (away) addNotif(g, { k: 'releasedue', text: `🏠 ${away.why}` });
      if (!inMiniGame()) toast(away ? away.why : pw ? `C’est l’heure de tourner ${ta(rl)} !` : `C’est l’heure : ${ta(rl)} doit sortir !`, 'flash', { label: 'Tourner', run: () => startShoot(rl) });
      update();
    }
    if (t - lastQuestTick > 2000) { lastQuestTick = t; if (tickRoles(g, t)) update(); if (tickSocial(g, t)) update(); if (tickNewChars(g, t)) update(); if (tickQuests(g, t)) update(); if (tickCareer(g, t)) update(); if (tickPhotos(g, t)) update(); if (tickAdvice(g, t)) update(); if (tickStanding(g, t)) update(); if (tickHearts(g, t)) update(); if (tickTrain(g, t)) update(); if (tickToxic(g, t)) update(); if (tickTraitors(g, t)) update(); if (tickStalkers(g, t)) update(); if (tickCast(g, t)) update(); if (g.arrival && !S.busy.newchar && !S.busy.refresh && !S.busy.act) { const a = g.arrival; delete g.arrival; genNewChar(null, a.why); } if (tickSecrets(g, t)) update(); if (tickDilemmas(g, t)) update(); if (tickVisits(g, t)) update(); }
    if (autoLiveDue(g, t)) refreshFeed(0, { auto: true }); // 0.10, Ultime, the ChatGPT app: the network lives on its own while the player plays
    if (document.visibilityState === 'visible' && t - (g.lastSeenAt || 0) > 60000) g.lastSeenAt = t;
    if (S.tab === 'notifs' && !layerCovers()) g.notifReadAt = t;
    if (g.stats.cancelled && t - (g.apologyAt || 0) < APOLOGY_COOLDOWN) fast = true;
    const n = unreadNotifs(g, t) + unreadDMs(g, t, shown) + unreadGroups(g, t);
    const title = n ? `(${n}) Hype` : 'Hype';
    if (document.title !== title) document.title = title;
  } else if (document.title !== 'Hype') document.title = 'Hype';
  if (fast || t - lastSlow > 15000) { lastSlow = t; update(false); }
}

let booted = false;
async function loadIndex() {
  try {
    const idx = await Store.read('index');
    S.games = idx && Array.isArray(idx.games) ? idx.games.filter((x) => x && x.id) : [];
    if (idx) lastWritten.index = JSON.stringify(idx);
    indexOK = true;
    S.indexError = false;
  } catch (e) {
    console.warn('index', e);
    S.games = [];
    S.indexError = true; // never write over a list we could not read
  }
}
async function retryIndex() {
  S.phase = 'loading';
  update(false);
  await loadIndex();
  S.phase = 'home';
  update(false);
}
async function boot() {
  if (booted) return;
  booted = true;
  S.voice = loadVoicePref();
  applyTheme();
  rebuildPack(); // the pack shipped with the game; the creator's own atelier is read once the storage is ready
  if (APP_FRAMED) document.getElementById('app').classList.add('framed'); // 0.27.10: Hype's bar on top, the game under it
  render(html`<${App} />`, document.getElementById('app'));
  update(false);
  setInterval(tick, 1000);
  getSample().then((s) => { if (S.ai === 'unknown') S.ai = s ? 'ready' : 'unavailable'; update(false); });
  if (HOST) { // the ChatGPT connection: preferences first (the welcome is shown once), then the session and its changes
    (async () => {
      try { S.host.prefs = (await HOST.getPrefs()) || {}; } catch (e) { S.host.prefs = {}; }
      if (typeof HOST.getZoom === 'function') { // the size of everything (Ctrl + wheel changes it from the app)
        HOST.onZoom((z) => { S.host.zoom = z; update(false); });
        HOST.getZoom().then((z) => { S.host.zoom = z; update(false); }).catch(() => {});
      }
      HOST.onSession((ss) => setHostSession(ss));
      try { setHostSession(await HOST.getSession()); } catch (e) { setHostSession({ status: 'disconnected', sharing: false }); }
    })();
  }
  const init = Store.init();
  await Promise.race([init, sleep(2500)]);
  if (Store.mode === 'pending') { S.phase = 'home'; update(false); await init; } // a slow storage: show the home page without waiting
  await loadAtelier();
  await loadIndex();
  sweepDrafts(); // photos of a composer closed without publishing, at an earlier visit
  if (S.phase !== 'game' && S.phase !== 'onboard') S.phase = 'home';
  update(false);
}
if (window.__HYPE_TEST__) {
  window.__hype = {
    ROLE_TPL, roleChar, criticOf, rebeccaOf, addRoleChar, ensureRoles, roleAskLines, roleLines, roleTag, decoratePost, applyRoleLine, criticAcct, CRIT_GAP, FIC_GAP, packPool, STYLE_OF, // 0.29
    drawPsy, psyNow, psyStage, psySign, psyKill, psyEscape, psyCore, psyTalkCtx, psyVisitCtx, psyPublicLines, psyAccuseLines, psyAccusation, psyUnmask, tickRoles, psyDeadlyDate, psyDeadlyVisit, nightAt, fleeDate,
    PSY_DANGER_DAYS, PSY_DANGER_SIGNS, PSY_HOLD_DAYS, PSY_HOLD_SIGNS, ellipseTalk, ELLIPSE_LINE, LATER_LINE, isPsy, summarize, isLiveVisit, resolveAuthor,
    liveStories, storiesOf, addStory, postStory, openStory, voteStory, reactStory, storyViewers, storyViewsN, promptStory, addGroup, addGroupMsg, sendGroup, leaveGroup, quitGroup, liveGroups, unreadGroups, createGroup, groupCands, newGroupWhy, groupOf, GROUP_MAX, tiCells, photoCtr, TI_MAX, addLeak, addMom, addFanAcct, addShip, addFake, reportNpc, tickSocial, socialCtx, socialLines, applySocialLine, whoAny, // 0.29
    decorateSocial, postPoll, pollRes, votePoll, bdayOf, mdOf, dayKey, bdayWish, tickNet, memoryOf, ratioMark, ratioCheck, setMainDay, setOutage, setAlgo, algoMult, outageOn, algoOn, topFanOf, pinReply, netCtx, netLines, applyNetLine, replyLang, WORLD_LINE, addReplyTo,
    S, makeScanner, computeOutcome, cleanEval, normHandle, niceRound, xpNeed, update, energyNow, questProgress, promptWorld, promptAct, promptDM,
    promptRefresh, promptIdeas, promptNewChar, WORLDS, START, mains, charByHandle, cloneJSON, addMem, applyVibe, setVibeGoal, addTrigger,
    activeTriggers, checkCancel, startLowProfile, syncLow, applyAbsence, trends, VIBES, SHOP, FLOWS, Store, lastWritten, addClue, regulars, inBadBuzz, ticsOf, linesOf,
    playerBadBuzz, rollVigilance, fakeNeed, checkFakes, activeRelease, activeEvents, eventOf, escapeChance, openDM, aiTier,
    cancelHurt, fameDiff, shiftTime, checkEvents, addEvent, checkNeglect, writeSave, parsePlan, scanPlans, dueText, dayLabel, winText, mixPick, MIX_P,
    vibePrivate, learnLove, allLearn, knowsOf, seesChron, privNote, dateSeen, KNOW_RULE, lastWord, lastWordsFor, STAY_RE, logDate, backfillDates, dateLogText, dateLogOf, dateLogFor, DATE_LOG_MAX,
    JOB_KINDS, addJob, addJobFile, jobOf, openJob, jobsOf, jobWorked, sendJob, jobOutcome, tickJobs, jobsCtx, jobDMCtx, jobTalk, JOB_LINE, jobFilesWanted, thumbQual, jobGame, payCap,
    vibePath, vibeOK, normVibe, breakUp, dateOutcome, partnerWord, meetKind, sameWhat,
    pickArc, addArc, liveArcs, isTroll, crowdFor, pickShootKind, shootWeights, MG_KINDS_AI, promptMiniGame, makeMontage, makeMemoire, DIFFS,
    // 0.7
    budgetOf, cafesLeft, chargeBudget, canAfford, energyNow, calMoment, audienceAt, adSeason, gameDate, fmtGameClock, programOf, applyProgram, checkPayout, releaseViews, estimateViews, rpmOf, viewsCore, viewsParts, AUD, audSplit, audLong, audStart, vidAud, vidFans, warmK, promoViews, promoTargets, promoAfter, audAfter, audLine, releaseEarly,
    makeOffer, signDeal, dealFee, deliverDeal, sanction, addCandidate, hireStaff, quitStaff, staffMult, payroll, startSeries, seriesMult, endSeries, scheduleRelease,
    addRumor, liveRumor, rumorSource, turnAgainst, addIntel, leakIntel, allies, enemies, allyBoost, makeTrend, activeTrends, trendHeat, tickCareer, platformOf, PLATFORMS, nextAt, STAFF_ROLES,
    refreshFeed, skipTime,
    // 0.8: the photo pack
    BIG_MIN, BIG_K, BIG_PLAN, BIG_STAGES, bigOn, bigWhy, bigWhats, bigPlan, scheduleBig, bigWork, bigTotal, genBigStage, bigFinish, bigNext, bigJump, bigPostStart, bigPostDone, bigShift, bigShiftFree, bigDropped, bigCtxLine, bigDueWord, bigHeld, bigLimit, bigTodo,
    castAsked, castOn, castIn, castAdd, castText, castDMCtx, applyCastLine, applyHitch, hitchOpts, pickHitch, hitchCost, normHitch, bigClash, tickBig, bigOut, bigRecent, applyNomination, bigRefreshLines, swingOf,
    PACK, PACK_IMG, rebuildPack, portraitSrc, faceOf, assignFace, assignFaces, pickPhoto, albumOf, albumLines, albumPhoto, phBrief, prodMs, prodH, careOK, relAnn, setOut, prodClash, prodJump, eveningJump, eveningClash, eveningNotice, cutDate, awayGear, awayHome, gearSaid, spendTime, clashIn, teamOf, teamWord, prodWord, hWord, payCrew, dueWord, CARE_K, CARE_CUT, timeLine, arriveDate, askConfirm, tickPhotos, occasionsAt, seasonOf, momentOf, facesAsk, capBatch, capLines, publishQueued, emojiCaption,
    igList, ttList, makeSlides, pickSlides, genNewChar, loadAtelier, syncShipped, phSrc, atImg, atPortrait, removePerson, PH_PER_PERSON, packExportText, packImportText, creatorOn, openAtelier, guessTags, hintTags, addAmbientPost, charPortrait, cleanPhoto,
    // 0.9: trust and advice
    trustOf, gardeOf, trustMult, trustLabel, applyTrust, initTrust, migrateTrust, migrate, addAdvice, tickAdvice, resolveAdvice, plannedAdvice, confideSecret, secretBetrayed, isShady,
    expectedViews, estimatePlay, fmtPlay, momentLine, fmtWhen, toxOf, toxLv, toxMove, toxShare, toxAfterEval, modStrike, modCut, suspended, tickToxic, toxCtx, feudLine, toxFeeK, toxBannedP, harassComplaint, toxRedeem, actRepPlan, commitEval, scoreEval, refreshCareerLines, maybeTraitor, traitOf, traitStage, traitSign, traitCore, traitUnmask, traitBetray, tickTraitors, newcomerRoll, traitorsOf, tickCast, wake, sleepy, arrivalOK, ARRIVAL_LINE, genNewChar, promptNewChar, applyCareerLine, fadeOK, intimacyLv, intimacyLine, romanceCtx, sensual, intimateMem, promptTalk, sendDM, standUp, absenceGrace, excuseJudged, lapinLine, awayDateOf, awayMove, fansLine, sameFan, lastsLine, fakeBusted, startBadBuzz, ADVICE_NEED, TRUST_STEPS, openAdvice, openChar, promptWrite,
    // 0.9.1: series, the week of their pages, the player's own photos
    visibleShots, carouselOf, shotOf, IG_WINDOW, MEDIA, mediaGet, mediaSrc, ownPosts, exportGameText, importGameText, deleteGame, loadGameData,
    mediaPut, mediaDel, picDrafts, markDrafts, sweepDrafts, MEDIA_MAX,
    // 0.9.2: the characters see the player's images
    visionCheck, seeBlobs, SEE_MAX, SEE_CHARS, IMG_MISS, costGuess, budgetOf,
    // 0.9.3: dates that fit the story
    prepDate, genDate, prepFresh, charCancelsDate, dateSituation, publicBetween, promptDateGame, promptDateCheck,
    // 0.9.4: invitations, dates days away, standing and temperaments, echoes
    addInvite, acceptInvite, declineInvite, declineByButton, aWhen, dropInvite, inviteOf, openInvite, inviteIn, saysYes, planDue, parseWhen, dayOffset, dmDateFallback, dmInviteFallback,
    TEMPERS, temperOf, initTemper, setTemper, migrateTemper, standingOf, tickStanding, standLv, standMult, ripple, addEcho, surfaceEcho, runEcho, standCtx, temperText,
    candPrice, maybeOffer, genCandidates, promptCandidates, ctxText, sysLine,
    // 0.10: the reputation on 1000 and its pillars, the intensity, more comments, the budget tiers
    repMove, repTry, repShift, repFloor, repSet, repAtLeast, rep1000, repLabel, repCtx, ensureRep, REP_PILLARS, REP_TIERS, actRepPlan, INTENSITY, intensityOf,
    BUDGETS, budgetHint, PLAN_ADVICE, promptWave, postWaves, promptMore, moreReplies, moreDue, linkReply, autoLiveDue, setIntensity, postponePlan, DROP_PLAN, computeOutcome, openPost,
    // 0.10.2: a mini-game's progress kept with it; saves and exports never carry one half played
    mgKeep, runOver, settleRuns, dropUnplayed, snapshotOf, addRelease, finishShoot, openLayer, closeLayer, loadSave, enterGame,
    // 0.11: hearts, pace, cools, dares, dates played for real
    COEURS, heartOf, isDefi, normCoeur, guessCoeur, ensureHearts, amiOf, heartScale, noticed, paceCheck, tooFast, paceNeed, paceFrom, nextLove, startCool, endCool,
    bumpInsist, escalate, confide, startInquiry, resolveInquiry, dirtOn, tickHearts, loveMove, moveGap, moveStep, unblockFix31, startDare, heartBeforeDM, heartAfterDM, winDare,
    loseDare, forceLove, normReact, capReact, heartLines, quietDM, isTalk, gestesFor, promptTalk, openTalk, talkTurn, talkScore, finishTalk, afterDate, coolNow,
    TALK_TURNS, endDate, applyRel, roll,
    // 0.13: ties among them, word of mouth
    tieOf, setTie, bumpTie, initTies, tiesOf, applyTieLine, addWhisper, hear, tickWhispers, tieCtx, whisperFromIntel, whisperFromDate, addIntel,
    compactCore, coreSize, saveGame, saveNow, // 0.14
    applyEdit, makeEdit, afterShoot, lookCtr, lookChoc, presetLook, drawnCtr, coupleBoost, acceptCollab, COLLAB_RE, fadeTalk, FADE_RE, initiativeLine, publishRelease, staffPower, canAiThumb, keepThumbImage,
    // 0.12: trials before the big steps, couples
    TRIALS, openTrial, rivalFor, trialCheck, startTrial, coupleAsked, stepNote, trialLines, featOK, featPartners, featAsked, askFeat, featText, featDMCtx, applyFeatLine, dropFeat, planCollab, collabPlanned, dedupeCollabs, COLLAB_RE, startVeille, winTrial, loseTrial, heartsAfterAct, trialsOnRumor, tickCouples, announceCouple, keepCoupleSecret,
    runAct, officialize, rumorResult,
    // 0.15: enemies who notice, bad buzz of their own, ties cut, the way out of a cancel, @ suggestions, toasts at the bottom
    foesOf, closeToFoe, foesNotice, BOND_VIBES, selfBuzzOK, startSelfBuzz, sideSelfBuzz, selfBuzzOver, bbByPlayer, cutTies, reconnect,
    mentionAt, mentionPicks, toastBottom, openNotif, openCompose, goTab, SELF_BUZZ_LINE, toast, queueModal,
    isMain, canJoin, joinCast, jobLine, JOIN_REL, candidates, // 0.16: anyone can join the cast
    dateExigence, FAMOUS, // 0.16: the exigence of a date played for real
    // 0.17: ages and maturity, the people who see, the train of the hyyype
    MATU, drawCastAges, drawMatu, initAge, isOlder, ageText, newcomerAge,
    noteSeen, seenCheck, seenCtx, seenNeed, seenNow, witnessAct, ignoredFriends,
    trainAfterAct, startTrain, fuelTrain, tickTrain, endTrain, trainOn, trainMult, hyWord, TRAIN_PTS, estLikes,
    addNotif, addIncomingDM, emoParts, emoSearch, emoOnly, EMO_LIST, EMO_BY, emoRecents,
    // 0.18: the player's secrets, dilemmas, surprise visits
    SEVS, STANCES, mySecrets, secretOf, hiddenSecrets, knowsSecret, secretsKnownBy, cleanSecrets, addSecret, learnSecret, howKnown, hostileTo, digFoes, digOK, digChance, digInto, slipSecret,
    secretOut, exposeSecret, confessResult, answerResult, keepQuiet, proveLie, tickSecrets, liveSecret, secretFromDeal, dealSecretOut, secretKnowCtx, secretsOutCtx, secretLines, proofLines, secretActLines, secretDMLines, confidedIn,
    DIL_P, liveDilemma, dilemmaFree, dilemmaOnDeal, dilemmaAskLines, noteDilemmaAsks, dilemmaDM, dilemmaChoice, passedOverChance, settlePlace, dealDelivered, dossierLine, addDossier, dossierUsed, applyShady, collabFoe, tickDilemmas, dilemmaLines,
    URGES, MOODS, normUrge, normMood, visitOf, liveVisit, canVisit, visitOK, visitCands, visitLine, addVisit, promptVisit, visitTurn, endVisit, refuseVisit, missVisit, visitBadChance, tickVisits, visitCtx, closeModal, dueModal,
    // 0.19: fewer tokens, the levels measured, the two switches
    RULES, RULES_PRIVATE, rulesFor, CTX_KINDS, ficheText, linkBrief, storyQuests, LATE_LINE, LATE_MAX, timeLate, lateNotices, addChronicle, addStoryQuest, promptDateEnd, focusCast,
    VOL, volId, volFor, levelOf, chattyOn, autoLiveOn, lifeK, COST_IN, COST_OUT, costAt, hourCafes, hourCafesOf, setOpt, COMMENTS, COMMENT_IDS, LIVE, LIVE_IDS, commentsOf, liveOf, volIdOf, usesOf, USE_LABELS, livePause, AUTO_IDLE_MS,
    SKILL_MAX, SKILL_TREE, SKILL_IDS, SKILL_CUM, skillNeed, skillLevelOf, skillLevel, skillFx, skillFxAt, ensureSkills, trainSkill, practiseAct, practiseDM, practiseTalk, skillsCtx, skillNow, nextTier,
    BUY_KINDS, BUY_RE, buyTalk, BUY_LINE, applyBuy, buyText, buyLabel, buyTotals, buyPrice, PAY_DEFAULT, sround, talkTranscript,
    makeChat, makeMix, makeFrame, ROUND_MAKERS, mgTime, mgExtra, MG_EXTRA, mgRead, mgClock, mgChars, MG_PACE, clockSec, ROUNDS_FOR, EDIT_FOR, ARCADE_KINDS, REL_RE, WHEN_RE, INTEL_RE, VIBE_IDS,
    importPhoto, removePhoto, ownPhoto, setPhotoDesc, pfpQuiet, pfpAnnounce, pfpPosted, // 0.25.1
    JOB_TIERS, JOB_K, JOB_DIFFS, JOB_FLOP, jobTier, jobQual, jobQ, qOf, jobBest, legendFrom, jobExpect, tierRank, // 0.25.2
    nightTogether, untilMorning, stayOn, endStay, stayCtx, jumpClock, STAY_MS, // 0.25.3
    COND, resaleName, invOf, invItem, invLive, invSold, invAdd, gearToInv, equipInv, receiveGear, fairOf, suggestOf, fanBoost, resaleDemand, priceK, saleSpeed, listItem, unlist, tickResale, sellItem, noticeSale, resoldLine, resaleCtx, giftTalk, GIFT_LINE, receiveGift, roundPrice, SALE_RATE, NOTICE_MS, // 0.26
    dealOf, dealBounds, dealSummary, applyDealLine, declineDeal, // 0.19.1: contracts
    saveToSlot, leaveGame, openGame, minLayer, unminLayer, closeDocked, raiseLayer, dropLayers, layerOpen, winRect, winOf, winSet, winStore, winModal, winFloats, renameSave, saveName, renameGameById, pubDraft, keepPubDraft, // 0.27.7
    pctOf, tierRule, TIER_STEPS, cutRule, flopWord, heldRel, heldWhy, dealLeft, sectorWord, adWord, seriesMultAt, fbMs, payTerms, MG_LABEL, MG_RULE, jobFrom, closeMemb, openMemb, membOf, declineDeal, fmtMoney, gearIssues, // 0.27.8
    ACH, ACH_BY, ACH_GROUPS, unlockAch, tickAch, achGot, achCount, ensureAch, achProgress, achKeep, myTrend, dealSignedAch, leftFor, giftCounted, noteCaught, vibeLine, osDesk, OS_KINDS, productFlop, buy, releaseDone, markViral, accusationResult, apologyResult, commitEval, cancelDate, // 0.28: the achievements, a present
    checkDeals, relLimit, fanPlanned, startShoot, paletteClock, chatScore, gameReader, validGame, shootFallback, leftWorst, orderScore, ownKeys, KEY_OWNERS, tickInvGear, devisFor, keepDevis, dropDevis, genGame, seriesEpisode, // 0.27.6
    upPctOf, upfrontOf, refundUpfront, billSent, dealClash, exclusiveBreach, trySign, dealPayNote, devisStale, staleSay, devisPrice, boughtBefore, stockLike, upShown, readUpfront, NO_UPFRONT, // 0.27.4: the down payment, negotiated
    plannedReleases, planRoom, MAX_PLANNED, playDay, playStartWord, t32On, nrgOf, nrgNow, nrgState, nrgPass, nrgBack, nrgShoot, nrgCtx, nrgLevel, NRG_LEVELS, NRG_DRAIN, nightsIn, sleepPlan, goSleep, tickNrg, ACT_MIN, actTime, payActTime, msgMin, postMin, minWord, tickTold, noteQuiet, TELL_MS, awakeTs, dispoOf, rythmeOf, asleepUntil, bizOpensAt, onlineNow, setAway, deferDM, tickReplies, answerDue, dmAnswer, groupDispo, tickGroups, answerGroupDue, groupAnswer, prod32, PROD_H, PROD_BIG, HOT_MS, DISPO_SPEED, openWatch, hourOf, alarmWord, addContact, brandOfContact, talentAskLine, brandOffersTalent, dmCareerLines, tdealByContact, // 0.32: le temps qui passe; an offer the agent asks for
    CLASHES, CLASH_IDS, clashOf, normClash, guessClash, COEUR_EXT, COEUR_W, NOT_OPEN, drawTraits, drawCastTraits, applyPlanTraits, ensureTraits, planWords, traitsLegend, traitsAsk, newcomerTraits, traitLines, knownLine, rhythmLine, cadence, fmtDays, rosterTrait, rosterLegend, traitScale, clashOut, GRUDGE_MS, PACE_K, likesSpeed, cfHot, coolOf, COOLS, // 0.32: who they are, beyond their heart
    isOpen, okWith, troupleOf, openLine, openOutLines, applyOpenLine, troupleFormed, worriers, worry, worryDM, worryFresh, WORRY_MS, HEART_INTIMACY, NIGHT_RE, // 0.32: open, a throuple; the worriers
    STALK_MIN, STALK_P, stalkOf, stalkerOf, isStalker, stalkBirth, tickStalkers, stalkPlan, stalkArrives, stalkStage, spurned, stalkCore, STALK_SIGN_LINE, stalkPublicLines, stalkSign, applyStalkLine, stalkPhoto, stalkSabotage, doubtLines, doubtWalk, stalkAccuseLines, stalkAccusation, stalkUnmask, stalkVisit, STALK_PHOTO_GAP, STALK_SABO_GAP, author, // 0.32: the ones who follow the player
     toggleReplyLike, toggleLike, levelUp, gainXP, threadLines, promptGroup, noteLike, unnoteLike, likeWord, likesSince, MSG_REACTS, setReact, reactTag, pendingReacts, tickNewChars, genNewChar, pinCtx, vagueAnnounce, vagueReleasesOut, annOf, sameRelease, annTopic, annMoments, annResolve, annWhy, VID_TALK_RE, postWhen, PF, advanceRelease, advanceChoices, trimReleases, checkReleases, postponeRelease, dropRelease, // 0.27.4: several releases planned
    openPalette, paletteKey, paletteApply, paletteOn, paletteNum, tapCash, SWATCH_ROW, checkPayout, billGear, // 0.27.4: the palette
    startPractice, PRACTICE_GAMES, paletteLines, paletteNudge, paletteVal, PALETTE_TITLES, // 0.27.6: the practice rounds (0.27.9: the palette's window)
    // 0.20: the gear, the connection, the subscriptions, the start
    GEAR, GEAR_KINDS, NETS, SUBS, NEW_GEAR, PERKS, FLAWS, newGear, legacyGear, migrateGear, mkItem, netNow, canMake, canMakeR, makeableWhat, gearBrief, gearViewsMult, gearPostMult, gearEdit,
    gearOnRelease, gearWear, breakItem, buyGear, buyNew, repairGear, repairCost, fixGear, subscribe, unsubscribe, payCut, subOffer, monthlyCost, billGear, tickGear, launchGear, rollGearHour,
    theft, nextLaunchAt, gearIssues, outagePostpone, easyGear, usable, subOn, hasBonus, firstBill,
    promptDevis, readDevis, makeDevis, devisTotal, genDevis, payDevis, devisNeeded, pitchBrand, ownsItem, devisKey, devisStock, sameThing, bigWords, devisDeals,
    SCAM_KINDS, CRITIC, scamChance, scamOffer, brandSheet, sheetLine, payTerms, AGENT_CEIL, dealSize, agentReview, dealHard, agentGamble, scamBeforeSign, scamAfterSign,
    parseMoney, moneyIn, MONEY_MAX, laterChoices, earlyMove, canPostpone, keptToInv, prodMult, prodLine, giftMem, FIXES, REP_IDS, noJson, dmBusy, PR_CAP, lightTier, settledGame, exportSum, ACH_ICONS, achIcon, writeForMe, TAG_RE, // 0.28.1 (the studio's tests)
    toastsOn, toastHold, TOAST_Q, TOAST_ON, openAch, fmtPast, wordCut, fmtShort, fmtMoneyShort, postCut, POST_MAX, exportAny, importAny, importErr, winMinH, WIN_GRAB, meetWords, agoLabel, FEED_PAGE, postsWithTag, revealedPosts, // 0.28.1: the screens
    penalClause, scamOnDeliver, tickScams, criticExposes, brandLove, loyalOffer, scamCtx, brandRumorLine, genShoot, postponeRelease, dropRelease, trimDeals, NOISE_FIX, growthK, grow, dmCareerCtx, NEW_BY_ID, subPrice, franchiseOf, gearValue, FRANCHISE, CPM, pickSector, sectorWeights, sectorHint, adsShy, pickGift, sendGift, GIFT_GEAR, ADV_RPM, ADS_STATES, DECL, adsOf, declOn, nicheAdv, adsStrike, liveStrikes, demonetized, appealAds, checkAppeals, STRIKE_MAX, monetized, warmOf, warmMove, warmWord, warmGain, fanMessage, fanAnswered, fanVideoDone, fanList, fansWaiting, fanQuestions, fanRegulars, tickCommu, commuCtx, postCommu, FAN_LINE, fanLineOK, qaTopic, DON_SHARE, donOK, donTotal, liveDonations, thankDonors, DON_LINE, fitOf, FIT_VIEWS, FIT_WORDS, fitPct, gameDay, MEMB_PF, MEMB_PRICES, MEMB_PERKS, membOf, membOn, membCan, membTarget, membNet, openMemb, closeMemb, membDelivered, membMissing, tickMemb, membCtx, MERCH, MERCH_MIN, merchOK, openDrop, launchDrop, tickMerch, restock, stopDrop, merchCtx, merchLine, unitCost, // 0.29: the shop that stays open
    agencyOf, talentOf, talentOn, talentsOn, agencyFounded, talentCap, tdealOf, agentWhy, askAgent, agentText, applyAgentLine, endTalent, talentFee, makeTalentOffer, askTalentDeal, tdealDraft, declineTdeal, applyTdealAnswer, signTdeal, refuseTdeal, applyTdealLine, talentPosted, deliverTdeal, applyBehindBack, claimBehind, applyRival, agencyWhy, foundAgency, tickAgency, agencyCtx, agentDMCtx, agentDMLines, tdealBrandCtx, agencyRefreshLines, applyAgencyLine, cutOf, AGENT_CUTS, FOUND_COST, TALENT_MIN, // 0.31: the agent, the agency
    dayStat, itemDay, noteSale, revQ, writeReview, reviewDay, seedShopStats, merchSaid, merchTagLine, shopVerdict, revTop, revLabel, avgStars, starsN, shopSlim, REV_RATE, REV_WHY, REV_LIKE, STAT_DAYS, // 0.30.2: the stats of the shop
    shopOf, shopItems, shopLive, shopShown, prepItem, setPrice, pauseItem, resumeItem, retireItem, launchable, launchList, qualityOf, prodFair, marginOf, prodUpfront, sellProd, payShop, shopSeason, curveAt, audienceOf,
    collabOK, collabText, merchDMCtx, applyCollabLine, contestLine, addDesign, contestStarted, contestClose, collabSolo, restockWhy, retireText, claimsFrance, shopSteps, dayEndAt, launchAll, MERCH_MAX, PRECO_DAYS, badBatch, precoStep, madeNow, signingStep, popupStep, MERCH_CHARITY, qtysOf, planSigning, planPopup, fakeAction, counterfeit, exposeClaim, qualityComplaint, FR_CLAIM, MERCH_TIERS, ORIGINS, MATERIALS, PRINTS, MODES, BOOK_BY, POPUP, SIGNING_COST, MERCH_QTY, MERCH_LIMITED, shopDays, prodName, prodYour, prodHis, madeOf, shopTierKeys, shopNextTier, clockOff, hasStaff,
    prepEnd, END_PREP, removeGameById, // 0.28.1: the end of a date written ahead; a game removed
    emoNodes, emoKids, EMO_SKIP, htmlRaw, BIO_MAX, AVATAR_EMOJIS, ourEmoji, avatarEmoji, AVATAR_ASK, addRegular, // 0.29: our stickers in every text; the bio; the avatars
  };
}
const markSeen = () => { if (S.game) S.game.lastSeenAt = Date.now(); saveNow(); };
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') markSeen(); });
for (const ev of ['pointerdown', 'keydown', 'wheel']) window.addEventListener(ev, () => { S.lastInputAt = Date.now(); }, { passive: true, capture: true }); // the player is here (0.10)
window.addEventListener('focus', () => { S.lastInputAt = Date.now(); if (S.phase === 'game') update(false); }); // 0.23.1: back on Hype, the network living on its own comes back too
window.addEventListener('pagehide', markSeen);

boot();
