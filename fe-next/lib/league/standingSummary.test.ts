import { describe, it, expect } from 'vitest';
import { getLeagueStandingSummary } from './standingSummary';

describe('getLeagueStandingSummary', () => {
  // Full league of 30: promo = top 10, relegation = bottom 5 (positions 26-30).
  const full = (position: number) => getLeagueStandingSummary({ position, totalPlayers: 30 });

  it('flags the promotion zone (top 10) with no climb needed', () => {
    expect(full(1)).toEqual({ zone: 'promotion', toPromotion: 0, aboveRelegation: 25 });
    expect(full(10).zone).toBe('promotion');
    expect(full(10).toPromotion).toBe(0);
  });

  it('flags the safe zone and reports positions to promotion + cushion', () => {
    const s = full(15);
    expect(s.zone).toBe('safe');
    expect(s.toPromotion).toBe(5); // 15 - 10
    expect(s.aboveRelegation).toBe(11); // relegationLine 26 - 15
  });

  it('flags the relegation zone (bottom 5) with zero cushion', () => {
    expect(full(26)).toEqual({ zone: 'relegation', toPromotion: 16, aboveRelegation: 0 });
    expect(full(30).zone).toBe('relegation');
  });

  it('handles a partial league (fewer than 30 players)', () => {
    // 20 players: promo top 10, relegation bottom 5 → line at position 16.
    expect(getLeagueStandingSummary({ position: 18, totalPlayers: 20 }).zone).toBe('relegation');
    expect(getLeagueStandingSummary({ position: 12, totalPlayers: 20 }).zone).toBe('safe');
    expect(getLeagueStandingSummary({ position: 5, totalPlayers: 20 }).zone).toBe('promotion');
  });

  it('respects custom promotion/relegation counts', () => {
    const s = getLeagueStandingSummary({ position: 4, totalPlayers: 20, promotionCount: 3, relegationCount: 3 });
    expect(s.zone).toBe('safe');
    expect(s.toPromotion).toBe(1); // 4 - 3
  });

  it('never returns negative counts', () => {
    const s = full(1);
    expect(s.toPromotion).toBeGreaterThanOrEqual(0);
    expect(s.aboveRelegation).toBeGreaterThanOrEqual(0);
  });
});
