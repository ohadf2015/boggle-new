/**
 * MODE_META is the static presentation table the `cubes` landing variant reads.
 * The control path (`LandingChallengeCards.renderCard`) hardcodes the same
 * route + variant per mode inline. These tests pin MODE_META to control's
 * known values so the A/B compares LAYOUT only — a drift in either side
 * (route changed control-side, not mirrored here) forces a conscious update.
 */
import { describe, it, expect } from 'vitest';
import { MODE_META, modeRoute, CUBE_VARIANTS } from '../modeMeta';

describe('MODE_META — parity with control renderCard', () => {
  // [key, route-suffix, variant] mirrored from LandingChallengeCards.renderCard
  const PUBLIC_CONTRACT: ReadonlyArray<[string, string, string]> = [
    ['arena', '/multiplayer', 'pink'],
    ['practice', '/practice', 'cyan'],
    ['blast', '/blast', 'orange'],
    ['adventure', '/adventure', 'lime'],
    ['connections', '/connections/play', 'purple'],
    ['brainGym', '/brain', 'purple'],
    ['wordCraft', '/word-craft', 'purple'],
    ['crossword', '/crossword', 'cyan'],
  ];

  it.each(PUBLIC_CONTRACT)('mode %s keeps route %s + variant %s', (key, path, variant) => {
    const meta = MODE_META[key];
    expect(meta, `${key} present in MODE_META`).toBeDefined();
    expect(meta.path, `${key} path`).toBe(path);
    expect(meta.variant, `${key} variant`).toBe(variant);
  });

  it('every entry has a title + description i18n key and a valid variant', () => {
    for (const [key, meta] of Object.entries(MODE_META)) {
      expect(meta.titleKey, `${key} titleKey`).toBeTruthy();
      expect(meta.descKey, `${key} descKey`).toBeTruthy();
      expect(CUBE_VARIANTS, `${key} variant valid`).toContain(meta.variant);
      expect(meta.path.startsWith('/'), `${key} path absolute`).toBe(true);
      expect(meta.Icon, `${key} Icon component`).toBeDefined();
    }
  });

  it('does NOT contain "daily" (special-cased as DailyChallengeBanner, never a cube)', () => {
    expect(MODE_META['daily']).toBeUndefined();
  });

  // Every public mode must ship a generated cube icon so the bento grid renders
  // full-bleed art (not an icon-on-navy fallback) — keeps the layout cohesive.
  // Admin previews are intentionally excluded (nobody public sees them).
  it.each(PUBLIC_CONTRACT.map(([key]) => key))('public mode %s has a generated cube icon', (key) => {
    const { genIcon } = MODE_META[key];
    expect(genIcon, `${key} genIcon present`).toBeTruthy();
    expect(genIcon, `${key} genIcon lives under /modes/cubes/`).toMatch(/^\/modes\/cubes\/.+\.png$/);
  });

  describe('modeRoute', () => {
    it('prefixes the active language', () => {
      expect(modeRoute('arena', 'he')).toBe('/he/multiplayer');
      expect(modeRoute('connections', 'en')).toBe('/en/connections/play');
    });

    it('preserves query strings in the path (blastClassic opts into v1)', () => {
      expect(modeRoute('blastClassic', 'en')).toBe('/en/blast?v2=off');
    });

    it('returns null for an unknown key', () => {
      expect(modeRoute('nope', 'en')).toBeNull();
    });
  });

  describe('admin modes carry the ADMIN badge', () => {
    it.each(['wordTower', 'wordForge', 'wordVault', 'party', 'wordAlchemy', 'shiritori', 'sealedBid'])(
      '%s badge=ADMIN',
      (key) => {
        expect(MODE_META[key].badge).toBe('ADMIN');
      },
    );
  });
});
