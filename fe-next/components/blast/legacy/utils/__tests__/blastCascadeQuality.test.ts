import { describe, it, expect } from 'vitest';
import { selectCascadeFinds } from '../blastCascadeQuality';

const cells = (n: number) => Array.from({ length: n }, (_, i) => ({ row: 0, col: i }));
// Cluster labels look like "[A×4]"; word labels are plain words.
const cluster = (size: number) => ({ cells: cells(size), label: `[A×${size}]` });
const word = (w: string) => ({ cells: cells(w.length), label: w });

describe('selectCascadeFinds', () => {
  it('returns at most ONE find per chain level', () => {
    const picked = selectCascadeFinds([cluster(3), word('GAME'), word('TILES')], 1);
    expect(picked).toHaveLength(1);
  });

  it('prefers the largest cluster over words', () => {
    const c = cluster(4);
    expect(selectCascadeFinds([word('TILES'), c, cluster(3)], 1)[0]).toBe(c);
  });

  it('falls back to the longest word when no cluster', () => {
    const long = word('TILES');
    expect(selectCascadeFinds([word('GAME'), long], 1)[0]).toBe(long);
  });

  it('chain level >= 3 requires quality: cluster >= 4 or word >= 5 letters', () => {
    expect(selectCascadeFinds([cluster(3), word('GAME')], 3)).toHaveLength(0);
    expect(selectCascadeFinds([cluster(4)], 3)).toHaveLength(1);
    expect(selectCascadeFinds([word('TILES')], 4)).toHaveLength(1);
  });

  it('chain level < 3 accepts any find', () => {
    expect(selectCascadeFinds([cluster(3)], 2)).toHaveLength(1);
  });

  it('empty input returns empty', () => {
    expect(selectCascadeFinds([], 1)).toHaveLength(0);
  });
});
