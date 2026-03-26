import { RateLimiterMemory, RateLimiterAbstract } from 'rate-limiter-flexible';
import { RATE_LIMITS } from '../config/rateLimits';

/**
 * HTTP API rate limiter — sliding window, 100 requests/min per IP
 */
export const httpRateLimiter = new RateLimiterMemory({
  keyPrefix: 'http',
  points: RATE_LIMITS.http.points,
  duration: RATE_LIMITS.http.duration,
});

/**
 * Socket event rate limiters — per-action limits
 */
export const socketRateLimiters: Record<string, RateLimiterAbstract> = {
  wordSubmit: new RateLimiterMemory({ keyPrefix: 'ws:word', points: RATE_LIMITS.wordSubmit.points, duration: RATE_LIMITS.wordSubmit.duration }),
  chatMessage: new RateLimiterMemory({ keyPrefix: 'ws:chat', points: RATE_LIMITS.chatMessage.points, duration: RATE_LIMITS.chatMessage.duration }),
  emojiReaction: new RateLimiterMemory({ keyPrefix: 'ws:emoji', points: RATE_LIMITS.emojiReaction.points, duration: RATE_LIMITS.emojiReaction.duration }),
  roomCreate: new RateLimiterMemory({ keyPrefix: 'ws:room', points: RATE_LIMITS.roomCreate.points, duration: RATE_LIMITS.roomCreate.duration }),
  default: new RateLimiterMemory({ keyPrefix: 'ws:default', points: RATE_LIMITS.default.points, duration: RATE_LIMITS.default.duration }),
};

/**
 * Connection rate limiter — max 5 sockets per IP per minute
 */
export const connectionRateLimiter = new RateLimiterMemory({
  keyPrefix: 'conn',
  points: RATE_LIMITS.connection.points,
  duration: RATE_LIMITS.connection.duration,
});

/**
 * Express middleware for HTTP rate limiting
 */
export function httpRateLimitMiddleware() {
  return async (req: any, res: any, next: any) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    try {
      await httpRateLimiter.consume(ip);
      next();
    } catch {
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
  const limiter = socketRateLimiters[action] || socketRateLimiters.default;
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
    await connectionRateLimiter.consume(ip);
    return true;
  } catch {
    return false;
  }
}
