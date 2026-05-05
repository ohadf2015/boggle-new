/**
 * blastGsapTimelines — GSAP-driven juice timelines layered on top of the
 * existing RAF-based BlastJuiceKit + useBlastPixiOverlays primitives.
 *
 * Pure factories: each accepts an injected `gsap` module + a deps bag of
 * setter callbacks (no Pixi types). Caller wires the setters to whatever
 * filter / shake / camera primitive matches the engine.
 *
 * J1 — cascadePunch: chain depth 1-4 escalation (depth ≥5 is megaPunch upstream)
 * J2 — comboLevelUp: pop-rise-fade animation on a Pixi-text-like target
 * J3 — waveClearShower: 3 staggered confetti bursts via gsap stagger
 * J5 — longWordPunch: word length ≥6 zoom + rgb + shockwave + golden burst
 *
 * All timelines are returned for caller-side .kill() during teardown.
 */

import { gsap, type gsap as GsapModule } from 'gsap';

type Gsap = typeof GsapModule;
type Timeline = ReturnType<Gsap['timeline']>;

const reducedMotionActive = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface IdleBreatheOptions {
  /** Injectable for tests so we can pin the random delay deterministically. */
  random?: () => number;
}

// Re-export for downstream callers that want the type discriminator.
import type { BlastTileType } from '../types';

/**
 * Per-type clear duration (ms). Mirrors the legacy CLEARING_ANIMS transition
 * timings but moved into a programmatic table the GSAP builder can read.
 */
export const JELLY_CLEAR_DURATION_MS: Record<BlastTileType, number> = {
  standard:  180,
  gold:      200,
  bomb:      220,
  lightning: 160,
  prism:     280,
  rainbow:   320,
  ice:       200,
  gem:       240,
  frozen:    240,
  magnet:    300,
  diamond:   220,
  countdown: 200,
  shuffle:   320,
  magma:     260,
  portal:    340,
  catalyst:  220,
  crystal:   260,
  fuse:      220,
  locked:    160,
  key:       180,
  anchor:    180,
};

interface ClearSignature {
  scale: number;
  rotation: number;
  filter: string;
  ease: string;
}

const DEFAULT_SIG: ClearSignature = { scale: 1.6, rotation: 0, filter: 'brightness(2)', ease: 'power2.out' };

const CLEAR_SIGNATURES: Partial<Record<BlastTileType, ClearSignature>> = {
  bomb:      { scale: 2.2,  rotation:  15,  filter: 'brightness(2.5) saturate(2)',          ease: 'power2.out' },
  lightning: { scale: 0.15, rotation:   0,  filter: 'brightness(3) contrast(1.5)',          ease: 'power3.in'  },
  prism:     { scale: 2.0,  rotation: 270,  filter: 'hue-rotate(180deg) brightness(1.8)',   ease: 'power1.out' },
  ice:       { scale: 0.30, rotation:  25,  filter: 'brightness(2) blur(2px)',              ease: 'power2.in'  },
  frozen:    { scale: 0.10, rotation: -45,  filter: 'brightness(1.5) blur(3px)',            ease: 'power2.in'  },
  gem:       { scale: 1.8,  rotation:  90,  filter: 'brightness(2) saturate(3)',            ease: 'back.out(2)' },
  gold:      { scale: 1.6,  rotation: -20,  filter: 'brightness(2.5) saturate(2)',          ease: 'power2.out' },
  rainbow:   { scale: 2.0,  rotation: 540,  filter: 'hue-rotate(360deg) brightness(2)',     ease: 'back.out(2)' },
  magnet:    { scale: 0.05, rotation: 1080, filter: 'brightness(0.3) saturate(3)',          ease: 'power3.in'  },
  diamond:   { scale: 1.9,  rotation:  45,  filter: 'brightness(3) saturate(2)',            ease: 'back.out(2)' },
  countdown: { scale: 2.5,  rotation:  30,  filter: 'brightness(3) saturate(2.5)',          ease: 'power2.out' },
  shuffle:   { scale: 1.4,  rotation: 720,  filter: 'brightness(2) hue-rotate(45deg)',      ease: 'back.out(2)' },
  magma:     { scale: 2.5,  rotation:  45,  filter: 'brightness(3) saturate(2.5)',          ease: 'power2.out' },
  portal:    { scale: 0.01, rotation: 720,  filter: 'brightness(2) blur(2px)',              ease: 'power3.in'  },
  catalyst:  { scale: 2.0,  rotation: -15,  filter: 'brightness(2.5) saturate(2)',          ease: 'power2.out' },
  crystal:   { scale: 1.7,  rotation: 180,  filter: 'brightness(2.2) saturate(2.5) hue-rotate(20deg)', ease: 'back.out(2)' },
  fuse:      { scale: 2.3,  rotation: -20,  filter: 'brightness(2.8) saturate(2.5)',        ease: 'power2.out' },
};

/**
 * Per-type GSAP clear timeline. Replaces the legacy CSS-transform clear
 * (CLEARING_ANIMS in blastTileVisuals.ts) with finer easing + duration
 * control. Reduced-motion shortens duration to base/3.
 */
export function createJellyClearTween(
  el: HTMLElement,
  type: BlastTileType,
): gsap.core.Timeline | null {
  const baseMs = JELLY_CLEAR_DURATION_MS[type] ?? 200;
  const reduced = reducedMotionActive();
  const ms = reduced ? Math.round(baseMs / 3) : baseMs;
  const sig = CLEAR_SIGNATURES[type] ?? DEFAULT_SIG;
  const tl = gsap.timeline();
  tl.to(el, {
    scale: sig.scale,
    rotation: sig.rotation,
    filter: sig.filter,
    duration: ms / 1000,
    ease: sig.ease,
  });
  // Reduced-motion: snap opacity to 0 (no fade tween) so total duration
  // stays within the contracted budget. Otherwise overlap a short fade.
  if (reduced) {
    tl.set(el, { opacity: 0 });
  } else {
    tl.to(el, { opacity: 0, duration: 0.08 }, '>-0.05');
  }
  return tl;
}

export interface CascadeDropOptions {
  /** Starting Y offset in px (negative = above grid). */
  fromY: number;
  /** 0-based column for stagger calculation. */
  columnIndex: number;
}

/**
 * Cascade drop with bounce + parallel squash-stretch settle. Reduced-motion
 * snaps to final position. Manual two-tween recipe (no Club CustomBounce).
 */
export function createCascadeDropTween(
  el: HTMLElement,
  opts: CascadeDropOptions,
): gsap.core.Timeline {
  const tl = gsap.timeline({ delay: opts.columnIndex * 0.04 });
  if (reducedMotionActive()) {
    tl.set(el, { y: 0, scaleX: 1, scaleY: 1 });
    return tl;
  }
  tl.from(el, { y: opts.fromY, duration: 0.55, ease: 'bounce.out' }, 0);
  tl.fromTo(
    el,
    { scaleY: 1.15, scaleX: 0.85 },
    {
      scaleY: 0.7,
      scaleX: 1.15,
      duration: 0.18,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
      transformOrigin: 'center bottom',
    },
    0.4,
  );
  return tl;
}

/**
 * Per-tile idle "breathing" tween — subtle infinite yoyo rotateX/Y with a
 * randomised phase so a grid of tiles never pulses in unison.
 * Returns null under prefers-reduced-motion (caller should skip).
 */
export function createIdleBreatheTween(
  el: HTMLElement,
  opts: IdleBreatheOptions = {},
): gsap.core.Tween | null {
  if (reducedMotionActive()) return null;
  const random = opts.random ?? Math.random;
  return gsap.to(el, {
    rotateX: '+=2',
    rotateY: '+=2',
    duration: 4,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
    delay: random() * 4,
  });
}

// ─── J1 — cascadePunch ────────────────────────────────────────────────────

export interface CascadePunchParams {
  depth: number;
  shake: (intensity: number, duration: number) => void;
  setZoom: (strength: number) => void;
  setRgb: (offset: number) => void;
  setBloom: (scale: number) => void;
  freeze: (duration: number) => void;
  reset: () => void;
}

export function buildCascadePunchTimeline(
  gsap: Gsap,
  params: CascadePunchParams,
): Timeline {
  const tl = gsap.timeline({ onComplete: params.reset });
  const intensity = Math.min(Math.max(params.depth, 1), 5);

  // Always: scaled shake at start
  const shakeAmp = 4 + intensity * 3;
  const shakeDur = 0.18 + intensity * 0.05;
  tl.call(() => params.shake(shakeAmp, shakeDur));

  // Depth ≥2: zoom-blur pulse
  if (intensity >= 2) {
    const zoomMax = 0.05 + intensity * 0.05;
    const zoomBox = { v: 0 };
    tl.fromTo(
      zoomBox,
      { v: zoomMax },
      {
        v: 0,
        duration: 0.25,
        ease: 'power2.out',
        onUpdate: () => params.setZoom(zoomBox.v),
      },
      '<',
    );
  }

  // Depth ≥3: chromatic aberration bloom
  if (intensity >= 3) {
    const rgbBox = { v: 0 };
    tl.fromTo(
      rgbBox,
      { v: 4 + intensity },
      {
        v: 0,
        duration: 0.3,
        ease: 'power3.out',
        onUpdate: () => params.setRgb(rgbBox.v),
      },
      '<',
    );

    const bloomBox = { v: 1 };
    tl.fromTo(
      bloomBox,
      { v: 1.6 + intensity * 0.2 },
      {
        v: 1,
        duration: 0.35,
        ease: 'power2.out',
        onUpdate: () => params.setBloom(bloomBox.v),
      },
      '<',
    );
  }

  // Depth ≥4: hit-stop freeze for "oof" weight
  if (intensity >= 4) {
    tl.call(() => params.freeze(0.06), undefined, '<');
  }

  return tl;
}

// ─── J2 — comboLevelUpBadge ───────────────────────────────────────────────

export interface ComboLevelUpTarget {
  scale: { x: number; y: number };
  alpha: number;
  y: number;
}

export interface ComboLevelUpParams {
  target: ComboLevelUpTarget;
  tier: number;
  /** Distance the badge floats upward in pixels. Default 60. */
  riseDistance?: number;
  onComplete: () => void;
}

export function buildComboLevelUpTimeline(
  gsap: Gsap,
  { target, tier, riseDistance = 60, onComplete }: ComboLevelUpParams,
): Timeline {
  const peakScale = Math.min(1.2 + tier * 0.12, 2.2);
  const startY = target.y;

  const tl = gsap.timeline({ onComplete });

  // Pop in: scale 0 → peak with elastic
  tl.to(target.scale, {
    x: peakScale,
    y: peakScale,
    duration: 0.32,
    ease: 'back.out(2.4)',
  });

  // Settle to 1.0 + drift up while fading
  tl.to(target.scale, {
    x: 1,
    y: 1,
    duration: 0.18,
    ease: 'power2.out',
  });

  tl.to(
    target,
    {
      y: startY - riseDistance,
      alpha: 0,
      duration: 0.6,
      ease: 'power1.in',
    },
    '<',
  );

  return tl;
}

// ─── J3 — waveClearShower ─────────────────────────────────────────────────

export interface WaveClearShowerParams {
  width: number;
  height: number;
  /** Called for each burst with (cx, cy) in canvas coords. */
  burst: (cx: number, cy: number) => void;
  /** Optional: invoked after all 3 bursts settle. */
  onComplete?: () => void;
}

export function buildWaveClearShowerTimeline(
  gsap: Gsap,
  { width, height, burst, onComplete }: WaveClearShowerParams,
): Timeline {
  const tl = gsap.timeline({ onComplete });

  // Burst 1 — center, immediate
  tl.call(() => burst(width / 2, height / 2));

  // Burst 2 — left edge, +0.22s
  tl.call(() => burst(width * 0.18, height * 0.35), undefined, '+=0.22');

  // Burst 3 — right edge, +0.22s
  tl.call(() => burst(width * 0.82, height * 0.35), undefined, '+=0.22');

  // Final tail crescendo at center, +0.3s
  tl.call(() => burst(width / 2, height * 0.28), undefined, '+=0.3');

  return tl;
}

// ─── J5 — longWordPunch ───────────────────────────────────────────────────

export interface LongWordPunchParams {
  length: number;
  origin: { cx: number; cy: number };
  shockwave: (cx: number, cy: number, amplitude: number) => void;
  setZoom: (strength: number) => void;
  setRgb: (offset: number) => void;
  starBurst: (cx: number, cy: number, color: number, points: number) => void;
  reset: () => void;
}

export function buildLongWordPunchTimeline(
  gsap: Gsap,
  params: LongWordPunchParams,
): Timeline | null {
  if (params.length < 6) return null;

  const { length, origin } = params;
  const tl = gsap.timeline({ onComplete: params.reset });

  // Always: shockwave amplitude scaled by length (6→8, 7→11, 8+→14)
  const amp = Math.min(8 + (length - 6) * 3, 14);
  tl.call(() => params.shockwave(origin.cx, origin.cy, amp));

  // Always: zoom-blur pulse
  const zoomBox = { v: 0 };
  tl.fromTo(
    zoomBox,
    { v: 0.18 + (length - 6) * 0.06 },
    {
      v: 0,
      duration: 0.32,
      ease: 'power2.out',
      onUpdate: () => params.setZoom(zoomBox.v),
    },
    '<',
  );

  // Length ≥7: add chromatic aberration
  if (length >= 7) {
    const rgbBox = { v: 0 };
    tl.fromTo(
      rgbBox,
      { v: 6 + (length - 7) * 2 },
      {
        v: 0,
        duration: 0.36,
        ease: 'power3.out',
        onUpdate: () => params.setRgb(rgbBox.v),
      },
      '<',
    );
  }

  // Length ≥8: golden star burst (legendary territory)
  if (length >= 8) {
    tl.call(
      () => params.starBurst(origin.cx, origin.cy, 0xffd700, 14),
      undefined,
      '<+=0.05',
    );
  }

  return tl;
}
