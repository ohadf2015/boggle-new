import type { Language } from '@/shared/types/game';
import { canonLessonWord } from '@/lib/wordTower/lessonSeed';
import { wordCraftMissedLessonWords } from './wordcraftMissedWords';
import type { WordResult } from './wordMemory';

/** Board words come back canonical; the word memory keys the teacher's own spelling. */
export function foundWordResults(found: readonly string[], lessonWords: readonly string[], language: Language): WordResult[] {
  const hits = new Set(found.map((w) => canonLessonWord(w ?? '', language)));
  const seen = new Set<string>();
  const results: WordResult[] = [];
  for (const raw of lessonWords) {
    const word = (raw ?? '').trim();
    const canon = canonLessonWord(word, language);
    if (!canon || !hits.has(canon) || seen.has(canon)) continue;
    seen.add(canon);
    results.push({ word, correct: true, kind: 'find' });
  }
  return results;
}

export function wordCraftWordResults(args: {
  lessonWords: readonly string[];
  dealt: readonly string[];
  built: readonly string[];
  language: Language;
}): WordResult[] {
  return [
    ...foundWordResults(args.built, args.lessonWords, args.language),
    ...wordCraftMissedLessonWords(args).map((word): WordResult => ({ word, correct: false, kind: 'find' })),
  ];
}
