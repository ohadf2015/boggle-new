/**
 * "I finished the daily and I'm not on the board."
 *
 * Word Hunt already handles this: it awaits its submit and then bumps a
 * `leaderboardKey`, remounting the board so it refetches once the row exists.
 * Word Wheel diverged — `handleComplete` kicked the submit off as a
 * fire-and-forget IIFE and called `setPhase('completed')` in the same tick, so
 * the results screen's leaderboard fetched while the POST was still in flight
 * and came back without the player. Only the 30s poll could rescue it.
 *
 * Two properties are asserted, because fixing one by breaking the other is the
 * obvious wrong turn: the results screen must still appear immediately (never
 * parked behind a network call), AND the board must refetch once submit lands.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import WordWheelChallenge from '../WordWheelChallenge';

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const Stub = () => null;
    Stub.displayName = 'DynamicStub';
    return Stub;
  },
}));

vi.mock('framer-motion', () => ({
  m: new Proxy(
    {},
    {
      get: () => ({ children, ...props }: React.ComponentProps<'div'>) => (
        <div {...props}>{children}</div>
      ),
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ setGameActive: vi.fn() }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'player-123', display_name: 'P', avatar_emoji: '🎯', avatar_color: '#fff' },
    isAuthenticated: true,
  }),
}));
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));

const saveWordWheelResultMock = vi.fn();
vi.mock('@/utils/dailyChallenge', () => ({
  hasEverPlayedWordWheel: () => false,
  getDailyChallengeDate: () => '2026-04-25',
  getPuzzleNumber: () => 117,
  hasPlayedWordWheelToday: () => false,
  getTodaysWordWheelResult: () => null,
  saveWordWheelResult: (...args: unknown[]) => saveWordWheelResultMock(...args),
  hasPlayedWordHuntToday: () => false,
  getDailyStreak: () => ({ currentStreak: 0, totalDailiesCompleted: 1 }),
  updateDailyStreak: vi.fn(() => ({ currentStreak: 1, longestStreak: 1, lastPlayedDate: null, totalDailiesCompleted: 1 })),
}));
vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  generateWordWheelPuzzle: () => ({
    centerLetter: 'A',
    outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
    validWords: [],
  }),
}));
vi.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: () => null,
}));
vi.mock('@/hooks/fastValidateWord', () => ({ fastValidateWord: () => true }));
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({ canShowAd: false, isDailyLimitReached: false, showAd: vi.fn(), isLoading: false }),
}));

type GameProps = { onComplete: (r: { wordsFound: string[]; score: number; timeSeconds: number }) => void };
let capturedOnComplete: GameProps['onComplete'] | null = null;
vi.mock('../WordWheelGame', () => ({
  __esModule: true,
  default: (props: GameProps) => {
    capturedOnComplete = props.onComplete;
    return <div data-testid="word-wheel-game" />;
  },
}));

/** Records the leaderboard-refresh signal the results screen is handed. */
const seenLeaderboardKeys: Array<number | undefined> = [];
vi.mock('../WordWheelResults', () => ({
  __esModule: true,
  default: ({ leaderboardKey }: { leaderboardKey?: number }) => {
    seenLeaderboardKeys.push(leaderboardKey);
    return <div data-testid="word-wheel-results" />;
  },
}));
vi.mock('../TabbedDailyLeaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="tabbed-daily-leaderboard" />,
}));

let releaseSubmit: (() => void) | null = null;

beforeEach(() => {
  saveWordWheelResultMock.mockReset();
  capturedOnComplete = null;
  seenLeaderboardKeys.length = 0;
  releaseSubmit = null;

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/check-played/')) {
        return new Response(JSON.stringify({ hasPlayed: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/word-wheel/submit') && init?.method === 'POST') {
        // Hold the submit open so the results screen renders while it is in flight.
        await new Promise<void>(resolve => { releaseSubmit = resolve; });
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('{}', { status: 200 });
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WordWheelChallenge — board refresh after submit', () => {
  it('shows results immediately, then refreshes the leaderboard once the submit lands', async () => {
    render(<WordWheelChallenge />);

    fireEvent.click(await screen.findByText('daily.play'));
    await waitFor(() => expect(capturedOnComplete).not.toBeNull());

    await act(async () => {
      capturedOnComplete!({ wordsFound: ['ALPHA'], score: 10, timeSeconds: 20 });
    });

    // 1. Results are on screen while the POST is still open — no blocking.
    expect(await screen.findByTestId('word-wheel-results')).toBeInTheDocument();
    await waitFor(() => expect(releaseSubmit).not.toBeNull());
    const keyWhileInFlight = seenLeaderboardKeys[seenLeaderboardKeys.length - 1];

    // 2. Once the row exists server-side, the board is told to refetch.
    await act(async () => {
      releaseSubmit!();
      await Promise.resolve();
    });

    await waitFor(() => {
      const latest = seenLeaderboardKeys[seenLeaderboardKeys.length - 1];
      expect(latest).toBeGreaterThan(keyWhileInFlight ?? -1);
    });
  });
});
