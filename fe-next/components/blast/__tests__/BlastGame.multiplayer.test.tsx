/**
 * BlastGame multiplayer mode tests.
 * When mode='multiplayer', objectives, sugar crush, and wave logic are skipped.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks (same pattern as BlastGame.completion.test.tsx)
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

const mockUseBlastObjectives = vi.fn((_params?: any) => ({
  objectiveProgress: [],
  allObjectivesComplete: false,
}));
vi.mock('../hooks/useBlastObjectives', () => ({
  useBlastObjectives: (params: any) => mockUseBlastObjectives(params),
}));

vi.mock('@/shared/utils/scoring', () => ({
  getComboMultiplier: () => 1,
}));

const mockBlastReturn: { value: any } = { value: null };
vi.mock('../hooks/useBlastGame', () => ({
  useBlastGame: () => mockBlastReturn.value,
}));

const mockUseSugarCrush = vi.fn(() => ({
  isActive: false,
  start: vi.fn(),
}));
vi.mock('../hooks/useBlastSugarCrush', () => ({
  useBlastSugarCrush: () => mockUseSugarCrush(),
}));

vi.mock('../BlastComboDiscovery', () => ({
  BlastComboDiscovery: () => <div data-testid="blast-combo-discovery" />,
}));

vi.mock('../BlastComboFlash', () => ({
  BlastComboFlash: () => <div data-testid="blast-combo-flash" />,
}));

const capturedLayoutProps: { value: any } = { value: null };
vi.mock('../BlastGameLayout', () => ({
  BlastGameLayout: (props: any) => {
    capturedLayoutProps.value = props;
    return <div data-testid="blast-game-layout" />;
  },
}));

vi.mock('../hooks/useBlastNearMiss', () => ({
  useBlastNearMiss: () => ({ shimmerCells: [], check: vi.fn() }),
}));

vi.mock('@/hooks/gameState', () => ({
  useBlastComboSync: () => null,
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
      score: 0, wordsFound: [], tilesCleared: 0, totalTiles: 4,
      comboCount: 0, isComplete: false, isDeadEnd: false,
      cascadeChainLevel: 0, movesRemaining: Infinity, movesUsed: 0,
      totalMoves: Infinity, bonusMoveScore: 0, tileTypeClears: {},
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
// Import (after mocks)
// ---------------------------------------------------------------------------

import { BlastGame } from '../BlastGame';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BlastGame mode=multiplayer', () => {
  beforeEach(() => {
    mockBlastReturn.value = makeDefaultBlastReturn();
    mockUseBlastObjectives.mockClear();
    mockUseSugarCrush.mockClear();
    capturedLayoutProps.value = null;
  });

  it('should render BlastGameLayout in multiplayer mode', () => {
    render(
      <BlastGame
        config={baseConfig}
        mode="multiplayer"
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
      />
    );

    expect(screen.getByTestId('blast-game-layout')).toBeInTheDocument();
  });

  it('should pass empty objectiveProgress to layout (no objectives in MP)', () => {
    render(
      <BlastGame
        config={baseConfig}
        mode="multiplayer"
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
      />
    );

    // Objectives should be empty arrays/sets — not wired to wave objectives
    expect(capturedLayoutProps.value.objectiveProgress).toEqual([]);
  });

  it('should not trigger onGameEnd from objective completion in multiplayer', () => {
    // In MP, isComplete/isDeadEnd still trigger end, but allObjectivesComplete does not
    const onGameEnd = vi.fn();
    mockBlastReturn.value = makeDefaultBlastReturn({
      gameState: { isComplete: false, isDeadEnd: false },
    });

    render(
      <BlastGame
        config={baseConfig}
        mode="multiplayer"
        onGameEnd={onGameEnd}
        onQuit={vi.fn()}
      />
    );

    // No game end called — game is still active
    expect(onGameEnd).not.toHaveBeenCalled();
  });

  it('should pass empty objectiveProgress and objectiveTileTypes to layout in MP', () => {
    render(
      <BlastGame
        config={baseConfig}
        mode="multiplayer"
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
      />
    );

    expect(capturedLayoutProps.value.objectiveProgress).toEqual([]);
    expect(capturedLayoutProps.value.objectiveTileTypes.size).toBe(0);
  });

  it('should still render in singleplayer mode (backwards compatible)', () => {
    render(
      <BlastGame
        config={baseConfig}
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
      />
    );

    expect(screen.getByTestId('blast-game-layout')).toBeInTheDocument();
    // In SP mode, objectives ARE used
    expect(mockUseBlastObjectives).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Phase 1: MP parity — timer, leaderboard, header fix, hint gating
  // -------------------------------------------------------------------------

  it('should pass isMultiplayer=true to layout in multiplayer mode', () => {
    render(
      <BlastGame
        config={baseConfig}
        mode="multiplayer"
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
      />
    );

    expect(capturedLayoutProps.value.isMultiplayer).toBe(true);
  });

  it('should pass isMultiplayer=false to layout in singleplayer mode', () => {
    render(
      <BlastGame
        config={baseConfig}
        mode="singleplayer"
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
      />
    );

    expect(capturedLayoutProps.value.isMultiplayer).toBe(false);
  });

  it('should pass remainingTime and totalTime to layout when provided', () => {
    render(
      <BlastGame
        config={baseConfig}
        mode="multiplayer"
        remainingTime={45}
        totalTime={120}
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
      />
    );

    expect(capturedLayoutProps.value.remainingTime).toBe(45);
    expect(capturedLayoutProps.value.totalTime).toBe(120);
  });

  it('should pass leaderboard and username to layout when provided', () => {
    const leaderboard = [
      { username: 'alice', score: 100, wordCount: 5 },
      { username: 'bob', score: 80, wordCount: 3 },
    ];

    render(
      <BlastGame
        config={baseConfig}
        mode="multiplayer"
        leaderboard={leaderboard}
        username="alice"
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
      />
    );

    expect(capturedLayoutProps.value.leaderboard).toEqual(leaderboard);
    expect(capturedLayoutProps.value.username).toBe('alice');
  });

  it('should not pass hint props to layout in multiplayer mode', () => {
    render(
      <BlastGame
        config={baseConfig}
        mode="multiplayer"
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
      />
    );

    expect(capturedLayoutProps.value.hintPath).toBeNull();
    expect(capturedLayoutProps.value.hasHintAvailable).toBe(false);
    expect(capturedLayoutProps.value.onRequestHint).toBeUndefined();
    expect(capturedLayoutProps.value.onClearHint).toBeUndefined();
  });

  it('should pass empty objectiveTileTypes even at higher wave numbers in MP', () => {
    // Wave 2+ has collect_type objectives in SP which populate objectiveTileTypes.
    // In MP, these should be suppressed.
    render(
      <BlastGame
        config={baseConfig}
        mode="multiplayer"
        waveNumber={3}
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
      />
    );

    expect(capturedLayoutProps.value.objectiveTileTypes.size).toBe(0);
    expect(capturedLayoutProps.value.objectiveProgress).toEqual([]);
  });

  it('should pass hint props in singleplayer mode', () => {
    render(
      <BlastGame
        config={baseConfig}
        mode="singleplayer"
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
      />
    );

    // In SP mode, hint props are passed (from the mocked useBlastHint)
    expect(capturedLayoutProps.value.onRequestHint).toBeDefined();
    expect(capturedLayoutProps.value.onClearHint).toBeDefined();
  });
});
