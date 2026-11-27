import { describe, it, expect } from 'vitest';
import { ARCADE_GAMES, gamesFor, isArcadeGame } from '../games';
import { familyBound, FAMILY_RULES } from '../family';

describe('holiday arcade games', () => {
  it('Given each holiday, then it offers exactly three family party games and no word games', () => {
    expect(gamesFor('hanukkah')).toEqual(['latke', 'spin', 'catch']);
    expect(gamesFor('christmas')).toEqual(['presents', 'splat', 'dash']);
    for (const old of ['oil', 'dreidel', 'sufganiyah', 'sleigh', 'snowball', 'wrap']) expect(isArcadeGame(old)).toBe(false);
  });

  it('Given every game, then it has its own painted cover and a run of 45 to 90 seconds', () => {
    const covers = Object.values(ARCADE_GAMES).map((g) => g.cover);
    for (const g of Object.values(ARCADE_GAMES)) {
      expect(g.bg).toMatch(/^\/holidays\/arcade\/bg-[a-z]+\.webp$/);
      expect(g.seconds).toBeGreaterThanOrEqual(45);
      expect(g.seconds).toBeLessThanOrEqual(90);
    }
    for (const h of ['hanukkah', 'christmas'] as const) {
      const mine = gamesFor(h).map((id) => ARCADE_GAMES[id].cover);
      expect(new Set(mine).size).toBe(mine.length);
    }
    expect(covers.length).toBe(6);
  });

  it('Given every game, then the server has a score rule for it', () => {
    expect(Object.keys(FAMILY_RULES).sort()).toEqual(Object.keys(ARCADE_GAMES).sort());
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
