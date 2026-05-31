/**
 * Test: Daily Challenge resilience to an empty puzzle payload
 *
 * Reproduces the "empty screen for some players" bug. The puzzle endpoint can
 * respond HTTP 200 with an empty body ({ grid: null, targetWord: '' }) — e.g. a
 * stale/corrupt cache or an empty word bank for a given day+language. The old
 * code trusted `response.ok`, set an empty grid, advanced to `phase==='playing'`,
 * and then the render guard `phase==='playing' && grid && targetWord` matched
 * NOTHING → a fully blank navy screen.
 *
 * Expected: the component must never blank. An empty 200 is treated as a
 * generation failure and falls through to local generation, so a real grid
 * is always available before play begins.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock framer-motion so AnimatePresence renders children synchronously (no
// mode="wait" exit-animation gating) and m.div is a plain div.
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial: _i, animate: _a, exit: _e, transition: _t, variants: _v, ...rest } = props as Record<string, unknown>;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

import DailyChallenge from '../DailyChallenge';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, profile: null }),
}));

vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({ unlockAudio: vi.fn() }),
}));

// AutoHideHeader pulls in NavigationProvider; irrelevant to this test.
vi.mock('@/components/AutoHideHeader', () => ({
  default: () => null,
}));

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    showAd: vi.fn(),
    isAdAvailable: false,
    isPlaceholderCooldown: false,
  }),
}));

// DailyReadyScreen preloads music via useGameMusic (needs MusicProvider); the
// game uses it too. Stub to a no-op so the tree renders without providers.
vi.mock('@/hooks/useGameMusic', () => ({
  useGameMusic: () => {},
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

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/utils/dailyChallenge', async () => {
  const actual = await vi.importActual('@/utils/dailyChallenge');
  return {
    ...actual,
    getGuestFingerprint: vi.fn().mockResolvedValue('test-fingerprint'),
    hasPlayedWordHuntToday: vi.fn().mockReturnValue(false),
    getTodaysWordHuntResult: vi.fn().mockReturnValue(null),
  };
});

// Ready screen stub — exposes only the Start button so we don't drag in its
// music/sound provider tree. The bug under test lives in DailyChallenge's
// puzzle-load + phase logic, not the ready screen.
vi.mock('@/components/daily/DailyReadyScreen', () => ({
  default: ({ onStart }: { onStart: () => void }) => (
    <button onClick={onStart}>daily.start</button>
  ),
}));

// Survival game stub — its presence proves a real grid+targetWord reached the
// game, i.e. the screen is NOT blank.
vi.mock('@/components/daily/DailyWordHuntSurvival', () => ({
  default: ({ grid, targetWord }: { grid: unknown[]; targetWord: string }) => (
    <div data-testid="survival-game" data-target={targetWord} data-rows={grid?.length ?? 0}>
      Game
    </div>
  ),
}));

vi.mock('@/components/daily/DailyWordHuntResults', () => ({
  default: () => <div data-testid="results-screen">Results</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Puzzle endpoint returns 200 but an EMPTY payload — the production trigger.
  global.fetch = vi.fn((url) => {
    if (typeof url === 'string' && url.includes('/check-played/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ hasPlayed: false }),
      } as Response);
    }
    if (typeof url === 'string' && url.includes('/puzzle/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ grid: null, targetWord: '' }),
      } as Response);
    }
    return Promise.resolve({ ok: false } as Response);
  }) as unknown as typeof fetch;
});

describe('Daily Challenge - empty puzzle payload resilience', () => {
  it('falls through to a real generated grid and never blanks after Start', async () => {
    const user = userEvent.setup();
    render(<DailyChallenge />);

    // Ready screen appears (loading resolved)
    await waitFor(() => {
      expect(screen.getByText('daily.start')).toBeInTheDocument();
    });

    await user.click(screen.getByText('daily.start'));

    // The game must render with a real, non-empty grid + targetWord.
    await waitFor(() => {
      expect(screen.getByTestId('survival-game')).toBeInTheDocument();
    });
    const game = screen.getByTestId('survival-game');
    expect(Number(game.getAttribute('data-rows'))).toBeGreaterThan(0);
    expect(game.getAttribute('data-target')).toBeTruthy();
  });
});
