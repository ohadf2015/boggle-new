import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock supabase
const mockSupabaseFrom = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

import { useMpWinStreak } from '../useMpWinStreak';

// Mock localStorage
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

function mockAuthenticatedUser(id = 'user-123') {
  mockUseAuth.mockReturnValue({ user: { id }, isAuthenticated: true });
}

function mockUnauthenticatedUser() {
  mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });
}

function mockSupabaseSelect(data: Record<string, unknown> | null, error: unknown = null) {
  mockSupabaseFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  });
}

function mockSupabaseUpdate(data: Record<string, unknown> | null = null, error: unknown = null) {
  const updateChain = {
    eq: vi.fn().mockResolvedValue({ data, error }),
  };
  mockSupabaseFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
    update: vi.fn().mockReturnValue(updateChain),
  });
  return updateChain;
}

describe('useMpWinStreak - Supabase sync', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('fetches from Supabase on mount when authenticated and overrides localStorage', async () => {
    mockAuthenticatedUser();
    mockSupabaseSelect({
      mp_win_streak_classic: 5,
      mp_win_streak_wordhunt: 2,
      mp_best_streak_classic: 8,
      mp_best_streak_wordhunt: 3,
    });

    const { result } = renderHook(() => useMpWinStreak());

    await waitFor(() => {
      expect(result.current.getStreak('classic').current).toBe(5);
    });
    expect(result.current.getStreak('classic').best).toBe(8);
    expect(result.current.getStreak('wordHunt').current).toBe(2);
    expect(result.current.getStreak('wordHunt').best).toBe(3);
  });

  it('does NOT fetch from Supabase when unauthenticated', async () => {
    mockUnauthenticatedUser();

    renderHook(() => useMpWinStreak());

    // Give it a tick
    await new Promise(r => setTimeout(r, 50));
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it('updates Supabase on recordWin for authenticated users', async () => {
    mockAuthenticatedUser();
    const updateChain = mockSupabaseUpdate();

    const { result } = renderHook(() => useMpWinStreak());

    // Wait for initial fetch
    await new Promise(r => setTimeout(r, 50));

    act(() => {
      result.current.recordWin('classic');
    });

    // Should have called update
    await waitFor(() => {
      expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles');
    });
  });

  it('updates Supabase on recordLoss for authenticated users', async () => {
    mockAuthenticatedUser();
    mockSupabaseUpdate();

    const { result } = renderHook(() => useMpWinStreak());
    await new Promise(r => setTimeout(r, 50));

    act(() => {
      result.current.recordWin('classic');
    });
    act(() => {
      result.current.recordLoss('classic');
    });

    await waitFor(() => {
      expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles');
    });
  });

  it('gracefully handles Supabase fetch failure', async () => {
    mockAuthenticatedUser();
    mockSupabaseSelect(null, { message: 'Network error' });

    // Set localStorage values as fallback
    localStorageMock.setItem('lexiclash_mp_win_streak', JSON.stringify({
      classic: { current: 3, best: 3 },
      wordHunt: { current: 0, best: 0 },
    }));

    const { result } = renderHook(() => useMpWinStreak());

    // Should fall back to localStorage
    await waitFor(() => {
      expect(result.current.getStreak('classic').current).toBe(3);
    });
  });
});
