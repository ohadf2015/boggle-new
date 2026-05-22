/**
 * Japanese verifier — Jisho.org / JMdict.
 *
 * Players submit HIRAGANA. Wiktionary structures Japanese under kanji headwords,
 * so hiragana lookups return no `body.ja` (verified empirically) — hence a
 * separate source. Jisho's API accepts hiragana and returns exact reading matches
 * from JMdict.
 *
 * Offensive filtering is BEST-EFFORT: the public API surfaces some misc tags
 * ("Colloquial", "Archaic", …) but not every JMdict vulgar/derogatory flag, so a
 * Japanese slur may slip the auto-filter. Backstops: admin review queue +
 * bot_word_blacklist. (Documented in docs/specs/dictionary-self-improvement.md.)
 */

import ky, { HTTPError } from 'ky';
import { getRedisClient } from '../redisClient';
import logger from '../utils/logger';

const USER_AGENT = 'LexiClash/1.0 (https://lexiclash.com; contact@lexiclash.com)';
const RATE_LIMIT_MS = 300;
const CACHE_TTL = 86400 * 7;
const REDIS_PREFIX = 'jisho:';
const REDIS_TIMEOUT_MS = 2000;
const MIN_WORD_LENGTH = 1;

let lastRequestTime = 0;

export interface JishoVerificationResult {
  verified: boolean;
  status: 'verified' | 'not_found' | 'error' | 'rejected_type' | 'needs_review';
  url?: string;
  error?: string;
}

interface JishoJapanese { word?: string; reading?: string }
interface JishoSense { parts_of_speech?: string[]; tags?: string[] }
interface JishoEntry { japanese?: JishoJapanese[]; senses?: JishoSense[] }
interface JishoResponse { data?: JishoEntry[] }

// A sense's POS counts as a real word if it matches one of these.
const REAL_POS = /noun|verb|adjective|adverb|pronoun|conjunction|interjection|adjectival|expression|counter|numeric|prefix|suffix|particle/i;
// Best-effort offensive markers (whatever Jisho surfaces in tags/POS).
const OFFENSIVE = /vulgar|derogator|x-rated|\brude\b|slur|offensive|sensitive/i;

export function parseJishoResponse(body: JishoResponse, word: string): JishoVerificationResult {
  if (word.length < MIN_WORD_LENGTH) {
    return { verified: false, status: 'rejected_type', error: 'too_short' };
  }
  const entries = body?.data ?? [];
  // Require an EXACT reading/word match for the submitted hiragana — Jisho
  // fuzzy-matches, so "results > 0" alone is not enough.
  const match = entries.find(e =>
    (e.japanese ?? []).some(j => j.reading === word || j.word === word)
  );
  if (!match) return { verified: false, status: 'not_found' };

  const url = `https://jisho.org/search/${encodeURIComponent(word)}`;
  const labels = (match.senses ?? []).flatMap(s => [...(s.tags ?? []), ...(s.parts_of_speech ?? [])]);

  if (labels.some(l => OFFENSIVE.test(l))) {
    return { verified: false, status: 'rejected_type', url };
  }
  const hasRealPos = (match.senses ?? []).some(s => (s.parts_of_speech ?? []).some(p => REAL_POS.test(p)));
  if (hasRealPos) return { verified: true, status: 'verified', url };

  return { verified: false, status: 'needs_review', url };
}

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
  lastRequestTime = Date.now();
}

export async function verifyWordOnJisho(word: string): Promise<JishoVerificationResult> {
  const cacheKey = `${REDIS_PREFIX}${word}`;
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
    await enforceRateLimit();
    const url = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(word)}`;
    logger.info('JishoVerify', `Verifying ja word: ${word}`);
    const body = await ky.get(url, { headers: { 'User-Agent': USER_AGENT }, timeout: 10000, retry: 1 }).json<JishoResponse>();
    const result = parseJishoResponse(body, word);
    if (redis) { try { await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result)); } catch { /* */ } }
    return result;
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 404) {
      return { verified: false, status: 'not_found' };
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('JishoVerify', `Error verifying "${word}"`, { error: errorMessage });
    return { verified: false, status: 'error', error: errorMessage };
  }
}

export interface ProcessQueueResult { processed: number; verified: number; notFound: number; rejectedType: number; errors: number }

async function getServiceClient() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function processJishoVerificationQueue(
  options: { batchSize?: number; minSubmissions?: number; maxAttempts?: number } = {}
): Promise<ProcessQueueResult> {
  const { batchSize = 50, minSubmissions = 2, maxAttempts = 3 } = options;
  const result: ProcessQueueResult = { processed: 0, verified: 0, notFound: 0, rejectedType: 0, errors: 0 };
  const supabase = await getServiceClient();

  const { data: queue, error: queueError } = await supabase.rpc('get_verification_queue', {
    p_language: 'ja', p_batch_size: batchSize, p_min_submissions: minSubmissions, p_max_attempts: maxAttempts,
  });
  if (queueError) {
    logger.error('JishoVerify', 'Queue fetch failed', { error: queueError.message });
    throw queueError;
  }
  if (!queue || queue.length === 0) {
    logger.info('JishoVerify', 'Verification queue empty');
    return result;
  }

  for (const row of queue as Array<{ id: string; word: string }>) {
    try {
      const v = await verifyWordOnJisho(row.word);
      const { error: updateError } = await supabase.rpc('update_verification_result', {
        p_word_id: row.id, p_status: v.status, p_source: 'jisho',
        p_url: v.url || null, p_word_type: null, p_error: v.error || null,
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
  logger.info('JishoVerify', 'Queue processing complete', result as unknown as Record<string, number>);
  return result;
}
