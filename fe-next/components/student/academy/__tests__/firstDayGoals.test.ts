import { describe, it, expect } from 'vitest';
import { buildFirstDayGoals, isFirstDayDone } from '../firstDayGoals';

const fresh = { hasClass: false, stars: 0, streak: 0 };

describe('buildFirstDayGoals', () => {
  it('given a brand-new student with no class, then three goals start at zero and joining comes first', () => {
    const goals = buildFirstDayGoals(fresh);
    expect(goals.map((g) => g.id)).toEqual(['join', 'stars', 'flame']);
    expect(goals.map((g) => [g.have, g.need])).toEqual([
      [0, 1],
      [0, 3],
      [0, 1],
    ]);
    expect(goals.some((g) => g.done)).toBe(false);
  });

  it('given more stars than the goal, then progress is capped at the target', () => {
    const stars = buildFirstDayGoals({ ...fresh, stars: 9 }).find((g) => g.id === 'stars');
    expect(stars).toMatchObject({ have: 3, need: 3, done: true });
  });

  it('given a class and a live streak, then those two goals are done', () => {
    const goals = buildFirstDayGoals({ hasClass: true, stars: 1, streak: 2 });
    expect(goals.find((g) => g.id === 'join')?.done).toBe(true);
    expect(goals.find((g) => g.id === 'flame')?.done).toBe(true);
    expect(goals.find((g) => g.id === 'stars')).toMatchObject({ have: 1, done: false });
  });

  it('given every goal met, then the first-day card is finished', () => {
    expect(isFirstDayDone(buildFirstDayGoals({ hasClass: true, stars: 3, streak: 1 }))).toBe(true);
    expect(isFirstDayDone(buildFirstDayGoals(fresh))).toBe(false);
  });
});
