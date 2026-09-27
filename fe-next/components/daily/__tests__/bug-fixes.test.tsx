/**
 * Bug Fix Tests - RED-GREEN-REFACTOR Cycle
 *
 * This file contains tests for bugs discovered in Phase 10 (Bug Discovery)
 * Each test follows TDD methodology:
 * 1. RED: Write failing test that reproduces the bug
 * 2. GREEN: Fix the bug to make test pass
 * 3. REFACTOR: Clean up code while keeping tests passing
 *
 * Bug references: .planning/phases/10-bug-fixes-stabilization/BUG-REGISTRY.md
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useResultSubmission } from '../results/useResultSubmission';
import type { WordHuntResult } from '@/utils/dailyChallenge';
import * as dailyChallengeUtils from '@/utils/dailyChallenge';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

// Mock dailyChallenge utilities
vi.mock('@/utils/dailyChallenge', () => ({
  getTodaysWordHuntResult: vi.fn().mockReturnValue(null),
  markWordHuntResultSubmitted: vi.fn(),
}));

describe('Bug Fixes - Phase 10', () => {
  const createMockResult = (attemptsUsed: number): WordHuntResult => ({
    puzzleNumber: 100,
    puzzleDate: '2025-01-24',
    language: 'en',
    solved: true,
    attemptsUsed,
    targetWord: 'TESTS',
    attempts: [
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
    streakDays: 1,
    completedAt: new Date().toISOString(),
  });

  const mockProfile = {
    id: 'user-123-uuid',
    username: 'testuser',
    display_name: 'Test User',
    avatar_emoji: '🏆',
    avatar_color: '#FFD700',
    avatar_image: null,
  };

  const mockOnSubmitSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Register default handlers for this test suite
    server.use(
      http.get('*/api/geolocation*', () => HttpResponse.json({ countryCode: 'US' })),
      http.post('*/api/daily-challenge/word-hunt/submit*', () =>
        HttpResponse.json({ success: true, data: { id: 'test-id' } })
      )
    );
  });

  describe('BUG-002: Invalid Attempt Count Blocks Result Submission', () => {
    /**
     * Severity: High (data loss)
     * Component: components/daily/results/useResultSubmission.ts
     *
     * Bug: When attemptsUsed < 1 or > 10 (data corruption scenario):
     * - Result is marked as submitted (hasSubmittedRef.current = true)
     * - markWordHuntResultSubmitted(language) is called
     * - But result is NEVER sent to server (early return)
     * - Player loses their score/progress permanently
     *
     * Root Cause: Lines 92-98 mark result as submitted before validation,
     * preventing retries even though server never received the data.
     *
     * Expected: Invalid data should NOT be marked as submitted.
     * System should show error to user and allow retry/correction.
     */

    it('should not mark as submitted when attempt count is zero (BUG-002)', async () => {
      // GIVEN: Result with invalid attempt count (0)
      const invalidResult = createMockResult(0);
      let submitCalled = false;
      server.use(
        http.post('*/api/daily-challenge/word-hunt/submit*', () => {
          submitCalled = true;
          return HttpResponse.json({ success: true, data: { id: 'test-id' } });
        })
      );

      const props = {
        result: invalidResult,
        puzzleNumber: 100,
        puzzleDate: '2025-01-24',
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

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
      });

      // THEN: Should NOT mark as submitted
      expect(dailyChallengeUtils.markWordHuntResultSubmitted).not.toHaveBeenCalled();

      // AND: Should NOT submit to server
      expect(submitCalled).toBe(false);

      // AND: Should NOT call onSubmitSuccess
      expect(mockOnSubmitSuccess).not.toHaveBeenCalled();
    });

    it('should not mark as submitted when attempt count is negative (BUG-002)', async () => {
      // GIVEN: Result with invalid attempt count (-1)
      const invalidResult = createMockResult(-1);
      let submitCalled = false;
      server.use(
        http.post('*/api/daily-challenge/word-hunt/submit*', () => {
          submitCalled = true;
          return HttpResponse.json({ success: true, data: { id: 'test-id' } });
        })
      );

      const props = {
        result: invalidResult,
        puzzleNumber: 100,
        puzzleDate: '2025-01-24',
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

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
      });

      // THEN: Should NOT mark as submitted
      expect(dailyChallengeUtils.markWordHuntResultSubmitted).not.toHaveBeenCalled();

      // AND: Should NOT submit to server
      expect(submitCalled).toBe(false);
    });

    it('should not mark as submitted when attempt count exceeds maximum (BUG-002)', async () => {
      // GIVEN: Result with invalid attempt count (11)
      const invalidResult = createMockResult(11);
      let submitCalled = false;
      server.use(
        http.post('*/api/daily-challenge/word-hunt/submit*', () => {
          submitCalled = true;
          return HttpResponse.json({ success: true, data: { id: 'test-id' } });
        })
      );

      const props = {
        result: invalidResult,
        puzzleNumber: 100,
        puzzleDate: '2025-01-24',
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

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
      });

      // THEN: Should NOT mark as submitted
      expect(dailyChallengeUtils.markWordHuntResultSubmitted).not.toHaveBeenCalled();

      // AND: Should NOT submit to server
      expect(submitCalled).toBe(false);
    });

    it('should mark as submitted when attempt count is valid (BUG-002 - control test)', async () => {
      // GIVEN: Result with VALID attempt count (3)
      const validResult = createMockResult(3);
      let capturedBody: Record<string, unknown> | null = null;
      server.use(
        http.post('*/api/daily-challenge/word-hunt/submit*', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({ success: true, data: { id: 'test-id' } });
        })
      );

      const props = {
        result: validResult,
        puzzleNumber: 100,
        puzzleDate: '2025-01-24',
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

      // THEN: Should mark as submitted after successful API call
      await waitFor(() => {
        expect(dailyChallengeUtils.markWordHuntResultSubmitted).toHaveBeenCalledWith('en');
      }, { timeout: 3000 });

      // AND: Should submit to server
      await waitFor(() => {
        expect(capturedBody).not.toBeNull();
      }, { timeout: 3000 });

      // AND: Should call onSubmitSuccess
      expect(mockOnSubmitSuccess).toHaveBeenCalled();
    });
  });

  /**
   * BUG-003: Known Letters Not Cleaned Up When All Occurrences Become Green
   *
   * Status: FIXED (test already exists and passes)
   * Location: components/daily/survival/__tests__/useSurvivalClues.test.ts:444-447
   *
   * This bug was already fixed. The test in useSurvivalClues.test.ts verifies:
   * - Target word "STYLE"
   * - Discover "TEST" which reveals T at position 1, S at position 0
   * - After discovery: T and S should be REMOVED from knownLetters (yellow set)
   * - Test passes, confirming bug is fixed
   */

  describe('BUG-005: Authenticated user submission blocked without guestFingerprint', () => {
    /**
     * Severity: Medium (blocks authenticated user submissions)
     * Component: components/daily/results/useResultSubmission.ts
     *
     * Bug: The canSubmit logic previously required guestFingerprint for ALL users.
     * Authenticated users with profile but no guestFingerprint were blocked.
     *
     * Fixed: canSubmit now checks:
     * - For authenticated: isAuthenticated && profile (NOT guestFingerprint)
     * - For guests: guestFingerprint only
     *
     * Regression test ensures the fix stays in place.
     */

    it('should submit for authenticated user even when guestFingerprint is NULL (BUG-005 regression)', async () => {
      // GIVEN: Authenticated user WITH profile, WITHOUT guestFingerprint
      const validResult = createMockResult(3);
      let capturedBody: Record<string, unknown> | null = null;
      server.use(
        http.post('*/api/daily-challenge/word-hunt/submit*', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({ success: true, data: { id: 'test-id' } });
        })
      );

      const props = {
        result: validResult,
        puzzleNumber: 100,
        puzzleDate: '2025-01-24',
        language: 'en' as const,
        isNewCompletion: true,
        guestFingerprint: null, // KEY: null fingerprint
        isAuthenticated: true,  // KEY: authenticated
        profile: mockProfile,   // KEY: has profile
        guestPlayer: null,
        countryCodeReady: true,
        onSubmitSuccess: mockOnSubmitSuccess,
      };

      // WHEN: Rendering the hook
      renderHook(() => useResultSubmission(props));

      // THEN: Should submit to server (authenticated users don't need guestFingerprint)
      await waitFor(() => {
        expect(capturedBody).not.toBeNull();
      }, { timeout: 3000 });

      // AND: Submission body should use playerId, not guestFingerprint
      expect(capturedBody!.playerId).toBe(mockProfile.id);
      expect(capturedBody!.guestFingerprint).toBeNull();
    });

    it('should NOT submit for guest user when guestFingerprint is null (BUG-005 control)', async () => {
      // GIVEN: Guest user WITHOUT profile AND WITHOUT guestFingerprint
      const validResult = createMockResult(3);
      let submitCalled = false;
      server.use(
        http.post('*/api/daily-challenge/word-hunt/submit*', () => {
          submitCalled = true;
          return HttpResponse.json({ success: true, data: { id: 'test-id' } });
        })
      );

      const props = {
        result: validResult,
        puzzleNumber: 100,
        puzzleDate: '2025-01-24',
        language: 'en' as const,
        isNewCompletion: true,
        guestFingerprint: null, // KEY: null fingerprint
        isAuthenticated: false, // KEY: NOT authenticated
        profile: null,          // KEY: no profile
        guestPlayer: null,
        countryCodeReady: true,
        onSubmitSuccess: mockOnSubmitSuccess,
      };

      // WHEN: Rendering the hook
      renderHook(() => useResultSubmission(props));

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
      });

      // THEN: Should NOT submit to server (guests need guestFingerprint)
      expect(submitCalled).toBe(false);
    });
  });

  /**
   * BUG-001: E2E Test Server Port Conflict
   * BUG-010: Performance Tests Timeout Due to API Configuration
   *
   * These are infrastructure bugs, not code bugs. They require configuration changes
   * rather than code fixes. Documented in BUG-REGISTRY.md for Plan 10-02.
   */
});
