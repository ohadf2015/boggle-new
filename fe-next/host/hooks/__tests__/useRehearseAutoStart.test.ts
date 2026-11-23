// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { writeRehearseIntent, peekRehearseIntent, claimRehearseIntentForLaunch, type RehearseIntent } from '@/lib/education/rehearsal';
import { PRACTICE_NEEDS_BOARD_EVENT, PRACTICE_SKIP_TO_GAME_EVENT, PRACTICE_SEAT_TIMEOUT_MS, useRehearseAutoStart } from '../useRehearseAutoStart';

function armRehearsal(intent: RehearseIntent, gameCode = 'ROOM1') {
  claimRehearseIntentForLaunch(gameCode, writeRehearseIntent(intent));
}

describe('useRehearseAutoStart', () => {
  beforeEach(() => sessionStorage.clear());

  it('Given a Rehearse tap from HQ, When the host is seated in the room, Then the practice round starts once and the intent is spent', () => {
    armRehearsal({ source: 'hq', classExists: false });
    const start = vi.fn();
    const { rerender } = renderHook((p: { hostSeated: boolean }) => useRehearseAutoStart({ gameCode: 'ROOM1', enabled: true, hostSeated: p.hostSeated, botsAllowed: true, start }), {
      initialProps: { hostSeated: false },
    });
    expect(start).not.toHaveBeenCalled();

    rerender({ hostSeated: true });
    rerender({ hostSeated: true });
    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith({ source: 'hq', classExists: false });
    expect(peekRehearseIntent()).toBeNull();
  });

  it('Given no Rehearse tap, Then opening the lobby never starts bots', () => {
    const start = vi.fn();
    renderHook(() => useRehearseAutoStart({ gameCode: 'ROOM1', enabled: true, hostSeated: true, botsAllowed: true, start }));
    expect(start).not.toHaveBeenCalled();
  });

  it('Given a lobby that cannot run practice rounds, Then the intent is left alone', () => {
    armRehearsal({ source: 'class', classExists: true });
    const start = vi.fn();
    renderHook(() => useRehearseAutoStart({ gameCode: 'ROOM1', enabled: false, hostSeated: true, botsAllowed: true, start }));
    expect(start).not.toHaveBeenCalled();
  });

  it('Given the classroom flag resolves after mount, Then the HQ tap still starts the round once', () => {
    armRehearsal({ source: 'hq', classExists: true });
    const start = vi.fn();
    const { rerender } = renderHook((p: { enabled: boolean }) => useRehearseAutoStart({ gameCode: 'ROOM1', enabled: p.enabled, hostSeated: true, botsAllowed: true, start }), {
      initialProps: { enabled: false },
    });
    rerender({ enabled: true });
    rerender({ enabled: true });
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('Given the room ended up in a mode bots cannot play, Then no dead bot round starts and the intent is dropped', () => {
    armRehearsal({ source: 'hq', classExists: true });
    const start = vi.fn();
    renderHook(() => useRehearseAutoStart({ gameCode: 'ROOM1', enabled: true, hostSeated: true, botsAllowed: false, start }));
    expect(start).not.toHaveBeenCalled();
    expect(peekRehearseIntent()).toBeNull();
  });
  it('Given a practice run, When the teacher joins as a student, Then the round waits until that student presses READY', () => {
    armRehearsal({ source: 'hq', classExists: true, withSeat: true });
    const start = vi.fn();
    const { rerender } = renderHook((p: { practiceSeated: boolean; practiceReady: boolean }) => useRehearseAutoStart({ gameCode: 'ROOM1', enabled: true, hostSeated: true, practiceSeated: p.practiceSeated, practiceReady: p.practiceReady, botsAllowed: true, start }), {
      initialProps: { practiceSeated: false, practiceReady: false },
    });
    expect(start).not.toHaveBeenCalled();

    rerender({ practiceSeated: true, practiceReady: false });
    expect(start).not.toHaveBeenCalled();
    expect(peekRehearseIntent()).not.toBeNull();

    rerender({ practiceSeated: true, practiceReady: true });
    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith({ source: 'hq', classExists: true, withSeat: true });
  });

  it('Given a seated teacher still in the pre-game practice, When they skip to the game, Then the round starts once', () => {
    armRehearsal({ source: 'hq', classExists: true, withSeat: true });
    const start = vi.fn();
    renderHook(() => useRehearseAutoStart({ gameCode: 'ROOM1', enabled: true, hostSeated: true, practiceSeated: true, practiceReady: false, botsAllowed: true, start }));
    act(() => { window.dispatchEvent(new Event(PRACTICE_SKIP_TO_GAME_EVENT)); });
    act(() => { window.dispatchEvent(new Event(PRACTICE_SKIP_TO_GAME_EVENT)); });
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('Given a practice run in a mode bots cannot play, When the teacher is ready, Then the board is brought back to explain why', () => {
    armRehearsal({ source: 'hq', classExists: true, withSeat: true });
    const heard = vi.fn();
    window.addEventListener(PRACTICE_NEEDS_BOARD_EVENT, heard);
    const start = vi.fn();
    renderHook(() => useRehearseAutoStart({ gameCode: 'ROOM1', enabled: true, hostSeated: true, practiceSeated: true, practiceReady: true, botsAllowed: false, start }));
    window.removeEventListener(PRACTICE_NEEDS_BOARD_EVENT, heard);
    expect(start).not.toHaveBeenCalled();
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('Given the student seat has not joined, When skip is pressed, Then nothing starts without the teacher in the room', () => {
    armRehearsal({ source: 'hq', classExists: true, withSeat: true });
    const start = vi.fn();
    renderHook(() => useRehearseAutoStart({ gameCode: 'ROOM1', enabled: true, hostSeated: true, practiceSeated: false, practiceReady: false, botsAllowed: true, start }));
    act(() => { window.dispatchEvent(new Event(PRACTICE_SKIP_TO_GAME_EVENT)); });
    expect(start).not.toHaveBeenCalled();
  });

  describe('when the practice seat never joins', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const run = (practiceSeated = false) => {
      armRehearsal({ source: 'hq', classExists: true, withSeat: true });
      const start = vi.fn();
      const hook = renderHook((p: { practiceSeated: boolean; practiceReady?: boolean }) => useRehearseAutoStart({ gameCode: 'ROOM1', enabled: true, hostSeated: true, practiceSeated: p.practiceSeated, practiceReady: p.practiceReady, botsAllowed: true, start }), {
        initialProps: { practiceSeated } as { practiceSeated: boolean; practiceReady?: boolean },
      });
      return { start, ...hook };
    };

    it('Given 12 seconds pass with no seat, Then the lobby says so instead of waiting silently', () => {
      const { result } = run();
      expect(result.current.seatTimedOut).toBe(false);
      act(() => vi.advanceTimersByTime(PRACTICE_SEAT_TIMEOUT_MS));
      expect(PRACTICE_SEAT_TIMEOUT_MS).toBe(12_000);
      expect(result.current.seatTimedOut).toBe(true);
    });

    it('Given the timeout, When the teacher picks bots only, Then the round starts without the seat, once', () => {
      const { result, start } = run();
      act(() => vi.advanceTimersByTime(PRACTICE_SEAT_TIMEOUT_MS));
      act(() => result.current.startBotsOnly());
      expect(start).toHaveBeenCalledTimes(1);
      expect(start).toHaveBeenCalledWith({ source: 'hq', classExists: true });
      expect(result.current.seatTimedOut).toBe(false);
      expect(peekRehearseIntent()).toBeNull();
    });

    it('Given the timeout, When the teacher tries again, Then the wait restarts and a late seat still starts the round', () => {
      const { result, start, rerender } = run();
      act(() => vi.advanceTimersByTime(PRACTICE_SEAT_TIMEOUT_MS));
      act(() => result.current.retry());
      expect(result.current.seatTimedOut).toBe(false);
      rerender({ practiceSeated: true, practiceReady: true });
      expect(start).toHaveBeenCalledTimes(1);
    });

    it('Given the seat joins in time, Then no timeout shows', () => {
      const { result, rerender } = run();
      rerender({ practiceSeated: true });
      act(() => vi.advanceTimersByTime(PRACTICE_SEAT_TIMEOUT_MS * 2));
      expect(result.current.seatTimedOut).toBe(false);
    });
  });

  it('Given a rehearse tap the teacher backed out of before any room existed, When a real room\'s host board opens, Then no bots start', () => {
    writeRehearseIntent({ source: 'hq', classExists: true });
    const start = vi.fn();
    renderHook(() => useRehearseAutoStart({ gameCode: 'ROOM1', enabled: true, hostSeated: true, botsAllowed: true, start }));
    expect(start).not.toHaveBeenCalled();
  });

  it('Given a rehearsal claimed for another room, When this room\'s host board opens, Then no bots start', () => {
    armRehearsal({ source: 'hq', classExists: true }, 'OTHER1');
    const start = vi.fn();
    renderHook(() => useRehearseAutoStart({ gameCode: 'ROOM1', enabled: true, hostSeated: true, botsAllowed: true, start }));
    expect(start).not.toHaveBeenCalled();
  });
});
