// A long game played at random (the « monkey »), in Chromium against the built hype.html with the mocked Claude runtime:
// posts, messages, brands, releases planned, brought forward, shot and published, time skipped, items sold, the
// palette, the shop (products made, launched, priced, paused, restocked, taken off; duos, contests, pop-ups, counterfeits),
// screens opened, an export imported back. After every step, the invariants: no error on the page, every number
// finite and in range, no state that cannot exist, nothing left busy.
// Run: OUT=<dir> UMD=<path to htm/preact/standalone.umd.js> [STEPS=120] [SEED=1] node test/monkey.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.OUT || path.join(ROOT, 'test', 'shots-monkey');
fs.mkdirSync(OUT, { recursive: true });
const PAGE = fs.readFileSync(process.env.PAGE || path.join(ROOT, 'hype.html'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const UMD = fs.readFileSync(process.env.UMD, 'utf8');
const STEPS = +(process.env.STEPS || 120);
let seed = +(process.env.SEED || 1);
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }; // (the monkey's choices, replayable)
const pickW = (list) => { const tot = list.reduce((a, x) => a + x[1], 0); let r = rnd() * tot; for (const x of list) { if ((r -= x[1]) < 0) return x[0]; } return list[list.length - 1][0]; };
const pickOne = (a) => a[Math.floor(rnd() * a.length)];
const SKELETON = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;

const errors = [];
const problems = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const G = (page, fn, arg) => page.evaluate(fn, arg);
const idle = async (page, ms = 25000) => { const end = Date.now() + ms; while (Date.now() < end && await G(page, () => { const b = window.__hype.S.busy; return !!(b.act || b.refresh || b.mg || b.dm || b.ev || b.talk || b.create || b.visit || b.devis); })) await sleep(250); };
async function dismiss(page) { for (let k = 0; k < 6 && (await page.$('.modal')); k++) { await page.click('.modal .btn >> nth=-1', { timeout: 3000 }).catch(() => {}); await sleep(300); } }

async function newPage(browser, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: true, colorScheme: 'light' });
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript((on) => {
    if (!on) return;
    window.__t32 = true; window.__drawTraits = true; window.__stalkPlan = { doux: 3600000, hater: 7200000 };
    window.__mockOnce = [ // (the newcomers they are: names of their own, the usual one being taken by then)
      { has: 'Pas méchant·e : maladroit·e', lines: [{ t: 'char', name: 'Noé Lazare', handle: 'noe.lazare', emoji: '🌻', g: 'm', role: 'Apprenti herboriste', bio: 'des plantes et du thé', personality: 'doux, attentionné', voice: 'douce', followers: 800, rel: 12 }, { t: 'post', by: 'noe.lazare', text: 'première infusion de la saison 🍵' }] },
      { has: 'l’admiration peut tourner à la rancœur', lines: [{ t: 'char', name: 'Inès Morel', handle: 'ines.morel', emoji: '📷', g: 'f', role: 'Photographe', bio: 'je capture ce que vous ne voyez pas', personality: 'intense, passionnée', voice: 'sèche', followers: 2400, rel: 5 }, { t: 'post', by: 'ines.morel', text: 'lumière parfaite ce matin.' }] },
    ];
  }, process.env.T32 !== '0'); // 0.32: le temps qui passe, the hearts and traits the game draws, the ones who follow the player past 10 000 followers (T32=0: as before)
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[error] ${m.text()}`); });
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

const POSTS = ['ma vidéo sort dans 1h, préparez-vous', 'je réponds à tout ce soir en live', 'franchement @leandre.aube triche au conseil, j’ai des preuves', 'désolée pour hier, j’ai été nulle', 'nouveau short demain sur les potions ratées', 'qui vient au bal des maisons ?', 'j’adore cette école 💜', 'on se fait une collab @tess.astrale ?', '#DuelDesGlycines qui est chaud ?', 'ma pire potion de la semaine 🧪'];
const DMS = ['salut ! ça va ?', 'tu viens au bal avec moi ?', 'je voudrais un acompte de 40 % à la signature', 'ok pour le contrat, mais je serais plutôt sur 900 €', 'je mets la mention, ça me va', 'on se voit ce soir ?', 'tu es la meilleure', 'arrête de mentir sur moi', 'tu peux me prêter ta cape ?', 'je crois que je t’aime'];

// One random step: what was done, for the log.
async function step(page, k) {
  const act = pickW([['post', 14], ['dm', 16], ['offer', 8], ['sign', 6], ['plan', 8], ['sooner', 5], ['shoot', 8], ['skip', 10], ['sell', 6], ['palette', 4], ['screens', 10], ['roundtrip', 2], ['postpone', 3],
    ['amend', 6], ['walk', 2], ['series', 2], ['practice', 3], ['quote', 4], ['announce', 4], ['shop', 10], ['social', +(process.env.SOCIAL_W || 10)], ['react', 6], ['sleep', 4]]); // (0.27.6: the contracts, the challenges, the practice rounds, the quotes, the announcements; 0.29: the shop; 0.31.3: reactions, likes, pins; 0.32: a night, a nap)
  await G(page, () => { const H = window.__hype; H.S.modals = []; H.update(false); });
  if (act === 'post') {
    await G(page, () => { const H = window.__hype; H.S.stack = []; if (H.S.fabAway) H.S.fabAway = false; H.goTab('feed'); });
    await page.click('.fab', { timeout: 4000 }).catch(() => {});
    let how = '';
    if (await page.$('#compose')) {
      await page.fill('#compose', pickOne(POSTS));
      // 0.31.2: now and then the player ticks « Faire une vidéo à partir de ce post » (and picks a moment, a format)
      const box = rnd() < 0.3 && !!(await page.$('.layer .ann-card input:not([disabled])'));
      if (box) {
        await page.check('.layer .ann-card input', { timeout: 3000 }).catch(() => {});
        const chips = await page.$$('.layer .ann-box .tr-chips[aria-label="Quand"] .chip-btn');
        if (chips.length && rnd() < 0.5) await chips[Math.floor(rnd() * chips.length)].click({ timeout: 3000 }).catch(() => {});
        const fmts = await page.$$('.layer .ann-box .seg button:not([disabled])');
        if (fmts.length && rnd() < 0.3) await fmts[Math.floor(rnd() * fmts.length)].click({ timeout: 3000 }).catch(() => {});
      }
      const ids = await G(page, () => window.__hype.S.game.posts.map((p) => p.id));
      await page.locator('.layer-head button', { hasText: 'Publier' }).first().click({ timeout: 4000 }).catch(() => {});
      await idle(page);
      // never a release the player did not tick: one points to this post only when the box was ticked
      how = await G(page, (a) => { const g = window.__hype.S.game, p = g.posts.find((x) => x.a === 'p' && !a.ids.includes(x.id)); if (!p) return ' (not sent)'; const n = (g.releases || []).filter((r) => r.post === p.id).length; return a.box ? ` +box (${n})` : n ? ' BAD: a release from an unticked post' : ''; }, { ids, box });
    }
    return act + how;
  }
  if (act === 'dm') {
    const id = await G(page, (r) => { const H = window.__hype, g = H.S.game, c = Object.values(g.chars).filter((x) => x.unlocked && x.kind !== 'media'); const x = c[Math.floor(r * c.length)]; return x ? x.id : null; }, rnd());
    if (id) { await G(page, (a) => { const H = window.__hype; H.S.stack = []; H.openDM(a.id); H.sendDM(a.id, a.text); }, { id, text: pickOne(DMS) }); await idle(page); }
    return act + (id ? '' : ' (none)');
  }
  if (act === 'offer') { await G(page, () => { const H = window.__hype, g = H.S.game; if (g.stats.followers < 800) g.stats.followers = 900; H.makeOffer(g, {}); H.update(false); }); return act; }
  if (act === 'sign') {
    return G(page, (r) => {
      const H = window.__hype, g = H.S.game, o = g.deals.filter((d) => d.state === 'offer');
      if (!o.length) return 'sign (none)';
      const d = o[Math.floor(r * o.length)];
      if (r < 0.75) H.signDeal(g, d); else H.declineDeal(g, d);
      H.update(false);
      return r < 0.75 ? 'sign' : 'decline';
    }, rnd());
  }
  if (act === 'plan') {
    return G(page, (a) => {
      const H = window.__hype, g = H.S.game, f = H.PLATFORMS[H.platformOf(g)].fmts, what = f[Math.floor(a.r * f.length)];
      window.__hypeEasyGear = true;
      const r = H.scheduleRelease(g, { what, topic: 'les secrets de Lumen ' + a.k, due: Date.now() + Math.round((0.5 + a.r2 * 30) * 3600000) });
      window.__hypeEasyGear = false;
      H.update(false);
      return r ? `plan ${what}` : 'plan (full)';
    }, { r: rnd(), r2: rnd(), k });
  }
  if (act === 'sooner') {
    return G(page, (r) => {
      const H = window.__hype, g = H.S.game, P = H.plannedReleases(g).filter((x) => x.due > Date.now());
      if (!P.length) return 'sooner (none)';
      const x = P[Math.floor(r * P.length)], ch = H.advanceChoices(g, x);
      const ok = H.advanceRelease(g, x, ch[Math.floor(r * ch.length)].at);
      H.update(false);
      return `sooner ${ok}`;
    }, rnd());
  }
  if (act === 'amend') { // a brand agrees to something in its DMs: a price, a deposit (a share, a sum, in words), before or after signing
    return G(page, (r) => {
      const H = window.__hype, g = H.S.game, o = g.deals.filter((d) => d.state === 'offer' || d.state === 'signed');
      if (!o.length) return 'amend (none)';
      const d = o[Math.floor(r * o.length)], c = g.chars[d.contact];
      const line = r < 0.3 ? { t: 'deal', fee: Math.round((d.fee || 50) * (0.6 + r)) } : r < 0.5 ? { t: 'deal', upfront: pickUp(r) } : r < 0.7 ? { t: 'deal', fee: Math.round((d.fee || 50) * (0.8 + r)), upfront: pickUp(r) } : r < 0.85 ? { t: 'deal', exclusive: r < 0.78 } : { t: 'deal', days: 2 + Math.round(r * 5) };
      function pickUp(x) { return x < 0.35 ? 40 : x < 0.4 ? '300 €' : x < 0.45 ? 0.5 : x < 0.55 ? 'non' : 100; }
      if (c) H.applyDealLine(g, c, line);
      H.update(false);
      return 'amend ' + Object.keys(line).filter((k) => k !== 't').join(',');
    }, rnd());
  }
  if (act === 'walk') { return G(page, (r) => { const H = window.__hype, g = H.S.game, o = g.deals.filter((d) => d.state === 'offer' || d.state === 'signed'); if (!o.length) return 'walk (none)'; const d = o[Math.floor(r * o.length)]; if (r < 0.5) d.resold = d.resold || { at: Date.now(), what: 'un cadeau', price: 50, after: 1000 }; H.applyDealLine(g, g.chars[d.contact], { t: 'deal', walk: true }); H.update(false); return 'walk ' + d.state; }, rnd()); }
  if (act === 'series') {
    return G(page, (r) => {
      const H = window.__hype, g = H.S.game;
      if (g.series && g.series.state === 'on') { if (r < 0.3) { H.endSeries(g, g.series, true); return 'series given up'; } return 'series (on)'; }
      const f = H.PLATFORMS[H.platformOf(g)].fmts, what = f[Math.floor(r * f.length)];
      window.__hypeEasyGear = true;
      const ok = H.startSeries(g, { what, days: 7, hour: 18, min: 0, theme: 'un défi par jour', diff: 'moyen', hard: r < 0.4, devis: { total: 0, items: [], have: [], topic: 'défi', at: Date.now() } });
      window.__hypeEasyGear = false;
      H.update(false);
      return `series ${ok ? what : '(no room)'}`;
    }, rnd());
  }
  if (act === 'practice') { // a practice round from the palette, opened and left (nothing may change in the game)
    const res = await G(page, (r) => {
      const H = window.__hype, g = H.S.game, ks = ['montage', 'memoire', 'chat', 'mixage', 'cadrage'], k = ks[Math.floor(r * ks.length)];
      const before = JSON.stringify([g.career.cash, g.stats.followers, g.stats.reputation, g.releases.length]);
      H.S.stack = []; H.startPractice(g, k, H.DIFFS[Math.floor(r * 6)].id);
      return { k, before };
    }, rnd());
    await sleep(600);
    const after = await G(page, () => { const H = window.__hype, g = H.S.game; H.S.stack = []; H.update(false); return JSON.stringify([g.career.cash, g.stats.followers, g.stats.reputation, g.releases.length]); });
    if (after !== res.before) problems.push(`practice ${res.k} changed the game: ${res.before} → ${after}`);
    return 'practice ' + res.k;
  }
  if (act === 'quote') { // a quote read from the model's lines (some in words, some covered by the inventory), then paid
    return G(page, (r) => {
      const H = window.__hype, g = H.S.game, stock = H.devisStock(g);
      const lines = [{ t: 'cost', item: 'Ingrédients du marché', price: r < 0.5 ? '12,50 €' : 12, kind: 'conso' }, { t: 'cost', item: stock.length && r < 0.6 ? stock[0].x.name : 'Une cape de location', price: 30, kind: r < 0.5 ? 'conso' : 'location' }];
      if (stock.length && r > 0.7) lines.push({ t: 'have', id: stock[stock.length - 1].key, use: 'conso' });
      const dv = H.readDevis(g, { what: 'vidéo', topic: 'mon tuto du jour', plot: '' }, lines, stock, []);
      if (r < 0.2 && dv.have.length && dv.have[0].inv) H.listItem(g, dv.have[0].inv, 10); // (sold or on sale since: it must not pay)
      const stale = H.devisStale(g, dv), ok = H.payDevis(g, dv, 'monkey');
      if (stale && ok) return 'quote BAD: paid with a stale item';
      H.update(false);
      return `quote ${dv.items.length}+${dv.have.length} ${ok ? 'paid' : stale ? 'stale' : 'no money'}`;
    }, rnd());
  }
  if (act === 'announce') { // a release announced by a post, with things already planned (0.31.2: what the box sends, a moment)
    return G(page, (r) => {
      const H = window.__hype, g = H.S.game, before = H.plannedReleases(g).length, t = Date.now();
      const o = r < 0.4 ? { what: 'vidéo', topic: 'ma vidéo sort dans 1h', at: t + 3600000 } : r < 0.7 ? { what: 'short', topic: 'un short sur les potions ratées', at: t + 3 * 3600000 } : { what: 'live', topic: 'live questions réponses', in: 120 };
      window.__hypeEasyGear = true;
      const x = H.addRelease(g, o, null, o.topic);
      window.__hypeEasyGear = false;
      H.update(false);
      return `announce ${x ? 'new' : 'same'} (${before}→${H.plannedReleases(g).length})`;
    }, rnd());
  }
  if (act === 'shop') { // 0.29: the shop: a product made (odd prices now and then), launched, priced, paused, restocked, taken off; a duo, a contest, a pop-up, a signing, a counterfeit
    return G(page, (a) => {
      const H = window.__hype, g = H.S.game, t = Date.now(), day = 86400000, { r, r2 } = a;
      if (g.stats.followers < 1500) g.stats.followers = 1500;
      if (r2 < 0.08) g.stats.followers = Math.max(g.stats.followers, [12000, 60000, 150000, 600000, 1200000][Math.floor(r * 5)]);
      const S = H.shopOf(g), all = H.shopShown(g), pickP = (f) => { const l = all.filter(f); return l.length ? l[Math.floor(r2 * l.length)] : null; };
      const keys = Object.keys(H.MERCH).filter((k) => g.stats.followers >= H.MERCH[k].tier);
      const what = Math.floor(r * 12);
      let out = 'shop';
      if (what <= 2) {
        const k = keys[Math.floor(r2 * keys.length)], M = H.MERCH[k], mode = ['pod', 'stock', 'preco'][Math.floor(r2 * 3)];
        const price = r2 < 0.1 ? ['0', 'abc', -3, 1e18][Math.floor(r2 * 40)] : Math.round(M.fair * (0.5 + 1.5 * r2) * 100) / 100;
        const c = H.mains(g).find((x) => H.collabOK(g, x));
        const res = H.prepItem(g, { k, design: 'design ' + Math.round(r2 * 100), name: 'Titre ' + Math.round(r2 * 100), pitch: 'une histoire de potions ratées', mode, origin: ['fr', 'pt', 'tr', 'cn'][Math.floor(r2 * 4)], mat: ['bio', 'coton', 'recy', 'poly'][Math.floor(r2 * 4)], print: r2 < 0.5 ? 'seri' : 'transfert', qty: H.qtysOf(k)[Math.floor(r2 * 3)], limited: r2 < 0.2 ? 100 : 0, charity: r2 < 0.3 ? 10 : 0, asso: 'un refuge', collab: c && r2 < 0.25 ? c.id : null, by: 'toi', price });
        out = `shop make ${k} ${mode} ${res.ok ? res.p.state : 'refused'}`;
      } else if (what === 3) { const L = H.launchAll(g); out = L ? `shop launch ${H.launchDrop(g, L, 1 + Math.floor(r2 * 5), { id: 'mk' + t, text: r2 < 0.3 ? 'fabriqué en France !' : 'nouveau merch' }, t)}` : 'shop launch (none)'; }
      else if (what === 4) { const p = pickP((x) => x.state !== 'gone'); out = p ? `shop price ${H.setPrice(g, p, r2 < 0.2 ? 'n' : Math.round(H.MERCH[p.k].fair * (0.3 + 2 * r2) * 100) / 100)}` : 'shop price (none)'; }
      else if (what === 5) { const p = pickP((x) => x.state === 'live' || x.state === 'paused'); out = p ? `shop ${p.state === 'live' ? 'pause ' + H.pauseItem(g, p) : 'resume ' + H.resumeItem(g, p)}` : 'shop pause (none)'; }
      else if (what === 6) { const p = pickP((x) => x.mode === 'stock'); out = p ? `shop restock ${H.restock(g, p, H.qtysOf(p.k)[0])}` : 'shop restock (none)'; }
      else if (what === 7) { const p = pickP((x) => x.state !== 'gone'); out = p ? `shop retire ${H.retireItem(g, p)}` : 'shop retire (none)'; }
      else if (what === 8) { const p = pickP((x) => x.collab && x.collab.ok !== true); const c = p && g.chars[p.collab.c]; if (p && c && r2 < 0.6) H.applyCollabLine(g, c, { t: 'collab', ok: r2 < 0.4 }); else if (p) H.collabSolo(g, p); out = p ? 'shop duo' : 'shop duo (none)'; }
      else if (what === 9) {
        if (S.contest && S.contest.state === 'open') { if (r2 < 0.5) H.contestClose(g); else { const e = S.contest.entries[0]; H.prepItem(g, { k: keys[0], design: e.text, credit: e.by, price: H.MERCH[keys[0]].fair, mode: 'pod' }); } out = 'shop contest closed or picked'; }
        else { H.contestStarted(g, null, r2 < 0.3 ? [] : [{ by: 'fan.singe' + Math.round(r2 * 99), text: 'un design au hasard' }]); out = 'shop contest'; }
      } else if (what === 10) { const b = H.shopLive(g).find((x) => H.MERCH[x.k].book); out = `shop event ${r2 < 0.5 ? H.planPopup(g, 'Lyon', t + 2 * day) : b ? H.planSigning(g, b, t + day, 'la librairie') : 'no book'}`; }
      else { const p = pickP((x) => x.fake && x.fake.state === 'on') || (r2 < 0.3 ? pickP((x) => x.state === 'live') : null); if (p && !p.fake) H.counterfeit(g, p, t); else if (p) H.fakeAction(g, p, ['lawyer', 'report', 'let'][Math.floor(r2 * 3)]); else { H.S.stack = []; H.openLayer({ t: 'merch', view: ['items', 'new', 'extras'][Math.floor(r2 * 3)] }); } out = p ? 'shop fake' : 'shop window'; }
      H.update(false);
      return out;
    }, { r: rnd(), r2: rnd() });
  }
  if (act === 'postpone') { return G(page, () => { const H = window.__hype, g = H.S.game, r = H.activeRelease(g); const ok = r ? H.postponeRelease(g, r) : false; H.update(false); return `postpone ${ok}`; }); }
  if (act === 'shoot') {
    const res = await G(page, (r) => {
      const H = window.__hype, g = H.S.game, x = H.activeRelease(g);
      if (!x) return { msg: 'shoot (none)' };
      x.due = Math.min(x.due, Date.now() - 1000);
      if (!x.devis) x.devis = { total: 0, items: [], have: [], topic: x.topic, at: Date.now() };
      if (!x.played) H.finishShoot(x, r); // (the game played: a score)
      return { msg: 'shoot', id: x.id };
    }, rnd());
    if (res.id) {
      await idle(page);
      await G(page, (a) => {
        const H = window.__hype, g = H.S.game, x = g.releases.find((y) => y.id === a.id);
        if (!x || x.state !== 'scheduled' || !x.played) return;
        if (!x.edit) H.applyEdit(g, x, a.r, 'me');
        const deal = g.deals.find((d) => d.state === 'signed' && d.what === x.what) || null; // (a sponsor on it, often: the contract delivered)
        H.publishRelease(x, '', { title: x.topic, deal: deal && a.r < 0.6 ? deal.id : '', mention: true });
      }, { id: res.id, r: rnd() });
      await idle(page, 40000);
    }
    return res.msg;
  }
  if (act === 'sleep') { // 0.32: « Dormir » (the night, or a nap in the day): the clock moves on, the energy comes back
    const before = await G(page, () => { const H = window.__hype, g = H.S.game, P = H.sleepPlan(g); return { e: H.nrgNow(g), off: g.clockOff || 0, ok: P.ok, nap: P.nap, held: !!(H.activeRelease(g) && H.activeRelease(g).due <= Date.now()) }; });
    if (!before.ok || before.held) return 'sleep (no time for it)';
    await G(page, () => window.__hype.goSleep());
    await idle(page, 40000);
    const after = await G(page, () => { const H = window.__hype, g = H.S.game; return { e: H.nrgNow(g), off: g.clockOff || 0 }; });
    return `${before.nap ? 'nap' : 'sleep'} ${Math.round(before.e)} → ${Math.round(after.e)} %${after.off <= before.off || after.e + 0.5 < before.e ? ' BAD' : ''}`;
  }
  if (act === 'skip') { const ms = Math.round((0.2 + rnd() * 10) * 3600000); await G(page, (m) => { const H = window.__hype; const r = H.activeRelease(H.S.game); if (r && r.due <= Date.now()) return; H.skipTime(m); }, ms); await idle(page, 40000); return `skip ${Math.round(ms / 60000)} min`; }
  if (act === 'sell') {
    return G(page, (r) => {
      const H = window.__hype, g = H.S.game, inv = H.invLive(g).filter((x) => !x.sale && x.kind !== 'gear');
      if (!inv.length) { H.invAdd(g, { kind: 'buy', name: 'vieille cape ' + Math.round(r * 100), emoji: '🧥', value: 40, cond: 'bon', at: Date.now(), from: { how: 'achat' } }); return 'sell (added one)'; }
      const x = inv[Math.floor(r * inv.length)];
      const ok = H.listItem(g, x.id, Math.max(1, Math.round((x.value || 20) * (0.4 + r))));
      if (r < 0.2) H.unlist(g, x.id);
      H.update(false);
      return `sell ${!!ok}`;
    }, rnd());
  }
  if (act === 'palette') {
    return G(page, (r) => {
      const H = window.__hype, g = H.S.game, t = Date.now();
      const o = r < 0.25 ? { cash: String(Math.round(r * 100000)) } : r < 0.5 ? { rep: { image: '600', cred: '400', pro: '700', kind: '500' } } : r < 0.75 ? { at: H.gameDate(t).getTime() + Math.round((r - 0.6) * 40 * 86400000) } : { followers: String(Math.round(r * 50000)), level: String(1 + Math.round(r * 6)) };
      H.paletteApply(g, o);
      H.update(false);
      return 'palette ' + Object.keys(o).join(',');
    }, rnd());
  }
  if (act === 'screens') {
    const which = pickOne(['studio', 'notifs', 'feed', 'settings', 'inv', 'palette', 'single', 'dmlist', 'merch']);
    await G(page, (w) => {
      const H = window.__hype; H.S.stack = [];
      if (w === 'studio' || w === 'notifs' || w === 'feed') H.goTab(w);
      else if (w === 'settings') H.openLayer({ t: 'settings' });
      else if (w === 'inv') H.openLayer({ t: 'inv' });
      else if (w === 'palette') H.openLayer({ t: 'palette' });
      else if (w === 'merch') H.openLayer({ t: 'merch' });
      else if (w === 'single') H.openLayer({ t: 'series', id: 'single' });
      else H.goTab('dms');
      H.update(false);
    }, which);
    await sleep(400);
    return 'screen ' + which;
  }
  if (act === 'react') { // 0.31.3: an emoji on a message received, a like on a comment or a post, a pin
    const r = rnd(), r2 = rnd();
    return G(page, (a) => {
      const H = window.__hype, g = H.S.game, t = Date.now();
      if (a.r < 0.45) { // a message received, in private or in a group
        const all = [];
        for (const id in g.dms) for (const m of g.dms[id].msgs) if (!m.me && !m.sys && m.text && m.at <= t) all.push([m, g.chars[id]]);
        for (const gr of H.liveGroups(g)) for (const m of gr.msgs) if (m.a && m.a !== 'p' && !m.sys && m.text && m.at <= t) all.push([m, g.chars[m.a.slice(2)]]);
        if (!all.length) return 'react (nothing)';
        const [m, c] = all[Math.floor(a.r2 * all.length)], e = H.MSG_REACTS[Math.floor(a.r2 * 7) % 7][0], was = m.rx || null;
        H.setReact(g, m, e, c);
        return 'react ' + (m.rx || 'off') + ((was === e ? !!m.rx : m.rx !== e) ? ' BAD' : '');
      }
      const ps = g.posts.filter((p) => p.at <= t && p.replies.some((x) => x.a !== 'p' && x.at <= t)).slice(-10);
      const p = ps[Math.floor(a.r2 * ps.length)];
      if (!p) return 'like (no post)';
      const rs = p.replies.filter((x) => x.a !== 'p' && x.at <= t), x = rs[Math.floor(a.r2 * rs.length)];
      if (a.r < 0.8) { const was = !!x.liked; H.toggleReplyLike(p, x); return 'like comment ' + (x.liked ? 'on' : 'off') + (!!x.liked === was ? ' BAD' : ''); }
      if (p.a !== 'p') { H.toggleLike(p); return 'like post ' + (p.liked ? 'on' : 'off'); }
      H.pinReply(g, p, x);
      return 'pin ' + (p.pin === x.id ? 'on' : 'off');
    }, { r, r2 });
  }
  if (act === 'social') { // 0.29: stories, groups, polls, a pinned comment, the network's own days
    const r = rnd(), r2 = rnd();
    const res = await G(page, async (a) => {
      const H = window.__hype, g = H.S.game, t = Date.now();
      const cs = H.mains(g).filter((c) => c.unlocked && !c.cut && !c.jailed);
      const one = cs[Math.floor(a.r2 * cs.length)];
      if (a.r < 0.14) { const ok = await H.postStory({ text: 'ma story ' + a.k, poll: a.r2 < 0.4 ? { q: 'on fait quoi ce soir ?', a: ['live', 'dodo'] } : null, ask: a.r2 > 0.7 ? 'vos conseils ?' : '' }); return 'story mine ' + ok; }
      if (a.r < 0.28) {
        if (!one) return 'story (nobody)';
        const s = H.addStory(g, { by: one.handle, text: 'la vie de ' + one.handle + ' ' + a.k, photo: a.r2 < 0.5 ? 'un café en terrasse' : '', poll: a.r2 > 0.6 ? { q: 'je le fais ?', a: ['oui', 'non'] } : null }, t);
        if (s) { H.openStory(s.a); if (s.poll && a.r2 > 0.8) H.voteStory(g, s, 1); else if (a.r2 < 0.2) H.reactStory(g, s, '🔥'); }
        H.update(false);
        return 'story ' + (s ? 'of ' + one.handle : '(full)');
      }
      if (a.r < 0.45) {
        const live = H.liveGroups(g);
        if (live.length && a.r2 < 0.75) { const gr = live[Math.floor(a.r2 * live.length)]; const ok = await H.sendGroup(gr.id, 'on se retrouve où ? ' + a.k); return 'group msg ' + ok; }
        if (live.length && a.r2 >= 0.75) { H.leaveGroup(g, live[0]); return 'group left'; }
        if (cs.length < 2) return 'group (nobody)';
        const gr = H.addGroup(g, { by: cs[0].handle, with: cs.slice(1, 4).map((c) => c.handle), name: 'La bande ' + a.k, text: 'bienvenue !' }, t);
        H.update(false);
        return 'group ' + (gr ? 'new' : '(none)');
      }
      if (a.r < 0.6) {
        const p = g.posts.filter((x) => x.a !== 'p' && x.at <= t).slice(-6)[Math.floor(a.r2 * 6)];
        if (!p) return 'poll (no post)';
        if (!p.poll) H.decorateSocial(g, p, { poll: { a: ['oui', 'non', 'bof'] } });
        const ok = H.votePoll(g, p, Math.floor(a.r2 * 3));
        return 'poll ' + ok;
      }
      if (a.r < 0.72) {
        const p = g.posts.filter((x) => x.a === 'p' && x.replies.length).pop();
        if (!p) return 'pin (none)';
        H.pinReply(g, p, p.replies[Math.floor(a.r2 * p.replies.length)]);
        H.update(false);
        return 'pin';
      }
      if (a.r < 0.82) { const o = a.r2 < 0.4 ? H.setOutage(g, { min: 20, why: 'serveurs en feu' }, t) : a.r2 < 0.8 ? H.setAlgo(g, { favors: ['photo', 'short', 'video', 'texte'][Math.floor(a.r2 * 4)], days: 2 }, t) : H.setMainDay(g, { who: a.r2 < 0.9 ? g.player.handle : (one || {}).handle, why: 'un fou rire en direct' }, t); H.update(false); return 'net ' + !!o; }
      if (a.r < 0.9) { if (one) { H.psySign(g, one, 'un détail bizarre ' + a.k, t); H.update(false); } return 'sign'; }
      H.S.stack = []; H.goTab('feed'); H.update(false);
      return 'feed';
    }, { r, r2, k });
    await idle(page);
    return 'social ' + res;
  }
  if (act === 'roundtrip') {
    const r = await G(page, async () => {
      const H = window.__hype, g = H.S.game;
      try { const txt = await H.exportGameText(g.id); const g2 = await H.importGameText(txt); const ok = !!(g2 && g2.id && g2.id !== g.id); await H.deleteGame(g2.id); return ok ? 'ok' : 'bad'; } catch (e) { return 'error ' + (e && (e.code || e.message)); }
    });
    if (r !== 'ok') problems.push(`roundtrip: ${r}`);
    return 'roundtrip ' + r;
  }
  return act;
}

// The invariants, after every step.
function invariants() {
  const H = window.__hype, g = H.S.game, s = g.stats, c = g.career, bad = [];
  const fin = (v, name, lo = -Infinity, hi = Infinity) => { if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi) bad.push(`${name}=${v}`); };
  fin(c.cash, 'cash'); fin(c.est, 'est', 0); fin(c.owed, 'owed', 0); fin(s.followers, 'followers', 0); fin(s.reputation, 'reputation', 0, 100); fin(s.level, 'level', 1); fin(s.xp, 'xp', 0); fin(s.gems, 'gems', 0);
  for (const k of Object.keys(s.rep4 || {})) fin(s.rep4[k], 'rep4.' + k, 0, 100);
  if (g.clockOff !== undefined && (typeof g.clockOff !== 'number' || !Number.isFinite(g.clockOff))) bad.push('clockOff=' + g.clockOff); // (a new game has none until the first skip or load: 0)
  for (const ch of Object.values(g.chars)) if (typeof ch.rel === 'number') fin(ch.rel, `rel(${ch.handle})`, -100, 100);
  if (c.shop) { // 0.29: the shop
    const S = c.shop;
    fin(S.pend, 'shop.pend'); fin(S.sold, 'shop.sold', 0); fin(S.revenue, 'shop.revenue', 0); fin(S.weekSold, 'shop.weekSold', 0);
    if (H.shopShown(g).length > H.MERCH_MAX) bad.push('shop: ' + H.shopShown(g).length + ' products shown');
    for (const p of S.items) {
      const M = H.MERCH[p.k];
      if (!M) { bad.push('shop: unknown ' + p.k); continue; }
      if (!['making', 'ready', 'live', 'paused', 'gone'].includes(p.state)) bad.push('shop: state ' + p.state);
      fin(p.price, `shop.price(${p.k})`, M.min, 1e15); fin(p.sold, `shop.sold(${p.k})`, 0); fin(p.q, `shop.q(${p.k})`, 0.15, 1); fin(p.revenue, `shop.revenue(${p.k})`, 0); fin(p.refunds, `shop.refunds(${p.k})`, 0);
      if (p.mode === 'stock') fin(p.stock, `shop.stock(${p.k})`, 0);
      if (p.preco) { fin(p.preco.qty, 'preco.qty', 0); if (!p.preco.closed && p.state !== 'live') bad.push('shop: pre-orders open but ' + p.state); if (p.preco.closed && !p.preco.shipped && p.state !== 'paused') bad.push('shop: pre-orders closed but ' + p.state); }
      if ((p.state === 'live' || p.state === 'paused') && !p.launchAt) bad.push('shop: on sale without a launch');
      if (p.collab && p.collab.ok === false) bad.push('shop: a refused duo kept');
      if (p.state === 'live' && p.collab && p.collab.ok !== true) bad.push('shop: on sale before the duo agreed');
    }
  }
  const P = H.plannedReleases(g);
  if (P.length > H.MAX_PLANNED) bad.push('planned=' + P.length);
  // 0.32: the energy, the time owed, the answers waiting
  if (g.nrg) { fin(g.nrg.e, 'nrg.e', 0, 100); fin(g.nrg.at, 'nrg.at', 1e12); fin(H.nrgNow(g), 'nrgNow', 0, 100); }
  if (g.actDebt !== undefined) fin(g.actDebt, 'actDebt', 0, 7 * 24 * 3600000);
  if (g.quietMs !== undefined) fin(g.quietMs, 'quietMs', 0, 60 * 24 * 3600000);
  for (const id in g.dms) { const D = g.dms[id].due; if (D && (!(D.at > 1e12) || !(D.from > 1e12) || !g.chars[id])) bad.push('dm due: ' + JSON.stringify(D)); }
  for (const gr of g.groups || []) if (gr.due && !(gr.due.at > 1e12)) bad.push('group due: ' + JSON.stringify(gr.due));
  for (const ch of Object.values(g.chars)) if (ch.away && !(ch.away.until > ch.away.at)) bad.push(`away(${ch.handle}): ${JSON.stringify(ch.away)}`);
  // 0.29: the stories (24 h, three live at most per character), the groups (four, forty messages at most)
  const st = g.stories || [], live = H.liveStories(g);
  if (st.length > 40) bad.push('stories=' + st.length);
  for (const x of st) if (x.until - x.at !== 86400000) bad.push('story length ' + (x.until - x.at));
  const per = {}; for (const x of live) if (x.a !== 'p') per[x.a] = (per[x.a] || 0) + 1; // (the player posts as many as they like)
  for (const k in per) if (per[k] > 3) bad.push(`stories of ${k}: ${per[k]}`);
  if (H.liveGroups(g).length > 4) bad.push('groups=' + H.liveGroups(g).length);
  for (const gr of g.groups || []) if (gr.msgs.length > 40) bad.push(`group ${gr.name}: ${gr.msgs.length} messages`);
  for (const p of g.posts) if (p.poll) { const sum = (p.poll.res || []).reduce((x, y) => x + y, 0); if (p.poll.res && sum !== 100) bad.push('poll sum ' + sum); }
  if (g.psy) { fin(g.psy.signs || 0, 'psy.signs', 0); if (g.over && g.over.k !== 'psy') bad.push('over ' + g.over.k); }
  for (const r of g.releases) { if (!['scheduled', 'released', 'dropped'].includes(r.state)) bad.push(`release state ${r.state}`); fin(r.due, 'release.due', 0); }
  for (const d of g.deals) {
    fin(d.fee, `deal.fee(${d.brand})`, 0); fin(d.upfront || 0, `deal.upfront(${d.brand})`, 0);
    if (d.fee > 0 && d.upfront > d.fee + 0.01) bad.push(`deal ${d.brand}: upfront ${d.upfront} > fee ${d.fee}`);
    if (!d.fee && d.upfront) bad.push(`deal ${d.brand}: upfront without fee`);
  }
  const ids = new Set();
  for (const x of H.invOf(g)) { if (ids.has(x.id)) bad.push('inv dup ' + x.id); ids.add(x.id); if (x.sold && x.sale) bad.push('inv sold and on sale ' + x.name); }
  const b = H.S.busy; const stuck = Object.keys(b).filter((k) => b[k] && !['cand', 'save', 'news'].includes(k));
  try { const n = JSON.stringify(g).length; if (n > 6e6) bad.push('game size ' + n); } catch (e) { bad.push('not serialisable: ' + e.message); }
  const t = Date.now(), due = Object.values(g.dms || {}).filter((cv) => cv.due && cv.due.at <= t).length + (g.groups || []).filter((gr) => gr.due && gr.due.at <= t).length; // 0.32: answers whose time came (one after the other)
  return { bad, stuck, due };
}

(async () => {
  const browser = await chromium.launch();
  const { page } = await newPage(browser);
  await newGame(page, 'Une créatrice qui touche à tout');
  await G(page, () => { const g = window.__hype.S.game; g.career.cash = 3000; window.__hypeNoGearEvent = true; });
  const log = [];
  for (let k = 0; k < STEPS; k++) {
    const e0 = errors.length;
    let what = '';
    try { what = await step(page, k); } catch (e) { what = 'step error: ' + e.message.split('\n')[0]; problems.push(`#${k} ${what}`); }
    if (/\bBAD\b/.test(what)) problems.push(`#${k} ${what}`); // (a step that saw something wrong says so)
    await dismiss(page);
    await idle(page);
    const inv = await G(page, invariants);
    if (inv.stuck.length) {
      await sleep(3000);
      let again = await G(page, invariants);
      for (let w = 0; w < 30 && again.stuck.length && again.stuck.every((x) => ['dm', 'dms', 'groups', 'newchar'].includes(x)) && (again.due || inv.due || again.stuck.includes('newchar')); w++) { await sleep(2000); again = await G(page, invariants); } // (0.32: after a long skip, several of them answer, one after the other; a newcomer waits its turn)
      if (again.stuck.length) problems.push(`#${k} (${what}) busy stuck: ${again.stuck.join(',')}`);
    }
    if (inv.bad.length) problems.push(`#${k} (${what}) ${inv.bad.join(' ; ')}`);
    if (errors.length > e0) problems.push(`#${k} (${what}) page errors: ${errors.slice(e0).join(' | ').slice(0, 400)}`);
    log.push(`${k} ${what}`);
    if (k % 20 === 0) await page.screenshot({ path: path.join(OUT, `step-${String(k).padStart(3, '0')}.png`) });
  }
  const end = await G(page, () => { const H = window.__hype, g = H.S.game; return { cash: g.career.cash, fol: g.stats.followers, rep: g.stats.reputation, lvl: g.stats.level, releases: g.releases.map((r) => r.state).join(','), deals: g.deals.map((d) => d.state).join(','), inv: H.invOf(g).length, posts: g.posts.length }; });
  await browser.close();
  console.log('STEPS', log.join(' · '));
  console.log('END', JSON.stringify(end));
  console.log('PROBLEMS', problems.length ? '\n' + problems.join('\n') : 'none');
  console.log(`\n${problems.length ? 0 : 1}/1 PASS`);
  process.exit(problems.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
