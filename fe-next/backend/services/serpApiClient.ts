/**
 * SERP API Client for Google Trends
 * Fetches trending topics with aggressive caching to minimize API costs
 */

import ky from 'ky';
import { getRedisClient } from '../redisClient';
import logger from '../utils/logger';

/**
 * News article from Google News enrichment
 */
export interface NewsArticle {
  title: string;
  link: string;
  source: string;
  snippet?: string;
  date?: string;
  thumbnail?: string;
}

/**
 * TrendingTopic interface matching actual SERP API response
 * Extended with enrichment data from Google News and Related Searches
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
  // Enrichment data (added by enrichTrendWithNews)
  news_articles?: NewsArticle[];
  related_searches?: string[];
  people_also_ask?: string[];
  enriched_at?: string;
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
 * Optionally enriches trends with news articles and related searches
 *
 * @param region - Two-letter country code (IL, US, SE, JP, ES)
 * @param language - Two-letter language code (he, en, sv, ja, es)
 * @param enrichWithNews - If true, enriches top trends with news articles (default: false)
 * @returns Array of trending topics
 */
export async function fetchGoogleTrends(
  region: string,
  language?: string,
  enrichWithNews: boolean = false
): Promise<TrendingTopic[]> {
  const todayDate = getTodayDate();
  const enrichSuffix = enrichWithNews ? ':enriched' : '';
  const cacheKey = `${REDIS_PREFIX}${region}:${todayDate}${enrichSuffix}`;
  const redis = getRedisClient();

  try {
    // Check Redis cache first
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info('SERP', `Using cached trends for ${region} from ${todayDate}`, { enriched: enrichWithNews });
        return JSON.parse(cached);
      }

      // When enrichment is off, also check the enriched cache key
      // This avoids a redundant SERP call when enriched data was already cached
      if (!enrichWithNews) {
        const enrichedCacheKey = `${REDIS_PREFIX}${region}:${todayDate}:enriched`;
        const enrichedCached = await redis.get(enrichedCacheKey);
        if (enrichedCached) {
          logger.info('SERP', `Reusing enriched cache for ${region}`);
          return JSON.parse(enrichedCached);
        }
      }
    }

    // Fetch from SERP API
    logger.info('SERP', `Fetching fresh trends for ${region}...`);
    const startTime = Date.now();

    const response = await ky.get('https://serpapi.com/search.json', {
      searchParams: {
        engine: 'google_trends_trending_now',
        geo: region,
        hours: 24, // Get trends from last 24 hours for fresh daily content
        ...(language && { hl: language }),
        api_key: process.env.SERPAPI_KEY!
      },
      timeout: 15000,
      retry: 0,
    }).json<SerpApiResponse>();

    const apiResponseTime = Date.now() - startTime;
    let trends = response.trending_searches || [];

    if (trends.length === 0) {
      logger.warn('SERP', `No trends returned for ${region}`);
    }

    // Enrich with news articles if requested
    if (enrichWithNews && trends.length > 0 && language) {
      trends = await enrichTrendsWithNews(trends, language, 5);
    }

    // Cache in Redis for 24 hours
    if (redis) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(trends));
    }

    // Log to database for monitoring (fire and forget)
    logSerpApiRequest(region, trends.length, apiResponseTime, true).catch(err =>
      logger.error('SERP', 'Failed to log API request', err)
    );

    logger.info('SERP', `Fetched ${trends.length} trends for ${region} in ${apiResponseTime}ms`, { enriched: enrichWithNews });
    return trends;

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('SERP', `Error fetching trends for ${region}`, { error: errorMessage });

    // Log error to database
    await logSerpApiRequest(region, 0, 0, false, errorMessage).catch(err =>
      logger.error('SERP', 'Failed to log error', err)
    );

    // Try to return yesterday's cached data as fallback
    const yesterdayKey = `${REDIS_PREFIX}${region}:${getYesterdayDate()}${enrichSuffix}`;
    if (redis) {
      const fallback = await redis.get(yesterdayKey);
      if (fallback) {
        logger.info('SERP', `Using yesterday's cached data for ${region} as fallback`);
        return JSON.parse(fallback);
      }
    }

    // No fallback available - return empty array
    logger.warn('SERP', `No fallback data available for ${region}`);
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
    logger.error('SERP', 'Error fetching from DB cache', { error: errorMessage });
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

    logger.info('SERP', `Stored ${trends.length} trends in DB cache for ${region}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('SERP', 'Error storing in DB cache', { error: errorMessage });
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
    logger.error('SERP', 'Failed to log request', { error: errorMessage });
  }
}

/**
 * Enrich a single trend with news articles, related searches, and PAA questions
 * Uses Google News Search and Google Search APIs via SERP
 *
 * @param trend - The trending topic to enrich
 * @param language - Language code for news articles (he, en, sv, ja)
 * @param maxArticles - Maximum number of news articles to fetch (default: 3)
 * @returns Enriched trend with news_articles, related_searches, people_also_ask
 */
export async function enrichTrendWithNews(
  trend: TrendingTopic,
  language: string = 'en',
  maxArticles: number = 3
): Promise<TrendingTopic> {
  const query = trend.query;

  try {
    // Fetch news articles about the trend
    const newsData = await ky.get('https://serpapi.com/search.json', {
      searchParams: {
        engine: 'google_news',
        q: query,
        hl: language,
        gl: getRegionFromLanguage(language),
        num: maxArticles,
        api_key: process.env.SERPAPI_KEY!
      },
      timeout: 10000,
      retry: 0,
    }).json<any>();

    const newsArticles: NewsArticle[] = (newsData.news_results || [])
      .slice(0, maxArticles)
      .map((article: any) => ({
        title: article.title,
        link: article.link,
        source: article.source?.name || 'Unknown',
        snippet: article.snippet,
        date: article.date,
        thumbnail: article.thumbnail
      }));

    // Fetch related searches and People Also Ask from Google Search
    const searchData = await ky.get('https://serpapi.com/search.json', {
      searchParams: {
        engine: 'google',
        q: query,
        hl: language,
        gl: getRegionFromLanguage(language),
        api_key: process.env.SERPAPI_KEY!
      },
      timeout: 10000,
      retry: 0,
    }).json<any>();

    const relatedSearches: string[] = (searchData.related_searches || [])
      .slice(0, 5)
      .map((rs: any) => rs.query);

    const peopleAlsoAsk: string[] = (searchData.related_questions || [])
      .slice(0, 3)
      .map((paa: any) => paa.question);

    logger.info('SERP', `Enriched "${query}"`, { articles: newsArticles.length, relatedSearches: relatedSearches.length, paa: peopleAlsoAsk.length });

    return {
      ...trend,
      news_articles: newsArticles,
      related_searches: relatedSearches,
      people_also_ask: peopleAlsoAsk,
      enriched_at: new Date().toISOString()
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('SERP', `Failed to enrich trend "${query}"`, { error: errorMessage });

    // Return trend without enrichment on error
    return trend;
  }
}

/**
 * Enrich multiple trends with news articles and related content
 * Rate-limited to avoid API quota exhaustion
 *
 * @param trends - Array of trending topics to enrich
 * @param language - Language code
 * @param maxTrendsToEnrich - Maximum number of trends to enrich (default: 5 for top trends)
 * @returns Array of enriched trends
 */
export async function enrichTrendsWithNews(
  trends: TrendingTopic[],
  language: string = 'en',
  maxTrendsToEnrich: number = 5
): Promise<TrendingTopic[]> {
  if (!process.env.SERPAPI_KEY) {
    logger.warn('SERP', 'SERPAPI_KEY not set, skipping trend enrichment');
    return trends;
  }

  // Only enrich top N trends to save API quota
  const trendsToEnrich = trends.slice(0, maxTrendsToEnrich);
  const trendsToSkip = trends.slice(maxTrendsToEnrich);

  logger.info('SERP', `Enriching ${trendsToEnrich.length}/${trends.length} trends with news & related searches...`);

  // Enrich trends sequentially to avoid rate limiting (add 500ms delay between calls)
  const enrichedTrends: TrendingTopic[] = [];

  for (const trend of trendsToEnrich) {
    const enriched = await enrichTrendWithNews(trend, language);
    enrichedTrends.push(enriched);

    // Small delay to avoid rate limiting (2 requests per trend = 1 second delay)
    if (trendsToEnrich.indexOf(trend) < trendsToEnrich.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return [...enrichedTrends, ...trendsToSkip];
}

/**
 * Map language code to region code for SERP API
 */
function getRegionFromLanguage(language: string): string {
  const languageToRegion: Record<string, string> = {
    'he': 'IL',
    'en': 'US',
    'sv': 'SE',
    'ja': 'JP',
    'es': 'ES'
  };
  return languageToRegion[language] || 'US';
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
 * Count SERP API calls for the current month from the logs table
 * Used for budget monitoring and auto-throttle decisions
 */
export async function getMonthlyApiCallCount(): Promise<number> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const monthStart = firstOfMonth.toISOString().split('T')[0];

    const { count, error } = await supabase
      .from('serp_api_logs')
      .select('*', { count: 'exact', head: true })
      .gte('request_date', monthStart);

    if (error || count === null) {
      return 0;
    }

    return count;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('SERP', 'Failed to get monthly API call count', { error: errorMessage });
    return 0;
  }
}

/**
 * Get remaining monthly budget for SERP API calls
 * Budget defaults to 100 (free tier) unless SERP_MONTHLY_BUDGET is set
 */
export async function getRemainingMonthlyBudget(): Promise<number> {
  const budget = parseInt(process.env.SERP_MONTHLY_BUDGET || '100', 10);
  const used = await getMonthlyApiCallCount();
  return Math.max(0, budget - used);
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
    const data = await ky.get('https://serpapi.com/account.json', {
      searchParams: {
        api_key: process.env.SERPAPI_KEY!
      },
      timeout: 5000,
      retry: 0,
    }).json();

    return {
      healthy: true,
      message: 'SERP API is healthy',
      quotaInfo: data
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      healthy: false,
      message: `SERP API health check failed: ${errorMessage}`
    };
  }
}
