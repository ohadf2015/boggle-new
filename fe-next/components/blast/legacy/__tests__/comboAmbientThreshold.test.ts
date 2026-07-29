import { describe, it, expect } from 'vitest';
import { shouldFireComboAmbient, getComboAmbientTier } from '../comboAmbientThreshold';

describe('shouldFireComboAmbient', () => {
  it('returns false below threshold', () => {
    expect(shouldFireComboAmbient(0)).toBe(false);
    expect(shouldFireComboAmbient(3)).toBe(false);
  });

  it('returns true at the threshold (>= 4)', () => {
    expect(shouldFireComboAmbient(4)).toBe(true);
    expect(shouldFireComboAmbient(7)).toBe(true);
    expect(shouldFireComboAmbient(10)).toBe(true);
  });
});

describe('getComboAmbientTier', () => {
  it('returns null below threshold', () => {
    expect(getComboAmbientTier(3)).toBeNull();
  });

  it('returns 1 for warm streak (4-6)', () => {
    expect(getComboAmbientTier(4)).toBe(1);
    expect(getComboAmbientTier(6)).toBe(1);
  });

  it('returns 2 for hot streak (7-9)', () => {
    expect(getComboAmbientTier(7)).toBe(2);
    expect(getComboAmbientTier(9)).toBe(2);
  });

  it('returns 3 for max streak (10)', () => {
    expect(getComboAmbientTier(10)).toBe(3);
  });
});
