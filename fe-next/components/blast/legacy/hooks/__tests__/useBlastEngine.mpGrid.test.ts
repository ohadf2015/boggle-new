/**
 * useBlastEngine — multiplayer uses the SERVER's authoritative letter grid.
 *
 * Bug (MP Blast): the engine generated its own local random grid via useGridInit
 * and ignored the server's `letterGrid` (already in the client store from the
 * `startGame` payload). The server scores each player's words against the
 * authoritative grid it deep-clones into `getOrInitPlayerBoard` — so the client
 * played/validated a DIFFERENT board than the server scored. Result: the human's
 * words scored 0 on the server leaderboard and server board-updates swapped the
 * letters underneath the player.
 *
 * Fix: in multiplayer, seed the engine grid from the server grid passed via
 * options.mpInitialGrid. Singleplayer keeps the locally generated useGridInit grid.
 */
import { renderHook, act } from '@testing-library/react';
import { useBlastEngine } from '../useBlastEngine';
import type { BlastGameConfig, BlastTileState } from '../../types';
import type { LetterGrid } from '@/shared/types/game';

// Distinct, non-overlapping grids so a swap is unambiguous.
const LOCAL_GRID: LetterGrid = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 'X'));
const SERVER_GRID: LetterGrid = [
  ['M', 'A', 'L', 'F', 'H', 'C'],
  ['A', 'H', 'O', 'A', 'O', 'U'],
  ['X', 'S', 'G', 'L', 'F', 'S'],
  ['J', 'F', 'E', 'R', 'T', 'A'],
  ['M', 'C', 'N', 'D', 'A', 'Y'],
  ['T', 'S', 'T', 'A', 'R', 'T'],
];

vi.mock('@/components/singleplayer/game/hooks/useGridInit', () => ({
  useGridInit: () => ({ grid: LOCAL_GRID, setGrid: vi.fn(), gridRef: { current: LOCAL_GRID } }),
}));

// isLoaded: false prevents useBlastEngine's dead-end detection effect from
// scheduling setTimeout(1500ms) on mount. None of these tests exercise word
// validation or dead-end detection, so the dictionary is intentionally unloaded
// to avoid leaking a real timer that outlives the fork process and causes
// "Worker exited unexpectedly" in Vitest's fork pool teardown.
vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({ checkWord: () => false, isLoaded: false }),
}));

// Intercept ALL timers for the entire file, then flush+restore after.
// Belt-and-suspenders on top of isLoaded:false above: the global
// QueryClientProvider (vitest.setup.ts, gcTime:0) schedules setTimeout(0)
// GC sweeps after every unmount. If this file is the last in its fork, those
// GC timers keep the event loop alive past teardownTimeout and the fork is
// SIGKILL'd ("Worker exited unexpectedly").  vi.runAllTimers() in afterAll
// drains them synchronously before vi.useRealTimers() restores the real clock.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
});
afterAll(() => {
  // Discard pending fake timers without running them — running them (vi.runAllTimers)
  // executes callbacks on already-unmounted React components and crashes the fork.
  vi.clearAllTimers();
  vi.useRealTimers();
});

const config: BlastGameConfig = {
  gridSize: 6,
  specialTileChance: 0,
  language: 'en',
  difficulty: 'medium',
  boardClearMode: 'shrink',
};

const tileStates: BlastTileState[][] = Array.from({ length: 6 }, (_, r) =>
  Array.from({ length: 6 }, (_, c) => ({ row: r, col: c, type: 'standard', isCleared: false } as BlastTileState)),
);

describe('useBlastEngine — multiplayer grid source', () => {
  it('uses the SERVER grid (options.mpInitialGrid) in multiplayer, not the local useGridInit grid', () => {
    const { result } = renderHook(() =>
      useBlastEngine(config, {
        isMultiplayer: true,
        blastSeed: 123,
        initialTileStates: tileStates,
        mpInitialGrid: SERVER_GRID,
      }),
    );

    expect(result.current.grid).toEqual(SERVER_GRID);
    expect(result.current.grid).not.toEqual(LOCAL_GRID);
  });

  it('still uses the local useGridInit grid in singleplayer', () => {
    const { result } = renderHook(() => useBlastEngine(config, { isMultiplayer: false }));
    expect(result.current.grid).toEqual(LOCAL_GRID);
  });
});

describe('useBlastEngine — applyServerBoard skips redundant replacements (anti-flicker)', () => {
  const mkTiles = (): BlastTileState[][] =>
    Array.from({ length: 6 }, (_, r) =>
      Array.from({ length: 6 }, (_, c) =>
        ({ uid: `u-${r}-${c}`, row: r, col: c, type: 'normal', isCleared: false, activationEffect: null, hitsRemaining: 0 } as BlastTileState),
      ),
    );

  it('does NOT replace tileStates when the server board equals the current board', () => {
    const { result } = renderHook(() =>
      useBlastEngine(config, {
        isMultiplayer: true,
        blastSeed: 123,
        initialTileStates: mkTiles(),
        mpInitialGrid: SERVER_GRID,
      }),
    );

    // Establish a known board, then capture the live array reference.
    act(() => result.current.applyServerBoard(SERVER_GRID, mkTiles()));
    const ref1 = result.current.tileStates;

    // An equal board (different array identity, only uids could differ) → no-op.
    act(() => result.current.applyServerBoard(SERVER_GRID.map((row) => [...row]), mkTiles()));
    expect(result.current.tileStates).toBe(ref1); // same reference → no re-render churn
  });

  it('DOES replace tileStates when the server board diverges', () => {
    const { result } = renderHook(() =>
      useBlastEngine(config, {
        isMultiplayer: true,
        blastSeed: 123,
        initialTileStates: mkTiles(),
        mpInitialGrid: SERVER_GRID,
      }),
    );

    act(() => result.current.applyServerBoard(SERVER_GRID, mkTiles()));
    const ref1 = result.current.tileStates;

    const diverged = mkTiles();
    diverged[2][3] = { ...diverged[2][3], isCleared: true }; // a real correction
    act(() => result.current.applyServerBoard(SERVER_GRID, diverged));

    expect(result.current.tileStates).not.toBe(ref1);
    expect(result.current.tileStates[2][3].isCleared).toBe(true);
  });
});
