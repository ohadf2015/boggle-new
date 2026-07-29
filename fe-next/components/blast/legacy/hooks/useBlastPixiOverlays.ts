'use client';
'use no memo'; // Disable React Compiler memoization — PixiJS camera mutations incompatible with compiler immutability rules

// useBlastPixiOverlays — owns the Pixi v8 overlay pipeline for BlastEffectsCanvas:
//   • Bloom + Shockwave camera filters (allocated once per camera mount)
//   • Cross-flash highlight on prism activation
//   • Combo pulse rings with per-ring rAF tracking
//
// All teardown paths guard `camera.destroyed` because Pixi v8 throws when
// touching `.filters` / `removeChild` on a destroyed Container, but Graphics
// instances must still be `.destroy()`'d to release GPU buffers.

import { useCallback, useEffect, useRef } from 'react';
import { Graphics, type Container } from 'pixi.js';
import { BloomFilter, ShockwaveFilter } from 'pixi-filters';
import { createGlowFilter } from '../effects/pixiFilterPresets';
import { computePulseRingFrame, pulseRingTierColor } from '../effects/pulseRingCurve';
import { isReducedMotionPreferred } from '@/utils/accessibility';

// Concurrency caps per FX category. Bounds GPU buffer + filter churn when
// multiple opponents clear simultaneously in MP. Hitting the cap drops the
// excess spawn — already-running FX finish normally. Numbers chosen to keep
// mobile GPUs comfortable while still reading as "a lot happened".
const MAX_PULSE_RINGS = 8;
const MAX_STAR_BURSTS = 8;
const MAX_AFTERGLOWS = 20;
const MAX_LIGHT_SWEEPS = 4;

interface UseBlastPixiOverlaysParams {
  camera: Container;
  width: number;
  height: number;
  gridSize: number;
  cellSize: number;
  chainLevel: number;
}

export function useBlastPixiOverlays({
  camera,
  width,
  height,
  gridSize,
  cellSize,
  chainLevel,
}: UseBlastPixiOverlaysParams) {
  const bloomRef = useRef<InstanceType<typeof BloomFilter> | null>(null);
  const shockwaveRef = useRef<InstanceType<typeof ShockwaveFilter> | null>(null);
  const shockwaveRafRef = useRef<number>(0);
  const crossFlashRef = useRef<Graphics | null>(null);
  const crossFlashRafRef = useRef<number>(0);
  // Map ring → its current rAF id. Replaces the prior Set<number> + delete-then-add
  // dance: each ring owns one frame at a time, so unmount cleanup just iterates.
  const pulseRingsRef = useRef<Map<Graphics, number>>(new Map());
  // Star bursts — radial glowing beams, same tracking contract as pulseRings.
  const starBurstsRef = useRef<Map<Graphics, number>>(new Map());
  // Afterglow residue — fading luminous circles at clear positions.
  const afterglowRef = useRef<Map<Graphics, number>>(new Map());
  // Light sweep — horizontal bar that sweeps vertically on big clears.
  const lightSweepRef = useRef<Map<Graphics, number>>(new Map());

  // ─── Bloom + Shockwave allocation ──────────────────────────────────────
  // Single `camera.filters = [...]` assignment avoids spread churn on re-render.
  useEffect(() => {
    const bloom = new BloomFilter({ strength: 2, quality: 4 });
    bloom.enabled = false;
    bloomRef.current = bloom;

    const sw = new ShockwaveFilter({
      center: { x: 0, y: 0 }, // lazily updated in fireShockwave
      radius: -1,
      speed: 300,
      amplitude: 20,
      wavelength: 120,
    });
    sw.enabled = false;
    shockwaveRef.current = sw;

    const prev = Array.isArray(camera.filters) ? camera.filters : [];
    /* eslint-disable react-hooks/immutability */
    camera.filters = [...prev, bloom, sw];
    return () => {
      cancelAnimationFrame(shockwaveRafRef.current);
      // Skip filter strip if camera was already destroyed — accessing
      // `.filters` on a destroyed Container throws in Pixi v8.
      if (!camera.destroyed) {
        const filters = Array.isArray(camera.filters) ? camera.filters : [];
        camera.filters = filters.filter(f => f !== bloom && f !== sw);
      }
      /* eslint-enable react-hooks/immutability */
      bloom.destroy();
      sw.destroy();
      bloomRef.current = null;
      shockwaveRef.current = null;
    };
  }, [camera]);

  // ─── Cross flash + pulse rings unmount cleanup ─────────────────────────
  useEffect(() => {
    const cameraRef = camera;
    const pulseRings = pulseRingsRef.current;
    const starBursts = starBurstsRef.current;
    const afterglows = afterglowRef.current;
    const lightSweeps = lightSweepRef.current;
    return () => {
      cancelAnimationFrame(crossFlashRafRef.current);
      const cameraAlive = !cameraRef.destroyed;
      if (crossFlashRef.current) {
        const prev = crossFlashRef.current;
        if (cameraAlive && !prev.destroyed) {
          try { cameraRef.removeChild(prev); } catch { /* */ }
        }
        if (!prev.destroyed) prev.destroy();
        crossFlashRef.current = null;
      }
      // Cleanup helper for all Map<Graphics, rafId> collections
      const cleanupMap = (map: Map<Graphics, number>) => {
        for (const [g, rafId] of map) {
          cancelAnimationFrame(rafId);
          if (g.destroyed) continue;
          if (cameraAlive) {
            try { cameraRef.removeChild(g); } catch { /* */ }
          }
          g.destroy();
        }
        map.clear();
      };
      cleanupMap(pulseRings);
      cleanupMap(starBursts);
      cleanupMap(afterglows);
      cleanupMap(lightSweeps);
    };
  }, [camera]);

  // ─── Bloom intensity follows chain level ───────────────────────────────
  useEffect(() => {
    const bloom = bloomRef.current;
    if (!bloom) return;
    if (chainLevel >= 1) {
      bloom.enabled = true;
      bloom.strength = 2 + chainLevel * 1.5;
    } else {
      bloom.enabled = false;
    }
  }, [chainLevel]);

  // ─── Fire a shockwave from a point ─────────────────────────────────────
  // Mutate center fields in place (no object alloc per call).
  const fireShockwave = useCallback((cx: number, cy: number, amplitude = 20) => {
    const sw = shockwaveRef.current;
    // Pixi v8 `ShockwaveFilter.destroy()` nulls `_center` before the ref clears,
    // so writing `sw.center.x` mid-teardown throws "Cannot set properties of null".
    if (!sw || !sw.center) return;
    // Cancel any in-flight shockwave rAF before reseeding — without this, two
    // concurrent loops race on `sw.time`/`sw.enabled`, so a finished wave can
    // re-enable briefly because the second loop overwrites the first's final tick.
    cancelAnimationFrame(shockwaveRafRef.current);
    sw.center.x = cx;
    sw.center.y = cy;
    sw.time = 0;
    sw.amplitude = amplitude;
    sw.enabled = true;
    const start = performance.now();
    const duration = 600;
    const tick = () => {
      const live = shockwaveRef.current;
      if (!live || !live.center) return;
      const t = Math.min((performance.now() - start) / duration, 1);
      live.time = t;
      if (t < 1) {
        shockwaveRafRef.current = requestAnimationFrame(tick);
      } else {
        live.enabled = false;
      }
    };
    shockwaveRafRef.current = requestAnimationFrame(tick);
  }, []);

  // ─── Cross flash (white lines fading over 300ms) ───────────────────────
  const flashCross = useCallback((cx: number, cy: number) => {
    // Destroy previous cross flash if still animating.
    if (crossFlashRef.current) {
      cancelAnimationFrame(crossFlashRafRef.current);
      const prev = crossFlashRef.current;
      if (!camera.destroyed && !prev.destroyed) {
        try { camera.removeChild(prev); } catch { /* */ }
      }
      if (!prev.destroyed) prev.destroy();
      crossFlashRef.current = null;
    }
    const g = new Graphics();
    const lineLen = gridSize * cellSize;
    g.rect(0, cy - 2, lineLen, 4).fill({ color: 0xffffff });
    g.rect(cx - 2, 0, 4, lineLen).fill({ color: 0xffffff });
    g.alpha = 0.9;
    camera.addChild(g);
    crossFlashRef.current = g;

    const start = performance.now();
    const duration = 300;
    const fade = () => {
      if (camera.destroyed || g.destroyed) {
        crossFlashRef.current = null;
        return;
      }
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / duration, 1);
      g.alpha = 0.9 * (1 - t);
      if (t < 1) {
        crossFlashRafRef.current = requestAnimationFrame(fade);
      } else {
        try { camera.removeChild(g); } catch { /* */ }
        g.destroy();
        crossFlashRef.current = null;
      }
    };
    crossFlashRafRef.current = requestAnimationFrame(fade);
  }, [camera, gridSize, cellSize]);

  // ─── Combo pulse ring — expanding GlowFilter ring, lime→pink→cyan by tier
  // Drawn as a stroked circle scaled by `computePulseRingFrame`. Each ring
  // owns one rAF at a time, tracked in pulseRingsRef Map for cleanup.
  const spawnPulseRing = useCallback((cx: number, cy: number, tier: number) => {
    // Accessibility: honor prefers-reduced-motion. Skip entirely (additive
    // glow bursts can't be safely "toned down" for users who opt out).
    if (isReducedMotionPreferred()) return;
    if (pulseRingsRef.current.size >= MAX_PULSE_RINGS) return;
    const g = new Graphics();
    const baseRadius = Math.min(width, height) * 0.18;
    g.circle(0, 0, baseRadius).stroke({ color: 0xffffff, width: 6, alpha: 1 });
    g.x = cx;
    g.y = cy;
    g.filters = [createGlowFilter(pulseRingTierColor(tier), 3)];
    camera.addChild(g);

    const start = performance.now();
    const duration = 450;
    const step = () => {
      if (camera.destroyed || g.destroyed) {
        pulseRingsRef.current.delete(g);
        return;
      }
      const frame = computePulseRingFrame((performance.now() - start) / duration);
      g.scale.set(frame.scale);
      g.alpha = frame.alpha;
      if (frame.done) {
        try { camera.removeChild(g); } catch { /* */ }
        g.destroy();
        pulseRingsRef.current.delete(g);
        return;
      }
      pulseRingsRef.current.set(g, requestAnimationFrame(step));
    };
    pulseRingsRef.current.set(g, requestAnimationFrame(step));
  }, [camera, width, height]);

  // ─── Star burst — radial glowing beams that scale + fade + rotate ──────
  // Distinct from pulseRing (stroked circle) and shockwave (post-fx filter):
  // this draws N line segments fanning out from the origin, glow-filtered for
  // bloom kick. Great for "beam pop" moments on prism/rainbow/catalyst clears.
  const spawnStarBurst = useCallback((cx: number, cy: number, color = 0xffffff, points = 8) => {
    if (isReducedMotionPreferred()) return;
    if (starBurstsRef.current.size >= MAX_STAR_BURSTS) return;
    const g = new Graphics();
    const radius = Math.min(width, height) * 0.22;
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      g.moveTo(0, 0).lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
        .stroke({ color, width: 4, alpha: 1 });
    }
    g.x = cx;
    g.y = cy;
    g.filters = [createGlowFilter(color, 3)];
    camera.addChild(g);

    const start = performance.now();
    const duration = 420;
    const tick = () => {
      if (camera.destroyed || g.destroyed) {
        starBurstsRef.current.delete(g);
        return;
      }
      const t = Math.min((performance.now() - start) / duration, 1);
      g.scale.set(0.25 + t * 1.25);
      g.alpha = 1 - t;
      g.rotation = t * 0.6;
      if (t >= 1) {
        try { camera.removeChild(g); } catch { /* */ }
        g.destroy();
        starBurstsRef.current.delete(g);
        return;
      }
      starBurstsRef.current.set(g, requestAnimationFrame(tick));
    };
    starBurstsRef.current.set(g, requestAnimationFrame(tick));
  }, [camera, width, height]);

  // ─── Afterglow residue — soft luminous halo that lingers at clear positions
  // Drawn as a filled circle with low alpha, fading over 800ms. Creates a warm
  // "heat map" effect where recent clears leave visible traces on the board.
  const spawnAfterglow = useCallback((cx: number, cy: number, color = 0xbfff00) => {
    if (isReducedMotionPreferred()) return;
    if (afterglowRef.current.size >= MAX_AFTERGLOWS) return;
    const g = new Graphics();
    const radius = cellSize * 0.6;
    g.circle(0, 0, radius).fill({ color, alpha: 0.35 });
    g.x = cx;
    g.y = cy;
    g.filters = [createGlowFilter(color, 2)];
    camera.addChild(g);

    const start = performance.now();
    const duration = 800;
    const tick = () => {
      if (camera.destroyed || g.destroyed) {
        afterglowRef.current.delete(g);
        return;
      }
      const t = Math.min((performance.now() - start) / duration, 1);
      g.alpha = 0.35 * (1 - t * t); // quadratic fade
      g.scale.set(1 + t * 0.4); // gentle expand
      if (t >= 1) {
        try { camera.removeChild(g); } catch { /* */ }
        g.destroy();
        afterglowRef.current.delete(g);
        return;
      }
      afterglowRef.current.set(g, requestAnimationFrame(tick));
    };
    afterglowRef.current.set(g, requestAnimationFrame(tick));
  }, [camera, cellSize]);

  // ─── Light sweep — horizontal luminous bar sweeping vertically on big clears
  // A full-width white bar slides from top to bottom over 500ms, creating a
  // cinematic "cleansing" effect. Used on wave clears and chain≥5.
  const spawnLightSweep = useCallback(() => {
    if (isReducedMotionPreferred()) return;
    if (lightSweepRef.current.size >= MAX_LIGHT_SWEEPS) return;
    const g = new Graphics();
    const barHeight = 6;
    g.rect(0, -barHeight / 2, width, barHeight).fill({ color: 0xffffff, alpha: 0.7 });
    g.y = -barHeight;
    g.filters = [createGlowFilter(0xffffff, 4)];
    camera.addChild(g);

    const start = performance.now();
    const duration = 500;
    const tick = () => {
      if (camera.destroyed || g.destroyed) {
        lightSweepRef.current.delete(g);
        return;
      }
      const t = Math.min((performance.now() - start) / duration, 1);
      g.y = t * (height + barHeight) - barHeight;
      g.alpha = 0.7 * (1 - t * t);
      if (t >= 1) {
        try { camera.removeChild(g); } catch { /* */ }
        g.destroy();
        lightSweepRef.current.delete(g);
        return;
      }
      lightSweepRef.current.set(g, requestAnimationFrame(tick));
    };
    lightSweepRef.current.set(g, requestAnimationFrame(tick));
  }, [camera, width, height]);

  return { fireShockwave, flashCross, spawnPulseRing, spawnStarBurst, spawnAfterglow, spawnLightSweep };
}
