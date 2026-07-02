/**
 * Bug (Word Wheel mode): the catch-up rewarded ad gate strands the player.
 *
 * Identical defect to the Word Hunt daily: playing a missed Word Wheel day is
 * gated behind a rewarded ad on native, and the game start was wired ONLY to
 * onRewardEarned. Any non-reward terminal (skip / stall / timeout) fires
 * onAdError, which was wired to nothing → the player is stuck on the ready
 * screen after the ad Activity tears down.
 *
 * Fix: degrade to free play on ad failure (matches the web contract).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  useSearchParams: () => ({ get: (k: string) => (k === 'date' ? '2026-04-24' : null) }),
  // WordWheelChallenge now calls useRouter() for the mid-game exit nav; this
  // local mock overrides the global one, so it must provide it too.
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

// Native app → the catch-up ad gate is active. Keep the rest real.
vi.mock('@/utils/platform', async (importActual) => ({
  ...(await importActual<typeof import('@/utils/platform')>()),
  isNative: () => true,
}));

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
}));
vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  generateWordWheelPuzzle: () => ({ centerLetter: 'A', outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'], validWords: [] }),
}));
vi.mock('@/utils/guestManager', () => ({ getGuestFingerprint: () => null }));

// showAd() simulates a non-reward terminal by firing the onAdError callback.
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: (opts: { onAdError?: (msg: string) => void } = {}) => ({
    showAd: () => { opts.onAdError?.('Ad timed out — please try again'); },
    isAdAvailable: true,
    isPlaceholderCooldown: false,
    status: 'idle',
  }),
}));

vi.mock('../WordWheelGame', () => ({ __esModule: true, default: () => <div data-testid="word-wheel-game" /> }));
vi.mock('../WordWheelResults', () => ({ __esModule: true, default: () => <div data-testid="word-wheel-results" /> }));
vi.mock('../TabbedDailyLeaderboard', () => ({ __esModule: true, default: () => <div data-testid="tabbed-daily-leaderboard" /> }));

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/api/daily-challenge/word-wheel/check-played/')) {
      return new Response(JSON.stringify({ hasPlayed: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('{}', { status: 200 });
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('WordWheelChallenge — catch-up ad failure degrades to free play', () => {
  it('GIVEN a missed Word Wheel day WHEN the rewarded ad fails THEN the game starts anyway (player not stranded)', async () => {
    render(<WordWheelChallenge />);

    // Ready screen → Play button (label key is daily.play under the stub t()).
    const playButton = await screen.findByText('daily.play');

    fireEvent.click(playButton);

    await waitFor(() => expect(screen.getByTestId('word-wheel-game')).toBeInTheDocument());
  });
});
