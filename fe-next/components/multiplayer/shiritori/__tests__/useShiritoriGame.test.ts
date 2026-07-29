/**
 * useShiritoriGame — derives live turn-chain state from the shiritori socket
 * events (mirrors backend/handlers/shiritoriHandler payloads) and emits moves.
 * Tested with a mock socket. Spec: docs/2026-05-21-shiritori-mode-spec.md.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShiritoriGame, type ShiritoriSocketLike } from '../useShiritoriGame';

function mockSocket() {
  const handlers = new Map<string, ((d: unknown) => void)[]>();
  const emit = vi.fn();
  const socket: ShiritoriSocketLike = {
    on: (e, h) => { handlers.set(e, [...(handlers.get(e) ?? []), h]); },
    off: (e, h) => { handlers.set(e, (handlers.get(e) ?? []).filter((x) => x !== h)); },
    emit,
  };
  const fire = (e: string, d: unknown) => act(() => { (handlers.get(e) ?? []).forEach((h) => h(d)); });
  return { socket, fire, emit };
}

describe('useShiritoriGame', () => {
  const setup = () => {
    const { socket, fire, emit } = mockSocket();
    const view = renderHook(() => useShiritoriGame(socket, ['me', 'bob'], 'me'));
    return { view, fire, emit };
  };

  it('initializes roster + first player', () => {
    const { view } = setup();
    expect(view.result.current.players.map((p) => p.username)).toEqual(['me', 'bob']);
    expect(view.result.current.currentPlayer).toBe('me');
    expect(view.result.current.finished).toBe(false);
  });

  it('appends the chain + advances turn on accepted', () => {
    const { view, fire } = setup();
    fire('shiritoriWordAccepted', { word: 'しりとり', by: 'me', requiredHead: 'り', nextPlayer: 'bob' });
    expect(view.result.current.chain).toEqual(['しりとり']);
    expect(view.result.current.requiredHead).toBe('り');
    expect(view.result.current.currentPlayer).toBe('bob');
  });

  it('surfaces rejection reason', () => {
    const { view, fire } = setup();
    fire('shiritoriWordRejected', { word: 'ねこ', error: 'bad-chain' });
    expect(view.result.current.lastError).toBe('bad-chain');
  });

  it('marks a player eliminated + advances turn', () => {
    const { view, fire } = setup();
    fire('shiritoriPlayerEliminated', { player: 'bob', reason: 'timeout', nextPlayer: 'me' });
    expect(view.result.current.players.find((p) => p.username === 'bob')?.eliminated).toBe(true);
    expect(view.result.current.currentPlayer).toBe('me');
  });

  it('finishes with a winner on game over', () => {
    const { view, fire } = setup();
    fire('shiritoriGameOver', { winner: 'me', reason: 'ends-in-n', loser: 'bob' });
    expect(view.result.current.finished).toBe(true);
    expect(view.result.current.winner).toBe('me');
  });

  it('submit emits submitShiritoriWord', () => {
    const { view, emit } = setup();
    act(() => view.result.current.submit('ねこ'));
    expect(emit).toHaveBeenCalledWith('submitShiritoriWord', { word: 'ねこ' });
  });
});
