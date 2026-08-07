import type { SupportedLocale } from './tileBag'
import { normalizeHebrewWord, normalizeSpanishWord } from '@/shared/utils/wordNormalization'

export function isValidWord(word: string, dict: Set<string> | null): boolean {
  if (!dict || !word) return false
  return dict.has(word.toUpperCase())
}

/**
 * Build the dictionary lookup set for a given locale.
 *
 * For each loaded source word we add multiple keys so the runtime check
 * (in `useWordCraftGame.isWordValid`) can hit on any plausible canonical
 * form. Specifically:
 *   - Hebrew: store normalized (sofit → regular) form so player words like
 *     "מים" match "מים" ↔ "מים" identically. Without this, words ending in
 *     ם / ן / ף / ץ / ך would never validate because the source dictionary
 *     stores regular forms.
 *   - Spanish: store both accented and accent-stripped forms so "ESTÁ"/"ESTA"
 *     both succeed without forcing the player to type accents from a tile rack.
 */
function addDictKeys(set: Set<string>, raw: string, locale: SupportedLocale): void {
  if (!raw) return
  const upper = raw.toUpperCase()
  set.add(upper)
  if (locale === 'he') {
    const norm = normalizeHebrewWord(raw).toUpperCase()
    if (norm) set.add(norm)
  } else if (locale === 'es') {
    const norm = normalizeSpanishWord(raw).toUpperCase()
    if (norm) set.add(norm)
  }
}

/** Injectable dependencies — real callers use the browser defaults. */
export interface WordListDeps {
  fetchFn?: typeof fetch
  storage?: Pick<Storage, 'getItem' | 'setItem'>
}

function wordCacheKey(locale: SupportedLocale): string {
  return `lex_wc_dict_${locale}`
}

function defaultStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
  } catch {
    // localStorage can throw in privacy mode / sandboxed iframes — treat as absent.
  }
  return null
}

function readCachedWordList(
  storage: Pick<Storage, 'getItem' | 'setItem'> | null,
  locale: SupportedLocale,
): string[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(wordCacheKey(locale))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

/**
 * Payloads above this size are not cacheable: JSON.stringify + setItem at
 * multi-megabyte scale blocks the main thread and then throws QuotaExceeded
 * anyway (HE is ~5MB of text, ES ~6MB). Those locales rely on the endpoint's
 * 24h browser / 7d CDN cache headers instead.
 * ponytail: flat byte ceiling — swap for IndexedDB if offline play for the big
 * locales is ever a real requirement (lib/offline/dictionaryDownload.ts already
 * does exactly that for the downloadable-dictionary feature).
 */
const MAX_CACHEABLE_CHARS = 1_000_000

/**
 * Fetch the shared server-hosted wordlist, with an offline-first localStorage cache:
 *  - On a successful fetch, the word array is persisted so a later flight works.
 *  - On a non-OK status, a thrown fetch (offline), or any error, the last cached
 *    copy is returned instead of an empty Set (which would reject every word).
 * Returns [] only when offline AND nothing was ever cached.
 *
 * Uses /api/dictionary-words (newline-delimited, gzipped in-route, served from
 * the process-wide shared word sets) rather than a mode-specific endpoint, so
 * Word Craft shares one heap copy and one CDN cache entry with the offline
 * dictionary system.
 */
export async function loadServerWordList(
  locale: SupportedLocale,
  deps: WordListDeps = {},
): Promise<string[]> {
  const fetchFn = deps.fetchFn ?? (typeof fetch !== 'undefined' ? fetch : undefined)
  const storage = deps.storage ?? defaultStorage()

  if (!fetchFn) return readCachedWordList(storage, locale)

  try {
    const resp = await fetchFn(`/api/dictionary-words?lang=${locale}`)
    if (!resp.ok) {
      console.warn(`[loadWordCraftDictionary] Failed to load ${locale}: ${resp.status} — using cache`)
      return readCachedWordList(storage, locale)
    }
    const text = await resp.text()
    const words: string[] = []
    for (const line of text.split('\n')) {
      const w = line.trim()
      if (w) words.push(w)
    }
    if (storage && text.length <= MAX_CACHEABLE_CHARS) {
      try {
        storage.setItem(wordCacheKey(locale), JSON.stringify(words))
      } catch {
        // Quota / privacy mode — caching is best-effort.
      }
    }
    return words
  } catch {
    console.warn(`[loadWordCraftDictionary] Network error loading ${locale} — using cache`)
    return readCachedWordList(storage, locale)
  }
}

export async function loadWordCraftDictionary(
  locale: SupportedLocale,
  deps: WordListDeps = {},
): Promise<Set<string>> {
  const out = new Set<string>()
  const words = await loadServerWordList(locale, deps)
  for (const w of words) addDictKeys(out, w, locale)
  return out
}
