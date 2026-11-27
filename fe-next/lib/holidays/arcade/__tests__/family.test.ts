import { describe, it, expect } from 'vitest';
import { ARCADE_GAMES, gamesFor, isFamilyGame } from '../games';
import { familyBound, FAMILY_RULES } from '../family';

describe('family arcade games', () => {
  it('Given each holiday, then its family games come before its word games', () => {
    expect(gamesFor('hanukkah')).toEqual(['latke', 'spin', 'oil', 'dreidel', 'sufganiyah']);
    expect(gamesFor('christmas')).toEqual(['presents', 'splat', 'sleigh', 'snowball', 'wrap']);
  });

  it('Given every arcade game, then it has a painted background and only family games are flagged', () => {
    for (const g of Object.values(ARCADE_GAMES)) expect(g.bg).toMatch(/^\/holidays\/arcade\/bg-[a-z]+\.webp$/);
    expect(Object.values(ARCADE_GAMES).filter((g) => g.family).map((g) => g.id).sort()).toEqual(['latke', 'presents', 'spin', 'splat']);
    expect(isFamilyGame('latke')).toBe(true);
    expect(isFamilyGame('oil')).toBe(false);
  });

  it('Given a claimed score, then the server keeps the lowest of claim, game cap and points-per-second', () => {
    const { cap, perSecond } = FAMILY_RULES.latke;
    expect(familyBound('latke', 300, 60)).toBe(300);
    expect(familyBound('latke', 999_999, 10)).toBe(10 * perSecond);
    expect(familyBound('latke', 999_999, 10_000)).toBe(cap);
    expect(familyBound('latke', -5, 60)).toBe(0);
    expect(familyBound('latke', Number.NaN, 60)).toBe(0);
  });
});
