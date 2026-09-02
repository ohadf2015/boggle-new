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
 * A retry, then a loud failure.
 *
 * EN (2.8MB), ES (6.7MB) and HE (5MB) are all over MAX_CACHEABLE_CHARS, so for
 * those locales `readCachedWordList` is ALWAYS empty — there is no cache to fall
 * back to. One dropped fetch therefore used to hand the game an empty Set, and
 * an empty Set is not "no dictionary", it is "no word is a word": Word Tower
 * rejected every submission with "Not in the dictionary" and pickBestWheel,
 * scoring every candidate at zero, silently dealt a DIFFERENT tray from the one
 * every other player got that day. Reported 2026-09-02 ("ice" rejected on the
 * en daily tower — the dict-less wheel that day was CEEUIIR, the real one
 * EQOAISN). So: retry once, and if the list is still empty, THROW so the caller
 * shows its retry screen instead of running a game that cannot be won.
 */
const FETCH_ATTEMPTS = 2
const RETRY_DELAY_MS = 400

/** Thrown when no word list could be obtained — neither network nor cache. */
export class DictionaryLoadError extends Error {
  readonly locale: SupportedLocale
  constructor(locale: SupportedLocale) {
    super(`Dictionary for "${locale}" is unavailable (network and cache both empty)`)
    this.name = 'DictionaryLoadError'
    this.locale = locale
  }
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Fetch the shared server-hosted wordlist, with an offline-first localStorage cache:
 *  - On a successful fetch, the word array is persisted so a later flight works
 *    (only for payloads under MAX_CACHEABLE_CHARS — en/es/he never qualify).
 *  - A non-OK status, a thrown fetch (offline), or an empty body is retried once
 *    before the last cached copy is returned.
 * Returns [] only when every attempt failed AND nothing was ever cached — which
 * `loadWordCraftDictionary` turns into a DictionaryLoadError rather than a
 * dictionary in which no word is a word.
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

  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    try {
      const resp = await fetchFn(`/api/dictionary-words?lang=${locale}`)
      if (!resp.ok) {
        console.warn(
          `[loadWordCraftDictionary] ${locale}: HTTP ${resp.status} (attempt ${attempt}/${FETCH_ATTEMPTS})`,
        )
      } else {
        const text = await resp.text()
        const words: string[] = []
        for (const line of text.split('\n')) {
          const w = line.trim()
          if (w) words.push(w)
        }
        // A 200 with an empty body is a failure too — it is the shape a stale
        // CDN entry or a truncated response takes, and it bricks the game
        // exactly like a 500 does.
        if (words.length > 0) {
          if (storage && text.length <= MAX_CACHEABLE_CHARS) {
            try {
              storage.setItem(wordCacheKey(locale), JSON.stringify(words))
            } catch {
              // Quota / privacy mode — caching is best-effort.
            }
          }
          return words
        }
        console.warn(
          `[loadWordCraftDictionary] ${locale}: empty payload (attempt ${attempt}/${FETCH_ATTEMPTS})`,
        )
      }
    } catch {
      console.warn(
        `[loadWordCraftDictionary] ${locale}: network error (attempt ${attempt}/${FETCH_ATTEMPTS})`,
      )
    }
    if (attempt < FETCH_ATTEMPTS) await delay(RETRY_DELAY_MS)
  }

  return readCachedWordList(storage, locale)
}

export async function loadWordCraftDictionary(
  locale: SupportedLocale,
  deps: WordListDeps = {},
): Promise<Set<string>> {
  const out = new Set<string>()
  const words = await loadServerWordList(locale, deps)
  for (const w of words) addDictKeys(out, w, locale)
  // Never hand a caller an empty dictionary: see DictionaryLoadError above.
  if (out.size === 0) throw new DictionaryLoadError(locale)
  return out
}
