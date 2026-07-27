/**
 * Milog Word Verifier Service
 * Verifies Hebrew words against milog.co.il dictionary
 * Used to enrich the Hebrew dictionary with community-submitted words
 */

import ky, { HTTPError } from 'ky';
import { getRedisClient } from '../redisClient';
import logger from '../utils/logger';

// User-Agent for requests (be a good citizen)
const MILOG_USER_AGENT = 'LexiClash/1.0 (https://www.lexiclash.live; contact@lexiclash.live)';

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
 * Word type classification from Milog HTML
 */
export type MilogWordType =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'pronoun'
  | 'numeral'
  | 'interjection'
  | 'abbreviation'
  | 'proper_name'
  | 'unknown';

// Hebrew labels -> accepted word types (valid for gameplay)
const ACCEPTED_WORD_TYPES: Record<string, MilogWordType> = {
  'שם עצם': 'noun',
  'פועל': 'verb',
  'שם תואר': 'adjective',
  'תואר הפועל': 'adverb',
  'מילת יחס': 'preposition',
  'מילת חיבור': 'conjunction',
  'כינוי': 'pronoun',
  'שם מספר': 'numeral',
  'מילת קריאה': 'interjection',
};

// Hebrew labels -> rejected word types (not valid for gameplay)
const REJECTED_WORD_TYPES: Record<string, MilogWordType> = {
  'ראשי תיבות': 'abbreviation',
  'שם פרטי': 'proper_name',
};

const ACCEPTED_TYPE_VALUES = new Set(Object.values(ACCEPTED_WORD_TYPES));
const REJECTED_TYPE_VALUES = new Set(Object.values(REJECTED_WORD_TYPES));

/**
 * Result of verifying a word on milog.co.il
 */
export interface MilogVerificationResult {
  verified: boolean;
  status: 'verified' | 'not_found' | 'error' | 'rejected_type' | 'needs_review';
  definitionCount: number;
  url?: string;
  error?: string;
  wordType?: MilogWordType;
  wordTypeRaw?: string;
  rejectedReason?: string;
}

// All types sorted by label length descending (longer/more-specific labels match first)
// This prevents "פועל" matching before "תואר הפועל"
const ALL_TYPES_BY_LENGTH = [
  ...Object.entries(REJECTED_WORD_TYPES),
  ...Object.entries(ACCEPTED_WORD_TYPES),
].sort((a, b) => b[0].length - a[0].length);

/**
 * Extract word type from text surrounding a definition link.
 * Milog shows types like: "שָׁלוֹם - שם עצם, זכר"
 */
function extractWordType(text: string): { type: MilogWordType; raw: string } | null {
  for (const [label, type] of ALL_TYPES_BY_LENGTH) {
    if (text.includes(label)) return { type, raw: label };
  }
  return null;
}

/**
 * Parse milog.co.il HTML to determine if word has definitions.
 * Checks word type to reject abbreviations and proper names.
 */
// Minimum word length for gameplay (single letters have definitions on Milog but aren't game words)
const MIN_WORD_LENGTH = 2;

export function parseVerificationResult(html: string, word: string): MilogVerificationResult {
  if (!html) {
    return { verified: false, status: 'not_found', definitionCount: 0 };
  }

  // Reject words that are too short for gameplay
  if (word.length < MIN_WORD_LENGTH) {
    return {
      verified: false, status: 'rejected_type', definitionCount: 0,
      rejectedReason: `Word is too short for gameplay (minimum ${MIN_WORD_LENGTH} letters)`,
    };
  }

  const linkPattern = /milog\.co\.il\/[^/]+\/e_\d+/gi;
  const matches = html.match(linkPattern);
  const definitionCount = matches ? matches.length : 0;

  if (definitionCount === 0) {
    return { verified: false, status: 'not_found', definitionCount: 0 };
  }

  const encodedWord = encodeURIComponent(word);
  const url = `https://milog.co.il/${encodedWord}`;

  // Extract word types from <a> tags containing /e_\d+ links
  const linkWithTextPattern = /<a[^>]*href="[^"]*\/e_\d+"[^>]*>([^<]*)<\/a>/gi;
  const foundTypes: { type: MilogWordType; raw: string }[] = [];
  let linkMatch: RegExpExecArray | null;

  while ((linkMatch = linkWithTextPattern.exec(html)) !== null) {
    const linkText = linkMatch[1];
    const afterStart = linkMatch.index + linkMatch[0].length;
    const afterText = html.substring(afterStart, afterStart + 100);
    const combined = linkText + ' ' + afterText;

    const typeInfo = extractWordType(combined);
    if (typeInfo) foundTypes.push(typeInfo);
  }

  // Strict decision: reject if ANY rejected type found (abbreviation/proper_name)
  // This prevents abbreviations that also have non-abbreviation definitions from leaking through
  const rejectedEntry = foundTypes.find(t => REJECTED_TYPE_VALUES.has(t.type));
  const acceptedEntry = foundTypes.find(t => ACCEPTED_TYPE_VALUES.has(t.type));

  if (rejectedEntry) {
    return {
      verified: false, status: 'rejected_type', definitionCount, url,
      wordType: rejectedEntry.type, wordTypeRaw: rejectedEntry.raw,
      rejectedReason: `Word type '${rejectedEntry.type}' is not accepted for gameplay`,
    };
  }

  if (acceptedEntry) {
    return {
      verified: true, status: 'verified', definitionCount, url,
      wordType: acceptedEntry.type, wordTypeRaw: acceptedEntry.raw,
    };
  }

  // Default-deny on unknown POS (audit H3): if the parser can't classify the
  // type but Milog has links, park for human review instead of permissively
  // promoting. Prevents abbreviation/proper-name leaks when Milog markup shifts.
  return {
    verified: false, status: 'needs_review', definitionCount, url, wordType: 'unknown',
    rejectedReason: 'word type could not be determined — needs human review',
  };
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
      return await ky.get(url, {
        headers: {
          'User-Agent': MILOG_USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'he,en;q=0.9',
        },
        timeout,
        retry: 0,
      }).text();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on 404 (word doesn't exist)
      if (error instanceof HTTPError && error.response.status === 404) {
        throw error;
      }

      // Retry on network errors or timeouts
      if (attempt < retries) {
        logger.info('Milog', `Retry ${attempt + 1}/${retries} after error: ${lastError.message}`);
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
        logger.debug('Milog', `Using cached result for "${word}"`);
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      logger.warn('Milog', 'Redis cache check failed', { error: cacheError instanceof Error ? cacheError.message : 'Unknown error' });
    }
  }

  try {
    const url = `https://milog.co.il/${encodeURIComponent(word)}`;
    logger.info('Milog', `Verifying word: ${word}`);

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
        logger.warn('Milog', 'Redis cache write failed', { error: cacheWriteError instanceof Error ? cacheWriteError.message : 'Unknown error' });
      }
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Milog', `Error verifying word "${word}"`, { error: errorMessage });

    // On 404, word definitely doesn't exist
    if (error instanceof HTTPError && error.response.status === 404) {
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
  rejectedType: number;
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
    rejectedType: 0,
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
      logger.error('Milog', 'Error fetching verification queue', { error: fetchError.message });
      throw fetchError;
    }

    if (!words || words.length === 0) {
      logger.info('Milog', 'No words in verification queue');
      return result;
    }

    logger.info('Milog', `Processing ${words.length} words from queue`);

    // Process each word
    for (const wordRecord of words) {
      try {
        const verificationResult = await verifyWordOnMilog(wordRecord.word);

        // Update database with result (including word type info)
        const { error: updateError } = await supabase.rpc('update_milog_verification', {
          p_word_id: wordRecord.id,
          p_status: verificationResult.status,
          p_url: verificationResult.url || null,
          p_error: verificationResult.error || null,
          p_word_type: verificationResult.wordType || null,
          p_rejected_reason: verificationResult.rejectedReason || null,
        });

        if (updateError) {
          logger.error('Milog', `Error updating verification for "${wordRecord.word}"`, { error: updateError.message });
          result.errors++;
        } else {
          result.processed++;
          if (verificationResult.verified) {
            result.verified++;
            logger.info('Milog', `Verified: ${wordRecord.word}`, { wordType: verificationResult.wordType || 'unknown' });
          } else if (verificationResult.status === 'rejected_type') {
            result.rejectedType++;
            logger.info('Milog', `Rejected type: ${wordRecord.word}`, { wordType: verificationResult.wordType });
          } else if (verificationResult.status === 'not_found') {
            result.notFound++;
            logger.info('Milog', `Not found: ${wordRecord.word}`);
          } else {
            result.errors++;
          }
        }
      } catch (wordError) {
        logger.error('Milog', `Error processing word "${wordRecord.word}"`, { error: wordError });
        result.errors++;
      }
    }

    logger.info('Milog', 'Queue processing complete', { verified: result.verified, rejectedType: result.rejectedType, notFound: result.notFound, errors: result.errors });
    return result;
  } catch (error) {
    logger.error('Milog', 'Error processing verification queue', { error });
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
      logger.error('Milog', 'Error fetching verified words', { error: error.message });
      return [];
    }

    return (data || []).map((d: { id: string; word: string; milog_url: string | null }) => ({
      id: d.id,
      word: d.word,
      url: d.milog_url,
    }));
  } catch (error) {
    logger.error('Milog', 'Error fetching verified words', { error });
    return [];
  }
}

/**
 * Invalidate the Redis cache for a specific word
 * Used when admin revokes a word from the dictionary
 */
export async function invalidateMilogCache(word: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.del(`${REDIS_PREFIX}${word}`);
  } catch (error) {
    logger.warn('Milog', `Failed to invalidate cache for "${word}"`, { error: error instanceof Error ? error.message : 'Unknown error' });
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

    const { error } = await supabase.rpc('mark_word_auto_promoted', {
      p_word_id: wordId,
      p_source: 'milog_cron',
    });

    if (error) {
      logger.error('Milog', 'Error marking word as promoted', { error: error.message });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Milog', 'Error marking word as promoted', { error });
    return false;
  }
}
