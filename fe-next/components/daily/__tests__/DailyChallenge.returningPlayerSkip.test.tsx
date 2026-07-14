/**
 * Returning players ("already play this kind of challenge") shouldn't see the
 * intro/ready page at all — they should land straight in gameplay. First-time
 * players (and anyone with an incoming friend-challenge deep link) still see
 * the ready screen.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

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
  useMusic: () => ({
    unlockAudio: vi.fn(),
    fadeToTrack: vi.fn(),
    audioUnlocked: false,
    isMuted: false,
    volume: 1,
    toggleMute: vi.fn(),
    setVolume: vi.fn(),
    playTrack: vi.fn(),
    stopMusic: vi.fn(),
    preloadMusicTrack: vi.fn(),
    TRACKS: { LOBBY: 'lobby', IN_GAME: 'inGame', BOSSA_ARCADE: 'bossaArcade', BOSSA: 'bossa' },
  }),
  MusicProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(),
    playComboSound: vi.fn(),
    playErrorSound: vi.fn(),
    setGameActive: vi.fn(),
    playSound: vi.fn(),
    isMuted: false,
    toggleMute: vi.fn(),
  }),
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
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ isLowEnd: false, enableComplexAnimations: true, prefersReducedMotion: false }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn(), toString: () => '' }),
}));

const mockHasEverPlayedWordHunt = vi.fn(() => false);

vi.mock('@/utils/dailyChallenge', () => ({
  generateDailyPuzzle: vi.fn(() => ({
    grid: [['A', 'B'], ['C', 'D']],
    targetWord: 'TEST',
    seedWords: ['TEST'],
    validWords: ['TEST'],
    allValidWords: ['TEST'],
  })),
  getDailyChallengeDate: vi.fn(() => '2024-01-01'),
  getPuzzleNumber: vi.fn(() => 1),
  getSecondsUntilNextDaily: vi.fn(() => 3600),
  formatCountdown: vi.fn(() => '1:00:00'),
  hasPlayedWordHuntToday: vi.fn(() => false),
  getTodaysWordHuntResult: vi.fn(() => null),
  saveWordHuntResult: vi.fn(),
  getDailyStreak: vi.fn(() => 0),
  parseChallengeParam: vi.fn(() => null),
  clearWordHuntResultForRetry: vi.fn(),
  markWordHuntForfeitToday: vi.fn(),
  hasWordHuntForfeitToday: vi.fn(() => false),
  clearWordHuntForfeitToday: vi.fn(),
  getGuestFingerprint: vi.fn(() => Promise.resolve('test-fingerprint')),
  mapServerResultToStoredResult: vi.fn(),
  GAME_LANGUAGE_KEY: 'daily_game_language',
  getWordHuntResultKey: vi.fn(() => 'word_hunt_result_en'),
  hasEverPlayedWordHunt: (...args: unknown[]) => mockHasEverPlayedWordHunt(...args),
}));

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({ showAd: vi.fn(), isAdAvailable: true, isPlaceholderCooldown: false, status: 'idle' }),
}));
vi.mock('@/utils/playerProgressStorage', () => ({ hasPlayedAnyGame: vi.fn(() => true) }));

vi.mock('../DailyWordHuntSurvival', () => ({
  __esModule: true,
  default: () => <div data-testid="survival-game" />,
}));
vi.mock('../DailyWordHuntResults', () => ({ __esModule: true, default: () => <div data-testid="results-screen" /> }));
vi.mock('../DailyReadyScreen', () => ({
  __esModule: true,
  default: ({ onStart }: { onStart: () => void }) => (
    <div data-testid="ready-screen">
      <button onClick={onStart} data-testid="play-button">Play</button>
    </div>
  ),
}));
vi.mock('../DailyChallengeTutorial', () => ({ DailyChallengeTutorial: () => <div data-testid="tutorial">Tutorial</div> }));
vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({ pullToRefreshHandlers: {}, pullState: { progress: 0, isRefreshing: false } }),
}));

global.fetch = vi.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ hasPlayed: false }) })
) as unknown as typeof fetch;

import DailyChallenge from '../DailyChallenge';

describe('DailyChallenge — returning player skips the ready screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Storage.prototype.getItem = vi.fn(() => null);
    Storage.prototype.setItem = vi.fn();
    mockHasEverPlayedWordHunt.mockReturnValue(false);
  });

  it('GIVEN a first-time player THEN the ready screen is shown', async () => {
    mockHasEverPlayedWordHunt.mockReturnValue(false);
    render(<DailyChallenge />);

    await waitFor(() => {
      expect(screen.getByTestId('ready-screen')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('survival-game')).not.toBeInTheDocument();
  });

  it('GIVEN a player who has played Word Hunt before THEN gameplay starts immediately, no ready screen', async () => {
    mockHasEverPlayedWordHunt.mockReturnValue(true);
    render(<DailyChallenge />);

    await waitFor(() => {
      expect(screen.getByTestId('survival-game')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('ready-screen')).not.toBeInTheDocument();
  });
});
