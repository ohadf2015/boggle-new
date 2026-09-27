/**
 * The `join` payload that puts a seated player back in their room — used by
 * BOTH doors back in: a socket re-connect (useMultiplayerSocket onConnect) and
 * a page reload (useReloadRejoin). One payload shape through both (pitfall
 * class 3); a missing authToken used to lose the authenticated mapping.
 *
 * `null` = not seated (never joined, or LEFT: `clearSessionPreservingUsername`
 * keeps only the name) — so a reload after leaving stays on the entry, which
 * is the 2026-05-04 exit-trap guard.
 */
export interface RejoinSessionLike {
  gameCode?: string;
  username?: string;
}

export interface RejoinPayload {
  gameCode: string;
  username: string;
  authToken?: string;
}

export function buildRejoinPayload(session: RejoinSessionLike | null | undefined, authToken: unknown): RejoinPayload | null {
  if (!session?.gameCode || !session.username) return null;
  const payload: RejoinPayload = { gameCode: session.gameCode, username: session.username };
  if (typeof authToken === 'string' && authToken) payload.authToken = authToken;
  return payload;
}
