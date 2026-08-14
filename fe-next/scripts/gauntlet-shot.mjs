// Gauntlet screenshot harness for Wordfall (blast/v2).
// Usage: node scripts/gauntlet-shot.mjs <outDir> [label]
// Drives the level intro -> board and captures both at phone viewport.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const outDir = process.argv[2] || '/tmp/wordfall-shots';
const label = process.argv[3] || 'shot';
const base = process.env.BASE_URL || 'http://localhost:3100';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE_ERR', m.text().slice(0, 200)); });

// Dev-server first paint on this route is slow (Pixi + GSAP + framer, and the
// box is often running several sessions), so wait on `commit` and give it room
// rather than racing the compile.
await page.goto(`${base}/en/blast/v2`, { waitUntil: 'commit', timeout: 300000 });
await page.waitForSelector('[data-testid="blast-board"], [data-testid="theme-label"]', { timeout: 300000 }).catch(() => {});
await page.waitForTimeout(9000);

// Cookie consent is a blocking modal on a fresh browser profile and would
// otherwise be the only thing in every screenshot.
// Cookie consent, then the app-install promo that appears behind it.
for (const name of [/accept all/i, /not now/i, /got it/i]) {
  const btn = page.getByRole('button', { name });
  if (await btn.count()) { await btn.first().click().catch(() => {}); await page.waitForTimeout(1500); }
}
await page.screenshot({ path: `${outDir}/${label}-1-intro.png` });

// Click through any intro / FTUE / concept card to reach the board.
for (let i = 0; i < 6; i++) {
  const board = await page.locator('[class*="boardContainer"], [class*="board"]').first().count();
  const tiles = await page.locator('[data-blast-tile], [class*="tile"]').count();
  if (board && tiles > 8) break;
  await page.mouse.click(195, 700);
  await page.waitForTimeout(1400);
}
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outDir}/${label}-2-board.png` });

// Tight crop of just the board area if we can find it.
const el = page.locator('[class*="boardContainer"]').first();
if (await el.count()) {
  try { await el.screenshot({ path: `${outDir}/${label}-3-boardonly.png` }); } catch {}
}

console.log('RC=0 shots written to', outDir);
await browser.close();
