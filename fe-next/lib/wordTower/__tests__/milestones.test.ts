import { describe, it, expect } from 'vitest';
import { milestoneCrossed, type Milestone } from '../milestones';

const ms: Milestone[] = [
  { m: 50, key: 'a' },
  { m: 150, key: 'b' },
  { m: 400, key: 'c' },
];

describe('milestoneCrossed', () => {
  it('fires the milestone crossed while climbing (exclusive lower, inclusive upper)', () => {
    expect(milestoneCrossed(40, 60, ms)?.key).toBe('a');
    expect(milestoneCrossed(50, 150, ms)?.key).toBe('b'); // 50 already passed, 150 inclusive
  });

  it('returns the HIGHEST milestone on a big single jump (no queueing)', () => {
    expect(milestoneCrossed(10, 500, ms)?.key).toBe('c');
  });

  it('returns null when none crossed or not climbing', () => {
    expect(milestoneCrossed(60, 140, ms)).toBeNull();
    expect(milestoneCrossed(200, 100, ms)).toBeNull();
    expect(milestoneCrossed(400, 400, ms)).toBeNull();
  });
});
