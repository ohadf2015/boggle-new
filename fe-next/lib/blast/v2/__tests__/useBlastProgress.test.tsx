import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBlastProgress } from '../useBlastProgress';
import { GUEST_PROGRESS_KEY } from '../guestProgress';

type Resp = { ok: boolean; status: number; json: () => Promise<unknown>; text?: () => Promise<string> };

/**
 * Routes fetch by URL so the mount-time GET /api/blast/progress and the
 * clear/open POSTs can be mocked independently. Defaults the progress GET to
 * 401 (guest) unless overridden — keeps the mutation tests free of mount seeding.
 */
function routeFetch(routes: {
  progress?: () => Resp;
  clearLevel?: () => Resp;
  openChest?: () => Resp;
}) {
  return vi.fn((url: string) => {
    if (url.includes('/api/blast/progress')) {
      return Promise.resolve((routes.progress ?? (() => ({ ok: false, status: 401, json: async () => ({}) })))());
    }
    if (url.includes('/api/blast/clear-level')) {
      return Promise.resolve((routes.clearLevel ?? (() => ({ ok: true, status: 200, json: async () => ({ coins: 0, chestProgress: 0, chestNumber: 1 }) })))());
    }
    if (url.includes('/api/blast/open-chest')) {
      return Promise.resolve((routes.openChest ?? (() => ({ ok: true, status: 200, json: async () => ({}) })))());
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  });
}

describe('useBlastProgress', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = routeFetch({}) as unknown as typeof fetch;
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useBlastProgress());
    expect(result.current.state.coins).toBe(0);
    expect(result.current.state.chestNumber).toBe(1);
    expect(result.current.state.chestProgress).toBe(0);
    expect(result.current.clearMutation.status).toBe('idle');
  });

  // ---- Load on mount (Plan 3b) ----

  it('seeds state and progression from a 200 progress payload (authed resume)', async () => {
    global.fetch = routeFetch({
      progress: () => ({
        ok: true,
        status: 200,
        json: async () => ({
          currentLevel: 7,
          maxLevelCleared: 6,
          coins: 540,
          chestNumber: 2,
          chestProgress: 0.35,
          unlocksSeen: { coinOverlay: true },
          locale: 'en',
        }),
      }),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useBlastProgress());

    await waitFor(() => expect(result.current.progressLoaded).toBe(true));
    expect(result.current.currentLevel).toBe(7);
    expect(result.current.maxLevelCleared).toBe(6);
    expect(result.current.isGuest).toBe(false);
    expect(result.current.state.coins).toBe(540);
    expect(result.current.state.chestNumber).toBe(2);
    expect(result.current.state.chestProgress).toBe(0.35);
    expect(result.current.state.unlocksSeenFlag).toEqual({ coinOverlay: true });
  });

  it('clears stale guest localStorage on an authed (200) load — server wins', async () => {
    localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify({ currentLevel: 99, locale: 'en' }));
    global.fetch = routeFetch({
      progress: () => ({
        ok: true,
        status: 200,
        json: async () => ({ currentLevel: 3, maxLevelCleared: 2, coins: 10, chestNumber: 1, chestProgress: 0, unlocksSeen: {}, locale: 'en' }),
      }),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useBlastProgress());
    await waitFor(() => expect(result.current.progressLoaded).toBe(true));
    expect(result.current.currentLevel).toBe(3);
    expect(localStorage.getItem(GUEST_PROGRESS_KEY)).toBeNull();
  });

  it('falls back to guest localStorage on 401', async () => {
    localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify({ currentLevel: 4, locale: 'sv' }));
    // progress route defaults to 401 in routeFetch
    const { result } = renderHook(() => useBlastProgress());

    await waitFor(() => expect(result.current.progressLoaded).toBe(true));
    expect(result.current.isGuest).toBe(true);
    expect(result.current.currentLevel).toBe(4);
    expect(result.current.maxLevelCleared).toBe(3);
    expect(result.current.state.coins).toBe(0);
  });

  it('guest with no localStorage resumes at level 1', async () => {
    const { result } = renderHook(() => useBlastProgress());
    await waitFor(() => expect(result.current.progressLoaded).toBe(true));
    expect(result.current.isGuest).toBe(true);
    expect(result.current.currentLevel).toBe(1);
  });

  it('on a network error, never hangs the boot — defaults + progressLoaded true', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    const { result } = renderHook(() => useBlastProgress());
    await waitFor(() => expect(result.current.progressLoaded).toBe(true));
    expect(result.current.currentLevel).toBe(1);
  });

  // ---- Mutations (existing behavior) ----

  it('clearLevel mutation updates coins and chest progress', async () => {
    global.fetch = routeFetch({
      clearLevel: () => ({ ok: true, status: 200, json: async () => ({ coins: 100, chestProgress: 0.25, chestNumber: 1 }) }),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useBlastProgress());

    const submission = {
      levelNumber: 1,
      locale: 'en' as const,
      wordsFound: ['test'],
      timeSeconds: 30,
      hintsUsed: 0,
      wrongAttempts: 0,
      cascadesTriggered: 0,
    };

    result.current.clearLevel(submission, 100, 5);

    await waitFor(() => {
      expect(result.current.clearMutation.status).toBe('success');
    });

    expect(result.current.state.coins).toBe(100);
    expect(result.current.state.chestProgress).toBe(0.25);
  });

  it('clearLevel forwards submissionId in request body (idempotency)', async () => {
    const fetchMock = routeFetch({
      clearLevel: () => ({ ok: true, status: 200, json: async () => ({ coins: 0, chestProgress: 0, chestNumber: 1 }) }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useBlastProgress());

    const submission = {
      levelNumber: 1,
      locale: 'en' as const,
      wordsFound: ['test'],
      timeSeconds: 30,
      hintsUsed: 0,
      wrongAttempts: 0,
      cascadesTriggered: 0,
      submissionId: 'fixed-uuid-123',
    };

    result.current.clearLevel(submission, 100, 5);

    await waitFor(() => {
      expect(result.current.clearMutation.status).toBe('success');
    });

    const clearCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('clear-level'))!;
    const body = JSON.parse((clearCall[1] as { body: string }).body);
    expect(body.submissionId).toBe('fixed-uuid-123');
  });

  it('openChest mutation resets chest progress and increments chest number', async () => {
    global.fetch = routeFetch({
      openChest: () => ({
        ok: true,
        status: 200,
        json: async () => ({
          coins: 150,
          contents: { tier: 'wood' as const, coins: 250, boosts: [], avatarPart: null, frameSkin: 'wood' },
          nextChestNumber: 2,
        }),
      }),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useBlastProgress());

    result.current.openChest();

    await waitFor(() => {
      expect(result.current.openMutation.status).toBe('success');
    });

    expect(result.current.state.chestProgress).toBe(0);
    expect(result.current.state.chestNumber).toBe(2);
    expect(result.current.state.coins).toBe(150);
  });
});
