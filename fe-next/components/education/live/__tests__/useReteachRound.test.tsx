import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { RETEACH_ACK_TIMEOUT_MS, useReplayMissedWords, useReteachRound } from '@/components/education/live/useReteachRound';
import type { ClassroomSummary } from '@/shared/types/classroom';

function fakeSocket() {
  const handlers: Record<string, Array<(data: unknown) => void>> = {};
  return {
    emit: vi.fn(),
    on: vi.fn((event: string, fn: (data: unknown) => void) => {
      (handlers[event] ??= []).push(fn);
    }),
    off: vi.fn((event: string, fn: (data: unknown) => void) => {
      handlers[event] = (handlers[event] ?? []).filter((h) => h !== fn);
    }),
    fire: (event: string, data: unknown) => (handlers[event] ?? []).forEach((h) => h(data)),
  };
}

describe('useReteachRound', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('given a replay, when the server confirms, then the next round starts and the teacher copy keeps the full lesson', () => {
    const socket = fakeSocket();
    const onApplied = vi.fn();
    window.sessionStorage.setItem('lessonGameData', JSON.stringify({ lessonId: 'l1', lessonName: 'Cells', vocabularyWords: ['a', 'b', 'c'], gameMode: 'classic' }));
    const { result } = renderHook(() => useReteachRound({ gameCode: 'ABC123', socket: socket as never, onApplied }));

    act(() => result.current.replay(['b', 'c']));
    expect(socket.emit).toHaveBeenCalledWith('classroomReteachWords', { gameCode: 'ABC123', words: ['b', 'c'] });
    expect(result.current.status).toBe('pending');
    expect(onApplied).not.toHaveBeenCalled();

    act(() => socket.fire('classroomReteachApplied', { gameCode: 'ABC123', words: ['b'] }));
    expect(onApplied).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('idle');
    expect(JSON.parse(window.sessionStorage.getItem('lessonGameData')!).vocabularyWords).toEqual(['a', 'b', 'c']);
  });

  it('given an ack for another room, when it arrives, then it is ignored', () => {
    const socket = fakeSocket();
    const onApplied = vi.fn();
    const { result } = renderHook(() => useReteachRound({ gameCode: 'ABC123', socket: socket as never, onApplied }));
    act(() => result.current.replay(['b']));
    act(() => socket.fire('classroomReteachApplied', { gameCode: 'ZZZ999', words: ['b'] }));
    expect(onApplied).not.toHaveBeenCalled();
  });

  it('given the server refuses, when it says so, then the replay shows failed and no round starts', () => {
    const socket = fakeSocket();
    const onApplied = vi.fn();
    const { result } = renderHook(() => useReteachRound({ gameCode: 'ABC123', socket: socket as never, onApplied }));
    act(() => result.current.replay(['b']));
    act(() => socket.fire('classroomReteachRefused', { gameCode: 'ABC123' }));
    expect(result.current.status).toBe('failed');
    expect(onApplied).not.toHaveBeenCalled();
  });

  it('given no answer at all, when the wait runs out, then it fails visibly instead of spinning', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useReteachRound({ gameCode: 'ABC123', socket: socket as never, onApplied: vi.fn() }));
    act(() => result.current.replay(['b']));
    act(() => {
      vi.advanceTimersByTime(RETEACH_ACK_TIMEOUT_MS + 1);
    });
    expect(result.current.status).toBe('failed');
  });

  it('given an ack that lands after the wait ran out, when it arrives, then the wall says the replay is set without starting a round on its own', () => {
    const socket = fakeSocket();
    const onApplied = vi.fn();
    const { result } = renderHook(() => useReteachRound({ gameCode: 'ABC123', socket: socket as never, onApplied }));
    act(() => result.current.replay(['b']));
    act(() => {
      vi.advanceTimersByTime(RETEACH_ACK_TIMEOUT_MS + 1);
    });
    act(() => socket.fire('classroomReteachApplied', { gameCode: 'ABC123', words: ['b'] }));
    expect(result.current.status).toBe('ready');
    expect(onApplied).not.toHaveBeenCalled();
  });

  it('given a lowercase room code in the URL, when the server answers with the uppercased code, then the ack still counts', () => {
    const socket = fakeSocket();
    const onApplied = vi.fn();
    window.sessionStorage.setItem('lessonGameData', JSON.stringify({ lessonId: 'l1', lessonName: 'Cells', vocabularyWords: ['a', 'b'] }));
    const { result } = renderHook(() => useReteachRound({ gameCode: 'abc123', socket: socket as never, onApplied }));
    act(() => result.current.replay(['b']));
    act(() => socket.fire('classroomReteachApplied', { gameCode: 'ABC123', words: ['b'] }));
    expect(onApplied).toHaveBeenCalledTimes(1);
  });

  it('given no socket or no room code, when replay is tapped, then it fails visibly', () => {
    const { result } = renderHook(() => useReteachRound({ gameCode: null, socket: null, onApplied: vi.fn() }));
    act(() => result.current.replay(['b']));
    expect(result.current.status).toBe('failed');
  });

  function setReady() {
    const socket = fakeSocket();
    const onApplied = vi.fn();
    const hook = renderHook(() => useReteachRound({ gameCode: 'ABC123', socket: socket as never, onApplied }));
    act(() => hook.result.current.replay(['b']));
    act(() => {
      vi.advanceTimersByTime(RETEACH_ACK_TIMEOUT_MS + 1);
    });
    act(() => socket.fire('classroomReteachApplied', { gameCode: 'ABC123', words: ['b'] }));
    return { socket, onApplied, result: hook.result };
  }

  it('given a replay set but not played, when the teacher asks for the full list, then the room is asked and Play again is back to normal', () => {
    const { socket, onApplied, result } = setReady();
    act(() => result.current.restoreFull());
    expect(socket.emit).toHaveBeenLastCalledWith('classroomRestoreFullLesson', { gameCode: 'ABC123' });
    expect(result.current.status).toBe('restoring');
    act(() => socket.fire('classroomFullLessonRestored', { gameCode: 'ABC123', words: ['a', 'b', 'c'] }));
    expect(result.current.status).toBe('idle');
    expect(onApplied).not.toHaveBeenCalled();
  });

  it('given the full-list request is refused or unanswered, when it ends, then the wall says so and still offers it', () => {
    const { socket, result } = setReady();
    act(() => result.current.restoreFull());
    act(() => socket.fire('classroomFullLessonRefused', { gameCode: 'ABC123' }));
    expect(result.current.status).toBe('restoreFailed');
    act(() => result.current.restoreFull());
    act(() => {
      vi.advanceTimersByTime(RETEACH_ACK_TIMEOUT_MS + 1);
    });
    expect(result.current.status).toBe('restoreFailed');
  });
});

describe('useReplayMissedWords — one wiring for the wall, the fallback wall and the phone card', () => {
  const summary = {
    teacherName: 'Ms K',
    lessonNames: ['Cells'],
    lessonIds: ['l1'],
    totalWords: 3,
    classFoundCount: 2,
    coverage: [
      { word: 'osmosis', foundBy: ['Ada', 'Ben'] },
      { word: 'enzyme', foundBy: [] },
      { word: 'membrane', foundBy: ['Ada', 'Ben'] },
    ],
    missedWords: ['enzyme'],
    masteryByPlayer: { Ada: { found: 2, total: 3 }, Ben: { found: 2, total: 3 } },
  } as unknown as ClassroomSummary;

  it('given a way to start a round, when the replay starts, then the shared list goes to the server and Play again runs only on its ack', () => {
    const socket = fakeSocket();
    const onRematch = vi.fn();
    const { result } = renderHook(() => useReplayMissedWords({ summary, gameCode: 'ABC123', socket: socket as never, onRematch }));
    expect(result.current.missed.map((w) => w.word)).toEqual(['enzyme']);
    act(() => result.current.start?.());
    expect(socket.emit).toHaveBeenCalledWith('classroomReteachWords', { gameCode: 'ABC123', words: ['enzyme'] });
    expect(onRematch).not.toHaveBeenCalled();
    act(() => socket.fire('classroomReteachApplied', { gameCode: 'ABC123', words: ['enzyme'] }));
    expect(onRematch).toHaveBeenCalledTimes(1);
  });

  it('given no way to start a round, when shown, then there is no replay to offer', () => {
    const { result } = renderHook(() => useReplayMissedWords({ summary, gameCode: 'ABC123', socket: fakeSocket() as never }));
    expect(result.current.missed).toEqual([]);
    expect(result.current.start).toBeUndefined();
  });
});

