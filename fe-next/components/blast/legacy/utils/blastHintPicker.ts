/**
 * blastHintPicker — pure helpers that translate "the player wants a hint"
 * into something concrete to highlight on the board.
 *
 * Priority is intentional: target_word > color_power > collect_type >
 * clear_all_type. Score / word_length / clear_percent objectives don't
 * point to specific cells, so they're skipped — the hint button is hidden
 * by the caller when only those goals remain.
 *
 * Returns a HintTarget describing both where to highlight and what to
 * say in the i18n toast. The caller does the actual rendering.
 */

import type {
  BlastObjective,
  BlastObjectiveProgress,
  BlastTileState,
  LetterGrid,
} from '../types';
import { canSpellOnBoard } from './blastTargetWordSolver';

export type HintKind = 'target_word' | 'color_power' | 'collect_type' | 'clear_all_type';

export interface HintTarget {
  kind: HintKind;
  /** Cells to highlight on the grid (row,col). May be empty if the engine
   *  can't pinpoint them (e.g. target_word path solver bailed). */
  cells: Array<{ row: number; col: number }>;
  /** i18n key suffix (e.g. 'targetWord', 'colorPower', 'collectType', 'clearAllType') */
  i18nKey: string;
  /** Variables for the i18n template (color, tileType, word, etc.). */
  vars: Record<string, string | number>;
}

/**
 * Pick the best hint target for the highest-priority incomplete objective.
 * Returns null when nothing actionable remains — caller hides the button.
 */
export function pickHintTarget(
  progress: BlastObjectiveProgress[],
  grid: LetterGrid,
  tileStates: BlastTileState[][],
): HintTarget | null {
  const incomplete = progress.filter(p => !p.isComplete);
  if (incomplete.length === 0) return null;

  // Priority order matches the difficulty ranking the user calls out.
  const priorities: BlastObjective['type'][] = [
    'target_word',
    'color_power',
    'collect_type',
    'clear_all_type',
  ];

  for (const wantedType of priorities) {
    const p = incomplete.find(x => x.objective.type === wantedType);
    if (!p) continue;

    if (wantedType === 'target_word') {
      const word = p.objective.targetWord;
      if (!word) continue;
      // Only hint when the word is solvable. The validator should already
      // have ensured this at wave start, but guard anyway — letters move
      // after each cleared word and the path may have evaporated.
      if (!canSpellOnBoard(grid, word)) continue;
      const startCells = findFirstLetterPositions(grid, tileStates, word[0]);
      return {
        kind: 'target_word',
        cells: startCells,
        i18nKey: 'targetWord',
        vars: { word: word.toUpperCase() },
      };
    }

    if (wantedType === 'color_power') {
      const tag = p.objective.colorTag;
      if (!tag) continue;
      const cells: Array<{ row: number; col: number }> = [];
      for (let r = 0; r < tileStates.length; r++) {
        for (let c = 0; c < tileStates[r].length; c++) {
          const tile = tileStates[r][c];
          if (!tile.isCleared && tile.colorTag === tag) cells.push({ row: r, col: c });
        }
      }
      if (cells.length === 0) continue;
      return {
        kind: 'color_power',
        cells,
        i18nKey: 'colorPower',
        vars: { color: tag, count: cells.length },
      };
    }

    if (wantedType === 'collect_type' || wantedType === 'clear_all_type') {
      const type = p.objective.tileType;
      if (!type) continue;
      const cells: Array<{ row: number; col: number }> = [];
      for (let r = 0; r < tileStates.length; r++) {
        for (let c = 0; c < tileStates[r].length; c++) {
          const tile = tileStates[r][c];
          if (!tile.isCleared && tile.type === type) cells.push({ row: r, col: c });
        }
      }
      if (cells.length === 0) continue;
      return {
        kind: wantedType,
        cells,
        i18nKey: wantedType === 'collect_type' ? 'collectType' : 'clearAllType',
        vars: { tileType: type },
      };
    }
  }

  return null;
}

/** All non-cleared tiles whose letter matches `letter` (case-insensitive). */
function findFirstLetterPositions(
  grid: LetterGrid,
  tileStates: BlastTileState[][],
  letter: string,
): Array<{ row: number; col: number }> {
  const cells: Array<{ row: number; col: number }> = [];
  const target = letter.toUpperCase();
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c]?.toUpperCase() !== target) continue;
      const tile = tileStates[r]?.[c];
      if (tile?.isCleared) continue;
      cells.push({ row: r, col: c });
    }
  }
  return cells;
}
