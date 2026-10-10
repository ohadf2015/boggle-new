import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Counts WebGL contexts a page holds. "raw" = every webgl getContext call
// (Pixi probes support with a throwaway canvas, so raw overcounts). "live" =
// distinct canvases still connected to the DOM whose context is not lost.
// Sampled every 200ms because effects mount late (SharedFxGate, GPU init).

const ROUTES = (process.env.FX_PROBE_ROUTES ?? '/en,/en/blast,/en/daily-word-wheel,/en/daily,/en/crossword,/en/word-tower,/en/word-craft,/en/adventure')
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean);
const SETTLE_MS = Number(process.env.FX_PROBE_SETTLE_MS ?? 4000);
const OUT = process.env.FX_PROBE_OUT ?? 'test-results/fx-webgl-probe.json';

interface ProbeSnapshot {
  rawWebgl: number;
  everCanvases: number;
  liveNow: number;
  peakLive: number;
}

async function installProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const WEBGL = /^(webgl|webgl2|experimental-webgl)$/;
    const state = { rawWebgl: 0, ever: new Set<HTMLCanvasElement>(), peakLive: 0 };
    const isLive = (c: HTMLCanvasElement) => {
      if (!c.isConnected) return false;
      const gl = (c as unknown as { __fxCtx?: WebGLRenderingContext }).__fxCtx;
      return !!gl && !gl.isContextLost();
    };
    const liveNow = () => {
      let n = 0;
      for (const c of state.ever) if (isLive(c)) n++;
      return n;
    };
    const origGet = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      const ctx = (origGet as (...a: unknown[]) => RenderingContext | null).call(this, type, ...rest);
      if (WEBGL.test(type) && ctx) {
        state.rawWebgl++;
        state.ever.add(this);
        (this as unknown as { __fxCtx?: unknown }).__fxCtx = ctx;
      }
      return ctx;
    } as typeof origGet;
    setInterval(() => {
      state.peakLive = Math.max(state.peakLive, liveNow());
    }, 200);
    (window as unknown as { __fxProbe: unknown }).__fxProbe = {
      snapshot: (): ProbeSnapshot => ({
        rawWebgl: state.rawWebgl,
        everCanvases: state.ever.size,
        liveNow: liveNow(),
        peakLive: Math.max(state.peakLive, liveNow()),
      }),
    };
  });
}

test.describe('FX WebGL context budget', () => {
  test('records WebGL contexts per route', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'desktop probe only');
    test.setTimeout(900_000);
    await installProbe(page);

    const snap = () =>
      page.evaluate<ProbeSnapshot>(
        () => (window as unknown as { __fxProbe: { snapshot: () => ProbeSnapshot } }).__fxProbe.snapshot(),
      );
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

    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(results, null, 2));
    testInfo.attach('fx-webgl-probe', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });

    const totalRaw = Object.values(results).reduce((s, r) => s + r.afterInteraction.rawWebgl, 0);
    // Silent-failure guard: a headless run with no WebGL reads 0 everywhere and
    // would look like a perfect budget. Fail loudly instead.
    expect(totalRaw, 'no WebGL context observed; probe is not measuring').toBeGreaterThan(0);
  });
});
