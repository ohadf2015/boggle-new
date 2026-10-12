/**
 * Signed-in student opens a classroom invite (`/join/[code]` or `/join?code=`).
 *
 * Those links only prefilled the code. The student still had to tap, and a
 * join with no live game was sent to `/student` — the bare hub, with no
 * membership and no join-funnel events. The teacher funnel then read zero
 * joins even when the link had been shared.
 *
 * This module decides the outcome. It does not talk to the database. The
 * server page calls `autoJoinSignedInStudent`, which enrols through the existing
 * classroom join route and then uses the href and events built here.
 */

import { focusPracticeHref, readAssignmentFocus } from '@/lib/education/vocabFocus';
import { readAssignmentMode, wordCraftPracticeHref, WORDCRAFT_FOCUS } from '@/lib/education/wordcraftAssignment';

export const EDUCATION_JOIN_STARTED = 'education_join_started';
export const EDUCATION_JOIN_COMPLETED = 'education_join_completed';

const JOIN_CODE_RE = /^[A-Z0-9]{6}$/;
const LOCALE_RE = /^[a-z]{2}$/;
const LESSON_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** `sb-<ref>-auth-token`, plus the `.0` / `.1` chunks @supabase/ssr uses. */
const AUTH_COOKIE_RE = /^sb-.+-auth-token(\.\d+)?$/;

export function normalizeJoinCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isAutoJoinCode(code: string): boolean {
  return JOIN_CODE_RE.test(normalizeJoinCode(code));
}

export function isJoinLocale(locale: string): boolean {
  return LOCALE_RE.test(locale);
}

/** True when the request carries a Supabase auth cookie. A guest QR scan has none. */
export function hasAuthSessionCookie(names: readonly string[]): boolean {
  return names.some((name) => AUTH_COOKIE_RE.test(name));
}

export interface AssignmentPick {
  lessonId: string;
  practiceFocus: string | null;
  dueDate: string | null;
  createdAt: string;
}

export interface AssignmentRow {
  lesson_id: string | null;
  practice_focus?: string | null;
  due_date?: string | null;
  created_at?: string | null;
}

/**
 * The homework a freshly joined student should open. Soonest due date wins;
 * an undated row loses to a dated one; equal dues keep the older assignment.
 * Same ordering as `nextOpenAssignment`, minus completion (unknown here).
 */
export function pickAssignment(rows: readonly AssignmentRow[]): AssignmentPick | null {
  const usable = rows.filter(
    (row): row is AssignmentRow & { lesson_id: string } =>
      typeof row.lesson_id === 'string' && LESSON_ID_RE.test(row.lesson_id)
  );
  if (usable.length === 0) return null;

  usable.sort((a, b) => {
    const ad = a.due_date || null;
    const bd = b.due_date || null;
    if (ad && bd && ad !== bd) return ad < bd ? -1 : 1;
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    const ac = a.created_at || '';
    const bc = b.created_at || '';
    if (ac !== bc) return ac < bc ? -1 : 1;
    return 0;
  });

  const pick = usable[0];
  return {
    lessonId: pick.lesson_id,
    practiceFocus: pick.practice_focus ?? null,
    dueDate: pick.due_date ?? null,
    createdAt: pick.created_at || '',
  };
}

/**
 * Where the hub's own lesson opener would send this assignment. Word Craft
 * and a pinned vocab focus are different URLs from a plain lesson; sending
 * every student to the plain lesson drops them out of the assigned mode.
 */
export function assignmentViewHref(locale: string, assignment: AssignmentPick): string {
  const row = { practice_focus: assignment.practiceFocus };
  if (readAssignmentMode(row) === WORDCRAFT_FOCUS) {
    return wordCraftPracticeHref(locale, assignment.lessonId);
  }
  const focus = readAssignmentFocus(row);
  if (focus) return focusPracticeHref(locale, assignment.lessonId, focus);
  return `/${locale}/student/lessons/${assignment.lessonId}`;
}

export interface SignedInJoinDest {
  gameCode: string | null;
  assignment: AssignmentPick | null;
}

/**
 * Never the bare `/student` hub. A live game is the classroom right now; an
 * assignment is the homework; otherwise the lesson list, which is the class
 * once a membership exists.
 */
export function signedInJoinHref(locale: string, dest: SignedInJoinDest): string {
  if (dest.gameCode && JOIN_CODE_RE.test(dest.gameCode)) {
    return `/${locale}/multiplayer?room=${dest.gameCode}&classroom=true`;
  }
  if (dest.assignment) return assignmentViewHref(locale, dest.assignment);
  return `/${locale}/student/lessons`;
}

export interface JoinFunnelEvent {
  distinctId: string;
  event: typeof EDUCATION_JOIN_STARTED | typeof EDUCATION_JOIN_COMPLETED;
  properties: { classroom_id: string; is_test_account: boolean };
}

/** Both funnel steps, in order, each carrying the classroom the join landed in. */
export function signedInJoinEvents(args: {
  studentId: string;
  classroomId: string;
  isTestAccount: boolean;
}): JoinFunnelEvent[] {
  const properties = {
    classroom_id: args.classroomId,
    is_test_account: args.isTestAccount,
  };
  return [
    { distinctId: args.studentId, event: EDUCATION_JOIN_STARTED, properties: { ...properties } },
    { distinctId: args.studentId, event: EDUCATION_JOIN_COMPLETED, properties: { ...properties } },
  ];
}

export interface SignedInJoinSuccess {
  ok: true;
  classroomId: string;
  alreadyMember: boolean;
  gameCode: string | null;
}

export interface SignedInJoinFailure {
  ok: false;
}

export type SignedInJoinOutcome = SignedInJoinSuccess | SignedInJoinFailure;

export interface SignedInJoinUser {
  id: string;
  email?: string | null;
}

/**
 * Enrol, record the funnel, and return the URL to send the student to.
 * `null` means "do not redirect" — bad code, refused join, or no session —
 * and the invite page keeps showing the form.
 *
 * An existing member is redirected (they opened the link to get into class)
 * but does not emit another join. Re-opening the link must not inflate
 * student-joins-per-teacher.
 */
export async function completeSignedInJoin(args: {
  locale: string;
  code: string;
  user: SignedInJoinUser;
  isTestAccount: boolean;
  join: (code: string) => Promise<SignedInJoinOutcome>;
  findAssignment: (classroomId: string) => Promise<AssignmentPick | null>;
  capture: (events: JoinFunnelEvent[]) => void;
}): Promise<string | null> {
  if (!isJoinLocale(args.locale) || !isAutoJoinCode(args.code)) return null;

  const joined = await args.join(normalizeJoinCode(args.code));
  if (!joined.ok || !joined.classroomId) return null;

  if (!joined.alreadyMember) {
    args.capture(
      signedInJoinEvents({
        studentId: args.user.id,
        classroomId: joined.classroomId,
        isTestAccount: args.isTestAccount,
      })
    );
  }

  // The membership is already written. A homework lookup that fails must not
  // put the student back on the form — the lesson list still knows the class.
  // A game code that is not six letters-and-digits is not a room, so it must
  // not also hide the assignment.
  const liveGame = joined.gameCode && JOIN_CODE_RE.test(joined.gameCode) ? joined.gameCode : null;
  let assignment: AssignmentPick | null = null;
  if (!liveGame) {
    try {
      assignment = await args.findAssignment(joined.classroomId);
    } catch {
      assignment = null;
    }
  }
  return signedInJoinHref(args.locale, { gameCode: liveGame, assignment });
}
