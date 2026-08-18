/**
 * Record the portal preview videos from the REAL built bundle.
 *
 * CrazyGames/Poki want a short hover-preview clip of actual play: accepted words, score and combo
 * climbing, no audio, exact frame size. This drives dist/ in Chromium, traces real words found by
 * DFS against the bundle's own en.dict.gz (so every submission is one the game accepts), records the
 * tab, then remuxes to H.264 mp4 at the exact portal dimensions.
 *
 * usage (from fe-next/standalone, after `npm run build`):
 *   node scripts/record-preview.mjs landscape   -> store-assets/cg-preview-landscape-1920x1080.mp4
 *   node scripts/record-preview.mjs portrait    -> store-assets/cg-preview-portrait-1080x1620.mp4
 *   node scripts/record-preview.mjs both
 *
 * ponytail: no dedicated web server dep — node:http over dist/ is 20 lines and needs no install.
 */
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm, readdir, mkdir } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const OUT_DIR = join(ROOT, 'store-assets');

const SPECS = {
  landscape: { w: 1920, h: 1080, seconds: 19, out: 'cg-preview-landscape-1920x1080.mp4' },
  portrait: { w: 1080, h: 1620, seconds: 16.5, out: 'cg-preview-portrait-1080x1620.mp4' },
};

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.gz': 'application/gzip', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

function serveDist() {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(req.url.split('?')[0]);
    const file = join(DIST, path === '/' ? 'index.html' : path);
    try {
      const buf = await readFile(file);
      const headers = { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' };
      // en.dict.gz is a pre-gzipped asset the app inflates ITSELF via DecompressionStream.
      // Content-Encoding: gzip would make the browser inflate it first and the app would then try to
      // gunzip plain text — so it must be served as an opaque body.
      res.writeHead(200, headers);
      res.end(buf);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

/** Every word of length 3..maxLen traceable on the grid, longest first. */
function findWords(grid, dict, maxLen = 7) {
  const rows = grid.length, cols = grid[0].length;
  const prefixes = new Set();
  for (const w of dict) for (let i = 1; i <= Math.min(w.length, maxLen); i++) prefixes.add(w.slice(0, i));
  const found = new Map();
  const walk = (r, c, seen, word, path) => {
    const ch = grid[r][c].toLowerCase();
    const next = word + ch;
    if (!prefixes.has(next)) return;
    const p = [...path, [r, c]];
    if (next.length >= 3 && dict.has(next) && !found.has(next)) found.set(next, p);
    if (next.length >= maxLen) return;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if ((dr || dc) && nr >= 0 && nc >= 0 && nr < rows && nc < cols && !seen.has(nr * cols + nc)) {
          seen.add(nr * cols + nc);
          walk(nr, nc, seen, next, p);
          seen.delete(nr * cols + nc);
        }
      }
    }
  };
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) walk(r, c, new Set([r * cols + c]), '', []);
  return [...found.entries()].sort((a, b) => b[0].length - a[0].length);
}

async function record(kind, port, chromium) {
  const spec = SPECS[kind];
  const videoDir = await mkdtemp(join(tmpdir(), `lexi-vid-${kind}-`));
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: spec.w, height: spec.h },
    deviceScaleFactor: 1,
    recordVideo: { dir: videoDir, size: { width: spec.w, height: spec.h } },
    hasTouch: kind === 'portrait',
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
  // The app centres a square board in a fixed-width column, so at 1920 CSS px the clip is mostly empty
  // background. CSS zoom scales the whole layout inside the full-size viewport (deviceScaleFactor does
  // NOT work here — the recorder's canvas stays at CSS-pixel size and the frame ends up padded).
  await page.evaluate((z) => { document.documentElement.style.zoom = String(z); }, kind === 'portrait' ? 1.6 : 1.28);

  // cover-as-opening-frame guideline: sit on the menu for a beat before play starts
  await page.locator('button:has-text("Play")').waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForFunction(() => !document.querySelector('button.btn-primary')?.disabled, null, { timeout: 60_000 });
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("Play")').click();
  await page.locator('[data-cell]').first().waitFor({ timeout: 15_000 });

  const grid = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('[data-cell]')];
    const rows = Math.max(...tiles.map((t) => +t.dataset.r)) + 1;
    const cols = Math.max(...tiles.map((t) => +t.dataset.c)) + 1;
    const g = Array.from({ length: rows }, () => Array(cols).fill(''));
    for (const t of tiles) g[+t.dataset.r][+t.dataset.c] = t.innerText.trim();
    return g;
  });
  const dict = new Set(gunzipSync(await readFile(join(DIST, 'en.dict.gz'))).toString('utf8').split('\n').map((w) => w.trim().toLowerCase()).filter(Boolean));
  const words = findWords(grid, dict);
  console.log(`[${kind}] grid ${grid.map((r) => r.join('')).join('/')} — ${words.length} traceable words`);
  if (!words.length) throw new Error('no traceable words on this board — rerun for a new board');

  const center = async (r, c) => page.evaluate(([r, c]) => {
    const t = document.querySelector(`[data-cell][data-r="${r}"][data-c="${c}"]`).getBoundingClientRect();
    return { x: t.left + t.width / 2, y: t.top + t.height / 2 };
  }, [r, c]);

  // Longest words first so the score jumps are visible, but keep the clip inside its budget.
  const deadline = Date.now() + (spec.seconds - 2.5) * 1000;
  let played = 0;
  for (const [word, path] of words) {
    if (Date.now() > deadline) break;
    const pts = [];
    for (const [r, c] of path) pts.push(await center(r, c));
    await page.mouse.move(pts[0].x, pts[0].y);
    await page.mouse.down();
    for (let i = 1; i < pts.length; i++) {
      // several small steps per hop so the SVG connector draws as a smooth trace, not a jump
      const a = pts[i - 1], b = pts[i];
      for (let s = 1; s <= 5; s++) {
        await page.mouse.move(a.x + ((b.x - a.x) * s) / 5, a.y + ((b.y - a.y) * s) / 5);
        await page.waitForTimeout(18);
      }
    }
    await page.mouse.up();
    played++;
    await page.waitForTimeout(420);
  }
  console.log(`[${kind}] traced ${played} words`);
  await page.waitForTimeout(1200);
  await context.close();
  await browser.close();

  const webm = (await readdir(videoDir)).find((f) => f.endsWith('.webm'));
  const src = join(videoDir, webm);
  await mkdir(OUT_DIR, { recursive: true });
  const out = join(OUT_DIR, spec.out);
  execFileSync('ffmpeg', ['-y', '-i', src, '-an', '-t', String(spec.seconds),
    '-vf', `scale=${spec.w}:${spec.h}:force_original_aspect_ratio=increase,crop=${spec.w}:${spec.h},fps=30`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
    { stdio: ['ignore', 'ignore', 'pipe'] });
  await rm(videoDir, { recursive: true, force: true });
  const probe = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,nb_frames:format=duration', '-of', 'default=nw=1', out]).toString().trim();
  console.log(`[${kind}] ${out}\n${probe}`);
  return out;
}

const kinds = (process.argv[2] ?? 'both') === 'both' ? ['landscape', 'portrait'] : [process.argv[2]];
const { chromium } = await import(join(ROOT, '..', 'node_modules', 'playwright', 'index.mjs'))
  .catch(() => import('playwright'));
const { server, port } = await serveDist();
try {
  for (const k of kinds) await record(k, port, chromium);
} finally {
  server.close();
}
