import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export type GridAriaLabels = Record<string, string>;

/**
 * Memoizes per-cell aria-label generation. Labels are derived from the board
 * letters + locale and remain stable for the lifetime of a round (board seed).
 *
 * Closes mp-perf audit H3: previously t() ran 16x/render in standard mode
 * (4×4 grid). Now t() runs 16x/round.
 *
 * @param grid 2D array of letters as rendered (rows × cols).
 * @param boardSeed Stable identifier for the board — typically a hash of letters
 *                  or the round id. Changing this invalidates the memo.
 */
export function useGridAriaLabels(
  grid: readonly (readonly string[])[],
  boardSeed: string,
): GridAriaLabels {
  const { t } = useLanguage();
  return useMemo(() => {
    const out: GridAriaLabels = {};
    for (let r = 0; r < grid.length; r++) {
      const row = grid[r];
      for (let c = 0; c < row.length; c++) {
        out[`${r},${c}`] = t('game.grid.cellLabel', {
          row: r + 1,
          col: c + 1,
          letter: row[c],
        });
      }
    }
    return out;
    // boardSeed is the primary cache key. t() is from useLanguage() and
    // semantically stable (language context rarely changes); including it
    // would cause unnecessary recomputation when LanguageContext updates
    // (e.g., dynamic message loading). Safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardSeed]);
}
