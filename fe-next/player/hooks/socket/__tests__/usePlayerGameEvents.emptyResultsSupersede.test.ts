/**
 * Behavioral test: a LATE real results broadcast must supersede the empty
 * fallback in usePlayerGameEvents.
 *
 * Bug (observed in MP Blast): a player finishes their board well before the
 * shared timer, sits in "waiting for results" past the 20s safety fallback,
 * which fires `onShowResults({ scores: [] })` AND marks the session processed.
 * When the server's real `validatedScores` finally arrives, the dedup guard
 * (`hasProcessedResultsRef === gameSessionIdRef`) drops it — leaving the player
 * stuck on the empty "Calculating results" screen FOREVER even though correct
 * results arrived.
 *
 * Fix contract: a non-empty `validatedScores` for the current session must be
 * delivered to `onShowResults` even if an EMPTY fallback already ran for that
 * session. Genuine duplicate REAL broadcasts are still ignored.
 */
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { usePlayerGameEvents } from '../usePlayerGameEvents';

const handlers: Record<string, ((data: unknown) => void) | undefined> = {};
const mockSocket = {
  on: vi.fn((event: string, handler: (data: unknown) => void) => { handlers[event] = handler; }),
  off: vi.fn((event: string) => { delete handlers[event]; }),
  emit: vi.fn(),
};

vi.mock('@/utils/logger', () => ({
  default: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const onShowResults = vi.fn();

const baseParams = (): Parameters<typeof usePlayerGameEvents>[0] => ({
  socket: mockSocket,
  t: (key: string) => key,
  username: 'testuser',
  onShowResults,
  setShowWordFeedback: vi.fn(),
  setWordToVote: vi.fn(),
  setEarthquakeState: vi.fn(),
  setFireRoundActive: vi.fn(),
  setFireRoundRemaining: vi.fn(),
  comboLevelRef: { current: 0 },
  lastWordTimeRef: { current: null },
  setComboLevel: vi.fn(),
  setLastWordTime: vi.fn(),
  comboTimeoutRef: { current: null },
  comboShieldsUsedRef: { current: 0 },
  intentionalExitRef: { current: false },
});

describe('usePlayerGameEvents — late real results supersede empty fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    for (const k of Object.keys(handlers)) delete handlers[k];
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('delivers a LATE non-empty validatedScores even after the empty fallback fired', () => {
    // Stable params object: re-creating it each render would churn the
    // registration effect and clear the pending fallback timer.
    const params = baseParams();
    renderHook(() => usePlayerGameEvents(params));

    // Game session begins, then the server tells us the game ended.
    act(() => { handlers['startGame']?.({ gameSessionId: 1, messageId: 'm1' }); });
    act(() => { handlers['endGame']?.({}); });

    // No validatedScores arrives — advance past the 15s + 5s safety fallback.
    act(() => { vi.advanceTimersByTime(15000); }); // -> emits requestResults
    act(() => { vi.advanceTimersByTime(5000); });  // -> empty fallback fires

    // The empty fallback should have shown an empty results screen.
    expect(onShowResults).toHaveBeenCalledWith(
      expect.objectContaining({ scores: [] }),
    );
    onShowResults.mockClear();

    // The REAL results finally arrive for the SAME session.
    act(() => {
      handlers['validatedScores']?.({
        scores: [{ username: 'testuser', totalScore: 50 }],
        letterGrid: null,
        gameMode: 'blast',
      });
    });

    // They MUST be delivered — not deduped away by the empty fallback.
    expect(onShowResults).toHaveBeenCalledWith(
      expect.objectContaining({
        scores: [{ username: 'testuser', totalScore: 50 }],
      }),
    );
  });

  it('still ignores a genuine duplicate REAL validatedScores for the same session', () => {
    const params = baseParams();
    renderHook(() => usePlayerGameEvents(params));

    act(() => { handlers['startGame']?.({ gameSessionId: 2, messageId: 'm2' }); });
    const real = { scores: [{ username: 'testuser', totalScore: 30 }], letterGrid: null };

    act(() => { handlers['validatedScores']?.(real); });
    expect(onShowResults).toHaveBeenCalledTimes(1);
    onShowResults.mockClear();

    // A duplicate broadcast (server re-send) must NOT trigger a second show.
    act(() => { handlers['validatedScores']?.(real); });
    expect(onShowResults).not.toHaveBeenCalled();
  });
});
