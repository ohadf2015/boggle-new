import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import {
  observeLayoutShift,
  observeLongFrames,
  readLayoutShift,
  signInAs,
  startFrameRecording,
  stopFrameRecording,
  tapInertSpot,
  waitForSettledMainThread,
} from './edu-no-scroll.harness';

/** Frame pacing for the hub entry and the chest celebration, desktop and a 4x-slower CPU. */
const RESULTS = process.env.EDU_PACING_OUT;
const MAX_FRAME_MS = 50;

async function throttle(page: Page, rate: number) {
  if (rate === 1) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
}

async function openHub(page: Page, context: BrowserContext, baseURL: string) {
  await page.setViewportSize({ width: 1366, height: 768 });
  await signInAs(context, page, baseURL, 'student-full');
  // A returning student: the consent banner would land inside the motion window at 4x and read as motion.
  await context.addInitScript(() => {
    localStorage.setItem('cookie-consent-v2', JSON.stringify({ essential: true, analytics: false, advertising: false, timestamp: Date.now() }));
  });
  await observeLayoutShift(page);
  await observeLongFrames(page);
}

/** Raw mouse: locator.click() waits for the wiggling badge to hold still, putting idle hub into the window. */
async function tapChest(page: Page) {
  const chest = page.getByTestId('academy-daily-chest');
  await expect(chest).toBeEnabled();
  // Laid out before the tap: opening only flips its phase.
  await expect(page.getByTestId('academy-chest-reveal')).toBeAttached();
  await expect(page.getByTestId('academy-chest-reveal')).toBeHidden();
  const box = (await chest.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await startFrameRecording(page);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(1500);
  return stopFrameRecording(page);
}

for (const rate of [1, 4]) {
  test(`hub entry, and the chest celebration once the student has tapped the hub, stay under ${MAX_FRAME_MS}ms a frame at ${rate}x CPU, with no layout shift`, async ({ page, context, baseURL, browserName }, info) => {
    test.skip(browserName !== 'chromium', 'CPU throttling is a Chromium DevTools feature');
    test.setTimeout(150_000);
    await openHub(page, context, baseURL!);
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

    // The app's first tap anywhere releases its deferred loaders (shared Pixi FX, analytics, the
    // feedback widget). Measured and reported here; the chest test below it is the student's next tap.
    await startFrameRecording(page);
    await tapInertSpot(page);
    await waitForSettledMainThread(page);
    const firstEngagement = await stopFrameRecording(page);

    // No probes inside the window: a computed-style read forces a restyle and would be measured as ours.
    const celebration = await tapChest(page);
    await expect(page.getByTestId('academy-chest-reveal')).toBeVisible();
    await expect(page.locator('[data-testid="academy-hub"] > main')).toHaveCSS('content-visibility', 'hidden');
    await page.getByRole('button', { name: /collect/i }).click();
    await expect(page.locator('[data-testid="academy-hub"] > main')).toHaveCSS('content-visibility', 'visible');
    const motionShift = (await readLayoutShift(page)) - loadShift;

    const round = (n: number) => Math.round(n * 1000) / 1000;
    const report = { rate, entry, celebration, firstEngagement, loadCls: round(loadShift), motionCls: round(motionShift) };
    await info.attach('pacing', { body: JSON.stringify(report), contentType: 'application/json' });
    if (RESULTS) console.log(`PACING ${JSON.stringify(report)}`);

    // Entry overlaps the app shell's lazy analytics/replay tags (request 11); their script time is
    // excused by attribution, anything else in the frame still counts. The celebration excuses nothing.
    expect(entry.ownMax, JSON.stringify(report)).toBeLessThanOrEqual(MAX_FRAME_MS);
    expect(celebration.max, JSON.stringify(report)).toBeLessThanOrEqual(MAX_FRAME_MS);
    expect(motionShift, JSON.stringify(report)).toBeLessThan(0.001);
  });
}

// Reported, not asserted: on a first tap the app shell's deferred loaders share the chest's frames.
test('chest as the very first tap at 4x CPU (reported; the app-shell loaders are the lead\'s)', async ({ page, context, baseURL, browserName }, info) => {
  test.skip(browserName !== 'chromium', 'CPU throttling is a Chromium DevTools feature');
  test.setTimeout(150_000);
  await openHub(page, context, baseURL!);
  await page.goto('/en/student');
  await expect(page.getByTestId('academy-cta-pending')).toHaveCount(0, { timeout: 60_000 });
  await throttle(page, 4);
  await page.reload();
  await expect(page.getByTestId('academy-cta')).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(3000);
  const firstTap = await tapChest(page);
  await info.attach('pacing-first-tap', { body: JSON.stringify(firstTap), contentType: 'application/json' });
  if (RESULTS) console.log(`PACING-FIRST-TAP ${JSON.stringify(firstTap)}`);
  await expect(page.getByTestId('academy-chest-reveal')).toBeVisible();
});

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
      samples.push(await badge.evaluate((el) => { const cs = getComputedStyle(el); return `${cs.transform} ${cs.rotate}`; }));
      await page.waitForTimeout(350);
    }
    const distinct = new Set(samples).size;
    if (reduced) expect(distinct, samples.join(' | ')).toBe(1);
    else expect(distinct, samples.join(' | ')).toBeGreaterThan(1);
  });
}
