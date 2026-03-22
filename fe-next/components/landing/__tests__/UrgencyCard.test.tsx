import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UrgencyCard } from '../UrgencyCard';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

let mockUrgency: any = null;
jest.mock('@/hooks/useUrgencyData', () => ({
  useUrgencyData: () => mockUrgency,
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

jest.mock('framer-motion', () => {
  const MockDiv = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} {...props}>{children}</div>
  ));
  MockDiv.displayName = 'MockMotionDiv';
  const MockButton = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <button ref={ref} {...props}>{children}</button>
  ));
  MockButton.displayName = 'MockMotionButton';
  const MockMDiv = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} {...props}>{children}</div>
  ));
  MockMDiv.displayName = 'MockMDiv';
  return {
    motion: { div: MockDiv, button: MockButton },
    m: { div: MockMDiv },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe('UrgencyCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUrgency = null;
  });

  it('should render nothing when urgency is null', () => {
    mockUrgency = null;
    const { container } = render(<UrgencyCard />);
    expect(container.innerHTML).toBe('');
  });

  it('should render streak-risk card with correct role and aria-live', () => {
    mockUrgency = {
      type: 'streak-risk',
      data: { streak: 7, hoursLeft: 3 },
    };
    render(<UrgencyCard />);
    const card = screen.getByRole('status');
    expect(card).toHaveAttribute('aria-live', 'polite');
  });

  it('should display streak-risk translation key', () => {
    mockUrgency = {
      type: 'streak-risk',
      data: { streak: 7, hoursLeft: 3 },
    };
    render(<UrgencyCard />);
    expect(screen.getByText('urgency.streakAtRisk')).toBeInTheDocument();
  });

  it('should display streak-risk action translation key', () => {
    mockUrgency = {
      type: 'streak-risk',
      data: { streak: 7, hoursLeft: 3 },
    };
    render(<UrgencyCard />);
    expect(screen.getByText('urgency.streakAction')).toBeInTheDocument();
  });

  it('should navigate to singleplayer on streak-risk CTA click', () => {
    mockUrgency = {
      type: 'streak-risk',
      data: { streak: 7, hoursLeft: 3 },
    };
    render(<UrgencyCard />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith('/en/singleplayer');
  });

  it('should display daily-unsolved translation key', () => {
    mockUrgency = {
      type: 'daily-unsolved',
      data: { puzzleNumber: 42, solveRate: 65 },
    };
    render(<UrgencyCard />);
    expect(screen.getByText('urgency.dailyUnsolved')).toBeInTheDocument();
  });

  it('should display daily-unsolved action translation key', () => {
    mockUrgency = {
      type: 'daily-unsolved',
      data: { puzzleNumber: 42, solveRate: 65 },
    };
    render(<UrgencyCard />);
    expect(screen.getByText('urgency.dailyAction')).toBeInTheDocument();
  });

  it('should navigate to daily on daily-unsolved CTA click', () => {
    mockUrgency = {
      type: 'daily-unsolved',
      data: { puzzleNumber: 42, solveRate: 65 },
    };
    render(<UrgencyCard />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith('/en/daily');
  });

  it('should have accessible button with test id', () => {
    mockUrgency = {
      type: 'streak-risk',
      data: { streak: 5, hoursLeft: 2 },
    };
    render(<UrgencyCard />);
    expect(screen.getByTestId('urgency-cta')).toBeInTheDocument();
  });
});
