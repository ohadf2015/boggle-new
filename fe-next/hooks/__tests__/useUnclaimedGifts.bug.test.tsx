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

// Mock fetch
global.fetch = vi.fn();

// Mock useAuth
const { mockIsAuthenticated } = vi.hoisted(() => {
  const mockIsAuthenticated = vi.fn(() => true);
  return { mockIsAuthenticated };
});
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated(),
  }),
}));

describe('useUnclaimedGifts - Gift Modal Bug Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockIsAuthenticated.mockReturnValue(true);
  });

  describe('Bug: Gift modal not showing when clicking from mobile menu', () => {
    it('should fetch full gifts list when unclaimed count > 0', async () => {
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

      // First call: unclaimed-count returns 1
      // Second call: gifts returns the full list
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

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have unclaimed count
      expect(result.current.unclaimedCount).toBe(1);

      // CRITICAL: gifts array should NOT be empty when there are unclaimed gifts
      // This is the bug - gifts array is empty because fetchGifts() was never called
      await waitFor(() => {
        expect(result.current.gifts.length).toBeGreaterThan(0);
      }, { timeout: 5000 });

      // Verify the gift data is correct
      expect(result.current.gifts[0].id).toBe('gift-1');
    });

    it('should not fetch gifts when unclaimed count is 0', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, count: 0 }),
      });

      const { result } = renderHook(() => useUnclaimedGifts(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.unclaimedCount).toBe(0);
      expect(result.current.gifts).toHaveLength(0);

      // Should only have called unclaimed-count, not gifts
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith('/api/player/gifts/unclaimed-count');
    });

    it('should have gift data available before handleOpenGiftModal is called', async () => {
      const mockGift = {
        id: 'gift-123',
        title: 'Admin Gift',
        message: 'You earned a reward!',
        template_type: 'thank_you',
        xp_amount: 200,
        coin_amount: 100,
        claimed: false,
        claimed_at: null,
        created_at: new Date().toISOString(),
      };

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

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Simulate what handleOpenGiftModal does in Header.tsx:
      // const unclaimedGift = gifts.find(g => !g.claimed);
      await waitFor(() => {
        const unclaimedGift = result.current.gifts.find(g => !g.claimed);
        expect(unclaimedGift).toBeDefined();
        expect(unclaimedGift?.id).toBe('gift-123');
      }, { timeout: 5000 });
    });
  });
});
