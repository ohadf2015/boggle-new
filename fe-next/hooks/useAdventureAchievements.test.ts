/**
 * useAdventureAchievements Hook Tests
 *
 * Tests for adventure achievement state management hook with localStorage persistence
 * and server sync via /api/adventure/achievements.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdventureAchievements } from './useAdventureAchievements';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch
const mockFetch = vi.fn();

function mockFetchGet(counts: Record<string, number>) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ counts }),
  });
}

function mockFetchGetError() {
  mockFetch.mockResolvedValueOnce({ ok: false });
}

function mockFetchPost(ok = true) {
  mockFetch.mockResolvedValueOnce({ ok });
}

describe('useAdventureAchievements', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty achievement counts', async () => {
      mockFetchGet({});
      const { result } = renderHook(() => useAdventureAchievements());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(Object.keys(result.current.achievementCounts)).toHaveLength(0);
    });
  });

  describe('server sync on mount', () => {
    it('fetches achievements from server on mount', async () => {
      mockFetchGet({ BOSS_SLAYER: 3 });
      renderHook(() => useAdventureAchievements());

      await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/adventure/achievements'));
    });

    it('merges server counts into local state (server wins per key)', async () => {
      localStorageMock.setItem(
        'lexiclash-adventure-achievements',
        JSON.stringify({ BOSS_SLAYER: 1, FIRST_WORD: 2 })
      );
      mockFetchGet({ BOSS_SLAYER: 5 }); // server has higher count for BOSS_SLAYER

      const { result } = renderHook(() => useAdventureAchievements());

      await waitFor(() => expect(result.current.getCount('BOSS_SLAYER')).toBe(5));
      // FIRST_WORD not on server — local value preserved
      expect(result.current.getCount('FIRST_WORD')).toBe(2);
    });

    it('keeps local value when it is higher than server', async () => {
      localStorageMock.setItem(
        'lexiclash-adventure-achievements',
        JSON.stringify({ BOSS_SLAYER: 10 })
      );
      mockFetchGet({ BOSS_SLAYER: 3 }); // server behind

      const { result } = renderHook(() => useAdventureAchievements());

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(result.current.getCount('BOSS_SLAYER')).toBe(10);
    });

    it('gracefully handles server fetch failure', async () => {
      mockFetchGetError();
      localStorageMock.setItem(
        'lexiclash-adventure-achievements',
        JSON.stringify({ FIRST_WORD: 1 })
      );

      const { result } = renderHook(() => useAdventureAchievements());

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      // Local state preserved
      expect(result.current.getCount('FIRST_WORD')).toBe(1);
    });

    it('gracefully handles fetch network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      localStorageMock.setItem(
        'lexiclash-adventure-achievements',
        JSON.stringify({ FIRST_WORD: 1 })
      );

      const { result } = renderHook(() => useAdventureAchievements());

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(result.current.getCount('FIRST_WORD')).toBe(1);
    });
  });

  describe('earnAchievement', () => {
    it('earns a new achievement', async () => {
      mockFetchGet({});
      const { result } = renderHook(() => useAdventureAchievements());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      mockFetchPost();
      act(() => {
        result.current.earnAchievement('FIRST_WORD');
      });

      expect(result.current.isEarned('FIRST_WORD')).toBe(true);
      expect(result.current.getCount('FIRST_WORD')).toBe(1);
    });

    it('returns true for first earn', async () => {
      mockFetchGet({});
      const { result } = renderHook(() => useAdventureAchievements());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      mockFetchPost();
      let isNew = false;
      act(() => {
        isNew = result.current.earnAchievement('FIRST_WORD');
      });

      expect(isNew).toBe(true);
    });

    it('returns false for repeat earn of one-time achievement', async () => {
      mockFetchGet({});
      const { result } = renderHook(() => useAdventureAchievements());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      mockFetchPost();
      act(() => {
        result.current.earnAchievement('FIRST_WORD');
      });

      let isNew = true;
      act(() => {
        isNew = result.current.earnAchievement('FIRST_WORD');
      });

      expect(isNew).toBe(false);
      expect(result.current.getCount('FIRST_WORD')).toBe(1);
    });

    it('increments count for repeatable achievements', async () => {
      mockFetchGet({});
      const { result } = renderHook(() => useAdventureAchievements());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      mockFetchPost();
      mockFetchPost();
      mockFetchPost();
      act(() => { result.current.earnAchievement('BOSS_SLAYER'); });
      act(() => { result.current.earnAchievement('BOSS_SLAYER'); });
      act(() => { result.current.earnAchievement('BOSS_SLAYER'); });

      expect(result.current.getCount('BOSS_SLAYER')).toBe(3);
    });

    it('returns true when tier upgrades', async () => {
      mockFetchGet({});
      const { result } = renderHook(() => useAdventureAchievements());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      for (let i = 0; i < 14; i++) {
        mockFetchPost();
        act(() => { result.current.earnAchievement('BOSS_SLAYER'); });
      }

      mockFetchPost();
      let isUpgrade = false;
      act(() => {
        isUpgrade = result.current.earnAchievement('BOSS_SLAYER');
      });

      expect(isUpgrade).toBe(true);
    });

    it('returns false for invalid achievement id', async () => {
      mockFetchGet({});
      const { result } = renderHook(() => useAdventureAchievements());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      let isNew = true;
      act(() => {
        // @ts-expect-error - Testing invalid id
        isNew = result.current.earnAchievement('INVALID_ACHIEVEMENT');
      });

      expect(isNew).toBe(false);
    });

    it('POSTs updated counts to server after earning', async () => {
      mockFetchGet({});
      const { result } = renderHook(() => useAdventureAchievements());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      mockFetchPost();
      act(() => { result.current.earnAchievement('BOSS_SLAYER'); });

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

      const [url, options] = mockFetch.mock.calls[1];
      expect(url).toBe('/api/adventure/achievements');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.counts).toMatchObject({ BOSS_SLAYER: 1 });
    });

    it('does not fail if POST to server fails', async () => {
      mockFetchGet({});
      const { result } = renderHook(() => useAdventureAchievements());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      // Should not throw
      act(() => { result.current.earnAchievement('BOSS_SLAYER'); });

      expect(result.current.getCount('BOSS_SLAYER')).toBe(1);
    });
  });

  describe('isEarned', () => {
    it('returns true for earned achievement', async () => {
      mockFetchGet({});
      const { result } = renderHook(() => useAdventureAchievements());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      mockFetchPost();
      act(() => { result.current.earnAchievement('BOSS_SLAYER'); });

      expect(result.current.isEarned('BOSS_SLAYER')).toBe(true);
    });

    it('returns false for unearned achievement', async () => {
      mockFetchGet({});
      const { result } = renderHook(() => useAdventureAchievements());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(result.current.isEarned('BOSS_SLAYER')).toBe(false);
    });
  });

  describe('getCount', () => {
    it('returns correct count for earned achievement', async () => {
      mockFetchGet({});
      const { result } = renderHook(() => useAdventureAchievements());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      mockFetchPost();
      mockFetchPost();
      mockFetchPost();
      act(() => { result.current.earnAchievement('WORD_STREAK_5'); });
      act(() => { result.current.earnAchievement('WORD_STREAK_5'); });
      act(() => { result.current.earnAchievement('WORD_STREAK_5'); });

      expect(result.current.getCount('WORD_STREAK_5')).toBe(3);
    });

    it('returns 0 for unearned achievement', async () => {
      mockFetchGet({});
      const { result } = renderHook(() => useAdventureAchievements());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(result.current.getCount('COMBO_KING')).toBe(0);
    });
  });

  describe('getTierInfo', () => {
    it('returns tier info for achievement', async () => {
      mockFetchGet({});
      const { result } = renderHook(() => useAdventureAchievements());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      mockFetchPost();
      act(() => { result.current.earnAchievement('BOSS_SLAYER'); });

      const tierInfo = result.current.getTierInfo('BOSS_SLAYER');
      expect(tierInfo.count).toBe(1);
      expect(tierInfo.tier).toBe('BRONZE');
      expect(tierInfo.display).toBeDefined();
    });

    it('returns null tier for unearned achievement', async () => {
      mockFetchGet({});
      const { result } = renderHook(() => useAdventureAchievements());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      const tierInfo = result.current.getTierInfo('COMBO_KING');
      expect(tierInfo.count).toBe(0);
      expect(tierInfo.tier).toBeNull();
    });

    it('returns progress info', async () => {
      mockFetchGet({});
      const { result } = renderHook(() => useAdventureAchievements());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      for (let i = 0; i < 10; i++) {
        mockFetchPost();
        act(() => { result.current.earnAchievement('BOSS_SLAYER'); });
      }

      const tierInfo = result.current.getTierInfo('BOSS_SLAYER');
      expect(tierInfo.progress.currentTier).toBe('BRONZE');
      expect(tierInfo.progress.nextTier).toBe('SILVER');
    });
  });

  describe('persistence', () => {
    it('persists achievements to localStorage', async () => {
      mockFetchGet({});
      const { result } = renderHook(() => useAdventureAchievements());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      mockFetchPost();
      act(() => { result.current.earnAchievement('FIRST_WORD'); });

      const stored = localStorageMock.getItem('lexiclash-adventure-achievements');
      expect(stored).toBeTruthy();
      expect(stored).toContain('FIRST_WORD');
    });

    it('restores achievements from localStorage', async () => {
      localStorageMock.setItem(
        'lexiclash-adventure-achievements',
        JSON.stringify({ BOSS_SLAYER: 5, FIRST_WORD: 1 })
      );
      mockFetchGet({});

      const { result } = renderHook(() => useAdventureAchievements());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      expect(result.current.isEarned('BOSS_SLAYER')).toBe(true);
      expect(result.current.getCount('BOSS_SLAYER')).toBe(5);
      expect(result.current.isEarned('FIRST_WORD')).toBe(true);
    });

    it('handles corrupted localStorage gracefully', async () => {
      localStorageMock.setItem(
        'lexiclash-adventure-achievements',
        'not valid json{'
      );
      mockFetchGet({});

      const { result } = renderHook(() => useAdventureAchievements());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      expect(result.current.achievementCounts).toBeDefined();
    });
  });

  describe('multiple achievements', () => {
    it('tracks multiple achievements independently', async () => {
      mockFetchGet({});
      const { result } = renderHook(() => useAdventureAchievements());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());

      mockFetchPost();
      mockFetchPost();
      mockFetchPost();
      mockFetchPost();
      act(() => { result.current.earnAchievement('FIRST_WORD'); });
      act(() => { result.current.earnAchievement('BOSS_SLAYER'); });
      act(() => { result.current.earnAchievement('BOSS_SLAYER'); });
      act(() => { result.current.earnAchievement('WORD_STREAK_5'); });

      expect(result.current.getCount('FIRST_WORD')).toBe(1);
      expect(result.current.getCount('BOSS_SLAYER')).toBe(2);
      expect(result.current.getCount('WORD_STREAK_5')).toBe(1);
    });
  });
});
