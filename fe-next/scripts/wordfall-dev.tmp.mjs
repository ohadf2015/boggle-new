import { chromium } from '@playwright/test';
const exe = '/home/hermes/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL', isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('EXC', String(e).split('\n')[0].slice(0, 150)));
try {
  await page.goto('http://localhost:3001/he/dev-wordfall', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('[data-testid="blast-board"]', { timeout: 45000 });
  console.log('BOARD FOUND');
} catch { console.log('BOARD MISSING'); }
await page.waitForTimeout(2000);
const report = await page.evaluate(() => {
  const L = [];
  const box = (el) => { const r = el.getBoundingClientRect(); return `[${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}]`; };
  const audio = [...document.querySelectorAll('button')].find((b) => (b.className || '').includes('z-[70]'));
  L.push('AUDIO: ' + (audio ? box(audio) : 'MISSING'));
  document.querySelectorAll('*').forEach((el) => {
    const cls = typeof el.className === 'string' ? el.className : '';
    if (!/tabular-nums|font-neo-display|playfieldFrame|strike|font-neo-body text-xs/.test(cls)) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    const txt = el.children.length === 0 ? (el.textContent || '').trim().slice(0, 45) : '';
    L.push(`${el.tagName.toLowerCase()} ${box(el)} dir=${el.dir || getComputedStyle(el).direction} "${txt}"`);
  });
  return L.join('\n');
}).catch((e) => 'EVAL FAIL ' + e);
console.log(report);
await page.screenshot({ path: '/tmp/wordfall-dev.png' }).catch(() => {});
console.log('done');
await browser.close();
