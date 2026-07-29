import { FLASH_CHALLENGES, getFlashChallengeForWorld } from '../flashChallengeConfig';

describe('flashChallengeConfig expanded', () => {
  it('should have more than 5 challenges', () => {
    expect(FLASH_CHALLENGES.length).toBeGreaterThanOrEqual(12);
  });

  it('should include new challenge types', () => {
    const types = new Set(FLASH_CHALLENGES.map(c => c.type));
    expect(types.has('palindrome')).toBe(true);
    expect(types.has('doubleLetters')).toBe(true);
    expect(types.has('startsWith')).toBe(true);
    expect(types.has('exactLength')).toBe(true);
  });

  it('should have unique IDs', () => {
    const ids = FLASH_CHALLENGES.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should return world-appropriate challenges', () => {
    // Early worlds get easier challenges
    const w1 = getFlashChallengeForWorld(1);
    expect(w1.length).toBeGreaterThanOrEqual(2);

    // Late worlds get harder challenges
    const w9 = getFlashChallengeForWorld(9);
    expect(w9.length).toBeGreaterThanOrEqual(2);

    // Late worlds should have higher average rewards
    const w1Avg = w1.reduce((s, c) => s + c.rewardCoins, 0) / w1.length;
    const w9Avg = w9.reduce((s, c) => s + c.rewardCoins, 0) / w9.length;
    expect(w9Avg).toBeGreaterThanOrEqual(w1Avg);
  });

  it('should have valid durations and rewards', () => {
    for (const c of FLASH_CHALLENGES) {
      expect(c.durationSeconds).toBeGreaterThan(0);
      expect(c.durationSeconds).toBeLessThanOrEqual(60);
      expect(c.rewardCoins).toBeGreaterThan(0);
      expect(c.rewardScore).toBeGreaterThan(0);
    }
  });
});
