import { describe, it, expect, vi, beforeEach } from 'vitest';

const { rateLimiterShutdown, apiRateLimiterShutdown, spamDetectorShutdown } = vi.hoisted(() => ({
  rateLimiterShutdown: vi.fn(),
  apiRateLimiterShutdown: vi.fn(),
  spamDetectorShutdown: vi.fn(),
}));

vi.mock('../utils/rateLimiter', () => ({
  rateLimiterInstance: { shutdown: rateLimiterShutdown },
}));
vi.mock('../utils/apiRateLimiter', () => ({
  shutdownApiRateLimiter: apiRateLimiterShutdown,
}));
vi.mock('../modules/spamDetector', () => ({
  spamDetector: { shutdown: spamDetectorShutdown },
}));
vi.mock('../../server/logger', () => ({
  lifecycleLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { shutdownInMemorySingletons } from '../../server/shutdownSingletons';

describe('shutdownInMemorySingletons', () => {
  beforeEach(() => {
    rateLimiterShutdown.mockReset();
    apiRateLimiterShutdown.mockReset();
    spamDetectorShutdown.mockReset();
  });

  it('tears down rate limiter, api rate limiter, and spam detector', () => {
    shutdownInMemorySingletons();
    expect(rateLimiterShutdown).toHaveBeenCalledOnce();
    expect(apiRateLimiterShutdown).toHaveBeenCalledOnce();
    expect(spamDetectorShutdown).toHaveBeenCalledOnce();
  });

  it('continues if a shutdown throws', () => {
    rateLimiterShutdown.mockImplementation(() => { throw new Error('boom'); });
    expect(() => shutdownInMemorySingletons()).not.toThrow();
    expect(apiRateLimiterShutdown).toHaveBeenCalledOnce();
    expect(spamDetectorShutdown).toHaveBeenCalledOnce();
  });
});
