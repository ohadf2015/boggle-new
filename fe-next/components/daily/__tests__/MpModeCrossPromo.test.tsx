/**
 * MpModeCrossPromo tests
 *
 * Cross-promotion from the Daily Challenge results to the live multiplayer
 * versions of Word Wheel (Wheel Rush) and Word Hunt. Verifies routing targets
 * and PostHog instrumentation (impression on mount + click per card).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MpModeCrossPromo from '../MpModeCrossPromo';

const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEvent(...args),
}));

// next/link → plain anchor for assertion (className passed through so we can
// assert the calm secondary styling).
vi.mock('next/link', () => ({
  default: ({ href, children, onClick, className }: { href: string; children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <a href={href} onClick={onClick} className={className}>{children}</a>
  ),
}));

// framer-motion → passthrough.
vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: () => (p: Record<string, unknown>) => <div>{p.children as React.ReactNode}</div> }),
}));

const t = (_k: string, fb?: string) => fb ?? _k;

describe('MpModeCrossPromo', () => {
  beforeEach(() => trackGrowthEvent.mockClear());

  it('links Wheel Rush + Word Hunt to the multiplayer routes with the mode param', () => {
    render(<MpModeCrossPromo language="en" source="word_wheel_results" t={t} />);
    const hrefs = screen.getAllByRole('link').map(a => a.getAttribute('href'));
    expect(hrefs).toContain('/en/multiplayer?mode=wheel-rush');
    expect(hrefs).toContain('/en/multiplayer?mode=word-hunt');
  });

  it('honors the player locale in the route', () => {
    render(<MpModeCrossPromo language="he" source="word_hunt_results" t={t} />);
    const hrefs = screen.getAllByRole('link').map(a => a.getAttribute('href'));
    expect(hrefs).toContain('/he/multiplayer?mode=wheel-rush');
  });

  it('fires a cross_promo_impression for each mode on mount', () => {
    render(<MpModeCrossPromo language="en" source="word_wheel_results" t={t} />);
    const impressions = trackGrowthEvent.mock.calls.filter(c => c[0] === 'cross_promo_impression');
    const targets = impressions.map(c => (c[1] as { target: string }).target);
    expect(targets).toEqual(expect.arrayContaining(['wheel_rush_mp', 'word_hunt_mp']));
    impressions.forEach(c => expect((c[1] as { source: string }).source).toBe('word_wheel_results'));
  });

  it('groups the two live modes in a compact 2-column grid', () => {
    render(<MpModeCrossPromo language="en" source="word_wheel_results" t={t} />);
    const grid = screen.getByTestId('mp-live-grid');
    expect(grid.className).toMatch(/grid-cols-2/);
  });

  it('uses calm secondary styling — no saturated full-fill or heavy shadow', () => {
    render(<MpModeCrossPromo language="en" source="word_wheel_results" t={t} />);
    for (const link of screen.getAllByRole('link')) {
      const cls = link.className;
      expect(cls).toContain('bg-neo-navy-light');
      expect(cls).not.toMatch(/bg-neo-(purple|lime|cyan)\b/);
      expect(cls).not.toContain('shadow-hard-lg');
    }
  });

  it('fires cross_promo_click with the target + source when a card is tapped', () => {
    render(<MpModeCrossPromo language="en" source="word_wheel_results" t={t} />);
    const wheelLink = screen.getAllByRole('link')
      .find(a => a.getAttribute('href') === '/en/multiplayer?mode=wheel-rush')!;
    fireEvent.click(wheelLink);
    const clicks = trackGrowthEvent.mock.calls.filter(c => c[0] === 'cross_promo_click');
    expect(clicks).toHaveLength(1);
    expect(clicks[0][1]).toMatchObject({
      target: 'wheel_rush_mp',
      source: 'word_wheel_results',
      language: 'en',
    });
  });
});
