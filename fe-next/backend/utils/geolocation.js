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

const { getRedisClient } = require('../redisClient');

// Cache TTL: 24 hours
const GEOLOCATION_CACHE_TTL = 24 * 60 * 60;

// In-memory fallback cache for when Redis is unavailable
const memoryCache = new Map();
const MAX_MEMORY_CACHE_SIZE = 1000;

/**
 * Get client IP from request headers
 * Railway and most proxies use x-forwarded-for
 */
function getClientIP(req) {
  // Check various headers in order of reliability
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for can be comma-separated list, take first IP
    const firstIP = forwardedFor.split(',')[0].trim();
    return firstIP;
  }

  // Railway-specific header
  const railwayIP = req.headers['x-real-ip'];
  if (railwayIP) {
    return railwayIP;
  }

  // Cloudflare
  const cfIP = req.headers['cf-connecting-ip'];
  if (cfIP) {
    return cfIP;
  }

  // Fallback to socket remote address
  const socketIP = req.socket?.remoteAddress || req.connection?.remoteAddress;
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
function isPrivateIP(ip) {
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

/**
 * Get cached geolocation data
 */
async function getCachedGeodata(ip) {
  // Try Redis first
  const redis = getRedisClient();
  if (redis) {
    try {
      const cached = await redis.get(`geo:${ip}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('[GEOLOCATION] Redis cache read error:', error.message);
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
async function cacheGeodata(ip, data) {
  // Try Redis first
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.setEx(`geo:${ip}`, GEOLOCATION_CACHE_TTL, JSON.stringify(data));
    } catch (error) {
      console.warn('[GEOLOCATION] Redis cache write error:', error.message);
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

/**
 * Lookup geolocation from IP address using ip-api.com
 * Free tier: 45 requests/minute
 */
async function lookupIP(ip) {
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

  try {
    // ip-api.com provides free geolocation without API key
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'fail') {
      console.warn('[GEOLOCATION] API returned failure:', data.message);
      return {
        status: 'fail',
        message: data.message,
        countryCode: null
      };
    }

    const result = {
      status: 'success',
      country: data.country,
      countryCode: data.countryCode,
      region: data.region,
      regionName: data.regionName,
      city: data.city,
      ip: ip
    };

    // Cache the result
    await cacheGeodata(ip, result);

    return result;
  } catch (error) {
    console.warn('[GEOLOCATION] Lookup failed for', ip, ':', error.message);
    return {
      status: 'error',
      message: error.message,
      countryCode: null
    };
  }
}

/**
 * Get country code from request
 * First checks CDN headers, then falls back to IP lookup
 */
async function getCountryFromRequest(req) {
  // First, check for existing CDN geolocation headers
  // (In case Railway is fronted by Cloudflare or other CDN)

  // Vercel
  const vercelCountry = req.headers['x-vercel-ip-country'];
  if (vercelCountry) {
    return { countryCode: vercelCountry, source: 'vercel' };
  }

  // Cloudflare
  const cfCountry = req.headers['cf-ipcountry'];
  if (cfCountry && cfCountry !== 'XX') {
    return { countryCode: cfCountry, source: 'cloudflare' };
  }

  // AWS CloudFront
  const awsCountry = req.headers['cloudfront-viewer-country'];
  if (awsCountry) {
    return { countryCode: awsCountry, source: 'cloudfront' };
  }

  // Generic geo header (custom setups)
  const geoCountry = req.headers['x-country-code'];
  if (geoCountry) {
    return { countryCode: geoCountry, source: 'header' };
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
    city: geoData.city,
    region: geoData.regionName,
    ip: ip,
    source: 'ip-lookup'
  };
}

/**
 * Express middleware to add geolocation data to request
 * Sets x-country-code header for downstream middleware
 */
function geolocationMiddleware(options = {}) {
  const {
    pathFilter = null, // Only run on specific paths (regex or string array)
    skipPaths = ['/health', '/metrics', '/api/admin'], // Skip these paths
  } = options;

  return async (req, res, next) => {
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
      req.geoData = geoData;

      // Set header for Next.js middleware to use
      if (geoData.countryCode) {
        req.headers['x-country-code'] = geoData.countryCode;
      }

      next();
    } catch (error) {
      console.error('[GEOLOCATION] Middleware error:', error);
      next(); // Continue even if geolocation fails
    }
  };
}

module.exports = {
  getClientIP,
  isPrivateIP,
  lookupIP,
  getCountryFromRequest,
  geolocationMiddleware,
  GEOLOCATION_CACHE_TTL
};
