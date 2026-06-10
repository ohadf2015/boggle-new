import { describe, it, expect } from 'vitest';
import { perkModifiers, combineModifiers, NO_MODIFIERS } from '../perks';
import { mutatorModifiers, MUTATORS } from '../dailyMutators';

describe('combineModifiers — fold a mutator into the perk struct', () => {
  it('MULTIPLIES heightMult (does not overwrite) so skyline stacks on tallTimber', () => {
    const perks = perkModifiers(['tallTimber']); // heightMult 1.12
    const merged = combineModifiers(perks, mutatorModifiers(MUTATORS.skylineRush)); // ×1.15
    expect(merged.heightMult).toBeCloseTo(1.12 * 1.15, 5);
  });

  it('ADDS toppleReduction (featherday + featherfall both count)', () => {
    const perks = perkModifiers(['featherfall']); // toppleReduction 1
    const merged = combineModifiers(perks, mutatorModifiers(MUTATORS.featherday)); // +1
    expect(merged.toppleReduction).toBe(2);
  });

  it('an empty mutator override leaves the perks untouched', () => {
    const perks = perkModifiers(['masterCrane']);
    expect(combineModifiers(perks, {})).toEqual(perks);
  });

  it('preserves boolean + brink fields and never drops a key', () => {
    const merged = combineModifiers({ ...NO_MODIFIERS, wobbleImmune: true, brinkExtra: 1 }, { heightMult: 1.15 });
    expect(merged.wobbleImmune).toBe(true);
    expect(merged.brinkExtra).toBe(1);
    expect(merged.heightMult).toBeCloseTo(1.15, 5);
  });
});
