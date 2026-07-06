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
    firstFinders: {},
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

  it('scores the word, emits accepted result, and pings wheelWordFound (first finder)', () => {
    (getGame as unknown as Mock).mockReturnValue(gameBase);
    (validateWheelSubmission as unknown as Mock).mockReturnValue({ valid: true });
    (applyWheelWord as unknown as Mock).mockReturnValue({ kind: 'scored', score: 17, firstFinder: true, firstFinderBonus: 5 });
    const sock = mkSocket();
    handleSubmitWheelWord(mkIo(), sock, { word: 'CANE' });
    expect(updatePlayerScore).toHaveBeenCalledWith('GAME1', 'p1', 17, true);
    expect(addPlayerWord).toHaveBeenCalledWith('GAME1', 'p1', 'CANE',
      expect.objectContaining({ score: 17, validated: true, autoValidated: true }));
    expect(sock.emit).toHaveBeenCalledWith('wheelWordResult', expect.objectContaining({
      word: 'CANE', accepted: true, kind: 'locked', score: 17, firstFinder: true, firstFinderBonus: 5,
    }));
    // Opponent-activity ping — never closes/locks the word for anyone else.
    expect(broadcastToRoom).toHaveBeenCalledWith(expect.anything(), 'room:GAME1', 'wheelWordFound',
      { word: 'CANE', by: 'p1', firstFinder: true });
  });

  it('scores a non-first finder without a first-finder bonus (word stays claimable)', () => {
    (getGame as unknown as Mock).mockReturnValue(gameBase);
    (validateWheelSubmission as unknown as Mock).mockReturnValue({ valid: true });
    (applyWheelWord as unknown as Mock).mockReturnValue({ kind: 'scored', score: 12, firstFinder: false, firstFinderBonus: 0 });
    const sock = mkSocket();
    handleSubmitWheelWord(mkIo(), sock, { word: 'CANE' });
    expect(updatePlayerScore).toHaveBeenCalledWith('GAME1', 'p1', 12, true);
    expect(broadcastToRoom).toHaveBeenCalledWith(expect.anything(), 'room:GAME1', 'wheelWordFound',
      { word: 'CANE', by: 'p1', firstFinder: false });
    // Crucially, there is NO "closed"/"stolen" broadcast — discovery is parallel.
    const events = (broadcastToRoom as unknown as Mock).mock.calls.map(c => c[2]);
    expect(events).not.toContain('wheelWordClosed');
    expect(events).not.toContain('wheelWordStolen');
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
    it('emits wheelRushInit with state snapshot (puzzle + foundWords + firstFinders)', () => {
      const richState = {
        ...gameBase,
        wheelRushState: {
          puzzle: { centerLetter: 'C', outerLetters: ['A','N','E'], allLetters: ['C','A','N','E'] },
          foundWords: { p1: ['CANE'], p2: ['ACE'] },
          firstFinders: { CANE: 'p1', ACE: 'p2' },
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
        firstFinders: { CANE: 'p1', ACE: 'p2' },
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
});
