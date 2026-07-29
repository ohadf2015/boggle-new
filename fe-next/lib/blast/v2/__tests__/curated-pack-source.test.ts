import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { CuratedPackSource, validateCuratedLevel } from '../curated-pack-source';

describe('validateCuratedLevel', () => {
  it('accepts valid level', () => {
    const valid = {
      id: 'test', levelNumber: 1, theme: 'fruits', locale: 'en',
      words: ['TEST'], columns: [], resolvableOrder: ['TEST'],
      tileFlags: {}, difficulty: 1,
    };
    expect(() => validateCuratedLevel(valid)).not.toThrow();
  });

  it('rejects when words is empty', () => {
    const invalid = {
      id: 'test', levelNumber: 1, theme: 'fruits', locale: 'en',
      words: [], columns: [], resolvableOrder: [],
      tileFlags: {}, difficulty: 1,
    };
    expect(() => validateCuratedLevel(invalid)).toThrow(/words must be non-empty/);
  });

  it('rejects unknown locale', () => {
    const invalid = {
      id: 'test', levelNumber: 1, theme: 'fruits', locale: 'xx',
      words: ['TEST'], columns: [], resolvableOrder: ['TEST'],
      tileFlags: {}, difficulty: 1,
    };
    expect(() => validateCuratedLevel(invalid)).toThrow(/locale invalid/);
  });

  it('rejects resolvableOrder containing unknown word', () => {
    const invalid = {
      id: 'test', levelNumber: 1, theme: 'fruits', locale: 'en',
      words: ['TEST'], columns: [], resolvableOrder: ['UNKNOWN'],
      tileFlags: {}, difficulty: 1,
    };
    expect(() => validateCuratedLevel(invalid)).toThrow(/unknown word/);
  });
});

describe('CuratedPackSource', () => {
  it('resolve(3, "en") returns valid level', async () => {
    const basePath = join(process.cwd(), 'content', 'blast', 'packs');
    const source = new CuratedPackSource(basePath);
    const lvl = await source.resolve(3, 'en');
    expect(lvl.levelNumber).toBe(3);
    expect(lvl.locale).toBe('en');
    expect(lvl.words.length).toBeGreaterThan(0);
  });

  it('resolve(31, "en") throws out-of-range', async () => {
    const basePath = join(process.cwd(), 'content', 'blast', 'packs');
    const source = new CuratedPackSource(basePath);
    await expect(source.resolve(31, 'en')).rejects.toThrow(/outside curated range/);
  });

  it('ignores pack-chain.json (forced-chain schema, not a curated pack)', async () => {
    // pack-chain.json sits in the same dir but has the ChainLevelSpec schema
    // (no `words`). The curated loader must skip it rather than choke on it.
    const basePath = join(process.cwd(), 'content', 'blast', 'packs');
    const source = new CuratedPackSource(basePath);
    const lvl = await source.resolve(1, 'en');
    expect(lvl.id).toBe('onboarding-1');
    expect(lvl.words.length).toBeGreaterThan(0);
  });
});
