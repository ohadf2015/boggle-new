import { describe, it, expect } from 'vitest';
import { nextTarget, latestPassed } from '../rivalTarget';

const rivals = [{ name: 'Ann', score: 300 }, { name: 'Bo', score: 120 }, { name: 'Cy', score: 800 }];

describe('nextTarget', () => {
  it('picks the lowest rival score still above the run score', () => {
    expect(nextTarget(100, null, rivals)).toEqual({ kind: 'rival', name: 'Bo', score: 120, gap: 20 });
  });

  it('treats the personal best as a target when it is the nearest', () => {
    expect(nextTarget(130, 200, rivals)).toEqual({ kind: 'best', score: 200, gap: 70 });
  });

  it('reports the top once every known score is beaten', () => {
    expect(nextTarget(900, 500, rivals)).toEqual({ kind: 'top' });
  });

  it('returns null when there is nothing to chase', () => {
    expect(nextTarget(50, null, [])).toBeNull();
    expect(nextTarget(50, 0, [])).toBeNull();
  });

  it('ties go to the rival so a name is shown', () => {
    expect(nextTarget(100, 120, rivals)).toMatchObject({ kind: 'rival', name: 'Bo' });
  });
});

describe('latestPassed', () => {
  it('returns the highest target crossed by this score jump', () => {
    expect(latestPassed(100, 350, 200, rivals)).toEqual({ kind: 'rival', name: 'Ann', score: 300 });
  });

  it('returns the personal best when that is what was crossed', () => {
    expect(latestPassed(150, 210, 200, rivals)).toEqual({ kind: 'best', score: 200 });
  });

  it('returns null when nothing was crossed or the score did not rise', () => {
    expect(latestPassed(130, 140, 200, rivals)).toBeNull();
    expect(latestPassed(350, 350, 200, rivals)).toBeNull();
  });
});
