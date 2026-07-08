import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Mascot, getMascotBgType, getMascotBgTypeForSrc } from '../Mascot';
import { CelebrationMascot } from '../CelebrationMascot';
import { EnhancedEmptyState } from '../EnhancedEmptyState';

/**
 * Cosy mode is a light-theme palette flip (html[data-cosy='true']). The opaque
 * `dark`-bg mascot WebPs carry a navy backdrop baked into the pixels, so on the
 * cream cosy surface they render as a hard dark rectangle. The fix frames them
 * via a CSS attribute hook: every mascot exposes its background type on the
 * media wrapper as `data-mascot-bg`, and the cosy stylesheet rounds + frames the
 * `dark` ones into an intentional portrait. This test pins the structural hook
 * (the CSS framing itself is verified visually in-browser).
 */
describe('Mascot — cosy background hook', () => {
  it('exposes data-mascot-bg on the media wrapper matching the variant bg type', () => {
    const { container } = render(<Mascot variant="happy" />);
    const hook = container.querySelector('[data-mascot-bg]');
    expect(hook).not.toBeNull();
    expect(hook?.getAttribute('data-mascot-bg')).toBe(getMascotBgType('happy'));
  });

  it('tags an opaque dark-bg variant as dark so cosy CSS can frame it', () => {
    const { container } = render(<Mascot variant="celebration" />);
    expect(container.querySelector('[data-mascot-bg="dark"]')).not.toBeNull();
  });

  it('tags a transparent variant as nobg so cosy CSS leaves it untouched', () => {
    const { container } = render(<Mascot variant="onfire" />);
    expect(container.querySelector('[data-mascot-bg="nobg"]')).not.toBeNull();
  });

  it('tags a white-bg variant as white (already circle-clipped, no frame needed)', () => {
    const { container } = render(<Mascot variant="waving" />);
    expect(container.querySelector('[data-mascot-bg="white"]')).not.toBeNull();
  });
});

describe('getMascotBgTypeForSrc — path-based bg resolution for raw-src renderers', () => {
  it('resolves a known opaque variant path to its mapped bg type', () => {
    expect(getMascotBgTypeForSrc('/mascot/celebration.webp')).toBe('dark');
    expect(getMascotBgTypeForSrc('/mascot/explorer.webp')).toBe('dark');
  });

  it('resolves a transparent variant path to nobg', () => {
    expect(getMascotBgTypeForSrc('/mascot/onfire-nobg.webp')).toBe('nobg');
  });

  it('falls back to nobg for any unknown -nobg path', () => {
    expect(getMascotBgTypeForSrc('/mascot/something-nobg.webp')).toBe('nobg');
  });

  it('falls back to dark (frame it) for an unknown opaque path', () => {
    expect(getMascotBgTypeForSrc('/mascot/unknown.webp')).toBe('dark');
  });
});

/**
 * Results/celebration + empty-state are the cosy surfaces hardest to reach live
 * (env-gated game state). The frame→attribute link is proven visually once on
 * the home hero, so pinning that these path-based renderers emit the right
 * attribute covers them without a live screen.
 */
describe('Cosy hook on path-based renderers', () => {
  it('CelebrationMascot tags its opaque trophy/celebration art as dark', () => {
    const { container } = render(<CelebrationMascot variant="celebration" />);
    expect(container.querySelector('[data-mascot-bg="dark"]')).not.toBeNull();
  });

  it('EnhancedEmptyState tags an opaque mascot variant as dark', () => {
    // EnhancedEmptyState takes a mascotVariant (the raw-src `mascotSrc` prop was
    // dropped when EmptyState was consolidated into it); the opaque `oops` art
    // still resolves to a dark bg so the cosy CSS frames it.
    const { container } = render(
      <EnhancedEmptyState title="Nothing here" mascotVariant="oops" />,
    );
    expect(container.querySelector('[data-mascot-bg="dark"]')).not.toBeNull();
  });
});
