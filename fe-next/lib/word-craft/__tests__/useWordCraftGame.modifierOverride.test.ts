import { describe, expect, it } from 'vitest';
import { buildInitialState } from '../useWordCraftGame';

describe('modifierOverride', () => {
  it('forces the given modifier instead of rolling', () => {
    const s = buildInitialState({ seed: 42, locale: 'en', modifierOverride: 'land_grab' });
    expect(s.modifier).toBe('land_grab');
  });

  it('falls back to the seeded roll when omitted', () => {
    const a = buildInitialState({ seed: 42, locale: 'en' });
    const b = buildInitialState({ seed: 42, locale: 'en' });
    expect(a.modifier).toBe(b.modifier);
  });

  it('ignores invalid override values', () => {
    // @ts-expect-error deliberately invalid runtime value
    const s = buildInitialState({ seed: 42, locale: 'en', modifierOverride: 'bogus' });
    const rolled = buildInitialState({ seed: 42, locale: 'en' });
    expect(s.modifier).toBe(rolled.modifier);
  });
});
