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
const mockUnlockAudio = jest.fn();
const mockFadeToTrack = jest.fn();

// Mock framer-motion to avoid matchMedia issues
jest.mock('framer-motion', () => ({
  motion: {
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
jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    unlockAudio: mockUnlockAudio,
    fadeToTrack: mockFadeToTrack,
    audioUnlocked: false,
    isMuted: false,
    volume: 1,
    toggleMute: jest.fn(),
    setVolume: jest.fn(),
    playTrack: jest.fn(),
    stopMusic: jest.fn(),
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
jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: jest.fn(),
    playComboSound: jest.fn(),
    playErrorSound: jest.fn(),
    setGameActive: jest.fn(),
    playSound: jest.fn(),
    isMuted: false,
    toggleMute: jest.fn(),
  }),
}));

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: jest.fn(),
  }),
}));

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    profile: null,
    loading: false,
  }),
}));

// Mock NavigationContext
jest.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => jest.fn(),
}));

// Mock AutoHideHeader
jest.mock('@/components/AutoHideHeader', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock MusicControls
jest.mock('@/components/MusicControls', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock PullToRefreshIndicator
jest.mock('@/components/ui/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

// Mock PageLoader
jest.mock('@/components/ui/PageLoader', () => ({
  PageLoader: () => <div data-testid="loading">Loading...</div>,
}));

// Mock hooks
jest.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    toString: () => '',
  }),
}));

// Mock utils
jest.mock('@/utils/dailyChallenge', () => ({
  generateDailyPuzzle: jest.fn(() => ({
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
  getDailyChallengeDate: jest.fn(() => '2024-01-01'),
  getPuzzleNumber: jest.fn(() => 1),
  getSecondsUntilNextDaily: jest.fn(() => 3600),
  formatCountdown: jest.fn(() => '1:00:00'),
  hasPlayedWordHuntToday: jest.fn(() => false),
  getTodaysWordHuntResult: jest.fn(() => null),
  saveWordHuntResult: jest.fn(),
  getDailyStreak: jest.fn(() => 0),
  parseChallengeParam: jest.fn(() => null),
  clearWordHuntResultForRetry: jest.fn(),
  getGuestFingerprint: jest.fn(() => Promise.resolve('test-fingerprint')),
  mapServerResultToStoredResult: jest.fn(),
  GAME_LANGUAGE_KEY: 'daily_game_language',
  getWordHuntTutorialKey: jest.fn(() => 'word_hunt_tutorial_en'),
  getWordHuntResultKey: jest.fn(() => 'word_hunt_result_en'),
}));

jest.mock('@/utils/playerProgressStorage', () => ({
  hasPlayedAnyGame: jest.fn(() => true),
}));

jest.mock('@/utils/trainingProgressStorage', () => ({
  shouldShowTrainingGateway: jest.fn(() => false),
  markGatewaySkipped: jest.fn(),
  markGatewaySeen: jest.fn(),
}));

// Mock components
jest.mock('../DailyWordHuntSurvival', () => ({
  __esModule: true,
  default: ({ onComplete }: { onComplete: (result: unknown) => void }) => (
    <div data-testid="survival-game">
      <button onClick={() => onComplete({ solved: true, attemptsUsed: 5, targetWord: 'TEST' })}>
        Complete Game
      </button>
    </div>
  ),
}));

jest.mock('../DailyWordHuntResults', () => ({
  __esModule: true,
  default: () => <div data-testid="results-screen">Results</div>,
}));

jest.mock('../DailyReadyScreen', () => ({
  __esModule: true,
  default: ({ onStart }: { onStart: () => void }) => (
    <div data-testid="ready-screen">
      <button onClick={onStart} data-testid="play-button">
        Play
      </button>
    </div>
  ),
}));

jest.mock('../DailyChallengeTutorial', () => ({
  DailyChallengeTutorial: () => <div data-testid="tutorial">Tutorial</div>,
}));

jest.mock('@/components/training', () => ({
  TrainingGatewayModal: () => null,
}));

jest.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { progress: 0, isRefreshing: false },
  }),
}));

// Mock fetch for server-side checks
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ hasPlayed: false }),
  })
) as jest.Mock;

import DailyChallenge from '../DailyChallenge';

describe('DailyChallenge - Audio Unlock on Game Start', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset localStorage mock
    Storage.prototype.getItem = jest.fn(() => null);
    Storage.prototype.setItem = jest.fn();
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
    jest.clearAllMocks();
    fireEvent.click(playButton);
    expect(mockUnlockAudio).toHaveBeenCalledTimes(1);
  });
});
