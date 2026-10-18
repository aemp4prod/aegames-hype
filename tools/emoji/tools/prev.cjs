// node prev.cjs <out.png> <ids comma|all> [size=96] [cols=12]
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); } // (wherever Playwright is installed)
const { chromium } = pw;
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
(async () => {
  const [out, idsArg, sizeArg, colsArg] = process.argv.slice(2);
  const size = +(sizeArg || 96), cols = +(colsArg || 12);
  let ids = idsArg === 'all' ? fs.readdirSync(path.join(ROOT, 'svg')).filter(f => f.endsWith('.svg')).map(f => f.slice(0, -4)) : idsArg.split(',');
  const uri = id => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'svg', id + '.svg')).toString('base64');
  const bgs = [['#F6F2F4', '#7C6C75'], ['#FFFFFF', '#7C6C75'], ['#110C0F', '#A8949F']];
  let h = '';
  for (const [bg, fg] of bgs) {
    h += `<div style="background:${bg};padding:10px 12px;display:grid;grid-template-columns:repeat(${cols}, ${size + 14}px);gap:8px 6px">`;
    for (const id of ids) h += `<div style="display:flex;flex-direction:column;align-items:center;font:10px monospace;color:${fg}"><img width="${size}" height="${size}" src="${uri(id)}"><span>${id}</span></div>`;
    h += '</div>';
    if (bg !== '#110C0F') {
      h += `<div style="background:${bg};padding:4px 12px 10px;display:flex;gap:10px;align-items:center">`;
      for (const id of ids) h += `<img width="48" height="48" src="${uri(id)}">`;
      h += '</div>';
      h += `<div style="background:${bg};padding:0 12px 10px;display:flex;gap:6px;align-items:center">`;
      for (const id of ids) h += `<img width="20" height="20" src="${uri(id)}">`;
      h += '</div>';
    }
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.setViewportSize({ width: Math.max(600, cols * (size + 20) + 30), height: 400 });
  await page.setContent(`<html><body style="margin:0">${h}</body></html>`);
  await page.waitForTimeout(200);
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
