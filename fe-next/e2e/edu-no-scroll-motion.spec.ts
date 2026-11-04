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
  test(`hub entry, and the chest celebration on a tap after first engagement, stay under ${MAX_FRAME_MS}ms a frame at ${rate}x CPU, with no layout shift`, async ({ page, context, baseURL, browserName }, info) => {
    test.skip(browserName !== 'chromium', 'CPU throttling is a Chromium DevTools feature');
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1366, height: 768 });
    await signInAs(context, page, baseURL!, 'student-full');
    // A returning student: the consent banner would land inside the motion window at 4x and read as motion.
    await context.addInitScript(() => {
      localStorage.setItem('cookie-consent-v2', JSON.stringify({ essential: true, analytics: false, advertising: false, timestamp: Date.now() }));
    });
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

    // The app's first key/tap anywhere loads its global first-engagement extras (the shared Pixi FX
    // layer, analytics). That cost lands on whatever the student taps first; it is measured and reported
    // here, apart from the celebration, which is measured on a tap that is not the first.
    await startFrameRecording(page);
    await page.keyboard.press('Shift');
    await page.waitForTimeout(rate === 1 ? 1500 : 4000);
    const firstEngagement = await stopFrameRecording(page);

    const chest = page.getByTestId('academy-daily-chest');
    await expect(chest).toBeEnabled();
    // Laid out before the tap: opening only flips its phase.
    await expect(page.getByTestId('academy-chest-reveal')).toBeAttached();
    await expect(page.getByTestId('academy-chest-reveal')).toBeHidden();
    // No probes inside the window: a computed-style read forces a restyle and would be measured as ours.
    // The tap is a raw mouse click: locator.click() waits for the wiggling badge to hold still, which
    // would put seconds of idle hub (and Playwright's own per-frame polling) into the window.
    const box = (await chest.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await startFrameRecording(page);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(1500);
    const celebration = await stopFrameRecording(page);
    await expect(page.getByTestId('academy-chest-reveal')).toBeVisible();
    await expect(page.locator('[data-testid="academy-hub"] > main')).toHaveCSS('content-visibility', 'hidden');
    await page.getByRole('button', { name: /collect/i }).click();
    await expect(page.locator('[data-testid="academy-hub"] > main')).toHaveCSS('content-visibility', 'visible');
    const motionShift = (await readLayoutShift(page)) - loadShift;

    const round = (n: number) => Math.round(n * 1000) / 1000;
    const report = { rate, entry, celebration, firstEngagement, loadCls: round(loadShift), motionCls: round(motionShift) };
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

for (const reduced of [false, true]) {
  test(`chest badge idle wiggle ${reduced ? 'is still under' : 'moves without'} reduced motion`, async ({ page, context, baseURL }) => {
    if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await signInAs(context, page, baseURL!, 'student-full');
    await page.goto('/en/student');
    const badge = page.getByTestId('academy-daily-chest');
    await expect(badge).toBeEnabled({ timeout: 60_000 });
    await page.waitForTimeout(800);
    const samples: string[] = [];
    for (let i = 0; i < 12; i++) {
      samples.push(await badge.evaluate((el) => getComputedStyle(el).transform));
      await page.waitForTimeout(350);
    }
    const distinct = new Set(samples).size;
    if (reduced) expect(distinct, samples.join(' | ')).toBe(1);
    else expect(distinct, samples.join(' | ')).toBeGreaterThan(1);
  });
}
