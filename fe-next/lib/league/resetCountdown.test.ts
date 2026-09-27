import { describe, it, expect } from 'vitest';
import { formatLeagueResetCountdown } from './resetCountdown';

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const now = 1_000_000_000_000; // fixed reference

describe('formatLeagueResetCountdown', () => {
  it('returns null for missing or invalid weekEnd', () => {
    expect(formatLeagueResetCountdown(null, now)).toBeNull();
    expect(formatLeagueResetCountdown('not-a-date', now)).toBeNull();
  });

  it('returns null once the reset time has passed', () => {
    expect(formatLeagueResetCountdown(new Date(now - HOUR).toISOString(), now)).toBeNull();
    expect(formatLeagueResetCountdown(new Date(now).toISOString(), now)).toBeNull();
  });

  it('breaks remaining time into days + leftover hours', () => {
    const r = formatLeagueResetCountdown(new Date(now + 2 * DAY + 5 * HOUR).toISOString(), now);
    expect(r).toEqual({ days: 2, hours: 5, totalHours: 53, urgent: false });
  });

  it('flags urgency under 24h remaining', () => {
    const r = formatLeagueResetCountdown(new Date(now + 6 * HOUR).toISOString(), now);
    expect(r).toMatchObject({ days: 0, hours: 6, urgent: true });
  });

  it('is not urgent at exactly 24h+', () => {
    expect(formatLeagueResetCountdown(new Date(now + DAY).toISOString(), now)!.urgent).toBe(false);
  });

  it('rounds down partial hours', () => {
    const r = formatLeagueResetCountdown(new Date(now + 3 * HOUR + 59 * 60_000).toISOString(), now);
    expect(r).toMatchObject({ hours: 3 });
  });
});
