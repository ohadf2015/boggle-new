import { vi, type Mock, } from 'vitest';
/**
 * ProgressionContext Level Unlock Bug Tests
 *
 * Tests for the bug where completing a level doesn't properly:
 * 1. Update stars count
 * 2. Unlock the next level
 *
 * Following TDD: Write failing test FIRST
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  ProgressionProvider,
  useProgression,
} from '../ProgressionContext';
import type { PlayerProgression } from '@/types/adventure';

// Mock fetch globally
const mockFetch = vi.fn();

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
    loading: false,
  }),
}));

// Test data factory
function createMockProgression(overrides?: Partial<PlayerProgression>): PlayerProgression {
  return {
    userId: 'test-user-123',
    playerLevel: 1,
    xp: 0,
    currentWorld: 1,
    currentLevel: 1,
    totalStars: 0,
    completions: [],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-20T12:30:00Z',
    gold: 0,
    upgrades: {},
    skillPoints: 0,
    skillTree: {},
    runeFragments: 0,
    runes: [],
    ...overrides,
  };
}

// Helper to wrap component with provider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ProgressionProvider>{children}</ProgressionProvider>
);

describe('ProgressionContext - Level Unlock Bug', () => {
  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockClear();
    localStorage.clear();
  });

  describe('Bug: Stars and unlock not updating after level completion', () => {
    it('should update completions array with new completion after completing first level', async () => {
      // GIVEN - Initial load with no completions
      const initialProgression = createMockProgression({
        totalStars: 0,
        completions: [],
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ progression: initialProgression, attempts: [] }),
      });

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify initial state
      expect(result.current.progression?.completions).toHaveLength(0);
      expect(result.current.progression?.totalStars).toBe(0);

      // GIVEN - Mock the completion API response
      const completionResponse = {
        success: true,
        progression: {
          playerLevel: 1,
          xp: 125, // BASE_COMPLETION_XP (50) + 3 stars * XP_PER_STAR (25)
          totalStars: 3,
          currentWorld: 1,
          currentLevel: 2,
        },
        completion: {
          world: 1,
          level: 1,
          stars: 3,
          bestScore: 500,
          bestWords: 20,
          completedAt: new Date().toISOString(),
        },
        xpEarned: 125,
        starsGained: 3,
        leveledUp: false,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => completionResponse,
      });

      // WHEN - Complete level 1 with 3 stars
      await act(async () => {
        await result.current.completeLevel(1, 1, 3, 500, 20);
      });

      // THEN - Completions should have the new entry
      expect(result.current.progression?.completions).toHaveLength(1);
      expect(result.current.progression?.completions[0]).toEqual({
        world: 1,
        level: 1,
        stars: 3,
        bestScore: 500,
        bestWords: 20,
        completedAt: expect.any(String),
      });
    });

    it('should unlock next level after completing current level with 1+ stars', async () => {
      // GIVEN - Initial load with no completions
      const initialProgression = createMockProgression({
        totalStars: 0,
        completions: [],
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ progression: initialProgression, attempts: [] }),
      });

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Level 1 is always unlocked, Level 2 should be locked initially
      expect(result.current.isLevelUnlocked(1, 1)).toBe(true);
      expect(result.current.isLevelUnlocked(1, 2)).toBe(false);

      // GIVEN - Mock completion response for level 1
      const completionResponse = {
        success: true,
        progression: {
          playerLevel: 1,
          xp: 100,
          totalStars: 2,
          currentWorld: 1,
          currentLevel: 2,
        },
        completion: {
          world: 1,
          level: 1,
          stars: 2,
          bestScore: 400,
          bestWords: 15,
          completedAt: new Date().toISOString(),
        },
        xpEarned: 100,
        starsGained: 2,
        leveledUp: false,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => completionResponse,
      });

      // WHEN - Complete level 1 with 2 stars
      await act(async () => {
        await result.current.completeLevel(1, 1, 2, 400, 15);
      });

      // THEN - Level 2 should now be unlocked
      expect(result.current.isLevelUnlocked(1, 2)).toBe(true);
    });

    it('should update totalStars in progression after completing a level', async () => {
      // GIVEN - Initial load with 5 stars
      const initialProgression = createMockProgression({
        totalStars: 5,
        completions: [
          { world: 1, level: 1, stars: 3, bestScore: 500, bestWords: 20, completedAt: '2025-01-20T12:00:00Z' },
          { world: 1, level: 2, stars: 2, bestScore: 400, bestWords: 15, completedAt: '2025-01-20T12:30:00Z' },
        ],
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ progression: initialProgression, attempts: [] }),
      });

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progression?.totalStars).toBe(5);

      // GIVEN - Mock completion response for level 3 with 3 stars
      const completionResponse = {
        success: true,
        progression: {
          playerLevel: 2,
          xp: 225,
          totalStars: 8, // 5 + 3 new stars
          currentWorld: 1,
          currentLevel: 4,
        },
        completion: {
          world: 1,
          level: 3,
          stars: 3,
          bestScore: 550,
          bestWords: 22,
          completedAt: new Date().toISOString(),
        },
        xpEarned: 125,
        starsGained: 3,
        leveledUp: false,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => completionResponse,
      });

      // WHEN - Complete level 3 with 3 stars
      await act(async () => {
        await result.current.completeLevel(1, 3, 3, 550, 22);
      });

      // THEN - totalStars should be updated
      expect(result.current.progression?.totalStars).toBe(8);
    });

    it('should NOT unlock next level if completed with 0 stars', async () => {
      // GIVEN - Initial load with no completions
      const initialProgression = createMockProgression({
        totalStars: 0,
        completions: [],
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ progression: initialProgression, attempts: [] }),
      });

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Level 2 should be locked initially
      expect(result.current.isLevelUnlocked(1, 2)).toBe(false);

      // GIVEN - Mock completion response for level 1 with 0 stars (failed)
      const completionResponse = {
        success: true,
        progression: {
          playerLevel: 1,
          xp: 0, // No XP for 0 stars
          totalStars: 0,
          currentWorld: 1,
          currentLevel: 1, // Stays at level 1
        },
        completion: {
          world: 1,
          level: 1,
          stars: 0,
          bestScore: 100,
          bestWords: 5,
          completedAt: new Date().toISOString(),
        },
        xpEarned: 0,
        starsGained: 0,
        leveledUp: false,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => completionResponse,
      });

      // WHEN - Complete level 1 with 0 stars (failed)
      await act(async () => {
        await result.current.completeLevel(1, 1, 0, 100, 5);
      });

      // THEN - Level 2 should still be locked
      expect(result.current.isLevelUnlocked(1, 2)).toBe(false);
      // But completion should be recorded
      expect(result.current.progression?.completions).toHaveLength(1);
      expect(result.current.progression?.completions[0].stars).toBe(0);
    });

    it('should properly merge completions when completing already-completed level', async () => {
      // GIVEN - Initial load with level 1 completed with 1 star
      const initialProgression = createMockProgression({
        totalStars: 1,
        completions: [
          { world: 1, level: 1, stars: 1, bestScore: 200, bestWords: 8, completedAt: '2025-01-20T12:00:00Z' },
        ],
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ progression: initialProgression, attempts: [] }),
      });

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.progression?.completions).toHaveLength(1);
      expect(result.current.progression?.completions[0].stars).toBe(1);

      // GIVEN - Mock completion response for improving level 1 to 3 stars
      const completionResponse = {
        success: true,
        progression: {
          playerLevel: 1,
          xp: 50, // Only 2 new stars worth of XP
          totalStars: 3, // 1 original + 2 new
          currentWorld: 1,
          currentLevel: 2,
        },
        completion: {
          world: 1,
          level: 1,
          stars: 3, // Improved!
          bestScore: 500,
          bestWords: 20,
          completedAt: new Date().toISOString(),
        },
        xpEarned: 50,
        starsGained: 2,
        leveledUp: false,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => completionResponse,
      });

      // WHEN - Improve level 1 to 3 stars
      await act(async () => {
        await result.current.completeLevel(1, 1, 3, 500, 20);
      });

      // THEN - Completions should have updated entry, not duplicate
      expect(result.current.progression?.completions).toHaveLength(1);
      expect(result.current.progression?.completions[0].stars).toBe(3);
      expect(result.current.progression?.totalStars).toBe(3);
    });
  });
});
