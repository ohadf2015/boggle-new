import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

vi.mock('@/components/education/EduMascot', () => ({ EduMascot: () => null }));
import { HomeHero } from '../HomeHero';
import { catalogueEntry, FEATURED_HOME_MODES } from '@/components/education/ClassroomModeCatalogueData';

describe('HomeHero mode tiles', () => {
  it('Then every featured tile carries its poster cover full-bleed', () => {
    render(<HomeHero classrooms={[{ id: 'c1', name: '5B' }]} selectedId="c1" onSelect={vi.fn()} language="en" t={(k) => k} />);
    for (const id of FEATURED_HOME_MODES) {
      const img = within(screen.getByTestId(`home-mode-${id}`)).getByTestId('home-tile-cover');
      expect(img.getAttribute('src')).toBe(catalogueEntry(id)!.cover);
      expect(img.className).toContain('object-cover');
    }
  });
});
