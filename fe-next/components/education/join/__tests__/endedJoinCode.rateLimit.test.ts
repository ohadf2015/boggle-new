import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockLookup, mockLimit, mockHeaders } = vi.hoisted(() => ({
  mockLookup: vi.fn(),
  mockLimit: vi.fn(),
  mockHeaders: vi.fn(),
}));
vi.mock('@/app/api/education/classroom/join/endedSessionCode', () => ({
  lookupEndedClassroomSession: mockLookup,
  readEndedClassroomSession: mockLookup,
}));
vi.mock('@/backend/redis/rateLimit', () => ({
  checkRateLimitRedis: mockLimit,
  RATE_LIMIT_KEYS: { api: (k: string) => `api:${k}` },
}));
vi.mock('next/headers', () => ({ headers: mockHeaders }));

import { isEndedJoinCode, endedJoinCodeStatus } from '../endedJoinCode';

describe('isEndedJoinCode rate limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.mockResolvedValue(new Headers({ 'x-forwarded-for': '9.9.9.9, 1.1.1.1' }));
    mockLookup.mockResolvedValue({ classroomId: 'c1' });
  });

  it('GIVEN an ip over the limit THEN the lookup never runs and the answer is false', async () => {
    mockLimit.mockResolvedValue({ limited: true, remaining: 0, resetTime: 0 });
    await expect(isEndedJoinCode('ABC123')).resolves.toBe(false);
    expect(mockLookup).not.toHaveBeenCalled();
    expect(mockLimit).toHaveBeenCalledWith('api:ended-code:9.9.9.9', expect.objectContaining({ maxRequests: expect.any(Number) }));
  });

  it('GIVEN an ip over the limit THEN the status says unverified, so callers never read it as a typo', async () => {
    mockLimit.mockResolvedValue({ limited: true, remaining: 0, resetTime: 0 });
    await expect(endedJoinCodeStatus('ABC123')).resolves.toBe('unverified');
  });

  it('GIVEN no ended session behind the code THEN the status is not_ended', async () => {
    mockLimit.mockResolvedValue({ limited: false, remaining: 5, resetTime: 0 });
    mockLookup.mockResolvedValue(null);
    await expect(endedJoinCodeStatus('ABC123')).resolves.toBe('not_ended');
  });

  it('GIVEN an ip under the limit THEN the lookup answers', async () => {
    mockLimit.mockResolvedValue({ limited: false, remaining: 5, resetTime: 0 });
    await expect(isEndedJoinCode('ABC123')).resolves.toBe(true);
  });

  it('GIVEN the ended record cannot be read THEN the status is unverified, not not_ended', async () => {
    mockLimit.mockResolvedValue({ limited: false, remaining: 1, resetTime: 0 });
    mockLookup.mockRejectedValue(new Error('redis timeout'));
    await expect(endedJoinCodeStatus('ABC123')).resolves.toBe('unverified');
  });
});
