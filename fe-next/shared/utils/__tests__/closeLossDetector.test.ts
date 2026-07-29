import { isCloseLoss, getCloseLossMessage } from '../closeLossDetector';

describe('closeLossDetector', () => {
  describe('isCloseLoss', () => {
    it('should return true when score difference is within threshold', () => {
      // Player: 85, Opponent: 100 → diff = 15% → exactly at threshold
      expect(isCloseLoss(85, 100)).toBe(true);
    });

    it('should return true when loss is very close', () => {
      // Player: 98, Opponent: 100 → 2% diff
      expect(isCloseLoss(98, 100)).toBe(true);
    });

    it('should return false when player won', () => {
      expect(isCloseLoss(100, 85)).toBe(false);
    });

    it('should return false when scores are tied', () => {
      expect(isCloseLoss(100, 100)).toBe(false);
    });

    it('should return false when loss is not close', () => {
      // Player: 50, Opponent: 100 → 50% diff
      expect(isCloseLoss(50, 100)).toBe(false);
    });

    it('should use custom threshold', () => {
      // Player: 80, Opponent: 100 → 20% diff
      expect(isCloseLoss(80, 100, 0.25)).toBe(true); // within 25%
      expect(isCloseLoss(80, 100, 0.15)).toBe(false); // outside 15%
    });

    it('should handle zero scores', () => {
      expect(isCloseLoss(0, 0)).toBe(false);
      expect(isCloseLoss(0, 10)).toBe(false); // 100% diff
    });

    it('should handle very small scores', () => {
      expect(isCloseLoss(9, 10)).toBe(true); // 10% diff
    });
  });

  describe('getCloseLossMessage', () => {
    const mockT = (key: string) => {
      const translations: Record<string, string> = {
        'closeLoss.soClose': 'So close!',
        'closeLoss.justPoints': 'Just {points} points away!',
        'closeLoss.rematchQuestion': 'Rematch?',
        'closeLoss.almostHadIt': 'You almost had it!',
        'closeLoss.nailBiter': 'What a nail-biter!',
      };
      return translations[key] || key;
    };

    it('should return a message with point difference', () => {
      const message = getCloseLossMessage(5, mockT);
      expect(message).toContain('5');
    });

    it('should handle single point difference', () => {
      const message = getCloseLossMessage(1, mockT);
      expect(message).toContain('1');
    });

    it('should handle larger differences', () => {
      const message = getCloseLossMessage(15, mockT);
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });
  });
});
