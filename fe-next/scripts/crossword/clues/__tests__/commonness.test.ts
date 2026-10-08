import { describe, it, expect } from 'vitest';
import { buildCommonness } from '../commonness';

describe('buildCommonness', () => {
  const isCommon = buildCommonness(['La casa es grande. Casa, CASA y más', 'El té está caliente']);

  it('counts accent-folded, case-insensitive occurrences across texts', () => {
    expect(isCommon('casa', 2)).toBe(true);
    expect(isCommon('mas', 1)).toBe(true);
    expect(isCommon('te', 1)).toBe(true);
  });

  it('rejects words below the threshold or absent', () => {
    expect(isCommon('grande', 2)).toBe(false);
    expect(isCommon('tijo', 1)).toBe(false);
  });
});
