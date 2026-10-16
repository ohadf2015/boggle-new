import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomModeCatalogueCard } from '../ClassroomModeCatalogueCard';
import { catalogueEntry } from '../ClassroomModeCatalogueData';

describe('ClassroomModeCatalogueCard cover art', () => {
  it('Then the card shows the full poster cover edge to edge, not the small sticker', () => {
    const mode = catalogueEntry('classic')!;
    render(<ClassroomModeCatalogueCard mode={mode} name="Classic" minutesLabel="3 min" recommendedLabel={null} selected={false} onPick={vi.fn()} />);
    const img = screen.getByTestId('mode-card-cover');
    expect(img.getAttribute('src')).toBe(mode.cover);
    expect(img.className).toContain('object-cover');
    expect(img.className).toMatch(/h-full/);
  });
});
