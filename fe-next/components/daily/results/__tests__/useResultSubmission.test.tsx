/**
 * Tests for useResultSubmission hook
 *
 * Bug: The submission logic incorrectly requires guestFingerprint for ALL users.
 * Authenticated users have profile.id and should NOT need guestFingerprint.
 *
 * Root cause: Line `const canSubmit = ... && guestFingerprint && ...`
 * The `&& guestFingerprint` applies to ALL users, but authenticated users have profile.id
 * and should NOT need guestFingerprint.
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useResultSubmission } from '../useResultSubmission';
import type { WordHuntResult, GuestDailyPlayer } from '@/utils/dailyChallenge';

// Mock fetch globally
const mockFetch = vi.fn();

// Mock dailyChallenge utilities
vi.mock('@/utils/dailyChallenge', () => ({
  getTodaysWordHuntResult: vi.fn().mockReturnValue(null),
  markWordHuntResultSubmitted: vi.fn(),
}));

// Default: online + flag off (existing tests unaffected).
const mockUseNetworkState = vi.fn(() => ({ online: true, slow: false, type: 'wifi', rttMs: 0 }));
vi.mock('@/hooks/useNetworkState', () => ({
  useNetworkState: () => mockUseNetworkState(),
}));

const mockUseOfflineModeFlag = vi.fn(() => false);
vi.mock('@/hooks/useOfflineModeFlag', () => ({
  useOfflineModeFlag: () => mockUseOfflineModeFlag(),
}));

const mockEnqueueScore = vi.fn();
vi.mock('@/lib/offline/scoreQueue', () => ({
  enqueueScore: (...args: unknown[]) => mockEnqueueScore(...args),
}));

const mockGetOfflineStore = vi.fn();
vi.mock('@/lib/offline', () => ({
  getOfflineStore: () => mockGetOfflineStore(),
}));

describe('useResultSubmission', () => {
  const mockResult: WordHuntResult = {
    puzzleNumber: 100,
    puzzleDate: '2025-01-19',
    language: 'en',
    solved: true,
    attemptsUsed: 3,
    targetWord: 'TESTS',
    attempts: [
      {
        word: 'TEARS',
        feedback: [
          { letter: 'T', feedback: 'green', position: 0 },
          { letter: 'E', feedback: 'yellow', position: 1 },
          { letter: 'A', feedback: 'gray', position: 2 },
          { letter: 'R', feedback: 'gray', position: 3 },
          { letter: 'S', feedback: 'green', position: 4 },
        ],
        timestamp: Date.now(),
      },
      {
        word: 'TENTS',
        feedback: [
          { letter: 'T', feedback: 'green', position: 0 },
          { letter: 'E', feedback: 'green', position: 1 },
          { letter: 'N', feedback: 'gray', position: 2 },
          { letter: 'T', feedback: 'green', position: 3 },
          { letter: 'S', feedback: 'green', position: 4 },
        ],
        timestamp: Date.now(),
      },
      {
        word: 'TESTS',
        feedback: [
          { letter: 'T', feedback: 'green', position: 0 },
          { letter: 'E', feedback: 'green', position: 1 },
          { letter: 'S', feedback: 'green', position: 2 },
          { letter: 'T', feedback: 'green', position: 3 },
          { letter: 'S', feedback: 'green', position: 4 },
        ],
        timestamp: Date.now(),
      },
    ],
    wordsDiscovered: [],
    lifeRemaining: 50,
    clueTokensEarned: 0,
    clueTokensSpent: 0,
    hintsUnlocked: 0,
    efficiencyScore: 85,
    streakDays: 5,
    completedAt: new Date().toISOString(),
  };

  const mockProfile = {
    id: 'user-123-uuid',
    username: 'testuser',
    display_name: 'Test User',
    avatar_emoji: '🏆',
    avatar_color: '#FFD700',
    avatar_image: null,
  };

  const mockGuestPlayer: GuestDailyPlayer = {
    displayName: 'Guest Player',
    avatarEmoji: '🎯',
    avatarColor: '#6366f1',
  };

  const mockOnSubmitSuccess = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    vi.clearAllMocks();
    mockFetch.mockReset();

    // Default: successful API responses
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/geolocation') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ countryCode: 'US' }),
        });
      }
      if (url === '/api/daily-challenge/word-hunt/submit') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { id: 'test-id' } }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  describe('Authenticated user submission', () => {
    it('should submit score for authenticated user when guestFingerprint is NULL (BUG FIX)', async () => {
      // GIVEN: Authenticated user WITH profile, but guestFingerprint is NULL
      // This simulates the scenario where fingerprint never loads for authenticated users
      const props = {
        result: mockResult,
        puzzleNumber: 100,
        puzzleDate: '2025-01-19',
        language: 'en' as const,
        isNewCompletion: true,
        guestFingerprint: null, // KEY: This is null for authenticated users
        isAuthenticated: true,
        profile: mockProfile,
        guestPlayer: null,
        countryCodeReady: true,
        onSubmitSuccess: mockOnSubmitSuccess,
      };

      // WHEN: Rendering the hook
      renderHook(() => useResultSubmission(props));

      // THEN: Submission should happen with playerId (not guestFingerprint)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/daily-challenge/word-hunt/submit',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }, { timeout: 3000 });

      // Verify submission includes playerId
      const submitCall = mockFetch.mock.calls.find(
        (call) => call[0] === '/api/daily-challenge/word-hunt/submit'
      );
      expect(submitCall).toBeDefined();

      const body = JSON.parse(submitCall[1].body);
      expect(body.playerId).toBe('user-123-uuid');
      expect(body.guestFingerprint).toBeNull();
      expect(body.displayName).toBe('Test User');
    });

    it('should call onSubmitSuccess after successful submission', async () => {
      // GIVEN: Authenticated user
      const props = {
        result: mockResult,
        puzzleNumber: 100,
        puzzleDate: '2025-01-19',
        language: 'en' as const,
        isNewCompletion: true,
        guestFingerprint: null,
        isAuthenticated: true,
        profile: mockProfile,
        guestPlayer: null,
        countryCodeReady: true,
        onSubmitSuccess: mockOnSubmitSuccess,
      };

      // WHEN: Rendering the hook
      renderHook(() => useResultSubmission(props));

      // THEN: onSubmitSuccess should be called
      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('Guest user submission', () => {
    it('should submit score for guest user WITH guestFingerprint', async () => {
      // GIVEN: Guest user with fingerprint
      const props = {
        result: mockResult,
        puzzleNumber: 100,
        puzzleDate: '2025-01-19',
        language: 'en' as const,
        isNewCompletion: true,
        guestFingerprint: 'guest-fingerprint-12345',
        isAuthenticated: false,
        profile: null,
        guestPlayer: mockGuestPlayer,
        countryCodeReady: true,
        onSubmitSuccess: mockOnSubmitSuccess,
      };

      // WHEN: Rendering the hook
      renderHook(() => useResultSubmission(props));

      // THEN: Submission should happen with guestFingerprint
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/daily-challenge/word-hunt/submit',
          expect.anything()
        );
      }, { timeout: 3000 });

      const submitCall = mockFetch.mock.calls.find(
        (call) => call[0] === '/api/daily-challenge/word-hunt/submit'
      );
      const body = JSON.parse(submitCall[1].body);

      expect(body.playerId).toBeNull();
      expect(body.guestFingerprint).toBe('guest-fingerprint-12345');
    });

    it('should NOT submit for guest user WITHOUT guestFingerprint', async () => {
      // GIVEN: Guest user without fingerprint
      const props = {
        result: mockResult,
        puzzleNumber: 100,
        puzzleDate: '2025-01-19',
        language: 'en' as const,
        isNewCompletion: true,
        guestFingerprint: null, // Guest with no fingerprint
        isAuthenticated: false,
        profile: null,
        guestPlayer: mockGuestPlayer,
        countryCodeReady: true,
        onSubmitSuccess: mockOnSubmitSuccess,
      };

      // WHEN: Rendering the hook
      renderHook(() => useResultSubmission(props));

      // THEN: No submission should happen (guest needs fingerprint)
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
      });

      const submitCalls = mockFetch.mock.calls.filter(
        (call) => call[0] === '/api/daily-challenge/word-hunt/submit'
      );
      expect(submitCalls).toHaveLength(0);
    });
  });

  describe('No submission for already-played', () => {
    it('should NOT submit when isNewCompletion is false', async () => {
      // GIVEN: User viewing already-played results
      const props = {
        result: mockResult,
        puzzleNumber: 100,
        puzzleDate: '2025-01-19',
        language: 'en' as const,
        isNewCompletion: false, // Not a new completion
        guestFingerprint: 'some-fingerprint',
        isAuthenticated: true,
        profile: mockProfile,
        guestPlayer: null,
        countryCodeReady: true,
        onSubmitSuccess: mockOnSubmitSuccess,
      };

      // WHEN: Rendering the hook
      renderHook(() => useResultSubmission(props));

      // THEN: No submission should be made
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
      });

      const submitCalls = mockFetch.mock.calls.filter(
        (call) => call[0] === '/api/daily-challenge/word-hunt/submit'
      );
      expect(submitCalls).toHaveLength(0);
    });
  });

  describe('countryCodeReady dependency', () => {
    it('should wait for countryCodeReady before submitting', async () => {
      // GIVEN: countryCodeReady starts as false
      const props = {
        result: mockResult,
        puzzleNumber: 100,
        puzzleDate: '2025-01-19',
        language: 'en' as const,
        isNewCompletion: true,
        guestFingerprint: null,
        isAuthenticated: true,
        profile: mockProfile,
        guestPlayer: null,
        countryCodeReady: false, // Not ready yet
        onSubmitSuccess: mockOnSubmitSuccess,
      };

      // WHEN: Rendering the hook
      const { rerender } = renderHook(
        (p) => useResultSubmission(p),
        { initialProps: props }
      );

      // Wait a bit and check no submission yet
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
      });

      const submitCallsBefore = mockFetch.mock.calls.filter(
        (call) => call[0] === '/api/daily-challenge/word-hunt/submit'
      );
      expect(submitCallsBefore).toHaveLength(0);

      // WHEN: countryCodeReady becomes true
      rerender({ ...props, countryCodeReady: true });

      // THEN: Submission should happen
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/daily-challenge/word-hunt/submit',
          expect.anything()
        );
      }, { timeout: 3000 });
    });
  });

  describe('offline queueing (phase 1.5)', () => {
    beforeEach(() => {
      mockEnqueueScore.mockReset().mockResolvedValue('queued-uuid');
      mockGetOfflineStore.mockReset().mockResolvedValue({});
      mockUseNetworkState.mockReset().mockReturnValue({ online: true, slow: false, type: 'wifi', rttMs: 0 });
      mockUseOfflineModeFlag.mockReset().mockReturnValue(false);
    });

    it('when flag ON + offline + authed: enqueues to daily-wordhunt, skips submit fetch', async () => {
      mockUseOfflineModeFlag.mockReturnValue(true);
      mockUseNetworkState.mockReturnValue({ online: false, slow: false, type: 'none', rttMs: 0 });

      const props = {
        result: { ...mockResult, lifeRemaining: undefined } as unknown as WordHuntResult,
        puzzleNumber: 100,
        puzzleDate: '2025-01-19',
        language: 'en' as const,
        isNewCompletion: true,
        guestFingerprint: null,
        isAuthenticated: true,
        profile: mockProfile,
        guestPlayer: null,
        countryCodeReady: true,
        onSubmitSuccess: mockOnSubmitSuccess,
      };

      renderHook(() => useResultSubmission(props));

      await waitFor(() => {
        expect(mockEnqueueScore).toHaveBeenCalledTimes(1);
      }, { timeout: 3000 });

      const submitFetchCall = mockFetch.mock.calls.find(
        (c) => c[0] === '/api/daily-challenge/word-hunt/submit',
      );
      expect(submitFetchCall).toBeUndefined();

      const [, mode] = mockEnqueueScore.mock.calls[0];
      expect(mode).toBe('daily-wordhunt');
      expect(mockOnSubmitSuccess).toHaveBeenCalled();
    });

    it('when flag ON + offline + authed + survival fields: enqueues to daily-survival', async () => {
      mockUseOfflineModeFlag.mockReturnValue(true);
      mockUseNetworkState.mockReturnValue({ online: false, slow: false, type: 'none', rttMs: 0 });

      const props = {
        result: mockResult, // mockResult.lifeRemaining = 50 → survival
        puzzleNumber: 100,
        puzzleDate: '2025-01-19',
        language: 'en' as const,
        isNewCompletion: true,
        guestFingerprint: null,
        isAuthenticated: true,
        profile: mockProfile,
        guestPlayer: null,
        countryCodeReady: true,
        onSubmitSuccess: mockOnSubmitSuccess,
      };

      renderHook(() => useResultSubmission(props));

      await waitFor(() => {
        expect(mockEnqueueScore).toHaveBeenCalledTimes(1);
      }, { timeout: 3000 });

      const [, mode] = mockEnqueueScore.mock.calls[0];
      expect(mode).toBe('daily-survival');
    });

    it('when flag ON + offline + GUEST: does NOT enqueue (sync needs auth)', async () => {
      mockUseOfflineModeFlag.mockReturnValue(true);
      mockUseNetworkState.mockReturnValue({ online: false, slow: false, type: 'none', rttMs: 0 });

      const props = {
        result: mockResult,
        puzzleNumber: 100,
        puzzleDate: '2025-01-19',
        language: 'en' as const,
        isNewCompletion: true,
        guestFingerprint: 'fp-1',
        isAuthenticated: false,
        profile: null,
        guestPlayer: mockGuestPlayer,
        countryCodeReady: true,
        onSubmitSuccess: mockOnSubmitSuccess,
      };

      renderHook(() => useResultSubmission(props));

      // Wait long enough for the effect to settle either way.
      await new Promise((r) => setTimeout(r, 100));
      expect(mockEnqueueScore).not.toHaveBeenCalled();
      // Guests fall through to live fetch path which mockFetch will service.
      expect(
        mockFetch.mock.calls.some((c) => c[0] === '/api/daily-challenge/word-hunt/submit'),
      ).toBe(true);
    });
  });

  describe('streak-freeze bridge signal', () => {
    beforeEach(() => {
      // The offline describe leaves these mocks flipped; restore online + flag-off
      // so we exercise the live fetch path. (clearAllMocks keeps return values.)
      mockUseNetworkState.mockReturnValue({ online: true, slow: false, type: 'wifi', rttMs: 0 });
      mockUseOfflineModeFlag.mockReturnValue(false);
    });

    const baseProps = {
      result: mockResult,
      puzzleNumber: 100,
      puzzleDate: '2025-01-19',
      language: 'en' as const,
      isNewCompletion: true,
      guestFingerprint: null,
      isAuthenticated: true,
      profile: mockProfile,
      guestPlayer: null,
      countryCodeReady: true,
      onSubmitSuccess: mockOnSubmitSuccess,
    };

    it('fires onFreezeBridged with freezesRemaining when the server bridged a missed day', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/daily-challenge/word-hunt/submit') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: { id: 'x' }, freezeBridged: true, freezesRemaining: 2 }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
      const onFreezeBridged = vi.fn();

      renderHook(() => useResultSubmission({ ...baseProps, onFreezeBridged }));

      await waitFor(() => {
        expect(onFreezeBridged).toHaveBeenCalledWith({ freezesRemaining: 2 });
      }, { timeout: 3000 });
    });

    it('does NOT fire onFreezeBridged when no freeze was consumed', async () => {
      // default mockFetch returns no freezeBridged field
      const onFreezeBridged = vi.fn();

      renderHook(() => useResultSubmission({ ...baseProps, onFreezeBridged }));

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled();
      }, { timeout: 3000 });
      expect(onFreezeBridged).not.toHaveBeenCalled();
    });
  });
});
