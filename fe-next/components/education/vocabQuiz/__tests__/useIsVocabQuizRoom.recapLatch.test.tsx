import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { projectorShowsQuiz, useRecapShownLatch } from '../useIsVocabQuizRoom';

function fakeSocket() {
  const handlers = new Map<string, Set<(payload?: unknown) => void>>();
  return {
    emit: vi.fn(),
    on(event: string, fn: (payload?: unknown) => void) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(fn);
    },
    off(event: string, fn: (payload?: unknown) => void) {
      handlers.get(event)?.delete(fn);
    },
    fire(event: string, payload?: unknown) {
      for (const fn of handlers.get(event) ?? []) fn(payload);
    },
  };
}

describe('useRecapShownLatch', () => {
  it('keeps the quiz finale off the wall after the teacher leaves the recap, until the next round starts', () => {
    const socket = fakeSocket();
    const { result, rerender } = renderHook(({ hasRecap }) => useRecapShownLatch(socket as unknown as Socket, hasRecap), {
      initialProps: { hasRecap: false },
    });
    expect(result.current).toBe(false);

    rerender({ hasRecap: true });
    expect(result.current).toBe(true);

    // Play again / Next mode clears finalScores before the next startGame lands.
    rerender({ hasRecap: false });
    expect(result.current).toBe(true);
    expect(projectorShowsQuiz({ isQuizRoom: true, hasRecap: result.current })).toBe(false);

    act(() => socket.fire('startGame', {}));
    expect(result.current).toBe(false);
    expect(projectorShowsQuiz({ isQuizRoom: true, hasRecap: result.current })).toBe(true);
  });
});
