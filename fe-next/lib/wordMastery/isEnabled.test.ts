import { afterEach, describe, expect, it } from 'vitest';
import { isWordMasteryEnvEnabled, resolveWordMasteryAccess } from './isEnabled';

describe('isWordMasteryEnvEnabled', () => {
  const original = process.env.NEXT_PUBLIC_WORD_MASTERY;

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_WORD_MASTERY;
    else process.env.NEXT_PUBLIC_WORD_MASTERY = original;
  });

  it('shouldReturnTrueWhenEnvIsOne', () => {
    // GIVEN
    process.env.NEXT_PUBLIC_WORD_MASTERY = '1';

    // WHEN / THEN
    expect(isWordMasteryEnvEnabled()).toBe(true);
  });

  it('shouldReturnFalseWhenEnvUnset', () => {
    // GIVEN
    delete process.env.NEXT_PUBLIC_WORD_MASTERY;

    // WHEN / THEN
    expect(isWordMasteryEnvEnabled()).toBe(false);
  });
});

describe('resolveWordMasteryAccess', () => {
  it('shouldAllowWhenEnvGateIsOnEvenIfFlagsOff', () => {
    // GIVEN
    const access = resolveWordMasteryAccess({
      envEnabled: true,
      dbFlagEnabled: false,
      experimentVariant: 'control',
    });

    // THEN
    expect(access).toBe(true);
  });

  it('shouldAllowWhenExperimentIsEnabled', () => {
    // GIVEN
    const access = resolveWordMasteryAccess({
      envEnabled: false,
      dbFlagEnabled: false,
      experimentVariant: 'enabled',
    });

    // THEN
    expect(access).toBe(true);
  });

  it('shouldAllowWhenDbFeatureFlagIsOn', () => {
    // GIVEN
    const access = resolveWordMasteryAccess({
      envEnabled: false,
      dbFlagEnabled: true,
      experimentVariant: 'control',
    });

    // THEN
    expect(access).toBe(true);
  });

  it('shouldDenyWhenAllGatesAreOff', () => {
    // GIVEN
    const access = resolveWordMasteryAccess({
      envEnabled: false,
      dbFlagEnabled: false,
      experimentVariant: 'control',
    });

    // THEN
    expect(access).toBe(false);
  });
});
