import { renderHook, act, waitFor } from '@testing-library/react';

// Mock dependencies
const mockSpendCoins = jest.fn().mockResolvedValue(true);
const mockRefreshCoins = jest.fn().mockResolvedValue(100);
const mockCoins = 500;

jest.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    coins: mockCoins,
    spendCoins: mockSpendCoins,
    refreshCoins: mockRefreshCoins,
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
    isAuthenticated: true,
  }),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

import { useAvatarPremium } from '../useAvatarPremium';

describe('useAvatarPremium', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockRefreshCoins.mockResolvedValue(100);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, gold: 400, premiumAvatarParts: ['eyes:laser'] }),
    });
  });

  describe('isPartUnlocked', () => {
    test('returns false for locked premium parts', () => {
      const { result } = renderHook(() => useAvatarPremium());
      expect(result.current.isPartUnlocked('eyes', 'laser')).toBe(false);
    });

    test('returns true for free (non-premium) parts', () => {
      const { result } = renderHook(() => useAvatarPremium());
      expect(result.current.isPartUnlocked('eyes', 'round')).toBe(true);
    });
  });

  describe('temporary unlocks (ad-based)', () => {
    test('unlockTemporarily stores with 24h expiry', () => {
      const { result } = renderHook(() => useAvatarPremium());
      act(() => {
        result.current.unlockTemporarily('eyes', 'laser');
      });
      expect(result.current.isPartUnlocked('eyes', 'laser')).toBe(true);
    });

    test('expired temporary unlocks are not valid', () => {
      const expired = Date.now() - 25 * 60 * 60 * 1000;
      localStorage.setItem('lexiclash_temp_premium', JSON.stringify({ 'eyes:laser': expired }));

      const { result } = renderHook(() => useAvatarPremium());
      expect(result.current.isPartUnlocked('eyes', 'laser')).toBe(false);
    });

    test('non-expired temporary unlocks are valid', () => {
      const future = Date.now() + 12 * 60 * 60 * 1000;
      localStorage.setItem('lexiclash_temp_premium', JSON.stringify({ 'eyes:laser': future }));

      const { result } = renderHook(() => useAvatarPremium());
      expect(result.current.isPartUnlocked('eyes', 'laser')).toBe(true);
    });
  });

  describe('permanent unlocks (gold purchase)', () => {
    test('purchaseWithGold calls API and updates state', async () => {
      const { result } = renderHook(() => useAvatarPremium());

      // Flush mount effect
      await waitFor(() => {
        expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
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
      // First call is the useEffect mount fetch, second is the purchase
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ premiumAvatarParts: [] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Cannot afford' }),
        });

      const { result } = renderHook(() => useAvatarPremium());

      // Flush mount effect
      await waitFor(() => {
        expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
      });

      const success = await result.current.purchaseWithGold('eyes', 'laser');

      expect(success).toBe(false);
    });
  });

  describe('isPurchasing', () => {
    test('is false initially', () => {
      const { result } = renderHook(() => useAvatarPremium());
      expect(result.current.isPurchasing).toBe(false);
    });
  });
});
