/**
 * useClassPulse — folding the last game into the class's state.
 *
 * The behaviour worth pinning is what the hook says while it does NOT know:
 * a read that is still open, and a read that failed, must not both come out
 * looking like "this class has never played". The first is a flash waiting to
 * happen (pitfall class 1), the second is a silent failure wearing a fact's
 * clothes (pitfall class 4).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useClassPulse } from '../useClassPulse';

const mockUseRecentClassroomGames = vi.fn();
vi.mock('@/hooks/useRecentClassroomGames', () => ({
  useRecentClassroomGames: (opts: unknown) => mockUseRecentClassroomGames(opts),
}));

const NOW = Date.parse('2026-09-15T10:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

const game = {
  gameCode: 'ABC123',
  gameMode: 'vocab-quiz',
  playedAt: new Date(NOW - DAY).toISOString(),
  lessonIds: ['l1'],
  players: [
    { studentId: 's1', name: 'Ada', score: 90, lessonWordsFound: [], lessonWordsMissed: [], accuracyPct: 95 },
    { studentId: 's2', name: 'Dov', score: 10, lessonWordsFound: [], lessonWordsMissed: [], accuracyPct: 30 },
  ],
  missedWords: [{ word: 'ephemeral', missedBy: 4, total: 5, pct: 80 }],
  totalLessonWords: 10,
  wordsNobodyFound: [],
  coveragePct: 90,
  averageAccuracyPct: 62,
  participation: { played: 2, roster: 5 },
};

function mockState(over: Record<string, unknown> = {}) {
  mockUseRecentClassroomGames.mockReturnValue({
    games: [],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    ...over,
  });
}

describe('useClassPulse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks for exactly one game — the pulse only ever describes the last one', () => {
    mockState();

    renderHook(() => useClassPulse({ classroomId: 'c1', rosterCount: 5, now: NOW }));

    expect(mockUseRecentClassroomGames).toHaveBeenCalledWith(
      expect.objectContaining({ classroomId: 'c1', limit: 1 })
    );
  });

  it('folds the newest game into the pulse', () => {
    mockState({ games: [game] });

    const { result } = renderHook(() =>
      useClassPulse({ classroomId: 'c1', rosterCount: 5, now: NOW })
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.pulse.state).toBe('needsReview');
    expect(result.current.pulse.playedCount).toBe(2);
    expect(result.current.pulse.gameRosterCount).toBe(5);
    expect(result.current.pulse.struggling.map((s) => s.name)).toEqual(['Dov']);
    expect(result.current.pulse.topMissedWords).toEqual(['ephemeral']);
  });

  it('claims nothing about participation while the read is still open', () => {
    mockState({ isLoading: true });

    const { result } = renderHook(() =>
      useClassPulse({ classroomId: 'c1', rosterCount: 5, now: NOW })
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.pulse.playedCount).toBeNull();
  });

  it('does not report "never played" when the read actually FAILED', () => {
    // The distinction this whole test file exists for: a failed read and an
    // empty history are different facts, and only one of them means the
    // teacher should go start a game.
    mockState({ error: new Error('network') });

    const { result } = renderHook(() =>
      useClassPulse({ classroomId: 'c1', rosterCount: 5, now: NOW })
    );

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.pulse.state).not.toBe('neverPlayed');
    expect(result.current.pulse.nextAction).not.toBe('play');
  });

  it('reports an empty history as never played', () => {
    mockState({ games: [] });

    const { result } = renderHook(() =>
      useClassPulse({ classroomId: 'c1', rosterCount: 5, now: NOW })
    );

    expect(result.current.error).toBeNull();
    expect(result.current.pulse.state).toBe('neverPlayed');
  });

  it('reports an empty class as empty whatever its game history', () => {
    mockState({ games: [game] });

    const { result } = renderHook(() =>
      useClassPulse({ classroomId: 'c1', rosterCount: 0, now: NOW })
    );

    expect(result.current.pulse.state).toBe('noRoster');
    expect(result.current.pulse.nextAction).toBe('invite');
  });
});
