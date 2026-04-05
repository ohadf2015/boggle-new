/**
 * UGC Content Moderation - Unit Tests
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import { validateUgcText, shouldAutoFlag, getReportReasons, ModerationStatus } from '../ugcModeration';

vi.mock('../../utils/profanityFilter', () => ({
  isProfane: vi.fn((text: string) => text?.toLowerCase().includes('badword')),
}));

describe('ugcModeration', () => {
  describe('validateUgcText', () => {
    it('returns valid for clean text within limits', () => {
      const result = validateUgcText('hello world', 'title', 100);
      expect(result).toEqual({ valid: true });
    });

    it('returns profanity error for profane text', () => {
      const result = validateUgcText('this is badword', 'title', 100);
      expect(result).toEqual({ valid: false, error: 'profanity', field: 'title' });
    });

    it('returns too_long error when exceeding maxLength', () => {
      const result = validateUgcText('a'.repeat(101), 'title', 100);
      expect(result).toEqual({ valid: false, error: 'too_long', field: 'title' });
    });

    it('returns empty error for empty string', () => {
      expect(validateUgcText('', 'title', 100)).toEqual({ valid: false, error: 'empty', field: 'title' });
    });

    it('returns empty error for null', () => {
      expect(validateUgcText(null, 'title', 100)).toEqual({ valid: false, error: 'empty', field: 'title' });
    });

    it('returns empty error for undefined', () => {
      expect(validateUgcText(undefined, 'title', 100)).toEqual({ valid: false, error: 'empty', field: 'title' });
    });

    it('returns empty error for whitespace-only', () => {
      expect(validateUgcText('   ', 'title', 100)).toEqual({ valid: false, error: 'empty', field: 'title' });
    });

    it('returns too_short error for text under 3 chars', () => {
      expect(validateUgcText('ab', 'name', 100)).toEqual({ valid: false, error: 'too_short', field: 'name' });
    });
  });

  describe('ModerationStatus type', () => {
    it('accepts valid statuses', () => {
      const statuses: ModerationStatus[] = ['pending', 'approved', 'rejected', 'flagged'];
      expect(statuses).toHaveLength(4);
    });
  });

  describe('shouldAutoFlag', () => {
    it('returns false when reportCount < 3', () => {
      expect(shouldAutoFlag(0)).toBe(false);
      expect(shouldAutoFlag(1)).toBe(false);
      expect(shouldAutoFlag(2)).toBe(false);
    });

    it('returns true when reportCount >= 3', () => {
      expect(shouldAutoFlag(3)).toBe(true);
      expect(shouldAutoFlag(5)).toBe(true);
    });
  });

  describe('getReportReasons', () => {
    it('returns the 4 report reasons', () => {
      expect(getReportReasons()).toEqual(['inappropriate', 'spam', 'unplayable', 'offensive']);
    });

    it('returns a new array each time', () => {
      const a = getReportReasons();
      const b = getReportReasons();
      expect(a).not.toBe(b);
    });
  });
});
