/**
 * Tests for /api/game-mode-stats extended response with mpBreakdown
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';
import { statsCache } from '../_handlers';
import { NextRequest } from 'next/server';

vi.mock('@/lib/landing/fetchGameModeStats', () => ({
  fetchGameModeStats: vi.fn(),
}));

vi.mock('@/lib/admin/fetchMpModeBreakdown', () => ({
  fetchMpModeBreakdown: vi.fn(),
}));

vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: vi.fn(() => ({ success: true })),
}));

const { fetchGameModeStats } = await import('@/lib/landing/fetchGameModeStats');
const { fetchMpModeBreakdown } = await import('@/lib/admin/fetchMpModeBreakdown');

describe('GET /api/game-mode-stats (mpBreakdown)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear cache between tests to prevent cross-contamination
    statsCache.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    statsCache.clear();
  });

  it('should return response with unchanged arena bucket + new mpBreakdown field', async () => {
    (fetchGameModeStats as any).mockResolvedValue([
      { mode: 'practice', playCount: 50 },
      { mode: 'arena', playCount: 200 }, // Combined MP + SP
      { mode: 'daily', playCount: 100 },
    ]);

    (fetchMpModeBreakdown as any).mockResolvedValue([
      { mode: 'classic', playCount: 120 },
      { mode: 'blast', playCount: 60 },
      { mode: 'word-hunt', playCount: 15 },
      { mode: 'wheel-rush', playCount: 5 },
    ]);

    const request = new NextRequest('http://localhost:3000/api/game-mode-stats?days=30');
    const response = await GET(request);
    const data = await response.json();

    // Landing page still gets the original 'arena' bucket
    expect(data.stats).toContainEqual({ mode: 'practice', playCount: 50 });
    expect(data.stats).toContainEqual({ mode: 'arena', playCount: 200 });
    expect(data.stats).toContainEqual({ mode: 'daily', playCount: 100 });

    // Admin gets the new mpBreakdown field
    expect(data.mpBreakdown).toBeDefined();
    expect(data.mpBreakdown).toEqual([
      { mode: 'classic', playCount: 120 },
      { mode: 'blast', playCount: 60 },
      { mode: 'word-hunt', playCount: 15 },
      { mode: 'wheel-rush', playCount: 5 },
    ]);
  });

  it('should use days query parameter for both queries', async () => {
    (fetchGameModeStats as any).mockResolvedValue([]);
    (fetchMpModeBreakdown as any).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/game-mode-stats?days=7');
    await GET(request);

    expect(fetchGameModeStats).toHaveBeenCalledWith(7);
    expect(fetchMpModeBreakdown).toHaveBeenCalledWith(7);
  });

  it('should cap days at 90 for both queries', async () => {
    (fetchGameModeStats as any).mockResolvedValue([]);
    (fetchMpModeBreakdown as any).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/game-mode-stats?days=999');
    await GET(request);

    expect(fetchGameModeStats).toHaveBeenCalledWith(90);
    expect(fetchMpModeBreakdown).toHaveBeenCalledWith(90);
  });

  it('should return empty arrays when both queries fail', async () => {
    (fetchGameModeStats as any).mockResolvedValue([]);
    (fetchMpModeBreakdown as any).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/game-mode-stats');
    const response = await GET(request);
    const data = await response.json();

    expect(Array.isArray(data.stats)).toBe(true);
    expect(Array.isArray(data.mpBreakdown)).toBe(true);
    expect(data.stats.length).toBe(0);
    expect(data.mpBreakdown.length).toBe(0);
  });

  it('should handle mpBreakdown fetch error gracefully', async () => {
    (fetchGameModeStats as any).mockResolvedValue([
      { mode: 'arena', playCount: 100 },
    ]);
    (fetchMpModeBreakdown as any).mockResolvedValue([]); // Error case

    const request = new NextRequest('http://localhost:3000/api/game-mode-stats?days=30');
    const response = await GET(request);
    const data = await response.json();

    expect(data.stats).toEqual([{ mode: 'arena', playCount: 100 }]);
    expect(data.mpBreakdown).toEqual([]);
  });
});
