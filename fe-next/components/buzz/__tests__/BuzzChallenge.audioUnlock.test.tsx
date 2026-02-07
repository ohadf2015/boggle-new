/**
 * Tests for BuzzChallenge audio unlock behavior
 *
 * BUG FIX: Music wasn't playing automatically when user clicks "Start" button
 * due to browser autoplay policy.
 *
 * FIX: Call unlockAudio() synchronously at the start of handleStart,
 * before setting the phase to 'playing'.
 *
 * @see https://sentry.io issues: JAVASCRIPT-NEXTJS-9T
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock hooks before importing the component
const mockUnlockAudio = jest.fn();
const mockFadeToTrack = jest.fn();

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial: _i, animate: _a, exit: _e, whileHover: _wh, whileTap: _wt, transition: _t, variants: _v, ...domProps } = props as Record<string, unknown>;
      return <div {...domProps}>{children}</div>;
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

// Mock guestManager
jest.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: () => 'test-fingerprint',
}));

// Mock child components
jest.mock('../BuzzReadyScreen', () => ({
  __esModule: true,
  default: ({ onStart }: { onStart: () => void }) => (
    <div data-testid="ready-screen">
      <button onClick={onStart} data-testid="start-button">
        Start
      </button>
    </div>
  ),
}));

jest.mock('../BuzzGameScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="game-screen">Game</div>,
}));

jest.mock('../BuzzResultsScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="results-screen">Results</div>,
}));

jest.mock('@/components/ui/PageLoader', () => ({
  PageLoader: () => <div data-testid="loading">Loading...</div>,
}));

// Mock fetch for challenge data
const mockChallengeData = {
  id: 1,
  puzzleDate: '2024-01-01',
  language: 'en',
  trendingSummary: 'Test Summary',
  trendingTopics: [{ query: 'test', volume: 100 }],
  challenges: [
    {
      type: 'scrambled',
      trendTopic: 'test',
      prompt: 'Test prompt',
      answer: 'TEST',
      difficulty: 'easy',
    },
  ],
};

global.fetch = jest.fn((url) => {
  if (url.toString().includes('/api/buzz/')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockChallengeData }),
    });
  }
  if (url.toString().includes('/check-played')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ hasPlayed: false }),
    });
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  });
}) as jest.Mock;

import BuzzChallenge from '../BuzzChallenge';

describe('BuzzChallenge - Audio Unlock on Game Start', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call unlockAudio when Start button is clicked', async () => {
    render(<BuzzChallenge language="en" onBack={jest.fn()} />);

    // Wait for loading to complete and ready screen to show
    await waitFor(() => {
      expect(screen.getByTestId('ready-screen')).toBeInTheDocument();
    });

    // Click the Start button
    const startButton = screen.getByTestId('start-button');
    fireEvent.click(startButton);

    // unlockAudio should be called immediately
    expect(mockUnlockAudio).toHaveBeenCalledTimes(1);
  });

  it('should transition to game screen after clicking Start', async () => {
    render(<BuzzChallenge language="en" onBack={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('ready-screen')).toBeInTheDocument();
    });

    const startButton = screen.getByTestId('start-button');
    fireEvent.click(startButton);

    // Should transition to game screen
    await waitFor(() => {
      expect(screen.getByTestId('game-screen')).toBeInTheDocument();
    });
  });
});
