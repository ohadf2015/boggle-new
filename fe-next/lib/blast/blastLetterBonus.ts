import { getBasePoints } from '@/lib/wordForge/letterValues';

/**
 * Deterministic per-word letter-value bonus for Blast mode.
 *
 * Reuses the canonical multilingual (EN + HE) Scrabble-style tile values so:
 *  - totals look organic (e.g. +113, +27) instead of round (+100, +50), and
 *  - rare letters (Q/Z/X, ז/ט/צ/ק) feel rewarding.
 *
 * DETERMINISTIC by design: the same word always yields the same bonus, so the
 * client's optimistic score-fly and the server's authoritative total stay in
 * lock-step. (A Math.random() jitter here would make the "+N" popup disagree
 * with the leaderboard — never do that on a server-authoritative path.)
 */
export function blastLetterBonus(word: string): number {
  if (!word) return 0;
  return getBasePoints(word);
}
