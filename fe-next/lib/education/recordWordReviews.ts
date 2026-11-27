/**
 * The one writer of `word_review_state` and `student_lesson_progress.words_mastered`.
 * Server-only: callers pass the service-role client after authenticating the
 * student and checking lesson access (students may only read these rows).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Language } from '@/shared/types/game';
import { normalizeWord } from '@/shared/utils/wordNormalization';
import { applyReview, isMasteredStrength, type MemoryState, type StoredStrength, type WordResult } from './wordMemory';

export const MAX_REVIEWS_PER_REQUEST = 200;
/** Distinct words one student may move per day, across lessons. */
export const MAX_WORDS_PER_DAY = 400;

const HEBREW_RE = /[֐-׿]/;

/** Same key as live-game matching: Hebrew normalised as Hebrew, finals collapsed, case folded. */
export const lessonWordKey = (word: string, language: Language) =>
  normalizeWord((word ?? '').trim(), HEBREW_RE.test(word ?? '') ? 'he' : language).toUpperCase();

export const WORD_REVIEW_COLUMNS =
  'word, lesson_id, ease_factor, interval, repetitions, next_review_date, last_review_date, correct_days, last_correct_date, best_gap_days, strength';

export interface WordReviewRow {
  word: string;
  lesson_id?: string;
  ease_factor: number | string;
  interval: number;
  repetitions: number;
  next_review_date: string;
  last_review_date: string;
  correct_days: number;
  last_correct_date: string | null;
  best_gap_days: number;
  strength: StoredStrength;
}

export const rowToState = (row: WordReviewRow): MemoryState => ({
  easeFactor: Number(row.ease_factor),
  interval: row.interval,
  repetitions: row.repetitions,
  nextReviewDate: row.next_review_date,
  lastReviewDate: row.last_review_date,
  correctDays: row.correct_days ?? 0,
  lastCorrectDate: row.last_correct_date ?? null,
  bestGapDays: row.best_gap_days ?? 0,
  strength: row.strength ?? 'sprout',
});

export interface RecordWordReviewsArgs {
  studentId: string;
  lessonId: string;
  /** The lesson's own words as the teacher typed them; anything else is dropped. */
  lesson: { language: Language; words: readonly string[] };
  reviews: readonly WordResult[];
  /** ISO day the answers count for. */
  today: string;
}

export interface RecordWordReviewsResult {
  recorded: number;
  dropped: number;
  /** words_mastered after this call; null when nothing was read or written. */
  mastered: string[] | null;
}

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`recordWordReviews ${what}: ${error?.message ?? 'unknown error'}`);
}

export async function recordWordReviews(db: SupabaseClient, args: RecordWordReviewsArgs): Promise<RecordWordReviewsResult> {
  const { studentId, lessonId, lesson, today } = args;
  const key = (w: string) => lessonWordKey(w, lesson.language);

  const displayByKey = new Map<string, string>();
  for (const raw of lesson.words) {
    const display = (raw ?? '').trim();
    const k = display && key(display);
    if (k && !displayByKey.has(k)) displayByKey.set(k, display);
  }
  const matched = args.reviews.slice(0, MAX_REVIEWS_PER_REQUEST).flatMap((r) => {
    const k = typeof r?.word === 'string' ? key(r.word) : '';
    return k && displayByKey.has(k) ? [{ ...r, key: k }] : [];
  });
  if (matched.length === 0) return { recorded: 0, dropped: args.reviews.length, mastered: null };

  const [rowsRes, progressRes, todayRes] = await Promise.all([
    db.from('word_review_state').select(WORD_REVIEW_COLUMNS).eq('student_id', studentId).eq('lesson_id', lessonId),
    db.from('student_lesson_progress').select('words_mastered').eq('student_id', studentId).eq('lesson_id', lessonId).maybeSingle(),
    db.from('word_review_state').select('word', { count: 'exact', head: true }).eq('student_id', studentId).eq('last_review_date', today),
  ]);
  if (rowsRes.error) fail('read reviews', rowsRes.error);
  if (progressRes.error) fail('read progress', progressRes.error);
  if (todayRes.error) fail('count today', todayRes.error);

  const states = new Map<string, MemoryState>();
  const storedWord = new Map<string, string>();
  const touchedToday = new Set<string>();
  for (const row of (rowsRes.data ?? []) as unknown as WordReviewRow[]) {
    const k = key(row.word);
    states.set(k, rowToState(row));
    storedWord.set(k, row.word);
    if (row.last_review_date === today) touchedToday.add(k);
  }
  const legacy = ((progressRes.data as { words_mastered?: string[] | null } | null)?.words_mastered ?? []).filter(Boolean);
  const legacyKeys = new Set(legacy.map(key));

  let budget = MAX_WORDS_PER_DAY - (todayRes.count ?? 0);
  const changed = new Set<string>();
  let recorded = 0;
  for (const review of matched) {
    if (!touchedToday.has(review.key)) {
      if (budget <= 0) continue;
      budget -= 1;
      touchedToday.add(review.key);
    }
    const prev = states.get(review.key) ?? null;
    states.set(review.key, applyReview(prev, review, today, { grandfathered: !prev && legacyKeys.has(review.key) }));
    changed.add(review.key);
    recorded += 1;
  }

  if (changed.size > 0) {
    const rows = [...changed].map((k) => {
      const s = states.get(k)!;
      return {
        student_id: studentId,
        lesson_id: lessonId,
        word: storedWord.get(k) ?? displayByKey.get(k)!,
        ease_factor: s.easeFactor,
        interval: s.interval,
        repetitions: s.repetitions,
        next_review_date: s.nextReviewDate,
        last_review_date: s.lastReviewDate,
        correct_days: s.correctDays,
        last_correct_date: s.lastCorrectDate,
        best_gap_days: s.bestGapDays,
        strength: s.strength,
      };
    });
    const { error } = await db.from('word_review_state').upsert(rows, { onConflict: 'student_id,lesson_id,word' });
    if (error) fail('write reviews', error);
  }

  // Stored (earned) strength decides mastery; wilting shows only in reads. Words with no row keep their legacy entry.
  const isMasteredKey = (k: string) => isMasteredStrength(states.get(k)?.strength ?? 'seed');
  const mastered = legacy.filter((w) => !states.has(key(w)) || isMasteredKey(key(w)));
  for (const k of states.keys()) {
    if (isMasteredKey(k) && !legacyKeys.has(k)) mastered.push(storedWord.get(k) ?? displayByKey.get(k)!);
  }
  const sameAsBefore = mastered.length === legacy.length && mastered.every((w) => legacyKeys.has(key(w)));
  if (!sameAsBefore) {
    const { error } = await db
      .from('student_lesson_progress')
      .upsert({ student_id: studentId, lesson_id: lessonId, words_mastered: mastered }, { onConflict: 'student_id,lesson_id' });
    if (error) fail('write mastery', error);
  }

  return { recorded, dropped: args.reviews.length - recorded, mastered };
}
