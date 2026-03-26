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

vi.mock('canvas-confetti', () => vi.fn());

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(),
    playComboSound: vi.fn(),
  }),
}));

vi.mock('@/hooks/useComboSystem', () => ({
  useComboSystem: () => ({
    comboLevel: 0,
    comboTimeRemaining: null,
    isDangerState: false,
    maxCombo: 0,
    incrementCombo: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ isLowEnd: false }),
}));

vi.mock('@/components/singleplayer/game/hooks/useWordSubmission', () => ({
  useWordSubmission: () => ({
    currentFeedback: null,
    handleWordSubmit: vi.fn(),
  }),
}));

vi.mock('@/components/singleplayer/game/hooks/useSpamDetection', () => ({
  useSpamDetection: () => ({}),
}));

vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({ checkWord: vi.fn() }),
}));

vi.mock('../hooks/useBlastHint', () => ({
  useBlastHint: () => ({
    hintPath: null,
    hasHintAvailable: false,
    requestHint: vi.fn(),
    clearHint: vi.fn(),
  }),
}));

const mockAllObjectivesComplete = { value: true };
vi.mock('../hooks/useBlastObjectives', () => ({
  useBlastObjectives: () => ({
    objectiveProgress: [],
    allObjectivesComplete: mockAllObjectivesComplete.value,
  }),
}));

vi.mock('@/shared/utils/scoring', () => ({
  getComboMultiplier: () => 1,
}));

const mockBlastReturn: { value: any } = { value: null };
vi.mock('../hooks/useBlastGame', () => ({
  useBlastGame: () => mockBlastReturn.value,
}));

vi.mock('../BlastComboDiscovery', () => ({
  BlastComboDiscovery: () => <div data-testid="blast-combo-discovery" />,
}));

vi.mock('../BlastComboFlash', () => ({
  BlastComboFlash: () => <div data-testid="blast-combo-flash" />,
}));

vi.mock('../BlastGameLayout', () => ({
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
    clearComboFlash: vi.fn(),
    clearTilesForWord: vi.fn(),
    dismissExplosion: vi.fn(),
    dismissScorePopup: vi.fn(),
    shuffleRemainingTiles: vi.fn(),
    endGame: vi.fn(),
    noWordsRemaining: false,
    getResultsData: vi.fn(() => ({ score: 50, wordsFound: ['CAT'] })),
    trackWordFail: vi.fn(),
    triggerComboFlash: vi.fn(),
    setTileStates: vi.fn(),
    addExplosion: vi.fn(),
    addBonusScore: vi.fn(),
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
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockAllObjectivesComplete.value = true;
    mockBlastReturn.value = makeDefaultBlastReturn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onGameEnd when isComplete=true but allObjectivesComplete=false (stuck game fix)', () => {
    const onGameEnd = vi.fn();
    mockAllObjectivesComplete.value = false;
    mockBlastReturn.value = makeDefaultBlastReturn({
      gameState: { isComplete: true, tilesCleared: 4, totalTiles: 4, score: 50 },
    });

    render(
      <BlastGameImport
        config={baseConfig}
        onGameEnd={onGameEnd}
        onQuit={vi.fn()}
      />,
    );

    // The effect uses a setTimeout before calling onGameEnd
    act(() => { vi.advanceTimersByTime(3000); });

    expect(onGameEnd).toHaveBeenCalledTimes(1);
  });

  it('calls onWaveComplete when isComplete=true AND allObjectivesComplete=true', () => {
    const onWaveComplete = vi.fn();
    const onGameEnd = vi.fn();
    mockAllObjectivesComplete.value = true;
    mockBlastReturn.value = makeDefaultBlastReturn({
      gameState: { isComplete: true, tilesCleared: 4, totalTiles: 4, score: 100 },
    });

    render(
      <BlastGameImport
        config={baseConfig}
        onWaveComplete={onWaveComplete}
        onGameEnd={onGameEnd}
        onQuit={vi.fn()}
      />,
    );

    act(() => { vi.advanceTimersByTime(3000); });

    expect(onWaveComplete).toHaveBeenCalledTimes(1);
    expect(onGameEnd).not.toHaveBeenCalled();
  });

  it('calls onGameEnd when isDeadEnd=true and objectives not met', () => {
    const onGameEnd = vi.fn();
    mockAllObjectivesComplete.value = false;
    mockBlastReturn.value = makeDefaultBlastReturn({
      gameState: { isDeadEnd: true },
    });

    render(
      <BlastGameImport
        config={baseConfig}
        onGameEnd={onGameEnd}
        onQuit={vi.fn()}
      />,
    );

    act(() => { vi.advanceTimersByTime(1000); });

    expect(onGameEnd).toHaveBeenCalledTimes(1);
  });

  it('calls onWaveComplete when allObjectivesComplete=true even without board clear', () => {
    const onWaveComplete = vi.fn();
    const onGameEnd = vi.fn();
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
        onQuit={vi.fn()}
      />,
    );

    act(() => { vi.advanceTimersByTime(3000); });

    expect(onWaveComplete).toHaveBeenCalledTimes(1);
    expect(onGameEnd).not.toHaveBeenCalled();
  });

  it('does NOT call onGameEnd when game is still in progress (no objectives met, no board clear)', () => {
    const onGameEnd = vi.fn();
    mockAllObjectivesComplete.value = false;
    mockBlastReturn.value = makeDefaultBlastReturn({
      gameState: { isComplete: false, isDeadEnd: false },
    });

    render(
      <BlastGameImport
        config={baseConfig}
        onGameEnd={onGameEnd}
        onQuit={vi.fn()}
      />,
    );

    act(() => { vi.advanceTimersByTime(5000); });

    expect(onGameEnd).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { BlastGame as BlastGameImport } from '../BlastGame';
