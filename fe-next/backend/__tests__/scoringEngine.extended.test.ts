import { calculateWordScore, calculateGameScores, getComboBonus, getComboMultiplier, type AiValidationResult } from '../modules/scoringEngine';
import type { Game, GameUser, Avatar } from '@/shared/types/game';

function createTestUser(username: string, overrides: Partial<GameUser> = {}): GameUser {
  return { username, socketId: `socket-${username}`, avatar: null as unknown as Avatar, isHost: false, isBot: false, ...overrides };
}

function createMockGame(overrides: Record<string, unknown> = {}): Game {
  return { gameCode: 'TEST1', hostSocketId: 'host-socket', hostUsername: 'TestHost', hostPlayerId: 'host-player-id', roomName: 'Test Room', language: 'en', gameState: 'finished', users: {}, playerScores: {}, playerWords: {}, playerWordDetails: {}, playerAchievements: {}, lastActivity: Date.now(), createdAt: Date.now(), isRanked: false, allowLateJoin: true, ...overrides } as Game;
}

describe('Scoring Engine - Fire Round Multiplier', () => {
  describe('calculateWordScore with fire round', () => {
    test('fire round multiplier of 1 has no effect', () => { expect(calculateWordScore('hello', 0, 1)).toBe(50); });
    test('fire round multiplier of 2 doubles', () => { expect(calculateWordScore('hello', 0, 2)).toBe(100); });
    test('applies to base + combo', () => { expect(calculateWordScore('hello', 5, 2)).toBe(110); });
    test('long word + high combo', () => { expect(calculateWordScore('learning', 10, 2)).toBe(1040); });
    test('short word', () => { expect(calculateWordScore('cat', 0, 2)).toBe(20); });
    test('3x fire', () => { expect(calculateWordScore('test', 0, 3)).toBe(60); });
    test('single letter still 0', () => { expect(calculateWordScore('a', 0, 2)).toBe(0); });
  });

  describe('fire round combo interactions', () => {
    test('combo scales before fire', () => {
      expect(calculateWordScore('gaming', 3, 1)).toBe(104);
      expect(calculateWordScore('gaming', 3, 2)).toBe(208);
    });
    test('high combo perfectionist with fire', () => {
      expect(calculateWordScore('working', 8, 1)).toBe(216);
      expect(calculateWordScore('working', 8, 2)).toBe(432);
    });
  });
});

describe('Scoring Engine - calculateGameScores', () => {
  test('returns empty for null game', () => { expect(calculateGameScores(null)).toEqual([]); });
  test('returns empty for no players', () => { expect(calculateGameScores(createMockGame())).toEqual([]); });

  test('calculates score for single player', () => {
    const game = createMockGame({
      users: { 'Player1': createTestUser('Player1') },
      playerWords: { 'Player1': ['cat', 'dog', 'hello'] },
      playerWordDetails: { 'Player1': [{ word: 'cat', score: 10, validated: true }, { word: 'dog', score: 10, validated: true }, { word: 'hello', score: 50, validated: true }] }
    });
    const result = calculateGameScores(game, {}, new Set(['cat', 'dog', 'hello']));
    expect(result[0].totalScore).toBe(70);
  });

  test('sorts by score descending', () => {
    const game = createMockGame({
      users: { 'Low': createTestUser('Low'), 'High': createTestUser('High') },
      playerWords: { 'Low': ['at'], 'High': ['testing'] },
      playerWordDetails: { 'Low': [{ word: 'at', score: 5, validated: true }], 'High': [{ word: 'testing', score: 200, validated: true }] }
    });
    const result = calculateGameScores(game, {}, new Set(['at', 'testing']));
    expect(result[0].username).toBe('High');
  });

  test('preserves pre-calculated scores', () => {
    const game = createMockGame({
      users: { 'P': createTestUser('P') },
      playerWords: { 'P': ['hello'] },
      playerWordDetails: { 'P': [{ word: 'hello', score: 55, validated: true, comboBonus: 5 }] }
    });
    const result = calculateGameScores(game, {}, new Set(['hello']));
    expect(result[0].wordDetails[0].score).toBe(55);
  });

  test('handles duplicate words', () => {
    const game = createMockGame({
      users: { 'P': createTestUser('P') },
      playerWords: { 'P': ['hello', 'hello'] },
      playerWordDetails: { 'P': [{ word: 'hello', score: 50, validated: true }] }
    });
    const result = calculateGameScores(game, {}, new Set(['hello']));
    expect(result[0].wordCount).toBe(1);
  });

  // Live→final handoff bug: live score (game.playerScores) adds event bonuses
  // (golden/lightning/special-word/word-hunt board + target finder) that are NOT
  // baked into per-word playerWordDetails[].score, so the recompute dropped them and
  // the result page showed a LOWER score than the in-game leaderboard. A per-player
  // playerEventBonuses accumulator must survive the recompute.
  describe('event bonus preservation', () => {
    test('adds per-player event bonus to final totalScore and score', () => {
      const game = createMockGame({
        users: { 'P': createTestUser('P') },
        playerWords: { 'P': ['hello'] },
        playerWordDetails: { 'P': [{ word: 'hello', score: 50, validated: true }] },
        playerEventBonuses: { 'P': 25 },
      });
      const result = calculateGameScores(game, {}, new Set(['hello']));
      expect(result[0].totalScore).toBe(75);
      expect(result[0].score).toBe(75);
    });

    test('missing accumulator leaves recomputed score unchanged', () => {
      const game = createMockGame({
        users: { 'P': createTestUser('P') },
        playerWords: { 'P': ['hello'] },
        playerWordDetails: { 'P': [{ word: 'hello', score: 50, validated: true }] },
      });
      const result = calculateGameScores(game, {}, new Set(['hello']));
      expect(result[0].totalScore).toBe(50);
    });
  });
});

describe('Scoring Strategy Scenarios', () => {
  test('perfectionist beats speed player', () => {
    let speedScore = 0;
    for (let i = 0; i < 10; i++) speedScore += calculateWordScore('cat', 0, 1);
    expect(speedScore).toBe(100);

    let perfScore = 0;
    for (let c = 0; c < 5; c++) perfScore += calculateWordScore('gaming', c, 1);
    expect(perfScore).toBe(514);
    expect(perfScore).toBeGreaterThan(speedScore);
  });

  test('fire round amplifies advantage', () => {
    let speedFire = 0;
    for (let i = 0; i < 10; i++) speedFire += calculateWordScore('cat', 0, 2);
    expect(speedFire).toBe(200);

    let perfFire = 0;
    for (let c = 0; c < 5; c++) perfFire += calculateWordScore('gaming', c, 2);
    expect(perfFire).toBe(1028);
    expect(perfFire).toBeGreaterThan(speedFire);
  });
});

describe('Scoring Engine - Wheel Rush mode', () => {
  test('wheel-rush totalScore equals sum of pre-calculated word scores (no rarity inflation)', () => {
    const game = createMockGame({
      gameMode: 'wheel-rush',
      users: { p1: createTestUser('p1'), p2: createTestUser('p2') },
      playerWords: { p1: ['cane', 'tea'], p2: ['cane', 'east'] },
      playerWordDetails: {
        p1: [
          { word: 'cane', score: 18, validated: true },
          { word: 'tea', score: 6, validated: true },
        ],
        p2: [
          { word: 'cane', score: 11, validated: true },
          { word: 'east', score: 9, validated: true },
        ],
      },
    });
    const result = calculateGameScores(
      game,
      { cane: 2, tea: 1, east: 1 },
      new Set(['cane', 'tea', 'east']),
      new Set(),
      new Map<string, AiValidationResult>(),
      { playerCount: 2, gameMode: 'wheel-rush' }
    );
    const p1 = result.find(r => r.username === 'p1')!;
    const p2 = result.find(r => r.username === 'p2')!;
    expect(p1.totalScore).toBe(24);
    expect(p2.totalScore).toBe(20);
    for (const r of result) {
      for (const w of r.allWords) expect(w.isDuplicate).toBe(false);
    }
  });
});
