import { describe, it, expect } from 'vitest';
import { englishComparisonRedirect } from '../enOnlyRedirect';

describe('englishComparisonRedirect', () => {
  it('returns null for en (no redirect)', () => {
    expect(englishComparisonRedirect('en', 'lexiclash-vs-wordle')).toBeNull();
    expect(englishComparisonRedirect('en', 'lexiclash-vs-freerice')).toBeNull();
  });

  it('returns /en/<slug> for non-en locales (he, sv, ja, es, ru)', () => {
    expect(englishComparisonRedirect('he', 'lexiclash-vs-wordle')).toBe('/en/lexiclash-vs-wordle');
    expect(englishComparisonRedirect('sv', 'lexiclash-vs-freerice')).toBe('/en/lexiclash-vs-freerice');
    expect(englishComparisonRedirect('ja', 'lexiclash-vs-wordle')).toBe('/en/lexiclash-vs-wordle');
    expect(englishComparisonRedirect('es', 'lexiclash-vs-freerice')).toBe('/en/lexiclash-vs-freerice');
    expect(englishComparisonRedirect('ru', 'lexiclash-vs-wordle')).toBe('/en/lexiclash-vs-wordle');
  });

  it('falls back to en slug for unknown locale', () => {
    expect(englishComparisonRedirect('fr', 'lexiclash-vs-wordle')).toBe('/en/lexiclash-vs-wordle');
  });
});
