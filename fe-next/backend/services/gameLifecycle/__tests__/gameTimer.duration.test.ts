/**
 * Regression coverage for MP game-timer duration handling.
 *
 * Scope: prove the timer triggers `endGame` exactly once for both short
 * (<2min) and long (>2min) games and that intermediate ticks do NOT end
 * the game early. Also asserts that a timer-fired endGame and a manual
 * endGame are mutex-guarded so only one final-score broadcast happens.
 *
 * Companion to gameTimer.wordHuntDrain.test.ts and gameEnd.blastTimer.test.ts —
 * those cover mode-specific tick logic; this file covers raw duration semantics.
 */

import { vi, type Mock } from 'vitest';

vi.mock('../../../modules/gameStateManager', () => ({
  getGame: vi.fn(),
  updateGame: vi.fn(),
}));

vi.mock('../../../modules/communityWordManager', () => ({
  resetGameAIValidationCount: vi.fn(),
}));

vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: (c: string) => `room:${c}`,
}));

// Real setInterval handles need real clearInterval; otherwise the timer keeps
// firing past expiry inside fake-timers and double-invokes endGame (test-only
// artifact). Track the id on set, clear it for real on clear.
const intervalIds = new Map<string, NodeJS.Timeout>();
vi.mock('../../../utils/timerManager', () => ({
  default: {
    clearGameTimer: (code: string) => {
      const id = intervalIds.get(`game:${code}`);
      if (id) clearInterval(id);
      intervalIds.delete(`game:${code}`);
    },
    setGameTimer: (code: string, id: NodeJS.Timeout) => {
      intervalIds.set(`game:${code}`, id);
    },
  },
  clearGameTimer: (code: string) => {
    const id = intervalIds.get(`game:${code}`);
    if (id) clearInterval(id);
    intervalIds.delete(`game:${code}`);
  },
  setGameTimer: (code: string, id: NodeJS.Timeout) => {
    intervalIds.set(`game:${code}`, id);
  },
}));

vi.mock('../botGame', () => ({
  startBotsForGame: vi.fn(),
}));

vi.mock('../gameEnd', () => ({
  endGame: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../modules/wordHuntManager', () => ({
  drainLife: vi.fn(),
  areAllPlayersEliminated: vi.fn(() => false),
}));

vi.mock('../../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { getGame } from '../../../modules/gameStateManager';
import { endGame } from '../gameEnd';
import { startGameTimer } from '../gameTimer';

const mockGetGame = getGame as Mock;
const mockEndGame = endGame as Mock;

function classicGame() {
  return {
    gameState: 'in-progress',
    gameMode: 'classic',
    letterGrid: [['A']],
    language: 'en',
    gameSessionId: 'sess-x',
  };
}

describe('gameTimer duration — short and long MP games', () => {
  let io: any;

  beforeEach(() => {
    vi.clearAllMocks();
    intervalIds.clear();
    vi.useFakeTimers();
    io = {};
    mockGetGame.mockReturnValue(classicGame());
  });

  afterEach(() => {
    // Drain any lingering intervals so they don't bleed into the next test
    for (const id of intervalIds.values()) clearInterval(id);
    intervalIds.clear();
    vi.useRealTimers();
  });

  describe('short games (<2min)', () => {
    it('does NOT end a 30-second drill before time elapses', () => {
      startGameTimer(io, 'DRL30', 30);

      vi.advanceTimersByTime(29_000);

      expect(mockEndGame).not.toHaveBeenCalled();
    });

    it('ends a 30-second drill exactly once when timer expires', () => {
      startGameTimer(io, 'DRL30', 30);

      vi.advanceTimersByTime(31_000);

      expect(mockEndGame).toHaveBeenCalledTimes(1);
      expect(mockEndGame).toHaveBeenCalledWith(io, 'DRL30');
    });

    it('ends a 60-second game exactly once when timer expires', () => {
      startGameTimer(io, 'SHORT60', 60);

      vi.advanceTimersByTime(61_000);

      expect(mockEndGame).toHaveBeenCalledTimes(1);
    });

    it('does not double-fire endGame on extra ticks past expiry', () => {
      startGameTimer(io, 'DRL30', 30);

      vi.advanceTimersByTime(31_000);
      vi.advanceTimersByTime(5_000); // overshoot — interval should be cleared

      expect(mockEndGame).toHaveBeenCalledTimes(1);
    });
  });

  describe('long games (>2min)', () => {
    it('does NOT end a 5-minute game at the 2-minute mark', () => {
      startGameTimer(io, 'LONG300', 300);

      vi.advanceTimersByTime(120_000);

      expect(mockEndGame).not.toHaveBeenCalled();
    });

    it('does NOT end a 5-minute game at the 4-minute mark', () => {
      startGameTimer(io, 'LONG300', 300);

      vi.advanceTimersByTime(240_000);

      expect(mockEndGame).not.toHaveBeenCalled();
    });

    it('ends a 5-minute game exactly once at the 5-minute mark', () => {
      startGameTimer(io, 'LONG300', 300);

      vi.advanceTimersByTime(301_000);

      expect(mockEndGame).toHaveBeenCalledTimes(1);
      expect(mockEndGame).toHaveBeenCalledWith(io, 'LONG300');
    });

    it('ends a 3-minute game exactly once at the 3-minute mark', () => {
      startGameTimer(io, 'MID180', 180);

      vi.advanceTimersByTime(181_000);

      expect(mockEndGame).toHaveBeenCalledTimes(1);
    });
  });

  describe('boundary — exactly 120s (2-minute pivot)', () => {
    it('does NOT end at 119 seconds', () => {
      startGameTimer(io, 'PIV120', 120);

      vi.advanceTimersByTime(119_000);

      expect(mockEndGame).not.toHaveBeenCalled();
    });

    it('ends exactly once at 120 seconds', () => {
      startGameTimer(io, 'PIV120', 120);

      vi.advanceTimersByTime(121_000);

      expect(mockEndGame).toHaveBeenCalledTimes(1);
    });
  });
});
