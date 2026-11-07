import { STARTER_LESSON_PACKS } from '@/lib/education/starterLessonPacks';

const ROUND_LENGTH = 10;

export interface StarterPracticePack {
  language: string;
  nameKey: string;
  words: Array<{ word: string; definition: string }>;
}

/** Server-only: the beginner pack in the student's language feeds the no-account practice round. */
export function starterPracticePack(locale: string): StarterPracticePack {
  const beginner = (lang: string) => STARTER_LESSON_PACKS.find((p) => p.language === lang && p.targetLevel === 'beginner');
  const pack = beginner(locale) ?? beginner('en') ?? STARTER_LESSON_PACKS[0];
  return {
    language: pack.language,
    nameKey: pack.nameKey,
    words: pack.words.slice(0, ROUND_LENGTH).map((w) => ({ word: w.word, definition: w.definition ?? '' })),
  };
}
