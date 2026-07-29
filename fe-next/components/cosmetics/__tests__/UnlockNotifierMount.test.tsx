/**
 * UnlockNotifierMount — global gate for the cosmetic unlock toast.
 * Must NOT run the notifier for guests (no profile) — seeding the snapshot from
 * a guest default would spam toasts on a later sign-in. Must run it (with the
 * profile's rank/streak) once a real profile is loaded.
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

import { UnlockNotifierMount } from '../UnlockNotifierMount';

describe('UnlockNotifierMount', () => {
  beforeEach(() => notifierMock.mockClear());

  it('does not run the notifier for guests (no profile)', () => {
    authMock.mockReturnValue({ profile: null });
    render(<UnlockNotifierMount />);
    expect(notifierMock).not.toHaveBeenCalled();
  });

  it('runs the notifier with the loaded profile rank/streak', () => {
    authMock.mockReturnValue({ profile: { rank_tier: 'Gold', streak_days: 12 } });
    render(<UnlockNotifierMount />);
    expect(notifierMock).toHaveBeenCalledWith({ rankTier: 'Gold', streakDays: 12 });
  });

  it('falls back to Bronze/0 when profile fields are missing', () => {
    authMock.mockReturnValue({ profile: {} });
    render(<UnlockNotifierMount />);
    expect(notifierMock).toHaveBeenCalledWith({ rankTier: 'Bronze', streakDays: 0 });
  });
});
