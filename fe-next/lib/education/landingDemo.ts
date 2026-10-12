import { demoBoard, findWordOnBoard, type CefrLevel } from './eslCefrDemo';

/** Tile path spelling the first target the player has not found yet, or null when none is left. */
export function nextHintPath(level: CefrLevel, found: readonly string[]): number[] | null {
  const { letters, targets } = demoBoard(level);
  const done = new Set(found.map((w) => w.toUpperCase()));
  for (const target of targets) {
    if (done.has(target)) continue;
    const path = findWordOnBoard(letters, target);
    if (path) return path;
  }
  return null;
}

// Literal keys so the landing key scan and clean-translations can see each one.
const WORDS_FOUND_KEYS = {
  one: 'eg6Land.demo.wordsFoundOne',
  few: 'eg6Land.demo.wordsFoundFew',
  other: 'eg6Land.demo.wordsFound',
} as const;

export function wordsFoundKey(count: number, language: string): string {
  const form = new Intl.PluralRules(language).select(count);
  if (form === 'one') return WORDS_FOUND_KEYS.one;
  if (form === 'few') return WORDS_FOUND_KEYS.few;
  return WORDS_FOUND_KEYS.other;
}
