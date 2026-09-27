/**
 * blastObjectiveValidator — Verify wave objectives are achievable on the
 * generated board, repair when possible, drop when not.
 *
 * Two checks:
 *   - target_word: a contiguous adjacent path must exist for the chosen
 *     word. If the seeded word is unsolvable, swap to the first solvable
 *     candidate in the language's pool. If no candidate fits, remove the
 *     objective entirely (its bonus disappears for that wave).
 *   - color_power: the board must already host enough tiles tagged with
 *     the requested color to meet `minColorCount` in a single word. If
 *     it doesn't, drop the goal — color tags are seeded once at wave
 *     start, so an under-tagged board cannot satisfy the goal even with
 *     perfect play.
 *
 * The repair runs once per wave (caller responsibility — see BlastGame).
 * It must not mutate inputs; objectives are immutable from the engine's
 * point of view.
 */

import type { BlastObjective, BlastTileState, LetterGrid } from '../types';
import type { Language } from '@/shared/types/game';
import { canSpellOnBoard } from './blastTargetWordSolver';
import { getTargetWordPool } from './blastTargetWordPool';

export function validateWaveObjectives(
  objectives: BlastObjective[],
  grid: LetterGrid,
  tileStates: BlastTileState[][],
  language: Language,
): BlastObjective[] {
  let next = objectives;

  // ─── target_word ────────────────────────────────────────────
  const twIdx = next.findIndex(o => o.type === 'target_word');
  if (twIdx !== -1) {
    const tw = next[twIdx];
    if (tw.targetWord && !canSpellOnBoard(grid, tw.targetWord)) {
      const pool = getTargetWordPool(language);
      const solvable = pool.find(w => w !== tw.targetWord && canSpellOnBoard(grid, w));
      next = [...next];
      if (solvable) {
        next[twIdx] = { ...tw, targetWord: solvable };
      } else {
        next.splice(twIdx, 1);
      }
    }
  }

  // ─── color_power ────────────────────────────────────────────
  const cpIdx = next.findIndex(o => o.type === 'color_power');
  if (cpIdx !== -1) {
    const cp = next[cpIdx];
    const tag = cp.colorTag;
    const need = cp.minColorCount ?? 3;
    if (tag) {
      let count = 0;
      for (const row of tileStates) {
        for (const tile of row) {
          if (tile.colorTag === tag) count++;
        }
      }
      if (count < need) {
        next = next === objectives ? [...next] : next;
        next.splice(cpIdx, 1);
      }
    }
  }

  return next;
}
