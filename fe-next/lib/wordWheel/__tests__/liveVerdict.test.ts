import { describe, it, expect } from 'vitest';
import { liveVerdict } from '../liveVerdict';

const known = new Set(['GNAT', 'ANT']);
const quick = (w: string) => known.has(w);

describe('liveVerdict', () => {
  it('Given fewer than three letters, Then there is nothing to say yet', () => {
    expect(liveVerdict('AN', 'N', [], quick)).toBeNull();
  });

  it('Given a known word with the center letter, Then it is a word', () => {
    expect(liveVerdict('GNAT', 'N', [], quick)).toBe('word');
  });

  it('Given a word missing the center letter, Then it is not a word', () => {
    expect(liveVerdict('GTWI', 'N', [], () => true)).toBe('no');
  });

  it('Given a word already found, Then it is found', () => {
    expect(liveVerdict('ANT', 'N', ['ANT'], quick)).toBe('found');
  });

  it('Given an unknown word, Then it is not a word', () => {
    expect(liveVerdict('NGT', 'N', [], quick)).toBe('no');
  });

  it('Given a cold dictionary, Then the verdict stays open', () => {
    expect(liveVerdict('GNAT', 'N', [], () => null)).toBeNull();
    expect(liveVerdict('GNAT', 'N', [])).toBeNull();
  });

  it('Given mixed case, Then the center check ignores it', () => {
    expect(liveVerdict('gnat', 'n', [], (w) => known.has(w.toUpperCase()))).toBe('word');
  });
});
