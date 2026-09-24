import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DEFAULT_AVATAR_CONFIG, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import {
  CUTOUT_CLASS,
  CUTOUT_CSS,
  CUTOUT_FIGURE,
  CUTOUT_SVG,
  CUTOUT_TILE_LAYERS,
} from '../avatarCutout';

/**
 * Guard for the reveal's free-standing avatar. The reveal hides the tile
 * layers of the REAL renderer output with scoped CSS (the renderer has no
 * public "no backdrop" prop). If the art track restructures AvatarArt, these
 * fail loudly instead of the reveal silently drawing a square behind the kid.
 */
function renderAvatar(config: CustomAvatarConfig) {
  return render(<AvatarRenderer config={config} size={156} disableEffects forceTier="free" />);
}

describe('avatar cutout contract (reveal)', () => {
  const config: CustomAvatarConfig = { ...DEFAULT_AVATAR_CONFIG, bgColor: '#123456', accessory: 'headphones' };

  it('the renderer output has exactly one character group inside the tile clip', () => {
    const { container } = renderAvatar(config);
    const figure = container.querySelectorAll(CUTOUT_FIGURE);
    expect(figure).toHaveLength(1);
    // the character itself: many drawn shapes, not an empty wrapper
    expect(figure[0].querySelectorAll('path, ellipse, circle, rect').length).toBeGreaterThan(10);
  });

  it('the hidden tile layers include the background fill and never the character', () => {
    const { container } = renderAvatar(config);
    const layers = Array.from(container.querySelectorAll(CUTOUT_TILE_LAYERS));
    expect(layers.length).toBeGreaterThanOrEqual(1);
    expect(layers.some(el => (el.getAttribute('fill') ?? '').toUpperCase() === '#123456')).toBe(true);
    const figure = container.querySelector(CUTOUT_FIGURE)!;
    for (const el of layers) expect(el.contains(figure)).toBe(false);
  });

  it('with the tier forced to free, nothing is drawn outside the clip (no frame, gem or ring)', () => {
    const legendary: CustomAvatarConfig = { ...config, accessory: 'iceCrown', eyes: 'starEye' };
    const { container } = renderAvatar(legendary);
    const svg = container.querySelector(CUTOUT_SVG)!;
    const extras = Array.from(svg.children).filter(el => el.tagName.toLowerCase() !== 'defs' && !el.hasAttribute('clip-path'));
    expect(extras).toHaveLength(0);
  });

  it('the CSS is scoped to the reveal and targets exactly these selectors', () => {
    expect(CUTOUT_CSS).toContain(`.${CUTOUT_CLASS} ${CUTOUT_TILE_LAYERS}`);
    expect(CUTOUT_CSS).toMatch(/display:\s*none/);
    expect(CUTOUT_CSS).toMatch(/clip-path:\s*none/);
    // every rule is scoped (no global override of other avatars on the page)
    const rules = CUTOUT_CSS.split('}').map(r => r.trim()).filter(Boolean);
    for (const r of rules) expect(r.startsWith(`.${CUTOUT_CLASS} `), r).toBe(true);
  });
});
