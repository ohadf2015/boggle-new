/**
 * Test: ModeRow carousel has visible swipe affordance.
 *
 * Mobile users see a peek (next card visible at edge) via auto-cols-[74%] on
 * mobile, which signals the row is scrollable. No soft gradients (brand
 * anti-reference). Cards are snap-aligned.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

const lang = { language: 'en', dir: 'ltr' as 'ltr' | 'rtl' };
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: lang.language, dir: lang.dir }),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackLandingCtaClick: vi.fn(),
  trackModeSelected: vi.fn(),
}));

import { ModeRow } from '../fresh/ModeRow';

describe('ModeRow (fresh) — swipe affordance', () => {
  it('carousel has overflow-x-auto (scrollable)', () => {
    const { container } = render(<ModeRow />);
    const ul = container.querySelector('[data-fresh-section="modes"] ul');
    expect(ul?.className).toMatch(/\boverflow-x-auto\b/);
  });

  it('carousel has snap-x and snap-mandatory for scroll-snap behavior', () => {
    const { container } = render(<ModeRow />);
    const ul = container.querySelector('[data-fresh-section="modes"] ul');
    expect(ul?.className).toMatch(/\bsnap-x\b/);
    expect(ul?.className).toMatch(/\bsnap-mandatory\b/);
  });

  it('each card has snap-start for alignment', () => {
    const { container } = render(<ModeRow />);
    const items = container.querySelectorAll('[data-fresh-section="modes"] li');
    expect(items.length).toBeGreaterThan(0);
    for (const li of items) {
      expect(li.className).toMatch(/\bsnap-start\b/);
    }
  });

  it('uses auto-cols-[74%] on mobile to create visible peek', () => {
    const { container } = render(<ModeRow />);
    const ul = container.querySelector('[data-fresh-section="modes"] ul');
    // auto-cols-[74%] means 74% of viewport, so 26% of the next card peeks
    expect(ul?.className).toMatch(/auto-cols-\[74%\]/);
  });

  it('does not use soft gradient fade (no bg-gradient-to-r)', () => {
    const { container } = render(<ModeRow />);
    // Soft gradients are an anti-reference; we use scroll-snap peek instead
    expect(container.innerHTML).not.toMatch(/bg-gradient-to-[lr]/);
  });
});
