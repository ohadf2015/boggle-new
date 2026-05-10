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

export async function loadWordCraftDictionary(locale: SupportedLocale): Promise<Set<string>> {
  const out = new Set<string>()

  // For EN and SV, load from npm packages client-side
  if (locale === 'en') {
    try {
      const { default: englishWords } = await import('an-array-of-english-words', {
        with: { type: 'json' },
      })
      for (const w of englishWords as string[]) addDictKeys(out, w, locale)
      return out
    } catch {
      console.warn('[loadWordCraftDictionary] Failed to load EN from npm, falling back to server')
    }
  }

  if (locale === 'sv') {
    try {
      const { swedish_words } = await import('@arvidbt/swedish-words')
      for (const w of swedish_words) addDictKeys(out, w, locale)
      return out
    } catch {
      console.warn('[loadWordCraftDictionary] Failed to load SV from npm, falling back to server')
    }
  }

  // For HE / ES / JA / SV (fallback), fetch from server
  const resp = await fetch(`/api/word-craft/wordlist?locale=${locale}`)
  if (!resp.ok) {
    console.warn(`[loadWordCraftDictionary] Failed to load ${locale}: ${resp.status}`)
    return out
  }
  const words = (await resp.json()) as string[]
  for (const w of words) addDictKeys(out, w, locale)
  return out
}
