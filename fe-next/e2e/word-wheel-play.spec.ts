import { test, expect, type Page } from '@playwright/test';
import { gunzipSync } from 'node:zlib';

// Element-driven only: the prod server keeps sockets and analytics open, so
// networkidle never settles there.

interface Letter { l: string; x: number; y: number; hub: boolean }

async function openWheel(page: Page) {
  await page.goto('/en/daily/word-wheel?practice=1');
  await page.getByRole('button', { name: /^play$/i }).first().click({ force: true, timeout: 20_000 });
  await expect(page.getByTestId('word-wheel-stage')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-wheel-letter]')).toHaveCount(7);
  const dismiss = page.getByRole('button', { name: /^dismiss$/i }).first();
  if (await dismiss.isVisible({ timeout: 1_000 }).catch(() => false)) await dismiss.click({ force: true });
}

async function readWheel(page: Page): Promise<Letter[]> {
  return page.$$eval('[data-wheel-letter]', (els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return {
        l: (e.getAttribute('data-wheel-letter') || '').toLowerCase(),
        x: r.x + r.width / 2,
        y: r.y + r.height / 2,
        hub: e.getAttribute('data-wheel-index') === '-1',
      };
    }),
  );
}

async function loadDict(page: Page): Promise<Set<string>> {
  const res = await page.request.get('/dicts/en.dict.gz');
  expect(res.ok()).toBe(true);
  const text = gunzipSync(await res.body()).toString('utf8');
  return new Set(text.split('\n').map((w) => w.trim().toLowerCase()).filter(Boolean));
}

function pathFor(word: string, wheel: Letter[]): Letter[] | null {
  const used = new Set<number>();
  const out: Letter[] = [];
  for (const ch of word) {
    const i = wheel.findIndex((p, k) => p.l === ch && !used.has(k));
    if (i < 0) return null;
    used.add(i);
    out.push(wheel[i]);
  }
  return out;
}

function findWord(dict: Set<string>, wheel: Letter[]): string | null {
  const hub = wheel.find((p) => p.hub)!.l;
  const letters = wheel.map((p) => p.l);
  let best: string | null = null;
  const walk = (prefix: string, left: string[]) => {
    if (prefix.length >= 4 && prefix.includes(hub) && dict.has(prefix) && (!best || prefix.length > best.length)) best = prefix;
    if (prefix.length >= 5) return;
    left.forEach((l, i) => walk(prefix + l, left.filter((_, k) => k !== i)));
  };
  walk('', letters);
  return best;
}

// The verdict flash lasts under a second and lands after a server round-trip for
// misses, so polling for it can fall between two polls; record every flash instead.
async function watchFx(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __wheelFx: string[] };
    w.__wheelFx = [];
    new MutationObserver(() => {
      document.querySelectorAll('[data-testid="wheel-disc-fx"]').forEach((el) => {
        const kind = el.getAttribute('data-kind') || '';
        if (w.__wheelFx[w.__wheelFx.length - 1] !== kind) w.__wheelFx.push(kind);
      });
    }).observe(document.body, { subtree: true, childList: true, attributes: true });
  });
  return () => page.evaluate(() => (window as unknown as { __wheelFx: string[] }).__wheelFx);
}

async function drag(page: Page, pts: Letter[], onEach?: (n: number) => Promise<void>) {
  await page.mouse.move(pts[0].x, pts[0].y);
  await page.mouse.down();
  for (let i = 1; i < pts.length; i++) {
    await page.mouse.move(pts[i].x, pts[i].y, { steps: 6 });
    // Rest on each letter so the hub is taken on purpose, never by a crossing.
    await page.waitForTimeout(220);
    await onEach?.(i + 1);
  }
  await page.mouse.up();
}

test.describe('Word Wheel play', () => {
  test('the letters hold still while the practice tip rotates, so a swipe lands where the finger aims', async ({ page }) => {
    test.setTimeout(90_000);
    await openWheel(page);
    const before = await readWheel(page);
    await page.waitForTimeout(8_000);
    const after = await readWheel(page);
    for (const [i, p] of before.entries()) {
      expect(Math.abs(after[i].x - p.x), `${p.l} moved sideways`).toBeLessThan(2);
      expect(Math.abs(after[i].y - p.y), `${p.l} moved vertically`).toBeLessThan(2);
    }
  });

  test('a drag spells live, an accepted word reacts on the wheel and lands in the found list', async ({ page }) => {
    test.setTimeout(90_000);
    const dict = await loadDict(page);
    await openWheel(page);
    const wheel = await readWheel(page);
    const word = findWord(dict, wheel);
    expect(word, `no 4+ letter word on ${wheel.map((p) => p.l).join('')}`).not.toBeNull();

    const fxSeen = await watchFx(page);
    await drag(page, pathFor(word!, wheel)!, async (n) => {
      await expect(page.locator('[data-wheel-used="true"]')).toHaveCount(n);
    });
    await expect.poll(fxSeen, { timeout: 8_000 }).toContain('good');
    await expect(page.getByTestId('found-word')).toHaveCount(1);
    await expect(page.getByTestId('found-word').first()).toContainText(word!.toUpperCase());
    await expect(page.getByTestId('rank-bubble')).not.toHaveText('0');
  });

  test('a drag over a non-word shakes the wheel red and keeps the found list empty', async ({ page }) => {
    const dict = await loadDict(page);
    await openWheel(page);
    const wheel = await readWheel(page);
    const hub = wheel.find((p) => p.hub)!;
    const outer = wheel.filter((p) => !p.hub);
    let bad: Letter[] | null = null;
    for (const a of outer) {
      for (const b of outer) {
        if (a === b) continue;
        if (!dict.has(hub.l + a.l + b.l)) { bad = [hub, a, b]; break; }
      }
      if (bad) break;
    }
    expect(bad).not.toBeNull();

    const fxSeen = await watchFx(page);
    await drag(page, bad!);
    await expect.poll(fxSeen, { timeout: 8_000 }).toEqual(['bad']);
    await expect(page.getByTestId('found-word')).toHaveCount(0);
    await expect(page.locator('[data-wheel-used="true"]')).toHaveCount(0);
  });
});
