import { createServer } from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';
const site = process.argv[2];
const headed = process.argv[3] === 'headed';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  const raw = path.join(site, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const p = raw.endsWith('/') ? path.join(raw, 'index.html') : raw;
  try { const b = await readFile(p); res.writeHead(200, { 'content-type': TYPES[path.extname(p)] ?? 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404).end(); }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const HOL = { latke: 'hanukkah', spin: 'hanukkah', catch: 'hanukkah', presents: 'christmas', splat: 'christmas', dash: 'christmas' };
const browser = await chromium.launch({ headless: !headed, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const out = [];
for (const throttle of [1, 4]) for (const [g, h] of Object.entries(HOL)) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`${base}/?g=${g}&h=${h}`);
  await page.getByTestId('family-start').click();
  await page.waitForSelector('canvas');
  const gl = await page.evaluate(() => { const c = document.createElement('canvas').getContext('webgl'); const e = c?.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'n/a'; });
  await page.waitForTimeout(1500);
  if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await page.evaluate(() => { window.__d = []; let last = performance.now(); const f = (t) => { window.__d.push(t - last); last = t; if (window.__d.length < 600) requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const box = await page.locator('[role=application]').boundingBox();
  const t0 = Date.now();
  while (Date.now() - t0 < 9000) {
    const x = box.x + box.width * (0.2 + Math.random() * 0.6), y = box.y + box.height * (0.4 + Math.random() * 0.5);
    await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(120); await page.mouse.up(); await page.waitForTimeout(250);
  }
  const d = (await page.evaluate(() => window.__d)).slice(5).sort((a, b) => a - b);
  const q = (p) => d[Math.floor(d.length * p)].toFixed(1);
  out.push({ g, throttle, frames: d.length, p50: q(0.5), p95: q(0.95), over20: ((d.filter((x) => x > 20).length / d.length) * 100).toFixed(1) + '%', gl: gl.slice(0, 50) });
  await ctx.close();
}
console.table(out);
await browser.close(); server.close();
