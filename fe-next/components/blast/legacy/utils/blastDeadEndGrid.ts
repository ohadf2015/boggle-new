import type { LetterGrid } from '@/shared/types/game';
import type { BlastTileState } from '../types';

// Tile types that are unselectable until a condition is met
const ICE_TYPES = new Set(['ice', 'frozen']);

/**
 * Build a string grid for dead-end detection by masking tiles that cannot
 * currently be selected by the player:
 *  - cleared tiles (already gone)
 *  - ice/frozen tiles that haven't been thawed
 *  - locked tiles that haven't been unlocked by a nearby key
 *
 * The resulting grid is passed to hasValidWords, which only performs DFS
 * on non-empty cells. Unmasked special types (bomb, gem, etc.) are
 * selectable and their letter is included as-is.
 */
export function buildDeadEndGrid(
  grid: LetterGrid,
  tiles: BlastTileState[][],
): string[][] {
  return grid.map((row, ri) =>
    row.map((cell, ci) => {
      const t = tiles[ri]?.[ci];
      if (!t || t.isCleared) return '';
      if (ICE_TYPES.has(t.type) && !t.isThawed) return '';
      return cell;
    }),
  );
}
