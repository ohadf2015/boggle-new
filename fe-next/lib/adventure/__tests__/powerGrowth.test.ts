/**
 * Power Growth utility tests
 *
 * Tests mastery aura, combo ceiling, and power rating calculations.
 */

import { getMasteryAura, getComboCeiling, getPowerRating } from '../powerGrowth';

describe('getMasteryAura', () => {
  it('returns 0 for level 0', () => {
    expect(getMasteryAura(0)).toBe(0);
  });

  it('scales linearly up to level 50', () => {
    expect(getMasteryAura(10)).toBeCloseTo(0.2);
    expect(getMasteryAura(25)).toBeCloseTo(0.5);
    expect(getMasteryAura(50)).toBe(1);
  });

  it('caps at 1 for levels above 50', () => {
    expect(getMasteryAura(75)).toBe(1);
    expect(getMasteryAura(100)).toBe(1);
  });
});

describe('getComboCeiling', () => {
  it('returns 3 for levels 1-10', () => {
    expect(getComboCeiling(1)).toBe(3);
    expect(getComboCeiling(10)).toBe(3);
  });

  it('returns 5 for levels 11-20', () => {
    expect(getComboCeiling(11)).toBe(5);
    expect(getComboCeiling(20)).toBe(5);
  });

  it('returns 8 for levels 21-30', () => {
    expect(getComboCeiling(21)).toBe(8);
    expect(getComboCeiling(30)).toBe(8);
  });

  it('returns 10 for levels 31-40', () => {
    expect(getComboCeiling(31)).toBe(10);
    expect(getComboCeiling(40)).toBe(10);
  });

  it('returns 12 for levels above 40', () => {
    expect(getComboCeiling(41)).toBe(12);
    expect(getComboCeiling(50)).toBe(12);
    expect(getComboCeiling(99)).toBe(12);
  });
});

describe('getPowerRating', () => {
  it('returns 1.0 base for level 0 with no upgrades', () => {
    expect(getPowerRating(0, 0)).toBe(1);
  });

  it('scales with player level', () => {
    // level 10, 0 upgrades: 1 + (100/1000) = 1.1
    expect(getPowerRating(10, 0)).toBeCloseTo(1.1);
  });

  it('scales with upgrade count', () => {
    // level 0, 10 upgrades: 1 + (50/1000) = 1.05
    expect(getPowerRating(0, 10)).toBeCloseTo(1.05);
  });

  it('combines level and upgrades', () => {
    // level 20, 10 upgrades: 1 + (200 + 50)/1000 = 1.25
    expect(getPowerRating(20, 10)).toBeCloseTo(1.25);
  });

  it('caps at 1.8', () => {
    expect(getPowerRating(100, 100)).toBe(1.8);
    expect(getPowerRating(50, 50)).toBe(1.75);
  });
});
