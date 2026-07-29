/**
 * PracticeMascotReaction — small floating mascot in sandbox corner that
 * reacts to gameplay events. Reuses the per-mode mascot from the tutorial
 * sheet so the player keeps a consistent companion through intro → play.
 *
 * Audit ref: practice/onboarding audit 2026-05-03 §11 ("Mascot under-used
 * post-tutorial — vanishes during play").
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/image', () => ({
  __esModule: true,
  default: (p: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...p} />;
  },
}));

import PracticeMascotReaction from '../PracticeMascotReaction';

describe('PracticeMascotReaction', () => {
  it('renders the per-mode mascot (classic = scholar)', () => {
    render(<PracticeMascotReaction mode="classic" reaction="idle" />);
    const mascot = screen.getByTestId('practice-mascot-reaction');
    expect(mascot).toBeInTheDocument();
    const img = mascot.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/mascot/scholar.webp');
  });

  it('renders the wordHunt mascot (explorer)', () => {
    render(<PracticeMascotReaction mode="wordHunt" reaction="idle" />);
    const img = screen
      .getByTestId('practice-mascot-reaction')
      .querySelector('img');
    expect(img?.getAttribute('src')).toBe('/mascot/explorer.webp');
  });

  it('renders the wheelRush mascot (dj)', () => {
    render(<PracticeMascotReaction mode="wheelRush" reaction="idle" />);
    const img = screen
      .getByTestId('practice-mascot-reaction')
      .querySelector('img');
    expect(img?.getAttribute('src')).toBe('/mascot/dj.webp');
  });

  it('exposes the reaction state via data-reaction for testability', () => {
    const { rerender } = render(<PracticeMascotReaction mode="classic" reaction="idle" />);
    expect(screen.getByTestId('practice-mascot-reaction')).toHaveAttribute('data-reaction', 'idle');

    rerender(<PracticeMascotReaction mode="classic" reaction="cheer" />);
    expect(screen.getByTestId('practice-mascot-reaction')).toHaveAttribute('data-reaction', 'cheer');

    rerender(<PracticeMascotReaction mode="classic" reaction="wrong" />);
    expect(screen.getByTestId('practice-mascot-reaction')).toHaveAttribute('data-reaction', 'wrong');

    rerender(<PracticeMascotReaction mode="classic" reaction="celebrate" />);
    expect(screen.getByTestId('practice-mascot-reaction')).toHaveAttribute('data-reaction', 'celebrate');
  });

  it('aria-hidden so screen readers ignore the decorative companion', () => {
    render(<PracticeMascotReaction mode="classic" reaction="idle" />);
    expect(screen.getByTestId('practice-mascot-reaction')).toHaveAttribute('aria-hidden', 'true');
  });
});
