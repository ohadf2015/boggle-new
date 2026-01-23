/**
 * AdventureGame Layout Stability Tests
 *
 * Tests for ensuring the game layout remains stable when validation
 * feedback appears/disappears.
 */

import React from 'react';
import { render } from '@testing-library/react';
import AdventureGame from '../AdventureGame';
import type { LevelConfig } from '@/types/adventure';

// Mock hooks and dependencies
jest.mock('@/hooks/useAdventureGame', () => ({
  useAdventureGame: () => ({
    gameState: {
      wordsFound: [],
      comboCount: 1,
      score: 0,
      isComplete: false,
      stars: 0,
    },
    tiles: [[
      { id: 'tile-0-0', letter: 'A', type: 'standard', row: 0, col: 0, isCleared: false, isFrozen: false },
      { id: 'tile-0-1', letter: 'B', type: 'standard', row: 0, col: 1, isCleared: false, isFrozen: false },
    ], [
      { id: 'tile-1-0', letter: 'C', type: 'standard', row: 1, col: 0, isCleared: false, isFrozen: false },
      { id: 'tile-1-1', letter: 'D', type: 'standard', row: 1, col: 1, isCleared: false, isFrozen: false },
    ]],
    objectives: [{ type: 'score', target: 100, current: 0, completed: false }],
    timeRemaining: 60,
    canComplete: false,
    isPlaying: true,
    cascadeComplete: true,
    submitWord: jest.fn(),
    startGame: jest.fn(),
    pauseGame: jest.fn(),
    completeLevel: jest.fn(),
    resetGame: jest.fn(),
    markCascadeComplete: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAdventureWordValidation', () => ({
  useAdventureWordValidation: () => ({
    validateWord: jest.fn().mockResolvedValue({ isValid: false, errorKey: 'error.invalid' }),
    isValidating: false,
  }),
}));

jest.mock('@/hooks/useAdventureSelection', () => ({
  useAdventureSelection: () => ({
    selectedIndices: [],
    currentWord: '',
    selectTile: jest.fn(),
    clearSelection: jest.fn(),
    getPath: jest.fn().mockReturnValue([]),
    pathPoints: [],
  }),
}));

jest.mock('@/hooks/useLexiReactions', () => ({
  useLexiReactions: () => ({
    reaction: null,
    dismissReaction: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAdventureMusic', () => ({
  useAdventureMusic: jest.fn(),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    stopMusic: jest.fn(),
    playMusic: jest.fn(),
    isPlaying: false,
  }),
}));

jest.mock('../AdventureGrid', () => {
  return function MockAdventureGrid() {
    return <div data-testid="adventure-grid">Grid</div>;
  };
});

jest.mock('../AdventureObjectives', () => {
  return function MockAdventureObjectives() {
    return <div data-testid="adventure-objectives">Objectives</div>;
  };
});

jest.mock('../AdventureTimer', () => {
  return function MockAdventureTimer() {
    return <div data-testid="adventure-timer">Timer</div>;
  };
});

jest.mock('../LevelCompleteModal', () => {
  return function MockLevelCompleteModal() {
    return null;
  };
});

jest.mock('../LevelEntryOverlay', () => {
  return function MockLevelEntryOverlay() {
    return null;
  };
});

jest.mock('../LexiReaction', () => {
  return function MockLexiReaction() {
    return null;
  };
});

jest.mock('../themed/WorldBackground', () => {
  return function MockWorldBackground() {
    return <div data-testid="world-background" />;
  };
});

jest.mock('@/components/animations', () => ({
  ScorePopupFly: () => null,
}));

// ==============================================
// TEST FIXTURES
// ==============================================

const mockLevelConfig: LevelConfig = {
  level: 1,
  world: 1,
  gridSize: 4,
  objectives: [{ type: 'scoreTarget', target: 100 }],
  timerSeconds: 60,
  specialTiles: [],
  difficulty: 'EASY',
  chapterNumber: 1,
  levelInChapter: 1,
  isBossLevel: false,
};

const mockInitialGrid = [['A', 'B'], ['C', 'D']];

// ==============================================
// TESTS
// ==============================================

describe('AdventureGame Layout Stability', () => {
  describe('Feedback Area Space Reservation', () => {
    it('should always have a feedback container to prevent layout shift', () => {
      // WHEN
      const { container } = render(
        <AdventureGame
          levelConfig={mockLevelConfig}
          initialGrid={mockInitialGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // THEN - feedback container should always exist
      const feedbackContainer = container.querySelector('[data-testid="feedback-container"]');
      expect(feedbackContainer).toBeInTheDocument();
    });

    it('should reserve minimum height for feedback area', () => {
      // WHEN
      const { container } = render(
        <AdventureGame
          levelConfig={mockLevelConfig}
          initialGrid={mockInitialGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // THEN - feedback container should have min-height
      const feedbackContainer = container.querySelector('[data-testid="feedback-container"]');
      expect(feedbackContainer).toHaveClass('min-h-[40px]');
    });
  });
});
