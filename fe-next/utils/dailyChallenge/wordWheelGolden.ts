/**
 * The daily Word Wheel's golden word: one long word per date + language,
 * found by the server and paid once with the word-of-the-day coins.
 *
 * Every wheel letter is usable once, so the longest possible word uses all
 * seven letters. The golden word is one of those (ties broken by a hash of
 * date + language + word, so everyone gets the same one). A wheel with no such
 * word has no golden word that day.
 *
 * Self-contained (relative imports only) so the Express backend can use it.
 */
import { hashString } from './prng';

export const GOLDEN_MIN_LENGTH = 7;

function permutations(letters: string[]): string[] {
  if (letters.length <= 1) return [letters.join('')];
  const out: string[] = [];
  letters.forEach((letter, i) => {
    const rest = [...letters.slice(0, i), ...letters.slice(i + 1)];
    for (const tail of permutations(rest)) out.push(letter + tail);
  });
  return out;
}

/** Dictionary words that use every wheel letter exactly once (upper case, unique). */
export function pangramCandidates(letters: string[], isWord: (word: string) => boolean): string[] {
  if (letters.length < GOLDEN_MIN_LENGTH) return [];
  const seen = new Set<string>();
  for (const perm of permutations(letters.map((l) => l.toUpperCase()))) {
    if (!seen.has(perm) && isWord(perm)) seen.add(perm);
  }
  return [...seen];
}

const rank = (word: string, date: string, language: string) => hashString(`wheel-golden|${date}|${language}|${word}`);

/** The day's golden word among the candidates, or null when there is none. */
export function pickGoldenWord(candidates: string[], date: string, language: string): string | null {
  if (candidates.length === 0) return null;
  return [...candidates]
    .map((w) => w.toUpperCase())
    .sort((a, b) => rank(a, date, language) - rank(b, date, language) || (a < b ? -1 : a > b ? 1 : 0))[0];
}

/**
 * What the client is told about the golden word: a key it can compare a found
 * word against, so the in-game reveal fires without the word itself being sent.
 */
export function goldenWordKey(word: string, date: string, language: string): string {
  return hashString(`wheel-golden-key|${date}|${language}|${word.toUpperCase()}`).toString(36);
}
