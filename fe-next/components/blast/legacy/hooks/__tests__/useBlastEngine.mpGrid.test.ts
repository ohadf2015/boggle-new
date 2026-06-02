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
import { renderHook } from '@testing-library/react';
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

vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({ checkWord: () => false, isLoaded: true }),
}));

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
