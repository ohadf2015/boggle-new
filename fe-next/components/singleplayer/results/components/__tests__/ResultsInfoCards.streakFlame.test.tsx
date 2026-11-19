import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsInfoCards } from '../ResultsInfoCards';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/components/results/PlayerArchetypeBadge', () => ({ __esModule: true, default: () => <span /> }));
vi.mock('@/components/charts/MiniSparkline', () => ({ MiniSparkline: () => <span /> }));
vi.mock('@/components/ui/RankBadge', () => ({ RankBadge: () => <span /> }));
vi.mock('@/hooks/useSparklineTrend', () => ({ useSparklineTrend: () => ({ data: [], trend: 'flat' }) }));

const base = {
  currentScore: 10,
  archetype: null,
  participants: [],
  mode: 'practice' as const,
  coinReward: null,
  isAuthenticated: true,
  achievementCount: 0,
};

describe('ResultsInfoCards win streak flame', () => {
  it('shows the tiered flame in the streak row', () => {
    render(<ResultsInfoCards {...base} winStreakData={{ currentStreak: 3, bestStreak: 3, isNewMilestone: false, previousStreak: 2 }} />);
    expect(screen.getByTestId('streak-flame')).toHaveAttribute('data-tier', 'flame');
  });

  it('shows no flame when there is no streak', () => {
    render(<ResultsInfoCards {...base} winStreakData={null} />);
    expect(screen.queryByTestId('streak-flame')).toBeNull();
  });
});
