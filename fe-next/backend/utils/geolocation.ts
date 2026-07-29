/**
 * IP Geolocation Utility
 *
 * Uses ip-api.com for free IP geolocation lookups with Redis caching.
 * Railway doesn't provide geolocation headers like Vercel/Cloudflare,
 * so we need to look up the country from the IP address.
 *
 * Rate limits: ip-api.com allows 45 requests per minute on free tier.
 * We cache results for 24 hours to stay well within limits.
 */

import type { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../redisClient';
import logger from './logger';

// ==========================================
// Type Definitions
// ==========================================

interface GeoData {
  status: 'success' | 'fail' | 'error';
  country?: string;
  countryCode?: string | null;
  region?: string | null;
  regionName?: string;
  city?: string | null;
  ip?: string;
  isPrivate?: boolean;
  message?: string;
}

interface CachedGeoData extends GeoData {
  expires?: number;
}

interface MemoryCacheEntry {
  data: GeoData;
  expires: number;
}

interface CountryResult {
  countryCode: string | null;
  country?: string;
  city?: string;
  region?: string;
  ip?: string;
  source: 'vercel' | 'cloudflare' | 'cloudfront' | 'header' | 'ip-lookup' | 'none' | 'error';
  error?: string;
}

interface GeolocationMiddlewareOptions {
  pathFilter?: string[] | RegExp | null;
  skipPaths?: string[];
}

interface RequestWithGeoData extends Request {
  geoData?: CountryResult;
}

// ==========================================
// Constants
// ==========================================

// Cache TTL: 24 hours
export const GEOLOCATION_CACHE_TTL = 24 * 60 * 60;

// In-memory fallback cache for when Redis is unavailable
const memoryCache = new Map<string, MemoryCacheEntry>();
const MAX_MEMORY_CACHE_SIZE = 1000;

// Circuit breaker: when ip-api.com rate-limits us (HTTP 429), back off for this
// long before issuing another request. ip-api's free tier resets per-minute, so
// 60s gives the rate-limit window time to drain instead of cascading into more
// 429s on every subsequent request.
const RATE_LIMIT_COOLDOWN_MS = 60_000;
let rateLimitedUntil = 0;

// ==========================================
// IP Extraction Functions
// ==========================================

/**
 * Get client IP from request headers
 * Railway and most proxies use x-forwarded-for
 */
export function getClientIP(req: Request): string | null {
  // Check various headers in order of reliability
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for can be comma-separated list, take first IP
    const forwardedForStr = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const firstIP = forwardedForStr.split(',')[0].trim();
    return firstIP;
  }

  // Railway-specific header
  const railwayIP = req.headers['x-real-ip'];
  if (railwayIP) {
    return Array.isArray(railwayIP) ? railwayIP[0] : railwayIP;
  }

  // Cloudflare
  const cfIP = req.headers['cf-connecting-ip'];
  if (cfIP) {
    return Array.isArray(cfIP) ? cfIP[0] : cfIP;
  }

  // Fallback to socket remote address
  const socketIP = req.socket?.remoteAddress;
  if (socketIP) {
    // Handle IPv6 localhost
    if (socketIP === '::1' || socketIP === '::ffff:127.0.0.1') {
      return '127.0.0.1';
    }
    // Handle IPv4-mapped IPv6 addresses
    if (socketIP.startsWith('::ffff:')) {
      return socketIP.substring(7);
    }
    return socketIP;
  }

  return null;
}

/**
 * Check if IP is a private/local address
 */
export function isPrivateIP(ip: string | null): boolean {
  if (!ip) return true;

  // IPv4 private ranges
  const privateRanges = [
    /^127\./,           // Loopback
    /^10\./,            // Class A private
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Class B private
    /^192\.168\./,      // Class C private
    /^169\.254\./,      // Link-local
    /^0\./,             // Current network
  ];

  return privateRanges.some(range => range.test(ip)) ||
         ip === '::1' ||
         ip === 'localhost';
}

// ==========================================
// Cache Functions
// ==========================================

/**
 * Get cached geolocation data
 */
async function getCachedGeodata(ip: string): Promise<GeoData | null> {
  // Try Redis first
  const redis = getRedisClient();
  if (redis) {
    try {
      const cached = await redis.get(`geo:${ip}`);
      if (cached) {
        return JSON.parse(cached) as GeoData;
      }
    } catch (error) {
      logger.warn('GEOLOCATION', 'Redis cache read error', { error: (error as Error).message });
    }
  }

  // Fallback to memory cache
  const memoryCached = memoryCache.get(ip);
  if (memoryCached && memoryCached.expires > Date.now()) {
    return memoryCached.data;
  }

  return null;
}

/**
 * Cache geolocation data
 */
async function cacheGeodata(ip: string, data: GeoData): Promise<void> {
  // Try Redis first
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.setex(`geo:${ip}`, GEOLOCATION_CACHE_TTL, JSON.stringify(data));
    } catch (error) {
      logger.warn('GEOLOCATION', 'Redis cache write error', { error: (error as Error).message });
    }
  }

  // Also cache in memory as fallback
  if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
    // Remove oldest entries
    const keysToDelete = Array.from(memoryCache.keys()).slice(0, 100);
    keysToDelete.forEach(key => memoryCache.delete(key));
  }
  memoryCache.set(ip, {
    data,
    expires: Date.now() + (GEOLOCATION_CACHE_TTL * 1000)
  });
}

// ==========================================
// IP Lookup Functions
// ==========================================

/**
 * Lookup geolocation from IP address using ip-api.com
 * Free tier: 45 requests/minute
 * This function is designed to never throw - it always returns a valid object
 */
export async function lookupIP(ip: string): Promise<GeoData> {
  try {
    if (isPrivateIP(ip)) {
      return {
        status: 'success',
        country: 'Unknown',
        countryCode: null,
        region: null,
        city: null,
        isPrivate: true
      };
    }

    // Check cache first
    const cached = await getCachedGeodata(ip);
    if (cached) {
      return cached;
    }

    // Check if fetch is available (Node.js 18+ has global fetch)
    if (typeof fetch === 'undefined') {
      logger.warn('GEOLOCATION', 'fetch is not available - returning null');
      return {
        status: 'error',
        message: 'fetch not available',
        countryCode: null
      };
    }

    // Circuit breaker: short-circuit while upstream is known rate-limited.
    if (Date.now() < rateLimitedUntil) {
      return {
        status: 'error',
        message: 'rate-limited (cooldown)',
        countryCode: null
      };
    }

    // ip-api.com provides free geolocation without API key
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    let response: globalThis.Response;
    try {
      response = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city`,
        { signal: controller.signal }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      // 429 → trip the circuit breaker so we stop hammering ip-api for the
      // next minute. Any other HTTP error is still debug-level noise since
      // callers degrade gracefully.
      if (response.status === 429) {
        rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
        logger.debug('GEOLOCATION', 'API rate-limited, cooldown engaged', {
          cooldownMs: RATE_LIMIT_COOLDOWN_MS
        });
      } else {
        logger.debug('GEOLOCATION', 'API returned HTTP error', { status: response.status });
      }
      return {
        status: 'error',
        message: `HTTP ${response.status}`,
        countryCode: null
      };
    }

    const data = await response.json() as GeoData;

    if (data.status === 'fail') {
      logger.debug('GEOLOCATION', 'API returned failure', { message: data.message });
      return {
        status: 'fail',
        message: data.message,
        countryCode: null
      };
    }

    const result: GeoData = {
      status: 'success',
      country: data.country,
      countryCode: data.countryCode,
      region: data.region,
      regionName: data.regionName,
      city: data.city,
      ip: ip
    };

    // Cache the result (in background, don't await)
    cacheGeodata(ip, result).catch(err => {
      logger.warn('GEOLOCATION', 'Cache write failed', { error: err.message });
    });

    return result;
  } catch (error) {
    // Handle AbortError specially for clearer logging
    if ((error as Error).name === 'AbortError') {
      logger.warn('GEOLOCATION', 'Request timed out', { ip });
    } else {
      logger.warn('GEOLOCATION', 'Lookup failed', { ip, error: (error as Error).message });
    }
    return {
      status: 'error',
      message: (error as Error).name === 'AbortError' ? 'timeout' : (error as Error).message,
      countryCode: null
    };
  }
}

/**
 * Get country code from request
 * First checks CDN headers, then falls back to IP lookup
 * This function is designed to never throw - it always returns a valid object
 */
export async function getCountryFromRequest(req: Request): Promise<CountryResult> {
  try {
    // First, check for existing CDN geolocation headers
    // (In case Railway is fronted by Cloudflare or other CDN)

    // Vercel
    const vercelCountry = req.headers?.['x-vercel-ip-country'];
    if (vercelCountry) {
      return { countryCode: Array.isArray(vercelCountry) ? vercelCountry[0] : vercelCountry, source: 'vercel' };
    }

    // Cloudflare
    const cfCountry = req.headers?.['cf-ipcountry'];
    if (cfCountry && cfCountry !== 'XX') {
      return { countryCode: Array.isArray(cfCountry) ? cfCountry[0] : cfCountry, source: 'cloudflare' };
    }

    // AWS CloudFront
    const awsCountry = req.headers?.['cloudfront-viewer-country'];
    if (awsCountry) {
      return { countryCode: Array.isArray(awsCountry) ? awsCountry[0] : awsCountry, source: 'cloudfront' };
    }

    // Generic geo header (custom setups)
    const geoCountry = req.headers?.['x-country-code'];
    if (geoCountry) {
      return { countryCode: Array.isArray(geoCountry) ? geoCountry[0] : geoCountry, source: 'header' };
    }

    // Fall back to IP lookup
    const ip = getClientIP(req);
    if (!ip) {
      return { countryCode: null, source: 'none' };
    }

    const geoData = await lookupIP(ip);
    return {
      countryCode: geoData.countryCode || null,
      country: geoData.country,
      city: geoData.city || undefined,
      region: geoData.regionName,
      ip: ip,
      source: 'ip-lookup'
    };
  } catch (error) {
    // Log the error but return a safe fallback - never throw
    logger.warn('GEOLOCATION', 'getCountryFromRequest error', { error: (error as Error).message });
    return { countryCode: null, source: 'error', error: (error as Error).message };
  }
}

// ==========================================
// Middleware
// ==========================================

/**
 * Express middleware to add geolocation data to request
 * Sets x-country-code header for downstream middleware
 */
export function geolocationMiddleware(options: GeolocationMiddlewareOptions = {}): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const {
    pathFilter = null, // Only run on specific paths (regex or string array)
    skipPaths = ['/health', '/metrics', '/api/admin'], // Skip these paths
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Skip for certain paths
      const path = req.path || req.url;
      if (skipPaths.some(p => path.startsWith(p))) {
        return next();
      }

      // If path filter is specified, only run on matching paths
      if (pathFilter) {
        if (Array.isArray(pathFilter)) {
          if (!pathFilter.some(p => path.startsWith(p))) {
            return next();
          }
        } else if (pathFilter instanceof RegExp) {
          if (!pathFilter.test(path)) {
            return next();
          }
        }
      }

      // Get geolocation data
      const geoData = await getCountryFromRequest(req);

      // Attach to request for use by route handlers
      (req as RequestWithGeoData).geoData = geoData;

      // Set header for Next.js middleware to use
      if (geoData.countryCode) {
        req.headers['x-country-code'] = geoData.countryCode;
      }

      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('GEOLOCATION', 'Middleware error', { error: errorMessage });
      next(); // Continue even if geolocation fails
    }
  };
}

export type { GeoData, CountryResult, GeolocationMiddlewareOptions, RequestWithGeoData };
