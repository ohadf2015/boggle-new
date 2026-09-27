/**
 * Pure countdown to the weekly league reset (promotion/relegation moment).
 *
 * `now` is injected so the function is deterministic and unit-testable — the
 * caller passes Date.now(). Returns null when there's no valid future reset.
 */
export interface LeagueResetCountdown {
  days: number;
  hours: number;
  totalHours: number;
  /** Under 24h remaining — surface with urgency styling. */
  urgent: boolean;
}

const HOUR_MS = 3600_000;

export function formatLeagueResetCountdown(
  weekEndIso: string | null | undefined,
  nowMs: number
): LeagueResetCountdown | null {
  if (!weekEndIso) return null;
  const end = Date.parse(weekEndIso);
  if (Number.isNaN(end)) return null;

  const remaining = end - nowMs;
  if (remaining <= 0) return null;

  const totalHours = Math.floor(remaining / HOUR_MS);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  return { days, hours, totalHours, urgent: totalHours < 24 };
}
