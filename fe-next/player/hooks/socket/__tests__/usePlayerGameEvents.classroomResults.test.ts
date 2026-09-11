/**
 * The student's end-of-round moment.
 *
 * Two defects, one screen. A live classroom run (capture r2, three rounds,
 * game codes E37AAQ / XEVG5Z / H3ZS87) produced ZERO student results screens:
 *
 *  1. `classroomSummary` rides the shared `validatedScores` payload the server
 *     broadcasts to the WHOLE room — but the player's handler forwarded every
 *     other field and dropped this one, so a student who did reach results saw
 *     the arcade scoreboard, never the lesson recap. Class 3 in
 *     `.claude/rules/60-recurring-pitfalls.md`: host path and player path to the
 *     same state, different payloads.
 *  2. A classroom room is ALWAYS `tvMode` (the teacher is forced to broadcast),
 *     so the player deferred results until the projector's reveal animation
 *     finished. Server logs: round ended 02:34:07, `TV host revealed results`
 *     02:34:23 — SIXTEEN seconds of a spinner on thirty phones, with a 25s
 *     ceiling behind it. The student's own placing is not a spoiler; the
 *     projector keeps its drumroll, the phone stops waiting for it.
 *
 * A plain (non-classroom) TV room must still defer — that reveal IS the show.
 */
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { usePlayerGameEvents } from '../usePlayerGameEvents';

const handlers: Record<string, ((data: unknown) => void) | undefined> = {};
/** A fresh socket identity is what a reconnect looks like to the effect. */
const makeSocket = () => ({
  on: vi.fn((event: string, handler: (data: unknown) => void) => { handlers[event] = handler; }),
  off: vi.fn((event: string) => { delete handlers[event]; }),
  emit: vi.fn(),
});
const mockSocket = makeSocket();

vi.mock('@/utils/logger', () => ({
  default: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const onShowResults = vi.fn();

const baseParams = (): Parameters<typeof usePlayerGameEvents>[0] => ({
  socket: mockSocket,
  t: (key: string) => key,
  username: 'Noa',
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

const summary = {
  teacherName: 'Ms. Gauntlet',
  lessonNames: ['Weather'],
  lessonIds: ['l1'],
  totalWords: 4,
  coverage: [{ word: 'rain', foundBy: ['Noa'] }],
  missedWords: ['storm'],
  classFoundCount: 1,
  masteryByPlayer: { Noa: { found: 1, total: 4 } },
  podium: [{ username: 'Noa', score: 200, rank: 1 }],
};

describe('usePlayerGameEvents — the student reaches a classroom results screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    for (const k of Object.keys(handlers)) delete handlers[k];
  });
  afterEach(() => { vi.useRealTimers(); });

  it('forwards classroomSummary from validatedScores to the results screen', () => {
    const params = baseParams();
    renderHook(() => usePlayerGameEvents(params));

    act(() => { handlers['startGame']?.({ gameSessionId: 1, messageId: 'm1' }); });
    act(() => {
      handlers['validatedScores']?.({
        scores: [{ username: 'Noa', totalScore: 200 }],
        letterGrid: null,
        classroomSummary: summary,
      });
    });

    expect(onShowResults).toHaveBeenCalledWith(
      expect.objectContaining({ classroomSummary: summary }),
    );
  });

  it('shows a classroom room its results at once instead of waiting on the projector reveal', () => {
    const params = baseParams();
    renderHook(() => usePlayerGameEvents(params));

    act(() => { handlers['startGame']?.({ gameSessionId: 2, messageId: 'm2' }); });
    act(() => {
      handlers['validatedScores']?.({
        scores: [{ username: 'Noa', totalScore: 200 }],
        letterGrid: null,
        tvMode: true,
        classroomSummary: summary,
      });
    });

    // No `resultsRevealed`, no timer advance — the phone does not wait.
    expect(onShowResults).toHaveBeenCalledWith(
      expect.objectContaining({ classroomSummary: summary }),
    );
  });

  /**
   * The 0-of-3 case. The student's socket drops at the round boundary — the
   * commonest thing that happens to a phone in a classroom — and the effect
   * re-registers on the new connection. The old code kept the held payload and
   * its 25s ceiling in effect-local variables, so teardown threw both away, and
   * the server's resend ("Resending results to reconnecting player in finished
   * game", capture r2) was then discarded as a duplicate of a screen nobody
   * ever saw. Class 4: a silent no-op that looks exactly like "nothing to do".
   */
  it('shows a resent payload after a reconnect threw away the held one', () => {
    const params = baseParams();
    const { rerender } = renderHook((p: Parameters<typeof usePlayerGameEvents>[0]) => usePlayerGameEvents(p), {
      initialProps: params,
    });

    act(() => { handlers['startGame']?.({ gameSessionId: 7, messageId: 'm7' }); });
    const payload = {
      scores: [{ username: 'Noa', totalScore: 200 }],
      letterGrid: null,
      tvMode: true,
    };
    act(() => { handlers['validatedScores']?.(payload); });
    expect(onShowResults).not.toHaveBeenCalled();

    // Reconnect: new socket identity → cleanup + re-register.
    act(() => { rerender({ ...params, socket: makeSocket() }); });

    // The server resends the same finished-game payload.
    act(() => { handlers['validatedScores']?.(payload); });
    act(() => { handlers['resultsRevealed']?.({}); });

    expect(onShowResults).toHaveBeenCalledTimes(1);
  });

  it('still defers a plain TV room until the host reveals — that drumroll is the show', () => {
    const params = baseParams();
    renderHook(() => usePlayerGameEvents(params));

    act(() => { handlers['startGame']?.({ gameSessionId: 3, messageId: 'm3' }); });
    act(() => {
      handlers['validatedScores']?.({
        scores: [{ username: 'Noa', totalScore: 200 }],
        letterGrid: null,
        tvMode: true,
      });
    });

    expect(onShowResults).not.toHaveBeenCalled();

    act(() => { handlers['resultsRevealed']?.({}); });
    expect(onShowResults).toHaveBeenCalledTimes(1);
  });
});
