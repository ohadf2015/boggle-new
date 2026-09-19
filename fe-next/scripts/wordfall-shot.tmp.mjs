import { chromium } from '@playwright/test';

const exe = '/home/hermes/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: 'he-IL',
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE_ERR:', m.text().slice(0, 200)); });
page.on('pageerror', (e) => console.log('PAGE_EXC:', String(e).slice(0, 300)));

// Seed guest progress so we land on level 28 like the user's screenshot.
await page.addInitScript(() => {
  localStorage.setItem('blast-v2-progress', JSON.stringify({ currentLevel: 28, locale: 'he' }));
  localStorage.setItem('blast-v2-resume-hint', '28');
});

await page.goto('http://localhost:3001/he/blast/v2', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForSelector('button', { timeout: 90000 });
await page.waitForTimeout(5000);

// Dismiss intro cards if present (level intro -> maybe concept card).
for (let i = 0; i < 4; i++) {
  const btn = page.locator('button:visible').filter({ hasText: /קדימה|התחל|בואו|start|play|go/i }).first();
  if (await btn.count() && await btn.isVisible().catch(() => false)) {
    await btn.tap().catch(() => btn.click());
    await page.waitForTimeout(1200);
  } else break;
}
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/wordfall-before.png', fullPage: false });
console.log('SHOT_SAVED');
await browser.close();
