// 0.27.3 end to end, in Chromium against the built hype.html with the mocked Claude runtime: the shoot's mini-game.
// - every mini-game of the format has the same chance (the AI's five on the subject and the format's skill rounds),
//   whatever the difficulty, never the same as the last shoot; with an editor in the team, no cut on the beat;
// - « Cauchemar » stays the real-knowledge quiz;
// - the game picks the format: the AI is told which one, and a game of another kind is not taken.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v273.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v273');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(process.env.PAGE || path.join(ROOT, 'hype.html'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const UMD = fs.readFileSync(process.env.UMD, 'utf8');
const SKELETON = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;

const errors = [];
const checks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let shotN = 0;
const check = (name, ok, info) => { checks.push([ok ? 'PASS' : 'FAIL', name]); console.log(ok ? 'PASS' : 'FAIL', name, info === undefined ? '' : JSON.stringify(info)); };
async function shot(page, name) { shotN++; const f = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); }
const G = (page, fn, arg) => page.evaluate(fn, arg);
async function dismiss(page) { for (let k = 0; k < 6 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(500); } }

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
// A release of this format, its shoot forced to this skill round, opened on its intro.
async function shootRound(page, what, kind, diff) {
  const id = await G(page, ([w, k, d]) => {
    const H = window.__hype, g = H.S.game;
    for (const x of g.releases) if (x.state === 'scheduled') x.state = 'dropped';
    g.career.platform = { live: 'twitch', short: 'tiktok', podcast: 'spotify', 'vidéo': 'youtube' }[w] || 'youtube'; // (the format exists there)
    window.__hypeEasyGear = true;
    const r = H.scheduleRelease(g, { what: w, topic: 'les potions de Lumen', due: Date.now() + 60000 });
    window.__hypeEasyGear = false;
    r.due = Date.now() - 1000; r.diff = d; r.devis = { total: 0, items: [], topic: r.topic, at: Date.now() };
    H.S.mgForce = k;
    H.genShoot(r);
    H.S.stack = []; H.openLayer({ t: 'minigame', id: r.id }); H.update();
    return r.id;
  }, [what, kind, diff]);
  await page.waitForSelector('.layer .mg-intro', { timeout: 8000 });
  return id;
}
const played = (page, id) => G(page, (x) => { const r = window.__hype.S.game.releases.find((y) => y.id === x); return r && r.played ? { what: r.what, kind: r.played.kind, score: r.played.score, tier: r.played.tier, got: r.game && r.game.run ? r.game.run.got : null } : null; }, id);

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);
  await newGame(page, 'Une créatrice qui touche à tout');
  await G(page, () => { window.__hypeNoGearEvent = true; window.__hype.S.game.career.cash = 5000; });

  // ---------- the draw, as the game plays it (the recent shoots remembered) ----------
  const dist = await G(page, () => {
    const H = window.__hype, S = H.S, g = S.game, f = S.mgForce;
    S.mgForce = null;
    const run = (what, diff, crew, n) => {
      const r = { what, diff, crew }, seen = {};
      let twice = 0, prev = null;
      g.mgRecent = [];
      for (let i = 0; i < n; i++) {
        const k = H.pickShootKind(g, r);
        g.mgRecent = [k].concat(g.mgRecent).slice(0, 3);
        seen[k] = (seen[k] || 0) + 1;
        if (k === prev) twice++;
        prev = k;
      }
      const share = {};
      for (const k in seen) share[k] = Math.round(1000 * seen[k] / n) / 10;
      return { share, twice, kinds: Object.keys(seen).sort().join() };
    };
    const out = {
      video: run('vidéo', 'mythique', [], 8000), videoEasy: run('vidéo', 'facile', [], 8000), short: run('short', 'mythique', [], 4000),
      live: run('live', 'expert', [], 4000), podcast: run('podcast', 'moyen', [], 4000), clip: run('clip', 'mythique', [], 4000),
      editor: run('vidéo', 'mythique', ['monteur'], 7000),
      nightmare: Array.from({ length: 40 }, () => H.pickShootKind(g, { what: 'vidéo', diff: 'cauchemar', crew: [] })).every((k) => k === 'quiz'),
    };
    S.mgForce = f;
    return out;
  });
  // 0.32: the skill rounds count double (with « never the same twice in a row »: a short half and half). Each kind near
  // its share: the AI's five (written) one share, the skill rounds another.
  const WRITTEN = ['tri', 'ordre', 'quiz', 'vf', 'intrus'];
  const near = (d, written, skill) => Object.entries(d.share).every(([k, x]) => Math.abs(x - (WRITTEN.includes(k) ? written : skill)) < 2.2);
  const writtenShare = (d) => Math.round(WRITTEN.reduce((a, k) => a + (d.share[k] || 0), 0));
  check('at the shoot of a video, Mythique or Facile alike: 7 mini-games (sort, order, quiz, true or false, odd one out, the cut on the beat, the memory; 0.27.4: no more grading); 0.32: the cut and the memory count double, about 19 % each, the written ones about 12 % (61 % in all); never the same twice in a row',
    dist.video.kinds === 'intrus,memoire,montage,ordre,quiz,tri,vf' && near(dist.video, 12.2, 19.4) && near(dist.videoEasy, 12.2, 19.4) && dist.video.twice === 0 && Math.abs(writtenShare(dist.video) - 61) <= 3, { video: dist.video, easy: dist.videoEasy });
  check('each format its own skill round: the reframing for a short, the chat for a live, the mix for a podcast, half the shoots a skill round (about 17 % each, the written ones 10 %); a clip has the seven of a video',
    /cadrage/.test(dist.short.kinds) && !/chat|mixage|etalonnage/.test(dist.short.kinds) && near(dist.short, 10.1, 16.6) && Math.abs(writtenShare(dist.short) - 50) <= 3 && /chat/.test(dist.live.kinds) && near(dist.live, 10.1, 16.6)
      && /mixage/.test(dist.podcast.kinds) && near(dist.podcast, 10.1, 16.6) && dist.clip.kinds === 'intrus,memoire,montage,ordre,quiz,tri,vf' && near(dist.clip, 12.2, 19.4), { short: dist.short, live: dist.live, podcast: dist.podcast, clip: dist.clip });
  check('with an editor in the team: no cut on the beat for the player, the memory about 23 %, the five written ones about 15 % each; « Cauchemar » stays the real quiz',
    dist.editor.kinds === 'intrus,memoire,ordre,quiz,tri,vf' && near(dist.editor, 15.4, 23.1) && dist.nightmare, { editor: dist.editor, nightmare: dist.nightmare });

  // ---------- the format is imposed on the AI ----------
  const pr = await G(page, () => {
    const H = window.__hype, g = H.S.game, r = { what: 'vidéo', topic: 'Les secrets du chaudron disparu', diff: 'mythique', crew: [] };
    const vf = H.promptMiniGame(g, r, 'vf'), free = H.promptMiniGame(g, r, null), real = H.promptMiniGame(g, Object.assign({}, r, { diff: 'cauchemar' }), 'quiz');
    return {
      vf: vf.includes('Le format de ce mini-jeu est imposé : « vrai ou faux » ("vf")') && vf.includes('{"t":"game","kind":"vf"') && vf.includes('- Puis 11 lignes {"t":"vf"') && !vf.includes('"t":"q"') && !vf.includes('Choisis le format'),
      free: free.includes('Choisis le format le plus adapté au sujet') && free.includes('- Si "quiz" : 8 lignes'),
      real: real.includes('NIVEAU CAUCHEMAR') && real.includes('{"t":"game","kind":"quiz"') && !real.includes('imposé'),
    };
  });
  check('the AI is told the format (here « vrai ou faux », 11 statements at Mythique since 0.27.9) and only that one; left free (tests), the old choice; Cauchemar unchanged', pr.vf && pr.free && pr.real, pr);

  // ---------- end to end: the shoot is the imposed game ----------
  for (const [k, n] of [['ordre', 5], ['intrus', 3], ['quiz', 4]]) {
    const id = await shootRound(page, 'vidéo', k, 'mythique');
    await page.waitForFunction((x) => { const r = window.__hype.S.game.releases.find((y) => y.id === x); return !!(r && r.game); }, id, { timeout: 20000 }); // (written by the mocked AI)
    const got = await G(page, (x) => { const r = window.__hype.S.game.releases.find((y) => y.id === x); return { kind: r.game.kind, n: r.game.items.length, intro: document.querySelector('.layer .mg-intro') ? document.querySelector('.layer .mg-intro').textContent : '' }; }, id);
    check(`a shoot drawn « ${k} »: the AI writes that game (${n} items here), on screen`, got.kind === k && got.n === n && got.intro.length > 10, got);
    if (k === 'ordre') await shot(page, 'shoot-ordre');
    await G(page, () => { const H = window.__hype; H.S.stack = []; H.update(); });
    await page.waitForSelector('.layer .mg-intro', { state: 'detached', timeout: 5000 }).catch(() => {});
  }

  // ---------- 0.32: a retry from the save taken before the shoot draws another mini-game ----------
  // (the save was taken before the draw: loaded again, the same odds came back, the game just left included)
  // the newest « Avant le tournage » (or « Avant la préparation ») save, once written after `after`
  const lastAt = (page) => G(page, () => Math.max(0, ...(window.__hype.S.game.saves || []).map((s) => s.at)));
  const lastShootSave = (page, id, after) => G(page, async ([x, after]) => {
    const H = window.__hype, g = H.S.game, mine = () => (g.saves || []).filter((s) => s.at > after && /Avant le tournage|Avant la préparation/.test(s.label));
    for (let k = 0; k < 80 && !mine().length; k++) await new Promise((ok) => setTimeout(ok, 100));
    const meta = mine().sort((a, b) => b.at - a.at)[0];
    const body = meta ? await H.Store.read(`g_${g.id}_save_${meta.slot}`) : null;
    const rr = body ? body.game.releases.find((y) => y.id === x) : null;
    return meta && rr ? { slot: meta.slot, seen: rr.mgSeen || null, prepSeen: rr.big ? rr.big.prepSeen || null : null, recent: body.game.mgRecent, next: body.game.mgNext || null, game: rr.game, started: !!rr.prodAt, crew: rr.crew || null } : null;
  }, [id, after]);
  const reload = async (page, slot, id) => {
    await G(page, (s) => window.__hype.loadSave(s), slot);
    await page.waitForFunction((x) => { const H = window.__hype, g = H.S.game, r = g && g.releases.find((y) => y.id === x); return r && !r.game && !H.S.busy.mg && !H.S.busy.save; }, id, { timeout: 15000 });
    await G(page, () => { const H = window.__hype; H.S.stack = []; H.S.modals.length = 0; H.update(); });
  };
  const retryId = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    for (const x of g.releases) if (x.state === 'scheduled') x.state = 'dropped';
    g.career.platform = 'tiktok';
    window.__hypeEasyGear = true;
    const r = H.scheduleRelease(g, { what: 'short', topic: 'les potions de Lumen', due: Date.now() + 60000 });
    window.__hypeEasyGear = false;
    r.due = Date.now() - 1000; r.diff = 'mythique'; r.devis = { total: 0, items: [], topic: r.topic, at: Date.now() };
    g.mgRecent = ['vf', 'quiz', 'tri']; delete g.mgNext;
    H.S.mgForce = null;
    return r.id;
  });
  const tries = [];
  for (let i = 0; i < 9; i++) {
    const after = await lastAt(page);
    const kind = await G(page, (x) => { const H = window.__hype, g = H.S.game, r = g.releases.find((y) => y.id === x); H.genShoot(r); return g.mgRecent[0]; }, retryId);
    const sv = await lastShootSave(page, retryId, after);
    tries.push({ kind, sv });
    if (!sv) break;
    await reload(page, sv.slot, retryId);
  }
  const ks = tries.map((t) => t.kind), first7 = ks.slice(0, 7);
  check('0.32: a shoot retried from its save (« Avant le tournage ») never draws a mini-game it already drew: a short, 7 tries in a row, 7 different ones (never the last shoot’s), then any but the one just left',
    tries.length === 9 && new Set(first7).size === 7 && !first7.includes('vf') && ks[7] !== ks[6] && ks[8] !== ks[7], ks);
  check('the save is the game before the draw (its recent shoots, no game, nothing paid), plus what the draw gave: the list of what this shoot drew, the last one last',
    tries.every((t, i) => t.sv && t.sv.game === null && !t.sv.started && t.sv.crew === null && JSON.stringify(t.sv.recent) === '["vf","quiz","tri"]' && t.sv.seen && t.sv.seen[t.sv.seen.length - 1] === t.kind && (i > 6 || t.sv.seen.length === i + 1)), tries.map((t) => t.sv && { seen: t.sv.seen, recent: t.sv.recent }));
  // imposed ahead: imposed again on a retry
  const after0 = await lastAt(page);
  await G(page, (x) => { const H = window.__hype, g = H.S.game, r = g.releases.find((y) => y.id === x); g.mgNext = 'cadrage'; H.genShoot(r); }, retryId);
  const imp = await lastShootSave(page, retryId, after0);
  const imp1 = await G(page, (x) => { const g = window.__hype.S.game, r = g.releases.find((y) => y.id === x); return { kind: r.game && r.game.kind, next: g.mgNext || null }; }, retryId);
  await reload(page, imp.slot, retryId);
  const imp2 = await G(page, (x) => { const H = window.__hype, g = H.S.game, r = g.releases.find((y) => y.id === x); const before = g.mgNext || null; H.genShoot(r); return { before, kind: r.game && r.game.kind, next: g.mgNext || null }; }, retryId);
  check('a mini-game imposed ahead stays imposed on a retry from that save (then used up)', imp1.kind === 'cadrage' && !imp1.next && imp && imp.next === 'cadrage' && imp2.before === 'cadrage' && imp2.kind === 'cadrage' && !imp2.next, { imp1, save: imp && imp.next, imp2 });
  // played: a shoot made again later starts its draws anew
  const fin = await G(page, (x) => { const H = window.__hype, g = H.S.game, r = g.releases.find((y) => y.id === x); const had = (r.mgSeen || []).length; H.finishShoot(r, 0.8); return { had, after: r.mgSeen || null, played: !!r.played }; }, retryId);
  check('once played, the shoot forgets what it drew (a shoot made again later draws as any other)', fin.had >= 1 && fin.after === null && fin.played, fin);
  // the preparation of a production: the same
  const prepId = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now();
    for (const x of g.releases) if (x.state === 'scheduled') x.state = 'dropped';
    const r = { id: 'rlprep' + t, what: 'vidéo', noun: '', topic: 'Le grand bal masqué', plot: '', post: null, at: t, due: t - 1000, outAt: t + 86400000, state: 'scheduled', delays: 0, tries: 0, c: null, game: null, played: null, said: '', diff: 'moyen', planned: true,
      big: { size: 2, stage: 0, slots: [t - 1000, t + 5 * 3600000, t + 24 * 3600000], k: 2, scores: [], cast: [], deals: [], hitches: [], at: t } };
    g.releases.push(r); g.mgLast = 'quiz';
    return r.id;
  });
  const preps = [];
  for (let i = 0; i < 6; i++) {
    const after = await lastAt(page);
    const kind = await G(page, (x) => { const H = window.__hype, g = H.S.game, r = g.releases.find((y) => y.id === x); H.genBigStage(r); return (r.big.prepSeen || []).slice(-1)[0]; }, prepId);
    const sv = await lastShootSave(page, prepId, after);
    preps.push({ kind, seen: sv && sv.prepSeen });
    if (!sv) break;
    await reload(page, sv.slot, prepId);
  }
  const pk = preps.map((p) => p.kind);
  check('the preparation of a production too: retried from its save (« Avant la préparation »), 5 tries, 5 different games (never the last one played), then any but the one just left',
    preps.length === 6 && new Set(pk.slice(0, 5)).size === 5 && !pk.slice(0, 5).includes('quiz') && pk[5] !== pk[4] && preps.every((p) => p.seen && p.seen[p.seen.length - 1] === p.kind), preps);
  await G(page, () => { const H = window.__hype; H.S.mgForce = null; H.S.stack = []; H.update(); });

  await browser.close();
  console.log('\nERRORS', errors.length ? errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`\n${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
