/**
 * useOpponentWordFeed Hook Tests
 *
 * The hook consumes batched `opponentWordsBatch` events ({ words: [...] }) —
 * the server coalesces per-word opponent finds into one windowed broadcast.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOpponentWordFeed } from '../useOpponentWordFeed';
import { useSelectionStore, resetSelection } from '../useSelectionStore';

// Mock socket
const mockOn = vi.fn();
const mockOff = vi.fn();
const mockSocket = { on: mockOn, off: mockOff } as any;

interface WordEvent {
  playerId: string;
  playerName: string;
  wordLength: number;
  firstLetter: string;
  lastLetter: string;
  score: number;
}

/** Grab the registered opponentWordsBatch listener. */
function getHandler() {
  return mockOn.mock.calls.find((c: any[]) => c[0] === 'opponentWordsBatch')?.[1];
}

/** Fire a batch of one or more words through the handler. */
function emitBatch(handler: (d: { words: WordEvent[] }) => void, words: WordEvent[]) {
  act(() => handler({ words }));
}

const word = (over: Partial<WordEvent> = {}): WordEvent => ({
  playerId: 'p1',
  playerName: 'Alice',
  wordLength: 5,
  firstLetter: 'H',
  lastLetter: 'O',
  score: 4,
  ...over,
});

describe('useOpponentWordFeed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
    resetSelection();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetSelection();
  });

  it('should return empty feedItems initially', () => {
    const { result } = renderHook(() =>
      useOpponentWordFeed({ socket: mockSocket, currentPlayerName: 'me' })
    );
    expect(result.current.feedItems).toEqual([]);
  });

  it('should add item when an opponentWordsBatch event fires', () => {
    const { result } = renderHook(() =>
      useOpponentWordFeed({ socket: mockSocket, currentPlayerName: 'me' })
    );
    const handler = getHandler();
    expect(handler).toBeDefined();

    emitBatch(handler, [word({ playerName: 'Alice', wordLength: 5 })]);

    expect(result.current.feedItems).toHaveLength(1);
    expect(result.current.feedItems[0].playerName).toBe('Alice');
    expect(result.current.feedItems[0].wordLength).toBe(5);
  });

  it('should add ALL words from a multi-word batch in one event', () => {
    const { result } = renderHook(() =>
      useOpponentWordFeed({ socket: mockSocket, currentPlayerName: 'me' })
    );
    const handler = getHandler();

    emitBatch(handler, [
      word({ playerName: 'Alice' }),
      word({ playerName: 'Bob' }),
      word({ playerName: 'Carol' }),
    ]);

    expect(result.current.feedItems).toHaveLength(3);
    expect(result.current.feedItems.map((i) => i.playerName)).toEqual(['Alice', 'Bob', 'Carol']);
  });

  it('should filter out own player words within a batch', () => {
    const { result } = renderHook(() =>
      useOpponentWordFeed({ socket: mockSocket, currentPlayerName: 'me' })
    );
    const handler = getHandler();

    emitBatch(handler, [
      word({ playerName: 'me', playerId: 'me-id' }),
      word({ playerName: 'Alice' }),
    ]);

    expect(result.current.feedItems).toHaveLength(1);
    expect(result.current.feedItems[0].playerName).toBe('Alice');
  });

  it('should auto-remove entries after 3 seconds', () => {
    const { result } = renderHook(() =>
      useOpponentWordFeed({ socket: mockSocket, currentPlayerName: 'me' })
    );
    const handler = getHandler();

    emitBatch(handler, [word({ playerName: 'Alice', wordLength: 4 })]);
    expect(result.current.feedItems).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.feedItems).toHaveLength(0);
  });

  it('should keep max 10 items in queue (FIFO)', () => {
    const { result } = renderHook(() =>
      useOpponentWordFeed({ socket: mockSocket, currentPlayerName: 'me' })
    );
    const handler = getHandler();

    for (let i = 0; i < 12; i++) {
      emitBatch(handler, [word({ playerId: `p${i}`, playerName: `Player${i}` })]);
    }

    expect(result.current.feedItems.length).toBeLessThanOrEqual(10);
    expect(result.current.feedItems[result.current.feedItems.length - 1].playerName).toBe('Player11');
  });

  it('should mark long words (6+ letters) as isLongWord', () => {
    const { result } = renderHook(() =>
      useOpponentWordFeed({ socket: mockSocket, currentPlayerName: 'me' })
    );
    const handler = getHandler();

    emitBatch(handler, [word({ wordLength: 7, lastLetter: 'Z', score: 6 })]);
    expect(result.current.feedItems[0].isLongWord).toBe(true);
  });

  it('should not add items when disabled via localStorage', () => {
    localStorage.setItem('lexiclash_opponent_feed_enabled', 'false');
    const { result } = renderHook(() =>
      useOpponentWordFeed({ socket: mockSocket, currentPlayerName: 'me' })
    );
    const handler = getHandler();

    emitBatch(handler, [word()]);
    expect(result.current.feedItems).toHaveLength(0);
  });

  it('should NOT add items while the player is mid-drag building a word (letterCount > 0)', () => {
    const { result } = renderHook(() =>
      useOpponentWordFeed({ socket: mockSocket, currentPlayerName: 'me' })
    );
    const handler = getHandler();

    act(() => {
      useSelectionStore.getState().setSelection('CA', 2);
    });
    emitBatch(handler, [word()]);
    expect(result.current.feedItems).toHaveLength(0);

    act(() => {
      resetSelection();
    });
    emitBatch(handler, [word({ playerId: 'p2', playerName: 'Bob', wordLength: 4, lastLetter: 'B', score: 3 })]);

    expect(result.current.feedItems).toHaveLength(1);
    expect(result.current.feedItems[0].playerName).toBe('Bob');
  });

  it('should clean up listener on unmount', () => {
    const { unmount } = renderHook(() =>
      useOpponentWordFeed({ socket: mockSocket, currentPlayerName: 'me' })
    );
    unmount();
    expect(mockOff).toHaveBeenCalledWith('opponentWordsBatch', expect.any(Function));
  });
});
