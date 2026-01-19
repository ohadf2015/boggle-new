/**
 * Wikipedia Word Fetcher
 * Fetches interesting words from Wikipedia Featured Content API
 * Used to source quality daily challenge words
 */

import axios from 'axios';
import { getRedisClient } from '../redisClient';
import type { Language } from '@/shared/types/game';

// Wikipedia API User-Agent (required by Wikimedia guidelines)
const WIKIPEDIA_USER_AGENT = 'LexiClash/1.0 (https://lexiclash.com; contact@lexiclash.com)';

// Rate limiting: 50ms between requests (Wikimedia allows ~200 req/s for identified clients)
const RATE_LIMIT_DELAY_MS = 50;
let lastRequestTime = 0;

// Retry configuration for resilience
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

// Cache configuration
const CACHE_TTL = 86400; // 24 hours in seconds
const REDIS_PREFIX = 'wiki:';

/**
 * Featured article from Wikipedia
 */
export interface WikipediaFeaturedArticle {
  title: string;
  displaytitle?: string;
  extract?: string;
  description?: string;
  content_urls?: {
    desktop?: { page?: string };
    mobile?: { page?: string };
  };
}

/**
 * Featured content response from Wikimedia API
 */
export interface WikipediaFeaturedContent {
  tfa?: WikipediaFeaturedArticle; // Today's Featured Article
  mostread?: {
    articles?: WikipediaFeaturedArticle[];
  };
  onthisday?: Array<{
    text?: string;
    pages?: WikipediaFeaturedArticle[];
  }>;
}

/**
 * Random article from Wikipedia
 */
export interface WikipediaRandomArticle {
  title: string;
  extract?: string;
  content_urls?: {
    desktop?: { page?: string };
  };
}

/**
 * Enforce rate limiting between API requests
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
}

/**
 * Fetch with retry logic for resilience
 */
async function fetchWithRetry<T>(
  url: string,
  timeout: number,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await enforceRateLimit();
      const response = await axios.get<T>(url, {
        headers: {
          'User-Agent': WIKIPEDIA_USER_AGENT,
          'Accept': 'application/json'
        },
        timeout
      });
      return response.data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on 404 (content doesn't exist)
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw error;
      }

      // Retry on network errors or timeouts
      if (attempt < retries) {
        console.log(`[Wikipedia] Retry ${attempt + 1}/${retries} after error: ${lastError.message}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Failed after retries');
}

/**
 * Fetch today's featured content from Wikipedia for a specific language
 *
 * @param language - Language code (en, he, sv, ja, es, fr, de)
 * @param date - Date to fetch content for
 * @returns Featured content or null if unavailable
 */
export async function fetchFeaturedContent(
  language: Language,
  date: Date
): Promise<WikipediaFeaturedContent | null> {
  const dateStr = formatDateForApi(date);
  const cacheKey = `${REDIS_PREFIX}featured:${language}:${dateStr}`;
  const redis = getRedisClient();

  try {
    // Check Redis cache first
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`[Wikipedia] Using cached featured content for ${language} from ${dateStr}`);
        return JSON.parse(cached);
      }
    }

    console.log(`[Wikipedia] Fetching featured content for ${language} on ${dateStr}...`);
    const startTime = Date.now();

    // Wikimedia REST API endpoint for featured content
    // Format: /feed/v1/wikipedia/{lang}/featured/{YYYY}/{MM}/{DD}
    const [year, month, day] = dateStr.split('-');
    const url = `https://api.wikimedia.org/feed/v1/wikipedia/${language}/featured/${year}/${month}/${day}`;

    const data = await fetchWithRetry<WikipediaFeaturedContent>(url, 10000);

    const apiResponseTime = Date.now() - startTime;
    console.log(`[Wikipedia] Fetched featured content for ${language} in ${apiResponseTime}ms`);

    // Cache in Redis for 24 hours
    if (redis && data) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
    }

    return data;

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // 404 is common for non-English wikis on certain dates
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.log(`[Wikipedia] No featured content for ${language} on ${dateStr}`);
    } else {
      console.error(`[Wikipedia] Error fetching featured content for ${language}:`, errorMessage);
    }

    return null;
  }
}

/**
 * Fetch random article summaries from Wikipedia
 * Used as fallback when featured content is unavailable
 *
 * @param language - Language code
 * @param count - Number of random articles to fetch
 * @returns Array of random articles
 */
export async function fetchRandomArticles(
  language: Language,
  count: number = 5
): Promise<WikipediaRandomArticle[]> {
  const url = `https://${language}.wikipedia.org/api/rest_v1/page/random/summary`;

  // Fetch articles in parallel for better performance
  const fetchPromises = Array.from({ length: count }, async () => {
    try {
      const response = await axios.get<WikipediaRandomArticle>(url, {
        headers: {
          'User-Agent': WIKIPEDIA_USER_AGENT,
          'Accept': 'application/json'
        },
        timeout: 5000
      });
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Wikipedia] Error fetching random article for ${language}:`, errorMessage);
      return null;
    }
  });

  const results = await Promise.allSettled(fetchPromises);

  return results
    .filter((r): r is PromiseFulfilledResult<WikipediaRandomArticle | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((article): article is WikipediaRandomArticle => article !== null && !!article.title);
}

/**
 * Extract candidate words from Wikipedia featured content
 *
 * @param content - Featured content from Wikipedia
 * @param language - Language code for filtering
 * @returns Array of candidate words
 */
export function extractWordsFromFeaturedContent(
  content: WikipediaFeaturedContent,
  language: Language
): Array<{ word: string; source: string; url?: string }> {
  const candidates: Array<{ word: string; source: string; url?: string }> = [];

  // Extract from Today's Featured Article
  if (content.tfa?.title) {
    const words = extractWordsFromTitle(content.tfa.title, language);
    const url = content.tfa.content_urls?.desktop?.page;
    words.forEach(word => {
      candidates.push({ word, source: 'tfa', url });
    });
  }

  // Extract from Most Read articles
  if (content.mostread?.articles) {
    for (const article of content.mostread.articles.slice(0, 10)) {
      if (article.title) {
        const words = extractWordsFromTitle(article.title, language);
        const url = article.content_urls?.desktop?.page;
        words.forEach(word => {
          candidates.push({ word, source: 'mostread', url });
        });
      }
    }
  }

  // Extract from On This Day events
  if (content.onthisday) {
    for (const event of content.onthisday.slice(0, 5)) {
      if (event.pages) {
        for (const page of event.pages.slice(0, 3)) {
          if (page.title) {
            const words = extractWordsFromTitle(page.title, language);
            const url = page.content_urls?.desktop?.page;
            words.forEach(word => {
              candidates.push({ word, source: 'onthisday', url });
            });
          }
        }
      }
    }
  }

  return candidates;
}

/**
 * Extract valid single words from an article title
 * Handles multi-word titles by splitting and filtering
 *
 * @param title - Article title
 * @param language - Language code for character validation
 * @returns Array of valid single words
 */
function extractWordsFromTitle(title: string, language: Language): string[] {
  const words: string[] = [];

  // Remove parenthetical content like "(film)" or "(disambiguation)"
  const cleanedTitle = title.replace(/\s*\([^)]*\)\s*/g, '').trim();

  if (language === 'ja') {
    // Japanese: Keep the whole title if it's a valid length (2-4 characters)
    // Japanese words are typically kanji compounds
    if (cleanedTitle.length >= 2 && cleanedTitle.length <= 4) {
      if (isValidJapaneseWord(cleanedTitle)) {
        words.push(cleanedTitle);
      }
    }
  } else if (language === 'he') {
    // Hebrew: Split by spaces and filter
    const parts = cleanedTitle.split(/\s+/);
    for (const part of parts) {
      if (isValidHebrewWord(part) && part.length >= 4) {
        words.push(part);
      }
    }
  } else {
    // Latin alphabet languages: Split by spaces and filter
    const parts = cleanedTitle.split(/\s+/);
    for (const part of parts) {
      // Remove possessives and punctuation
      const cleaned = part.replace(/['']s$/i, '').replace(/[.,!?;:'"]/g, '');
      if (isValidLatinWord(cleaned, language) && cleaned.length >= 4 && cleaned.length <= 8) {
        words.push(cleaned.toUpperCase());
      }
    }
  }

  return words;
}

/**
 * Check if a word is valid for Latin alphabet languages
 */
function isValidLatinWord(word: string, language: Language): boolean {
  if (!word || word.length < 4) return false;

  // Language-specific character sets
  const charSets: Record<string, RegExp> = {
    en: /^[A-Za-z]+$/,
    sv: /^[A-Za-zÅÄÖåäö]+$/,
    es: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+$/,
    fr: /^[A-Za-zÀÂÇÉÈÊËÎÏÔÙÛÜŸŒÆàâçéèêëîïôùûüÿœæ]+$/,
    de: /^[A-Za-zÄÖÜßäöü]+$/
  };

  const regex = charSets[language] || charSets.en;
  return regex.test(word);
}

/**
 * Check if a word is valid Hebrew
 */
function isValidHebrewWord(word: string): boolean {
  if (!word || word.length < 4) return false;
  // Hebrew letter range: \u0590-\u05FF
  return /^[\u0590-\u05FF]+$/.test(word);
}

/**
 * Check if a word is valid Japanese (Kanji, Hiragana, or Katakana)
 */
function isValidJapaneseWord(word: string): boolean {
  if (!word || word.length < 2 || word.length > 4) return false;
  // Kanji: \u4E00-\u9FAF, Hiragana: \u3040-\u309F, Katakana: \u30A0-\u30FF
  return /^[\u4E00-\u9FAF\u3040-\u309F\u30A0-\u30FF]+$/.test(word);
}

/**
 * Format date for Wikipedia API (YYYY-MM-DD)
 */
function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Store fetched Wikipedia words in database for later use
 */
export async function storeWikipediaWordCandidates(
  language: Language,
  date: Date,
  candidates: Array<{ word: string; source: string; url?: string; score?: number }>
): Promise<void> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const dateStr = date.toISOString().split('T')[0];

    // Insert candidates (ignore duplicates)
    const insertData = candidates.map(c => ({
      language,
      fetch_date: dateStr,
      word: c.word,
      source_article_title: c.source,
      source_article_url: c.url,
      interestingness_score: c.score || 50,
      validation_status: 'pending'
    }));

    const { error } = await supabase
      .from('wikipedia_word_candidates')
      .upsert(insertData, {
        onConflict: 'language,word,fetch_date',
        ignoreDuplicates: true
      });

    if (error) {
      console.error('[Wikipedia] Error storing candidates:', error.message);
    } else {
      console.log(`[Wikipedia] Stored ${candidates.length} word candidates for ${language}`);
    }

  } catch (error) {
    console.error('[Wikipedia] Error storing word candidates:', error);
  }
}

/**
 * Get validated Wikipedia words from database
 */
export async function getValidatedWikipediaWords(
  language: Language,
  date: Date,
  limit: number = 10
): Promise<Array<{ word: string; url?: string; score: number }>> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const dateStr = date.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('wikipedia_word_candidates')
      .select('word, source_article_url, interestingness_score')
      .eq('language', language)
      .eq('fetch_date', dateStr)
      .eq('validation_status', 'valid')
      .order('interestingness_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Wikipedia] Error fetching validated words:', error.message);
      return [];
    }

    return (data || []).map(d => ({
      word: d.word,
      url: d.source_article_url,
      score: d.interestingness_score
    }));

  } catch (error) {
    console.error('[Wikipedia] Error fetching validated words:', error);
    return [];
  }
}
