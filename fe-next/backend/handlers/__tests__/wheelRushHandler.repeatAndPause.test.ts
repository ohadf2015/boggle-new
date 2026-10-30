
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
  addPlayerEventBonus: vi.fn(),
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
import { getGame, updatePlayerScore, addPlayerWord, addPlayerEventBonus } from '../../modules/gameStateManager';
import { validateWheelSubmission, applyWheelWord } from '../../modules/wheelRushManager';

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

describe('wheelRushHandler: repeat credit and teacher pause', () => {
  beforeEach(() => vi.clearAllMocks());

  it('credits a repeat claim through the event-bonus accumulator so results match the live score', () => {
    (getGame as unknown as Mock).mockReturnValue(gameBase);
    (validateWheelSubmission as unknown as Mock).mockReturnValue({ valid: true });
    (applyWheelWord as unknown as Mock).mockReturnValue({ score: 4, firstFinder: false, firstFinderBonus: 0, repeat: true });

    handleSubmitWheelWord(mkIo(), mkSocket(), { word: 'CANE' });

    expect(updatePlayerScore).toHaveBeenCalledWith('GAME1', 'p1', 4, true);
    expect(addPlayerEventBonus).toHaveBeenCalledWith('GAME1', 'p1', 4);
    expect(addPlayerWord).not.toHaveBeenCalled();
  });

  it('records a first claim as a word, not an event bonus', () => {
    (getGame as unknown as Mock).mockReturnValue(gameBase);
    (validateWheelSubmission as unknown as Mock).mockReturnValue({ valid: true });
    (applyWheelWord as unknown as Mock).mockReturnValue({ score: 12, firstFinder: true, firstFinderBonus: 5, repeat: false });

    handleSubmitWheelWord(mkIo(), mkSocket(), { word: 'CANE' });

    expect(addPlayerWord).toHaveBeenCalledWith('GAME1', 'p1', 'CANE', expect.objectContaining({ score: 12 }));
    expect(addPlayerEventBonus).not.toHaveBeenCalled();
  });

  it('bounces a submit while the teacher has paused the round', () => {
    (getGame as unknown as Mock).mockReturnValue({ ...gameBase, isPaused: true });
    const sock = mkSocket();

    handleSubmitWheelWord(mkIo(), sock, { word: 'CANE' });

    expect(sock.emit).toHaveBeenCalledWith('wheelWordResult', { word: 'CANE', accepted: false, error: 'paused' });
    expect(applyWheelWord).not.toHaveBeenCalled();
    expect(updatePlayerScore).not.toHaveBeenCalled();
  });
});
