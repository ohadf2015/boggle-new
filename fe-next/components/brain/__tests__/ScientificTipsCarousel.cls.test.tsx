/**
 * ScientificTipsCarousel — layout-stability (CLS) guard.
 *
 * The carousel auto-rotates every 6s. Previously the slide content box used only
 * `min-h-[180px]`, so (a) the `mode="wait"` transition gap collapsed it to the
 * floor and (b) tips of differing length (Hebrew is longest) gave the box
 * different heights — both causing the rest of the Brain hub to jump on every
 * rotation (the "carousel width/layout changing" report).
 *
 * Contract: the slide content box has a FIXED height so its size never depends
 * on which tip is showing or whether one is mid-transition; longer copy scrolls
 * inside (`overflow-y-auto`) rather than reflowing the page.
 *
 * Reachability/visual stability isn't unit-testable in jsdom — this is a
 * source-contract regression guard.
 */
import React from 'react';
import { render } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, custom, variants, initial, animate, exit, transition, layoutId, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: any) => <span className={className} {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/utils/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

import ScientificTipsCarousel from '../ScientificTipsCarousel';

describe('ScientificTipsCarousel layout stability', () => {
  it('slide content box has a fixed height (no per-tip reflow)', () => {
    const { container } = render(<ScientificTipsCarousel />);
    const box = container.querySelector('.p-5.min-h-\\[180px\\]') as HTMLElement | null;
    expect(box).toBeInTheDocument();
    // Fixed height pins the box regardless of active tip / transition gap.
    expect(box!.className).toMatch(/\bh-\[\d+px\]/);
    // Longer copy scrolls inside instead of growing the page.
    expect(box!.className).toContain('overflow-y-auto');
    // x must be clipped: the slide animates `x:100→0` every 6s; without this the
    // computed overflow-x:auto flashes a horizontal scrollbar (the "width" bug).
    expect(box!.className).toContain('overflow-x-hidden');
  });
});
