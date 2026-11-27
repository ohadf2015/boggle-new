import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { mkdirSync } from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const [site, outDir, only] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  const raw = path.join(site, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const p = raw.endsWith('/') ? path.join(raw, 'index.html') : raw;
  try {
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const VIEWPORTS = { phone: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };
const FOCUS = { latke: [0.5, 0.92], spin: [0.5, 0.5], catch: [0.5, 0.85], presents: [0.5, 1], splat: [0.5, 0.8], dash: [0.2, 0.6] };

async function toScreen(page, g, ax, ay) {
  const r = await page.locator('[role=application]').boundingBox();
  const s = Math.max(r.width / 768, r.height / 1344);
  const [fx, fy] = FOCUS[g];
  return { x: r.x + (r.width - 768 * s) * fx + ax * s, y: r.y + (r.height - 1344 * s) * fy + ay * s };
}
const tap = async (page, g, ax, ay) => {
  const p = await toScreen(page, g, ax, ay);
  await page.mouse.click(p.x, p.y);
};

const PLAY = {
  async latke(page) {
    await page.waitForTimeout(2600);
    for (let i = 0; i < 6; i++) {
      for (const [x, y] of [[236, 998], [382, 1060], [528, 998]]) await tap(page, 'latke', x, y);
      await page.waitForTimeout(650);
    }
    await page.waitForTimeout(250);
  },
  async spin(page) {
    await page.waitForTimeout(1000);
    const r = await page.locator('[role=application]').boundingBox();
    await page.mouse.move(r.x + r.width / 2, r.y + r.height * 0.75);
    await page.mouse.down();
    await page.mouse.move(r.x + r.width / 2, r.y + r.height * 0.4, { steps: 3 });
    await page.mouse.up();
    await page.waitForTimeout(900);
  },
  async presents(page) {
    await page.waitForTimeout(700);
    for (let i = 0; i < 4; i++) {
      await tap(page, 'presents', 384, 600);
      await page.waitForTimeout(2300);
    }
    await page.waitForTimeout(300);
  },
  async splat(page) {
    await page.waitForTimeout(1500);
    for (const [x, y] of [[190, 680], [430, 620], [230, 960], [560, 940], [630, 600]]) {
      await tap(page, 'splat', x, y);
      await page.waitForTimeout(420);
    }
    await tap(page, 'splat', 430, 620);
    await page.waitForTimeout(160);
  },
  async catch(page) {
    await page.waitForTimeout(600);
    for (let i = 0; i < 40; i++) {
      const x = await page.evaluate(() => 0);
      const p = await toScreen(page, 'catch', 150 + ((i * 97) % 470), 1150);
      await page.mouse.move(p.x, p.y);
      await page.waitForTimeout(90 + x);
    }
  },
  async dash(page) {
    await page.waitForTimeout(500);
    const r = await page.locator('[role=application]').boundingBox();
    for (let i = 0; i < 8; i++) {
      await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(280);
      await page.mouse.up();
      await page.waitForTimeout(320);
    }
  },
};

const HOL = { latke: 'hanukkah', spin: 'hanukkah', catch: 'hanukkah', presents: 'christmas', splat: 'christmas', dash: 'christmas' };
const shots = [
  ...['hanukkah', 'christmas'].map((h) => ({ name: `hub-${h}`, q: `h=${h}` })),
  ...Object.keys(HOL).map((g) => ({ name: g, q: `g=${g}&h=${HOL[g]}`, family: g })),
  { name: 'setup-latke', q: 'g=latke&h=hanukkah', setup: true },
  { name: 'catch-he', q: 'g=catch&h=hanukkah&lang=he&region=IL', family: 'catch' },
].filter((s) => !only || s.name.startsWith(only));

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  for (const s of shots) {
    const page = await browser.newPage({ viewport: size, deviceScaleFactor: vp === 'phone' ? 2 : 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/?${s.q}`);
    await page.waitForTimeout(900);
    if (s.setup) {
      await page.getByTestId('family-count-3').click();
    } else if (s.family) {
      await page.getByTestId('family-start').click();
      await page.waitForSelector('canvas', { timeout: 15000 });
      await PLAY[s.family](page);
    } else await page.waitForTimeout(1500);
    const file = path.join(outDir, `${s.name}-${vp}.png`);
    await page.screenshot({ path: file });
    console.log(file, errors.length ? `ERRORS: ${errors.slice(0, 3).join(' | ')}` : '');
    await page.close();
  }
}
await browser.close();
server.close();
