// 0.31, in Chromium against the built hype.html with the mocked Claude runtime: after a scene cut (« Ce moment ne regarde
// pas les voyeurs. », « Un peu plus tard… »), the character picks the conversation back up, in the same answer (no call more):
// - an evening: their line {"t":"apres"} (or a "say" written after the cut) comes after « Un peu plus tard… »;
// - their messages, together in person: their message after the cut comes after it, a little later (one more allowed);
// - when they did not (an answer without it, the modest cut without a call): « À toi de reprendre la conversation. »
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v31.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v31');
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
async function shot(page, name) { await page.evaluate(() => { const H = window.__hype; if (H && H.S) { H.S.toasts.length = 0; H.update(); } }); await sleep(120); shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
const G = (page, fn, arg) => page.evaluate(fn, arg);
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.dms || b.story || b.groups); })) await sleep(150); await sleep(300); };
async function dismiss(page) { for (let k = 0; k < 8 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }
const clear = (page) => G(page, () => { const H = window.__hype; H.S.stack = []; H.S.modals.length = 0; H.S.toasts.length = 0; H.S.storyView = null; H.update(); });

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
async function newGame(page) {
  await G(page, () => { window.__psyPick = 'zara.vey'; });
  await page.locator('button', { hasText: 'Nouvelle partie' }).first().click();
  await page.locator('button.world', { hasText: 'Académie Lumen' }).first().click();
  await page.waitForSelector('#pn');
  await page.fill('#pn', 'Mila Flux');
  await page.locator('.seg button', { hasText: /^Elle$/ }).first().click();
  await page.fill('#pi', 'Une créatrice qui teste des potions');
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
const ELL = 'Ce moment ne regarde pas les voyeurs.', LATER = 'Un peu plus tard…';
// One exchange of the evening, the character's answer mocked; what the evening holds afterwards.
async function talk(page, id, text, lines) {
  await G(page, (lines) => { window.__mockOnce = [{ has: 'LE RENDEZ-VOUS, EN VRAI', lines }]; }, lines);
  const n0 = await G(page, () => window.__prompts.length);
  await G(page, (a) => window.__hype.talkTurn(window.__hype.S.game.events.find((e) => e.id === a.id), a.text), { id, text });
  await idle(page);
  await sleep(300);
  return G(page, (a) => {
    const g = window.__hype.S.game, ev = g.events.find((e) => e.id === a.id), T = ev.talk;
    const hint = document.querySelector('.layer .talk-hint'), them = [...document.querySelectorAll('.layer .talk-line.them .bubble')].pop();
    return { turn: T.turn, ell: T.ell || 0, played: !!ev.played, tail: T.lines.slice(-3).map((x) => (x.who === 'c' ? 'c:' : x.who + ':') + (x.text || '')), pr: window.__prompts.slice(a.n0).find((x) => x.includes('LE RENDEZ-VOUS, EN VRAI')) || '', hint: hint ? hint.textContent : '', lastBubble: them ? them.textContent : '' };
  }, { id, n0 });
}

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);

  // ---------- an evening: the scene cuts, then they speak again ----------
  const ev = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin'), t = Date.now();
    Object.assign(c, { unlocked: true, asleep: undefined, rel: 70, cool: null, vibe: 'couple', coeur: 'serein', pace: { at: t - 4 * 86400000, v: 'couple' } });
    c.dates = Math.max(2, c.dates || 0);
    g.events = (g.events || []).filter((e) => !(e.player && e.state === 'scheduled'));
    const e = H.addEvent(g, { by: 'theo.marlin', what: 'une soirée chez lui, un film et un plaid', kind: 'rdv', in: 2 });
    e.due = Date.now() - 60000;
    return e.id;
  });
  await G(page, (id) => window.__hype.openTalk(window.__hype.S.game.events.find((e) => e.id === id)), ev);
  await idle(page);
  await G(page, (id) => window.__hype.openLayer({ t: 'minigame', id }), ev);
  await page.waitForSelector('.layer .talk');

  const a1 = await talk(page, ev, '/me l’embrasse et le guide vers la chambre', [
    { t: 'judge', react: 'charme' }, { t: 'say', text: 'Viens là… J’attendais que tu le proposes.', seen: 'il t’attire vers lui' }, { t: 'fade' },
    { t: 'apres', text: 'Bon… on reprend le film ? Je crois qu’on a raté toute la fin 😅', seen: 'il sourit, les joues encore roses' }]);
  await shot(page, 'evening-after');
  check('an evening: the AI is asked for the line that picks it back up ("apres", it is them who relaunch); after « Ce moment ne regarde pas les voyeurs. » and « Un peu plus tard… », their words; no hint',
    /"t":"apres"/.test(a1.pr) && /c’est il qui relance la conversation/.test(a1.pr) && a1.ell === 1 && !a1.played && a1.turn === 1
      && a1.tail[0] === 'n:' + ELL && a1.tail[1] === 'n:' + LATER && a1.tail[2] === 'c:Bon… on reprend le film ? Je crois qu’on a raté toute la fin 😅' && /raté toute la fin/.test(a1.lastBubble) && !a1.hint, a1);

  const a2 = await talk(page, ev, 'reste contre moi', [
    { t: 'judge', react: 'charme' }, { t: 'say', text: 'Encore ?', seen: 'il rit doucement' }, { t: 'fade' }, { t: 'say', text: 'Je te fais un chocolat chaud ?', seen: 'il s’étire' }]);
  check('a "say" written after the cut is their line a little later, after « Un peu plus tard… »',
    a2.ell === 2 && a2.tail[1] === 'n:' + LATER && a2.tail[2] === 'c:Je te fais un chocolat chaud ?' && !a2.hint, a2);

  const a3 = await talk(page, ev, 'viens là', [{ t: 'judge', react: 'charme' }, { t: 'say', text: 'Toujours.', seen: 'il te serre contre lui' }, { t: 'fade' }]);
  await shot(page, 'evening-hint');
  check('without their line after the cut: « À toi de reprendre la conversation. » (the evening goes on)',
    a3.ell === 3 && !a3.played && a3.tail[2] === 'n:' + LATER && a3.hint === 'À toi de reprendre la conversation.', a3);
  const a4 = await talk(page, ev, 'tu es adorable', [{ t: 'judge', react: 'amuse' }, { t: 'say', text: 'Je sais.', seen: 'il te fait un clin d’œil' }]);
  check('once the player speaks again, the hint goes', !a4.hint && a4.turn === 4, a4);
  await clear(page);

  // ---------- their messages, together in person ----------
  const d1 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin'), t = Date.now();
    g.stay = { c: c.id, ev: 'x', where: 'c', at: t - 1000, until: t + 3600000 };
    const P = H.promptDM(g, c, [], 'reste encore un peu…');
    const max = H.intensityOf(g).dmMax, lines = [];
    for (let k = 0; k < max; k++) lines.push({ t: 'msg', text: k ? `mm ${k}` : 'je reste… viens là.' });
    lines.push({ t: 'fade' }, { t: 'msg', text: 'bon… je crois que le café a refroidi 😅' }, { t: 'rel', d: 2, why: 'un matin à deux' });
    window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines }];
    await H.sendDM(c.id, '/me t’attire sous la couette');
    const M = g.dms[c.id].msgs, k = M.findIndex((m) => m.sys === 'fade');
    return { max, ask: /c’est il qui relance la conversation/.test(P) && /encore 1 message/.test(P), k, before: k > 0 ? M[k - 1].text : '', after: M[k + 1] ? M[k + 1].text : '', later: !!(M[k + 1] && M[k + 1].at > M[k].at), n: M.filter((m) => !m.me && !m.sys).length };
  });
  await idle(page);
  await G(page, (h) => { const H = window.__hype; H.openDM(H.charByHandle(H.S.game, h).id); H.update(); }, 'theo.marlin');
  for (let k = 0; k < 40 && !(await page.locator('.layer .bubble.them', { hasText: 'le café a refroidi' }).count()); k++) await sleep(400); // (at the pace of typing)
  const d1b = await G(page, () => ({ fade: document.querySelectorAll('.layer .dm-fade').length, hint: document.querySelectorAll('.layer .dm-fade-hint').length }));
  await shot(page, 'messages-after');
  check('their messages, together in person: asked for the message that picks it back up; it comes after the cut, a little later (one more than usual allowed); no hint',
    d1.ask && d1.k > 0 && d1.before === `mm ${d1.max - 1}`.replace(/^mm 0$/, 'je reste… viens là.') && d1.after === 'bon… je crois que le café a refroidi 😅' && d1.later && d1b.fade === 1 && d1b.hint === 0, { d1, d1b });

  const d2 = await G(page, async () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin');
    window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: [{ t: 'msg', text: 'encore…' }, { t: 'fade' }] }];
    await H.sendDM(c.id, 'reviens là');
    g.stay = null;
    return g.dms[c.id].msgs.slice(-1)[0].sys;
  });
  await idle(page);
  for (let k = 0; k < 30 && (await page.locator('.layer .dm-fade').count()) < 2; k++) await sleep(400);
  await sleep(600);
  const d2b = await G(page, () => ({ fade: document.querySelectorAll('.layer .dm-fade').length, hint: [...document.querySelectorAll('.layer .dm-fade-hint')].map((e) => e.textContent) }));
  await shot(page, 'messages-hint');
  check('without their message after the cut: « À toi de reprendre la conversation. » under the last cut only', d2 === 'fade' && d2b.fade === 2 && d2b.hint.length === 1 && d2b.hint[0] === 'À toi de reprendre la conversation.', { d2, d2b });
  await clear(page);

  // ---------- a partner angry (a capture): their AI judges the player's words; no more blocked for two messages ----------
  const say = async (h, text, lines) => {
    const n0 = await G(page, () => window.__prompts.length);
    await G(page, (a) => { const H = window.__hype, g = H.S.game; for (const c of Object.values(g.chars)) c.caughtAt = Date.now(); window.__mockOnce = [{ has: 'CONVERSATION PRIVÉE', lines: a.lines }]; return H.sendDM(H.charByHandle(g, a.h).id, a.text); }, { h, text, lines });
    await idle(page);
    return G(page, (a) => { const H = window.__hype, c = H.charByHandle(H.S.game, a.h); return { cool: c.cool ? c.cool.k : null, insist: c.cool ? c.cool.insist : null, ok: c.cool ? c.cool.ok : null, rel: c.rel, pr: window.__prompts.slice(a.n0).find((x) => x.includes('CONVERSATION PRIVÉE')) || '' }; }, { h, n0 });
  };
  const an0 = await G(page, () => {
    const H = window.__hype, g = H.S.game, p = H.charByHandle(g, 'leandre.aube'), o = H.charByHandle(g, 'theo.marlin'), t = Date.now();
    g.stay = null;
    Object.assign(o, { vibe: 'amitie', cool: null });
    Object.assign(p, { unlocked: true, asleep: undefined, vibe: 'couple', officiel: 'public', rel: 83, cool: null, dare: null, coeur: 'serein', temper: 'fidele', pace: { at: t - 2 * 3600000, v: 'couple' } });
    const n0 = g.notifs.length;
    H.startCool(g, p, 'colere', 'une capture de tes messages', 'une capture où le joueur drague Théo Marlin');
    const mem = p.mem.slice(-1)[0];
    return { notif: g.notifs.slice(n0).some((n) => /😠 Léandre t’en veut \(une capture de tes messages\)\. Prends le temps de t’expliquer\./.test(n.text)), mem: mem.t, shown: mem.s || '' };
  });
  const an1 = await say('leandre.aube', 'je comprends que tu sois blessé, je te dois des explications', [{ t: 'judge', react: 'neutre' }, { t: 'msg', text: 'j’écoute. mais c’est pas joli.' }]);
  const an2 = await say('leandre.aube', 'c’était rien de sérieux, je te le jure', [{ t: 'judge', react: 'neutre' }, { t: 'msg', text: 'mouais. je réfléchis.' }]);
  check('a capture: the partner is angry, and why (said to the player, kept in their memory, told to their AI, who judges what the player says); two messages: still talking, never blocked for that',
    an0.notif && /je suis en colère contre le joueur : une capture où le joueur drague Théo Marlin/.test(an0.mem) && /T’en veut : une capture de tes messages/.test(an0.shown)
      && /est en colère contre le joueur \(une capture où le joueur drague Théo Marlin\)/.test(an1.pr) && /"t":"judge"/.test(an1.pr) && an1.cool === 'colere' && an2.cool === 'colere' && an2.insist === 0, { an0, an1: Object.assign({}, an1, { pr: undefined }), an2: Object.assign({}, an2, { pr: undefined }) });
  const an3 = await say('leandre.aube', 'je t’aime toi, et je vais te le prouver', [{ t: 'judge', react: 'charme' }, { t: 'msg', text: '…ok. continue.' }]);
  const an4 = await say('leandre.aube', 'dîner chez moi ce soir, juste nous deux ?', [{ t: 'judge', react: 'amuse' }, { t: 'msg', text: 'tu sais parler, toi.' }]);
  check('explanations that land (their AI\'s charm, amusement) calm them down; « je t’aime » and a date to a partner are not « pushing »', an3.cool === 'colere' && an3.ok === 1 && an3.insist === 0 && an4.cool === null, { an3: Object.assign({}, an3, { pr: undefined }), an4: Object.assign({}, an4, { pr: undefined }) });
  await G(page, () => { const H = window.__hype, g = H.S.game; H.startCool(g, H.charByHandle(g, 'leandre.aube'), 'colere', 'une capture de tes messages', 'une capture où le joueur drague Théo Marlin'); });
  const an5 = await say('leandre.aube', 'franchement t’abuses de faire une scène', [{ t: 'judge', react: 'refroidi' }, { t: 'msg', text: 'pardon ??' }]);
  const an6 = await say('leandre.aube', 'arrête de faire le gamin', [{ t: 'judge', react: 'refroidi' }, { t: 'msg', text: 'ok. salut.' }]);
  check('what makes it worse, as their AI judges it, counts: twice, and they block', an5.cool === 'colere' && an5.insist === 1 && an6.cool === 'bloque', { an5: Object.assign({}, an5, { pr: undefined }), an6: Object.assign({}, an6, { pr: undefined }) });

  // ---------- « je t’aime » to a partner is not going too fast; a partner stays a partner on the meter ----------
  const fast = await G(page, async () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'theo.marlin'), p = H.charByHandle(g, 'leandre.aube'), t = Date.now();
    p.vibe = 'amitie'; p.cool = null;
    Object.assign(c, { vibe: 'couple', rel: 83, cool: null, dare: null, coeur: 'prudent', pace: { at: t - 3600000, v: 'couple' } });
    const step = { couple: H.moveStep(c, 'decl'), fianc: H.moveStep(c, 'fianc') };
    c.vibe = 'flirt'; step.flirt = H.moveStep(c, 'decl'); c.vibe = 'couple';
    H.heartBeforeDM(g, c, 'je t’aime, tu sais');
    const afterDecl = c.cool ? c.cool.k : null;
    H.heartBeforeDM(g, c, 'on se marie ?');
    const afterFianc = c.cool ? c.cool.k : null;
    c.cool = null;
    const n0 = g.notifs.length;
    H.applyRel(g, c, -6, 'test');
    return { step, afterDecl, afterFianc, label: g.notifs.slice(n0).some((n) => /c’est maintenant/.test(n.text)), rel: c.rel };
  });
  check('in a couple, « je t’aime » is no step (never « tu vas trop vite »), a proposal still is; a partner going from 83 to under 80 is not « Ami proche » now',
    fast.step.couple === null && fast.step.flirt === 'couple' && fast.step.fianc === 'fiancailles' && fast.afterDecl === null && fast.afterFianc === 'louche' && !fast.label && fast.rel < 80, fast);

  // ---------- the games from before: a partner blocked by the old count is unblocked, once ----------
  const fix = await G(page, () => {
    const H = window.__hype, g = H.S.game, c = H.charByHandle(g, 'nox.ombre'), z = H.charByHandle(g, 'zara.vey'), t = Date.now();
    const blocked = (x, o) => Object.assign(x, { unlocked: true, cool: { k: 'bloque', at: t - 60000, until: t + 3 * 86400000, insist: 0, ok: 0, why: 'tu as insisté' }, blocks: 1, mem: [{ t: 'j’ai vu une capture : le joueur drague quelqu’un', at: t - 3600000 }, { t: 'le joueur ne respecte pas mes limites', s: 'Tu ne respectes pas ses limites', at: t - 3500000 }, { t: 'j’ai bloqué le joueur, il insistait trop', s: 'T’a bloqué : tu insistais trop', at: t - 60000 }] }, o);
    blocked(c, { vibe: 'couple', rel: 77 });
    blocked(z, { vibe: 'amitie', rel: 77 });
    g.fix31 = 0;
    H.migrate(g);
    return { nox: { cool: c.cool, blocks: c.blocks, mem: c.mem.map((m) => m.t) }, zara: z.cool && z.cool.k, once: g.fix31 };
  });
  check('a game from before: a partner who still loves the player, blocked by the old count, is unblocked (what made them angry stays in their memory); not someone else; once',
    fix.nox.cool === null && fix.nox.blocks === 0 && fix.nox.mem.length === 1 && /capture/.test(fix.nox.mem[0]) && fix.zara === 'bloque' && fix.once === 1, fix);

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
