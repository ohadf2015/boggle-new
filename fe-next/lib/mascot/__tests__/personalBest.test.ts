import { describe, it, expect } from 'vitest';
import { nextPersonalBestState, createPersonalBestState } from '../personalBest';

const step = (scores: number[], best: number | null) => {
  let s = createPersonalBestState();
  const fired: number[] = [];
  for (const score of scores) {
    const r = nextPersonalBestState(s, score, best);
    if (r.fire) fired.push(score);
    s = r.state;
  }
  return fired;
};

describe('personal-best trigger', () => {
  it('fires the moment the live score passes the old best', () => {
    expect(step([10, 40, 55, 60], 50)).toEqual([55]);
  });

  it('matching the best is not beating it', () => {
    expect(step([20, 50], 50)).toEqual([]);
  });

  it('fires once per round even as the score keeps climbing', () => {
    expect(step([55, 70, 90], 50)).toEqual([55]);
  });

  it('a new round (score back to 0) can fire again', () => {
    expect(step([55, 0, 30, 60], 50)).toEqual([55, 60]);
  });

  it('a first-ever game has no record to beat', () => {
    expect(step([10, 500], null)).toEqual([]);
    expect(step([10, 500], 0)).toEqual([]);
  });
});
