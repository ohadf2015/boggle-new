/**
 * Rate Limiter Tests
 * Tests for IP-based rate limiting functionality
 */

const { RateLimiter, checkRateLimit, initRateLimit, resetRateLimit, isIpBlocked, getRateLimitStats } = require('../utils/rateLimiter');

describe('RateLimiter', () => {
  let rateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      maxMessages: 5,
      windowMs: 1000,
      ipMaxMessages: 10,
      blockDurationMs: 5000
    });
  });

  afterEach(() => {
    rateLimiter.shutdown();
  });

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const socket = {
        handshake: {
          headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
          address: '127.0.0.1'
        }
      };
      expect(RateLimiter.getClientIp(socket)).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const socket = {
        handshake: {
          headers: { 'x-real-ip': '192.168.1.2' },
          address: '127.0.0.1'
        }
      };
      expect(RateLimiter.getClientIp(socket)).toBe('192.168.1.2');
    });

    it('should extract IP from cf-connecting-ip header (Cloudflare)', () => {
      const socket = {
        handshake: {
          headers: { 'cf-connecting-ip': '192.168.1.3' },
          address: '127.0.0.1'
        }
      };
      expect(RateLimiter.getClientIp(socket)).toBe('192.168.1.3');
    });

    it('should fall back to socket address', () => {
      const socket = {
        handshake: {
          headers: {},
          address: '127.0.0.1'
        }
      };
      expect(RateLimiter.getClientIp(socket)).toBe('127.0.0.1');
    });

    it('should return unknown for invalid socket', () => {
      expect(RateLimiter.getClientIp(null)).toBe('unknown');
      expect(RateLimiter.getClientIp({})).toBe('unknown');
    });
  });

  describe('Socket Rate Limiting', () => {
    it('should allow requests under the limit', () => {
      rateLimiter.initClient('socket1', '192.168.1.1');

      for (let i = 0; i < 5; i++) {
        const result = rateLimiter.isRateLimited('socket1');
        expect(result.limited).toBe(false);
      }
    });

    it('should block requests over the limit', () => {
      rateLimiter.initClient('socket1', '192.168.1.1');

      // Use up the limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.isRateLimited('socket1');
      }

      // Next request should be blocked
      const result = rateLimiter.isRateLimited('socket1');
      expect(result.limited).toBe(true);
      expect(result.reason).toBe('socket_limit');
    });

    it('should reset limit after window expires', async () => {
      rateLimiter.initClient('socket1', '192.168.1.1');

      // Use up the limit
      for (let i = 0; i < 6; i++) {
        rateLimiter.isRateLimited('socket1');
      }

      // Should be blocked
      expect(rateLimiter.isRateLimited('socket1').limited).toBe(true);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be allowed again
      const result = rateLimiter.isRateLimited('socket1');
      expect(result.limited).toBe(false);
    });

    it('should handle weighted requests', () => {
      rateLimiter.initClient('socket1', '192.168.1.1');

      // Single heavy request (weight 4)
      rateLimiter.isRateLimited('socket1', 4);

      // One more should be fine
      expect(rateLimiter.isRateLimited('socket1', 1).limited).toBe(false);

      // But one more should exceed
      expect(rateLimiter.isRateLimited('socket1', 1).limited).toBe(true);
    });
  });

  describe('IP Rate Limiting', () => {
    it('should track rate limits by IP', () => {
      // Two sockets from same IP
      rateLimiter.initClient('socket1', '192.168.1.1');
      rateLimiter.initClient('socket2', '192.168.1.1');

      // Each socket can send 5 messages
      for (let i = 0; i < 5; i++) {
        rateLimiter.isRateLimited('socket1');
        rateLimiter.isRateLimited('socket2');
      }

      // Total IP messages = 10, which is the IP limit
      // Next request should trigger IP block
      const result = rateLimiter.isRateLimited('socket1');
      expect(result.limited).toBe(true);
      expect(result.reason).toBe('ip_limit');
    });

    it('should block IP after exceeding limit', () => {
      rateLimiter.initClient('socket1', '192.168.1.1');

      // Exceed IP limit
      for (let i = 0; i < 11; i++) {
        rateLimiter.isRateLimited('socket1');
      }

      // IP should be blocked
      expect(rateLimiter.isIpBlocked('192.168.1.1')).toBe(true);

      // New socket from same IP should be blocked immediately
      rateLimiter.initClient('socket2', '192.168.1.1');
      const result = rateLimiter.isRateLimited('socket2');
      expect(result.limited).toBe(true);
      expect(result.reason).toBe('ip_blocked');
    });
  });

  describe('Client Management', () => {
    it('should remove client on disconnect', () => {
      rateLimiter.initClient('socket1', '192.168.1.1');
      expect(rateLimiter.getClientStats('socket1')).not.toBeNull();

      rateLimiter.removeClient('socket1');
      expect(rateLimiter.getClientStats('socket1')).toBeNull();
    });

    it('should remove IP tracking when all sockets disconnect', () => {
      rateLimiter.initClient('socket1', '192.168.1.1');
      rateLimiter.initClient('socket2', '192.168.1.1');

      const stats1 = rateLimiter.getStats();
      expect(stats1.trackedIps).toBe(1);

      rateLimiter.removeClient('socket1');
      const stats2 = rateLimiter.getStats();
      expect(stats2.trackedIps).toBe(1); // Still have socket2

      rateLimiter.removeClient('socket2');
      const stats3 = rateLimiter.getStats();
      expect(stats3.trackedIps).toBe(0);
    });

    it('should provide accurate stats', () => {
      rateLimiter.initClient('socket1', '192.168.1.1');
      rateLimiter.initClient('socket2', '192.168.1.2');
      rateLimiter.initClient('socket3', '192.168.1.1');

      const stats = rateLimiter.getStats();
      expect(stats.trackedSockets).toBe(3);
      expect(stats.trackedIps).toBe(2);
      expect(stats.blockedIps).toBe(0);
    });
  });

  describe('Auto-initialization', () => {
    it('should auto-initialize client on first rate check', () => {
      // Don't call initClient
      const result = rateLimiter.isRateLimited('newSocket');
      expect(result.limited).toBe(false);

      // Should now be tracked
      expect(rateLimiter.getClientStats('newSocket')).not.toBeNull();
    });
  });
});

describe('Module Exports', () => {
  it('should export all functions', () => {
    expect(typeof checkRateLimit).toBe('function');
    expect(typeof initRateLimit).toBe('function');
    expect(typeof resetRateLimit).toBe('function');
    expect(typeof isIpBlocked).toBe('function');
    expect(typeof getRateLimitStats).toBe('function');
  });
});
