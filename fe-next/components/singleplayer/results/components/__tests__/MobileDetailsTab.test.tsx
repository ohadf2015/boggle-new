import React from 'react';
import { render, screen } from '@testing-library/react';
import { MobileDetailsTab } from '../MobileDetailsTab';

// Mock useLanguage hook
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
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock dynamic imports
vi.mock('next/dynamic', () => ({
  default: () => function MockPerformanceChart() {
    return <div data-testid="performance-chart">PerformanceChart</div>;
  },
}));

// Mock child components
vi.mock('../PerformanceSection', () => ({
  PerformanceSection: ({ archetype }: { archetype?: { name: string } | null }) => (
    <div data-testid="performance-section">
      {archetype && <span data-testid="archetype">{archetype.name}</span>}
    </div>
  ),
}));

vi.mock('../YourWordsSection', () => ({
  YourWordsSection: ({ defaultExpanded }: { defaultExpanded?: boolean }) => (
    <div data-testid="your-words-section" data-expanded={defaultExpanded ? 'true' : 'false'}>YourWords</div>
  ),
}));

vi.mock('../AchievementsSection', () => ({
  AchievementsSection: ({ defaultExpanded }: { defaultExpanded?: boolean }) => (
    <div data-testid="achievements-section" data-expanded={defaultExpanded ? 'true' : 'false'}>Achievements</div>
  ),
}));

vi.mock('../BotWordsSection', () => ({
  BotWordsSection: () => <div data-testid="bot-words-section">BotWords</div>,
}));

vi.mock('@/components/ui/CollapsibleSection', () => {
  const MockCollapsibleSection = ({
    title,
    defaultExpanded,
    children
  }: {
    title: string;
    defaultExpanded?: boolean;
    children: React.ReactNode
  }) => {
    return (
      <div data-testid={`collapsible-${title.toLowerCase().replace(/\s/g, '-')}`} data-expanded={defaultExpanded ? 'true' : 'false'}>
        <div>{title}</div>
        {children}
      </div>
    );
  };
  return { default: MockCollapsibleSection };
});

vi.mock('@/components/results/MissedWords', () => {
  const MockMissedWords = () => {
    return <div data-testid="missed-words">MissedWords</div>;
  };
  return { default: MockMissedWords };
});

describe('MobileDetailsTab with Bonuses', () => {
  const defaultProps = {
    results: {
      playerScore: 150,
      playerWordData: [
        { word: 'test', score: 4, isValid: true },
        { word: 'word', score: 4, isValid: true },
      ],
      achievements: [{ key: 'first-win', icon: '🏆' }],
      language: 'en',
    },
    mode: 'solo-bots' as const,
    gameLanguage: 'en',
    playerInsights: {
      longestWord: 'testing',
      longestWordLength: 7,
      averageWordLength: 4.5,
      wordsPerMinute: 3.3,
      mostCommonLength: 4,
      mostCommonLengthCount: 5,
      speedPattern: 'steady' as const,
      wordLengthDistribution: { 3: 2, 4: 5, 5: 2, 7: 1 },
      earlyGameWords: 3,
      midGameWords: 4,
      lateGameWords: 3,
      totalValidWords: 8,
      accuracy: 80,
    },
    wordsByPoints: { 4: [{ word: 'test', score: 4, validated: true, isDuplicate: false }, { word: 'word', score: 4, validated: true, isDuplicate: false }] },
    sortedPointGroups: [4],
    invalidWords: [],
    botWordDetails: [],
    missedWords: [],
    t: (key: string) => key,
    totalComboBonus: 15,
    totalFireRoundBonus: 10,
    playerArchetype: { id: 'speedster', name: 'Speedster', description: 'Fast player', emoji: '⚡', color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' },
  };

  it('shows Bonuses section when bonuses exist', () => {
    render(<MobileDetailsTab {...defaultProps} />);

    expect(screen.getByText(/bonuses/i)).toBeInTheDocument();
  });

  it('shows combo bonus amount', () => {
    render(<MobileDetailsTab {...defaultProps} />);

    expect(screen.getByText('+15')).toBeInTheDocument();
  });

  it('shows fire round bonus amount', () => {
    render(<MobileDetailsTab {...defaultProps} />);

    expect(screen.getByText('+10')).toBeInTheDocument();
  });

  it('does not show Bonuses section when no bonuses', () => {
    render(<MobileDetailsTab {...defaultProps} totalComboBonus={0} totalFireRoundBonus={0} />);

    expect(screen.queryByText(/bonuses/i)).not.toBeInTheDocument();
  });

  it('shows archetype in Performance section', () => {
    render(<MobileDetailsTab {...defaultProps} />);

    expect(screen.getByText('Speedster')).toBeInTheDocument();
  });

  it('Your Words section is expanded by default', () => {
    render(<MobileDetailsTab {...defaultProps} />);

    const wordsSection = screen.getByTestId('your-words-section');
    expect(wordsSection).toHaveAttribute('data-expanded', 'true');
  });
});
