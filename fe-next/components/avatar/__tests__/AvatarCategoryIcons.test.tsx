import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AVATAR_CATEGORY_ICONS, type AvatarCategoryKey } from '../AvatarCategoryIcons';

const ALL_KEYS: AvatarCategoryKey[] = [
  'base',
  'hair',
  'eyes',
  'mouth',
  'facialHair',
  'accessories',
  'background',
];

describe('AvatarCategoryIcons', () => {
  it('exposes a purpose-drawn glyph for every avatar category', () => {
    for (const key of ALL_KEYS) {
      expect(AVATAR_CATEGORY_ICONS[key]).toBeTypeOf('function');
    }
    // No stray keys beyond the 7 categories.
    expect(Object.keys(AVATAR_CATEGORY_ICONS).sort()).toEqual([...ALL_KEYS].sort());
  });

  it('renders each glyph as a decorative inline svg matching lucide geometry', () => {
    for (const key of ALL_KEYS) {
      const Icon = AVATAR_CATEGORY_ICONS[key];
      const { container, unmount } = render(<Icon size={16} />);
      const svg = container.querySelector('svg');
      expect(svg, `${key} should render an <svg>`).toBeInTheDocument();
      // Decorative — accessible name comes from the tab's title, not the icon.
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      // Honors the size prop and stays on lucide's 24-grid for visual consistency.
      expect(svg).toHaveAttribute('width', '16');
      expect(svg).toHaveAttribute('height', '16');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      // Stroke-based, themeable via currentColor (inherits active/inactive tab color).
      expect(svg).toHaveAttribute('fill', 'none');
      expect(svg).toHaveAttribute('stroke', 'currentColor');
      unmount();
    }
  });

  it('draws the mouth as two lip curves (cupid-bow top + smile bottom), not a lens that reads as an eye', () => {
    const { container } = render(<AVATAR_CATEGORY_ICONS.mouth size={20} />);
    const paths = container.querySelectorAll('svg > path');
    // Exactly two strokes = upper + lower lip. The old glyph had a third horizontal
    // seam line that, with the symmetric lens curves, looked like the eye glyph.
    expect(paths.length).toBe(2);
  });

  it('draws visually distinct glyphs (no two categories share identical path geometry)', () => {
    const markup = ALL_KEYS.map(key => {
      const Icon = AVATAR_CATEGORY_ICONS[key];
      const { container } = render(<Icon size={16} />);
      return container.querySelector('svg')!.innerHTML;
    });
    expect(new Set(markup).size).toBe(ALL_KEYS.length);
  });
});
