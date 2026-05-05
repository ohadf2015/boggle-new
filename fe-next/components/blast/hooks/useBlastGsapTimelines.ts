'use client';

/**
 * useBlastGsapTimelines — GSAP-driven juice runners on top of existing Pixi
 * overlay primitives. Owns a Set<Timeline> for unmount cleanup, builds
 * per-event transient filter stacks for cascade-punch / long-word-punch /
 * wave-clear-shower, and routes timeline setters to filter mutations.
 *
 * Each runner is no-op when reduced motion is preferred.
 */

import { gsap } from 'gsap';
import { useCallback, useEffect, useRef } from 'react';
import type { Container, Filter } from 'pixi.js';
import {
  buildCascadePunchTimeline,
  buildLongWordPunchTimeline,
  buildWaveClearShowerTimeline,
  createIdleBreatheTween,
} from '../effects/blastGsapTimelines';
import {
  createRGBSplitFilter,
  createZoomBlurFilter,
  createAdvancedBloomFilter,
} from '../effects/pixiFilterPresets';
import { isReducedMotionPreferred } from '@/utils/accessibility';
import type { ParticleConfig } from '@/lib/gameEngine/types';

interface ShakeLike {
  shake: (opts: { intensity: number; duration: number; decay?: 'linear' | 'exponential' }) => void;
}

interface TimeDilationLike {
  freeze: (duration: number) => void;
}

interface ParticlesLike {
  burst: (config: ParticleConfig, x: number, y: number, count?: number) => void;
}

interface UseBlastGsapTimelinesParams {
  camera: Container;
  shake: ShakeLike;
  timeDilation: TimeDilationLike;
  particles: ParticlesLike;
  width: number;
  height: number;
  fireShockwave: (cx: number, cy: number, amplitude?: number) => void;
  spawnStarBurst: (cx: number, cy: number, color?: number, points?: number) => void;
  /** Confetti-style preset to use for wave-clear shower (caller supplies). */
  confettiPreset: ParticleConfig;
}

/** Build a transient filter stack + setters; destroy on cleanup callback.
 *  destroy() is idempotent: timelines can call it via natural onComplete AND
 *  unmount-kill teardown without double-destroying Pixi filter resources. */
function makeTransientFilterStack(camera: Container) {
  const rgb = createRGBSplitFilter(0);
  const zoom = createZoomBlurFilter({ strength: 0, center: [0, 0] });
  const bloom = createAdvancedBloomFilter(1);
  let destroyed = false;

  const apply = (filters: Filter[]) => {
    if (camera.destroyed || destroyed) return;
    camera.filters = filters;
  };

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    if (!camera.destroyed) {
      // PixiJS v8 types disallow null but runtime accepts it — sentinel for "no filters"
      camera.filters = null as unknown as Filter[];
    }
    rgb.destroy();
    zoom.destroy();
    bloom.destroy();
  };

  return {
    rgb,
    zoom,
    bloom,
    apply,
    destroy,
    setRgb: (v: number) => {
      rgb.red = [v, 0];
      rgb.blue = [v === 0 ? 0 : -v, 0];
    },
    setZoom: (v: number, cx?: number, cy?: number) => {
      zoom.strength = v;
      if (cx !== undefined && cy !== undefined) zoom.center = [cx, cy];
    },
    setBloom: (v: number) => {
      bloom.bloomScale = v;
    },
  };
}

export function useBlastGsapTimelines({
  camera,
  shake,
  timeDilation,
  particles,
  width,
  height,
  fireShockwave,
  spawnStarBurst,
  confettiPreset,
}: UseBlastGsapTimelinesParams) {
  // Map timeline → teardown so unmount kills timeline AND runs cleanup
  // (destroy transient filters / badges that GSAP .kill() won't fire).
  const activeTlsRef = useRef<Map<ReturnType<typeof gsap.timeline>, () => void>>(new Map());

  useEffect(() => {
    const tls = activeTlsRef.current;
    return () => {
      tls.forEach((teardown, tl) => {
        try { tl.kill(); } catch { /* */ }
        try { teardown(); } catch { /* */ }
      });
      tls.clear();
    };
  }, []);

  /**
   * Track a timeline for unmount cleanup. Chains the existing onComplete
   * (set via `gsap.timeline({onComplete})`) so per-timeline teardown fires
   * on natural completion AND on unmount-kill.
   */
  const trackTl = useCallback(
    (tl: ReturnType<typeof gsap.timeline>, teardown: () => void = () => {}) => {
      activeTlsRef.current.set(tl, teardown);
      // Preserve existing onComplete (factory-set reset) and chain delete.
      const existing = tl.eventCallback('onComplete') as (() => void) | null;
      tl.eventCallback('onComplete', () => {
        try { existing?.(); } catch { /* */ }
        activeTlsRef.current.delete(tl);
      });
      return tl;
    },
    [],
  );

  // ─── J1 — cascade depth escalation (1-4; ≥5 still routed to megaPunch) ──
  const runCascadePunch = useCallback(
    (depth: number) => {
      if (isReducedMotionPreferred()) return;
      if (depth < 1 || depth > 4 || camera.destroyed) return;

      const stack = makeTransientFilterStack(camera);
      stack.setZoom(0, width / 2, height / 2);
      if (depth >= 2) stack.apply([stack.rgb, stack.zoom, stack.bloom]);

      const tl = buildCascadePunchTimeline(gsap, {
        depth,
        shake: (intensity, duration) =>
          shake.shake({ intensity, duration, decay: 'exponential' }),
        setZoom: (v) => stack.setZoom(v),
        setRgb: (v) => stack.setRgb(v),
        setBloom: (v) => stack.setBloom(v),
        freeze: (d) => timeDilation.freeze(d),
        reset: () => stack.destroy(),
      });

      trackTl(tl, () => stack.destroy());
    },
    [camera, shake, timeDilation, width, height, trackTl],
  );

  // ─── J3 — wave clear staggered shower ───────────────────────────────────
  const runWaveClearShower = useCallback(() => {
    if (isReducedMotionPreferred()) return;
    const tl = buildWaveClearShowerTimeline(gsap, {
      width,
      height,
      burst: (cx, cy) => particles.burst(confettiPreset, cx, cy, 28),
    });
    trackTl(tl);
  }, [particles, width, height, confettiPreset, trackTl]);

  // ─── J5 — long-word zoom-punch + shockwave ─────────────────────────────
  const runLongWordPunch = useCallback(
    (length: number, cx: number, cy: number) => {
      if (isReducedMotionPreferred()) return;
      if (length < 6 || camera.destroyed) return;

      const stack = makeTransientFilterStack(camera);
      stack.setZoom(0, cx, cy);
      stack.apply(length >= 7 ? [stack.rgb, stack.zoom, stack.bloom] : [stack.zoom, stack.bloom]);

      const tl = buildLongWordPunchTimeline(gsap, {
        length,
        origin: { cx, cy },
        shockwave: (x, y, amp) => fireShockwave(x, y, amp),
        setZoom: (v) => stack.setZoom(v, cx, cy),
        setRgb: (v) => stack.setRgb(v),
        starBurst: (x, y, color, points) => spawnStarBurst(x, y, color, points),
        reset: () => stack.destroy(),
      });
      if (tl) trackTl(tl, () => stack.destroy());
      else stack.destroy();
    },
    [camera, fireShockwave, spawnStarBurst, trackTl],
  );

  /**
   * Track an externally-built timeline so it gets killed on unmount and the
   * supplied teardown runs (destroying transient Pixi nodes the timeline
   * targets, since GSAP's .kill() will not fire onComplete).
   */
  const trackTimeline = useCallback(
    (tl: ReturnType<typeof gsap.timeline>, teardown: () => void = () => {}) => {
      return trackTl(tl, teardown);
    },
    [trackTl],
  );

  /**
   * Per-tile candy phase tween. Replaces the inline `transition: all ...`
   * strings in BlastTile with GSAP timelines that compose squash/stretch +
   * elastic settle. Reduced-motion path sets terminal state without animation.
   */
  type PhaseTransitionPhase =
    | 'selected'
    | 'anticipation'
    | 'clearing'
    | 'falling'
    | 'appearing'
    | 'landing';

  const playPhaseTransition = useCallback(
    (
      el: HTMLElement,
      phase: PhaseTransitionPhase,
      opts?: { fallOffset?: number; spawnOffset?: number; clearRotate?: number },
    ) => {
      if (isReducedMotionPreferred()) {
        switch (phase) {
          case 'clearing':
            el.style.opacity = '0';
            el.style.transform = 'scale(0.9)';
            return;
          case 'appearing':
            el.style.opacity = '1';
            el.style.transform = 'translateY(0) scale(1)';
            return;
          case 'falling':
            el.style.transform = 'translateY(0)';
            return;
          default:
            return;
        }
      }
      const tl = gsap.timeline();
      switch (phase) {
        case 'selected':
          tl.to(el, { scale: 1.06, duration: 0.18, ease: 'back.out(2)' });
          break;
        case 'anticipation':
          tl
            .to(el, { scaleX: 1.18, scaleY: 0.82, duration: 0.08, ease: 'power2.out' })
            .to(el, { scaleX: 1, scaleY: 1, duration: 0.10, ease: 'elastic.out(1, 0.4)' });
          break;
        case 'clearing':
          tl
            .to(el, { scaleX: 0.92, scaleY: 1.08, duration: 0.04 })
            .to(el, { scale: 1.4, duration: 0.10, ease: 'back.out(3.5)' })
            .to(el, { rotate: opts?.clearRotate ?? 0, opacity: 0, duration: 0.18 }, '<');
          break;
        case 'falling': {
          const offset = opts?.fallOffset ?? 0;
          tl.fromTo(el, { y: -offset }, { y: 0, duration: 0.55, ease: 'bounce.out' });
          break;
        }
        case 'appearing': {
          const off = opts?.spawnOffset ?? 60;
          tl.fromTo(
            el,
            { y: -off, scale: 0.6, opacity: 0 },
            { y: 0, scale: 1, opacity: 1, duration: 0.32, ease: 'back.out(1.7)' },
          );
          break;
        }
        case 'landing':
          tl
            .to(el, { scaleY: 0.88, duration: 0.06 })
            .to(el, { scaleY: 1, duration: 0.08, ease: 'elastic.out(1.5, 0.5)' });
          break;
      }
      trackTl(tl);
    },
    [trackTl],
  );

  return { runCascadePunch, runLongWordPunch, runWaveClearShower, trackTimeline, playPhaseTransition };
}

/**
 * Mount idle breathing tweens on a set of tile elements with a single
 * IntersectionObserver gating play/pause based on visibility.
 * Returns a cleanup that disconnects the observer + kills tweens.
 *
 * Off-screen pause is critical — 30+ tiles tweening rotateX/Y at 60fps
 * is a real CPU cost on mid Android.
 */
export function mountIdleBreatheForTiles(tiles: HTMLElement[]): () => void {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window) || tiles.length === 0) {
    return () => {};
  }

  const tweens = new Map<HTMLElement, gsap.core.Tween>();
  tiles.forEach((el) => {
    el.style.willChange = 'transform';
    const t = createIdleBreatheTween(el);
    if (t) tweens.set(el, t);
  });

  if (tweens.size === 0) {
    tiles.forEach((el) => { el.style.willChange = ''; });
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const tween = tweens.get(entry.target as HTMLElement);
        if (!tween) return;
        if (entry.isIntersecting) tween.play();
        else tween.pause();
      });
    },
    { threshold: 0.05 },
  );

  tiles.forEach((el) => observer.observe(el));

  return () => {
    observer.disconnect();
    tweens.forEach((t, el) => {
      t.kill();
      el.style.willChange = '';
    });
    tweens.clear();
  };
}
