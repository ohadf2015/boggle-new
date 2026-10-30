import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { act, render, screen } from '@testing-library/react';

const status = vi.hoisted(() => ({
  value: {
    streak: { current: 0, longest: 0 },
    loading: false,
    hasPlayedBefore: false,
    freezeApplied: undefined as { date: string; freezesRemaining: number } | undefined,
  },
}));
vi.mock('@/hooks/useDailyPlayedStatus', () => ({ useDailyPlayedStatus: () => status.value }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import { PersistentStreakDisplay } from '../PersistentStreakDisplay';

describe('PersistentStreakDisplay', () => {
  beforeEach(() => {
    localStorage.clear();
    status.value = { streak: { current: 0, longest: 0 }, loading: false, hasPlayedBefore: false, freezeApplied: undefined };
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
});
