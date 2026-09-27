import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StreakWager } from '../StreakWager';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, onClick, ...props }: React.PropsWithChildren<Record<string, unknown> & { onClick?: () => void }>) => (
      <button onClick={onClick} {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock AdaptiveMotion
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div {...props}>{children}</div>
  ),
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock useLanguage
const mockT = (key: string) => key;
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, locale: 'en' }),
}));

describe('StreakWager', () => {
  const defaultProps = {
    currentCoins: 200,
    currentStreak: 3,
    onWager: vi.fn(),
    onSkip: vi.fn(),
  };

  beforeEach(() => {
    defaultProps.onWager.mockClear();
    defaultProps.onSkip.mockClear();
  });

  it('renders wager card with title', () => {
    render(<StreakWager {...defaultProps} />);
    expect(screen.getByText('streaks.wager.title')).toBeInTheDocument();
  });

  it('shows preset wager amounts', () => {
    render(<StreakWager {...defaultProps} />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('shows potential payout (3x)', () => {
    render(<StreakWager {...defaultProps} />);
    // Default selected amount should show its 3x payout
    expect(screen.getByTestId('potential-payout')).toBeInTheDocument();
  });

  it('calls onWager with selected amount on confirm', async () => {
    const user = userEvent.setup();
    render(<StreakWager {...defaultProps} />);
    const confirmBtn = screen.getByRole('button', { name: /streaks.wager.confirm/i });
    await user.click(confirmBtn);
    expect(defaultProps.onWager).toHaveBeenCalledWith(expect.any(Number));
  });

  it('calls onSkip when skip button is clicked', async () => {
    const user = userEvent.setup();
    render(<StreakWager {...defaultProps} />);
    const skipBtn = screen.getByRole('button', { name: /streaks.wager.skip/i });
    await user.click(skipBtn);
    expect(defaultProps.onSkip).toHaveBeenCalled();
  });

  it('disables amounts exceeding current coins', () => {
    render(<StreakWager {...defaultProps} currentCoins={40} />);
    const btn50 = screen.getByRole('button', { name: '50' });
    const btn100 = screen.getByRole('button', { name: '100' });
    expect(btn50).toBeDisabled();
    expect(btn100).toBeDisabled();
  });

  it('shows risk warning', () => {
    render(<StreakWager {...defaultProps} />);
    expect(screen.getByText('streaks.wager.risk')).toBeInTheDocument();
  });
});
