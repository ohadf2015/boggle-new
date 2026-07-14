/**
 * Duplicate-submit reconciliation: when the user completes a replay attempt
 * (e.g. after `/check-played` failed and the client fell through to ready
 * phase), the server's `/submit` returns `{alreadySubmitted: true, result}`.
 * The component must overwrite the wasted-replay localStorage entry with the
 * canonical server result so this device's display matches the leaderboard.
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
    profile: { id: 'player-99', display_name: 'P', avatar_emoji: '🎯', avatar_color: '#fff' },
    isAuthenticated: true,
  }),
}));
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));

const saveWordWheelResultMock = vi.fn();
vi.mock('@/utils/dailyChallenge', () => ({
  hasEverPlayedWordWheel: () => false,
  getDailyChallengeDate: () => '2026-04-27',
  getPuzzleNumber: () => 119,
  hasPlayedWordWheelToday: () => false,
  getTodaysWordWheelResult: () => null,
  saveWordWheelResult: (...args: unknown[]) => saveWordWheelResultMock(...args),
  hasPlayedWordHuntToday: () => false,
  getDailyStreak: () => ({ currentStreak: 0 }),
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
  capturedOnComplete = null;
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
        return new Response(
          JSON.stringify({
            success: true,
            alreadySubmitted: true,
            result: {
              score: 200,
              wordCount: 9,
              wordsFound: ['CANONICAL', 'WORDS', 'WIN'],
              longestWord: 'CANONICAL',
              timeSeconds: 110,
              centerLetter: 'A',
              completedAt: '2026-04-27T03:00:00.000Z',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 200 });
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WordWheelChallenge — duplicate-submit reconciliation', () => {
  it('GIVEN server returns alreadySubmitted=true with canonical result THEN saveWordWheelResult is called again with canonical score, overwriting the wasted-replay entry', async () => {
    render(<WordWheelChallenge />);

    // Click the Play button to transition phase: ready → playing → mounts WordWheelGame
    const playButton = await screen.findByText('daily.play');
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(capturedOnComplete).not.toBeNull();
    });

    // Simulate the user finishing the replay
    await act(async () => {
      capturedOnComplete!({ wordsFound: ['LOCAL', 'WASTED'], score: 5, timeSeconds: 30 });
    });

    // First save: optimistic local result (wasted replay)
    await waitFor(() => {
      expect(saveWordWheelResultMock).toHaveBeenCalled();
    });
    expect(saveWordWheelResultMock.mock.calls[0][0]).toMatchObject({
      score: 5,
      wordsFound: ['LOCAL', 'WASTED'],
    });

    // Second save: reconciled canonical result from server
    await waitFor(() => {
      expect(saveWordWheelResultMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    const reconciliation = saveWordWheelResultMock.mock.calls[saveWordWheelResultMock.mock.calls.length - 1][0];
    expect(reconciliation).toMatchObject({
      score: 200,
      wordsFound: ['CANONICAL', 'WORDS', 'WIN'],
      timeSeconds: 110,
      centerLetter: 'A',
      completedAt: '2026-04-27T03:00:00.000Z',
    });
  });
});
