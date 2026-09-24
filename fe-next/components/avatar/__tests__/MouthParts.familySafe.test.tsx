/**
 * Google Play "Designed for Families" compliance — avatar mouths must not
 * depict tobacco/smoking or blood. Guards against regressions that would
 * re-introduce policy-violating imagery.
 *
 * 2026-09 redraw: re-asserted on the new art (components/avatar/art). The old
 * `pipe` id is retired and renders as a same-rarity sibling via legacyMap.
 */
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MOUTHS } from '@/components/avatar/art/mouths';
import { buildCtx } from '@/components/avatar/art/ctx';
import { mapLegacyPart, resolveAvatarConfig } from '@/lib/avatar/legacyMap';
import { customAvatarSchema, DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

const ctx = buildCtx(resolveAvatarConfig(DEFAULT_AVATAR_CONFIG), 't', false);
const markup = (key: string) => {
  const draw = MOUTHS[mapLegacyPart('mouth', key)];
  return renderToStaticMarkup(<svg viewBox="0 0 100 100">{draw(ctx)}</svg>).toLowerCase();
};

/** Blood reds used by the old art + any saturated drip red. */
const BLOOD = ['cc0000', 'ff4444', 'd8143a', '8b0000'];

describe('MouthParts — family-safe content', () => {
  it('the legacy "pipe" mouth no longer depicts tobacco (no pipe/ember/smoke)', () => {
    const html = markup('pipe');
    expect(mapLegacyPart('mouth', 'pipe')).not.toBe('pipe');
    expect(html).not.toContain('8b4513'); // pipe wood
    expect(html).not.toContain('ff4500'); // lit ember
    expect(html).not.toContain('ffd700'); // ember glow
    expect(html).not.toMatch(/#ddd\b/); // smoke
  });

  it('a saved avatar with mouth "pipe" still validates (back-compat)', () => {
    const base = {
      gender: 'male', base: 'round', skinColor: '#E0AC69', hair: 'spiky',
      hairColor: '#000000', eyes: 'round', eyeColor: '#4A6FA5', noseStyle: 'button',
      eyebrows: 'none', facialHair: 'none', mouth: 'pipe', accessory: 'none',
      accessoryColor: '#000000', bgColor: '#1a1a2e', shirtColor: '#4A6FA5',
    };
    expect(() => customAvatarSchema.parse(base)).not.toThrow();
  });

  it('the "vampire" mouth has fangs but no blood', () => {
    const html = markup('vampire');
    for (const red of BLOOD) expect(html).not.toContain(red);
    expect(html).toContain('<path');
  });

  it('the "dragon" mouth breathes fire but does not drip blood/venom', () => {
    const html = markup('dragon');
    for (const red of BLOOD) expect(html).not.toContain(red);
    expect(html).not.toContain('4caf50'); // green venom drip
    expect(html).toContain('av-flicker'); // the fire puff is still there
  });
});
