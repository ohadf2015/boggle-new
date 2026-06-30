/**
 * Wiktionary native-language meaning lookup.
 *
 * Fetches a short, NATIVE-language definition for a single word so daily-word
 * meanings can come from a real dictionary (Wiktionary, CC BY-SA) instead of only
 * the LLM judge. On-demand + fail-soft: meanings are shown only for the tiny set of
 * served daily words, so a per-word HTTP call (cached in `daily_target_words.meaning`)
 * is the right tool — no bulk download. Any miss/error returns null so the caller
 * falls back to the LLM meaning.
 *
 * Phase 1 implements HEBREW only — the one language with NO meaning today (the LLM's
 * Hebrew was suppressed for quality, see wordMeaningPolicy) and the one whose
 * on-demand source is clean: he.wiktionary's plaintext extract is uniformly
 * "== HEADWORD ==\n\n<definition>".
 *
 * Other languages return null (LLM stays the source):
 *  - en: en.wiktionary rest_v1 senses are polluted by nym/"Terms related to…" blocks
 *        — and English LLM meanings are already fine.
 *  - es/ja/ru/sv: their on-demand extracts return etymology/morphology, not the gloss.
 * Reliable native coverage for these needs bulk wiktextract (phase 2).
 * See docs/2026-06-30-dictionary-meaning-enrichment.md.
 *
 * @module lib/dictionary/wiktionaryMeaning
 */

const MAX_LEN = 140; // results card shows a short gloss; cap long Wiktionary sentences
const TIMEOUT_MS = 8000;
// MediaWiki etiquette: identify the client. (https://meta.wikimedia.org/wiki/User-Agent_policy)
// NB: runs server-side (Node/undici) where setting User-Agent is allowed.
const UA = 'LexiClash/1.0 (word game; +https://lexiclash.app)';

/** Normalize a raw definition: collapse whitespace, drop a leading usage label, cap length. */
export function cleanMeaning(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.replace(/\s+/g, ' ').trim();
  s = s.replace(/^\([^)]{1,40}\)\s*/, '').trim(); // drop a leading "(slang)" / "(נדיר)" tag
  if (!s) return null;
  if (s.length > MAX_LEN) {
    const cut = s.slice(0, MAX_LEN);
    const lastSpace = cut.lastIndexOf(' ');
    s = (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim() + '…';
  }
  return s || null;
}

/**
 * he.wiktionary plaintext extract puts the gloss right after the headword header:
 *   [optional "ראו גם …" line]\n== HEADWORD ==\n\n<definition>
 * Take the first non-empty line after the first header.
 */
export function parseHebrewExtract(extract: string | null | undefined): string | null {
  if (!extract) return null;
  let afterHeader = false;
  for (const line of extract.split('\n')) {
    const t = line.trim();
    if (/^=+\s.*\s=+$/.test(t)) { afterHeader = true; continue; }
    if (afterHeader && t) return cleanMeaning(t);
  }
  return null;
}

async function getJson(url: string): Promise<unknown | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Api-User-Agent': UA },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // network/timeout/parse → caller falls back to the LLM meaning
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchWiktionaryMeaning(word: string, language: string): Promise<string | null> {
  const w = (word ?? '').trim();
  if (!w || language !== 'he') return null; // phase 1: Hebrew only (see module doc)

  const url =
    'https://he.wiktionary.org/w/api.php?action=query&prop=extracts' +
    '&explaintext=1&exsentences=1&redirects=1&format=json&titles=' +
    encodeURIComponent(w);
  const data = (await getJson(url)) as { query?: { pages?: Record<string, { extract?: string }> } } | null;
  const pages = data?.query?.pages;
  if (!pages) return null;
  return parseHebrewExtract(Object.values(pages)[0]?.extract);
}
