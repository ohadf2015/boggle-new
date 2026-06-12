import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ImprovementPanel from '@/components/results/ImprovementPanel';
import type { XpGainedData, LevelUpData } from '@/types/components';

const t = (k: string, p?: Record<string, string | number>) =>
  p ? `${k}:${Object.values(p).join(',')}` : k;

const xp: XpGainedData = {
  xpEarned: 140,
  xpBreakdown: { gameCompletion: 20, scoreXp: 100, winBonus: 20, achievementXp: 0 },
  newTotalXp: 600,
  newLevel: 6,
};

const streak = { currentStreak: 3, bestStreak: 5, isNewMilestone: false, previousStreak: 2 };

describe('ImprovementPanel', () => {
  it('renders nothing for a guest with no xp and no streak', () => {
    const { container } = render(
      <ImprovementPanel xp={null} levelUp={null} streak={null} t={t} reducedMotion={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows xp earned and the current level', () => {
    render(<ImprovementPanel xp={xp} levelUp={null} streak={null} t={t} reducedMotion={false} />);
    expect(screen.getByTestId('improvement-xp')).toHaveTextContent('140');
    expect(screen.getByTestId('improvement-level')).toHaveTextContent('6');
  });

  it('renders a level progress bar with a valid 0-100 width', () => {
    render(<ImprovementPanel xp={xp} levelUp={null} streak={null} t={t} reducedMotion={false} />);
    const bar = screen.getByTestId('improvement-progress-fill');
    const width = parseFloat((bar.getAttribute('style') || '').replace(/[^0-9.]/g, ''));
    expect(width).toBeGreaterThanOrEqual(0);
    expect(width).toBeLessThanOrEqual(100);
  });

  it('shows a level-up flourish when a level was gained', () => {
    const up: LevelUpData = { oldLevel: 5, newLevel: 6, levelsGained: 1, newTitles: ['Wordsmith'] };
    render(<ImprovementPanel xp={xp} levelUp={up} streak={null} t={t} reducedMotion={false} />);
    expect(screen.getByTestId('improvement-levelup')).toBeInTheDocument();
  });

  it('shows the streak when meaningful', () => {
    render(<ImprovementPanel xp={null} levelUp={null} streak={streak} t={t} reducedMotion={false} />);
    expect(screen.getByTestId('improvement-streak')).toHaveTextContent('3');
  });

  it('hides the streak chip for a lone streak of 1', () => {
    render(
      <ImprovementPanel
        xp={xp}
        levelUp={null}
        streak={{ ...streak, currentStreak: 1 }}
        t={t}
        reducedMotion={false}
      />,
    );
    expect(screen.queryByTestId('improvement-streak')).not.toBeInTheDocument();
  });
});
