import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassroomModeSpotlight } from '../ClassroomModeSpotlight';
import { catalogueEntry, catalogueKeys } from '../ClassroomModeCatalogueData';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

function setup(id: 'classic' | 'word-hunt' = 'classic') {
  const mode = catalogueEntry(id)!;
  render(<ClassroomModeSpotlight mode={mode} keys={catalogueKeys(mode)} minutes={3} language="en" blockedKey={null} onGoLive={vi.fn()} t={t} />);
  return mode;
}

describe('<ClassroomModeSpotlight> cover art', () => {
  it('Given the art, Then it is the mode’s cube-mascot sticker centred whole on its colour panel, never a cropped or tilted poster', () => {
    const mode = setup('word-hunt');
    const art = screen.getByTestId('spotlight-art');
    const img = within(art).getByRole('presentation', { hidden: true });
    expect(img.getAttribute('src')).toBe(mode.sticker);
    expect(img.className).toContain('object-contain');
    expect(img.className).not.toMatch(/object-cover|rotate/);
    expect(img.getAttribute('style') ?? '').not.toMatch(/rotate/);
    expect(art.className).toMatch(/bg-neo-(cyan|pink|purple|yellow|orange)/);
  });

  it('Given a phone, Then the art is a fixed banner that never shrinks to a thumbnail, and from the wide lobby it fills the side', () => {
    setup();
    const art = screen.getByTestId('spotlight-art');
    expect(art.className).toMatch(/(^|\s)aspect-\[5\/2\](\s|$)/);
    expect(art.className).toContain('shrink-0');
    expect(art.className).toContain('@4xl/lobby:aspect-auto');
    expect(art.className).toContain('@4xl/lobby:flex-1');
    expect(art.className).not.toMatch(/(^|\s)min-h-24(\s|$)/);
  });

  it('Given the name, Then minutes and where it plays sit right under it', () => {
    setup();
    const facts = screen.getByTestId('spotlight-facts');
    expect(facts).toHaveTextContent('education.modePicker.minutes:{"count":3}');
    expect(within(facts).getByTestId('delivery-tag-both')).toHaveTextContent('eduShell.deliveryShort.both');
    expect(facts.className).toContain('group-has-[[data-lobby-expanded]]/lobby:hidden');
  });
});
