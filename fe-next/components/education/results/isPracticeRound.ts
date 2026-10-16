/** A round only bots played: the teacher rehearsing before the class arrives. */
export function isPracticeRound(players: ReadonlyArray<{ isBot?: boolean }> | undefined): boolean {
  return !!players && players.length > 0 && players.every((p) => p.isBot === true);
}
