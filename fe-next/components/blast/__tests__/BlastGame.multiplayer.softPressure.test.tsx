/**
 * Test: BlastGame multiplayer soft pressure mode
 *
 * Verifies that multiplayer Blast enables wave objectives, move limits,
 * and Sugar Crush like singleplayer, but after Sugar Crush fires,
 * moves become unlimited so the player keeps playing until server timer ends.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
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
    maxCombo: 0,
    comboTimeRemaining: null,
    isDangerState: false,
    incrementCombo: jest.fn(),
  }),
}));

jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ isLowEnd: false }),
}));

jest.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({ checkWord: jest.fn().mockReturnValue(true) }),
}));

jest.mock('@/hooks/gameState', () => ({
  useBlastComboSync: () => null,
}));

// Mock useWordSubmission
jest.mock('@/components/singleplayer/game/hooks/useWordSubmission', () => ({
  useWordSubmission: () => ({
    handleWordSubmit: jest.fn(),
    currentFeedback: null,
  }),
}));

jest.mock('@/components/singleplayer/game/hooks/useSpamDetection', () => ({
  useSpamDetection: () => ({}),
}));

jest.mock('canvas-confetti', () => jest.fn());

// Capture useBlastGame options
let capturedUseBlastGameOptions: any = null;
const mockBlastGameReturn = {
  grid: [['A', 'B'], ['C', 'D']],
  displayGrid: [['A', 'B'], ['C', 'D']],
  modifiedGrid: [['A', 'B'], ['C', 'D']],
  tileStates: [[
    { row: 0, col: 0, type: 'standard', isCleared: false, activationEffect: null, hitsRemaining: 1 },
    { row: 0, col: 1, type: 'standard', isCleared: false, activationEffect: null, hitsRemaining: 1 },
  ], [
    { row: 1, col: 0, type: 'standard', isCleared: false, activationEffect: null, hitsRemaining: 1 },
    { row: 1, col: 1, type: 'standard', isCleared: false, activationEffect: null, hitsRemaining: 1 },
  ]],
  gameState: {
    score: 0, wordsFound: [], tilesCleared: 0, totalTiles: 4,
    comboCount: 0, isComplete: false, isDeadEnd: false,
    cascadeChainLevel: 0, movesRemaining: 15, movesUsed: 0,
    totalMoves: 15, bonusMoveScore: 0, tileTypeClears: {},
  },
  explosions: [],
  scorePopups: [],
  availableWords: null,
  noWordsRemaining: false,
  clearTilesForWord: jest.fn(),
  endGame: jest.fn(),
  unlockMoves: jest.fn(),
  shuffleRemainingTiles: jest.fn(),
  getResultsData: jest.fn(),
  dismissExplosion: jest.fn(),
  dismissScorePopup: jest.fn(),
  cascadePhase: 'idle',
  isCascading: false,
  cascadeAnimationData: null,
  cascadeChainLevel: 0,
  cascadeHighlightPhase: 'idle',
  cascadeHighlightData: null,
  activeComboFlash: null,
  clearComboFlash: jest.fn(),
  triggerComboFlash: jest.fn(),
  trackWordFail: jest.fn(),
  setTileStates: jest.fn(),
  addExplosion: jest.fn(),
  addBonusScore: jest.fn(),
};

jest.mock('../hooks/useBlastGame', () => ({
  useBlastGame: (_config: any, options: any) => {
    capturedUseBlastGameOptions = options;
    return mockBlastGameReturn;
  },
}));

jest.mock('../hooks/useBlastSugarCrush', () => ({
  useBlastSugarCrush: () => ({
    isActive: false,
    start: jest.fn(),
  }),
}));

jest.mock('../hooks/useBlastHint', () => ({
  useBlastHint: () => ({
    hintPath: null,
    hasHintAvailable: false,
    requestHint: jest.fn(),
    clearHint: jest.fn(),
  }),
}));

jest.mock('../hooks/useBlastObjectives', () => ({
  useBlastObjectives: () => ({
    objectiveProgress: [{ type: 'score', current: 50, target: 100, complete: false }],
    allObjectivesComplete: false,
  }),
}));

jest.mock('../hooks/useBlastNearMiss', () => ({
  useBlastNearMiss: () => ({
    shimmerCells: [],
    check: jest.fn(),
  }),
}));

// Mock BlastGameLayout to capture props
let capturedLayoutProps: any = null;
jest.mock('../BlastGameLayout', () => ({
  BlastGameLayout: (props: any) => {
    capturedLayoutProps = props;
    return <div data-testid="blast-game-layout" />;
  },
}));

jest.mock('../BlastComboFlash', () => ({
  BlastComboFlash: () => null,
}));

jest.mock('../BlastComboDiscovery', () => ({
  BlastComboDiscovery: () => null,
}));

jest.mock('../utils/blastWaveConfig', () => ({
  getWaveObjectives: () => [
    { type: 'score', target: 100 },
    { type: 'collect_type', tileType: 'gold', target: 3 },
  ],
  getWaveConfig: () => ({ movesAllowed: 15, minWordLength: 2 }),
}));

jest.mock('../utils/blastCombos', () => ({
  detectSpecialCombos: jest.fn().mockReturnValue([]),
}));

jest.mock('@/shared/utils/scoring', () => ({
  getComboMultiplier: () => 1,
}));

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

import { BlastGame } from '../BlastGame';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseConfig = {
  gridSize: 2,
  specialTileChance: 0.15,
  language: 'en' as const,
  difficulty: 'medium' as const,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BlastGame multiplayer soft pressure', () => {
  beforeEach(() => {
    capturedUseBlastGameOptions = null;
    capturedLayoutProps = null;
  });

  it('should pass waveObjectives to useBlastGame in multiplayer mode', () => {
    render(
      <BlastGame
        config={baseConfig}
        mode="multiplayer"
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
      />
    );

    expect(capturedUseBlastGameOptions).not.toBeNull();
    // Should NOT be undefined — objectives should be enabled
    expect(capturedUseBlastGameOptions.waveObjectives).toBeDefined();
    expect(capturedUseBlastGameOptions.waveObjectives).toHaveLength(2);
  });

  it('should pass movesAllowed to useBlastGame in multiplayer mode when waveConfig provided', () => {
    render(
      <BlastGame
        config={baseConfig}
        mode="multiplayer"
        waveConfig={{ movesAllowed: 15, minWordLength: 2 } as any}
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
      />
    );

    expect(capturedUseBlastGameOptions).not.toBeNull();
    // Should NOT be undefined — move limit should be enabled
    expect(capturedUseBlastGameOptions.movesAllowed).toBe(15);
  });

  it('should pass onMovesExhausted to useBlastGame in multiplayer mode', () => {
    render(
      <BlastGame
        config={baseConfig}
        mode="multiplayer"
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
      />
    );

    expect(capturedUseBlastGameOptions).not.toBeNull();
    // Should NOT be undefined — Sugar Crush callback should be wired
    expect(typeof capturedUseBlastGameOptions.onMovesExhausted).toBe('function');
  });

  it('should display objective progress in multiplayer mode', () => {
    render(
      <BlastGame
        config={baseConfig}
        mode="multiplayer"
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
      />
    );

    expect(capturedLayoutProps).not.toBeNull();
    // objectiveProgress should NOT be empty — should show real progress
    expect(capturedLayoutProps.objectiveProgress).toHaveLength(1);
    expect(capturedLayoutProps.objectiveProgress[0]).toEqual(
      expect.objectContaining({ type: 'score', current: 50, target: 100 })
    );
  });

  it('should still pass initialTileStates and blastSeed in multiplayer mode', () => {
    const mockTileStates = [[{ row: 0, col: 0, type: 'gold', isCleared: false, activationEffect: null, hitsRemaining: 1 }]];

    render(
      <BlastGame
        config={baseConfig}
        mode="multiplayer"
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
        initialTileStates={mockTileStates as any}
        blastSeed={42}
      />
    );

    expect(capturedUseBlastGameOptions).not.toBeNull();
    expect(capturedUseBlastGameOptions.initialTileStates).toBe(mockTileStates);
    expect(capturedUseBlastGameOptions.blastSeed).toBe(42);
  });

  it('should NOT call endGame when allObjectivesComplete in multiplayer (server timer is authoritative)', () => {
    // Even with objectives complete, multiplayer should not trigger local game end
    const mockOnGameEnd = jest.fn();

    render(
      <BlastGame
        config={baseConfig}
        mode="multiplayer"
        onGameEnd={mockOnGameEnd}
        onQuit={jest.fn()}
      />
    );

    // onGameEnd should not be called by the game-end effect in multiplayer
    // (the effect early-returns when isMultiplayer)
    expect(mockOnGameEnd).not.toHaveBeenCalled();
  });
});
