/**
 * Milestones Module Tests
 *
 * Tests for milestone detection, rewards, and progress calculation
 */

import {
  getMilestones,
  checkMilestoneCrossed,
  getMilestoneRewards,
  getNextMilestoneForLevel,
  getMilestoneProgress,
  MAJOR_MILESTONES,
  MINOR_MILESTONES,
} from './milestones';

describe('Milestones Module', () => {
  describe('getMilestones', () => {
    it('should return all milestone levels sorted', () => {
      const milestones = getMilestones();

      expect(milestones.length).toBeGreaterThan(0);

      // Check sorted order
      for (let i = 1; i < milestones.length; i++) {
        expect(milestones[i].level).toBeGreaterThan(milestones[i - 1].level);
      }
    });

    it('should mark major milestones correctly', () => {
      const milestones = getMilestones();

      const majorLevels = milestones
        .filter(m => m.isMajor)
        .map(m => m.level);

      expect(majorLevels).toEqual(MAJOR_MILESTONES);
    });

    it('should mark minor milestones correctly', () => {
      const milestones = getMilestones();

      const minorLevels = milestones
        .filter(m => !m.isMajor)
        .map(m => m.level);

      expect(minorLevels).toEqual(MINOR_MILESTONES);
    });

    it('should include title for levels with titles', () => {
      const milestones = getMilestones();

      const level5 = milestones.find(m => m.level === 5);
      expect(level5?.title).toBe('WORD_SEEKER');

      const level10 = milestones.find(m => m.level === 10);
      expect(level10?.title).toBe('LETTER_SCOUT');
    });

    it('should have null title for levels without titles', () => {
      const milestones = getMilestones();

      const level3 = milestones.find(m => m.level === 3);
      expect(level3?.title).toBeNull();
    });
  });

  describe('checkMilestoneCrossed', () => {
    it('should return null when no milestone crossed', () => {
      const result = checkMilestoneCrossed(3, 4);
      expect(result).toBeNull();
    });

    it('should return null when level decreased', () => {
      const result = checkMilestoneCrossed(10, 8);
      expect(result).toBeNull();
    });

    it('should detect crossing a single milestone', () => {
      const result = checkMilestoneCrossed(4, 5);

      expect(result).not.toBeNull();
      expect(result?.level).toBe(5);
      expect(result?.isMajor).toBe(true);
      expect(result?.title).toBe('WORD_SEEKER');
    });

    it('should return highest milestone when multiple crossed', () => {
      const result = checkMilestoneCrossed(2, 10);

      expect(result).not.toBeNull();
      expect(result?.level).toBe(10);
      expect(result?.isMajor).toBe(true);
      expect(result?.title).toBe('LETTER_SCOUT');
    });

    it('should detect crossing minor milestone', () => {
      const result = checkMilestoneCrossed(2, 3);

      expect(result).not.toBeNull();
      expect(result?.level).toBe(3);
      expect(result?.isMajor).toBe(false);
    });

    it('should detect when starting at milestone level', () => {
      const result = checkMilestoneCrossed(5, 6);
      expect(result).toBeNull();
    });

    it('should handle edge case of first milestone', () => {
      const result = checkMilestoneCrossed(1, 3);

      expect(result).not.toBeNull();
      expect(result?.level).toBe(3);
    });
  });

  describe('getMilestoneRewards', () => {
    it('should return rewards for major milestone level 5', () => {
      const rewards = getMilestoneRewards(5);

      expect(rewards.xpBonus).toBe(100);
      expect(rewards.coinBonus).toBe(25);
      expect(rewards.title).toBe('WORD_SEEKER');
    });

    it('should return rewards for major milestone level 10', () => {
      const rewards = getMilestoneRewards(10);

      expect(rewards.xpBonus).toBe(250);
      expect(rewards.coinBonus).toBe(50);
      expect(rewards.title).toBe('LETTER_SCOUT');
    });

    it('should return rewards for major milestone level 25', () => {
      const rewards = getMilestoneRewards(25);

      expect(rewards.xpBonus).toBe(500);
      expect(rewards.coinBonus).toBe(100);
      expect(rewards.title).toBe('LEXICAL_MASTER');
    });

    it('should return rewards for major milestone level 50', () => {
      const rewards = getMilestoneRewards(50);

      expect(rewards.xpBonus).toBe(1000);
      expect(rewards.coinBonus).toBe(250);
      expect(rewards.title).toBe('WORD_LEGEND');
    });

    it('should return rewards for major milestone level 100', () => {
      const rewards = getMilestoneRewards(100);

      expect(rewards.xpBonus).toBe(5000);
      expect(rewards.coinBonus).toBe(1000);
      expect(rewards.title).toBe('ETERNAL_CHAMPION');
    });

    it('should scale rewards higher for higher levels', () => {
      const rewards5 = getMilestoneRewards(5);
      const rewards100 = getMilestoneRewards(100);

      expect(rewards100.xpBonus).toBeGreaterThan(rewards5.xpBonus);
      expect(rewards100.coinBonus).toBeGreaterThan(rewards5.coinBonus);
    });

    it('should return null title for minor milestones', () => {
      const rewards = getMilestoneRewards(3);

      expect(rewards.title).toBeNull();
    });

    it('should return zero rewards for non-milestone levels', () => {
      const rewards = getMilestoneRewards(4);

      expect(rewards.xpBonus).toBe(0);
      expect(rewards.coinBonus).toBe(0);
      expect(rewards.title).toBeNull();
    });
  });

  describe('getNextMilestoneForLevel', () => {
    it('should return next milestone from level 1', () => {
      const next = getNextMilestoneForLevel(1);

      expect(next).not.toBeNull();
      expect(next?.level).toBe(3);
      expect(next?.isMajor).toBe(false);
      expect(next?.xpNeeded).toBeGreaterThan(0);
    });

    it('should return next milestone from level 5', () => {
      const next = getNextMilestoneForLevel(5);

      expect(next).not.toBeNull();
      expect(next?.level).toBe(7);
      expect(next?.isMajor).toBe(false);
    });

    it('should return null when at max milestone', () => {
      const next = getNextMilestoneForLevel(100);
      expect(next).toBeNull();
    });

    it('should include title if next milestone has one', () => {
      const next = getNextMilestoneForLevel(4);

      expect(next).not.toBeNull();
      expect(next?.level).toBe(5);
      expect(next?.title).toBe('WORD_SEEKER');
    });
  });

  describe('getMilestoneProgress', () => {
    it('should calculate progress to first milestone', () => {
      const progress = getMilestoneProgress(150);

      expect(progress.currentLevel).toBe(1);
      expect(progress.nextMilestone).not.toBeNull();
      expect(progress.nextMilestone?.level).toBe(3);
      expect(progress.progressPercent).toBeGreaterThan(0);
      expect(progress.progressPercent).toBeLessThanOrEqual(100);
    });

    it('should calculate progress between milestones', () => {
      const progress = getMilestoneProgress(500);

      expect(progress.currentLevel).toBeGreaterThan(1);
      expect(progress.nextMilestone).not.toBeNull();
      expect(progress.progressPercent).toBeGreaterThanOrEqual(0);
      expect(progress.progressPercent).toBeLessThanOrEqual(100);
    });

    it('should show next milestone as null when at max', () => {
      const progress = getMilestoneProgress(1000000);

      expect(progress.currentLevel).toBe(100);
      expect(progress.nextMilestone).toBeNull();
      expect(progress.progressPercent).toBe(100);
    });

    it('should calculate xp remaining correctly', () => {
      const progress = getMilestoneProgress(200);

      expect(progress.xpToNextMilestone).toBeGreaterThan(0);
    });
  });
});
