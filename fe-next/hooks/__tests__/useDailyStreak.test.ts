import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Control the localStorage fallback deterministically.
vi.mock('@/utils/dailyChallenge', () => ({
  getDailyStreak: vi.fn(() => ({ currentStreak: 3 })),
}));

import { getDailyStreak } from '@/utils/dailyChallenge';
import { useDailyStreak } from '../useDailyStreak';

describe('useDailyStreak — server (all-modes chest) streak is the source of truth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDailyStreak).mockReturnValue({ currentStreak: 3 } as ReturnType<typeof getDailyStreak>);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('seeds from the localStorage streak for an instant first paint', () => {
    // No fetch resolution yet — the hook should paint the local value immediately.
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const { result } = renderHook(() => useDailyStreak());
    expect(result.current.streak).toBe(3);
  });

  it('replaces the local seed with the authoritative server streak', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ currentStreak: 12 }),
      }),
    );
    const { result } = renderHook(() => useDailyStreak());
    await waitFor(() => expect(result.current.streak).toBe(12));
    expect(result.current.loading).toBe(false);
  });

  it('keeps the local fallback when the request fails (offline / guest 401)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    const { result } = renderHook(() => useDailyStreak());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.streak).toBe(3);
  });

  it('never throws when fetch is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const { result } = renderHook(() => useDailyStreak());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.streak).toBe(3);
  });
});
