/**
 * Blast state rehydration — deliberately a LEAF module.
 *
 * `persistence.ts` needs this on the Redis-restore path, and `persistence.ts` is
 * reachable from Next.js API routes (quick-play → quickPlaySubmit → ... →
 * gameStateManager). Importing it from `blastModeManager` instead would pull the
 * whole blast engine into those route bundles, where its NodeNext-style
 * `./wordValidator.js` specifier does not resolve and every such route 500s.
 * So this file imports TYPES ONLY and stays free of runtime dependencies.
 */
import type { BlastModeState, BlastPlayerBoard, BlastTileOverlay } from '@/shared/types/game';
import type { BlastTileType } from '@/shared/types/blast';

/**
 * Build the "row,col" → tile type lookup. overlayMap is DERIVED from overlay,
 * never independent state, so every site that needs one rebuilds it from the
 * array rather than copying a Map that may not be one.
 *
 * That distinction is load-bearing: blastModeState is persisted with
 * JSON.stringify (backend/redis/gameState.ts), and a Map stringifies to `{}`.
 * `new Map(restoredOverlayMap)` throws "object is not iterable" — which is what
 * killed submitWord for every blast player after a server restart.
 */
export function buildOverlayMap(overlay: BlastTileOverlay[] | undefined): Map<string, BlastTileType> {
  const map = new Map<string, BlastTileType>();
  for (const tile of overlay ?? []) {
    map.set(`${tile.row},${tile.col}`, tile.type);
  }
  return map;
}

/**
 * Rehydrate a blastModeState read back from Redis. Called at the restore
 * boundary — `persistence.ts` already revives letterPositions / the vocabulary
 * Sets this way, and blast's overlayMap was the one collection it missed.
 * Rebuilds the derived lookup on the template AND on every per-player board.
 */
export function reviveBlastModeState(
  state: BlastModeState | null | undefined
): BlastModeState | null {
  if (!state) return null;
  state.overlayMap = buildOverlayMap(state.overlay);
  for (const board of Object.values(state.playerBoards ?? {}) as BlastPlayerBoard[]) {
    if (board) board.overlayMap = buildOverlayMap(board.overlay);
  }
  return state;
}
