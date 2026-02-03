/**
 * Test: Daily Challenge Word Hunt minimum length validation
 *
 * User Request: "make sure all the daily challenge word hunt will be only 4 letters at least.
 * right now it let it take 3 letters (except japanese)"
 *
 * Expected Behavior:
 * - Word hunt answers must be 4+ letters for en/he/sv/es
 * - Japanese (ja) remains at 2+ letters (kanji compounds are shorter)
 */

import { MIN_ANSWER_LENGTH } from '../buzz/constants';

describe('Word Hunt Minimum Length Requirements', () => {
  it('should require 4+ letters for English word hunt', () => {
    expect(MIN_ANSWER_LENGTH.en).toBeGreaterThanOrEqual(4);
  });

  it('should require 4+ letters for Hebrew word hunt', () => {
    expect(MIN_ANSWER_LENGTH.he).toBeGreaterThanOrEqual(4);
  });

  it('should require 4+ letters for Swedish word hunt', () => {
    expect(MIN_ANSWER_LENGTH.sv).toBeGreaterThanOrEqual(4);
  });

  it('should require 4+ letters for Spanish word hunt', () => {
    expect(MIN_ANSWER_LENGTH.es).toBeGreaterThanOrEqual(4);
  });

  it('should allow 2+ letters for Japanese word hunt (kanji exception)', () => {
    // Japanese kanji compounds are typically 2-4 characters, so 2 is acceptable
    expect(MIN_ANSWER_LENGTH.ja).toBe(2);
  });
});
