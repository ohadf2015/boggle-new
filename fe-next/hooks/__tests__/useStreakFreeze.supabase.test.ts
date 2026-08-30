import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StrictMode } from 'react';
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

import { useStreakFreeze } from '../useStreakFreeze';

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

describe('useStreakFreeze - Supabase sync', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('fetches freeze count from Supabase on mount when authenticated', async () => {
    mockAuth();
    mockSupabaseSelect({ streak_freeze_count: 2 });

    const { result } = renderHook(() => useStreakFreeze());

    await waitFor(() => {
      expect(result.current.freezeCount).toBe(2);
    });
  });

  it('does NOT fetch from Supabase when unauthenticated', async () => {
    mockNoAuth();
    renderHook(() => useStreakFreeze());
    await new Promise(r => setTimeout(r, 50));
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it('syncs to Supabase on consumeFreeze for authenticated users', async () => {
    mockAuth();
    mockSupabaseSelect({ streak_freeze_count: 2 });

    const { result } = renderHook(() => useStreakFreeze());
    await waitFor(() => {
      expect(result.current.freezeCount).toBe(2);
    });

    act(() => {
      result.current.consumeFreeze();
    });

    await waitFor(() => {
      expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles');
    });
    expect(result.current.freezeCount).toBe(1);
  });

  it('writes to Supabase exactly once per consume, even when React re-invokes the updater', async () => {
    // React double-invokes state updater callbacks under StrictMode (and may
    // replay them under concurrent rendering), so a network write inside the
    // updater fires twice. The updater must stay pure.
    mockAuth();
    const updateEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateSpy = vi.fn().mockReturnValue({ eq: updateEq });
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { streak_freeze_count: 2 }, error: null }),
        }),
      }),
      update: updateSpy,
    });

    const { result } = renderHook(() => useStreakFreeze(), { wrapper: StrictMode });
    await waitFor(() => {
      expect(result.current.freezeCount).toBe(2);
    });

    updateSpy.mockClear();
    act(() => {
      result.current.consumeFreeze();
    });

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(result.current.freezeCount).toBe(1);
  });

  it('gracefully handles Supabase failure and falls back to localStorage', async () => {
    mockAuth();
    mockSupabaseSelect(null, { message: 'fail' });
    localStorageMock.setItem('lexiclash_streak_freezes', JSON.stringify({ count: 1 }));

    const { result } = renderHook(() => useStreakFreeze());
    await new Promise(r => setTimeout(r, 50));

    // Should keep localStorage value
    expect(result.current.freezeCount).toBe(1);
  });
});
