import { describe, it, expect } from 'vitest';
import { pluralKey } from '../pluralKey';

const FORMS = { one: 'k.one', few: 'k.few', other: 'k.other' };

describe('pluralKey', () => {
  it('Given Russian, When the count is 1, 2, 5, 21, Then one / few / other(many) / one forms are picked', () => {
    expect([1, 2, 5, 21].map((n) => pluralKey(FORMS, n, 'ru'))).toEqual(['k.one', 'k.few', 'k.other', 'k.one']);
  });

  it('Given English, When the count is 1 or 2, Then one and other are picked and few is never used', () => {
    expect([1, 2, 3].map((n) => pluralKey(FORMS, n, 'en'))).toEqual(['k.one', 'k.other', 'k.other']);
  });

  it('Given Japanese, When the count is 1, Then the other form is used (no singular in ja)', () => {
    expect(pluralKey(FORMS, 1, 'ja')).toBe('k.other');
  });

  it('Given Hebrew and no two form, When the count is 2, Then it falls back to other', () => {
    expect(pluralKey(FORMS, 2, 'he')).toBe('k.other');
  });

  it('Given an unknown locale tag, When picking, Then it does not throw', () => {
    expect(pluralKey(FORMS, 1, 'xx-invalid-!!')).toBe('k.one');
  });
});
