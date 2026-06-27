import { vi, type Mock, } from 'vitest';
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
const mockFetch = vi.fn();

// Mock attempts response
const mockAttemptsResponse = {
  ok: true,
  json: async () => ({ success: true, attempts: [] }),
};

// Mock AuthContext with mutable user for per-test overrides
let mockAuthUser: { id: string } | null = { id: 'test-user-123' };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    loading: false,
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

// Helper to create a mock that handles the combined adventure state endpoint
function createFetchMock(progressionResponse: object | null) {
  return vi.fn((url: string) => {
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
    global.fetch = mockFetch;
    mockFetch.mockClear();
    mockAuthUser = { id: 'test-user-123' };
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
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

    it('should set error on fetch failure after retries', async () => {
      // GIVEN — all retries fail with 500
      vi.useFakeTimers();
      mockFetch.mockImplementation(createFetchMock({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
        text: async () => 'Server error',
      }));

      // WHEN
      const { result } = renderHook(() => useProgression(), { wrapper });

      // Advance through all retry delays (1s, 2s, 4s)
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(5000);
      }

      // THEN
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.error).toBeTruthy();
      expect(result.current.progression).toBeNull();
      // 1 initial + 3 retries = 4 calls
      const stateCalls = mockFetch.mock.calls.filter(
        (c: [string]) => c[0].includes('/api/adventure/state')
      );
      expect(stateCalls.length).toBe(4);
      vi.useRealTimers();
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
      // World 3 requires 18 stars (we have 20)
      expect(result.current.isWorldUnlocked(3)).toBe(true);
      // World 4 requires 29 stars (we have 20)
      expect(result.current.isWorldUnlocked(4)).toBe(false);
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

  describe('completeLevel return value', () => {
    it('should return false for guest users (no auth)', async () => {
      // GIVEN — set auth user to null (guest)
      mockAuthUser = null;
      mockFetch.mockImplementation(() =>
        Promise.resolve({ ok: true, json: async () => ({}) })
      );

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // WHEN
      let saved: boolean = true;
      await act(async () => {
        saved = await result.current.completeLevel(1, 1, 3, 500, 10);
      });

      // THEN — guest user should return false, no fetch called for /complete
      expect(saved).toBe(false);
      const completeCalls = mockFetch.mock.calls.filter(
        (call: string[]) => call[0]?.includes('/api/adventure/complete')
      );
      expect(completeCalls).toHaveLength(0);
    });

    it('should return true on successful save', async () => {
      // GIVEN
      const mockProgression = createMockProgression();
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/adventure/state')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ progression: mockProgression, attempts: [] }),
          });
        }
        if (url.includes('/api/adventure/complete')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              progression: { ...mockProgression, totalStars: 28 },
              completion: { world: 1, level: 3, stars: 3, bestScore: 600, bestWords: 18, completedAt: new Date().toISOString() },
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // WHEN
      let saved: boolean = false;
      await act(async () => {
        saved = await result.current.completeLevel(1, 3, 3, 600, 18);
      });

      // THEN
      expect(saved).toBe(true);
    });

    it('should return false on network error', async () => {
      // GIVEN
      const mockProgression = createMockProgression();
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/adventure/state')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ progression: mockProgression, attempts: [] }),
          });
        }
        if (url.includes('/api/adventure/complete')) {
          return Promise.reject(new TypeError('Failed to fetch'));
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // WHEN
      let saved: boolean = true;
      await act(async () => {
        saved = await result.current.completeLevel(1, 1, 2, 300, 8);
      });

      // THEN
      expect(saved).toBe(false);
    });

    it('should return false on server error after retry', async () => {
      // GIVEN — server returns 500 on both attempts
      const mockProgression = createMockProgression();
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/adventure/state')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ progression: mockProgression, attempts: [] }),
          });
        }
        if (url.includes('/api/adventure/complete')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: async () => 'Internal Server Error',
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const { result } = renderHook(() => useProgression(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // WHEN
      let saved: boolean = true;
      await act(async () => {
        saved = await result.current.completeLevel(1, 1, 1, 200, 5);
      });

      // THEN
      expect(saved).toBe(false);
    });

    it('should retry on 409 (optimistic lock conflict) and succeed', async () => {
      // GIVEN — server returns 409 first, then 200 on retry
      const mockProgression = createMockProgression();
      let completeCallCount = 0;
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/adventure/state')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ progression: mockProgression, attempts: [] }),
          });
        }
        if (url.includes('/api/adventure/complete')) {
          completeCallCount++;
          if (completeCallCount === 1) {
            // First call: 409 optimistic lock conflict
            return Promise.resolve({
              ok: false,
              status: 409,
              text: async () => 'Concurrent modification detected',
            });
          }
          // Second call: success
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              progression: { ...mockProgression, totalStars: 28, gold: 150 },
              completion: { world: 1, level: 1, stars: 3, bestScore: 500, bestWords: 15, completedAt: new Date().toISOString() },
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const { result } = renderHook(() => useProgression(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // WHEN
      let saved: boolean = false;
      await act(async () => {
        saved = await result.current.completeLevel(1, 1, 3, 500, 15);
      });

      // THEN — should have retried and succeeded
      expect(saved).toBe(true);
      expect(completeCallCount).toBe(2);
    });

    it('should retry on 403 (stale level) by refreshing progression first', async () => {
      // GIVEN — server returns 403 "Level not unlocked" first,
      // then after refreshing progression, the retry succeeds
      const mockProgression = createMockProgression({ currentWorld: 1, currentLevel: 2 });
      let completeCallCount = 0;
      let stateCallCount = 0;
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/adventure/state')) {
          stateCallCount++;
          return Promise.resolve({
            ok: true,
            json: async () => ({ progression: mockProgression, attempts: [] }),
          });
        }
        if (url.includes('/api/adventure/complete')) {
          completeCallCount++;
          if (completeCallCount === 1) {
            // First call: 403 — stale current_level in DB
            return Promise.resolve({
              ok: false,
              status: 403,
              text: async () => JSON.stringify({ error: 'Level not unlocked' }),
            });
          }
          // Second call: success (after progression refresh updated DB)
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              progression: { ...mockProgression, currentLevel: 3, totalStars: 28 },
              completion: { world: 1, level: 2, stars: 2, bestScore: 350, bestWords: 12, completedAt: new Date().toISOString() },
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const { result } = renderHook(() => useProgression(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // WHEN
      let saved: boolean = false;
      await act(async () => {
        saved = await result.current.completeLevel(1, 2, 2, 350, 12);
      });

      // THEN — should have refreshed progression and retried
      expect(saved).toBe(true);
      expect(completeCallCount).toBe(2);
      // State was fetched once on mount + once on refresh before retry
      expect(stateCallCount).toBe(2);
    });

    it('should return false (not throw) when 403 persists after refresh+retry', async () => {
      // GIVEN — server keeps rejecting with 403 even after progression refresh.
      // This means the local frontier is genuinely stale (cache from older
      // session, URL-jump, dropped completion). Client must NOT throw — that
      // ships a warning to Sentry. It should clear the bad cache and bail.
      const mockProgression = createMockProgression({ currentWorld: 1, currentLevel: 1 });
      let stateCallCount = 0;
      let completeCallCount = 0;
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/adventure/state')) {
          stateCallCount++;
          return Promise.resolve({
            ok: true,
            json: async () => ({ progression: mockProgression, attempts: [] }),
          });
        }
        if (url.includes('/api/adventure/complete')) {
          completeCallCount++;
          return Promise.resolve({
            ok: false,
            status: 403,
            text: async () => JSON.stringify({ error: 'Level not unlocked — cannot skip ahead' }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const { result } = renderHook(() => useProgression(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // WHEN — try to complete a level the server says is locked
      let saved: boolean = true;
      let threw = false;
      await act(async () => {
        try {
          saved = await result.current.completeLevel(5, 1, 3, 500, 15);
        } catch {
          threw = true;
        }
      });

      // THEN — clean false, no throw. Two complete attempts (refresh+retry).
      // Two extra state fetches (refresh-then-retry, then post-clear refresh).
      expect(threw).toBe(false);
      expect(saved).toBe(false);
      expect(completeCallCount).toBe(2);
      expect(stateCallCount).toBeGreaterThanOrEqual(2);
    });

    it('should retry quest progress saves on transient errors', async () => {
      // GIVEN — quest progress endpoint fails with 500 first, then succeeds
      const mockProgression = createMockProgression();
      let questCallCount = 0;
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/adventure/state')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ progression: mockProgression, attempts: [] }),
          });
        }
        if (url.includes('/api/adventure/quest-progress')) {
          questCallCount++;
          if (questCallCount === 1) {
            return Promise.resolve({ ok: false, status: 500 });
          }
          return Promise.resolve({ ok: true, json: async () => ({}) });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const { result } = renderHook(() => useProgression(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // WHEN — update quest progress (this triggers debounced persist with 2s window)
      act(() => {
        result.current.updateChapterQuestProgress('wordsFound', 5, ['quest-1']);
      });

      // THEN — first call happens after 2s debounce
      await waitFor(() => expect(questCallCount).toBe(1), { timeout: 3000 });

      // Wait for retry (1s base delay after first failure)
      await act(async () => {
        await new Promise(r => setTimeout(r, 2000));
      });

      // THEN — retried after transient 500
      expect(questCallCount).toBe(2);
    });

    it('should return false when 409 retry also fails', async () => {
      // GIVEN — server returns 409 on both attempts
      const mockProgression = createMockProgression();
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/adventure/state')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ progression: mockProgression, attempts: [] }),
          });
        }
        if (url.includes('/api/adventure/complete')) {
          return Promise.resolve({
            ok: false,
            status: 409,
            text: async () => 'Concurrent modification detected',
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const { result } = renderHook(() => useProgression(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // WHEN
      let saved: boolean = true;
      await act(async () => {
        saved = await result.current.completeLevel(1, 1, 3, 500, 15);
      });

      // THEN — both attempts failed, should return false
      expect(saved).toBe(false);
    });
  });

  describe('updateChapterQuestProgress', () => {
    it('adds to existing progress in default (add) mode', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/adventure/state')) {
          return Promise.resolve({ ok: true, json: async () => ({ progression: createMockProgression(), attempts: [] }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const { result } = renderHook(() => useProgression(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.updateChapterQuestProgress('wordCountChapter', 5, ['q-add']); });
      act(() => { result.current.updateChapterQuestProgress('wordCountChapter', 3, ['q-add']); });

      expect(result.current.progression?.chapterQuestProgress?.['q-add']).toBe(8);
    });

    it('keeps the highest value in max mode (streak length, not sum)', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/adventure/state')) {
          return Promise.resolve({ ok: true, json: async () => ({ progression: createMockProgression(), attempts: [] }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const { result } = renderHook(() => useProgression(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // A streak that climbs to 6 then a later shorter streak of 2 must not
      // reduce progress, and repeated maxes must not accumulate.
      act(() => { result.current.updateChapterQuestProgress('streakMaster', 4, ['q-max'], 'max'); });
      act(() => { result.current.updateChapterQuestProgress('streakMaster', 6, ['q-max'], 'max'); });
      act(() => { result.current.updateChapterQuestProgress('streakMaster', 2, ['q-max'], 'max'); });

      expect(result.current.progression?.chapterQuestProgress?.['q-max']).toBe(6);
    });
  });
});
