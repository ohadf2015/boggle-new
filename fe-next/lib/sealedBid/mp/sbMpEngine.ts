/**
 * Sealed Bid multiplayer resolver — the interactive-simultaneous core.
 *
 * Solo Sealed Bid scores each bid against a fixed curated bot word. Multiplayer
 * cannot: a player's outcome depends on what the OTHER players bid this round.
 * So clash is emergent — among the VALID bids this round, a word is UNIQUE (2x
 * base) if no other player bid it, and a CLASH (half, floored) if >=2 players bid
 * the same word. A pass (null) or invalid bid scores nothing and never forms a
 * clash. Pure + deterministic so it unit-tests without sockets. Reuses the solo
 * letter-value scoring (sbEngine.letterScore) so points stay consistent.
 */
import { letterScore } from '../sp/sbEngine';
import type { BidOutcome } from '../sp/sbEngine';

export interface SbMpBid {
  username: string;
  /** Normalized word, or null for a pass. */
  word: string | null;
  /** Server-validated: dict + formable-from-rack + min length. */
  valid: boolean;
}

export interface SbMpPlayerResult {
  username: string;
  word: string | null;
  outcome: BidOutcome;
  /** Letter-value sum before the multiplier. */
  basePoints: number;
  /** Awarded: 2x base (unique), floor(base/2) (clash), 0 (none). */
  points: number;
}

/**
 * Resolve one round across all players' bids. Clash detection runs over VALID
 * bids only, so an invalid duplicate never drags a valid bid into a clash.
 */
export function resolveSbMpRound(bids: SbMpBid[]): SbMpPlayerResult[] {
  // Count valid words this round (case-insensitive).
  const counts = new Map<string, number>();
  for (const b of bids) {
    if (!b.valid || !b.word) continue;
    const key = b.word.trim().toUpperCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return bids.map((b) => {
    if (!b.valid || !b.word) {
      return { username: b.username, word: b.word ?? null, outcome: 'none', basePoints: 0, points: 0 };
    }
    const key = b.word.trim().toUpperCase();
    const basePoints = letterScore(key);
    const clashed = (counts.get(key) ?? 0) >= 2;
    return {
      username: b.username,
      word: key,
      outcome: clashed ? 'clash' : 'unique',
      basePoints,
      points: clashed ? Math.floor(basePoints / 2) : basePoints * 2,
    };
  });
}
