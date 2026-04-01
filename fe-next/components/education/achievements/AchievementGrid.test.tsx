/**
 * AchievementGrid Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AchievementGrid } from './AchievementGrid';

// Mock motion components to avoid AnimatePresence keeping exiting elements
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveAnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AdaptiveMotion: {
    div: Object.assign(React.forwardRef(function MotionDiv({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) { return <div ref={ref} {...Object.fromEntries(Object.entries(props).filter(([k]) => !['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap'].includes(k)))}>{children}</div>; }), { displayName: 'motion.div' }),
  },
}));

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/utils/achievementTiers', () => ({
  getTierProgress: vi.fn((count: number) => {
    if (count === 0) {
      return {
        currentTier: null,
        nextTier: 'BRONZE',
        currentCount: 0,
        nextThreshold: 1,
        progress: 0,
        isMaxTier: false,
      };
    }
    if (count === 5) {
      return {
        currentTier: 'BRONZE',
        nextTier: 'SILVER',
        currentCount: 5,
        nextThreshold: 15,
        progress: 40,
        isMaxTier: false,
      };
    }
    if (count === 300) {
      return {
        currentTier: 'PLATINUM',
        nextTier: null,
        currentCount: 300,
        nextThreshold: null,
        progress: 100,
        isMaxTier: true,
      };
    }
    return {
      currentTier: null,
      nextTier: 'BRONZE',
      currentCount: count,
      nextThreshold: 1,
      progress: 0,
      isMaxTier: false,
    };
  }),
  getTierDisplay: vi.fn((tier: string | null) => {
    if (!tier) return null;
    const colors = {
      BRONZE: { bg: '#CD7F32', border: '#8B4513', text: '#000000', glow: 'rgba(205, 127, 50, 0.5)' },
      SILVER: { bg: '#C0C0C0', border: '#808080', text: '#000000', glow: 'rgba(192, 192, 192, 0.5)' },
      GOLD: { bg: '#FFD700', border: '#B8860B', text: '#000000', glow: 'rgba(255, 215, 0, 0.5)' },
      PLATINUM: { bg: '#E5E4E2', border: '#9370DB', text: '#4B0082', glow: 'rgba(147, 112, 219, 0.6)' },
    };
    return {
      name: tier,
      colors: colors[tier as keyof typeof colors],
      icon: tier === 'PLATINUM' ? '💎' : tier === 'GOLD' ? '🥇' : tier === 'SILVER' ? '🥈' : '🥉',
    };
  }),
  TIER_COLORS: {
    BRONZE: { bg: '#CD7F32', border: '#8B4513', text: '#000000', glow: 'rgba(205, 127, 50, 0.5)' },
    SILVER: { bg: '#C0C0C0', border: '#808080', text: '#000000', glow: 'rgba(192, 192, 192, 0.5)' },
    GOLD: { bg: '#FFD700', border: '#B8860B', text: '#000000', glow: 'rgba(255, 215, 0, 0.5)' },
    PLATINUM: { bg: '#E5E4E2', border: '#9370DB', text: '#4B0082', glow: 'rgba(147, 112, 219, 0.6)' },
  },
}));

const mockAchievements = {
  'duel-winner': {
    count: 5,
    category: 'progress' as const,
    icon: '⚔️',
    nameKey: 'achievements.duelWinner.name',
    descriptionKey: 'achievements.duelWinner.desc',
    isSecret: false,
  },
  'practice-master': {
    count: 0,
    category: 'skill' as const,
    icon: '📚',
    nameKey: 'achievements.practiceMaster.name',
    descriptionKey: 'achievements.practiceMaster.desc',
    isSecret: false,
  },
  'streak-legend': {
    count: 300,
    category: 'consistency' as const,
    icon: '🔥',
    nameKey: 'achievements.streakLegend.name',
    descriptionKey: 'achievements.streakLegend.desc',
    isSecret: false,
  },
  'secret-word': {
    count: 0,
    category: 'exploration' as const,
    icon: '❓',
    nameKey: 'achievements.secretWord.name',
    descriptionKey: 'achievements.secretWord.desc',
    isSecret: true,
  },
};

describe('AchievementGrid', () => {
  it('should render all achievements', () => {
    render(
      <AchievementGrid
        studentId="student-1"
        achievements={mockAchievements}
      />
    );

    expect(screen.getByText('achievements.duelWinner.name')).toBeInTheDocument();
    expect(screen.getByText('achievements.practiceMaster.name')).toBeInTheDocument();
    expect(screen.getByText('achievements.streakLegend.name')).toBeInTheDocument();
  });

  it('should render category filter tabs', () => {
    render(
      <AchievementGrid
        studentId="student-1"
        achievements={mockAchievements}
      />
    );

    expect(screen.getByText('education.achievements.all')).toBeInTheDocument();
    expect(screen.getByText('education.achievements.progress')).toBeInTheDocument();
    expect(screen.getByText('education.achievements.skill')).toBeInTheDocument();
    expect(screen.getByText('education.achievements.consistency')).toBeInTheDocument();
    expect(screen.getByText('education.achievements.exploration')).toBeInTheDocument();
  });

  it('should filter achievements by category', () => {
    render(
      <AchievementGrid
        studentId="student-1"
        achievements={mockAchievements}
      />
    );

    // Click Progress tab
    fireEvent.click(screen.getByText('education.achievements.progress'));

    // Should only show progress achievements
    expect(screen.getByText('achievements.duelWinner.name')).toBeInTheDocument();
    expect(screen.queryByText('achievements.practiceMaster.name')).not.toBeInTheDocument();
  });

  it('should show tier badge for earned achievements', () => {
    render(
      <AchievementGrid
        studentId="student-1"
        achievements={mockAchievements}
      />
    );

    // BRONZE tier (count=5)
    expect(screen.getByText('🥉')).toBeInTheDocument();
    expect(screen.getByText('BRONZE')).toBeInTheDocument();
  });

  it('should show MAX badge for platinum tier', () => {
    render(
      <AchievementGrid
        studentId="student-1"
        achievements={mockAchievements}
      />
    );

    // PLATINUM tier at max (count=300)
    expect(screen.getByText('MAX')).toBeInTheDocument();
  });

  it('should show Locked badge for unearned achievements', () => {
    render(
      <AchievementGrid
        studentId="student-1"
        achievements={mockAchievements}
      />
    );

    // count=0 achievements should show "Locked"
    const lockedBadges = screen.getAllByText('education.achievements.locked');
    expect(lockedBadges.length).toBeGreaterThan(0);
  });

  it('should show progress bar for non-max achievements', () => {
    render(
      <AchievementGrid
        studentId="student-1"
        achievements={mockAchievements}
      />
    );

    // Should show "5/15" for BRONZE → SILVER
    expect(screen.getByText(/5\/15/)).toBeInTheDocument();
  });

  it('should hide secret achievements until unlocked', () => {
    render(
      <AchievementGrid
        studentId="student-1"
        achievements={mockAchievements}
      />
    );

    // Secret achievement with count=0 should show "???"
    expect(screen.getByText('???')).toBeInTheDocument();
    expect(screen.queryByText('achievements.secretWord.name')).not.toBeInTheDocument();
  });

  it('should show secret achievements once unlocked', () => {
    const unlockedSecretAchievements = {
      ...mockAchievements,
      'secret-word': {
        ...mockAchievements['secret-word'],
        count: 1, // Unlocked
      },
    };

    render(
      <AchievementGrid
        studentId="student-1"
        achievements={unlockedSecretAchievements}
      />
    );

    // Should show name now
    expect(screen.getByText('achievements.secretWord.name')).toBeInTheDocument();
    expect(screen.queryByText('???')).not.toBeInTheDocument();
  });

  it('should apply grayscale and opacity to unearned achievements', () => {
    const { container } = render(
      <AchievementGrid
        studentId="student-1"
        achievements={mockAchievements}
      />
    );

    // Unearned achievements (count=0) should have grayscale and opacity classes
    const unearnedCards = container.querySelectorAll('.grayscale');
    expect(unearnedCards.length).toBeGreaterThan(0);
  });

  it('should accept custom className', () => {
    const { container } = render(
      <AchievementGrid
        studentId="student-1"
        achievements={mockAchievements}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should show achievement icon', () => {
    render(
      <AchievementGrid
        studentId="student-1"
        achievements={mockAchievements}
      />
    );

    expect(screen.getByText('⚔️')).toBeInTheDocument();
    expect(screen.getByText('📚')).toBeInTheDocument();
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('should default to All category on mount', () => {
    render(
      <AchievementGrid
        studentId="student-1"
        achievements={mockAchievements}
      />
    );

    // All tab should be active (different styling)
    const allTab = screen.getByText('education.achievements.all');
    expect(allTab).toHaveClass('bg-neo-lime');
  });
});
