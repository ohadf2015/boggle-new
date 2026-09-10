/**
 * Sample Vocab Quiz question for the teacher preview.
 *
 * Prefers the live round builder so the preview matches what students get.
 * Falls back to the lesson word rows when the lesson cannot yet fill a
 * 4-choice question (thin data) — teachers still see a quiz, not a board.
 */
import type { VocabularyWord } from '@/lib/supabase/education/types';
import { buildQuizQuestions } from '@/lib/education/vocabQuizQuestions';

export interface PreviewQuizQuestion {
  targetWord: string;
  prompt: string;
  choices: string[];
}

export function buildPreviewQuizQuestion(
  words: VocabularyWord[],
  seed = 1,
  language?: string
): PreviewQuizQuestion | null {
  const built = buildQuizQuestions(words, { focus: 'any', count: 1, seed, language });
  const question = built.questions[0];
  if (question && question.choices.length >= 2) {
    return {
      targetWord: question.word,
      prompt: question.prompt,
      choices: question.choices.slice(0, 4),
    };
  }

  const rows = words.map((word) => word.word?.trim()).filter((word): word is string => Boolean(word));
  if (rows.length === 0) return null;

  const unique: string[] = [];
  for (const row of rows) {
    if (!unique.includes(row)) unique.push(row);
  }
  const targetWord = unique[0];
  const choices = unique.slice(0, 4);
  return { targetWord, prompt: targetWord, choices };
}
