/**
 * BlastGamePhaser — Phaser-backed blast game variant.
 *
 * Verifies:
 * - Renders BlastGameLayoutPhaser (not BlastGameLayout/BlastGrid)
 * - Calls useBlastBridge to sync state with GameBridge
 * - Returns null when grid is not yet loaded
 * - Passes gameState props to layout
 */

import React from 'react';
import { render } from '@testing-library/react';
import { GameBridge } from '@/lib/phaser/bridge/GameBridge';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock all hooks used by BlastGamePhaser
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
    comboTimeRemaining: null,
    isDangerState: false,
    maxCombo: 0,
    incrementCombo: jest.fn(),
  }),
}));

jest.mock('@/components/singleplayer/game/hooks/useWordSubmission', () => ({
  useWordSubmission: () => ({
    handleWordSubmit: jest.fn(),
    currentFeedback: null,
  }),
}));

jest.mock('@/components/singleplayer/game/hooks/useSpamDetection', () => ({
  useSpamDetection: () => ({
    checkSpam: jest.fn(() => false),
    resetSpam: jest.fn(),
  }),
}));

jest.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({
    checkWord: jest.fn(() => Promise.resolve(false)),
  }),
}));

const mockBlastGame = {
  modifiedGrid: [['A', 'B'], ['C', 'D']],
  tileStates: [[
    { row: 0, col: 0, type: 'standard', isCleared: false, activationEffect: null, hitsRemaining: 0 },
    { row: 0, col: 1, type: 'standard', isCleared: false, activationEffect: null, hitsRemaining: 0 },
  ], [
    { row: 1, col: 0, type: 'standard', isCleared: false, activationEffect: null, hitsRemaining: 0 },
    { row: 1, col: 1, type: 'standard', isCleared: false, activationEffect: null, hitsRemaining: 0 },
  ]],
  gameState: {
    score: 10, wordsFound: ['AB'], tilesCleared: 2, totalTiles: 4,
    comboCount: 0, isComplete: false, isDeadEnd: false, cascadeChainLevel: 0,
  },
  explosions: [],
  scorePopups: [],
  cascadePhase: 'idle' as const,
  cascadeAnimationData: null,
  cascadeChainLevel: 0,
  cascadeHighlightData: null,
  cascadeHighlightPhase: 'idle' as const,
  noWordsRemaining: false,
  clearTilesForWord: jest.fn(),
  dismissExplosion: jest.fn(),
  dismissScorePopup: jest.fn(),
  shuffleRemainingTiles: jest.fn(),
  endGame: jest.fn(),
  getResultsData: jest.fn(() => ({
    finalScore: 10, wordsFound: ['AB'], tilesCleared: 2, totalTiles: 4,
    maxCombo: 0, clearPercentage: 50, longestWord: 'AB',
    wavesCompleted: 0, waveResults: [],
  })),
};

jest.mock('../hooks/useBlastGame', () => ({
  useBlastGame: () => mockBlastGame,
}));

jest.mock('../hooks/useBlastHint', () => ({
  useBlastHint: () => ({
    hintPath: null,
    hasHintAvailable: false,
    requestHint: jest.fn(),
    clearHint: jest.fn(),
  }),
}));

jest.mock('@/shared/utils/scoring', () => ({
  getComboMultiplier: () => 1,
}));

// Mock BlastGameLayoutPhaser to a simple stub
jest.mock('../BlastGameLayoutPhaser', () => ({
  BlastGameLayoutPhaser: (props: Record<string, unknown>) => (
    <div data-testid="blast-game-layout-phaser" data-score={(props.gameState as Record<string, unknown>)?.score} />
  ),
}));

// Mock confetti
jest.mock('canvas-confetti', () => jest.fn());

import { BlastGamePhaser } from '../BlastGamePhaser';

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  GameBridge.reset();
});

afterEach(() => {
  GameBridge.reset();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('BlastGamePhaser', () => {
  const defaultProps = {
    config: {
      gridSize: 4,
      language: 'en' as const,
      difficulty: 'medium' as const,
      specialTileChance: 0.25,
    },
    onGameEnd: jest.fn(),
    onQuit: jest.fn(),
  };

  it('renders BlastGameLayoutPhaser when grid is loaded', () => {
    const { getByTestId } = render(<BlastGamePhaser {...defaultProps} />);
    expect(getByTestId('blast-game-layout-phaser')).toBeInTheDocument();
  });

  it('passes gameState score to layout', () => {
    const { getByTestId } = render(<BlastGamePhaser {...defaultProps} />);
    expect(getByTestId('blast-game-layout-phaser').getAttribute('data-score')).toBe('10');
  });

  it('returns null when grid is not yet loaded', () => {
    // Override modifiedGrid to null
    const origGrid = mockBlastGame.modifiedGrid;
    mockBlastGame.modifiedGrid = null as unknown as string[][];

    const { container } = render(<BlastGamePhaser {...defaultProps} />);
    expect(container.children.length).toBe(0);

    mockBlastGame.modifiedGrid = origGrid;
  });

  it('emits blast:grid:update to bridge on mount', () => {
    jest.spyOn(GameBridge, 'emit');
    render(<BlastGamePhaser {...defaultProps} />);

    expect(GameBridge.emit).toHaveBeenCalledWith(
      'blast:grid:update',
      expect.objectContaining({
        grid: [['A', 'B'], ['C', 'D']],
        comboLevel: 0,
      }),
    );
  });
});
