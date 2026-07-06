/**
 * MODE_META is the static presentation table the `cubes` landing variant reads.
 * The control path (`LandingChallengeCards.renderCard`) hardcodes the same
 * route + variant per mode inline. These tests pin MODE_META to control's
 * known values so the A/B compares LAYOUT only — a drift in either side
 * (route changed control-side, not mirrored here) forces a conscious update.
 */
import { describe, it, expect } from 'vitest';
import { MODE_META, modeRoute, CUBE_VARIANTS, isCalmMode } from '../modeMeta';

describe('MODE_META — parity with control renderCard', () => {
  // [key, route-suffix, variant] mirrored from LandingChallengeCards.renderCard
  const PUBLIC_CONTRACT: ReadonlyArray<[string, string, string]> = [
    ['arena', '/multiplayer', 'pink'],
    ['practice', '/practice', 'cyan'],
    ['blast', '/blast', 'orange'],
    ['adventure', '/adventure', 'lime'],
    ['connections', '/connections/play', 'blue'],
    ['brainGym', '/brain', 'purple'],
    ['wordCraft', '/word-craft', 'orange'],
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

  // EVERY mode (public + admin) must ship a generated cube icon so the whole
  // bento grid — including the "+ More" admin drawer — renders full-bleed art
  // instead of an icon-on-navy fallback. Keeps the layout cohesive end to end.
  it.each(Object.keys(MODE_META))('mode %s has a generated cube icon', (key) => {
    const { genIcon } = MODE_META[key];
    expect(genIcon, `${key} genIcon present`).toBeTruthy();
    expect(genIcon, `${key} genIcon lives under /modes/cubes/`).toMatch(/^\/modes\/cubes\/.+\.png$/);
  });

  // The kawaii cube stickers are not framed consistently, so imgScale (a
  // per-asset CSS scale applied in the Cube) normalises them into three groups:
  //  - FLOATY: subject floats small + centred in a big navy margin → scale up.
  //  - OVERSIZED: subject reads too large in its tile (arena's knights, zoomed
  //    by the wider 2×2 anchor's object-cover crop) → scale down to add margin.
  //  - NATURAL: blast/adventure bleed FX to the edges, brainGym's character
  //    already spans ~75% → leave at 1 (any change clips FX / character).
  describe('imgScale — per-asset framing normalisation', () => {
    const FLOATY = ['practice', 'connections', 'wordCraft'] as const;
    const OVERSIZED = ['arena'] as const;
    const NATURAL = ['blast', 'adventure', 'brainGym'] as const;

    it.each(FLOATY)('small-framed mode %s scales its art up (>1)', (key) => {
      const { imgScale } = MODE_META[key];
      expect(imgScale, `${key} imgScale set`).toBeGreaterThan(1);
      // sanity ceiling — a scale this big would crop the character, not just navy
      expect(imgScale, `${key} imgScale sane`).toBeLessThanOrEqual(1.8);
    });

    it.each(OVERSIZED)('over-large mode %s scales its art down (<1)', (key) => {
      const { imgScale } = MODE_META[key];
      expect(imgScale, `${key} imgScale set`).toBeLessThan(1);
      // sanity floor — below this the subject would shrink to a postage stamp
      expect(imgScale, `${key} imgScale sane`).toBeGreaterThanOrEqual(0.6);
    });

    it.each(NATURAL)('large/edge-bleeding mode %s is left at natural framing (no imgScale)', (key) => {
      // undefined or exactly 1 both mean "no scale" — never >1 (would clip FX / character)
      expect(MODE_META[key].imgScale ?? 1).toBe(1);
    });
  });

  describe('modeRoute', () => {
    it('prefixes the active language', () => {
      expect(modeRoute('arena', 'he')).toBe('/he/multiplayer');
      expect(modeRoute('connections', 'en')).toBe('/en/connections/play');
    });


    it('returns null for an unknown key', () => {
      expect(modeRoute('nope', 'en')).toBeNull();
    });
  });

  // The homepage splits modes into an energetic competitive bento and a calmer
  // "no-timer / play at your pace" section. Category is intrinsic per-mode data
  // (lives in the table); the fast/calm PARTITION is a pure helper both the
  // desktop + mobile renderers call so the split can never drift between them.
  describe('mode category — calm / no-timer grouping', () => {
    const CALM = ['crossword', 'wordCraft', 'sealedBid', 'connections', 'blast'] as const;
    const FAST = ['arena', 'practice', 'adventure', 'brainGym'] as const;

    it.each(CALM)('%s is tagged category=calm', (key) => {
      expect(MODE_META[key].category, `${key} category`).toBe('calm');
    });

    it.each(FAST)('%s is NOT calm (energetic/competitive bento)', (key) => {
      expect(MODE_META[key].category === 'calm', `${key} not calm`).toBe(false);
    });

    describe('isCalmMode', () => {
      it('true for a calm mode', () => expect(isCalmMode('connections')).toBe(true));
      it('false for a fast mode', () => expect(isCalmMode('arena')).toBe(false));
      it('false for an unknown key (no throw)', () => expect(isCalmMode('nope')).toBe(false));
    });
  });

  describe('admin modes carry the ADMIN badge', () => {
    it.each(['wordTower', 'shiritori', 'sealedBid'])(
      '%s badge=ADMIN',
      (key) => {
        expect(MODE_META[key].badge).toBe('ADMIN');
      },
    );
  });
});
