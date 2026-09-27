/**
 * The homework endpoints are rate-limited PER IP, and a class shares one IP.
 *
 * Found live on 2026-09-12: finishing the homework twice in a test session
 * returned 429 from `/api/education/miss-gap/complete` and the student saw
 * "couldn't save" on the finish screen. The limit was 20 requests / 60s keyed
 * on `${ip}:${endpoint}` — which is the whole school behind one NAT, not one
 * student. A period where 30 students finish is 30 completions from ONE ip.
 *
 * Worse than the 429: `lib/apiRateLimit.ts` blocks an IP for five minutes once
 * a window goes past `maxRequests * 2`, and that block applies to every API
 * route. An honest class finishing its homework could lock the school out of
 * the app. So the budget is sized off a class, with room for the replay button.
 */
import { describe, it, expect } from 'vitest';
import {
  MISS_GAP_MAX_CLASS_SIZE,
  MISS_GAP_COMPLETE_RATE_LIMIT,
  MISS_GAP_PROGRESS_RATE_LIMIT,
  IP_BLOCK_MULTIPLIER,
} from '../missGapRateLimits';

describe('miss-gap rate limits', () => {
  it('a full class finishing inside one window is never rate-limited', () => {
    expect(MISS_GAP_MAX_CLASS_SIZE).toBeGreaterThanOrEqual(30);
    expect(MISS_GAP_COMPLETE_RATE_LIMIT.maxRequests).toBeGreaterThanOrEqual(
      MISS_GAP_MAX_CLASS_SIZE,
    );
  });

  /**
   * The finish screen posts the run and then reads the roster, so every student
   * spends one progress request too — on top of the teacher's own card.
   */
  it('leaves room for the progress read each completion triggers', () => {
    expect(MISS_GAP_PROGRESS_RATE_LIMIT.maxRequests).toBeGreaterThanOrEqual(
      MISS_GAP_COMPLETE_RATE_LIMIT.maxRequests,
    );
  });

  /**
   * The five-minute IP block is the real hazard: it is app-wide, not endpoint
   * scoped. Doubling the class-size budget keeps an honest class two full
   * classes away from the block threshold even if every student replays.
   */
  it('keeps an honest class clear of the app-wide IP block', () => {
    const blockAt = MISS_GAP_COMPLETE_RATE_LIMIT.maxRequests * IP_BLOCK_MULTIPLIER;
    const classWithReplays = MISS_GAP_MAX_CLASS_SIZE * 2;
    expect(classWithReplays).toBeLessThan(blockAt);
    expect(MISS_GAP_COMPLETE_RATE_LIMIT.maxRequests).toBeGreaterThanOrEqual(
      MISS_GAP_MAX_CLASS_SIZE * 2,
    );
  });

  it('still bounds a single minute — this is a limit, not an open door', () => {
    expect(MISS_GAP_COMPLETE_RATE_LIMIT.windowMs).toBe(60_000);
    expect(MISS_GAP_COMPLETE_RATE_LIMIT.maxRequests).toBeLessThanOrEqual(600);
    expect(MISS_GAP_PROGRESS_RATE_LIMIT.maxRequests).toBeLessThanOrEqual(600);
  });
});
