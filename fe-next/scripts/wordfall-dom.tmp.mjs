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
await page.addInitScript(() => {
  localStorage.setItem('blast-v2-progress', JSON.stringify({ currentLevel: 28, locale: 'he' }));
  localStorage.setItem('blast-v2-resume-hint', '28');
  // best-effort: mark tutorials seen (exact keys unknown; dump later if needed)
  localStorage.setItem('blast-v2-unlocks-seen', JSON.stringify({ drag: 1, submit: 1, cascade: 1, gems: 1, chest: 1, undo: 1, hint: 1, reverse: 1, multirow: 1 }));
});
await page.goto('http://localhost:3001/he/blast/v2', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForSelector('button', { timeout: 90000 });
await page.waitForTimeout(4000);
for (let i = 0; i < 6; i++) {
  const btn = page.locator('button:visible').filter({ hasText: /קדימה|התחל|בואו|start|play|go/i }).first();
  if (await btn.count() && await btn.isVisible().catch(() => false)) {
    await btn.tap().catch(() => btn.click());
    await page.waitForTimeout(1000);
  } else break;
}
await page.waitForTimeout(1500);

const report = await page.evaluate(() => {
  const out = [];
  const push = (label, el) => {
    if (!el) { out.push(`${label}: MISSING`); return; }
    const r = el.getBoundingClientRect();
    out.push(`${label}: x=${Math.round(r.x)},y=${Math.round(r.y)},w=${Math.round(r.width)},h=${Math.round(r.height)} | text="${(el.textContent || '').trim().slice(0, 60)}"`);
  };
  push('VOLUME_BTN', document.querySelector('button[class*="audio" i], button[aria-label*="volume" i], button[aria-label*="sound" i], button[aria-label*="mute" i]'));
  push('CHEST_BADGE', document.querySelector('[data-testid="blast-chest-badge"]'));
  push('LEVEL_BOX', document.querySelector('h1'));
  const hud = document.querySelectorAll('[class*="font-neo"]')[0]?.closest('div');
  // strike squares
  const strikes = document.querySelectorAll('[data-testid*="strike" i]');
  out.push(`STRIKE_NODES=${strikes.length}`);
  // progress pill: search for text with /
  document.querySelectorAll('span,div,p').forEach((el) => {
    const t = (el.textContent || '').trim();
    if (/^\d+\s*\/\s*\d+$/.test(t) && el.children.length === 0) {
      const r = el.getBoundingClientRect();
      out.push(`SLASH_COUNTER: "${t}" x=${Math.round(r.x)},y=${Math.round(r.y)},w=${Math.round(r.width)},h=${Math.round(r.height)} dir=${getComputedStyle(el).direction}`);
    }
  });
  push('BOARD', document.querySelector('[data-testid="blast-board"]'));
  push('FRAME', document.querySelector('[data-testid="playfield-frame"]'));
  // what is the tall vertical bar? find elements taller than 80px and narrower than 30
  document.querySelectorAll('div,span,svg').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height > 80 && r.width > 4 && r.width < 40 && r.top < 200) {
      out.push(`TALL_THIN: tag=${el.tagName} cls=${(el.className || '').toString().slice(0, 80)} x=${Math.round(r.x)},y=${Math.round(r.y)},w=${Math.round(r.width)},h=${Math.round(r.height)}`);
    }
  });
  // page height usage
  out.push(`BODY_SCROLL_H=${document.body.scrollHeight} INNER_H=${window.innerHeight}`);
  return out.join('\n');
});
console.log(report);
await page.screenshot({ path: '/tmp/wordfall-dom.png' });
await browser.close();
