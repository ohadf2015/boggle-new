/**
 * Social Gifting Rules
 * Pure utility functions for gift validation and calculation.
 */

export const DAILY_GIFT_LIMIT = 3;

export type GiftType = 'hints' | 'streak_freeze' | 'coins';

export interface GiftTypeConfig {
  cost: number;
  minAmount?: number;
  maxAmount?: number;
}

export const GIFT_TYPES: Record<GiftType, GiftTypeConfig> = {
  hints: { cost: 10 },
  streak_freeze: { cost: 25 },
  coins: { cost: 0, minAmount: 5, maxAmount: 50 },
};

export interface GiftPayload {
  type: GiftType;
  amount?: number;
}

export interface GiftValidation {
  valid: boolean;
  error?: string;
}

const XP_PER_GIFT = 5;

export function canSendGift(giftsToday: number): boolean {
  return giftsToday < DAILY_GIFT_LIMIT;
}

export function calculateGiftXP(_giftType: GiftType): number {
  return XP_PER_GIFT;
}

export function validateGift(gift: GiftPayload, senderBalance: number): GiftValidation {
  const config = GIFT_TYPES[gift.type];
  if (!config) {
    return { valid: false, error: 'Unknown gift type' };
  }

  if (gift.type === 'coins') {
    if (!gift.amount) {
      return { valid: false, error: 'Coin gift requires an amount' };
    }
    if (gift.amount < config.minAmount!) {
      return { valid: false, error: `Minimum amount is ${config.minAmount!} coins` };
    }
    if (gift.amount > config.maxAmount!) {
      return { valid: false, error: `Maximum amount is ${config.maxAmount!} coins` };
    }
    if (senderBalance < gift.amount) {
      return { valid: false, error: 'Insufficient balance' };
    }
    return { valid: true };
  }

  if (senderBalance < config.cost) {
    return { valid: false, error: 'Insufficient balance' };
  }

  return { valid: true };
}
