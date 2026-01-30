/**
 * AdventureGame Meta-Progression Integration Tests
 *
 * Tests the integration of meta-progression systems:
 * - XP system integration
 * - Currency system integration
 * - Game juice integration (screen shake, particles, score popups)
 * - Upgrade effects integration
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdventureGame from '../AdventureGame';
import type { LevelConfig } from '@/types/adventure';
import { useAdventureXp } from '@/hooks/useAdventureXp';
import { useAdventureCurrency } from '@/hooks/useAdventureCurrency';
import { useScreenShake } from '@/hooks/useScreenShake';
import { useParticleBudget } from '@/hooks/useParticleBudget';

// Mock all dependencies
jest.mock('@/hooks/useAdventureXp');
jest.mock('@/hooks/useAdventureCurrency');
jest.mock('@/hooks/useScreenShake');
jest.mock('@/hooks/useParticleBudget');
jest.mock('@/hooks/useAdventureWordValidation');
jest.mock('@/hooks/useAdventureGame');
jest.mock('@/hooks/useAdventureSelection');
jest.mock('@/hooks/useAdventureHints');
jest.mock('@/hooks/useBossMechanics');
jest.mock('@/hooks/useBossHealth');
jest.mock('@/hooks/useLexiReactions');
jest.mock('@/contexts/LanguageContext');
jest.mock('@/contexts/ProgressionContext');
jest.mock('@/contexts/AdventureThemeContext');
jest.mock('@/utils/confettiUtils');

// Mock child components to focus on meta-progression integration
jest.mock('../AdventureGrid', () => ({
  __esModule: true,
  default: () => <div data-testid="adventure-grid">Grid</div>,
}));

jest.mock('../AdventureObjectives', () => ({
  __esModule: true,
  default: () => <div data-testid="adventure-objectives">Objectives</div>,
}));

jest.mock('../AdventureTimer', () => ({
  __esModule: true,
  default: () => <div data-testid="adventure-timer">Timer</div>,
}));

jest.mock('../LevelCompleteModal', () => ({
  __esModule: true,
  default: () => <div data-testid="level-complete-modal">Modal</div>,
}));

jest.mock('../LevelEntryOverlay', () => ({
  __esModule: true,
  default: () => <div data-testid="level-entry-overlay">Entry</div>,
}));

jest.mock('../LexiReaction', () => ({
  __esModule: true,
  default: () => <div data-testid="lexi-reaction">Lexi</div>,
}));

jest.mock('../boss', () => ({
  BossOverlay: () => <div data-testid="boss-overlay">Boss</div>,
}));

jest.mock('../themed/GameplayBackground', () => ({
  __esModule: true,
  default: () => <div data-testid="gameplay-background">Background</div>,
}));

jest.mock('@/components/animations', () => ({
  ScorePopupFly: () => <div data-testid="score-popup">Score</div>,
  ComboTierBadge: () => <div data-testid="combo-tier-badge">Combo</div>,
  ChainParticleBurst: () => <div data-testid="chain-particle-burst">Particles</div>,
}));

const mockUseAdventureXp = useAdventureXp as jest.MockedFunction<typeof useAdventureXp>;
const mockUseAdventureCurrency = useAdventureCurrency as jest.MockedFunction<typeof useAdventureCurrency>;
const mockUseScreenShake = useScreenShake as jest.MockedFunction<typeof useScreenShake>;
const mockUseParticleBudget = useParticleBudget as jest.MockedFunction<typeof useParticleBudget>;

// Base level config
const mockLevelConfig: LevelConfig = {
  world: 1,
  level: 1,
  gridSize: 4,
  timerSeconds: 120,
  objectives: [
    { type: 'scoreTarget', target: 500 },
  ],
  minWordLength: 2,
  isBossLevel: false,
};

// Base grid
const mockInitialGrid = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

describe('AdventureGame - Meta-Progression Integration', () => {
  beforeEach(() => {
    // Mock LanguageContext
    jest.requireMock('@/contexts/LanguageContext').useLanguage.mockReturnValue({
      t: (key: string) => key,
      language: 'en',
    });

    // Mock ProgressionContext
    jest.requireMock('@/contexts/ProgressionContext').useProgression.mockReturnValue({
      recordAttempt: jest.fn(),
      getLevelAttempt: jest.fn(() => null),
    });

    // Mock AdventureThemeContext
    jest.requireMock('@/contexts/AdventureThemeContext').useAdventureTheme.mockReturnValue({
      currentWorld: 1,
      currentTheme: { id: 1, name: 'Forest' },
    });

    // Mock useAdventureGame
    jest.requireMock('@/hooks/useAdventureGame').useAdventureGame.mockReturnValue({
      gameState: {
        score: 0,
        wordsFound: [],
        comboCount: 1,
        stars: 0,
        isComplete: false,
      },
      tiles: mockInitialGrid.map(row => row.map(letter => ({
        letter,
        type: 'normal' as const,
        isCleared: false,
        isFrozen: false,
        isChained: false,
      }))),
      objectives: mockLevelConfig.objectives,
      timeRemaining: 120,
      canComplete: false,
      isPlaying: false,
      cascadeComplete: false,
      submitWordWithPath: jest.fn(),
      startGame: jest.fn(),
      pauseGame: jest.fn(),
      completeLevel: jest.fn(),
      resetGame: jest.fn(),
      markCascadeComplete: jest.fn(),
    });

    // Mock useAdventureSelection
    jest.requireMock('@/hooks/useAdventureSelection').useAdventureSelection.mockReturnValue({
      selectedIndices: [],
      currentWord: '',
      selectTile: jest.fn(),
      clearSelection: jest.fn(),
      getPath: jest.fn(() => []),
      pathPoints: [],
    });

    // Mock useAdventureWordValidation
    jest.requireMock('@/hooks/useAdventureWordValidation').useAdventureWordValidation.mockReturnValue({
      validateWord: jest.fn(),
      isValidating: false,
    });

    // Mock useAdventureHints
    jest.requireMock('@/hooks/useAdventureHints').useAdventureHints.mockReturnValue({
      hasHintsAvailable: false,
      getHint: jest.fn(),
      currentHint: null,
      clearCurrentHint: jest.fn(),
      recordActivity: jest.fn(),
      showAutoHint: false,
      dismissAutoHint: jest.fn(),
    });

    // Mock useBossMechanics
    jest.requireMock('@/hooks/useBossMechanics').useBossMechanics.mockReturnValue({
      isActive: false,
      boss: null,
      currentTaunt: null,
      showTaunt: false,
      checkWord: jest.fn(() => ({ scoreMultiplier: 1, meetsRequirement: false })),
      triggerTaunt: jest.fn(),
      bossState: 'intro',
    });

    // Mock useBossHealth
    jest.requireMock('@/hooks/useBossHealth').useBossHealth.mockReturnValue({
      healthState: { current: 100, max: 100, phase: 'active' },
      dealDamage: jest.fn(),
      startBattle: jest.fn(),
      endBattle: jest.fn(),
      resetHealth: jest.fn(),
      hpPercentage: 100,
      isEnraged: false,
    });

    // Mock useLexiReactions
    jest.requireMock('@/hooks/useLexiReactions').useLexiReactions.mockReturnValue({
      reaction: null,
      dismissReaction: jest.fn(),
    });

    // Default meta-progression mocks
    mockUseAdventureXp.mockReturnValue({
      totalXp: 0,
      currentLevel: 1,
      xpProgress: {
        currentLevel: 1,
        xpInCurrentLevel: 0,
        xpNeededForNextLevel: 100,
        progressPercent: 0,
        isMaxLevel: false,
      },
      awardXp: jest.fn(() => ({ leveledUp: false })),
      pendingUpdate: null,
      acknowledgePersistence: jest.fn(),
    });

    mockUseAdventureCurrency.mockReturnValue({
      gold: 0,
      upgrades: { timeBonus: 0, scoreBonus: 0, xpBonus: 0 },
      addGold: jest.fn(),
      purchase: jest.fn(),
      getUpgradeEffect: jest.fn((id) => ({
        multiplier: 1.0,
        description: '+0%',
      })),
      pendingUpdate: null,
      acknowledgePersistence: jest.fn(),
    });

    mockUseScreenShake.mockReturnValue({
      shakeRef: { current: null },
      shake: jest.fn(),
    });

    mockUseParticleBudget.mockReturnValue({
      tier: 'high',
      max: 100,
      combo: 15,
      levelUp: 60,
      word: 10,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Hook Integration', () => {
    it('should initialize all meta-progression hooks', () => {
      render(
        <AdventureGame
          levelConfig={mockLevelConfig}
          initialGrid={mockInitialGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      expect(mockUseAdventureXp).toHaveBeenCalled();
      expect(mockUseAdventureCurrency).toHaveBeenCalled();
      expect(mockUseScreenShake).toHaveBeenCalled();
      expect(mockUseParticleBudget).toHaveBeenCalled();
    });

    it('should pass userId to meta-progression hooks', () => {
      // For now, we expect hooks to be called without specific userId
      // In future phase, userId will be passed from authentication context
      render(
        <AdventureGame
          levelConfig={mockLevelConfig}
          initialGrid={mockInitialGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // Just verify hooks were called (userId integration is future phase)
      expect(mockUseAdventureXp).toHaveBeenCalled();
      expect(mockUseAdventureCurrency).toHaveBeenCalled();
    });
  });

  describe('Placeholder Tests for Future Implementation', () => {
    // These tests will be implemented in Task 2-4
    it.todo('should trigger screen shake on combo tier changes');
    it.todo('should fire adaptive particles on combo tier changes');
    it.todo('should award XP on level complete');
    it.todo('should award gold on level complete');
    it.todo('should show level up modal when leveling up');
    it.todo('should apply time bonus multiplier from upgrades');
    it.todo('should apply score bonus multiplier from upgrades');
    it.todo('should apply XP bonus multiplier from upgrades');
  });
});
