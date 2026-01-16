import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DailyChallengeRouter from '../DailyChallengeRouter';

// Mock useRouter
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock dependencies
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
  }),
}));

jest.mock('../DailyChallengeLanding', () => ({
  DailyChallengeLanding: ({
    onSelectWordHunt,
    onSelectBuzz,
    onShowBuzzHistory,
  }: {
    onSelectWordHunt: () => void;
    onSelectBuzz: () => void;
    onShowBuzzHistory: () => void;
  }) => (
    <div data-testid="daily-challenge-landing">
      <button onClick={onSelectWordHunt} data-testid="select-word-hunt">Select Word Hunt</button>
      <button onClick={onSelectBuzz} data-testid="select-buzz">Select Buzz</button>
      <button onClick={onShowBuzzHistory} data-testid="show-buzz-history">Show History</button>
    </div>
  ),
}));

jest.mock('../../buzz/BuzzHistoryList', () => ({
  __esModule: true,
  default: ({ onSelectDate, onClose }: { onSelectDate: (date: string) => void; onClose: () => void }) => (
    <div data-testid="buzz-history-list">
      <button onClick={() => onSelectDate('2024-01-15')} data-testid="select-past-buzz">Select Past Buzz</button>
      <button onClick={onClose} data-testid="close-history">Close</button>
    </div>
  ),
}));

jest.mock('../../Header', () => ({
  __esModule: true,
  default: () => <header data-testid="header">Header</header>,
}));

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => <div {...props}>{children}</div>,
  },
}));

describe('DailyChallengeRouter - All Users See Landing Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  test('all users see the landing page with dual challenge selection', () => {
    render(<DailyChallengeRouter />);

    // All users should see the landing page with challenge selection
    expect(screen.getByTestId('daily-challenge-landing')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  test('selecting Word Hunt navigates to Word Hunt page', () => {
    render(<DailyChallengeRouter />);

    // Start on landing
    expect(screen.getByTestId('daily-challenge-landing')).toBeInTheDocument();

    // Select Word Hunt
    fireEvent.click(screen.getByTestId('select-word-hunt'));

    // Should navigate to Word Hunt page
    expect(mockPush).toHaveBeenCalledWith('/en/daily/word-hunt');
  });

  test('selecting Buzz navigates to Buzz page', () => {
    render(<DailyChallengeRouter />);

    // Start on landing
    expect(screen.getByTestId('daily-challenge-landing')).toBeInTheDocument();

    // Select Buzz
    fireEvent.click(screen.getByTestId('select-buzz'));

    // Should navigate to Buzz page
    expect(mockPush).toHaveBeenCalledWith('/en/daily/buzz');
  });

  test('showing buzz history opens modal', () => {
    render(<DailyChallengeRouter />);

    // No history modal initially
    expect(screen.queryByTestId('buzz-history-list')).not.toBeInTheDocument();

    // Show history
    fireEvent.click(screen.getByTestId('show-buzz-history'));

    // History modal should appear
    expect(screen.getByTestId('buzz-history-list')).toBeInTheDocument();
  });

  test('selecting past buzz navigates to buzz page with date query', () => {
    render(<DailyChallengeRouter />);

    // Show history
    fireEvent.click(screen.getByTestId('show-buzz-history'));
    expect(screen.getByTestId('buzz-history-list')).toBeInTheDocument();

    // Select past buzz
    fireEvent.click(screen.getByTestId('select-past-buzz'));

    // Should navigate to buzz page with date query
    expect(mockPush).toHaveBeenCalledWith('/en/daily/buzz?date=2024-01-15');

    // History modal should close
    expect(screen.queryByTestId('buzz-history-list')).not.toBeInTheDocument();
  });

  test('closing buzz history modal hides it', () => {
    render(<DailyChallengeRouter />);

    // Show history
    fireEvent.click(screen.getByTestId('show-buzz-history'));
    expect(screen.getByTestId('buzz-history-list')).toBeInTheDocument();

    // Close history
    fireEvent.click(screen.getByTestId('close-history'));

    // History modal should disappear
    expect(screen.queryByTestId('buzz-history-list')).not.toBeInTheDocument();
  });
});
