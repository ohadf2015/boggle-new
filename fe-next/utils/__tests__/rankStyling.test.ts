/**
 * rankStyling Utility Tests
 *
 * Tests for rank display color utilities used across leaderboards.
 * Tests the daily leaderboard styling functions in rankingStyles.ts.
 */

import { getRankRowClasses, getRankBadgeClasses } from '../rankingStyles';

describe('rankStyling', () => {
  describe('getRankRowClasses', () => {
    it('should return current user highlight for rank 1 when isCurrentUser is true', () => {
      const result = getRankRowClasses(1, true);

      expect(result).toContain('bg-linear-to-r from-neo-cyan/40');
      expect(result).toContain('border-neo-cyan');
      expect(result).toContain('ring-2 ring-neo-cyan/60');
    });

    it('should return current user highlight for any rank when isCurrentUser is true', () => {
      const result = getRankRowClasses(5, true);

      expect(result).toContain('neo-cyan');
      expect(result).toContain('ring-2');
    });

    it('should return gold styling for rank 1 when not current user', () => {
      const result = getRankRowClasses(1, false);

      expect(result).toContain('from-tier-gold/20');
      expect(result).toContain('border-tier-gold');
    });

    it('should return silver styling for rank 2', () => {
      const result = getRankRowClasses(2, false);

      expect(result).toContain('from-slate-100');
      expect(result).toContain('border-slate-400');
    });

    it('should return bronze styling for rank 3', () => {
      const result = getRankRowClasses(3, false);

      expect(result).toContain('from-orange-100');
      expect(result).toContain('border-orange-400');
    });

    it('should return default styling for ranks 4+', () => {
      const result = getRankRowClasses(4, false);

      expect(result).toContain('bg-white/90');
      expect(result).toContain('dark:bg-slate-800/90');
      expect(result).toContain('border-slate-200');
    });

    it('should return default styling for rank 10', () => {
      const result = getRankRowClasses(10, false);

      expect(result).toContain('bg-white/90');
      expect(result).toContain('border-slate-200');
    });
  });

  describe('getRankBadgeClasses', () => {
    it('should return gold badge for rank 1', () => {
      const result = getRankBadgeClasses(1);

      expect(result).toContain('from-tier-gold');
      expect(result).toContain('to-yellow-400');
      expect(result).toContain('text-amber-900');
    });

    it('should return silver badge for rank 2', () => {
      const result = getRankBadgeClasses(2);

      expect(result).toContain('from-slate-300');
      expect(result).toContain('to-gray-400');
      expect(result).toContain('text-slate-800');
    });

    it('should return bronze badge for rank 3', () => {
      const result = getRankBadgeClasses(3);

      expect(result).toContain('from-orange-400');
      expect(result).toContain('to-amber-500');
      expect(result).toContain('text-orange-900');
    });

    it('should return default badge for rank 4+', () => {
      const result = getRankBadgeClasses(4);

      expect(result).toContain('bg-slate-100');
      expect(result).toContain('dark:bg-slate-700');
      expect(result).toContain('text-slate-700');
    });

    it('should return default badge for rank 100', () => {
      const result = getRankBadgeClasses(100);

      expect(result).toContain('bg-slate-100');
      expect(result).toContain('text-slate-700');
    });
  });

  describe('Edge cases', () => {
    it('should handle rank 0', () => {
      const rowClasses = getRankRowClasses(0, false);
      const badgeClasses = getRankBadgeClasses(0);

      expect(rowClasses).toContain('bg-white/90');
      expect(badgeClasses).toContain('bg-slate-100');
    });

    it('should handle negative rank', () => {
      const rowClasses = getRankRowClasses(-1, false);
      const badgeClasses = getRankBadgeClasses(-1);

      expect(rowClasses).toContain('bg-white/90');
      expect(badgeClasses).toContain('bg-slate-100');
    });
  });
});
