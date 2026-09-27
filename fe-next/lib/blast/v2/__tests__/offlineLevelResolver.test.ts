import { describe, it, expect } from 'vitest';
import { resolveOfflineLevel, hasOfflineLevels } from '../offlineLevelResolver';

/**
 * The offline resolver is the zero-network path for Wordfall (Blast V2): it
 * bundles the chain packs and runs the pure chain-builder client-side, so a
 * rider with no connection can still play the campaign. Score parity with the
 * server holds because stars/coins derive from level.words (the chain), which
 * is identical regardless of which board layout the builder picks.
 */
describe('offlineLevelResolver', () => {
  it('reports every locale with a bundled chain pack (en/he/sv/es), ja as not', () => {
    // Must mirror level-source-registry CHAIN_LOCALES so an sv/es rider gets
    // real native content offline, not an English fallback mid-campaign.
    expect(hasOfflineLevels('en')).toBe(true);
    expect(hasOfflineLevels('he')).toBe(true);
    expect(hasOfflineLevels('sv')).toBe(true);
    expect(hasOfflineLevels('es')).toBe(true);
    expect(hasOfflineLevels('ja')).toBe(false);
  });

  it('builds sv + es levels offline tagged with their own locale (no English fallback)', () => {
    const sv = resolveOfflineLevel(1, 'sv');
    expect(sv).not.toBeNull();
    expect(sv!.locale).toBe('sv');
    const es = resolveOfflineLevel(1, 'es');
    expect(es).not.toBeNull();
    expect(es!.locale).toBe('es');
  });

  it('builds en level 1 fully offline with the chain words present', () => {
    const level = resolveOfflineLevel(1, 'en');
    expect(level).not.toBeNull();
    expect(level!.levelNumber).toBe(1);
    expect(level!.locale).toBe('en');
    expect(level!.words).toEqual(expect.arrayContaining(['CAT', 'SUN', 'EGG']));
    expect(level!.columns.length).toBeGreaterThan(0);
  });

  it('builds every en level 1..30 offline', () => {
    for (let n = 1; n <= 30; n++) {
      expect(resolveOfflineLevel(n, 'en'), `level ${n} failed to build offline`).not.toBeNull();
    }
  });

  it('builds he levels offline tagged he', () => {
    const level = resolveOfflineLevel(1, 'he');
    expect(level).not.toBeNull();
    expect(level!.locale).toBe('he');
  });

  it('returns null past the bundled range (31+) so the campaign ends gracefully', () => {
    expect(resolveOfflineLevel(31, 'en')).toBeNull();
  });

  it('falls back to the en pack for locales with no bundled pack', () => {
    const level = resolveOfflineLevel(1, 'ja');
    expect(level).not.toBeNull();
  });

  it('is deterministic — identical level on repeat calls', () => {
    const a = resolveOfflineLevel(5, 'en');
    const b = resolveOfflineLevel(5, 'en');
    expect(a).toEqual(b);
  });
});
