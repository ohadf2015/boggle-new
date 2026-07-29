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

  it('on full board clear in MP, signals the server to end the room and fires the board-cleared celebration', async () => {
    const deps = makeMpDeps({ isComplete: true });
    renderHook(() => useBlastGameEnd(deps));

    await act(async () => { await vi.runAllTimersAsync(); });

    // Server-end signal fires so the whole room ends (was previously dead — !isMultiplayer guard).
    expect(deps.onMPDeadEnd).toHaveBeenCalledTimes(1);
    // Win-flavored local celebration callback fires.
    expect(deps.onMPBoardCleared).toHaveBeenCalledTimes(1);
    // MP never advances SP waves or shows the SP game-end card.
    expect(deps.onWaveComplete).not.toHaveBeenCalled();
    expect(deps.onGameEnd).not.toHaveBeenCalled();
  });

  it('on full board clear in MP without an onMPBoardCleared callback, still ends the room without crashing', async () => {
    const deps = makeMpDeps({ isComplete: true });
    const { onMPBoardCleared: _omit, ...depsNoCb } = deps;
    renderHook(() => useBlastGameEnd(depsNoCb as typeof deps));

    await act(async () => { await vi.runAllTimersAsync(); });

    expect(deps.onMPDeadEnd).toHaveBeenCalledTimes(1);
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
