/**
 * DrillEarningsBreakdown tests.
 *
 * The results card must always feel earned: an always-colored badge (bronze is
 * still a win — never gray), the big forgiving displayScore, a warm badge title
 * (never "Game Over"), and a transparent breakdown of where the points came
 * from (showing up + performance + bonus).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/motion/AdaptiveMotion', () => {
  const passthrough = (tag: string) =>
    function MockMotion({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {
      return React.createElement(tag, props as Record<string, unknown>, children);
    };
  return {
    AdaptiveMotion: { div: passthrough('div'), span: passthrough('span'), h2: passthrough('h2'), p: passthrough('p') },
  };
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

import DrillEarningsBreakdown from '../DrillEarningsBreakdown';

describe('DrillEarningsBreakdown', () => {
  it('shows the forgiving display score big', () => {
    render(
      <DrillEarningsBreakdown drillId="lightning-round" badge="silver" displayScore={142} participation={21} performance={121} />
    );
    expect(screen.getByText('142')).toBeInTheDocument();
  });

  it('uses a warm, badge-based title — never "Game Over"', () => {
    render(
      <DrillEarningsBreakdown drillId="memory-hunt" badge="bronze" displayScore={30} participation={21} performance={9} />
    );
    expect(screen.getByText('brain.drills.badge.bronze.title')).toBeInTheDocument();
    expect(screen.queryByText(/game over/i)).not.toBeInTheDocument();
  });

  it('always names a colored badge even on the weakest session (bronze is a win)', () => {
    render(
      <DrillEarningsBreakdown drillId="combo-master" badge="bronze" displayScore={27} participation={21} performance={6} />
    );
    expect(screen.getByText('brain.drills.badge.bronze.name')).toBeInTheDocument();
  });

  it('breaks down participation and performance transparently', () => {
    render(
      <DrillEarningsBreakdown drillId="rare-gems" badge="gold" displayScore={200} participation={21} performance={179} />
    );
    expect(screen.getByText('brain.briefing.participationLabel')).toBeInTheDocument();
    expect(screen.getByText('brain.briefing.performanceLabel')).toBeInTheDocument();
    expect(screen.getByText('+21')).toBeInTheDocument();
    expect(screen.getByText('+179')).toBeInTheDocument();
  });

  it('shows a bonus row only when a bonus is present', () => {
    const { rerender } = render(
      <DrillEarningsBreakdown drillId="rare-gems" badge="gold" displayScore={200} participation={21} performance={179} bonus={0} />
    );
    expect(screen.queryByText('brain.briefing.bonusLabel')).not.toBeInTheDocument();

    rerender(
      <DrillEarningsBreakdown drillId="rare-gems" badge="platinum" displayScore={250} participation={21} performance={179} bonus={50} />
    );
    expect(screen.getByText('brain.briefing.bonusLabel')).toBeInTheDocument();
    expect(screen.getByText('+50')).toBeInTheDocument();
  });
});
