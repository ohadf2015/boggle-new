/**
 * Shared bailout / play-for-real CTA used by all three practice sandboxes.
 *
 * Regression guard: before this component existed, classic + wheel sandboxes
 * rendered `practice.wordHunt.*` copy (a copy-paste bug) — so finishing
 * Classic told you to "Play Word Hunt now". Each mode must resolve its OWN key.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

import PracticeBailoutCta from '../PracticeBailoutCta';

describe('PracticeBailoutCta', () => {
  it('renders the mode-correct bailout key when not yet done', () => {
    render(<PracticeBailoutCta mode="classic" done={false} href="/en/singleplayer?practice=1" />);
    const cta = screen.getByTestId('practice-bailout-cta');
    expect(cta).toHaveTextContent('practice.classic.bailoutCta');
  });

  it('renders the mode-correct play-for-real key when done — classic (regression)', () => {
    render(<PracticeBailoutCta mode="classic" done href="/en/singleplayer?practice=1" />);
    const cta = screen.getByTestId('practice-bailout-cta');
    expect(cta).toHaveTextContent('practice.classic.playRealCta');
    // The old bug rendered the wordHunt key on the classic screen.
    expect(cta).not.toHaveTextContent('practice.wordHunt');
  });

  it('renders the mode-correct play-for-real key when done — wheelRush (regression)', () => {
    render(<PracticeBailoutCta mode="wheelRush" done href="/en/daily/word-wheel?practice=1" />);
    const cta = screen.getByTestId('practice-bailout-cta');
    expect(cta).toHaveTextContent('practice.wheelRush.playRealCta');
    expect(cta).not.toHaveTextContent('practice.wordHunt');
  });

  it('resolves wordHunt keys for wordHunt', () => {
    const { rerender } = render(
      <PracticeBailoutCta mode="wordHunt" done={false} href="/en/daily/word-hunt?practice=1" />,
    );
    expect(screen.getByTestId('practice-bailout-cta')).toHaveTextContent('practice.wordHunt.bailoutCta');
    rerender(<PracticeBailoutCta mode="wordHunt" done href="/en/daily/word-hunt?practice=1" />);
    expect(screen.getByTestId('practice-bailout-cta')).toHaveTextContent('practice.wordHunt.playRealCta');
  });

  it('links to the provided real-game href', () => {
    render(<PracticeBailoutCta mode="classic" done={false} href="/en/singleplayer?practice=1" />);
    expect(screen.getByTestId('practice-bailout-cta')).toHaveAttribute(
      'href',
      '/en/singleplayer?practice=1',
    );
  });

  it('is visually quiet — no saturated pink fill / heavy border (it is an escape, not the hero)', () => {
    render(<PracticeBailoutCta mode="classic" done={false} href="/en/singleplayer?practice=1" />);
    const cta = screen.getByTestId('practice-bailout-cta');
    expect(cta.className).not.toMatch(/bg-neo-pink/);
    expect(cta.className).not.toMatch(/border-3/);
  });
});
