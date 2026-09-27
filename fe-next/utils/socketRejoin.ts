/**
 * Rejoin-intent carrier.
 *
 * Problem it solves: on a server restart (version upgrade/deploy) the backend
 * rehydrates game state from Redis but CANNOT rehydrate the in-memory
 * socket→game / socket→username maps — socket ids are ephemeral, so a
 * reconnecting client arrives with a fresh id the server has never seen. Its
 * recovery handlers (`requestResults`, `requestGameState`) are gated on
 * `getGameBySocketId(socket.id)` and silently no-op, so the player is stuck:
 * any action is rejected with "You are not in a game" and the results page is
 * blank.
 *
 * Fix: when a player joins a multiplayer game we remember the exact `join`
 * payload here. On every RECONNECT, SocketContext re-emits `join` with it,
 * driving the server's existing (idempotent, validated) reconnection path that
 * rebuilds the socket mapping and restores in-progress board OR finished
 * results. The intent is cleared the moment the player legitimately leaves
 * (see `clearSession` in `utils/session.ts`), so a stale descriptor can never
 * pull a player back into a game they exited.
 *
 * Kept deliberately separate from `socket.auth` (which already carries the auth
 * token, see useMultiplayerSocket) and from React state — it must outlive the
 * socket instance AND any single component, but reset on a full page reload
 * (where the normal join flow runs again anyway).
 */

export interface RejoinIntent {
  gameCode: string;
  username: string;
  authUserId?: string | null;
  guestTokenHash?: string | null;
  guestSessionId?: string | null;
  avatar?: unknown;
}

let currentIntent: RejoinIntent | null = null;

/** Remember how to rejoin the game the player just joined. */
export function setRejoinIntent(intent: RejoinIntent): void {
  currentIntent = intent;
}

/** Forget the rejoin intent — the player has left this game. */
export function clearRejoinIntent(): void {
  currentIntent = null;
}

/** The current rejoin intent, or null if the player is not in a game. */
export function getRejoinIntent(): RejoinIntent | null {
  return currentIntent;
}

/**
 * Decide what (if anything) to re-emit as `join` when a socket fires `connect`.
 *
 * Only a RECONNECT triggers a rejoin: the very first connect is already handled
 * by the lobby's own join flow, so re-emitting there would be a redundant
 * double-join. With no intent the player isn't in a game, so nothing happens.
 */
export function planReconnectRejoin(opts: {
  isReconnect: boolean;
  intent: RejoinIntent | null;
}): RejoinIntent | null {
  if (!opts.isReconnect) return null;
  return opts.intent;
}
