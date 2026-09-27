import { describe, it, expect } from 'vitest';
import { computeStrikeBudget, STRIKE_UNLOCK_LEVEL } from '../strike-budget';

describe('computeStrikeBudget', () => {
  it('returns null (unlimited) for tutorial levels before the unlock level', () => {
    // Given a chill onboarding range, When below the unlock level,
    // Then there is no strike budget — a new player can never "lose".
    expect(computeStrikeBudget(1)).toBeNull();
    expect(computeStrikeBudget(STRIKE_UNLOCK_LEVEL - 1)).toBeNull();
  });

  it('grants a generous budget of 6 strikes at the unlock level', () => {
    expect(computeStrikeBudget(STRIKE_UNLOCK_LEVEL)).toBe(6);
  });

  it('keeps 6 strikes through the early band (L6–L25)', () => {
    expect(computeStrikeBudget(6)).toBe(6);
    expect(computeStrikeBudget(25)).toBe(6);
  });

  it('tightens by one strike every 20 levels past the unlock', () => {
    expect(computeStrikeBudget(26)).toBe(5); // first level of the next 20-band
    expect(computeStrikeBudget(46)).toBe(4);
    expect(computeStrikeBudget(66)).toBe(3);
  });

  it('never drops below a floor of 3 strikes no matter how deep', () => {
    expect(computeStrikeBudget(200)).toBe(3);
    expect(computeStrikeBudget(9999)).toBe(3);
  });
});
