const DAY_MS = 86_400_000;

function dayNumber(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`) / DAY_MS;
}

/**
 * Consecutive days a class has played, ending today or yesterday. Yesterday
 * still counts while today is unplayed: a class has all day to play.
 */
export function computeClassStreak(
  playedDays: readonly string[],
  todayIso: string
): { streak: number; playedToday: boolean } {
  const days = new Set(playedDays.map(dayNumber));
  const today = dayNumber(todayIso);
  const playedToday = days.has(today);
  let cursor = playedToday ? today : today - 1;
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= 1;
  }
  return { streak, playedToday };
}
