/**
 * useVaultBoard Hook Tests
 * Tests for the vault board fetching and countdown hook
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVaultBoard } from '../useVaultBoard';

// Mock supabase client
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockMaybeSingle = vi.fn();

const mockFrom = vi.fn((_table: string) => ({
  select: mockSelect,
}));

mockSelect.mockReturnValue({
  eq: mockEq,
  order: mockOrder,
});

mockEq.mockReturnValue({
  order: mockOrder,
  eq: mockEq,
  maybeSingle: mockMaybeSingle,
  limit: mockLimit,
});

mockOrder.mockReturnValue({
  eq: mockEq,
  limit: mockLimit,
  maybeSingle: mockMaybeSingle,
});

mockLimit.mockResolvedValue({ data: [], error: null });
mockMaybeSingle.mockResolvedValue({ data: null, error: null });

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

describe('useVaultBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockLimit.mockResolvedValue({ data: [], error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start in loading state', () => {
    const { result } = renderHook(() => useVaultBoard());
    expect(result.current.loading).toBe(true);
  });

  it('should return null vault when none active', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockLimit.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useVaultBoard());

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current.vault).toBeNull();
    expect(result.current.isActive).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('should fetch active vault from supabase', async () => {
    const vault = {
      id: 'v-1',
      board_name: 'Midnight Rush',
      grid: [['A', 'B'], ['C', 'D']],
      language: 'en',
      opens_at: '2026-03-22T18:00:00Z',
      closes_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      is_active: true,
      created_at: '2026-03-20T00:00:00Z',
    };

    mockMaybeSingle.mockResolvedValue({ data: vault, error: null });
    mockLimit.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useVaultBoard());

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current.vault).toEqual(vault);
    expect(result.current.isActive).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('should compute timeRemaining from closes_at', async () => {
    const closesAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    const vault = {
      id: 'v-1',
      board_name: 'Test',
      grid: [],
      language: 'en',
      opens_at: '2026-03-22T18:00:00Z',
      closes_at: closesAt.toISOString(),
      is_active: true,
      created_at: '2026-03-20T00:00:00Z',
    };

    mockMaybeSingle.mockResolvedValue({ data: vault, error: null });
    mockLimit.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useVaultBoard());

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    // timeRemaining should be roughly 2 hours in ms
    expect(result.current.timeRemaining).toBeGreaterThan(1.9 * 60 * 60 * 1000);
    expect(result.current.timeRemaining).toBeLessThanOrEqual(2 * 60 * 60 * 1000);
  });

  it('should countdown every second', async () => {
    const closesAt = new Date(Date.now() + 60 * 1000); // 60 seconds
    const vault = {
      id: 'v-1',
      board_name: 'Test',
      grid: [],
      language: 'en',
      opens_at: '2026-03-22T18:00:00Z',
      closes_at: closesAt.toISOString(),
      is_active: true,
      created_at: '2026-03-20T00:00:00Z',
    };

    mockMaybeSingle.mockResolvedValue({ data: vault, error: null });
    mockLimit.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useVaultBoard());

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    const initial = result.current.timeRemaining;

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.timeRemaining).toBeLessThan(initial);
  });

  it('should return leaderboard data', async () => {
    const scores = [
      { id: 's-1', vault_board_id: 'v-1', player_id: 'p-1', score: 500, words_found: 30, display_name: 'Alice' },
      { id: 's-2', vault_board_id: 'v-1', player_id: 'p-2', score: 300, words_found: 20, display_name: 'Bob' },
    ];

    const vault = {
      id: 'v-1',
      board_name: 'Test',
      grid: [],
      language: 'en',
      opens_at: '2026-03-22T18:00:00Z',
      closes_at: new Date(Date.now() + 60000).toISOString(),
      is_active: true,
      created_at: '2026-03-20T00:00:00Z',
    };

    mockMaybeSingle.mockResolvedValue({ data: vault, error: null });
    mockLimit.mockResolvedValue({ data: scores, error: null });

    const { result } = renderHook(() => useVaultBoard());

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current.leaderboard).toEqual(scores);
  });

  it('should handle fetch errors gracefully', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'Network error' } });

    const { result } = renderHook(() => useVaultBoard());

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current.vault).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
