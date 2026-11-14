import { describe, it, expect } from 'vitest';
import { signupMilestone } from '../signupMilestone';

describe('signupMilestone', () => {
  it('counts toward the next 100 below a thousand', () => {
    expect(signupMilestone(870, 5)).toEqual({ prev: 800, next: 900, pct: 70, crossedThisWeek: false });
  });

  it('counts toward the next 500 from a thousand on', () => {
    expect(signupMilestone(1250, 0)).toMatchObject({ prev: 1000, next: 1500, pct: 50 });
  });

  it('celebrates a milestone passed within the week', () => {
    expect(signupMilestone(1000, 40)).toMatchObject({ prev: 1000, next: 1500, pct: 0, crossedThisWeek: true });
    expect(signupMilestone(1030, 20)).toMatchObject({ crossedThisWeek: false });
  });

  it('steps by 1,000 past ten thousand', () => {
    expect(signupMilestone(12_400, 0)).toMatchObject({ prev: 12_000, next: 13_000, pct: 40 });
  });
});
