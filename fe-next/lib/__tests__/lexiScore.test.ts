import { calculateLexiScore, type LexiScoreInput } from '../lexiScore';

describe('calculateLexiScore', () => {
  const makeInput = (overrides: Partial<LexiScoreInput> = {}): LexiScoreInput => ({
    currentLevel: 0,
    prestigeLevel: 0,
    totalWords: 0,
    totalGames: 0,
    longestStreak: 0,
    uniqueDaysPlayed: 0,
    totalScore: 0,
    ...overrides,
  });

  it('returns 0 for a brand new player', () => {
    const result = calculateLexiScore(makeInput());
    expect(result.total).toBe(0);
    expect(result.tier).toBe('newcomer');
  });

  it('computes base from level (10 pts per level)', () => {
    const result = calculateLexiScore(makeInput({ currentLevel: 25 }));
    expect(result.breakdown.base).toBe(250);
  });

  it('caps level at 100', () => {
    const result = calculateLexiScore(makeInput({ currentLevel: 150 }));
    expect(result.breakdown.base).toBe(1000);
  });

  it('computes prestige bonus (200 per level)', () => {
    const result = calculateLexiScore(makeInput({ prestigeLevel: 3 }));
    expect(result.breakdown.prestige).toBe(600);
  });

  it('computes words bonus (1 pt per 50 words)', () => {
    const result = calculateLexiScore(makeInput({ totalWords: 5000 }));
    expect(result.breakdown.words).toBe(100);
  });

  it('computes games bonus (1 pt per 5 games)', () => {
    const result = calculateLexiScore(makeInput({ totalGames: 100 }));
    expect(result.breakdown.games).toBe(20);
  });

  it('computes streak bonus (3 pts per day)', () => {
    const result = calculateLexiScore(makeInput({ longestStreak: 30 }));
    expect(result.breakdown.streak).toBe(90);
  });

  it('assigns correct tiers', () => {
    expect(calculateLexiScore(makeInput({ currentLevel: 5 })).tier).toBe('newcomer');
    expect(calculateLexiScore(makeInput({ currentLevel: 15 })).tier).toBe('wordsmith');
    expect(calculateLexiScore(makeInput({ currentLevel: 40 })).tier).toBe('linguist');
    expect(calculateLexiScore(makeInput({ currentLevel: 70 })).tier).toBe('scholar');
    expect(calculateLexiScore(makeInput({ currentLevel: 100 })).tier).toBe('master');
    expect(calculateLexiScore(makeInput({ currentLevel: 100, prestigeLevel: 5 })).tier).toBe('grandmaster'); // 1000+1000=2000
    expect(calculateLexiScore(makeInput({ currentLevel: 100, prestigeLevel: 5, totalWords: 100000, totalGames: 2000, longestStreak: 100, totalScore: 500000 })).tier).toBe('legend');
  });

  it('handles negative inputs gracefully', () => {
    const result = calculateLexiScore(makeInput({
      totalWords: -100,
      totalGames: -5,
      longestStreak: -3,
    }));
    expect(result.total).toBe(0);
  });

  it('total is the sum of all breakdown components', () => {
    const result = calculateLexiScore(makeInput({
      currentLevel: 10,
      prestigeLevel: 1,
      totalWords: 1000,
      totalGames: 50,
      longestStreak: 7,
      uniqueDaysPlayed: 14,
      totalScore: 5000,
    }));
    const { base, prestige, words, games, streak, daily, score } = result.breakdown;
    expect(result.total).toBe(base + prestige + words + games + streak + daily + score);
  });
});
