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

import type { gsap as GsapModule } from 'gsap';

type Gsap = typeof GsapModule;
type Timeline = ReturnType<Gsap['timeline']>;

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
