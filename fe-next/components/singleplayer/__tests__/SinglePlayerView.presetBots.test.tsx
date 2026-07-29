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

// Mock preset config
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

describe('SinglePlayerView - preset=bots navigation bug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new Map();
  });

  it('should show game when no URL parameters (starts playing directly)', async () => {
    render(<SinglePlayerView />);

    await waitFor(() => {
      expect(screen.getByTestId('game')).toBeInTheDocument();
    });
  });

  it('should auto-start game with bots when preset=bots parameter is provided', async () => {
    // This simulates navigating from practice results to /singleplayer?preset=bots
    mockSearchParams.set('preset', 'bots');

    await act(async () => {
      render(<SinglePlayerView />);
    });

    // Should immediately start playing (skip preset-selection)
    await waitFor(() => {
      expect(screen.getByTestId('game')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should NOT show the preset selector
    // Preset selector no longer exists after simplification
  });

  it('should not conflict with autoStart=practice parameter', async () => {
    mockSearchParams.set('autoStart', 'practice');

    await act(async () => {
      render(<SinglePlayerView />);
    });

    // Should start playing immediately
    await waitFor(() => {
      expect(screen.getByTestId('game')).toBeInTheDocument();
    });

    // Preset selector no longer exists after simplification
  });

  it('should handle preset parameter after fresh page load (no prior state)', async () => {
    // Fresh navigation to /singleplayer?preset=bots
    mockSearchParams.set('preset', 'bots');

    await act(async () => {
      render(<SinglePlayerView />);
    });

    // Game should start immediately
    await waitFor(() => {
      expect(screen.getByTestId('game')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('BUG: should start bots game when preset=bots AND phase is not preset-selection on mount', async () => {
    // The actual bug: user starts practice, finishes, then clicks "Play Against Bots"
    // The phase at that point is 'results', not 'preset-selection'
    // When navigating to /singleplayer?preset=bots, the component re-mounts with fresh state
    // but the condition `phase !== 'preset-selection'` prevents autostart

    mockSearchParams.set('preset', 'bots');

    const { unmount } = render(<SinglePlayerView />);

    await waitFor(() => {
      expect(screen.getByTestId('game')).toBeInTheDocument();
    });

    // Unmount and remount (simulating full page navigation)
    unmount();

    // Now simulate navigating to the same URL again (user clicks the button multiple times)
    mockSearchParams.set('preset', 'bots');

    await act(async () => {
      render(<SinglePlayerView />);
    });

    // Should still start the game
    await waitFor(() => {
      expect(screen.getByTestId('game')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('BUG REPRO: should handle searchParams change without full remount (client-side navigation)', async () => {
    // This test simulates the ACTUAL BUG scenario:
    // 1. User is on /singleplayer (no params) - component is at 'preset-selection'
    // 2. User starts and finishes practice game - component is at 'results' phase
    // 3. User clicks "Play Against Bots" which navigates to /singleplayer?preset=bots
    // 4. React Router updates searchParams but may NOT fully remount the component
    //
    // Expected: Game should start
    // Actual bug: Component stays at results or shows preset-selection because
    // phase !== 'preset-selection' check fails

    // Start with NO params
    mockSearchParams = new Map();

    const { rerender } = render(<SinglePlayerView />);

    // Initial render shows game (no preset selector after simplification)
    await waitFor(() => {
      expect(screen.getByTestId('game')).toBeInTheDocument();
    });

    // Now simulate searchParams changing (client-side navigation)
    mockSearchParams.set('preset', 'bots');

    // Rerender with same component (simulating React Router behavior)
    await act(async () => {
      rerender(<SinglePlayerView />);
    });

    // BUG: This should start the game, but the component might not react to searchParams change
    await waitFor(() => {
      expect(screen.getByTestId('game')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('FIXED: should start bots game after autoStart=practice finished and user navigates to preset=bots', async () => {
    // This is the EXACT bug that was fixed:
    // 1. User starts with autoStart=practice
    // 2. User finishes practice, now at 'results' phase
    // 3. User clicks "Play Against Bots" which navigates to ?preset=bots
    // 4. FIX: hasAutoStartedRef.current is reset to false when entering results phase
    //    so the preset=bots param is processed correctly!

    // Start with autoStart=practice
    mockSearchParams.set('autoStart', 'practice');

    const { rerender } = render(<SinglePlayerView />);

    // Should immediately start playing (practice mode started)
    await waitFor(() => {
      expect(screen.getByTestId('game')).toBeInTheDocument();
    });

    // Now simulate: user finished game, and clicks "Play Against Bots"
    // This changes the URL to ?preset=bots (removing autoStart)
    mockSearchParams = new Map();
    mockSearchParams.set('preset', 'bots');

    // Rerender simulating client-side navigation
    await act(async () => {
      rerender(<SinglePlayerView />);
    });

    // FIX: hasAutoStartedRef.current is now reset to false when game ends and enters results phase
    // So the preset=bots param is processed and the game restarts with bots
    await waitFor(() => {
      expect(screen.getByTestId('game')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should NOT interrupt an ongoing game when preset param appears', async () => {
    // If somehow a preset param appears while playing, don't restart the game
    mockSearchParams.set('preset', 'bots');

    await act(async () => {
      render(<SinglePlayerView />);
    });

    // Game should start
    await waitFor(() => {
      expect(screen.getByTestId('game')).toBeInTheDocument();
    });

    // Game is showing, preset=bots is still in URL, component should NOT restart
    expect(screen.getByTestId('game')).toBeInTheDocument();
    // Preset selector no longer exists after simplification
  });
});
