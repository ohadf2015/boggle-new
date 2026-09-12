/**
 * "Waiting for opponent…" forever, with no way out, was half of what got this
 * piece disqualified.
 *
 * The duel screen announced itself ONCE with `duel:join-game`. If that landed
 * before the server had the game state — which is exactly what a rematch does,
 * since both clients navigate the instant the duel is created — the server
 * answered `duel:error { Duel is not running }`, the screen dropped it on the
 * floor, and the spinner spun until the duel timed out.
 *
 * This hook owns the join: it retries a few times, and when it truly cannot
 * join it SAYS so instead of spinning (recurring-pitfalls Class 4).
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDuelGameJoin, DUEL_JOIN_RETRY_MS, DUEL_JOIN_MAX_ATTEMPTS } from '../useDuelGameJoin';

describe('useDuelGameJoin', () => {
  const joinDuelGame = vi.fn();
  let errorCb: ((data: { message?: string }) => void) | null = null;
  const onError = vi.fn((cb: (data: { message?: string }) => void) => {
    errorCb = cb;
    return () => {};
  });

  function setup(props: Record<string, unknown> = {}) {
    return renderHook(
      (p: Record<string, unknown>) =>
        useDuelGameJoin({
          duelId: 'duel-1',
          isConnected: true,
          joined: false,
          joinDuelGame,
          onError,
          ...props,
          ...p,
        }),
      { initialProps: {} }
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    errorCb = null;
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('announces the screen to the server as soon as the socket is up', () => {
    setup();
    expect(joinDuelGame).toHaveBeenCalledWith('duel-1');
  });

  it('waits for the socket rather than shouting into a closed one', () => {
    setup({ isConnected: false });
    expect(joinDuelGame).not.toHaveBeenCalled();
  });

  it('retries when the server says the duel is not running yet', () => {
    setup();
    expect(joinDuelGame).toHaveBeenCalledTimes(1);

    act(() => errorCb?.({ message: 'Duel is not running' }));
    act(() => void vi.advanceTimersByTime(DUEL_JOIN_RETRY_MS));

    expect(joinDuelGame).toHaveBeenCalledTimes(2);
  });

  it('gives up out loud — stalled, not spinning', () => {
    const { result } = setup();

    for (let i = 0; i < DUEL_JOIN_MAX_ATTEMPTS + 1; i += 1) {
      act(() => errorCb?.({ message: 'Duel is not running' }));
      act(() => void vi.advanceTimersByTime(DUEL_JOIN_RETRY_MS));
    }

    expect(result.current.stalled).toBe(true);
    expect(joinDuelGame).toHaveBeenCalledTimes(DUEL_JOIN_MAX_ATTEMPTS);
  });

  it('stops retrying the moment the duel actually starts', () => {
    const { rerender } = setup();
    rerender({ joined: true });

    act(() => errorCb?.({ message: 'Duel is not running' }));
    act(() => void vi.advanceTimersByTime(DUEL_JOIN_RETRY_MS * 3));

    expect(joinDuelGame).toHaveBeenCalledTimes(1);
  });

  it('lets the student ask again by hand', () => {
    const { result } = setup();

    for (let i = 0; i < DUEL_JOIN_MAX_ATTEMPTS + 1; i += 1) {
      act(() => errorCb?.({ message: 'Duel is not running' }));
      act(() => void vi.advanceTimersByTime(DUEL_JOIN_RETRY_MS));
    }
    expect(result.current.stalled).toBe(true);

    act(() => result.current.retry());

    expect(result.current.stalled).toBe(false);
    expect(joinDuelGame).toHaveBeenCalledTimes(DUEL_JOIN_MAX_ATTEMPTS + 1);
  });
});
