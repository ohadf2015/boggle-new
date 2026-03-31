import { getRankTier } from '@/shared/utils/eloRating';
import { detectRankChange, type RankChangeResult } from '@/hooks/useRankUpDetection';

describe('detectRankChange', () => {
  describe('rank up detection', () => {
    it('detects rank up from Silver to Gold', () => {
      const result = detectRankChange(1050, 1210);
      expect(result.rankUp).not.toBeNull();
      expect(result.rankUp!.from.name).toBe('Silver');
      expect(result.rankUp!.to.name).toBe('Gold');
    });

    it('detects rank up across multiple tiers', () => {
      const result = detectRankChange(900, 1600);
      expect(result.rankUp).not.toBeNull();
      expect(result.rankUp!.from.name).toBe('Bronze');
      expect(result.rankUp!.to.name).toBe('Diamond');
    });

    it('returns null rankUp when tier unchanged', () => {
      const result = detectRankChange(1050, 1100);
      expect(result.rankUp).toBeNull();
    });
  });

  describe('rank down detection', () => {
    it('detects rank down from Gold to Silver', () => {
      const result = detectRankChange(1210, 1050);
      expect(result.rankDown).not.toBeNull();
      expect(result.rankDown!.from.name).toBe('Gold');
      expect(result.rankDown!.to.name).toBe('Silver');
    });

    it('returns null rankDown when tier unchanged', () => {
      const result = detectRankChange(1050, 1100);
      expect(result.rankDown).toBeNull();
    });
  });

  describe('near rank detection', () => {
    it('detects near rank when within 100 ELO of next tier', () => {
      // Silver (1000) player at 1150 is 50 away from Gold (1200)
      const result = detectRankChange(1150, 1150);
      expect(result.nearRank).not.toBeNull();
      expect(result.nearRank!.nextTier.name).toBe('Gold');
      expect(result.nearRank!.eloNeeded).toBe(50);
    });

    it('returns null nearRank when more than 100 ELO away', () => {
      // Silver player at 1050 is 150 away from Gold
      const result = detectRankChange(1050, 1050);
      expect(result.nearRank).toBeNull();
    });

    it('returns null nearRank when rank up just happened', () => {
      // Ranked up to Gold — don't show near-rank teaser
      const result = detectRankChange(1190, 1210);
      expect(result.rankUp).not.toBeNull();
      expect(result.nearRank).toBeNull();
    });

    it('returns null nearRank for Grandmaster (no next tier)', () => {
      const result = detectRankChange(2050, 2050);
      expect(result.nearRank).toBeNull();
    });

    it('handles exact boundary - at threshold', () => {
      // At 1100, 100 ELO to Gold — should be included (within 100)
      const result = detectRankChange(1100, 1100);
      expect(result.nearRank).not.toBeNull();
      expect(result.nearRank!.eloNeeded).toBe(100);
    });
  });

  describe('edge cases', () => {
    it('handles same rating (no change)', () => {
      const result = detectRankChange(1000, 1000);
      expect(result.rankUp).toBeNull();
      expect(result.rankDown).toBeNull();
    });

    it('handles Unranked to Bronze', () => {
      const result = detectRankChange(750, 810);
      expect(result.rankUp).not.toBeNull();
      expect(result.rankUp!.from.name).toBe('Unranked');
      expect(result.rankUp!.to.name).toBe('Bronze');
    });
  });
});
