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
    expect(screen.getByTestId('survival-header').className).toMatch(/\bpe-12\b/);
  });
});
