import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SurvivalHeader } from '../SurvivalHeader';

const t = (k: string) => k;

describe('SurvivalHeader centre slot', () => {
  it('Given a centre node, when the header renders, then it sits inside the header between quit and score', () => {
    render(
      <SurvivalHeader
        liveScore={120}
        lastScoreIncrement={null}
        isScoreAnimating={false}
        onQuitClick={() => {}}
        center={<div data-testid="hud-centre" />}
        t={t}
      />,
    );
    const header = screen.getByTestId('survival-header');
    expect(within(header).getByTestId('hud-centre')).toBeInTheDocument();
    const order = [...header.querySelectorAll('button, [data-testid=hud-centre]')].map((n) => n.getAttribute('data-testid') ?? n.tagName);
    expect(order.indexOf('hud-centre')).toBeGreaterThan(0);
  });

  it('Given no centre node, when the header renders, then no centre wrapper is added', () => {
    render(<SurvivalHeader liveScore={0} lastScoreIncrement={null} isScoreAnimating={false} onQuitClick={() => {}} t={t} />);
    expect(screen.queryByTestId('survival-header-center')).toBeNull();
  });
});
