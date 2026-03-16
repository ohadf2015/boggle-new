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

  describe('locale-aware filtering', () => {
    const LETTER_TYPES = ['startsWith', 'endsWith', 'specificLetter'];

    it('returns English letter challenges for en locale', () => {
      const challenges = getFlashChallengeForWorld(1, 'en');
      const hasLetterChallenge = challenges.some(c => LETTER_TYPES.includes(c.type));
      expect(hasLetterChallenge).toBe(true);
    });

    it('excludes English letter challenges for Hebrew locale', () => {
      const challenges = getFlashChallengeForWorld(1, 'he');
      const letterChallenges = challenges.filter(c => LETTER_TYPES.includes(c.type));
      expect(letterChallenges).toHaveLength(0);
    });

    it('excludes English letter challenges for Japanese locale', () => {
      const challenges = getFlashChallengeForWorld(1, 'ja');
      const letterChallenges = challenges.filter(c => LETTER_TYPES.includes(c.type));
      expect(letterChallenges).toHaveLength(0);
    });

    it('excludes English letter challenges for Swedish locale', () => {
      const challenges = getFlashChallengeForWorld(1, 'sv');
      const letterChallenges = challenges.filter(c => LETTER_TYPES.includes(c.type));
      expect(letterChallenges).toHaveLength(0);
    });

    it('returns at least 2 challenges for non-English locales in every world tier', () => {
      for (let w = 1; w <= 10; w++) {
        const challenges = getFlashChallengeForWorld(w, 'he');
        expect(challenges.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('defaults to English behavior when locale is omitted', () => {
      const withLocale = getFlashChallengeForWorld(1, 'en');
      const withoutLocale = getFlashChallengeForWorld(1);
      expect(withLocale).toEqual(withoutLocale);
    });
  });
});
