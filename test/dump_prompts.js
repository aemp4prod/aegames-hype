// Builds the game's real prompts for several situations and writes them to agents/prompts/{quick,default}/.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'agents', 'prompts');
const PAGE = fs.readFileSync(path.join(ROOT, 'hype.html'), 'utf8');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const UMD = fs.readFileSync(process.env.UMD, 'utf8');
const SKELETON = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${body}</body></html>`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 0.15: the pen steps aside while the feed scrolls down; a player scrolls back up, a test brings it back
const clickFab = async (page, opts) => { await page.evaluate(() => { const H = window.__hype; if (H && H.S.fabAway) { H.S.fabAway = false; H.update(false); } }); await page.click('.fab', opts); };

(async () => {
  for (const d of ['quick', 'default']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(MOCK);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('https://hype.test')) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: SKELETON(PAGE) });
    if (url.includes('standalone.umd.js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: UMD });
    if (url.includes('fonts.googleapis.com')) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    return route.abort();
  });
  await page.goto('https://hype.test/');
  await page.click('text=Nouvelle partie');
  await page.click('button.world:has-text("Académie Lumen")');
  await page.fill('#pn', 'Mila Flux');
  await page.fill('#pi', 'Une nouvelle élève qui cache un pouvoir interdit');
  await page.check('#p18');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=Entrer dans le fil', { timeout: 20000 });
  await page.click('text=Entrer dans le fil');
  await page.waitForSelector('.post');
  await clickFab(page);
  await page.fill('#compose', '@zara.vey demain 8h, cour des Glycines. ramène tes lunettes de soleil');
  await page.click('.layer-head button:has-text("Publier")');
  await sleep(16000);
  const prompts = await page.evaluate(() => {
    const H = window.__hype, g = H.S.game;
    const post = g.posts.find((p) => p.a === 'p');
    const zaraReply = post.replies.find((r) => r.a === 'c:c1') || post.replies[0];
    const nox = H.mains(g).find((c) => c.handle === 'nox.ombre');
    const W = (id) => H.WORLDS.find((w) => w.id === id);
    return {
      'quick/01-post-banal': H.promptAct(g, 'post', 'premier jour à Lumen et j’ai déjà perdu mon emploi du temps. quelqu’un sait où est la salle d’astromancie ?', null, {}),
      'quick/02-post-provoc': H.promptAct(g, 'post', '@zara.vey invaincue ? t’as juste jamais affronté quelqu’un de compétent. demain 8h je t’humilie devant toute l’académie', null, {}),
      'quick/03-post-mechant': H.promptAct(g, 'post', 'franchement la maison Marée c’est que des losers et Théo est le pire de tous, personne ne peut le supporter', null, {}),
      'quick/04-reponse-a-un-commentaire': H.promptAct(g, 'reply', 'on verra bien qui rira demain matin', post, {}, zaraReply),
      'quick/05-dm': H.promptDM(g, nox, [], 'salut, c’est toi qui balances toutes les rumeurs sur l’académie ?'),
      'quick/06-actualiser': H.promptRefresh(g, 0),
      'quick/07-retour-apres-absence': H.promptRefresh(g, 5 * 3600000),
      'quick/08-idees': H.promptIdeas(g, null),
      'quick/09-nouveau-perso': H.promptNewChar(g),
      'default/01-monde-influence': H.promptWorld(W('influence'), { name: 'Nina Swipe', handle: 'nina.swipe', emoji: '📸', hue: 330, bio: 'café, vintage et vlogs pas très organisés', identity: 'une petite créatrice lifestyle de Lyon qui vise le million d’abonnés', start: 'anon' }),
      'default/02-monde-perso-vrais-noms': H.promptWorld({ id: null, emoji: '✨', hue: 300, name: 'Ton univers', desc: '', prompt: 'Le monde des youtubeurs et influenceurs français avec Léna Situation, Squeezie, Inoxtag et Michou, mais avec des noms très ressemblants genre Léna Situationnelle' }, { name: 'Sam Récap', handle: 'sam.recap', emoji: '🎬', hue: 200, bio: '', identity: 'un petit youtubeur qui fait des vidéos récap des dramas', start: 'rising' }),
      'default/03-monde-aldoree': H.promptWorld(W('aldoree'), { name: 'Elyas', handle: 'elyas.ecuyer', emoji: '🐉', hue: 150, bio: '', identity: 'un écuyer qui rêve de devenir chevalier mais qui a peur des chevaux', start: 'anon' }),
    };
  });
  for (const [name, text] of Object.entries(prompts)) fs.writeFileSync(path.join(OUT, name + '.txt'), text);
  console.log(Object.keys(prompts).map((k) => k + ' ' + prompts[k].length).join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
