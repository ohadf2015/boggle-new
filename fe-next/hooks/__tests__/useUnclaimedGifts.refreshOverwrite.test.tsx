/**
 * Bug Test: refreshGifts() overwrites local claimed state
 *
 * Root cause: After calling claimGift(), the handleClaimGift function
 * in Header.tsx immediately calls refreshGifts() which fetches from API
 * and can overwrite the local claimed:true state if API hasn't processed yet.
 *
 * This test verifies that claiming a gift maintains claimed:true state
 * even if refresh is called after.
 */

import { vi } from 'vitest';
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUnclaimedGifts } from '../useUnclaimedGifts';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}


// Mock useAuth
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
  }),
}));

describe('useUnclaimedGifts - Refresh Overwrite Bug', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should NOT reset claimed status when refresh is called after claim', async () => {
    const mockGift = {
      id: 'gift-1',
      title: 'Test Gift',
      message: 'Test message',
      template_type: 'top_player',
      xp_amount: 100,
      coin_amount: 50,
      claimed: false,
      claimed_at: null,
      created_at: new Date().toISOString(),
    };

    // Initial fetch returns unclaimed gift
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, count: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, gifts: [mockGift] }),
      });

    const { result } = renderHook(() => useUnclaimedGifts(), { wrapper: createWrapper() });

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.gifts.length).toBeGreaterThan(0);
    });

    // Verify gift is unclaimed initially
    expect(result.current.gifts[0].claimed).toBe(false);
    expect(result.current.unclaimedCount).toBe(1);

    // Mock claim API call
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, xpAwarded: 100, coinsAwarded: 50 }),
    });

    // Claim the gift
    await act(async () => {
      await result.current.claimGift('gift-1');
    });

    // After claim, gift should be marked as claimed locally
    expect(result.current.gifts[0].claimed).toBe(true);
    expect(result.current.unclaimedCount).toBe(0);

    // BUG SCENARIO: API hasn't processed claim yet (eventual consistency)
    // refresh() fetches from API which still shows claimed: false
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, gifts: [{ ...mockGift, claimed: false }] }),
    });

    // Call refresh
    await act(async () => {
      await result.current.refresh();
    });

    // BUG: If refresh overwrites local state, this will fail
    // EXPECTED: claimed status should remain true (local state should be preserved)
    // ACTUAL (with bug): claimed becomes false again
    expect(result.current.gifts[0].claimed).toBe(true);
    expect(result.current.unclaimedCount).toBe(0);
  });

  it('should maintain local claimed state during concurrent refresh operations', async () => {
    const mockGifts = [
      {
        id: 'gift-1',
        title: 'Gift 1',
        message: 'Message 1',
        template_type: 'top_player',
        xp_amount: 100,
        coin_amount: 50,
        claimed: false,
        claimed_at: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 'gift-2',
        title: 'Gift 2',
        message: 'Message 2',
        template_type: 'thank_you',
        xp_amount: 200,
        coin_amount: 100,
        claimed: false,
        claimed_at: null,
        created_at: new Date().toISOString(),
      },
    ];

    // Initial fetch
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, count: 2 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, gifts: mockGifts }),
      });

    const { result } = renderHook(() => useUnclaimedGifts(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.gifts.length).toBe(2);
    });

    // Mock claim for gift-1
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, xpAwarded: 100, coinsAwarded: 50 }),
    });

    // Claim gift-1
    await act(async () => {
      await result.current.claimGift('gift-1');
    });

    // Verify only gift-1 is claimed
    expect(result.current.gifts.find(g => g.id === 'gift-1')?.claimed).toBe(true);
    expect(result.current.gifts.find(g => g.id === 'gift-2')?.claimed).toBe(false);
    expect(result.current.unclaimedCount).toBe(1);

    // Refresh returns stale data (neither gift claimed)
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, gifts: mockGifts }), // Both unclaimed
    });

    await act(async () => {
      await result.current.refresh();
    });

    // BUG: gift-1 should remain claimed
    expect(result.current.gifts.find(g => g.id === 'gift-1')?.claimed).toBe(true);
    expect(result.current.unclaimedCount).toBe(1);
  });
});
