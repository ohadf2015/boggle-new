/**
 * useWordOfTheDay Hook Tests
 */

import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock AuthContext
const { mockUseAuth } = vi.hoisted(() => {
  const mockUseAuth = vi.fn();
  return { mockUseAuth };
});
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

// Mock supabase
const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  return { mockFrom };
});
vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

// Mock LanguageContext — t() returns key (identity) so error assertions
// can verify the canonical i18n key, not a literal string.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

import { useWordOfTheDay } from '../useWordOfTheDay';

function createChain(data: Record<string, unknown> | null, error: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data, error }),
          maybeSingle: vi.fn().mockResolvedValue({ data, error }),
        }),
      }),
    }),
  };
}

// (createTripleEqChain removed — player query now uses 2 .eq() calls, same as createChain)

describe('useWordOfTheDay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null });
  });

  it('should return a word deterministically based on language', async () => {
    mockFrom.mockReturnValue(createChain(null));

    const { result } = renderHook(() => useWordOfTheDay('en'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.word).toBeTruthy();
    expect(typeof result.current.word).toBe('string');
    expect(result.current.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should return same word on multiple renders', async () => {
    mockFrom.mockReturnValue(createChain(null));

    const { result: r1 } = renderHook(() => useWordOfTheDay('en'));
    const { result: r2 } = renderHook(() => useWordOfTheDay('en'));

    await waitFor(() => {
      expect(r1.current.loading).toBe(false);
    });

    expect(r1.current.word).toBe(r2.current.word);
  });

  it('should fetch and populate stats', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        return createChain({ found_count: 10, total_players: 50 });
      }
      return createChain(null);
    });

    mockUseAuth.mockReturnValue({ user: { id: 'user123' } });

    const { result } = renderHook(() => useWordOfTheDay('en'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats.foundCount).toBe(10);
    expect(result.current.stats.totalPlayers).toBe(50);
    expect(result.current.stats.foundPercent).toBe(20);
  });

  it('should check playerFound when user is logged in', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        return createChain({ found_count: 5, total_players: 20 });
      }
      return createChain({ found: true });
    });

    mockUseAuth.mockReturnValue({ user: { id: 'user123' } });

    const { result } = renderHook(() => useWordOfTheDay('en'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.playerFound).toBe(true);
  });

  it('should default playerFound to false when no user', async () => {
    mockFrom.mockReturnValue(createChain(null));
    mockUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useWordOfTheDay('en'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.playerFound).toBe(false);
  });

  it('should handle errors gracefully', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('DB error');
    });

    const { result } = renderHook(() => useWordOfTheDay('en'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Hook now translates via t() — canonical i18n key, no raw English.
    // Per audit 2026-05-02 + memory feedback-hardcoded-leaderboard-error.
    expect(result.current.error).toBe('errors.failedToLoadWordOfTheDay');
  });
});
