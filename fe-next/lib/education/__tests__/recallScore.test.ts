import { describe, expect, it } from 'vitest';
import { comboMultiplier, emptyTally, recallPoints, recallStars, speedBonus, tallyAnswer } from '../recallScore';

describe('recall scoring', () => {
  it('given a growing streak, then the multiplier climbs to x3 and stops there', () => {
    expect([0, 1, 2, 3, 4, 9].map(comboMultiplier)).toEqual([1, 1, 2, 3, 3, 3]);
  });

  it('given a fast answer, then the bonus is added on top and fades to zero, never below', () => {
    expect(speedBonus('pick', 0)).toBe(50);
    expect(speedBonus('pick', 3000)).toBe(30);
    expect(speedBonus('pick', 6000)).toBe(0);
    expect(speedBonus('pick', 60_000)).toBe(0);
    expect(speedBonus('spell', 6000)).toBe(30);
    expect(speedBonus('pick', undefined)).toBe(0);
  });

  it('given a streak and a quick answer, then points are base plus bonus, times the multiplier', () => {
    expect(recallPoints({ streak: 1, kind: 'pick', elapsedMs: 60_000 })).toBe(100);
    expect(recallPoints({ streak: 2, kind: 'pick', elapsedMs: 0 })).toBe(300);
    expect(recallPoints({ streak: 5, kind: 'spell', elapsedMs: 12_000 })).toBe(300);
  });

  it('given answers, when tallied, then score, best combo and misses add up and a miss scores nothing', () => {
    let tally = emptyTally();
    tally = tallyAnswer(tally, { correct: true, streak: 1, kind: 'pick', elapsedMs: 60_000 });
    tally = tallyAnswer(tally, { correct: true, streak: 2, kind: 'pick', elapsedMs: 60_000 });
    expect(tally).toMatchObject({ score: 300, lastPoints: 200, bestCombo: 2, correct: 2, wrong: 0 });
    tally = tallyAnswer(tally, { correct: false, streak: 0, kind: 'pick', elapsedMs: 0 });
    expect(tally).toMatchObject({ score: 300, lastPoints: 0, bestCombo: 2, correct: 2, wrong: 1 });
  });

  it('given accuracy, then stars run 1 to 3 and nobody gets zero', () => {
    expect(recallStars(8, 0)).toBe(3);
    expect(recallStars(8, 1)).toBe(2);
    expect(recallStars(8, 4)).toBe(2);
    expect(recallStars(8, 8)).toBe(1);
    expect(recallStars(0, 0)).toBe(1);
  });
});
