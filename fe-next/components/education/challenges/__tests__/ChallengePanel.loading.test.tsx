/**
 * ChallengePanel loading state tests — RED phase
 * Asserts that PageLoader is used instead of bare <div>Loading...</div>
 */

import { render, screen } from '@testing-library/react';
import { ChallengePanel } from '../ChallengePanel';

// Mock supabase education calls to never resolve (keep component in loading state)
jest.mock('@/lib/supabase/education', () => ({
  getDailyChallenges: jest.fn(() => new Promise(() => {})),
  getWeeklyQuests: jest.fn(() => new Promise(() => {})),
  claimChallengeReward: jest.fn(),
  claimQuestReward: jest.fn(),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

// Mock PageLoader so we can detect its presence reliably
jest.mock('@/components/ui/PageLoader', () => ({
  PageLoader: ({ text }: { text?: string }) => (
    <div data-testid="page-loader">{text}</div>
  ),
}));

// Mock child card components (they import their own deps)
jest.mock('../DailyChallengeCard', () => ({
  DailyChallengeCard: () => <div data-testid="daily-card" />,
}));
jest.mock('../WeeklyChallengeCard', () => ({
  WeeklyChallengeCard: () => <div data-testid="weekly-card" />,
}));

describe('ChallengePanel — loading state', () => {
  it('renders PageLoader when loading', () => {
    render(<ChallengePanel playerId="student-1" />);

    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
  });

  it('shows contextual loading text', () => {
    render(<ChallengePanel playerId="student-1" />);

    expect(screen.getByText('Loading your challenges...')).toBeInTheDocument();
  });

  it('does not render challenge panel content while loading', () => {
    render(<ChallengePanel playerId="student-1" />);

    expect(screen.queryByTestId('challenge-panel')).not.toBeInTheDocument();
  });
});
