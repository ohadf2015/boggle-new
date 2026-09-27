/**
 * TopBackLink — drop-in client back affordance for pages (incl. server pages).
 * Wraps the design-system BackButton and wires it to useBackOneLevel.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const goBackSpy = vi.fn();
vi.mock('@/hooks/useBackOneLevel', () => ({
  useBackOneLevel: (parent?: string) => {
    // expose the parent arg for assertion
    (goBackSpy as unknown as { lastParent?: string }).lastParent = parent;
    return goBackSpy;
  },
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

import { TopBackLink } from '../TopBackLink';

describe('TopBackLink', () => {
  beforeEach(() => goBackSpy.mockReset());

  it('renders a back button using the common.back label by default', () => {
    render(<TopBackLink />);
    expect(screen.getByRole('button', { name: /common\.back/i })).toBeInTheDocument();
  });

  it('invokes the one-level-up navigation on click', () => {
    render(<TopBackLink />);
    fireEvent.click(screen.getByRole('button', { name: /common\.back/i }));
    expect(goBackSpy).toHaveBeenCalledTimes(1);
  });

  it('passes an explicit parent through to useBackOneLevel', () => {
    render(<TopBackLink parent="/en/education" />);
    expect((goBackSpy as unknown as { lastParent?: string }).lastParent).toBe('/en/education');
  });

  it('renders a custom label when provided', () => {
    render(<TopBackLink label="Back to hub" />);
    expect(screen.getByRole('button', { name: 'Back to hub' })).toBeInTheDocument();
  });
});
