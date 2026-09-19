import { describe, expect, it } from 'vitest';
import { blockLabel, labelTracking } from '../label';

describe('labelTracking', () => {
  it('given a Latin word, when tracked, then it gets the brand letter-spacing', () => {
    expect(labelTracking('TOWER')).toBeGreaterThan(0);
  });

  it('given a Hebrew word, when tracked, then zero — any spacing makes Pixi draw it letter by letter, left to right, reversed', () => {
    expect(labelTracking('מגדל')).toBe(0);
  });

  it('given an Arabic word, when tracked, then zero for the same reason', () => {
    expect(labelTracking('برج')).toBe(0);
  });
});

describe('blockLabel', () => {
  it('given a Hebrew word from the dictionary (regular letters only), when labelled, then the last letter takes its final form', () => {
    // The dictionary and wheel carry no sofit letters; a slab read "השתבצ".
    expect(blockLabel('השתבצ')).toBe('השתבץ');
    expect(blockLabel('אאוימ')).toBe('אאוים');
  });

  it('given a mid-word regular letter, when labelled, then only the end changes', () => {
    expect(blockLabel('מגדל')).toBe('מגדל');
  });

  it('given a Latin word, when labelled, then uppercased', () => {
    expect(blockLabel('tower')).toBe('TOWER');
  });
});
