// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const detectMatch3Clusters = vi.fn();
vi.mock('../../utils/blastMatch3Detector', () => ({ detectMatch3Clusters: (...a: unknown[]) => detectMatch3Clusters(...a) }));
vi.mock('../../utils/blastVerticalScanner', () => ({ detectVerticalWords: () => [], detectHorizontalWords: () => [] }));
vi.mock('@/lib/blast/mascotBus', () => ({ emitMascotEvent: vi.fn() }));
vi.mock('@/components/grid/hapticFeedback', () => ({ vibrateBlastCascade: vi.fn() }));

import { useBlastCascade } from '../useBlastCascade';
import { useBlastSequencer } from '../useBlastSequencer';
import { CASCADE_CHAIN_BONUS_MULTIPLIER } from '../../types';

function makeTiles() {
  return Array.from({ length: 3 }, (_, r) => Array.from({ length: 3 }, (_, c) => ({
    uid: `${r}-${c}`, row: r, col: c, type: 'standard', isCleared: false, activationEffect: null, hitsRemaining: 0,
  })));
}

describe('useBlastCascade with the real sequencer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('still chains a cascade find and credits the same bonus', async () => {
    const tiles = makeTiles();
    const grid = tiles.map((row) => row.map(() => 'A'));
    const cluster = [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }];
    detectMatch3Clusters.mockReturnValueOnce([{ letter: 'A', cells: cluster }]).mockReturnValue([]);
    const gravity = {
      newGrid: grid, newTileStates: tiles, clearedTiles: [{ row: 2, col: 1 }],
      fallingTiles: [{ row: 2, col: 1, fallDistance: 1 }], newTiles: [{ row: 0, col: 1, spawnOffset: 60 }],
    };
    const bonuses: number[] = [];
    const engine = {
      startCascade: vi.fn(() => ({ gravity, commit: vi.fn() })),
      stopCascade: vi.fn(),
      submitWord: vi.fn((cells: Array<{ row: number; col: number }>, _l: string, bonus: number) => {
        bonuses.push(bonus);
        for (const c of cells) tiles[c.row][c.col].isCleared = true;
        return { score: 0, combos: [], clearedTiles: [], explosions: [], bonusMoves: 0, countdownExplosions: [] };
      }),
      getLatestState: () => ({ grid, tileStates: tiles }),
      gameState: { wordsFound: [] },
    };
    const { result: seq } = renderHook(() => useBlastSequencer());
    const deps = {
      engine, sequencer: seq.current, sounds: { playCascadeChain: vi.fn() },
      comboStreak: { pauseTimer: vi.fn(), resumeTimer: vi.fn(), onWordSubmitted: vi.fn() },
      checkWord: () => true, waveConfig: undefined,
      setCascadeHighlightCells: vi.fn(), setCascadeHighlightWord: vi.fn(), setScoreFlyEvents: vi.fn(),
      setComboFlash: vi.fn(), flyIdRef: { current: 0 }, setClearedTilesForEffects: vi.fn(),
    };
    const { result } = renderHook(() => useBlastCascade(deps as never));

    let level = -1;
    await act(async () => {
      const p = result.current.runCascade(5).then((l) => { level = l; });
      await vi.advanceTimersByTimeAsync(5000);
      await p;
    });

    expect(level).toBe(1);
    expect(engine.startCascade).toHaveBeenCalledTimes(2);
    expect(bonuses).toEqual([Math.round(3 * 3 * CASCADE_CHAIN_BONUS_MULTIPLIER * 1)]);
    expect(engine.stopCascade).toHaveBeenCalledTimes(1);
  });
});
