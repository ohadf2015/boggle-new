/**
 * Client half of "keep the class together": when the teacher opens a new game
 * for the class, a student re-joins the new code in place.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClassroomGameMove, shouldFollowClassroomMove } from '../useClassroomGameMove';

function fakeSocket() {
  const listeners: Record<string, Array<(d: unknown) => void>> = {};
  return {
    on: vi.fn((e: string, cb: (d: unknown) => void) => { (listeners[e] ||= []).push(cb); }),
    off: vi.fn((e: string, cb: (d: unknown) => void) => { listeners[e] = (listeners[e] || []).filter((f) => f !== cb); }),
    fire: (e: string, d: unknown) => (listeners[e] || []).forEach((f) => f(d)),
    count: (e: string) => (listeners[e] || []).length,
  };
}

describe('shouldFollowClassroomMove', () => {
  it('follows a move out of the room the student is in', () => {
    expect(shouldFollowClassroomMove({ fromCode: 'OLD111', toCode: 'new222' }, { currentCode: 'old111', isHost: false })).toBe('NEW222');
  });
  it('follows when the student is not in any room yet (re-join of an old code)', () => {
    expect(shouldFollowClassroomMove({ fromCode: 'OLD111', toCode: 'NEW222' }, { currentCode: '', isHost: false })).toBe('NEW222');
  });
  it('never moves the teacher', () => {
    expect(shouldFollowClassroomMove({ fromCode: 'OLD111', toCode: 'NEW222' }, { currentCode: 'OLD111', isHost: true })).toBeNull();
  });
  it('ignores a move for another room, a bad code, or a move to the same code', () => {
    expect(shouldFollowClassroomMove({ fromCode: 'XYZ999', toCode: 'NEW222' }, { currentCode: 'OLD111', isHost: false })).toBeNull();
    expect(shouldFollowClassroomMove({ fromCode: 'OLD111', toCode: '<script>' }, { currentCode: 'OLD111', isHost: false })).toBeNull();
    expect(shouldFollowClassroomMove({ fromCode: 'OLD111', toCode: 'OLD111' }, { currentCode: 'OLD111', isHost: false })).toBeNull();
    expect(shouldFollowClassroomMove(null, { currentCode: 'OLD111', isHost: false })).toBeNull();
  });
});

describe('useClassroomGameMove', () => {
  it('re-joins the new code when the server says the class moved, and stops listening on unmount', () => {
    const socket = fakeSocket();
    const follow = vi.fn();
    const hook = renderHook(() => useClassroomGameMove({ socket: socket as never, currentCode: 'OLD111', isHost: false, follow }));

    act(() => socket.fire('classroomGameMoved', { fromCode: 'OLD111', toCode: 'NEW222', reason: 'host_new_game' }));
    expect(follow).toHaveBeenCalledWith('NEW222', expect.objectContaining({ reason: 'host_new_game' }));

    hook.unmount();
    expect(socket.count('classroomGameMoved')).toBe(0);
  });

  it('uses the latest room code, not the one from the first render', () => {
    const socket = fakeSocket();
    const follow = vi.fn();
    const hook = renderHook((p: { code: string }) => useClassroomGameMove({ socket: socket as never, currentCode: p.code, isHost: false, follow }),
      { initialProps: { code: 'AAA111' } });
    hook.rerender({ code: 'BBB222' });

    act(() => socket.fire('classroomGameMoved', { fromCode: 'AAA111', toCode: 'CCC333' }));
    expect(follow).not.toHaveBeenCalled();
    act(() => socket.fire('classroomGameMoved', { fromCode: 'BBB222', toCode: 'CCC333' }));
    expect(follow).toHaveBeenCalledWith('CCC333', expect.anything());
  });
});
