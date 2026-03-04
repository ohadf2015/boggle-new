/**
 * TDD tests for game completion logic in BlastGame.
 * Covers the stuck-game bug: when isComplete=true but allObjectivesComplete=false,
 * onGameEnd should still be called.
 *
 * Written BEFORE implementation (RED phase).
 */
import { render, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks (same pattern as BlastGame.discovery.test.tsx)
// ---------------------------------------------------------------------------

jest.mock('canvas-confetti', () => jest.fn());

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: jest.fn(),
    playComboSound: jest.fn(),
  }),
}));

jest.mock('@/hooks/useComboSystem', () => ({
  useComboSystem: () => ({
    comboLevel: 0,
    comboTimeRemaining: null,
    isDangerState: false,
    maxCombo: 0,
    incrementCombo: jest.fn(),
  }),
}));

jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ isLowEnd: false }),
}));

jest.mock('@/components/singleplayer/game/hooks/useWordSubmission', () => ({
  useWordSubmission: () => ({
    currentFeedback: null,
    handleWordSubmit: jest.fn(),
  }),
}));

jest.mock('@/components/singleplayer/game/hooks/useSpamDetection', () => ({
  useSpamDetection: () => ({}),
}));

jest.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({ checkWord: jest.fn() }),
}));

jest.mock('../hooks/useBlastHint', () => ({
  useBlastHint: () => ({
    hintPath: null,
    hasHintAvailable: false,
    requestHint: jest.fn(),
    clearHint: jest.fn(),
  }),
}));

const mockAllObjectivesComplete = { value: true };
jest.mock('../hooks/useBlastObjectives', () => ({
  useBlastObjectives: () => ({
    objectiveProgress: [],
    allObjectivesComplete: mockAllObjectivesComplete.value,
  }),
}));

jest.mock('@/shared/utils/scoring', () => ({
  getComboMultiplier: () => 1,
}));

const mockBlastReturn: { value: any } = { value: null };
jest.mock('../hooks/useBlastGame', () => ({
  useBlastGame: () => mockBlastReturn.value,
}));

jest.mock('../BlastComboDiscovery', () => ({
  BlastComboDiscovery: () => <div data-testid="blast-combo-discovery" />,
}));

jest.mock('../BlastComboFlash', () => ({
  BlastComboFlash: () => <div data-testid="blast-combo-flash" />,
}));

jest.mock('../BlastGameLayout', () => ({
  BlastGameLayout: () => <div data-testid="blast-game-layout" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDefaultBlastReturn(overrides: any = {}) {
  const { gameState: gsOverrides, ...rest } = overrides;
  return {
    modifiedGrid: [['A', 'B'], ['C', 'D']],
    tileStates: [[
      { row: 0, col: 0, type: 'standard', isCleared: false, activationEffect: null, hitsRemaining: 0 },
      { row: 0, col: 1, type: 'standard', isCleared: false, activationEffect: null, hitsRemaining: 0 },
    ], [
      { row: 1, col: 0, type: 'standard', isCleared: false, activationEffect: null, hitsRemaining: 0 },
      { row: 1, col: 1, type: 'standard', isCleared: false, activationEffect: null, hitsRemaining: 0 },
    ]],
    gameState: {
      score: 0,
      wordsFound: [],
      tilesCleared: 0,
      totalTiles: 4,
      comboCount: 0,
      isComplete: false,
      isDeadEnd: false,
      cascadeChainLevel: 0,
      movesRemaining: 10,
      movesUsed: 0,
      totalMoves: 10,
      bonusMoveScore: 0,
      tileTypeClears: {},
      ...gsOverrides,
    },
    explosions: [],
    scorePopups: [],
    cascadePhase: 'idle',
    cascadeAnimationData: null,
    cascadeChainLevel: 0,
    cascadeHighlightData: null,
    cascadeHighlightPhase: 'idle',
    activeComboFlash: null,
    clearComboFlash: jest.fn(),
    clearTilesForWord: jest.fn(),
    dismissExplosion: jest.fn(),
    dismissScorePopup: jest.fn(),
    shuffleRemainingTiles: jest.fn(),
    endGame: jest.fn(),
    noWordsRemaining: false,
    getResultsData: jest.fn(() => ({ score: 50, wordsFound: ['CAT'] })),
    trackWordFail: jest.fn(),
    triggerComboFlash: jest.fn(),
    setTileStates: jest.fn(),
    addExplosion: jest.fn(),
    addBonusScore: jest.fn(),
    ...rest,
  };
}

const baseConfig = {
  gridSize: 2,
  language: 'en' as const,
  difficulty: 'medium' as const,
  specialTileChance: 0,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BlastGame completion logic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockAllObjectivesComplete.value = true;
    mockBlastReturn.value = makeDefaultBlastReturn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls onGameEnd when isComplete=true but allObjectivesComplete=false (stuck game fix)', () => {
    const onGameEnd = jest.fn();
    mockAllObjectivesComplete.value = false;
    mockBlastReturn.value = makeDefaultBlastReturn({
      gameState: { isComplete: true, tilesCleared: 4, totalTiles: 4, score: 50 },
    });

    render(
      <BlastGameImport
        config={baseConfig}
        onGameEnd={onGameEnd}
        onQuit={jest.fn()}
      />,
    );

    // The effect uses a setTimeout before calling onGameEnd
    act(() => { jest.advanceTimersByTime(3000); });

    expect(onGameEnd).toHaveBeenCalledTimes(1);
  });

  it('calls onWaveComplete when isComplete=true AND allObjectivesComplete=true', () => {
    const onWaveComplete = jest.fn();
    const onGameEnd = jest.fn();
    mockAllObjectivesComplete.value = true;
    mockBlastReturn.value = makeDefaultBlastReturn({
      gameState: { isComplete: true, tilesCleared: 4, totalTiles: 4, score: 100 },
    });

    render(
      <BlastGameImport
        config={baseConfig}
        onWaveComplete={onWaveComplete}
        onGameEnd={onGameEnd}
        onQuit={jest.fn()}
      />,
    );

    act(() => { jest.advanceTimersByTime(3000); });

    expect(onWaveComplete).toHaveBeenCalledTimes(1);
    expect(onGameEnd).not.toHaveBeenCalled();
  });

  it('calls onGameEnd when isDeadEnd=true and objectives not met', () => {
    const onGameEnd = jest.fn();
    mockAllObjectivesComplete.value = false;
    mockBlastReturn.value = makeDefaultBlastReturn({
      gameState: { isDeadEnd: true },
    });

    render(
      <BlastGameImport
        config={baseConfig}
        onGameEnd={onGameEnd}
        onQuit={jest.fn()}
      />,
    );

    act(() => { jest.advanceTimersByTime(1000); });

    expect(onGameEnd).toHaveBeenCalledTimes(1);
  });

  it('calls onWaveComplete when allObjectivesComplete=true even without board clear', () => {
    const onWaveComplete = jest.fn();
    const onGameEnd = jest.fn();
    mockAllObjectivesComplete.value = true;
    // Board NOT cleared (isComplete=false), but objectives ARE met
    mockBlastReturn.value = makeDefaultBlastReturn({
      gameState: { isComplete: false, isDeadEnd: false, tilesCleared: 2, totalTiles: 4, score: 80, wordsFound: ['CAT', 'DOG'] },
    });

    render(
      <BlastGameImport
        config={baseConfig}
        onWaveComplete={onWaveComplete}
        onGameEnd={onGameEnd}
        onQuit={jest.fn()}
      />,
    );

    act(() => { jest.advanceTimersByTime(3000); });

    expect(onWaveComplete).toHaveBeenCalledTimes(1);
    expect(onGameEnd).not.toHaveBeenCalled();
  });

  it('does NOT call onGameEnd when game is still in progress (no objectives met, no board clear)', () => {
    const onGameEnd = jest.fn();
    mockAllObjectivesComplete.value = false;
    mockBlastReturn.value = makeDefaultBlastReturn({
      gameState: { isComplete: false, isDeadEnd: false },
    });

    render(
      <BlastGameImport
        config={baseConfig}
        onGameEnd={onGameEnd}
        onQuit={jest.fn()}
      />,
    );

    act(() => { jest.advanceTimersByTime(5000); });

    expect(onGameEnd).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { BlastGame as BlastGameImport } from '../BlastGame';
