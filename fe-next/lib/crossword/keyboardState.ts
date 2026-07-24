/**
 * Crossword keyboard state — which letters are used/correct/wrong.
 * Derived entirely from GameState so it is trivial to unit-test.
 */

import type { GameState } from './gameState';

export interface KeyboardState {
  /** All letters that have been placed in at least one cell. */
  used: Set<string>;
  /** Letters that are correct in all their placements. */
  correct: Set<string>;
  /** Letters that have at least one wrong placement. */
  wrong: Set<string>;
}

/**
 * Compute the keyboard state from the current game state.
 * Used: any letter placed in at least one cell.
 * Correct: all occurrences of this letter match the solution.
 * Wrong: a letter has been placed but is wrong in at least one cell.
 */
export function computeKeyboardState(state: GameState): KeyboardState {
  const used = new Set<string>();
  const correct = new Set<string>();
  const wrong = new Set<string>();
  const { puzzle, entries, checks } = state;
  const countNeeded: Record<string, number> = {};
  const countPlaced: Record<string, number> = {};

  for (const cell of puzzle.cells) {
    if (cell.block) continue;
    countNeeded[cell.solution] = (countNeeded[cell.solution] ?? 0) + 1;
    const entered = entries[`${cell.row},${cell.col}`];
    if (entered) {
      countPlaced[entered] = (countPlaced[entered] ?? 0) + 1;
      if (entered === cell.solution) correct.add(entered);
      else wrong.add(entered);
      used.add(entered);
    }
  }

  // A letter is "correct" only if ALL its occurrences match the solution
  correct.forEach((letter) => {
    const needed = countNeeded[letter] ?? 0;
    const placed = countPlaced[letter] ?? 0;
    if (needed !== placed) correct.delete(letter);
  });

  return { used, correct, wrong };
}