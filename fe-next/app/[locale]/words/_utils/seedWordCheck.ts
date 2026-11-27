import { ensureLanguageLoaded, isDictionaryWord } from '@/backend/dictionary';

/** Seed words missing from the English game dictionary (the dictionary step of /api/dictionary/check). */
export async function invalidSeedWords(words: string[]): Promise<string[]> {
  await ensureLanguageLoaded('en');
  return [...new Set(words)].filter((w) => isDictionaryWord(w.toLowerCase(), 'en') !== true);
}
