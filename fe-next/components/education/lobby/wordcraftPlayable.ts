import { lessonTargetsFor, wordCraftLocaleFor } from '@/lib/word-craft/lessonBag';

export const WORDCRAFT_LOBBY_RACK_SIZE = 9;

// The server silently downgrades a Wordcraft room to Classic when no lesson word fits the rack.
export function wordcraftPlayable(words: readonly string[], language: string): boolean {
  const { locale } = wordCraftLocaleFor(language, language);
  return lessonTargetsFor(words, locale, WORDCRAFT_LOBBY_RACK_SIZE).length > 0;
}
