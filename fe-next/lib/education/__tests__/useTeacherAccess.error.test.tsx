import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const auth = vi.hoisted(() => ({
  current: { profile: null as unknown, user: null as unknown, loading: false, refreshProfile: vi.fn(async () => {}) },
}));
const getWithAuth = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.current }));
vi.mock('@/utils/authFetch', () => ({ getWithAuth }));

import { PROFILE_WAIT_MS, useTeacherAccess } from '../useTeacherAccess';

const ok = (row: unknown) => ({ ok: true, json: async () => ({ row }) });
const fail = () => ({ ok: false, status: 500, json: async () => ({ ok: false }) });

beforeEach(() => {
  auth.current = { profile: { id: 'u-1', user_role: 'player' }, user: { id: 'u-1' }, loading: false, refreshProfile: vi.fn(async () => {}) };
  getWithAuth.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('useTeacherAccess: a failed check is not "no access"', () => {
  it('Given a signed-in teacher, When the request has not answered yet, Then it reports loading, never a resolved "none"', () => {
    getWithAuth.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useTeacherAccess());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('Given the request lookup answers 500, Then it reports a request error, and retry reads it again', async () => {
    getWithAuth.mockResolvedValueOnce(fail()).mockResolvedValueOnce(ok({ id: 'r1', status: 'pending' }));
    const { result } = renderHook(() => useTeacherAccess());
    await waitFor(() => expect(result.current.error).toBe('request'));
    expect(result.current.isLoading).toBe(false);

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('pending'));
    expect(result.current.error).toBeNull();
    expect(getWithAuth).toHaveBeenCalledTimes(2);
  });

  it('Given the network drops, Then it reports a request error', async () => {
    getWithAuth.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useTeacherAccess());
    await waitFor(() => expect(result.current.error).toBe('request'));
  });

  it('Given the profile never arrives after sign-in, When the wait runs out, Then it reports a profile error while still loading, and retry re-reads the profile', async () => {
    vi.useFakeTimers();
    auth.current = { ...auth.current, profile: null };
    getWithAuth.mockResolvedValue(ok(null));
    const { result } = renderHook(() => useTeacherAccess());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PROFILE_WAIT_MS - 1);
    });
    expect(result.current.error).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2);
    });
    expect(result.current.error).toBe('profile');
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      result.current.retry();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(auth.current.refreshProfile).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('Given the profile arrives in time, Then no error is reported', async () => {
    vi.useFakeTimers();
    getWithAuth.mockResolvedValue(ok(null));
    const { result } = renderHook(() => useTeacherAccess());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PROFILE_WAIT_MS + 1);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.status).toBe('none');
  });

  it('Given the profile arrived after a slow load, When a later refresh briefly drops it, Then no error shows at once; only a fresh full wait can raise it', async () => {
    vi.useFakeTimers();
    auth.current = { ...auth.current, profile: null };
    getWithAuth.mockResolvedValue(ok(null));
    const { result, rerender } = renderHook(() => useTeacherAccess());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PROFILE_WAIT_MS + 1);
    });
    expect(result.current.error).toBe('profile');

    auth.current = { ...auth.current, profile: { id: 'u-1', user_role: 'player' } };
    rerender();
    expect(result.current.error).toBeNull();

    auth.current = { ...auth.current, profile: null };
    rerender();
    expect(result.current.error).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PROFILE_WAIT_MS - 1);
    });
    expect(result.current.error).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2);
    });
    expect(result.current.error).toBe('profile');
  });

  it('Given the profile error is showing, When nothing changes, Then it stays put until retry', async () => {
    vi.useFakeTimers();
    auth.current = { ...auth.current, profile: null };
    getWithAuth.mockResolvedValue(ok(null));
    const { result, rerender } = renderHook(() => useTeacherAccess());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PROFILE_WAIT_MS + 1);
    });
    expect(result.current.error).toBe('profile');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PROFILE_WAIT_MS * 3);
    });
    rerender();
    expect(result.current.error).toBe('profile');
  });
});
