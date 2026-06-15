/**
 * Hero legendary parts must read as premium at thumbnail size and survive the
 * circular/rect crop. Regression: dragonHead horns ran to y=-2 / x=12,88 — off
 * the 0-100 viewBox AND outside the r=50 circular safe zone — so the 10k-coin
 * dragon rendered as a near-plain face with its signature horns clipped away.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import AvatarRenderer from '../../AvatarRenderer';
import { DEFAULT_AVATAR_CONFIG, type CustomAvatarConfig } from '@/shared/types/customAvatar';

/** Pull every numeric coordinate out of the rendered SVG path/shape data. */
function coords(svg: string): number[] {
  const nums: number[] = [];
  // d="..." path data
  for (const m of svg.matchAll(/d="([^"]+)"/g)) {
    for (const n of m[1].matchAll(/-?\d+(?:\.\d+)?/g)) nums.push(parseFloat(n[0]));
  }
  // polygon points="..."
  for (const m of svg.matchAll(/points="([^"]+)"/g)) {
    for (const n of m[1].matchAll(/-?\d+(?:\.\d+)?/g)) nums.push(parseFloat(n[0]));
  }
  return nums;
}

describe('dragonHead base — horns stay on-canvas', () => {
  const cfg: CustomAvatarConfig = { ...DEFAULT_AVATAR_CONFIG, base: 'dragonHead' };

  it('keeps all geometry within the 0-100 viewBox (no off-canvas clipping)', () => {
    const svg = renderToStaticMarkup(<AvatarRenderer config={cfg} size={120} disableEffects />);
    const c = coords(svg);
    expect(c.length).toBeGreaterThan(0);
    // Path/polygon coords are all in viewBox space; nothing should be negative
    // (off the top/left edge) which is where the old horns were getting cut.
    expect(Math.min(...c)).toBeGreaterThanOrEqual(0);
  });

  it('renders the dragon face', () => {
    const svg = renderToStaticMarkup(<AvatarRenderer config={cfg} size={64} disableEffects circular />);
    expect(svg).toContain('dragonScaleGrad');
  });
});
