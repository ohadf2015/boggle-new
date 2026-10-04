/**
 * The fresh home puts the daily Word Wheel banner and one grid race on the
 * first screen. Adventure, Word Tower and Blast remain reachable under More;
 * they must not return to the lead carousel as a spotlight pair.
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

describe('ModeRow (fresh) — modes moved under More', () => {
  beforeEach(() => {
    trackLandingCtaClick.mockClear();
    trackModeSelected.mockClear();
  });

  it('keeps one grid race in the lead row and parks Adventure, Word Tower and Blast under More', () => {
    const { container } = render(<ModeRow />);
    const section = container.querySelector('[data-fresh-section="modes"]')!;
    const lead = section.querySelector('ul')!;
    const more = section.querySelector('[data-testid="fresh-modes-more"]')!;

    expect([...lead.querySelectorAll('a[data-mode]')].map((a) => a.getAttribute('href'))).toEqual(['/en/multiplayer']);
    for (const mode of ['adventure', 'wordTowerV2', 'blast']) {
      const card = section.querySelector(`a[data-parked-mode="${mode}"]`);
      expect(card).not.toBeNull();
      expect(more.contains(card)).toBe(true);
      expect(lead.querySelector(`[data-mode="${mode}"]`)).toBeNull();
    }
  });

  it('does not render the old Adventure and Word Tower spotlight cards', () => {
    const { container } = render(<ModeRow />);
    const section = container.querySelector('[data-fresh-section="modes"]')!;
    expect(section.querySelectorAll('a[data-spotlight-mode]')).toHaveLength(0);
  });

  it('tracks clicks from both the lead race and a parked mode', () => {
    const { container } = render(<ModeRow />);
    const section = container.querySelector('[data-fresh-section="modes"]')!;

    fireEvent.click(section.querySelector('a[data-mode="arena"]')!);
    expect(trackModeSelected).toHaveBeenCalledWith('arena', 'home');
    expect(trackLandingCtaClick).toHaveBeenCalledWith('mode_card', expect.objectContaining({ mode: 'arena' }));

    trackLandingCtaClick.mockClear();
    trackModeSelected.mockClear();
    fireEvent.click(section.querySelector('a[data-parked-mode="adventure"]')!);
    expect(trackModeSelected).toHaveBeenCalledWith('adventure', 'home');
    expect(trackLandingCtaClick).toHaveBeenCalledWith('mode_card', expect.objectContaining({ mode: 'adventure' }));
  });
});
