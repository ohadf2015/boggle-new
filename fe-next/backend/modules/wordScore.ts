/**
 * The per-word score — computed ONCE, on the server, for every accepted word.
 *
 * Every consumer reads the numbers this returns and never recomputes them:
 *   - the live running total (`updatePlayerScore` → `updateLeaderboard`)
 *   - the stored word detail the results page sums (`addPlayerWord.score`)
 *   - `wordAccepted` / `scoreUpdate` / opponent feed / `recordBlastMove`
 *   - bots (same function, same numbers as a human submitting the word)
 *
 * Blast tile bonuses are authored as fractional multipliers (gold 1.5, bomb
 * 1.25, ...). They are summed and rounded ONCE here so the per-word total is an
 * integer. Before this, the live total accumulated the raw fractions (152.75)
 * while the results page rounded each word (153) — the two never matched.
 */

import type { BlastTileType } from '@/shared/types/blast';
// Via scoringEngine (its re-export of the shared curve) so handler tests that
// stub scoringEngine.calculateWordScore keep controlling the word score.
import { calculateWordScore } from './scoringEngine';
import { blastLetterBonus } from '@/lib/blast/blastLetterBonus';
import { calculateBlastTileBonus } from './blastModeManager';

export interface WordScoreInput {
  word: string;
  comboLevel: number;
  fireRoundActive?: boolean;
  inputMethod?: 'kb' | 'drag';
  /**
   * Blast only: the special tiles on the word's path. Presence (even `[]`)
   * marks the word as a Blast word, which also earns the letter-value bonus.
   */
  blastTiles?: readonly BlastTileType[] | null;
}

export interface WordScore {
  /** Length-only score (word.length - 1) — the combo bonus is reported against it. */
  baseScore: number;
  /** Base + combo, times the fire-round multiplier (keyboard bonus applied). */
  wordScore: number;
  comboBonus: number;
  fireRoundMultiplier: number;
  fireRoundBonus: number;
  /** Integer blast tile bonus (0 outside Blast). */
  blastTileBonus: number;
  /** Deterministic letter-value bonus (0 outside Blast). */
  blastLetterBonus: number;
  /** The integer the player is credited for this word. */
  total: number;
}

/** Integer blast tile bonus for the tiles on one word's path (rounded once). */
export function blastTileBonusFor(tiles: readonly BlastTileType[]): number {
  return Math.round(calculateBlastTileBonus([...tiles]));
}

export function scoreAcceptedWord(input: WordScoreInput): WordScore {
  const { word, comboLevel, fireRoundActive = false, inputMethod = 'drag', blastTiles } = input;
  const fireRoundMultiplier = fireRoundActive ? 2 : 1;
  const meta = { inputMethod };
  const baseScore = word.length - 1;
  const wordScore = calculateWordScore(word, comboLevel, fireRoundMultiplier, 1, meta);
  const unmultiplied = calculateWordScore(word, comboLevel, 1, 1, meta);
  const isBlast = blastTiles !== undefined && blastTiles !== null;
  const blastTileBonus = isBlast ? blastTileBonusFor(blastTiles) : 0;
  const letterBonus = isBlast ? blastLetterBonus(word) : 0;
  return {
    baseScore,
    wordScore,
    comboBonus: unmultiplied - baseScore,
    fireRoundMultiplier,
    fireRoundBonus: fireRoundActive ? unmultiplied : 0,
    blastTileBonus,
    blastLetterBonus: letterBonus,
    total: wordScore + blastTileBonus + letterBonus,
  };
}
