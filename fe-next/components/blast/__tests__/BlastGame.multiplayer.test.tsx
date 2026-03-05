/**
 * BlastGame multiplayer mode tests.
 * When mode='multiplayer', objectives, sugar crush, and wave logic are skipped.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks (same pattern as BlastGame.completion.test.tsx)
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

const mockUseBlastObjectives = jest.fn((_params?: any) => ({
  objectiveProgress: [],
  allObjectivesComplete: false,
}));
jest.mock('../hooks/useBlastObjectives', () => ({
  useBlastObjectives: (params: any) => mockUseBlastObjectives(params),
}));

jest.mock('@/shared/utils/scoring', () => ({
  getComboMultiplier: () => 1,
}));

const mockBlastReturn: { value: any } = { value: null };
jest.mock('../hooks/useBlastGame', () => ({
  useBlastGame: () => mockBlastReturn.value,
}));

const mockUseSugarCrush = jest.fn(() => ({
  isActive: false,
  start: jest.fn(),
}));
jest.mock('../hooks/useBlastSugarCrush', () => ({
  useBlastSugarCrush: () => mockUseSugarCrush(),
}));

jest.mock('../BlastComboDiscovery', () => ({
  BlastComboDiscovery: () => <div data-testid="blast-combo-discovery" />,
}));

jest.mock('../BlastComboFlash', () => ({
  BlastComboFlash: () => <div data-testid="blast-combo-flash" />,
}));

const capturedLayoutProps: { value: any } = { value: null };
jest.mock('../BlastGameLayout', () => ({
  BlastGameLayout: (props: any) => {
    capturedLayoutProps.value = props;
    return <div data-testid="blast-game-layout" />;
  },
}));

jest.mock('../hooks/useBlastNearMiss', () => ({
  useBlastNearMiss: () => ({ shimmerCells: [], check: jest.fn() }),
}));

jest.mock('@/hooks/gameState', () => ({
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
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
      />
    );

    expect(screen.getByTestId('blast-game-layout')).toBeInTheDocument();
  });

  it('should pass empty objectiveProgress to layout (no objectives in MP)', () => {
    render(
      <BlastGame
        config={baseConfig}
        mode="multiplayer"
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
      />
    );

    // Objectives should be empty arrays/sets — not wired to wave objectives
    expect(capturedLayoutProps.value.objectiveProgress).toEqual([]);
  });

  it('should not trigger onGameEnd from objective completion in multiplayer', () => {
    // In MP, isComplete/isDeadEnd still trigger end, but allObjectivesComplete does not
    const onGameEnd = jest.fn();
    mockBlastReturn.value = makeDefaultBlastReturn({
      gameState: { isComplete: false, isDeadEnd: false },
    });

    render(
      <BlastGame
        config={baseConfig}
        mode="multiplayer"
        onGameEnd={onGameEnd}
        onQuit={jest.fn()}
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
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
      />
    );

    expect(capturedLayoutProps.value.objectiveProgress).toEqual([]);
    expect(capturedLayoutProps.value.objectiveTileTypes.size).toBe(0);
  });

  it('should still render in singleplayer mode (backwards compatible)', () => {
    render(
      <BlastGame
        config={baseConfig}
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
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
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
      />
    );

    expect(capturedLayoutProps.value.isMultiplayer).toBe(true);
  });

  it('should pass isMultiplayer=false to layout in singleplayer mode', () => {
    render(
      <BlastGame
        config={baseConfig}
        mode="singleplayer"
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
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
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
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
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
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
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
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
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
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
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
      />
    );

    // In SP mode, hint props are passed (from the mocked useBlastHint)
    expect(capturedLayoutProps.value.onRequestHint).toBeDefined();
    expect(capturedLayoutProps.value.onClearHint).toBeDefined();
  });
});
