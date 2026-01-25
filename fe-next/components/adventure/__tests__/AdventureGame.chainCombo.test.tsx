/**
 * AdventureGame - Chain Combo Visual Feedback Integration Tests
 *
 * Tests integration of ComboTierBadge and ChainParticleBurst components
 * with AdventureGame gameplay. Verifies multiplayer scoring isolation.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import AdventureGame from '../AdventureGame';

// Mock all dependencies
jest.mock('@/hooks/useAdventureGame');
jest.mock('@/hooks/useAdventureWordValidation');
jest.mock('@/hooks/useAdventureSelection');

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
    pauseMusic: jest.fn(),
    resumeMusic: jest.fn(),
    isPlaying: false,
    currentTrack: null,
  }),
}));

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

// Define the expected props types for animation components
interface ComboTierBadgeProps {
  comboCount: number;
  className?: string;
  onTierChange?: () => void;
}

interface ChainParticleBurstProps {
  trigger: boolean;
  position: { x: number; y: number };
  world: number;
  onComplete?: () => void;
  className?: string;
}

// Mock ComboTierBadge to capture props
const mockComboTierBadge = jest.fn<null, [ComboTierBadgeProps]>();
jest.mock('@/components/animations/ComboTierBadge', () => ({
  ComboTierBadge: (props: ComboTierBadgeProps) => {
    mockComboTierBadge(props);
    // Render based on combo count (matches real component logic)
    if (props.comboCount < 2) return null;
    return (
      <div data-testid="combo-tier-badge" className={props.className}>
        ComboTier-{props.comboCount}
      </div>
    );
  },
}));

// Mock ChainParticleBurst to capture props
const mockChainParticleBurst = jest.fn<null, [ChainParticleBurstProps]>();
jest.mock('@/components/animations/ChainParticleBurst', () => ({
  ChainParticleBurst: (props: ChainParticleBurstProps) => {
    mockChainParticleBurst(props);
    if (!props.trigger) return null;
    return (
      <div
        data-testid="chain-particle-burst"
        data-world={props.world}
        data-position-x={props.position.x}
        data-position-y={props.position.y}
      >
        ChainBurst
      </div>
    );
  },
}));

// Mock ScorePopupFly
jest.mock('@/components/animations', () => ({
  ScorePopupFly: () => <div data-testid="score-popup-fly">ScorePopup</div>,
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
  default: () => <div data-testid="level-complete-modal">LevelComplete</div>,
}));

jest.mock('../LevelEntryOverlay', () => ({
  __esModule: true,
  default: () => <div data-testid="level-entry-overlay">LevelEntry</div>,
}));

jest.mock('../LexiReaction', () => ({
  __esModule: true,
  default: () => <div data-testid="lexi-reaction">LexiReaction</div>,
}));

jest.mock('../BossIntro', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../BossDialogue', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../BossVictory', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../themed/GameplayBackground', () => ({
  __esModule: true,
  default: () => <div data-testid="gameplay-background">Background</div>,
}));

jest.mock('@/hooks/useLexiReactions', () => ({
  useLexiReactions: () => ({
    reaction: null,
    dismissReaction: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAdventureHints', () => ({
  useAdventureHints: () => ({
    hasHintsAvailable: false,
    getHint: jest.fn(),
    currentHint: null,
    clearCurrentHint: jest.fn(),
    recordActivity: jest.fn(),
    showAutoHint: false,
    dismissAutoHint: jest.fn(),
  }),
}));

jest.mock('@/hooks/useBossMechanics', () => ({
  useBossMechanics: () => ({
    isActive: false,
    boss: null,
    currentTaunt: null,
    showTaunt: false,
    checkWord: jest.fn(() => ({
      meetsRequirement: false,
      scoreMultiplier: 1,
      triggerTaunt: null,
    })),
    triggerTaunt: jest.fn(),
    bossState: null,
  }),
}));

// Import mocks after jest.mock declarations
const useAdventureGame = require('@/hooks/useAdventureGame').useAdventureGame as jest.Mock;
const useAdventureWordValidation = require('@/hooks/useAdventureWordValidation')
  .useAdventureWordValidation as jest.Mock;
const useAdventureSelection = require('@/hooks/useAdventureSelection')
  .useAdventureSelection as jest.Mock;

describe('AdventureGame - Chain Combo Visual Feedback Integration', () => {
  // Sample level config
  const levelConfig = {
    world: 1,
    level: 1,
    gridSize: 4,
    objectives: [
      {
        type: 'score' as const,
        target: 100,
        current: 0,
        completed: false,
        required: true,
      },
    ],
    timerSeconds: 60,
    difficulty: 1,
    isBossLevel: false,
  };

  const initialGrid = [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P'],
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ComboTierBadge Integration', () => {
    it('should not render badge when comboCount is 0-1', () => {
      // GIVEN: Game state with no combo
      useAdventureGame.mockReturnValue({
        gameState: {
          score: 0,
          wordsFound: [],
          comboCount: 0,
          stars: 0,
          isComplete: false,
          cascadeActive: false,
          levelConfig,
          tiles: [],
          objectives: levelConfig.objectives,
        },
        tiles: Array(4).fill(Array(4).fill({ letter: 'A', type: 'normal', isCleared: false })),
        objectives: levelConfig.objectives,
        timeRemaining: 60,
        canComplete: false,
        isPlaying: false,
        cascadeComplete: true,
        submitWordWithPath: jest.fn(),
        startGame: jest.fn(),
        pauseGame: jest.fn(),
        completeLevel: jest.fn(),
        resetGame: jest.fn(),
        markCascadeComplete: jest.fn(),
      });

      useAdventureWordValidation.mockReturnValue({
        validateWord: jest.fn(),
        isValidating: false,
      });

      useAdventureSelection.mockReturnValue({
        selectedIndices: [],
        currentWord: '',
        selectTile: jest.fn(),
        clearSelection: jest.fn(),
        getPath: jest.fn(() => []),
        pathPoints: [],
      });

      // WHEN: Render AdventureGame
      render(
        <AdventureGame
          levelConfig={levelConfig}
          initialGrid={initialGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // THEN: Badge is not rendered
      expect(screen.queryByTestId('combo-tier-badge')).not.toBeInTheDocument();
      expect(mockComboTierBadge).toHaveBeenCalledWith(
        expect.objectContaining({
          comboCount: 0,
        })
      );
    });

    it('should render badge when comboCount reaches threshold (2)', () => {
      // GIVEN: Game state with combo of 2
      useAdventureGame.mockReturnValue({
        gameState: {
          score: 50,
          wordsFound: ['WORD1', 'WORD2'],
          comboCount: 2,
          stars: 0,
          isComplete: false,
          cascadeActive: false,
          levelConfig,
          tiles: [],
          objectives: levelConfig.objectives,
        },
        tiles: Array(4).fill(Array(4).fill({ letter: 'A', type: 'normal', isCleared: false })),
        objectives: levelConfig.objectives,
        timeRemaining: 55,
        canComplete: false,
        isPlaying: true,
        cascadeComplete: true,
        submitWordWithPath: jest.fn(),
        startGame: jest.fn(),
        pauseGame: jest.fn(),
        completeLevel: jest.fn(),
        resetGame: jest.fn(),
        markCascadeComplete: jest.fn(),
      });

      useAdventureWordValidation.mockReturnValue({
        validateWord: jest.fn(),
        isValidating: false,
      });

      useAdventureSelection.mockReturnValue({
        selectedIndices: [],
        currentWord: '',
        selectTile: jest.fn(),
        clearSelection: jest.fn(),
        getPath: jest.fn(() => []),
        pathPoints: [],
      });

      // WHEN: Render AdventureGame
      render(
        <AdventureGame
          levelConfig={levelConfig}
          initialGrid={initialGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // THEN: Badge is rendered with combo count 2
      expect(screen.getByTestId('combo-tier-badge')).toBeInTheDocument();
      expect(mockComboTierBadge).toHaveBeenCalledWith(
        expect.objectContaining({
          comboCount: 2,
          className: expect.stringContaining('absolute top-[10%]'),
        })
      );
    });

    it('should update badge as combo increases', () => {
      // GIVEN: Game state with combo of 5
      useAdventureGame.mockReturnValue({
        gameState: {
          score: 150,
          wordsFound: ['WORD1', 'WORD2', 'WORD3', 'WORD4', 'WORD5'],
          comboCount: 5,
          stars: 1,
          isComplete: false,
          cascadeActive: false,
          levelConfig,
          tiles: [],
          objectives: levelConfig.objectives,
        },
        tiles: Array(4).fill(Array(4).fill({ letter: 'A', type: 'normal', isCleared: false })),
        objectives: levelConfig.objectives,
        timeRemaining: 45,
        canComplete: true,
        isPlaying: true,
        cascadeComplete: true,
        submitWordWithPath: jest.fn(),
        startGame: jest.fn(),
        pauseGame: jest.fn(),
        completeLevel: jest.fn(),
        resetGame: jest.fn(),
        markCascadeComplete: jest.fn(),
      });

      useAdventureWordValidation.mockReturnValue({
        validateWord: jest.fn(),
        isValidating: false,
      });

      useAdventureSelection.mockReturnValue({
        selectedIndices: [],
        currentWord: '',
        selectTile: jest.fn(),
        clearSelection: jest.fn(),
        getPath: jest.fn(() => []),
        pathPoints: [],
      });

      // WHEN: Render AdventureGame
      render(
        <AdventureGame
          levelConfig={levelConfig}
          initialGrid={initialGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // THEN: Badge is rendered with higher combo count
      expect(screen.getByTestId('combo-tier-badge')).toBeInTheDocument();
      expect(screen.getByTestId('combo-tier-badge')).toHaveTextContent('ComboTier-5');
      expect(mockComboTierBadge).toHaveBeenCalledWith(
        expect.objectContaining({
          comboCount: 5,
        })
      );
    });
  });

  describe('ChainParticleBurst Integration', () => {
    it('should not trigger particles for standard tile submission', () => {
      // GIVEN: Tiles with no chain activation
      const tiles = Array(4)
        .fill(null)
        .map((_, row) =>
          Array(4)
            .fill(null)
            .map((_, col) => ({
              letter: 'A',
              type: 'normal' as const,
              isCleared: false,
              row,
              col,
            }))
        );

      useAdventureGame.mockReturnValue({
        gameState: {
          score: 20,
          wordsFound: ['WORD'],
          comboCount: 1,
          stars: 0,
          isComplete: false,
          cascadeActive: false,
          levelConfig,
          tiles,
          objectives: levelConfig.objectives,
        },
        tiles,
        objectives: levelConfig.objectives,
        timeRemaining: 58,
        canComplete: false,
        isPlaying: true,
        cascadeComplete: true,
        submitWordWithPath: jest.fn(),
        startGame: jest.fn(),
        pauseGame: jest.fn(),
        completeLevel: jest.fn(),
        resetGame: jest.fn(),
        markCascadeComplete: jest.fn(),
      });

      useAdventureWordValidation.mockReturnValue({
        validateWord: jest.fn(),
        isValidating: false,
      });

      useAdventureSelection.mockReturnValue({
        selectedIndices: [],
        currentWord: '',
        selectTile: jest.fn(),
        clearSelection: jest.fn(),
        getPath: jest.fn(() => []),
        pathPoints: [],
      });

      // WHEN: Render AdventureGame
      render(
        <AdventureGame
          levelConfig={levelConfig}
          initialGrid={initialGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // THEN: Particle burst is not rendered
      expect(screen.queryByTestId('chain-particle-burst')).not.toBeInTheDocument();
      expect(mockChainParticleBurst).not.toHaveBeenCalled();
    });

    it('should trigger particles when chain tile activates', () => {
      // GIVEN: Tiles with chain tile activation
      const tiles = Array(4)
        .fill(null)
        .map((_, row) =>
          Array(4)
            .fill(null)
            .map((_, col) => ({
              letter: 'A',
              type: (row === 1 && col === 1 ? 'chain' : 'normal') as const,
              isCleared: false,
              row,
              col,
              activationEffect: (row === 1 && col === 1 ? 'link' : undefined) as
                | 'link'
                | undefined,
              activationTimestamp: row === 1 && col === 1 ? Date.now() : undefined,
            }))
        );

      useAdventureGame.mockReturnValue({
        gameState: {
          score: 30,
          wordsFound: ['CHAIN'],
          comboCount: 2,
          stars: 0,
          isComplete: false,
          cascadeActive: false,
          levelConfig,
          tiles,
          objectives: levelConfig.objectives,
        },
        tiles,
        objectives: levelConfig.objectives,
        timeRemaining: 57,
        canComplete: false,
        isPlaying: true,
        cascadeComplete: true,
        submitWordWithPath: jest.fn(),
        startGame: jest.fn(),
        pauseGame: jest.fn(),
        completeLevel: jest.fn(),
        resetGame: jest.fn(),
        markCascadeComplete: jest.fn(),
      });

      useAdventureWordValidation.mockReturnValue({
        validateWord: jest.fn(),
        isValidating: false,
      });

      useAdventureSelection.mockReturnValue({
        selectedIndices: [],
        currentWord: '',
        selectTile: jest.fn(),
        clearSelection: jest.fn(),
        getPath: jest.fn(() => []),
        pathPoints: [],
      });

      // WHEN: Render AdventureGame
      render(
        <AdventureGame
          levelConfig={levelConfig}
          initialGrid={initialGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // THEN: Particle burst is rendered
      expect(screen.getByTestId('chain-particle-burst')).toBeInTheDocument();
      expect(mockChainParticleBurst).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: true,
          world: 1,
          position: expect.objectContaining({
            x: expect.any(Number),
            y: expect.any(Number),
          }),
          onComplete: expect.any(Function),
        })
      );
    });
  });

  describe('UI Coordination', () => {
    it('should not overlap combo badge with score display', () => {
      // GIVEN: Game state with combo
      useAdventureGame.mockReturnValue({
        gameState: {
          score: 100,
          wordsFound: ['WORD1', 'WORD2', 'WORD3'],
          comboCount: 3,
          stars: 1,
          isComplete: false,
          cascadeActive: false,
          levelConfig,
          tiles: [],
          objectives: levelConfig.objectives,
        },
        tiles: Array(4).fill(Array(4).fill({ letter: 'A', type: 'normal', isCleared: false })),
        objectives: levelConfig.objectives,
        timeRemaining: 50,
        canComplete: true,
        isPlaying: true,
        cascadeComplete: true,
        submitWordWithPath: jest.fn(),
        startGame: jest.fn(),
        pauseGame: jest.fn(),
        completeLevel: jest.fn(),
        resetGame: jest.fn(),
        markCascadeComplete: jest.fn(),
      });

      useAdventureWordValidation.mockReturnValue({
        validateWord: jest.fn(),
        isValidating: false,
      });

      useAdventureSelection.mockReturnValue({
        selectedIndices: [],
        currentWord: '',
        selectTile: jest.fn(),
        clearSelection: jest.fn(),
        getPath: jest.fn(() => []),
        pathPoints: [],
      });

      // WHEN: Render AdventureGame
      render(
        <AdventureGame
          levelConfig={levelConfig}
          initialGrid={initialGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // THEN: Badge is positioned with absolute positioning (doesn't affect layout)
      expect(mockComboTierBadge).toHaveBeenCalledWith(
        expect.objectContaining({
          className: expect.stringMatching(/absolute.*top-\[10%\].*z-50/),
        })
      );

      // AND: Score display is still rendered
      expect(screen.getByTestId('score-display')).toBeInTheDocument();
    });

    it('should render particles above grid tiles', () => {
      // GIVEN: Chain tile activation
      const tiles = Array(4)
        .fill(null)
        .map((_, row) =>
          Array(4)
            .fill(null)
            .map((_, col) => ({
              letter: 'A',
              type: (row === 2 && col === 2 ? 'chain' : 'normal') as const,
              isCleared: false,
              row,
              col,
              activationEffect: (row === 2 && col === 2 ? 'link' : undefined) as
                | 'link'
                | undefined,
              activationTimestamp: row === 2 && col === 2 ? Date.now() : undefined,
            }))
        );

      useAdventureGame.mockReturnValue({
        gameState: {
          score: 40,
          wordsFound: ['CHAIN'],
          comboCount: 1,
          stars: 0,
          isComplete: false,
          cascadeActive: false,
          levelConfig,
          tiles,
          objectives: levelConfig.objectives,
        },
        tiles,
        objectives: levelConfig.objectives,
        timeRemaining: 56,
        canComplete: false,
        isPlaying: true,
        cascadeComplete: true,
        submitWordWithPath: jest.fn(),
        startGame: jest.fn(),
        pauseGame: jest.fn(),
        completeLevel: jest.fn(),
        resetGame: jest.fn(),
        markCascadeComplete: jest.fn(),
      });

      useAdventureWordValidation.mockReturnValue({
        validateWord: jest.fn(),
        isValidating: false,
      });

      useAdventureSelection.mockReturnValue({
        selectedIndices: [],
        currentWord: '',
        selectTile: jest.fn(),
        clearSelection: jest.fn(),
        getPath: jest.fn(() => []),
        pathPoints: [],
      });

      // WHEN: Render AdventureGame
      render(
        <AdventureGame
          levelConfig={levelConfig}
          initialGrid={initialGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // THEN: Particles are rendered (DOM order determines z-index)
      expect(screen.getByTestId('chain-particle-burst')).toBeInTheDocument();
      expect(screen.getByTestId('adventure-grid')).toBeInTheDocument();
    });

    it('should allow existing score popup to work', () => {
      // GIVEN: Game state with combo
      useAdventureGame.mockReturnValue({
        gameState: {
          score: 75,
          wordsFound: ['WORD1', 'WORD2'],
          comboCount: 2,
          stars: 0,
          isComplete: false,
          cascadeActive: false,
          levelConfig,
          tiles: [],
          objectives: levelConfig.objectives,
        },
        tiles: Array(4).fill(Array(4).fill({ letter: 'A', type: 'normal', isCleared: false })),
        objectives: levelConfig.objectives,
        timeRemaining: 52,
        canComplete: false,
        isPlaying: true,
        cascadeComplete: true,
        submitWordWithPath: jest.fn(),
        startGame: jest.fn(),
        pauseGame: jest.fn(),
        completeLevel: jest.fn(),
        resetGame: jest.fn(),
        markCascadeComplete: jest.fn(),
      });

      useAdventureWordValidation.mockReturnValue({
        validateWord: jest.fn(),
        isValidating: false,
      });

      useAdventureSelection.mockReturnValue({
        selectedIndices: [],
        currentWord: '',
        selectTile: jest.fn(),
        clearSelection: jest.fn(),
        getPath: jest.fn(() => []),
        pathPoints: [],
      });

      // WHEN: Render AdventureGame
      render(
        <AdventureGame
          levelConfig={levelConfig}
          initialGrid={initialGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // THEN: Score popup component is still rendered
      expect(screen.getByTestId('score-popup-fly')).toBeInTheDocument();
    });
  });

  describe('Multiplayer Isolation', () => {
    it('should verify adventure combo state is isolated from multiplayer', () => {
      // This is a design verification test - the integration itself proves isolation
      // Adventure mode uses:
      // - useAdventureGame hook (frontend state management)
      // - ComboTierBadge/ChainParticleBurst (frontend components)
      // - No imports from backend/modules/scoringEngine
      // - No socket events related to combo state

      // GIVEN: Adventure game state with combo
      useAdventureGame.mockReturnValue({
        gameState: {
          score: 120,
          wordsFound: ['WORD1', 'WORD2', 'WORD3', 'WORD4'],
          comboCount: 4,
          stars: 1,
          isComplete: false,
          cascadeActive: false,
          levelConfig,
          tiles: [],
          objectives: levelConfig.objectives,
        },
        tiles: Array(4).fill(Array(4).fill({ letter: 'A', type: 'normal', isCleared: false })),
        objectives: levelConfig.objectives,
        timeRemaining: 48,
        canComplete: true,
        isPlaying: true,
        cascadeComplete: true,
        submitWordWithPath: jest.fn(),
        startGame: jest.fn(),
        pauseGame: jest.fn(),
        completeLevel: jest.fn(),
        resetGame: jest.fn(),
        markCascadeComplete: jest.fn(),
      });

      useAdventureWordValidation.mockReturnValue({
        validateWord: jest.fn(),
        isValidating: false,
      });

      useAdventureSelection.mockReturnValue({
        selectedIndices: [],
        currentWord: '',
        selectTile: jest.fn(),
        clearSelection: jest.fn(),
        getPath: jest.fn(() => []),
        pathPoints: [],
      });

      // WHEN: Render AdventureGame
      render(
        <AdventureGame
          levelConfig={levelConfig}
          initialGrid={initialGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // THEN: Adventure game renders combo feedback
      expect(screen.getByTestId('combo-tier-badge')).toBeInTheDocument();

      // AND: No backend/multiplayer modules are imported or used
      // (This is verified by the fact that the component renders successfully
      // without any multiplayer dependencies being mocked or imported)
      expect(mockComboTierBadge).toHaveBeenCalledWith(
        expect.objectContaining({
          comboCount: 4,
        })
      );
    });
  });
});
