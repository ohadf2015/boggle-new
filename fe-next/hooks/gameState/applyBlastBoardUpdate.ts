import type { BlastTileOverlay } from '@/shared/types/game';
import { normalizeBlastTileState, normalizeBlastTileType, type BlastTileState } from '@/shared/types/blast';
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
    const overlay = data.overlay.map((o) => ({ ...o, type: normalizeBlastTileType(o.type) }));
    useGameStore.setState({ blastTileOverlay: overlay, blastSeed: data.seed });
  }
  const tileStates = data.tileStates.map((row) => row.map(normalizeBlastTileState));
  useGameStore.getState().setBlastBoardUpdate({ ...data, tileStates });
}
