import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRival, rivalOutcomeOf, RIVAL_PULSE_MS } from '../useRival';
import type { RivalView } from '@/shared/types/rivalry';

function fakeSocket() {
  const handlers: Record<string, Array<(data: unknown) => void>> = {};
  const emitted: string[] = [];
  return {
    socket: {
      on: (e: string, fn: (data: unknown) => void) => { (handlers[e] ??= []).push(fn); },
      off: (e: string, fn: (data: unknown) => void) => { handlers[e] = (handlers[e] ?? []).filter((h) => h !== fn); },
      emit: (e: string) => { emitted.push(e); },
    },
    fire: (e: string, data: unknown) => act(() => { (handlers[e] ?? []).forEach((h) => h(data)); }),
    emitted,
    listeners: (e: string) => (handlers[e] ?? []).length,
  };
}

const view = (myScore: number, rivalScore: number, rivalName = 'Dana'): RivalView => ({ rivalName, rivalAvatar: null, myScore, rivalScore });

describe('useRival', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('Given a mounted chip, When it mounts, Then it asks the server for its rival', () => {
    const s = fakeSocket();
    renderHook(() => useRival(s.socket));
    expect(s.emitted).toEqual(['rivalSync']);
  });

  it('Given no rival, When nothing arrives, Then the hook shows nothing', () => {
    const s = fakeSocket();
    const { result } = renderHook(() => useRival(s.socket));
    expect(result.current.rival).toBeNull();
    expect(result.current.rivalOutcome).toBeNull();
  });

  it('Given an update, When it arrives, Then the signed difference and status follow it', () => {
    const s = fakeSocket();
    const { result } = renderHook(() => useRival(s.socket));
    s.fire('rivalUpdate', { gameSessionId: 2, rival: view(3, 7) });
    expect(result.current.rival?.rivalName).toBe('Dana');
    expect(result.current.diff).toBe(-4);
    expect(result.current.status).toBe('behind');
  });

  it('Given round 3 is live, When a round 2 update arrives late, Then it is ignored', () => {
    const s = fakeSocket();
    const { result } = renderHook(() => useRival(s.socket));
    s.fire('rivalUpdate', { gameSessionId: 3, rival: view(5, 1) });
    s.fire('rivalUpdate', { gameSessionId: 2, rival: view(0, 9, 'Old') });
    expect(result.current.rival?.rivalName).toBe('Dana');
  });

  it('Given a new round starts, When the start payload has no rival, Then the old rival clears until the new one arrives', () => {
    const s = fakeSocket();
    const { result } = renderHook(() => useRival(s.socket));
    s.fire('rivalUpdate', { gameSessionId: 2, rival: view(5, 1) });
    s.fire('startGame', { gameSessionId: 3 });
    expect(result.current.rival).toBeNull();
    s.fire('rivalUpdate', { gameSessionId: 2, rival: view(5, 1) });
    expect(result.current.rival).toBeNull();
    s.fire('rivalUpdate', { gameSessionId: 3, rival: view(0, 0, 'Noa') });
    expect(result.current.rival?.rivalName).toBe('Noa');
  });

  it('Given a reconnect payload carrying a rival, When it arrives, Then the rival restores from it', () => {
    const s = fakeSocket();
    const { result } = renderHook(() => useRival(s.socket));
    s.fire('startGame', { gameSessionId: 4, reconnect: true, rival: view(2, 2) });
    expect(result.current.status).toBe('level');
  });

  it('Given the student takes the lead, When the update says so, Then a bounded pulse runs and an announcement is set', () => {
    const s = fakeSocket();
    const { result } = renderHook(() => useRival(s.socket));
    s.fire('rivalUpdate', { gameSessionId: 1, rival: view(1, 3) });
    s.fire('rivalUpdate', { gameSessionId: 1, rival: view(5, 3), tookLead: true });
    expect(result.current.pulse).toBeGreaterThan(0);
    expect(result.current.pulsing).toBe(true);
    expect(result.current.announcement).toEqual({ key: 'education.rivals.announce.lead', name: 'Dana' });
    act(() => { vi.advanceTimersByTime(RIVAL_PULSE_MS); });
    expect(result.current.pulsing).toBe(false);
  });

  it('Given the rival moves ahead, When the status flips, Then the announcement is gentle and names the rival', () => {
    const s = fakeSocket();
    const { result } = renderHook(() => useRival(s.socket));
    s.fire('rivalUpdate', { gameSessionId: 1, rival: view(5, 3) });
    s.fire('rivalUpdate', { gameSessionId: 1, rival: view(5, 8) });
    expect(result.current.announcement).toEqual({ key: 'education.rivals.announce.passed', name: 'Dana' });
  });

  it('Given an update with rival null, When it arrives, Then the chip clears', () => {
    const s = fakeSocket();
    const { result } = renderHook(() => useRival(s.socket));
    s.fire('rivalUpdate', { gameSessionId: 1, rival: view(5, 3) });
    s.fire('rivalUpdate', { gameSessionId: 1, rival: null });
    expect(result.current.rival).toBeNull();
  });

  it('Given the hook unmounts, When it cleans up, Then no listeners are left', () => {
    const s = fakeSocket();
    const { unmount } = renderHook(() => useRival(s.socket));
    unmount();
    expect(s.listeners('rivalUpdate')).toBe(0);
    expect(s.listeners('startGame')).toBe(0);
  });

  it('Given a room-wide flip, When it arrives, Then the phone chip ignores it', () => {
    const s = fakeSocket();
    const { result } = renderHook(() => useRival(s.socket));
    s.fire('rivalFlip', { gameSessionId: 1, winnerName: 'X', winnerAvatar: null });
    expect(result.current.rival).toBeNull();
  });
});

describe('rivalOutcomeOf', () => {
  it('Given a final view, When summarised, Then it reports name, diff and win', () => {
    expect(rivalOutcomeOf(view(9, 5))).toEqual({ rivalName: 'Dana', diff: 4, won: true });
    expect(rivalOutcomeOf(view(5, 9))).toEqual({ rivalName: 'Dana', diff: -4, won: false });
    expect(rivalOutcomeOf(view(5, 5))).toEqual({ rivalName: 'Dana', diff: 0, won: false });
    expect(rivalOutcomeOf(null)).toBeNull();
  });
});
