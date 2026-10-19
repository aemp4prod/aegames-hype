// 0.25.3 end to end, in Chromium against the built hype.html with the mocked Claude runtime: a night together.
// - an evening that ends in each other's arms asks the end of the evening for the morning (not a message « en rentrant »);
// - the night passes (the clock goes to the next morning, no other AI call); the morning is told in their messages and
//   kept in the log of the evenings;
// - the player is still there: a banner above the feed and in their conversation, « Rentrer chez toi »; the one they
//   are with talks as someone who is there; the others know it only through the story (private: only those who know);
// - it ends when the player goes home, or late in the morning; at the player's place, the same the other way round;
// - an evening that does not end that way changes nothing (the message on the way home, no jump of the clock).
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v253.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v253');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(process.env.PAGE || path.join(ROOT, 'hype.html'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const UMD = fs.readFileSync(process.env.UMD, 'utf8');
const SKELETON = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;

/* ---------- small striped PNGs, as photos ---------- */
function crc32(buf) { let crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { let c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function hsl(h, s, l) { const a = s * Math.min(l, 1 - l); const f = (n) => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; }
function png(w, h, hue) {
  const [r, g, b] = hsl(hue, 0.65, 0.55), [r2, g2, b2] = hsl((hue + 40) % 360, 0.7, 0.3);
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3, s = (x + y) % 14 < 5; raw[o] = s ? r2 : r; raw[o + 1] = s ? g2 : g; raw[o + 2] = s ? b2 : b; }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const file = (name, w, h, hue) => ({ name, mimeType: 'image/png', buffer: png(w, h, hue) });

const errors = [];
const checks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let shotN = 0;
const check = (name, ok, info) => { checks.push([ok ? 'PASS' : 'FAIL', name]); console.log(ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)); };
async function shot(page, name) { shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
const G = (page, fn, arg) => page.evaluate(fn, arg);
// (never a profile photo's card: the tests answer it themselves)
async function dismiss(page) { for (let k = 0; k < 6 && (await page.$('.modal:not(:has(.pfp-card))')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.devis); })) await sleep(250); };
const clearToasts = (page) => G(page, () => { const H = window.__hype; H.S.toasts.forEach((t) => { t.until = 0; }); H.update(false); });

async function newPage(browser, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true, colorScheme: 'light' });
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
const toProfile = (page) => G(page, () => { const H = window.__hype; H.S.stack = []; H.goTab('profile'); H.update(); });
// A photo picked (from the avatar's camera or the section), its card up.
async function pick(page, sel, f) {
  await dismiss(page);
  await toProfile(page);
  await page.waitForSelector(sel, { state: 'attached' });
  await page.setInputFiles(sel, f);
  await page.waitForSelector('.modal .pfp-card .pfp-big img', { timeout: 10000 });
}
async function cardBtn(page, text) { await page.locator('.modal .pfp-card .btn', { hasText: text }).click(); await sleep(400); }
// The composer's own controls, a stray modal (a level-up, a newcomer) put away first.
async function tap(page, sel, how = 'click') { await dismiss(page); if (how === 'check') await page.check(sel); else await page.click(sel); }
const lastMine = (page) => G(page, () => {
  const g = window.__hype.S.game, p = g.posts.filter((x) => x.a === 'p').sort((a, b) => b.ts - a.ts)[0];
  return p ? { id: p.id, text: p.text, own: (p.photo && p.photo.own) || [], desc: p.photo ? p.photo.desc : '', pfp: p.pfp || null, pending: !!p.pending, replies: p.replies.length } : null;
});
const actPrompt = (page, n0) => G(page, (n) => window.__prompts.slice(n).filter((x) => x.includes('Le joueur publie ce post')).pop() || '', n0);
async function publish(page) {
  await dismiss(page);
  await clearToasts(page);
  await page.locator('.layer-head button', { hasText: 'Publier' }).click();
  await sleep(800);
  await idle(page, 30000);
  await sleep(1200);
  await dismiss(page);
}


// An evening of the agenda, played as a talk: faded (they stay together) or not.
const mkEvening = (page, o) => G(page, (a) => {
  const H = window.__hype, g = H.S.game, t = H.charByHandle(g, 'theo.marlin');
  Object.assign(t, { age: 24, vibe: 'couple', officiel: a.pub ? 'public' : 'secret', rel: 60, unlocked: true, coeur: 'serein' });
  const ev = { id: a.id, kind: 'rdv', c: t.id, player: true, what: 'Un dîner aux chandelles', diff: 'facile', due: Date.now() - 3600000, state: 'scheduled',
    played: { tier: 'top', score: 0.86, diff: 'facile', at: Date.now() - 600000, kind: 'talk' },
    talk: { scene: 'Une petite table au fond, des bougies partout.', turn: 5, max: 5, reacts: [], used: ['bisou'], faded: !!a.faded,
      lines: [{ who: 'c', text: 'tu es venu·e !' }, { who: 'p', text: 'évidemment', r: 'charme' }, ...(a.faded ? [{ who: 'p', text: 'Tu restes dormir ?', last: true, r: 'charme' }, { who: 'n', text: 'La suite appartient à leur intimité.' }] : [{ who: 'p', text: 'On se revoit vite ?', last: true, r: 'charme' }])] } };
  g.events.push(ev);
  return t.id;
}, o);
const clockOf = (page) => G(page, () => { const H = window.__hype, d = H.gameDate(Date.now()); return { h: d.getHours(), m: d.getMinutes(), off: H.S.game.clockOff || 0 }; });

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);
  await newGame(page, 'Étudiante en deuxième année, fan de potions');

  // ---------- the evening ends in each other's arms: the night, then the morning ----------
  const tid = await mkEvening(page, { id: 'evN1', faded: true });
  const c0 = await clockOf(page);
  const n0 = await G(page, () => window.__prompts.length);
  await G(page, () => window.__hype.endDate(window.__hype.S.game.events.find((x) => x.id === 'evN1')));
  await idle(page);
  await sleep(600);
  const c1 = await clockOf(page);
  const r1 = await G(page, ([id, n]) => {
    const H = window.__hype, g = H.S.game, t = g.chars[id], convo = g.dms[id].msgs;
    const ps = window.__prompts.slice(n), p = ps.find((x) => x.includes('TÂCHE : LA FIN DU RENDEZ-VOUS')) || '';
    const mo = convo.filter((m) => m.sys === 'morning'), log = g.dateLog.find((x) => x.id === 'evN1');
    return { calls: ps.length, ask: p.includes('{"t":"morning"') && !p.includes('en rentrant'), nuit: /ils passent la nuit ensemble/.test(p), morning: mo.length === 1 && mo[0].where === 'c' && /deux cafés/.test(mo[0].text),
      home: convo.some((m) => !m.me && !m.sys && m.r === 1), stay: g.stay && { c: g.stay.c === id, where: g.stay.where, on: H.stayOn(g) }, mem: (t.mem || []).some((m) => /a dormi chez moi/.test(m.t)),
      log: !!(log && log.morning && /deux cafés/.test(log.morning.text)), text: log ? /Le lendemain matin, chez Théo : /.test(H.dateLogText(g, log)) : false, dm: H.S.stack.some((l) => l.t === 'dm' && l.id === id) };
  }, [tid, n0]);
  const dmView = await G(page, () => { const L = [...document.querySelectorAll('.layer')].pop(); return { card: (L.querySelector('.dm-card.morning .evt-kind') || {}).textContent || '', line: (L.querySelector('.bubbles .stay-line') || {}).textContent || '' }; });
  await shot(page, 'morning-dm');
  check('an evening that ends in each other’s arms: its end asks for the morning (not a message on the way home), one call only; the night passes (the clock goes to 8 h – 9 h 30 the next day); the morning is told in their messages and kept in the log; they remember it',
    r1.calls === 1 && r1.ask && r1.nuit && r1.morning && !r1.home && c1.off > c0.off && (c1.h === 8 || (c1.h === 9 && c1.m <= 31)) && r1.mem && r1.log && r1.text && r1.dm
      && /Le lendemain matin · chez Théo/.test(dmView.card) && /Tu es chez Théo depuis cette nuit/.test(dmView.line) && /Rentrer chez toi/.test(dmView.line), { r1, c0, c1, dmView });

  // ---------- still there: what everyone's prompts know ----------
  const ctx = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, t = g.chars[id], o = H.mains(g).find((x) => x.id !== id);
    const dm = H.promptDM(g, t, [], 'bien dormi ?'), pub = H.ctxText(g), other = H.ctxText(g, { kind: 'private', about: o, focus: new Set() });
    return { dm: /Vous avez passé la nuit ensemble chez Théo : ce matin, vous êtes encore ensemble chez Théo/.test(dm) && /de vive voix/.test(dm),
      pub: /Ce matin, le joueur est encore chez @theo\.marlin, où il a passé la nuit \(c’est privé : seuls ceux qui sont au courant de leur histoire peuvent y faire allusion\)/.test(pub),
      other: /Ce matin, le joueur est encore chez @theo\.marlin/.test(other) };
  }, tid);
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.goTab('feed'); H.update(); });
  await page.waitForSelector('.stay-line', { timeout: 5000 });
  await sleep(300);
  await shot(page, 'morning-feed');
  const feedLine = await page.textContent('.stay-line');
  check('still there: they talk as someone who is with the player; the story knows it (private: only those who know may allude to it); a banner above the feed',
    ctx.dm && ctx.pub && ctx.other && /Tu es chez Théo depuis cette nuit/.test(feedLine), Object.assign({ feedLine }, ctx));

  // ---------- going home ----------
  await dismiss(page);
  await page.click('.stay-line .linkbtn');
  await sleep(400);
  const home = await G(page, () => { const H = window.__hype, g = H.S.game; return { on: H.stayOn(g), end: !!g.stay.end, line: !!document.querySelector('.stay-line'), pub: /encore chez @theo/.test(H.ctxText(g)) }; });
  check('« Rentrer chez toi »: the morning is over, for the banner and for the prompts', !home.on && home.end && !home.line && !home.pub, home);

  // ---------- at the player's, and the end of the morning on its own ----------
  await G(page, () => { window.__mockWhere = 'p'; });
  await mkEvening(page, { id: 'evN2', faded: true, pub: true });
  await G(page, () => window.__hype.endDate(window.__hype.S.game.events.find((x) => x.id === 'evN2')));
  await idle(page);
  await G(page, () => { const H = window.__hype; H.S.stack = []; H.goTab('feed'); H.update(); });
  await page.waitForSelector('.stay-line', { timeout: 5000 });
  const p2 = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, line = document.querySelector('.stay-line').textContent;
    const pub = H.ctxText(g), dm = H.promptDM(g, g.chars[id], [], 'tu veux un café ?');
    const before = H.stayOn(g);
    H.jumpClock(g, H.STAY_MS + 60000); // (late in the morning)
    return { line, pub: /Ce matin, le joueur a encore chez lui @theo\.marlin, qui y a passé la nuit\./.test(pub), dm: /Vous avez passé la nuit ensemble chez le joueur/.test(dm), before, after: H.stayOn(g) };
  }, tid);
  await G(page, () => { window.__mockWhere = null; });
  check('a night at the player’s: « Théo a dormi chez toi · Lui dire au revoir »; a public couple: no secret to keep; late in the morning it ends on its own',
    /Théo a dormi chez toi/.test(p2.line) && /Lui dire au revoir/.test(p2.line) && p2.pub && p2.dm && p2.before && !p2.after, p2);

  // ---------- an evening that does not end that way: nothing changes ----------
  await mkEvening(page, { id: 'evN3', faded: false });
  const c3 = await clockOf(page);
  const n3 = await G(page, () => window.__prompts.length);
  await G(page, () => window.__hype.endDate(window.__hype.S.game.events.find((x) => x.id === 'evN3')));
  await idle(page);
  const c4 = await clockOf(page);
  const r3 = await G(page, ([id, n]) => { const H = window.__hype, g = H.S.game, p = window.__prompts.slice(n).find((x) => x.includes('TÂCHE : LA FIN DU RENDEZ-VOUS')) || ''; return { home: /en rentrant/.test(p), morning: p.includes('{"t":"morning"'), cards: g.dms[id].msgs.filter((m) => m.sys === 'morning').length, stay: H.stayOn(g) }; }, [tid, n3]);
  check('an evening that does not end in each other’s arms: the message on the way home, no morning, the clock where it was',
    r3.home && !r3.morning && r3.cards === 2 && !r3.stay && c4.off === c3.off, Object.assign({ c3, c4 }, r3));

  console.log('\nERRORS', errors.length ? errors.slice(0, 10) : 'none');
  const ok = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`CHECKS ${ok}/${checks.length}`);
  console.log(`${ok}/${checks.length} PASS`);
  await browser.close();
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
