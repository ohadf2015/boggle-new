import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { DailyBlock } from '../DailyBlock';
import { weekStrip } from '@/lib/daily/streakRewards';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k), language: 'en', dir: 'ltr' }),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

vi.mock('next/dynamic', () => ({ default: () => () => null }));

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${Object.values(p).join(',')}` : k);
const TODAY = '2026-11-12';
const week = weekStrip(['2026-11-10', '2026-11-11'], [], TODAY);
const next = { days: 3, coins: 25, remaining: 1, from: 0 };

describe('DailyBlock streak', () => {
  it('draws the tiered flame for the streak, not a static picture', () => {
    render(<DailyBlock lang="en" t={t} streak={9} streakLoading={false} />);
    expect(within(screen.getByTestId('hp-daily')).getAllByTestId('streak-flame')[0]).toHaveAttribute('data-tier', 'blue');
  });

  it('Given the streak is at risk, warns to play today to keep it', () => {
    render(<DailyBlock lang="en" t={t} streak={2} streakLoading={false} atRisk week={week} next={next} />);
    expect(screen.getByTestId('streak-at-risk')).toHaveTextContent('dailyStreak.flame.atRisk:2');
  });

  it('shows this week and the next reward as a visible goal', () => {
    render(<DailyBlock lang="en" t={t} streak={2} streakLoading={false} week={week} next={next} />);
    expect(within(screen.getByTestId('streak-week')).getAllByTestId('streak-week-day')).toHaveLength(7);
    expect(screen.getByTestId('hp-daily-next-reward')).toHaveTextContent('dailyStreak.flame.heroNext:1,3,25');
  });

  it('hides risk and goal while the streak is loading', () => {
    render(<DailyBlock lang="en" t={t} streak={2} streakLoading atRisk week={week} next={next} />);
    expect(screen.queryByTestId('streak-at-risk')).toBeNull();
    expect(screen.queryByTestId('hp-daily-next-reward')).toBeNull();
  });

  it('opens the freeze shop from the freeze count', () => {
    render(<DailyBlock lang="en" t={t} streak={2} streakLoading={false} freezes={1} week={week} />);
    fireEvent.click(screen.getByTestId('hp-daily-freezes'));
    expect(screen.getByTestId('streak-freeze-sheet')).toBeInTheDocument();
  });
});
