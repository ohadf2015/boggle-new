/**
 * ronPrank tests
 *
 * Harmless, display-only prank: one specific player (Ron) sees a fake
 * "+1,000,000" bonus chip on the daily challenge results. These tests pin down
 * WHO is targeted and that nobody else is — the prank must never leak to other
 * players, and it must never touch real scoring.
 */
import { describe, it, expect } from 'vitest';
import {
  RON_PRANK_USER_ID,
  RON_PRANK_BONUS_POINTS,
  isRonPrankUser,
} from '../ronPrank';

describe('ronPrank', () => {
  describe('isRonPrankUser', () => {
    it('returns true for Ron’s exact user id', () => {
      // Given Ron's user id, When we check it, Then it is the prank target.
      expect(isRonPrankUser(RON_PRANK_USER_ID)).toBe(true);
    });

    it('returns false for any other user id', () => {
      expect(isRonPrankUser('some-other-user-id')).toBe(false);
    });

    it('returns false for null/undefined/empty (guests, unknown)', () => {
      expect(isRonPrankUser(null)).toBe(false);
      expect(isRonPrankUser(undefined)).toBe(false);
      expect(isRonPrankUser('')).toBe(false);
    });
  });

  describe('bonus points constant', () => {
    it('is a large, obviously-a-joke number', () => {
      expect(RON_PRANK_BONUS_POINTS).toBe(1_000_000);
    });
  });
});
