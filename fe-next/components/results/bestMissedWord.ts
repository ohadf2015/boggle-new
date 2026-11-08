import { calculateWordScore } from '@/shared/utils/scoring';
import { normalizeWord } from '@/shared/utils/wordNormalization';
import type { Language } from '@/shared/types/game';

export interface BestMissedWord {
  word: string;
  letters: number;
  /** Base points for the word (no combo / fire bonus) — what the board offered. */
  points: number;
}

/**
 * The single highest-scoring valid word on the board the player did not find.
 * Ties: longer word, then alphabetical, so every client shows the same word.
 */
export function pickBestMissedWord(
  candidates: Iterable<string>,
  found: Iterable<string>,
  language: Language | string,
): BestMissedWord | null {
  const lang = language as Language;
  const foundKeys = new Set<string>();
  for (const w of found) if (typeof w === 'string') foundKeys.add(normalizeWord(w, lang));

  let best: BestMissedWord | null = null;
  for (const raw of candidates) {
    if (typeof raw !== 'string' || raw.length < 2) continue;
    const word = raw.toLowerCase();
    if (foundKeys.has(normalizeWord(word, lang))) continue;
    const points = calculateWordScore(word);
    if (points <= 0) continue;
    const better = !best
      || points > best.points
      || (points === best.points && word.length > best.letters)
      || (points === best.points && word.length === best.letters && word < best.word);
    if (better) best = { word, letters: word.length, points };
  }
  return best;
}
