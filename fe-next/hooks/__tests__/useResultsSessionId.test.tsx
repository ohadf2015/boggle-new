import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResultsSessionId, withResultsSessionId } from '@/hooks/useResultsSessionId';

function fakeSocket() {
  const handlers = new Map<string, Set<(d: unknown) => void>>();
  return {
    on: (e: string, h: (d: unknown) => void) => { if (!handlers.has(e)) handlers.set(e, new Set()); handlers.get(e)!.add(h); },
    off: (e: string, h: (d: unknown) => void) => { handlers.get(e)?.delete(h); },
    fire: (e: string, d: unknown) => handlers.get(e)?.forEach((h) => h(d)),
    count: (e: string) => handlers.get(e)?.size ?? 0,
  };
}

describe('useResultsSessionId', () => {
  it('given the server results broadcast, when it arrives, then its round id is kept for the results screen', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useResultsSessionId(socket as never));
    act(() => socket.fire('validatedScores', { scores: [], gameSessionId: 3 }));
    expect(result.current).toBe(3);
  });

  it('given unmount, then the listener is removed', () => {
    const socket = fakeSocket();
    const { unmount } = renderHook(() => useResultsSessionId(socket as never));
    expect(socket.count('validatedScores')).toBe(1);
    unmount();
    expect(socket.count('validatedScores')).toBe(0);
  });
});

describe('withResultsSessionId', () => {
  it('given results without a round id, when merged, then the broadcast id fills it', () => {
    expect(withResultsSessionId({ scores: [] } as never, 3)).toEqual({ scores: [], gameSessionId: 3 });
  });

  it('given results that carry their own round id, then it wins', () => {
    expect(withResultsSessionId({ scores: [], gameSessionId: 5 } as never, 3)).toEqual({ scores: [], gameSessionId: 5 });
  });

  it('given no results, then nothing is invented', () => {
    expect(withResultsSessionId(null, 3)).toBeNull();
  });
});
