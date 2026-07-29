/**
 * Spanish Wiktionary verifier — mirrors wiktionaryEnVerifier shape.
 * Uses en.wiktionary.org (checks body.es) — POS labels are English, same map as EN verifier.
 */

import ky, { HTTPError } from 'ky';
import { getRedisClient } from '../redisClient';
import logger from '../utils/logger';

const USER_AGENT = 'LexiClash/1.0 (https://lexiclash.com; contact@lexiclash.com)';
const RATE_LIMIT_MS = 200;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const CACHE_TTL = 86400 * 7;
const REDIS_PREFIX = 'wiktionary-es:';
const REDIS_TIMEOUT_MS = 2000;
const MIN_WORD_LENGTH = 2;

let lastRequestTime = 0;

export type WiktionaryEsWordType =
  | 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'preposition'
  | 'conjunction' | 'interjection' | 'determiner' | 'particle' | 'numeral'
  | 'abbreviation' | 'proper_name' | 'symbol' | 'unknown';

export interface WiktionaryEsVerificationResult {
  verified: boolean;
  status: 'verified' | 'not_found' | 'error' | 'rejected_type' | 'needs_review';
  url?: string;
  error?: string;
  wordType?: WiktionaryEsWordType;
  partOfSpeechRaw?: string;
}

interface WiktionaryEntry { partOfSpeech?: string; language?: string }
type WiktionaryResponse = Record<string, WiktionaryEntry[]>;

const ACCEPTED_POS: Record<string, WiktionaryEsWordType> = {
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

const REJECTED_POS: Record<string, WiktionaryEsWordType> = {
  'Abbreviation': 'abbreviation',
  'Acronym': 'abbreviation',
  'Initialism': 'abbreviation',
  'Symbol': 'symbol',
  'Letter': 'symbol',
  'Proper noun': 'proper_name',
  'Punctuation mark': 'symbol',
};

export function parseWiktionaryEsResponse(
  body: WiktionaryResponse,
  word: string
): WiktionaryEsVerificationResult {
  if (word.length < MIN_WORD_LENGTH) {
    return { verified: false, status: 'rejected_type', error: 'too_short' };
  }

  const entries = body?.es;
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
        headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
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

export async function verifyWordOnWiktionaryEs(
  word: string
): Promise<WiktionaryEsVerificationResult> {
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
        logger.debug('WiktionaryEs', `Cache hit for "${word}"`);
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      logger.warn('WiktionaryEs', 'Redis cache check failed', {
        error: cacheError instanceof Error ? cacheError.message : 'Unknown',
      });
    }
  }

  try {
    const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`;
    logger.info('WiktionaryEs', `Verifying word: ${word}`);
    const body = await fetchWithRetry(url);
    const result = parseWiktionaryEsResponse(body, word);

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
      const result: WiktionaryEsVerificationResult = { verified: false, status: 'not_found' };
      if (redis) {
        try { await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result)); } catch { /* */ }
      }
      return result;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('WiktionaryEs', `Error verifying "${word}"`, { error: errorMessage });
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

const SOURCE_TAG = 'wiktionary_es';

export async function processWiktionaryEsVerificationQueue(
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
    p_language: 'es',
    p_batch_size: batchSize,
    p_min_submissions: minSubmissions,
    p_max_attempts: maxAttempts,
  });

  if (queueError) {
    logger.error('WiktionaryEs', 'Queue fetch failed', { error: queueError.message });
    throw queueError;
  }
  if (!queue || queue.length === 0) {
    logger.info('WiktionaryEs', 'Verification queue empty');
    return result;
  }

  logger.info('WiktionaryEs', `Processing ${queue.length} words from queue`);

  for (const row of queue as Array<{ id: string; word: string }>) {
    try {
      const v = await verifyWordOnWiktionaryEs(row.word);
      const { error: updateError } = await supabase.rpc('update_verification_result', {
        p_word_id: row.id,
        p_status: v.status,
        p_source: SOURCE_TAG,
        p_url: v.url || null,
        p_word_type: v.wordType || null,
        p_error: v.error || null,
      });

      if (updateError) {
        logger.error('WiktionaryEs', `Update failed for "${row.word}"`, { error: updateError.message });
        result.errors++;
        continue;
      }

      result.processed++;
      if (v.verified) { result.verified++; }
      else if (v.status === 'rejected_type') { result.rejectedType++; }
      else if (v.status === 'not_found') { result.notFound++; }
      else if (v.status === 'error') { result.errors++; }
    } catch (err) {
      logger.error('WiktionaryEs', `Error processing "${row.word}"`, { error: err });
      result.errors++;
    }
  }

  logger.info('WiktionaryEs', 'Queue processing complete', result as unknown as Record<string, number>);
  return result;
}

export async function getVerifiedSpanishWordsForPromotion(
  limit: number = 100
): Promise<Array<{ id: string; word: string; url: string | null }>> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await supabase.rpc('get_verified_words_for_promotion', {
      p_language: 'es',
      p_limit: limit,
    });
    if (error) {
      logger.error('WiktionaryEs', 'Promotion fetch failed', { error: error.message });
      return [];
    }
    return (data || []).map((d: { id: string; word: string; verification_url: string | null }) => ({
      id: d.id,
      word: d.word,
      url: d.verification_url,
    }));
  } catch (error) {
    logger.error('WiktionaryEs', 'Promotion fetch failed', { error });
    return [];
  }
}

export async function invalidateWiktionaryEsCache(word: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try { await redis.del(`${REDIS_PREFIX}${word}`); }
  catch (error) {
    logger.warn('WiktionaryEs', `Cache invalidate failed for "${word}"`, {
      error: error instanceof Error ? error.message : 'Unknown',
    });
  }
}
