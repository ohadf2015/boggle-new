/**
 * PartPreview is the picker thumbnail — the surface where players decide whether
 * a 1,500–12,000-coin part is worth buying. It must show the part composited on a
 * REAL face (how it actually looks equipped), not floating on a headless blob.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PartPreview from '../PartPreview';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

describe('PartPreview — composites on a full face', () => {
  it('renders a complete avatar, not an isolated part', () => {
    render(<PartPreview partType="eyes" partName="galaxy" config={DEFAULT_AVATAR_CONFIG} size={48} />);
    expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
  });

  it('swaps the previewed eye part onto the face', () => {
    render(<PartPreview partType="eyes" partName="galaxy" config={DEFAULT_AVATAR_CONFIG} size={48} />);
    const svg = screen.getByTestId('custom-avatar');
    expect(svg.getAttribute('aria-label')).toContain('galaxy eyes');
  });

  it('swaps the previewed base part onto the face', () => {
    render(<PartPreview partType="base" partName="dragonHead" config={DEFAULT_AVATAR_CONFIG} size={48} />);
    const svg = screen.getByTestId('custom-avatar');
    expect(svg.getAttribute('aria-label')).toContain('dragonHead face');
  });

  it('keeps the rest of the user config so the part is shown in context', () => {
    const cfg = { ...DEFAULT_AVATAR_CONFIG, hair: 'spiky' as const };
    render(<PartPreview partType="accessory" partName="phoenixCrown" config={cfg} size={48} />);
    const svg = screen.getByTestId('custom-avatar');
    // The user's own hair is preserved (contextual "how it looks on ME").
    expect(svg.getAttribute('aria-label')).toContain('spiky hair');
  });

  it('zooms into the feature for small parts so they read at 48px (eyes/mouth)', () => {
    // Small parts would be a few px on a full face — zoom in on the region.
    render(<PartPreview partType="eyes" partName="galaxy" config={DEFAULT_AVATAR_CONFIG} size={48} />);
    expect(screen.getByTestId('part-preview-zoom')).toBeInTheDocument();
  });

  it('shows big-silhouette parts as a full face (no zoom crop)', () => {
    // Accessories/hair/base change the whole silhouette — keep the full face.
    render(<PartPreview partType="accessory" partName="crown" config={DEFAULT_AVATAR_CONFIG} size={48} />);
    expect(screen.queryByTestId('part-preview-zoom')).not.toBeInTheDocument();
  });
});
