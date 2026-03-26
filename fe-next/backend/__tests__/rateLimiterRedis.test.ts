import { checkSocketRateLimit, checkConnectionRateLimit, httpRateLimiter } from '../middleware/rateLimiterRedis';

describe('rateLimiterRedis', () => {
  describe('checkSocketRateLimit', () => {
    it('allows actions within limit', async () => {
      const result = await checkSocketRateLimit('socket-1', 'chatMessage');
      expect(result.allowed).toBe(true);
    });

    it('blocks actions exceeding limit', async () => {
      // chatMessage limit is 3 per second
      for (let i = 0; i < 3; i++) {
        await checkSocketRateLimit('socket-exceed', 'chatMessage');
      }
      const result = await checkSocketRateLimit('socket-exceed', 'chatMessage');
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it('uses default limiter for unknown actions', async () => {
      const result = await checkSocketRateLimit('socket-2', 'unknownAction');
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkConnectionRateLimit', () => {
    it('allows connections within limit', async () => {
      const result = await checkConnectionRateLimit('192.168.1.1');
      expect(result).toBe(true);
    });

    it('blocks excessive connections from same IP', async () => {
      const ip = '10.0.0.99';
      for (let i = 0; i < 5; i++) {
        await checkConnectionRateLimit(ip);
      }
      const result = await checkConnectionRateLimit(ip);
      expect(result).toBe(false);
    });
  });

  describe('httpRateLimiter', () => {
    it('allows requests within limit', async () => {
      const res = await httpRateLimiter.consume('test-ip');
      expect(res.remainingPoints).toBeGreaterThanOrEqual(0);
    });
  });
});
