import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SurvivalHeader } from '../SurvivalHeader';

const t = (k: string) => k;

describe('global mute button clearance', () => {
  it('keeps the score clear of the mute button parked in the top end corner', () => {
    render(
      <SurvivalHeader liveScore={120} lastScoreIncrement={null} isScoreAnimating={false} onQuitClick={() => {}} t={t} />,
    );
    // 40px button + its inset from the edge: pe-12 (48px) let the rank pill touch it.
    expect(screen.getByTestId('survival-header').className).toMatch(/\bpe-14\b/);
  });

  it('lets the race standings shrink instead of spilling into the mute corner (quick play Hunt, phone)', () => {
    render(
      <SurvivalHeader
        liveScore={120}
        lastScoreIncrement={null}
        isScoreAnimating={false}
        onQuitClick={() => {}}
        practice
        rivals={[{ username: 'Gugu', score: 40 }]}
        selfUsername="You"
        t={t}
      />,
    );
    expect(screen.getByTestId('survival-rank-indicator').className).toMatch(/\bmin-w-0\b/);
    expect(screen.getByTestId('mobile-rival-chip').className).toMatch(/\bmin-w-0\b/);
  });
});
