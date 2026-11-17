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

const gift = (id: string, claimed = false) => ({
  id,
  title: id,
  message: '',
  template_type: null,
  xp_amount: 1,
  coin_amount: 1,
  claimed,
  claimed_at: claimed ? '2026-01-01T00:00:00Z' : null,
  created_at: '2026-01-01T00:00:00Z',
});
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

describe('useUnclaimedGifts: claimed gifts must not return to the badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('keeps the badge at the local count when a refresh returns a stale-high server count', async () => {
    const client = createClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    vi.mocked(getWithAuth).mockResolvedValue(ok({ count: 9 }) as never);
    vi.mocked(fetchWithAuth)
      .mockResolvedValueOnce(ok({ gifts: Array.from({ length: 9 }, (_, i) => gift(`g${i + 1}`)) }) as never)
      .mockResolvedValueOnce(ok({ success: true, xpAwarded: 1, coinsAwarded: 1 }) as never)
      // Stale list after claim: server still includes the claimed gift
      .mockResolvedValue(ok({ gifts: Array.from({ length: 9 }, (_, i) => gift(`g${i + 1}`)) }) as never);

    const { result } = renderHook(() => useUnclaimedGifts(), { wrapper });
    await waitFor(() => expect(result.current.unclaimedCount).toBe(9));

    await act(async () => {
      await result.current.claimGift('g1');
    });
    expect(result.current.unclaimedCount).toBe(8);

    // Count endpoint (or React Query cache) still says 9 — this used to overwrite
    // the local 8 and put the claimed gift back on the "gifts waiting" badge.
    act(() => {
      client.setQueryData(queryKeys.gifts.unclaimedCount(), { count: 9 });
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.unclaimedCount).toBe(8);
    expect(result.current.gifts.find((g) => g.id === 'g1')?.claimed).toBe(true);
  });

  it('still surfaces a genuinely new gift after the last one was claimed', async () => {
    const client = createClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    vi.mocked(getWithAuth).mockResolvedValue(ok({ count: 1 }) as never);
    vi.mocked(fetchWithAuth)
      .mockResolvedValueOnce(ok({ gifts: [gift('g1')] }) as never)
      .mockResolvedValueOnce(ok({ success: true, xpAwarded: 1, coinsAwarded: 1 }) as never)
      .mockResolvedValueOnce(ok({ gifts: [gift('g2')] }) as never);

    const { result } = renderHook(() => useUnclaimedGifts(), { wrapper });
    await waitFor(() => expect(result.current.gifts.map((g) => g.id)).toEqual(['g1']));

    await act(async () => {
      await result.current.claimGift('g1');
    });
    expect(result.current.unclaimedCount).toBe(0);

    // Count query still held {count:1} from the first fetch; bump it down first
    // so the later 1 is a real change and the list refetch can run.
    act(() => {
      client.setQueryData(queryKeys.gifts.unclaimedCount(), { count: 0 });
    });
    act(() => {
      client.setQueryData(queryKeys.gifts.unclaimedCount(), { count: 1 });
    });

    await waitFor(() => expect(result.current.unclaimedCount).toBe(1));
    await waitFor(() => expect(result.current.gifts.map((g) => g.id)).toEqual(['g2']));
  });
});
