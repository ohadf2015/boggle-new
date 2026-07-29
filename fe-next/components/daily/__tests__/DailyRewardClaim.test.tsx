import React from 'react';
import { render, screen } from '@testing-library/react';
import { DailyRewardClaim } from '../DailyRewardClaim';

jest.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef(function MockMotionDiv({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) {
      return <div ref={ref} {...props}>{children}</div>;
    }),
    span: React.forwardRef(function MockMotionSpan({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLSpanElement>) {
      return <span ref={ref} {...props}>{children}</span>;
    }),
    p: React.forwardRef(function MockMotionP({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLParagraphElement>) {
      return <p ref={ref} {...props}>{children}</p>;
    }),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'daily.rewardClaimed': 'You earned {{coins}} coins!',
    'daily.milestoneReached': '{{badge}} unlocked!',
    'daily.comeBackTomorrow': 'Come back tomorrow for {{coins}} coins!',
  };
  return translations[key] || key;
};

describe('DailyRewardClaim', () => {
  it('displays the earned coin amount', () => {
    render(
      <DailyRewardClaim
        coinsEarned={50}
        currentStreakDay={5}
        t={mockT}
      />
    );
    expect(screen.getByText(/50 coins/)).toBeInTheDocument();
  });

  it('shows milestone badge when earned', () => {
    render(
      <DailyRewardClaim
        coinsEarned={100}
        currentStreakDay={7}
        badge="weekly_warrior"
        t={mockT}
      />
    );
    expect(screen.getByText(/weekly_warrior unlocked/)).toBeInTheDocument();
  });

  it('does not show badge text when no badge', () => {
    render(
      <DailyRewardClaim
        coinsEarned={25}
        currentStreakDay={3}
        t={mockT}
      />
    );
    expect(screen.queryByText(/unlocked/)).not.toBeInTheDocument();
  });

  it('shows come back tomorrow message with next day coins', () => {
    render(
      <DailyRewardClaim
        coinsEarned={10}
        currentStreakDay={1}
        t={mockT}
      />
    );
    // Tomorrow is day 2 = 15 coins
    expect(screen.getByText(/15 coins/)).toBeInTheDocument();
  });
});
