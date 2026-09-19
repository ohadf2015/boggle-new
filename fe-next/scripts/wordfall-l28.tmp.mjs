import { chromium } from '@playwright/test';

const exe = '/home/hermes/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL', isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.route('**/api/blast/progress**', (r) => r.abort());
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
const report = await page.evaluate(() => {
  const L = [];
  const box = (el) => { const r = el.getBoundingClientRect(); return `[${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}]`; };
  // audio button
  const audio = document.querySelector('button.fixed.z-\\[70\\], button[class*="z-[70"]') || [...document.querySelectorAll('button')].find((b) => /volume|sound|mute|שמע|קול/i.test(b.getAttribute('aria-label') || ''));
  L.push('AUDIO: ' + (audio ? box(audio) + ' aria="' + audio.getAttribute('aria-label') + '"' : 'MISSING'));
  // all direct children of the HUD bands: find spans with tabular-nums / strike / pill classes
  document.querySelectorAll('*').forEach((el) => {
    const cls = typeof el.className === 'string' ? el.className : '';
    const r = el.getBoundingClientRect();
    if (r.top > 300 || r.width === 0) return;
    const tag = el.tagName.toLowerCase();
    const txt = el.children.length === 0 ? (el.textContent || '').trim().slice(0, 45) : '';
    if (!txt && !/playfieldFrame|strike|cellWell/.test(cls)) return;
    if (/strike|tabular-nums|font-neo-display/.test(cls) || tag === 'button' || /playfieldFrame/.test(cls)) {
      L.push(`${tag} ${box(el)} dir=${el.dir || getComputedStyle(el).direction} cls=${cls.slice(0, 60)} "${txt}"`);
    }
  });
  return L.join('\n');
});
console.log(report);
await page.screenshot({ path: '/tmp/wordfall-l28.png' });
await browser.close();
