/**
 * Small avatars (header, rows, chips) showed the whole bust inside a baked
 * ring, inside the caller's border: a tiny face in two circles. `crop="face"`
 * frames the head and leaves the ring to the container.
 */
import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import AvatarArt, { FACE_CROP } from '../AvatarArt';
import Avatar from '@/components/Avatar';
import AvatarLite from '@/components/AvatarLite';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

const cfg = { ...DEFAULT_AVATAR_CONFIG, accessory: 'none' } as typeof DEFAULT_AVATAR_CONFIG;

describe('AvatarArt face crop', () => {
  it('Given crop="face", When drawn, Then the viewBox frames the head and no ring is baked in', () => {
    const svg = renderToStaticMarkup(<AvatarArt config={cfg} uid="t" circular crop="face" />);
    expect(svg).toContain(`viewBox="${FACE_CROP.x} ${FACE_CROP.y} ${FACE_CROP.size} ${FACE_CROP.size}"`);
    expect(svg).not.toContain('data-token-edge');
  });

  it('Given the default crop, When drawn, Then the full token (ring included) is unchanged', () => {
    const svg = renderToStaticMarkup(<AvatarArt config={cfg} uid="t" circular />);
    expect(svg).toContain('viewBox="0 0 100 100"');
    expect(svg).toContain('data-token-edge');
  });
});

describe('small avatars focus the face', () => {
  const viewBoxOf = async (el: HTMLElement) => {
    await waitFor(() => expect(el.querySelector('svg[data-testid="custom-avatar"]')).not.toBeNull());
    return el.querySelector('svg[data-testid="custom-avatar"]')!.getAttribute('viewBox');
  };

  it('Given Avatar at 40px, When rendered, Then it uses the face crop', async () => {
    const { container } = render(<Avatar customAvatar={cfg} pixelSize={40} />);
    expect(await viewBoxOf(container)).toBe(`${FACE_CROP.x} ${FACE_CROP.y} ${FACE_CROP.size} ${FACE_CROP.size}`);
  });

  it('Given Avatar at 112px, When rendered, Then it keeps the full token', async () => {
    const { container } = render(<Avatar customAvatar={cfg} size="2xl" />);
    expect(await viewBoxOf(container)).toBe('0 0 100 100');
  });

  it('Given AvatarLite, When rendered, Then the server PNG is zoomed onto the same face window', () => {
    const { container } = render(<AvatarLite userId="abc" customAvatar={null} pixelSize={44} />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.style.transform).toMatch(/^scale\(1\.3\d*\)$/);
    expect(img.style.transformOrigin).not.toBe('');
  });
});
