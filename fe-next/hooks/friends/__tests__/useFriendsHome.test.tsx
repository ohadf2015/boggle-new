import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFriendsHome, resetFriendsHomeForTests, POLL_MS } from '../useFriendsHome';

const body = (n: number) => ({ friends: [], friendCount: n, incoming: { count: 0, first: [] }, suggestions: [], canAddFriends: true, presence: [] });

describe('useFriendsHome', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    resetFriendsHomeForTests();
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => body(1) });
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('Given signed out, Then nothing is fetched', () => {
    renderHook(() => useFriendsHome(false));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Given signed in, Then it loads the crew', async () => {
    const { result } = renderHook(() => useFriendsHome(true));
    await waitFor(() => expect(result.current.data?.friendCount).toBe(1));
    expect(fetchMock.mock.calls[0][0]).toBe('/api/friends/home');
  });

  it('Given two consumers at once, Then one request', async () => {
    renderHook(() => useFriendsHome(true));
    renderHook(() => useFriendsHome(true));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it('Given a visible tab, Then it polls; given a hidden tab, Then it pauses', async () => {
    vi.useFakeTimers();
    renderHook(() => useFriendsHome(true));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_MS); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_MS * 3); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('Given the route fails, Then an error state, not an empty crew', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const { result } = renderHook(() => useFriendsHome(true));
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
