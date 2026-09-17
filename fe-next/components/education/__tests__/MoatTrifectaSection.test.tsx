import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MoatTrifectaSection } from '../MoatTrifectaSection';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

vi.mock('@/lib/animation/useGsapReveal', () => ({
  useGsapReveal: () => ({ current: null }),
}));

// The 3 "moat" pillars used to be a textbook equal-triad: same size, same
// layout, no emphasis — a landing-checklist anti-pattern. The first pillar
// (native multilingual, the strongest differentiator) now gets a visual lead
// via a grid span rather than sitting identical to its two siblings.
describe('MoatTrifectaSection', () => {
  it('renders all three pillars', () => {
    render(<MoatTrifectaSection />);
    expect(screen.getByText('education.landing.moat.native_multilingual.title')).toBeInTheDocument();
    expect(screen.getByText('education.landing.moat.local_inventory.title')).toBeInTheDocument();
    expect(screen.getByText('education.landing.moat.ad_free.title')).toBeInTheDocument();
  });

  it('gives the first pillar a grid-span lead treatment the other two do not have', () => {
    render(<MoatTrifectaSection />);
    const leadTitle = screen.getByText('education.landing.moat.native_multilingual.title');
    const secondTitle = screen.getByText('education.landing.moat.local_inventory.title');
    const leadCard = leadTitle.closest('article');
    const secondCard = secondTitle.closest('article');
    expect(leadCard).not.toBeNull();
    expect(secondCard).not.toBeNull();
    // Lead card spans rows (or columns) — the siblings don't.
    expect(leadCard!.className).toMatch(/row-span-2|col-span-2/);
    expect(secondCard!.className).not.toMatch(/row-span-2|col-span-2/);
    // And the two className strings must actually differ — not just coincidentally equal.
    expect(leadCard!.className).not.toBe(secondCard!.className);
  });
});
