import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { installWebglProbe, resetWebglPeak, webglSnapshot, type ProbeSnapshot } from './helpers/webgl-probe';
import { solveCrosswordByReveal } from './helpers/crossword-solve';

const ROUTES = (process.env.FX_PROBE_ROUTES ?? '/en,/en/blast,/en/daily-word-wheel,/en/daily,/en/crossword,/en/word-tower,/en/word-craft,/en/adventure')
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean);
const SETTLE_MS = Number(process.env.FX_PROBE_SETTLE_MS ?? 4000);
const OUT = process.env.FX_PROBE_OUT ?? 'test-results/fx-webgl-probe.json';

test.describe('FX WebGL context budget', () => {
  test('records WebGL contexts per route', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'desktop probe only');
    test.setTimeout(900_000);
    await installWebglProbe(page);
    const snap = () => webglSnapshot(page);
    const results: Record<string, { status: number | null; cold: ProbeSnapshot; afterInteraction: ProbeSnapshot }> = {};
    for (const route of ROUTES) {
      const resp = await page.goto(route, { waitUntil: 'load', timeout: 240_000 });
      await page.waitForTimeout(SETTLE_MS);
      const cold = await snap();
      // SharedFxGate holds GPU mount until the first pointerdown/keydown/touchstart.
      await page.mouse.click(2, 2);
      await page.waitForTimeout(SETTLE_MS);
      results[route] = { status: resp?.status() ?? null, cold, afterInteraction: await snap() };
    }

    // Co-mount scenario: the solve confetti used to open its own context next to SharedFxApp.
    await page.goto('/en/crossword', { waitUntil: 'load', timeout: 240_000 });
    await page.getByRole('gridcell').first().waitFor({ timeout: 240_000 });
    await page.getByRole('gridcell').first().click();
    await page.waitForTimeout(SETTLE_MS);
    const cold = await snap();
    await resetWebglPeak(page);
    await solveCrosswordByReveal(page);
    await page.waitForTimeout(1500);
    results['crossword-solve'] = { status: null, cold, afterInteraction: await snap() };

    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(results, null, 2));
    testInfo.attach('fx-webgl-probe', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });

    const totalRaw = Object.values(results).reduce((s, r) => s + r.afterInteraction.rawWebgl, 0);
    // Silent-failure guard: a headless run with no WebGL reads 0 everywhere and
    // would look like a perfect budget. Fail loudly instead.
    expect(totalRaw, 'no WebGL context observed; probe is not measuring').toBeGreaterThan(0);
  });
});
