/**
 * SinglePlayerView autoStart=challenge Tests
 *
 * The async friend-challenge flow routes BOTH sides (challenger via
 * `pendingAsyncChallenge`, accepting friend via `pendingFriendChallenge`) to
 * /singleplayer?autoStart=challenge so the player can actually COMPLETE a board.
 * Previously the flow routed to /?asyncChallenge=new / /?friendChallenge=, which
 * no code read — the player was stranded on the landing page and the producer
 * hook never fired.
 *
 * Spec: fe-next/docs/specs/2026-05-13-friend-challenge-async-design.md
 */

import { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';

let mockSearchParams = new Map<string, string>();
const mockRouterPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => ({ get: (key: string) => mockSearchParams.get(key) || null }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
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
vi.mock('../highScoreManager', () => ({
  getHighScore: vi.fn().mockReturnValue(null),
  getAllTimeBest: vi.fn().mockReturnValue(null),
}));
vi.mock('@/utils/playerProgressStorage', () => ({
  incrementTrainingGames: vi.fn(),
}));

const getDefaultPreset = vi.fn();
const getMinWordLength = vi.fn().mockReturnValue(3);
vi.mock('../presetConfig', () => ({
  getMinWordLength: (lang: string, diff: string) => getMinWordLength(lang, diff),
  getDefaultPreset: (mode: string) => getDefaultPreset(mode),
  getPresetById: vi.fn().mockReturnValue(null),
}));

import SinglePlayerView from '../SinglePlayerView';

describe('SinglePlayerView - autoStart=challenge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new Map();
    sessionStorage.clear();
  });

  it('starts the game immediately for the challenger (pendingAsyncChallenge)', async () => {
    // GIVEN the dialog stashed the challenger config and routed here
    mockSearchParams.set('autoStart', 'challenge');
    sessionStorage.setItem(
      'pendingAsyncChallenge',
      JSON.stringify({
        friendUserId: 'friend-1',
        gameMode: 'classic',
        language: 'en',
        durationSeconds: 90,
        createdAt: Date.now(),
      }),
    );

    // WHEN the page renders
    await act(async () => {
      render(<SinglePlayerView />);
    });

    // THEN it drops straight into a board (no landing-page dead end)
    await waitFor(() => {
      expect(screen.getByTestId('game')).toBeInTheDocument();
    });
    // AND it does NOT spin up a bot game
    expect(getDefaultPreset).not.toHaveBeenCalledWith('solo-bots');
  });

  it('starts the game for the accepting friend (pendingFriendChallenge)', async () => {
    // GIVEN the friend accepted and the landing page stashed their config
    mockSearchParams.set('autoStart', 'challenge');
    sessionStorage.setItem(
      'pendingFriendChallenge',
      JSON.stringify({
        id: 'ch-1',
        gameMode: 'classic',
        language: 'en',
        durationSeconds: 60,
        targetScore: 120,
      }),
    );

    // WHEN the page renders
    await act(async () => {
      render(<SinglePlayerView />);
    });

    // THEN it launches a board so they can beat the target
    await waitFor(() => {
      expect(screen.getByTestId('game')).toBeInTheDocument();
    });
  });

  it('still starts a board when no stashed config is present (defaults)', async () => {
    // GIVEN autoStart=challenge with no sessionStorage (e.g. reload)
    mockSearchParams.set('autoStart', 'challenge');

    // WHEN the page renders
    await act(async () => {
      render(<SinglePlayerView />);
    });

    // THEN it falls back to a default timed board rather than erroring
    await waitFor(() => {
      expect(screen.getByTestId('game')).toBeInTheDocument();
    });
  });
});
