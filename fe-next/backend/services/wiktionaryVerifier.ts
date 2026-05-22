/**
 * Generic, language-parametrised Wiktionary verifier.
 *
 * Mirrors wiktionaryEnVerifier / wiktionaryEsVerifier but takes a language code,
 * so new languages (Swedish today) need no copy-paste. en.wiktionary.org documents
 * every language under its own section (`body.<lang>`), and POS labels are English
 * regardless of the entry language, so one ACCEPTED/REJECTED map covers all.
 *
 * NOTE: This does NOT work for Japanese — Wiktionary structures Japanese under
 * kanji headwords, so hiragana lookups return no `body.ja`. Japanese uses the
 * Jisho/JMdict verifier instead (jishoVerifier.ts).
 */

import ky, { HTTPError } from 'ky';
import { getRedisClient } from '../redisClient';
import logger from '../utils/logger';

const USER_AGENT = 'LexiClash/1.0 (https://lexiclash.com; contact@lexiclash.com)';
const RATE_LIMIT_MS = 200;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const CACHE_TTL = 86400 * 7;
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
  'Noun': 'noun', 'Verb': 'verb', 'Adjective': 'adjective', 'Adverb': 'adverb',
  'Pronoun': 'pronoun', 'Preposition': 'preposition', 'Conjunction': 'conjunction',
  'Interjection': 'interjection', 'Determiner': 'determiner', 'Article': 'determiner',
  'Particle': 'particle', 'Numeral': 'numeral', 'Number': 'numeral',
};

const REJECTED_POS: Record<string, WiktionaryWordType> = {
  'Abbreviation': 'abbreviation', 'Acronym': 'abbreviation', 'Initialism': 'abbreviation',
  'Symbol': 'symbol', 'Letter': 'symbol', 'Proper noun': 'proper_name',
  'Punctuation mark': 'symbol',
};

export function parseWiktionaryResponse(
  body: WiktionaryResponse,
  lang: string,
  word = ''
): WiktionaryVerificationResult {
  if (word && word.length < MIN_WORD_LENGTH) {
    return { verified: false, status: 'rejected_type', error: 'too_short' };
  }

  const entries = body?.[lang];
  if (!entries || entries.length === 0) {
    return { verified: false, status: 'not_found' };
  }

  const url = word ? `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}` : undefined;

  const rejected = entries.find(e => e.partOfSpeech && REJECTED_POS[e.partOfSpeech]);
  if (rejected) {
    return { verified: false, status: 'rejected_type', url, wordType: REJECTED_POS[rejected.partOfSpeech!], partOfSpeechRaw: rejected.partOfSpeech };
  }

  const accepted = entries.find(e => e.partOfSpeech && ACCEPTED_POS[e.partOfSpeech]);
  if (accepted) {
    return { verified: true, status: 'verified', url, wordType: ACCEPTED_POS[accepted.partOfSpeech!], partOfSpeechRaw: accepted.partOfSpeech };
  }

  return { verified: false, status: 'needs_review', url, wordType: 'unknown', partOfSpeechRaw: entries[0]?.partOfSpeech };
}

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
  lastRequestTime = Date.now();
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<WiktionaryResponse> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await enforceRateLimit();
      return await ky.get(url, {
        headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
        timeout: 10000, retry: 0,
      }).json<WiktionaryResponse>();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (error instanceof HTTPError && error.response.status === 404) throw error;
      if (attempt < retries) await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
    }
  }
  throw lastError || new Error('Failed after retries');
}

export async function verifyWordOnWiktionary(word: string, lang: string): Promise<WiktionaryVerificationResult> {
  const cacheKey = `wiktionary-${lang}:${word}`;
  const redis = getRedisClient();

  if (redis) {
    try {
      const cached = await Promise.race([
        redis.get(cacheKey),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), REDIS_TIMEOUT_MS)),
      ]);
      if (cached) return JSON.parse(cached);
    } catch {
      // fall through to network
    }
  }

  try {
    const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`;
    logger.info('WiktionaryVerify', `Verifying ${lang} word: ${word}`);
    const body = await fetchWithRetry(url);
    const result = parseWiktionaryResponse(body, lang, word);
    if (redis) {
      try { await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result)); } catch { /* */ }
    }
    return result;
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 404) {
      const result: WiktionaryVerificationResult = { verified: false, status: 'not_found' };
      if (redis) { try { await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result)); } catch { /* */ } }
      return result;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('WiktionaryVerify', `Error verifying "${word}" [${lang}]`, { error: errorMessage });
    return { verified: false, status: 'error', error: errorMessage };
  }
}

export interface ProcessQueueOptions { batchSize?: number; minSubmissions?: number; maxAttempts?: number }
export interface ProcessQueueResult { processed: number; verified: number; notFound: number; rejectedType: number; errors: number }

async function getServiceClient() {
  // imported lazily so the module stays usable in pure-parse unit tests
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function processWiktionaryVerificationQueue(
  lang: string,
  options: ProcessQueueOptions = {}
): Promise<ProcessQueueResult> {
  const { batchSize = 50, minSubmissions = 2, maxAttempts = 3 } = options;
  const result: ProcessQueueResult = { processed: 0, verified: 0, notFound: 0, rejectedType: 0, errors: 0 };
  const supabase = await getServiceClient();

  const { data: queue, error: queueError } = await supabase.rpc('get_verification_queue', {
    p_language: lang, p_batch_size: batchSize, p_min_submissions: minSubmissions, p_max_attempts: maxAttempts,
  });
  if (queueError) {
    logger.error('WiktionaryVerify', `${lang} queue fetch failed`, { error: queueError.message });
    throw queueError;
  }
  if (!queue || queue.length === 0) {
    logger.info('WiktionaryVerify', `${lang} verification queue empty`);
    return result;
  }

  for (const row of queue as Array<{ id: string; word: string }>) {
    try {
      const v = await verifyWordOnWiktionary(row.word, lang);
      const { error: updateError } = await supabase.rpc('update_verification_result', {
        p_word_id: row.id, p_status: v.status, p_source: `wiktionary_${lang}`,
        p_url: v.url || null, p_word_type: v.wordType || null, p_error: v.error || null,
      });
      if (updateError) { result.errors++; continue; }
      result.processed++;
      if (v.verified) result.verified++;
      else if (v.status === 'rejected_type') result.rejectedType++;
      else if (v.status === 'not_found') result.notFound++;
      else if (v.status === 'error') result.errors++;
    } catch {
      result.errors++;
    }
  }
  logger.info('WiktionaryVerify', `${lang} queue processing complete`, result as unknown as Record<string, number>);
  return result;
}

export async function getVerifiedWordsForPromotionByLang(
  lang: string,
  limit = 100
): Promise<Array<{ id: string; word: string; url: string | null }>> {
  try {
    const supabase = await getServiceClient();
    const { data, error } = await supabase.rpc('get_verified_words_for_promotion', { p_language: lang, p_limit: limit });
    if (error) { logger.error('WiktionaryVerify', `${lang} promotion fetch failed`, { error: error.message }); return []; }
    return (data || []).map((d: { id: string; word: string; verification_url: string | null }) => ({ id: d.id, word: d.word, url: d.verification_url }));
  } catch (error) {
    logger.error('WiktionaryVerify', `${lang} promotion fetch failed`, { error });
    return [];
  }
}
