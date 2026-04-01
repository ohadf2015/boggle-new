/**
 * Blast Mode Color Tokens
 *
 * Centralized color constants for all blast mode visual effects.
 * These are game-specific effect colors that don't map to neo design tokens.
 */

/* ------------------------------------------------------------------ */
/*  Shatter / Particle Colors (per tile type)                          */
/* ------------------------------------------------------------------ */

/** Rainbow debris colors for prism cross effect (7 distinct rainbow hues) */
export const RAINBOW_DEBRIS_COLORS: string[] = [
  '#FF0000', '#FF8800', '#FFFF00', '#00FF00', '#0088FF', '#8800FF', '#FF00FF',
];

/** Particle colors used by BlastShatterEffect for each tile type */
export const SHATTER_COLORS: Record<string, string[]> = {
  gold: ['#FFD700', '#FFA500', '#FFEC8B'],
  bomb: ['#FF4444', '#CC0000', '#FF6B35'],
  rainbow: ['#FF1493', '#00FFFF', '#FFE135', '#7FFF00', '#A855F7'],
  ice: ['#B4E6FF', '#82C8FF', '#E0F4FF'],
  lightning: ['#FFFF00', '#FFE100', '#00BFFF'],
  prism: ['#FF69B4', '#A855F7', '#00BFFF', '#FFD700'],
  gem: ['#50C878', '#009450', '#7FFFD4'],
  frozen: ['#C8DCFF', '#A0C8F0', '#E8F0FF'],
  magnet: ['#8B00FF', '#FF0040', '#DA70D6'],
  mirror: ['#E0E0FF', '#8888FF', '#C0C0FF'],
  silver: ['#E8E8E8', '#B0B0B0', '#D4D4D4'],
  diamond: ['#B9F2FF', '#00CED1', '#E0FFFF'],
  standard: ['#FFFFFF', '#E0E0E0', '#C0C0C0'],
};

/* ------------------------------------------------------------------ */
/*  Explosion Colors (per explosion type)                              */
/* ------------------------------------------------------------------ */

/** Color per explosion type used by BlastExplosionLayer */
export const EXPLOSION_COLORS: Record<string, string> = {
  bomb: '#FF4444',
  clear: '#FFD700',
  word: '#00FFFF',
  cascade: '#FF00FF',
  lightning: '#FFFF00',
  magnet: '#8B00FF',
  prism: '#FF69B4',
  gem: '#50C878',
  combo: '#FF6B35',
  mega_blast: '#FF1493',
  total_destruction: '#FFE135',
};

/* ------------------------------------------------------------------ */
/*  Score Colors (threshold-based)                                     */
/* ------------------------------------------------------------------ */

/** Score color tiers — checked in order, first match wins */
export const SCORE_COLORS: { min: number; color: string }[] = [
  { min: 30, color: '#FF1493' },
  { min: 20, color: '#FF6B35' },
  { min: 10, color: '#FFD700' },
  { min: 5, color: '#00FFFF' },
  { min: 0, color: '#FFFFFF' },
];

/** Get color for a score value based on SCORE_COLORS thresholds */
export function getScoreColor(score: number): string {
  for (const tier of SCORE_COLORS) {
    if (score >= tier.min) return tier.color;
  }
  return '#FFFFFF';
}

/* ------------------------------------------------------------------ */
/*  Background Colors (reactive background)                            */
/* ------------------------------------------------------------------ */

/** Nebula glow colors by intensity level (0-5) */
export const NEBULA_COLORS: Record<number, string> = {
  0: '#0a0a2e',
  1: '#2d1b69',
  2: '#3b1f8e',
  3: '#5b2d9e',
  4: '#c2185b',
  5: '#e91e7a',
};

/** Ambient particle colors for reactive background */
export const BACKGROUND_PARTICLE_COLORS = ['#00FFFF', '#FF1493', '#FFE135', '#7CFC00'];

/* ------------------------------------------------------------------ */
/*  Chain Glow Colors (cascade overlay)                                */
/* ------------------------------------------------------------------ */

/** Glow color per chain level (0 = none, 1+ = increasingly intense) */
export const CHAIN_GLOW_COLORS: Record<number, string> = {
  0: 'none',
  1: '#FFD700',
  2: '#FF6B35',
  3: '#FF1493',
};
