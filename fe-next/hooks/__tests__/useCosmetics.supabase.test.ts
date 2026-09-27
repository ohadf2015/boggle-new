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

vi.mock('@/lib/cosmetics', () => ({
  COSMETICS: [
    { id: 'neon', category: 'tileSkin', unlockCondition: { type: 'purchase', cost: 100 } },
    { id: 'ocean', category: 'boardTheme', unlockCondition: { type: 'free' } },
  ],
  getUnlockedCosmetics: () => [],
  getEquippedCosmetics: () => ({}),
  isUnlocked: () => true,
  getCosmeticsByCategory: () => [],
}));

vi.mock('@/utils/storageHelpers', () => ({
  getJsonFromLocalStorage: vi.fn((key: string, fallback: unknown) => {
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }),
  saveJsonToLocalStorage: vi.fn((key: string, value: unknown) => {
    localStorage.setItem(key, JSON.stringify(value));
  }),
}));

import { useCosmetics } from '../useCosmetics';

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

const defaultInput = { rankTier: 'Gold', streakDays: 5, coins: 500 };

describe('useCosmetics - Supabase sync', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('fetches equipped/purchased from Supabase on mount when authenticated', async () => {
    mockAuth();
    mockSupabaseSelect({
      equipped_cosmetics: { tileSkin: 'neon' },
      purchased_cosmetics: ['neon'],
    });

    const { result } = renderHook(() => useCosmetics(defaultInput));

    await waitFor(() => {
      // The hook should have loaded server data
      expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles');
    });
  });

  it('does NOT fetch from Supabase when unauthenticated', async () => {
    mockNoAuth();
    renderHook(() => useCosmetics(defaultInput));
    await new Promise(r => setTimeout(r, 50));
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it('syncs to Supabase on equipCosmetic for authenticated users', async () => {
    mockAuth();
    mockSupabaseSelect({
      equipped_cosmetics: {},
      purchased_cosmetics: ['neon'],
    });

    const { result } = renderHook(() => useCosmetics(defaultInput));
    await waitFor(() => {
      expect(mockSupabaseFrom).toHaveBeenCalled();
    });

    vi.clearAllMocks();
    mockSupabaseSelect({ equipped_cosmetics: {}, purchased_cosmetics: ['neon'] });

    act(() => {
      result.current.equipCosmetic('neon');
    });

    await waitFor(() => {
      expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles');
    });
  });

  it('gracefully handles Supabase failure', async () => {
    mockAuth();
    mockSupabaseSelect(null, { message: 'fail' });

    const { result } = renderHook(() => useCosmetics(defaultInput));
    await new Promise(r => setTimeout(r, 50));

    // Should not throw — hook still works
    expect(result.current.equipCosmetic).toBeDefined();
  });
});
