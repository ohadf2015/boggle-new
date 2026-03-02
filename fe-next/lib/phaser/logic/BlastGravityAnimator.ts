/**
 * BlastGravityAnimator — pure tween parameter calculator for gravity animations.
 *
 * Zero Phaser dependencies. Returns plain objects describing tween configs
 * that GravityController feeds to scene.tweens.add().
 *
 * Candy Crush-style timing: non-linear fall durations that feel like real weight.
 * Timing constants sourced from BLAST_ANIM in useBlastCascade.ts for appear phase.
 */

import { BLAST_ANIM } from '@/components/blast/hooks/useBlastCascade';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FallTweenParams {
  /** Total fall duration in ms */
  duration: number;
  /** Phaser ease string */
  ease: string;
  /** Vertical pixel offset to move the tile (positive = downward) */
  targetDeltaY: number;
}

export interface BounceParams {
  /** Number of bounce iterations on landing */
  bounceCount: number;
  /** Energy damping per bounce (0‥1, e.g. 0.6 = lose 40% each bounce) */
  damping: number;
  /** ScaleY compression on landing impact (< 1) */
  squashScale: number;
  /** ScaleY overshoot after bounce (> 1) */
  stretchScale: number;
}

export interface AppearParams {
  /** Starting Y offset relative to final position (negative = above grid) */
  startYOffset: number;
  /** Appear tween duration in ms */
  duration: number;
  /** Phaser ease string */
  ease: string;
  /** Stagger delay in ms before this tile starts appearing */
  delay: number;
}

// ─── Gap ratio matching GridGeometry ─────────────────────────────────────────

const GAP_RATIO = 0.08;

// ─── Candy Crush fall duration lookup ────────────────────────────────────────
// Non-linear: starts slow, diminishing returns per row (like real gravity)
const FALL_DURATION_MAP: Record<number, number> = {
  1: 180,
  2: 280,
  3: 350,
  4: 400,
};
const FALL_DURATION_MAX = 430; // 5+ rows

// ─── Candy Crush landing squash values ──────────────────────────────────────
// scaleY compression on landing — deeper for longer falls
const SQUASH_MAP: Record<number, number> = {
  1: 0.88,
  2: 0.82,
};
const SQUASH_HEAVY = 0.75; // 3+ rows

// ─── Column stagger ─────────────────────────────────────────────────────────
export const COLUMN_STAGGER_MS = 30;

// ─── Bounce ─────────────────────────────────────────────────────────────────
export const BOUNCE_DURATION = 350;
export const BOUNCE_EASE = 'Elastic.easeOut';

// ─── Grid settle ────────────────────────────────────────────────────────────
export const GRID_SETTLE_SCALE_Y = 0.98;
export const GRID_SETTLE_DURATION = 100;

// ─── Motion stretch during fall ─────────────────────────────────────────────
export const MOTION_STRETCH_SCALE_Y = 1.05;
export const MOTION_STRETCH_SCALE_X = 0.97;

// ─── Compression wave ───────────────────────────────────────────────────────
export const COMPRESSION_SCALE_Y = 0.95;
export const COMPRESSION_DURATION = 80;
export const COMPRESSION_THRESHOLD = 3; // min fall distance to trigger

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get Candy Crush-style fall duration for a given distance.
 * Non-linear: 180/280/350/400/430ms for 1/2/3/4/5+ rows.
 */
export function getCandyCrushFallDuration(fallDistance: number): number {
  if (fallDistance <= 0) return 0;
  return FALL_DURATION_MAP[fallDistance] ?? FALL_DURATION_MAX;
}

/**
 * Get landing squash scaleY for a given fall distance.
 * 0.88 (1 row), 0.82 (2 rows), 0.75 (3+ rows).
 */
export function getLandingSquashScale(fallDistance: number): number {
  if (fallDistance <= 0) return 1;
  return SQUASH_MAP[fallDistance] ?? SQUASH_HEAVY;
}

/**
 * Calculate fall tween parameters for a tile dropping `fallDistance` rows.
 * Uses Candy Crush-style non-linear duration curve.
 */
export function calcFallTweenParams(fallDistance: number, tileSize: number): FallTweenParams {
  if (fallDistance === 0) {
    return { duration: 0, ease: 'Cubic.easeIn', targetDeltaY: 0 };
  }

  const gap = tileSize * GAP_RATIO;
  const targetDeltaY = fallDistance * (tileSize + gap);
  const duration = getCandyCrushFallDuration(fallDistance);

  return { duration, ease: 'Cubic.easeIn', targetDeltaY };
}

/**
 * Calculate bounce parameters for landing impact after a fall.
 * Longer falls produce more bounces and deeper squash.
 */
export function calcBounceParams(fallDistance: number): BounceParams {
  if (fallDistance === 0) {
    return { bounceCount: 0, damping: 0, squashScale: 1, stretchScale: 1 };
  }

  const bounceCount = Math.min(1 + Math.floor(fallDistance / 2), 3);
  const damping = 0.6;
  const squashScale = getLandingSquashScale(fallDistance);
  const stretchScale = Math.min(1.15, 1.05 + fallDistance * 0.02);

  return { bounceCount, damping, squashScale, stretchScale };
}

/**
 * Calculate appear tween parameters for a new tile spawning above the grid.
 * New tiles spawn 1 tileSize above final position and fall with Cubic.easeIn.
 */
export function calcAppearParams(spawnIndex: number, tileSize: number): AppearParams {
  const startYOffset = -tileSize;
  const duration = getCandyCrushFallDuration(1); // 1-row fall equivalent
  const delay = BLAST_ANIM.appear.stagger * spawnIndex;

  return { startYOffset, duration, ease: 'Cubic.easeIn', delay };
}
