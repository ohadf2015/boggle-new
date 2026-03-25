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
  useLanguageSafe: () => ({
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
    useHUDTheme: () => ({
      headerBg: 'bg-neo-navy/90',
      headerBorder: 'border-neo-black/40',
      sidebarBg: 'bg-neo-black/40',
      scoreAccent: 'text-neo-cyan',
      levelBadgeColor: 'bg-neo-black/40',
      levelBadgeText: 'text-neo-cyan',
      objectiveAccent: 'text-neo-lime',
      hintActiveColor: 'bg-neo-lime',
      hintActiveText: 'text-neo-black',
    }),
    useTimerTheme: () => ({
      normal: { bg: 'bg-neo-navy/80', text: 'text-neo-white', shadow: '' },
      warning: { bg: 'bg-neo-orange/20', text: 'text-neo-orange', shadow: 'shadow-[0_0_12px_rgba(255,107,53,0.3)]' },
      danger: { bg: 'bg-neo-red/20', text: 'text-neo-red', shadow: 'shadow-[0_0_16px_rgba(239,68,68,0.4)]' },
      critical: { bg: 'bg-neo-red/30', text: 'text-neo-red', shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]' },
    }),
    useBossFightTheme: () => ({
      dialogueBg: 'bg-neo-navy/95',
      dialogueBorder: 'border-neo-white/20',
      bossNameColor: 'text-neo-red',
      hpSegmentColors: ['bg-neo-red', 'bg-neo-orange', 'bg-neo-lime'],
      telegraphColor: 'bg-neo-red/20',
      telegraphProgressColor: 'bg-neo-red',
      playerHealthNormal: 'bg-neo-lime',
      playerHealthLow: 'bg-neo-red',
      phaseColors: {
        phase1: { bg: 'bg-neo-lime/20', text: 'text-neo-lime' },
        phase2: { bg: 'bg-neo-orange/20', text: 'text-neo-orange' },
        enraged: { bg: 'bg-neo-red/20', text: 'text-neo-red' },
      },
      avatarGlow: 'rgba(239, 68, 68, 0.4)',
      victoryGlow: 'rgba(163, 230, 53, 0.6)',
      arenaEffect: 'none',
    }),
  };
});

// Mock SoundEffectsContext
jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: jest.fn(),
    playComboSound: jest.fn(),
    playComboBreakSound: jest.fn(),
    playCountdownBeep: jest.fn(),
    playComboMilestoneSound: jest.fn(),
    playComboSavedSound: jest.fn(),
    setGameActive: jest.fn(),
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

jest.mock('../boss', () => ({
  BossOverlay: () => null,
  PlayerHealthBar: () => null,
}));

jest.mock('../boss/cinematics/CinematicPlayer', () => ({
  CinematicPlayer: () => null,
}));

jest.mock('../cinematics', () => ({
  VictoryCinematic: () => null,
  VICTORY_DURATION_FRAMES: 150,
  DefeatCinematic: () => null,
  DEFEAT_DURATION_FRAMES: 120,
}));

jest.mock('../effects/AdventureEffectsLayer', () => ({
  __esModule: true,
  default: () => null,
  AdventureEffectsLayer: () => null,
}));

jest.mock('../hooks/useAdventureBossOrchestration', () => ({
  useAdventureBossOrchestration: () => ({
    bossConfig: null,
    bossMaxHP: 100,
    bossTaunt: null,
    showBossIntro: false,
    handleBossIntroStart: jest.fn(),
    bossHealthState: { currentHP: 100, maxHP: 100, phase: 'idle', totalDamageDealt: 0, isActive: false },
    playerHealthState: { currentHP: 100, maxHP: 100, isDead: false },
    isBossActive: false,
    bossEffectCallbacks: {},
  }),
}));

jest.mock('../hooks/useAdventureCinematics', () => ({
  useAdventureCinematics: () => ({
    showVictoryCinematic: false,
    showDefeatCinematic: false,
    triggerVictory: jest.fn(),
    triggerDefeat: jest.fn(),
    handleCinematicComplete: jest.fn(),
  }),
}));

jest.mock('../hooks/useAdventureEntryPhase', () => ({
  useAdventureEntryPhase: () => ({
    entryPhase: 'playing',
    handleObjectivesComplete: jest.fn(),
    handleEntryComplete: jest.fn(),
  }),
}));

jest.mock('../hooks/useAdventureGameInit', () => ({
  useAdventureGameInit: () => ({
    tier: 'normal',
    hintData: { level: 'none' },
    powerUpCooldownMultiplier: 1,
    recordCompletion: jest.fn(),
    adjustedLevelConfig: {
      world: 1, level: 1, gridSize: 4, timerSeconds: 60,
      objectives: [{ type: 'scoreTarget', target: 100, isPrimary: true }],
      specialTiles: [], difficulty: 'EASY', chapterNumber: 1, levelInChapter: 1, isBossLevel: false,
    },
    intensityAdjustments: {},
    flowState: 'normal',
    startAIDirector: jest.fn(),
    endAIDirector: jest.fn(),
    recordAIWord: jest.fn(),
    handleAITransition: jest.fn(),
    isAIBossBattle: false,
    totalXp: 0, currentLevel: 1, xpProgress: 0, awardXp: jest.fn(),
    gold: 0, upgrades: {}, addGold: jest.fn(), purchase: jest.fn(),
    getUpgradeEffect: jest.fn(() => 0), upgradeBonuses: {},
    upgradeEffects: {
      bonusTimeSeconds: 0, bossDamageMultiplier: 1, blockFirstAttack: false,
      bossHealPerWord: 0, goldMultiplier: 1, longWordGoldBonus: 0,
      doubleFirstCompletionGold: false, comboDecayMultiplier: 1, comboScoreMultiplier: 1,
      failureGold: 0, retryScoreRetention: 0, freeRetriesPerWorld: 0,
      hintRechargeMultiplier: 1, hintsPerLevel: 1, freeStartHint: false,
      specialTileBoost: 0, guaranteedGoldTile: false, iceTileReduction: false,
      bombTimerInvert: false, scrambleImmunity: false, shuffleUsesPerLevel: 0,
      canDetonateWords: false, timeFreezeSeconds: 0, freezeHighlightsWord: false,
    },
    skillEffects: { bossDamageMultiplier: 1, comboMultiplierBonus: 0, getLongWordDamageMultiplier: () => 1 },
    handleEarnAchievement: jest.fn(),
    recordAttempt: jest.fn(),
    checkMilestone: jest.fn(),
    comboMilestone: null,
    dismissMilestone: jest.fn(),
    runeEffects: { scoreMultiplier: 1, goldMultiplier: 1, timeBonus: 0, comboDecay: 1, hintBonus: 0, bossDamage: 1 },
    streakMultiplier: 1,
    weeklyModifiers: [],
  }),
}));

jest.mock('../hooks/useAdventureWordSubmit', () => ({
  useAdventureWordSubmit: () => ({
    handleSubmitWord: jest.fn(),
    validationFeedback: { error: null, isValid: false, wasSubmitted: false },
    lastAccepted: null,
    wordFeedback: null,
    prevComboCountRef: { current: 0 },
  }),
}));

jest.mock('../hooks/useAdventureLevelCompletion', () => ({
  useAdventureLevelCompletion: () => ({
    showLevelComplete: false,
    handleContinue: jest.fn(),
    handleRetry: jest.fn(),
    lootDrops: [],
    resetRewards: jest.fn(),
    completionProcessedRef: { current: false },
  }),
}));

jest.mock('@/hooks/useAdventureHints', () => ({
  useAdventureHints: () => ({
    hasHintsAvailable: false,
    handleHintClick: jest.fn(),
    showAutoHint: false,
    currentHint: null,
    hintHighlightIndices: [],
  }),
}));

jest.mock('@/hooks/useLexiStuckDetection', () => ({
  useLexiStuckDetection: () => ({
    isStuck: false,
    stuckDuration: 0,
  }),
}));

jest.mock('@/components/NeoToast', () => ({
  neoInfoToast: jest.fn(),
}));

jest.mock('../ui', () => ({
  GameHeader: () => <div data-testid="game-header" />,
  GameSidebar: ({ children }: any) => <div data-testid="game-sidebar">{children}</div>,
  GameGridArea: ({ children }: any) => <div data-testid="game-grid-area">{children}</div>,
  PauseOverlay: () => null,
  GameLayout: ({ header, gridArea, sidebar, overlays }: any) => (
    <div data-testid="game-layout">{header}{gridArea}{sidebar}{overlays}</div>
  ),
}));

jest.mock('@/lib/adventure/weeklyModifiers', () => ({
  getWeeklyModifiers: () => [],
  applyModifiers: (config: any) => config,
}));
// runeSystem removed — useAdventureGameInit uses inline defaults now

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
  describe('Layout Structure', () => {
    it('should render the game layout without crashing', () => {
      // WHEN
      const { container } = render(
        <AdventureGame
          levelConfig={mockLevelConfig}
          initialGrid={mockInitialGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // THEN - game layout should be rendered
      expect(container.querySelector('[data-testid="game-layout"]')).toBeInTheDocument();
    });

    it('should render all layout sections (header, grid, sidebar)', () => {
      // WHEN
      const { container } = render(
        <AdventureGame
          levelConfig={mockLevelConfig}
          initialGrid={mockInitialGrid}
          onLevelComplete={jest.fn()}
          onExit={jest.fn()}
        />
      );

      // THEN - all layout sections should exist
      expect(container.querySelector('[data-testid="game-header"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="game-grid-area"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="game-sidebar"]')).toBeInTheDocument();
    });
  });
});
