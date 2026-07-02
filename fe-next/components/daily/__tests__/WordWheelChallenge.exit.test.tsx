/**
 * Bug: the Word Wheel sub-game had NO exit/back affordance during play. Once
 * the timer started the player was trapped — worst under Hebrew/RTL, where
 * there was no top-nav back button to fall back on either. (Its sibling, Word
 * Hunt, has SurvivalHeader's quit button; Word Wheel had nothing.)
 *
 * Fix: WordWheelGame renders an in-HUD exit button (in-flow flex, RTL-safe) that
 * calls onExit; WordWheelChallenge owns the confirm dialog (shared defensive
 * quit-dialog config — never throws on a bad locale) and, on confirm, navigates
 * to the daily hub.
 *
 * These tests verify the Challenge-level wiring: exit → dialog with the right
 * (ad-free) copy → confirm → navigate.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const { pushSpy } = vi.hoisted(() => ({ pushSpy: vi.fn() }));

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const Stub = () => null;
    Stub.displayName = 'DynamicStub';
    return Stub;
  },
}));

vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: () => ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div> }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Stable router spy (overrides the global next/navigation mock).
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushSpy, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/en/daily/word-wheel',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ locale: 'en' }),
}));

const DICT: Record<string, string> = {
  'daily.play': 'Play',
  'daily.quitConfirmTitle': 'Leave mid-game?',
  'wordHunt.quitConfirmMessage': 'Your progress will be lost!',
  'daily.imSure': 'Leave anyway',
  'common.cancel': 'Cancel',
  'common.quit': 'Quit',
};
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => DICT[k] ?? k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ setGameActive: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ profile: null, isAuthenticated: false }) }));
vi.mock('@/contexts/NavigationContext', () => ({ useHideNavigation: () => vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackModalInteraction: vi.fn() }));

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
  generateWordWheelPuzzle: () => ({ centerLetter: 'A', outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'], validWords: [] }),
}));
vi.mock('@/utils/guestManager', () => ({ getGuestFingerprint: () => 'test-fp' }));
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({ showAd: vi.fn(), isAdAvailable: false, isPlaceholderCooldown: false }),
}));

// WordWheelGame stub that surfaces the onExit prop the fix threads through.
vi.mock('../WordWheelGame', () => ({
  __esModule: true,
  default: (props: { onExit?: () => void }) => (
    <button data-testid="wheel-exit-trigger" onClick={() => props.onExit?.()}>go</button>
  ),
}));
vi.mock('../WordWheelResults', () => ({ __esModule: true, default: () => <div data-testid="word-wheel-results" /> }));
vi.mock('../TabbedDailyLeaderboard', () => ({ __esModule: true, default: () => <div data-testid="tabbed-daily-leaderboard" /> }));

import WordWheelChallenge from '../WordWheelChallenge';

async function reachPlaying() {
  render(<WordWheelChallenge />);
  // The ready-screen Play control is a framer-motion `m.button`, which the
  // pass-through mock above renders as a <div> — so match by text, not role.
  const playBtn = await waitFor(() => screen.getByText('Play'));
  fireEvent.click(playBtn);
  return waitFor(() => screen.getByTestId('wheel-exit-trigger'));
}

describe('WordWheelChallenge — mid-game exit', () => {
  beforeEach(() => pushSpy.mockClear());

  it('opens a confirm dialog with ad-free copy when the exit button is tapped', async () => {
    const exit = await reachPlaying();
    fireEvent.click(exit);

    // Shared defensive config: title from daily.quitConfirmTitle, description
    // from wordHunt.quitConfirmMessage (NOT the ad-mentioning daily.quitConfirm).
    await waitFor(() => expect(screen.getByText('Leave mid-game?')).toBeInTheDocument());
    expect(screen.getByText('Your progress will be lost!')).toBeInTheDocument();
    // Navigation must NOT fire until the player confirms.
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('navigates to the daily hub only after confirming', async () => {
    const exit = await reachPlaying();
    fireEvent.click(exit);

    const confirm = await waitFor(() => screen.getByRole('button', { name: 'Leave anyway' }));
    fireEvent.click(confirm);

    await waitFor(() => expect(pushSpy).toHaveBeenCalledWith('/en/daily'));
  });
});
