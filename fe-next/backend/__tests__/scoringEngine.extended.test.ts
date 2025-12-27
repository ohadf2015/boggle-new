/**
 * Extended Scoring Engine Tests
 * Tests for fire round multipliers, duplicate word handling, and calculateGameScores
 */

import {
  calculateWordScore,
  calculateGameScores,
  getComboBonus,
  getComboMultiplier,
  type AiValidationResult
} from '../modules/scoringEngine';
import type { Game, GameUser, Avatar } from '@/shared/types/game';

// Helper to create a minimal valid GameUser for tests
function createTestUser(
  username: string,
  overrides: Partial<GameUser> = {}
): GameUser {
  return {
    username,
    socketId: `socket-${username}`,
    avatar: null as unknown as Avatar, // Tests don't need real avatar
    isHost: false,
    isBot: false,
    ...overrides,
  };
}

// Helper to create word details for tests
interface TestWordDetail {
  word: string;
  score: number;
  validated: boolean;
  isDuplicate?: boolean;
  comboBonus?: number;
  fireRoundMultiplier?: number;
  fireRoundBonus?: number;
  timestamp?: number;
  timeSinceStart?: number;
}

function createWordDetails(details: TestWordDetail[]): TestWordDetail[] {
  return details.map(d => ({
    isDuplicate: false, // Default to false
    ...d,
  }));
}

describe('Scoring Engine - Fire Round Multiplier', () => {

  describe('calculateWordScore with fire round', () => {

    test('fire round multiplier of 1 has no effect', () => {
      const normalScore = calculateWordScore('hello', 0, 1);
      expect(normalScore).toBe(4); // 5 - 1 = 4
    });

    test('fire round multiplier of 2 doubles the score', () => {
      const fireScore = calculateWordScore('hello', 0, 2);
      expect(fireScore).toBe(8); // (5 - 1) * 2 = 8
    });

    test('fire round multiplier applies to base score plus combo bonus', () => {
      // baseScore(5) = 4, comboBonus(5, 5) = floor(5 * 1.0) = 5
      // total = (4 + 5) * 2 = 18
      const fireComboScore = calculateWordScore('hello', 5, 2);
      expect(fireComboScore).toBe(18);
    });

    test('fire round multiplier with long word and high combo', () => {
      // baseScore(8) = 7, comboBonus(10, 8) = floor(10 * 2.0) = 20
      // total = (7 + 20) * 2 = 54
      const epicScore = calculateWordScore('learning', 10, 2);
      expect(epicScore).toBe(54);
    });

    test('fire round multiplier with short word', () => {
      // baseScore(3) = 2, no combo
      // total = 2 * 2 = 4
      const fireShort = calculateWordScore('cat', 0, 2);
      expect(fireShort).toBe(4);
    });

    test('fire round multiplier of 3 triples the score', () => {
      // If there's ever a 3x fire round
      const tripleScore = calculateWordScore('test', 0, 3);
      expect(tripleScore).toBe(9); // (4 - 1) * 3 = 9
    });

    test('single letter still returns 0 with fire round', () => {
      expect(calculateWordScore('a', 0, 2)).toBe(0);
    });
  });

  describe('fire round combo interactions', () => {

    test('combo bonus scales before fire round multiplier', () => {
      // Without fire round: baseScore(6) = 5, comboBonus(3, 6) = floor(3 * 1.5) = 4
      // Score = 5 + 4 = 9
      const normalCombo = calculateWordScore('gaming', 3, 1);
      expect(normalCombo).toBe(9);

      // With fire round: (5 + 4) * 2 = 18
      const fireCombo = calculateWordScore('gaming', 3, 2);
      expect(fireCombo).toBe(18);
    });

    test('high combo perfectionist bonus with fire round', () => {
      // 7-letter word "working": baseScore = 6
      // comboBonus(8, 7) = floor(8 * 2.0) = 16
      // Normal: 6 + 16 = 22
      // Fire: (6 + 16) * 2 = 44
      expect(calculateWordScore('working', 8, 1)).toBe(22);
      expect(calculateWordScore('working', 8, 2)).toBe(44);
    });
  });
});

describe('Scoring Engine - calculateGameScores', () => {

  // Use unknown to avoid strict type checking on test mocks
  // The calculateGameScores function handles partial data gracefully
  function createMockGame(overrides: Record<string, unknown> = {}): Game {
    return {
      gameCode: 'TEST1',
      hostSocketId: 'host-socket',
      hostUsername: 'TestHost',
      hostPlayerId: 'host-player-id',
      roomName: 'Test Room',
      language: 'en',
      gameState: 'finished',
      users: {},
      playerScores: {},
      playerWords: {},
      playerWordDetails: {},
      playerAchievements: {},
      lastActivity: Date.now(),
      createdAt: Date.now(),
      isRanked: false,
      allowLateJoin: true,
      ...overrides
    } as Game;
  }

  describe('basic score calculation', () => {

    test('returns empty array for null game', () => {
      const result = calculateGameScores(null);
      expect(result).toEqual([]);
    });

    test('returns empty array for game with no players', () => {
      const game = createMockGame();
      const result = calculateGameScores(game);
      expect(result).toEqual([]);
    });

    test('calculates score for single player with dictionary words', () => {
      const game = createMockGame({
        users: {
          'Player1': createTestUser('Player1')
        },
        playerWords: {
          'Player1': ['cat', 'dog', 'hello']
        },
        playerWordDetails: {
          'Player1': [
            { word: 'cat', score: 2, validated: true },
            { word: 'dog', score: 2, validated: true },
            { word: 'hello', score: 4, validated: true }
          ]
        }
      });

      const dictionaryWords = new Set(['cat', 'dog', 'hello']);
      const result = calculateGameScores(game, {}, dictionaryWords);

      expect(result.length).toBe(1);
      expect(result[0].username).toBe('Player1');
      expect(result[0].totalScore).toBe(8); // 2 + 2 + 4
      expect(result[0].wordCount).toBe(3);
    });

    test('sorts players by score descending', () => {
      const game = createMockGame({
        users: {
          'LowScorer': createTestUser('LowScorer'),
          'HighScorer': createTestUser('HighScorer'),
          'MidScorer': createTestUser('MidScorer')
        },
        playerWords: {
          'LowScorer': ['at'],
          'HighScorer': ['testing', 'hello'],
          'MidScorer': ['word']
        },
        playerWordDetails: {
          'LowScorer': [{ word: 'at', score: 1, validated: true }],
          'HighScorer': [
            { word: 'testing', score: 6, validated: true },
            { word: 'hello', score: 4, validated: true }
          ],
          'MidScorer': [{ word: 'word', score: 3, validated: true }]
        }
      });

      const dictionaryWords = new Set(['at', 'testing', 'hello', 'word']);
      const result = calculateGameScores(game, {}, dictionaryWords);

      expect(result[0].username).toBe('HighScorer');
      expect(result[0].totalScore).toBe(10);
      expect(result[1].username).toBe('MidScorer');
      expect(result[1].totalScore).toBe(3);
      expect(result[2].username).toBe('LowScorer');
      expect(result[2].totalScore).toBe(1);
    });
  });

  describe('validation source tracking', () => {

    test('marks dictionary validated words correctly', () => {
      const game = createMockGame({
        users: { 'Player': createTestUser('Player') },
        playerWords: { 'Player': ['hello'] },
        playerWordDetails: { 'Player': [{ word: 'hello', score: 4, validated: true }] }
      });

      const dictionaryWords = new Set(['hello']);
      const result = calculateGameScores(game, {}, dictionaryWords);

      expect(result[0].wordDetails[0].validationSource).toBe('dictionary');
      expect(result[0].wordDetails[0].inDictionary).toBe(true);
    });

    test('marks community validated words correctly', () => {
      const game = createMockGame({
        users: { 'Player': createTestUser('Player') },
        playerWords: { 'Player': ['slang'] },
        playerWordDetails: { 'Player': [{ word: 'slang', score: 4, validated: true }] }
      });

      const communityWords = new Set(['slang']);
      const result = calculateGameScores(game, {}, new Set(), communityWords);

      expect(result[0].wordDetails[0].validationSource).toBe('community');
      expect(result[0].wordDetails[0].validated).toBe(true);
    });

    test('marks AI validated words correctly', () => {
      const game = createMockGame({
        users: { 'Player': createTestUser('Player') },
        playerWords: { 'Player': ['neologism'] },
        playerWordDetails: { 'Player': [{ word: 'neologism', score: 8, validated: true }] }
      });

      const aiValidated = new Map<string, AiValidationResult>([
        ['neologism', { isValid: true, isAiVerified: true, reason: 'Valid English word' }]
      ]);

      const result = calculateGameScores(game, {}, new Set(), new Set(), aiValidated);

      expect(result[0].wordDetails[0].validationSource).toBe('ai');
      expect(result[0].wordDetails[0].isAiVerified).toBe(true);
      expect(result[0].wordDetails[0].aiReason).toBe('Valid English word');
    });

    test('invalid AI words are not scored', () => {
      const game = createMockGame({
        users: { 'Player': createTestUser('Player') },
        playerWords: { 'Player': ['xyzabc'] },
        playerWordDetails: { 'Player': [{ word: 'xyzabc', score: 0, validated: false }] }
      });

      const aiValidated = new Map<string, AiValidationResult>([
        ['xyzabc', { isValid: false, isAiVerified: true, reason: 'Not a valid word' }]
      ]);

      const result = calculateGameScores(game, {}, new Set(), new Set(), aiValidated);

      expect(result[0].wordDetails[0].validated).toBe(false);
      expect(result[0].totalScore).toBe(0);
    });

    test('cached AI validation is tracked', () => {
      const game = createMockGame({
        users: { 'Player': createTestUser('Player') },
        playerWords: { 'Player': ['cached'] },
        playerWordDetails: { 'Player': [{ word: 'cached', score: 5, validated: true }] }
      });

      const aiValidated = new Map<string, AiValidationResult>([
        ['cached', { isValid: true, isAiVerified: false, source: 'cached' }]
      ]);

      const result = calculateGameScores(game, {}, new Set(), new Set(), aiValidated);

      expect(result[0].wordDetails[0].validationSource).toBe('cached');
    });
  });

  describe('duplicate word handling', () => {

    test('words found by multiple players are marked as duplicates', () => {
      const game = createMockGame({
        users: {
          'Player1': createTestUser('Player1'),
          'Player2': createTestUser('Player2')
        },
        playerWords: {
          'Player1': ['hello'],
          'Player2': ['hello']
        },
        playerWordDetails: {
          'Player1': [{ word: 'hello', score: 4, validated: true }],
          'Player2': [{ word: 'hello', score: 4, validated: true }]
        }
      });

      const wordCountMap = { 'hello': 2 };
      const dictionaryWords = new Set(['hello']);
      const result = calculateGameScores(game, wordCountMap, dictionaryWords);

      expect(result[0].wordDetails[0].isUnique).toBe(false);
      expect(result[0].wordDetails[0].isDuplicate).toBe(true);
      expect(result[1].wordDetails[0].isUnique).toBe(false);
    });

    test('unique words are not marked as duplicates', () => {
      const game = createMockGame({
        users: {
          'Player1': createTestUser('Player1'),
          'Player2': createTestUser('Player2')
        },
        playerWords: {
          'Player1': ['hello'],
          'Player2': ['world']
        },
        playerWordDetails: {
          'Player1': [{ word: 'hello', score: 4, validated: true }],
          'Player2': [{ word: 'world', score: 4, validated: true }]
        }
      });

      const wordCountMap = { 'hello': 1, 'world': 1 };
      const dictionaryWords = new Set(['hello', 'world']);
      const result = calculateGameScores(game, wordCountMap, dictionaryWords);

      expect(result[0].wordDetails[0].isUnique).toBe(true);
      expect(result[0].wordDetails[0].isDuplicate).toBe(false);
    });

    test('duplicate rule is disabled for large rooms (>7 players)', () => {
      const game = createMockGame({
        users: {
          'Player1': createTestUser('Player1'),
          'Player2': createTestUser('Player2')
        },
        playerWords: {
          'Player1': ['hello'],
          'Player2': ['hello']
        },
        playerWordDetails: {
          'Player1': [{ word: 'hello', score: 4, validated: true }],
          'Player2': [{ word: 'hello', score: 4, validated: true }]
        }
      });

      const wordCountMap = { 'hello': 2 };
      const dictionaryWords = new Set(['hello']);

      // With 8 players, duplicate rule should be disabled
      const result = calculateGameScores(game, wordCountMap, dictionaryWords, new Set(), new Map(), { playerCount: 8 });

      // All words should be treated as unique
      expect(result[0].wordDetails[0].isUnique).toBe(true);
      expect(result[0].wordDetails[0].isDuplicate).toBe(false);
    });

    test('duplicate rule active for 7 or fewer players', () => {
      const game = createMockGame({
        users: {
          'Player1': createTestUser('Player1'),
          'Player2': createTestUser('Player2')
        },
        playerWords: {
          'Player1': ['hello'],
          'Player2': ['hello']
        },
        playerWordDetails: {
          'Player1': [{ word: 'hello', score: 4, validated: true }],
          'Player2': [{ word: 'hello', score: 4, validated: true }]
        }
      });

      const wordCountMap = { 'hello': 2 };
      const dictionaryWords = new Set(['hello']);

      // With 7 players, duplicate rule should be active
      const result = calculateGameScores(game, wordCountMap, dictionaryWords, new Set(), new Map(), { playerCount: 7 });

      expect(result[0].wordDetails[0].isUnique).toBe(false);
      expect(result[0].wordDetails[0].isDuplicate).toBe(true);
    });
  });

  describe('word details preservation', () => {

    test('preserves pre-calculated scores from wordDetails', () => {
      const game = createMockGame({
        users: { 'Player': createTestUser('Player') },
        playerWords: { 'Player': ['hello'] },
        playerWordDetails: {
          'Player': [{
            word: 'hello',
            score: 15, // Pre-calculated with combo
            validated: true,
            comboBonus: 5
          }]
        }
      });

      const dictionaryWords = new Set(['hello']);
      const result = calculateGameScores(game, {}, dictionaryWords);

      expect(result[0].wordDetails[0].score).toBe(15);
      expect(result[0].wordDetails[0].comboBonus).toBe(5);
    });

    test('preserves fire round data', () => {
      const game = createMockGame({
        users: { 'Player': createTestUser('Player') },
        playerWords: { 'Player': ['blaze'] },
        playerWordDetails: {
          'Player': [{
            word: 'blaze',
            score: 8,
            validated: true,
            fireRoundMultiplier: 2,
            fireRoundBonus: 4
          }]
        }
      });

      const dictionaryWords = new Set(['blaze']);
      const result = calculateGameScores(game, {}, dictionaryWords);

      expect(result[0].wordDetails[0].fireRoundMultiplier).toBe(2);
      expect(result[0].wordDetails[0].fireRoundBonus).toBe(4);
    });

    test('preserves timestamp for pace analysis', () => {
      const timestamp = Date.now();
      const game = createMockGame({
        users: { 'Player': createTestUser('Player') },
        playerWords: { 'Player': ['quick'] },
        playerWordDetails: {
          'Player': [{
            word: 'quick',
            score: 4,
            validated: true,
            timestamp: timestamp,
            timeSinceStart: 5000
          }]
        }
      });

      const dictionaryWords = new Set(['quick']);
      const result = calculateGameScores(game, {}, dictionaryWords);

      expect(result[0].wordDetails[0].timestamp).toBe(timestamp);
      expect(result[0].wordDetails[0].timeSinceStart).toBe(5000);
    });
  });

  describe('player metadata', () => {

    test('includes player avatar', () => {
      const customAvatar = { emoji: '🎮', color: '#FF0000', avatarImage: 'avatar1' } as Avatar;
      const game = createMockGame({
        users: {
          'Player': createTestUser('Player', { avatar: customAvatar })
        },
        playerWords: { 'Player': ['test'] },
        playerWordDetails: { 'Player': [{ word: 'test', score: 3, validated: true }] }
      });

      const dictionaryWords = new Set(['test']);
      const result = calculateGameScores(game, {}, dictionaryWords);

      expect(result[0].avatar).toEqual({ emoji: '🎮', color: '#FF0000', avatarImage: 'avatar1' });
    });

    test('identifies bot players', () => {
      const game = createMockGame({
        users: {
          'HumanPlayer': createTestUser('HumanPlayer'),
          'BotPlayer': createTestUser('BotPlayer', { isBot: true })
        },
        playerWords: {
          'HumanPlayer': ['human'],
          'BotPlayer': ['robot']
        },
        playerWordDetails: {
          'HumanPlayer': [{ word: 'human', score: 4, validated: true }],
          'BotPlayer': [{ word: 'robot', score: 4, validated: true }]
        }
      });

      const dictionaryWords = new Set(['human', 'robot']);
      const result = calculateGameScores(game, {}, dictionaryWords);

      const human = result.find(r => r.username === 'HumanPlayer');
      const bot = result.find(r => r.username === 'BotPlayer');

      expect(human?.isBot).toBe(false);
      expect(bot?.isBot).toBe(true);
    });

    test('includes player achievements', () => {
      const game = createMockGame({
        users: { 'Player': createTestUser('Player') },
        playerWords: { 'Player': ['achievement'] },
        playerWordDetails: { 'Player': [{ word: 'achievement', score: 10, validated: true }] },
        playerAchievements: { 'Player': ['first_word', 'long_word_master'] }
      });

      const dictionaryWords = new Set(['achievement']);
      const result = calculateGameScores(game, {}, dictionaryWords);

      expect(result[0].achievements).toEqual(['first_word', 'long_word_master']);
    });
  });

  describe('edge cases', () => {

    test('handles duplicate word entries in player list', () => {
      const game = createMockGame({
        users: { 'Player': createTestUser('Player') },
        playerWords: { 'Player': ['hello', 'hello', 'hello'] },
        playerWordDetails: { 'Player': [{ word: 'hello', score: 4, validated: true }] }
      });

      const dictionaryWords = new Set(['hello']);
      const result = calculateGameScores(game, {}, dictionaryWords);

      // Should dedupe and only count once
      expect(result[0].wordCount).toBe(1);
      expect(result[0].totalScore).toBe(4);
    });

    test('handles unvalidated words', () => {
      const game = createMockGame({
        users: { 'Player': createTestUser('Player') },
        playerWords: { 'Player': ['valid', 'invalid'] },
        playerWordDetails: {
          'Player': [
            { word: 'valid', score: 4, validated: true },
            { word: 'invalid', score: 0, validated: false }
          ]
        }
      });

      const dictionaryWords = new Set(['valid']);
      const result = calculateGameScores(game, {}, dictionaryWords);

      expect(result[0].totalScore).toBe(4); // Only valid word scores
      expect(result[0].wordCount).toBe(2); // Both counted for word count
    });

    test('handles missing user data gracefully', () => {
      const game = createMockGame({
        users: {},
        playerWords: { 'GhostPlayer': ['word'] },
        playerWordDetails: { 'GhostPlayer': [{ word: 'word', score: 3, validated: true }] }
      });

      const dictionaryWords = new Set(['word']);
      const result = calculateGameScores(game, {}, dictionaryWords);

      expect(result[0].avatar).toBeNull();
      expect(result[0].isBot).toBe(false);
    });
  });
});

describe('Scoring Strategy Scenarios', () => {

  describe('speed vs perfectionist playstyle comparison', () => {

    test('speed player: many short words vs perfectionist: fewer long words with combos', () => {
      // Speed player: 10 x 3-letter words, no combos
      let speedScore = 0;
      for (let i = 0; i < 10; i++) {
        speedScore += calculateWordScore('cat', 0, 1);
      }
      expect(speedScore).toBe(20); // 10 * 2 = 20

      // Perfectionist: 5 x 6-letter words with building combo
      let perfectionistScore = 0;
      for (let combo = 0; combo < 5; combo++) {
        perfectionistScore += calculateWordScore('gaming', combo, 1);
      }
      // combo 0: 5, combo 1: 5+1=6, combo 2: 5+3=8, combo 3: 5+4=9, combo 4: 5+6=11
      expect(perfectionistScore).toBe(39);

      // Perfectionist strategy wins
      expect(perfectionistScore).toBeGreaterThan(speedScore);
    });

    test('fire round amplifies perfectionist advantage', () => {
      // Speed player during fire round
      let speedFire = 0;
      for (let i = 0; i < 10; i++) {
        speedFire += calculateWordScore('cat', 0, 2);
      }
      expect(speedFire).toBe(40); // 10 * 4 = 40

      // Perfectionist during fire round
      let perfectionistFire = 0;
      for (let combo = 0; combo < 5; combo++) {
        perfectionistFire += calculateWordScore('gaming', combo, 2);
      }
      // Fire round doubles everything
      expect(perfectionistFire).toBe(78);

      expect(perfectionistFire).toBeGreaterThan(speedFire);
    });
  });
});
