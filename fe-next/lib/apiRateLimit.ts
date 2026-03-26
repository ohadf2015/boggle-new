/**
 * API Rate Limiter for Next.js App Router
 *
 * Distributed rate limiting using Redis with in-memory fallback.
 * Uses sliding window algorithm with IP-based tracking.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimitRedis,
  isIpBlockedRedis,
  blockIpRedis,
  RATE_LIMIT_KEYS,
} from '@/backend/redis/rateLimit';

import logger from '@/backend/utils/logger';

// Store for rate limit data
interface RateLimitData {
  count: number;
  resetTime: number;
  lastRequest: number;
}

interface BlockData {
  expiry: number;
}

// In-memory stores (per-instance, resets on deploy - acceptable for abuse prevention)
const clientStore = new Map<string, RateLimitData>();
const blockedIps = new Map<string, BlockData>();

// Cleanup stale entries every 2 minutes
let cleanupScheduled = false;
function scheduleCleanup() {
  if (cleanupScheduled) return;
  cleanupScheduled = true;

  setTimeout(() => {
    const now = Date.now();
    const staleThreshold = 10 * 60 * 1000; // 10 minutes

    for (const [key, data] of clientStore) {
      if (now - data.lastRequest > staleThreshold) {
        clientStore.delete(key);
      }
    }

    for (const [ip, data] of blockedIps) {
      if (now > data.expiry) {
        blockedIps.delete(ip);
      }
    }

    cleanupScheduled = false;
  }, 120000);
}

/**
 * Extract client IP from Next.js request
 */
function getClientIp(request: NextRequest): string {
  // Check various headers (Vercel, Cloudflare, nginx)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  // Vercel specific
  const vercelIp = request.headers.get('x-vercel-forwarded-for');
  if (vercelIp) {
    return vercelIp.split(',')[0].trim();
  }

  return 'unknown';
}

interface RateLimitConfig {
  maxRequests: number;       // Max requests per window
  windowMs: number;          // Window size in milliseconds
  blockDurationMs?: number;  // Block duration when limit exceeded (default: 5 min)
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  blocked: boolean;
  retryAfter?: number;
}

/**
 * Check rate limit for a request
 * @param request - NextRequest object
 * @param endpoint - Endpoint identifier for tracking
 * @param config - Rate limit configuration
 * @returns RateLimitResult
 */
export function checkApiRateLimit(
  request: NextRequest,
  endpoint: string,
  config: RateLimitConfig
): RateLimitResult {
  scheduleCleanup();

  const ip = getClientIp(request);
  const now = Date.now();

  // Check if IP is blocked
  const blockData = blockedIps.get(ip);
  if (blockData && blockData.expiry > now) {
    return {
      success: false,
      remaining: 0,
      resetTime: blockData.expiry,
      blocked: true,
      retryAfter: Math.ceil((blockData.expiry - now) / 1000),
    };
  }

  const key = `${ip}:${endpoint}`;
  let data = clientStore.get(key);

  // Reset window if expired
  if (!data || now > data.resetTime) {
    data = {
      count: 0,
      resetTime: now + config.windowMs,
      lastRequest: now,
    };
    clientStore.set(key, data);
  }

  data.count++;
  data.lastRequest = now;

  const remaining = Math.max(0, config.maxRequests - data.count);

  // Check if limit exceeded
  if (data.count > config.maxRequests) {
    // Block IP if significantly over limit (abuse detection)
    if (data.count > config.maxRequests * 2) {
      const blockDuration = config.blockDurationMs || 300000; // 5 minutes default
      blockedIps.set(ip, { expiry: now + blockDuration });
      logger.warn('RATE_LIMIT', `Blocked IP ${ip} for ${Math.round(blockDuration / 1000)}s`);
    }

    return {
      success: false,
      remaining: 0,
      resetTime: data.resetTime,
      blocked: false,
      retryAfter: Math.ceil((data.resetTime - now) / 1000),
    };
  }

  return {
    success: true,
    remaining,
    resetTime: data.resetTime,
    blocked: false,
  };
}

/**
 * Create a rate limit error response
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const headers = new Headers();
  headers.set('Retry-After', String(result.retryAfter || 60));
  headers.set('RateLimit-Limit', '0');
  headers.set('RateLimit-Remaining', '0');
  headers.set('RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));

  return NextResponse.json(
    {
      error: result.blocked ? 'IP temporarily blocked' : 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: result.retryAfter,
    },
    { status: 429, headers }
  );
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
  maxRequests: number
): NextResponse {
  response.headers.set('RateLimit-Limit', String(maxRequests));
  response.headers.set('RateLimit-Remaining', String(result.remaining));
  response.headers.set('RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));
  return response;
}

/**
 * Get rate limit stats (for monitoring)
 */
export function getRateLimitStats() {
  return {
    trackedClients: clientStore.size,
    blockedIps: blockedIps.size,
  };
}

// ==========================================
// Redis-Backed Rate Limiting (Distributed)
// ==========================================

/**
 * Check rate limit using Redis (distributed across instances)
 * Falls back to in-memory if Redis is unavailable
 *
 * @param request - NextRequest object
 * @param endpoint - Endpoint identifier for tracking
 * @param config - Rate limit configuration
 * @returns Promise<RateLimitResult>
 */
export async function checkApiRateLimitAsync(
  request: NextRequest,
  endpoint: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  scheduleCleanup();

  const ip = getClientIp(request);
  const now = Date.now();

  try {
    // Check if IP is blocked in Redis (distributed)
    const redisBlocked = await isIpBlockedRedis(ip);
    if (redisBlocked) {
      const blockExpiry = now + (config.blockDurationMs || 300000);
      blockedIps.set(ip, { expiry: blockExpiry }); // Sync to local cache
      return {
        success: false,
        remaining: 0,
        resetTime: blockExpiry,
        blocked: true,
        retryAfter: Math.ceil((config.blockDurationMs || 300000) / 1000),
      };
    }

    // Also check local block cache
    const localBlock = blockedIps.get(ip);
    if (localBlock && localBlock.expiry > now) {
      return {
        success: false,
        remaining: 0,
        resetTime: localBlock.expiry,
        blocked: true,
        retryAfter: Math.ceil((localBlock.expiry - now) / 1000),
      };
    }

    // Check rate limit in Redis (distributed)
    const redisKey = RATE_LIMIT_KEYS.api(`${ip}:${endpoint}`);
    const redisResult = await checkRateLimitRedis(redisKey, {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
    });

    if (redisResult.limited) {
      // Block IP if significantly over limit (abuse detection)
      const localData = clientStore.get(`${ip}:${endpoint}`);
      const requestCount = localData?.count || 0;

      if (requestCount > config.maxRequests * 2) {
        const blockDuration = config.blockDurationMs || 300000;
        blockedIps.set(ip, { expiry: now + blockDuration });
        await blockIpRedis(ip, blockDuration);
        logger.warn('RATE_LIMIT', `Blocked IP ${ip} for ${Math.round(blockDuration / 1000)}s`);
      }

      return {
        success: false,
        remaining: 0,
        resetTime: redisResult.resetTime,
        blocked: false,
        retryAfter: Math.ceil((redisResult.resetTime - now) / 1000),
      };
    }

    // Also update local cache for abuse detection
    let data = clientStore.get(`${ip}:${endpoint}`);
    if (!data || now > data.resetTime) {
      data = {
        count: 1,
        resetTime: now + config.windowMs,
        lastRequest: now,
      };
    } else {
      data.count++;
      data.lastRequest = now;
    }
    clientStore.set(`${ip}:${endpoint}`, data);

    return {
      success: true,
      remaining: redisResult.remaining,
      resetTime: redisResult.resetTime,
      blocked: false,
    };
  } catch (error) {
    // Redis error - fall back to in-memory
    logger.warn('RATE_LIMIT', 'Redis error, using in-memory fallback:', error);
    return checkApiRateLimit(request, endpoint, config);
  }
}
