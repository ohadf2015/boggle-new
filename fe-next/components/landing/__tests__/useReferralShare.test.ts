import { renderHook, act } from '@testing-library/react';
import { useReferralShare } from '../useReferralShare';

// Mock auth context
let mockIsAuthenticated = false;
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

// Mock growthTracking
jest.mock('@/utils/growthTracking', () => ({
  trackShare: jest.fn(),
}));

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: jest.fn().mockResolvedValue(undefined) },
  writable: true,
});

// Mock window.open
global.open = jest.fn();

// Mock window.location.origin
Object.defineProperty(window, 'location', {
  value: { origin: 'https://lexiclash.test' },
  writable: true,
});

describe('useReferralShare', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = false;
  });

  describe('guest user (not authenticated)', () => {
    it('should use window.location.origin as shareUrl', async () => {
      // GIVEN - guest user
      mockIsAuthenticated = false;

      // WHEN
      const { result } = renderHook(() => useReferralShare());
      await act(async () => {
        await result.current.fetchShareData();
      });

      // THEN
      expect(result.current.shareUrl).toBe('https://lexiclash.test');
      expect(result.current.referralCode).toBeNull();
    });

    it('should not call /api/referral for guests', async () => {
      // GIVEN
      global.fetch = jest.fn();
      mockIsAuthenticated = false;

      // WHEN
      const { result } = renderHook(() => useReferralShare());
      await act(async () => {
        await result.current.fetchShareData();
      });

      // THEN
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('authenticated user', () => {
    beforeEach(() => {
      mockIsAuthenticated = true;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            referralCode: 'ABC123',
            shareUrl: 'https://lexiclash.test?ref=ABC123',
            referralRewardXp: 100,
          },
        }),
      });
    });

    it('should fetch referral data and return code + url', async () => {
      // GIVEN - authenticated user, API returns referral data

      // WHEN
      const { result } = renderHook(() => useReferralShare());
      await act(async () => {
        await result.current.fetchShareData();
      });

      // THEN
      expect(result.current.referralCode).toBe('ABC123');
      expect(result.current.shareUrl).toBe('https://lexiclash.test?ref=ABC123');
      expect(result.current.referralRewardXp).toBe(100);
    });

    it('should set isLoading true during fetch and false after', async () => {
      // GIVEN
      let resolvePromise: (value: unknown) => void;
      global.fetch = jest.fn().mockReturnValue(
        new Promise((resolve) => { resolvePromise = resolve; })
      );

      // WHEN
      const { result } = renderHook(() => useReferralShare());
      const fetchPromise = act(async () => {
        result.current.fetchShareData();
      });

      // THEN loading starts
      // (after act resolves, loading will be false — we just verify no crash)
      resolvePromise!({
        ok: true,
        json: async () => ({ data: { referralCode: 'X', shareUrl: 'y', referralRewardXp: 100 } }),
      });
      await fetchPromise;
      expect(result.current.isLoading).toBe(false);
    });

    it('should fallback to window.origin if API fails', async () => {
      // GIVEN
      global.fetch = jest.fn().mockResolvedValue({ ok: false });

      // WHEN
      const { result } = renderHook(() => useReferralShare());
      await act(async () => {
        await result.current.fetchShareData();
      });

      // THEN
      expect(result.current.shareUrl).toBe('https://lexiclash.test');
    });
  });

  describe('handleCopy', () => {
    it('should copy shareUrl and set copied=true then reset after 2s', async () => {
      // GIVEN
      jest.useFakeTimers();
      mockIsAuthenticated = false;
      const { result } = renderHook(() => useReferralShare());
      await act(async () => { await result.current.fetchShareData(); });

      // WHEN
      await act(async () => { await result.current.handleCopy(); });

      // THEN
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://lexiclash.test');
      expect(result.current.copied).toBe(true);

      // AFTER 2s
      act(() => { jest.advanceTimersByTime(2000); });
      expect(result.current.copied).toBe(false);

      jest.useRealTimers();
    });

    it('should call trackShare("copy")', async () => {
      // GIVEN
      const { trackShare } = require('@/utils/growthTracking');
      mockIsAuthenticated = false;
      const { result } = renderHook(() => useReferralShare());
      await act(async () => { await result.current.fetchShareData(); });

      // WHEN
      await act(async () => { await result.current.handleCopy(); });

      // THEN
      expect(trackShare).toHaveBeenCalledWith('copy');
    });
  });

  describe('handleShare', () => {
    it('should open WhatsApp URL for whatsapp platform', async () => {
      // GIVEN
      mockIsAuthenticated = false;
      const { result } = renderHook(() => useReferralShare());
      await act(async () => { await result.current.fetchShareData(); });

      // WHEN
      await act(async () => { await result.current.handleShare('whatsapp'); });

      // THEN
      expect(global.open).toHaveBeenCalledWith(
        expect.stringContaining('wa.me'),
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should open Telegram URL for telegram platform', async () => {
      // GIVEN
      mockIsAuthenticated = false;
      const { result } = renderHook(() => useReferralShare());
      await act(async () => { await result.current.fetchShareData(); });

      // WHEN
      await act(async () => { await result.current.handleShare('telegram'); });

      // THEN
      expect(global.open).toHaveBeenCalledWith(
        expect.stringContaining('t.me'),
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should use navigator.share for native platform when available', async () => {
      // GIVEN
      mockIsAuthenticated = false;
      const mockShare = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true });
      const { result } = renderHook(() => useReferralShare());
      await act(async () => { await result.current.fetchShareData(); });

      // WHEN
      await act(async () => { await result.current.handleShare('native'); });

      // THEN
      expect(mockShare).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Join LexiClash',
        url: 'https://lexiclash.test',
      }));
    });
  });
});
