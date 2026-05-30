import { getTileBag, BLANK_LETTER, type SupportedLocale } from './tileBag';

/**
 * The drawable letters for a locale — the set a player may assign to a joker.
 * Derived from the tile bag's distribution keys (minus the blank), so it stays
 * in lockstep with the bag: Hebrew yields the 22 base letters (sofit forms are
 * not drawable tiles), English yields A–Z, etc.
 */
export function alphabetForLocale(locale: SupportedLocale): string[] {
  const { distribution } = getTileBag(locale);
  return Object.keys(distribution).filter((l) => l !== BLANK_LETTER);
}
