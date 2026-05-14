import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockT = vi.fn((key: string) => key);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en' }),
}));

vi.mock('@/hooks/useClassroomLeaderboard', () => ({
  useClassroomLeaderboard: () => ({
    topThree: [],
    currentUserRank: { rank: 3, totalXp: 500 },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useWinStreak', () => ({
  useWinStreak: () => ({ currentStreak: 5, isLoaded: true, lastWinDate: null }),
}));

vi.mock('@/backend/modules/xpManager', () => ({
  getXpProgress: () => ({
    currentLevel: 7,
    xpInCurrentLevel: 200,
    xpNeededForNextLevel: 500,
    progressPercent: 40,
  }),
}));

vi.mock('@/components/education/milestones/MilestoneTracker', () => ({
  MilestoneTracker: () => <div data-testid="milestone-tracker" />,
}));

vi.mock('@/components/education/milestones/MilestoneCelebration', () => ({
  MilestoneCelebration: () => null,
}));

vi.mock('@/lib/supabase/education/milestones', () => ({
  checkMilestoneCrossed: () => null,
  getMilestoneRewards: () => [],
}));

vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: () => <div data-testid="mascot" />,
}));

vi.mock('framer-motion', () => {
  const R = require('react');
  const Div = R.forwardRef(function Div(props: Record<string, unknown>, ref: unknown) {
    const { children, ...rest } = props as React.PropsWithChildren<Record<string, unknown>>;
    return R.createElement('div', { ...rest, ref }, children);
  });
  return {
    m: { div: Div },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

import { StudentHubProgressZone } from '../StudentHubProgressZone';

describe('StudentHubProgressZone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders XP level', () => {
    render(<StudentHubProgressZone classroomId="cls-1" userId="u-1" />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders streak count', () => {
    render(<StudentHubProgressZone classroomId="cls-1" userId="u-1" />);
    // Streak shows "5 common.days"
    expect(screen.getByText(/5\s+common\.days/)).toBeInTheDocument();
  });

  it('renders milestone tracker', () => {
    render(<StudentHubProgressZone classroomId="cls-1" userId="u-1" />);
    expect(screen.getByTestId('milestone-tracker')).toBeInTheDocument();
  });

  it('renders rank display', () => {
    render(<StudentHubProgressZone classroomId="cls-1" userId="u-1" />);
    expect(screen.getByText('#3')).toBeInTheDocument();
  });
});
