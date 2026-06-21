/**
 * Tests for TabbedDailyLeaderboard integration in WordWheelChallenge ready phase.
 *
 * Requirement:
 * - When phase is 'ready' (i.e. user has not played today), the ready screen
 *   shows a TabbedDailyLeaderboard with scope="word-wheel" for parity with the
 *   word-hunt ready screen.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import WordWheelChallenge from '../WordWheelChallenge';

// --- next/dynamic: render children synchronously ---
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const Stub = () => null;
    Stub.displayName = 'DynamicStub';
    return Stub;
  },
}));

// --- framer-m: pass-through ---
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

// --- Contexts ---
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ setGameActive: vi.fn() }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: null, isAuthenticated: false }),
}));
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));

// --- Utils ---
vi.mock('@/utils/dailyChallenge', () => ({
  getDailyChallengeDate: () => '2026-04-15',
  getPuzzleNumber: () => 42,
  hasPlayedWordWheelToday: () => false,
  getTodaysWordWheelResult: () => null,
  saveWordWheelResult: vi.fn(),
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
  getGuestFingerprint: () => 'test-fp',
}));

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    canShowAd: false,
    isDailyLimitReached: false,
    showAd: vi.fn(),
    isLoading: false,
  }),
}));

// --- Child components ---
vi.mock('../WordWheelGame', () => ({
  __esModule: true,
  default: () => <div data-testid="word-wheel-game" />,
}));
vi.mock('../WordWheelResults', () => ({
  __esModule: true,
  default: () => <div data-testid="word-wheel-results" />,
}));

// --- TabbedDailyLeaderboard: capture props ---
const capturedProps: { scope?: string; defaultTab?: string }[] = [];
vi.mock('../TabbedDailyLeaderboard', () => ({
  __esModule: true,
  default: (props: { scope?: string; defaultTab?: string }) => {
    capturedProps.push(props);
    return (
      <div data-testid="tabbed-daily-leaderboard" data-scope={props.scope}>
        leaderboard
      </div>
    );
  },
}));

beforeEach(() => {
  capturedProps.length = 0;
});

describe('WordWheelChallenge - ready phase leaderboard', () => {
  it('GIVEN unplayed state THEN renders TabbedDailyLeaderboard with scope="word-wheel"', async () => {
    render(<WordWheelChallenge />);

    const lb = await waitFor(() =>
      screen.getByTestId('tabbed-daily-leaderboard')
    );

    expect(lb).toBeInTheDocument();
    expect(lb.getAttribute('data-scope')).toBe('word-wheel');

    const wheelProps = capturedProps.find((p) => p.scope === 'word-wheel');
    expect(wheelProps).toBeDefined();
    expect(wheelProps?.defaultTab).toBe('today');
  });
});
