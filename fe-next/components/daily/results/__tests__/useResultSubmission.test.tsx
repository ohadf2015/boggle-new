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
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock dailyChallenge utilities
jest.mock('@/utils/dailyChallenge', () => ({
  getTodaysWordHuntResult: jest.fn().mockReturnValue(null),
  markWordHuntResultSubmitted: jest.fn(),
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
    profile_picture_url: null,
  };

  const mockGuestPlayer: GuestDailyPlayer = {
    displayName: 'Guest Player',
    avatarEmoji: '🎯',
    avatarColor: '#6366f1',
  };

  const mockOnSubmitSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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
});
