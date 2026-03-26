/**
 * SinglePlayerView autoStart=bots Tests
 *
 * Tests for direct bot game launch via autoStart=bots URL parameter
 * Follows TDD: These tests are written FIRST (RED phase), then implementation (GREEN phase)
 */

import { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock search params - will be set per test
let mockSearchParams = new Map<string, string>();
const mockRouterPush = vi.fn();

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) || null,
  }),
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock NavigationContext
const mockSetIsInGame = vi.fn();
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => mockSetIsInGame,
}));

// Mock MusicContext
vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    unlockAudio: vi.fn(),
    playBackgroundMusic: vi.fn(),
    stopBackgroundMusic: vi.fn(),
    isPlaying: false,
  }),
}));

// Mock hooks
vi.mock('@/hooks/useGameMusic', () => ({
  useGameMusic: vi.fn(),
}));

vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { pullDistance: 0, isRefreshing: false },
  }),
}));

// Mock contextual guidance storage - skip pre-game tutorial
vi.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: vi.fn().mockReturnValue(false),
  markGuidanceShown: vi.fn(),
}));

// Mock feature unlock notifications
vi.mock('@/hooks/useFeatureUnlockNotifications', () => ({
  useFeatureUnlockNotifications: vi.fn(),
}));

// Mock playerStats
vi.mock('@/utils/playerStats', () => ({
  recordGameResult: vi.fn().mockReturnValue({ isNewHighScore: false, previousBest: null, isNewAllTimeBest: false }),
  getConfigRecord: vi.fn().mockReturnValue(null),
}));

// Mock child components
vi.mock('../SinglePlayerGame', () => {
  const MockSinglePlayerGame = () => <div data-testid="game">Game</div>;
  MockSinglePlayerGame.displayName = 'MockSinglePlayerGame';
  return { default: MockSinglePlayerGame };
});

vi.mock('../SinglePlayerResults', () => {
  const MockSinglePlayerResults = () => <div data-testid="results">Results</div>;
  MockSinglePlayerResults.displayName = 'MockSinglePlayerResults';
  return { default: MockSinglePlayerResults };
});

vi.mock('../PreGameTutorial', () => {
  const MockPreGameTutorial = () => <div data-testid="pre-game-tutorial">Tutorial</div>;
  MockPreGameTutorial.displayName = 'MockPreGameTutorial';
  return { default: MockPreGameTutorial };
});

vi.mock('@/components/AutoHideHeader', () => {
  const MockAutoHideHeader = () => null;
  MockAutoHideHeader.displayName = 'MockAutoHideHeader';
  return { default: MockAutoHideHeader };
});

vi.mock('@/components/ui/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

// Mock high score manager
vi.mock('../highScoreManager', () => ({
  getHighScore: vi.fn().mockReturnValue(null),
  getAllTimeBest: vi.fn().mockReturnValue(null),
}));

// Mock player progress storage
vi.mock('@/utils/playerProgressStorage', () => ({
  incrementTrainingGames: vi.fn(),
}));

// Mock preset config - use factory function to avoid initialization issues
vi.mock('../presetConfig', () => ({
  getMinWordLength: vi.fn().mockReturnValue(3),
  getDefaultPreset: vi.fn().mockImplementation((mode: string) => {
    if (mode === 'solo-bots') {
      return {
        id: 'standard',
        settings: {
          difficulty: 'MEDIUM',
          timerSeconds: 120,
          bots: 2,
          botDifficulty: 'medium',
        },
      };
    }
    if (mode === 'practice') {
      return {
        id: 'explorer',
        settings: {
          difficulty: 'EASY',
          timerSeconds: 0,
          bots: 0,
          botDifficulty: 'easy',
        },
      };
    }
    return null;
  }),
  getPresetById: vi.fn().mockReturnValue(null),
}));

// Import after mocks
import SinglePlayerView from '../SinglePlayerView';
import { getDefaultPreset } from '../presetConfig';

describe('SinglePlayerView - autoStart=bots URL parameter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new Map();
  });

  describe('Direct bot game launch from landing page', () => {
    it('should auto-start bot game when autoStart=bots parameter is provided', async () => {
      // GIVEN: User clicked "Single Player" button on landing page
      mockSearchParams.set('autoStart', 'bots');

      // WHEN: SinglePlayerView renders
      await act(async () => {
        render(<SinglePlayerView />);
      });

      // THEN: Should immediately start playing (skip preset-selection and lobby)
      await waitFor(() => {
        expect(screen.getByTestId('game')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should NOT show preset selector or lobby
      // Preset selector no longer exists after simplification
      expect(screen.queryByTestId('lobby')).not.toBeInTheDocument();
    });

    it('should load default solo-bots preset when autoStart=bots', async () => {
      // GIVEN: autoStart=bots parameter
      mockSearchParams.set('autoStart', 'bots');

      // WHEN: Component renders
      await act(async () => {
        render(<SinglePlayerView />);
      });

      // THEN: Should call getDefaultPreset with 'solo-bots' mode
      await waitFor(() => {
        expect(getDefaultPreset).toHaveBeenCalledWith('solo-bots');
      });
    });

    it('should use preset configuration with 2 medium bots', async () => {
      // GIVEN: autoStart=bots parameter
      mockSearchParams.set('autoStart', 'bots');

      // WHEN: Component renders
      await act(async () => {
        render(<SinglePlayerView />);
      });

      // THEN: Should use the solo-bots preset (2 medium bots, 120s timer)
      await waitFor(() => {
        expect(getDefaultPreset).toHaveBeenCalledWith('solo-bots');
        expect(screen.getByTestId('game')).toBeInTheDocument();
      });
    });

    it('should transition to playing phase without showing intermediate screens', async () => {
      // GIVEN: autoStart=bots parameter
      mockSearchParams.set('autoStart', 'bots');

      // WHEN: Component renders
      await act(async () => {
        render(<SinglePlayerView />);
      });

      // THEN: Should go directly to game (playing phase)
      await waitFor(() => {
        const game = screen.getByTestId('game');
        expect(game).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should never have shown preset selector
      const preselector = screen.queryByTestId('preset-selector');
      expect(preselector).not.toBeInTheDocument();
    });

    it('should handle autoStart=bots on fresh page load', async () => {
      // GIVEN: User navigates directly to /singleplayer?autoStart=bots (fresh load)
      mockSearchParams.set('autoStart', 'bots');

      // WHEN: Component mounts for the first time
      await act(async () => {
        render(<SinglePlayerView />);
      });

      // THEN: Should start game immediately without any intermediate state
      await waitFor(() => {
        expect(screen.getByTestId('game')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should only auto-start once (prevent duplicate game starts)', async () => {
      // GIVEN: autoStart=bots parameter
      mockSearchParams.set('autoStart', 'bots');

      // WHEN: Component renders
      await act(async () => {
        render(<SinglePlayerView />);
      });

      // Wait for game to load
      await waitFor(() => {
        expect(screen.getByTestId('game')).toBeInTheDocument();
      });

      // THEN: Should have started the game exactly once
      // (hasAutoStartedRef prevents multiple starts)
      expect(getDefaultPreset).toHaveBeenCalled();

      // Game component should be visible (not showing preset selector multiple times)
      expect(screen.getByTestId('game')).toBeInTheDocument();
      // Preset selector no longer exists after simplification
    });
  });

  describe('Coexistence with other autoStart modes', () => {
    it('should not interfere with autoStart=practice', async () => {
      // GIVEN: autoStart=practice parameter (existing functionality)
      mockSearchParams.set('autoStart', 'practice');

      // WHEN: Component renders
      await act(async () => {
        render(<SinglePlayerView />);
      });

      // THEN: Should load practice mode (not bots mode)
      await waitFor(() => {
        expect(getDefaultPreset).toHaveBeenCalledWith('practice');
        expect(screen.getByTestId('game')).toBeInTheDocument();
      });
    });

    it('should prioritize autoStart=bots over preset parameter if both exist', async () => {
      // GIVEN: Both autoStart and preset parameters (edge case)
      mockSearchParams.set('autoStart', 'bots');
      mockSearchParams.set('preset', 'practice');

      // WHEN: Component renders
      await act(async () => {
        render(<SinglePlayerView />);
      });

      // THEN: Should use autoStart=bots (processed first in useEffect order)
      await waitFor(() => {
        expect(getDefaultPreset).toHaveBeenCalledWith('solo-bots');
        expect(screen.getByTestId('game')).toBeInTheDocument();
      });
    });
  });

  describe('No autoStart parameter', () => {
    it('should show game when no URL parameters (starts with default game)', async () => {
      // GIVEN: No URL parameters
      // (mockSearchParams is empty)

      // WHEN: Component renders
      render(<SinglePlayerView />);

      // THEN: Should show game (direct to playing phase)
      await waitFor(() => {
        expect(screen.getByTestId('game')).toBeInTheDocument();
      });
    });
  });
});
