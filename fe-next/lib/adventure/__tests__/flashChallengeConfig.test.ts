import { getFlashChallengeForWorld, FLASH_CHALLENGES } from '../flashChallengeConfig';

describe('flashChallengeConfig', () => {
  it('returns challenges for each world 1-10', () => {
    for (let w = 1; w <= 10; w++) {
      const c = getFlashChallengeForWorld(w);
      expect(c.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('each challenge has required fields', () => {
    for (const c of FLASH_CHALLENGES) {
      expect(c.id).toBeTruthy();
      expect(c.durationSeconds).toBeGreaterThan(0);
      expect(c.rewardCoins).toBeGreaterThan(0);
      expect(c.descriptionKey).toMatch(/^adventure\.quests\.flash\./);
    }
  });
});
