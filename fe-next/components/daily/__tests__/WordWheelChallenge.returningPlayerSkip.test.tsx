/**
 * Returning players ("already play this kind of challenge") shouldn't see the
 * Word Wheel intro/ready page at all — they should land straight in gameplay.
 * First-time players still see the ready screen.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import WordWheelChallenge from '../WordWheelChallenge';

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => { const Stub = () => null; Stub.displayName = 'DynamicStub'; return Stub; },
}));
vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: () => ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div> }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ setGameActive: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'player-123', display_name: 'P', avatar_emoji: '🎯', avatar_color: '#fff' }, isAuthenticated: true }),
}));
vi.mock('@/contexts/NavigationContext', () => ({ useHideNavigation: () => vi.fn() }));
vi.mock('@/hooks/usePracticeFlag', () => ({ usePracticeFlag: () => false }));
vi.mock('@/hooks/useDailyModePlayed', () => ({ useDailyModePlayed: () => false }));

const mockHasEverPlayedWordWheel = vi.fn(() => false);

vi.mock('@/utils/dailyChallenge', () => ({
  getDailyChallengeDate: () => '2026-04-25',
  getPuzzleNumber: () => 117,
  hasPlayedWordWheelToday: () => false,
  getTodaysWordWheelResult: () => null,
  saveWordWheelResult: vi.fn(),
  hasPlayedWordHuntToday: () => false,
  getDailyStreak: () => ({ currentStreak: 0 }),
  updateDailyStreak: vi.fn(() => ({ currentStreak: 1, longestStreak: 1, lastPlayedDate: null, totalDailiesCompleted: 1 })),
  hasPlayedWordWheel: () => false,
  getWordWheelResultForDate: () => null,
  hasEverPlayedWordWheel: (...args: unknown[]) => mockHasEverPlayedWordWheel(...args),
}));
vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  generateWordWheelPuzzle: () => ({ centerLetter: 'A', outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'], validWords: [] }),
}));
vi.mock('@/utils/guestManager', () => ({ getGuestFingerprint: () => null }));

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({ showAd: vi.fn(), isAdAvailable: true, isPlaceholderCooldown: false, status: 'idle' }),
}));

vi.mock('../WordWheelGame', () => ({ __esModule: true, default: () => <div data-testid="word-wheel-game" /> }));
vi.mock('../WordWheelResults', () => ({ __esModule: true, default: () => <div data-testid="word-wheel-results" /> }));
vi.mock('../TabbedDailyLeaderboard', () => ({ __esModule: true, default: () => <div data-testid="tabbed-daily-leaderboard" /> }));

beforeEach(() => {
  mockHasEverPlayedWordWheel.mockReturnValue(false);
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/api/daily-challenge/word-wheel/check-played/')) {
      return new Response(JSON.stringify({ hasPlayed: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('{}', { status: 200 });
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('WordWheelChallenge — returning player skips the ready screen', () => {
  it('GIVEN a first-time player THEN the ready screen (Play button) is shown', async () => {
    mockHasEverPlayedWordWheel.mockReturnValue(false);
    render(<WordWheelChallenge />);

    await screen.findByText('daily.play');
    expect(screen.queryByTestId('word-wheel-game')).not.toBeInTheDocument();
  });

  it('GIVEN a player who has played Word Wheel before THEN gameplay starts immediately, no ready screen', async () => {
    mockHasEverPlayedWordWheel.mockReturnValue(true);
    render(<WordWheelChallenge />);

    await waitFor(() => expect(screen.getByTestId('word-wheel-game')).toBeInTheDocument());
    expect(screen.queryByText('daily.play')).not.toBeInTheDocument();
  });
});
