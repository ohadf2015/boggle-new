export const COMEBACK_GAMES = 3;

export function lastMissedIndex(lit: ReadonlySet<number>, todayIndex: number | null, trackLength: number): number | null {
  const upTo = todayIndex ?? trackLength;
  for (let i = Math.min(upTo, trackLength) - 1; i >= 0; i--) if (!lit.has(i)) return i;
  return null;
}
