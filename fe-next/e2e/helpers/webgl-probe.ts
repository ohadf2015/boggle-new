import { type Page } from '@playwright/test';

// Counts WebGL contexts a page holds. "raw" = every webgl getContext call
// (Pixi probes support with a throwaway canvas, so raw overcounts). "live" =
// distinct canvases still connected to the DOM whose context is not lost.
// Sampled every 50ms because effects mount late (SharedFxGate, GPU init).

export interface ProbeSnapshot {
  rawWebgl: number;
  everCanvases: number;
  liveNow: number;
  peakLive: number;
}

export async function installWebglProbe(page: Page): Promise<void> {
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
    }, 50);
    (window as unknown as { __fxProbe: unknown }).__fxProbe = {
      snapshot: () => ({
        rawWebgl: state.rawWebgl,
        everCanvases: state.ever.size,
        liveNow: liveNow(),
        peakLive: Math.max(state.peakLive, liveNow()),
      }),
      resetPeak: () => {
        state.peakLive = liveNow();
      },
    };
  });
}

type ProbeWindow = { __fxProbe: { snapshot: () => ProbeSnapshot; resetPeak: () => void } };

export function webglSnapshot(page: Page): Promise<ProbeSnapshot> {
  return page.evaluate(() => (window as unknown as ProbeWindow).__fxProbe.snapshot());
}

export function resetWebglPeak(page: Page): Promise<void> {
  return page.evaluate(() => (window as unknown as ProbeWindow).__fxProbe.resetPeak());
}
