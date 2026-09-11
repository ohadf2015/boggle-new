/**
 * The one payload that says "the teacher ended the class".
 *
 * A leaf, because two unrelated paths send it and neither should have to
 * import the other: `classroomGameEndHandler` broadcasts it to the room at
 * teardown, and `classroomGameRecovery` sends it to a single socket that turns
 * up afterwards asking to recover a session that is already over. Two routes
 * to the same news must not word it differently (pitfall class 3) — and the
 * recovery listener must not drag a zod schema and a Supabase persistence
 * module into its import graph to reuse four lines.
 *
 * `hostLeftRoomClosing` is the carrier because the multiplayer client already
 * answers it: a toast with this message, a ten-second grace modal, and — for a
 * classroom student — a route home to `/student` rather than the arcade
 * (`lib/education/classroomRoomGone`). Reusing it means no new client branch.
 *
 * `message` is the wire-level English fallback the payload type requires;
 * `resolveHostLeftMessage` prefers `i18nKey` and only falls back to it if a
 * locale is missing the key (audit 2026-05-10 — an English string is always
 * truthy and must never be the default). The key already exists in all six
 * locales, so this adds no copy and nothing to translate.
 *
 * `reason` is OMITTED deliberately. `HostLeftGraceModal` maps `reason` through
 * a `Record` over a closed union of three values, so adding a fourth would be
 * a type error in a component file this change has no business touching. The
 * modal therefore shows its generic body while the toast carries the specific
 * line.
 */

import { CLASSROOM_ROOM_GONE_KEY } from '@/lib/education/classroomRoomGone';

export interface SessionEndedNotice {
  message: string;
  i18nKey: string;
}

export function sessionEndedNotice(): SessionEndedNotice {
  return {
    message: 'Your class game ended. Ask your teacher to start a new one.',
    i18nKey: CLASSROOM_ROOM_GONE_KEY,
  };
}

export default sessionEndedNotice;
