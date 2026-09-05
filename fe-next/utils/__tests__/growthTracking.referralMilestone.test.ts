/**
 * The last link in the referral chain: friend clicks the link → claims the code
 * → plays their first game → the referrer actually gets paid.
 *
 * `POST /api/referral/milestone` grants that reward and had never been called by
 * anything (0 reward rows, ever). `markFirstGameActivation` is the one place that
 * already detects "this device's first ever game", exactly once, so it is where
 * the call belongs.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const postMock = vi.fn();
vi.mock('@/utils/authFetch', () => ({
  postWithAuth: (...args: unknown[]) => postMock(...args),
}));

import { markFirstGameActivation } from '@/utils/growthTracking';

const args = { won: false, score: 120, wordCount: 8, mode: 'classic' };

describe('markFirstGameActivation → referral milestone', () => {
  beforeEach(() => {
    localStorage.clear();
    postMock.mockReset();
    postMock.mockResolvedValue({ ok: true, status: 200 } as Response);
  });

  it('reports the first-game milestone so the referrer gets their reward', () => {
    markFirstGameActivation(args);

    expect(postMock).toHaveBeenCalledWith(
      '/api/referral/milestone',
      {
        milestone: 'first_game_played',
        metadata: { totalScore: 120 },
      },
      { requireSession: true }
    );
  });

  it('fires only on the genuine first game, never again on this device', () => {
    markFirstGameActivation(args);
    markFirstGameActivation({ ...args, score: 300 });
    markFirstGameActivation({ ...args, score: 400 });

    expect(postMock).toHaveBeenCalledTimes(1);
  });

  it('never lets a failed report break the end-of-game path', () => {
    postMock.mockRejectedValue(new Error('offline'));

    expect(() => markFirstGameActivation(args)).not.toThrow();
  });
});
