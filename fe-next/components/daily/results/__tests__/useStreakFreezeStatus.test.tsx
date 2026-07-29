/**
 * Tests for useStreakFreezeStatus hook
 *
 * Fetches /api/streak on mount for authenticated users and derives two flags
 * consumed by the results screen's streak-freeze indicator.
 *
 * Guests: skips the request entirely (no server identity to key off).
 * Errors: silently ignored — indicator stays hidden, never blocks results.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useStreakFreezeStatus } from '../useStreakFreezeStatus';

describe('useStreakFreezeStatus', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns zero freezes and unprotected when user is not authenticated', () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useStreakFreezeStatus(false));

    expect(result.current.freezesAvailable).toBe(0);
    expect(result.current.isStreakProtected).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('populates freezesAvailable and isStreakProtected when authenticated', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ freezesAvailable: 3, protectedUntil: futureDate }),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useStreakFreezeStatus(true));

    await waitFor(() => expect(result.current.freezesAvailable).toBe(3));
    expect(result.current.isStreakProtected).toBe(true);
  });

  it('marks unprotected when protectedUntil is in the past', async () => {
    const pastDate = '2020-01-01';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ freezesAvailable: 1, protectedUntil: pastDate }),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useStreakFreezeStatus(true));

    await waitFor(() => expect(result.current.freezesAvailable).toBe(1));
    expect(result.current.isStreakProtected).toBe(false);
  });

  it('leaves state at defaults when fetch rejects', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    const { result } = renderHook(() => useStreakFreezeStatus(true));

    // allow the rejected promise to flush
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    expect(result.current.freezesAvailable).toBe(0);
    expect(result.current.isStreakProtected).toBe(false);
  });

  it('leaves state at defaults when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;

    const { result } = renderHook(() => useStreakFreezeStatus(true));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    expect(result.current.freezesAvailable).toBe(0);
    expect(result.current.isStreakProtected).toBe(false);
  });
});
