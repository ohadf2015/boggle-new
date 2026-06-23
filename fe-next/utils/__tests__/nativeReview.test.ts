import { describe, it, expect } from 'vitest';
import { shouldRequestReviewAfterWin, REVIEW_WIN_THRESHOLD, REVIEW_THROTTLE_MS } from '../nativeReview';

const NOW = 1_700_000_000_000;

describe('shouldRequestReviewAfterWin', () => {
  it('does not prompt before the win threshold (too early = annoying)', () => {
    expect(shouldRequestReviewAfterWin({ winCount: 1, lastPromptedAtMs: null, nowMs: NOW })).toBe(false);
    expect(REVIEW_WIN_THRESHOLD).toBeGreaterThanOrEqual(2);
  });

  it('prompts at the threshold win when never prompted before', () => {
    expect(
      shouldRequestReviewAfterWin({ winCount: REVIEW_WIN_THRESHOLD, lastPromptedAtMs: null, nowMs: NOW })
    ).toBe(true);
  });

  it('stays quiet inside the throttle window', () => {
    const recent = NOW - (REVIEW_THROTTLE_MS - 1);
    expect(shouldRequestReviewAfterWin({ winCount: 5, lastPromptedAtMs: recent, nowMs: NOW })).toBe(false);
  });

  it('prompts again once the throttle window has elapsed', () => {
    const old = NOW - REVIEW_THROTTLE_MS;
    expect(shouldRequestReviewAfterWin({ winCount: 5, lastPromptedAtMs: old, nowMs: NOW })).toBe(true);
  });
});
