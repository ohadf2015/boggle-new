import React from 'react';
import { render, screen } from '@testing-library/react';
import { DailyRewardPreview } from '../DailyRewardPreview';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef(function MockMotionDiv({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) {
      return <div ref={ref} {...props}>{children}</div>;
    }),
    span: React.forwardRef(function MockMotionSpan({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLSpanElement>) {
      return <span ref={ref} {...props}>{children}</span>;
    }),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const mockT = (key: string, params?: Record<string, string | number>) => {
  const translations: Record<string, string> = {
    'daily.today': 'TODAY',
    'daily.nearMilestone': '{{days}} days to {{badge}} badge!',
    'daily.nearMilestoneOne': '1 day to {{badge}} badge!',
    'daily.milestoneEarned': '🎉 {{badge}} unlocked!',
    'daily.rewardDay': 'Day {{day}}',
    'daily.badges.weekWarrior': 'Week Warrior',
    'daily.badges.fortnightFighter': 'Fortnight Fighter',
    'daily.badges.monthlyMaster': 'Monthly Master',
    'daily.badges.centurion': 'Centurion',
  };
  let result = translations[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(`{{${k}}}`, String(v));
      result = result.replace(`{${k}}`, String(v));
    }
  }
  return result;
};

describe('DailyRewardPreview', () => {
  it("renders today's reward dot for streak day 1", () => {
    render(<DailyRewardPreview currentStreakDay={1} t={mockT} />);
    const timeline = screen.getByTestId('reward-timeline');
    expect(timeline).toHaveTextContent('10');
    expect(timeline).toHaveTextContent('TODAY');
  });

  it("renders tomorrow's reward dot", () => {
    render(<DailyRewardPreview currentStreakDay={1} t={mockT} />);
    const timeline = screen.getByTestId('reward-timeline');
    expect(timeline).toHaveTextContent('15');
  });

  it('shows milestone proximity pointing at fortnight_fighter (week_warrior badge retired)', () => {
    // Day 5: next badge milestone is now day 14 (fortnight_fighter) = 9 days away.
    // The day-7 weekly_warrior badge was retired because the weekly chest now owns
    // the 7-day milestone reward.
    render(<DailyRewardPreview currentStreakDay={5} t={mockT} />);
    expect(screen.getByText(/9 days to Fortnight Fighter/)).toBeInTheDocument();
  });

  it('uses singular "1 day" copy when daysAway is 1 (streak 13 → fortnight fighter)', () => {
    render(<DailyRewardPreview currentStreakDay={13} t={mockT} />);
    expect(screen.getByText(/1 day to Fortnight Fighter badge!/)).toBeInTheDocument();
    expect(screen.queryByText(/1 days/)).not.toBeInTheDocument();
  });

  it('does NOT show a celebration banner on day 7 (chest replaces the warrior badge)', () => {
    render(<DailyRewardPreview currentStreakDay={7} t={mockT} />);
    expect(screen.queryByText(/Week Warrior unlocked/)).not.toBeInTheDocument();
    // Day 7 now points at the next *badge* milestone (fortnight, 7 days away).
    expect(screen.getByText(/7 days to Fortnight Fighter badge!/)).toBeInTheDocument();
  });

  it('shows celebration for centurion milestone (day 100)', () => {
    render(<DailyRewardPreview currentStreakDay={100} t={mockT} />);
    expect(screen.getByText(/Centurion unlocked/)).toBeInTheDocument();
  });

  it('skips veteran (day 50, no badge) and points to Centurion', () => {
    render(<DailyRewardPreview currentStreakDay={50} t={mockT} />);
    // 100 - 50 = 50 days to centurion
    expect(screen.getByText(/50 days to Centurion/)).toBeInTheDocument();
  });

  it('translates the badge label (not raw key) in milestone proximity', () => {
    render(<DailyRewardPreview currentStreakDay={5} t={mockT} />);
    expect(screen.getByText(/Fortnight Fighter/)).toBeInTheDocument();
    expect(screen.queryByText(/fortnightFighter/)).not.toBeInTheDocument();
  });

  it('renders timeline dots for upcoming days', () => {
    render(<DailyRewardPreview currentStreakDay={1} t={mockT} />);
    const timeline = screen.getByTestId('reward-timeline');
    expect(timeline).toBeInTheDocument();
  });
});
