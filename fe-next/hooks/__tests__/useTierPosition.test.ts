import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useTierPosition } from '../useTierPosition';

const mockRpc = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useTierPosition', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('returns parsed tier position on success', async () => {
    mockRpc.mockResolvedValue({
      data: {
        tier_id: 'gold',
        rank_in_tier: 12,
        tier_population: 487,
        neighbors: [],
      },
      error: null,
    });

    const { result } = renderHook(() => useTierPosition('user-1', 1), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.tier_id).toBe('gold');
    expect(result.current.data?.rank_in_tier).toBe(12);
    expect(result.current.data?.tier_population).toBe(487);
    expect(mockRpc).toHaveBeenCalledWith('get_user_tier_position', {
      p_user_id: 'user-1',
      p_season_id: 1,
    });
  });

  it('passes null season_id when seasonId is undefined', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    renderHook(() => useTierPosition('user-1'), { wrapper });
    await waitFor(() => expect(mockRpc).toHaveBeenCalled());
    expect(mockRpc).toHaveBeenCalledWith('get_user_tier_position', {
      p_user_id: 'user-1',
      p_season_id: null,
    });
  });

  it('is disabled when userId is falsy', () => {
    const { result } = renderHook(() => useTierPosition(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('returns undefined data on RPC error and does not throw', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('boom') });
    const { result } = renderHook(() => useTierPosition('user-1'), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
