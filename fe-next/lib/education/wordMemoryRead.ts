import { rowToState, type WordReviewRow } from './recordWordReviews';
import { effectiveStrength, isDue, isMasteredStrength, type Strength, type StoredStrength } from './wordMemory';

/** One reviewed word as the student sees it today. Unseen lesson words (seeds) have no entry. */
export interface WordMemoryWord {
  lessonId: string;
  word: string;
  /** Wilted one stage when past due. */
  strength: Strength;
  /** Earned stage; this is what words_mastered follows. */
  storedStrength: StoredStrength;
  due: boolean;
  nextReviewDate: string;
  lastReviewDate: string;
}

export interface WordMemoryLessonSummary {
  lessonId: string;
  seen: number;
  due: number;
  mastered: number;
  byStrength: Record<StoredStrength, number>;
}

export interface WordMemoryResponse {
  today: string;
  dueCount: number;
  words: WordMemoryWord[];
  lessons: WordMemoryLessonSummary[];
}

export function shapeWordMemory(rows: readonly WordReviewRow[], today: string): WordMemoryResponse {
  const words: WordMemoryWord[] = rows.map((row) => {
    const state = rowToState(row);
    return {
      lessonId: row.lesson_id ?? '',
      word: row.word,
      strength: effectiveStrength(state, today),
      storedStrength: state.strength,
      due: isDue(state, today),
      nextReviewDate: state.nextReviewDate,
      lastReviewDate: state.lastReviewDate,
    };
  });
  words.sort((a, b) => Number(b.due) - Number(a.due) || a.nextReviewDate.localeCompare(b.nextReviewDate));

  const lessons = new Map<string, WordMemoryLessonSummary>();
  for (const w of words) {
    const s = lessons.get(w.lessonId) ?? { lessonId: w.lessonId, seen: 0, due: 0, mastered: 0, byStrength: { sprout: 0, plant: 0, flower: 0, gold: 0 } };
    s.seen += 1;
    if (w.due) s.due += 1;
    if (isMasteredStrength(w.storedStrength)) s.mastered += 1;
    s.byStrength[w.strength === 'seed' ? 'sprout' : w.strength] += 1;
    lessons.set(w.lessonId, s);
  }
  return {
    today,
    dueCount: words.filter((w) => w.due).length,
    words,
    lessons: [...lessons.values()].sort((a, b) => a.lessonId.localeCompare(b.lessonId)),
  };
}
