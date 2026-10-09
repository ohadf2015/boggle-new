// Locales that ship their own crossword puzzles; anyone else would be silently served English.
const CROSSWORD_PUZZLE_LOCALES: ReadonlySet<string> = new Set(['en', 'he', 'sv', 'ja', 'es', 'ru']);

export function hasCrosswordPuzzles(locale: string): boolean {
  return CROSSWORD_PUZZLE_LOCALES.has(locale);
}
