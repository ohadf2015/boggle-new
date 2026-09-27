/**
 * Header Gift Navigation Tests
 *
 * Tests the gift modal navigation logic:
 * - After claiming one gift, should show next unclaimed gift
 * - When all gifts claimed, modal should close
 */

import React from 'react';

// Test the pure logic of handleDismissGiftModal
describe('Header Gift Modal Navigation Logic', () => {
  interface GiftMessage {
    id: string;
    title: string;
    claimed: boolean;
  }

  /**
   * Simulates the handleDismissGiftModal logic from Header.tsx
   */
  function getNextGiftAction(
    gifts: GiftMessage[],
    selectedGiftId: string | null
  ): { action: 'showNext'; gift: GiftMessage } | { action: 'close' } {
    const nextUnclaimedGift = gifts.find((g) => !g.claimed && g.id !== selectedGiftId);

    if (nextUnclaimedGift) {
      return { action: 'showNext', gift: nextUnclaimedGift };
    } else {
      return { action: 'close' };
    }
  }

  describe('Multiple unclaimed gifts', () => {
    const multipleGifts: GiftMessage[] = [
      { id: 'gift-1', title: 'First Gift', claimed: false },
      { id: 'gift-2', title: 'Second Gift', claimed: false },
      { id: 'gift-3', title: 'Third Gift', claimed: false },
    ];

    it('should show second gift after claiming first', () => {
      // After claiming gift-1, it gets marked as claimed
      const giftsAfterClaim = multipleGifts.map((g) =>
        g.id === 'gift-1' ? { ...g, claimed: true } : g
      );

      const result = getNextGiftAction(giftsAfterClaim, 'gift-1');

      expect(result.action).toBe('showNext');
      if (result.action === 'showNext') {
        expect(result.gift.id).toBe('gift-2');
        expect(result.gift.title).toBe('Second Gift');
      }
    });

    it('should show third gift after claiming second (when first is already claimed)', () => {
      const giftsAfterClaims = multipleGifts.map((g) =>
        g.id === 'gift-1' || g.id === 'gift-2' ? { ...g, claimed: true } : g
      );

      const result = getNextGiftAction(giftsAfterClaims, 'gift-2');

      expect(result.action).toBe('showNext');
      if (result.action === 'showNext') {
        expect(result.gift.id).toBe('gift-3');
        expect(result.gift.title).toBe('Third Gift');
      }
    });

    it('should close modal after claiming last unclaimed gift', () => {
      const allClaimed = multipleGifts.map((g) => ({ ...g, claimed: true }));

      const result = getNextGiftAction(allClaimed, 'gift-3');

      expect(result.action).toBe('close');
    });
  });

  describe('Single unclaimed gift', () => {
    const singleGift: GiftMessage[] = [{ id: 'gift-1', title: 'Only Gift', claimed: false }];

    it('should close modal after claiming the only gift', () => {
      const giftClaimed = [{ ...singleGift[0], claimed: true }];

      const result = getNextGiftAction(giftClaimed, 'gift-1');

      expect(result.action).toBe('close');
    });
  });

  describe('Mixed claimed/unclaimed gifts', () => {
    it('should find next unclaimed gift skipping already claimed ones', () => {
      const mixedGifts: GiftMessage[] = [
        { id: 'gift-1', title: 'First', claimed: true },
        { id: 'gift-2', title: 'Second', claimed: true },
        { id: 'gift-3', title: 'Third', claimed: false }, // User just claimed this
        { id: 'gift-4', title: 'Fourth', claimed: false }, // This should be next
      ];

      const giftsAfterClaim = mixedGifts.map((g) =>
        g.id === 'gift-3' ? { ...g, claimed: true } : g
      );

      const result = getNextGiftAction(giftsAfterClaim, 'gift-3');

      expect(result.action).toBe('showNext');
      if (result.action === 'showNext') {
        expect(result.gift.id).toBe('gift-4');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty gifts array', () => {
      const result = getNextGiftAction([], null);
      expect(result.action).toBe('close');
    });

    it('should handle null selectedGiftId', () => {
      const gifts: GiftMessage[] = [
        { id: 'gift-1', title: 'First', claimed: false },
      ];

      const result = getNextGiftAction(gifts, null);

      expect(result.action).toBe('showNext');
      if (result.action === 'showNext') {
        expect(result.gift.id).toBe('gift-1');
      }
    });
  });
});
