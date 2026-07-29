import { describe, test, expect, vi } from 'vitest';

vi.mock('../../utils/logger', () => {
  const l = { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() };
  return { __esModule: true, default: l, ...l };
});

vi.mock('../../modules/achievementManager', () => ({
  ACHIEVEMENT_ICONS: { FIRST_BLOOD: '🎯', WORD_MASTER: '📚' },
}));

import {
  calculateRank,
  calculateStats,
  getTopWords,
  generateScoreCardData,
} from '../scorecardHandler';
import type { WordDetail } from '@/shared/types';
import type { GameState } from '../../modules/gameState/types.js';

const wd = (over: Partial<WordDetail> = {}): WordDetail => ({
  word: 'CAT',
  score: 3,
  validated: true,
  isDuplicate: false,
  isUnique: false,
  ...over,
} as WordDetail);

describe('calculateRank', () => {
  test('single player gets rank 1 and percentile 100', () => {
    const r = calculateRank([{ username: 'A', score: 50 }], 'A');
    expect(r.rank).toBe(1);
    expect(r.totalPlayers).toBe(1);
    expect(r.percentile).toBe(100);
    expect(r.isWinner).toBe(true);
    expect(r.pointsFromWinner).toBe(0);
    expect(r.pointsFromNext).toBe(0);
  });

  test('winner has pointsFromWinner 0 and pointsFromNext 0', () => {
    const scores = [{ username: 'A', score: 50 }, { username: 'B', score: 30 }];
    const r = calculateRank(scores, 'A');
    expect(r.rank).toBe(1);
    expect(r.isWinner).toBe(true);
    expect(r.pointsFromWinner).toBe(0);
    expect(r.pointsFromNext).toBe(0);
  });

  test('runner-up has negative pointsFromWinner and positive pointsFromNext', () => {
    const scores = [
      { username: 'A', score: 50 },
      { username: 'B', score: 30 },
      { username: 'C', score: 10 },
    ];
    const r = calculateRank(scores, 'B');
    expect(r.rank).toBe(2);
    expect(r.pointsFromWinner).toBe(-20);
    expect(r.pointsFromNext).toBe(-20);
    expect(r.isWinner).toBe(false);
  });

  test('tied score with winner is treated as winner', () => {
    const scores = [
      { username: 'A', score: 50 },
      { username: 'B', score: 50 },
    ];
    const r = calculateRank(scores, 'B');
    expect(r.isWinner).toBe(true);
  });

  test('percentile scales to 0 for last of many', () => {
    const scores = [
      { username: 'A', score: 100 },
      { username: 'B', score: 50 },
      { username: 'C', score: 25 },
    ];
    expect(calculateRank(scores, 'C').percentile).toBe(0);
    expect(calculateRank(scores, 'A').percentile).toBe(100);
    expect(calculateRank(scores, 'B').percentile).toBe(50);
  });

  test('player not in scores returns zeroed rank', () => {
    const r = calculateRank([{ username: 'A', score: 10 }], 'ghost');
    expect(r.rank).toBe(0);
    expect(r.percentile).toBe(0);
    expect(r.isWinner).toBe(false);
  });
});

describe('calculateStats', () => {
  test('empty word details returns zeroed stats', () => {
    const s = calculateStats([], 0);
    expect(s.validWordsFound).toBe(0);
    expect(s.longestWord).toBeNull();
    expect(s.accuracy).toBe(0);
    expect(s.averageWordLength).toBe(0);
    expect(s.maxCombo).toBe(0);
  });

  test('accuracy divides valid by total submissions', () => {
    const words = [wd({ word: 'CAT' }), wd({ word: 'XXX', validated: false })];
    const s = calculateStats(words, 2);
    expect(s.validWordsFound).toBe(1);
    expect(s.accuracy).toBe(50);
  });

  test('longest word scans all submissions including invalid', () => {
    const words = [
      wd({ word: 'CAT' }),
      wd({ word: 'ELEPHANT', validated: false }),
    ];
    const s = calculateStats(words, 2);
    expect(s.longestWord).toBe('ELEPHANT');
    expect(s.longestWordLength).toBe(8);
  });

  test('duplicates excluded from valid count', () => {
    const words = [wd({ word: 'CAT' }), wd({ word: 'CAT', isDuplicate: true })];
    const s = calculateStats(words, 2);
    expect(s.validWordsFound).toBe(1);
  });

  test('combo bonus sums and tracks max', () => {
    const words = [
      wd({ comboLevel: 2, comboBonus: 10 }),
      wd({ comboLevel: 5, comboBonus: 25 }),
      wd({ comboLevel: 3, comboBonus: 15 }),
    ];
    const s = calculateStats(words, 3);
    expect(s.maxCombo).toBe(5);
    expect(s.totalComboBonus).toBe(50);
  });

  test('fire round bonus sums across words', () => {
    const words = [wd({ fireRoundBonus: 20 }), wd({ fireRoundBonus: 30 })];
    const s = calculateStats(words, 2);
    expect(s.totalFireRoundBonus).toBe(50);
  });

  test('average word length rounds to 1 decimal and ignores invalid', () => {
    const words = [
      wd({ word: 'AB' }),
      wd({ word: 'ABCDE' }),
      wd({ word: 'ZZZZZZZZZ', validated: false }),
    ];
    const s = calculateStats(words, 3);
    expect(s.averageWordLength).toBe(3.5);
  });

  test('unique words counted', () => {
    const words = [wd({ isUnique: true }), wd(), wd({ isUnique: true })];
    const s = calculateStats(words, 3);
    expect(s.uniqueWordsCount).toBe(2);
  });
});

describe('getTopWords', () => {
  test('returns max 5 words sorted by score descending', () => {
    const words = Array.from({ length: 8 }, (_, i) =>
      wd({ word: `W${i}`, score: i * 10 })
    );
    const top = getTopWords(words);
    expect(top).toHaveLength(5);
    expect(top[0].word).toBe('W7');
    expect(top[4].word).toBe('W3');
  });

  test('filters out invalid and duplicate words', () => {
    const words = [
      wd({ word: 'A', score: 5 }),
      wd({ word: 'B', score: 100, validated: false }),
      wd({ word: 'C', score: 50, isDuplicate: true }),
    ];
    const top = getTopWords(words);
    expect(top).toHaveLength(1);
    expect(top[0].word).toBe('A');
  });

  test('base score subtracts combo and fire bonuses', () => {
    const w = wd({ word: 'BIG', score: 30, comboBonus: 10, fireRoundBonus: 5 });
    const [out] = getTopWords([w]);
    expect(out.baseScore).toBe(15);
    expect(out.totalScore).toBe(30);
    expect(out.comboBonus).toBe(10);
    expect(out.fireRoundBonus).toBe(5);
  });

  test('omits undefined bonus fields when zero/absent', () => {
    const [out] = getTopWords([wd({ score: 5 })]);
    expect(out.comboBonus).toBeUndefined();
    expect(out.fireRoundBonus).toBeUndefined();
  });
});

describe('generateScoreCardData', () => {
  const baseGame = (): GameState => ({
    gameCode: 'ABC123',
    language: 'en',
    users: {
      Alice: { avatar: { emoji: '🦊', color: '#fff' } },
      Bob: { avatar: {} },
    },
    playerScores: { Alice: 100, Bob: 60 },
    playerWords: { Alice: ['CAT', 'DOG', 'BAT'] },
    playerWordDetails: {
      Alice: [
        wd({ word: 'CAT', score: 3 }),
        wd({ word: 'DOG', score: 3 }),
        wd({ word: 'BAT', score: 3, validated: false }),
      ],
    },
    playerAchievements: {
      Alice: [{ id: 'FIRST_BLOOD' }, { id: 'UNKNOWN_ID' }],
    },
    gameState: 'finished',
    gameDuration: 180,
    isRanked: false,
    minWordLength: 2,
  }) as unknown as GameState;

  test('throws when player missing from game.users', () => {
    const g = baseGame();
    expect(() => generateScoreCardData(g, 'Ghost')).toThrow('Player not found');
  });

  test('builds card with rank, stats, achievements, metadata', () => {
    const card = generateScoreCardData(baseGame(), 'Alice');
    expect(card.username).toBe('Alice');
    expect(card.score).toBe(100);
    expect(card.rank.rank).toBe(1);
    expect(card.rank.isWinner).toBe(true);
    expect(card.stats.validWordsFound).toBe(2);
    expect(card.stats.accuracy).toBe(67); // 2/3 → 67
    expect(card.achievements).toEqual([
      { key: 'FIRST_BLOOD', icon: '🎯' },
      { key: 'UNKNOWN_ID', icon: '🏅' }, // fallback icon
    ]);
    expect(card.metadata.gameCode).toBe('ABC123');
    expect(card.metadata.isRanked).toBe(false);
    expect(card.topWords.length).toBeGreaterThan(0);
  });

  test('defaults language to en and minWordLength to 2 when missing', () => {
    const g = baseGame();
    delete (g as Partial<GameState>).language;
    delete (g as Partial<GameState>).minWordLength;
    const card = generateScoreCardData(g, 'Alice');
    expect(card.metadata.language).toBe('en');
    expect(card.metadata.minWordLength).toBe(2);
  });

  test('handles player with no word details or achievements', () => {
    const g = baseGame();
    g.playerWordDetails = {};
    g.playerAchievements = {};
    g.playerWords = {};
    const card = generateScoreCardData(g, 'Alice');
    expect(card.stats.validWordsFound).toBe(0);
    expect(card.achievements).toEqual([]);
    expect(card.topWords).toEqual([]);
  });
});
