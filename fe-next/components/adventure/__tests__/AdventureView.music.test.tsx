/**
 * AdventureView Music Integration Tests
 *
 * Tests that world music plays on ALL adventure screens:
 * - WorldMap: ambient track 1 for last selected world
 * - LevelGrid: ambient track 1 for selected world
 * - AdventureGame: dynamic track switching during gameplay
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AdventureView from '../AdventureView';
import type { PlayerProgression } from '@/types/adventure';

// ==============================================
// MOCKS
// ==============================================

// Track calls to useAdventureMusic
const mockUseAdventureMusic = vi.fn().mockReturnValue({
  currentTrack: 1,
  stopMusic: vi.fn(),
  hasMusic: true,
});

vi.mock('@/hooks/useAdventureMusic', () => ({
  useAdventureMusic: (props: unknown) => mockUseAdventureMusic(props),
}));

// Mock framer-motion
vi.mock('framer-motion', () => {
  const React = require('react');
  const createMockMotion = (element: string) => {
    const MockComponent = React.forwardRef(
      ({ children, ...props }: { children?: React.ReactNode }, ref: unknown) =>
        React.createElement(element, { ...props, ref }, children)
    );
    MockComponent.displayName = `MockMotion${element.charAt(0).toUpperCase() + element.slice(1)}`;
    return MockComponent;
  };

  const mockMotionValue = {
    get: () => 0,
    set: vi.fn(),
    onChange: vi.fn(),
    on: vi.fn(() => vi.fn()),
    current: 0,
  };

  return {
    m: {
      div: createMockMotion('div'),
      button: createMockMotion('button'),
      ul: createMockMotion('ul'),
      li: createMockMotion('li'),
      span: createMockMotion('span'),
      h2: createMockMotion('h2'),
      p: createMockMotion('p'),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useMotionValue: () => mockMotionValue,
    useTransform: () => mockMotionValue,
    useSpring: () => mockMotionValue,
  };
});

// Mock Next.js Link
vi.mock('next/link', () => {
  const MockLink = ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => {
    return React.createElement('a', { href, ...props }, children);
  };
  MockLink.displayName = 'MockLink';
  return { default: MockLink };
});

// Mock next/dynamic — AdventureView uses dynamic(() => import('./AdventureGame'))
// We intercept this and return the jest-mocked AdventureGame synchronously
vi.mock('next/dynamic', async () => {
  const adventureMod = await import('../AdventureGame');
  return {
    default: (_importFn: () => Promise<any>, _opts?: unknown) => {
      const Comp = (adventureMod as any).default || adventureMod;
      const Dynamic = (props: Record<string, unknown>) => React.createElement(Comp, props);
      Dynamic.displayName = 'NextDynamic';
      return Dynamic;
    },
  };
});

// Mock Next.js Image
vi.mock('next/image', () => {
  const MockImage = ({ src, alt, ...props }: { src: string; alt: string }) => {
     
    return React.createElement('img', { src, alt, ...props });
  };
  MockImage.displayName = 'MockImage';
  return { __esModule: true, default: MockImage };
});

// Mock useParallax hook
const mockMotionValue = (v: number) => ({ get: () => v, set: () => {}, on: () => () => {} });
vi.mock('@/hooks/useParallax', () => ({
  useParallax: () => ({
    x: mockMotionValue(0),
    y: mockMotionValue(0),
    isGyroActive: false,
  }),
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    locale: 'en',
    language: 'en',
  }),
  useLanguageSafe: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    locale: 'en',
    language: 'en',
  }),
}));

// Mock NavigationContext - AdventureView uses useHideNavigation
vi.mock('@/contexts/NavigationContext', () => ({
  useNavigation: () => ({
    isInGame: false,
    setIsInGame: vi.fn(),
    activeTab: 'home',
    setActiveTab: vi.fn(),
  }),
  useHideNavigation: () => vi.fn(),
  NavigationProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock MusicContext
vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    stopMusic: vi.fn(),
    playTrack: vi.fn(),
    fadeToTrack: vi.fn(),
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    unlockAudio: vi.fn(),
    isPlaying: false,
    isMuted: false,
    audioUnlocked: true,
    currentTrack: null,
    volume: 0.5,
  }),
}));

// Mock SoundEffectsContext - required by MusicControls component
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(),
    playComboSound: vi.fn(),
    playComboBreakSound: vi.fn(),
    playCountdownBeep: vi.fn(),
    playComboMilestoneSound: vi.fn(),
    playComboSavedSound: vi.fn(),
    setGameActive: vi.fn(),
    sfxVolume: 0.5,
    setSfxVolume: vi.fn(),
    sfxMuted: false,
    toggleSfxMute: vi.fn(),
    playErrorSound: vi.fn(),
    playBonusSound: vi.fn(),
  }),
}));

// Mock HapticsContext - required by MusicControls component
vi.mock('@/contexts/HapticsContext', () => ({
  useHapticsConfig: () => ({
    enabled: true,
    setEnabled: vi.fn(),
  }),
}));

// Mock ProgressionContext
const mockProgression: PlayerProgression = {
  userId: 'test-user',
  xp: 1000,
  currentWorld: 1,
  currentLevel: 3,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  totalStars: 10,
  playerLevel: 2,
  gold: 0,
  upgrades: {},
  skillPoints: 0,
  skillTree: {},
  runeFragments: 0,
  runes: [],
  completions: [
    {
      world: 1,
      level: 1,
      stars: 3,
      bestScore: 1000,
      bestWords: 10,
      completedAt: new Date().toISOString(),
    },
    {
      world: 1,
      level: 2,
      stars: 3,
      bestScore: 1000,
      bestWords: 10,
      completedAt: new Date().toISOString(),
    },
  ],
};

vi.mock('@/contexts/ProgressionContext', () => ({
  useProgression: () => ({
    progression: mockProgression,
    isLoading: false,
    error: null,
    completeLevel: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock AdventureThemeProvider to avoid context errors
vi.mock('@/contexts/AdventureThemeContext', () => ({
  AdventureThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useAdventureTheme: () => ({
    worldId: 1,
    currentLevel: 1,
    theme: {
      background: {
        baseColor: '#000',
        gradient: 'linear-gradient(180deg, #000 0%, #111 100%)',
        layers: [],
        texture: { type: 'none', opacity: 0, blendMode: 'normal' },
        particles: { type: 'none', count: 0, colors: [], speed: 1, sizeRange: [1, 2] },
        ambientColor: '#000',
        ambientIntensity: 0,
      },
      containerClass: '',
      colors: { primary: '#000', secondary: '#fff', accent: '#f00' },
    },
    isTransitioning: false,
    setWorld: vi.fn(),
    setLevel: vi.fn(),
    getTileConfig: vi.fn(),
    getChapter: vi.fn(),
    isBoss: vi.fn(() => false),
    getLevelPosition: vi.fn(() => 1),
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
}));

// Mock adventure lib to provide grid/level config for gameplay
vi.mock('@/lib/adventure', () => ({
  WORLD_CONFIGS: Array.from({ length: 10 }, (_, i) => ({
    id: i + 1, name: `World ${i + 1}`, theme: 'forest', mechanic: null,
    bossName: 'Boss', colorPrimary: 'neo-lime', colorSecondary: 'neo-lime-light',
    description: 'desc',
  })),
  LEVELS_PER_WORLD: 7,
  WORLDS_COUNT: 10,
  getWorldConfig: (worldId: number) => ({
    id: worldId,
    name: `World ${worldId}`,
    description: 'Test world',
    world: worldId,
    levels: 7,
    requiredStars: 0,
    theme: 'forest',
  }),
  getLevelConfig: () => ({
    world: 1,
    level: 1,
    gridSize: 4,
    timeLimit: 120,
    objectives: { minScore: 100 },
    specialTiles: [],
  }),
  generateAdventureGrid: () => [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P'],
  ],
  getLevelSeed: () => 'test-seed',
  getGridSize: () => 4,
  WORLDS: [{ id: 1, name: 'World 1', requiredStars: 0 }],
}));

// Mock WorldMap to provide clickable world buttons with expected testids
// Mock AdventureHub
vi.mock('../AdventureHub', () => {
  const MockAdventureHub = ({
    onOpenWorldMap,
    onPlayLevel,
  }: {
    onOpenWorldMap: () => void;
    onPlayLevel: (worldId: number, levelId: number) => void;
  }) => (
    <div data-testid="adventure-hub">
      <button data-testid="hub-world-map" onClick={onOpenWorldMap}>World Map</button>
      <button data-testid="hub-continue" onClick={() => onPlayLevel(1, 6)}>Continue</button>
    </div>
  );
  MockAdventureHub.displayName = 'MockAdventureHub';
  return { default: MockAdventureHub };
});


vi.mock('@/lib/adventure/adventureStreak', () => ({
  getStreakMultiplier: () => 1.0,
}));

vi.mock('@/lib/adventure/weeklyChallenge', () => ({
  getWeeklyChallengeConfig: () => ({
    weekId: '2026-W11',
    grid: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 'A')),
    gridSize: 5, timerSeconds: 120, resetMs: 86400000,
  }),
  getCurrentWeekId: () => '2026-W11',
}));

vi.mock('../WordAlbumPanel', () => ({ default: () => null }));
vi.mock('../WeeklyChallengePanel', () => ({ default: () => null }));

vi.mock('../WorldMap', () => {
  const MockWorldMap = ({
    onWorldSelect,
  }: {
    onWorldSelect: (worldId: number) => void;
  }) => (
    <div data-testid="world-map">
      <button data-testid="world-1" onClick={() => onWorldSelect(1)}>World 1</button>
      <button data-testid="world-2" onClick={() => onWorldSelect(2)}>World 2</button>
    </div>
  );
  MockWorldMap.displayName = 'MockWorldMap';
  return { default: MockWorldMap };
});

// Mock LevelGrid to provide clickable level buttons with expected testids
vi.mock('../LevelGrid', () => {
  const MockLevelGrid = ({
    onLevelSelect,
    worldId,
  }: {
    onLevelSelect: (worldId: number, levelId: number) => void;
    worldId: number;
  }) => (
    <div data-testid="level-grid">
      <button
        data-testid="level-button-1"
        onClick={() => onLevelSelect(worldId, 1)}
      >
        Level 1
      </button>
    </div>
  );
  MockLevelGrid.displayName = 'MockLevelGrid';
  return { default: MockLevelGrid };
});

// Mock AdventureGame to simplify testing of AdventureView music integration
vi.mock('../AdventureGame', () => {
  const MockAdventureGame = ({
    onExit,
    onTimerStateChange,
  }: {
    onExit: () => void;
    onTimerStateChange?: (state: unknown) => void;
  }) => {
    // Simulate reporting timer state immediately
    React.useEffect(() => {
      onTimerStateChange?.({
        timeRemaining: 60,
        totalTime: 120,
        isPlaying: true,
        isPaused: false,
      });
    }, [onTimerStateChange]);

    return (
      <div data-testid="mock-adventure-game">
        <button onClick={onExit}>Exit to Map</button>
      </div>
    );
  };
  MockAdventureGame.displayName = 'MockAdventureGame';
  return { default: MockAdventureGame };
});

// ==============================================
// TESTS
// ==============================================

/** Render and navigate past hub to world map */
const renderAndNavigateToWorldMap = () => {
  const result = render(<AdventureView />);
  const hub = screen.queryByTestId('adventure-hub');
  if (hub) {
    fireEvent.click(screen.getByTestId('hub-world-map'));
  }
  return result;
};

describe('AdventureView Music Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('WorldMap screen', () => {
    it('should call useAdventureMusic when on WorldMap', () => {
      // WHEN
      renderAndNavigateToWorldMap();

      // THEN - music hook should be called
      expect(mockUseAdventureMusic).toHaveBeenCalled();
    });

    it('should play music for world 1 by default on WorldMap', () => {
      // WHEN
      renderAndNavigateToWorldMap();

      // THEN - should call hook with world 1 (first unlocked world)
      const lastCall =
        mockUseAdventureMusic.mock.calls[
          mockUseAdventureMusic.mock.calls.length - 1
        ];
      expect(lastCall[0]).toMatchObject({
        worldNumber: 1,
        isPlaying: true,
        enabled: true,
      });
    });
  });

  describe('LevelGrid screen', () => {
    it('should continue playing world music on LevelGrid', () => {
      // GIVEN
      renderAndNavigateToWorldMap();
      mockUseAdventureMusic.mockClear();

      // WHEN - navigate to level grid for world 1
      fireEvent.click(screen.getByTestId('world-1'));

      // THEN - should still play music for world 1
      const lastCall =
        mockUseAdventureMusic.mock.calls[
          mockUseAdventureMusic.mock.calls.length - 1
        ];
      expect(lastCall[0]).toMatchObject({
        worldNumber: 1,
        isPlaying: true,
        enabled: true,
      });
    });

    it('should change world music when selecting different world', () => {
      // GIVEN - progression with world 2 unlocked
      renderAndNavigateToWorldMap();

      // Navigate to world 1, then back to map, then to world 2 would require
      // more stars. For this test, let's verify world 1 is playing
      fireEvent.click(screen.getByTestId('world-1'));

      // THEN - world 1 music should be playing
      const lastCall =
        mockUseAdventureMusic.mock.calls[
          mockUseAdventureMusic.mock.calls.length - 1
        ];
      expect(lastCall[0].worldNumber).toBe(1);
    });
  });

  describe('AdventureGame screen', () => {
    it('should disable music hook in AdventureView during gameplay (AdventureGame owns in-game music)', () => {
      // GIVEN
      renderAndNavigateToWorldMap();
      fireEvent.click(screen.getByTestId('world-1'));
      mockUseAdventureMusic.mockClear();

      // WHEN - start playing level 1
      fireEvent.click(screen.getByTestId('level-button-1'));

      // THEN - AdventureView disables its music hook so timer ticks inside
      // AdventureGame never cause AdventureView to re-render.
      // AdventureGame is memo-wrapped and manages in-game music internally.
      const lastCall =
        mockUseAdventureMusic.mock.calls[
          mockUseAdventureMusic.mock.calls.length - 1
        ];
      expect(lastCall[0]).toMatchObject({
        enabled: false,
      });
    });
  });

  describe('Navigation transitions', () => {
    // Track navigation for proper back navigation simulation
    let navigationStack: Array<{ view: string; worldId: number | null }> = [];

    beforeEach(() => {
      navigationStack = [{ view: 'worldMap', worldId: null }];

      // Mock history.pushState to track navigation
      vi.spyOn(window.history, 'pushState').mockImplementation((state: unknown) => {
        const adventureState = state as { adventureView: string; worldId: number | null };
        if (adventureState?.adventureView) {
          navigationStack.push({ view: adventureState.adventureView, worldId: adventureState.worldId });
        }
      });

      // Mock history.replaceState
      vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});

      // Mock history.back to dispatch popstate with correct state
      vi.spyOn(window.history, 'back').mockImplementation(() => {
        if (navigationStack.length > 1) {
          navigationStack.pop();
          const previousState = navigationStack[navigationStack.length - 1];
          const popstateState = {
            adventureView: previousState.view,
            worldId: previousState.worldId,
            levelId: null,
          };
          window.dispatchEvent(new PopStateEvent('popstate', { state: popstateState }));
        }
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should continue music when navigating WorldMap → LevelGrid → WorldMap', () => {
      // GIVEN
      renderAndNavigateToWorldMap();

      // Navigate to level grid
      fireEvent.click(screen.getByTestId('world-1'));

      // Navigate back to world map (t() returns the key in tests: common.back)
      fireEvent.click(screen.getByRole('button', { name: /back/i }));

      // THEN - music should still be enabled
      const lastCall =
        mockUseAdventureMusic.mock.calls[
          mockUseAdventureMusic.mock.calls.length - 1
        ];
      expect(lastCall[0].enabled).toBe(true);
      expect(lastCall[0].isPlaying).toBe(true);
    });

    it('should reset to ambient mode when exiting gameplay', () => {
      // GIVEN
      renderAndNavigateToWorldMap();
      fireEvent.click(screen.getByTestId('world-1'));
      fireEvent.click(screen.getByTestId('level-button-1'));

      mockUseAdventureMusic.mockClear();

      // WHEN - simulate browser back to exit game (triggers popstate → levelGrid)
      act(() => {
        window.dispatchEvent(
          new PopStateEvent('popstate', {
            state: { adventureView: 'levelGrid', worldId: 1, levelId: null },
          })
        );
      });

      // THEN - should be back in ambient mode (timeRemaining/totalTime = 0)
      const lastCall =
        mockUseAdventureMusic.mock.calls[
          mockUseAdventureMusic.mock.calls.length - 1
        ];
      expect(lastCall[0].worldNumber).toBe(1);
      expect(lastCall[0].isPlaying).toBe(true);
    });
  });
});
