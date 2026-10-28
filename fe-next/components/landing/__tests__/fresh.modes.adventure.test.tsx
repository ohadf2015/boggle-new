/**
 * Adventure, Word Tower and Blast are ordinary cards in the fresh mode row,
 * not a spotlight pair and not links in a collapsed list.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
const trackLandingCtaClick = vi.fn();
const trackModeSelected = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackLandingCtaClick: (...a: unknown[]) => trackLandingCtaClick(...a),
  trackModeSelected: (...a: unknown[]) => trackModeSelected(...a),
}));

import { ModeRow } from '../fresh/ModeRow';

describe('ModeRow (fresh) — every mode is a card', () => {
  beforeEach(() => {
    trackLandingCtaClick.mockClear();
    trackModeSelected.mockClear();
  });

  it('features Blast above a row led by the grid race, with Adventure and Word Tower as cards', () => {
    const { container } = render(<ModeRow />);
    const lead = container.querySelector('[data-fresh-section="modes"] ul')!;
    const modes = [...lead.querySelectorAll<HTMLAnchorElement>('a[data-mode]')].map((a) => a.dataset.mode);
    expect(modes[0]).toBe('arena');
    for (const mode of ['adventure', 'wordTowerV2']) expect(modes).toContain(mode);
    expect(container.querySelector('a[data-featured="true"]')?.getAttribute('data-mode')).toBe('blast');
  });

  it('does not render the old Adventure and Word Tower spotlight cards', () => {
    const { container } = render(<ModeRow />);
    const section = container.querySelector('[data-fresh-section="modes"]')!;
    expect(section.querySelectorAll('a[data-spotlight-mode]')).toHaveLength(0);
  });

  it('tracks clicks from the lead race and a later card', () => {
    const { container } = render(<ModeRow />);
    const section = container.querySelector('[data-fresh-section="modes"]')!;

    fireEvent.click(section.querySelector('a[data-mode="arena"]')!);
    expect(trackModeSelected).toHaveBeenCalledWith('arena', 'home');
    expect(trackLandingCtaClick).toHaveBeenCalledWith('mode_card', expect.objectContaining({ mode: 'arena' }));

    trackLandingCtaClick.mockClear();
    trackModeSelected.mockClear();
    fireEvent.click(section.querySelector('a[data-mode="adventure"]')!);
    expect(trackModeSelected).toHaveBeenCalledWith('adventure', 'home');
    expect(trackLandingCtaClick).toHaveBeenCalledWith('mode_card', expect.objectContaining({ mode: 'adventure' }));
  });
});
