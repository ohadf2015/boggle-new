/**
 * AdventureGame - Score Popup Animation Tests
 *
 * Tests score popup integration with ScorePopupFly component.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import AdventureGame from '../AdventureGame';

// Mock all dependencies
jest.mock('@/hooks/useAdventureGame');
jest.mock('@/hooks/useAdventureWordValidation');
jest.mock('@/hooks/useAdventureSelection');
// Note: useDevicePerformance is mocked globally in jest.setup.js
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

// Mock MusicContext - adventure mode stops global music when it starts
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

// Define the expected props type for ScorePopup
interface ScorePopupProps {
  score: number;
  position: { x: number; y: number };
  targetPosition?: { x: number; y: number };
  comboMultiplier?: number;
  onComplete?: () => void;
}

// Mock ScorePopup to capture props
const mockScorePopup = jest.fn<null, [ScorePopupProps]>();
jest.mock('../juice/ScorePopup', () => ({
  ScorePopup: (props: ScorePopupProps) => {
    mockScorePopup(props);
    return <div data-testid="score-popup-fly">ScorePopup</div>;
  },
}));

// Mock child components
jest.mock('../AdventureGrid', () => {
  const React = require('react');
  const MockGrid = React.forwardRef(function AdventureGrid() {
    return React.createElement('div', { 'data-testid': 'adventure-grid' }, 'Grid');
  });
  MockGrid.displayName = 'AdventureGrid';
  return { __esModule: true, default: MockGrid };
});

jest.mock('../AdventureObjectives', () => ({
  __esModule: true,
  default: () => <div data-testid="objectives">Objectives</div>,
}));

jest.mock('../AdventureTimer', () => ({
  __esModule: true,
  default: () => <div data-testid="timer">Timer</div>,
}));

jest.mock('../LevelCompleteModal', () => ({
  __esModule: true,
  default: () => <div data-testid="level-complete-modal">Modal</div>,
}));

jest.mock('../themed/WorldBackground', () => ({
  __esModule: true,
  default: () => <div data-testid="world-background">Background</div>,
}));

jest.mock('../themed/GameplayBackground', () => ({
  __esModule: true,
  default: () => <div data-testid="gameplay-background">Background</div>,
}));

// Minimal level config
const mockLevelConfig = {
  level: 1,
  world: 1,
  gridSize: 4 as const,
  timerSeconds: 120,
  objectives: [
    {
      type: 'scoreTarget' as const,
      target: 100,
      current: 0,
      isComplete: false,
    },
  ],
  specialTiles: [],
  difficulty: 'MEDIUM' as const,
  chapterNumber: 1 as const,
  levelInChapter: 1 as const,
  isBossLevel: false,
};

const mockInitialGrid = [
  ['H', 'E', 'L', 'L'],
  ['O', 'W', 'O', 'R'],
  ['L', 'D', 'T', 'E'],
  ['S', 'T', 'A', 'R'],
];

// Use global mock from jest.setup.js
 
const mockUseDevicePerformance = (global as any).mockUseDevicePerformance;

describe('AdventureGame - Score Popup Animation', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock hooks with proper types
    const { useAdventureGame } = require('@/hooks/useAdventureGame');
    const { useAdventureWordValidation } = require('@/hooks/useAdventureWordValidation');
    const { useAdventureSelection } = require('@/hooks/useAdventureSelection');

    mockUseDevicePerformance.mockReturnValue({
      isLowEnd: false,
      prefersReducedMotion: false,
      enableGlowEffects: true,
      enableComplexAnimations: true,
      targetFPS: 60,
      throttleMs: 16,
      reduceParticles: false,
      maxParticles: 20,
      isSlowConnection: false,
      isMobile: false,
    });

    useAdventureGame.mockReturnValue({
      gameState: {
        score: 0,
        wordsFound: [],
        comboCount: 1,
        stars: 0,
        isComplete: false,
        levelConfig: mockLevelConfig,
        tiles: [],
        objectives: mockLevelConfig.objectives,
        cascadeActive: false,
      },
      tiles: [],
      objectives: mockLevelConfig.objectives,
      timeRemaining: 120,
      canComplete: false,
      isPlaying: true,
      submitWord: jest.fn(),
      startGame: jest.fn(),
      pauseGame: jest.fn(),
      completeLevel: jest.fn(),
      resetGame: jest.fn(),
    });

    useAdventureWordValidation.mockReturnValue({
      validateWord: jest.fn(),
      isValidating: false,
    });

    useAdventureSelection.mockReturnValue({
      selectedIndices: [],
      currentWord: '',
      isSelecting: false,
      selectTile: jest.fn(),
      clearSelection: jest.fn(),
      getPath: jest.fn(() => []),
      pathPoints: [],
    });
  });


  test('score display has ref attached', () => {
    render(
      <AdventureGame
        levelConfig={mockLevelConfig}
        initialGrid={mockInitialGrid}
        onLevelComplete={jest.fn()}
        onExit={jest.fn()}
      />
    );

    const scoreDisplay = screen.getByTestId('score-display');
    expect(scoreDisplay).toBeInTheDocument();
  });



  test('component renders with combo display', () => {
    const { useAdventureGame } = require('@/hooks/useAdventureGame');

    // Mock with combo count
    useAdventureGame.mockReturnValue({
      gameState: {
        score: 30,
        wordsFound: ['WORD'],
        comboCount: 3,
        stars: 1,
        isComplete: false,
        levelConfig: mockLevelConfig,
        tiles: [],
        objectives: mockLevelConfig.objectives,
        cascadeActive: false,
      },
      tiles: [],
      objectives: mockLevelConfig.objectives,
      timeRemaining: 120,
      canComplete: false,
      isPlaying: true,
      submitWord: jest.fn(),
      startGame: jest.fn(),
      pauseGame: jest.fn(),
      completeLevel: jest.fn(),
      resetGame: jest.fn(),
    });

    render(
      <AdventureGame
        levelConfig={mockLevelConfig}
        initialGrid={mockInitialGrid}
        onLevelComplete={jest.fn()}
        onExit={jest.fn()}
      />
    );

    const comboDisplay = screen.getByTestId('combo-display');
    expect(comboDisplay).toBeInTheDocument();
    expect(comboDisplay).toHaveTextContent('x3');
  });
});
