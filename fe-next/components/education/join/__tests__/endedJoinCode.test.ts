import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockLookup } = vi.hoisted(() => ({ mockLookup: vi.fn() }));
vi.mock('@/app/api/education/classroom/join/endedSessionCode', () => ({
  lookupEndedClassroomSession: mockLookup,
}));

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/backend/redis/rateLimit', () => ({
  checkRateLimitRedis: async () => ({ limited: false, remaining: 1, resetTime: 0 }),
  RATE_LIMIT_KEYS: { api: (k: string) => k },
}));

import { isEndedJoinCode } from '../endedJoinCode';

describe('isEndedJoinCode', () => {
  beforeEach(() => mockLookup.mockReset());

  it('GIVEN an ended session record THEN the code is ended, without naming the class', async () => {
    mockLookup.mockResolvedValue({ classroomId: 'c1' });
    await expect(isEndedJoinCode('abc123')).resolves.toBe(true);
    expect(mockLookup).toHaveBeenCalledWith('ABC123');
  });

  it('GIVEN no ended record THEN the code is not ended', async () => {
    mockLookup.mockResolvedValue(null);
    await expect(isEndedJoinCode('ABC123')).resolves.toBe(false);
  });

  it('GIVEN a malformed code THEN redis is never asked', async () => {
    await expect(isEndedJoinCode('AB*')).resolves.toBe(false);
    expect(mockLookup).not.toHaveBeenCalled();
  });
});
