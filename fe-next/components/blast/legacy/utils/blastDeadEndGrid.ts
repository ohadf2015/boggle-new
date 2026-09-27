import type { LetterGrid } from '@/shared/types/game';
import type { BlastTileState } from '../types';
// Single source of truth for "unselectable until thawed" — the SAME set the
// board's cellFilter uses to render a tile as locked. Currently {frozen} only:
// ice was un-gated (2026-06-13) and is directly selectable/meltable.
import { THAWABLE_TYPES } from '../utils/blastThaw';

/**
 * Build a string grid for dead-end detection by masking tiles that cannot
 * currently be selected by the player:
 *  - cleared tiles (already gone)
 *  - THAWABLE tiles (frozen vault) that haven't been thawed by an adjacent word
 *
 * The resulting grid is passed to hasValidWords, which only performs DFS on
 * non-empty cells. Every other type (standard, ice, bomb, locked, …) IS
 * selectable, so its letter is included as-is — masking a selectable tile would
 * make the detector declare a FALSE dead-end while playable moves remain.
 *
 * NOTE: this MUST stay aligned with `computeCellFilter`/`THAWABLE_TYPES` — the
 * board's own "is this tile locked" definition. Two divergent selectability
 * rules is the Class-3 drift that caused the ice false-dead-end.
 */
export function buildDeadEndGrid(
  grid: LetterGrid,
  tiles: BlastTileState[][],
): string[][] {
  return grid.map((row, ri) =>
    row.map((cell, ci) => {
      const t = tiles[ri]?.[ci];
      if (!t || t.isCleared) return '';
      if (THAWABLE_TYPES.has(t.type) && !t.isThawed) return '';
      return cell;
    }),
  );
}
