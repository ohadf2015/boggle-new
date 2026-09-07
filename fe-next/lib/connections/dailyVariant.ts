/**
 * Word Bridge daily-challenge variant selection (pure).
 *
 * The daily quest alternates between the two challenge flavors by UTC day:
 *   - 'regular' — the classic 5-riddle chain (shared leaderboard, score submit)
 *   - 'pyramid' — the 3-stage tower with a meta-answer finale
 *
 * Pure function of the UTC date ONLY, so every player worldwide gets the same
 * variant on the same day — the daily hub card, the /connections/daily host
 * and any share link all resolve identically. Epoch-day parity keeps the
 * cadence strictly alternating regardless of month boundaries.
 *
 * Even epoch days → 'regular', odd → 'pyramid' (2026-09-07 is odd → pyramid).
 */

export type ConnectionsDailyVariant = 'regular' | 'pyramid';

const MS_PER_DAY = 86_400_000;

/**
 * Which Word Bridge variant the daily challenge runs on a given UTC date
 * (`YYYY-MM-DD`). Invalid input falls back to 'regular' — the variant with
 * the shared leaderboard and the safest default.
 */
export function dailyConnectionsVariant(dateISO: string): ConnectionsDailyVariant {
  const ms = Date.parse(`${dateISO}T00:00:00Z`);
  if (Number.isNaN(ms)) return 'regular';
  const epochDay = Math.floor(ms / MS_PER_DAY);
  return epochDay % 2 === 0 ? 'regular' : 'pyramid';
}
