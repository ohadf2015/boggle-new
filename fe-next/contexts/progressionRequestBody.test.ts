import { describe, it, expect } from 'vitest';
import { buildCompleteLevelBody } from './progressionRequestBody';

describe('buildCompleteLevelBody', () => {
  const base = {
    world: 1,
    level: 1,
    stars: 3 as const,
    score: 500,
    words: 20,
  };

  it('includes required fields', () => {
    const body = JSON.parse(buildCompleteLevelBody(base));
    expect(body).toMatchObject({ world: 1, level: 1, stars: 3, score: 500, words: 20 });
  });

  it('includes timePlayed when provided', () => {
    const body = JSON.parse(buildCompleteLevelBody({ ...base, timePlayed: 45 }));
    expect(body.timePlayed).toBe(45);
  });

  it('omits timePlayed when not provided (legacy)', () => {
    const body = JSON.parse(buildCompleteLevelBody(base));
    expect('timePlayed' in body).toBe(false);
  });

  it('includes optional fields only when set', () => {
    const body = JSON.parse(buildCompleteLevelBody({
      ...base,
      goldEarned: 50,
      longWords: 3,
      wordsFound: ['hello', 'world'],
      flashChallengeGold: 25,
      timePlayed: 60,
    }));
    expect(body).toMatchObject({
      goldEarned: 50,
      longWords: 3,
      wordsFound: ['hello', 'world'],
      flashChallengeGold: 25,
      timePlayed: 60,
    });
  });

  it('omits wordsFound when empty array', () => {
    const body = JSON.parse(buildCompleteLevelBody({ ...base, wordsFound: [] }));
    expect('wordsFound' in body).toBe(false);
  });

  it('omits flashChallengeGold when 0', () => {
    const body = JSON.parse(buildCompleteLevelBody({ ...base, flashChallengeGold: 0 }));
    expect('flashChallengeGold' in body).toBe(false);
  });

  it('omits goldEarned when undefined but includes when 0', () => {
    const a = JSON.parse(buildCompleteLevelBody({ ...base }));
    const b = JSON.parse(buildCompleteLevelBody({ ...base, goldEarned: 0 }));
    expect('goldEarned' in a).toBe(false);
    expect(b.goldEarned).toBe(0);
  });
});
