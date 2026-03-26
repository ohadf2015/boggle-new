import React from 'react';
import { render, screen } from '@testing-library/react';
import MobileCompactStats from '../MobileCompactStats';
import type { PlayerArchetype } from '@/utils/playerArchetypes';
import type { GameAchievement } from '../types';

// Mock useLanguage hook
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock PlayerArchetypeBadge to avoid complex rendering
vi.mock('@/components/results/PlayerArchetypeBadge', () => {
  const MockPlayerArchetypeBadge = ({ archetype, size }: { archetype: PlayerArchetype; size: string }) => {
    return <div data-testid="archetype-badge" data-size={size}>{archetype.name}</div>;
  };
  return { default: MockPlayerArchetypeBadge };
});

// Mock AchievementBadge to avoid tooltip/portal complexity
vi.mock('@/components/AchievementBadge', () => ({
  AchievementBadge: function MockAchievementBadge({ achievement }: { achievement: GameAchievement }) {
    return <div data-testid="achievement-badge">{achievement.icon} {achievement.name || achievement.key}</div>;
  },
}));

const mockArchetype: PlayerArchetype = {
  id: 'strategist',
  name: 'Strategist',
  description: 'Thinks before acting',
  emoji: '🧠',
  color: 'text-neo-cyan',
  bgColor: 'bg-neo-cyan',
  icon: '/icons/strategist.svg',
};

const mockAchievements: GameAchievement[] = [
  { icon: '🔥', key: 'FIRE_STARTER', name: 'Fire Starter' },
  { icon: '⚡', key: 'SPEED_DEMON', name: 'Speed Demon' },
  { icon: '📚', key: 'BOOKWORM', name: 'Bookworm' },
  { icon: '🏆', key: 'CHAMPION', name: 'Champion' },
];

describe('MobileCompactStats', () => {
  it('renders word count and accuracy in a single row', () => {
    render(<MobileCompactStats wordCount={12} accuracy={85} />);

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('displays words and accuracy labels', () => {
    render(<MobileCompactStats wordCount={8} accuracy={92} />);

    expect(screen.getByText('results.words')).toBeInTheDocument();
    expect(screen.getByText('results.accuracy')).toBeInTheDocument();
  });

  it('handles zero values gracefully', () => {
    render(<MobileCompactStats wordCount={0} accuracy={0} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  describe('archetype badge', () => {
    it('renders archetype badge when archetype is provided', () => {
      render(
        <MobileCompactStats wordCount={10} accuracy={80} archetype={mockArchetype} />
      );

      const badge = screen.getByTestId('archetype-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-size', 'xs');
      expect(badge).toHaveTextContent('Strategist');
    });

    it('does not render archetype badge when archetype is null', () => {
      render(
        <MobileCompactStats wordCount={10} accuracy={80} archetype={null} />
      );

      expect(screen.queryByTestId('archetype-badge')).not.toBeInTheDocument();
    });

    it('does not render archetype badge when archetype is not provided', () => {
      render(<MobileCompactStats wordCount={10} accuracy={80} />);

      expect(screen.queryByTestId('archetype-badge')).not.toBeInTheDocument();
    });
  });

  describe('achievement badges', () => {
    it('renders achievement badges when achievements are provided', () => {
      render(
        <MobileCompactStats wordCount={10} accuracy={80} achievements={mockAchievements} />
      );

      const badges = screen.getAllByTestId('achievement-badge');
      // Should show max 3 badges
      expect(badges).toHaveLength(3);
    });

    it('shows overflow count when more than 3 achievements', () => {
      render(
        <MobileCompactStats wordCount={10} accuracy={80} achievements={mockAchievements} />
      );

      // 4 achievements, showing 3, so +1 more
      expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('does not show overflow count when 3 or fewer achievements', () => {
      const threeAchievements = mockAchievements.slice(0, 3);
      render(
        <MobileCompactStats wordCount={10} accuracy={80} achievements={threeAchievements} />
      );

      expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
    });

    it('does not render achievements section when achievements is empty', () => {
      render(
        <MobileCompactStats wordCount={10} accuracy={80} achievements={[]} />
      );

      expect(screen.queryByTestId('achievement-badge')).not.toBeInTheDocument();
    });

    it('does not render achievements section when achievements is not provided', () => {
      render(<MobileCompactStats wordCount={10} accuracy={80} />);

      expect(screen.queryByTestId('achievement-badge')).not.toBeInTheDocument();
    });
  });

  describe('combined archetype and achievements', () => {
    it('renders both archetype and achievements when both provided', () => {
      render(
        <MobileCompactStats
          wordCount={10}
          accuracy={80}
          archetype={mockArchetype}
          achievements={mockAchievements.slice(0, 2)}
        />
      );

      expect(screen.getByTestId('archetype-badge')).toBeInTheDocument();
      expect(screen.getAllByTestId('achievement-badge')).toHaveLength(2);
    });
  });
});
