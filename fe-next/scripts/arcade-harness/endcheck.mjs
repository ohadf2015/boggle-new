import { createServer } from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';
const site = process.argv[2];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' };
const server = createServer(async (req, res) => {
  const raw = path.join(site, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const p = raw.endsWith('/') ? path.join(raw, 'index.html') : raw;
  try { const b = await readFile(p); res.writeHead(200, { 'content-type': TYPES[path.extname(p)] ?? 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404).end(); }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const HOL = { latke: 'hanukkah', spin: 'hanukkah', catch: 'hanukkah', presents: 'christmas', splat: 'christmas', dash: 'christmas' };
const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
await Promise.all(Object.entries(HOL).map(async ([g, h]) => {
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`${base}/?g=${g}&h=${h}`);
  await page.getByTestId('family-start').click();
  await page.waitForSelector('canvas');
  const t0 = Date.now();
  const box = await page.locator('[role=application]').boundingBox();
  while (!(await page.locator('#arcade-results-title').count()) && Date.now() - t0 < 120000) {
    const x = box.x + box.width * (0.15 + Math.random() * 0.7), y = box.y + box.height * (0.35 + Math.random() * 0.55);
    if (g === 'spin') { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y - 150, { steps: 3 }); await page.mouse.up(); }
    else { await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(g === 'dash' ? 250 : 40); await page.mouse.up(); }
    await page.waitForTimeout(300);
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(g, 'results after', secs, 's', 'errors', errs.length, errs[0] ?? '');
}));
await b.close(); server.close();
