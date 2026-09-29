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

/** Fetch lifecycle of the room's live record (`useClassroomLiveGame`). */
export type ClassroomRecordStatus = 'idle' | 'loading' | 'found' | 'absent' | 'error';

/**
 * Whether the current room is a classroom room: 'classroom', 'arcade', or
 * 'pending' while the record fetch is still out. Tri-state on purpose — a
 * boolean answered "arcade" during the fetch window, an optimistic default a
 * later source flips (pitfall class 1), and the consumers are irreversible
 * navigations.
 */
export type ClassroomContext = 'classroom' | 'arcade' | 'pending';

export interface ClassroomContextParams {
  /** The room was opened with `?classroom=true`. */
  urlClassroom: boolean;
  /** Lifecycle of the room's live record. */
  recordStatus: ClassroomRecordStatus;
}

/**
 * Resolve the classroom context from the two sources. The URL flag alone
 * misses the student who typed a classroom code into the arcade lobby; the
 * record (404 for arcade rooms) is the server-backed second source. Either
 * positive answer is sufficient; 'arcade' only once the record has actually
 * answered. 'error' (retries exhausted, e.g. sustained 429) degrades to the
 * pre-detection behavior rather than blocking decisions forever.
 */
export function resolveClassroomContext({ urlClassroom, recordStatus }: ClassroomContextParams): ClassroomContext {
  if (urlClassroom || recordStatus === 'found') return 'classroom';
  // 'idle' means no fetch is in flight and none is coming (no valid room
  // code) — mapping it to 'pending' would park a deferred decision forever.
  if (recordStatus !== 'loading') return 'arcade';
  return 'pending';
}

export type HostTransferAction = 'exit-to-hub' | 'accept-host' | 'defer';

/**
 * What this client does when the server hands it the host seat. A classroom
 * student never accepts; a pending context DEFERS — the transfer is flushed
 * once the record resolves, so a classroom student is never permanently
 * promoted inside the fetch window.
 */
export function hostTransferAction({ context, isHost }: { context: ClassroomContext; isHost: boolean }): HostTransferAction {
  if (isHost) return 'accept-host';
  if (context === 'classroom') return 'exit-to-hub';
  if (context === 'pending') return 'defer';
  return 'accept-host';
}

export type RoomGoneAction = 'exit-to-hub' | 'arcade-feedback' | 'defer';

/**
 * What this client does when the server says the room is gone. Same policy as
 * the host transfer: classroom students go to their hub, a pending context
 * defers rather than guessing arcade, everyone else keeps the arcade feedback.
 */
export function roomGoneAction({ context, isHost }: { context: ClassroomContext; isHost: boolean }): RoomGoneAction {
  if (isClassroomStudent({ isClassroomMode: context === 'classroom', isHost })) return 'exit-to-hub';
  if (context === 'pending' && !isHost) return 'defer';
  return 'arcade-feedback';
}

/** Where a classroom student goes when the room is gone. */
export function classroomStudentHomePath(locale: string): string {
  return `/${locale || 'en'}/student`;
}
