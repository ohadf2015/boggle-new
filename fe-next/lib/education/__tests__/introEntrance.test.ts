import { describe, it, expect } from 'vitest';
import { claimIntroEntrance } from '../introEntrance';

describe('claimIntroEntrance', () => {
  it('GIVEN the first mount of an intro THEN it plays its entrance', () => {
    expect(claimIntroEntrance('vault-a', 1000)).toBe(true);
  });

  it('GIVEN the loader-intro just played WHEN the loaded intro remounts moments later THEN it does not replay (no half-animated frame)', () => {
    claimIntroEntrance('vault-b', 1000);
    expect(claimIntroEntrance('vault-b', 3500)).toBe(false);
  });

  it('GIVEN a later visit THEN the entrance plays again', () => {
    claimIntroEntrance('vault-c', 1000);
    expect(claimIntroEntrance('vault-c', 60_000)).toBe(true);
  });

  it('GIVEN two different intros THEN they do not suppress each other', () => {
    claimIntroEntrance('workshop-d', 1000);
    expect(claimIntroEntrance('vault-d', 1100)).toBe(true);
  });

  it('GIVEN the same mount claims twice (StrictMode) THEN the answer does not flip', () => {
    expect(claimIntroEntrance('vault-e', 1000, ':r1:')).toBe(true);
    expect(claimIntroEntrance('vault-e', 1001, ':r1:')).toBe(true);
    expect(claimIntroEntrance('vault-e', 1500, ':r2:')).toBe(false);
  });
});
