/**
 * Bug: catch-up / forfeit-retry rewarded ad gates strand the player.
 *
 * On native, playing a missed daily (catch-up) or replaying after a mid-game
 * forfeit (retry) is gated behind a rewarded ad. The game start was wired ONLY
 * to the ad's onRewardEarned callback — every NON-reward terminal outcome
 * (user skip, prepare hang, show hang, safety timeout) fires onAdError, which
 * was wired to nothing. Result: the native ad Activity covers the Play button,
 * the ad fails to grant, and the player is stuck on the ready screen forever
 * ("clicked the button, it got hidden, nothing happened").
 *
 * Prod telemetry (growth:rewarded_ad_lifecycle): ~40% of catch-up/retry
 * attempts never reach `rewarded`. So this strands a large fraction of players.
 *
 * Fix: degrade to free play on ad failure — identical to the documented web
 * contract (shouldGateCatchUpBehindAd: "web degrades to free play"). The ad is a
 * best-effort speed bump, never a hard wall that can permanently block gameplay.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mutable per-test controls for the module mocks below.
let mockDateParam: string | null = null;
let mockForfeit = false;

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

// Native app → the ad gate is active (web would already degrade to free play).
// Keep the rest of the module real (growthTracking imports getPlatform from it).
vi.mock('@/utils/platform', async (importActual) => ({
  ...(await importActual<typeof import('@/utils/platform')>()),
  isNative: () => true,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: (k: string) => (k === 'date' ? mockDateParam : null), toString: () => (mockDateParam ? `date=${mockDateParam}` : '') }),
}));

vi.mock('@/utils/dailyChallenge', () => ({
  hasEverPlayedWordHunt: vi.fn(() => false),
  generateDailyPuzzle: vi.fn(() => ({
    grid: [['A', 'B', 'C', 'D', 'E'], ['F', 'G', 'H', 'I', 'J'], ['K', 'L', 'M', 'N', 'O'], ['P', 'Q', 'R', 'S', 'T'], ['U', 'V', 'W', 'X', 'Y']],
    targetWord: 'TEST', seedWords: ['TEST'], validWords: ['TEST'], allValidWords: ['TEST'],
  })),
  getDailyChallengeDate: vi.fn(() => '2024-01-10'),
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
  hasWordHuntForfeitToday: vi.fn(() => mockForfeit),
  clearWordHuntForfeitToday: vi.fn(),
  getGuestFingerprint: vi.fn(() => Promise.resolve('fp')),
  mapServerResultToStoredResult: vi.fn(),
  GAME_LANGUAGE_KEY: 'daily_game_language',
  getWordHuntResultKey: vi.fn(() => 'word_hunt_result_en'),
}));

// The rewarded-ad hook: showAd() simulates a NON-reward terminal (stall / skip /
// timeout) by invoking the onAdError callback the component passes in. This is
// the exact path that strands the player today.
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: (opts: { onAdError?: (msg: string) => void } = {}) => ({
    showAd: () => { opts.onAdError?.('Ad timed out — please try again'); },
    isAdAvailable: true,
    isPlaceholderCooldown: false,
    status: 'idle',
  }),
}));

vi.mock('../DailyWordHuntSurvival', () => ({
  __esModule: true,
  default: () => <div data-testid="survival-game">Playing</div>,
}));
vi.mock('../DailyWordHuntResults', () => ({ __esModule: true, default: () => <div data-testid="results-screen">Results</div> }));
vi.mock('../DailyReadyScreen', () => ({
  __esModule: true,
  default: ({ onStart }: { onStart: () => void }) => (
    <div data-testid="ready-screen"><button onClick={onStart} data-testid="play-button">Play</button></div>
  ),
}));
vi.mock('../DailyChallengeTutorial', () => ({ DailyChallengeTutorial: () => null }));

global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ hasPlayed: false }) })) as unknown as typeof fetch;

import DailyChallenge from '../DailyChallenge';

describe('DailyChallenge — rewarded ad failure degrades to free play (no stranding)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDateParam = null;
    mockForfeit = false;
    Storage.prototype.getItem = vi.fn(() => null);
    Storage.prototype.setItem = vi.fn();
  });

  it('GIVEN a missed-daily (catch-up) WHEN the rewarded ad fails (no reward) THEN the game starts anyway instead of leaving the player stuck on the ready screen', async () => {
    mockDateParam = '2024-01-09'; // within the 3-day catch-up window of 2024-01-10

    render(<DailyChallenge />);

    await waitFor(() => expect(screen.getByTestId('ready-screen')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('play-button'));

    // The ad failed → degrade to free play → the game must start.
    await waitFor(() => expect(screen.getByTestId('survival-game')).toBeInTheDocument());
  });

  it('GIVEN a mid-game forfeit (retry) WHEN the rewarded ad fails (no reward) THEN the replay starts anyway', async () => {
    mockForfeit = true; // today's daily was forfeited → retry gate is active

    render(<DailyChallenge />);

    await waitFor(() => expect(screen.getByTestId('ready-screen')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('play-button'));

    await waitFor(() => expect(screen.getByTestId('survival-game')).toBeInTheDocument());
  });
});
