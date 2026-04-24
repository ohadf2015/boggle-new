import { describe, it, expect } from 'vitest';
import { buildTriplesFromCompounds } from '../tripleBuilder';

describe('buildTriplesFromCompounds', () => {
  it('builds triple when bridge appears as 2nd word and as 1st word', () => {
    const compounds = ['בית ספר', 'ספר תורה'];
    const triples = buildTriplesFromCompounds(compounds);
    expect(triples).toEqual([
      { word1: 'בית', bridge: 'ספר', word2: 'תורה' },
    ]);
  });

  it('produces multiple triples when a bridge connects multiple pairs', () => {
    const compounds = ['בית ספר', 'ספר תורה', 'ספר קודש'];
    const triples = buildTriplesFromCompounds(compounds);
    expect(triples).toHaveLength(2);
    expect(triples).toContainEqual({ word1: 'בית', bridge: 'ספר', word2: 'תורה' });
    expect(triples).toContainEqual({ word1: 'בית', bridge: 'ספר', word2: 'קודש' });
  });

  it('returns empty when no bridge exists in both positions', () => {
    const compounds = ['בית ספר', 'ספר תורה', 'חוף ים'];
    const triples = buildTriplesFromCompounds(['בית ספר', 'חוף ים']);
    expect(triples).toEqual([]);
  });

  it('ignores compounds that are not exactly 2 tokens', () => {
    const compounds = ['בית', 'א ב ג', 'בית ספר', 'ספר תורה'];
    const triples = buildTriplesFromCompounds(compounds);
    expect(triples).toEqual([
      { word1: 'בית', bridge: 'ספר', word2: 'תורה' },
    ]);
  });

  it('skips degenerate triples where any two of three words are equal', () => {
    const compounds = ['ספר ספר', 'ספר תורה'];
    const triples = buildTriplesFromCompounds(compounds);
    expect(triples).toEqual([]);
  });

  it('dedups duplicate compounds before building', () => {
    const compounds = ['בית ספר', 'בית ספר', 'ספר תורה'];
    const triples = buildTriplesFromCompounds(compounds);
    expect(triples).toHaveLength(1);
  });
});
