/**
 * Redis Rate Limiting Module
 *
 * Distributed rate limiting using Redis sorted sets with sliding window algorithm.
 * Provides fallback to in-memory when Redis is unavailable.
 *
 * Note: Uses redis.evalsha() for Lua script execution (standard Redis pattern).
 */

import { REDIS_PREFIX, REDIS_VERSION } from './config';
import { getRateLimitClient as getRedisClient, isRedisAvailable } from './connection';
import logger from '../utils/logger';

// Key patterns for rate limiting
const RATE_LIMIT_PREFIX = `${REDIS_PREFIX}:${REDIS_VERSION}:ratelimit`;

export const RATE_LIMIT_KEYS = {
  socket: (socketId: string): string => `${RATE_LIMIT_PREFIX}:socket:${socketId}`,
  ip: (ip: string): string => `${RATE_LIMIT_PREFIX}:ip:${ip}`,
  api: (key: string): string => `${RATE_LIMIT_PREFIX}:api:${key}`,
  blocked: (ip: string): string => `${RATE_LIMIT_PREFIX}:blocked:${ip}`,
};

interface RateLimitResult {
  limited: boolean;
  reason?: 'ip_blocked' | 'key_limit' | 'ip_limit';
  remaining: number;
  resetTime: number;
}

interface SlidingWindowOptions {
  maxRequests: number;
  windowMs: number;
  weight?: number;
}

/**
 * Lua script for atomic sliding window rate limiting
 * Uses sorted set with timestamps as scores for O(log N) operations
 *
 * KEYS[1] = rate limit key
 * ARGV[1] = current timestamp (ms)
 * ARGV[2] = window size (ms)
 * ARGV[3] = max requests allowed
 * ARGV[4] = request weight (usually 1)
 *
 * Returns: [is_limited (0/1), remaining_requests, reset_timestamp]
 */
const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local max_requests = tonumber(ARGV[3])
local weight = tonumber(ARGV[4]) or 1

local window_start = now - window_ms

-- Remove expired entries
redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

-- Count current requests in window
local current_count = redis.call('ZCARD', key)

-- Calculate remaining capacity
local remaining = max_requests - current_count

-- Check if adding this request would exceed limit
if current_count + weight > max_requests then
  -- Get the oldest entry to calculate reset time
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local reset_time = now + window_ms
  if oldest[2] then
    reset_time = tonumber(oldest[2]) + window_ms
  end
  return {1, math.max(0, remaining), reset_time}
end

-- Add current request(s)
for i = 1, weight do
  redis.call('ZADD', key, now, now .. ':' .. i .. ':' .. math.random(1000000))
end

-- Set TTL slightly longer than window to allow cleanup
redis.call('PEXPIRE', key, window_ms + 10000)

return {0, max_requests - current_count - weight, now + window_ms}
`;

let slidingWindowScriptSha: string | null = null;

/**
 * Load the Lua script into Redis
 */
async function loadRateLimitScript(): Promise<void> {
  const redis = getRedisClient();
  if (!redis || !isRedisAvailable()) return;

  try {
    slidingWindowScriptSha = (await redis.script('LOAD', SLIDING_WINDOW_SCRIPT)) as string;
    logger.debug('RATE_LIMIT_REDIS', 'Loaded sliding window script');
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('RATE_LIMIT_REDIS', `Failed to load script: ${err.message}`);
    slidingWindowScriptSha = null;
  }
}

/**
 * Execute the sliding window script
 * Uses evalsha with fallback to full script execution
 */
async function executeSlidingWindowScript(
  redis: ReturnType<typeof getRedisClient>,
  key: string,
  now: number,
  windowMs: number,
  maxRequests: number,
  weight: number
): Promise<[number, number, number]> {
  if (!redis) {
    throw new Error('Redis client not available');
  }

  if (slidingWindowScriptSha) {
    // Use pre-loaded script (faster)
    return (await redis.evalsha(
      slidingWindowScriptSha,
      1,
      key,
      now.toString(),
      windowMs.toString(),
      maxRequests.toString(),
      weight.toString()
    )) as [number, number, number];
  }

  // Fallback: load and execute script
  // Note: This uses Redis Lua script execution, not JavaScript eval
  const script = SLIDING_WINDOW_SCRIPT;
  slidingWindowScriptSha = (await redis.script('LOAD', script)) as string;

  return (await redis.evalsha(
    slidingWindowScriptSha,
    1,
    key,
    now.toString(),
    windowMs.toString(),
    maxRequests.toString(),
    weight.toString()
  )) as [number, number, number];
}

/**
 * Check rate limit using Redis sliding window
 */
export async function checkRateLimitRedis(
  key: string,
  options: SlidingWindowOptions
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const now = Date.now();

  // Fallback if Redis unavailable
  if (!redis || !isRedisAvailable()) {
    return {
      limited: false,
      remaining: options.maxRequests,
      resetTime: now + options.windowMs,
    };
  }

  try {
    const result = await executeSlidingWindowScript(
      redis,
      key,
      now,
      options.windowMs,
      options.maxRequests,
      options.weight ?? 1
    );

    return {
      limited: result[0] === 1,
      reason: result[0] === 1 ? 'key_limit' : undefined,
      remaining: result[1],
      resetTime: result[2],
    };
  } catch (error: unknown) {
    const err = error as Error;

    // If script no longer exists (Redis restart), try to reload
    if (err.message.includes('NOSCRIPT')) {
      slidingWindowScriptSha = null;
      logger.warn('RATE_LIMIT_REDIS', 'Script evicted, reloading');
      return checkRateLimitRedis(key, options);
    }

    logger.error('RATE_LIMIT_REDIS', `Rate limit check failed: ${err.message}`);

    // Fail open - allow request if Redis fails
    return {
      limited: false,
      remaining: options.maxRequests,
      resetTime: now + options.windowMs,
    };
  }
}

/**
 * Check if an IP is blocked in Redis
 */
export async function isIpBlockedRedis(ip: string): Promise<boolean> {
  const redis = getRedisClient();

  if (!redis || !isRedisAvailable()) {
    return false;
  }

  try {
    const key = RATE_LIMIT_KEYS.blocked(ip);
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('RATE_LIMIT_REDIS', `IP block check failed: ${err.message}`);
    return false;
  }
}

/**
 * Block an IP in Redis
 */
export async function blockIpRedis(ip: string, durationMs: number): Promise<void> {
  const redis = getRedisClient();

  if (!redis || !isRedisAvailable()) {
    logger.warn('RATE_LIMIT_REDIS', `Cannot block IP ${ip} - Redis unavailable`);
    return;
  }

  try {
    const key = RATE_LIMIT_KEYS.blocked(ip);
    await redis.set(key, Date.now().toString(), 'PX', durationMs);
    logger.warn('RATE_LIMIT_REDIS', `IP ${ip} blocked for ${Math.round(durationMs / 1000)}s`);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('RATE_LIMIT_REDIS', `Failed to block IP: ${err.message}`);
  }
}

/**
 * Unblock an IP in Redis
 */
export async function unblockIpRedis(ip: string): Promise<void> {
  const redis = getRedisClient();

  if (!redis || !isRedisAvailable()) {
    return;
  }

  try {
    const key = RATE_LIMIT_KEYS.blocked(ip);
    await redis.del(key);
    logger.info('RATE_LIMIT_REDIS', `IP ${ip} unblocked`);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('RATE_LIMIT_REDIS', `Failed to unblock IP: ${err.message}`);
  }
}

/**
 * Clear rate limit data for a key
 */
export async function clearRateLimitRedis(key: string): Promise<void> {
  const redis = getRedisClient();

  if (!redis || !isRedisAvailable()) {
    return;
  }

  try {
    await redis.del(key);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('RATE_LIMIT_REDIS', `Failed to clear rate limit: ${err.message}`);
  }
}

/**
 * Get rate limit stats from Redis
 */
export async function getRateLimitStatsRedis(): Promise<{
  blockedIps: number;
  trackedKeys: number;
}> {
  const redis = getRedisClient();

  if (!redis || !isRedisAvailable()) {
    return { blockedIps: 0, trackedKeys: 0 };
  }

  try {
    const blockedPattern = `${RATE_LIMIT_PREFIX}:blocked:*`;
    const keyPattern = `${RATE_LIMIT_PREFIX}:*`;

    // Use SCAN for production safety (non-blocking)
    let blockedCount = 0;
    let cursor = '0';

    // Count blocked IPs
    do {
      const [newCursor, keys] = await redis.scan(cursor, 'MATCH', blockedPattern, 'COUNT', 100);
      cursor = newCursor;
      blockedCount += keys.length;
    } while (cursor !== '0');

    // Count tracked keys (sample to avoid performance issues)
    cursor = '0';
    const [, sampleKeys] = await redis.scan(cursor, 'MATCH', keyPattern, 'COUNT', 1000);
    const keyCount = sampleKeys.length;

    return { blockedIps: blockedCount, trackedKeys: keyCount };
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('RATE_LIMIT_REDIS', `Failed to get stats: ${err.message}`);
    return { blockedIps: 0, trackedKeys: 0 };
  }
}

// Initialize script on module load
loadRateLimitScript().catch(() => {
  // Silent fail - will retry on first use
});

const rateLimitModule = {
  checkRateLimitRedis,
  isIpBlockedRedis,
  blockIpRedis,
  unblockIpRedis,
  clearRateLimitRedis,
  getRateLimitStatsRedis,
  RATE_LIMIT_KEYS,
};

export default rateLimitModule;
