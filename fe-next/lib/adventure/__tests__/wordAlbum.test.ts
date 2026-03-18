import {
  getNextMilestone,
  getMilestoneProgress,
  addWordsToAlbum,
  WORD_ALBUM_MILESTONES,
} from '../wordAlbum';

describe('wordAlbum', () => {
  describe('getNextMilestone', () => {
    it('returns first unclaimed milestone when player has enough words', () => {
      const milestone = getNextMilestone(55, []);
      expect(milestone).toBeDefined();
      expect(milestone!.target).toBe(50);
    });

    it('skips already claimed milestones', () => {
      const milestone = getNextMilestone(110, [50]);
      expect(milestone!.target).toBe(100);
    });

    it('returns null when no milestones are claimable', () => {
      const milestone = getNextMilestone(30, []);
      expect(milestone).toBeNull();
    });

    it('returns null when all reached milestones are claimed', () => {
      const milestone = getNextMilestone(110, [50, 100]);
      expect(milestone).toBeNull();
    });
  });

  describe('getMilestoneProgress', () => {
    it('marks milestones as unlocked when count meets target', () => {
      const progress = getMilestoneProgress(250, [50, 100]);
      const m250 = progress.find(p => p.target === 250);
      expect(m250!.isUnlocked).toBe(true);
      expect(m250!.isClaimed).toBe(false);
    });

    it('marks milestones as claimed when in claimed list', () => {
      const progress = getMilestoneProgress(100, [50]);
      const m50 = progress.find(p => p.target === 50);
      expect(m50!.isClaimed).toBe(true);
    });

    it('returns all milestones', () => {
      const progress = getMilestoneProgress(0, []);
      expect(progress).toHaveLength(WORD_ALBUM_MILESTONES.length);
    });
  });

  describe('addWordsToAlbum', () => {
    it('adds new words and returns count', () => {
      const result = addWordsToAlbum(['HELLO', 'WORLD'], ['test', 'new']);
      expect(result.newCount).toBe(2);
      expect(result.updatedWords).toContain('TEST');
      expect(result.updatedWords).toContain('NEW');
      expect(result.updatedWords).toHaveLength(4);
    });

    it('deduplicates case-insensitively', () => {
      const result = addWordsToAlbum(['HELLO'], ['hello', 'Hello']);
      expect(result.newCount).toBe(0);
      expect(result.updatedWords).toHaveLength(1);
    });

    it('handles empty existing album', () => {
      const result = addWordsToAlbum([], ['cat', 'dog']);
      expect(result.newCount).toBe(2);
      expect(result.updatedWords).toHaveLength(2);
    });
  });
});
