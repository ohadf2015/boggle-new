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

// Mock framer-motion
jest.mock('framer-motion', () => {
  const React = require('react');

  const createMockMotion = (element: string) => {
    const MockComponent = React.forwardRef(
      ({ children, ...props }: any, ref: any) =>
        React.createElement(element, { ...props, ref }, children)
    );
    MockComponent.displayName = `MockMotion${element.charAt(0).toUpperCase() + element.slice(1)}`;
    return MockComponent;
  };

  // Mock MotionValue for useSpring/useTransform
  const createMotionValue = (initial: any) => {
    let currentValue = initial;
    const listeners: ((v: any) => void)[] = [];
    return {
      get: () => currentValue,
      set: (v: any) => {
        currentValue = v;
        listeners.forEach(l => l(v));
      },
      on: (_event: string, callback: (v: any) => void) => {
        listeners.push(callback);
        return () => {
          const idx = listeners.indexOf(callback);
          if (idx !== -1) listeners.splice(idx, 1);
        };
      },
      onChange: (callback: (v: any) => void) => {
        listeners.push(callback);
        return () => {
          const idx = listeners.indexOf(callback);
          if (idx !== -1) listeners.splice(idx, 1);
        };
      },
      current: initial,
    };
  };

  const useSpring = (initial: any) => createMotionValue(typeof initial === 'object' ? 0 : initial);
  const useTransform = (motionValue: any, transformer: (v: any) => any) => {
    const result = createMotionValue(transformer(motionValue.get()));
    return result;
  };

  return {
    motion: {
      div: createMockMotion('div'),
      button: createMockMotion('button'),
      ul: createMockMotion('ul'),
      li: createMockMotion('li'),
      span: createMockMotion('span'),
    },
    AnimatePresence: ({ children }: any) => children,
    useSpring,
    useTransform,
  };
});

// Mock useAdaptiveDifficulty hook
jest.mock('@/hooks/useAdaptiveDifficulty', () => ({
  useAdaptiveDifficulty: () => ({
    tier: 'normal',
    adjustedConfig: {
      world: 1,
      level: 1,
      gridSize: 4,
      timerSeconds: 60,
      objectives: [{ type: 'scoreTarget', target: 100, isPrimary: true }],
      specialTiles: [],
      difficulty: 'EASY',
      chapterNumber: 1,
      levelInChapter: 1,
      isBossLevel: false,
    },
    hintData: { level: 'none' },
    powerUpCooldownMultiplier: 1.0,
    recordCompletion: jest.fn(),
  }),
}));

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
    tilesVersion: 1,
    objectives: [{ type: 'score', target: 100, current: 0, completed: false }],
    timeRemaining: 60,
    canComplete: false,
    isPlaying: true,
    cascadeComplete: true,
    submitWordWithPath: jest.fn(),
    startGame: jest.fn(),
    pauseGame: jest.fn(),
    completeLevel: jest.fn(),
    resetGame: jest.fn(),
    markCascadeComplete: jest.fn(),
    isCascading: false,
    cascadePhase: 'none',
    addTime: jest.fn(),
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
    dir: 'ltr',
    setLanguage: jest.fn(),
  }),
}));

jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    stopMusic: jest.fn(),
    playMusic: jest.fn(),
    pauseMusic: jest.fn(),
    resumeMusic: jest.fn(),
    isPlaying: false,
    currentTrack: null,
  }),
}));

// Mock AdventureThemeContext
jest.mock('@/contexts/AdventureThemeContext', () => {
  const React = require('react');
  const MockAdventureThemeContext = React.createContext({
    worldId: 1,
    level: 1,
    theme: {
      worldId: 1,
      background: {
        baseColor: 'bg-neo-navy',
        layers: [],
        texture: { type: 'none', opacity: 0, blendMode: 'normal' },
        particles: { type: 'leaves', count: 0, colors: [], sizeRange: [2, 4], speed: 1 },
      },
      tiles: {},
      ui: { accentColor: 'neo-lime', textColor: 'neo-white', headerBg: 'bg-neo-navy/80' },
      chapters: [],
      containerClass: 'adventure-world-1',
    },
  });
  return {
    AdventureThemeContext: MockAdventureThemeContext,
    useAdventureTheme: () => ({
      theme: {
        worldId: 1,
        background: {
          baseColor: 'bg-neo-navy',
          layers: [],
          texture: { type: 'none', opacity: 0, blendMode: 'normal' },
          particles: { type: 'leaves', count: 0, colors: [], sizeRange: [2, 4], speed: 1 },
        },
        tiles: {},
        ui: { accentColor: 'neo-lime', textColor: 'neo-white', headerBg: 'bg-neo-navy/80' },
        chapters: [],
        containerClass: 'adventure-world-1',
      },
      worldId: 1,
      level: 1,
      setWorld: jest.fn(),
      setLevel: jest.fn(),
      isTransitioning: false,
      chapter: { id: 1, name: 'Tutorial', levels: [1, 2], starThreshold: 0, accentColor: 'neo-lime' },
    }),
    AdventureThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock SoundEffectsContext
jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playAchievementSound: jest.fn(),
    playSound: jest.fn(),
    playWordSound: jest.fn(),
    playGameStartSound: jest.fn(),
    playGameEndSound: jest.fn(),
    playSoloGameSound: jest.fn(),
  }),
}));

// Mock ProgressionContext - required by AdventureGame
jest.mock('@/contexts/ProgressionContext', () => ({
  useProgression: () => ({
    progression: {
      userId: 'test-user',
      xp: 0,
      currentWorld: 1,
      currentLevel: 1,
      totalStars: 0,
      playerLevel: 1,
      completions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    isLoading: false,
    error: null,
    completeLevel: jest.fn(),
    recordAttempt: jest.fn(),
    isWorldUnlocked: jest.fn(() => true),
    isLevelUnlocked: jest.fn(() => true),
    getWorldStars: jest.fn(() => 0),
    getLevelCompletion: jest.fn(() => undefined),
    getLevelAttempt: jest.fn(() => undefined),
    refreshProgression: jest.fn(),
    attempts: [],
  }),
  ProgressionProvider: ({ children }: { children: React.ReactNode }) => children,
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

jest.mock('../themed/GameplayBackground', () => {
  return function MockGameplayBackground() {
    return <div data-testid="gameplay-background" />;
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

    it('should reserve fixed height for feedback area to prevent layout shift', () => {
      // WHEN
      const { container } = render(
        <AdventureGame
          levelConfig={mockLevelConfig}
          initialGrid={mockInitialGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // THEN - feedback container should have fixed height (responsive: h-6 mobile, sm:h-8 desktop)
      const feedbackContainer = container.querySelector('[data-testid="feedback-container"]');
      expect(feedbackContainer).toHaveClass('h-6');
    });
  });
});
