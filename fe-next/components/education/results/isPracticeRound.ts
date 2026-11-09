/** A round only bots and the teacher's own practice seat played. The host's own row never counts. */
export function isPracticeRound(players: ReadonlyArray<{ isBot?: boolean; isHost?: boolean; isPractice?: boolean }> | undefined): boolean {
  const seated = (players ?? []).filter((p) => !p.isHost);
  return seated.length > 0 && seated.every((p) => p.isBot === true || p.isPractice === true);
}
