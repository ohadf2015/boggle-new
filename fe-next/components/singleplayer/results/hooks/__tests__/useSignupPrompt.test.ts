/**
 * useSignupPrompt tests — gate semantics for first-win variant.
 *
 * Prior bug: 'after-first-win' variant gated on games count (2), not actual win.
 * Correct semantics:
 *   - 'after-first-win': show once guest has ≥1 win (fallback after 5 games without win)
 *   - 'after-third-game': show after 3 games regardless of win
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockFlag = vi.fn<() => string>();
vi.mock('@/hooks/usePostHogFlag', () => ({
  usePostHogFlag: (_flag: string, fallback: string) => mockFlag() ?? fallback,
}));

const mockStats = vi.fn();
vi.mock('@/utils/guestManager', () => ({
  getGuestStats: () => mockStats(),
}));

import { useSignupPrompt } from '../useSignupPrompt';

const flushTimer = async (ms = 3600): Promise<void> => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  mockFlag.mockReturnValue('after-first-win');
  mockStats.mockReturnValue({ games: 0, wins: 0 });
  if (typeof window !== 'undefined') {
    window.sessionStorage.clear();
  }
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSignupPrompt — after-first-win variant', () => {
  it('does NOT show after 2 games with 0 wins', async () => {
    mockStats.mockReturnValue({ games: 2, wins: 0 });
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await flushTimer();
    expect(result.current.showSignupModal).toBe(false);
  });

  it('shows after first win (wins=1, games=1)', async () => {
    mockStats.mockReturnValue({ games: 1, wins: 1 });
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await flushTimer();
    expect(result.current.showSignupModal).toBe(true);
  });

  it('fallback: shows after 5 games even with 0 wins', async () => {
    mockStats.mockReturnValue({ games: 5, wins: 0 });
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await flushTimer();
    expect(result.current.showSignupModal).toBe(true);
  });

  it('does not show when authenticated', async () => {
    mockStats.mockReturnValue({ games: 10, wins: 5 });
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: true, hasUser: true, authLoading: false })
    );
    await flushTimer();
    expect(result.current.showSignupModal).toBe(false);
  });
});

describe('useSignupPrompt — after-third-game variant', () => {
  beforeEach(() => {
    mockFlag.mockReturnValue('after-third-game');
  });

  it('does NOT show after 2 games', async () => {
    mockStats.mockReturnValue({ games: 2, wins: 0 });
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await flushTimer();
    expect(result.current.showSignupModal).toBe(false);
  });

  it('shows after 3 games regardless of wins', async () => {
    mockStats.mockReturnValue({ games: 3, wins: 0 });
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await flushTimer();
    expect(result.current.showSignupModal).toBe(true);
  });
});
