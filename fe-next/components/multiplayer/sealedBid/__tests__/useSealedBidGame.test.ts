/**
 * useSealedBidGame — derives live Sealed Bid MP state from the server's socket
 * events (mirrors backend/handlers/sealedBidHandler payloads) and emits bids.
 * The view mounts on startGame, so the hook polls requestSealedBidState on mount
 * and waits for sealedBidInit. Tested with a mock socket.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSealedBidGame, type SealedBidSocketLike } from '../useSealedBidGame';

function mockSocket() {
  const handlers = new Map<string, ((d: unknown) => void)[]>();
  const emit = vi.fn();
  const socket: SealedBidSocketLike = {
    on: (e, h) => { handlers.set(e, [...(handlers.get(e) ?? []), h]); },
    off: (e, h) => { handlers.set(e, (handlers.get(e) ?? []).filter((x) => x !== h)); },
    emit,
  };
  const fire = (e: string, d: unknown) => act(() => { (handlers.get(e) ?? []).forEach((h) => h(d)); });
  return { socket, fire, emit };
}

const INIT = {
  players: ['me', 'bob'], racks: ['TRAINED', 'GARDENS'], index: 0, rack: 'TRAINED',
  phase: 'bidding', scores: { me: 0, bob: 0 }, roundDeadline: 31000, totalRounds: 2,
};

describe('useSealedBidGame', () => {
  it('requests state on mount', () => {
    const { socket, emit } = mockSocket();
    renderHook(() => useSealedBidGame(socket, 'me'));
    expect(emit).toHaveBeenCalledWith('requestSealedBidState', {});
  });

  it('seeds rack/phase/scores from sealedBidInit', () => {
    const { socket, fire } = mockSocket();
    const { result } = renderHook(() => useSealedBidGame(socket, 'me'));
    fire('sealedBidInit', INIT);
    expect(result.current.rack).toBe('TRAINED');
    expect(result.current.phase).toBe('bidding');
    expect(result.current.totalRounds).toBe(2);
  });

  it('records my locked bid', () => {
    const { socket, fire } = mockSocket();
    const { result } = renderHook(() => useSealedBidGame(socket, 'me'));
    fire('sealedBidInit', INIT);
    fire('sealedBidLocked', { word: 'RETAIN', valid: true });
    expect(result.current.myLock).toEqual({ word: 'RETAIN', valid: true });
  });

  it('tracks lock progress', () => {
    const { socket, fire } = mockSocket();
    const { result } = renderHook(() => useSealedBidGame(socket, 'me'));
    fire('sealedBidInit', INIT);
    fire('sealedBidLockProgress', { locked: 1, total: 2 });
    expect(result.current.lockProgress).toEqual({ locked: 1, total: 2 });
  });

  it('reveals round results', () => {
    const { socket, fire } = mockSocket();
    const { result } = renderHook(() => useSealedBidGame(socket, 'me'));
    fire('sealedBidInit', INIT);
    fire('sealedBidRoundResult', {
      index: 0, rack: 'TRAINED',
      results: [{ username: 'me', word: 'RETAIN', outcome: 'unique', basePoints: 6, points: 12 }],
      scores: { me: 12, bob: 0 },
    });
    expect(result.current.phase).toBe('revealed');
    expect(result.current.results?.[0].outcome).toBe('unique');
    expect(result.current.scores.me).toBe(12);
  });

  it('advances to the next round, clearing my lock + results', () => {
    const { socket, fire } = mockSocket();
    const { result } = renderHook(() => useSealedBidGame(socket, 'me'));
    fire('sealedBidInit', INIT);
    fire('sealedBidLocked', { word: 'RETAIN', valid: true });
    fire('sealedBidRoundResult', { index: 0, rack: 'TRAINED', results: [], scores: { me: 12, bob: 0 } });
    fire('sealedBidNextRound', { index: 1, rack: 'GARDENS', roundDeadline: 61000, scores: { me: 12, bob: 0 } });
    expect(result.current.phase).toBe('bidding');
    expect(result.current.rack).toBe('GARDENS');
    expect(result.current.index).toBe(1);
    expect(result.current.myLock).toBeNull();
    expect(result.current.results).toBeNull();
  });

  it('finishes on game over with a winner', () => {
    const { socket, fire } = mockSocket();
    const { result } = renderHook(() => useSealedBidGame(socket, 'me'));
    fire('sealedBidInit', INIT);
    fire('sealedBidGameOver', { scores: { me: 20, bob: 8 }, winner: 'me' });
    expect(result.current.phase).toBe('done');
    expect(result.current.winner).toBe('me');
  });

  it('submit emits submitSealedBid', () => {
    const { socket, fire, emit } = mockSocket();
    const { result } = renderHook(() => useSealedBidGame(socket, 'me'));
    fire('sealedBidInit', INIT);
    act(() => result.current.submitBid('RETAIN'));
    expect(emit).toHaveBeenCalledWith('submitSealedBid', { word: 'RETAIN' });
  });
});
