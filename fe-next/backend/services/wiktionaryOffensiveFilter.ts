/**
 * Wiktionary offensive-label filter — safety gate for auto-promotion.
 *
 * The REST /page/definition/ endpoint STRIPS usage-label text (the
 * `usage-label-sense` span comes back empty), so we read the raw wikitext
 * (`?action=raw`) and scan `{{lb|<lang>|...}}` templates for the hate/explicit
 * family. English and Spanish entries both live on en.wiktionary.org under
 * `{{lb|en|...}}` / `{{lb|es|...}}`, so we always fetch from en.wiktionary.
 *
 * Policy (matches spec dictionary-self-improvement.md):
 *   BLOCK  — the SLUR/hate family only: any label containing `slur`
 *            (ethnic/racial/religious/homophobic slur, …) plus the bare hate
 *            markers `ethnic`/`racial`/`racist`.
 *   ALLOW  — everything else, including `vulgar`, `offensive`, `slang`,
 *            `derogatory`, `informal`, `colloquial`. This matches the word-game
 *            norm (Scrabble bans slurs but keeps profanity) and the founder's
 *            "catch slang" ask, and avoids false-positives on polysemous words
 *            — e.g. Spanish "gato" (cat) carries {{lb|es|vulgar|slang}} on one
 *            regional sense but must stay valid. Profanity is mostly already in
 *            the base dictionaries anyway; the real risk is NOVEL slurs.
 *            Admins can still hard-block any word via bot_word_blacklist.
 *
 * Fails CLOSED: on a network/server error we cannot confirm the word is clean,
 * so we report it offensive (= skip auto-promotion this round, retry later).
 */

import ky, { HTTPError } from 'ky';
import { getRedisClient } from '../redisClient';
import logger from '../utils/logger';

const USER_AGENT = 'LexiClash/1.0 (https://www.lexiclash.live; contact@lexiclash.live)';
const RATE_LIMIT_MS = 200;
const CACHE_TTL = 86400 * 30; // 30d — labels rarely change
const REDIS_PREFIX = 'wiktionary-offensive:';
const REDIS_TIMEOUT_MS = 2000;

/** Languages whose entries we label-check on en.wiktionary (which documents every
 * language under `{{lb|<lang>|...}}`, e.g. `{{lb|he|ethnic slur}}`).
 * ja → Jisho verifier does its own best-effort offensive check (Wiktionary can't
 * resolve hiragana). */
const SUPPORTED_LANGS = new Set(['en', 'es', 'sv', 'he']);

/**
 * A label param is blocking if it contains any of these substrings.
 * Scoped to the slur/hate family ONLY — `slur` catches "ethnic/racial/religious/
 * homophobic slur"; the bare markers catch slurs tagged without the word "slur".
 * Deliberately excludes `vulgar`/`offensive`/`derogatory` (allowed: word-game norm).
 */
const OFFENSIVE_MARKERS = ['slur', 'ethnic', 'racial', 'racist'];

let lastRequestTime = 0;

/**
 * Pure: does the raw wikitext carry a blocking label for the given language?
 * Exported for unit testing without a network round-trip.
 */
export function parseOffensiveLabels(wikitext: string, lang: string): boolean {
  if (!wikitext) return false;
  // {{lb|<lang>|p1|p2|...}}  (also lbl / label aliases; tolerate whitespace)
  const escaped = lang.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `\\{\\{\\s*(?:lb|lbl|label)\\s*\\|\\s*${escaped}\\s*\\|([^{}]*)\\}\\}`,
    'gi'
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(wikitext)) !== null) {
    const params = m[1].split('|').map(p => p.trim().toLowerCase());
    for (const p of params) {
      if (OFFENSIVE_MARKERS.some(marker => p.includes(marker))) {
        return true;
      }
    }
  }
  return false;
}

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

/**
 * Is `word` flagged offensive on Wiktionary for `lang`?
 * Returns false for unsupported languages (he/ja/sv — deferred), so callers can
 * gate every promotion path uniformly without special-casing.
 */
export async function isOffensiveWord(word: string, lang: string): Promise<boolean> {
  if (!SUPPORTED_LANGS.has(lang)) return false;

  const cacheKey = `${REDIS_PREFIX}${lang}:${word}`;
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
        return (JSON.parse(cached) as { offensive: boolean }).offensive;
      }
    } catch {
      // cache miss / unavailable — fall through to network
    }
  }

  try {
    await enforceRateLimit();
    const url = `https://en.wiktionary.org/w/index.php?title=${encodeURIComponent(word)}&action=raw`;
    const wikitext = await ky
      .get(url, { headers: { 'User-Agent': USER_AGENT }, timeout: 10000, retry: 0 })
      .text();
    const offensive = parseOffensiveLabels(wikitext, lang);

    if (redis) {
      try {
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify({ offensive }));
      } catch {
        // ignore cache write errors
      }
    }
    return offensive;
  } catch (error) {
    // No wiki page → no offensive labels → safe to treat as clean.
    if (error instanceof HTTPError && error.response.status === 404) {
      if (redis) {
        try { await redis.setex(cacheKey, CACHE_TTL, JSON.stringify({ offensive: false })); } catch { /* */ }
      }
      return false;
    }
    // Anything else (network/5xx/timeout): FAIL CLOSED — do not auto-promote.
    logger.warn('WiktionaryOffensive', `Fail-closed for "${word}" [${lang}]`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return true;
  }
}
