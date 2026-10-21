// The agent, then the agency (0.31), in Chromium against the built hype.html with the mocked Claude runtime:
// - from a character's profile: the commission, the exclusivity, the proposal ready in their messages; their AI says yes
//   (and haggles), or no; too small an account: not yet;
// - the brands write to the player for a talent (the game's own, or one the AI brings): negotiated in the brand's
//   messages; passed on to the talent, who has the last word (their AI); signed; the sponsored post, written by their AI
//   in a refresh, delivers it: the commission; late, then lost; refused by the talent;
// - it goes wrong: signed behind the player's back (the commission claimed), the player competes with their talent, the
//   talent ends it;
// - the agency: two talents, its name, its cost; more room, its agent to hire; a rival agency (talked through, or not);
//   a talent's scandal splashes on it; the month's report; the brands come more often; what the AI knows;
// - on a phone.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/agency.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-agency');
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
const txt = (page, sel) => G(page, (s) => { const el = document.querySelector(s); if (!el) return ''; const c = el.cloneNode(true); for (const i of c.querySelectorAll('img.emo')) i.replaceWith(i.alt); return c.textContent.replace(/\s+/g, ' ').trim(); }, sel);

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
async function refresh(page, lines) {
  await G(page, (lines) => { const g = window.__hype.S.game; g.lastRefreshAt = 0; for (const p of g.posts) delete p.cd; window.__mockOnce = [{ has: 'Le joueur actualise son fil', add: true, lines }]; }, lines);
  await G(page, () => window.__hype.refreshFeed(0));
  await idle(page);
}
// A message to someone, their answer mocked (the lines of the test).
async function dm(page, id, text, has, lines) {
  await G(page, ({ has, lines }) => { window.__mockOnce = [{ has, lines }]; }, { has, lines });
  const n0 = await G(page, () => window.__prompts.length);
  await G(page, ({ id, text }) => window.__hype.sendDM(id, text), { id, text });
  await idle(page);
  await sleep(2200);
  return G(page, ({ n0, has }) => window.__prompts.slice(n0).find((p) => p.includes(has)) || '', { n0, has });
}
const ahead = (page, ms) => G(page, (ms) => { const H = window.__hype; H.jumpClock(H.S.game, ms); H.update(); }, ms);

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser, { width: 1280, height: 900 });
  await newGame(page);
  const ids = await G(page, () => {
    const H = window.__hype, g = H.S.game;
    window.__hypeEasyGear = true; window.__hypeNoGearEvents = true;
    g.stats.followers = 20000; g.career.cash = 10000;
    const set = (h, f, rel) => { const c = H.charByHandle(g, h); c.unlocked = true; c.followers = f; c.rel = rel; return c.id; };
    return { theo: set('theo.marlin', 50000, 45), leandre: set('leandre.aube', 30000, 30), iris: set('prof.gallant', 800, 20), nox: set('nox.ombre', 120000, 10) };
  });

  // ---------- from the profile: the commission, the exclusivity, the proposal ready in their messages ----------
  await clear(page);
  await G(page, (id) => window.__hype.openChar(id), ids.theo);
  await page.waitForSelector('.layer .agent-sec');
  const sec = await txt(page, '.layer .agent-sec');
  const small = await G(page, (id) => window.__hype.agentWhy(window.__hype.S.game, window.__hype.S.game.chars[id]), ids.iris);
  await shot(page, 'profile-agent');
  await page.locator('.layer .agent-sec button', { hasText: 'Lui proposer' }).click();
  await page.waitForSelector('.layer .agent-form');
  await page.locator('.layer .agent-form .seg button', { hasText: '20 %' }).click();
  await page.locator('.layer .agent-form .check-card input').check();
  await sleep(200);
  const form = await txt(page, '.layer .agent-form');
  await shot(page, 'agent-form');
  await page.locator('.layer .agent-form .btn-hot').click();
  await sleep(600);
  const asked = await G(page, (id) => { const H = window.__hype, g = H.S.game, T = H.talentOf(g, g.chars[id]); return { T: T && { state: T.state, cut: T.cut, excl: T.excl }, draft: H.S.drafts.dm[id] || '', dm: H.S.stack.some((l) => l.t === 'dm' && l.id === id) }; }, ids.theo);
  check('from a character\'s profile: « Devenir son agent » (what a sponsored post of theirs is worth); the commission and the exclusivity chosen, the proposal waits in their messages, ready to send; under 1 000 subscribers, not yet',
    /Devenir son agent/.test(sec) && /≈ 500\s€ par post sponsorisé/.test(sec) && /Moins de 1\s000 abonnés/.test(small) && /Pour 50\sk abonnés/.test(form) && /≈ 100\s€ pour toi/.test(form)
      && asked.T && asked.T.state === 'asked' && asked.T.cut === 20 && asked.T.excl && /devienne ton agent/.test(asked.draft) && /20 %/.test(asked.draft) && /exclusivité/.test(asked.draft) && asked.dm, { sec, small, form, asked });

  // ---------- their AI says yes (at 15 %), or no ----------
  const pr1 = await dm(page, ids.theo, 'Ça te dirait que je devienne ton agent ? 20 %, en exclusivité', 'de devenir son AGENT', [{ t: 'msg', text: 'grave, mais 15 % max' }, { t: 'rel', d: 2, why: 'agent' }, { t: 'agent', ok: true, cut: 15, why: 'je te fais confiance' }]);
  const yes = await G(page, (id) => { const H = window.__hype, g = H.S.game, T = H.talentOn(g, g.chars[id]); return { on: !!T, cut: T && T.cut, notif: g.notifs.some((n) => /🤝 Théo accepte : tu deviens son agent \(15 %, en exclusivité\)/.test(n.text)), mem: (g.chars[id].mem || []).some((m) => /mon agent/.test(m.t || m)) }; }, ids.theo);
  await G(page, (id) => { const H = window.__hype; H.askAgent(H.S.game, H.S.game.chars[id], { cut: 10 }); }, ids.leandre);
  await dm(page, ids.leandre, 'Je peux devenir ton agent ?', 'de devenir son AGENT', [{ t: 'msg', text: 'non merci' }, { t: 'rel', d: 0, why: '' }, { t: 'agent', ok: false, why: 'je gère seul' }]);
  const no = await G(page, (id) => { const H = window.__hype, g = H.S.game; return { T: H.talentOf(g, g.chars[id]), notif: g.notifs.some((n) => /Léandre ne veut pas de toi comme agent : « je gère seul »/.test(n.text)) }; }, ids.leandre);
  check('their AI decides: yes (Théo haggles the commission down to 15 %, the exclusivity kept), or no with their reason (Léandre); the proposal and what the player weighs are in their prompt',
    yes.on && yes.cut === 15 && yes.notif && yes.mem && !no.T && no.notif && /20 % de ce que il touche|prend 20 % de ce qu/.test(pr1) && /réputation pro \d+\/1000/.test(pr1) && /"t":"agent","ok":true/.test(pr1), { yes, no, pr: pr1.slice(pr1.indexOf('AGENT') - 40, pr1.indexOf('AGENT') + 300) });

  // ---------- a brand writes for the talent (the AI's, in a refresh), negotiated in its messages ----------
  await refresh(page, [{ t: 'offre_talent', for: 'theo.marlin', brand: 'Philtre & Co', emoji: '🧪', sector: 'boisson', product: 'ses potions énergisantes', text: 'Salut ! On adorerait bosser avec Théo, tu gères ses contrats ?' }]);
  const off = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, d = (g.agency.deals || []).find((x) => x.c === id && x.brand === 'Philtre & Co');
    if (!d) return null;
    const b = g.chars[d.contact], m = (g.dms[b.id] || { msgs: [] }).msgs;
    return { id: d.id, fee: d.fee, lo: d.lo, max: d.max, state: d.state, contact: b.id, kind: b.kind, pitch: m.some((x) => /tu gères ses contrats/.test(x.text || '')), card: m.some((x) => x.sys === 'tdeal' && x.tdeal === d.id), notif: g.notifs.some((n) => /Philtre & Co veut Théo pour un partenariat : .* \(ta commission : /.test(n.text)) };
  }, ids.theo);
  await clear(page);
  await G(page, (b) => window.__hype.openDM(b), off && off.contact);
  await page.waitForSelector('.layer .td-card');
  const card = await txt(page, '.layer .td-card');
  await shot(page, 'brand-offer');
  await page.locator('.layer .td-card button', { hasText: 'Négocier' }).click();
  await sleep(300);
  const nego = await G(page, (b) => document.querySelector('.layer .reply-box textarea').value, off.contact);
  const pr2 = await dm(page, off.contact, nego, 'en tant qu’AGENT de @theo.marlin', [{ t: 'msg', text: 'ok, on peut monter un peu' }, { t: 'rel', d: 1, why: '' }, { t: 'tdeal', fee: 99999, days: 6 }]);
  const after = await G(page, (id) => { const H = window.__hype, g = H.S.game, d = H.tdealOf(g, id); return { fee: d.fee, max: d.max, days: d.days, upd: (g.dms[d.contact].msgs || []).filter((x) => x.sys === 'tdeal' && x.tdeal === id).length, notif: g.notifs.some((n) => /Philtre & Co revoit son offre pour Théo/.test(n.text)) }; }, off.id);
  check('a brand of this world (brought by the AI) writes to the player for their talent: its message and its offer (the commission said); negotiated in its messages (the agent\'s argument ready), the price never above its maximum',
    off && off.state === 'offer' && off.kind === 'brand' && off.pitch && off.card && off.notif && /Philtre & Co × Théo/.test(card) && /Proposer à Théo/.test(card) && /Ta commission/.test(card)
      && /50\sk abonnés très engagés/.test(nego) && /OBLIGATOIRE dès que/.test(pr2) && /"t":"tdeal"/.test(pr2) && after.fee === after.max && after.days === 6 && after.upd === 2 && after.notif, { off, card, nego, after });

  // ---------- passed on to the talent, who has the last word; signed ----------
  await page.locator('.layer .td-card button', { hasText: 'Proposer à Théo' }).last().click();
  await sleep(500);
  const passed = await G(page, ({ id, theo }) => { const H = window.__hype, g = H.S.game, d = H.tdealOf(g, id); return { state: d.state, draft: H.S.drafts.dm[theo] || '', card: (g.dms[theo].msgs || []).some((x) => x.sys === 'tdeal' && x.tdeal === id && x.talent) }; }, { id: off.id, theo: ids.theo });
  await shot(page, 'talent-card');
  const pr3 = await dm(page, ids.theo, passed.draft, 'son agent, lui transmet une proposition', [{ t: 'msg', text: 'carrément, ça me ressemble' }, { t: 'rel', d: 1, why: '' }, { t: 'partenariat', ok: true, why: 'les potions c’est ma vie' }]);
  const signed = await G(page, (id) => { const H = window.__hype, g = H.S.game, d = H.tdealOf(g, id), b = g.chars[d.contact]; return { state: d.state, due: d.due > Date.now(), brandDM: (g.dms[b.id].msgs || []).some((x) => /signé pour @theo\.marlin|contrat signé/.test(x.text || '')), notif: g.notifs.some((n) => /✍️ Théo accepte Philtre & Co/.test(n.text)) }; }, off.id);
  check('« Proposer à Théo »: the offer goes to the talent (their card says their share), their AI judges whether the brand fits them; yes: signed, the brand is told, a deadline',
    passed.state === 'ask' && /J’ai une proposition pour toi : Philtre & Co/.test(passed.draft) && passed.card && /cette marque lui ressemble/.test(pr3) && /"t":"partenariat"/.test(pr3) && signed.state === 'signed' && signed.due && signed.brandDM && signed.notif, { passed, signed });

  // ---------- the sponsored post, written by their AI in a refresh: the commission ----------
  const cash0 = await G(page, () => window.__hype.S.game.career.cash);
  const n4 = await G(page, () => window.__prompts.length);
  await refresh(page, [{ t: 'post', by: 'leandre.aube', text: 'je poste pour Philtre aussi lol #partenariat', deal: off.id }, { t: 'post', by: 'theo.marlin', text: 'mes potions énergisantes du matin avec @philtre ⚡ #partenariat', deal: off.id }]);
  const done = await G(page, ({ id, cash0, n4, theo }) => {
    const H = window.__hype, g = H.S.game, d = H.tdealOf(g, id), T = H.talentOn(g, g.chars[theo]), p = g.posts.find((x) => x.id === d.post);
    const pr = window.__prompts.slice(n4).find((x) => x.includes('Le joueur actualise son fil')) || '';
    return { state: d.state, com: g.career.cash - cash0, expect: H.cutOf(15, d.fee), byTheo: p && p.a === 'c:' + theo, sp: p && p.sp, T: { deals: T.deals, earned: T.earned }, rep: g.agency.rep, asked: pr.includes(`"deal":"${id}"`), ledger: g.career.ledger.some((x) => /Commission 15 % : Théo × Philtre & Co/.test(x.label)), notif: g.notifs.some((n) => /🤝 Théo a livré son partenariat Philtre & Co : \+/.test(n.text)) };
  }, { id: off.id, cash0, n4, theo: ids.theo });
  await ahead(page, 10 * 60000);
  await clear(page);
  await G(page, () => window.__hype.goTab('feed'));
  await sleep(400);
  const flag = await G(page, () => [...document.querySelectorAll('.post-flag')].map((e) => e.textContent).join(' | '));
  await G(page, () => { const f = [...document.querySelectorAll('.post-flag')].find((e) => /Collaboration commerciale/.test(e.textContent)); if (f) f.closest('.post').scrollIntoView({ block: 'center' }); });
  await shot(page, 'feed-sponsored');
  check('the refresh asks their AI for the sponsored post (with its "deal"); the talent\'s post delivers it (someone else\'s does not): the brand pays, the player takes 15 %, the agent\'s name rises; the feed says « Collaboration commerciale »',
    done.asked && done.state === 'done' && done.byTheo && done.com === done.expect && done.com > 0 && done.T.deals === 1 && done.T.earned === done.com && done.rep > 50 && done.ledger && done.notif && /Collaboration commerciale · Philtre & Co/.test(flag), Object.assign({}, done, { flag }));

  // ---------- refused by the talent; late, then lost ----------
  const lost = await G(page, async (theo) => {
    const H = window.__hype, g = H.S.game, c = g.chars[theo], out = {};
    const d1 = H.makeTalentOffer(g, c, { brand: 'Volta', sector: 'boisson', product: 'sa boisson énergisante' });
    out.offer = !!d1; H.askTalentDeal(g, d1);
    out.refused = H.applyTdealAnswer(g, c, { ok: false, why: 'pas mon univers' }) && d1.state === 'refused' && g.notifs.some((n) => /🙅 Théo ne veut pas de Volta : « pas mon univers »/.test(n.text));
    const d2 = H.makeTalentOffer(g, c, { brand: 'Bulle Givrée', sector: 'boisson' });
    H.askTalentDeal(g, d2); H.signTdeal(g, d2);
    const r0 = g.agency.rep;
    H.jumpClock(g, (d2.days + 0.5) * 86400000);
    out.late = d2.state === 'late' && g.agency.rep === r0 - 4 && g.notifs.some((n) => /⏰ Théo n’a pas encore posté pour Bulle Givrée/.test(n.text)) && (g.dms[d2.contact].msgs || []).some((x) => /toujours rien vu passer de @theo\.marlin/.test(x.text || ''));
    H.jumpClock(g, 2.2 * 86400000);
    out.failed = d2.state === 'failed' && g.agency.rep === r0 - 14 && g.notifs.some((n) => /💔 Partenariat Bulle Givrée perdu : Théo n’a jamais posté/.test(n.text));
    return out;
  }, ids.theo);
  check('refused by the talent (their reason said, the brand told); signed and never posted: late (the brand complains, the agent\'s name drops), then lost two days later',
    lost.offer && lost.refused && lost.late && lost.failed, lost);

  // ---------- behind the player's back (an exclusive contract: the commission claimed); the player competes with their talent ----------
  await refresh(page, [{ t: 'post', by: 'theo.marlin', text: 'nouvelle collab avec Sonar 🎧 #partenariat' }, { t: 'dans_le_dos', by: 'theo.marlin', brand: 'Sonar' }]);
  await clear(page);
  await G(page, () => { window.__hype.goTab('studio'); window.__hype.update(); });
  await sleep(500);
  const alert = await txt(page, '.agency');
  await G(page, () => document.querySelector('.agency').scrollIntoView({ block: 'start' }));
  await shot(page, 'studio-agency');
  const cash1 = await G(page, () => window.__hype.S.game.career.cash);
  const rel1 = await G(page, (id) => window.__hype.S.game.chars[id].rel, ids.theo);
  await page.locator('.agency button', { hasText: 'Réclamer ta commission' }).click();
  await sleep(300);
  const claim = await G(page, ({ id, cash1, rel1 }) => { const H = window.__hype, g = H.S.game, T = H.talentOn(g, g.chars[id]); return { got: g.career.cash - cash1, behind: T.behind, relDown: g.chars[id].rel < rel1, trig: (g.triggers || []).some((x) => /réclame à @theo\.marlin sa commission sur le partenariat Sonar/.test(x.text)) }; }, { id: ids.theo, cash1, rel1 });
  const clash = await G(page, (id) => {
    const H = window.__hype, g = H.S.game, c = g.chars[id];
    for (const d of g.agency.deals) if (d.c === id && (d.state === 'offer' || d.state === 'ask')) d.state = 'expired';
    const td = H.makeTalentOffer(g, c, { brand: 'Pixelforge', sector: 'tech' });
    const r0 = c.rel;
    g.deals = g.deals.filter((d) => d.state !== 'offer');
    const own = H.makeOffer(g, { brand: 'Pixelforge', sector: 'tech', gift: false });
    const ok = own && H.signDeal(g, own, { force: true });
    return { td: !!td, own: !!ok, rel: c.rel - r0, trig: (g.triggers || []).some((x) => /conflit d’intérêts/.test(x.text)) };
  }, ids.theo);
  check('signed behind the player\'s back (the AI\'s doing): the Studio says it; their contract is exclusive: the commission claimed (they take it badly); the player signs for themselves with a brand their talent was dealing with: a conflict of interest',
    /Théo a signé avec Sonar sans passer par toi/.test(alert) && claim.got > 0 && !claim.behind && claim.relDown && claim.trig && clash.td && clash.own && clash.rel <= -8 && clash.trig, { alert: alert.slice(0, 300), claim, clash });

  // ---------- the agency: two talents, its name, its cost; more room, its agent ----------
  const pre = await G(page, (id) => { const H = window.__hype, g = H.S.game; H.askAgent(g, g.chars[id], { cut: 15 }); H.applyAgentLine(g, g.chars[id], { ok: true }); return { why: H.agencyWhy(g), cap: H.talentCap(g), recruit: null }; }, ids.nox);
  await clear(page);
  await G(page, () => window.__hype.openLayer({ t: 'recruit' }));
  await sleep(300);
  const before = await G(page, () => [...document.querySelectorAll('.layer .role-opt')].some((e) => /agence/i.test(e.textContent)));
  await clear(page);
  await G(page, () => { window.__hype.goTab('studio'); window.__hype.update(); });
  await sleep(400);
  await page.locator('.agency button', { hasText: 'Monter ton agence' }).click();
  await page.fill('.agency .ag-found input', 'Lumen Talents');
  await page.locator('.agency .ag-found .chip-btn', { hasText: '🦋' }).click();
  const cash2 = await G(page, () => window.__hype.S.game.career.cash);
  await page.locator('.agency .ag-found button', { hasText: 'Monter l’agence' }).click();
  await sleep(400);
  const founded = await G(page, (cash2) => { const H = window.__hype, g = H.S.game, A = g.agency; return { name: A.name, emoji: A.emoji, paid: cash2 - g.career.cash, cap: H.talentCap(g), notif: g.notifs.some((n) => /🦋 Ton agence « Lumen Talents » est née/.test(n.text)), trig: (g.triggers || []).some((x) => /lance son agence d’influence « Lumen Talents »/.test(x.text)), ctx: H.agencyCtx(g) }; }, cash2);
  const head = await txt(page, '.agency .section-h');
  await G(page, () => document.querySelector('.agency').scrollIntoView({ block: 'start' }));
  await shot(page, 'agency');
  await clear(page);
  await G(page, () => window.__hype.openLayer({ t: 'recruit' }));
  await sleep(300);
  const after2 = await G(page, () => [...document.querySelectorAll('.layer .role-opt')].some((e) => /agence/i.test(e.textContent)));
  const staffed = await G(page, () => { const H = window.__hype, g = H.S.game, c = Object.values(g.chars).find((x) => x.kind === 'brand'); g.staff.push({ id: 'st-ag', c: c.id, role: 'agence', tier: 1, rate: 600, since: Date.now(), next: Date.now() + 7 * 86400000, unpaid: 0 }); const cap = H.talentCap(g); g.staff = g.staff.filter((m) => m.id !== 'st-ag'); return cap; });
  check('with two talents: « Monter ton agence » (its name, its emoji, 2 000 €): room for six talents, its agent to hire (only then: +1 talent per level), the milieu hears of it, the AI knows',
    /Il te faut 2 talents|^$/.test(pre.why) && pre.cap === 3 && !before && founded.name === 'Lumen Talents' && founded.emoji === '🦋' && founded.paid === 2000 && founded.cap === 6 && founded.notif && founded.trig && /🦋 Lumen Talents/.test(head) && after2 && staffed === 8
      && /Il dirige une agence d’influence, « Lumen Talents » : il représente @theo\.marlin, @nox\.ombre/.test(founded.ctx), { pre, before, founded, head, after2, staffed });

  // ---------- a rival agency: talked through in their messages, or their loyalty decides ----------
  await refresh(page, [{ t: 'rivale', for: 'nox.ombre', agence: 'Étoile Noire', why: 'des contrats 30 % plus gros' }]);
  const pr5 = await dm(page, ids.nox, 'Reste avec nous, on va faire de grandes choses', 'essaie de débaucher', [{ t: 'msg', text: 'ok je reste' }, { t: 'rel', d: 2, why: '' }, { t: 'agent', reste: true }]);
  const rival = await G(page, (id) => { const H = window.__hype, g = H.S.game, T = H.talentOn(g, g.chars[id]); return { on: !!T, poach: T && T.poach, notif: g.notifs.some((n) => /🦈 Étoile Noire fait les yeux doux à Nox : des contrats 30 % plus gros/.test(n.text)), stay: g.notifs.some((n) => /🤝 Nox dit non à Étoile Noire : (il|elle|iel) reste avec toi/.test(n.text)) }; }, ids.nox);
  const gone = await G(page, (id) => { const H = window.__hype, g = H.S.game, c = g.chars[id]; c.rel = 5; H.applyRival(g, c, 'Requins & Co', 'tout l’or du monde'); H.jumpClock(g, 2.1 * 86400000); return { T: H.talentOf(g, c), notif: g.notifs.some((n) => /💔 Nox te quitte pour l’agence Requins & Co/.test(n.text)) }; }, ids.nox);
  check('a rival agency (the AI\'s doing) tries to take a talent: said, and in their prompt; talked through, they stay; left alone with a cold relationship, they go two days later',
    rival.on && !rival.poach && rival.notif && rival.stay && /Étoile Noire essaie de débaucher Nox/.test(pr5) && /"reste":true/.test(pr5) && !gone.T && gone.notif, { rival, gone });

  // ---------- a talent's scandal splashes; the month's report; the brands come more often; the end of a contract ----------
  const misc = await G(page, (theo) => {
    const H = window.__hype, g = H.S.game, A = g.agency, c = g.chars[theo], out = {};
    const r0 = A.rep; c.badBuzz = { at: Date.now(), until: Date.now() + 3600000, reason: 'test', loss: 0, strength: 0.5 }; H.tickAgency(g);
    out.splash = A.rep === r0 - 3 && g.notifs.some((n) => /📉 Le bad buzz de Théo éclabousse ton agence « Lumen Talents »/.test(n.text));
    c.badBuzz = null;
    A.month = { k: 'x', deals: 2, earned: 300, m: 9 }; H.tickAgency(g);
    out.report = g.notifs.some((n) => /🦋 Lumen Talents en octobre : 2 partenariats livrés, \+300\s€ de commissions/.test(n.text));
    for (const d of A.deals) if (d.state === 'offer' || d.state === 'ask') d.state = 'expired';
    c.followers = 400000; A.rep = 80;
    const n0 = A.deals.length; H.jumpClock(g, 6 * 86400000); out.offers = A.deals.slice(n0).filter((d) => d.c === theo).length; out.one = A.deals.filter((d) => d.c === theo && (d.state === 'offer' || d.state === 'ask')).length;
    const open = A.deals.filter((d) => d.c === theo && (d.state === 'offer' || d.state === 'ask'));
    H.applyAgentLine(g, c, { fin: true, why: 'je veux voler de mes propres ailes' });
    out.ended = !H.talentOf(g, c) && open.every((d) => d.state === 'withdrawn') && g.notifs.some((n) => /💔 Théo met fin à ton contrat d’agent : « je veux voler de mes propres ailes »/.test(n.text));
    return out;
  }, ids.theo);
  check('a talent\'s scandal splashes on the agency; the month\'s report; a big talent with a trusted agent gets offers on their own (one open at a time); their AI ends it: the offers still open go',
    misc.splash && misc.report && misc.offers >= 1 && misc.one === 1 && misc.ended, misc);

  // ---------- on a phone ----------
  await G(page, (id) => { const H = window.__hype, g = H.S.game; H.askAgent(g, g.chars[id], { cut: 15 }); H.applyAgentLine(g, g.chars[id], { ok: true }); H.makeTalentOffer(g, g.chars[id], { brand: 'Lueur', sector: 'beaute' }); }, ids.theo);
  await clear(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await G(page, () => { window.__hype.goTab('studio'); window.__hype.update(); });
  await sleep(500);
  await G(page, () => document.querySelector('.agency').scrollIntoView());
  await sleep(200);
  const ph = await G(page, () => { const w = window.innerWidth, out = []; for (const el of document.querySelectorAll('.agency *')) { const r = el.getBoundingClientRect(); if (r.width && (r.right > w + 1 || r.left < -1)) out.push(el.className || el.tagName); } return out.slice(0, 4); });
  await shot(page, 'phone-agency');
  await G(page, (id) => window.__hype.openLayer({ t: 'agent', id }), ids.leandre);
  await page.waitForSelector('.layer .agent-form');
  await sleep(700);
  const ph2 = await G(page, () => { const w = window.innerWidth, out = []; for (const el of document.querySelectorAll('.layer .agent-form *')) { const r = el.getBoundingClientRect(); if (r.width && (r.right > w + 1 || r.left < -1)) out.push(el.className || el.tagName); } return out.slice(0, 4); });
  await shot(page, 'phone-agent-form');
  check('on a phone (390): the agency and « Devenir son agent » stay inside the screen', ph.length === 0 && ph2.length === 0, { ph, ph2 });

  await browser.close();
  console.log('ERRORS', errors.length ? '\n' + errors.join('\n') : 'none');
  const pass = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`${pass}/${checks.length} PASS`);
  process.exit(pass === checks.length && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
