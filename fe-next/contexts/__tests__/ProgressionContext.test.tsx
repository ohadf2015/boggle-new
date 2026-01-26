/**
 * ProgressionContext Tests
 *
 * Tests for adventure progression global state management
 * Following TDD: Write tests FIRST, then implement
 */

import React from 'react';
import { render, screen, waitFor, act, renderHook } from '@testing-library/react';
import {
  ProgressionProvider,
  useProgression,
} from '../ProgressionContext';
import type { PlayerProgression, LevelCompletion } from '@/types/adventure';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock attempts response
const mockAttemptsResponse = {
  ok: true,
  json: async () => ({ success: true, attempts: [] }),
};

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
    isLoading: false,
  }),
}));

// Test data factory
function createMockProgression(overrides?: Partial<PlayerProgression>): PlayerProgression {
  return {
    userId: 'test-user-123',
    playerLevel: 5,
    xp: 2500,
    currentWorld: 2,
    currentLevel: 3,
    totalStars: 25,
    completions: [
      { world: 1, level: 1, stars: 3, bestScore: 450, bestWords: 15, completedAt: '2025-01-20T12:00:00Z' },
      { world: 1, level: 2, stars: 2, bestScore: 380, bestWords: 12, completedAt: '2025-01-20T12:30:00Z' },
    ],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-20T12:30:00Z',
    ...overrides,
  };
}

// Helper to wrap component with provider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ProgressionProvider>{children}</ProgressionProvider>
);

// Helper to create a mock that handles the combined adventure state endpoint
function createFetchMock(progressionResponse: object | null) {
  return jest.fn((url: string) => {
    if (url.includes('/api/adventure/state')) {
      if (progressionResponse === null) {
        return new Promise(() => {}); // Never resolves
      }
      return Promise.resolve(progressionResponse);
    }
    if (url.includes('/api/adventure/complete')) {
      // Return a mock completion response
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          progression: progressionResponse,
          completion: { world: 1, level: 1, stars: 3, bestScore: 450, bestWords: 15, completedAt: new Date().toISOString() },
        }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

describe('ProgressionContext', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Initial Loading', () => {
    it('should show loading state initially', async () => {
      // GIVEN - Use createFetchMock with null to simulate never-resolving progression
      mockFetch.mockImplementation(createFetchMock(null));

      // WHEN
      const { result } = renderHook(() => useProgression(), { wrapper });

      // THEN
      expect(result.current.isLoading).toBe(true);
      expect(result.current.progression).toBeNull();
    });

    it('should load progression on mount', async () => {
      // GIVEN
      const mockProgression = createMockProgression();
      mockFetch.mockImplementation(createFetchMock({
        ok: true,
        json: async () => ({ progression: mockProgression, attempts: [] }),
      }));

      // WHEN
      const { result } = renderHook(() => useProgression(), { wrapper });

      // THEN
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.progression).toEqual(mockProgression);
      expect(result.current.error).toBeNull();
    });

    it('should set error on fetch failure', async () => {
      // GIVEN
      mockFetch.mockImplementation(createFetchMock({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      }));

      // WHEN
      const { result } = renderHook(() => useProgression(), { wrapper });

      // THEN
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.error).toBeTruthy();
      expect(result.current.progression).toBeNull();
    });
  });

  describe('Progression Data Access', () => {
    it('should provide total stars', async () => {
      // GIVEN
      const mockProgression = createMockProgression({ totalStars: 42 });
      mockFetch.mockImplementation(createFetchMock({
        ok: true,
        json: async () => ({ progression: mockProgression, attempts: [] }),
      }));

      // WHEN
      const { result } = renderHook(() => useProgression(), { wrapper });

      // THEN
      await waitFor(() => {
        expect(result.current.progression?.totalStars).toBe(42);
      });
    });

    it('should provide completions array', async () => {
      // GIVEN
      const completions: LevelCompletion[] = [
        { world: 1, level: 1, stars: 3, bestScore: 500, bestWords: 20, completedAt: '2025-01-20T12:00:00Z' },
        { world: 1, level: 2, stars: 2, bestScore: 400, bestWords: 15, completedAt: '2025-01-20T12:30:00Z' },
        { world: 1, level: 3, stars: 1, bestScore: 300, bestWords: 10, completedAt: '2025-01-20T13:00:00Z' },
      ];
      const mockProgression = createMockProgression({ completions });
      mockFetch.mockImplementation(createFetchMock({
        ok: true,
        json: async () => ({ progression: mockProgression, attempts: [] }),
      }));

      // WHEN
      const { result } = renderHook(() => useProgression(), { wrapper });

      // THEN
      await waitFor(() => {
        expect(result.current.progression?.completions).toHaveLength(3);
      });
    });

    it('should provide player level and XP', async () => {
      // GIVEN
      const mockProgression = createMockProgression({ playerLevel: 10, xp: 5000 });
      mockFetch.mockImplementation(createFetchMock({
        ok: true,
        json: async () => ({ progression: mockProgression, attempts: [] }),
      }));

      // WHEN
      const { result } = renderHook(() => useProgression(), { wrapper });

      // THEN
      await waitFor(() => {
        expect(result.current.progression?.playerLevel).toBe(10);
        expect(result.current.progression?.xp).toBe(5000);
      });
    });
  });

  describe('Level Completion', () => {
    it('should update progression after completing level', async () => {
      // GIVEN - Initial load
      const initialProgression = createMockProgression({ totalStars: 5 });
      mockFetch.mockImplementation(createFetchMock({
        ok: true,
        json: async () => ({ progression: initialProgression, attempts: [] }),
      }));

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // GIVEN - Completion response (matching actual API response format)
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/adventure/complete')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              progression: {
                playerLevel: 5,
                xp: 2600,
                totalStars: 8,
                currentWorld: 2,
                currentLevel: 3,
              },
              completion: {
                world: 1,
                level: 3,
                stars: 3,
                bestScore: 500,
                bestWords: 20,
                completedAt: new Date().toISOString(),
              },
              xpEarned: 100,
              starsGained: 3,
              leveledUp: false,
            }),
          });
        }
        return Promise.resolve(mockAttemptsResponse);
      });

      // WHEN
      await act(async () => {
        await result.current.completeLevel(1, 3, 3, 500, 20);
      });

      // THEN
      expect(result.current.progression?.totalStars).toBe(8);
    });

    it('should call API with correct parameters', async () => {
      // GIVEN
      const mockProgression = createMockProgression();
      mockFetch.mockImplementation(createFetchMock({
        ok: true,
        json: async () => ({ progression: mockProgression, attempts: [] }),
      }));

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock completion response (matching actual API response format)
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/adventure/complete')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              progression: {
                playerLevel: mockProgression.playerLevel,
                xp: mockProgression.xp,
                totalStars: mockProgression.totalStars,
                currentWorld: mockProgression.currentWorld,
                currentLevel: mockProgression.currentLevel,
              },
              completion: {
                world: 2,
                level: 5,
                stars: 2,
                bestScore: 350,
                bestWords: 12,
                completedAt: new Date().toISOString(),
              },
              xpEarned: 100,
              starsGained: 2,
              leveledUp: false,
            }),
          });
        }
        return Promise.resolve(mockAttemptsResponse);
      });

      // WHEN
      await act(async () => {
        await result.current.completeLevel(2, 5, 2, 350, 12);
      });

      // THEN
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/adventure/complete',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            world: 2,
            level: 5,
            stars: 2,
            score: 350,
            words: 12,
          }),
        })
      );
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh progression data', async () => {
      // GIVEN - Initial load
      const initialProgression = createMockProgression({ xp: 1000 });
      mockFetch.mockImplementation(createFetchMock({
        ok: true,
        json: async () => ({ progression: initialProgression, attempts: [] }),
      }));

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.progression?.xp).toBe(1000);
      });

      // GIVEN - Refresh response with updated data
      const refreshedProgression = createMockProgression({ xp: 1500 });
      mockFetch.mockImplementation(createFetchMock({
        ok: true,
        json: async () => ({ progression: refreshedProgression, attempts: [] }),
      }));

      // WHEN
      await act(async () => {
        await result.current.refreshProgression();
      });

      // THEN
      expect(result.current.progression?.xp).toBe(1500);
    });
  });

  describe('Helper Functions', () => {
    it('should provide isWorldUnlocked helper', async () => {
      // GIVEN
      const mockProgression = createMockProgression({ totalStars: 20 });
      mockFetch.mockImplementation(createFetchMock({
        ok: true,
        json: async () => ({ progression: mockProgression, attempts: [] }),
      }));

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN
      // World 1 always unlocked
      expect(result.current.isWorldUnlocked(1)).toBe(true);
      // World 2 requires 15 stars (we have 20)
      expect(result.current.isWorldUnlocked(2)).toBe(true);
      // World 3 requires 30 stars (we have 20)
      expect(result.current.isWorldUnlocked(3)).toBe(false);
    });

    it('should provide isLevelUnlocked helper', async () => {
      // GIVEN
      const completions: LevelCompletion[] = [
        { world: 1, level: 1, stars: 2, bestScore: 300, bestWords: 10, completedAt: '2025-01-20T12:00:00Z' },
        { world: 1, level: 2, stars: 1, bestScore: 200, bestWords: 8, completedAt: '2025-01-20T12:30:00Z' },
      ];
      const mockProgression = createMockProgression({ completions });
      mockFetch.mockImplementation(createFetchMock({
        ok: true,
        json: async () => ({ progression: mockProgression, attempts: [] }),
      }));

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN
      // Level 1 always unlocked
      expect(result.current.isLevelUnlocked(1, 1)).toBe(true);
      // Level 2 unlocked (level 1 completed)
      expect(result.current.isLevelUnlocked(1, 2)).toBe(true);
      // Level 3 unlocked (level 2 completed with 1 star)
      expect(result.current.isLevelUnlocked(1, 3)).toBe(true);
      // Level 4 NOT unlocked (level 3 not completed)
      expect(result.current.isLevelUnlocked(1, 4)).toBe(false);
    });

    it('should provide getWorldStars helper', async () => {
      // GIVEN
      const completions: LevelCompletion[] = [
        { world: 1, level: 1, stars: 3, bestScore: 500, bestWords: 20, completedAt: '2025-01-20T12:00:00Z' },
        { world: 1, level: 2, stars: 2, bestScore: 400, bestWords: 15, completedAt: '2025-01-20T12:30:00Z' },
        { world: 2, level: 1, stars: 1, bestScore: 300, bestWords: 10, completedAt: '2025-01-20T13:00:00Z' },
      ];
      const mockProgression = createMockProgression({ completions });
      mockFetch.mockImplementation(createFetchMock({
        ok: true,
        json: async () => ({ progression: mockProgression, attempts: [] }),
      }));

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // THEN
      expect(result.current.getWorldStars(1)).toBe(5); // 3 + 2
      expect(result.current.getWorldStars(2)).toBe(1);
      expect(result.current.getWorldStars(3)).toBe(0); // No completions
    });
  });

  describe('Error Handling', () => {
    it('should throw error when used outside provider', () => {
      // WHEN/THEN
      expect(() => {
        renderHook(() => useProgression());
      }).toThrow('useProgression must be used within ProgressionProvider');
    });
  });
});
