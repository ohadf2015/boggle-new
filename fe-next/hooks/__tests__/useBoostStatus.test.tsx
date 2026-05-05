import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBoostStatus } from '../useBoostStatus';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

describe('useBoostStatus', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches status on mount and exposes remaining + cap', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        remaining: 3,
        capPerDay: 5,
        resetAt: '2026-04-27T00:00:00.000Z',
      }),
    });

    const { result } = renderHook(() => useBoostStatus());
    await waitFor(() => expect(result.current.status?.remaining).toBe(3));
    expect(result.current.status?.capPerDay).toBe(5);
    expect(result.current.status?.resetAt).toBe('2026-04-27T00:00:00.000Z');
  });

  it('isLoading true initially, false after load', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        remaining: 2,
        capPerDay: 5,
        resetAt: '2026-04-27T00:00:00.000Z',
      }),
    });

    const { result } = renderHook(() => useBoostStatus());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('handles fetch error gracefully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const { result } = renderHook(() => useBoostStatus());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.status).toBeNull();
    expect(result.current.error).toBeDefined();
  });

  it('provides refresh function to refetch status', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          remaining: 3,
          capPerDay: 5,
          resetAt: '2026-04-27T00:00:00.000Z',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          remaining: 2,
          capPerDay: 5,
          resetAt: '2026-04-27T00:00:00.000Z',
        }),
      });

    const { result } = renderHook(() => useBoostStatus());
    await waitFor(() => expect(result.current.status?.remaining).toBe(3));

    await result.current.refresh();
    await waitFor(() => expect(result.current.status?.remaining).toBe(2));
  });
});
