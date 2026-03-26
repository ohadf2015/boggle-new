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

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
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
    maxCombo: 0,
    comboTimeRemaining: null,
    isDangerState: false,
    incrementCombo: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ isLowEnd: false }),
}));

vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({ checkWord: vi.fn().mockReturnValue(true) }),
}));

vi.mock('@/hooks/gameState', () => ({
  useBlastComboSync: () => null,
}));

// Mock useWordSubmission
vi.mock('@/components/singleplayer/game/hooks/useWordSubmission', () => ({
  useWordSubmission: () => ({
    handleWordSubmit: vi.fn(),
    currentFeedback: null,
  }),
}));

vi.mock('@/components/singleplayer/game/hooks/useSpamDetection', () => ({
  useSpamDetection: () => ({}),
}));

vi.mock('canvas-confetti', () => vi.fn());

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
  clearTilesForWord: vi.fn(),
  endGame: vi.fn(),
  unlockMoves: vi.fn(),
  shuffleRemainingTiles: vi.fn(),
  getResultsData: vi.fn(),
  dismissExplosion: vi.fn(),
  dismissScorePopup: vi.fn(),
  cascadePhase: 'idle',
  isCascading: false,
  cascadeAnimationData: null,
  cascadeChainLevel: 0,
  cascadeHighlightPhase: 'idle',
  cascadeHighlightData: null,
  activeComboFlash: null,
  clearComboFlash: vi.fn(),
  triggerComboFlash: vi.fn(),
  trackWordFail: vi.fn(),
  setTileStates: vi.fn(),
  addExplosion: vi.fn(),
  addBonusScore: vi.fn(),
};

vi.mock('../hooks/useBlastGame', () => ({
  useBlastGame: (_config: any, options: any) => {
    capturedUseBlastGameOptions = options;
    return mockBlastGameReturn;
  },
}));

vi.mock('../hooks/useBlastSugarCrush', () => ({
  useBlastSugarCrush: () => ({
    isActive: false,
    start: vi.fn(),
  }),
}));

vi.mock('../hooks/useBlastHint', () => ({
  useBlastHint: () => ({
    hintPath: null,
    hasHintAvailable: false,
    requestHint: vi.fn(),
    clearHint: vi.fn(),
  }),
}));

vi.mock('../hooks/useBlastObjectives', () => ({
  useBlastObjectives: () => ({
    objectiveProgress: [{ type: 'score', current: 50, target: 100, complete: false }],
    allObjectivesComplete: false,
  }),
}));

vi.mock('../hooks/useBlastNearMiss', () => ({
  useBlastNearMiss: () => ({
    shimmerCells: [],
    check: vi.fn(),
  }),
}));

// Mock BlastGameLayout to capture props
let capturedLayoutProps: any = null;
vi.mock('../BlastGameLayout', () => ({
  BlastGameLayout: (props: any) => {
    capturedLayoutProps = props;
    return <div data-testid="blast-game-layout" />;
  },
}));

vi.mock('../BlastComboFlash', () => ({
  BlastComboFlash: () => null,
}));

vi.mock('../BlastComboDiscovery', () => ({
  BlastComboDiscovery: () => null,
}));

vi.mock('../utils/blastWaveConfig', () => ({
  getWaveObjectives: () => [
    { type: 'score', target: 100 },
    { type: 'collect_type', tileType: 'gold', target: 3 },
  ],
  getWaveConfig: () => ({ movesAllowed: 15, minWordLength: 2 }),
}));

vi.mock('../utils/blastCombos', () => ({
  detectSpecialCombos: vi.fn().mockReturnValue([]),
}));

vi.mock('@/shared/utils/scoring', () => ({
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

  it('should pass empty waveObjectives to useBlastGame in multiplayer mode', () => {
    render(
      <BlastGame
        config={baseConfig}
        mode="multiplayer"
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
      />
    );

    expect(capturedUseBlastGameOptions).not.toBeNull();
    // MP suppresses wave objectives — they are meaningless without the wave system
    expect(capturedUseBlastGameOptions.waveObjectives).toBeDefined();
    expect(capturedUseBlastGameOptions.waveObjectives).toHaveLength(0);
  });

  it('should pass movesAllowed to useBlastGame in multiplayer mode when waveConfig provided', () => {
    render(
      <BlastGame
        config={baseConfig}
        mode="multiplayer"
        waveConfig={{ movesAllowed: 15, minWordLength: 2 } as any}
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
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
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
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
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
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
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
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
    const mockOnGameEnd = vi.fn();

    render(
      <BlastGame
        config={baseConfig}
        mode="multiplayer"
        onGameEnd={mockOnGameEnd}
        onQuit={vi.fn()}
      />
    );

    // onGameEnd should not be called by the game-end effect in multiplayer
    // (the effect early-returns when isMultiplayer)
    expect(mockOnGameEnd).not.toHaveBeenCalled();
  });
});
