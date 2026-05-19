/**
 * Tests for SurvivalLifeBar — focused on the low-life encouragement tooltip.
 *
 * The bar is shared by daily Survival (single-player) and Word Hunt MP. The
 * tooltip text is mirrored into the progressbar's `aria-label` so it is both
 * screen-reader accessible AND assertable in jsdom (Radix tooltip content only
 * mounts on open, but the trigger — our progressbar — always renders).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { SurvivalLifeBar } from '../SurvivalLifeBar';

describe('SurvivalLifeBar — low-life encouragement tooltip', () => {
  const baseProps = {
    isGameOver: false,
    isLifeGaining: false,
    lifeGainAmount: null,
    skipAnimations: true,
    onLifeGainComplete: () => {},
  };

  const LABEL = 'Life bar';
  const HINT = 'Low on life! Find words on the board to restore it.';

  it('labels the bar with the neutral label when life is healthy', () => {
    render(<SurvivalLifeBar {...baseProps} lifePoints={80} label={LABEL} lowLifeHint={HINT} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', LABEL);
  });

  it('labels the bar with the encouragement hint when life is in the danger tier (<=33)', () => {
    render(<SurvivalLifeBar {...baseProps} lifePoints={15} label={LABEL} lowLifeHint={HINT} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', HINT);
  });

  it('treats exactly 33 as low (danger tier boundary is inclusive)', () => {
    render(<SurvivalLifeBar {...baseProps} lifePoints={33} label={LABEL} lowLifeHint={HINT} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', HINT);
  });

  it('treats 34 as not low (just above the danger tier)', () => {
    render(<SurvivalLifeBar {...baseProps} lifePoints={34} label={LABEL} lowLifeHint={HINT} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', LABEL);
  });

  it('does NOT nag with the hint once the game is over, even at low life', () => {
    render(<SurvivalLifeBar {...baseProps} isGameOver lifePoints={5} label={LABEL} lowLifeHint={HINT} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', LABEL);
  });

  it('stays backward-compatible: no label/hint props => no aria-label (survival callers unchanged)', () => {
    render(<SurvivalLifeBar {...baseProps} lifePoints={50} />);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-label');
  });
});
