import { hasWordInMemoryCache, prewarmDictionary } from '@/hooks/useDictionaryCache';
import type { Language } from '@/shared/types/game';

/** `unknown` = the server could not answer (rate limit, outage, offline). It is never a reject. */
export type WordVerdict = 'valid' | 'invalid' | 'unknown';

export interface ResolveWordOptions {
  /** Retry the server once after an unknown answer. */
  retry?: boolean;
  /** How long to wait for the in-browser dictionary to finish loading before retrying. */
  localWaitMs?: number;
  /** A Retry-After longer than this is not worth waiting for mid-game. */
  maxRetryAfterMs?: number;
  signal?: AbortSignal;
  sleep?: (ms: number) => Promise<void>;
}

const NON_ANSWER_SOURCES = new Set(['not_loaded', 'error']);
const DEFAULT_LOCAL_WAIT_MS = 1500;
const DEFAULT_MAX_RETRY_AFTER_MS = 2000;
const DEFAULT_RETRY_DELAY_MS = 300;

const realSleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

interface ServerAnswer {
  verdict: WordVerdict;
  retryAfterMs: number | null;
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
}

export async function checkWordOnServer(word: string, language: string, signal?: AbortSignal): Promise<ServerAnswer> {
  try {
    const res = await fetch('/api/dictionary/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, language }),
      signal,
    });
    if (!res.ok) {
      return { verdict: 'unknown', retryAfterMs: parseRetryAfter(res.headers?.get?.('Retry-After') ?? null) };
    }
    const data = (await res.json()) as { isValid?: unknown; source?: unknown };
    if (typeof data?.isValid !== 'boolean') return { verdict: 'unknown', retryAfterMs: null };
    if (data.isValid) return { verdict: 'valid', retryAfterMs: null };
    if (typeof data.source === 'string' && NON_ANSWER_SOURCES.has(data.source)) {
      return { verdict: 'unknown', retryAfterMs: null };
    }
    return { verdict: 'invalid', retryAfterMs: null };
  } catch {
    return { verdict: 'unknown', retryAfterMs: null };
  }
}

/**
 * Local dictionary hit → server → (on no answer) wait for the local dictionary → one bounded retry.
 * Only a definitive server "not a word" yields `invalid`.
 */
export async function resolveWordVerdict(
  word: string,
  language: string,
  {
    retry = true,
    localWaitMs = DEFAULT_LOCAL_WAIT_MS,
    maxRetryAfterMs = DEFAULT_MAX_RETRY_AFTER_MS,
    signal,
    sleep = realSleep,
  }: ResolveWordOptions = {},
): Promise<WordVerdict> {
  const lang = language as Language;
  const local = () => hasWordInMemoryCache(word, lang);
  if (local() === true) return 'valid';

  const first = await checkWordOnServer(word, language, signal);
  if (first.verdict !== 'unknown') return first.verdict;

  const startedWaiting = Date.now();
  if (localWaitMs > 0 && local() === null) {
    await Promise.race([prewarmDictionary(lang).catch(() => undefined), sleep(localWaitMs)]);
  }
  if (local() === true) return 'valid';

  if (!retry || signal?.aborted) return 'unknown';
  const wantedDelay = first.retryAfterMs ?? DEFAULT_RETRY_DELAY_MS;
  if (wantedDelay > maxRetryAfterMs) return 'unknown';
  const remaining = wantedDelay - (Date.now() - startedWaiting);
  if (remaining > 0) await sleep(remaining);

  const second = await checkWordOnServer(word, language, signal);
  return second.verdict;
}
