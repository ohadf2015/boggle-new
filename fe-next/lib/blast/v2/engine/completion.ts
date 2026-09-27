import type { BlastLevel } from '../types';
import type { LocaleConfig } from '../locale-config';
import { detectAllCascades } from './cascade';

export type CompletionReason = 'mastered' | 'partial';

export type CompletionResult =
  | { complete: false }
  | { complete: true; reason: CompletionReason };

// Tiny-remainder clause from the brief: "if a player has up to 2 tiles left
// undestroyed they should still finish the level (with fewer stars)."
const TINY_REMAINDER_TILES = 2;

function tileCount(level: BlastLevel): number {
  let n = 0;
  for (const col of level.columns) n += col.tiles.length;
  return n;
}

/**
 * Decide whether a level is finished, and why.
 *
 * Three completion paths (any one ends the level):
 *  - `mastered`  — every theme word has been found. The clean win.
 *  - `partial`   — the player can't (or barely can) keep going:
 *      • a remaining theme word is no longer FORMABLE on the board (a collapse
 *        stranded its letters). Previously this soft-locked the player forever
 *        — completing as a partial finish is the only escape. Reaching this
 *        state isn't a skill failure, so the result screen frames it as a win;
 *        the (lower) star count carries the nuance, not the copy.
 *      • OR ≤2 tiles remain on the whole board (the literal brief clause).
 *
 * "Formable" is the precise signal here, NOT raw tile count: generated boards
 * are padded with filler letters, so a player can find every theme word and
 * still sit on 15+ tiles. `detectAllCascades` already answers "which remaining
 * theme words can still be traced on the current board" — an empty result means
 * nothing is left to find.
 *
 * Pure + side-effect free so it can be unit-tested directly and called from the
 * reducer without recomputing board state.
 */
export function computeCompletion(
  level: BlastLevel,
  foundWords: Set<string>,
  config: LocaleConfig,
): CompletionResult {
  const allTheme = level.words.every((w) => foundWords.has(w));
  if (allTheme) return { complete: true, reason: 'mastered' };

  // Any remaining theme word still traceable on the board? If yes, keep playing.
  const stillFormable = detectAllCascades(level, foundWords, config).length > 0;
  if (!stillFormable) return { complete: true, reason: 'partial' };

  if (tileCount(level) <= TINY_REMAINDER_TILES) return { complete: true, reason: 'partial' };

  return { complete: false };
}
