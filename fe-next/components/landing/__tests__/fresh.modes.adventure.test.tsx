/**
 * Test: the new modes (Adventure, Word Tower) are featured to guests as a
 * spotlight pair at the top of the "Pick your game" section — key art + NEW
 * sticker — not as two more carousel cards with a tiny badge.
 *
 * Regression: adventure.playCount = 0 on the server, so it never appears in a
 * popularity-ranked list. The fresh page must surface it unconditionally.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackLandingCtaClick: vi.fn(),
  trackModeSelected: vi.fn(),
  trackGrowthEvent: (...a: unknown[]) => trackGrowthEvent(...a),
}));

import { ModeRow } from '../fresh/ModeRow';

describe('ModeRow (fresh) — new modes spotlight for guests', () => {
  it('Given the modes section, then the spotlight leads it: Adventure first, Word Tower second', () => {
    const { container } = render(<ModeRow />);
    const section = container.querySelector('[data-fresh-section="modes"]')!;
    const spots = [...section.querySelectorAll('a[data-spotlight-mode]')];
    expect(spots.map((a) => a.getAttribute('href'))).toEqual(['/en/adventure', '/en/word-tower']);
    const firstCarouselCard = section.querySelector('li a');
    expect(spots[0].compareDocumentPosition(firstCarouselCard!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Given the carousel, then no card repeats a spotlight mode or carries a badge', () => {
    const { container } = render(<ModeRow />);
    const hrefs = [...container.querySelectorAll('li a')].map((a) => a.getAttribute('href'));
    expect(hrefs).not.toContain('/en/adventure');
    expect(hrefs).not.toContain('/en/word-tower');
    expect(container.querySelector('li [data-testid="mode-badge"]')).toBeNull();
  });

  it('given a guest taps a featured mode, then featured_mode_card_clicked fires with surface fresh (and not for carousel cards)', () => {
    trackGrowthEvent.mockClear();
    const { container } = render(<ModeRow />);
    fireEvent.click(container.querySelector('a[data-spotlight-mode="adventure"]')!);
    expect(trackGrowthEvent).toHaveBeenCalledWith('featured_mode_card_clicked', { mode: 'adventure', surface: 'fresh' });

    trackGrowthEvent.mockClear();
    fireEvent.click(container.querySelector('li a')!);
    expect(trackGrowthEvent).not.toHaveBeenCalledWith('featured_mode_card_clicked', expect.anything());
  });
});
