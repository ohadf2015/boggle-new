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

const mockFrictionVariant = vi.fn<() => 'control' | 'soft-sheet'>();
const mockTrackFrictionExposure = vi.fn();
vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({
    variant: mockFrictionVariant(),
    trackExposure: mockTrackFrictionExposure,
  }),
}));

// Active-game gate: the prompt must never interrupt live gameplay. Default
// false (no active game) so all pre-existing behaviour tests are unaffected.
const mockIsGameActive = vi.fn<() => boolean>();
vi.mock('@/utils/abandonOnPagehide', () => ({
  isGameActive: () => mockIsGameActive(),
}));

import { useSignupPrompt } from '../useSignupPrompt';

const flushTimer = async (ms = 1600): Promise<void> => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

// t_da22db9a: the prompt no longer fires at app boot — it requires a fresh
// `guestStatsChanged` (a game just completed this SPA session). Helper models
// production: saveGuestStats writes stats, then dispatches the window event.
const qualifyWithFreshGame = async (stats: unknown): Promise<void> => {
  mockStats.mockReturnValue(stats);
  await act(async () => {
    window.dispatchEvent(new Event('guestStatsChanged'));
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  mockFlag.mockReturnValue('after-first-win');
  mockStats.mockReturnValue({ games: 0, wins: 0 });
  mockConsentDecided.mockReturnValue(true);
  mockIsGameActive.mockReturnValue(false);
  mockFrictionVariant.mockReturnValue('soft-sheet');
  mockTrackFrictionExposure.mockClear();
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
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await qualifyWithFreshGame({ games: 1, wins: 1 });
    await flushTimer();
    expect(result.current.showSignupModal).toBe(true);
  });

  it('fallback: shows after 5 games even with 0 wins', async () => {
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await qualifyWithFreshGame({ games: 5, wins: 0 });
    await flushTimer();
    expect(result.current.showSignupModal).toBe(true);
  });

  it('does NOT fire at app boot even when stored stats qualify (returning guest)', async () => {
    // t_da22db9a: PostHog 14d showed the sheet popping 1.5s after boot on
    // /en/daily and /en/education/* for guests with qualifying history —
    // mistimed, and often under a z-90 results dialog. The prompt now only
    // fires after a game completes IN this session.
    mockStats.mockReturnValue({ games: 10, wins: 5 });
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await flushTimer();
    expect(result.current.showSignupModal).toBe(false);
    expect(mockTrackSignupFunnel).not.toHaveBeenCalled();
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
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await qualifyWithFreshGame({ games: 3, wins: 0 });
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
    // t_da22db9a: the shown event now carries the surface prop so the UR
    // funnel can split sheet vs dialog arms.
    expect(mockTrackSignupFunnel).toHaveBeenCalledWith('prompt_shown', true, {
      surface: 'soft-sheet',
    });
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
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await qualifyWithFreshGame({ games: 1, wins: 1 });
    await flushTimer();
    expect(result.current.showSignupModal).toBe(true);
    expect(result.current.isFirstWin).toBe(true);
  });

  it('exposes isFirstWin=false when shown via 5-game fallback', async () => {
    mockFlag.mockReturnValue('after-first-win');
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await qualifyWithFreshGame({ games: 5, wins: 0 });
    await flushTimer();
    expect(result.current.showSignupModal).toBe(true);
    expect(result.current.isFirstWin).toBe(false);
  });

  it('exposes isFirstWin=false for after-third-game variant', async () => {
    mockFlag.mockReturnValue('after-third-game');
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await qualifyWithFreshGame({ games: 3, wins: 2 });
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
    renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await qualifyWithFreshGame({ games: 1, wins: 1 });
    await flushTimer();
    expect(mockTrackSignupFunnel).toHaveBeenCalledTimes(1);
    expect(mockTrackSignupFunnel).toHaveBeenCalledWith('prompt_shown', true, {
      surface: 'soft-sheet',
    });
  });

  it('emits signup_prompt_shown when first-win qualifies via 5-game fallback', async () => {
    mockFlag.mockReturnValue('after-first-win');
    renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await qualifyWithFreshGame({ games: 5, wins: 0 });
    await flushTimer();
    expect(mockTrackSignupFunnel).toHaveBeenCalledTimes(1);
    expect(mockTrackSignupFunnel).toHaveBeenCalledWith('prompt_shown', false, {
      surface: 'soft-sheet',
    });
  });

  it('emits signup_prompt_shown for after-third-game variant', async () => {
    mockFlag.mockReturnValue('after-third-game');
    renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await qualifyWithFreshGame({ games: 3, wins: 0 });
    await flushTimer();
    expect(mockTrackSignupFunnel).toHaveBeenCalledTimes(1);
    expect(mockTrackSignupFunnel).toHaveBeenCalledWith('prompt_shown', false, {
      surface: 'soft-sheet',
    });
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
    const { rerender } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await qualifyWithFreshGame({ games: 1, wins: 1 });
    await flushTimer();
    rerender();
    await flushTimer();
    expect(mockTrackSignupFunnel).toHaveBeenCalledTimes(1);
  });
});

describe('useSignupPrompt — active-game deferral', () => {
  it('does NOT interrupt live gameplay: defers show + telemetry while a game is active', async () => {
    mockIsGameActive.mockReturnValue(true);
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    // Fresh game completes mid-session while another game is live: timer is
    // scheduled, fires, and must defer WITHOUT latching (t_da22db9a boot gate
    // means the event, not the mount, starts evaluation).
    await qualifyWithFreshGame({ games: 1, wins: 1 });
    await flushTimer();
    expect(result.current.showSignupModal).toBe(false);
    expect(mockTrackSignupFunnel).not.toHaveBeenCalled();
    // Crucially the once-per-session flag must NOT be latched during gameplay,
    // or the prompt would be lost for the whole session.
    expect(window.sessionStorage.getItem('boggle_sp_signup_shown')).toBeNull();
  });

  it('shows after the game ends and stats change again', async () => {
    mockIsGameActive.mockReturnValue(true);
    mockStats.mockReturnValue({ games: 1, wins: 1 });
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await flushTimer();
    expect(result.current.showSignupModal).toBe(false);

    // Game ends → no active game → next stats-change re-evaluates and shows.
    mockIsGameActive.mockReturnValue(false);
    mockStats.mockReturnValue({ games: 2, wins: 1 });
    await act(async () => {
      window.dispatchEvent(new Event('guestStatsChanged'));
    });
    await flushTimer();
    expect(result.current.showSignupModal).toBe(true);
    expect(mockTrackSignupFunnel).toHaveBeenCalledWith('prompt_shown', true, {
      surface: 'soft-sheet',
    });
  });
});

describe('useSignupPrompt — cookie consent gating', () => {
  it('does NOT show while cookie consent is undecided, even if qualified', async () => {
    mockConsentDecided.mockReturnValue(false);
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await qualifyWithFreshGame({ games: 1, wins: 1 });
    await flushTimer();
    expect(result.current.showSignupModal).toBe(false);
    expect(mockTrackSignupFunnel).not.toHaveBeenCalled();
  });

  it('shows once consent is decided and a fresh game has completed', async () => {
    mockConsentDecided.mockReturnValue(false);
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await qualifyWithFreshGame({ games: 1, wins: 1 });
    await flushTimer();
    expect(result.current.showSignupModal).toBe(false);

    // User clicks Accept/Decline → useConsentDecided flips → effect re-runs;
    // the next completed game (guestStatsChanged) starts the timer.
    mockConsentDecided.mockReturnValue(true);
    await qualifyWithFreshGame({ games: 2, wins: 1 });
    await flushTimer();
    expect(result.current.showSignupModal).toBe(true);
    expect(mockTrackSignupFunnel).toHaveBeenCalledWith('prompt_shown', true, {
      surface: 'soft-sheet',
    });
  });
});

describe('useSignupPrompt — friction timing + latch', () => {
  it('uses peak 1.5s delay on soft-sheet (default)', async () => {
    mockFrictionVariant.mockReturnValue('soft-sheet');
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await qualifyWithFreshGame({ games: 1, wins: 1 });
    await act(async () => { vi.advanceTimersByTime(1400); });
    expect(result.current.showSignupModal).toBe(false);
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(result.current.showSignupModal).toBe(true);
    expect(result.current.frictionVariant).toBe('soft-sheet');
  });

  it('keeps legacy 3.5s delay on control', async () => {
    mockFrictionVariant.mockReturnValue('control');
    const { result } = renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    await qualifyWithFreshGame({ games: 1, wins: 1 });
    await act(async () => { vi.advanceTimersByTime(3400); });
    expect(result.current.showSignupModal).toBe(false);
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(result.current.showSignupModal).toBe(true);
  });

  it('re-checks sessionStorage inside the timer (no double fire across mounts)', async () => {
    renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    renderHook(() =>
      useSignupPrompt({ isAuthenticated: false, hasUser: false, authLoading: false })
    );
    // One fresh game completes; both parallel mounts schedule a timer, the
    // in-timer sessionStorage re-check must let exactly one fire.
    await qualifyWithFreshGame({ games: 1, wins: 1 });
    await flushTimer();
    expect(mockTrackSignupFunnel).toHaveBeenCalledTimes(1);
    expect(mockTrackSignupFunnel).toHaveBeenCalledWith('prompt_shown', true, {
      surface: 'soft-sheet',
    });
  });
});
