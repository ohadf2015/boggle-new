/**
 * Where a player goes when they LEAVE a multiplayer room.
 *
 * The entry path into a classroom game carries education context in the query
 * string (`?room=X&classroom=true&host=true`). The exit path did not: it
 * stripped those params (see `stripExitParams.ts`) and left the user standing
 * on `/multiplayer`, which without them is the CONSUMER arcade lobby. A teacher
 * who tapped Back mid-lesson landed on "Free Multiplayer Word Game — 2-20
 * Players, 8 Modes, No Signup" with the education shell gone. That is the
 * asymmetry (pitfalls class 3): one direction carries the context, the other
 * discards it and then chooses nothing.
 *
 * Stripping is correct and stays — it closes the audit `multiplayer-ux-
 * 2026-05-04 #5` trap where a reload re-entered the lobby the user was leaving.
 * Choosing the destination is the missing half, and it lives here (pure) rather
 * than inside PageClient, which is a provider-wrapped app shell no unit test can
 * render. Same reasoning as `lib/education/classroomRoomGone.ts`.
 */
import { classroomStudentHomePath } from '@/lib/education/classroomRoomGone';

export interface MultiplayerExitParams {
  /** The room was opened with `?classroom=true`. */
  isClassroomMode: boolean;
  /** This client holds the host seat — in a classroom room that is the teacher. */
  isHost: boolean;
  /** UI locale, used to keep the exit inside the user's language. */
  locale: string;
}

/**
 * The route to send the player to, or `null` to stay put and reset in place.
 *
 * `null` is the ordinary arcade answer and deliberately preserves existing
 * behaviour: for a normal multiplayer game the lobby genuinely IS home, and the
 * in-place reset exists because a hard navigation blanks the Capacitor
 * static-export WebView. Only a classroom room needs to go somewhere else.
 */
export function multiplayerExitDestination({
  isClassroomMode,
  isHost,
  locale,
}: MultiplayerExitParams): string | null {
  if (!isClassroomMode) return null;
  // The teacher is the only host a classroom room ever has, and their hub is the
  // teacher dashboard — derived from the role, so a second launch surface (the
  // full setup page as well as quick launch) returns to the same place without
  // either call site naming a route.
  if (isHost) return `/${locale || 'en'}/teacher`;
  return classroomStudentHomePath(locale);
}
