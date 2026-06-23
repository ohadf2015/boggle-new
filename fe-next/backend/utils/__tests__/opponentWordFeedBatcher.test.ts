/**
 * opponentWordFeedBatcher tests — TDD RED phase
 *
 * The opponent word feed is a cosmetic, ephemeral UI feed. Previously every
 * valid word fired its own `opponentWordFound` room broadcast → O(N) emits per
 * word, O(N²) room-wide under N submitters. The batcher coalesces all words in
 * a short window into ONE `opponentWordsBatch` broadcast, collapsing volume to
 * ~1 emit per window regardless of submission rate.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../socketHelpers', () => ({
  volatileBroadcastToRoom: vi.fn(),
  getGameRoom: (code: string) => `game:${code}`,
}));

import {
  queueOpponentWord,
  flushOpponentWordFeed,
  clearOpponentWordFeed,
  type OpponentWordItem,
} from '../opponentWordFeedBatcher';
import { volatileBroadcastToRoom } from '../socketHelpers';

const mockIo = {} as any;
const item = (playerName: string): OpponentWordItem => ({
  playerId: playerName,
  playerName,
  wordLength: 4,
  firstLetter: 'A',
  lastLetter: 'Z',
  score: 10,
});

describe('opponentWordFeedBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    clearOpponentWordFeed('G1');
    vi.useRealTimers();
  });

  it('coalesces multiple words in the window into ONE batch broadcast', () => {
    queueOpponentWord(mockIo, 'G1', item('alice'), 150);
    queueOpponentWord(mockIo, 'G1', item('bob'), 150);
    queueOpponentWord(mockIo, 'G1', item('carol'), 150);

    // Nothing emitted yet — still inside the window
    expect(volatileBroadcastToRoom).not.toHaveBeenCalled();

    vi.advanceTimersByTime(150);

    // Exactly one broadcast carrying all three words
    expect(volatileBroadcastToRoom).toHaveBeenCalledTimes(1);
    const [, room, event, payload] = (volatileBroadcastToRoom as any).mock.calls[0];
    expect(room).toBe('game:G1');
    expect(event).toBe('opponentWordsBatch');
    expect(payload.words).toHaveLength(3);
    expect(payload.words.map((w: OpponentWordItem) => w.playerName)).toEqual(['alice', 'bob', 'carol']);
  });

  it('does not emit when no words queued', () => {
    flushOpponentWordFeed(mockIo, 'G1');
    expect(volatileBroadcastToRoom).not.toHaveBeenCalled();
  });

  it('starts a fresh window after a flush', () => {
    queueOpponentWord(mockIo, 'G1', item('alice'), 150);
    vi.advanceTimersByTime(150);
    queueOpponentWord(mockIo, 'G1', item('bob'), 150);
    vi.advanceTimersByTime(150);
    expect(volatileBroadcastToRoom).toHaveBeenCalledTimes(2);
  });

  it('isolates buffers per game code', () => {
    queueOpponentWord(mockIo, 'G1', item('alice'), 150);
    queueOpponentWord(mockIo, 'G2', item('bob'), 150);
    vi.advanceTimersByTime(150);
    expect(volatileBroadcastToRoom).toHaveBeenCalledTimes(2);
    clearOpponentWordFeed('G2');
  });

  it('clearOpponentWordFeed cancels a pending flush (no leak, no late emit)', () => {
    queueOpponentWord(mockIo, 'G1', item('alice'), 150);
    clearOpponentWordFeed('G1');
    vi.advanceTimersByTime(500);
    expect(volatileBroadcastToRoom).not.toHaveBeenCalled();
  });

  it('caps batch size to bound memory under a flood (keeps newest)', () => {
    for (let i = 0; i < 200; i++) queueOpponentWord(mockIo, 'G1', item(`p${i}`), 150);
    vi.advanceTimersByTime(150);
    const [, , , payload] = (volatileBroadcastToRoom as any).mock.calls[0];
    expect(payload.words.length).toBeLessThanOrEqual(60);
    // newest retained
    expect(payload.words[payload.words.length - 1].playerName).toBe('p199');
  });
});
