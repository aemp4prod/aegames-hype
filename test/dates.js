// Dates that fit the story (0.9.3) end to end, in Chromium against the built hype.html with the mocked Claude runtime:
// the 18+ confirmation and the « Rendez-vous soignés » option of a new game; the date mini-game written with where the
// two of them stand and what they said to each other (in private and in public); with the option, the evening written
// as soon as the player is at the date screen and read again (rewritten when it does not fit), opened at once; a date
// the character calls off in DMs; a prepared evening dropped when something new was said; the option in the settings.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/dates.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-dates');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(process.env.PAGE || path.join(ROOT, 'hype.html'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const UMD = fs.readFileSync(process.env.UMD, 'utf8');
const SKELETON = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;

const errors = [];
const checks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 0.15: the pen steps aside while the feed scrolls down; a player scrolls back up, a test brings it back
const clickFab = async (page, opts) => { await page.evaluate(() => { const H = window.__hype; if (H && H.S.fabAway) { H.S.fabAway = false; H.update(false); } }); await page.click('.fab', opts); };
let shotN = 0, lastPage = null;
const check = (name, ok, info) => { checks.push([ok ? 'PASS' : 'FAIL', name]); console.log(ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)); };
async function shot(page, name) { await dismiss(page); shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
const clearToasts = (page) => page.evaluate(() => { const H = window.__hype; if (H) { H.S.toasts.forEach((t) => { t.until = 0; }); H.update(false); } });
async function clickText(page, sel, text) {
  const el = page.locator(sel, { hasText: text }).first();
  for (let attempt = 0; ; attempt++) {
    try {
      if (!sel.startsWith('.modal')) for (let k = 0; k < 4 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(700); }
      await el.waitFor({ state: 'visible', timeout: 15000 });
      await el.click({ timeout: attempt < 2 ? 5000 : 15000 });
      return;
    } catch (e) {
      if (attempt < 2 && !sel.startsWith('.modal') && (await page.$('.modal'))) continue;
      if (attempt < 2 && (await page.$('.toast'))) { await clearToasts(page); await sleep(200); continue; }
      await page.screenshot({ path: path.join(OUT, 'fail.png') }).catch(() => {});
      throw new Error(`clickText(${sel}, ${text}): ${e.message.split('\n')[0]}`);
    }
  }
}
async function dismiss(page) { for (let k = 0; k < 6 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(700); } }
async function overflowCheck(page, label) {
  const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  if (w.sw > w.cw + 1) errors.push(`[overflow] ${label}: ${JSON.stringify(w)}`);
}
const G = (page, fn, arg) => page.evaluate(fn, arg);
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.cand || b.write || b.create || b.prep); })) await sleep(300); };
const settle = async (page) => { await idle(page); await page.waitForFunction(() => { const g = window.__hype.S.game; return Object.values(g.dms).every((c) => c.msgs.every((m) => m.at <= Date.now())); }, null, { timeout: 15000 }).catch(() => {}); };
const closeAll = (page) => G(page, () => { const H = window.__hype; H.S.stack = []; H.update(); });
const lastBox = (page) => page.locator('.layer').last().locator('textarea:not([readonly])').first();
async function dm(page, id, text) {
  await dismiss(page);
  await closeAll(page);
  await G(page, (x) => window.__hype.openDM(x), id);
  await sleep(300);
  for (let k = 0; k < 3; k++) { // the conversation may render again as it opens: fill until it holds
    await lastBox(page).waitFor();
    await lastBox(page).fill(text);
    await sleep(200);
    if ((await lastBox(page).inputValue()) === text) break;
  }
  await page.waitForSelector('.layer .send:not([disabled])', { timeout: 5000 });
  await clickText(page, '.layer .send', 'Envoyer');
  await settle(page);
  await sleep(600);
}

async function newPage(browser, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true, colorScheme: 'light' });
  await ctx.addInitScript(MOCK);
  const page = await ctx.newPage();
  lastPage = page;
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

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);

  // ---------- a new game: 18 or older, and the « Rendez-vous soignés » option ----------
  await clickText(page, 'button', 'Nouvelle partie');
  await clickText(page, 'button.world', 'Académie Lumen');
  await page.waitForSelector('#pn');
  await page.fill('#pn', 'Mila Flux');
  await clickText(page, '.seg button', 'Elle');
  await page.fill('#pi', 'Une influenceuse qui enquête sur les secrets de l’académie');
  await clickText(page, '.tier', 'Sans limite');
  const form = await G(page, () => { const cards = [...document.querySelectorAll('form .check-card')].filter((x) => !x.closest('.int-switches')); return { cards: cards.map((x) => x.textContent), on: cards.map((x) => x.querySelector('input').checked) }; });
  await page.locator('form .check-card', { hasText: 'Rendez-vous soignés' }).locator('input').check();
  await page.check('#p18');
  await page.locator('#p18').scrollIntoViewIfNeeded();
  await shot(page, 'new-game-options');
  await overflowCheck(page, 'new game options');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=Qui sera ton premier abonné', { timeout: 20000 });
  await page.locator('.cast-card.pick', { hasText: 'Théo' }).click();
  await page.click('.cast-cta button');
  await page.waitForSelector('.post');
  await sleep(1200);
  await dismiss(page);
  const g0 = await G(page, () => { const g = window.__hype.S.game; return { opts: g.opts, adult: g.adultAt > 0, saved: localStorage.getItem('hype:careDates') }; });
  check('a new game asks: « Rendez-vous soignés » (≈ +1 café, unticked) and « J’ai 18 ans ou plus »; the choices are kept with the game',
    form.cards.length === 2 && /Rendez-vous soignés/.test(form.cards[0]) && /\+1 café par rendez-vous/.test(form.cards[0]) && /J’ai 18 ans ou plus/.test(form.cards[1]) && form.on.every((x) => !x)
    && g0.opts && g0.opts.careDates === true && g0.adult && g0.saved === '1', { form, g0 });
  const ids = await G(page, () => { const H = window.__hype, g = H.S.game; const id = (h) => H.charByHandle(g, h).id; return { nox: id('nox.ombre'), theo: id('theo.marlin') }; });

  // ---------- a date with Nox, set in DMs; what the DMs know about it ----------
  await dm(page, ids.nox, 'et si on allait au resto du lac ce soir ? c’est moi qui invite');
  const d1 = await G(page, (id) => { const ev = window.__hype.activeEvents(window.__hype.S.game).find((e) => e.c === id && e.player); return ev ? { what: ev.what, left: Math.round((ev.due - Date.now()) / 60000) } : null; }, ids.nox);
  await dm(page, ids.nox, 'j’ai hâte de te voir ce soir');
  const dmPrompt = await G(page, () => window.__prompts.filter((x) => x.includes('CONVERSATION PRIVÉE')).slice(-1)[0] || '');
  check('a date set in DMs; the next messages know it, and may call it off', !!d1 && /resto du lac/.test(d1.what) && dmPrompt.includes(`Rendez-vous prévu entre eux : « ${d1.what} »`) && dmPrompt.includes('{"t":"cancel","why"'), { d1, dm: /Rendez-vous prévu[^\n]*/.exec(dmPrompt) });
  // a public exchange between them
  await closeAll(page);
  await G(page, () => { const H = window.__hype; H.S.tab = 'feed'; H.update(); });
  await clickFab(page);
  await page.fill('#compose', '@nox.ombre tu fais trop de mystères, ça commence à se voir');
  await clickText(page, '.layer-head button', 'Publier');
  await sleep(800);
  await idle(page, 30000);
  await sleep(1500);
  await dismiss(page);

  // ---------- the date: written as soon as the player is there, read again, rewritten, opened at once ----------
  await G(page, () => { window.__mockDateFix = true; });
  const n0 = await G(page, () => window.__prompts.length); // the evening starts being written as soon as the screen opens
  await G(page, (id) => { const H = window.__hype, ev = H.activeEvents(H.S.game).find((e) => e.c === id && e.player); ev.due = Date.now() - 60000; H.S.stack = [{ t: 'minigame', id: ev.id, key: 'kd' }]; H.update(); }, ids.nox);
  await page.waitForSelector('.layer .date-head');
  await page.waitForFunction((id) => { const H = window.__hype, ev = H.activeEvents(H.S.game).find((e) => e.c === id && e.player); return !!(ev && ev.prep) && !H.S.busy.prep; }, ids.nox, { timeout: 30000 });
  await sleep(300);
  const prep = await G(page, (a) => {
    const H = window.__hype, ev = H.activeEvents(H.S.game).find((e) => e.c === a.id && e.player);
    const pr = window.__prompts.slice(a.n), game = pr.find((x) => x.includes('TÂCHE : LE MINI-JEU DU RENDEZ-VOUS')) || '', check = pr.find((x) => x.includes('TÂCHE : RELIS LE MINI-JEU DU RENDEZ-VOUS')) || '';
    return { title: ev.prep.game.title, reviewed: ev.reviewed, note: (document.querySelector('.layer .prep-note') || {}).textContent || '',
      parts: [game.includes('## LA SITUATION ENTRE EUX'), game.includes('Où ils en sont : relation'), game.includes('Leurs derniers messages privés'), game.includes('Mila Flux (le joueur) : et si on allait au resto du lac ce soir ? c’est moi qui invite'),
        game.includes('Leurs derniers échanges en public'), game.includes('Mila Flux (post) : @nox.ombre tu fais trop de mystères'), game.includes('vient quand même, mais pour une raison qui colle')],
      excerpt: (game.split('## LA SITUATION ENTRE EUX')[1] || '').slice(0, 900),
      check: check.includes('Voici le mini-jeu préparé pour ce rendez-vous') && check.includes('"t":"q"') && check.includes('{"t":"ok"}') && check.includes('## LA SITUATION ENTRE EUX') };
  }, { id: ids.nox, n: n0 });
  await shot(page, 'date-prepared');
  check('« Rendez-vous soignés »: at the date screen the evening is written with where they stand and what they said (DMs, public), then read again; here rewritten so it fits',
    prep.title === 'Mise au point au resto' && prep.reviewed === 'fixed' && /Soirée prête/.test(prep.note) && prep.parts.every(Boolean) && prep.check, prep);
  const n1 = await G(page, () => window.__prompts.length);
  await clickText(page, '.layer .mg-setup .btn', 'C’est parti');
  await page.waitForSelector('.mg-intro', { timeout: 5000 });
  const open1 = await G(page, (n) => ({ intro: document.querySelector('.mg-intro').textContent, calls: window.__prompts.length - n }), n1);
  await shot(page, 'date-intro-fixed');
  check('« C’est parti » opens the prepared evening at once (no new call)', /Mise au point au resto/.test(open1.intro) && /venue quand même/.test(open1.intro) && open1.calls === 0, open1);
  await clickText(page, '.mg-intro button', 'parti');
  const RIGHT = ['non, je te dois des excuses', 'j’ai eu tort, je le regrette', 'on repart doucement, si tu veux bien'];
  for (let k = 0; k < 3; k++) {
    await dismiss(page);
    await page.waitForSelector('.mg-opt:not([disabled])', { timeout: 8000 });
    const opts = await page.$$eval('.mg-opt', (b) => b.map((x) => x.textContent.trim()));
    await page.click(`.mg-opt >> nth=${Math.max(0, opts.findIndex((t) => RIGHT.includes(t)))}`);
    await sleep(1650);
  }
  await page.waitForSelector('.mg-result', { timeout: 10000 });
  await G(page, () => { window.__mockDateFix = false; });
  await clickText(page, '.mg-result button', 'Voir comment la soirée se termine');
  await page.waitForSelector('.layer .dm-card', { timeout: 25000 });
  await settle(page);
  const endPr = await G(page, () => window.__prompts.filter((x) => x.includes('TÂCHE : LA FIN DU RENDEZ-VOUS')).slice(-1)[0] || '');
  check('the end of the evening is told from the same situation', endPr.includes('Où ils en sont : relation') && endPr.includes('Leurs derniers messages privés') && endPr.includes('Le récit colle à leur situation'), /Où ils en sont[^\n]*/.exec(endPr));

  // ---------- a date the character calls off ----------
  await dm(page, ids.theo, 'resto ce soir, toi et moi ? j’ai plein de trucs à te raconter');
  const t0 = await G(page, (id) => { const H = window.__hype, g = H.S.game, ev = H.activeEvents(g).find((e) => e.c === id && e.player); return { ev: !!ev, rel: g.chars[id].rel }; }, ids.theo);
  await G(page, () => { window.__mockCancel = true; });
  await dm(page, ids.theo, 'en vrai j’ai dit des trucs nuls sur toi hier');
  await G(page, () => { window.__mockCancel = false; });
  const t1 = await G(page, (a) => {
    const H = window.__hype, g = H.S.game, c = g.chars[a.id], ev = g.events.filter((e) => e.c === a.id && e.player).slice(-1)[0], msgs = g.dms[a.id].msgs;
    return { state: ev.state, by: ev.by, card: (msgs.find((m) => m.sys === 'cancel') || {}).text || '', notif: g.notifs.filter((n) => n.c === a.id).map((n) => n.text).slice(-3).join(' | '), drop: a.rel - c.rel, mem: c.mem.some((m) => /annulé mon rendez-vous/.test(m.t)), active: H.activeEvents(g).some((e) => e.c === a.id && e.player) };
  }, { id: ids.theo, rel: t0.rel });
  await G(page, (id) => window.__hype.openDM(id), ids.theo);
  await page.waitForSelector('.layer .dm-card.cancel');
  await page.locator('.layer .dm-card.cancel').scrollIntoViewIfNeeded();
  await shot(page, 'date-called-off');
  check('the character calls the date off in DMs: cancelled on their side (no penalty for the player), said in the conversation and the notifications',
    t0.ev && t1.state === 'cancelled' && t1.by === 'them' && /Théo a annulé : trop déçue par ton message/.test(t1.card) && /Théo Marlin a annulé votre rendez-vous/.test(t1.notif) && t1.drop >= 0 && t1.drop <= 5 && t1.mem && !t1.active, t1);

  // ---------- a prepared evening is dropped when something new was said ----------
  const fresh = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, c = g.chars[id];
    const ev = { id: 'evtest', kind: 'rdv', c: id, player: true, state: 'scheduled', due: Date.now() - 1000, what: 'café', diff: 'facile' };
    ev.prep = { at: Date.now(), dm: g.dms[id] ? g.dms[id].msgs.reduce((m, x) => Math.max(m, x.at || 0), 0) : 0, rel: c.rel, diff: 'facile', game: { kind: 'quiz', items: [] } };
    const before = H.prepFresh(g, ev);
    (g.dms[id] || (g.dms[id] = { msgs: [], readAt: 0 })).msgs.push({ id: 'mnew', me: true, text: 'au fait…', ts: Date.now() + 5, at: Date.now() + 5 });
    const after = H.prepFresh(g, ev);
    g.dms[id].msgs.pop();
    return { before, after };
  }, ids.nox);
  check('a prepared evening is dropped (written again) when a new message came between them', fresh.before && !fresh.after, fresh);

  // ---------- the option in the settings ----------
  await closeAll(page);
  await sleep(800); await dismiss(page); // (0.28.1: what waited for the conversation to close shows now)
  await page.click('.gear-btn:visible');
  await page.waitForSelector('.layer .section');
  await sleep(1500); await dismiss(page); // (an announcement that waited for the conversation can still show, over the settings)
  const box = page.locator('.layer .check-card', { hasText: 'Rendez-vous soignés' });
  await box.scrollIntoViewIfNeeded();
  const s0 = await box.locator('input').isChecked();
  await box.locator('input').uncheck();
  await sleep(200);
  const s1 = await G(page, () => window.__hype.S.game.opts.careDates);
  await shot(page, 'settings-dates');
  check('the settings: « Rendez-vous soignés » on and off for this game', s0 && s1 === false, { s0, s1 });

  await browser.close();
  console.log('ERRORS', errors.join('\n'));
  console.log('CHECKS', checks.map((c) => c.join(' ')).join('\n'));
  console.log(`\n${checks.filter((c) => c[0] === 'PASS').length}/${checks.length} PASS`);
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch(async (e) => {
  console.error('FAILED', e);
  if (lastPage) await lastPage.screenshot({ path: path.join(OUT, 'fail.png') }).catch(() => {});
  console.log('ERRORS', errors.join('\n'));
  process.exit(1);
});
