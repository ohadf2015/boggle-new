import { test, expect, type Page } from '@playwright/test';
import { installWebglProbe, resetWebglPeak, webglSnapshot } from './helpers/webgl-probe';
import { solveCrosswordByReveal } from './helpers/crossword-solve';

// Confetti palette pixels the crossword UI itself never paints (pink, purple).
const CONFETTI_RGB = [
  [0xff, 0x14, 0x93],
  [0x8b, 0x5c, 0xf6],
];

async function confettiPixels(page: Page): Promise<number> {
  const png = (await page.screenshot()).toString('base64');
  return page.evaluate(
    async ({ png, palette }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${png}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, c.width, c.height);
      let n = 0;
      for (let i = 0; i < data.length; i += 4) {
        for (const [r, g, b] of palette) {
          if (Math.abs(data[i] - r) < 24 && Math.abs(data[i + 1] - g) < 24 && Math.abs(data[i + 2] - b) < 24) {
            n++;
            break;
          }
        }
      }
      return n;
    },
    { png, palette: CONFETTI_RGB },
  );
}

async function waitForLive(page: Page, n: number) {
  await expect.poll(async () => (await webglSnapshot(page)).liveNow, { timeout: 60_000 }).toBe(n);
}

test.describe('Shared FX canvas', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'WebGL probe is chromium-only');

  test('crossword solve confetti draws on the one shared WebGL canvas', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'desktop layout');
    test.setTimeout(600_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await installWebglProbe(page);

    await page.goto('/en/crossword', { waitUntil: 'load', timeout: 300_000 });
    const cells = page.getByRole('gridcell');
    await cells.first().waitFor({ timeout: 300_000 });
    await cells.first().click();
    await waitForLive(page, 1);
    expect((await webglSnapshot(page)).live, 'the one live context is the shared FX canvas').toEqual([
      expect.stringMatching(/^fixed z9999 /),
    ]);
    await resetWebglPeak(page);

    const before = await confettiPixels(page);
    await solveCrosswordByReveal(page);

    await page.waitForTimeout(500);
    const during = await confettiPixels(page);
    expect(during, 'confetti should be visible over the solved card').toBeGreaterThan(before + 200);

    const fixedCanvases = await page.evaluate(
      () =>
        [...document.querySelectorAll('canvas')].filter((c) => getComputedStyle(c).position === 'fixed')
          .length,
    );
    expect(fixedCanvases).toBe(1);

    await page.waitForTimeout(3000);
    expect(await confettiPixels(page), 'confetti clears after its 2.6s run').toBeLessThan(during / 4 + 50);
    expect((await webglSnapshot(page)).peakLive, 'solve must not open a second WebGL context').toBe(1);
    expect(errors).toEqual([]);
  });

  for (const route of ['/en/blast', '/en/daily-word-wheel', '/en/word-craft']) {
    test(`${route} keeps one shared FX context after first interaction`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'desktop layout');
      test.setTimeout(600_000);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await installWebglProbe(page);

      await page.goto(route, { waitUntil: 'load', timeout: 300_000 });
      await page.waitForTimeout(3000);
      await page.mouse.click(2, 2);
      await page.waitForTimeout(4000);

      expect((await webglSnapshot(page)).peakLive).toBeLessThanOrEqual(1);
      expect(errors).toEqual([]);
    });
  }
});
