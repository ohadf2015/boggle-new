/**
 * useDynamicDifficulty Hook Tests
 *
 * Tests difficulty offset fetching and game result reporting via RPC.
 */

import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// --- Mocks ---

const mockUser = { id: 'test-user-id' };
const mockUseAuth = vi.fn(() => ({ user: mockUser }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const { mockFrom, mockRpc } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();
  return { mockFrom, mockRpc };
});
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { useDynamicDifficulty } from '../useDynamicDifficulty';

// --- Helpers ---

function makeTrackingRow(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 'test-user-id',
    game_mode: 'classic',
    recent_wins: 7,
    recent_games: 10,
    win_rate: 0.7,
    difficulty_offset: 2,
    last_adjustment_at: '2026-03-23T00:00:00Z',
    ...overrides,
  };
}

function setupFetchSuccess(row: Record<string, unknown>) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: row, error: null }),
        }),
      }),
    }),
  });
}

function setupFetchNoData() {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        }),
      }),
    }),
  });
}

// --- Tests ---

describe('useDynamicDifficulty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  describe('Given no authenticated user', () => {
    it('should return default offset of 0 and stop loading', async () => {
      mockUseAuth.mockReturnValue({ user: null as any });
      setupFetchNoData();

      const { result } = renderHook(() => useDynamicDifficulty('classic'));

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.difficultyOffset).toBe(0);
      expect(result.current.winRate).toBe(0);
    });
  });

  describe('Given an authenticated user', () => {
    it('should fetch difficulty tracking on mount', async () => {
      const row = makeTrackingRow();
      setupFetchSuccess(row);

      const { result } = renderHook(() => useDynamicDifficulty('classic'));

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.difficultyOffset).toBe(2);
      expect(result.current.winRate).toBe(0.7);
    });

    it('should return default offset when no tracking data exists', async () => {
      setupFetchNoData();

      const { result } = renderHook(() => useDynamicDifficulty('classic'));

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.difficultyOffset).toBe(0);
      expect(result.current.winRate).toBe(0);
    });
  });

  describe('reportGameResult', () => {
    it('should call RPC with correct parameters and update state', async () => {
      setupFetchSuccess(makeTrackingRow());

      const updatedRow = makeTrackingRow({
        recent_wins: 8,
        recent_games: 11,
        win_rate: 0.73,
        difficulty_offset: 3,
      });
      mockRpc.mockResolvedValue({ data: updatedRow, error: null });

      const { result } = renderHook(() => useDynamicDifficulty('classic'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.reportGameResult(true);
      });

      expect(mockRpc).toHaveBeenCalledWith('update_difficulty_after_game', {
        p_user_id: 'test-user-id',
        p_game_mode: 'classic',
        p_won: true,
      });
      expect(result.current.difficultyOffset).toBe(3);
      expect(result.current.winRate).toBe(0.73);
    });

    it('should not call RPC when no user', async () => {
      mockUseAuth.mockReturnValue({ user: null as any });
      setupFetchNoData();

      const { result } = renderHook(() => useDynamicDifficulty('classic'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.reportGameResult(false);
      });

      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('should handle RPC returning no data by refetching', async () => {
      setupFetchSuccess(makeTrackingRow());

      const { result } = renderHook(() => useDynamicDifficulty('classic'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      // RPC returns null data (no error)
      mockRpc.mockResolvedValue({ data: null, error: null });

      // Re-setup from for the refetch
      setupFetchSuccess(makeTrackingRow({ difficulty_offset: 5 }));

      await act(async () => {
        await result.current.reportGameResult(true);
      });

      // Should have called rpc
      expect(mockRpc).toHaveBeenCalled();
    });
  });
});
