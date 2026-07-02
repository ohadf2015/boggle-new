/**
 * Decides what feedback to show when a `join` succeeds after a socket
 * reconnect. Without it, a player who dropped mid-game silently lands back on
 * the board with no confirmation that the rejoin worked — indistinguishable
 * from the game never having noticed the disconnect.
 *
 * Pure: no `toast`, `t`, or `window` access (same contract as
 * `roomGoneFeedback`). The call site supplies the inputs and renders the
 * returned key/params.
 */
export interface RejoinToast {
  /** Translation key to render via `t(key, params)`. */
  key: 'multiplayerFlow.rejoinedRoom' | 'multiplayerFlow.rejoinedGame';
  /** Interpolation params (only `rejoinedRoom` uses `{code}`). */
  params?: { code: string };
  /** Leading toast icon. */
  icon: string;
}

interface RejoinInput {
  /** True when this join completed while a reconnect attempt was in flight. */
  wasReconnecting: boolean;
  /** The room code that was rejoined; may be empty if not yet known. */
  roomCode: string;
}

export function rejoinFeedback(input: RejoinInput): RejoinToast | null {
  if (!input.wasReconnecting) return null;
  return input.roomCode
    ? { key: 'multiplayerFlow.rejoinedRoom', params: { code: input.roomCode }, icon: '🔄' }
    : { key: 'multiplayerFlow.rejoinedGame', icon: '🔄' };
}
