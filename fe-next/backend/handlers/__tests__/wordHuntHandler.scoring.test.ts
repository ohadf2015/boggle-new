/**
 * Word Hunt Handler - First Finder Bonus Scoring Test
 * Verifies that the first-finder bonus is applied to player score.
 */

vi.mock('../../../backend/modules/gameStateManager', () => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(),
  getUsernameBySocketId: vi.fn(),
  updatePlayerScore: vi.fn(),
  addPlayerEventBonus: vi.fn(),
}));

vi.mock('../../../backend/modules/wordHuntManager', () => ({
  validateTargetGuess: vi.fn(),
  recordTargetFound: vi.fn(),
  penalizeWrongGuess: vi.fn(),
}));

vi.mock('../../../backend/utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: vi.fn().mockImplementation((code: string) => `game:${code}`),
}));

vi.mock('../../../backend/services/gameLifecycle/gameEnd', () => ({
  endGame: vi.fn(),
}));

vi.mock('../../../backend/utils/rateLimiter', () => ({ checkRateLimit: vi.fn().mockReturnValue(true), default: {
  checkRateLimit: vi.fn().mockReturnValue(true),
} }));

import { vi, type Mock, type MockInstance } from 'vitest';
import { getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  updatePlayerScore,
  addPlayerEventBonus, } from '../../../backend/modules/gameStateManager';
import { validateTargetGuess,
  recordTargetFound, } from '../../../backend/modules/wordHuntManager';
import { handleSubmitTargetWord } from '../wordHuntHandler';

function makeHuntGame() {
  return {
    gameCode: 'HUNT1',
    gameState: 'in-progress',
    gameMode: 'word-hunt',
    wordHuntState: {
      targetWord: 'apple',
      targetWordLength: 5,
      playerLives: { player1: 80 },
      eliminatedPlayers: [],
      targetFoundBy: null,
      isFirstFinderClaimed: false,
    },
  };
}

function makeMockSocket() {
  return {
    id: 'socket-p1',
    emit: vi.fn(),
  };
}

describe('wordHuntHandler - first finder bonus scoring', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    getGameBySocketId.mockReturnValue('HUNT1');
    getUsernameBySocketId.mockReturnValue('player1');
    getGame.mockReturnValue(makeHuntGame());
  });

  it('should apply first-finder bonus to player score via updatePlayerScore', () => {
    // GIVEN: Player guesses the target word correctly and is first finder
    validateTargetGuess.mockReturnValue(['correct', 'correct', 'correct', 'correct', 'correct']);
    recordTargetFound.mockReturnValue({ isFirstFinder: true, bonus: 500 });

    const socket = makeMockSocket();
    const io = { on: vi.fn() } as any;

    // WHEN: Player submits the correct target word
    handleSubmitTargetWord(io, socket as any, { guess: 'apple' });

    // THEN: updatePlayerScore should be called with the 500-point bonus
    expect(updatePlayerScore).toHaveBeenCalledWith('HUNT1', 'player1', 500, true);
  });

  it('mirrors the finder bonus into the event accumulator so the result page keeps it', () => {
    // The target-finder bonus is added only to the live score (updatePlayerScore) and
    // is never stored in per-word details, so the end-of-game word recompute drops it.
    // It must also land in the event-bonus accumulator to survive into the results.
    validateTargetGuess.mockReturnValue(['correct', 'correct', 'correct', 'correct', 'correct']);
    recordTargetFound.mockReturnValue({ isFirstFinder: true, bonus: 500 });

    const socket = makeMockSocket();
    const io = { on: vi.fn() } as any;

    handleSubmitTargetWord(io, socket as any, { guess: 'apple' });

    expect(addPlayerEventBonus).toHaveBeenCalledWith('HUNT1', 'player1', 500);
  });

  it('does not touch the accumulator when the finder bonus is 0', () => {
    validateTargetGuess.mockReturnValue(['correct', 'correct', 'correct', 'correct', 'correct']);
    recordTargetFound.mockReturnValue({ isFirstFinder: false, bonus: 0 });

    const socket = makeMockSocket();
    const io = { on: vi.fn() } as any;

    handleSubmitTargetWord(io, socket as any, { guess: 'apple' });

    expect(addPlayerEventBonus).not.toHaveBeenCalled();
  });

  it('should NOT call updatePlayerScore when bonus is 0 (not first finder)', () => {
    // GIVEN: Player guesses correctly but is NOT the first finder
    validateTargetGuess.mockReturnValue(['correct', 'correct', 'correct', 'correct', 'correct']);
    recordTargetFound.mockReturnValue({ isFirstFinder: false, bonus: 0 });

    const socket = makeMockSocket();
    const io = { on: vi.fn() } as any;

    // WHEN: Player submits the correct target word
    handleSubmitTargetWord(io, socket as any, { guess: 'apple' });

    // THEN: updatePlayerScore should NOT be called (no bonus)
    expect(updatePlayerScore).not.toHaveBeenCalled();
  });
});
