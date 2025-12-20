/**
 * API Rate Limiter for Next.js App Router
 *
 * Simple in-memory rate limiting for API routes.
 * Uses sliding window algorithm with IP-based tracking.
 */

import { NextRequest, NextResponse } from 'next/server';

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
      console.warn(`[API Rate Limit] Blocked IP ${ip} for ${Math.round(blockDuration / 1000)}s`);
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
