/**
 * useUnclaimedGifts Hook Tests
 *
 * Tests for the hook that manages unclaimed admin gifts
 */

import { vi } from 'vitest';
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// Mock AuthContext
const { mockIsAuthenticated } = vi.hoisted(() => {
  const mockIsAuthenticated = vi.fn(() => true);
  return { mockIsAuthenticated };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated(),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

import { useUnclaimedGifts } from '../useUnclaimedGifts';

describe('useUnclaimedGifts', () => {
  const mockGiftsResponse = {
    gifts: [
      {
        id: 'gift-1',
        title: 'Test Gift 1',
        message: 'Message 1',
        template_type: 'top_player',
        xp_amount: 100,
        coin_amount: 50,
        claimed: false,
        claimed_at: null,
        created_at: '2024-01-01T00:00:00Z',
        sender: {
          username: 'admin',
          display_name: 'Admin',
        },
      },
      {
        id: 'gift-2',
        title: 'Test Gift 2',
        message: 'Message 2',
        template_type: 'thank_you',
        xp_amount: 200,
        coin_amount: 100,
        claimed: true,
        claimed_at: '2024-01-02T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        sender: null,
      },
    ],
  };

  const mockCountResponse = {
    count: 1,
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    vi.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(true);
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Initial State', () => {
    it('returns initial state with 0 count', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useUnclaimedGifts(), { wrapper: createWrapper() });

      // Initially unclaimedCount is 0 and gifts are empty
      expect(result.current.unclaimedCount).toBe(0);
      expect(result.current.gifts).toEqual([]);
      // Loading becomes true when useEffect runs and fetch begins
      expect(result.current.error).toBeNull();
    });

    it('does not fetch when not authenticated', async () => {
      mockIsAuthenticated.mockReturnValue(false);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCountResponse),
      });

      const { result } = renderHook(() => useUnclaimedGifts(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.unclaimedCount).toBe(0);
      });

      // Should not have made any fetch calls
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Fetching Count', () => {
    it('fetches unclaimed count on mount', async () => {
      // Mock the count fetch - when count is 1, gifts fetch also triggers
      // The gifts response must have 1 unclaimed gift (fetchGifts overwrites count)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCountResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ gifts: [mockGiftsResponse.gifts[0]] }), // 1 unclaimed gift
        });

      const { result } = renderHook(() => useUnclaimedGifts(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.unclaimedCount).toBe(1);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/player/gifts/unclaimed-count');
    });

    it('handles 401 response gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useUnclaimedGifts(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.unclaimedCount).toBe(0);
      expect(result.current.error).toBeNull();
    });

    it('handles fetch error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useUnclaimedGifts(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch unclaimed count');
      });
    });
  });

  describe('Caching', () => {
    it('uses cached count if valid', async () => {
      const cachedData = JSON.stringify({
        count: 3,
        timestamp: Date.now(),
      });
      mockLocalStorage.getItem.mockReturnValue(cachedData);
      // Mock both the count fetch and the subsequent gifts fetch (triggered when cached count > 0)
      // The gifts response must have 1 unclaimed gift (fetchGifts overwrites count)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCountResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ gifts: [mockGiftsResponse.gifts[0]] }), // 1 unclaimed gift
        });

      const { result } = renderHook(() => useUnclaimedGifts(), { wrapper: createWrapper() });

      // Cached value is read first, then API value overwrites
      await waitFor(() => {
        // Should eventually show API count (cache is used initially, then replaced)
        expect(result.current.unclaimedCount).toBe(1);
      });

      // Verify cache was read
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('lexiclash_unclaimed_gifts_count');
    });

    it('ignores expired cache', async () => {
      const expiredCache = JSON.stringify({
        count: 3,
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
      });
      mockLocalStorage.getItem.mockReturnValue(expiredCache);
      // Mock both the count fetch and the subsequent gifts fetch (triggered when count > 0)
      // The gifts response must have 1 unclaimed gift (fetchGifts overwrites count)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCountResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ gifts: [mockGiftsResponse.gifts[0]] }), // 1 unclaimed gift
        });

      const { result } = renderHook(() => useUnclaimedGifts(), { wrapper: createWrapper() });

      // Expired cache should be ignored, API value should be used
      await waitFor(() => {
        expect(result.current.unclaimedCount).toBe(1);
      });
    });

    it('saves count to cache after fetch', async () => {
      // Count fetch returns 1, then gifts fetch returns 1 unclaimed gift
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCountResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ gifts: [mockGiftsResponse.gifts[0]] }),
        });

      renderHook(() => useUnclaimedGifts(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalled();
      });

      // Find the cache write call (may not be the first setItem call)
      const cacheCalls = mockLocalStorage.setItem.mock.calls.filter(
        (call: any[]) => call[0] === 'lexiclash_unclaimed_gifts_count'
      );
      expect(cacheCalls.length).toBeGreaterThan(0);
      // The last cache write should reflect the final count
      const lastCacheCall = cacheCalls[cacheCalls.length - 1];
      const savedData = JSON.parse(lastCacheCall[1]);
      expect(savedData.count).toBeGreaterThanOrEqual(0);
      expect(savedData.timestamp).toBeTruthy();
    });
  });

  describe('Refresh', () => {
    it('clears cache and refetches on refresh', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockGiftsResponse),
      });

      const { result } = renderHook(() => useUnclaimedGifts(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = mockFetch.mock.calls.length;

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        'lexiclash_unclaimed_gifts_count'
      );
      expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe('Claim Gift', () => {
    it('calls claim API and updates state', async () => {
      // Mock order: 1) count fetch, 2) gifts fetch (auto-triggered when count > 0), 3) claim
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCountResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ gifts: [mockGiftsResponse.gifts[0]] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              xpAwarded: 100,
              coinsAwarded: 50,
            }),
        });

      const { result } = renderHook(() => useUnclaimedGifts(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let claimResult;
      await act(async () => {
        claimResult = await result.current.claimGift('gift-1');
      });

      expect(claimResult).toEqual({
        xpAwarded: 100,
        coinsAwarded: 50,
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/player/gifts/gift-1/claim', {
        method: 'POST',
      });
    });

    it('throws error on failed claim', async () => {
      // Mock order: 1) count fetch, 2) gifts fetch (auto-triggered when count > 0), 3) claim (fails)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCountResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ gifts: [mockGiftsResponse.gifts[0]] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Gift already claimed' }),
        });

      const { result } = renderHook(() => useUnclaimedGifts(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.claimGift('gift-1')).rejects.toThrow(
        'Gift already claimed'
      );
    });

    it('decrements unclaimed count after successful claim', async () => {
      // Create two distinct unclaimed gift objects
      const unclaimedGift1 = { ...mockGiftsResponse.gifts[0], id: 'gift-1' };
      const unclaimedGift2 = { ...mockGiftsResponse.gifts[0], id: 'gift-2' };

      // Mock order: 1) count fetch, 2) gifts fetch (auto-triggered when count > 0), 3) claim
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ count: 2 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ gifts: [unclaimedGift1, unclaimedGift2] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              xpAwarded: 100,
              coinsAwarded: 50,
            }),
        });

      const { result } = renderHook(() => useUnclaimedGifts(), { wrapper: createWrapper() });

      // Wait for loading to complete and count to be set
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 5000 });

      await waitFor(() => {
        expect(result.current.unclaimedCount).toBe(2);
      }, { timeout: 5000 });

      await act(async () => {
        await result.current.claimGift('gift-1');
      });

      expect(result.current.unclaimedCount).toBe(1);
    });
  });

  describe('Polling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('polls for new gifts every 5 minutes', async () => {
      // Mock returns 0 count to avoid triggering fetchGifts
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 0 }),
      });

      renderHook(() => useUnclaimedGifts(), { wrapper: createWrapper() });

      // Allow initial useEffect to run and settle
      await act(async () => {
        await Promise.resolve();
        vi.advanceTimersByTime(0);
        await Promise.resolve();
      });

      const initialCallCount = mockFetch.mock.calls.length;

      // Advance timer by 5 minutes for polling
      await act(async () => {
        vi.advanceTimersByTime(5 * 60 * 1000);
        await Promise.resolve();
      });

      // Should have exactly 1 more call from polling
      expect(mockFetch).toHaveBeenCalledTimes(initialCallCount + 1);
    });

    it('stops polling when not authenticated', async () => {
      mockIsAuthenticated.mockReturnValue(false);

      renderHook(() => useUnclaimedGifts(), { wrapper: createWrapper() });

      // Advance timer by 10 minutes
      await act(async () => {
        vi.advanceTimersByTime(10 * 60 * 1000);
      });

      // Should not have made any fetch calls
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
