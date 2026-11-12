/** A round only bots and the teacher's own practice seat played. The host's own row never counts. */
export function isPracticeRound(players: ReadonlyArray<{ isBot?: boolean; isHost?: boolean; isPractice?: boolean }> | undefined): boolean {
  const seated = (players ?? []).filter((p) => !p.isHost);
  return seated.length > 0 && seated.every((p) => p.isBot === true || p.isPractice === true);
}

type Seat = { isBot?: boolean; isHost?: boolean; isPractice?: boolean };

/** The room's own rehearsal flag wins (scores can drop a seat that left); without it, infer from who played. A real student always makes it real. */
export function isRehearsalRound(players: ReadonlyArray<Seat> | undefined, explicitRehearsal: boolean | undefined): boolean {
  if (!explicitRehearsal) return isPracticeRound(players);
  return !(players ?? []).some((p) => !p.isHost && p.isBot !== true && p.isPractice !== true);
}
