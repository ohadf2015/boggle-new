/**
 * Boss Constraints — Rules imposed on boss rounds (every 3rd round).
 *
 * Constraints modify scoring or grid behavior during a boss fight.
 * The scoring engine checks active constraints before calculating scores.
 */

import type { BossConstraintDef } from '@/types/wordForge';

export const BOSS_CONSTRAINTS: BossConstraintDef[] = [
  // Letter Constraints
  { id: 'censor', name: 'The Censor', descriptionKey: 'wordForge.boss.censor', icon: '🤐' },
  { id: 'abbreviator', name: 'The Abbreviator', descriptionKey: 'wordForge.boss.abbreviator', icon: '✂️' },
  { id: 'purist', name: 'The Purist', descriptionKey: 'wordForge.boss.purist', icon: '🎩' },
  { id: 'banisher', name: 'The Banisher', descriptionKey: 'wordForge.boss.banisher', icon: '🚫' },
  // Grid Constraints
  { id: 'fog', name: 'The Fog', descriptionKey: 'wordForge.boss.fog', icon: '🌫️' },
  { id: 'rot', name: 'The Rot', descriptionKey: 'wordForge.boss.rot', icon: '🦠' },
  { id: 'shuffle', name: 'The Shuffle', descriptionKey: 'wordForge.boss.shuffle', icon: '🔀' },
  { id: 'shrink', name: 'The Shrink', descriptionKey: 'wordForge.boss.shrink', icon: '🔍' },
  // Scoring Constraints
  { id: 'wall', name: 'The Wall', descriptionKey: 'wordForge.boss.wall', icon: '🧱' },
  { id: 'clock', name: 'The Clock', descriptionKey: 'wordForge.boss.clock', icon: '⏳' },
  { id: 'thief', name: 'The Thief', descriptionKey: 'wordForge.boss.thief', icon: '🦝' },
  { id: 'escalator', name: 'The Escalator', descriptionKey: 'wordForge.boss.escalator', icon: '📈' },
  // Rune Constraints
  { id: 'nullifier', name: 'The Nullifier', descriptionKey: 'wordForge.boss.nullifier', icon: '🚷' },
  { id: 'inverter', name: 'The Inverter', descriptionKey: 'wordForge.boss.inverter', icon: '🔄' },
  { id: 'theMirror', name: 'The Mirror', descriptionKey: 'wordForge.boss.theMirror', icon: '🪞' },
];

// Latin vowels + Hebrew matres lectionis (א ה ו י) so the "censor" boss still
// bites in Hebrew instead of being a silent no-op against Hebrew letters.
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'א', 'ה', 'ו', 'י']);

/**
 * Check if a word is valid under a boss constraint.
 * Returns true if the word is allowed, false if rejected.
 */
export function isWordAllowedByConstraint(
  constraintId: string,
  word: string,
): boolean {
  switch (constraintId) {
    case 'abbreviator':
      return word.length <= 4;
    case 'purist':
      return word.length >= 6;
    default:
      return true; // Most constraints modify scoring, not validity
  }
}

/**
 * Apply boss constraint score modifiers.
 * Called after base scoring to apply constraint effects.
 */
export function applyConstraintToScore(
  constraintId: string,
  baseScore: number,
  word: string,
  _wordsThisRound: string[],
): number {
  switch (constraintId) {
    case 'censor': {
      // Vowels worth 0 — already handled by removing vowel points from base
      // But we need to subtract vowel contributions from base points
      const vowelPoints = word.toUpperCase().split('')
        .filter(ch => VOWELS.has(ch))
        .length; // Each vowel is 1 point in Scrabble
      return Math.max(0, baseScore - vowelPoints);
    }
    case 'wall':
      // Target is 2× — handled by run manager, not score modifier
      return baseScore;
    case 'thief':
      return Math.max(0, baseScore - 5);
    case 'escalator': {
      // Target increases by 5% per word — handled by run manager
      return baseScore;
    }
    default:
      return baseScore;
  }
}

/** Pick a boss constraint using run seed for per-run randomness (HIGH-3) */
export function pickBossConstraint(round: number, runSeed: number = 0): BossConstraintDef {
  const index = Math.abs((runSeed + round * 7)) % BOSS_CONSTRAINTS.length;
  return BOSS_CONSTRAINTS[index];
}

/** Get timer duration under a constraint (default 60s) */
export function getConstraintTimerDuration(constraintId: string | null): number {
  if (constraintId === 'clock') return 30;
  return 60;
}

/** Get grid size under a constraint (default 5) */
export function getConstraintGridSize(constraintId: string | null): number {
  if (constraintId === 'shrink') return 4;
  return 5;
}

/** Get target multiplier under a constraint */
export function getConstraintTargetMultiplier(constraintId: string | null): number {
  if (constraintId === 'wall') return 2;
  return 1;
}
