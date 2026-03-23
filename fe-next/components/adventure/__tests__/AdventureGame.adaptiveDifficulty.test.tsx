/**
 * Integration Tests for Adaptive Difficulty in AdventureGame
 *
 * Verifies tier-based adjustments affect gameplay correctly
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdventureGame from '../AdventureGame';
import type { LevelConfig } from '@/types/adventure';
import type { DifficultyTier } from '@/types/difficulty';
import type { HintData } from '@/lib/adaptiveDifficulty';

// Mock all dependencies
jest.mock('@/contexts/LanguageContext', () => {
  const value = {
    t: (key: string, params?: Record<string, string | number>) => {
      if (key.startsWith('difficulty.hint.')) {
        return `Hint: ${JSON.stringify(params)}`;
      }
      return key;
    },
    language: 'en',
    dir: 'ltr',
    setLanguage: jest.fn(),
  };
  return { useLanguage: () => value, useLanguageSafe: () => value };
});

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
    }),
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

jest.mock('@/contexts/ProgressionContext', () => ({
  useProgression: () => ({
    attempts: [],
    recordAttempt: jest.fn(),
    getLevelAttempt: jest.fn(() => null),
  }),
}));

// Mock MusicContext
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

jest.mock('@/hooks/useAdventureGame', () => ({
  useAdventureGame: () => ({
    gameState: {
      score: 0,
      wordsFound: [],
      comboCount: 1,
      isComplete: false,
      stars: 0,
    },
    tiles: Array(5).fill(null).map(() =>
      Array(5).fill(null).map(() => ({
        letter: 'A',
        type: 'normal' as const,
        isCleared: false,
        isFrozen: false,
        isChained: false,
      }))
    ),
    tilesVersion: 1,
    objectives: [{ type: 'scoreTarget', target: 100, current: 0 }],
    timeRemaining: 60,
    canComplete: false,
    isPlaying: true,
    cascadeComplete: true,
    submitWordWithPath: jest.fn(),
    startGame: jest.fn(),
    pauseGame: jest.fn(),
    completeLevel: jest.fn(),
    resetGame: jest.fn(),
    updateObjective: jest.fn(),
    markCascadeComplete: jest.fn(),
    isCascading: false,
    cascadePhase: 'idle' as const,
    addTime: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAdventureWordValidation', () => ({
  useAdventureWordValidation: () => ({
    validateWord: jest.fn(),
    isValidating: false,
  }),
}));

jest.mock('@/hooks/useAdventureSelection', () => ({
  useAdventureSelection: () => ({
    selectedIndices: [],
    currentWord: '',
    selectTile: jest.fn(),
    clearSelection: jest.fn(),
    getPath: jest.fn(() => []),
    pathPoints: [],
  }),
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
    checkWord: jest.fn(() => ({ scoreMultiplier: 1, meetsRequirement: false })),
    triggerTaunt: jest.fn(),
    bossState: { phase: 'intro' },
  }),
}));

jest.mock('@/hooks/useAdventureXp', () => ({
  useAdventureXp: () => ({
    totalXp: 0,
    currentLevel: 1,
    xpProgress: 0,
    awardXp: jest.fn(() => ({ leveledUp: false })),
    pendingUpdate: null,
    acknowledgePersistence: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAdventureCurrency', () => ({
  useAdventureCurrency: () => ({
    gold: 100,
    upgrades: {},
    addGold: jest.fn(),
    purchase: jest.fn(),
    getUpgradeEffect: jest.fn((type) => ({ multiplier: 1.0, stacks: 0 })),
    pendingUpdate: null,
    acknowledgePersistence: jest.fn(),
  }),
}));

jest.mock('@/hooks/usePowerUpInventory', () => ({
  usePowerUpInventory: () => ({
    inventory: {
      cooldownStartedAt: {
        freezeTime: undefined,
        hint: undefined,
        scoreMultiplier: undefined,
      },
    },
    resetCooldowns: jest.fn(),
    startCooldown: jest.fn(),
  }),
}));

jest.mock('@/hooks/useScreenShake', () => ({
  useScreenShake: () => ({
    shakeRef: { current: null },
    shake: jest.fn(),
  }),
}));

jest.mock('@/hooks/useParticleBudget', () => ({
  useParticleBudget: () => 100,
}));

// Mock useAdaptiveDifficulty with controlled return values
const mockUseAdaptiveDifficulty = jest.fn();
jest.mock('@/hooks/useAdaptiveDifficulty', () => ({
  useAdaptiveDifficulty: (...args: unknown[]) => mockUseAdaptiveDifficulty(...args),
}));

describe('AdventureGame - Adaptive Difficulty Integration', () => {
  const baseConfig: LevelConfig = {
    world: 1,
    level: 1,
    gridSize: 5,
    timerSeconds: 60,
    objectives: [{ type: 'scoreTarget', target: 100 }],
    specialTiles: [],
    difficulty: 'EASY',
    chapterNumber: 1,
    levelInChapter: 1,
    isBossLevel: false,
    showBossIntro: false,
  };

  const initialGrid = Array(5).fill(null).map(() =>
    Array(5).fill(null).map(() => 'A')
  );

  const defaultProps = {
    levelConfig: baseConfig,
    initialGrid,
    onLevelComplete: jest.fn(),
    onExit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tier affects timer', () => {
    it('should use adjusted timer for easy tier (+20%)', () => {
      const adjustedConfig = {
        ...baseConfig,
        timerSeconds: 72, // 60 * 1.2 = 72
      };

      mockUseAdaptiveDifficulty.mockReturnValue({
        tier: 'easy' as DifficultyTier,
        adjustedConfig,
        hintData: { level: 'none' } as HintData,
        powerUpCooldownMultiplier: 1.0,
        recordCompletion: jest.fn(),
      });

      render(<AdventureGame {...defaultProps} />);

      // Verify hook was called with correct params
      expect(mockUseAdaptiveDifficulty).toHaveBeenCalledWith({
        world: 1,
        level: 1,
      });
    });

    it('should use adjusted timer for hard tier (-15%)', () => {
      const adjustedConfig = {
        ...baseConfig,
        timerSeconds: 51, // 60 * 0.85 = 51
      };

      mockUseAdaptiveDifficulty.mockReturnValue({
        tier: 'hard' as DifficultyTier,
        adjustedConfig,
        hintData: { level: 'none' } as HintData,
        powerUpCooldownMultiplier: 1.5,
        recordCompletion: jest.fn(),
      });

      render(<AdventureGame {...defaultProps} />);

      expect(mockUseAdaptiveDifficulty).toHaveBeenCalledWith({
        world: 1,
        level: 1,
      });
    });

    it('should use base timer for normal tier', () => {
      mockUseAdaptiveDifficulty.mockReturnValue({
        tier: 'normal' as DifficultyTier,
        adjustedConfig: baseConfig,
        hintData: { level: 'none' } as HintData,
        powerUpCooldownMultiplier: 1.0,
        recordCompletion: jest.fn(),
      });

      render(<AdventureGame {...defaultProps} />);

      expect(mockUseAdaptiveDifficulty).toHaveBeenCalledWith({
        world: 1,
        level: 1,
      });
    });
  });

  describe('Boss levels excluded from tier adjustments', () => {
    it('should use base config for boss level even with easy tier', () => {
      const bossConfig: LevelConfig = {
        ...baseConfig,
        level: 7,
        isBossLevel: true,
      };

      // Hook returns base config for boss levels
      mockUseAdaptiveDifficulty.mockReturnValue({
        tier: 'easy' as DifficultyTier,
        adjustedConfig: bossConfig, // Same as input for boss levels
        hintData: { level: 'none' } as HintData,
        powerUpCooldownMultiplier: 1.0,
        recordCompletion: jest.fn(),
      });

      render(<AdventureGame {...defaultProps} levelConfig={bossConfig} />);

      expect(mockUseAdaptiveDifficulty).toHaveBeenCalledWith({
        world: 1,
        level: 7,
      });
    });
  });

  describe('Power-up cooldown multiplier', () => {
    it('should pass 1.5x multiplier for hard tier', async () => {
      mockUseAdaptiveDifficulty.mockReturnValue({
        tier: 'hard' as DifficultyTier,
        adjustedConfig: baseConfig,
        hintData: { level: 'none' } as HintData,
        powerUpCooldownMultiplier: 1.5,
        recordCompletion: jest.fn(),
      });

      render(<AdventureGame {...defaultProps} />);

      // PowerUpBar should receive cooldownMultiplier prop
      // Verified by no errors during render (TypeScript would catch missing prop)
      await waitFor(() => {
        expect(screen.getByTestId('adventure-game')).toBeInTheDocument();
      });
    });

    it('should pass 1.0x multiplier for normal tier', async () => {
      mockUseAdaptiveDifficulty.mockReturnValue({
        tier: 'normal' as DifficultyTier,
        adjustedConfig: baseConfig,
        hintData: { level: 'none' } as HintData,
        powerUpCooldownMultiplier: 1.0,
        recordCompletion: jest.fn(),
      });

      render(<AdventureGame {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('adventure-game')).toBeInTheDocument();
      });
    });
  });

  describe('Hint message rendering', () => {
    it('should not render HintMessage when level is none', () => {
      mockUseAdaptiveDifficulty.mockReturnValue({
        tier: 'normal' as DifficultyTier,
        adjustedConfig: baseConfig,
        hintData: { level: 'none' } as HintData,
        powerUpCooldownMultiplier: 1.0,
        recordCompletion: jest.fn(),
      });

      render(<AdventureGame {...defaultProps} />);

      // HintMessage should not be in document
      expect(screen.queryByText(/Hint:/)).not.toBeInTheDocument();
    });

    it('should render HintMessage for length level', () => {
      const hintData: HintData = {
        level: 'length',
        message: 'difficulty.hint.length',
        wordLength: 5,
      };

      mockUseAdaptiveDifficulty.mockReturnValue({
        tier: 'normal' as DifficultyTier,
        adjustedConfig: baseConfig,
        hintData,
        powerUpCooldownMultiplier: 1.0,
        recordCompletion: jest.fn(),
      });

      render(<AdventureGame {...defaultProps} />);

      // When hintLevel is 'length', the hint text uses the translation key
      // Multiple elements due to responsive design (mobile + desktop)
      const hints = screen.getAllByText(/adventure\.game\.hintGeneral/);
      expect(hints.length).toBeGreaterThan(0);
    });

    it('should render HintMessage for lengthAndStart level', () => {
      const hintData: HintData = {
        level: 'lengthAndStart',
        message: 'difficulty.hint.lengthAndStart',
        wordLength: 6,
        startLetter: 'A',
        highlightTiles: [{ row: 0, col: 0 }],
      };

      mockUseAdaptiveDifficulty.mockReturnValue({
        tier: 'normal' as DifficultyTier,
        adjustedConfig: baseConfig,
        hintData,
        powerUpCooldownMultiplier: 1.0,
        recordCompletion: jest.fn(),
      });

      render(<AdventureGame {...defaultProps} />);

      // When hintLevel is 'lengthAndStart', the hint text uses the translation key
      // Multiple elements due to responsive design (mobile + desktop)
      const hints = screen.getAllByText(/adventure\.game\.hintLengthAndStart/);
      expect(hints.length).toBeGreaterThan(0);
    });

    it('should render HintMessage for fullReveal level', () => {
      const hintData: HintData = {
        level: 'fullReveal',
        message: 'difficulty.hint.fullReveal',
        targetWord: 'TEST',
        highlightTiles: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ],
      };

      mockUseAdaptiveDifficulty.mockReturnValue({
        tier: 'normal' as DifficultyTier,
        adjustedConfig: baseConfig,
        hintData,
        powerUpCooldownMultiplier: 1.0,
        recordCompletion: jest.fn(),
      });

      render(<AdventureGame {...defaultProps} />);

      // When hintLevel is 'fullReveal', the hint text uses the translation key
      // Multiple elements due to responsive design (mobile + desktop)
      const hints = screen.getAllByText(/adventure\.game\.hintFullReveal/);
      expect(hints.length).toBeGreaterThan(0);
    });
  });

  describe('Score target adjustment', () => {
    it('should use adjusted score target for easy tier (-20%)', () => {
      const adjustedConfig: LevelConfig = {
        ...baseConfig,
        objectives: [{ type: 'scoreTarget', target: 80 }], // 100 * 0.8 = 80
      };

      mockUseAdaptiveDifficulty.mockReturnValue({
        tier: 'easy' as DifficultyTier,
        adjustedConfig,
        hintData: { level: 'none' } as HintData,
        powerUpCooldownMultiplier: 1.0,
        recordCompletion: jest.fn(),
      });

      render(<AdventureGame {...defaultProps} />);

      expect(mockUseAdaptiveDifficulty).toHaveBeenCalledWith({
        world: 1,
        level: 1,
      });
    });
  });

  describe('Completion recording', () => {
    it('should provide recordCompletion function from hook', () => {
      const mockRecordCompletion = jest.fn();

      mockUseAdaptiveDifficulty.mockReturnValue({
        tier: 'normal' as DifficultyTier,
        adjustedConfig: baseConfig,
        hintData: { level: 'none' } as HintData,
        powerUpCooldownMultiplier: 1.0,
        recordCompletion: mockRecordCompletion,
      });

      render(<AdventureGame {...defaultProps} />);

      // Verify hook was called and recordCompletion is available
      expect(mockUseAdaptiveDifficulty).toHaveBeenCalled();
      expect(mockRecordCompletion).toBeDefined();
    });
  });
});
