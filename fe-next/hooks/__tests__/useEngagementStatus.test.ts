/**
 * useEngagementStatus Hook Tests
 *
 * Tests for the engagement status hook that provides
 * streak, XP, gold, and level data for the StreakBar.
 */

import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock AuthContext — vi.fn stored in var to avoid hoisting issue
const { mockUseAuth } = vi.hoisted(() => {
  const mockUseAuth = vi.fn();
  return { mockUseAuth };
});
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

// Mock supabase — use a module-level vi.fn for `from`
const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  return { mockFrom };
});
vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

// Mock adventureXpUtils
vi.mock('@/shared/utils/adventureXpUtils', () => ({
  getXpForLevel: vi.fn((level: number) => {
    const xpTable: Record<number, number> = { 1: 0, 2: 100, 3: 250, 4: 500, 5: 800, 6: 1200 };
    return xpTable[level] ?? level * 100;
  }),
  getLevelFromXp: vi.fn(),
}));

import { useEngagementStatus } from '../useEngagementStatus';

// Helper to create a chained Supabase query mock
function createChain(data: Record<string, unknown> | null, error: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  };
}

const engagementData = {
  current_streak: 7,
  longest_streak: 14,
  streak_freezes_available: 2,
  games_today: 3,
};

const profileData = {
  total_xp: 350,
  current_level: 3,
  total_coins: 1500,
};

// Provide real localStorage backend
const localStore: Record<string, string> = {};

describe('useEngagementStatus', () => {
  beforeEach(() => {
    for (const k of Object.keys(localStore)) delete localStore[k];
    (localStorage.getItem as any).mockImplementation((key: string) => localStore[key] ?? null);
    (localStorage.setItem as any).mockImplementation((key: string, val: string) => { localStore[key] = val; });
    (localStorage.removeItem as any).mockImplementation((key: string) => { delete localStore[key]; });
    (localStorage.clear as any).mockImplementation(() => { for (const k of Object.keys(localStore)) delete localStore[k]; });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Default: authenticated user
    mockUseAuth.mockReturnValue({ user: { id: 'test-user-123' }, isAuthenticated: true });

    // Default: successful Supabase responses
    mockFrom.mockImplementation((table: string) => {
      if (table === 'player_engagement') return createChain(engagementData);
      if (table === 'profiles') return createChain(profileData);
      return createChain(null, { message: 'Unknown table' });
    });
  });

  it('should return loading state initially', () => {
    const { result } = renderHook(() => useEngagementStatus());
    expect(result.current.loading).toBe(true);
  });

  it('should fetch and return engagement data for authenticated users', async () => {
    const { result } = renderHook(() => useEngagementStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.streak).toBe(7);
    expect(result.current.level).toBe(3);
    expect(result.current.gold).toBe(1500);
    expect(result.current.xp).toBe(350);
  });

  it('should calculate streakAtRisk when close to midnight', async () => {
    const now = new Date();
    now.setHours(23, 0, 0, 0);
    vi.spyOn(Date, 'now').mockReturnValue(now.getTime());

    const { result } = renderHook(() => useEngagementStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.streakAtRisk).toBe(true);
    vi.restoreAllMocks();
  });

  it('should NOT show streakAtRisk when far from midnight', async () => {
    const now = new Date();
    now.setHours(10, 0, 0, 0);
    vi.spyOn(Date, 'now').mockReturnValue(now.getTime());

    const { result } = renderHook(() => useEngagementStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.streakAtRisk).toBe(false);
    vi.restoreAllMocks();
  });

  it('should return defaults for unauthenticated users', () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });

    const { result } = renderHook(() => useEngagementStatus());

    expect(result.current.loading).toBe(false);
    expect(result.current.streak).toBe(0);
    expect(result.current.level).toBe(1);
    expect(result.current.gold).toBe(0);
  });

  it('should cache data in localStorage', async () => {
    const { result } = renderHook(() => useEngagementStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const cached = localStorage.getItem('lexiclash_engagement_status');
    expect(cached).toBeTruthy();
    const parsed = JSON.parse(cached!);
    expect(parsed.streak).toBe(7);
  });

  it('should calculate XP progress correctly', async () => {
    const { result } = renderHook(() => useEngagementStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Level 3: xpForLevel(3)=250, xpForLevel(4)=500
    // totalXp=350, so xpProgress = (350-250)/(500-250) = 100/250 = 0.4
    expect(result.current.xpProgress).toBeCloseTo(0.4);
  });

  it('should handle API errors gracefully', async () => {
    mockFrom.mockImplementation(() => createChain(null, { message: 'Network error' }));

    const { result } = renderHook(() => useEngagementStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.streak).toBe(0);
    expect(result.current.level).toBe(1);
  });
});
