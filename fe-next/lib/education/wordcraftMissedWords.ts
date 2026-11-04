import type { Language } from '@/shared/types/game';
import { canonLessonWord } from '@/lib/wordTower/lessonSeed';
import { applyLeitnerAnswer, isReviewableWord, reviewKey, type LeitnerState } from './missedWordsReview';
import { loadLeitnerState, saveLeitnerState } from './missedWordsLeitnerStore';

/**
 * Lesson words a Word Craft round dealt but the player never built, spelled as
 * the teacher typed them (the review deck keys words that way). `dealt` and
 * `built` are canonical board strings.
 */
export function wordCraftMissedLessonWords(args: {
  lessonWords: readonly string[];
  dealt: readonly string[];
  built: readonly string[];
  language: Language;
}): string[] {
  const { lessonWords, language } = args;
  const dealt = new Set(args.dealt.map((w) => canonLessonWord(w, language)));
  const built = new Set(args.built.map((w) => canonLessonWord(w, language)));
  const seen = new Set<string>();
  const missed: string[] = [];
  for (const raw of lessonWords) {
    const word = (raw ?? '').trim();
    const canon = canonLessonWord(word, language);
    if (!canon || !dealt.has(canon) || built.has(canon) || seen.has(canon) || !isReviewableWord(word)) continue;
    seen.add(canon);
    missed.push(word);
  }
  return missed;
}

export function queueMissedForReview(state: LeitnerState, lessonId: string, missed: readonly string[], now: number): LeitnerState {
  const next = { ...state };
  for (const word of missed) {
    const key = reviewKey(lessonId, word);
    next[key] = applyLeitnerAnswer(next[key], false, now);
  }
  return next;
}

export function saveWordCraftMisses(studentId: string, lessonId: string, missed: readonly string[], now: number = Date.now()): void {
  if (missed.length === 0) return;
  saveLeitnerState(studentId, queueMissedForReview(loadLeitnerState(studentId), lessonId, missed, now));
}

export const missedReviewHref = (locale: string, lessonId: string) =>
  `/${locale}/student/review?lesson=${encodeURIComponent(lessonId)}`;
