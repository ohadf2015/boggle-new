/**
 * Missed Words Review — a 10-card spaced-retrieval run over the words a
 * student has missed (or not yet mastered) in classroom games and practice.
 *
 * Source of "missed": `student_lesson_progress.words_attempted` (written by
 * live classroom games, backend/handlers/classroomGamePersistence.ts) —
 * attempts minus correct — and `words_mastered` to drop what is already known.
 * A student with no progress rows still gets a run: every unmastered lesson
 * word is a candidate, ranked after real misses.
 *
 * Scheduling is Leitner: 5 boxes, a right answer moves a word up one box (and
 * further out in time), a wrong one sends it back to box 1, due now.
 * Pure: no I/O, no Date.now() — callers pass `now` and a seed.
 */

import type { Language } from '@/shared/types/game';
import { canonLessonWord } from '@/lib/wordTower/lessonSeed';
import { mulberry32, fnv1aHash } from '@/lib/rng/seededRandom';

export const REVIEW_RUN_SIZE = 10;
/** Days until a word in box N is due again (index = box; box 1 = same day). */
export const LEITNER_INTERVAL_DAYS = [0, 0, 1, 3, 7, 14] as const;
export const LEITNER_MAX_BOX = 5;
const DAY_MS = 86_400_000;
const MAX_WORD_CHARS = 12;

export interface LeitnerEntry {
  box: number;
  /** Epoch ms when the word is next due. */
  due: number;
  lapses: number;
}
export type LeitnerState = Record<string, LeitnerEntry>;

export interface ReviewLessonInput {
  id: string;
  name: string;
  language: Language;
  words: ReadonlyArray<{ word: string; definition?: string }>;
}

export interface ReviewProgressRow {
  lesson_id: string;
  words_attempted?: Record<string, { attempts?: number; correct?: number }> | null;
  words_mastered?: readonly string[] | null;
}

export interface ReviewCandidate {
  key: string;
  lessonId: string;
  lessonName: string;
  language: Language;
  word: string;
  definition?: string;
  attempts: number;
  misses: number;
}

export type ReviewCard =
  | (ReviewCandidate & { id: string; kind: 'meaning'; options: string[] })
  | (ReviewCandidate & { id: string; kind: 'unscramble'; tiles: string[] });

export const reviewKey = (lessonId: string, word: string) => `${lessonId}::${word}`;

/**
 * User-perceived letters: niqqud and combining accents stay on their letter
 * (a code-point split would deal lone vowel-mark tiles for שָׁלוֹם).
 */
type GraphemeSegmenter = new (locale: undefined, opts: { granularity: 'grapheme' }) => {
  segment: (input: string) => Iterable<{ segment: string }>;
};

export function graphemes(word: string): string[] {
  // tsconfig lib is ES2020 (no Intl.Segmenter typings); every supported browser + Node 16+ ships it.
  const Segmenter = (Intl as unknown as { Segmenter?: GraphemeSegmenter }).Segmenter;
  if (Segmenter) return Array.from(new Segmenter(undefined, { granularity: 'grapheme' }).segment(word), (s) => s.segment);
  return [...word];
}

function isReviewable(word: string): boolean {
  const len = graphemes(word).length;
  return len >= 2 && len <= MAX_WORD_CHARS && !/\s/.test(word);
}

/** Every reviewable, unmastered lesson word — real misses first. */
export function collectReviewCandidates(
  lessons: readonly ReviewLessonInput[],
  progress: readonly ReviewProgressRow[],
): ReviewCandidate[] {
  const out: Array<ReviewCandidate & { order: number }> = [];
  for (const lesson of lessons) {
    const row = progress.find((p) => p.lesson_id === lesson.id);
    const canon = (w: string) => canonLessonWord(w, lesson.language);
    const attemptsByCanon = new Map<string, { attempts: number; correct: number }>();
    for (const [key, a] of Object.entries(row?.words_attempted ?? {})) {
      attemptsByCanon.set(canon(key), { attempts: Number(a?.attempts) || 0, correct: Number(a?.correct) || 0 });
    }
    const mastered = new Set((row?.words_mastered ?? []).map(canon));
    const seen = new Set<string>();
    for (const entry of lesson.words) {
      const word = (entry?.word ?? '').trim();
      if (!isReviewable(word)) continue;
      const c = canon(word);
      if (!c || mastered.has(c) || seen.has(c)) continue;
      seen.add(c);
      const a = attemptsByCanon.get(c) ?? { attempts: 0, correct: 0 };
      out.push({
        key: reviewKey(lesson.id, word),
        lessonId: lesson.id,
        lessonName: lesson.name,
        language: lesson.language,
        word,
        ...(entry.definition?.trim() ? { definition: entry.definition.trim() } : {}),
        attempts: a.attempts,
        misses: Math.max(0, a.attempts - a.correct),
        order: out.length,
      });
    }
  }
  out.sort((a, b) => b.misses - a.misses || a.attempts - b.attempts || a.order - b.order);
  return out.map(({ order: _order, ...c }) => c);
}

export function applyLeitnerAnswer(entry: LeitnerEntry | undefined, correct: boolean, now: number): LeitnerEntry {
  const box = entry?.box ?? 1;
  const lapses = entry?.lapses ?? 0;
  if (!correct) return { box: 1, due: now, lapses: lapses + 1 };
  const next = Math.min(LEITNER_MAX_BOX, box + 1);
  return { box: next, due: now + LEITNER_INTERVAL_DAYS[next] * DAY_MS, lapses };
}

const isDue = (e: LeitnerEntry | undefined, now: number) => !e || e.due <= now;

/** The lesson a run anchors to (one practice session per run). */
export function pickRunLesson(
  candidates: readonly ReviewCandidate[],
  state: LeitnerState,
  now: number,
  preferred?: string | null,
): string | null {
  if (preferred && candidates.some((c) => c.lessonId === preferred)) return preferred;
  const tally = new Map<string, { due: number; total: number }>();
  for (const c of candidates) {
    const t = tally.get(c.lessonId) ?? { due: 0, total: 0 };
    t.total += 1;
    if (isDue(state[c.key], now)) t.due += 1;
    tally.set(c.lessonId, t);
  }
  let best: string | null = null;
  let bestT = { due: -1, total: -1 };
  for (const [id, t] of tally) {
    if (t.due > bestT.due || (t.due === bestT.due && t.total > bestT.total)) {
      best = id;
      bestT = t;
    }
  }
  return best;
}

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildReviewRun(
  candidates: readonly ReviewCandidate[],
  state: LeitnerState,
  now: number,
  lessonId: string | null,
  seed: number,
): ReviewCard[] {
  const anchor = lessonId ?? pickRunLesson(candidates, state, now);
  const pool = candidates.filter((c) => c.lessonId === anchor);
  if (pool.length === 0) return [];
  const rand = mulberry32(seed ^ fnv1aHash(anchor ?? ''));

  const due = pool
    .filter((c) => state[c.key] && isDue(state[c.key], now))
    .sort((a, b) => state[a.key].box - state[b.key].box || state[a.key].due - state[b.key].due);
  const fresh = pool.filter((c) => !state[c.key]);
  const later = pool.filter((c) => state[c.key] && !isDue(state[c.key], now)).sort((a, b) => state[a.key].due - state[b.key].due);
  const queue = [...due, ...fresh, ...later];

  const definitions = [...new Set(pool.map((c) => c.definition).filter((d): d is string => !!d))];
  const cards: ReviewCard[] = [];
  for (let i = 0; i < REVIEW_RUN_SIZE; i++) {
    const c = queue[i % queue.length];
    const id = `${i}-${c.key}`;
    const others = c.definition ? definitions.filter((d) => d !== c.definition) : [];
    if (c.definition && others.length >= 3) {
      const options = shuffle([c.definition, ...shuffle(others, rand).slice(0, 3)], rand);
      cards.push({ ...c, id, kind: 'meaning', options });
      continue;
    }
    const letters = graphemes(c.word);
    let tiles = shuffle(letters, rand);
    // A scramble that reads as the answer is not a scramble.
    for (let k = 0; k < 4 && letters.length > 1 && tiles.join('') === c.word; k++) tiles = shuffle(letters, rand);
    if (letters.length > 1 && tiles.join('') === c.word) tiles = [...tiles.slice(1), tiles[0]];
    cards.push({ ...c, id, kind: 'unscramble', tiles });
  }
  return cards;
}

/** Fold a finished run into the Leitner state (in answer order). */
export function applyRunToLeitner(
  state: LeitnerState,
  cards: readonly ReviewCard[],
  answers: readonly boolean[],
  now: number,
): LeitnerState {
  const next = { ...state };
  answers.forEach((correct, i) => {
    const card = cards[i];
    if (card) next[card.key] = applyLeitnerAnswer(next[card.key], correct, now);
  });
  return next;
}

/** `streak` counts this answer (1 = first right answer in a row). */
export function scoreReviewAnswer(correct: boolean, streak: number): number {
  if (!correct) return 0;
  return 100 + 25 * Math.min(Math.max(0, streak - 1), 4);
}

export type ReviewChestTier = 'bronze' | 'silver' | 'gold';

export interface ReviewRunSummary {
  correct: number;
  total: number;
  bestStreak: number;
  score: number;
  chest: ReviewChestTier;
}

export function summarizeReviewRun(answers: readonly boolean[]): ReviewRunSummary {
  let streak = 0;
  let bestStreak = 0;
  let score = 0;
  let correct = 0;
  for (const ok of answers) {
    streak = ok ? streak + 1 : 0;
    bestStreak = Math.max(bestStreak, streak);
    score += scoreReviewAnswer(ok, streak);
    if (ok) correct += 1;
  }
  const total = answers.length;
  const ratio = total ? correct / total : 0;
  const chest: ReviewChestTier = ratio >= 0.9 ? 'gold' : ratio >= 0.5 ? 'silver' : 'bronze';
  return { correct, total, bestStreak, score, chest };
}
