// 0.26 end to end, in Chromium against the built hype.html with the mocked Claude runtime: the inventory and the
// second-hand app.
// - nothing is sold in the player's place any more: the gear replaced, a brand's gear that is not better, a brand's
//   products, what the player buys for themselves (an object), a present from someone (their messages, a date):
//   all of it waits in the inventory; the gear can be used again from there;
// - selling: the player's price, the game says what it is worth and how fast it would go (a warm community and a big
//   audience pay more); it sells with game time, no AI call; the app lists what is on sale and what sold;
// - a brand whose gift goes on sale soon after: a trigger for its contact, a line in its DMs, and it may break a
//   contract not delivered yet (its AI decides); the story knows what the player sells.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> node test/v26.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-v26');
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


const toStudio = (page) => G(page, () => { const H = window.__hype; H.S.stack = []; H.goTab('studio'); H.update(); });

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);
  await newGame(page, 'Créatrice tech, fan de gadgets');
  await G(page, () => { const g = window.__hype.S.game; g.career.cash = 8000; g.stats.followers = 40000; g.career.warmth = 70; window.__hypeEasyGear = false; });

  // ---------- gear bought: the old one waits in the inventory, and can be used again ----------
  const gb = await G(page, () => {
    const H = window.__hype, g = H.S.game, out = {};
    g.gear.items.light = H.mkItem(0);
    const c0 = g.career.cash;
    out.buy = H.buyGear(g, 'light', 1);
    out.paid = c0 - g.career.cash;
    const x = H.invLive(g).find((y) => y.kind === 'gear' && y.gear.k === 'light');
    out.inv = x && { name: x.name, cond: x.cond, value: x.value, how: x.from.how };
    out.notif = (g.notifs.filter((n) => /inventaire/.test(n.text)).pop() || {}).text || '';
    return out; });
  await toStudio(page);
  await page.waitForSelector('.inv-sec .inv-row', { timeout: 5000 });
  await sleep(300);
  await page.locator('.inv-sec .inv-row').first().scrollIntoViewIfNeeded();
  await shot(page, 'studio-inventory');
  await dismiss(page);
  await page.locator('.inv-sec .inv-row .btn', { hasText: 'Utiliser' }).first().click();
  await sleep(300);
  const eq = await G(page, () => { const H = window.__hype, g = H.S.game; return { used: g.gear.items.light.t, inv: H.invLive(g).filter((y) => y.kind === 'gear' && y.gear.k === 'light').map((y) => y.gear.it.t) }; });
  check('gear bought: the old one is not sold any more, it waits in the inventory (« Ton ancien matos », used, its value); « Utiliser » puts it back in use, the other one goes to the inventory',
    gb.buy && gb.paid === 200 && gb.inv && gb.inv.name === 'Petite lampe LED' && gb.inv.cond === 'bon' && gb.inv.value === 40 && gb.inv.how === 'ancien' && /Anneau lumineux acheté : 200/.test(gb.notif) && /inventaire/.test(gb.notif) && eq.used === 0 && eq.inv.join() === '1', Object.assign({ eq }, gb));

  // ---------- a brand's gear, its products ----------
  const br = await G(page, () => {
    const H = window.__hype, g = H.S.game, G0 = g.gear, out = {};
    const clean = () => g.deals.filter((d) => d.state === 'offer').forEach((d) => { d.state = 'declined'; });
    clean(); G0.items.cam = H.mkItem(2);
    const d1 = H.makeOffer(g, { brand: 'Pixelforge', sector: 'tech', what: 'vidéo', gift: { kind: 'light', t: 2 }, scam: '' }); d1.exclusive = false;
    const c0 = g.career.cash; H.signDeal(g, d1);
    out.better = { used: G0.items.light.t, cash: g.career.cash - c0 };
    clean();
    const d2 = H.makeOffer(g, { brand: 'Sonar', sector: 'tech', what: 'vidéo', gift: { kind: 'cam', t: 1 }, scam: '' }); d2.exclusive = false;
    H.signDeal(g, d2);
    const kept = H.invLive(g).find((x) => x.kind === 'gear' && x.gear.k === 'cam');
    out.kept = kept && { cond: kept.cond, how: kept.from.how, brand: kept.from.brand, deal: kept.from.deal === d2.id, cam: G0.items.cam.t };
    clean();
    const d3 = H.makeOffer(g, { brand: 'Croc’Midi', product: 'ses box repas', what: 'short', gift: false, scam: '' });
    Object.assign(d3, { fee: 0, fee0: 0, value: 90, gift: null, scam: '', exclusive: false, upfront: 0, max: 72 });
    H.signDeal(g, d3);
    const box = H.invLive(g).find((x) => x.kind === 'goods');
    out.goods = box && { name: box.name, value: box.value, cond: box.cond, brand: box.from.brand, deal: box.from.deal === d3.id };
    out.d3 = d3.id;
    return out; });
  check('a brand’s gear, better than the player’s: in use (no money); not better: it waits in the inventory, new, « Offert par » the brand; a brand’s products arrive at the signature, in the inventory',
    br.better.used === 2 && br.better.cash === 0 && br.kept && br.kept.cond === 'neuf' && br.kept.how === 'marque' && br.kept.brand === 'Sonar' && br.kept.deal && br.kept.cam === 2
      && br.goods && br.goods.name === 'Box repas' && br.goods.value === 90 && br.goods.cond === 'neuf' && br.goods.brand === 'Croc’Midi' && br.goods.deal, br);

  // ---------- what the player buys for themselves; presents from someone ----------
  const tid = await G(page, () => { const H = window.__hype, g = H.S.game, t = H.charByHandle(g, 'theo.marlin'); Object.assign(t, { age: 24, rel: 50, unlocked: true, coeur: 'serein' }); return t.id; });
  const pr = await G(page, async (id) => {
    const H = window.__hype, g = H.S.game, t = g.chars[id], out = {};
    const n0 = H.invLive(g).length;
    H.applyBuy(g, t, { kind: 'perso', what: 'une veste en jean', price: 80, obj: true }, 'dm');
    H.applyBuy(g, t, { kind: 'perso', what: 'un smoothie', price: 6 }, 'dm');
    const v = H.invLive(g).find((x) => x.kind === 'buy');
    out.buy = { n: H.invLive(g).length - n0, name: v && v.name, value: v && v.value };
    out.line = /"obj":true/.test(H.BUY_LINE(g, t));
    // their messages: a present (the line only when it is talked about)
    out.noLine = !H.promptDM(g, t, [], 'tu fais quoi ce soir ?').includes('{"t":"gift"');
    window.__mockGift = { what: 'un porte-clés en forme de chaudron', value: 12 };
    await H.sendDM(id, 'merci pour le cadeau, c’est quoi ?');
    const gm = g.dms[id].msgs.find((m) => m.sys === 'gift');
    const x = H.invLive(g).find((y) => y.kind === 'gift');
    out.dm = { card: !!gm, item: x && { name: x.name, value: x.value, c: x.from.c === id }, sys: H.promptDM(g, t, g.dms[id].msgs.slice(-12), 'il est trop beau').includes('[Théo offre au joueur : Un porte-clés en forme de chaudron]') };
    // a date: a present after their words
    const ev = { id: 'evGift', kind: 'rdv', c: id, player: true, what: 'Un verre en terrasse', diff: 'facile', due: Date.now() - 60000, state: 'scheduled' };
    ev.talk = { scene: 'Une terrasse.', lines: [{ who: 'c', text: 'salut' }], turn: 1, max: 5, reacts: [{ r: 'charme', w: 1 }], used: [], at: Date.now() };
    g.events.push(ev);
    window.__mockGift = { what: 'un bracelet en perles', value: 25 };
    window.__mockReacts = ['charme'];
    await H.talkTurn(ev, 'oh, une surprise ? c’est pour moi ?');
    const gl = ev.talk.lines.find((y) => y.who === 'gf');
    out.date = { line: gl && gl.text, after: ev.talk.lines.map((y) => y.who).join(''), item: H.invLive(g).some((y) => y.kind === 'gift' && /bracelet/.test(y.name)), tr: H.talkTranscript(g, ev).some((y) => /Théo offre au joueur : Un bracelet en perles/.test(y)) };
    return out; }, tid);
  check('what the player buys for themselves, when it is an object, waits in the inventory (a smoothie does not); a present from someone, in their messages or at a date (the line only when it is talked about): a card, the inventory, and the AI reads it',
    pr.buy.n === 1 && pr.buy.name === 'Une veste en jean' && pr.buy.value === 80 && pr.line && pr.noLine && pr.dm.card && pr.dm.item && pr.dm.item.name === 'Un porte-clés en forme de chaudron' && pr.dm.item.value === 12 && pr.dm.item.c && pr.dm.sys
      && pr.date.line === 'Un bracelet en perles' && /cgf$/.test(pr.date.after) && pr.date.item && pr.date.tr, pr);

  // ---------- the price: what it is worth, a warm community and a big audience pay more ----------
  const px = await G(page, ([d3]) => {
    const H = window.__hype, g = H.S.game, box = H.invLive(g).find((x) => x.kind === 'goods'), out = {};
    g.career.warmth = 20; g.stats.followers = 2000; out.cold = H.suggestOf(g, box); out.dCold = H.resaleDemand(g);
    g.career.warmth = 90; g.stats.followers = 300000; out.warm = H.suggestOf(g, box); out.dWarm = H.resaleDemand(g);
    out.fair = H.fairOf(g, box);
    out.speed = [H.saleSpeed(g, box, Math.round(out.warm * 0.7)), H.saleSpeed(g, box, out.warm * 3)];
    return out; }, [br.d3]);
  check('the price: what it is worth second hand (new: 75 % of its value), more with a warm community and a big audience; the speed told in words (cheap: soon; far too dear: maybe never)',
    px.fair === 67.5 && px.warm > px.cold && px.dWarm > px.dCold && /dans la journée|un ou deux jours/.test(px.speed[0]) && /jamais|ne partira pas/.test(px.speed[1]), px);

  // ---------- selling a brand's products a few days later: the brand may see it ----------
  const boxId = await G(page, () => window.__hype.invLive(window.__hype.S.game).find((x) => x.kind === 'goods').id);
  await dismiss(page);
  await G(page, (id) => { const H = window.__hype; H.S.stack = []; H.openLayer({ t: 'sell', id }); H.update(); }, boxId);
  await page.waitForSelector('.layer .sell', { timeout: 5000 });
  await sleep(300);
  const sheet = await G(page, () => { const L = [...document.querySelectorAll('.layer')].pop(); return { title: L.querySelector('.layer-head h2').textContent, picks: [...L.querySelectorAll('.sell-picks .chip-btn')].map((b) => b.textContent), price: L.querySelector('#sell-price').value, note: L.querySelector('.sell > p.muted').textContent, speed: (L.querySelector('.sell .field small') || {}).textContent || '' }; });
  await shot(page, 'sell-sheet');
  await page.click('.layer .sell .btn-hot');
  await sleep(400);
  const listed = await G(page, ([id, d3]) => {
    const H = window.__hype, g = H.S.game, x = H.invItem(g, id), d = g.deals.find((y) => y.id === d3), c = g.chars[d.contact];
    return { sale: x.sale && x.sale.price, resold: !!d.resold, trig: H.activeTriggers(g, c.id).some((t) => /tombe sur l’annonce/.test(t.text) && /Box repas/.test(t.text)),
      dm: H.promptDM(g, c, [], 'coucou').includes('Le joueur a mis en vente sur Occaz ce que Croc’Midi lui avait offert'), walk: H.promptDM(g, c, [], 'coucou').includes('Si elle rompt le contrat (le joueur a revendu leur cadeau)'),
      ctx: /Le joueur revend des affaires sur Occaz : Box repas/.test(H.ctxText(g)) };
  }, [boxId, br.d3]);
  check('the sell sheet: what it is worth, the community’s bonus, three prices to pick, how fast; on sale: the brand’s contact may see it (a trigger), its DMs know it and it may break the contract not delivered yet; the story knows what the player sells',
    /Vendre sur Occaz/.test(sheet.title) && sheet.picks.length === 3 && /Prix conseillé/.test(sheet.picks[1]) && +sheet.price > 0 && /^Neuf, jamais servi : ça se revend autour de/.test(sheet.note) && /tes abonnés paient jusqu’à/.test(sheet.note) && /À .* ça /.test(sheet.speed)
      && listed.sale === +sheet.price && listed.resold && listed.trig && listed.dm && listed.walk && listed.ctx, { sheet, listed });

  // ---------- it sells with game time (no AI call); the brand breaks the contract ----------
  const sold = await G(page, ([id, d3]) => {
    const H = window.__hype, g = H.S.game, x = H.invItem(g, id), n0 = window.__prompts.length, c0 = g.career.cash, w0 = g.career.warmth;
    window.__trustRolls = [0.999];
    H.tickResale(g, Date.now() + 2 * 3600000);
    const still = !!x.sale && !x.sold;
    window.__trustRolls = [0];
    H.tickResale(g, Date.now() + 6 * 3600000);
    const out = { still, sold: !!x.sold, price: x.sold && x.sold.price, cash: g.career.cash - c0, calls: window.__prompts.length - n0, notif: (g.notifs.filter((n) => /Vendu sur Occaz/.test(n.text)).pop() || {}).text || '', views: x.sold ? true : false };
    out.warm = g.career.warmth >= w0;
    const d = g.deals.find((y) => y.id === d3), c = g.chars[d.contact];
    d.upfront = 0;
    H.applyDealLine(g, c, { t: 'deal', walk: true });
    out.broken = d.state;
    return out; }, [boxId, br.d3]);
  check('it sells with game time (a roll each hour, more likely at the right price), no AI call: the money, a notice (to whom), the community a little warmer if a fan bought it; the brand, seeing its gift sold, breaks the contract',
    sold.still && sold.sold && sold.price > 0 && sold.cash === sold.price && sold.calls === 0 && /Vendu sur Occaz : Box repas/.test(sold.notif) && sold.warm && sold.broken === 'broken', sold);

  // ---------- the app ----------
  await dismiss(page);
  await G(page, () => { const H = window.__hype, g = H.S.game; const v = H.invLive(g).find((x) => x.kind === 'buy'); H.listItem(g, v.id, 45); H.S.stack = []; H.openLayer({ t: 'resale' }); H.update(); });
  await page.waitForSelector('.layer .rs-grid', { timeout: 5000 });
  await sleep(300);
  const app = await G(page, () => { const L = [...document.querySelectorAll('.layer')].pop(); return { title: L.querySelector('.rs-title b').textContent, stats: L.querySelector('.rs-stats').textContent, cards: [...L.querySelectorAll('.rs-card')].map((c) => c.querySelector('.rs-name').textContent + ' ' + c.querySelector('.rs-price').textContent) }; });
  await shot(page, 'resale-app');
  await page.locator('.layer .seg button', { hasText: 'Vendus' }).click();
  await sleep(300);
  const soldTab = await G(page, () => [...[...document.querySelectorAll('.layer')].pop().querySelectorAll('.rs-card.sold .rs-name')].map((x) => x.textContent));
  check('the second-hand app (its own name in this world): what is on sale with its price, what sold, the money made',
    app.title === 'Occaz' && /1 en vente/.test(app.stats) && /1 vendu/.test(app.stats) && app.cards.some((c) => /Une veste en jean 45/.test(c)) && soldTab.includes('Box repas'), { app, soldTab });

  console.log('\nERRORS', errors.length ? errors.slice(0, 10) : 'none');
  const ok = checks.filter((c) => c[0] === 'PASS').length;
  console.log(`CHECKS ${ok}/${checks.length}`);
  console.log(`${ok}/${checks.length} PASS`);
  await browser.close();
  process.exit(checks.every((c) => c[0] === 'PASS') && !errors.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
