/**
 * SinglePlayerView — returning-player bots gate
 *
 * After a user has played their first SP-vs-bots game, re-entering via
 * autoStart=bots (or preset=bots) should redirect to multiplayer Quick Play
 * instead of re-launching bots. First-timers are unaffected.
 */

import { act } from 'react';
import { render, waitFor } from '@testing-library/react';

let mockSearchParams = new Map<string, string>();
const mockRouterReplace = vi.fn();
const mockRouterPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) || null,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

const mockSetIsInGame = vi.fn();
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => mockSetIsInGame,
}));

vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    unlockAudio: vi.fn(),
    playBackgroundMusic: vi.fn(),
    stopBackgroundMusic: vi.fn(),
    isPlaying: false,
  }),
}));

vi.mock('@/hooks/useGameMusic', () => ({ useGameMusic: vi.fn() }));
vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { pullDistance: 0, isRefreshing: false },
  }),
}));

vi.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: vi.fn().mockReturnValue(false),
  markGuidanceShown: vi.fn(),
}));

vi.mock('@/hooks/useFeatureUnlockNotifications', () => ({
  useFeatureUnlockNotifications: vi.fn(),
}));

vi.mock('@/utils/playerStats', () => ({
  recordGameResult: vi.fn().mockReturnValue({ isNewHighScore: false, previousBest: null, isNewAllTimeBest: false }),
  getConfigRecord: vi.fn().mockReturnValue(null),
}));

vi.mock('../SinglePlayerGame', () => {
  const Mock = () => <div data-testid="game">Game</div>;
  Mock.displayName = 'MockGame';
  return { default: Mock };
});
vi.mock('../SinglePlayerResults', () => {
  const Mock = () => <div data-testid="results">Results</div>;
  Mock.displayName = 'MockResults';
  return { default: Mock };
});
vi.mock('../PreGameTutorial', () => {
  const Mock = () => <div data-testid="pre-game-tutorial">Tutorial</div>;
  Mock.displayName = 'MockTutorial';
  return { default: Mock };
});
vi.mock('@/components/AutoHideHeader', () => {
  const Mock = () => null;
  Mock.displayName = 'MockHeader';
  return { default: Mock };
});
vi.mock('@/components/ui/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

vi.mock('../highScoreManager', () => ({
  getHighScore: vi.fn().mockReturnValue(null),
  getAllTimeBest: vi.fn().mockReturnValue(null),
}));
vi.mock('@/utils/playerProgressStorage', () => ({
  incrementTrainingGames: vi.fn(),
}));

vi.mock('../presetConfig', () => ({
  getMinWordLength: vi.fn().mockReturnValue(3),
  getDefaultPreset: vi.fn().mockImplementation((mode: string) => {
    if (mode === 'solo-bots') {
      return {
        id: 'standard',
        settings: { difficulty: 'MEDIUM', timerSeconds: 120, bots: 2, botDifficulty: 'medium' },
      };
    }
    if (mode === 'practice') {
      return {
        id: 'explorer',
        settings: { difficulty: 'EASY', timerSeconds: 0, bots: 0, botDifficulty: 'easy' },
      };
    }
    return null;
  }),
  getPresetById: vi.fn().mockReturnValue(null),
}));

import SinglePlayerView from '../SinglePlayerView';
import { markBotsGamePlayed, clearBotsGamePlayed } from '@/utils/onboardingStorage';

describe('SinglePlayerView — returning-player bots gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new Map();
    localStorage.clear();
  });

  afterEach(() => {
    clearBotsGamePlayed();
    localStorage.clear();
  });

  it('redirects to multiplayer quick play when returning player opens autoStart=bots', async () => {
    markBotsGamePlayed();
    mockSearchParams.set('autoStart', 'bots');

    await act(async () => {
      render(<SinglePlayerView />);
    });

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith('/en/multiplayer?quickPlay=true');
    });
  });

  it('redirects returning player when preset=bots is used', async () => {
    markBotsGamePlayed();
    mockSearchParams.set('preset', 'bots');

    await act(async () => {
      render(<SinglePlayerView />);
    });

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith('/en/multiplayer?quickPlay=true');
    });
  });

  it('does NOT redirect first-time player (flag unset)', async () => {
    mockSearchParams.set('autoStart', 'bots');

    await act(async () => {
      render(<SinglePlayerView />);
    });

    await waitFor(() => {
      // first-timer reaches the game; redirect never fires
      expect(mockRouterReplace).not.toHaveBeenCalled();
    });
  });

  it('does NOT redirect practice mode even for returning player', async () => {
    markBotsGamePlayed();
    mockSearchParams.set('autoStart', 'practice');

    await act(async () => {
      render(<SinglePlayerView />);
    });

    // practice is a legitimate non-bots flow — must be preserved
    await new Promise(r => setTimeout(r, 50));
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('does NOT redirect UGC boardCode entries even for returning player', async () => {
    markBotsGamePlayed();
    mockSearchParams.set('boardCode', 'ABC123');

    await act(async () => {
      render(<SinglePlayerView />);
    });

    await new Promise(r => setTimeout(r, 50));
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('only fires redirect once (idempotent)', async () => {
    markBotsGamePlayed();
    mockSearchParams.set('autoStart', 'bots');

    const { rerender } = await act(async () => render(<SinglePlayerView />));

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      rerender(<SinglePlayerView />);
    });

    expect(mockRouterReplace).toHaveBeenCalledTimes(1);
  });
});
