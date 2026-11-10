import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import StreakBadge from '../StreakBadge';

let mockAccountStreak: { streak: number; loading: boolean; isGuest?: boolean; freezes?: number } = { streak: 0, loading: false };
let mockRetention = { streak: 0, best: 0, freezeAvailable: false };

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      key === 'dailyStreak.badge' ? `streak:${params?.count}` : key,
  }),
}));

vi.mock('@/hooks/useAccountStreak', () => ({
  useAccountStreak: () => mockAccountStreak,
}));

vi.mock('@/hooks/useRetentionStreak', () => ({
  useRetentionStreak: () => mockRetention,
}));

describe('StreakBadge', () => {
  beforeEach(() => {
    mockAccountStreak = { streak: 0, loading: false };
    mockRetention = { streak: 0, best: 0, freezeAvailable: false };
  });

  it('renders the account streak (server-authoritative for a signed-in player)', () => {
    mockAccountStreak = { streak: 1, loading: false };
    mockRetention = { streak: 3, best: 5, freezeAvailable: false };

    render(<StreakBadge />);

    // Must show the account streak (1), never the stale local device streak (3) —
    // this is the exact bug reported: header showed a different number than the
    // daily-puzzle card for the same account.
    expect(screen.getByTestId('streak-badge')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.queryByText('3')).toBeNull();
  });

  it('self-hides at 0 days', () => {
    mockAccountStreak = { streak: 0, loading: false };
    render(<StreakBadge />);
    expect(screen.queryByTestId('streak-badge')).toBeNull();
  });

  it('self-hides while the account streak is still loading, instead of flashing 0', () => {
    mockAccountStreak = { streak: 0, loading: true };
    render(<StreakBadge />);
    expect(screen.queryByTestId('streak-badge')).toBeNull();
  });

  it('for a guest, shows the freeze pip from the device-local weekly freeze', () => {
    mockAccountStreak = { streak: 4, loading: false, isGuest: true, freezes: 0 };
    mockRetention = { streak: 4, best: 4, freezeAvailable: true };

    render(<StreakBadge />);

    expect(screen.getByTestId('streak-freeze-pip')).toBeInTheDocument();
  });

  it('for a signed-in player, shows the pip only when the account banks a freeze (same count as the freeze shop)', () => {
    mockAccountStreak = { streak: 4, loading: false, isGuest: false, freezes: 0 };
    mockRetention = { streak: 4, best: 4, freezeAvailable: true };
    const { unmount } = render(<StreakBadge />);
    expect(screen.queryByTestId('streak-freeze-pip')).toBeNull();
    unmount();
    mockAccountStreak = { streak: 4, loading: false, isGuest: false, freezes: 1 };
    render(<StreakBadge />);
    expect(screen.getByTestId('streak-freeze-pip')).toBeInTheDocument();
  });
});
