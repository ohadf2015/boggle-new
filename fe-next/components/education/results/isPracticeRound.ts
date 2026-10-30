/** A round only bots played: the teacher rehearsing before the class arrives. The host's own row never counts. */
export function isPracticeRound(players: ReadonlyArray<{ isBot?: boolean; isHost?: boolean }> | undefined): boolean {
  const seated = (players ?? []).filter((p) => !p.isHost);
  return seated.length > 0 && seated.every((p) => p.isBot === true);
}
