/**
 * Practice progress for a student with no account, kept on the device.
 *
 * Every server-side progress row is keyed by `student_id`, so a visitor who
 * follows a lesson link without signing up has nowhere to be counted. The
 * choice is between a permanently blank scoreboard and remembering it locally;
 * this is the local half, built on the same storage helpers the rest of the
 * app's guest state uses.
 *
 * Device-bound, and there is deliberately NO merge into a real account on sign
 * in. Inventing one would need a server contract that does not exist yet, and a
 * half-merge that silently drops rounds is worse than an honest fresh start.
 *
 * The mastery formula mirrors `calculate_lesson_mastery` (migration 058) so a
 * guest and a signed-in student never read the same performance as two
 * different words.
 */
import { getJsonFromLocalStorage, saveJsonToLocalStorage } from '@/utils/storageHelpers';
import type { PracticeType, MasteryLevel } from '@/hooks/usePracticeSession';
import type { PracticeSessionCounts } from '@/lib/education/practicePicker';

export interface GuestPracticeRecord {
  /** Finished rounds per practice type. */
  sessions: Partial<Record<PracticeType, number>>;
  cardsReviewed: number;
  cardsCorrect: number;
  /** Distinct lesson words met, lower-cased. */
  wordsFound: string[];
  lastPracticeAt: string | null;
}

export const EMPTY_GUEST_PRACTICE: GuestPracticeRecord = {
  sessions: {},
  cardsReviewed: 0,
  cardsCorrect: 0,
  wordsFound: [],
  lastPracticeAt: null,
};

const storageKey = (lessonId: string) => `lexiclash_guest_practice_${lessonId}`;

/** Never throws and never returns undefined — a blank record is the floor. */
export function readGuestPractice(lessonId: string): GuestPracticeRecord {
  const stored = getJsonFromLocalStorage<Partial<GuestPracticeRecord>>(storageKey(lessonId), {});
  return {
    sessions: (stored?.sessions && typeof stored.sessions === 'object') ? stored.sessions : {},
    cardsReviewed: Number(stored?.cardsReviewed) || 0,
    cardsCorrect: Number(stored?.cardsCorrect) || 0,
    wordsFound: Array.isArray(stored?.wordsFound) ? stored.wordsFound : [],
    lastPracticeAt: typeof stored?.lastPracticeAt === 'string' ? stored.lastPracticeAt : null,
  };
}

function write(lessonId: string, record: GuestPracticeRecord): GuestPracticeRecord {
  saveJsonToLocalStorage(storageKey(lessonId), record);
  return record;
}

/** One more round of this mode. Written at START, not at finish — a student who
 *  closes the tab mid-round still played it, and a count that only ever moves
 *  on a clean exit under-reports exactly the sessions worth knowing about. */
export function recordGuestPracticeStart(lessonId: string, type: PracticeType): GuestPracticeRecord {
  const record = readGuestPractice(lessonId);
  return write(lessonId, {
    ...record,
    sessions: { ...record.sessions, [type]: (record.sessions[type] ?? 0) + 1 },
  });
}

export interface GuestPracticeResult {
  cardsReviewed?: number;
  cardsCorrect?: number;
  vocabularyWordsFound?: string[];
}

export function recordGuestPracticeResult(
  lessonId: string,
  result: GuestPracticeResult
): GuestPracticeRecord {
  const record = readGuestPractice(lessonId);
  // Case-folded. A board hands back lowercase and a card deck hands back the
  // teacher's capitalisation; counting those as two words would inflate
  // coverage past what the student actually met.
  const met = new Set(record.wordsFound);
  for (const word of result.vocabularyWordsFound ?? []) {
    if (word) met.add(word.toLowerCase());
  }
  return write(lessonId, {
    ...record,
    cardsReviewed: record.cardsReviewed + (result.cardsReviewed ?? 0),
    cardsCorrect: record.cardsCorrect + (result.cardsCorrect ?? 0),
    wordsFound: [...met],
    lastPracticeAt: new Date().toISOString(),
  });
}

/** Shaped for the picker's per-tile "played N" badge, whose keys are the
 *  `student_practice_progress` column names rather than the practice types. */
export function guestPracticeCounts(record: GuestPracticeRecord): PracticeSessionCounts {
  const s = record.sessions;
  return {
    flashcard_sessions: s.flashcard ?? 0,
    solo_board_sessions: s.solo_board ?? 0,
    warmup_sessions: s.warmup ?? 0,
    word_list_views: s.word_list ?? 0,
    matching_sessions: s.matching ?? 0,
    spelling_sessions: s.spelling ?? 0,
    blitz_sessions: s.blitz ?? 0,
  };
}

/** 60% word coverage + 40% card accuracy, thresholds 0.8 / 0.4 / >0. */
export function guestPracticeMastery(record: GuestPracticeRecord, totalWords: number): MasteryLevel {
  if (!totalWords || totalWords <= 0) return 'not_started';

  const coverage = Math.min(record.wordsFound.length / totalWords, 1);
  const accuracy = record.cardsReviewed > 0 ? record.cardsCorrect / record.cardsReviewed : 0;
  const score = coverage * 0.6 + accuracy * 0.4;

  if (score >= 0.8) return 'mastered';
  if (score >= 0.4) return 'practicing';
  if (score > 0) return 'started';
  return 'not_started';
}
