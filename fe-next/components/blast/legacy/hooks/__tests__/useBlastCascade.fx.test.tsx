// @vitest-environment happy-dom
/**
 * Bug 2 (cascade half) — cascade-cleared tiles must reach the FX layer.
 *
 * useBlastCascade submits auto-detected cascade words via engine.submitWord but
 * never fed setClearedTilesForEffects, so cascade-cleared tiles vanished with only
 * the highlight + gravity animation (reads as "disappeared without effect").
 * This pins that the cascade feeds the cleared cells to the FX layer.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Detectors mocked so exactly one match-3 cluster is found on the first chain
// level and nothing afterwards (so the cascade runs a single step then stops).
const detectMatch3Clusters = vi.fn();
vi.mock('../../utils/blastMatch3Detector', () => ({ detectMatch3Clusters: (...a: unknown[]) => detectMatch3Clusters(...a) }));
vi.mock('../../utils/blastVerticalScanner', () => ({
  detectVerticalWords: () => [],
  detectHorizontalWords: () => [],
}));
vi.mock('@/lib/blast/mascotBus', () => ({ emitMascotEvent: vi.fn() }));
vi.mock('@/components/grid/hapticFeedback', () => ({ vibrateBlastCascade: vi.fn() }));

import { useBlastCascade } from '../useBlastCascade';

type Tile = { uid: string; row: number; col: number; type: string; isCleared: boolean; activationEffect: null; hitsRemaining: number };
function makeTiles(): Tile[][] {
  const g: Tile[][] = [];
  for (let r = 0; r < 3; r++) { g[r] = []; for (let c = 0; c < 3; c++) g[r][c] = { uid: `${r}-${c}`, row: r, col: c, type: 'standard', isCleared: false, activationEffect: null, hitsRemaining: 0 }; }
  return g;
}

describe('useBlastCascade — cascade FX feed', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('feeds cascade-cleared tiles to setClearedTilesForEffects', async () => {
    const tiles = makeTiles();
    const grid = tiles.map(row => row.map(t => t.type === 'standard' ? 'A' : t.type));
    const clusterCells = [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }];

    // First chain level finds a cluster; subsequent levels find nothing → stop.
    detectMatch3Clusters.mockReturnValueOnce([{ letter: 'A', cells: clusterCells }]).mockReturnValue([]);

    const setClearedTilesForEffects = vi.fn();
    const gravity = { newGrid: grid, newTileStates: tiles, clearedTiles: [], fallingTiles: [{ row: 0, col: 0 }], newTiles: [{ row: 0, col: 0 }] };

    const engine = {
      startCascade: vi.fn(() => ({ gravity, commit: undefined })),
      stopCascade: vi.fn(),
      // Clearing = mark the find's cells isCleared on the shared tile grid.
      submitWord: vi.fn((cells: Array<{ row: number; col: number }>) => {
        for (const c of cells) tiles[c.row][c.col].isCleared = true;
        return { score: 0, combos: [], clearedTiles: [], explosions: [], bonusMoves: 0, countdownExplosions: [] };
      }),
      getLatestState: () => ({ grid, tileStates: tiles }),
      gameState: { wordsFound: [] },
    };

    const deps = {
      engine: engine as never,
      sequencer: { animateCascade: vi.fn().mockResolvedValue(undefined) } as never,
      sounds: { playCascadeChain: vi.fn() },
      comboStreak: { pauseTimer: vi.fn(), resumeTimer: vi.fn(), onWordSubmitted: vi.fn() } as never,
      checkWord: vi.fn(() => true),
      waveConfig: undefined,
      setCascadeHighlightCells: vi.fn(),
      setCascadeHighlightWord: vi.fn(),
      setScoreFlyEvents: vi.fn(),
      setComboFlash: vi.fn(),
      flyIdRef: { current: 0 },
      setClearedTilesForEffects,
    };

    const { result } = renderHook(() => useBlastCascade(deps as never));
    await result.current.runCascade(5);

    expect(engine.submitWord).toHaveBeenCalled();
    expect(setClearedTilesForEffects).toHaveBeenCalled();
    const calls = setClearedTilesForEffects.mock.calls;
    const fedTiles = calls[calls.length - 1][0] as Array<{ row: number; col: number; type: string }>;
    // The three cluster cells reach the FX layer (previously: none did).
    expect(fedTiles).toEqual(expect.arrayContaining([
      { row: 0, col: 0, type: 'standard' },
      { row: 1, col: 0, type: 'standard' },
      { row: 2, col: 0, type: 'standard' },
    ]));
  });
});
