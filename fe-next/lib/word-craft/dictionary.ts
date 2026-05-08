import type { SupportedLocale } from './tileBag'

export function isValidWord(word: string, dict: Set<string> | null): boolean {
  if (!dict || !word) return false
  return dict.has(word.toUpperCase())
}

export async function loadWordCraftDictionary(locale: SupportedLocale): Promise<Set<string>> {
  // For EN and SV, load from npm packages client-side
  if (locale === 'en') {
    try {
      const { default: englishWords } = await import('an-array-of-english-words', {
        with: { type: 'json' },
      })
      return new Set((englishWords as string[]).map((w) => w.toUpperCase()))
    } catch {
      // Fall through to server-side fetch if import fails
      console.warn('[loadWordCraftDictionary] Failed to load EN from npm, falling back to server')
    }
  }

  if (locale === 'sv') {
    try {
      const { swedish_words } = await import('@arvidbt/swedish-words')
      return new Set(swedish_words.map((w) => w.toUpperCase()))
    } catch {
      // Fall through to server-side fetch if import fails
      console.warn('[loadWordCraftDictionary] Failed to load SV from npm, falling back to server')
    }
  }

  // For HE / ES / JA / SV (fallback), fetch from server
  const resp = await fetch(`/api/word-craft/wordlist?locale=${locale}`)
  if (!resp.ok) {
    console.warn(`[loadWordCraftDictionary] Failed to load ${locale}: ${resp.status}`)
    return new Set()
  }
  const words = (await resp.json()) as string[]
  return new Set(words.map((w) => w.toUpperCase()))
}
