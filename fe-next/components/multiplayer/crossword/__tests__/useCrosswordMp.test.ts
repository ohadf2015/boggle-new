/**
 * useCrosswordMp — receives the shared puzzle + live standings from the server
 * and emits this client's progress. The race view mounts on startGame, so the
 * hook polls requestCrosswordMpState on mount + reconnect. Tested with a mock socket.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCrosswordMp, type CrosswordMpSocketLike } from '../useCrosswordMp';

function mockSocket() {
  const handlers = new Map<string, ((d: unknown) => void)[]>();
  const emit = vi.fn();
  const socket: CrosswordMpSocketLike = {
    on: (e, h) => { handlers.set(e, [...(handlers.get(e) ?? []), h]); },
    off: (e, h) => { handlers.set(e, (handlers.get(e) ?? []).filter((x) => x !== h)); },
    emit,
  };
  const fire = (e: string, d: unknown) => act(() => { (handlers.get(e) ?? []).forEach((h) => h(d)); });
  return { socket, fire, emit };
}

const PUZZLE = { id: 'en-mini-001', locale: 'en', size: 5, cells: [], slots: [] };
const INIT = {
  puzzle: PUZZLE, players: ['me', 'bob'],
  standings: [{ username: 'me', percent: 0, solved: false, elapsedMs: 0, score: 0, rank: 1 }],
  startedAt: 1000,
};

describe('useCrosswordMp', () => {
  it('requests state on mount', () => {
    const { socket, emit } = mockSocket();
    renderHook(() => useCrosswordMp(socket));
    expect(emit).toHaveBeenCalledWith('requestCrosswordMpState', {});
  });

  it('exposes the puzzle once init arrives', () => {
    const { socket, fire } = mockSocket();
    const { result } = renderHook(() => useCrosswordMp(socket));
    expect(result.current.puzzle).toBeNull();
    fire('crosswordMpInit', INIT);
    expect(result.current.puzzle).toBe(PUZZLE);
    expect(result.current.ready).toBe(true);
  });

  it('updates standings on broadcast', () => {
    const { socket, fire } = mockSocket();
    const { result } = renderHook(() => useCrosswordMp(socket));
    fire('crosswordMpInit', INIT);
    fire('crosswordStandings', { standings: [
      { username: 'bob', percent: 80, solved: false, elapsedMs: 20000, score: 0, rank: 1 },
      { username: 'me', percent: 40, solved: false, elapsedMs: 20000, score: 0, rank: 2 },
    ] });
    expect(result.current.standings[0].username).toBe('bob');
  });

  it('flags race over', () => {
    const { socket, fire } = mockSocket();
    const { result } = renderHook(() => useCrosswordMp(socket));
    fire('crosswordMpInit', INIT);
    fire('crosswordRaceOver', { standings: INIT.standings });
    expect(result.current.raceOver).toBe(true);
  });

  it('submitProgress emits submitCrosswordProgress', () => {
    const { socket, fire, emit } = mockSocket();
    const { result } = renderHook(() => useCrosswordMp(socket));
    fire('crosswordMpInit', INIT);
    act(() => result.current.submitProgress({ percent: 60, solved: false, elapsedMs: 15000, score: 0 }));
    expect(emit).toHaveBeenCalledWith('submitCrosswordProgress', { percent: 60, solved: false, elapsedMs: 15000, score: 0 });
  });

  it('re-requests on reconnect', () => {
    const { socket, fire, emit } = mockSocket();
    renderHook(() => useCrosswordMp(socket));
    emit.mockClear();
    fire('connect', {});
    expect(emit).toHaveBeenCalledWith('requestCrosswordMpState', {});
  });
});
