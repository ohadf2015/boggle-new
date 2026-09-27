import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DailyChallengeCard } from './DailyChallengeCard';
import type { DailyChallengeRow } from '@/lib/supabase/education/types';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'challenges.easy': 'Easy',
        'challenges.medium': 'Medium',
        'challenges.hard': 'Hard',
        'challenges.daily.practiceSessions': 'Complete Practice Sessions',
        'challenges.daily.practiceSessionsDesc': 'Finish {target} practice sessions today',
        'challenges.claim': 'Claim Reward',
        'challenges.claimed': 'Claimed!',
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

describe('DailyChallengeCard', () => {
  const mockOnClaim = vi.fn();

  const baseMockChallenge: DailyChallengeRow = {
    id: 'challenge-1',
    player_id: 'player-1',
    challenge_date: '2026-02-14',
    challenge_type: 'practice_sessions',
    challenge_tier: 'easy',
    title: 'challenges.daily.practiceSessions',
    description: 'challenges.daily.practiceSessionsDesc',
    target_value: 3,
    current_value: 1,
    xp_reward: 50,
    bonus_reward: { coins: 10 },
    completed: false,
    completed_at: null,
    claimed: false,
    claimed_at: null,
    created_at: '2026-02-14T00:00:00Z',
  };

  beforeEach(() => {
    mockOnClaim.mockClear();
  });

  it('renders challenge title and description', () => {
    render(<DailyChallengeCard challenge={baseMockChallenge} onClaim={mockOnClaim} />);

    expect(screen.getByTestId('challenge-title')).toHaveTextContent('Complete Practice Sessions');
    expect(screen.getByTestId('challenge-description')).toHaveTextContent('Finish 3 practice sessions today');
  });

  it('renders progress bar with current/target values', () => {
    render(<DailyChallengeCard challenge={baseMockChallenge} onClaim={mockOnClaim} />);

    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('renders tier badge with correct color for easy', () => {
    render(<DailyChallengeCard challenge={baseMockChallenge} onClaim={mockOnClaim} />);

    const badge = screen.getByTestId('tier-badge');
    expect(badge).toHaveTextContent('Easy');
    expect(badge).toHaveClass('bg-neo-lime');
  });

  it('renders tier badge with correct color for medium', () => {
    const mediumChallenge = { ...baseMockChallenge, challenge_tier: 'medium' as const };
    render(<DailyChallengeCard challenge={mediumChallenge} onClaim={mockOnClaim} />);

    const badge = screen.getByTestId('tier-badge');
    expect(badge).toHaveClass('bg-neo-cyan');
  });

  it('renders tier badge with correct color for hard', () => {
    const hardChallenge = { ...baseMockChallenge, challenge_tier: 'hard' as const };
    render(<DailyChallengeCard challenge={hardChallenge} onClaim={mockOnClaim} />);

    const badge = screen.getByTestId('tier-badge');
    expect(badge).toHaveClass('bg-neo-pink');
  });

  it('displays XP and coin rewards', () => {
    render(<DailyChallengeCard challenge={baseMockChallenge} onClaim={mockOnClaim} />);

    expect(screen.getByText('50 XP')).toBeInTheDocument();
    expect(screen.getByText('10 Coins')).toBeInTheDocument();
  });

  it('shows Claim button when completed=true and claimed=false', () => {
    const completedChallenge = { ...baseMockChallenge, completed: true };
    render(<DailyChallengeCard challenge={completedChallenge} onClaim={mockOnClaim} />);

    const claimButton = screen.getByTestId('claim-button');
    expect(claimButton).toBeInTheDocument();
    expect(claimButton).toHaveTextContent('Claim Reward');
  });

  it('does not show Claim button when not completed', () => {
    render(<DailyChallengeCard challenge={baseMockChallenge} onClaim={mockOnClaim} />);

    expect(screen.queryByTestId('claim-button')).not.toBeInTheDocument();
  });

  it('calls onClaim when Claim button clicked', () => {
    const completedChallenge = { ...baseMockChallenge, completed: true };
    render(<DailyChallengeCard challenge={completedChallenge} onClaim={mockOnClaim} />);

    fireEvent.click(screen.getByTestId('claim-button'));

    expect(mockOnClaim).toHaveBeenCalledWith('challenge-1');
  });

  it('shows claimed badge when claimed=true', () => {
    const claimedChallenge = { ...baseMockChallenge, completed: true, claimed: true };
    render(<DailyChallengeCard challenge={claimedChallenge} onClaim={mockOnClaim} />);

    expect(screen.getByTestId('claimed-badge')).toBeInTheDocument();
    expect(screen.queryByTestId('claim-button')).not.toBeInTheDocument();
  });
});
