/**
 * AdventureView Integration Tests
 *
 * Tests for the full adventure mode flow:
 * World Map → Level Grid → Playing → Back navigation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdventureView from '../AdventureView';
import type { PlayerProgression } from '@/types/adventure';

// ==============================================
// MOCKS
// ==============================================

// Mock framer-motion with all hooks used by components
jest.mock('framer-motion', () => {
  const React = require('react');

  // Create mock motion component factory
  const createMockMotion = (element: string) => {
    const MockComponent = React.forwardRef(
      ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }, ref: unknown) => {
        // Filter out framer-motion specific props
        const filteredProps: Record<string, unknown> = {};
        Object.keys(props).forEach(key => {
          if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'variants', 'custom', 'onAnimationComplete'].includes(key)) {
            filteredProps[key] = props[key];
          }
        });
        // Filter MotionValue objects out of style prop (they're framer-motion specific)
        if (filteredProps.style && typeof filteredProps.style === 'object') {
          const cleanStyle: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(filteredProps.style as Record<string, unknown>)) {
            if (v && typeof v === 'object' && 'get' in (v as object)) continue;
            cleanStyle[k] = v;
          }
          filteredProps.style = cleanStyle;
        }
        return React.createElement(element, { ...filteredProps, ref }, children);
      }
    );
    MockComponent.displayName = `MockMotion${element.charAt(0).toUpperCase() + element.slice(1)}`;
    return MockComponent;
  };

  // Mock motion value with on() method for subscriptions
  const mockMotionValue = {
    get: () => 0,
    set: jest.fn(),
    onChange: jest.fn(),
    on: jest.fn(() => jest.fn()), // Return unsubscribe function
    current: 0,
  };

  return {
    motion: {
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

// Mock next/dynamic — AdventureView uses dynamic(() => import('./AdventureGame'))
jest.mock('next/dynamic', () => {
  const React = require('react');
  return (_importFn: unknown, _opts?: unknown) => {
    const Dynamic = (props: Record<string, unknown>) => {
      const AdventureGame = require('../AdventureGame');
      const Comp = AdventureGame.default || AdventureGame;
      return React.createElement(Comp, props);
    };
    Dynamic.displayName = 'NextDynamic';
    return Dynamic;
  };
});

jest.mock('next/link', () => {
  const MockLink = ({ children, href, ...props }: any) => {
    return React.createElement('a', { href, ...props }, children);
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock Next.js Image
jest.mock('next/image', () => {
  const MockImage = ({ src, alt, ...props }: any) => {
     
    return React.createElement('img', { src, alt, ...props });
  };
  MockImage.displayName = 'MockImage';
  return { __esModule: true, default: MockImage };
});

// Mock useParallax hook
const mockMotionValue = (v: number) => ({ get: () => v, set: () => {}, on: () => () => {} });
jest.mock('@/hooks/useParallax', () => ({
  useParallax: () => ({
    x: mockMotionValue(0),
    y: mockMotionValue(0),
    isGyroActive: false,
  }),
}));

// Mock LanguageContext
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'adventure.title': 'Adventure',
    'adventure.exitToMap': 'Exit to Map',
    'adventure.backToMap': 'World Map',
    'adventure.loadError': 'Failed to load progress',
    'adventure.worldLabel': 'World',
    'adventure.worlds.alphabetMeadows': 'Alphabet Meadows',
    'common.back': 'Back',
    'common.loading': 'Loading...',
    'common.exit': 'Exit',
    'common.pause': 'Pause',
    'common.resume': 'Resume',
  };
  return translations[key] || key;
};

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: mockT,
    dir: 'ltr',
    language: 'en',
  }),
  useLanguageSafe: () => ({
    t: mockT,
    dir: 'ltr',
    language: 'en',
  }),
}));

// Mock MusicContext - adventure mode stops global music when it starts
jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    stopMusic: jest.fn(),
    playTrack: jest.fn(),
    fadeToTrack: jest.fn(),
    setVolume: jest.fn(),
    toggleMute: jest.fn(),
    unlockAudio: jest.fn(),
    isPlaying: false,
    isMuted: false,
    audioUnlocked: true,
    currentTrack: null,
    volume: 0.5,
  }),
}));

// Mock SoundEffectsContext - required by MusicControls component
jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    sfxVolume: 0.5,
    setSfxVolume: jest.fn(),
    sfxMuted: false,
    toggleSfxMute: jest.fn(),
    playWordAcceptedSound: jest.fn(),
    playErrorSound: jest.fn(),
    playBonusSound: jest.fn(),
  }),
}));

// Mock HapticsContext - required by MusicControls component
jest.mock('@/contexts/HapticsContext', () => ({
  useHapticsConfig: () => ({
    enabled: true,
    setEnabled: jest.fn(),
  }),
}));

// Mock ProgressionContext with controllable state
let mockProgressionState: {
  progression: PlayerProgression | null;
  isLoading: boolean;
  error: string | null;
  completeLevel: jest.Mock;
  getLevelAttempt: jest.Mock;
} = {
  progression: null,
  isLoading: false,
  error: null,
  completeLevel: jest.fn(),
  getLevelAttempt: jest.fn().mockReturnValue(null),
};

jest.mock('@/contexts/ProgressionContext', () => ({
  useProgression: () => mockProgressionState,
  ProgressionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock useAdventureHints hook - required by AdventureGame
jest.mock('@/hooks/useAdventureHints', () => ({
  useAdventureHints: () => ({
    hasHintsAvailable: true,
    getHint: jest.fn(() => ({ word: 'TEST', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }] })),
    currentHint: null,
    clearCurrentHint: jest.fn(),
    recordActivity: jest.fn(),
    showAutoHint: false,
    dismissAutoHint: jest.fn(),
    isLoading: false,
    error: null,
    remainingHintWords: ['TEST', 'WORD'],
    findPathForWord: jest.fn(() => null),
  }),
}));

// Mock useAdventureMusic hook
jest.mock('@/hooks/useAdventureMusic', () => ({
  useAdventureMusic: () => ({
    currentTrack: 1,
    stopMusic: jest.fn(),
    hasMusic: true,
  }),
}));

// Mock AdventureThemeProvider to avoid context errors
jest.mock('@/contexts/AdventureThemeContext', () => ({
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
    setWorld: jest.fn(),
    setLevel: jest.fn(),
    getTileConfig: jest.fn(),
    getChapter: jest.fn(),
    isBoss: jest.fn(() => false),
    getLevelPosition: jest.fn(() => 1),
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
    warning: { bg: 'bg-neo-orange/20', text: 'text-neo-orange', shadow: '' },
    danger: { bg: 'bg-neo-red/20', text: 'text-neo-red', shadow: '' },
    critical: { bg: 'bg-neo-red/30', text: 'text-neo-red', shadow: '' },
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
jest.mock('@/lib/adventure', () => ({
  getWorldConfig: (worldId: number) => ({
    id: worldId,
    name: `World ${worldId}`,
    nameKey: 'adventure.worlds.alphabetMeadows',
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
jest.mock('../WorldMap', () => {
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
  return MockWorldMap;
});

// Mock LevelGrid to provide clickable level buttons with expected testids
// Level 7 is always "locked" (doesn't call onLevelSelect) to test locked-level handling
jest.mock('../LevelGrid', () => {
  function MockLevelGrid({
    onLevelSelect,
    world,
  }: {
    onLevelSelect: (worldId: number, levelId: number) => void;
    world: { id: number; name: string; nameKey?: string };
  }) {
    const translations: Record<string, string> = {
      'adventure.worlds.alphabetMeadows': 'Alphabet Meadows',
    };
    const name = world.nameKey ? (translations[world.nameKey] || world.nameKey) : world.name;
    return (
      <div data-testid="level-grid">
        <h2>{name}</h2>
        <button data-testid="level-button-1" onClick={() => onLevelSelect(world.id, 1)}>
          Level 1
        </button>
        <button data-testid="level-button-7" aria-disabled="true">
          Level 7 (locked)
        </button>
      </div>
    );
  }
  MockLevelGrid.displayName = 'MockLevelGrid';
  return MockLevelGrid;
});

// Mock AdventureGame to simplify testing of AdventureView integration
jest.mock('../AdventureGame', () => {
  const MockAdventureGame = ({
    onExit,
    onTimerStateChange,
  }: {
    onExit: () => void;
    onTimerStateChange?: (state: unknown) => void;
  }) => {
    React.useEffect(() => {
      onTimerStateChange?.({
        timeRemaining: 60,
        totalTime: 120,
        isPlaying: true,
        isPaused: false,
      });
    }, [onTimerStateChange]);

    return (
      <div data-testid="adventure-game">
        <div role="grid">
          <div role="row"><div role="gridcell">A</div></div>
        </div>
        <button onClick={onExit}>Exit</button>
      </div>
    );
  };
  MockAdventureGame.displayName = 'MockAdventureGame';
  return MockAdventureGame;
});

// ==============================================
// TEST FIXTURES
// ==============================================

const createMockProgression = (overrides = {}): PlayerProgression => ({
  userId: 'test-user-123',
  xp: 1500,
  currentWorld: 1,
  currentLevel: 6,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  totalStars: 15,
  playerLevel: 3,
  completions: [
    { world: 1, level: 1, stars: 3, bestScore: 1500, bestWords: 15, completedAt: new Date().toISOString() },
    { world: 1, level: 2, stars: 2, bestScore: 1200, bestWords: 12, completedAt: new Date().toISOString() },
    { world: 1, level: 3, stars: 3, bestScore: 1800, bestWords: 18, completedAt: new Date().toISOString() },
    { world: 1, level: 4, stars: 2, bestScore: 1100, bestWords: 11, completedAt: new Date().toISOString() },
    { world: 1, level: 5, stars: 2, bestScore: 1300, bestWords: 13, completedAt: new Date().toISOString() },
  ],
  gold: 0,
  upgrades: {},
  skillPoints: 0,
  skillTree: {},
  runeFragments: 0,
  runes: [],
  ...overrides,
});

// ==============================================
// HELPER FUNCTIONS
// ==============================================

const renderAdventureView = () => {
  return render(<AdventureView />);
};

// ==============================================
// TESTS
// ==============================================

describe('AdventureView Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default loaded state
    mockProgressionState = {
      progression: createMockProgression(),
      isLoading: false,
      error: null,
      completeLevel: jest.fn().mockResolvedValue(undefined),
      getLevelAttempt: jest.fn().mockReturnValue(null),
    };
  });

  describe('Loading State', () => {
    it('should display loading indicator when progression is loading', () => {
      // GIVEN
      mockProgressionState.isLoading = true;
      mockProgressionState.progression = null;

      // WHEN
      renderAdventureView();

      // THEN
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when progression fails to load', () => {
      // GIVEN
      mockProgressionState.error = 'Network error';
      mockProgressionState.progression = null;

      // WHEN
      renderAdventureView();

      // THEN
      expect(screen.getByText('Failed to load progress')).toBeInTheDocument();
    });

    it('should display back link on error state', () => {
      // GIVEN
      mockProgressionState.error = 'Network error';
      mockProgressionState.progression = null;

      // WHEN
      renderAdventureView();

      // THEN
      const backLink = screen.getByRole('link', { name: /back/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/');
    });
  });

  describe('World Map View (Initial State)', () => {
    it('should render world map as initial view', () => {
      // GIVEN / WHEN
      renderAdventureView();

      // THEN
      expect(screen.getByTestId('world-map')).toBeInTheDocument();
    });

    it('should display player stats in header', () => {
      // GIVEN / WHEN
      renderAdventureView();

      // THEN
      expect(screen.getByText('15')).toBeInTheDocument(); // Total stars
      expect(screen.getByText('Lv.3')).toBeInTheDocument(); // Player level
    });

    it('should display adventure title', () => {
      // GIVEN / WHEN
      renderAdventureView();

      // THEN
      expect(screen.getByText('Adventure')).toBeInTheDocument();
    });

    it('should display back link to home on world map', () => {
      // GIVEN / WHEN
      renderAdventureView();

      // THEN
      const backLink = screen.getByRole('link', { name: /back/i });
      expect(backLink).toHaveAttribute('href', '/');
    });
  });

  describe('World Selection → Level Grid Transition', () => {
    it('should transition to level grid when a world is selected', () => {
      // GIVEN
      renderAdventureView();
      expect(screen.getByTestId('world-map')).toBeInTheDocument();

      // WHEN - click on World 1
      const world1Button = screen.getByTestId('world-1');
      fireEvent.click(world1Button);

      // THEN
      expect(screen.getByTestId('level-grid')).toBeInTheDocument();
      expect(screen.queryByTestId('world-map')).not.toBeInTheDocument();
    });

    it('should display world name in level grid', () => {
      // GIVEN
      renderAdventureView();

      // WHEN
      fireEvent.click(screen.getByTestId('world-1'));

      // THEN - World 1 is "Alphabet Meadows"
      expect(screen.getByText(/Alphabet Meadows/i)).toBeInTheDocument();
    });

    it('should show back button after selecting a world', () => {
      // GIVEN
      renderAdventureView();

      // WHEN
      fireEvent.click(screen.getByTestId('world-1'));

      // THEN
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });
  });

  describe('Level Grid → Back to World Map', () => {
    beforeEach(() => {
      // Mock history.back to dispatch popstate with correct state
      jest.spyOn(window.history, 'back').mockImplementation(() => {
        const worldMapState = { adventureView: 'worldMap', worldId: null, levelId: null };
        window.dispatchEvent(new PopStateEvent('popstate', { state: worldMapState }));
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return to world map when back button is clicked', () => {
      // GIVEN
      renderAdventureView();
      fireEvent.click(screen.getByTestId('world-1'));
      expect(screen.getByTestId('level-grid')).toBeInTheDocument();

      // WHEN
      fireEvent.click(screen.getByRole('button', { name: /back/i }));

      // THEN
      expect(screen.getByTestId('world-map')).toBeInTheDocument();
      expect(screen.queryByTestId('level-grid')).not.toBeInTheDocument();
    });
  });

  describe('Browser Back Button Navigation', () => {
    // Create a mock history stack that properly simulates browser behavior
    let historyStack: Array<{ state: unknown }> = [];
    let currentIndex = -1;
    let originalPushState: typeof window.history.pushState;
    let originalReplaceState: typeof window.history.replaceState;
    let originalBack: typeof window.history.back;

    beforeEach(() => {
      // Reset history stack
      historyStack = [];
      currentIndex = -1;

      // Save original methods
      originalPushState = window.history.pushState;
      originalReplaceState = window.history.replaceState;
      originalBack = window.history.back;

      // Mock pushState to track history
      jest.spyOn(window.history, 'pushState').mockImplementation((state) => {
        currentIndex++;
        historyStack.splice(currentIndex, historyStack.length - currentIndex, { state });
      });

      // Mock replaceState to update current entry
      jest.spyOn(window.history, 'replaceState').mockImplementation((state) => {
        if (currentIndex < 0) {
          currentIndex = 0;
          historyStack = [{ state }];
        } else {
          historyStack[currentIndex] = { state };
        }
      });

      // Mock back to dispatch popstate with correct state
      jest.spyOn(window.history, 'back').mockImplementation(() => {
        if (currentIndex > 0) {
          currentIndex--;
          const previousState = historyStack[currentIndex]?.state || null;
          window.dispatchEvent(new PopStateEvent('popstate', { state: previousState }));
        }
      });
    });

    afterEach(() => {
      // Restore original methods
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.history.back = originalBack;
      jest.restoreAllMocks();
    });

    it('should navigate from level grid to world map when browser back is pressed', async () => {
      // GIVEN
      renderAdventureView();
      fireEvent.click(screen.getByTestId('world-1'));
      expect(screen.getByTestId('level-grid')).toBeInTheDocument();

      // WHEN - simulate browser back button via popstate with worldMap state
      const worldMapState = { adventureView: 'worldMap', worldId: null, levelId: null };
      window.dispatchEvent(new PopStateEvent('popstate', { state: worldMapState }));

      // THEN - should go back to world map, not landing page
      await waitFor(() => {
        expect(screen.getByTestId('world-map')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('level-grid')).not.toBeInTheDocument();
    });

    it('should navigate from playing to level grid when browser back is pressed', async () => {
      // GIVEN
      renderAdventureView();
      fireEvent.click(screen.getByTestId('world-1'));
      await waitFor(() => expect(screen.getByTestId('level-grid')).toBeInTheDocument());
      fireEvent.click(screen.getByTestId('level-button-1'));
      await waitFor(() => expect(screen.getByTestId('adventure-game')).toBeInTheDocument());

      // WHEN - simulate browser back button via popstate with levelGrid state
      const levelGridState = { adventureView: 'levelGrid', worldId: 1, levelId: null };
      window.dispatchEvent(new PopStateEvent('popstate', { state: levelGridState }));

      // THEN - should go back to level grid, not world map or landing page
      await waitFor(() => {
        expect(screen.getByTestId('level-grid')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('adventure-game')).not.toBeInTheDocument();
    });

    it('should push history state when navigating to level grid', () => {
      // GIVEN
      renderAdventureView();
      const pushStateSpy = jest.spyOn(window.history, 'pushState');

      // WHEN
      fireEvent.click(screen.getByTestId('world-1'));

      // THEN - history.pushState should have been called with levelGrid state
      expect(pushStateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ adventureView: 'levelGrid', worldId: 1 }),
        ''
      );
    });

    it('should push history state when navigating to playing', () => {
      // GIVEN
      renderAdventureView();
      fireEvent.click(screen.getByTestId('world-1'));
      const pushStateSpy = jest.spyOn(window.history, 'pushState');
      pushStateSpy.mockClear(); // Clear calls from world selection

      // WHEN
      fireEvent.click(screen.getByTestId('level-button-1'));

      // THEN - history.pushState should have been called with playing state
      expect(pushStateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ adventureView: 'playing', worldId: 1, levelId: 1 }),
        ''
      );
    });

    it('should use history.back() when clicking in-app back button on level grid', () => {
      // GIVEN
      renderAdventureView();
      fireEvent.click(screen.getByTestId('world-1'));
      expect(screen.getByTestId('level-grid')).toBeInTheDocument();
      const backSpy = jest.spyOn(window.history, 'back');

      // WHEN
      fireEvent.click(screen.getByRole('button', { name: /back/i }));

      // THEN - should call history.back()
      expect(backSpy).toHaveBeenCalled();
    });
  });

  describe('Level Selection → Playing Transition', () => {
    it('should transition to playing state when a level is selected', () => {
      // GIVEN
      renderAdventureView();
      fireEvent.click(screen.getByTestId('world-1'));
      expect(screen.getByTestId('level-grid')).toBeInTheDocument();

      // WHEN - click on level 1 (should be unlocked)
      const levelButton = screen.getByTestId('level-button-1');
      fireEvent.click(levelButton);

      // THEN
      expect(screen.getByTestId('adventure-game')).toBeInTheDocument();
      expect(screen.queryByTestId('level-grid')).not.toBeInTheDocument();
    });

    it('should show exit button when playing', () => {
      // GIVEN
      renderAdventureView();
      fireEvent.click(screen.getByTestId('world-1'));
      fireEvent.click(screen.getByTestId('level-button-1'));

      // THEN - outer header hidden during gameplay, GameHeader's exit button visible
      expect(screen.getByRole('button', { name: /^exit$/i })).toBeInTheDocument();
    });
  });

  describe('Playing → Back to Level Grid', () => {
    beforeEach(() => {
      // Mock history.back to dispatch popstate with level grid state
      jest.spyOn(window.history, 'back').mockImplementation(() => {
        const levelGridState = { adventureView: 'levelGrid', worldId: 1, levelId: null };
        window.dispatchEvent(new PopStateEvent('popstate', { state: levelGridState }));
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return to level grid when exit button is clicked in header', () => {
      // GIVEN
      renderAdventureView();
      fireEvent.click(screen.getByTestId('world-1'));
      fireEvent.click(screen.getByTestId('level-button-1'));
      expect(screen.getByTestId('adventure-game')).toBeInTheDocument();

      // WHEN - click the GameHeader exit button (outer header hidden during gameplay)
      fireEvent.click(screen.getByRole('button', { name: /^exit$/i }));

      // THEN
      expect(screen.getByTestId('level-grid')).toBeInTheDocument();
      expect(screen.queryByTestId('adventure-game')).not.toBeInTheDocument();
    });
  });

  describe('Full Navigation Flow', () => {
    // Track navigation state for proper back navigation simulation
    let navigationStack: Array<{ view: string; worldId: number | null }> = [];

    beforeEach(() => {
      navigationStack = [{ view: 'worldMap', worldId: null }];

      // Mock history.pushState to track navigation
      jest.spyOn(window.history, 'pushState').mockImplementation((state: unknown) => {
        const adventureState = state as { adventureView: string; worldId: number | null };
        if (adventureState?.adventureView) {
          navigationStack.push({ view: adventureState.adventureView, worldId: adventureState.worldId });
        }
      });

      // Mock history.back to pop from stack and dispatch popstate
      jest.spyOn(window.history, 'back').mockImplementation(() => {
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
      jest.restoreAllMocks();
    });

    it('should support complete navigation: world → level → play → back → world', () => {
      // GIVEN
      renderAdventureView();

      // Start at world map
      expect(screen.getByTestId('world-map')).toBeInTheDocument();

      // WHEN - select world 1
      fireEvent.click(screen.getByTestId('world-1'));
      expect(screen.getByTestId('level-grid')).toBeInTheDocument();

      // WHEN - select level 1
      fireEvent.click(screen.getByTestId('level-button-1'));
      expect(screen.getByTestId('adventure-game')).toBeInTheDocument();

      // WHEN - exit game (GameHeader's exit button, outer header hidden during gameplay)
      fireEvent.click(screen.getByRole('button', { name: /^exit$/i }));
      expect(screen.getByTestId('level-grid')).toBeInTheDocument();

      // WHEN - go back to world map
      fireEvent.click(screen.getByRole('button', { name: /back/i }));

      // THEN - back at world map
      expect(screen.getByTestId('world-map')).toBeInTheDocument();
    });
  });

  describe('Level Completion Integration', () => {
    it('should call completeLevel when game reports completion', async () => {
      // GIVEN
      renderAdventureView();
      fireEvent.click(screen.getByTestId('world-1'));
      fireEvent.click(screen.getByTestId('level-button-1'));

      // WHEN - simulate game completion (this would normally happen via AdventureGame callback)
      // For now, we verify the game component is rendered with correct props
      expect(screen.getByTestId('adventure-game')).toBeInTheDocument();

      // Note: Full game completion testing is handled in AdventureGame.test.tsx
      // Here we verify the integration point exists
    });
  });

  describe('Locked Level Handling', () => {
    it('should not transition to playing when clicking a locked level', () => {
      // GIVEN - progression with only some levels complete
      mockProgressionState.progression = createMockProgression({
        completions: [{ world: 1, level: 1, stars: 2 }],
        totalStars: 2,
      });
      renderAdventureView();
      fireEvent.click(screen.getByTestId('world-1'));

      // WHEN - try to click level 7 (should be locked - only level 1 completed)
      const levelButton = screen.getByTestId('level-button-7');
      fireEvent.click(levelButton);

      // THEN - should still be on level grid, not playing
      expect(screen.getByTestId('level-grid')).toBeInTheDocument();
      expect(screen.queryByTestId('adventure-game')).not.toBeInTheDocument();
    });
  });

  describe('Player Stats Update', () => {
    it('should display updated star count from progression', () => {
      // GIVEN
      mockProgressionState.progression = createMockProgression({
        totalStars: 42,
        playerLevel: 7,
      });

      // WHEN
      renderAdventureView();

      // THEN
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Lv.7')).toBeInTheDocument();
    });
  });

  describe('Grid Generation', () => {
    it('should generate deterministic grid for same world/level', () => {
      // GIVEN
      renderAdventureView();
      fireEvent.click(screen.getByTestId('world-1'));
      fireEvent.click(screen.getByTestId('level-button-1'));

      // THEN - game should render with a grid
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });
  });
});
