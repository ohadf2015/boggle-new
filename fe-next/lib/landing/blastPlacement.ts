import type { Locale } from '@/lib/blast/v2/types';

/** The mode the homepage heroes for every player, newcomer or returning. */
export const FEATURED_HOME_MODE = 'blast';

/** Locales with a Blast letter pool; elsewhere the board would deal English letters. */
export const BLAST_LOCALES: readonly Locale[] = ['en', 'he', 'sv', 'ja', 'es'];

export function isBlastLocale(language: string): language is Locale {
  return (BLAST_LOCALES as readonly string[]).includes(language);
}

/** Hero slot: the featured mode when it is on offer, else the live arena. */
export function pickHomeAnchor(keys: readonly string[]): string {
  return keys.includes(FEATURED_HOME_MODE) ? FEATURED_HOME_MODE : 'arena';
}
