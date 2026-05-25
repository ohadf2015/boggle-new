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
 * message — while keeping silent dismissal for stale lobby taps.
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

export function roomGoneFeedback(input: RoomGoneInput): RoomGoneToast | null {
  if (input.wasActive) {
    return { key: 'multiplayerFlow.roomTimedOut', icon: '⏱️' };
  }
  if (input.cameFromInvite) {
    return input.roomCode
      ? { key: 'invite.toast.notFound', params: { code: input.roomCode }, icon: '🔍' }
      : { key: 'invite.toast.expired', icon: '🔍' };
  }
  return null;
}
