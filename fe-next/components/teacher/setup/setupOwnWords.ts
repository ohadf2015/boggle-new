import { mergeWords, parseWordPaste, wordIssue } from '@/lib/education/library';
import type { Language, VocabularyWord } from '@/lib/supabase/education/types';
import { MIN_PASTED_WORDS } from '@/components/teacher/dashboard/quickLaunchIntent';

export const SETUP_MIN_OWN_WORDS = MIN_PASTED_WORDS;

/** The teacher's pasted words that can go on a board in the class language; duplicates are not "dropped". */
export function readSetupWords(text: string, language: Language): { words: VocabularyWord[]; dropped: number; droppedWords: string[] } {
  const { words, rejected } = mergeWords([], parseWordPaste(text), language);
  const playable = words.filter((w) => wordIssue(w.word, language) === null);
  const unplayable = words.filter((w) => wordIssue(w.word, language) !== null).map((w) => w.word);
  const droppedWords = [...rejected, ...unplayable];
  return { words: playable, dropped: droppedWords.length, droppedWords };
}

export function usesOwnWords(words: readonly VocabularyWord[]): boolean {
  return words.length >= SETUP_MIN_OWN_WORDS;
}
