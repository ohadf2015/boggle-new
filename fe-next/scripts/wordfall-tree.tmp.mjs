import { chromium } from '@playwright/test';

const exe = '/home/hermes/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL', isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem('blast-v2-progress', JSON.stringify({ currentLevel: 28, locale: 'he' }));
  localStorage.setItem('blast-v2-resume-hint', '28');
});
await page.goto('http://localhost:3001/he/blast/v2', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForSelector('button', { timeout: 90000 });
await page.waitForTimeout(4000);
for (let i = 0; i < 6; i++) {
  const btn = page.locator('button:visible').filter({ hasText: /קדימה|התחל|בואו|start|play|go/i }).first();
  if (await btn.count() && await btn.isVisible().catch(() => false)) { await btn.tap().catch(() => btn.click()); await page.waitForTimeout(1000); } else break;
}
await page.waitForTimeout(1500);
const tree = await page.evaluate(() => {
  const lines = [];
  const walk = (el, depth) => {
    if (depth > 14) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    if (r.bottom < 0 || r.top > 844) return;
    const tag = el.tagName.toLowerCase();
    const cls = (typeof el.className === 'string' ? el.className : '').slice(0, 70);
    const txt = (el.children.length === 0 ? (el.textContent || '').trim().slice(0, 40) : '');
    const interesting = tag === 'button' || txt || /hud|badge|pill|bar|frame|strike|banner|chest/i.test(cls) || (r.height > 60 && r.width < 40);
    if (interesting) lines.push(`${'  '.repeat(depth)}<${tag}> [${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}] ${cls} "${txt}"`);
    for (const c of el.children) walk(c, depth + 1);
  };
  walk(document.body, 0);
  return lines.join('\n');
});
console.log(tree);
await browser.close();
