/**
 * Returning players ("already play this kind of challenge") shouldn't see the
 * intro/ready page at all — they should land straight in gameplay. First-time
 * players (and anyone with an incoming friend-challenge deep link) still see
 * the ready screen.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

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
const headerMounts = vi.fn();
vi.mock('@/components/AutoHideHeader', () => ({
  __esModule: true,
  default: () => { headerMounts(); return <div data-testid="site-header" />; },
}));
vi.mock('@/components/MusicControls', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/ui/PullToRefreshIndicator', () => ({ PullToRefreshIndicator: () => null }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div data-testid="loading">Loading...</div> }));
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ isLowEnd: false, enableComplexAnimations: true, prefersReducedMotion: false }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: (k: string) => (k === 'challenge' ? mockChallengeParam() : null), toString: () => '' }),
}));

const mockHasEverPlayedWordHunt = vi.fn(() => false);
const mockChallengeParam = vi.fn((): string | null => null);
const mockParseChallenge = vi.fn((..._a: unknown[]): unknown => null);
const mockHasPlayedToday = vi.fn(() => false);
const mockTodaysResult = vi.fn((): unknown => null);

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
  hasPlayedWordHuntToday: (...args: unknown[]) => mockHasPlayedToday(...args),
  getTodaysWordHuntResult: (...args: unknown[]) => mockTodaysResult(...args),
  saveWordHuntResult: vi.fn(),
  getDailyStreak: vi.fn(() => 0),
  parseChallengeParam: (...a: unknown[]) => mockParseChallenge(...a),
  clearWordHuntResultForRetry: vi.fn(() => true),
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
vi.mock('../DailyWordHuntResults', () => ({
  __esModule: true,
  default: ({ onRetry }: { onRetry: () => void }) => (
    <div data-testid="results-screen"><button data-testid="retry" onClick={onRetry}>Retry</button></div>
  ),
}));
const readyMounts = vi.hoisted(() => vi.fn(() => null));
vi.mock('../DailyReadyScreen', () => ({
  __esModule: true,
  default: ({ onStart }: { onStart: () => void }) => readyMounts() || (
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

vi.mock('@/hooks/useInterstitialAd', () => ({ useInterstitialAd: () => ({ showInterstitial: () => Promise.resolve() }) }));
import DailyChallenge from '../DailyChallenge';


describe('DailyChallenge — returning player skips the ready screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Storage.prototype.getItem = vi.fn(() => null);
    Storage.prototype.setItem = vi.fn();
    mockHasEverPlayedWordHunt.mockReturnValue(false);
    mockHasPlayedToday.mockReturnValue(false);
    mockTodaysResult.mockReturnValue(null);
    mockChallengeParam.mockReturnValue(null);
    mockParseChallenge.mockReturnValue(null);
  });

  it('GIVEN a first-time player THEN the tutorial opens and the ready screen never renders', async () => {
    mockHasEverPlayedWordHunt.mockReturnValue(false);
    render(<DailyChallenge />);

    await waitFor(() => {
      expect(screen.getByTestId('tutorial')).toBeInTheDocument();
    });
    expect(readyMounts).not.toHaveBeenCalled();
    expect(screen.queryByTestId('survival-game')).not.toBeInTheDocument();
  });

  it('GIVEN a player who saw the tutorial but never finished a run THEN gameplay starts with no ready screen', async () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation((k: string) => (k === 'lc_coach_wordHunt' ? '1' : null));
    render(<DailyChallenge />);

    await waitFor(() => {
      expect(screen.getByTestId('survival-game')).toBeInTheDocument();
    });
    expect(readyMounts).not.toHaveBeenCalled();
  });

  it('GIVEN a finished run WHEN the player retries THEN a fresh run starts instead of a stuck loader', async () => {
    mockHasEverPlayedWordHunt.mockReturnValue(true);
    mockHasPlayedToday.mockReturnValue(true);
    mockTodaysResult.mockReturnValue({ date: '2024-01-01', puzzleNumber: 1, result: { solved: true, attemptsUsed: 2 } });
    render(<DailyChallenge />);

    await waitFor(() => expect(screen.getByTestId('results-screen')).toBeInTheDocument());
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, hasPlayed: false }) })) as unknown as typeof fetch;
    mockHasPlayedToday.mockReturnValue(false);
    mockTodaysResult.mockReturnValue(null);
    fireEvent.click(screen.getByTestId('retry'));
    await waitFor(() => expect(screen.getByTestId('survival-game')).toBeInTheDocument());
  });

  it('GIVEN a friend challenge for today THEN the ready screen shows who to beat and waits for Play', async () => {
    mockHasEverPlayedWordHunt.mockReturnValue(true);
    mockChallengeParam.mockReturnValue('abc');
    mockParseChallenge.mockReturnValue({ puzzleNumber: 1, attemptsUsed: 3, solved: true, efficiencyScore: 80, wordsDiscovered: 6 });
    render(<DailyChallenge />);

    await waitFor(() => {
      expect(screen.getByTestId('ready-screen')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('survival-game')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('play-button'));
    await waitFor(() => {
      expect(screen.getByTestId('survival-game')).toBeInTheDocument();
    });
  });

  it('GIVEN a player who has played Word Hunt before THEN gameplay starts immediately, no ready screen', async () => {
    mockHasEverPlayedWordHunt.mockReturnValue(true);
    render(<DailyChallenge />);

    await waitFor(() => {
      expect(screen.getByTestId('survival-game')).toBeInTheDocument();
    });
    expect(readyMounts).not.toHaveBeenCalled();
  });

  it('GIVEN a player who already finished today THEN results show and the site header never mounts', async () => {
    mockHasEverPlayedWordHunt.mockReturnValue(true);
    mockHasPlayedToday.mockReturnValue(true);
    mockTodaysResult.mockReturnValue({ date: '2024-01-01', puzzleNumber: 1, result: { solved: true, attemptsUsed: 2 } });
    render(<DailyChallenge />);

    await waitFor(() => {
      expect(screen.getByTestId('results-screen')).toBeInTheDocument();
    });
    expect(headerMounts).not.toHaveBeenCalled();
  });
});
