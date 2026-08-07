/**
 * Daily forgiveness + results screen.
 *
 * Regression cover for two reported defects:
 *  1. attempts were spent invisibly (no HUD) out of a pool shared across all 5
 *     puzzles, so the run could end before the player saw bridges 3-5;
 *  2. a blanked run rendered "Daily complete! / 0 solved / Score: 0" and taught
 *     the player nothing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConnectionsDailyChallenge from '../ConnectionsDailyChallenge';
import { DAILY_ATTEMPTS_PER_PUZZLE, DAILY_PUZZLE_COUNT } from '@/lib/connections/daily';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, isAdmin: false }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({ haptic: vi.fn(), customHaptic: vi.fn() }),
  GAME_HAPTICS: { validWord: 10, invalidWord: [1], comboLevelUp: [1] },
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playMatchFoundSound: vi.fn(), playErrorSound: vi.fn(), playVictorySound: vi.fn() }),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn() }));
vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: () => ({ canShowAd: false, status: 'idle', offer: vi.fn() }),
}));
vi.mock('@/components/ads/ResultsBannerSlot', () => ({
  default: ({ placement }: { placement: string }) => <div data-testid="results-banner" data-placement={placement} />,
}));
vi.mock('@/lib/connections/dailyClient', async (orig) => {
  const actual = (await orig()) as object;
  return {
    ...actual,
    todayUTC: () => '2026-05-30',
    getGuestFingerprint: () => 'test-guest',
    advanceClientStreak: () => ({ streak: 1, lastDate: '2026-05-30' }),
    submitDailyScore: vi.fn(async () => null),
    fetchDailyLeaderboard: vi.fn(async () => null),
  };
});

/** Submit one wrong guess through the on-screen keyboard + submit key. */
function guessWrong() {
  fireEvent.click(screen.getAllByRole('button', { name: 'Z' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'connections.submit' }));
}

describe('daily forgiveness', () => {
  beforeEach(() => window.localStorage.clear());

  it('shows the per-puzzle attempt budget from the first render', () => {
    render(<ConnectionsDailyChallenge />);
    const hud = screen.getByTestId('daily-attempts');
    expect(hud.getAttribute('data-remaining')).toBe(String(DAILY_ATTEMPTS_PER_PUZZLE));
  });

  it('given a wrong guess, one attempt is spent and play continues on the same puzzle', () => {
    render(<ConnectionsDailyChallenge />);
    guessWrong();
    expect(screen.getByTestId('daily-attempts').getAttribute('data-remaining')).toBe(
      String(DAILY_ATTEMPTS_PER_PUZZLE - 1),
    );
    expect(screen.getByTestId('daily-progress').textContent).toContain('1');
  });

  it('given a puzzle burnt out, the answer is revealed and the run moves on rather than ending', () => {
    render(<ConnectionsDailyChallenge />);
    for (let i = 0; i < DAILY_ATTEMPTS_PER_PUZZLE; i++) guessWrong();
    // Reveal state: the "solution is" line + a Next button, not a results screen.
    expect(screen.getByText(/connections\.solutionIs/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /connections\.next/ }));
    expect(screen.getByTestId('daily-progress').textContent).toContain('2');
  });

  it('given every puzzle burnt out, the results screen encourages instead of printing a bare 0', async () => {
    render(<ConnectionsDailyChallenge />);
    for (let p = 0; p < DAILY_PUZZLE_COUNT; p++) {
      for (let i = 0; i < DAILY_ATTEMPTS_PER_PUZZLE; i++) guessWrong();
      fireEvent.click(screen.getByRole('button', { name: /connections\.next/ }));
    }
    await waitFor(() => expect(screen.getByText('connections.daily.completeTough')).toBeTruthy());
    expect(screen.getByText('connections.daily.zeroSolved')).toBeTruthy();
    // Never the celebratory copy, and never a bare score line.
    expect(screen.queryByText('connections.daily.complete')).toBeNull();
  });

  it('given a finished run, the answer key and the results ad slot are shown', async () => {
    render(<ConnectionsDailyChallenge />);
    for (let p = 0; p < DAILY_PUZZLE_COUNT; p++) {
      for (let i = 0; i < DAILY_ATTEMPTS_PER_PUZZLE; i++) guessWrong();
      fireEvent.click(screen.getByRole('button', { name: /connections\.next/ }));
    }
    await waitFor(() => expect(screen.getByTestId('daily-answer-key')).toBeTruthy());
    expect(screen.getAllByTestId('answer-key-row')).toHaveLength(DAILY_PUZZLE_COUNT);
    expect(screen.getByTestId('results-banner').getAttribute('data-placement')).toBe('daily-complete');
  });
});
