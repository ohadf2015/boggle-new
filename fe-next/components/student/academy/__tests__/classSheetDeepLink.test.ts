import { describe, it, expect } from 'vitest';
import { shouldOpenClassSheet } from '../classSheetDeepLink';

describe('shouldOpenClassSheet', () => {
  it('opens when the link says class=open and the student has a classroom', () => {
    expect(shouldOpenClassSheet(new URLSearchParams('class=open'), 'c1')).toBe(true);
  });

  it('refuses when the student has no classroom, even with class=open', () => {
    expect(shouldOpenClassSheet(new URLSearchParams('class=open'), null)).toBe(false);
    expect(shouldOpenClassSheet(new URLSearchParams('class=open'), '')).toBe(false);
  });

  it('refuses for any other or missing value', () => {
    expect(shouldOpenClassSheet(new URLSearchParams('class=closed'), 'c1')).toBe(false);
    expect(shouldOpenClassSheet(new URLSearchParams(''), 'c1')).toBe(false);
    expect(shouldOpenClassSheet(new URLSearchParams('class=open&x=1'), 'c1')).toBe(true);
  });

  it('handles a missing searchParams object', () => {
    expect(shouldOpenClassSheet(null, 'c1')).toBe(false);
    expect(shouldOpenClassSheet(undefined, 'c1')).toBe(false);
  });
});
