import { vi, type Mock, type MockInstance } from 'vitest';
import { checkSocketRateLimit, checkConnectionRateLimit, httpRateLimitMiddleware } from '../middleware/rateLimiterRedis';

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
      // connection limit is 20/min per config
      for (let i = 0; i < 20; i++) {
        await checkConnectionRateLimit(ip);
      }
      const result = await checkConnectionRateLimit(ip);
      expect(result).toBe(false);
    });
  });

  describe('httpRateLimitMiddleware', () => {
    it('creates a middleware function', () => {
      const middleware = httpRateLimitMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('allows requests within limit and sets headers', async () => {
      const middleware = httpRateLimitMiddleware();
      const req = { ip: 'test-http-ip', headers: {} };
      const headers: Record<string, unknown> = {};
      const res = {
        setHeader: (k: string, v: unknown) => { headers[k] = v; },
        status: () => res,
        json: () => {},
      };
      const next = vi.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(headers['RateLimit-Limit']).toBe(100);
      expect(headers['RateLimit-Remaining']).toBeGreaterThanOrEqual(0);
    });
  });
});
