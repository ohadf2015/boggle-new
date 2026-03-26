import React from 'react';
/**
 * ChallengePanel loading state tests — RED phase
 * Asserts that PageLoader is used instead of bare <div>Loading...</div>
 */

import { render, screen } from '@testing-library/react';
import { ChallengePanel } from '../ChallengePanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock supabase education calls to never resolve (keep component in loading state)
vi.mock('@/lib/supabase/education', () => ({
  getDailyChallenges: vi.fn(() => new Promise(() => {})),
  getWeeklyQuests: vi.fn(() => new Promise(() => {})),
  claimChallengeReward: vi.fn(),
  claimQuestReward: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

// Mock PageLoader so we can detect its presence reliably
vi.mock('@/components/ui/PageLoader', () => ({
  PageLoader: ({ text }: { text?: string }) => (
    <div data-testid="page-loader">{text}</div>
  ),
}));

// Mock child card components (they import their own deps)
vi.mock('../DailyChallengeCard', () => ({
  DailyChallengeCard: () => <div data-testid="daily-card" />,
}));
vi.mock('../WeeklyChallengeCard', () => ({
  WeeklyChallengeCard: () => <div data-testid="weekly-card" />,
}));


const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('ChallengePanel — loading state', () => {
  it('renders PageLoader when loading', () => {
    render(<ChallengePanel playerId="student-1" />, { wrapper: createWrapper() });

    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
  });

  it('shows contextual loading text', () => {
    render(<ChallengePanel playerId="student-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('challenges.loading')).toBeInTheDocument();
  });

  it('does not render challenge panel content while loading', () => {
    render(<ChallengePanel playerId="student-1" />, { wrapper: createWrapper() });

    expect(screen.queryByTestId('challenge-panel')).not.toBeInTheDocument();
  });
});
