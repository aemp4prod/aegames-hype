// After the 0.28.1, end to end, in Chromium against the built hype.html with the mocked Claude runtime:
// - our stickers in every text the game shows, not only in posts and messages: a relationship status (« 😏 Flirt »), a
//   chip, a button, a list; what a field, a menu or an attribute shows stays the system's; an emoji with a skin tone or
//   inside a combined emoji stays whole (the system's); each template looks only at what it made itself;
// - the relationship statuses all have their sticker;
// - the player's bio: added after the creation, changed, cleared, at any time; the characters read the new one.
// It also lists the emojis the game still shows without a sticker of ours on its main screens (information only).
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v282.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v282');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(process.env.PAGE || path.join(ROOT, 'hype.html'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const UMD = fs.readFileSync(process.env.UMD, 'utf8');
const SKELETON = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0}</style></head><body>${body}</body></html>`;

const errors = [];
const checks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let shotN = 0;
const check = (name, ok, info) => { checks.push([ok ? 'PASS' : 'FAIL', name]); console.log(ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)); };
async function shot(page, name) { shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
const G = (page, fn, arg) => page.evaluate(fn, arg);
async function dismiss(page) { for (let k = 0; k < 8 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }

async function newPage(browser, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 700, colorScheme: 'light' });
  await ctx.addInitScript(MOCK);
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith('https://hype.test')) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: SKELETON(PAGE) });
    if (url.includes('cdn.jsdelivr.net/npm/htm@3.1.1/preact/standalone.umd.js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: UMD });
    if (url.includes('fonts.googleapis.com')) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    return route.abort();
  });
  await page.goto('https://hype.test/');
  await page.waitForSelector('text=Nouvelle partie');
  return { ctx, page };
}
async function newGame(page, identity) {
  await page.locator('button', { hasText: 'Nouvelle partie' }).first().click();
  await page.locator('button.world', { hasText: 'Académie Lumen' }).first().click();
  await page.waitForSelector('#pn');
  await page.fill('#pn', 'Mila Flux');
  await page.locator('.seg button', { hasText: /^Elle$/ }).first().click();
  await page.fill('#pi', identity);
  await page.locator('.tier', { hasText: 'Sans limite' }).first().click();
  await page.check('#p18');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=Qui sera ton premier abonné', { timeout: 20000 });
  await page.locator('.cast-card.pick', { hasText: 'Théo' }).click();
  await page.click('.cast-cta button');
  await page.waitForSelector('.post');
  await sleep(1500);
  await dismiss(page);
}
// The emojis shown as text (drawn by the system) in what is on screen, fields and menus left aside.
const nativeEmojis = (page) => G(page, () => {
  const out = {};
  const RE = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|[\u{1F3FB}-\u{1F3FF}])?(?:‍\p{Extended_Pictographic}️?)*/gu;
  const TEXTY = /^[©®™‼⁉↔↕↖↗↘↙↩↪▪▫▶◀◻◼♠♣♥♦♡♫⌚⌛]$/u; // (symbols a font draws as text)
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const el = n.parentElement;
    if (!el || el.closest('textarea,option,select,script,style,[contenteditable],.emo-t')) continue; // (.emo-t: under our sticker)
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    for (const m of n.data.matchAll(RE)) {
      if (TEXTY.test(m[0])) continue;
      (out[m[0]] = out[m[0]] || []).push(String(el.className || el.tagName).slice(0, 30) + ' « ' + n.data.trim().slice(0, 40) + ' »');
    }
  }
  return out;
});

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 860 });
  await newGame(page, 'Une créatrice qui teste des potions');
  await G(page, () => { const H = window.__hype, g = H.S.game; for (const c of H.mains(g, false)) c.unlocked = true; });

  // ---------- a text child gets our stickers; fields, menus, attributes do not; skin tones and combined emojis stay whole ----------
  const parts = await G(page, () => {
    const H = window.__hype, out = {};
    const kinds = (v) => (Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? 's' : x && x.type)).join(',') : typeof v);
    out.flirt = kinds(H.emoNodes('Coup de foudre · +100 · 😏 Flirt'));
    const st = H.emoNodes('😏 Flirt')[0];
    out.kept = st.props.class === 'emo emo-s' && st.props.children.props.children === '😏' && /^url\("data:image\/svg\+xml/.test(st.props.style.backgroundImage); // (the emoji stays in the text, its sticker over it)
    out.vs = kinds(H.emoNodes('Rivalité ⚔️ ok ❤️ fin'));
    out.none = H.emoNodes('rien ici') === 'rien ici';
    out.tone = H.emoNodes('bravo 👍🏽') === 'bravo 👍🏽';
    out.zwj = H.emoNodes('❤️‍🔥 feu') === '❤️‍🔥 feu';
    const opt = H.emoKids(H.htmlRaw`<select><option>${'😏 Flirt'}</option></select>`);
    out.option = typeof opt.props.children.props.children === 'string';
    const ta = H.emoKids(H.htmlRaw`<textarea value=${'😏'}>${'😏'}</textarea>`);
    out.textarea = ta.props.children === '😏';
    const b = H.emoKids(H.htmlRaw`<b title=${'😏 titre'}>${'😏'} ${'gras'}</b>`);
    out.attr = b.props.title === '😏 titre';
    out.bold = [b.props.children].flat(9).some((x) => x && x.props && x.props.class === 'emo emo-s');
    const again = H.emoKids(b);
    out.once = again === b;
    return out;
  });
  check('a text child gets our stickers (« 😏 Flirt », with the variation selector or not), the emoji kept in the text under it; a text without ours stays as it is; a skin tone or a combined emoji stays whole; a menu, a field or an attribute keeps the system\'s; each part is looked at once',
    parts.flirt === 's,hype-emo,s' && parts.kept && /hype-emo/.test(parts.vs) && parts.none && parts.tone && parts.zwj && parts.option && parts.textarea && parts.attr && parts.bold && parts.once, parts);

  // ---------- the relationship statuses, where they show ----------
  await G(page, () => {
    const H = window.__hype, g = H.S.game, ms = H.mains(g);
    ms[0].vibe = 'flirt'; ms[0].rel = 100;
    if (ms[1]) { ms[1].vibe = 'rival'; ms[1].rel = -40; }
    if (ms[2]) { ms[2].vibe = 'froid'; ms[2].rel = -10; }
    H.update();
  });
  await sleep(500);
  const seenAs = (sel) => G(page, (q) => [...document.querySelectorAll(q)].slice(0, 3).map((b) => { const c = b.cloneNode(true); const ours = [...c.querySelectorAll('.emo-s')].map((x) => x.textContent); for (const x of c.querySelectorAll('.emo-s')) x.remove(); return { text: c.textContent.replace(/\s+/g, ' ').trim(), ours }; }), sel); // (ours: under a sticker; text: what the system draws)
  const side = await seenAs('.panel .mini-char');
  await shot(page, 'statuses-side');
  await G(page, () => window.__hype.goTab('profile'));
  await sleep(500);
  const prof = await seenAs('.rel-row');
  await shot(page, 'statuses-profile');
  const vibesDrawn = await G(page, () => { const H = window.__hype; return Object.entries(H.VIBES).filter(([, v]) => H.emoNodes(v.emoji) === v.emoji).map(([k, v]) => k + ' ' + v.emoji); });
  check('the side list and the profile show the statuses with our stickers (« 😏 Flirt », not the system\'s 😏)',
    side.length && side[0].ours.includes('😏') && !side[0].text.includes('😏') && prof.length && prof.some((r) => r.ours.includes('😏')) && !prof.some((r) => r.text.includes('😏')), { side, prof });
  console.log('INFO relationship statuses still drawn by the system (no drawing for now):', vibesDrawn.join(', ') || 'none');

  // ---------- the avatars the AI gives: ours ----------
  const avatars = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    const ours = (e) => !e || H.ourEmoji(e);
    out.list = H.AVATAR_EMOJIS.length >= 100 && H.AVATAR_EMOJIS.every((e) => H.ourEmoji(e)) && !H.AVATAR_EMOJIS.includes('❌');
    out.chars = Object.values(g.chars).filter((c) => !ours(c.emoji)).map((c) => c.handle + ' ' + c.emoji);
    out.npcs = Object.values(g.npcs).filter((n) => !ours(n.emoji)).map((n) => n.handle + ' ' + n.emoji);
    out.keep = H.avatarEmoji('😎', 'x') === '😎' && H.avatarEmoji('❤️', 'x') === '❤️';
    const a = H.avatarEmoji('🐙', 'theo.marlin'), b = H.avatarEmoji('🐙', 'theo.marlin');
    out.mapped = a === b && H.ourEmoji(a) && a !== '🐙';
    out.none = H.avatarEmoji('', 'x', '') === '' && H.avatarEmoji('pas un emoji', 'x', '') === '';
    out.media = H.avatarEmoji('📰', 'gazette', '📣') === '📣';
    out.ask = H.promptNewChar(g).includes(H.AVATAR_EMOJIS.join(' '));
    out.reg = H.addRegular(g, { name: 'Un habitué', handle: 'habitue.test', emoji: '🦖', bio: 'commente tout' });
    out.regEmo = out.reg ? out.reg.emoji : null;
    out.regOurs = !!out.reg && H.ourEmoji(out.reg.emoji);
    out.reg = !!out.reg;
    return out;
  });
  check('the avatars the AI gives are ours: the list it picks from (asked in the prompt), every character, media and regular of a new game; one of ours is kept, another becomes one of ours (always the same for the same name), none stays none; a media without one of ours gets the megaphone',
    avatars.list && !avatars.chars.length && !avatars.npcs.length && avatars.keep && avatars.mapped && avatars.none && avatars.media && avatars.ask && (!avatars.reg || avatars.regOurs), avatars);

  // ---------- the bio ----------
  const before = await G(page, () => ({ bio: window.__hype.S.game.player.bio, add: !!document.querySelector('.bio-add'), shown: !!document.querySelector('.bio-row') }));
  await page.click('.bio-add');
  await sleep(200);
  const focused = await G(page, () => document.activeElement && document.activeElement.matches('.bio-edit textarea'));
  await page.fill('.bio-edit textarea', 'Potions, paillettes   et mauvaises idées 😏');
  await shot(page, 'bio-editing');
  await page.click('.bio-edit .btn-hot');
  await sleep(300);
  const added = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    return { bio: g.player.bio, row: !!document.querySelector('.bio-row'), sticker: [...document.querySelectorAll('.bio-row .bio .emo-s')].some((x) => x.textContent === '😏'), text: (document.querySelector('.bio-row .bio') || {}).textContent, ctx: H.ctxText(g).includes('Sa bio : Potions, paillettes et mauvaises idées 😏') };
  });
  await shot(page, 'bio-added');
  await page.click('.bio-ed');
  await sleep(200);
  await page.fill('.bio-edit textarea', 'Autre chose');
  await page.keyboard.press('Escape');
  await sleep(200);
  const kept = await G(page, () => ({ bio: window.__hype.S.game.player.bio, editing: !!document.querySelector('.bio-edit') }));
  await page.click('.bio-ed');
  await sleep(200);
  await page.fill('.bio-edit textarea', 'Je teste des potions pour vous ✨');
  await page.keyboard.press('Enter');
  await sleep(300);
  const changed = await G(page, () => ({ bio: window.__hype.S.game.player.bio, ctx: window.__hype.ctxText(window.__hype.S.game).includes('Sa bio : Je teste des potions pour vous ✨') }));
  const long = 'x'.repeat(200);
  await page.click('.bio-ed');
  await sleep(200);
  await page.fill('.bio-edit textarea', long);
  const typed = await G(page, () => document.querySelector('.bio-edit textarea').value.length);
  await page.fill('.bio-edit textarea', '   ');
  await page.click('.bio-edit .btn-hot');
  await sleep(300);
  const cleared = await G(page, () => ({ bio: window.__hype.S.game.player.bio, add: !!document.querySelector('.bio-add'), ctx: window.__hype.ctxText(window.__hype.S.game).includes('Sa bio') }));
  check('the bio: « Ajouter une bio » when there is none, the field ready to type, saved tidied (spaces) and shown with our stickers, the characters read it; Escape keeps the old one; Enter saves the new one; 140 characters at most; emptied, it is gone (and « Ajouter une bio » is back)',
    before.bio === '' && before.add && !before.shown && focused && added.bio === 'Potions, paillettes et mauvaises idées 😏' && added.row && added.sticker && added.text === added.bio && added.ctx
      && kept.bio === added.bio && !kept.editing && changed.bio === 'Je teste des potions pour vous ✨' && changed.ctx && typed === 140 && cleared.bio === '' && cleared.add && !cleared.ctx,
    { before, focused, added, kept, changed, typed, cleared });

  // ---------- what is still drawn by the system on the main screens (information) ----------
  const seen = {};
  for (const tab of ['feed', 'studio', 'quests', 'profile', 'dms', 'notifs']) {
    await G(page, (t) => { try { window.__hype.goTab(t); } catch (e) { /* not a tab here */ } }, tab);
    await sleep(500);
    const o = await nativeEmojis(page);
    for (const [k, v] of Object.entries(o)) (seen[k] = seen[k] || []).push(tab + ' · ' + v[0]);
  }
  console.log('INFO still drawn by the system on the main screens:', Object.keys(seen).length ? Object.entries(seen).map(([k, v]) => `${k} (${v[0]})`).join(' ; ') : 'none');

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  console.log(`\n${checks.filter((c) => c[0] === 'PASS').length}/${checks.length} PASS`);
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
