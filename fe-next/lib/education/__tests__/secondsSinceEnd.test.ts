import { describe, expect, it } from 'vitest';
import { secondsSinceEnd } from '../secondsSinceEnd';

describe('secondsSinceEnd', () => {
  const now = new Date('2026-11-03T17:18:00.000Z');

  it('Given the teacher ended 90 seconds ago, Then the refusal can say how late the student was', () => {
    expect(secondsSinceEnd('2026-11-03T17:16:30.000Z', now)).toBe(90);
  });

  it('Given no end stamp, Then the field is unknown rather than zero', () => {
    expect(secondsSinceEnd(undefined, now)).toBeNull();
    expect(secondsSinceEnd('not-a-date', now)).toBeNull();
  });

  it('Given a clock skew that puts the end in the future, Then it does not report a negative delay', () => {
    expect(secondsSinceEnd('2026-11-03T17:19:00.000Z', now)).toBe(0);
  });
});
