import { describe, it, expect } from 'vitest';
import {
  getMonthlySeasonBounds,
  getCurrentSeasonDynamic,
  GRANDFATHERED_SEASON_1_END,
} from '../seasons';

describe('getMonthlySeasonBounds', () => {
  it('grandfathers Jan 2026 into Season 1', () => {
    const bounds = getMonthlySeasonBounds(new Date('2026-01-15T12:00:00Z'));
    expect(bounds.id).toBe(1);
    expect(bounds.start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(bounds.end.toISOString()).toBe(GRANDFATHERED_SEASON_1_END);
  });

  it('grandfathers Feb-Apr 2026 into Season 1', () => {
    expect(getMonthlySeasonBounds(new Date('2026-02-10T00:00:00Z')).id).toBe(1);
    expect(getMonthlySeasonBounds(new Date('2026-03-31T23:59:59Z')).id).toBe(1);
    expect(getMonthlySeasonBounds(new Date('2026-04-26T00:00:00Z')).id).toBe(1);
  });

  it('returns Season 2 for May 2026 (first monthly season)', () => {
    const bounds = getMonthlySeasonBounds(new Date('2026-05-15T00:00:00Z'));
    expect(bounds.id).toBe(2);
    expect(bounds.start.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(bounds.end.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });

  it('increments season id monthly thereafter', () => {
    expect(getMonthlySeasonBounds(new Date('2026-06-15T00:00:00Z')).id).toBe(3);
    expect(getMonthlySeasonBounds(new Date('2026-12-15T00:00:00Z')).id).toBe(9);
  });

  it('rolls over the year boundary correctly', () => {
    const dec = getMonthlySeasonBounds(new Date('2026-12-15T00:00:00Z'));
    expect(dec.start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(dec.end.toISOString()).toBe('2027-01-01T00:00:00.000Z');

    const jan2027 = getMonthlySeasonBounds(new Date('2027-01-15T00:00:00Z'));
    expect(jan2027.id).toBe(10);
    expect(jan2027.start.toISOString()).toBe('2027-01-01T00:00:00.000Z');
    expect(jan2027.end.toISOString()).toBe('2027-02-01T00:00:00.000Z');
  });

  it('handles the exact boundary instant (2026-05-01T00:00:00Z) as Season 2', () => {
    const boundary = getMonthlySeasonBounds(new Date('2026-05-01T00:00:00Z'));
    expect(boundary.id).toBe(2);
    expect(boundary.start.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });
});

describe('getCurrentSeasonDynamic', () => {
  it('returns Season 1 for any date inside grandfathered window', () => {
    const season = getCurrentSeasonDynamic(new Date('2026-04-26T00:00:00Z'));
    expect(season.id).toBe(1);
    expect(season.name).toContain('Season 1');
    expect(season.startDate.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(season.endDate.toISOString()).toBe(GRANDFATHERED_SEASON_1_END);
    expect(season.rewards.length).toBeGreaterThan(0);
  });

  it('returns Season 2 for May 2026', () => {
    const season = getCurrentSeasonDynamic(new Date('2026-05-15T00:00:00Z'));
    expect(season.id).toBe(2);
    expect(season.name).toContain('Season 2');
  });

  it('cycles theme names through SEASON_THEMES list', () => {
    const s2 = getCurrentSeasonDynamic(new Date('2026-05-15T00:00:00Z'));
    const s6 = getCurrentSeasonDynamic(new Date('2026-09-15T00:00:00Z'));
    expect(s2.theme).toBeTruthy();
    expect(s6.theme).toBeTruthy();
  });

  it('falls back to current date when called with no argument', () => {
    const season = getCurrentSeasonDynamic();
    expect(season.id).toBeGreaterThan(0);
    expect(season.startDate).toBeInstanceOf(Date);
    expect(season.endDate.getTime()).toBeGreaterThan(season.startDate.getTime());
  });
});
