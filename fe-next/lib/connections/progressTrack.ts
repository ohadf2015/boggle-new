/**
 * Daily progression model — turns "1/5 solved" into a visible journey toward a
 * reward. Pure logic; the DailyProgressTrack component renders it as a filling
 * track that ends in a treasure chest, and the terminal screen awards a medal.
 */

export type NodeState = 'done' | 'current' | 'todo';
export interface ProgressNode {
  index: number;
  state: NodeState;
}

/** One node per puzzle: solved → done, the active puzzle → current, rest → todo. */
export function buildProgressNodes(
  total: number,
  currentIndex: number,
  solvedIndices: ReadonlySet<number>,
): ProgressNode[] {
  return Array.from({ length: total }, (_, index) => {
    let state: NodeState = 'todo';
    if (solvedIndices.has(index)) state = 'done';
    else if (index === currentIndex) state = 'current';
    return { index, state };
  });
}

export type ChestState = 'locked' | 'ready' | 'open';

/** The chest at the end: locked mid-run, ready once everything's solved, open on finish. */
export function chestState(solvedCount: number, total: number, finished: boolean): ChestState {
  if (finished) return 'open';
  if (solvedCount >= total) return 'ready';
  return 'locked';
}

export type Medal = 'gold' | 'silver' | 'bronze' | 'none';

/** The keepsake: gold for a sweep, silver 80%+, bronze 50%+, none below half. */
export function earnedMedal(solvedCount: number, total: number): Medal {
  if (total <= 0) return 'none';
  if (solvedCount >= total) return 'gold';
  const ratio = solvedCount / total;
  if (ratio >= 0.8) return 'silver';
  if (ratio >= 0.5) return 'bronze';
  return 'none';
}
