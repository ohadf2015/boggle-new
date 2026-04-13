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
  getGameRoom: vi.fn((code: string) => `room:${code}`),
}));

vi.mock('../../utils/timerManager', () => ({
  __esModule: true,
  default: { setTimeout: vi.fn(), clearTimer: vi.fn() },
}));

vi.mock('../../events/gameCleanup', () => ({
  gameCleanupEmitter: { onGameEnd: vi.fn(), onGameReset: vi.fn() },
}));

vi.mock('../../modules/gameStateManager', () => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(() => 'GAME1'),
  getUsernameBySocketId: vi.fn(() => 'p1'),
  updatePlayerScore: vi.fn(),
}));

vi.mock('../../modules/wheelRushManager', () => ({
  validateWheelSubmission: vi.fn(),
  applyWheelWord: vi.fn(),
  reapExpiredLocks: vi.fn(() => []),
}));

import { handleSubmitWheelWord } from '../wheelRushHandler';
import { broadcastToRoom } from '../../utils/socketHelpers';
import { getGame, updatePlayerScore } from '../../modules/gameStateManager';
import { validateWheelSubmission, applyWheelWord } from '../../modules/wheelRushManager';

const mkSocket = () => ({ id: 's1', emit: vi.fn() } as unknown as Socket);
const mkIo = () => ({} as Server);

const gameBase = {
  gameState: 'in-progress',
  gameMode: 'wheel-rush',
  language: 'en',
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
  });

  it('rejects when game is not wheel-rush mode', () => {
    (getGame as unknown as Mock).mockReturnValue({ ...gameBase, gameMode: 'classic' });
    const sock = mkSocket();
    handleSubmitWheelWord(mkIo(), sock, { word: 'CANE' });
    expect(sock.emit).toHaveBeenCalledWith('error', { message: 'Not a wheel-rush game' });
    expect(validateWheelSubmission).not.toHaveBeenCalled();
  });
});
