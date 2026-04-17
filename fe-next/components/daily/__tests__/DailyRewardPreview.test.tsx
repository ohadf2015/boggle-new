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
    'daily.todayReward': "Today's reward: {{coins}} coins",
    'daily.tomorrowReward': 'Tomorrow: {{coins}} coins',
    'daily.nearMilestone': '{{days}} more days to {{badge}}!',
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
  it('renders today reward for streak day 1', () => {
    render(<DailyRewardPreview currentStreakDay={1} t={mockT} />);
    expect(screen.getByText(/10 coins/)).toBeInTheDocument();
  });

  it('renders tomorrow reward', () => {
    render(<DailyRewardPreview currentStreakDay={1} t={mockT} />);
    expect(screen.getByText(/15 coins/)).toBeInTheDocument();
  });

  it('shows milestone proximity when near a badge milestone', () => {
    // Day 5, next badge milestone is day 7 (weekly_warrior) = 2 days away
    render(<DailyRewardPreview currentStreakDay={5} t={mockT} />);
    expect(screen.getByText(/2 more days/)).toBeInTheDocument();
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
