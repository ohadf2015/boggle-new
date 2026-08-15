/**
 * blastModeManager - reviveBlastModeState
 *
 * Regression guard for JAVASCRIPT-NEXTJS-1Z9 / -1Z8 / -1Z3 / -1Z4:
 * blastModeState is persisted with JSON.stringify (backend/redis/gameState.ts),
 * and a Map stringifies to `{}`. After a server restart the game is rehydrated
 * from Redis with overlayMap as a PLAIN OBJECT, so:
 *   - `new Map(board.overlayMap)`  → TypeError: object is not iterable
 *   - `overlayMap.get(...)`        → TypeError: overlayMap.get is not a function
 * Every blast word submission then threw inside submitWord, which emits nothing,
 * so the player got no validation feedback at all and the board froze.
 *
 * overlayMap is DERIVED from overlay, so the revive rebuilds it rather than
 * trying to recover it from the (empty) serialized form.
 */
import { describe, it, expect } from 'vitest';

import { initBlastModeState, getOrInitPlayerBoard, cloneBlastBoard } from '../blastModeManager';
import { reviveBlastModeState } from '../gameState/reviveBlastState';

import type { BlastModeState } from '@/shared/types/game';

/** Round-trip through JSON exactly like Redis persistence does. */
function throughRedis(state: BlastModeState): BlastModeState {
  return JSON.parse(JSON.stringify(state)) as BlastModeState;
}

describe('reviveBlastModeState — Map survival across Redis JSON round-trip', () => {
  const GRID = [
    ['C', 'A', 'T', 'S', 'R', 'E'],
    ['O', 'D', 'E', 'L', 'I', 'N'],
    ['B', 'U', 'M', 'P', 'A', 'T'],
    ['R', 'E', 'A', 'D', 'S', 'O'],
    ['I', 'N', 'K', 'L', 'E', 'T'],
    ['S', 'T', 'O', 'N', 'E', 'D'],
  ];
  const makeState = (): BlastModeState => initBlastModeState(GRID, ['alice', 'bob'], 1, 12345);

  it('JSON round-trip destroys overlayMap (documents the bug)', () => {
    const dead = throughRedis(makeState());
    expect(dead.overlayMap).not.toBeInstanceOf(Map);
    expect(Object.keys(dead.overlayMap as unknown as object)).toHaveLength(0);
  });

  it('revives the template overlayMap as a real Map with every overlay tile', () => {
    const state = makeState();
    const revived = reviveBlastModeState(throughRedis(state))!;

    expect(revived.overlayMap).toBeInstanceOf(Map);
    expect(revived.overlayMap.size).toBe(revived.overlay.length);
    for (const tile of revived.overlay) {
      expect(revived.overlayMap.get(`${tile.row},${tile.col}`)).toBe(tile.type);
    }
  });

  it('revives overlayMap on every per-player board', () => {
    const state = makeState();
    getOrInitPlayerBoard(state, 'alice');
    getOrInitPlayerBoard(state, 'bob');

    const revived = reviveBlastModeState(throughRedis(state))!;

    for (const username of ['alice', 'bob']) {
      const board = revived.playerBoards![username];
      expect(board.overlayMap).toBeInstanceOf(Map);
      expect(board.overlayMap.size).toBe(board.overlay.length);
    }
  });

  // cloneBlastBoard was the frame in the Sentry stack (`at new Map` → cloneBlastBoard
  // → safeCascadeBlastWord → handleValidatedWord). It now rebuilds the lookup from
  // `overlay` rather than copying a Map, so it survives an unrevived board too —
  // belt and braces, since a restored board reaching it means a revive was missed.
  it('cloneBlastBoard survives a restored board, revived or not, with a real Map', () => {
    const state = makeState();
    getOrInitPlayerBoard(state, 'alice');
    const dead = throughRedis(state);

    for (const board of [dead.playerBoards!.alice, reviveBlastModeState(dead)!.playerBoards!.alice]) {
      const clone = cloneBlastBoard(board);
      expect(clone.overlayMap).toBeInstanceOf(Map);
      expect(clone.overlayMap.size).toBe(clone.overlay.length);
    }
  });

  it('getOrInitPlayerBoard no longer throws for a late joiner on a restored state', () => {
    const state = makeState();
    const revived = reviveBlastModeState(throughRedis(state))!;

    expect(() => getOrInitPlayerBoard(revived, 'carol')).not.toThrow();
    expect(getOrInitPlayerBoard(revived, 'carol').overlayMap).toBeInstanceOf(Map);
  });

  it('is a no-op-safe pass-through for null and for a live (never-serialized) state', () => {
    expect(reviveBlastModeState(null)).toBeNull();
    expect(reviveBlastModeState(undefined)).toBeNull();

    const live = makeState();
    const revived = reviveBlastModeState(live)!;
    expect(revived.overlayMap).toBeInstanceOf(Map);
    expect(revived.overlayMap.size).toBe(live.overlay.length);
  });
});
