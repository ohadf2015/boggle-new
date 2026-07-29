import {
  calculateWagerPayout,
  getMaxWager,
  isWagerAvailable,
} from '../wagerCalculator';

describe('wagerCalculator', () => {
  describe('calculateWagerPayout', () => {
    it('returns 3x wager on win', () => {
      expect(calculateWagerPayout(50, true)).toBe(150);
    });

    it('returns 0 on loss', () => {
      expect(calculateWagerPayout(50, false)).toBe(0);
    });

    it('returns 0 for zero wager regardless of outcome', () => {
      expect(calculateWagerPayout(0, true)).toBe(0);
      expect(calculateWagerPayout(0, false)).toBe(0);
    });

    it('handles small wager amounts', () => {
      expect(calculateWagerPayout(10, true)).toBe(30);
    });

    it('handles max wager amount', () => {
      expect(calculateWagerPayout(100, true)).toBe(300);
    });
  });

  describe('getMaxWager', () => {
    it('returns currentCoins when under 100', () => {
      expect(getMaxWager(50)).toBe(50);
    });

    it('caps at 100 when player has more', () => {
      expect(getMaxWager(500)).toBe(100);
    });

    it('returns 0 when player has no coins', () => {
      expect(getMaxWager(0)).toBe(0);
    });

    it('returns exact amount when player has exactly 100', () => {
      expect(getMaxWager(100)).toBe(100);
    });
  });

  describe('isWagerAvailable', () => {
    it('returns false for streak 0', () => {
      expect(isWagerAvailable(0)).toBe(false);
    });

    it('returns false for streak 1', () => {
      expect(isWagerAvailable(1)).toBe(false);
    });

    it('returns true for streak 2', () => {
      expect(isWagerAvailable(2)).toBe(true);
    });

    it('returns true for streak 5', () => {
      expect(isWagerAvailable(5)).toBe(true);
    });
  });
});
