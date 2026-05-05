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

import { Container, Graphics, type Application, type Filter } from 'pixi.js';
import { gsap } from 'gsap';
import {
  createRGBSplitFilter,
  createZoomBlurFilter,
  createAdvancedBloomFilter,
  createAdjustmentFilter,
} from './pixiFilterPresets';
import { TILE_ACCENTS } from '../blastTileVisuals';
import type { BlastTileType } from '../types';

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

// ─── Typed clear bursts (Phase 4 jelly) ────────────────────────────────

const MAX_CONCURRENT_PARTICLES = 64;
let liveParticles: Graphics[] = [];

function reducedMotionLocal(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function parseRgbaToHex(rgba: string): number {
  const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return 0xffffff;
  return (parseInt(m[1], 10) << 16) | (parseInt(m[2], 10) << 8) | parseInt(m[3], 10);
}

function evictParticles(): void {
  while (liveParticles.length > MAX_CONCURRENT_PARTICLES) {
    const oldest = liveParticles.shift();
    try { oldest?.destroy(); } catch { /* */ }
  }
}

export interface BurstHandle {
  particleCount: number;
  hasShockwave: boolean;
}

/**
 * Spawn a per-type particle burst at (x, y). Combo >= 3 doubles particle
 * count and adds a shockwave ring. Reduced-motion → no-op.
 * Particles are FIFO-evicted at MAX_CONCURRENT_PARTICLES to bound memory.
 */
export function spawnTypedBurst(
  stage: Container,
  type: BlastTileType,
  x: number,
  y: number,
  combo: number,
): BurstHandle {
  if (reducedMotionLocal()) return { particleCount: 0, hasShockwave: false };
  const accents = TILE_ACCENTS[type] ?? TILE_ACCENTS.standard;
  const colourHex = parseRgbaToHex(accents.rimDark);
  const count = combo >= 3 ? 16 : 8;

  for (let i = 0; i < count; i++) {
    const p = new Graphics().circle(0, 0, 3 + Math.random() * 2).fill({ color: colourHex });
    p.x = x; p.y = y;
    try { stage.addChild(p); } catch { /* stage destroyed */ continue; }
    liveParticles.push(p);
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const speed = 60 + Math.random() * 60;
    gsap.to(p, {
      x: x + Math.cos(angle) * speed,
      y: y + Math.sin(angle) * speed,
      alpha: 0,
      duration: 0.6,
      ease: 'power2.out',
      onComplete: () => {
        try { p.destroy(); } catch { /* */ }
        liveParticles = liveParticles.filter((q) => q !== p);
      },
    });
  }
  evictParticles();

  const hasShockwave = combo >= 3;
  if (hasShockwave) {
    const ring = new Graphics().circle(0, 0, 8).stroke({ width: 3, color: colourHex, alpha: 0.7 });
    ring.x = x; ring.y = y;
    try { stage.addChild(ring); } catch { return { particleCount: count, hasShockwave: true }; }
    gsap.to(ring.scale, { x: 6, y: 6, duration: 0.4, ease: 'power2.out' });
    gsap.to(ring, {
      alpha: 0,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => { try { ring.destroy(); } catch { /* */ } },
    });
  }

  return { particleCount: count, hasShockwave };
}
