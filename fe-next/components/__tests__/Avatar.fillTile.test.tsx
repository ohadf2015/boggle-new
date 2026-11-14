/**
 * Leaderboard rows size the avatar tile themselves (a 40px circle on phones
 * around `size="lg"`, which draws at 48px). The SVG must fill that tile, or it
 * overflows and hugs the start edge: the face sits low and to one side.
 */
import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import Avatar from '@/components/Avatar';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

const svgIn = async (el: HTMLElement) => {
  await waitFor(() => expect(el.querySelector('svg[data-testid="custom-avatar"]')).not.toBeNull());
  return el.querySelector('svg[data-testid="custom-avatar"]') as SVGSVGElement;
};

describe('Avatar fills a caller-sized tile', () => {
  it('Given a player with no custom avatar in a 40px circle, When rendered, Then the SVG fills the tile', async () => {
    const { container } = render(
      <div className="w-10 h-10"><Avatar userId="guest-123" size="lg" className="w-full h-full" /></div>,
    );
    const svg = await svgIn(container);
    expect(svg.getAttribute('class')).toMatch(/\bw-full\b/);
    expect(svg.getAttribute('class')).toMatch(/\bh-full\b/);
    expect(svg.getAttribute('class')).toMatch(/\bblock\b/);
  });

  it('Given a custom avatar in the same circle, When rendered, Then the SVG fills the tile too', async () => {
    const { container } = render(
      <div className="w-10 h-10"><Avatar customAvatar={DEFAULT_AVATAR_CONFIG} size="lg" className="w-full h-full" /></div>,
    );
    const svg = await svgIn(container);
    expect(svg.getAttribute('class')).toMatch(/\bw-full\b/);
    expect(svg.getAttribute('class')).toMatch(/\bblock\b/);
  });

  it('Given disableEffects, When rendered, Then the bare SVG still fills the tile', async () => {
    const { container } = render(<Avatar userId="guest-9" size="sm" disableEffects />);
    const svg = await svgIn(container);
    expect(svg.getAttribute('class')).toMatch(/\bw-full\b/);
  });
});
