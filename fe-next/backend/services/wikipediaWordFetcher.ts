/**
 * Wikipedia Word Fetcher
 * Fetches interesting words from Wikipedia Featured Content API
 * Used to source quality daily challenge words
 */

import ky, { HTTPError } from 'ky';
import { getRedisClient } from '../redisClient';
import type { Language } from '@/shared/types/game';
import logger from '../utils/logger';

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
const REDIS_TIMEOUT_MS = 2000; // 2 second timeout for Redis operations

/**
 * Stopwords by language - common words that should be filtered out when extracting from text
 * These are words that appear frequently but don't make interesting game words
 */
const STOPWORDS: Record<string, Set<string>> = {
  en: new Set([
    'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR',
    'OUT', 'HIS', 'HAS', 'HAD', 'ITS', 'SAY', 'SHE', 'TWO', 'WAY', 'WHO', 'DID', 'GET', 'HIM',
    'HOW', 'MAN', 'NEW', 'NOW', 'OLD', 'SEE', 'WAY', 'BOY', 'DAY', 'ANY', 'MAY', 'OWN',
    'BEEN', 'CALL', 'COME', 'COULD', 'EACH', 'FIND', 'FROM', 'HAVE', 'INTO', 'JUST', 'KNOW',
    'LIKE', 'LONG', 'LOOK', 'MADE', 'MAKE', 'MANY', 'MORE', 'MOST', 'MUCH', 'MUST', 'NAME',
    'ONLY', 'OVER', 'PART', 'SAID', 'SAME', 'SOME', 'SUCH', 'TAKE', 'THAN', 'THAT', 'THEM',
    'THEN', 'THERE', 'THESE', 'THEY', 'THIS', 'TIME', 'UPON', 'VERY', 'WANT', 'WELL', 'WENT',
    'WERE', 'WHAT', 'WHEN', 'WHERE', 'WHICH', 'WHILE', 'WITH', 'WORD', 'WORK', 'WOULD', 'YEAR',
    'YOUR', 'ALSO', 'BACK', 'BEING', 'BOTH', 'FIRST', 'GOOD', 'GREAT', 'THEIR', 'AFTER',
    'ABOUT', 'BEFORE', 'BETWEEN', 'DOES', 'DOWN', 'EVEN', 'HERE', 'HIGH', 'LAST', 'LEFT',
    'LIFE', 'LITTLE', 'LIVE', 'PLACE', 'POINT', 'RIGHT', 'SHOW', 'STILL', 'UNDER', 'WORLD',
    'AMERICAN', 'KNOWN', 'YEARS', 'SINCE', 'LATER', 'DURING', 'EARLY', 'OFTEN', 'THROUGH'
  ]),
  he: new Set([
    'של', 'את', 'על', 'עם', 'הוא', 'היא', 'הם', 'הן', 'זה', 'זאת', 'אלה', 'אלו',
    'כל', 'גם', 'עוד', 'רק', 'או', 'כי', 'אם', 'לא', 'כן', 'אך', 'אבל', 'מאוד',
    'כמו', 'יותר', 'פחות', 'בין', 'לפני', 'אחרי', 'תחת', 'מעל', 'ליד', 'סביב'
  ]),
  sv: new Set([
    'OCH', 'ATT', 'DET', 'SOM', 'HAR', 'MED', 'AV', 'FÖR', 'VAR', 'TILL', 'INTE', 'KAN',
    'OM', 'ETT', 'MEN', 'HAN', 'HON', 'DE', 'VI', 'NI', 'DEM', 'SÅ', 'NU', 'NÄR', 'HUR',
    'VARA', 'HADE', 'SKULLE', 'KUNDE', 'FINNS', 'FRÅN', 'EFTER', 'UNDER', 'ÖVER', 'OCKSÅ'
  ]),
  ja: new Set([
    'これ', 'それ', 'あれ', 'この', 'その', 'あの', 'ここ', 'そこ', 'あそこ',
    'こちら', 'どこ', 'だれ', 'なに', 'なん', 'ある', 'いる', 'する', 'なる'
  ]),
  es: new Set([
    'QUE', 'DE', 'EN', 'UN', 'SER', 'SE', 'NO', 'HABER', 'POR', 'CON', 'SU', 'PARA',
    'COMO', 'ESTAR', 'TENER', 'LE', 'LO', 'TODO', 'PERO', 'MÁS', 'HACER', 'PODER',
    'ESO', 'ESTE', 'DECIR', 'ELLA', 'ENTRE', 'CUANDO', 'MUY', 'SIN', 'SOBRE', 'TAMBIÉN',
    'DESPUÉS', 'ANTES', 'OTRO', 'CADA', 'MISMO', 'DESDE', 'DONDE', 'QUIEN', 'DURANTE'
  ]),
  fr: new Set([
    'QUE', 'LES', 'DES', 'EST', 'UN', 'UNE', 'DANS', 'QUI', 'NE', 'SUR', 'SE', 'PAS',
    'PLUS', 'PAR', 'CE', 'IL', 'ELLE', 'SON', 'DEUX', 'SI', 'MAIS', 'NOUS', 'COMME',
    'OU', 'LEUR', 'BIEN', 'ALORS', 'CES', 'SANS', 'ÊTRE', 'FAIT', 'ONT', 'ÉTÉ',
    'CETTE', 'TOUT', 'PEUT', 'APRÈS', 'AUSSI', 'AUTRE', 'ENTRE', 'QUAND', 'MÊME'
  ]),
  de: new Set([
    'UND', 'DER', 'DIE', 'DEN', 'DEM', 'DAS', 'EIN', 'EINE', 'EINER', 'EINEM', 'EINEN',
    'IST', 'SIND', 'WAR', 'WAREN', 'HAT', 'HABEN', 'WIRD', 'WERDEN', 'KANN', 'KÖNNEN',
    'MIT', 'ALS', 'FÜR', 'AUF', 'NICHT', 'VON', 'SIE', 'BEI', 'AUCH', 'NACH', 'VOR',
    'ÜBER', 'ABER', 'ODER', 'WENN', 'NOCH', 'DURCH', 'NUR', 'SEIN', 'IHRE', 'IHREN'
  ])
};

/**
 * Featured article from Wikipedia
 * Includes fields from the Wikimedia REST API response
 */
export interface WikipediaFeaturedArticle {
  title: string;
  displaytitle?: string;
  extract?: string;
  description?: string;
  normalizedtitle?: string;
  titles?: {
    canonical?: string;
    normalized?: string;
    display?: string;
  };
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
      return await ky.get(url, {
        headers: {
          'User-Agent': WIKIPEDIA_USER_AGENT,
          'Accept': 'application/json'
        },
        timeout,
        retry: 0,
      }).json<T>();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on 404 (content doesn't exist)
      if (error instanceof HTTPError && error.response.status === 404) {
        throw error;
      }

      // Retry on network errors or timeouts
      if (attempt < retries) {
        logger.info('Wikipedia', `Retry ${attempt + 1}/${retries} after error: ${lastError.message}`);
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
    // Check Redis cache first (with timeout to prevent hanging)
    if (redis) {
      try {
        const cached = await Promise.race([
          redis.get(cacheKey),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Redis cache check timeout')), REDIS_TIMEOUT_MS)
          )
        ]);
        if (cached) {
          logger.debug('Wikipedia', `Using cached featured content for ${language} from ${dateStr}`);
          return JSON.parse(cached);
        }
      } catch (cacheError) {
        // Log but continue without cache - don't let Redis issues block Wikipedia fetch
        logger.warn('Wikipedia', `Redis cache check failed for ${language}`, { error: cacheError instanceof Error ? cacheError.message : 'Unknown error' });
      }
    }

    logger.info('Wikipedia', `Fetching featured content for ${language} on ${dateStr}...`);
    const startTime = Date.now();

    // Wikimedia REST API endpoint for featured content
    // Format: /feed/v1/wikipedia/{lang}/featured/{YYYY}/{MM}/{DD}
    const [year, month, day] = dateStr.split('-');
    const url = `https://api.wikimedia.org/feed/v1/wikipedia/${language}/featured/${year}/${month}/${day}`;

    // Increased timeout to 30s to reduce retry overhead (Wikipedia API can be slow)
    // With 2 retries: worst case = 30s + 500ms + 30s + 1000ms = ~62s total
    const data = await fetchWithRetry<WikipediaFeaturedContent>(url, 30000);

    const apiResponseTime = Date.now() - startTime;
    logger.info('Wikipedia', `Fetched featured content for ${language} in ${apiResponseTime}ms`);

    // Cache in Redis for 24 hours (with timeout to prevent hanging)
    if (redis && data) {
      try {
        await Promise.race([
          redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data)),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Redis cache write timeout')), REDIS_TIMEOUT_MS)
          )
        ]);
      } catch (cacheWriteError) {
        // Log but don't fail - data was fetched successfully
        logger.warn('Wikipedia', `Redis cache write failed for ${language}`, { error: cacheWriteError instanceof Error ? cacheWriteError.message : 'Unknown error' });
      }
    }

    return data;

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // 404 is common for non-English wikis on certain dates
    if (error instanceof HTTPError && error.response.status === 404) {
      logger.info('Wikipedia', `No featured content for ${language} on ${dateStr}`);
    } else {
      logger.error('Wikipedia', `Error fetching featured content for ${language}`, { error: errorMessage });
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
      return await ky.get(url, {
        headers: {
          'User-Agent': WIKIPEDIA_USER_AGENT,
          'Accept': 'application/json'
        },
        timeout: 5000,
        retry: 0,
      }).json<WikipediaRandomArticle>();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Wikipedia', `Error fetching random article for ${language}`, { error: errorMessage });
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
 * Now extracts from titles, extracts (summaries), and descriptions
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
  const seenWords = new Set<string>();

  // Helper to add unique candidates
  const addCandidates = (newCandidates: Array<{ word: string; source: string; url?: string }>) => {
    for (const candidate of newCandidates) {
      if (!seenWords.has(candidate.word)) {
        seenWords.add(candidate.word);
        candidates.push(candidate);
      }
    }
  };

  // Extract from Today's Featured Article (highest quality)
  if (content.tfa) {
    const tfaCandidates = extractWordsFromArticle(content.tfa, language, 'tfa');
    addCandidates(tfaCandidates);
  }

  // Extract from Most Read articles (trending/popular)
  if (content.mostread?.articles) {
    for (const article of content.mostread.articles.slice(0, 10)) {
      const mostreadCandidates = extractWordsFromArticle(article, language, 'mostread');
      addCandidates(mostreadCandidates);
    }
  }

  // Extract from On This Day events (historical interest)
  if (content.onthisday) {
    for (const event of content.onthisday.slice(0, 5)) {
      if (event.pages) {
        for (const page of event.pages.slice(0, 3)) {
          const onthisdayCandidates = extractWordsFromArticle(page, language, 'onthisday');
          addCandidates(onthisdayCandidates);
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
 * @param title - Article title (may have underscores from URL format)
 * @param language - Language code for character validation
 * @returns Array of valid single words
 */
function extractWordsFromTitle(title: string, language: Language): string[] {
  const words: string[] = [];

  // Replace underscores with spaces (Wikipedia URL format)
  // Remove parenthetical content like "(film)" or "(disambiguation)"
  const cleanedTitle = title
    .replace(/_/g, ' ')
    .replace(/\s*\([^)]*\)\s*/g, '')
    .trim();

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
 * Check if a word is a stopword for the given language
 * Stopwords are common words that should be filtered out
 */
export function isStopword(word: string, language: Language): boolean {
  const stopwords = STOPWORDS[language] || STOPWORDS.en;
  return stopwords.has(word.toUpperCase());
}

/**
 * Get the normalized title from a Wikipedia article
 * Falls back to title with underscores replaced by spaces
 */
function getNormalizedTitle(article: WikipediaFeaturedArticle): string {
  return article.titles?.normalized ||
         article.normalizedtitle ||
         article.title?.replace(/_/g, ' ') ||
         '';
}

/**
 * Extract valid words from a text string (extract, description, etc.)
 * Filters out stopwords and validates word format
 *
 * @param text - Text to extract words from
 * @param language - Language code for filtering
 * @param maxWords - Maximum number of words to return
 * @returns Array of valid words
 */
export function extractWordsFromText(
  text: string,
  language: Language,
  maxWords: number = 10
): string[] {
  if (!text) return [];

  const words: string[] = [];
  const seenWords = new Set<string>();

  // Split text into words and clean up
  const rawWords = text.split(/\s+/);

  for (const rawWord of rawWords) {
    if (words.length >= maxWords) break;

    // Remove punctuation and clean the word
    const cleaned = rawWord
      .replace(/[.,!?;:'"()\[\]{}]/g, '')
      .replace(/['']s$/i, '')
      .trim();

    if (!cleaned) continue;

    // Language-specific validation and normalization
    let normalizedWord: string;

    if (language === 'ja') {
      // Japanese: Validate character set
      if (!isValidJapaneseWord(cleaned)) continue;
      normalizedWord = cleaned;
    } else if (language === 'he') {
      // Hebrew: Validate character set
      if (!isValidHebrewWord(cleaned)) continue;
      normalizedWord = cleaned;
    } else {
      // Latin languages: Validate and uppercase
      if (!isValidLatinWord(cleaned, language)) continue;
      if (cleaned.length < 4 || cleaned.length > 8) continue;
      normalizedWord = cleaned.toUpperCase();
    }

    // Skip stopwords
    if (isStopword(normalizedWord, language)) continue;

    // Skip duplicates
    if (seenWords.has(normalizedWord)) continue;
    seenWords.add(normalizedWord);

    words.push(normalizedWord);
  }

  return words;
}

/**
 * Extract words from a Wikipedia article (title, extract, and description)
 *
 * @param article - Wikipedia article object
 * @param language - Language code for filtering
 * @param source - Source identifier (tfa, mostread, onthisday)
 * @returns Array of candidate words with source info
 */
function extractWordsFromArticle(
  article: WikipediaFeaturedArticle,
  language: Language,
  source: string
): Array<{ word: string; source: string; url?: string }> {
  const candidates: Array<{ word: string; source: string; url?: string }> = [];
  const url = article.content_urls?.desktop?.page;
  const seenWords = new Set<string>();

  // 1. Extract from normalized title (highest priority)
  const title = getNormalizedTitle(article);
  if (title) {
    const titleWords = extractWordsFromTitle(title, language);
    for (const word of titleWords) {
      if (!seenWords.has(word)) {
        seenWords.add(word);
        candidates.push({ word, source: `${source}_title`, url });
      }
    }
  }

  // 2. Extract from extract (article summary) - many good words here
  if (article.extract) {
    const extractWords = extractWordsFromText(article.extract, language, 5);
    for (const word of extractWords) {
      if (!seenWords.has(word)) {
        seenWords.add(word);
        candidates.push({ word, source: `${source}_extract`, url });
      }
    }
  }

  // 3. Extract from description (short context words)
  if (article.description) {
    const descWords = extractWordsFromText(article.description, language, 3);
    for (const word of descWords) {
      if (!seenWords.has(word)) {
        seenWords.add(word);
        candidates.push({ word, source: `${source}_desc`, url });
      }
    }
  }

  return candidates;
}

/**
 * Format date for Wikipedia API (YYYY-MM-DD)
 */
function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Batch size for database operations to prevent timeout
// Supabase performs well with batches of 500 or fewer records
const BATCH_SIZE = 500;

/**
 * Store fetched Wikipedia words in the UNIFIED WORD BANK
 * All Wikipedia candidates are stored with 'pending' validation status for admin review
 * Uses batching to prevent timeout on large datasets (e.g., 2687 words in en.json)
 *
 * NOTE: This now writes to daily_challenge_word_bank (unified) instead of wikipedia_word_candidates (staging)
 */
export async function storeWikipediaWordCandidates(
  language: Language,
  _date: Date,
  candidates: Array<{ word: string; source: string; url?: string; score?: number }>
): Promise<void> {
  if (candidates.length === 0) {
    logger.info('Wikipedia', `No candidates to store for ${language}`);
    return;
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Prepare all insert data for UNIFIED WORD BANK. Only columns that exist
    // on daily_challenge_word_bank (061_daily_challenge_word_bank.sql +
    // 20260630160000_word_bank_judged_trust.sql) — a prior version of this
    // mapping included validation_status/source_article_title/
    // source_article_url/interestingness_score/fetch_date, none of which are
    // real columns, so Supabase rejected every upsert (Sentry: "[Wikipedia]
    // Batch upsert error" + "Stored 0/50 candidates" for en/es/sv/he).
    const insertData = candidates.map(c => ({
      word: c.word.toUpperCase(),
      language,
      source: 'wikipedia' as const,
      status: 'active' as const,
    }));

    // Process in batches to prevent timeout on large datasets
    const totalBatches = Math.ceil(insertData.length / BATCH_SIZE);
    let successCount = 0;
    let errorCount = 0;

    logger.info('Wikipedia', `Storing ${candidates.length} candidates for ${language} in ${totalBatches} batch(es) to unified word bank`);

    for (let i = 0; i < insertData.length; i += BATCH_SIZE) {
      const batch = insertData.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      try {
        // Upsert to unified word bank - (word, language) is the unique constraint
        // ignoreDuplicates: false allows updates to existing records (re-syncing updates metadata)
        const { error } = await supabase
          .from('daily_challenge_word_bank')
          .upsert(batch, {
            onConflict: 'word,language',
            ignoreDuplicates: false
          });

        if (error) {
          // Log but don't throw - continue with other batches
          logger.error('Wikipedia', `Batch ${batchNum}/${totalBatches} upsert error for ${language}`, { error: error.message });
          errorCount += batch.length;
        } else {
          successCount += batch.length;
        }
      } catch (batchError) {
        // Catch any unexpected errors and continue processing
        const errorMsg = batchError instanceof Error ? batchError.message : 'Unknown error';
        logger.error('Wikipedia', `Batch ${batchNum}/${totalBatches} processing error for ${language}`, { error: errorMsg });
        errorCount += batch.length;
        // Continue with next batch
      }
    }

    if (errorCount > 0) {
      logger.warn('Wikipedia', `Stored ${successCount}/${candidates.length} candidates for ${language}`, { errorCount });
    } else {
      logger.info('Wikipedia', `Stored ${candidates.length} word candidates for ${language} in unified word bank`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Wikipedia', 'Error storing word candidates', { error: errorMessage });
  }
}

/**
 * Get validated Wikipedia words from the UNIFIED WORD BANK
 * NOTE: Now reads from daily_challenge_word_bank instead of wikipedia_word_candidates
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

    // Query unified word bank for approved Wikipedia words
    const { data, error } = await supabase
      .from('daily_challenge_word_bank')
      .select('word, source_article_url, interestingness_score')
      .eq('language', language)
      .eq('source', 'wikipedia')
      .eq('validation_status', 'approved')
      .eq('fetch_date', dateStr)
      .order('interestingness_score', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      logger.error('Wikipedia', 'Error fetching validated words', { error: error.message });
      return [];
    }

    return (data || []).map(d => ({
      word: d.word,
      url: d.source_article_url,
      score: d.interestingness_score || 50
    }));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Wikipedia', 'Error fetching validated words', { error: errorMessage });
    return [];
  }
}
