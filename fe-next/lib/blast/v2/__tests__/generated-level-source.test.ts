import { describe, it, expect } from 'vitest';
import { GeneratedLevelSource } from '../generator/generated-level-source';
import { LOCALE_CONFIGS } from '../locale-config';

describe('GeneratedLevelSource', () => {
  const source = new GeneratedLevelSource(LOCALE_CONFIGS);

  it('resolve(31, "en") returns valid BlastLevel', async () => {
    const lvl = await source.resolve(31, 'en', 'test-bucket');
    expect(lvl.levelNumber).toBe(31);
    expect(lvl.locale).toBe('en');
    expect(lvl.words.length).toBeGreaterThan(0);
    expect(lvl.columns.length).toBeGreaterThan(0);
  });

  it('same args produce same result (deterministic)', async () => {
    const lvl1 = await source.resolve(32, 'en', 'bucket-1');
    const lvl2 = await source.resolve(32, 'en', 'bucket-1');
    expect(lvl1.id).toBe(lvl2.id);
  });

  it('different user buckets produce different levels', async () => {
    const lvl1 = await source.resolve(33, 'en', 'bucket-1');
    const lvl2 = await source.resolve(33, 'en', 'bucket-2');
    expect(lvl1.id).not.toBe(lvl2.id);
  });

  it('resolves for HE locale', async () => {
    const lvl = await source.resolve(31, 'he', 'test');
    expect(lvl.locale).toBe('he');
  });

  it('lvl 35+ has gravityMode in standard or lateral-slide', async () => {
    const lvl = await source.resolve(35, 'en', 'test');
    expect(['standard', 'lateral-slide']).toContain(lvl.gravityMode);
  });

  it('different variantSalt produces different boards (daily reshuffle)', async () => {
    const a = await source.resolve(40, 'en', 'bucket', '2026-05-26');
    const b = await source.resolve(40, 'en', 'bucket', '2026-05-27');
    const sameShape =
      a.theme === b.theme &&
      a.words.join('|') === b.words.join('|') &&
      a.columns.map((c) => c.tiles.join('')).join('/') ===
        b.columns.map((c) => c.tiles.join('')).join('/');
    expect(sameShape).toBe(false);
  });

  it('same variantSalt is deterministic', async () => {
    const a = await source.resolve(41, 'en', 'bucket', '2026-05-26');
    const b = await source.resolve(41, 'en', 'bucket', '2026-05-26');
    expect(a.id).toBe(b.id);
  });

  it('omitted variantSalt matches empty string (back-compat)', async () => {
    const a = await source.resolve(42, 'en', 'bucket');
    const b = await source.resolve(42, 'en', 'bucket', '');
    expect(a.id).toBe(b.id);
  });
});
