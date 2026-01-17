/**
 * useUnclaimedGifts Hook Tests
 *
 * Tests for the hook that manages unclaimed admin gifts
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock AuthContext
const mockIsAuthenticated = jest.fn(() => true);

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated(),
  }),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
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
    jest.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(true);
    mockLocalStorage.getItem.mockReturnValue(null);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('returns initial state with 0 count', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useUnclaimedGifts());

      expect(result.current.unclaimedCount).toBe(0);
      expect(result.current.gifts).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('does not fetch when not authenticated', async () => {
      mockIsAuthenticated.mockReturnValue(false);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCountResponse),
      });

      const { result } = renderHook(() => useUnclaimedGifts());

      await waitFor(() => {
        expect(result.current.unclaimedCount).toBe(0);
      });

      // Should not have made any fetch calls
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Fetching Count', () => {
    it('fetches unclaimed count on mount', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCountResponse),
      });

      const { result } = renderHook(() => useUnclaimedGifts());

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

      const { result } = renderHook(() => useUnclaimedGifts());

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

      const { result } = renderHook(() => useUnclaimedGifts());

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
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCountResponse),
      });

      const { result } = renderHook(() => useUnclaimedGifts());

      // Should immediately use cached value
      expect(result.current.unclaimedCount).toBe(3);

      // Eventually updates with fresh data
      await waitFor(() => {
        expect(result.current.unclaimedCount).toBe(1);
      });
    });

    it('ignores expired cache', async () => {
      const expiredCache = JSON.stringify({
        count: 3,
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
      });
      mockLocalStorage.getItem.mockReturnValue(expiredCache);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCountResponse),
      });

      const { result } = renderHook(() => useUnclaimedGifts());

      // Should not use expired cache
      expect(result.current.unclaimedCount).toBe(0);

      await waitFor(() => {
        expect(result.current.unclaimedCount).toBe(1);
      });
    });

    it('saves count to cache after fetch', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCountResponse),
      });

      renderHook(() => useUnclaimedGifts());

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalled();
      });

      const setItemCall = mockLocalStorage.setItem.mock.calls[0];
      expect(setItemCall[0]).toBe('lexiclash_unclaimed_gifts_count');
      const savedData = JSON.parse(setItemCall[1]);
      expect(savedData.count).toBe(1);
    });
  });

  describe('Refresh', () => {
    it('clears cache and refetches on refresh', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockGiftsResponse),
      });

      const { result } = renderHook(() => useUnclaimedGifts());

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
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCountResponse),
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

      const { result } = renderHook(() => useUnclaimedGifts());

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
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCountResponse),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Gift already claimed' }),
        });

      const { result } = renderHook(() => useUnclaimedGifts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.claimGift('gift-1')).rejects.toThrow(
        'Gift already claimed'
      );
    });

    it('decrements unclaimed count after successful claim', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ count: 2 }),
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

      const { result } = renderHook(() => useUnclaimedGifts());

      await waitFor(() => {
        expect(result.current.unclaimedCount).toBe(2);
      });

      await act(async () => {
        await result.current.claimGift('gift-1');
      });

      expect(result.current.unclaimedCount).toBe(1);
    });
  });

  describe('Polling', () => {
    it('polls for new gifts every 5 minutes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCountResponse),
      });

      renderHook(() => useUnclaimedGifts());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Advance timer by 5 minutes
      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it('stops polling when not authenticated', async () => {
      mockIsAuthenticated.mockReturnValue(false);

      renderHook(() => useUnclaimedGifts());

      // Advance timer by 10 minutes
      act(() => {
        jest.advanceTimersByTime(10 * 60 * 1000);
      });

      // Should not have made any fetch calls
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
