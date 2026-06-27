/**
 * UnlockNotifierMount — global gate for the cosmetic unlock toast.
 * Must NOT run the notifier for guests (no profile) — seeding the snapshot from
 * a guest default would spam toasts on a later sign-in. Once a real profile is
 * loaded it runs with the score-derived leaderboard tier (from total_score, the
 * same axis the cosmetics gate uses) and the real streak from player_engagement.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const notifierMock = vi.fn();
vi.mock('@/hooks/useUnlockNotifier', () => ({
  useUnlockNotifier: (arg: unknown) => notifierMock(arg),
}));

const authMock = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authMock(),
}));

const engagementMock = vi.fn();
vi.mock('@/hooks/useEngagementStatus', () => ({
  useEngagementStatus: () => engagementMock(),
}));

import { UnlockNotifierMount } from '../UnlockNotifierMount';

describe('UnlockNotifierMount', () => {
  beforeEach(() => {
    notifierMock.mockClear();
    engagementMock.mockReturnValue({ streak: 0, loading: false });
  });

  it('does not run the notifier for guests (no profile)', () => {
    authMock.mockReturnValue({ profile: null });
    render(<UnlockNotifierMount />);
    expect(notifierMock).not.toHaveBeenCalled();
  });

  it('does not run the notifier while engagement (streak) is still loading', () => {
    // Feeding the transient streak=0 would snapshot 0 and fire false streak-unlock
    // toasts the moment the real streak resolves. Gate until loading === false.
    authMock.mockReturnValue({ profile: { total_score: 12000 } });
    engagementMock.mockReturnValue({ streak: 0, loading: true });
    render(<UnlockNotifierMount />);
    expect(notifierMock).not.toHaveBeenCalled();
  });

  it('runs the notifier with the score-derived tier and engagement streak', () => {
    // total_score 12000 → Gold tier (>= 10000). Streak from player_engagement.
    authMock.mockReturnValue({ profile: { total_score: 12000 } });
    engagementMock.mockReturnValue({ streak: 12, loading: false });
    render(<UnlockNotifierMount />);
    expect(notifierMock).toHaveBeenCalledWith({ rankTier: 'gold', streakDays: 12 });
  });

  it('falls back to Stone/0 when total_score is missing', () => {
    authMock.mockReturnValue({ profile: {} });
    render(<UnlockNotifierMount />);
    expect(notifierMock).toHaveBeenCalledWith({ rankTier: 'stone', streakDays: 0 });
  });
});
