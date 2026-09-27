import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Storage + helpers are mocked so we control localStorage truthiness and the
// "today" date deterministically.
vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedWordHuntToday: vi.fn(() => false),
  hasPlayedWordWheelToday: vi.fn(() => false),
}));
vi.mock('@/utils/dailyChallenge/dateUtils', () => ({
  getDailyChallengeDate: vi.fn(() => '2026-06-05'),
}));
vi.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: vi.fn(() => 'guest-fp-fallback'),
}));

import { hasPlayedWordHuntToday, hasPlayedWordWheelToday } from '@/utils/dailyChallenge/storage';
import { getGuestFingerprint } from '@/utils/guestManager';
import { useDailyModePlayed } from '../useDailyModePlayed';

const authedIdentity = {
  isAuthenticated: true,
  playerId: 'player-1',
  guestFingerprint: null as string | null,
  isPractice: false,
};

function stubFetchHasPlayed(hasPlayed: boolean) {
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ hasPlayed }) } as Response),
  ) as unknown as typeof fetch;
}

function firstFetchUrl(): string {
  return vi.mocked(global.fetch).mock.calls[0][0] as string;
}

describe('useDailyModePlayed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasPlayedWordHuntToday).mockReturnValue(false);
    vi.mocked(hasPlayedWordWheelToday).mockReturnValue(false);
    stubFetchHasPlayed(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true immediately from localStorage without hitting the server', () => {
    vi.mocked(hasPlayedWordHuntToday).mockReturnValue(true);

    const { result } = renderHook(() => useDailyModePlayed('word-hunt', 'he', authedIdentity));

    expect(result.current).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('resolves true from the server-of-record when localStorage is empty (cross-device)', async () => {
    vi.mocked(hasPlayedWordHuntToday).mockReturnValue(false);
    stubFetchHasPlayed(true);

    const { result } = renderHook(() => useDailyModePlayed('word-hunt', 'he', authedIdentity));

    // Optimistic local value first…
    expect(result.current).toBe(false);
    // …then corrected by the authoritative server check.
    await waitFor(() => expect(result.current).toBe(true));

    const url = firstFetchUrl();
    expect(url).toContain('/api/daily-challenge/word-hunt/check-played/2026-06-05/he');
    expect(url).toContain('playerId=player-1');
  });

  it('stays false when both localStorage and server report not played', async () => {
    stubFetchHasPlayed(false);

    const { result } = renderHook(() => useDailyModePlayed('word-hunt', 'he', authedIdentity));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('does not call the server in practice mode', () => {
    const { result } = renderHook(() =>
      useDailyModePlayed('word-hunt', 'he', { ...authedIdentity, isPractice: true }),
    );

    expect(result.current).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('queries the word-wheel endpoint for the word-wheel mode (per-mode routing)', async () => {
    stubFetchHasPlayed(true);

    const { result } = renderHook(() => useDailyModePlayed('word-wheel', 'en', authedIdentity));

    await waitFor(() => expect(result.current).toBe(true));
    expect(firstFetchUrl()).toContain('/api/daily-challenge/word-wheel/check-played/2026-06-05/en');
  });

  it('uses guestFingerprint for unauthenticated users', async () => {
    stubFetchHasPlayed(true);

    const { result } = renderHook(() =>
      useDailyModePlayed('word-hunt', 'he', {
        isAuthenticated: false,
        playerId: null,
        guestFingerprint: 'fp-xyz',
        isPractice: false,
      }),
    );

    await waitFor(() => expect(result.current).toBe(true));
    expect(firstFetchUrl()).toContain('guestFingerprint=fp-xyz');
  });

  it('keeps the (false) local value when the server check errors out', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('network'))) as unknown as typeof fetch;

    const { result } = renderHook(() => useDailyModePlayed('word-hunt', 'he', authedIdentity));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('falls back to getGuestFingerprint() when no fingerprint is passed', async () => {
    stubFetchHasPlayed(true);
    vi.mocked(getGuestFingerprint).mockReturnValue('guest-fp-fallback');

    const { result } = renderHook(() =>
      useDailyModePlayed('word-hunt', 'he', {
        isAuthenticated: false,
        playerId: null,
        guestFingerprint: null,
        isPractice: false,
      }),
    );

    await waitFor(() => expect(result.current).toBe(true));
    expect(firstFetchUrl()).toContain('guestFingerprint=guest-fp-fallback');
  });

  it('does not query the server when no identity is resolvable', () => {
    vi.mocked(getGuestFingerprint).mockReturnValue('');

    const { result } = renderHook(() =>
      useDailyModePlayed('word-hunt', 'he', {
        isAuthenticated: false,
        playerId: null,
        guestFingerprint: null,
        isPractice: false,
      }),
    );

    expect(result.current).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
