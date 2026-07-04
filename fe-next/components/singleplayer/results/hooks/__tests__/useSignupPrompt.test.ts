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

const mockTrackSignupFunnel = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackSignupFunnel: (...args: unknown[]) => mockTrackSignupFunnel(...args),
}));

// Cookie-consent gate: the prompt must hold until the user has resolved consent.
// Default true so all pre-existing behaviour tests are unaffected.
const mockConsentDecided = vi.fn<() => boolean>();
vi.mock('@/hooks/useConsentDecided', () => ({
  useConsentDecided: () => mockConsentDecided(),
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
  mockConsentDecided.mockReturnValue(true);
  mockTrackSignupFunnel.mockClear();
  if (typeof window !== 'undefined') {
    window.sessionStorage.clear();
  }
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSignupPrompt — after-first-win variant', () => {
  it('does NOT show before any game is completed (games=0)', async () => {
    mockStats.mockReturnValue({ games: 0, wins: 0 });
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await flushTimer();
    expect(result.current.showSignupModal).toBe(false);
  });

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

  it('does NOT show before any game is completed (games=0)', async () => {
    mockStats.mockReturnValue({ games: 0, wins: 0 });
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await flushTimer();
    expect(result.current.showSignupModal).toBe(false);
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

describe('useSignupPrompt — guestStatsChanged re-evaluation', () => {
  it('does not show on mount with empty stats, then shows after stats-change event grants a win', async () => {
    mockFlag.mockReturnValue('after-first-win');
    mockStats.mockReturnValue({ games: 0, wins: 0 });
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await flushTimer();
    expect(result.current.showSignupModal).toBe(false);
    expect(mockTrackSignupFunnel).not.toHaveBeenCalled();

    mockStats.mockReturnValue({ games: 1, wins: 1 });
    await act(async () => {
      window.dispatchEvent(new Event('guestStatsChanged'));
    });
    await flushTimer();
    expect(result.current.showSignupModal).toBe(true);
    expect(result.current.isFirstWin).toBe(true);
    expect(mockTrackSignupFunnel).toHaveBeenCalledWith('prompt_shown', true);
  });

  it('ignores stats-change event when authenticated', async () => {
    mockStats.mockReturnValue({ games: 0, wins: 0 });
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: true, hasUser: true, authLoading: false })
    );
    await flushTimer();

    mockStats.mockReturnValue({ games: 5, wins: 3 });
    await act(async () => {
      window.dispatchEvent(new Event('guestStatsChanged'));
    });
    await flushTimer();
    expect(result.current.showSignupModal).toBe(false);
  });
});

describe('useSignupPrompt — isFirstWin exposure', () => {
  it('exposes isFirstWin=true when shown via actual win', async () => {
    mockFlag.mockReturnValue('after-first-win');
    mockStats.mockReturnValue({ games: 1, wins: 1 });
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await flushTimer();
    expect(result.current.showSignupModal).toBe(true);
    expect(result.current.isFirstWin).toBe(true);
  });

  it('exposes isFirstWin=false when shown via 5-game fallback', async () => {
    mockFlag.mockReturnValue('after-first-win');
    mockStats.mockReturnValue({ games: 5, wins: 0 });
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await flushTimer();
    expect(result.current.showSignupModal).toBe(true);
    expect(result.current.isFirstWin).toBe(false);
  });

  it('exposes isFirstWin=false for after-third-game variant', async () => {
    mockFlag.mockReturnValue('after-third-game');
    mockStats.mockReturnValue({ games: 3, wins: 2 });
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await flushTimer();
    expect(result.current.showSignupModal).toBe(true);
    expect(result.current.isFirstWin).toBe(false);
  });

  it('isFirstWin defaults to false before modal shows', () => {
    mockStats.mockReturnValue({ games: 0, wins: 0 });
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    expect(result.current.isFirstWin).toBe(false);
  });
});

describe('useSignupPrompt — impression telemetry', () => {
  it('emits first_win_signup_shown when first-win qualifies via actual win', async () => {
    mockFlag.mockReturnValue('after-first-win');
    mockStats.mockReturnValue({ games: 1, wins: 1 });
    renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await flushTimer();
    expect(mockTrackSignupFunnel).toHaveBeenCalledTimes(1);
    expect(mockTrackSignupFunnel).toHaveBeenCalledWith('prompt_shown', true);
  });

  it('emits signup_prompt_shown when first-win qualifies via 5-game fallback', async () => {
    mockFlag.mockReturnValue('after-first-win');
    mockStats.mockReturnValue({ games: 5, wins: 0 });
    renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await flushTimer();
    expect(mockTrackSignupFunnel).toHaveBeenCalledTimes(1);
    expect(mockTrackSignupFunnel).toHaveBeenCalledWith('prompt_shown', false);
  });

  it('emits signup_prompt_shown for after-third-game variant', async () => {
    mockFlag.mockReturnValue('after-third-game');
    mockStats.mockReturnValue({ games: 3, wins: 0 });
    renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await flushTimer();
    expect(mockTrackSignupFunnel).toHaveBeenCalledTimes(1);
    expect(mockTrackSignupFunnel).toHaveBeenCalledWith('prompt_shown', false);
  });

  it('does NOT emit when user does not qualify', async () => {
    mockFlag.mockReturnValue('after-first-win');
    mockStats.mockReturnValue({ games: 2, wins: 0 });
    renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await flushTimer();
    expect(mockTrackSignupFunnel).not.toHaveBeenCalled();
  });

  it('does NOT emit when authenticated', async () => {
    mockStats.mockReturnValue({ games: 10, wins: 5 });
    renderHook(() =>
      useSignupPrompt({ isAuthenticated: true, hasUser: true, authLoading: false })
    );
    await flushTimer();
    expect(mockTrackSignupFunnel).not.toHaveBeenCalled();
  });

  it('does NOT emit twice across re-renders (sessionStorage guard)', async () => {
    mockFlag.mockReturnValue('after-first-win');
    mockStats.mockReturnValue({ games: 1, wins: 1 });
    const { rerender } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await flushTimer();
    rerender();
    await flushTimer();
    expect(mockTrackSignupFunnel).toHaveBeenCalledTimes(1);
  });
});

describe('useSignupPrompt — cookie consent gating', () => {
  it('does NOT show while cookie consent is undecided, even if qualified', async () => {
    mockConsentDecided.mockReturnValue(false);
    mockStats.mockReturnValue({ games: 1, wins: 1 });
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await flushTimer();
    expect(result.current.showSignupModal).toBe(false);
    expect(mockTrackSignupFunnel).not.toHaveBeenCalled();
  });

  it('shows once consent is decided (gate flips on re-render)', async () => {
    mockConsentDecided.mockReturnValue(false);
    mockStats.mockReturnValue({ games: 1, wins: 1 });
    const { result, rerender } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await flushTimer();
    expect(result.current.showSignupModal).toBe(false);

    // User clicks Accept/Decline → useConsentDecided flips → effect re-runs → timer starts.
    mockConsentDecided.mockReturnValue(true);
    rerender();
    await flushTimer();
    expect(result.current.showSignupModal).toBe(true);
    expect(mockTrackSignupFunnel).toHaveBeenCalledWith('prompt_shown', true);
  });
});
