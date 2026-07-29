/**
 * Achievement Components Tests
 *
 * Tests for AchievementCard and AchievementGrid components.
 * Note: AchievementUnlockModal was replaced by AchievementToast (see components/achievements/)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AchievementGrid } from './AchievementGrid';
import { AchievementCard } from './AchievementCard';
import { ADVENTURE_ACHIEVEMENTS } from '@/utils/adventureAchievementUtils';

// Mock hooks
vi.mock('@/hooks/useAdventureAchievements', () => ({
  useAdventureAchievements: () => ({
    achievementCounts: { FIRST_WORD: 1, BOSS_SLAYER: 3 },
    isEarned: (id: string) => id === 'FIRST_WORD' || id === 'BOSS_SLAYER',
    getCount: (id: string) => {
      if (id === 'FIRST_WORD') return 1;
      if (id === 'BOSS_SLAYER') return 3;
      return 0;
    },
    getTierInfo: (id: string) => {
      if (id === 'FIRST_WORD') {
        return { count: 1, tier: 'BRONZE', progress: { currentTier: 'BRONZE', nextTier: null, progress: 100, isMaxTier: true } };
      }
      if (id === 'BOSS_SLAYER') {
        return { count: 3, tier: 'BRONZE', progress: { currentTier: 'BRONZE', nextTier: 'SILVER', progress: 20, isMaxTier: false } };
      }
      return { count: 0, tier: null, progress: { currentTier: null, nextTier: 'BRONZE', progress: 0, isMaxTier: false } };
    },
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'adventure.achievements.title': 'Achievements',
        'adventure.achievements.earned': 'Earned',
        'adventure.achievements.hidden': '???',
        'adventure.achievements.unlocked': 'Achievement Unlocked!',
        'adventure.achievements.upgraded': 'Tier Upgraded!',
        'common.continue': 'Continue',
        'adventure.achievements.categories.gameplay': 'Gameplay',
        'adventure.achievements.categories.bosses': 'Bosses',
        'adventure.achievements.categories.progression': 'Progression',
        'adventure.achievements.categories.mastery': 'Mastery',
        'adventure.achievements.firstWord.name': 'First Word',
        'adventure.achievements.firstWord.desc': 'Find your first word',
        'adventure.achievements.bossSlayer.name': 'Boss Slayer',
        'adventure.achievements.bossSlayer.desc': 'Defeat your first boss',
      };
      return translations[key] || key.split('.').pop() || key;
    },
    locale: 'en',
  }),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
      <div {...props}>{children}</div>
    ),
    h2: ({ children, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLHeadingElement>>) => (
      <h2 {...props}>{children}</h2>
    ),
    h3: ({ children, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLHeadingElement>>) => (
      <h3 {...props}>{children}</h3>
    ),
    p: ({ children, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLParagraphElement>>) => (
      <p {...props}>{children}</p>
    ),
    button: ({ children, ...props }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
}));

describe('AchievementCard', () => {
  const mockAchievement = ADVENTURE_ACHIEVEMENTS.FIRST_WORD;

  it('renders earned achievement correctly', () => {
    render(
      <AchievementCard
        achievement={mockAchievement}
        count={1}
        tier="BRONZE"
      />
    );

    expect(screen.getByText(mockAchievement.icon)).toBeInTheDocument();
    expect(screen.getByTestId('achievement-card-FIRST_WORD')).toBeInTheDocument();
  });

  it('renders locked achievement with disabled state', () => {
    render(
      <AchievementCard
        achievement={mockAchievement}
        count={0}
        tier={null}
      />
    );

    const card = screen.getByTestId('achievement-card-FIRST_WORD');
    expect(card).toBeDisabled();
  });

  it('calls onClick when earned achievement clicked', () => {
    const onClick = vi.fn();
    render(
      <AchievementCard
        achievement={mockAchievement}
        count={1}
        tier="BRONZE"
        onClick={onClick}
      />
    );

    fireEvent.click(screen.getByTestId('achievement-card-FIRST_WORD'));
    expect(onClick).toHaveBeenCalled();
  });

  it('does not call onClick when unearned achievement clicked', () => {
    const onClick = vi.fn();
    render(
      <AchievementCard
        achievement={mockAchievement}
        count={0}
        tier={null}
        onClick={onClick}
      />
    );

    fireEvent.click(screen.getByTestId('achievement-card-FIRST_WORD'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows hidden icon for hidden achievements', () => {
    const hiddenAchievement = ADVENTURE_ACHIEVEMENTS.BOSS_NO_DAMAGE;
    render(
      <AchievementCard
        achievement={hiddenAchievement}
        count={0}
        tier={null}
        isHidden={true}
      />
    );

    expect(screen.getByText('❓')).toBeInTheDocument();
  });

  it('shows count badge for repeatable achievements', () => {
    const bossAchievement = ADVENTURE_ACHIEVEMENTS.BOSS_SLAYER;
    render(
      <AchievementCard
        achievement={bossAchievement}
        count={5}
        tier="BRONZE"
      />
    );

    expect(screen.getByText('x5')).toBeInTheDocument();
  });
});

describe('AchievementGrid', () => {
  it('renders achievement grid', () => {
    render(<AchievementGrid />);

    expect(screen.getByText('Achievements')).toBeInTheDocument();
  });

  it('shows category headers', () => {
    render(<AchievementGrid />);

    expect(screen.getByText('Gameplay')).toBeInTheDocument();
    expect(screen.getByText('Bosses')).toBeInTheDocument();
    expect(screen.getByText('Progression')).toBeInTheDocument();
    expect(screen.getByText('Mastery')).toBeInTheDocument();
  });

  it('shows earned count', () => {
    render(<AchievementGrid />);

    // Should show "2 / 17 Earned" (FIRST_WORD and BOSS_SLAYER are earned)
    expect(screen.getByText(/2.*\/.*17.*Earned/i)).toBeInTheDocument();
  });

  it('calls onSelectAchievement when achievement clicked', () => {
    const onSelect = vi.fn();
    render(<AchievementGrid onSelectAchievement={onSelect} />);

    // Click on an earned achievement
    fireEvent.click(screen.getByTestId('achievement-card-FIRST_WORD'));
    expect(onSelect).toHaveBeenCalledWith('FIRST_WORD');
  });
});

// Note: AchievementUnlockModal tests removed - component replaced by AchievementToast
// See fe-next/components/achievements/AchievementToast.tsx for the new implementation
