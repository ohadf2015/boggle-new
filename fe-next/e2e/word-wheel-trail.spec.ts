import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import zlib from 'node:zlib';
import { goto, waitForHydration } from './helpers/test-utils';

async function loadDict(request: APIRequestContext): Promise<Set<string>> {
  const res = await request.get('/dicts/en.dict.gz');
  expect(res.ok()).toBeTruthy();
  const text = zlib.gunzipSync(await res.body()).toString('utf8');
  return new Set(text.split('\n').map((w) => w.trim().toLowerCase()).filter(Boolean));
}

function wordsFrom(dict: Set<string>, letters: string[], centre: string): string[] {
  const counts = new Map<string, number>();
  for (const l of letters) counts.set(l, (counts.get(l) ?? 0) + 1);
  const out: string[] = [];
  const walk = (prefix: string) => {
    if (prefix.length >= 3 && prefix.includes(centre) && dict.has(prefix)) out.push(prefix);
    if (prefix.length >= 5) return;
    for (const [l, n] of counts) {
      if (n <= 0) continue;
      counts.set(l, n - 1);
      walk(prefix + l);
      counts.set(l, n);
    }
  };
  walk('');
  return [...new Set(out)].sort((a, b) => b.length - a.length);
}

async function readWheel(page: Page) {
  return page.$$eval('[data-wheel-letter]', (els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { l: (e.getAttribute('data-wheel-letter') || '').toLowerCase(), x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }),
  );
}

test.describe('Word Wheel trail', () => {
  test('a drag draws a live lime trail through the chosen letters and fills them', async ({ page, request }) => {
    const dict = await loadDict(request);
    await goto(page, '/daily/word-wheel?practice=1', 'en');
    await waitForHydration(page);
    await page.getByRole('button', { name: /^play$/i }).first().click();
    await expect(page.getByTestId('word-wheel-stage')).toBeVisible();
    await expect(page.locator('[data-wheel-letter]').nth(5)).toBeVisible();

    const letters = await readWheel(page);
    const cx = letters.reduce((s, p) => s + p.x, 0) / letters.length;
    const cy = letters.reduce((s, p) => s + p.y, 0) / letters.length;
    const centre = [...letters].sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0];
    const word = wordsFrom(dict, letters.map((p) => p.l), centre.l).find((w) => w.length >= 3);
    test.skip(!word, 'no dictionary word on this wheel');

    const usedSlots = new Set<number>();
    const path = [...(word as string)].map((ch) => {
      const slot = letters.findIndex((p, i) => p.l === ch && !usedSlots.has(i));
      usedSlots.add(slot);
      return letters[slot];
    });
    await page.mouse.move(path[0].x, path[0].y);
    await page.mouse.down();
    for (const p of path.slice(1)) await page.mouse.move(p.x, p.y, { steps: 6 });
    await page.mouse.move(path[path.length - 1].x + 12, path[path.length - 1].y + 12, { steps: 3 });

    await expect(page.locator('[data-trail-line]')).toHaveCount(1);
    const tip = await page.locator('[data-testid=word-wheel-trail] path').last().getAttribute('d');
    expect(tip ?? '').toMatch(/^M/);

    await page.mouse.up();
    await expect(page.locator('[data-trail-line]')).toHaveCount(0, { timeout: 5000 });
  });
});
