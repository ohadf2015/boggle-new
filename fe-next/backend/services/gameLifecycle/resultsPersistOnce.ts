const persistedSession = new WeakMap<object, number | string | null>();

/** True once per room per round; a repeat (e.g. the scoring-failure fallback) must not write XP twice. */
export function claimResultsPersist(game: { gameSessionId?: number | string | null }): boolean {
  const session = game.gameSessionId ?? null;
  if (persistedSession.has(game) && persistedSession.get(game) === session) return false;
  persistedSession.set(game, session);
  return true;
}
