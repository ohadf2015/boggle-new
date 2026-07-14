/**
 * Tests for DailyChallenge audio unlock behavior
 *
 * BUG FIX: Music wasn't playing automatically when user clicks "PLAY" button
 * because handleStartGame was async and the audio unlock didn't happen within
 * the user gesture (click event).
 *
 * FIX: Call unlockAudio() synchronously at the start of handleStartGame,
 * before any async operations, to ensure the browser's autoplay policy is
 * satisfied within the user interaction.
 *
 * @see https://sentry.io issues: JAVASCRIPT-NEXTJS-9Q, JAVASCRIPT-NEXTJS-9T
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock hooks before importing the component
const mockUnlockAudio = vi.fn();
const mockFadeToTrack = vi.fn();

// Mock framer-motion to avoid matchMedia issues
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

// Mock MusicContext
vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    unlockAudio: mockUnlockAudio,
    fadeToTrack: mockFadeToTrack,
    audioUnlocked: false,
    isMuted: false,
    volume: 1,
    toggleMute: vi.fn(),
    setVolume: vi.fn(),
    playTrack: vi.fn(),
    stopMusic: vi.fn(),
    TRACKS: {
      LOBBY: 'lobby',
      IN_GAME: 'inGame',
      BOSSA_ARCADE: 'bossaArcade',
      BOSSA: 'bossa',
    },
  }),
  MusicProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock SoundEffectsContext
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

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    profile: null,
    loading: false,
  }),
}));

// Mock NavigationContext
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));

// Mock AutoHideHeader
vi.mock('@/components/AutoHideHeader', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock MusicControls
vi.mock('@/components/MusicControls', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock PullToRefreshIndicator
vi.mock('@/components/ui/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

// Mock PageLoader
vi.mock('@/components/ui/PageLoader', () => ({
  PageLoader: () => <div data-testid="loading">Loading...</div>,
}));

// Mock hooks
vi.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    toString: () => '',
  }),
}));

// Mock utils
vi.mock('@/utils/dailyChallenge', () => ({
  hasEverPlayedWordHunt: vi.fn(() => false),
  generateDailyPuzzle: vi.fn(() => ({
    grid: [
      ['A', 'B', 'C', 'D', 'E'],
      ['F', 'G', 'H', 'I', 'J'],
      ['K', 'L', 'M', 'N', 'O'],
      ['P', 'Q', 'R', 'S', 'T'],
      ['U', 'V', 'W', 'X', 'Y'],
    ],
    targetWord: 'TEST',
    seedWords: ['TEST'],
    validWords: ['TEST', 'BEST', 'REST'],
    allValidWords: ['TEST', 'BEST', 'REST'],
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
}));

// Rewarded-ad hook is wired for the mid-game forfeit gate; stub it so the test
// doesn't reach the real ad SDKs.
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    showAd: vi.fn(),
    isAdAvailable: true,
    isPlaceholderCooldown: false,
    status: 'idle',
  }),
}));

vi.mock('@/utils/playerProgressStorage', () => ({
  hasPlayedAnyGame: vi.fn(() => true),
}));

// Mock components
vi.mock('../DailyWordHuntSurvival', () => ({
  __esModule: true,
  default: ({ onComplete }: { onComplete: (result: unknown) => void }) => (
    <div data-testid="survival-game">
      <button onClick={() => onComplete({ solved: true, attemptsUsed: 5, targetWord: 'TEST' })}>
        Complete Game
      </button>
    </div>
  ),
}));

vi.mock('../DailyWordHuntResults', () => ({
  __esModule: true,
  default: () => <div data-testid="results-screen">Results</div>,
}));

vi.mock('../DailyReadyScreen', () => ({
  __esModule: true,
  default: ({ onStart }: { onStart: () => void }) => (
    <div data-testid="ready-screen">
      <button onClick={onStart} data-testid="play-button">
        Play
      </button>
    </div>
  ),
}));

vi.mock('../DailyChallengeTutorial', () => ({
  DailyChallengeTutorial: () => <div data-testid="tutorial">Tutorial</div>,
}));

vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { progress: 0, isRefreshing: false },
  }),
}));

// Mock fetch for server-side checks
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ hasPlayed: false }),
  })
) as jest.Mock;

import DailyChallenge from '../DailyChallenge';

describe('DailyChallenge - Audio Unlock on Game Start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mock
    Storage.prototype.getItem = vi.fn(() => null);
    Storage.prototype.setItem = vi.fn();
  });

  it('should call unlockAudio synchronously when Play button is clicked', async () => {
    render(<DailyChallenge />);

    // Wait for loading to complete and ready screen to show
    await waitFor(() => {
      expect(screen.getByTestId('ready-screen')).toBeInTheDocument();
    });

    // Click the Play button
    const playButton = screen.getByTestId('play-button');
    fireEvent.click(playButton);

    // unlockAudio should be called IMMEDIATELY (synchronously)
    // This is critical for browser autoplay policy compliance
    expect(mockUnlockAudio).toHaveBeenCalledTimes(1);
  });

  it('should call unlockAudio on every Play button click (idempotent)', async () => {
    render(<DailyChallenge />);

    await waitFor(() => {
      expect(screen.getByTestId('ready-screen')).toBeInTheDocument();
    });

    const playButton = screen.getByTestId('play-button');

    // First click
    fireEvent.click(playButton);
    expect(mockUnlockAudio).toHaveBeenCalledTimes(1);

    // Re-render with ready screen again for second click
    // (in real app, the user might navigate back and click again)
    vi.clearAllMocks();
    fireEvent.click(playButton);
    expect(mockUnlockAudio).toHaveBeenCalledTimes(1);
  });
});
