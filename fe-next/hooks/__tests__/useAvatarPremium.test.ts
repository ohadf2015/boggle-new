import { vi } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
const { mockSpendCoins, mockRefreshCoins } = vi.hoisted(() => {
  const mockSpendCoins = vi.fn().mockResolvedValue(true);
  const mockRefreshCoins = vi.fn().mockResolvedValue(100);
  return { mockSpendCoins, mockRefreshCoins };
});
const mockCoins = 500;

vi.mock('@/contexts/CoinContext', () => ({
  useCoinsFromContext: () => ({
    coins: mockCoins,
    spendCoins: mockSpendCoins,
    refreshCoins: mockRefreshCoins,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
    isAuthenticated: true,
  }),
}));


import { useAvatarPremium } from '../useAvatarPremium';

let queryClient: QueryClient;
let wrapper: ({ children }: { children: React.ReactNode }) => React.ReactElement;

// Provide real localStorage backend
const localStore: Record<string, string> = {};

describe('useAvatarPremium', () => {
  beforeEach(() => {
    for (const k of Object.keys(localStore)) delete localStore[k];
    (localStorage.getItem as any).mockImplementation((key: string) => localStore[key] ?? null);
    (localStorage.setItem as any).mockImplementation((key: string, val: string) => { localStore[key] = val; });
    (localStorage.removeItem as any).mockImplementation((key: string) => { delete localStore[key]; });
    (localStorage.clear as any).mockImplementation(() => { for (const k of Object.keys(localStore)) delete localStore[k]; });
  });

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
    vi.clearAllMocks();
    localStorage.clear();
    mockRefreshCoins.mockResolvedValue(100);
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, gold: 400, premiumAvatarParts: ['eyes:laser'] }),
    });
  });

  describe('isPartUnlocked', () => {
    test('returns false for locked premium parts', () => {
      const { result } = renderHook(() => useAvatarPremium(), { wrapper });
      expect(result.current.isPartUnlocked('eyes', 'laser')).toBe(false);
    });

    test('returns true for free (non-premium) parts', () => {
      const { result } = renderHook(() => useAvatarPremium(), { wrapper });
      expect(result.current.isPartUnlocked('eyes', 'round')).toBe(true);
    });
  });

  describe('temporary unlocks (ad-based)', () => {
    test('unlockTemporarily stores with 24h expiry', () => {
      const { result } = renderHook(() => useAvatarPremium(), { wrapper });
      act(() => {
        result.current.unlockTemporarily('eyes', 'laser');
      });
      expect(result.current.isPartUnlocked('eyes', 'laser')).toBe(true);
    });

    test('expired temporary unlocks are not valid', () => {
      const expired = Date.now() - 25 * 60 * 60 * 1000;
      localStorage.setItem('lexiclash_temp_premium', JSON.stringify({ 'eyes:laser': expired }));

      const { result } = renderHook(() => useAvatarPremium(), { wrapper });
      expect(result.current.isPartUnlocked('eyes', 'laser')).toBe(false);
    });

    test('non-expired temporary unlocks are valid', () => {
      const future = Date.now() + 12 * 60 * 60 * 1000;
      localStorage.setItem('lexiclash_temp_premium', JSON.stringify({ 'eyes:laser': future }));

      const { result } = renderHook(() => useAvatarPremium(), { wrapper });
      expect(result.current.isPartUnlocked('eyes', 'laser')).toBe(true);
    });
  });

  describe('permanent unlocks (gold purchase)', () => {
    test('purchaseWithGold calls API and updates state', async () => {
      const { result } = renderHook(() => useAvatarPremium(), { wrapper });

      // Flush mount effect
      await waitFor(() => {
        expect((global.fetch as any).mock.calls.length).toBeGreaterThanOrEqual(1);
      });

      const successPromise = result.current.purchaseWithGold('eyes', 'laser');
      const success = await successPromise;

      expect(success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/avatar/purchase-part', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ category: 'eyes', partId: 'laser' }),
      }));
    });

    test('purchaseWithGold returns false on API failure', async () => {
      // Default fetch mock (set in beforeEach) handles mount effect.
      // Override for the purchase call only.
      const { result } = renderHook(() => useAvatarPremium(), { wrapper });

      // Flush mount effect
      await waitFor(() => {
        expect((global.fetch as any).mock.calls.length).toBeGreaterThanOrEqual(1);
      });

      // Now override fetch to return failure for the purchase call
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Cannot afford' }),
      });

      const success = await result.current.purchaseWithGold('eyes', 'laser');

      expect(success).toBe(false);
    });
  });

  describe('isPurchasing', () => {
    test('is false initially', () => {
      const { result } = renderHook(() => useAvatarPremium(), { wrapper });
      expect(result.current.isPurchasing).toBe(false);
    });
  });
});
