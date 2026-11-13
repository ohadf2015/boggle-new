import { describe, it, expect, vi, beforeEach } from 'vitest';

const capture = vi.fn();
const requestReview = vi.fn();
let android = true;

vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: (...a: unknown[]) => capture(...a) } }));
vi.mock('@/utils/platform', () => ({ isAndroid: () => android }));
vi.mock('@capacitor-community/in-app-review', () => ({ InAppReview: { requestReview: () => requestReview() } }));

import {
  shouldRequestReviewAfterWin,
  maybeRequestReviewAfterWin,
  REVIEW_WIN_THRESHOLD,
  REVIEW_THROTTLE_MS,
} from '../nativeReview';

const NOW = 1_700_000_000_000;

describe('shouldRequestReviewAfterWin', () => {
  it('prompts on the first win when never prompted before', () => {
    expect(REVIEW_WIN_THRESHOLD).toBe(1);
    expect(shouldRequestReviewAfterWin({ winCount: 1, lastPromptedAtMs: null, nowMs: NOW })).toBe(true);
  });

  it('does not prompt before any win', () => {
    expect(shouldRequestReviewAfterWin({ winCount: 0, lastPromptedAtMs: null, nowMs: NOW })).toBe(false);
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

describe('maybeRequestReviewAfterWin', () => {
  beforeEach(() => {
    localStorage.clear();
    capture.mockReset();
    requestReview.mockReset();
    android = true;
  });

  it('records that the review sheet was requested and that the request completed', async () => {
    requestReview.mockResolvedValue(undefined);
    await maybeRequestReviewAfterWin();
    expect(requestReview).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('native_review_requested', { win_count: 1 });
    expect(capture).toHaveBeenCalledWith('native_review_completed', { win_count: 1 });
  });

  it('records a failed request instead of only logging it', async () => {
    requestReview.mockRejectedValue(new Error('plugin not implemented'));
    await maybeRequestReviewAfterWin();
    expect(capture).toHaveBeenCalledWith('native_review_failed', { win_count: 1, error: 'plugin not implemented' });
  });

  it('does nothing off Android', async () => {
    android = false;
    await maybeRequestReviewAfterWin();
    expect(requestReview).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it('does not ask twice inside the throttle window', async () => {
    requestReview.mockResolvedValue(undefined);
    await maybeRequestReviewAfterWin();
    await maybeRequestReviewAfterWin();
    expect(requestReview).toHaveBeenCalledTimes(1);
  });
});
