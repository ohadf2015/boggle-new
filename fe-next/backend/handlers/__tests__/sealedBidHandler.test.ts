/**
 * sealedBidHandler — bid locking, cross-player resolution on all-locked, and the
 * state snapshot. Uses the REAL (pure) sealedBidManager + sbMpEngine; only the
 * dictionary (trie), socket I/O, and game lookup are mocked. Timers are faked so
 * the reveal→advance setTimeout never fires during assertions.
 */
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { Server, Socket } from 'socket.io';

vi.mock('../../utils/logger', () => {
  const l = { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() };
  return { __esModule: true, default: l, ...l };
});
vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: vi.fn((code: string) => `room:${code}`),
}));
vi.mock('../../modules/gameStateManager', () => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(() => 'GAME1'),
  getUsernameBySocketId: vi.fn(() => 'p1'),
  transitionGameState: vi.fn(() => ({ success: true })),
}));
// Dictionary: only these words are valid.
const DICT = new Set(['RETAIN', 'TRAIN', 'GANDER']);
vi.mock('../../modules/boggleSolver', () => ({
  getCachedTrie: vi.fn(() => ({})),
  getTrieNode: vi.fn((_t: unknown, w: string) => (DICT.has(w) ? { isWord: true } : null)),
}));
vi.mock('../../utils/timerManager', () => ({ clearGameTimer: vi.fn() }));
vi.mock('../../modules/supabaseServer', () => ({ isSupabaseConfigured: vi.fn(() => false) }));
vi.mock('../../services/gameLifecycle/gameResults', () => ({ recordGameResultsToSupabase: vi.fn() }));

import { handleSubmitSealedBid, handleRequestSealedBidState } from '../sealedBidHandler';
import { initSealedBidState } from '../../modules/sealedBidManager';
import { broadcastToRoom } from '../../utils/socketHelpers';
import { getGame, getUsernameBySocketId } from '../../modules/gameStateManager';

const mkSocket = (id = 's1') => ({ id, emit: vi.fn() } as unknown as Socket);
const mkIo = () => ({} as Server);

const mkGame = (overrides: Record<string, unknown> = {}) => ({
  gameCode: 'GAME1',
  gameMode: 'sealed-bid',
  language: 'en',
  users: { p1: { username: 'p1', socketId: 's1' }, p2: { username: 'p2', socketId: 's2' } },
  playerScores: {},
  playerWords: {},
  sealedBidState: initSealedBidState(['p1', 'p2'], ['TRAINED', 'GARDENS'], 1000, 30000),
  ...overrides,
});

describe('sealedBidHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    (getUsernameBySocketId as unknown as Mock).mockReturnValue('p1');
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

  it('locks a valid bid and confirms it to the bidder', () => {
    const game = mkGame();
    (getGame as unknown as Mock).mockReturnValue(game);
    const sock = mkSocket();
    handleSubmitSealedBid(mkIo(), sock, { word: 'RETAIN' });
    expect(sock.emit).toHaveBeenCalledWith('sealedBidLocked', { word: 'RETAIN', valid: true });
    expect(game.sealedBidState.bids['p1']).toEqual({ word: 'RETAIN', valid: true, locked: true });
  });

  it('locks an invalid (non-dictionary) bid with valid:false', () => {
    const game = mkGame();
    (getGame as unknown as Mock).mockReturnValue(game);
    const sock = mkSocket();
    handleSubmitSealedBid(mkIo(), sock, { word: 'ZZZ' });
    expect(sock.emit).toHaveBeenCalledWith('sealedBidLocked', { word: 'ZZZ', valid: false });
  });

  it('treats an empty bid as a pass (word null)', () => {
    const game = mkGame();
    (getGame as unknown as Mock).mockReturnValue(game);
    const sock = mkSocket();
    handleSubmitSealedBid(mkIo(), sock, { word: '' });
    expect(sock.emit).toHaveBeenCalledWith('sealedBidLocked', { word: null, valid: false });
  });

  it('broadcasts lock progress', () => {
    const game = mkGame();
    (getGame as unknown as Mock).mockReturnValue(game);
    handleSubmitSealedBid(mkIo(), mkSocket(), { word: 'RETAIN' });
    expect(broadcastToRoom).toHaveBeenCalledWith(
      expect.anything(), 'room:GAME1', 'sealedBidLockProgress', { locked: 1, total: 2 },
    );
  });

  it('resolves the round once all players have locked (unique doubles)', () => {
    const game = mkGame();
    (getGame as unknown as Mock).mockReturnValue(game);
    // p1 bids RETAIN
    handleSubmitSealedBid(mkIo(), mkSocket('s1'), { word: 'RETAIN' });
    // p2 bids TRAIN → all locked → resolve
    (getUsernameBySocketId as unknown as Mock).mockReturnValue('p2');
    handleSubmitSealedBid(mkIo(), mkSocket('s2'), { word: 'TRAIN' });

    const resultCall = (broadcastToRoom as unknown as Mock).mock.calls.find((c) => c[2] === 'sealedBidRoundResult');
    expect(resultCall).toBeTruthy();
    const payload = resultCall![3];
    const p1 = payload.results.find((r: { username: string }) => r.username === 'p1');
    expect(p1.outcome).toBe('unique');
    expect(payload.scores['p1']).toBeGreaterThan(0);
    expect(game.sealedBidState.phase).toBe('revealed');
  });

  it('halves both players on a clash', () => {
    const game = mkGame();
    (getGame as unknown as Mock).mockReturnValue(game);
    handleSubmitSealedBid(mkIo(), mkSocket('s1'), { word: 'TRAIN' });
    (getUsernameBySocketId as unknown as Mock).mockReturnValue('p2');
    handleSubmitSealedBid(mkIo(), mkSocket('s2'), { word: 'TRAIN' });
    const payload = (broadcastToRoom as unknown as Mock).mock.calls.find((c) => c[2] === 'sealedBidRoundResult')![3];
    expect(payload.results.every((r: { outcome: string }) => r.outcome === 'clash')).toBe(true);
  });

  it('emits a snapshot on requestSealedBidState', () => {
    const game = mkGame();
    (getGame as unknown as Mock).mockReturnValue(game);
    const sock = mkSocket();
    handleRequestSealedBidState(sock);
    expect(sock.emit).toHaveBeenCalledWith('sealedBidInit', expect.objectContaining({
      players: ['p1', 'p2'], rack: 'TRAINED', phase: 'bidding', totalRounds: 2,
    }));
  });

  it('rejects a second lock from the same player', () => {
    const game = mkGame();
    (getGame as unknown as Mock).mockReturnValue(game);
    handleSubmitSealedBid(mkIo(), mkSocket(), { word: 'RETAIN' });
    const sock = mkSocket();
    handleSubmitSealedBid(mkIo(), sock, { word: 'TRAIN' });
    expect(sock.emit).toHaveBeenCalledWith('sealedBidRejected', { error: 'already-locked' });
  });

  it('breaks ties alphabetically — lower username wins regardless of insertion order', () => {
    // Players added p2-first so Object.entries yields p2 before p1 — the bug returns p2.
    const game = mkGame({
      users: { p2: { username: 'p2', socketId: 's2' }, p1: { username: 'p1', socketId: 's1' } },
      sealedBidState: initSealedBidState(['p2', 'p1'], ['TRAINED'], 1000, 30000),
    });
    (getGame as unknown as Mock).mockReturnValue(game);
    // Both clash on TRAIN → both score 0 → tied
    (getUsernameBySocketId as unknown as Mock).mockReturnValue('p2');
    handleSubmitSealedBid(mkIo(), mkSocket('s2'), { word: 'TRAIN' });
    (getUsernameBySocketId as unknown as Mock).mockReturnValue('p1');
    handleSubmitSealedBid(mkIo(), mkSocket('s1'), { word: 'TRAIN' });
    // Fire reveal delay then advance-to-done
    vi.runAllTimers();
    const gameOverCall = (broadcastToRoom as unknown as Mock).mock.calls.find((c) => c[2] === 'sealedBidGameOver');
    expect(gameOverCall).toBeTruthy();
    expect(gameOverCall![3].winner).toBe('p1');
  });
});
