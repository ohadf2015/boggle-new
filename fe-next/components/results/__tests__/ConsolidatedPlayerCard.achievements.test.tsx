import React from 'react';
import { render, screen } from '@testing-library/react';
import ConsolidatedPlayerCard from '../ConsolidatedPlayerCard';
import type { Player } from '../types';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/results/PlayerArchetypeBadge', () => {
  const MockBadge = () => { return <div data-testid="archetype-badge" />; };
  return { default: MockBadge };
});

vi.mock('@/components/AchievementBadge', () => ({
  AchievementBadge: function MockAch({ achievement }: any) {
    return <div data-testid="achievement-badge">{achievement.icon}</div>;
  },
}));

vi.mock('@/components/results/PlayerInsights', () => {
  const MockInsights = () => { return <div data-testid="player-insights" />; };
  return { default: MockInsights };
});

vi.mock('@/components/results/XpBreakdownCard', () => {
  const MockXp = () => { return <div data-testid="xp-breakdown" />; };
  return { default: MockXp };
});

vi.mock('@/components/results/BonusBadgesRow', () => {
  const MockBonusBadges = () => { return <div data-testid="bonus-badges" />; };
  return { default: MockBonusBadges };
});

vi.mock('../../Avatar', () => {
  const MockAvatar = () => { return <div data-testid="avatar" />; };
  return { default: MockAvatar };
});

vi.mock('../WordPointsGroup', () => ({
  WordPointsGroup: function MockWPG() { return <div data-testid="word-points-group" />; },
  SharedWordsSection: function MockSWS() { return <div data-testid="shared-words" />; },
  InvalidWordsSection: function MockIWS() { return <div data-testid="invalid-words" />; },
}));

vi.mock('../useWordCategories', () => ({
  useWordCategories: () => ({
    validWords: [],
    duplicateWords: [],
    invalidWords: [],
    wordsByPoints: {},
    sortedPointGroups: [],
    totalComboBonus: 0,
    totalFireRoundBonus: 0,
    longestWord: null,
    accuracy: 0,
    bestWord: null,
  }),
}));

vi.mock('@/utils/gameInsights', () => ({
  calculatePlayerInsights: () => null,
}));

vi.mock('@/utils/utils', () => ({
  applyHebrewFinalLetters: (s: string) => s,
}));

// filterGameAchievements: pass through for this test
vi.mock('../utils', () => ({
  filterGameAchievements: (achievements: any[]) => achievements || [],
}));

const basePlayer: Player = {
  username: 'TestPlayer',
  score: 100,
  allWords: [
    { word: 'test', score: 1, validated: true, isDuplicate: false },
    { word: 'word', score: 1, validated: true, isDuplicate: false },
  ],
  achievements: [],
};

const playerWithAchievements: Player = {
  ...basePlayer,
  achievements: [
    { icon: '🔥', key: 'FIRE_STARTER', name: 'Fire Starter' },
    { icon: '⚡', key: 'SPEED_DEMON', name: 'Speed Demon' },
  ],
};

const defaultProps = {
  rank: 1,
  totalPlayers: 3,
  winnerScore: 100,
  xpGainedData: null,
  levelUpData: null,
  archetype: null,
};

describe('ConsolidatedPlayerCard - achievements expansion', () => {
  it('shows achievements expanded by default when player has achievements', () => {
    render(
      <ConsolidatedPlayerCard
        player={playerWithAchievements}
        {...defaultProps}
      />
    );

    // Achievement badges should be visible without clicking
    const badges = screen.getAllByTestId('achievement-badge');
    expect(badges).toHaveLength(2);
  });

  it('does not show achievements section when player has no achievements', () => {
    render(
      <ConsolidatedPlayerCard
        player={basePlayer}
        {...defaultProps}
      />
    );

    expect(screen.queryByTestId('achievement-badge')).not.toBeInTheDocument();
  });
});
