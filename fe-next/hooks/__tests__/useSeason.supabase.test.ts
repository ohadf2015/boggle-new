import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockSupabaseFrom = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

vi.mock('@/lib/seasons', () => ({
  getCurrentSeason: () => ({ id: 1, name: 'Season 1', startDate: '2026-01-01', endDate: '2026-06-01' }),
  getCurrentSeasonDynamic: () => ({ id: 1, name: 'Season 1', startDate: '2026-01-01', endDate: '2026-06-01' }),
  getSeasonTimeRemaining: () => ({ days: 30, hours: 5, minutes: 10 }),
  getSeasonRewards: () => ({ tier: 'Gold', rewards: [] }),
}));

vi.mock('@/shared/utils/eloRating', () => ({
  getRankTier: (elo: number) => {
    if (elo >= 1800) return { name: 'Diamond' };
    if (elo >= 1500) return { name: 'Gold' };
    return { name: 'Bronze' };
  },
}));

import { useSeason } from '../useSeason';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

function mockAuth(id = 'user-123') {
  mockUseAuth.mockReturnValue({ user: { id }, isAuthenticated: true });
}
function mockNoAuth() {
  mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });
}

function mockSupabaseSelect(data: Record<string, unknown> | null, error: unknown = null) {
  mockSupabaseFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  });
}

describe('useSeason - Supabase sync', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('fetches peak tier from Supabase on mount when authenticated', async () => {
    mockAuth();
    mockSupabaseSelect({ season_peak_tier: { '1': 'Platinum' } });

    const { result } = renderHook(() => useSeason());

    await waitFor(() => {
      expect(result.current.peakTier).toBe('Platinum');
    });
  });

  it('does NOT fetch from Supabase when unauthenticated', async () => {
    mockNoAuth();
    renderHook(() => useSeason());
    await new Promise(r => setTimeout(r, 50));
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it('updatePeakTier updates localStorage but does NOT write to Supabase', async () => {
    // Post-20260426 seasons migration the JSONB column is array-shaped and
    // populated server-side only by process_season_reset. The client used
    // to write back here, which corrupted the array. The hook must now stay
    // local-only on tier rises.
    mockAuth();
    mockSupabaseSelect({ season_peak_tier: [] });

    const { result } = renderHook(() => useSeason());
    await waitFor(() => {
      expect(mockSupabaseFrom).toHaveBeenCalled();
    });

    vi.clearAllMocks();

    act(() => {
      result.current.updatePeakTier(1800); // Diamond
    });

    // Allow microtasks to flush; client must not have called Supabase.
    await new Promise((r) => setTimeout(r, 30));
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
    expect(result.current.peakTier).toBe('Diamond');
  });

  it('gracefully handles Supabase failure', async () => {
    mockAuth();
    mockSupabaseSelect(null, { message: 'fail' });

    const { result } = renderHook(() => useSeason());
    await new Promise(r => setTimeout(r, 50));

    // Falls back to default
    expect(result.current.peakTier).toBe('Unranked');
  });
});
