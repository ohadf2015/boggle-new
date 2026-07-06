// @vitest-environment jsdom
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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';


const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

// Mock framer-motion
vi.mock('framer-motion', () => {
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

  const motionProxy = {
    div: createMockMotion('div'),
    button: createMockMotion('button'),
    ul: createMockMotion('ul'),
    li: createMockMotion('li'),
    span: createMockMotion('span'),
  };

  return {
    m: motionProxy,
    m: motionProxy,
    AnimatePresence: ({ children }: any) => children,
    LazyMotion: ({ children }: any) => children,
    domAnimation: {},
    domMax: {},
    useSpring,
    useTransform,
    useReducedMotion: () => false,
  };
});

// Mock useAdaptiveDifficulty hook
vi.mock('@/hooks/useAdaptiveDifficulty', () => ({
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
    recordCompletion: vi.fn(),
  }),
}));

// Mock hooks and dependencies
vi.mock('@/hooks/useAdventureGame', () => ({
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
    submitWordWithPath: vi.fn(),
    startGame: vi.fn(),
    pauseGame: vi.fn(),
    completeLevel: vi.fn(),
    resetGame: vi.fn(),
    markCascadeComplete: vi.fn(),
    isCascading: false,
    cascadePhase: 'none',
    addTime: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAdventureWordValidation', () => ({
  useAdventureWordValidation: () => ({
    validateWord: vi.fn().mockResolvedValue({ isValid: false, errorKey: 'error.invalid' }),
    isValidating: false,
  }),
}));

vi.mock('@/hooks/useAdventureSelection', () => ({
  useAdventureSelection: () => ({
    selectedIndices: [],
    currentWord: '',
    selectTile: vi.fn(),
    clearSelection: vi.fn(),
    getPath: vi.fn().mockReturnValue([]),
    pathPoints: [],
  }),
}));

vi.mock('@/hooks/useLexiReactions', () => ({
  useLexiReactions: () => ({
    reaction: null,
    dismissReaction: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAdventureMusic', () => ({
  useAdventureMusic: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
    setLanguage: vi.fn(),
  }),
  useLanguageSafe: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
    setLanguage: vi.fn(),
  }),
}));

vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    stopMusic: vi.fn(),
    playMusic: vi.fn(),
    pauseMusic: vi.fn(),
    resumeMusic: vi.fn(),
    isPlaying: false,
    currentTrack: null,
  }),
}));

// Mock AdventureThemeContext
vi.mock('@/contexts/AdventureThemeContext', () => {
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
      setWorld: vi.fn(),
      setLevel: vi.fn(),
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
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(),
    playComboSound: vi.fn(),
    playComboBreakSound: vi.fn(),
    playCountdownBeep: vi.fn(),
    playComboMilestoneSound: vi.fn(),
    playComboSavedSound: vi.fn(),
    setGameActive: vi.fn(),
    playAchievementSound: vi.fn(),
    playSound: vi.fn(),
    playWordSound: vi.fn(),
    playGameStartSound: vi.fn(),
    playGameEndSound: vi.fn(),
    playSoloGameSound: vi.fn(),
  }),
}));

// Mock ProgressionContext - required by AdventureGame
vi.mock('@/contexts/ProgressionContext', () => ({
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
    completeLevel: vi.fn(),
    recordAttempt: vi.fn(),
    isWorldUnlocked: vi.fn(() => true),
    isLevelUnlocked: vi.fn(() => true),
    getWorldStars: vi.fn(() => 0),
    getLevelCompletion: vi.fn(() => undefined),
    getLevelAttempt: vi.fn(() => undefined),
    refreshProgression: vi.fn(),
    attempts: [],
  }),
  ProgressionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../AdventureGrid', () => {
  const MockAdventureGrid = () => {
    return <div data-testid="adventure-grid">Grid</div>;
  };
  return { default: MockAdventureGrid };
});

vi.mock('../AdventureObjectives', () => {
  const MockAdventureObjectives = () => {
    return <div data-testid="adventure-objectives">Objectives</div>;
  };
  return { default: MockAdventureObjectives };
});

vi.mock('../AdventureTimer', () => {
  const MockAdventureTimer = () => {
    return <div data-testid="adventure-timer">Timer</div>;
  };
  return { default: MockAdventureTimer };
});

vi.mock('../LevelCompleteModal', () => {
  const MockLevelCompleteModal = () => {
    return null;
  };
  return { default: MockLevelCompleteModal };
});

vi.mock('../LevelEntryOverlay', () => {
  const MockLevelEntryOverlay = () => {
    return null;
  };
  return { default: MockLevelEntryOverlay };
});

vi.mock('../LexiReaction', () => {
  const MockLexiReaction = () => {
    return null;
  };
  return { default: MockLexiReaction };
});

vi.mock('../themed/WorldBackground', () => {
  const MockWorldBackground = () => {
    return <div data-testid="world-background" />;
  };
  return { default: MockWorldBackground };
});

vi.mock('../themed/GameplayBackground', () => {
  const MockGameplayBackground = () => {
    return <div data-testid="gameplay-background" />;
  };
  return { default: MockGameplayBackground };
});

vi.mock('@/components/animations', () => ({
  ScorePopupFly: () => null,
}));

vi.mock('../boss', () => ({
  BossOverlay: () => null,
  PlayerHealthBar: () => null,
}));

vi.mock('../boss/cinematics/CinematicPlayer', () => ({
  CinematicPlayer: () => null,
}));

vi.mock('../cinematics', () => ({
  VictoryCinematic: () => null,
  VICTORY_DURATION_FRAMES: 150,
  DefeatCinematic: () => null,
  DEFEAT_DURATION_FRAMES: 120,
}));

vi.mock('../effects/AdventureEffectsLayer', () => ({
  __esModule: true,
  default: () => null,
  AdventureEffectsLayer: () => null,
}));

vi.mock('../hooks/useAdventureBossOrchestration', () => ({
  useAdventureBossOrchestration: () => ({
    bossConfig: null,
    bossMaxHP: 100,
    bossTaunt: null,
    showBossIntro: false,
    handleBossIntroStart: vi.fn(),
    bossHealthState: { currentHP: 100, maxHP: 100, phase: 'idle', totalDamageDealt: 0, isActive: false },
    playerHealthState: { currentHP: 100, maxHP: 100, isDead: false },
    isBossActive: false,
    bossEffectCallbacks: {},
  }),
}));

vi.mock('../hooks/useAdventureCinematics', () => ({
  useAdventureCinematics: () => ({
    showVictoryCinematic: false,
    showDefeatCinematic: false,
    triggerVictory: vi.fn(),
    triggerDefeat: vi.fn(),
    handleCinematicComplete: vi.fn(),
  }),
}));

vi.mock('../hooks/useAdventureEntryPhase', () => ({
  useAdventureEntryPhase: () => ({
    entryPhase: 'playing',
    handleObjectivesComplete: vi.fn(),
    handleEntryComplete: vi.fn(),
  }),
}));

vi.mock('../hooks/useAdventureGameInit', () => ({
  useAdventureGameInit: () => ({
    tier: 'normal',
    hintData: { level: 'none' },
    powerUpCooldownMultiplier: 1,
    recordCompletion: vi.fn(),
    adjustedLevelConfig: {
      world: 1, level: 1, gridSize: 4, timerSeconds: 60,
      objectives: [{ type: 'scoreTarget', target: 100, isPrimary: true }],
      specialTiles: [], difficulty: 'EASY', chapterNumber: 1, levelInChapter: 1, isBossLevel: false,
    },
    intensityAdjustments: {},
    flowState: 'normal',
    startAIDirector: vi.fn(),
    endAIDirector: vi.fn(),
    recordAIWord: vi.fn(),
    handleAITransition: vi.fn(),
    isAIBossBattle: false,
    totalXp: 0, currentLevel: 1, xpProgress: 0, awardXp: vi.fn(),
    gold: 0, upgrades: {}, addGold: vi.fn(), purchase: vi.fn(),
    getUpgradeEffect: vi.fn(() => 0), upgradeBonuses: {},
    upgradeEffects: {
      bonusTimeSeconds: 0, bossDamageMultiplier: 1, blockFirstAttack: false,
      bossHealPerWord: 0, goldMultiplier: 1, longWordGoldBonus: 0,
      doubleFirstCompletionGold: false, comboDecayMultiplier: 1, comboScoreMultiplier: 1,
      failureGold: 0, retryScoreRetention: 0, freeRetriesPerWorld: 0,
      hintRechargeMultiplier: 1, hintsPerLevel: 1, freeStartHint: false, bonusHintsPerLevel: 0,
      specialTileBoost: 0, guaranteedGoldTile: false, iceTileReduction: false,
      bombTimerInvert: false, scrambleImmunity: false, shuffleUsesPerLevel: 0,
      canDetonateWords: false, timeFreezeSeconds: 0, freezeHighlightsWord: false,
    },
    skillEffects: { bossDamageMultiplier: 1, comboMultiplierBonus: 0, getLongWordDamageMultiplier: () => 1 },
    handleEarnAchievement: vi.fn(),
    recordAttempt: vi.fn(),
    checkMilestone: vi.fn(),
    comboMilestone: null,
    dismissMilestone: vi.fn(),
    runeEffects: { scoreMultiplier: 1, goldMultiplier: 1, timeBonus: 0, comboDecay: 1, hintBonus: 0, bossDamage: 1 },
    streakMultiplier: 1,
    weeklyModifiers: [],
  }),
}));

vi.mock('../hooks/useAdventureWordSubmit', () => ({
  useAdventureWordSubmit: () => ({
    handleSubmitWord: vi.fn(),
    validationFeedback: { error: null, isValid: false, wasSubmitted: false },
    lastAccepted: null,
    wordFeedback: null,
    prevComboCountRef: { current: 0 },
  }),
}));

vi.mock('../hooks/useAdventureLevelCompletion', () => ({
  useAdventureLevelCompletion: () => ({
    showLevelComplete: false,
    handleContinue: vi.fn(),
    handleRetry: vi.fn(),
    lootDrops: [],
    resetRewards: vi.fn(),
    completionProcessedRef: { current: false },
  }),
}));

vi.mock('@/hooks/useAdventureHints', () => ({
  useAdventureHints: () => ({
    hasHintsAvailable: false,
    handleHintClick: vi.fn(),
    showAutoHint: false,
    currentHint: null,
    hintHighlightIndices: [],
  }),
}));

vi.mock('@/hooks/useLexiStuckDetection', () => ({
  useLexiStuckDetection: () => ({
    isStuck: false,
    stuckDuration: 0,
  }),
}));

vi.mock('@/components/NeoToast', () => ({
  neoInfoToast: vi.fn(),
}));

vi.mock('../ui', () => ({
  GameHeader: () => <div data-testid="game-header" />,
  GameSidebar: ({ children }: any) => <div data-testid="game-sidebar">{children}</div>,
  GameGridArea: ({ children }: any) => <div data-testid="game-grid-area">{children}</div>,
  PauseOverlay: () => null,
  GameLiveRegion: () => null,
  PrimaryObjectiveBanner: () => null,
  GameLayout: ({ header, gridArea, sidebar, overlays }: any) => (
    <div data-testid="game-layout">{header}{gridArea}{sidebar}{overlays}</div>
  ),
}));

vi.mock('@/lib/adventure/weeklyModifiers', () => ({
  getWeeklyModifiers: () => [],
  applyModifiers: (config: any) => config,
}));
// runeSystem removed — useAdventureGameInit uses inline defaults now

vi.mock('@/hooks/useInterstitialAd', () => ({
  useInterstitialAd: () => ({
    showInterstitial: vi.fn().mockResolvedValue(undefined),
  }),
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
  describe('Layout Structure', () => {
    it('should render the game layout without crashing', () => {
      // WHEN
      const { container } = render(
        <AdventureGame
          levelConfig={mockLevelConfig}
          initialGrid={mockInitialGrid}
          onLevelComplete={vi.fn()}
          onExit={vi.fn()}
        />
      , { wrapper: createWrapper() });

      // THEN - game layout should be rendered
      expect(container.querySelector('[data-testid="game-layout"]')).toBeInTheDocument();
    });

    it('should render all layout sections (header, grid, sidebar)', () => {
      // WHEN
      const { container } = render(
        <AdventureGame
          levelConfig={mockLevelConfig}
          initialGrid={mockInitialGrid}
          onLevelComplete={vi.fn()}
          onExit={vi.fn()}
        />
      , { wrapper: createWrapper() });

      // THEN - all layout sections should exist
      expect(container.querySelector('[data-testid="game-header"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="game-grid-area"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="game-sidebar"]')).toBeInTheDocument();
    });
  });
});
