import { render, screen } from '@testing-library/react';
import { StreakMilestoneCelebration } from '../StreakMilestoneCelebration';

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children as React.ReactNode}</div>,
    span: ({ children, ...props }: Record<string, unknown>) => <span {...props}>{children as React.ReactNode}</span>,
  },
}));

const mockT = (key: string, params?: Record<string, string | number>) => {
  if (params) return `${key}:${JSON.stringify(params)}`;
  return key;
};

describe('StreakMilestoneCelebration', () => {
  it('renders nothing when milestone is null', () => {
    const { container } = render(
      <StreakMilestoneCelebration milestone={null} t={mockT} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders celebration for a 7-day milestone', () => {
    render(
      <StreakMilestoneCelebration
        milestone={{ days: 7, rewardGold: 150, titleKey: 'adventure.streak.milestone7' }}
        t={mockT}
      />
    );
    expect(screen.getByTestId('streak-milestone')).toBeInTheDocument();
    expect(screen.getAllByText(/7/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/150/)).toBeInTheDocument();
  });

  it('displays the milestone title key via t()', () => {
    render(
      <StreakMilestoneCelebration
        milestone={{ days: 3, rewardGold: 50, titleKey: 'adventure.streak.milestone3' }}
        t={mockT}
      />
    );
    expect(screen.getByText('adventure.streak.milestone3')).toBeInTheDocument();
  });
});
