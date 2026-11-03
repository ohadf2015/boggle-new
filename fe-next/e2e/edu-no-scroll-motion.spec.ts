import { test, expect, type Page } from '@playwright/test';
import {
  observeLayoutShift,
  readLayoutShift,
  signInAs,
  startFrameRecording,
  stopFrameRecording,
} from './edu-no-scroll.harness';

/** Frame pacing for the hub entry and the chest celebration, desktop and a 4x-slower CPU. */
const RESULTS = process.env.EDU_PACING_OUT;
const MAX_FRAME_MS = 50;

async function throttle(page: Page, rate: number) {
  if (rate === 1) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
}

for (const rate of [1, 4]) {
  test(`hub entry and chest open stay under ${MAX_FRAME_MS}ms a frame at ${rate}x CPU, with no layout shift`, async ({ page, context, baseURL, browserName }, info) => {
    test.skip(browserName !== 'chromium', 'CPU throttling is a Chromium DevTools feature');
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1366, height: 768 });
    await signInAs(context, page, baseURL!, 'student-full');
    await observeLayoutShift(page);
    await page.goto('/en/student');
    await expect(page.getByTestId('academy-hub')).toBeVisible({ timeout: 60_000 });
    // Hydration and data loading are not ours to pace; measure from the first painted hub.
    await expect(page.getByTestId('academy-cta-pending')).toHaveCount(0, { timeout: 30_000 });
    await throttle(page, rate);

    await page.reload();
    await expect(page.getByTestId('academy-hub')).toBeVisible({ timeout: 60_000 });
    await startFrameRecording(page);
    await expect(page.getByTestId('academy-cta')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    const entry = await stopFrameRecording(page);
    // Load-time shift is data arriving (and the cookie banner); only shift from here on is motion.
    const loadShift = await readLayoutShift(page);
    await page.waitForTimeout(1500);

    const chest = page.getByTestId('academy-daily-chest');
    await expect(chest).toBeEnabled();
    await startFrameRecording(page);
    await chest.click();
    await expect(page.getByTestId('academy-chest-reveal')).toBeVisible();
    await expect(page.locator('[data-testid="academy-hub"] > main')).toBeHidden();
    await page.waitForTimeout(1500);
    const celebration = await stopFrameRecording(page);
    await page.getByRole('button', { name: /collect/i }).click();
    await expect(page.locator('[data-testid="academy-hub"] > main')).toBeVisible();
    const motionShift = (await readLayoutShift(page)) - loadShift;

    const round = (n: number) => Math.round(n * 1000) / 1000;
    const report = { rate, entry, celebration, loadCls: round(loadShift), motionCls: round(motionShift) };
    await info.attach('pacing', { body: JSON.stringify(report), contentType: 'application/json' });
    if (RESULTS) console.log(`PACING ${JSON.stringify(report)}`);

    expect(entry.max, JSON.stringify(report)).toBeLessThanOrEqual(MAX_FRAME_MS);
    expect(celebration.max, JSON.stringify(report)).toBeLessThanOrEqual(MAX_FRAME_MS);
    expect(motionShift, JSON.stringify(report)).toBeLessThan(0.001);
  });
}

test('reduced motion: the hub settles with nothing left moving', async ({ page, context, baseURL }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAs(context, page, baseURL!, 'student-full');
  await page.goto('/en/student');
  await expect(page.getByTestId('academy-cta')).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(1500);
  const running = await page.evaluate(() =>
    document.getAnimations()
      .filter((a) => a.playState === 'running')
      .map((a) => (a.effect as KeyframeEffect | null)?.target?.getAttribute?.('data-testid') ?? (a as CSSAnimation).animationName ?? 'anon'),
  );
  expect(running).toEqual([]);
});
