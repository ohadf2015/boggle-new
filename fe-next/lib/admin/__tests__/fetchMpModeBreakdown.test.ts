/**
 * Tests for MP mode breakdown aggregation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchMpModeBreakdown } from '../fetchMpModeBreakdown';
import { createSupabasePublicClient } from '@/lib/supabaseServer';

vi.mock('@/lib/supabaseServer', () => ({
  createSupabasePublicClient: vi.fn(),
}));

describe('fetchMpModeBreakdown', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    };
    (createSupabasePublicClient as any).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when supabase is unavailable', async () => {
    (createSupabasePublicClient as any).mockReturnValue(null);
    const result = await fetchMpModeBreakdown(30);
    expect(result).toEqual([]);
  });

  it('should return correct counts for distinct game modes within time window', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockGte = vi.fn().mockResolvedValue({
      data: [
        { game_mode: 'classic', count: 100 },
        { game_mode: 'blast', count: 50 },
        { game_mode: 'word-hunt', count: 30 },
        { game_mode: 'wheel-rush', count: 20 },
      ],
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      gte: mockGte,
    });

    const result = await fetchMpModeBreakdown(30);

    expect(result).toHaveLength(4);
    expect(result).toContainEqual({ mode: 'classic', playCount: 100 });
    expect(result).toContainEqual({ mode: 'blast', playCount: 50 });
    expect(result).toContainEqual({ mode: 'word-hunt', playCount: 30 });
    expect(result).toContainEqual({ mode: 'wheel-rush', playCount: 20 });
  });

  it('should normalize junk "multiplayer" value to "classic"', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockGte = vi.fn().mockResolvedValue({
      data: [
        { game_mode: 'classic', count: 80 },
        { game_mode: 'multiplayer', count: 20 }, // junk value
        { game_mode: 'blast', count: 30 },
      ],
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      gte: mockGte,
    });

    const result = await fetchMpModeBreakdown(30);

    expect(result).toHaveLength(2);
    expect(result.find(r => r.mode === 'classic')).toEqual({ mode: 'classic', playCount: 100 }); // 80 + 20
    expect(result.find(r => r.mode === 'blast')).toEqual({ mode: 'blast', playCount: 30 });
  });

  it('should handle null/undefined game_mode by filtering it out', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockGte = vi.fn().mockResolvedValue({
      data: [
        { game_mode: 'classic', count: 100 },
        { game_mode: null, count: 10 }, // null mode — filter
        { game_mode: 'blast', count: 50 },
      ],
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      gte: mockGte,
    });

    const result = await fetchMpModeBreakdown(30);

    expect(result).toHaveLength(2);
    expect(result.find(r => r.mode === 'classic')).toEqual({ mode: 'classic', playCount: 100 });
    expect(result.find(r => r.mode === 'blast')).toEqual({ mode: 'blast', playCount: 50 });
  });

  it('should respect time window filter (7 days)', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockGte = vi.fn().mockResolvedValue({
      data: [
        { game_mode: 'classic', count: 50 },
      ],
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      gte: mockGte,
    });

    const result = await fetchMpModeBreakdown(7);

    // Verify the gte call was made with correct date threshold
    expect(mockGte).toHaveBeenCalled();
    const callArg = mockGte.mock.calls[0][1];
    // callArg should be an ISO string from ~7 days ago
    const argDate = new Date(callArg);
    const now = new Date();
    const diffMs = now.getTime() - argDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(6.99);
    expect(diffDays).toBeLessThan(7.01);

    expect(result).toEqual([{ mode: 'classic', playCount: 50 }]);
  });

  it('should sort results by playCount descending', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockGte = vi.fn().mockResolvedValue({
      data: [
        { game_mode: 'word-hunt', count: 10 },
        { game_mode: 'classic', count: 100 },
        { game_mode: 'wheel-rush', count: 5 },
        { game_mode: 'blast', count: 50 },
      ],
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      gte: mockGte,
    });

    const result = await fetchMpModeBreakdown(30);

    expect(result[0]).toEqual({ mode: 'classic', playCount: 100 });
    expect(result[1]).toEqual({ mode: 'blast', playCount: 50 });
    expect(result[2]).toEqual({ mode: 'word-hunt', playCount: 10 });
    expect(result[3]).toEqual({ mode: 'wheel-rush', playCount: 5 });
  });

  it('should return empty array on query error', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockGte = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      gte: mockGte,
    });

    const result = await fetchMpModeBreakdown(30);

    expect(result).toEqual([]);
  });
});
