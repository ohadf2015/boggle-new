/**
 * Compute the longest consecutive streak from a list of ISO date strings.
 *
 * Given an array of ISO dates (e.g. '2026-09-20'), finds the longest run
 * of consecutive calendar days. Handles unsorted input, duplicates, and gaps.
 *
 * @param dates array of ISO date strings (YYYY-MM-DD)
 * @returns longest consecutive day count, 0 if empty
 *
 * Example:
 *   computeLongestConsecutiveStreak(['2026-09-20', '2026-09-19', '2026-09-18', '2026-09-15', '2026-09-14'])
 *   // run 1: 09-20 → 09-19 → 09-18 (3 days)
 *   // gap at 09-17
 *   // run 2: 09-15 → 09-14 (2 days)
 *   // returns 3
 */
export function computeLongestConsecutiveStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  // Deduplicate and sort in descending order
  const uniqueSorted = Array.from(new Set(dates))
    .sort()
    .reverse();

  let longestRun = 1;
  let currentRun = 1;

  for (let i = 1; i < uniqueSorted.length; i++) {
    const prevDate = new Date(uniqueSorted[i - 1] + 'T00:00:00Z');
    const currDate = new Date(uniqueSorted[i] + 'T00:00:00Z');

    // Calculate difference in days
    const timeDiff = prevDate.getTime() - currDate.getTime();
    const dayDiff = timeDiff / (1000 * 60 * 60 * 24);

    if (dayDiff === 1) {
      // Consecutive day
      currentRun++;
    } else {
      // Gap found; reset run
      longestRun = Math.max(longestRun, currentRun);
      currentRun = 1;
    }
  }

  // Don't forget the final run
  return Math.max(longestRun, currentRun);
}
