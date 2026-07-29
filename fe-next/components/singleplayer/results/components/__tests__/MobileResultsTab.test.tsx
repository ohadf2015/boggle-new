import React from 'react';
import { render, screen } from '@testing-library/react';
import { MobileResultsTab } from '../MobileResultsTab';

// Mock hooks and contexts
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
}));

// Mock confetti
vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
}));

// Mock Mascot components
vi.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: () => null,
  MascotVariant: {},
}));

vi.mock('@/components/ui/CelebrationMascot', () => ({
  CelebrationMascotWithEntrance: () => null,
}));

// Mock child components
vi.mock('@/components/results/ResultsWinnerBanner', () => {
  const MockResultsWinnerBanner = ({ compact }: { compact?: boolean }) => {
    return <div data-testid="winner-banner" data-compact={compact ? 'true' : 'false'}>WinnerBanner</div>;
  };
  return { default: MockResultsWinnerBanner };
});

vi.mock('@/components/results/MobileCompactStats', () => {
  const MockMobileCompactStats = ({ wordCount, accuracy }: { wordCount: number; accuracy: number }) => {
    return <div data-testid="mobile-compact-stats">{wordCount} words, {accuracy}% accuracy</div>;
  };
  return { default: MockMobileCompactStats };
});

vi.mock('@/components/results/MobileCompactRewards', () => {
  const MockMobileCompactRewards = ({ winStreak, coins }: { winStreak?: number; coins?: number }) => {
    if (!winStreak && !coins) return null;
    return <div data-testid="mobile-compact-rewards">Streak: {winStreak}, Coins: {coins}</div>;
  };
  return { default: MockMobileCompactRewards };
});

vi.mock('@/components/results/MobileCompactLeaderboard', () => {
  const MockMobileCompactLeaderboard = () => {
    return <div data-testid="mobile-compact-leaderboard">Leaderboard</div>;
  };
  return { default: MockMobileCompactLeaderboard };
});

vi.mock('@/components/results/NextStepPrompt', () => {
  const MockNextStepPrompt = () => {
    return <div data-testid="next-step-prompt">NextStepPrompt</div>;
  };
  return { default: MockNextStepPrompt };
});

vi.mock('../ChallengeButton', () => {
  const MockChallengeButton = () => {
    return <div data-testid="challenge-button">ChallengeButton</div>;
  };
  return { default: MockChallengeButton };
});

describe('MobileResultsTab simplified layout', () => {
  const defaultProps = {
    results: {
      playerScore: 150,
      playerWords: ['word1', 'word2'],
      botScores: [{ name: 'Bot1', score: 100 }],
      achievements: [],
      grid: [['A', 'B'], ['C', 'D']] as unknown as import('@/shared/types/game').LetterGrid,
      gameDuration: 180,
      language: 'en' as const,
    },
    mode: 'solo-bots' as const,
    nextStepMode: 'solo-bots' as const,
    playerRank: 1,
    validWordCount: 10,
    accuracy: 85,
    isWinner: true,
    isAuthenticated: true,
    coinReward: { awarded: 25, breakdown: { base: 25 } },
    globalRank: 42,
    winStreakData: { currentStreak: 3, previousStreak: 2, wasReset: false, isNewRecord: false, bestStreak: 5, isNewMilestone: false },
    allParticipants: [
      { name: 'You', score: 150, isPlayer: true },
      { name: 'Bot1', score: 100, isPlayer: false },
    ],
    bannerConfig: {
      variant: 'ranking' as const,
      message: undefined,
      announcement: undefined,
    },
    shouldShowConfetti: true,
    onBackToLobby: vi.fn(),
    t: (key: string) => key,
  };

  it('renders compact banner above fold', () => {
    render(<MobileResultsTab {...defaultProps} />);

    const banner = screen.getByTestId('winner-banner');
    expect(banner).toHaveAttribute('data-compact', 'true');
  });

  it('shows MobileCompactStats instead of full CompactResultsStats', () => {
    render(<MobileResultsTab {...defaultProps} />);

    expect(screen.getByTestId('mobile-compact-stats')).toBeInTheDocument();
    // Should NOT show sparkline or archetype in the stats
    expect(screen.queryByTestId('sparkline')).not.toBeInTheDocument();
    expect(screen.queryByTestId('archetype-badge')).not.toBeInTheDocument();
  });

  it('shows MobileCompactRewards instead of full RewardsSummary', () => {
    render(<MobileResultsTab {...defaultProps} />);

    expect(screen.getByTestId('mobile-compact-rewards')).toBeInTheDocument();
  });

  it('uses MobileCompactLeaderboard instead of Top3Leaderboard', () => {
    render(<MobileResultsTab {...defaultProps} />);

    expect(screen.getByTestId('mobile-compact-leaderboard')).toBeInTheDocument();
    // Should NOT show podium
    expect(screen.queryByTestId('podium')).not.toBeInTheDocument();
  });

  it('shows global rank as text only', () => {
    render(<MobileResultsTab {...defaultProps} />);

    // Should show rank number
    expect(screen.getByText('#42')).toBeInTheDocument();
  });

  it('does not show BonusBadgesRow (moved to Details)', () => {
    render(<MobileResultsTab {...defaultProps} />);

    // BonusBadgesRow should not be present in Results tab anymore
    expect(screen.queryByTestId('bonus-badges-row')).not.toBeInTheDocument();
  });
});
