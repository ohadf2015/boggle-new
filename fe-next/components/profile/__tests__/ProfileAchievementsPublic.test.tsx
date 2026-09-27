import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('@/components/AchievementBadge', () => ({
  AchievementBadge: ({ achievement, count }: { achievement: { name: string }; count: number }) => (
    <div data-testid="badge">{achievement.name}:{count}</div>
  ),
}));
vi.mock('@/utils/achievementTiers', () => ({ isHallOfFameAchievement: () => false }));
vi.mock('@/constants/achievementIcons', () => ({ getAchievementIcon: () => '🏅', ACHIEVEMENT_ICONS: {} }));

import { ProfileAchievementsPublic } from '../ProfileAchievementsPublic';

describe('ProfileAchievementsPublic', () => {
  it('renders one badge per earned achievement', () => {
    render(<ProfileAchievementsPublic counts={{ wordsmith: 2, owl: 1 }} />);
    expect(screen.getAllByTestId('badge')).toHaveLength(2);
  });

  it('renders nothing when there are no earned achievements', () => {
    const { container } = render(<ProfileAchievementsPublic counts={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for null counts', () => {
    const { container } = render(<ProfileAchievementsPublic counts={null} />);
    expect(container.firstChild).toBeNull();
  });
});
