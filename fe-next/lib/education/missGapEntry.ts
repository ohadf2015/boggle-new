/**
 * Who is standing at the homework door, and what do they get to play?
 *
 * This module exists because of a single line the route used to carry:
 *
 *     teacherMode: role === 'teacher' || !dueDate
 *
 * It meant the STUDENT game was reachable only through a ~300-character share
 * link with `due=` intact. Any link that lost a param on its way through
 * WhatsApp, Google Classroom or a paste landed the student on the teacher's
 * compose card — a screen with a due-date picker and nothing to play. From the
 * outside that is indistinguishable from "the homework game never loads",
 * which is exactly what the last review concluded.
 *
 * The rules here make the entry explicit instead of inferred:
 *
 *   role=teacher                  → compose card (explicit)
 *   role=student                  → the game (explicit; share links carry this)
 *   words, no due, no role        → compose card (the teacher's reteach entry,
 *                                    where "no due date yet" genuinely means
 *                                    the teacher is still picking one)
 *   nothing at all                → the game, on a seeded demo assignment
 *
 * The last rule is the safety net: a bare `/education/miss-gap-assignment` is
 * never a real teacher entry (that one always arrives carrying the lesson and
 * the missed words), so it is the one URL that can be made to always open
 * something playable. A link that lost its query string now opens homework
 * rather than a dead end.
 */

import {
  parseClassGapShareParams,
  searchRecordToParams,
} from './classGapShare';
import {
  defaultMissGapDueDate,
  normalizeDueDate,
  toMissGapAssignmentPayload,
  type MissGapAssignmentPayload,
} from './missGapAsyncAssignment';
import { parseMissGapDefinitions } from './missGapDefinitions';

/**
 * The seeded assignment behind a bare URL.
 *
 * Real words with real meanings, so the demo opens the GOOD round kind (tap
 * the definition that matches) rather than spelling-only. Five words is the
 * documented 2-3 minute session length.
 */
export const MISS_GAP_DEMO_WORDS: ReadonlyArray<{
  word: string;
  meaning: string;
}> = [
  { word: 'brave', meaning: 'not afraid when something is scary' },
  { word: 'gleam', meaning: 'to shine with a soft light' },
  { word: 'harvest', meaning: 'to gather crops when they are ready' },
  { word: 'summit', meaning: 'the very top of a mountain' },
  { word: 'drift', meaning: 'to move slowly without steering' },
];

export interface MissGapEntry {
  payload: MissGapAssignmentPayload;
  /** True → the teacher's compose + who-played card. False → the game. */
  teacherMode: boolean;
}

/** Query value for the explicit student entry. Share links carry this. */
export const MISS_GAP_STUDENT_ROLE = 'student';
/** Query value for the explicit teacher entry. */
export const MISS_GAP_TEACHER_ROLE = 'teacher';

function seededDefinitions(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { word, meaning } of MISS_GAP_DEMO_WORDS) out[word] = meaning;
  return out;
}

/**
 * Resolve the payload and the audience from the URL.
 *
 * `locale` is the route segment; an explicit `lang`/`locale` query param still
 * wins, because a share link pasted into a different locale's shell must keep
 * the language the teacher sent it in.
 */
export function resolveMissGapEntry(
  searchParams: URLSearchParams,
  locale: string,
): MissGapEntry {
  const sp = new URLSearchParams(searchParams);
  if (!sp.get('lang') && !sp.get('locale')) sp.set('lang', locale);

  const base = parseClassGapShareParams(sp);
  const role = String(sp.get('role') || '').trim().toLowerCase();
  const requestedDue = normalizeDueDate(sp.get('due'));
  const definitions = parseMissGapDefinitions(sp.get('defs'));

  // A bare URL: no words to practise and no lesson to compose against. The
  // only useful thing to render is a playable assignment.
  const isBare =
    base.missedWords.length === 0 && !base.lesson && role !== MISS_GAP_TEACHER_ROLE;

  if (isBare) {
    return {
      payload: toMissGapAssignmentPayload({
        ...base,
        missedWords: MISS_GAP_DEMO_WORDS.map((w) => w.word),
        found: base.found,
        total: base.total || MISS_GAP_DEMO_WORDS.length,
        dueDate: requestedDue || defaultMissGapDueDate(),
        definitions: { ...seededDefinitions(), ...definitions },
      }),
      teacherMode: false,
    };
  }

  const teacherMode =
    role === MISS_GAP_TEACHER_ROLE
      ? true
      : role === MISS_GAP_STUDENT_ROLE
        ? false
        : // No role marker at all: the historical heuristic. "Words but no due
          // date" is the teacher arriving from the results card, still picking.
          !requestedDue;

  // A student must always have a deadline to play against — the class streak
  // and the on-time grade are both computed from it. Only the student branch
  // gets a default; a teacher with no due date is mid-compose by definition.
  const dueDate = teacherMode ? requestedDue : requestedDue || defaultMissGapDueDate();

  return {
    payload: toMissGapAssignmentPayload({ ...base, dueDate, definitions }),
    teacherMode,
  };
}

/** Same resolution from Next's `searchParams` record. */
export function resolveMissGapEntryFromRecord(
  query: Record<string, string | string[] | undefined>,
  locale: string,
): MissGapEntry {
  return resolveMissGapEntry(searchRecordToParams(query), locale);
}
