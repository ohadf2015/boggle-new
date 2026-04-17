/**
 * Hunt Mode Utilities
 *
 * Wordle-style letter feedback computation and target word selection
 * for adventure hunt archetype levels.
 */

import type { LetterFeedback } from '@/shared/types/game';

/**
 * Compute Wordle-style feedback for a guess against a target word.
 * Two-pass algorithm:
 *  1. Mark exact positional matches (correct/green)
 *  2. Mark remaining letters present elsewhere (present/yellow), respecting frequency
 */
export function computeLetterFeedback(
  guess: string,
  target: string,
): LetterFeedback[] {
  const g = guess.toUpperCase();
  const t = target.toUpperCase();
  const len = Math.min(g.length, t.length);
  const feedback: LetterFeedback[] = new Array(len).fill('absent');

  // Track remaining unmatched target letters (for frequency-aware "present")
  const remaining = new Map<string, number>();
  for (let i = 0; i < len; i++) {
    remaining.set(t[i], (remaining.get(t[i]) ?? 0) + 1);
  }

  // Pass 1: exact matches
  for (let i = 0; i < len; i++) {
    if (g[i] === t[i]) {
      feedback[i] = 'correct';
      remaining.set(t[i], remaining.get(t[i])! - 1);
    }
  }

  // Pass 2: present but wrong position
  for (let i = 0; i < len; i++) {
    if (feedback[i] === 'correct') continue;
    const count = remaining.get(g[i]);
    if (count != null && count > 0) {
      feedback[i] = 'present';
      remaining.set(g[i], count - 1);
    }
  }

  return feedback;
}

/** Damage dealt per wrong hunt guess */
export const HUNT_WRONG_GUESS_DAMAGE = 15;

/** Max attempts before auto-fail (0 = unlimited) */
export const HUNT_MAX_ATTEMPTS = 7;

/**
 * Hunt-mode starting HP scaled by world difficulty bucket.
 *   EASY   (worlds 1-3, world=0 endless base) → 120 HP (8 wrong guesses)
 *   MEDIUM (worlds 4-6)                       → 100 HP (~6 wrong guesses)
 *   HARD   (worlds 7-10)                      →  75 HP (5 wrong guesses)
 * Matches `getDifficultyForWorld` buckets so hunt tension scales with world.
 */
export function getHuntLifePoints(world: number): number {
  if (world === 0 || world <= 3) return 120;
  if (world <= 6) return 100;
  return 75;
}

/**
 * Pick a target word from the solved word set.
 * Prefers words of length 4-6 for good gameplay.
 * Returns null if no suitable words found.
 */
export function pickHuntTarget(
  solvedWords: Set<string>,
  preferredMinLen = 4,
  preferredMaxLen = 6,
): string | null {
  if (solvedWords.size === 0) return null;

  // Filter to preferred length range
  const candidates: string[] = [];
  const fallbacks: string[] = [];

  for (const word of solvedWords) {
    if (word.length >= preferredMinLen && word.length <= preferredMaxLen) {
      candidates.push(word);
    } else if (word.length >= 3) {
      fallbacks.push(word);
    }
  }

  const pool = candidates.length > 0 ? candidates : fallbacks;
  if (pool.length === 0) return null;

  // Random pick
  return pool[Math.floor(Math.random() * pool.length)].toUpperCase();
}
