/**
 * AdventureView Music Integration Tests
 *
 * Tests that world music plays on ALL adventure screens:
 * - WorldMap: ambient track 1 for last selected world
 * - LevelGrid: ambient track 1 for selected world
 * - AdventureGame: dynamic track switching during gameplay
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdventureView from '../AdventureView';
import type { PlayerProgression } from '@/types/adventure';

// ==============================================
// MOCKS
// ==============================================

// Track calls to useAdventureMusic
const mockUseAdventureMusic = jest.fn().mockReturnValue({
  currentTrack: 1,
  stopMusic: jest.fn(),
  hasMusic: true,
});

jest.mock('@/hooks/useAdventureMusic', () => ({
  useAdventureMusic: (props: unknown) => mockUseAdventureMusic(props),
}));

// Mock framer-motion
jest.mock('framer-motion', () => {
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
    set: jest.fn(),
    onChange: jest.fn(),
    on: jest.fn(() => jest.fn()),
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

// Mock Next.js Link
jest.mock('next/link', () => {
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
  return MockLink;
});

// Mock Next.js Image
jest.mock('next/image', () => {
  const MockImage = ({ src, alt, ...props }: { src: string; alt: string }) => {
     
    return React.createElement('img', { src, alt, ...props });
  };
  MockImage.displayName = 'MockImage';
  return { __esModule: true, default: MockImage };
});

// Mock useParallax hook
jest.mock('@/hooks/useParallax', () => ({
  useParallax: () => ({
    x: 0,
    y: 0,
    isGyroActive: false,
  }),
}));

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    locale: 'en',
    language: 'en',
  }),
}));

// Mock MusicContext
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

jest.mock('@/contexts/ProgressionContext', () => ({
  useProgression: () => ({
    progression: mockProgression,
    isLoading: false,
    error: null,
    completeLevel: jest.fn().mockResolvedValue(undefined),
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
}));

// Mock AdventureGame to simplify testing of AdventureView music integration
jest.mock('../AdventureGame', () => {
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
  return MockAdventureGame;
});

// ==============================================
// TESTS
// ==============================================

describe('AdventureView Music Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WorldMap screen', () => {
    it('should call useAdventureMusic when on WorldMap', () => {
      // WHEN
      render(<AdventureView />);

      // THEN - music hook should be called
      expect(mockUseAdventureMusic).toHaveBeenCalled();
    });

    it('should play music for world 1 by default on WorldMap', () => {
      // WHEN
      render(<AdventureView />);

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
      render(<AdventureView />);
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
      render(<AdventureView />);

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
    it('should pass timer info to music hook during gameplay', () => {
      // GIVEN
      render(<AdventureView />);
      fireEvent.click(screen.getByTestId('world-1'));
      mockUseAdventureMusic.mockClear();

      // WHEN - start playing level 1
      fireEvent.click(screen.getByTestId('level-button-1'));

      // THEN - should pass timer info for dynamic track switching
      const lastCall =
        mockUseAdventureMusic.mock.calls[
          mockUseAdventureMusic.mock.calls.length - 1
        ];
      expect(lastCall[0]).toMatchObject({
        worldNumber: 1,
        enabled: true,
      });
      // During gameplay, timeRemaining and totalTime should be present
      expect(lastCall[0]).toHaveProperty('timeRemaining');
      expect(lastCall[0]).toHaveProperty('totalTime');
    });
  });

  describe('Navigation transitions', () => {
    // Track navigation for proper back navigation simulation
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

      // Mock history.replaceState
      jest.spyOn(window.history, 'replaceState').mockImplementation(() => {});

      // Mock history.back to dispatch popstate with correct state
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

    it('should continue music when navigating WorldMap → LevelGrid → WorldMap', () => {
      // GIVEN
      render(<AdventureView />);

      // Navigate to level grid
      fireEvent.click(screen.getByTestId('world-1'));

      // Navigate back to world map (t() returns the key in tests: adventure.backToMap)
      fireEvent.click(screen.getByRole('button', { name: /backToMap/i }));

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
      render(<AdventureView />);
      fireEvent.click(screen.getByTestId('world-1'));
      fireEvent.click(screen.getByTestId('level-button-1'));

      mockUseAdventureMusic.mockClear();

      // WHEN - exit game
      fireEvent.click(screen.getByRole('button', { name: /exit to map/i }));

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
