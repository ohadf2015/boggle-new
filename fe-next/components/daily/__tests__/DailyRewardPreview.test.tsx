import React from 'react';
import { render, screen } from '@testing-library/react';
import { DailyRewardPreview } from '../DailyRewardPreview';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
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

  it('shows milestone proximity when near a badge milestone', () => {
    // Day 5, next badge milestone is day 7 (weekly_warrior) = 2 days away
    render(<DailyRewardPreview currentStreakDay={5} t={mockT} />);
    expect(screen.getByText(/2 days to Week Warrior/)).toBeInTheDocument();
  });

  it('uses singular "1 day" copy when daysAway is 1 (streak 6 → week warrior)', () => {
    render(<DailyRewardPreview currentStreakDay={6} t={mockT} />);
    expect(screen.getByText(/1 day to Week Warrior badge!/)).toBeInTheDocument();
    expect(screen.queryByText(/1 days/)).not.toBeInTheDocument();
  });

  it('shows celebration banner instead of "X days to next" when streak day equals a badge milestone', () => {
    // Streak 7 = Week Warrior just earned
    render(<DailyRewardPreview currentStreakDay={7} t={mockT} />);
    expect(screen.getByText(/Week Warrior unlocked/)).toBeInTheDocument();
    expect(screen.queryByText(/days to Fortnight Fighter/)).not.toBeInTheDocument();
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
    expect(screen.getByText(/Week Warrior/)).toBeInTheDocument();
    expect(screen.queryByText(/weekWarrior/)).not.toBeInTheDocument();
  });

  it('renders timeline dots for upcoming days', () => {
    render(<DailyRewardPreview currentStreakDay={1} t={mockT} />);
    const timeline = screen.getByTestId('reward-timeline');
    expect(timeline).toBeInTheDocument();
  });
});
