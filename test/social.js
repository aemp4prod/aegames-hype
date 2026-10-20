// The real network (0.29), in Chromium against the built hype.html with the mocked Claude runtime:
// - stories: the characters' (a refresh line: a photo, a poll, a question), the bar on top of the feed, the viewer (seen,
//   the next author, a vote, a reaction and a reply in their DMs, the AI told), gone after 24 h; the player's (the
//   composer, « Vu par » that grows, those who cannot stay away first, the replies in DMs, the votes and who voted, the
//   questions answered in public);
// - group chats (started by a refresh line, a message answered by the members, renamed, someone quits, the group living
//   on its own, unread, leaving it); a screenshot of a group without the player, sent by a friend;
// - the player's mother (once, when the AI decides: her posts, her comments asked for), a fan account, a ship (the
//   profile, no twice), a fake giveaway (reported: taken down; left alone: it costs), a parody (it stays);
// - on a phone.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/social.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-social');
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
// A refresh whose answer carries the lines of the test (after the usual ones).
async function refresh(page, lines) {
  await G(page, (lines) => { const g = window.__hype.S.game; g.lastRefreshAt = 0; for (const p of g.posts) delete p.cd; window.__mockOnce = [{ has: 'Le joueur actualise son fil', add: true, lines }]; }, lines);
  await G(page, () => window.__hype.refreshFeed(0));
  await idle(page);
}
// Game time moves on (the timestamps go back, as the accelerator does).
const ahead = (page, ms) => G(page, (ms) => { const H = window.__hype; H.jumpClock(H.S.game, ms); H.update(); }, ms);

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);
  const me = await G(page, () => window.__hype.S.game.player.handle);

  // ---------- the characters' stories ----------
  await refresh(page, [
    { t: 'story', by: 'theo.marlin', text: 'pause potion ☕ qui veut goûter ?', photo: 'une tasse fumante posée sur un grimoire' },
    { t: 'story', by: 'leandre.aube', text: 'qui vient au bal d’Aube samedi ?', poll: { q: 'je mets le costume blanc ?', a: ['évidemment', 'jamais'] } },
    { t: 'story', by: 'lilou_cuisines', text: 'les cookies de minuit sont prêts', ask: 'vos parfums préférés ?' },
    { t: 'story', by: 'theo.marlin', text: 'une de trop dans la même réponse' },
  ]);
  await ahead(page, 60000);
  await refresh(page, [{ t: 'story', by: 'theo.marlin', text: 'deuxième story, même pas peur' }, { t: 'story', by: 'theo.marlin', text: 'troisième' }, { t: 'story', by: 'theo.marlin', text: 'quatrième : trop' }]);
  await ahead(page, 60000);
  await sleep(500);
  const st = await G(page, () => {
    const H = window.__hype, g = H.S.game, L = H.liveStories(g);
    return { n: L.length, theo: L.filter((s) => s.a === 'c:' + H.charByHandle(g, 'theo.marlin').id).length, poll: (L.find((s) => s.poll) || {}).poll, ask: (L.find((s) => s.ask) || {}).ask, photo: (L.find((s) => s.photo) || {}).photo,
      bar: [...document.querySelectorAll('.stories-bar .sb-it > span:last-child')].map((x) => x.textContent.trim()), until: L.every((s) => s.until - s.at === 86400000), prompt: /des stories \(24 h\)/.test(window.__prompts.filter((p) => p.includes('Le joueur actualise son fil')).pop() || '') };
  });
  check('the characters’ stories (a refresh line: a photo, a poll, a question to their followers), three per answer, three at most each, for 24 h; the bar on top of the feed (« Ta story » first)',
    st.n === 5 && st.theo === 3 && st.poll && st.poll.opts.length === 2 && st.ask === 'vos parfums préférés ?' && st.photo && st.bar[0] === 'Ta story' && st.bar.length === 4 && st.until && st.prompt, st);
  await shot(page, 'stories-bar');
  await page.locator('.stories-bar .sb-it', { hasText: 'Théo' }).locator('.sb-ring').click();
  await page.waitForSelector('.sv-card');
  const v1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = H.charByHandle(g, 'theo.marlin'), s = H.liveStories(g).find((x) => x.a === 'c:' + t.id);
    return { text: document.querySelector('.sv-text').textContent, seen: !!s.seenAt, mem: !!t.storySeen, bars: document.querySelectorAll('.sv-card .ss-bars i').length, dm: /Le joueur a regardé ta story « pause potion/.test(H.promptDM(g, t, [], 'coucou')) };
  });
  check('a story opens over everything (one bar per story of theirs); seen, and they know it (their DM says « vu par »)', /pause potion/.test(v1.text) && v1.seen && v1.mem && v1.bars === 3 && v1.dm, v1);
  await shot(page, 'story-view');
  await page.locator('.sv-re').nth(4).click();
  await sleep(400);
  await page.fill('.sv-reply .input', 'j’arrive avec des biscuits !');
  await page.press('.sv-reply .input', 'Enter');
  await idle(page);
  const r1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = H.charByHandle(g, 'theo.marlin'), ms = g.dms[t.id].msgs, p = window.__prompts.filter((x) => x.includes('CONVERSATION PRIVÉE ENTRE LE JOUEUR ET @theo.marlin')).pop() || '';
    return { react: ms.find((m) => m.me && m.text === '🔥' && m.story), reply: ms.find((m) => m.me && /biscuits/.test(m.text) && m.story), prompt: /\(en réponse à ta story « pause potion/.test(p), trig: /a réagi à la story de @theo\.marlin \(« pause potion/.test(p) };
  });
  check('a reaction and a reply go to their DMs with the story quoted (the AI reads which story it answers)', !!r1.react && !!r1.reply && r1.prompt && r1.trig, r1);
  for (let k = 0; k < 6 && !(await page.$('.sv-poll')); k++) { await page.locator('.ss-next').click(); await sleep(300); } // (Théo's three, then the next ones: Léandre's poll)
  const v2 = await G(page, () => ({ a: window.__hype.S.storyView && window.__hype.S.storyView.a, text: (document.querySelector('.sv-text') || {}).textContent || '', poll: !!document.querySelector('.sv-poll') }));
  await page.locator('.sv-opt').first().click();
  await sleep(300);
  const v3 = await G(page, () => { const H = window.__hype, g = H.S.game, s = H.liveStories(g).find((x) => x.poll), l = H.charByHandle(g, 'leandre.aube'); return { mine: s.poll.mine, pct: [...document.querySelectorAll('.sv-opt em')].map((x) => x.textContent), mem: l.mem.some((m) => /a voté « évidemment »/.test(m.t)) }; });
  check('at the end of someone’s stories, the next one’s; a poll answered: the results, and they remember the vote', /bal d’Aube/.test(v2.text) && v2.poll && v3.mine === 0 && v3.pct.length === 2 && v3.mem, { v2, v3 });
  await shot(page, 'story-poll');
  await page.locator('.story-top .iconbtn').click();
  await sleep(300);
  const bar2 = await G(page, () => ({ open: !!document.querySelector('.sv-card'), rings: [...document.querySelectorAll('.stories-bar .sb-ring')].map((x) => x.className) }));
  check('closed; seen ones lose their ring', !bar2.open && bar2.rings.filter((c) => /seen/.test(c)).length >= 2, bar2); // (Lilou’s may have come on its own meanwhile)

  // ---------- the player's story ----------
  await clear(page);
  await G(page, () => { const g = window.__hype.S.game; g.stats.followers = 3000; });
  await page.locator('.stories-bar .sb-it').first().locator('.sb-ring').click();
  await page.waitForSelector('.sn');
  await page.fill('.sn textarea', 'nouvelle potion ce soir 🧪');
  await page.locator('.sn .seg button', { hasText: 'Un sondage' }).click();
  await page.fill('.sn-x .input >> nth=0', 'je la teste en live ?');
  await page.fill('.sn-ab .input >> nth=0', 'oui');
  await page.fill('.sn-ab .input >> nth=1', 'non');
  await shot(page, 'story-new');
  await G(page, () => { window.__mockOnce = [{ has: 'LA STORY DU JOUEUR', lines: [{ t: 'dm', by: 'theo.marlin', text: 'OUI en live !! je veux voir ça' }, { t: 'poll', split: 72 }, { t: 'vote', by: 'theo.marlin', pick: 0 }, { t: 'vote', by: 'gargouille_ronchon', pick: 1 }, { t: 'rel', by: 'theo.marlin', d: 2, why: 'adore tes potions' }] }]; });
  await page.locator('.sn .btn-hot').click();
  await idle(page);
  const ps = await G(page, () => {
    const H = window.__hype, g = H.S.game, s = H.liveStories(g).find((x) => x.a === 'p'), z = H.charByHandle(g, 'zara.vey'), p = window.__prompts.filter((x) => x.includes('LA STORY DU JOUEUR')).pop() || '';
    return { text: s && s.text, split: s && s.poll.split, voters: s && s.voters.length, vt: s && s.vt, first: !!(s && s.views.some((v) => v.a === 'c:' + z.id && v.at - s.at <= 70000)), prompt: /« nouvelle potion ce soir/.test(p) && /je la teste en live/.test(p) };
  });
  await ahead(page, 3 * 3600000);
  await sleep(1500);
  await page.locator('.stories-bar .sb-it').first().locator('.sb-ring').click();
  await page.waitForSelector('.sv-card');
  await page.locator('.sv-views').click();
  await sleep(300);
  const pv = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = H.charByHandle(g, 'theo.marlin'), m = g.dms[t.id].msgs.find((x) => !x.me && x.story);
    return { views: document.querySelector('.sv-views').textContent, list: [...document.querySelectorAll('.sv-who b')].map((x) => x.textContent), voted: [...document.querySelectorAll('.sv-who small')].map((x) => x.textContent), dm: m && m.text, pct: [...document.querySelectorAll('.sv-opt em')].map((x) => x.textContent) };
  });
  check('the player’s story (the composer, a poll): one call, the replies come in their DMs (« A répondu à ta story »), the votes (72 %) and who voted; « Vu par » grows by the hour, the close ones by name, someone always within the minute (the one who cannot stay away)',
    ps.text === 'nouvelle potion ce soir 🧪' && ps.split === 72 && ps.voters === 2 && ps.vt > 100 && ps.first && ps.prompt && /Vu par \d/.test(pv.views) && parseInt(pv.views.replace(/\D/g, ''), 10) > 50 && pv.list.includes('Zara Vey') && pv.voted.some((x) => /a voté « oui »/.test(x)) && pv.dm === 'OUI en live !! je veux voir ça' && pv.pct[0] === '72 %', { ps, pv });
  await shot(page, 'story-mine');
  await clear(page);
  await G(page, () => { window.__mockOnce = [{ has: 'LA STORY DU JOUEUR', lines: [{ t: 'q', by: 'lilou_cuisines', text: 'c’est quoi ta potion préférée ?' }, { t: 'q', by: 'curieux_du_hall', name: 'Un curieux', text: 'tu dors combien d’heures ?' }] }]; });
  await G(page, () => window.__hype.postStory({ text: 'posez-moi vos questions', hue: 265, ask: 'une question ?' }));
  await idle(page);
  await ahead(page, 3 * 3600000);
  await sleep(1200);
  await G(page, () => window.__hype.openStory('p'));
  await page.waitForSelector('.sv-card');
  await G(page, () => { const H = window.__hype; H.S.storyView = { a: 'p', k: H.liveStories(H.S.game).filter((s) => s.a === 'p').length - 1 }; H.update(false); });
  await sleep(300);
  await page.locator('.sv-views').click();
  await sleep(300);
  const qa = await G(page, () => [...document.querySelectorAll('.sv-q p')].map((x) => x.textContent));
  await page.locator('.sv-q .linkbtn').first().click();
  await sleep(500);
  const qc = await G(page, () => ({ open: window.__hype.S.stack.some((l) => l.t === 'compose'), text: window.__hype.S.drafts.post }));
  check('a question sticker: the questions asked come in, one answered in public (the composer)', qa.length === 2 && /potion préférée/.test(qa[0]) && qc.open && /« c’est quoi ta potion préférée \? » \(@lilou_cuisines\) →/.test(qc.text), { qa, qc });
  await G(page, () => { window.__hype.S.drafts.post = ''; });
  await clear(page);
  await ahead(page, 25 * 3600000);
  const gone = await G(page, () => window.__hype.liveStories(window.__hype.S.game).length);
  check('after 24 h, the stories are gone', gone === 0, gone);

  // ---------- groups ----------
  await refresh(page, [{ t: 'group', name: 'Les Marées Hautes', emoji: '🌊', by: 'theo.marlin', with: ['nox.ombre', 'leandre.aube', 'personne.inconnue'], text: 'bienvenue dans le groupe ! on organise la soirée' }]);
  await sleep(1500);
  const g1 = await G(page, () => { const H = window.__hype, g = H.S.game, gr = g.groups[0]; return gr && { n: g.groups.length, members: gr.members.map((id) => g.chars[id].handle), first: gr.msgs[0] && gr.msgs[0].text, notif: g.notifs.some((n) => /t’a ajoutée au groupe « Les Marées Hautes »/.test(n.text)) }; });
  await ahead(page, 60000);
  await G(page, () => window.__hype.goTab('dms'));
  await sleep(600);
  const rows = await G(page, () => ({ h: [...document.querySelectorAll('.list-h')].map((x) => x.textContent), row: (document.querySelector('.convo') || {}).textContent || '', badge: window.__hype.unreadGroups(window.__hype.S.game) }));
  check('a group started by a character (a refresh line; those who are not there left out): the notice, the group first in Messages, unread', g1 && g1.n === 1 && JSON.stringify(g1.members) === JSON.stringify(['theo.marlin', 'nox.ombre', 'leandre.aube']) && /bienvenue/.test(g1.first) && g1.notif && rows.h[0].startsWith('Groupes') && /Les Marées Hautes/.test(rows.row) && rows.badge === 1, { g1, rows });
  await page.locator('.convo', { hasText: 'Les Marées Hautes' }).click();
  await page.waitForSelector('.gr-bubbles');
  await G(page, () => { window.__mockOnce = [{ has: 'LE GROUPE DE DISCUSSION', lines: [{ t: 'msg', by: 'nox.ombre', text: 'je viens. je me cache dans un coin.' }, { t: 'msg', by: 'leandre.aube', text: 'Aube fournit le champagne, évidemment.' }, { t: 'msg', by: 'zara.vey', text: 'je ne suis pas dans ce groupe' }, { t: 'name', text: 'Soirée des Marées 🌊' }, { t: 'quit', by: 'leandre.aube', why: 'trop de bruit' }, { t: 'rel', by: 'nox.ombre', d: 3, why: 'contente de te voir' }] }]; });
  await page.fill('.layer textarea', 'je ramène les potions !');
  await page.press('.layer textarea', 'Enter');
  await idle(page);
  await ahead(page, 60000);
  await sleep(800);
  const g2 = await G(page, () => { const H = window.__hype, g = H.S.game, gr = g.groups[0], p = window.__prompts.filter((x) => x.includes('LE GROUPE DE DISCUSSION')).pop() || ''; return { msgs: gr.msgs.map((m) => (m.sys ? '[' + m.sys + ']' : author(g, m.a).handle + ':' + m.text)), name: gr.name, members: gr.members.length, prompt: /« je ramène les potions ! »/.test(p) && /@nox\.ombre/.test(p), ui: [...document.querySelectorAll('.gr-name')].map((x) => x.textContent), sys: [...document.querySelectorAll('.gr-sys')].map((x) => x.textContent) }; function author(g, a) { return a === 'p' ? { handle: 'p' } : { handle: g.chars[a.slice(2)].handle }; } });
  check('a message in the group: the members answer (each their name; someone outside cannot), renamed, someone quits, the AI reads the group', g2.prompt && g2.msgs.includes('nox.ombre:je viens. je me cache dans un coin.') && !g2.msgs.some((m) => /pas dans ce groupe/.test(m)) && g2.name === 'Soirée des Marées 🌊' && g2.members === 2 && g2.ui.includes('Nox') && g2.sys.some((x) => /Léandre a quitté le groupe/.test(x)), g2);
  await shot(page, 'group');
  await clear(page);
  await refresh(page, [{ t: 'gmsg', group: 'Soirée des Marées 🌊', by: 'theo.marlin', text: 'on dit 21 h ?' }, { t: 'gmsg', group: 'Un groupe qui n’existe pas', by: 'theo.marlin', text: 'perdu' }]);
  await ahead(page, 60000);
  await sleep(500);
  const g3 = await G(page, () => { const H = window.__hype, g = H.S.game, gr = g.groups[0]; return { last: gr.msgs[gr.msgs.length - 1].text, unread: H.unreadGroups(g), ctx: /Groupes de discussion du joueur : « Soirée des Marées 🌊 »/.test(H.promptRefresh(g, 0)) }; });
  await G(page, () => { const H = window.__hype; H.leaveGroup(H.S.game, H.S.game.groups[0]); });
  const g4 = await G(page, () => { const H = window.__hype, g = H.S.game; return { left: !!g.groups[0].left, live: H.liveGroups(g).length, trig: g.triggers.some((x) => /a quitté le groupe « Soirée des Marées/.test(x.text)) }; });
  check('the group lives on its own (a refresh line, its exact name), unread; the AI knows the groups; leaving it (the others hear of it)', g3.last === 'on dit 21 h ?' && g3.unread === 1 && g3.ctx && g4.left && g4.live === 0 && g4.trig, { g3, g4 });

  // ---------- a group without the player leaks ----------
  await G(page, () => { const H = window.__hype, g = H.S.game; H.charByHandle(g, 'theo.marlin').rel = 40; H.charByHandle(g, 'zara.vey').rel = -20; H.charByHandle(g, 'leandre.aube').rel = -10; });
  await refresh(page, [{ t: 'groupleak', by: 'theo.marlin', group: 'Sans Mila', lines: [{ by: 'zara.vey', text: 'elle se croit où celle-là' }, { by: 'leandre.aube', text: 'laisse, elle tiendra pas une semaine' }] }, { t: 'dm', by: 'theo.marlin', text: 'je devrais pas te montrer ça… mais tu dois savoir.' }]);
  await ahead(page, 60000);
  await sleep(500);
  const lk = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = H.charByHandle(g, 'theo.marlin'), m = g.dms[t.id].msgs.find((x) => x.sys === 'leak'), p = window.__prompts.filter((x) => x.includes('Le joueur actualise son fil')).slice(-1)[0] || '';
    return { m: m && { group: m.group, n: m.lines.length }, notif: g.notifs.some((n) => /capture du groupe « Sans Mila »… sans toi/.test(n.text)), trig: g.triggers.filter((x) => /a vu sa conversation du groupe « Sans Mila »/.test(x.text)).length, at: !!g.leakAt, offered: /"t":"groupleak"/.test(p) };
  });
  await G(page, () => window.__hype.openDM(window.__hype.charByHandle(window.__hype.S.game, 'theo.marlin').id));
  await page.waitForSelector('.leak-shot');
  const lkUi = await G(page, () => document.querySelector('.leak-shot').textContent);
  check('a group without the player: a friend sends the screenshot (the card in the DM, the notice), the ones talking do not know the player saw it (the AI is told)', lk.m && lk.m.group === 'Sans Mila' && lk.m.n === 2 && lk.notif && lk.trig === 2 && lk.at && lk.offered && /elle se croit où celle-là/.test(lkUi), { lk, lkUi });
  await shot(page, 'leak');
  await clear(page);

  // ---------- the player's mother ----------
  await G(page, () => { const g = window.__hype.S.game; g.createdAt = Date.now() - 2 * 86400000; g.stats.posts = 3; });
  await refresh(page, [{ t: 'mom', name: 'Sylvie Flux', handle: 'sylvie.flux59', emoji: '💐', text: `Bravo ma chérie !! @mila.flux tu es la plus belle. Bisous, Maman` }]);
  await ahead(page, 60000);
  await sleep(500);
  const mo = await G(page, () => {
    const H = window.__hype, g = H.S.game, n = g.npcs['sylvie.flux59'], pr = window.__prompts.filter((x) => x.includes('Le joueur actualise son fil')).slice(-1)[0] || '';
    return { mom: g.mom, reg: n && n.regular && n.mom, notif: g.notifs.some((x) => /Ta mère vient de créer son compte \(@sylvie\.flux59\)/.test(x.text)), post: g.posts.some((p) => p.a === 'n:sylvie.flux59' && /Bisous, Maman/.test(p.text)), offered: /"t":"mom"/.test(pr) && /Bravo mon amour|Bravo mon chéri|Bravo mon cœur/.test(pr), act: /la mère du joueur, répond en public/.test(H.promptAct(g, 'post', 'nouvelle vidéo demain', null, {}, null, {})), ctx: /@sylvie\.flux59 est la mère du joueur/.test(H.promptRefresh(g, 0)), again: !/"t":"mom"/.test(H.promptRefresh(g, 0)) };
  });
  await refresh(page, [{ t: 'mom', name: 'Autre Maman', handle: 'autre.maman', text: 'moi aussi' }]);
  const mo2 = await G(page, () => ({ mom: window.__hype.S.game.mom, other: !!window.__hype.S.game.npcs['autre.maman'] }));
  await G(page, () => window.__hype.openLayer({ t: 'npc', id: 'sylvie.flux59' }));
  await sleep(500);
  const moUi = await G(page, () => ({ chip: (document.querySelector('.layer .prof .chip') || {}).textContent, report: !!document.querySelector('.layer .npc-report') }));
  check('the player’s mother arrives once (when the AI decides, after a day and a few posts): she follows, her post signed « Bisous, Maman », her comments asked for under the player’s posts, the AI knows who she is; her profile says « Ta mère » (no reporting her)',
    mo.mom === 'sylvie.flux59' && mo.reg && mo.notif && mo.post && mo.offered && mo.act && mo.ctx && mo.again && mo2.mom === 'sylvie.flux59' && !mo2.other && moUi.chip === 'Ta mère' && !moUi.report, { mo, mo2, moUi });
  await clear(page);

  // ---------- a fan account, a ship ----------
  await G(page, () => { window.__hype.S.game.stats.followers = 6000; });
  await refresh(page, [{ t: 'fanacc', name: 'Mila Updates', handle: 'milaflux.updates', bio: 'tout sur @mila.flux, 24/7', text: 'Mila a encore tout cassé aujourd’hui 😭✨' }, { t: 'ship', a: me, b: 'theo.marlin', tag: '#MilaThéo' }, { t: 'ship', a: 'theo.marlin', b: me, tag: '#ThéoMila' }, { t: 'ship', a: 'zara.vey', b: 'zara.vey', tag: '#ZaraZara' }]);
  await ahead(page, 60000);
  await sleep(500);
  const fs1 = await G(page, () => {
    const H = window.__hype, g = H.S.game, n = g.npcs['milaflux.updates'];
    return { fan: n && n.fanOf === 'p' && n.regular, notif: g.notifs.some((x) => /Un compte fan rien que pour toi vient d’ouvrir : @milaflux\.updates/.test(x.text)), ships: (g.ships || []).map((s) => s.tag), shipN: g.notifs.some((x) => /Les fans te shippent avec Théo Marlin : #MilaThéo/.test(x.text)), ctx: /Ships du public : #MilaThéo \(le joueur × @theo\.marlin\)/.test(H.promptRefresh(g, 0)) };
  });
  await G(page, () => window.__hype.goTab('profile'));
  await sleep(500);
  const shipUi = await G(page, () => (document.querySelector('.ships') || {}).textContent || '');
  check('a fan account just for the player (a refresh line), a ship (the notice, on the profile, the AI knows it; the same pair twice or someone with themself: no)', fs1.fan && fs1.notif && JSON.stringify(fs1.ships) === '["#MilaThéo"]' && fs1.shipN && fs1.ctx && /#MilaThéo · Théo Marlin/.test(shipUi), { fs1, shipUi });
  await G(page, () => window.__hype.goTab('feed'));

  // ---------- fake accounts ----------
  await refresh(page, [{ t: 'fake', kind: 'giveaway', name: 'Mila Flux 🎁', handle: 'mila.flux.officiel', bio: 'concours officiel', text: '🎁 JE FAIS GAGNER 1 000 € ! envoyez vos coordonnées en DM pour participer' }]);
  await ahead(page, 60000);
  await sleep(500);
  const fk1 = await G(page, () => { const H = window.__hype, g = H.S.game, n = g.npcs['mila.flux.officiel']; return { fake: n && n.fake && n.fake.kind, post: g.posts.some((p) => p.a === 'n:mila.flux.officiel'), ctx: /@mila\.flux\.officiel est un FAUX compte/.test(H.promptRefresh(g, 0)) }; });
  await G(page, () => window.__hype.openLayer({ t: 'npc', id: 'mila.flux.officiel' }));
  await page.waitForSelector('.layer .npc-report');
  await shot(page, 'fake');
  await page.locator('.layer .npc-report').click();
  await sleep(300);
  const rep0 = await G(page, () => window.__hype.S.game.stats.reputation);
  await clear(page);
  await ahead(page, 50 * 60000);
  await G(page, () => window.__hype.tickSocial(window.__hype.S.game));
  const fk2 = await G(page, () => { const H = window.__hype, g = H.S.game, n = g.npcs['mila.flux.officiel']; return { gone: !!n.gone, posts: g.posts.some((p) => p.a === 'n:mila.flux.officiel'), notif: g.notifs.some((x) => /Le faux compte @mila\.flux\.officiel a été suspendu/.test(x.text)), rep: g.stats.reputation }; });
  check('a fake giveaway in the player’s name (the AI knows): reported, it is taken down a while later (its posts gone), the reputation a little up', fk1.fake === 'giveaway' && fk1.post && fk1.ctx && fk2.gone && !fk2.posts && fk2.notif && fk2.rep > rep0, { fk1, fk2, rep0 });
  await G(page, () => { const g = window.__hype.S.game; g.fakeAt = 0; });
  await refresh(page, [{ t: 'fake', kind: 'giveaway', name: 'Mila Flux', handle: 'mila.flux.cadeaux', text: '🎁 concours ! vos infos en DM' }]);
  await ahead(page, 60000);
  await sleep(500);
  const r1b = await G(page, () => window.__hype.S.game.stats.reputation);
  await ahead(page, 4 * 3600000);
  await G(page, () => window.__hype.tickSocial(window.__hype.S.game));
  const fk3 = await G(page, () => { const g = window.__hype.S.game; return { hurt: g.notifs.some((x) => /se sont fait piéger par le faux compte @mila\.flux\.cadeaux/.test(x.text)), rep: g.stats.reputation, trig: g.triggers.some((x) => /se sont fait arnaquer par @mila\.flux\.cadeaux/.test(x.text)) }; });
  await G(page, () => { const g = window.__hype.S.game, n = g.npcs['mila.flux.cadeaux']; n.gone = Date.now(); g.fakeAt = 0; });
  await refresh(page, [{ t: 'fake', kind: 'parodie', name: 'Mila Flux (parodie)', handle: 'mila.flop', text: 'aujourd’hui j’ai bu une potion et j’ai oublié mon prénom #MilaFlop' }]);
  await ahead(page, 60000);
  await sleep(500);
  await G(page, () => { const H = window.__hype, g = H.S.game; H.reportNpc(g, g.npcs['mila.flop']); H.tickSocial(g); });
  const fk4 = await G(page, () => { const g = window.__hype.S.game, n = g.npcs['mila.flop']; return { kind: n && n.fake.kind, gone: !!n.gone, said: g.notifs.some((x) => /@mila\.flop est une parodie, elle reste en ligne/.test(x.text)) }; });
  check('left alone, a fake giveaway costs (fans fooled, the reputation down, the network told); a parody reported stays (it is allowed)', fk3.hurt && fk3.rep < r1b && fk3.trig && fk4.kind === 'parodie' && !fk4.gone && fk4.said, { fk3, r1b, fk4 });
  await clear(page);

  // ---------- on a phone ----------
  await page.setViewportSize({ width: 390, height: 844 });
  await refresh(page, [{ t: 'story', by: 'theo.marlin', text: 'un dernier pour la route 🌙', poll: { q: 'dodo ?', a: ['oui', 'encore une'] } }]);
  await page.waitForFunction(() => window.__hype.liveStories(window.__hype.S.game).length >= 1, null, { timeout: 40000 }).catch(() => {});
  await G(page, () => window.__hype.goTab('feed'));
  await sleep(600);
  await shot(page, 'phone-bar');
  await page.locator('.stories-bar .sb-it', { hasText: 'Théo' }).locator('.sb-ring').click();
  await page.waitForSelector('.sv-card');
  await sleep(300);
  const ph = await G(page, () => {
    const out = [];
    if (document.documentElement.scrollWidth > 391) out.push('page ' + document.documentElement.scrollWidth);
    for (const el of document.querySelectorAll('.sv-card, .sv-poll, .sv-reply, .sv-reacts')) { const r = el.getBoundingClientRect(); if (r.width && (r.right > 391 || r.left < -1)) out.push(el.className + ' ' + Math.round(r.left) + '..' + Math.round(r.right)); }
    return out;
  });
  await shot(page, 'phone-story');
  check('on a phone (390): the bar and a story stay within the screen', ph.length === 0, ph);

  // ---------- a long game: the stories and the groups never make the save too big ----------
  const big = await G(page, () => {
    const H = window.__hype, g = H.S.game, t = Date.now(), cs = H.mains(g).filter((c) => !c.cut && !c.jailed).slice(0, 4), ids = cs.map((c) => c.id), long = 'bla '.repeat(70);
    for (const c of cs) c.unlocked = true;
    for (let k = 0; k < 8; k++) {
      const gr = H.addGroup(g, { by: g.chars[ids[0]].handle, with: ids.slice(1).map((id) => g.chars[id].handle), name: 'Groupe ' + k, text: 'salut' }, t - 1000);
      if (!gr) continue;
      for (let i = 0; i < 70; i++) H.addGroupMsg(g, gr, g.chars[ids[i % 4]], long + i, t - 1000 + i);
      if (k < 4) H.leaveGroup(g, gr);
    }
    for (let k = 0; k < 60; k++) H.addStory(g, { by: g.chars[ids[k % 4]].handle, text: long.slice(0, 150) + k }, t - 3 * 86400000 + k * 60000);
    const all = (g.groups || []).map((gr) => gr.msgs.length), before = H.coreSize(g);
    H.tickSocial(g, t);
    const ok = H.compactCore(g, 60000, () => H.coreSize(g));
    return { all, groups: g.groups.length, left: g.groups.filter((x) => x.left).length, msgs: Math.max(...g.groups.map((x) => x.msgs.length)), stories: (g.stories || []).filter((s) => s.until <= t).length, before, after: H.coreSize(g), ok };
  });
  check('a long game: 40 messages kept per group, the groups left trimmed; when the save is too big, the stories gone by and the old talk go first', Math.max(...big.all) === 40 && big.left <= 4 && big.msgs <= 20 && big.stories === 0 && big.after < big.before, big);

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
