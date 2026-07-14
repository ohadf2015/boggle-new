/**
 * Streak advancement: completing today's Word Wheel daily must advance the daily
 * streak (`updateDailyStreak`), exactly like the Word Hunt daily already does.
 * Regression guard for the bug where a player whose daily is the Word Wheel
 * filled the home progress strip but their streak stayed pinned at 0 — because
 * `saveWordWheelResult` never touched the streak.
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
    profile: { id: 'player-77', display_name: 'P', avatar_emoji: '🎯', avatar_color: '#fff' },
    isAuthenticated: true,
  }),
}));
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));

const saveWordWheelResultMock = vi.fn();
const updateDailyStreakMock = vi.fn(() => ({
  currentStreak: 5,
  longestStreak: 5,
  lastPlayedDate: '2026-04-27',
  totalDailiesCompleted: 5,
}));
vi.mock('@/utils/dailyChallenge', () => ({
  hasEverPlayedWordWheel: () => false,
  getDailyChallengeDate: () => '2026-04-27',
  getPuzzleNumber: () => 119,
  hasPlayedWordWheelToday: () => false,
  getTodaysWordWheelResult: () => null,
  saveWordWheelResult: (...args: unknown[]) => saveWordWheelResultMock(...args),
  hasPlayedWordHuntToday: () => false,
  getDailyStreak: () => ({ currentStreak: 4 }),
  updateDailyStreak: (...args: unknown[]) => updateDailyStreakMock(...args),
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
  useRewardedAd: () => ({
    canShowAd: false,
    isDailyLimitReached: false,
    showAd: vi.fn(),
    isLoading: false,
  }),
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
vi.mock('../WordWheelResults', () => ({
  __esModule: true,
  default: () => <div data-testid="word-wheel-results" />,
}));
vi.mock('../TabbedDailyLeaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="tabbed-daily-leaderboard" />,
}));

beforeEach(() => {
  saveWordWheelResultMock.mockReset();
  updateDailyStreakMock.mockClear();
  capturedOnComplete = null;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('/check-played/')) {
        return new Response(JSON.stringify({ hasPlayed: false }), {
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

describe('WordWheelChallenge — streak advancement', () => {
  it('GIVEN an authenticated player completes today\'s Word Wheel THEN updateDailyStreak is called with today\'s date and the saved result records the advanced streak', async () => {
    render(<WordWheelChallenge />);

    const playButton = await screen.findByText('daily.play');
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(capturedOnComplete).not.toBeNull();
    });

    await act(async () => {
      capturedOnComplete!({ wordsFound: ['CAB', 'BAD'], score: 42, timeSeconds: 60 });
    });

    await waitFor(() => {
      expect(updateDailyStreakMock).toHaveBeenCalledWith('2026-04-27');
    });

    await waitFor(() => {
      expect(saveWordWheelResultMock).toHaveBeenCalled();
    });
    expect(saveWordWheelResultMock.mock.calls[0][0]).toMatchObject({
      score: 42,
      streakDays: 5,
    });
  });
});
