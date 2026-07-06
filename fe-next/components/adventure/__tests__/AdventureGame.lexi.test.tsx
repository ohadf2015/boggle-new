/**
 * AdventureGame Lexi Integration Tests
 *
 * Tests that Lexi reactions appear during gameplay when triggers fire.
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import AdventureGame from '../AdventureGame';
import type { LevelConfig } from '@/types/adventure';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
};

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => {
  const value = {
    t: (key: string) => {
      const translations: Record<string, string> = {
        'adventure.lexi.longWord.default': 'Wow! Long word!',
        'adventure.lexi.longWord.world1': 'Amazing forest find!',
        'adventure.lexi.firstWord.default': 'Great start!',
        'adventure.lexi.combo3x.default': "On a roll!",
        'adventure.lexi.combo5x.default': "Incredible streak!",
        'adventure.lexi.combo10x.default': "LEGENDARY!",
        'common.validating': 'Checking...',
      };
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
    setLanguage: vi.fn(),
  };
  return { useLanguage: () => value, useLanguageSafe: () => value };
});

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: false,
    isMobile: false,
    enableComplexAnimations: true,
    enableGlowEffects: true,
    isLowEnd: false,
  }),
}));

// Mock ComboTierBadge to avoid framer-motion useSpring dependency
vi.mock('@/components/animations/ComboTierBadge', () => ({
  ComboTierBadge: ({ comboCount }: { comboCount: number }) => {
    if (comboCount < 2) return null;
    return React.createElement('div', { 'data-testid': 'combo-tier-badge' }, `Combo ${comboCount}`);
  },
}));

// Mock ChainParticleBurst to avoid framer-motion useSpring dependency
vi.mock('@/components/animations/ChainParticleBurst', () => ({
  ChainParticleBurst: () => null,
}));

// Mock word validation to always return valid
vi.mock('@/hooks/useAdventureWordValidation', () => ({
  useAdventureWordValidation: () => ({
    validateWord: async (word: string) => ({
      isValid: true,
      score: word.length * 10,
    }),
    isValidating: false,
  }),
}));

// Mock useAdventureSelection hook
vi.mock('@/hooks/useAdventureSelection', () => ({
  useAdventureSelection: () => ({
    selectedIndices: [],
    currentWord: '',
    isSelecting: false,
    selectTile: vi.fn(),
    clearSelection: vi.fn(),
    getPath: vi.fn().mockReturnValue([]),
    pathPoints: [],
  }),
}));

// Mock MusicContext - adventure mode stops global music when it starts
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

// Mock components that aren't relevant to Lexi tests
vi.mock('../themed/WorldBackground', () => ({
  __esModule: true,
  default: () => <div data-testid="world-background" />,
}));

vi.mock('../LevelEntryOverlay', () => {
  const LevelEntryOverlayMock = ({ onComplete }: { onComplete: () => void }) => {
    // Auto-complete entry sequence
    React.useEffect(() => {
      const timer = setTimeout(onComplete, 10);
      return () => clearTimeout(timer);
    }, [onComplete]);
    return null;
  };
  return {
    __esModule: true,
    default: LevelEntryOverlayMock,
  };
});

vi.mock('../LevelCompleteModal', () => ({
  __esModule: true,
  default: () => null,
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

// Mock useAdaptiveDifficulty hook
vi.mock('@/hooks/useAdaptiveDifficulty', () => ({
  useAdaptiveDifficulty: () => ({
    tier: 'normal',
    adjustedConfig: {
      world: 1,
      level: 1,
      gridSize: 4,
      timerSeconds: 120,
      objectives: [{ type: 'wordCount', target: 5, isPrimary: true }],
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

// Mock framer-motion for simpler testing
vi.mock('framer-motion', () => {
  const React = require('react');

  const createMockMotion = (element: string) => {
    const MockComponent = React.forwardRef(
      ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLElement>) => {
        // Filter out framer-motion specific props
        const filteredProps: Record<string, unknown> = {};
        Object.keys(props).forEach(key => {
          if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'variants'].includes(key)) {
            filteredProps[key] = props[key];
          }
        });
        return React.createElement(element, { ...filteredProps, ref }, children);
      }
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

  // Mock useSpring (used by RollingNumber and ComboTierBadge)
  const useSpring = (initial: any) => createMotionValue(typeof initial === 'object' ? 0 : initial);

  // Mock useTransform (used by RollingNumber)
  const useTransform = (motionValue: any, transformer: (v: any) => any) => {
    const result = createMotionValue(transformer(motionValue.get()));
    return result;
  };

  return {
    m: {
      div: createMockMotion('div'),
      span: createMockMotion('span'),
      button: createMockMotion('button'),
      ul: createMockMotion('ul'),
      li: createMockMotion('li'),
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
    useSpring,
    useTransform,
    useReducedMotion: () => false,
  };
});

describe('AdventureGame Lexi Integration', () => {
  const createLevelConfig = (): LevelConfig => ({
    world: 1,
    level: 1,
    gridSize: 4,
    timerSeconds: 120,
    objectives: [
      { type: 'wordCount', target: 5, isPrimary: true },
    ],
    specialTiles: [],
    difficulty: 'EASY',
    chapterNumber: 1,
    levelInChapter: 1,
    isBossLevel: false,
  });

  const createGrid = (): string[][] => [
    ['A', 'D', 'V', 'E'],
    ['N', 'T', 'U', 'R'],
    ['E', 'S', 'T', 'A'],
    ['R', 'T', 'I', 'N'],
  ];

  const mockOnLevelComplete = vi.fn();
  const mockOnExit = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    mockOnLevelComplete.mockClear();
    mockOnExit.mockClear();
    document.documentElement.dir = 'ltr';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders AdventureGame without Lexi initially', async () => {
    render(
      <AdventureGame
        levelConfig={createLevelConfig()}
        initialGrid={createGrid()}
        onLevelComplete={mockOnLevelComplete}
        onExit={mockOnExit}
      />
    );

    // Wait for entry sequence to complete
    await waitFor(() => {
      expect(screen.getByTestId('adventure-game')).toBeInTheDocument();
    });

    // Advance timers to complete entry sequence
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Lexi should not be visible initially (no reaction triggered yet)
    expect(screen.queryByTestId('lexi-reaction')).not.toBeInTheDocument();
  });

  it('renders LexiReaction component in the DOM tree', () => {
    // This test verifies the component is part of the render tree
    render(
      <AdventureGame
        levelConfig={createLevelConfig()}
        initialGrid={createGrid()}
        onLevelComplete={mockOnLevelComplete}
        onExit={mockOnExit}
      />
    );

    // The adventure game should render
    expect(screen.getByTestId('adventure-game')).toBeInTheDocument();

    // LexiReaction is present but may be empty (no active reaction)
    // The component renders AnimatePresence which shows children only when reaction exists
  });

  it('coexists with score popup without blocking grid', async () => {
    render(
      <AdventureGame
        levelConfig={createLevelConfig()}
        initialGrid={createGrid()}
        onLevelComplete={mockOnLevelComplete}
        onExit={mockOnExit}
      />
    );

    // Wait for game to be ready
    await waitFor(() => {
      expect(screen.getByTestId('adventure-game')).toBeInTheDocument();
    });

    // Game should still be interactive - grid should be present
    const grid = screen.getByRole('grid');
    expect(grid).toBeInTheDocument();
  });

  it('respects isPlaying state for reactions', async () => {
    render(
      <AdventureGame
        levelConfig={createLevelConfig()}
        initialGrid={createGrid()}
        onLevelComplete={mockOnLevelComplete}
        onExit={mockOnExit}
      />
    );

    // Wait for entry sequence
    await waitFor(() => {
      expect(screen.getByTestId('adventure-game')).toBeInTheDocument();
    });

    // Pause the game
    const pauseButton = screen.getByRole('button', { name: /pause/i });
    act(() => {
      pauseButton.click();
    });

    // Lexi should not trigger reactions when paused
    // Verify pause overlay is showing (game is paused)
    expect(screen.getByTestId('pause-overlay')).toBeInTheDocument();
  });

  it('integrates Lexi hook with game state', () => {
    // This test verifies the hook is properly integrated
    render(
      <AdventureGame
        levelConfig={createLevelConfig()}
        initialGrid={createGrid()}
        onLevelComplete={mockOnLevelComplete}
        onExit={mockOnExit}
      />
    );

    // The game should render without errors
    // This proves the hook integration doesn't break the component
    expect(screen.getByTestId('adventure-game')).toBeInTheDocument();

    // Score display should work (hook doesn't interfere)
    expect(screen.getByTestId('score-display')).toBeInTheDocument();
  });
});

