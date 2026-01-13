import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DailyChallengeRouter from '../DailyChallengeRouter';

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
    onSelectBuzz
  }: {
    onSelectWordHunt: () => void;
    onSelectBuzz: () => void;
  }) => (
    <div data-testid="daily-challenge-landing">
      <button onClick={onSelectWordHunt} data-testid="select-word-hunt">Select Word Hunt</button>
      <button onClick={onSelectBuzz} data-testid="select-buzz">Select Buzz</button>
    </div>
  ),
}));

jest.mock('../DailyChallenge', () => ({
  __esModule: true,
  default: () => <div data-testid="daily-challenge-game">Word Hunt Game</div>,
}));

jest.mock('../../buzz/BuzzChallenge', () => ({
  __esModule: true,
  default: ({ onBack }: { onBack: () => void }) => (
    <div data-testid="buzz-challenge">
      Buzz Challenge
      <button onClick={onBack} data-testid="buzz-back">Back</button>
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
  });

  test('all users see the landing page with dual challenge selection', () => {
    render(<DailyChallengeRouter />);

    // All users should see the landing page with challenge selection
    expect(screen.getByTestId('daily-challenge-landing')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.queryByTestId('daily-challenge-game')).not.toBeInTheDocument();
    expect(screen.queryByTestId('buzz-challenge')).not.toBeInTheDocument();
  });

  test('selecting Word Hunt navigates to Word Hunt game', async () => {
    render(<DailyChallengeRouter />);

    // Start on landing
    expect(screen.getByTestId('daily-challenge-landing')).toBeInTheDocument();

    // Select Word Hunt
    fireEvent.click(screen.getByTestId('select-word-hunt'));

    // Should navigate to Word Hunt game
    await waitFor(() => {
      expect(screen.getByTestId('daily-challenge-game')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('daily-challenge-landing')).not.toBeInTheDocument();
    expect(screen.queryByTestId('header')).not.toBeInTheDocument();
  });

  test('selecting Buzz navigates to Buzz challenge', async () => {
    render(<DailyChallengeRouter />);

    // Start on landing
    expect(screen.getByTestId('daily-challenge-landing')).toBeInTheDocument();

    // Select Buzz
    fireEvent.click(screen.getByTestId('select-buzz'));

    // Should navigate to Buzz challenge
    await waitFor(() => {
      expect(screen.getByTestId('buzz-challenge')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('daily-challenge-landing')).not.toBeInTheDocument();
  });

  test('back button from Buzz returns to landing page', async () => {
    render(<DailyChallengeRouter />);

    // Navigate to Buzz
    fireEvent.click(screen.getByTestId('select-buzz'));
    await waitFor(() => {
      expect(screen.getByTestId('buzz-challenge')).toBeInTheDocument();
    });

    // Click back
    fireEvent.click(screen.getByTestId('buzz-back'));

    // Should return to landing
    await waitFor(() => {
      expect(screen.getByTestId('daily-challenge-landing')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('buzz-challenge')).not.toBeInTheDocument();
  });
});
