/**
 * DailyChallengeTutorial must no longer auto-show when the ready phase loads —
 * that auto-fire duplicated ModeCoach's wordHunt overlay. It's now opened only
 * on demand via DailyReadyScreen's "How to Play" button.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial: _i, animate: _a, exit: _e, whileHover: _wh, whileTap: _wt, transition: _t, variants: _v, ...domProps } = props as Record<string, unknown>;
      return <div {...domProps}>{children}</div>;
    },
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial: _i, animate: _a, exit: _e, transition: _t, variants: _v, ...domProps } = props as Record<string, unknown>;
      return <p {...domProps}>{children}</p>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({ unlockAudio: vi.fn(), fadeToTrack: vi.fn(), audioUnlocked: false, isMuted: false, volume: 1, toggleMute: vi.fn(), setVolume: vi.fn(), playTrack: vi.fn(), stopMusic: vi.fn(), TRACKS: {} }),
  MusicProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playWordAcceptedSound: vi.fn(), playComboSound: vi.fn(), playErrorSound: vi.fn(), setGameActive: vi.fn(), playSound: vi.fn(), isMuted: false, toggleMute: vi.fn() }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', setLanguage: vi.fn() }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, profile: null, loading: false }),
}));
vi.mock('@/contexts/NavigationContext', () => ({ useHideNavigation: () => vi.fn() }));
vi.mock('@/components/AutoHideHeader', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/MusicControls', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/ui/PullToRefreshIndicator', () => ({ PullToRefreshIndicator: () => null }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div data-testid="loading">Loading...</div> }));
vi.mock('@/hooks/useMobileLandscape', () => ({ useMobileLandscape: () => false }));
vi.mock('@/hooks/useDevicePerformance', () => ({ useDevicePerformance: () => ({ isLowEnd: false, enableComplexAnimations: true, prefersReducedMotion: false }) }));
vi.mock('@/hooks/usePullToRefresh', () => ({ usePullToRefresh: () => ({ pullToRefreshHandlers: {}, pullState: { progress: 0, isRefreshing: false } }) }));
vi.mock('@/utils/playerProgressStorage', () => ({ hasPlayedAnyGame: vi.fn(() => true) }));
vi.mock('@/hooks/useWinStreak', () => ({ useWinStreak: () => ({ recordWin: vi.fn() }) }));
vi.mock('@/contexts/AdMobContext', () => ({
  useAdMobContext: () => ({
    recordGameEnd: vi.fn(),
    shouldShowInterstitial: () => false,
    recordInterstitialShown: vi.fn(),
    hasNoAds: () => true,
    getConfig: () => null,
    whenReady: () => Promise.resolve(),
    prepareInterstitial: () => Promise.resolve(),
    isInterstitialReady: () => false,
    consumeInterstitial: vi.fn(),
  }),
}));
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
  trackDailyPuzzle: vi.fn(),
  trackFeatureFirstUse: vi.fn(),
}));
vi.mock('../analytics/wordHuntCompletePayload', () => ({
  buildDailyWordHuntCompletePayload: () => ({}),
}));
vi.mock('@/utils/platform', async (importActual) => ({
  ...(await importActual<typeof import('@/utils/platform')>()),
  isNative: () => false,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: () => null, toString: () => '' }),
}));

vi.mock('@/utils/dailyChallenge', () => ({
  generateDailyPuzzle: vi.fn(() => ({
    grid: [['A', 'B', 'C', 'D', 'E'], ['F', 'G', 'H', 'I', 'J'], ['K', 'L', 'M', 'N', 'O'], ['P', 'Q', 'R', 'S', 'T'], ['U', 'V', 'W', 'X', 'Y']],
    targetWord: 'TEST', seedWords: ['TEST'], validWords: ['TEST'], allValidWords: ['TEST'],
  })),
  getDailyChallengeDate: vi.fn(() => '2024-01-10'),
  getPuzzleNumber: vi.fn(() => 42),
  getSecondsUntilNextDaily: vi.fn(() => 3600),
  formatCountdown: vi.fn(() => '1:00:00'),
  hasPlayedWordHuntToday: vi.fn(() => false),
  getTodaysWordHuntResult: vi.fn(() => null),
  saveWordHuntResult: vi.fn(() => ({ currentStreak: 3 })),
  getDailyStreak: vi.fn(() => 0),
  parseChallengeParam: vi.fn(() => null),
  clearWordHuntResultForRetry: vi.fn(),
  markWordHuntForfeitToday: vi.fn(),
  hasWordHuntForfeitToday: vi.fn(() => false),
  clearWordHuntForfeitToday: vi.fn(),
  getGuestFingerprint: vi.fn(() => Promise.resolve('fp')),
  mapServerResultToStoredResult: vi.fn(),
  GAME_LANGUAGE_KEY: 'daily_game_language',
  getWordHuntTutorialKey: vi.fn(() => 'word_hunt_tutorial_en'),
  getWordHuntResultKey: vi.fn(() => 'word_hunt_result_en'),
}));

vi.mock('../DailyWordHuntSurvival', () => ({
  __esModule: true,
  default: () => <div data-testid="survival-game" />,
}));
vi.mock('../DailyWordHuntResults', () => ({ __esModule: true, default: () => <div data-testid="results-screen" /> }));
vi.mock('../DailyReadyScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="ready-screen" />,
}));
vi.mock('../DailyChallengeTutorial', () => ({
  DailyChallengeTutorial: () => <div data-testid="tutorial" />,
}));

global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ hasPlayed: false }) })) as unknown as typeof fetch;

import DailyChallenge from '../DailyChallenge';

describe('DailyChallenge — tutorial no longer auto-shows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Storage.prototype.getItem = vi.fn(() => null);
    Storage.prototype.setItem = vi.fn();
  });

  it('does NOT auto-show the tutorial once the ready phase loads', async () => {
    render(<DailyChallenge />);

    await waitFor(() => expect(screen.getByTestId('ready-screen')).toBeInTheDocument());
    // Give any pending auto-show effect a chance to fire its follow-up render
    // before asserting it never does.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(screen.queryByTestId('tutorial')).toBeNull();
  });
});
