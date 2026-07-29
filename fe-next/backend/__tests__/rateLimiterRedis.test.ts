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
      const req = { ip: 'test-http-ip', method: 'POST', path: '/api/scores/sync', headers: {} };
      const headers: Record<string, unknown> = {};
      const res = {
        setHeader: (k: string, v: unknown) => { headers[k] = v; },
        status: () => res,
        json: () => {},
      };
      const next = vi.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(headers['RateLimit-Limit']).toBe(600);
      expect(headers['RateLimit-Remaining']).toBeGreaterThanOrEqual(0);
    });

    it('skips limiter on idempotent leaderboard GETs', async () => {
      const middleware = httpRateLimitMiddleware();
      const paths = [
        '/api/daily-challenge/word-hunt/leaderboard/2026-05-14/en',
        '/api/daily-challenge/word-hunt/alltime-leaderboard/en',
        '/api/daily-challenge/word-wheel/leaderboard/2026-05-14/he',
        '/api/daily-challenge/word-wheel/alltime-leaderboard/he',
        '/api/daily-challenge/leaderboard/2026-05-14/en',
        '/api/leaderboard',
        '/api/single-player/leaderboard',
      ];
      for (const path of paths) {
        const req = { method: 'GET', path, headers: {}, ip: 'skip-ip' };
        const headers: Record<string, unknown> = {};
        const res = {
          setHeader: (k: string, v: unknown) => { headers[k] = v; },
          status: () => res,
          json: () => {},
        };
        const next = vi.fn();
        await middleware(req, res, next);
        expect(next).toHaveBeenCalled();
        // Skipped path: no rate-limit headers set
        expect(headers['RateLimit-Limit']).toBeUndefined();
      }
    });

    it('does NOT skip POST on a leaderboard path', async () => {
      const middleware = httpRateLimitMiddleware();
      const req = { method: 'POST', path: '/api/daily-challenge/word-hunt/leaderboard/2026-05-14/en', headers: {}, ip: 'post-ip' };
      const headers: Record<string, unknown> = {};
      const res = {
        setHeader: (k: string, v: unknown) => { headers[k] = v; },
        status: () => res,
        json: () => {},
      };
      const next = vi.fn();
      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(headers['RateLimit-Limit']).toBe(600);
    });
  });
});
