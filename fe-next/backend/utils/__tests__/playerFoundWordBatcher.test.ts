/**
 * playerFoundWordBatcher tests — TDD RED phase
 *
 * playerFoundWord previously fired one room broadcast per valid word → O(N²)
 * room-wide under N submitters. The batcher coalesces all word payloads in a
 * short window into ONE `playerFoundWordBatch` broadcast (array of the exact
 * same per-word payloads), collapsing volume to ~1 emit per window. Sent
 * reliably (not volatile): the batch carries the own-word pending-chip confirm
 * and host word-count/score tracking; post-coalescing the rate is low enough
 * that volatile would be pure packet-loss downside.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: (code: string) => `game:${code}`,
}));
const lb = vi.hoisted(() => ({ rows: [] as Array<{ username: string; score: number }> }));
vi.mock('../../modules/gameStateManager', () => ({
  getLeaderboard: () => lb.rows,
}));

import {
  queuePlayerFoundWord,
  flushPlayerFoundWords,
  clearPlayerFoundWords,
  type PlayerFoundWordItem,
} from '../playerFoundWordBatcher';
import { broadcastToRoom } from '../socketHelpers';

const mockIo = {} as any;
const item = (username: string, over: Partial<PlayerFoundWordItem> = {}): PlayerFoundWordItem => ({
  username,
  word: 'CAT',
  wordCount: 1,
  score: 10,
  serverSeq: 1,
  comboLevel: 0,
  isFirstFinder: false,
  inputMethod: 'tap',
  ...over,
});

describe('playerFoundWordBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    clearPlayerFoundWords('G1');
    vi.useRealTimers();
  });

  it('coalesces multiple words in the window into ONE batch broadcast (order preserved)', () => {
    queuePlayerFoundWord(mockIo, 'G1', item('alice'), 150);
    queuePlayerFoundWord(mockIo, 'G1', item('bob', { comboSync: { comboType: 'bomb_bomb', username: 'bob' } }), 150);

    expect(broadcastToRoom).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);

    expect(broadcastToRoom).toHaveBeenCalledTimes(1);
    const [, room, event, payload] = (broadcastToRoom as any).mock.calls[0];
    expect(room).toBe('game:G1');
    expect(event).toBe('playerFoundWordBatch');
    expect(payload.words).toHaveLength(2);
    expect(payload.words[0].username).toBe('alice');
    // per-word payload preserved verbatim (incl merged comboSync)
    expect(payload.words[1].comboSync).toEqual({ comboType: 'bomb_bomb', username: 'bob' });
  });

  it('does not emit when no words queued', () => {
    flushPlayerFoundWords(mockIo, 'G1');
    expect(broadcastToRoom).not.toHaveBeenCalled();
  });

  it('starts a fresh window after a flush', () => {
    queuePlayerFoundWord(mockIo, 'G1', item('alice'), 150);
    vi.advanceTimersByTime(150);
    queuePlayerFoundWord(mockIo, 'G1', item('bob'), 150);
    vi.advanceTimersByTime(150);
    expect(broadcastToRoom).toHaveBeenCalledTimes(2);
  });

  it('isolates buffers per game code', () => {
    queuePlayerFoundWord(mockIo, 'G1', item('alice'), 150);
    queuePlayerFoundWord(mockIo, 'G2', item('bob'), 150);
    vi.advanceTimersByTime(150);
    expect(broadcastToRoom).toHaveBeenCalledTimes(2);
    clearPlayerFoundWords('G2');
  });

  it('clearPlayerFoundWords cancels a pending flush (no leak, no late emit)', () => {
    queuePlayerFoundWord(mockIo, 'G1', item('alice'), 150);
    clearPlayerFoundWords('G1');
    vi.advanceTimersByTime(500);
    expect(broadcastToRoom).not.toHaveBeenCalled();
  });

  it('caps batch size to bound memory under a flood (keeps newest)', () => {
    for (let i = 0; i < 200; i++) queuePlayerFoundWord(mockIo, 'G1', item(`p${i}`), 150);
    vi.advanceTimersByTime(150);
    const [, , , payload] = (broadcastToRoom as any).mock.calls[0];
    expect(payload.words.length).toBeLessThanOrEqual(60);
    expect(payload.words[payload.words.length - 1].username).toBe('p199');
  });

  describe('reliable standings on every flush', () => {
    // The per-word `updateLeaderboard` in wordHandler is VOLATILE and is emitted
    // in the same tick as the reliable `scoreUpdate` — socket.io drops a volatile
    // packet whenever the transport is mid-write, so in practice no player ever
    // received it (measured 2026-09-18: a joined probe socket logged scoreUpdate
    // and playerFoundWordBatch, never updateLeaderboard). Students' live rank
    // strip and score were frozen until a refresh.
    it('broadcasts the server leaderboard RELIABLY right after the batch', () => {
      lb.rows = [{ username: 'ada', score: 30 }, { username: 'bo', score: 10 }];
      queuePlayerFoundWord(mockIo, 'G1', item('ada'));
      flushPlayerFoundWords(mockIo, 'G1');
      const calls = vi.mocked(broadcastToRoom).mock.calls;
      expect(calls.map((c) => c[2])).toEqual(['playerFoundWordBatch', 'updateLeaderboard']);
      expect(calls[1][1]).toBe('game:G1');
      expect(calls[1][3]).toEqual({ leaderboard: lb.rows });
    });

    it('sends no standings when nothing was found in the window', () => {
      lb.rows = [{ username: 'ada', score: 30 }];
      flushPlayerFoundWords(mockIo, 'G1');
      expect(broadcastToRoom).not.toHaveBeenCalled();
    });
  });
});
