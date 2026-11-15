/**
 * Floor challenges: every few floors the NEXT word gets a goal with a prize.
 *
 * The climb was one move repeated — spell, drop, spell, drop (player report,
 * Nov 2026: "the gameplay itself still a bit too flat and repeating"). A
 * challenge changes what you are hunting for on one word: a long word, a
 * clean or perfect landing. Meet it and the floor pays a bonus and always drops a crate. Pure, so the run and
 * the HUD read the same rule.
 */
import type { LandingQuality } from '../landing';

export type Challenge =
  | { kind: 'long'; minLen: number }
  | { kind: 'perfect' }
  | { kind: 'good' };

export const CHALLENGE_BONUS = 250;
/** First challenge after this many landed floors, then every CHALLENGE_EVERY. */
export const CHALLENGE_FIRST = 3;
export const CHALLENGE_EVERY = 4;

/** The challenge armed after `landed` floors, or null. Deterministic per run seed. */
export function challengeAfter(landed: number, seed: number): Challenge | null {
  if (landed < CHALLENGE_FIRST || (landed - CHALLENGE_FIRST) % CHALLENGE_EVERY !== 0) return null;
  const n = (landed - CHALLENGE_FIRST) / CHALLENGE_EVERY;
  const pick = (Math.abs(Math.imul(seed | 0, 2654435761) + n * 7919) >>> 0) % 3;
  if (pick === 0) return { kind: 'long', minLen: landed >= 15 ? 6 : 5 };
  // A clean landing is the easy ask early on; a perfect one once the player is warmed up.
  if (pick === 1) return landed >= 7 ? { kind: 'perfect' } : { kind: 'good' };
  return { kind: 'long', minLen: landed >= 11 ? 6 : 5 };
}

export function challengeMet(ch: Challenge | null | undefined, quality: LandingQuality, wordLen: number): boolean {
  if (!ch || quality === 'miss') return false;
  switch (ch.kind) {
    case 'long':
      return wordLen >= ch.minLen;
    case 'perfect':
      return quality === 'perfect';
    case 'good':
      return quality === 'perfect' || quality === 'good';
  }
}
