import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WeeklyChallengeCard } from './WeeklyChallengeCard';
import type { WeeklyQuestRow } from '@/lib/supabase/education/types';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'challenges.weekly.title': 'Weekly Quests',
        'challenges.weekly.claim': 'Claim Reward',
        'challenges.weekly.claimed': 'Claimed!',
        'challenges.weekly.thisWeek': 'This Week',
        'challenges.claim': 'Claim Reward',
        'challenges.claimed': 'Claimed!',
        'quests.weeklyWordMastery': 'Weekly Word Mastery',
        'quests.weeklyWordMasteryDesc': 'Master {target} words this week',
        'education.challenges.xpReward': '{amount} XP',
        'education.challenges.coinReward': '{amount} Coins',
      };
      let result = translations[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(`{${k}}`, String(v));
        });
      }
      return result;
    },
    language: 'en',
  }),
}));

describe('WeeklyChallengeCard', () => {
  const mockOnClaim = vi.fn();

  const baseQuest: WeeklyQuestRow = {
    id: 'quest-1',
    player_id: 'player-1',
    week_start: '2026-02-23',
    quest_type: 'words_mastered',
    title: 'quests.weeklyWordMastery',
    description: 'quests.weeklyWordMasteryDesc',
    requirements: { words_mastered: 20 },
    current_progress: { words_mastered: 8 },
    xp_reward: 300,
    bonus_rewards: { coins: 50 },
    completed: false,
    completed_at: null,
    claimed: false,
    created_at: '2026-02-23T00:00:00Z',
  };

  beforeEach(() => {
    mockOnClaim.mockClear();
  });

  it('renders with data-testid="weekly-challenge-card"', () => {
    render(<WeeklyChallengeCard quest={baseQuest} onClaim={mockOnClaim} />);
    expect(screen.getByTestId('weekly-challenge-card')).toBeInTheDocument();
  });

  it('renders the quest title', () => {
    render(<WeeklyChallengeCard quest={baseQuest} onClaim={mockOnClaim} />);
    expect(screen.getByText('Weekly Word Mastery')).toBeInTheDocument();
  });

  it('renders progress as current / requirement', () => {
    render(<WeeklyChallengeCard quest={baseQuest} onClaim={mockOnClaim} />);
    expect(screen.getByText('8 / 20')).toBeInTheDocument();
  });

  it('displays XP reward', () => {
    render(<WeeklyChallengeCard quest={baseQuest} onClaim={mockOnClaim} />);
    expect(screen.getByText('300 XP')).toBeInTheDocument();
  });

  it('displays coin bonus reward', () => {
    render(<WeeklyChallengeCard quest={baseQuest} onClaim={mockOnClaim} />);
    expect(screen.getByText('50 Coins')).toBeInTheDocument();
  });

  it('shows Claim button when completed=true and claimed=false', () => {
    const completedQuest = { ...baseQuest, completed: true };
    render(<WeeklyChallengeCard quest={completedQuest} onClaim={mockOnClaim} />);
    expect(screen.getByTestId('claim-button')).toBeInTheDocument();
  });

  it('does not show Claim button when not completed', () => {
    render(<WeeklyChallengeCard quest={baseQuest} onClaim={mockOnClaim} />);
    expect(screen.queryByTestId('claim-button')).not.toBeInTheDocument();
  });

  it('calls onClaim with quest id when claim button clicked', () => {
    const completedQuest = { ...baseQuest, completed: true };
    render(<WeeklyChallengeCard quest={completedQuest} onClaim={mockOnClaim} />);
    fireEvent.click(screen.getByTestId('claim-button'));
    expect(mockOnClaim).toHaveBeenCalledWith('quest-1');
  });

  it('hides Claim button and shows claimed state when claimed=true', () => {
    const claimedQuest = { ...baseQuest, completed: true, claimed: true };
    render(<WeeklyChallengeCard quest={claimedQuest} onClaim={mockOnClaim} />);
    expect(screen.queryByTestId('claim-button')).not.toBeInTheDocument();
    expect(screen.getByText(/Claimed!/)).toBeInTheDocument();
  });
});
