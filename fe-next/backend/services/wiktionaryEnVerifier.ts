/**
 * English Wiktionary verifier — Sprint C of word-validation-pipeline-2026-05-01.
 * Mirrors milogWordVerifier shape: rate-limit, redis cache 7d, retry, type-aware.
 *
 * Wiktionary REST API: https://en.wiktionary.org/api/rest_v1/page/definition/{word}
 * Returns 200 with `{ <langCode>: [{ partOfSpeech, ... }, ...] }` or 404 if absent.
 */

import ky, { HTTPError } from 'ky';
import { getRedisClient } from '../redisClient';
import logger from '../utils/logger';

const USER_AGENT = 'LexiClash/1.0 (https://www.lexiclash.live; contact@lexiclash.live)';
const RATE_LIMIT_MS = 200; // Wikimedia allows 200 req/s; we go light at 5/s
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const CACHE_TTL = 86400 * 7;
const REDIS_PREFIX = 'wiktionary-en:';
const REDIS_TIMEOUT_MS = 2000;
const MIN_WORD_LENGTH = 2;

let lastRequestTime = 0;

export type WiktionaryWordType =
  | 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'preposition'
  | 'conjunction' | 'interjection' | 'determiner' | 'particle' | 'numeral'
  | 'abbreviation' | 'proper_name' | 'symbol' | 'unknown';

export interface WiktionaryVerificationResult {
  verified: boolean;
  status: 'verified' | 'not_found' | 'error' | 'rejected_type' | 'needs_review';
  url?: string;
  error?: string;
  wordType?: WiktionaryWordType;
  partOfSpeechRaw?: string;
}

interface WiktionaryEntry { partOfSpeech?: string; language?: string }
type WiktionaryResponse = Record<string, WiktionaryEntry[]>;

const ACCEPTED_POS: Record<string, WiktionaryWordType> = {
  'Noun': 'noun',
  'Verb': 'verb',
  'Adjective': 'adjective',
  'Adverb': 'adverb',
  'Pronoun': 'pronoun',
  'Preposition': 'preposition',
  'Conjunction': 'conjunction',
  'Interjection': 'interjection',
  'Determiner': 'determiner',
  'Article': 'determiner',
  'Particle': 'particle',
  'Numeral': 'numeral',
  'Number': 'numeral',
};

const REJECTED_POS: Record<string, WiktionaryWordType> = {
  'Abbreviation': 'abbreviation',
  'Acronym': 'abbreviation',
  'Initialism': 'abbreviation',
  'Symbol': 'symbol',
  'Letter': 'symbol',
  'Proper noun': 'proper_name',
  'Punctuation mark': 'symbol',
};

export function parseWiktionaryResponse(
  body: WiktionaryResponse,
  word: string
): WiktionaryVerificationResult {
  if (word.length < MIN_WORD_LENGTH) {
    return { verified: false, status: 'rejected_type', error: 'too_short' };
  }

  const entries = body?.en;
  if (!entries || entries.length === 0) {
    return { verified: false, status: 'not_found' };
  }

  const url = `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`;

  const rejected = entries.find(e => e.partOfSpeech && REJECTED_POS[e.partOfSpeech]);
  if (rejected) {
    return {
      verified: false, status: 'rejected_type', url,
      wordType: REJECTED_POS[rejected.partOfSpeech!],
      partOfSpeechRaw: rejected.partOfSpeech,
    };
  }

  const accepted = entries.find(e => e.partOfSpeech && ACCEPTED_POS[e.partOfSpeech]);
  if (accepted) {
    return {
      verified: true, status: 'verified', url,
      wordType: ACCEPTED_POS[accepted.partOfSpeech!],
      partOfSpeechRaw: accepted.partOfSpeech,
    };
  }

  // Unknown partOfSpeech — default-deny (audit H3): park for human review.
  return {
    verified: false, status: 'needs_review', url,
    wordType: 'unknown',
    partOfSpeechRaw: entries[0]?.partOfSpeech,
  };
}

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<WiktionaryResponse> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await enforceRateLimit();
      return await ky.get(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
        timeout: 10000,
        retry: 0,
      }).json<WiktionaryResponse>();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (error instanceof HTTPError && error.response.status === 404) throw error;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error('Failed after retries');
}

export async function verifyWordOnWiktionaryEn(
  word: string
): Promise<WiktionaryVerificationResult> {
  const cacheKey = `${REDIS_PREFIX}${word}`;
  const redis = getRedisClient();

  if (redis) {
    try {
      const cached = await Promise.race([
        redis.get(cacheKey),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Redis timeout')), REDIS_TIMEOUT_MS)
        ),
      ]);
      if (cached) {
        logger.debug('WiktionaryEn', `Cache hit for "${word}"`);
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      logger.warn('WiktionaryEn', 'Redis cache check failed', {
        error: cacheError instanceof Error ? cacheError.message : 'Unknown',
      });
    }
  }

  try {
    const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`;
    logger.info('WiktionaryEn', `Verifying word: ${word}`);
    const body = await fetchWithRetry(url);
    const result = parseWiktionaryResponse(body, word);

    if (redis) {
      try {
        await Promise.race([
          redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result)),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Redis timeout')), REDIS_TIMEOUT_MS)
          ),
        ]);
      } catch {
        // ignore cache write errors
      }
    }
    return result;
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 404) {
      const result: WiktionaryVerificationResult = { verified: false, status: 'not_found' };
      if (redis) {
        try { await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result)); } catch { /* */ }
      }
      return result;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('WiktionaryEn', `Error verifying "${word}"`, { error: errorMessage });
    return { verified: false, status: 'error', error: errorMessage };
  }
}

export interface ProcessQueueOptions {
  batchSize?: number;
  minSubmissions?: number;
  maxAttempts?: number;
}

export interface ProcessQueueResult {
  processed: number;
  verified: number;
  notFound: number;
  rejectedType: number;
  errors: number;
}

const SOURCE_TAG = 'wiktionary_en';

export async function processWiktionaryEnVerificationQueue(
  options: ProcessQueueOptions = {}
): Promise<ProcessQueueResult> {
  const { batchSize = 50, minSubmissions = 2, maxAttempts = 3 } = options;
  const result: ProcessQueueResult = { processed: 0, verified: 0, notFound: 0, rejectedType: 0, errors: 0 };

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: queue, error: queueError } = await supabase.rpc('get_verification_queue', {
    p_language: 'en',
    p_batch_size: batchSize,
    p_min_submissions: minSubmissions,
    p_max_attempts: maxAttempts,
  });

  if (queueError) {
    logger.error('WiktionaryEn', 'Queue fetch failed', { error: queueError.message });
    throw queueError;
  }
  if (!queue || queue.length === 0) {
    logger.info('WiktionaryEn', 'Verification queue empty');
    return result;
  }

  logger.info('WiktionaryEn', `Processing ${queue.length} words from queue`);

  for (const row of queue as Array<{ id: string; word: string }>) {
    try {
      const v = await verifyWordOnWiktionaryEn(row.word);
      const { error: updateError } = await supabase.rpc('update_verification_result', {
        p_word_id: row.id,
        p_status: v.status,
        p_source: SOURCE_TAG,
        p_url: v.url || null,
        p_word_type: v.wordType || null,
        p_error: v.error || null,
      });

      if (updateError) {
        logger.error('WiktionaryEn', `Update failed for "${row.word}"`, { error: updateError.message });
        result.errors++;
        continue;
      }

      result.processed++;
      if (v.verified) { result.verified++; }
      else if (v.status === 'rejected_type') { result.rejectedType++; }
      else if (v.status === 'not_found') { result.notFound++; }
      else if (v.status === 'error') { result.errors++; }
    } catch (err) {
      logger.error('WiktionaryEn', `Error processing "${row.word}"`, { error: err });
      result.errors++;
    }
  }

  logger.info('WiktionaryEn', 'Queue processing complete', result as unknown as Record<string, number>);
  return result;
}

/**
 * List English words that have verification_status='verified' and are
 * waiting to be promoted to the canon (auto_promoted_at IS NULL).
 */
export async function getVerifiedEnglishWordsForPromotion(
  limit: number = 100
): Promise<Array<{ id: string; word: string; url: string | null }>> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await supabase.rpc('get_verified_words_for_promotion', {
      p_language: 'en',
      p_limit: limit,
    });
    if (error) {
      logger.error('WiktionaryEn', 'Promotion fetch failed', { error: error.message });
      return [];
    }
    return (data || []).map((d: { id: string; word: string; verification_url: string | null }) => ({
      id: d.id,
      word: d.word,
      url: d.verification_url,
    }));
  } catch (error) {
    logger.error('WiktionaryEn', 'Promotion fetch failed', { error });
    return [];
  }
}

/**
 * Invalidate Redis cache for an English word — used when admin revokes.
 */
export async function invalidateWiktionaryEnCache(word: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try { await redis.del(`${REDIS_PREFIX}${word}`); }
  catch (error) {
    logger.warn('WiktionaryEn', `Cache invalidate failed for "${word}"`, {
      error: error instanceof Error ? error.message : 'Unknown',
    });
  }
}
