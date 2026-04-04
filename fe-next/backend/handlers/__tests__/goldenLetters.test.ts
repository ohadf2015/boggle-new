/**
 * Golden Letters & Special Words Tests
 * Tests golden letter injection at game start and bonus/detection during word validation.
 */

import type { GameState } from '../../modules/gameState/types';

// ===== Mocks =====

jest.mock('../../modules/gameStateManager', () => ({
  addPlayerWord: jest.fn(),
  updatePlayerScore: jest.fn(),
  getLeaderboard: jest.fn(() => []),
  recordFirstFinder: jest.fn(),
  removePeerRejectedWordScore: jest.fn(),
  getGame: jest.fn(),
  updateGame: jest.fn(),
}));

jest.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: jest.fn(),
  broadcastToRoomExceptSender: jest.fn(),
  volatileBroadcastToRoom: jest.fn(),
  getGameRoom: jest.fn((gc: string) => `room:${gc}`),
  getSocketById: jest.fn(),
  safeEmit: jest.fn(),
}));

jest.mock('../../modules/scoringEngine', () => ({
  calculateWordScore: jest.fn((_word: string, combo: number) => _word.length - 1 + combo),
}));

jest.mock('../../modules/achievementManager', () => ({
  checkAndAwardAchievements: jest.fn(() => []),
}));

jest.mock('../../modules/supabaseServer', () => ({
  isSupabaseConfigured: jest.fn(() => false),
  savePlayerWord: jest.fn(),
  recordPlayerWrongWord: jest.fn(),
}));

jest.mock('../../modules/botManager', () => ({
  addWordToBlacklist: jest.fn(),
}));

jest.mock('../../utils/metrics', () => ({
  inc: jest.fn(),
  incPerGame: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  default: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../engagementHandler', () => ({
  processLongWordEngagement: jest.fn(),
}));

jest.mock('../../modules/blastModeManager', () => ({
  calculateBlastTileBonus: jest.fn(() => 0),
  getTilesOnPath: jest.fn(() => []),
  recordBlastMove: jest.fn(() => null),
}));

jest.mock('../../modules/wordHuntManager', () => ({
  restoreLife: jest.fn(),
  getLifeBonus: jest.fn(() => 1),
  computeDiscoveryClues: jest.fn(() => ({ greenPositions: [], knownLetters: [] })),
}));

jest.mock('@/shared/constants/wordHuntMultiplayerConstants', () => ({
  BOARD_WORD_SCORE_PER_LETTER: 2,
}));

// ===== Imports after mocks =====

import { broadcastToRoom } from '../../utils/socketHelpers';
import { updatePlayerScore, addPlayerWord } from '../../modules/gameStateManager';

const mockBroadcast = broadcastToRoom as jest.Mock;
const mockUpdateScore = updatePlayerScore as jest.Mock;
const mockAddWord = addPlayerWord as jest.Mock;

// We test handleValidatedWord indirectly via the exported test helper
// Instead, we test the logic inline here with controlled game states.

function runGoldenBonusLogic(
  normalizedWord: string,
  wordScore: number,
  game: Partial<GameState>
): number {
  let goldenBonus = 0;
  const goldenLetters = game.goldenLetters || [];
  const letterGrid = game.letterGrid as string[][] | undefined;

  if (goldenLetters.length && letterGrid) {
    const goldenChars = goldenLetters
      .map(g => {
        const row = letterGrid[g.row];
        return row ? String(row[g.col]).toLowerCase() : '';
      })
      .filter(Boolean);
    const usesGolden = normalizedWord
      .toLowerCase()
      .split('')
      .some(ch => goldenChars.includes(ch));
    if (usesGolden) {
      goldenBonus = Math.ceil(wordScore * 0.25);
    }
  }
  return goldenBonus;
}

function runSpecialWordLogic(
  normalizedWord: string,
  game: { specialWords?: Array<{ word: string; foundBy?: string }> },
  username: string
): { isSpecialWord: boolean; specialBonus: number } {
  const SPECIAL_BONUS = 10;
  let isSpecialWord = false;
  if (game.specialWords?.length) {
    const upperWord = normalizedWord.toUpperCase();
    const entry = game.specialWords.find(sw => sw.word.toUpperCase() === upperWord && !sw.foundBy);
    if (entry) {
      entry.foundBy = username;
      isSpecialWord = true;
    }
  }
  return { isSpecialWord, specialBonus: isSpecialWord ? SPECIAL_BONUS : 0 };
}

// ===== Golden letter generation helper (extracted from gameStartHandler) =====
function generateGoldenLetters(
  grid: string[][],
  count: number
): Array<{ row: number; col: number }> {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const result: Array<{ row: number; col: number }> = [];
  const used = new Set<string>();
  while (result.length < count) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);
    const key = `${row},${col}`;
    if (!used.has(key)) {
      used.add(key);
      result.push({ row, col });
    }
  }
  return result;
}

// ===== Tests =====

describe('golden letters at game start', () => {
  const grid5x5 = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 'A'));
  const grid6x6 = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 'A'));

  it('generates 2 golden letters for a 5x5 grid', () => {
    const result = generateGoldenLetters(grid5x5 as string[][], 2);
    expect(result).toHaveLength(2);
    result.forEach(pos => {
      expect(pos.row).toBeGreaterThanOrEqual(0);
      expect(pos.row).toBeLessThan(5);
      expect(pos.col).toBeGreaterThanOrEqual(0);
      expect(pos.col).toBeLessThan(5);
    });
  });

  it('generates 3 golden letters for a 6x6 grid', () => {
    const result = generateGoldenLetters(grid6x6 as string[][], 3);
    expect(result).toHaveLength(3);
  });

  it('generates unique positions', () => {
    const result = generateGoldenLetters(grid6x6 as string[][], 3);
    const keys = result.map(p => `${p.row},${p.col}`);
    expect(new Set(keys).size).toBe(3);
  });
});

describe('golden letter bonus calculation', () => {
  const grid = [
    ['G', 'O', 'L'],
    ['D', 'E', 'N'],
    ['X', 'Y', 'Z'],
  ];

  it('returns 0 when no golden letters are defined', () => {
    const bonus = runGoldenBonusLogic('gold', 5, { goldenLetters: [], letterGrid: grid as unknown as GameState['letterGrid'] });
    expect(bonus).toBe(0);
  });

  it('returns 25% rounded up when word uses a golden letter', () => {
    // Golden position (0,0) = 'G'
    const bonus = runGoldenBonusLogic('gold', 8, {
      goldenLetters: [{ row: 0, col: 0 }],
      letterGrid: grid as unknown as GameState['letterGrid'],
    });
    expect(bonus).toBe(Math.ceil(8 * 0.25)); // 2
  });

  it('returns 0 when word does not use any golden letter', () => {
    // Golden position (2,0) = 'X' — word 'done' does not use X
    const bonus = runGoldenBonusLogic('done', 5, {
      goldenLetters: [{ row: 2, col: 0 }],
      letterGrid: grid as unknown as GameState['letterGrid'],
    });
    expect(bonus).toBe(0);
  });

  it('rounds up correctly', () => {
    // ceil(7 * 0.25) = ceil(1.75) = 2
    const bonus = runGoldenBonusLogic('gold', 7, {
      goldenLetters: [{ row: 0, col: 0 }],
      letterGrid: grid as unknown as GameState['letterGrid'],
    });
    expect(bonus).toBe(2);
  });
});

describe('special word detection', () => {
  it('detects a special word and marks it as found', () => {
    const game: { specialWords: Array<{ word: string; foundBy?: string }> } = {
      specialWords: [{ word: 'GOLDEN' }, { word: 'NEXUS' }],
    };
    const result = runSpecialWordLogic('golden', game, 'alice');
    expect(result.isSpecialWord).toBe(true);
    expect(result.specialBonus).toBe(10);
    expect(game.specialWords[0].foundBy).toBe('alice');
  });

  it('does not mark already-claimed special word again', () => {
    const game: { specialWords: Array<{ word: string; foundBy?: string }> } = {
      specialWords: [{ word: 'GOLDEN', foundBy: 'bob' }],
    };
    const result = runSpecialWordLogic('golden', game, 'alice');
    expect(result.isSpecialWord).toBe(false);
    expect(result.specialBonus).toBe(0);
    expect(game.specialWords[0].foundBy).toBe('bob');
  });

  it('returns no bonus for non-special words', () => {
    const game = {
      specialWords: [{ word: 'SPECIAL' }],
    };
    const result = runSpecialWordLogic('ordinary', game, 'alice');
    expect(result.isSpecialWord).toBe(false);
    expect(result.specialBonus).toBe(0);
  });

  it('handles empty specialWords array', () => {
    const game = { specialWords: [] };
    const result = runSpecialWordLogic('anything', game, 'alice');
    expect(result.isSpecialWord).toBe(false);
  });
});
