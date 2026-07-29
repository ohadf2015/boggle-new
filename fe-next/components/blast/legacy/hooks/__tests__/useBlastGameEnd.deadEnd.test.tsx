import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlastGameEnd } from '../useBlastGameEnd';

// Force planSugarCrush to a no-op so the dead-end effect races straight
// to the finale burst — the only thing this test cares about.
vi.mock('../../utils/blastSugarCrush', () => ({
  planSugarCrush: () => [],
}));

type TileState = { type: string; isCleared: boolean };

const buildTiles = (): TileState[][] => [
  [
    { type: 'normal', isCleared: false },
    { type: 'normal', isCleared: true },  // already cleared — excluded
    { type: 'bomb', isCleared: false },
  ],
  [
    { type: 'normal', isCleared: false },
    { type: 'gem', isCleared: false },
    { type: 'normal', isCleared: true },
  ],
];

interface EngineState {
  gameState: {
    isComplete: boolean;
    isDeadEnd: boolean;
    score: number;
    wordsFound: string[];
    tilesCleared: number;
    totalTiles: number;
  };
}

const makeDeps = (overrides: Partial<EngineState['gameState']> = {}) => {
  const tileStates = buildTiles();
  const engine = {
    gameState: {
      isComplete: false,
      isDeadEnd: false,
      score: 500,
      wordsFound: ['HELLO'],
      tilesCleared: 2,
      totalTiles: 6,
      ...overrides,
    },
    getResults: vi.fn(() => ({ finalScore: 500 } as any)),
    getLatestState: () => ({ tileStates }),
    setTileStates: vi.fn(),
  };
  return {
    engine,
    isMultiplayer: false,
    gridSize: 3,
    waveConfig: undefined,
    objectives: { allObjectivesComplete: false },
    onGameEnd: vi.fn(),
    onWaveComplete: undefined,
    onDeadEndFinale: vi.fn(),
    maxCombo: 3,
    sounds: { playSpecialTileSound: vi.fn() },
    setExplosionShake: vi.fn(),
    explosionShakeTimerRef: { current: null },
  };
};

describe('useBlastGameEnd — dead-end finale callback', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('does nothing while gameState is neither complete nor dead-end', () => {
    const deps = makeDeps();
    renderHook(() => useBlastGameEnd(deps));
    expect(deps.onDeadEndFinale).not.toHaveBeenCalled();
    expect(deps.onGameEnd).not.toHaveBeenCalled();
  });

  it('fires onDeadEndFinale with remaining non-cleared tiles on dead end', async () => {
    const deps = makeDeps({ isDeadEnd: true });
    renderHook(() => useBlastGameEnd(deps));

    // Flush the async sugar-crush loop (empty steps → immediate finale path).
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(deps.onDeadEndFinale).toHaveBeenCalledTimes(1);
    const [tiles] = deps.onDeadEndFinale.mock.calls[0];
    // 6 grid cells, 2 cleared → 4 remaining, in row-major order.
    expect(tiles).toEqual([
      { row: 0, col: 0, type: 'normal' },
      { row: 0, col: 2, type: 'bomb' },
      { row: 1, col: 0, type: 'normal' },
      { row: 1, col: 1, type: 'gem' },
    ]);
  });

  it('ends the game after the finale burst has time to play', async () => {
    const deps = makeDeps({ isDeadEnd: true });
    renderHook(() => useBlastGameEnd(deps));

    await act(async () => { await vi.runAllTimersAsync(); });

    expect(deps.onGameEnd).toHaveBeenCalledTimes(1);
    // getResults signature now (maxCombo, wavesCompleted?, waveResults?, allObjectivesComplete?)
    // — the wave-end caller passes the objective-complete flag through so
    // the results screen caps stars at 2 when objectives weren't met.
    expect(deps.engine.getResults).toHaveBeenCalledWith(3, undefined, undefined, false);
  });

  it('flips sugarCrushActive true during cascade and false after finale', async () => {
    const deps = makeDeps({ isDeadEnd: true });
    const { result } = renderHook(() => useBlastGameEnd(deps));

    // Effect runs synchronously on mount → already active.
    expect(result.current.sugarCrushActive).toBe(true);

    // After the finale finishes, flips back to false.
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(result.current.sugarCrushActive).toBe(false);
  });

  it('exposes sugarCrushActive=false when not in a dead end', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useBlastGameEnd(deps));
    expect(result.current.sugarCrushActive).toBe(false);
  });

  it('defers dead-end finale while deferDeadEndFinale=true, runs it when flag flips', async () => {
    const deps = makeDeps({ isDeadEnd: true });
    const { result, rerender } = renderHook(
      ({ defer }: { defer: boolean }) =>
        useBlastGameEnd({ ...deps, deferDeadEndFinale: defer } as any),
      { initialProps: { defer: true } },
    );

    await act(async () => { await vi.runAllTimersAsync(); });
    expect(deps.onDeadEndFinale).not.toHaveBeenCalled();
    expect(deps.onGameEnd).not.toHaveBeenCalled();
    expect(result.current.sugarCrushActive).toBe(false);

    rerender({ defer: false });
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(deps.onDeadEndFinale).toHaveBeenCalledTimes(1);
    expect(deps.onGameEnd).toHaveBeenCalledTimes(1);
  });

  it('skips onDeadEndFinale cleanly when every tile is already cleared', async () => {
    const deps = makeDeps({ isDeadEnd: true });
    // Override getLatestState to return a fully-cleared board.
    deps.engine.getLatestState = () => ({
      tileStates: [[{ type: 'normal', isCleared: true }]] as any,
    });
    renderHook(() => useBlastGameEnd(deps));

    await act(async () => { await vi.runAllTimersAsync(); });

    expect(deps.onDeadEndFinale).not.toHaveBeenCalled();
    expect(deps.onGameEnd).toHaveBeenCalledTimes(1);
  });
});
