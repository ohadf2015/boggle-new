/**
 * Cross-device sync: when localStorage on this device has no Word Wheel result
 * but the server reports the player already submitted today's puzzle, the
 * component must hydrate the result and show 'already-played' instead of
 * letting the user replay.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
  getDailyChallengeDate: () => '2026-04-25',
  getPuzzleNumber: () => 117,
  hasPlayedWordWheelToday: () => false,
  getTodaysWordWheelResult: () => null,
  saveWordWheelResult: (...args: unknown[]) => saveWordWheelResultMock(...args),
  hasPlayedWordHuntToday: () => false,
  getDailyStreak: () => ({ currentStreak: 0 }),
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

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    canShowAd: false,
    isDailyLimitReached: false,
    showAd: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock('../WordWheelGame', () => ({
  __esModule: true,
  default: () => <div data-testid="word-wheel-game" />,
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
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('/api/daily-challenge/word-wheel/check-played/')) {
        return new Response(
          JSON.stringify({
            hasPlayed: true,
            result: {
              wordsFound: ['CAB', 'BAD'],
              score: 42,
              timeSeconds: 95,
              longestWord: 'CAB',
              centerLetter: 'A',
              completedAt: '2026-04-25T10:00:00.000Z',
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

describe('WordWheelChallenge - cross-device server sync', () => {
  it('GIVEN authenticated player with empty local storage AND server reports already played THEN renders already-played view (results), not the ready screen', async () => {
    render(<WordWheelChallenge />);

    await waitFor(() => {
      expect(screen.getByTestId('word-wheel-results')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('tabbed-daily-leaderboard')).not.toBeInTheDocument();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/daily-challenge/word-wheel/check-played/2026-04-25/en'),
      expect.anything()
    );

    expect(saveWordWheelResultMock).toHaveBeenCalledTimes(1);
    expect(saveWordWheelResultMock.mock.calls[0][0]).toMatchObject({
      score: 42,
      wordsFound: ['CAB', 'BAD'],
      language: 'en',
      puzzleDate: '2026-04-25',
    });
  });
});
