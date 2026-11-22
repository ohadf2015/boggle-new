import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlastGameEnd } from '../useBlastGameEnd';

// Sugar Crush is irrelevant to the MP end-signal logic under test.
vi.mock('../../utils/blastSugarCrush', () => ({
  planSugarCrush: () => [],
}));

type TileState = { type: string; isCleared: boolean };

const buildTiles = (): TileState[][] => [
  [
    { type: 'normal', isCleared: false },
    { type: 'gem', isCleared: false },
  ],
];

const makeMpDeps = (overrides: Partial<{
  isComplete: boolean;
  isDeadEnd: boolean;
}> = {}) => {
  const tileStates = buildTiles();
  const engine = {
    gameState: {
      isComplete: false,
      isDeadEnd: false,
      score: 800,
      wordsFound: ['BOARD'],
      tilesCleared: 6,
      totalTiles: 6,
      ...overrides,
    },
    getResults: vi.fn(() => ({ finalScore: 800 } as any)),
    getLatestState: () => ({ tileStates: tileStates as any }),
    setTileStates: vi.fn(),
  };
  return {
    engine,
    isMultiplayer: true,
    gridSize: 2,
    waveConfig: undefined,
    objectives: { allObjectivesComplete: false },
    onGameEnd: vi.fn(),
    onMPDeadEnd: vi.fn(),
    onMPBoardCleared: vi.fn(),
    onWaveComplete: vi.fn(),
    onDeadEndFinale: vi.fn(),
    maxCombo: 5,
    sounds: { playSpecialTileSound: vi.fn() },
    setExplosionShake: vi.fn(),
    explosionShakeTimerRef: { current: null },
  };
};

describe('useBlastGameEnd — multiplayer end signals', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('on full board clear in MP, celebrates but never ends the room: the server already refreshes an exhausted board', async () => {
    const deps = makeMpDeps({ isComplete: true });
    renderHook(() => useBlastGameEnd(deps));

    await act(async () => { await vi.runAllTimersAsync(); });

    expect(deps.onMPBoardCleared).toHaveBeenCalledTimes(1);
    expect(deps.onMPDeadEnd).not.toHaveBeenCalled();
    expect(deps.onWaveComplete).not.toHaveBeenCalled();
    expect(deps.onGameEnd).not.toHaveBeenCalled();
  });

  it('on full board clear in MP without an onMPBoardCleared callback, does not crash', async () => {
    const deps = makeMpDeps({ isComplete: true });
    const { onMPBoardCleared: _omit, ...depsNoCb } = deps;
    renderHook(() => useBlastGameEnd(depsNoCb as typeof deps));

    await act(async () => { await vi.runAllTimersAsync(); });

    expect(deps.onMPDeadEnd).not.toHaveBeenCalled();
  });

  it('a second dead end on the fresh board the server sent is reported again', async () => {
    const deps = makeMpDeps({ isDeadEnd: true });
    const { rerender } = renderHook((d) => useBlastGameEnd(d), { initialProps: deps });
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(deps.onMPDeadEnd).toHaveBeenCalledTimes(1);

    const fresh = { ...deps, engine: { ...deps.engine, gameState: { ...deps.engine.gameState, isDeadEnd: false } } };
    rerender(fresh);
    await act(async () => { await vi.runAllTimersAsync(); });
    const stuckAgain = { ...fresh, engine: { ...fresh.engine, gameState: { ...fresh.engine.gameState, isDeadEnd: true } } };
    rerender(stuckAgain);
    await act(async () => { await vi.runAllTimersAsync(); });

    expect(deps.onMPDeadEnd).toHaveBeenCalledTimes(2);
  });

  it('on dead end in MP, signals server end but does NOT fire the board-cleared celebration', async () => {
    const deps = makeMpDeps({ isDeadEnd: true });
    renderHook(() => useBlastGameEnd(deps));

    await act(async () => { await vi.runAllTimersAsync(); });

    expect(deps.onMPDeadEnd).toHaveBeenCalledTimes(1);
    expect(deps.onMPBoardCleared).not.toHaveBeenCalled();
    expect(deps.onGameEnd).not.toHaveBeenCalled();
  });
});
