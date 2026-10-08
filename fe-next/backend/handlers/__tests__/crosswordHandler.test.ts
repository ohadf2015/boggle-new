/**
 * crosswordHandler — progress aggregation, standings broadcast, all-solved
 * finalize, and the state snapshot. Uses the REAL (pure) crosswordMpManager;
 * only socket I/O + game lookup are mocked.
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
}));
vi.mock('../../services/gameLifecycle/gameEnd', () => ({ endGame: vi.fn(() => Promise.resolve()) }));

import { handleSubmitCrosswordProgress, handleRequestCrosswordMpState } from '../crosswordHandler';
import { initCrosswordMpState } from '../../modules/crosswordMpManager';
import { broadcastToRoom } from '../../utils/socketHelpers';
import { getGame, getUsernameBySocketId } from '../../modules/gameStateManager';
import { endGame } from '../../services/gameLifecycle/gameEnd';

const PUZZLE = { id: 'en-mini-001', locale: 'en', size: 5, cells: [], slots: [] };
const mkSocket = (id = 's1') => ({ id, emit: vi.fn() } as unknown as Socket);
const mkIo = () => ({} as Server);

const mkGame = (overrides: Record<string, unknown> = {}) => ({
  gameCode: 'GAME1',
  gameMode: 'crossword',
  gameState: 'in-progress',
  language: 'en',
  users: { p1: { username: 'p1', socketId: 's1' }, p2: { username: 'p2', socketId: 's2' } },
  playerScores: {},
  crosswordMpState: initCrosswordMpState(['p1', 'p2'], PUZZLE, 1000),
  ...overrides,
});

describe('crosswordHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getUsernameBySocketId as unknown as Mock).mockReturnValue('p1');
  });
  afterEach(() => vi.clearAllMocks());

  it('applies progress and broadcasts ranked standings', () => {
    const game = mkGame();
    (getGame as unknown as Mock).mockReturnValue(game);
    handleSubmitCrosswordProgress(mkIo(), mkSocket(), { percent: 40, solved: false, elapsedMs: 12000, score: 0 });
    expect(game.crosswordMpState.progress.p1.percent).toBe(40);
    const call = (broadcastToRoom as unknown as Mock).mock.calls.find((c) => c[2] === 'crosswordStandings');
    expect(call).toBeTruthy();
    expect(call![3].standings[0].username).toBe('p1'); // ahead of p2 at 0%
  });

  it('mirrors score onto playerScores', () => {
    const game = mkGame();
    (getGame as unknown as Mock).mockReturnValue(game);
    handleSubmitCrosswordProgress(mkIo(), mkSocket(), { percent: 100, solved: true, elapsedMs: 30000, score: 55 });
    expect(game.playerScores.p1).toBe(55);
  });

  it('broadcasts raceOver + ends the round through endGame when all players solve', () => {
    const game = mkGame();
    (getGame as unknown as Mock).mockReturnValue(game);
    handleSubmitCrosswordProgress(mkIo(), mkSocket('s1'), { percent: 100, solved: true, elapsedMs: 20000, score: 60 });
    (getUsernameBySocketId as unknown as Mock).mockReturnValue('p2');
    handleSubmitCrosswordProgress(mkIo(), mkSocket('s2'), { percent: 100, solved: true, elapsedMs: 25000, score: 50 });
    const over = (broadcastToRoom as unknown as Mock).mock.calls.find((c) => c[2] === 'crosswordRaceOver');
    expect(over).toBeTruthy();
    expect(over![3].standings[0].username).toBe('p1'); // faster solve ranks first
    expect(endGame).toHaveBeenCalledWith(expect.anything(), 'GAME1');
  });

  it('does NOT finalize while a player is unsolved', () => {
    const game = mkGame();
    (getGame as unknown as Mock).mockReturnValue(game);
    handleSubmitCrosswordProgress(mkIo(), mkSocket(), { percent: 100, solved: true, elapsedMs: 20000, score: 60 });
    const over = (broadcastToRoom as unknown as Mock).mock.calls.find((c) => c[2] === 'crosswordRaceOver');
    expect(over).toBeFalsy();
    expect(endGame).not.toHaveBeenCalled();
  });

  it('ignores progress once the round is over', () => {
    const game = mkGame({ gameState: 'finished' });
    (getGame as unknown as Mock).mockReturnValue(game);
    handleSubmitCrosswordProgress(mkIo(), mkSocket(), { percent: 100, solved: true, elapsedMs: 1, score: 99 });
    expect(game.playerScores).toEqual({});
    expect(broadcastToRoom).not.toHaveBeenCalled();
  });

  it('emits a snapshot on requestCrosswordMpState', () => {
    const game = mkGame();
    (getGame as unknown as Mock).mockReturnValue(game);
    const sock = mkSocket();
    handleRequestCrosswordMpState(sock);
    expect(sock.emit).toHaveBeenCalledWith('crosswordMpInit', expect.objectContaining({
      puzzle: PUZZLE, players: ['p1', 'p2'],
    }));
  });

  it('ignores progress for a non-crossword game', () => {
    const game = mkGame({ gameMode: 'classic' });
    (getGame as unknown as Mock).mockReturnValue(game);
    handleSubmitCrosswordProgress(mkIo(), mkSocket(), { percent: 50, solved: false, elapsedMs: 1, score: 0 });
    expect(broadcastToRoom).not.toHaveBeenCalled();
  });
});
