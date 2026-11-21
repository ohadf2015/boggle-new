import { describe, expect, it, vi } from 'vitest';

const { mockLoggerError } = vi.hoisted(() => ({ mockLoggerError: vi.fn() }));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: mockLoggerError, info: vi.fn() },
}));

import { grantPracticeRewards } from '../practiceRewards';

describe('grantPracticeRewards', () => {
  it('GIVEN the streak write throws WHEN rewards are granted THEN it resolves with no streak and logs instead of failing the round', async () => {
    const admin = { from: () => { throw new Error('boom'); } };
    const result = await grantPracticeRewards({
      getAdmin: () => admin as never,
      awardState: null,
      studentId: 'S1',
      lessonId: 'L1',
      xp: 30,
      streak: { current: 2, longest: 2 },
    });
    expect(result).toEqual({ newAwards: null, practiceStreak: null });
    expect(mockLoggerError).toHaveBeenCalled();
  });
});
