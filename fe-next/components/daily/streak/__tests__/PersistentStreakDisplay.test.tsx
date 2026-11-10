import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { act, render, screen } from '@testing-library/react';

const status = vi.hoisted(() => ({
  value: {
    streak: { current: 0, longest: 0 },
    loading: false,
    hasPlayedBefore: false,
    freezeApplied: undefined as { date: string; freezesRemaining: number } | undefined,
    streakRepaired: undefined as { dates: string[] } | undefined,
  },
  view: { loading: false, current: 0, atRisk: false, freezeSaved: null as { date: string; freezesRemaining: number } | null },
  track: vi.fn(),
}));
vi.mock('@/hooks/useStreakView', () => ({ useStreakView: () => status.view }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => status.track(...a) }));
vi.mock('@/hooks/useDailyPlayedStatus', () => ({ useDailyPlayedStatus: () => status.value }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import { PersistentStreakDisplay } from '../PersistentStreakDisplay';

describe('PersistentStreakDisplay', () => {
  beforeEach(() => {
    localStorage.clear();
    status.value = { streak: { current: 0, longest: 0 }, loading: false, hasPlayedBefore: false, freezeApplied: undefined, streakRepaired: undefined };
    status.view = { loading: false, current: 0, atRisk: false, freezeSaved: null };
    status.track.mockClear();
  });

  it('given a catch-up replay that repaired the streak, then streak_repaired fires once per repaired day', () => {
    status.value = { ...status.value, hasPlayedBefore: true, streak: { current: 4, longest: 4 }, streakRepaired: { dates: ['2026-10-29'] } };
    status.view = { ...status.view, current: 4 };
    const first = render(<PersistentStreakDisplay />);
    first.unmount();
    render(<PersistentStreakDisplay />);
    expect(status.track.mock.calls.filter((c) => c[0] === 'streak_repaired')).toHaveLength(1);
    expect(status.track).toHaveBeenCalledWith('streak_repaired', { date: '2026-10-29', streak: 4 });
  });

  it('given a newcomer who has never finished a daily, then no "0" flame is shown', () => {
    render(<PersistentStreakDisplay />);
    expect(screen.queryByTestId('streak-counter')).not.toBeInTheDocument();
  });

  it('given a returning player whose streak broke, then the 0 flame is still shown', () => {
    status.value = { ...status.value, hasPlayedBefore: true, streak: { current: 0, longest: 4 } };
    render(<PersistentStreakDisplay />);
    expect(screen.getByTestId('streak-counter')).toHaveTextContent('0');
  });

  it('given the same bridged freeze on every status answer, then the toast shows once, not on every visit', () => {
    status.value = {
      ...status.value,
      hasPlayedBefore: true,
      streak: { current: 3, longest: 3 },
      freezeApplied: { date: '2026-10-29', freezesRemaining: 1 },
    };
    const first = render(<PersistentStreakDisplay />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    first.unmount();

    render(<PersistentStreakDisplay />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('given StrictMode re-runs effects, then the freeze toast still dismisses itself', () => {
    vi.useFakeTimers();
    status.value = {
      ...status.value,
      hasPlayedBefore: true,
      streak: { current: 3, longest: 3 },
      freezeApplied: { date: '2026-10-28', freezesRemaining: 0 },
    };
    render(<React.StrictMode><PersistentStreakDisplay /></React.StrictMode>);
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(4100); });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('given /api/daily/status counts a different streak, then the account streak is shown (one number everywhere)', () => {
    status.value = { ...status.value, hasPlayedBefore: true, streak: { current: 1, longest: 1 } };
    status.view = { ...status.view, current: 6 };
    render(<PersistentStreakDisplay />);
    expect(screen.getByTestId('streak-counter')).toHaveTextContent('6');
  });

  it('given a freeze spent on load, then the "freeze saved your streak" toast shows once', () => {
    status.value = { ...status.value, hasPlayedBefore: true };
    status.view = { ...status.view, current: 5, freezeSaved: { date: '2026-11-11', freezesRemaining: 1 } };
    const first = render(<PersistentStreakDisplay />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    first.unmount();
    render(<PersistentStreakDisplay />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('given the account streak is still loading, then no number is guessed', () => {
    status.value = { ...status.value, hasPlayedBefore: true, streak: { current: 3, longest: 3 } };
    status.view = { ...status.view, loading: true };
    render(<PersistentStreakDisplay />);
    expect(screen.queryByTestId('streak-counter')).not.toBeInTheDocument();
  });
});
