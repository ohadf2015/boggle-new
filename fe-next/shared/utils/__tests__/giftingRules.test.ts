import {
  DAILY_GIFT_LIMIT,
  GIFT_TYPES,
  canSendGift,
  calculateGiftXP,
  validateGift,
  GiftType,
} from '../giftingRules';

describe('giftingRules', () => {
  describe('constants', () => {
    test('DAILY_GIFT_LIMIT should be 3', () => {
      expect(DAILY_GIFT_LIMIT).toBe(3);
    });

    test('GIFT_TYPES should have hints, streak_freeze, and coins', () => {
      expect(GIFT_TYPES.hints).toBeDefined();
      expect(GIFT_TYPES.hints.cost).toBe(10);
      expect(GIFT_TYPES.streak_freeze).toBeDefined();
      expect(GIFT_TYPES.streak_freeze.cost).toBe(25);
      expect(GIFT_TYPES.coins).toBeDefined();
      expect(GIFT_TYPES.coins.minAmount).toBe(5);
      expect(GIFT_TYPES.coins.maxAmount).toBe(50);
    });
  });

  describe('canSendGift', () => {
    test('should return true when giftsToday < limit', () => {
      expect(canSendGift(0)).toBe(true);
      expect(canSendGift(1)).toBe(true);
      expect(canSendGift(2)).toBe(true);
    });

    test('should return false when giftsToday >= limit', () => {
      expect(canSendGift(3)).toBe(false);
      expect(canSendGift(5)).toBe(false);
    });
  });

  describe('calculateGiftXP', () => {
    test('should return 5 XP for any gift type', () => {
      expect(calculateGiftXP('hints')).toBe(5);
      expect(calculateGiftXP('streak_freeze')).toBe(5);
      expect(calculateGiftXP('coins')).toBe(5);
    });
  });

  describe('validateGift', () => {
    test('should validate hints gift with sufficient balance', () => {
      const result = validateGift({ type: 'hints' }, 100);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject hints gift with insufficient balance', () => {
      const result = validateGift({ type: 'hints' }, 5);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should validate streak_freeze gift with sufficient balance', () => {
      const result = validateGift({ type: 'streak_freeze' }, 30);
      expect(result.valid).toBe(true);
    });

    test('should reject streak_freeze gift with insufficient balance', () => {
      const result = validateGift({ type: 'streak_freeze' }, 20);
      expect(result.valid).toBe(false);
    });

    test('should validate coins gift with valid amount', () => {
      const result = validateGift({ type: 'coins', amount: 25 }, 100);
      expect(result.valid).toBe(true);
    });

    test('should reject coins gift below minimum amount', () => {
      const result = validateGift({ type: 'coins', amount: 3 }, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('5');
    });

    test('should reject coins gift above maximum amount', () => {
      const result = validateGift({ type: 'coins', amount: 60 }, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('50');
    });

    test('should reject coins gift with insufficient balance', () => {
      const result = validateGift({ type: 'coins', amount: 30 }, 20);
      expect(result.valid).toBe(false);
    });

    test('should reject coins gift without amount', () => {
      const result = validateGift({ type: 'coins' }, 100);
      expect(result.valid).toBe(false);
    });

    test('should reject unknown gift type', () => {
      const result = validateGift({ type: 'unknown' as GiftType }, 100);
      expect(result.valid).toBe(false);
    });
  });
});
