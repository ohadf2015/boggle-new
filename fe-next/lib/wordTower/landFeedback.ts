/**
 * Word Tower — event-driven land / success feedback (pure).
 *
 * Bundles drop-land juice (compression, punch, shake, rings, particles) and
 * success celebration (sparkles, glow) into one quality-scaled packet so the
 * Pixi scene and DOM crane stay in lockstep. Reduced-motion collapses every
 * continuous motion param to a static zero while leaving ringScale = 1 so
 * layout math never needs a second code path.
 *
 * Cosmetic only — never feeds placement verdict or height scoring.
 */

import { dropQualityIntensity, type PlacementQuality } from './cranePlacement';

export interface LandFeedback {
  /** Whole-tower compression intensity (0..1) for {@link impactDipPx}. */
  impactIntensity: number;
  /** Zoom-punch intensity (0..1) — success beats only. */
  punchIntensity: number;
  /** Screen-shake amplitude (px). */
  shakePx: number;
  /** Land dust / star particle count. */
  particles: number;
  /** Impact-ring scale multiplier (≥1). */
  ringScale: number;
  /** Show release celebration burst at all. */
  celebrate: boolean;
  /** Sparkle particles on a clean release. */
  sparkles: number;
  /** Bright girder glow (perfect only). */
  glow: boolean;
  /** Full-screen flash intensity for the quality colour wash. */
  flashIntensity: number;
  /** Full-screen flash colour (hex number). */
  flashColor: number;
  /** Impact ring colour (hex number). */
  ringColor: number;
  /** Extra debris / shard particles for sloppy/miss drops. */
  debris: number;
  /** One-off wobble impulse intensity (0..1), render-only. */
  wobbleImpulse: number;
  /** Celebration tier label used by the crane UI. */
  celebrateTier: 'none' | 'pop' | 'big';
}

const STATIC: LandFeedback = {
  impactIntensity: 0,
  punchIntensity: 0,
  shakePx: 0,
  particles: 0,
  ringScale: 1,
  celebrate: false,
  sparkles: 0,
  glow: false,
  flashIntensity: 0,
  flashColor: 0x000000,
  ringColor: 0x00ffff,
  debris: 0,
  wobbleImpulse: 0,
  celebrateTier: 'none',
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export interface LandFeedbackOpts {
  /** How many floors below the crane the block fell (deeper = heavier land). */
  depthFloors?: number;
  /** When true, every continuous motion param is zeroed (layout stays usable). */
  reducedMotion?: boolean;
}

/**
 * Land + success feedback for a placement quality band.
 * Perfect: crisp impact + full success punch/glow. Miss: hardest thud, no celebrate.
 */
export function landFeedback(
  quality: PlacementQuality,
  opts: LandFeedbackOpts = {},
): LandFeedback {
  if (opts.reducedMotion) return { ...STATIC };

  const depth = Math.max(0, opts.depthFloors ?? 0);
  const physical = dropQualityIntensity(quality);

  switch (quality) {
    case 'perfect':
      // Bloxx "nailed it" — solid compress + full punch/glow (not a soft tick).
      return {
        impactIntensity: 0.48,
        punchIntensity: 1,
        shakePx: clamp(10 + depth * 0.4, 10, 15),
        particles: clamp(22 + depth * 2, 22, 40),
        ringScale: 2.0,
        celebrate: true,
        sparkles: 22,
        glow: true,
        flashIntensity: 0.5,
        flashColor: 0xbfff00,
        ringColor: 0xbfff00,
        debris: 0,
        wobbleImpulse: 0,
        celebrateTier: 'big',
      };
    case 'good':
      return {
        impactIntensity: Math.max(physical, 0.55),
        punchIntensity: 0.4,
        shakePx: clamp(5 + depth * 0.3, 5, 11),
        particles: clamp(14 + depth, 14, 30),
        ringScale: 1.6,
        celebrate: true,
        sparkles: 10,
        glow: false,
        flashIntensity: 0.28,
        flashColor: 0x22d3ee,
        ringColor: 0x22d3ee,
        debris: 0,
        wobbleImpulse: 0,
        celebrateTier: 'pop',
      };
    case 'sloppy':
      return {
        impactIntensity: Math.max(physical, 0.78),
        punchIntensity: 0,
        shakePx: clamp(7 + depth * 0.35, 7, 13),
        particles: clamp(12 + depth * 0.6, 12, 24),
        ringScale: 1.35,
        celebrate: false,
        sparkles: 0,
        glow: false,
        flashIntensity: 0.2,
        flashColor: 0xffe135,
        ringColor: 0xffa500,
        debris: clamp(4 + Math.floor(depth * 0.3), 4, 10),
        wobbleImpulse: 0.55,
        celebrateTier: 'none',
      };
    default:
      return {
        impactIntensity: 1,
        punchIntensity: -0.6,
        shakePx: clamp(11 + depth * 0.45, 11, 16),
        particles: clamp(10 + depth * 0.5, 10, 20),
        ringScale: 1.2,
        celebrate: false,
        sparkles: 0,
        glow: false,
        flashIntensity: 0.32,
        flashColor: 0xff3366,
        ringColor: 0xff2200,
        debris: clamp(8 + Math.floor(depth * 0.5), 8, 16),
        wobbleImpulse: 0.85,
        celebrateTier: 'none',
      };
  }
}
