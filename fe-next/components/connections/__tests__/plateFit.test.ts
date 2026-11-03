import { describe, it, expect } from 'vitest';
import { plateFitEms } from '../plateFit';

describe('plateFitEms — plate font is sized so the longest word fits on one line', () => {
  it('grows with the longest word, so a long word gets a smaller font', () => {
    expect(plateFitEms('FIREPLACE')).toBeGreaterThan(plateFitEms('FIRE'));
  });

  it('sizes a phrase by its longest word, since phrases may wrap between words', () => {
    expect(plateFitEms('ICE CREAM')).toBe(plateFitEms('CREAM'));
  });

  it('treats hyphenated words as one unbreakable token', () => {
    expect(plateFitEms('WELL-KNOWN')).toBe(plateFitEms('WELLXKNOWN'));
  });

  it('never returns less than a short-word floor, so 2-letter plates do not balloon', () => {
    expect(plateFitEms('GO')).toBe(plateFitEms('GOLD'));
  });

  it('counts letters, not UTF-16 units', () => {
    expect(plateFitEms('ПРИВЕТ')).toBe(plateFitEms('ABCDEF'));
  });
});
