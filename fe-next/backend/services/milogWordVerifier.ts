/**
 * Milog Word Verifier Service
 * Verifies Hebrew words against milog.co.il dictionary
 * Used to enrich the Hebrew dictionary with community-submitted words
 */

import axios from 'axios';
import { getRedisClient } from '../redisClient';

// User-Agent for requests (be a good citizen)
const MILOG_USER_AGENT = 'LexiClash/1.0 (https://lexiclash.com; contact@lexiclash.com)';

// Rate limiting: 1 request per second (be respectful to the service)
export const MILOG_RATE_LIMIT_MS = 1000;
let lastRequestTime = 0;

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

// Cache configuration
const CACHE_TTL = 86400 * 7; // 7 days - word existence doesn't change often
const REDIS_PREFIX = 'milog:';
const REDIS_TIMEOUT_MS = 2000;

/**
 * Result of verifying a word on milog.co.il
 */
export interface MilogVerificationResult {
  verified: boolean;
  status: 'verified' | 'not_found' | 'error';
  definitionCount: number;
  url?: string;
  error?: string;
}

/**
 * Parse milog.co.il HTML to determine if word has definitions
 * Word exists if page contains links with pattern /word/e_[id]
 */
export function parseVerificationResult(html: string, word: string): MilogVerificationResult {
  if (!html) {
    return { verified: false, status: 'not_found', definitionCount: 0 };
  }

  // Look for definition links: /word/e_[numeric_id]
  // Pattern: milog.co.il/[any-chars]/e_[digits]
  // We use a simple pattern that catches any link to milog with /e_[number]
  const linkPattern = /milog\.co\.il\/[^\/]+\/e_\d+/gi;

  const matches = html.match(linkPattern);
  const definitionCount = matches ? matches.length : 0;

  if (definitionCount > 0) {
    const encodedWord = encodeURIComponent(word);
    return {
      verified: true,
      status: 'verified',
      definitionCount,
      url: `https://milog.co.il/${encodedWord}`,
    };
  }

  return { verified: false, status: 'not_found', definitionCount: 0 };
}

/**
 * Enforce rate limiting between requests
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MILOG_RATE_LIMIT_MS) {
    await new Promise(resolve =>
      setTimeout(resolve, MILOG_RATE_LIMIT_MS - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
}

/**
 * Fetch with retry logic for resilience
 */
async function fetchWithRetry(
  url: string,
  timeout: number,
  retries: number = MAX_RETRIES
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await enforceRateLimit();
      const response = await axios.get<string>(url, {
        headers: {
          'User-Agent': MILOG_USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'he,en;q=0.9',
        },
        timeout,
        responseType: 'text',
      });
      return response.data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on 404 (word doesn't exist)
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw error;
      }

      // Retry on network errors or timeouts
      if (attempt < retries) {
        console.log(`[Milog] Retry ${attempt + 1}/${retries} after error: ${lastError.message}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Failed after retries');
}

/**
 * Verify a Hebrew word exists on milog.co.il
 * Uses caching to avoid repeated requests for same word
 */
export async function verifyWordOnMilog(word: string): Promise<MilogVerificationResult> {
  const cacheKey = `${REDIS_PREFIX}${word}`;
  const redis = getRedisClient();

  // Check Redis cache first
  if (redis) {
    try {
      const cached = await Promise.race([
        redis.get(cacheKey),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Redis timeout')), REDIS_TIMEOUT_MS)
        ),
      ]);

      if (cached) {
        console.log(`[Milog] Using cached result for "${word}"`);
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      console.warn(`[Milog] Redis cache check failed:`, cacheError instanceof Error ? cacheError.message : 'Unknown error');
    }
  }

  try {
    const url = `https://milog.co.il/${encodeURIComponent(word)}`;
    console.log(`[Milog] Verifying word: ${word}`);

    const html = await fetchWithRetry(url, 10000);
    const result = parseVerificationResult(html, word);

    // Cache the result
    if (redis) {
      try {
        await Promise.race([
          redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result)),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Redis timeout')), REDIS_TIMEOUT_MS)
          ),
        ]);
      } catch (cacheWriteError) {
        console.warn(`[Milog] Redis cache write failed:`, cacheWriteError instanceof Error ? cacheWriteError.message : 'Unknown error');
      }
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Milog] Error verifying word "${word}":`, errorMessage);

    // On 404, word definitely doesn't exist
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      const result: MilogVerificationResult = {
        verified: false,
        status: 'not_found',
        definitionCount: 0,
      };

      // Cache "not found" result too
      if (redis) {
        try {
          await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
        } catch {
          // Ignore cache errors
        }
      }

      return result;
    }

    return {
      verified: false,
      status: 'error',
      definitionCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * Options for processing the verification queue
 */
export interface ProcessQueueOptions {
  batchSize?: number;
  minSubmissions?: number;
  maxAttempts?: number;
}

/**
 * Result of processing the verification queue
 */
export interface ProcessQueueResult {
  processed: number;
  verified: number;
  notFound: number;
  errors: number;
}

/**
 * Process the milog verification queue from Supabase
 * Fetches pending words, verifies them, and updates results
 */
export async function processMilogVerificationQueue(
  options: ProcessQueueOptions = {}
): Promise<ProcessQueueResult> {
  const { batchSize = 50, minSubmissions = 1, maxAttempts = 3 } = options;

  const result: ProcessQueueResult = {
    processed: 0,
    verified: 0,
    notFound: 0,
    errors: 0,
  };

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch words from queue
    const { data: words, error: fetchError } = await supabase.rpc(
      'get_milog_verification_queue',
      {
        p_batch_size: batchSize,
        p_min_submissions: minSubmissions,
        p_max_attempts: maxAttempts,
      }
    );

    if (fetchError) {
      console.error('[Milog] Error fetching verification queue:', fetchError.message);
      throw fetchError;
    }

    if (!words || words.length === 0) {
      console.log('[Milog] No words in verification queue');
      return result;
    }

    console.log(`[Milog] Processing ${words.length} words from queue`);

    // Process each word
    for (const wordRecord of words) {
      try {
        const verificationResult = await verifyWordOnMilog(wordRecord.word);

        // Update database with result
        const { error: updateError } = await supabase.rpc('update_milog_verification', {
          p_word_id: wordRecord.id,
          p_status: verificationResult.status,
          p_url: verificationResult.url || null,
          p_error: verificationResult.error || null,
        });

        if (updateError) {
          console.error(`[Milog] Error updating verification for "${wordRecord.word}":`, updateError.message);
          result.errors++;
        } else {
          result.processed++;
          if (verificationResult.verified) {
            result.verified++;
            console.log(`[Milog] ✓ Verified: ${wordRecord.word}`);
          } else if (verificationResult.status === 'not_found') {
            result.notFound++;
            console.log(`[Milog] ✗ Not found: ${wordRecord.word}`);
          } else {
            result.errors++;
          }
        }
      } catch (wordError) {
        console.error(`[Milog] Error processing word "${wordRecord.word}":`, wordError);
        result.errors++;
      }
    }

    console.log(`[Milog] Queue processing complete: ${result.verified} verified, ${result.notFound} not found, ${result.errors} errors`);
    return result;
  } catch (error) {
    console.error('[Milog] Error processing verification queue:', error);
    throw error;
  }
}

/**
 * Get verified words that need to be promoted to dictionary
 */
export async function getVerifiedWordsForPromotion(
  limit: number = 100
): Promise<Array<{ id: string; word: string; url: string | null }>> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.rpc('get_milog_verified_words', {
      p_limit: limit,
    });

    if (error) {
      console.error('[Milog] Error fetching verified words:', error.message);
      return [];
    }

    return (data || []).map((d: { id: string; word: string; milog_url: string | null }) => ({
      id: d.id,
      word: d.word,
      url: d.milog_url,
    }));
  } catch (error) {
    console.error('[Milog] Error fetching verified words:', error);
    return [];
  }
}

/**
 * Mark a word as promoted to dictionary
 */
export async function markWordPromoted(wordId: string): Promise<boolean> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.rpc('mark_word_promoted_to_dictionary', {
      p_word_id: wordId,
    });

    if (error) {
      console.error('[Milog] Error marking word as promoted:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Milog] Error marking word as promoted:', error);
    return false;
  }
}
