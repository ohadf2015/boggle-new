/**
 * Bulk import carries the two new per-word skill fields:
 *   `mean:` — 2+ senses for multiple-meaning practice, separated by `;`
 *   `root: / pre: / suf:` — word parts for roots/affixes practice
 *
 * Same pipe-separated shape as the existing `syn: / ant: / ex: / level:` keys.
 */
import { describe, it, expect } from 'vitest';
import { parseBulkImportLine } from './BulkImportEnhanced';

describe('parseBulkImportLine — multiple meanings', () => {
  it('reads `mean:` as a semicolon-separated list of senses', () => {
    const parsed = parseBulkImportLine('bank - a money place | mean: the land beside a river; a place that keeps money');
    expect(parsed.word).toBe('bank');
    expect(parsed.definition).toBe('a money place');
    expect(parsed.meanings).toEqual(['the land beside a river', 'a place that keeps money']);
  });

  it('keeps commas inside a sense', () => {
    const parsed = parseBulkImportLine('trunk - a tree stem | mean: the thick stem of a tree; the boot of a car, at the back');
    expect(parsed.meanings).toEqual(['the thick stem of a tree', 'the boot of a car, at the back']);
  });

  it('accepts the long key and drops blank senses', () => {
    const parsed = parseBulkImportLine('wave - a ridge of water | meanings: a ridge of water; ;  ; to greet with your hand');
    expect(parsed.meanings).toEqual(['a ridge of water', 'to greet with your hand']);
  });

  it('omits meanings entirely when the segment is empty', () => {
    expect(parseBulkImportLine('bank - a money place | mean:   ').meanings).toBeUndefined();
    expect(parseBulkImportLine('bank - a money place').meanings).toBeUndefined();
  });
});

describe('parseBulkImportLine — roots and affixes', () => {
  it('reads root, prefix and suffix keys', () => {
    const parsed = parseBulkImportLine('unhappy - not happy | pre: un | suf: y');
    expect(parsed.morphology).toEqual({ prefix: 'un', suffix: 'y' });
  });

  it('reads a root with its meaning using `=`', () => {
    const parsed = parseBulkImportLine('aquarium - a tank for fish | root: aqua = water');
    expect(parsed.morphology).toEqual({ root: 'aqua', rootMeaning: 'water' });
  });

  it('accepts an explicit rootmean key', () => {
    const parsed = parseBulkImportLine('biology - the study of life | root: bio | rootmean: life');
    expect(parsed.morphology).toEqual({ root: 'bio', rootMeaning: 'life' });
  });

  it('accepts the long key names', () => {
    const parsed = parseBulkImportLine('rebuild - build again | prefix: re | suffix: ed');
    expect(parsed.morphology).toEqual({ prefix: 're', suffix: 'ed' });
  });

  it('strips a hyphen the teacher already typed', () => {
    expect(parseBulkImportLine('unhappy - not happy | pre: un-').morphology).toEqual({ prefix: 'un' });
    expect(parseBulkImportLine('joyful - full of joy | suf: -ful').morphology).toEqual({ suffix: 'ful' });
  });

  it('omits morphology entirely when nothing usable was given', () => {
    expect(parseBulkImportLine('plain - simple').morphology).toBeUndefined();
    expect(parseBulkImportLine('plain - simple | root:   ').morphology).toBeUndefined();
  });
});

describe('parseBulkImportLine — the new keys sit alongside the old ones', () => {
  it('parses every extra on one line', () => {
    const parsed = parseBulkImportLine(
      'bank - a money place | syn: shore, edge | ant: middle | ex: We sat on the ___ of the river. | level: challenge | mean: a river edge; a money place | root: banc = bench'
    );
    expect(parsed).toEqual({
      word: 'bank',
      definition: 'a money place',
      synonyms: ['shore', 'edge'],
      antonyms: ['middle'],
      example: 'We sat on the ___ of the river.',
      level: 'challenge',
      meanings: ['a river edge', 'a money place'],
      morphology: { root: 'banc', rootMeaning: 'bench' },
    });
  });

  it('ignores an unknown key without losing the rest', () => {
    const parsed = parseBulkImportLine('bank - a money place | wat: nope | pre: un');
    expect(parsed.morphology).toEqual({ prefix: 'un' });
    expect(parsed.definition).toBe('a money place');
  });
});
