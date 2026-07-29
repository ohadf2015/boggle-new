/**
 * Wheel Rush Handler Tests
 * Outcome→broadcast mapping for submitWheelWord.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Server, Socket } from 'socket.io';

vi.mock('../../utils/logger', () => {
  const l = { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() };
  return { __esModule: true, default: l, ...l };
});

vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  volatileBroadcastToRoom: vi.fn(),
  getGameRoom: vi.fn((code: string) => `room:${code}`),
}));

vi.mock('../../utils/timerManager', () => ({
  __esModule: true,
  default: { setTimeout: vi.fn(), clearTimer: vi.fn(), clearTimersWithPrefix: vi.fn() },
}));

const { cleanupCallbacks } = vi.hoisted(() => ({
  cleanupCallbacks: {} as { onGameEnd?: (p: { gameCode: string }) => void; onGameReset?: (p: { gameCode: string }) => void },
}));
vi.mock('../../events/gameCleanup', () => ({
  gameCleanupEmitter: {
    onGameEnd: vi.fn((cb: (p: { gameCode: string }) => void) => { cleanupCallbacks.onGameEnd = cb; }),
    onGameReset: vi.fn((cb: (p: { gameCode: string }) => void) => { cleanupCallbacks.onGameReset = cb; }),
  },
}));

vi.mock('../../modules/gameStateManager', () => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(() => 'GAME1'),
  getUsernameBySocketId: vi.fn(() => 'p1'),
  updatePlayerScore: vi.fn(),
  addPlayerWord: vi.fn(),
}));

vi.mock('../../modules/wheelRushManager', () => ({
  validateWheelSubmission: vi.fn(),
  applyWheelWord: vi.fn(),
  reapExpiredLocks: vi.fn(() => []),
}));

vi.mock('../../modules/scoreManager', () => ({
  getLeaderboard: vi.fn(() => []),
  getLeaderboardThrottled: vi.fn(),
}));

import { handleSubmitWheelWord, handleRequestWheelRushState } from '../wheelRushHandler';
import { broadcastToRoom } from '../../utils/socketHelpers';
import { getGame, updatePlayerScore, addPlayerWord } from '../../modules/gameStateManager';
import { validateWheelSubmission, applyWheelWord } from '../../modules/wheelRushManager';
import { getLeaderboard } from '../../modules/scoreManager';
import timerManager from '../../utils/timerManager';

const mkSocket = () => ({ id: 's1', emit: vi.fn() } as unknown as Socket);
const mkIo = () => ({} as Server);

const gameBase = {
  gameState: 'in-progress',
  gameMode: 'wheel-rush',
  language: 'en',
  users: {
    p1: { avatar: 'default', isHost: true },
    p2: { avatar: 'default', isHost: false },
  },
  playerScores: { p1: 0, p2: 0 },
  playerWords: { p1: [], p2: [] },
  wheelRushState: {
    puzzle: { centerLetter: 'C', outerLetters: ['A','N','E','S','T','X'], allLetters: ['C','A','N','E','S','T','X'] },
    foundWords: { p1: [], p2: [] },
    locks: {},
    closed: [],
    startedAt: 1000,
  },
};

describe('wheelRushHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('emits wheelWordResult error when validation fails', () => {
    (getGame as unknown as Mock).mockReturnValue(gameBase);
    (validateWheelSubmission as unknown as Mock).mockReturnValue({ valid: false, error: 'not-a-word' });
    const sock = mkSocket();
    handleSubmitWheelWord(mkIo(), sock, { word: 'CANT' });
    expect(sock.emit).toHaveBeenCalledWith('wheelWordResult', { word: 'CANT', accepted: false, error: 'not-a-word' });
    expect(broadcastToRoom).not.toHaveBeenCalled();
  });

  it('broadcasts wheelWordLocked on locked outcome', () => {
    (getGame as unknown as Mock).mockReturnValue(gameBase);
    (validateWheelSubmission as unknown as Mock).mockReturnValue({ valid: true });
    (applyWheelWord as unknown as Mock).mockReturnValue({ kind: 'locked', score: 12, lockUntil: 9999 });
    const sock = mkSocket();
    handleSubmitWheelWord(mkIo(), sock, { word: 'CANE' });
    expect(updatePlayerScore).toHaveBeenCalledWith('GAME1', 'p1', 12, true);
    expect(addPlayerWord).toHaveBeenCalledWith('GAME1', 'p1', 'CANE',
      expect.objectContaining({ score: 12, validated: true, autoValidated: true }));
    expect(broadcastToRoom).toHaveBeenCalledWith(expect.anything(), 'room:GAME1', 'wheelWordLocked',
      { word: 'CANE', by: 'p1', lockUntil: 9999 });
  });

  it('broadcasts wheelWordStolen on stolen outcome with steal bonus total', () => {
    (getGame as unknown as Mock).mockReturnValue(gameBase);
    (validateWheelSubmission as unknown as Mock).mockReturnValue({ valid: true });
    (applyWheelWord as unknown as Mock).mockReturnValue({ kind: 'stolen', score: 8, stealBonus: 3, from: 'p2' });
    const sock = mkSocket();
    handleSubmitWheelWord(mkIo(), sock, { word: 'CANE' });
    expect(updatePlayerScore).toHaveBeenCalledWith('GAME1', 'p1', 11, true);
    expect(addPlayerWord).toHaveBeenCalledWith('GAME1', 'p1', 'CANE',
      expect.objectContaining({ score: 11, validated: true, autoValidated: true }));
    expect(broadcastToRoom).toHaveBeenCalledWith(expect.anything(), 'room:GAME1', 'wheelWordStolen',
      { word: 'CANE', by: 'p1', from: 'p2' });
  });

  it('emits rejection without broadcast on rejected outcome', () => {
    (getGame as unknown as Mock).mockReturnValue(gameBase);
    (validateWheelSubmission as unknown as Mock).mockReturnValue({ valid: true });
    (applyWheelWord as unknown as Mock).mockReturnValue({ kind: 'rejected', reason: 'duplicate' });
    const sock = mkSocket();
    handleSubmitWheelWord(mkIo(), sock, { word: 'CANE' });
    expect(sock.emit).toHaveBeenCalledWith('wheelWordResult', { word: 'CANE', accepted: false, error: 'duplicate' });
    expect(broadcastToRoom).not.toHaveBeenCalled();
    expect(updatePlayerScore).not.toHaveBeenCalled();
    expect(addPlayerWord).not.toHaveBeenCalled();
  });

  it('rejects when game is not wheel-rush mode', () => {
    (getGame as unknown as Mock).mockReturnValue({ ...gameBase, gameMode: 'classic' });
    const sock = mkSocket();
    handleSubmitWheelWord(mkIo(), sock, { word: 'CANE' });
    expect(sock.emit).toHaveBeenCalledWith('error', { message: 'Not a wheel-rush game' });
    expect(validateWheelSubmission).not.toHaveBeenCalled();
  });

  describe('requestWheelRushState — reconnect snapshot', () => {
    it('emits wheelRushInit with full state snapshot (puzzle + foundWords + locks + closed)', () => {
      const richState = {
        ...gameBase,
        wheelRushState: {
          puzzle: { centerLetter: 'C', outerLetters: ['A','N','E'], allLetters: ['C','A','N','E'] },
          foundWords: { p1: ['CANE'], p2: ['ACE'] },
          locks: { CANE: { by: 'p1', until: 9999 } },
          closed: ['ACE'],
          startedAt: 1234,
        },
      };
      (getGame as unknown as Mock).mockReturnValue(richState);
      const sock = mkSocket();
      handleRequestWheelRushState(sock);
      expect(sock.emit).toHaveBeenCalledWith('wheelRushInit', expect.objectContaining({
        puzzle: richState.wheelRushState.puzzle,
        startedAt: 1234,
        foundWords: { p1: ['CANE'], p2: ['ACE'] },
        locks: { CANE: { by: 'p1', until: 9999 } },
        closed: ['ACE'],
      }));
    });

    it('returns silently if not a wheel-rush game', () => {
      (getGame as unknown as Mock).mockReturnValue({ ...gameBase, gameMode: 'classic' });
      const sock = mkSocket();
      handleRequestWheelRushState(sock);
      expect(sock.emit).not.toHaveBeenCalled();
    });

    it('also pushes the current leaderboard so a reconnecting player sees fresh opponent scores immediately', () => {
      // Reconnect/late-join: opponent scores only otherwise refresh on the next
      // score event, leaving the rival chip stale (or empty) until then.
      (getGame as unknown as Mock).mockReturnValue(gameBase);
      (getLeaderboard as unknown as Mock).mockReturnValue([
        { username: 'p1', score: 30 },
        { username: 'p2', score: 50 },
      ]);
      const sock = mkSocket();
      handleRequestWheelRushState(sock);
      expect(sock.emit).toHaveBeenCalledWith('updateLeaderboard', {
        leaderboard: [
          { username: 'p1', score: 30 },
          { username: 'p2', score: 50 },
        ],
      });
    });
  });

  describe('cleanup on game end/reset', () => {
    it('clears all per-word reap timers for the game on game end', () => {
      cleanupCallbacks.onGameEnd?.({ gameCode: 'GAME1' });
      expect(timerManager.clearTimersWithPrefix).toHaveBeenCalledWith('wheelRushReap:GAME1:');
    });

    it('clears all per-word reap timers for the game on game reset', () => {
      cleanupCallbacks.onGameReset?.({ gameCode: 'GAME1' });
      expect(timerManager.clearTimersWithPrefix).toHaveBeenCalledWith('wheelRushReap:GAME1:');
    });
  });
});
