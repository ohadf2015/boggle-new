/**
 * SERP API Client for Google Trends
 * Fetches trending topics with aggressive caching to minimize API costs
 */

import axios from 'axios';
import { getRedisClient } from '../redisClient';

/**
 * TrendingTopic interface matching actual SERP API response
 * @see https://serpapi.com/google-trends-trending-now
 */
export interface TrendingTopic {
  query: string;
  start_timestamp?: number;
  end_timestamp?: number;
  active?: boolean;
  search_volume?: number;
  increase_percentage?: number;
  categories?: Array<{ id: number; name: string }>;
  trend_breakdown?: string[];
  serpapi_google_trends_link?: string;
  serpapi_news_link?: string;
}

interface SerpApiResponse {
  trending_searches: TrendingTopic[];
  serpapi_pagination?: unknown;
}

const CACHE_TTL = 86400; // 24 hours in seconds
const REDIS_PREFIX = 'serp:trends:';

/**
 * Fetch trending topics from Google Trends via SERP API
 * Uses 24-hour caching to avoid redundant API calls
 *
 * @param region - Two-letter country code (IL, US, SE, JP, ES)
 * @param language - Two-letter language code (he, en, sv, ja, es)
 * @returns Array of trending topics
 */
export async function fetchGoogleTrends(
  region: string,
  language?: string
): Promise<TrendingTopic[]> {
  const todayDate = getTodayDate();
  const cacheKey = `${REDIS_PREFIX}${region}:${todayDate}`;
  const redis = getRedisClient();

  try {
    // Check Redis cache first
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`[SERP] Using cached trends for ${region} from ${todayDate}`);
        return JSON.parse(cached);
      }
    }

    // Fetch from SERP API
    console.log(`[SERP] Fetching fresh trends for ${region}...`);
    const startTime = Date.now();

    const response = await axios.get<SerpApiResponse>('https://serpapi.com/search.json', {
      params: {
        engine: 'google_trends_trending_now',
        geo: region,
        hours: 24, // Get trends from last 24 hours for fresh daily content
        ...(language && { hl: language }),
        api_key: process.env.SERPAPI_KEY
      },
      timeout: 15000
    });

    const apiResponseTime = Date.now() - startTime;
    const trends = response.data.trending_searches || [];

    if (trends.length === 0) {
      console.warn(`[SERP] No trends returned for ${region}`);
    }

    // Cache in Redis for 24 hours
    if (redis) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(trends));
    }

    // Log to database for monitoring (fire and forget)
    logSerpApiRequest(region, trends.length, apiResponseTime, true).catch(err =>
      console.error('[SERP] Failed to log API request:', err)
    );

    console.log(`[SERP] Fetched ${trends.length} trends for ${region} in ${apiResponseTime}ms`);
    return trends;

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[SERP] Error fetching trends for ${region}:`, errorMessage);

    // Log error to database
    await logSerpApiRequest(region, 0, 0, false, errorMessage).catch(err =>
      console.error('[SERP] Failed to log error:', err)
    );

    // Try to return yesterday's cached data as fallback
    const yesterdayKey = `${REDIS_PREFIX}${region}:${getYesterdayDate()}`;
    if (redis) {
      const fallback = await redis.get(yesterdayKey);
      if (fallback) {
        console.log(`[SERP] Using yesterday's cached data for ${region} as fallback`);
        return JSON.parse(fallback);
      }
    }

    // No fallback available - return empty array
    console.warn(`[SERP] No fallback data available for ${region}`);
    return [];
  }
}

/**
 * Get trends from database cache (used by challenge generator)
 * This avoids calling SERP API multiple times for the same date
 */
export async function getTrendsFromDbCache(
  region: string,
  date: Date
): Promise<TrendingTopic[] | null> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const dateStr = date.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('serp_trends_cache')
      .select('trends_data')
      .eq('region', region)
      .eq('fetch_date', dateStr)
      .single();

    if (error || !data) {
      return null;
    }

    return data.trends_data as TrendingTopic[];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[SERP] Error fetching from DB cache:', errorMessage);
    return null;
  }
}

/**
 * Store trends in database cache for long-term persistence
 * Called after successful SERP API fetch
 */
export async function storeTrendsInDbCache(
  region: string,
  date: Date,
  trends: TrendingTopic[],
  apiResponseTime: number
): Promise<void> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const dateStr = date.toISOString().split('T')[0];

    await supabase.from('serp_trends_cache').upsert({
      region,
      fetch_date: dateStr,
      trends_data: trends,
      trends_fetched: trends.length,
      api_response_time_ms: apiResponseTime
    }, {
      onConflict: 'region,fetch_date'
    });

    console.log(`[SERP] Stored ${trends.length} trends in DB cache for ${region}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[SERP] Error storing in DB cache:', errorMessage);
  }
}

/**
 * Log SERP API request for cost monitoring
 */
async function logSerpApiRequest(
  region: string,
  trendsFetched: number,
  apiResponseTime: number,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase.from('serp_api_logs').insert({
      request_date: new Date().toISOString().split('T')[0],
      region,
      trends_fetched: trendsFetched,
      api_response_time_ms: apiResponseTime,
      success,
      error_message: errorMessage,
      reused_from_cache: false
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[SERP] Failed to log request:', errorMessage);
  }
}

/**
 * Get today's date in YYYY-MM-DD format (UTC)
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get yesterday's date in YYYY-MM-DD format (UTC)
 */
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Check SERP API health and remaining quota
 */
export async function checkSerpApiHealth(): Promise<{
  healthy: boolean;
  message: string;
  quotaInfo?: unknown;
}> {
  try {
    // Make a minimal test request
    const response = await axios.get('https://serpapi.com/account.json', {
      params: {
        api_key: process.env.SERPAPI_KEY
      },
      timeout: 5000
    });

    return {
      healthy: true,
      message: 'SERP API is healthy',
      quotaInfo: response.data
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      healthy: false,
      message: `SERP API health check failed: ${errorMessage}`
    };
  }
}
