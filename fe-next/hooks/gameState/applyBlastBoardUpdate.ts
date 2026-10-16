import type { BlastTileOverlay } from '@/shared/types/game';
import type { BlastTileState } from '@/shared/types/blast';
import { useGameStore } from './store';

export interface BlastBoardUpdatePayload {
  grid: string[][];
  tileStates: BlastTileState[][];
  clearedBy: string;
  word: string;
  clearedCount: number;
  totalMoves: number;
  overlay?: BlastTileOverlay[];
  seed?: number;
}

/** Server `blastBoardUpdate` → store. Shared by the player and the playing host. */
export function applyBlastBoardUpdate(data: BlastBoardUpdatePayload): void {
  // A board regen carries a new overlay + seed; per-word updates omit both.
  if (data.overlay && typeof data.seed === 'number') {
    useGameStore.setState({ blastTileOverlay: data.overlay, blastSeed: data.seed });
  }
  useGameStore.getState().setBlastBoardUpdate(data);
}
