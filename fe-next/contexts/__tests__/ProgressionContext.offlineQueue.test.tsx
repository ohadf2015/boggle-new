/**
 * S6-4 — Offline queue wiring into ProgressionContext.
 * Verifies that failed completeLevel calls enqueue to the offline queue
 * and that queued completions are replayed on reconnect (online event).
 * TDD RED phase.
 */

import { vi } from 'vitest';
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  ProgressionProvider,
  useProgression,
} from '../ProgressionContext';
import * as offlineQueue from '@/lib/adventure/offlineCompletionQueue';

// Spy on the queue functions — re-created in beforeEach since restoreAllMocks un-does them
let enqueueSpy: ReturnType<typeof vi.spyOn>;
let dequeueSpy: ReturnType<typeof vi.spyOn>;
let peekSpy: ReturnType<typeof vi.spyOn>;

// Mock AuthContext
let mockAuthUser: { id: string } | null = { id: 'test-user-123' };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    loading: false,
  }),
}));

// Mock CrazyGames cloud save (imported by ProgressionContext)
vi.mock('@/utils/crazygames/cloudSave', () => ({
  saveToCloud: vi.fn(),
  loadFromCloud: vi.fn().mockResolvedValue(null),
}));

const mockFetch = vi.fn();

// Standard progression for initial load
function makeStateResponse() {
  return {
    ok: true,
    json: async () => ({
      progression: {
        userId: 'test-user-123',
        playerLevel: 5,
        xp: 2500,
        currentWorld: 1,
        currentLevel: 2,
        totalStars: 3,
        completions: [
          { world: 1, level: 1, stars: 3, bestScore: 400, bestWords: 10, completedAt: '2025-01-20T12:00:00Z' },
        ],
        gold: 100,
        upgrades: {},
        skillPoints: 0,
        skillTree: {},
        runeFragments: 0,
        runes: [],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-20T12:00:00Z',
      },
      attempts: [],
    }),
  };
}

function makeCompleteSuccessResponse(world: number, level: number, stars: number) {
  return {
    ok: true,
    json: async () => ({
      success: true,
      progression: {
        playerLevel: 5,
        xp: 2600,
        currentWorld: world,
        currentLevel: level + 1,
        totalStars: 6,
        gold: 125,
        upgrades: {},
      },
      completion: {
        world,
        level,
        stars,
        bestScore: 500,
        bestWords: 12,
        completedAt: new Date().toISOString(),
      },
    }),
  };
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ProgressionProvider>{children}</ProgressionProvider>
);

describe('ProgressionContext — offline queue wiring (S6-4)', () => {
  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockClear();
    mockAuthUser = { id: 'test-user-123' };
    localStorage.clear();
    // Re-create spies each test (restoreAllMocks removes them)
    enqueueSpy = vi.spyOn(offlineQueue, 'enqueueCompletion');
    dequeueSpy = vi.spyOn(offlineQueue, 'dequeueCompletion');
    peekSpy = vi.spyOn(offlineQueue, 'peekQueue').mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('enqueues completion when completeLevel fails with a network error', async () => {
    // GIVEN — initial load succeeds, then complete endpoint throws network error
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/adventure/state')) return Promise.resolve(makeStateResponse());
      if (url.includes('/api/adventure/complete')) return Promise.reject(new TypeError('Failed to fetch'));
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { result } = renderHook(() => useProgression(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // WHEN — completeLevel fails
    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.completeLevel(1, 2, 2, 450, 8, 25);
    });

    // THEN — failure enqueues the completion
    expect(success).toBe(false);
    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    expect(enqueueSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        world: 1,
        level: 2,
        stars: 2,
        score: 450,
        words: 8,
        goldEarned: 25,
      })
    );
  });

  it('does NOT enqueue when completeLevel fails with a 4xx server error', async () => {
    // GIVEN — server rejects with 400 (bad request, not a transient issue)
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/adventure/state')) return Promise.resolve(makeStateResponse());
      if (url.includes('/api/adventure/complete')) {
        return Promise.resolve({
          ok: false,
          status: 400,
          text: async () => 'Bad request',
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { result } = renderHook(() => useProgression(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // WHEN
    await act(async () => {
      await result.current.completeLevel(1, 2, 2, 450, 8);
    });

    // THEN — no enqueue for client errors (they'll fail again on retry)
    expect(enqueueSpy).not.toHaveBeenCalled();
  });

  it('flushes queued completions when online event fires', async () => {
    // GIVEN — one queued completion, initial load succeeds
    const queued = {
      world: 1,
      level: 2,
      stars: 2 as const,
      score: 450,
      words: 8,
      goldEarned: 25,
      queuedAt: Date.now() - 60_000,
    };
    peekSpy.mockReturnValue([queued]);
    dequeueSpy
      .mockReturnValueOnce(queued)
      .mockReturnValueOnce(null);

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/adventure/state')) return Promise.resolve(makeStateResponse());
      if (url.includes('/api/adventure/complete')) return Promise.resolve(makeCompleteSuccessResponse(1, 2, 2));
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { result } = renderHook(() => useProgression(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // WHEN — browser comes back online
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      // Allow the async flush loop to complete
      await new Promise(r => setTimeout(r, 50));
    });

    // THEN — dequeued and replayed via completeLevel (which calls /api/adventure/complete)
    expect(dequeueSpy).toHaveBeenCalled();
    const completeCalls = mockFetch.mock.calls.filter(
      (c: [string]) => c[0].includes('/api/adventure/complete')
    );
    expect(completeCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('enqueues completion when server returns 5xx after retry exhausted', async () => {
    // GIVEN — every /api/adventure/complete call returns 500
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/adventure/state')) return Promise.resolve(makeStateResponse());
      if (url.includes('/api/adventure/complete')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          headers: { get: () => null },
          text: async () => 'Internal Server Error',
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { result } = renderHook(() => useProgression(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.completeLevel(1, 2, 2, 450, 8, 25);
    });

    // THEN — 5xx after retry exhaustion should enqueue for replay
    expect(success).toBe(false);
    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    expect(enqueueSpy).toHaveBeenCalledWith(
      expect.objectContaining({ world: 1, level: 2, stars: 2, score: 450 })
    );
  });

  it('enqueues completion when server returns unexpected response shape', async () => {
    // GIVEN — 200 OK but missing success/progression/completion fields
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/adventure/state')) return Promise.resolve(makeStateResponse());
      if (url.includes('/api/adventure/complete')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: false }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { result } = renderHook(() => useProgression(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.completeLevel(1, 2, 2, 450, 8, 25);
    });

    // THEN — malformed response should not be silently lost
    expect(success).toBe(false);
    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    expect(enqueueSpy).toHaveBeenCalledWith(
      expect.objectContaining({ world: 1, level: 2, stars: 2 })
    );
  });

  it('does not flush when queue is empty on reconnect', async () => {
    // GIVEN — empty queue
    peekSpy.mockReturnValue([]);

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/adventure/state')) return Promise.resolve(makeStateResponse());
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { result } = renderHook(() => useProgression(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // WHEN
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await new Promise(r => setTimeout(r, 50));
    });

    // THEN — no dequeue attempts, no complete calls
    expect(dequeueSpy).not.toHaveBeenCalled();
    const completeCalls = mockFetch.mock.calls.filter(
      (c: [string]) => c[0].includes('/api/adventure/complete')
    );
    expect(completeCalls).toHaveLength(0);
  });

  it('drains queue on mount when authenticated and online with pending items', async () => {
    // GIVEN — queue has a pending completion BEFORE the provider mounts.
    // This covers the case where the user was offline in a previous session,
    // a save was queued to localStorage, and now the app loads while already
    // online — the `online` event never fires, so a mount-time drain is needed.
    const queued = {
      world: 2, level: 3, stars: 3 as const, score: 700, words: 12,
      goldEarned: 80, queuedAt: Date.now() - 120_000,
    };
    peekSpy.mockReturnValue([queued]);
    dequeueSpy.mockReturnValueOnce(queued).mockReturnValueOnce(null);

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/adventure/state')) return Promise.resolve(makeStateResponse());
      if (url.includes('/api/adventure/complete')) return Promise.resolve(makeCompleteSuccessResponse(2, 3, 3));
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    // WHEN — provider mounts (no online event dispatched)
    const { result } = renderHook(() => useProgression(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    // THEN — the queued completion was replayed via the complete endpoint
    expect(dequeueSpy).toHaveBeenCalled();
    const completeCalls = mockFetch.mock.calls.filter(
      (c: [string]) => c[0].includes('/api/adventure/complete')
    );
    expect(completeCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('enqueues completion when server returns 401 (expired session)', async () => {
    // GIVEN — server rejects with 401, simulating an expired auth token.
    // 401s are recoverable: the next session will have a fresh token, so the
    // completion should queue for offline replay rather than be dropped.
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/adventure/state')) return Promise.resolve(makeStateResponse());
      if (url.includes('/api/adventure/complete')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          headers: { get: () => null },
          text: async () => 'Unauthorized',
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { result } = renderHook(() => useProgression(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.completeLevel(1, 2, 2, 450, 8, 25);
    });

    // THEN — 401 is treated as transient (token-refresh recoverable) and queued
    expect(success).toBe(false);
    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    expect(enqueueSpy).toHaveBeenCalledWith(
      expect.objectContaining({ world: 1, level: 2, stars: 2, score: 450 })
    );
  });
});
