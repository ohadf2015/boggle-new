import type { VocabularyWord } from '@/lib/supabase/education/types';

/** Field a drill must have a non-empty trimmed string for. */
export type PracticeRequiredField = 'definition' | 'example' | 'word';

export const DRILL_MIN_USABLE = {
  matching: 2,
  flashcard: 1,
  spelling: 1,
  blitz: 1,
  vocab_focus: 1,
  solo_board: 1,
  warmup: 1,
  word_tower: 1,
} as const;

/**
 * Trim, drop empty, case-insensitive-dedupe a lesson's words for drills.
 * First spelling wins. Pure — no I/O.
 */
export function normalizePracticeWords(
  words: readonly VocabularyWord[],
): VocabularyWord[] {
  const seen = new Set<string>();
  const out: VocabularyWord[] = [];
  for (const entry of words) {
    const word = (entry.word ?? '').trim();
    if (!word) continue;
    const key = word.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...entry, word });
  }
  return out;
}

function hasUsableField(entry: VocabularyWord, field: PracticeRequiredField): boolean {
  if (field === 'word') return true;
  const value = entry[field];
  return typeof value === 'string' && value.trim().length > 0;
}

/** Normalize, then keep only words that have the field the drill actually uses. */
export function wordsReadyForDrill(
  words: readonly VocabularyWord[],
  field: PracticeRequiredField = 'definition',
): VocabularyWord[] {
  return normalizePracticeWords(words).filter((entry) => hasUsableField(entry, field));
}
