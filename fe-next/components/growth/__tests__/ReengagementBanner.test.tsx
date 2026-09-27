import { render, screen, fireEvent } from '@testing-library/react';
import { ReengagementBanner } from '../ReengagementBanner';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key: string, params?: Record<string, string>) => {
      if (params) return `${key}:${JSON.stringify(params)}`;
      return key;
    },
    language: 'en',
  })),
}));

const defaultRewards = [
  { type: 'coins' as const, amount: 100, label: 'Gold' },
  { type: 'streak_freeze' as const, amount: 1, label: 'Streak Freeze' },
];

describe('ReengagementBanner', () => {
  it('renders nothing when not active', () => {
    const { container } = render(
      <ReengagementBanner
        daysAway={10}
        rewards={defaultRewards}
        isActive={false}
        onClaim={vi.fn()}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows message based on days away (>= 30 days)', () => {
    render(
      <ReengagementBanner
        daysAway={45}
        rewards={defaultRewards}
        isActive={true}
        onClaim={vi.fn()}
      />
    );

    expect(screen.getByTestId('reengagement-banner')).toBeInTheDocument();
    // 45 days >= 30 -> uses 'reengagement.longTimeNoSee' key
    expect(screen.getByText('reengagement.longTimeNoSee')).toBeInTheDocument();
  });

  it('shows different message for 14+ days', () => {
    render(
      <ReengagementBanner
        daysAway={20}
        rewards={defaultRewards}
        isActive={true}
        onClaim={vi.fn()}
      />
    );

    expect(screen.getByText('reengagement.missedYou')).toBeInTheDocument();
  });

  it('shows different message for 7+ days', () => {
    render(
      <ReengagementBanner
        daysAway={10}
        rewards={defaultRewards}
        isActive={true}
        onClaim={vi.fn()}
      />
    );

    expect(screen.getByText('reengagement.welcomeBack')).toBeInTheDocument();
  });

  it('shows goodToSeeYou for < 7 days', () => {
    render(
      <ReengagementBanner
        daysAway={3}
        rewards={defaultRewards}
        isActive={true}
        onClaim={vi.fn()}
      />
    );

    expect(screen.getByText('reengagement.goodToSeeYou')).toBeInTheDocument();
  });

  it('renders reward pills', () => {
    render(
      <ReengagementBanner
        daysAway={10}
        rewards={defaultRewards}
        isActive={true}
        onClaim={vi.fn()}
      />
    );

    const rewardsContainer = screen.getByTestId('reengagement-rewards');
    expect(rewardsContainer).toBeInTheDocument();
    expect(screen.getByText('100 Gold')).toBeInTheDocument();
    expect(screen.getByText('1 Streak Freeze')).toBeInTheDocument();
  });

  it('calls onClaim on claim button click and dismisses', () => {
    const onClaim = vi.fn();
    render(
      <ReengagementBanner
        daysAway={10}
        rewards={defaultRewards}
        isActive={true}
        onClaim={onClaim}
      />
    );

    const claimBtn = screen.getByTestId('claim-bonus-btn');
    expect(claimBtn).toBeInTheDocument();

    fireEvent.click(claimBtn);
    expect(onClaim).toHaveBeenCalledTimes(1);

    // After claiming, banner should be dismissed
    expect(screen.queryByTestId('reengagement-banner')).not.toBeInTheDocument();
  });

  it('dismisses on X click and calls onDismiss', () => {
    const onDismiss = vi.fn();
    render(
      <ReengagementBanner
        daysAway={10}
        rewards={defaultRewards}
        isActive={true}
        onClaim={vi.fn()}
        onDismiss={onDismiss}
      />
    );

    const dismissBtn = screen.getByTestId('dismiss-reengagement');
    fireEvent.click(dismissBtn);

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('reengagement-banner')).not.toBeInTheDocument();
  });
});
