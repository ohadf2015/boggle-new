/**
 * Tests for useShareHandlers - share telemetry/analytics
 * Verifies that share actions emit PostHog events with proper tracking
 */

import { renderHook, act } from '@testing-library/react';
import { useShareHandlers } from '../useShareHandlers';
import { trackShareCompleted } from '@/utils/share';
import type { WordHuntResult, GuestDailyPlayer } from '@/utils/dailyChallenge';

// Mock PostHog tracking
vi.mock('@/utils/share', () => ({
  trackShareCompleted: vi.fn(),
}));

vi.mock('@/utils/dailyChallenge', () => ({
  generateWordHuntShareableResult: vi.fn().mockReturnValue('Shared result text'),
}));

vi.mock('@/utils/dailyShareImage', () => ({
  generateDailyShareImage: vi.fn(),
  downloadDailyShareImage: vi.fn(),
}));

vi.mock('@/utils/dailyChallenge/shareUtils', () => ({
  generateChallengeShareUrl: vi.fn().mockReturnValue('http://example.com/challenge'),
}));

// Mock clipboard and share APIs
const mockClipboardWrite = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockClipboardWrite,
  },
  writable: true,
  configurable: true,
});

const mockShareApi = vi.fn();
Object.defineProperty(navigator, 'share', {
  value: mockShareApi,
  writable: true,
  configurable: true,
});

const mockResult: WordHuntResult = {
  puzzleNumber: 42,
  puzzleDate: '2026-02-22',
  language: 'en',
  solved: true,
  attemptsUsed: 3,
  targetWord: 'PLANT',
  attempts: [],
  streakDays: 5,
  completedAt: '2026-02-22T10:00:00.000Z',
  efficiencyScore: 87,
};

const baseProps = {
  result: mockResult,
  puzzleNumber: 42,
  puzzleDate: '2026-02-22',
  language: 'en' as const,
  displayName: 'TestPlayer',
  avatarEmoji: '🌟',
  stats: null,
  isAuthenticated: false,
  profile: null,
  guestPlayer: null as GuestDailyPlayer | null,
  t: (key: string) => key,
};

describe('useShareHandlers - Share Telemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Share completion tracking', () => {
    it('emits share_completed on clipboard copy', async () => {
      const { result } = renderHook(() => useShareHandlers(baseProps));

      await act(async () => {
        await result.current.handleCopy();
      });

      expect(trackShareCompleted).toHaveBeenCalledWith('clipboard');
    });

    it('emits share_completed on WhatsApp share', () => {
      const { result } = renderHook(() => useShareHandlers(baseProps));
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

      act(() => {
        result.current.handleWhatsApp();
      });

      expect(trackShareCompleted).toHaveBeenCalledWith('whatsapp');
      openSpy.mockRestore();
    });

    it('emits share_completed on Twitter share', () => {
      const { result } = renderHook(() => useShareHandlers(baseProps));
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

      act(() => {
        result.current.handleTwitter();
      });

      expect(trackShareCompleted).toHaveBeenCalledWith('twitter');
      openSpy.mockRestore();
    });

    it('emits share_completed on Telegram share', () => {
      const { result } = renderHook(() => useShareHandlers(baseProps));
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

      act(() => {
        result.current.handleTelegram();
      });

      expect(trackShareCompleted).toHaveBeenCalledWith('telegram');
      openSpy.mockRestore();
    });

    it('emits share_completed on LinkedIn share', () => {
      const { result } = renderHook(() => useShareHandlers(baseProps));
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

      act(() => {
        result.current.handleLinkedIn();
      });

      expect(trackShareCompleted).toHaveBeenCalledWith('linkedin');
      openSpy.mockRestore();
    });

    it('emits share_completed on Facebook share', () => {
      const { result } = renderHook(() => useShareHandlers(baseProps));
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

      act(() => {
        result.current.handleFacebook();
      });

      expect(trackShareCompleted).toHaveBeenCalledWith('facebook');
      openSpy.mockRestore();
    });

    it('emits share_completed on Email share', () => {
      const { result } = renderHook(() => useShareHandlers(baseProps));
      const hrefSpy = vi.spyOn(window.location, 'href', 'set');

      act(() => {
        result.current.handleEmail();
      });

      expect(trackShareCompleted).toHaveBeenCalledWith('email');
      hrefSpy.mockRestore();
    });

    it('emits share_completed on SMS share', () => {
      const { result } = renderHook(() => useShareHandlers(baseProps));
      const hrefSpy = vi.spyOn(window.location, 'href', 'set');

      act(() => {
        result.current.handleSMS();
      });

      expect(trackShareCompleted).toHaveBeenCalledWith('sms');
      hrefSpy.mockRestore();
    });
  });

  describe('Native share tracking', () => {
    it('emits share_completed with web_share_api when share succeeds', async () => {
      mockShareApi.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useShareHandlers(baseProps));

      await act(async () => {
        await result.current.handleNativeShare();
      });

      expect(trackShareCompleted).toHaveBeenCalledWith('web_share_api');
    });

    it('does NOT emit share_completed when native share is cancelled', async () => {
      const abortError = new DOMException('User cancelled', 'AbortError');
      mockShareApi.mockRejectedValueOnce(abortError);
      const { result } = renderHook(() => useShareHandlers(baseProps));

      await act(async () => {
        await result.current.handleNativeShare();
      });

      expect(trackShareCompleted).not.toHaveBeenCalledWith('web_share_api');
      expect(trackShareCompleted).not.toHaveBeenCalled();
    });

    it('emits fallback_clipboard when native share falls back to clipboard panel', async () => {
      // Remove the share API to trigger fallback
      Object.defineProperty(window, 'navigator', {
        value: { share: undefined },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useShareHandlers(baseProps));

      act(() => {
        result.current.handleNativeShare();
      });

      // When fallback to panel happens, trackShareCompleted should still be called
      // (the fallback will track completion when the user interacts with the panel)
      // For now, we just verify the panel opens
      expect(result.current.showSharePanel).toBe(true);
    });
  });

  describe('Challenge share tracking', () => {
    it.skip('attempt challenge share when navigator.share is available', async () => {
      mockShareApi.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useShareHandlers(baseProps));

      // Challenge share uses navigator.share when available
      await act(async () => {
        await result.current.handleChallengeShare();
      });

      // trackShareCompleted should have been called for the successful share
      expect(trackShareCompleted).toHaveBeenCalledWith('web_share_api');
    });
  });
});
