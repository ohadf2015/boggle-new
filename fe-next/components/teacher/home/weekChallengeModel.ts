/**
 * Teacher Home "this week's class challenge": which homework to show for the
 * selected class, how many students finished it, and which word list to use
 * when the teacher runs it again with new words. Pure, so it is unit-tested
 * without a database.
 */

export const CHALLENGE_DAYS = 7;
/** A challenge that closed this long ago still shows its results on Home. */
export const RESULTS_WAITING_DAYS = 14;

export interface ChallengeAssignment {
  id: string;
  lesson_id: string;
  due_date: string | null;
  created_at: string;
  completion_count?: number;
  student_count?: number;
  vocabulary_lessons?: { name?: string | null } | null;
}

export interface ChallengeLesson {
  id: string;
  name: string;
  language?: string | null;
  classroom_id?: string | null;
  updated_at?: string | null;
  words?: unknown[] | null;
}

export interface WeekChallenge {
  state: 'open' | 'ended';
  assignmentId: string;
  lessonId: string;
  lessonName: string;
  /** YYYY-MM-DD, or null for an assignment with no due date. */
  due: string | null;
  finished: number;
  students: number;
}

const day = (iso: string | null): string | null => (iso ? iso.slice(0, 10) : null);

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function toChallenge(a: ChallengeAssignment, state: WeekChallenge['state']): WeekChallenge {
  return {
    state,
    assignmentId: a.id,
    lessonId: a.lesson_id,
    lessonName: a.vocabulary_lessons?.name?.trim() || '',
    due: day(a.due_date),
    finished: Math.max(0, a.completion_count ?? 0),
    students: Math.max(0, a.student_count ?? 0),
  };
}

const newestFirst = (a: ChallengeAssignment, b: ChallengeAssignment) => b.created_at.localeCompare(a.created_at);

/**
 * The open challenge (due today or later, or no due date), newest first.
 * Otherwise the most recent one that closed within RESULTS_WAITING_DAYS and
 * has at least one finisher, so results are waiting when the teacher returns.
 */
export function pickWeekChallenge(assignments: ChallengeAssignment[], today: string): WeekChallenge | null {
  const sorted = [...assignments].sort(newestFirst);
  const open = sorted.find((a) => {
    const due = day(a.due_date);
    return due === null || due >= today;
  });
  if (open) return toChallenge(open, 'open');
  const since = addDays(today, -RESULTS_WAITING_DAYS);
  const ended = sorted.find((a) => {
    const due = day(a.due_date);
    return due !== null && due >= since && (a.completion_count ?? 0) > 0;
  });
  return ended ? toChallenge(ended, 'ended') : null;
}

const hasWords = (l: ChallengeLesson) => !Array.isArray(l.words) || l.words.length > 0;

/**
 * The word list for "run again with new words": a different list from the
 * current one, preferring this class's lists, then the class language, then
 * the most recently edited. Null when the teacher has no other list, so the
 * caller opens the assignment picker instead.
 */
export function nextWordSet(
  lessons: ChallengeLesson[],
  currentLessonId: string | null,
  classroomId: string,
  classLanguage: string | null,
): ChallengeLesson | null {
  const candidates = lessons.filter((l) => l.id !== currentLessonId && hasWords(l));
  if (candidates.length === 0) return null;
  const score = (l: ChallengeLesson) =>
    (l.classroom_id === classroomId ? 2 : 0) + (classLanguage && l.language === classLanguage ? 1 : 0);
  return [...candidates].sort((a, b) => score(b) - score(a) || (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))[0];
}

/** The list to start a challenge with when none is open: the class's last list, else its newest. */
export function firstWordSet(
  lessons: ChallengeLesson[],
  preferredLessonId: string | null,
  classroomId: string,
  classLanguage: string | null,
): ChallengeLesson | null {
  const preferred = preferredLessonId ? lessons.find((l) => l.id === preferredLessonId && hasWords(l)) : undefined;
  return preferred ?? nextWordSet(lessons, null, classroomId, classLanguage);
}
