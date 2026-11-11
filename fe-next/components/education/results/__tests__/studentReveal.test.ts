import { describe, expect, it } from 'vitest';
import { STUDENT_REVEAL_FINAL, beatReached, revealBeatAt, studentVerdict, verdictLook } from '../studentReveal';

describe('studentVerdict', () => {
  it('given a rival duel, when I scored more, then I won even far down the class', () => {
    expect(studentVerdict({ rank: 14, total: 26, score: 20, rivalDiff: 4 })).toBe('won');
  });

  it('given a rival duel, when we scored the same, then it is a tie', () => {
    expect(studentVerdict({ rank: 1, total: 26, score: 50, rivalDiff: 0 })).toBe('tied');
  });

  it('given a rival duel, when my rival scored more, then I lost even on the podium', () => {
    expect(studentVerdict({ rank: 2, total: 26, score: 50, rivalDiff: -3 })).toBe('lost');
  });

  it('given no rival, when I came first alone, then I won', () => {
    expect(studentVerdict({ rank: 1, total: 26, score: 50, gapKind: 'ahead' })).toBe('won');
  });

  it('given no rival, when I share first place, then it is a tie', () => {
    expect(studentVerdict({ rank: 1, total: 26, score: 50, gapKind: 'tied' })).toBe('tied');
  });

  it('given no rival, when I made the podium of a real class, then I won', () => {
    expect(studentVerdict({ rank: 3, total: 12, score: 30, gapKind: 'behind' })).toBe('won');
  });

  it('given no rival, when I finished below the podium, then it is a loss', () => {
    expect(studentVerdict({ rank: 4, total: 12, score: 30, gapKind: 'behind' })).toBe('lost');
  });

  it('given a room of three, when I came last, then the podium does not count as a win', () => {
    expect(studentVerdict({ rank: 3, total: 3, score: 5, gapKind: 'behind' })).toBe('lost');
  });

  it('given zero points, when results show, then it is never a win', () => {
    expect(studentVerdict({ rank: 1, total: 1, score: 0 })).toBe('lost');
  });

  it('given I played alone and scored, then I won', () => {
    expect(studentVerdict({ rank: 1, total: 1, score: 9 })).toBe('won');
  });
});

describe('verdictLook', () => {
  it('gives win, tie and loss each their own colour and mascot', () => {
    const looks = (['won', 'tied', 'lost'] as const).map(verdictLook);
    expect(new Set(looks.map((l) => l.surface)).size).toBe(3);
    expect(new Set(looks.map((l) => l.mascot)).size).toBe(3);
    expect(verdictLook('won').surface).toBe('bg-neo-lime');
    expect(verdictLook('lost').surface).toBe('bg-neo-cyan');
  });
});

describe('student reveal timeline', () => {
  it('opens on the rank, then the verdict, then the chest, then settles', () => {
    expect(revealBeatAt(0)).toBe('rank');
    expect(revealBeatAt(999)).toBe('rank');
    expect(revealBeatAt(1000)).toBe('verdict');
    expect(revealBeatAt(1800)).toBe('chest');
    expect(revealBeatAt(60_000)).toBe(STUDENT_REVEAL_FINAL);
  });

  it('counts a later beat as having reached every earlier one', () => {
    expect(beatReached('chest', 'verdict')).toBe(true);
    expect(beatReached('rank', 'verdict')).toBe(false);
    expect(beatReached(STUDENT_REVEAL_FINAL, 'chest')).toBe(true);
  });
});
