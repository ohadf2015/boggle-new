import { vi } from 'vitest';
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/utils/authFetch', () => ({ getWithAuth: vi.fn(), fetchWithAuth: vi.fn() }));
vi.mock('@/lib/avatar/revealTrigger', () => ({ publishLevelUp: vi.fn() }));
import { getWithAuth, fetchWithAuth } from '@/utils/authFetch';
import { useUnclaimedGifts } from '../useUnclaimedGifts';

const gift = (id: string) => ({ id, title: id, message: '', template_type: null, xp_amount: 1, coin_amount: 1, claimed: false, claimed_at: null, created_at: '2026-01-01T00:00:00Z' });
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

describe('useUnclaimedGifts: a gift that arrives after the list already loaded', () => {
  it('shows up once the server count rises, even after the last gift was claimed', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(QueryClientProvider, { client }, children);
    vi.mocked(getWithAuth).mockResolvedValue(ok({ count: 1 }) as never);
    vi.mocked(fetchWithAuth)
      .mockResolvedValueOnce(ok({ gifts: [gift('g1')] }) as never)
      .mockResolvedValueOnce(ok({ success: true, xpAwarded: 1, coinsAwarded: 1 }) as never)
      .mockResolvedValueOnce(ok({ gifts: [gift('g2')] }) as never);

    const { result } = renderHook(() => useUnclaimedGifts(), { wrapper });
    await waitFor(() => expect(result.current.gifts.map(g => g.id)).toEqual(['g1']));

    await act(async () => { await result.current.claimGift('g1'); });
    expect(result.current.unclaimedCount).toBe(0);

    // periodic count refetch: first 0 (the claim), later 1 (a new gift)
    act(() => { client.setQueryData(queryKeys.gifts.unclaimedCount(), { count: 0 }); });
    act(() => { client.setQueryData(queryKeys.gifts.unclaimedCount(), { count: 1 }); });
    await waitFor(() => expect(result.current.unclaimedCount).toBe(1));
    await waitFor(() => expect(result.current.gifts.map(g => g.id)).toEqual(['g2']));
  });
});
