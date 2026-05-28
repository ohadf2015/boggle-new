/**
 * useOpponentWordFeed Hook Tests
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOpponentWordFeed } from '../useOpponentWordFeed';
import { useSelectionStore, resetSelection } from '../useSelectionStore';

// Mock socket
const mockOn = vi.fn();
const mockOff = vi.fn();
const mockSocket = { on: mockOn, off: mockOff } as any;

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

  it('should add item when opponentWordFound event fires', () => {
    const { result } = renderHook(() =>
      useOpponentWordFeed({ socket: mockSocket, currentPlayerName: 'me' })
    );

    // Get the listener registered for opponentWordFound
    const handler = mockOn.mock.calls.find(
      (c: any[]) => c[0] === 'opponentWordFound'
    )?.[1];
    expect(handler).toBeDefined();

    act(() => {
      handler({
        playerId: 'p1',
        playerName: 'Alice',
        wordLength: 5,
        firstLetter: 'H',
        lastLetter: 'O',
        score: 4,
      });
    });

    expect(result.current.feedItems).toHaveLength(1);
    expect(result.current.feedItems[0].playerName).toBe('Alice');
    expect(result.current.feedItems[0].wordLength).toBe(5);
  });

  it('should filter out own player words', () => {
    const { result } = renderHook(() =>
      useOpponentWordFeed({ socket: mockSocket, currentPlayerName: 'me' })
    );

    const handler = mockOn.mock.calls.find(
      (c: any[]) => c[0] === 'opponentWordFound'
    )?.[1];

    act(() => {
      handler({
        playerId: 'me-id',
        playerName: 'me',
        wordLength: 5,
        firstLetter: 'A',
        lastLetter: 'B',
        score: 4,
      });
    });

    expect(result.current.feedItems).toHaveLength(0);
  });

  it('should auto-remove entries after 3 seconds', () => {
    const { result } = renderHook(() =>
      useOpponentWordFeed({ socket: mockSocket, currentPlayerName: 'me' })
    );

    const handler = mockOn.mock.calls.find(
      (c: any[]) => c[0] === 'opponentWordFound'
    )?.[1];

    act(() => {
      handler({
        playerId: 'p1',
        playerName: 'Alice',
        wordLength: 4,
        firstLetter: 'A',
        lastLetter: 'B',
        score: 3,
      });
    });

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

    const handler = mockOn.mock.calls.find(
      (c: any[]) => c[0] === 'opponentWordFound'
    )?.[1];

    for (let i = 0; i < 12; i++) {
      act(() => {
        handler({
          playerId: `p${i}`,
          playerName: `Player${i}`,
          wordLength: 4,
          firstLetter: 'A',
          lastLetter: 'B',
          score: 3,
        });
      });
    }

    expect(result.current.feedItems.length).toBeLessThanOrEqual(10);
    // Newest should be last
    expect(result.current.feedItems[result.current.feedItems.length - 1].playerName).toBe('Player11');
  });

  it('should mark long words (6+ letters) as isLongWord', () => {
    const { result } = renderHook(() =>
      useOpponentWordFeed({ socket: mockSocket, currentPlayerName: 'me' })
    );

    const handler = mockOn.mock.calls.find(
      (c: any[]) => c[0] === 'opponentWordFound'
    )?.[1];

    act(() => {
      handler({
        playerId: 'p1',
        playerName: 'Alice',
        wordLength: 7,
        firstLetter: 'A',
        lastLetter: 'Z',
        score: 6,
      });
    });

    expect(result.current.feedItems[0].isLongWord).toBe(true);
  });

  it('should not add items when disabled via localStorage', () => {
    localStorage.setItem('lexiclash_opponent_feed_enabled', 'false');

    const { result } = renderHook(() =>
      useOpponentWordFeed({ socket: mockSocket, currentPlayerName: 'me' })
    );

    const handler = mockOn.mock.calls.find(
      (c: any[]) => c[0] === 'opponentWordFound'
    )?.[1];

    act(() => {
      handler({
        playerId: 'p1',
        playerName: 'Alice',
        wordLength: 5,
        firstLetter: 'A',
        lastLetter: 'B',
        score: 4,
      });
    });

    expect(result.current.feedItems).toHaveLength(0);
  });

  it('should NOT add items while the player is mid-drag building a word (letterCount > 0)', () => {
    const { result } = renderHook(() =>
      useOpponentWordFeed({ socket: mockSocket, currentPlayerName: 'me' })
    );

    const handler = mockOn.mock.calls.find(
      (c: any[]) => c[0] === 'opponentWordFound'
    )?.[1];

    // Player starts building a word — opponent flood must not steal paint budget
    act(() => {
      useSelectionStore.getState().setSelection('CA', 2);
    });

    act(() => {
      handler({
        playerId: 'p1',
        playerName: 'Alice',
        wordLength: 5,
        firstLetter: 'H',
        lastLetter: 'O',
        score: 4,
      });
    });

    // Suppressed while selecting
    expect(result.current.feedItems).toHaveLength(0);

    // Once the selection clears, opponent words resume
    act(() => {
      resetSelection();
    });
    act(() => {
      handler({
        playerId: 'p2',
        playerName: 'Bob',
        wordLength: 4,
        firstLetter: 'A',
        lastLetter: 'B',
        score: 3,
      });
    });

    expect(result.current.feedItems).toHaveLength(1);
    expect(result.current.feedItems[0].playerName).toBe('Bob');
  });

  it('should clean up listener on unmount', () => {
    const { unmount } = renderHook(() =>
      useOpponentWordFeed({ socket: mockSocket, currentPlayerName: 'me' })
    );

    unmount();

    expect(mockOff).toHaveBeenCalledWith('opponentWordFound', expect.any(Function));
  });
});
