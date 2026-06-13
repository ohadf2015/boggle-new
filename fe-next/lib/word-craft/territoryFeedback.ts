/**
 * Per-turn territory feedback model for Conquest mode. The floating "+N" that
 * pops on a commit counts CELLS gained, not Scrabble points: cells you claimed
 * by placing tiles, plus cells you stole from the rival this turn.
 */

export interface TurnCaptureInfo {
  by: 'player' | 'bot';
  /** How many rival cells were flipped on the capturing turn. */
  cellCount: number;
  /** History index of the turn the capture happened on. */
  turnIndex: number;
}

export interface TurnCellGain {
  /** Cells claimed by placing tiles this turn. */
  claimed: number;
  /** Rival cells stolen this turn. */
  stolen: number;
  /** Total new territory gained this turn. */
  total: number;
}

/**
 * Cells a seat gained on a given turn. `capture` is the game's most-recent
 * capture record; it only contributes when it belongs to this seat AND this
 * exact turn (so a stale capture from an earlier turn isn't double-counted).
 */
export function cellsGainedThisTurn(
  placedCount: number,
  who: 'player' | 'bot',
  turnIndex: number,
  capture: TurnCaptureInfo | null | undefined,
): TurnCellGain {
  const claimed = Math.max(0, placedCount);
  const stolen =
    capture && capture.by === who && capture.turnIndex === turnIndex
      ? Math.max(0, capture.cellCount)
      : 0;
  return { claimed, stolen, total: claimed + stolen };
}
