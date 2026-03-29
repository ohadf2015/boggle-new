import { RateLimiterMemory, RateLimiterRedis, RateLimiterAbstract } from 'rate-limiter-flexible';
import { getRateLimitClient, isRedisAvailable } from '../redis/connection';
import { RATE_LIMITS } from '../config/rateLimits';

import logger from '../utils/logger';

/**
 * Create a rate limiter that uses Redis when available, falling back to in-memory.
 * This ensures rate limits are shared across horizontal replicas.
 */
function createRateLimiter(keyPrefix: string, points: number, duration: number): RateLimiterAbstract {
  const redis = isRedisAvailable() ? getRateLimitClient() : null;
  if (redis) {
    return new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: `rl:${keyPrefix}`,
      points,
      duration,
      insuranceLimiter: new RateLimiterMemory({ keyPrefix, points, duration }),
    });
  }
  logger.warn('RATE_LIMIT', `Redis unavailable, using in-memory limiter for ${keyPrefix}`);
  return new RateLimiterMemory({ keyPrefix, points, duration });
}

// Lazy init — Redis may not be connected at module load time
let _httpRateLimiter: RateLimiterAbstract | null = null;
let _socketRateLimiters: Record<string, RateLimiterAbstract> | null = null;
let _connectionRateLimiter: RateLimiterAbstract | null = null;

function getHttpRateLimiter(): RateLimiterAbstract {
  if (!_httpRateLimiter) {
    _httpRateLimiter = createRateLimiter('http', RATE_LIMITS.http.points, RATE_LIMITS.http.duration);
  }
  return _httpRateLimiter;
}

function getSocketRateLimiters(): Record<string, RateLimiterAbstract> {
  if (!_socketRateLimiters) {
    _socketRateLimiters = {
      wordSubmit: createRateLimiter('ws:word', RATE_LIMITS.wordSubmit.points, RATE_LIMITS.wordSubmit.duration),
      chatMessage: createRateLimiter('ws:chat', RATE_LIMITS.chatMessage.points, RATE_LIMITS.chatMessage.duration),
      emojiReaction: createRateLimiter('ws:emoji', RATE_LIMITS.emojiReaction.points, RATE_LIMITS.emojiReaction.duration),
      roomCreate: createRateLimiter('ws:room', RATE_LIMITS.roomCreate.points, RATE_LIMITS.roomCreate.duration),
      default: createRateLimiter('ws:default', RATE_LIMITS.default.points, RATE_LIMITS.default.duration),
    };
  }
  return _socketRateLimiters;
}

function getConnectionRateLimiter(): RateLimiterAbstract {
  if (!_connectionRateLimiter) {
    _connectionRateLimiter = createRateLimiter('conn', RATE_LIMITS.connection.points, RATE_LIMITS.connection.duration);
  }
  return _connectionRateLimiter;
}

/**
 * Express middleware for HTTP rate limiting
 */
export function httpRateLimitMiddleware() {
  return async (req: any, res: any, next: any) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    try {
      // Timeout rate limit check to prevent slow Redis from blocking all HTTP requests
      const result = await Promise.race([
        getHttpRateLimiter().consume(ip),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Rate limit check timed out')), 2000)
        ),
      ]);
      res.setHeader('RateLimit-Limit', RATE_LIMITS.http.points);
      res.setHeader('RateLimit-Remaining', result.remainingPoints);
      res.setHeader('RateLimit-Reset', Math.ceil(result.msBeforeNext / 1000));
      next();
    } catch (rejRes: any) {
      // On timeout, allow the request through (fail-open) to prevent blocking the app
      if (rejRes?.message === 'Rate limit check timed out') {
        logger.warn('RATE_LIMIT', `Rate limit check timed out for ${ip}, allowing request`);
        next();
        return;
      }
      const retryAfter = Math.ceil((rejRes.msBeforeNext || 1000) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({ error: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded. Please slow down.' });
    }
  };
}

/**
 * Socket.IO rate limiting helper
 * Returns true if the action is allowed, false if rate limited
 */
export async function checkSocketRateLimit(
  socketId: string,
  action: string = 'default'
): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const limiters = getSocketRateLimiters();
  const limiter = limiters[action] || limiters.default;
  try {
    await limiter.consume(socketId);
    return { allowed: true };
  } catch (rejRes: any) {
    return { allowed: false, retryAfterMs: Math.ceil(rejRes.msBeforeNext) };
  }
}

/**
 * Check connection rate limit by IP
 */
export async function checkConnectionRateLimit(ip: string): Promise<boolean> {
  try {
    await getConnectionRateLimiter().consume(ip);
    return true;
  } catch {
    return false;
  }
}
