/**
 * PartPreview is the picker thumbnail — the surface where players decide whether
 * a 1,500–12,000-coin part is worth buying. It must show the part composited on a
 * REAL face (how it actually looks equipped), not floating on a headless blob.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PartPreview, { arePartPreviewPropsEqual } from '../PartPreview';
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

/**
 * A grid cell FORCES its own part key (a hair cell renders `{...config, hair: partName}`),
 * so it does NOT depend on `config[ownKey]`. Clicking through one category changes that
 * field on every edit — re-rendering ~50 full-SVG thumbnails for zero visual change is the
 * builder's main jank source. The comparator skips those re-renders while still updating
 * cells when a SHARED field (skin/hair colour, background) actually changes their look.
 */
describe('arePartPreviewPropsEqual — memo guard', () => {
  const base = { partType: 'hair' as const, partName: 'spiky', config: DEFAULT_AVATAR_CONFIG, size: 48 };

  it('treats identical props as equal (skip re-render)', () => {
    expect(arePartPreviewPropsEqual(base, { ...base })).toBe(true);
  });

  it('skips re-render when only the cell\'s OWN (overridden) part key changed', () => {
    // hair cell forces `hair: partName`, so a new config.hair changes nothing it shows.
    const next = { ...base, config: { ...DEFAULT_AVATAR_CONFIG, hair: 'mohawk' as const } };
    expect(arePartPreviewPropsEqual(base, next)).toBe(true);
  });

  it('re-renders when a SHARED config field changed (skin colour)', () => {
    const next = { ...base, config: { ...DEFAULT_AVATAR_CONFIG, skinColor: '#000000' } };
    expect(arePartPreviewPropsEqual(base, next)).toBe(false);
  });

  it('re-renders when a SHARED config field changed (background colour)', () => {
    const next = { ...base, config: { ...DEFAULT_AVATAR_CONFIG, bgColor: '#FF0000' } };
    expect(arePartPreviewPropsEqual(base, next)).toBe(false);
  });

  it('maps nose cells to the noseStyle config key (own key ignored)', () => {
    const nose = { partType: 'nose' as const, partName: 'button', config: DEFAULT_AVATAR_CONFIG, size: 48 };
    const sameLook = { ...nose, config: { ...DEFAULT_AVATAR_CONFIG, noseStyle: 'wide' as const } };
    expect(arePartPreviewPropsEqual(nose, sameLook)).toBe(true);
    const diffLook = { ...nose, config: { ...DEFAULT_AVATAR_CONFIG, eyes: 'galaxy' as const } };
    expect(arePartPreviewPropsEqual(nose, diffLook)).toBe(false);
  });

  it('re-renders when partName, size, or partType changed', () => {
    expect(arePartPreviewPropsEqual(base, { ...base, partName: 'mohawk' })).toBe(false);
    expect(arePartPreviewPropsEqual(base, { ...base, size: 128 })).toBe(false);
    expect(arePartPreviewPropsEqual(base, { ...base, partType: 'eyes' })).toBe(false);
  });
});
