import { describe, expect, it } from 'vitest';
import { draftDue } from '../draftTrigger';

describe('draftDue', () => {
  it('fires when the peak crosses a multiple of 5', () => {
    expect(draftDue(4, 5)).toBe(5);
    expect(draftDue(9, 11)).toBe(10);
  });

  it('does not fire between multiples or when already on one', () => {
    expect(draftDue(5, 6)).toBeNull();
    expect(draftDue(1, 4)).toBeNull();
    expect(draftDue(5, 5)).toBeNull();
  });

  it('does not fire when the peak does not rise', () => {
    expect(draftDue(12, 8)).toBeNull();
  });

  it('never fires for floor 0', () => {
    expect(draftDue(0, 0)).toBeNull();
    expect(draftDue(-3, 0)).toBeNull();
  });

  it('returns the largest crossed multiple on a jump of more than 5 floors', () => {
    expect(draftDue(3, 14)).toBe(10);
    expect(draftDue(4, 25)).toBe(25);
  });
});
