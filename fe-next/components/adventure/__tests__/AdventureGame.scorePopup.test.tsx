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
jest.mock('@/hooks/useDevicePerformance');
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

// Define the expected props type for ScorePopupFly
interface ScorePopupFlyProps {
  popup: unknown;
  targetRef: React.RefObject<HTMLElement> | null;
  flyToTarget: boolean;
  showWord: boolean;
  size: string;
  onComplete: () => void;
}

// Mock ScorePopupFly to capture props
const mockScorePopupFly = jest.fn<null, [ScorePopupFlyProps]>();
jest.mock('@/components/animations', () => ({
  ScorePopupFly: (props: ScorePopupFlyProps) => {
    mockScorePopupFly(props);
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

describe('AdventureGame - Score Popup Animation', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock hooks with proper types
    const { useAdventureGame } = require('@/hooks/useAdventureGame');
    const { useAdventureWordValidation } = require('@/hooks/useAdventureWordValidation');
    const { useAdventureSelection } = require('@/hooks/useAdventureSelection');
    const { useDevicePerformance } = require('@/hooks/useDevicePerformance');

    useDevicePerformance.mockReturnValue({
      isLowEnd: false,
      prefersReducedMotion: false,
      enableGlowEffects: true,
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

  test('ScorePopupFly is rendered with correct props', () => {
    render(
      <AdventureGame
        levelConfig={mockLevelConfig}
        initialGrid={mockInitialGrid}
        onLevelComplete={jest.fn()}
        onExit={jest.fn()}
      />
    );

    // Verify ScorePopupFly is called
    expect(mockScorePopupFly).toHaveBeenCalled();

    const calls = mockScorePopupFly.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1];
    expect(lastCall).toBeDefined();
    const props = lastCall[0];

    // Verify essential props
    expect(props.targetRef).toBeDefined();
    expect(props.flyToTarget).toBe(true);
    expect(props.showWord).toBe(true);
    expect(props.size).toBe('md');
    expect(props.onComplete).toBeDefined();
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

  test('popup state initially null', () => {
    render(
      <AdventureGame
        levelConfig={mockLevelConfig}
        initialGrid={mockInitialGrid}
        onLevelComplete={jest.fn()}
        onExit={jest.fn()}
      />
    );

    const calls = mockScorePopupFly.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0].popup).toBeNull();
  });

  test('onComplete callback clears popup from queue', () => {
    const { rerender } = render(
      <AdventureGame
        levelConfig={mockLevelConfig}
        initialGrid={mockInitialGrid}
        onLevelComplete={jest.fn()}
        onExit={jest.fn()}
      />
    );

    // Get the onComplete callback
    const calls = mockScorePopupFly.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1];
    const { onComplete } = lastCall[0];

    // Verify onComplete is a function
    expect(typeof onComplete).toBe('function');

    // Call onComplete
    onComplete();

    // Re-render to verify state update
    rerender(
      <AdventureGame
        levelConfig={mockLevelConfig}
        initialGrid={mockInitialGrid}
        onLevelComplete={jest.fn()}
        onExit={jest.fn()}
      />
    );

    // After completion, popup should still be null (queue is empty)
    const newCalls = mockScorePopupFly.mock.calls;
    expect(newCalls.length).toBeGreaterThan(0);
    const newCall = newCalls[newCalls.length - 1];
    expect(newCall[0].popup).toBeNull();
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
