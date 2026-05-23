/**
 * WordFormingArea — letter-count badge clarity.
 *
 * The small count badge next to the forming word reads as a Scrabble-style
 * point value when the word is a single letter (e.g. "A 1" looks like "A = 1pt").
 * A 1-letter word is never submittable (MIN_WORD_LENGTH is 2), so the badge is
 * pure noise there. It should only appear once the word reaches the minimum
 * submittable length — at which point its growth makes the "letter count"
 * meaning self-evident.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// framer-motion → plain elements; strip motion-only props so the DOM stays clean.
vi.mock('framer-motion', () => {
  const FRAMER_ONLY = new Set([
    'initial', 'animate', 'exit', 'transition', 'layout', 'layoutId',
    'whileHover', 'whileTap', 'whileInView', 'variants', 'custom',
  ]);
  const makeMotion = () =>
    function MockMotion({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>) {
      const domProps: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) if (!FRAMER_ONLY.has(k)) domProps[k] = v;
      return <span {...domProps}>{children}</span>;
    };
  return {
    m: new Proxy({} as Record<string, unknown>, { get: () => makeMotion() }),
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/Avatar', () => ({ default: () => null }));

import WordFormingArea from '../WordFormingArea';

describe('WordFormingArea letter-count badge', () => {
  it('hides the count badge while forming a single, unsubmittable letter', () => {
    render(<WordFormingArea word="A" letterCount={1} feedback={null} />);
    // The lone letter still renders...
    expect(screen.getByText('A')).toBeInTheDocument();
    // ...but the "1" count badge must not — it reads as a point value.
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('shows the count badge once the word reaches the minimum submittable length', () => {
    render(<WordFormingArea word="AT" letterCount={2} feedback={null} />);
    expect(screen.getByText('AT')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});

describe('WordFormingArea post-submit clearing', () => {
  it('clears the word from the display once the player stops forming it (after submit)', () => {
    const { rerender } = render(<WordFormingArea word="CAT" letterCount={3} feedback={null} />);
    expect(screen.getByText('CAT')).toBeInTheDocument();

    // Word submitted → trace path reset → word becomes empty, no active feedback.
    rerender(<WordFormingArea word="" letterCount={0} feedback={null} />);

    // The submitted word must not linger; the area returns to its empty state.
    expect(screen.queryByText('CAT')).not.toBeInTheDocument();
  });
});
