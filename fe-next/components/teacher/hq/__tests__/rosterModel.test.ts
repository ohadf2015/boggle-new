import { describe, it, expect } from 'vitest';
import { normalizeRoster, newArrivals, seatPlan } from '../rosterModel';

describe('normalizeRoster', () => {
  it('Given supabase rows with array or object profiles, Then it yields id + display name + avatar', () => {
    const rows = [
      { id: 'm1', student_id: 's1', profiles: [{ display_name: 'Ava', username: 'Player_1234abcd', avatar_config: { a: 1 } }] },
      { id: 'm2', student_id: 's2', profiles: { display_name: '', username: 'noam' } },
      { id: 'm3', student_id: 's3', profiles: null },
    ];
    const out = normalizeRoster(rows as never, 'Student');
    expect(out).toEqual([
      { id: 's1', name: 'Ava', avatar: { a: 1 } },
      { id: 's2', name: 'noam', avatar: null },
      { id: 's3', name: 'Student', avatar: null },
    ]);
  });
});

describe('newArrivals', () => {
  it('Given the first settled read, Then nobody is "new" — a page load must not ding', () => {
    expect(newArrivals(null, ['a', 'b'])).toEqual([]);
  });

  it('Given a later read with extra students, Then only those light up', () => {
    expect(newArrivals(['a'], ['a', 'b', 'c'])).toEqual(['b', 'c']);
  });

  it('Given a student leaving, Then nobody is new', () => {
    expect(newArrivals(['a', 'b'], ['a'])).toEqual([]);
  });
});

describe('seatPlan', () => {
  it('Given an empty class, Then it shows ghost seats to fill and no overflow', () => {
    expect(seatPlan(0, 6)).toEqual({ shown: 0, ghosts: 6, overflow: 0 });
  });

  it('Given a few students, Then remaining seats are ghosts', () => {
    expect(seatPlan(2, 6)).toEqual({ shown: 2, ghosts: 4, overflow: 0 });
  });

  it('Given more students than seats, Then the last seat becomes a +N chip', () => {
    expect(seatPlan(20, 6)).toEqual({ shown: 5, ghosts: 0, overflow: 15 });
  });
});
