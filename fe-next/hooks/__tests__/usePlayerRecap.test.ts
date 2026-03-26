/**
 * usePlayerRecap Hook Tests
 *
 * Tests weekly and monthly recap fetching, including fallback computation.
 */

import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// --- Mocks ---

const mockUser = { id: 'test-user-id' };
const mockUseAuth = vi.fn(() => ({ user: mockUser }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  return { mockFrom };
});
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { usePlayerRecap } from '../usePlayerRecap';

// --- Helpers ---

function makeRecapRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'recap-1',
    user_id: 'test-user-id',
    period_type: 'weekly',
    period_start: '2026-03-16',
    period_end: '2026-03-23',
    total_games: 10,
    total_score: 2500,
    total_words: 120,
    longest_word: 'QUARTZ',
    rarest_word: 'ZEPHYR',
    best_score: 450,
    best_combo: 8,
    streak_days: 5,
    rank_change: 3,
    games_won: 7,
    favorite_mode: 'classic',
    unique_words_found: 85,
    improvement_percent: 12,
    created_at: '2026-03-23T00:00:00Z',
    ...overrides,
  };
}

function makeGameResultRow(overrides: Record<string, unknown> = {}) {
  return {
    score: 200,
    words_found: ['CAT', 'DOG', 'FISH'],
    best_word: 'FISH',
    combo_max: 3,
    game_mode: 'classic',
    won: true,
    created_at: '2026-03-20T00:00:00Z',
    ...overrides,
  };
}

// --- Tests ---

describe('usePlayerRecap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  describe('Given no authenticated user', () => {
    it('should return null recaps and stop loading', async () => {
      mockUseAuth.mockReturnValue({ user: null as any });

      const { result } = renderHook(() => usePlayerRecap());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.weeklyRecap).toBeNull();
      expect(result.current.monthlyRecap).toBeNull();
    });
  });

  describe('Given pre-computed recaps exist', () => {
    it('should fetch weekly recap from player_recaps table', async () => {
      const weeklyRow = makeRecapRow({ period_type: 'weekly' });
      const monthlyRow = makeRecapRow({ id: 'recap-2', period_type: 'monthly', period_start: '2026-03-01' });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'player_recaps') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [weeklyRow, monthlyRow],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      });

      const { result } = renderHook(() => usePlayerRecap());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.weeklyRecap).not.toBeNull();
      expect(result.current.weeklyRecap?.periodType).toBe('weekly');
      expect(result.current.weeklyRecap?.totalGames).toBe(10);
      expect(result.current.monthlyRecap).not.toBeNull();
      expect(result.current.monthlyRecap?.periodType).toBe('monthly');
    });
  });

  describe('Given no pre-computed recaps, fallback to game_results', () => {
    it('should compute weekly recap from game results', async () => {
      const gameRows = [
        makeGameResultRow({ score: 200, words_found: ['CAT', 'DOG'], combo_max: 3, won: true }),
        makeGameResultRow({ score: 300, words_found: ['FISH', 'BIRD', 'ELEPHANT'], combo_max: 5, won: false }),
      ];

      mockFrom.mockImplementation((table: string) => {
        if (table === 'player_recaps') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'game_results') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: gameRows, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const { result } = renderHook(() => usePlayerRecap());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.weeklyRecap).not.toBeNull();
      expect(result.current.weeklyRecap?.totalGames).toBe(2);
      expect(result.current.weeklyRecap?.totalScore).toBe(500);
      expect(result.current.weeklyRecap?.bestScore).toBe(300);
      expect(result.current.weeklyRecap?.bestCombo).toBe(5);
      expect(result.current.weeklyRecap?.gamesWon).toBe(1);
      expect(result.current.weeklyRecap?.longestWord).toBe('ELEPHANT');
    });
  });

  describe('Given no game results at all', () => {
    it('should handle missing recap gracefully with null', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'player_recaps') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'game_results') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const { result } = renderHook(() => usePlayerRecap());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.weeklyRecap).toBeNull();
      expect(result.current.monthlyRecap).toBeNull();
    });
  });

  describe('Given a fetch error', () => {
    it('should return null recaps on error', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockRejectedValue(new Error('Network error')),
          }),
        }),
      }));

      const { result } = renderHook(() => usePlayerRecap());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.weeklyRecap).toBeNull();
      expect(result.current.monthlyRecap).toBeNull();
    });
  });
});
