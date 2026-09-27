/**
 * One team, one colour, everywhere it appears.
 *
 * Team 1 is pink on the projector during the round, pink on the tug-of-war,
 * and pink on the results standings. That only holds if every surface reads the
 * same array — the results screen had the only copy until the projector learned
 * to paint teams live (2026-09-16), and a second copy would have drifted the
 * first time someone reordered one of them.
 *
 * Solid accent fills with BLACK labels: an accent on navy passes the 3:1 edge
 * gate, a black border on navy is 1.23:1 and does not.
 */
export const TEAM_FILL_CLASSES = [
  'bg-neo-pink',
  'bg-neo-cyan',
  'bg-neo-lime',
  'bg-neo-yellow',
] as const;

export function teamFillClass(teamId: number): string {
  return TEAM_FILL_CLASSES[teamId % TEAM_FILL_CLASSES.length];
}
