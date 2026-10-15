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

import { classroomLivePath } from '@/lib/education/classroomLivePath';

export const EDUCATION_JOIN_STARTED = 'education_join_started';
export const EDUCATION_JOIN_COMPLETED = 'education_join_completed';
export const STUDENT_JOIN_STARTED = 'student_join_started';
export const STUDENT_JOIN_COMPLETED = 'student_join_completed';

const JOIN_CODE_RE = /^[A-Z0-9]{6}$/;
const LOCALE_RE = /^[a-z]{2}$/;
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

export interface SignedInJoinDest {
  gameCode: string | null;
}

/**
 * Never the bare `/student` hub. A live game is the classroom right now; with
 * no live game the class view opens on the hub — `?class=open` surfaces
 * ClassSheet with the student's next open assignment (the hub's own
 * `nextOpenAssignment`, not a second picker).
 */
export function signedInJoinHref(locale: string, dest: SignedInJoinDest): string {
  if (dest.gameCode && JOIN_CODE_RE.test(dest.gameCode)) {
    return classroomLivePath(locale, dest.gameCode);
  }
  return `/${locale}/student?class=open`;
}

export type JoinFunnelEventName =
  | typeof EDUCATION_JOIN_STARTED
  | typeof EDUCATION_JOIN_COMPLETED
  | typeof STUDENT_JOIN_STARTED
  | typeof STUDENT_JOIN_COMPLETED;

export interface JoinFunnelEvent {
  distinctId: string;
  event: JoinFunnelEventName;
  properties: { classroom_id: string; is_test_account: boolean };
}

/**
 * Both funnel steps of BOTH funnels, in order, each carrying the classroom
 * the join landed in. `education_join_*` is the #1310 teacher-facing pair;
 * `student_join_*` mirrors it for the student join funnel so the server
 * auto-join path (which bypasses the client `useJoinFlow`) is counted there
 * too. The client is the source of truth for `student_join_*` on the typed/
 * guest path — this server pair is the invite auto-join only, and the two
 * never fire for the same join (the server redirects before the form paints).
 */
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
    { distinctId: args.studentId, event: STUDENT_JOIN_STARTED, properties: { ...properties } },
    { distinctId: args.studentId, event: STUDENT_JOIN_COMPLETED, properties: { ...properties } },
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

  // The membership is written at this point. A game code that is not six
  // letters-and-digits is not a room; with no live game the class view on the
  // hub is the destination and it finds the next open assignment itself.
  const liveGame = joined.gameCode && JOIN_CODE_RE.test(joined.gameCode) ? joined.gameCode : null;
  return signedInJoinHref(args.locale, { gameCode: liveGame });
}
