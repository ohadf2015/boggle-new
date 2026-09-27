/**
 * Decides what feedback to show when a room join fails with a "gone" error
 * (GAME_NOT_FOUND / GAME_CLOSED — see `classifyRoomError`).
 *
 * Regression (2026-05-25): a user who followed a friend's invite link to a
 * room that no longer existed was silently dropped on an empty lobby. The
 * `onError` handler in the multiplayer PageClient only toasted when the user
 * was already `isActive` in a room, with a comment asserting cold invite-link
 * follows should redirect silently. In practice that produced the reported
 * "empty page": the invite auto-join failed, `room=` was stripped from the
 * URL (leaving `/multiplayer?utm_source=solo-confirm&...`), and the visitor
 * stared at a bare "NO BATTLES IN PROGRESS" lobby with no idea the room had
 * expired. This reverses that choice for invite follows — they now get a clear
 * message.
 *
 * 2026-08-25: the silent branch that survived that fix is gone too. It only
 * covered "stale lobby tap", but PageClient strips `room=` from the URL after
 * the first failure, so an invite follower's SECOND attempt arrived with
 * `cameFromInvite: false` and fell into it — re-opening the same regression
 * from the retry side. 14d of prod: 46 users hit a gone-room error 232 times
 * (5.2 attempts each) and 42 of 54 error sessions had no `room=` left in the
 * URL. `/multiplayer` is the product's #1 rageclick page. Every branch now
 * returns feedback; the call site dedupes by toast id so a run of dead-room
 * taps collapses to one message.
 *
 * Pure: no `toast`, `t`, or `window` access. The call site supplies the inputs
 * and renders the returned key/params.
 */
export interface RoomGoneToast {
  /** Translation key to render via `t(key, params)`. */
  key: 'multiplayerFlow.roomTimedOut' | 'invite.toast.notFound' | 'invite.toast.expired';
  /** Interpolation params for the key (only `invite.toast.notFound` uses `{code}`). */
  params?: { code: string };
  /** Leading toast icon. */
  icon: string;
}

interface RoomGoneInput {
  /** True when the user was already playing in this room (mid-game teardown). */
  wasActive: boolean;
  /** True when the user reached this room via an invite link (`?room=` in URL). */
  cameFromInvite: boolean;
  /** The room code being joined; may be empty if already cleared. */
  roomCode: string;
}

export function roomGoneFeedback(input: RoomGoneInput): RoomGoneToast {
  if (input.wasActive) {
    return { key: 'multiplayerFlow.roomTimedOut', icon: '⏱️' };
  }
  if (input.cameFromInvite) {
    return input.roomCode
      ? { key: 'invite.toast.notFound', params: { code: input.roomCode }, icon: '🔍' }
      : { key: 'invite.toast.expired', icon: '🔍' };
  }
  // Stale lobby tap, or an invite follow re-tapping after `room=` was stripped
  // (see the test file for the 14-day prod numbers). Never silent: the only
  // other feedback is the dead row disappearing from the list, and 46 people
  // read that as "nothing happened" and tapped 5.2 times each.
  // `invite.toast.notFound` is worded generically ("Room {code} is no longer
  // available"), so it carries both populations without a new key.
  return input.roomCode
    ? { key: 'invite.toast.notFound', params: { code: input.roomCode }, icon: '🔍' }
    : { key: 'multiplayerFlow.roomTimedOut', icon: '⏱️' };
}
