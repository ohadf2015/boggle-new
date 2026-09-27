import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * `hasAccess` is derived from `profile.user_role`, but `profile` and `loading` are separate
 * pieces of auth state (contexts/auth/hooks/useAuthState.ts) that do not resolve together.
 * `useAuthInitialization` calls `setUser(sessionUser)` before awaiting the profile fetch, and
 * several branches (TOKEN_REFRESHED, the same-user INITIAL_SESSION path, a failed profile
 * fetch) reach `setLoading(false)` without a profile in hand.
 *
 * In that window an approved teacher looks exactly like a stranger: `loading` false,
 * `profile` null, so `hasAccess` false and `isLoading` false. `TeacherGate` reads precisely
 * that pair and `router.replace`s them to the access-request form — where, because requests
 * auto-approve, they can only re-submit a request for a role they already hold. Four of the
 * seventeen teachers have a duplicate request, one filed 3.3 seconds after the first.
 *
 * `TeacherDashboardInner` already defends against this with its own
 * `isProfileLoading = !authLoading && user && !profile`, and its comment warns that drift
 * "silently bounces approved teachers". But TeacherGate wraps the dashboard and runs first,
 * so the guard never got a chance to matter — a Class 1 dual-source-of-truth split where the
 * later-resolving source flips the answer.
 *
 * The fix belongs in the shared hook so BOTH consumers inherit it: render the pessimistic
 * state until every source has resolved.
 */

const authState: { profile: unknown; user: unknown; loading: boolean } = {
  profile: null,
  user: null,
  loading: true,
};

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('@/utils/authFetch', () => ({
  getWithAuth: vi.fn(async () => ({ ok: true, json: async () => ({ row: null }) })),
}));

import { useTeacherAccess } from '../useTeacherAccess';

describe('useTeacherAccess — profile resolves after auth', () => {
  beforeEach(() => {
    authState.profile = null;
    authState.user = null;
    authState.loading = true;
  });

  /**
   * The access-request fetch also flips `isLoading`, and it is in flight on the first commit
   * for ANY signed-in user. Asserting before it settles makes every case look "still
   * loading" and the hazard vanishes — so each case waits for that fetch to finish first,
   * leaving the profile as the only unresolved source.
   */
  const renderSettled = async () => {
    const hook = renderHook(() => useTeacherAccess());
    // Drain the fetch's .then/.then/.finally chain. Waiting on `latestRequest` would not
    // work — it starts null and stays null, so the condition is true before the fetch even
    // runs and the wait is a no-op.
    await act(async () => {
      for (let i = 0; i < 5; i++) await Promise.resolve();
    });
    return hook;
  };

  it('still reports loading when auth finished but the profile has not arrived', async () => {
    authState.loading = false;
    authState.user = { id: 'u-1' };
    authState.profile = null;

    const { result } = await renderSettled();

    // The whole point: a signed-in user whose profile is in flight must NOT be presented as
    // a resolved "no access", because that is what triggers the redirect.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasAccess).toBe(false);
  });

  it('reports a resolved no-access for a signed-in NON-teacher', async () => {
    // The guard must not swallow the genuine denial — a loaded profile without the role is a
    // final answer, and the gate should still redirect.
    authState.loading = false;
    authState.user = { id: 'u-1' };
    authState.profile = { id: 'u-1', user_role: 'student', is_admin: false };

    const { result } = await renderSettled();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasAccess).toBe(false);
  });

  it('reports a resolved no-access for a signed-OUT visitor', async () => {
    // No user means no profile is coming; that must resolve, not hang the gate forever.
    authState.loading = false;
    authState.user = null;
    authState.profile = null;

    const { result } = await renderSettled();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasAccess).toBe(false);
  });

  it('grants access once the profile arrives with the teacher role', async () => {
    authState.loading = false;
    authState.user = { id: 'u-1' };
    authState.profile = { id: 'u-1', user_role: 'teacher', is_admin: false };

    const { result } = await renderSettled();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasAccess).toBe(true);
  });
});
