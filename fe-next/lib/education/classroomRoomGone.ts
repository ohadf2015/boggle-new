/**
 * What happens to a CLASSROOM STUDENT when their room stops existing.
 *
 * A live run (critic-livequiz-r4) closed one classroom room and produced three
 * different outcomes: the teacher saw a "host left" countdown, one student was
 * dropped onto the generic multiplayer hub with no explanation, and the other
 * was promoted into the host's own share-code/QR screen because the ordinary
 * multiplayer host-migration fired on them.
 *
 * Both student outcomes are wrong for the same reason: in a classroom room the
 * teacher is the only host, and a student's home is the student hub, not the
 * arcade. These two decisions live here — pure, so they can be tested away from
 * `app/[locale]/multiplayer/PageClient.tsx`, which is an app shell no unit test
 * can render.
 */

/** i18n key for the message a student sees when their class room is gone. */
export const CLASSROOM_ROOM_GONE_KEY = 'education.student.classroomRoomGone';

export interface ClassroomRoleParams {
  /** The room was opened with `?classroom=true`. */
  isClassroomMode: boolean;
  /** This client currently holds the host role (the teacher). */
  isHost: boolean;
}

/**
 * True for a student sitting in a classroom room — the one role that must never
 * inherit the host seat and must never be left on the multiplayer hub.
 */
export function isClassroomStudent({ isClassroomMode, isHost }: ClassroomRoleParams): boolean {
  return isClassroomMode && !isHost;
}

/** Where a classroom student goes when the room is gone. */
export function classroomStudentHomePath(locale: string): string {
  return `/${locale || 'en'}/student`;
}
