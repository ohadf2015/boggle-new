import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PartThumb } from '@/lib/avatar/catalog';
import { CANONICAL_PARTS, LEGACY_CATEGORIES } from '@/lib/avatar/legacyMap';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

describe('PartThumb (catalog thumbnail)', () => {
  it('renders ONE small svg per part — never the full avatar compositor', () => {
    const { container } = render(<PartThumb category="hair" id="afro" config={DEFAULT_AVATAR_CONFIG} size={48} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(1);
    expect(svgs[0].getAttribute('width')).toBe('48');
    expect(container.querySelector('[data-testid="custom-avatar"]')).toBeNull();
    expect(svgs[0].getAttribute('data-part')).toBe('hair:afro');
  });

  it('renders every canonical part of every category without throwing', () => {
    for (const cat of LEGACY_CATEGORIES) {
      for (const id of CANONICAL_PARTS[cat]) {
        const { container, unmount } = render(<PartThumb category={cat} id={id} config={DEFAULT_AVATAR_CONFIG} />);
        expect(container.querySelector('svg'), `${cat}:${id}`).not.toBeNull();
        unmount();
      }
    }
  });

  it('draws a retired id as the part it maps to', () => {
    const { container } = render(<PartThumb category="hair" id="lob" config={DEFAULT_AVATAR_CONFIG} />);
    expect(container.querySelector('svg')?.getAttribute('data-part')).toBe('hair:bob');
  });

  it('colors are the player\'s: hair thumb uses the config hair color', () => {
    const { container } = render(<PartThumb category="hair" id="bob" config={{ ...DEFAULT_AVATAR_CONFIG, hairColor: '#C62828' }} />);
    expect(container.innerHTML.toLowerCase()).toContain('#c62828');
  });
});
