import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClassroomAutoJoin, AUTO_JOIN_DELAY_MS, AUTO_JOIN_HANDLED_KEY, markClassroomGameHandled, resetAutoJoinMemoryForTest } from '../useClassroomAutoJoin';
import type { ActiveGame } from '@/hooks/useActiveClassroomGame';

const game = (over: Partial<ActiveGame> & Record<string, unknown> = {}) =>
  ({ gameCode: 'LIVE01', teacherName: 'Ms G', lessonNames: [], ...over }) as ActiveGame;

function setup(initial: ActiveGame | null, isJoining = false) {
  const join = vi.fn();
  const hook = renderHook((p: { g: ActiveGame | null; j: boolean }) => useClassroomAutoJoin({ activeGame: p.g, join, isJoining: p.j }), {
    initialProps: { g: initial, j: isJoining },
  });
  return { join, hook };
}

describe('useClassroomAutoJoin', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    resetAutoJoinMemoryForTest();
  });
  afterEach(() => vi.useRealTimers());

  it('Given a live game for the class, When the notice has shown for the delay, Then the student is joined once', () => {
    const { join, hook } = setup(game());
    expect(hook.result.current.pendingCode).toBe('LIVE01');
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS - 1); });
    expect(join).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(join).toHaveBeenCalledTimes(1);
    expect(hook.result.current.pendingCode).toBeNull();
    expect(AUTO_JOIN_DELAY_MS).toBeGreaterThanOrEqual(2500);
    expect(AUTO_JOIN_DELAY_MS).toBeLessThanOrEqual(4000);
  });

  it('Given the game appears later (socket or poll), When it arrives, Then the same countdown runs', () => {
    const { join, hook } = setup(null);
    expect(hook.result.current.pendingCode).toBeNull();
    hook.rerender({ g: game(), j: false });
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS); });
    expect(join).toHaveBeenCalledTimes(1);
  });

  it('Given the student taps Stay here, Then they are not joined, and not pulled in again for that game in this tab', () => {
    const { join, hook } = setup(game());
    act(() => hook.result.current.stay());
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS * 2); });
    expect(join).not.toHaveBeenCalled();
    hook.unmount();
    const again = setup(game());
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS * 2); });
    expect(again.join).not.toHaveBeenCalled();
    expect(again.hook.result.current.pendingCode).toBeNull();
  });

  it('Given a student who was auto-joined and came back to the class page, Then the same game does not pull them in again', () => {
    const first = setup(game());
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS); });
    markClassroomGameHandled('LIVE01');
    first.hook.unmount();
    const back = setup(game());
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS * 2); });
    expect(back.join).not.toHaveBeenCalled();
  });

  it('Given the student taps the join button during the notice, Then they join now, once, and the countdown is cancelled', () => {
    const { join, hook } = setup(game());
    act(() => hook.result.current.joinNow());
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS * 2); });
    expect(join).toHaveBeenCalledTimes(1);
    act(() => markClassroomGameHandled('LIVE01'));
    expect(JSON.parse(sessionStorage.getItem(AUTO_JOIN_HANDLED_KEY) ?? '[]')).toContain('LIVE01');
  });

  it('Given a new game code after a handled one, Then the new game is offered', () => {
    sessionStorage.setItem(AUTO_JOIN_HANDLED_KEY, JSON.stringify(['OLD001']));
    const { join } = setup(game({ gameCode: 'NEW001' }));
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS); });
    expect(join).toHaveBeenCalledTimes(1);
  });

  it('Given a teacher rehearsal room, Then it is never auto-joined', () => {
    const a = setup(game({ rehearsal: true }));
    const b = setup(game({ gameCode: 'REH002', settings: { rehearsal: true } }));
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS * 2); });
    expect(a.join).not.toHaveBeenCalled();
    expect(b.join).not.toHaveBeenCalled();
    expect(a.hook.result.current.pendingCode).toBeNull();
  });

  it('Given the teacher locked the lobby, Then no auto-join is attempted (the button still lets the server decide)', () => {
    const { join, hook } = setup(game({ settings: { lobbyLocked: true } }));
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS * 2); });
    expect(join).not.toHaveBeenCalled();
    expect(hook.result.current.pendingCode).toBeNull();
  });

  it('Given the game ends during the notice, Then the countdown is cancelled', () => {
    const { join, hook } = setup(game());
    hook.rerender({ g: null, j: false });
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS * 2); });
    expect(join).not.toHaveBeenCalled();
    expect(hook.result.current.pendingCode).toBeNull();
  });

  it('Given a join already in flight, Then no countdown starts', () => {
    const { join, hook } = setup(game(), true);
    expect(hook.result.current.pendingCode).toBeNull();
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS * 2); });
    expect(join).not.toHaveBeenCalled();
  });

  it('Given storage is blocked, Then the countdown still works and does not throw', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const { join } = setup(game());
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS); });
    expect(join).toHaveBeenCalledTimes(1);
    spy.mockRestore();
    set.mockRestore();
  });

  it('Given the page unmounts during the notice, Then the timer is cleared', () => {
    const { join, hook } = setup(game());
    hook.unmount();
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS * 2); });
    expect(join).not.toHaveBeenCalled();
  });

  it('Given the game record exists but the projector room is not open yet, Then nobody is pulled in until it opens', () => {
    const { join, hook } = setup(game({ roomOpen: false }));
    expect(hook.result.current.pendingCode).toBeNull();
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS * 2); });
    expect(join).not.toHaveBeenCalled();
    hook.rerender({ g: game({ roomOpen: true }), j: false });
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS); });
    expect(join).toHaveBeenCalledTimes(1);
  });

  it('Given storage throws, When the student was joined, left and came back (remount), Then the same game does not pull them in again', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const first = setup(game());
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS); });
    expect(first.join).toHaveBeenCalledTimes(1);
    markClassroomGameHandled('LIVE01');
    first.hook.unmount();
    const back = setup(game());
    expect(back.hook.result.current.pendingCode).toBeNull();
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS * 2); });
    expect(back.join).not.toHaveBeenCalled();
    get.mockRestore();
    set.mockRestore();
  });

  it('Given storage throws, When the student taps Stay here and the page remounts, Then they are still not pulled in', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const first = setup(game());
    act(() => first.hook.result.current.stay());
    first.hook.unmount();
    const back = setup(game());
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS * 2); });
    expect(back.join).not.toHaveBeenCalled();
    get.mockRestore();
    set.mockRestore();
  });

  it('Given the automatic join fails (no ack), Then the game is not marked handled and is never auto-retried, even after a remount', () => {
    const first = setup(game());
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS); });
    expect(first.join).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sessionStorage.getItem(AUTO_JOIN_HANDLED_KEY) ?? '[]')).not.toContain('LIVE01');
    first.hook.rerender({ g: game(), j: false });
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS * 3); });
    expect(first.join).toHaveBeenCalledTimes(1);
    first.hook.unmount();
    const back = setup(game());
    act(() => { vi.advanceTimersByTime(AUTO_JOIN_DELAY_MS * 3); });
    expect(back.join).not.toHaveBeenCalled();
  });
});
