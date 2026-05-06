/**
 * Blast Juice Kit — screen-level "game feel" primitives for BlastEffectsCanvas.
 *
 * Wraps expensive filter stacks + camera shake + hit-stop into three semantic
 * calls so handler code can stay readable:
 *
 *   juice.megaPunch({cx, cy})   — on 5+ chain cascade / bomb chain
 *   juice.comboPulse(tier)      — each time word-streak combo ticks up
 *   juice.waveClearBurst({cx, cy}) — on wave completion
 *
 * All filter stacks auto-clear after a short window. Destroy idempotent.
 *
 * Inspired by Vlambeer's "Art of Screenshake": layer cheap effects, always
 * return to baseline quickly, never let residual state linger.
 */

import type { Application, Filter } from 'pixi.js';
import {
  createRGBSplitFilter,
  createZoomBlurFilter,
  createAdvancedBloomFilter,
  createAdjustmentFilter,
} from './pixiFilterPresets';

type RGBSplit = ReturnType<typeof createRGBSplitFilter>;
type ZoomBlur = ReturnType<typeof createZoomBlurFilter>;
type AdvancedBloom = ReturnType<typeof createAdvancedBloomFilter>;

interface ShakeLike {
  shake: (opts: { intensity: number; duration: number; decay?: 'linear' | 'exponential' }) => void;
}

interface TimeDilationLike {
  freeze: (duration: number) => void;
  slowDown?: (scale: number, duration: number) => void;
}

interface JuiceEngine {
  app: Pick<Application, 'ticker'>;
  // Loosened from Pick<Container,'filters'> — PixiJS v8 types forbid null, but
  // we intentionally null the ref on destroy as a "fully reset" sentinel the
  // caller can assert on.
  camera: { filters: readonly Filter[] | Filter[] | null };
  shake: ShakeLike;
  timeDilation: TimeDilationLike;
  /**
   * Optional predicate queried before every burst. Return `false` to skip the
   * effect entirely (no filters, no shake, no hit-stop). Checked at call time
   * — not capture time — so live toggles of `prefers-reduced-motion` take
   * effect on the next burst without recreating the kit.
   *
   * Injected rather than imported so the kit stays pure and testable without
   * mocking `window.matchMedia`. Defaults to `() => true`.
   */
  motionOk?: () => boolean;
}

export interface BlastJuiceKit {
  megaPunch: (origin: { cx: number; cy: number }) => void;
  comboPulse: (tier: number) => void;
  waveClearBurst: (origin: { cx: number; cy: number }) => void;
  destroy: () => void;
}

/** Animate a numeric property on a filter from `from` → `to` over `duration` ms. */
function tweenNumber(
  duration: number,
  from: number,
  to: number,
  onUpdate: (v: number) => void,
  onDone?: () => void,
): () => void {
  const start = performance.now();
  let rafId = 0;
  let cancelled = false;
  const tick = () => {
    if (cancelled) return;
    const t = Math.min((performance.now() - start) / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - t, 3);
    onUpdate(from + (to - from) * eased);
    if (t < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      onDone?.();
    }
  };
  rafId = requestAnimationFrame(tick);
  return () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
  };
}

export function createBlastJuiceKit(eng: JuiceEngine): BlastJuiceKit {
  let destroyed = false;
  const activeCancellers: Array<() => void> = [];
  const motionOk = () => (eng.motionOk ? eng.motionOk() : true);

  const clearCameraFilters = () => {
    eng.camera.filters = null;
  };

  const runFilterBurst = (
    filters: Filter[],
    strengths: { rgb?: number; zoom?: number; bloomScale?: number },
    duration: number,
    rgb?: RGBSplit,
    zoom?: ZoomBlur,
    bloom?: AdvancedBloom,
  ) => {
    if (destroyed) return;
    eng.camera.filters = filters;

    const cancelRgb = rgb
      ? tweenNumber(duration, strengths.rgb ?? 0, 0, (v) => {
          rgb.red = [v, 0];
          rgb.blue = [v === 0 ? 0 : -v, 0];
        })
      : () => {};

    const cancelZoom = zoom
      ? tweenNumber(duration, strengths.zoom ?? 0, 0, (v) => {
          zoom.strength = v;
        })
      : () => {};

    const cancelBloom = bloom
      ? tweenNumber(
          duration,
          strengths.bloomScale ?? 1.8,
          0.6,
          (v) => {
            bloom.bloomScale = v;
          },
          () => {
            if (!destroyed) clearCameraFilters();
          },
        )
      : () => {
          if (!destroyed) clearCameraFilters();
        };

    activeCancellers.push(cancelRgb, cancelZoom, cancelBloom);
  };

  const megaPunch = (origin: { cx: number; cy: number }) => {
    if (destroyed || !motionOk()) return;
    const rgb = createRGBSplitFilter(8);
    const zoom = createZoomBlurFilter({ strength: 0.35, center: [origin.cx, origin.cy] });
    const bloom = createAdvancedBloomFilter(3);

    runFilterBurst([rgb, zoom, bloom], { rgb: 10, zoom: 0.35, bloomScale: 2.2 }, 280, rgb, zoom, bloom);

    eng.shake.shake({ intensity: 14, duration: 0.35, decay: 'exponential' });
    eng.timeDilation.freeze(0.08);
  };

  const comboPulse = (tier: number) => {
    if (destroyed || !motionOk()) return;
    const t = Math.max(1, tier);
    const rgb = createRGBSplitFilter(2 + t);
    const adj = createAdjustmentFilter({ saturation: 1 + t * 0.1, brightness: 1.05 });

    runFilterBurst([rgb, adj], { rgb: 2 + t * 1.5 }, 180, rgb, undefined, undefined);

    eng.shake.shake({ intensity: 3 + t * 1.5, duration: 0.18, decay: 'exponential' });
  };

  const waveClearBurst = (origin: { cx: number; cy: number }) => {
    if (destroyed || !motionOk()) return;
    const rgb = createRGBSplitFilter(12);
    const zoom = createZoomBlurFilter({ strength: 0.5, center: [origin.cx, origin.cy] });
    const bloom = createAdvancedBloomFilter(4);

    runFilterBurst([rgb, zoom, bloom], { rgb: 14, zoom: 0.5, bloomScale: 2.8 }, 420, rgb, zoom, bloom);

    eng.shake.shake({ intensity: 18, duration: 0.5, decay: 'exponential' });
    eng.timeDilation.freeze(0.12);
  };

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    activeCancellers.forEach((c) => {
      try {
        c();
      } catch {
        /* ignore */
      }
    });
    activeCancellers.length = 0;
    eng.camera.filters = null;
  };

  return { megaPunch, comboPulse, waveClearBurst, destroy };
}
